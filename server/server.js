const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const rooms = new Map();
const menus = [
  { name: "Garden Soup", tool: "pot" },
  { name: "Sizzling Stir-Fry", tool: "pan" }
];
const stations = {
  ingredients: { x: 180, y: 430 },
  pot: { x: 425, y: 205 },
  pan: { x: 750, y: 205 },
  serve: { x: 500, y: 455 }
};
const startingPosition = { x: 500, y: 350 };
const playerSpeed = 150;
const interactionDistance = 104;
const orderLifetime = 15000;
const orderInterval = 7;
const maxOrders = 5;

app.use(express.static(path.join(__dirname, "..")));

app.get("/health", (request, response) => {
  response.json({ status: "ok" });
});

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 18);
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function createOrder() {
  const menu = menus[Math.floor(Math.random() * menus.length)];
  const createdAt = Date.now();
  return { id: `order-${createdAt}-${Math.random().toString(36).slice(2, 8)}`, name: menu.name, tool: menu.tool, createdAt, expiresAt: createdAt + orderLifetime };
}

function newPlayer(id, name) {
  return {
    id,
    name,
    x: startingPosition.x,
    y: startingPosition.y,
    ready: false,
    inventory: "empty",
    input: { left: false, right: false, up: false, down: false },
    stats: { ordersServed: 0 }
  };
}

function newGame() {
  return {
    secondsLeft: 40,
    orders: [createOrder()],
    orderGenerationElapsed: 0,
    score: 0,
    stations: { pot: null, pan: null }
  };
}

function createRoom(socket, name) {
  const code = createRoomCode();
  const player = newPlayer(socket.id, name);
  const room = {
    code,
    hostId: socket.id,
    status: "lobby",
    players: new Map([[socket.id, player]]),
    game: newGame(),
    timer: null,
    movementTimer: null,
    lastMovementAt: null
  };
  rooms.set(code, room);
  socket.join(code);
  socket.data.roomCode = code;
  return room;
}

function roomFor(socket) {
  return rooms.get(socket.data.roomCode);
}

function publicState(room, selfId) {
  return {
    roomCode: room.code,
    hostId: room.hostId,
    selfId,
    status: room.status,
    players: [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      x: player.x,
      y: player.y,
      ready: player.ready,
      inventory: player.inventory,
      stats: player.stats
    })),
    secondsLeft: room.game.secondsLeft,
    orders: room.game.orders,
    score: room.game.score,
    stations: room.game.stations
  };
}

function broadcastRoom(room, message) {
  io.to(room.code).emit("room-state", publicState(room));
  if (message) io.to(room.code).emit("game-message", message);
}

function sendRoomState(socket, room) {
  socket.emit("room-state", publicState(room, socket.id));
}

function resetPlayers(room) {
  room.players.forEach((player) => {
    player.x = startingPosition.x;
    player.y = startingPosition.y;
    player.inventory = "empty";
    player.ready = false;
    player.stats = { ordersServed: 0 };
    player.input = { left: false, right: false, up: false, down: false };
  });
}

function allPlayersReady(room) {
  return room.players.size >= 2 && [...room.players.values()].every((player) => player.ready);
}

function clearRoomTimers(room) {
  if (room.timer) clearInterval(room.timer);
  if (room.movementTimer) clearInterval(room.movementTimer);
  room.timer = null;
  room.movementTimer = null;
  room.lastMovementAt = null;
}

function startRound(room) {
  resetPlayers(room);
  room.status = "playing";
  room.game = newGame();
  room.lastMovementAt = Date.now();
  room.timer = setInterval(() => {
    room.game.secondsLeft -= 1;
    expireOrders(room);
    if (room.game.orders.length < maxOrders) room.game.orderGenerationElapsed += 1;
    if (room.game.orders.length < maxOrders && room.game.orderGenerationElapsed >= orderInterval) {
      room.game.orders.push(createOrder());
      room.game.orderGenerationElapsed = 0;
      io.to(room.code).emit("game-message", "A new customer order is ready.");
    }
    if (room.game.secondsLeft <= 0) {
      endRound(room);
    }
    broadcastRoom(room);
  }, 1000);
  room.movementTimer = setInterval(() => updateMovement(room), 50);
  broadcastRoom(room, "The kitchen is open!");
}

function endRound(room) {
  if (room.status !== "playing") return;
  clearRoomTimers(room);
  room.status = "results";
  room.players.forEach((player) => {
    player.input = { left: false, right: false, up: false, down: false };
  });
  broadcastRoom(room, "The shift is over.");
}

function expireOrders(room) {
  const now = Date.now();
  const remaining = room.game.orders.filter((order) => order.expiresAt > now);
  if (remaining.length !== room.game.orders.length) {
    room.game.orders = remaining;
    io.to(room.code).emit("game-message", "A customer left. The remaining orders are still waiting.");
  }
}

function updateMovement(room) {
  const now = Date.now();
  const delta = room.lastMovementAt ? Math.min((now - room.lastMovementAt) / 1000, 0.1) : 0;
  room.lastMovementAt = now;
  room.players.forEach((player) => {
    let dx = 0;
    let dy = 0;
    if (player.input.left) dx -= 1;
    if (player.input.right) dx += 1;
    if (player.input.up) dy -= 1;
    if (player.input.down) dy += 1;
    if (!dx && !dy) return;
    const length = Math.hypot(dx, dy);
    player.x = Math.max(65, Math.min(935, player.x + (dx / length) * playerSpeed * delta));
    player.y = Math.max(105, Math.min(555, player.y + (dy / length) * playerSpeed * delta));
  });
  io.to(room.code).emit("room-state", publicState(room));
}

function nearestStation(player) {
  return Object.entries(stations).reduce((nearest, [name, station]) => {
    const distance = Math.hypot(player.x - station.x, player.y - station.y);
    return distance < nearest.distance ? { name, distance } : nearest;
  }, { name: null, distance: Infinity });
}

function interact(socket, requestedStation) {
  const room = roomFor(socket);
  const player = room && room.players.get(socket.id);
  if (!room || !player || room.status !== "playing") return;
  const nearest = nearestStation(player);
  if (nearest.name !== requestedStation || nearest.distance >= interactionDistance) {
    socket.emit("game-message", "Move closer to that kitchen station first.");
    return;
  }

  if (requestedStation === "ingredients") {
    if (player.inventory === "empty") {
      player.inventory = "ingredients";
      socket.emit("game-message", "Ingredients collected. Follow the customer order.");
    } else {
      socket.emit("game-message", "Your hands are already full.");
    }
  } else if (requestedStation === "pot" || requestedStation === "pan") {
    interactWithCookStation(socket, room, player, requestedStation);
  } else {
    serveOrder(socket, room, player);
  }
  broadcastRoom(room);
}

function interactWithCookStation(socket, room, player, tool) {
  const station = room.game.stations[tool];
  if (player.inventory === "ready" && station && station.playerId === player.id && station.complete) {
    player.inventory = `cooked-${station.menuName}`;
    room.game.stations[tool] = null;
    socket.emit("game-message", `You picked up the ${station.menuName}. Take it to the serve point.`);
    return;
  }
  if (player.inventory !== "ingredients") {
    socket.emit("game-message", "Collect the ingredients first.");
    return;
  }
  if (station) {
    socket.emit("game-message", "That station is currently in use.");
    return;
  }
  player.inventory = "cooking";
  const menu = menus.find((item) => item.tool === tool);
  room.game.stations[tool] = { playerId: player.id, menuName: menu.name, startedAt: Date.now(), complete: false };
  socket.emit("game-message", `Cooking with the ${tool}... 2 seconds.`);
  setTimeout(() => {
    const currentRoom = rooms.get(room.code);
    const currentPlayer = currentRoom && currentRoom.players.get(player.id);
    const currentStation = currentRoom && currentRoom.game.stations[tool];
    if (!currentRoom || currentRoom.status !== "playing" || !currentPlayer || !currentStation || currentStation.playerId !== player.id) return;
    currentStation.complete = true;
    currentPlayer.inventory = "ready";
    io.to(room.code).emit("game-message", `${currentPlayer.name}'s ${currentStation.menuName} is ready.`);
    broadcastRoom(currentRoom);
  }, 2000);
}

function serveOrder(socket, room, player) {
  const menuName = player.inventory.startsWith("cooked-") ? player.inventory.slice(7) : null;
  const matchingOrder = room.game.orders.find((order) => order.name === menuName);
  if (matchingOrder) {
    player.inventory = "empty";
    player.stats.ordersServed += 1;
    room.game.score += 1;
    room.game.orders = room.game.orders.filter((order) => order.id !== matchingOrder.id);
    socket.emit("game-message", "Order served! A new customer is waiting.");
  } else if (player.inventory === "cooking") {
    socket.emit("game-message", "The food is still cooking.");
  } else if (menuName) {
    socket.emit("game-message", "No matching customer is waiting for that menu.");
  } else {
    socket.emit("game-message", "Cook a menu before serving it.");
  }
}

function leaveRoom(socket) {
  const room = roomFor(socket);
  if (!room) return;
  Object.keys(room.game.stations).forEach((tool) => {
    if (room.game.stations[tool]?.playerId === socket.id) room.game.stations[tool] = null;
  });
  room.players.delete(socket.id);
  socket.leave(room.code);
  socket.data.roomCode = null;
  if (room.hostId === socket.id) room.hostId = room.players.keys().next().value || null;
  if (!room.players.size) {
    clearRoomTimers(room);
    rooms.delete(room.code);
  } else {
    broadcastRoom(room, `${socket.data.playerName || "A player"} left the room.`);
  }
}

io.on("connection", (socket) => {
  socket.on("create-room", ({ name } = {}, reply) => {
    const cleanName = normalizeName(name);
    if (!cleanName) return reply?.({ error: "Enter a display name first." });
    const room = createRoom(socket, cleanName);
    socket.data.playerName = cleanName;
    sendRoomState(socket, room);
    reply?.({ ok: true, roomCode: room.code });
  });

  socket.on("join-room", ({ name, roomCode } = {}, reply) => {
    const cleanName = normalizeName(name);
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!cleanName) return reply?.({ error: "Enter a display name first." });
    if (!room) return reply?.({ error: "Room not found." });
    if (room.status !== "lobby") return reply?.({ error: "This round has already started." });
    if (room.players.size >= 5) return reply?.({ error: "This room is full." });
    if ([...room.players.values()].some((player) => player.name.toLowerCase() === cleanName.toLowerCase())) return reply?.({ error: "That name is already in use." });
    const player = newPlayer(socket.id, cleanName);
    room.players.set(socket.id, player);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerName = cleanName;
    sendRoomState(socket, room);
    broadcastRoom(room, `${cleanName} joined the room.`);
    reply?.({ ok: true, roomCode: code });
  });

  socket.on("toggle-ready", () => {
    const room = roomFor(socket);
    const player = room && room.players.get(socket.id);
    if (!room || room.status !== "lobby" || !player) return;
    player.ready = !player.ready;
    broadcastRoom(room);
  });

  socket.on("start-round", () => {
    const room = roomFor(socket);
    if (!room || room.status !== "lobby" || room.hostId !== socket.id) return socket.emit("game-message", "Only the host can start the round.");
    if (!allPlayersReady(room)) return socket.emit("game-message", "Every player must be Ready before the round starts.");
    startRound(room);
  });

  socket.on("play-again", () => {
    const room = roomFor(socket);
    if (!room || room.status !== "results" || room.hostId !== socket.id) return socket.emit("game-message", "Only the host can start another round.");
    resetPlayers(room);
    room.game = newGame();
    room.status = "lobby";
    broadcastRoom(room, "Ready for another shift!");
  });

  socket.on("move-input", (input = {}) => {
    const room = roomFor(socket);
    const player = room && room.players.get(socket.id);
    if (!room || room.status !== "playing" || !player) return;
    player.input = {
      left: Boolean(input.left),
      right: Boolean(input.right),
      up: Boolean(input.up),
      down: Boolean(input.down)
    };
  });

  socket.on("interact", ({ station } = {}) => interact(socket, station));
  socket.on("leave-room", () => leaveRoom(socket));
  socket.on("disconnect", () => leaveRoom(socket));
});

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";
httpServer.listen(port, host, () => {
  console.log(`Oodd Oodd Cooking server listening on port ${port}`);
});
