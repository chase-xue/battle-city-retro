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
  // 第一关：经典第一关
  {
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
      [E, B, E, E, E, B, B, B, E, E, E, B, E],
      [E, B, E, B, E, B, H, B, E, B, E, B, E],
      [E, E, E, B, E, B, B, B, E, B, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: true }, // 掉宝坦克
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: true },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: true },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false }
    ]
  },

  // 第二关：河流与森林交错
  {
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
      [E, B, E, I, E, B, B, B, E, I, E, B, E],
      [E, B, E, I, E, B, H, B, E, I, E, B, E],
      [E, E, E, E, E, B, B, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: true },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: true },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: true },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.BASIC, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false }
    ]
  },

  // 第三关：冰原与钢铁堡垒
  {
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
      [I, E, B, B, E, B, B, B, E, B, B, E, I],
      [E, E, E, E, E, B, H, B, E, E, E, E, E],
      [E, E, E, E, E, B, B, B, E, E, E, E, E]
    ],
    enemies: [
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: true },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: true },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: true },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.POWER, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false },
      { type: ENEMY_TYPE.FAST,  isFlashing: false },
      { type: ENEMY_TYPE.ARMOR, isFlashing: false }
    ]
  }
];
