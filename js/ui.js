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

function setupUI() {
  applyTitleTextToUI();
  applyUiMode();

  const startBtn = getEl("startBtn");
  if (startBtn) {
    startBtn.onclick = () => {
      showScreen("weaponSelectScreen");
      renderWeaponSelect();
    };
  }

  const rankingBtn = getEl("rankingBtn");
  if (rankingBtn) {
    rankingBtn.onclick = () => {
      showScreen("rankingScreen");
      renderRanking("rankingList");
    };
  }

  const rankingBackBtn = getEl("rankingBackBtn");
  if (rankingBackBtn) rankingBackBtn.onclick = () => showScreen("titleScreen");

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

function buildGrowthNodeHtml(title, name, meta1, meta2, active, extraClass = "") {
  return `
    <div class="growthNode ${extraClass} ${active ? "active" : ""}">
      <div class="growthNodeTitle">${title}</div>
      <div class="growthNodeName">${name}</div>
      <div class="growthNodeMeta">${meta1}</div>
      ${meta2 ? `<div class="growthNodeMeta">${meta2}</div>` : ""}
    </div>`;
}

function getPassiveName(id) {
  if (!id) return "なし";
  return getPassiveDef(id)?.name || id;
}

function buildGrowthBranchColumnHtml(branch, inst) {
  const branchMatch = !!inst && inst.branchId === branch.branchId;
  const stage1Active = !!inst && (inst.evolutionStage || 0) >= 1 && branchMatch;
  const stage2Active = !!inst && (inst.evolutionStage || 0) >= 2 && branchMatch;
  const stage1Meta = `条件: ${getPassiveName(branch.needsPassive)}`;
  const stage2 = branch.secondStage || null;

  let html = `
    <div class="growthBranchColumn">
      <div class="growthBranchConnector"></div>
      ${buildGrowthNodeHtml("第1進化", branch.name || "進化", stage1Meta, "Lv1 → Lv6", stage1Active, "growthStage1")}`;

  if (stage2) {
    html += `
      <div class="growthChildConnector"></div>
      ${buildGrowthNodeHtml("第2進化", stage2.name || "第2進化", `条件: ${getPassiveName(stage2.needsPassive)}`, "Lv1 → Lv3", stage2Active, "growthStage2")}`;
  } else {
    html += `
      <div class="growthChildConnector"></div>
      <div class="growthNode growthNodeDisabled">
        <div class="growthNodeTitle">第2進化</div>
        <div class="growthNodeName">未設定</div>
        <div class="growthNodeMeta">この分岐には第2進化がありません</div>
      </div>`;
  }

  html += `</div>`;
  return html;
}

function openWeaponGrowth(weaponId) {
  const screen = getEl("weaponGrowthScreen");
  const content = getEl("weaponGrowthContent");
  const def = getWeaponDef(weaponId);
  const inst = getWeaponInstance(weaponId);
  if (!screen || !content || !def) return false;

  STATE._weaponGrowthPrevPaused = !!STATE.paused;
  STATE.paused = true;

  const branches = getWeaponGrowthBranches(def);
  const rootActive = !!inst && (inst.evolutionStage || 0) === 0;
  const branchHtml = branches.length > 0
    ? branches.map(branch => buildGrowthBranchColumnHtml(branch, inst)).join("")
    : `<div class="growthEmpty">この武器には進化先がまだ設定されていません。</div>`;

  content.innerHTML = `
    <div class="growthTree growthTreeTree">
      <div class="growthTreeHeader">
        <div class="choiceTitle">${def.name}</div>
        <div class="choiceDesc">${getGrowthScreenDescription(def)}</div>
      </div>
      <div class="growthTreeCanvas">
        <div class="growthRootWrap">
          ${buildGrowthNodeHtml("通常", def.name, "Lv1 → Lv6", def.desc || "", rootActive, "growthRoot")}
        </div>
        <div class="growthCenterLine"></div>
        <div class="growthBranchesWrap">${branchHtml}</div>
      </div>
    </div>`;

  showScreen("weaponGrowthScreen");
  return true;
}

function closeWeaponGrowth() {
  hideScreen("weaponGrowthScreen");
  STATE.paused = !!STATE._weaponGrowthPrevPaused;
  updateHUD();
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
    hpText.textContent = `HP ${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`;
    if (hpRatio <= 0.3) hpText.classList.add("hpLow");
    else hpText.classList.remove("hpLow");
  }

  if (xpText) xpText.textContent = `Lv ${p.level}`;
  if (waveText) waveText.textContent = `Wave ${STATE.currentWave}`;
  if (goldText) goldText.textContent = `Gold ${Math.floor(p.gold)}`;
  if (scoreText) scoreText.textContent = `Score ${Math.floor(STATE.score)}`;

  if (xpBar) {
    const need = requiredXP(p.level);
    const ratio = need > 0 ? clamp(p.xp / need, 0, 1) : 0;
    xpBar.style.width = `${ratio * 100}%`;
  }

  if (weaponBar) renderWeaponBar(weaponBar);
  renderDetailLists();
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

  if (weaponDetailList) {
    weaponDetailList.innerHTML = "";
    for (const w of p.weapons) {
      const def = getWeaponDef(w.id);
      const row = document.createElement("div");
      row.className = "detailEntry";

      const name = document.createElement("div");
      name.className = "detailName";
      name.textContent = def?.name || w.id;

      const value = document.createElement("div");
      value.className = "detailValue";

      const label = document.createElement("span");
      label.textContent = getWeaponStageLabel(w);

      const btn = document.createElement("button");
      btn.className = "miniBtn";
      btn.type = "button";
      btn.textContent = "成長表";
      const openGrowth = (ev) => {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        openWeaponGrowth(w.id);
      };
      btn.addEventListener("click", openGrowth);
      btn.addEventListener("pointerup", openGrowth);
      btn.onclick = openGrowth;

      value.appendChild(label);
      value.appendChild(btn);
      row.appendChild(name);
      row.appendChild(value);
      weaponDetailList.appendChild(row);
    }
  }

  if (passiveDetailList) {
    passiveDetailList.innerHTML = "";
    for (const passiveId of p.passives) {
      const def = (STATE.gameData?.passives || []).find(x => x.id === passiveId);
      const lv = p.passiveLevels[passiveId] || 0;
      const row = document.createElement("div");
      row.className = "detailEntry";
      row.innerHTML = `
        <div class="detailName">${def?.name || passiveId}</div>
        <div class="detailValue">Lv${lv}</div>
      `;
      passiveDetailList.appendChild(row);
    }

    const rerollRow = document.createElement("div");
    rerollRow.className = "detailEntry";
    rerollRow.innerHTML = `
      <div class="detailName">リロール券</div>
      <div class="detailValue">${p.rerollTickets || 0}枚</div>
    `;
    passiveDetailList.appendChild(rerollRow);
  }
}


function renderWeaponSelect() {
  const list = getEl("weaponSelectList");
  if (!list) return;

  const weapons = STATE.gameData?.weapons || [];
  list.innerHTML = "";

  for (const w of weapons) {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.innerHTML = `
      <div class="choiceTitle">${w.name}</div>
      <div class="choiceDesc">${w.desc || ""}</div>
      <div class="choiceMeta">初期武器</div>
    `;
    btn.onclick = () => startGame(w.id);
    list.appendChild(btn);
  }
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
      meta: inst ? `Lv${inst.level} → Lv${nextLv}` : "新規武器",
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
