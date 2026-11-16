// On the TV, the Android launcher (android/, the same as Poudlard TV's) exposes window.Android. The page expects the
// bridge of Kevin Adams's own app, window.TV: this file builds it on top of window.Android. In a browser it does nothing.
(function () {
  const A = window.Android;
  if (!A || window.TV) return;
  const parse = (j, d) => { try { return JSON.parse(j) || d; } catch (e) { return d; } };
  let pkgs = null, inputs = null;
  const installed = () => pkgs || (pkgs = new Set(parse(A.installedPackages(), [])));
  const tvInputs = () => inputs || (inputs = parse(A.inputs(), []).map(i => ({ id: i.id, label: i.label || i.id })));
  const findInput = name => tvInputs().find(i => i.id === name || i.label.toLowerCase().includes(name.toLowerCase()));
  const DISNEY = "com.disney.disneyplus";     // in France every Star Wars film and series is on Disney+

  window.TV = {
    apps: () => JSON.stringify(parse(A.installedApps(), []).map(a => ({ pkg: a.pkg, label: a.label, media: !a.system }))),
    inputs: () => JSON.stringify(tvInputs()),
    has: pkg => pkg.startsWith("input:") ? !!findInput(pkg.slice(6)) : installed().has(pkg),
    icon: pkg => A.appIcon(pkg),
    launch: target => {
      if (target.startsWith("input:")) { const i = findInput(target.slice(6)); return i ? A.switchInput(i.id) : ""; }
      return A.launch(target);
    },
    // a film: its own link in that app when config.js has one, else the app itself (the TV's search isn't reachable
    // from here: "search" opens Disney+)
    openFilm: (link, films, title) => {
      const app = films && films !== "search" ? films : DISNEY;
      if (link) return A.openUrl(link, app);
      return A.launch(installed().has(app) ? app : DISNEY);
    },
    // Réglages → Touche Home: "app" (Star Wars TV answers Home) or "original" (the TV's own home, the way back)
    homeMode: () => A.homeMode() === "poudlard" ? "app" : "original",
    setHome: mode => A.setHome(mode === "app" ? "poudlard" : "original"),
    openSystem: key => A.openSystem(key, null),
    loadConfig: () => { try { return localStorage.getItem("starwars") || ""; } catch (e) { return ""; } },
    saveConfig: j => { try { localStorage.setItem("starwars", j); } catch (e) { } },
  };
})();
