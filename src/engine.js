// 坦克大战核心游戏引擎
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  GAME_STATE,
  POWERUP_TYPE,
  ENEMY_TYPE
} from './constants.js';
import { sounds } from './audio.js';
import { GameMap } from './map.js';
import { LEVELS } from './levels.js';
import { PlayerTank, EnemyTank } from './tank.js';
import { PowerUp } from './powerup.js';
import { EffectManager } from './effect.js';
import { Controller } from './controller.js';
import { SpriteRenderer } from './sprites.js';

const safeRequestAnimationFrame = (function() {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame;
  if (typeof wx !== 'undefined' && typeof wx.requestAnimationFrame === 'function') return wx.requestAnimationFrame;
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') return window.requestAnimationFrame;
  return function(cb) { return setTimeout(cb, 1000 / 60); };
})();


export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.controller = new Controller();
    this.map = new GameMap();
    this.effects = new EffectManager();

    this.state = GAME_STATE.MENU;
    this.currentStage = 0;
    this.highScore = 20000;
    this.stageStartTimer = 0;
    this.gameOverTimer = 0;

    // 实体集合
    this.player = null;
    this.enemies = [];
    this.enemyQueue = [];
    this.bullets = [];
    this.powerups = [];

    this.enemySpawnTimer = 0;
    this.clockFreezeTimer = 0;

    // 敌方出生点 (左、中、右大格 0, 6, 12)
    this.spawnPoints = [
      { x: 0 * TILE_SIZE, y: 0 * TILE_SIZE },
      { x: 6 * TILE_SIZE, y: 0 * TILE_SIZE },
      { x: 12 * TILE_SIZE, y: 0 * TILE_SIZE }
    ];
    this.nextSpawnIndex = 0;

    // 玩家出生点 (大格 4, 12)
    this.playerSpawn = { x: 4 * TILE_SIZE, y: 12 * TILE_SIZE };

    this.initEvents();

    // 监听全端交互（触控、模拟器鼠标、键盘），在主菜单状态下秒进第一关
    const triggerMenuStart = () => {
      if (this.state === GAME_STATE.MENU) {
        console.log('🚀 [Tank Game] 收到用户输入，进入第一关！');
        sounds.resume();
        this.startNewGame();
      }
    };

    if (typeof wx !== 'undefined') {
      if (wx.onTouchStart) wx.onTouchStart(triggerMenuStart);
      if (wx.onMouseDown) wx.onMouseDown(triggerMenuStart);
      if (wx.onKeyDown) wx.onKeyDown(triggerMenuStart);
    }
  }

  initEvents() {
    this.controller.bindAllEvents(this.canvas, () => this.getScaleInfo());
  }

  // 计算屏幕适配缩放比例与布局
  getScaleInfo() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const isPortrait = ch > cw * 1.15;

    let renderW = GAME_WIDTH;
    let renderH = isPortrait ? GAME_WIDTH * (ch / cw) : GAME_HEIGHT;
    const scale = cw / renderW;
    
    let dpr = 1;
    try {
      if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
        dpr = wx.getSystemInfoSync().pixelRatio || 1;
      }
    } catch (e) {}

    return { cw, ch, isPortrait, renderW, renderH, scale, dpr };
  }

  // 开始新游戏
  startNewGame() {
    this.currentStage = 0;
    this.player = new PlayerTank(this.playerSpawn.x, this.playerSpawn.y);
    this.player.lives = 3;
    this.player.score = 0;
    this.loadStage(this.currentStage);
  }

  // 加载关卡
  loadStage(stageIndex) {
    if (stageIndex >= LEVELS.length) {
      this.state = 'VICTORY';
      return;
    }
    this.currentStage = stageIndex;
    this.state = GAME_STATE.STAGE_START;
    this.stageStartTimer = 30; // 0.5 秒开战
    sounds.playStageStart();

    const stageData = LEVELS[stageIndex];
    this.map.loadLevel(stageData.layout);

    this.bullets = [];
    this.powerups = [];
    this.enemies = [];
    this.effects.clear();
    this.clockFreezeTimer = 0;
    this.stagePowerupsSpawned = 0;
    this.maxStagePowerups = 3; // 用户需求 10：每关最多出 2~3 个道具

    this.enemyQueue = JSON.parse(JSON.stringify(stageData.enemies));
    this.player.respawn(this.playerSpawn.x, this.playerSpawn.y);
    this.effects.addSpawnStar(this.playerSpawn.x, this.playerSpawn.y, 28);
  }

  // 生成下一辆敌方坦克
  spawnNextEnemy() {
    if (this.enemyQueue.length === 0 || this.enemies.length >= 4) return;

    const spawnPos = this.spawnPoints[this.nextSpawnIndex];
    this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.spawnPoints.length;

    // 检查出生点是否有坦克阻挡
    const isBlocked = this.enemies.some(e => Math.hypot(e.x - spawnPos.x, e.y - spawnPos.y) < 24) ||
      (this.player && Math.hypot(this.player.x - spawnPos.x, this.player.y - spawnPos.y) < 24);

    if (isBlocked) return;

    const enemyData = this.enemyQueue.shift();

    this.effects.addSpawnStar(spawnPos.x, spawnPos.y, 28, () => {
      const enemy = new EnemyTank({
        x: spawnPos.x,
        y: spawnPos.y,
        type: enemyData.type,
        isFlashing: enemyData.isFlashing
      });
      this.enemies.push(enemy);
    });
  }

  // 处理玩家道具拾取效果
  applyPowerup(type) {
    this.player.score += 500;
    this.effects.addScorePopup(this.player.x, this.player.y, 500);

    switch (type) {
      case POWERUP_TYPE.STAR:
        this.player.upgrade();
        break;

      case POWERUP_TYPE.GUN:
        // 用户需求 9：增加道具手枪，效果等于吃两颗星星
        this.player.upgradeGun();
        this.effects.addScorePopup(this.player.x, this.player.y, '双星手枪!');
        break;

      case POWERUP_TYPE.BOAT:
        // 用户需求 3：道具可以增加船只，有度水能力
        this.player.hasBoat = true;
        this.effects.addScorePopup(this.player.x, this.player.y, '战船渡水!');
        break;

      case POWERUP_TYPE.HELMET:
        this.player.addShield(10);
        break;

      case POWERUP_TYPE.TANK:
        this.player.lives++;
        break;

      case POWERUP_TYPE.SHOVEL:
        // 用户需求 8：道具可以加固大本营，短暂成为钢板
        this.map.activateShovel(15);
        this.effects.addScorePopup(this.player.x, this.player.y, '老巢钢板加固!');
        break;

      case POWERUP_TYPE.CLOCK:
        this.clockFreezeTimer = 60 * 10; // 定身 10 秒
        this.enemies.forEach(e => {
          e.isFrozen = true;
          e.freezeTimer = 600;
        });
        break;

      case POWERUP_TYPE.BOMB:
        // 全屏引爆当前所有敌方坦克
        this.enemies.forEach(e => {
          e.alive = false;
          this.player.score += e.score;
          this.effects.addExplosion(e.x, e.y, 32, true);
        });
        this.enemies = [];
        sounds.playExplosion(true);
        break;
    }
  }

  // 用户需求 6：敌军也可以吃道具
  applyEnemyPowerup(enemy, type) {
    sounds.playPowerup();
    this.effects.addScorePopup(enemy.x, enemy.y, '⚠️敌军抢宝!');

    switch (type) {
      case POWERUP_TYPE.HELMET:
        // 敌方全员套盾 8 秒
        this.enemies.forEach(e => (e.shieldTimer = 60 * 8));
        break;

      case POWERUP_TYPE.CLOCK:
        // 定身玩家 5 秒
        this.player.isFrozen = true;
        this.player.freezeTimer = 60 * 5;
        break;

      case POWERUP_TYPE.BOMB:
        // 炸伤玩家（损失一条命）
        if (this.player.alive && this.player.shieldTimer <= 0) {
          this.player.alive = false;
          this.effects.addExplosion(this.player.x, this.player.y, 36, true);
          sounds.playExplosion(true);
          this.handlePlayerDeath();
        }
        break;

      case POWERUP_TYPE.SHOVEL:
        // 瓦解老巢外墙，暴露老鹰司令部
        this.map.exposeBase();
        sounds.playHitIron();
        break;

      case POWERUP_TYPE.STAR:
        // 敌军升级，子弹速度增加并加血
        enemy.bulletSpeed = Math.min(6.5, enemy.bulletSpeed + 1.2);
        enemy.hp++;
        break;

      case POWERUP_TYPE.GUN:
        // 敌军强力重装升级
        enemy.hp += 2;
        enemy.bulletSpeed = 6.0;
        enemy.speed = Math.min(2.5, enemy.speed + 0.5);
        enemy.canBurnForest = true;
        break;

      case POWERUP_TYPE.BOAT:
        // 敌军获得渡水能力
        enemy.hasBoat = true;
        break;

      case POWERUP_TYPE.TANK:
        // 敌军全体回满生命
        this.enemies.forEach(e => (e.hp = e.maxHp));
        break;
    }
  }

  update() {
    if (this.state === GAME_STATE.MENU) {
      if (this.controller.isStartTriggered()) {
        sounds.resume();
        this.startNewGame();
      }
      return;
    }

    if (this.state === GAME_STATE.STAGE_START) {
      this.stageStartTimer--;
      if (this.stageStartTimer <= 0) {
        this.state = GAME_STATE.PLAYING;
      }
      return;
    }

    if (this.state === GAME_STATE.GAMEOVER) {
      this.gameOverTimer++;
      if (this.gameOverTimer > 180 && this.controller.isStartTriggered()) {
        this.state = GAME_STATE.MENU;
      }
      return;
    }

    if (this.state === GAME_STATE.STAGE_CLEAR) {
      this.stageStartTimer--;
      if (this.stageStartTimer <= 0) {
        this.currentStage++;
        if (this.currentStage >= LEVELS.length) {
          this.state = 'VICTORY';
        } else {
          this.loadStage(this.currentStage);
        }
      }
      return;
    }

    if (this.state === 'VICTORY') {
      if (this.controller.isStartTriggered()) {
        this.state = GAME_STATE.MENU;
      }
      return;
    }

    // --- 游戏中逻辑更新 (PLAYING) ---
    this.map.update();
    this.effects.update();

    // 1. 定身时钟倒计时
    if (this.clockFreezeTimer > 0) {
      this.clockFreezeTimer--;
      if (this.clockFreezeTimer <= 0) {
        this.enemies.forEach(e => (e.isFrozen = false));
      }
    }

    // 2. 敌方坦克出怪计时
    this.enemySpawnTimer++;
    if (this.enemySpawnTimer >= 100) {
      this.enemySpawnTimer = 0;
      this.spawnNextEnemy();
    }

    // 3. 玩家更新与开火
    const allTanks = [this.player, ...this.enemies].filter(t => t && t.alive);
    const inputDir = this.controller.getDirection();
    const isShooting = this.controller.isShooting();

    const newBullet = this.player.update(this.map, allTanks, inputDir, isShooting, this.bullets);
    if (newBullet) {
      this.bullets.push(newBullet);
    }

    // 4. 敌方更新与开火
    this.enemies.forEach(enemy => {
      const enemyBullet = enemy.update(this.map, allTanks, this.bullets);
      if (enemyBullet) {
        this.bullets.push(enemyBullet);
      }
    });

    // 5. 子弹飞行与碰撞检测
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update();

      // (1) 子弹打中地图地形/边界/老鹰
      const mapHit = this.map.checkBulletHit(b);
      if (mapHit.hit) {
        b.active = false;
        this.effects.addExplosion(b.x - 12, b.y - 12, 16);
        if (mapHit.target === 'base') {
          this.triggerGameOver();
        }
        continue;
      }

      // (2) 子弹打中敌方坦克
      if (b.owner === 'player') {
        for (const enemy of this.enemies) {
          if (enemy.alive && Math.abs(b.x - (enemy.x + enemy.size / 2)) < enemy.size / 2 + 3 &&
              Math.abs(b.y - (enemy.y + enemy.size / 2)) < enemy.size / 2 + 3) {
            b.active = false;
            const killed = enemy.takeDamage();
            if (killed) {
              this.player.score += enemy.score;
              this.effects.addExplosion(enemy.x, enemy.y, 32, true);
              this.effects.addScorePopup(enemy.x, enemy.y, enemy.score);
              sounds.playExplosion(true);

              // 击毁掉宝坦克，生成全图道具（用户需求 10：限制每关最多出2~3个道具）
              if (enemy.isFlashing && this.stagePowerupsSpawned < this.maxStagePowerups) {
                this.stagePowerupsSpawned++;
                this.powerups.push(new PowerUp());
              }
            } else {
              this.effects.addExplosion(b.x - 10, b.y - 10, 14);
              sounds.playExplosion(false);
            }
            break;
          }
        }
      }

      // (3) 敌方子弹打中玩家坦克
      if (b.owner !== 'player' && this.player.alive) {
        if (Math.abs(b.x - (this.player.x + this.player.size / 2)) < this.player.size / 2 + 2 &&
            Math.abs(b.y - (this.player.y + this.player.size / 2)) < this.player.size / 2 + 2) {
          b.active = false;
          if (this.player.shieldTimer <= 0) {
            this.player.alive = false;
            this.effects.addExplosion(this.player.x, this.player.y, 36, true);
            sounds.playExplosion(true);
            this.handlePlayerDeath();
          } else {
            // 护盾吸收子弹
            this.effects.addExplosion(b.x - 8, b.y - 8, 12);
          }
        }
      }

      // (4) 子弹在空中碰撞相互抵消
      for (let j = i - 1; j >= 0; j--) {
        const otherB = this.bullets[j];
        if (b.checkBulletCollision(otherB)) {
          this.effects.addExplosion(b.x - 8, b.y - 8, 12);
          break;
        }
      }
    }

    // 清除无效子弹与阵亡敌军
    this.bullets = this.bullets.filter(b => b.active);
    this.enemies = this.enemies.filter(e => e.alive);

    // 6. 道具拾取检测（用户需求 6：玩家与敌军均可拾取道具）
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.update();
      if (p.checkPick(this.player)) {
        this.applyPowerup(p.type);
      } else {
        for (const enemy of this.enemies) {
          if (enemy.alive && p.checkPick(enemy)) {
            this.applyEnemyPowerup(enemy, p.type);
            break;
          }
        }
      }
    }
    this.powerups = this.powerups.filter(p => p.active);

    // 7. 过关判定（所有敌人都已被生成且全部消灭，进入下一关或通关）
    if (this.enemyQueue.length === 0 && this.enemies.length === 0) {
      this.state = GAME_STATE.STAGE_CLEAR;
      this.stageStartTimer = 120;
    }

    // 更新最高分
    if (this.player.score > this.highScore) {
      this.highScore = this.player.score;
    }
  }

  handlePlayerDeath() {
    this.player.lives--;
    if (this.player.lives <= 0) {
      this.triggerGameOver();
    } else {
      setTimeout(() => {
        if (this.state === GAME_STATE.PLAYING) {
          this.player.respawn(this.playerSpawn.x, this.playerSpawn.y);
          this.effects.addSpawnStar(this.playerSpawn.x, this.playerSpawn.y, 28);
        }
      }, 1200);
    }
  }

  triggerGameOver() {
    this.state = GAME_STATE.GAMEOVER;
    this.gameOverTimer = 0;
    sounds.playGameOver();
  }

  // 渲染整体画面
  render() {
    const { cw, ch, isPortrait, renderW, renderH, scale } = this.getScaleInfo();

    this.ctx.save();
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.scale(scale, scale);

    // 1. 绘制背景黑底
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, renderW, renderH);

    if (this.state === GAME_STATE.MENU) {
      this.renderMenu(renderW, renderH);
      this.ctx.restore();
      return;
    }

    // 2. 绘制战斗主舞台 (416 x 416)
    this.ctx.save();
    // 舞台底层 (地面、砖块、铁块、水面、老鹰)
    this.map.renderBackground(this.ctx);

    // 道具
    this.powerups.forEach(p => p.render(this.ctx));

    // 坦克与子弹
    this.player.render(this.ctx, this.map);
    this.enemies.forEach(e => e.render(this.ctx, this.map));
    this.bullets.forEach(b => b.render(this.ctx));

    // 视觉特效 (爆炸、出生星)
    this.effects.render(this.ctx);

    // 舞台顶层 (草丛覆盖在坦克上方)
    this.map.renderForeground(this.ctx);
    this.ctx.restore();

    // 3. 绘制经典右侧侧边栏仪表盘 (64px)
    this.renderSidebar(STAGE_WIDTH, 0, SIDEBAR_WIDTH, STAGE_HEIGHT);

    // 4. 关卡开场幕布与结算动画
    if (this.state === GAME_STATE.STAGE_START) {
      this.renderStageStartCurtain(STAGE_WIDTH, STAGE_HEIGHT);
    } else if (this.state === GAME_STATE.STAGE_CLEAR) {
      this.renderStageClearBanner(STAGE_WIDTH, STAGE_HEIGHT);
    } else if (this.state === GAME_STATE.GAMEOVER) {
      this.renderGameOverBanner(STAGE_WIDTH, STAGE_HEIGHT);
    } else if (this.state === 'VICTORY') {
      this.renderVictoryBanner(STAGE_WIDTH, STAGE_HEIGHT);
    }

    // 5. 手机竖屏虚拟手柄区域绘制
    if (isPortrait) {
      const controlsY = STAGE_HEIGHT + 30;
      const padLayout = {
        dpadX: 90,
        dpadY: controlsY + 80,
        fireX: renderW - 90,
        fireY: controlsY + 80,
        startX: renderW / 2,
        startY: controlsY + 30
      };
      this.controller.renderTouchControls(this.ctx, padLayout);
    }

    this.ctx.restore();
  }

  // 绘制右侧 HUD 仪表盘
  renderSidebar(x, y, w, h) {
    this.ctx.fillStyle = '#7f7f7f';
    this.ctx.fillRect(x, y, w, h);

    // (1) 剩余敌军图标阵列
    const totalEnemiesLeft = this.enemyQueue.length + this.enemies.length;
    for (let i = 0; i < totalEnemiesLeft; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const ex = x + 16 + col * 20;
      const ey = y + 16 + row * 16;

      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(ex, ey, 14, 12);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(ex + 4, ey - 2, 6, 4);
    }

    // (2) 玩家生命值 (IP)
    const pY = y + h - 140;
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText('IP', x + 12, pY);

    // 玩家小图标
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillRect(x + 12, pY + 8, 14, 14);

    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText(`x${this.player.lives}`, x + 32, pY + 22);

    // (3) 旗帜与关卡数
    const flagY = y + h - 60;
    this.ctx.fillStyle = '#f44336';
    this.ctx.beginPath();
    this.ctx.moveTo(x + 16, flagY);
    this.ctx.lineTo(x + 36, flagY + 10);
    this.ctx.lineTo(x + 16, flagY + 20);
    this.ctx.fill();

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(x + 14, flagY, 3, 30);

    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText(`${this.currentStage + 1}`, x + 24, flagY + 45);
  }

  // 绘制关卡开始幕布
  renderStageStartCurtain(w, h) {
    this.ctx.fillStyle = '#636363';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`STAGE  ${this.currentStage + 1}`, w / 2, h / 2);
    this.ctx.textAlign = 'left';
  }

  // 绘制关卡过关
  renderStageClearBanner(w, h) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#4caf50';
    this.ctx.font = 'bold 28px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('STAGE CLEAR!', w / 2, h / 2 - 20);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.fillText(`SCORE: ${this.player.score}`, w / 2, h / 2 + 20);
    this.ctx.textAlign = 'left';
  }

  // 绘制 Game Over 弹窗
  renderGameOverBanner(w, h) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#e53935';
    this.ctx.font = 'bold 36px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', w / 2, h / 2 - 30);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = '18px monospace';
    this.ctx.fillText(`FINAL SCORE: ${this.player.score}`, w / 2, h / 2 + 20);

    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('点击或按开始键重玩', w / 2, h / 2 + 60);
    this.ctx.textAlign = 'left';
  }

  // 绘制通关胜利弹窗
  renderVictoryBanner(w, h) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 30px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🏆 VICTORY! 🏆', w / 2, h / 2 - 40);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px monospace';
    this.ctx.fillText('20 关全部通关！你是坦克王！', w / 2, h / 2);

    this.ctx.fillStyle = '#4caf50';
    this.ctx.font = '16px monospace';
    this.ctx.fillText(`FINAL SCORE: ${this.player ? this.player.score : 0}`, w / 2, h / 2 + 40);

    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('按开始键或点击返回菜单', w / 2, h / 2 + 80);
    this.ctx.textAlign = 'left';
  }

  // 绘制开始主菜单
  renderMenu(w, h) {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, w, h);

    // 标题
    this.ctx.fillStyle = '#e53935';
    this.ctx.font = 'bold 38px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('BATTLE CITY', w / 2, 90);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.fillText('坦 克 大 战', w / 2, 130);

    // 经典坦克演示装饰
    SpriteRenderer.drawTank(this.ctx, {
      x: w / 2 - 16,
      y: 160,
      size: 32,
      dir: 1,
      color: '#ffd700',
      isPlayer: true,
      level: 3
    });

    // 提示
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px monospace';
    this.ctx.fillText('1 PLAYER', w / 2, 240);

    this.ctx.fillStyle = '#4caf50';
    this.ctx.font = 'bold 16px monospace';
    const blink = Math.floor(Date.now() / 500) % 2 === 0;
    if (blink) {
      this.ctx.fillText('PRESS START / 点击屏幕开始', w / 2, 290);
    }

    // 键位指南
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('PC端: WASD/方向键移动 | J/空格开火', w / 2, 345);
    this.ctx.fillText('手机端: 屏幕下方虚拟摇杆 + 开火按钮', w / 2, 368);

    this.ctx.textAlign = 'left';
  }

  // 启动主游戏循环
  startLoop() {
    const loop = () => {
      this.update();
      this.render();
      safeRequestAnimationFrame(loop);
    };
    safeRequestAnimationFrame(loop);
  }
}
