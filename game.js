// 经典《坦克大战》（Battle City）单发限制与老巢保护版
// 严格遵守规则：1. 单发子弹限制 2. 老巢被击中即刻判负

(function() {
  'use strict';

  const GRID_COLS = 13;
  const GRID_ROWS = 13;
  const SUB_GRID = 2;
  const TILE_SIZE = 32;
  const STAGE_WIDTH = GRID_COLS * TILE_SIZE; // 416
  const STAGE_HEIGHT = GRID_ROWS * TILE_SIZE; // 416
  const SIDEBAR_WIDTH = 64;
  const GAME_WIDTH = STAGE_WIDTH + SIDEBAR_WIDTH; // 480

  const SUB_COLS = GRID_COLS * SUB_GRID; // 26
  const SUB_ROWS = GRID_ROWS * SUB_GRID; // 26
  const SUB_TILE_SIZE = TILE_SIZE / SUB_GRID; // 16

  const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
  const DIR_OFFSET = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
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

  const CTRL = {
    DPAD_X: 105,
    DPAD_OFFSET_Y: 130,
    FIRE_X: 375,
    FIRE_OFFSET_Y: 130,
    RESTART_OFFSET_Y: 50
  };

  class SoundManager {
    constructor() { this.ctx = null; }
    init() {
      if (this.ctx) return;
      try {
        if (typeof wx !== 'undefined' && wx.createWebAudioContext) this.ctx = wx.createWebAudioContext();
        else if (typeof AudioContext !== 'undefined') this.ctx = new AudioContext();
      } catch (e) {}
    }
    playTone(freq, dur = 0.08, type = 'square') {
      this.init();
      if (!this.ctx) return;
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
      } catch (e) {}
    }
    shoot() { this.playTone(650, 0.06, 'square'); }
    hit() { this.playTone(180, 0.12, 'triangle'); }
    explode() { this.playTone(120, 0.25, 'sawtooth'); }
    powerup() {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.07, 'square'), i * 65);
      });
    }
    armorBreak() {
      this.playTone(260, 0.15, 'sawtooth');
      setTimeout(() => this.playTone(130, 0.25, 'triangle'), 70);
    }
  }
  const sounds = new SoundManager();

  class TankGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.gameState = 'PLAYING';
      this.subGrid = Array(SUB_ROWS).fill(0).map(() => Array(SUB_COLS).fill(TILE.EMPTY));
      this.baseDestroyed = false;

      this.player = {
        x: 4 * TILE_SIZE,
        y: 12 * TILE_SIZE,
        dir: DIR.UP,
        size: 28,
        speed: 1.0,
        alive: true,
        lives: 3,
        score: 0,
        shield: 120,
        starCount: 0 // 0: 普通, 1: 变形, 2: 破铁, 3: 多一条命(免死护甲)
      };

      this.enemies = [];
      this.powerups = [];
      this.bullets = [];
      this.effects = [];
      this.ripples = [];
      this.currentMoveDir = null;
      this.isFiring = false;
      this.fireCooldown = 0;
      this.animTick = 0;

      this.initMap();
      this.spawnInitialEnemies();
      this.spawnStar(6 * TILE_SIZE + 3, 8 * TILE_SIZE + 3); // 开局在老巢上方刷新一颗五角星，方便立即体验
      this.bindAllEvents();
      this.startLoop();
    }

    spawnStar(x, y) {
      if (x !== undefined && y !== undefined) {
        this.powerups.push({ x, y, size: 26, timer: 1500 });
        return;
      }
      const clearSpots = [
        { x: 4 * TILE_SIZE + 3, y: 8 * TILE_SIZE + 3 },
        { x: 8 * TILE_SIZE + 3, y: 8 * TILE_SIZE + 3 },
        { x: 6 * TILE_SIZE + 3, y: 6 * TILE_SIZE + 3 },
        { x: 2 * TILE_SIZE + 3, y: 6 * TILE_SIZE + 3 },
        { x: 10 * TILE_SIZE + 3, y: 6 * TILE_SIZE + 3 }
      ];
      const spot = clearSpots[Math.floor(Math.random() * clearSpots.length)];
      this.powerups.push({ x: spot.x, y: spot.y, size: 26, timer: 1500 });
    }

    initMap() {
      this.subGrid = Array(SUB_ROWS).fill(0).map(() => Array(SUB_COLS).fill(TILE.EMPTY));
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const t = LEVEL_1_MAP[r][c];
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
    }

    spawnInitialEnemies() {
      this.enemies = [
        { x: 0 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 0.85, size: 28, alive: true, hp: 1, score: 100, dirTimer: 30, shootTimer: 50, color: '#e0e0e0', isFlashing: false },
        { x: 6 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 1.25, size: 28, alive: true, hp: 1, score: 200, dirTimer: 45, shootTimer: 60, color: '#388e3c', isFlashing: true }, // 红色闪烁掉宝坦克！
        { x: 12 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 0.9, size: 28, alive: true, hp: 1, score: 300, dirTimer: 60, shootTimer: 70, color: '#f57c00', isFlashing: false }
      ];
    }

    canPass(x, y, size) {
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
          if (tile === TILE.BRICK || tile === TILE.IRON || tile === TILE.BASE || tile === TILE.BASE_DESTROYED) {
            return false;
          }
        }
      }
      return true;
    }

    // 坦克与坦克之间的实体碰撞检测：严禁重叠！
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

      // 坦克标准尺寸 28x28，中心距小于 26 判定为躯体碰撞拦截
      const threshold = 26;

      for (const other of allTanks) {
        if (other === tank) continue;

        const otherCenterX = other.x + other.size / 2;
        const otherCenterY = other.y + other.size / 2;

        const nextDx = Math.abs(nextCenterX - otherCenterX);
        const nextDy = Math.abs(nextCenterY - otherCenterY);

        if (nextDx < threshold && nextDy < threshold) {
          // 如果当前位置已经处于轻微重叠（如受击降级），仅允许朝远离方向移动脱困
          const currDx = Math.abs(currCenterX - otherCenterX);
          const currDy = Math.abs(currCenterY - otherCenterY);
          const currDistSq = currDx * currDx + currDy * currDy;
          const nextDistSq = nextDx * nextDx + nextDy * nextDy;
          if (nextDistSq > currDistSq) {
            continue; // 正在远离对方，允许脱离
          }
          return true; // 发生碰撞，严禁重叠穿透
        }
      }
      return false;
    }

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

      // 地图通行性检测 + 坦克与坦克不可重叠检测
      if (this.canPass(nextX, nextY, tank.size) && !this.isTankColliding(tank, nextX, nextY)) {
        tank.x = nextX;
        tank.y = nextY;
        return true;
      }
      return false;
    }

    // 玩家实际速度（0星初速1.0慢速还原经典FC，1星变形1.25，2/3星1.4）
    get playerSpeed() {
      if (!this.player) return 1.0;
      if (this.player.starCount === 0) return 1.0; // 真正的古老 FC 经典稳健慢速
      if (this.player.starCount === 1) return 1.25; // 1星变形微幅提速
      return 1.4; // 2星破铁与3星满级稳定手感
    }

    // 子弹发射：0-1星单发限制，2星及以上允许双发
    fireBullet(owner) {
      if (!owner.alive || this.gameState === 'GAMEOVER') return false;

      const myActiveBullets = this.bullets.filter(b => b.owner === owner && b.active);
      const maxBullets = (owner === this.player && this.player.starCount >= 2) ? 2 : 1;
      if (myActiveBullets.length >= maxBullets) return false;

      let bSpeed = 4.0;
      if (owner === this.player) {
        sounds.shoot();
        try { if (typeof wx !== 'undefined' && wx.vibrateShort) wx.vibrateShort({ type: 'light' }); } catch (e) {}
        bSpeed = this.player.starCount >= 1 ? 8.5 : 6.0;
      }

      const offset = DIR_OFFSET[owner.dir];
      const bx = owner.x + owner.size / 2 + offset.x * (owner.size / 2 + 4);
      const cy = owner.y + owner.size / 2 + offset.y * (owner.size / 2 + 4);

      this.bullets.push({
        x: bx,
        y: cy,
        dir: owner.dir,
        speed: bSpeed,
        owner,
        active: true
      });
      return true;
    }

    restart() {
      this.gameState = 'PLAYING';
      this.baseDestroyed = false;
      this.player.x = 4 * TILE_SIZE;
      this.player.y = 12 * TILE_SIZE;
      this.player.dir = DIR.UP;
      this.player.alive = true;
      this.player.lives = 3;
      this.player.score = 0;
      this.player.shield = 120;
      this.player.starCount = 0;
      this.currentMoveDir = null;
      this.isFiring = false;
      this.fireCooldown = 0;
      this.powerups = [];
      this.bullets = [];
      this.effects = [];
      this.initMap();
      this.spawnInitialEnemies();
      this.spawnStar(6 * TILE_SIZE + 3, 8 * TILE_SIZE + 3);
    }

    bindAllEvents() {
      const toCanvasCoords = (rawX, rawY) => {
        if (this.canvas && this.canvas.getBoundingClientRect) {
          const rect = this.canvas.getBoundingClientRect();
          const scaleX = (this.canvas.width || GAME_WIDTH) / (rect.width || 1);
          const scaleY = (this.canvas.height || (STAGE_HEIGHT + 264)) / (rect.height || 1);
          return {
            canvasX: (rawX - rect.left) * scaleX,
            canvasY: (rawY - rect.top) * scaleY
          };
        }

        let winW = 390;
        if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
          try { winW = wx.getSystemInfoSync().windowWidth || 390; } catch (e) {}
        }
        return {
          canvasX: rawX * (GAME_WIDTH / (winW || 390)),
          canvasY: rawY * (GAME_WIDTH / (winW || 390))
        };
      };

      const getTouchPos = t => {
        const rawX = t.clientX !== undefined ? t.clientX : (t.x !== undefined ? t.x : t.pageX);
        const rawY = t.clientY !== undefined ? t.clientY : (t.y !== undefined ? t.y : t.pageY);
        return toCanvasCoords(rawX, rawY);
      };

      const resolveDirection = (canvasX, canvasY) => {
        const dpadX = CTRL.DPAD_X;
        const dpadY = STAGE_HEIGHT + CTRL.DPAD_OFFSET_Y;

        if (Math.hypot(canvasX - dpadX, canvasY - (dpadY - 42)) < 38) return DIR.UP;
        if (Math.hypot(canvasX - dpadX, canvasY - (dpadY + 42)) < 38) return DIR.DOWN;
        if (Math.hypot(canvasX - (dpadX - 42), canvasY - dpadY) < 38) return DIR.LEFT;
        if (Math.hypot(canvasX - (dpadX + 42), canvasY - dpadY) < 38) return DIR.RIGHT;

        const dx = canvasX - dpadX;
        const dy = canvasY - dpadY;
        if (Math.hypot(dx, dy) < 10) return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle >= -45 && angle < 45) return DIR.RIGHT;
        if (angle >= 45 && angle < 135) return DIR.DOWN;
        if (angle >= -135 && angle < -45) return DIR.UP;
        return DIR.LEFT;
      };

      let moveTouchId = null;
      let fireTouchId = null;

      const handlePointerDown = (t, isMouse = false) => {
        if (!t) return;
        const { canvasX, canvasY } = getTouchPos(t);
        const tId = isMouse ? 'mouse' : (t.identifier !== undefined ? t.identifier : 'touch');
        this.ripples.push({ x: canvasX, y: canvasY, r: 5, maxR: 28, alpha: 1.0 });

        if (this.gameState === 'GAMEOVER') {
          this.restart();
          return;
        }

        const restartX = GAME_WIDTH / 2;
        const restartY = STAGE_HEIGHT + CTRL.RESTART_OFFSET_Y;
        if (Math.hypot(canvasX - restartX, canvasY - restartY) < 38) {
          this.restart();
          return;
        }

        const fireX = CTRL.FIRE_X;
        const fireY = STAGE_HEIGHT + CTRL.FIRE_OFFSET_Y;
        const isFireButton = Math.hypot(canvasX - fireX, canvasY - fireY) < 58;
        const isFireZone = canvasX >= 240 && canvasY > STAGE_HEIGHT;
        const isScreenTap = canvasY <= STAGE_HEIGHT;

        if (isFireButton || isFireZone || isScreenTap) {
          // 记录按住开火状态，只要按着就持续射击，变换方向不中断！
          fireTouchId = tId;
          this.isFiring = true;
          if (this.fireCooldown <= 0) {
            const fired = this.fireBullet(this.player);
            if (fired) this.fireCooldown = 12;
          }
          return;
        }

        if (canvasX < 240 && canvasY > STAGE_HEIGHT) {
          const dir = resolveDirection(canvasX, canvasY);
          if (dir !== null) {
            moveTouchId = tId;
            this.currentMoveDir = dir;
            this.moveTank(this.player, dir);
          }
        }
      };

      const handlePointerMove = (t, isMouse = false) => {
        if (!t) return;
        const tId = isMouse ? 'mouse' : (t.identifier !== undefined ? t.identifier : 'touch');
        if (tId === moveTouchId) {
          const { canvasX, canvasY } = getTouchPos(t);
          const dir = resolveDirection(canvasX, canvasY);
          if (dir !== null) {
            this.currentMoveDir = dir;
          }
        }
      };

      const handlePointerUp = (t, isMouse = false) => {
        const tId = isMouse ? 'mouse' : (t && t.identifier !== undefined ? t.identifier : 'touch');
        if (tId === moveTouchId || (isMouse && !this.isFiring)) {
          moveTouchId = null;
          this.currentMoveDir = null; // 仅松开移动操作时才停止前进
        }
        if (tId === fireTouchId || (isMouse && this.isFiring)) {
          fireTouchId = null;
          this.isFiring = false;
        }
      };

      // 键盘状态管理：按住时前进，松开时立即停止！边走边按空格/J开火
      const keyDirMap = {
        'KeyW': DIR.UP, 'w': DIR.UP, 'W': DIR.UP, 'ArrowUp': DIR.UP,
        'KeyS': DIR.DOWN, 's': DIR.DOWN, 'S': DIR.DOWN, 'ArrowDown': DIR.DOWN,
        'KeyA': DIR.LEFT, 'a': DIR.LEFT, 'A': DIR.LEFT, 'ArrowLeft': DIR.LEFT,
        'KeyD': DIR.RIGHT, 'd': DIR.RIGHT, 'D': DIR.RIGHT, 'ArrowRight': DIR.RIGHT
      };

      const activeKeys = new Set();
      const refreshKeyDir = () => {
        let active = null;
        for (const k of activeKeys) {
          if (keyDirMap[k] !== undefined) active = keyDirMap[k];
        }
        this.currentMoveDir = active;
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', e => {
          const k = e.code || e.key;
          if (keyDirMap[k] !== undefined) {
            activeKeys.add(k);
            refreshKeyDir();
            e.preventDefault();
          }
          if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.code === 'Space' || e.key === ' ') {
            // 按着开火键：持续释放子弹，变换方向不中断
            this.isFiring = true;
            if (this.fireCooldown <= 0) {
              const fired = this.fireBullet(this.player);
              if (fired) this.fireCooldown = 12;
            }
            e.preventDefault();
          }
          if (e.code === 'Enter') {
            if (this.gameState === 'GAMEOVER') this.restart();
          }
        });

        window.addEventListener('keyup', e => {
          const k = e.code || e.key;
          if (keyDirMap[k] !== undefined) {
            activeKeys.delete(k);
            refreshKeyDir();
          }
          if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.code === 'Space' || e.key === ' ') {
            this.isFiring = false;
          }
        });

        window.addEventListener('blur', () => {
          activeKeys.clear();
          this.currentMoveDir = null;
          this.isFiring = false;
          moveTouchId = null;
          fireTouchId = null;
        });

        window.addEventListener('mouseup', () => {
          handlePointerUp(null, true);
        });
      }

      if (this.canvas) {
        this.canvas.addEventListener('touchstart', e => {
          const list = e.changedTouches || (e.touches ? e.touches : [e]);
          for (let i = 0; i < list.length; i++) handlePointerDown(list[i], false);
          e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', e => {
          const list = e.changedTouches || (e.touches ? e.touches : [e]);
          for (let i = 0; i < list.length; i++) handlePointerMove(list[i], false);
          e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', e => {
          const list = e.changedTouches || [e];
          for (let i = 0; i < list.length; i++) handlePointerUp(list[i], false);
          if (e.touches && e.touches.length === 0) {
            moveTouchId = null;
            fireTouchId = null;
            this.currentMoveDir = null;
            this.isFiring = false;
          }
          e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', e => {
          const list = e.changedTouches || [e];
          for (let i = 0; i < list.length; i++) handlePointerUp(list[i], false);
          if (e.touches && e.touches.length === 0) {
            moveTouchId = null;
            fireTouchId = null;
            this.currentMoveDir = null;
            this.isFiring = false;
          }
        });

        this.canvas.addEventListener('mousedown', e => {
          handlePointerDown(e, true);
        });

        this.canvas.addEventListener('mousemove', e => {
          if (e.buttons === 1) handlePointerMove(e, true);
        });

        this.canvas.addEventListener('mouseup', e => {
          handlePointerUp(e, true);
        });
      }

      if (typeof wx !== 'undefined') {
        if (wx.onTouchStart) wx.onTouchStart(e => {
          const list = e.changedTouches || (e.touches ? e.touches : [e]);
          for (let i = 0; i < list.length; i++) handlePointerDown(list[i], false);
        });
        if (wx.onTouchMove) wx.onTouchMove(e => {
          const list = e.changedTouches || (e.touches ? e.touches : [e]);
          for (let i = 0; i < list.length; i++) handlePointerMove(list[i], false);
        });
        if (wx.onTouchEnd) wx.onTouchEnd(e => {
          const list = e.changedTouches || [e];
          for (let i = 0; i < list.length; i++) handlePointerUp(list[i], false);
          if (e.touches && e.touches.length === 0) {
            moveTouchId = null;
            fireTouchId = null;
            this.currentMoveDir = null;
            this.isFiring = false;
          }
        });
        if (wx.onTouchCancel) wx.onTouchCancel(e => {
          const list = e.changedTouches || [e];
          for (let i = 0; i < list.length; i++) handlePointerUp(list[i], false);
          if (e.touches && e.touches.length === 0) {
            moveTouchId = null;
            fireTouchId = null;
            this.currentMoveDir = null;
            this.isFiring = false;
          }
        });
        if (wx.onKeyDown) {
          wx.onKeyDown(e => {
            const k = e.code || e.key;
            if (keyDirMap[k] !== undefined) {
              activeKeys.add(k);
              refreshKeyDir();
            }
            if (e.code === 'KeyJ' || e.key === 'j' || e.code === 'Space') {
              this.isFiring = true;
              if (this.fireCooldown <= 0) {
                const fired = this.fireBullet(this.player);
                if (fired) this.fireCooldown = 12;
              }
            }
          });
        }
        if (wx.onKeyUp) {
          wx.onKeyUp(e => {
            const k = e.code || e.key;
            if (keyDirMap[k] !== undefined) {
              activeKeys.delete(k);
              refreshKeyDir();
            }
            if (e.code === 'KeyJ' || e.key === 'j' || e.code === 'Space') {
              this.isFiring = false;
            }
          });
        }
      }
    }

    startLoop() {
      const step = () => {
        this.update();
        this.render();

        if (typeof wx !== 'undefined' && wx.requestAnimationFrame) {
          wx.requestAnimationFrame(step);
        } else if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(step);
        } else {
          setTimeout(step, 1000 / 60);
        }
      };
      step();
    }

    update() {
      if (this.gameState === 'GAMEOVER') return;

      this.animTick++;
      if (this.player.shield > 0) this.player.shield--;
      if (this.fireCooldown > 0) this.fireCooldown--;

      if (this.player.alive && this.currentMoveDir !== null) {
        this.moveTank(this.player, this.currentMoveDir);
      }

      // 只要按着开火键，就能持续释放子弹，变换方向绝不中断
      if (this.player.alive && this.isFiring) {
        if (this.fireCooldown <= 0) {
          const fired = this.fireBullet(this.player);
          if (fired) {
            this.fireCooldown = 12; // 约 0.2 秒连续开火间隔，手感极佳
          }
        }
      }

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
          enemy.shootTimer = Math.floor(Math.random() * 60) + 40;
          this.fireBullet(enemy);
        }
      });

      // 道具更新与拾取检测 (五角星)
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        p.timer--;
        if (p.timer <= 0) {
          this.powerups.splice(i, 1);
          continue;
        }

        // 玩家触碰星星
        if (this.player.alive &&
            Math.abs((this.player.x + 14) - (p.x + 13)) < 22 &&
            Math.abs((this.player.y + 14) - (p.y + 13)) < 22) {
          this.powerups.splice(i, 1);
          this.player.starCount = Math.min(3, this.player.starCount + 1);
          sounds.powerup();

          let msg = '★ 坦克变形！移速与弹速提升';
          if (this.player.starCount === 2) msg = '★★ 破铁重炮！可打穿铁墙';
          else if (this.player.starCount === 3) msg = '★★★ 获得免死护甲！多一条命';

          this.effects.push({
            type: 'floatText',
            text: msg,
            x: Math.max(10, Math.min(STAGE_WIDTH - 120, this.player.x - 20)),
            y: this.player.y - 12,
            alpha: 1.0
          });
        }
      }

      // 子弹飞行与碰撞检测
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (!b.active) continue;
        const offset = DIR_OFFSET[b.dir];
        b.x += offset.x * b.speed;
        b.y += offset.y * b.speed;

        if (b.x < 0 || b.y < 0 || b.x > STAGE_WIDTH || b.y > STAGE_HEIGHT) {
          b.active = false;
          continue;
        }

        const minC = Math.max(0, Math.min(SUB_COLS - 1, Math.floor(b.x / SUB_TILE_SIZE)));
        const minR = Math.max(0, Math.min(SUB_ROWS - 1, Math.floor(b.y / SUB_TILE_SIZE)));
        const tile = this.subGrid[minR] ? this.subGrid[minR][minC] : TILE.EMPTY;

        if (tile === TILE.BRICK) {
          this.subGrid[minR][minC] = TILE.EMPTY;
          b.active = false;
          this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
          sounds.hit();
          continue;
        } else if (tile === TILE.IRON) {
          // 吃2个星星能打穿石头/铁墙！
          if (b.owner === this.player && this.player.starCount >= 2) {
            this.subGrid[minR][minC] = TILE.EMPTY;
            this.effects.push({ type: 'explode', x: minC * SUB_TILE_SIZE + 8, y: minR * SUB_TILE_SIZE + 8, frame: 0, isBig: false });
            sounds.explode();
          } else {
            this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
            sounds.hit();
          }
          b.active = false;
          continue;
        } else if (tile === TILE.BASE) {
          this.baseDestroyed = true;
          b.active = false;
          this.gameState = 'GAMEOVER';
          this.currentMoveDir = null;
          this.effects.push({ type: 'explode', x: 6 * TILE_SIZE, y: 12 * TILE_SIZE, frame: 0, isBig: true });
          sounds.explode();
          continue;
        }

        // 玩家子弹击中敌军
        if (b.owner === this.player) {
          for (const enemy of this.enemies) {
            if (enemy.alive && Math.abs(b.x - (enemy.x + enemy.size / 2)) < 16 && Math.abs(b.y - (enemy.y + enemy.size / 2)) < 16) {
              b.active = false;
              enemy.alive = false;
              this.player.score += enemy.score;
              this.effects.push({ type: 'explode', x: enemy.x, y: enemy.y, frame: 0, isBig: true });
              sounds.explode();

              // 闪烁掉宝坦克必爆星星，普通坦克也有概率掉落
              if (enemy.isFlashing || Math.random() < 0.35) {
                this.spawnStar(enemy.x, enemy.y);
              }
              break;
            }
          }
        }

        // 敌军子弹击中玩家
        if (b.owner !== this.player && this.player.alive) {
          if (Math.abs(b.x - (this.player.x + this.player.size / 2)) < 16 && Math.abs(b.y - (this.player.y + this.player.size / 2)) < 16) {
            b.active = false;
            if (this.player.shield <= 0) {
              if (this.player.starCount >= 3) {
                // 吃三个多一条命（被一颗子弹击中后，不扣命，降级恢复为未吃星星前的状态）
                this.player.starCount = 0;
                this.player.shield = 90; // 1.5 秒免连击保护
                this.effects.push({ type: 'explode', x: this.player.x, y: this.player.y, frame: 0, isBig: false });
                this.effects.push({ type: 'floatText', text: '护甲破碎！降级为初始状态', x: this.player.x - 24, y: this.player.y - 12, alpha: 1.0 });
                sounds.armorBreak();
                try { if (typeof wx !== 'undefined' && wx.vibrateLong) wx.vibrateLong(); } catch (e) {}
              } else {
                // 0~2星：正常阵亡扣命
                this.player.starCount = 0;
                this.player.lives--;
                this.effects.push({ type: 'explode', x: this.player.x, y: this.player.y, frame: 0, isBig: true });
                sounds.explode();
                if (this.player.lives > 0) {
                  this.player.x = 4 * TILE_SIZE;
                  this.player.y = 12 * TILE_SIZE;
                  this.player.dir = DIR.UP;
                  this.player.shield = 120;
                } else {
                  this.player.alive = false;
                  this.gameState = 'GAMEOVER';
                  this.currentMoveDir = null;
                }
              }
            }
          }
        }
      }

      this.bullets = this.bullets.filter(b => b.active);
      this.enemies = this.enemies.filter(e => e.alive);

      // 敌军连续波次刷新（场上全灭后刷下一波，必带掉宝闪烁坦克）
      if (this.enemies.length === 0 && this.gameState === 'PLAYING') {
        const slot = Math.floor(Math.random() * 3);
        this.enemies = [
          { x: 0 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 0.85, size: 28, alive: true, hp: 1, score: 100, dirTimer: 30, shootTimer: 50, color: '#e0e0e0', isFlashing: slot === 0 },
          { x: 6 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 1.35, size: 28, alive: true, hp: 1, score: 200, dirTimer: 45, shootTimer: 60, color: '#388e3c', isFlashing: slot === 1 },
          { x: 12 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 0.95, size: 28, alive: true, hp: 1, score: 300, dirTimer: 60, shootTimer: 70, color: '#f57c00', isFlashing: slot === 2 }
        ];
      }

      for (let i = this.effects.length - 1; i >= 0; i--) {
        const eff = this.effects[i];
        if (eff.type === 'floatText') {
          eff.y -= 0.6;
          eff.alpha -= 0.015;
          if (eff.alpha <= 0) this.effects.splice(i, 1);
        } else {
          eff.frame++;
          if (eff.frame > 14) this.effects.splice(i, 1);
        }
      }

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.r += 2;
        r.alpha -= 0.08;
        if (r.alpha <= 0) this.ripples.splice(i, 1);
      }
    }

    render() {
      let cw = this.canvas.width;
      let ch = this.canvas.height;
      let renderW = GAME_WIDTH;
      let renderH = GAME_WIDTH * (ch / cw);
      let scale = cw / renderW;

      this.ctx.save();
      this.ctx.clearRect(0, 0, cw, ch);
      this.ctx.scale(scale, scale);

      // 1. 战场背景
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

      // 2. 地图砖块与铁壁
      for (let r = 0; r < SUB_ROWS; r++) {
        for (let c = 0; c < SUB_COLS; c++) {
          const tile = this.subGrid[r][c];
          const x = c * SUB_TILE_SIZE;
          const y = r * SUB_TILE_SIZE;
          if (tile === TILE.BRICK) {
            this.ctx.fillStyle = '#b84418';
            this.ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(x, y + 7, SUB_TILE_SIZE, 2);
            this.ctx.fillRect(x + 7, y, 2, 8);
          } else if (tile === TILE.IRON) {
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillRect(x, y, SUB_TILE_SIZE, SUB_TILE_SIZE);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x + 2, y + 2, SUB_TILE_SIZE - 4, SUB_TILE_SIZE - 4);
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(x + 4, y + 4, SUB_TILE_SIZE - 8, SUB_TILE_SIZE - 8);
          }
        }
      }

      // 3. 掉落道具 (五角星)
      this.powerups.forEach(p => {
        if (p.timer < 300 && Math.floor(p.timer / 15) % 2 === 0) return;
        this.drawPowerup(p);
      });

      // 4. 老巢基地 (第 12 行第 6 列：x = 192, y = 384)
      const baseX = 6 * TILE_SIZE;
      const baseY = 12 * TILE_SIZE;
      if (!this.baseDestroyed) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(baseX, baseY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = '#d8a000';
        this.ctx.beginPath();
        this.ctx.moveTo(baseX + 16, baseY + 2);
        this.ctx.lineTo(baseX + 30, baseY + 30);
        this.ctx.lineTo(baseX + 16, baseY + 24);
        this.ctx.lineTo(baseX + 2, baseY + 30);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(baseX + 14, baseY + 6, 4, 4);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(baseX + 15, baseY + 7, 2, 2);
      } else {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(baseX, baseY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = '#777777';
        this.ctx.fillRect(baseX + 4, baseY + 4, 24, 24);
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(baseX + 8, baseY + 8, 16, 16);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('RIP', baseX + 16, baseY + 20);
      }

      // 5. 敌军坦克
      this.enemies.forEach(e => {
        if (!e.alive) return;
        const eColor = (e.isFlashing && Math.floor(this.animTick / 10) % 2 === 0) ? '#ff1744' : e.color;
        this.drawTank(e.x, e.y, e.size, e.dir, eColor, false, 0);
      });

      // 6. 玩家坦克 (根据星星等级展现变形与光环)
      if (this.player.alive) {
        this.drawTank(this.player.x, this.player.y, this.player.size, this.player.dir, '#ffd700', true, this.player.starCount);
        if (this.player.shield > 0) {
          this.ctx.strokeStyle = this.player.shield % 4 < 2 ? '#00e5ff' : '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(this.player.x + 14, this.player.y + 14, 18, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }

      // 7. 子弹
      this.ctx.fillStyle = '#ffffff';
      this.bullets.forEach(b => {
        ctxRect: this.ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
      });

      // 8. 特效与飘字
      this.effects.forEach(eff => {
        if (eff.type === 'explode') {
          this.ctx.fillStyle = eff.frame < 6 ? '#ffea00' : '#ff3d00';
          const r = (eff.frame / 14) * (eff.isBig ? 28 : 16);
          this.ctx.beginPath();
          this.ctx.arc(eff.x + 14, eff.y + 14, r, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (eff.type === 'hit') {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(eff.x + 4, eff.y + 4, 8, 8);
        } else if (eff.type === 'floatText') {
          this.ctx.save();
          this.ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0, eff.alpha)})`;
          this.ctx.font = 'bold 12px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(eff.text, eff.x + 30, eff.y);
          this.ctx.restore();
        }
      });

      // 9. 触控涟漪
      this.ripples.forEach(rp => {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, rp.alpha)})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      });

      // 10. 侧边栏仪表盘
      this.ctx.fillStyle = '#7f7f7f';
      this.ctx.fillRect(STAGE_WIDTH, 0, SIDEBAR_WIDTH, STAGE_HEIGHT);
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.fillText('敌军', STAGE_WIDTH + 14, 30);
      for (let i = 0; i < Math.min(16, this.enemies.length); i++) {
        const rx = STAGE_WIDTH + 14 + (i % 2) * 20;
        const ry = 42 + Math.floor(i / 2) * 16;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(rx, ry, 12, 10);
      }

      // 等级与星级提示
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.fillText('等级', STAGE_WIDTH + 14, STAGE_HEIGHT - 170);

      const starIcons = ['☆☆☆', '★☆☆', '★★☆', '★★★'][this.player.starCount];
      this.ctx.fillStyle = this.player.starCount > 0 ? '#ffb300' : '#444444';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillText(starIcons, STAGE_WIDTH + 12, STAGE_HEIGHT - 150);

      this.ctx.fillStyle = '#111111';
      this.ctx.font = '11px sans-serif';
      const starTips = ['普通', '变形', '破铁', '多命'];
      this.ctx.fillText(starTips[this.player.starCount], STAGE_WIDTH + 18, STAGE_HEIGHT - 132);

      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillText('生命', STAGE_WIDTH + 14, STAGE_HEIGHT - 100);
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillRect(STAGE_WIDTH + 14, STAGE_HEIGHT - 90, 14, 14);
      this.ctx.fillStyle = '#000000';
      this.ctx.fillText(`x${this.player.lives}`, STAGE_WIDTH + 34, STAGE_HEIGHT - 78);

      this.ctx.fillText('得分', STAGE_WIDTH + 14, STAGE_HEIGHT - 50);
      this.ctx.fillText(`${this.player.score}`, STAGE_WIDTH + 10, STAGE_HEIGHT - 30);

      // 11. 下方街机控制台
      this.ctx.fillStyle = '#181818';
      this.ctx.fillRect(0, STAGE_HEIGHT, renderW, renderH - STAGE_HEIGHT);

      const dpadX = CTRL.DPAD_X;
      const dpadY = STAGE_HEIGHT + CTRL.DPAD_OFFSET_Y;
      const fireX = CTRL.FIRE_X;
      const fireY = STAGE_HEIGHT + CTRL.FIRE_OFFSET_Y;
      const restartX = GAME_WIDTH / 2;
      const restartY = STAGE_HEIGHT + CTRL.RESTART_OFFSET_Y;

      // 十字手柄
      const cr = 60, barW = 42;
      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(dpadX - barW / 2, dpadY - cr, barW, cr * 2);
      this.ctx.fillRect(dpadX - cr, dpadY - barW / 2, cr * 2, barW);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('▲', dpadX, dpadY - 32);
      this.ctx.fillText('▼', dpadX, dpadY + 32);
      this.ctx.fillText('◀', dpadX - 32, dpadY);
      this.ctx.fillText('▶', dpadX + 32, dpadY);

      // 重来
      this.ctx.fillStyle = '#424242';
      this.ctx.beginPath();
      this.ctx.arc(restartX, restartY, 26, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#757575';
      this.ctx.stroke();

      this.ctx.fillStyle = '#eeeeee';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText('重来', restartX, restartY);

      // 开火
      this.ctx.fillStyle = '#e53935';
      this.ctx.beginPath();
      this.ctx.arc(fireX, fireY, 48, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 22px sans-serif';
      this.ctx.fillText('开火', fireX, fireY);

      // 结算
      if (this.gameState === 'GAMEOVER') {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
        this.ctx.fillStyle = '#e53935';
        this.ctx.font = 'bold 36px sans-serif';
        this.ctx.fillText('GAME OVER', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 20);
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '16px sans-serif';
        this.ctx.fillText(this.baseDestroyed ? '老巢被摧毁！你输了！' : '全军覆没！点击重开', STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 30);
      }

      this.ctx.restore();
    }

    drawPowerup(item) {
      const { x, y, size = 26 } = item;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 2 - 2;

      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x, y, size, size);
      this.ctx.strokeStyle = '#ff6d00';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(x, y, size, size);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.translate(cx, cy);
      this.ctx.fillStyle = '#ffd700';
      for (let i = 0; i < 5; i++) {
        this.ctx.lineTo(Math.cos(((18 + i * 72) * Math.PI) / 180) * r, -Math.sin(((18 + i * 72) * Math.PI) / 180) * r);
        this.ctx.lineTo(Math.cos(((54 + i * 72) * Math.PI) / 180) * (r * 0.46), -Math.sin(((54 + i * 72) * Math.PI) / 180) * (r * 0.46));
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    drawTank(x, y, size, dir, color, isPlayer = false, starCount = 0) {
      this.ctx.save();
      this.ctx.translate(x + size / 2, y + size / 2);
      this.ctx.rotate((dir * 90 * Math.PI) / 180);

      const s = size;
      const hs = s / 2;

      // 1. 左右履带
      this.ctx.fillStyle = (isPlayer && starCount >= 2) ? '#1a1a1a' : '#333333';
      this.ctx.fillRect(-hs, -hs, s * 0.24, s);
      this.ctx.fillRect(hs - s * 0.24, -hs, s * 0.24, s);

      // 2. 车身底盘
      this.ctx.fillStyle = color;
      this.ctx.fillRect(-s * 0.26, -s * 0.35, s * 0.52, s * 0.7);

      if (isPlayer) {
        if (starCount === 1) {
          // 1星变形形态：前部防弹装甲加固板
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(-s * 0.22, -s * 0.35, s * 0.44, 3);
        } else if (starCount >= 2) {
          // 2星及以上破铁形态：双侧重型附加装甲包
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(-s * 0.26, -s * 0.2, 3, s * 0.4);
          this.ctx.fillRect(s * 0.26 - 3, -s * 0.2, 3, s * 0.4);
          this.ctx.fillRect(-s * 0.22, -s * 0.35, s * 0.44, 4);
        }
      }

      // 3. 炮塔中心
      this.ctx.fillStyle = '#111111';
      this.ctx.fillRect(-s * 0.16, -s * 0.16, s * 0.32, s * 0.32);
      this.ctx.fillStyle = (isPlayer && starCount >= 3) ? '#00e5ff' : color;
      this.ctx.fillRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24);

      // 4. 炮管形态变化
      if (isPlayer && starCount >= 2) {
        // 2星及以上破铁重炮：粗壮合金主炮带红色制退器
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-4, -hs - 6, 8, hs + 4);
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(-3, -hs - 5, 6, hs + 3);
        this.ctx.fillStyle = '#d50000';
        this.ctx.fillRect(-5, -hs - 8, 10, 3);
      } else if (isPlayer && starCount === 1) {
        // 1星变形：加长重炮管与金属炮口
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(-3, -hs - 5, 6, hs + 3);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-4, -hs - 6, 8, 2);
      } else {
        // 0星基础单炮
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-2, -hs - 2, 4, hs);
      }

      // 5. 3星特殊多一条命免死光环外框
      if (isPlayer && starCount >= 3) {
        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-hs - 2, -hs - 2, s + 4, s + 4);
      }

      this.ctx.restore();
    }
  }

  try {
    const mainCanvas = (typeof canvas !== 'undefined') ? canvas : (typeof wx !== 'undefined' && wx.createCanvas ? wx.createCanvas() : (typeof document !== 'undefined' ? document.getElementById('gameCanvas') : null));

    if (mainCanvas) {
      if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
        const sysInfo = wx.getSystemInfoSync();
        const dpr = sysInfo.pixelRatio || 2;
        mainCanvas.width = sysInfo.windowWidth * dpr;
        mainCanvas.height = sysInfo.windowHeight * dpr;
      }

      new TankGame(mainCanvas);
      console.log('🎮 坦克大战已成功就绪！');
    }
  } catch (err) {
    console.error('启动异常:', err);
  }
})();
