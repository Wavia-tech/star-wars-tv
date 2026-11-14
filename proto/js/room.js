// The saber room:
// six lightsabers on cradles along the marble ledge, one for each film. The unlit ones sit in shadow; the chosen one
// rises out of its cradle, held up by the Force, ignites, and the hall takes its colour; a line of that colour runs
// along the ledge's edge, and the film's title shows underneath.
// The hilt pictures are supplied locally (proto/assets/hilts/<key>.png, never versioned); without them the hilts
// are drawn in plain metal.
import { SABERS, SCENES } from './config.js';
import { drawHilt, hiltLength } from './sabers.js';

const RACK_Y = SCENES.room.ledge, HS = 0.8, LIFT = 46, TIP = 40;   // ledge top; hilt scale; how high it rises; where blades end
const HILT = { maul: [45, 470], yoda: [58.5, 205], windu: [55, 300], kenobi: [52.5, 300], vader: [72, 300], luke6: [54, 300] };
const FALLBACK = { maul: 'maul', yoda: 'luke', windu: 'windu', kenobi: 'obiwan', vader: 'vader', luke6: 'luke' };

const spring = (x, k, z) => ({ x, v: 0, k, z });
function step(s, target, dt) { s.v += (-s.k * (s.x - target) - 2 * s.z * Math.sqrt(s.k) * s.v) * dt; s.x += s.v * dt; return s.x; }
const css = (el, prop, v) => { if (el['_' + prop] !== v) { el.style[prop] = v; el['_' + prop] = v; } };

function hiltPicture(key, w, h) {
  const im = document.createElement('img');
  im.alt = ''; im.className = 'hilt';
  Object.assign(im.style, { left: `${-w / 2}px`, top: `${-h}px`, width: `${w}px`, height: `${h}px` });
  im.onerror = () => {
    // no local picture: draw the hilt instead, at the same height
    const c = document.createElement('canvas'); const type = FALLBACK[key];
    const sc = h / hiltLength(type);
    c.width = Math.ceil(70 * sc); c.height = Math.ceil(h);
    const x = c.getContext('2d'); x.translate(c.width / 2, c.height); x.scale(sc, sc); drawHilt(x, type);
    c.className = 'hilt';
    Object.assign(c.style, { left: `${-c.width / 2}px`, top: `${-h}px`, width: `${c.width}px`, height: `${h}px` });
    im.replaceWith(c);
  };
  im.src = `assets/hilts/${key}.png`;
  return im;
}

export class Room {
  constructor(root, sfx) {
    this.root = root; this.sfx = sfx; this.active = false;
    const bg = document.createElement('img'); bg.className = 'bg'; bg.alt = ''; bg.src = SCENES.room.img;
    const dim = document.createElement('div'); dim.className = 'room-dim';   // the hall a little darker, so the lit blade carries the scene
    const washes = document.createElement('div'); washes.className = 'washes';
    this.plinth = document.createElement('div'); this.plinth.className = 'plinth-glow';
    this.plinth.style.top = `${RACK_Y + 2}px`;
    const rack = document.createElement('div'); rack.className = 'sabers';
    this.title = document.createElement('div'); this.title.className = 'saga-title';
    this.title.innerHTML = '<div class="e"></div><div class="t"></div><div class="y"></div>';
    const shade = document.createElement('div'); shade.className = 'shade room-shade';
    const head = document.createElement('div'); head.className = 'room-head'; head.textContent = 'La salle des sabres';
    const hint = document.createElement('div'); hint.className = 'hint top'; hint.textContent = '▴  Accueil';
    root.append(bg, dim, washes, shade, this.plinth, rack, this.title, head, hint);

    this.sabers = SABERS.map((f, i) => {
      const x = 960 + (i - 2.5) * 236 + (i < 3 ? -22 : 22);               // a little gap between the two trilogies
      const [w, h] = HILT[f.key].map((v) => v * HS);
      const len = f.bl ? Math.round((RACK_Y - 300 * HS - LIFT - TIP) * f.bl) : RACK_Y - h - LIFT - TIP;
      const el = document.createElement('div'); el.className = 'saber'; el.style.setProperty('--c', `rgb(${f.c})`);
      el.innerHTML = `<div class="blade up" style="top:${-h - len}px;height:${len}px"><div class="glow"></div><div class="core"></div></div>` +
        (f.dbl ? `<div class="blade down" style="top:0;height:${len}px"><div class="glow"></div><div class="core"></div></div>` : '');
      el.append(hiltPicture(f.key, w, h));
      el.insertAdjacentHTML('beforeend', `<div class="cradle"></div><div class="ep">${f.ep}</div>`);
      rack.append(el);
      const wash = document.createElement('div'); wash.className = 'wash';
      wash.style.background = `radial-gradient(ellipse 820px 640px at ${x}px 420px, rgba(${f.c},.30), rgba(${f.c},.10) 45%, rgba(${f.c},0) 78%)`;
      washes.append(wash);
      return { el, x, wash, lift: spring(0, 60, 0.55), ign: 0, lit: false, ups: el.querySelectorAll('.blade'), cores: el.querySelectorAll('.core'), ep: el.querySelector('.ep') };
    });
    this.sel = 4; this.selAt = 0;
    this.sabers[this.sel].el.classList.add('on');
    this.text();
  }

  enter() { this.active = true; this.selAt = 0; }
  leave() { this.active = false; }

  move(d) {
    const n = Math.max(0, Math.min(SABERS.length - 1, this.sel + d));
    if (n === this.sel) { this.sabers[n].lift.v -= 120; return false; }   // a little nudge at the ends
    this.sabers[this.sel].el.classList.remove('on');
    this.sel = n; this.selAt = 0;
    this.sabers[n].el.classList.add('on');
    this.text();
    return true;
  }

  current() {
    const f = SABERS[this.sel];
    const hex = '#' + f.c.split(',').map((v) => Number(v).toString(16).padStart(2, '0')).join('');
    return { title: f.t, color: hex };
  }

  text() {
    const f = SABERS[this.sel];
    this.title.querySelector('.e').textContent = `Épisode ${f.ep}`;
    this.title.querySelector('.t').textContent = f.t;
    this.title.querySelector('.y').textContent = f.who;
    const pct = ((this.sabers[this.sel].x - 135) / 16.5).toFixed(1);
    this.plinth.style.background = `linear-gradient(90deg, rgba(${f.c},0), rgba(${f.c},.9) ${pct}%, rgba(${f.c},0))`;
  }

  update(dt, t, visible) {
    if (!visible) { this.sfx.hum(0); return; }
    this.selAt += dt;
    let hum = 0;
    this.sabers.forEach((s, i) => {
      const on = this.active && i === this.sel;
      const y = step(s.lift, on ? -LIFT : 0, dt) + (on ? Math.sin(t * 1.4) * 4 : 0);   // held up by the Force, drifting a little
      css(s.el, 'transform', `translate3d(${s.x}px, ${(RACK_Y + y).toFixed(1)}px, 0)`);
      css(s.ep, 'transform', `translate3d(0, ${(-y).toFixed(1)}px, 0)`);               // the numeral stays on the ledge
      const want = on && this.selAt > 0.3;
      if (want && !s.lit) { s.lit = true; this.sfx.ignite(); }
      if (!want && s.lit) { s.lit = false; this.sfx.retract(); }
      s.ign = want ? Math.min(1, s.ign + dt / 0.32) : Math.max(0, s.ign - dt / 0.16);
      const k = want ? 1 - Math.pow(1 - s.ign, 3) : s.ign;
      const wob = 1 + Math.sin(t * 47 + i) * 0.025 + Math.sin(t * 13.3) * 0.015;
      s.ups.forEach((b) => { css(b, 'transform', `scaleY(${k.toFixed(3)}) scaleX(${wob.toFixed(3)})`); css(b, 'opacity', k > 0.001 ? '1' : '0'); });
      s.cores.forEach((c) => css(c, 'opacity', (0.92 + 0.08 * Math.sin(t * 61 + i * 2)).toFixed(3)));
      css(s.wash, 'opacity', (k * (0.9 + 0.1 * Math.sin(t * 23))).toFixed(3));
      hum = Math.max(hum, k);
    });
    css(this.plinth, 'opacity', (this.sabers[this.sel].ign * 0.8).toFixed(3));
    this.sfx.hum(this.active ? hum : 0);
  }
}
