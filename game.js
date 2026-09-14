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
        speed: 3.5,
        alive: true,
        lives: 3,
        score: 0,
        shield: 120
      };

      this.enemies = [];
      this.bullets = [];
      this.effects = [];
      this.ripples = [];
      this.currentMoveDir = null;

      this.initMap();
      this.spawnInitialEnemies();
      this.bindAllEvents();
      this.startLoop();
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
        { x: 0 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 1.5, size: 28, alive: true, hp: 1, score: 100, dirTimer: 30, shootTimer: 50, color: '#e0e0e0' },
        { x: 6 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 2.2, size: 28, alive: true, hp: 1, score: 200, dirTimer: 45, shootTimer: 60, color: '#388e3c' },
        { x: 12 * TILE_SIZE, y: 0, dir: DIR.DOWN, speed: 1.4, size: 28, alive: true, hp: 1, score: 300, dirTimer: 60, shootTimer: 70, color: '#f57c00' }
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

    moveTank(tank, targetDir) {
      if (this.gameState === 'GAMEOVER') return false;
      tank.dir = targetDir;
      const offset = DIR_OFFSET[targetDir];
      let nextX = tank.x + offset.x * tank.speed;
      let nextY = tank.y + offset.y * tank.speed;

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

      if (this.canPass(nextX, nextY, tank.size)) {
        tank.x = nextX;
        tank.y = nextY;
        return true;
      }
      return false;
    }

    // 核心单发规则
    fireBullet(owner) {
      if (!owner.alive || this.gameState === 'GAMEOVER') return;

      const myActiveBullets = this.bullets.filter(b => b.owner === owner && b.active);
      if (myActiveBullets.length >= 1) return; // 场上已有未消失子弹，严格禁止发射下一颗！

      if (owner === this.player) {
        sounds.shoot();
        try { if (typeof wx !== 'undefined' && wx.vibrateShort) wx.vibrateShort({ type: 'light' }); } catch (e) {}
      }

      const offset = DIR_OFFSET[owner.dir];
      const bx = owner.x + owner.size / 2 + offset.x * (owner.size / 2 + 4);
      const cy = owner.y + owner.size / 2 + offset.y * (owner.size / 2 + 4);

      this.bullets.push({
        x: bx,
        y: cy,
        dir: owner.dir,
        speed: owner === this.player ? 7.5 : 4.5,
        owner,
        active: true
      });
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
      this.currentMoveDir = null;
      this.bullets = [];
      this.effects = [];
      this.initMap();
      this.spawnInitialEnemies();
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

      const handleInput = (rawX, rawY) => {
        if (rawX === undefined || rawY === undefined) return;
        const { canvasX, canvasY } = toCanvasCoords(rawX, rawY);
        this.ripples.push({ x: canvasX, y: canvasY, r: 5, maxR: 28, alpha: 1.0 });

        if (this.gameState === 'GAMEOVER') {
          this.restart();
          return;
        }

        if (canvasY <= STAGE_HEIGHT) {
          this.fireBullet(this.player);
          return;
        }

        const dpadX = CTRL.DPAD_X;
        const dpadY = STAGE_HEIGHT + CTRL.DPAD_OFFSET_Y;
        const fireX = CTRL.FIRE_X;
        const fireY = STAGE_HEIGHT + CTRL.FIRE_OFFSET_Y;

        if (Math.hypot(canvasX - fireX, canvasY - fireY) < 58) {
          this.fireBullet(this.player);
          return;
        }

        const restartX = GAME_WIDTH / 2;
        const restartY = STAGE_HEIGHT + CTRL.RESTART_OFFSET_Y;
        if (Math.hypot(canvasX - restartX, canvasY - restartY) < 38) {
          this.restart();
          return;
        }

        if (Math.hypot(canvasX - dpadX, canvasY - (dpadY - 42)) < 38) {
          this.currentMoveDir = DIR.UP;
          this.moveTank(this.player, DIR.UP);
          return;
        }
        if (Math.hypot(canvasX - dpadX, canvasY - (dpadY + 42)) < 38) {
          this.currentMoveDir = DIR.DOWN;
          this.moveTank(this.player, DIR.DOWN);
          return;
        }
        if (Math.hypot(canvasX - (dpadX - 42), canvasY - dpadY) < 38) {
          this.currentMoveDir = DIR.LEFT;
          this.moveTank(this.player, DIR.LEFT);
          return;
        }
        if (Math.hypot(canvasX - (dpadX + 42), canvasY - dpadY) < 38) {
          this.currentMoveDir = DIR.RIGHT;
          this.moveTank(this.player, DIR.RIGHT);
          return;
        }

        if (canvasX < 240) {
          const dx = canvasX - dpadX;
          const dy = canvasY - dpadY;
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle >= -45 && angle < 45) this.currentMoveDir = DIR.RIGHT;
          else if (angle >= 45 && angle < 135) this.currentMoveDir = DIR.DOWN;
          else if (angle >= -135 && angle < -45) this.currentMoveDir = DIR.UP;
          else this.currentMoveDir = DIR.LEFT;
          this.moveTank(this.player, this.currentMoveDir);
        } else {
          this.fireBullet(this.player);
        }
      };

      const extractPos = e => {
        if (!e) return null;
        if (e.touches && e.touches[0]) {
          const t = e.touches[0];
          return { x: t.clientX !== undefined ? t.clientX : (t.x !== undefined ? t.x : t.pageX), y: t.clientY !== undefined ? t.clientY : (t.y !== undefined ? t.y : t.pageY) };
        }
        if (e.changedTouches && e.changedTouches[0]) {
          const t = e.changedTouches[0];
          return { x: t.clientX !== undefined ? t.clientX : (t.x !== undefined ? t.x : t.pageX), y: t.clientY !== undefined ? t.clientY : (t.y !== undefined ? t.y : t.pageY) };
        }
        if (e.clientX !== undefined || e.x !== undefined) {
          return { x: e.clientX !== undefined ? e.clientX : e.x, y: e.clientY !== undefined ? e.clientY : e.y };
        }
        return null;
      };

      if (typeof wx !== 'undefined') {
        if (wx.onTouchStart) wx.onTouchStart(e => { const p = extractPos(e); if (p) handleInput(p.x, p.y); });
        if (wx.onTouchMove) wx.onTouchMove(e => { const p = extractPos(e); if (p) handleInput(p.x, p.y); });
        if (wx.onMouseDown) wx.onMouseDown(e => { const p = extractPos(e); if (p) handleInput(p.x, p.y); });
        if (wx.onKeyDown) {
          wx.onKeyDown(e => {
            const code = e.code || e.key || '';
            const key = (e.key || '').toLowerCase();
            if (code === 'KeyW' || key === 'w' || key === 'arrowup') this.currentMoveDir = DIR.UP;
            if (code === 'KeyS' || key === 's' || key === 'arrowdown') this.currentMoveDir = DIR.DOWN;
            if (code === 'KeyA' || key === 'a' || key === 'arrowleft') this.currentMoveDir = DIR.LEFT;
            if (code === 'KeyD' || key === 'd' || key === 'arrowright') this.currentMoveDir = DIR.RIGHT;
            if (code === 'KeyJ' || key === 'j' || key === ' ' || code === 'Space') this.fireBullet(this.player);
          });
        }
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', e => {
          const code = e.code || e.key || '';
          const key = (e.key || '').toLowerCase();
          if (code === 'KeyW' || key === 'w' || key === 'arrowup') this.currentMoveDir = DIR.UP;
          if (code === 'KeyS' || key === 's' || key === 'arrowdown') this.currentMoveDir = DIR.DOWN;
          if (code === 'KeyA' || key === 'a' || key === 'arrowleft') this.currentMoveDir = DIR.LEFT;
          if (code === 'KeyD' || key === 'd' || key === 'arrowright') this.currentMoveDir = DIR.RIGHT;
          if (code === 'KeyJ' || key === 'j' || key === ' ' || code === 'Space') this.fireBullet(this.player);
        });
      }

      if (this.canvas) {
        this.canvas.ontouchstart = e => { const p = extractPos(e); if (p) handleInput(p.x, p.y); };
        this.canvas.onmousedown = e => { const p = extractPos(e); if (p) handleInput(p.x, p.y); };
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

      if (this.player.shield > 0) this.player.shield--;

      if (this.player.alive && this.currentMoveDir !== null) {
        this.moveTank(this.player, this.currentMoveDir);
      }

      this.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        enemy.dirTimer--;
        if (enemy.dirTimer <= 0) {
          enemy.dirTimer = Math.floor(Math.random() * 50) + 30;
          enemy.dir = [DIR.DOWN, DIR.DOWN, DIR.LEFT, DIR.RIGHT, DIR.UP][Math.floor(Math.random() * 5)];
        }
        this.moveTank(enemy, enemy.dir);

        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = Math.floor(Math.random() * 60) + 40;
          this.fireBullet(enemy);
        }
      });

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
          b.active = false;
          this.effects.push({ type: 'hit', x: b.x - 8, y: b.y - 8, frame: 0 });
          sounds.hit();
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

        if (b.owner === this.player) {
          for (const enemy of this.enemies) {
            if (enemy.alive && Math.abs(b.x - (enemy.x + enemy.size / 2)) < 16 && Math.abs(b.y - (enemy.y + enemy.size / 2)) < 16) {
              b.active = false;
              enemy.alive = false;
              this.player.score += enemy.score;
              this.effects.push({ type: 'explode', x: enemy.x, y: enemy.y, frame: 0, isBig: true });
              sounds.explode();
              break;
            }
          }
        }

        if (b.owner !== this.player && this.player.alive) {
          if (Math.abs(b.x - (this.player.x + this.player.size / 2)) < 16 && Math.abs(b.y - (this.player.y + this.player.size / 2)) < 16) {
            b.active = false;
            if (this.player.shield <= 0) {
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

      this.bullets = this.bullets.filter(b => b.active);
      this.enemies = this.enemies.filter(e => e.alive);

      for (let i = this.effects.length - 1; i >= 0; i--) {
        this.effects[i].frame++;
        if (this.effects[i].frame > 14) this.effects.splice(i, 1);
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

      // 3. 老巢基地 (第 12 行第 6 列：x = 192, y = 384)
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

      // 4. 敌军坦克
      this.enemies.forEach(e => {
        if (e.alive) this.drawTank(e.x, e.y, e.size, e.dir, e.color);
      });

      // 5. 玩家坦克
      if (this.player.alive) {
        this.drawTank(this.player.x, this.player.y, this.player.size, this.player.dir, '#ffd700');
        if (this.player.shield > 0) {
          this.ctx.strokeStyle = this.player.shield % 4 < 2 ? '#00e5ff' : '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(this.player.x + 14, this.player.y + 14, 18, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }

      // 6. 子弹
      this.ctx.fillStyle = '#ffffff';
      this.bullets.forEach(b => {
        this.ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
      });

      // 7. 特效
      this.effects.forEach(eff => {
        if (eff.type === 'explode') {
          this.ctx.fillStyle = eff.frame < 6 ? '#ffea00' : '#ff3d00';
          const r = (eff.frame / 14) * (eff.isBig ? 28 : 16);
          this.ctx.beginPath();
          this.ctx.arc(eff.x + 14, eff.y + 14, r, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(eff.x + 4, eff.y + 4, 8, 8);
        }
      });

      // 8. 触控涟漪
      this.ripples.forEach(rp => {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, rp.alpha)})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      });

      // 9. 侧边栏
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

      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillText('生命', STAGE_WIDTH + 14, STAGE_HEIGHT - 100);
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillRect(STAGE_WIDTH + 14, STAGE_HEIGHT - 90, 14, 14);
      this.ctx.fillStyle = '#000000';
      this.ctx.fillText(`x${this.player.lives}`, STAGE_WIDTH + 34, STAGE_HEIGHT - 78);

      this.ctx.fillText('得分', STAGE_WIDTH + 14, STAGE_HEIGHT - 50);
      this.ctx.fillText(`${this.player.score}`, STAGE_WIDTH + 10, STAGE_HEIGHT - 30);

      // 10. 下方操作台
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

    drawTank(x, y, size, dir, color) {
      this.ctx.save();
      this.ctx.translate(x + size / 2, y + size / 2);
      this.ctx.rotate((dir * 90 * Math.PI) / 180);

      const s = size;
      const hs = s / 2;

      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(-hs, -hs, s * 0.24, s);
      this.ctx.fillRect(hs - s * 0.24, -hs, s * 0.24, s);

      this.ctx.fillStyle = color;
      this.ctx.fillRect(-s * 0.26, -s * 0.35, s * 0.52, s * 0.7);

      this.ctx.fillStyle = '#111111';
      this.ctx.fillRect(-s * 0.16, -s * 0.16, s * 0.32, s * 0.32);
      this.ctx.fillStyle = color;
      this.ctx.fillRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24);

      this.ctx.fillRect(-2, -hs - 2, 4, hs);
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
