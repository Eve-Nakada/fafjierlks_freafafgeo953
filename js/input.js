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
}

function isInteractiveElement(target) {
  if (!target) return false;
  return !!target.closest("button, .scrollArea, .screen.active");
}

function setupJoystickInput() {
  const overlay = document.getElementById("mobileControls");
  const base = document.getElementById("joystickBase");
  const stick = document.getElementById("joystickStick");

  if (!overlay || !base || !stick) return;

  function setStick(dx, dy) {
    const max = 30;
    const len = Math.hypot(dx, dy);

    let x = dx;
    let y = dy;

    if (len > max) {
      x = (dx / len) * max;
      y = (dy / len) * max;
    }

    stick.style.left = `${31 + x}px`;
    stick.style.top = `${31 + y}px`;

    STATE.input.moveX = x / max;
    STATE.input.moveY = y / max;
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

  window.addEventListener("pointerdown", (e) => {
    if (window.innerWidth > 900) return;
    if (STATE.paused) return;
    if (STATE.input.joystickActive) return;
    if (isInteractiveElement(e.target)) return;

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
