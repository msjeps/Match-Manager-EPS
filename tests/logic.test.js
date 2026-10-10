// Tests de la logique de calcul de Match Manager EPS (sans navigateur).
// Lancer : node --test tests/      (ou : npm test)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, readStoredZip, sheetRows } = require('./harness');

// ----- fabrique de tournois de test -----
const SETTINGS = { tables: 4, matchFamily: 'score', winningSets: 1, pointsPerSet: 11, winPts: 3, loseSets3Pts: 2, losePts: 1, drawPts: 1, h2hTiebreak: false };
let seq = 0;
function tournament(app, { id, mode = 1, names, settings = {}, classe = '3eB', pools = null }) {
  const players = names.map((n, i) => ({ id: id + 'p' + i, name: n, level: names.length - i }));
  const t = {
    id, name: 'Test ' + id, classe, date: '2026-10-10', mode,
    settings: { ...SETTINGS, ...settings }, players, pools: [], matches: [], finals: [], bracket: null,
    phase: 'matches', poolSizes: [],
  };
  if (pools === 'none') return t;
  const groups = pools || [players.map(p => p.id)];
  groups.forEach((pids, gi) => {
    const pool = { id: id + 'pool' + gi, name: 'Poule ' + String.fromCharCode(65 + gi), playerIds: pids, quali: 2 };
    t.pools.push(pool);
    let n = 1;
    app.fn('generateRoundRobin')(pids).forEach(r => t.matches.push({
      id: pool.id + 'm' + n, poolId: pool.id, phase: 'pool', p1: r.p1, p2: r.p2, round: r.round,
      score1: null, score2: null, referee: '', refereeId: '', table: null, status: 'pending', matchNum: n++,
    }));
  });
  return t;
}
function play(m, s1, s2, extra = {}) {
  Object.assign(m, { status: 'done', score1: s1, score2: s2, totalPts1: s1, totalPts2: s2 }, extra);
}
// numéro du joueur (suffixe numérique de l'identifiant : r1p0 -> 0), plus petit = meilleur
const idx = id => +id.match(/(\d+)$/)[1];
const INDEX = process.env.HTML || path.join(__dirname, '..', 'index.html');

// ===================================================================
test('escH échappe les caractères HTML', () => {
  const app = createApp();
  assert.equal(app.fn('escH')('<b>"A"&B</b>'), '&lt;b&gt;&quot;A&quot;&amp;B&lt;/b&gt;');
  assert.equal(app.fn('escH')(null), '');
});

test('round-robin : chaque paire une seule fois, pair et impair', () => {
  const app = createApp();
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const list = Array.from({ length: n }, (_, i) => 'p' + i);
    const ms = app.plain(app.fn('generateRoundRobin')(list));
    assert.equal(ms.length, n * (n - 1) / 2, 'nombre de matchs pour ' + n);
    const seen = new Set(ms.map(m => [m.p1, m.p2].sort().join('|')));
    assert.equal(seen.size, ms.length, 'doublon pour ' + n);
    assert.ok(ms.every(m => m.p1 && m.p2 && m.p1 !== m.p2));
    const byRound = {};
    ms.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m.p1, m.p2); });
    Object.values(byRound).forEach(arr => assert.equal(new Set(arr).size, arr.length, 'un joueur deux fois dans une ronde'));
  }
});

test('statsFromMatches : points, défaite au set décisif, nul, PF/PC en 2 manches gagnantes', () => {
  const app = createApp();
  const cfg = { wPts: 3, l3Pts: 2, lPts: 1, drawPts: 1 };
  const st = app.plain(app.fn('statsFromMatches')([
    { p1: 'a', p2: 'b', score1: 11, score2: 4 },
    { p1: 'a', p2: 'c', score1: 2, score2: 1, sets: [{ s1: 11, s2: 5 }, { s1: 7, s2: 11 }, { s1: 9, s2: 11 }], totalPts1: 27, totalPts2: 27 },
    { p1: 'b', p2: 'c', score1: 5, score2: 5 },
  ], ['a', 'b', 'c'], cfg));
  assert.deepEqual([st.a.w, st.a.pts, st.a.pf, st.a.pa], [2, 6, 38, 31]);
  assert.deepEqual([st.c.l, st.c.l3, st.c.d], [1, 1, 1]);
  assert.equal(st.c.pts, cfg.l3Pts + cfg.drawPts);
  assert.equal(st.b.pts, cfg.lPts + cfg.drawPts);
});

test('classement de poule : tri par points', () => {
  const app = createApp();
  const t = tournament(app, { id: 'r1', names: ['A', 'B', 'C', 'D'] });
  t.matches.forEach(m => { const a = idx(m.p1) < idx(m.p2); play(m, a ? 11 : 6, a ? 6 : 11); });
  app.T = t;
  const r = app.plain(app.fn('calcPoolRanking')(t.pools[0].id));
  assert.deepEqual(r.map(x => x.id), ['r1p0', 'r1p1', 'r1p2', 'r1p3']);
  assert.deepEqual(r.map(x => x.pts), [9, 7, 5, 3]);
});

test('départage par confrontation directe entre deux joueurs à égalité', () => {
  const app = createApp();
  const run = h2h => {
    const id = 'h' + (h2h ? 'y' : 'n');
    const t = tournament(app, { id, names: ['A', 'B', 'C', 'D'], settings: { h2hTiebreak: h2h } });
    const [A, B, C, D] = [0, 1, 2, 3].map(i => id + 'p' + i);
    const find = (x, y) => t.matches.find(m => (m.p1 === x && m.p2 === y) || (m.p1 === y && m.p2 === x));
    const win = (w, l, a, b) => { const m = find(w, l); play(m, m.p1 === w ? a : b, m.p1 === w ? b : a); };
    // A et B : 2 victoires, 1 défaite chacun (7 pts). A a battu B, mais B a la meilleure différence.
    win(A, B, 11, 10); win(A, D, 11, 10); win(C, A, 11, 5);
    win(B, C, 11, 0); win(B, D, 11, 0); win(D, C, 11, 0);
    app.T = t;
    return app.plain(app.fn('calcPoolRanking')(t.pools[0].id)).map(r => r.id.slice(2));
  };
  assert.deepEqual(run(false), ['p1', 'p0', 'p3', 'p2'], 'sans départage direct : différence générale');
  assert.deepEqual(run(true), ['p0', 'p1', 'p3', 'p2'], 'avec départage direct : A (vainqueur du duel) devant B');
});

test('joueur forfait : classé en dernier malgré ses points', () => {
  const app = createApp();
  const t = tournament(app, { id: 'f1', names: ['A', 'B', 'C'] });
  t.matches.forEach(m => play(m, m.p1 === 'f1p0' ? 11 : 5, m.p1 === 'f1p0' ? 0 : 3));
  t.players[0].out = 'forfait';
  app.T = t;
  const r = app.plain(app.fn('calcPoolRanking')(t.pools[0].id));
  assert.equal(r[r.length - 1].id, 'f1p0');
});

// ----- tableau (mode 3) -----
test('ordre des têtes de série', () => {
  const app = createApp();
  const f = app.fn('bracketSeedOrder');
  assert.deepEqual(app.plain(f(8)), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.deepEqual(app.plain(f(4)), [1, 4, 2, 3]);
  assert.equal(new Set(app.plain(f(16))).size, 16);
});

test("tableau à 6 joueurs : 2 byes, progression jusqu'au vainqueur", () => {
  const app = createApp();
  const t = tournament(app, { id: 'b1', mode: 3, names: ['A', 'B', 'C', 'D', 'E', 'F'], pools: 'none' });
  app.T = t;
  app.fn('generateBracket')();
  assert.equal(t.bracket.size, 8);
  const byes = app.plain(t.bracket.rounds[0]).filter(e => e && typeof e === 'object' && e.bye);
  assert.equal(byes.length, 2);
  assert.deepEqual(byes.map(b => b.bye).sort(), ['b1p0', 'b1p1'], 'les 2 meilleures têtes de série sont exemptées');
  const rank = idx;
  for (let guard = 0; guard < 12; guard++) {
    const open = t.matches.filter(m => m.phase === 'bracket' && m.status !== 'done' && m.p1 && m.p2 && m.consolationRound === undefined && !m.isPetiteFinale);
    if (!open.length) break;
    open.forEach(m => { const w1 = rank(m.p1) < rank(m.p2); play(m, w1 ? 11 : 4, w1 ? 4 : 11); });
    app.fn('checkBracketAdvance')();
  }
  const last = t.bracket.rounds[t.bracket.rounds.length - 1];
  assert.equal(last.length, 1, 'il ne reste que la finale');
  const ranking = app.plain(app.fn('getBracketFullRanking')());
  assert.equal(ranking[0].id, 'b1p0', 'vainqueur');
  assert.equal(ranking[1].id, 'b1p1', 'finaliste');
  assert.equal(new Set(ranking.map(r => r.id)).size, 6, 'tous les joueurs classés une fois');
});

// ----- export XLSX -----
function exportXlsx(app, t) {
  app.T = t;
  app.downloads.length = 0;
  app.fn('downloadCSV')();
  assert.equal(app.downloads.length, 1, 'un fichier produit');
  const zip = readStoredZip(app.downloads[0].parts[0]);
  for (const [name, f] of Object.entries(zip)) {
    assert.equal(zlib.crc32(f.data), f.crc, 'CRC valide : ' + name);
  }
  assert.ok(zip['[Content_Types].xml'] && zip['xl/workbook.xml'] && zip['xl/worksheets/sheet1.xml'] && zip['xl/worksheets/sheet2.xml']);
  assert.match(zip['xl/workbook.xml'].data.toString(), /name="Matchs"[\s\S]*name="Classement final"/);
  return {
    matchs: sheetRows(zip['xl/worksheets/sheet1.xml'].data.toString('utf8')),
    classement: sheetRows(zip['xl/worksheets/sheet2.xml'].data.toString('utf8')),
  };
}

test('export XLSX : 2 onglets, matchs et classement (1 manche gagnante)', () => {
  const app = createApp();
  const t = tournament(app, { id: 'x1', names: ['ALICE', 'BRUNO', 'CLARA'] });
  play(t.matches[0], 11, 7);
  const x = exportXlsx(app, t);
  assert.deepEqual(x.matchs[0], { A: 'Poule / Phase', B: 'Match', C: 'Joueur 1', D: 'Score J1', E: 'Score J2', F: 'Joueur 2', G: 'Arbitre' });
  assert.equal(x.matchs.length, 1 + 3);
  assert.equal(x.matchs[1].D, 11);
  assert.equal(x.matchs[2].D, '-', 'match non joué');
  assert.ok(x.classement.some(r => r.B === 'ALICE'));
});

test('export XLSX en 2 manches gagnantes : détail des sets et totaux', () => {
  const app = createApp();
  const t = tournament(app, { id: 'x2', names: ['ALICE', 'BRUNO', 'CLARA'], settings: { winningSets: 2 } });
  play(t.matches[0], 2, 1, { sets: [{ s1: 11, s2: 5 }, { s1: 9, s2: 11 }, { s1: 11, s2: 7 }], totalPts1: 31, totalPts2: 23 });
  play(t.matches[1], 2, 0, { sets: [{ s1: 11, s2: 3 }, { s1: 11, s2: 4 }], totalPts1: 22, totalPts2: 7 });
  const x = exportXlsx(app, t);
  const h = x.matchs[0];
  assert.equal(h.D, 'Manches J1');
  assert.equal(h.G, 'Set 1 J1'); assert.equal(h.L, 'Set 3 J2');
  assert.equal(h.M, 'Total pts J1'); assert.equal(h.N, 'Total pts J2'); assert.equal(h.O, 'Arbitre');
  const r1 = x.matchs[1], r2 = x.matchs[2], r3 = x.matchs[3];
  assert.deepEqual([r1.D, r1.E, r1.G, r1.H, r1.I, r1.J, r1.K, r1.L, r1.M, r1.N], [2, 1, 11, 5, 9, 11, 11, 7, 31, 23]);
  assert.deepEqual([r2.G, r2.J, r2.K, r2.L, r2.M, r2.N], [11, 4, undefined, undefined, 22, 7], 'set 3 non disputé : vide');
  assert.equal(r3.G, undefined, 'match non joué : détail vide');
});

test('export XLSX : mode 2, chaque joueur classé une fois', () => {
  const app = createApp();
  const t = tournament(app, { id: 'x3', mode: 2, names: ['A', 'B', 'C', 'D', 'E', 'F'], pools: [['x3p0', 'x3p1', 'x3p2'], ['x3p3', 'x3p4', 'x3p5']] });
  t.matches.forEach(m => play(m, 11, 5));
  app.T = t;
  app.fn('generateFinals')();
  assert.ok(t.finals.length >= 1, 'finales générées');
  t.matches.filter(m => m.phase === 'final').forEach(m => play(m, 11, 6));
  const x = exportXlsx(app, t);
  const joueurs = x.classement.filter(r => typeof r.A === 'number').map(r => r.B);
  assert.equal(new Set(joueurs).size, 6);
  assert.equal(joueurs.length, 6);
});

// ----- sauvegarde / import -----
test('sauvegarde JSON : aller-retour, copie si identifiant déjà présent', () => {
  const app = createApp();
  const t = tournament(app, { id: 's1', names: ['A', 'B', 'C'] });
  play(t.matches[0], 11, 8);
  app.state.tournaments.push(t);
  const text = app.fn('buildBackup')(0);
  const d = JSON.parse(text);
  assert.equal(d.app, 'MatchManagerEPS');
  assert.equal(d.tournaments.length, 1);
  app.fn('importBackupText')(text);
  assert.equal(app.state.tournaments.length, 2);
  assert.notEqual(app.state.tournaments[1].id, 's1');
  assert.match(app.state.tournaments[1].name, /importé/);
});

test('import : identifiants et textes dangereux refusés ou assainis', () => {
  const app = createApp();
  const t = tournament(app, { id: 's2', names: ['A', 'B'] });
  t.players[0].name = '<img src=x onerror=alert(1)>';
  const ok = app.fn('sanitizeImportedTournament')(JSON.parse(JSON.stringify(t)));
  assert.ok(ok);
  assert.ok(!/[<>"']/.test(ok.players[0].name));
  const bad = JSON.parse(JSON.stringify(t));
  bad.matches[0].id = '"><script>';
  assert.equal(app.fn('sanitizeImportedTournament')(bad), null);
  const before = app.state.tournaments.length;
  app.fn('importBackupText')('pas du json');
  assert.equal(app.state.tournaments.length, before);
});

test('load() : données illisibles conservées sous la clé de secours', () => {
  const app = createApp();
  app.localStorage.setItem('teneps_data', '{pas du json');
  app.fn('load')();
  assert.equal(app.localStorage.getItem('teneps_data_illisible'), '{pas du json');
  assert.equal(app.state.tournaments.length, 0);
});

// ----- annuler -----
test("annuler : restaure exactement l'état avant l'action", () => {
  const app = createApp();
  const t = tournament(app, { id: 'u1', names: ['A', 'B', 'C'] });
  app.state.tournaments.push(t);
  app.T = t;
  app.fn('pushUndo')('Résultat test', [t.matches[0].id]);
  play(t.matches[0], 11, 3);
  assert.equal(t.matches[0].status, 'done');
  app.fn('undoLast')();
  const restored = app.T.matches.find(m => m.id === t.matches[0].id);
  assert.equal(restored.status, 'pending');
  assert.equal(restored.score1, null);
});

// ----- mot de passe -----
test('mot de passe : empreinte salée, jamais en clair', () => {
  const app = createApp();
  const h = app.fn('hashAdminPwd');
  assert.match(h('x'), /^[0-9a-f]{64}$/);
  assert.notEqual(h('x'), h('y'));
  assert.equal(h('x'), h('x'));
  assert.ok(!fs.readFileSync(INDEX, 'utf8').includes('ADMINPROF'), 'mot de passe par défaut absent du code');
});

// ----- palmarès -----
test('palmarès : classes rapprochées sans casse, forfaits exclus, podium si terminé', () => {
  const app = createApp();
  const t1 = tournament(app, { id: 'g1', names: ['ALICE', 'BRUNO', 'CLARA'], classe: '3eB' });
  t1.matches.forEach(m => { const w = idx(m.p1) < idx(m.p2); play(m, w ? 11 : 4, w ? 4 : 11); });
  const t2 = tournament(app, { id: 'g2', names: ['ALICE', 'BRUNO', 'CLARA'], classe: ' 3EB ' });
  play(t2.matches[0], 11, 0, { forfeit: t2.matches[0].p2 });
  const t3 = tournament(app, { id: 'g3', names: ['ZOE', 'YAN'], classe: '4eA' });
  app.state.tournaments.push(t1, t2, t3);
  const data = app.plain(app.fn('palmaresData')());
  assert.deepEqual(data.map(c => c.label), ['3eB', '4eA']);
  const c = data[0];
  assert.equal(c.tournaments.length, 2);
  assert.deepEqual(c.tournaments.map(t => t.finished), [true, false]);
  const alice = c.players.ALICE;
  assert.equal(alice.tn, 1, 'le seul match du 2e tournoi est un forfait : non compté');
  assert.deepEqual([alice.w, alice.l, alice.first, alice.podium], [2, 0, 1, 1]);
});

test('version affichée et version Android alignées', () => {
  const app = createApp();
  const gradle = fs.readFileSync(path.join(__dirname, '..', 'android', 'app', 'build.gradle'), 'utf8');
  assert.ok(gradle.includes('versionName "' + app.version + '"'), 'versionName Gradle = APP_VERSION (' + app.version + ')');
});

test('copies de l\'application identiques (index.html et assets de l\'APK)', () => {
  const a = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const b = fs.readFileSync(path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'index.html'));
  assert.ok(a.equals(b), 'index.html et android/app/src/main/assets/index.html diffèrent : recopier avant le build');
});

// ----- re-rendu ciblé : empreintes -----
test('matchSig : change avec le résultat, la table ou l\'arbitre, pas avec le reste', () => {
  const app = createApp();
  const t = tournament(app, { id: 'm1', names: ['A', 'B', 'C'] });
  const m = t.matches[0];
  const sig = () => app.fn('matchSig')(m);
  const s0 = sig();
  assert.equal(sig(), s0, 'stable sans changement');
  m.matchNum = 99;
  assert.equal(sig(), s0, 'le numéro de match n\'est pas affiché dans la signature');
  m.table = 3;
  const s1 = sig(); assert.notEqual(s1, s0);
  m.refereeId = 'm1p2';
  const s2 = sig(); assert.notEqual(s2, s1);
  play(m, 11, 4);
  assert.notEqual(sig(), s2);
});

test('rankingsSig : stable sans changement, différente après un résultat ou un retrait', () => {
  const app = createApp();
  const t = tournament(app, { id: 'k1', names: ['A', 'B', 'C'] });
  app.state.tournaments.push(t);
  app.T = t;
  const s0 = app.fn('rankingsSig')();
  assert.equal(app.fn('rankingsSig')(), s0);
  play(t.matches[0], 11, 4);
  const s1 = app.fn('rankingsSig')();
  assert.notEqual(s1, s0);
  t.players[0].out = 'forfait';
  assert.notEqual(app.fn('rankingsSig')(), s1);
});

test('bracketShapeSig : change quand un tour est généré, pas quand un match est joué', () => {
  const app = createApp();
  const t = tournament(app, { id: 'k2', mode: 3, names: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], pools: 'none' });
  app.T = t;
  app.fn('generateBracket')();
  const shape = () => app.fn('bracketShapeSig')();
  const s0 = shape();
  const round1 = t.matches.filter(m => m.phase === 'bracket' && m.bracketRound === 1);
  play(round1[0], 11, 3);
  app.fn('checkBracketAdvance')();
  assert.equal(shape(), s0, 'un match joué ne change pas la forme');
  round1.slice(1).forEach(m => play(m, 11, 3));
  app.fn('checkBracketAdvance')();
  assert.notEqual(shape(), s0, 'tour complet : le tour suivant est généré');
});
