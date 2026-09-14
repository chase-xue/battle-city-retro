// 跨平台输入控制器（支持点击持续行进 Tap-to-Move、全键位持续移动、全屏点击开火）
import { DIR } from './constants.js';

export class Controller {
  constructor() {
    this.keyState = {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
      start: false
    };

    this.touchDir = null;
    this.persistentDir = null;
    this.touchShoot = false;
    this.touchStart = false;
    this.shootTriggered = false;

    this.dpadCenter = { x: 100, y: 550, radius: 80 };
    this.fireBtnCenter = { x: 380, y: 550, radius: 55 };
    this.startBtnCenter = { x: 240, y: 490, radius: 32 };
  }

  vibrate(duration = 15) {
    try {
      if (typeof wx !== 'undefined' && typeof wx.vibrateShort === 'function') {
        wx.vibrateShort({ type: 'light' });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(duration);
      }
    } catch (e) {}
  }

  handleKey(e, isDown) {
    const code = e.code || '';
    const key = (e.key || '').toLowerCase();
    const keyCode = e.keyCode || 0;

    if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup' || keyCode === 87 || keyCode === 38) {
      this.keyState.up = isDown;
      if (isDown) this.persistentDir = DIR.UP;
    }
    if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown' || keyCode === 83 || keyCode === 40) {
      this.keyState.down = isDown;
      if (isDown) this.persistentDir = DIR.DOWN;
    }
    if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft' || keyCode === 65 || keyCode === 37) {
      this.keyState.left = isDown;
      if (isDown) this.persistentDir = DIR.LEFT;
    }
    if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright' || keyCode === 68 || keyCode === 39) {
      this.keyState.right = isDown;
      if (isDown) this.persistentDir = DIR.RIGHT;
    }

    if (
      code === 'KeyJ' || code === 'KeyF' || code === 'Space' || code === 'KeyZ' || code === 'KeyK' || code === 'KeyX' || code === 'KeyC' ||
      key === 'j' || key === 'f' || key === ' ' || key === 'z' || key === 'k' || key === 'x' || key === 'c' ||
      keyCode === 74 || keyCode === 70 || keyCode === 32 || keyCode === 90 || keyCode === 75 || keyCode === 88 || keyCode === 67
    ) {
      this.keyState.shoot = isDown;
      if (isDown) this.shootTriggered = true;
    }

    if (code === 'Enter' || key === 'enter' || keyCode === 13) {
      this.keyState.start = isDown;
    }
  }

  processPoint(canvasX, canvasY, isEnd = false) {
    if (isEnd) {
      this.touchDir = null;
      this.touchShoot = false;
      this.touchStart = false;
      return;
    }

    if (canvasX < 240 && canvasY > 340) {
      const dx = canvasX - this.dpadCenter.x;
      const dy = canvasY - this.dpadCenter.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      let chosenDir = DIR.UP;
      if (angle >= -45 && angle < 45) chosenDir = DIR.RIGHT;
      else if (angle >= 45 && angle < 135) chosenDir = DIR.DOWN;
      else if (angle >= -135 && angle < -45) chosenDir = DIR.UP;
      else chosenDir = DIR.LEFT;

      this.touchDir = chosenDir;
      this.persistentDir = chosenDir;
      this.vibrate(10);
    }

    if (canvasX >= 240 && canvasY > 340) {
      if (Math.hypot(canvasX - this.startBtnCenter.x, canvasY - this.startBtnCenter.y) < 40) {
        this.touchStart = true;
      } else {
        this.touchShoot = true;
        this.shootTriggered = true;
        this.vibrate(10);
      }
    }

    if (canvasY <= 340) {
      this.shootTriggered = true;
      this.vibrate(10);
    }
  }

  bindAll(canvas, getScale) {
    const getCanvasCoords = (clientX, clientY) => {
      const scaleInfo = getScale();
      let canvasX, canvasY;
      if (typeof wx !== 'undefined') {
        const dpr = scaleInfo.dpr || 1;
        canvasX = (clientX * dpr) / scaleInfo.scale;
        canvasY = (clientY * dpr) / scaleInfo.scale;
      } else {
        const rect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        canvasX = (clientX - rect.left) / scaleInfo.scale;
        canvasY = (clientY - rect.top) / scaleInfo.scale;
      }
      return { canvasX, canvasY };
    };

    const handleTouchList = (touches, isEnd = false) => {
      this.touchDir = null;
      this.touchShoot = false;
      this.touchStart = false;

      if (isEnd && (!touches || touches.length === 0)) return;
      const list = touches || [];
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        const cx = t.clientX !== undefined ? t.clientX : (t.x !== undefined ? t.x : 0);
        const cy = t.clientY !== undefined ? t.clientY : (t.y !== undefined ? t.y : 0);
        const { canvasX, canvasY } = getCanvasCoords(cx, cy);
        this.processPoint(canvasX, canvasY);
      }
    };

    const handleSingleMouse = (x, y, isEnd = false) => {
      const { canvasX, canvasY } = getCanvasCoords(x, y);
      this.processPoint(canvasX, canvasY, isEnd);
    };

    if (typeof wx !== 'undefined') {
      if (wx.onTouchStart) wx.onTouchStart(e => handleTouchList(e.touches || e.changedTouches));
      if (wx.onTouchMove) wx.onTouchMove(e => handleTouchList(e.touches));
      if (wx.onTouchEnd) wx.onTouchEnd(e => handleTouchList(e.touches, true));
      if (wx.onTouchCancel) wx.onTouchCancel(e => handleTouchList(e.touches, true));

      if (wx.onMouseDown) wx.onMouseDown(e => handleSingleMouse(e.x !== undefined ? e.x : e.clientX, e.y !== undefined ? e.y : e.clientY));
      if (wx.onMouseMove) wx.onMouseMove(e => {
        if (e.button === 0 || this.touchShoot || this.touchDir !== null) {
          handleSingleMouse(e.x !== undefined ? e.x : e.clientX, e.y !== undefined ? e.y : e.clientY);
        }
      });
      if (wx.onMouseUp) wx.onMouseUp(e => handleSingleMouse(e.x !== undefined ? e.x : e.clientX, e.y !== undefined ? e.y : e.clientY, true));

      if (wx.onKeyDown) wx.onKeyDown(e => this.handleKey(e, true));
      if (wx.onKeyUp) wx.onKeyUp(e => this.handleKey(e, false));
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => this.handleKey(e, true));
      window.addEventListener('keyup', e => this.handleKey(e, false));
    }

    if (canvas) {
      canvas.ontouchstart = e => handleTouchList(e ? (e.touches || e.changedTouches) : []);
      canvas.ontouchmove = e => handleTouchList(e ? e.touches : []);
      canvas.ontouchend = e => handleTouchList(e ? e.touches : [], true);
      canvas.onmousedown = e => { if (e) handleSingleMouse(e.clientX, e.clientY); };
      canvas.onmouseup = e => { if (e) handleSingleMouse(e.clientX, e.clientY, true); };
    }
  }

  getDirection() {
    if (this.touchDir !== null) return this.touchDir;
    if (this.keyState.up) return DIR.UP;
    if (this.keyState.right) return DIR.RIGHT;
    if (this.keyState.down) return DIR.DOWN;
    if (this.keyState.left) return DIR.LEFT;
    if (this.persistentDir !== null) return this.persistentDir;
    return null;
  }

  isShooting() {
    const shooting = this.touchShoot || this.keyState.shoot || this.shootTriggered;
    this.shootTriggered = false;
    return shooting;
  }

  isStartTriggered() {
    const triggered = this.touchStart || this.keyState.start || this.touchShoot || this.keyState.shoot || this.shootTriggered;
    this.touchStart = false;
    this.keyState.start = false;
    this.shootTriggered = false;
    return triggered;
  }

  renderTouchControls(ctx, layout) {
    const { dpadX, dpadY, fireX, fireY, startX, startY } = layout;
    this.dpadCenter = { x: dpadX, y: dpadY, radius: 75 };
    this.fireBtnCenter = { x: fireX, y: fireY, radius: 55 };
    this.startBtnCenter = { x: startX, y: startY, radius: 30 };

    ctx.save();

    const cr = 65, barW = 42;
    ctx.fillStyle = '#262626';
    ctx.fillRect(dpadX - barW / 2, dpadY - cr, barW, cr * 2);
    ctx.fillRect(dpadX - cr, dpadY - barW / 2, cr * 2, barW);

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(dpadX - barW / 2, dpadY - cr, barW, cr * 2);
    ctx.strokeRect(dpadX - cr, dpadY - barW / 2, cr * 2, barW);

    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath(); ctx.moveTo(dpadX, dpadY - cr + 8); ctx.lineTo(dpadX - 12, dpadY - cr + 26); ctx.lineTo(dpadX + 12, dpadY - cr + 26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dpadX, dpadY + cr - 8); ctx.lineTo(dpadX - 12, dpadY + cr - 26); ctx.lineTo(dpadX + 12, dpadY + cr - 26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dpadX - cr + 8, dpadY); ctx.lineTo(dpadX - cr + 26, dpadY - 12); ctx.lineTo(dpadX - cr + 26, dpadY + 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dpadX + cr - 8, dpadY); ctx.lineTo(dpadX + cr - 26, dpadY - 12); ctx.lineTo(dpadX + cr - 26, dpadY + 12); ctx.fill();

    ctx.fillStyle = this.touchShoot || this.keyState.shoot || this.shootTriggered ? '#b71c1c' : '#e53935';
    ctx.beginPath();
    ctx.arc(fireX, fireY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开火', fireX, fireY);

    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(startX, startY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#757575';
    ctx.stroke();

    ctx.fillStyle = '#eeeeee';
    ctx.font = '12px sans-serif';
    ctx.fillText('重来', startX, startY);

    ctx.restore();
  }
}
