# TODO — Match Manager EPS

## À faire

- **URL de déploiement** `apps.outils-eps.fr/TEN-EPS/` : le dépôt GitHub a été renommé (`msjeps/TEN-EPS` → `msjeps/Match-Manager-EPS`), mais cette URL technique (hébergement/proxy côté outils-eps.fr) doit être reconfigurée manuellement par Nathalie — hors de portée d'un agent Claude Code.
- **Bannière `nouveaux logos/Match Manager EPS-1200x630.png`** (1200×630, format réseaux sociaux/GitHub social preview) : générée mais pas encore utilisée nulle part — à intégrer si besoin (ex. réglage "Social preview" du dépôt GitHub, README).

## Rappel avant chaque commit

- [ ] Recopier le contenu de `MatchManagerEPS.html` (fichier de dev) vers `index.html` (fichier suivi par git) — les deux ne se synchronisent pas automatiquement.
- [ ] Bumper `CACHE_NAME` dans `sw.js` si le HTML a changé, sinon les tablettes gardent la version en cache.

## Fait récemment

- [x] Nouveaux logos intégrés : `icon_192.png`/`icon_512.png` remplacés par les visuels fournis par Nathalie dans `nouveaux logos/` (2026-08-02)
- [x] Renommage complet "TEN EPS" → "Match Manager EPS" : titre/logo/footer/aide (`index.html`), `manifest.json`, `sw.js` (+ correction du bug préexistant où `ASSETS`/fallback référençaient encore `./TEN_EPS.html` au lieu de `./index.html`, et bump `CACHE_NAME`), `CLAUDE.md`/`README.md`/`TODO.md`/`MEMORY.md`, entrée dans le `CLAUDE.md` racine de la flotte, ressources `android/` (label/strings.xml/settings.gradle), fichiers locaux `TEN_EPS.html`→`MatchManagerEPS.html` et `TEN_EPS.apk`→`MatchManagerEPS.apk`, dossier projet, et dépôt GitHub. Le préfixe QR `TENEPS|` et la clé localStorage `teneps_data` restent inchangés (compatibilité SCAN EPS + données déjà sauvegardées sur les tablettes) (2026-08-02)
- [x] Partie B : chronomètre actif par match pour le format "Match au temps" — `m.timer` (période/temps restant/running/endsAt en epoch ms pour survivre à une veille ou un rechargement), start/pause/période suivante, sonnerie (vibration + bip `AudioContext`) à expiration, Wake Lock tant qu'au moins un chrono tourne (réacquis sur `visibilitychange`), plusieurs matchs/terrains simultanés (un intervalle d'affichage par match, mise à jour ciblée du `<span>` du chrono sans jamais re-render toute la carte). Vérifié dans le navigateur : démarrage/pause, expiration de période avec bouton "Période suivante", fin du temps réglementaire (2/2), persistance correcte du temps restant après rechargement de page, pas de régression sur le format "Match au score" (2026-08-02)
- [x] Format de match généralisé : "Match au score" (manches gagnantes 1/2 × points 11/15/21/25) et "Match au temps" (périodes × durée, matchs nuls autorisés hors bracket, nouveau réglage "Points match nul") — migration automatique des anciens tournois (2026-08-02)
- [x] Classement (poules/finales/export XLSX) : colonne "Nul" conditionnelle, dédup de la logique de points (`statsFromMatches`), correction d'un bug où "Def.3sets" apparaissait dans l'export XLSX même sans aucun match en 3 sets (2026-08-02)
- [x] QR code des résultats + bouton export XLSX affichés directement sur l'écran Classements (2026-08-02)
- [x] Vérification que SCAN EPS scanne et récupère correctement les résultats TEN EPS, modes 1/2/3, y compris avec un match nul (2026-08-02)
- [x] Dépôt local lié à l'historique existant de github.com/msjeps/TEN-EPS (2026-08-02)
