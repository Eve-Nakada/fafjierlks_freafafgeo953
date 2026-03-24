// ===============================
// Auto Play / Batch Test
// ===============================

let autoPlayWakeLock = null;

async function acquireAutoPlayWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return false;
    if (document.hidden) return false;

    if (autoPlayWakeLock) return true;
    autoPlayWakeLock = await navigator.wakeLock.request("screen");

    autoPlayWakeLock.addEventListener("release", () => {
      autoPlayWakeLock = null;
    });

    return true;
  } catch (e) {
    console.warn("WakeLock request failed", e);
    autoPlayWakeLock = null;
    return false;
  }
}

async function releaseAutoPlayWakeLock() {
  try {
    if (autoPlayWakeLock) {
      await autoPlayWakeLock.release();
    }
  } catch (e) {
    console.warn("WakeLock release failed", e);
  } finally {
    autoPlayWakeLock = null;
  }
}

function getAutoPlayState() {
  if (!STATE.testMode) STATE.testMode = {};

  if (!STATE.testMode.autoPlayState) {
    STATE.testMode.autoPlayState = {
      enabled: false,
      simSpeed: 1,
      batchRunning: false,
      batchTargetRuns: 100,
      batchRunIndex: 0,
      batchResults: [],
      runStartedAt: 0,
      currentWeaponId: null,
      pendingRestart: false,
      restartDelay: 0.45,
      lastRunClear: false,
      selectingShop: false,
      promptCsvAfterBatch: false
    };
  }

  const s = STATE.testMode.autoPlayState;
  s.simSpeed = Math.max(1, Number(s.simSpeed || 1));
  s.batchTargetRuns = Math.max(1, Number(s.batchTargetRuns || 1));
  s.promptCsvAfterBatch = !!s.promptCsvAfterBatch;
  return s;
}

function isAutoPlayEnabled() {
  return !!getAutoPlayState().enabled;
}

function getAutoPlaySimSpeed() {
  return Math.max(1, Number(getAutoPlayState().simSpeed || 1));
}

function setAutoPlayEnabled(enabled) {
  const s = getAutoPlayState();
  s.enabled = !!enabled;
  if (!s.enabled) {
    resetAutoPlayInput();
  }
  return s.enabled;
}

function setAutoPlaySimSpeed(speed) {
  const s = getAutoPlayState();
  const normalized = Number(speed || 1);
  s.simSpeed = normalized >= 8 ? 8 : normalized >= 4 ? 4 : normalized >= 2 ? 2 : 1;
  return s.simSpeed;
}

function resetAutoPlayInput() {
  if (!STATE.input) return;
  STATE.input.moveX = 0;
  STATE.input.moveY = 0;
}

function clampAuto(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAutoVec(x, y) {
  const len = Math.hypot(x, y);
  if (len <= 0.0001) return { x: 0, y: 0, len: 0 };
  return { x: x / len, y: y / len, len };
}

function getAutoPlayer() {
  return STATE.player || null;
}

function getAutoNearestTarget(list, maxDist = Infinity, extraFilter = null) {
  const p = getAutoPlayer();
  if (!p || !Array.isArray(list)) return null;

  let best = null;
  let bestD = maxDist;

  for (const item of list) {
    if (!item) continue;
    if (extraFilter && !extraFilter(item)) continue;
    const d = Math.hypot((item.x || 0) - p.x, (item.y || 0) - p.y);
    if (d < bestD) {
      best = item;
      bestD = d;
    }
  }

  return best;
}

function getAutoDangerVector() {
  const p = getAutoPlayer();
  if (!p) return { x: 0, y: 0 };

  let vx = 0;
  let vy = 0;

  for (const e of STATE.enemies || []) {
    if (!e || e.dead) continue;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const near = Math.max(0, 280 - d) / 280;
    const bossMul = e.isBoss ? 2.2 : 1.0;
    const w = near * near * bossMul;

    vx += (dx / d) * w;
    vy += (dy / d) * w;
  }

  for (const b of STATE.enemyBullets || []) {
    if (!b) continue;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const near = Math.max(0, 200 - d) / 200;
    const w = near * near * 2.0;

    vx += (dx / d) * w;
    vy += (dy / d) * w;
  }

  for (const h of STATE.hazards || []) {
    if (!h) continue;

    let hx = h.x || p.x;
    let hy = h.y || p.y;
    let effectiveRadius = 0;

    if (h.radius) {
      effectiveRadius = Number(h.radius || 0) + 32;
    } else if (h.innerRadius && h.radius) {
      effectiveRadius = Number(h.radius || 0) + 24;
    } else if (h.width && h.height) {
      const left = hx - h.width * 0.5;
      const right = hx + h.width * 0.5;
      const top = hy - h.height * 0.5;
      const bottom = hy + h.height * 0.5;
      const closestX = clampAuto(p.x, left, right);
      const closestY = clampAuto(p.y, top, bottom);
      const dx = p.x - closestX;
      const dy = p.y - closestY;
      const d = Math.max(1, Math.hypot(dx, dy));
      const near = Math.max(0, 140 - d) / 140;
      const w = near * near * (h.blocksMovement ? 2.2 : 1.5);
      vx += (dx / d) * w;
      vy += (dy / d) * w;
      continue;
    }

    const dx = p.x - hx;
    const dy = p.y - hy;
    const d = Math.max(1, Math.hypot(dx, dy));
    const near = Math.max(0, effectiveRadius + 80 - d) / Math.max(1, effectiveRadius + 80);
    const w = near * near * 2.4;
    vx += (dx / d) * w;
    vy += (dy / d) * w;
  }

  return { x: vx, y: vy };
}

function getAutoGoalVector() {
  const p = getAutoPlayer();
  if (!p) return { x: 0, y: 0 };

  let vx = 0;
  let vy = 0;

  const hpRate = p.maxHp > 0 ? p.hp / p.maxHp : 1;

  const nearestXp = getAutoNearestTarget(STATE.xpGems || [], 520);
  if (nearestXp) {
    const dx = nearestXp.x - p.x;
    const dy = nearestXp.y - p.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const w = hpRate < 0.35 ? 0.35 : 1.2;
    vx += (dx / d) * w;
    vy += (dy / d) * w;
  }

  const nearestCoin = getAutoNearestTarget(STATE.mapCoins || [], 380);
  if (nearestCoin && hpRate > 0.4) {
    const dx = nearestCoin.x - p.x;
    const dy = nearestCoin.y - p.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    vx += (dx / d) * 0.55;
    vy += (dy / d) * 0.55;
  }

  const bossSwitch = getAutoNearestTarget(
    STATE.bossSwitches || [],
    900,
    (sw) => !sw.dead
  );
  const activeBoss = typeof getActiveBoss === "function" ? getActiveBoss() : null;

  if (bossSwitch && activeBoss?.shieldActive) {
    const dx = bossSwitch.x - p.x;
    const dy = bossSwitch.y - p.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    vx += (dx / d) * 2.1;
    vy += (dy / d) * 2.1;
  }

  if (!nearestXp && !bossSwitch) {
    const centerX = STATE.world.width * 0.5;
    const centerY = STATE.world.height * 0.5;
    const dx = centerX - p.x;
    const dy = centerY - p.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    vx += (dx / d) * 0.22;
    vy += (dy / d) * 0.22;
  }

  return { x: vx, y: vy };
}

function getAutoWallVector() {
  const p = getAutoPlayer();
  if (!p) return { x: 0, y: 0 };

  const margin = 120;
  let vx = 0;
  let vy = 0;

  if (p.x < margin) vx += (margin - p.x) / margin;
  if (p.x > STATE.world.width - margin) vx -= (p.x - (STATE.world.width - margin)) / margin;
  if (p.y < margin) vy += (margin - p.y) / margin;
  if (p.y > STATE.world.height - margin) vy -= (p.y - (STATE.world.height - margin)) / margin;

  return { x: vx * 1.6, y: vy * 1.6 };
}

function updateAutoPlayInput(dt) {
  const s = getAutoPlayState();
  if (!s.enabled || !STATE.testMode?.enabled) {
    resetAutoPlayInput();
    return;
  }

  if (!STATE.player || STATE.paused || STATE.shopOpen || isScreenVisible("levelUpScreen") || isScreenVisible("chestEvolutionScreen")) {
    resetAutoPlayInput();
    return;
  }

  const danger = getAutoDangerVector();
  const goal = getAutoGoalVector();
  const wall = getAutoWallVector();
  const p = STATE.player;
  const hpRate = p.maxHp > 0 ? p.hp / p.maxHp : 1;

  let x = 0;
  let y = 0;

  x += goal.x * (hpRate < 0.35 ? 0.55 : 1.0);
  y += goal.y * (hpRate < 0.35 ? 0.55 : 1.0);

  x += danger.x * (hpRate < 0.35 ? 1.8 : 1.2);
  y += danger.y * (hpRate < 0.35 ? 1.8 : 1.2);

  x += wall.x;
  y += wall.y;

  const n = normalizeAutoVec(x, y);
  STATE.input.moveX = n.x;
  STATE.input.moveY = n.y;
}

function getAutoChoiceScore(choice) {
  if (!choice) return -999999;

  let score = 0;
  const key = String(choice.key || "");
  const meta = String(choice.meta || "");
  const desc = String(choice.desc || "");

  if (choice.type === "evolution") score += 1000;
  if (meta.includes("進化条件に関連")) score += 240;

  if (choice.type === "weapon") {
    score += key.includes("weapon_") ? 80 : 0;
    if (meta.includes("新規武器")) score += 60;
    if (meta.includes("Lv")) score += 40;
  }

  if (choice.type === "passive") {
    score += 50;
  }

  const p = STATE.player;
  if (p) {
    const hpRate = p.maxHp > 0 ? p.hp / p.maxHp : 1;
    if (hpRate < 0.45) {
      if (key.includes("shell")) score += 140;
      if (desc.includes("回復")) score += 120;
      if (meta.includes("防")) score += 60;
    }
  }

  if (key.includes("gold_fallback")) score -= 500;

  return score;
}

function chooseAutoLevelUpChoice(choices) {
  const list = Array.isArray(choices) ? choices : [];
  if (list.length <= 0) return null;

  let best = list[0];
  let bestScore = getAutoChoiceScore(best);

  for (let i = 1; i < list.length; i++) {
    const score = getAutoChoiceScore(list[i]);
    if (score > bestScore) {
      best = list[i];
      bestScore = score;
    }
  }

  return best;
}

function getAutoShopCandidateLists() {
  return {
    missingWeapons: typeof getMissingWeaponDefs === "function" ? getMissingWeaponDefs() : [],
    missingPassives: typeof getMissingPassiveDefs === "function" ? getMissingPassiveDefs() : [],
    upgradeWeapons: typeof getShopUpgradeableWeapons === "function" ? getShopUpgradeableWeapons() : [],
    upgradePassives: typeof getShopUpgradeablePassives === "function" ? getShopUpgradeablePassives() : []
  };
}

function chooseAutoWeaponDef(list) {
  if (!Array.isArray(list) || list.length <= 0) return null;

  let best = list[0];
  let bestScore = -999999;

  for (const def of list) {
    if (!def) continue;
    let score = 0;

    const growthBranches = typeof getWeaponGrowthBranches === "function"
      ? getWeaponGrowthBranches(def)
      : [];

    if (growthBranches.length > 0) score += 40;
    if (Array.isArray(def.synergies) && def.synergies.length > 0) score += 30;
    if ((def.desc || "").includes("範囲")) score += 10;
    if ((def.desc || "").includes("追尾")) score += 10;

    const inst = typeof getWeaponInstance === "function" ? getWeaponInstance(def.id) : null;
    if (inst) {
      score += 80 + (inst.level || 1) * 18;
      if ((inst.evolutionStage || 0) >= 1) score += 30;
    } else {
      score += 50;
    }

    if (score > bestScore) {
      best = def;
      bestScore = score;
    }
  }

  return best;
}

function chooseAutoPassiveDef(list) {
  if (!Array.isArray(list) || list.length <= 0) return null;

  let best = list[0];
  let bestScore = -999999;
  const needed = typeof collectNeededEvolutionPassives === "function"
    ? collectNeededEvolutionPassives()
    : new Map();

  for (const def of list) {
    if (!def) continue;
    const lv = typeof getPassiveLevel === "function" ? getPassiveLevel(def.id) : 0;
    let score = 0;

    score += (needed.get(def.id) || 0) * 100;
    score += lv > 0 ? 50 + lv * 18 : 40;

    if (def.id === "shell") score += 60;
    if (def.id === "battery") score += 28;
    if (def.id === "sonar_scope") score += 28;
    if (def.id === "fins") score += 24;
    if (def.id === "attack_drone") score += 22;
    if (def.id === "barrier_drone") score += 26;

    if (score > bestScore) {
      best = def;
      bestScore = score;
    }
  }

  return best;
}

async function buyAutoShopItem(item) {
  if (!item || !STATE.player) return false;

  const cost = typeof calcShopPrice === "function" ? calcShopPrice(item) : Number(item.price || 0);
  if ((STATE.player.gold || 0) < cost) return false;
  if (typeof canBuyShopItem === "function" && !canBuyShopItem(item)) return false;

  const lists = getAutoShopCandidateLists();

  STATE.player.gold -= cost;
  let success = true;
  let consumed = true;

  switch (item.effect) {
    case "heal":
      if (typeof healPlayer === "function") healPlayer(item.value || 0);
      if (STATE.shopSession) {
        STATE.shopSession.allowedHeal = (STATE.shopSession.allowedHeal || 0) + (item.value || 0);
      }
      break;

    case "maxHp": {
      const add = Math.max(0, Number(item.value || 0));
      STATE.player.shopMaxHpBonus = (STATE.player.shopMaxHpBonus || 0) + add;
      STATE.player.maxHp += add;
      STATE.player.hp = Math.min(STATE.player.maxHp, STATE.player.hp + add);
      if (STATE.shopSession) {
        STATE.shopSession.allowedMaxHp = (STATE.shopSession.allowedMaxHp || 0) + add;
      }
      break;
    }

    case "absorbXp":
      if (typeof absorbAllXP === "function") absorbAllXP();
      break;

    case "reroll":
      STATE.player.rerollTickets = (STATE.player.rerollTickets || 0) + (item.value || 1);
      break;

    case "weaponGain": {
      const picked = chooseAutoWeaponDef(lists.missingWeapons);
      success = !!picked && typeof addWeapon === "function" && addWeapon(picked.id);
      break;
    }

    case "passiveGain": {
      const picked = chooseAutoPassiveDef(lists.missingPassives);
      STATE._suppressImmediateShellHeal = true;
      success = !!picked && typeof addPassive === "function" && addPassive(picked.id);
      STATE._suppressImmediateShellHeal = false;
      break;
    }

    case "weaponUpgrade": {
      const picked = chooseAutoWeaponDef(lists.upgradeWeapons);
      success = !!picked && typeof addWeapon === "function" && addWeapon(picked.id);
      break;
    }

    case "passiveUpgrade": {
      const picked = chooseAutoPassiveDef(lists.upgradePassives);
      STATE._suppressImmediateShellHeal = true;
      success = !!picked && typeof addPassive === "function" && addPassive(picked.id);
      STATE._suppressImmediateShellHeal = false;
      break;
    }

    default:
      break;
  }

  if (!success) {
    STATE.player.gold += cost;
    if (typeof updateHUD === "function") updateHUD();
    return false;
  }

  if (consumed) {
    if (!STATE.shopPurchased) STATE.shopPurchased = {};
    STATE.shopPurchased[item.id] = true;
  }

  STATE.score += 30;
  if (typeof updateHUD === "function") updateHUD();
  if (typeof renderShop === "function") renderShop();
  return true;
}

function getAutoShopItemScore(item) {
  if (!item || !STATE.player) return -999999;

  const p = STATE.player;
  const hpRate = p.maxHp > 0 ? p.hp / p.maxHp : 1;
  const cost = typeof calcShopPrice === "function" ? calcShopPrice(item) : Number(item.price || 0);
  let score = 0;

  if ((p.gold || 0) < cost) return -999999;
  if (typeof canBuyShopItem === "function" && !canBuyShopItem(item)) return -999999;

  switch (item.effect) {
    case "weaponUpgrade":
      score += 240;
      break;
    case "passiveUpgrade":
      score += 210;
      break;
    case "weaponGain":
      score += 180;
      break;
    case "passiveGain":
      score += 155;
      break;
    case "maxHp":
      score += hpRate < 0.5 ? 145 : 105;
      break;
    case "heal":
      score += hpRate < 0.3 ? 260 : hpRate < 0.5 ? 170 : 40;
      break;
    case "reroll":
      score += 45;
      break;
    case "absorbXp":
      score += 28;
      break;
    default:
      score += 10;
      break;
  }

  score -= cost * 0.35;
  return score;
}

async function tryAutoHandleShop() {
  const s = getAutoPlayState();
  if (!s.enabled || !STATE.shopOpen || !STATE.player) return false;
  if (s.selectingShop) return false;

  const items = typeof getDisplayShopItems === "function" ? getDisplayShopItems() : [];
  if (!Array.isArray(items) || items.length <= 0) {
    if (typeof closeShop === "function") closeShop();
    if (typeof refreshTestModePanel === "function") refreshTestModePanel();
    return true;
  }

  let best = null;
  let bestScore = -999999;

  for (const item of items) {
    const score = getAutoShopItemScore(item);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  if (!best || bestScore < 0) {
    if (typeof closeShop === "function") closeShop();
    if (typeof refreshTestModePanel === "function") refreshTestModePanel();
    return true;
  }

  s.selectingShop = true;
  try {
    await buyAutoShopItem(best);
  } finally {
    s.selectingShop = false;
  }

  const remain = typeof getDisplayShopItems === "function" ? getDisplayShopItems() : [];
  let affordableExists = false;

  for (const item of remain) {
    if (getAutoShopItemScore(item) >= 0) {
      affordableExists = true;
      break;
    }
  }

  if (!affordableExists && typeof closeShop === "function") {
    closeShop();
  }

  if (typeof refreshTestModePanel === "function") refreshTestModePanel();
  return true;
}

function getAutoBatchSummary() {
  const s = getAutoPlayState();
  const rows = Array.isArray(s.batchResults) ? s.batchResults : [];
  const count = rows.length;

  if (count <= 0) {
    return {
      count: 0,
      clearRate: 0,
      avgWave: 0,
      avgScore: 0,
      avgLevel: 0,
      maxWave: 0,
      weaponStats: [],
      deathWaveStats: []
    };
  }

  let clearCount = 0;
  let waveSum = 0;
  let scoreSum = 0;
  let levelSum = 0;
  let maxWave = 0;

  const weaponMap = new Map();
  const deathWaveMap = new Map();

  for (const row of rows) {
    const wave = Number(row.wave || 0);
    const score = Number(row.score || 0);
    const level = Number(row.level || 0);
    const clear = !!row.clear;
    const weaponId = row.weaponId || "unknown";
    const weaponName = row.weaponName || weaponId;
    const deathWave = row.deathWave == null ? null : Number(row.deathWave);

    if (clear) clearCount += 1;
    waveSum += wave;
    scoreSum += score;
    levelSum += level;
    maxWave = Math.max(maxWave, wave);

    if (!weaponMap.has(weaponId)) {
      weaponMap.set(weaponId, {
        weaponId,
        weaponName,
        runs: 0,
        clears: 0,
        totalWave: 0,
        totalScore: 0
      });
    }

    const ws = weaponMap.get(weaponId);
    ws.runs += 1;
    ws.totalWave += wave;
    ws.totalScore += score;
    if (clear) ws.clears += 1;

    if (!clear && deathWave != null) {
      deathWaveMap.set(deathWave, (deathWaveMap.get(deathWave) || 0) + 1);
    }
  }

  const weaponStats = [...weaponMap.values()]
    .map((ws) => ({
      ...ws,
      clearRate: ws.runs > 0 ? ws.clears / ws.runs : 0,
      avgWave: ws.runs > 0 ? ws.totalWave / ws.runs : 0,
      avgScore: ws.runs > 0 ? ws.totalScore / ws.runs : 0
    }))
    .sort((a, b) => {
      if (b.clearRate !== a.clearRate) return b.clearRate - a.clearRate;
      if (b.avgWave !== a.avgWave) return b.avgWave - a.avgWave;
      return b.runs - a.runs;
    });

  const deathWaveStats = [...deathWaveMap.entries()]
    .map(([wave, count]) => ({ wave: Number(wave), count }))
    .sort((a, b) => a.wave - b.wave);

  return {
    count,
    clearRate: clearCount / count,
    avgWave: waveSum / count,
    avgScore: scoreSum / count,
    avgLevel: levelSum / count,
    maxWave,
    weaponStats,
    deathWaveStats
  };
}

function formatAutoBatchSummaryText() {
  const s = getAutoPlayState();
  const summary = getAutoBatchSummary();

  if (summary.count <= 0) {
    return `Batch 0/${s.batchTargetRuns}`;
  }

  const topWeapon = summary.weaponStats[0];
  const topWeaponText = topWeapon
    ? `Top ${topWeapon.weaponName} ${(topWeapon.clearRate * 100).toFixed(1)}%`
    : `Top -`;

  const hotDeath = summary.deathWaveStats.length > 0
    ? summary.deathWaveStats.reduce((best, row) => row.count > best.count ? row : best, summary.deathWaveStats[0])
    : null;

  const deathText = hotDeath
    ? `DeathPeak W${hotDeath.wave}:${hotDeath.count}`
    : `DeathPeak -`;

  return [
    `Batch ${summary.count}/${s.batchTargetRuns}`,
    `Clear ${(summary.clearRate * 100).toFixed(1)}%`,
    `AvgWave ${summary.avgWave.toFixed(2)}`,
    `AvgScore ${Math.round(summary.avgScore)}`,
    `AvgLv ${summary.avgLevel.toFixed(2)}`,
    `MaxWave ${summary.maxWave}`,
    topWeaponText,
    deathText
  ].join(" / ");
}

function captureAutoPlayRunResult(clear) {
  const s = getAutoPlayState();
  const p = STATE.player;
  const weaponId = s.currentWeaponId || p?.weapons?.[0]?.id || null;

  const deathCause = clear
    ? { id: "", label: "" }
    : (STATE.lastDamageCause || { id: "unknown", label: "不明" });

  const weaponLoadoutMap = buildAutoBatchWeaponLoadoutMap();
  const passiveLoadoutMap = buildAutoBatchPassiveLoadoutMap();

  s.batchResults.push({
    index: Number(s.batchRunIndex || 0),
    clear: !!clear,
    elapsed: Number(STATE.elapsed || 0),
    wave: Number(STATE.currentWave || 0),
    deathWave: clear ? null : Number(STATE.currentWave || 0),
    deathCauseId: clear ? "" : String(deathCause.id || "unknown"),
    deathCauseLabel: clear ? "" : String(deathCause.label || "不明"),
    score: Number(STATE.score || 0),
    level: Number(p?.level || 0),
    gold: Number(p?.gold || 0),
    weaponId: weaponId || null,
    weaponLoadoutMap,
    passiveLoadoutMap,
    weaponLoadout: buildAutoBatchWeaponLoadoutText(),
    passiveLoadout: buildAutoBatchPassiveLoadoutText()
  });
}

async function beginAutoBatchTest(count) {
  const s = getAutoPlayState();
  s.enabled = true;
  s.batchRunning = true;
  s.batchTargetRuns = Math.max(1, Number(count || s.batchTargetRuns || 100));
  s.batchRunIndex = 1;
  s.batchResults = [];
  s.pendingRestart = false;
  s.restartDelay = 0.45;
  s.lastRunClear = false;
  s.currentWeaponId = STATE.player?.weapons?.[0]?.id || s.currentWeaponId || null;

  STATE.testMode.enabled = true;
  STATE.testMode.pendingStart = true;
  STATE.testMode.autoSkipLevelUp = true;

  await acquireAutoPlayWakeLock?.();

  if (typeof refreshTestModePanel === "function") refreshTestModePanel();
  if (typeof updateTestModeStatus === "function") {
    updateTestModeStatus(`自動テスト開始 ${s.batchTargetRuns}回 / 完全放置モード`);
  }
}

async function stopAutoBatchTest() {
  const s = getAutoPlayState();
  s.batchRunning = false;
  s.pendingRestart = false;
  s.selectingShop = false;
  resetAutoPlayInput();

  await releaseAutoPlayWakeLock?.();

  if (typeof refreshTestModePanel === "function") refreshTestModePanel();
  if (typeof updateTestModeStatus === "function") {
    updateTestModeStatus("自動テスト停止");
  }
}

function onAutoPlayRunStarted(initialWeaponId) {
  const s = getAutoPlayState();
  s.runStartedAt = Number(STATE.time || 0);
  s.pendingRestart = false;
  s.restartDelay = 0.45;
  s.selectingShop = false;

  if (initialWeaponId) s.currentWeaponId = initialWeaponId;
  else if (!s.currentWeaponId) s.currentWeaponId = STATE.player?.weapons?.[0]?.id || null;

  if (typeof resetLastDamageCause === "function") {
    resetLastDamageCause();
  }

  // バッチ中は「テストモーダルだけ閉じる」。
  // ここで paused を true に戻してはいけない。
  if (typeof suppressTestModePanelForAutoBatch === "function" && s.batchRunning) {
    suppressTestModePanelForAutoBatch();
  }

  if (typeof refreshTestModePanel === "function") refreshTestModePanel();
}

async function handleAutoBatchEnd(clear) {
  const s = getAutoPlayState();
  if (!s.batchRunning) return false;

  captureAutoPlayRunResult(clear);
  s.lastRunClear = !!clear;

  if (typeof suppressTestModePanelForAutoBatch === "function") {
    suppressTestModePanelForAutoBatch();
  }

  if (s.batchRunIndex >= s.batchTargetRuns) {
    s.batchRunning = false;
    s.pendingRestart = false;
    s.promptCsvAfterBatch = true;

    await releaseAutoPlayWakeLock?.();

    if (typeof refreshTestModePanel === "function") refreshTestModePanel();
    if (typeof updateTestModeStatus === "function") {
      updateTestModeStatus(`自動テスト完了 / ${formatAutoBatchSummaryText()}`);
    }
    return false;
  }

  s.pendingRestart = true;
  s.restartDelay = 0.45;

  if (typeof refreshTestModePanel === "function") refreshTestModePanel();
  if (typeof updateTestModeStatus === "function") {
    updateTestModeStatus(`Run ${s.batchRunIndex} 完了 → 次を開始`);
  }
  return true;
}

function updateAutoBatchRestart(dt) {
  const s = getAutoPlayState();
  if (!s.batchRunning || !s.pendingRestart) return false;

  s.restartDelay -= dt;
  if (s.restartDelay > 0) return true;

  s.pendingRestart = false;
  s.batchRunIndex += 1;

  if (typeof suppressTestModePanelForAutoBatch === "function") {
    suppressTestModePanelForAutoBatch();
  }

  if (typeof hideAllScreens === "function") hideAllScreens();
  if (typeof startGame === "function") {
    startGame(s.currentWeaponId || null);
  }

  if (typeof refreshTestModePanel === "function") refreshTestModePanel();
  return true;
}

async function updateAutoPlay(dt) {
  const s = getAutoPlayState();

  if (s.pendingRestart) {
    updateAutoBatchRestart(dt);
    return;
  }

  if (STATE.shopOpen) {
    await tryAutoHandleShop();
    return;
  }

  updateAutoPlayInput(dt);
}

async function updateAutoPlayWhilePaused(dt) {
  const s = getAutoPlayState();
  if (!s.enabled) return false;

  if (s.pendingRestart) {
    updateAutoBatchRestart(dt);
    return true;
  }

  if (STATE.shopOpen) {
    await tryAutoHandleShop();
    return true;
  }

  if (isScreenVisible("levelUpScreen") && typeof tryAutoResolveLevelUpForTest === "function") {
    tryAutoResolveLevelUpForTest();
    return true;
  }

  return false;
}

function suppressTestModePanelForAutoBatch() {
  const wrap = typeof getEl === "function"
    ? getEl("testModePanelWrap")
    : document.getElementById("testModePanelWrap");

  if (wrap) wrap.classList.remove("active");

  if (!STATE.testMode) return;

  STATE.testMode.panelOpen = false;

  // 重要:
  // 以前はここで STATE.paused = true にしていたため、
  // 2回目以降の自動プレイ開始直後に再停止していた。
  // バッチ中はモーダルだけ閉じ、ゲーム進行は止めない。
  if (STATE.shopOpen || isScreenVisible?.("levelUpScreen") || isScreenVisible?.("weaponGrowthScreen")) {
    STATE.testMode.panelPrevPaused = true;
  } else {
    STATE.testMode.panelPrevPaused = false;
  }
}

function getAutoBatchWeaponStats() {
  return getAutoBatchSummary().weaponStats || [];
}

function getAutoBatchDeathWaveStats() {
  return getAutoBatchSummary().deathWaveStats || [];
}

function buildAutoBatchWeaponStatsText() {
  const rows = getAutoBatchWeaponStats();
  if (!rows.length) return "武器別勝率: まだ結果がありません";

  return rows.map((row) => {
    return `${row.weaponName}  ${row.clears}/${row.runs}  (${(row.clearRate * 100).toFixed(1)}%)  AvgWave ${row.avgWave.toFixed(2)}`;
  }).join("\n");
}

function buildAutoBatchDeathWaveText() {
  const rows = getAutoBatchDeathWaveStats();
  if (!rows.length) return "Wave別死亡分布: まだ失敗結果がありません";

  return rows.map((row) => `Wave ${row.wave}: ${row.count}件`).join("\n");
}

function escapeAutoCsv(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function getAutoBatchWeaponCsvColumns() {
  return Array.isArray(STATE.gameData?.weapons) ? STATE.gameData.weapons : [];
}

function getAutoBatchPassiveCsvColumns() {
  return Array.isArray(STATE.gameData?.passives) ? STATE.gameData.passives : [];
}

function encodeAutoBatchWeaponLevel(weapon) {
  if (!weapon) return 0;

  const stage = Number(weapon.evolutionStage || 0);
  const level = Math.max(1, Number(weapon.level || 1));

  if (stage === 0) return Math.min(3, level);
  if (stage === 1) return Math.min(7, 3 + level);
  return Math.min(12, 7 + level);
}

function buildAutoBatchWeaponLoadoutMap() {
  const out = {};
  const defs = getAutoBatchWeaponCsvColumns();
  const playerWeapons = Array.isArray(STATE.player?.weapons) ? STATE.player.weapons : [];

  for (const def of defs) {
    out[def.id] = 0;
  }

  for (const weapon of playerWeapons) {
    if (!weapon || !weapon.id) continue;
    out[weapon.id] = encodeAutoBatchWeaponLevel(weapon);
  }

  return out;
}

function buildAutoBatchPassiveLoadoutMap() {
  const out = {};
  const defs = getAutoBatchPassiveCsvColumns();
  const passiveLevels = STATE.player?.passiveLevels || {};

  for (const def of defs) {
    out[def.id] = Math.max(0, Math.min(5, Number(passiveLevels[def.id] || 0)));
  }

  return out;
}

function buildAutoBatchCsv() {
  const s = getAutoPlayState();
  const rows = Array.isArray(s.batchResults) ? s.batchResults : [];

  const weaponDefs = getAutoBatchWeaponCsvColumns();
  const passiveDefs = getAutoBatchPassiveCsvColumns();

  const header = [
    "index",
    "clear",
    "elapsed",
    "wave",
    "deathWave",
    "deathCauseId",
    "deathCauseLabel",
    "score",
    "level",
    "gold",
    "weaponId",
    ...weaponDefs.map((def) => `weapon_${def.id}`),
    ...passiveDefs.map((def) => `passive_${def.id}`)
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    const weaponLoadout = row.weaponLoadoutMap || {};
    const passiveLoadout = row.passiveLoadoutMap || {};

    const values = [
      row.index,
      row.clear ? 1 : 0,
      row.elapsed,
      row.wave,
      row.deathWave == null ? "" : row.deathWave,
      row.deathCauseId || "",
      row.deathCauseLabel || "",
      row.score,
      row.level,
      row.gold,
      row.weaponId || "",
      ...weaponDefs.map((def) => Number(weaponLoadout[def.id] || 0)),
      ...passiveDefs.map((def) => Number(passiveLoadout[def.id] || 0))
    ];

    lines.push(values.map(escapeAutoCsv).join(","));
  }

  return lines.join("\n");
}

function buildAutoBatchWeaponLoadoutText() {
  const loadoutMap = buildAutoBatchWeaponLoadoutMap();
  const defs = getAutoBatchWeaponCsvColumns();

  return defs.map((def) => `${def.id}:${Number(loadoutMap[def.id] || 0)}`).join(" | ");
}

function buildAutoBatchPassiveLoadoutText() {
  const loadoutMap = buildAutoBatchPassiveLoadoutMap();
  const defs = getAutoBatchPassiveCsvColumns();

  return defs.map((def) => `${def.id}:${Number(loadoutMap[def.id] || 0)}`).join(" | ");
}

function shouldPromptAutoBatchCsv() {
  const s = getAutoPlayState();
  return !!(s.promptCsvAfterBatch && Array.isArray(s.batchResults) && s.batchResults.length > 0);
}

function consumeAutoBatchCsvPromptFlag() {
  const s = getAutoPlayState();
  const should = !!s.promptCsvAfterBatch;
  s.promptCsvAfterBatch = false;
  return should;
}

function downloadAutoBatchCsv() {
  const s = getAutoPlayState();
  if (!Array.isArray(s.batchResults) || s.batchResults.length <= 0) return false;

  const csv = buildAutoBatchCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, "0");
  const d = String(ts.getDate()).padStart(2, "0");
  const hh = String(ts.getHours()).padStart(2, "0");
  const mm = String(ts.getMinutes()).padStart(2, "0");
  const ss = String(ts.getSeconds()).padStart(2, "0");

  a.href = url;
  a.download = `ocean_survivor_batch_${y}${m}${d}_${hh}${mm}${ss}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
