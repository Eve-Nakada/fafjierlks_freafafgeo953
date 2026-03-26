// ===============================
// Wave進行
// ===============================

function resetWaveState() {
  applyWaveBalanceOverrides();

  const waves = STATE.waveData?.waves || [];
  for (const wave of waves) {
    delete wave._spawnTimer;
    delete wave._bossSpawned;
    delete wave._leviathanSpawned;
    delete wave._mapCoinsSpawned;
    delete wave._eliteSpawned;
  }
  STATE.lastShopWave = 0;
}

function createBalancedLateWave(index, at, theme, formation, count, enemyTypes, guaranteedTypes, enemyWeights, mapCoins = { normal: 0, rare: 0 }) {
  return {
    index,
    at,
    spawnInterval: 999,
    count,
    theme,
    enemyTypes: [...enemyTypes],
    guaranteedTypes: [...guaranteedTypes],
    enemyWeights: { ...enemyWeights },
    formation,
    mapCoins: { ...mapCoins },
    elite: true
  };
}

function applyWaveBalanceOverrides() {
  if (!STATE.waveData || !Array.isArray(STATE.waveData.waves)) return;

  STATE.waveData.waves = STATE.waveData.waves.map((wave) => {
    const cloned = {
      ...wave,
      enemyTypes: Array.isArray(wave.enemyTypes) ? [...wave.enemyTypes] : [],
      guaranteedTypes: Array.isArray(wave.guaranteedTypes) ? [...wave.guaranteedTypes] : [],
      enemyWeights: wave.enemyWeights ? { ...wave.enemyWeights } : undefined,
      mapCoins: wave.mapCoins ? { ...wave.mapCoins } : { normal: 0, rare: 0 }
    };

    const idx = Number(cloned.index || 0);

    // 既存バランス調整を維持
    if (idx >= 10 && idx <= 15) {
      cloned.count = Math.max(1, Math.ceil(Number(cloned.count || 0) * 1.5));
    }

    // 後半の金貨を抑制
    if (idx >= 9) {
      cloned.mapCoins = { normal: 7, rare: 2 };
    }

    return cloned;
  });
}

function getWaveDefs() {
  return STATE.waveData?.waves || [];
}

function getCurrentWaveDef() {
  const waves = getWaveDefs();
  if (waves.length === 0) return null;

  let current = waves[0];
  for (const wave of waves) {
    if (STATE.elapsed >= (wave.at || 0)) current = wave;
  }
  return current;
}


function isTestEnemySpawnerActive() {
  const spawner = STATE.testMode?.enemySpawner;
  return !!(STATE.testMode?.enabled && spawner?.enabled && Array.isArray(spawner.selectedEnemyIds) && spawner.selectedEnemyIds.length > 0);
}

function isTestModeControllingWaves() {
  return !!(isTestEnemySpawnerActive() && STATE.testMode?.enemySpawner?.pauseNormalWaves);
}

function updateTestEnemySpawner(dt) {
  if (!isTestEnemySpawnerActive()) return;
  const spawner = STATE.testMode.enemySpawner;
  const selected = spawner.selectedEnemyIds.filter((id) => !!getEnemyDef(id));
  if (selected.length <= 0) return;

  spawner.interval = Math.max(0.05, Number(spawner.interval || 1));
  spawner.count = Math.max(1, Number(spawner.count || 1));
  spawner.timer = Number.isFinite(spawner.timer) ? spawner.timer - dt : spawner.interval;

  while (spawner.timer <= 0) {
    spawner.timer += spawner.interval;
    for (let i = 0; i < spawner.count; i++) {
      const typeId = selected[Math.floor(Math.random() * selected.length)];
      spawnEnemyAroundPlayer(
        typeId,
        Math.max(48, Number(spawner.minDist || 320)),
        Math.max(Number(spawner.minDist || 320) + 16, Number(spawner.maxDist || 460)),
        false,
        'normal'
      );
    }
  }
}

function updateWaves(dt) {
  const waves = getWaveDefs();
  if (waves.length === 0 || !STATE.player) return;

  const wave = getCurrentWaveDef();
  if (!wave) return;

  const newWaveIndex = wave.index || 1;
  const prevWaveIndex = STATE.currentWave || 1;
  const changedWave = newWaveIndex !== prevWaveIndex;

  STATE.currentWave = newWaveIndex;

  if (changedWave) {
    addWaveCoins(newWaveIndex);
    wave._spawnTimer = 0;
  }

  if (!wave._mapCoinsSpawned) {
    addWaveCoins(newWaveIndex);
  }

  if (isTestEnemySpawnerActive()) {
    updateTestEnemySpawner(dt);
    if (isTestModeControllingWaves()) {
      return;
    }
  }

  if (wave._spawnTimer == null) {
    wave._spawnTimer = 0;
  }

  wave._spawnTimer -= dt;

  if ((wave.count || 0) > 0) {
    const interval = Math.max(0.05, Number(wave.spawnInterval || 1.0));

    while (wave._spawnTimer <= 0) {
      spawnWaveEnemies(wave);
      wave._spawnTimer += interval;
    }
  }

  handleWaveBossSpawn(wave);
  handleWaveLeviathanSpawn(wave);
  handleWaveShop(newWaveIndex, prevWaveIndex);
  handleClearCheck();
}

function addWaveCoins(waveIndex) {
  const wave = getWaveDefs().find((w) => (w.index || 0) === waveIndex);
  if (!wave || wave._mapCoinsSpawned) return;

  wave._mapCoinsSpawned = true;

  const cfg = wave.mapCoins || {};
  const normalCount = Math.max(0, Number(cfg.normal || 0));
  const rareCount = Math.max(0, Number(cfg.rare || 0));

  for (let i = 0; i < normalCount; i++) {
    if (typeof spawnMapCoin === 'function') {
      spawnMapCoin('normal');
    }
  }

  for (let i = 0; i < rareCount; i++) {
    if (typeof spawnMapCoin === 'function') {
      spawnMapCoin('rare');
    }
  }
}

function isBalancedEliteWave(wave) {
  return !!wave?.elite;
}

function getEliteShieldHitsForWave(wave) {
  const idx = Number(wave?.index || 0);
  if (idx === 16) return 1;
  if (idx === 17) return 2;
  return Math.random() < 0.5 ? 1 : 2;
}

function spawnBalancedEliteEnemy(typeId, x, y, shieldHits, pattern) {
  const enemy = spawnEnemy(typeId, x, y, false, "normal");
  if (!enemy) return null;

  if (typeof makeEliteEnemy === "function") {
    makeEliteEnemy(enemy, {
      hpMul: 22,
      sizeMul: 3,
      damageMul: 2.5,
      speedMul: 0.9,
      shieldHits,
      pattern,
      xpMul: 3,
      goldMul: 2.0,
      xpBonus: 0,
      goldBonus: 4,
      eliteXpVisualScale: 1.9
    });
  }

  return enemy;
}

function spawnBalancedEliteWaveEnemies(wave) {
  const spawnList = buildWaveSpawnList(wave);
  if (spawnList.length <= 0) return;

  const formation = wave.formation || "scatter";
  const count = spawnList.length;
  const shieldHits = getEliteShieldHitsForWave(wave);
  const pattern = `wave_${wave.index || 0}`;

  if (formation === "encircle") {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count;
      const d = 330 + (i % 3) * 30;
      const p = STATE.player;
      if (!p) return;
      const x = clamp(p.x + Math.cos(ang) * d, 32, STATE.world.width - 32);
      const y = clamp(p.y + Math.sin(ang) * d, 32, STATE.world.height - 32);
      spawnBalancedEliteEnemy(spawnList[i], x, y, shieldHits, pattern);
    }
    return;
  }

  if (formation === "rush_pack") {
    const p = STATE.player;
    if (!p) return;

    for (let i = 0; i < count; i++) {
      const side = i < Math.ceil(count / 2) ? "left" : "right";
      const d = 300 + (i % 3) * 36;
      let x = p.x;
      let y = p.y;

      if (side === "left") x -= d;
      else x += d;

      y += rand(-140, 140);

      x = clamp(x, 32, STATE.world.width - 32);
      y = clamp(y, 32, STATE.world.height - 32);

      spawnBalancedEliteEnemy(spawnList[i], x, y, shieldHits, pattern);
    }
    return;
  }

  if (formation === "finale_mix") {
    const p = STATE.player;
    if (!p) return;

    const half = Math.max(1, Math.floor(count / 2));

    for (let i = 0; i < half; i++) {
      const ang = (Math.PI * 2 * i) / half;
      const d = 320 + (i % 2) * 28;
      const x = clamp(p.x + Math.cos(ang) * d, 32, STATE.world.width - 32);
      const y = clamp(p.y + Math.sin(ang) * d, 32, STATE.world.height - 32);
      spawnBalancedEliteEnemy(spawnList[i], x, y, shieldHits, pattern);
    }

    for (let i = half; i < count; i++) {
      const side = i % 2 === 0 ? "top" : "bottom";
      const d = 360 + (i - half) * 16;
      let x = p.x + rand(-140, 140);
      let y = p.y;

      if (side === "top") y -= d;
      else y += d;

      x = clamp(x, 32, STATE.world.width - 32);
      y = clamp(y, 32, STATE.world.height - 32);

      spawnBalancedEliteEnemy(spawnList[i], x, y, shieldHits, pattern);
    }
    return;
  }

  for (const typeId of spawnList) {
    const p = STATE.player;
    if (!p) return;
    const ang = rand(0, Math.PI * 2);
    const d = rand(320, 480);
    const x = clamp(p.x + Math.cos(ang) * d, 32, STATE.world.width - 32);
    const y = clamp(p.y + Math.sin(ang) * d, 32, STATE.world.height - 32);
    spawnBalancedEliteEnemy(typeId, x, y, shieldHits, pattern);
  }
}

function spawnWaveEnemies(wave) {
  if (isBalancedEliteWave(wave)) {
    spawnBalancedEliteWaveEnemies(wave);
    return;
  }

  const spawnList = buildWaveSpawnList(wave);
  if (spawnList.length <= 0) return;
  spawnByFormation(wave, shuffleCopy(spawnList));
}

function buildWaveSpawnList(wave) {
  const count = Math.max(0, wave.count || 0);
  const enemyTypes = Array.isArray(wave.enemyTypes) ? wave.enemyTypes.filter(Boolean) : [];
  if (count <= 0 || enemyTypes.length <= 0) return [];

  const spawnList = [];
  const usedCounts = {};

  for (const typeId of (wave.guaranteedTypes || [])) {
    if (!typeId) continue;
    if (spawnList.length >= count) break;
    spawnList.push(typeId);
    usedCounts[typeId] = (usedCounts[typeId] || 0) + 1;
  }

  while (spawnList.length < count) {
    const picked = pickWaveEnemyType(wave, usedCounts, enemyTypes);
    spawnList.push(picked);
    usedCounts[picked] = (usedCounts[picked] || 0) + 1;
  }

  return spawnList;
}

function pickWaveEnemyType(wave, usedCounts, enemyTypes) {
  const weights = wave.enemyWeights || {};
  const weighted = [];

  for (const typeId of enemyTypes) {
    const baseWeight = Math.max(0.01, Number(weights[typeId] || 1));
    const alreadyUsed = usedCounts[typeId] || 0;
    const diversityBias = 1 / (1 + alreadyUsed * 0.85);
    weighted.push({ typeId, weight: baseWeight * diversityBias });
  }

  let total = 0;
  for (const item of weighted) total += item.weight;
  let roll = Math.random() * total;

  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.typeId;
  }

  return enemyTypes[enemyTypes.length - 1];
}

function shuffleCopy(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function spawnByFormation(wave, spawnList) {
  const formation = wave.formation || 'scatter';
  const count = spawnList.length;

  if (formation === 'side_sweep') {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 'left' : 'right';
      spawnEnemyFromSide(spawnList[i], side, 340 + (i % 2) * 50, false, 'normal');
    }
    return;
  }

  if (formation === 'pinch_cross') {
    const sides = ['left', 'right', 'top', 'bottom'];
    for (let i = 0; i < count; i++) {
      spawnEnemyFromSide(spawnList[i], sides[i % sides.length], 320 + Math.floor(i / sides.length) * 28, false, 'normal');
    }
    return;
  }

  if (formation === 'ranged_line') {
    for (let i = 0; i < count; i++) {
      spawnEnemyFromArc(spawnList[i], -0.42, 0.42, 400 + i * 18, false, 'normal');
    }
    return;
  }

  if (formation === 'encircle') {
    for (let i = 0; i < count; i++) {
      spawnEnemyAroundPlayerAngle(spawnList[i], 330 + (i % 3) * 30, (Math.PI * 2 * i) / count, false, 'normal');
    }
    return;
  }

  if (formation === 'rush_pack') {
    for (let i = 0; i < count; i++) {
      const side = i < Math.ceil(count / 2) ? 'left' : 'right';
      spawnEnemyFromSide(spawnList[i], side, 300 + (i % 3) * 36, false, 'normal');
    }
    return;
  }

  if (formation === 'finale_mix') {
    const half = Math.max(1, Math.floor(count / 2));
    for (let i = 0; i < half; i++) {
      spawnEnemyAroundPlayerAngle(spawnList[i], 320 + (i % 2) * 28, (Math.PI * 2 * i) / half, false, 'normal');
    }
    for (let i = half; i < count; i++) {
      spawnEnemyFromSide(spawnList[i], i % 2 === 0 ? 'top' : 'bottom', 360 + (i - half) * 16, false, 'normal');
    }
    return;
  }

  for (const typeId of spawnList) {
    spawnEnemyAroundPlayer(typeId, 320, 480, false, 'normal');
  }
}

function spawnEnemyFromSide(typeId, side, distance, isBoss, behavior) {
  const p = STATE.player;
  if (!p) return null;

  const d = distance || 360;
  let x = p.x;
  let y = p.y;

  if (side === 'left') x -= d;
  else if (side === 'right') x += d;
  else if (side === 'top') y -= d;
  else y += d;

  const jitter = 140;
  if (side === 'left' || side === 'right') y += rand(-jitter, jitter);
  else x += rand(-jitter, jitter);

  return spawnEnemy(typeId, clamp(x, 32, STATE.world.width - 32), clamp(y, 32, STATE.world.height - 32), isBoss, behavior);
}

function spawnEnemyFromArc(typeId, arcStart, arcEnd, distance, isBoss, behavior) {
  const p = STATE.player;
  if (!p) return null;
  const ang = angle(p.x, p.y, p.x + 1, p.y) + rand(arcStart || -0.3, arcEnd || 0.3);
  return spawnEnemyAroundPlayerAngle(typeId, distance || 380, ang, isBoss, behavior);
}

function spawnEnemyAroundPlayerAngle(typeId, distance, ang, isBoss, behavior) {
  const p = STATE.player;
  if (!p) return null;
  const d = distance || 360;
  const x = clamp(p.x + Math.cos(ang) * d, 32, STATE.world.width - 32);
  const y = clamp(p.y + Math.sin(ang) * d, 32, STATE.world.height - 32);
  return spawnEnemy(typeId, x, y, isBoss, behavior);
}

function handleWaveBossSpawn(wave) {
  if (!wave || isBalancedEliteWave(wave)) return;
  if (!wave.boss) return;
  if (wave._bossSpawned) return;
  if (STATE.elapsed < (wave.boss.at || 0)) return;

  wave._bossSpawned = true;
  const boss = spawnEnemyAroundPlayer(wave.boss.typeId, 260, 300, true, "boss");
  if (boss) triggerBossEvent(boss, wave);
}

function handleWaveLeviathanSpawn(wave) {
  if (!wave.leviathan) return;
  if (wave._leviathanSpawned) return;
  if (STATE.elapsed < (wave.leviathan.at || 0)) return;

  wave._leviathanSpawned = true;
  const boss = spawnEnemyAroundPlayer(wave.leviathan.typeId, 280, 320, true, 'leviathan');
  if (boss) triggerBossEvent(boss, wave);
}

function handleWaveShop(newWaveIndex, prevWaveIndex) {
  if (newWaveIndex <= 1) return;
  if (newWaveIndex === prevWaveIndex) return;
  if (STATE.lastShopWave >= newWaveIndex) return;

  // Wave19ではショップを開かない
  if (newWaveIndex >= 19) {
    STATE.lastShopWave = newWaveIndex;
    return;
  }

  STATE.lastShopWave = newWaveIndex;

  if (typeof openShop === 'function') {
    openShop();
  }
}

function handleClearCheck() {
  if (STATE.isGameClear) return;
  // クリア条件はラスボス撃破に変更
  //const clearTime = Number(STATE.waveData?.clearTime || 0);
  //if (clearTime > 0 && STATE.elapsed >= clearTime) {
  //  STATE.isGameClear = true;
  //  if (typeof onGameClear === 'function') onGameClear();
  //}
}
