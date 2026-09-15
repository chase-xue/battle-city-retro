// 游戏核心常量配置
export const GRID_COLS = 13;
export const GRID_ROWS = 13;
export const SUB_GRID = 2; // 每个大网格分为 2x2 个微格（26x26 微格，用于精准砖块破坏）
export const TILE_SIZE = 32; // 游戏内部逻辑渲染大小（大格 32x32，微格 16x16）
export const STAGE_WIDTH = GRID_COLS * TILE_SIZE; // 416
export const STAGE_HEIGHT = GRID_ROWS * TILE_SIZE; // 416

// 侧边栏/信息栏宽度
export const SIDEBAR_WIDTH = 64;
export const GAME_WIDTH = STAGE_WIDTH + SIDEBAR_WIDTH; // 480
export const GAME_HEIGHT = STAGE_HEIGHT; // 416

// 方向
export const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

export const DIR_OFFSET = [
  { x: 0, y: -1 }, // UP
  { x: 1, y: 0 },  // RIGHT
  { x: 0, y: 1 },  // DOWN
  { x: -1, y: 0 }  // LEFT
];

// 地形类型
export const TILE = {
  EMPTY: 0,
  BRICK: 1,
  IRON: 2,
  FOREST: 3,
  WATER: 4,
  ICE: 5,
  BASE: 6,
  BASE_DESTROYED: 7
};

// 敌方坦克类型
export const ENEMY_TYPE = {
  BASIC: 0,      // 普通慢速装甲兵
  FAST: 1,       // 快速突击车
  POWER: 2,      // 强力速射重炮（子弹可烧草）
  HEAVY: 3,      // 超硬度坦克（需击中2次消灭）
  SUPER_FAST: 4, // 移速超快战车（极速3.0）
  ARMOR: 5       // 重装装甲要塞（需4发）
};

export const ENEMY_CONFIG = {
  [ENEMY_TYPE.BASIC]: {
    name: '装甲兵',
    speed: 1.2,
    bulletSpeed: 3.5,
    hp: 1,
    score: 100,
    color: '#e0e0e0',
    canBurnForest: false
  },
  [ENEMY_TYPE.FAST]: {
    name: '突击车',
    speed: 2.2,
    bulletSpeed: 4.0,
    hp: 1,
    score: 200,
    color: '#388e3c',
    canBurnForest: false
  },
  [ENEMY_TYPE.POWER]: {
    name: '速射炮',
    speed: 1.4,
    bulletSpeed: 5.5,
    hp: 1,
    score: 300,
    color: '#f57c00',
    canBurnForest: true
  },
  [ENEMY_TYPE.HEAVY]: {
    name: '超硬度坦克',
    speed: 1.35,
    bulletSpeed: 4.0,
    hp: 2,
    score: 350,
    color: '#c69214',
    canBurnForest: false
  },
  [ENEMY_TYPE.SUPER_FAST]: {
    name: '极速战车',
    speed: 3.0,
    bulletSpeed: 4.5,
    hp: 1,
    score: 400,
    color: '#00e5ff',
    canBurnForest: false
  },
  [ENEMY_TYPE.ARMOR]: {
    name: '重装坦克',
    speed: 1.1,
    bulletSpeed: 3.8,
    hp: 4,
    score: 500,
    color: '#1976d2',
    canBurnForest: false
  }
};

// 玩家坦克等级配置
export const PLAYER_LEVELS = [
  { level: 1, speed: 1.8, bulletSpeed: 4.2, maxBullets: 1, canBreakIron: false, canBurnForest: false },
  { level: 2, speed: 1.8, bulletSpeed: 6.0, maxBullets: 2, canBreakIron: false, canBurnForest: false },
  { level: 3, speed: 1.9, bulletSpeed: 6.2, maxBullets: 2, canBreakIron: false, canBurnForest: true },
  { level: 4, speed: 2.0, bulletSpeed: 6.5, maxBullets: 2, canBreakIron: true, canBurnForest: true }
];

// 道具枚举
export const POWERUP_TYPE = {
  STAR: 'star',     // 升级
  BOMB: 'bomb',     // 全屏炸弹
  CLOCK: 'clock',   // 定身
  SHOVEL: 'shovel', // 铁锹加固老鹰
  HELMET: 'helmet', // 护盾无敌
  TANK: 'tank',     // 增加生命
  GUN: 'gun',       // 手枪（双星升级）
  BOAT: 'boat'      // 战船渡水
};

// 游戏状态
export const GAME_STATE = {
  MENU: 'menu',
  STAGE_START: 'stage_start',
  PLAYING: 'playing',
  STAGE_CLEAR: 'stage_clear',
  GAMEOVER: 'gameover'
};
