// 8-bit 经典复古复音合成器（完美兼容微信小游戏与浏览器 Web Audio）
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initContext();
  }

  initContext() {
    try {
      if (typeof wx !== 'undefined' && typeof wx.createWebAudioContext === 'function') {
        // 微信小游戏返回的是 AudioContext 实例
        this.ctx = wx.createWebAudioContext();
      } else if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
    } catch (e) {
      console.warn('AudioContext not supported or disabled', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume();
      } catch (e) {}
    }
  }

  // 播放方波音符 (经典的 8-bit 芯片声)
  playTone(freq, type = 'square', duration = 0.1, gainValue = 0.15) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  // 射击音效 (频率急降)
  playShoot() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // 爆炸音效（白噪声 + 快速衰减）
  playExplosion(isBig = false) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * (isBig ? 0.35 : 0.2));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      // 滤波器模拟低沉轰鸣
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBig ? 450 : 600, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + (isBig ? 0.35 : 0.2));

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isBig ? 0.3 : 0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isBig ? 0.35 : 0.2));

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch (e) {}
  }

  // 击中铁块（清脆敲击声）
  playHitIron() {
    this.playTone(1200, 'triangle', 0.05, 0.15);
  }

  // 拾取道具
  playPowerup() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.08, 0.15);
      }, i * 45);
    });
  }

  // 开场经典 BGM
  playStageStart() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const melody = [
      { f: 392, d: 0.12 }, // G4
      { f: 523, d: 0.12 }, // C5
      { f: 659, d: 0.12 }, // E5
      { f: 784, d: 0.24 }, // G5
      { f: 659, d: 0.12 }, // E5
      { f: 784, d: 0.30 }  // G5
    ];

    let delay = 0;
    melody.forEach(item => {
      setTimeout(() => {
        this.playTone(item.f, 'square', item.d, 0.18);
      }, delay * 1000);
      delay += item.d + 0.02;
    });
  }

  // 游戏结束音
  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const notes = [330, 311, 293, 261];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.25, 0.2);
      }, i * 180);
    });
  }
}

export const sounds = new SoundManager();
