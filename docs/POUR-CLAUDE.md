# Pour l'assistant IA : installer Star Wars TV sur une télé

Tu aides une personne débutante à installer Star Wars TV sur sa télé Android TV / Google TV. Explique simplement,
une action à la fois, et demande avant chaque commande qui touche la télé.

1. **adb.** Si `adb` n'est pas installé, télécharge les platform-tools officiels de Google
   (`https://dl.google.com/android/repository/platform-tools-latest-<windows|darwin|linux>.zip`) dans le dossier de
   travail et utilise ce binaire.
2. **La télé.** La personne active le mode développeur et le débogage USB (Paramètres → À propos → 7 appuis sur Build
   → Options pour les développeurs → Débogage USB). Trouve l'adresse de la télé : demande-la (Paramètres → Réseau), ou
   cherche sur le réseau local un appareil qui répond sur le port 5555. `adb connect <ip>:5555`, puis fais accepter
   la fenêtre « Autoriser le débogage USB ? » (Toujours autoriser → OK). Android 14, Chromecast et Google TV Streamer :
   utiliser le « Débogage sans fil » (`adb pair <ip>:<port>` avec le code affiché, puis `adb connect`).
3. **L'appli.** Télécharge la dernière version publiée :
   `https://github.com/Wavia-tech/star-wars-tv/releases/latest/download/StarWarsTV.apk`, puis
   `adb install -r StarWarsTV.apk`. Si Play Protect bloque : Plus de détails → Installer quand même. Ne compile pas
   depuis les sources sauf si on te le demande (`bash android/build.sh`, JDK 17 et SDK Android requis).
4. **Ouvrir.** `adb shell am start -n fr.wavia.starwarstv/.Start`. Les Réglages s'ouvrent la première fois : la
   personne choisit son côté de la Force et ses applis. Pour l'écran d'accueil : Réglages → Touche Home → Star Wars TV,
   puis confirmer sur la télé. Ne change jamais l'accueil de la télé par adb : c'est son choix, dans l'appli.
5. **Revenir en arrière** si besoin : Réglages → Touche Home → Accueil d'origine, ou
   `adb uninstall fr.wavia.starwarstv`.

L'appli ne demande aucune permission, ne se connecte à rien et ne collecte aucune donnée.
