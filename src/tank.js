// 坦克基类与玩家、敌人 AI 坦克
import { DIR, DIR_OFFSET, TILE_SIZE, PLAYER_LEVELS, ENEMY_CONFIG, ENEMY_TYPE } from './constants.js';
import { SpriteRenderer } from './sprites.js';
import { Bullet } from './bullet.js';
import { sounds } from './audio.js';

export class BaseTank {
  constructor({ x, y, dir = DIR.UP, speed = 1.5, size = 28 }) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.speed = speed;
    this.size = size;
    this.alive = true;
    this.animFrame = 0;
    this.isMoving = false;
    this.shootCooldown = 0;
    this.slideRemaining = 0; // 冰面惯性滑行
    this.hasBoat = false;    // 两栖战船渡水能力
    this.isFrozen = false;   // 时钟定身状态
    this.freezeTimer = 0;
  }

  getBounds() {
    return {
      left: this.x,
      right: this.x + this.size,
      top: this.y,
      bottom: this.y + this.size
    };
  }

  // 检测与另一个坦克的矩形重叠
  intersects(other) {
    if (!this.alive || !other.alive) return false;
    const a = this.getBounds();
    const b = other.getBounds();
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  // 尝试向目标方向移动
  tryMove(targetDir, gameMap, otherTanks = []) {
    this.dir = targetDir;
    const offset = DIR_OFFSET[targetDir];
    let nextX = this.x + offset.x * this.speed;
    let nextY = this.y + offset.y * this.speed;

    // 辅助转弯自动微调对齐（经典坦克贴墙转向平滑感）
    const alignThreshold = 8;
    if (targetDir === DIR.UP || targetDir === DIR.DOWN) {
      const remainder = this.x % (TILE_SIZE / 2);
      if (remainder < alignThreshold) nextX -= remainder;
      else if (remainder > (TILE_SIZE / 2) - alignThreshold) nextX += ((TILE_SIZE / 2) - remainder);
    } else {
      const remainder = this.y % (TILE_SIZE / 2);
      if (remainder < alignThreshold) nextY -= remainder;
      else if (remainder > (TILE_SIZE / 2) - alignThreshold) nextY += ((TILE_SIZE / 2) - remainder);
    }

    // 地形碰撞（支持渡水能力判定）
    if (!gameMap.canTankPass(nextX, nextY, this.size, { canCrossWater: this.hasBoat })) {
      return false;
    }

    // 坦克间碰撞
    const testBounds = { left: nextX, right: nextX + this.size, top: nextY, bottom: nextY + this.size };
    for (const other of otherTanks) {
      if (other !== this && other.alive) {
        const b = other.getBounds();
        if (!(testBounds.right <= b.left || testBounds.left >= b.right || testBounds.bottom <= b.top || testBounds.top >= b.bottom)) {
          return false;
        }
      }
    }

    this.x = nextX;
    this.y = nextY;
    this.animFrame++;

    // 冰面滑行判定
    if (gameMap.isOnIce(this.x, this.y, this.size)) {
      this.slideRemaining = 8;
    }

    return true;
  }
}

// 玩家坦克
export class PlayerTank extends BaseTank {
  constructor(x, y) {
    super({ x, y, dir: DIR.UP, speed: 1.8, size: 28 });
    this.level = 1;
    this.lives = 3;
    this.shieldTimer = 180; // 出生 3 秒无敌
    this.score = 0;
    this.applyLevelStats();
  }

  applyLevelStats() {
    const config = PLAYER_LEVELS[this.level - 1] || PLAYER_LEVELS[0];
    this.speed = config.speed;
    this.bulletSpeed = config.bulletSpeed;
    this.maxBullets = config.maxBullets;
    this.canBreakIron = config.canBreakIron;
    this.canBurnForest = config.canBurnForest || false;
  }

  upgrade() {
    if (this.level < 4) {
      this.level++;
      this.applyLevelStats();
    }
  }

  // 获得手枪道具：效果等于吃两颗星星（连升2级）
  upgradeGun() {
    this.level = Math.min(4, this.level + 2);
    this.applyLevelStats();
  }

  maxUpgrade() {
    this.level = 4;
    this.applyLevelStats();
  }

  addShield(seconds = 8) {
    this.shieldTimer = seconds * 60;
  }

  respawn(spawnX, spawnY) {
    this.x = spawnX;
    this.y = spawnY;
    this.dir = DIR.UP;
    this.alive = true;
    this.shieldTimer = 180;
    this.level = 1;
    this.hasBoat = false;
    this.isFrozen = false;
    this.freezeTimer = 0;
    this.applyLevelStats();
  }

  update(gameMap, otherTanks, inputDir, isShooting, activeBullets) {
    if (!this.alive) return null;

    if (this.isFrozen) {
      this.freezeTimer--;
      if (this.freezeTimer <= 0) {
        this.isFrozen = false;
      }
      return null;
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer--;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    // 移动控制
    if (inputDir !== null) {
      this.isMoving = true;
      this.tryMove(inputDir, gameMap, otherTanks);
    } else if (this.slideRemaining > 0) {
      // 冰面惯性滑行
      this.slideRemaining--;
      this.tryMove(this.dir, gameMap, otherTanks);
    } else {
      this.isMoving = false;
    }

    // 射击
    if (isShooting && this.shootCooldown === 0) {
      const myBullets = activeBullets.filter(b => b.owner === 'player' && b.active);
      if (myBullets.length < this.maxBullets) {
        this.shootCooldown = 12;
        sounds.playShoot();
        return this.createBullet();
      }
    }

    return null;
  }

  createBullet() {
    const offset = DIR_OFFSET[this.dir];
    const bx = this.x + this.size / 2 + offset.x * (this.size / 2 + 2);
    const cy = this.y + this.size / 2 + offset.y * (this.size / 2 + 2);

    return new Bullet({
      x: bx,
      y: cy,
      dir: this.dir,
      speed: this.bulletSpeed,
      owner: 'player',
      canBreakIron: this.canBreakIron,
      canBurnForest: this.canBurnForest
    });
  }

  render(ctx, gameMap = null) {
    if (!this.alive) return;

    // 玩家经典亮黄色/绿黄色
    const playerColor = this.level >= 4 ? '#ffd700' : this.level >= 3 ? '#ffeb3b' : '#ffc107';

    SpriteRenderer.drawTank(ctx, {
      x: this.x,
      y: this.y,
      size: this.size,
      dir: this.dir,
      color: playerColor,
      isPlayer: true,
      level: this.level,
      animFrame: this.animFrame,
      hasBoat: this.hasBoat,
      isFrozen: this.isFrozen,
      inWater: gameMap ? gameMap.isOnWater(this.x, this.y, this.size) : false
    });

    // 无敌光环
    if (this.shieldTimer > 0) {
      SpriteRenderer.drawShield(ctx, this.x, this.y, this.size, this.shieldTimer);
    }
  }
}

// 敌方 AI 坦克
export class EnemyTank extends BaseTank {
  constructor({ x, y, type = ENEMY_TYPE.BASIC, isFlashing = false }) {
    const config = ENEMY_CONFIG[type] || ENEMY_CONFIG[ENEMY_TYPE.BASIC];
    super({ x, y, dir: DIR.DOWN, speed: config.speed, size: 28 });

    this.type = type;
    this.isFlashing = isFlashing;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.bulletSpeed = config.bulletSpeed;
    this.score = config.score;
    this.baseColor = config.color;
    this.canBurnForest = config.canBurnForest || false;

    this.dirChangeTimer = Math.floor(Math.random() * 60) + 60;
    this.shootTimer = Math.floor(Math.random() * 40) + 30;
    this.isFrozen = false;
    this.shieldTimer = 0;
  }

  // 受到攻击
  takeDamage() {
    if (this.shieldTimer > 0) {
      return false; // 敌方护盾保护中
    }
    this.hp--;
    if (this.hp <= 0) {
      this.alive = false;
      return true; // 击毁
    }
    return false; // 仅掉血
  }

  update(gameMap, otherTanks, activeBullets) {
    if (!this.alive) return null;

    if (this.shieldTimer > 0) {
      this.shieldTimer--;
    }

    if (this.isFrozen) {
      this.freezeTimer--;
      if (this.freezeTimer <= 0) {
        this.isFrozen = false;
      }
      return null;
    }

    this.dirChangeTimer--;
    if (this.dirChangeTimer <= 0) {
      this.chooseNextDir();
    }

    const moved = this.tryMove(this.dir, gameMap, otherTanks);
    if (!moved) {
      this.chooseNextDir();
    }

    // 敌方自动射击
    this.shootTimer--;
    if (this.shootTimer <= 0) {
      this.shootTimer = Math.floor(Math.random() * 50) + 40;
      const myBullets = activeBullets.filter(b => b.owner === this && b.active);
      if (myBullets.length < 1) {
        return this.createBullet();
      }
    }

    return null;
  }

  chooseNextDir() {
    this.dirChangeTimer = Math.floor(Math.random() * 90) + 45;
    // 带有倾向性朝下方基地移动（经典 AI 策略：向下权重更高）
    const r = Math.random();
    if (r < 0.4) {
      this.dir = DIR.DOWN;
    } else if (r < 0.6) {
      this.dir = DIR.LEFT;
    } else if (r < 0.8) {
      this.dir = DIR.RIGHT;
    } else {
      this.dir = DIR.UP;
    }
  }

  createBullet() {
    const offset = DIR_OFFSET[this.dir];
    const bx = this.x + this.size / 2 + offset.x * (this.size / 2 + 2);
    const cy = this.y + this.size / 2 + offset.y * (this.size / 2 + 2);

    return new Bullet({
      x: bx,
      y: cy,
      dir: this.dir,
      speed: this.bulletSpeed,
      owner: this,
      canBreakIron: false,
      canBurnForest: this.canBurnForest
    });
  }

  render(ctx, gameMap = null) {
    if (!this.alive) return;

    let currentColor = this.baseColor;
    if (this.type === ENEMY_TYPE.ARMOR) {
      // 重装坦克随血量变色
      const colors = ['#888888', '#f57c00', '#388e3c', '#1976d2'];
      currentColor = colors[Math.max(0, this.hp - 1)] || this.baseColor;
    } else if (this.type === ENEMY_TYPE.HEAVY) {
      // 超硬度坦克：第1次受损变色，第2次消灭
      currentColor = this.hp > 1 ? '#c69214' : '#e5a93c';
    } else if (this.type === ENEMY_TYPE.SUPER_FAST) {
      currentColor = '#00e5ff';
    }

    SpriteRenderer.drawTank(ctx, {
      x: this.x,
      y: this.y,
      size: this.size,
      dir: this.dir,
      color: currentColor,
      isPlayer: false,
      level: 1,
      animFrame: this.animFrame,
      isFlashing: this.isFlashing,
      hasBoat: this.hasBoat,
      isFrozen: this.isFrozen,
      inWater: gameMap ? gameMap.isOnWater(this.x, this.y, this.size) : false
    });

    if (this.shieldTimer > 0) {
      SpriteRenderer.drawShield(ctx, this.x, this.y, this.size, this.shieldTimer);
    }
  }
}
