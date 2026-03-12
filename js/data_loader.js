// ===============================
// JSONデータロード
// ===============================

async function loadJSON(path) {

  const res = await fetch(path, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("JSON load failed: " + path);
  }

  return await res.json();
}


// ===============================
// 全データロード
// ===============================

async function loadAllData() {

  try {

    const [
      gameData,
      mapData,
      waveData
    ] = await Promise.all([

      loadJSON("data/game_data.json"),
      loadJSON("data/map_data.json"),
      loadJSON("data/wave_data.json")

    ]);

    STATE.gameData = gameData;
    STATE.mapData = mapData;
    STATE.waveData = waveData;
    STATE.baseShopPriceMul = typeof gameData?.shopPriceMul === "number" ? gameData.shopPriceMul : 1;

  } catch (e) {

    console.error("Data load error", e);

  }

}