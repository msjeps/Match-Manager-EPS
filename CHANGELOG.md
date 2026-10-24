# Journal des modifications - Match Manager EPS

Une entrée par version affichée à l'utilisatrice (`APP_VERSION`). Les correctifs internes invisibles sont rattachés à la version en cours. Le détail des décisions et de leur raison est dans [MEMORY.md](MEMORY.md), les tâches ouvertes dans [TODO.md](TODO.md), le catalogue complet des fonctions dans [FONCTIONNALITES.md](FONCTIONNALITES.md).

Repères techniques par version : `versionCode` Android (APK) et `CACHE_NAME` du service worker (`sw.js`).

---

## 2.2 - 2026-10-11 (APK versionCode 14, cache v31 à v33)

Troisième lot de l'audit d'interface (l'alignement sur la charte avait été fait en 2.0).

### Ajout
- **Sons optionnels** (Paramètres, carte « 🔊 Sons », désactivé par défaut, réglage local `mmeps_sound`) : un « ding » à deux notes à chaque résultat validé, une courte mélodie à la place à la fin du tournoi. La sonnerie du chronomètre reste indépendante et toujours active.

### Corrections
- **Résidu de la faille XSS stockée du 2026-08-02** (audit de sécurité du 2026-10-24) : `escH()` était bien appelé dans `showSaveListModal()` et `showPalmares()`, mais pour un nom de liste ou de classe réinjecté dans un attribut `onclick`, échapper l'apostrophe avant le HTML laissait passer un backslash déjà présent dans la donnée et terminait la chaîne JavaScript générée prématurément. Nouveau helper `escJs()` (backslash échappé avant l'apostrophe), appliqué `escH(escJs(x))` aux deux points de rendu, plus un test de régression (23 tests). `CACHE_NAME` → v32.
- **Injection de formule dans l'export XLSX** (piste de l'audit du 2026-10-24) : un nom de joueur ou d'arbitre commençant par `=`, `+`, `-` ou `@` (ou précédé d'un espace) est désormais écrit avec un style `quotePrefix` (l'équivalent de l'apostrophe d'Excel : texte forcé, y compris si la cellule est modifiée puis validée). La valeur reste inchangée, aucun caractère n'est ajouté. Le tiret seul (match non joué) n'est pas concerné. Test de régression (24 tests). `CACHE_NAME` → v33.

### Livraison
- APK 2.2 (`versionCode 14`) reconstruite et signée avec la clé de release (même clé que la 1.9.1). Dépôt poussé sur GitHub, version en ligne sur `apps.outils-eps.fr/Match-Manager-EPS/`.

---

## 2.1 - 2026-10-11 (APK versionCode 13, cache v30)

Deuxième lot de l'audit d'interface : les moments de plaisir.

### Ajouts
- **Podium de fin de tournoi** : à la validation du dernier match, une fenêtre « Tournoi terminé ! » affiche les 3 premiers sur trois marches (or, argent, bronze), avec « Voir les classements ». Affichée une seule fois par podium (`T.celebratedSig`) ; vibration courte. Le podium reste en carte en haut de l'écran Classements.
- **Accueil** : chaque tournoi montre sa progression (matchs joués / total, barre), un bouton « Reprendre » (ou « Voir le podium » si terminé) ; un tournoi terminé a un liseré vert et le badge « Terminé ».
- **Pastille d'avatar** (initiale sur la couleur de la poule du joueur) devant chaque nom dans les cartes de match. Sans poule (tableau) : couleur selon le rang d'inscription.
- **Fondu de 150 ms** entre écrans.
- Aide intégrée : paragraphe « Fin de tournoi ».

---

## 2.0 - 2026-10-11 (APK versionCode 12, cache v29)

Refonte visuelle : alignement sur la charte [DESIGN-SYSTEM-EPS.md](../DESIGN-SYSTEM-EPS.md) (style Biathlon VMA) et plus de plaisir d'usage. Palette bleu/or et logique de l'app inchangées. Le numéro passe au format `X.Y` de la charte.

### Style (charte flotte)
- **Boutons en pilule** (rayon 25 px, majuscules, ombre douce, retour de pression au toucher), police `Segoe UI / Tahoma / Geneva / Verdana`, chronos en `Courier New`, rayon des cartes 16 px.
- **Encadrés** : liseré gauche de 5 px et puce colorée avant les titres de section (tableau : puce bleue).
- **Stepper +/-** : boutons séparés de 44 px, rempli en or au toucher.

### Plaisir d'usage
- **Médailles 🥇🥈🥉** et ligne teintée pour le top 3 de chaque classement (poule, général, tableau, palmarès), seulement une fois un match joué.
- **Mode tablette élève** : le score en tête passe en vert (cadre vert), léger rebond à chaque point marqué.
- **Pictos par rôle** : 🏁 poules, 🔀 poules + tableau, 🎯 tableau, 📊 classements ; 🏆 reste pour le tournoi.

### Lisibilité et accessibilité
- **En-tête des tableaux de classement** : texte sombre sur or (le blanc faisait 1,7:1 de contraste).
- Texte secondaire éclairci (4,1:1 → 4,8:1), libellé « Choix du niveau » agrandi, ombre légère sous le nom des poules.
- **Zones tactiles à 44 px** : boutons de niveau, `.btn-sm`, « Valider », retour, onglets, badge de table, case bonus arbitre, interrupteurs, flèches de poule.

---

## 1.9.1 - 2026-10-11 (APK versionCode 11, cache v27)

### Changements internes (sans nouvelle fonction)
- **Tableau (mode 3)** : valider un résultat, démarrer un match, choisir un arbitre ou régler une table ne remplace plus que les cartes dont l'affichage change (signature `data-sig`), avec mise à jour de l'avancement du tour et de la file d'attente. Le rendu complet n'a lieu que si le tableau change de forme (tour suivant ou consolante générés). Les onglets et la position de défilement sont conservés.
- **Classements** : l'écran ne recalcule plus les classements et le QR code (le calcul le plus lourd) quand rien n'a changé depuis la dernière visite.
- Tests : 22 tests (3 de plus, empreintes `matchSig`, `rankingsSig`, `bracketShapeSig`).

---

## 1.9 - 2026-10-11 (APK versionCode 10, cache v26)

### Outils (sans effet sur l'application)
- **Tests Node** (`npm test`, dossier `tests/`) : 19 tests de la logique de calcul sans navigateur (22 depuis la 1.9.1), voir [tests/README.md](tests/README.md).

### Ajouts
- **Palmarès par classe** (écran d'accueil) : cumul des résultats de tous les tournois d'une même classe (écriture de la classe sans tenir compte de la casse ni des espaces). Par joueur (rapproché par nom) : tournois, victoires, défaites, % de victoires, différence de points, points de classement cumulés, premières places, podiums. Tri par points, % de victoires ou podiums ; tournois décochables (copies, essais) ; impression / PDF.
- Podium et première place : calculés sur le classement général d'un tournoi **terminé** (poules de niveau : tous les matchs joués ; poules + finales : finales jouées ; tableau : finale et consolantes jouées). Matchs par forfait non comptés.

---

## 1.8 - 2026-10-11 (APK versionCode 9, cache v25)

### Changements
- **Plus aucune boîte native** (`confirm()`, `alert()`, `prompt()`) : suppression de tournoi, de liste, de tous les joueurs, de toutes les données, réinitialisation du mot de passe, modification d'un résultat qui supprime les finales ou les tours suivants, saisie du n° de table. Boîtes aux couleurs de l'app, boutons de 44 px, Retour Android les ferme.
- **Mise à jour ciblée des matchs** : démarrer un match, choisir un arbitre, régler la table, valider un résultat ou lancer depuis la file d'attente ne remplace plus que la carte concernée (plus la liste entière), avec mise à jour des listes d'arbitres, de l'avancement et de la file d'attente. Le défilement n'est plus perdu et la tablette travaille moins. Le tableau (mode 3) restait recalculé en entier (ciblé depuis la 1.9.1).

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
