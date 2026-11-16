// Our home screen, set into the page in place of the cockpit: the side of the Force picks the scene
// (the twin sunset on Tatooine, or the Emperor's throne room). The page reads window.OURS.
import { Home } from './js/home.js';
import { Sfx } from './js/audio.js';
import { Settings } from './js/settings.js';
import { Picker } from './js/picker.js';

let camp = 'jedi';
try { camp = localStorage.getItem('camp') || 'jedi'; } catch { /* private mode */ }
if (/sith/.test(location.hash)) camp = 'sith';

const sfx = new Sfx();
addEventListener('keydown', () => sfx.unlock(), { capture: true });
const home = new Home(document.getElementById('ourhome'), sfx, camp);

const setCamp = (c) => { camp = c; try { localStorage.setItem('camp', camp); } catch { /* ignore */ } home.setCamp(camp); };
// the dock: the apps picked in Personnaliser that are on the TV (the page's own settings, see index.html: window.SW)
const refreshApps = () => { if (window.SW) home.setApps(SW.dock()); };
refreshApps();
const settings = new Settings({ camp: () => camp, setCamp, sfx, openApps: () => window.SW && SW.openCustom() });

const picker = new Picker(sfx);

window.OURS = {
  home, sfx, settings, picker, refreshApps,
  get camp() { return camp; },
  toggleCamp() { setCamp(camp === 'jedi' ? 'sith' : 'jedi'); },
};
// the first time: the settings open by themselves, so the side of the Force and the apps are chosen on the TV
try { if (!localStorage.getItem('sw-seen')) { localStorage.setItem('sw-seen', '1'); setTimeout(() => settings.open(), 1500); } } catch { /* ignore */ }
