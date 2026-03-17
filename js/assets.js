// ===============================
// 画像アセット管理
// ===============================

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Image load failed:", src);
      resolve(null);
    };

    img.src = src;
  });
}

async function loadAssets() {
  const data = STATE.gameData || {};
  const sheets = data.spriteSheets || {};

  STATE.assets = {};

  for (const [key, def] of Object.entries(sheets)) {
    STATE.assets[key] = {
      ...def,
      img: await loadImage(def.src)
    };
  }

  if (!STATE.assets.xp_gems) {
    STATE.assets.xp_gems = { cols: 2, rows: 2, img: null };
  }

  if (!STATE.assets.xp_gems.img) {
    STATE.assets.xp_gems.img = createFallbackXpGemSheet();
    STATE.assets.xp_gems.cols = 2;
    STATE.assets.xp_gems.rows = 2;
  }

  if (!STATE.assets.map_gold) {
    STATE.assets.map_gold = {
      src: 'images/map_gold.png',
      cols: 2,
      rows: 1,
      img: await loadImage('images/map_gold.png')
    };
  } else {
    STATE.assets.map_gold.cols = STATE.assets.map_gold.cols || 2;
    STATE.assets.map_gold.rows = STATE.assets.map_gold.rows || 1;
    if (!STATE.assets.map_gold.img && STATE.assets.map_gold.src) {
      STATE.assets.map_gold.img = await loadImage(STATE.assets.map_gold.src);
    }
  }

  if (!STATE.assets.treasure) {
    STATE.assets.treasure = {
      src: 'images/treasure.png',
      cols: 1,
      rows: 1,
      img: await loadImage('images/treasure.png')
    };
  } else {
    STATE.assets.treasure.cols = STATE.assets.treasure.cols || 1;
    STATE.assets.treasure.rows = STATE.assets.treasure.rows || 1;
    if (!STATE.assets.treasure.img && STATE.assets.treasure.src) {
      STATE.assets.treasure.img = await loadImage(STATE.assets.treasure.src);
    }
  }
}

function createFallbackXpGemSheet() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const cells = [
    { body: "#7fe7ff", glow: "rgba(127,231,255,0.45)" },
    { body: "#66ff88", glow: "rgba(102,255,136,0.45)" },
    { body: "#ffd166", glow: "rgba(255,209,102,0.45)" },
    { body: "#ff5c5c", glow: "rgba(255,92,92,0.45)" }
  ];

  cells.forEach((c, i) => {
    const ox = (i % 2) * 32;
    const oy = Math.floor(i / 2) * 32;
    ctx.save();
    ctx.translate(ox + 16, oy + 16);
    ctx.fillStyle = c.glow;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = c.body;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(-2, -7, 4, 5);
    ctx.restore();
  });

  return canvas;
}

// ===============================
// スプライト描画補助
// ===============================

function getSheet(key) {
  return STATE.assets[key] || null;
}

function drawSpriteFrame(ctx, key, index, dx, dy, dw, dh) {
  const sheet = getSheet(key);

  if (!sheet || !sheet.img) return false;

  const cols = sheet.cols || 1;
  const rows = sheet.rows || 1;

  const sw = Math.floor(sheet.img.width / cols);
  const sh = Math.floor(sheet.img.height / rows);

  const safeIndex = Math.max(0, Math.min(index, cols * rows - 1));
  const sx = (safeIndex % cols) * sw;
  const sy = Math.floor(safeIndex / cols) * sh;

  ctx.drawImage(
    sheet.img,
    sx, sy, sw, sh,
    dx, dy, dw, dh
  );

  return true;
}

function drawDirectionalSprite(ctx, key, dirIndex, dx, dy, dw, dh) {
  return drawSpriteFrame(ctx, key, dirIndex, dx, dy, dw, dh);
}

// ===============================
// 武器アイコン描画
// ===============================

function drawWeaponIconToCanvas(canvas, iconIndex) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const ok = drawSpriteFrame(
    ctx,
    "weapons",
    iconIndex || 0,
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (!ok) {
    ctx.fillStyle = "#36d4ff";
    ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
  }
}

function renderPlayerUiIcon() {
  const canvas = document.getElementById("playerIcon");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const player = STATE.player;
  const dirIndex = player ? player.dirIndex || 0 : 0;

  const ok = drawDirectionalSprite(
    ctx,
    "player",
    dirIndex,
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (!ok) {
    ctx.fillStyle = "#8de8ff";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 16, 0, Math.PI * 2);
    ctx.fill();
  }
}
