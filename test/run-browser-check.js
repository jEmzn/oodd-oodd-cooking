const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const cookingData = require("../recipes.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const primaryStationForTool = { pan: "pan-1", pot: "pot-1", grill: "grill" };

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
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return result;
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
}

async function interact(cdp, station) {
  return cdp.evaluate(`(() => {
    const target = objects.find((item) => item.name === ${JSON.stringify(station)});
    const player = players[0]; player.x = target.x; player.y = target.y; setPlayerPosition(player); interactPlayer(player);
    return { inventory: player.inventory, message: message.textContent };
  })()`);
}

async function main() {
  const targets = await fetch("http://127.0.0.1:9223/json/list").then((response) => response.json());
  const target = targets.find((item) => item.type === "page");
  assert.ok(target, "Chromium page target exists");
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:3210" });
  await sleep(1000);

  assert.equal(await cdp.evaluate("document.title"), "Oodd Oodd Cooking");
  assert.equal(await cdp.evaluate("Boolean(window.CookingData)"), true);
  assert.equal(await cdp.evaluate("document.querySelectorAll('[data-object=ingredients]').length"), 0);
  assert.equal(await cdp.evaluate("document.querySelectorAll('[data-tool=pan]').length"), 2, "two pans are rendered");
  assert.equal(await cdp.evaluate("document.querySelectorAll('[data-tool=pot]').length"), 2, "two pots are rendered");
  await cdp.evaluate("playButton.click()");
  assert.deepEqual(await cdp.evaluate("({ screen: !characterScreen.hidden, cards: characterGrid.children.length, modal: !characterDetailModal.hidden })"), {
    screen: true, cards: 5, modal: false
  }, "solo opens the five-character selection screen");
  await cdp.evaluate("characterGrid.querySelector('[data-character-id=angel-pork]').click()");
  assert.deepEqual(await cdp.evaluate("({ modal: !characterDetailModal.hidden, name: characterDetailName.textContent, skill: characterDetailSkill.textContent.length > 0 })"), {
    modal: true, name: "นางฟ้าหมูจิ๋ว", skill: true
  }, "character card opens skill details");
  await cdp.evaluate("characterCancelButton.click(); characterGrid.querySelector('[data-character-id=grilled-pork]').click(); characterConfirmButton.click()");
  assert.deepEqual(await cdp.evaluate("({ game: !gameScreen.hidden, character: players[0].characterId })"), {
    game: true, character: "grilled-pork"
  }, "confirming a character starts solo with that character");
  assert.deepEqual(await cdp.evaluate(`(() => {
    const player = players[0];
    const sprite = player.elements.sprite;
    const label = player.elements.label;
    return {
      ringCount: player.elements.group.querySelectorAll(".player-color-ring").length,
      labelText: label.textContent,
      labelColorMatchesPlayer: label.getAttribute("fill") === player.color,
      labelY: Number(label.getAttribute("y")),
      spriteBottom: Number(sprite.getAttribute("y")) + Number(sprite.getAttribute("height")),
      labelBelowSprite: Number(label.getAttribute("y")) > Number(sprite.getAttribute("y")) + Number(sprite.getAttribute("height"))
    };
  })()`), {
    ringCount: 0,
    labelText: "ผู้เล่น 1",
    labelColorMatchesPlayer: true,
    labelY: 52,
    spriteBottom: 30,
    labelBelowSprite: true
  }, "local player name is below the sprite without a color ring");
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await sleep(150);
  const desktopLayout = await cdp.evaluate(`(() => {
    const stage = document.querySelector('.game-stage');
    const card = document.querySelector('.game-stage > .order-card');
    const world = document.querySelector('.game-stage > #game-world');
    const icon = document.querySelector('.order-ingredient-icon');
    const cardRect = card.getBoundingClientRect();
    const worldRect = world.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const normal = {
      columns: getComputedStyle(stage).gridTemplateColumns.split(/\\s+/).length,
      cardOnLeft: cardRect.left < worldRect.left,
      worldOnRight: worldRect.left >= stageRect.left + stageRect.width * .25,
      cardWidthRatio: cardRect.width / stageRect.width,
      worldWidthRatio: worldRect.width / stageRect.width,
      cardPadding: parseFloat(cardStyle.paddingTop),
      iconSize: parseFloat(getComputedStyle(icon).width),
      listMaxHeight: getComputedStyle(document.querySelector('.order-list')).maxHeight
    };
    gameScreen.classList.add('fullscreen-fallback');
    const fullscreenStage = getComputedStyle(stage);
    const fullscreenCard = getComputedStyle(card);
    const fullscreen = {
      columns: fullscreenStage.gridTemplateColumns.split(/\\s+/).length,
      cardPosition: fullscreenCard.position,
      cardOnLeft: card.getBoundingClientRect().left < world.getBoundingClientRect().left,
      background: getComputedStyle(gameScreen).backgroundColor,
      shellDisplay: getComputedStyle(document.querySelector('.game-shell')).display,
      messageParent: document.querySelector('#game-message').parentElement.id
    };
    gameScreen.classList.remove('fullscreen-fallback');
    return { normal, fullscreen };
  })()`);
  assert.equal(desktopLayout.normal.columns, 2, "desktop game stage uses two grid columns");
  assert.equal(desktopLayout.normal.cardOnLeft, true, "desktop order card is in the left column");
  assert.equal(desktopLayout.normal.worldOnRight, true, "desktop kitchen is in the right column");
  assert.ok(desktopLayout.normal.cardWidthRatio > .2 && desktopLayout.normal.cardWidthRatio < .4, "desktop order column is about 30 percent");
  assert.ok(desktopLayout.normal.worldWidthRatio > .6, "desktop kitchen column is about 70 percent");
  assert.ok(desktopLayout.normal.cardPadding >= 20 && desktopLayout.normal.iconSize >= 30, "desktop order card content is enlarged");
  assert.equal(desktopLayout.normal.listMaxHeight, "none", "desktop order queue is not clipped");
  assert.deepEqual(desktopLayout.fullscreen, { columns: 2, cardPosition: "static", cardOnLeft: true, background: "rgb(251, 248, 243)", shellDisplay: "block", messageParent: "game-screen" }, "fallback fullscreen keeps the two-column layout without flexing the message into the shell");
  await cdp.evaluate("exitGame()");
  assert.deepEqual(await cdp.evaluate(`(() => {
    startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
    return { lifetime: orders[0].expiresAt - orders[0].createdAt, customerCount: customers.length, menuVisible: !orderCard.hidden, customerState: customers[0].state };
  })()`), { lifetime: 60000, customerCount: 1, menuVisible: true, customerState: "entering" }, "solo starts with a customer entering and a visible menu");
  await cdp.evaluate(`(() => {
    gameScreen.classList.add("fullscreen-fallback");
    const player = players[0];
    const target = objects.find((item) => item.name === "meat");
    player.x = target.x;
    player.y = target.y;
    setPlayerPosition(player);
  })()`);
  const beforeInteraction = await cdp.evaluate(`(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { top: value.top, left: value.left, width: value.width, height: value.height };
    };
    return { stage: rect(".game-stage"), world: rect("#game-world"), card: rect("#order-card"), scrollTop: document.scrollingElement.scrollTop };
  })()`);
  await cdp.evaluate("mobileInteractButton.click()");
  await sleep(30);
  const afterInteraction = await cdp.evaluate(`(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { top: value.top, left: value.left, width: value.width, height: value.height };
    };
    return { stage: rect(".game-stage"), world: rect("#game-world"), card: rect("#order-card"), scrollTop: document.scrollingElement.scrollTop, message: message.textContent };
  })()`);
  await cdp.evaluate("gameScreen.classList.remove('fullscreen-fallback')");
  assert.match(afterInteraction.message, /หยิบเนื้อแล้ว/, "interaction updates the status message");
  for (const element of ["stage", "world", "card"]) {
    assert.deepEqual(afterInteraction[element], beforeInteraction[element], `fullscreen ${element} does not move after interaction`);
  }
  assert.equal(afterInteraction.scrollTop, beforeInteraction.scrollTop, "interaction does not scroll the fullscreen page");
  await sleep(700);
  assert.deepEqual(await cdp.evaluate("({ state: customers[0].state, x: Math.round(customers[0].x), y: Math.round(customers[0].y) })"), {
    state: "waiting", x: 500, y: 530
  }, "customer walks to the serving station");
  const configuredRoundDuration = await cdp.evaluate("roundDurationSeconds");
  assert.deepEqual(await cdp.evaluate("({ secondsLeft, timer: timerElement.textContent })"), { secondsLeft: configuredRoundDuration, timer: `${configuredRoundDuration}` }, "solo rounds start at the configured duration");

  for (const station of ["pan-1", "pan-2", "pot-1", "pot-2"]) {
    await interact(cdp, "meat");
    await interact(cdp, station);
    await interact(cdp, station);
  }
  assert.deepEqual(await cdp.evaluate("Object.fromEntries(['pan-1', 'pan-2', 'pot-1', 'pot-2'].map((id) => [id, cookingStations[id]?.phase]))"), {
    "pan-1": "cooking", "pan-2": "cooking", "pot-1": "cooking", "pot-2": "cooking"
  }, "duplicate pans and pots cook independently");
  await sleep(2150);
  assert.equal(await cdp.evaluate("Object.values(cookingStations).filter((station) => station?.phase === 'ready').length"), 4, "all duplicate stations become ready independently");

  for (const menu of cookingData.menus) {
    await cdp.evaluate(`(() => {
      startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
      secondsLeft = 999; timerElement.textContent = secondsLeft;
      orders = [{ id: "browser-order", menuId: ${JSON.stringify(menu.id)}, name: ${JSON.stringify(menu.name)}, createdAt: Date.now(), expiresAt: Date.now() + 60000 }];
      renderOrders(); return true;
    })()`);
    const delayedPlate = menu.id === "shrimp-fried-rice";
    if (!delayedPlate) await interact(cdp, "plate");
    for (const step of menu.steps) {
      if (!step.tool) {
        const ingredient = step.ingredients[0];
        await interact(cdp, "rice");
        await cdp.evaluate(`chooseRice(players[0], ${JSON.stringify(ingredient === "steamedRice" ? "steamed" : "sticky")})`);
      } else {
        const cookingStation = primaryStationForTool[step.tool];
        const stationIngredients = [...step.ingredients].reverse();
        for (const [ingredientIndex, ingredient] of stationIngredients.entries()) {
          if (ingredient === "steamedRice" || ingredient === "stickyRice") {
            await interact(cdp, "rice");
            await cdp.evaluate(`chooseRice(players[0], ${JSON.stringify(ingredient === "steamedRice" ? "steamed" : "sticky")})`);
          } else {
            await interact(cdp, ingredient);
          }
          assert.equal(await cdp.evaluate("players[0].inventory.kind"), "ingredient", `${menu.id}: raw ingredient held without plate`);
          await interact(cdp, cookingStation);
          assert.equal(await cdp.evaluate("players[0].inventory"), null, `${menu.id}: ingredient deposited in station`);
          assert.equal(await cdp.evaluate(`cookingStations[${JSON.stringify(cookingStation)}].inputs.length`), ingredientIndex + 1, `${menu.id}: station accumulated ingredient`);
          assert.equal(await cdp.evaluate("document.querySelectorAll('#cooking-statuses .station-ingredient-image').length"), ingredientIndex + 1, `${menu.id}: staged ingredient icons shown`);
          const stagedInputs = stationIngredients.slice(0, ingredientIndex + 1);
          const statusPattern = cookingData.findExactTransformation(step.tool, stagedInputs) ? /พร้อมเริ่ม/ : /รอวัตถุดิบเพิ่ม/;
          assert.match(await cdp.evaluate("document.querySelector('#cooking-statuses .cooking-status-label').textContent"), statusPattern, `${menu.id}: station reports current recipe readiness`);
        }
        assert.match(await cdp.evaluate("document.querySelector('#cooking-statuses .cooking-status-label').textContent"), /พร้อมเริ่ม/, `${menu.id}: station reports ready to start`);
        await interact(cdp, cookingStation);
        assert.equal(await cdp.evaluate(`cookingStations[${JSON.stringify(cookingStation)}].phase`), "cooking", `${menu.id}: cooking started`);
        await sleep(2150);
        assert.equal(await cdp.evaluate(`cookingStations[${JSON.stringify(cookingStation)}].phase`), "ready", `${menu.id}: cooking completed`);
        if (!(await cdp.evaluate("Boolean(players[0].plate)"))) await interact(cdp, "plate");
        await interact(cdp, cookingStation);
      }
    }
    assert.equal(await cdp.evaluate("players[0].plate.dishId"), menu.id, `${menu.id}: completed dish`);
    assert.equal(await cdp.evaluate("players[0].elements.heldImages.querySelectorAll('image').length"), 1, `${menu.id}: completed image shown`);
    assert.ok(await cdp.evaluate("document.querySelectorAll('.order-ingredient-icon').length"), `${menu.id}: order recipe icons shown`);
    await interact(cdp, "serve");
    assert.deepEqual(await cdp.evaluate("({ score, inventory: players[0].inventory, plate: players[0].plate, orders: orders.length })"), { score: 1, inventory: null, plate: null, orders: 0 }, `${menu.id}: served matching order`);
  }

  await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  await interact(cdp, "plate");
  await interact(cdp, "rice");
  assert.deepEqual(await cdp.evaluate("({ plate: players[0].plate.components, invalid: players[0].plate.invalid, riceChoice: players[0].riceChoice, message: message.textContent })"), {
    plate: [], invalid: false, riceChoice: null, message: "คุณ: ต้องใส่อาหารที่ปรุงเสร็จก่อนเติมข้าว"
  }, "an empty plate rejects rice before cooked food");
  await interact(cdp, "meat");
  await interact(cdp, "pot-1");
  await interact(cdp, "pot-1");
  await sleep(2150);
  await interact(cdp, "pot-1");
  await interact(cdp, "rice");
  await cdp.evaluate("chooseRice(players[0], 'steamed')");
  assert.deepEqual(await cdp.evaluate("({ components: players[0].plate.components, dishId: players[0].plate.dishId, invalid: players[0].plate.invalid, inventory: players[0].inventory, message: message.textContent })"), {
    components: ["boiledMeat", "steamedRice"], dishId: "chicken-rice", invalid: false, inventory: null,
    message: "คุณ: ข้าวสวยใส่ลงจานแล้ว"
  }, "rice completes a plate after cooked food");

  await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  await interact(cdp, "plate");
  await interact(cdp, "meat");
  await interact(cdp, "grill");
  await interact(cdp, "grill");
  await sleep(2150);
  await interact(cdp, "grill");
  const plateBeforeInvalidRice = await cdp.evaluate("({ components: players[0].plate.components, inventory: players[0].inventory })");
  await interact(cdp, "rice");
  await cdp.evaluate("chooseRice(players[0], 'steamed')");
  assert.deepEqual(await cdp.evaluate("({ components: players[0].plate.components, dishId: players[0].plate.dishId, invalid: players[0].plate.invalid, inventory: players[0].inventory })"), {
    components: plateBeforeInvalidRice.components, dishId: null, invalid: false, inventory: plateBeforeInvalidRice.inventory
  }, "an invalid rice addition preserves the existing plate and inventory");

  const startX = await cdp.evaluate("players[0].x");
  await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))");
  await sleep(250);
  await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }))");
  assert.ok(await cdp.evaluate("players[0].x") > startX, "keyboard movement updates player position");

  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: "landscapePrimary", angle: 90 } });
  await sleep(300);
  assert.notEqual(await cdp.evaluate("getComputedStyle(document.querySelector('#mobile-controls')).display"), "none");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('#orientation-warning')).display"), "none");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('.game-stage')).display"), "flex", "landscape touch keeps the compact stage layout");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('.game-stage > .order-card')).position"), "absolute", "landscape touch keeps the overlaid order card");
  const touchStartX = await cdp.evaluate("players[0].x");
  await cdp.evaluate("document.querySelector('[data-direction=right]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))");
  await sleep(250);
  await cdp.evaluate("document.querySelector('[data-direction=right]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))");
  assert.ok(await cdp.evaluate("players[0].x") > touchStartX, "touch control updates player position");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: "portraitPrimary", angle: 0 } });
  await sleep(300);
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('#orientation-warning')).display"), "grid");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('.game-shell')).visibility"), "hidden");

  const exitCleanup = await cdp.evaluate(`(() => {
    startSoloGame();
    const expectedOrderGenerationId = orderGenerationId;
    const clearedIntervals = [];
    const originalClearInterval = window.clearInterval;
    window.clearInterval = (id) => {
      clearedIntervals.push(id);
      return originalClearInterval(id);
    };
    exitGameButton.click();
    window.clearInterval = originalClearInterval;
    return {
      clearedOrderGeneration: clearedIntervals.includes(expectedOrderGenerationId),
      gameRunning,
      orderGenerationId,
      startVisible: !startScreen.hidden
    };
  })()`);
  assert.deepEqual(exitCleanup, { clearedOrderGeneration: true, gameRunning: false, startVisible: true }, "exiting solo clears order generation and returns to start");

  await cdp.evaluate("startSoloGame(); finishRound(); exitGameButton.click()");
  await sleep(800);
  assert.equal(await cdp.evaluate("!startScreen.hidden && resultsScreen.hidden"), true, "exiting cancels the delayed solo results screen");
  const fileUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).href;
  await cdp.send("Page.navigate", { url: fileUrl });
  await sleep(700);
  assert.equal(await cdp.evaluate("Boolean(window.CookingData) && typeof startSoloGame === 'function'"), true, "solo loads directly from index.html without a server");
  assert.equal(await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId); players.length"), 1, "direct-file solo starts with one player");
  assert.deepEqual(cdp.exceptions, []);
  console.log("browser solo and responsive check passed", { menus: cookingData.menus.length });
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
