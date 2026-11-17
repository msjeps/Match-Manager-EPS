// Tests de la logique de calcul de Match Manager EPS (sans navigateur).
// Lancer : node --test tests/      (ou : npm test)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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

test('escJs + escH neutralisent un backslash avant apostrophe dans un onclick (régression XSS 2026-10-24)', () => {
  const app = createApp();
  const escJs = app.fn('escJs');
  const escH = app.fn('escH');
  // Cas bénin (celui que l'ancien .replace(/'/g,...) visait) : toujours échappé correctement.
  assert.equal(escJs("O'Brien"), "O\\'Brien");
  // Payload qui cassait l'ancienne version : backslash juste avant l'apostrophe, puis du code.
  const payload = "\\';window.__regress=1;//";
  const attr = "document.getElementById('mmeps-test-el').value='" + escH(escJs(payload)) + "'";
  vm.runInContext(attr, app.ctx);
  assert.equal(typeof app.ctx.__regress, 'undefined', 'le payload ne doit exécuter aucun code injecté');
  assert.equal(app.ctx.document.getElementById('mmeps-test-el').value, payload, 'la valeur doit être stockée telle quelle, comme texte');
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

test('export XLSX : un nom commençant par = + - @ est neutralisé (quotePrefix), valeur inchangée', () => {
  const app = createApp();
  const noms = ['=1+1', '+CMD', '-2+3', '@SUM(1,1)', ' =HYPERLINK("http://x","y")', 'ALICE'];
  const t = tournament(app, { id: 'x4', names: noms });
  play(t.matches[0], 11, 7);
  app.T = t;
  app.downloads.length = 0;
  app.fn('downloadCSV')();
  const zip = readStoredZip(app.downloads[0].parts[0]);
  const styles = zip['xl/styles.xml'].data.toString();
  assert.match(styles, /<cellXfs count="4">/);
  assert.equal((styles.match(/quotePrefix="1"/g) || []).length, 2, 'styles 2 et 3 en quotePrefix');
  for (const n of ['sheet1', 'sheet2']) {
    const xml = zip['xl/worksheets/' + n + '.xml'].data.toString('utf8');
    for (const c of xml.match(/<c [^>]*t="inlineStr"[^>]*>.*?<\/c>/g) || []) {
      const txt = c.replace(/<[^>]+>/g, '');
      const dangereux = /^[\s\u00a0]*[=+\-@]/.test(txt) && txt !== '-';
      assert.equal(/ s="[23]"/.test(c), dangereux, 'style quotePrefix exactement sur les textes à risque : ' + c);
    }
  }
  const x = exportXlsx(app, t);
  const joueurs = x.matchs.slice(1).flatMap(r => [r.C, r.F]);
  assert.ok(joueurs.includes('=1+1') && joueurs.includes('@SUM(1,1)'), 'valeur conservée sans apostrophe ajoutée');
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

test('regénérer les matchs avec des résultats saisis : confirmation obligatoire, rien d\'effacé avant (régression 2026-11-17)', () => {
  const app = createApp();
  const t = tournament(app, { id: 'g1', names: ['A', 'B', 'C', 'D'] });
  app.T = t;
  play(t.matches[0], 11, 5);
  const idDone = t.matches[0].id;
  app.fn('validateDistribution')();
  assert.equal(t.matches.length, 6, 'aucun match supprimé sans confirmation');
  assert.equal(t.matches[0].id, idDone);
  assert.equal(t.matches[0].status, 'done', 'le résultat est conservé');
  app.ctx.modalOk();
  assert.notEqual(t.matches[0].id, idDone, 'après confirmation, les matchs sont regénérés');
  assert.equal(t.matches.every(m => m.status === 'pending'), true);
  app.fn('undoLast')();
  assert.equal(app.T.matches.find(m => m.id === idDone).status, 'done', 'Annuler restaure le résultat');
});
test('regénérer les matchs sans résultat saisi : aucune confirmation demandée', () => {
  const app = createApp();
  const t = tournament(app, { id: 'g2', names: ['A', 'B', 'C', 'D'] });
  app.T = t;
  const old = t.matches[0].id;
  app.fn('validateDistribution')();
  assert.notEqual(t.matches[0].id, old);
});
// ----- statuts « dispensé » / « absent » (matchs en pause, rien n'est supprimé) -----
test('absent / dispensé : matchs conservés et inchangés, en pause, rétablissement', () => {
  const app = createApp();
  const t = tournament(app, { id: 'a1', names: ['A', 'B', 'C', 'D'] });
  app.T = t;
  play(t.matches[0], 11, 4);
  const avant = JSON.stringify(t.matches.map(m => [m.id, m.p1, m.p2, m.matchNum]));
  const pid = t.players[3].id;
  app.fn('setAway')(pid, 'absent');
  assert.equal(JSON.stringify(t.matches.map(m => [m.id, m.p1, m.p2, m.matchNum])), avant, 'ordre et composition inchangés');
  assert.equal(t.pools[0].playerIds.includes(pid), true, 'reste dans la poule');
  const mine = t.matches.filter(m => m.p1 === pid || m.p2 === pid);
  assert.equal(mine.every(m => app.fn('isWaitingMatch')(m) || m.status === 'done'), true);
  assert.equal(t.matches.filter(m => !mine.includes(m)).some(m => app.fn('isWaitingMatch')(m)), false);
  app.fn('setAway')(pid, null);
  assert.equal(t.players[3].away, undefined);
  assert.equal(t.matches.some(m => app.fn('isWaitingMatch')(m)), false);
});
test('absent / dispensé : un match en pause ne peut ni être lancé ni validé', () => {
  const app = createApp();
  const t = tournament(app, { id: 'a2', names: ['A', 'B', 'C'] });
  app.T = t;
  const m = t.matches[0];
  app.fn('setAway')(m.p1, 'dispense');
  m.score1 = null; document_stub_noop();
  app.fn('validateMatch')(m.id);
  assert.equal(m.status, 'pending', 'pas de validation');
  app.fn('launchQueued')(m.id);
  assert.equal(m.status, 'pending', 'pas de lancement');
  function document_stub_noop() {}
});
test('file d\'attente : les matchs d\'un absent ou d\'un dispensé ne sont pas proposés', () => {
  const app = createApp();
  const t = tournament(app, { id: 'a3', names: ['A', 'B', 'C', 'D'] });
  app.T = t;
  const away = t.players[0].id;
  app.fn('setAway')(away, 'dispense');
  const q = app.fn('computeQueue')('pool');
  assert.equal(q.entries.length, 3, 'seuls les 3 matchs sans le dispensé');
  assert.equal(q.entries.some(e => e.m.p1 === away || e.m.p2 === away), false);
});
test('arbitres : le dispensé arbitre toutes les poules, l\'absent jamais', () => {
  const app = createApp();
  const t = tournament(app, { id: 'a4', names: ['A', 'B', 'C', 'D', 'E', 'F'],
    pools: [['a4p0', 'a4p1', 'a4p2'], ['a4p3', 'a4p4', 'a4p5']] });
  t.settings.refScope = 'pool';
  app.T = t;
  const m = t.matches.find(x => x.poolId === t.pools[0].id);
  const ids = () => app.fn('getRefereeCandidates')(m).map(p => p.id);
  app.fn('setAway')('a4p3', 'dispense');
  assert.equal(ids().includes('a4p3'), true, 'dispensé d\'une autre poule : arbitre');
  assert.equal(ids().includes('a4p4'), false, 'joueur d\'une autre poule : non, réglage par poule');
  app.fn('setAway')('a4p3', 'absent');
  assert.equal(ids().includes('a4p3'), false, 'absent : n\'arbitre pas');
});
test('classement provisoire : par match par défaut, colonne joués / à jouer, absent classé selon ses résultats', () => {
  const app = createApp();
  const t = tournament(app, { id: 'a5', names: ['A', 'B', 'C', 'D'] });
  app.T = t;
  const get = (x, y) => t.matches.find(m => (m.p1 === x && m.p2 === y) || (m.p1 === y && m.p2 === x));
  // D (absent) gagne son seul match joué ; A gagne 2 matchs sur 3
  const D = 'a5p3';
  play(get(D, 'a5p0'), 0, 0); // remplacé juste après
  const m1 = get(D, 'a5p0'); play(m1, m1.p1 === D ? 11 : 3, m1.p1 === D ? 3 : 11);
  play(get('a5p0', 'a5p1'), get('a5p0', 'a5p1').p1 === 'a5p0' ? 11 : 2, get('a5p0', 'a5p1').p1 === 'a5p0' ? 2 : 11);
  app.fn('setAway')(D, 'absent');
  assert.equal(app.fn('rankModeEff')(), 'avg');
  const r = app.fn('calcPoolRanking')(t.pools[0].id);
  const rd = r.find(x => x.id === D);
  assert.equal(rd.played, 1); assert.equal(rd.left, 2); assert.equal(rd.away, 'absent');
  assert.equal(r[0].id, D, 'avec 1 victoire sur 1, l\'absent est provisoirement en tête (points par match)');
  t.settings.rankMode = 'total';
  const r2 = app.fn('calcPoolRanking')(t.pools[0].id);
  assert.notEqual(r2[0].id, D, 'en points totaux, il passe derrière');
});
test('import : le statut away est conservé s\'il est valide, sinon supprimé', () => {
  const app = createApp();
  const t = tournament(app, { id: 'a6', names: ['A', 'B', 'C'] });
  t.players[0].away = 'dispense'; t.players[1].away = 'n\'importe quoi';
  const out = app.fn('sanitizeImportedTournament')(JSON.parse(JSON.stringify(t)));
  assert.equal(out.players[0].away, 'dispense');
  assert.equal(out.players[1].away, undefined);
});
test('suivi de l\'export : résultats non exportés comptés, remis à zéro après export, nom avec l\'heure', () => {
  const app = createApp();
  const t = tournament(app, { id: 'e1', names: ['A', 'B', 'C'] });
  app.state.tournaments = [t]; app.T = t;
  assert.equal(app.fn('exportStatus')().never, true, 'jamais exporté');
  play(t.matches[0], 11, 3);
  app.fn('exportBackup')(0, 'file');
  let st = app.fn('exportStatus')();
  assert.equal(st.dirty, false);
  play(t.matches[1], 11, 5);
  st = app.fn('exportStatus')();
  assert.equal(st.dirty, true); assert.equal(st.n, 1, 'un résultat saisi depuis l\'export');
  assert.match(app.fn('backupFileName')(t), /^MatchManagerEPS_sauvegarde_.+_\d{2}-\d{2}-\d{4}_\d{2}h\d{2}\.json$/);
});
// ----- clôture « sans eux » (temps 2) -----
function poolAvecAbsent(app, id) {
  const t = tournament(app, { id, names: ['A', 'B', 'C', 'D'] });
  app.T = t;
  const away = t.players[3].id;
  const get = (x, y) => t.matches.find(m => (m.p1 === x && m.p2 === y) || (m.p1 === y && m.p2 === x));
  // A bat tout le monde, B bat C ; D (absent) a perdu contre A avant de partir
  const win = (w, l) => { const m = get(w, l); play(m, m.p1 === w ? 11 : 3, m.p1 === w ? 3 : 11); };
  win(t.players[0].id, t.players[1].id); win(t.players[0].id, t.players[2].id); win(t.players[1].id, t.players[2].id);
  win(t.players[0].id, away);
  app.fn('setAway')(away, 'absent');
  return { t, away };
}
test('clôture : décision demandée seulement quand tous les matchs jouables sont terminés', () => {
  const app = createApp();
  const { t } = poolAvecAbsent(app, 'c1');
  assert.equal(app.fn('closureDue')(), true);
  const a = createApp();
  const t2 = tournament(a, { id: 'c2', names: ['A', 'B', 'C', 'D'] });
  a.T = t2; a.fn('setAway')(t2.players[3].id, 'absent');
  assert.equal(a.fn('closureDue')(), false, 'il reste des matchs jouables');
});
test('clôture sans eux : leurs matchs ne comptent pour personne, non classés en dernier, finales possibles', () => {
  const app = createApp();
  const { t, away } = poolAvecAbsent(app, 'c3');
  const avant = app.fn('calcPoolRanking')(t.pools[0].id).find(r => r.id === t.players[0].id);
  assert.equal(avant.w, 3);
  app.fn('closeWithout')();
  assert.deepEqual(app.plain(t.excluded), [away]);
  const rk = app.fn('calcPoolRanking')(t.pools[0].id);
  const ra = rk.find(r => r.id === t.players[0].id);
  assert.equal(ra.w, 2, 'la victoire sur l\'absent ne compte plus');
  assert.equal(rk[rk.length - 1].id, away); assert.equal(rk[rk.length - 1].excl, true);
  assert.equal(app.fn('closureDue')(), false);
  assert.equal(app.fn('tournamentOrder')().finished, true, 'tournoi terminé sans l\'absent');
  assert.equal(app.fn('tournamentOrder')().ids.includes(away), false, 'pas au classement général');
  // annuler : retour à l'état d'avant la clôture
  app.fn('undoLast')();
  assert.equal(app.T.excluded, undefined);
  assert.equal(app.fn('calcPoolRanking')(app.T.pools[0].id).find(r => r.id === app.T.players[0].id).w, 3);
});
test('clôture : rétablir un joueur le sort de la liste des exclus', () => {
  const app = createApp();
  const { t, away } = poolAvecAbsent(app, 'c4');
  app.fn('closeWithout')();
  app.fn('setAway')(away, null);
  assert.equal(t.excluded, undefined);
  assert.equal(app.fn('calcPoolRanking')(t.pools[0].id).find(r => r.id === t.players[0].id).w, 3);
});
test('export XLSX avec joueur en pause : colonnes Statut, Joués et À jouer, titre provisoire', () => {
  const app = createApp();
  const { t } = poolAvecAbsent(app, 'c5');
  t.pools = [t.pools[0]];
  const x = exportXlsx(app, t);
  assert.equal(x.matchs[0].G, 'Arbitre'); assert.equal(x.matchs[0].H, 'Statut');
  assert.ok(x.matchs.some(r => r.H === 'En pause'));
  assert.ok(String(x.classement[0].A).includes('PROVISOIRE'));
  const hdr = x.classement.find(r => r.A === 'Rang');
  assert.equal(hdr.J !== undefined && Object.values(hdr).includes('Statut'), true);
});
test('version affichée et version Android alignées', () => {
  const app = createApp();
  const gradle = fs.readFileSync(path.join(__dirname, '..', 'android', 'app', 'build.gradle'), 'utf8');
  assert.ok(gradle.includes('versionName "' + app.version + '"'), 'versionName Gradle = APP_VERSION (' + app.version + ')');
});

test('APK : les assets sont recopiés depuis index.html par Gradle (source unique)', () => {
  const gradle = fs.readFileSync(path.join(__dirname, '..', 'android', 'app', 'build.gradle'), 'utf8');
  assert.ok(/syncWebApp/.test(gradle) && gradle.includes('/../index.html'), 'tâche syncWebApp absente de build.gradle');
  assert.ok(/preBuild\.dependsOn\s+'syncWebApp'/.test(gradle), 'syncWebApp doit précéder preBuild');
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

test('file d\'attente des poules : tables de la poule respectées, ordre = numéro de match', () => {
  const app = createApp();
  const t = tournament(app, { id: 'q1', names: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    pools: [['q1p0', 'q1p1', 'q1p2', 'q1p3'], ['q1p4', 'q1p5', 'q1p6', 'q1p7']], settings: { tables: 4 } });
  t.poolTables = [[1, 2], [3, 4]];
  app.T = t;
  const q = app.fn('computeQueue')('pool');
  const poolOf = e => t.pools.findIndex(p => p.id === e.m.poolId);
  q.entries.filter(e => e.ready && e.table !== null).forEach(e =>
    assert.ok(t.poolTables[poolOf(e)].includes(e.table), 'table ' + e.table + ' hors des tables de la poule ' + poolOf(e)));
  // dans une poule, les matchs prêts sont proposés dans l'ordre de la liste
  [0, 1].forEach(pi => {
    const nums = q.entries.filter(e => poolOf(e) === pi).map(e => e.m.matchNum);
    assert.deepEqual(nums, nums.slice().sort((a, b) => a - b));
  });
  // les tables de la poule 1 occupées : aucun match de la poule 1 ne prend une table de la poule 2
  t.matches.filter(m => m.poolId === t.pools[0].id).slice(0, 4).forEach((m, i) => { m.status = 'playing'; m.table = i < 2 ? i + 1 : 0; });
  const q2 = app.fn('computeQueue')('pool');
  q2.entries.filter(e => e.ready && poolOf(e) === 0 && e.table !== null).forEach(e => assert.ok([1, 2].includes(e.table), "poule0 table " + e.table + " match " + e.m.matchNum + " ready " + e.ready));
});

test('liste d\'une poule : en cours, puis à jouer, puis terminés', () => {
  const app = createApp();
  const t = tournament(app, { id: 'q2', names: ['A', 'B', 'C', 'D'] });
  app.T = t;
  t.matches[0].status = 'done';
  t.matches[3].status = 'playing';
  const order = app.fn('sortedPoolMatches')(t.matches).map(m => m.matchNum);
  assert.deepEqual(order, [4, 2, 3, 5, 6, 1]);
});

test('arbitres : réglage par poule ou tous les joueurs', () => {
  const app = createApp();
  const t = tournament(app, { id: 'r1', names: ['A', 'B', 'C', 'D', 'E', 'F'],
    pools: [['r1p0', 'r1p1', 'r1p2'], ['r1p3', 'r1p4', 'r1p5']] });
  app.T = t;
  const m = t.matches.find(x => x.poolId === t.pools[0].id);
  const get = () => app.fn('getRefereeCandidates')(m).map(p => p.id).sort();
  t.settings.refScope = 'all';
  assert.equal(get().length, 4, 'tous les joueurs hors les deux du match');
  t.settings.refScope = 'pool';
  const c = get();
  assert.equal(c.length, 1, 'un seul libre dans la poule');
  assert.ok(t.pools[0].playerIds.includes(c[0]));
  delete t.settings.refScope; // ancien tournoi : comportement inchangé
  assert.equal(get().length, 4);
});

test("file d'attente : 4 joueurs, 10 tables, aucun arbitre automatique ne bloque un match (poules et finales)", () => {
  const app = createApp();
  const names = ['A', 'B', 'C', 'D'];
  const t = tournament(app, { id: 'q1', mode: 2, names, settings: { tables: 10 } });
  // Les mêmes matchs servent aussi de finale : on les copie en phase « final »
  const ids = t.players.map(p => p.id);
  t.finals = [{ id: 'q1f0', name: 'Finale A', rank: 1, playerIds: ids }];
  t.matches.filter(m => m.phase === 'pool').forEach(m => t.matches.push({ ...m, id: m.id + 'F', poolId: 'q1f0', phase: 'final' }));
  app.state.tournaments = [t]; app.state.currentId = t.id; app.T = t;
  for (const phase of ['pool', 'final']) {
    const q = app.fn('computeQueue')(phase);
    const prets = q.entries.filter(e => e.ready);
    assert.ok(prets.length >= 2, phase + ' : au moins 2 matchs prêts');
    prets.forEach(e => assert.equal(e.ref, null, phase + ' : pas d\'arbitre qui bloque un autre match'));
  }
});
