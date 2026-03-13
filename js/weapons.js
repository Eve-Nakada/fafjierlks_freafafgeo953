// ===============================
// 武器・弾・進化
// ===============================

function getWeaponDef(id) {
  return (STATE.gameData?.weapons || []).find(w => w.id === id) || null;
}

function getWeaponInstance(id) {
  return STATE.player?.weapons?.find(w => w.id === id) || null;
}

function getWeaponEvolutionStage(weaponId) {
  const w = getWeaponInstance(weaponId);
  return w?.evolutionStage || 0;
}

function isWeaponEvolved(weaponId) {
  return getWeaponEvolutionStage(weaponId) >= 1;
}

function isWeaponSecondEvolved(weaponId) {
  return getWeaponEvolutionStage(weaponId) >= 2;
}

function getWeaponMaxLevel(w) {
  if (!w) return 6;
  return (w.evolutionStage || 0) >= 2 ? 3 : 6;
}

function canAddWeapon(id) {
  const inst = getWeaponInstance(id);
  if (inst) return inst.level < getWeaponMaxLevel(inst);
  return true;
}

function addWeapon(id) {
  const p = STATE.player;
  const def = getWeaponDef(id);
  if (!p || !def) return false;

  let inst = getWeaponInstance(id);

  if (inst) {
    const maxLv = getWeaponMaxLevel(inst);
    if (inst.level >= maxLv) return false;
    inst.level += 1;
    return true;
  }

  inst = {
    id,
    level: 1,
    cooldown: 0,
    evolutionStage: 0,
    branchId: null,
    orbitAngle: 0
  };

  p.weapons.push(inst);
  markWeaponSeen(id);
  unlockWeapon(id);
  return true;
}

function getWeaponEvolutionBranches(def) {
  if (!def) return [];
  if (Array.isArray(def.evolutions) && def.evolutions.length > 0) return def.evolutions;
  if (def.evolution) {
    return [{
      branchId: def.evolution.branchId || def.evolution.pattern || "evolution",
      name: def.evolution.name || "進化",
      pattern: def.evolution.pattern || null,
      needsPassive: def.evolution.needsPassive || null,
      secondStage: def.evolution.secondStage || null
    }];
  }
  return [];
}

function getWeaponBranchDef(w) {
  const def = getWeaponDef(w?.id);
  if (!def) return null;
  return getWeaponEvolutionBranches(def).find(x => x.branchId === w.branchId) || null;
}

function getWeaponCurrentPattern(w) {
  const stage = w?.evolutionStage || 0;
  const branch = getWeaponBranchDef(w);
  if (stage === 0) return null;
  if (stage === 1) return branch?.pattern || null;
  return branch?.secondStage?.pattern || branch?.pattern || null;
}

function updateWeapons(dt) {
  const p = STATE.player;
  if (!p) return;

  for (const w of p.weapons) {
    const def = getWeaponDef(w.id);
    if (!def) continue;

    w.cooldown -= dt;

    if (w.id === "water_cutter") {
      updateOrbitWeapon(w, def, dt);
      continue;
    }

    if (w.cooldown <= 0) {
      fireWeapon(w, def);
      w.cooldown = getWeaponCooldown(w, def);
    }
  }
}

function getWeaponCooldown(w, def) {
  const p = STATE.player;
  const base = def.cooldown || 1;
  const levelFactor = 1 - Math.min(0.35, (w.level - 1) * 0.04);
  return Math.max(0.08, base * levelFactor / p.stats.cooldownMul);
}

function getWeaponDamage(w, def) {
  const p = STATE.player;
  return (def.damage + (w.level - 1) * (def.levelDamage || 3)) * p.stats.damageMul;
}

function getNearestEnemy(fromX, fromY, maxRange = Infinity) {
  let best = null;
  let bestD = Infinity;

  for (const e of STATE.enemies) {
    const d = dist(fromX, fromY, e.x, e.y);
    if (d < bestD && d <= maxRange) {
      best = e;
      bestD = d;
    }
  }

  return best;
}

function fireWeapon(w, def) {
  switch (w.id) {
    case "harpoon":
      fireHarpoon(w, def);
      break;
    case "mine":
      fireMine(w, def);
      break;
    case "jelly_field":
      fireJellyField(w, def);
      break;
    case "fish_missile":
      fireFishMissile(w, def);
      break;
    case "sonar":
      fireSonar(w, def);
      break;
    case "water_cutter":
      break;
    default:
      fireHarpoon(w, def);
      break;
  }
}

function fireHarpoon(w, def) {
  const p = STATE.player;
  const target = getNearestEnemy(p.x, p.y);
  if (!target) return;

  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const pattern = getWeaponCurrentPattern(w);

  let count = 1;
  let spreadStep = 0;
  let life = 1.2;
  let radius = 6;
  let damageMul = 1;
  let pierce = 1;

  if (pattern === "trident") {
    count = 3; spreadStep = 0.22; life = 1.5; radius = 8; damageMul = 1.15; pierce = 3;
  } else if (pattern === "trident_king") {
    count = 5; spreadStep = 0.18; life = 1.7; radius = 9; damageMul = 1.35; pierce = 5;
  } else if (pattern === "pierce") {
    count = 2; spreadStep = 0.08; life = 1.6; radius = 7; damageMul = 1.2; pierce = 5;
  } else if (pattern === "pierce_ex") {
    count = 3; spreadStep = 0.08; life = 1.9; radius = 8; damageMul = 1.35; pierce = 8;
  }

  for (let i = 0; i < count; i++) {
    const center = (count - 1) / 2;
    const spread = count === 1 ? 0 : (i - center) * spreadStep;
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);
    const vx = nx * cos - ny * sin;
    const vy = nx * sin + ny * cos;

    spawnBullet({
      x: p.x,
      y: p.y,
      vx: vx * (def.speed || 360) * p.stats.projectileSpeedMul,
      vy: vy * (def.speed || 360) * p.stats.projectileSpeedMul,
      life,
      radius,
      damage: getWeaponDamage(w, def) * damageMul,
      pierce,
      weaponId: w.id,
      weaponPattern: pattern,
      weaponStage: w.evolutionStage || 0,
      type: "projectile",
      color: pattern && pattern.startsWith("pierce") ? "#b8f0ff" : "#8ef3ff"
    });
  }
}

function fireMine(w, def) {
  const p = STATE.player;
  const pattern = getWeaponCurrentPattern(w);
  const targets = [];
  const near = [...STATE.enemies]
    .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))
    .slice(0, pattern === "cluster_ex" ? 3 : pattern === "cluster" ? 2 : 1);

  if (near.length) {
    for (const target of near) targets.push({ x: target.x, y: target.y });
  } else {
    targets.push({ x: p.x + rand(-120, 120), y: p.y + rand(-120, 120) });
  }

  for (const pos of targets) {
    spawnBullet({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      life: pattern === "burst_ex" ? 2.3 : pattern ? 2.0 : 1.7,
      radius: pattern && pattern.startsWith("cluster") ? 14 : 16,
      damage: getWeaponDamage(w, def) * (pattern === "burst_ex" ? 1.2 : 1),
      pierce: 999,
      weaponId: w.id,
      weaponPattern: pattern,
      weaponStage: w.evolutionStage || 0,
      type: "mine",
      color: pattern && pattern.startsWith("cluster") ? "#ffe08a" : "#ffd166",
      explodeRadius: (pattern === "burst_ex" ? 120 : pattern === "burst" ? 95 : pattern === "cluster_ex" ? 86 : pattern === "cluster" ? 72 : 70) * STATE.player.stats.areaMul,
      armDelay: 0.25
    });
  }
}

function fireJellyField(w, def) {
  const p = STATE.player;
  const pattern = getWeaponCurrentPattern(w);
  spawnBullet({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    life: pattern === "storm_ex" ? 0.8 : pattern === "storm" ? 0.68 : 0.55,
    radius: (pattern === "chain_ex" ? 108 : pattern === "chain" ? 94 : pattern === "storm_ex" ? 118 : pattern === "storm" ? 102 : 68) * p.stats.areaMul,
    damage: getWeaponDamage(w, def) * (pattern === "storm_ex" ? 0.5 : pattern === "storm" ? 0.42 : 0.35),
    pierce: 999,
    weaponId: w.id,
    weaponPattern: pattern,
    weaponStage: w.evolutionStage || 0,
    type: "field",
    tickTimer: 0,
    color: pattern && pattern.startsWith("storm") ? "#d8a5ff" : pattern ? "#a98cff" : "#6de4ff"
  });
}

function fireFishMissile(w, def) {
  const p = STATE.player;
  const pattern = getWeaponCurrentPattern(w);

  if (pattern === "drone_bay" || pattern === "drone_bay_ex") {
    const drones = pattern === "drone_bay_ex" ? 3 : 2;
    for (let i = 0; i < drones; i++) {
      spawnBullet({
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        life: pattern === "drone_bay_ex" ? 8.5 : 6.5,
        radius: 10,
        damage: getWeaponDamage(w, def) * (pattern === "drone_bay_ex" ? 0.52 : 0.42),
        pierce: 2,
        weaponId: w.id,
        weaponPattern: pattern,
        weaponStage: w.evolutionStage || 0,
        type: "drone",
        droneIndex: i,
        droneCount: drones,
        orbitAngle: rand(0, Math.PI * 2),
        orbitRadius: pattern === "drone_bay_ex" ? 96 : 82,
        shotTimer: rand(0.05, 0.35),
        shotInterval: pattern === "drone_bay_ex" ? 0.42 : 0.58,
        color: pattern === "drone_bay_ex" ? "#ffd6b0" : "#ffc18a"
      });
    }
    return;
  }

  const count = pattern === "multi_homing_ex" ? 5 : pattern === "multi_homing" ? 3 : pattern === "swarm_ex" ? 6 : pattern === "swarm" ? 4 : 1;

  const targets = [...STATE.enemies].sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y));
  if (targets.length === 0) return;

  for (let i = 0; i < count; i++) {
    const target = targets[i % targets.length];
    const ang = angle(p.x, p.y, target.x, target.y) + rand(-0.12, 0.12);

    spawnBullet({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang) * (def.speed || 240) * STATE.player.stats.projectileSpeedMul,
      vy: Math.sin(ang) * (def.speed || 240) * STATE.player.stats.projectileSpeedMul,
      life: pattern && pattern.startsWith("swarm") ? 1.9 : 2.4,
      radius: pattern ? 8 : 7,
      damage: getWeaponDamage(w, def) * (pattern === "swarm_ex" ? 0.82 : pattern === "swarm" ? 0.74 : 1),
      pierce: 1,
      weaponId: w.id,
      weaponPattern: pattern,
      weaponStage: w.evolutionStage || 0,
      type: "homing",
      targetId: target.id,
      turnRate: pattern === "multi_homing_ex" ? 6.0 : pattern === "multi_homing" ? 4.8 : pattern === "swarm_ex" ? 5.2 : pattern === "swarm" ? 4.4 : 3.2,
      color: pattern && pattern.startsWith("swarm") ? "#ffb0a0" : "#ff8aa0"
    });
  }
}

function fireSonar(w, def) {
  const p = STATE.player;
  const pattern = getWeaponCurrentPattern(w);
  const target = getNearestEnemy(p.x, p.y);
  if (!target) return;

  const baseAng = angle(p.x, p.y, target.x, target.y);
  const count = pattern === "wave_ex" ? 3 : pattern === "wave" ? 2 : 1;
  const spreadStep = pattern && pattern.startsWith("wave") ? 0.16 : 0;

  for (let i = 0; i < count; i++) {
    const center = (count - 1) / 2;
    const ang = baseAng + (i - center) * spreadStep;

    spawnBullet({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang),
      vy: Math.sin(ang),
      life: pattern === "beam_ex" ? 0.28 : pattern === "beam" ? 0.22 : 0.16,
      radius: pattern === "beam_ex" ? 22 : pattern === "beam" ? 18 : pattern === "wave_ex" ? 15 : pattern === "wave" ? 13 : 10,
      damage: getWeaponDamage(w, def) * (pattern === "beam_ex" ? 1.7 : pattern === "beam" ? 1.45 : pattern === "wave_ex" ? 1.15 : 1.0),
      pierce: pattern && pattern.startsWith("beam") ? 999 : pattern && pattern.startsWith("wave") ? 8 : 5,
      weaponId: w.id,
      weaponPattern: pattern,
      weaponStage: w.evolutionStage || 0,
      type: "beam",
      color: pattern && pattern.startsWith("wave") ? "#8be0ff" : pattern ? "#79f7ff" : "#50d7ff",
      length: pattern === "beam_ex" ? 380 : pattern === "beam" ? 320 : pattern === "wave_ex" ? 280 : pattern === "wave" ? 250 : 220
    });
  }
}

function updateOrbitWeapon(w, def, dt) {
  const p = STATE.player;
  const pattern = getWeaponCurrentPattern(w);
  const count = pattern === "orbit_ex" ? 4 : pattern === "orbit" ? 3 : pattern === "tidal_ring_ex" ? 5 : pattern === "tidal_ring" ? 4 : 1;
  const orbitRadius = (pattern === "orbit_ex" ? 98 : pattern === "orbit" ? 86 : pattern === "tidal_ring_ex" ? 118 : pattern === "tidal_ring" ? 102 : 62) * p.stats.areaMul;
  const damage = getWeaponDamage(w, def) * (pattern === "tidal_ring_ex" ? 0.4 : 0.45);
  const speed = pattern === "orbit_ex" ? 4.2 : pattern === "orbit" ? 3.5 : pattern === "tidal_ring_ex" ? 2.5 : pattern === "tidal_ring" ? 2.0 : 2.4;

  w.orbitAngle += dt * speed;

  for (let i = 0; i < count; i++) {
    const ang = w.orbitAngle + (Math.PI * 2 / count) * i;
    const x = p.x + Math.cos(ang) * orbitRadius;
    const y = p.y + Math.sin(ang) * orbitRadius;

    for (const e of STATE.enemies) {
      if (dist(x, y, e.x, e.y) <= 18 + e.r) {
        damageEnemy(e, damage * dt * 4.0);
      }
    }

    STATE.effects.push({
      x, y,
      r: pattern && pattern.startsWith("tidal") ? 11 : 9,
      color: pattern && pattern.startsWith("tidal") ? "#92eaff" : "#7cf7ff",
      life: 0.06
    });
  }
}

function getAvailableEvolutions() {
  const p = STATE.player;
  const out = [];
  if (!p) return out;

  for (const w of p.weapons) {
    const def = getWeaponDef(w.id);
    if (!def) continue;

    const stage = w.evolutionStage || 0;
    if (w.level < 6) continue;

    if (stage === 0) {
      for (const evo of getWeaponEvolutionBranches(def)) {
        const need = evo.needsPassive;
        if (!need || getPassiveLevel(need) > 0) {
          out.push({
            type: "first",
            weaponId: w.id,
            branchId: evo.branchId,
            evolutionName: evo.name || "進化武器",
            needPassive: need || null
          });
        }
      }
    } else if (stage === 1) {
      const branch = getWeaponBranchDef(w);
      const second = branch?.secondStage;
      if (!second) continue;
      const need = second.needsPassive;
      if (!need || getPassiveLevel(need) > 0) {
        out.push({
          type: "second",
          weaponId: w.id,
          branchId: w.branchId,
          evolutionName: second.name || "第2段進化",
          needPassive: need || null
        });
      }
    }
  }

  return out;
}

function evolveWeaponToBranch(weaponId, branchId) {
  const w = getWeaponInstance(weaponId);
  if (!w || (w.evolutionStage || 0) !== 0) return false;

  w.evolutionStage = 1;
  w.branchId = branchId;
  w.level = 1;
  w.cooldown = 0;
  return true;
}

function secondEvolveWeapon(weaponId) {
  const w = getWeaponInstance(weaponId);
  if (!w || (w.evolutionStage || 0) !== 1) return false;

  w.evolutionStage = 2;
  w.level = 1;
  w.cooldown = 0;
  return true;
}

function applyEvolutionChoice(evo) {
  if (!evo) return false;
  if (evo.type === "first") return evolveWeaponToBranch(evo.weaponId, evo.branchId);
  if (evo.type === "second") return secondEvolveWeapon(evo.weaponId);
  return false;
}

function spawnBullet(b) {
  STATE.bullets.push({
    x: b.x,
    y: b.y,
    vx: b.vx || 0,
    vy: b.vy || 0,
    life: b.life || 1,
    radius: b.radius || 6,
    damage: b.damage || 1,
    pierce: b.pierce ?? 1,
    weaponId: b.weaponId || "",
    type: b.type || "projectile",
    color: b.color || "#7cf7ff",
    explodeRadius: b.explodeRadius || 0,
    warningRadius: b.warningRadius || b.explodeRadius || 0,
    tickTimer: b.tickTimer || 0,
    targetId: b.targetId || null,
    turnRate: b.turnRate || 0,
    length: b.length || 0,
    armDelay: b.armDelay || 0,
    droneIndex: b.droneIndex || 0,
    droneCount: b.droneCount || 0,
    orbitAngle: b.orbitAngle || 0,
    orbitRadius: b.orbitRadius || 0,
    shotTimer: b.shotTimer || 0,
    shotInterval: b.shotInterval || 0.6,
    alreadyHit: new Set()
  });
}

function updateBullets(dt) {
  const next = [];

  for (const b of STATE.bullets) {
    b.life -= dt;
    b.armDelay = Math.max(0, (b.armDelay || 0) - dt);

    if (b.life <= 0) {
      if (b.type === "mine") explodeMine(b);
      continue;
    }

    if (b.type === "projectile") {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      handleProjectileHits(b);
    } else if (b.type === "homing") {
      updateHomingBullet(b, dt);
      handleProjectileHits(b);
    } else if (b.type === "mine") {
      handleMineTrigger(b);
    } else if (b.type === "field") {
      updateFieldBullet(b, dt);
    } else if (b.type === "beam") {
      updateBeamBullet(b, dt);
    } else if (b.type === "drone") {
      updateDroneBullet(b, dt);
    }

    if (b.life > 0) next.push(b);
  }

  STATE.bullets = next;
  updateEffects(dt);
}

function updateHomingBullet(b, dt) {
  let target = STATE.enemies.find(e => e.id === b.targetId);
  if (!target) {
    target = getNearestEnemy(b.x, b.y);
    if (target) b.targetId = target.id;
  }

  if (target) {
    const desired = angle(b.x, b.y, target.x, target.y);
    const current = Math.atan2(b.vy, b.vx);
    let diff = desired - current;

    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const newAngle = current + clamp(diff, -b.turnRate * dt, b.turnRate * dt);
    const speed = Math.hypot(b.vx, b.vy) || 1;
    b.vx = Math.cos(newAngle) * speed;
    b.vy = Math.sin(newAngle) * speed;
  }

  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

function handleProjectileHits(b) {
  for (const e of STATE.enemies) {
    if (b.alreadyHit.has(e.id)) continue;

    if (dist(b.x, b.y, e.x, e.y) <= b.radius + e.r) {
      damageEnemy(e, b.damage);
      b.alreadyHit.add(e.id);

      if (b.weaponId === "jelly_field" && (b.weaponPattern === "chain" || b.weaponPattern === "chain_ex")) {
        chainLightning(e, b.damage * (b.weaponPattern === "chain_ex" ? 0.7 : 0.5), b.weaponPattern === "chain_ex" ? 3 : 2);
      }

      b.pierce -= 1;
      if (b.pierce <= 0) {
        b.life = 0;
        return;
      }
    }
  }
}

function handleMineTrigger(b) {
  if (b.armDelay > 0) return;

  for (const e of STATE.enemies) {
    if (dist(b.x, b.y, e.x, e.y) <= b.radius + e.r + 6) {
      explodeMine(b);
      b.life = 0;
      return;
    }
  }
}

function explodeMine(b) {
  const radius = b.explodeRadius || 72;

  for (const e of STATE.enemies) {
    if (dist(b.x, b.y, e.x, e.y) <= radius + e.r) {
      damageEnemy(e, b.damage);
    }
  }

  const p = STATE.player;
  if (p && dist(b.x, b.y, p.x, p.y) <= radius + p.r) {
    damagePlayer(Math.max(8, b.damage * 0.75));
  }

  STATE.effects.push({
    x: b.x,
    y: b.y,
    r: radius,
    color: "#ffb347",
    life: 0.28
  });

  if (b.weaponStage >= 1) {
    STATE.effects.push({
      x: b.x,
      y: b.y,
      r: radius * 1.35,
      color: "#ff8c66",
      life: 0.34
    });

    for (const e of STATE.enemies) {
      if (dist(b.x, b.y, e.x, e.y) <= radius * 1.35 + e.r) {
        damageEnemy(e, b.damage * 0.45);
      }
    }

    if (p && dist(b.x, b.y, p.x, p.y) <= radius * 1.35 + p.r) {
      damagePlayer(Math.max(4, b.damage * 0.3));
    }
  }
}

function updateFieldBullet(b, dt) {
  b.x = STATE.player.x;
  b.y = STATE.player.y;
  b.tickTimer -= dt;

  if (b.tickTimer <= 0) {
    b.tickTimer = 0.12;

    for (const e of STATE.enemies) {
      if (dist(b.x, b.y, e.x, e.y) <= b.radius + e.r) {
        damageEnemy(e, b.damage);
      }
    }
  }
}

function updateBeamBullet(b, dt) {
  const p = STATE.player;
  b.x = p.x;
  b.y = p.y;

  const len = b.length || 220;
  const nx = b.vx;
  const ny = b.vy;

  for (const e of STATE.enemies) {
    const ex = e.x - p.x;
    const ey = e.y - p.y;
    const proj = ex * nx + ey * ny;

    if (proj < 0 || proj > len) continue;

    const px = p.x + nx * proj;
    const py = p.y + ny * proj;
    const d = dist(px, py, e.x, e.y);

    if (d <= b.radius + e.r) {
      if (!b.alreadyHit.has(e.id)) {
        damageEnemy(e, b.damage);
        b.alreadyHit.add(e.id);
        if (b.pierce !== 999) {
          b.pierce -= 1;
          if (b.pierce <= 0) {
            b.life = 0;
            return;
          }
        }
      }
    }
  }
}



function updateDroneBullet(b, dt) {
  const p = STATE.player;
  if (!p) {
    b.life = 0;
    return;
  }

  const count = Math.max(1, b.droneCount || 1);
  const radius = b.orbitRadius || 84;
  b.orbitAngle += dt * (1.5 + count * 0.12);

  const slotAngle = b.orbitAngle + (Math.PI * 2 * (b.droneIndex || 0)) / count;
  const bob = Math.sin(STATE.time * 4 + (b.droneIndex || 0)) * 8;
  b.x = p.x + Math.cos(slotAngle) * (radius + bob);
  b.y = p.y + Math.sin(slotAngle) * (radius + bob * 0.45);

  b.shotTimer -= dt;
  if (b.shotTimer > 0) return;

  const target = getNearestEnemy(b.x, b.y, 320);
  if (!target) {
    b.shotTimer = 0.2;
    return;
  }

  const ang = angle(b.x, b.y, target.x, target.y);
  spawnBullet({
    x: b.x,
    y: b.y,
    vx: Math.cos(ang) * 300 * (STATE.player?.stats?.projectileSpeedMul || 1),
    vy: Math.sin(ang) * 300 * (STATE.player?.stats?.projectileSpeedMul || 1),
    life: 1.25,
    radius: 4,
    damage: b.damage,
    pierce: b.weaponPattern === "drone_bay_ex" ? 2 : 1,
    weaponId: b.weaponId,
    weaponPattern: b.weaponPattern,
    weaponStage: b.weaponStage || 0,
    type: "projectile",
    color: b.weaponPattern === "drone_bay_ex" ? "#fff0c7" : "#ffd6a6"
  });

  b.shotTimer = b.shotInterval || 0.6;
}
function chainLightning(startEnemy, damage, jumps) {
  let current = startEnemy;
  const hitIds = new Set([startEnemy.id]);

  for (let i = 0; i < jumps; i++) {
    let next = null;
    let best = Infinity;

    for (const e of STATE.enemies) {
      if (hitIds.has(e.id)) continue;
      const d = dist(current.x, current.y, e.x, e.y);
      if (d < best && d <= 140) {
        best = d;
        next = e;
      }
    }

    if (!next) break;

    damageEnemy(next, damage);
    STATE.effects.push({
      x: (current.x + next.x) * 0.5,
      y: (current.y + next.y) * 0.5,
      r: 14,
      color: "#b692ff",
      life: 0.12
    });

    hitIds.add(next.id);
    current = next;
  }
}

function updateEffects(dt) {
  const next = [];
  for (const ef of STATE.effects) {
    ef.life -= dt;
    if (ef.life > 0) next.push(ef);
  }
  STATE.effects = next;
}

function renderBullets(ctx) {
  const cam = STATE.camera;

  for (const b of STATE.bullets) {
    if (b.type === "beam") {
      renderBeam(ctx, b, cam);
      continue;
    }

    if (b.type === "field") {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x - cam.x, b.y - cam.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (b.type === "drone") {
      const x = b.x - cam.x;
      const y = b.y - cam.y;
      ctx.save();
      const px = STATE.player ? STATE.player.x - cam.x : x;
      const py = STATE.player ? STATE.player.y - cam.y : y;
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(y - py, x - px) + Math.PI * 0.5);
      ctx.fillStyle = b.color || "#ffc18a";
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 9);
      ctx.lineTo(0, 4);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (b.type === "mine") {
      const x = b.x - cam.x;
      const y = b.y - cam.y;

      ctx.save();

      const warnRadius = b.warningRadius || b.explodeRadius || 0;
      if (warnRadius > 0) {
        ctx.globalAlpha = b.armDelay > 0 ? 0.12 : 0.22;
        ctx.strokeStyle = b.armDelay > 0 ? "#fff0b3" : "#ffcf70";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(x, y, warnRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#5b3b00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 7, y);
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x, y + 7);
      ctx.stroke();

      if (b.armDelay > 0) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      continue;
    }

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  renderEffects(ctx);
  renderOrbitWeapons(ctx);
}

function renderBeam(ctx, b, cam) {
  const p = STATE.player;
  const x1 = p.x - cam.x;
  const y1 = p.y - cam.y;
  const x2 = x1 + b.vx * (b.length || 220);
  const y2 = y1 + b.vy * (b.length || 220);

  ctx.save();
  ctx.strokeStyle = b.color;
  ctx.lineWidth = b.radius * 2;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function renderEffects(ctx) {
  const cam = STATE.camera;

  for (const ef of STATE.effects) {
    ctx.save();
    ctx.globalAlpha = clamp(ef.life * 4, 0, 0.7);
    ctx.strokeStyle = ef.color || "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ef.x - cam.x, ef.y - cam.y, ef.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function renderOrbitWeapons(ctx) {
  const p = STATE.player;
  if (!p) return;

  const cam = STATE.camera;

  for (const w of p.weapons) {
    if (w.id !== "water_cutter") continue;

    const pattern = getWeaponCurrentPattern(w);
    const count = pattern === "orbit_ex" ? 4 : pattern === "orbit" ? 3 : pattern === "tidal_ring_ex" ? 5 : pattern === "tidal_ring" ? 4 : 1;
    const orbitRadius = (pattern === "orbit_ex" ? 98 : pattern === "orbit" ? 86 : pattern === "tidal_ring_ex" ? 118 : pattern === "tidal_ring" ? 102 : 62) * p.stats.areaMul;

    for (let i = 0; i < count; i++) {
      const ang = w.orbitAngle + (Math.PI * 2 / count) * i;
      const x = p.x + Math.cos(ang) * orbitRadius - cam.x;
      const y = p.y + Math.sin(ang) * orbitRadius - cam.y;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + Math.PI * 0.5);
      ctx.fillStyle = "#7cf7ff";
      ctx.fillRect(-5, -16, 10, 32);
      ctx.restore();
    }
  }
}
