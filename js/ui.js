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


function getWeaponBalanceStagesForUi(def) {
  return Array.isArray(def?.balance?.stages) ? def.balance.stages : [];
}

function getWeaponStageMaxLevelUi(stage, def = null) {
  if (typeof getStageMaxLevel === 'function') return getStageMaxLevel(stage, def || null);
  const stages = def ? getWeaponBalanceStagesForUi(def) : [];
  const configured = Array.isArray(stages[stage]?.levels) ? stages[stage].levels.length : 0;
  if (configured > 0) return configured;
  return [3, 4, 5][Math.max(0, Math.min(2, stage || 0))] || 3;
}

function getWeaponStageLabelsForUi(def, stage) {
  const stages = getWeaponBalanceStagesForUi(def);
  return Array.isArray(stages[stage]?.levelLabels) ? stages[stage].levelLabels : [];
}

function getWeaponStageLevelLabel(def, stage, level) {
  const labels = getWeaponStageLabelsForUi(def, stage);
  if (labels.length <= 0) return '';
  const idx = Math.max(0, Math.min(labels.length - 1, (level || 1) - 1));
  return labels[idx] || '';
}

function getWeaponStageRangeText(stage, def) {
  return `Lv1 → Lv${getWeaponStageMaxLevelUi(stage, def)}`;
}

function getWeaponStageSummaryText(def, stage) {
  const labels = getWeaponStageLabelsForUi(def, stage);
  if (labels.length <= 0) return '';
  return labels.join(' / ');
}


function getWeaponStageLabel(w) {
  if (!w) return "";
  const stage = w.evolutionStage || 0;
  const def = getWeaponDef(w.id);
  const max = getWeaponStageMaxLevelUi(stage, def);
  if (stage === 0) return `通常 Lv.${w.level}/${max}`;
  if (stage === 1) return `第1進化 Lv.${w.level}/${max}`;
  return `第2進化 Lv.${w.level}/${max}`;
}



function getWeaponStageLabelShort(w) {
  if (!w) return "";
  const stage = w.evolutionStage || 0;
  const def = getWeaponDef(w.id);
  const max = getWeaponStageMaxLevelUi(stage, def);
  if (stage === 0) return `N ${w.level}/${max}`;
  if (stage === 1) return `E1 ${w.level}/${max}`;
  return `E2 ${w.level}/${max}`;
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
  const normalMax = getWeaponStageMaxLevelUi(0, def);
  const evo1Max = getWeaponStageMaxLevelUi(1, def);

  if (stage >= 1 && inst?.branchId) {
    const branch = branches.find((b) => b.branchId === inst.branchId);
    const second = branch?.secondStage;
    if (!second) return `第2進化条件: 第1進化Lv${evo1Max} + 宝箱`;
    return `第2進化条件: 第1進化Lv${evo1Max} + ${getPassiveNameFromId(second.needsPassive)} + 宝箱`;
  }

  const names = branches.map((b) => getPassiveNameFromId(b.needsPassive)).filter(Boolean);
  const uniq = [...new Set(names)];
  return `進化条件: 通常Lv${normalMax} + ${uniq.join(" / ")} + 宝箱`;
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
        ${buildGrowthNodeHtml("通常", def.name, getWeaponStageRangeText(0, def), getWeaponStageSummaryText(def, 0) || def.desc || "", rootActive, "growthRoot")}
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
        ${buildGrowthNodeHtml("第1進化", branch.name || "進化", `条件: ${getPassiveNameFromId(branch.needsPassive)}`, getWeaponStageSummaryText(def, 1) || `型: ${branch.pattern || "standard"} / ${getWeaponStageRangeText(1, def)}`, stage1Active, "growthStage1")}`;

    if (second) {
      html += `
        <div class="growthChildConnector"></div>
        ${buildGrowthNodeHtml("第2進化", second.name || "第2進化", `条件: ${getPassiveNameFromId(second.needsPassive)}`, getWeaponStageSummaryText(def, 2) || `型: ${second.pattern || branch.pattern || "standard"} / ${getWeaponStageRangeText(2, def)}`, stage2Active, "growthStage2")}`;
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
  STATE._weaponGrowthPassiveId = null;
  updateHUD?.();
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

function ensureWeaponSelectStyles() {
  if (document.getElementById("weaponSelectInlineStyle")) return;

  const style = document.createElement("style");
  style.id = "weaponSelectInlineStyle";
  style.textContent = `
    .weaponSelectBtn{
      width:100%;
      text-align:left;
      display:block;
      min-height:0;
      height:auto;
      overflow:hidden;
      padding:12px 12px 14px;
      box-sizing:border-box;
    }

    .weaponSelectCardInner{
      display:grid;
      grid-template-columns:64px minmax(0, 1fr);
      align-items:start;
      gap:12px;
      min-width:0;
    }

    .weaponSelectIcon{
      display:block;
      width:56px;
      height:56px;
      border:1px solid var(--line);
      border-radius:10px;
      background:rgba(0,0,0,0.24);
      image-rendering:pixelated;
      image-rendering:crisp-edges;
      flex:0 0 auto;
    }

    .weaponSelectText{
      display:block;
      min-width:0;
      text-align:left;
    }

    .weaponSelectText .choiceTitle,
    .weaponSelectText .choiceDesc,
    .weaponSelectText .choiceMeta{
      display:block;
      min-width:0;
      white-space:normal;
      overflow-wrap:anywhere;
      word-break:break-word;
    }

    .weaponSelectText .choiceTitle{
      color:var(--text);
      font-weight:700;
      font-size:16px;
      line-height:1.35;
      margin:0 0 4px 0;
    }

    .weaponSelectText .choiceDesc{
      color:var(--sub);
      font-size:13px;
      line-height:1.45;
      margin:0 0 4px 0;
    }

    .weaponSelectText .choiceMeta{
      color:var(--accent2);
      font-size:12px;
      line-height:1.4;
      margin:0;
    }

    @media (max-width:640px){
      .weaponSelectBtn{
        padding:12px 12px 14px;
      }

      /* スマホでも縦積みにせず、常にアイコン+文字の2カラム */
      .weaponSelectCardInner{
        grid-template-columns:56px minmax(0, 1fr);
        gap:10px;
      }

      .weaponSelectIcon{
        width:52px;
        height:52px;
      }

      .weaponSelectText .choiceTitle{
        font-size:15px;
        line-height:1.3;
      }

      .weaponSelectText .choiceDesc{
        font-size:12px;
        line-height:1.4;
      }

      .weaponSelectText .choiceMeta{
        font-size:11px;
        line-height:1.35;
      }
    }
  `;
  document.head.appendChild(style);
}

function buildWeaponSelectCardHtml(w, unlocked) {
  const title = unlocked ? (w.name || "") : getUnknownLabel();
  const desc = unlocked ? (w.desc || "") : "一度入手すると解放されます";
  const meta = unlocked ? "初期武器" : "未解放";

  return `
    <div class="weaponSelectCardInner">
      <canvas
        class="weaponSelectIcon"
        data-weapon-select-icon="${w.iconIndex || 0}"
        width="56"
        height="56"
      ></canvas>

      <div class="weaponSelectText">
        <div class="choiceTitle">${title}</div>
        <div class="choiceDesc">${desc}</div>
        <div class="choiceMeta">${meta}</div>
      </div>
    </div>
  `;
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
            <div class="choiceMeta">${seen ? `威力 ${w.damage} / CD ${w.cooldown} / ${getWeaponStageRangeText(0, w)} / ${getWeaponStageRangeText(1, w)} / ${getWeaponStageRangeText(2, w)}` : "未確認"}</div>
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
          <canvas class="codexIcon ${defeated ? "" : "locked"}" data-enemy-id="${id}" data-enemy-icon="${def.spriteIndex || 0}" width="56" height="56"></canvas>
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

  wrap.querySelectorAll("canvas[data-enemy-id]").forEach((canvas) => {
    if (canvas.classList.contains("locked")) {
      drawLockedIconToCanvas(canvas);
      return;
    }

    const enemyId = canvas.dataset.enemyId || "";
    const index = Number(canvas.dataset.enemyIcon || 0);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let ok = false;

    // ボスエイは boss シート、リヴァイアサンは leviathan シートを優先
    if (enemyId === "boss_manta") {
      ok = drawSpriteFrame(ctx, "boss", index, 0, 0, canvas.width, canvas.height);
    } else if (enemyId === "leviathan") {
      ok = drawSpriteFrame(ctx, "leviathan", index, 0, 0, canvas.width, canvas.height);
    } else {
      ok = drawSpriteFrame(ctx, "enemies", index, 0, 0, canvas.width, canvas.height);
    }

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
      if (STATE.testMode) STATE.testMode.pendingStart = false;
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
      if (!STATE.testMode?.pendingStart) {
        STATE.testMode.pendingStart = false;
      }
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

  setupShopPanelUi();
  setupTestModeUi();
  ensureAutoBatchHudUi();
  ensureAutoBatchCsvConfirmModal();
}


// ===============================
// ショップUI補助
// ===============================

function setupShopPanelUi() {
  if (typeof ensureShopHeaderUi === 'function') {
    ensureShopHeaderUi();
  }
}

function refreshShopPanelUi() {
  if (typeof renderShop === 'function' && STATE.shopOpen) {
    renderShop();
  } else if (typeof ensureShopHeaderUi === 'function') {
    ensureShopHeaderUi();
  }
}




function isDesktopTestModeAvailable() {
  const mq = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer:fine)').matches
    : false;
  return !!(mq || (typeof window !== 'undefined' && window.innerWidth >= 960));
}

function getTestModeEnemySpawner() {
  if (!STATE.testMode) STATE.testMode = {};
  if (!STATE.testMode.enemySpawner) {
    STATE.testMode.enemySpawner = {
      enabled: false,
      pauseNormalWaves: true,
      interval: 1,
      count: 3,
      timer: 0,
      minDist: 320,
      maxDist: 460,
      selectedEnemyIds: []
    };
  }
  return STATE.testMode.enemySpawner;
}

function ensureTestModeStyles() {
  if (document.getElementById('testModeStyle')) return;
  const style = document.createElement('style');
  style.id = 'testModeStyle';
  style.textContent = `
    #testModeOpenBtn{ display:none; }
    .desktopOnlyBtn{ display:none; }
    @media (min-width: 960px) and (pointer:fine) {
      .desktopOnlyBtn{ display:block; }
    }
    #testModePanelWrap{
      position:absolute;
      top:calc(var(--safe-top) + 12px);
      left:50%;
      transform:translateX(-50%);
      z-index:40;
      width:min(96vw, 1120px);
      max-height:min(88vh, 900px);
      display:none;
      pointer-events:auto;
    }
    #testModePanelWrap.active{ display:block; }
    .testModePanel{
      border:1px solid rgba(120,220,255,0.24);
      border-radius:18px;
      background:rgba(0,18,30,0.96);
      box-shadow:0 14px 42px rgba(0,0,0,0.42);
      padding:14px;
      display:grid;
      gap:12px;
      overflow:auto;
      max-height:min(88vh, 900px);
    }
    .testModeTopRow{ display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap; }
    .testModeTitle{ font-size:24px; font-weight:800; }
    .testModeSub{ color:var(--sub); font-size:13px; }
    .testModeGrid{ display:grid; grid-template-columns:1.2fr 1fr; gap:12px; }
    .testModeSection{ border:1px solid rgba(120,220,255,0.16); border-radius:14px; padding:12px; background:rgba(255,255,255,0.03); display:grid; gap:10px; }
    .testModeSection h3{ margin:0; font-size:16px; }
    .testModeMiniGrid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .testModeField{ display:grid; gap:4px; text-align:left; }
    .testModeField label{ font-size:12px; color:var(--sub); }
    .testModeField input,.testModeField select,.testModeField textarea{
      width:100%; min-height:38px; border-radius:10px; border:1px solid rgba(120,220,255,0.18); background:rgba(0,0,0,0.28); color:var(--text); padding:8px 10px;
    }
    .testModeActions{ display:flex; gap:8px; flex-wrap:wrap; }
    .testModeActions button{ min-height:40px; }
    .testModeWeaponList, .testModeEnemyList{ display:grid; gap:8px; max-height:320px; overflow:auto; padding-right:4px; }
    .testModeWeaponRow, .testModeEnemyRow{ border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px; display:grid; gap:8px; background:rgba(0,0,0,0.18); }
    .testModeWeaponHead, .testModeEnemyHead{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .testModeInline{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .testModeInline label{ font-size:12px; color:var(--sub); }
    .testModeCheckList{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px 10px; }
    .testModeCheck{ display:flex; gap:6px; align-items:center; font-size:12px; color:var(--text); }
    .testModeCheck input{ width:auto; min-height:auto; }
    .testModeHint{ font-size:12px; color:var(--sub); line-height:1.5; }
    .testModeFooter{ display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap; }
    @media (max-width: 1100px){ .testModeGrid{ grid-template-columns:1fr; } .testModeCheckList{ grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}

function ensureTestModePanelDom() {
  ensureTestModeStyles();
  let wrap = getEl('testModePanelWrap');
  if (wrap) return wrap;

  wrap = document.createElement('div');
  wrap.id = 'testModePanelWrap';
  wrap.innerHTML = `
    <div class="testModePanel">
      <div class="testModeTopRow">
        <div>
          <div class="testModeTitle">PCテストモード</div>
          <div class="testModeSub">F2 で開閉。武器・敵・ショップ・Gold・自動プレイを管理できます。</div>
        </div>
        <div class="testModeActions">
          <button id="testModeCloseBtn" type="button">閉じる</button>
          <button id="testModeDisableBtn" type="button">通常モードに戻す</button>
        </div>
      </div>

      <div class="testModeGrid">
        <div class="testModeSection">
          <h3>武器</h3>
          <div class="testModeHint">ON/OFF、進化段階、分岐、Lv を変更できます。</div>
          <div id="testModeWeaponList" class="testModeWeaponList"></div>
        </div>

        <div class="testModeSection">
          <h3>敵スポーン</h3>
          <div class="testModeMiniGrid">
            <div class="testModeField"><label>間隔(秒)</label><input id="testEnemyInterval" type="number" step="0.1" min="0.05"></div>
            <div class="testModeField"><label>1回の出現数</label><input id="testEnemyCount" type="number" step="1" min="1"></div>
            <div class="testModeField"><label>最小距離</label><input id="testEnemyMinDist" type="number" step="10" min="32"></div>
            <div class="testModeField"><label>最大距離</label><input id="testEnemyMaxDist" type="number" step="10" min="64"></div>
          </div>
          <label class="testModeCheck"><input id="testEnemyEnabled" type="checkbox">カスタム敵スポーンを有効</label>
          <label class="testModeCheck"><input id="testEnemyPauseWaves" type="checkbox">通常Waveの敵出現を停止</label>
          <div class="testModeHint">選んだ敵からランダムで出します。</div>
          <div id="testEnemyList" class="testModeEnemyList"></div>
          <div class="testModeActions">
            <button id="testEnemyApplyBtn" type="button">敵設定を反映</button>
            <button id="testClearEnemiesBtn" type="button">敵を全消去</button>
          </div>
        </div>

        <div class="testModeSection">
          <h3>ショップ</h3>
          <div class="testModeField">
            <label>既存ショップ項目を追加</label>
            <select id="testShopPresetSelect"></select>
          </div>
          <div class="testModeInline">
            <label>数量</label>
            <input id="testShopPresetQty" type="number" min="1" step="1" value="1" style="width:96px;">
            <button id="testAddShopPresetBtn" type="button">追加</button>
          </div>
          <div class="testModeMiniGrid">
            <div class="testModeField"><label>表示名</label><input id="testShopCustomName" type="text" value="テスト商品"></div>
            <div class="testModeField"><label>説明</label><input id="testShopCustomDesc" type="text" value="テスト用に追加した商品"></div>
            <div class="testModeField"><label>効果</label><select id="testShopCustomEffect"></select></div>
            <div class="testModeField"><label>値</label><input id="testShopCustomValue" type="number" step="1" value="100"></div>
            <div class="testModeField"><label>価格</label><input id="testShopCustomPrice" type="number" step="1" value="0"></div>
            <div class="testModeField"><label>持ち越し</label><select id="testShopCustomPersistent"><option value="true">残る</option><option value="false">残らない</option></select></div>
          </div>
          <div class="testModeActions">
            <button id="testAddCustomShopBtn" type="button">カスタム商品を追加</button>
            <button id="testOpenShopNowBtn" type="button">今すぐショップを開く</button>
            <button id="testClearShopBtn" type="button">ショップ在庫をクリア</button>
          </div>
        </div>

        <div class="testModeSection">
          <h3>装備 / XP / 自動プレイ</h3>

          <div class="testModeField">
            <label>パッシブLv調整</label>
            <div id="testPassiveList" class="testModeWeaponList"></div>
          </div>

          <div class="testModeMiniGrid">
            <div class="testModeField"><label>XPを直接付与</label><input id="testXpDelta" type="number" step="10" value="100"></div>
            <div class="testModeField"><label>Goldを加算/減算</label><input id="testGoldDelta" type="number" step="10" value="100"></div>
            <div class="testModeField"><label>Goldを直接設定</label><input id="testGoldSet" type="number" step="10" value="0"></div>
          </div>

          <div class="testModeActions">
            <button id="testXpAddBtn" type="button">+XP</button>
            <button id="testGoldAddBtn" type="button">+Gold</button>
            <button id="testGoldSubBtn" type="button">-Gold</button>
            <button id="testGoldSetBtn" type="button">Gold設定</button>
            <button id="testFullHealBtn" type="button">全回復</button>
          </div>

          <div class="testModeField">
            <label>レベルアップ / 自動プレイ</label>
            <div class="testModeActions">
              <button id="testAutoLevelUpToggleBtn" type="button">自動取得: OFF</button>
              <button id="testSkipLevelUpOnceBtn" type="button">今すぐ1回スキップ</button>
              <button id="testAutoPlayToggleBtn" type="button">自動プレイ: OFF</button>
            </div>
          </div>

          <div class="testModeMiniGrid">
            <div class="testModeField">
              <label>シミュ速度</label>
              <select id="testAutoPlaySpeed">
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4">4x</option>
                <option value="8">8x</option>
              </select>
            </div>
            <div class="testModeField">
              <label>バッチ回数</label>
              <input id="testAutoBatchCount" type="number" step="1" min="1" value="100">
            </div>
          </div>

          <div class="testModeActions">
            <button id="testAutoBatchStartBtn" type="button">バッチ開始</button>
            <button id="testAutoBatchStopBtn" type="button">バッチ停止</button>
            <button id="testAutoBatchCsvBtn" type="button">CSVダウンロード</button>
          </div>

          <div id="testAutoBatchSummary" class="testModeHint"></div>

          <div class="testModeField">
            <label>武器別勝率</label>
            <textarea id="testAutoBatchWeaponStats" rows="7" readonly></textarea>
          </div>

          <div class="testModeField">
            <label>Wave別死亡分布</label>
            <textarea id="testAutoBatchDeathWaves" rows="7" readonly></textarea>
          </div>

          <div class="testModeFooter">
            <div class="testModeHint">PC専用の簡易自動テストです。まずは 100回前後の平均Waveとクリア率を見ます。</div>
            <div id="testModeStatus" class="testModeHint"></div>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(wrap);
  return wrap;
}

function getFlatShopPresetList() {
  const source = STATE.shopItemsData?.shopWaves || {};
  const out = [];
  for (const [wave, items] of Object.entries(source)) {
    for (const item of items || []) {
      out.push({
        ...item,
        presetWave: Number(wave || 1)
      });
    }
  }
  return out;
}

function setupTestModeUi() {
  ensureTestModeStyles();
  STATE.testMode.available = isDesktopTestModeAvailable();
  if (!STATE.testMode.available) return;

  const titleButtons = document.querySelector('.titleButtons');
  if (titleButtons && !getEl('testModeStartBtn')) {
    const btn = document.createElement('button');
    btn.id = 'testModeStartBtn';
    btn.className = 'desktopOnlyBtn';
    btn.textContent = 'PCテスト開始';
    btn.onclick = () => {
      STATE.testMode.pendingStart = true;
      if (hasSeenFirstTutorial()) {
        showScreen('weaponSelectScreen');
        renderWeaponSelect();
      } else {
        markFirstTutorialSeen();
        showScreen('weaponSelectScreen');
        renderWeaponSelect();
      }
    };
    titleButtons.appendChild(btn);
  }

  const hudRight = getEl('hudRight');
  if (hudRight && !getEl('testModeOpenBtn')) {
    const btn = document.createElement('button');
    btn.id = 'testModeOpenBtn';
    btn.type = 'button';
    btn.textContent = 'テスト';
    btn.onclick = () => toggleTestModePanel();
    hudRight.appendChild(btn);
  }

  ensureTestModePanelDom();

  const effectSelect = getEl('testShopCustomEffect');
  if (effectSelect && effectSelect.options.length === 0) {
    ['heal','maxHp','absorbXp','reroll','weaponGain','passiveGain','weaponUpgrade','passiveUpgrade'].forEach((effect) => {
      const opt = document.createElement('option');
      opt.value = effect;
      opt.textContent = effect;
      effectSelect.appendChild(opt);
    });
  }

  const closeBtn = getEl('testModeCloseBtn');
  if (closeBtn) closeBtn.onclick = () => closeTestModePanel();

  const disableBtn = getEl('testModeDisableBtn');
  if (disableBtn) {
    disableBtn.onclick = () => {
      STATE.testMode.pendingStart = false;
      STATE.testMode.enabled = false;
      if (typeof setAutoPlayEnabled === "function") setAutoPlayEnabled(false);
      if (typeof stopAutoBatchTest === "function") stopAutoBatchTest();
      closeTestModePanel();
      updateTestModeStatus();
    };
  }

  const addBtn = getEl('testAddShopPresetBtn');
  if (addBtn) addBtn.onclick = () => addSelectedShopPreset();

  const addCustomBtn = getEl('testAddCustomShopBtn');
  if (addCustomBtn) addCustomBtn.onclick = () => addCustomShopItemFromPanel();

  const openShopBtn = getEl('testOpenShopNowBtn');
  if (openShopBtn) openShopBtn.onclick = () => { if (typeof openShop === 'function') openShop(); };

  const clearShopBtn = getEl('testClearShopBtn');
  if (clearShopBtn) clearShopBtn.onclick = () => clearTestShopStock();

  const enemyApplyBtn = getEl('testEnemyApplyBtn');
  if (enemyApplyBtn) enemyApplyBtn.onclick = () => applyTestEnemySettings();

  const clearEnemiesBtn = getEl('testClearEnemiesBtn');
  if (clearEnemiesBtn) {
    clearEnemiesBtn.onclick = () => {
      STATE.enemies = [];
      updateTestModeStatus('敵を全消去しました');
    };
  }

  const goldAddBtn = getEl('testGoldAddBtn');
  if (goldAddBtn) goldAddBtn.onclick = () => changeGoldByPanel(1);

  const goldSubBtn = getEl('testGoldSubBtn');
  if (goldSubBtn) goldSubBtn.onclick = () => changeGoldByPanel(-1);

  const goldSetBtn = getEl('testGoldSetBtn');
  if (goldSetBtn) goldSetBtn.onclick = () => setGoldByPanel();

  const fullHealBtn = getEl('testFullHealBtn');
  if (fullHealBtn) {
    fullHealBtn.onclick = () => {
      if (STATE.player) {
        STATE.player.hp = STATE.player.maxHp;
        updateHUD();
        updateTestModeStatus('HPを全回復しました');
      }
    };
  }

  const xpAddBtn = getEl('testXpAddBtn');
  if (xpAddBtn) {
    xpAddBtn.onclick = () => {
      const value = Math.max(0, Number(getEl('testXpDelta')?.value || 0));
      if (typeof addXpByTest === 'function' && addXpByTest(value)) {
        updateHUD();
        updateTestModeStatus(`XPを ${value} 付与しました`);
      }
    };
  }

  const autoLevelUpToggleBtn = getEl('testAutoLevelUpToggleBtn');
  if (autoLevelUpToggleBtn) {
    autoLevelUpToggleBtn.onclick = () => {
      STATE.testMode.autoSkipLevelUp = !STATE.testMode.autoSkipLevelUp;
      autoLevelUpToggleBtn.textContent = `自動取得: ${STATE.testMode.autoSkipLevelUp ? 'ON' : 'OFF'}`;
      updateTestModeStatus(`レベルアップ自動取得 ${STATE.testMode.autoSkipLevelUp ? 'ON' : 'OFF'}`);
    };
  }

  const skipLevelUpOnceBtn = getEl('testSkipLevelUpOnceBtn');
  if (skipLevelUpOnceBtn) {
    skipLevelUpOnceBtn.onclick = () => {
      STATE.testMode.skipNextLevelUp = true;
      updateTestModeStatus('次のレベルアップを1回だけ自動取得します');
      if (isScreenVisible('levelUpScreen')) {
        tryAutoResolveLevelUpForTest();
      }
    };
  }

  const autoPlayToggleBtn = getEl('testAutoPlayToggleBtn');
  if (autoPlayToggleBtn) {
    autoPlayToggleBtn.onclick = () => {
      const next = !(typeof isAutoPlayEnabled === "function" ? isAutoPlayEnabled() : false);
      if (typeof setAutoPlayEnabled === "function") setAutoPlayEnabled(next);
      autoPlayToggleBtn.textContent = `自動プレイ: ${next ? 'ON' : 'OFF'}`;
      updateTestModeStatus(`自動プレイ ${next ? 'ON' : 'OFF'}`);
    };
  }

  const autoPlaySpeed = getEl('testAutoPlaySpeed');
  if (autoPlaySpeed) {
    autoPlaySpeed.onchange = () => {
      const value = Number(autoPlaySpeed.value || 1);
      if (typeof setAutoPlaySimSpeed === "function") setAutoPlaySimSpeed(value);
      updateTestModeStatus(`シミュ速度 ${value}x`);
    };
  }

  const autoBatchStartBtn = getEl('testAutoBatchStartBtn');
  if (autoBatchStartBtn) {
    autoBatchStartBtn.onclick = () => {
      const count = Math.max(1, Number(getEl('testAutoBatchCount')?.value || 100));
      if (typeof beginAutoBatchTest === "function") beginAutoBatchTest(count);
      refreshTestModePanel();
      updateTestModeStatus(`自動テスト ${count}回開始`);
    };
  }

  const autoBatchStopBtn = getEl('testAutoBatchStopBtn');
  if (autoBatchStopBtn) {
    autoBatchStopBtn.onclick = () => {
      if (typeof stopAutoBatchTest === "function") stopAutoBatchTest();
      refreshTestModePanel();
      updateTestModeStatus('自動テスト停止');
    };
  }

  const autoBatchCsvBtn = getEl('testAutoBatchCsvBtn');
  if (autoBatchCsvBtn) {
    autoBatchCsvBtn.onclick = () => {
      const ok = typeof downloadAutoBatchCsv === "function" ? downloadAutoBatchCsv() : false;
      updateTestModeStatus(ok ? 'CSVを書き出しました' : 'CSV対象データがありません');
    };
  }

  window.addEventListener('resize', refreshTestModeAvailability);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && STATE.testMode?.panelOpen) {
      e.preventDefault();
      closeTestModePanel();
    }
  });

  refreshTestModeAvailability();
  populateShopPresetOptions();
}

function refreshTestModeAvailability() {
  const available = isDesktopTestModeAvailable();
  STATE.testMode.available = available;
  const titleBtn = getEl('testModeStartBtn');
  const hudBtn = getEl('testModeOpenBtn');
  if (titleBtn) titleBtn.style.display = available ? 'block' : 'none';
  if (hudBtn) hudBtn.style.display = available && STATE.player ? 'block' : 'none';
  const wrap = getEl('testModePanelWrap');
  if (wrap && !available) wrap.classList.remove('active');
}

function updateTestModeStatus(message = '') {
  const el = getEl('testModeStatus');
  if (!el) {
    updateAutoBatchHudUi();
    return;
  }

  const selected = getTestModeEnemySpawner().selectedEnemyIds || [];
  const auto = typeof getAutoPlayState === "function" ? getAutoPlayState() : null;

  const parts = [
    STATE.testMode?.enabled ? 'テストモードON' : '通常モード',
    `敵設定:${selected.length}種`,
    `Gold:${Math.floor(STATE.player?.gold || 0)}`
  ];

  if (auto) {
    parts.push(`自動:${auto.enabled ? 'ON' : 'OFF'}`);
    parts.push(`速度:${auto.simSpeed || 1}x`);
    if (auto.batchRunning) {
      parts.push(`Batch:${Math.max(1, auto.batchRunIndex || 1)}/${Math.max(1, auto.batchTargetRuns || 1)}`);
    } else if ((auto.batchResults || []).length > 0) {
      parts.push(`結果:${(auto.batchResults || []).length}件`);
    }
  }

  if (message) parts.push(message);
  el.textContent = parts.join(' / ');

  const summaryEl = getEl('testAutoBatchSummary');
  if (summaryEl && auto && typeof formatAutoBatchSummaryText === "function") {
    summaryEl.textContent = formatAutoBatchSummaryText();
  }

  const weaponStatsEl = getEl('testAutoBatchWeaponStats');
  if (weaponStatsEl && typeof buildAutoBatchWeaponStatsText === "function") {
    weaponStatsEl.textContent = buildAutoBatchWeaponStatsText();
  }

  const deathWaveEl = getEl('testAutoBatchDeathWaves');
  if (deathWaveEl && typeof buildAutoBatchDeathWaveText === "function") {
    deathWaveEl.textContent = buildAutoBatchDeathWaveText();
  }

  updateAutoBatchHudUi();
}

function ensureAutoBatchHudUi() {
  let el = getEl("autoBatchHud");
  if (el) return el;

  el = document.createElement("div");
  el.id = "autoBatchHud";
  el.style.position = "fixed";
  el.style.right = "calc(var(--safe-right) + 8px)";
  el.style.top = "calc(var(--safe-top) + 56px)";
  el.style.zIndex = "18";
  el.style.pointerEvents = "none";
  el.style.padding = "6px 10px";
  el.style.borderRadius = "999px";
  el.style.border = "1px solid rgba(124,247,255,0.28)";
  el.style.background = "rgba(0,18,30,0.82)";
  el.style.color = "var(--accent2)";
  el.style.fontSize = "12px";
  el.style.fontWeight = "700";
  el.style.lineHeight = "1.2";
  el.style.whiteSpace = "nowrap";
  el.style.maxWidth = "calc(100vw - 24px)";
  el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.28)";
  el.style.display = "none";

  document.body.appendChild(el);
  return el;
}

function updateAutoBatchHudUi() {
  const el = ensureAutoBatchHudUi();
  if (!el) return;

  const auto = typeof getAutoPlayState === "function" ? getAutoPlayState() : null;
  const shouldShow = !!(auto && auto.batchRunning && !STATE.uiSimple);

  if (!shouldShow) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }

  el.style.display = "block";
  el.textContent = `AUTO ${Math.max(1, auto.batchRunIndex || 1)}/${Math.max(1, auto.batchTargetRuns || 1)}`;
}

function ensureAutoBatchCsvConfirmModal() {
  let wrap = getEl("autoBatchCsvConfirmWrap");
  if (wrap) return wrap;

  wrap = document.createElement("div");
  wrap.id = "autoBatchCsvConfirmWrap";
  wrap.className = "screen";
  wrap.style.zIndex = "60";
  wrap.innerHTML = `
    <div style="width:min(92vw,420px); display:grid; gap:12px; padding:16px; border-radius:16px; background:rgba(0,18,30,0.96); border:1px solid rgba(120,220,255,0.22); box-shadow:0 14px 42px rgba(0,0,0,0.42);">
      <h2 style="margin:0;">CSV保存</h2>
      <div class="choiceDesc">バッチテストが完了しました。結果CSVを保存しますか？</div>
      <div class="choiceMeta" id="autoBatchCsvConfirmSummary"></div>
      <div style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
        <button id="autoBatchCsvNoBtn" type="button">保存しない</button>
        <button id="autoBatchCsvYesBtn" type="button">保存する</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const noBtn = getEl("autoBatchCsvNoBtn");
  if (noBtn) {
    noBtn.onclick = () => closeAutoBatchCsvConfirmModal();
  }

  const yesBtn = getEl("autoBatchCsvYesBtn");
  if (yesBtn) {
    yesBtn.onclick = () => {
      const ok = typeof downloadAutoBatchCsv === "function" ? downloadAutoBatchCsv() : false;
      closeAutoBatchCsvConfirmModal();
      if (typeof updateTestModeStatus === "function") {
        updateTestModeStatus(ok ? "CSVを書き出しました" : "CSV対象データがありません");
      }
    };
  }

  return wrap;
}

function openAutoBatchCsvConfirmModal() {
  const wrap = ensureAutoBatchCsvConfirmModal();
  if (!wrap) return;

  const summaryEl = getEl("autoBatchCsvConfirmSummary");
  if (summaryEl && typeof formatAutoBatchSummaryText === "function") {
    summaryEl.textContent = formatAutoBatchSummaryText();
  }

  wrap.classList.add("active");
}

function closeAutoBatchCsvConfirmModal() {
  const wrap = getEl("autoBatchCsvConfirmWrap");
  if (wrap) wrap.classList.remove("active");
}

function openTestModePanel() {
  if (!STATE.testMode?.available || !STATE.player) return;
  STATE.testMode.enabled = true;
  ensureTestModePanelDom();
  refreshTestModePanel();
  const wrap = getEl('testModePanelWrap');
  if (!wrap) return;
  STATE.testMode.panelPrevPaused = !!STATE.paused;
  STATE.testMode.panelOpen = true;
  STATE.paused = true;
  wrap.classList.add('active');
  updateTestModeStatus();
}

function closeTestModePanel() {
  const wrap = getEl('testModePanelWrap');
  if (wrap) wrap.classList.remove('active');
  if (!STATE.testMode) return;
  STATE.testMode.panelOpen = false;
  if (!STATE.shopOpen && !isScreenVisible('levelUpScreen') && !isScreenVisible('chestEvolutionScreen')) {
    STATE.paused = !!STATE.testMode.panelPrevPaused;
  }
  updateHUD();
}

function toggleTestModePanel() {
  if (!STATE.testMode?.available || !STATE.player) return;
  if (STATE.testMode.panelOpen) closeTestModePanel();
  else openTestModePanel();
}

function refreshTestModePanel() {
  populateWeaponTestRows();
  populatePassiveTestRows();
  populateEnemyTestRows();
  populateShopPresetOptions();

  const spawner = getTestModeEnemySpawner();
  const setValue = (id, value) => {
    const el = getEl(id);
    if (el) el.value = value;
  };

  setValue('testEnemyInterval', spawner.interval || 1);
  setValue('testEnemyCount', spawner.count || 1);
  setValue('testEnemyMinDist', spawner.minDist || 320);
  setValue('testEnemyMaxDist', spawner.maxDist || 460);

  const enabledEl = getEl('testEnemyEnabled');
  if (enabledEl) enabledEl.checked = !!spawner.enabled;

  const pauseEl = getEl('testEnemyPauseWaves');
  if (pauseEl) pauseEl.checked = spawner.pauseNormalWaves !== false;

  const goldSet = getEl('testGoldSet');
  if (goldSet) goldSet.value = Math.floor(STATE.player?.gold || 0);

  const auto = typeof getAutoPlayState === "function" ? getAutoPlayState() : null;
  const autoToggle = getEl('testAutoPlayToggleBtn');
  if (autoToggle && auto) autoToggle.textContent = `自動プレイ: ${auto.enabled ? 'ON' : 'OFF'}`;

  const autoSpeed = getEl('testAutoPlaySpeed');
  if (autoSpeed && auto) autoSpeed.value = String(auto.simSpeed || 1);

  const autoBatchCount = getEl('testAutoBatchCount');
  if (autoBatchCount && auto) autoBatchCount.value = Number(auto.batchTargetRuns || 100);

  const autoBatchStartBtn = getEl('testAutoBatchStartBtn');
  if (autoBatchStartBtn && auto) {
    autoBatchStartBtn.textContent = auto.batchRunning
      ? `実行中 ${Math.max(0, auto.batchRunIndex || 0)}/${Math.max(1, auto.batchTargetRuns || 1)}`
      : 'バッチ開始';
  }

  const batchSummary = getEl('testAutoBatchSummary');
  if (batchSummary && auto) {
    batchSummary.textContent = typeof formatAutoBatchSummaryText === "function"
      ? formatAutoBatchSummaryText()
      : '';
  }

  const weaponStatsEl = getEl('testAutoBatchWeaponStats');
  if (weaponStatsEl) {
    weaponStatsEl.textContent = typeof buildAutoBatchWeaponStatsText === "function"
      ? buildAutoBatchWeaponStatsText()
      : '';
  }

  const deathWaveEl = getEl('testAutoBatchDeathWaves');
  if (deathWaveEl) {
    deathWaveEl.textContent = typeof buildAutoBatchDeathWaveText === "function"
      ? buildAutoBatchDeathWaveText()
      : '';
  }

  updateTestModeStatus();
  updateAutoBatchHudUi();
}

function populateWeaponTestRows() {
  const wrap = getEl('testModeWeaponList');
  if (!wrap) return;
  const weapons = STATE.gameData?.weapons || [];
  wrap.innerHTML = '';

  for (const def of weapons) {
    const inst = getWeaponInstance(def.id);
    const row = document.createElement('div');
    row.className = 'testModeWeaponRow';
    const branches = getWeaponGrowthBranches(def);
    const stage = inst?.evolutionStage || 0;
    row.innerHTML = `
      <div class="testModeWeaponHead">
        <strong>${def.name}</strong>
        <label class="testModeCheck"><input type="checkbox" data-test-weapon-enabled="${def.id}" ${inst ? 'checked' : ''}>ON</label>
      </div>
      <div class="testModeMiniGrid">
        <div class="testModeField"><label>段階</label><select data-test-weapon-stage="${def.id}">
          <option value="0" ${stage === 0 ? 'selected' : ''}>通常</option>
          <option value="1" ${stage === 1 ? 'selected' : ''}>第1進化</option>
          <option value="2" ${stage === 2 ? 'selected' : ''}>第2進化</option>
        </select></div>
        <div class="testModeField"><label>Lv</label><select data-test-weapon-level="${def.id}"></select></div>
        <div class="testModeField"><label>分岐</label><select data-test-weapon-branch="${def.id}"></select></div>
      </div>`;
    wrap.appendChild(row);

    const branchSelect = row.querySelector(`[data-test-weapon-branch="${def.id}"]`);
    if (branchSelect) {
      const list = branches.length > 0 ? branches : [{ branchId: '', name: 'なし' }];
      branchSelect.innerHTML = list.map((branch) => `<option value="${branch.branchId || ''}" ${(inst?.branchId || list[0].branchId || '') === (branch.branchId || '') ? 'selected' : ''}>${branch.name || 'なし'}</option>`).join('');
      branchSelect.disabled = branches.length === 0;
    }

    const stageSelect = row.querySelector(`[data-test-weapon-stage="${def.id}"]`);
    const levelSelect = row.querySelector(`[data-test-weapon-level="${def.id}"]`);

    const refreshLevelOptions = () => {
      const stageValue = Number(stageSelect?.value || 0);
      const max = typeof getStageMaxLevel === 'function' ? getStageMaxLevel(stageValue, def) : [3,4,5][stageValue] || 3;
      const current = Math.max(1, Math.min(max, Number(levelSelect?.value || inst?.level || 1)));
      if (levelSelect) {
        levelSelect.innerHTML = Array.from({ length: max }, (_, i) => `<option value="${i + 1}" ${i + 1 === current ? 'selected' : ''}>Lv${i + 1}</option>`).join('');
      }
      if (branchSelect) branchSelect.disabled = stageValue === 0 || branches.length === 0;
    };

    refreshLevelOptions();
    stageSelect?.addEventListener('change', refreshLevelOptions);

    row.querySelectorAll('input,select').forEach((el) => {
      el.addEventListener('change', () => applyWeaponTestRow(def.id));
    });
  }
}

function populatePassiveTestRows() {
  const wrap = getEl('testPassiveList');
  if (!wrap) return;

  const passives = STATE.gameData?.passives || [];
  const currentLevels = STATE.player?.passiveLevels || {};
  wrap.innerHTML = '';

  for (const def of passives) {
    const maxLv = typeof getPassiveMaxLevel === 'function'
      ? getPassiveMaxLevel(def)
      : (def.maxLevel || 5);

    const currentLv = Math.max(0, Math.min(maxLv, Number(currentLevels[def.id] || 0)));

    const row = document.createElement('div');
    row.className = 'testModeWeaponRow';
    row.innerHTML = `
      <div class="testModeWeaponHead">
        <strong>${def.name}</strong>
        <span class="testModeHint">Lv 0-${maxLv}</span>
      </div>
      <div class="testModeMiniGrid">
        <div class="testModeField">
          <label>Lv</label>
          <select data-test-passive-level="${def.id}">
            ${Array.from({ length: maxLv + 1 }, (_, i) => `
              <option value="${i}" ${i === currentLv ? 'selected' : ''}>Lv${i}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="testModeHint">${def.levelDesc?.[Math.max(0, currentLv - 1)] || def.desc || ''}</div>
    `;
    wrap.appendChild(row);

    const select = row.querySelector(`[data-test-passive-level="${def.id}"]`);
    select?.addEventListener('change', () => {
      if (typeof setPassiveTestLevel === 'function') {
        setPassiveTestLevel(def.id, Number(select.value || 0));
        updateHUD();
        updateTestModeStatus(`${def.name} を Lv${Number(select.value || 0)} に変更`);
      }
    });
  }
}

function applyWeaponTestRow(weaponId) {
  const enabledEl = document.querySelector(`[data-test-weapon-enabled="${weaponId}"]`);
  const stageEl = document.querySelector(`[data-test-weapon-stage="${weaponId}"]`);
  const levelEl = document.querySelector(`[data-test-weapon-level="${weaponId}"]`);
  const branchEl = document.querySelector(`[data-test-weapon-branch="${weaponId}"]`);
  if (typeof setWeaponTestConfig !== 'function') return;
  setWeaponTestConfig(weaponId, {
    enabled: !!enabledEl?.checked,
    stage: Number(stageEl?.value || 0),
    level: Number(levelEl?.value || 1),
    branchId: branchEl?.value || null
  });
  updateHUD();
  updateTestModeStatus(`${getWeaponDef(weaponId)?.name || weaponId} を更新`);
}

function populateEnemyTestRows() {
  const wrap = getEl('testEnemyList');
  if (!wrap) return;
  const selected = new Set(getTestModeEnemySpawner().selectedEnemyIds || []);
  wrap.innerHTML = '';
  for (const [enemyId, def] of Object.entries(STATE.gameData?.enemyStats || {})) {
    const row = document.createElement('div');
    row.className = 'testModeEnemyRow';
    row.innerHTML = `
      <div class="testModeEnemyHead">
        <strong>${def.name || enemyId}</strong>
        <label class="testModeCheck"><input type="checkbox" data-test-enemy="${enemyId}" ${selected.has(enemyId) ? 'checked' : ''}>出現</label>
      </div>
      <div class="testModeHint">HP ${def.hp} / 速度 ${def.speed} / 接触 ${def.damage}</div>`;
    wrap.appendChild(row);
  }
}

function applyTestEnemySettings() {
  const spawner = getTestModeEnemySpawner();
  const selected = [...document.querySelectorAll('[data-test-enemy]:checked')].map((el) => el.dataset.testEnemy).filter(Boolean);
  spawner.selectedEnemyIds = selected;
  spawner.enabled = !!getEl('testEnemyEnabled')?.checked;
  spawner.pauseNormalWaves = !!getEl('testEnemyPauseWaves')?.checked;
  spawner.interval = Math.max(0.05, Number(getEl('testEnemyInterval')?.value || 1));
  spawner.count = Math.max(1, Number(getEl('testEnemyCount')?.value || 1));
  spawner.minDist = Math.max(48, Number(getEl('testEnemyMinDist')?.value || 320));
  spawner.maxDist = Math.max(spawner.minDist + 16, Number(getEl('testEnemyMaxDist')?.value || 460));
  spawner.timer = spawner.interval;
  updateTestModeStatus('敵スポーン設定を反映しました');
}

function populateShopPresetOptions() {
  const select = getEl('testShopPresetSelect');
  if (!select) return;
  const presets = getFlatShopPresetList();
  select.innerHTML = presets.map((item, index) => `<option value="${index}">Wave${item.presetWave} / ${item.name} / ${item.price}G</option>`).join('');
  select.dataset.testPresets = JSON.stringify(presets);
}

function ensureShopStateForTest() {
  if (typeof ensureShopRunState === 'function') ensureShopRunState();
  if (!STATE.shopStock) STATE.shopStock = {};
  if (!STATE.shopPurchased) STATE.shopPurchased = {};
}

function addShopItemToTestStock(item, qty = 1) {
  ensureShopStateForTest();
  const count = Math.max(1, Number(qty || 1));
  const wave = Math.max(1, Number(STATE.currentWave || 1));
  for (let i = 0; i < count; i++) {
    const uniqueId = `${item.id || 'test_item'}__tm_${wave}_${STATE.testMode.customShopCounter++}`;
    STATE.shopStock[uniqueId] = {
      ...item,
      id: uniqueId,
      unlockWave: wave,
      persistent: item.persistent !== false
    };
  }
  refreshShopPanelUi();
  updateTestModeStatus(`${item.name || '商品'} を追加しました`);
}

function addSelectedShopPreset() {
  const select = getEl('testShopPresetSelect');
  if (!select) return;
  const presets = JSON.parse(select.dataset.testPresets || '[]');
  const preset = presets[Number(select.value || 0)];
  if (!preset) return;
  const qty = Math.max(1, Number(getEl('testShopPresetQty')?.value || 1));
  addShopItemToTestStock(preset, qty);
}

function addCustomShopItemFromPanel() {
  const item = {
    id: 'custom_test_shop',
    name: getEl('testShopCustomName')?.value || 'テスト商品',
    desc: getEl('testShopCustomDesc')?.value || '',
    effect: getEl('testShopCustomEffect')?.value || 'heal',
    value: Number(getEl('testShopCustomValue')?.value || 0),
    price: Math.max(0, Number(getEl('testShopCustomPrice')?.value || 0)),
    persistent: (getEl('testShopCustomPersistent')?.value || 'true') === 'true'
  };
  addShopItemToTestStock(item, 1);
}

function clearTestShopStock() {
  ensureShopStateForTest();
  STATE.shopStock = {};
  STATE.shopPurchased = {};
  STATE.shopUnlockedWaves = {};
  refreshShopPanelUi();
  updateTestModeStatus('ショップ在庫をクリアしました');
}

function changeGoldByPanel(sign) {
  if (!STATE.player) return;
  const delta = Math.max(0, Number(getEl('testGoldDelta')?.value || 0));
  STATE.player.gold = Math.max(0, STATE.player.gold + delta * sign);
  updateHUD();
  updateTestModeStatus(`Goldを${sign > 0 ? '加算' : '減算'}しました`);
}

function setGoldByPanel() {
  if (!STATE.player) return;
  STATE.player.gold = Math.max(0, Number(getEl('testGoldSet')?.value || 0));
  updateHUD();
  updateTestModeStatus('Goldを設定しました');
}

function updateHUD() {
  if (typeof refreshTestModeAvailability === 'function') refreshTestModeAvailability();

  const p = STATE.player;
  if (!p) {
    updateAutoBatchHudUi();
    return;
  }

  const hpText = getEl("hpText");
  const hpBar = getEl("hpBar");
  const xpText = getEl("xpText");
  const waveText = getEl("waveText");
  const goldText = getEl("goldText");
  const scoreText = getEl("scoreText");
  const xpBar = getEl("xpBar");
  const weaponBar = getEl("weaponBar");

  const hpRatio = p.maxHp > 0 ? clamp(p.hp / p.maxHp, 0, 1) : 0;
  const maxWave = Math.max(1, Array.isArray(STATE.waveData?.waves) ? STATE.waveData.waves.length : 1);
  const currentWave = Math.max(1, Number(STATE.currentWave || 1));
  const auto = typeof getAutoPlayState === "function" ? getAutoPlayState() : null;

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

  if (xpText) {
    if (!STATE.uiSimple && auto && auto.batchRunning) {
      xpText.textContent = `Lv ${p.level} / Auto ${Math.max(1, auto.batchRunIndex || 1)} / ${Math.max(1, auto.batchTargetRuns || 1)}`;
    } else {
      xpText.textContent = `Lv ${p.level}`;
    }
  }

  if (waveText) {
    waveText.textContent = `Wave ${currentWave} / ${maxWave}`;
  }

  if (goldText) {
    goldText.textContent = `Gold ${Math.floor(p.gold)}`;
  }

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
  updateAutoBatchHudUi();
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
  STATE._chestEvolutionPrevPaused = !!STATE.paused;
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
  STATE.paused = !!STATE._chestEvolutionPrevPaused;
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
    
      const growthBtn = def?.evolutions?.length
        ? `<button class="miniBtn" type="button" data-open-passive-growth="1" data-passive-id="${passiveId}">成長表</button>`
        : "";
    
      return `
        <div class="detailEntryBlock">
          <div class="detailEntry">
            <div class="detailName">${def?.name || passiveId}</div>
            <div class="detailValue">Lv${lv} ${growthBtn}</div>
          </div>
          ${def?.evolutions?.length ? `<div class="detailSub detailSubAccent">${buildPassiveEvolutionHintText(def, lv)}</div>` : ""}
        </div>`;
    }).join("");

    getEl("passiveDetailList")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-passive-growth]");
      if (!btn) return;
      openPassiveGrowth(btn.dataset.passiveId);
    });

    passiveDetailList.innerHTML = `${passiveHtml}
      <div class="detailEntry">
        <div class="detailName">リロール券</div>
        <div class="detailValue">${p.rerollTickets || 0}枚</div>
      </div>`;
  }
}

function buildPassiveEvolutionHintText(def, lv) {
  if (!def?.evolutions?.length) return "";

  const stage = getPassiveEvolutionStage(def.id);
  const branchId = getPassiveBranchId(def.id);

  if (stage <= 0) {
    const needList = def.evolutions
      .map((e) => `Lv${Math.max(3, lv)} + ${getPassiveDisplayName(e.needsPassive)}`)
      .join(" / ");
    return `進化ヒント: ${needList}`;
  }

  if (stage === 1) {
    const branch = def.evolutions.find((e) => e.branchId === branchId);
    if (branch?.secondStage) {
      return `第2進化ヒント: Lv${Math.max(4, lv)} + ${getPassiveDisplayName(branch.secondStage.needsPassive)}`;
    }
  }

  return "最終進化済み";
}

function openPassiveGrowth(passiveId) {
  const screen = getEl("weaponGrowthScreen");
  const content = getEl("weaponGrowthContent");
  const def = getPassiveDef(passiveId);
  if (!screen || !content || !def) return;
  if (isScreenVisible("weaponGrowthScreen") && STATE._weaponGrowthPassiveId === passiveId) return;

  STATE._weaponGrowthPrevPaused = !!STATE.paused;
  STATE._weaponGrowthPassiveId = passiveId;
  STATE._weaponGrowthWeaponId = null;
  STATE.paused = true;
  content.innerHTML = buildPassiveGrowthTreeHtml(passiveId);
  showScreen("weaponGrowthScreen");
}

function buildPassiveGrowthTreeHtml(passiveId) {
  const def = getPassiveDef(passiveId);
  if (!def) return `<div class="growthEmpty">データがありません。</div>`;

  const instStage = getPassiveEvolutionStage(passiveId);
  const instBranchId = getPassiveBranchId(passiveId);
  const stages = def.balance?.stages || [];
  const branches = def.evolutions || [];

  let html = `
    <div class="growthTreeRoot">
      <div class="growthRootBlock">
        ${buildGrowthNodeHtml(
          "パッシブ",
          def.name,
          def.growthDesc || def.desc || "",
          (stages[0]?.levelLabels || []).map((label, i) => `Lv${i + 1}: ${label}`).join("<br>"),
          instStage <= 0,
          "growthStage0"
        )}
      </div>
      <div class="growthBranchRow">`;

  if (branches.length === 0) {
    html += `<div class="growthEmpty">このパッシブには進化先がまだ設定されていません。</div>`;
  }

  for (const branch of branches) {
    const stage1Active = instStage >= 1 && (!instBranchId || instBranchId === branch.branchId);
    const stage2Active = instStage >= 2 && (!instBranchId || instBranchId === branch.branchId);
    const stage1Def = stages.find((s) => s.key === "evolution1");
    const stage2Def = stages.find((s) => s.key === "evolution2");

    html += `
      <div class="growthBranchColumn">
        <div class="growthBranchConnector"></div>
        ${buildGrowthNodeHtml(
          "第1進化",
          branch.name || "進化",
          `条件: ${getPassiveDisplayName(branch.needsPassive)}`,
          (stage1Def?.levelLabels || []).map((label, i) => `Lv${i + 1}: ${label}`).join("<br>"),
          stage1Active,
          "growthStage1"
        )}`;

    if (branch.secondStage) {
      html += `
        <div class="growthChildConnector"></div>
        ${buildGrowthNodeHtml(
          "第2進化",
          branch.secondStage.name || "第2進化",
          `条件: ${getPassiveDisplayName(branch.secondStage.needsPassive)}`,
          (stage2Def?.levelLabels || []).map((label, i) => `Lv${i + 1}: ${label}`).join("<br>"),
          stage2Active,
          "growthStage2"
        )}`;
    }

    html += `</div>`;
  }

  html += `
      </div>
    </div>`;

  return html;
}

function getPassiveDisplayName(id) {
  const def = getPassiveDef(id);
  return def?.name || id || "なし";
}

function renderWeaponSelect() {
  const list = getEl("weaponSelectList");
  if (!list) return;

  ensureWeaponSelectStyles();

  const weapons = STATE.gameData?.weapons || [];
  list.innerHTML = "";

  for (const w of weapons) {
    const unlocked = isWeaponUnlocked(w.id);
    const btn = document.createElement("button");
    btn.className = `choiceBtn weaponSelectBtn ${unlocked ? "" : "lockedChoice"}`;
    btn.type = "button";
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
  const neededPassives = collectNeededEvolutionPassives();

  const passiveCandidates = (STATE.gameData?.passives || [])
    .filter(p => canLevelPassive(p.id))
    .sort((a, b) => (neededPassives.get(b.id) || 0) - (neededPassives.get(a.id) || 0));

  const weaponEvolutions = typeof getAvailableEvolutions === "function" ? getAvailableEvolutions() : [];
  const passiveEvolutions = typeof getAvailablePassiveEvolutions === "function" ? getAvailablePassiveEvolutions() : [];

  if (weaponEvolutions.length > 0) {
    choices.push(buildEvolutionLevelUpChoice(weaponEvolutions[0]));
  } else if (passiveEvolutions.length > 0) {
    choices.push(buildPassiveEvolutionLevelUpChoice(passiveEvolutions[0]));
  }

  const priorityPassive = passiveCandidates.find(p => (neededPassives.get(p.id) || 0) > 0);
  if (priorityPassive) {
    const lv = getPassiveLevel(priorityPassive.id);
    choices.push({
      type: "passive",
      key: `passive_${priorityPassive.id}`,
      name: priorityPassive.name,
      desc: priorityPassive.effectDesc || priorityPassive.desc || "",
      meta: `Lv${lv} → Lv${lv + 1} / 進化条件に関連`,
      apply() {
        return addPassive(priorityPassive.id);
      }
    });
  }

  shuffle(weaponCandidates);

  const weightedPassives = passiveCandidates.filter(p => !priorityPassive || p.id !== priorityPassive.id);
  const high = weightedPassives.filter(p => (neededPassives.get(p.id) || 0) > 0);
  const low = weightedPassives.filter(p => (neededPassives.get(p.id) || 0) <= 0);
  shuffle(high);
  shuffle(low);
  const passivePool = [...high, ...low];

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

  for (const p of passivePool.slice(0, 6)) {
    const lv = getPassiveLevel(p.id);
    const levelDesc = Array.isArray(p.levelDesc)
      ? (p.levelDesc[lv] || p.effectDesc || p.desc || "")
      : (p.effectDesc || p.desc || "");

    choices.push({
      type: "passive",
      key: `passive_${p.id}`,
      name: p.name,
      desc: levelDesc,
      meta: `Lv${lv} → Lv${lv + 1}${(neededPassives.get(p.id) || 0) > 0 ? " / 進化条件に関連" : ""}`,
      apply() {
        return addPassive(p.id);
      }
    });
  }

  const uniq = [];
  const used = new Set();
  for (const c of choices) {
    if (used.has(c.key)) continue;
    used.add(c.key);
    uniq.push(c);
  }

  const result = [];
  const evoChoices = uniq.filter(c => c.type === "evolution");
  const others = uniq.filter(c => c.type !== "evolution");
  shuffle(others);

  if (evoChoices.length > 0) result.push(evoChoices[0]);

  for (const c of others) {
    if (result.length >= 3) break;
    result.push(c);
  }

  if (result.length === 0) {
    result.push({
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

  return result.slice(0, 3);
}

function collectNeededEvolutionPassives() {
  const out = new Map();

  // 武器進化条件
  for (const w of STATE.player?.weapons || []) {
    const def = getWeaponDef(w.id);
    if (!def) continue;

    const stage = w.evolutionStage || 0;
    const branches = getWeaponEvolutionBranches(def);

    if (stage === 0 && w.level >= 2) {
      for (const evo of branches) {
        if (evo.needsPassive && getPassiveLevel(evo.needsPassive) <= 0) {
          out.set(evo.needsPassive, (out.get(evo.needsPassive) || 0) + (w.level >= 3 ? 4 : 2));
        }
      }
    }

    if (stage === 1 && w.level >= 3) {
      const branch = branches.find(x => x.branchId === w.branchId);
      const need = branch?.secondStage?.needsPassive;
      if (need && getPassiveLevel(need) <= 0) {
        out.set(need, (out.get(need) || 0) + (w.level >= 4 ? 5 : 3));
      }
    }
  }

  // ドローン進化条件
  for (const passiveId of ["attack_drone", "barrier_drone"]) {
    const def = getPassiveDef(passiveId);
    const lv = getPassiveLevel(passiveId);
    if (!def || lv <= 0 || !Array.isArray(def.evolutions)) continue;

    const stage = getPassiveEvolutionStage(passiveId);

    if (stage === 0 && lv >= 2) {
      for (const evo of def.evolutions) {
        if (evo.needsPassive && getPassiveLevel(evo.needsPassive) <= 0) {
          out.set(evo.needsPassive, (out.get(evo.needsPassive) || 0) + (lv >= 3 ? 4 : 2));
        }
      }
    }

    if (stage === 1 && lv >= 3) {
      const branch = getPassiveBranchDef(passiveId, getPassiveBranchId(passiveId));
      const need = branch?.secondStage?.needsPassive;
      if (need && getPassiveLevel(need) <= 0) {
        out.set(need, (out.get(need) || 0) + (lv >= 4 ? 5 : 3));
      }
    }
  }

  return out;
}

function ensureLevelUpChoiceStyles() {
  if (document.getElementById("levelUpChoiceStyle")) return;

  const style = document.createElement("style");
  style.id = "levelUpChoiceStyle";
  style.textContent = `
    .levelUpChoiceCard {
      text-align:left;
      display:block;
      padding:12px 12px 14px;
      min-height:0;
      height:auto;
      overflow:hidden;
      box-sizing:border-box;
    }

    .levelUpChoiceInner {
      display:grid;
      grid-template-columns:64px minmax(0, 1fr);
      gap:12px;
      align-items:start;
      min-width:0;
    }

    .levelUpChoiceIcon {
      width:56px;
      height:56px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.08);
      background:rgba(255,255,255,0.04);
      image-rendering:pixelated;
      image-rendering:crisp-edges;
      flex:0 0 auto;
    }

    .levelUpChoiceIconPlaceholder {
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:11px;
      font-weight:800;
      color:#d9f7ff;
      letter-spacing:0.04em;
    }

    .levelUpChoiceText {
      min-width:0;
      display:grid;
      gap:4px;
      align-content:start;
    }

    .levelUpChoiceText .choiceTitle,
    .levelUpChoiceText .choiceDesc,
    .levelUpChoiceText .choiceMeta {
      min-width:0;
      overflow-wrap:anywhere;
      word-break:break-word;
      white-space:normal;
    }

    @media (max-width: 640px) {
      .levelUpChoiceCard {
        padding:12px 12px 16px;
      }

      .levelUpChoiceInner {
        grid-template-columns:1fr;
        gap:10px;
      }

      .levelUpChoiceIcon {
        justify-self:start;
      }
    }
  `;
  document.head.appendChild(style);
}

function getLevelUpChoiceWeaponDef(choice) {
  if (!choice) return null;

  if (choice.type === "weapon" && choice.key?.startsWith("weapon_")) {
    const weaponId = choice.key.slice("weapon_".length);
    return getWeaponDef(weaponId);
  }

  if (choice.type === "evolution") {
    if (choice.weaponId) {
      return getWeaponDef(choice.weaponId);
    }

    if (choice.key?.startsWith("evolution_")) {
      const weaponId = choice.key.slice("evolution_".length).split("_")[0];
      return getWeaponDef(weaponId);
    }
  }

  return null;
}

function renderLevelUpChoices() {
  const wrap = getEl("levelUpChoices");
  if (!wrap) return;

  ensureLevelUpChoiceStyles();

  wrap.innerHTML = "";
  const choices = buildLevelUpChoices();
  STATE._levelUpChoices = choices;

  for (const c of choices) {
    const btn = document.createElement("button");
    btn.className = "choiceBtn levelUpChoiceCard";

    const weaponDef = getLevelUpChoiceWeaponDef(c);
    const hasWeaponIcon = !!weaponDef;

    const iconHtml = hasWeaponIcon
      ? `<canvas class="levelUpChoiceIcon" data-levelup-weapon-icon="${weaponDef.iconIndex || 0}" width="56" height="56"></canvas>`
      : `<div class="levelUpChoiceIcon levelUpChoiceIconPlaceholder">${c.type === "passive" ? "装備" : c.type === "gold" ? "GOLD" : "選択"}</div>`;

    btn.innerHTML = `
      <div class="levelUpChoiceInner">
        ${iconHtml}
        <div class="levelUpChoiceText">
          <div class="choiceTitle">${c.name}</div>
          <div class="choiceDesc">${c.desc || ""}</div>
          <div class="choiceMeta">${c.meta || ""}</div>
        </div>
      </div>
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

  wrap.querySelectorAll("canvas[data-levelup-weapon-icon]").forEach((canvas) => {
    drawWeaponIconToCanvas(canvas, Number(canvas.dataset.levelupWeaponIcon || 0));
  });

  updateLevelUpRerollButton();

  if (STATE.testMode?.enabled) {
    tryAutoResolveLevelUpForTest();
  }
}

function tryAutoResolveLevelUpForTest() {
  if (!STATE.testMode?.enabled) return false;
  if (!STATE.testMode.autoSkipLevelUp && !STATE.testMode.skipNextLevelUp) return false;

  const choices = STATE._levelUpChoices || [];
  const choice = typeof chooseAutoLevelUpChoice === "function"
    ? chooseAutoLevelUpChoice(choices)
    : choices[0];

  if (!choice || typeof choice.apply !== 'function') return false;

  const ok = choice.apply();
  if (!ok) return false;

  STATE.levelUpQueue = Math.max(0, STATE.levelUpQueue - 1);
  STATE.testMode.skipNextLevelUp = false;

  if (STATE.levelUpQueue > 0) {
    renderLevelUpChoices();
  } else {
    closeLevelUp();
  }

  updateHUD();
  return true;
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

  if (STATE.testMode?.enabled) {
    tryAutoResolveLevelUpForTest();
  }
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
