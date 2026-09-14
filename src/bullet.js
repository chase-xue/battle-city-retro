// 子弹实体与弹道系统
import { DIR, DIR_OFFSET } from './constants.js';
import { SpriteRenderer } from './sprites.js';

export class Bullet {
  constructor({ x, y, dir, speed, owner, canBreakIron = false }) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.speed = speed;
    this.owner = owner; // 'player' | 'enemy'
    this.canBreakIron = canBreakIron;
    this.size = 6;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    const offset = DIR_OFFSET[this.dir];
    this.x += offset.x * this.speed;
    this.y += offset.y * this.speed;
  }

  render(ctx) {
    if (!this.active) return;
    SpriteRenderer.drawBullet(ctx, this.x, this.y, this.size);
  }

  // 子弹与子弹在空中碰撞检测
  checkBulletCollision(other) {
    if (!this.active || !other.active) return false;
    // 己方子弹之间不相撞
    if (this.owner === other.owner) return false;

    const dx = Math.abs(this.x - other.x);
    const dy = Math.abs(this.y - other.y);
    const hitDist = (this.size + other.size) * 0.75;

    if (dx < hitDist && dy < hitDist) {
      this.active = false;
      other.active = false;
      return true;
    }
    return false;
  }
}
