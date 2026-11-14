// One requestAnimationFrame loop drives everything; the page handles every key itself.
import { Home } from './home.js';
import { Room } from './room.js';
import { Sfx } from './audio.js';
import { hexA } from './sabers.js';

const stage = document.getElementById('stage');
const world = document.getElementById('world');
const overlay = document.getElementById('overlay');
const octx = overlay.getContext('2d');
const opening = document.getElementById('opening');

function fit() { stage.style.zoom = String(Math.min(innerWidth / 1920, innerHeight / 1080)); }
addEventListener('resize', fit); fit();

let camp = 'jedi';
try { camp = localStorage.getItem('camp') || 'jedi'; } catch { /* private mode */ }

const sfx = new Sfx();
const home = new Home(document.getElementById('home'), sfx, camp);
window.__home = home; // for previews and debugging
const room = new Room(document.getElementById('room'), sfx);
window.__room = room; // for previews and debugging

let section = 0, pos = 0, vel = 0;
let slash = null; // { t, color, label, sub }

const hash = location.hash;
if (hash.includes('room')) { section = 1; pos = 1; room.enter(); }
if (hash.includes('sith')) { camp = 'sith'; home.setCamp('sith'); }

function go(n) {
  if (n === section || n < 0 || n > 1) return;
  section = n; sfx.whoosh();
  if (n === 1) room.enter(); else room.leave();
}

function open() {
  if (slash) return;
  if (section === 0) { const a = home.current(); slash = { t: 0, color: home.openColor(), label: a.name, sub: 'Ouverture…' }; }
  else { const f = room.current(); slash = { t: 0, color: f.color, label: f.title, sub: 'Ouverture sur Disney+…' }; }
  sfx.clash();
}

addEventListener('keydown', (e) => {
  sfx.unlock();
  const k = e.key;
  e.preventDefault();
  if (slash) { if (k === 'Escape' || k === 'Backspace') slash = null; return; }
  if (k === 'ArrowLeft' || k === 'ArrowRight') {
    const d = k === 'ArrowLeft' ? -1 : 1;
    if (section === 0) home.move(d); else room.move(d);
  } else if (k === 'ArrowDown') go(section + 1);
  else if (k === 'ArrowUp') go(section - 1);
  else if (k === 'Escape' || k === 'Backspace') go(section - 1);
  else if (k === 'Enter' || k === ' ') open();
  else if (k === 'c' || k === 'C') {
    camp = camp === 'jedi' ? 'sith' : 'jedi';
    try { localStorage.setItem('camp', camp); } catch { /* ignore */ }
    home.setCamp(camp);
  }
});

// The opening: the blade cuts the screen diagonally, a flash, then the app's name.
function drawSlash(dt) {
  octx.clearRect(0, 0, 1920, 1080);
  if (!slash) { opening.style.opacity = '0'; return; }
  slash.t += dt;
  const t = slash.t;
  const cut = Math.min(1, t / 0.16);
  const x1 = -100, y1 = 1180, x2 = 2020, y2 = -100;
  const ex = x1 + (x2 - x1) * cut, ey = y1 + (y2 - y1) * cut;
  const fade = t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.25);
  if (fade > 0) {
    octx.save(); octx.lineCap = 'round';
    for (const [w, a] of [[90, 0.08], [50, 0.18], [24, 0.45]]) { octx.strokeStyle = hexA(slash.color, a * fade); octx.lineWidth = w; octx.beginPath(); octx.moveTo(x1, y1); octx.lineTo(ex, ey); octx.stroke(); }
    octx.strokeStyle = `rgba(255,255,255,${fade})`; octx.lineWidth = 8; octx.beginPath(); octx.moveTo(x1, y1); octx.lineTo(ex, ey); octx.stroke();
    octx.restore();
  }
  // the two halves part: darkness spreads from the cut
  if (t > 0.18) {
    const p = Math.min(1, (t - 0.18) / 0.35);
    octx.fillStyle = `rgba(0,0,0,${p})`; octx.fillRect(0, 0, 1920, 1080);
    const flash = Math.max(0, 1 - (t - 0.18) / 0.12);
    if (flash > 0) { octx.fillStyle = `rgba(255,255,255,${flash * 0.8})`; octx.fillRect(0, 0, 1920, 1080); }
  }
  if (t > 0.45) {
    opening.style.opacity = String(Math.min(1, (t - 0.45) / 0.3));
    opening.firstChild.textContent = slash.label;
    opening.lastChild.textContent = slash.sub;
  }
  if (t > 2.6) slash = null;
}

let last = performance.now(), clockT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  const k = 90, c = 2 * Math.sqrt(k);
  vel += ((section - pos) * k - vel * c) * dt; pos += vel * dt;
  if (Math.abs(section - pos) < 0.0005 && Math.abs(vel) < 0.001) { pos = section; vel = 0; }
  world.style.transform = `translate3d(0, ${(-pos * 1080).toFixed(1)}px, 0)`;
  home.update(dt, t, pos < 0.999);
  room.update(dt, t, pos > 0.001);
  drawSlash(dt);
  clockT += dt; if (clockT > 5) { clockT = 0; home.tick(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
