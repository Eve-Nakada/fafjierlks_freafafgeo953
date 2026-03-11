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

function spawnEnemy(typeId, x, y, isBoss = false, bossKind = "boss") {
  const def = getEnemyDef(typeId);
  if (!def) return null;

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
    dead: false
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

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const len = Math.hypot(dx, dy) || 1;

    e.x += (dx / len) * e.speed * dt;
    e.y += (dy / len) * e.speed * dt;

    e.hitFlash = Math.max(0, e.hitFlash - dt * 6);

    if (dist(e.x, e.y, p.x, p.y) <= e.r + p.r) {
      damagePlayer(e.damage * dt * 6);
    }
  }

  resolveEnemyDeaths();
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
  if (enemy.isBoss) {
    STATE.score += enemy.bossKind === "leviathan" ? 3000 : 1200;
    STATE.chests.push({
      x: enemy.x,
      y: enemy.y,
      r: 18
    });
  } else {
    STATE.score += 20;
  }

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
  const p = STATE.player;
  if (!p) return 2;

  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;

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
