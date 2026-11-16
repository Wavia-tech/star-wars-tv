// Synthesised sounds only (no film audio): blade ignite, retract, hum, Force lightning crackle, clash.

export class Sfx {
  constructor() { this.ctx = null; this.humGain = null; this.on = true; }

  // Réglages → Sons
  setOn(on) { this.on = on; if (this.master) this.master.gain.value = on ? 0.55 : 0; }

  unlock() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.55 : 0; this.master.connect(this.ctx.destination);
      // the hum: two slightly detuned saws through a low-pass, always running, gain driven by the blade
      this.humGain = this.ctx.createGain(); this.humGain.gain.value = 0;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340;
      for (const f of [88, 90.7]) { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
      lp.connect(this.humGain); this.humGain.connect(this.master);
    } catch { this.ctx = null; }
  }

  hum(level) {
    if (!this.ctx) return;
    this.humGain.gain.setTargetAtTime(0.22 * level, this.ctx.currentTime, 0.05);
  }

  _noise(dur, type, f0, f1, vol) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = type; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur);
  }

  _tone(dur, type, f0, f1, vol) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  }

  ignite() { if (!this.ctx) return; this._noise(0.35, 'bandpass', 3200, 380, 0.5); this._tone(0.4, 'sawtooth', 320, 90, 0.18); }
  retract() { if (!this.ctx) return; this._noise(0.28, 'bandpass', 420, 2800, 0.35); this._tone(0.3, 'sawtooth', 95, 260, 0.12); }
  clash() { if (!this.ctx) return; this._noise(0.25, 'highpass', 5000, 1500, 0.7); this._tone(0.18, 'square', 1400, 600, 0.12); }
  crackle(dur = 0.35, vol = 0.32) {
    if (!this.ctx) return;
    const c = this.ctx;
    for (let i = 0; i < 9; i++) {
      setTimeout(() => this._noise(0.03 + Math.random() * 0.05, 'bandpass', 2500 + Math.random() * 3000, 900, vol * (0.4 + Math.random() * 0.6)), Math.random() * dur * 1000);
    }
    void c;
  }
  whoosh() { if (!this.ctx) return; this._noise(0.5, 'bandpass', 300, 1800, 0.18); }
}
