// ===============================
// プレイヤー
// ===============================

function createPlayer() {
  return {
    x: STATE.world.width * 0.5,
    y: STATE.world.height * 0.5,
    r: 18,

    hp: 100,
    maxHp: 100,

    level: 1,
    xp: 0,
    gold: 0,

    baseSpeed: 180,
    dirIndex: 2,

    invincibleTimer: 0,
    damageFlash: 0,

    weapons: [],
    passives: [],
    passiveLevels: {},

    stats: {
      damageMul: 1,
      cooldownMul: 1,
      areaMul: 1,
      moveMul: 1,
      projectileSpeedMul: 1,
      pickupRange: 90,
      luck: 0,
      armor: 0,
      regen: 0
    }
  };
}

function getPlayerSpeed() {
  if (!STATE.player) return 0;
  return STATE.player.baseSpeed * STATE.player.stats.moveMul;
}

function updatePlayer(dt) {
  const p = STATE.player;
  if (!p) return;

  let mx = STATE.input.moveX || 0;
  let my = STATE.input.moveY || 0;

  if (STATE.input.keys["a"] || STATE.input.keys["arrowleft"])  mx -= 1;
  if (STATE.input.keys["d"] || STATE.input.keys["arrowright"]) mx += 1;
  if (STATE.input.keys["w"] || STATE.input.keys["arrowup"])    my -= 1;
  if (STATE.input.keys["s"] || STATE.input.keys["arrowdown"])  my += 1;

  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
  }

  const prevX = p.x;
  const prevY = p.y;

  p.x += mx * getPlayerSpeed() * dt;
  p.y += my * getPlayerSpeed() * dt;

  resolvePlayerMapCollision(prevX, prevY);

  p.x = clamp(p.x, p.r, STATE.world.width - p.r);
  p.y = clamp(p.y, p.r, STATE.world.height - p.r);

  // 画像順: 下 右 左 上
  if (Math.abs(mx) > Math.abs(my)) {
    if (mx > 0) p.dirIndex = 2; // 右
    else if (mx < 0) p.dirIndex = 1; // 左
  } else if (Math.abs(my) > 0.001) {
    if (my > 0) p.dirIndex = 0; // 下
    else if (my < 0) p.dirIndex = 3; // 上
  }

  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.damageFlash > 0) p.damageFlash -= dt;

  if (p.stats.regen > 0 && p.hp > 0) {
    p.hp = Math.min(p.maxHp, p.hp + p.stats.regen * dt);
  }

  updatePlayerPassives();
  renderPlayerUiIcon();
}

function damagePlayer(amount) {
  const p = STATE.player;
  if (!p) return;
  if (p.invincibleTimer > 0) return;

  const reduced = Math.max(1, amount - p.stats.armor);
  p.hp -= reduced;
  p.invincibleTimer = 0.35;
  p.damageFlash = 0.25;
}

function healPlayer(amount) {
  const p = STATE.player;
  if (!p) return;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

function gainXP(amount) {
  const p = STATE.player;
  if (!p) return;

  p.xp += amount;

  while (p.xp >= requiredXP(p.level)) {
    p.xp -= requiredXP(p.level);
    p.level += 1;
    STATE.levelUpQueue += 1;
    STATE.score += 100;
  }
}

function addGold(amount) {
  const p = STATE.player;
  if (!p) return;
  p.gold += amount;
}

function getPassiveDef(id) {
  return (STATE.gameData?.passives || []).find(p => p.id === id) || null;
}

function getPassiveLevel(id) {
  return STATE.player?.passiveLevels?.[id] || 0;
}

function canLevelPassive(id) {
  const def = getPassiveDef(id);
  if (!def) return false;
  const lv = getPassiveLevel(id);
  const maxLv = def.maxLevel || (Array.isArray(def.levelDesc) ? def.levelDesc.length : 3);
  return lv < maxLv;
}

function addPassive(id) {
  const p = STATE.player;
  const def = getPassiveDef(id);
  if (!p || !def) return false;

  const curLv = p.passiveLevels[id] || 0;
  const maxLv = def.maxLevel || (Array.isArray(def.levelDesc) ? def.levelDesc.length : 3);
  if (curLv >= maxLv) return false;

  p.passiveLevels[id] = curLv + 1;

  if (!p.passives.includes(id)) {
    p.passives.push(id);
  }

  applyPassiveImmediateEffect(id, p.passiveLevels[id]);
  updatePlayerPassives();
  return true;
}

function applyPassiveImmediateEffect(id, level) {
  const p = STATE.player;
  if (!p) return;

  if (id === "shell") {
    p.maxHp = 100 + level * 20;
    p.hp = Math.min(p.maxHp, p.hp + 20);
  }

  if (id === "chart") {
    p.stats.pickupRange = 90 + level * 12;
  }

  if (id === "thruster") {
    p.stats.moveMul = 1 + level * 0.10;
  }

  if (id === "core") {
    p.stats.damageMul = 1 + level * 0.10;
  }

  if (id === "battery") {
    p.stats.cooldownMul = 1 + level * 0.10;
  }

  if (id === "sonar_scope") {
    p.stats.projectileSpeedMul = 1 + level * 0.12;
  }

  if (id === "pressure_fin") {
    p.stats.areaMul = 1 + level * 0.10;
  }

  if (id === "med_kit") {
    p.stats.regen = level * 0.6;
  }

  if (id === "armor_plate") {
    p.stats.armor = level * 1.5;
  }
}

function updatePlayerPassives() {
  const p = STATE.player;
  if (!p) return;

  const levels = p.passiveLevels || {};

  p.stats.damageMul = 1 + (levels.core || 0) * 0.10;
  p.stats.cooldownMul = 1 + (levels.battery || 0) * 0.10;
  p.stats.areaMul = 1 + (levels.pressure_fin || 0) * 0.10;
  p.stats.moveMul = 1 + (levels.thruster || 0) * 0.10;
  p.stats.projectileSpeedMul = 1 + (levels.sonar_scope || 0) * 0.12;
  p.stats.pickupRange = 90 + (levels.chart || 0) * 12;
  p.stats.armor = (levels.armor_plate || 0) * 1.5;
  p.stats.regen = (levels.med_kit || 0) * 0.6;

  p.maxHp = 100 + (levels.shell || 0) * 20;
  p.hp = Math.min(p.hp, p.maxHp);
}

function getPlayerScreenPos() {
  return {
    x: STATE.player.x - STATE.camera.x,
    y: STATE.player.y - STATE.camera.y
  };
}

function renderPlayer(ctx) {
  const p = STATE.player;
  if (!p) return;

  const pos = getPlayerScreenPos();
  const x = pos.x;
  const y = pos.y;

  ctx.save();

  if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 20) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  const ok = drawDirectionalSprite(
    ctx,
    "player",
    p.dirIndex,
    x - 24,
    y - 24,
    48,
    48
  );

  if (!ok) {
    ctx.fillStyle = p.damageFlash > 0 ? "#ff9b9b" : "#8de8ff";
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  renderPlayerHpBar(ctx, x, y);
}

function renderPlayerHpBar(ctx, x, y) {
  const p = STATE.player;
  const w = 42;
  const h = 5;
  const ratio = clamp(p.hp / p.maxHp, 0, 1);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - w * 0.5, y - 34, w, h);

  ctx.fillStyle = ratio < 0.3 ? "#ff6b6b" : "#79ff9a";
  ctx.fillRect(x - w * 0.5, y - 34, w * ratio, h);
}
