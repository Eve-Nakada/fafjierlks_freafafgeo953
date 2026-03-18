function setupKeyboardInput() {
  window.addEventListener("keydown", (e) => {
    STATE.input.keys[e.key.toLowerCase()] = true;

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    STATE.input.keys[e.key.toLowerCase()] = false;
  });
}

function resetMoveInput() {
  STATE.input.moveX = 0;
  STATE.input.moveY = 0;
  STATE.input.joystickMoveX = 0;
  STATE.input.joystickMoveY = 0;
}

function isInteractiveElement(target) {
  if (!target) return false;

  // ゲーム中の移動入力を止めたいものだけを明示的に除外
  if (target.closest("button, input, select, textarea, label")) return true;
  if (target.closest(".scrollArea")) return true;

  // モーダル系スクリーン上はスティック開始しない
  const activeScreen = target.closest(".screen.active");
  if (activeScreen) return true;

  return false;
}

function setupJoystickInput() {
  const overlay = document.getElementById("mobileControls");
  const base = document.getElementById("joystickBase");
  const stick = document.getElementById("joystickStick");

  if (!overlay || !base || !stick) return;

  function isMobilePlayable() {
    return window.innerWidth <= 900;
  }

  function setStick(dx, dy) {
    const max = 30;
    const len = Math.hypot(dx, dy) || 1;

    let x = dx;
    let y = dy;

    if (Math.hypot(x, y) > max) {
      x = (dx / len) * max;
      y = (dy / len) * max;
    }

    stick.style.left = `${31 + x}px`;
    stick.style.top = `${31 + y}px`;

    const nx = x / max;
    const ny = y / max;

    STATE.input.joystickMoveX = nx;
    STATE.input.joystickMoveY = ny;
    STATE.input.moveX = nx;
    STATE.input.moveY = ny;
  }

  function placeBase(cx, cy) {
    base.style.left = `${cx - 59}px`;
    base.style.top = `${cy - 59}px`;
    base.classList.add("active");
    STATE.input.joystickCenterX = cx;
    STATE.input.joystickCenterY = cy;
  }

  function updateFromClient(clientX, clientY) {
    const dx = clientX - STATE.input.joystickCenterX;
    const dy = clientY - STATE.input.joystickCenterY;
    setStick(dx, dy);
  }

  function releaseStick() {
    STATE.input.joystickActive = false;
    STATE.input.pointerId = null;
    base.classList.remove("active");
    base.style.left = "-9999px";
    base.style.top = "-9999px";
    stick.style.left = "31px";
    stick.style.top = "31px";
    resetMoveInput();
  }

  function canStartJoystick(target) {
    if (!isMobilePlayable()) return false;
    if (STATE.paused) return false;
    if (STATE.input.joystickActive) return false;
    if (isInteractiveElement(target)) return false;
    return true;
  }

  window.addEventListener("pointerdown", (e) => {
    if (!canStartJoystick(e.target)) return;

    STATE.input.joystickActive = true;
    STATE.input.pointerId = e.pointerId;

    placeBase(e.clientX, e.clientY);
    updateFromClient(e.clientX, e.clientY);
    e.preventDefault();
  }, { passive: false });

  window.addEventListener("pointermove", (e) => {
    if (!STATE.input.joystickActive) return;
    if (STATE.input.pointerId !== e.pointerId) return;

    updateFromClient(e.clientX, e.clientY);
    e.preventDefault();
  }, { passive: false });

  window.addEventListener("pointerup", (e) => {
    if (!STATE.input.joystickActive) return;
    if (STATE.input.pointerId !== e.pointerId) return;
    releaseStick();
  });

  window.addEventListener("pointercancel", (e) => {
    if (!STATE.input.joystickActive) return;
    if (STATE.input.pointerId !== e.pointerId) return;
    releaseStick();
  });

  window.addEventListener("blur", () => {
    if (STATE.input.joystickActive) releaseStick();
  });
}

function setupGameShortcuts() {
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();

    if (k === "u") toggleUiMode();
    if (k === "x") {
      absorbAllXP();
      updateHUD();
    }
    if (k === "escape" && STATE.shopOpen) {
      closeShop();
    }
    if (k === "f2" && typeof toggleTestModePanel === 'function') {
      e.preventDefault();
      toggleTestModePanel();
    }
  });
}

function setupInput() {
  setupKeyboardInput();
  setupJoystickInput();
  setupGameShortcuts();
}
