const assert = require("node:assert/strict");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = [];
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const callback = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) callback?.reject(new Error(message.error.message));
        else callback?.resolve(message.result);
      } else if (message.method === "Runtime.exceptionThrown") {
        this.exceptions.push(message.params.exceptionDetails.text);
      }
    });
  }

  async send(method, params = {}) {
    await this.opened;
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return response;
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  async waitFor(expression, timeout = 5000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${expression}`);
  }
}

async function newPage() {
  const target = await fetch("http://127.0.0.1:9223/json/new?http://127.0.0.1:3210", { method: "PUT" }).then((response) => response.json());
  const page = new CdpClient(target.webSocketDebuggerUrl);
  await page.send("Runtime.enable");
  await page.send("Page.enable");
  await page.waitFor("document.readyState === 'complete' && Boolean(window.CookingData)");
  return page;
}

async function main() {
  const host = await newPage();
  const guest = await newPage();
  await host.evaluate(`multiplayerButton.click(); playerNameInput.value = "Browser Host"; createRoomButton.click()`);
  await host.waitFor("!lobbyScreen.hidden && roomCodeLabel.textContent.length === 5");
  const roomCode = await host.evaluate("roomCodeLabel.textContent");
  await guest.evaluate(`multiplayerButton.click(); playerNameInput.value = "Browser Guest"; roomCodeInput.value = ${JSON.stringify(roomCode)}; joinRoomButton.click()`);
  await Promise.all([
    host.waitFor("roomState?.players.length === 2"),
    guest.waitFor("roomState?.players.length === 2")
  ]);
  assert.equal(await host.evaluate("playerList.children.length"), 2);
  assert.equal(await guest.evaluate("playerList.children.length"), 2);
  await host.evaluate("readyButton.click()");
  await guest.evaluate("readyButton.click()");
  await host.waitFor("roomState.players.every((player) => player.ready)");
  assert.equal(await host.evaluate("startRoundButton.hidden"), false);
  assert.equal(await guest.evaluate("startRoundButton.hidden"), true);
  await host.evaluate("startRoundButton.click()");
  await Promise.all([
    host.waitFor("!gameScreen.hidden && gameRunning"),
    guest.waitFor("!gameScreen.hidden && gameRunning")
  ]);
  assert.deepEqual(await host.evaluate("({ secondsLeft, timer: timerElement.textContent })"), { secondsLeft: 120, timer: "120" }, "multiplayer rounds start at two minutes");
  await sleep(300);
  assert.equal(await host.evaluate("otherPlayers.children.length"), 1);
  assert.equal(await guest.evaluate("otherPlayers.children.length"), 1);
  const before = await guest.evaluate("otherPlayers.firstElementChild.getAttribute('transform')");
  await host.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))");
  await sleep(500);
  await host.evaluate("window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }))");
  await sleep(500);
  const after = await guest.evaluate("otherPlayers.firstElementChild.getAttribute('transform')");
  assert.notEqual(after, before, "remote player position changed in the other browser tab");
  await host.evaluate("exitGameButton.click()");
  await guest.waitFor("roomState.players.length === 1 && roomState.hostId === selfId");
  assert.equal(await guest.evaluate("otherPlayers.children.length"), 0);
  await guest.evaluate("exitGameButton.click()");
  assert.deepEqual(host.exceptions, []);
  assert.deepEqual(guest.exceptions, []);
  console.log("browser multiplayer check passed", { roomCode, remoteMovementSynced: true, hostTransferred: true });
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
