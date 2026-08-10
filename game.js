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
const cookingStatus = document.querySelector("#cooking-status");
const cookingStatusLabel = document.querySelector("#cooking-status-label");
const cookingProgress = document.querySelector("#cooking-progress");
const heldItem = document.querySelector("#held-item");
const promptElement = document.querySelector("#interaction-prompt");
const timerElement = document.querySelector("#timer");
const scoreElement = document.querySelector("#score");
const orderName = document.querySelector("#order-name");
const orderDetail = document.querySelector("#order-detail");
const orderTimer = document.querySelector("#order-timer");
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
const heldItemIcons = { ingredients: "#held-ingredients", cooking: "#held-cooking", soup: "#held-soup", stirFry: "#held-stir-fry", grilledPork: "#held-grilled-pork", steamedRice: "#held-steamed-rice", stickyRice: "#held-sticky-rice", meat: "#held-meat", vegetable: "#held-vegetable", egg: "#held-egg", sauce: "#held-sauce", plate: "#held-plate" };
const objects = [...document.querySelectorAll(".object")].map((element) => ({ element, name: element.dataset.object, x: Number(element.dataset.x), y: Number(element.dataset.y) }));
const menus = [
  { name: "Garden Soup", tool: "pot", ingredients: "vegetables and herbs" },
  { name: "Sizzling Stir-Fry", tool: "pan", ingredients: "vegetables and sauce" },
  { name: "Grilled Pork Skewers", tool: "grill", ingredients: "pork, bell pepper, and onion" }
];
const cookingTools = new Set(["pot", "pan", "grill"]);
const standalonePickupItems = { meat: "meat", vegetable: "vegetable", egg: "egg", sauce: "sauce", plate: "plate" };
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
let secondsLeft = 60;
let orderSecondsLeft = 15;
let currentOrder;
let inventory = "empty";
let cooking = false;
let timerId;
let orderTimerId;
let animationId;
let cookingTimeoutId;
let cookingAnimationId;
let cookingStartedAt;
let cookingTool;
let gameRunning = false;
let mode = "solo";
let roomState;
let selfId;
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
  setMessage(window.matchMedia("(pointer: coarse)").matches ? "Use the touch controls to move and interact." : "Use WASD or arrow keys to move.");
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

function showScreen(screen) {
  [startScreen, multiplayerScreen, lobbyScreen, gameScreen, resultsScreen].forEach((item) => { item.hidden = item !== screen; });
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
    soundToggle.textContent = soundEnabled ? "🎵 Music" : "🔇 Music Off";
    soundToggle.setAttribute("aria-pressed", `${!soundEnabled}`);
    soundToggle.setAttribute("aria-label", soundEnabled ? "Turn music off" : "Turn music on");
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

function updateCookingStatus(progress, label) {
  cookingProgress.setAttribute("width", `${106 * progress}`);
  cookingStatusLabel.textContent = label;
  cookingStatus.setAttribute("opacity", "1");
}

function hideCookingStatus() {
  window.cancelAnimationFrame(cookingAnimationId);
  cookingStatus.setAttribute("opacity", "0");
  cookingProgress.setAttribute("width", "0");
  cookingStatusLabel.textContent = "COOKING";
  cookingTool = null;
}

function animateCooking() {
  if (!cooking) return;

  const progress = Math.min(1, (performance.now() - cookingStartedAt) / 2000);
  updateCookingStatus(progress, "COOKING");
  if (progress < 1) cookingAnimationId = window.requestAnimationFrame(animateCooking);
}

function positionCookingStatus() {
  if (!cookingTool) return;
  const object = objects.find((item) => item.name === cookingTool);
  if (object) cookingStatus.setAttribute("transform", `translate(${object.x} ${object.y})`);
}

function updateHeldItem() {
  Object.values(heldItemIcons).forEach((selector) => document.querySelector(selector).setAttribute("opacity", "0"));
  let icon = null;
  if (inventory === "ingredients") icon = heldItemIcons.ingredients;
  if (inventory === "cooking") icon = heldItemIcons.cooking;
  if (inventory === `cooked-${menus[0].name}`) icon = heldItemIcons.soup;
  if (inventory === `cooked-${menus[1].name}`) icon = heldItemIcons.stirFry;
  if (inventory === `cooked-${menus[2].name}`) icon = heldItemIcons.grilledPork;
  if (inventory === "rice-steamed") icon = heldItemIcons.steamedRice;
  if (inventory === "rice-sticky") icon = heldItemIcons.stickyRice;
  if (inventory === "item-meat") icon = heldItemIcons.meat;
  if (inventory === "item-vegetable") icon = heldItemIcons.vegetable;
  if (inventory === "item-egg") icon = heldItemIcons.egg;
  if (inventory === "item-sauce") icon = heldItemIcons.sauce;
  if (inventory === "item-plate") icon = heldItemIcons.plate;
  heldItem.setAttribute("opacity", icon ? "1" : "0");
  if (icon) document.querySelector(icon).setAttribute("opacity", "1");
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
  if (!currentOrder) return;
  orderName.textContent = currentOrder.name;
  orderDetail.textContent = `Collect ${currentOrder.ingredients}, cook with the ${currentOrder.tool}, then serve it.`;
  orderTimer.textContent = orderSecondsLeft;
  orderTimer.classList.toggle("warning", orderSecondsLeft <= 5);
}

function generateOrder() {
  currentOrder = menus[Math.floor(Math.random() * menus.length)];
  orderSecondsLeft = 15;
  updateOrder();
}

function clearInventory() {
  inventory = "empty";
  cooking = false;
  window.clearTimeout(cookingTimeoutId);
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
  const labels = { ingredients: "collect ingredients", rice: "choose rice", meat: "collect meat", vegetable: "collect vegetables", egg: "collect an egg", sauce: "collect sauce", plate: "collect a plate", pot: "cook with the pot", pan: "cook with the pan", grill: "cook with the grill", trash: "discard the held item", serve: "serve the menu" };
  setMessage(`Press E to ${labels[nearest.object.name]}.`);
}

function cook(tool) {
  if (cooking) return setMessage("Cooking is already in progress.");
  if (inventory !== "ingredients") return setMessage("Collect the ingredients first.");
  if (currentOrder.tool !== tool) return setMessage(`This order needs the ${currentOrder.tool}, not the ${tool}.`);
  cooking = true;
  inventory = "cooking";
  cookingTool = tool;
  cookingStartedAt = performance.now();
  positionCookingStatus();
  window.cancelAnimationFrame(cookingAnimationId);
  updateCookingStatus(0, "COOKING");
  cookingAnimationId = window.requestAnimationFrame(animateCooking);
  updateHeldItem();
  setMessage(`Cooking with the ${tool}... 2 seconds.`);
  cookingTimeoutId = window.setTimeout(() => {
    cooking = false;
    window.cancelAnimationFrame(cookingAnimationId);
    inventory = "ready";
    updateCookingStatus(1, "READY");
    setMessage(`Your ${currentOrder.name} is ready. Pick it up from the ${cookingTool}.`);
    updatePrompt();
  }, 2000);
}

function soloInteract() {
  const nearest = nearestObject();
  if (!nearest.object || nearest.distance >= playerState.radius + 72) return setMessage("Move closer to a kitchen station first.");
  const name = nearest.object.name;
  if (name === "trash") {
    if (inventory === "empty") return setMessage("There is nothing in your hands to discard.");
    if (inventory === "cooking" || inventory === "ready") return setMessage("That food is still at the cooking station.");
    clearInventory();
    setMessage("Held item discarded.");
    return;
  }
  if (name === "rice") {
    if (inventory !== "empty") return setMessage("Your hands are already full.");
    riceChooser.hidden = false;
    return;
  }
  if (standalonePickupItems[name]) {
    if (inventory !== "empty") return setMessage("Your hands are already full.");
    inventory = `item-${standalonePickupItems[name]}`;
    updateHeldItem();
    setMessage(`${standalonePickupItems[name]} collected.`);
    return;
  }
  if (name === "ingredients") {
    if (inventory === "empty") { inventory = "ingredients"; updateHeldItem(); setMessage(`${currentOrder.ingredients} collected. Take them to the ${currentOrder.tool}.`); }
    else setMessage("Your hands are already full.");
    return;
  }
  if (cookingTools.has(name)) {
    if (inventory === "ready") {
      if (name === cookingTool) { inventory = `cooked-${currentOrder.name}`; hideCookingStatus(); updateHeldItem(); setMessage(`You picked up the ${currentOrder.name}. Take it to the serve point.`); }
      else setMessage(`Your menu is ready at the ${cookingTool}.`);
    } else cook(name);
    return;
  }
  if (inventory === `cooked-${currentOrder.name}`) { score += 1; scoreElement.textContent = score; clearInventory(); generateOrder(); setMessage("Order served! A new customer is waiting."); }
  else if (inventory === "cooking") setMessage("The food is still cooking.");
  else setMessage("Cook the ordered menu before serving it.");
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
    positionCookingStatus();
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
  positionCookingStatus();
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
  secondsLeft = 60;
  scoreElement.textContent = score;
  timerElement.textContent = secondsLeft;
  timerElement.classList.remove("warning");
  playerState.x = 500;
  playerState.y = 350;
  playerDirection = "down";
  lastSpriteKey = "";
  updatePlayerSprite();
  clearInventory();
  generateOrder();
  setMovementHint();
  setPlayerPosition();
  positionCookingStatus();
  updatePrompt();
  clearInterval(timerId);
  clearInterval(orderTimerId);
  timerId = window.setInterval(() => {
    secondsLeft -= 1;
    timerElement.textContent = secondsLeft;
    if (secondsLeft <= 10) timerElement.classList.add("warning");
    if (secondsLeft <= 0) endSoloGame();
  }, 1000);
  orderTimerId = window.setInterval(() => {
    orderSecondsLeft -= 1;
    updateOrder();
    if (orderSecondsLeft <= 0) { clearInventory(); generateOrder(); setMessage("The customer left. A new order is ready."); }
  }, 1000);
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
  const heldIcon = document.createElementNS("http://www.w3.org/2000/svg", "text");
  heldIcon.setAttribute("y", "6");
  heldIcon.setAttribute("text-anchor", "middle");
  heldIcon.setAttribute("font-size", "18");
  heldIcon.setAttribute("aria-hidden", "true");
  const heldRice = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  heldRice.setAttribute("x", "-10");
  heldRice.setAttribute("y", "-10");
  heldRice.setAttribute("width", "20");
  heldRice.setAttribute("height", "20");
  heldRice.setAttribute("rx", "4");
  heldRice.setAttribute("stroke", "#716e69");
  heldRice.setAttribute("stroke-width", "2");
  heldRice.setAttribute("opacity", "0");
  held.append(heldCircle, heldRice, heldIcon);
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
  remoteElements.set(item.id, { group, label, held, heldIcon, heldRice });
  updateRemoteHeldItem(item);
}

function updateRemoteHeldItem(item) {
  const element = remoteElements.get(item.id);
  if (!element) return;
  const icons = {
    ingredients: "🥕",
    [`cooked-${menus[0].name}`]: "🍲",
    [`cooked-${menus[1].name}`]: "🍳",
    [`cooked-${menus[2].name}`]: "🥩",
    "item-meat": "🥩",
    "item-vegetable": "🥬",
    "item-egg": "🥚",
    "item-sauce": "🫙",
    "item-plate": "🍽️"
  };
  const icon = icons[item.inventory];
  const riceColor = item.inventory === "rice-steamed" ? "#fff" : item.inventory === "rice-sticky" ? "#999" : null;
  element.held.setAttribute("opacity", icon || riceColor ? "1" : "0");
  element.heldIcon.textContent = icon || "";
  element.heldRice.setAttribute("fill", riceColor || "transparent");
  element.heldRice.setAttribute("opacity", riceColor ? "1" : "0");
}

function clearRemotePlayers() {
  remoteTargets.clear();
  remoteRendered.clear();
  remoteElements.clear();
  otherPlayers.replaceChildren();
}

function renderRemotePlayers() {
  if (!roomState) return;
  roomState.players.filter((item) => item.id !== selfId).forEach((item) => {
    remoteTargets.set(item.id, item);
    if (!remoteRendered.has(item.id)) remoteRendered.set(item.id, { x: item.x, y: item.y });
    if (!remoteElements.has(item.id)) createRemotePlayer(item);
    remoteElements.get(item.id).label.textContent = item.name;
    updateRemoteHeldItem(item);
  });
  [...remoteTargets.keys()].forEach((id) => {
    if (remoteTargets.has(id) && roomState.players.some((item) => item.id === id)) return;
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
  const active = Object.entries(roomState.stations || {}).find(([, value]) => value);
  if (!active) return hideCookingStatus();
  const [tool, station] = active;
  cookingTool = tool;
  positionCookingStatus();
  const progress = station.complete ? 1 : Math.min(1, (Date.now() - station.startedAt) / 2000);
  const isMine = station.playerId === selfId;
  const label = station.complete
    ? (isMine ? "READY" : "FOOD READY")
    : (isMine ? "COOKING" : "IN USE");
  updateCookingStatus(progress, label);
}

function renderMultiplayerState(state) {
  roomState = state;
  if (state.selfId) selfId = state.selfId;
  const me = state.players.find((item) => item.id === selfId);
  if (me) {
    const dx = me.x - authoritativePosition.x;
    const dy = me.y - authoritativePosition.y;
    const startingRound = state.status === "playing" && !gameRunning;
    authoritativePosition.x = me.x;
    authoritativePosition.y = me.y;
    if (startingRound) {
      predictedPosition.x = me.x;
      predictedPosition.y = me.y;
      playerState.x = me.x;
      playerState.y = me.y;
      setPlayerPosition();
    }
    inventory = me.inventory;
    const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
    updatePlayerSprite(dx, dy, moving, Date.now());
    syncWalkingSound(moving);
    updateHeldItem();
  }
  score = state.score;
  secondsLeft = state.secondsLeft;
  orderSecondsLeft = state.orderSecondsLeft;
  currentOrder = state.currentOrder;
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
      host.textContent = " HOST";
      name.append(host);
    }
    const status = document.createElement("strong");
    status.textContent = item.ready ? "READY" : "WAITING";
    row.append(name, status);
    playerList.append(row);
  });
  const me = roomState.players.find((item) => item.id === selfId);
  readyButton.textContent = me && me.ready ? "Not Ready" : "Ready";
  startRoundButton.hidden = roomState.hostId !== selfId;
  lobbyMessage.textContent = roomState.players.length < 2 ? "Waiting for at least one more player." : "Everyone must be Ready before the host starts.";
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
    stats.textContent = `${item.stats.ordersServed} served`;
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
  name.textContent = "You";
  const stats = document.createElement("strong");
  stats.textContent = `${score} served`;
  row.append(name, stats);
  resultsList.append(row);
}

function setupMultiplayer() {
  if (!socket) { setupMessage.textContent = "Start the game through the Node server to use multiplayer."; return; }
  mode = "multiplayer";
  clearRemotePlayers();
  showScreen(multiplayerScreen);
  playerNameInput.focus();
}

function requestRoom(eventName, payload) {
  if (!socket) return;
  setupMessage.textContent = "Connecting to the kitchen...";
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
riceOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const rice = button.dataset.rice;
    if (mode === "multiplayer") {
      socket?.emit("select-rice", { rice });
    } else if (mode === "solo" && gameRunning && inventory === "empty") {
      inventory = `rice-${rice}`;
      updateHeldItem();
      setMessage(rice === "steamed" ? "Steamed rice selected." : "Sticky rice selected.");
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
  socket.on("disconnect", () => { if (mode === "multiplayer") { gameRunning = false; stopMultiplayerAnimation(); clearRemotePlayers(); setupMessage.textContent = "Disconnected from the kitchen server."; showScreen(multiplayerScreen); } });
}

showScreen(startScreen);
