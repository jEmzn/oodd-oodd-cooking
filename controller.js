const joinView = document.querySelector("#join-view");
const controlsView = document.querySelector("#controls-view");
const sessionCodeInput = document.querySelector("#session-code");
const controllerNameInput = document.querySelector("#controller-name");
const joinButton = document.querySelector("#join-button");
const joinMessage = document.querySelector("#join-message");
const playerName = document.querySelector("#player-name");
const playerColor = document.querySelector("#player-color");
const phaseLabel = document.querySelector("#phase-label");
const controllerMessage = document.querySelector("#controller-message");
const riceController = document.querySelector("#rice-controller");
const gameControls = document.querySelector("#game-controls");
const interactButton = document.querySelector("#interact-button");
const skillButton = document.querySelector("#skill-button");
const directionButtons = [...document.querySelectorAll("[data-direction]")];
const actionButtons = [...document.querySelectorAll("[data-action]")];
const socket = io();
const input = { left: false, right: false, up: false, down: false };
const querySession = new URLSearchParams(location.search).get("session") || "";
let currentSession = querySession.toUpperCase();
let joined = false;
let latestState = { phase: "lobby", canChooseRice: false };

sessionCodeInput.value = currentSession;
controllerNameInput.value = localStorage.getItem("oodd-controller-name") || "";

function tokenKey() {
  return `oodd-controller-token-${currentSession}`;
}

function emitInput() {
  if (joined && socket.connected) socket.emit("local-controller:input", input);
}

function releaseDirections() {
  Object.keys(input).forEach((direction) => { input[direction] = false; });
  directionButtons.forEach((button) => button.classList.remove("pressed"));
  emitInput();
}

function renderState(state = {}) {
  latestState = { ...latestState, ...state };
  if (latestState.name) playerName.textContent = latestState.name;
  if (latestState.color) playerColor.style.background = latestState.color;
  if (latestState.message) controllerMessage.textContent = latestState.message;
  const labels = { lobby: "กำลังรอเจ้าบ้านเริ่มเกม", playing: "กำลังทำอาหาร", results: "จบรอบแล้ว" };
  phaseLabel.textContent = labels[latestState.phase] || labels.lobby;
  riceController.hidden = !latestState.canChooseRice;
  gameControls.hidden = latestState.phase !== "playing" || latestState.canChooseRice;
  skillButton.disabled = latestState.phase !== "playing" || latestState.recovering || latestState.canUseSkill === false;
  skillButton.textContent = latestState.recovering
    ? `พักฟื้น ${latestState.recoveryRemaining || 0}`
    : latestState.skillCooldownRemaining > 0
      ? `สกิล ${latestState.skillCooldownRemaining}`
      : "สกิล";
  if (latestState.phase !== "playing") releaseDirections();
}

function joinSession() {
  currentSession = sessionCodeInput.value.trim().toUpperCase();
  const name = controllerNameInput.value.trim();
  if (!currentSession || !name) {
    joinMessage.textContent = "กรุณาใส่รหัสห้องและชื่อผู้เล่น";
    return;
  }
  joinButton.disabled = true;
  joinMessage.textContent = "กำลังเชื่อมต่อ...";
  socket.emit("local-controller:join", {
    sessionCode: currentSession,
    name,
    reconnectToken: localStorage.getItem(tokenKey())
  }, (result) => {
    joinButton.disabled = false;
    if (!result?.ok) {
      joinMessage.textContent = result?.error || "เชื่อมต่อไม่สำเร็จ";
      return;
    }
    joined = true;
    localStorage.setItem("oodd-controller-name", name);
    localStorage.setItem(tokenKey(), result.reconnectToken);
    playerName.textContent = name;
    joinView.hidden = true;
    controlsView.hidden = false;
    renderState({ phase: result.phase, name });
  });
}

directionButtons.forEach((button) => {
  const direction = button.dataset.direction;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    input[direction] = true;
    button.classList.add("pressed");
    try { button.setPointerCapture?.(event.pointerId); } catch (error) { /* Synthetic or cancelled pointers have no active capture. */ }
    emitInput();
  });
  const release = (event) => {
    event?.preventDefault();
    input[direction] = false;
    button.classList.remove("pressed");
    emitInput();
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

joinButton.addEventListener("click", joinSession);
controllerNameInput.addEventListener("keydown", (event) => { if (event.key === "Enter") joinSession(); });
interactButton.addEventListener("click", () => socket.emit("local-controller:action", { action: "interact" }));
actionButtons.forEach((button) => button.addEventListener("click", () => socket.emit("local-controller:action", { action: button.dataset.action })));
socket.on("local-controller:state", renderState);
socket.on("local-controller:closed", ({ message }) => {
  joined = false;
  releaseDirections();
  controlsView.hidden = true;
  joinView.hidden = false;
  joinMessage.textContent = message;
});
socket.on("disconnect", () => {
  releaseDirections();
  if (joined) controllerMessage.textContent = "การเชื่อมต่อขาดหาย กำลังเชื่อมต่อกลับ...";
});
socket.on("connect", () => {
  if (joined) joinSession();
});
window.addEventListener("blur", releaseDirections);
document.addEventListener("visibilitychange", () => { if (document.hidden) releaseDirections(); });
window.setInterval(emitInput, 1000);
document.addEventListener("contextmenu", (event) => event.preventDefault());
