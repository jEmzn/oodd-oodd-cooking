const assert = require("node:assert/strict");
const cookingData = require("../recipes.js");

class SocketClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.events = new Map();
    this.acks = new Map();
    this.latest = new Map();
    this.nextAck = 0;
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener("error", reject);
      this.ws.addEventListener("open", () => resolve());
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

  async connect() { await this.opened; await this.waitFor("connect", () => true, 3000); }

  emit(event, ...args) {
    const callback = typeof args.at(-1) === "function" ? args.pop() : null;
    const id = callback ? this.nextAck++ : null;
    if (callback) this.acks.set(id, callback);
    this.ws.send(`42${id === null ? "" : id}${JSON.stringify([event, ...args])}`);
  }

  waitFor(event, predicate, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}: ${JSON.stringify(this.latest.get(event)?.[0] || null)}`)), timeout);
      const handler = (...args) => {
        if (!predicate(...args)) return;
        clearTimeout(timer);
        resolve(args[0]);
      };
      this.on(event, handler);
    });
  }

  close() { this.ws.close(); }
}

const url = "ws://127.0.0.1:3210/socket.io/?EIO=4&transport=websocket";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const primaryStationForTool = { pan: "pan-1", pot: "pot-1", grill: "grill" };
const stationPositions = {
  rice: { x: 100, y: 300 }, meat: { x: 380, y: 300 }, vegetable: { x: 100, y: 470 }, egg: { x: 240, y: 470 },
  sauce: { x: 850, y: 330 }, plate: { x: 850, y: 160 }, "pan-1": { x: 300, y: 160 }, "pan-2": { x: 410, y: 160 },
  "pot-1": { x: 520, y: 160 }, "pot-2": { x: 630, y: 160 }, grill: { x: 740, y: 160 }, serve: { x: 500, y: 470 }
};

async function moveTo(client, playerId, target, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = client.latest.get("room-state")?.[0];
    const player = state?.players.find((item) => item.id === playerId);
    if (!player) throw new Error("Player missing while moving");
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    if (Math.hypot(dx, dy) < 28) {
      client.emit("move-input", {});
      await sleep(100);
      return;
    }
    client.emit("move-input", {
      left: dx < -8, right: dx > 8, up: dy < -8, down: dy > 8
    });
    await sleep(100);
  }
  client.emit("move-input", {});
  throw new Error(`Could not reach ${JSON.stringify(target)}`);
}

function emitAck(client, event, payload) {
  return new Promise((resolve) => client.emit(event, payload, resolve));
}

async function main() {
  const a = new SocketClient(url);
  const b = new SocketClient(url);
  const c = new SocketClient(url);
  const d = new SocketClient(url);
  const e = new SocketClient(url);
  const overflow = new SocketClient(url);
  const clients = [a, b, c, d, e, overflow];
  await Promise.all(clients.map((client) => client.connect()));
  const statesA = [];
  const statesB = [];
  a.on("room-state", (state) => statesA.push(state));
  b.on("room-state", (state) => statesB.push(state));
  const createdStatePromise = a.waitFor("room-state", (state) => state.status === "lobby" && state.selfId);
  assert.equal((await emitAck(a, "create-room", { name: "Alice" })).ok, true);
  const created = await createdStatePromise;
  const aliceId = created.selfId;
  const bobStatePromise = b.waitFor("room-state", (state) => state.players.length >= 2 && state.selfId);
  assert.equal((await emitAck(b, "join-room", { name: "Bob", roomCode: created.roomCode })).ok, true);
  const joined = await bobStatePromise;
  const bobId = joined.selfId;
  const extraPlayerIds = new Map();
  for (const [client, name, count] of [[c, "Cee", 3], [d, "Dee", 4], [e, "Eve", 5]]) {
    const statePromise = client.waitFor("room-state", (state) => state.players.length >= count && state.selfId);
    assert.equal((await emitAck(client, "join-room", { name, roomCode: created.roomCode })).ok, true);
    extraPlayerIds.set(client, (await statePromise).selfId);
  }
  const fullResult = await emitAck(overflow, "join-room", { name: "Full", roomCode: created.roomCode });
  assert.match(fullResult.error, /ห้องเต็ม/);
  const nonHostMessage = b.waitFor("game-message", (text) => text.includes("เจ้าของห้อง"));
  b.emit("start-round");
  await nonHostMessage;
  const notReadyMessage = a.waitFor("game-message", (text) => text.includes("กดพร้อม"));
  a.emit("start-round");
  await notReadyMessage;
  const allReady = a.waitFor("room-state", (state) => state.players.length === 5 && state.players.every((player) => player.ready));
  [a, b, c, d, e].forEach((client) => client.emit("toggle-ready"));
  await allReady;
  const playingState = a.waitFor("room-state", (state) => state.status === "playing");
  a.emit("start-round");
  const playing = await playingState;
  assert.equal(playing.players.length, 5);
  assert.equal(playing.secondsLeft, 120, "multiplayer rounds start at two minutes");
  assert.deepEqual(Object.keys(playing.stations), ["pan-1", "pan-2", "pot-1", "pot-2", "grill"]);

  const state = () => statesA.at(-1);
  const orderedMenu = cookingData.menus.find((menu) => menu.id === playing.orders[0].menuId);
  assert.ok(orderedMenu);
  assert.ok(playing.orders.every((order) => order.expiresAt - order.createdAt === 35000), "orders last 35 seconds");

  await moveTo(b, bobId, stationPositions.plate);
  const platePicked = b.waitFor("room-state", (next) => next.players.find((player) => player.id === bobId)?.plate?.kind === "plate");
  b.emit("interact", { station: "plate" });
  await platePicked;
  for (const step of orderedMenu.steps) {
    if (!step.tool) {
      const ingredient = step.ingredients[0];
      await moveTo(b, bobId, stationPositions.rice);
      const chooseRice = b.waitFor("choose-rice", () => true, 1500);
      b.emit("interact", { station: "rice" });
      await chooseRice;
      const riceAdded = b.waitFor("room-state", (next) => next.players.find((player) => player.id === bobId)?.plate?.components.includes(ingredient));
      b.emit("select-rice", { rice: ingredient === "steamedRice" ? "steamed" : "sticky" });
      await riceAdded;
      continue;
    }

    const cookingStationId = primaryStationForTool[step.tool];
    const bobPreposition = moveTo(b, bobId, stationPositions[cookingStationId]);
    for (const ingredient of [...step.ingredients].reverse()) {
      const station = ingredient === "steamedRice" || ingredient === "stickyRice" ? "rice" : ingredient;
      await moveTo(a, aliceId, stationPositions[station]);
      const chooseRice = station === "rice" ? a.waitFor("choose-rice", () => true, 1500) : null;
      const rawPicked = a.waitFor("room-state", (next) => next.players.find((player) => player.id === aliceId)?.inventory?.ingredientId === ingredient);
      a.emit("interact", { station });
      if (station === "rice") {
        await chooseRice;
        a.emit("select-rice", { rice: ingredient === "steamedRice" ? "steamed" : "sticky" });
      }
      await rawPicked;
      await moveTo(a, aliceId, stationPositions[cookingStationId]);
      const staged = a.waitFor("room-state", (next) => {
        const player = next.players.find((item) => item.id === aliceId);
        const cookingStation = next.stations[cookingStationId];
        return !player?.inventory && cookingStation?.phase === "staging" && cookingStation.inputs.at(-1) === ingredient;
      });
      a.emit("interact", { station: cookingStationId });
      await staged;
    }

    await bobPreposition;
    const cookingStarted = a.waitFor("room-state", (next) => next.stations[cookingStationId]?.phase === "cooking");
    a.emit("interact", { station: cookingStationId });
    const cooking = await cookingStarted;
    assert.equal(cooking.stations[cookingStationId].transformation.tool, step.tool);
    const busyMessage = b.waitFor("game-message", (text) => text.includes("กำลังถูกใช้งาน"));
    b.emit("interact", { station: cookingStationId });
    await busyMessage;
    await a.waitFor("room-state", (next) => next.stations[cookingStationId]?.phase === "ready", 4000);
    const collected = b.waitFor("room-state", (next) => {
      const player = next.players.find((item) => item.id === bobId);
      return !next.stations[cookingStationId] && player?.plate?.components.includes(cookingData.findExactTransformation(step.tool, step.ingredients).output);
    });
    b.emit("interact", { station: cookingStationId });
    await collected;
  }

  const handedOff = b.latest.get("room-state")[0];
  assert.equal(handedOff.players.find((player) => player.id === bobId).plate.dishId, orderedMenu.id);
  assert.equal(handedOff.players.find((player) => player.id === aliceId).inventory, null);
  await moveTo(b, bobId, stationPositions.serve);
  const matchingOrderPresent = b.latest.get("room-state")[0].orders.some((order) => order.menuId === orderedMenu.id);
  b.emit("interact", { station: "serve" });
  await sleep(250);
  if (matchingOrderPresent) {
    assert.equal(state().score, 1);
    assert.equal(state().players.find((player) => player.id === bobId).plate, null);
    assert.ok(statesB.some((next) => next.score === 1), "second client received shared score");
  } else {
    assert.equal(state().score, 0);
    assert.equal(state().players.find((player) => player.id === bobId).plate.dishId, orderedMenu.id);
  }
  assert.ok(statesA.every((next) => next.orders.length <= 2), "order queue never exceeds two");
  const resultState = state().status === "results" ? state() : await a.waitFor("room-state", (next) => next.status === "results", 125000);
  assert.equal(resultState.secondsLeft, 0);
  const replayDenied = b.waitFor("game-message", (text) => text.includes("เจ้าของห้อง"));
  b.emit("play-again");
  await replayDenied;
  const replayLobbyState = a.waitFor("room-state", (next) => next.status === "lobby");
  a.emit("play-again");
  const replayLobby = await replayLobbyState;
  assert.ok(replayLobby.players.every((player) => !player.ready));

  const allReadyAgain = a.waitFor("room-state", (next) => next.players.length === 5 && next.players.every((player) => player.ready));
  [a, b, c, d, e].forEach((client) => client.emit("toggle-ready"));
  await allReadyAgain;
  const secondRound = a.waitFor("room-state", (next) => next.status === "playing");
  a.emit("start-round");
  await secondRound;
  const cId = extraPlayerIds.get(c);
  const dId = extraPlayerIds.get(d);
  await Promise.all([moveTo(c, cId, stationPositions.meat), moveTo(d, dId, stationPositions.meat)]);
  const bothHoldingMeat = a.waitFor("room-state", (next) => [cId, dId].every((id) => next.players.find((player) => player.id === id)?.inventory?.ingredientId === "meat"));
  c.emit("interact", { station: "meat" });
  d.emit("interact", { station: "meat" });
  await bothHoldingMeat;
  await Promise.all([moveTo(c, cId, stationPositions["pan-1"]), moveTo(d, dId, stationPositions["pan-2"])]);
  const bothStaged = a.waitFor("room-state", (next) => next.stations["pan-1"]?.phase === "staging" && next.stations["pan-2"]?.phase === "staging");
  c.emit("interact", { station: "pan-1" });
  d.emit("interact", { station: "pan-2" });
  await bothStaged;
  const bothCooking = a.waitFor("room-state", (next) => next.stations["pan-1"]?.phase === "cooking" && next.stations["pan-2"]?.phase === "cooking");
  c.emit("interact", { station: "pan-1" });
  d.emit("interact", { station: "pan-2" });
  await bothCooking;
  await a.waitFor("room-state", (next) => next.stations["pan-1"]?.phase === "ready" && next.stations["pan-2"]?.phase === "ready", 4000);
  const hostTransferState = b.waitFor("room-state", (next) => next.hostId === bobId && next.players.length === 4);
  a.close();
  const transferred = await hostTransferState;
  assert.equal(transferred.hostId, bobId);
  [b, c, d, e, overflow].forEach((client) => client.close());
  console.log("multiplayer socket check passed", { menu: orderedMenu.id, matchingOrderPresent, capacity: 5, hostTransferred: true, statesA: statesA.length, statesB: statesB.length });
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
