const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { Server } = require("socket.io");
const cookingData = require("../recipes.js");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const rooms = new Map();
const menus = cookingData.menus;
const ingredientStations = new Set(["meat", "vegetable", "egg", "sauce"]);
const stations = {
  rice: { x: 100, y: 300 }, meat: { x: 380, y: 300 }, vegetable: { x: 100, y: 470 }, egg: { x: 240, y: 470 },
  sauce: { x: 850, y: 330 }, plate: { x: 850, y: 160 },
  "pan-1": { x: 300, y: 160, tool: "pan" }, "pan-2": { x: 410, y: 160, tool: "pan" },
  "pot-1": { x: 520, y: 160, tool: "pot" }, "pot-2": { x: 630, y: 160, tool: "pot" },
  trash: { x: 90, y: 100 }, grill: { x: 740, y: 160, tool: "grill" }, serve: { x: 500, y: 470 }
};
const cookingStationIds = Object.keys(stations).filter((stationId) => stations[stationId].tool);
const startingPosition = { x: 500, y: 350 };
const playerSpeed = 150;
const interactionDistance = 104;
const orderLifetime = 35000;
const orderInterval = 7;
const maxOrders = 2;
const roundDurationSeconds = 120;
const stationItemLabels = { meat: "เนื้อ", vegetable: "ผัก", egg: "ไข่", sauce: "ซอส" };
const toolLabels = { pot: "หม้อ", pan: "กระทะ", grill: "เตาย่าง" };
const cookingStationLabels = { "pan-1": "กระทะ 1", "pan-2": "กระทะ 2", "pot-1": "หม้อ 1", "pot-2": "หม้อ 2", grill: "เตาย่าง" };

app.use(express.static(path.join(__dirname, "..")));
app.get("/health", (request, response) => response.json({ status: "ok" }));

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 18);
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  while (rooms.has(code));
  return code;
}

function createOrder() {
  const menu = menus[Math.floor(Math.random() * menus.length)];
  const createdAt = Date.now();
  return { id: `order-${createdAt}-${Math.random().toString(36).slice(2, 8)}`, menuId: menu.id, name: menu.name, createdAt, expiresAt: createdAt + orderLifetime };
}

function newPlayer(id, name) {
  return { id, name, x: startingPosition.x, y: startingPosition.y, ready: false, inventory: null, plate: null, input: { left: false, right: false, up: false, down: false }, stats: { ordersServed: 0 } };
}

function newGame() {
  return { secondsLeft: roundDurationSeconds, orders: [createOrder()], orderGenerationElapsed: 0, score: 0, stations: Object.fromEntries(cookingStationIds.map((stationId) => [stationId, null])) };
}

function createRoom(socket, name) {
  const code = createRoomCode();
  const room = { code, hostId: socket.id, status: "lobby", players: new Map([[socket.id, newPlayer(socket.id, name)]]), game: newGame(), timer: null, movementTimer: null, lastMovementAt: null };
  rooms.set(code, room);
  socket.join(code);
  socket.data.roomCode = code;
  socket.data.playerName = name;
  return room;
}

function roomFor(socket) { return rooms.get(socket.data.roomCode); }

function publicState(room, selfId) {
  return {
    roomCode: room.code, hostId: room.hostId, selfId, status: room.status,
    players: [...room.players.values()].map((player) => ({ id: player.id, name: player.name, x: player.x, y: player.y, ready: player.ready, inventory: player.inventory, plate: player.plate, stats: player.stats })),
    secondsLeft: room.game.secondsLeft, orders: room.game.orders, score: room.game.score, stations: room.game.stations
  };
}

function broadcastRoom(room, message) {
  io.to(room.code).emit("room-state", publicState(room));
  if (message) io.to(room.code).emit("game-message", message);
}

function sendRoomState(socket, room) { socket.emit("room-state", publicState(room, socket.id)); }

function resetPlayers(room) {
  room.players.forEach((player) => {
    player.x = startingPosition.x; player.y = startingPosition.y; player.inventory = null; player.plate = null; player.ready = false; player.stats = { ordersServed: 0 }; player.input = { left: false, right: false, up: false, down: false };
  });
}

function allPlayersReady(room) { return room.players.size >= 2 && [...room.players.values()].every((player) => player.ready); }

function clearRoomTimers(room) {
  if (room.timer) clearInterval(room.timer);
  if (room.movementTimer) clearInterval(room.movementTimer);
  room.timer = null; room.movementTimer = null; room.lastMovementAt = null;
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
      room.game.orders.push(createOrder()); room.game.orderGenerationElapsed = 0; io.to(room.code).emit("game-message", "มีออเดอร์ลูกค้าใหม่แล้ว");
    }
    if (room.game.secondsLeft <= 0) endRound(room);
    broadcastRoom(room);
  }, 1000);
  room.movementTimer = setInterval(() => updateMovement(room), 50);
  broadcastRoom(room, "ครัวเปิดให้บริการแล้ว!");
}

function endRound(room) {
  if (room.status !== "playing") return;
  clearRoomTimers(room); room.status = "results";
  room.players.forEach((player) => { player.input = { left: false, right: false, up: false, down: false }; });
  broadcastRoom(room, "จบรอบการทำอาหารแล้ว");
}

function expireOrders(room) {
  const remaining = room.game.orders.filter((order) => order.expiresAt > Date.now());
  if (remaining.length !== room.game.orders.length) { room.game.orders = remaining; io.to(room.code).emit("game-message", "ลูกค้ากลับไปแล้ว ออเดอร์ที่เหลือยังรออยู่"); }
}

function updateMovement(room) {
  const now = Date.now();
  const delta = room.lastMovementAt ? Math.min((now - room.lastMovementAt) / 1000, 0.1) : 0;
  room.lastMovementAt = now;
  room.players.forEach((player) => {
    const dx = (player.input.right ? 1 : 0) - (player.input.left ? 1 : 0);
    const dy = (player.input.down ? 1 : 0) - (player.input.up ? 1 : 0);
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

function requirePlate(player, socket) {
  if (!player.plate) { socket.emit("game-message", "หยิบจานก่อนรับอาหารที่ปรุงเสร็จ"); return false; }
  if (player.plate.invalid) { socket.emit("game-message", "ลำดับไม่ถูกต้อง นำจานไปทิ้งก่อน"); return false; }
  if (player.plate.dishId) { socket.emit("game-message", "จานนี้สำเร็จแล้ว นำไปเสิร์ฟ"); return false; }
  return true;
}

function interact(socket, requestedStation) {
  const room = roomFor(socket); const player = room && room.players.get(socket.id);
  if (!room || !player || room.status !== "playing") return;
  const nearest = nearestStation(player);
  if (nearest.name !== requestedStation || nearest.distance >= interactionDistance) return socket.emit("game-message", "เดินเข้าใกล้สถานีก่อน");

  if (requestedStation === "trash") {
    if (!player.inventory && !player.plate) socket.emit("game-message", "ไม่มีอะไรให้ทิ้ง");
    else { if (player.inventory) player.inventory = null; else player.plate = null; socket.emit("game-message", "ทิ้งของที่ถืออยู่แล้ว"); }
  } else if (requestedStation === "plate") {
    if (player.plate) socket.emit("game-message", "คุณมีจานสำหรับประกอบอาหารอยู่แล้ว");
    else { player.plate = cookingData.createPlate(); socket.emit("game-message", "หยิบจานแล้ว นำไปรับข้าวหรืออาหารที่ปรุงเสร็จ"); }
  } else if (requestedStation === "rice") {
    if (player.inventory) socket.emit("game-message", "มือของคุณไม่ว่าง");
    else if (player.plate?.dishId || player.plate?.invalid) socket.emit("game-message", "จานนี้ใช้ต่อไม่ได้ นำไปทิ้งก่อน");
    else socket.emit("choose-rice");
  } else if (ingredientStations.has(requestedStation)) {
    if (player.inventory) socket.emit("game-message", "มือของคุณไม่ว่าง");
    else {
      player.inventory = cookingData.createIngredient(requestedStation);
      socket.emit("game-message", `หยิบ${stationItemLabels[requestedStation]}แล้ว นำไปใส่สถานีทำอาหาร`);
    }
  } else if (stations[requestedStation]?.tool) {
    interactWithCookStation(socket, room, player, requestedStation, stations[requestedStation].tool);
  } else {
    serveOrder(socket, room, player);
  }
  broadcastRoom(room);
}

function selectRice(socket, requestedRice) {
  const room = roomFor(socket); const player = room && room.players.get(socket.id);
  if (!room || !player || room.status !== "playing") return;
  if (requestedRice !== "steamed" && requestedRice !== "sticky") return;
  const distance = Math.hypot(player.x - stations.rice.x, player.y - stations.rice.y);
  if (distance >= interactionDistance) return socket.emit("game-message", "เดินเข้าใกล้สถานีข้าวก่อน");
  if (player.inventory) return socket.emit("game-message", "มือของคุณไม่ว่าง");
  if (player.plate?.dishId || player.plate?.invalid) return socket.emit("game-message", "จานนี้ใช้ต่อไม่ได้ นำไปทิ้งก่อน");
  const ingredientId = requestedRice === "steamed" ? "steamedRice" : "stickyRice";
  if (player.plate) player.plate = cookingData.appendIngredient(player.plate, ingredientId);
  else player.inventory = cookingData.createIngredient(ingredientId);
  socket.emit("game-message", `${requestedRice === "steamed" ? "ข้าวสวย" : "ข้าวเหนียว"}${player.plate ? "ใส่ลงจานแล้ว" : "หยิบแล้ว"}`);
  broadcastRoom(room);
}

function interactWithCookStation(socket, room, player, stationId, tool) {
  const stationLabel = cookingStationLabels[stationId] || toolLabels[tool];
  const station = room.game.stations[stationId];
  if (station?.phase === "ready") {
    if (player.inventory) return socket.emit("game-message", "มือของคุณไม่ว่าง");
    if (!requirePlate(player, socket)) return;
    const nextPlate = cookingData.appendIngredient(player.plate, station.output);
    if (!nextPlate) return socket.emit("game-message", "จานนี้รับส่วนผสมเพิ่มไม่ได้");
    player.plate = nextPlate;
    room.game.stations[stationId] = null;
    io.to(room.code).emit("game-message", `${player.name} ใส่อาหารจาก${stationLabel}ลงจานแล้ว`);
    return;
  }
  if (station?.phase === "cooking") return socket.emit("game-message", `${stationLabel}กำลังถูกใช้งานอยู่`);
  if (player.inventory?.kind === "ingredient") {
    const inputs = [...(station?.inputs || []), player.inventory.ingredientId];
    if (!cookingData.canStageIngredients(tool, inputs)) return socket.emit("game-message", `วัตถุดิบนี้ใช้ร่วมกับของใน${stationLabel}ไม่ได้`);
    room.game.stations[stationId] = { phase: "staging", inputs };
    player.inventory = null;
    const ready = Boolean(cookingData.findExactTransformation(tool, inputs));
    socket.emit("game-message", ready ? `วัตถุดิบใน${stationLabel}พร้อมแล้ว กด E มือเปล่าเพื่อเริ่มปรุง หรือใส่วัตถุดิบเพิ่ม` : `ใส่วัตถุดิบใน${stationLabel}แล้ว ต้องเพิ่มวัตถุดิบให้ครบสูตร`);
    return;
  }
  if (player.inventory) return socket.emit("game-message", "ต้องถือวัตถุดิบเพื่อใส่สถานี หรือถือจานเพื่อรับอาหาร");
  if (!station || station.phase !== "staging") return socket.emit("game-message", `ใส่วัตถุดิบใน${stationLabel}ก่อน`);
  const transformation = cookingData.findExactTransformation(tool, station.inputs);
  if (!transformation) return socket.emit("game-message", "วัตถุดิบยังไม่ครบสูตร");
  station.phase = "cooking";
  station.playerId = player.id;
  station.transformation = transformation;
  station.startedAt = Date.now();
  socket.emit("game-message", `กำลังปรุงด้วย${stationLabel}... 2 วินาที`);
  setTimeout(() => {
    const currentRoom = rooms.get(room.code); const currentPlayer = currentRoom?.players.get(player.id); const currentStation = currentRoom?.game.stations[stationId];
    if (!currentRoom || currentRoom.status !== "playing" || !currentPlayer || !currentStation || currentStation.playerId !== player.id || currentStation.phase !== "cooking") return;
    currentStation.output = transformation.output;
    currentStation.phase = "ready";
    io.to(room.code).emit("game-message", `${currentPlayer.name} ปรุงเสร็จแล้ว`);
    broadcastRoom(currentRoom);
  }, 2000);
}

function serveOrder(socket, room, player) {
  const menu = player.plate?.dishId ? menus.find((item) => item.id === player.plate.dishId) : null;
  const matchingOrder = room.game.orders.find((order) => order.menuId === menu?.id);
  if (matchingOrder) {
    player.plate = null; player.stats.ordersServed += 1; room.game.score += 1; room.game.orders = room.game.orders.filter((order) => order.id !== matchingOrder.id);
    socket.emit("game-message", "เสิร์ฟออเดอร์แล้ว มีลูกค้ารอออเดอร์ใหม่");
  } else if (Object.values(room.game.stations).some((station) => station?.phase === "cooking")) socket.emit("game-message", "อาหารยังทำไม่เสร็จ");
  else if (player.plate?.dishId) socket.emit("game-message", "ไม่มีลูกค้ารอเมนูนี้");
  else socket.emit("game-message", "ทำอาหารก่อนนำไปเสิร์ฟ");
}

function leaveRoom(socket) {
  const room = roomFor(socket);
  if (!room) return;
  Object.keys(room.game.stations).forEach((stationId) => { if (room.game.stations[stationId]?.playerId === socket.id) room.game.stations[stationId] = null; });
  room.players.delete(socket.id); socket.leave(room.code); socket.data.roomCode = null;
  if (room.hostId === socket.id) room.hostId = room.players.keys().next().value || null;
  if (!room.players.size) { clearRoomTimers(room); rooms.delete(room.code); }
  else broadcastRoom(room, `${socket.data.playerName || "ผู้เล่นคนหนึ่ง"} ออกจากห้องแล้ว`);
}

io.on("connection", (socket) => {
  socket.on("create-room", ({ name } = {}, reply) => {
    const cleanName = normalizeName(name); if (!cleanName) return reply?.({ error: "กรุณาใส่ชื่อผู้เล่นก่อน" });
    const room = createRoom(socket, cleanName); sendRoomState(socket, room); reply?.({ ok: true });
  });
  socket.on("join-room", ({ name, roomCode } = {}, reply) => {
    const cleanName = normalizeName(name); const code = String(roomCode || "").trim().toUpperCase(); const room = rooms.get(code);
    if (!cleanName) return reply?.({ error: "กรุณาใส่ชื่อผู้เล่นก่อน" });
    if (!room) return reply?.({ error: "ไม่พบห้องนี้" });
    if (room.status !== "lobby") return reply?.({ error: "รอบนี้เริ่มไปแล้ว" });
    if (room.players.size >= 5) return reply?.({ error: "ห้องเต็มแล้ว" });
    room.players.set(socket.id, newPlayer(socket.id, cleanName)); socket.join(room.code); socket.data.roomCode = room.code; socket.data.playerName = cleanName;
    broadcastRoom(room, `${cleanName} เข้าร่วมห้องแล้ว`); sendRoomState(socket, room); reply?.({ ok: true });
  });
  socket.on("toggle-ready", () => { const room = roomFor(socket); const player = room?.players.get(socket.id); if (!room || room.status !== "lobby" || !player) return; player.ready = !player.ready; broadcastRoom(room); });
  socket.on("start-round", () => { const room = roomFor(socket); if (!room || room.hostId !== socket.id || room.status !== "lobby") return socket.emit("game-message", "เฉพาะเจ้าของห้องเท่านั้นที่เริ่มรอบได้"); if (!allPlayersReady(room)) return socket.emit("game-message", "ผู้เล่นทุกคนต้องกดพร้อมก่อนเริ่มรอบ"); startRound(room); });
  socket.on("play-again", () => { const room = roomFor(socket); if (!room || room.status !== "results" || room.hostId !== socket.id) return socket.emit("game-message", "เฉพาะเจ้าของห้องเท่านั้นที่เริ่มรอบใหม่ได้"); resetPlayers(room); room.game = newGame(); room.status = "lobby"; broadcastRoom(room, "พร้อมสำหรับรอบใหม่แล้ว!"); });
  socket.on("move-input", (input = {}) => { const room = roomFor(socket); const player = room?.players.get(socket.id); if (!room || room.status !== "playing" || !player) return; player.input = { left: Boolean(input.left), right: Boolean(input.right), up: Boolean(input.up), down: Boolean(input.down) }; });
  socket.on("interact", ({ station } = {}) => interact(socket, station));
  socket.on("select-rice", ({ rice } = {}) => selectRice(socket, rice));
  socket.on("leave-room", () => leaveRoom(socket));
  socket.on("disconnect", () => leaveRoom(socket));
});

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, "0.0.0.0", () => console.log(`Oodd Oodd Cooking server listening on port ${port}`));
