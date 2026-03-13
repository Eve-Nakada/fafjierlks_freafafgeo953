// ===============================
// 敵
// ===============================

function getEnemyDef(typeId) {
  return STATE.gameData?.enemyStats?.[typeId] || null;
}

function getEnemySpriteIndex(typeId) {
  const def = getEnemyDef(typeId);
  return def?.spriteIndex || 0;
}

function getEnemyAiPreset(typeId, isBoss = false, bossKind = "boss") {
  const def = getEnemyDef(typeId) || {};
  const ai = def.ai || {};

  if (isBoss && !ai.type) {
    if (bossKind === "leviathan") {
      return {
        aiType: "boss_dash",
        preferRange: 180,
        burstSpeedMul: 2.6,
        rushDuration: 0.9,
        restDuration: 0.9
      };
    }
    return {
      aiType: "boss_weave",
      preferRange: 160,
      strafeSpeedMul: 0.75,
      burstSpeedMul: 1.8,
      rushDuration: 0.7,
      restDuration: 0.8
    };
  }

  return {
    aiType: ai.type || "normal",
    preferRange: ai.preferRange || 0,
    burstSpeedMul: ai.burstSpeedMul || 1.8,
    strafeSpeedMul: ai.strafeSpeedMul || 0.8,
    wobbleMul: ai.wobbleMul || 0.6,
    rushDuration: ai.rushDuration || 0.5,
    restDuration: ai.restDuration || 0.8
  };
}

function cloneEnemyAttacks(typeId) {
  const def = getEnemyDef(typeId) || {};
  return (def.attacks || []).map((a) => ({ ...a, timer: rand(0.1, Math.max(0.25, (a.cooldown || 2) * 0.7)) }));
}

function spawnEnemy(typeId, x, y, isBoss = false, bossKind = "boss") {
  const def = getEnemyDef(typeId);
  if (!def) return null;

  const aiPreset = getEnemyAiPreset(typeId, isBoss, bossKind);
  const enemy = {
    id: `enemy_${Math.random().toString(36).slice(2)}`,
    typeId,
    x,
    y,
    r: isBoss ? 28 : 16,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    xp: def.xp,
    gold: def.gold || 0,
    isBoss,
    bossKind,
    spriteIndex: def.spriteIndex || 0,
    hitFlash: 0,
    dead: false,
    aiType: aiPreset.aiType,
    aiState: "approach",
    aiTimer: rand(0.15, 0.7),
    aiDir: Math.random() < 0.5 ? -1 : 1,
    preferRange: aiPreset.preferRange || 0,
    burstSpeedMul: aiPreset.burstSpeedMul || 1.8,
    strafeSpeedMul: aiPreset.strafeSpeedMul || 0.8,
    wobbleMul: aiPreset.wobbleMul || 0.6,
    rushDuration: aiPreset.rushDuration || 0.5,
    restDuration: aiPreset.restDuration || 0.8,
    contactMul: 1,
    lastDx: 1,
    lastDy: 0,
    attacks: cloneEnemyAttacks(typeId)
  };

  STATE.enemies.push(enemy);
  return enemy;
}

function spawnEnemyAroundPlayer(typeId, minDist = 320, maxDist = 460, isBoss = false, bossKind = "boss") {
  const p = STATE.player;
  if (!p) return;

  const ang = rand(0, Math.PI * 2);
  const d = rand(minDist, maxDist);

  let x = p.x + Math.cos(ang) * d;
  let y = p.y + Math.sin(ang) * d;

  x = clamp(x, 24, STATE.world.width - 24);
  y = clamp(y, 24, STATE.world.height - 24);

  spawnEnemy(typeId, x, y, isBoss, bossKind);
}

function updateEnemies(dt) {
  const p = STATE.player;
  if (!p) return;

  for (const e of STATE.enemies) {
    if (e.dead) continue;

    updateEnemyAi(e, p, dt);
    updateEnemyAttacks(e, p, dt);
    e.hitFlash = Math.max(0, e.hitFlash - dt * 6);

    if (dist(e.x, e.y, p.x, p.y) <= e.r + p.r) {
      damagePlayer(e.damage * (e.contactMul || 1) * dt * 6);
    }
  }

  resolveEnemyDeaths();
}

function updateEnemyAi(e, p, dt) {
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  e.lastDx = nx;
  e.lastDy = ny;
  e.aiTimer -= dt;
  e.contactMul = 1;

  switch (e.aiType) {
    case "slow":
      updateSlowEnemy(e, p, dt, nx, ny, len);
      break;
    case "tank":
      updateTankEnemy(e, p, dt, nx, ny, len);
      break;
    case "rush":
      updateRushEnemy(e, p, dt, nx, ny, len);
      break;
    case "dash":
      updateDashEnemy(e, p, dt, nx, ny, len);
      break;
    case "orbit":
      updateOrbitEnemyAi(e, p, dt, nx, ny, len);
      break;
    case "weave":
      updateWeaveEnemy(e, p, dt, nx, ny, len);
      break;
    case "boss_weave":
      updateBossWeaveEnemy(e, p, dt, nx, ny, len);
      break;
    case "boss_dash":
      updateBossDashEnemy(e, p, dt, nx, ny, len);
      break;
    default:
      moveEnemyByVector(e, nx, ny, e.speed * dt);
      break;
  }

  e.x = clamp(e.x, e.r, STATE.world.width - e.r);
  e.y = clamp(e.y, e.r, STATE.world.height - e.r);
}

function moveEnemyByVector(e, vx, vy, amount) {
  e.x += vx * amount;
  e.y += vy * amount;
}

function getStrafeVector(nx, ny, dir = 1) {
  return {
    x: -ny * dir,
    y: nx * dir
  };
}

function updateSlowEnemy(e, p, dt, nx, ny, len) {
  const wobble = Math.sin(STATE.time * 2.4 + e.x * 0.01 + e.y * 0.01) * e.wobbleMul;
  const side = getStrafeVector(nx, ny, e.aiDir);
  const vx = nx + side.x * wobble * 0.35;
  const vy = ny + side.y * wobble * 0.35;
  const scale = e.speed * (0.72 + Math.max(0, (len - 120) / 300) * 0.18);
  moveEnemyByVector(e, vx, vy, scale * dt);
}

function updateTankEnemy(e, p, dt, nx, ny, len) {
  let mul = 0.62;
  if (len < 110) mul = 0.95;
  if (len < 56) {
    mul = e.burstSpeedMul;
    e.contactMul = 1.25;
  }
  moveEnemyByVector(e, nx, ny, e.speed * mul * dt);
}

function updateRushEnemy(e, p, dt, nx, ny, len) {
  if (e.aiState !== "rush" && e.aiTimer <= 0) {
    e.aiState = e.aiState === "rest" ? "approach" : "rush";
    e.aiTimer = e.aiState === "rush" ? e.rushDuration : e.restDuration;
  }

  if (e.aiState === "rush") {
    e.contactMul = 1.3;
    moveEnemyByVector(e, nx, ny, e.speed * e.burstSpeedMul * dt);
    return;
  }

  if (e.aiState === "rest") {
    const side = getStrafeVector(nx, ny, e.aiDir);
    moveEnemyByVector(e, side.x, side.y, e.speed * 0.4 * dt);
    return;
  }

  if (len < 160) {
    e.aiState = "rush";
    e.aiTimer = e.rushDuration;
  }
  moveEnemyByVector(e, nx, ny, e.speed * 0.92 * dt);
}

function updateDashEnemy(e, p, dt, nx, ny, len) {
  if (e.aiState === "dash") {
    e.contactMul = 1.45;
    moveEnemyByVector(e, nx, ny, e.speed * e.burstSpeedMul * dt);
    if (e.aiTimer <= 0) {
      e.aiState = "rest";
      e.aiTimer = e.restDuration;
    }
    return;
  }

  if (e.aiState === "rest") {
    const side = getStrafeVector(nx, ny, e.aiDir);
    moveEnemyByVector(e, side.x, side.y, e.speed * 0.34 * dt);
    if (e.aiTimer <= 0) {
      e.aiState = "approach";
      e.aiTimer = rand(0.3, 0.6);
    }
    return;
  }

  if (len < 185 && e.aiTimer <= 0) {
    e.aiState = "dash";
    e.aiTimer = e.rushDuration;
    return;
  }

  moveEnemyByVector(e, nx, ny, e.speed * 0.88 * dt);
}

function updateOrbitEnemyAi(e, p, dt, nx, ny, len) {
  const side = getStrafeVector(nx, ny, e.aiDir);
  const ring = e.preferRange || 110;

  let toward = 0;
  if (len > ring + 28) toward = 0.7;
  else if (len < ring - 26) toward = -0.6;

  const vx = nx * toward + side.x * e.strafeSpeedMul;
  const vy = ny * toward + side.y * e.strafeSpeedMul;
  moveEnemyByVector(e, vx, vy, e.speed * dt);

  if (e.aiTimer <= 0) {
    e.aiDir *= -1;
    e.aiTimer = rand(1.0, 1.8);
  }
}

function updateWeaveEnemy(e, p, dt, nx, ny, len) {
  const side = getStrafeVector(nx, ny, e.aiDir);
  const wave = Math.sin(STATE.time * 5 + e.x * 0.02) * 0.6;
  const prefer = e.preferRange || 60;
  let forward = 0.8;
  if (len < prefer) forward = -0.35;
  const vx = nx * forward + side.x * (e.strafeSpeedMul + wave * 0.25);
  const vy = ny * forward + side.y * (e.strafeSpeedMul + wave * 0.25);
  moveEnemyByVector(e, vx, vy, e.speed * dt);

  if (e.aiTimer <= 0) {
    e.aiDir *= -1;
    e.aiTimer = rand(0.8, 1.5);
  }
}

function updateBossWeaveEnemy(e, p, dt, nx, ny, len) {
  const side = getStrafeVector(nx, ny, e.aiDir);
  if (e.aiState === "rush") {
    e.contactMul = 1.35;
    moveEnemyByVector(e, nx * 0.95 + side.x * 0.2, ny * 0.95 + side.y * 0.2, e.speed * e.burstSpeedMul * dt);
    if (e.aiTimer <= 0) {
      e.aiState = "weave";
      e.aiTimer = rand(0.8, 1.2);
      e.aiDir *= -1;
    }
    return;
  }

  const prefer = e.preferRange || 170;
  let forward = 0.52;
  if (len < prefer - 18) forward = -0.35;
  if (len > prefer + 40) forward = 0.85;

  moveEnemyByVector(e, nx * forward + side.x * e.strafeSpeedMul, ny * forward + side.y * e.strafeSpeedMul, e.speed * dt);

  if (e.aiTimer <= 0) {
    if (len < 210) {
      e.aiState = "rush";
      e.aiTimer = e.rushDuration;
    } else {
      e.aiDir *= -1;
      e.aiTimer = rand(0.8, 1.4);
    }
  }
}

function updateBossDashEnemy(e, p, dt, nx, ny, len) {
  if (e.aiState === "dash") {
    e.contactMul = 1.55;
    moveEnemyByVector(e, nx, ny, e.speed * e.burstSpeedMul * dt);
    if (e.aiTimer <= 0) {
      e.aiState = "rest";
      e.aiTimer = e.restDuration;
    }
    return;
  }

  if (e.aiState === "rest") {
    const side = getStrafeVector(nx, ny, e.aiDir);
    moveEnemyByVector(e, side.x * 0.7, side.y * 0.7, e.speed * 0.55 * dt);
    if (e.aiTimer <= 0) {
      e.aiState = "approach";
      e.aiTimer = rand(0.45, 0.8);
    }
    return;
  }

  if (len < 240 && e.aiTimer <= 0) {
    e.aiState = "dash";
    e.aiTimer = e.rushDuration;
    return;
  }

  moveEnemyByVector(e, nx, ny, e.speed * 0.82 * dt);
}

function updateEnemyAttacks(e, p, dt) {
  if (!Array.isArray(e.attacks) || e.attacks.length === 0) return;
  const playerDist = dist(e.x, e.y, p.x, p.y);

  for (const atk of e.attacks) {
    atk.timer -= dt;
    if (atk.timer > 0) continue;
    if (playerDist > (atk.triggerRange || Infinity)) continue;

    executeEnemyAttack(e, p, atk);
    atk.timer = Math.max(0.2, atk.cooldown || 2);
  }
}

function executeEnemyAttack(e, p, atk) {
  switch (atk.type) {
    case "shot":
      spawnAimedEnemyProjectile(e, p, atk, 1, 0);
      break;
    case "spread":
      spawnAimedEnemyProjectile(e, p, atk, atk.count || 3, atk.spread || 0.3);
      break;
    case "line_burst":
      spawnAimedEnemyProjectile(e, p, atk, atk.count || 4, 0.16);
      break;
    case "ring":
      spawnRingEnemyProjectiles(e, atk);
      break;
    case "pulse":
      spawnEnemyPulse(e, atk);
      break;
    case "summon":
      summonEnemiesFromAttack(e, atk);
      break;
    default:
      break;
  }
}

function spawnAimedEnemyProjectile(e, p, atk, count = 1, spread = 0) {
  const baseAng = angle(e.x, e.y, p.x, p.y);
  const center = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    const ang = baseAng + (i - center) * spread;
    spawnEnemyProjectile({
      x: e.x,
      y: e.y,
      vx: Math.cos(ang) * (atk.projectileSpeed || 180),
      vy: Math.sin(ang) * (atk.projectileSpeed || 180),
      life: atk.life || 1.5,
      radius: atk.radius || 6,
      damage: Math.max(4, e.damage * (atk.damageMul || 0.6)),
      color: atk.color || "#ffd2aa"
    });
  }
}

function spawnRingEnemyProjectiles(e, atk) {
  const count = atk.count || 8;
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count;
    spawnEnemyProjectile({
      x: e.x,
      y: e.y,
      vx: Math.cos(ang) * (atk.projectileSpeed || 170),
      vy: Math.sin(ang) * (atk.projectileSpeed || 170),
      life: atk.life || 1.9,
      radius: atk.radius || 6,
      damage: Math.max(5, e.damage * (atk.damageMul || 0.7)),
      color: atk.color || "#c7b7ff"
    });
  }
}

function spawnEnemyPulse(e, atk) {
  STATE.enemyBullets.push({
    id: `epulse_${Math.random().toString(36).slice(2)}`,
    type: "pulse",
    x: e.x,
    y: e.y,
    vx: 0,
    vy: 0,
    life: (atk.telegraph || 0.5) + 0.12,
    delay: atk.telegraph || 0.5,
    radius: atk.radius || 48,
    damage: Math.max(4, e.damage * (atk.damageMul || 0.8)),
    color: atk.color || "#ffc999",
    triggered: false
  });
}

function summonEnemiesFromAttack(e, atk) {
  const count = atk.count || 2;
  const radius = atk.radius || 90;
  for (let i = 0; i < count; i++) {
    const ang = rand(0, Math.PI * 2);
    const x = clamp(e.x + Math.cos(ang) * radius, 28, STATE.world.width - 28);
    const y = clamp(e.y + Math.sin(ang) * radius, 28, STATE.world.height - 28);
    spawnEnemy(atk.summonType || "small_fish", x, y, false, "normal");
  }
}

function spawnEnemyProjectile(opts) {
  STATE.enemyBullets.push({
    id: `eb_${Math.random().toString(36).slice(2)}`,
    type: opts.type || "projectile",
    x: opts.x,
    y: opts.y,
    vx: opts.vx || 0,
    vy: opts.vy || 0,
    life: opts.life || 1.2,
    delay: opts.delay || 0,
    radius: opts.radius || 5,
    damage: opts.damage || 4,
    color: opts.color || "#ffd0a0",
    triggered: false
  });
}

function updateEnemyProjectiles(dt) {
  const p = STATE.player;
  if (!p) return;

  const next = [];
  for (const b of STATE.enemyBullets || []) {
    b.life -= dt;
    if (b.life <= 0) continue;

    if (b.type === "pulse") {
      b.delay -= dt;
      if (b.delay <= 0 && !b.triggered) {
        b.triggered = true;
        if (dist(b.x, b.y, p.x, p.y) <= b.radius + p.r) {
          damagePlayer(b.damage);
        }
      }
      next.push(b);
      continue;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (dist(b.x, b.y, p.x, p.y) <= b.radius + p.r) {
      damagePlayer(b.damage);
      continue;
    }

    if (b.x < -64 || b.y < -64 || b.x > STATE.world.width + 64 || b.y > STATE.world.height + 64) {
      continue;
    }

    next.push(b);
  }

  STATE.enemyBullets = next;
}

function damageEnemy(enemy, amount) {
  if (!enemy || enemy.dead) return;
  enemy.hp -= amount;
  enemy.hitFlash = 1;

  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.dead = true;
  }
}

function resolveEnemyDeaths() {
  const next = [];

  for (const e of STATE.enemies) {
    if (!e.dead) {
      next.push(e);
      continue;
    }

    dropEnemyRewards(e);
  }

  STATE.enemies = next;
}

function dropEnemyRewards(enemy) {
  markEnemyDefeated(enemy.typeId);

  if (enemy.isBoss) {
    STATE.score += enemy.bossKind === "leviathan" ? 3000 : 1200;
    STATE.chests.push({
      x: enemy.x,
      y: enemy.y,
      r: 18
    });
    onBossDefeated(enemy);
  } else {
    STATE.score += 20;
  }

  registerKillChain(enemy);

  if (enemy.gold) {
    addGold(enemy.gold);
  }

  dropXPGem(enemy.x, enemy.y, enemy.xp || 1);
}

function renderEnemies(ctx) {
  const cam = STATE.camera;

  for (const e of STATE.enemies) {
    const sx = e.x - cam.x;
    const sy = e.y - cam.y;

    ctx.save();

    if (e.hitFlash > 0) {
      ctx.globalAlpha = 0.75;
    }

    if (e.isBoss) {
      const sheetKey = e.bossKind === "leviathan" ? "leviathan" : "boss";
      const dir = getEnemyDirIndex(e);
      const ok = drawDirectionalSprite(ctx, sheetKey, dir, sx - 34, sy - 34, 68, 68);

      if (!ok) {
        ctx.fillStyle = e.bossKind === "leviathan" ? "#b46cff" : "#ff9f7d";
        ctx.beginPath();
        ctx.arc(sx, sy, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const ok = drawSpriteFrame(ctx, "enemies", e.spriteIndex, sx - 22, sy - 22, 44, 44);

      if (!ok) {
        ctx.fillStyle = "#ffcc88";
        ctx.beginPath();
        ctx.arc(sx, sy, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
    renderEnemyHpBar(ctx, e, sx, sy);
  }
}

function getEnemyDirIndex(enemy) {
  const dx = enemy.lastDx || 1;
  const dy = enemy.lastDy || 0;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 1 : 3;
  }
  return dy > 0 ? 2 : 0;
}

function renderEnemyHpBar(ctx, e, x, y) {
  const w = e.isBoss ? 54 : 34;
  const h = 4;
  const ratio = clamp(e.hp / e.maxHp, 0, 1);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - w * 0.5, y - (e.isBoss ? 44 : 28), w, h);

  ctx.fillStyle = e.isBoss ? "#ff9f7d" : "#ff6b6b";
  ctx.fillRect(x - w * 0.5, y - (e.isBoss ? 44 : 28), w * ratio, h);
}

function renderEnemyProjectiles(ctx) {
  const cam = STATE.camera;
  for (const b of STATE.enemyBullets || []) {
    const x = b.x - cam.x;
    const y = b.y - cam.y;

    if (b.type === "pulse") {
      ctx.save();
      const warnAlpha = b.triggered ? 0.45 : 0.18;
      ctx.globalAlpha = warnAlpha;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(x, y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(x, y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
