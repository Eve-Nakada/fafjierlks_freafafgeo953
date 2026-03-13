// ===============================
// 汎用ユーティリティ
// ===============================

// 数値クランプ
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// 線形補間
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 距離
function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

// ランダム
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// 配列ランダム
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 角度
function angle(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// XPテーブル
function requiredXP(level) {
  return Math.floor(5 + level * level * 1.5);
}

// 日付フォーマット
function formatDateJP(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

// 配列シャッフル
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 永続進行
const PROGRESS_KEY = "ocean_survivor_progress_v1";

function getDefaultProgress() {
  return {
    unlockedWeapons: { harpoon: true },
    seenWeapons: { harpoon: true },
    defeatedEnemies: {},
    seenFirstTutorial: false
  };
}

function normalizeProgress(data) {
  const base = getDefaultProgress();
  if (!data || typeof data !== "object") return base;
  return {
    unlockedWeapons: { ...base.unlockedWeapons, ...(data.unlockedWeapons || {}) },
    seenWeapons: { ...base.seenWeapons, ...(data.seenWeapons || {}) },
    defeatedEnemies: { ...base.defeatedEnemies, ...(data.defeatedEnemies || {}) },
    seenFirstTutorial: !!data.seenFirstTutorial
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return normalizeProgress(raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.warn("Progress load failed", e);
    return getDefaultProgress();
  }
}

function saveProgressState() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(normalizeProgress(STATE.progress)));
  } catch (e) {
    console.warn("Progress save failed", e);
  }
}

function ensureProgressState() {
  STATE.progress = normalizeProgress(STATE.progress);
  return STATE.progress;
}

function isWeaponUnlocked(weaponId) {
  return !!ensureProgressState().unlockedWeapons?.[weaponId];
}

function isWeaponSeen(weaponId) {
  return !!ensureProgressState().seenWeapons?.[weaponId];
}

function unlockWeapon(weaponId) {
  if (!weaponId) return;
  const progress = ensureProgressState();
  progress.unlockedWeapons[weaponId] = true;
  progress.seenWeapons[weaponId] = true;
  saveProgressState();
}

function markWeaponSeen(weaponId) {
  if (!weaponId) return;
  const progress = ensureProgressState();
  progress.seenWeapons[weaponId] = true;
  saveProgressState();
}

function isEnemyDefeated(typeId) {
  return !!ensureProgressState().defeatedEnemies?.[typeId];
}

function markEnemyDefeated(typeId) {
  if (!typeId) return;
  const progress = ensureProgressState();
  progress.defeatedEnemies[typeId] = true;
  saveProgressState();
}


function hasSeenFirstTutorial() {
  return !!ensureProgressState().seenFirstTutorial;
}

function markFirstTutorialSeen() {
  const progress = ensureProgressState();
  progress.seenFirstTutorial = true;
  saveProgressState();
}
