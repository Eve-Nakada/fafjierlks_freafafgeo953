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

  const guaranteed = [...(wave.guaranteedTypes || [])];
  const themeIndex = wave.index || 1;
  if (themeIndex === 4 && !guaranteed.includes('moray')) guaranteed.push('moray');
  if (themeIndex === 5 && !guaranteed.includes('electric_eel')) guaranteed.push('electric_eel');
  if (themeIndex >= 8 && !guaranteed.includes('deep_ghost')) guaranteed.push('deep_ghost');

  const spawnList = guaranteed.slice(0, count);
  while (spawnList.length < count) {
    spawnList.push(pick(enemyTypes));
  }

  spawnByFormation(wave, spawnList);
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
  if (!wave.boss) return;
  if (wave._bossSpawned) return;
  if (STATE.elapsed < (wave.boss.at || 0)) return;

  wave._bossSpawned = true;
  const boss = spawnEnemyAroundPlayer(wave.boss.typeId, 260, 300, true, 'boss');
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
