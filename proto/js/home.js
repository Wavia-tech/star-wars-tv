// The home screen: the same dock in two scenes, chosen by the side of the Force.
//  jedi: the twin sunset on Tatooine (A New Hope), animated from the picture itself (tatooine-gl.js).
//  sith: the throne room (Return of the Jedi), the Emperor's lightning strikes the chosen app.
import { APPS, SCENES } from './config.js';
import { Lightning } from './lightning.js';
import { glow, stamp } from './ambient.js';
import { ThroneGL, THRONE_HAND } from './throne-gl.js';
import { TatooineGL } from './tatooine-gl.js';

const DOCK_L = 120, DOCK_W = 1680, DOCK_TOP = 900, LOGO_H = 64, LOGO_MAX_W = 210;
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

let LOGOS = {};
try { ({ LOGOS } = await import('../assets/logos.js')); } catch { /* the logos are supplied locally, never versioned */ }

function bg(src, fallback, camp) {
  const el = document.createElement('img');
  el.className = 'bg'; el.alt = ''; el.dataset.camp = camp;
  el.onerror = () => { el.removeAttribute('src'); el.classList.add(fallback); };
  el.src = src;
  return el;
}

function logoEl(app) {
  const L = LOGOS[app.id];
  if (!L) { const d = document.createElement('div'); d.className = 'logo-text'; d.textContent = app.name; return d; }
  // the logo is a mask filled with one colour (some source files carry their own colours)
  const im = document.createElement('div'); im.className = 'logo' + (L.luma ? ' luma' : ''); im.setAttribute('aria-label', app.name);
  im.style.setProperty('--m', `url("${L.src}")`);
  // sized by optical weight, the way Poudlard TV does it
  let h = LOGO_H * (L.scale || 1) / Math.sqrt(Math.max(0.6, Math.min(L.ratio, 3)));
  let w = h * L.ratio;
  if (w > LOGO_MAX_W) { w = LOGO_MAX_W; h = w / L.ratio; }
  im.style.width = `${w}px`; im.style.height = `${h}px`;
  return im;
}

export class Home {
  constructor(root, sfx, camp) {
    this.root = root; this.sfx = sfx; this.camp = camp; this.sel = 0;
    this.selX = this.cellX(0); this.velX = 0;
    this.campMix = camp === 'sith' ? 1 : 0;
    this.power = 0; this.surge = 0;
    this.lightning = new Lightning();

    this.tatooine = new TatooineGL(SCENES.jedi.img);
    this.bgJ = this.tatooine.ok ? this.tatooine.canvas : bg(SCENES.jedi.img, 'placeholder-jedi', 'jedi');
    this.bgJ.dataset.camp = 'jedi';
    this.throne = new ThroneGL(SCENES.sith.img);
    this.bgS = this.throne.ok ? this.throne.canvas : bg(SCENES.sith.img, 'placeholder-sith', 'sith');
    this.bgS.dataset.camp = 'sith';
    root.append(this.bgJ, this.bgS);

    this.fx = document.createElement('canvas'); this.fx.className = 'fx'; this.fx.width = 1920; this.fx.height = 1080;
    this.ctx = this.fx.getContext('2d');
    const shade = document.createElement('div'); shade.className = 'shade';
    root.append(this.fx, shade);
    this.fx2 = document.createElement('canvas'); this.fx2.className = 'fx'; this.fx2.width = 1920; this.fx2.height = 1080;
    this.ctx2 = this.fx2.getContext('2d');
    root.append(this.fx2);

    this.clock = document.createElement('div'); this.clock.className = 'clock';
    this.clock.innerHTML = '<div class="t"></div><div class="d"></div>';
    root.append(this.clock);

    this.dock = document.createElement('div'); this.dock.className = 'dock';
    this.items = APPS.map((a) => {
      const el = document.createElement('div'); el.className = 'app';
      el.append(logoEl(a));
      this.dock.append(el);
      return { el, s: 1, v: 0, lastS: -1 };
    });
    const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = 'La salle des sabres  ▾';
    root.append(this.dock, hint);
    this.tick();
  }

  cellX(i) { return DOCK_L + (DOCK_W / APPS.length) * (i + 0.5); }

  tick() {
    const d = new Date();
    this.clock.firstChild.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    this.clock.lastChild.textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  setCamp(c) { this.camp = c; if (c === 'sith') { this.surge = 1; this.sfx.crackle(0.8, 0.45); } }

  move(d) {
    const n = Math.max(0, Math.min(APPS.length - 1, this.sel + d));
    if (n === this.sel) return false;
    this.sel = n;
    if (this.camp === 'sith') { this.surge = 1; this.sfx.crackle(); }
    return true;
  }

  current() { return APPS[this.sel]; }

  update(dt, t, visible) {
    const tx = this.cellX(this.sel);
    const k = 170, c = 2 * Math.sqrt(k);
    this.velX += ((tx - this.selX) * k - this.velX * c) * dt;
    this.selX += this.velX * dt;

    const campT = this.camp === 'sith' ? 1 : 0;
    this.campMix += (campT - this.campMix) * Math.min(1, dt * 3.2);
    if (Math.abs(campT - this.campMix) < 0.002) this.campMix = campT;
    const jedi = 1 - this.campMix, sith = this.campMix;
    if (this._lastMix !== this.campMix) {
      this.bgJ.style.opacity = String(jedi); this.bgS.style.opacity = String(sith); this._lastMix = this.campMix;
    }

    this.items.forEach((it, i) => {
      const target = i === this.sel ? 1.22 : 1;
      it.v += ((target - it.s) * 260 - it.v * 22) * dt;
      it.s += it.v * dt;
      const s = Math.round(it.s * 1000) / 1000;
      if (s !== it.lastS) {
        it.el.style.transform = `scale(${s})`;
        it.el.style.opacity = String(0.62 + 0.38 * Math.min(1, Math.max(0, (it.s - 1) / 0.22)));
        it.lastS = s;
      }
    });

    if (!visible) return;
    if (jedi > 0.01 && this.tatooine.ok) this.tatooine.render(t);
    if (sith > 0.01 && this.throne.ok) this.throne.render(t);

    const ctx = this.ctx, ctx2 = this.ctx2;
    ctx.clearRect(0, 0, 1920, 1080); ctx2.clearRect(0, 0, 1920, 1080);

    // over the shade: the lightning, so it reads clearly against the dock
    if (sith > 0.01) {
      this.surge = Math.max(0, this.surge - dt * 2.2);
      this.power = 0.6 + 0.4 * this.surge;
      const hand = THRONE_HAND;
      const to = { x: this.selX, y: DOCK_TOP + 6 };
      this.lightning.update(dt, hand, to, this.power);
      // the bolts, and a small glow at the fingertips only (the emperor himself stays untouched)
      this.lightning.draw(ctx2, this.power * sith);
      stamp(ctx2, glow('rgba(190,200,255,1)', 256), hand.x, hand.y, 26, 0.85 * sith);
      stamp(ctx2, glow('rgba(170,180,255,1)', 256), to.x, to.y + 30, 190, (0.35 + 0.2 * Math.random()) * this.power * sith);
    }
  }

  openColor() { return this.camp === 'sith' ? '#ff2020' : '#3d8bff'; }
}
