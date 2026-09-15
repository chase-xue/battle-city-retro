// 纯 Canvas 像素风格精灵绘制器（保持经典 FC 复古质感）
import { DIR, TILE, ENEMY_TYPE, POWERUP_TYPE } from './constants.js';

export class SpriteRenderer {
  // 绘制砖块 (size x size，通常为微格 16x16)
  static drawBrick(ctx, x, y, size) {
    ctx.fillStyle = '#b84418';
    ctx.fillRect(x, y, size, size);

    // 砖缝阴影与高光细节
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y + size / 2 - 1, size, 2);
    ctx.fillRect(x + size / 2 - 1, y, 2, size / 2);
    ctx.fillRect(x + size / 4 - 1, y + size / 2, 2, size / 2);
    ctx.fillRect(x + (size * 3) / 4 - 1, y + size / 2, 2, size / 2);

    ctx.fillStyle = '#e89078';
    ctx.fillRect(x, y, size, 1);
    ctx.fillRect(x, y + size / 2 + 1, size, 1);
  }

  // 绘制铁块
  static drawIron(ctx, x, y, size) {
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    ctx.fillStyle = '#888888';
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
  }

  // 绘制水流 (带微动画波光)
  static drawWater(ctx, x, y, size, animFrame = 0) {
    ctx.fillStyle = '#2040d0';
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = '#4090ff';
    const shift = (animFrame % 4) * 2;
    for (let r = 0; r < 4; r++) {
      const offsetX = ((r % 2 === 0 ? shift : -shift) + size) % size;
      ctx.fillRect(x + offsetX, y + r * 4, 8, 2);
    }
  }

  // 绘制草丛/森林
  static drawForest(ctx, x, y, size) {
    ctx.fillStyle = '#008000';
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = '#00b800';
    // 杂草点阵
    for (let i = 0; i < size; i += 4) {
      for (let j = 0; j < size; j += 4) {
        if ((i + j) % 8 === 0) {
          ctx.fillRect(x + i, y + j, 2, 2);
        }
      }
    }
  }

  // 绘制冰块
  static drawIce(ctx, x, y, size) {
    ctx.fillStyle = '#e0f0f8';
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y + 2, size - 4, 2);
    ctx.fillRect(x + 2, y + 2, 2, size - 4);
    ctx.fillStyle = '#a0c8d8';
    ctx.fillRect(x + 4, y + size - 3, size - 6, 1);
  }

  // 绘制老鹰司令部
  static drawBase(ctx, x, y, size, isDestroyed = false) {
    if (!isDestroyed) {
      // 完好的金鹰
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, size, size);

      ctx.fillStyle = '#d8a000'; // 金色老鹰身躯
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 2);
      ctx.lineTo(x + size - 4, y + size - 4);
      ctx.lineTo(x + size / 2, y + size - 8);
      ctx.lineTo(x + 4, y + size - 4);
      ctx.closePath();
      ctx.fill();

      // 老鹰翅膀与头部细节
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + size / 2 - 2, y + 6, 4, 4);
      ctx.fillStyle = '#ff3000';
      ctx.fillRect(x + size / 2 - 1, y + 7, 2, 2); // 锐利红眼
    } else {
      // 被摧毁的白骨残骸
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, size, size);

      ctx.fillStyle = '#808080';
      ctx.fillRect(x + 4, y + 4, size - 8, size - 8);

      // 骷髅脸孔
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 8, y + 8, size - 16, size - 16);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 10, y + 12, 4, 4); // 眼窝
      ctx.fillRect(x + size - 14, y + 12, 4, 4);
      ctx.fillRect(x + size / 2 - 4, y + size - 14, 8, 3); // 嘴
    }
  }

  // 绘制坦克
  static drawTank(ctx, { x, y, size, dir, color, isPlayer = false, level = 1, animFrame = 0, isFlashing = false, hasBoat = false, isFrozen = false, inWater = false }) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    // 旋转到对应朝向 (0: UP, 1: RIGHT, 2: DOWN, 3: LEFT)
    ctx.rotate((dir * 90 * Math.PI) / 180);

    const s = size;
    const hs = s / 2;

    let mainColor = color;
    let secColor = '#404040';

    // 闪烁坦克涂装（红白切换）
    if (isFlashing) {
      const flash = Math.floor(animFrame / 4) % 2 === 0;
      mainColor = flash ? '#ff0000' : '#ffffff';
    }

    // 1. 战船渡水浮筒底座 (两栖气垫船型)
    if (hasBoat) {
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(-hs - 3, -hs - 2, s + 6, s + 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-hs - 1, -hs, s + 2, s);
      // 船头尖角导流板
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.moveTo(-hs - 3, -hs - 2);
      ctx.lineTo(0, -hs - 6);
      ctx.lineTo(hs + 3, -hs - 2);
      ctx.closePath();
      ctx.fill();

      // 水中航行浪花特效
      if (inWater) {
        ctx.strokeStyle = '#40c4ff';
        ctx.lineWidth = 2;
        const wave = (animFrame % 6) * 1.5;
        ctx.strokeRect(-hs - 4 - wave, -hs - 4 - wave, s + 8 + wave * 2, s + 8 + wave * 2);
      }
    }

    // 履带滚动交替
    const trackOffset = (Math.floor(animFrame / 4) % 2) * 2;

    // 2. 左右履带
    ctx.fillStyle = secColor;
    const trackW = s * 0.22;
    ctx.fillRect(-hs, -hs, trackW, s);
    ctx.fillRect(hs - trackW, -hs, trackW, s);

    // 履带纹理
    ctx.fillStyle = '#ffffff';
    for (let ty = -hs + trackOffset; ty < hs; ty += 4) {
      ctx.fillRect(-hs + 1, ty, trackW - 2, 1.5);
      ctx.fillRect(hs - trackW + 1, ty, trackW - 2, 1.5);
    }

    // 3. 车身底盘
    ctx.fillStyle = mainColor;
    const bodyW = s * 0.56;
    const bodyH = s * 0.7;
    ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

    // 4. 炮塔中心与高光
    ctx.fillStyle = '#000000';
    ctx.fillRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4);
    ctx.fillStyle = mainColor;
    ctx.fillRect(-s * 0.16, -s * 0.16, s * 0.32, s * 0.32);

    // 5. 炮管
    ctx.fillStyle = isPlayer && level >= 4 ? '#ffffff' : mainColor;
    const cannonW = s * (isPlayer && level >= 3 ? 0.18 : 0.14);
    const cannonL = s * (isPlayer && level >= 2 ? 0.52 : 0.42);
    ctx.fillRect(-cannonW / 2, -hs, cannonW, cannonL);

    // 6. 炮口加固圈
    ctx.fillStyle = '#000000';
    ctx.fillRect(-cannonW / 2, -hs, cannonW, 2);

    // 7. 冰冻霜冻效果 (被时钟定身)
    if (isFrozen) {
      ctx.fillStyle = 'rgba(128, 222, 234, 0.45)';
      ctx.fillRect(-hs - 2, -hs - 2, s + 4, s + 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hs - 2, -hs - 2, s + 4, s + 4);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-3, -3, 6, 6);
    }

    ctx.restore();
  }

  // 绘制出生星芒动画
  static drawSpawnStar(ctx, x, y, size, frame) {
    ctx.save();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const phase = frame % 16;
    const r = (phase / 16) * (size / 2);

    ctx.fillStyle = phase % 4 < 2 ? '#ffffff' : '#ffd700';
    ctx.fillRect(cx - r, cy - 2, r * 2, 4);
    ctx.fillRect(cx - 2, cy - r, 4, r * 2);
    ctx.fillRect(cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4);
    ctx.restore();
  }

  // 绘制防护罩光环
  static drawShield(ctx, x, y, size, frame) {
    ctx.save();
    ctx.strokeStyle = frame % 4 < 2 ? '#00e5ff' : '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 绘制爆炸效果
  static drawExplosion(ctx, x, y, size, frame, maxFrames = 18) {
    ctx.save();
    const progress = frame / maxFrames;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = (size * 0.3) + progress * (size * 0.7);

    // 扩散火球
    ctx.fillStyle = progress < 0.4 ? '#ffffff' : progress < 0.7 ? '#ff9900' : '#cc2200';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 边缘颗粒
    ctx.fillStyle = '#ffea00';
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + progress * 2;
      const dist = r * 1.1;
      ctx.fillRect(cx + Math.cos(angle) * dist - 3, cy + Math.sin(angle) * dist - 3, 6, 6);
    }
    ctx.restore();
  }

  // 绘制子弹
  static drawBullet(ctx, x, y, size) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x - size / 4, y - size / 4, size / 2, size / 2);
  }

  // 绘制道具
  static drawPowerup(ctx, x, y, size, type, frame = 0) {
    if (Math.floor(frame / 6) % 2 === 0) {
      // 道具微闪烁质感
    }

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

    const cx = x + size / 2;
    const cy = y + size / 2;

    switch (type) {
      case POWERUP_TYPE.STAR: // 🌟 星星
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = size * 0.38;
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case POWERUP_TYPE.BOMB: // 💣 手雷
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(cx, cy + 2, size * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - size * 0.38, 4, 6);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(cx - 1, cy - size * 0.44, 3, 3);
        break;

      case POWERUP_TYPE.CLOCK: // ⏰ 时钟
        ctx.fillStyle = '#00bcd4';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, cy - size * 0.25, 2, size * 0.25);
        ctx.fillRect(cx - 1, cy - 1, size * 0.2, 2);
        break;

      case POWERUP_TYPE.SHOVEL: // ⛏️ 铁锹
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(cx - 2, cy - size * 0.2, 4, size * 0.5);
        ctx.fillStyle = '#cfd8dc';
        ctx.fillRect(cx - 6, cy - size * 0.38, 12, 8);
        break;

      case POWERUP_TYPE.HELMET: // 🛡️ 头盔
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.35, Math.PI, 0);
        ctx.lineTo(cx + size * 0.35, cy + 4);
        ctx.lineTo(cx - size * 0.35, cy + 4);
        ctx.closePath();
        ctx.fill();
        break;

      case POWERUP_TYPE.TANK: // 🎖️ 奖命小坦克
        ctx.fillStyle = '#e91e63';
        ctx.fillRect(cx - 7, cy - 7, 14, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 10, 4, 6);
        break;

      case POWERUP_TYPE.GUN: // 🔫 手枪（效果等同双星）
        // 银色枪管
        ctx.fillStyle = '#b0bec5';
        ctx.fillRect(cx - 7, cy - 5, 14, 5);
        // 枪口
        ctx.fillStyle = '#37474f';
        ctx.fillRect(cx + 6, cy - 6, 2, 6);
        // 握把
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(cx - 5, cy, 5, 8);
        // 扳机护圈
        ctx.fillStyle = '#78909c';
        ctx.fillRect(cx, cy, 3, 4);
        // 双星标记
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - 4, cy - 9, 3, 3);
        ctx.fillRect(cx + 1, cy - 9, 3, 3);
        break;

      case POWERUP_TYPE.BOAT: // ⛵ 战船渡水
        // 浪花底座
        ctx.fillStyle = '#00bcd4';
        ctx.fillRect(cx - 10, cy + 5, 20, 3);
        ctx.fillStyle = '#4dd0e1';
        ctx.fillRect(cx - 8, cy + 8, 16, 2);
        // 船身
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy + 4);
        ctx.lineTo(cx + 9, cy + 4);
        ctx.lineTo(cx + 6, cy + 9);
        ctx.lineTo(cx - 6, cy + 9);
        ctx.closePath();
        ctx.fill();
        // 船舱与桅杆
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 7, 3, 11);
        // 船帆
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.moveTo(cx + 1, cy - 7);
        ctx.lineTo(cx + 8, cy - 1);
        ctx.lineTo(cx + 1, cy - 1);
        ctx.closePath();
        ctx.fill();
        break;
    }
    ctx.restore();
  }
}
