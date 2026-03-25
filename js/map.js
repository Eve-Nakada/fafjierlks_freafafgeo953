// ===============================
// マップ
// ===============================

function getCurrentMap() {
  const stages = STATE.mapData?.stages || [];
  if (stages.length === 0) return null;

  if (STATE.mapData?.randomize) {
    if (!STATE._selectedMapIndex && STATE._selectedMapIndex !== 0) {
      STATE._selectedMapIndex = Math.floor(Math.random() * stages.length);
    }
    return stages[STATE._selectedMapIndex] || stages[0];
  }

  return stages[0];
}

function resetMapState() {
  STATE._selectedMapIndex = null;
}

function getMapWorldWidth(map) {
  return map?.worldWidth || 2400;
}

function getMapWorldHeight(map) {
  return map?.worldHeight || 2400;
}

function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  return dist(cx, cy, nx, ny) <= cr;
}

function getDynamicBossWalls() {
  return Array.isArray(STATE.bossWalls) ? STATE.bossWalls : [];
}

function getAllBlockingWalls() {
  const map = getCurrentMap();
  const staticWalls = map?.obstacles || [];
  return staticWalls.concat(getDynamicBossWalls());
}

function resolvePlayerMapCollision(prevX, prevY) {
  const p = STATE.player;
  const map = getCurrentMap();

  if (!p || !map) return;

  for (const wall of getAllBlockingWalls()) {
    if (!circleRectHit(p.x, p.y, p.r, wall.x, wall.y, wall.w, wall.h)) continue;

    const hitXOnly = circleRectHit(p.x, prevY, p.r, wall.x, wall.y, wall.w, wall.h);
    const hitYOnly = circleRectHit(prevX, p.y, p.r, wall.x, wall.y, wall.w, wall.h);

    if (!hitXOnly) {
      p.y = prevY;
    } else if (!hitYOnly) {
      p.x = prevX;
    } else {
      p.x = prevX;
      p.y = prevY;
    }
  }

  p.x = clamp(p.x, p.r, STATE.world.width - p.r);
  p.y = clamp(p.y, p.r, STATE.world.height - p.r);
}

function isPointInTrap(x, y) {
  const map = getCurrentMap();
  if (!map) return false;

  for (const trap of map.traps || []) {
    if (x >= trap.x && x <= trap.x + trap.w && y >= trap.y && y <= trap.y + trap.h) {
      return true;
    }
  }

  return false;
}

function getMapCurrentAt(x, y) {
  const map = getCurrentMap();
  if (!map) return null;

  for (const zone of map.currents || []) {
    if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
      return zone;
    }
  }

  return null;
}

function getMapSlowMulAt(x, y) {
  const map = getCurrentMap();
  if (!map) return 1;

  let mul = 1;
  for (const zone of map.slowZones || []) {
    if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
      mul = Math.min(mul, zone.moveMul || 1);
    }
  }

  return mul;
}

function applyMapCurrent(dt, prevX, prevY) {
  const p = STATE.player;
  if (!p) return;

  const current = getMapCurrentAt(p.x, p.y);
  if (!current) return;

  p.x += (current.vx || 0) * dt;
  p.y += (current.vy || 0) * dt;
  resolvePlayerMapCollision(prevX, prevY);
}

function applyMapDamage(dt) {
  const p = STATE.player;
  if (!p || p.hp <= 0) return;

  const trap = getMapTrapAt(p.x, p.y);

  if (!trap) {
    p._mapTrapAccum = 0;
    return;
  }

  p._mapTrapAccum = Number(p._mapTrapAccum || 0) + dt;

  // 0.25秒ごとの割合ダメージTick
  const tickSpan = 0.25;
  if (p._mapTrapAccum < tickSpan) return;

  const ticks = Math.floor(p._mapTrapAccum / tickSpan);
  p._mapTrapAccum -= ticks * tickSpan;

  const ratePerSec = getTrapDamageRate(trap);
  const baseDamage = p.maxHp * ratePerSec * tickSpan * ticks;

  // ダメージ床は割合ベース。防御は軽く効かせる
  const reduced = Math.max(1, baseDamage - (p.stats.armor || 0) * 0.35 * ticks);

  if (typeof setLastDamageCause === "function") {
    setLastDamageCause({
      id: "map_trap",
      label: "ダメージ床"
    });
  }

  p.hp = Math.max(0, p.hp - reduced);
  p.damageFlash = Math.max(Number(p.damageFlash || 0), 0.12);

  if (STATE.scoreState) {
    STATE.scoreState.noDamageTimer = 0;
    STATE.scoreState.noDamageTier = 0;
    STATE.scoreState.killChainTimer = 0;
    STATE.scoreState.killChainCount = 0;
  }
}

function renderMap(ctx) {
  const cam = STATE.camera;
  const map = getCurrentMap();

  if (map?.background) {
    ctx.fillStyle = map.background;
  } else {
    ctx.fillStyle = '#06304a';
  }
  ctx.fillRect(-cam.x, -cam.y, STATE.world.width, STATE.world.height);

  renderMapGrid(ctx, cam);

  if (!map) return;

  for (const zone of map.currents || []) {
    ctx.fillStyle = zone.color || 'rgba(120,220,255,0.14)';
    ctx.fillRect(zone.x - cam.x, zone.y - cam.y, zone.w, zone.h);

    ctx.strokeStyle = 'rgba(160,240,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(zone.x - cam.x, zone.y - cam.y, zone.w, zone.h);
    renderCurrentArrows(ctx, zone, cam);
  }

  for (const zone of map.slowZones || []) {
    ctx.fillStyle = zone.color || 'rgba(80,180,110,0.22)';
    ctx.fillRect(zone.x - cam.x, zone.y - cam.y, zone.w, zone.h);

    ctx.strokeStyle = 'rgba(130,220,150,0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(zone.x - cam.x, zone.y - cam.y, zone.w, zone.h);
    renderSeaweedPattern(ctx, zone, cam);
  }

  for (const wall of map.obstacles || []) {
    ctx.fillStyle = wall.color || '#1c4154';
    ctx.fillRect(wall.x - cam.x, wall.y - cam.y, wall.w, wall.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x - cam.x, wall.y - cam.y, wall.w, wall.h);
  }

  for (const wall of STATE.bossWalls || []) {
    ctx.fillStyle = wall.color || 'rgba(120, 220, 255, 0.16)';
    ctx.fillRect(wall.x - cam.x, wall.y - cam.y, wall.w, wall.h);

    ctx.strokeStyle = wall.stroke || 'rgba(170, 245, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(wall.x - cam.x, wall.y - cam.y, wall.w, wall.h);
  }

  for (const trap of map.traps || []) {
    ctx.fillStyle = trap.color || 'rgba(255,80,80,0.28)';
    ctx.fillRect(trap.x - cam.x, trap.y - cam.y, trap.w, trap.h);

    ctx.strokeStyle = 'rgba(255,120,120,0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(trap.x - cam.x, trap.y - cam.y, trap.w, trap.h);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 4;
  ctx.strokeRect(-cam.x, -cam.y, STATE.world.width, STATE.world.height);
}

function renderCurrentArrows(ctx, zone, cam) {
  const spacing = zone.arrowEvery || 56;
  const vx = zone.vx || 0;
  const vy = zone.vy || 0;
  const len = Math.hypot(vx, vy);
  if (len < 0.001) return;

  const nx = vx / len;
  const ny = vy / len;
  const px = -ny;
  const py = nx;

  ctx.save();
  ctx.strokeStyle = 'rgba(210,245,255,0.45)';
  ctx.lineWidth = 2;

  for (let x = zone.x + spacing * 0.5; x < zone.x + zone.w; x += spacing) {
    for (let y = zone.y + spacing * 0.5; y < zone.y + zone.h; y += spacing) {
      const sx = x - cam.x;
      const sy = y - cam.y;
      const ex = sx + nx * 18;
      const ey = sy + ny * 18;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex - nx * 6 + px * 4, ey - ny * 6 + py * 4);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - nx * 6 - px * 4, ey - ny * 6 - py * 4);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function renderSeaweedPattern(ctx, zone, cam) {
  ctx.save();
  ctx.strokeStyle = 'rgba(120,220,150,0.34)';
  ctx.lineWidth = 2;

  for (let x = zone.x + 16; x < zone.x + zone.w; x += 22) {
    const sx = x - cam.x;
    const top = zone.y - cam.y + 8;
    const bottom = zone.y - cam.y + zone.h - 8;

    ctx.beginPath();
    ctx.moveTo(sx, bottom);
    ctx.quadraticCurveTo(sx - 6, (top + bottom) * 0.5, sx + 3, top);
    ctx.stroke();
  }

  ctx.restore();
}

function renderMapGrid(ctx, cam) {
  const size = 120;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;

  const startX = Math.floor(cam.x / size) * size;
  const endX = cam.x + ctx.canvas.width + size;
  const startY = Math.floor(cam.y / size) * size;
  const endY = cam.y + ctx.canvas.height + size;

  for (let x = startX; x <= endX; x += size) {
    ctx.beginPath();
    ctx.moveTo(x - cam.x, -cam.y);
    ctx.lineTo(x - cam.x, STATE.world.height - cam.y);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += size) {
    ctx.beginPath();
    ctx.moveTo(-cam.x, y - cam.y);
    ctx.lineTo(STATE.world.width - cam.x, y - cam.y);
    ctx.stroke();
  }

  ctx.restore();
}

function isPointInsideObstacle(x, y, r = 0) {
  for (const wall of getAllBlockingWalls()) {
    if (circleRectHit(x, y, r, wall.x, wall.y, wall.w, wall.h)) return true;
  }

  return false;
}

function renderBossSwitches(ctx) {
  const cam = STATE.camera;

  for (const sw of STATE.bossSwitches || []) {
    if (sw.dead) continue;

    const x = sw.x - cam.x;
    const y = sw.y - cam.y;
    const pulse = 0.8 + Math.sin(STATE.time * 7 + sw.x * 0.01) * 0.2;

    ctx.save();

    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(255, 220, 120, 0.18)';
    ctx.beginPath();
    ctx.arc(x, y, sw.r + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd46b';
    ctx.beginPath();
    ctx.arc(x, y, sw.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff2b8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = '#7a4d00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - sw.r * 0.45, y);
    ctx.lineTo(x + sw.r * 0.45, y);
    ctx.moveTo(x, y - sw.r * 0.45);
    ctx.lineTo(x, y + sw.r * 0.45);
    ctx.stroke();

    ctx.restore();
  }
}

function isPointInsideTrap(x, y, r = 0) {
  const map = getCurrentMap();
  if (!map) return false;

  for (const trap of map.traps || []) {
    if (circleRectHit(x, y, r, trap.x, trap.y, trap.w, trap.h)) return true;
  }

  return false;
}

function getWaveCoinCount(waveIndex) {
  const wave = (STATE.waveData?.waves || []).find((w) => (w.index || 0) === waveIndex);
  if (!wave) return 0;
  const cfg = wave.mapCoins || {};
  return Math.max(0, Number(cfg.normal || 0)) + Math.max(0, Number(cfg.rare || 0));
}

function getMapCoinRadius(kind) {
  return kind === 'rare' ? 16 : 13;
}

function getMapCoinValue(kind) {
  return kind === 'rare' ? 100 : 10;
}

function getMapCoinFrameIndex(kind) {
  return kind === 'rare' ? 1 : 0;
}

function getMapCoinGlowColor(kind) {
  return kind === 'rare' ? '#ffed8a' : '#ffd166';
}

function findRandomCoinPosition(kind = 'normal') {
  const margin = 72;
  const r = getMapCoinRadius(kind);
  const coins = Array.isArray(STATE.mapCoins) ? STATE.mapCoins : [];
  const enemies = Array.isArray(STATE.enemies) ? STATE.enemies : [];

  for (let i = 0; i < 80; i++) {
    const x = rand(margin, STATE.world.width - margin);
    const y = rand(margin, STATE.world.height - margin);

    if (isPointInsideObstacle(x, y, r + 8)) continue;
    if (isPointInsideTrap(x, y, r + 8)) continue;

    const nearEnemy = enemies.some((e) => dist(x, y, e.x, e.y) < 84 + r + (e.r || 0));
    if (nearEnemy) continue;

    const nearCoin = coins.some((coin) => dist(x, y, coin.x, coin.y) < r + (coin.r || 12) + 22);
    if (nearCoin) continue;

    return { x, y };
  }

  return {
    x: rand(margin, STATE.world.width - margin),
    y: rand(margin, STATE.world.height - margin)
  };
}
