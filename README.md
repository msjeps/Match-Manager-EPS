# Match Manager EPS

Application PWA de gestion de tournois pour les cours d'EPS (collège & lycée) : sports de raquette/filet au score (tennis de table, badminton, volley...) ou sports collectifs au temps.

100% hors ligne, fichier HTML unique, pensée pour tablettes Android et iPad utilisées en gymnase sans connexion internet.

## Fonctionnalités

- 3 modes de tournoi : poules de niveau, poules + finales, tableau à élimination (têtes de série, petite finale, consolantes)
- Gestion des joueurs : saisie manuelle, liste, import CSV, listes sauvegardées, niveaux 0-5
- Formats de match configurables : au score (1 ou 2 manches gagnantes, 11/15/21/25 points) ou au temps (périodes chronométrées, match nul autorisé)
- Classements automatiques avec départage par confrontation directe
- Absents, forfaits et joueurs ajoutés en cours de tournoi
- Mode tablette élève (un match, gros boutons) et bouton Annuler à plusieurs niveaux
- Export XLSX, QR code des résultats (lisible par [SCAN EPS](https://msjeps.github.io/scaneps/)), sauvegarde et transfert de tournoi en JSON
- Sauvegarde automatique continue (localStorage), résiste aux rotations d'écran et sorties d'app, 100 % hors ligne

Tests : `npm test` (Node 20 ou plus, aucune dépendance), voir [tests/README.md](tests/README.md).

Version actuelle : **1.9.1**. Détail : [FONCTIONNALITES.md](FONCTIONNALITES.md).

## Documentation du projet

| Fichier | Contenu |
|---|---|
| [FONCTIONNALITES.md](FONCTIONNALITES.md) | Catalogue des fonctions de l'application |
| [CHANGELOG.md](CHANGELOG.md) | Historique des versions (ajouts, corrections, modifications) |
| [TODO.md](TODO.md) | Tâches ouvertes, validations à faire sur tablette, rappels avant commit |
| [MEMORY.md](MEMORY.md) | Journal des décisions et de leur raison |
| [CLAUDE.md](CLAUDE.md) | Architecture, structure de données, conventions de code |
| [android/README.md](android/README.md) | Wrapper APK : contenu, build, signature |

## Déploiement

Le fichier suivi par git est `index.html` (voir [CLAUDE.md](CLAUDE.md) pour le détail de l'architecture et des conventions du projet). Le fichier de développement local est `MatchManagerEPS.html` - penser à recopier son contenu vers `index.html` avant chaque commit.

Démo en ligne : https://apps.outils-eps.fr/Match-Manager-EPS/

L'APK Android (sources dans `android/`) embarque une copie de `index.html` : voir TODO.md pour la resynchronisation et le build.
