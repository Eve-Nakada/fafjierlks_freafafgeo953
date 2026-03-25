// ===============================
// 武器・弾・進化
// ===============================

function getWeaponDef(id) {
  return (STATE.gameData?.weapons || []).find(w => w.id === id) || null;
}

function getWeaponEvolutionBranches(def) {
  if (!def) return [];

  if (Array.isArray(def.evolutions) && def.evolutions.length > 0) {
    return def.evolutions;
  }

  if (def.evolution) {
    return [{
      branchId: def.evolution.branchId || def.evolution.pattern || "evolution",
      name: def.evolution.name || "進化",
      pattern: def.evolution.pattern || null,
      needsPassive: def.evolution.needsPassive || null,
      secondStage: def.evolution.secondStage || null
    }];
  }

  return [];
}

function getWeaponInstance(id) {
  return STATE.player?.weapons?.find(w => w.id === id) || null;
}

function getWeaponEvolutionStage(weaponId) {
  const w = getWeaponInstance(weaponId);
  return w?.evolutionStage || 0;
}

function isWeaponEvolved(weaponId) {
  return getWeaponEvolutionStage(weaponId) >= 1;
}

function isWeaponSecondEvolved(weaponId) {
  return getWeaponEvolutionStage(weaponId) >= 2;
}

function getWeaponMaxLevel(w) {
  if (!w) return getStageMaxLevel(0);
  return getStageMaxLevel(w.evolutionStage || 0, getWeaponDef(w.id));
}

function canAddWeapon(id) {
  const inst = getWeaponInstance(id);
  if (inst) return inst.level < getWeaponMaxLevel(inst);
  return true;
}

function addWeapon(id) {
  const p = STATE.player;
  const def = getWeaponDef(id);
  if (!p || !def) return false;

  let inst = getWeaponInstance(id);

  if (inst) {
    const maxLv = getWeaponMaxLevel(inst);
    if (inst.level >= maxLv) return false;
    inst.level += 1;

    if ((inst.evolutionStage || 0) > 0) {
      inst.branchId = resolveWeaponBranchIdForCurrentBuild(id, inst.branchId);
    }
    return true;
  }

  inst = {
    id,
    level: 1,
    cooldown: 0,
    evolutionStage: 0,
    branchId: null,
    orbitAngle: 0,
    orbitTickTimer: 0
  };

  p.weapons.push(inst);
  markWeaponSeen(id);
  unlockWeapon(id);
  return true;
}


function removeWeapon(id) {
  const p = STATE.player;
  if (!p || !Array.isArray(p.weapons)) return false;
  const before = p.weapons.length;
  p.weapons = p.weapons.filter((w) => !(w && w.id === id));
  return p.weapons.length !== before;
}

function setWeaponTestConfig(id, config = {}) {
  const p = STATE.player;
  const def = getWeaponDef(id);
  if (!p || !def) return false;

  const enabled = config.enabled !== false;
  if (!enabled) {
    return removeWeapon(id);
  }

  let inst = getWeaponInstance(id);
  if (!inst) {
    addWeapon(id);
    inst = getWeaponInstance(id);
  }
  if (!inst) return false;

  const stage = Math.max(0, Math.min(2, Number(config.stage || 0)));
  const branches = getWeaponEvolutionBranches(def);

  let branchId = null;
  if (stage > 0) {
    branchId = resolveWeaponBranchIdForCurrentBuild(id, config.branchId || inst.branchId || null);
    if (!branchId || !branches.find((b) => b.branchId === branchId)) {
      branchId = branches[0]?.branchId || null;
    }
  }

  inst.evolutionStage = stage;
  inst.branchId = stage > 0 ? branchId : null;
  inst.level = Math.max(1, Math.min(getStageMaxLevel(stage, def), Number(config.level || 1)));
  inst.cooldown = 0;
  inst.orbitAngle = 0;
  inst.orbitTickTimer = 0;
  markWeaponSeen(id);
  unlockWeapon(id);
  return true;
}

function getForcedWeaponBranchId(weaponId) {
  switch (weaponId) {
    case "harpoon":
      return "trident";
    case "water_cutter":
      return "orbit";
    case "jelly_field":
      return "storm";
    case "mine":
      return "cluster";
    case "fish_missile":
      return "multi_homing";
    case "sonar":
      return "beam";
    default:
      return null;
  }
}

function getForcedWeaponBranchDef(defOrWeaponId) {
  const def = typeof defOrWeaponId === "string"
    ? getWeaponDef(defOrWeaponId)
    : defOrWeaponId;

  if (!def) return null;

  const forcedBranchId = getForcedWeaponBranchId(def.id);
  if (!forcedBranchId) return null;

  return getWeaponEvolutionBranches(def).find(branch => branch.branchId === forcedBranchId) || null;
}

function resolveWeaponBranchIdForCurrentBuild(weaponId, requestedBranchId = null) {
  const forcedBranchId = getForcedWeaponBranchId(weaponId);
  if (forcedBranchId) return forcedBranchId;

  if (requestedBranchId) return requestedBranchId;

  const def = getWeaponDef(weaponId);
  return getWeaponEvolutionBranches(def)[0]?.branchId || null;
}

function getWeaponBranchDef(w) {
  const def = getWeaponDef(w?.id);
  if (!def) return null;

  const resolvedBranchId = resolveWeaponBranchIdForCurrentBuild(w?.id, w?.branchId || null);
  return getWeaponEvolutionBranches(def).find(x => x.branchId === resolvedBranchId) || null;
}

function getWeaponCurrentPattern(w) {
  const stage = w?.evolutionStage || 0;
  const branch = getWeaponBranchDef(w);
  if (stage === 0) return null;
  if (stage === 1) return branch?.pattern || null;
  return branch?.secondStage?.pattern || branch?.pattern || null;
}


const WEAPON_STAGE_MAX_LEVELS = [3, 4, 5];

function getWeaponBalanceConfig(def) {
  return def?.balance || null;
}

function getWeaponBalanceStages(def) {
  return Array.isArray(getWeaponBalanceConfig(def)?.stages) ? getWeaponBalanceConfig(def).stages : [];
}

function getWeaponStageConfigByDef(def, stage) {
  const stages = getWeaponBalanceStages(def);
  return stages[Math.max(0, Math.min(stages.length - 1, stage || 0))] || null;
}

function getWeaponStageLevelConfig(def, stage, level) {
  const stageCfg = getWeaponStageConfigByDef(def, stage);
  const levels = Array.isArray(stageCfg?.levels) ? stageCfg.levels : [];
  if (levels.length <= 0) return null;
  const index = Math.max(0, Math.min(levels.length - 1, (level || 1) - 1));
  return levels[index] || null;
}

function getStageMaxLevel(stage, def = null) {
  const stageCfg = def ? getWeaponStageConfigByDef(def, stage) : null;
  const configuredMax = Array.isArray(stageCfg?.levels) ? stageCfg.levels.length : 0;
  if (configuredMax > 0) return configuredMax;
  return WEAPON_STAGE_MAX_LEVELS[Math.max(0, Math.min(2, stage || 0))] || 3;
}

function applyWeaponTuningPatch(tuning, patch, areaMul, scope) {
  if (!patch || typeof patch !== 'object') return tuning;

  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case 'fieldRadius':
      case 'explodeRadius':
      case 'warningRadius':
      case 'mineChainRadius':
      case 'orbitRadius':
        tuning[key] = Number(value || 0) * areaMul;
        break;
      case 'beamLength':
        tuning[key] = Number(value || 0) * (scope?.lengthMul || 1);
        break;
      default:
        tuning[key] = value;
        break;
    }
  }

  return tuning;
}

function getWeaponTuning(w, def) {
  const stage = w?.evolutionStage || 0;
  const level = Math.max(1, w?.level || 1);
  const areaMul = STATE.player?.stats?.areaMul || 1;
  const scope = getSonarScopeStats();

  const tuning = {
    damageBonus: 0,
    cooldownMul: 1,
    projectileCount: 1,
    spreadStep: 0,
    projectileLife: def?.life || 1.2,
    projectileRadius: 6,
    projectileSpeedMul: 1,
    pierce: 1,
    fieldRadius: 68 * areaMul,
    chainJumps: 0,
    chainRange: 140,
    fieldWaves: 0,
    mineCount: 1,
    explodeRadius: 70 * areaMul,
    warningRadius: 78 * areaMul,
    mineChainCount: 0,
    mineChainRadius: 90 * areaMul,
    mineChainDamageMul: 0.4,
    missileCount: 1,
    homingTurnRate: 3.2,
    missileSplit: 0,
    beamCount: 1,
    beamSpread: 0,
    beamRadius: 10,
    beamLength: 220 * scope.lengthMul,
    orbitCount: 1,
    orbitRadius: 62 * areaMul,
    orbitSpeed: 2.4,
    orbitDamageMul: 0.45,
    orbitSelfSpin: false
  };

  const patch = getWeaponStageLevelConfig(def, stage, level);
  if (patch) return applyWeaponTuningPatch(tuning, patch, areaMul, scope);

  const fallbackMax = getStageMaxLevel(stage);
  const safeLevel = Math.max(1, Math.min(fallbackMax, level));

  switch (w?.id) {
    case 'harpoon':
      if (stage === 0) {
        tuning.damageBonus = [0, 4, 8][safeLevel - 1] || 8;
      } else if (stage === 1) {
        tuning.damageBonus = [10, 12, 14, 16][safeLevel - 1] || 16;
        tuning.projectileCount = [3, 4, 5, 6][safeLevel - 1] || 6;
        tuning.spreadStep = 0.20;
        tuning.projectileLife = 1.55;
        tuning.projectileRadius = 8;
        tuning.pierce = 2;
      } else {
        tuning.damageBonus = [18, 20, 21, 22, 25][safeLevel - 1] || 25;
        tuning.projectileCount = 12;
        tuning.projectileLife = 1.9;
        tuning.projectileRadius = 9;
        tuning.pierce = [1, 2, 3, 4, 999][safeLevel - 1] || 999;
      }
      break;
    case 'water_cutter':
      if (stage === 0) {
        tuning.damageBonus = [0, 3, 6][safeLevel - 1] || 6;
      } else if (stage === 1) {
        tuning.damageBonus = [8, 10, 12, 14][safeLevel - 1] || 14;
        tuning.orbitCount = [2, 3, 4, 5][safeLevel - 1] || 5;
        tuning.orbitRadius = 88 * areaMul;
        tuning.orbitSpeed = 3.5;
      } else {
        tuning.damageBonus = [16, 18, 20, 22, 25][safeLevel - 1] || 25;
        tuning.orbitCount = [5, 6, 7, 8, 8][safeLevel - 1] || 8;
        tuning.orbitRadius = 110 * areaMul;
        tuning.orbitSpeed = [4.8, 4.8, 4.9, 5.0, 5.2][safeLevel - 1] || 5.2;
        tuning.orbitSelfSpin = safeLevel >= 5;
        tuning.orbitDamageMul = safeLevel >= 5 ? 0.52 : 0.48;
      }
      break;
    case 'jelly_field':
      if (stage === 0) {
        tuning.damageBonus = [0, 2, 4][safeLevel - 1] || 4;
        tuning.fieldRadius = [68, 84, 84][safeLevel - 1] * areaMul;
      } else if (stage === 1) {
        tuning.damageBonus = [6, 8, 10, 12][safeLevel - 1] || 12;
        tuning.fieldRadius = 96 * areaMul;
        tuning.chainJumps = [2, 3, 4, 5][safeLevel - 1] || 5;
      } else {
        tuning.damageBonus = [14, 16, 18, 20, 24][safeLevel - 1] || 24;
        tuning.fieldRadius = 108 * areaMul;
        tuning.chainJumps = [6, 7, 8, 9, 9][safeLevel - 1] || 9;
        tuning.fieldWaves = safeLevel >= 5 ? 4 : 0;
      }
      break;
    case 'mine':
      if (stage === 0) {
        tuning.damageBonus = [0, 6, 12][safeLevel - 1] || 12;
      } else if (stage === 1) {
        tuning.damageBonus = [16, 20, 24, 28][safeLevel - 1] || 28;
        tuning.mineCount = [1, 1, 2, 3][safeLevel - 1] || 3;
        tuning.explodeRadius = [96, 116, 116, 116][safeLevel - 1] * areaMul;
        tuning.warningRadius = tuning.explodeRadius * 1.15;
      } else {
        tuning.damageBonus = [32, 36, 40, 44, 50][safeLevel - 1] || 50;
        tuning.mineCount = 3;
        tuning.explodeRadius = [126, 136, 150, 164, 184][safeLevel - 1] * areaMul;
        tuning.warningRadius = tuning.explodeRadius * 1.14;
        tuning.mineChainCount = [1, 2, 3, 4, 5][safeLevel - 1] || 5;
        tuning.mineChainRadius = [90, 104, 118, 132, 150][safeLevel - 1] * areaMul;
        tuning.mineChainDamageMul = safeLevel >= 5 ? 0.7 : 0.45 + (safeLevel - 1) * 0.08;
      }
      break;
    case 'fish_missile':
      if (stage === 0) {
        tuning.damageBonus = [0, 5, 10][safeLevel - 1] || 10;
      } else if (stage === 1) {
        tuning.damageBonus = [14, 18, 22, 26][safeLevel - 1] || 26;
        tuning.missileCount = [2, 3, 4, 5][safeLevel - 1] || 5;
        tuning.homingTurnRate = 4.8;
      } else {
        tuning.damageBonus = [30, 34, 38, 42, 48][safeLevel - 1] || 48;
        tuning.missileCount = [5, 6, 7, 8, 8][safeLevel - 1] || 8;
        tuning.homingTurnRate = [7.2, 7.2, 7.4, 7.6, 7.8][safeLevel - 1] || 7.8;
        tuning.missileSplit = safeLevel >= 5 ? 2 : 0;
      }
      break;
    case 'sonar':
      if (stage === 0) {
        tuning.damageBonus = [0, 7, 14][safeLevel - 1] || 14;
      } else if (stage === 1) {
        tuning.damageBonus = [18, 22, 26, 30][safeLevel - 1] || 30;
        tuning.beamCount = [1, 1, 2, 3][safeLevel - 1] || 3;
        tuning.beamSpread = [0, 0, 0.12, 0.16][safeLevel - 1] || 0.16;
        tuning.beamRadius = [16, 16, 16, 16][safeLevel - 1] || 16;
        tuning.beamLength = [240, 300, 300, 300][safeLevel - 1] * scope.lengthMul;
      } else {
        tuning.damageBonus = [34, 38, 42, 46, 52][safeLevel - 1] || 52;
        tuning.beamCount = [3, 4, 5, 6, 6][safeLevel - 1] || 6;
        tuning.beamSpread = [0.14, 0.16, 0.18, 0.20, 0.20][safeLevel - 1] || 0.20;
        tuning.beamRadius = [16, 16, 16, 16, 24][safeLevel - 1] || 24;
        tuning.beamLength = [360, 360, 360, 360, 380][safeLevel - 1] * scope.lengthMul;
      }
      break;
  }

  return tuning;
}


function updateWeapons(dt) {
  const p = STATE.player;
  if (!p) return;

  for (const w of p.weapons) {
    const def = getWeaponDef(w.id);
    if (!def) continue;

    w.cooldown -= dt;

    if (updateWeaponCharge(w, def, dt)) {
      if (w.id === "water_cutter") updateOrbitWeapon(w, def, dt);
      continue;
    }

    if (w.id === "water_cutter") {
      updateOrbitWeapon(w, def, dt);
      continue;
    }

    if (w.cooldown <= 0) {
      if (w.id === "sonar") {
        startSonarCharge(w, def);
        continue;
      }
      fireWeapon(w, def);
      w.cooldown = getWeaponCooldown(w, def);
    }
  }
}


function getWeaponCooldown(w, def) {
  const p = STATE.player;
  const base = def.cooldown || 1;
  const tuning = getWeaponTuning(w, def);
  return Math.max(0.08, (base * (tuning.cooldownMul || 1)) / Math.max(0.01, p.stats.cooldownMul));
}

function getWeaponDamage(w, def) {
  const p = STATE.player;
  const tuning = getWeaponTuning(w, def);
  return (def.damage + (tuning.damageBonus || 0)) * p.stats.damageMul;
}

function getSonarScopeLevel() {
  if (typeof getPassiveLevel !== "function") return 0;
  return getPassiveLevel("sonar_scope") || 0;
}

function getSonarScopeStats() {
  const lv = getSonarScopeLevel();

  return {
    rangeMul: 1 + lv * 0.16,
    lengthMul: 1 + lv * 0.14,
    seekStrength: lv <= 0 ? 0 : 1.8 + lv * 0.55
  };
}

function getScopedNearestEnemy(fromX, fromY, baseRange = Infinity) {
  const scope = getSonarScopeStats();
  return getNearestEnemy(fromX, fromY, baseRange * scope.rangeMul);
}

function getNearestEnemy(fromX, fromY, maxRange = Infinity) {
  let best = null;
  let bestD = Infinity;

  for (const e of STATE.enemies) {
    const d = dist(fromX, fromY, e.x, e.y);
    if (d < bestD && d <= maxRange) {
      best = e;
      bestD = d;
    }
  }

  return best;
}

function addEffect(x, y, r, color, life, fillAlpha = 0) {
  STATE.effects.push({ x, y, r, color, life, fillAlpha });
}

function startSonarCharge(w, def) {
  const p = STATE.player;
  const target = p ? getScopedNearestEnemy(p.x, p.y, 520) : null;
  const pattern = getWeaponCurrentPattern(w);
  w.chargeTimer = pattern && pattern.startsWith("wave") ? 0.1 : 0.14;
  w.pendingFire = true;
  w.chargeColor = pattern && pattern.startsWith("wave") ? "#8be0ff" : pattern ? "#79f7ff" : "#50d7ff";
  w.chargeAngle = target ? angle(p.x, p.y, target.x, target.y) : 0;
  w.chargeTargetId = target ? target.id : null;
}

function updateWeaponCharge(w, def, dt) {
  if (!w.chargeTimer || w.chargeTimer <= 0) return false;
  w.chargeTimer -= dt;
  const p = STATE.player;
  if (p) {
    const progress = clamp(1 - (w.chargeTimer / Math.max(0.001, (w.pendingFire ? (getWeaponCurrentPattern(w)?.startsWith("wave") ? 0.1 : 0.14) : 0.14))), 0, 1);
    addEffect(p.x + Math.cos(w.chargeAngle || 0) * 24, p.y + Math.sin(w.chargeAngle || 0) * 24, 12 + progress * 18, w.chargeColor || "#79f7ff", 0.06, 0.16 + progress * 0.12);
  }
  if (w.chargeTimer <= 0 && w.pendingFire) {
    w.pendingFire = false;
    fireWeapon(w, def);
    w.cooldown = getWeaponCooldown(w, def);
  }
  return true;
}

function fireWeapon(w, def) {
  switch (w.id) {
    case "harpoon":
      fireHarpoon(w, def);
      break;
    case "mine":
      fireMine(w, def);
      break;
    case "jelly_field":
      fireJellyField(w, def);
      break;
    case "fish_missile":
      fireFishMissile(w, def);
      break;
    case "sonar":
      fireSonar(w, def);
      break;
    case "water_cutter":
      break;
    default:
      fireHarpoon(w, def);
      break;
  }
}

function fireHarpoon(w, def) {
  const p = STATE.player;
  if (!p) return;
  const tuning = getWeaponTuning(w, def);
  const target = getNearestEnemy(p.x, p.y);
  if (!target && (w.evolutionStage || 0) < 2) return;

  const baseAngle = target ? angle(p.x, p.y, target.x, target.y) : 0;
  const isAllAround = (w.evolutionStage || 0) >= 2;
  addEffect(p.x, p.y, 12 + tuning.projectileCount * 2, '#8ef3ff', 0.12, 0.18);

  for (let i = 0; i < tuning.projectileCount; i++) {
    let shotAngle = baseAngle;
    if (isAllAround) {
      shotAngle = (Math.PI * 2 * i) / tuning.projectileCount;
    } else if (tuning.projectileCount > 1) {
      const center = (tuning.projectileCount - 1) / 2;
      shotAngle = baseAngle + (i - center) * tuning.spreadStep;
    }

    spawnBullet({
      x: p.x,
      y: p.y,
      vx: Math.cos(shotAngle) * (def.speed || 360) * p.stats.projectileSpeedMul * tuning.projectileSpeedMul,
      vy: Math.sin(shotAngle) * (def.speed || 360) * p.stats.projectileSpeedMul * tuning.projectileSpeedMul,
      life: tuning.projectileLife,
      radius: tuning.projectileRadius,
      damage: getWeaponDamage(w, def),
      pierce: tuning.pierce,
      weaponId: w.id,
      weaponPattern: getWeaponCurrentPattern(w),
      weaponStage: w.evolutionStage || 0,
      weaponLevel: w.level || 1,
      type: 'projectile',
      color: '#8ef3ff'
    });
  }
}

function fireMine(w, def) {
  const p = STATE.player;
  if (!p) return;

  const tuning = getWeaponTuning(w, def);
  const targets = [];
  const near = [...STATE.enemies]
    .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))
    .slice(0, tuning.mineCount);

  for (const target of near) {
    targets.push({ x: target.x, y: target.y });
  }

  while (targets.length < tuning.mineCount) {
    targets.push({
      x: p.x + rand(-120, 120),
      y: p.y + rand(-120, 120)
    });
  }

  for (const pos of targets) {
    spawnBullet({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      life: 3.0,
      radius: 16,
      damage: getWeaponDamage(w, def),
      pierce: 999,
      weaponId: w.id,
      weaponPattern: getWeaponCurrentPattern(w),
      weaponStage: w.evolutionStage || 0,
      weaponLevel: w.level || 1,
      type: "mine",
      color: "#ffd166",
      explodeRadius: tuning.explodeRadius,
      warningRadius: tuning.warningRadius,
      armDelay: 0.35,
      selfSafeTimer: 0.1,
      chainCount: tuning.mineChainCount,
      chainRadius: tuning.mineChainRadius,
      chainDamageMul: tuning.mineChainDamageMul,
      pendingExplode: false,
      pendingExplodeTimer: 0,
      triggerEnemy: null
    });
  }
}

function fireJellyField(w, def) {
  const p = STATE.player;
  if (!p) return;
  const tuning = getWeaponTuning(w, def);
  addEffect(p.x, p.y, 24 * p.stats.areaMul, '#6de4ff', 0.16, 0.16);
  spawnBullet({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    life: (w.evolutionStage || 0) >= 2 ? 0.76 : (w.evolutionStage || 0) >= 1 ? 0.68 : 0.55,
    radius: tuning.fieldRadius,
    damage: getWeaponDamage(w, def) * ((w.evolutionStage || 0) >= 2 ? 0.42 : (w.evolutionStage || 0) >= 1 ? 0.36 : 0.32),
    pierce: 999,
    weaponId: w.id,
    weaponPattern: getWeaponCurrentPattern(w),
    weaponStage: w.evolutionStage || 0,
    weaponLevel: w.level || 1,
    type: 'field',
    tickTimer: 0,
    color: (w.evolutionStage || 0) >= 2 ? '#a98cff' : '#6de4ff',
    chainJumps: tuning.chainJumps,
    chainRange: tuning.chainRange,
    fieldWaves: tuning.fieldWaves,
    waveCooldown: tuning.fieldWaves > 0 ? 0.22 : 0
  });
}

function fireFishMissile(w, def) {
  const p = STATE.player;
  if (!p) return;
  const tuning = getWeaponTuning(w, def);
  addEffect(p.x, p.y, 14 + tuning.missileCount, '#ff8aa0', 0.12, 0.16);

  const targets = [...STATE.enemies].sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y));
  if (targets.length === 0) return;

  for (let i = 0; i < tuning.missileCount; i++) {
    const target = targets[i % targets.length];
    const ang = angle(p.x, p.y, target.x, target.y) + rand(-0.10, 0.10);
    spawnBullet({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang) * (def.speed || 240) * STATE.player.stats.projectileSpeedMul,
      vy: Math.sin(ang) * (def.speed || 240) * STATE.player.stats.projectileSpeedMul,
      life: 2.4,
      radius: 8,
      damage: getWeaponDamage(w, def),
      pierce: 1,
      weaponId: w.id,
      weaponPattern: getWeaponCurrentPattern(w),
      weaponStage: w.evolutionStage || 0,
      weaponLevel: w.level || 1,
      type: 'homing',
      targetId: target.id,
      turnRate: tuning.homingTurnRate,
      splitCount: tuning.missileSplit,
      color: '#ff8aa0'
    });
  }
}

function fireSonar(w, def) {
  const p = STATE.player;
  if (!p) return;
  const tuning = getWeaponTuning(w, def);
  const scope = getSonarScopeStats();

  let target = STATE.enemies.find(e => e.id === w.chargeTargetId);
  if (!target) target = getScopedNearestEnemy(p.x, p.y, 520);
  if (!target) return;

  const baseAng = angle(p.x, p.y, target.x, target.y);
  addEffect(p.x, p.y, 18 + tuning.beamCount, '#79f7ff', 0.18, 0.22);

  for (let i = 0; i < tuning.beamCount; i++) {
    const center = (tuning.beamCount - 1) / 2;
    const ang = baseAng + (i - center) * (tuning.beamSpread || 0);
    spawnBullet({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang),
      vy: Math.sin(ang),
      life: (w.evolutionStage || 0) >= 2 ? 0.24 : (w.evolutionStage || 0) >= 1 ? 0.20 : 0.16,
      radius: tuning.beamRadius,
      damage: getWeaponDamage(w, def),
      pierce: 999,
      weaponId: w.id,
      weaponPattern: getWeaponCurrentPattern(w),
      weaponStage: w.evolutionStage || 0,
      weaponLevel: w.level || 1,
      type: 'beam',
      color: '#79f7ff',
      length: tuning.beamLength,
      targetId: target.id,
      seekStrength: scope.seekStrength
    });
  }
  w.chargeTargetId = null;
}

function updateOrbitWeapon(w, def, dt) {
  const p = STATE.player;
  if (!p) return;
  const tuning = getWeaponTuning(w, def);
  const cooldownMul = p.stats?.cooldownMul || 1;
  const count = tuning.orbitCount;
  const orbitRadius = tuning.orbitRadius;
  const baseDamage = getWeaponDamage(w, def) * tuning.orbitDamageMul;
  const orbitSpeed = tuning.orbitSpeed * (0.9 + cooldownMul * 0.18);
  const hitInterval = Math.max(0.05, 0.16 / cooldownMul);

  w.orbitAngle += dt * orbitSpeed;
  w.orbitTickTimer = (w.orbitTickTimer || 0) - dt;
  const canHit = w.orbitTickTimer <= 0;
  if (canHit) w.orbitTickTimer = hitInterval;

  for (let i = 0; i < count; i++) {
    const ang = w.orbitAngle + (Math.PI * 2 / count) * i;
    const x = p.x + Math.cos(ang) * orbitRadius;
    const y = p.y + Math.sin(ang) * orbitRadius;

    if (canHit) {
      for (const e of STATE.enemies) {
        if (dist(x, y, e.x, e.y) <= 18 + e.r) damageEnemy(e, baseDamage);
      }
      if (tuning.orbitSelfSpin) {
        for (let j = 0; j < 3; j++) {
          const subAng = ang + STATE.time * 6 + (Math.PI * 2 * j) / 3;
          const sx = x + Math.cos(subAng) * 18;
          const sy = y + Math.sin(subAng) * 18;
          for (const e of STATE.enemies) {
            if (dist(sx, sy, e.x, e.y) <= 10 + e.r) damageEnemy(e, baseDamage * 0.35);
          }
          STATE.effects.push({ x: sx, y: sy, r: 5, color: '#92eaff', life: 0.06 });
        }
      }
    }

    STATE.effects.push({ x, y, r: 9, color: '#7cf7ff', life: 0.06 });
  }
}

function getAvailableEvolutions() {
  const p = STATE.player;
  const out = [];
  if (!p) return out;

  for (const w of p.weapons) {
    const def = getWeaponDef(w.id);
    if (!def) continue;

    const stage = w.evolutionStage || 0;
    if (w.level < getWeaponMaxLevel(w)) continue;

    if (stage === 0) {
      const forcedBranch = getForcedWeaponBranchDef(def);

      if (forcedBranch) {
        const need = forcedBranch.needsPassive;
        if (!need || getPassiveLevel(need) > 0) {
          out.push({
            type: "first",
            weaponId: w.id,
            branchId: forcedBranch.branchId,
            evolutionName: forcedBranch.name || "進化武器",
            needPassive: need || null
          });
        }
        continue;
      }

      for (const evo of getWeaponEvolutionBranches(def)) {
        const need = evo.needsPassive;
        if (!need || getPassiveLevel(need) > 0) {
          out.push({
            type: "first",
            weaponId: w.id,
            branchId: evo.branchId,
            evolutionName: evo.name || "進化武器",
            needPassive: need || null
          });
        }
      }
    } else if (stage === 1) {
      const branch = getWeaponBranchDef(w);
      const second = branch?.secondStage;
      if (!second) continue;

      const need = second.needsPassive;
      if (!need || getPassiveLevel(need) > 0) {
        out.push({
          type: "second",
          weaponId: w.id,
          branchId: w.branchId,
          evolutionName: second.name || "第2段進化",
          needPassive: need || null
        });
      }
    }
  }

  return out;
}

function evolveWeaponToBranch(weaponId, branchId) {
  const w = getWeaponInstance(weaponId);
  if (!w || (w.evolutionStage || 0) !== 0) return false;

  const resolvedBranchId = resolveWeaponBranchIdForCurrentBuild(weaponId, branchId);
  const def = getWeaponDef(weaponId);
  const valid = getWeaponEvolutionBranches(def).find(branch => branch.branchId === resolvedBranchId);
  if (!valid) return false;

  w.evolutionStage = 1;
  w.branchId = resolvedBranchId;
  w.level = 1;
  w.cooldown = 0;
  return true;
}

function secondEvolveWeapon(weaponId) {
  const w = getWeaponInstance(weaponId);
  if (!w || (w.evolutionStage || 0) !== 1) return false;

  w.evolutionStage = 2;
  w.level = 1;
  w.cooldown = 0;
  return true;
}

function applyEvolutionChoice(evo) {
  if (!evo) return false;
  if (evo.type === "first") return evolveWeaponToBranch(evo.weaponId, evo.branchId);
  if (evo.type === "second") return secondEvolveWeapon(evo.weaponId);
  return false;
}

function buildEvolutionLevelUpChoice(evo) {
  const weaponDef = getWeaponDef(evo.weaponId);
  return {
    type: "evolution",
    key: `evolution_${evo.weaponId}_${evo.branchId || "stage2"}_${evo.type}`,
    name: `進化: ${evo.evolutionName}`,
    desc: `${weaponDef?.name || evo.weaponId} を${evo.type === "second" ? "第2進化" : "進化"}させる`,
    meta: `条件達成済み / ${evo.needPassive ? `必要: ${typeof getPassiveNameFromId === 'function' ? getPassiveNameFromId(evo.needPassive) : evo.needPassive}` : "宝箱"}`,
    apply() {
      return applyEvolutionChoice(evo);
    }
  };
}

function spawnBullet(b) {
  STATE.bullets.push({
    x: b.x,
    y: b.y,
    vx: b.vx || 0,
    vy: b.vy || 0,
    life: b.life || 1,
    radius: b.radius || 6,
    damage: b.damage || 1,
    pierce: b.pierce ?? 1,
    weaponId: b.weaponId || "",
    type: b.type || "projectile",
    color: b.color || "#7cf7ff",
    explodeRadius: b.explodeRadius || 0,
    warningRadius: b.warningRadius || b.explodeRadius || 0,
    tickTimer: b.tickTimer || 0,
    targetId: b.targetId || null,
    turnRate: b.turnRate || 0,
    length: b.length || 0,
    armDelay: b.armDelay || 0,
    selfSafeTimer: b.selfSafeTimer || 0,
    splitCount: b.splitCount || 0,
    chainCount: b.chainCount || 0,
    chainRadius: b.chainRadius || 0,
    chainDamageMul: b.chainDamageMul || 0,
    chainJumps: b.chainJumps || 0,
    chainRange: b.chainRange || 140,
    fieldWaves: b.fieldWaves || 0,
    waveCooldown: b.waveCooldown || 0,
    droneIndex: b.droneIndex || 0,
    droneCount: b.droneCount || 0,
    orbitAngle: b.orbitAngle || 0,
    orbitRadius: b.orbitRadius || 0,
    shotTimer: b.shotTimer || 0,
    shotInterval: b.shotInterval || 0.6,
    weaponPattern: b.weaponPattern || null,
    weaponStage: b.weaponStage || 0,
    weaponLevel: b.weaponLevel || 1,
    fillAlpha: b.fillAlpha || 0,
    alreadyHit: new Set()
  });
}

function updateBullets(dt) {
  const next = [];

  for (const b of STATE.bullets) {
    // 機雷の「起爆待ち」は通常lifeより優先して進める
    if (b.type === "mine" && b.pendingExplode) {
      b.pendingExplodeTimer = Math.max(0, Number(b.pendingExplodeTimer || 0) - dt);
      b.selfSafeTimer = Math.max(0, Number(b.selfSafeTimer || 0) - dt);
      b.life = Math.max(0, Number(b.life || 0) - dt);

      if (b.pendingExplodeTimer <= 0) {
        explodeMine(b, b.triggerEnemy || null);
        continue;
      }

      next.push(b);
      continue;
    }

    b.life -= dt;
    b.armDelay = Math.max(0, (b.armDelay || 0) - dt);

    if (b.life <= 0) {
      if (b.type === "mine") explodeMine(b);
      continue;
    }

    if (b.type === "projectile") {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      handleProjectileHits(b);
    } else if (b.type === "homing") {
      updateHomingBullet(b, dt);
      handleProjectileHits(b);
    } else if (b.type === "mine") {
      if (b.selfSafeTimer > 0) {
        b.selfSafeTimer = Math.max(0, b.selfSafeTimer - dt);
      }

      handleMineTrigger(b);
    } else if (b.type === "field") {
      updateFieldBullet(b, dt);
    } else if (b.type === "beam") {
      updateBeamBullet(b, dt);
    } else if (b.type === "drone") {
      updateDroneBullet(b, dt);
    }

    if (b.life > 0) next.push(b);
  }

  STATE.bullets = next;
  updateEffects(dt);
}

function updateHomingBullet(b, dt) {
  let target = STATE.enemies.find(e => e.id === b.targetId);
  if (!target) {
    target = getNearestEnemy(b.x, b.y);
    if (target) b.targetId = target.id;
  }

  if (target) {
    const desired = angle(b.x, b.y, target.x, target.y);
    const current = Math.atan2(b.vy, b.vx);
    let diff = desired - current;

    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const newAngle = current + clamp(diff, -b.turnRate * dt, b.turnRate * dt);
    const speed = Math.hypot(b.vx, b.vy) || 1;
    b.vx = Math.cos(newAngle) * speed;
    b.vy = Math.sin(newAngle) * speed;
  }

  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

function handleProjectileHits(b) {
  const boss = typeof getActiveBoss === 'function' ? getActiveBoss() : null;

  for (const sw of STATE.bossSwitches || []) {
    if (sw.dead) continue;
    if (dist(b.x, b.y, sw.x, sw.y) > b.radius + sw.r) continue;

    if (typeof destroyBossSwitch === 'function') {
      destroyBossSwitch(sw, boss);
    }

    b.pierce -= 1;
    if (b.pierce <= 0) {
      b.life = 0;
      return;
    }
  }

  for (const wall of STATE.bossWalls || []) {
    const hitWall = circleRectHit(
      b.x,
      b.y,
      b.radius || 0,
      wall.x,
      wall.y,
      wall.w,
      wall.h
    );

    if (!hitWall) continue;
    b.life = 0;
    return;
  }

  for (const e of STATE.enemies) {
    if (b.alreadyHit.has(e.id)) continue;
    if (dist(b.x, b.y, e.x, e.y) > b.radius + e.r) continue;

    damageEnemy(e, b.damage);
    b.alreadyHit.add(e.id);

    if (b.weaponId === 'fish_missile' && (b.splitCount || 0) > 0) {
      spawnMissileSplitShots(b, e);
    }

    b.pierce -= 1;
    if (b.pierce <= 0) {
      b.life = 0;
      return;
    }
  }
}

function spawnMissileSplitShots(b, enemy) {
  if (!b || !enemy || (b.splitCount || 0) <= 0) return;
  const base = angle(b.x, b.y, enemy.x, enemy.y);
  for (let i = 0; i < b.splitCount; i++) {
    const ang = base + (i === 0 ? -0.22 : 0.22);
    spawnBullet({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(ang) * 320 * (STATE.player?.stats?.projectileSpeedMul || 1),
      vy: Math.sin(ang) * 320 * (STATE.player?.stats?.projectileSpeedMul || 1),
      life: 0.8,
      radius: 4,
      damage: b.damage * 0.45,
      pierce: 1,
      weaponId: b.weaponId,
      weaponPattern: b.weaponPattern,
      weaponStage: b.weaponStage || 0,
    weaponLevel: b.weaponLevel || 1,
      weaponLevel: b.weaponLevel || 1,
      type: 'projectile',
      color: '#ffd7d7'
    });
  }
}

function handleMineTrigger(mine, enemy = null) {
  if (!mine || mine.exploded) return false;
  if (mine.pendingExplode) return false;
  if ((mine.armDelay || 0) > 0) return false;

  let trigger = enemy;

  if (!trigger) {
    for (const e of STATE.enemies || []) {
      if (!e || e.dead) continue;
      if (dist(mine.x, mine.y, e.x, e.y) <= (mine.r || 16) + (e.r || 0)) {
        trigger = e;
        break;
      }
    }
  }

  if (!trigger) return false;

  // 即爆発ではなく、接触後0.5秒で起爆
  mine.pendingExplode = true;
  mine.pendingExplodeTimer = 0.5;
  mine.triggerEnemy = trigger || null;

  // 起爆待ち中に自然消滅しないよう最低限の猶予を確保
  mine.life = Math.max(Number(mine.life || 0), 0.55);

  addEffect?.(
    mine.x,
    mine.y,
    Math.max(14, Number(mine.warningRadius || mine.explodeRadius || mine.r || 16) * 0.42),
    "#ffd166",
    0.18,
    0.10
  );

  return true;
}

function isMineSelfDamageProtected(mine) {
  return !!mine && Number(mine.selfSafeTimer || 0) > 0;
}

function explodeMine(mine, triggerEnemy = null) {
  if (!mine) return;

  const radius = Number(mine.explodeRadius || mine.r || 70);
  const damage = Number(mine.damage || 0);

  addEffect?.(mine.x, mine.y, radius, "#ffb36b", 0.18, 0.22);

  for (const enemy of STATE.enemies || []) {
    if (!enemy || enemy.dead) continue;
    if (dist(mine.x, mine.y, enemy.x, enemy.y) <= radius + (enemy.r || 0)) {
      damageEnemy?.(enemy, damage, {
        id: "mine",
        label: "機雷爆発"
      });
    }
  }

  if (typeof triggerMineChain === "function") {
    triggerMineChain(mine);
  }

  const p = STATE.player;
  if (p) {
    const hitPlayer = dist(mine.x, mine.y, p.x, p.y) <= radius + (p.r || 0);

    if (hitPlayer && !isMineSelfDamageProtected(mine)) {
      damagePlayer?.(damage * 0.5, {
        id: "self_mine",
        label: "自機機雷爆風"
      });
    }
  }

  mine.life = 0;
}

function triggerMineChain(sourceMine, chainCount, chainRadius, chainDamage) {
  if (!sourceMine || chainCount <= 0) return;

  const radius = Math.max(24, Number(chainRadius || sourceMine.explodeRadius || 72));
  const damage = Math.max(1, Number(chainDamage || 1));
  const boss = typeof getActiveBoss === "function" ? getActiveBoss() : null;

  const hitEnemyIds = new Set();
  const usedPoints = [{ x: sourceMine.x, y: sourceMine.y }];

  for (let step = 0; step < chainCount; step++) {
    let bestEnemy = null;
    let bestFrom = null;
    let bestDist = Infinity;

    for (const from of usedPoints) {
      for (const e of STATE.enemies || []) {
        if (!e || e.dead) continue;
        if (hitEnemyIds.has(e.id)) continue;

        const d = dist(from.x, from.y, e.x, e.y);
        if (d <= radius && d < bestDist) {
          bestDist = d;
          bestEnemy = e;
          bestFrom = from;
        }
      }
    }

    if (!bestEnemy) break;

    // 連鎖ライン演出
    STATE.effects.push({
      x: (bestFrom.x + bestEnemy.x) * 0.5,
      y: (bestFrom.y + bestEnemy.y) * 0.5,
      r: Math.max(10, bestDist * 0.22),
      color: "#ffd166",
      life: 0.12,
      fillAlpha: 0.08
    });

    // 着弾地点の小爆発
    STATE.effects.push({
      x: bestEnemy.x,
      y: bestEnemy.y,
      r: Math.max(24, radius * 0.42),
      color: "#ffb347",
      life: 0.20,
      fillAlpha: 0.16
    });

    // ボススイッチにも反応
    for (const sw of STATE.bossSwitches || []) {
      if (!sw || sw.dead) continue;
      if (dist(bestEnemy.x, bestEnemy.y, sw.x, sw.y) <= Math.max(24, radius * 0.42) + sw.r) {
        if (typeof destroyBossSwitch === "function") {
          destroyBossSwitch(sw, boss);
        }
      }
    }

    damageEnemy(bestEnemy, damage);
    hitEnemyIds.add(bestEnemy.id);
    usedPoints.push({ x: bestEnemy.x, y: bestEnemy.y });
  }
}

function updateFieldBullet(b, dt) {
  b.tickTimer -= dt;
  if (b.tickTimer <= 0) {
    b.tickTimer = 0.12;
    for (const e of STATE.enemies) {
      if (dist(b.x, b.y, e.x, e.y) <= b.radius + e.r) {
        damageEnemy(e, b.damage);
        if ((b.chainJumps || 0) > 0) {
          chainLightning(e, b.damage * 0.5, b.chainJumps, b.chainRange || 140);
        }
      }
    }
  }

  if ((b.fieldWaves || 0) > 0) {
    b.waveCooldown -= dt;
    if (b.waveCooldown <= 0) {
      b.waveCooldown = 0.26;
      for (let i = 0; i < b.fieldWaves; i++) {
        const ang = (Math.PI * 2 * i) / b.fieldWaves;
        spawnBullet({
          x: b.x,
          y: b.y,
          vx: Math.cos(ang) * 260 * (STATE.player?.stats?.projectileSpeedMul || 1),
          vy: Math.sin(ang) * 260 * (STATE.player?.stats?.projectileSpeedMul || 1),
          life: 0.9,
          radius: 5,
          damage: b.damage * 0.9,
          pierce: 2,
          weaponId: b.weaponId,
          weaponPattern: b.weaponPattern,
          weaponStage: b.weaponStage || 0,
    weaponLevel: b.weaponLevel || 1,
          weaponLevel: b.weaponLevel || 1,
          type: 'projectile',
          color: '#b692ff'
        });
      }
    }
  }
}

function updateBeamBullet(b, dt) {
  const p = STATE.player;
  if (!p) return;

  if (b.seekStrength > 0) {
    let target = STATE.enemies.find(e => e.id === b.targetId);

    if (!target) {
      target = getNearestEnemy(p.x, p.y, (b.length || 220) * 1.15);
      if (target) b.targetId = target.id;
    }

    if (target) {
      const desired = angle(p.x, p.y, target.x, target.y);
      const current = Math.atan2(b.vy, b.vx);
      let diff = desired - current;

      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const newAngle = current + clamp(diff, -b.seekStrength * dt, b.seekStrength * dt);
      b.vx = Math.cos(newAngle);
      b.vy = Math.sin(newAngle);
    }
  }

  const maxLen = b.length || 220;
  const x2 = p.x + b.vx * maxLen;
  const y2 = p.y + b.vy * maxLen;

  for (const e of STATE.enemies) {
    const t = clamp((((e.x - p.x) * (x2 - p.x)) + ((e.y - p.y) * (y2 - p.y))) / Math.max(1, (maxLen * maxLen)), 0, 1);
    const px = p.x + (x2 - p.x) * t;
    const py = p.y + (y2 - p.y) * t;
    if (dist(px, py, e.x, e.y) <= e.r + b.radius) {
      damageEnemy(e, b.damage * dt * 8.5);
    }
  }
}

function updateDroneBullet(b, dt) {
  const p = STATE.player;
  if (!p) {
    b.life = 0;
    return;
  }
  const count = Math.max(1, b.droneCount || 1);
  const radius = b.orbitRadius || 84;
  b.orbitAngle += dt * (1.5 + count * 0.12);

  const slotAngle = b.orbitAngle + (Math.PI * 2 * (b.droneIndex || 0)) / count;
  const bob = Math.sin(STATE.time * 4 + (b.droneIndex || 0)) * 8;
  b.x = p.x + Math.cos(slotAngle) * (radius + bob);
  b.y = p.y + Math.sin(slotAngle) * (radius + bob * 0.45);

  b.shotTimer -= dt;
  if (b.shotTimer > 0) return;

  const target = getNearestEnemy(b.x, b.y, 320);
  if (!target) {
    b.shotTimer = 0.2;
    return;
  }

  const ang = angle(b.x, b.y, target.x, target.y);
  spawnBullet({
    x: b.x, y: b.y,
    vx: Math.cos(ang) * 300 * (STATE.player?.stats?.projectileSpeedMul || 1),
    vy: Math.sin(ang) * 300 * (STATE.player?.stats?.projectileSpeedMul || 1),
    life: 1.25, radius: 4, damage: b.damage,
    pierce: b.weaponPattern === "drone_bay_ex" ? 2 : 1,
    weaponId: b.weaponId, weaponPattern: b.weaponPattern, weaponStage: b.weaponStage || 0,
    type: "projectile", color: b.weaponPattern === "drone_bay_ex" ? "#fff0c7" : "#ffd6a6"
  });

  b.shotTimer = b.shotInterval || 0.6;
}

function chainLightning(startEnemy, damage, jumps, maxRange = 140) {
  let current = startEnemy;
  const hitIds = new Set([startEnemy.id]);

  for (let i = 0; i < jumps; i++) {
    let next = null;
    let best = Infinity;
    for (const e of STATE.enemies) {
      if (hitIds.has(e.id)) continue;
      const d = dist(current.x, current.y, e.x, e.y);
      if (d < best && d <= maxRange) {
        best = d;
        next = e;
      }
    }
    if (!next) break;
    damageEnemy(next, damage);
    STATE.effects.push({ x: (current.x + next.x) * 0.5, y: (current.y + next.y) * 0.5, r: 14, color: '#b692ff', life: 0.12 });
    hitIds.add(next.id);
    current = next;
  }
}

function updateEffects(dt) {
  const next = [];
  for (const ef of STATE.effects) {
    ef.life -= dt;
    if (ef.life > 0) next.push(ef);
  }
  STATE.effects = next;
}

function renderBullets(ctx) {
  const cam = STATE.camera;
  for (const b of STATE.bullets) {
    if (b.type === "beam") {
      renderBeam(ctx, b, cam);
      continue;
    }
    if (b.type === "field") {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x - cam.x, b.y - cam.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (b.type === "drone") {
      const x = b.x - cam.x;
      const y = b.y - cam.y;
      ctx.save();
      const px = STATE.player ? STATE.player.x - cam.x : x;
      const py = STATE.player ? STATE.player.y - cam.y : y;
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(y - py, x - px) + Math.PI * 0.5);
      ctx.fillStyle = b.color || "#ffc18a";
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (b.type === "mine") {
      renderMineBullet(ctx, b, cam);
      continue;
    }
    ctx.save();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  renderEffects(ctx);
  renderOrbitWeapons(ctx);
}

function renderMineBullet(ctx, b, cam) {
  const x = b.x - cam.x;
  const y = b.y - cam.y;
  ctx.save();
  const warnRadius = b.warningRadius || b.explodeRadius || 0;
  const totalFuse = 3.0;
  const fuseRatio = clamp(1 - (b.life / totalFuse), 0, 1);
  if (warnRadius > 0) {
    const pulse = 0.68 + Math.sin(STATE.time * (5 + fuseRatio * 8) + b.x * 0.01) * (0.12 + fuseRatio * 0.08);
    ctx.globalAlpha = (b.armDelay > 0 ? 0.12 : 0.16 + fuseRatio * 0.16) * pulse;
    ctx.fillStyle = b.armDelay > 0 ? '#fff2ba' : '#ffca68';
    ctx.beginPath();
    ctx.arc(x, y, warnRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.82 + fuseRatio * 0.18;
    ctx.strokeStyle = b.armDelay > 0 ? '#fff0b3' : '#ffcf70';
    ctx.lineWidth = 2.5 + fuseRatio * 1.4;
    ctx.setLineDash([12 - fuseRatio * 4, 10 - fuseRatio * 3]);
    ctx.beginPath();
    ctx.arc(x, y, warnRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const innerWarn = Math.max(16, warnRadius * (0.18 + fuseRatio * 0.72));
    ctx.globalAlpha = 0.16 + fuseRatio * 0.16;
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(x, y, innerWarn, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5b3b00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
  ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
  ctx.stroke();
  const corePulse = 0.45 + Math.sin(STATE.time * 10 + b.y * 0.02) * 0.2;
  ctx.globalAlpha = 0.65 + corePulse * 0.3;
  ctx.fillStyle = '#fff5d6';
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderBeam(ctx, b, cam) {
  const p = STATE.player;
  const x1 = p.x - cam.x;
  const y1 = p.y - cam.y;
  const x2 = x1 + b.vx * (b.length || 220);
  const y2 = y1 + b.vy * (b.length || 220);
  ctx.save();
  ctx.strokeStyle = b.color;
  ctx.lineWidth = b.radius * 2;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function renderEffects(ctx) {
  const cam = STATE.camera;
  for (const ef of STATE.effects) {
    ctx.save();
    const alpha = clamp(ef.life * 4, 0, 0.7);
    if (ef.fillAlpha) {
      ctx.globalAlpha = Math.min(alpha, ef.fillAlpha);
      ctx.fillStyle = ef.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(ef.x - cam.x, ef.y - cam.y, ef.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ef.color || '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ef.x - cam.x, ef.y - cam.y, ef.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function renderOrbitWeapons(ctx) {
  const p = STATE.player;
  if (!p) return;
  const cam = STATE.camera;
  for (const w of p.weapons) {
    if (w.id !== 'water_cutter') continue;
    const pattern = getWeaponCurrentPattern(w);
    const count = pattern === 'orbit_ex' ? 4 : pattern === 'orbit' ? 3 : pattern === 'tidal_ring_ex' ? 5 : pattern === 'tidal_ring' ? 4 : 1;
    const orbitRadius = (pattern === 'orbit_ex' ? 98 : pattern === 'orbit' ? 86 : pattern === 'tidal_ring_ex' ? 118 : pattern === 'tidal_ring' ? 102 : 62) * p.stats.areaMul;
    for (let i = 0; i < count; i++) {
      const ang = w.orbitAngle + (Math.PI * 2 / count) * i;
      const x = p.x + Math.cos(ang) * orbitRadius - cam.x;
      const y = p.y + Math.sin(ang) * orbitRadius - cam.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + Math.PI * 0.5);
      ctx.fillStyle = pattern && pattern.startsWith('tidal') ? '#92eaff' : '#7cf7ff';
      ctx.fillRect(-5, -16, 10, 32);
      ctx.restore();
    }
  }
}
