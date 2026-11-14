// Our home screen, set into the page in place of the cockpit: the side of the Force picks the scene
// (the twin sunset on Tatooine, or the Emperor's throne room). The page reads window.OURS.
import { Home } from './js/home.js';
import { Sfx } from './js/audio.js';

let camp = 'jedi';
try { camp = localStorage.getItem('camp') || 'jedi'; } catch { /* private mode */ }
if (/sith/.test(location.hash)) camp = 'sith';

const sfx = new Sfx();
addEventListener('keydown', () => sfx.unlock(), { capture: true });
const home = new Home(document.getElementById('ourhome'), sfx, camp);

window.OURS = {
  home, sfx,
  get camp() { return camp; },
  toggleCamp() {
    camp = camp === 'jedi' ? 'sith' : 'jedi';
    try { localStorage.setItem('camp', camp); } catch { /* ignore */ }
    home.setCamp(camp);
  },
};
