// Force lightning, drawn procedurally: a new bolt shape every few frames, never twice the same.

function subdivide(x1, y1, x2, y2, disp, depth, out) {
  if (depth === 0) { out.push([x2, y2]); return; }
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp;
  subdivide(x1, y1, mx, my, disp / 2, depth - 1, out);
  subdivide(mx, my, x2, y2, disp / 2, depth - 1, out);
}

function makeBolt(x1, y1, x2, y2, spread) {
  const main = [[x1, y1]];
  const len = Math.hypot(x2 - x1, y2 - y1);
  subdivide(x1, y1, x2, y2, Math.min(260, len * 0.32) * spread, 7, main);
  const branches = [];
  const nb = 2 + ((Math.random() * 3) | 0);
  for (let b = 0; b < nb; b++) {
    const i = 10 + ((Math.random() * (main.length - 30)) | 0);
    const [bx, by] = main[i];
    const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.6;
    const bl = 60 + Math.random() * 180;
    const pts = [[bx, by]];
    subdivide(bx, by, bx + Math.cos(ang) * bl, by + Math.sin(ang) * bl, bl * 0.45, 4, pts);
    branches.push(pts);
  }
  return { main, branches };
}

export class Lightning {
  constructor() { this.bolts = []; this.timer = 0; }

  // from: the hand; to: the target point; power 0..1
  // returns true when the bolts took a new shape (the only time they need drawing again)
  update(dt, from, to, power) {
    this.timer -= dt;
    if (this.timer <= 0 || this.bolts.length === 0) {
      this.timer = 0.045 + Math.random() * 0.05;
      this.bolts = [];
      const count = power > 0.6 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const tx = to.x + (Math.random() - 0.5) * 70, ty = to.y + (Math.random() - 0.5) * 30;
        this.bolts.push(makeBolt(from.x, from.y, tx, ty, 0.8 + Math.random() * 0.5));
      }
      return true;
    }
    return false;
  }

  draw(ctx, power) {
    if (power <= 0.01) return;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const line = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
    for (const b of this.bolts) {
      const a = power * (0.7 + Math.random() * 0.3);
      ctx.strokeStyle = '#6d5cff'; ctx.globalAlpha = 0.14 * a; ctx.lineWidth = 34; line(b.main);
      ctx.strokeStyle = '#9fb4ff'; ctx.globalAlpha = 0.4 * a; ctx.lineWidth = 12; line(b.main);
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.95 * a; ctx.lineWidth = 3.2; line(b.main);
      for (const br of b.branches) {
        ctx.strokeStyle = '#9fb4ff'; ctx.globalAlpha = 0.3 * a; ctx.lineWidth = 6; line(br);
        ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.8 * a; ctx.lineWidth = 1.4; line(br);
      }
    }
    ctx.restore();
  }
}
