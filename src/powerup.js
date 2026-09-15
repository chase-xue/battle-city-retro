// 掉落道具系统
import { POWERUP_TYPE, STAGE_WIDTH, STAGE_HEIGHT, TILE_SIZE } from './constants.js';
import { SpriteRenderer } from './sprites.js';
import { sounds } from './audio.js';

const POWERUP_POOL = [
  POWERUP_TYPE.STAR,
  POWERUP_TYPE.BOMB,
  POWERUP_TYPE.CLOCK,
  POWERUP_TYPE.SHOVEL,
  POWERUP_TYPE.HELMET,
  POWERUP_TYPE.TANK,
  POWERUP_TYPE.GUN,
  POWERUP_TYPE.BOAT
];

export class PowerUp {
  constructor(type = null, x = null, y = null) {
    this.type = type || POWERUP_POOL[Math.floor(Math.random() * POWERUP_POOL.length)];
    this.size = 28;
    // 随机出现在地图可行区域内（避开最边缘）
    this.x = x !== null ? x : Math.floor(Math.random() * (STAGE_WIDTH - this.size - TILE_SIZE * 2)) + TILE_SIZE;
    this.y = y !== null ? y : Math.floor(Math.random() * (STAGE_HEIGHT - this.size - TILE_SIZE * 2)) + TILE_SIZE;
    this.active = true;
    this.frame = 0;
    this.lifeSpan = 60 * 25; // 25秒后未拾取自动消失
  }

  update() {
    this.frame++;
    if (this.lifeSpan > 0) {
      this.lifeSpan--;
      if (this.lifeSpan <= 0) {
        this.active = false;
      }
    }
  }

  render(ctx) {
    if (!this.active) return;
    // 快消失前闪烁
    if (this.lifeSpan < 180 && Math.floor(this.frame / 6) % 2 === 0) {
      return;
    }
    SpriteRenderer.drawPowerup(ctx, this.x, this.y, this.size, this.type, this.frame);
  }

  // 坦克拾取碰撞检测（玩家或敌军均可拾取）
  checkPick(tank) {
    if (!this.active || !tank || !tank.alive) return false;
    const tx = tank.x;
    const ty = tank.y;
    const ts = tank.size;

    if (
      this.x < tx + ts &&
      this.x + this.size > tx &&
      this.y < ty + ts &&
      this.y + this.size > ty
    ) {
      this.active = false;
      sounds.playPowerup();
      return true;
    }
    return false;
  }
}
