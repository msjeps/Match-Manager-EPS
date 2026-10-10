# Journal des modifications - Match Manager EPS

Une entrée par version affichée à l'utilisatrice (`APP_VERSION`). Les correctifs internes invisibles sont rattachés à la version en cours. Le détail des décisions et de leur raison est dans [MEMORY.md](MEMORY.md), les tâches ouvertes dans [TODO.md](TODO.md), le catalogue complet des fonctions dans [FONCTIONNALITES.md](FONCTIONNALITES.md).

Repères techniques par version : `versionCode` Android (APK) et `CACHE_NAME` du service worker (`sw.js`).

---

## 1.7 - 2026-10-11 (APK versionCode 8, cache v24)

### Ajouts
- **Export XLSX, 2 manches gagnantes** : l'onglet « Matchs » contient, en plus des manches gagnées (colonnes « Manches J1 / J2 »), le score de chaque set (Set 1 à Set 3, J1 et J2) et le **total de points** de chaque joueur sur le match. Colonnes numériques, vides pour un match non joué, un forfait ou un set 3 non disputé. Les autres formats d'export sont inchangés.

---

## 1.6 - 2026-10-10 (APK versionCode 7, cache v23)

### Ajouts
- **File d'attente des matchs** (écrans poules, finales, tableau) : tables libres / occupées, prochain match libre (aucun joueur en jeu ni en train d'arbitrer, priorité à ceux qui ont le moins joué), table et arbitre suggérés, bouton « Lancer ce match ».
- **Impression / PDF** : bouton « Imprimer / PDF » (barre d'outils et écran Classements). Feuille A4 noir et blanc : classements, arbre du tableau (paysage), liste des matchs et scores. Dans l'APK, passage par le gestionnaire d'impression Android (`AndroidPrint`) ; dans le navigateur, `print()` d'un iframe caché.

---

## 1.5 - 2026-10-10 (APK versionCode 6, cache v21)

### Ajouts
- **Joueur absent / forfait / ajout tardif** : bouton « Joueurs » sur les écrans de matchs.
  - Absent : retiré de la poule, tous ses matchs sont annulés.
  - Forfait : ses matchs joués restent comptés, les autres sont annulés, il est classé en bas de poule (badge « Forfait »). En tableau, l'adversaire est qualifié.
  - Ajout tardif dans une poule (avant les finales) : matchs créés contre tous les membres ; en tableau, régénération si aucun match n'est joué.
- **Sauvegarde et transfert de tournoi** (écran d'accueil) : export JSON en fichier ou par copier/coller, import avec contrôle des données.
- **Départage par confrontation directe** : points, puis résultat entre les joueurs à égalité, puis différence, puis points marqués. Réglable en configuration avancée (nouveaux tournois).
- **Mode tablette élève** : bouton sur chaque match, écran avec gros boutons + et -, confirmation avant validation, passage au match suivant, chronomètre intégré en match au temps.
- **Annuler** : restauration exacte de l'état d'avant la dernière action (résultat, modification, joueur retiré ou ajouté, passage aux finales), sur 8 niveaux par tournoi, conservés après fermeture.

### APK
- Sélecteur de fichier dans le WebView (`onShowFileChooser`) : l'import CSV de joueurs ne fonctionnait pas du tout dans l'APK avant cette version.

---

## 1.4 - 2026-10-10 (APK versionCode 5, cache v20)

### Modifications
- Répartition « Par niveau » réellement en serpentin en mode 2 (poules + finales) ; en mode 1 elle reste séquentielle (poules de niveau, les meilleurs ensemble).
- Aide : export XLSX (et non CSV), séparateurs d'import précisés.
- Import de joueurs limité à `.csv` et `.txt` (les `.xls` et `.xlsx` étaient acceptés mais illisibles).

### Documentation
- README, CLAUDE.md et TODO.md alignés sur le code (clé `'time'`, points par défaut 3 / 2 / 1, QR coupé par ligne).

---

## 1.3 - 2026-10-10 (APK versionCode 4, cache v16 à v19)

### Corrections
- **Scores perdus** : un score ou un bonus arbitre tapé mais non validé était effacé quand on choisissait un arbitre ou touchait une autre carte. Les saisies sont maintenant conservées (brouillons persistés).
- **Joueurs oubliés** : la création des poules est refusée si les tailles ne couvrent pas exactement tous les joueurs.
- **Données illisibles** : copie brute conservée avant tout écrasement, message d'alerte avec bouton d'enregistrement ; `save()` ne lève plus d'exception quand la mémoire est pleine.
- **Finales (mode 2)** : chaque poule n'envoie que son nombre de qualifiés.
- **Classement général (mode 2)** : les joueurs non qualifiés gardent un rang (bloc « Hors finales »), y compris dans l'export.
- **Rouvrir un résultat** : les finales ou les tours suivants qui en dépendent sont supprimés (confirmation si des matchs joués sont touchés) et recalculés.
- **Export XLSX** : l'onglet « Matchs » contient poules, finales, tours du tableau, petite finale et consolantes (colonne « Poule / Phase »).
- **Nom du fichier d'export** : `MatchManagerEPS_Classe_Date.xlsx` (sans accents, repli sur le nom du tournoi).

### Charte flotte (APK et sécurité)
- Mot de passe professeur stocké et comparé par empreinte SHA-256 salée (plus de mot de passe en clair dans le code ni dans l'interface ; migration automatique des anciens mots de passe personnalisés).
- `allowBackup="false"`.
- Bouton Retour Android : ferme la fenêtre ouverte, sinon retour à l'accueil, quitte au deuxième appui rapproché.
- Écran toujours allumé (`FLAG_KEEP_SCREEN_ON`) et mode immersif persistant.

---

## 1.1 et 1.2 - 2026-08-02 à 2026-10-08 (APK versionCode 3 pour la 1.2)

Ces deux versions sont regroupées : l'historique git ne permet pas de les séparer proprement.

### Ajouts
- **Renommage** TEN EPS vers Match Manager EPS (titre, manifest, icônes, pied de page avec logo outils-eps.fr). Le préfixe QR `TENEPS|` et la clé `teneps_data` sont conservés pour la compatibilité avec SCAN EPS et les données déjà enregistrées.
- **Format de match généralisé** : « au score » (1 ou 2 manches gagnantes, 11 / 15 / 21 / 25 points) ou « au temps » (périodes chronométrées, match nul autorisé hors tableau, points de match nul). Migration automatique des anciens tournois.
- **Chronomètre par match** (format au temps) : démarrer, pause, période suivante, sonnerie, survit à la veille et au rechargement, plusieurs terrains en parallèle.
- **QR code et export XLSX** directement sur l'écran Classements.
- **Mode clair** (l'app est nativement en thème sombre), avec contrastes corrigés.
- **Écran Paramètres** non protégé (affichage, accès professeur, aide) et **configuration avancée** protégée par mot de passe, personnalisable et réinitialisable.
- **Numéro de version** affiché sous le titre.
- **Export XLSX dans l'APK** via l'interface `AndroidDownload` (MediaStore sur Android 10+) ; QR coupé par ligne (`...+N obs`).
- **Guide professeur** en PDF.

### Corrections
- **Faille XSS stockée** : noms de joueurs, de tournoi, de classe et de listes échappés dans toutes les vues (`escH`).
- **Rendu sur anciens GPU** : dégradé combiné au `border-radius` remplacé par des couleurs unies.
- Manifest en orientation libre, plein écran au premier tap, Wake Lock acquis pour toute la session.
- Colonne « Nul » conditionnelle et colonne « Def.3sets » absente de l'export quand il n'y a aucun match en 3 sets.

---

## 1.0 - 2026-03 (nom d'origine : TEN EPS)

- Version initiale : gestion de tournois de tennis de table en trois modes (poules de niveau, poules + finales, tableau à élimination avec têtes de série, petite finale et consolantes).
- Saisie des joueurs (un par un, liste, import CSV), niveaux de 0 à 5, listes sauvegardées.
- Répartition en poules par niveau, aléatoire ou manuelle, tables par poule, arbitres avec bonus.
- Classements, export des résultats, QR code compatible SCAN EPS.
- PWA hors ligne (service worker, localStorage), sauvegarde automatique.
