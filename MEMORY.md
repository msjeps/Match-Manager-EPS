# MEMORY — Match Manager EPS (anciennement TEN EPS)

Journal de contexte et de décisions du projet, pour reprendre le travail sans perdre le fil d'une session à l'autre.

## Conventions du projet

- **Fichier de dev** : `MatchManagerEPS.html` (celui qu'on édite, testé dans le navigateur). **Fichier de déploiement** : `index.html` (celui suivi par git et servi par GitHub Pages). Les deux ne sont pas synchronisés automatiquement — copier le contenu avant chaque commit.
- **Dépôt distant** : github.com/msjeps/Match-Manager-EPS (renommé depuis msjeps/TEN-EPS le 2026-08-02, GitHub redirige l'ancienne URL), déployé sur https://apps.outils-eps.fr/TEN-EPS/ via GitHub Pages (branche `main`, racine `/`) — **URL technique pas encore reconfigurée**, voir `TODO.md`.
- **Fichiers suivis par git** : `index.html`, `icon_192.png`, `icon_512.png`, `manifest.json`, `sw.js`. Tout le reste (`CLAUDE.md`, `MatchManagerEPS.apk`, `android/`, `design_preview.html`, `.claude/`, `.DS_Store`) est dans `.gitignore` — dev-only, jamais poussé.
- **App compagnon** : [SCAN EPS](file:///Users/nathalieprenois/AndroidStudioProjects/SCAN%20EPS) scanne le QR code des résultats généré par Match Manager EPS (préfixe technique inchangé `TENEPS|`, comparaison de chaîne exacte côté SCAN EPS). Compatibilité vérifiée pour les modes 1/2/3 le 2026-08-02.

## Décisions & historique

### 2026-08-02 — Renommage exécuté : TEN EPS → Match Manager EPS
Suite à la généralisation du format de match (voir décision ci-dessous), l'app n'était plus spécifique au tennis de table — le nom "TEN EPS" ne correspondait plus à ce qu'elle fait. Nathalie a choisi **"Match Manager EPS"** ("Tournoi EPS" étant déjà pris par d'autres apps existantes).
**Fait** : titre/`<title>`/logo/footer/aide (`index.html`), `manifest.json` (`name`/`short_name`/`start_url`), `README.md`/`CLAUDE.md`/`TODO.md` (projet), entrée dans le `CLAUDE.md` racine de la flotte (tableau + section), ressources `android/` (label, `strings.xml`, `settings.gradle` — dossier gitignoré, jamais buildé/poussé), fichiers locaux `TEN_EPS.html` → `MatchManagerEPS.html` et `TEN_EPS.apk` → `MatchManagerEPS.apk`, dossier projet `TEN EPS` → `Match Manager EPS`, dépôt GitHub `msjeps/TEN-EPS` → `msjeps/Match-Manager-EPS` (+ remote `origin` local mis à jour). En profité pour corriger un bug préexistant signalé au TODO : `sw.js` (`ASSETS`/fallback) et `manifest.json` (`start_url`) référençaient encore `./TEN_EPS.html`, un fichier gitignoré donc absent du site déployé — pointent maintenant vers `./index.html`, le fichier réellement servi. `CACHE_NAME` bumpé en conséquence.
**Volontairement inchangé** : le préfixe technique du payload QR (`TENEPS|`, lu par SCAN EPS via comparaison de chaîne exacte) et la clé localStorage (`teneps_data`) — casser l'un ou l'autre romprait la compatibilité avec SCAN EPS ou perdrait les données déjà sauvegardées sur les tablettes.
**Reste à faire** (voir `TODO.md`) : nouveaux logos `icon_192.png`/`icon_512.png` (Nathalie les refait), reconfiguration côté hébergeur de l'URL `apps.outils-eps.fr/TEN-EPS/` (hors de portée d'un agent Claude Code).

### 2026-08-02 — Généralisation du format de match (score/temps)
L'app peut se généraliser à d'autres activités (badminton, volley, basket, foot, hand, rugby...), y compris par équipes. L'ancien réglage `T.settings.format` (`set11`/`set21`/`bo3`) pilotait la saisie du score, la validation ("pas de match nul" en dur) et le calcul du classement — pas qu'une étiquette.
**Solution retenue** : deux familles de format au choix par tournoi — `matchFamily:'score'` (manches gagnantes 1/2 × points par manche 11/15/21/25, remplace `winningSets`/`pointsPerSet` l'ancien `isBo3`) et `matchFamily:'time'` (nombre de périodes 2/3/4 × durée par période uniforme, matchs nuls autorisés avec un nouveau réglage `drawPts`). Migration automatique et non destructive des anciens tournois via `migrateSettings()` (appelée dans `load()`).
Le classement (`calcPoolRanking`/`renderOverallRanking` mode 2/`downloadCSV` mode 2) était dupliqué 3× avec une logique qui ne gérait aucune égalité — extrait dans un helper partagé `statsFromMatches()` qui ajoute la branche match nul. La phase bracket (mode 3) reste strictement sans match nul (garde-fou explicite dans `validateMatch`), car `resolveEntry`/`resolveLoser` ne gèrent aucune égalité pour l'avancement du tableau — ne jamais leur exposer un match nul.
Vérifié : migration d'anciens tournois, création d'un tournoi "au temps", match nul accepté en poule et rejeté en bracket, classement avec colonne "N" correcte, export XLSX sans erreur, QR payload inchangé et toujours compatible avec [SCAN EPS] (les nuls n'incrémentent ni `w` ni `l`, donc la forme du payload ne change pas).
Reste à faire (Partie B, voir `TODO.md`) : chronomètre actif par match pour le format "au temps" (start/pause par période, sonnerie, plusieurs matchs simultanés, Wake Lock — l'app n'a aujourd'hui aucune API Wake Lock, à créer de toutes pièces).

### 2026-08-02 — QR code et export visibles sur l'écran Classements
Avant, le QR code des résultats n'était accessible que via l'icône en haut à droite (menant à l'écran Export). Or dans toutes les autres apps EPS de la flotte, ce coin est réservé aux réglages/aide — donc masquer le QR derrière cette icône était incohérent avec les habitudes de l'utilisatrice.
**Solution retenue** : QR code + bouton "Télécharger XLSX" ajoutés directement sous le tableau de classement (`scr-rankings`), via une fonction partagée `renderQRCode(containerId)` réutilisée aussi par l'écran Export. L'icône du coin supérieur droit reste disponible pour l'export complet (résumé + XLSX), sans changement de comportement.
Validé sur les 3 modes de tournoi (poules, poules+finales, bracket) sans erreur console.

### 2026-08-02 — Mise en place du dépôt git local
Le dossier local n'était pas un dépôt git alors qu'un dépôt distant existait déjà (historique + fichiers de déploiement `index.html` etc.). Plutôt que de créer un nouvel historique (et risquer un force-push destructeur), le dépôt local a été rattaché à l'historique existant (`git fetch` + `checkout -b main origin/main`). Les icônes/manifest/sw.js locaux étaient déjà identiques à ceux du dépôt distant.
