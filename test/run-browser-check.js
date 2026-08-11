const assert = require("node:assert/strict");
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
    playerState.x = target.x; playerState.y = target.y; setPlayerPosition(); soloInteract();
    return { inventory, message: message.textContent };
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
  assert.equal(await cdp.evaluate(`(() => {
    startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
    return orders[0].expiresAt - orders[0].createdAt;
  })()`), 35000, "solo orders last 35 seconds");
  assert.deepEqual(await cdp.evaluate("({ secondsLeft, timer: timerElement.textContent })"), { secondsLeft: 120, timer: "120" }, "solo rounds start at two minutes");

  for (const station of ["pan-1", "pan-2", "pot-1", "pot-2"]) {
    await interact(cdp, "meat");
    await interact(cdp, station);
    await interact(cdp, station);
  }
  assert.deepEqual(await cdp.evaluate("Object.fromEntries(['pan-1', 'pan-2', 'pot-1', 'pot-2'].map((id) => [id, soloStations[id]?.phase]))"), {
    "pan-1": "cooking", "pan-2": "cooking", "pot-1": "cooking", "pot-2": "cooking"
  }, "duplicate pans and pots cook independently");
  await sleep(2150);
  assert.equal(await cdp.evaluate("Object.values(soloStations).filter((station) => station?.phase === 'ready').length"), 4, "all duplicate stations become ready independently");

  for (const menu of cookingData.menus) {
    await cdp.evaluate(`(() => {
      startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId);
      secondsLeft = 999; timerElement.textContent = secondsLeft;
      orders = [{ id: "browser-order", menuId: ${JSON.stringify(menu.id)}, name: ${JSON.stringify(menu.name)}, createdAt: Date.now(), expiresAt: Date.now() + 60000 }];
      updateOrder(); return true;
    })()`);
    const delayedPlate = menu.id === "shrimp-fried-rice";
    if (!delayedPlate) await interact(cdp, "plate");
    for (const step of menu.steps) {
      if (!step.tool) {
        const ingredient = step.ingredients[0];
        await interact(cdp, "rice");
        await cdp.evaluate(`document.querySelector('[data-rice=${ingredient === "steamedRice" ? "steamed" : "sticky"}]').click()`);
      } else {
        const cookingStation = primaryStationForTool[step.tool];
        const stationIngredients = [...step.ingredients].reverse();
        for (const [ingredientIndex, ingredient] of stationIngredients.entries()) {
          if (ingredient === "steamedRice" || ingredient === "stickyRice") {
            await interact(cdp, "rice");
            await cdp.evaluate(`document.querySelector('[data-rice=${ingredient === "steamedRice" ? "steamed" : "sticky"}]').click()`);
          } else {
            await interact(cdp, ingredient);
          }
          assert.equal(await cdp.evaluate("inventory.kind"), "ingredient", `${menu.id}: raw ingredient held without plate`);
          await interact(cdp, cookingStation);
          assert.equal(await cdp.evaluate("inventory"), null, `${menu.id}: ingredient deposited in station`);
          assert.equal(await cdp.evaluate(`soloStations[${JSON.stringify(cookingStation)}].inputs.length`), ingredientIndex + 1, `${menu.id}: station accumulated ingredient`);
          assert.equal(await cdp.evaluate("document.querySelectorAll('#cooking-statuses .station-ingredient-image').length"), ingredientIndex + 1, `${menu.id}: staged ingredient icons shown`);
          const stagedInputs = stationIngredients.slice(0, ingredientIndex + 1);
          const statusPattern = cookingData.findExactTransformation(step.tool, stagedInputs) ? /พร้อมเริ่ม/ : /รอวัตถุดิบเพิ่ม/;
          assert.match(await cdp.evaluate("document.querySelector('#cooking-statuses .cooking-status-label').textContent"), statusPattern, `${menu.id}: station reports current recipe readiness`);
        }
        assert.match(await cdp.evaluate("document.querySelector('#cooking-statuses .cooking-status-label').textContent"), /พร้อมเริ่ม/, `${menu.id}: station reports ready to start`);
        await interact(cdp, cookingStation);
        assert.equal(await cdp.evaluate(`soloStations[${JSON.stringify(cookingStation)}].phase`), "cooking", `${menu.id}: cooking started`);
        await sleep(2150);
        assert.equal(await cdp.evaluate(`soloStations[${JSON.stringify(cookingStation)}].phase`), "ready", `${menu.id}: cooking completed`);
        if (!(await cdp.evaluate("Boolean(assemblyPlate)"))) await interact(cdp, "plate");
        await interact(cdp, cookingStation);
      }
    }
    assert.equal(await cdp.evaluate("assemblyPlate.dishId"), menu.id, `${menu.id}: completed dish`);
    assert.equal(await cdp.evaluate("document.querySelectorAll('#held-images image').length"), 1, `${menu.id}: completed image shown`);
    assert.ok(await cdp.evaluate("document.querySelectorAll('.order-ingredient-icon').length"), `${menu.id}: order recipe icons shown`);
    await interact(cdp, "serve");
    assert.deepEqual(await cdp.evaluate("({ score, inventory, plate: assemblyPlate, orders: orders.length })"), { score: 1, inventory: null, plate: null, orders: 0 }, `${menu.id}: served matching order`);
  }

  await cdp.evaluate("startSoloGame(); clearInterval(timerId); clearInterval(orderTimerId); clearInterval(orderGenerationId)");
  await interact(cdp, "plate");
  await interact(cdp, "rice");
  await cdp.evaluate("document.querySelector('[data-rice=steamed]').click()");
  await interact(cdp, "egg");
  await interact(cdp, "pot-1");
  await interact(cdp, "pot-1");
  await sleep(2150);
  await interact(cdp, "pot-1");
  assert.equal(await cdp.evaluate("assemblyPlate.invalid"), true);
  await interact(cdp, "trash");
  assert.equal(await cdp.evaluate("assemblyPlate"), null);

  const startX = await cdp.evaluate("playerState.x");
  await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))");
  await sleep(250);
  await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }))");
  assert.ok(await cdp.evaluate("playerState.x") > startX, "keyboard movement updates player position");

  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: "landscapePrimary", angle: 90 } });
  await sleep(300);
  assert.notEqual(await cdp.evaluate("getComputedStyle(document.querySelector('#mobile-controls')).display"), "none");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('#orientation-warning')).display"), "none");
  const touchStartX = await cdp.evaluate("playerState.x");
  await cdp.evaluate("document.querySelector('[data-direction=right]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))");
  await sleep(250);
  await cdp.evaluate("document.querySelector('[data-direction=right]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))");
  assert.ok(await cdp.evaluate("playerState.x") > touchStartX, "touch control updates player position");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: "portraitPrimary", angle: 0 } });
  await sleep(300);
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('#orientation-warning')).display"), "grid");
  assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('.game-shell')).visibility"), "hidden");
  assert.deepEqual(cdp.exceptions, []);
  console.log("browser solo and responsive check passed", { menus: cookingData.menus.length });
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
