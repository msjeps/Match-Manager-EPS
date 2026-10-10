# Match Manager EPS - wrapper Android (APK)

WebView plein écran qui charge l'application web depuis `app/src/main/assets/index.html`. Aucun accès réseau. Le contenu fonctionnel est décrit dans [../FONCTIONNALITES.md](../FONCTIONNALITES.md), l'historique dans [../CHANGELOG.md](../CHANGELOG.md).

## Identité

- Package : `com.teneps.app` (hérité de l'ancien nom, ne pas changer : le renommer imposerait de désinstaller l'app sur toutes les tablettes).
- `versionName` doit être égal à `APP_VERSION` dans `index.html` ; `versionCode` s'incrémente à chaque APK distribuée.
- `minSdk 24`, `targetSdk 34`.

## Contenu versionné

| Fichier | Rôle |
|---|---|
| `app/src/main/assets/index.html` | **Copie** de `../index.html` : à resynchroniser avant chaque build |
| `app/src/main/assets/icon_192.png`, `logo-outils-eps.png` | Images référencées par la page |
| `app/src/main/java/com/teneps/app/MainActivity.java` | Activité unique : WebView, interfaces `AndroidDownload` et `AndroidPrint`, Retour, écran allumé, sélecteur de fichier |
| `app/src/main/AndroidManifest.xml` | `allowBackup="false"`, pas d'INTERNET, `WRITE_EXTERNAL_STORAGE` limité à l'API 28 |
| `app/build.gradle` | `versionCode`, `versionName` |

Exclus par `.gitignore` : `build/`, `.gradle/`, `local.properties`, clés de signature (`*.jks`, `*.keystore`, `keystore.properties`), `*.apk`.

## Ce que fait `MainActivity`

- `AndroidDownload.saveFile(base64, nom, mime)` : enregistre dans Téléchargements (MediaStore sur Android 10+, permission d'écriture sur 6 à 9). Le nom est assaini côté Java. Utilisé pour le XLSX et la sauvegarde JSON.
- `AndroidPrint.printHtml(html, titre, paysage)` : charge le HTML (généré par l'app, sans JavaScript) dans un WebView caché puis l'envoie au `PrintManager` (imprimante ou « Enregistrer au format PDF »).
- `onBackPressed` : délègue à `window.__androidBack()` dans la page (ferme la fenêtre ouverte, retour à l'accueil, quitte au deuxième appui sous 2 secondes).
- `FLAG_KEEP_SCREEN_ON` et mode immersif persistant.
- `onShowFileChooser` : nécessaire pour tout `<input type="file">` (import de joueurs et import d'une sauvegarde). Sans lui, le sélecteur ne s'ouvre pas dans un WebView.
- `shouldOverrideUrlLoading` : refuse tout ce qui n'est pas `file:///android_asset/`.

## Construire l'APK de test (signée en debug)

```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
cp ../index.html app/src/main/assets/index.html
./gradlew assembleDebug --offline
cp app/build/outputs/apk/debug/app-debug.apk ../MatchManagerEPS.apk
```

Contrôles rapides :

```bash
AAPT=$(ls -d ~/Library/Android/sdk/build-tools/*/aapt2 | tail -1)
"$AAPT" dump badging app/build/outputs/apk/debug/app-debug.apk | grep package:
unzip -p app/build/outputs/apk/debug/app-debug.apk assets/index.html | grep -c "APP_VERSION='1.7'"
```

## Signature

L'APK diffusée est signée avec la clé debug de la machine de build : une mise à jour par-dessus l'ancienne fonctionne depuis ce Mac. Passer à une clé de release imposerait de **désinstaller l'ancienne APK sur toutes les tablettes**. Décision en attente, voir [../TODO.md](../TODO.md). Une clé de release ne doit jamais être versionnée.

## À valider sur la tablette avant diffusion

Écran qui ne s'éteint pas, barres système masquées, bouton Retour, enregistrement du XLSX et du JSON dans Téléchargements, sélecteur de fichier (CSV de joueurs, sauvegarde JSON).
