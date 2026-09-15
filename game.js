// 经典《坦克大战》（Battle City）20关豪华自包含极速引擎
// 包含 5 种地形、烧草子弹、战船渡水、极速与超硬坦克、敌军吃道具、20关通关、铁锹加固老巢、手枪双星、每关限掉2~3个道具

(function() {
  'use strict';

  const GRID_COLS = 13;
  const GRID_ROWS = 13;
  const SUB_GRID = 2; // 26x26 微格精准破坏
  const TILE_SIZE = 32;
  const STAGE_WIDTH = GRID_COLS * TILE_SIZE; // 416
  const STAGE_HEIGHT = GRID_ROWS * TILE_SIZE; // 416
  const SIDEBAR_WIDTH = 64;
  const GAME_WIDTH = STAGE_WIDTH + SIDEBAR_WIDTH; // 480
  const GAME_HEIGHT = STAGE_HEIGHT; // 416

  const SUB_COLS = GRID_COLS * SUB_GRID; // 26
  const SUB_ROWS = GRID_ROWS * SUB_GRID; // 26
  const SUB_TILE_SIZE = TILE_SIZE / SUB_GRID; // 16

  const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
  const DIR_OFFSET = [
    { x: 0, y: -1 }, // UP
    { x: 1, y: 0 },  // RIGHT
    { x: 0, y: 1 },  // DOWN
    { x: -1, y: 0 }  // LEFT
  ];

  // 1. 地形类型配置 (5大经典地形 + 基地状态)
  const TILE = {
    EMPTY: 0,
    BRICK: 1,  // 砖块
    IRON: 2,   // 钢板/铁块
    FOREST: 3, // 草地/树林
    WATER: 4,  // 水路
    ICE: 5,    // 冰场
    BASE: 6,   // 金鹰司令部
    BASE_DESTROYED: 7 // 废墟大本营
  };

  // 2. 敌方坦克类型枚举
  const ENEMY_TYPE = {
    BASIC: 0,      // 普通装甲兵 (HP 1, 速度 1.1)
    FAST: 1,       // 突击车 (HP 1, 速度 2.0)
    POWER: 2,      // 速射重炮 (HP 1, 速度 1.3, 弹速 5.5, 子弹可烧草)
    HEAVY: 3,      // 超硬度坦克 (HP 2, 需击中2次，第1次受击变色)
    SUPER_FAST: 4, // 移速超快战车 (HP 1, 极速 3.0, 亮青色)
    ARMOR: 5       // 重装装甲要塞 (HP 4)
  };

  const ENEMY_CONFIG = {
    [ENEMY_TYPE.BASIC]: {
      name: '装甲兵',
      speed: 1.1,
      bulletSpeed: 3.8,
      hp: 1,
      score: 100,
      color: '#e0e0e0',
      canBurnForest: false
    },
    [ENEMY_TYPE.FAST]: {
      name: '突击车',
      speed: 2.0,
      bulletSpeed: 4.2,
      hp: 1,
      score: 200,
      color: '#388e3c',
      canBurnForest: false
    },
    [ENEMY_TYPE.POWER]: {
      name: '速射炮',
      speed: 1.3,
      bulletSpeed: 5.5,
      hp: 1,
      score: 300,
      color: '#f57c00',
      canBurnForest: true // 子弹可烧草
    },
    [ENEMY_TYPE.HEAVY]: {
      name: '超硬度坦克',
      speed: 1.25,
      bulletSpeed: 4.0,
      hp: 2, // 需击中两次消灭
      score: 350,
      color: '#c69214',
      canBurnForest: false
    },
    [ENEMY_TYPE.SUPER_FAST]: {
      name: '极速战车',
      speed: 3.0, // 超快移速
      bulletSpeed: 4.8,
      hp: 1,
      score: 400,
      color: '#00e5ff',
      canBurnForest: false
    },
    [ENEMY_TYPE.ARMOR]: {
      name: '重装坦克',
      speed: 1.0,
      bulletSpeed: 3.8,
      hp: 4,
      score: 500,
      color: '#1976d2',
      canBurnForest: false
    }
  };

  // 3. 道具类型枚举
  const POWERUP_TYPE = {
    STAR: 'star',     // 星星（升级火力）
    GUN: 'gun',       // 手枪（双星升级）
    BOAT: 'boat',     // 战船（渡水能力）
    SHOVEL: 'shovel', // 铁锹（加固老巢钢板20秒）
    BOMB: 'bomb',     // 手雷（全屏炸弹）
    CLOCK: 'clock',   // 时钟（定身冰冻）
    HELMET: 'helmet', // 头盔（无敌光盾）
    TANK: 'tank'      // 奖命坦克（生命+1）
  };

  const POWERUP_POOL = ['star', 'gun', 'boat', 'shovel', 'bomb', 'clock', 'helmet', 'tank'];

  // 控制台手柄交互区域配置
  const CTRL = {
    DPAD_X: 105,
    DPAD_OFFSET_Y: 130,
    FIRE_X: 375,
    FIRE_OFFSET_Y: 130,
    RESTART_OFFSET_Y: 50
  };

  // 大本营基地周边防护墙坐标 (Row 12, Col 6 => SubGrid sr 24..25, sc 12..13)
  const BASE_WALL_CELLS = [
    { r: 22, c: 11 }, { r: 22, c: 12 }, { r: 22, c: 13 }, { r: 22, c: 14 },
    { r: 23, c: 11 }, { r: 23, c: 12 }, { r: 23, c: 13 }, { r: 23, c: 14 },
    { r: 24, c: 11 }, { r: 24, c: 14 },
    { r: 25, c: 11 }, { r: 25, c: 14 }
  ];

  // 8-bit 复古音效合成器
  class SoundManager {
    constructor() { this.ctx = null; }
    init() {
      if (this.ctx) return;
      try {
        if (typeof wx !== 'undefined' && wx.createWebAudioContext) this.ctx = wx.createWebAudioContext();
        else if (typeof AudioContext !== 'undefined') this.ctx = new AudioContext();
      } catch (e) {}
    }
    playTone(freq, dur = 0.08, type = 'square', gainVal = 0.12) {
      this.init();
      if (!this.ctx) return;
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
      } catch (e) {}
    }
    shoot() { this.playTone(650, 0.06, 'square', 0.1); }
    hit() { this.playTone(180, 0.1, 'triangle', 0.15); }
    explode() { this.playTone(110, 0.25, 'sawtooth', 0.2); }
    powerup() {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.08, 'square', 0.15), i * 65);
      });
    }
    armorBreak() {
      this.playTone(260, 0.15, 'sawtooth');
      setTimeout(() => this.playTone(130, 0.25, 'triangle'), 70);
    }
    shovel() {
      [330, 392, 523, 659].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.09, 'triangle', 0.14), i * 60);
      });
    }
    freeze() {
      [880, 784, 698, 587].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.09, 'sine', 0.16), i * 55);
      });
    }
    stageStart() {
      const notes = [392, 523, 659, 784];
      notes.forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.1, 'square', 0.14), i * 80);
      });
    }
    stageClear() {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.12, 'square', 0.18), i * 90);
      });
    }
    victory() {
      const notes = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
      notes.forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.15, 'triangle', 0.2), i * 110);
      });
    }
  }
  const sounds = new SoundManager();

  // 20 关关卡地图与敌军波次编队
// 经典关卡数据与敌军波次编队


const E = TILE.EMPTY;
const B = TILE.BRICK;
const I = TILE.IRON;
const F = TILE.FOREST;
const W = TILE.WATER;
const C = TILE.ICE;
const H = TILE.BASE;

const LEVELS = [
  // 第 1 关：启程平原（经典初阵）
  {
    name: '第 1 关：启程平原',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [E, B, E, B, E, B, E, B, E, B, E, B, E],
      [E, B, E, B, E, B, E, B, E, B, E, B, E],
      [E, B, E, B, E, B, I, B, E, B, E, B, E],
      [E, B, E, B, E, B, I, B, E, B, E, B, E],
      [E, B, E, B, E, E, E, E, E, B, E, B, E],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [I, E, B, B, E, E, E, E, E, B, B, E, I],
      [E, E, E, B, E, B, E, B, E, B, E, E, E],
      [E, B, E, B, E, B, E, B, E, B, E, B, E],
      [E, B, E, E, E, B, E, B, E, E, E, B, E],
      [E, B, E, B, E, B, B, B, E, B, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false }
    ]
  },

  // 第 2 关：双河要塞（水路初现）
  {
    name: '第 2 关：双河要塞',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [E, B, E, I, E, F, F, F, E, I, E, B, E],
      [E, B, E, I, E, F, F, F, E, I, E, B, E],
      [E, B, E, E, E, E, W, E, E, E, E, B, E],
      [W, W, W, W, E, E, W, E, E, W, W, W, W],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [E, F, F, B, E, B, I, B, E, B, F, F, E],
      [E, F, F, B, E, E, E, E, E, B, F, F, E],
      [W, W, W, W, E, B, E, B, E, W, W, W, W],
      [E, B, E, E, E, B, E, B, E, E, E, B, E],
      [E, B, E, I, E, E, E, E, E, I, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, E, E, B, H, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false }
    ]
  },

  // 第 3 关：极地冰原（冰面滑行）
  {
    name: '第 3 关：极地冰原',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [I, E, B, B, E, C, C, C, E, B, B, E, I],
      [I, E, B, B, E, C, C, C, E, B, B, E, I],
      [E, E, E, E, E, I, I, I, E, E, E, E, E],
      [B, B, E, I, E, E, E, E, E, I, E, B, B],
      [C, C, E, I, E, B, B, B, E, I, E, C, C],
      [C, C, E, E, E, B, I, B, E, E, E, C, C],
      [B, B, E, I, E, B, B, B, E, I, E, B, B],
      [E, E, E, I, E, E, E, E, E, I, E, E, E],
      [I, E, B, B, E, C, C, C, E, B, B, E, I],
      [I, E, B, B, E, E, E, E, E, B, B, E, I],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [E, E, E, E, E, B, H, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false }
    ]
  },

  // 第 4 关：密林伏击（草丛隐匿与超硬度重坦登场）
  {
    name: '第 4 关：密林伏击',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [F, F, E, B, B, E, F, E, B, B, E, F, F],
      [F, F, E, B, B, E, F, E, B, B, E, F, F],
      [E, E, E, I, I, E, F, E, I, I, E, E, E],
      [B, B, E, E, E, F, F, F, E, E, E, B, B],
      [F, F, F, B, E, B, I, B, E, B, F, F, F],
      [E, E, F, B, E, B, B, B, E, B, F, E, E],
      [F, F, F, E, E, E, E, E, E, E, F, F, F],
      [B, B, E, I, E, F, F, F, E, I, E, B, B],
      [E, E, E, I, E, B, B, B, E, I, E, E, E],
      [E, B, E, E, E, E, E, E, E, E, E, B, E],
      [E, B, E, B, E, B, B, B, E, B, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.HEAVY, isFlashing: false }, // 2击超硬度坦克亮相
      { type: ENEMY_TYPE.FAST,  isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false }
    ]
  },

  // 第 5 关：钢铁迷宫（密集钢板与狭小迂回空间）
  {
    name: '第 5 关：钢铁迷宫',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [I, I, E, B, B, E, I, E, B, B, E, I, I],
      [E, E, E, B, B, E, I, E, B, B, E, E, E],
      [E, I, I, I, E, E, I, E, E, I, I, I, E],
      [E, I, E, E, E, B, B, B, E, E, E, I, E],
      [E, I, E, I, I, I, E, I, I, I, E, I, E],
      [E, E, E, I, E, E, E, E, E, I, E, E, E],
      [I, I, E, I, E, B, I, B, E, I, E, I, I],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [E, I, I, B, E, E, E, E, E, B, I, I, E],
      [E, B, E, B, E, E, E, E, E, B, E, B, E],
      [E, B, E, B, E, B, B, B, E, B, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false }
    ]
  },

  // 第 6 关：环岛运河（水域环绕，战船渡水绝佳施展）
  {
    name: '第 6 关：环岛运河',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [E, B, B, E, W, W, W, W, W, E, B, B, E],
      [E, B, B, E, W, F, F, F, W, E, B, B, E],
      [E, I, E, E, W, F, I, F, W, E, E, I, E],
      [E, E, E, B, W, F, F, F, W, B, E, E, E],
      [W, W, E, B, W, W, E, W, W, B, E, W, W],
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [W, W, E, B, B, E, I, E, B, B, E, W, W],
      [E, E, E, B, B, E, E, E, B, B, E, E, E],
      [E, I, E, E, E, B, B, B, E, E, E, I, E],
      [E, B, E, I, E, E, E, E, E, I, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, E, E, B, H, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false }
    ]
  },

  // 第 7 关：疾风之径（超速战车 Speed 3.0 登场！）
  {
    name: '第 7 关：疾风之径',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [E, B, E, I, E, B, E, B, E, I, E, B, E],
      [E, B, E, I, E, B, E, B, E, I, E, B, E],
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [B, B, E, B, B, E, I, E, B, B, E, B, B],
      [C, C, E, B, B, E, I, E, B, B, E, C, C],
      [C, C, E, E, E, E, E, E, E, E, E, C, C],
      [B, B, E, I, E, B, B, B, E, I, E, B, B],
      [E, E, E, I, E, B, I, B, E, I, E, E, E],
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, B, E, I, E, E, E, E, E, I, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, E, E, B, H, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false }, // 极速战车首次登场
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.FAST,       isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.FAST,       isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.FAST,       isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false }
    ]
  },

  // 第 8 关：冰林交响（冰面滑行与草丛伏击）
  {
    name: '第 8 关：冰林交响',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [C, C, E, F, F, E, I, E, F, F, E, C, C],
      [C, C, E, F, F, E, I, E, F, F, E, C, C],
      [E, E, E, C, C, E, E, E, C, C, E, E, E],
      [F, F, E, C, C, B, B, B, C, C, E, F, F],
      [F, F, E, E, E, B, I, B, E, E, E, F, F],
      [E, E, E, I, E, B, B, B, E, I, E, E, E],
      [C, C, E, I, E, F, F, F, E, I, E, C, C],
      [C, C, E, E, E, F, F, F, E, E, E, C, C],
      [E, E, E, B, B, E, E, E, B, B, E, E, E],
      [E, B, E, B, B, E, E, E, B, B, E, B, E],
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.FAST,       isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.FAST,       isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 9 关：十字交锋（中心钢铁十字与多路水渠）
  {
    name: '第 9 关：十字交锋',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [B, B, E, W, W, E, I, E, W, W, E, B, B],
      [B, B, E, W, W, E, I, E, W, W, E, B, B],
      [E, E, E, E, E, E, I, E, E, E, E, E, E],
      [W, W, E, I, I, I, I, I, I, I, E, W, W],
      [E, E, E, E, E, E, I, E, E, E, E, E, E],
      [I, I, E, B, B, E, I, E, B, B, E, I, I],
      [E, E, E, B, B, E, I, E, B, B, E, E, E],
      [W, W, E, E, E, E, E, E, E, E, E, W, W],
      [B, B, E, I, E, B, B, B, E, I, E, B, B],
      [E, E, E, I, E, E, E, E, E, I, E, E, E],
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.FAST,       isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 10 关：铁血要塞（半程大关卡，重型兵团）
  {
    name: '第 10 关：铁血要塞',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [I, E, B, B, E, I, I, I, E, B, B, E, I],
      [I, E, B, B, E, I, I, I, E, B, B, E, I],
      [E, E, I, E, E, E, E, E, E, E, I, E, E],
      [B, B, I, E, B, B, I, B, B, E, I, B, B],
      [B, B, E, E, B, I, I, I, B, E, E, B, B],
      [E, E, E, I, B, I, I, I, B, I, E, E, E],
      [I, I, E, I, B, B, I, B, B, I, E, I, I],
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [B, B, E, I, I, E, B, E, I, I, E, B, B],
      [E, B, E, I, E, E, E, E, E, I, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, E, E, B, H, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 11 关：水网棋盘（密布水道与战船对决）
  {
    name: '第 11 关：水网棋盘',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [W, W, E, B, B, E, W, E, B, B, E, W, W],
      [W, W, E, B, B, E, W, E, B, B, E, W, W],
      [E, E, E, W, W, E, E, E, W, W, E, E, E],
      [B, B, E, W, W, E, I, E, W, W, E, B, B],
      [B, B, E, E, E, E, I, E, E, E, E, B, B],
      [W, W, E, I, I, I, I, I, I, I, E, W, W],
      [E, E, E, E, E, E, I, E, E, E, E, E, E],
      [B, B, E, W, W, E, I, E, W, W, E, B, B],
      [W, W, E, W, W, E, E, E, W, W, E, W, W],
      [E, E, E, B, B, E, E, E, B, B, E, E, E],
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 12 关：幽暗森林（草地覆盖超 40%，极度依赖烧草炮）
  {
    name: '第 12 关：幽暗森林',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [F, F, F, B, B, F, F, F, B, B, F, F, F],
      [F, F, F, B, B, F, F, F, B, B, F, F, F],
      [F, F, E, I, I, E, F, E, I, I, E, F, F],
      [F, E, E, E, E, F, F, F, E, E, E, E, F],
      [B, B, F, F, F, B, I, B, F, F, F, B, B],
      [B, B, F, F, F, B, B, B, F, F, F, B, B],
      [F, E, E, E, E, F, F, F, E, E, E, E, F],
      [F, F, E, I, I, E, F, E, I, I, E, F, F],
      [F, F, F, B, B, F, F, F, B, B, F, F, F],
      [E, B, E, E, E, E, E, E, E, E, E, B, E],
      [E, B, E, B, E, B, B, B, E, B, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 13 关：极速滑冰（大冰面与超速战车狂飙）
  {
    name: '第 13 关：极速滑冰',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [C, C, C, E, B, B, E, B, B, E, C, C, C],
      [C, C, C, E, B, B, E, B, B, E, C, C, C],
      [C, C, E, I, I, E, E, E, I, I, E, C, C],
      [E, E, E, I, E, C, C, C, E, I, E, E, E],
      [B, B, E, E, C, C, I, C, C, E, E, B, B],
      [B, B, E, E, C, I, I, I, C, E, E, B, B],
      [E, E, E, I, E, C, C, C, E, I, E, E, E],
      [C, C, E, I, I, E, E, E, I, I, E, C, C],
      [C, C, C, E, B, B, E, B, B, E, C, C, C],
      [E, B, E, E, E, E, E, E, E, E, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, I, E, B, H, B, E, I, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false }
    ]
  },

  // 第 14 关：双子塔楼（双重钢铁主要塞）
  {
    name: '第 14 关：双子塔楼',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [E, I, I, I, E, B, B, B, E, I, I, I, E],
      [E, I, B, I, E, B, B, B, E, I, B, I, E],
      [E, I, B, I, E, E, I, E, E, I, B, I, E],
      [E, I, I, I, E, E, I, E, E, I, I, I, E],
      [E, E, E, E, E, B, I, B, E, E, E, E, E],
      [B, B, E, I, I, B, I, B, I, I, E, B, B],
      [E, E, E, E, E, E, I, E, E, E, E, E, E],
      [E, I, I, I, E, E, I, E, E, I, I, I, E],
      [E, I, B, I, E, B, B, B, E, I, B, I, E],
      [E, I, I, I, E, E, E, E, E, I, I, I, E],
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 15 关：群岛争夺（浮岛与水网结合）
  {
    name: '第 15 关：群岛争夺',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [B, B, E, W, W, E, B, E, W, W, E, B, B],
      [B, B, E, W, W, E, B, E, W, W, E, B, B],
      [W, W, W, W, E, E, I, E, E, W, W, W, W],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [W, W, E, B, B, B, I, B, B, B, E, W, W],
      [W, W, E, B, B, B, I, B, B, B, E, W, W],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [W, W, W, W, E, E, I, E, E, W, W, W, W],
      [B, B, E, W, W, E, B, E, W, W, E, B, B],
      [E, B, E, E, E, E, E, E, E, E, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, I, E, B, H, B, E, I, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 16 关：烈焰通道（草木皆兵，高频烧草激战）
  {
    name: '第 16 关：烈焰通道',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [F, F, E, I, E, F, F, F, E, I, E, F, F],
      [B, B, E, I, E, F, F, F, E, I, E, B, B],
      [F, F, E, I, E, B, B, B, E, I, E, F, F],
      [E, E, E, E, E, B, I, B, E, E, E, E, E],
      [F, F, F, B, B, B, I, B, B, B, F, F, F],
      [F, F, F, B, B, B, I, B, B, B, F, F, F],
      [E, E, E, E, E, B, I, B, E, E, E, E, E],
      [F, F, E, I, E, B, B, B, E, I, E, F, F],
      [B, B, E, I, E, F, F, F, E, I, E, B, B],
      [E, B, E, I, E, E, E, E, E, I, E, B, E],
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, E, E, B, E, B, H, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false }
    ]
  },

  // 第 17 关：沼泽死局（全 5 种地形极限融合）
  {
    name: '第 17 关：沼泽死局',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [W, W, E, C, C, E, F, E, C, C, E, W, W],
      [W, W, E, C, C, E, F, E, C, C, E, W, W],
      [E, E, E, B, B, E, I, E, B, B, E, E, E],
      [F, F, E, W, W, E, I, E, W, W, E, F, F],
      [C, C, E, W, W, B, B, B, W, W, E, C, C],
      [C, C, E, E, E, B, I, B, E, E, E, C, C],
      [F, F, E, W, W, B, B, B, W, W, E, F, F],
      [E, E, E, B, B, E, I, E, B, B, E, E, E],
      [W, W, E, C, C, E, F, E, C, C, E, W, W],
      [E, B, E, E, E, E, E, E, E, E, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, I, E, B, H, B, E, I, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 18 关：钢铁洪流（高度装甲化的强攻阵地）
  {
    name: '第 18 关：钢铁洪流',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [I, I, E, B, B, E, I, E, B, B, E, I, I],
      [I, I, E, B, B, E, I, E, B, B, E, I, I],
      [E, E, E, I, I, E, I, E, I, I, E, E, E],
      [I, I, E, I, I, E, I, E, I, I, E, I, I],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [B, B, E, I, I, B, I, B, I, I, E, B, B],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [I, I, E, I, I, E, I, E, I, I, E, I, I],
      [E, E, E, I, I, E, I, E, I, I, E, E, E],
      [E, B, E, E, E, E, E, E, E, E, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, I, E, B, H, B, E, I, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false }
    ]
  },

  // 第 19 关：绝地防守（基地外围大开，兵临城下）
  {
    name: '第 19 关：绝地防守',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [E, B, E, I, E, B, E, B, E, I, E, B, E],
      [E, B, E, I, E, B, E, B, E, I, E, B, E],
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [W, W, E, B, B, E, I, E, B, B, E, W, W],
      [W, W, E, B, B, E, I, E, B, B, E, W, W],
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [C, C, E, I, E, B, B, B, E, I, E, C, C],
      [C, C, E, I, E, B, I, B, E, I, E, C, C],
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [E, B, E, E, E, E, E, E, E, E, E, B, E],
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, E, E, E, E, B, H, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false }
    ]
  },

  // 第 20 关：终极决战（巅峰防卫战，20 精锐集群）
  {
    name: '第 20 关：终极决战',
    layout: [
      [E, E, E, E, E, E, E, E, E, E, E, E, E],
      [I, E, W, W, E, F, F, F, E, W, W, E, I],
      [I, E, W, W, E, F, I, F, E, W, W, E, I],
      [E, E, E, E, E, F, F, F, E, E, E, E, E],
      [B, B, E, I, I, E, B, E, I, I, E, B, B],
      [C, C, E, I, B, B, I, B, B, I, E, C, C],
      [C, C, E, E, B, I, I, I, B, E, E, C, C],
      [B, B, E, I, B, B, I, B, B, I, E, B, B],
      [E, E, E, I, I, E, B, E, I, I, E, E, E],
      [W, W, E, E, E, F, F, F, E, E, E, W, W],
      [E, B, E, I, E, E, E, E, E, I, E, B, E],
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, E, E, E, E, B, H, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: true },  // 掉宝 1
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: true },  // 掉宝 2
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: true },  // 掉宝 3
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.POWER,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false },
      { type: ENEMY_TYPE.SUPER_FAST, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR,      isFlashing: false },
      { type: ENEMY_TYPE.HEAVY,      isFlashing: false }
    ]
  }
];


  class TankGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.gameState = 'STAGE_START'; // 'STAGE_START', 'PLAYING', 'STAGE_CLEAR', 'VICTORY', 'GAMEOVER'
      this.currentStage = 0; // 0..19 (第1关到第20关)
      this.bannerTimer = 90;
      this.stageClearTimer = 0;
      this.baseDestroyed = false;

      this.score = 0;
      this.lives = 3;
      this.starCount = 0;
      this.hasBoat = false;

      this.subGrid = Array(SUB_ROWS).fill(0).map(() => Array(SUB_COLS).fill(TILE.EMPTY));
      this.enemies = [];
      this.enemyQueue = [];
      this.enemiesRemaining = 20;
      this.bullets = [];
      this.powerups = [];
      this.effects = [];
      this.ripples = [];

      this.player = null;
      this.currentMoveDir = null;
      this.isFiring = false;
      this.fireCooldown = 0;
      this.animTick = 0;

      this.stagePowerupsSpawned = 0;
      this.maxStagePowerups = 2;
      this.shovelTimer = 0;
      this.clockFreezeTimer = 0;
      this.enemySpawnTimer = 0;

      this.initStage(0);
      this.bindAllEvents();
      this.startLoop();
    }

    initStage(stageIndex) {
      if (stageIndex >= LEVELS.length) {
        this.gameState = 'VICTORY';
        sounds.victory();
        return;
      }

      this.currentStage = stageIndex;
      const levelData = LEVELS[stageIndex];

      // 1. 初始化地图子网格 (26x26)
      this.subGrid = Array(SUB_ROWS).fill(0).map(() => Array(SUB_COLS).fill(TILE.EMPTY));
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const t = levelData.layout[r][c];
          const sr = r * SUB_GRID;
          const sc = c * SUB_GRID;
          if (t === TILE.BASE) {
            this.subGrid[sr][sc] = TILE.BASE;
            this.subGrid[sr][sc + 1] = TILE.BASE;
            this.subGrid[sr + 1][sc] = TILE.BASE;
            this.subGrid[sr + 1][sc + 1] = TILE.BASE;
          } else {
            for (let dr = 0; dr < SUB_GRID; dr++) {
              for (let dc = 0; dc < SUB_GRID; dc++) {
                this.subGrid[sr + dr][sc + dc] = t;
              }
            }
          }
        }
      }

      // 2. 初始化敌军编队 (每关严格 20 辆坦克)
      this.enemyQueue = levelData.enemies.map(e => ({ ...e }));
      this.enemiesRemaining = this.enemyQueue.length;
      this.enemies = [];
      this.bullets = [];
      this.powerups = [];

      // 3. 严格控制每关道具掉落总数：最多 2~3 个
      this.stagePowerupsSpawned = 0;
      this.maxStagePowerups = 2 + (stageIndex % 2); // 偶数关2个，奇数关3个，绝不超过3个

      this.shovelTimer = 0;
      this.clockFreezeTimer = 0;
      this.enemySpawnTimer = 40;
      this.baseDestroyed = false;

      // 4. 初始化玩家坦克
      this.player = {
        x: 4 * TILE_SIZE,
        y: 12 * TILE_SIZE,
        dir: DIR.UP,
        size: 28,
        alive: true,
        shield: 180,
        isFrozen: false,
        freezeTimer: 0,
        slideDir: null,
        slideTimer: 0
      };

      this.gameState = 'STAGE_START';
      this.bannerTimer = 90;
      sounds.stageStart();
    }

    // 道具加固大本营：短暂成为钢板 (20秒)
    activateShovel() {
      this.shovelTimer = 1200; // 20 秒 (60fps)
      for (const cell of BASE_WALL_CELLS) {
        this.subGrid[cell.r][cell.c] = TILE.IRON;
      }
      sounds.shovel();
    }

    // 敌军吃铁锹：摧毁大本营防护壁
    exposeBase() {
      this.shovelTimer = 0;
      for (const cell of BASE_WALL_CELLS) {
        this.subGrid[cell.r][cell.c] = TILE.EMPTY;
        this.effects.push({ type: 'hit', x: cell.c * SUB_TILE_SIZE, y: cell.r * SUB_TILE_SIZE, frame: 0 });
      }
      sounds.hit();
    }

    // 恢复老巢砖块墙
    restoreBaseWalls() {
      for (const cell of BASE_WALL_CELLS) {
        this.subGrid[cell.r][cell.c] = TILE.BRICK;
      }
    }

    // 生成道具 (严格限制每关最多出 2~3 个)
    spawnPowerup(x, y) {
      if (this.stagePowerupsSpawned >= this.maxStagePowerups) return;
      this.stagePowerupsSpawned++;

      const type = POWERUP_POOL[Math.floor(Math.random() * POWERUP_POOL.length)];
      const px = Math.max(16, Math.min(STAGE_WIDTH - 42, x !== undefined ? x : 6 * TILE_SIZE));
      const py = Math.max(16, Math.min(STAGE_HEIGHT - 42, y !== undefined ? y : 8 * TILE_SIZE));

      this.powerups.push({
        x: px,
        y: py,
        size: 26,
        type,
        timer: 1500 // 25秒闪烁消失
      });
    }

    // 玩家拾取道具效果应用
    applyPlayerPowerup(p) {
      sounds.powerup();
      switch (p.type) {
        case POWERUP_TYPE.STAR:
          this.starCount = Math.min(3, this.starCount + 1);
          this.effects.push({ type: 'floatText', text: '★ 坦克升级！移速与弹速提升', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.GUN:
          // 手枪效果等于吃两颗星星
          this.starCount = Math.min(3, this.starCount + 2);
          this.effects.push({ type: 'floatText', text: '🔫 获得手枪！火力连升2级！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.BOAT:
          // 增加船只，有渡水能力
          this.hasBoat = true;
          this.effects.push({ type: 'floatText', text: '⛵ 获得两栖战船！可直接渡水！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.SHOVEL:
          // 加固大本营，短暂成为钢板
          this.activateShovel();
          this.effects.push({ type: 'floatText', text: '⛏️ 基地钢板加固！持续20秒！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.BOMB:
          this.effects.push({ type: 'floatText', text: '💣 全屏手雷！消灭所有敌军！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          for (const e of this.enemies) {
            if (e.alive) {
              e.alive = false;
              this.score += e.score;
              this.enemiesRemaining--;
              this.effects.push({ type: 'explode', x: e.x, y: e.y, frame: 0, isBig: true });
            }
          }
          sounds.explode();
          break;
        case POWERUP_TYPE.CLOCK:
          this.clockFreezeTimer = 300; // 5秒
          this.effects.push({ type: 'floatText', text: '⏰ 时钟定身！全敌军冰冻5秒！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          sounds.freeze();
          break;
        case POWERUP_TYPE.HELMET:
          this.player.shield = 360; // 6秒
          this.effects.push({ type: 'floatText', text: '🛡️ 获得光盾！无敌6秒！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.TANK:
          this.lives++;
          this.effects.push({ type: 'floatText', text: '🎖️ 奖命小坦克！生命+1！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          break;
      }
    }

    // 敌军也可以吃道具！
    applyEnemyPowerup(enemy, p) {
      sounds.powerup();
      switch (p.type) {
        case POWERUP_TYPE.BOAT:
          enemy.hasBoat = true;
          this.effects.push({ type: 'floatText', text: '⚠️ 敌军获得了战船！可渡水！', x: enemy.x, y: enemy.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.GUN:
        case POWERUP_TYPE.STAR:
          enemy.speed += 0.5;
          enemy.bulletSpeed += 1.5;
          enemy.shield = 180;
          this.effects.push({ type: 'floatText', text: '⚠️ 敌军坦克重炮升级！', x: enemy.x, y: enemy.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.SHOVEL:
          // 敌军拿到铁锹：扒掉玩家老巢防护
          this.exposeBase();
          this.effects.push({ type: 'floatText', text: '⚠️ 敌军破坏基地防护！大本营裸露！', x: enemy.x, y: enemy.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.BOMB:
          // 敌军手雷：削减玩家护盾或造成威胁
          if (this.player.shield > 0) {
            this.player.shield = 0;
          } else if (this.starCount > 0) {
            this.starCount = 0;
            this.player.shield = 60;
          }
          this.effects.push({ type: 'explode', x: this.player.x, y: this.player.y, frame: 0, isBig: true });
          this.effects.push({ type: 'floatText', text: '⚠️ 敌军引爆手雷！受到冲击！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          sounds.explode();
          break;
        case POWERUP_TYPE.CLOCK:
          // 敌军时钟：冰冻玩家 4 秒！
          this.player.isFrozen = true;
          this.player.freezeTimer = 240;
          this.effects.push({ type: 'floatText', text: '⚠️ 敌军启动时钟！玩家被冰冻4秒！', x: this.player.x, y: this.player.y - 12, alpha: 1.0 });
          sounds.freeze();
          break;
        case POWERUP_TYPE.HELMET:
          enemy.shield = 300;
          this.effects.push({ type: 'floatText', text: '⚠️ 敌军获得防护光盾！', x: enemy.x, y: enemy.y - 12, alpha: 1.0 });
          break;
        case POWERUP_TYPE.TANK:
          for (const e of this.enemies) {
            if (e.alive) e.hp = Math.max(e.hp, ENEMY_CONFIG[e.type].hp);
          }
          this.enemiesRemaining++;
          this.effects.push({ type: 'floatText', text: '⚠️ 敌军获得额外增援！', x: enemy.x, y: enemy.y - 12, alpha: 1.0 });
          break;
      }
    }

    // 地图通行性检测：支持 5 种地形与战船渡水
    canPass(x, y, size, hasBoat = false) {
      if (x < 0 || y < 0 || x + size > STAGE_WIDTH || y + size > STAGE_HEIGHT) {
        return false;
      }
      const minC = Math.floor(x / SUB_TILE_SIZE);
      const maxC = Math.floor((x + size - 0.1) / SUB_TILE_SIZE);
      const minR = Math.floor(y / SUB_TILE_SIZE);
      const maxR = Math.floor((y + size - 0.1) / SUB_TILE_SIZE);

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (r < 0 || r >= SUB_ROWS || c < 0 || c >= SUB_COLS) return false;
          const tile = this.subGrid[r][c];
          if (tile === TILE.BRICK || tile === TILE.IRON || tile === TILE.BASE || tile === TILE.BASE_DESTROYED) {
            return false;
          }
          if (tile === TILE.WATER) {
            // 水路：未配备战船则无法通行
            if (!hasBoat) return false;
          }
          // 草地(FOREST)、冰场(ICE)、空地(EMPTY)均允许通行
        }
      }
      return true;
    }

    // 检查坦克是否处于水面上
    isOnWater(tank) {
      const cx = tank.x + tank.size / 2;
      const cy = tank.y + tank.size / 2;
      const sc = Math.floor(cx / SUB_TILE_SIZE);
      const sr = Math.floor(cy / SUB_TILE_SIZE);
      if (sr >= 0 && sr < SUB_ROWS && sc >= 0 && sc < SUB_COLS) {
        return this.subGrid[sr][sc] === TILE.WATER;
      }
      return false;
    }

    // 检查坦克是否处于冰场上
    isOnIce(tank) {
      const cx = tank.x + tank.size / 2;
      const cy = tank.y + tank.size / 2;
      const sc = Math.floor(cx / SUB_TILE_SIZE);
      const sr = Math.floor(cy / SUB_TILE_SIZE);
      if (sr >= 0 && sr < SUB_ROWS && sc >= 0 && sc < SUB_COLS) {
        return this.subGrid[sr][sc] === TILE.ICE;
      }
      return false;
    }

    // 坦克与坦克不可重叠碰撞检测
    isTankColliding(tank, nextX, nextY) {
      const allTanks = [];
      if (this.player && this.player.alive) allTanks.push(this.player);
      for (const e of this.enemies) {
        if (e.alive) allTanks.push(e);
      }

      const nextCenterX = nextX + tank.size / 2;
      const nextCenterY = nextY + tank.size / 2;
      const currCenterX = tank.x + tank.size / 2;
      const currCenterY = tank.y + tank.size / 2;
      const threshold = 26;

      for (const other of allTanks) {
        if (other === tank) continue;

        const otherCenterX = other.x + other.size / 2;
        const otherCenterY = other.y + other.size / 2;
        const nextDx = Math.abs(nextCenterX - otherCenterX);
        const nextDy = Math.abs(nextCenterY - otherCenterY);

        if (nextDx < threshold && nextDy < threshold) {
          const currDx = Math.abs(currCenterX - otherCenterX);
          const currDy = Math.abs(currCenterY - otherCenterY);
          const currDistSq = currDx * currDx + currDy * currDy;
          const nextDistSq = nextDx * nextDx + nextDy * nextDy;
          if (nextDistSq > currDistSq) {
            continue; // 允许脱离
          }
          return true; // 阻挡重叠穿透
        }
      }
      return false;
    }

    // 坦克移动与转向对齐
    moveTank(tank, targetDir) {
      if (this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') return false;
      if (tank.isFrozen) return false; // 冰冻定身状态无法移动

      const dirChanged = tank.dir !== targetDir;
      tank.dir = targetDir;
      if (tank === this.player && dirChanged && this.isFiring) {
        this.fireCooldown = 0; // 转向瞬间刷新开火冷却
      }

      const offset = DIR_OFFSET[targetDir];
      const spd = tank === this.player ? this.playerSpeed : tank.speed;
      let nextX = tank.x + offset.x * spd;
      let nextY = tank.y + offset.y * spd;

      // 自动转弯辅助对齐
      const alignThreshold = 10;
      if (targetDir === DIR.UP || targetDir === DIR.DOWN) {
        const rem = tank.x % (TILE_SIZE / 2);
        if (rem < alignThreshold) nextX -= rem;
        else if (rem > (TILE_SIZE / 2) - alignThreshold) nextX += ((TILE_SIZE / 2) - rem);
      } else {
        const rem = tank.y % (TILE_SIZE / 2);
        if (rem < alignThreshold) nextY -= rem;
        else if (rem > (TILE_SIZE / 2) - alignThreshold) nextY += ((TILE_SIZE / 2) - rem);
      }

      const hasBoat = tank === this.player ? this.hasBoat : !!tank.hasBoat;
      if (this.canPass(nextX, nextY, tank.size, hasBoat) && !this.isTankColliding(tank, nextX, nextY)) {
        tank.x = nextX;
        tank.y = nextY;
        return true;
      }
      return false;
    }

    get playerSpeed() {
      if (!this.player) return 1.0;
      if (this.starCount === 0) return 1.0; // FC 经典基准移速
      if (this.starCount === 1) return 1.25;
      return 1.4; // 满级提速
    }

    // 开火射击逻辑
    fireBullet(owner) {
      if (!owner.alive || this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') return false;
      if (owner.isFrozen) return false;

      const myActiveBullets = this.bullets.filter(b => b.owner === owner && b.active);
      const maxBullets = owner === this.player ? (this.starCount >= 1 ? 2 : 1) : 1;
      if (myActiveBullets.length >= maxBullets) return false;

      let bSpeed = 4.0;
      let canBurnForest = false;
      let canBreakIron = false;

      if (owner === this.player) {
        sounds.shoot();
        try { if (typeof wx !== 'undefined' && wx.vibrateShort) wx.vibrateShort({ type: 'light' }); } catch (e) {}
        bSpeed = this.starCount >= 1 ? 8.5 : 6.0;
        canBurnForest = this.starCount >= 2; // 2星及以上破铁重炮子弹可烧草
        canBreakIron = this.starCount >= 2;
      } else {
        bSpeed = owner.bulletSpeed || 4.0;
        canBurnForest = !!owner.canBurnForest; // 速射炮敌军具备烧草能力
      }

      const offset = DIR_OFFSET[owner.dir];
      const bx = owner.x + owner.size / 2 + offset.x * (owner.size / 2 + 4);
      const cy = owner.y + owner.size / 2 + offset.y * (owner.size / 2 + 4);

      this.bullets.push({
        x: bx,
        y: cy,
        dir: owner.dir,
        speed: bSpeed,
        owner,
        canBurnForest,
        canBreakIron,
        active: true
      });
      return true;
    }

    restart() {
      this.gameState = 'STAGE_START';
      this.currentStage = 0;
      this.score = 0;
      this.lives = 3;
      this.starCount = 0;
      this.hasBoat = false;
      this.currentMoveDir = null;
      this.isFiring = false;
      this.fireCooldown = 0;
      this.effects = [];
      this.initStage(0);
    }

    bindAllEvents() {
      const toCanvasCoords = (rawX, rawY) => {
        if (this.canvas && this.canvas.getBoundingClientRect) {
          const rect = this.canvas.getBoundingClientRect();
          const scaleX = (this.canvas.width || GAME_WIDTH) / (rect.width || 1);
          const scaleY = (this.canvas.height || (STAGE_HEIGHT + 264)) / (rect.height || 1);
          return {
            canvasX: (rawX - rect.left) * scaleX,
            canvasY: (rawY - rect.top) * scaleY
          };
        }

        let winW = 390;
        if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
          try { winW = wx.getSystemInfoSync().windowWidth || 390; } catch (e) {}
        }
        return {
          canvasX: rawX * (GAME_WIDTH / (winW || 390)),
          canvasY: rawY * (GAME_WIDTH / (winW || 390))
        };
      };

      const getTouchPos = t => {
        const rawX = t.clientX !== undefined ? t.clientX : (t.x !== undefined ? t.x : t.pageX);
        const rawY = t.clientY !== undefined ? t.clientY : (t.y !== undefined ? t.y : t.pageY);
        return toCanvasCoords(rawX, rawY);
      };

      const resolveDirection = (canvasX, canvasY) => {
        const dpadX = CTRL.DPAD_X;
        const dpadY = STAGE_HEIGHT + CTRL.DPAD_OFFSET_Y;

        if (Math.hypot(canvasX - dpadX, canvasY - (dpadY - 42)) < 38) return DIR.UP;
        if (Math.hypot(canvasX - dpadX, canvasY - (dpadY + 42)) < 38) return DIR.DOWN;
        if (Math.hypot(canvasX - (dpadX - 42), canvasY - dpadY) < 38) return DIR.LEFT;
        if (Math.hypot(canvasX - (dpadX + 42), canvasY - dpadY) < 38) return DIR.RIGHT;

        const dx = canvasX - dpadX;
        const dy = canvasY - dpadY;
        if (Math.hypot(dx, dy) < 10) return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle >= -45 && angle < 45) return DIR.RIGHT;
        if (angle >= 45 && angle < 135) return DIR.DOWN;
        if (angle >= -135 && angle < -45) return DIR.UP;
        return DIR.LEFT;
      };

      let moveTouchId = null;
      let fireTouchId = null;

      const handlePointerDown = (t, isMouse = false) => {
        if (!t) return;
        const { canvasX, canvasY } = getTouchPos(t);
        const tId = isMouse ? 'mouse' : (t.identifier !== undefined ? t.identifier : 'touch');
        this.ripples.push({ x: canvasX, y: canvasY, r: 5, maxR: 28, alpha: 1.0 });

        if (this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') {
          this.restart();
          return;
        }

        const restartX = GAME_WIDTH / 2;
        const restartY = STAGE_HEIGHT + CTRL.RESTART_OFFSET_Y;
        if (Math.hypot(canvasX - restartX, canvasY - restartY) < 38) {
          this.restart();
          return;
        }

        const fireX = CTRL.FIRE_X;
        const fireY = STAGE_HEIGHT + CTRL.FIRE_OFFSET_Y;
        const isFireButton = Math.hypot(canvasX - fireX, canvasY - fireY) < 58;
        const isFireZone = canvasX >= 240 && canvasY > STAGE_HEIGHT;
        const isScreenTap = canvasY <= STAGE_HEIGHT;

        if (isFireButton || isFireZone || isScreenTap) {
          fireTouchId = tId;
          this.isFiring = true;
          if (this.fireCooldown <= 0) {
            const fired = this.fireBullet(this.player);
            if (fired) this.fireCooldown = 12;
          }
          return;
        }

        if (canvasX < 240 && canvasY > STAGE_HEIGHT) {
          const dir = resolveDirection(canvasX, canvasY);
          if (dir !== null) {
            moveTouchId = tId;
            this.currentMoveDir = dir;
            this.moveTank(this.player, dir);
            if (this.isFiring) this.fireCooldown = 0;
          }
        }
      };

      const handlePointerMove = (t, isMouse = false) => {
        if (!t) return;
        const tId = isMouse ? 'mouse' : (t.identifier !== undefined ? t.identifier : 'touch');
        if (tId === moveTouchId) {
          const { canvasX, canvasY } = getTouchPos(t);
          const dir = resolveDirection(canvasX, canvasY);
          if (dir !== null) {
            if (dir !== this.currentMoveDir && this.isFiring) {
              this.fireCooldown = 0;
            }
            this.currentMoveDir = dir;
          }
        }
      };

      const handlePointerUp = (t, isMouse = false) => {
        const tId = isMouse ? 'mouse' : (t && t.identifier !== undefined ? t.identifier : 'touch');
        if (tId === moveTouchId || (isMouse && !this.isFiring)) {
          moveTouchId = null;
          this.currentMoveDir = null;
        }
        if (tId === fireTouchId || (isMouse && this.isFiring)) {
          fireTouchId = null;
          this.isFiring = false;
        }
      };

      const keyDirMap = {
        'KeyW': DIR.UP, 'w': DIR.UP, 'W': DIR.UP, 'ArrowUp': DIR.UP,
        'KeyS': DIR.DOWN, 's': DIR.DOWN, 'S': DIR.DOWN, 'ArrowDown': DIR.DOWN,
        'KeyA': DIR.LEFT, 'a': DIR.LEFT, 'A': DIR.LEFT, 'ArrowLeft': DIR.LEFT,
        'KeyD': DIR.RIGHT, 'd': DIR.RIGHT, 'D': DIR.RIGHT, 'ArrowRight': DIR.RIGHT
      };

      const activeKeys = new Set();
      const refreshKeyDir = () => {
        let active = null;
        for (const k of activeKeys) {
          if (keyDirMap[k] !== undefined) active = keyDirMap[k];
        }
        this.currentMoveDir = active;
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', e => {
          const k = e.code || e.key;
          if (keyDirMap[k] !== undefined) {
            activeKeys.add(k);
            refreshKeyDir();
            if (this.isFiring) this.fireCooldown = 0;
            e.preventDefault();
          }
          if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.code === 'Space' || e.key === ' ') {
            this.isFiring = true;
            if (this.fireCooldown <= 0) {
              const fired = this.fireBullet(this.player);
              if (fired) this.fireCooldown = 12;
            }
            e.preventDefault();
          }
          if (e.code === 'Enter') {
            if (this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') this.restart();
          }
        });

        window.addEventListener('keyup', e => {
          const k = e.code || e.key;
          if (keyDirMap[k] !== undefined) {
            activeKeys.delete(k);
            refreshKeyDir();
          }
          if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.code === 'Space' || e.key === ' ') {
            this.isFiring = false;
          }
        });

        window.addEventListener('blur', () => {
          activeKeys.clear();
          this.currentMoveDir = null;
          this.isFiring = false;
          moveTouchId = null;
          fireTouchId = null;
        });

        window.addEventListener('mouseup', () => handlePointerUp(null, true));
      }

      if (this.canvas) {
        this.canvas.addEventListener('touchstart', e => {
          const list = e.changedTouches || (e.touches ? e.touches : [e]);
          for (let i = 0; i < list.length; i++) handlePointerDown(list[i], false);
          e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', e => {
          const list = e.changedTouches || (e.touches ? e.touches : [e]);
          for (let i = 0; i < list.length; i++) handlePointerMove(list[i], false);
          e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', e => {
          const list = e.changedTouches || [e];
          for (let i = 0; i < list.length; i++) handlePointerUp(list[i], false);
          if (e.touches && e.touches.length === 0) {
            moveTouchId = null;
            fireTouchId = null;
            this.currentMoveDir = null;
            this.isFiring = false;
          }
          e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', e => {
          const list = e.changedTouches || [e];
          for (let i = 0; i < list.length; i++) handlePointerUp(list[i], false);
          if (e.touches && e.touches.length === 0) {
            moveTouchId = null;
            fireTouchId = null;
            this.currentMoveDir = null;
            this.isFiring = false;
          }
        });

        this.canvas.addEventListener('mousedown', e => handlePointerDown(e, true));
        this.canvas.addEventListener('mousemove', e => { if (e.buttons === 1) handlePointerMove(e, true); });
        this.canvas.addEventListener('mouseup', e => handlePointerUp(e, true));
      }
    }

    startLoop() {
      const step = () => {
        this.update();
        this.render();

        if (typeof wx !== 'undefined' && wx.requestAnimationFrame) {
          wx.requestAnimationFrame(step);
        } else if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(step);
        } else {
          setTimeout(step, 1000 / 60);
        }
      };
      step();
    }

    update() {
      this.animTick++;

      // 1. 开场 Banner 计时
      if (this.gameState === 'STAGE_START') {
        this.bannerTimer--;
        if (this.bannerTimer <= 0) {
          this.gameState = 'PLAYING';
        }
        return;
      }

      // 2. 关卡胜利过渡
      if (this.gameState === 'STAGE_CLEAR') {
        this.stageClearTimer--;
        if (this.stageClearTimer <= 0) {
          if (this.currentStage >= LEVELS.length - 1) {
            this.gameState = 'VICTORY';
            sounds.victory();
          } else {
            this.initStage(this.currentStage + 1);
          }
        }
        return;
      }

      if (this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') return;

      // 3. 护盾与开火冷却倒计时
      if (this.player.shield > 0) this.player.shield--;
      if (this.fireCooldown > 0) this.fireCooldown--;

      // 玩家冰冻状态更新
      if (this.player.isFrozen) {
        this.player.freezeTimer--;
        if (this.player.freezeTimer <= 0) this.player.isFrozen = false;
      }

      // 全局敌军冰冻倒计时
      if (this.clockFreezeTimer > 0) this.clockFreezeTimer--;

      // 铁锹钢板加固倒计时 (20秒)
      if (this.shovelTimer > 0) {
        this.shovelTimer--;
        if (this.shovelTimer <= 240) {
          // 最后 4 秒交替闪烁预警
          const isIron = Math.floor(this.shovelTimer / 15) % 2 === 0;
          for (const cell of BASE_WALL_CELLS) {
            this.subGrid[cell.r][cell.c] = isIron ? TILE.IRON : TILE.BRICK;
          }
        }
        if (this.shovelTimer === 0) {
          this.restoreBaseWalls();
        }
      }

      // 4. 玩家移动逻辑与冰场惯性滑动
      if (this.player.alive && !this.player.isFrozen) {
        if (this.currentMoveDir !== null) {
          this.moveTank(this.player, this.currentMoveDir);
          if (this.isOnIce(this.player)) {
            this.player.slideDir = this.currentMoveDir;
            this.player.slideTimer = 8;
          }
        } else if (this.player.slideTimer > 0 && this.isOnIce(this.player)) {
          this.player.slideTimer--;
          this.moveTank(this.player, this.player.slideDir);
        }
      }

      // 连续开火检测
      if (this.player.alive && this.isFiring) {
        if (this.fireCooldown <= 0) {
          const fired = this.fireBullet(this.player);
          if (fired) this.fireCooldown = 12;
        }
      }

      // 5. 敌军坦克波次刷新生成 (场上保持至多 4 辆，队列共 20 辆)
      if (this.enemySpawnTimer > 0) this.enemySpawnTimer--;
      const maxActive = Math.min(5, 3 + Math.floor(this.currentStage / 5));
      if (this.enemies.length < maxActive && this.enemyQueue.length > 0 && this.enemySpawnTimer <= 0) {
        const spawnPoints = [0, 6 * TILE_SIZE, 12 * TILE_SIZE];
        const spIdx = (20 - this.enemyQueue.length) % spawnPoints.length;
        const spX = spawnPoints[spIdx];

        // 检查出生点是否被其他坦克阻挡
        const blocked = this.enemies.some(e => Math.abs(e.x - spX) < 28 && e.y < 32) ||
                        (Math.abs(this.player.x - spX) < 28 && this.player.y < 32);

        if (!blocked) {
          const nextEnemyData = this.enemyQueue.shift();
          const cfg = ENEMY_CONFIG[nextEnemyData.type];
          this.enemies.push({
            x: spX,
            y: 0,
            dir: DIR.DOWN,
            speed: cfg.speed,
            bulletSpeed: cfg.bulletSpeed,
            size: 28,
            alive: true,
            type: nextEnemyData.type,
            hp: cfg.hp,
            maxHp: cfg.hp,
            score: cfg.score,
            color: cfg.color,
            canBurnForest: cfg.canBurnForest,
            isFlashing: nextEnemyData.isFlashing,
            hasBoat: false,
            shield: 0,
            dirTimer: Math.floor(Math.random() * 40) + 20,
            shootTimer: Math.floor(Math.random() * 50) + 30
          });
          this.effects.push({ type: 'spawn', x: spX, y: 0, frame: 0 });
          this.enemySpawnTimer = 60;
        }
      }

      // 6. 敌军行为更新 (受定身影响)
      const enemiesFrozen = this.clockFreezeTimer > 0;
      this.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        if (enemy.shield > 0) enemy.shield--;

        if (enemiesFrozen) return; // 时钟冰冻中

        enemy.dirTimer--;
        if (enemy.dirTimer <= 0) {
          enemy.dirTimer = Math.floor(Math.random() * 45) + 25;
          // 朝老巢方向倾向移动 (DOWN 概率翻倍)
          enemy.dir = [DIR.DOWN, DIR.DOWN, DIR.LEFT, DIR.RIGHT, DIR.UP][Math.floor(Math.random() * 5)];
        }

        const moved = this.moveTank(enemy, enemy.dir);
        if (!moved) {
          enemy.dir = [DIR.DOWN, DIR.LEFT, DIR.RIGHT, DIR.UP][Math.floor(Math.random() * 4)];
          enemy.dirTimer = Math.floor(Math.random() * 30) + 20;
        }

        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = Math.floor(Math.random() * 55) + 35;
          this.fireBullet(enemy);
        }
      });

      // 7. 道具拾取检测 (支持玩家吃道具与敌军吃道具)
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        p.timer--;
        if (p.timer <= 0) {
          this.powerups.splice(i, 1);
          continue;
        }

        // A. 玩家触碰道具
        if (this.player.alive &&
            Math.abs((this.player.x + 14) - (p.x + 13)) < 24 &&
            Math.abs((this.player.y + 14) - (p.y + 13)) < 24) {
          this.powerups.splice(i, 1);
          this.applyPlayerPowerup(p);
          continue;
        }

        // B. 敌军触碰道具 (敌军也可以吃道具！)
        for (const enemy of this.enemies) {
          if (enemy.alive &&
              Math.abs((enemy.x + 14) - (p.x + 13)) < 24 &&
              Math.abs((enemy.y + 14) - (p.y + 13)) < 24) {
            this.powerups.splice(i, 1);
            this.applyEnemyPowerup(enemy, p);
            break;
          }
        }
      }

      // 8. 子弹飞行位移
      for (let i = 0; i < this.bullets.length; i++) {
        const b = this.bullets[i];
        if (!b.active) continue;
        const offset = DIR_OFFSET[b.dir];
        b.x += offset.x * b.speed;
        b.y += offset.y * b.speed;

        if (b.x < 0 || b.y < 0 || b.x > STAGE_WIDTH || b.y > STAGE_HEIGHT) {
          b.active = false;
        }
      }

      // 9. 玩家子弹与敌军子弹空中对撞抵消
      for (let i = 0; i < this.bullets.length; i++) {
        const b1 = this.bullets[i];
        if (!b1.active || b1.owner !== this.player) continue;

        for (let j = 0; j < this.bullets.length; j++) {
          const b2 = this.bullets[j];
          if (!b2.active || b2.owner === this.player) continue;

          const dx = Math.abs(b1.x - b2.x);
          const dy = Math.abs(b1.y - b2.y);
          if (dx <= 12 && dy <= 12) {
            b1.active = false;
            b2.active = false;
            this.effects.push({ type: 'hit', x: (b1.x + b2.x) / 2 - 8, y: (b1.y + b2.y) / 2 - 8, frame: 0 });
            sounds.hit();
            break;
          }
        }
      }

      // 10. 子弹与地图及坦克实体交互
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (!b.active) continue;

        const minC = Math.max(0, Math.min(SUB_COLS - 1, Math.floor(b.x / SUB_TILE_SIZE)));
        const minR = Math.max(0, Math.min(SUB_ROWS - 1, Math.floor(b.y / SUB_TILE_SIZE)));
        const tile = this.subGrid[minR] ? this.subGrid[minR][minC] : TILE.EMPTY;

        // A. 烧草检测 (具备烧草能力的子弹穿过草地时，直接将草地烧除为空地！)
        if (tile === TILE.FOREST && b.canBurnForest) {
          this.subGrid[minR][minC] = TILE.EMPTY;
          this.effects.push({ type: 'burn', x: minC * SUB_TILE_SIZE + 4, y: minR * SUB_TILE_SIZE + 4, frame: 0 });
          sounds.hit();
        }

        // B. 砖块破坏
        if (tile === TILE.BRICK) {
          this.subGrid[minR][minC] = TILE.EMPTY;
          b.active = false;
          this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
          sounds.hit();
          continue;
        }

        // C. 钢板铁壁
        if (tile === TILE.IRON) {
          if (b.canBreakIron) {
            this.subGrid[minR][minC] = TILE.EMPTY;
            this.effects.push({ type: 'explode', x: minC * SUB_TILE_SIZE, y: minR * SUB_TILE_SIZE, frame: 0, isBig: false });
            sounds.explode();
          } else {
            this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
            sounds.hit();
          }
          b.active = false;
          continue;
        }

        // D. 大本营老巢命中
        if (tile === TILE.BASE) {
          this.baseDestroyed = true;
          b.active = false;
          this.gameState = 'GAMEOVER';
          this.currentMoveDir = null;
          this.effects.push({ type: 'explode', x: 6 * TILE_SIZE, y: 12 * TILE_SIZE, frame: 0, isBig: true });
          sounds.explode();
          continue;
        }

        // E. 玩家子弹击中敌军坦克
        if (b.owner === this.player) {
          for (const enemy of this.enemies) {
            if (enemy.alive && Math.abs(b.x - (enemy.x + enemy.size / 2)) < 16 && Math.abs(b.y - (enemy.y + enemy.size / 2)) < 16) {
              b.active = false;
              if (enemy.shield > 0) {
                this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
                sounds.hit();
                break;
              }

              enemy.hp--;
              if (enemy.hp > 0) {
                // 超硬度坦克受击变色与音效
                sounds.hit();
                if (enemy.type === ENEMY_TYPE.HEAVY) {
                  enemy.color = '#d84315'; // 变红/变暗展现受创
                }
                this.effects.push({ type: 'hit', x: enemy.x + 6, y: enemy.y + 6, frame: 0 });
                this.effects.push({ type: 'floatText', text: '-1 HP', x: enemy.x + 10, y: enemy.y - 8, alpha: 1.0 });
              } else {
                // 彻底消灭
                enemy.alive = false;
                this.score += enemy.score;
                this.enemiesRemaining--;
                this.effects.push({ type: 'explode', x: enemy.x, y: enemy.y, frame: 0, isBig: true });
                sounds.explode();

                // 掉落道具：闪烁坦克必掉道具（严格限制每关最多掉 2~3 个）
                if (enemy.isFlashing || (Math.random() < 0.25 && this.stagePowerupsSpawned < this.maxStagePowerups)) {
                  this.spawnPowerup(enemy.x, enemy.y);
                }
              }
              break;
            }
          }
        }

        // F. 敌军子弹击中玩家坦克
        if (b.owner !== this.player && this.player.alive) {
          if (Math.abs(b.x - (this.player.x + this.player.size / 2)) < 16 && Math.abs(b.y - (this.player.y + this.player.size / 2)) < 16) {
            b.active = false;
            if (this.player.shield <= 0) {
              if (this.starCount >= 3) {
                // 3星免死护甲抵挡一次致命伤，降级重置
                this.starCount = 0;
                this.player.shield = 90;
                this.effects.push({ type: 'explode', x: this.player.x, y: this.player.y, frame: 0, isBig: false });
                this.effects.push({ type: 'floatText', text: '护甲破碎！降级为初始状态', x: this.player.x - 24, y: this.player.y - 12, alpha: 1.0 });
                sounds.armorBreak();
              } else {
                this.starCount = 0;
                this.hasBoat = false;
                this.lives--;
                this.effects.push({ type: 'explode', x: this.player.x, y: this.player.y, frame: 0, isBig: true });
                sounds.explode();
                if (this.lives > 0) {
                  this.player.x = 4 * TILE_SIZE;
                  this.player.y = 12 * TILE_SIZE;
                  this.player.dir = DIR.UP;
                  this.player.shield = 180;
                } else {
                  this.player.alive = false;
                  this.gameState = 'GAMEOVER';
                  this.currentMoveDir = null;
                }
              }
            } else {
              this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
              sounds.hit();
            }
          }
        }
      }

      this.bullets = this.bullets.filter(b => b.active);
      this.enemies = this.enemies.filter(e => e.alive);

      // 11. 检查关卡清空：20 个坦克全部消灭后过关进入下一关！
      if (this.enemiesRemaining <= 0 && this.enemies.length === 0 && this.gameState === 'PLAYING') {
        this.gameState = 'STAGE_CLEAR';
        this.stageClearTimer = 120; // 2秒过关结算
        sounds.stageClear();
      }

      // 12. 特效推进
      for (let i = this.effects.length - 1; i >= 0; i--) {
        const eff = this.effects[i];
        if (eff.type === 'floatText') {
          eff.y -= 0.6;
          eff.alpha -= 0.015;
          if (eff.alpha <= 0) this.effects.splice(i, 1);
        } else {
          eff.frame++;
          if (eff.frame > 14) this.effects.splice(i, 1);
        }
      }

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.r += 2;
        r.alpha -= 0.08;
        if (r.alpha <= 0) this.ripples.splice(i, 1);
      }
    }

    render() {
      let cw = this.canvas.width;
      let ch = this.canvas.height;
      let renderW = GAME_WIDTH;
      let renderH = GAME_WIDTH * (ch / cw);
      let scale = cw / renderW;

      this.ctx.save();
      this.ctx.clearRect(0, 0, cw, ch);
      this.ctx.scale(scale, scale);

      // 1. 战场背景底色
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

      // 2. 底层地形渲染：水路、冰场、砖块、铁块
      for (let r = 0; r < SUB_ROWS; r++) {
        for (let c = 0; c < SUB_COLS; c++) {
          const tile = this.subGrid[r][c];
          const x = c * SUB_TILE_SIZE;
          const y = r * SUB_TILE_SIZE;

          if (tile === TILE.ICE) {
            // 冰场
            this.ctx.fillStyle = '#e0f0f8';
            this.ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x + 2, y + 2, SUB_TILE_SIZE - 4, 2);
            this.ctx.fillRect(x + 2, y + 2, 2, SUB_TILE_SIZE - 4);
            this.ctx.fillStyle = '#a0c8d8';
            this.ctx.fillRect(x + 4, y + SUB_TILE_SIZE - 3, SUB_TILE_SIZE - 6, 1);
          } else if (tile === TILE.WATER) {
            // 水路（带波浪微动画）
            this.ctx.fillStyle = '#2040d0';
            this.ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
            this.ctx.fillStyle = '#4090ff';
            const waveShift = (Math.floor(this.animTick / 10) % 4) * 2;
            this.ctx.fillRect(x + waveShift, y + 3, 6, 2);
            this.ctx.fillRect(x + ((waveShift + 8) % SUB_TILE_SIZE), y + 9, 6, 2);
          } else if (tile === TILE.BRICK) {
            // 砖块
            this.ctx.fillStyle = '#b84418';
            this.ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(x, y + 7, SUB_TILE_SIZE, 2);
            this.ctx.fillRect(x + 7, y, 2, 8);
          } else if (tile === TILE.IRON) {
            // 钢板
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x + 2, y + 2, SUB_TILE_SIZE - 4, SUB_TILE_SIZE - 4);
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(x + 4, y + 4, SUB_TILE_SIZE - 8, SUB_TILE_SIZE - 8);
          }
        }
      }

      // 3. 大本营基地 (Row 12, Col 6 => x=192, y=384)
      const baseX = 6 * TILE_SIZE;
      const baseY = 12 * TILE_SIZE;
      if (!this.baseDestroyed) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(baseX, baseY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = '#d8a000';
        this.ctx.beginPath();
        this.ctx.moveTo(baseX + 16, baseY + 2);
        this.ctx.lineTo(baseX + 30, baseY + 30);
        this.ctx.lineTo(baseX + 16, baseY + 24);
        this.ctx.lineTo(baseX + 2, baseY + 30);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(baseX + 14, baseY + 6, 4, 4);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(baseX + 15, baseY + 7, 2, 2);
      } else {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(baseX, baseY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = '#777777';
        this.ctx.fillRect(baseX + 4, baseY + 4, 24, 24);
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(baseX + 8, baseY + 8, 16, 16);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('RIP', baseX + 16, baseY + 20);
      }

      // 4. 掉落道具渲染
      this.powerups.forEach(p => {
        if (p.timer < 300 && Math.floor(p.timer / 15) % 2 === 0) return;
        this.drawPowerup(p);
      });

      // 5. 敌军坦克渲染
      this.enemies.forEach(e => {
        if (!e.alive) return;
        const flashColor = (e.isFlashing && Math.floor(this.animTick / 8) % 2 === 0) ? '#ff1744' : e.color;
        const inWater = this.isOnWater(e);
        this.drawTank(e.x, e.y, e.size, e.dir, flashColor, false, 0, e.hasBoat, inWater, e.shield > 0, this.clockFreezeTimer > 0, e.type);
      });

      // 6. 玩家坦克渲染
      if (this.player.alive) {
        const inWater = this.isOnWater(this.player);
        this.drawTank(this.player.x, this.player.y, this.player.size, this.player.dir, '#ffd700', true, this.starCount, this.hasBoat, inWater, false, this.player.isFrozen, null);
        if (this.player.shield > 0) {
          this.drawShield(this.ctx, this.player.x + 14, this.player.y + 14, this.player.shield, this.animTick);
        }
      }

      // 7. 顶层草地/树林渲染 (覆盖在坦克上方，营造真实潜伏遮蔽感)
      for (let r = 0; r < SUB_ROWS; r++) {
        for (let c = 0; c < SUB_COLS; c++) {
          if (this.subGrid[r][c] === TILE.FOREST) {
            const x = c * SUB_TILE_SIZE;
            const y = r * SUB_TILE_SIZE;
            this.ctx.fillStyle = '#008000';
            this.ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
            this.ctx.fillStyle = '#00b800';
            for (let i = 0; i < SUB_TILE_SIZE; i += 4) {
              for (let j = 0; j < SUB_TILE_SIZE; j += 4) {
                if ((i + j) % 8 === 0) this.ctx.fillRect(x + i, y + j, 2, 2);
              }
            }
          }
        }
      }

      // 8. 子弹渲染
      this.ctx.fillStyle = '#ffffff';
      this.bullets.forEach(b => {
        this.ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
        if (b.canBurnForest) {
          this.ctx.fillStyle = '#ff9100';
          this.ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
          this.ctx.fillStyle = '#ffffff';
        }
      });

      // 9. 特效与飘字渲染
      this.effects.forEach(eff => {
        if (eff.type === 'explode') {
          this.ctx.fillStyle = eff.frame < 6 ? '#ffea00' : '#ff3d00';
          const r = (eff.frame / 14) * (eff.isBig ? 28 : 16);
          this.ctx.beginPath();
          this.ctx.arc(eff.x + 14, eff.y + 14, r, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (eff.type === 'hit' || eff.type === 'burn') {
          this.ctx.fillStyle = eff.type === 'burn' ? '#ff9100' : '#ffffff';
          this.ctx.fillRect(eff.x + 4, eff.y + 4, 8, 8);
        } else if (eff.type === 'spawn') {
          const phase = eff.frame % 16;
          const r = (phase / 16) * 14;
          this.ctx.fillStyle = phase % 4 < 2 ? '#ffffff' : '#ffd700';
          this.ctx.fillRect(eff.x + 14 - r, eff.y + 14 - 2, r * 2, 4);
          this.ctx.fillRect(eff.x + 14 - 2, eff.y + 14 - r, 4, r * 2);
        } else if (eff.type === 'floatText') {
          this.ctx.save();
          this.ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0, eff.alpha)})`;
          this.ctx.font = 'bold 12px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(eff.text, eff.x + 30, eff.y);
          this.ctx.restore();
        }
      });

      // 10. 侧边栏仪表盘
      this.ctx.fillStyle = '#7f7f7f';
      this.ctx.fillRect(STAGE_WIDTH, 0, SIDEBAR_WIDTH, STAGE_HEIGHT);

      // 关卡编号
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('第 ' + (this.currentStage + 1) + ' 关', STAGE_WIDTH + 32, 22);

      // 敌军 20 辆坦克图标状态
      const enemiesLeft = this.enemiesRemaining;
      for (let i = 0; i < 20; i++) {
        const rx = STAGE_WIDTH + 16 + (i % 2) * 18;
        const ry = 36 + Math.floor(i / 2) * 14;
        if (i < enemiesLeft) {
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(rx, ry, 11, 9);
        } else {
          this.ctx.strokeStyle = '#555555';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(rx, ry, 11, 9);
        }
      }

      // 等级与星级
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.fillText('火力等级', STAGE_WIDTH + 32, STAGE_HEIGHT - 170);

      const starIcons = ['☆☆☆', '★☆☆', '★★☆', '★★★'][this.starCount];
      this.ctx.fillStyle = this.starCount > 0 ? '#ffb300' : '#333333';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.fillText(starIcons, STAGE_WIDTH + 32, STAGE_HEIGHT - 152);

      // 战船装备标记
      if (this.hasBoat) {
        this.ctx.fillStyle = '#ff6d00';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.fillText('⛵ 战船渡水', STAGE_WIDTH + 32, STAGE_HEIGHT - 132);
      } else {
        this.ctx.fillStyle = '#555555';
        this.ctx.font = '11px sans-serif';
        this.ctx.fillText('无战船', STAGE_WIDTH + 32, STAGE_HEIGHT - 132);
      }

      // 玩家生命
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.fillText('生命', STAGE_WIDTH + 24, STAGE_HEIGHT - 95);
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillRect(STAGE_WIDTH + 14, STAGE_HEIGHT - 85, 12, 12);
      this.ctx.fillStyle = '#000000';
      this.ctx.fillText(`x${this.lives}`, STAGE_WIDTH + 42, STAGE_HEIGHT - 74);

      // 得分
      this.ctx.fillText('得分', STAGE_WIDTH + 32, STAGE_HEIGHT - 45);
      this.ctx.fillText(`${this.score}`, STAGE_WIDTH + 32, STAGE_HEIGHT - 25);

      // 11. 下方街机控制台
      this.ctx.fillStyle = '#181818';
      this.ctx.fillRect(0, STAGE_HEIGHT, renderW, renderH - STAGE_HEIGHT);

      const dpadX = CTRL.DPAD_X;
      const dpadY = STAGE_HEIGHT + CTRL.DPAD_OFFSET_Y;
      const fireX = CTRL.FIRE_X;
      const fireY = STAGE_HEIGHT + CTRL.FIRE_OFFSET_Y;
      const restartX = GAME_WIDTH / 2;
      const restartY = STAGE_HEIGHT + CTRL.RESTART_OFFSET_Y;

      // 十字手柄
      const cr = 60, barW = 42;
      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(dpadX - barW / 2, dpadY - cr, barW, cr * 2);
      this.ctx.fillRect(dpadX - cr, dpadY - barW / 2, cr * 2, barW);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('▲', dpadX, dpadY - 32);
      this.ctx.fillText('▼', dpadX, dpadY + 32);
      this.ctx.fillText('◀', dpadX - 32, dpadY);
      this.ctx.fillText('▶', dpadX + 32, dpadY);

      // 重来按钮
      this.ctx.fillStyle = '#424242';
      this.ctx.beginPath();
      this.ctx.arc(restartX, restartY, 26, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#757575';
      this.ctx.stroke();

      this.ctx.fillStyle = '#eeeeee';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText('重来', restartX, restartY);

      // 开火大红钮
      this.ctx.fillStyle = '#e53935';
      this.ctx.beginPath();
      this.ctx.arc(fireX, fireY, 48, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 22px sans-serif';
      this.ctx.fillText('开火', fireX, fireY);

      // 12. 状态遮罩覆盖层
      if (this.gameState === 'STAGE_START') {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 26px sans-serif';
        this.ctx.fillText(`第 ${this.currentStage + 1} 关`, STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 15);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px sans-serif';
        this.ctx.fillText(LEVELS[this.currentStage].name, STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 20);
      } else if (this.gameState === 'STAGE_CLEAR') {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
        this.ctx.fillStyle = '#00e676';
        this.ctx.font = 'bold 28px sans-serif';
        this.ctx.fillText('STAGE CLEAR!', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 15);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '15px sans-serif';
        this.ctx.fillText('全歼 20 辆敌军！即将进入下一关', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 20);
      } else if (this.gameState === 'VICTORY') {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 30px sans-serif';
        this.ctx.fillText('★ ALL CLEARED! ★', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 40);
        this.ctx.fillStyle = '#00e5ff';
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.fillText('恭喜通关全部 20 关！', STAGE_WIDTH / 2, STAGE_HEIGHT / 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '15px sans-serif';
        this.ctx.fillText(`最终总得分: ${this.score}`, STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 35);
        this.ctx.fillStyle = '#ff9100';
        this.ctx.font = '13px sans-serif';
        this.ctx.fillText('点击屏幕或按回车重新挑战', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 70);
      } else if (this.gameState === 'GAMEOVER') {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
        this.ctx.fillStyle = '#e53935';
        this.ctx.font = 'bold 36px sans-serif';
        this.ctx.fillText('GAME OVER', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 20);
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '16px sans-serif';
        this.ctx.fillText(this.baseDestroyed ? '老巢被摧毁！大本营沦陷！' : '全军覆没！点击重开', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 30);
      }

      this.ctx.restore();
    }

    // 绘制道具
    drawPowerup(item) {
      const { x, y, size = 26, type } = item;
      const cx = x + size / 2;
      const cy = y + size / 2;

      this.ctx.save();
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x, y, size, size);
      this.ctx.strokeStyle = '#ff6d00';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(x, y, size, size);

      switch (type) {
        case POWERUP_TYPE.STAR: {
          this.ctx.fillStyle = '#ffd700';
          const r = size / 2 - 3;
          this.ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            this.ctx.lineTo(cx + Math.cos(((18 + i * 72) * Math.PI) / 180) * r, cy - Math.sin(((18 + i * 72) * Math.PI) / 180) * r);
            this.ctx.lineTo(cx + Math.cos(((54 + i * 72) * Math.PI) / 180) * (r * 0.46), cy - Math.sin(((54 + i * 72) * Math.PI) / 180) * (r * 0.46));
          }
          this.ctx.closePath();
          this.ctx.fill();
          break;
        }
        case POWERUP_TYPE.GUN: {
          // 手枪道具
          this.ctx.fillStyle = '#b0bec5';
          this.ctx.fillRect(cx - 7, cy - 5, 14, 5);
          this.ctx.fillStyle = '#37474f';
          this.ctx.fillRect(cx + 6, cy - 6, 2, 6);
          this.ctx.fillStyle = '#8d6e63';
          this.ctx.fillRect(cx - 5, cy, 5, 7);
          this.ctx.fillStyle = '#ffd700';
          this.ctx.fillRect(cx - 4, cy - 9, 3, 3);
          this.ctx.fillRect(cx + 1, cy - 9, 3, 3);
          break;
        }
        case POWERUP_TYPE.BOAT: {
          // 战船道具
          this.ctx.fillStyle = '#00bcd4';
          this.ctx.fillRect(cx - 9, cy + 4, 18, 3);
          this.ctx.fillStyle = '#ff9800';
          this.ctx.beginPath();
          this.ctx.moveTo(cx - 8, cy + 3);
          this.ctx.lineTo(cx + 8, cy + 3);
          this.ctx.lineTo(cx + 5, cy + 8);
          this.ctx.lineTo(cx - 5, cy + 8);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(cx - 2, cy - 6, 3, 9);
          this.ctx.fillStyle = '#e53935';
          this.ctx.beginPath();
          this.ctx.moveTo(cx + 1, cy - 6);
          this.ctx.lineTo(cx + 7, cy - 1);
          this.ctx.lineTo(cx + 1, cy - 1);
          this.ctx.closePath();
          this.ctx.fill();
          break;
        }
        case POWERUP_TYPE.SHOVEL: {
          this.ctx.fillStyle = '#8d6e63';
          this.ctx.fillRect(cx - 2, cy - 3, 4, 12);
          this.ctx.fillStyle = '#cfd8dc';
          this.ctx.fillRect(cx - 6, cy - 8, 12, 7);
          break;
        }
        case POWERUP_TYPE.BOMB: {
          this.ctx.fillStyle = '#f44336';
          this.ctx.beginPath();
          this.ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(cx - 2, cy - 7, 4, 4);
          this.ctx.fillStyle = '#ffd700';
          this.ctx.fillRect(cx - 1, cy - 9, 2, 2);
          break;
        }
        case POWERUP_TYPE.CLOCK: {
          this.ctx.fillStyle = '#00bcd4';
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(cx - 1, cy - 5, 2, 5);
          this.ctx.fillRect(cx - 1, cy - 1, 4, 2);
          break;
        }
        case POWERUP_TYPE.HELMET: {
          this.ctx.fillStyle = '#4caf50';
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, 8, Math.PI, 0);
          this.ctx.lineTo(cx + 8, cy + 4);
          this.ctx.lineTo(cx - 8, cy + 4);
          this.ctx.closePath();
          this.ctx.fill();
          break;
        }
        case POWERUP_TYPE.TANK: {
          this.ctx.fillStyle = '#e91e63';
          this.ctx.fillRect(cx - 6, cy - 6, 12, 12);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(cx - 2, cy - 9, 4, 5);
          break;
        }
      }
      this.ctx.restore();
    }

    // 绘制坦克本体
    drawTank(x, y, size, dir, color, isPlayer = false, starCount = 0, hasBoat = false, inWater = false, hasShield = false, isFrozen = false, enemyType = null) {
      this.ctx.save();
      this.ctx.translate(x + size / 2, y + size / 2);
      this.ctx.rotate((dir * 90 * Math.PI) / 180);

      const s = size;
      const hs = s / 2;

      // 1. 战船渡水两栖底座 (渡水浮筒)
      if (hasBoat) {
        this.ctx.fillStyle = '#ff9800';
        this.ctx.fillRect(-hs - 3, -hs - 2, s + 6, s + 4);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-hs - 1, -hs, s + 2, s);
        // 船头尖角导流板
        this.ctx.fillStyle = '#ff5722';
        this.ctx.beginPath();
        this.ctx.moveTo(-hs - 3, -hs - 2);
        this.ctx.lineTo(0, -hs - 6);
        this.ctx.lineTo(hs + 3, -hs - 2);
        this.ctx.closePath();
        this.ctx.fill();

        if (inWater) {
          this.ctx.strokeStyle = '#40c4ff';
          this.ctx.lineWidth = 1.5;
          const wave = (Math.floor(this.animTick / 6) % 3) * 2;
          this.ctx.strokeRect(-hs - 4 - wave, -hs - 4 - wave, s + 8 + wave * 2, s + 8 + wave * 2);
        }
      }

      // 2. 履带
      this.ctx.fillStyle = (isPlayer && starCount >= 2) ? '#1a1a1a' : '#333333';
      this.ctx.fillRect(-hs, -hs, s * 0.24, s);
      this.ctx.fillRect(hs - s * 0.24, -hs, s * 0.24, s);

      // 3. 车身底盘
      this.ctx.fillStyle = color;
      this.ctx.fillRect(-s * 0.26, -s * 0.35, s * 0.52, s * 0.7);

      if (isPlayer) {
        if (starCount === 1) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(-s * 0.22, -s * 0.35, s * 0.44, 3);
        } else if (starCount >= 2) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(-s * 0.26, -s * 0.2, 3, s * 0.4);
          this.ctx.fillRect(s * 0.26 - 3, -s * 0.2, 3, s * 0.4);
          this.ctx.fillRect(-s * 0.22, -s * 0.35, s * 0.44, 4);
        }
      }

      // 极速坦克特殊喷射尾翼
      if (enemyType === ENEMY_TYPE.SUPER_FAST) {
        this.ctx.fillStyle = '#00e5ff';
        this.ctx.fillRect(-s * 0.28, hs - 3, s * 0.16, 5);
        this.ctx.fillRect(s * 0.12, hs - 3, s * 0.16, 5);
      }

      // 4. 炮塔中心
      this.ctx.fillStyle = '#111111';
      this.ctx.fillRect(-s * 0.16, -s * 0.16, s * 0.32, s * 0.32);
      this.ctx.fillStyle = (isPlayer && starCount >= 3) ? '#00e5ff' : color;
      this.ctx.fillRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24);

      // 5. 炮管形态
      if (isPlayer && starCount >= 2) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-4, -hs - 6, 8, hs + 4);
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(-3, -hs - 5, 6, hs + 3);
        this.ctx.fillStyle = '#d50000';
        this.ctx.fillRect(-5, -hs - 8, 10, 3);
      } else if (isPlayer && starCount === 1) {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(-3, -hs - 5, 6, hs + 3);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-4, -hs - 6, 8, 2);
      } else {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-2, -hs - 2, 4, hs);
      }

      // 6. 3星免死机甲角标
      if (isPlayer && starCount >= 3) {
        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.lineWidth = 2;
        const b = hs + 2;
        const cl = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(-b, -b + cl); this.ctx.lineTo(-b, -b); this.ctx.lineTo(-b + cl, -b);
        this.ctx.moveTo(b - cl, -b); this.ctx.lineTo(b, -b); this.ctx.lineTo(b, -b + cl);
        this.ctx.moveTo(-b, b - cl); this.ctx.lineTo(-b, b); this.ctx.lineTo(-b + cl, b);
        this.ctx.moveTo(b - cl, b); this.ctx.lineTo(b, b); this.ctx.lineTo(b, b - cl);
        this.ctx.stroke();
      }

      // 7. 冰冻霜晶覆盖效果
      if (isFrozen) {
        this.ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
        this.ctx.fillRect(-hs - 2, -hs - 2, s + 4, s + 4);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(-hs - 2, -hs - 2, s + 4, s + 4);
      }

      // 8. 敌军护盾光环
      if (hasShield) {
        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, hs + 4, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    // 绘制高品质光子能量护盾
    drawShield(ctx, cx, cy, shieldFrames, animTick) {
      ctx.save();
      let alpha = 0.88 + 0.12 * Math.sin(animTick * 0.08);
      let primaryColor = '#00f0ff';

      if (shieldFrames <= 60) {
        const warnFreq = Math.sin(animTick * 0.28);
        alpha = 0.5 + 0.5 * Math.abs(warnFreq);
        if (warnFreq < 0) primaryColor = '#ffd166';
      }
      ctx.globalAlpha = alpha;

      const r = 21 + Math.sin(animTick * 0.08) * 1.2;
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      const outerRot = animTick * 0.04;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = primaryColor;

      for (let i = 0; i < 3; i++) {
        const startAng = outerRot + (i * (Math.PI * 2 / 3));
        const endAng = startAng + (Math.PI * 2 / 3) * 0.65;
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAng, endAng);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 暴露给全局以便测试与调试
  if (typeof window !== 'undefined') {
    window.TankGame = TankGame;
    window.LEVELS = LEVELS;
    window.TILE = TILE;
    window.ENEMY_TYPE = ENEMY_TYPE;
    window.ENEMY_CONFIG = ENEMY_CONFIG;
    window.POWERUP_TYPE = POWERUP_TYPE;
    window.SUB_TILE_SIZE = SUB_TILE_SIZE;
  }
  if (typeof global !== 'undefined') {
    global.TankGame = TankGame;
    global.LEVELS = LEVELS;
    global.TILE = TILE;
    global.ENEMY_TYPE = ENEMY_TYPE;
    global.ENEMY_CONFIG = ENEMY_CONFIG;
    global.POWERUP_TYPE = POWERUP_TYPE;
    global.SUB_TILE_SIZE = SUB_TILE_SIZE;
  }
  try {
    const mainCanvas = (typeof canvas !== 'undefined') ? canvas : (typeof wx !== 'undefined' && wx.createCanvas ? wx.createCanvas() : (typeof document !== 'undefined' ? document.getElementById('gameCanvas') : null));

    if (mainCanvas) {
      if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
        const sysInfo = wx.getSystemInfoSync();
        const dpr = sysInfo.pixelRatio || 2;
        mainCanvas.width = sysInfo.windowWidth * dpr;
        mainCanvas.height = sysInfo.windowHeight * dpr;
      }

      new TankGame(mainCanvas);
      console.log('🎮 坦克大战 20 关极速全功能版已启动就绪！');
    }
  } catch (err) {
    console.error('启动异常:', err);
  }
})();
