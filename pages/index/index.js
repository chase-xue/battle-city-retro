// 经典《坦克大战》微信小程序自包含极速引擎
// 黄金比例渲染、3x3 规整手柄、单发限制、老巢保卫

const GRID_COLS = 13;
const GRID_ROWS = 13;
const SUB_GRID = 2;
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

const TILE = { EMPTY: 0, BRICK: 1, IRON: 2, BASE: 6, BASE_DESTROYED: 7 };

const E = TILE.EMPTY, B = TILE.BRICK, I = TILE.IRON, H = TILE.BASE;
const LEVEL_1_MAP = [
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
  [E, B, E, B, E, B, B, B, E, B, E, B, E],
  [E, E, E, B, E, B, H, B, E, B, E, E, E]
];

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function generateLevel(levelIndex) {
  const random = seededRandom(0x9e3779b9 ^ ((levelIndex + 1) * 2654435761));
  const map = LEVEL_1_MAP.map(row => row.slice());
  const mutationCount = 7 + Math.min(28, levelIndex * 2);
  const protectedCell = (row, col) =>
    row === 0 || (row >= 11 && col >= 3 && col <= 8) ||
    (row >= 10 && (col === 0 || col === 12));

  for (let i = 0; i < mutationCount; i++) {
    const row = 1 + Math.floor(random() * 10);
    const col = Math.floor(random() * GRID_COLS);
    if (protectedCell(row, col)) continue;
    const roll = random();
    map[row][col] = roll < 0.18 + Math.min(0.16, levelIndex * 0.008) ? I : (roll < 0.82 ? B : E);
  }

  // 基地和玩家出生通道永远有效。
  map[12][6] = H;
  map[12][4] = E;

  const armor = 1 + Math.floor(levelIndex / 5);
  return {
    map,
    enemyCount: 6 + levelIndex * 2,
    maxActive: Math.min(6, 3 + Math.floor(levelIndex / 3)),
    enemySpeed: Math.min(2.35, 1.15 + levelIndex * 0.06),
    enemyBulletSpeed: Math.min(5.2, 2.8 + levelIndex * 0.08),
    shootMin: Math.max(20, 75 - levelIndex * 2),
    shootRange: Math.max(15, 55 - levelIndex),
    armor
  };
}

Page({
  data: {
    lives: 3,
    score: 0,
    activeDir: null,
    isFiring: false,
    gameOver: false,
    gameOverReason: '',
    stage: 1,
    fireLevel: 0,
    shieldSeconds: 0
  },

  onLoad() {
    this.isDestroyed = false;
    this.subGrid = [];
    this.baseDestroyed = false;
    this.gameState = 'PLAYING';
    this.currentLevel = 0;
    this.enemiesRemaining = 0;
    this.levelClearTimer = 0;

    this.player = {
      x: 4 * TILE_SIZE,
      y: 12 * TILE_SIZE,
      dir: DIR.UP,
      speed: 1.0,
      size: 28,
      alive: true,
      lives: 3,
      score: 0,
      shield: 120,
      weaponLevel: 0
    };

    this.enemies = [];
    this.bullets = [];
    this.effects = [];
    this.powerups = [];
    this.moveTimer = null;
    this.currentHoldDir = null;
  },

  onReady() {
    this.loadLevel(0);

    const query = wx.createSelectorQuery();
    query.select('#tankCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;

        // 设置高清物理画布像素
        canvas.width = GAME_WIDTH * dpr;
        canvas.height = GAME_HEIGHT * dpr;
        ctx.scale(dpr, dpr);

        this.canvas = canvas;
        this.ctx = ctx;

        const renderLoop = () => {
          if (this.isDestroyed) return;
          this.update();
          this.render(ctx);

          if (canvas.requestAnimationFrame) {
            canvas.requestAnimationFrame(renderLoop);
          } else if (wx.requestAnimationFrame) {
            wx.requestAnimationFrame(renderLoop);
          } else {
            setTimeout(renderLoop, 1000 / 60);
          }
        };

        if (canvas.requestAnimationFrame) {
          canvas.requestAnimationFrame(renderLoop);
        } else {
          setTimeout(renderLoop, 1000 / 60);
        }
      });
  },

  onUnload() {
    this.isDestroyed = true;
    if (this.moveTimer) clearInterval(this.moveTimer);
  },

  initMap() {
    this.subGrid = Array(SUB_ROWS).fill(0).map(() => Array(SUB_COLS).fill(TILE.EMPTY));
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this.levelConfig.map[r][c];
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
  },

  spawnEnemies() {
    const config = this.levelConfig;
    const spawnXs = [0, 6 * TILE_SIZE, 12 * TILE_SIZE, 3 * TILE_SIZE];
    const colors = ['#e0e0e0', '#388e3c', '#f57c00', '#c62828'];
    while (this.enemies.length < config.maxActive && this.enemiesRemaining > 0) {
      const slot = (config.enemyCount - this.enemiesRemaining) % spawnXs.length;
      const x = spawnXs[slot];
      if (this.enemies.some(enemy => Math.abs(enemy.x - x) < 28 && enemy.y < 36)) break;
      this.enemies.push({
        x, y: 0, dir: DIR.DOWN, speed: config.enemySpeed + slot * 0.06,
        size: 28, alive: true, hp: config.armor,
        score: 100 + this.currentLevel * 25 + config.armor * 50,
        dirTimer: 30 + slot * 8, shootTimer: config.shootMin + slot * 7,
        color: colors[slot]
      });
      this.enemiesRemaining--;
    }
  },

  loadLevel(levelIndex) {
    this.currentLevel = levelIndex;
    const config = generateLevel(levelIndex);
    this.levelConfig = config;
    this.gameState = 'PLAYING';
    this.baseDestroyed = false;
    this.enemies = [];
    this.enemiesRemaining = config.enemyCount;
    this.bullets = [];
    this.effects = [];
    this.player.x = 4 * TILE_SIZE;
    this.player.y = 12 * TILE_SIZE;
    this.player.dir = DIR.UP;
    this.player.alive = true;
    this.player.shield = Math.max(this.player.shield, 120);
    this.initMap();
    this.spawnPowerups();
    this.spawnEnemies();
    this.setData({
      stage: levelIndex + 1,
      fireLevel: this.player.weaponLevel,
      shieldSeconds: Math.ceil(this.player.shield / 60),
      gameOver: false,
      gameOverReason: ''
    });
  },

  spawnPowerups() {
    const types = ['life', 'weapon', 'shield'];
    const spots = [];
    for (let r = 2; r <= 9 && spots.length < types.length; r++) {
      for (let c = 1; c <= 11 && spots.length < types.length; c++) {
        const offset = (this.currentLevel * 5 + spots.length * 17) % 9;
        if ((r * 13 + c + offset) % 9 === 0 && this.levelConfig.map[r][c] === E) {
          spots.push({ x: c * TILE_SIZE + 3, y: r * TILE_SIZE + 3 });
        }
      }
    }
    const fallbacks = [{ x: 2 * TILE_SIZE + 3, y: 6 * TILE_SIZE + 3 }, { x: 10 * TILE_SIZE + 3, y: 6 * TILE_SIZE + 3 }, { x: 6 * TILE_SIZE + 3, y: 9 * TILE_SIZE + 3 }];
    this.powerups = types.map((type, index) => ({ type, ...(spots[index] || fallbacks[index]), size: 26, active: true }));
  },

  collectPowerups() {
    this.powerups.forEach(item => {
      if (!item.active) return;
      if (Math.abs((this.player.x + 14) - (item.x + 13)) < 25 && Math.abs((this.player.y + 14) - (item.y + 13)) < 25) {
        item.active = false;
        if (item.type === 'life') this.player.lives++;
        if (item.type === 'weapon') this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
        if (item.type === 'shield') this.player.shield = Math.max(this.player.shield, 60 * 10);
        this.setData({
          lives: this.player.lives,
          fireLevel: this.player.weaponLevel,
          shieldSeconds: Math.ceil(this.player.shield / 60)
        });
      }
    });
    this.powerups = this.powerups.filter(item => item.active);
  },

  canPass(x, y, size) {
    if (x < 0 || y < 0 || x + size > SUB_COLS * SUB_TILE_SIZE || y + size > SUB_ROWS * SUB_TILE_SIZE) return false;
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
      }
    }
    return true;
  },

  // 坦克与坦克实体碰撞检测：不可重叠
  isTankColliding(tank, nextX, nextY) {
    const allTanks = [];
    if (this.player && this.player.alive) allTanks.push(this.player);
    if (this.enemies) {
      for (const e of this.enemies) {
        if (e.alive) allTanks.push(e);
      }
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
          continue; // 允许脱离重叠
        }
        return true; // 阻挡重叠
      }
    }
    return false;
  },

  get playerSpeed() {
    if (!this.player) return 1.0;
    if (this.player.weaponLevel === 0) return 1.0;
    if (this.player.weaponLevel === 1) return 1.25;
    return 1.4;
  },

  moveTank(tank, targetDir) {
    if (this.gameState === 'GAMEOVER') return false;
    tank.dir = targetDir;
    const offset = DIR_OFFSET[targetDir];
    const spd = tank === this.player ? this.playerSpeed : tank.speed;
    let nextX = tank.x + offset.x * spd;
    let nextY = tank.y + offset.y * spd;

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

    if (this.canPass(nextX, nextY, tank.size) && !this.isTankColliding(tank, nextX, nextY)) {
      tank.x = nextX;
      tank.y = nextY;
      return true;
    }
    return false;
  },

  onDirStart(e) {
    if (this.gameState === 'GAMEOVER') return;
    const dirStr = e.currentTarget.dataset.dir;
    const dirMap = { up: DIR.UP, down: DIR.DOWN, left: DIR.LEFT, right: DIR.RIGHT };
    const targetDir = dirMap[dirStr];
    this.currentHoldDir = targetDir;
    this.moveTank(this.player, targetDir);
  },

  onDirEnd() {
    this.currentHoldDir = null;
  },

  onDirTap(e) {
    if (this.gameState === 'GAMEOVER') return;
    const dirStr = e.currentTarget.dataset.dir;
    const dirMap = { up: DIR.UP, down: DIR.DOWN, left: DIR.LEFT, right: DIR.RIGHT };
    const targetDir = dirMap[dirStr];
    this.moveTank(this.player, targetDir);
  },

  onFireTap() {
    if (this.gameState === 'GAMEOVER') return;
    this.fireBullet(this.player);
  },

  onFireStart() {
    if (this.gameState === 'GAMEOVER') return;
    this.fireBullet(this.player);
  },

  onFireEnd() {
  },

  fireBullet(owner) {
    if (!owner.alive || this.gameState === 'GAMEOVER') return;

    // 火力 0-1 级单发，2-3 级可双发。
    const myActiveBullets = this.bullets.filter(b => b.owner === owner && b.active);
    const maxBullets = owner === this.player && this.player.weaponLevel >= 2 ? 2 : 1;
    if (myActiveBullets.length >= maxBullets) return;

    const offset = DIR_OFFSET[owner.dir];
    const bx = owner.x + owner.size / 2 + offset.x * (owner.size / 2 + 4);
    const cy = owner.y + owner.size / 2 + offset.y * (owner.size / 2 + 4);

    this.bullets.push({
      x: bx,
      y: cy,
      dir: owner.dir,
      speed: owner === this.player ? 4.8 + this.player.weaponLevel * 0.65 : this.levelConfig.enemyBulletSpeed,
      power: owner === this.player ? this.player.weaponLevel : 0,
      owner,
      active: true
    });
  },

  onRestart() {
    this.gameState = 'PLAYING';
    this.baseDestroyed = false;
    this.player.x = 4 * TILE_SIZE;
    this.player.y = 12 * TILE_SIZE;
    this.player.dir = DIR.UP;
    this.player.alive = true;
    this.player.lives = 3;
    this.player.score = 0;
    this.player.shield = 120;
    this.player.weaponLevel = 0;
    this.currentHoldDir = null;
    if (this.moveTimer) clearInterval(this.moveTimer);
    this.bullets = [];
    this.effects = [];
    this.currentLevel = 0;
    this.loadLevel(0);
    this.setData({ score: 0, lives: 3, stage: 1, fireLevel: 0, shieldSeconds: 2, gameOver: false, gameOverReason: '' });
  },

  update() {
    if (this.gameState === 'GAMEOVER') return;
    if (this.gameState === 'LEVEL_CLEAR') {
      this.levelClearTimer--;
      if (this.levelClearTimer <= 0) {
        this.loadLevel(this.currentLevel + 1);
      }
      return;
    }

    // 玩家持续移动（按住时每帧移动，松开时停止，开火绝不打断）
    if (this.player.alive && this.currentHoldDir !== null) {
      this.moveTank(this.player, this.currentHoldDir);
    }

    if (this.player.shield > 0) {
      this.player.shield--;
      if (this.player.shield % 60 === 0) this.setData({ shieldSeconds: Math.ceil(this.player.shield / 60) });
    }
    this.collectPowerups();

    // 敌军行为
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      enemy.dirTimer--;
      if (enemy.dirTimer <= 0) {
        enemy.dirTimer = Math.floor(Math.random() * 50) + 30;
        enemy.dir = [DIR.DOWN, DIR.DOWN, DIR.LEFT, DIR.RIGHT, DIR.UP][Math.floor(Math.random() * 5)];
      }
      const moved = this.moveTank(enemy, enemy.dir);
      if (!moved) {
        enemy.dir = [DIR.DOWN, DIR.LEFT, DIR.RIGHT, DIR.UP][Math.floor(Math.random() * 4)];
        enemy.dirTimer = Math.floor(Math.random() * 30) + 20;
      }

      enemy.shootTimer--;
      if (enemy.shootTimer <= 0) {
        const config = this.levelConfig;
        enemy.shootTimer = Math.floor(Math.random() * config.shootRange) + config.shootMin;
        this.fireBullet(enemy);
      }
    });

    // 子弹更新与碰撞检测
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.active) continue;
      const offset = DIR_OFFSET[b.dir];
      b.x += offset.x * b.speed;
      b.y += offset.y * b.speed;

      // 1. 出界销毁
      if (b.x < 0 || b.y < 0 || b.x > STAGE_WIDTH || b.y > STAGE_HEIGHT) {
        b.active = false;
        continue;
      }

      // 2. 地图碰撞（砖墙、铁壁、老巢基地）
      const minC = Math.max(0, Math.min(SUB_COLS - 1, Math.floor(b.x / SUB_TILE_SIZE)));
      const minR = Math.max(0, Math.min(SUB_ROWS - 1, Math.floor(b.y / SUB_TILE_SIZE)));
      const tile = this.subGrid[minR] ? this.subGrid[minR][minC] : TILE.EMPTY;

      if (tile === TILE.BRICK) {
        this.subGrid[minR][minC] = TILE.EMPTY;
        b.active = false;
        this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
        continue;
      } else if (tile === TILE.IRON) {
        if (b.owner === this.player && (b.power >= 2 || this.player.weaponLevel >= 2)) this.subGrid[minR][minC] = TILE.EMPTY;
        b.active = false;
        this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
        continue;
      } else if (tile === TILE.BASE) {
        this.baseDestroyed = true;
        b.active = false;
        this.gameState = 'GAMEOVER';
        this.currentHoldDir = null;
        if (this.moveTimer) clearInterval(this.moveTimer);
        this.effects.push({ type: 'explode', x: 6 * TILE_SIZE, y: 12 * TILE_SIZE, frame: 0, isBig: true });
        this.setData({ gameOver: true, gameOverReason: '老巢被摧毁！游戏结束' });
        try { wx.vibrateLong(); } catch (err) {}
        continue;
      }

      // 3. 玩家击中敌军
      if (b.owner === this.player) {
        for (const enemy of this.enemies) {
          if (enemy.alive && Math.abs(b.x - (enemy.x + enemy.size / 2)) < 16 && Math.abs(b.y - (enemy.y + enemy.size / 2)) < 16) {
            b.active = false;
            enemy.hp--;
            if (enemy.hp <= 0) {
              enemy.alive = false;
              this.player.score += enemy.score;
              this.effects.push({ type: 'explode', x: enemy.x, y: enemy.y, frame: 0, isBig: true });
              this.setData({ score: this.player.score });
            } else {
              this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
            }
            break;
          }
        }
      }

      // 4. 敌军击中玩家
      if (b.owner !== this.player && this.player.alive) {
        if (Math.abs(b.x - (this.player.x + this.player.size / 2)) < 16 && Math.abs(b.y - (this.player.y + this.player.size / 2)) < 16) {
          b.active = false;
          if (this.player.shield <= 0) {
            if (this.player.weaponLevel >= 3) {
              // 3颗星多一条命：吸收致命炮弹，降级为初始未吃星星状态，不扣命！
              this.player.weaponLevel = 0;
              this.player.shield = 90;
              this.effects.push({ type: 'explode', x: this.player.x, y: this.player.y, frame: 0, isBig: false });
              this.setData({ fireLevel: 0, shieldSeconds: 2 });
              try { wx.vibrateLong(); } catch (err) {}
            } else {
              this.player.weaponLevel = 0;
              this.player.lives--;
              this.effects.push({ type: 'explode', x: this.player.x, y: this.player.y, frame: 0, isBig: true });
              this.setData({ lives: Math.max(0, this.player.lives), fireLevel: 0 });
              if (this.player.lives > 0) {
                this.player.x = 4 * TILE_SIZE;
                this.player.y = 12 * TILE_SIZE;
                this.player.dir = DIR.UP;
                this.player.shield = 120;
                this.setData({ shieldSeconds: 2 });
              } else {
                this.player.alive = false;
                this.gameState = 'GAMEOVER';
                this.currentHoldDir = null;
                if (this.moveTimer) clearInterval(this.moveTimer);
                this.setData({ gameOver: true, gameOverReason: '全军覆没！游戏结束' });
              }
            }
          }
        }
      }
    }

    this.bullets = this.bullets.filter(b => b.active);
    this.enemies = this.enemies.filter(e => e.alive);

    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].frame++;
      if (this.effects[i].frame > 14) this.effects.splice(i, 1);
    }

    if (this.enemiesRemaining > 0 && this.enemies.length < this.levelConfig.maxActive) this.spawnEnemies();
    if (this.enemiesRemaining === 0 && this.enemies.length === 0) {
      this.gameState = 'LEVEL_CLEAR';
      this.levelClearTimer = 90;
    }
  },

  render(ctx) {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 1. 战场背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

    // 2. 地图砖块与铁壁
    for (let r = 0; r < SUB_ROWS; r++) {
      for (let c = 0; c < SUB_COLS; c++) {
        const tile = this.subGrid[r][c];
        const x = c * SUB_TILE_SIZE;
        const y = r * SUB_TILE_SIZE;
        if (tile === TILE.BRICK) {
          ctx.fillStyle = '#b84418';
          ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, y + 7, SUB_TILE_SIZE, 2);
          ctx.fillRect(x + 7, y, 2, 8);
        } else if (tile === TILE.IRON) {
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 2, y + 2, SUB_TILE_SIZE - 4, SUB_TILE_SIZE - 4);
          ctx.fillStyle = '#888888';
          ctx.fillRect(x + 4, y + 4, SUB_TILE_SIZE - 8, SUB_TILE_SIZE - 8);
        }
      }
    }

    // 3. 每关装备：生命、火力、限时护盾。
    const powerupStyle = {
      life: { color: '#f44336', label: '命' },
      weapon: { color: '#ffd700', label: '火' },
      shield: { color: '#00bcd4', label: '盾' }
    };
    this.powerups.forEach(item => {
      const style = powerupStyle[item.type];
      ctx.fillStyle = this.currentLevel % 2 === 0 ? style.color : '#ffffff';
      ctx.fillRect(item.x, item.y, item.size, item.size);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(item.x + 1, item.y + 1, item.size - 2, item.size - 2);
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(style.label, item.x + 13, item.y + 18);
    });

    // 4. 最中间老巢 (第 12 行第 6 列：x = 192, y = 384)
    const baseX = 6 * TILE_SIZE;
    const baseY = 12 * TILE_SIZE;
    if (!this.baseDestroyed) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(baseX, baseY, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#d8a000';
      ctx.beginPath();
      ctx.moveTo(baseX + 16, baseY + 2);
      ctx.lineTo(baseX + 30, baseY + 30);
      ctx.lineTo(baseX + 16, baseY + 24);
      ctx.lineTo(baseX + 2, baseY + 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(baseX + 14, baseY + 6, 4, 4);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(baseX + 15, baseY + 7, 2, 2);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(baseX, baseY, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#777777';
      ctx.fillRect(baseX + 4, baseY + 4, 24, 24);
      ctx.fillStyle = '#333333';
      ctx.fillRect(baseX + 8, baseY + 8, 16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RIP', baseX + 16, baseY + 20);
    }

    // 4. 敌军坦克
    this.enemies.forEach(e => {
      if (e.alive) this.drawTank(ctx, e.x, e.y, e.size, e.dir, e.color);
    });

    // 5. 玩家坦克
    if (this.player.alive) {
      this.drawTank(ctx, this.player.x, this.player.y, this.player.size, this.player.dir, '#ffd700');
      if (this.player.shield > 0) {
        ctx.strokeStyle = this.player.shield % 4 < 2 ? '#00e5ff' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.player.x + 14, this.player.y + 14, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 6. 子弹
    ctx.fillStyle = '#ffffff';
    this.bullets.forEach(b => {
      ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
    });

    // 7. 特效
    this.effects.forEach(eff => {
      if (eff.type === 'explode') {
        ctx.fillStyle = eff.frame < 6 ? '#ffea00' : '#ff3d00';
        const r = (eff.frame / 14) * (eff.isBig ? 28 : 16);
        ctx.beginPath();
        ctx.arc(eff.x + 14, eff.y + 14, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(eff.x + 4, eff.y + 4, 8, 8);
      }
    });

    // 8. 侧边栏仪表盘
    ctx.fillStyle = '#7f7f7f';
    ctx.fillRect(STAGE_WIDTH, 0, SIDEBAR_WIDTH, STAGE_HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('敌军', STAGE_WIDTH + 14, 30);
    for (let i = 0; i < Math.min(16, this.enemies.length); i++) {
      const rx = STAGE_WIDTH + 14 + (i % 2) * 20;
      const ry = 42 + Math.floor(i / 2) * 16;
      ctx.fillStyle = '#000000';
      ctx.fillRect(rx, ry, 12, 10);
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('生命', STAGE_WIDTH + 14, STAGE_HEIGHT - 100);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(STAGE_WIDTH + 14, STAGE_HEIGHT - 90, 14, 14);
    ctx.fillStyle = '#000000';
    ctx.fillText(`x${this.player.lives}`, STAGE_WIDTH + 34, STAGE_HEIGHT - 78);

    ctx.fillText(`火力 ${this.player.weaponLevel}`, STAGE_WIDTH + 10, STAGE_HEIGHT - 120);
    if (this.player.shield > 0) ctx.fillText(`盾 ${Math.ceil(this.player.shield / 60)}s`, STAGE_WIDTH + 10, STAGE_HEIGHT - 140);

    ctx.fillText('得分', STAGE_WIDTH + 14, STAGE_HEIGHT - 50);
    ctx.fillText(`${this.player.score}`, STAGE_WIDTH + 10, STAGE_HEIGHT - 30);

    // 9. 游戏结束覆盖层
    if (this.gameState === 'GAMEOVER') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      ctx.fillStyle = '#e53935';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 15);
      ctx.fillStyle = '#ffd700';
      ctx.font = '15px sans-serif';
      ctx.fillText(this.baseDestroyed ? '老巢被摧毁！你输了！' : '全军覆没！点击重开', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 25);
    } else if (this.gameState === 'LEVEL_CLEAR') {
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`STAGE ${this.currentLevel + 1} CLEAR`, STAGE_WIDTH / 2, STAGE_HEIGHT / 2);
    }
  },

  drawTank(ctx, x, y, size, dir, color) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate((dir * 90 * Math.PI) / 180);

    const s = size;
    const hs = s / 2;

    ctx.fillStyle = '#333333';
    ctx.fillRect(-hs, -hs, s * 0.24, s);
    ctx.fillRect(hs - s * 0.24, -hs, s * 0.24, s);

    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.26, -s * 0.35, s * 0.52, s * 0.7);

    ctx.fillStyle = '#111111';
    ctx.fillRect(-s * 0.16, -s * 0.16, s * 0.32, s * 0.32);
    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24);

    ctx.fillRect(-2, -hs - 2, 4, hs);
    ctx.restore();
  }
});
