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
  STATE.isGameClear = false;
  STATE.lastShopWave = 0;
  STATE.shopSession = { startHp: 0, startMaxHp: 0, allowedHeal: 0, allowedMaxHp: 0 };

  if (!STATE.testMode) STATE.testMode = {};
  const prevTest = STATE.testMode || {};
  STATE.testMode = {
    ...prevTest,
    panelOpen: false,
    panelPrevPaused: false,
    customShopCounter: Number(prevTest.customShopCounter || 0),
    enemySpawner: {
      enabled: !!prevTest.enemySpawner?.enabled,
      pauseNormalWaves: prevTest.enemySpawner?.pauseNormalWaves !== false,
      interval: Number(prevTest.enemySpawner?.interval || 1),
      count: Math.max(1, Number(prevTest.enemySpawner?.count || 1)),
      timer: 0,
      minDist: Number(prevTest.enemySpawner?.minDist || 320),
      maxDist: Number(prevTest.enemySpawner?.maxDist || 460),
      selectedEnemyIds: Array.isArray(prevTest.enemySpawner?.selectedEnemyIds) ? [...prevTest.enemySpawner.selectedEnemyIds] : []
    }
  };

  STATE.enemies = [];
  STATE.enemyBullets = [];
  STATE.bullets = [];
  STATE.effects = [];
  STATE.xpGems = [];
  STATE.chests = [];
  STATE.hazards = [];
  STATE.bossSwitches = [];
  STATE.bossWalls = [];
  STATE.ambientBubbles = [];
  STATE.bossEvent = {
    active: false,
    bossId: null,
    bossName: "",
    warningTimer: 0,
    warningText: "",
    hazardTimer: 0,
    switchRespawnTimer: 0
  };
  STATE.scoreState = { noDamageTimer: 0, noDamageTier: 0, killChainTimer: 0, killChainCount: 0, popupTimer: 0, popupText: "" };
  STATE.drones = [];

  STATE.camera.x = 0;
  STATE.camera.y = 0;

  STATE.player = createPlayer();

  renderPlayerUiIcon();
}

function startGame(initialWeaponId) {
  resetMapState();
  resetWaveState();
  resetGameState();
  resetRunShopState();

  const stage = getCurrentMap();
  if (stage && stage.worldWidth) STATE.world.width = stage.worldWidth;
  else STATE.world.width = 2400;

  if (stage && stage.worldHeight) STATE.world.height = stage.worldHeight;
  else STATE.world.height = 2400;

  STATE.player = createPlayer();
  resetLastDamageCause();

  STATE.testMode.enabled = !!STATE.testMode.pendingStart;

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
  resetWaveCoins(1);

  if (typeof onAutoPlayRunStarted === "function") {
    onAutoPlayRunStarted(initialWeaponId || STATE.player?.weapons?.[0]?.id || null);
  }

  const auto = typeof getAutoPlayState === "function" ? getAutoPlayState() : null;
  const shouldOpenTestPanel = !!(
    STATE.testMode.enabled &&
    typeof openTestModePanel === 'function' &&
    !(auto && auto.batchRunning)
  );

  if (shouldOpenTestPanel) {
    openTestModePanel();
  }
}


function resetRunShopState() {
  STATE.shopStock = {};
  STATE.shopPurchased = {};
  STATE.shopUnlockedWaves = {};
  STATE.shopSelectionOpen = false;
  STATE.shopWave = 0;
  STATE._shopDisplayItems = null;
  if (STATE.testMode?.customShopCounter == null) STATE.testMode.customShopCounter = 0;
}


// ===============================
// メインループ
// ===============================

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;

  const rawDt = Math.min(0.033, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  STATE.delta = rawDt;
  STATE.time += rawDt;

  const simSpeed = (typeof getAutoPlaySimSpeed === "function" && STATE.testMode?.enabled)
    ? getAutoPlaySimSpeed()
    : 1;

  const loops = Math.max(1, Math.floor(simSpeed));
  const stepDt = rawDt;

  for (let i = 0; i < loops; i++) {
    updateAmbientBubbles(stepDt);

    if (!STATE.paused && STATE.player) {
      updateGame(stepDt);
    } else {
      if (typeof updateAutoPlayWhilePaused === "function") {
        updateAutoPlayWhilePaused(stepDt);
      }
      if (typeof updateAutoBatchRestart === "function") {
        updateAutoBatchRestart(stepDt);
      }
    }
  }

  renderGame();
  requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  STATE.elapsed += dt;

  if (typeof updateAutoPlay === "function") {
    updateAutoPlay(dt);
  }

  updatePlayer(dt);
  updateWeapons(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateDrones(dt);
  updateEnemyProjectiles(dt);
  updateXPGems(dt);
  updateMapCoins(dt);
  updateChests(dt);
  updateWaves(dt);
  updateBossEvent(dt);
  updateScoreBonuses(dt);
  updateBossHazards(dt);
  applyMapDamage(dt);
  updateCamera(false);

  if (STATE.levelUpQueue > 0 && !isScreenVisible("levelUpScreen")) {
    openLevelUp();
  }

  if (STATE.player.hp <= 0) {
    STATE.player.hp = 0;
    updateHUD();
    endGame(false);
    return;
  }

  if (STATE.isGameClear) {
    updateHUD();
    endGame(true);
    return;
  }

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
  if (typeof renderBossSwitches === 'function') {
    renderBossSwitches(ctx);
  }
  renderAmbientBubbles(ctx);
  renderBossHazards(ctx);
  renderXPGems(ctx);
  renderChests(ctx);
  renderEnemies(ctx);
  renderEnemyProjectiles(ctx);
  renderBullets(ctx);
  renderPlayer(ctx);
  renderDrones(ctx);
  renderDepthOverlay(ctx);
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
  const treasureSheet = STATE.assets?.treasure;
  const treasureImg = treasureSheet?.img || null;

  for (const chest of STATE.chests) {
    const x = chest.x - cam.x;
    const y = chest.y - cam.y;

    const size = chest.size || 36;

    if (treasureImg) {
      ctx.drawImage(
        treasureImg,
        0,
        0,
        treasureImg.width,
        treasureImg.height,
        x - size / 2,
        y - size / 2,
        size,
        size
      );
      continue;
    }

    // フォールバック
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
  gainXP(1000);
  addGold(500);
  STATE.score += 5000;

  addEffect?.(STATE.player?.x || 0, STATE.player?.y || 0, 42, "#ffe08a", 0.22, 0.24);
  updateHUD?.();
}


function triggerBossEvent(boss, wave) {
  if (!boss) return;
  const def = getEnemyDef(boss.typeId) || {};

  boss.maxHp = Number(def.hp || boss.maxHp || boss.hp || 1000);
  boss.hp = Math.min(Number(boss.hp || boss.maxHp), boss.maxHp);

  boss.shieldMaxHp = Math.max(1, Number(def.shieldHp || 3000));
  boss.shieldHp = boss.shieldActive === false
    ? 0
    : Math.min(
        boss.shieldMaxHp,
        Number.isFinite(boss.shieldHp) ? boss.shieldHp : boss.shieldMaxHp
      );

  boss.shieldActive = boss.shieldHp > 0;
  boss.shieldRespawnDelay = Math.max(0.5, Number(def.shieldRespawnDelay || 10));
  boss.shieldRespawnTimer = boss.shieldActive ? 0 : boss.shieldRespawnDelay;

  boss.bossScale = Math.max(1, Number(def.bossScale || 3));

  if (!Array.isArray(boss.attackDrones)) boss.attackDrones = [];
  boss.attackPatternTimer = 0;
  boss.waveBeamCooldown = 2.8;
  boss.waveBeamTimer = 1.6;

  STATE.bossEvent = {
    active: true,
    bossId: boss.id,
    bossName: def.name || wave?.theme || "BOSS",
    warningTimer: 2.2,
    warningText: `${wave?.theme || "BOSS"} - ${def.name || "大型反応"}`,
    hazardTimer: 1.8,
    switchRespawnTimer: 0
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
  STATE.bossWalls = [];
  STATE.bossSwitches = [];
  STATE.bossEvent.switchRespawnTimer = 0;
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

  updateBossShieldState(boss, dt);
  updateBossWalls(boss, dt);

  STATE.bossEvent.active = true;
  STATE.bossEvent.bossName = (getEnemyDef(boss.typeId)?.name || STATE.bossEvent.bossName || 'BOSS');
  STATE.bossEvent.hazardTimer -= dt;

  if (STATE.bossEvent.hazardTimer <= 0) {
    spawnBossHazard(boss);
    const lowHpFactor = boss.hp / Math.max(1, boss.maxHp);
    STATE.bossEvent.hazardTimer = lowHpFactor < 0.35 ? 1.3 : lowHpFactor < 0.7 ? 1.8 : 2.4;
  }
}

function updateBossShieldState(boss, dt) {
  if (!boss?.isBoss) return;

  boss.shieldMaxHp = Math.max(1, Number(boss.shieldMaxHp || 3000));
  boss.shieldRespawnDelay = Math.max(0.5, Number(boss.shieldRespawnDelay || 10));

  if (boss.shieldActive) {
    boss.shieldHp = clamp(Number(boss.shieldHp || boss.shieldMaxHp), 0, boss.shieldMaxHp);
    if (boss.shieldHp <= 0) {
      boss.shieldActive = false;
      boss.shieldHp = 0;
      boss.shieldRespawnTimer = boss.shieldRespawnDelay;
    }
    return;
  }

  boss.shieldRespawnTimer = Math.max(0, Number(boss.shieldRespawnTimer || boss.shieldRespawnDelay) - dt);

  if (boss.shieldRespawnTimer <= 0) {
    boss.shieldActive = true;
    boss.shieldHp = boss.shieldMaxHp;
    boss.shieldRespawnTimer = 0;

    addEffect?.(boss.x, boss.y, boss.r * 1.9, '#8de8ff', 0.26, 0.32);
  }
}

function spawnBossSwitches(boss) {
  STATE.bossSwitches = [];
  const count = boss.switchCount || 3;
  const margin = 120;

  for (let i = 0; i < count; i++) {
    let placed = false;

    for (let t = 0; t < 80; t++) {
      const x = rand(margin, STATE.world.width - margin);
      const y = rand(margin, STATE.world.height - margin);
      const nearBoss = dist(x, y, boss.x, boss.y) < 220;
      const overlapsWall = typeof isPointInsideObstacle === 'function' && isPointInsideObstacle(x, y, 22);
      const overlapsOther = (STATE.bossSwitches || []).some((sw) => dist(x, y, sw.x, sw.y) < 80);

      if (nearBoss || overlapsWall || overlapsOther) continue;

      STATE.bossSwitches.push({
        id: `bsw_${Math.random().toString(36).slice(2)}`,
        x,
        y,
        r: 16,
        hp: 1,
        dead: false
      });
      placed = true;
      break;
    }

    if (!placed) {
      STATE.bossSwitches.push({
        id: `bsw_${Math.random().toString(36).slice(2)}`,
        x: rand(margin, STATE.world.width - margin),
        y: rand(margin, STATE.world.height - margin),
        r: 16,
        hp: 1,
        dead: false
      });
    }
  }
}

function destroyBossSwitch(sw, boss) {
  if (!sw || sw.dead) return;
  sw.dead = true;
}

function spawnBossWallRect(x, y, w, h) {
  STATE.bossWalls.push({
    id: `bwall_${Math.random().toString(36).slice(2)}`,
    x,
    y,
    w,
    h,
    color: 'rgba(100,220,255,0.16)',
    stroke: 'rgba(180,245,255,0.95)',
    immune: true,
    life: 5.5
  });
}

function spawnBossCrossWalls(boss) {
  STATE.bossWalls = [];

  const gap = boss.bossKind === 'leviathan' ? 220 : 260;
  const thickness = 28;
  const cx = clamp(boss.x, 260, STATE.world.width - 260);
  const cy = clamp(boss.y, 260, STATE.world.height - 260);

  spawnBossWallRect(cx - 520, cy - thickness * 0.5, 520 - gap * 0.5, thickness);
  spawnBossWallRect(cx + gap * 0.5, cy - thickness * 0.5, 520 - gap * 0.5, thickness);
  spawnBossWallRect(cx - thickness * 0.5, cy - 520, thickness, 520 - gap * 0.5);
  spawnBossWallRect(cx - thickness * 0.5, cy + gap * 0.5, thickness, 520 - gap * 0.5);
}

function updateBossWalls(boss, dt) {
  boss.wallPhaseTimer = Math.max(0, (boss.wallPhaseTimer || 0) - dt);

  if (boss.wallPhaseTimer <= 0) {
    spawnBossCrossWalls(boss);
    boss.wallPhaseTimer = boss.bossKind === 'leviathan' ? 7.5 : 9.5;
  }

  const next = [];
  for (const wall of STATE.bossWalls || []) {
    wall.life = Math.max(0, (wall.life || 0) - dt);
    if (wall.life > 0) next.push(wall);
  }
  STATE.bossWalls = next;
}

function getBossTelegraphedAttackDamage(boss) {
  if (!boss) return 120;
  if (boss.typeId === "leviathan" || boss.bossKind === "leviathan") return 400;
  if (boss.typeId === "boss_manta") return 200;
  return Math.max(80, Number(boss.damage || 0));
}

function spawnBossHazard(boss) {
  const p = STATE.player;
  if (!p || !boss) return;

  if (typeof spawnBossOrbitDroneBurst === "function") {
    if (boss.typeId === "boss_manta") {
      spawnBossOrbitDroneBurst(boss, "star", 5);
    } else if (boss.typeId === "leviathan" || boss.bossKind === "leviathan") {
      spawnBossOrbitDroneBurst(boss, "wave", 5);
    }
  }

  const heavyDamage = getBossTelegraphedAttackDamage(boss);

  if (boss.typeId === "leviathan" || boss.bossKind === "leviathan") {
    if (typeof spawnLeviathanWaveBeams === "function") {
      spawnLeviathanWaveBeams(boss);
    }

    if (Math.random() < 0.34) {
      const horizontal = Math.random() < 0.5;
      const laneThickness = rand(96, 138);
      const laneLength = horizontal ? STATE.world.width - 120 : STATE.world.height - 120;
      const x = horizontal ? STATE.world.width * 0.5 : clamp(p.x + rand(-120, 120), 90, STATE.world.width - 90);
      const y = horizontal ? clamp(p.y + rand(-120, 120), 90, STATE.world.height - 90) : STATE.world.height * 0.5;

      STATE.hazards.push({
        kind: "laser_wall",
        x,
        y,
        width: horizontal ? laneLength : laneThickness,
        height: horizontal ? laneThickness : laneLength,
        telegraph: 1.35,
        life: 4.0,
        damage: heavyDamage,
        blocksMovement: true,
        color: "rgba(170,120,255,0.26)",
        stroke: "#ead7ff"
      });
      return;
    }

    if (Math.random() < 0.56) {
      const radius = rand(165, 235);
      const x = clamp(p.x + rand(-90, 90), radius + 8, STATE.world.width - radius - 8);
      const y = clamp(p.y + rand(-90, 90), radius + 8, STATE.world.height - radius - 8);

      STATE.hazards.push({
        kind: "mega_bomb",
        x,
        y,
        radius,
        telegraph: 1.75,
        life: 2.15,
        damage: heavyDamage,
        color: "rgba(255,110,150,0.28)",
        stroke: "#ffd0dd"
      });
      return;
    }

    const cx = clamp((Math.random() < 0.55 ? p.x : boss.x) + rand(-90, 90), 180, STATE.world.width - 180);
    const cy = clamp((Math.random() < 0.55 ? p.y : boss.y) + rand(-90, 90), 180, STATE.world.height - 180);
    const innerRadius = rand(48, 78);
    const outerRadius = innerRadius + rand(78, 126);

    STATE.hazards.push({
      kind: "ring",
      x: cx,
      y: cy,
      innerRadius,
      radius: outerRadius,
      telegraph: 1.25,
      life: 1.45,
      damage: heavyDamage,
      color: "rgba(160,120,255,0.42)",
      stroke: "#d7c3ff"
    });
    return;
  }

  if (boss.typeId === "boss_manta") {
    if (Math.random() < 0.45) {
      const horizontal = Math.random() < 0.5;
      const laneThickness = rand(72, 108);
      const laneLength = horizontal ? STATE.world.width - 140 : STATE.world.height - 140;
      const x = horizontal ? STATE.world.width * 0.5 : clamp(p.x + rand(-100, 100), 90, STATE.world.width - 90);
      const y = horizontal ? clamp(p.y + rand(-100, 100), 90, STATE.world.height - 90) : STATE.world.height * 0.5;

      STATE.hazards.push({
        kind: "laser_wall",
        x,
        y,
        width: horizontal ? laneLength : laneThickness,
        height: horizontal ? laneThickness : laneLength,
        telegraph: 1.15,
        life: 3.2,
        damage: heavyDamage,
        blocksMovement: true,
        color: "rgba(110,220,255,0.24)",
        stroke: "#c8f3ff"
      });
      return;
    }

    const horizontal = Math.random() < 0.5;
    const laneThickness = rand(90, 138);
    const laneLength = horizontal ? STATE.world.width - 120 : STATE.world.height - 120;
    const x = horizontal ? STATE.world.width * 0.5 : clamp((Math.random() < 0.65 ? p.x : boss.x) + rand(-150, 150), 80, STATE.world.width - 80);
    const y = horizontal ? clamp((Math.random() < 0.65 ? p.y : boss.y) + rand(-150, 150), 80, STATE.world.height - 80) : STATE.world.height * 0.5;

    STATE.hazards.push({
      kind: "lane",
      x,
      y,
      width: horizontal ? laneLength : laneThickness,
      height: horizontal ? laneThickness : laneLength,
      telegraph: 1.05,
      life: 1.2,
      damage: heavyDamage,
      color: "rgba(110,220,255,0.34)",
      stroke: "#c8f3ff"
    });
  }
}

function spawnLeviathanWaveBeams(boss) {
  const p = STATE.player;
  if (!boss || !p) return;

  const horizontal = Math.random() < 0.5;
  const gap = rand(92, 132);
  const thickness = rand(56, 76);
  const life = 2.0;
  const telegraph = 1.15;
  const damage = getBossTelegraphedAttackDamage(boss);

  if (horizontal) {
    const centerY = clamp(p.y + rand(-120, 120), 120, STATE.world.height - 120);

    STATE.hazards.push({
      kind: "wave_beam",
      x: STATE.world.width * 0.5,
      y: clamp(centerY - gap, thickness, STATE.world.height - thickness),
      width: STATE.world.width - 120,
      height: thickness,
      telegraph,
      life,
      damage,
      blocksMovement: false,
      color: "rgba(120,200,255,0.30)",
      stroke: "#c9f4ff"
    });

    STATE.hazards.push({
      kind: "wave_beam",
      x: STATE.world.width * 0.5,
      y: clamp(centerY + gap, thickness, STATE.world.height - thickness),
      width: STATE.world.width - 120,
      height: thickness,
      telegraph,
      life,
      damage,
      blocksMovement: false,
      color: "rgba(120,200,255,0.30)",
      stroke: "#c9f4ff"
    });
  } else {
    const centerX = clamp(p.x + rand(-120, 120), 120, STATE.world.width - 120);

    STATE.hazards.push({
      kind: "wave_beam",
      x: clamp(centerX - gap, thickness, STATE.world.width - thickness),
      y: STATE.world.height * 0.5,
      width: thickness,
      height: STATE.world.height - 120,
      telegraph,
      life,
      damage,
      blocksMovement: false,
      color: "rgba(120,200,255,0.30)",
      stroke: "#c9f4ff"
    });

    STATE.hazards.push({
      kind: "wave_beam",
      x: clamp(centerX + gap, thickness, STATE.world.width - thickness),
      y: STATE.world.height * 0.5,
      width: thickness,
      height: STATE.world.height - 120,
      telegraph,
      life,
      damage,
      blocksMovement: false,
      color: "rgba(120,200,255,0.30)",
      stroke: "#c9f4ff"
    });
  }
}

function pointInBossHazard(hz, x, y, pad = 0) {
  if (!hz) return false;

  if (
    hz.kind === 'lane' ||
    hz.kind === 'laser_wall' ||
    hz.kind === 'wave_beam'
  ) {
    return (
      x >= hz.x - hz.width * 0.5 - pad &&
      x <= hz.x + hz.width * 0.5 + pad &&
      y >= hz.y - hz.height * 0.5 - pad &&
      y <= hz.y + hz.height * 0.5 + pad
    );
  }

  const d = dist(hz.x, hz.y, x, y);

  if (hz.kind === 'ring') {
    return d <= (hz.radius || 0) + pad && d >= Math.max(0, (hz.innerRadius || 0) - pad);
  }

  return d <= (hz.radius || 0) + pad;
}

function getActiveStageData() {
  if (typeof getCurrentMap === "function") {
    const stage = getCurrentMap();
    if (stage) return stage;
  }
  return STATE.mapData?.stages?.[0] || null;
}

function isPointInsideStageRect(x, y, rect) {
  if (!rect) return false;
  return (
    x >= Number(rect.x || 0) &&
    y >= Number(rect.y || 0) &&
    x <= Number(rect.x || 0) + Number(rect.w || 0) &&
    y <= Number(rect.y || 0) + Number(rect.h || 0)
  );
}

function getMapTrapAt(x, y) {
  const stage = getActiveStageData();
  const traps = Array.isArray(stage?.traps) ? stage.traps : [];
  let best = null;

  for (const trap of traps) {
    if (!isPointInsideStageRect(x, y, trap)) continue;
    if (!best || Number(trap.damage || 0) > Number(best.damage || 0)) {
      best = trap;
    }
  }

  return best;
}

function getTrapDamageRate(trap) {
  if (!trap) return 0;
  const raw = Number(trap.damage || 0);

  // map_data.json の damage: 10 / 12 / 14 / 15 を
  // そのまま「毎秒10% / 12% / 14% / 15%」として扱う
  if (raw > 1) return raw / 100;

  return Math.max(0, raw);
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

function updateBossHazards(dt) {
  const p = STATE.player;
  const next = [];
  for (const hz of STATE.hazards || []) {
    hz.life -= dt;
    hz.telegraph -= dt;
    if (hz.life <= 0) continue;
    if (hz.telegraph <= 0 && !hz.triggered) {
      hz.triggered = true;
      if (p && pointInBossHazard(hz, p.x, p.y, p.r)) {
        damagePlayer(hz.damage, {
          id: "boss_hazard",
          label: "ボス危険地帯"
        });
      }
    }
    next.push(hz);
  }
  STATE.hazards = next;
}

function resolvePlayerBossHazardCollision(prevX, prevY) {
  const p = STATE.player;
  if (!p) return;

  for (const hz of STATE.hazards || []) {
    if (!hz.blocksMovement || !hz.triggered) continue;

    const wall = {
      x: hz.x - hz.width * 0.5,
      y: hz.y - hz.height * 0.5,
      w: hz.width,
      h: hz.height
    };

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
}

function renderBossHazards(ctx) {
  const cam = STATE.camera;

  for (const hz of STATE.hazards || []) {
    const x = hz.x - cam.x;
    const y = hz.y - cam.y;
    const pulse = 0.72 + Math.sin(STATE.time * 7 + hz.x * 0.01) * 0.16;

    ctx.save();

    if (hz.kind === 'lane' || hz.kind === 'laser_wall' || hz.kind === 'wave_beam') {
      const telegraphing = hz.telegraph > 0;
      ctx.globalAlpha = telegraphing ? 0.28 + pulse * 0.18 : 0.36 + pulse * 0.10;
      ctx.fillStyle = hz.color || 'rgba(255,120,120,0.24)';
      ctx.fillRect(
        x - hz.width * 0.5,
        y - hz.height * 0.5,
        hz.width,
        hz.height
      );

      ctx.globalAlpha = telegraphing ? 0.85 : 1;
      ctx.strokeStyle = hz.stroke || '#ffffff';
      ctx.lineWidth = hz.kind === 'wave_beam' ? 4 : 3;
      ctx.strokeRect(
        x - hz.width * 0.5,
        y - hz.height * 0.5,
        hz.width,
        hz.height
      );

      if (hz.kind === 'wave_beam') {
        const stripes = 5;
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        for (let i = 1; i <= stripes; i++) {
          if (hz.width >= hz.height) {
            const yy = y - hz.height * 0.5 + (hz.height / (stripes + 1)) * i;
            ctx.beginPath();
            ctx.moveTo(x - hz.width * 0.5, yy);
            ctx.lineTo(x + hz.width * 0.5, yy);
            ctx.stroke();
          } else {
            const xx = x - hz.width * 0.5 + (hz.width / (stripes + 1)) * i;
            ctx.beginPath();
            ctx.moveTo(xx, y - hz.height * 0.5);
            ctx.lineTo(xx, y + hz.height * 0.5);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
      continue;
    }

    ctx.globalAlpha = hz.telegraph > 0 ? 0.22 + pulse * 0.12 : 0.34 + pulse * 0.1;
    ctx.fillStyle = hz.color || 'rgba(255,120,120,0.24)';

    if (hz.kind === 'ring') {
      ctx.beginPath();
      ctx.arc(x, y, hz.radius || 0, 0, Math.PI * 2);
      ctx.arc(x, y, hz.innerRadius || 0, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.globalAlpha = hz.telegraph > 0 ? 0.88 : 1;
      ctx.strokeStyle = hz.stroke || '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, hz.radius || 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, hz.innerRadius || 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, hz.radius || 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = hz.telegraph > 0 ? 0.88 : 1;
      ctx.strokeStyle = hz.stroke || '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }
}



function ensureAmbientBubbles() {
  if (!canvas) return;
  const target = Math.max(18, Math.min(44, Math.floor((canvas.width * canvas.height) / 48000)));
  while ((STATE.ambientBubbles || []).length < target) {
    STATE.ambientBubbles.push(createAmbientBubble(true));
  }
  if (STATE.ambientBubbles.length > target) {
    STATE.ambientBubbles.length = target;
  }
}

function createAmbientBubble(initial = false) {
  const w = canvas?.width || window.innerWidth || 1280;
  const h = canvas?.height || window.innerHeight || 720;
  return {
    x: rand(0, w),
    y: initial ? rand(0, h) : h + rand(12, 90),
    r: rand(2.2, 9.5),
    vy: rand(12, 34),
    drift: rand(-16, 16),
    alpha: rand(0.08, 0.24),
    wobble: rand(0.8, 2.2),
    seed: rand(0, Math.PI * 2)
  };
}

function updateAmbientBubbles(dt) {
  if (!canvas) return;
  ensureAmbientBubbles();
  const w = canvas.width;
  const h = canvas.height;
  STATE.ambientBubbles = (STATE.ambientBubbles || []).map((b) => {
    b.y -= b.vy * dt;
    b.x += Math.sin(STATE.time * b.wobble + b.seed) * b.drift * dt;
    if (b.y < -24 || b.x < -40 || b.x > w + 40) {
      return createAmbientBubble(false);
    }
    return b;
  });
}

function renderAmbientBubbles(ctx) {
  for (const b of STATE.ambientBubbles || []) {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.strokeStyle = '#d9f8ff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = b.alpha * 0.32;
    ctx.fillStyle = '#9befff';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.22, b.y - b.r * 0.2, b.r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function renderDepthOverlay(ctx) {
  if (!canvas) return;
  const clearTime = Math.max(1, STATE.waveData?.clearTime || 480);
  const depth = clamp(STATE.elapsed / clearTime, 0, 1);
  const waveDepth = clamp(((STATE.currentWave || 1) - 1) / 8, 0, 1);
  const alpha = 0.04 + depth * 0.16 + waveDepth * 0.08;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `rgba(12, 58, 96, ${0.03 + depth * 0.05})`);
  gradient.addColorStop(0.55, `rgba(8, 26, 52, ${alpha * 0.65})`);
  gradient.addColorStop(1, `rgba(1, 8, 20, ${alpha})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.12 + waveDepth * 0.1;
  ctx.fillStyle = `rgba(${20 + Math.floor(depth * 30)}, ${70 + Math.floor(depth * 35)}, ${110 + Math.floor(depth * 55)}, 1)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
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

function getChainBonus(count, isBoss = false) {
  if (isBoss || count < 3) return 0;
  if (count === 3) return 10;
  if (count === 4) return 14;
  if (count === 5) return 18;
  return 18 + (count - 5) * 4;
}

function registerKillChain(enemy) {
  const s = STATE.scoreState;
  if (!s) return;
  s.killChainCount = (s.killChainTimer > 0 ? s.killChainCount : 0) + 1;
  s.killChainTimer = 2.0;
  const bonus = getChainBonus(s.killChainCount, !!enemy?.isBoss);
  if (bonus > 0) {
    STATE.score += bonus;
    setScorePopup(`${s.killChainCount}連続撃破 +${bonus}`);
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

  const intercepted = typeof handleAutoBatchEnd === "function"
    ? handleAutoBatchEnd(!!clear)
    : false;

  if (intercepted) {
    if (typeof suppressTestModePanelForAutoBatch === "function") {
      suppressTestModePanelForAutoBatch();
    }
    hideAllScreens();
    return;
  }

  const rankingResult = saveRanking(STATE.score);
  showResultScreen(clear, rankingResult);

  if (typeof shouldPromptAutoBatchCsv === "function" && shouldPromptAutoBatchCsv()) {
    if (typeof consumeAutoBatchCsvPromptFlag === "function") {
      consumeAutoBatchCsvPromptFlag();
    }
    if (typeof openAutoBatchCsvConfirmModal === "function") {
      openAutoBatchCsvConfirmModal();
    }
  }
}

function onGameClear() {
  if (STATE.paused || STATE.clear) return;
  endGame(true);
}

// ===============================
// DOM起動
// ===============================

window.addEventListener("DOMContentLoaded", boot);
