// ===============================
// メイン起動・メインループ
// ===============================

let canvas = null;
let ctx = null;
let lastTime = 0;

// ===============================
// 初期化
// ===============================

async function boot() {
  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("gameCanvas not found");
    return;
  }

  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  await loadAllData();
  await loadAssets();

  setupInput();
  setupUI();

  applyTitleText();
  showScreen("titleScreen");
  renderRanking("rankingList");

  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function applyTitleText() {
  const titleMain = document.getElementById("titleMain");
  if (titleMain) {
    titleMain.textContent = (STATE.gameData && STATE.gameData.title) || "Ocean Survivor";
  }
}

// ===============================
// ゲーム開始
// ===============================

function resetGameState() {
  STATE.paused = false;
  STATE.clear = false;
  STATE.score = 0;

  STATE.time = 0;
  STATE.delta = 0;
  STATE.elapsed = 0;

  STATE.currentWave = 1;
  STATE.levelUpQueue = 0;
  STATE.shopOpen = false;
  STATE.lastShopWave = 0;

  STATE.enemies = [];
  STATE.enemyBullets = [];
  STATE.bullets = [];
  STATE.effects = [];
  STATE.xpGems = [];
  STATE.chests = [];

  STATE.camera.x = 0;
  STATE.camera.y = 0;

  STATE.player = createPlayer();

  renderPlayerUiIcon();
}

function startGame(initialWeaponId) {
  resetMapState();
  resetWaveState();
  resetGameState();
  resetRunShopState()

  const stage = getCurrentMap();
  if (stage && stage.worldWidth) STATE.world.width = stage.worldWidth;
  else STATE.world.width = 2400;

  if (stage && stage.worldHeight) STATE.world.height = stage.worldHeight;
  else STATE.world.height = 2400;

  STATE.player = createPlayer();

  if (initialWeaponId) {
    addWeapon(initialWeaponId);
  } else {
    const firstWeapon = (STATE.gameData?.weapons || [])[0];
    if (firstWeapon) addWeapon(firstWeapon.id);
  }

  centerPlayerInWorld();
  updateCamera(true);
  hideAllScreens();
  updateHUD();
  renderPlayerUiIcon();
}

function resetRunShopState() {
  if (STATE.gameData) {
    STATE.gameData.shopPriceMul = STATE.baseShopPriceMul || 1;
  }
  STATE._shopDisplayItems = null;
  STATE.shopVacuumBoughtByWave = {};
}

// ===============================
// メインループ
// ===============================

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;

  const dt = Math.min(0.033, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  STATE.delta = dt;
  STATE.time += dt;

  if (!STATE.paused && STATE.player) {
    updateGame(dt);
  }

  renderGame();

  requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  STATE.elapsed += dt;

  updatePlayer(dt);
  updateWeapons(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateEnemyProjectiles(dt);
  updateXPGems(dt);
  updateChests(dt);
  updateWaves(dt);
  applyMapDamage(dt);
  updateCamera(false);

  // レベルアップ画面
  if (STATE.levelUpQueue > 0 && !isScreenVisible("levelUpScreen")) {
    openLevelUp();
  }

  // 死亡
  if (STATE.player.hp <= 0) {
    STATE.player.hp = 0;
    endGame(false);
    return;
  }

  // UI更新
  updateHUD();
}

// ===============================
// 描画
// ===============================

function renderGame() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!STATE.player) return;

  renderMap(ctx);
  renderXPGems(ctx);
  renderChests(ctx);
  renderEnemies(ctx);
  renderEnemyProjectiles(ctx);
  renderBullets(ctx);
  renderPlayer(ctx);
}

// ===============================
// カメラ
// ===============================

function updateCamera(force) {
  if (!STATE.player || !canvas) return;

  const targetX = clamp(
    STATE.player.x - canvas.width / 2,
    0,
    Math.max(0, STATE.world.width - canvas.width)
  );

  const targetY = clamp(
    STATE.player.y - canvas.height / 2,
    0,
    Math.max(0, STATE.world.height - canvas.height)
  );

  if (force) {
    STATE.camera.x = targetX;
    STATE.camera.y = targetY;
  } else {
    STATE.camera.x = lerp(STATE.camera.x, targetX, 0.16);
    STATE.camera.y = lerp(STATE.camera.y, targetY, 0.16);
  }
}

function centerPlayerInWorld() {
  if (!STATE.player) return;
  STATE.player.x = STATE.world.width / 2;
  STATE.player.y = STATE.world.height / 2;
}

// ===============================
// 宝箱
// ===============================

function updateChests(dt) {
  if (!STATE.player) return;

  const p = STATE.player;

  STATE.chests = STATE.chests.filter((chest) => {
    const d = dist(chest.x, chest.y, p.x, p.y);
    if (d <= (chest.r || 20) + 20) {
      openChestReward();
      return false;
    }
    return true;
  });
}

function renderChests(ctx) {
  const cam = STATE.camera;

  for (const chest of STATE.chests) {
    const x = chest.x - cam.x;
    const y = chest.y - cam.y;

    ctx.fillStyle = "#dcb45b";
    ctx.fillRect(x - 14, y - 10, 28, 20);

    ctx.fillStyle = "#7b4f11";
    ctx.fillRect(x - 14, y - 3, 28, 6);

    ctx.strokeStyle = "#ffe9a6";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 14, y - 10, 28, 20);
  }
}

function openChestReward() {
  const evolutions = getAvailableEvolutions();

  if (evolutions.length > 0) {
    openChestEvolutionScreen(evolutions);
    return;
  }

  STATE.player.gold += 25;
  STATE.score += 50;
  updateHUD();
}

// ===============================
// 終了
// ===============================

function endGame(clear) {
  if (!STATE.player) return;

  STATE.paused = true;
  STATE.clear = !!clear;
  STATE.screen = "result";

  const rankingResult = saveRanking(STATE.score);
  showResultScreen(clear, rankingResult);
}

// ===============================
// DOM起動
// ===============================

window.addEventListener("DOMContentLoaded", boot);
