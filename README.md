# Match Manager EPS

Application PWA de gestion de tournois de Tennis de Table pour les cours d'EPS (collège & lycée).

100% hors ligne, fichier HTML unique, pensée pour tablettes Android et iPad utilisées en gymnase sans connexion internet.

## Fonctionnalités

- 3 modes de tournoi : poules de niveau, poules + tableau final, bracket élimination directe
- Gestion des joueurs (saisie manuelle, import CSV, listes sauvegardées, niveaux 0-5)
- Formats de match configurables (1 set à 11/21 pts, 2 sets gagnants sur 3)
- Classements automatiques (points, différence, points marqués)
- Export des résultats en QR code (scannable par l'app [SCAN EPS](https://msjeps.github.io/scaneps/)) et en fichier XLSX
- Sauvegarde automatique continue (localStorage), résiste aux rotations d'écran et sorties d'app

## Déploiement

Le fichier suivi par git est `index.html` (voir [CLAUDE.md](CLAUDE.md) pour le détail de l'architecture et des conventions du projet). Le fichier de développement local est `MatchManagerEPS.html` — penser à recopier son contenu vers `index.html` avant chaque commit.

Démo en ligne : https://apps.outils-eps.fr/TEN-EPS/ (URL technique inchangée pour l'instant — à reconfigurer côté hébergeur si besoin, voir TODO.md)
