# TODO — Match Manager EPS

## À faire

- **Guide professeur avec le mot de passe `ADMINPROF` à rédiger et mettre en ligne** sur la page de l'application du site `outils-eps.fr` : la modale "Accès professeur" y renvoie déjà ("Vous trouverez le mot de passe dans le guide professeur, sur la page de l'application du site outils-eps.fr"), mais ce guide n'existe pas encore — sans lui, personne ne peut retrouver `ADMINPROF`. Rédaction + mise en ligne WordPress hors de portée d'un agent Claude Code, à faire par Nathalie.
- **URL de déploiement** `apps.outils-eps.fr/TEN-EPS/` : le dépôt GitHub a été renommé (`msjeps/TEN-EPS` → `msjeps/Match-Manager-EPS`), mais cette URL technique (hébergement/proxy côté outils-eps.fr) doit être reconfigurée manuellement par Nathalie — hors de portée d'un agent Claude Code.
- **Bouton "Version APK" sur `outils-eps.fr/ten-eps/`** : pointe toujours vers l'ancien fichier `https://outils-eps.fr/wp-content/uploads/apk/ten-eps.apk` (build obsolète, antérieure au renommage et à la Partie B chronomètre). Laissé tel quel pour l'instant (décision Nathalie, 2026-08-02) — à mettre à jour quand une APK à jour sera buildée et uploadée sur WordPress.
- **Réinitialisation mot de passe admin non revalidée sur tablette** : le clic réel sur la boîte de confirmation (`confirm()`) du bouton "Réinitialiser au mot de passe par défaut" n'a pu être testé que dans un navigateur automatisé (dialogues natifs désactivés) — à revalider sur une vraie tablette avant de diffuser aux élèves.
- **`.btn-primary` (`linear-gradient`+`border-radius`)** : même piège que celui déjà rencontré sur LaserFit (rendu invisible sur PowerVR GE8320) — à tester sur la tablette la plus lente de la flotte avant toute livraison.
- **`manifest.json` verrouille l'orientation en portrait** (`"orientation":"portrait"`) alors que le CLAUDE.md racine et celui du projet exigent une orientation libre (portrait + paysage) — à changer en `"any"`.
- **Aucun `requestFullscreen()`** dans l'app, alors que le CLAUDE.md racine l'impose pour toute PWA (masquer barre de statut/navigation).
- **Wake Lock incomplet** : n'est acquis que pendant un chrono de match actif (format "au temps") — en format "au score" (usage majoritaire tennis de table), l'écran peut se mettre en veille pendant la saisie.
- **Pas de numéro de version affiché** sous le titre (convention `DESIGN-SYSTEM-EPS.md`).
- **Pied de page incomplet** : juste le texte "Nathalie Prenois", sans logo outils-eps.fr ni lien non cliquable (pattern `.pied-page` du design system).
- **Pas de mode sombre** (`mode-sombre` / `prefers-color-scheme`).
- **Documentation obsolète** : le `CLAUDE.md` du projet décrit encore un export CSV (`;`, BOM) alors que le code génère un vrai XLSX (générateur ZIP/OOXML fait main) — à mettre à jour ou à clarifier.
- **Nom de l'app resté "Tennis de Table"** (titre, `manifest.json`) alors que le format de match a été généralisé à d'autres sports (badminton, volley, temps...) — risque de confusion avec VB EPS.

## Rappel avant chaque commit

- [ ] Recopier le contenu de `MatchManagerEPS.html` (fichier de dev) vers `index.html` (fichier suivi par git) — les deux ne se synchronisent pas automatiquement.
- [ ] Bumper `CACHE_NAME` dans `sw.js` si le HTML a changé, sinon les tablettes gardent la version en cache.

## Fait récemment

- [x] Audit sécurité/qualité complet + correction d'une faille XSS stockée (noms joueur/tournoi/classe/liste sauvegardée non échappés dans une quinzaine de rendus HTML, nouveau helper `escH()`) et ajout d'un accès réglages protégé par mot de passe (`ADMINPROF` par défaut, personnalisable, réinitialisable après 3 échecs — même pattern que Biathlon VMA). Détails dans `MEMORY.md`. Commit `12520e8` (2026-08-02)
- [x] Logos mis à jour sur outils-eps.fr (site WordPress, distinct de ce dépôt) : nouveau logo carré sur la carte "Matchs par poules ou tournoi" de la page d'accueil et dans le contenu de l'article `outils-eps.fr/ten-eps/`, bannière 1200×630 définie comme image mise en avant de l'article (utilisée en `og:image` pour le partage réseaux sociaux) (2026-08-02)
- [x] Nouveaux logos intégrés : `icon_192.png`/`icon_512.png` remplacés par les visuels fournis par Nathalie dans `nouveaux logos/` (2026-08-02)
- [x] Renommage complet "TEN EPS" → "Match Manager EPS" : titre/logo/footer/aide (`index.html`), `manifest.json`, `sw.js` (+ correction du bug préexistant où `ASSETS`/fallback référençaient encore `./TEN_EPS.html` au lieu de `./index.html`, et bump `CACHE_NAME`), `CLAUDE.md`/`README.md`/`TODO.md`/`MEMORY.md`, entrée dans le `CLAUDE.md` racine de la flotte, ressources `android/` (label/strings.xml/settings.gradle), fichiers locaux `TEN_EPS.html`→`MatchManagerEPS.html` et `TEN_EPS.apk`→`MatchManagerEPS.apk`, dossier projet, et dépôt GitHub. Le préfixe QR `TENEPS|` et la clé localStorage `teneps_data` restent inchangés (compatibilité SCAN EPS + données déjà sauvegardées sur les tablettes) (2026-08-02)
- [x] Partie B : chronomètre actif par match pour le format "Match au temps" — `m.timer` (période/temps restant/running/endsAt en epoch ms pour survivre à une veille ou un rechargement), start/pause/période suivante, sonnerie (vibration + bip `AudioContext`) à expiration, Wake Lock tant qu'au moins un chrono tourne (réacquis sur `visibilitychange`), plusieurs matchs/terrains simultanés (un intervalle d'affichage par match, mise à jour ciblée du `<span>` du chrono sans jamais re-render toute la carte). Vérifié dans le navigateur : démarrage/pause, expiration de période avec bouton "Période suivante", fin du temps réglementaire (2/2), persistance correcte du temps restant après rechargement de page, pas de régression sur le format "Match au score" (2026-08-02)
- [x] Format de match généralisé : "Match au score" (manches gagnantes 1/2 × points 11/15/21/25) et "Match au temps" (périodes × durée, matchs nuls autorisés hors bracket, nouveau réglage "Points match nul") — migration automatique des anciens tournois (2026-08-02)
- [x] Classement (poules/finales/export XLSX) : colonne "Nul" conditionnelle, dédup de la logique de points (`statsFromMatches`), correction d'un bug où "Def.3sets" apparaissait dans l'export XLSX même sans aucun match en 3 sets (2026-08-02)
- [x] QR code des résultats + bouton export XLSX affichés directement sur l'écran Classements (2026-08-02)
- [x] Vérification que SCAN EPS scanne et récupère correctement les résultats TEN EPS, modes 1/2/3, y compris avec un match nul (2026-08-02)
- [x] Dépôt local lié à l'historique existant de github.com/msjeps/TEN-EPS (2026-08-02)
