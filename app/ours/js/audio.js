// The sounds: the lightsaber's ignition, retraction, hum, swing and the hyperspace jump are recordings (assets/sfx, CC0,
// see LICENCE.txt there); the lightning's crackle, the holograms' chirp and the small clicks are synthesised. Until the
// recordings are decoded (or if they can't be), synthesised stand-ins play.
const SAMPLES = ['ignite', 'retract', 'swing', 'hyper', 'clash', 'hum'];

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
      this.buf = {};
      const base = new URL('../../assets/sfx/', import.meta.url);
      for (const n of SAMPLES) {
        fetch(new URL(n + (n === 'hum' ? '.wav' : '.mp3'), base)).then((r) => r.arrayBuffer())
          .then((a) => this.ctx.decodeAudioData(a)).then((b) => { this.buf[n] = b; if (n === 'hum') this.startHum(); })
          .catch(() => { /* the synthesised stand-in stays */ });
      }
    } catch { this.ctx = null; }
  }

  // the recorded hum, looping for ever under its own gain (hum() drives it); the synthesised one is then silenced
  startHum() {
    const src = this.ctx.createBufferSource(); src.buffer = this.buf.hum; src.loop = true;
    this.humRec = this.ctx.createGain(); this.humRec.gain.value = 0;
    src.connect(this.humRec); this.humRec.connect(this.master); src.start();
  }

  play(name, vol = 1, rate = 1) {
    const b = this.buf && this.buf[name]; if (!b) return false;
    const src = this.ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol; src.connect(g); g.connect(this.master); src.start();
    return true;
  }

  hum(level) {
    if (!this.ctx) return;
    if (this.humRec) { this.humRec.gain.setTargetAtTime(0.55 * level, this.ctx.currentTime, 0.06); return; }
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

  ignite() { if (!this.ctx || this.play('ignite', 0.9)) return; this._noise(0.35, 'bandpass', 3200, 380, 0.5); this._tone(0.4, 'sawtooth', 320, 90, 0.18); }
  retract() { if (!this.ctx || this.play('retract', 0.7)) return; this._noise(0.28, 'bandpass', 420, 2800, 0.35); this._tone(0.3, 'sawtooth', 95, 260, 0.12); }
  clash() { if (!this.ctx || this.play('clash', 0.7)) return; this._noise(0.25, 'highpass', 5000, 1500, 0.7); this._tone(0.18, 'square', 1400, 600, 0.12); }
  crackle(dur = 0.35, vol = 0.32) {
    if (!this.ctx) return;
    const c = this.ctx;
    for (let i = 0; i < 9; i++) {
      setTimeout(() => this._noise(0.03 + Math.random() * 0.05, 'bandpass', 2500 + Math.random() * 3000, 900, vol * (0.4 + Math.random() * 0.6)), Math.random() * dur * 1000);
    }
    void c;
  }
  whoosh() { if (!this.ctx) return; this._noise(0.5, 'bandpass', 300, 1800, 0.18); }
  // a lightsaber moved past (picking another), slightly different each time
  swing() { if (!this.ctx) return; if (!this.play('swing', 0.55, 0.92 + Math.random() * 0.16)) this.whoosh(); }
  // hyperspace: the bridge's jump to another place, and the jump into a film
  hyper(vol = 0.7) { if (!this.ctx) return; if (!this.play('hyper', vol)) this._noise(1.2, 'bandpass', 200, 2400, 0.25); }
  // a hologram flickering on: a short rising chirp and a little static
  holo() { if (!this.ctx) return; this._tone(0.22, 'sine', 900, 1700, 0.07); this._noise(0.18, 'highpass', 4000, 6000, 0.06); }
  // the dock and the menus: a soft click
  tick() { if (!this.ctx) return; this._tone(0.05, 'triangle', 1250, 900, 0.05); }
}
