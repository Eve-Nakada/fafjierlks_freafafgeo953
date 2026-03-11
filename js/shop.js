// ===============================
// ショップ
// ===============================

function getShopItems() {
  return STATE.gameData?.shopItems || [];
}

function getShopPriceMul() {
  const mul = STATE.gameData?.shopPriceMul;
  return typeof mul === "number" ? mul : 1;
}

function setShopPriceMul(v) {
  if (!STATE.gameData) return;
  STATE.gameData.shopPriceMul = v;
}

function calcShopPrice(item) {
  if (!item) return 0;
  if (item.fixedPrice) return item.price || 0;
  return Math.floor((item.price || 0) * getShopPriceMul());
}

function openShop() {
  STATE.shopOpen = true;
  STATE.paused = true;
  showScreen("shopScreen");
  renderShop();
}

function closeShop() {
  STATE.shopOpen = false;
  STATE.paused = false;
  hideScreen("shopScreen");
  updateHUD();
}

function rerollShopChoices() {
  const item = getShopItems().find(x => x.effect === "reroll");
  if (!item) return false;

  const cost = calcShopPrice(item);
  if ((STATE.player?.gold || 0) < cost) return false;

  STATE.player.gold -= cost;
  renderShop(true);
  updateHUD();
  return true;
}

function renderShop(forceShuffle = false) {
  const listEl = document.getElementById("shopList");
  if (!listEl) return;

  const allItems = getShopItems().slice();

  if (!STATE._shopDisplayItems || forceShuffle) {
    const rerollItem = allItems.find(x => x.effect === "reroll") || null;
    const normalItems = allItems.filter(x => x.effect !== "reroll");

    shuffle(normalItems);

    // 常時見せる数
    const picked = normalItems.slice(0, Math.min(5, normalItems.length));

    STATE._shopDisplayItems = rerollItem ? [...picked, rerollItem] : picked;
  }

  listEl.innerHTML = "";

  for (const item of STATE._shopDisplayItems) {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";

    const cost = calcShopPrice(item);
    const canBuy = (STATE.player?.gold || 0) >= cost;

    btn.innerHTML = `
      <div class="choiceTitle">${item.name} - ${cost}G</div>
      <div class="choiceDesc">${item.desc || ""}</div>
      <div class="choiceMeta">${item.fixedPrice ? "固定価格" : "価格倍率対象"}</div>
    `;

    btn.disabled = !canBuy;
    btn.onclick = () => {
      buyShopItem(item);
    };

    listEl.appendChild(btn);
  }
}

function buyShopItem(item) {
  if (!item || !STATE.player) return false;

  const cost = calcShopPrice(item);
  if (STATE.player.gold < cost) return false;

  STATE.player.gold -= cost;

  let success = true;

  switch (item.effect) {
    case "heal":
      healPlayer(item.value || 0);
      break;

    case "maxHp":
      STATE.player.maxHp += item.value || 0;
      STATE.player.hp = Math.min(STATE.player.maxHp, STATE.player.hp + (item.value || 0));
      break;

    case "gold":
      addGold(item.value || 0);
      break;

    case "absorbXp":
      absorbAllXP();
      break;

    case "reroll":
      success = rerollLevelUpChoices();
      break;

    case "weaponLevelUp":
      success = levelUpRandomWeapon();
      break;

    case "passiveLevelUp":
      success = levelUpRandomPassive();
      break;

    default:
      break;
  }

  if (!success) {
    STATE.player.gold += cost;
    return false;
  }

  if (!item.fixedPrice) {
    setShopPriceMul(getShopPriceMul() + 0.5);
  }

  STATE.score += 30;
  renderShop();
  updateHUD();
  return true;
}

function levelUpRandomWeapon() {
  const p = STATE.player;
  if (!p) return false;

  const candidates = (STATE.gameData?.weapons || []).filter(w => canAddWeapon(w.id));
  if (candidates.length === 0) return false;

  const pickedWeapon = pick(candidates);
  return addWeapon(pickedWeapon.id);
}

function levelUpRandomPassive() {
  const candidates = (STATE.gameData?.passives || []).filter(p => canLevelPassive(p.id));
  if (candidates.length === 0) return false;

  const pickedPassive = pick(candidates);
  return addPassive(pickedPassive.id);
}
