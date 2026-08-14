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
        if (message.error) callback?.reject(new Error(`${message.error.message} (${callback.method}${callback.expression ? `: ${callback.expression}` : ""})`));
        else callback?.resolve(message.result);
      } else if (message.method === "Runtime.exceptionThrown") {
        this.exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      }
    });
  }

  async send(method, params = {}) {
    await this.opened;
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => this.pending.set(id, {
      resolve,
      reject,
      method,
      expression: params.expression?.slice(0, 180)
    }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return response;
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
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
  assert.deepEqual(await host.evaluate("({ configured: roundDurationSeconds, secondsLeft, timer: timerElement.textContent })"), { configured: 420, secondsLeft: 420, timer: "420" }, "local co-op shares the 420-second round duration in the timer and HUD");
  assert.equal(await host.evaluate("players.length"), 2);
  assert.deepEqual(await host.evaluate("players.map((player) => player.source)"), ["keyboard1", "keyboard2"]);
  assert.deepEqual(await host.evaluate("players.map((player) => player.characterId)"), ["grilled-pork", "angel-pork"]);
  assert.deepEqual(await host.evaluate("({ first: keyboardControls.keyboard1.discard, second: keyboardControls.keyboard2.discard })"), { first: "r", second: "-" });
  assert.deepEqual(await host.evaluate(`(() => {
    const pan1 = objects.find((item) => item.name === "pan-1");
    const pan2 = objects.find((item) => item.name === "pan-2");
    players[0].x = pan1.x; players[0].y = pan1.y; setPlayerPosition(players[0]);
    players[1].x = pan2.x; players[1].y = pan2.y; setPlayerPosition(players[1]);
    cookingStations["pan-1"] = { phase: "staging", inputs: ["meat"] };
    cookingStations["pan-2"] = { phase: "staging", inputs: ["vegetable"] };
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "-" }));
    return { first: cookingStations["pan-1"], second: cookingStations["pan-2"] };
  })()`), { first: null, second: null }, "both keyboard discard keys clear their nearest staged station");
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
  assert.deepEqual(await host.evaluate(`(() => {
    clearCustomers();
    orders = [];
    setScore(0);
    const serve = objects.find((item) => item.name === "serve");
    const menu = menus.find((item) => item.id === "chicken-rice");
    const customer = createCustomer({ startY: serve.y });
    customer.state = "waiting";
    customer.x = serve.x;
    customer.y = serve.y;
    customer.orderVisible = true;
    customer.order.menuId = menu.id;
    customer.order.name = menu.name;
    customer.order.createdAt = Date.now();
    customer.order.expiresAt = Date.now() + 60000;
    setCustomerPosition(customer);
    orders = [customer.order];
    renderOrders();
    players[0].inventory = null;
    players[0].plate = { dishId: menu.id };
    players[0].x = serve.x;
    players[0].y = serve.y;
    setPlayerPosition(players[0]);
    interactPlayer(players[0]);
    const afterFirstServe = { score, stats: players.map((player) => player.stats.ordersServed), plate: players[0].plate };
    const secondCustomer = createCustomer({ startY: serve.y });
    secondCustomer.state = "waiting";
    secondCustomer.x = serve.x;
    secondCustomer.y = serve.y;
    secondCustomer.orderVisible = true;
    secondCustomer.order.menuId = menu.id;
    secondCustomer.order.name = menu.name;
    secondCustomer.order.createdAt = Date.now();
    secondCustomer.order.expiresAt = Date.now() + 60000;
    setCustomerPosition(secondCustomer);
    orders = [secondCustomer.order];
    renderOrders();
    players[1].inventory = null;
    players[1].plate = { dishId: menu.id };
    players[1].x = serve.x;
    players[1].y = serve.y;
    setPlayerPosition(players[1]);
    interactPlayer(players[1]);
    return {
      afterFirstServe,
      afterSecondServe: { score, hud: scoreElement.textContent, stats: players.map((player) => player.stats.ordersServed) }
    };
  })()`), {
    afterFirstServe: { score: 100, stats: [1, 0], plate: null },
    afterSecondServe: { score: 200, hud: "200", stats: [1, 1] }
  }, "local co-op shares team points while keeping per-player served-dish stats");
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
  await host.evaluate("startLocalButton.click(); characterGrid.querySelector('[data-character-id=grilled-pork]').click(); characterConfirmButton.click()")
  await phone.evaluate("socket.disconnect(); true");
  await host.waitFor("phoneControllers.length === 1 && phoneControllers[0].connected === false && phoneControllers[0].reconnectDeadline > Date.now()");
  await host.evaluate("managePlayersButtons.find((button) => !button.hidden).click()");
  assert.deepEqual(await host.evaluate("({ parent: playerManager.parentElement.id, status: playerManagerList.textContent.includes('รอเชื่อมต่อกลับ'), countdown: /\\d+ วินาที/.test(playerManagerList.textContent) })"), {
    parent: "character-screen", status: true, countdown: true
  }, "character selection manager shows reconnect status and countdown inside the active screen");
  await host.evaluate("playerManagerClose.click(); characterGrid.querySelector('[data-character-id=angel-pork]').click(); characterConfirmButton.click()");
  assert.deepEqual(await host.evaluate("({ pendingLocalStart, characterVisible: !characterScreen.hidden, phase: characterProgress.textContent })"), {
    pendingLocalStart: true,
    characterVisible: true,
    phase: "เลือกครบแล้ว — กำลังรอผู้เล่นเชื่อมต่อกลับ"
  }, "completed selection waits for disconnected locked members");
  await phone.evaluate("socket.connect(); true");
  await Promise.all([
    host.waitFor("gameRunning && players.length === 2"),
    phone.waitFor("latestState.phase === 'playing' && !gameControls.hidden")
  ]);
  await host.evaluate("clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  assert.deepEqual(await host.evaluate("players.map((player) => player.source)"), ["keyboard1", "phone"]);
  assert.equal(await phone.evaluate("discardButton.dataset.action"), "discard-station");
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
    const pan = objects.find((item) => item.name === "pan-1");
    phonePlayer.x = pan.x; phonePlayer.y = pan.y; setPlayerPosition(phonePlayer);
    cookingStations["pan-1"] = { phase: "staging", inputs: ["meat"] };
    renderCookingStatuses();
  })()`);
  await phone.evaluate("discardButton.click()");
  await host.waitFor("cookingStations['pan-1'] === null");

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
  await host.evaluate(`(() => {
    const phonePlayer = players.find((player) => player.source === "phone");
    phonePlayer.stats.ordersServed = 2;
    phonePlayer.inventory = { ingredientId: "meat" };
    phonePlayer.plate = { dishId: "chicken-rice" };
    phonePlayer.riceChoice = { selected: "steamed" };
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    fullscreenFallback = true;
    gameScreen.classList.add("fullscreen-fallback");
    managePlayersButtons.find((button) => !button.hidden).click();
  })()`);
  assert.deepEqual(await host.evaluate("({ parent: playerManager.parentElement.id, keyLocked: !keys.has('d'), visible: !playerManager.hidden })"), {
    parent: "game-screen", keyLocked: true, visible: true
  }, "game manager lives inside fullscreen and clears host input without pausing the round");
  await host.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))");
  assert.equal(await host.evaluate("keys.size"), 0, "host keyboard stays locked while player manager is open");
  await host.evaluate("playerManagerList.querySelector('.manager-kick').click(); playerManagerList.querySelector('.manager-kick').click()");
  await Promise.all([
    host.waitFor("players.every((player) => player.source !== 'phone') && departedPlayerStats.length === 1"),
    phone.waitFor("!joinView.hidden && joinMessage.textContent.includes('นำคุณออก')")
  ]);
  assert.deepEqual(await host.evaluate("({ running: gameRunning, players: players.length, stats: departedPlayerStats[0].ordersServed, managerCount: phoneControllers.length })"), {
    running: true, players: 1, stats: 2, managerCount: 0
  }, "kicking mid-round removes player state immediately, preserves stats, and continues below two players");
  await host.evaluate("closePlayerManager(); setScore(100); finishRound()");
  await host.waitFor("!resultsScreen.hidden");
  assert.equal(await host.evaluate("resultsList.textContent.includes('ออกจากห้องแล้ว') && resultsList.textContent.includes('เสิร์ฟแล้ว 2 ออเดอร์')"), true, "results retain departed player stats with a status label");
  await host.evaluate("managePlayersButtons.find((button) => !button.hidden).click()");
  assert.equal(await host.evaluate("playerManagerList.textContent.includes('ไม่มีผู้เล่นมือถือ')"), true, "results manager no longer contains the removed slot");
  await host.evaluate("closePlayerManager(); playAgainButton.click()");
  await phone.evaluate("controllerNameInput.value = 'มือถือใหม่'; joinButton.click()");
  await Promise.all([host.waitFor("phoneControllers.length === 1"), phone.waitFor("!controlsView.hidden")]);
  await phone.evaluate("leaveButton.click()");
  assert.equal(await phone.evaluate("!leaveConfirmation.hidden"), true, "controller leave uses an in-page confirmation");
  await phone.evaluate("confirmLeaveButton.click()");
  await Promise.all([host.waitFor("phoneControllers.length === 0"), phone.waitFor("!joinView.hidden")]);
  assert.equal(await phone.evaluate("localStorage.getItem(tokenKey())"), null, "controller leave clears its reconnect token and returns to Join");
  await host.evaluate("exitGameButton.click()");
  assert.deepEqual(host.exceptions, []);
  assert.deepEqual(phone.exceptions, []);
  console.log("browser local co-op check passed", { sessionCode, keyboardPlayers: 2, phoneController: true });
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
