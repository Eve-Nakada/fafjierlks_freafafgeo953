// ===============================
// 武器・弾・進化
// ===============================

function getWeaponDef(id) {
  return (STATE.gameData?.weapons || []).find(w => w.id === id) || null;
}

function getWeaponInstance(id) {
  return STATE.player?.weapons?.find(w => w.id === id) || null;
}

function canAddWeapon(id) {
  const inst = getWeaponInstance(id);
  if (inst) return inst.level < 6;
  return true;
}

function addWeapon(id) {
  const p = STATE.player;
  const def = getWeaponDef(id);
  if (!p || !def) return false;

  let inst = getWeaponInstance(id);

  if (inst) {
    if (inst.level >= 6) return false;
    inst.level += 1;
    return true;
  }

  inst = {
    id,
    level: 1,
    cooldown: 0,
    evolved: false,
    orbitAngle: 0
  };

  p.weapons.push(inst);
  return true;
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

  const evolved = w.evolved || def.evolution?.pattern === "trident" && isWeaponEvolved(w.id);
  const count = evolved ? 3 : 1;

  for (let i = 0; i < count; i++) {
    const spread = count === 1 ? 0 : (i - 1) * 0.22;
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);
    const vx = nx * cos - ny * sin;
    const vy = nx * sin + ny * cos;

    spawnBullet({
      x: p.x,
      y: p.y,
      vx: vx * (def.speed || 360) * p.stats.projectileSpeedMul,
      vy: vy * (def.speed || 360) * p.stats.projectileSpeedMul,
      life: evolved ? 1.5 : 1.2,
      radius: evolved ? 8 : 6,
      damage: getWeaponDamage(w, def) * (evolved ? 1.15 : 1),
      pierce: evolved ? 3 : 1,
      weaponId: w.id,
      type: "projectile",
      color: "#8ef3ff"
    });
  }
}

function fireMine(w, def) {
  const p = STATE.player;
  const target = getNearestEnemy(p.x, p.y, 260);
  let tx = p.x;
  let ty = p.y;

  if (target) {
    tx = target.x;
    ty = target.y;
  } else {
    tx += rand(-120, 120);
    ty += rand(-120, 120);
  }

  spawnBullet({
    x: tx,
    y: ty,
    vx: 0,
    vy: 0,
    life: w.evolved ? 2.0 : 1.7,
    radius: 16,
    damage: getWeaponDamage(w, def),
    pierce: 999,
    weaponId: w.id,
    type: "mine",
    color: "#ffd166",
    explodeRadius: (w.evolved ? 95 : 70) * STATE.player.stats.areaMul,
    armDelay: 0.25
  });
}

function fireJellyField(w, def) {
  const p = STATE.player;

  spawnBullet({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    life: 0.55,
    radius: (w.evolved ? 94 : 68) * p.stats.areaMul,
    damage: getWeaponDamage(w, def) * 0.35,
    pierce: 999,
    weaponId: w.id,
    type: "field",
    tickTimer: 0,
    color: w.evolved ? "#a98cff" : "#6de4ff"
  });
}

function fireFishMissile(w, def) {
  const p = STATE.player;
  const evolved = w.evolved;
  const count = evolved ? 3 : 1;

  const targets = [...STATE.enemies].sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y));

  for (let i = 0; i < count; i++) {
    const target = targets[i] || targets[0];
    if (!target) return;

    const ang = angle(p.x, p.y, target.x, target.y) + rand(-0.12, 0.12);

    spawnBullet({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang) * (def.speed || 240) * STATE.player.stats.projectileSpeedMul,
      vy: Math.sin(ang) * (def.speed || 240) * STATE.player.stats.projectileSpeedMul,
      life: 2.4,
      radius: evolved ? 8 : 7,
      damage: getWeaponDamage(w, def),
      pierce: 1,
      weaponId: w.id,
      type: "homing",
      targetId: target.id,
      turnRate: evolved ? 4.8 : 3.2,
      color: "#ff8aa0"
    });
  }
}

function fireSonar(w, def) {
  const p = STATE.player;
  const target = getNearestEnemy(p.x, p.y);
  if (!target) return;

  const ang = angle(p.x, p.y, target.x, target.y);

  spawnBullet({
    x: p.x,
    y: p.y,
    vx: Math.cos(ang),
    vy: Math.sin(ang),
    life: w.evolved ? 0.22 : 0.16,
    radius: w.evolved ? 18 : 10,
    damage: getWeaponDamage(w, def) * (w.evolved ? 1.45 : 1.0),
    pierce: w.evolved ? 999 : 5,
    weaponId: w.id,
    type: "beam",
    color: w.evolved ? "#79f7ff" : "#50d7ff",
    length: w.evolved ? 320 : 220
  });
}

function updateOrbitWeapon(w, def, dt) {
  const p = STATE.player;
  const count = w.evolved ? 3 : 1;
  const orbitRadius = (w.evolved ? 86 : 62) * p.stats.areaMul;
  const damage = getWeaponDamage(w, def) * 0.45;

  w.orbitAngle += dt * (w.evolved ? 3.5 : 2.4);

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
      r: 9,
      color: "#7cf7ff",
      life: 0.06
    });
  }
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
    tickTimer: b.tickTimer || 0,
    targetId: b.targetId || null,
    turnRate: b.turnRate || 0,
    length: b.length || 0,
    armDelay: b.armDelay || 0,
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

      if (b.weaponId === "jelly_field" && isWeaponEvolved("jelly_field")) {
        chainLightning(e, b.damage * 0.5, 2);
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

  STATE.effects.push({
    x: b.x,
    y: b.y,
    r: radius,
    color: "#ffb347",
    life: 0.22
  });

  if (isWeaponEvolved("mine")) {
    STATE.effects.push({
      x: b.x,
      y: b.y,
      r: radius * 1.35,
      color: "#ff8c66",
      life: 0.28
    });

    for (const e of STATE.enemies) {
      if (dist(b.x, b.y, e.x, e.y) <= radius * 1.35 + e.r) {
        damageEnemy(e, b.damage * 0.45);
      }
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

    if (b.type === "mine") {
      const x = b.x - cam.x;
      const y = b.y - cam.y;

      ctx.save();
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

    const count = w.evolved ? 3 : 1;
    const orbitRadius = (w.evolved ? 86 : 62) * p.stats.areaMul;

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

function getAvailableEvolutions() {
  const p = STATE.player;
  const out = [];
  if (!p) return out;

  for (const w of p.weapons) {
    if (w.evolved) continue;
    if (w.level < 6) continue;

    const def = getWeaponDef(w.id);
    const evo = def?.evolution;
    if (!evo) continue;

    const need = evo.needsPassive;
    if (!need || getPassiveLevel(need) > 0) {
      out.push({
        weaponId: w.id,
        evolutionName: evo.name || "進化武器"
      });
    }
  }

  return out;
}

function evolveWeapon(weaponId) {
  const w = getWeaponInstance(weaponId);
  if (!w || w.evolved) return false;
  w.evolved = true;
  return true;
}

function isWeaponEvolved(weaponId) {
  const w = getWeaponInstance(weaponId);
  return !!w?.evolved;
}
