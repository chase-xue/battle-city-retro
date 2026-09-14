// 地图与微网格碰撞管理器
import { GRID_COLS, GRID_ROWS, SUB_GRID, TILE_SIZE, TILE, DIR } from './constants.js';
import { SpriteRenderer } from './sprites.js';
import { sounds } from './audio.js';

export const SUB_COLS = GRID_COLS * SUB_GRID; // 26
export const SUB_ROWS = GRID_ROWS * SUB_GRID; // 26
export const SUB_TILE_SIZE = TILE_SIZE / SUB_GRID; // 16

export class GameMap {
  constructor() {
    this.subGrid = Array(SUB_ROWS).fill(0).map(() => Array(SUB_COLS).fill(TILE.EMPTY));
    this.baseDestroyed = false;
    this.shovelTimer = 0;
    this.shovelOriginalTiles = null;
  }

  // 从 13x13 关卡大网格加载并展开为 26x26 微网格
  loadLevel(levelLayout) {
    this.subGrid = Array(SUB_ROWS).fill(0).map(() => Array(SUB_COLS).fill(TILE.EMPTY));
    this.baseDestroyed = false;
    this.shovelTimer = 0;
    this.shovelOriginalTiles = null;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tileType = levelLayout[r] ? levelLayout[r][c] || TILE.EMPTY : TILE.EMPTY;
        const sr = r * SUB_GRID;
        const sc = c * SUB_GRID;

        if (tileType === TILE.BASE) {
          // 老鹰基地占用 2x2 微格
          this.subGrid[sr][sc] = TILE.BASE;
          this.subGrid[sr][sc + 1] = TILE.BASE;
          this.subGrid[sr + 1][sc] = TILE.BASE;
          this.subGrid[sr + 1][sc + 1] = TILE.BASE;
        } else {
          for (let dr = 0; dr < SUB_GRID; dr++) {
            for (let dc = 0; dc < SUB_GRID; dc++) {
              this.subGrid[sr + dr][sc + dc] = tileType;
            }
          }
        }
      }
    }
  }

  // 触发铁锹加固老鹰周围防御
  activateShovel(durationSeconds = 15) {
    this.shovelTimer = durationSeconds * 60; // 帧数

    // 记录老鹰周围的微格坐标 (通常是基地的左、上、右围墙)
    // 基地位置一般在 col 12,13, row 24,25
    const eagleSurrounding = [
      { r: 23, c: 11 }, { r: 23, c: 12 }, { r: 23, c: 13 }, { r: 23, c: 14 },
      { r: 24, c: 11 }, { r: 24, c: 14 },
      { r: 25, c: 11 }, { r: 25, c: 14 }
    ];

    if (!this.shovelOriginalTiles) {
      this.shovelOriginalTiles = eagleSurrounding.map(pos => ({
        ...pos,
        type: this.subGrid[pos.r] ? this.subGrid[pos.r][pos.c] : TILE.BRICK
      }));
    }

    // 全部变为坚固铁墙
    eagleSurrounding.forEach(pos => {
      if (this.subGrid[pos.r] && this.subGrid[pos.r][pos.c] !== undefined) {
        this.subGrid[pos.r][pos.c] = TILE.IRON;
      }
    });
  }

  update() {
    if (this.shovelTimer > 0) {
      this.shovelTimer--;
      // 结束时恢复为砖块
      if (this.shovelTimer === 0 && this.shovelOriginalTiles) {
        this.shovelOriginalTiles.forEach(pos => {
          if (this.subGrid[pos.r] && this.subGrid[pos.r][pos.c] !== undefined) {
            this.subGrid[pos.r][pos.c] = TILE.BRICK;
          }
        });
        this.shovelOriginalTiles = null;
      }
    }
  }

  // 坦克移动碰撞检测（不能穿透砖、铁、水、基地、边界）
  canTankPass(x, y, size) {
    if (x < 0 || y < 0 || x + size > SUB_COLS * SUB_TILE_SIZE || y + size > SUB_ROWS * SUB_TILE_SIZE) {
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
        if (tile === TILE.BRICK || tile === TILE.IRON || tile === TILE.WATER || tile === TILE.BASE || tile === TILE.BASE_DESTROYED) {
          return false;
        }
      }
    }
    return true;
  }

  // 检查坦克所在地面是否为冰面
  isOnIce(x, y, size) {
    const cx = Math.floor((x + size / 2) / SUB_TILE_SIZE);
    const cy = Math.floor((y + size / 2) / SUB_TILE_SIZE);
    if (cy >= 0 && cy < SUB_ROWS && cx >= 0 && cx < SUB_COLS) {
      return this.subGrid[cy][cx] === TILE.ICE;
    }
    return false;
  }

  // 子弹与地形的碰撞处理
  checkBulletHit(bullet) {
    const bx = bullet.x;
    const by = bullet.y;
    const bs = bullet.size;

    // 越界碰撞
    if (bx < 0 || by < 0 || bx > SUB_COLS * SUB_TILE_SIZE || by > SUB_ROWS * SUB_TILE_SIZE) {
      return { hit: true, target: 'border' };
    }

    // 计算子弹覆盖的微格
    let minC = Math.floor((bx - bs / 2) / SUB_TILE_SIZE);
    let maxC = Math.floor((bx + bs / 2) / SUB_TILE_SIZE);
    let minR = Math.floor((by - bs / 2) / SUB_TILE_SIZE);
    let maxR = Math.floor((by + bs / 2) / SUB_TILE_SIZE);

    // 根据子弹飞行朝向适当扩展检测面，确保横截面的微格均被破坏
    if (bullet.dir === DIR.UP || bullet.dir === DIR.DOWN) {
      minC = Math.floor((bx - 6) / SUB_TILE_SIZE);
      maxC = Math.floor((bx + 6) / SUB_TILE_SIZE);
    } else {
      minR = Math.floor((by - 6) / SUB_TILE_SIZE);
      maxR = Math.floor((by + 6) / SUB_TILE_SIZE);
    }

    minC = Math.max(0, Math.min(SUB_COLS - 1, minC));
    maxC = Math.max(0, Math.min(SUB_COLS - 1, maxC));
    minR = Math.max(0, Math.min(SUB_ROWS - 1, minR));
    maxR = Math.max(0, Math.min(SUB_ROWS - 1, maxR));

    let hitSomething = false;
    let hitIron = false;
    let hitBase = false;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const tile = this.subGrid[r][c];

        if (tile === TILE.BRICK) {
          this.subGrid[r][c] = TILE.EMPTY;
          hitSomething = true;
        } else if (tile === TILE.IRON) {
          if (bullet.canBreakIron) {
            this.subGrid[r][c] = TILE.EMPTY;
          }
          hitIron = true;
          hitSomething = true;
        } else if (tile === TILE.BASE) {
          this.baseDestroyed = true;
          hitBase = true;
          hitSomething = true;
        }
      }
    }

    if (hitIron && !bullet.canBreakIron) {
      sounds.playHitIron();
    }

    if (hitBase) {
      sounds.playExplosion(true);
      return { hit: true, target: 'base' };
    }

    if (hitSomething) {
      return { hit: true, target: hitIron ? 'iron' : 'brick' };
    }

    return { hit: false };
  }

  // 渲染底层地形（砖、铁、水、冰、老鹰）
  renderBackground(ctx, animFrame = 0) {
    for (let r = 0; r < SUB_ROWS; r++) {
      for (let c = 0; c < SUB_COLS; c++) {
        const tile = this.subGrid[r][c];
        const x = c * SUB_TILE_SIZE;
        const y = r * SUB_TILE_SIZE;

        if (tile === TILE.BRICK) {
          SpriteRenderer.drawBrick(ctx, x, y, SUB_TILE_SIZE);
        } else if (tile === TILE.IRON) {
          SpriteRenderer.drawIron(ctx, x, y, SUB_TILE_SIZE);
        } else if (tile === TILE.WATER) {
          SpriteRenderer.drawWater(ctx, x, y, SUB_TILE_SIZE, animFrame);
        } else if (tile === TILE.ICE) {
          SpriteRenderer.drawIce(ctx, x, y, SUB_TILE_SIZE);
        }
      }
    }

    // 绘制基地 (大格坐标 (6, 12) 对应微格 (12, 24) 位置)
    const baseX = 12 * SUB_TILE_SIZE;
    const baseY = 24 * SUB_TILE_SIZE;
    SpriteRenderer.drawBase(ctx, baseX, baseY, TILE_SIZE, this.baseDestroyed);
  }

  // 渲染顶层覆盖地形（森林草丛，遮挡在坦克上方）
  renderForeground(ctx) {
    for (let r = 0; r < SUB_ROWS; r++) {
      for (let c = 0; c < SUB_COLS; c++) {
        const tile = this.subGrid[r][c];
        if (tile === TILE.FOREST) {
          SpriteRenderer.drawForest(ctx, c * SUB_TILE_SIZE, r * SUB_TILE_SIZE, SUB_TILE_SIZE);
        }
      }
    }
  }
}
