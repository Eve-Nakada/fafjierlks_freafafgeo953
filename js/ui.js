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
  if (rankingBackBtn) {
    rankingBackBtn.onclick = () => showScreen("titleScreen");
  }

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
  if (closeShopBtn) {
    closeShopBtn.onclick = () => closeShop();
  }

  const toggleUIBtn = getEl("toggleUIBtn");
  if (toggleUIBtn) {
    toggleUIBtn.onclick = () => toggleUiMode();
  }

  const absorbXPBtn = getEl("absorbXPBtn");
  if (absorbXPBtn) {
    absorbXPBtn.onclick = () => {
      absorbAllXP();
      updateHUD();
    };
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
  if (scoreText) scoreText.textContent = `Score ${Math.floor(STATE.score)}`;

  if (xpBar) {
    const need = requiredXP(p.level);
    const ratio = need > 0 ? clamp(p.xp / need, 0, 1) : 0;
    xpBar.style.width = `${ratio * 100}%`;
  }

  if (weaponBar) renderWeaponBar(weaponBar);
  renderDetailLists();
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
    lv.textContent = w.evolved ? "EVO" : `Lv${w.level}`;
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
      row.innerHTML = `
        <div class="detailName">${def?.name || w.id}</div>
        <div class="detailValue">${w.evolved ? "進化済み" : `Lv${w.level}`}</div>
      `;
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
}

function openLevelUp() {
  STATE.paused = true;
  showScreen("levelUpScreen");
  renderLevelUpChoices();
}

function closeLevelUp() {
  hideScreen("levelUpScreen");
  STATE.paused = false;
  updateHUD();
}

function rerollLevelUpChoices() {
  if (!isScreenVisible("levelUpScreen")) return false;
  renderLevelUpChoices();
  return true;
}

function showResultScreen(clear, rankingResult) {
  const resultTitle = getEl("resultTitle");
  const resultScore = getEl("resultScore");
  const resultRecord = getEl("resultRecord");

  if (resultTitle) resultTitle.textContent = clear ? "CLEAR" : "GAME OVER";
  if (resultScore) resultScore.textContent = `Score ${Math.floor(STATE.score)}`;
  if (resultRecord) resultRecord.textContent = rankingResult?.isRecord ? "NEW RECORD!" : "";

  renderRanking("resultRanking");
  showScreen("resultScreen");
}
