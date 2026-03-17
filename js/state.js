// ===============================
// グローバルゲーム状態
// ===============================

const STATE = {

  // ----------------
  // ゲーム状態
  // ----------------

  screen: "title",
  paused: true,
  clear: false,
  isGameClear: false,

  time: 0,
  delta: 0,

  // ----------------
  // UI
  // ----------------

  uiSimple: true,

  // ----------------
  // スコア
  // ----------------

  score: 0,

  // ----------------
  // データ
  // ----------------

  gameData: null,
  mapData: null,
  waveData: null,
  baseShopPriceMul: 1,

  // ----------------
  // アセット
  // ----------------

  assets: {},
  progress: null,

  // ----------------
  // テストモード
  // ----------------


  testMode: {
    available: false,
    enabled: false,
    pendingStart: false,
    panelOpen: false,
    panelPrevPaused: false,
    customShopCounter: 0,
    enemySpawner: {
      enabled: false,
      pauseNormalWaves: true,
      interval: 1.0,
      count: 3,
      timer: 0,
      minDist: 320,
      maxDist: 460,
      selectedEnemyIds: []
    },
    autoSkipLevelUp: false,
    skipNextLevelUp: false,
    customShopCounter: 0
  },


  // ----------------
  // 入力
  // ----------------

  input: {
    keys: {},
    moveX: 0,
    moveY: 0,
    pointerId: null,
    joystickActive: false,
    joystickCenterX: 0,
    joystickCenterY: 0
  },

  // ----------------
  // ワールド
  // ----------------

  world: {
    width: 2400,
    height: 2400
  },

  // ----------------
  // カメラ
  // ----------------

  camera: {
    x: 0,
    y: 0
  },

  // ----------------
  // ゲームオブジェクト
  // ----------------

  player: null,
  drones: [],

  enemies: [],
  enemyBullets: [],
  bullets: [],
  effects: [],
  xpGems: [],
  chests: [],
  mapCoins: [],

  // ----------------
  // Wave
  // ----------------

  currentWave: 1,
  elapsed: 0,

  // ----------------
  // レベルアップ
  // ----------------

  levelUpQueue: 0,

  // ----------------
  // ショップ
  // ----------------

  shopOpen: false,
  lastShopWave: 0,
  shopVacuumBoughtByWave: {},
  shopSession: {
    startHp: 0,
    startMaxHp: 0,
    allowedHeal: 0,
    allowedMaxHp: 0
  },

  // ----------------
  // ボスイベント / 危険地帯
  // ----------------

  bossEvent: {
    active: false,
    bossId: null,
    bossName: "",
    warningTimer: 0,
    warningText: "",
    hazardTimer: 0
  },
  hazards: [],
  ambientBubbles: [],

  // ----------------
  // スコアボーナス
  // ----------------

  scoreState: {
    noDamageTimer: 0,
    noDamageTier: 0,
    killChainTimer: 0,
    killChainCount: 0,
    popupTimer: 0,
    popupText: ""
  },

};