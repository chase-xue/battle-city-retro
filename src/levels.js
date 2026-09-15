// 经典关卡数据与敌军波次编队
import { TILE, ENEMY_TYPE } from './constants.js';

const E = TILE.EMPTY;
const B = TILE.BRICK;
const I = TILE.IRON;
const F = TILE.FOREST;
const W = TILE.WATER;
const C = TILE.ICE;
const H = TILE.BASE;

export const LEVELS = [
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
