# Star Wars TV, the Android TV app

The same launcher as Poudlard TV (no permission, no Gradle, no library), renamed `fr.wavia.starwarstv`: a WebView that
shows `../app` from the APK's assets under `https://starwars.invalid/`. `app/tv-bridge.js` gives the page the `window.TV`
it expects, on top of the launcher's `window.Android`.

```bash
bash android/build.sh                      # → android/StarWarsTV.apk
STARWARS_DEBUG=1 bash android/build.sh     # debuggable, to measure on a TV (never publish it)
adb connect <tv-ip>:5555 && adb install -r android/StarWarsTV.apk
```

Installing never takes the Home key: the app shows in the TV's app list (Star Wars TV).

Measuring on the TV (debug APK): `adb forward tcp:9229 localabstract:webview_devtools_remote_<pid>`, then
`node tools/tv-eval.mjs "<js>"`. The page also logs its frame rate to logcat every 5 seconds (`perf section=…`).
