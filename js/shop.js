// ===============================
// ショップ
// ===============================

const SHOP_WAVE_DEFS = buildDefaultShopWaveDefs();

function buildDefaultShopWaveDefs() {
  return normalizeShopWaveDefs({
    1: [
      { id: 'w1_heal_20_1', name: 'HP回復 +20', desc: 'HPを20回復する。', effect: 'heal', value: 20, price: 25, persistent: true },
      { id: 'w1_max_hp_10_1', name: '最大HP +10', desc: '最大HPを10増やし、同時に回復する。', effect: 'maxHp', value: 10, price: 25, persistent: true },
      { id: 'w1_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w1_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    2: [
      { id: 'w2_heal_20_1', name: 'HP回復 +20', desc: 'HPを20回復する。', effect: 'heal', value: 20, price: 25, persistent: true },
      { id: 'w2_max_hp_10_1', name: '最大HP +10', desc: '最大HPを10増やし、同時に回復する。', effect: 'maxHp', value: 10, price: 25, persistent: true },
      { id: 'w2_weapon_gain_1', name: '武器獲得', desc: '持っていない武器をランダムで1個取得する。', effect: 'weaponGain', value: 1, price: 100, persistent: true },
      { id: 'w2_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w2_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    3: [
      { id: 'w3_heal_20_1', name: 'HP回復 +20', desc: 'HPを20回復する。', effect: 'heal', value: 20, price: 25, persistent: true },
      { id: 'w3_max_hp_10_1', name: '最大HP +10', desc: '最大HPを10増やし、同時に回復する。', effect: 'maxHp', value: 10, price: 25, persistent: true },
      { id: 'w3_weapon_gain_1', name: '武器獲得', desc: '持っていない武器をランダムで1個取得する。', effect: 'weaponGain', value: 1, price: 100, persistent: true },
      { id: 'w3_passive_gain_1', name: '装備獲得', desc: '持っていない装備をランダムで1個取得する。', effect: 'passiveGain', value: 1, price: 100, persistent: true },
      { id: 'w3_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w3_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    4: [
      { id: 'w4_heal_50_1', name: 'HP回復 +50', desc: 'HPを50回復する。', effect: 'heal', value: 50, price: 60, persistent: true },
      { id: 'w4_max_hp_20_1', name: '最大HP +20', desc: '最大HPを20増やし、同時に回復する。', effect: 'maxHp', value: 20, price: 60, persistent: true },
      { id: 'w4_weapon_gain_1', name: '武器獲得', desc: '持っていない武器をランダムで1個取得する。', effect: 'weaponGain', value: 1, price: 100, persistent: true },
      { id: 'w4_passive_gain_1', name: '装備獲得', desc: '持っていない装備をランダムで1個取得する。', effect: 'passiveGain', value: 1, price: 100, persistent: true },
      { id: 'w4_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w4_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    5: [
      { id: 'w5_heal_50_1', name: 'HP回復 +50', desc: 'HPを50回復する。', effect: 'heal', value: 50, price: 60, persistent: true },
      { id: 'w5_max_hp_20_1', name: '最大HP +20', desc: '最大HPを20増やし、同時に回復する。', effect: 'maxHp', value: 20, price: 60, persistent: true },
      { id: 'w5_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w5_passive_gain_1', name: '装備獲得', desc: '持っていない装備をランダムで1個取得する。', effect: 'passiveGain', value: 1, price: 100, persistent: true },
      { id: 'w5_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w5_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w5_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    6: [
      { id: 'w6_heal_50_1', name: 'HP回復 +50', desc: 'HPを50回復する。', effect: 'heal', value: 50, price: 60, persistent: true },
      { id: 'w6_max_hp_20_1', name: '最大HP +20', desc: '最大HPを20増やし、同時に回復する。', effect: 'maxHp', value: 20, price: 60, persistent: true },
      { id: 'w6_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w6_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w6_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w6_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    7: [
      { id: 'w7_heal_100_1', name: 'HP回復 +100', desc: 'HPを100回復する。', effect: 'heal', value: 100, price: 150, persistent: true },
      { id: 'w7_max_hp_40_1', name: '最大HP +40', desc: '最大HPを40増やし、同時に回復する。', effect: 'maxHp', value: 40, price: 150, persistent: true },
      { id: 'w7_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w7_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w7_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w7_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    8: [
      { id: 'w8_heal_100_1', name: 'HP回復 +100', desc: 'HPを100回復する。', effect: 'heal', value: 100, price: 150, persistent: true },
      { id: 'w8_max_hp_40_1', name: '最大HP +40', desc: '最大HPを40増やし、同時に回復する。', effect: 'maxHp', value: 40, price: 150, persistent: true },
      { id: 'w8_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w8_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w8_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w8_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    9: [
      { id: 'w9_heal_100_1', name: 'HP回復 +100', desc: 'HPを100回復する。', effect: 'heal', value: 100, price: 150, persistent: true },
      { id: 'w9_max_hp_40_1', name: '最大HP +40', desc: '最大HPを40増やし、同時に回復する。', effect: 'maxHp', value: 40, price: 150, persistent: true },
      { id: 'w9_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w9_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w9_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w9_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    10: [
      { id: 'w10_heal_200_1', name: 'HP回復 +200', desc: 'HPを200回復する。', effect: 'heal', value: 200, price: 350, persistent: true },
      { id: 'w10_max_hp_80_1', name: '最大HP +80', desc: '最大HPを80増やし、同時に回復する。', effect: 'maxHp', value: 80, price: 350, persistent: true },
      { id: 'w10_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w10_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w10_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w10_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    11: [
      { id: 'w11_heal_200_1', name: 'HP回復 +200', desc: 'HPを200回復する。', effect: 'heal', value: 200, price: 350, persistent: true },
      { id: 'w11_max_hp_80_1', name: '最大HP +80', desc: '最大HPを80増やし、同時に回復する。', effect: 'maxHp', value: 80, price: 350, persistent: true },
      { id: 'w11_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w11_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w11_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w11_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    12: [
      { id: 'w12_heal_200_1', name: 'HP回復 +200', desc: 'HPを200回復する。', effect: 'heal', value: 200, price: 350, persistent: true },
      { id: 'w12_max_hp_80_1', name: '最大HP +80', desc: '最大HPを80増やし、同時に回復する。', effect: 'maxHp', value: 80, price: 350, persistent: true },
      { id: 'w12_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w12_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w12_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w12_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    13: [
      { id: 'w13_heal_500_1', name: 'HP回復 +500', desc: 'HPを500回復する。', effect: 'heal', value: 500, price: 500, persistent: true },
      { id: 'w13_max_hp_200_1', name: '最大HP +200', desc: '最大HPを200増やし、同時に回復する。', effect: 'maxHp', value: 200, price: 1000, persistent: true },
      { id: 'w13_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w13_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w13_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w13_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    14: [
      { id: 'w14_heal_500_1', name: 'HP回復 +500', desc: 'HPを500回復する。', effect: 'heal', value: 500, price: 500, persistent: true },
      { id: 'w14_max_hp_200_1', name: '最大HP +200', desc: '最大HPを200増やし、同時に回復する。', effect: 'maxHp', value: 200, price: 1000, persistent: true },
      { id: 'w14_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w14_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w14_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w14_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ],
    15: [
      { id: 'w15_heal_500_1', name: 'HP回復 +500', desc: 'HPを500回復する。', effect: 'heal', value: 500, price: 500, persistent: true },
      { id: 'w15_max_hp_200_1', name: '最大HP +200', desc: '最大HPを200増やし、同時に回復する。', effect: 'maxHp', value: 200, price: 1000, persistent: true },
      { id: 'w15_weapon_upgrade_1', name: '武器強化', desc: '進化前の武器を1つ選び、1段階強化する。', effect: 'weaponUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w15_passive_upgrade_1', name: '装備強化', desc: '装備を1つ選び、1段階強化する。', effect: 'passiveUpgrade', value: 1, price: 150, persistent: true },
      { id: 'w15_absorb_xp_1', name: 'XP全回収', desc: '画面上のXPをすべて吸収する。', effect: 'absorbXp', value: 1, price: 40, persistent: false },
      { id: 'w15_reroll_1', name: 'リロール券', desc: 'レベルアップ選択肢を引き直す。', effect: 'reroll', value: 1, price: 25, persistent: true }
    ]
  });
}

function makeShopStock(id, name, desc, effect, value, price, persistent) {
  return { id, name, desc, effect, value, price, persistent: !!persistent };
}

function normalizeShopWaveDefs(source) {
  if (!source || typeof source !== 'object') return null;
  const out = {};

  for (const [waveKey, items] of Object.entries(source)) {
    const wave = Number(waveKey);
    if (!Number.isFinite(wave) || wave <= 0 || !Array.isArray(items)) continue;

    out[wave] = items
      .map((item, index) => normalizeShopItem(item, wave, index))
      .filter(Boolean);
  }

  return Object.keys(out).length > 0 ? out : null;
}

function normalizeShopItem(item, wave, index) {
  if (!item || typeof item !== 'object') return null;

  const id = String(item.id || `wave${wave}_item${index + 1}`);
  const name = String(item.name || `商品 ${index + 1}`);
  const desc = String(item.desc || '');
  const effect = String(item.effect || '');
  const value = Number(item.value || 0);
  const price = Math.max(0, Number(item.price || 0));
  const persistent = !!item.persistent;

  if (!effect) return null;
  return { id, name, desc, effect, value, price, persistent };
}

function getConfiguredShopWaveDefs() {
  const external = normalizeShopWaveDefs(STATE.shopItemsData?.shopWaves);
  if (external) return external;

  const embedded = normalizeShopWaveDefs(STATE.gameData?.shopConfig?.shopWaves);
  if (embedded) return embedded;

  return SHOP_WAVE_DEFS;
}

function ensureShopRunState() {
  STATE.shopStock = STATE.shopStock || {};
  STATE.shopPurchased = STATE.shopPurchased || {};
  STATE.shopUnlockedWaves = STATE.shopUnlockedWaves || {};
  STATE.shopSelectionOpen = !!STATE.shopSelectionOpen;
}

function getCurrentShopWave() {
  const explicitWave = Number(STATE.shopWave || 0);
  if (Number.isFinite(explicitWave) && explicitWave > 0) return Math.floor(explicitWave);

  const currentWave = Math.max(1, Number(STATE.currentWave || 1));
  return Math.max(1, currentWave - 1);
}

function getShopItems() {
  ensureShopRunState();
  syncShopInventoryForWave(getCurrentShopWave());
  return getDisplayShopItems();
}

function calcShopPrice(item) {
  return item ? Math.max(0, Number(item.price || 0)) : 0;
}

function syncShopInventoryForWave(waveIndex) {
  ensureShopRunState();
  const wave = Math.max(1, Number(waveIndex || 1));
  const defsByWave = getConfiguredShopWaveDefs();

  for (let i = 1; i <= wave; i++) {
    if (STATE.shopUnlockedWaves[i]) continue;
    STATE.shopUnlockedWaves[i] = true;

    const defs = defsByWave[i] || [];
    for (const def of defs) {
      STATE.shopStock[def.id] = { ...def, unlockWave: i };
    }
  }
}

function getDisplayShopItems() {
  ensureShopRunState();
  const wave = getCurrentShopWave();
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
  STATE.shopWave = getCurrentShopWave();
  syncShopInventoryForWave(STATE.shopWave);

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
  STATE.shopWave = 0;
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

function ensureShopStyles() {
  if (document.getElementById('shopDynamicStyle')) return;
  const style = document.createElement('style');
  style.id = 'shopDynamicStyle';
  style.textContent = `
    .shopPanelHead {
      width:min(92vw, 900px);
      display:grid;
      gap:10px;
      text-align:left;
    }
    .shopPanelCard {
      border:1px solid rgba(120,220,255,0.22);
      border-radius:16px;
      background:rgba(0,18,30,0.92);
      box-shadow:0 10px 30px rgba(0,0,0,0.35);
      padding:12px 14px;
    }
    .shopPanelTitleRow {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }
    .shopPanelTitle {
      font-size:clamp(22px, 3.6vw, 30px);
      font-weight:800;
      letter-spacing:0.02em;
    }
    .shopPanelWave {
      color:#7cf7ff;
      font-size:13px;
      font-weight:700;
      padding:6px 10px;
      border-radius:999px;
      background:rgba(54,212,255,0.14);
      border:1px solid rgba(120,220,255,0.20);
    }
    .shopPanelSub {
      color:#9ed7e8;
      font-size:13px;
      line-height:1.55;
    }
    .shopPanelMetaRow {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }
    .shopBadge {
      font-size:12px;
      line-height:1;
      padding:7px 10px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,0.10);
      background:rgba(255,255,255,0.04);
      color:#eaf8ff;
    }
    .shopBadgeGold {
      color:#ffd166;
      border-color:rgba(255,209,102,0.24);
      background:rgba(255,209,102,0.10);
    }
    .shopBadgeCarry {
      color:#7dff9c;
      border-color:rgba(125,255,156,0.22);
      background:rgba(125,255,156,0.10);
    }
    .shopBadgeLimited {
      color:#ffcf78;
      border-color:rgba(255,207,120,0.22);
      background:rgba(255,207,120,0.10);
    }
    .choiceBtn.shopItemCard {
      gap:8px;
    }
    .shopItemTopRow {
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:10px;
    }
    .shopItemPrice {
      color:#ffd166;
      font-size:15px;
      font-weight:800;
      white-space:nowrap;
    }
    .shopItemBadges {
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      margin-top:2px;
    }
    .shopItemBadge {
      display:inline-flex;
      align-items:center;
      min-height:24px;
      padding:5px 8px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      letter-spacing:0.02em;
      border:1px solid rgba(255,255,255,0.10);
      background:rgba(255,255,255,0.04);
      color:#dff7ff;
    }
    .shopItemBadgeCarry {
      color:#7dff9c;
      border-color:rgba(125,255,156,0.22);
      background:rgba(125,255,156,0.10);
    }
    .shopItemBadgeLimited {
      color:#ffcf78;
      border-color:rgba(255,207,120,0.22);
      background:rgba(255,207,120,0.10);
    }
    .shopItemBadgeNew {
      color:#7cf7ff;
      border-color:rgba(124,247,255,0.24);
      background:rgba(124,247,255,0.10);
    }
    .shopItemBadgeDisabled {
      color:#ff9c9c;
      border-color:rgba(255,156,156,0.22);
      background:rgba(255,156,156,0.10);
    }
    @media (max-width: 640px) {
      .shopPanelTitleRow,
      .shopItemTopRow {
        grid-template-columns:1fr;
        display:grid;
      }
      .shopItemPrice {
        justify-self:start;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureShopHeaderUi() {
  ensureShopStyles();

  const listEl = document.getElementById('shopList');
  if (!listEl || !listEl.parentElement) return null;
  let header = document.getElementById('shopPanelHead');
  if (header) return header;

  header = document.createElement('div');
  header.id = 'shopPanelHead';
  header.className = 'shopPanelHead';
  header.innerHTML = `
    <div class="shopPanelCard">
      <div class="shopPanelTitleRow">
        <div class="shopPanelTitle" id="shopPanelTitle">ショップ</div>
        <div class="shopPanelWave" id="shopWaveLabel">Wave 1</div>
      </div>
      <div class="shopPanelSub" id="shopPanelSub">このWaveで使える品と、次回へ持ち越される品が表示されます。</div>
      <div class="shopPanelMetaRow" id="shopPanelMetaRow"></div>
    </div>
  `;

  listEl.parentElement.insertBefore(header, listEl);
  return header;
}

function updateShopHeaderUi(items) {
  ensureShopHeaderUi();

  const waveEl = document.getElementById('shopWaveLabel');
  const subEl = document.getElementById('shopPanelSub');
  const metaEl = document.getElementById('shopPanelMetaRow');
  if (!waveEl || !subEl || !metaEl) return;

  const wave = getCurrentShopWave();
  const gold = Math.max(0, Number(STATE.player?.gold || 0));

  waveEl.textContent = `Wave ${wave} ショップ`;
  subEl.textContent = `購入すると商品は消えます。所持Goldを見ながら好きな順で購入してください。`;
  metaEl.innerHTML = `<div class="shopBadge shopBadgeGold">所持Gold: ${gold}G</div>`;
}

function getShopItemBadges(item, canBuy) {
  const parts = [];
  if (item.unlockWave === getCurrentShopWave()) {
    parts.push('<span class="shopItemBadge shopItemBadgeNew">このWaveで追加</span>');
  }
  if (item.persistent) {
    parts.push('<span class="shopItemBadge shopItemBadgeCarry">次回にも残る</span>');
  } else {
    parts.push('<span class="shopItemBadge shopItemBadgeLimited">今回限定</span>');
  }
  if (!canBuy) {
    parts.push('<span class="shopItemBadge shopItemBadgeDisabled">購入不可</span>');
  }
  return parts.join('');
}

function renderShop() {
  const listEl = document.getElementById('shopList');
  if (!listEl) return;

  const items = getDisplayShopItems();
  updateShopHeaderUi(items);
  listEl.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'choiceBtn shopItemCard';
    empty.innerHTML = `
      <div class="choiceTitle">売り切れ</div>
      <div class="choiceDesc">このWaveで購入できる品はありません。</div>
      <div class="choiceMeta">次のWaveで新しい商品が追加されます。</div>
    `;
    empty.disabled = true;
    listEl.appendChild(empty);
    return;
  }

  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'choiceBtn shopItemCard';

    const cost = calcShopPrice(item);
    const canBuy = (STATE.player?.gold || 0) >= cost && canBuyShopItem(item);

    btn.innerHTML = `
      <div class="shopItemTopRow">
        <div>
          <div class="choiceTitle">${item.name}</div>
          <div class="choiceDesc">${item.desc || ''}</div>
        </div>
        <div class="shopItemPrice">${cost}G</div>
      </div>
      <div class="shopItemBadges">${getShopItemBadges(item, canBuy)}</div>
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
