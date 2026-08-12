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
        this.exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
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

  async waitFor(expression, timeout = 6000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${expression}`);
  }
}

async function newPage(url, readyExpression) {
  const target = await fetch(`http://127.0.0.1:9223/json/new?${encodeURIComponent(url)}`, { method: "PUT" }).then((response) => response.json());
  const page = new CdpClient(target.webSocketDebuggerUrl);
  await page.send("Runtime.enable");
  await page.send("Page.enable");
  await page.waitFor(readyExpression);
  return page;
}

async function main() {
  const host = await newPage("http://127.0.0.1:3210", "document.readyState === 'complete' && Boolean(window.CookingData)");
  await host.evaluate("multiplayerButton.click()");
  assert.deepEqual(await host.evaluate("({ count: localPlayerCount.textContent, rows: localPlayerList.children.length, startDisabled: startLocalButton.disabled })"), {
    count: "2/5", rows: 2, startDisabled: false
  });
  await host.evaluate("startLocalButton.click()");
  assert.equal(await host.evaluate("characterGrid.children.length"), 5, "local co-op opens character selection");
  await host.evaluate("characterGrid.querySelector('[data-character-id=grilled-pork]').click(); characterConfirmButton.click(); characterGrid.querySelector('[data-character-id=angel-pork]').click(); characterConfirmButton.click(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  assert.equal(await host.evaluate("players.length"), 2);
  assert.deepEqual(await host.evaluate("players.map((player) => player.source)"), ["keyboard1", "keyboard2"]);
  assert.deepEqual(await host.evaluate("players.map((player) => player.characterId)"), ["grilled-pork", "angel-pork"]);
  const before = await host.evaluate("players.map((player) => player.x)");
  await host.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
  })()`);
  await sleep(350);
  await host.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
  })()`);
  const after = await host.evaluate("players.map((player) => player.x)");
  assert.ok(after[0] > before[0], "keyboard player one moved right");
  assert.ok(after[1] < before[1], "keyboard player two moved left simultaneously");
  assert.deepEqual(await host.evaluate(`(() => {
    const target = objects.find((item) => item.name === "meat");
    players[0].x = target.x; players[0].y = target.y; interactPlayer(players[0]);
    return players.map((player) => player.inventory?.ingredientId || null);
  })()`), ["meat", null], "players keep independent inventories");
  await host.evaluate(`(() => {
    exitGame(); setupLocalGame();
    phoneControllers = [1, 2, 3].map((id) => ({ id: "fake-" + id, name: "มือถือ " + id, connected: true }));
    renderLocalSetup(); startLocalGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
  })()`);
  assert.equal(await host.evaluate("players.length"), 5, "two keyboards and three phones fill all five local slots");
  await host.evaluate("exitGameButton.click(); multiplayerButton.click(); keyboard2Enabled.click(); connectPhonesButton.click()");
  await host.waitFor("Boolean(localSession) && joinOptions.length > 0");
  const sessionCode = await host.evaluate("localSession");

  const phone = await newPage(`http://127.0.0.1:3210/controller.html?session=${sessionCode}`, "document.readyState === 'complete' && typeof socket !== 'undefined'");
  await phone.evaluate(`controllerNameInput.value = "มือถือ"; joinButton.click()`);
  await Promise.all([
    host.waitFor("phoneControllers.filter((item) => item.connected).length === 1"),
    phone.waitFor("!controlsView.hidden")
  ]);
  assert.equal(await host.evaluate("localPlayerCount.textContent"), "2/5");
  await host.evaluate("startLocalButton.click(); characterGrid.querySelector('[data-character-id=grilled-pork]').click(); characterConfirmButton.click(); characterGrid.querySelector('[data-character-id=angel-pork]').click(); characterConfirmButton.click(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  assert.deepEqual(await host.evaluate("players.map((player) => player.source)"), ["keyboard1", "phone"]);
  await phone.waitFor("latestState.phase === 'playing' && !gameControls.hidden");
  await host.send("Page.bringToFront");
  const phoneStartX = await host.evaluate("players.find((player) => player.source === 'phone').x");
  await phone.evaluate("document.querySelector('[data-direction=right]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2 }))");
  await host.waitFor("players.find((player) => player.source === 'phone').input.right === true");
  await sleep(400);
  await phone.evaluate("document.querySelector('[data-direction=right]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }))");
  await sleep(150);
  assert.ok(await host.evaluate("players.find((player) => player.source === 'phone').x") > phoneStartX, "phone controller moved its player");

  await host.evaluate(`(() => {
    const phonePlayer = players.find((player) => player.source === "phone");
    const rice = objects.find((item) => item.name === "rice");
    phonePlayer.x = rice.x; phonePlayer.y = rice.y; phonePlayer.inventory = null; phonePlayer.plate = null; setPlayerPosition(phonePlayer);
  })()`);
  await phone.evaluate("interactButton.click()");
  await Promise.all([
    host.waitFor("players.find((player) => player.source === 'phone').riceChoice !== null"),
    phone.waitFor("!riceController.hidden")
  ]);
  await phone.evaluate("document.querySelector('[data-action=rice-sticky]').click()");
  await host.waitFor("players.find((player) => player.source === 'phone').inventory?.ingredientId === 'stickyRice'");
  await host.evaluate("exitGameButton.click()");
  await phone.waitFor("!joinView.hidden");
  assert.deepEqual(host.exceptions, []);
  assert.deepEqual(phone.exceptions, []);
  console.log("browser local co-op check passed", { sessionCode, keyboardPlayers: 2, phoneController: true });
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
