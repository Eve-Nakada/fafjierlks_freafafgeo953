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
