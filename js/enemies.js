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

function getBossSpriteKey(enemy) {
  if (!enemy) return 'enemies';
  if (enemy.typeId === 'boss_manta') return 'boss';
  if (enemy.typeId === 'leviathan' || enemy.bossKind === 'leviathan') return 'leviathan';
  return 'enemies';
}

function getBossDrawScale(enemy) {
  const def = getEnemyDef(enemy?.typeId) || {};
  return Math.max(1, Number(enemy?.bossScale || def.bossScale || 1));
}

function getEnemyDirectionalIndex(enemy) {
  if (!enemy) return 0;

  const dx = Number(enemy.vx || 0);
  const dy = Number(enemy.vy || 0);

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? 1 : 3;
  }

  // 上下を逆転
  return dy >= 0 ? 0 : 2;
}

function getBossBaseSize(enemy) {
  const base = Number(enemy?.baseRenderSize || enemy?.r * 2.6 || 72);
  return base * getBossDrawScale(enemy);
}

function canBossTakeDamage(enemy) {
  if (!enemy?.isBoss) return true;
  return !enemy.shieldActive;
}

function applyBossShieldDamage(enemy, damage) {
  if (!enemy?.isBoss || !enemy.shieldActive) return false;

  const dmg = Math.max(0, Number(damage || 0));
  if (dmg <= 0) return true;

  enemy.shieldHp = Math.max(0, Number(enemy.shieldHp || enemy.shieldMaxHp || 3000) - dmg);

  addEffect?.(enemy.x, enemy.y, enemy.r * 1.45, '#8de8ff', 0.12, 0.18);

  if (enemy.shieldHp <= 0) {
    enemy.shieldHp = 0;
    enemy.shieldActive = false;
    enemy.shieldRespawnTimer = Math.max(0.5, Number(enemy.shieldRespawnDelay || 10));
    addEffect?.(enemy.x, enemy.y, enemy.r * 1.8, '#c8f3ff', 0.24, 0.3);
  }

  return true;
}

function makeEliteEnemy(enemy, options = {}) {
  if (!enemy) return null;

  const hpMul = Math.max(1, Number(options.hpMul || 15));
  const shieldHits = Math.max(1, Math.round(Number(options.shieldHits || 1)));
  const sizeMul = Math.max(1, Number(options.sizeMul || 3));
  const damageMul = Math.max(1, Number(options.damageMul || 2.2));
  const speedMul = Math.max(1, Number(options.speedMul || 1.12));

  enemy.isElite = true;
  enemy.elitePattern = options.pattern || "elite";
  enemy.eliteShieldHits = shieldHits;
  enemy.eliteShieldMaxHits = shieldHits;

  enemy.hp = Math.max(1, Math.round(Number(enemy.hp || 1) * hpMul));
  enemy.maxHp = enemy.hp;

  enemy.damage = Math.max(1, Number(enemy.damage || 1) * damageMul);
  enemy.speed = Math.max(1, Number(enemy.speed || 1) * speedMul);

  enemy.r = Math.max(18, Number(enemy.r || 18) * sizeMul);
  enemy.baseRenderSize = Math.max(40, Number(enemy.baseRenderSize || 40) * sizeMul);

  enemy.gold = Math.max(
    Number(enemy.gold || 0),
    Number(options.goldBonus || 0) + Number(enemy.gold || 0)
  );
  enemy.xp = Math.max(
    Number(enemy.xp || 0),
    Number(options.xpBonus || 0) + Number(enemy.xp || 0)
  );

  return enemy;
}

function consumeEliteBarrierHit(enemy) {
  if (!enemy?.isElite) return false;
  if ((enemy.eliteShieldHits || 0) <= 0) return false;

  enemy.eliteShieldHits = Math.max(0, Number(enemy.eliteShieldHits || 0) - 1);
  enemy.damageFlash = 0.08;

  addEffect?.(enemy.x, enemy.y, Math.max(18, (enemy.r || 18) * 1.6), "#8de8ff", 0.14, 0.16);

  return true;
}

function cloneEnemyAttacks(typeId) {
  const def = getEnemyDef(typeId) || {};
  return (def.attacks || []).map((a) => ({
    ...a,
    timer: rand(0.1, Math.max(0.25, (a.cooldown || 2) * 0.7))
  }));
}

function spawnEnemy(typeId, x, y, isBoss = false, behavior = 'normal') {
  const def = getEnemyDef(typeId);
  if (!def) return null;

  const r = isBoss ? 42 : 16 + Math.max(0, Number(def.hp || 40)) * 0.02;
  const bossScale = isBoss ? Math.max(1, Number(def.bossScale || 3)) : 1;
  const shieldMaxHp = isBoss ? Math.max(1, Number(def.shieldHp || 3000)) : 0;

  const aiPreset = getEnemyAiPreset(typeId, isBoss, behavior);

  const enemy = {
    id: `enemy_${Math.random().toString(36).slice(2)}`,
    typeId,
    x,
    y,
    vx: 0,
    vy: 0,
    r,
    hp: Number(def.hp || 10),
    maxHp: Number(def.hp || 10),
    speed: Number(def.speed || 60),
    damage: Number(def.damage || 10),
    xp: Number(def.xp || 1),
    gold: Number(def.gold || 0),
    spriteIndex: Number(def.spriteIndex || 0),

    ai: def.ai || { type: behavior || 'normal' },
    aiType: aiPreset.aiType || "normal",
    preferRange: Number(aiPreset.preferRange || 0),
    burstSpeedMul: Number(aiPreset.burstSpeedMul || 1.8),
    strafeSpeedMul: Number(aiPreset.strafeSpeedMul || 0.8),
    wobbleMul: Number(aiPreset.wobbleMul || 0.6),
    rushDuration: Number(aiPreset.rushDuration || 0.5),
    restDuration: Number(aiPreset.restDuration || 0.8),
    aiTimer: rand(0.2, 0.8),
    aiState: "approach",
    aiDir: Math.random() < 0.5 ? -1 : 1,
    contactMul: 1,
    lastDx: 0,
    lastDy: 1,

    attacks: cloneEnemyAttacks(typeId),

    isBoss: !!isBoss,
    bossKind: behavior,
    bossScale,
    baseRenderSize: isBoss ? 72 : 40,

    shieldActive: !!isBoss && shieldMaxHp > 0,
    shieldHp: shieldMaxHp,
    shieldMaxHp,
    shieldRespawnDelay: Math.max(0.5, Number(def.shieldRespawnDelay || 10)),
    shieldRespawnTimer: 0,
    switchCount: Number(def.switchCount || 0),
    wallPhaseTimer: isBoss ? 2.8 : 0,

    attackDrones: [],
    attackPatternTimer: 0,
    waveBeamCooldown: 2.8,
    waveBeamTimer: 1.5,

    dead: false,
    damageFlash: 0
  };

  STATE.enemies.push(enemy);
  return enemy;
}

function spawnBossOrbitDroneBurst(boss, kind = "star", count = 5) {
  if (!boss) return;
  if (!Array.isArray(boss.attackDrones)) boss.attackDrones = [];

  const liveCount = boss.attackDrones.filter((d) => !d.dead).length;
  const cap = kind === "wave" ? count : Math.max(count, 7);
  if (liveCount >= cap) return;

  const spawnCount = cap - liveCount;
  const baseAngle = rand(0, Math.PI * 2);

  for (let i = 0; i < spawnCount; i++) {
    let starMode = "charge";

    if (kind === "star") {
      const roll = i % 3;
      if (roll === 0) starMode = "charge";
      else if (roll === 1) starMode = "boomerang";
      else starMode = "turret";
    }

    const isWave = kind === "wave";

    boss.attackDrones.push({
      id: `boss_drone_${Math.random().toString(36).slice(2)}`,
      kind,
      mode: isWave ? "charge" : starMode,
      angle: baseAngle + (Math.PI * 2 * i) / Math.max(1, spawnCount),
      orbitRadius: boss.r + getBossBaseSize(boss) * (isWave ? 0.42 : 0.46),
      orbitSpeed: isWave ? 1.7 : 2.25,
      hoverTime: isWave ? 1.7 : rand(0.7, 1.25),
      chargeSpeed: isWave ? 340 : (starMode === "boomerang" ? 330 : 400),
      phase: "orbit",
      x: boss.x,
      y: boss.y,
      vx: 0,
      vy: 0,
      rot: 0,
      size: isWave ? 36 : (starMode === "turret" ? 30 : 28),
      damage: isWave ? 400 : (starMode === "turret" ? 140 : 200),
      life: isWave ? 5.4 : 6.0,
      shotTimer: starMode === "turret" ? 0.32 : 0,
      burstLeft: starMode === "turret" ? 3 : 0,
      returnDelay: starMode === "boomerang" ? 0.42 : 0,
      dead: false
    });
  }
}

function updateBossAttackDrones(boss, dt) {
  if (!boss || !Array.isArray(boss.attackDrones) || !STATE.player) return;

  const p = STATE.player;
  const next = [];

  for (const d of boss.attackDrones) {
    if (!d || d.dead) continue;

    d.life -= dt;
    if (d.life <= 0) continue;

    if (d.phase === "orbit") {
      d.hoverTime -= dt;
      d.angle += (d.orbitSpeed || 0) * dt;
      d.x = boss.x + Math.cos(d.angle) * (d.orbitRadius || 0);
      d.y = boss.y + Math.sin(d.angle) * (d.orbitRadius || 0);
      d.rot += dt * 5.5;

      if (d.hoverTime <= 0) {
        const ang = angle(d.x, d.y, p.x, p.y);

        if (d.mode === "turret") {
          d.phase = "turret";
          d.rot = ang;
        } else {
          d.vx = Math.cos(ang) * (d.chargeSpeed || 0);
          d.vy = Math.sin(ang) * (d.chargeSpeed || 0);
          d.phase = "charge";
          d.rot = ang;
        }
      }
    } else if (d.phase === "turret") {
      d.rot = angle(d.x, d.y, p.x, p.y);
      d.shotTimer = Math.max(0, Number(d.shotTimer || 0) - dt);

      if (d.shotTimer <= 0 && (d.burstLeft || 0) > 0) {
        d.shotTimer = 0.24;
        d.burstLeft -= 1;

        // 正面3WAY
        const base = angle(d.x, d.y, p.x, p.y);
        for (let i = -1; i <= 1; i++) {
          const ang = base + i * 0.24;
          spawnEnemyProjectile({
            x: d.x,
            y: d.y,
            vx: Math.cos(ang) * 240,
            vy: Math.sin(ang) * 240,
            life: 1.8,
            radius: 7,
            damage: 70,
            color: "#ffe28a"
          });
        }

        // 最後にリング弾
        if (d.burstLeft <= 0) {
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI * 2 * i) / 8;
            spawnEnemyProjectile({
              x: d.x,
              y: d.y,
              vx: Math.cos(ang) * 190,
              vy: Math.sin(ang) * 190,
              life: 1.7,
              radius: 6,
              damage: 55,
              color: "#ffd59c"
            });
          }
          continue;
        }
      }
    } else if (d.phase === "charge") {
      d.x += (d.vx || 0) * dt;
      d.y += (d.vy || 0) * dt;
      d.rot = Math.atan2(d.vy || 0, d.vx || 0);

      if (d.mode === "boomerang") {
        d.returnDelay = Math.max(0, Number(d.returnDelay || 0) - dt);
        if (d.returnDelay <= 0) {
          d.phase = "return";
        }
      }

      if (
        d.x < -80 || d.x > STATE.world.width + 80 ||
        d.y < -80 || d.y > STATE.world.height + 80
      ) {
        continue;
      }
    } else if (d.phase === "return") {
      const ang = angle(d.x, d.y, boss.x, boss.y);
      const speed = d.chargeSpeed || 320;
      d.vx = Math.cos(ang) * speed;
      d.vy = Math.sin(ang) * speed;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot = ang;

      if (dist(d.x, d.y, boss.x, boss.y) <= Math.max(18, boss.r * 0.8)) {
        continue;
      }
    }

    if (dist(d.x, d.y, p.x, p.y) <= (d.size * 0.38) + p.r) {
      damagePlayer?.(d.damage, {
        id: d.kind === "wave" ? "leviathan_wave_drone" : "boss_star_drone",
        label: d.kind === "wave" ? "リヴァイアサン波ドローン" : "ボスエイ星ドローン"
      });
      continue;
    }

    next.push(d);
  }

  boss.attackDrones = next;
}

function renderBossAttackDrones(ctx, boss) {
  if (!boss || !Array.isArray(boss.attackDrones) || boss.attackDrones.length <= 0) return;

  const cam = STATE.camera;

  for (const d of boss.attackDrones) {
    const x = d.x - cam.x;
    const y = d.y - cam.y;
    const key = d.kind === 'wave' ? 'boss_wave_drone' : 'boss_star_drone';

    const ok = drawRotatedSpriteFrame(
      ctx,
      key,
      0,
      x,
      y,
      d.size,
      d.size,
      d.rot || 0
    );

    if (!ok) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.rot || 0);
      ctx.fillStyle = d.kind === 'wave' ? '#9fe7ff' : '#ffe28a';
      ctx.beginPath();
      ctx.arc(0, 0, d.size * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
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

// ===============================
// ドローン被弾 / ターゲット補助
// ===============================

function getLiveDrones() {
  return (STATE.drones || []).filter((d) => d && d.deadTimer <= 0 && d.hp > 0);
}

function getDroneRadius(drone) {
  if (!drone) return 16;
  return drone.r || 16;
}

function getActiveBarrierDrone() {
  return getLiveDrones().find((d) => d.type === "barrier") || null;
}

function getNonBarrierDrones() {
  return getLiveDrones().filter((d) => d.type !== "barrier");
}

function damageDrone(drone, amount) {
  if (!drone || drone.deadTimer > 0 || drone.hp <= 0) return false;

  drone.hp = Math.max(0, drone.hp - amount);
  if (drone.hp <= 0) {
    drone.hp = 0;
    drone.deadTimer = 5;
  }
  return true;
}

function getEnemyPrimaryTarget(player) {
  return getActiveBarrierDrone() || player;
}

function getDroneHitByCircle(x, y, radius, includeBarrierFirst = true) {
  const live = getLiveDrones();
  if (live.length <= 0) return null;

  if (includeBarrierFirst) {
    const barrier = getActiveBarrierDrone();
    if (barrier && dist(x, y, barrier.x, barrier.y) <= radius + getDroneRadius(barrier)) {
      return barrier;
    }
  }

  for (const d of live) {
    if (includeBarrierFirst && d.type === "barrier") continue;
    if (dist(x, y, d.x, d.y) <= radius + getDroneRadius(d)) {
      return d;
    }
  }

  return null;
}

function updateEnemies(dt) {
  const p = STATE.player;
  if (!p) return;

  const next = [];

  for (const enemy of STATE.enemies || []) {
    if (!enemy || enemy.dead) continue;

    enemy.damageFlash = Math.max(0, Number(enemy.damageFlash || 0) - dt);

    const target = (typeof getEnemyPrimaryTarget === "function")
      ? (getEnemyPrimaryTarget(p) || p)
      : p;

    if (enemy.isBoss && Number(enemy.shieldRespawnTimer || 0) > 0) {
      enemy.shieldRespawnTimer = Math.max(0, enemy.shieldRespawnTimer - dt);
      if (enemy.shieldRespawnTimer <= 0 && (enemy.shieldMaxHp || 0) > 0) {
        enemy.shieldActive = true;
        enemy.shieldHp = enemy.shieldMaxHp;
        addEffect?.(enemy.x, enemy.y, enemy.r * 1.9, "#9fe8ff", 0.22, 0.18);
      }
    }

    updateEnemyAi(enemy, target, dt);
    updateEnemyAttacks(enemy, target, dt);

    const vx = Number(enemy.x - (enemy.prevX ?? enemy.x));
    const vy = Number(enemy.y - (enemy.prevY ?? enemy.y));
    enemy.vx = Number.isFinite(vx) ? vx / Math.max(dt, 0.0001) : 0;
    enemy.vy = Number.isFinite(vy) ? vy / Math.max(dt, 0.0001) : 0;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;

    if (enemy.isBoss) {
      updateBossAttackDrones(enemy, dt);
    }

    const hitTarget = (typeof getEnemyPrimaryTarget === "function")
      ? (getEnemyPrimaryTarget(p) || p)
      : p;

    if (hitTarget && dist(enemy.x, enemy.y, hitTarget.x, hitTarget.y) <= enemy.r + (hitTarget.r || 0)) {
      if (hitTarget === p) {
        damagePlayer?.(enemy.damage * (enemy.contactMul || 1) * dt, {
          id: enemy.typeId,
          label: getEnemyDef(enemy.typeId)?.name || enemy.typeId
        });
      } else {
        damageDrone?.(hitTarget, enemy.damage * (enemy.contactMul || 1) * dt);
      }
    }

    if (enemy.hp > 0) {
      next.push(enemy);
      continue;
    }

    enemy.dead = true;

    if (enemy.isBoss && typeof onBossDefeated === 'function') {
      onBossDefeated(enemy);
    }
    if (enemy.typeId === 'leviathan') {
      STATE.isGameClear = true;
    }

    dropXPGem?.(enemy.x, enemy.y, enemy.xp || 1);
    if ((enemy.gold || 0) > 0) addGold?.(enemy.gold);
    addEffect?.(
      enemy.x,
      enemy.y,
      enemy.isBoss ? 44 : 22,
      enemy.isBoss ? '#ffd8c7' : '#ffb0a0',
      0.24,
      0.26
    );
  }

  STATE.enemies = next;
}

function updateEnemyAi(e, target, dt) {
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  e.lastDx = nx;
  e.lastDy = ny;
  e.aiTimer -= dt;
  e.contactMul = 1;

  switch (e.aiType) {
    case "slow":
      updateSlowEnemy(e, target, dt, nx, ny, len);
      break;
    case "tank":
      updateTankEnemy(e, target, dt, nx, ny, len);
      break;
    case "rush":
      updateRushEnemy(e, target, dt, nx, ny, len);
      break;
    case "dash":
      updateDashEnemy(e, target, dt, nx, ny, len);
      break;
    case "orbit":
      updateOrbitEnemyAi(e, target, dt, nx, ny, len);
      break;
    case "weave":
      updateWeaveEnemy(e, target, dt, nx, ny, len);
      break;
    case "boss_weave":
      updateBossWeaveEnemy(e, target, dt, nx, ny, len);
      break;
    case "boss_dash":
      updateBossDashEnemy(e, target, dt, nx, ny, len);
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

function updateSlowEnemy(e, target, dt, nx, ny, len) {
  const wobble = Math.sin(STATE.time * 2.4 + e.x * 0.01 + e.y * 0.01) * e.wobbleMul;
  const side = getStrafeVector(nx, ny, e.aiDir);
  const vx = nx + side.x * wobble * 0.35;
  const vy = ny + side.y * wobble * 0.35;
  const scale = e.speed * (0.72 + Math.max(0, (len - 120) / 300) * 0.18);
  moveEnemyByVector(e, vx, vy, scale * dt);
}

function updateTankEnemy(e, target, dt, nx, ny, len) {
  let mul = 0.62;
  if (len < 110) mul = 0.95;
  if (len < 56) {
    mul = e.burstSpeedMul;
    e.contactMul = 1.25;
  }
  moveEnemyByVector(e, nx, ny, e.speed * mul * dt);
}

function updateRushEnemy(e, target, dt, nx, ny, len) {
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

function updateDashEnemy(e, target, dt, nx, ny, len) {
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

function updateOrbitEnemyAi(e, target, dt, nx, ny, len) {
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

function updateWeaveEnemy(e, target, dt, nx, ny, len) {
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

function updateBossWeaveEnemy(e, target, dt, nx, ny, len) {
  const side = getStrafeVector(nx, ny, e.aiDir);
  if (e.aiState === "rush") {
    e.contactMul = 1.35;
    moveEnemyByVector(
      e,
      nx * 0.95 + side.x * 0.2,
      ny * 0.95 + side.y * 0.2,
      e.speed * e.burstSpeedMul * dt
    );
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

  moveEnemyByVector(
    e,
    nx * forward + side.x * e.strafeSpeedMul,
    ny * forward + side.y * e.strafeSpeedMul,
    e.speed * dt
  );

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

function updateBossDashEnemy(e, target, dt, nx, ny, len) {
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

function updateEnemyAttacks(e, target, dt) {
  if (!Array.isArray(e.attacks) || e.attacks.length === 0) return;
  const targetDist = dist(e.x, e.y, target.x, target.y);

  for (const atk of e.attacks) {
    atk.timer -= dt;
    if (atk.timer > 0) continue;
    if (targetDist > (atk.triggerRange || Infinity)) continue;

    executeEnemyAttack(e, target, atk);
    atk.timer = Math.max(0.2, atk.cooldown || 2);
  }
}

function executeEnemyAttack(e, target, atk) {
  switch (atk.type) {
    case "shot":
      spawnAimedEnemyProjectile(e, target, atk, 1, 0);
      break;
    case "spread":
      spawnAimedEnemyProjectile(e, target, atk, atk.count || 3, atk.spread || 0.3);
      break;
    case "line_burst":
      spawnAimedEnemyProjectile(e, target, atk, atk.count || 4, 0.16);
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

function spawnAimedEnemyProjectile(e, target, atk, count = 1, spread = 0) {
  const baseAng = angle(e.x, e.y, target.x, target.y);
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

    const projectileCause = {
      id: b.type === "pulse" ? "enemy_pulse" : "enemy_projectile",
      label: b.type === "pulse" ? "敵パルス弾" : "敵弾"
    };

    if (b.type === "pulse") {
      b.delay -= dt;
      if (b.delay <= 0 && !b.triggered) {
        b.triggered = true;

        const barrier = getActiveBarrierDrone();
        if (barrier && dist(b.x, b.y, barrier.x, barrier.y) <= b.radius + getDroneRadius(barrier)) {
          damageDrone(barrier, b.damage);
        } else {
          const otherDrone = getDroneHitByCircle(b.x, b.y, b.radius, false);
          if (otherDrone) {
            damageDrone(otherDrone, b.damage);
          } else if (dist(b.x, b.y, p.x, p.y) <= b.radius + p.r) {
            damagePlayer(b.damage, projectileCause);
          }
        }
      }
      next.push(b);
      continue;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const barrier = getActiveBarrierDrone();
    if (barrier && dist(b.x, b.y, barrier.x, barrier.y) <= b.radius + getDroneRadius(barrier)) {
      damageDrone(barrier, b.damage);
      continue;
    }

    const otherDrone = getDroneHitByCircle(b.x, b.y, b.radius, false);
    if (otherDrone) {
      damageDrone(otherDrone, b.damage);
      continue;
    }

    if (dist(b.x, b.y, p.x, p.y) <= b.radius + p.r) {
      damagePlayer(b.damage, projectileCause);
      continue;
    }

    if (b.x < -64 || b.y < -64 || b.x > STATE.world.width + 64 || b.y > STATE.world.height + 64) {
      continue;
    }

    next.push(b);
  }

  STATE.enemyBullets = next;
}

function damageEnemy(enemy, damage, source = null) {
  if (!enemy || enemy.dead) return false;

  const dmg = Math.max(0, Number(damage || 0));
  if (dmg <= 0) return false;

  enemy.damageFlash = 0.12;

  if (enemy.isElite && (enemy.eliteShieldHits || 0) > 0) {
    consumeEliteBarrierHit(enemy);
    return true;
  }

  if (enemy.isBoss && enemy.shieldActive) {
    applyBossShieldDamage(enemy, dmg);
    return true;
  }

  enemy.hp = Math.max(0, Number(enemy.hp || 0) - dmg);
  return true;
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

    if (enemy.bossKind === "leviathan") {
      STATE.isGameClear = true;
      if (typeof onGameClear === 'function') onGameClear();
    } else {
      STATE.chests.push({
        x: enemy.x,
        y: enemy.y,
        r: 18
      });
    }

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

  for (const enemy of STATE.enemies || []) {
    if (!enemy || enemy.dead) continue;

    const x = enemy.x - cam.x;
    const y = enemy.y - cam.y;

    let size = enemy.isBoss ? getBossBaseSize(enemy) : (enemy.baseRenderSize || 40);
    const dirIndex = getEnemyDirectionalIndex(enemy);
    const spriteKey = getBossSpriteKey(enemy);

    let drawOk = false;

    ctx.save();

    if (enemy.damageFlash > 0) {
      ctx.globalAlpha = 0.8;
    }

    if (enemy.isBoss) {
      drawOk = drawDirectionalSprite(
        ctx,
        spriteKey,
        dirIndex,
        x - size * 0.5,
        y - size * 0.5,
        size,
        size
      );
    } else {
      drawOk = drawSpriteFrame(
        ctx,
        "enemies",
        enemy.spriteIndex || 0,
        x - size * 0.5,
        y - size * 0.5,
        size,
        size
      );
    }

    if (!drawOk) {
      ctx.fillStyle = enemy.isBoss ? '#ffb38a' : '#ffcc88';
      ctx.beginPath();
      ctx.arc(x, y, enemy.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (enemy.isBoss) {
      renderBossShieldRing(ctx, enemy, x, y, size);
      renderBossAttackDrones(ctx, enemy);
    }

    renderEnemyHpBar(ctx, enemy, x, y, size);
  }
}

function renderBossShieldRing(ctx, enemy, x, y, size) {
  if (!enemy?.isBoss) return;

  const radius = size * 0.62;
  const lineW = Math.max(6, size * 0.055);

  let ratio = 0;
  let color = '#8de8ff';

  if (enemy.shieldActive) {
    ratio = clamp((enemy.shieldHp || 0) / Math.max(1, enemy.shieldMaxHp || 1), 0, 1);
    color = '#8de8ff';
  } else {
    ratio = clamp(
      1 - (enemy.shieldRespawnTimer || 0) / Math.max(0.001, enemy.shieldRespawnDelay || 10),
      0,
      1
    );
    color = '#ffe28a';
  }

  ctx.save();

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * ratio);
  ctx.stroke();

  if (enemy.shieldActive) {
    ctx.strokeStyle = 'rgba(141,232,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + lineW * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function getEnemyDirIndex(enemy) {
  const dx = enemy.lastDx || 1;
  const dy = enemy.lastDy || 0;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 1 : 3;
  }
  return dy > 0 ? 2 : 0;
}

function renderEnemyHpBar(ctx, enemy, x, y, size = 40) {
  const w = enemy.isBoss ? Math.max(90, size * 0.6) : Math.max(28, size * 0.55);
  const h = enemy.isBoss ? 8 : 5;
  const top = y - size * 0.62 - 12;

  const ratio = clamp((enemy.hp || 0) / Math.max(1, enemy.maxHp || 1), 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(x - w * 0.5, top, w, h);

  ctx.fillStyle = enemy.isBoss ? "#ff8f70" : enemy.isElite ? "#ffd166" : "#8fffaa";
  ctx.fillRect(x - w * 0.5, top, w * ratio, h);

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w * 0.5, top, w, h);

  if (enemy.isElite && (enemy.eliteShieldMaxHits || 0) > 0) {
    const total = Math.max(1, Number(enemy.eliteShieldMaxHits || 0));
    const remain = Math.max(0, Number(enemy.eliteShieldHits || 0));
    const dotY = top - 7;
    const startX = x - ((total - 1) * 6) * 0.5;

    for (let i = 0; i < total; i++) {
      ctx.fillStyle = i < remain ? "#8de8ff" : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(startX + i * 6, dotY, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
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
