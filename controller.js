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
const mathWaiting = document.querySelector("#math-waiting");
const riceController = document.querySelector("#rice-controller");
const gameControls = document.querySelector("#game-controls");
const interactButton = document.querySelector("#interact-button");
const skillButton = document.querySelector("#skill-button");
const discardButton = document.querySelector("#discard-button");
const leaveButton = document.querySelector("#leave-button");
const leaveConfirmation = document.querySelector("#leave-confirmation");
const cancelLeaveButton = document.querySelector("#cancel-leave-button");
const confirmLeaveButton = document.querySelector("#confirm-leave-button");
const directionButtons = [...document.querySelectorAll("[data-direction]")];
const actionButtons = [...document.querySelectorAll("[data-action]")];
const socket = io();
const input = { left: false, right: false, up: false, down: false };
const querySession = new URLSearchParams(location.search).get("session") || "";
let currentSession = querySession.toUpperCase();
let joined = false;
let latestState = { phase: "lobby", canChooseRice: false, mathChallengeActive: false };

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

function resetToJoin(message, { clearToken = true } = {}) {
  joined = false;
  releaseDirections();
  if (clearToken && currentSession) localStorage.removeItem(tokenKey());
  latestState = { phase: "lobby", canChooseRice: false };
  leaveConfirmation.hidden = true;
  controlsView.hidden = true;
  joinView.hidden = false;
  joinMessage.textContent = message;
}

function renderState(state = {}) {
  const wasMathChallengeActive = latestState.mathChallengeActive;
  latestState = { ...latestState, ...state };
  if (latestState.name) playerName.textContent = latestState.name;
  if (latestState.color) playerColor.style.background = latestState.color;
  if (latestState.message) controllerMessage.textContent = latestState.message;
  const labels = { lobby: "กำลังรอเจ้าบ้านเริ่มเกม", playing: "กำลังทำอาหาร", results: "จบรอบแล้ว" };
  phaseLabel.textContent = latestState.mathChallengeActive ? "เจ้าของห้องกำลังแก้โจทย์" : labels[latestState.phase] || labels.lobby;
  mathWaiting.hidden = !latestState.mathChallengeActive;
  riceController.hidden = latestState.mathChallengeActive || !latestState.canChooseRice;
  gameControls.hidden = latestState.mathChallengeActive || latestState.phase !== "playing" || latestState.canChooseRice;
  skillButton.disabled = latestState.mathChallengeActive || latestState.phase !== "playing" || latestState.recovering || latestState.canUseSkill === false;
//   const labels = { lobby: "กำลังรอเจ้าบ้านเริ่มเกม", selecting: "เจ้าบ้านกำลังเลือกตัวละคร", playing: "กำลังทำอาหาร", results: "จบรอบแล้ว" };
//   phaseLabel.textContent = labels[latestState.phase] || labels.lobby;
//   riceController.hidden = !latestState.canChooseRice;
//   gameControls.hidden = latestState.phase !== "playing" || latestState.canChooseRice;
//   skillButton.disabled = latestState.phase !== "playing" || latestState.recovering || latestState.canUseSkill === false;
  skillButton.textContent = latestState.recovering
    ? `พักฟื้น ${latestState.recoveryRemaining || 0}`
    : latestState.skillCooldownRemaining > 0
      ? `สกิล ${latestState.skillCooldownRemaining}`
      : "สกิล";
  if (latestState.phase !== "playing" || (!wasMathChallengeActive && latestState.mathChallengeActive)) releaseDirections();
}

function joinSession() {
  const wasRejoining = joined;
  currentSession = sessionCodeInput.value.trim().toUpperCase();
  const name = controllerNameInput.value.trim();
  if (!currentSession || !name) {
    joinMessage.textContent = "กรุณาใส่รหัสห้องและชื่อผู้เล่น";
    return;
  }
  joinButton.disabled = true;
  joinMessage.textContent = "กำลังเชื่อมต่อ...";
  const reconnectToken = localStorage.getItem(tokenKey());
  socket.emit("local-controller:join", {
    sessionCode: currentSession,
    name,
    reconnectToken
  }, (result) => {
    joinButton.disabled = false;
    if (!result?.ok) {
      if (reconnectToken) localStorage.removeItem(tokenKey());
      if (wasRejoining) {
        resetToJoin(result?.error || "เชื่อมต่อกลับไม่สำเร็จ");
        return;
      }
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

function leaveSession() {
  releaseDirections();
  leaveConfirmation.hidden = true;
  if (!socket.connected) {
    resetToJoin("ออกจากห้องแล้ว");
    return;
  }
  confirmLeaveButton.disabled = true;
  socket.emit("local-controller:leave", {}, (result) => {
    confirmLeaveButton.disabled = false;
    if (result?.ok) resetToJoin("ออกจากห้องแล้ว");
    else resetToJoin(result?.error || "ออกจากห้องแล้ว");
  });
}

directionButtons.forEach((button) => {
  const direction = button.dataset.direction;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (latestState.mathChallengeActive) return;
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
interactButton.addEventListener("click", () => {
  if (!latestState.mathChallengeActive) socket.emit("local-controller:action", { action: "interact" });
});
actionButtons.forEach((button) => button.addEventListener("click", () => {
  if (!latestState.mathChallengeActive) socket.emit("local-controller:action", { action: button.dataset.action });
}));
socket.on("local-controller:state", renderState);
socket.on("local-controller:closed", ({ message }) => {
  joined = false;
  releaseDirections();
  leaveConfirmation.hidden = false;
});
cancelLeaveButton.addEventListener("click", () => { leaveConfirmation.hidden = true; });
confirmLeaveButton.addEventListener("click", leaveSession);
socket.on("local-controller:state", renderState);
socket.on("local-controller:closed", ({ message }) => resetToJoin(message || "ห้องถูกปิดแล้ว"));
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
