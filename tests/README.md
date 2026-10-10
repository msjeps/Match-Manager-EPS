# Tests de la logique - Match Manager EPS

```bash
npm test            # ou : node --test tests/*.test.js
```

Node 20 ou plus, aucune dépendance. Les tests tournent sans navigateur, sans réseau, en moins d'une seconde.

## Principe

`harness.js` lit le `<script>` de `index.html` et l'exécute dans un contexte `vm` avec un DOM factice. Les fonctions de l'application (`calcPoolRanking`, `generateBracket`, `downloadCSV`, `buildBackup`...) sont donc testées **telles qu'elles sont livrées** : rien n'est recopié ni extrait dans un autre fichier. `T` et `state`, déclarés avec `let`, sont accessibles par `app.T` et `app.state`.

- `HTML=chemin node --test tests/*.test.js` : tester un autre fichier (par exemple une copie de travail).
- Le DOM factice absorbe tous les appels : un test ne vérifie pas le rendu.

## Ce qui est couvert

| Domaine | Vérifié |
|---|---|
| Round-robin | chaque paire une fois, pair / impair, pas deux matchs d'un joueur dans une ronde |
| Statistiques et classement | points, défaite au set décisif, nul, PF / PC, départage direct, forfait en dernier |
| Tableau (mode 3) | ordre des têtes de série, byes, progression jusqu'au vainqueur, classement complet |
| Export XLSX | ZIP valide (CRC), 2 onglets, détail des sets et totaux en 2 manches gagnantes, mode 2 |
| Sauvegarde / import | aller-retour, copie si identifiant présent, identifiants et textes dangereux refusés |
| Robustesse | `load()` sur données illisibles, annuler |
| Mot de passe | empreinte, pas de mot de passe par défaut en clair dans le code |
| Palmarès | classes sans casse, forfaits exclus, podium si tournoi terminé |
| Re-rendu ciblé | `matchSig`, `rankingsSig`, `bracketShapeSig` : stables sans changement, différentes après un résultat ou un tour généré |
| Livraison | `index.html` = assets APK, `versionName` Gradle = `APP_VERSION` |

## Ce qui n'est pas couvert

Rendu et interactions (écrans, boîtes de dialogue, chronomètre, mode tablette élève), impression, APK (Java). Ces points restent à vérifier dans le navigateur et sur la tablette.

## Écrire un test

Fabriquer un tournoi avec `tournament(app,{id,names,mode,settings,pools})`, jouer des matchs avec `play(match,score1,score2)`, assigner `app.T = t`, appeler la fonction de l'app et comparer avec `app.plain(...)` (les objets viennent d'un autre contexte `vm` : les convertir avant `deepEqual`). Pour vérifier qu'un test détecte bien une régression, modifier une copie d'`index.html` et lancer avec `HTML=copie`.
