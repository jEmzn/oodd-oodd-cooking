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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
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
  assert.deepEqual(await cdp.evaluate(`(() => {
    storyButton.click();
    return {
      open: !storyModal.hidden,
      title: document.querySelector('#story-title').textContent,
      paragraphs: document.querySelectorAll('#story-content p').length,
      focusedClose: document.activeElement === storyModalClose
    };
  })()`), {
    open: true,
    title: "OOD OOD COOKING STORY",
    paragraphs: 2,
    focusedClose: true
  }, "story button opens an organized, accessible story modal");
  await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))");
  assert.deepEqual(await cdp.evaluate("({ closed: storyModal.hidden, focusReturned: document.activeElement === storyButton })"), {
    closed: true,
    focusReturned: true
  }, "Escape closes the story modal and returns focus to its trigger");
  assert.equal(await cdp.evaluate("document.querySelectorAll('[data-object=ingredients]').length"), 0);
  assert.equal(await cdp.evaluate("document.querySelectorAll('[data-tool=pan]').length"), 2, "two pans are rendered");
  assert.equal(await cdp.evaluate("document.querySelectorAll('[data-tool=pot]').length"), 2, "two pots are rendered");
  assert.deepEqual(await cdp.evaluate(`(() => {
    const art = [...document.querySelectorAll('#kitchen-art image')].map((image) => image.getAttribute('href'));
    const assets = ['เคาเตอร์.png', 'เตา.png', 'กระทะ.png', 'หม้อ.png', 'เขียง.png', 'กอก.png', 'เตาย่าง.png', 'ขยะ.png', 'แคชเชียร์.png', 'กล่องข้าว.png', 'กล่องจาน.png', 'กล่องซอส.png', 'กล่องไข่.png', 'กล่องผัก.png', 'กล่องเนื้อ.png'];
    const counters = [...document.querySelectorAll('#kitchen-art .counter-art image')].map((image) => ({
      orientation: image.dataset.counterOrientation,
      x: Number(image.getAttribute('x')),
      y: Number(image.getAttribute('y')),
      width: Number(image.getAttribute('width')),
      height: Number(image.getAttribute('height'))
    }));
    const verticalCounters = counters.filter((counter) => counter.orientation === 'vertical');
    const horizontalCounters = counters.filter((counter) => counter.orientation === 'horizontal');
    const visibleCounterRect = ({ x, y, width, height }) => ({
      left: x + (55 / 640) * width,
      right: x + (387 / 640) * width,
      top: y + (43 / 360) * height,
      bottom: y + (307 / 360) * height
    });
    const rowsAreConnected = (row, axis) => row.slice(1).every((counter, index) => {
      const previous = visibleCounterRect(row[index]);
      const current = visibleCounterRect(counter);
      return Math.abs(current[axis === 'x' ? 'left' : 'top'] - previous[axis === 'x' ? 'right' : 'bottom']) <= 8;
    });
    const counterBoundsInside = counters.every(({ x, y, width, height }) => x >= 0 && y >= 0 && x + width <= 1000 && y + height <= 620);
    const stationElements = [...document.querySelectorAll('#station-hitboxes [data-object]')];
    const expectedStationIds = ['pot-1', 'pan-1', 'pot-2', 'pan-2', 'grill', 'trash', 'rice', 'plate', 'sauce', 'egg', 'vegetable', 'meat', 'serve'];
    const stationTransformsMatchData = stationElements.every((element) => element.getAttribute('transform') === "translate(" + element.dataset.x + " " + element.dataset.y + ")");
    const counterCornerGap = (() => {
      if (!verticalCounters.length || !horizontalCounters.length) return null;
      const vertical = visibleCounterRect(verticalCounters.at(-1));
      const horizontal = visibleCounterRect(horizontalCounters[0]);
      return Math.abs(horizontal.left - vertical.right) <= 8;
    })();
    const counterVisibleRects = counters.map(visibleCounterRect);
    const countersDoNotOverlap = counterVisibleRects.every((rect, index) => counterVisibleRects.every((other, otherIndex) => {
      if (index === otherIndex) return true;
      const overlapWidth = Math.min(rect.right, other.right) - Math.max(rect.left, other.left);
      const overlapHeight = Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top);
      return overlapWidth <= 0 || overlapHeight <= 0;
    }));
    const stationHitboxesComplete = stationElements.length === expectedStationIds.length
      && expectedStationIds.every((id) => {
        const station = document.querySelector('#station-hitboxes [data-object="' + id + '"]');
        return station && station.dataset.x && station.dataset.y && station.querySelector('.station-hitbox');
      });
    const ingredientArt = Object.fromEntries([...document.querySelectorAll('[data-ingredient-art]')]
      .map((image) => [image.dataset.ingredientArt, { x: Number(image.getAttribute('x')), y: Number(image.getAttribute('y')) }]));
    return {
      missing: assets.filter((asset) => !art.includes("image/kitchen/" + asset)),
      counterCount: counters.length,
      counterOrientations: [verticalCounters.length, horizontalCounters.length],
      counterBoundsInside,
      counterRowsAreConnected: rowsAreConnected(verticalCounters, 'y') && rowsAreConnected(horizontalCounters, 'x'),
      counterCornerGap,
      countersDoNotOverlap,
      ingredientArtCount: document.querySelectorAll('[data-ingredient-art]').length,
      ingredientArt,
      stationHitboxCount: document.querySelectorAll('.station-hitbox').length,
      interactiveObjectCount: document.querySelectorAll('#station-hitboxes [data-object]').length,
      stationHitboxesComplete,
      stationTransformsMatchData,
      labelsVisible: [...document.querySelectorAll('#station-hitboxes .object-label')].some((label) => getComputedStyle(label).display !== 'none'),
      utensilHref: Object.fromEntries([...document.querySelectorAll('[data-station-art]')].map((image) => [image.dataset.stationArt, image.getAttribute('href')]))
    };
  })()`), {
    missing: [], ingredientArtCount: 6, stationHitboxCount: 13, interactiveObjectCount: 13, labelsVisible: false,
    counterCount: 4, counterOrientations: [4, 0], counterBoundsInside: false, counterRowsAreConnected: false,
    counterCornerGap: null, countersDoNotOverlap: true,
    ingredientArt: {
      rice: { x: 737, y: 342 }, plate: { x: 820, y: 342 }, sauce: { x: 488, y: 342 },
      egg: { x: 571, y: 342 }, vegetable: { x: 654, y: 342 }, meat: { x: 405, y: 342 }
    },
    stationHitboxesComplete: true, stationTransformsMatchData: false,
    utensilHref: {
      "pot-1": "image/kitchen/หม้อ.png", "pan-1": "image/kitchen/กระทะ.png",
      "pot-2": "image/kitchen/หม้อ.png", "pan-2": "image/kitchen/กระทะ.png"
    }
  }, "new kitchen artwork and separate station hitboxes are present");
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
  assert.deepEqual(await cdp.evaluate("({ targetHeight: gameplayCharacterHeight, sourceHeight: players[0].character.sprites.down[0].height, renderedHeight: getPlayerSprite(players[0], 'down').height, renderedWidth: getPlayerSprite(players[0], 'down').width, boarHeight: getPlayerSprite({ character: characterDefinitions.find((character) => character.id === 'boar') }, 'down').height, babyPorkHeight: getPlayerSprite({ character: characterDefinitions.find((character) => character.id === 'baby-pork') }, 'down').height, shadowTag: players[0].elements.shadow.tagName, shadowRx: Number(players[0].elements.shadow.getAttribute('rx')), shadowRy: Number(players[0].elements.shadow.getAttribute('ry')) })"), {
    targetHeight: 92, sourceHeight: 80, renderedHeight: 92, renderedWidth: 78, boarHeight: 100, babyPorkHeight: 63, shadowTag: "ellipse", shadowRx: 20.24, shadowRy: 5.98
  }, "gameplay character size matches the customer reference, keeps Boar slightly larger, makes Baby Pork smaller, and uses proportional shadows");
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
    labelText: "คุณ",
    labelColorMatchesPlayer: true,
    labelY: 52,
    spriteBottom: 30,
    labelBelowSprite: true
  }, "local player name is below the sprite without a color ring");
  assert.deepEqual(await cdp.evaluate(`(() => {
    const directions = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
    const readTranslateY = (element) => Number(element.getAttribute("transform").match(/translate\\(0 ([^)]+)\\)/)[1]);
    const readOverlay = (player) => {
      const spriteY = Number(player.elements.sprite.getAttribute("y"));
      const spriteHeight = Number(player.elements.sprite.getAttribute("height"));
      const heldY = readTranslateY(player.elements.held);
      const actionY = readTranslateY(player.elements.badge);
      const statusY = readTranslateY(player.elements.statusBadge);
      return {
        heldGap: spriteY - (heldY + heldItemRadius),
        actionHeldGap: (heldY - heldItemRadius) - (actionY + playerActionBadgeBounds.bottom),
        statusActionGap: (actionY + playerActionBadgeBounds.top) - (statusY + playerStatusBadgeBounds.bottom),
        overlayTop: player.y + Math.min(heldY - heldItemRadius, actionY + playerActionBadgeBounds.top, statusY + playerStatusBadgeBounds.top),
        footAnchor: spriteY + spriteHeight,
        imageCount: player.elements.heldImages.querySelectorAll("image").length
      };
    };

    clearPlayers();
    const testPlayers = characterDefinitions.map((character, index) => createPlayer({
      id: "overlay-" + character.id,
      name: character.name,
      source: "keyboard1",
      characterId: character.id
    }, index));
    const normalChecks = [];
    const recoveryChecks = [];
    let footAnchorsStable = true;
    let positionsStable = true;

    testPlayers.forEach((player) => {
      player.inventory = cookingData.createIngredient("meat");
      player.elements.badge.setAttribute("opacity", "1");
      player.elements.statusBadge.setAttribute("opacity", "1");
      renderHeldItem(player);
      const originalPosition = { x: player.x, y: player.y };

      Object.entries(directions).forEach(([direction, [dx, dy]]) => {
        player.recoveryUntil = 0;
        player.direction = direction;
        player.lastSpriteKey = "";
        updatePlayerSprite(player, dx, dy, true, 280);
        const overlay = readOverlay(player);
        normalChecks.push(overlay);
        footAnchorsStable = footAnchorsStable && overlay.footAnchor === playerFootAnchorY;
        positionsStable = positionsStable && player.x === originalPosition.x && player.y === originalPosition.y;
      });

      [0, 1500].forEach((startedAgo) => {
        player.recoveryUntil = Date.now() + 10000;
        player.recoveryStartedAt = Date.now() - startedAgo;
        player.lastSpriteKey = "";
        updatePlayerSprite(player);
        const overlay = readOverlay(player);
        recoveryChecks.push(overlay);
        footAnchorsStable = footAnchorsStable && overlay.footAnchor === playerFootAnchorY;
      });

      player.recoveryUntil = 0;
      player.lastSpriteKey = "";
      updatePlayerSprite(player);
      player.y = 105;
      setPlayerPosition(player);
      player.edgeOverlay = readOverlay(player);
      player.edgePosition = { x: player.x, y: player.y };
    });

    testPlayers[0].inventory = null;
    testPlayers[0].plate = cookingData.createPlate();
    renderHeldItem(testPlayers[0]);
    const edgeChecks = testPlayers.map((player) => player.edgeOverlay);
    const result = {
      normalCount: normalChecks.length,
      recoveryCount: recoveryChecks.length,
      normalGaps: normalChecks.every((overlay) => overlay.heldGap === playerOverlayGap && overlay.actionHeldGap === playerOverlayGap && overlay.statusActionGap === playerOverlayGap),
      recoveryGaps: recoveryChecks.every((overlay) => overlay.heldGap === playerOverlayGap && overlay.actionHeldGap === playerOverlayGap && overlay.statusActionGap === playerOverlayGap),
      heldImages: testPlayers.every((player) => player.elements.held.getAttribute("opacity") === "1" && player.elements.heldImages.querySelectorAll("image").length === 1),
      plateImage: testPlayers[0].elements.heldImages.querySelectorAll("image").length === 1,
      footAnchorsStable,
      positionsStable,
      edgeOverlaysInside: edgeChecks.every((overlay) => overlay.overlayTop >= 0),
      edgeGapReduced: edgeChecks.some((overlay) => overlay.heldGap < playerOverlayGap),
      edgePositionsStable: testPlayers.every((player) => player.edgePosition.x === player.x && player.edgePosition.y === player.y),
      spriteBeforeHeld: testPlayers.every((player) => [...player.elements.group.children].indexOf(player.elements.sprite) < [...player.elements.group.children].indexOf(player.elements.held)),
      boarHeight: Number(testPlayers.find((player) => player.characterId === "boar").elements.sprite.getAttribute("height")),
      boarShadowRy: Number(testPlayers.find((player) => player.characterId === "boar").elements.shadow.getAttribute("ry")),
      babyPorkHeight: Number(testPlayers.find((player) => player.characterId === "baby-pork").elements.sprite.getAttribute("height")),
      babyPorkShadowRy: Number(testPlayers.find((player) => player.characterId === "baby-pork").elements.shadow.getAttribute("ry"))
    };
    clearPlayers();
    return result;
  })()`), {
    normalCount: 20,
    recoveryCount: 10,
    normalGaps: true,
    recoveryGaps: true,
    heldImages: true,
    plateImage: true,
    footAnchorsStable: true,
    positionsStable: true,
    edgeOverlaysInside: true,
    edgeGapReduced: true,
    edgePositionsStable: true,
    spriteBeforeHeld: true,
    boarHeight: 100,
    boarShadowRy: 6.5,
    babyPorkHeight: 63,
    babyPorkShadowRy: 5
  }, "held item, action, recovery overlays, and character-specific shadows follow every sprite height");
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await sleep(150);
  await cdp.evaluate(`(() => {
    const menu = menus.find((item) => item.id === "braised-pork-rice");
    orders = [{ id: "order-layout", menuId: menu.id, name: menu.name, createdAt: Date.now(), expiresAt: Date.now() + 60000, customerId: null }];
    renderOrders();
  })()`);
  const desktopLayout = await cdp.evaluate(`(() => {
    const stage = document.querySelector('.game-stage');
    const card = document.querySelector('.game-stage > .order-card');
    const world = document.querySelector('.game-stage > #game-world');
    const icon = document.querySelector('.order-ingredient-icon');
    const cardRect = card.getBoundingClientRect();
    const worldRect = world.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const steps = [...card.querySelectorAll(".order-step")];
    const stepRects = steps.map((step) => {
      const rect = step.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    const normal = {
      columns: getComputedStyle(stage).gridTemplateColumns.split(/\\s+/).length,
      cardOnLeft: cardRect.left < worldRect.left,
      worldOnRight: worldRect.left >= stageRect.left + stageRect.width * .25,
      cardWidthRatio: cardRect.width / stageRect.width,
      worldWidthRatio: worldRect.width / stageRect.width,
      cardPadding: parseFloat(cardStyle.paddingTop),
      iconSize: parseFloat(getComputedStyle(icon).width),
      listMaxHeight: getComputedStyle(document.querySelector('.order-list')).maxHeight,
      stepClasses: steps.map((step) => [...step.classList].find((name) => name.startsWith("order-step--"))),
      stepBorders: steps.map((step) => getComputedStyle(step).borderTopColor),
      stepsInsideCard: stepRects.every((rect) => rect.left >= cardRect.left && rect.right <= cardRect.right)
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
  assert.ok(desktopLayout.normal.cardPadding >= 20 && desktopLayout.normal.iconSize >= 36, "desktop order card content is enlarged");
  assert.deepEqual(desktopLayout.normal.stepClasses, ["order-step--0", "order-step--1", "order-step--2"], "order steps have deterministic color classes");
  assert.equal(new Set(desktopLayout.normal.stepBorders).size, 3, "order steps use separate pastel borders");
  assert.equal(desktopLayout.normal.stepsInsideCard, true, "desktop order steps stay inside the order card");
  assert.equal(desktopLayout.normal.listMaxHeight, "none", "desktop order queue is not clipped");
  assert.deepEqual(desktopLayout.fullscreen, { columns: 2, cardPosition: "static", cardOnLeft: true, background: "rgb(251, 248, 243)", shellDisplay: "block", messageParent: "game-screen" }, "fallback fullscreen keeps the two-column layout without flexing the message into the shell");
  await cdp.evaluate("exitGame()");
  assert.deepEqual(await cdp.evaluate(`(() => {
    startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
    const menu = menus[0];
    const order = (id, expiresAt) => ({ id, menuId: menu.id, name: menu.name, createdAt: Date.now() - 1000, expiresAt, customerId: null });
    const now = Date.now();
    setScore(100);
    orders = [order("expired-one", now - 1), order("active-one", now + 60000)];
    expireOrders();
    const afterOneExpiry = { score, hud: scoreElement.textContent, orders: orders.length };
    setScore(50);
    orders = [order("expired-two", Date.now() - 1)];
    expireOrders();
    const afterSecondExpiry = score;
    setScore(0);
    orders = [order("expired-three", Date.now() - 1), order("expired-four", Date.now() - 1)];
    expireOrders();
    const afterMultipleExpiryAtZero = score;
    setScore(100);
    showResults();
    const resultsCopy = document.querySelector(".results-score").textContent;
    setScore(250);
    startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
    return {
      afterOneExpiry,
      afterSecondExpiry,
      afterMultipleExpiryAtZero,
      resultsCopy,
      resetScore: score,
      resetHud: scoreElement.textContent,
      hudLabel: document.querySelector(".hud-stats div:nth-child(2) span").textContent
    };
  })()`), {
    afterOneExpiry: { score: 50, hud: "50", orders: 1 },
    afterSecondExpiry: 0,
    afterMultipleExpiryAtZero: 0,
    resultsCopy: "คะแนนรวม 100",
    resetScore: 0,
    resetHud: "0",
    hudLabel: "คะแนน"
  }, "score points, expiration penalties, clamp, reset, HUD, and results copy behave correctly");
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
    state: "waiting", x: 500, y: 595
  }, "customer walks to the serving station");
  const configuredRoundDuration = await cdp.evaluate("roundDurationSeconds");
  assert.equal(configuredRoundDuration, 420, "solo uses the 420-second round duration");
  assert.deepEqual(await cdp.evaluate("({ secondsLeft, timer: timerElement.textContent })"), { secondsLeft: configuredRoundDuration, timer: `${configuredRoundDuration}` }, "solo rounds start at the configured duration");

  await cdp.evaluate("startSoloGame(); clearInterval(orderTimerId); clearInterval(orderGenerationId); secondsLeft = 1; timerElement.textContent = '1'");
  await sleep(1100);
  assert.deepEqual(await cdp.evaluate("({ secondsLeft, timer: timerElement.textContent, gameRunning })"), { secondsLeft: 0, timer: "0", gameRunning: false }, "solo timer reaches zero and stops the round");
  await sleep(750);
  assert.equal(await cdp.evaluate("!resultsScreen.hidden"), true, "solo shows Results after the timer reaches zero");
  await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");

  for (const station of ["pan-1", "pan-2", "pot-1", "pot-2"]) {
    await interact(cdp, station.startsWith("pan") ? "egg" : "meat");
    await interact(cdp, station);
    await interact(cdp, station);
    assert.equal(await cdp.evaluate(`document.querySelector('[data-station-art=${JSON.stringify(station)}]').getAttribute('href')`), `image/kitchen/${station.startsWith("pan") ? "กระทะสุก.png" : "หม้อสุก.png"}`, `${station} switches to its cooking artwork independently`);
  }
  assert.deepEqual(await cdp.evaluate("Object.fromEntries(['pan-1', 'pan-2', 'pot-1', 'pot-2'].map((id) => [id, cookingStations[id]?.phase]))"), {
    "pan-1": "cooking", "pan-2": "cooking", "pot-1": "cooking", "pot-2": "cooking"
  }, "duplicate pans and pots cook independently");
  await sleep(2150);
  assert.equal(await cdp.evaluate("Object.values(cookingStations).filter((station) => station?.phase === 'ready').length"), 4, "all duplicate stations become ready independently");
  assert.deepEqual(await cdp.evaluate("Object.fromEntries([...document.querySelectorAll('[data-station-art]')].map((image) => [image.dataset.stationArt, image.getAttribute('href')]))"), {
    "pan-1": "image/kitchen/กระทะสุก.png", "pan-2": "image/kitchen/กระทะสุก.png", "pot-1": "image/kitchen/หม้อสุก.png", "pot-2": "image/kitchen/หม้อสุก.png"
  }, "cooked artwork remains visible while stations are READY");

  assert.deepEqual(await cdp.evaluate(`(() => {
    startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
    const pan = objects.find((item) => item.name === "pan-1");
    const player = players[0];
    player.x = pan.x; player.y = pan.y; setPlayerPosition(player);
    player.inventory = cookingData.createIngredient("meat");
    interactPlayer(player);
    interactPlayer(player);
    return { phase: cookingStations["pan-1"].phase, inputs: cookingStations["pan-1"].inputs, message: message.textContent };
  })()`), {
    phase: "staging", inputs: ["meat"], message: "คุณ: วัตถุดิบยังไม่ครบสูตร"
  }, "pan meat alone cannot start an orphan recipe");

  assert.deepEqual(await cdp.evaluate(`(() => {
    const player = players[0];
    player.inventory = cookingData.createIngredient("egg");
    player.plate = cookingData.createPlate();
    const inventoryBefore = player.inventory.ingredientId;
    discardStagedStation(player);
    return {
      station: cookingStations["pan-1"],
      inventory: player.inventory.ingredientId,
      plate: player.plate,
      statusCount: document.querySelectorAll("#cooking-statuses > *").length,
      message: message.textContent,
      inventoryBefore
    };
  })()`), {
    station: null,
    inventory: "egg",
    plate: { kind: "plate", components: [], dishId: null, invalid: false },
    statusCount: 0,
    message: "คุณ: ทิ้งวัตถุดิบที่เตรียมไว้ในกระทะ 1แล้ว",
    inventoryBefore: "egg"
  }, "discard clears staged station without changing held inventory or plate");

  assert.deepEqual(await cdp.evaluate(`(() => {
    const player = players[0];
    const pan = objects.find((item) => item.name === "pan-1");
    player.x = pan.x; player.y = pan.y; player.inventory = cookingData.createIngredient("egg"); setPlayerPosition(player);
    interactPlayer(player); interactPlayer(player);
    discardStagedStation(player);
    const cookingPhase = cookingStations["pan-1"].phase;
    cookingStations["pan-1"].phase = "ready";
    cookingStations["pan-1"].output = "friedEgg";
    discardStagedStation(player);
    return { cookingPhase, readyPhase: cookingStations["pan-1"].phase, message: message.textContent };
  })()`), {
    cookingPhase: "cooking", readyPhase: "ready", message: "คุณ: อาหารในกระทะ 1สุกแล้ว จึงทิ้งจากสถานีไม่ได้"
  }, "discard does not clear cooking or ready stations");

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
    assert.deepEqual(await cdp.evaluate("({ score, hud: scoreElement.textContent, inventory: players[0].inventory, plate: players[0].plate, orders: orders.length })"), { score: 100, hud: "100", inventory: null, plate: null, orders: 0 }, `${menu.id}: served matching order awards 100 points`);
  }

  await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  await interact(cdp, "plate");
  await interact(cdp, "rice");
  await cdp.evaluate("chooseRice(players[0], 'steamed')");
  assert.deepEqual(await cdp.evaluate("({ plate: players[0].plate.components, invalid: players[0].plate.invalid, riceChoice: players[0].riceChoice, message: message.textContent })"), {
    plate: ["steamedRice"], invalid: false, riceChoice: null, message: "คุณ: ข้าวสวยใส่ลงจานแล้ว"
  }, "an empty plate accepts rice before cooked food");
  await interact(cdp, "meat");
  await interact(cdp, "pot-1");
  await interact(cdp, "pot-1");
  await sleep(2150);
  await interact(cdp, "pot-1");
  assert.deepEqual(await cdp.evaluate("({ components: players[0].plate.components, dishId: players[0].plate.dishId, invalid: players[0].plate.invalid, inventory: players[0].inventory, message: message.textContent })"), {
    components: ["steamedRice", "boiledMeat"], dishId: "chicken-rice", invalid: false, inventory: null,
    message: "คุณ: ประกอบเมนูสำเร็จแล้ว นำไปเสิร์ฟ"
  }, "cooked food completes a plate after rice");

  await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  await interact(cdp, "plate");
  await interact(cdp, "rice");
  await cdp.evaluate("chooseRice(players[0], 'sticky')");
  await interact(cdp, "meat");
  await interact(cdp, "pot-1");
  await interact(cdp, "pot-1");
  await sleep(2150);
  await interact(cdp, "pot-1");
  const plateBeforeInvalidComponent = await cdp.evaluate("({ components: players[0].plate.components, inventory: players[0].inventory })");
  assert.deepEqual(await cdp.evaluate("({ components: players[0].plate.components, dishId: players[0].plate.dishId, invalid: players[0].plate.invalid, inventory: players[0].inventory, station: cookingStations['pot-1']?.phase, message: message.textContent })"), {
    components: plateBeforeInvalidComponent.components, dishId: null, invalid: false, inventory: plateBeforeInvalidComponent.inventory,
    station: "ready", message: "คุณ: จานนี้ไม่สามารถรับส่วนผสมนี้ได้"
  }, "an invalid cooked component preserves the existing plate and station output");

  await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  await interact(cdp, "plate");
  await interact(cdp, "meat");
  await interact(cdp, "pot-1");
  await interact(cdp, "pot-1");
  await sleep(2150);
  await interact(cdp, "pot-1");
  const plateBeforeInvalidRice = await cdp.evaluate("({ components: players[0].plate.components, inventory: players[0].inventory })");
  await interact(cdp, "rice");
  await cdp.evaluate("chooseRice(players[0], 'sticky')");
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
  const landscapeOrderLayout = await cdp.evaluate(`(() => {
    const menu = menus.find((item) => item.id === "shrimp-fried-rice");
    orders = [{ id: "landscape-order", menuId: menu.id, name: menu.name, createdAt: Date.now(), expiresAt: Date.now() + 60000, customerId: null }];
    renderOrders();
    const card = document.querySelector(".game-stage > .order-card");
    const cardRect = card.getBoundingClientRect();
    const steps = [...card.querySelectorAll(".order-step")];
    const stepRects = steps.map((step) => {
      const rect = step.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    return {
      iconSize: parseFloat(getComputedStyle(card.querySelector(".order-ingredient-icon")).width),
      stepClasses: steps.map((step) => [...step.classList].find((name) => name.startsWith("order-step--"))),
      stepsInsideCard: stepRects.every((rect) => rect.left >= cardRect.left && rect.right <= cardRect.right && rect.top >= cardRect.top && rect.bottom <= cardRect.bottom)
    };
  })()`);
  assert.notEqual(await cdp.evaluate("getComputedStyle(document.querySelector('#mobile-controls')).display"), "none");
  assert.notEqual(await cdp.evaluate("getComputedStyle(document.querySelector('#mobile-discard-button')).display"), "none");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('#orientation-warning')).display"), "none");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('.game-stage')).display"), "flex", "landscape touch keeps the compact stage layout");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('.game-stage > .order-card')).position"), "absolute", "landscape touch keeps the overlaid order card");
  assert.ok(landscapeOrderLayout.iconSize >= 24, "landscape order ingredient icons remain touch-readable");
  assert.deepEqual(landscapeOrderLayout.stepClasses, ["order-step--0"], "landscape order keeps deterministic step styling");
  assert.equal(landscapeOrderLayout.stepsInsideCard, true, "landscape compound order steps stay inside the order card");
  assert.equal(await cdp.evaluate(`(() => {
    const player = players[0];
    const pan = objects.find((item) => item.name === "pan-1");
    player.x = pan.x; player.y = pan.y; setPlayerPosition(player);
    cookingStations["pan-1"] = { phase: "staging", inputs: ["meat"] };
    mobileDiscardButton.click();
    return cookingStations["pan-1"];
  })()`), null, "touch discard button clears a staged station");
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
