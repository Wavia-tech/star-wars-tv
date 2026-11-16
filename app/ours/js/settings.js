// Réglages: the panel behind the gear at the top right of the home (Up from the dock, or the remote's Menu key).
// Up/Down choose a row, Left/Right choose an option (applied at once), OK on a button, Back closes.
//   Côté de la Force   Lumineux (Tatooine) | Obscur (salle du trône)
//   Applis et films    opens the page's own Personnaliser panel (the six apps of the dock, where the films open)
//   Touche Home        Star Wars TV | Accueil d'origine (the way back to the TV's own home)
//   Sons               Activés | Coupés
//   Réglages de la télé, À propos
const HOME_HINT = {
  held: 'La touche Home ouvre maintenant Star Wars TV.',
  role: 'Choisissez Star Wars TV dans la fenêtre qui vient de s’ouvrir.',
  fire: 'Choisissez Star Wars TV dans l’écran qui vient de s’ouvrir.',
  settings: 'Choisissez Star Wars TV comme application d’accueil dans l’écran qui vient de s’ouvrir.',
  'press-home': 'Appuyez sur Home, choisissez Star Wars TV, puis « Toujours ».',
  launched: 'La touche Home revient à l’accueil d’origine.',
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export class Settings {
  constructor(app) {
    this.app = app;   // { camp(), setCamp(c), sfx, openApps() }
    this.isOpen = false; this.row = 0; this.note = '';
    this.el = document.createElement('div'); this.el.id = 'swset';
    document.getElementById('stage').append(this.el);
    if (store.get('sw-sound', 'on') === 'off') this.app.sfx.setOn(false);
    document.addEventListener('poudlard:home', () => { if (this.isOpen) this.draw(); });
  }

  rows() {
    const tv = window.TV && TV.homeMode;
    const home = tv ? TV.homeMode() : null;
    return [
      { key: 'camp', label: 'Côté de la Force', options: [['jedi', 'Lumineux', 'Tatooine'], ['sith', 'Obscur', 'La salle du trône']], value: this.app.camp() },
      { key: 'apps', label: 'Applis et films', button: 'Choisir', sub: 'Les six applis de l’accueil, et l’appli où s’ouvrent les films.' },
      tv ? { key: 'home', label: 'Touche Home', options: [['app', 'Star Wars TV', ''], ['original', 'Accueil d’origine', '']], value: home === 'app' ? 'app' : 'original',
             sub: home === 'app' ? 'La touche Home ouvre Star Wars TV. « Accueil d’origine » vous ramène à l’accueil d’avant.'
                                 : 'Faites de Star Wars TV l’écran d’accueil de la télé. Vous pourrez revenir en arrière ici.' }
         : { key: 'home', label: 'Touche Home', sub: 'Sur la télé seulement.' },
      { key: 'sound', label: 'Sons', options: [['on', 'Activés', ''], ['off', 'Coupés', '']], value: this.app.sfx.on ? 'on' : 'off' },
      tv ? { key: 'tv', label: 'Réglages de la télé', button: 'Ouvrir' } : null,
      { key: 'about', label: 'À propos', text: `Star Wars TV ${window.SW_VERSION || ''} · projet de fan non officiel et gratuit. Aucune connexion, aucune donnée collectée. Retour maintenu 6 secondes : issue de secours. Star Wars est une marque de Lucasfilm Ltd.` },
    ].filter(Boolean);
  }

  open() { this.isOpen = true; this.row = 0; this.note = ''; this.el.classList.add('open'); this.draw(); }
  close() { this.isOpen = false; this.el.classList.remove('open'); }

  draw() {
    const rows = this.rows();
    this.row = Math.max(0, Math.min(rows.length - 1, this.row));
    this.el.innerHTML = `<div class="box"><div class="h">Réglages</div>${rows.map((r, i) => `
      <div class="row${i === this.row ? ' on' : ''}">
        <div class="lab">${r.label}</div>
        ${r.options ? `<div class="opts">${r.options.map(([v, t, s]) => `<div class="opt${v === r.value ? ' sel' : ''}">${t}${s ? `<i>${s}</i>` : ''}</div>`).join('')}</div>` : ''}
        ${r.button ? `<div class="opts"><div class="opt btn">${r.button}</div></div>` : ''}
        ${r.sub ? `<div class="sub">${r.sub}</div>` : ''}
        ${r.text ? `<div class="sub">${r.text}</div>` : ''}
      </div>`).join('')}
      <div class="note">${this.note}</div>
      <div class="foot">◂ ▸ choisir · OK valider · Retour fermer</div></div>`;
  }

  pick(r, v) {
    if (r.key === 'camp' && v !== this.app.camp()) this.app.setCamp(v);
    if (r.key === 'sound') { this.app.sfx.setOn(v === 'on'); store.set('sw-sound', v); }
    if (r.key === 'home') {
      const res = JSON.parse(TV.setHome(v) || '{}');
      this.note = res.ok === false ? (res.error || 'La télé a refusé.')
        : v === 'original' ? (res.hint === 'press-home' ? 'La touche Home est rendue à la télé : appuyez dessus.' : HOME_HINT.launched)
        : (HOME_HINT[res.hint] || '');
    }
    this.draw();
  }

  key(k) {
    const rows = this.rows(), r = rows[this.row];
    if (k === 'Escape' || k === 'Backspace' || k === 'ContextMenu' || k === 'Home') { this.close(); return; }
    this.app.sfx.tick();
    if (k === 'ArrowUp') this.row--;
    else if (k === 'ArrowDown') this.row++;
    else if ((k === 'ArrowLeft' || k === 'ArrowRight') && r.options) {
      const i = r.options.findIndex(([v]) => v === r.value), j = Math.max(0, Math.min(r.options.length - 1, i + (k === 'ArrowRight' ? 1 : -1)));
      if (j !== i) return this.pick(r, r.options[j][0]);
    } else if (k === 'Enter' || k === ' ') {
      if (r.key === 'apps') { this.close(); this.app.openApps(); return; }
      if (r.key === 'tv') { TV.openSystem('settings'); return; }
      if (r.options) { const i = r.options.findIndex(([v]) => v === r.value); return this.pick(r, r.options[(i + 1) % r.options.length][0]); }
    }
    this.draw();
  }
}
