// ===============================
// Wave進行
// ===============================

function resetWaveState() {
  const waves = STATE.waveData?.waves || [];
  for (const wave of waves) {
    delete wave._spawnTimer;
    delete wave._bossSpawned;
    delete wave._leviathanSpawned;
  }
  STATE.lastShopWave = 0;
}

function getWaveDefs() {
  return STATE.waveData?.waves || [];
}

function getCurrentWaveDef() {
  const waves = getWaveDefs();
  if (waves.length === 0) return null;

  let current = waves[0];

  for (const wave of waves) {
    if (STATE.elapsed >= (wave.at || 0)) {
      current = wave;
    }
  }

  return current;
}

function updateWaves(dt) {
  const waves = getWaveDefs();
  if (waves.length === 0 || !STATE.player) return;

  const wave = getCurrentWaveDef();
  if (!wave) return;

  const newWaveIndex = wave.index || 1;
  const prevWaveIndex = STATE.currentWave || 1;
  STATE.currentWave = newWaveIndex;

  if (wave._spawnTimer == null) {
    wave._spawnTimer = wave.spawnInterval || 1.0;
  }

  wave._spawnTimer -= dt;

  if (wave._spawnTimer <= 0) {
    wave._spawnTimer = wave.spawnInterval || 1.0;
    spawnWaveEnemies(wave);
  }

  handleWaveBossSpawn(wave);
  handleWaveLeviathanSpawn(wave);
  handleWaveShop(newWaveIndex, prevWaveIndex);
  handleClearCheck();
}

function spawnWaveEnemies(wave) {
  const count = wave.count || 1;
  const enemyTypes = wave.enemyTypes || [];
  if (enemyTypes.length === 0) return;

  for (let i = 0; i < count; i++) {
    const typeId = pick(enemyTypes);
    spawnEnemyAroundPlayer(typeId, 320, 480, false, "normal");
  }
}

function handleWaveBossSpawn(wave) {
  if (!wave.boss) return;
  if (wave._bossSpawned) return;
  if (STATE.elapsed < (wave.boss.at || 0)) return;

  wave._bossSpawned = true;
  spawnEnemyAroundPlayer(wave.boss.typeId, 260, 300, true, "boss");
}

function handleWaveLeviathanSpawn(wave) {
  if (!wave.leviathan) return;
  if (wave._leviathanSpawned) return;
  if (STATE.elapsed < (wave.leviathan.at || 0)) return;

  wave._leviathanSpawned = true;
  spawnEnemyAroundPlayer(wave.leviathan.typeId, 280, 320, true, "leviathan");
}

function handleWaveShop(newWaveIndex, prevWaveIndex) {
  if (newWaveIndex <= 1) return;
  if (newWaveIndex === prevWaveIndex) return;
  if (STATE.shopOpen) return;
  if (STATE.lastShopWave === newWaveIndex) return;

  STATE.lastShopWave = newWaveIndex;
  openShop();
}

function handleClearCheck() {
  const clearTime = STATE.waveData?.clearTime || 480;
  if (STATE.elapsed >= clearTime) {
    endGame(true);
  }
}
