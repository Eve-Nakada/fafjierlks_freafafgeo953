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

function resolvePlayerMapCollision(prevX, prevY) {
  const p = STATE.player;
  const map = getCurrentMap();

  if (!p || !map) return;

  for (const wall of map.obstacles || []) {
    if (!circleRectHit(p.x, p.y, p.r, wall.x, wall.y, wall.w, wall.h)) continue;

    // 軸ごとに戻して自然に滑らせる
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

function applyMapDamage(dt) {
  const p = STATE.player;
  const map = getCurrentMap();
  if (!p || !map) return;

  for (const trap of map.traps || []) {
    if (
      p.x >= trap.x &&
      p.x <= trap.x + trap.w &&
      p.y >= trap.y &&
      p.y <= trap.y + trap.h
    ) {
      damagePlayer((trap.damage || 10) * dt);
    }
  }
}

function renderMap(ctx) {
  const cam = STATE.camera;
  const map = getCurrentMap();

  // ベース背景
  if (map?.background) {
    ctx.fillStyle = map.background;
  } else {
    ctx.fillStyle = "#06304a";
  }
  ctx.fillRect(-cam.x, -cam.y, STATE.world.width, STATE.world.height);

  // 軽いグリッド
  renderMapGrid(ctx, cam);

  if (!map) return;

  // 壁
  for (const wall of map.obstacles || []) {
    ctx.fillStyle = wall.color || "#1c4154";
    ctx.fillRect(wall.x - cam.x, wall.y - cam.y, wall.w, wall.h);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x - cam.x, wall.y - cam.y, wall.w, wall.h);
  }

  // ダメージ床
  for (const trap of map.traps || []) {
    ctx.fillStyle = trap.color || "rgba(255,80,80,0.28)";
    ctx.fillRect(trap.x - cam.x, trap.y - cam.y, trap.w, trap.h);

    ctx.strokeStyle = "rgba(255,120,120,0.42)";
    ctx.lineWidth = 2;
    ctx.strokeRect(trap.x - cam.x, trap.y - cam.y, trap.w, trap.h);
  }

  // マップ境界の見えやすさ
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 4;
  ctx.strokeRect(-cam.x, -cam.y, STATE.world.width, STATE.world.height);
}

function renderMapGrid(ctx, cam) {
  const size = 120;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
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
