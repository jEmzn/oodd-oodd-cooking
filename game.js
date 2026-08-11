const startScreen = document.querySelector("#start-screen");
const multiplayerScreen = document.querySelector("#multiplayer-screen");
const gameScreen = document.querySelector("#game-screen");
const resultsScreen = document.querySelector("#results-screen");
const playButton = document.querySelector("#play-button");
const multiplayerButton = document.querySelector("#multiplayer-button");
const backButton = document.querySelector("#back-button");
const startLocalButton = document.querySelector("#start-local-button");
const connectPhonesButton = document.querySelector("#connect-phones-button");
const keyboard1Enabled = document.querySelector("#keyboard-1-enabled");
const keyboard2Enabled = document.querySelector("#keyboard-2-enabled");
const keyboard1Name = document.querySelector("#keyboard-1-name");
const keyboard2Name = document.querySelector("#keyboard-2-name");
const localPlayerList = document.querySelector("#local-player-list");
const localPlayerCount = document.querySelector("#local-player-count");
const phoneJoinPanel = document.querySelector("#phone-join-panel");
const lanAddress = document.querySelector("#lan-address");
const controllerQr = document.querySelector("#controller-qr");
const controllerUrl = document.querySelector("#controller-url");
const localSessionCode = document.querySelector("#local-session-code");
const setupMessage = document.querySelector("#setup-message");
const playAgainButton = document.querySelector("#play-again-button");
const resultsButton = document.querySelector("#results-button");
const fullscreenButton = document.querySelector("#fullscreen-button");
const mobileInteractButton = document.querySelector("#mobile-interact-button");
const directionButtons = [...document.querySelectorAll("[data-direction]")];
const soundToggles = [...document.querySelectorAll(".sound-toggle")];
const exitGameButton = document.querySelector("#exit-game-button");
const resultsList = document.querySelector("#results-list");
const resultsScore = document.querySelector("#results-score");
const playerLayer = document.querySelector("#players");
const cookingStatuses = document.querySelector("#cooking-statuses");
const riceChoices = document.querySelector("#rice-choices");
const timerElement = document.querySelector("#timer");
const scoreElement = document.querySelector("#score");
const orderList = document.querySelector("#order-list");
const message = document.querySelector("#game-message");
const walkingSound = new Audio("Sound/walking-for-cartoon.mp3");
const lobbyMusic = new Audio("Sound/background-music-lobby.mp3");
const gameMusic = new Audio("Sound/background-music-map2.mp3");
const cookingData = window.CookingData;
const objects = [...document.querySelectorAll(".object")].map((element) => ({
  element,
  name: element.dataset.object,
  tool: element.dataset.tool || null,
  x: Number(element.dataset.x),
  y: Number(element.dataset.y)
}));

walkingSound.loop = true;
walkingSound.preload = "auto";
walkingSound.volume = 0.8;
lobbyMusic.loop = true;
lobbyMusic.preload = "auto";
lobbyMusic.volume = 0.35;
gameMusic.loop = true;
gameMusic.preload = "auto";
gameMusic.volume = 0.35;

const stationLabels = {
  trash: "ถังขยะ", "pan-1": "กระทะ 1", "pan-2": "กระทะ 2", "pot-1": "หม้อ 1", "pot-2": "หม้อ 2",
  grill: "เตาย่าง", rice: "ข้าว", meat: "เนื้อ", vegetable: "ผัก", egg: "ไข่", sauce: "ซอส", plate: "จาน", serve: "จุดเสิร์ฟ"
};
const toolLabels = { pot: "หม้อ", pan: "กระทะ", grill: "เตาย่าง" };
const cookingStationTools = new Map(objects.filter((object) => object.tool).map((object) => [object.name, object.tool]));
const standalonePickupItems = { meat: "meat", vegetable: "vegetable", egg: "egg", sauce: "sauce" };
const menus = cookingData.menus;
const maxPlayers = 5;
const maxOrders = 2;
const orderLifetime = 60000;
const roundDurationSeconds = 120;
const playerSpeed = 270;
const playerRadius = 32;
const interactionDistance = playerRadius + 72;
const playerColors = ["#ba6849", "#4d8f9d", "#64834f", "#b87c2b", "#8d63a8"];
const spawnPositions = [
  { x: 430, y: 335 }, { x: 500, y: 335 }, { x: 570, y: 335 }, { x: 465, y: 405 }, { x: 535, y: 405 }
];
const playerSprites = {
  down: [
    { href: "pork_nae_animation/Stand%20Still.png", width: 132, height: 74 },
    { href: "pork_nae_animation/Stand%20Still.png", width: 132, height: 74 }
  ],
  up: [
    { href: "pork_nae_animation/Stand%20Still.png", width: 132, height: 74 },
    { href: "pork_nae_animation/Walk%20Forward.png", width: 132, height: 74 }
  ],
  left: [
    { href: "pork_nae_animation/Stand%20Still.png", width: 132, height: 74 },
    { href: "pork_nae_animation/Walk%20towards%20the%20left%20side.png", width: 132, height: 74 }
  ],
  right: [
    { href: "pork_nae_animation/Stand%20Still.png", width: 132, height: 74 },
    { href: "pork_nae_animation/Walk%20towards%20the%20right%20side.png", width: 132, height: 74 }
  ]
};
const keyboardControls = {
  keyboard1: { left: "a", right: "d", up: "w", down: "s", interact: "e", label: "E" },
  keyboard2: { left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", interact: "enter", label: "Enter" }
};

objects.forEach(({ element, name }) => {
  const label = element.querySelector(".object-label");
  if (label && stationLabels[name]) label.textContent = stationLabels[name];
});

const keys = new Set();
let players = [];
let score = 0;
let secondsLeft = roundDurationSeconds;
let orders = [];
let cookingStations = createEmptyCookingStations();
let orderSequence = 0;
let mode = "solo";
let gameRunning = false;
let soundEnabled = true;
let fullscreenFallback = false;
let timerId;
let orderTimerId;
let orderGenerationId;
let resultsTimeoutId;
let animationId;
let cookingAnimationId;
let lastFrameAt;
let relaySocket;
let relayLoader;
let localSession;
let phoneControllers = [];
let joinOptions = [];

function createEmptyCookingStations() {
  return Object.fromEntries([...cookingStationTools.keys()].map((stationId) => [stationId, null]));
}

function sanitizeName(value, fallback) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 18) || fallback;
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, `${value}`));
  return element;
}

function createPlayerElement(player) {
  const group = svgElement("g", { transform: `translate(${player.x} ${player.y})`, class: "local-player" });
  const held = svgElement("g", { transform: "translate(0 -55)", opacity: 0 });
  const heldCircle = svgElement("circle", { class: "held-item-circle", r: 17 });
  const heldImages = svgElement("g");
  held.append(heldCircle, heldImages);
  const shadow = svgElement("circle", { class: "player-shadow", cy: 27, r: 15 });
  const ring = svgElement("circle", { class: "player-color-ring", cy: 26, r: 22, stroke: player.color });
  const sprite = svgElement("image", { class: "player-sprite", href: playerSprites.down[0].href, x: -66, y: -44, width: 132, height: 74, preserveAspectRatio: "xMidYMid meet" });
  const label = svgElement("text", { class: "local-player-label", y: -48, fill: player.color });
  label.textContent = player.name;
  const badge = svgElement("g", { class: "player-action-badge", transform: "translate(0 -80)", opacity: 0 });
  badge.append(svgElement("rect", { x: -29, y: -14, width: 58, height: 26, rx: 13 }));
  const badgeText = svgElement("text", { y: 4 });
  badgeText.textContent = player.source.startsWith("keyboard") ? keyboardControls[player.source].label : "แตะ";
  badge.append(badgeText);
  group.append(held, shadow, ring, sprite, label, badge);
  playerLayer.append(group);
  player.elements = { group, held, heldImages, sprite, label, badge };
  renderHeldItem(player);
}

function createPlayer(config, index) {
  const spawn = spawnPositions[index] || spawnPositions[0];
  const player = {
    id: config.id,
    name: sanitizeName(config.name, `ผู้เล่น ${index + 1}`),
    color: playerColors[index],
    source: config.source,
    x: spawn.x,
    y: spawn.y,
    input: { left: false, right: false, up: false, down: false },
    inventory: null,
    plate: null,
    direction: "down",
    lastSpriteKey: "",
    riceChoice: null,
    connected: config.connected !== false,
    stats: { ordersServed: 0 },
    elements: null
  };
  createPlayerElement(player);
  return player;
}

function clearPlayers() {
  players = [];
  playerLayer.replaceChildren();
  riceChoices.replaceChildren();
}

function setPlayerPosition(player) {
  player.elements.group.setAttribute("transform", `translate(${player.x} ${player.y})`);
}

function updatePlayerSprite(player, dx = 0, dy = 0, moving = false, timestamp = performance.now()) {
  if (moving) {
    if (Math.abs(dx) >= Math.abs(dy)) player.direction = dx < 0 ? "left" : "right";
    else player.direction = dy < 0 ? "up" : "down";
  }
  const sprites = playerSprites[player.direction];
  const frameIndex = moving ? Math.floor(timestamp / 140) % sprites.length : 0;
  const sprite = sprites[frameIndex];
  const spriteKey = `${player.direction}-${frameIndex}`;
  if (spriteKey === player.lastSpriteKey) return;
  player.elements.sprite.setAttribute("href", sprite.href);
  player.elements.sprite.setAttribute("x", `${-sprite.width / 2}`);
  player.elements.sprite.setAttribute("y", `${30 - sprite.height}`);
  player.elements.sprite.setAttribute("width", `${sprite.width}`);
  player.elements.sprite.setAttribute("height", `${sprite.height}`);
  player.lastSpriteKey = spriteKey;
}

function renderHeldItem(player) {
  const images = cookingData.getInventoryImages(player.inventory || player.plate);
  player.elements.heldImages.replaceChildren();
  player.elements.held.setAttribute("opacity", images.length ? "1" : "0");
  images.slice(0, 6).forEach((href, index) => {
    const offset = Math.min(index, 3) * 7;
    const image = svgElement("image", {
      href, x: -13 + offset, y: -13 - offset, width: 26, height: 26,
      preserveAspectRatio: "xMidYMid slice", "clip-path": "url(#held-image-clip)", class: "held-food-image", opacity: index ? 0.5 : 1
    });
    player.elements.heldImages.append(image);
  });
}

function nearestObject(player) {
  return objects.reduce((nearest, object) => {
    const distance = Math.hypot(player.x - object.x, player.y - object.y);
    return distance < nearest.distance ? { object, distance } : nearest;
  }, { object: null, distance: Infinity });
}

function setMessage(text) {
  message.textContent = text;
}

function sendControllerState(player, extra = {}) {
  if (!relaySocket || player.source !== "phone") return;
  relaySocket.emit("local-host:controller-state", {
    playerId: player.id,
    state: {
      phase: gameRunning ? "playing" : resultsScreen.hidden ? "lobby" : "results",
      name: player.name,
      color: player.color,
      canChooseRice: Boolean(player.riceChoice),
      ...extra
    }
  });
}

function setPlayerMessage(player, text) {
  setMessage(`${player.name}: ${text}`);
  sendControllerState(player, { message: text });
}

function updatePlayerPrompt(player) {
  const nearest = nearestObject(player);
  const close = nearest.object && nearest.distance < interactionDistance;
  player.elements.badge.setAttribute("opacity", close && player.connected ? "1" : "0");
}

function renderCookingStatuses() {
  cookingStatuses.replaceChildren();
  Object.entries(cookingStations).forEach(([stationId, station]) => {
    if (!station) return;
    const object = objects.find((item) => item.name === stationId);
    if (!object) return;
    const group = svgElement("g", { transform: `translate(${object.x} ${object.y})`, class: "cooking-status-group" });
    const cardHeight = station.phase === "staging" ? 68 : 42;
    const cardY = station.phase === "staging" ? -154 : -128;
    const card = svgElement("rect", { x: -53, y: cardY, width: 106, height: cardHeight, rx: 14, class: "cooking-status-card" });
    const label = svgElement("text", { x: 0, y: station.phase === "staging" ? -136 : -111, class: "cooking-status-label" });
    if (station.phase === "staging") {
      const ready = Boolean(cookingData.findExactTransformation(object.tool, station.inputs));
      label.textContent = ready ? "พร้อมเริ่ม • โต้ตอบ" : "รอวัตถุดิบเพิ่ม";
      group.append(card, label);
      const iconSize = 22;
      const gap = 4;
      const totalWidth = station.inputs.length * iconSize + Math.max(0, station.inputs.length - 1) * gap;
      station.inputs.forEach((ingredientId, index) => {
        const centerX = -totalWidth / 2 + iconSize / 2 + index * (iconSize + gap);
        group.append(svgElement("circle", { cx: centerX, cy: -112, r: 12, class: "station-ingredient-background" }));
        group.append(svgElement("image", {
          href: cookingData.ingredients[ingredientId]?.images[0] || cookingData.assets.plate,
          x: centerX - iconSize / 2, y: -123, width: iconSize, height: iconSize,
          preserveAspectRatio: "xMidYMid slice", class: "station-ingredient-image"
        }));
      });
    } else {
      const progress = station.phase === "ready" ? 1 : Math.min(1, (Date.now() - station.startedAt) / 2000);
      label.textContent = station.phase === "ready" ? "พร้อมใส่จาน" : "กำลังทำ";
      group.append(card, label);
      group.append(svgElement("rect", { x: -53, y: -103, width: 106, height: 8, rx: 4, class: "cooking-progress-track" }));
      group.append(svgElement("rect", { x: -53, y: -103, width: 106 * progress, height: 8, rx: 4, class: "cooking-progress-fill" }));
    }
    cookingStatuses.append(group);
  });
}

function animateCookingStatuses() {
  renderCookingStatuses();
  if (Object.values(cookingStations).some((station) => station?.phase === "cooking")) {
    cookingAnimationId = requestAnimationFrame(animateCookingStatuses);
  } else {
    cookingAnimationId = undefined;
  }
}

function startCooking(player, stationId) {
  const station = cookingStations[stationId];
  const tool = cookingStationTools.get(stationId);
  if (!station || station.phase !== "staging") return setPlayerMessage(player, `ใส่วัตถุดิบใน${stationLabels[stationId]}ก่อน`);
  const transformation = cookingData.findExactTransformation(tool, station.inputs);
  if (!transformation) return setPlayerMessage(player, "วัตถุดิบยังไม่ครบสูตร");
  station.phase = "cooking";
  station.playerId = player.id;
  station.transformation = transformation;
  station.startedAt = Date.now();
  setPlayerMessage(player, `กำลังปรุงด้วย${stationLabels[stationId]}... 2 วินาที`);
  cancelAnimationFrame(cookingAnimationId);
  cookingAnimationId = requestAnimationFrame(animateCookingStatuses);
  station.timeoutId = window.setTimeout(() => {
    const current = cookingStations[stationId];
    if (!gameRunning || current !== station || current.phase !== "cooking") return;
    current.phase = "ready";
    current.output = transformation.output;
    renderCookingStatuses();
    setMessage(`อาหารที่${stationLabels[stationId]}พร้อมใส่จานแล้ว`);
  }, 2000);
}

function chooseRice(player, requestedRice) {
  if (!player.riceChoice) return;
  const ingredientId = requestedRice === "sticky" ? "stickyRice" : "steamedRice";
  if (player.plate) player.plate = cookingData.appendIngredient(player.plate, ingredientId);
  else player.inventory = cookingData.createIngredient(ingredientId);
  player.riceChoice = null;
  renderHeldItem(player);
  renderRiceChoices();
  setPlayerMessage(player, `${requestedRice === "sticky" ? "ข้าวเหนียว" : "ข้าวสวย"}${player.plate ? "ใส่ลงจานแล้ว" : "หยิบแล้ว"}`);
}

function cancelRiceChoice(player) {
  if (!player.riceChoice) return;
  player.riceChoice = null;
  renderRiceChoices();
  sendControllerState(player, { canChooseRice: false, message: "ยกเลิกการเลือกข้าวแล้ว" });
}

function renderRiceChoices() {
  riceChoices.replaceChildren();
  players.filter((player) => player.riceChoice).forEach((player) => {
    const card = document.createElement("article");
    card.className = "player-rice-choice";
    card.style.setProperty("--player-color", player.color);
    const heading = document.createElement("h3");
    heading.textContent = `${player.name} เลือกข้าว`;
    const options = document.createElement("div");
    options.className = "rice-options";
    [{ id: "steamed", name: "ข้าวสวย" }, { id: "sticky", name: "ข้าวเหนียว" }].forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `rice-option${player.riceChoice.selected === option.id ? " selected" : ""}`;
      button.innerHTML = `<span class="rice-swatch ${option.id === "steamed" ? "steamed-rice" : "sticky-rice"}"></span>${option.name}`;
      button.addEventListener("click", () => chooseRice(player, option.id));
      options.append(button);
    });
    const hint = document.createElement("small");
    hint.textContent = player.source.startsWith("keyboard") ? "ซ้าย/ขวาเพื่อเลือก • ปุ่มโต้ตอบเพื่อยืนยัน" : "เลือกบนโทรศัพท์ของผู้เล่น";
    card.append(heading, options, hint);
    riceChoices.append(card);
  });
}

function interactPlayer(player) {
  if (!gameRunning || !player || !player.connected) return;
  if (player.riceChoice) return chooseRice(player, player.riceChoice.selected);
  const nearest = nearestObject(player);
  if (!nearest.object || nearest.distance >= interactionDistance) return setPlayerMessage(player, "เดินเข้าใกล้สถานีก่อน");
  const name = nearest.object.name;
  if (name === "trash") {
    if (!player.inventory && !player.plate) return setPlayerMessage(player, "ไม่มีอะไรให้ทิ้ง");
    if (player.inventory) player.inventory = null;
    else player.plate = null;
    renderHeldItem(player);
    return setPlayerMessage(player, "ทิ้งของที่ถืออยู่แล้ว");
  }
  if (name === "rice") {
    if (player.inventory) return setPlayerMessage(player, "มือของคุณไม่ว่าง");
    if (player.plate?.dishId || player.plate?.invalid) return setPlayerMessage(player, "จานนี้ใช้ต่อไม่ได้ นำไปทิ้งก่อน");
    player.riceChoice = { selected: "steamed" };
    renderRiceChoices();
    sendControllerState(player, { canChooseRice: true, message: "เลือกข้าวสวยหรือข้าวเหนียว" });
    return;
  }
  if (name === "plate") {
    if (player.plate) return setPlayerMessage(player, "คุณมีจานอยู่แล้ว");
    player.plate = cookingData.createPlate();
    renderHeldItem(player);
    return setPlayerMessage(player, "หยิบจานแล้ว นำไปรับข้าวหรืออาหารที่ปรุงเสร็จ");
  }
  if (standalonePickupItems[name]) {
    if (player.inventory) return setPlayerMessage(player, "มือของคุณไม่ว่าง");
    player.inventory = cookingData.createIngredient(standalonePickupItems[name]);
    renderHeldItem(player);
    return setPlayerMessage(player, `หยิบ${stationLabels[name]}แล้ว`);
  }
  if (cookingStationTools.has(name)) {
    const station = cookingStations[name];
    const tool = cookingStationTools.get(name);
    if (station?.phase === "ready") {
      if (player.inventory) return setPlayerMessage(player, "มือของคุณไม่ว่าง");
      if (!player.plate) return setPlayerMessage(player, "หยิบจานมารับอาหารที่ปรุงเสร็จ");
      if (player.plate.invalid || player.plate.dishId) return setPlayerMessage(player, "จานนี้รับส่วนผสมเพิ่มไม่ได้");
      const nextPlate = cookingData.appendIngredient(player.plate, station.output);
      if (!nextPlate) return setPlayerMessage(player, "จานนี้รับส่วนผสมเพิ่มไม่ได้");
      player.plate = nextPlate;
      cookingStations[name] = null;
      renderHeldItem(player);
      renderCookingStatuses();
      return setPlayerMessage(player, player.plate.dishId ? "ประกอบเมนูสำเร็จแล้ว นำไปเสิร์ฟ" : "ใส่อาหารที่ปรุงแล้วลงจาน");
    }
    if (station?.phase === "cooking") return setPlayerMessage(player, `${stationLabels[name]}กำลังทำงานอยู่`);
    if (player.inventory?.kind === "ingredient") {
      const inputs = [...(station?.inputs || []), player.inventory.ingredientId];
      if (!cookingData.canStageIngredients(tool, inputs)) return setPlayerMessage(player, `วัตถุดิบนี้ใช้ร่วมกับของใน${stationLabels[name]}ไม่ได้`);
      cookingStations[name] = { phase: "staging", inputs };
      player.inventory = null;
      renderHeldItem(player);
      renderCookingStatuses();
      const ready = Boolean(cookingData.findExactTransformation(tool, inputs));
      return setPlayerMessage(player, ready ? `วัตถุดิบใน${stationLabels[name]}พร้อมแล้ว โต้ตอบอีกครั้งเพื่อเริ่มปรุง` : `ต้องเพิ่มวัตถุดิบใน${stationLabels[name]}ให้ครบสูตร`);
    }
    if (!player.inventory) return startCooking(player, name);
    return setPlayerMessage(player, "ต้องถือวัตถุดิบเพื่อใส่สถานี หรือถือจานเพื่อรับอาหาร");
  }
  const menu = player.plate?.dishId ? menus.find((item) => item.id === player.plate.dishId) : null;
  const matchingOrder = orders.find((order) => order.menuId === menu?.id);
  if (matchingOrder) {
    orders = orders.filter((order) => order.id !== matchingOrder.id);
    score += 1;
    player.stats.ordersServed += 1;
    player.plate = null;
    scoreElement.textContent = score;
    renderHeldItem(player);
    renderOrders();
    return setPlayerMessage(player, "เสิร์ฟออเดอร์สำเร็จ!");
  }
  if (player.plate?.dishId) return setPlayerMessage(player, "ไม่มีลูกค้ารอเมนูนี้");
  if (Object.values(cookingStations).some((station) => station?.phase === "cooking")) return setPlayerMessage(player, "อาหารยังทำไม่เสร็จ");
  setPlayerMessage(player, "ทำอาหารก่อนนำไปเสิร์ฟ");
}

function inputForPlayer(player) {
  if (!player.connected || player.riceChoice) return { left: false, right: false, up: false, down: false };
  if (player.source === "phone") return player.input;
  if (mode === "solo") {
    return {
      left: keys.has("a") || keys.has("arrowleft") || keys.has("touch-left"),
      right: keys.has("d") || keys.has("arrowright") || keys.has("touch-right"),
      up: keys.has("w") || keys.has("arrowup") || keys.has("touch-up"),
      down: keys.has("s") || keys.has("arrowdown") || keys.has("touch-down")
    };
  }
  const controls = keyboardControls[player.source];
  return controls ? {
    left: keys.has(controls.left), right: keys.has(controls.right), up: keys.has(controls.up), down: keys.has(controls.down)
  } : player.input;
}

function gameLoop(timestamp) {
  if (!gameRunning) {
    animationId = undefined;
    lastFrameAt = undefined;
    syncWalkingSound(false);
    return;
  }
  const delta = lastFrameAt ? Math.min((timestamp - lastFrameAt) / 1000, 0.05) : 0;
  lastFrameAt = timestamp;
  let someoneMoving = false;
  players.forEach((player) => {
    const input = inputForPlayer(player);
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const moving = Boolean(dx || dy);
    if (moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      player.x = Math.max(65, Math.min(935, player.x + dx * playerSpeed * delta));
      player.y = Math.max(105, Math.min(555, player.y + dy * playerSpeed * delta));
      setPlayerPosition(player);
      someoneMoving = true;
    }
    updatePlayerSprite(player, dx, dy, moving, timestamp);
    updatePlayerPrompt(player);
  });
  syncWalkingSound(someoneMoving);
  animationId = requestAnimationFrame(gameLoop);
}

function renderOrders() {
  orderList.replaceChildren();
  if (!orders.length) {
    const empty = document.createElement("p");
    empty.className = "order-empty";
    empty.textContent = "ไม่มีลูกค้ารออยู่";
    orderList.append(empty);
    return;
  }
  const now = Date.now();
  orders.forEach((order) => {
    const row = document.createElement("article");
    row.className = "order-row";
    const details = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = order.name;
    const menu = menus.find((item) => item.id === order.menuId);
    const recipe = document.createElement("div");
    recipe.className = "order-recipe";
    (menu?.steps || []).forEach((step) => {
      const stepElement = document.createElement("span");
      stepElement.className = `order-step${step.ingredients.length > 1 ? " compound" : ""}`;
      step.ingredients.forEach((ingredientId) => {
        const image = document.createElement("img");
        image.className = "order-ingredient-icon";
        image.src = cookingData.ingredients[ingredientId]?.images[0] || cookingData.assets.plate;
        image.alt = cookingData.ingredients[ingredientId]?.name || "วัตถุดิบ";
        stepElement.append(image);
      });
      if (step.tool) {
        const toolIcon = document.createElement("img");
        toolIcon.className = "order-tool-icon";
        toolIcon.src = `image/food/${step.tool}.svg`;
        toolIcon.alt = toolLabels[step.tool];
        stepElement.append(toolIcon);
      }
      recipe.append(stepElement);
    });
    const remaining = Math.max(0, Math.ceil((order.expiresAt - now) / 1000));
    const countdown = document.createElement("strong");
    countdown.className = remaining <= 5 ? "warning" : "";
    countdown.textContent = `${remaining} วินาที`;
    details.append(name, recipe);
    row.append(details, countdown);
    orderList.append(row);
  });
}

function generateOrder() {
  if (orders.length >= maxOrders) return false;
  const menu = menus[Math.floor(Math.random() * menus.length)];
  const createdAt = Date.now();
  orders.push({ id: `local-${createdAt}-${orderSequence++}`, menuId: menu.id, name: menu.name, createdAt, expiresAt: createdAt + orderLifetime });
  renderOrders();
  return true;
}

function expireOrders() {
  const remaining = orders.filter((order) => order.expiresAt > Date.now());
  if (remaining.length !== orders.length) {
    orders = remaining;
    renderOrders();
    setMessage("ลูกค้ากลับไปแล้ว ออเดอร์ที่เหลือยังรออยู่");
  }
}

function resetRoundState() {
  score = 0;
  secondsLeft = roundDurationSeconds;
  orders = [];
  cookingStations = createEmptyCookingStations();
  scoreElement.textContent = "0";
  timerElement.textContent = `${secondsLeft}`;
  timerElement.classList.remove("warning");
  generateOrder();
  renderCookingStatuses();
}

function startRound() {
  stopRoundActivity();
  resetRoundState();
  showScreen(gameScreen);
  gameRunning = true;
  setMessage(mode === "solo" ? "ใช้ WASD หรือลูกศรเพื่อเดิน และ E เพื่อโต้ตอบ" : "ช่วยกันทำอาหาร ผู้เล่นแต่ละคนใช้ปุ่มโต้ตอบของตัวเอง");
  players.forEach((player) => sendControllerState(player, { phase: "playing", message: "เกมเริ่มแล้ว!" }));
  if (mode === "local") relaySocket?.emit("local-host:phase", { phase: "playing" });
  timerId = window.setInterval(() => {
    secondsLeft -= 1;
    timerElement.textContent = `${secondsLeft}`;
    timerElement.classList.toggle("warning", secondsLeft <= 10);
    if (secondsLeft <= 0) finishRound();
  }, 1000);
  orderTimerId = window.setInterval(() => {
    expireOrders();
    renderOrders();
  }, 1000);
  orderGenerationId = window.setInterval(generateOrder, 7000);
  lastFrameAt = undefined;
  animationId = requestAnimationFrame(gameLoop);
}

function startSoloGame() {
  mode = "solo";
  clearPlayers();
  players.push(createPlayer({ id: "solo", name: "คุณ", source: "keyboard1" }, 0));
  startRound();
}

function activeKeyboardConfigs() {
  const configs = [];
  if (keyboard1Enabled.checked) configs.push({ id: "keyboard-1", name: sanitizeName(keyboard1Name.value, "ผู้เล่น 1"), source: "keyboard1" });
  if (keyboard2Enabled.checked) configs.push({ id: "keyboard-2", name: sanitizeName(keyboard2Name.value, "ผู้เล่น 2"), source: "keyboard2" });
  return configs;
}

function startLocalGame() {
  const configs = [
    ...activeKeyboardConfigs(),
    ...phoneControllers.filter((item) => item.connected).map((item) => ({ id: item.id, name: item.name, source: "phone", connected: true }))
  ];
  if (configs.length < 2 || configs.length > maxPlayers) {
    setupMessage.textContent = "ต้องมีผู้เล่นที่พร้อมใช้งาน 2–5 คน";
    return;
  }
  mode = "local";
  clearPlayers();
  players = configs.map((config, index) => createPlayer(config, index));
  startRound();
}

function stopRoundActivity() {
  gameRunning = false;
  keys.clear();
  directionButtons.forEach((button) => button.classList.remove("pressed"));
  cancelAnimationFrame(animationId);
  animationId = undefined;
  lastFrameAt = undefined;
  cancelAnimationFrame(cookingAnimationId);
  cookingAnimationId = undefined;
  clearInterval(timerId);
  clearInterval(orderTimerId);
  clearInterval(orderGenerationId);
  timerId = undefined;
  orderTimerId = undefined;
  orderGenerationId = undefined;
  clearTimeout(resultsTimeoutId);
  resultsTimeoutId = undefined;
  Object.values(cookingStations).forEach((station) => clearTimeout(station?.timeoutId));
  syncWalkingSound(false);
  syncGameMusic(false);
}

function finishRound() {
  stopRoundActivity();
  if (mode === "local") relaySocket?.emit("local-host:phase", { phase: "results" });
  players.forEach((player) => sendControllerState(player, { phase: "results", message: `ทีมเสิร์ฟสำเร็จ ${score} ออเดอร์` }));
  resultsTimeoutId = window.setTimeout(() => {
    resultsTimeoutId = undefined;
    showResults();
  }, 700);
}

function showResults() {
  showScreen(resultsScreen);
  resultsScore.textContent = `${score}`;
  resultsList.replaceChildren();
  players.forEach((player) => {
    const row = document.createElement("div");
    row.className = "player-row";
    const name = document.createElement("span");
    name.className = "player-row-name";
    const dot = document.createElement("span");
    dot.className = "player-dot";
    dot.style.background = player.color;
    name.append(dot, document.createTextNode(player.name));
    const stats = document.createElement("strong");
    stats.textContent = `เสิร์ฟแล้ว ${player.stats.ordersServed} ออเดอร์`;
    row.append(name, stats);
    resultsList.append(row);
  });
}

function syncWalkingSound(moving) {
  if (moving && gameRunning) {
    if (walkingSound.paused) walkingSound.play().catch(() => {});
    return;
  }
  walkingSound.pause();
  walkingSound.currentTime = 0;
}

function syncLobbyMusic(active) {
  if (active) {
    if (lobbyMusic.paused) lobbyMusic.play().catch(() => {});
  } else {
    lobbyMusic.pause();
    lobbyMusic.currentTime = 0;
  }
}

function syncGameMusic(active) {
  if (active) {
    if (gameMusic.paused) gameMusic.play().catch(() => {});
  } else {
    gameMusic.pause();
    gameMusic.currentTime = 0;
  }
}

function updateSound() {
  lobbyMusic.muted = !soundEnabled;
  gameMusic.muted = !soundEnabled;
  soundToggles.forEach((toggle) => {
    toggle.textContent = soundEnabled ? "🎵 เพลง" : "🔇 ปิดเพลง";
    toggle.setAttribute("aria-pressed", `${!soundEnabled}`);
    toggle.setAttribute("aria-label", soundEnabled ? "ปิดเพลง" : "เปิดเพลง");
  });
  if (soundEnabled && !startScreen.hidden) syncLobbyMusic(true);
  if (soundEnabled && !gameScreen.hidden) syncGameMusic(true);
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function updateFullscreenButton() {
  const active = Boolean(getFullscreenElement()) || fullscreenFallback;
  fullscreenButton.textContent = active ? "ออกจากเต็มจอ" : "เต็มจอ";
  fullscreenButton.setAttribute("aria-label", active ? "ออกจากโหมดเต็มจอ" : "เข้าโหมดเต็มจอ");
  fullscreenButton.setAttribute("aria-pressed", `${active}`);
}

function clearFullscreenPresentation() {
  fullscreenFallback = false;
  gameScreen.classList.remove("fullscreen-fallback");
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
  updateFullscreenButton();
}

async function toggleFullscreen() {
  if (getFullscreenElement() || fullscreenFallback) {
    clearFullscreenPresentation();
    return;
  }
  try {
    if (gameScreen.requestFullscreen) await gameScreen.requestFullscreen({ navigationUI: "hide" });
    else if (gameScreen.webkitRequestFullscreen) await gameScreen.webkitRequestFullscreen();
    else throw new Error("unsupported");
    screen.orientation?.lock?.("landscape").catch(() => {});
  } catch (error) {
    fullscreenFallback = true;
    gameScreen.classList.add("fullscreen-fallback");
    setMessage("เบราว์เซอร์ไม่รองรับเต็มจอ จึงใช้มุมมองแบบขยายแทน");
  }
  updateFullscreenButton();
}

function showScreen(screen) {
  [startScreen, multiplayerScreen, gameScreen, resultsScreen].forEach((item) => { item.hidden = item !== screen; });
  if (screen !== gameScreen) clearFullscreenPresentation();
  if (screen !== gameScreen) riceChoices.replaceChildren();
  syncLobbyMusic(screen === startScreen);
  syncGameMusic(screen === gameScreen);
}

function renderLocalSetup() {
  const keyboardPlayers = activeKeyboardConfigs();
  const connectedPhones = phoneControllers.filter((item) => item.connected);
  const total = keyboardPlayers.length + connectedPhones.length;
  localPlayerCount.textContent = `${total}/${maxPlayers}`;
  startLocalButton.disabled = total < 2 || total > maxPlayers;
  localPlayerList.replaceChildren();
  [...keyboardPlayers, ...connectedPhones.map((item) => ({ ...item, source: "phone" }))].forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "player-row";
    const name = document.createElement("span");
    name.className = "player-row-name";
    const dot = document.createElement("span");
    dot.className = "player-dot";
    dot.style.background = playerColors[index];
    name.append(dot, document.createTextNode(item.name));
    const source = document.createElement("strong");
    source.className = "player-source";
    source.textContent = item.source === "phone" ? "โทรศัพท์" : item.source === "keyboard2" ? "ลูกศร + Enter" : "WASD + E";
    row.append(name, source);
    localPlayerList.append(row);
  });
  if (!total) {
    const empty = document.createElement("p");
    empty.className = "order-empty";
    empty.textContent = "ยังไม่มีผู้เล่น";
    localPlayerList.append(empty);
  }
  if (total > maxPlayers) setupMessage.textContent = "มีผู้เล่นเกิน 5 คน โปรดปิดช่องคีย์บอร์ดหรือตัดการเชื่อมต่อโทรศัพท์";
  connectedPhones.forEach((controller, phoneIndex) => {
    relaySocket?.emit("local-host:controller-state", {
      playerId: controller.id,
      state: { phase: "lobby", name: controller.name, color: playerColors[keyboardPlayers.length + phoneIndex] }
    });
  });
  relaySocket?.emit("local-host:capacity", { maxControllers: Math.max(0, maxPlayers - keyboardPlayers.length) });
}

function setupLocalGame() {
  mode = "local";
  setupMessage.textContent = "เลือกผู้เล่นอย่างน้อย 2 คนแล้วเริ่มเกมได้ทันที";
  renderLocalSetup();
  showScreen(multiplayerScreen);
}

function loadRelayClient() {
  if (typeof window.io === "function") return Promise.resolve(window.io);
  if (relayLoader) return relayLoader;
  if (location.protocol === "file:") return Promise.reject(new Error("ต้องเปิดผ่าน local server เพื่อเชื่อมโทรศัพท์"));
  relayLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/socket.io/socket.io.js";
    script.onload = () => typeof window.io === "function" ? resolve(window.io) : reject(new Error("ไม่พบ Socket.IO"));
    script.onerror = () => reject(new Error("ไม่พบ local controller server"));
    document.head.append(script);
  });
  return relayLoader;
}

function socketAck(event, payload) {
  return new Promise((resolve) => relaySocket.emit(event, payload, resolve));
}

function applyPhoneRoster(roster) {
  phoneControllers = roster;
  if (gameRunning && mode === "local") {
    const rosterById = new Map(roster.map((item) => [item.id, item]));
    players.filter((player) => player.source === "phone").forEach((player) => {
      const controller = rosterById.get(player.id);
      if (!controller) {
        player.elements.group.remove();
        players = players.filter((item) => item !== player);
      } else {
        player.connected = controller.connected;
        player.input = controller.connected ? player.input : { left: false, right: false, up: false, down: false };
        player.elements.group.setAttribute("opacity", controller.connected ? "1" : ".45");
      }
    });
    renderRiceChoices();
  }
  renderLocalSetup();
}

function renderJoinOption() {
  const option = joinOptions[Number(lanAddress.value) || 0];
  if (!option) return;
  controllerQr.src = option.qrDataUrl;
  controllerUrl.href = option.url;
  controllerUrl.textContent = option.url;
}

async function connectPhoneRelay() {
  connectPhonesButton.disabled = true;
  setupMessage.textContent = "กำลังเปิดห้องสำหรับโทรศัพท์...";
  try {
    const ioFactory = await loadRelayClient();
    if (!relaySocket) {
      relaySocket = ioFactory({ timeout: 4000 });
      await new Promise((resolve, reject) => {
        if (relaySocket.connected) return resolve();
        relaySocket.once("connect", resolve);
        relaySocket.once("connect_error", reject);
      });
      relaySocket.on("local-host:roster", applyPhoneRoster);
      relaySocket.on("local-host:input", ({ playerId, input }) => {
        const player = players.find((item) => item.id === playerId && item.source === "phone");
        if (player) player.input = input;
      });
      relaySocket.on("local-host:action", ({ playerId, action }) => {
        const player = players.find((item) => item.id === playerId && item.source === "phone");
        if (!player) return;
        if (action === "interact") interactPlayer(player);
        else if (action === "rice-steamed") chooseRice(player, "steamed");
        else if (action === "rice-sticky") chooseRice(player, "sticky");
        else if (action === "rice-cancel") cancelRiceChoice(player);
      });
      relaySocket.on("disconnect", () => {
        phoneControllers = phoneControllers.map((item) => ({ ...item, connected: false }));
        setupMessage.textContent = "การเชื่อมต่อ local server ขาดหาย ผู้เล่นคีย์บอร์ดยังเล่นต่อได้";
        applyPhoneRoster(phoneControllers);
      });
    }
    const result = await socketAck("local-host:create", {});
    if (result?.error) throw new Error(result.error);
    localSession = result.sessionCode;
    joinOptions = result.joinOptions || [];
    lanAddress.replaceChildren(...joinOptions.map((option, index) => {
      const element = document.createElement("option");
      element.value = `${index}`;
      element.textContent = option.url;
      return element;
    }));
    localSessionCode.textContent = localSession;
    phoneJoinPanel.hidden = false;
    renderJoinOption();
    renderLocalSetup();
    setupMessage.textContent = "ให้โทรศัพท์สแกน QR แล้วใส่ชื่อเพื่อเข้าร่วม";
  } catch (error) {
    setupMessage.textContent = `${error.message} — ใช้คีย์บอร์ดสองคนได้โดยไม่ต้องเปิด server`;
  } finally {
    connectPhonesButton.disabled = false;
  }
}

function closeLocalSession() {
  if (relaySocket && localSession) relaySocket.emit("local-host:close");
  localSession = null;
  phoneControllers = [];
  joinOptions = [];
  phoneJoinPanel.hidden = true;
}

function exitGame() {
  stopRoundActivity();
  if (mode === "local") closeLocalSession();
  clearPlayers();
  showScreen(startScreen);
}

function replayGame() {
  if (mode === "solo") {
    startSoloGame();
    return;
  }
  stopRoundActivity();
  clearPlayers();
  relaySocket?.emit("local-host:phase", { phase: "lobby" });
  setupMessage.textContent = "ทีมเดิมพร้อมแล้ว ปรับผู้เล่นหรือเริ่มรอบใหม่ได้เลย";
  renderLocalSetup();
  showScreen(multiplayerScreen);
}

function releaseTouchDirection(button) {
  keys.delete(`touch-${button.dataset.direction}`);
  button.classList.remove("pressed");
}

function releaseAllInputs() {
  keys.clear();
  directionButtons.forEach((button) => button.classList.remove("pressed"));
}

function playerForControlKey(key) {
  if (mode === "solo") return key === "e" ? players[0] : null;
  return players.find((player) => player.source.startsWith("keyboard") && keyboardControls[player.source].interact === key);
}

function handleRiceNavigation(key) {
  const player = players.find((item) => {
    if (!item.riceChoice || !item.source.startsWith("keyboard")) return false;
    const controls = keyboardControls[item.source];
    return key === controls.left || key === controls.right;
  });
  if (!player) return false;
  player.riceChoice.selected = player.riceChoice.selected === "steamed" ? "sticky" : "steamed";
  renderRiceChoices();
  return true;
}

function blockGamePageCopy(event) {
  if (gameScreen.contains(event.target)) event.preventDefault();
}

playButton.addEventListener("click", startSoloGame);
multiplayerButton.addEventListener("click", setupLocalGame);
startLocalButton.addEventListener("click", startLocalGame);
connectPhonesButton.addEventListener("click", connectPhoneRelay);
backButton.addEventListener("click", () => { closeLocalSession(); showScreen(startScreen); });
playAgainButton.addEventListener("click", replayGame);
resultsButton.addEventListener("click", exitGame);
exitGameButton.addEventListener("click", exitGame);
fullscreenButton.addEventListener("click", toggleFullscreen);
lanAddress.addEventListener("change", renderJoinOption);
[keyboard1Enabled, keyboard2Enabled].forEach((input) => input.addEventListener("change", renderLocalSetup));
[keyboard1Name, keyboard2Name].forEach((input) => input.addEventListener("input", renderLocalSetup));
mobileInteractButton.addEventListener("click", () => interactPlayer(players[0]));
directionButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    keys.add(`touch-${button.dataset.direction}`);
    button.classList.add("pressed");
    try { button.setPointerCapture?.(event.pointerId); } catch (error) { /* Synthetic or cancelled pointers have no active capture. */ }
  });
  button.addEventListener("pointerup", (event) => { event.preventDefault(); releaseTouchDirection(button); });
  button.addEventListener("pointercancel", () => releaseTouchDirection(button));
  button.addEventListener("lostpointercapture", () => releaseTouchDirection(button));
});
soundToggles.forEach((toggle) => toggle.addEventListener("click", () => { soundEnabled = !soundEnabled; updateSound(); }));

window.addEventListener("pointerdown", () => {
  if (!startScreen.hidden) syncLobbyMusic(true);
  if (!gameScreen.hidden) syncGameMusic(true);
});
window.addEventListener("keydown", (event) => {
  if (!startScreen.hidden) syncLobbyMusic(true);
  if (!gameScreen.hidden) syncGameMusic(true);
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "enter"].includes(key) && !gameScreen.hidden) event.preventDefault();
  if (!gameRunning) return;
  if (key === "escape") {
    players.filter((player) => player.riceChoice).forEach(cancelRiceChoice);
    return;
  }
  if (handleRiceNavigation(key)) return;
  const player = playerForControlKey(key);
  if (player && !event.repeat) {
    interactPlayer(player);
    return;
  }
  keys.add(key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", releaseAllInputs);
window.addEventListener("copy", blockGamePageCopy);
window.addEventListener("cut", blockGamePageCopy);
window.addEventListener("contextmenu", blockGamePageCopy);
document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("webkitfullscreenchange", updateFullscreenButton);

renderLocalSetup();
showScreen(startScreen);
