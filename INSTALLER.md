# Installer Star Wars TV sur ta télé

Guide pour débutants. Compte **15 minutes**. Tout est réversible : ta télé revient comme avant en moins d'une minute.

## Avant de commencer

1. **Une télé ou un boîtier Android TV / Google TV.** Ça ne marche **pas** sur Apple TV, Samsung, LG, Roku ni les Fire
   TV récents. Pas compatible ? Un boîtier Google TV branché en HDMI fait l'affaire sur n'importe quelle télé.
2. **Un ordinateur** (Windows ou Mac) **sur le même Wi-Fi** que la télé, seulement pendant l'installation.

## Étape 1 : active le mode développeur sur la télé

1. Paramètres → **Système → À propos** (ou **Préférences de l'appareil → À propos**).
2. Appuie **7 fois** sur la ligne **Build** jusqu'au message « Vous êtes maintenant développeur ».
3. Reviens en arrière → **Options pour les développeurs** → active **Débogage USB**.

Ton menu est différent ? Demande à Claude : « Sur ma télé [marque et modèle], comment activer les options pour les
développeurs et le débogage ADB ? ». Ça ne casse rien, et ça se désactive en un clic.

## Étape 2, méthode simple : avec Claude Code

1. Installe l'application **Claude** sur ton ordinateur ([claude.com/download](https://claude.com/download)). **Sur
   Windows**, installe aussi **Git** ([git-scm.com](https://git-scm.com/download/win), tout par défaut).
2. Crée un dossier vide, par exemple `Star Wars` sur ton bureau, ouvre Claude, clique sur **`</>`** (Claude Code) et
   choisis ce dossier.
3. Envoie ce message, avec le modèle de ta télé :

   > Installe Star Wars TV sur ma télé [marque et modèle] : github.com/Wavia-tech/star-wars-tv
   > Je suis débutant, explique-moi simplement ce que je dois faire sur la télé.

4. Claude télécharge l'appli et la met sur ta télé ; il te demande la permission avant chaque action.
5. **Sur la télé**, la fenêtre « Autoriser le débogage USB ? » : coche **Toujours autoriser** puis **OK**. Si Google Play
   Protect bloque l'appli : **Plus de détails → Installer quand même** (Star Wars TV ne demande aucune permission).

## Étape 2, sans Claude Code

1. Télécharge l'appli : [StarWarsTV.apk](https://github.com/Wavia-tech/star-wars-tv/releases/latest/download/StarWarsTV.apk).
2. Télécharge les outils Android de Google (adb) :
   [Windows](https://dl.google.com/android/repository/platform-tools-latest-windows.zip) ·
   [Mac](https://dl.google.com/android/repository/platform-tools-latest-darwin.zip). Décompresse le dossier
   `platform-tools` et mets-y `StarWarsTV.apk`.
3. Ouvre ce dossier dans un terminal (Windows : tape `cmd` dans la barre d'adresse de l'Explorateur, puis Entrée ;
   Mac : clic droit sur le dossier → Nouveau terminal au dossier), puis, avec l'adresse IP de ta télé (Paramètres →
   Réseau) :
   ```
   adb connect 192.168.1.42:5555
   adb install -r StarWarsTV.apk
   ```
   Sur Mac, écris `./adb` au lieu de `adb`. Accepte la fenêtre sur la télé (Toujours autoriser → OK).

## Étape 3 : ouvre Star Wars TV

1. Ouvre **Star Wars TV** dans la liste des applis de la télé.
2. Les **Réglages** s'ouvrent tout seuls la première fois : choisis ton **côté de la Force**, puis **Applis et films**
   pour choisir tes six applis.
3. Pour en faire l'écran d'accueil : **Touche Home → Star Wars TV**, puis confirme dans la fenêtre de la télé.

| Touche | Ce qu'elle fait |
|---|---|
| ← → | Choisir une appli, un sabre, un palet, un lieu |
| OK | Ouvrir |
| ↓ / ↑ | Changer de salle : accueil, sabres, Mandalorien, passerelle de Vador |
| ↑ sur l'accueil | Les Réglages (en haut à droite) |
| Menu | Les Réglages, de partout |
| Retour maintenu 6 s | L'issue de secours (reprendre, recharger, réglages de la télé) |

## Revenir comme avant

- **Réglages → Touche Home → Accueil d'origine** : la touche Home ramène à l'accueil d'avant.
- **Paramètres → Applis → Star Wars TV → Désinstaller** : il ne reste rien.

Après l'installation, tu peux désactiver le débogage USB : Star Wars TV n'en a pas besoin.
