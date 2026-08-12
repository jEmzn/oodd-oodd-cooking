const startScreen = document.querySelector("#start-screen");
const multiplayerScreen = document.querySelector("#multiplayer-screen");
const characterScreen = document.querySelector("#character-screen");
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
const characterSelectionCopy = document.querySelector("#character-selection-copy");
const characterProgress = document.querySelector("#character-progress");
const characterGrid = document.querySelector("#character-grid");
const characterRoster = document.querySelector("#character-roster");
const characterRosterHint = document.querySelector("#character-roster-hint");
const characterBackButton = document.querySelector("#character-back-button");
const characterDetailModal = document.querySelector("#character-detail-modal");
const characterModalClose = document.querySelector("#character-modal-close");
const characterCancelButton = document.querySelector("#character-cancel-button");
const characterConfirmButton = document.querySelector("#character-confirm-button");
const characterDetailImage = document.querySelector("#character-detail-image");
const characterDetailSkillImage = document.querySelector("#character-detail-skill-image");
const characterDetailName = document.querySelector("#character-detail-name");
const characterDetailRole = document.querySelector("#character-detail-role");
const characterDetailSkill = document.querySelector("#character-detail-skill");
const characterDetailStats = document.querySelector("#character-detail-stats");
const fullscreenButton = document.querySelector("#fullscreen-button");
const mobileInteractButton = document.querySelector("#mobile-interact-button");
const mobileSkillButton = document.querySelector("#mobile-skill-button");
const directionButtons = [...document.querySelectorAll("[data-direction]")];
const soundToggles = [...document.querySelectorAll(".sound-toggle")];
const exitGameButton = document.querySelector("#exit-game-button");
const resultsList = document.querySelector("#results-list");
const resultsScore = document.querySelector("#results-score");
const playerLayer = document.querySelector("#players");
const customerLayer = document.querySelector("#customers");
const cookingStatuses = document.querySelector("#cooking-statuses");
const riceChoices = document.querySelector("#rice-choices");
const timerElement = document.querySelector("#timer");
const scoreElement = document.querySelector("#score");
const orderCard = document.querySelector("#order-card");
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
const orderLifetime = 60000;
const roundDurationSeconds = 300;
const playerSpeed = 270;
const playerRadius = 32;
const interactionDistance = playerRadius + 72;
const serveStationPosition = objects.find((object) => object.name === "serve") || { x: 500, y: 470 };
const customerEntry = { x: serveStationPosition.x, y: 660 };
const customerServicePoint = { x: serveStationPosition.x, y: serveStationPosition.y + 60 };
const customerQueueSpacing = 48;
const customerEnterThreshold = 600;
const customerWalkSpeed = 120;
const customerArrivalInterval = 12000;
const maxCustomers = 4;
const playerColors = ["#ba6849", "#4d8f9d", "#64834f", "#b87c2b", "#8d63a8"];
const spawnPositions = [
  { x: 430, y: 335 }, { x: 500, y: 335 }, { x: 570, y: 335 }, { x: 465, y: 405 }, { x: 535, y: 405 }
];
const characterDefinitions = [
  {
    id: "grilled-pork",
    name: "พี่หมูปิ้ง",
    image: "image/charecter/Grilled_Pork.png",
    skillImage: "animation/animation_cooldownskill/Grill_Cooldownskill1.png",
    recoverySprites: [{ href: "animation/animation_cooldownskill/Grill_Cooldownskill1.png", width: 70, height: 80 }, { href: "animation/animation_cooldownskill/Grill_Cooldownskill2.png", width: 70, height: 80 }],
    skillCooldownSeconds: 15,
    activeSeconds: 40,
    recoverySeconds: 9,
    skillEffect: "order-time-boost",
    effectDurationSeconds: 10,
    orderBonusSeconds: 10,
    role: "เชฟผู้ใจดี ใจเย็น ไม่วีน",
    skill: "ทำให้ลูกค้าใจเย็นลง เพิ่มเวลารออาหารของทุกเมนูในช่วงที่กดสกิลเท่านั้น",
    stats: [["คูลดาวน์สกิล", "15 วินาที"], ["เวลาเล่น", "40 วินาที"], ["พักฟื้น", "9 วินาที"], ["การเคลื่อนไหว", "ปกติ"]],
    sprites: {
      down: [{ href: "animation/animation_walk/Grilled_Pork_animation/Stand%20Still.png", width: 68, height: 80 }, { href: "animation/animation_walk/Grilled_Pork_animation/Stand%20Still.png", width: 68, height:80 }],
      up: [{ href: "animation/animation_walk/Grilled_Pork_animation/Stand%20Still.png", width: 68, height: 80 }, { href: "animation/animation_walk/Grilled_Pork_animation/Walk%20Forward.png", width: 69, height: 80 }],
      left: [{ href: "animation/animation_walk/Grilled_Pork_animation/Stand%20Still.png", width: 68, height: 80 }, { href: "animation/animation_walk/Grilled_Pork_animation/Walk%20towards%20the%20left%20side.png", width: 66, height: 80 }],
      right: [{ href: "animation/animation_walk/Grilled_Pork_animation/Stand%20Still.png", width: 68, height: 80 }, { href: "animation/animation_walk/Grilled_Pork_animation/Walk%20towards%20the%20right%20side.png", width: 63, height: 80 }]
    }
  },
  {
    id: "angel-pork",
    name: "นางฟ้าหมูจิ๋ว",
    image: "image/charecter/Angel_pork.png",
    skillImage: "animation/animation_cooldownskill/Angel_Cooldownskill1.png",
    recoverySprites: [{ href: "animation/animation_cooldownskill/Angel_Cooldownskill1.png", width: 100, height: 70 }, { href: "animation/animation_cooldownskill/Angel_Cooldownskill2.png", width: 70, height: 80 }],
    skillCooldownSeconds: 15,
    activeSeconds: 25,
    recoverySeconds: 9,
    skillEffect: "customer-surge",
    role: "เชฟผู้น่ารักสดใส แต่ขี้เกียจ เหนื่อยง่าย",
    skill: "เรียกลูกค้าเข้าร้าน เพิ่มจำนวนลูกค้าเข้าร้านมากขึ้น",
    stats: [["คูลดาวน์สกิล", "15 วินาที"], ["เวลาเล่น", "25 วินาที"], ["พักฟื้น", "9 วินาที"], ["การเคลื่อนไหว", "ปกติ"]],
    sprites: {
      down: [{ href: "animation/animation_walk/Angel_Pork_animation/Stand%20Still.png", width: 220, height: 80 }, { href: "animation/animation_walk/Angel_Pork_animation/Stand%20Still.png", width: 220, height: 80 }],
      up: [{ href: "animation/animation_walk/Angel_Pork_animation/Stand%20Still.png", width: 220, height: 80 }, { href: "animation/animation_walk/Angel_Pork_animation/Walk%20Forward.png", width: 220, height: 80 }],
      left: [{ href: "animation/animation_walk/Angel_Pork_animation/Stand%20Still.png", width: 220, height: 80 }, { href: "animation/animation_walk/Angel_Pork_animation/Walk%20towards%20the%20left%20side.png", width: 220, height: 80 }],
      right: [{ href: "animation/animation_walk/Angel_Pork_animation/Stand%20Still.png", width: 220, height: 80 }, { href: "animation/animation_walk/Angel_Pork_animation/Walk%20towards%20the%20right%20side.png", width: 220, height: 80 }]
    }
  },
  {
    id: "boar",
    name: "ลุงหมูป่า",
    image: "image/charecter/Boar.png",
    skillImage: "animation/animation_cooldownskill/Boar_Cooldownskill1.png",
    recoverySprites: [{ href: "animation/animation_cooldownskill/Boar_Cooldownskill1.png", width: 70, height: 80 }, { href: "animation/animation_cooldownskill/Boar_Cooldownskill2.png", width: 70, height: 80 }],
    skillCooldownSeconds: 15,
    activeSeconds: 50,
    recoverySeconds: 15,
    skillEffect: "reset-recovery",
    role: "เชฟผู้ถึกทนทุกสถานการ์ณ",
    skill: "รีเซ็ตเวลาพักฟื้นของเพื่อนร่วมทีมทุกคนให้กลับมาเป็นปกติได้ในช่วงที่กดสกิล",
    stats: [["คูลดาวน์สกิล", "15 วินาที"], ["เวลาเล่น", "50 วินาที"], ["พักฟื้น", "15 วินาที"], ["การเคลื่อนไหว", "ช้าลง 1.5 เท่า"]],
    sprites: {
      down: [{ href: "animation/animation_walk/Boar_animation/Stand%20Still.png", width: 72, height: 95 }, { href: "animation/animation_walk/Boar_animation/Stand%20Still.png", width: 72, height: 95 }],
      up: [{ href: "animation/animation_walk/Boar_animation/Stand%20Still.png", width: 72, height: 95 }, { href: "animation/animation_walk/Boar_animation/Walk%20Forward.png", width: 75, height: 95 }],
      left: [{ href: "animation/animation_walk/Boar_animation/Stand%20Still.png", width: 72, height: 95 }, { href: "animation/animation_walk/Boar_animation/Walk%20towards%20the%20left%20side.png", width: 64, height: 95 }],
      right: [{ href: "animation/animation_walk/Boar_animation/Stand%20Still.png", width: 72, height: 95 }, { href: "animation/animation_walk/Boar_animation/Walk%20towards%20the%20right%20side.png", width: 88, height: 95 }]
    }
  },
  {
    id: "rek-pork",
    name: "น้องเร้กหมูตุ๋น",
    image: "image/charecter/Rek_Pork.png",
    skillImage: "animation/animation_cooldownskill/Rek_Cooldownskill1.png",
    recoverySprites: [{ href: "animation/animation_cooldownskill/Rek_Cooldownskill1.png", width: 73, height: 80 }, { href: "animation/animation_cooldownskill/Rek_Cooldownskill2.png", width: 70, height: 80 }],
    skillCooldownSeconds: 14,
    activeSeconds: 30,
    recoverySeconds: 12,
    skillEffect: "cooldown-reduction",
    cooldownReduction: 0.5,
    role: "เชฟผู้ใจเย็น แต่ขี้วีน ",
    skill: "ลดเวลาคูลดาวน์สกิลให้เพื่อนร่วมทีม โดยไม่รวมตัวเอง",
    stats: [["คูลดาวน์สกิล", "14 วินาที"], ["เวลาเล่น", "30 วินาที"], ["พักฟื้น", "12 วินาที"], ["การเคลื่อนไหว", "ปกติ"]],
    sprites: {
      down: [{ href: "animation/animation_walk/Rek_Pork_animation/Stand%20Still.png", width: 73, height: 70 }, { href: "animation/animation_walk/Rek_Pork_animation/Stand%20Still.png", width: 73, height: 70 }],
      up: [{ href: "animation/animation_walk/Rek_Pork_animation/Stand%20Still.png", width: 73, height: 70 }, { href: "animation/animation_walk/Rek_Pork_animation/Walk%20Forward.png", width: 71, height: 70 }],
      left: [{ href: "animation/animation_walk/Rek_Pork_animation/Stand%20Still.png", width: 73, height: 70 }, { href: "animation/animation_walk/Rek_Pork_animation/Walk%20towards%20the%20left%20side.png", width: 78, height: 70 }],
      right: [{ href: "animation/animation_walk/Rek_Pork_animation/Stand%20Still.png", width: 73, height: 70 }, { href: "animation/animation_walk/Rek_Pork_animation/Walk%20towards%20the%20right%20side.png", width: 66, height: 70 }]
    }
  },
  {
    id: "baby-pork",
    name: "ทารกหมูเด้ง",
    image: "image/charecter/Baby_Pork.png",
    skillImage: "animation/animation_cooldownskill/Baby_Cooldownskill1.png",
    recoverySprites: [{ href: "animation/animation_cooldownskill/Baby_Cooldownskill1.png", width: 70, height: 85 }, { href: "animation/animation_cooldownskill/Baby_Cooldownskill2.png", width: 70, height: 80 }],
    skillCooldownSeconds: 10,
    activeSeconds: 30,
    recoverySeconds: 7,
    skillEffect: "cooking-boost",
    effectDurationSeconds: 10,
    cookingMultiplier: 1,
    role: "เชฟตัวจิ๋วผู้ว่องไว แต่ขี้โวยวาย",
    skill: "ช่วยให้เพื่อนทำอาหารได้ไวขึ้น ",
    stats: [["คูลดาวน์สกิล", "10 วินาที"], ["เวลาเล่น", "30 วินาที"], ["พักฟื้น", "7 วินาที"], ["การเคลื่อนไหว", "ปกติ"]],
    sprites: {
      down: [{ href: "animation/animation_walk/Baby_Pork_animation/Stand%20Still.png", width: 67, height: 60 }, { href: "animation/animation_walk/Baby_Pork_animation/Stand%20Still.png", width: 67, height: 60 }],
      up: [{ href: "animation/animation_walk/Baby_Pork_animation/Stand%20Still.png", width: 67, height: 60 }, { href: "animation/animation_walk/Baby_Pork_animation/Walk%20Forward.png", width: 72, height: 60 }],
      left: [{ href: "animation/animation_walk/Baby_Pork_animation/Stand%20Still.png", width: 67, height: 60 }, { href: "animation/animation_walk/Baby_Pork_animation/Walk%20towards%20the%20left%20side.png", width: 76, height: 60 }],
      right: [{ href: "animation/animation_walk/Baby_Pork_animation/Stand%20Still.png", width: 67, height: 60 }, { href: "animation/animation_walk/Baby_Pork_animation/Walk%20towards%20the%20right%20side.png", width: 81, height: 60 }]
    }
  }
];
const keyboardControls = {
  keyboard1: { left: "a", right: "d", up: "w", down: "s", interact: "e", skill: "q", label: "E", skillLabel: "Q" },
  keyboard2: { left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", interact: "enter", skill: "\\", label: "Enter", skillLabel: "\\" }
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
let customers = [];
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
let characterSelectionMode = "solo";
let characterSelectionConfigs = [];
let characterSelectionIndex = 0;
let pendingCharacterId = null;
let customerOrderBonusUntil = 0;

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

const customerSprites = [
  { href: "image/charecter/customer1.png", width: 64, height: 91 },
  { href: "image/charecter/customer2.png", width: 57, height: 92 }
];

function activeCustomers() {
  return customers.filter((customer) => customer.state !== "exiting");
}

function customerQueueTarget(customer) {
  const queueIndex = activeCustomers().indexOf(customer);
  return {
    x: customerServicePoint.x,
    y: customerServicePoint.y + Math.max(0, queueIndex) * customerQueueSpacing
  };
}

function setCustomerPosition(customer) {
  customer.elements.group.setAttribute("transform", `translate(${customer.x} ${customer.y})`);
}

function createCustomerElement(customer) {
  const group = svgElement("g", { class: "customer-group", transform: `translate(${customer.x} ${customer.y})` });
  const shadow = svgElement("ellipse", { class: "customer-shadow", cx: 0, cy: 3, rx: 20, ry: 6 });
  const sprite = svgElement("image", {
    class: "customer-sprite",
    href: customer.sprite.href,
    x: -customer.sprite.width / 2,
    y: -customer.sprite.height,
    width: customer.sprite.width,
    height: customer.sprite.height,
    preserveAspectRatio: "xMidYMax meet"
  });
  group.append(shadow, sprite);
  customerLayer.append(group);
  customer.elements = { group, sprite };
}

function revealCustomerOrder(customer) {
  if (customer.orderVisible) return;
  const createdAt = Date.now();
  customer.order.createdAt = createdAt;
  const bonus = createdAt < customerOrderBonusUntil ? 10000 : 0;
  customer.order.expiresAt = createdAt + orderLifetime + bonus;
  customer.orderVisible = true;
  orders.push(customer.order);
  renderOrders();
  setMessage(`ลูกค้าเข้าร้านแล้ว ต้องการ${customer.order.name}`);
}

function createCustomer({ revealOnEntry = false, startY = customerEntry.y } = {}) {
  const menu = menus[Math.floor(Math.random() * menus.length)];
  const createdAt = Date.now();
  const customer = {
    id: `customer-${createdAt}-${orderSequence++}`,
    sprite: customerSprites[Math.floor(Math.random() * customerSprites.length)],
    x: customerEntry.x,
    y: startY,
    targetX: customerServicePoint.x,
    targetY: customerServicePoint.y,
    state: "entering",
    orderVisible: false,
    order: {
      id: `local-${createdAt}-${orderSequence++}`,
      customerId: null,
      menuId: menu.id,
      name: menu.name,
      createdAt: null,
      expiresAt: null
    },
    elements: null
  };
  customer.order.customerId = customer.id;
  customers.push(customer);
  createCustomerElement(customer);
  refreshCustomerTargets();
  if (revealOnEntry) revealCustomerOrder(customer);
  return customer;
}

function refreshCustomerTargets() {
  activeCustomers().forEach((customer) => {
    const target = customerQueueTarget(customer);
    customer.targetX = target.x;
    customer.targetY = target.y;
  });
}

function beginCustomerExit(customer) {
  if (!customer || customer.state === "exiting") return;
  customer.state = "exiting";
  customer.targetX = customerEntry.x;
  customer.targetY = customerEntry.y + 45;
  refreshCustomerTargets();
}

function clearCustomers() {
  customers = [];
  customerLayer.replaceChildren();
}

function moveCustomerTowardsTarget(customer, delta) {
  const dx = customer.targetX - customer.x;
  const dy = customer.targetY - customer.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= customerWalkSpeed * delta || distance < 1) {
    customer.x = customer.targetX;
    customer.y = customer.targetY;
    return true;
  }
  customer.x += (dx / distance) * customerWalkSpeed * delta;
  customer.y += (dy / distance) * customerWalkSpeed * delta;
  return false;
}

function updateCustomers(delta) {
  refreshCustomerTargets();
  customers.slice().forEach((customer) => {
    if (customer.state === "exiting") {
      const leftShop = moveCustomerTowardsTarget(customer, delta);
      setCustomerPosition(customer);
      if (leftShop) {
        customer.elements.group.remove();
        customers = customers.filter((item) => item !== customer);
        refreshCustomerTargets();
      }
      return;
    }
    const reachedQueuePosition = moveCustomerTowardsTarget(customer, delta);
    if (!customer.orderVisible && customer.y <= customerEnterThreshold) revealCustomerOrder(customer);
    if (reachedQueuePosition) customer.state = "waiting";
    setCustomerPosition(customer);
  });
}

function spawnCustomerBatch() {
  const freeSlots = maxCustomers - activeCustomers().length;
  if (freeSlots <= 0) return false;
  const amount = Math.min(freeSlots, Math.random() < 0.25 ? 2 : 1);
  for (let index = 0; index < amount; index += 1) createCustomer();
  return true;
}

function getCharacterDefinition(characterId) {
  return characterDefinitions.find((character) => character.id === characterId) || characterDefinitions[0];
}

function getCharacterStats(character) {
  return [
    ["คูลดาวน์สกิล", `${character.skillCooldownSeconds} วินาที`],
    ["เวลาเล่น", `${character.activeSeconds} วินาที`],
    ["พักฟื้น", `${character.recoverySeconds} วินาที`],
    ["การเคลื่อนไหว", character.id === "boar" ? "ช้าลง 1.5 เท่า" : "ปกติ"]
  ];
}

function getPlayerSprite(player, direction = player.direction, frameIndex = 0) {
  const sprites = player.character?.sprites?.[direction] || characterDefinitions[0].sprites[direction];
  return sprites[frameIndex % sprites.length];
}

function getRecoverySprite(player) {
  const frames = player.character?.recoverySprites || [getPlayerSprite(player, "down")];
  const recoveryFrame = Date.now() - player.recoveryStartedAt < 1000 ? 0 : 1;
  return frames[Math.min(recoveryFrame, frames.length - 1)];
}

function createPlayerElement(player) {
  const group = svgElement("g", { transform: `translate(${player.x} ${player.y})`, class: "local-player" });
  const held = svgElement("g", { transform: "translate(0 -55)", opacity: 0 });
  const heldCircle = svgElement("circle", { class: "held-item-circle", r: 17 });
  const heldImages = svgElement("g");
  held.append(heldCircle, heldImages);
  const shadow = svgElement("circle", { class: "player-shadow", cy: 27, r: 15 });
  const ring = svgElement("circle", { class: "player-color-ring", cy: 26, r: 22, stroke: player.color });
  const initialSprite = getPlayerSprite(player, "down");
  const sprite = svgElement("image", { class: "player-sprite", href: initialSprite.href, x: -initialSprite.width / 2, y: 30 - initialSprite.height, width: initialSprite.width, height: initialSprite.height, preserveAspectRatio: "xMidYMid meet" });
  const label = svgElement("text", { class: "local-player-label", y: -48, fill: player.color });
  label.textContent = player.name;
  const badge = svgElement("g", { class: "player-action-badge", transform: "translate(0 -80)", opacity: 0 });
  badge.append(svgElement("rect", { x: -29, y: -14, width: 58, height: 26, rx: 13 }));
  const badgeText = svgElement("text", { y: 4 });
  badgeText.textContent = player.source.startsWith("keyboard") ? keyboardControls[player.source].label : "แตะ";
  badge.append(badgeText);
  const statusBadge = svgElement("g", { class: "player-status-badge", transform: "translate(0 -108)", opacity: 0 });
  statusBadge.append(svgElement("rect", { x: -58, y: -13, width: 116, height: 24, rx: 12 }));
  const statusText = svgElement("text", { y: 4 });
  statusBadge.append(statusText);
  group.append(held, shadow, ring, sprite, label, badge, statusBadge);
  playerLayer.append(group);
  player.elements = { group, held, heldImages, sprite, label, badge, statusBadge, statusText };
  renderHeldItem(player);
}

function createPlayer(config, index) {
  const spawn = spawnPositions[index] || spawnPositions[0];
  const character = getCharacterDefinition(config.characterId);
  const player = {
    id: config.id,
    name: sanitizeName(config.name, `ผู้เล่น ${index + 1}`),
    color: playerColors[index],
    source: config.source,
    characterId: character.id,
    character,
    x: spawn.x,
    y: spawn.y,
    input: { left: false, right: false, up: false, down: false },
    inventory: null,
    plate: null,
    direction: "down",
    lastSpriteKey: "",
    riceChoice: null,
    skillCooldownUntil: 0,
    activeUntil: 0,
    recoveryUntil: 0,
    recoveryStartedAt: 0,
    cookingBoostUntil: 0,
    cookingBoostMultiplier: 1,
    lastAbilityStateKey: "",
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
  if (player.recoveryUntil > Date.now()) {
    const recoverySprite = getRecoverySprite(player);
    const spriteKey = `recovery-${recoverySprite.href}`;
    if (spriteKey === player.lastSpriteKey) return;
    player.elements.sprite.setAttribute("href", recoverySprite.href);
    player.elements.sprite.setAttribute("x", `${-recoverySprite.width / 2}`);
    player.elements.sprite.setAttribute("y", `${30 - recoverySprite.height}`);
    player.elements.sprite.setAttribute("width", `${recoverySprite.width}`);
    player.elements.sprite.setAttribute("height", `${recoverySprite.height}`);
    player.lastSpriteKey = spriteKey;
    return;
  }
  if (moving) {
    if (Math.abs(dx) >= Math.abs(dy)) player.direction = dx < 0 ? "left" : "right";
    else player.direction = dy < 0 ? "up" : "down";
  }
  const sprites = player.character.sprites[player.direction];
  const frameIndex = moving && player.direction !== "down" ? 1 : moving ? Math.floor(timestamp / 140) % sprites.length : 0;
  const sprite = getPlayerSprite(player, player.direction, frameIndex);
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
  const ability = getAbilityState(player);
  relaySocket.emit("local-host:controller-state", {
    playerId: player.id,
    state: {
      phase: gameRunning ? "playing" : resultsScreen.hidden ? "lobby" : "results",
      name: player.name,
      color: player.color,
      canChooseRice: Boolean(player.riceChoice),
      canUseSkill: ability.canUseSkill,
      recovering: ability.recovering,
      recoveryRemaining: ability.recoveryRemaining,
      skillCooldownRemaining: ability.skillCooldownRemaining,
      skillLabel: ability.skillLabel,
      skillKey: ability.skillKey,
      ...extra
    }
  });
}

function getAbilityState(player, now = Date.now()) {
  const recoveryRemaining = Math.max(0, Math.ceil((player.recoveryUntil - now) / 1000));
  const skillCooldownRemaining = Math.max(0, Math.ceil((player.skillCooldownUntil - now) / 1000));
  const recovering = player.recoveryUntil > now;
  return {
    canUseSkill: gameRunning && player.connected && !player.riceChoice && !recovering && skillCooldownRemaining === 0,
    recovering,
    recoveryRemaining,
    skillCooldownRemaining,
    skillLabel: player.character.skill,
    skillKey: player.source.startsWith("keyboard") ? keyboardControls[player.source].skillLabel : "สกิล"
  };
}

function renderPlayerAbilityState(player, now = Date.now()) {
  const state = getAbilityState(player, now);
  if (player.elements?.statusBadge) {
    const visible = state.recovering || state.skillCooldownRemaining > 0;
    player.elements.statusBadge.setAttribute("opacity", visible ? "1" : "0");
    player.elements.statusText.textContent = state.recovering
      ? `พักฟื้น ${state.recoveryRemaining}`
      : `สกิลคูลดาวน์ ${state.skillCooldownRemaining}`;
  }
  const stateKey = `${state.canUseSkill}-${state.recovering}-${state.recoveryRemaining}-${state.skillCooldownRemaining}`;
  if (stateKey !== player.lastAbilityStateKey) {
    player.lastAbilityStateKey = stateKey;
    sendControllerState(player, state);
  }
  return state;
}

function resetPlayerAbilityState(player, now = Date.now()) {
  player.skillCooldownUntil = 0;
  player.activeUntil = now + player.character.activeSeconds * 1000;
  player.recoveryUntil = 0;
  player.recoveryStartedAt = 0;
  player.cookingBoostUntil = 0;
  player.cookingBoostMultiplier = 1;
  player.lastAbilityStateKey = "";
  player.lastSpriteKey = "";
}

function endPlayerRecovery(player, now = Date.now()) {
  player.recoveryUntil = 0;
  player.activeUntil = now + player.character.activeSeconds * 1000;
  player.lastSpriteKey = "";
  updatePlayerSprite(player);
  setMessage(`${player.name} ฟื้นฟูแล้ว กลับมาเล่นต่อได้`);
  renderPlayerAbilityState(player, now);
}

function beginPlayerRecovery(player, now = Date.now()) {
  if (player.recoveryUntil > now) return;
  player.activeUntil = 0;
  player.recoveryStartedAt = now;
  player.recoveryUntil = now + player.character.recoverySeconds * 1000;
  player.input = { left: false, right: false, up: false, down: false };
  if (player.riceChoice) {
    player.riceChoice = null;
    renderRiceChoices();
  }
  player.lastSpriteKey = "";
  updatePlayerSprite(player);
  setMessage(`${player.name} เหนื่อยแล้ว เข้าสู่สถานะพักฟื้น ${player.character.recoverySeconds} วินาที`);
  renderPlayerAbilityState(player, now);
}

function updatePlayerAbilityState(player, now = Date.now()) {
  if (player.recoveryUntil > 0) {
    if (player.recoveryUntil <= now) endPlayerRecovery(player, now);
    return;
  }
  if (player.activeUntil > 0 && player.activeUntil <= now) beginPlayerRecovery(player, now);
}

function usePlayerSkill(player) {
  if (!gameRunning || !player || !player.connected) return;
  const now = Date.now();
  const state = getAbilityState(player, now);
  if (state.recovering) return setPlayerMessage(player, `กำลังพักฟื้นอีก ${state.recoveryRemaining} วินาที`);
  if (state.skillCooldownRemaining > 0) return setPlayerMessage(player, `สกิลยังคูลดาวน์อีก ${state.skillCooldownRemaining} วินาที`);
  if (player.riceChoice) return;

  player.skillCooldownUntil = now + player.character.skillCooldownSeconds * 1000;
  const effectDurationMs = (player.character.effectDurationSeconds || 0) * 1000;
  if (player.character.skillEffect === "customer-surge") {
    spawnCustomerBatch();
    spawnCustomerBatch();
    setPlayerMessage(player, "ใช้สกิลเรียกลูกค้าแล้ว");
  } else if (player.character.skillEffect === "cooking-boost") {
    players.filter((teammate) => teammate !== player && teammate.connected).forEach((teammate) => {
      teammate.cookingBoostUntil = now + effectDurationMs;
      teammate.cookingBoostMultiplier = player.character.cookingMultiplier || 0.5;
    });
    setPlayerMessage(player, `เพื่อนร่วมทีมทำอาหารเร็วขึ้น ${player.character.effectDurationSeconds} วินาที`);
  } else if (player.character.skillEffect === "order-time-boost") {
    const bonusMs = (player.character.orderBonusSeconds || 0) * 1000;
    customerOrderBonusUntil = now + effectDurationMs;
    orders.forEach((order) => { order.expiresAt += bonusMs; });
    renderOrders();
    setPlayerMessage(player, "ลูกค้าใจเย็นลง ออเดอร์มีเวลารอเพิ่มขึ้น");
  } else if (player.character.skillEffect === "cooldown-reduction") {
    const reduction = player.character.cooldownReduction || 0.5;
    players.filter((teammate) => teammate !== player && teammate.connected && teammate.skillCooldownUntil > now).forEach((teammate) => {
      const remaining = teammate.skillCooldownUntil - now;
      teammate.skillCooldownUntil = now + Math.ceil(remaining * reduction);
      teammate.lastAbilityStateKey = "";
    });
    setPlayerMessage(player, "ลดเวลาคูลดาวน์สกิลให้เพื่อนร่วมทีมแล้ว");
  } else if (player.character.skillEffect === "reset-recovery") {
    players.filter((teammate) => teammate !== player && teammate.connected && teammate.recoveryUntil > now)
      .forEach((teammate) => endPlayerRecovery(teammate, now));
    setPlayerMessage(player, "รีเซ็ตสถานะพักฟื้นของเพื่อนร่วมทีมแล้ว");
  }
  renderPlayerAbilityState(player, now);
}

function setPlayerMessage(player, text) {
  setMessage(`${player.name}: ${text}`);
  sendControllerState(player, { message: text });
}

function getCookingDuration(player) {
  const boosted = player.cookingBoostUntil > Date.now();
  return boosted ? 2000 * player.cookingBoostMultiplier : 2000;
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
      const progress = station.phase === "ready" ? 1 : Math.min(1, (Date.now() - station.startedAt) / (station.duration || 2000));
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
  station.duration = getCookingDuration(player);
  setPlayerMessage(player, `กำลังปรุงด้วย${stationLabels[stationId]}... ${station.duration / 1000} วินาที`);
  cancelAnimationFrame(cookingAnimationId);
  cookingAnimationId = requestAnimationFrame(animateCookingStatuses);
  station.timeoutId = window.setTimeout(() => {
    const current = cookingStations[stationId];
    if (!gameRunning || current !== station || current.phase !== "cooking") return;
    current.phase = "ready";
    current.output = transformation.output;
    renderCookingStatuses();
    setMessage(`อาหารที่${stationLabels[stationId]}พร้อมใส่จานแล้ว`);
  }, station.duration);
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
  if (player.recoveryUntil > Date.now()) return setPlayerMessage(player, `กำลังพักฟื้นอีก ${Math.ceil((player.recoveryUntil - Date.now()) / 1000)} วินาที`);
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
  const firstOrder = orders[0];
  const firstCustomer = firstOrder?.customerId ? customers.find((customer) => customer.id === firstOrder.customerId) : null;
  if (firstOrder && firstCustomer && firstCustomer.state !== "waiting") {
    return setPlayerMessage(player, "ลูกค้าคนแรกกำลังเดินมาที่จุดเสิร์ฟ");
  }
  if (firstOrder && firstOrder.menuId === menu?.id) {
    orders = orders.filter((order) => order.id !== firstOrder.id);
    beginCustomerExit(firstCustomer);
    score += 1;
    player.stats.ordersServed += 1;
    player.plate = null;
    scoreElement.textContent = score;
    renderHeldItem(player);
    renderOrders();
    return setPlayerMessage(player, "เสิร์ฟออเดอร์สำเร็จ! ลูกค้ากำลังเดินออกจากร้าน");
  }
  if (firstOrder && menu?.id !== firstOrder.menuId) return setPlayerMessage(player, `ลูกค้าคนแรกต้องการ${firstOrder.name}`);
  if (player.plate?.dishId) return setPlayerMessage(player, "ไม่มีลูกค้ารอเมนูนี้");
  if (Object.values(cookingStations).some((station) => station?.phase === "cooking")) return setPlayerMessage(player, "อาหารยังทำไม่เสร็จ");
  setPlayerMessage(player, "ทำอาหารก่อนนำไปเสิร์ฟ");
}

function inputForPlayer(player) {
  if (!player.connected || player.riceChoice || player.recoveryUntil > Date.now()) return { left: false, right: false, up: false, down: false };
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
  updateCustomers(delta);
  let someoneMoving = false;
  players.forEach((player) => {
    updatePlayerAbilityState(player);
    renderPlayerAbilityState(player);
    const input = inputForPlayer(player);
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const moving = Boolean(dx || dy);
    if (moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      const movementSpeed = player.character.id === "boar" ? playerSpeed / 1.5 : playerSpeed;
      player.x = Math.max(65, Math.min(935, player.x + dx * movementSpeed * delta));
      player.y = Math.max(105, Math.min(555, player.y + dy * movementSpeed * delta));
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
  orderCard.hidden = !orders.length;
  if (!orders.length) {
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
  return spawnCustomerBatch();
}

function expireOrders() {
  const remaining = orders.filter((order) => order.expiresAt > Date.now());
  if (remaining.length !== orders.length) {
    orders.filter((order) => order.expiresAt <= Date.now()).forEach((order) => {
      const customer = customers.find((item) => item.id === order.customerId);
      beginCustomerExit(customer);
    });
    orders = remaining;
    renderOrders();
    setMessage("ลูกค้าบางคนกลับไปแล้ว ออเดอร์ที่เหลือยังรออยู่");
  }
}

function resetRoundState() {
  score = 0;
  secondsLeft = roundDurationSeconds;
  orders = [];
  customerOrderBonusUntil = 0;
  clearCustomers();
  cookingStations = createEmptyCookingStations();
  scoreElement.textContent = "0";
  timerElement.textContent = `${secondsLeft}`;
  timerElement.classList.remove("warning");
  createCustomer({ revealOnEntry: true, startY: customerEnterThreshold });
  const now = Date.now();
  players.forEach((player) => resetPlayerAbilityState(player, now));
  renderOrders();
  renderCookingStatuses();
}

function closeCharacterDetails() {
  characterDetailModal.hidden = true;
  pendingCharacterId = null;
}

function renderCharacterSelection() {
  const currentConfig = characterSelectionConfigs[characterSelectionIndex];
  if (!currentConfig) return;
  const currentCharacterId = currentConfig.characterId;
  const selectedCount = characterSelectionConfigs.filter((config) => config.characterId).length;
  const isSolo = characterSelectionMode === "solo";
  characterSelectionCopy.textContent = isSolo
    ? "เลือกเชฟของคุณ แล้วดูรายละเอียดสกิลก่อนยืนยัน"
    : "ผู้เล่นแต่ละคนเลือกเชฟของตัวเอง ตัวละครในทีมจะไม่ซ้ำกัน";
  characterProgress.textContent = isSolo
    ? `กำลังเลือกให้ ${currentConfig.name}`
    : `ผู้เล่น ${characterSelectionIndex + 1}/${characterSelectionConfigs.length}: ${currentConfig.name}`;
  characterRosterHint.textContent = `เลือกแล้ว ${selectedCount}/${characterSelectionConfigs.length} คน`;
  characterGrid.replaceChildren();
  characterDefinitions.forEach((character) => {
    const occupiedByOther = characterSelectionConfigs.some((config, index) => index !== characterSelectionIndex && config.characterId === character.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `character-card${currentCharacterId === character.id ? " is-selected" : ""}`;
    card.dataset.characterId = character.id;
    card.disabled = occupiedByOther;
    card.setAttribute("aria-label", `เลือก${character.name}`);
    const imageWrap = document.createElement("span");
    imageWrap.className = "character-card-image-wrap";
    const image = document.createElement("img");
    image.src = character.image;
    image.alt = character.name;
    imageWrap.append(image);
    const name = document.createElement("h3");
    name.textContent = character.name;
    const role = document.createElement("small");
    role.textContent = character.role;
    card.append(imageWrap, name, role);
    if (currentCharacterId === character.id) {
      const check = document.createElement("span");
      check.className = "character-card-check";
      check.textContent = "✓";
      card.append(check);
    }
    card.addEventListener("click", () => openCharacterDetails(character.id));
    characterGrid.append(card);
  });
  characterRoster.replaceChildren();
  characterSelectionConfigs.forEach((config, index) => {
    const item = document.createElement("div");
    item.className = `character-roster-item${index === characterSelectionIndex ? " active" : ""}`;
    const image = document.createElement("img");
    const character = config.characterId ? getCharacterDefinition(config.characterId) : null;
    image.src = character?.image || "image/charecter/Baby_Pork.png";
    image.alt = character?.name || "ยังไม่ได้เลือก";
    const copy = document.createElement("span");
    copy.textContent = config.name;
    const selected = document.createElement("small");
    selected.textContent = character?.name || "รอเลือก";
    copy.append(selected);
    item.append(image, copy);
    characterRoster.append(item);
  });
}

function openCharacterDetails(characterId) {
  const character = getCharacterDefinition(characterId);
  pendingCharacterId = character.id;
  characterDetailImage.src = character.image;
  characterDetailImage.alt = character.name;
  characterDetailSkillImage.src = character.skillImage;
  characterDetailName.textContent = character.name;
  characterDetailRole.textContent = character.role;
  characterDetailSkill.textContent = character.skill;
  characterDetailStats.replaceChildren();
  getCharacterStats(character).forEach(([label, value]) => {
    const stat = document.createElement("div");
    stat.className = "character-stat";
    const statLabel = document.createElement("span");
    statLabel.textContent = label;
    const statValue = document.createElement("strong");
    statValue.textContent = value;
    stat.append(statLabel, statValue);
    characterDetailStats.append(stat);
  });
  characterDetailModal.hidden = false;
  characterConfirmButton.focus();
}

function startCharacterSelection(selectionMode) {
  const configs = selectionMode === "solo"
    ? [{ id: "solo", name: "คุณ", source: "keyboard1" }]
    : [
      ...activeKeyboardConfigs(),
      ...phoneControllers.filter((item) => item.connected).map((item) => ({ id: item.id, name: item.name, source: "phone", connected: true }))
    ];
  if (selectionMode === "local" && (configs.length < 2 || configs.length > maxPlayers)) {
    setupMessage.textContent = "ต้องมีผู้เล่นที่พร้อมใช้งาน 2–5 คน";
    return;
  }
  mode = selectionMode;
  characterSelectionMode = selectionMode;
  characterSelectionConfigs = configs.map((config) => ({ ...config, characterId: null }));
  characterSelectionIndex = 0;
  closeCharacterDetails();
  showScreen(characterScreen);
  renderCharacterSelection();
}

function startRound() {
  stopRoundActivity();
  resetRoundState();
  showScreen(gameScreen);
  gameRunning = true;
  setMessage(mode === "solo" ? "เดินด้วย WASD/ลูกศร • E โต้ตอบ • Q ใช้สกิล" : "ช่วยกันทำอาหาร • โต้ตอบด้วยปุ่มของผู้เล่น • ใช้สกิลด้วย Q หรือ \\");
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
  orderGenerationId = window.setInterval(generateOrder, customerArrivalInterval);
  lastFrameAt = undefined;
  animationId = requestAnimationFrame(gameLoop);
}

function startSoloGame(characterId = characterDefinitions[0].id) {
  mode = "solo";
  clearPlayers();
  players.push(createPlayer({ id: "solo", name: "คุณ", source: "keyboard1", characterId }, 0));
  startRound();
}

function activeKeyboardConfigs() {
  const configs = [];
  if (keyboard1Enabled.checked) configs.push({ id: "keyboard-1", name: sanitizeName(keyboard1Name.value, "ผู้เล่น 1"), source: "keyboard1" });
  if (keyboard2Enabled.checked) configs.push({ id: "keyboard-2", name: sanitizeName(keyboard2Name.value, "ผู้เล่น 2"), source: "keyboard2" });
  return configs;
}

function startLocalGame(selectedConfigs = null) {
  const configs = selectedConfigs || [
    ...activeKeyboardConfigs(),
    ...phoneControllers.filter((item) => item.connected).map((item) => ({ id: item.id, name: item.name, source: "phone", connected: true }))
  ];
  if (configs.length < 2 || configs.length > maxPlayers) {
    setupMessage.textContent = "ต้องมีผู้เล่นที่พร้อมใช้งาน 2–5 คน";
    return;
  }
  mode = "local";
  clearPlayers();
  players = configs.map((config, index) => createPlayer({ ...config, characterId: config.characterId || characterDefinitions[index % characterDefinitions.length].id }, index));
  startRound();
}

function confirmCharacterSelection() {
  const currentConfig = characterSelectionConfigs[characterSelectionIndex];
  if (!currentConfig || !pendingCharacterId) return;
  currentConfig.characterId = pendingCharacterId;
  closeCharacterDetails();
  if (characterSelectionIndex < characterSelectionConfigs.length - 1) {
    characterSelectionIndex += 1;
    renderCharacterSelection();
    return;
  }
  const selectedConfigs = characterSelectionConfigs.map((config) => ({ ...config }));
  characterSelectionConfigs = [];
  if (characterSelectionMode === "solo") startSoloGame(selectedConfigs[0].characterId);
  else startLocalGame(selectedConfigs);
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
  if (soundEnabled && (!startScreen.hidden || !multiplayerScreen.hidden || !characterScreen.hidden)) syncLobbyMusic(true);
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
  [startScreen, multiplayerScreen, characterScreen, gameScreen, resultsScreen].forEach((item) => { item.hidden = item !== screen; });
  if (screen !== gameScreen) clearFullscreenPresentation();
  if (screen !== gameScreen) riceChoices.replaceChildren();
  syncLobbyMusic(screen === startScreen || screen === multiplayerScreen || screen === characterScreen);
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
        else if (action === "skill") usePlayerSkill(player);
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
  closeCharacterDetails();
  characterSelectionConfigs = [];
  clearCustomers();
  orders = [];
  renderOrders();
  clearPlayers();
  showScreen(startScreen);
}

function replayGame() {
  if (mode === "solo") {
    startCharacterSelection("solo");
    return;
  }
  stopRoundActivity();
  clearPlayers();
  relaySocket?.emit("local-host:phase", { phase: "lobby" });
  setupMessage.textContent = "ทีมเดิมพร้อมแล้ว ปรับผู้เล่นหรือเริ่มรอบใหม่ได้เลย";
  renderLocalSetup();
  showScreen(multiplayerScreen);
}

function cancelCharacterSelection() {
  closeCharacterDetails();
  characterSelectionConfigs = [];
  if (characterSelectionMode === "local") {
    renderLocalSetup();
    showScreen(multiplayerScreen);
  } else {
    showScreen(startScreen);
  }
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

function playerForSkillKey(key) {
  if (mode === "solo") return key === keyboardControls.keyboard1.skill ? players[0] : null;
  return players.find((player) => player.source.startsWith("keyboard") && keyboardControls[player.source].skill === key);
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

playButton.addEventListener("click", () => startCharacterSelection("solo"));
multiplayerButton.addEventListener("click", setupLocalGame);
startLocalButton.addEventListener("click", () => startCharacterSelection("local"));
connectPhonesButton.addEventListener("click", connectPhoneRelay);
backButton.addEventListener("click", () => { closeLocalSession(); showScreen(startScreen); });
playAgainButton.addEventListener("click", replayGame);
resultsButton.addEventListener("click", exitGame);
exitGameButton.addEventListener("click", exitGame);
characterBackButton.addEventListener("click", cancelCharacterSelection);
characterModalClose.addEventListener("click", closeCharacterDetails);
characterCancelButton.addEventListener("click", closeCharacterDetails);
characterConfirmButton.addEventListener("click", confirmCharacterSelection);
fullscreenButton.addEventListener("click", toggleFullscreen);
lanAddress.addEventListener("change", renderJoinOption);
[keyboard1Enabled, keyboard2Enabled].forEach((input) => input.addEventListener("change", renderLocalSetup));
[keyboard1Name, keyboard2Name].forEach((input) => input.addEventListener("input", renderLocalSetup));
mobileInteractButton.addEventListener("click", () => interactPlayer(players[0]));
mobileSkillButton.addEventListener("click", () => usePlayerSkill(players[0]));
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
  if (!multiplayerScreen.hidden || !characterScreen.hidden) syncLobbyMusic(true);
  if (!gameScreen.hidden) syncGameMusic(true);
});
window.addEventListener("keydown", (event) => {
  if (!startScreen.hidden) syncLobbyMusic(true);
  if (!gameScreen.hidden) syncGameMusic(true);
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "enter", "\\"].includes(key) && !gameScreen.hidden) event.preventDefault();
  if (!gameRunning && !characterScreen.hidden && key === "escape") {
    if (characterDetailModal.hidden) cancelCharacterSelection();
    else closeCharacterDetails();
    return;
  }
  if (!gameRunning) return;
  if (key === "escape") {
    players.filter((player) => player.riceChoice).forEach(cancelRiceChoice);
    return;
  }
  if (handleRiceNavigation(key)) return;
  const skillPlayer = playerForSkillKey(key);
  if (skillPlayer && !event.repeat) {
    usePlayerSkill(skillPlayer);
    return;
  }
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
renderOrders();
showScreen(startScreen);
