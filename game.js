const startScreen = document.querySelector("#start-screen");
const multiplayerScreen = document.querySelector("#multiplayer-screen");
const lobbyScreen = document.querySelector("#lobby-screen");
const gameScreen = document.querySelector("#game-screen");
const resultsScreen = document.querySelector("#results-screen");
const playButton = document.querySelector("#play-button");
const multiplayerButton = document.querySelector("#multiplayer-button");
const backButton = document.querySelector("#back-button");
const createRoomButton = document.querySelector("#create-room-button");
const joinRoomButton = document.querySelector("#join-room-button");
const readyButton = document.querySelector("#ready-button");
const startRoundButton = document.querySelector("#start-round-button");
const leaveRoomButton = document.querySelector("#leave-room-button");
const playAgainButton = document.querySelector("#play-again-button");
const resultsButton = document.querySelector("#results-button");
const fullscreenButton = document.querySelector("#fullscreen-button");
const mobileInteractButton = document.querySelector("#mobile-interact-button");
const directionButtons = [...document.querySelectorAll("[data-direction]")];
const soundToggles = [...document.querySelectorAll(".sound-toggle")];
const exitGameButton = document.querySelector("#exit-game-button");
const riceChooser = document.querySelector("#rice-chooser");
const riceOptionButtons = [...document.querySelectorAll("[data-rice]")];
const closeRiceChooserButton = document.querySelector("#close-rice-chooser");
const playerNameInput = document.querySelector("#player-name");
const roomCodeInput = document.querySelector("#room-code");
const setupMessage = document.querySelector("#setup-message");
const lobbyMessage = document.querySelector("#lobby-message");
const roomCodeLabel = document.querySelector("#room-code-label");
const playerList = document.querySelector("#player-list");
const resultsList = document.querySelector("#results-list");
const resultsScore = document.querySelector("#results-score");
const player = document.querySelector("#player");
const playerSprite = document.querySelector("#player-sprite");
const otherPlayers = document.querySelector("#other-players");
const cookingStatuses = document.querySelector("#cooking-statuses");
const heldItem = document.querySelector("#held-item");
const heldImages = document.querySelector("#held-images");
const promptElement = document.querySelector("#interaction-prompt");
const timerElement = document.querySelector("#timer");
const scoreElement = document.querySelector("#score");
const orderList = document.querySelector("#order-list");
const message = document.querySelector("#game-message");
const socket = typeof io === "function" ? io() : null;
const walkingSound = new Audio("Sound/walking-for-cartoon.mp3");
walkingSound.loop = true;
walkingSound.preload = "auto";
walkingSound.volume = 0.8;
const lobbyMusic = new Audio("Sound/background-music-lobby.mp3");
lobbyMusic.loop = true;
lobbyMusic.preload = "auto";
lobbyMusic.volume = 0.35;
const gameMusic = new Audio("Sound/background-music-map2.mp3");
gameMusic.loop = true;
gameMusic.preload = "auto";
gameMusic.volume = 0.35;
const cookingData = window.CookingData;
const objects = [...document.querySelectorAll(".object")].map((element) => ({ element, name: element.dataset.object, tool: element.dataset.tool || null, x: Number(element.dataset.x), y: Number(element.dataset.y) }));
const stationLabels = { trash: "ถังขยะ", "pan-1": "กระทะ 1", "pan-2": "กระทะ 2", "pot-1": "หม้อ 1", "pot-2": "หม้อ 2", grill: "เตาย่าง", rice: "ข้าว", meat: "เนื้อ", vegetable: "ผัก", egg: "ไข่", sauce: "ซอส", plate: "จาน", serve: "จุดเสิร์ฟ" };
objects.forEach(({ element, name }) => {
  const label = element.querySelector(".object-label");
  if (label && stationLabels[name]) label.textContent = stationLabels[name];
});
const menus = cookingData.menus;
const toolLabels = { pot: "หม้อ", pan: "กระทะ", grill: "เตาย่าง" };
const cookingStationTools = new Map(objects.filter((object) => object.tool).map((object) => [object.name, object.tool]));
const standalonePickupItems = { meat: "meat", vegetable: "vegetable", egg: "egg", sauce: "sauce" };
const maxOrders = 2;
const orderLifetime = 60000;
const roundDurationSeconds = 120;
const playerState = { x: 500, y: 350, speed: 4.5, radius: 32 };
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
const keys = new Set();
let score = 0;
let secondsLeft = roundDurationSeconds;
let orders = [];
let inventory = null;
let assemblyPlate = null;
let cooking = false;
let timerId;
let orderTimerId;
let orderGenerationId;
let animationId;
let cookingTimeoutId;
let cookingAnimationId;
let cookingStartedAt;
let cookingTool;
let cookingMenu;
let soloStations = createEmptyCookingStations();
let orderSequence = 0;
let gameRunning = false;
let mode = "solo";
let roomState;
let selfId;
let fullscreenFallback = false;
let playerDirection = "down";
let lastSpriteKey = "";
let soundEnabled = true;
let multiplayerInput = { left: false, right: false, up: false, down: false };
const multiplayerSpeed = 150;
const authoritativePosition = { x: 500, y: 350 };
const predictedPosition = { x: 500, y: 350 };
const remoteTargets = new Map();
const remoteRendered = new Map();
const remoteElements = new Map();
let multiplayerFrameAt;
let remoteFrameAt;
let remoteAnimationId;

function createEmptyCookingStations() {
  return Object.fromEntries([...cookingStationTools.keys()].map((stationId) => [stationId, null]));
}

function updateMultiplayerInput() {
  multiplayerInput = {
    left: keys.has("arrowleft") || keys.has("a") || keys.has("touch-left"),
    right: keys.has("arrowright") || keys.has("d") || keys.has("touch-right"),
    up: keys.has("arrowup") || keys.has("w") || keys.has("touch-up"),
    down: keys.has("arrowdown") || keys.has("s") || keys.has("touch-down")
  };
}

function interact() {
  if (mode === "multiplayer" && gameRunning) {
    const nearest = nearestObject();
    if (nearest.object) socket?.emit("interact", { station: nearest.object.name });
  } else if (mode === "solo" && gameRunning) {
    soloInteract();
  }
}

function setMovementHint() {
  setMessage(window.matchMedia("(pointer: coarse)").matches ? "ใช้ปุ่มสัมผัสเพื่อเดินและโต้ตอบ" : "ใช้ WASD หรือลูกศรเพื่อเดิน");
}

function releaseTouchDirection(button) {
  const direction = button.dataset.direction;
  keys.delete(`touch-${direction}`);
  button.classList.remove("pressed");
  updateMultiplayerInput();
  sendInput();
}

function pressTouchDirection(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const direction = button.dataset.direction;
  keys.add(`touch-${direction}`);
  button.classList.add("pressed");
  button.setPointerCapture?.(event.pointerId);
  updateMultiplayerInput();
  sendInput();
}

function releaseAllTouchDirections() {
  directionButtons.forEach((button) => releaseTouchDirection(button));
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

function clearFullscreenFallback() {
  fullscreenFallback = false;
  gameScreen.classList.remove("fullscreen-fallback");
  updateFullscreenButton();
}

function exitNativeFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitFullscreenElement && document.webkitExitFullscreen) return document.webkitExitFullscreen();
  return null;
}

function clearFullscreenPresentation() {
  clearFullscreenFallback();
  if (getFullscreenElement()) exitNativeFullscreen();
}

function requestLandscapeLock() {
  if (screen.orientation?.lock) screen.orientation.lock("landscape").catch(() => {});
}

async function enterFullscreen() {
  try {
    if (gameScreen.requestFullscreen) {
      await gameScreen.requestFullscreen({ navigationUI: "hide" });
    } else if (gameScreen.webkitRequestFullscreen) {
      await gameScreen.webkitRequestFullscreen();
    } else {
      throw new Error("ไม่รองรับโหมดเต็มจอ");
    }
    fullscreenFallback = false;
    gameScreen.classList.remove("fullscreen-fallback");
    requestLandscapeLock();
  } catch (error) {
    fullscreenFallback = true;
    gameScreen.classList.add("fullscreen-fallback");
    setMessage("ไม่รองรับโหมดเต็มจอ จึงเปิดมุมมองแนวนอนแบบขยายแทน");
  }
  updateFullscreenButton();
}

function toggleFullscreen() {
  if (getFullscreenElement() || fullscreenFallback) {
    if (getFullscreenElement()) exitNativeFullscreen();
    clearFullscreenFallback();
    return;
  }
  enterFullscreen();
}

function showScreen(screen) {
  [startScreen, multiplayerScreen, lobbyScreen, gameScreen, resultsScreen].forEach((item) => { item.hidden = item !== screen; });
  if (screen !== gameScreen) clearFullscreenPresentation();
  if (screen !== gameScreen) riceChooser.hidden = true;
  if (screen !== gameScreen) syncWalkingSound(false);
  syncLobbyMusic(screen === startScreen);
  syncGameMusic(screen === gameScreen);
}

function syncLobbyMusic(active) {
  if (active) {
    if (lobbyMusic.paused) lobbyMusic.play().catch(() => {});
    return;
  }
  lobbyMusic.pause();
  lobbyMusic.currentTime = 0;
}

function syncGameMusic(active) {
  if (active) {
    if (gameMusic.paused) gameMusic.play().catch(() => {});
    return;
  }
  gameMusic.pause();
  gameMusic.currentTime = 0;
}

function updateSound() {
  lobbyMusic.muted = !soundEnabled;
  gameMusic.muted = !soundEnabled;
  soundToggles.forEach((soundToggle) => {
    soundToggle.textContent = soundEnabled ? "🎵 เพลง" : "🔇 ปิดเพลง";
    soundToggle.setAttribute("aria-pressed", `${!soundEnabled}`);
    soundToggle.setAttribute("aria-label", soundEnabled ? "ปิดเพลง" : "เปิดเพลง");
  });
  if (soundEnabled && !startScreen.hidden) syncLobbyMusic(true);
  if (soundEnabled && !gameScreen.hidden) syncGameMusic(true);
}

function syncWalkingSound(moving) {
  if (moving && gameRunning) {
    if (walkingSound.paused) walkingSound.play().catch(() => {});
    return;
  }
  walkingSound.pause();
  walkingSound.currentTime = 0;
}

function setPlayerPosition() {
  player.setAttribute("transform", `translate(${playerState.x} ${playerState.y})`);
}

function updatePlayerSprite(dx = 0, dy = 0, moving = false, timestamp = performance.now()) {
  if (moving) {
    if (Math.abs(dx) >= Math.abs(dy)) playerDirection = dx < 0 ? "left" : "right";
    else playerDirection = dy < 0 ? "up" : "down";
  }

  const sprites = playerSprites[playerDirection];
  const frameIndex = moving ? Math.floor(timestamp / 140) % sprites.length : 0;
  const sprite = sprites[frameIndex];
  const spriteKey = `${playerDirection}-${frameIndex}`;
  if (spriteKey === lastSpriteKey) return;

  playerSprite.setAttribute("href", sprite.href);
  playerSprite.setAttribute("x", `${-sprite.width / 2}`);
  playerSprite.setAttribute("y", `${30 - sprite.height}`);
  playerSprite.setAttribute("width", `${sprite.width}`);
  playerSprite.setAttribute("height", `${sprite.height}`);
  lastSpriteKey = spriteKey;
}

function hideCookingStatus() {
  window.cancelAnimationFrame(cookingAnimationId);
  cookingStatuses.replaceChildren();
  cookingTool = null;
}

function renderCookingStatuses(stations = soloStations, ownerId = selfId) {
  cookingStatuses.replaceChildren();
  Object.entries(stations || {}).forEach(([stationId, station]) => {
    if (!station) return;
    const object = objects.find((item) => item.name === stationId);
    if (!object) return;
    const tool = object.tool;
    const stationLabel = stationLabels[stationId] || toolLabels[tool];
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("transform", `translate(${object.x} ${object.y})`);
    group.setAttribute("class", "cooking-status-group");
    const card = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    card.setAttribute("x", "-53"); card.setAttribute("y", station.phase === "staging" ? "-154" : "-128"); card.setAttribute("width", "106"); card.setAttribute("height", station.phase === "staging" ? "68" : "42"); card.setAttribute("rx", "14"); card.setAttribute("class", "cooking-status-card");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", "0"); label.setAttribute("y", station.phase === "staging" ? "-136" : "-111"); label.setAttribute("class", "cooking-status-label");
    if (station.phase === "staging") {
      const ready = Boolean(cookingData.findExactTransformation(tool, station.inputs));
      label.textContent = ready ? "พร้อมเริ่ม • กด E" : "รอวัตถุดิบเพิ่ม";
      const iconSize = 22;
      const gap = 4;
      const totalWidth = station.inputs.length * iconSize + Math.max(0, station.inputs.length - 1) * gap;
      station.inputs.forEach((ingredientId, index) => {
        const centerX = -totalWidth / 2 + iconSize / 2 + index * (iconSize + gap);
        const background = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        background.setAttribute("cx", `${centerX}`); background.setAttribute("cy", "-112"); background.setAttribute("r", "12"); background.setAttribute("class", "station-ingredient-background");
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttribute("href", cookingData.ingredients[ingredientId]?.images[0] || cookingData.assets.plate);
        image.setAttribute("x", `${centerX - iconSize / 2}`); image.setAttribute("y", "-123"); image.setAttribute("width", `${iconSize}`); image.setAttribute("height", `${iconSize}`);
        image.setAttribute("preserveAspectRatio", "xMidYMid slice"); image.setAttribute("class", "station-ingredient-image");
        group.append(background, image);
      });
      group.setAttribute("aria-label", `${stationLabel}: ${station.inputs.map((ingredientId) => cookingData.ingredients[ingredientId]?.name).join(" + ")} — ${label.textContent}`);
      group.prepend(card, label);
      cookingStatuses.append(group);
      return;
    }
    const progressTrack = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    progressTrack.setAttribute("x", "-53"); progressTrack.setAttribute("y", "-103"); progressTrack.setAttribute("width", "106"); progressTrack.setAttribute("height", "8"); progressTrack.setAttribute("rx", "4"); progressTrack.setAttribute("class", "cooking-progress-track");
    const progressFill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    progressFill.setAttribute("x", "-53"); progressFill.setAttribute("y", "-103"); progressFill.setAttribute("height", "8"); progressFill.setAttribute("rx", "4"); progressFill.setAttribute("class", "cooking-progress-fill");
    const progress = station.phase === "ready" ? 1 : station.phase === "cooking" ? Math.min(1, (Date.now() - station.startedAt) / 2000) : 0;
    progressFill.setAttribute("width", `${106 * progress}`);
    const mine = station.playerId === ownerId;
    if (station.phase === "ready") label.textContent = mine ? "พร้อมใส่จาน" : "อาหารพร้อม";
    else label.textContent = mine ? "กำลังทำ" : "กำลังใช้งาน";
    group.append(card, label, progressTrack, progressFill);
    cookingStatuses.append(group);
  });
}

function animateCooking() {
  if (!Object.values(soloStations).some((station) => station?.phase === "cooking")) return;
  renderCookingStatuses(soloStations, "solo");
  cookingAnimationId = window.requestAnimationFrame(animateCooking);
}

function setHeldImages(images) {
  heldImages.replaceChildren();
  if (!images.length) {
    heldItem.setAttribute("opacity", "0");
    return;
  }
  heldItem.setAttribute("opacity", "1");
  images.slice(0, 6).forEach((href, index) => {
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    const offset = Math.min(index, 3) * 7;
    image.setAttribute("href", href);
    image.setAttribute("x", `${-13 + offset}`);
    image.setAttribute("y", `${-13 - offset}`);
    image.setAttribute("width", "26"); image.setAttribute("height", "26");
    image.setAttribute("preserveAspectRatio", "xMidYMid slice");
    image.setAttribute("clip-path", "url(#held-image-clip)");
    image.setAttribute("class", "held-food-image");
    image.setAttribute("opacity", `${index === 0 ? 1 : 0.5}`);
    heldImages.append(image);
  });
}

function updateHeldItem() {
  setHeldImages(cookingData.getInventoryImages(inventory || assemblyPlate));
}

function nearestObject() {
  return objects.reduce((nearest, object) => {
    const distance = Math.hypot(playerState.x - object.x, playerState.y - object.y);
    return distance < nearest.distance ? { object, distance } : nearest;
  }, { object: null, distance: Infinity });
}

function setMessage(text) {
  message.textContent = text;
}

function blockGamePageCopy(event) {
  if (gameScreen.contains(event.target)) event.preventDefault();
}

function updateOrder() {
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
    const menu = menus.find((item) => item.id === order.menuId) || menus.find((item) => item.name === order.name);
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
  orders.push({ id: `solo-${createdAt}-${orderSequence++}`, menuId: menu.id, name: menu.name, createdAt, expiresAt: createdAt + orderLifetime });
  updateOrder();
  return true;
}

function expireOrders() {
  const now = Date.now();
  const remaining = orders.filter((order) => order.expiresAt > now);
  if (remaining.length !== orders.length) {
    orders = remaining;
    updateOrder();
    setMessage("ลูกค้ากลับไปแล้ว ออเดอร์ที่เหลือยังรออยู่");
  }
}

function clearInventory() {
  inventory = null;
  assemblyPlate = null;
  cooking = false;
  window.clearTimeout(cookingTimeoutId);
  Object.values(soloStations).forEach((station) => window.clearTimeout(station?.timeoutId));
  soloStations = createEmptyCookingStations();
  hideCookingStatus();
  updateHeldItem();
}

function updatePrompt() {
  const nearest = nearestObject();
  const close = nearest.object && nearest.distance < playerState.radius + 72;
  if (!close) {
    promptElement.setAttribute("opacity", "0");
    return;
  }
  promptElement.setAttribute("transform", `translate(${nearest.object.x} ${nearest.object.y - 95})`);
  promptElement.setAttribute("opacity", "1");
  const labels = { rice: "เลือกข้าว", meat: "เก็บเนื้อ", vegetable: "เก็บผัก", egg: "เก็บไข่", sauce: "เก็บซอส", plate: "หยิบจาน", trash: "ทิ้งของที่ถืออยู่", serve: "เสิร์ฟอาหาร" };
  const action = nearest.object.tool ? `ปรุงด้วย${stationLabels[nearest.object.name]}` : labels[nearest.object.name];
  setMessage(`กด E เพื่อ${action}`);
}

function cook(stationId) {
  const tool = cookingStationTools.get(stationId);
  const stationLabel = stationLabels[stationId];
  const station = soloStations[stationId];
  if (!station || station.phase !== "staging") return setMessage(`ใส่วัตถุดิบใน${stationLabel}ก่อน`);
  const transformation = cookingData.findExactTransformation(tool, station.inputs);
  if (!transformation) return setMessage("วัตถุดิบยังไม่ครบสูตร");
  station.phase = "cooking";
  station.playerId = "solo";
  station.transformation = transformation;
  station.startedAt = Date.now();
  cooking = true;
  cookingTool = stationId;
  cookingStartedAt = performance.now();
  renderCookingStatuses(soloStations, "solo");
  window.cancelAnimationFrame(cookingAnimationId);
  cookingAnimationId = window.requestAnimationFrame(animateCooking);
  setMessage(`กำลังปรุงด้วย${stationLabel}... 2 วินาที`);
  station.timeoutId = window.setTimeout(() => {
    const currentStation = soloStations[stationId];
    if (!currentStation || currentStation.phase !== "cooking") return;
    currentStation.output = transformation.output;
    currentStation.phase = "ready";
    cooking = Object.values(soloStations).some((item) => item?.phase === "cooking");
    renderCookingStatuses(soloStations, "solo");
    setMessage("ปรุงเสร็จแล้ว นำจานมารับที่" + stationLabel);
    updatePrompt();
  }, 2000);
}

function soloInteract() {
  const nearest = nearestObject();
  if (!nearest.object || nearest.distance >= playerState.radius + 72) return setMessage("เดินเข้าใกล้สถานีก่อน");
  const name = nearest.object.name;
  if (name === "trash") {
    if (!inventory && !assemblyPlate) return setMessage("ไม่มีอะไรให้ทิ้ง");
    if (inventory) inventory = null;
    else assemblyPlate = null;
    updateHeldItem();
    setMessage("ทิ้งของที่ถืออยู่แล้ว");
    return;
  }
  if (name === "rice") {
    if (inventory) return setMessage("มือของคุณไม่ว่าง");
    if (assemblyPlate?.dishId || assemblyPlate?.invalid) return setMessage("จานนี้ใช้ต่อไม่ได้ นำไปทิ้งก่อน");
    riceChooser.hidden = false;
    return;
  }
  if (name === "plate") {
    if (assemblyPlate) return setMessage("คุณมีจานสำหรับประกอบอาหารอยู่แล้ว");
    assemblyPlate = cookingData.createPlate();
    updateHeldItem();
    setMessage("หยิบจานแล้ว นำไปรับข้าวหรืออาหารที่ปรุงเสร็จ");
    return;
  }
  if (standalonePickupItems[name]) {
    if (inventory) return setMessage("มือของคุณไม่ว่าง");
    inventory = cookingData.createIngredient(standalonePickupItems[name]);
    updateHeldItem();
    setMessage(`หยิบ${stationLabels[name]}แล้ว นำไปใส่สถานีทำอาหาร`);
    return;
  }
  if (cookingStationTools.has(name)) {
    const tool = cookingStationTools.get(name);
    const stationLabel = stationLabels[name];
    const station = soloStations[name];
    if (station?.phase === "ready") {
      if (inventory) return setMessage("มือของคุณไม่ว่าง");
      if (!assemblyPlate) return setMessage("หยิบจานมารับอาหารที่ปรุงเสร็จ");
      const nextPlate = cookingData.appendIngredient(assemblyPlate, station.output);
      if (!nextPlate) return setMessage("จานนี้รับส่วนผสมเพิ่มไม่ได้");
      assemblyPlate = nextPlate;
      soloStations[name] = null;
      updateHeldItem();
      renderCookingStatuses(soloStations, "solo");
      setMessage(assemblyPlate.dishId ? "ประกอบเมนูสำเร็จแล้ว นำไปเสิร์ฟ" : "ใส่อาหารที่ปรุงแล้วลงจาน");
    } else if (station?.phase === "cooking") setMessage(`${stationLabel}กำลังทำงานอยู่`);
    else if (inventory?.kind === "ingredient") {
      const inputs = [...(station?.inputs || []), inventory.ingredientId];
      if (!cookingData.canStageIngredients(tool, inputs)) return setMessage(`วัตถุดิบนี้ใช้ร่วมกับของใน${stationLabel}ไม่ได้`);
      soloStations[name] = { phase: "staging", inputs };
      inventory = null;
      updateHeldItem();
      renderCookingStatuses(soloStations, "solo");
      const ready = Boolean(cookingData.findExactTransformation(tool, inputs));
      setMessage(ready ? `วัตถุดิบใน${stationLabel}พร้อมแล้ว กด E มือเปล่าเพื่อเริ่มปรุง หรือใส่วัตถุดิบเพิ่ม` : `ใส่วัตถุดิบใน${stationLabel}แล้ว ต้องเพิ่มวัตถุดิบให้ครบสูตร`);
    } else if (!inventory) cook(name);
    else setMessage("ต้องถือวัตถุดิบเพื่อใส่สถานี หรือถือจานเพื่อรับอาหาร");
    return;
  }
  const menu = assemblyPlate?.dishId ? menus.find((item) => item.id === assemblyPlate.dishId) : null;
  const matchingOrder = orders.find((order) => order.menuId === menu?.id || order.name === menu?.name);
  if (matchingOrder) {
    orders = orders.filter((order) => order.id !== matchingOrder.id);
    score += 1;
    scoreElement.textContent = score;
    assemblyPlate = null;
    updateHeldItem();
    updateOrder();
    setMessage("เสิร์ฟออเดอร์แล้ว มีลูกค้ารอออเดอร์ใหม่");
  } else if (Object.values(soloStations).some((station) => station?.phase === "cooking")) setMessage("อาหารยังทำไม่เสร็จ");
  else if (assemblyPlate?.dishId) setMessage("ไม่มีลูกค้ารอเมนูนี้");
  else setMessage("ทำอาหารก่อนนำไปเสิร์ฟ");
}

function moveSolo() {
  if (!gameRunning || mode !== "solo") {
    syncWalkingSound(false);
    return;
  }
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a") || keys.has("touch-left")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d") || keys.has("touch-right")) dx += 1;
  if (keys.has("arrowup") || keys.has("w") || keys.has("touch-up")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s") || keys.has("touch-down")) dy += 1;
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    playerState.x = Math.max(65, Math.min(935, playerState.x + (dx / length) * playerState.speed));
    playerState.y = Math.max(105, Math.min(555, playerState.y + (dy / length) * playerState.speed));
    setPlayerPosition();
    renderCookingStatuses(soloStations, "solo");
    updatePrompt();
  }
  syncWalkingSound(Boolean(dx || dy));
  updatePlayerSprite(dx, dy, Boolean(dx || dy));
  animationId = requestAnimationFrame(moveSolo);
}

function moveMultiplayer(timestamp) {
  if (!gameRunning || mode !== "multiplayer") {
    animationId = null;
    multiplayerFrameAt = undefined;
    return;
  }
  const delta = multiplayerFrameAt ? Math.min((timestamp - multiplayerFrameAt) / 1000, 0.05) : 0;
  multiplayerFrameAt = timestamp;
  let dx = (multiplayerInput.right ? 1 : 0) - (multiplayerInput.left ? 1 : 0);
  let dy = (multiplayerInput.down ? 1 : 0) - (multiplayerInput.up ? 1 : 0);
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    predictedPosition.x = Math.max(65, Math.min(935, predictedPosition.x + (dx / length) * multiplayerSpeed * delta));
    predictedPosition.y = Math.max(105, Math.min(555, predictedPosition.y + (dy / length) * multiplayerSpeed * delta));
  }

  const correctionX = authoritativePosition.x - predictedPosition.x;
  const correctionY = authoritativePosition.y - predictedPosition.y;
  const correctionDistance = Math.hypot(correctionX, correctionY);
  if (correctionDistance > 60) {
    predictedPosition.x = authoritativePosition.x;
    predictedPosition.y = authoritativePosition.y;
  } else if (correctionDistance > 8) {
    const correction = 1 - Math.exp(-10 * delta);
    predictedPosition.x += correctionX * correction;
    predictedPosition.y += correctionY * correction;
  }

  playerState.x = predictedPosition.x;
  playerState.y = predictedPosition.y;
  setPlayerPosition();
  renderCookingStatuses(soloStations, "solo");
  updatePrompt();
  animationId = requestAnimationFrame(moveMultiplayer);
}

function stopMultiplayerAnimation() {
  cancelAnimationFrame(animationId);
  animationId = null;
  multiplayerFrameAt = undefined;
  cancelAnimationFrame(remoteAnimationId);
  remoteAnimationId = null;
  remoteFrameAt = undefined;
}

function endSoloGame() {
  gameRunning = false;
  syncWalkingSound(false);
  syncGameMusic(false);
  clearInventory();
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(orderTimerId);
  clearInterval(orderGenerationId);
  window.setTimeout(() => showSoloResults(), 700);
}

function exitGame() {
  gameRunning = false;
  keys.clear();
  multiplayerInput = { left: false, right: false, up: false, down: false };
  syncWalkingSound(false);
  clearInventory();
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(orderTimerId);
  if (mode === "multiplayer") socket?.emit("leave-room");
  roomState = null;
  otherPlayers.replaceChildren();
  showScreen(startScreen);
}

function startSoloGame() {
  mode = "solo";
  stopMultiplayerAnimation();
  clearRemotePlayers();
  roomState = null;
  otherPlayers.replaceChildren();
  showScreen(gameScreen);
  gameRunning = true;
  score = 0;
  secondsLeft = roundDurationSeconds;
  scoreElement.textContent = score;
  timerElement.textContent = secondsLeft;
  timerElement.classList.remove("warning");
  playerState.x = 500;
  playerState.y = 350;
  playerDirection = "down";
  lastSpriteKey = "";
  updatePlayerSprite();
  clearInventory();
  orders = [];
  generateOrder();
  setMovementHint();
  setPlayerPosition();
  renderCookingStatuses(soloStations, "solo");
  updatePrompt();
  clearInterval(timerId);
  clearInterval(orderTimerId);
  clearInterval(orderGenerationId);
  timerId = window.setInterval(() => {
    secondsLeft -= 1;
    timerElement.textContent = secondsLeft;
    if (secondsLeft <= 10) timerElement.classList.add("warning");
    if (secondsLeft <= 0) endSoloGame();
  }, 1000);
  orderTimerId = window.setInterval(() => {
    expireOrders();
    updateOrder();
  }, 1000);
  orderGenerationId = window.setInterval(() => generateOrder(), 7000);
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(moveSolo);
}

function sendInput() {
  if (mode === "multiplayer" && socket) socket.emit("move-input", multiplayerInput);
}

function createRemotePlayer(item) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const held = document.createElementNS("http://www.w3.org/2000/svg", "g");
  held.setAttribute("transform", "translate(0 -56)");
  held.setAttribute("opacity", "0");
  const heldCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  heldCircle.setAttribute("class", "held-item-circle");
  heldCircle.setAttribute("r", "17");
  const heldImagesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  held.append(heldCircle, heldImagesGroup);
  const shadow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  shadow.setAttribute("class", "remote-player-shadow"); shadow.setAttribute("cy", "27"); shadow.setAttribute("r", "23");
  const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  body.setAttribute("class", "remote-player-body"); body.setAttribute("r", "21");
  const face = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  face.setAttribute("class", "remote-player-face"); face.setAttribute("cy", "-4"); face.setAttribute("r", "13");
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("class", "remote-player-label"); label.setAttribute("y", "-32"); label.setAttribute("text-anchor", "middle"); label.textContent = item.name;
  group.append(held, shadow, body, face, label);
  otherPlayers.append(group);
  remoteElements.set(item.id, { group, label, held, heldImagesGroup });
  updateRemoteHeldItem(item);
}

function updateRemoteHeldItem(item) {
  const element = remoteElements.get(item.id);
  if (!element) return;
  element.heldImagesGroup.replaceChildren();
  const images = cookingData.getInventoryImages(item.inventory || item.plate);
  element.held.setAttribute("opacity", images.length ? "1" : "0");
  images.slice(0, 6).forEach((href, index) => {
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    const offset = Math.min(index, 3) * 7;
    image.setAttribute("href", href);
    image.setAttribute("x", `${-13 + offset}`); image.setAttribute("y", `${-13 - offset}`);
    image.setAttribute("width", "26"); image.setAttribute("height", "26");
    image.setAttribute("preserveAspectRatio", "xMidYMid slice");
    image.setAttribute("clip-path", "url(#held-image-clip)");
    image.setAttribute("class", "held-food-image"); image.setAttribute("opacity", `${index ? 0.5 : 1}`);
    element.heldImagesGroup.append(image);
  });
}

function clearRemotePlayers() {
  remoteTargets.clear();
  remoteRendered.clear();
  remoteElements.clear();
  otherPlayers.replaceChildren();
}

function renderRemotePlayers() {
  if (!roomState) return;
  const remotePlayers = roomState.players.filter((item) => item.id !== selfId);
  const remoteIds = new Set(remotePlayers.map((item) => item.id));
  remotePlayers.forEach((item) => {
    remoteTargets.set(item.id, item);
    if (!remoteRendered.has(item.id)) remoteRendered.set(item.id, { x: item.x, y: item.y });
    if (!remoteElements.has(item.id)) createRemotePlayer(item);
    remoteElements.get(item.id).label.textContent = item.name;
    updateRemoteHeldItem(item);
  });
  [...remoteTargets.keys()].forEach((id) => {
    if (remoteIds.has(id)) return;
    remoteTargets.delete(id);
    remoteRendered.delete(id);
    remoteElements.get(id)?.group.remove();
    remoteElements.delete(id);
  });
}

function animateRemotePlayers(timestamp) {
  if (!gameRunning || mode !== "multiplayer") {
    remoteAnimationId = null;
    remoteFrameAt = undefined;
    return;
  }
  const delta = remoteFrameAt ? Math.min((timestamp - remoteFrameAt) / 1000, 0.05) : 0;
  remoteFrameAt = timestamp;
  const interpolation = 1 - Math.exp(-18 * delta);
  remoteTargets.forEach((target, id) => {
    const rendered = remoteRendered.get(id);
    const element = remoteElements.get(id);
    if (!rendered || !element) return;
    rendered.x += (target.x - rendered.x) * interpolation;
    rendered.y += (target.y - rendered.y) * interpolation;
    element.group.setAttribute("transform", `translate(${rendered.x} ${rendered.y})`);
  });
  remoteAnimationId = requestAnimationFrame(animateRemotePlayers);
}

function renderCookingStatus() {
  if (mode !== "multiplayer" || !roomState) return;
  renderCookingStatuses(roomState.stations, selfId);
}

function renderMultiplayerState(state) {
  roomState = state;
  if (state.selfId) selfId = state.selfId;
  const me = state.players.find((item) => item.id === selfId);
  if (me) {
    const dx = me.x - playerState.x;
    const dy = me.y - playerState.y;
    authoritativePosition.x = me.x;
    authoritativePosition.y = me.y;
    if (!gameRunning) {
      predictedPosition.x = me.x;
      predictedPosition.y = me.y;
      playerState.x = me.x;
      playerState.y = me.y;
      setPlayerPosition();
    }
    inventory = me.inventory;
    assemblyPlate = me.plate;
    const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
    updatePlayerSprite(dx, dy, moving, Date.now());
    syncWalkingSound(moving);
    updateHeldItem();
  }
  score = state.score;
  secondsLeft = state.secondsLeft;
  orders = state.orders || [];
  scoreElement.textContent = score;
  timerElement.textContent = secondsLeft;
  timerElement.classList.toggle("warning", secondsLeft <= 10);
  updateOrder();
  renderRemotePlayers();
  renderCookingStatus();
  updatePrompt();
  if (state.status === "lobby") showLobby();
  if (state.status === "playing") {
    if (!gameRunning) {
      gameRunning = true;
      multiplayerFrameAt = undefined;
      remoteFrameAt = undefined;
      animationId = requestAnimationFrame(moveMultiplayer);
      remoteAnimationId = requestAnimationFrame(animateRemotePlayers);
    }
    showScreen(gameScreen);
  }
  if (state.status === "results") {
    stopMultiplayerAnimation();
    showResults(state);
  }
}

function showLobby() {
  showScreen(lobbyScreen);
  roomCodeLabel.textContent = roomState.roomCode;
  playerList.replaceChildren();
  roomState.players.forEach((item) => {
    const row = document.createElement("div");
    row.className = "player-row";
    const name = document.createElement("span");
    name.textContent = item.name;
    if (item.id === roomState.hostId) {
      const host = document.createElement("small");
      host.textContent = " เจ้าของห้อง";
      name.append(host);
    }
    const status = document.createElement("strong");
    status.textContent = item.ready ? "พร้อม" : "รออยู่";
    row.append(name, status);
    playerList.append(row);
  });
  const me = roomState.players.find((item) => item.id === selfId);
  readyButton.textContent = me && me.ready ? "ไม่พร้อม" : "พร้อม";
  startRoundButton.hidden = roomState.hostId !== selfId;
  lobbyMessage.textContent = roomState.players.length < 2 ? "กำลังรอผู้เล่นเพิ่มอย่างน้อยหนึ่งคน" : "ผู้เล่นทุกคนต้องกดพร้อมก่อนเจ้าของห้องจะเริ่มรอบ";
}

function showResults(state) {
  gameRunning = false;
  showScreen(resultsScreen);
  resultsScore.textContent = state.score;
  resultsList.replaceChildren();
  state.players.forEach((item) => {
    const row = document.createElement("div");
    row.className = "player-row";
    const name = document.createElement("span");
    name.textContent = item.name;
    const stats = document.createElement("strong");
    stats.textContent = `เสิร์ฟแล้ว ${item.stats.ordersServed} ออเดอร์`;
    row.append(name, stats);
    resultsList.append(row);
  });
}

function showSoloResults() {
  showScreen(resultsScreen);
  resultsScore.textContent = score;
  resultsList.replaceChildren();
  const row = document.createElement("div");
  row.className = "player-row";
  const name = document.createElement("span");
  name.textContent = "คุณ";
  const stats = document.createElement("strong");
  stats.textContent = `เสิร์ฟแล้ว ${score} ออเดอร์`;
  row.append(name, stats);
  resultsList.append(row);
}

function setupMultiplayer() {
  if (!socket) { setupMessage.textContent = "กรุณาเปิดเกมผ่าน Node server เพื่อใช้โหมดหลายคน"; return; }
  mode = "multiplayer";
  clearRemotePlayers();
  showScreen(multiplayerScreen);
  playerNameInput.focus();
}

function requestRoom(eventName, payload) {
  if (!socket) return;
  setupMessage.textContent = "กำลังเชื่อมต่อกับครัว...";
  socket.emit(eventName, payload, (result) => {
    if (result && result.error) setupMessage.textContent = result.error;
  });
}

playButton.addEventListener("click", startSoloGame);
multiplayerButton.addEventListener("click", setupMultiplayer);
mobileInteractButton.addEventListener("click", interact);
directionButtons.forEach((button) => {
  button.addEventListener("pointerdown", pressTouchDirection);
  button.addEventListener("pointerup", (event) => { event.preventDefault(); releaseTouchDirection(button); });
  button.addEventListener("pointercancel", () => releaseTouchDirection(button));
  button.addEventListener("lostpointercapture", () => releaseTouchDirection(button));
});
backButton.addEventListener("click", () => showScreen(startScreen));
createRoomButton.addEventListener("click", () => requestRoom("create-room", { name: playerNameInput.value }));
joinRoomButton.addEventListener("click", () => requestRoom("join-room", { name: playerNameInput.value, roomCode: roomCodeInput.value }));
readyButton.addEventListener("click", () => socket?.emit("toggle-ready"));
startRoundButton.addEventListener("click", () => socket?.emit("start-round"));
leaveRoomButton.addEventListener("click", () => { socket?.emit("leave-room"); stopMultiplayerAnimation(); clearRemotePlayers(); roomState = null; gameRunning = false; showScreen(startScreen); });
resultsButton.addEventListener("click", () => { socket?.emit("leave-room"); stopMultiplayerAnimation(); clearRemotePlayers(); roomState = null; gameRunning = false; showScreen(startScreen); });
playAgainButton.addEventListener("click", () => {
  if (mode === "solo") {
    startSoloGame();
    return;
  }
  socket?.emit("play-again");
});
fullscreenButton.addEventListener("click", toggleFullscreen);
riceOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const rice = button.dataset.rice;
    if (mode === "multiplayer") {
      socket?.emit("select-rice", { rice });
    } else if (mode === "solo" && gameRunning && !inventory) {
      const ingredientId = rice === "steamed" ? "steamedRice" : "stickyRice";
      if (assemblyPlate) assemblyPlate = cookingData.appendIngredient(assemblyPlate, ingredientId);
      else inventory = cookingData.createIngredient(ingredientId);
      updateHeldItem();
      const action = assemblyPlate ? "ใส่ลงจานแล้ว" : "หยิบแล้ว";
      setMessage(`${rice === "steamed" ? "ข้าวสวย" : "ข้าวเหนียว"}${action}`);
    }
    riceChooser.hidden = true;
  });
});
closeRiceChooserButton.addEventListener("click", () => { riceChooser.hidden = true; });
leaveRoomButton.addEventListener("click", () => { socket?.emit("leave-room"); roomState = null; showScreen(startScreen); });
resultsButton.addEventListener("click", () => { socket?.emit("leave-room"); roomState = null; showScreen(startScreen); });
soundToggles.forEach((soundToggle) => {
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    updateSound();
  });
});
exitGameButton.addEventListener("click", exitGame);

window.addEventListener("pointerdown", () => {
  if (!startScreen.hidden) syncLobbyMusic(true);
  if (!gameScreen.hidden) syncGameMusic(true);
});

window.addEventListener("keydown", (event) => {
  if (!startScreen.hidden) syncLobbyMusic(true);
  if (!gameScreen.hidden) syncGameMusic(true);
  const key = event.key.toLowerCase();
  if (!riceChooser.hidden) {
    if (key === "escape") riceChooser.hidden = true;
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", "e", " "].includes(key)) event.preventDefault();
    return;
  }
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) event.preventDefault();
  if (key === "e") {
    interact();
  }
  keys.add(key);
  updateMultiplayerInput();
  sendInput();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
  updateMultiplayerInput();
  sendInput();
});

window.addEventListener("blur", releaseAllTouchDirections);
window.addEventListener("copy", blockGamePageCopy);
window.addEventListener("cut", blockGamePageCopy);
window.addEventListener("contextmenu", blockGamePageCopy);

if (socket) {
  socket.on("room-state", renderMultiplayerState);
  socket.on("choose-rice", () => { riceChooser.hidden = false; });
  socket.on("game-message", (text) => { setMessage(text); lobbyMessage.textContent = text; setupMessage.textContent = text; });
  socket.on("disconnect", () => { if (mode === "multiplayer") { gameRunning = false; stopMultiplayerAnimation(); clearRemotePlayers(); setupMessage.textContent = "ขาดการเชื่อมต่อกับเซิร์ฟเวอร์ครัว"; showScreen(multiplayerScreen); } });
}

document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("webkitfullscreenchange", updateFullscreenButton);

showScreen(startScreen);
