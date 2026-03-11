// ===============================
// ランキング
// ===============================

const RANKING_KEY = "ocean_survivor_ranking_v1";

function loadRanking() {
  try {
    const raw = localStorage.getItem(RANKING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn("Ranking load failed", e);
    return [];
  }
}

function saveRanking(score) {
  const prevList = loadRanking();
  const prevBest = prevList.length > 0 ? prevList[0].score : 0;

  const entry = {
    score: Math.floor(score || 0),
    date: Date.now()
  };

  const next = [...prevList, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  localStorage.setItem(RANKING_KEY, JSON.stringify(next));

  return {
    isRecord: entry.score > prevBest,
    list: next
  };
}

function clearRanking() {
  localStorage.removeItem(RANKING_KEY);
}

function renderRanking(targetId = "rankingList") {
  const el = document.getElementById(targetId);
  if (!el) return;

  const list = loadRanking();

  if (list.length === 0) {
    el.innerHTML = `<div class="rankRow"><div class="rankPos">-</div><div class="rankDate">記録なし</div><div class="rankScore">0</div></div>`;
    return;
  }

  el.innerHTML = list.map((r, i) => {
    return `
      <div class="rankRow">
        <div class="rankPos">${i + 1}位</div>
        <div class="rankDate">${formatDateJP(r.date)}</div>
        <div class="rankScore">${r.score}点</div>
      </div>
    `;
  }).join("");
}
