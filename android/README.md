# Match Manager EPS - wrapper Android (APK)

WebView plein écran qui charge l'application web depuis `app/src/main/assets/index.html`. Aucun accès réseau. Le contenu fonctionnel est décrit dans [../FONCTIONNALITES.md](../FONCTIONNALITES.md), l'historique dans [../CHANGELOG.md](../CHANGELOG.md).

## Identité

- Package : `com.teneps.app` (hérité de l'ancien nom, ne pas changer : le renommer imposerait de désinstaller l'app sur toutes les tablettes).
- `versionName` doit être égal à `APP_VERSION` dans `index.html` ; `versionCode` s'incrémente à chaque APK distribuée.
- `minSdk 24`, `targetSdk 34`.

## Contenu versionné

| Fichier | Rôle |
|---|---|
| `app/src/main/assets/index.html` | **Généré** (non versionné) : copie de `../index.html` faite par la tâche Gradle `syncWebApp` à chaque build |
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

Avant de construire : `npm test` à la racine du projet (vérifie aussi que `versionName` égale `APP_VERSION` et que les assets sont identiques à `index.html`).

```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
./gradlew assembleDebug --offline
cp app/build/outputs/apk/debug/app-debug.apk ../MatchManagerEPS.apk
```

Contrôles rapides :

```bash
AAPT=$(ls -d ~/Library/Android/sdk/build-tools/*/aapt2 | tail -1)
"$AAPT" dump badging app/build/outputs/apk/debug/app-debug.apk | grep package:
unzip -p app/build/outputs/apk/debug/app-debug.apk assets/index.html | grep -c "APP_VERSION='2.3'"
```

## Signature

Depuis le 2026-10-11, l'APK diffusée est signée avec une **clé de release** (fichier `.jks` hors dépôt, alias `matchmanager`, copies de sécurité hors dépôt). `android/keystore.properties` (non versionné) en donne le chemin et les mots de passe ; `build.gradle` signe le build `release` avec. Les APK signées avec l'ancienne clé debug doivent être **désinstallées** avant d'installer celle-ci. Ne jamais versionner la clé.

Empreinte SHA-256 du certificat (à comparer avec `apksigner verify --print-certs`) : `0c5ec62a9549faa23aaa2c186191d1cc744da7394ec3566abf87822e7f799309`. Dernière APK diffusée : **2.3** (`versionCode 16`), reconstruite et publiée le 2026-10-24 (SHA-256 du fichier `110b80b9185167c4a41c8ac03335a029554f993ed1033217d62bebfa2daef658`).

Build de diffusion :
```bash
./gradlew assembleRelease --offline -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease
cp app/build/outputs/apk/release/app-release.apk ../MatchManagerEPS.apk
```
(les `-x lintVital...` ne servent que hors ligne, le lint n'étant pas en cache)

## Publication (Release GitHub)

L'APK n'est jamais versionnée (`*.apk` dans `.gitignore`) : elle est hébergée par une Release du dépôt public `msjeps/Match-Manager-EPS`. Lien stable, utilisé dans l'aide intégrée et le guide PDF : `https://github.com/msjeps/Match-Manager-EPS/releases/latest/download/MatchManagerEPS.apk`. **Garder le nom de fichier `MatchManagerEPS.apk`** d'une version à l'autre, sinon le lien « latest » casse.

Procédure :
1. `npm test`, puis `assembleRelease` (voir ci-dessus).
2. Contrôler l'APK : `apksigner verify --print-certs` (SHA-256 `0c5ec6...`), `aapt2 dump badging` (`versionCode` incrémenté, `versionName` = `APP_VERSION`), et comparer son `assets/index.html` à celui du dépôt (`unzip -p app-release.apk assets/index.html | cmp - ../index.html`).
3. Copier l'APK sous le nom `MatchManagerEPS.apk` dans le dossier de travail, en gardant une copie de l'ancienne.
4. Après confirmation (dépôt public) : `git push`, puis `gh release create vX.Y MatchManagerEPS.apk --repo msjeps/Match-Manager-EPS --target main --latest --title "Match Manager EPS X.Y" --notes "..."`.
5. Vérifier le lien « latest » : `curl -sIL <lien> | grep -i content-length` doit donner la taille de l'APK.

Releases publiées : `v2.2` (versionCode 15, correctifs de sécurité du 2026-10-24) et `v2.3` (versionCode 16, lien de téléchargement dans l'aide et le PDF).

## À valider sur la tablette avant diffusion

Écran qui ne s'éteint pas, barres système masquées, bouton Retour (ferme aussi les boîtes de dialogue), enregistrement du XLSX et du JSON dans Téléchargements, sélecteur de fichier (CSV de joueurs, sauvegarde JSON), impression / PDF des classements et du tableau (fenêtre d'impression Android, « Enregistrer au format PDF »).
