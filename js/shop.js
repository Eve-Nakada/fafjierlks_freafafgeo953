// ===============================
// ショップ
// ===============================

const SHOP_WAVE_DEFS = {
  1: [
    makeShopStock('w1_heal_20', 'HP回復 +20', 'HPを20回復する。', 'heal', 20, 25, true),
    makeShopStock('w1_max_hp_10', '最大HP +10', '最大HPを10増やし、同時に回復する。', 'maxHp', 10, 25, true),
    makeShopStock('w1_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false),
    makeShopStock('w1_reroll', 'リロール券', 'レベルアップ選択肢を引き直す。', 'reroll', 1, 25, true)
  ],
  2: [
    makeShopStock('w2_weapon_gain', '武器獲得', '持っていない武器をランダムで1個取得する。', 'weaponGain', 1, 100, true),
    makeShopStock('w2_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  3: [
    makeShopStock('w3_passive_gain', '装備獲得', '持っていない装備をランダムで1個取得する。', 'passiveGain', 1, 100, true),
    makeShopStock('w3_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  4: [
    makeShopStock('w4_heal_50', 'HP回復 +50', 'HPを50回復する。', 'heal', 50, 60, true),
    makeShopStock('w4_max_hp_20', '最大HP +20', '最大HPを20増やし、同時に回復する。', 'maxHp', 20, 60, true),
    makeShopStock('w4_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  5: [
    makeShopStock('w5_weapon_upgrade', '武器強化', '進化前の武器を1つ選び、1段階強化する。', 'weaponUpgrade', 1, 150, true),
    makeShopStock('w5_passive_upgrade', '装備強化', '装備を1つ選び、1段階強化する。', 'passiveUpgrade', 1, 150, true),
    makeShopStock('w5_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  6: [
    makeShopStock('w6_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  7: [
    makeShopStock('w7_heal_100', 'HP回復 +100', 'HPを100回復する。', 'heal', 100, 150, true),
    makeShopStock('w7_max_hp_40', '最大HP +40', '最大HPを40増やし、同時に回復する。', 'maxHp', 40, 150, true),
    makeShopStock('w7_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  8: [
    makeShopStock('w8_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  9: [
    makeShopStock('w9_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  10: [
    makeShopStock('w10_heal_200', 'HP回復 +200', 'HPを200回復する。', 'heal', 200, 350, true),
    makeShopStock('w10_max_hp_80', '最大HP +80', '最大HPを80増やし、同時に回復する。', 'maxHp', 80, 350, true),
    makeShopStock('w10_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  11: [
    makeShopStock('w11_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  12: [
    makeShopStock('w12_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  13: [
    makeShopStock('w13_heal_500', 'HP回復 +500', 'HPを500回復する。', 'heal', 500, 500, true),
    makeShopStock('w13_max_hp_200', '最大HP +200', '最大HPを200増やし、同時に回復する。', 'maxHp', 200, 1000, true),
    makeShopStock('w13_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  14: [
    makeShopStock('w14_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ],
  15: [
    makeShopStock('w15_absorb_xp', 'XP全回収', '画面上のXPをすべて吸収する。', 'absorbXp', 1, 40, false)
  ]
};

function makeShopStock(id, name, desc, effect, value, price, persistent) {
  return { id, name, desc, effect, value, price, persistent: !!persistent };
}

function ensureShopRunState() {
  STATE.shopStock = STATE.shopStock || {};
  STATE.shopPurchased = STATE.shopPurchased || {};
  STATE.shopUnlockedWaves = STATE.shopUnlockedWaves || {};
  STATE.shopSelectionOpen = !!STATE.shopSelectionOpen;
}

function getShopItems() {
  ensureShopRunState();
  syncShopInventoryForWave(STATE.currentWave || 1);
  return getDisplayShopItems();
}

function calcShopPrice(item) {
  return item ? Math.max(0, Number(item.price || 0)) : 0;
}

function syncShopInventoryForWave(waveIndex) {
  ensureShopRunState();
  const wave = Math.max(1, Number(waveIndex || 1));

  for (let i = 1; i <= wave; i++) {
    if (STATE.shopUnlockedWaves[i]) continue;
    STATE.shopUnlockedWaves[i] = true;

    const defs = SHOP_WAVE_DEFS[i] || [];
    for (const def of defs) {
      STATE.shopStock[def.id] = { ...def, unlockWave: i };
    }
  }
}

function getDisplayShopItems() {
  ensureShopRunState();
  const wave = Math.max(1, Number(STATE.currentWave || 1));
  const out = [];

  for (const item of Object.values(STATE.shopStock)) {
    if (!item) continue;
    if (STATE.shopPurchased[item.id]) continue;
    if (!item.persistent && item.unlockWave !== wave) continue;
    out.push(item);
  }

  out.sort((a, b) => {
    if (a.unlockWave !== b.unlockWave) return a.unlockWave - b.unlockWave;
    return a.price - b.price;
  });

  return out;
}

function openShop() {
  ensureShopRunState();
  syncShopInventoryForWave(STATE.currentWave || 1);

  STATE.shopOpen = true;
  STATE.paused = true;
  if (STATE.player) {
    STATE.shopSession = {
      startHp: STATE.player.hp,
      startMaxHp: STATE.player.maxHp,
      allowedHeal: 0,
      allowedMaxHp: 0
    };
  } else {
    STATE.shopSession = { startHp: 0, startMaxHp: 0, allowedHeal: 0, allowedMaxHp: 0 };
  }
  showScreen('shopScreen');
  renderShop();
}

function closeShop() {
  if (STATE.shopSelectionOpen) return;

  if (STATE.player && STATE.shopSession) {
    const baseHp = Math.max(0, STATE.shopSession.startHp || 0);
    const allowedHeal = Math.max(0, STATE.shopSession.allowedHeal || 0);
    const allowedMaxHp = Math.max(0, STATE.shopSession.allowedMaxHp || 0);
    const maxAllowed = Math.min(STATE.player.maxHp, baseHp + allowedHeal + allowedMaxHp);
    STATE.player.hp = Math.min(STATE.player.hp, maxAllowed);
  }
  STATE.shopOpen = false;
  STATE.paused = false;
  hideScreen('shopScreen');
  STATE.shopSession = { startHp: 0, startMaxHp: 0, allowedHeal: 0, allowedMaxHp: 0 };
  updateHUD();
}

function rerollShopChoices() {
  const item = getDisplayShopItems().find((x) => x.effect === 'reroll');
  if (!item || !STATE.player) return false;
  if ((STATE.player.gold || 0) < item.price) return false;
  return buyShopItem(item);
}

function renderShop() {
  const listEl = document.getElementById('shopList');
  if (!listEl) return;

  const items = getDisplayShopItems();
  listEl.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'choiceBtn';
    empty.innerHTML = '<div class="choiceTitle">売り切れ</div><div class="choiceDesc">このWaveで購入できる品はありません。</div>';
    empty.disabled = true;
    listEl.appendChild(empty);
    return;
  }

  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'choiceBtn';

    const cost = calcShopPrice(item);
    const canBuy = (STATE.player?.gold || 0) >= cost && canBuyShopItem(item);
    const remainText = item.persistent ? '次回以降も残る' : 'このWave限定';

    btn.innerHTML = `
      <div class="choiceTitle">${item.name} - ${cost}G</div>
      <div class="choiceDesc">${item.desc || ''}</div>
      <div class="choiceMeta">${remainText}</div>
    `;

    btn.disabled = !canBuy;
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await buyShopItem(item);
      } finally {
        renderShop();
      }
    };

    listEl.appendChild(btn);
  }
}

function canBuyShopItem(item) {
  if (!item || !STATE.player) return false;
  if (STATE.shopPurchased?.[item.id]) return false;

  switch (item.effect) {
    case 'absorbXp':
    case 'reroll':
    case 'heal':
    case 'maxHp':
      return true;
    case 'weaponGain':
      return getRandomMissingWeaponDef() != null;
    case 'passiveGain':
      return getRandomMissingPassiveDef() != null;
    case 'weaponUpgrade':
      return getShopUpgradeableWeapons().length > 0;
    case 'passiveUpgrade':
      return getShopUpgradeablePassives().length > 0;
    default:
      return true;
  }
}

async function buyShopItem(item) {
  if (!item || !STATE.player) return false;

  const cost = calcShopPrice(item);
  if (STATE.player.gold < cost) return false;
  if (!canBuyShopItem(item)) return false;

  STATE.player.gold -= cost;

  let success = true;
  let consumed = true;

  switch (item.effect) {
    case 'heal':
      healPlayer(item.value || 0);
      if (STATE.shopSession) {
        STATE.shopSession.allowedHeal = (STATE.shopSession.allowedHeal || 0) + (item.value || 0);
      }
      break;

    case 'maxHp': {
      const add = Math.max(0, item.value || 0);
      STATE.player.shopMaxHpBonus = (STATE.player.shopMaxHpBonus || 0) + add;
      STATE.player.maxHp += add;
      STATE.player.hp = Math.min(STATE.player.maxHp, STATE.player.hp + add);
      if (STATE.shopSession) {
        STATE.shopSession.allowedMaxHp = (STATE.shopSession.allowedMaxHp || 0) + add;
      }
      break;
    }

    case 'absorbXp':
      absorbAllXP();
      break;

    case 'reroll':
      STATE.player.rerollTickets = (STATE.player.rerollTickets || 0) + (item.value || 1);
      break;

    case 'weaponGain': {
      const pickedWeapon = getRandomMissingWeaponDef();
      success = !!pickedWeapon && addWeapon(pickedWeapon.id);
      break;
    }

    case 'passiveGain': {
      const pickedPassive = getRandomMissingPassiveDef();
      success = !!pickedPassive && addPassive(pickedPassive.id);
      break;
    }

    case 'weaponUpgrade': {
      const pickedWeaponId = await openShopSelectionOverlay({
        title: '武器強化',
        subtitle: '強化する武器を選択してください。キャンセルすると購入されません。',
        options: getShopUpgradeableWeapons().map((def) => ({
          id: def.id,
          title: def.name,
          desc: `Lv${getWeaponDisplayLevel(def.id)} → Lv${getWeaponDisplayLevel(def.id) + 1}`
        }))
      });

      if (!pickedWeaponId) {
        success = false;
        consumed = false;
        break;
      }

      success = addWeapon(pickedWeaponId);
      break;
    }

    case 'passiveUpgrade': {
      const pickedPassiveId = await openShopSelectionOverlay({
        title: '装備強化',
        subtitle: '強化する装備を選択してください。キャンセルすると購入されません。',
        options: getShopUpgradeablePassives().map((def) => ({
          id: def.id,
          title: def.name,
          desc: `Lv${getPassiveLevel(def.id)} → Lv${getPassiveLevel(def.id) + 1}`
        }))
      });

      if (!pickedPassiveId) {
        success = false;
        consumed = false;
        break;
      }

      STATE._suppressImmediateShellHeal = true;
      success = addPassive(pickedPassiveId);
      STATE._suppressImmediateShellHeal = false;
      break;
    }

    default:
      break;
  }

  if (!success) {
    STATE.player.gold += cost;
    updateHUD();
    return false;
  }

  if (consumed) {
    STATE.shopPurchased[item.id] = true;
  }

  STATE.score += 30;
  updateHUD();
  renderShop();
  return true;
}

function getRandomMissingWeaponDef() {
  const candidates = (STATE.gameData?.weapons || []).filter((w) => !isWeaponOwned(w.id));
  return candidates.length > 0 ? pick(candidates) : null;
}

function getRandomMissingPassiveDef() {
  const p = STATE.player;
  if (!p) return null;
  const candidates = (STATE.gameData?.passives || []).filter((passive) => !p.passives.includes(passive.id));
  return candidates.length > 0 ? pick(candidates) : null;
}

function getShopUpgradeableWeapons() {
  return (STATE.gameData?.weapons || []).filter((w) => isWeaponOwned(w.id) && canAddWeapon(w.id) && !isWeaponEvolved(w.id));
}

function getShopUpgradeablePassives() {
  const p = STATE.player;
  if (!p) return [];
  return (STATE.gameData?.passives || []).filter((passive) => p.passives.includes(passive.id) && canLevelPassive(passive.id));
}

function isWeaponOwned(id) {
  const p = STATE.player;
  if (!p) return false;
  if (Array.isArray(p.weapons)) {
    for (const entry of p.weapons) {
      if (entry === id) return true;
      if (entry && typeof entry === 'object' && entry.id === id) return true;
    }
  }
  if (p.weaponLevels && typeof p.weaponLevels[id] === 'number' && p.weaponLevels[id] > 0) return true;
  return false;
}

function isWeaponEvolved(id) {
  const p = STATE.player;
  if (!p || !Array.isArray(p.weapons)) return false;
  const entry = p.weapons.find((w) => w && typeof w === 'object' && w.id === id);
  if (!entry || typeof entry !== 'object') return false;
  return !!(entry.evolved || entry.isEvolved || entry.evolutionApplied || entry.evo || entry.evolvedName);
}

function getWeaponDisplayLevel(id) {
  const p = STATE.player;
  if (!p) return 0;
  if (p.weaponLevels && typeof p.weaponLevels[id] === 'number') return p.weaponLevels[id];
  if (Array.isArray(p.weapons)) {
    const entry = p.weapons.find((w) => (w && typeof w === 'object' ? w.id === id : w === id));
    if (entry && typeof entry === 'object' && typeof entry.level === 'number') return entry.level;
    if (entry) return 1;
  }
  return 0;
}

function ensureShopSelectionStyles() {
  if (document.getElementById('shopSelectionStyle')) return;
  const style = document.createElement('style');
  style.id = 'shopSelectionStyle';
  style.textContent = `
    #shopSelectionOverlay {
      position: absolute;
      inset: 0;
      z-index: 60;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0,0,0,0.56);
    }
    .shopSelectionPanel {
      width: min(92vw, 760px);
      max-height: min(72vh, 620px);
      overflow: auto;
      border: 1px solid rgba(120,220,255,0.22);
      border-radius: 16px;
      background: rgba(0,18,30,0.96);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      padding: 14px;
      display: grid;
      gap: 10px;
    }
    .shopSelectionTitle { font-size: 22px; font-weight: 700; }
    .shopSelectionSub { color: #9ed7e8; font-size: 13px; line-height: 1.5; }
    .shopSelectionChoices { display: grid; gap: 10px; }
    .shopSelectionCard { text-align: left; }
    .shopSelectionCard .choiceDesc { opacity: 0.95; }
    .shopSelectionCancel { margin-top: 4px; }
  `;
  document.head.appendChild(style);
}

function openShopSelectionOverlay({ title, subtitle, options }) {
  ensureShopSelectionStyles();
  STATE.shopSelectionOpen = true;

  return new Promise((resolve) => {
    const old = document.getElementById('shopSelectionOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'shopSelectionOverlay';

    const panel = document.createElement('div');
    panel.className = 'shopSelectionPanel';

    const titleEl = document.createElement('div');
    titleEl.className = 'shopSelectionTitle';
    titleEl.textContent = title || '選択';

    const subEl = document.createElement('div');
    subEl.className = 'shopSelectionSub';
    subEl.textContent = subtitle || '';

    const choices = document.createElement('div');
    choices.className = 'shopSelectionChoices';

    const finish = (value) => {
      STATE.shopSelectionOpen = false;
      overlay.remove();
      resolve(value || null);
    };

    for (const option of options || []) {
      const btn = document.createElement('button');
      btn.className = 'choiceBtn shopSelectionCard';
      btn.innerHTML = `
        <div class="choiceTitle">${option.title}</div>
        <div class="choiceDesc">${option.desc || ''}</div>
      `;
      btn.onclick = () => finish(option.id);
      choices.appendChild(btn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'choiceBtn shopSelectionCancel';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.onclick = () => finish(null);

    panel.appendChild(titleEl);
    panel.appendChild(subEl);
    panel.appendChild(choices);
    panel.appendChild(cancelBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}
