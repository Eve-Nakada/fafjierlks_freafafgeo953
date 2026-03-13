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
  STATE.progress = loadProgress();
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
  STATE.hazards = [];
  STATE.bossEvent = { active: false, bossId: null, bossName: "", warningTimer: 0, warningText: "", hazardTimer: 0 };
  STATE.scoreState = { noDamageTimer: 0, noDamageTier: 0, killChainTimer: 0, killChainCount: 0, popupTimer: 0, popupText: "" };

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
  updateBossEvent(dt);
  updateScoreBonuses(dt);
  updateBossHazards(dt);
  applyMapDamage(dt);
  updateCamera(false);

  // レベルアップ画面
  if (STATE.levelUpQueue > 0 && !isScreenVisible("levelUpScreen")) {
    openLevelUp();
  }

  // 死亡
  if (STATE.player.hp <= 0) {
    STATE.player.hp = 0;
    updateHUD();
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
  renderBossHazards(ctx);
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


function triggerBossEvent(boss, wave) {
  if (!boss) return;
  const def = getEnemyDef(boss.typeId) || {};
  STATE.bossEvent = {
    active: true,
    bossId: boss.id,
    bossName: def.name || wave?.theme || "BOSS",
    warningTimer: 2.2,
    warningText: `${wave?.theme || "BOSS"} - ${def.name || "大型反応"}`,
    hazardTimer: 1.8
  };
}

function getActiveBoss() {
  const bossId = STATE.bossEvent?.bossId;
  if (!bossId) return null;
  return (STATE.enemies || []).find((e) => e.id === bossId && !e.dead) || null;
}

function onBossDefeated(enemy) {
  if (STATE.bossEvent?.bossId !== enemy?.id) return;
  STATE.bossEvent.active = false;
  STATE.bossEvent.bossId = null;
  STATE.bossEvent.warningTimer = 0;
  STATE.hazards = [];
}

function updateBossEvent(dt) {
  const boss = getActiveBoss();
  if (STATE.bossEvent?.warningTimer > 0) {
    STATE.bossEvent.warningTimer = Math.max(0, STATE.bossEvent.warningTimer - dt);
  }
  if (!boss) {
    if (STATE.bossEvent) STATE.bossEvent.active = false;
    return;
  }
  STATE.bossEvent.active = true;
  STATE.bossEvent.bossName = (getEnemyDef(boss.typeId)?.name || STATE.bossEvent.bossName || 'BOSS');
  STATE.bossEvent.hazardTimer -= dt;
  if (STATE.bossEvent.hazardTimer <= 0) {
    spawnBossHazard(boss);
    const lowHpFactor = boss.hp / Math.max(1, boss.maxHp);
    STATE.bossEvent.hazardTimer = lowHpFactor < 0.35 ? 1.3 : lowHpFactor < 0.7 ? 1.8 : 2.4;
  }
}

function spawnBossHazard(boss) {
  const p = STATE.player;
  if (!p) return;
  const nearPlayer = Math.random() < 0.58;
  const radius = boss.bossKind === 'leviathan' ? rand(72, 132) : rand(62, 112);
  const x = nearPlayer ? clamp(p.x + rand(-120, 120), radius + 8, STATE.world.width - radius - 8) : clamp(boss.x + rand(-180, 180), radius + 8, STATE.world.width - radius - 8);
  const y = nearPlayer ? clamp(p.y + rand(-120, 120), radius + 8, STATE.world.height - radius - 8) : clamp(boss.y + rand(-180, 180), radius + 8, STATE.world.height - radius - 8);
  STATE.hazards.push({ x, y, radius, telegraph: boss.bossKind === 'leviathan' ? 1.0 : 0.85, life: boss.bossKind === 'leviathan' ? 1.15 : 1.0, damage: boss.damage * 0.9, color: boss.bossKind === 'leviathan' ? 'rgba(170,120,255,0.42)' : 'rgba(255,145,110,0.42)' });
}

function updateBossHazards(dt) {
  const p = STATE.player;
  const next = [];
  for (const hz of STATE.hazards || []) {
    hz.life -= dt;
    hz.telegraph -= dt;
    if (hz.life <= 0) continue;
    if (hz.telegraph <= 0 && !hz.triggered) {
      hz.triggered = true;
      if (p && dist(hz.x, hz.y, p.x, p.y) <= hz.radius + p.r) {
        damagePlayer(hz.damage);
      }
    }
    next.push(hz);
  }
  STATE.hazards = next;
}

function renderBossHazards(ctx) {
  const cam = STATE.camera;
  for (const hz of STATE.hazards || []) {
    const x = hz.x - cam.x;
    const y = hz.y - cam.y;
    ctx.save();
    const pulse = 0.72 + Math.sin(STATE.time * 7 + hz.x * 0.01) * 0.16;
    ctx.globalAlpha = hz.triggered ? 0.32 : 0.12 * pulse;
    ctx.fillStyle = hz.color;
    ctx.beginPath();
    ctx.arc(x, y, hz.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = hz.triggered ? 0.95 : 0.78;
    ctx.strokeStyle = hz.triggered ? '#ffd8c7' : '#ffb28f';
    ctx.lineWidth = hz.triggered ? 4 : 2.5;
    ctx.setLineDash(hz.triggered ? [] : [12, 10]);
    ctx.beginPath();
    ctx.arc(x, y, hz.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function setScorePopup(text) {
  if (!STATE.scoreState) return;
  STATE.scoreState.popupText = text;
  STATE.scoreState.popupTimer = 1.8;
}

function updateScoreBonuses(dt) {
  const s = STATE.scoreState;
  const p = STATE.player;
  if (!s || !p) return;
  s.noDamageTimer += dt;
  if (s.killChainTimer > 0) s.killChainTimer -= dt;
  else s.killChainCount = 0;
  if (s.popupTimer > 0) s.popupTimer -= dt;

  const thresholds = [12, 24, 40, 60];
  if (s.noDamageTier < thresholds.length && s.noDamageTimer >= thresholds[s.noDamageTier]) {
    const bonus = 120 + s.noDamageTier * 90;
    STATE.score += bonus;
    s.noDamageTier += 1;
    setScorePopup(`ノーダメ継続 +${bonus}`);
  }
}

function registerKillChain(enemy) {
  const s = STATE.scoreState;
  if (!s) return;
  s.killChainCount = (s.killChainTimer > 0 ? s.killChainCount : 0) + 1;
  s.killChainTimer = 2.4;
  if (s.killChainCount >= 3) {
    const bonus = enemy?.isBoss ? 0 : 25 * (s.killChainCount - 2);
    if (bonus > 0) {
      STATE.score += bonus;
      setScorePopup(`${s.killChainCount}連続撃破 +${bonus}`);
    }
  }
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
