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
try { ({ LOGOS } = await import('../../assets/logos.js')); } catch { /* the logos are supplied locally, never versioned */ }

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
    this.frameN = 0; this.ema = 16.7; this.slowFor = 0;
    // the scenes are drawn every other frame on the TV (measured on a Mali-470: 53 fps instead of 48, half the graphics
    // work; mist, sand and shimmer are slow enough never to show it), and anywhere that can't hold 60; the dock always runs
    // at full rate
    this.half = /fps30/.test(location.search) || !!window.TV;

    // only the chosen side's scene is built at start; the other one the first time the side is switched
    this.scenes = {};
    this.layer = { jedi: null, sith: null };
    this.shade = document.createElement('div'); this.shade.className = 'shade';
    root.append(this.shade);
    // the lightning: a soft light, drawn at half the screen's resolution (a quarter of the pixels for the TV to fill)
    this.fx2 = document.createElement('canvas'); this.fx2.className = 'fx'; this.fx2.width = 960; this.fx2.height = 540;
    this.ctx2 = this.fx2.getContext('2d');
    this.ctx2.setTransform(0.5, 0, 0, 0.5, 0, 0);   // still drawn in stage pixels
    this.fx2.style.display = 'none';
    this.box = null;
    root.append(this.fx2);
    this.shown = camp;
    this.ready = this.scene(camp).ready$;

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

  // the scene for one side, built on first use (WebGL, or the plain picture if the TV has none)
  scene(c) {
    if (this.scenes[c]) return this.scenes[c];
    const Gl = c === 'jedi' ? TatooineGL : ThroneGL;
    // the still picture, and over it the canvas, which only covers the band where something moves
    const layer = document.createElement('div'); layer.className = 'scene'; layer.dataset.camp = c;
    layer.append(bg(SCENES[c].img, 'placeholder-' + c, c));
    let sc = new Gl(SCENES[c].img);
    if (sc.ok) layer.append(...sc.canvases);
    else sc = { ok: false, ready: true, ready$: Promise.resolve(), render() {} };
    layer.style.opacity = '0'; layer.style.visibility = 'hidden';
    this.root.insertBefore(layer, this.shade);
    this.scenes[c] = sc; this.layer[c] = layer;
    sc.ready$.then(() => { if (this.camp === c) this.shown = c; });
    setTimeout(() => { if (this.camp === c) this.shown = c; }, 4000);   // never wait forever on a slow picture
    return sc;
  }

  cellX(i) { return DOCK_L + (DOCK_W / APPS.length) * (i + 0.5); }

  tick() {
    const d = new Date();
    this.clock.firstChild.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    this.clock.lastChild.textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  setCamp(c) { this.camp = c; const sc = this.scene(c); if (sc.ready) this.shown = c; if (c === 'sith') { this.surge = 1; this.sfx.crackle(0.8, 0.45); } }

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

    // the cross-fade starts once the new side's scene is drawn, so it never fades through black
    const campT = this.shown === 'sith' ? 1 : 0;
    this.campMix += (campT - this.campMix) * Math.min(1, dt * 3.2);
    if (Math.abs(campT - this.campMix) < 0.002) this.campMix = campT;
    const jedi = 1 - this.campMix, sith = this.campMix;
    if (this._lastMix !== this.campMix) {
      for (const [c, a] of [['jedi', jedi], ['sith', sith]]) {
        const el = this.layer[c]; if (!el) continue;
        el.style.opacity = String(a); el.style.visibility = a > 0.001 ? 'visible' : 'hidden';
      }
      this._lastMix = this.campMix;
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
    // frame pacing: if the TV can't hold 60 for two seconds, the scenes go to 30 (slow mist and sand never show it)
    this.ema += (dt * 1000 - this.ema) * 0.05;
    if (!this.half) { this.slowFor = this.ema > 28 ? this.slowFor + dt : 0; if (this.slowFor > 2) this.half = true; }
    if (this.half && (this.frameN++ & 1)) return;
    if (jedi > 0.01 && this.scenes.jedi) this.scenes.jedi.render(t);
    if (sith > 0.01 && this.scenes.sith) this.scenes.sith.render(t);

    // the lightning, over the shade so it reads clearly against the dock. Redrawn only when the bolts take a new shape
    // (about 14 times a second) or the side is fading in: between those the canvas is left as it is, which costs nothing.
    const ctx2 = this.ctx2;
    if (sith > 0.01) {
      if (this.fx2.style.display) this.fx2.style.display = '';
      this.surge = Math.max(0, this.surge - dt * (this.half ? 4.4 : 2.2));
      this.power = 0.6 + 0.4 * this.surge;
      const hand = THRONE_HAND;
      const to = { x: this.selX, y: DOCK_TOP + 6 };
      const fresh = this.lightning.update(this.half ? dt * 2 : dt, hand, to, this.power);
      if (!fresh && sith >= 1 && this.box) return;
      if (this.box) { const b = this.box; ctx2.clearRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); this.box = null; }
      this.lightning.draw(ctx2, this.power * sith);
      stamp(ctx2, glow('rgba(190,200,255,1)', 256), hand.x, hand.y, 26, 0.85 * sith);
      stamp(ctx2, glow('rgba(170,180,255,1)', 256), to.x, to.y + 30, 190, (0.35 + 0.2 * Math.random()) * this.power * sith);
      const m = 380;
      this.box = [Math.max(0, Math.min(hand.x, to.x) - m), Math.max(0, hand.y - m), Math.min(1920, Math.max(hand.x, to.x) + m), 1080];
    } else {
      if (this.box) { const b = this.box; ctx2.clearRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); this.box = null; }
      if (!this.fx2.style.display) this.fx2.style.display = 'none';
    }
  }

  openColor() { return this.camp === 'sith' ? '#ff2020' : '#3d8bff'; }
}
