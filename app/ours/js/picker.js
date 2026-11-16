// Where to watch: OK on a saber, a puck or a place through the bridge's windows. When the title is on several services
// (config.js: links), their logos show in a row under the title; ◂ ▸ choose, OK opens it there, Back closes. A service
// that isn't on the TV stays dim and says so. On one service only, it opens straight away.
let LOGOS = {};
try { ({ LOGOS } = await import('../../assets/logos.js')); } catch { /* logos supplied locally */ }

export class Picker {
  constructor(sfx) {
    this.sfx = sfx; this.isOpen = false;
    this.el = document.createElement('div'); this.el.id = 'swpick';
    document.getElementById('stage').append(this.el);
  }

  // the services that have this title, in config.js's order: [{ pkg, url, name, note, id, has }]
  options(title) {
    const cfg = window.STARWARS || {}, links = cfg.links || {}, names = cfg.services || {};
    return Object.keys(links).filter((pkg) => links[pkg][title]).map((pkg) => ({
      pkg, url: links[pkg][title], ...(names[pkg] || { name: pkg }),
      has: window.TV ? TV.has(pkg) : true,
    }));
  }

  // calls done(option) with the service chosen (or the only one), done(null) when the title has no link at all
  choose(title, label, done) {
    const opts = this.options(title), there = opts.filter((o) => o.has);
    if (opts.length === 0) return done(null);
    if (there.length === 1 && opts.length === 1) return done(there[0]);
    this.opts = opts; this.done = done; this.label = label;
    this.i = Math.max(0, opts.findIndex((o) => o.has));
    this.isOpen = true; this.el.classList.add('open'); this.draw();
  }

  close() { this.isOpen = false; this.el.classList.remove('open'); }

  draw() {
    const o = this.opts[this.i];
    this.el.innerHTML = `<div class="box"><div class="t">${this.label}</div><div class="row">${this.opts.map((s, i) => {
      const L = LOGOS[s.id];
      const mark = L ? `<div class="logo${L.luma ? ' luma' : ''}" style="--m:url('${L.src}');width:${Math.min(190, 70 * L.ratio)}px;height:${Math.min(70, 190 / L.ratio)}px"></div>` : `<div class="name">${s.name}</div>`;
      return `<div class="svc${i === this.i ? ' on' : ''}${s.has ? '' : ' absent'}">${mark}<div class="note">${s.note || ''}</div></div>`;
    }).join('')}</div><div class="say">${o.has ? `Regarder sur ${o.name}` : `${o.name} n’est pas installée sur cette télé`}</div>
      <div class="foot">◂ ▸ choisir · OK regarder · Retour fermer</div></div>`;
  }

  key(k) {
    if (k === 'Escape' || k === 'Backspace' || k === 'ArrowUp' || k === 'ArrowDown') { this.close(); return; }
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const n = this.i + (k === 'ArrowRight' ? 1 : -1);
      if (n >= 0 && n < this.opts.length) { this.i = n; this.sfx.tick && this.sfx.tick(); this.draw(); }
    } else if (k === 'Enter' || k === ' ') {
      const o = this.opts[this.i];
      if (!o.has) return;
      this.close(); this.done(o);
    }
  }
}
