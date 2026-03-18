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

    rerollTickets: 0,
    shopMaxHpBonus: 0,
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
  const mapSlowMul = getMapSlowMulAt(p.x, p.y);
  const moveSpeed = getPlayerSpeed() * mapSlowMul;

  p.x += mx * moveSpeed * dt;
  p.y += my * moveSpeed * dt;

  resolvePlayerMapCollision(prevX, prevY);

  if (typeof resolvePlayerBossHazardCollision === 'function') {
    resolvePlayerBossHazardCollision(prevX, prevY);
  }

  applyMapCurrent(dt, prevX, prevY);

  p.x = clamp(p.x, p.r, STATE.world.width - p.r);
  p.y = clamp(p.y, p.r, STATE.world.height - p.r);

  // 画像順: 下 右 左 上
  if (Math.abs(mx) > Math.abs(my)) {
    if (mx > 0) p.dirIndex = 2;
    else if (mx < 0) p.dirIndex = 1;
  } else if (Math.abs(my) > 0.001) {
    if (my > 0) p.dirIndex = 0;
    else if (my < 0) p.dirIndex = 3;
  }

  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.damageFlash > 0) p.damageFlash -= dt;

  if (p.stats.regen > 0 && p.hp > 0) {
    p.hp = Math.min(p.maxHp, p.hp + p.stats.regen * dt);
  }

  updatePlayerPassives();
  renderPlayerUiIcon();
}

function updateDronesFromPassives() {
  const p = STATE.player;
  if (!p) return;

  syncAttackDrones();
  syncBarrierDrones();
}

function syncAttackDrones() {
  const lv = getPassiveLevel("attack_drone");
  const pattern = getPassiveCurrentPattern("attack_drone");
  const balance = getPassiveBalanceLevel("attack_drone");
  const drones = ensureDroneArray();
  let existing = drones.filter(d => d.type === "attack");

  if (lv <= 0 || !balance) {
    STATE.drones = drones.filter(d => d.type !== "attack");
    return;
  }

  // 追加仕様: Lv1から2台
  const count = Math.max(2, balance.count || 1);

  while (existing.length < count) {
    const idx = existing.length;
    const maxHp = balance.hp || 10;
    const d = {
      type: "attack",
      index: idx,
      pattern,
      x: STATE.player.x,
      y: STATE.player.y,
      r: 14,
      fireCooldown: 0.12,
      aimAngle: 0,
      deadTimer: 0,
      hp: maxHp,
      maxHp: maxHp,
      shieldHp: 0,
      shieldMaxHp: 0
    };
    drones.push(d);
    existing.push(d);
  }

  for (let i = existing.length - 1; i >= count; i--) {
    const idx = drones.indexOf(existing[i]);
    if (idx >= 0) drones.splice(idx, 1);
    existing.pop();
  }

  existing.forEach((d, i) => {
    d.index = i;
    d.pattern = pattern;
    d.atk = balance.atk || 0;
    d.burstCount = balance.burstCount || 1;
    d.pierce = balance.pierce || 1;
    d.doubleBarrel = !!balance.doubleBarrel;
    d.fireCooldownBase = balance.fireCooldown || 0.6;

    const prevMax = d.maxHp || 0;
    d.maxHp = balance.hp || prevMax || 10;

    if (d.hp == null) {
      d.hp = d.maxHp;
    } else if (d.maxHp > prevMax) {
      // レベルアップで全回復
      d.hp = d.maxHp;
    } else {
      d.hp = Math.min(d.hp, d.maxHp);
    }
  });
}

function syncBarrierDrones() {
  const lv = getPassiveLevel("barrier_drone");
  const pattern = getPassiveCurrentPattern("barrier_drone");
  const balance = getPassiveBalanceLevel("barrier_drone");
  const drones = ensureDroneArray();
  let existing = drones.filter(d => d.type === "barrier");

  if (lv <= 0 || !balance) {
    STATE.drones = drones.filter(d => d.type !== "barrier");
    return;
  }

  const count = balance.count || 1;

  while (existing.length < count) {
    const idx = existing.length;
    const d = {
      type: "barrier",
      index: idx,
      pattern,
      x: STATE.player.x,
      y: STATE.player.y,
      r: 16,
      angle: (Math.PI * 2 / count) * idx,
      deadTimer: 0,
      fieldTick: 0,
      hp: balance.hp || 50,
      maxHp: balance.hp || 50,
      shieldHp: balance.shieldHp || 0,
      shieldMaxHp: balance.shieldHp || 0
    };
    drones.push(d);
    existing.push(d);
  }

  for (let i = existing.length - 1; i >= count; i--) {
    const idx = drones.indexOf(existing[i]);
    if (idx >= 0) drones.splice(idx, 1);
    existing.pop();
  }

  existing.forEach((d, i) => {
    d.index = i;
    d.pattern = pattern;
    d.orbitRadius = balance.orbitRadius || 40;
    d.orbitSpeed = balance.orbitSpeed || 2.0;
    d.fieldRadius = balance.fieldRadius || 0;
    d.shieldArc = balance.shieldArc || 0;

    const prevMax = d.maxHp || 0;
    d.maxHp = balance.hp || prevMax || 50;

    if (d.hp == null) {
      d.hp = d.maxHp;
    } else if (d.maxHp > prevMax) {
      d.hp = Math.min(d.maxHp, d.hp + (d.maxHp - prevMax));
    } else {
      d.hp = Math.min(d.hp, d.maxHp);
    }

    const prevShieldMax = d.shieldMaxHp || 0;
    d.shieldMaxHp = balance.shieldHp || 0;

    if (d.shieldMaxHp <= 0) {
      d.shieldHp = 0;
    } else if (d.shieldHp == null) {
      d.shieldHp = d.shieldMaxHp;
    } else if (d.shieldMaxHp > prevShieldMax) {
      d.shieldHp = Math.min(d.shieldMaxHp, d.shieldHp + (d.shieldMaxHp - prevShieldMax));
    } else {
      d.shieldHp = Math.min(Math.max(0, d.shieldHp), d.shieldMaxHp);
    }
  });
}

function applyAttackDroneStats(d, lv) {
  const table = [
    { atk: 2, hp: 10 },
    { atk: 5, hp: 15 },
    { atk: 8, hp: 20 },
    { atk: 12, hp: 30 },
    { atk: 16, hp: 40 }
  ];
  const t = table[Math.max(0, lv - 1)];
  const prevMaxHp = d.maxHp || 0;

  d.atk = t.atk;
  d.maxHp = t.hp;
  d.r = 14;

  if (d.hp == null) {
    d.hp = d.maxHp;
  } else if (d.maxHp > prevMaxHp) {
    d.hp = d.maxHp; // レベルアップで全回復
  } else if (d.hp > d.maxHp) {
    d.hp = d.maxHp;
  }
}

function applyBarrierDroneStats(d, lv) {
  const table = [50, 60, 70, 90, 150];
  const prevMaxHp = d.maxHp || 0;

  d.maxHp = table[Math.max(0, lv - 1)];
  d.r = 16;

  if (d.hp == null) {
    d.hp = d.maxHp;
  } else if (d.maxHp > prevMaxHp) {
    d.hp = d.maxHp; // レベルアップで全回復
  } else if (d.hp > d.maxHp) {
    d.hp = d.maxHp;
  }
}

function getDirVectorFromPlayer(p) {
  switch (p.dirIndex) {
    case 0: return { x: 0, y: 1 };   // 下
    case 1: return { x: -1, y: 0 };  // 左
    case 2: return { x: 1, y: 0 };   // 右
    case 3: return { x: 0, y: -1 };  // 上
    default: return { x: 1, y: 0 };
  }
}

function getNearestEnemyForDrone(fromX, fromY, maxRange = 360) {
  let best = null;
  let bestD = Infinity;

  for (const e of STATE.enemies || []) {
    if (!e || e.dead) continue;
    const d = dist(fromX, fromY, e.x, e.y);
    if (d <= maxRange && d < bestD) {
      best = e;
      bestD = d;
    }
  }

  return best;
}

function getDroneAttackDistance(type) {
  if (type === "barrier") return 72;
  return 64;
}

function emitBarrierDroneField(drone, lv) {
  if (!drone || drone.deadTimer > 0) return;
  if (lv < 5) return;

  drone.fieldTick = Math.max(0, (drone.fieldTick || 0) - STATE.delta);
  if (drone.fieldTick > 0) return;
  drone.fieldTick = 0.42;

  const radius = 96 * (STATE.player?.stats?.areaMul || 1);
  const damage = 10 * (STATE.player?.stats?.damageMul || 1);

  addEffect?.(drone.x, drone.y, radius, "#7fe7ff", 0.16, 0.18);

  for (const e of STATE.enemies || []) {
    if (!e || e.dead) continue;
    if (dist(drone.x, drone.y, e.x, e.y) <= radius) {
      damageEnemy?.(e, damage);
    }
  }
}

function syncBarrierDrones() {
  const lv = getPassiveLevel("barrier_drone");
  const pattern = getPassiveCurrentPattern("barrier_drone");
  const balance = getPassiveBalanceLevel("barrier_drone");
  const drones = ensureDroneArray();
  let existing = drones.filter(d => d.type === "barrier");

  if (lv <= 0 || !balance) {
    STATE.drones = drones.filter(d => d.type !== "barrier");
    return;
  }

  const count = balance.count || 1;

  while (existing.length < count) {
    const idx = existing.length;
    const d = {
      type: "barrier",
      index: idx,
      pattern,
      x: STATE.player.x,
      y: STATE.player.y,
      r: 16,
      angle: (Math.PI * 2 / count) * idx,
      deadTimer: 0,
      fieldTick: 0,
      hp: balance.hp || 50,
      maxHp: balance.hp || 50,
      shieldHp: balance.shieldHp || 0,
      shieldMaxHp: balance.shieldHp || 0
    };
    drones.push(d);
    existing.push(d);
  }

  for (let i = existing.length - 1; i >= count; i--) {
    const idx = drones.indexOf(existing[i]);
    if (idx >= 0) drones.splice(idx, 1);
    existing.pop();
  }

  existing.forEach((d, i) => {
    d.index = i;
    d.pattern = pattern;
    d.orbitRadius = balance.orbitRadius || 40;
    d.orbitSpeed = balance.orbitSpeed || 2.0;
    d.fieldRadius = balance.fieldRadius || 0;
    d.shieldArc = balance.shieldArc || 0;

    const prevMax = d.maxHp || 0;
    d.maxHp = balance.hp || prevMax || 50;

    if (d.hp == null) {
      d.hp = d.maxHp;
    } else if (d.maxHp > prevMax) {
      d.hp = Math.min(d.maxHp, d.hp + (d.maxHp - prevMax));
    } else {
      d.hp = Math.min(d.hp, d.maxHp);
    }

    const prevShieldMax = d.shieldMaxHp || 0;
    d.shieldMaxHp = balance.shieldHp || 0;

    if (d.shieldMaxHp <= 0) {
      d.shieldHp = 0;
    } else if (d.shieldHp == null) {
      d.shieldHp = d.shieldMaxHp;
    } else if (d.shieldMaxHp > prevShieldMax) {
      d.shieldHp = Math.min(d.shieldMaxHp, d.shieldHp + (d.shieldMaxHp - prevShieldMax));
    } else {
      d.shieldHp = Math.min(Math.max(0, d.shieldHp), d.shieldMaxHp);
    }
  });
}

function updateDrones(dt) {
  const p = STATE.player;
  if (!p) return;

  const drones = ensureDroneArray();
  const attackDrones = drones.filter(d => d.type === "attack");
  const barrierDrones = drones.filter(d => d.type === "barrier");

  const inputX =
    (STATE.input.moveX || 0) +
    ((STATE.input.keys["d"] || STATE.input.keys["arrowright"]) ? 1 : 0) -
    ((STATE.input.keys["a"] || STATE.input.keys["arrowleft"]) ? 1 : 0);

  const inputY =
    (STATE.input.moveY || 0) +
    ((STATE.input.keys["s"] || STATE.input.keys["arrowdown"]) ? 1 : 0) -
    ((STATE.input.keys["w"] || STATE.input.keys["arrowup"]) ? 1 : 0);

  const moveLen = Math.hypot(inputX, inputY);
  const isMoving = moveLen > 0.12;

  let moveDirX = 0;
  let moveDirY = 0;

  if (isMoving) {
    moveDirX = inputX / moveLen;
    moveDirY = inputY / moveLen;
  } else {
    const dir = getDirVectorFromPlayer(p);
    moveDirX = dir.x;
    moveDirY = dir.y;
  }

  const sideX = -moveDirY;
  const sideY = moveDirX;

  for (const d of drones) {
    // 死亡中
    if (d.deadTimer > 0) {
      d.deadTimer -= dt;

      if (d.deadTimer <= 0) {
        d.deadTimer = 0;
        d.hp = d.maxHp || 1;

        if (d.type === "barrier") {
          d.shieldHp = d.shieldMaxHp || 0;
        }

        d.fireCooldown = Math.min(d.fireCooldown || 0, 0.15);
      }
      continue;
    }

    // HP0保険
    if ((d.hp || 0) <= 0) {
      d.deadTimer = Math.max(d.deadTimer || 0, 5);
      continue;
    }

    if (d.type === "attack") {
      const idx = d.index || 0;
      const count = Math.max(1, attackDrones.length);

      let targetX = p.x;
      let targetY = p.y;

      if (isMoving) {
        // ----------------------------
        // 移動中: 前方展開
        // ----------------------------
        const spreadBase = count <= 1 ? [0] : [-1, 1, -2, 2, 0, -3, 3];
        const spreadSlot = spreadBase[idx] != null
          ? spreadBase[idx]
          : (idx - (count - 1) * 0.5);

        const forwardDist = 168;
        const sideDist = 62;

        const hoverSide = Math.sin(STATE.time * 1.9 + idx * 1.17) * 10;
        const hoverForward = Math.cos(STATE.time * 2.2 + idx * 0.93) * 7;

        targetX =
          p.x +
          moveDirX * (forwardDist + hoverForward) +
          sideX * (spreadSlot * sideDist + hoverSide);

        targetY =
          p.y +
          moveDirY * (forwardDist + hoverForward) +
          sideY * (spreadSlot * sideDist + hoverSide);
      } else {
        // ----------------------------
        // 停止中: プレイヤー周囲で円陣
        // ----------------------------
        const angleBase = (Math.PI * 2 / count) * idx;
        const angleNow = angleBase + STATE.time * 1.55;
        const radius = 112;

        targetX = p.x + Math.cos(angleNow) * radius;
        targetY = p.y + Math.sin(angleNow) * radius;
      }

      if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) {
        d.x = targetX;
        d.y = targetY;
      }

      // 滑らか追従
      const follow = isMoving
        ? (1 - Math.pow(0.0012, dt))
        : (1 - Math.pow(0.0020, dt));

      d.x = lerp(d.x, targetX, follow);
      d.y = lerp(d.y, targetY, follow);

      d.fireCooldown = Math.max(0, (d.fireCooldown || 0) - dt);
      attackDroneFire(d);
      continue;
    }

    if (d.type === "barrier") {
      const count = Math.max(1, barrierDrones.length);
      const baseAngle = (Math.PI * 2 / count) * (d.index || 0);
      const radius = d.orbitRadius || 60;
      const angleNow = baseAngle + STATE.time * (d.orbitSpeed || 2.0);

      d.x = p.x + Math.cos(angleNow) * radius;
      d.y = p.y + Math.sin(angleNow) * radius;

      emitBarrierDroneField(d, getPassiveLevel("barrier_drone"));
    }
  }
}

function ensureDroneArray() {
  if (!STATE.drones) {
    STATE.drones = [];
  }
  return STATE.drones;
}

function attackDroneFire(d) {
  if (d.deadTimer > 0) return;
  if ((d.fireCooldown || 0) > 0) return;

  const target = getNearestEnemyForDrone(d.x, d.y, 360);
  if (!target) {
    d.fireCooldown = 0.12;
    return;
  }

  const baseAng = angle(d.x, d.y, target.x, target.y);
  const speed = 320 * (STATE.player?.stats?.projectileSpeedMul || 1);
  const burstCount = d.burstCount || 1;
  const isRapid = d.pattern === "rapid" || d.pattern === "rapid_ex";
  const isPierce = d.pattern === "pierce" || d.pattern === "pierce_ex";
  const spread = isRapid ? 0.08 : 0;

  for (let i = 0; i < burstCount; i++) {
    const center = (burstCount - 1) / 2;
    const ang = baseAng + (i - center) * spread;

    spawnBullet({
      x: d.x,
      y: d.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: isPierce ? 1.45 : 1.0,
      radius: isPierce ? 5 : 4,
      damage: d.atk,
      pierce: d.pierce || 1,
      weaponId: "attack_drone",
      type: "projectile",
      color: isPierce ? "#b8f0ff" : "#ffd37a"
    });
  }

  if (d.doubleBarrel) {
    spawnBullet({
      x: d.x,
      y: d.y,
      vx: Math.cos(baseAng + 0.06) * speed,
      vy: Math.sin(baseAng + 0.06) * speed,
      life: 1.0,
      radius: 4,
      damage: d.atk,
      pierce: d.pierce || 1,
      weaponId: "attack_drone",
      type: "projectile",
      color: "#ffd37a"
    });
  }

  d.fireCooldown = d.fireCooldownBase / (STATE.player?.stats?.cooldownMul || 1);
}

function updateBarrierDrone(dt, d) {
  const p = STATE.player;
  const count = Math.max(1, (STATE.drones || []).filter(x => x.type === "barrier").length);
  const baseAngle = (Math.PI * 2 / count) * d.index;

  d.angle = (d.angle ?? baseAngle) + dt * (d.orbitSpeed || 2.0);
  d.x = p.x + Math.cos(d.angle) * (d.orbitRadius || 40);
  d.y = p.y + Math.sin(d.angle) * (d.orbitRadius || 40);

  if (d.fieldRadius > 0) {
    damageEnemiesNearDroneField(d, d.fieldRadius * (STATE.player?.stats?.areaMul || 1), dt);
  }

  if ((d.pattern === "shield" || d.pattern === "shield_ex") && d.shieldArc > 0) {
    updateDroneShieldArc(d, dt);
  }
}

function resetLastDamageCause() {
  STATE.lastDamageCause = {
    id: "",
    label: ""
  };
}

function normalizeDamageCause(cause) {
  if (!cause) {
    return { id: "unknown", label: "不明" };
  }

  if (typeof cause === "string") {
    return { id: cause, label: cause };
  }

  return {
    id: String(cause.id || "unknown"),
    label: String(cause.label || cause.id || "不明")
  };
}

function setLastDamageCause(cause) {
  STATE.lastDamageCause = normalizeDamageCause(cause);
}

function damagePlayer(amount, cause = null) {
  const p = STATE.player;
  if (!p) return;
  if (p.invincibleTimer > 0) return;

  let remain = absorbByBarrierShield(amount);
  if (remain <= 0) return;

  const normalizedCause = normalizeDamageCause(cause);
  setLastDamageCause(normalizedCause);

  const reduced = Math.max(1, remain - p.stats.armor);
  p.hp = Math.max(0, p.hp - reduced);
  p.invincibleTimer = p.hp > 0 ? 0.35 : 0;
  p.damageFlash = 0.25;

  if (STATE.scoreState) {
    STATE.scoreState.noDamageTimer = 0;
    STATE.scoreState.noDamageTier = 0;
    STATE.scoreState.killChainTimer = 0;
    STATE.scoreState.killChainCount = 0;
  }
}

function absorbByBarrierShield(amount) {
  let remain = amount;
  const drones = (STATE.drones || [])
    .filter((d) =>
      d &&
      d.type === "barrier" &&
      d.deadTimer <= 0 &&
      d.shieldHp > 0 &&
      (d.pattern === "shield" || d.pattern === "shield_ex")
    )
    .sort((a, b) => (b.shieldHp || 0) - (a.shieldHp || 0));

  if (drones.length === 0) return amount;

  for (const d of drones) {
    if (remain <= 0) break;
    const absorb = Math.min(remain, d.shieldHp || 0);
    d.shieldHp = Math.max(0, (d.shieldHp || 0) - absorb);
    remain -= absorb;
    addEffect?.(d.x, d.y, 26, "#b7efff", 0.12, 0.14);
  }

  return remain;
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

function setPassiveTestLevel(id, level) {
  const p = STATE.player;
  if (!p) return false;

  const def = getPassiveDef(id);
  if (!def) return false;

  const maxLv = getPassiveMaxLevel(def);
  const nextLv = Math.max(0, Math.min(maxLv, Number(level || 0)));

  if (nextLv <= 0) {
    p.passiveLevels[id] = 0;
    p.passives = (p.passives || []).filter(passiveId => passiveId !== id);
    updatePlayerPassives();
    return true;
  }

  p.passiveLevels[id] = nextLv;
  if (!p.passives.includes(id)) {
    p.passives.push(id);
  }

  updatePlayerPassives();
  return true;
}

function addXpByTest(amount) {
  const p = STATE.player;
  if (!p) return false;
  gainXP(Math.max(0, Number(amount || 0)));
  return true;
}

function getPassiveDef(id) {
  return (STATE.gameData?.passives || []).find(p => p.id === id) || null;
}

function getPassiveLevel(id) {
  return STATE.player?.passiveLevels?.[id] || 0;
}

function getPassiveBalance(def) {
  return def?.balance && typeof def.balance === "object" ? def.balance : null;
}

function getPassiveMaxLevel(def) {
  const balance = getPassiveBalance(def);
  const balanceLen = Array.isArray(balance?.levels) ? balance.levels.length : 0;
  return def?.maxLevel || balanceLen || (Array.isArray(def?.levelDesc) ? def.levelDesc.length : 3);
}

function getPassiveLevelValue(def, level) {
  const balance = getPassiveBalance(def);
  if (!balance) return null;
  const levels = Array.isArray(balance.levels) ? balance.levels : [];
  if (levels.length <= 0) return null;
  const idx = Math.max(0, Math.min(levels.length - 1, (level || 1) - 1));
  return levels[idx];
}

function getPassiveBaseValue(def, statName, defaultValue) {
  const balance = getPassiveBalance(def);
  if (balance && balance.stat === statName && typeof balance.base === 'number') {
    return balance.base;
  }
  return defaultValue;
}

function getPassiveResolvedStat(def, level, defaultValue = null) {
  const balance = getPassiveBalance(def);
  if (!balance || !balance.stat) return null;
  const value = getPassiveLevelValue(def, level);
  if (typeof value !== 'number') return null;
  return {
    stat: balance.stat,
    value,
    base: typeof balance.base === 'number' ? balance.base : defaultValue,
    immediateHeal: typeof balance.immediateHeal === 'number' ? balance.immediateHeal : null,
    includeShopBonus: !!balance.includeShopBonus
  };
}

function canLevelPassive(id) {
  const def = getPassiveDef(id);
  if (!def) return false;
  const lv = getPassiveLevel(id);
  const maxLv = getPassiveMaxLevel(def);
  return lv < maxLv;
}

function addPassive(id) {
  const p = STATE.player;
  const def = getPassiveDef(id);
  if (!p || !def) return false;

  const curLv = p.passiveLevels[id] || 0;
  const maxLv = getPassiveMaxLevel(def);
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
  const def = getPassiveDef(id);
  if (!p || !def) return;

  const resolved = getPassiveResolvedStat(def, level);
  if (resolved?.stat === 'maxHp') {
    const prevHp = p.hp;
    const nextMaxHp = resolved.value + (resolved.includeShopBonus ? (p.shopMaxHpBonus || 0) : 0);
    p.maxHp = nextMaxHp;
    if (STATE._suppressImmediateShellHeal) {
      p.hp = Math.min(p.maxHp, prevHp);
    } else {
      const healAmount = resolved.immediateHeal != null ? resolved.immediateHeal : Math.max(0, nextMaxHp - prevHp);
      p.hp = Math.min(p.maxHp, prevHp + healAmount);
    }
    return;
  }

  if (resolved?.stat && Object.prototype.hasOwnProperty.call(p.stats, resolved.stat)) {
    p.stats[resolved.stat] = resolved.value;
    return;
  }

  if (id === "shell") {
    const prevHp = p.hp;
    p.maxHp = 100 + level * 20;
    if (STATE._suppressImmediateShellHeal) {
      p.hp = Math.min(p.maxHp, prevHp);
    } else {
      p.hp = Math.min(p.maxHp, prevHp + 20);
    }
  }

  if (id === "chart") p.stats.pickupRange = 90 + level * 12;
  if (id === "thruster") p.stats.moveMul = 1 + level * 0.10;
  if (id === "core") p.stats.damageMul = 1 + level * 0.10;
  if (id === "battery") p.stats.cooldownMul = 1 + level * 0.10;
  if (id === "sonar_scope") p.stats.projectileSpeedMul = 1 + level * 0.12;
  if (id === "pressure_fin") p.stats.areaMul = 1 + level * 0.10;
  if (id === "med_kit") p.stats.regen = level * 0.6;
  if (id === "armor_plate") p.stats.armor = level * 1.5;
}

function updatePlayerPassives() {
  const p = STATE.player;
  if (!p) return;

  const levels = p.passiveLevels || {};

  p.stats.damageMul = 1;
  p.stats.cooldownMul = 1;
  p.stats.areaMul = 1;
  p.stats.moveMul = 1;
  p.stats.projectileSpeedMul = 1;
  p.stats.pickupRange = 90;
  p.stats.armor = 0;
  p.stats.regen = 0;

  p.maxHp = 100 + (p.shopMaxHpBonus || 0);

  for (const def of (STATE.gameData?.passives || [])) {
    const lv = levels[def.id] || 0;
    if (lv <= 0) continue;

    const resolved = getPassiveResolvedStat(def, lv);
    if (resolved?.stat === 'maxHp') {
      p.maxHp = resolved.value + (resolved.includeShopBonus ? (p.shopMaxHpBonus || 0) : 0);
      continue;
    }

    if (resolved?.stat && Object.prototype.hasOwnProperty.call(p.stats, resolved.stat)) {
      p.stats[resolved.stat] = resolved.value;
      continue;
    }

    if (def.id === 'core') p.stats.damageMul = 1 + lv * 0.10;
    if (def.id === 'battery') p.stats.cooldownMul = 1 + lv * 0.10;
    if (def.id === 'pressure_fin') p.stats.areaMul = 1 + lv * 0.10;
    if (def.id === 'thruster') p.stats.moveMul = 1 + lv * 0.10;
    if (def.id === 'sonar_scope') p.stats.projectileSpeedMul = 1 + lv * 0.12;
    if (def.id === 'chart') p.stats.pickupRange = 90 + lv * 12;
    if (def.id === 'armor_plate') p.stats.armor = lv * 1.5;
    if (def.id === 'med_kit') p.stats.regen = lv * 0.6;
    if (def.id === 'shell') p.maxHp = 100 + lv * 20 + (p.shopMaxHpBonus || 0);
  }

  p.hp = Math.min(p.hp, p.maxHp);

  updateDronesFromPassives();
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

function renderDrones(ctx) {
  const cam = STATE.camera;
  const img = STATE.assets?.drone?.img;

  for (const d of STATE.drones || []) {
    const drawX = (d.x || 0) - cam.x;
    const drawY = (d.y || 0) - cam.y;
    const size = d.type === "barrier" ? 34 : 30;

    if (img) {
      const sw = Math.floor(img.width / 2);
      const sh = Math.floor(img.height / 2);

      const frame =
        d.type === "attack"
          ? (d.deadTimer > 0 ? 1 : 0)
          : (d.deadTimer > 0 ? 3 : 2);

      const sx = (frame % 2) * sw;
      const sy = Math.floor(frame / 2) * sh;

      ctx.drawImage(
        img,
        sx, sy, sw, sh,
        drawX - size / 2,
        drawY - size / 2,
        size,
        size
      );
    } else {
      ctx.save();
      ctx.fillStyle = d.type === "barrier" ? "#8ce7ff" : "#ffd37a";
      ctx.beginPath();
      ctx.arc(drawX, drawY, d.r || 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // HPバー
    if (d.deadTimer <= 0) {
      const ratio = Math.max(0, Math.min(1, (d.hp || 0) / Math.max(1, d.maxHp || 1)));
      const barW = 24;
      const barH = 4;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(drawX - barW * 0.5, drawY - size * 0.7, barW, barH);
      ctx.fillStyle = d.type === "barrier" ? "#7fe7ff" : "#ffd166";
      ctx.fillRect(drawX - barW * 0.5, drawY - size * 0.7, barW * ratio, barH);
    }
  }
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

function getPassiveBranchDef(passiveId, branchId) {
  const def = getPassiveDef(passiveId);
  if (!def || !Array.isArray(def.evolutions)) return null;
  return def.evolutions.find(x => x.branchId === branchId) || null;
}

function getPassiveDef(id) {
  return (STATE.gameData?.passives || []).find((p) => p.id === id) || null;
}

function getPassiveLevel(id) {
  return STATE.player?.passiveLevels?.[id] || 0;
}

function getPassiveEvolutionStage(id) {
  const lv = getPassiveLevel(id);
  if (lv >= 5) return 2;
  if (lv >= 3) return 1;
  return 0;
}

function getPassiveBranchId(id) {
  const def = getPassiveDef(id);
  if (!def || !Array.isArray(def.evolutions) || def.evolutions.length <= 0) return null;

  const stage = getPassiveEvolutionStage(id);
  if (stage <= 0) return null;

  const ownedPassives = STATE.player?.passiveLevels || {};

  // 第2進化まで行っている場合は、第2進化条件を優先して逆算
  if (stage >= 2) {
    for (const evo of def.evolutions) {
      const need2 = evo?.secondStage?.needsPassive;
      if (need2 && ownedPassives[need2] > 0) {
        return evo.branchId || null;
      }
    }
  }

  // 第1進化条件から分岐を推定
  for (const evo of def.evolutions) {
    const need1 = evo?.needsPassive;
    if (need1 && ownedPassives[need1] > 0) {
      return evo.branchId || null;
    }
  }

  // どれも満たしていない場合は先頭分岐を返す
  return def.evolutions[0]?.branchId || null;
}

function getPassiveBranchDef(passiveId, branchId) {
  const def = getPassiveDef(passiveId);
  if (!def || !Array.isArray(def.evolutions)) return null;
  return def.evolutions.find((x) => x.branchId === branchId) || null;
}

function getPassiveCurrentPattern(passiveId) {
  const stage = getPassiveEvolutionStage(passiveId);
  const branchId = getPassiveBranchId(passiveId);
  const branch = getPassiveBranchDef(passiveId, branchId);

  if (!branch) return null;
  if (stage === 1) return branch.pattern || null;
  if (stage >= 2) return branch.secondStage?.pattern || branch.pattern || null;
  return null;
}

function getPassiveBalanceLevel(passiveId) {
  const def = getPassiveDef(passiveId);
  if (!def?.balance?.stages) return null;

  const stage = getPassiveEvolutionStage(passiveId);
  const lv = getPassiveLevel(passiveId);

  const stageKey =
    stage <= 0 ? "normal" :
    stage === 1 ? "evolution1" :
    "evolution2";

  const stageDef = def.balance.stages.find((s) => s.key === stageKey);
  if (!stageDef?.levels?.length) return null;

  let localLv = lv;
  if (stage === 1) localLv = Math.max(1, lv - 2);
  if (stage >= 2) localLv = Math.max(1, lv - 4);

  const idx = Math.max(0, Math.min(stageDef.levels.length - 1, localLv - 1));
  return stageDef.levels[idx] || null;
}

function getPassiveCurrentPattern(passiveId) {
  const stage = getPassiveEvolutionStage(passiveId);
  const branchId = getPassiveBranchId(passiveId);
  const branch = getPassiveBranchDef(passiveId, branchId);
  if (!branch) return null;
  if (stage === 1) return branch.pattern || null;
  if (stage >= 2) return branch.secondStage?.pattern || branch.pattern || null;
  return null;
}

function getPassiveBalanceLevel(passiveId) {
  const stage = getPassiveEvolutionStage(passiveId);
  const level = getPassiveLevel(passiveId);
  const def = getPassiveDef(passiveId);
  if (!def?.balance?.stages) return null;

  const stageKey = stage <= 0 ? "normal" : stage === 1 ? "evolution1" : "evolution2";
  const stageDef = def.balance.stages.find(s => s.key === stageKey);
  if (!stageDef?.levels?.length) return null;

  const idx = Math.max(0, Math.min(stageDef.levels.length - 1, level - 1));
  return stageDef.levels[idx];
}
