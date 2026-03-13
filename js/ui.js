// ===============================
// UI
// ===============================

function getEl(id) {
  return document.getElementById(id);
}

function showScreen(id) {
  hideAllScreens();
  if (!id) return;
  const el = getEl(id);
  if (el) el.classList.add("active");
}

function hideScreen(id) {
  const el = getEl(id);
  if (el) el.classList.remove("active");
}

function hideAllScreens() {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
}

function isScreenVisible(id) {
  const el = getEl(id);
  return !!el && el.classList.contains("active");
}

function toggleUiMode() {
  STATE.uiSimple = !STATE.uiSimple;
  applyUiMode();
  updateHUD();
}

function applyUiMode() {
  const hud = getEl("hud");
  const btn = getEl("toggleUIBtn");
  if (!hud) return;

  if (STATE.uiSimple) {
    hud.classList.remove("detailUI");
    hud.classList.add("simpleUI");
    if (btn) btn.textContent = "詳細UI";
  } else {
    hud.classList.remove("simpleUI");
    hud.classList.add("detailUI");
    if (btn) btn.textContent = "簡易表示";
  }
}

function applyTitleTextToUI() {
  const titleMain = getEl("titleMain");
  if (titleMain) titleMain.textContent = STATE.gameData?.title || "Ocean Survivor";
}

function getWeaponStageLabel(w) {
  if (!w) return "";
  const stage = w.evolutionStage || 0;
  if (stage === 0) return `Lv.${w.level}`;
  if (stage === 1) return `進化 Lv.${w.level}`;
  return `第2進化 Lv.${w.level}`;
}

function getWeaponStageLabelShort(w) {
  if (!w) return "";
  const stage = w.evolutionStage || 0;
  if (stage === 0) return `Lv${w.level}`;
  if (stage === 1) return `E1-${w.level}`;
  return `E2-${w.level}`;
}

function getWeaponGrowthBranches(def) {
  if (!def) return [];
  if (Array.isArray(def.evolutions) && def.evolutions.length > 0) return def.evolutions;
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

function getGrowthScreenDescription(def) {
  return def?.growthDesc || "通常武器から分岐進化し、さらに第2進化へ派生します。";
}

function getPassiveNameFromId(id) {
  return (STATE.gameData?.passives || []).find(p => p.id === id)?.name || id || "なし";
}

function buildEvolutionHintText(def, inst = null) {
  const branches = getWeaponGrowthBranches(def);
  if (!branches.length) return "";

  const stage = inst?.evolutionStage || 0;
  const prefix = stage >= 1 ? "第2進化ヒント" : "進化ヒント";

  if (stage >= 1 && inst?.branchId) {
    const branch = branches.find((b) => b.branchId === inst.branchId);
    const second = branch?.secondStage;
    if (!second) return `${prefix}: Lv6 + 宝箱`;
    return `${prefix}: Lv6 + ${getPassiveNameFromId(second.needsPassive)} + 宝箱`;
  }

  const names = branches.map((b) => getPassiveNameFromId(b.needsPassive)).filter(Boolean);
  const uniq = [...new Set(names)];
  return `${prefix}: Lv6 + ${uniq.join(" / ")} + 宝箱`;
}

function buildWeaponChoiceHint(def, inst = null) {
  if (!def) return "";
  const hint = buildEvolutionHintText(def, inst);
  return hint ? ` / ${hint}` : "";
}


function getWeaponFeelText(def) {
  return def?.feel || "扱いやすさや役割の説明はまだ設定されていません。";
}

function buildWeaponSynergyHtml(def) {
  const synergies = Array.isArray(def?.synergies) ? def.synergies : [];
  if (synergies.length === 0) {
    return `<div class="growthMetaBlock"><div class="growthMetaTitle">相性</div><div class="choiceDesc">特筆するシナジーはまだ設定されていません。</div></div>`;
  }
  return `
    <div class="growthMetaBlock">
      <div class="growthMetaTitle">相性・シナジー</div>
      <div class="synergyList">
        ${synergies.map((s) => `
          <div class="synergyChip">
            <div class="synergyChipName">${getPassiveNameFromId(s.passiveId)}</div>
            <div class="synergyChipText">${s.effect || ""}</div>
          </div>`).join("")}
      </div>
    </div>`;
}


function buildGrowthNodeHtml(title, name, meta1, meta2, active, extraClass = "") {
  const lines = [meta1, meta2].filter(Boolean).map((line) => `<div class="growthNodeMeta">${line}</div>`).join("");
  return `
    <div class="growthNode ${extraClass} ${active ? "active" : ""}">
      <div class="growthNodeTitle">${title}</div>
      <div class="growthNodeName">${name}</div>
      ${lines}
    </div>`;
}


function buildWeaponGrowthTreeHtml(weaponId, includeHeader = true) {
  const def = getWeaponDef(weaponId);
  if (!def) return "";

  const inst = getWeaponInstance(weaponId);
  const branches = getWeaponGrowthBranches(def);
  const rootActive = !!inst && (inst.evolutionStage || 0) === 0;

  let html = `<div class="growthTree">`;

  
if (includeHeader) {
  html += `
    <div class="growthTreeHeader">
      <div class="choiceTitle">${def.name}</div>
      <div class="choiceDesc">${getGrowthScreenDescription(def)}</div>
      <div class="growthFeelText">触り心地: ${getWeaponFeelText(def)}</div>
      ${buildWeaponSynergyHtml(def)}
    </div>`;
}


  html += `
    <div class="growthTreeCanvas">
      <div class="growthCenterLine"></div>
      <div class="growthRootWrap">
        ${buildGrowthNodeHtml("通常", def.name, "Lv1 → Lv6", def.desc || "", rootActive, "growthRoot")}
      </div>
      <div class="growthBranchesWrap">`;

  if (branches.length === 0) {
    html += `<div class="growthEmpty">この武器には進化先がまだ設定されていません。</div>`;
  }

  for (const branch of branches) {
    const branchMatch = !inst?.branchId || inst.branchId === branch.branchId;
    const stage1Active = !!inst && (inst.evolutionStage || 0) >= 1 && branchMatch;
    const stage2Active = !!inst && (inst.evolutionStage || 0) >= 2 && branchMatch;
    const second = branch.secondStage || null;

    html += `
      <div class="growthBranchColumn">
        <div class="growthBranchConnector"></div>
        ${buildGrowthNodeHtml("第1進化", branch.name || "進化", `条件: ${getPassiveNameFromId(branch.needsPassive)}`, `型: ${branch.pattern || "standard"} / Lv1 → Lv6`, stage1Active, "growthStage1")}`;

    if (second) {
      html += `
        <div class="growthChildConnector"></div>
        ${buildGrowthNodeHtml("第2進化", second.name || "第2進化", `条件: ${getPassiveNameFromId(second.needsPassive)}`, `型: ${second.pattern || branch.pattern || "standard"} / Lv1 → Lv3`, stage2Active, "growthStage2")}`;
    }

    html += `</div>`;
  }

  html += `
      </div>
    </div>
  </div>`;

  return html;
}

function openWeaponGrowth(weaponId) {
  const content = getEl("weaponGrowthContent");
  const def = getWeaponDef(weaponId);
  if (!content || !def) return;
  if (isScreenVisible("weaponGrowthScreen") && STATE._weaponGrowthWeaponId === weaponId) return;

  STATE._weaponGrowthPrevPaused = !!STATE.paused;
  STATE._weaponGrowthWeaponId = weaponId;
  STATE.paused = true;
  content.innerHTML = buildWeaponGrowthTreeHtml(weaponId, true);
  showScreen("weaponGrowthScreen");
}

function closeWeaponGrowth() {
  hideScreen("weaponGrowthScreen");
  STATE.paused = !!STATE._weaponGrowthPrevPaused;
  STATE._weaponGrowthWeaponId = null;
}

function getEnemyAiLabel(type) {
  const map = {
    normal: "ノーマル",
    slow: "スロー",
    tank: "タンク",
    rush: "ラッシュ",
    dash: "突進",
    orbit: "周回",
    weave: "蛇行",
    boss_weave: "ボス蛇行",
    boss_dash: "ボス突進"
  };
  return map[type] || type || "なし";
}

function getAttackTypeLabel(type) {
  const map = {
    shot: "単発弾",
    spread: "扇状弾",
    line_burst: "連射",
    pulse: "範囲衝撃",
    ring: "全周弾",
    summon: "召喚"
  };
  return map[type] || type || "攻撃";
}


function getUnknownLabel() {
  return "？";
}

function getWeaponDisplayName(def) {
  return isWeaponSeen(def?.id) ? (def?.name || getUnknownLabel()) : getUnknownLabel();
}

function getEnemyDisplayName(id, def) {
  return isEnemyDefeated(id) ? (def?.name || id) : getUnknownLabel();
}

function drawLockedIconToCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  ctx.fillStyle = "#d9f7ff";
  ctx.font = `bold ${Math.floor(canvas.height * 0.58)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("？", canvas.width / 2, canvas.height / 2 + 1);
}

function buildWeaponSelectCardHtml(w, unlocked) {
  const title = unlocked ? w.name : getUnknownLabel();
  const desc = unlocked ? (w.desc || "") : "一度入手すると解放されます";
  const meta = unlocked ? "初期武器" : "未解放";
  return `
    <div class="weaponSelectCardInner">
      <canvas class="weaponSelectIcon" data-weapon-select-icon="${w.iconIndex || 0}" width="56" height="56"></canvas>
      <div class="weaponSelectText">
        <div class="choiceTitle">${title}</div>
        <div class="choiceDesc">${desc}</div>
        <div class="choiceMeta">${meta}</div>
      </div>
    </div>`;
}
function renderWeaponCodex() {
  const wrap = getEl("weaponCodexList");
  if (!wrap) return;

  const weapons = STATE.gameData?.weapons || [];
  wrap.innerHTML = weapons.map((w) => {
    const seen = isWeaponSeen(w.id);
    const icon = `<canvas class="codexIcon ${seen ? "" : "locked"}" data-weapon-icon="${w.iconIndex || 0}" width="56" height="56"></canvas>`;
    return `
      <div class="codexCard ${seen ? "" : "lockedCard"}">
        <div class="codexHeader">
          ${icon}
          <div class="codexHeadText">
            <div class="choiceTitle">${seen ? w.name : getUnknownLabel()}</div>
            <div class="choiceDesc">${seen ? (w.desc || "") : "一度も使用していない武器"}</div>
            <div class="choiceMeta">${seen ? `威力 ${w.damage} / CD ${w.cooldown}` : "未確認"}</div>
          </div>
        </div>
        ${seen ? `<div class="choiceDesc">触り心地: ${getWeaponFeelText(w)}</div>${buildWeaponSynergyHtml(w)}${buildWeaponGrowthTreeHtml(w.id, false)}` : `<div class="growthEmpty">この武器はまだ記録されていません。</div>`}
      </div>`;
  }).join("");

  wrap.querySelectorAll("canvas[data-weapon-icon]").forEach((canvas) => {
    if (canvas.classList.contains("locked")) {
      drawLockedIconToCanvas(canvas);
      return;
    }
    drawWeaponIconToCanvas(canvas, Number(canvas.dataset.weaponIcon || 0));
  });
}

function openWeaponCodex() {
  renderWeaponCodex();
  showScreen("weaponCodexScreen");
}

function renderEnemyCodex() {
  const wrap = getEl("enemyCodexList");
  if (!wrap) return;

  const entries = Object.entries(STATE.gameData?.enemyStats || {});
  wrap.innerHTML = entries.map(([id, def]) => {
    const defeated = isEnemyDefeated(id);
    const ai = def.ai || {};
    const attacks = Array.isArray(def.attacks) ? def.attacks : [];
    return `
      <div class="codexCard ${defeated ? "" : "lockedCard"}">
        <div class="codexHeader">
          <canvas class="codexIcon ${defeated ? "" : "locked"}" data-enemy-icon="${def.spriteIndex || 0}" width="56" height="56"></canvas>
          <div class="codexHeadText">
            <div class="choiceTitle">${getEnemyDisplayName(id, def)}</div>
            <div class="choiceMeta">${defeated ? `HP ${def.hp} / 速度 ${def.speed} / 接触 ${def.damage}` : "未確認"}</div>
            <div class="choiceDesc">${defeated ? `AI: ${getEnemyAiLabel(ai.type)}${ai.preferRange ? ` / 間合い ${ai.preferRange}` : ""}` : "一度も倒していない敵"}</div>
          </div>
        </div>
        <div class="codexAttackList">
          ${!defeated ? `<div class="choiceDesc">撃破後に詳細が記録されます</div>` : attacks.length === 0 ? `<div class="choiceDesc">特殊攻撃なし</div>` : attacks.map((atk) => `
            <div class="codexAttackRow">
              <div class="codexAttackName">${getAttackTypeLabel(atk.type)}</div>
              <div class="codexAttackMeta">CD ${atk.cooldown || "-"} / 射程 ${atk.triggerRange || "-"}</div>
            </div>`).join("")}
        </div>
      </div>`;
  }).join("");

  wrap.querySelectorAll("canvas[data-enemy-icon]").forEach((canvas) => {
    if (canvas.classList.contains("locked")) {
      drawLockedIconToCanvas(canvas);
      return;
    }
    const index = Number(canvas.dataset.enemyIcon || 0);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ok = drawSpriteFrame(ctx, "enemies", index, 0, 0, canvas.width, canvas.height);
    if (!ok) {
      ctx.fillStyle = "#ffcc88";
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function openEnemyCodex() {
  renderEnemyCodex();
  showScreen("enemyCodexScreen");
}

function closeCodexToTitle() {
  showScreen("titleScreen");
}

function setupUI() {
  applyTitleTextToUI();
  applyUiMode();

  const startBtn = getEl("startBtn");
  if (startBtn) {
    startBtn.onclick = () => {
      if (hasSeenFirstTutorial()) {
        showScreen("weaponSelectScreen");
        renderWeaponSelect();
      } else {
        showScreen("firstTutorialScreen");
      }
    };
  }

  const rankingBtn = getEl("rankingBtn");
  if (rankingBtn) {
    rankingBtn.onclick = () => {
      showScreen("rankingScreen");
      renderRanking("rankingList");
    };
  }

  const weaponCodexBtn = getEl("weaponCodexBtn");
  if (weaponCodexBtn) weaponCodexBtn.onclick = () => openWeaponCodex();

  const enemyCodexBtn = getEl("enemyCodexBtn");
  if (enemyCodexBtn) enemyCodexBtn.onclick = () => openEnemyCodex();

  const rankingBackBtn = getEl("rankingBackBtn");
  if (rankingBackBtn) rankingBackBtn.onclick = () => showScreen("titleScreen");

  const firstTutorialStartBtn = getEl("firstTutorialStartBtn");
  if (firstTutorialStartBtn) {
    firstTutorialStartBtn.onclick = () => {
      markFirstTutorialSeen();
      showScreen("weaponSelectScreen");
      renderWeaponSelect();
    };
  }

  const weaponCodexBackBtn = getEl("weaponCodexBackBtn");
  if (weaponCodexBackBtn) weaponCodexBackBtn.onclick = () => closeCodexToTitle();

  const enemyCodexBackBtn = getEl("enemyCodexBackBtn");
  if (enemyCodexBackBtn) enemyCodexBackBtn.onclick = () => closeCodexToTitle();

  const resultToTitleBtn = getEl("resultToTitleBtn");
  if (resultToTitleBtn) {
    resultToTitleBtn.onclick = () => {
      STATE.paused = true;
      STATE.shopOpen = false;
      STATE.player = null;
      hideAllScreens();
      showScreen("titleScreen");
      renderRanking("rankingList");
    };
  }

  const closeShopBtn = getEl("closeShopBtn");
  if (closeShopBtn) closeShopBtn.onclick = () => closeShop();

  const toggleUIBtn = getEl("toggleUIBtn");
  if (toggleUIBtn) toggleUIBtn.onclick = () => toggleUiMode();

  const absorbXPBtn = getEl("absorbXPBtn");
  if (absorbXPBtn) {
    absorbXPBtn.onclick = () => {
      absorbAllXP();
      updateHUD();
    };
  }

  const levelUpRerollBtn = getEl("levelUpRerollBtn");
  if (levelUpRerollBtn) levelUpRerollBtn.onclick = () => useRerollTicket();

  const weaponGrowthBackBtn = getEl("weaponGrowthBackBtn");
  if (weaponGrowthBackBtn) weaponGrowthBackBtn.onclick = () => closeWeaponGrowth();

  const chestEvolutionCloseBtn = getEl("chestEvolutionCloseBtn");
  if (chestEvolutionCloseBtn) chestEvolutionCloseBtn.onclick = () => closeChestEvolutionScreen();

  const weaponDetailList = getEl("weaponDetailList");
  if (weaponDetailList) {
    weaponDetailList.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-open-growth]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      openWeaponGrowth(btn.dataset.weaponId);
    });
  }
}

function updateHUD() {
  const p = STATE.player;
  if (!p) return;

  const hpText = getEl("hpText");
  const hpBar = getEl("hpBar");
  const xpText = getEl("xpText");
  const waveText = getEl("waveText");
  const goldText = getEl("goldText");
  const scoreText = getEl("scoreText");
  const xpBar = getEl("xpBar");
  const weaponBar = getEl("weaponBar");

  const hpRatio = p.maxHp > 0 ? clamp(p.hp / p.maxHp, 0, 1) : 0;

  if (hpBar) {
    hpBar.style.width = `${hpRatio * 100}%`;
    hpBar.style.background = hpRatio <= 0.3
      ? "linear-gradient(90deg, #ff5757, #ff9a9a)"
      : "linear-gradient(90deg, #3cff93, #9fffbe)";
  }

  if (hpText) {
    hpText.textContent = `HP ${Math.ceil(p.hp)} / ${p.maxHp}`;
    if (hpRatio <= 0.3) hpText.classList.add("hpLow");
    else hpText.classList.remove("hpLow");
  }

  if (xpText) xpText.textContent = `Lv ${p.level}`;
  if (waveText) waveText.textContent = `Wave ${STATE.currentWave}`;
  if (goldText) goldText.textContent = `Gold ${Math.floor(p.gold)}`;
  if (scoreText) {
    const chain = STATE.scoreState?.killChainCount || 0;
    const noDamage = Math.floor(STATE.scoreState?.noDamageTimer || 0);
    scoreText.textContent = `Score ${Math.floor(STATE.score)}${chain >= 2 ? ` / Chain ${chain}` : ""}${noDamage >= 10 ? ` / ND ${noDamage}s` : ""}`;
    scoreText.classList.toggle("scoreBonusGlow", !!(STATE.scoreState?.popupTimer > 0));
  }

  if (xpBar) {
    const need = requiredXP(p.level);
    const ratio = need > 0 ? clamp(p.xp / need, 0, 1) : 0;
    xpBar.style.width = `${ratio * 100}%`;
  }

  if (weaponBar) renderWeaponBar(weaponBar);
  renderDetailLists();
  updateBossHud();
}

function updateBossHud() {
  const warningEl = getEl("bossWarningText");
  const wrap = getEl("bossBarWrap");
  const nameEl = getEl("bossBarName");
  const bar = getEl("bossBar");
  const boss = typeof getActiveBoss === "function" ? getActiveBoss() : null;
  const be = STATE.bossEvent || {};

  if (warningEl) {
    const showWarning = be.warningTimer > 0 && be.warningText;
    warningEl.style.display = showWarning ? "block" : "none";
    warningEl.textContent = showWarning ? `WARNING  ${be.warningText}` : "";
    warningEl.style.opacity = showWarning ? String(0.7 + Math.sin(STATE.time * 10) * 0.25) : "0";
  }

  if (wrap) wrap.style.display = boss ? "block" : "none";
  if (boss && nameEl && bar) {
    nameEl.textContent = be.bossName || getEnemyDef(boss.typeId)?.name || "BOSS";
    bar.style.width = `${clamp(boss.hp / Math.max(1, boss.maxHp), 0, 1) * 100}%`;
  }
}

function openChestEvolutionScreen(choices) {
  const wrap = getEl("chestEvolutionChoices");
  if (!wrap) return false;

  wrap.innerHTML = "";
  STATE.paused = true;
  STATE._chestEvolutionChoices = choices || [];

  for (const evo of STATE._chestEvolutionChoices) {
    const weaponDef = getWeaponDef(evo.weaponId);
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.innerHTML = `
      <div class="choiceTitle">${evo.evolutionName}</div>
      <div class="choiceDesc">${weaponDef?.name || evo.weaponId} の${evo.type === "second" ? "第2段" : "分岐"}進化</div>
      <div class="choiceMeta">条件: ${evo.needPassive || "なし"}</div>
    `;
    btn.onclick = () => {
      if (!applyEvolutionChoice(evo)) return;
      STATE.score += evo.type === "second" ? 400 : 250;
      closeChestEvolutionScreen();
      updateHUD();
    };
    wrap.appendChild(btn);
  }

  showScreen("chestEvolutionScreen");
  return true;
}

function closeChestEvolutionScreen() {
  hideScreen("chestEvolutionScreen");
  STATE.paused = false;
  STATE._chestEvolutionChoices = [];
  updateHUD();
}

function renderWeaponBar(container) {
  const p = STATE.player;
  if (!p || !container) return;

  container.innerHTML = "";

  for (const w of p.weapons) {
    const def = getWeaponDef(w.id);
    const chip = document.createElement("div");
    chip.className = "weaponChip";

    const iconCanvas = document.createElement("canvas");
    iconCanvas.width = 56;
    iconCanvas.height = 56;
    chip.appendChild(iconCanvas);

    drawWeaponIconToCanvas(iconCanvas, def?.iconIndex || 0);

    const lv = document.createElement("div");
    lv.className = "weaponLv";
    lv.textContent = getWeaponStageLabelShort(w);
    chip.appendChild(lv);

    container.appendChild(chip);
  }
}

function renderDetailLists() {
  const p = STATE.player;
  if (!p) return;

  const weaponDetailList = getEl("weaponDetailList");
  const passiveDetailList = getEl("passiveDetailList");
  const weaponSignature = JSON.stringify((p.weapons || []).map((w) => [w.id, w.level, w.evolutionStage || 0, w.branchId || ""]));
  const passiveSignature = JSON.stringify({
    passives: p.passives || [],
    levels: p.passiveLevels || {},
    rerolls: p.rerollTickets || 0
  });

  if (weaponDetailList && weaponDetailList.dataset.signature !== weaponSignature) {
    weaponDetailList.dataset.signature = weaponSignature;
    weaponDetailList.innerHTML = (p.weapons || []).map((w) => {
      const def = getWeaponDef(w.id);
      return `
        <div class="detailEntryBlock">
          <div class="detailEntry">
            <div class="detailName">${def?.name || w.id}</div>
            <div class="detailValue">
              <span>${getWeaponStageLabel(w)}</span>
              <button class="miniBtn" type="button" data-open-growth="1" data-weapon-id="${w.id}">成長表</button>
            </div>
          </div>
          <div class="detailSub detailSubAccent">${buildEvolutionHintText(def, w)}</div>
        </div>`;
    }).join("");
  }

  if (passiveDetailList && passiveDetailList.dataset.signature !== passiveSignature) {
    passiveDetailList.dataset.signature = passiveSignature;
    const passiveHtml = (p.passives || []).map((passiveId) => {
      const def = (STATE.gameData?.passives || []).find(x => x.id === passiveId);
      const lv = p.passiveLevels[passiveId] || 0;
      return `
        <div class="detailEntry">
          <div class="detailName">${def?.name || passiveId}</div>
          <div class="detailValue">Lv${lv}</div>
        </div>`;
    }).join("");

    passiveDetailList.innerHTML = `${passiveHtml}
      <div class="detailEntry">
        <div class="detailName">リロール券</div>
        <div class="detailValue">${p.rerollTickets || 0}枚</div>
      </div>`;
  }
}

function renderWeaponSelect() {
  const list = getEl("weaponSelectList");
  if (!list) return;

  const weapons = STATE.gameData?.weapons || [];
  list.innerHTML = "";

  for (const w of weapons) {
    const unlocked = isWeaponUnlocked(w.id);
    const btn = document.createElement("button");
    btn.className = `choiceBtn weaponSelectBtn ${unlocked ? "" : "lockedChoice"}`;
    btn.innerHTML = buildWeaponSelectCardHtml(w, unlocked);
    btn.disabled = !unlocked;
    btn.onclick = () => {
      if (!unlocked) return;
      startGame(w.id);
    };
    list.appendChild(btn);
  }

  list.querySelectorAll("canvas[data-weapon-select-icon]").forEach((canvas) => {
    const btn = canvas.closest("button");
    if (btn && btn.disabled) {
      drawLockedIconToCanvas(canvas);
      return;
    }
    drawWeaponIconToCanvas(canvas, Number(canvas.dataset.weaponSelectIcon || 0));
  });
}

function buildLevelUpChoices() {
  const choices = [];

  const weaponCandidates = (STATE.gameData?.weapons || []).filter(w => canAddWeapon(w.id));
  const passiveCandidates = (STATE.gameData?.passives || []).filter(p => canLevelPassive(p.id));

  shuffle(weaponCandidates);
  shuffle(passiveCandidates);

  for (const w of weaponCandidates.slice(0, 6)) {
    const inst = getWeaponInstance(w.id);
    const nextLv = inst ? inst.level + 1 : 1;

    choices.push({
      type: "weapon",
      key: `weapon_${w.id}`,
      name: w.name,
      desc: inst ? `武器レベルを ${nextLv} に強化` : w.desc,
      meta: `${inst ? `Lv${inst.level} → Lv${nextLv}` : "新規武器"}${buildWeaponChoiceHint(w, inst)}`,
      apply() {
        return addWeapon(w.id);
      }
    });
  }

  for (const p of passiveCandidates.slice(0, 6)) {
    const lv = getPassiveLevel(p.id);
    const levelDesc = Array.isArray(p.levelDesc) ? (p.levelDesc[lv] || p.effectDesc || p.desc || "") : (p.effectDesc || p.desc || "");

    choices.push({
      type: "passive",
      key: `passive_${p.id}`,
      name: p.name,
      desc: levelDesc,
      meta: `Lv${lv} → Lv${lv + 1}`,
      apply() {
        return addPassive(p.id);
      }
    });
  }

  shuffle(choices);

  if (choices.length === 0) {
    choices.push({
      type: "gold",
      key: "gold_fallback",
      name: "ゴールド補給",
      desc: "候補がないためゴールドを獲得",
      meta: "+30 Gold",
      apply() {
        addGold(30);
        return true;
      }
    });
  }

  return choices.slice(0, 3);
}

function renderLevelUpChoices() {
  const wrap = getEl("levelUpChoices");
  if (!wrap) return;

  wrap.innerHTML = "";
  const choices = buildLevelUpChoices();
  STATE._levelUpChoices = choices;

  for (const c of choices) {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.innerHTML = `
      <div class="choiceTitle">${c.name}</div>
      <div class="choiceDesc">${c.desc || ""}</div>
      <div class="choiceMeta">${c.meta || ""}</div>
    `;
    btn.onclick = () => {
      const ok = c.apply();
      if (!ok) return;

      STATE.levelUpQueue = Math.max(0, STATE.levelUpQueue - 1);

      if (STATE.levelUpQueue > 0) {
        renderLevelUpChoices();
      } else {
        closeLevelUp();
      }

      updateHUD();
    };
    wrap.appendChild(btn);
  }

  updateLevelUpRerollButton();
}

function updateLevelUpRerollButton() {
  const btn = getEl("levelUpRerollBtn");
  if (!btn) return;

  const tickets = STATE.player?.rerollTickets || 0;
  btn.textContent = `リロール (${tickets})`;
  btn.disabled = tickets <= 0 || !isScreenVisible("levelUpScreen");
}

function useRerollTicket() {
  const p = STATE.player;
  if (!p) return false;
  if (!isScreenVisible("levelUpScreen")) return false;
  if ((p.rerollTickets || 0) <= 0) return false;

  p.rerollTickets -= 1;
  renderLevelUpChoices();
  updateHUD();
  return true;
}

function openLevelUp() {
  STATE.paused = true;
  showScreen("levelUpScreen");
  renderLevelUpChoices();
}

function closeLevelUp() {
  hideScreen("levelUpScreen");
  STATE.paused = false;
  updateLevelUpRerollButton();
  updateHUD();
}

function showResultScreen(clear, rankingResult) {
  const resultTitle = getEl("resultTitle");
  const resultScore = getEl("resultScore");
  const resultRecord = getEl("resultRecord");

  if (resultTitle) resultTitle.textContent = clear ? "CLEAR" : "GAME OVER";
  if (resultScore) resultScore.textContent = `Score ${Math.floor(STATE.score)}`;
  if (resultRecord) resultRecord.textContent = clear
    ? (rankingResult?.isRecord ? "NEW RECORD!" : "海を生き延びた")
    : "潜水不能";

  renderRanking("resultRanking");
  showScreen("resultScreen");
}
