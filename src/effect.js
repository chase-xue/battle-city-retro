// 粒子与视觉动画管理器
import { SpriteRenderer } from './sprites.js';

export class EffectManager {
  constructor() {
    this.effects = [];
  }

  // 添加爆炸特效
  addExplosion(x, y, size = 32, isBig = false) {
    this.effects.push({
      type: 'explosion',
      x,
      y,
      size: isBig ? size * 1.5 : size,
      frame: 0,
      maxFrames: isBig ? 24 : 14
    });
  }

  // 添加出生星芒
  addSpawnStar(x, y, size = 32, onComplete = null) {
    this.effects.push({
      type: 'spawn',
      x,
      y,
      size,
      frame: 0,
      maxFrames: 45,
      onComplete
    });
  }

  // 添加得分飘字
  addScorePopup(x, y, score) {
    this.effects.push({
      type: 'score',
      x,
      y,
      score: `+${score}`,
      frame: 0,
      maxFrames: 30
    });
  }

  update() {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const eff = this.effects[i];
      eff.frame++;

      if (eff.type === 'score') {
        eff.y -= 0.6; // 向上飘动
      }

      if (eff.frame >= eff.maxFrames) {
        if (eff.onComplete) {
          eff.onComplete();
        }
        this.effects.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const eff of this.effects) {
      if (eff.type === 'explosion') {
        SpriteRenderer.drawExplosion(ctx, eff.x, eff.y, eff.size, eff.frame, eff.maxFrames);
      } else if (eff.type === 'spawn') {
        SpriteRenderer.drawSpawnStar(ctx, eff.x, eff.y, eff.size, eff.frame);
      } else if (eff.type === 'score') {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(eff.score, eff.x + 16, eff.y);
        ctx.restore();
      }
    }
  }

  clear() {
    this.effects = [];
  }
}
