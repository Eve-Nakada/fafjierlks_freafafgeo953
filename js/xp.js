// ===============================
// XPジェム
// ===============================

function normalizeXPValue(xp) {
  if (xp >= 20) return 20;
  if (xp >= 10) return 10;
  if (xp >= 5) return 5;
  return 1;
}

function getXPGemFrameIndex(xp) {
  if (xp >= 20) return 3;
  if (xp >= 10) return 2;
  if (xp >= 5) return 1;
  return 0;
}

function dropXPGem(x, y, xp) {
  const value = normalizeXPValue(xp || 1);

  STATE.xpGems.push({
    x,
    y,
    xp: value,
    frameIndex: getXPGemFrameIndex(value),
    r: value >= 20 ? 9 : value >= 10 ? 8 : value >= 5 ? 7 : 6,
    vx: rand(-18, 18),
    vy: rand(-18, 18),
    collectDelay: 0.18
  });
}

function absorbAllXP() {
  if (!STATE.player) return;
  if (STATE.xpGems.length === 0) return;

  let totalScore = 0;

  for (const gem of STATE.xpGems) {
    gainXP(gem.xp);
    totalScore += gem.xp * 2;
  }

  STATE.score += totalScore;
  STATE.xpGems = [];
  updateHUD();
}

function updateXPGems(dt) {
  const p = STATE.player;
  if (!p) return;

  const next = [];

  for (const gem of STATE.xpGems) {
    if (gem.collectDelay > 0) {
      gem.collectDelay -= dt;
      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;
      gem.vx *= 0.92;
      gem.vy *= 0.92;
    } else {
      const d = dist(gem.x, gem.y, p.x, p.y);

      if (d <= p.stats.pickupRange) {
        const dx = p.x - gem.x;
        const dy = p.y - gem.y;
        const len = Math.hypot(dx, dy) || 1;
        const pullSpeed = 240 + Math.max(0, 220 - d);

        gem.x += (dx / len) * pullSpeed * dt;
        gem.y += (dy / len) * pullSpeed * dt;
      }
    }

    if (dist(gem.x, gem.y, p.x, p.y) <= gem.r + p.r + 4) {
      gainXP(gem.xp);
      STATE.score += gem.xp * 2;
      continue;
    }

    next.push(gem);
  }

  STATE.xpGems = next;
}

function renderXPGems(ctx) {
  const cam = STATE.camera;

  for (const gem of STATE.xpGems) {
    const x = gem.x - cam.x;
    const y = gem.y - cam.y;
    const size = gem.r * 2 + 8;
    const ok = drawSpriteFrame(ctx, "xp_gems", gem.frameIndex || 0, x - size * 0.5, y - size * 0.5, size, size);

    if (!ok) {
      ctx.save();
      ctx.fillStyle = "#7fe7ff";
      ctx.beginPath();
      ctx.arc(x, y, gem.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}
