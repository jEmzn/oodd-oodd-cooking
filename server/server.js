const path = require("node:path");
const http = require("node:http");
const os = require("node:os");
const crypto = require("node:crypto");
const express = require("express");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const sessions = new Map();
const allowedActions = new Set(["interact", "rice-steamed", "rice-sticky", "rice-cancel"]);
const reconnectGraceMs = 30000;
const maxPlayers = 5;

app.use(express.static(path.join(__dirname, "..")));
app.get("/health", (request, response) => response.json({ status: "ok", mode: "local-controller-relay" }));

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 18);
}

function createCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  while (sessions.has(code));
  return code;
}

function privateAddresses() {
  const addresses = [];
  Object.values(os.networkInterfaces()).flat().forEach((address) => {
    if (!address || address.internal || address.family !== "IPv4") return;
    if (!addresses.includes(address.address)) addresses.push(address.address);
  });
  return addresses;
}

async function createJoinOptions(code, port) {
  const addresses = privateAddresses();
  if (!addresses.length) addresses.push("127.0.0.1");
  return Promise.all(addresses.map(async (address) => {
    const url = `http://${address}:${port}/controller.html?session=${code}`;
    return { url, qrDataUrl: await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: "#493a2c", light: "#fffdf9" } }) };
  }));
}

function sessionForHost(socket) {
  const session = sessions.get(socket.data.sessionCode);
  return session?.hostSocketId === socket.id ? session : null;
}

function sessionForController(socket) {
  const session = sessions.get(socket.data.sessionCode);
  const controller = session?.controllers.get(socket.data.playerId);
  return controller?.socketId === socket.id ? { session, controller } : null;
}

function publicRoster(session) {
  return [...session.controllers.values()].map(({ id, name, connected }) => ({ id, name, connected }));
}

function emitRoster(session) {
  io.to(session.hostSocketId).emit("local-host:roster", publicRoster(session));
}

function sendZeroInput(session, controller) {
  io.to(session.hostSocketId).emit("local-host:input", {
    playerId: controller.id,
    input: { left: false, right: false, up: false, down: false }
  });
}

function removeController(session, controller) {
  clearTimeout(controller.disconnectTimer);
  session.controllers.delete(controller.id);
  emitRoster(session);
}

function markControllerDisconnected(session, controller) {
  if (!controller.connected) return;
  controller.connected = false;
  controller.socketId = null;
  sendZeroInput(session, controller);
  emitRoster(session);
  clearTimeout(controller.disconnectTimer);
  controller.disconnectTimer = setTimeout(() => {
    const currentSession = sessions.get(session.code);
    const currentController = currentSession?.controllers.get(controller.id);
    if (currentController && !currentController.connected) removeController(currentSession, currentController);
  }, reconnectGraceMs);
}

function closeSession(session, reason = "เจ้าบ้านปิดห้องแล้ว") {
  session.controllers.forEach((controller) => {
    clearTimeout(controller.disconnectTimer);
    if (controller.socketId) io.to(controller.socketId).emit("local-controller:closed", { message: reason });
  });
  sessions.delete(session.code);
  const hostSocket = io.sockets.sockets.get(session.hostSocketId);
  if (hostSocket) hostSocket.data.sessionCode = null;
}

io.on("connection", (socket) => {
  socket.on("local-host:create", async (payload, reply) => {
    const oldSession = sessionForHost(socket);
    if (oldSession) closeSession(oldSession, "เจ้าบ้านสร้างห้องใหม่แล้ว");
    const code = createCode();
    const session = { code, hostSocketId: socket.id, phase: "lobby", maxControllers: maxPlayers, controllers: new Map() };
    sessions.set(code, session);
    socket.data.role = "host";
    socket.data.sessionCode = code;
    const port = httpServer.address()?.port || Number(process.env.PORT) || 3000;
    try {
      reply?.({ ok: true, sessionCode: code, joinOptions: await createJoinOptions(code, port) });
    } catch (error) {
      closeSession(session, "สร้าง QR ไม่สำเร็จ");
      reply?.({ error: "สร้าง QR สำหรับโทรศัพท์ไม่สำเร็จ" });
    }
  });

  socket.on("local-host:capacity", ({ maxControllers } = {}) => {
    const session = sessionForHost(socket);
    if (!session) return;
    session.maxControllers = Math.max(0, Math.min(maxPlayers, Number(maxControllers) || 0));
  });

  socket.on("local-host:phase", ({ phase } = {}) => {
    const session = sessionForHost(socket);
    if (!session || !["lobby", "playing", "results"].includes(phase)) return;
    session.phase = phase;
    session.controllers.forEach((controller) => {
      if (controller.socketId) io.to(controller.socketId).emit("local-controller:state", { phase });
    });
  });

  socket.on("local-host:controller-state", ({ playerId, state } = {}) => {
    const session = sessionForHost(socket);
    const controller = session?.controllers.get(playerId);
    if (!controller?.socketId || !state || typeof state !== "object") return;
    io.to(controller.socketId).emit("local-controller:state", state);
  });

  socket.on("local-host:close", () => {
    const session = sessionForHost(socket);
    if (session) closeSession(session);
  });

  socket.on("local-controller:join", ({ sessionCode, name, reconnectToken } = {}, reply) => {
    const code = String(sessionCode || "").trim().toUpperCase();
    const session = sessions.get(code);
    const cleanName = normalizeName(name);
    if (!session) return reply?.({ error: "ไม่พบห้องนี้ กรุณาสแกน QR ใหม่" });
    if (!cleanName) return reply?.({ error: "กรุณาใส่ชื่อผู้เล่น" });

    const reconnecting = [...session.controllers.values()].find((item) => item.reconnectToken === reconnectToken && !item.connected);
    if (reconnecting) {
      clearTimeout(reconnecting.disconnectTimer);
      reconnecting.disconnectTimer = null;
      reconnecting.socketId = socket.id;
      reconnecting.connected = true;
      reconnecting.name = cleanName;
      socket.data.role = "controller";
      socket.data.sessionCode = code;
      socket.data.playerId = reconnecting.id;
      emitRoster(session);
      return reply?.({ ok: true, playerId: reconnecting.id, reconnectToken: reconnecting.reconnectToken, phase: session.phase });
    }

    if (session.phase !== "lobby") return reply?.({ error: "เกมเริ่มแล้ว รับเฉพาะผู้เล่นที่กำลังเชื่อมต่อกลับ" });
    const activeControllers = [...session.controllers.values()].filter((item) => item.connected).length;
    if (activeControllers >= session.maxControllers || session.controllers.size >= maxPlayers) return reply?.({ error: "ช่องผู้เล่นเต็มแล้ว" });
    const id = `phone-${crypto.randomUUID()}`;
    const controller = { id, name: cleanName, socketId: socket.id, connected: true, reconnectToken: crypto.randomBytes(18).toString("base64url"), disconnectTimer: null };
    session.controllers.set(id, controller);
    socket.data.role = "controller";
    socket.data.sessionCode = code;
    socket.data.playerId = id;
    emitRoster(session);
    reply?.({ ok: true, playerId: id, reconnectToken: controller.reconnectToken, phase: session.phase });
  });

  socket.on("local-controller:input", (input = {}) => {
    const context = sessionForController(socket);
    if (!context || context.session.phase !== "playing") return;
    io.to(context.session.hostSocketId).emit("local-host:input", {
      playerId: context.controller.id,
      input: { left: Boolean(input.left), right: Boolean(input.right), up: Boolean(input.up), down: Boolean(input.down) }
    });
  });

  socket.on("local-controller:action", ({ action } = {}) => {
    const context = sessionForController(socket);
    if (!context || context.session.phase !== "playing" || !allowedActions.has(action)) return;
    io.to(context.session.hostSocketId).emit("local-host:action", { playerId: context.controller.id, action });
  });

  socket.on("disconnect", () => {
    if (socket.data.role === "host") {
      const session = sessionForHost(socket);
      if (session) closeSession(session, "การเชื่อมต่อกับหน้าจอเกมสิ้นสุดลง");
      return;
    }
    const context = sessionForController(socket);
    if (context) markControllerDisconnected(context.session, context.controller);
  });
});

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Oodd Oodd Cooking local server: http://127.0.0.1:${port}`);
  privateAddresses().forEach((address) => console.log(`LAN: http://${address}:${port}`));
});
