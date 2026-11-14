// Lightsaber hilts and blades, drawn on canvas (no images, no filters: cheap on a TV chip).
// A hilt is a stack of segments from the pommel (bottom) to the emitter (top), in hilt pixels.

const METAL = {
  silver: ['#3b3f45', '#c9ced6', '#f4f6f8', '#8d939b', '#2a2d31'],
  black: ['#030304', '#2c2e31', '#4a4d52', '#16171a', '#020203'],
  dark: ['#0b0907', '#2a231d', '#3a3028', '#17120e', '#060504'],
  gold: ['#4a3410', '#b98d3c', '#f3d98e', '#9a7228', '#3a280b'],
  tan: ['#3d2c1c', '#8a6a48', '#b8956c', '#6e5236', '#2e2014'],
};

export const HILTS = {
  vader: { segs: [
    { h: 14, w: 25, m: 'silver' }, { h: 72, w: 22, m: 'black', ridges: 7 }, { h: 26, w: 22, m: 'silver' },
    { h: 22, w: 25, m: 'silver', buttons: true }, { h: 36, w: 30, m: 'silver', shroud: true }] },
  luke: { segs: [
    { h: 12, w: 22, m: 'black' }, { h: 62, w: 20, m: 'black' }, { h: 6, w: 24, m: 'silver' },
    { h: 42, w: 22, m: 'black', buttons: true }, { h: 30, w: 26, m: 'silver', vents: true }] },
  anakin: { segs: [
    { h: 15, w: 24, m: 'silver' }, { h: 62, w: 20, m: 'black', ridges: 6 }, { h: 34, w: 20, m: 'silver', buttons: true },
    { h: 36, w: 28, m: 'silver', flare: true }] },
  obiwan: { segs: [
    { h: 16, w: 24, m: 'silver' }, { h: 58, w: 20, m: 'black', ridges: 5 }, { h: 40, w: 20, m: 'silver', buttons: true },
    { h: 30, w: 32, m: 'silver', flare: true }] },
  windu: { segs: [
    { h: 14, w: 22, m: 'silver' }, { h: 66, w: 20, m: 'gold', ridges: 9 }, { h: 30, w: 20, m: 'silver', buttons: true },
    { h: 24, w: 24, m: 'gold' }] },
  kylo: { segs: [
    { h: 18, w: 27, m: 'dark' }, { h: 66, w: 24, m: 'dark', ridges: 4 }, { h: 34, w: 27, m: 'dark', buttons: true },
    { h: 26, w: 30, m: 'dark', cross: true }] },
  rey: { segs: [
    { h: 14, w: 22, m: 'tan' }, { h: 60, w: 20, m: 'tan', wrap: true }, { h: 8, w: 24, m: 'gold' },
    { h: 34, w: 18, m: 'tan' }, { h: 20, w: 22, m: 'gold' }] },
  // Maul's staff: two emitters, one at each end. Drawn from one end to the other.
  maul: { double: true, segs: [
    { h: 22, w: 26, m: 'silver', flare: true, down: true }, { h: 84, w: 22, m: 'black', ridges: 8 }, { h: 34, w: 24, m: 'silver', buttons: true },
    { h: 84, w: 22, m: 'black', ridges: 8 }, { h: 22, w: 26, m: 'silver', flare: true }] },
};

export function hiltLength(type) { return HILTS[type].segs.reduce((a, s) => a + s.h, 0); }

function metalFill(ctx, m, x, w) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  const c = METAL[m];
  g.addColorStop(0, c[0]); g.addColorStop(0.28, c[1]); g.addColorStop(0.42, c[2]); g.addColorStop(0.7, c[3]); g.addColorStop(1, c[4]);
  return g;
}

// Draws the hilt with its pommel at (0, 0) and the emitter at (0, -length), in the current transform.
export function drawHilt(ctx, type) {
  const spec = HILTS[type];
  let y = 0;
  for (const s of spec.segs) {
    const top = y - s.h;
    ctx.fillStyle = metalFill(ctx, s.m, 0, s.w);
    ctx.beginPath();
    if (s.flare || s.shroud) {
      const wb = s.w * 0.72, wt = s.w;
      const [b, t] = s.down ? [wt, wb] : [wb, wt];
      ctx.moveTo(-b / 2, y); ctx.lineTo(b / 2, y); ctx.lineTo(t / 2, top); ctx.lineTo(-t / 2, top);
    } else {
      ctx.rect(-s.w / 2, top, s.w, s.h);
    }
    ctx.fill();
    // seams between segments
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(-s.w / 2, top, s.w, 1.5);
    if (s.ridges) {
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      const step = s.h / (s.ridges + 1);
      for (let i = 1; i <= s.ridges; i++) ctx.fillRect(-s.w / 2, y - i * step - 1.5, s.w, 3);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = 1; i <= s.ridges; i++) ctx.fillRect(-s.w / 2, y - i * step + 1.5, s.w, 1);
    }
    if (s.wrap) {
      ctx.strokeStyle = 'rgba(30,18,8,.6)'; ctx.lineWidth = 2;
      for (let k = y - 4; k > top; k -= 7) { ctx.beginPath(); ctx.moveTo(-s.w / 2, k); ctx.lineTo(s.w / 2, k - 5); ctx.stroke(); }
    }
    if (s.buttons) {
      ctx.fillStyle = '#111'; ctx.fillRect(-s.w * 0.18, top + s.h * 0.25, s.w * 0.36, s.h * 0.22);
      ctx.fillStyle = '#c21a1a'; ctx.fillRect(-s.w * 0.12, top + s.h * 0.6, s.w * 0.24, s.h * 0.14);
    }
    if (s.vents) {
      ctx.fillStyle = 'rgba(0,0,0,.75)';
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * s.w * 0.28 - 1.5, top + 5, 3, s.h - 10);
    }
    if (s.shroud) {
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(-s.w * 0.08, top + 4, s.w * 0.16, s.h - 8);
    }
    if (s.cross) {
      // Kylo Ren's crossguard: two short vented quillons.
      ctx.fillStyle = metalFill(ctx, s.m, 0, 12);
      ctx.fillRect(-s.w / 2 - 26, top + s.h * 0.35, 26, 10);
      ctx.fillRect(s.w / 2, top + s.h * 0.35, 26, 10);
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.fillRect(-s.w / 2 - 22, top + s.h * 0.35 + 3, 18, 4);
      ctx.fillRect(s.w / 2 + 4, top + s.h * 0.35 + 3, 18, 4);
    }
    y = top;
  }
  return -y;
}

// A blade from (0, y0) going up by `len` (negative y), in the current transform.
// `amt` 0..1 dims the glow while igniting; `t` drives the hum shimmer; `unstable` jitters like Kylo Ren's.
export function drawBlade(ctx, y0, len, color, amt, t, unstable = false, width = 1) {
  if (len < 2) return;
  const shimmer = 0.92 + 0.08 * Math.sin(t * 37) * Math.sin(t * 13.1);
  ctx.save();
  ctx.lineCap = 'round';
  const layers = [[120, 0.035], [72, 0.07], [42, 0.16], [24, 0.38], [14, 0.75]];   // wide soft bloom down to a hot edge
  const pts = [];
  const n = unstable ? 18 : 1;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const jx = unstable && i > 0 ? (Math.random() - 0.5) * 7 : 0;
    pts.push([jx, y0 - len * f]);
  }
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
  ctx.strokeStyle = color;
  for (const [w, a] of layers) {
    ctx.globalAlpha = a * amt * shimmer * (unstable ? 0.85 + Math.random() * 0.3 : 1);
    ctx.lineWidth = w * width; path(); ctx.stroke();
  }
  ctx.globalAlpha = Math.min(1, amt * 1.2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7 * width; path(); ctx.stroke();
  ctx.globalAlpha = Math.min(1, amt) * 0.9; ctx.strokeStyle = '#fffaf5'; ctx.lineWidth = 3.2 * width; path(); ctx.stroke();
  if (unstable && amt > 0.5) {
    // sparks spitting off the cracked crystal
    ctx.fillStyle = '#ffd0c0';
    for (let i = 0; i < 6; i++) {
      const p = pts[(Math.random() * pts.length) | 0];
      ctx.globalAlpha = Math.random() * 0.9;
      ctx.fillRect(p[0] + (Math.random() - 0.5) * 30, p[1] + (Math.random() - 0.5) * 10, 2, 2);
    }
  }
  ctx.restore();
}

// A soft pool of the blade's light on the room, drawn under everything else.
export function drawRoomGlow(ctx, x, y, color, amt) {
  if (amt <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 760);
  g.addColorStop(0, hexA(color, 0.24 * amt));
  g.addColorStop(0.35, hexA(color, 0.08 * amt));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);
}

export function hexA(hex, a) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}
