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