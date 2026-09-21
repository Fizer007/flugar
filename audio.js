// Простой синтезатор звуков на WebAudio — никаких файлов
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.last = {};
  }

  init() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { /* звук просто не будет работать */ }
  }

  // name нужен для ограничения частоты одинаковых звуков
  tone({ name, type = 'sine', f0 = 400, f1 = null, dur = 0.1, vol = 0.06, delay = 0, gap = 0 }) {
    if (this.muted || !this.ctx) return;
    const now = performance.now();
    if (name && gap && now - (this.last[name] || 0) < gap) return;
    if (name) this.last[name] = now;
    try {
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  step()  { this.tone({ name: 'step', type: 'triangle', f0: 120 + Math.random() * 40, f1: 40, dur: 0.08, vol: 0.05, gap: 120 }); }
  shoot(type = 'tear') {
    if (type === 'bullet') this.tone({ name: 'shoot', type: 'sawtooth', f0: 400, f1: 80, dur: 0.11, vol: 0.06, gap: 40 });
    else if (type === 'fire') this.tone({ name: 'shoot', type: 'square', f0: 250, f1: 60, dur: 0.14, vol: 0.06, gap: 40 });
    else this.tone({ name: 'shoot', f0: 320, f1: 140, dur: 0.11, vol: 0.07, gap: 40 });
  }
  door()   { this.tone({ type: 'sawtooth', f0: 160, f1: 50, dur: 0.2, vol: 0.1 }); }
  join()   { this.tone({ f0: 440, dur: 0.12, vol: 0.08 }); this.tone({ f0: 880, dur: 0.15, vol: 0.08, delay: 0.1 }); }
  chat()   { this.tone({ type: 'triangle', f0: 520, dur: 0.06, vol: 0.06 }); this.tone({ type: 'triangle', f0: 660, dur: 0.09, vol: 0.06, delay: 0.06 }); }
  hit()    { this.tone({ name: 'hit', type: 'square', f0: 180, f1: 90, dur: 0.06, vol: 0.05, gap: 60 }); }
  kill()   { this.tone({ name: 'kill', type: 'sawtooth', f0: 220, f1: 50, dur: 0.18, vol: 0.08, gap: 50 }); }
  hurt()   { this.tone({ type: 'sawtooth', f0: 200, f1: 60, dur: 0.25, vol: 0.12 }); }
  die()    { this.tone({ type: 'sawtooth', f0: 300, f1: 30, dur: 0.7, vol: 0.14 }); }
  pickup() { this.tone({ f0: 660, dur: 0.08, vol: 0.07 }); this.tone({ f0: 990, dur: 0.12, vol: 0.07, delay: 0.07 }); }
  powerup(){ [523, 659, 784, 1047].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.08, delay: i * 0.08 })); }
  clear()  { [392, 523, 659].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.07, delay: i * 0.09 })); }
}