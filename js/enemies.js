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

  const cap = Math.max(1, Number(STATE.objectCaps?.enemies || 400));
  const current = Array.isArray(STATE.enemies) ? STATE.enemies.length : 0;

  // ボス出現時は枠を確保するため、通常敵を先に間引く
  if (isBoss && current >= cap) {
    let need = current - cap + 1;

    if (need > 0 && Array.isArray(STATE.enemies)) {
      const survivors = [];
      for (const e of STATE.enemies) {
        if (
          need > 0 &&
          e &&
          !e.isBoss &&
          !e.dead
        ) {
          need--;
          continue;
        }
        survivors.push(e);
      }
      STATE.enemies = survivors;
    }
  }

  // それでも満員なら追加しない
  if ((STATE.enemies?.length || 0) >= cap) {
    return null;
  }

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
  const cap = Math.max(count, kind === "wave" ? 8 : 7);
  if (liveCount >= cap) return;

  const spawnCount = cap - liveCount;
  const baseAngle = rand(0, Math.PI * 2);

  const modeTable = kind === "wave"
    ? ["charge", "boomerang", "turret", "spiral", "cross", "homing"]
    : ["charge", "boomerang", "turret", "spiral", "cross", "homing"];

  for (let i = 0; i < spawnCount; i++) {
    const mode = modeTable[i % modeTable.length];
    const isWave = kind === "wave";

    boss.attackDrones.push({
      id: `boss_drone_${Math.random().toString(36).slice(2)}`,
      kind,
      mode,
      angle: baseAngle + (Math.PI * 2 * i) / Math.max(1, spawnCount),

      orbitRadius: boss.r + getBossBaseSize(boss) * (isWave ? 0.44 : 0.46),
      orbitSpeed: isWave ? 1.85 : 2.35,
      hoverTime: isWave ? rand(0.9, 1.45) : rand(0.7, 1.2),

      chargeSpeed:
        mode === "boomerang" ? (isWave ? 340 : 330) :
        mode === "homing" ? (isWave ? 290 : 280) :
        (isWave ? 380 : 410),

      phase: "orbit",
      x: boss.x,
      y: boss.y,
      vx: 0,
      vy: 0,
      rot: 0,

      size:
        mode === "turret" ? (isWave ? 34 : 30) :
        mode === "cross" ? (isWave ? 38 : 30) :
        (isWave ? 36 : 28),

      damage:
        mode === "turret" ? (isWave ? 180 : 140) :
        mode === "homing" ? (isWave ? 220 : 160) :
        (isWave ? 400 : 200),

      life: isWave ? 6.4 : 5.8,

      shotTimer:
        mode === "turret" ? 0.22 :
        mode === "spiral" ? 0.08 :
        mode === "cross" ? 0.36 :
        mode === "homing" ? 0.42 :
        0,

      burstLeft:
        mode === "turret" ? 4 :
        mode === "spiral" ? 18 :
        mode === "cross" ? 3 :
        mode === "homing" ? 4 :
        0,

      spiralAngle: rand(0, Math.PI * 2),
      returnDelay: mode === "boomerang" ? 0.42 : 0,
      dead: false
    });
  }
}

function updateBossAttackDrones(boss, dt) {
  if (!boss || !Array.isArray(boss.attackDrones) || !STATE.player) return;

  const p = STATE.player;
  const next = [];

  const emitCrossShot = (x, y, speed, damage, radius, color) => {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
  
    for (const dir of dirs) {
      spawnEnemyProjectile({
        x,
        y,
        vx: dir.x * speed,
        vy: dir.y * speed,
        life: 1.9,
        radius,
        damage,
        color,
        visual: "cross"
      });
    }
  };

  const emitSpiralShot = (d, speed, damage, radius, color) => {
    d.spiralAngle = Number(d.spiralAngle || 0) + 0.52;
    for (let k = 0; k < 2; k++) {
      const ang = d.spiralAngle + Math.PI * k;
      spawnEnemyProjectile({
        x: d.x,
        y: d.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 2.2,
        radius,
        damage,
        color,
        spin: d.kind === "wave" ? 3.8 : 3.2,
        visual: "spiral"
      });
    }
  };

  const emitHomingMiniStar = (d, speed, damage, radius, color, turnRate) => {
    const base = angle(d.x, d.y, p.x, p.y);
    for (let i = -1; i <= 1; i++) {
      const ang = base + i * 0.18;
      spawnEnemyProjectile({
        type: "homing",
        x: d.x,
        y: d.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 2.8,
        radius,
        damage,
        color,
        turnRate,
        targetId: "player",
        trail: true,
        visual: "star"
      });
    }
  };

  for (const d of boss.attackDrones) {
    if (!d || d.dead) continue;

    d.life -= dt;
    if (d.life <= 0) continue;

    const isWave = d.kind === "wave";
    const bulletColor = isWave ? "#bda7ff" : "#ffe28a";
    const bulletColor2 = isWave ? "#d8c8ff" : "#ffd59c";

    if (d.phase === "orbit") {
      d.hoverTime -= dt;
      d.angle += (d.orbitSpeed || 0) * dt;
      d.x = boss.x + Math.cos(d.angle) * (d.orbitRadius || 0);
      d.y = boss.y + Math.sin(d.angle) * (d.orbitRadius || 0);
      d.rot += dt * (isWave ? 4.4 : 5.5);

      if (d.hoverTime <= 0) {
        const ang = angle(d.x, d.y, p.x, p.y);

        if (d.mode === "turret" || d.mode === "spiral" || d.mode === "cross" || d.mode === "homing") {
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

      if (d.mode === "turret" && d.shotTimer <= 0 && (d.burstLeft || 0) > 0) {
        d.shotTimer = isWave ? 0.18 : 0.22;
        d.burstLeft -= 1;

        const base = angle(d.x, d.y, p.x, p.y);
        for (let i = -1; i <= 1; i++) {
          const ang = base + i * (isWave ? 0.18 : 0.24);
          spawnEnemyProjectile({
            x: d.x,
            y: d.y,
            vx: Math.cos(ang) * (isWave ? 260 : 240),
            vy: Math.sin(ang) * (isWave ? 260 : 240),
            life: 1.9,
            radius: isWave ? 8 : 7,
            damage: isWave ? 90 : 70,
            color: bulletColor
          });
        }

        if (d.burstLeft <= 0) {
          for (let i = 0; i < (isWave ? 10 : 8); i++) {
            const ang = (Math.PI * 2 * i) / (isWave ? 10 : 8);
            spawnEnemyProjectile({
              x: d.x,
              y: d.y,
              vx: Math.cos(ang) * (isWave ? 210 : 190),
              vy: Math.sin(ang) * (isWave ? 210 : 190),
              life: 1.8,
              radius: 6,
              damage: isWave ? 65 : 55,
              color: bulletColor2
            });
          }
          continue;
        }
      }

      if (d.mode === "spiral" && d.shotTimer <= 0 && (d.burstLeft || 0) > 0) {
        d.shotTimer = isWave ? 0.065 : 0.08;
        d.burstLeft -= 1;
        emitSpiralShot(
          d,
          isWave ? 230 : 210,
          isWave ? 62 : 48,
          isWave ? 7 : 6,
          bulletColor
        );
        if (d.burstLeft <= 0) continue;
      }

      if (d.mode === "cross" && d.shotTimer <= 0 && (d.burstLeft || 0) > 0) {
        d.shotTimer = isWave ? 0.28 : 0.36;
        d.burstLeft -= 1;

        emitCrossShot(
          d.x,
          d.y,
          isWave ? 240 : 210,
          isWave ? 82 : 60,
          isWave ? 8 : 6,
          bulletColor2
        );

        const base = angle(d.x, d.y, p.x, p.y) + Math.PI / 4;
        for (let i = 0; i < 4; i++) {
          const ang = base + (Math.PI * 2 * i) / 4;
          spawnEnemyProjectile({
            x: d.x,
            y: d.y,
            vx: Math.cos(ang) * (isWave ? 220 : 190),
            vy: Math.sin(ang) * (isWave ? 220 : 190),
            life: 1.9,
            radius: isWave ? 7 : 6,
            damage: isWave ? 74 : 52,
            color: bulletColor
          });
        }

        if (d.burstLeft <= 0) continue;
      }

      if (d.mode === "homing" && d.shotTimer <= 0 && (d.burstLeft || 0) > 0) {
        d.shotTimer = isWave ? 0.34 : 0.42;
        d.burstLeft -= 1;

        emitHomingMiniStar(
          d,
          isWave ? 180 : 165,
          isWave ? 76 : 56,
          isWave ? 7 : 6,
          bulletColor,
          isWave ? 5.2 : 4.6
        );

        if (d.burstLeft <= 0) continue;
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

  const drawStarShape = (ctx, spikes, outerR, innerR, fill, stroke, rot = 0) => {
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 === 0 ? outerR : innerR;
      const a = -Math.PI * 0.5 + (Math.PI / spikes) * i;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.5, outerR * 0.12);
    ctx.stroke();
    ctx.restore();
  };

  const drawCrossShape = (ctx, size, fill, stroke, rot = 0) => {
    const arm = size * 0.22;
    const len = size * 0.52;
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.rect(-arm, -len, arm * 2, len * 2);
    ctx.rect(-len, -arm, len * 2, arm * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.stroke();
    ctx.restore();
  };

  for (const d of boss.attackDrones) {
    if (!d || d.dead) continue;

    const x = d.x - cam.x;
    const y = d.y - cam.y;
    const key = d.kind === "wave" ? "boss_wave_drone" : "boss_star_drone";
    const isWave = d.kind === "wave";

    const baseGlow = isWave ? "rgba(189,167,255,0.30)" : "rgba(255,226,138,0.30)";
    const coreFill = isWave ? "#cdbdff" : "#ffe28a";
    const coreFill2 = isWave ? "#9f86ff" : "#ffbf5f";
    const stroke = isWave ? "#efe7ff" : "#fff5c2";

    ctx.save();
    ctx.translate(x, y);

    // 外周グロー
    ctx.globalAlpha = 0.75;
    const glowR = d.size * (d.mode === "cross" ? 0.72 : 0.62);
    ctx.fillStyle = baseGlow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 画像があればベースとして使う
    const ok = drawRotatedSpriteFrame(
      ctx,
      key,
      0,
      0,
      0,
      d.size,
      d.size,
      d.rot || 0
    );

    // 画像の有無に関わらず、モードごとの上描き演出を追加
    if (!ok) {
      if (d.mode === "cross") {
        drawCrossShape(ctx, d.size * 0.72, coreFill, stroke, d.rot || 0);
      } else {
        drawStarShape(
          ctx,
          isWave ? 5 : 4,
          d.size * 0.34,
          d.size * 0.16,
          coreFill,
          stroke,
          d.rot || 0
        );
      }
    } else {
      ctx.save();
      ctx.rotate(d.rot || 0);

      if (d.mode === "cross") {
        ctx.globalAlpha = 0.55;
        drawCrossShape(ctx, d.size * 0.62, "rgba(255,255,255,0.18)", stroke, 0);
      } else {
        ctx.globalAlpha = 0.50;
        drawStarShape(
          ctx,
          isWave ? 5 : 4,
          d.size * 0.28,
          d.size * 0.12,
          "rgba(255,255,255,0.16)",
          "rgba(255,255,255,0.45)",
          0
        );
      }

      ctx.restore();
    }

    // 渦巻き型は回転リング追加
    if (d.mode === "spiral") {
      ctx.save();
      ctx.rotate((d.rot || 0) + STATE.time * (isWave ? 2.4 : 3.0));
      ctx.strokeStyle = isWave ? "rgba(216,200,255,0.85)" : "rgba(255,213,156,0.88)";
      ctx.lineWidth = Math.max(1.4, d.size * 0.06);

      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const a = t * Math.PI * 1.5 + k * Math.PI;
          const rr = d.size * (0.08 + t * 0.34);
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 追尾型は尾を強調
    if (d.mode === "homing" || d.phase === "charge" || d.phase === "return") {
      const tailLen = d.size * 0.60;
      ctx.save();
      ctx.rotate(d.rot || 0);
      const grad = ctx.createLinearGradient(-tailLen, 0, 0, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, isWave ? "rgba(189,167,255,0.75)" : "rgba(255,226,138,0.75)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(2, d.size * 0.10);
      ctx.beginPath();
      ctx.moveTo(-tailLen, 0);
      ctx.lineTo(-d.size * 0.12, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 中心コア
    ctx.fillStyle = coreFill2;
    ctx.beginPath();
    ctx.arc(0, 0, d.size * 0.10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
    triggered: false,

    turnRate: Number(opts.turnRate || 0),
    targetId: opts.targetId || null,
    spin: Number(opts.spin || 0),
    age: 0,
    trail: !!opts.trail,

    // 描画強化用
    visual: opts.visual || null
  });
}

function updateEnemyProjectiles(dt) {
  const p = STATE.player;
  if (!p) return;

  const next = [];

  for (const b of STATE.enemyBullets || []) {
    b.life -= dt;
    b.age = Number(b.age || 0) + dt;
    if (b.life <= 0) continue;

    const projectileCause = {
      id: b.type === "pulse"
        ? "enemy_pulse"
        : b.type === "homing"
        ? "enemy_homing_projectile"
        : "enemy_projectile",
      label: b.type === "pulse"
        ? "敵パルス弾"
        : b.type === "homing"
        ? "追尾弾"
        : "敵弾"
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

    if (b.type === "homing") {
      let target = null;

      const barrier = getActiveBarrierDrone();
      if (barrier) {
        target = barrier;
      } else if (b.targetId === "player") {
        target = p;
      } else {
        target = p;
      }

      const desired = angle(b.x, b.y, target.x, target.y);
      const current = Math.atan2(b.vy || 0, b.vx || 0);
      let diff = desired - current;

      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const speed = Math.max(1, Math.hypot(b.vx || 0, b.vy || 0));
      const turn = Math.max(0, Number(b.turnRate || 4.5));
      const newAngle = current + clamp(diff, -turn * dt, turn * dt);

      b.vx = Math.cos(newAngle) * speed;
      b.vy = Math.sin(newAngle) * speed;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if ((b.spin || 0) !== 0) {
      const ang = Math.atan2(b.vy || 0, b.vx || 0) + b.spin * dt;
      const speed = Math.max(1, Math.hypot(b.vx || 0, b.vy || 0));
      b.vx = Math.cos(ang) * speed;
      b.vy = Math.sin(ang) * speed;
    }

    if (b.trail) {
      addEffect?.(b.x, b.y, Math.max(4, (b.radius || 5) * 1.15), b.color || "#ffd0a0", 0.08, 0.10);
    }

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

  const drawStarShot = (x, y, r, fill, stroke, rot = 0, spikes = 4) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI * 0.5 + (Math.PI / spikes) * i;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.2, r * 0.18);
    ctx.stroke();
    ctx.restore();
  };

  const drawCrossShot = (x, y, r, fill, stroke, rot = 0) => {
    const arm = r * 0.42;
    const len = r * 1.22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.rect(-arm, -len, arm * 2, len * 2);
    ctx.rect(-len, -arm, len * 2, arm * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.1, r * 0.16);
    ctx.stroke();
    ctx.restore();
  };

  for (const b of STATE.enemyBullets || []) {
    if (!b) continue;

    const x = b.x - cam.x;
    const y = b.y - cam.y;
    const age = Number(b.age || 0);
    const vx = Number(b.vx || 0);
    const vy = Number(b.vy || 0);
    const speed = Math.hypot(vx, vy);
    const ang = Math.atan2(vy || 0, vx || 1);

    if (b.type === "pulse") {
      const telegraphRatio = clamp(1 - Math.max(0, Number(b.delay || 0)) / Math.max(0.001, Number(b.life || 0) + Math.max(0, Number(b.delay || 0))), 0, 1);
      const rr = Number(b.radius || 32);

      ctx.save();
      ctx.translate(x, y);

      ctx.globalAlpha = 0.18 + telegraphRatio * 0.18;
      ctx.fillStyle = b.color || "rgba(255,201,153,0.28)";
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.45 + telegraphRatio * 0.35;
      ctx.strokeStyle = b.color || "#ffc999";
      ctx.lineWidth = 2 + telegraphRatio * 2;
      ctx.beginPath();
      ctx.arc(0, 0, rr * (0.86 + Math.sin(STATE.time * 10 + rr) * 0.05), 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      continue;
    }

    // 追尾弾の尾
    if (b.type === "homing" || b.trail) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const tail = Math.max(10, (b.radius || 6) * 3.4);
      const grad = ctx.createLinearGradient(-tail, 0, 0, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, b.color || "#ffd0a0");
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(2, (b.radius || 6) * 0.7);
      ctx.beginPath();
      ctx.moveTo(-tail, 0);
      ctx.lineTo(-(b.radius || 6) * 0.3, 0);
      ctx.stroke();
      ctx.restore();
    }

    // spin 付き弾は渦弾として描画
    if ((b.spin || 0) !== 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(age * 8 + ang);

      ctx.strokeStyle = b.color || "#ffd0a0";
      ctx.lineWidth = Math.max(1.4, (b.radius || 6) * 0.18);

      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 18; i++) {
          const t = i / 18;
          const a = t * Math.PI * 1.4 + k * Math.PI;
          const rr = (b.radius || 6) * (0.2 + t * 0.95);
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1.5, (b.radius || 6) * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    // 十字弾らしい見た目
    if (Math.abs(Math.abs(vx) - Math.abs(vy)) < 24 && speed > 120 && (b.radius || 0) >= 6.5) {
      drawCrossShot(
        x,
        y,
        b.radius || 6,
        b.color || "#ffd59c",
        "rgba(255,255,255,0.8)",
        ang + Math.PI * 0.25
      );
      continue;
    }

    // 追尾小星弾や星系の見た目
    if (b.type === "homing" || (b.radius || 0) >= 6) {
      drawStarShot(
        x,
        y,
        b.radius || 6,
        b.color || "#ffe28a",
        "rgba(255,255,255,0.78)",
        ang + age * 2.8,
        4
      );
      continue;
    }

    // 通常弾
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = b.color || "#ffd0a0";
    ctx.beginPath();
    ctx.arc(0, 0, b.radius || 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.58)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.restore();
  }
}
