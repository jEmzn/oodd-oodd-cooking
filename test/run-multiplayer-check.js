const assert = require("node:assert/strict");

class SocketClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.events = new Map();
    this.acks = new Map();
    this.latest = new Map();
    this.nextAck = 0;
    this.connected = new Promise((resolve, reject) => {
      this.ws.addEventListener("error", reject);
      this.on("connect", resolve);
    });
    this.ws.addEventListener("message", (event) => this.receive(String(event.data)));
  }

  receive(packet) {
    if (packet === "2") return this.ws.send("3");
    if (packet.startsWith("0")) return this.ws.send("40");
    if (packet.startsWith("40")) return (this.events.get("connect") || []).forEach((handler) => handler());
    if (packet.startsWith("42")) {
      const payload = JSON.parse(packet.slice(2).replace(/^\d+/, ""));
      this.latest.set(payload[0], payload.slice(1));
      (this.events.get(payload[0]) || []).forEach((handler) => handler(...payload.slice(1)));
      return;
    }
    if (packet.startsWith("43")) {
      const match = packet.match(/^43(\d+)(.*)$/);
      if (!match) return;
      const callback = this.acks.get(Number(match[1]));
      this.acks.delete(Number(match[1]));
      callback?.(...JSON.parse(match[2]));
    }
  }

  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(handler);
  }

  emit(event, ...args) {
    const callback = typeof args.at(-1) === "function" ? args.pop() : null;
    const id = callback ? this.nextAck++ : null;
    if (callback) this.acks.set(id, callback);
    this.ws.send(`42${id === null ? "" : id}${JSON.stringify([event, ...args])}`);
  }

  waitFor(event, predicate, timeout = 5000) {
    const latest = this.latest.get(event);
    if (latest && predicate(...latest)) return Promise.resolve(latest[0]);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeout);
      this.on(event, (...args) => {
        if (!predicate(...args)) return;
        clearTimeout(timer);
        resolve(args[0]);
      });
    });
  }

  close() { this.ws.close(); }
}

const url = "ws://127.0.0.1:3210/socket.io/?EIO=4&transport=websocket";
const emitAck = (client, event, payload) => new Promise((resolve) => client.emit(event, payload, resolve));

async function newClient() {
  const client = new SocketClient(url);
  await client.connected;
  return client;
}

async function main() {
  const host = await newClient();
  const controllerA = await newClient();
  const controllerB = await newClient();
  const controllerC = await newClient();
  const overflow = await newClient();
  const created = await emitAck(host, "local-host:create", {});
  assert.equal(created.ok, true);
  assert.equal(created.sessionCode.length, 5);
  assert.ok(created.joinOptions.length >= 1);
  assert.match(created.joinOptions[0].url, new RegExp(`controller\\.html\\?session=${created.sessionCode}`));
  assert.match(created.joinOptions[0].qrDataUrl, /^data:image\/png;base64,/);

  host.emit("local-host:capacity", { maxControllers: 3 });
  const rosterReady = host.waitFor("local-host:roster", (roster) => roster.length === 3);
  const joinedA = await emitAck(controllerA, "local-controller:join", { sessionCode: created.sessionCode, name: "โทรศัพท์ A" });
  const joinedB = await emitAck(controllerB, "local-controller:join", { sessionCode: created.sessionCode, name: "โทรศัพท์ B" });
  const joinedC = await emitAck(controllerC, "local-controller:join", { sessionCode: created.sessionCode, name: "โทรศัพท์ C" });
  assert.equal(joinedA.ok && joinedB.ok && joinedC.ok, true);
  assert.equal((await rosterReady).every((item) => item.connected), true);
  assert.match((await emitAck(overflow, "local-controller:join", { sessionCode: created.sessionCode, name: "เกิน" })).error, /เต็ม/);

  host.emit("local-host:phase", { phase: "playing" });
  const inputPromise = host.waitFor("local-host:input", ({ playerId, input }) => playerId === joinedA.playerId && input.right);
  controllerA.emit("local-controller:input", { right: true });
  assert.deepEqual((await inputPromise).input, { left: false, right: true, up: false, down: false });
  const actionPromise = host.waitFor("local-host:action", ({ playerId, action }) => playerId === joinedB.playerId && action === "interact");
  controllerB.emit("local-controller:action", { action: "interact" });
  assert.equal((await actionPromise).action, "interact");
  const skillPromise = host.waitFor("local-host:action", ({ playerId, action }) => playerId === joinedB.playerId && action === "skill");
  controllerB.emit("local-controller:action", { action: "skill" });
  assert.equal((await skillPromise).action, "skill");
  const discardPromise = host.waitFor("local-host:action", ({ playerId, action }) => playerId === joinedC.playerId && action === "discard-station");
  controllerC.emit("local-controller:action", { action: "discard-station" });
  assert.equal((await discardPromise).action, "discard-station");

  const statePromise = controllerA.waitFor("local-controller:state", (state) => state.canChooseRice === true);
  host.emit("local-host:controller-state", { playerId: joinedA.playerId, state: { canChooseRice: true, message: "เลือกข้าว" } });
  assert.equal((await statePromise).message, "เลือกข้าว");
  assert.match((await emitAck(overflow, "local-controller:join", { sessionCode: created.sessionCode, name: "สาย" })).error, /เกมเริ่มแล้ว|เต็ม/);

  const disconnectedRoster = host.waitFor("local-host:roster", (roster) => roster.some((item) => item.id === joinedA.playerId && !item.connected));
  controllerA.close();
  await disconnectedRoster;
  const replacementA = await newClient();
  const reconnectedRoster = host.waitFor("local-host:roster", (roster) => roster.some((item) => item.id === joinedA.playerId && item.connected));
  const rejoined = await emitAck(replacementA, "local-controller:join", {
    sessionCode: created.sessionCode,
    name: "โทรศัพท์ A",
    reconnectToken: joinedA.reconnectToken
  });
  assert.equal(rejoined.playerId, joinedA.playerId);
  await reconnectedRoster;

  const closedPromise = controllerB.waitFor("local-controller:closed", ({ message }) => Boolean(message));
  host.emit("local-host:close");
  await closedPromise;
  [host, replacementA, controllerB, controllerC, overflow].forEach((client) => client.close());
  console.log("local controller relay check passed", { sessionCode: created.sessionCode, controllers: 3, reconnect: true });
}

main().catch((error) => { console.error(error); process.exit(1); });
