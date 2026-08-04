const startScreen = document.querySelector("#start-screen");
const gameScreen = document.querySelector("#game-screen");
const playButton = document.querySelector("#play-button");
const svg = document.querySelector("#game-world");
const player = document.querySelector("#player");
const interactionPrompt = document.querySelector("#interaction-prompt");
const timerElement = document.querySelector("#timer");
const scoreElement = document.querySelector("#score");
const messageElement = document.querySelector("#game-message");
const objects = [...document.querySelectorAll(".object")].map((element) => ({
  element,
  name: element.dataset.object,
  x: Number(element.dataset.x),
  y: Number(element.dataset.y),
  score: 0,
}));

const playerState = { x: 490, y: 150, speed: 4.5, radius: 32 };
const keys = new Set();
let score = 0;
let secondsLeft = 30;
let timerId;
let animationId;
let gameRunning = false;

function setPlayerPosition() {
  player.setAttribute("transform", `translate(${playerState.x} ${playerState.y})`);
}

function nearestObject() {
  return objects.reduce((nearest, object) => {
    const distance = Math.hypot(playerState.x - object.x, playerState.y - object.y);
    return distance < nearest.distance ? { object, distance } : nearest;
  }, { object: null, distance: Infinity });
}

function updatePrompt() {
  const nearest = nearestObject();
  const isClose = nearest.object && nearest.distance < playerState.radius + 72;
  if (isClose) {
    interactionPrompt.setAttribute("transform", `translate(${nearest.object.x} ${nearest.object.y - 95})`);
    interactionPrompt.setAttribute("opacity", "1");
    messageElement.textContent = `You are near the ${nearest.object.name}. Press E to interact.`;
  } else {
    interactionPrompt.setAttribute("opacity", "0");
    messageElement.textContent = "Use WASD or arrow keys to move. Press E near an object.";
  }
}

function interact() {
  if (!gameRunning) return;
  const nearest = nearestObject();
  if (!nearest.object || nearest.distance >= playerState.radius + 72) {
    messageElement.textContent = "Move closer to a table, freezer, or chair first.";
    return;
  }
  nearest.object.score += 1;
  score += 1;
  scoreElement.textContent = score;
  const label = nearest.object.element.querySelector(`[data-label="${nearest.object.name}-score"]`);
  label.textContent = `${nearest.object.score} interaction${nearest.object.score === 1 ? "" : "s"}`;
  messageElement.textContent = `Nice! You interacted with the ${nearest.object.name}.`;
}

function movePlayer() {
  if (!gameRunning) return;
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    playerState.x = Math.max(65, Math.min(935, playerState.x + (dx / length) * playerState.speed));
    playerState.y = Math.max(105, Math.min(555, playerState.y + (dy / length) * playerState.speed));
    setPlayerPosition();
    updatePrompt();
  }
  animationId = requestAnimationFrame(movePlayer);
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  window.setTimeout(() => {
    gameScreen.hidden = true;
    startScreen.hidden = false;
  }, 700);
}

function startGame() {
  startScreen.hidden = true;
  gameScreen.hidden = false;
  gameRunning = true;
  score = 0;
  secondsLeft = 30;
  playerState.x = 490;
  playerState.y = 150;
  scoreElement.textContent = score;
  timerElement.textContent = secondsLeft;
  timerElement.classList.remove("warning");
  objects.forEach((object) => {
    object.score = 0;
    object.element.querySelector(`[data-label="${object.name}-score"]`).textContent = "0 interactions";
  });
  setPlayerPosition();
  updatePrompt();
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    secondsLeft -= 1;
    timerElement.textContent = secondsLeft;
    if (secondsLeft <= 10) timerElement.classList.add("warning");
    if (secondsLeft <= 0) endGame();
  }, 1000);
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(movePlayer);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) event.preventDefault();
  if (key === "e") interact();
  keys.add(key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
playButton.addEventListener("click", startGame);

