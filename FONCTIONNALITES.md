# Fonctionnalités - Match Manager EPS (version 2.3)

Catalogue de ce que l'application fait aujourd'hui. Pour l'historique : [CHANGELOG.md](CHANGELOG.md). Pour l'architecture et les conventions de code : [CLAUDE.md](CLAUDE.md).

Contexte : tablettes Android (Lenovo TB-X606F, WebView figé) et iPad, 100 % hors ligne, données élèves uniquement sur l'appareil.

---

## 1. Tournois

| Mode | Principe |
|---|---|
| 1 - Poules de niveau | Poules indépendantes, un classement par poule, classement général croisé si plusieurs poules. |
| 2 - Poules + finales | Phase de poules, puis finales croisées (les 1ers entre eux, les 2èmes entre eux...). Chaque poule envoie ses `qualifiés`. |
| 3 - Tableau à élimination | Têtes de série selon le niveau, exemptions (byes), petite finale, consolantes en round-robin pour les perdants de chaque tour, tableau visuel. |

Création : nom, classe, nombre de tables ou terrains, format de match, durée de chronomètre global optionnelle.

## 2. Format de match

- **Au score** (raquette, filet : tennis de table, badminton, volley...) : 1 ou 2 manches gagnantes, 11 / 15 / 21 / 25 points par manche. La 3ᵉ manche n'apparaît qu'à 1-1. Pas de match nul.
- **Au temps** (sports collectifs) : 1 à 4 périodes de durée réglable, chronomètre par match, sonnerie, match nul autorisé hors tableau.

## 3. Joueurs

- Saisie un par un, par liste collée, ou import `.csv` / `.txt` (`NOM;Niveau`, séparateurs `;` `,` tabulation).
- Noms toujours en majuscules, niveau de 0 à 5.
- Listes sauvegardées et rechargées d'un tournoi à l'autre.
- **Pendant le tournoi** (bouton « Joueurs ») :
  - retirer un joueur : *absent* (matchs annulés, sorti de la poule) ou *forfait* (matchs joués conservés, en bas de classement) ;
  - ajouter un joueur à une poule avant les finales ;
  - en tableau : forfait = l'adversaire est qualifié, ajout possible tant qu'aucun match n'est joué.

## 4. Poules

- Nombre de poules et taille de chacune (la somme doit couvrir tous les joueurs).
- Tables attribuées par poule.
- Répartition : par niveau (poules homogènes en mode 1, serpentin en mode 2), aléatoire, ou manuelle (toucher un joueur puis la poule).

## 5. Matchs

- Rondes générées automatiquement (round-robin), numéro de match et table.
- Statuts : en attente, en cours (toucher la carte), terminé.
- Saisie des scores avec **brouillons conservés** (un choix d'arbitre ou un changement de carte n'efface rien).
- Arbitres : liste filtrée (ni les joueurs du match, ni ceux en cours de jeu, ni les arbitres déjà affectés, ni les joueurs retirés), bonus arbitre réglable.
- **File d'attente** : carte au-dessus des matchs (poules, finales, tableau) avec tables libres / occupées, prochain match libre (joueurs ni en jeu ni arbitres, priorité à ceux qui ont le moins joué), table et arbitre suggérés, « Lancer ce match ».
- **Mode tablette élève** (📱) : un match en grand, boutons + et -, confirmation, match suivant. Le score en tête passe en vert, léger rebond à chaque point.
- **Annuler** (↩) : retour à l'état exact d'avant la dernière action, 8 niveaux par tournoi.
- **Mise à jour ciblée** : un changement sur un match ne remplace que les cartes dont l'affichage change (le défilement est conservé) ; le tableau n'est reconstruit en entier que lorsqu'un tour ou une consolante est généré.
- **Modifier** un résultat : si des finales ou des tours suivants en dépendent, ils sont supprimés après confirmation puis recalculés.

## 6. Classements

- Points : victoire (3 par défaut), défaite en manche décisive (2), défaite (1), match nul (1), bonus arbitre : tous réglables.
- Tri : points, puis **confrontation directe** (réglable, nouveaux tournois), puis différence de points, puis points marqués. Les forfaits sont classés en dernier.
- Mode 2 : classement par groupe de finale (rang déterminé par les victoires en finale), puis bloc **« Hors finales »** pour les non-qualifiés.
- Mode 3 : vainqueur, finaliste, 3ᵉ et 4ᵉ (petite finale), consolantes, autres joueurs.
- **Médailles** 🥇🥈🥉 et ligne teintée pour le top 3 de chaque classement, seulement une fois un match joué.
- **Podium** : tournoi terminé (poules de niveau : tous les matchs joués ; poules + finales : finales jouées ; tableau : finale et consolantes jouées).
- L'écran Classements ne recalcule ni le classement ni le QR code tant que rien n'a changé.
- **Palmarès par classe** (accueil) : voir § 7.

## 7. Export et partage

- **Palmarès par classe** (accueil) : cumul des tournois d'une classe par joueur (nom), tri points / % victoires / podiums, tournois décochables, impression / PDF. Pas d'export XLSX du palmarès.
- **XLSX** (fichier Excel fait main, sans dépendance) : onglet « Matchs » (poules, finales, tableau, arbitre, bonus ; en 2 manches gagnantes : manches gagnées, détail des 3 sets et total de points par joueur) et onglet « Classement final ». Nom : `MatchManagerEPS_Classe_Date.xlsx`.
- **Impression / PDF** : A4 noir et blanc (classements, arbre du tableau en paysage, matchs et scores), au choix. APK : gestionnaire d'impression Android ; navigateur : `print()`.
- **QR code des résultats** (préfixe `TENEPS|`, lu par l'app SCAN EPS) : coupé par ligne entière au-delà de 2000 caractères, avec `...+N obs`.
- **Sauvegarde / transfert JSON** : un tournoi ou tous, en fichier ou par copier/coller, import avec contrôle des identifiants et des textes (id déjà présent : import en copie). Pas de transfert par QR : un tournoi dépasse la capacité d'un QR.
- Le fichier enregistré passe par `AndroidDownload` dans l'APK (Téléchargements), par un téléchargement classique dans le navigateur.

## 8. Écrans et réglages

- Accueil : liste des tournois (progression, « Reprendre » / « Voir le podium », liseré vert si terminé), palmarès par classe, sauvegarde / transfert, version affichée, pied de page outils-eps.fr.
- Fin de tournoi : fenêtre « Tournoi terminé ! » avec podium (une fois par podium), carte Podium en haut des Classements, médailles 🥇🥈🥉 dans les classements.
- Sons (Paramètres, désactivé par défaut) : ding à la validation d'un match, mélodie en fin de tournoi.
- Avatars : pastille à l'initiale, couleur de la poule du joueur, dans les cartes de match. Fondu de 150 ms entre écrans.
- **Paramètres** (libre) : mode clair / sombre, sons, accès à la configuration avancée, aide.
- **Style** : charte des apps EPS (voir [DESIGN-SYSTEM-EPS.md](../DESIGN-SYSTEM-EPS.md)) : boutons en pilule en majuscules, liseré de 5 px et puce colorée sur les encadrés, stepper +/- de 44 px, police système. Palette bleu marine et or conservée, thème nativement sombre.
- **Configuration avancée** (mot de passe professeur) : format par défaut, points, départage, bonus arbitre, mot de passe personnalisé, suppression de toutes les données.
- Aide intégrée à jour des fonctions ci-dessus.

## 9. Robustesse et sécurité

- Sauvegarde automatique : à chaque saisie, à la fermeture, au passage en arrière-plan, toutes les 15 secondes.
- Données illisibles : copie brute conservée et avertissement, pas d'écrasement silencieux.
- Mémoire pleine : avertissement unique, la saisie n'est pas bloquée.
- Écran maintenu allumé (Wake Lock + `FLAG_KEEP_SCREEN_ON` dans l'APK), plein écran / mode immersif.
- Rotation libre sans perte d'état.
- Toute donnée affichée est échappée (`escH`), y compris dans les attributs `onclick` générés (`escH(escJs(x))` : le backslash est échappé avant l'apostrophe).
- Aucune boîte native (`confirm`, `alert`, `prompt`) : boîtes de dialogue de l'application, boutons de 44 px, fermées par Retour Android.
- Mot de passe professeur : empreinte SHA-256 salée, jamais en clair. Barrière contre la curiosité des élèves, pas une protection cryptographique.
- APK : `allowBackup="false"`, navigation limitée aux fichiers locaux, nom de fichier assaini côté Java, bouton Retour sans sortie accidentelle.

## 10. Hors périmètre actuel

- Transfert de tournoi par QR code (capacité insuffisante).
- Scan de QR par la caméra dans l'app (c'est le rôle de SCAN EPS).
- Export XLSX du palmarès par classe (impression / PDF seulement).
- Planning figé des matchs et des arbitres : la file d'attente suggère le prochain match, elle ne planifie pas à l'avance.
- Palmarès par identifiant de joueur : les joueurs sont rapprochés par nom (deux homonymes d'une même classe seraient fusionnés).

Les idées retenues sont suivies hors dépôt.
