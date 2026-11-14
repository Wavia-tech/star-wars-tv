// Life in the three scenes. Everything is drawn on canvas with pre-rendered glow sprites
// (no gradients rebuilt every frame, no filters, no blend modes), so it stays cheap on a TV chip.

const rnd = (a, b) => a + Math.random() * (b - a);

// A soft round glow, rendered once per colour and size, then stamped with drawImage.
const glowCache = new Map();
export function glow(color, size = 256) {
  const key = color + size;
  if (glowCache.has(key)) return glowCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color); g.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.45)'));
  g.addColorStop(0.6, color.replace(/[\d.]+\)$/, '0.12)')); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}
export function stamp(ctx, sprite, x, y, r, a) {
  if (a <= 0.004) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// Where an <img> with object-fit: cover lands on the 1920x1080 stage.
function coverMap(img) {
  const nw = img.naturalWidth, nh = img.naturalHeight;
  if (!nw) return null;
  const s = Math.max(1920 / nw, 1080 / nh);
  return { s, ox: (1920 - nw * s) / 2, oy: (1080 - nh * s) / 2 };
}

// ─────────────────────────────── Tatooine, the twin sunset ───────────────────────────────
export class Tatooine {
  constructor(cfg, img) {
    this.cfg = cfg; this.img = img;
    this.sand = Array.from({ length: 140 }, () => this.grain(true));
    this.motes = Array.from({ length: 46 }, () => ({ x: rnd(0, 1920), y: rnd(250, 900), vx: rnd(-6, 6), vy: rnd(-4, 2), r: rnd(1, 2.6), p: rnd(0, 6) }));
    this.gust = 0; this.nextGust = rnd(3, 7);
    this.ship = null; this.nextShip = rnd(8, 16);
    this.rays = this.makeRays();
  }

  grain(anywhere) {
    const h = this.cfg.horizon;
    return { x: anywhere ? rnd(0, 1920) : rnd(1920, 2300), y: rnd(h + 10, 1060), len: rnd(10, 46), sp: rnd(0.6, 1.4), a: rnd(0.08, 0.28) };
  }

  makeRays() {
    const c = document.createElement('canvas'); c.width = c.height = 1400;
    const x = c.getContext('2d'); x.translate(700, 700);
    for (let i = 0; i < 26; i++) {
      x.rotate((Math.PI * 2) / 26 + rnd(-0.05, 0.05));
      const g = x.createLinearGradient(0, 0, 700, 0);
      g.addColorStop(0, 'rgba(255,220,160,0.22)'); g.addColorStop(1, 'rgba(255,200,140,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(700, -rnd(12, 34)); x.lineTo(700, rnd(12, 34)); x.fill();
    }
    return c;
  }

  update(dt, t) {
    // wind gusts every few seconds push the sand harder
    this.nextGust -= dt;
    if (this.nextGust <= 0) { this.gust = 1; this.nextGust = rnd(4, 9); }
    this.gust = Math.max(0, this.gust - dt * 0.45);
    const wind = 60 + 520 * this.gust * this.gust;
    for (let i = 0; i < this.sand.length; i++) {
      const g = this.sand[i];
      g.x -= wind * g.sp * dt;
      if (g.x < -60) this.sand[i] = this.grain(false);
    }
    for (const m of this.motes) {
      m.x += (m.vx - 25 * this.gust) * dt; m.y += m.vy * dt + Math.sin(t * 0.7 + m.p) * 0.15;
      if (m.x < -10) m.x = 1930; if (m.x > 1930) m.x = -10; if (m.y < 220) m.y = 900; if (m.y > 920) m.y = 230;
    }
    // now and then a skyhopper crosses the evening sky, far away
    this.nextShip -= dt;
    if (!this.ship && this.nextShip <= 0) {
      const ltr = Math.random() < 0.5;
      this.ship = { x: ltr ? -40 : 1960, y: rnd(140, 330), vx: (ltr ? 1 : -1) * rnd(70, 120), vy: rnd(-6, 6), life: 0 };
    }
    if (this.ship) {
      const s = this.ship; s.x += s.vx * dt; s.y += s.vy * dt; s.life += dt;
      if (s.x < -60 || s.x > 1980) { this.ship = null; this.nextShip = rnd(18, 34); }
    }
  }

  draw(ctx, t, a, selX, dockTop) {
    if (a <= 0.01) return;
    const c = this.cfg;
    // heat haze: the band just above the horizon wavers, re-drawn from the picture in thin slices
    const map = coverMap(this.img);
    if (map && this.img.complete) {
      const y0 = c.horizon - 70, y1 = c.horizon + 30, step = 3;
      ctx.globalAlpha = a;
      for (let y = y0; y < y1; y += step) {
        const k = 1 - Math.abs((y - c.horizon + 20) / 50);
        const off = Math.sin(y * 0.09 + t * 3.1) * 2.2 * Math.max(0, k) + Math.sin(y * 0.031 - t * 1.7) * 1.2 * Math.max(0, k);
        ctx.drawImage(this.img, 0, (y - map.oy) / map.s, this.img.naturalWidth, step / map.s, map.ox + off, y, this.img.naturalWidth * map.s, step);
      }
      ctx.globalAlpha = 1;
    }
    // slow god-rays turning around the suns
    const mid = { x: (c.suns[0].x + c.suns[1].x) / 2, y: (c.suns[0].y + c.suns[1].y) / 2 };
    ctx.save(); ctx.globalAlpha = 0.5 * a; ctx.translate(mid.x, mid.y); ctx.rotate(t * 0.012);
    ctx.drawImage(this.rays, -700, -700); ctx.restore();
    // the two suns breathe, each at its own pace
    c.suns.forEach((s, i) => {
      const br = 0.85 + 0.15 * Math.sin(t * (0.9 + i * 0.37) + i);
      stamp(ctx, glow('rgba(255,230,180,1)'), s.x, s.y, s.r * 7 * br, 0.55 * a);
      stamp(ctx, glow('rgba(255,250,235,1)'), s.x, s.y, s.r * 2.2, 0.9 * a);
    });
    // a lens flare along the line from the suns through the centre, shifting with the chosen app
    const fx = 960 + (selX - 960) * 0.25, fy = 600;
    for (const [f, r, al] of [[0.5, 60, 0.10], [1.1, 26, 0.16], [1.6, 90, 0.06], [2.1, 40, 0.10]]) {
      stamp(ctx, glow('rgba(255,200,140,1)'), mid.x + (fx - mid.x) * f, mid.y + (fy - mid.y) * f, r, al * a);
    }
    // vaporator beacons blink
    for (const [i, v] of c.beacons.entries()) {
      const on = (Math.sin(t * 1.6 + i * 2.1) > 0.75) ? 1 : 0.15;
      stamp(ctx, glow('rgba(255,90,60,1)', 64), v.x, v.y, 9, on * a);
    }
    // the skyhopper
    if (this.ship) {
      const s = this.ship;
      ctx.globalAlpha = 0.75 * a; ctx.fillStyle = '#2b1a14';
      ctx.beginPath(); ctx.moveTo(s.x - 9, s.y); ctx.lineTo(s.x + 9, s.y - 1.5); ctx.lineTo(s.x + 9, s.y + 1.5); ctx.fill();
      ctx.fillRect(s.x - 2, s.y - 4, 3, 8);
      stamp(ctx, glow('rgba(255,170,90,1)', 64), s.x - Math.sign(s.vx) * 10, s.y, 6, 0.8 * a);
      ctx.globalAlpha = 1;
    }
    // golden dust in the low sun
    for (const m of this.motes) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + m.p));
      ctx.globalAlpha = 0.5 * tw * a; ctx.fillStyle = '#ffe2b0';
      ctx.fillRect(m.x, m.y, m.r, m.r);
    }
    // sand blowing off the dunes
    ctx.lineCap = 'round';
    for (const g of this.sand) {
      ctx.globalAlpha = g.a * (0.4 + this.gust) * a; ctx.strokeStyle = '#f0c48c'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.len * (0.6 + this.gust), g.y + 1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // the chosen app stands in the suns' light
    stamp(ctx, glow('rgba(255,205,140,1)', 512), selX, dockTop + 30, 300, 0.5 * a);
  }
}

// ─────────────────────────────── The throne room, the battle outside ───────────────────────────────
export class Battle {
  constructor(cfg) {
    this.cfg = cfg;
    this.bolts = []; this.booms = []; this.fighters = [];
    this.nextBolt = 0; this.nextBoom = 1; this.nextFighter = 0.5;
    this.flash = 0;
  }

  update(dt) {
    const w = this.cfg.window;
    const inside = () => { const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * w.r * 0.95; return { x: w.x + Math.cos(a) * r, y: w.y + Math.sin(a) * r }; };
    this.nextBolt -= dt;
    while (this.nextBolt <= 0) {
      this.nextBolt += rnd(0.04, 0.16);
      const p = inside(), ang = rnd(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI);
      this.bolts.push({ x: p.x, y: p.y, vx: Math.cos(ang) * rnd(500, 900), vy: Math.sin(ang) * rnd(500, 900), life: rnd(0.25, 0.5), c: Math.random() < 0.55 ? '#ff3b3b' : '#4dff6a' });
    }
    this.nextBoom -= dt;
    if (this.nextBoom <= 0) {
      this.nextBoom = rnd(0.7, 2.6);
      const p = inside(), big = Math.random() < 0.25;
      this.booms.push({ x: p.x, y: p.y, t: 0, big, sparks: Array.from({ length: big ? 26 : 12 }, () => ({ a: rnd(0, 6.28), v: rnd(30, big ? 160 : 90) })) });
      if (big) this.flash = 1;
    }
    this.nextFighter -= dt;
    if (this.nextFighter <= 0) {
      this.nextFighter = rnd(0.6, 2);
      const p = inside(), ang = rnd(0, 6.28);
      this.fighters.push({ x: p.x, y: p.y, vx: Math.cos(ang) * rnd(60, 160), vy: Math.sin(ang) * rnd(60, 160), life: rnd(1.5, 3), t: 0, tie: Math.random() < 0.5 });
    }
    for (const b of this.bolts) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    this.bolts = this.bolts.filter((b) => b.life > 0);
    for (const e of this.booms) e.t += dt;
    this.booms = this.booms.filter((e) => e.t < (e.big ? 1.6 : 0.9));
    for (const f of this.fighters) { f.x += f.vx * dt; f.y += f.vy * dt; f.t += dt; }
    this.fighters = this.fighters.filter((f) => f.t < f.life);
    this.flash = Math.max(0, this.flash - dt * 1.8);
  }

  draw(ctx, a) {
    if (a <= 0.01) return;
    const w = this.cfg.window;
    ctx.save();
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.clip();
    ctx.lineCap = 'round';
    for (const b of this.bolts) {
      ctx.globalAlpha = a * Math.min(1, b.life * 4); ctx.strokeStyle = b.c; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.stroke();
    }
    for (const f of this.fighters) {
      const fade = Math.min(1, f.t * 3, (f.life - f.t) * 3);
      ctx.globalAlpha = 0.85 * a * fade; ctx.fillStyle = '#c9cfd8';
      if (f.tie) { ctx.fillRect(f.x - 4, f.y - 3, 1.5, 6); ctx.fillRect(f.x + 2.5, f.y - 3, 1.5, 6); ctx.fillRect(f.x - 3, f.y - 0.5, 6, 1.2); }
      else { ctx.fillRect(f.x - 4, f.y - 0.6, 8, 1.3); ctx.fillRect(f.x - 3, f.y - 3, 1, 6); ctx.fillRect(f.x + 2, f.y - 3, 1, 6); }
      stamp(ctx, glow('rgba(255,160,120,1)', 32), f.x - Math.sign(f.vx) * 5, f.y, 3, 0.7 * a * fade);
    }
    for (const e of this.booms) {
      const life = e.big ? 1.6 : 0.9, k = e.t / life;
      const r = (e.big ? 70 : 32) * Math.min(1, e.t * 6);
      stamp(ctx, glow('rgba(255,190,110,1)'), e.x, e.y, r * 2, a * (1 - k));
      stamp(ctx, glow('rgba(255,255,230,1)'), e.x, e.y, r * 0.7, a * (1 - k) * (1 - k));
      ctx.fillStyle = '#ffd9a0';
      for (const s of e.sparks) { ctx.globalAlpha = a * (1 - k); ctx.fillRect(e.x + Math.cos(s.a) * s.v * e.t, e.y + Math.sin(s.a) * s.v * e.t, 2, 2); }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // a big explosion lights the whole room for a moment
  roomFlash(ctx, a) {
    if (this.flash <= 0.01) return;
    const w = this.cfg.window;
    stamp(ctx, glow('rgba(255,215,170,1)', 512), w.x, w.y, 1300, 0.28 * this.flash * a);
  }
}

// ─────────────────────────────── The saber hall ───────────────────────────────
export class Hall {
  constructor(cfg) {
    this.cfg = cfg;
    this.motes = Array.from({ length: 70 }, () => ({ x: rnd(0, 1920), y: rnd(80, 720), vy: rnd(-5, -1.5), vx: rnd(-2, 2), r: rnd(1, 2.2), p: rnd(0, 6) }));
    this.cars = Array.from({ length: 24 }, () => this.car(true));
  }
  car(anywhere) {
    const c = this.cfg.city;
    const ltr = Math.random() < 0.5;
    return { x: anywhere ? rnd(c.x, c.x + c.w) : (ltr ? c.x : c.x + c.w), y: c.y + rnd(0.15, 0.9) * c.h, v: (ltr ? 1 : -1) * rnd(14, 40), col: Math.random() < 0.7 ? 'rgba(255,240,200,1)' : 'rgba(255,90,80,1)' };
  }
  update(dt, t) {
    for (const m of this.motes) { m.y += m.vy * dt; m.x += m.vx * dt + Math.sin(t * 0.5 + m.p) * 0.1; if (m.y < 60) { m.y = 740; m.x = rnd(0, 1920); } }
    const c = this.cfg.city;
    for (let i = 0; i < this.cars.length; i++) {
      const k = this.cars[i]; k.x += k.v * dt;
      if (k.x < c.x || k.x > c.x + c.w) this.cars[i] = this.car(false);
    }
  }
  drawBack(ctx, t) {
    const c = this.cfg.city;
    ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
    for (const k of this.cars) { ctx.globalAlpha = 0.9; ctx.fillStyle = k.col.replace(',1)', ',0.9)'); ctx.fillRect(k.x, k.y, 2.4, 1.6); }
    ctx.restore(); ctx.globalAlpha = 1;
    void t;
  }
  drawFront(ctx, t) {
    for (const m of this.motes) {
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.6 + m.p));
      ctx.globalAlpha = 0.45 * tw; ctx.fillStyle = '#cfe0ff'; ctx.fillRect(m.x, m.y, m.r, m.r);
    }
    ctx.globalAlpha = 1;
  }
}
