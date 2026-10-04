// Deuxième affaire de meurtre (« Le notaire de la Rampe ») : cohérence, mandat, recoupements, déclics,
// hypothèse au juge, confrontation avec mobile, partie complète. La première affaire ne doit pas bouger.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, candidats, confrontationOk, mandatOk, pieceDemarche, texteFait, titrePiece, ENQ, pieceRecoupement, recoupementDe, opposables, pieceReaudition } from '../js/engine/enquete.js';
import { LIEUX_RAMPE, evaluerHypothese, EVENEMENTS, RECOUPEMENTS, RELECTURES, COUPS_DE_POUCE, CRENEAUX } from '../js/engine/meurtre-rampe.js';
import { dossierAffaire3 } from '../js/engine/dossier.js';

const st0 = { seed: 'r', meurtreDes: 2, meurtre2Des: 4 };
const a = affaire(st0, 4);
assert.equal(a.cas, 'rampe');
assert.ok(a.meurtre && a.prof && a.planques.length === 0);
assert.equal(affaire(st0, 2).cas, undefined, 'la première affaire reste celle de la rue de la Clef');
assert.equal(affaire(st0, 2).titre, 'Meurtre rue de la Clef');
assert.equal(affaire(st0, 5).meurtre, undefined, 'la suivante redevient un vol');

// Toutes les pièces ont un texte et un titre ; tous les lieux une adresse ; les pièces citées existent.
for (const f of [...a.faits, 'r:tel', 'r:mireille']) { assert.ok(texteFait(a, f).length > 40, f); assert.ok(titrePiece(a, f) && !/undefined/.test(titrePiece(a, f)), f); }
for (const s of a.suspects) assert.ok(LIEUX_RAMPE[s.alibi.pos], s.nom);
for (const l of Object.values(LIEUX_RAMPE)) assert.ok(l.adresse);
const publics = new Set(['doc:journal', 'doc:pvc', ...a.suspects.map((_, i) => `A:${i}`), 'r:tel', 'r:mireille']);
const existe = (f) => a.faits.includes(f) || publics.has(f);
for (const r of RECOUPEMENTS) for (const p of r.paires) for (const f of p) assert.ok(existe(f), `recoupement ${r.f} : ${f}`);
for (const [f, l] of Object.entries(RELECTURES)) { assert.ok(existe(f), f); for (const x of l) assert.ok(existe(x.si), x.si); }
for (const e of EVENEMENTS) assert.ok(existe(e.f), e.id);
for (const [i, l] of Object.entries(a.charges)) for (const f of l) assert.ok(existe(f), `mandat ${i} ${f}`);
for (const f of [...a.confront.decisives, ...a.confront.accablantes]) assert.ok(existe(f), `confrontation ${f}`);
for (const f of a.confront.decisives) assert.ok(a.confront.accablantes.includes(f), `décisive mais pas accablante : ${f}`);
for (const [i, l] of Object.entries(a.innocente)) for (const x of l) for (const f of [].concat(x)) assert.ok(existe(f), `innocente ${i} ${f}`);
assert.equal(COUPS_DE_POUCE.length, 5);
for (const c of COUPS_DE_POUCE) assert.deepEqual(c.niveaux.map(([j]) => j), [2, 4, 6]);

// Avec tout le dossier, un seul suspect reste : l'assassin. Sans les pièces qui blanchissent, tout le monde.
const tout = [...a.faits, 'r:tel', 'r:mireille'];
assert.deepEqual(candidats(a, tout).suspects, [a.coupable]);
assert.equal(candidats(a, ['c:legiste1', 'c:cam', 'c:agenda', 'mob:0', 'moy:2']).suspects.length, 5);
// Les groupes de pièces ne blanchissent qu'ensemble.
assert.ok(candidats(a, ['occ:0']).suspects.includes(0), 'la plaque seule ne blanchit pas Élodie');
assert.ok(!candidats(a, ['occ:0', 'mob:2']).suspects.includes(0), 'plaque + message vocal : blanchie');
assert.ok(candidats(a, ['occ:3', 'x:heure']).suspects.includes(3));
assert.ok(!candidats(a, ['occ:3', 'c:legiste2']).suspects.includes(3));
assert.ok(candidats(a, ['moy:3', 'Ra:3']).suspects.includes(3), 'ses aveux seuls ne la blanchissent pas');

// Le récit : aucun texte mal formé ; seul l'assassin évoque le SMS de 22:41 dans son audition.
const d3 = dossierAffaire3('r', a);
assert.ok(!/undefined|NaN/.test(JSON.stringify(d3)));
d3.auditions.forEach((au, i) => assert.equal(/écrit à Élodie|onze heures moins vingt/.test(JSON.stringify(au.qr)), i === a.coupable, au.qui));
assert.ok(/heure/i.test(d3.journal.breve[0]) && /caméras/.test(d3.journal.breve[1]), 'la brève sur l’heure d’hiver');

// Mandat : refusé sans pièce sérieuse, accordé avec.
const vide = { pieces: [] };
assert.equal(mandatOk(a, vide, 1), false);
assert.equal(pieceDemarche(a, vide, 'moyens:1'), null);
assert.equal(pieceDemarche(a, { pieces: [{ f: 'occ:4' }] }, 'moyens:1'), 'moy:1');
// Scène : une pièce à la fois, dans l'ordre.
assert.equal(pieceDemarche(a, vide, 'cam'), 'c:cam');
assert.equal(pieceDemarche(a, { pieces: [{ f: 'c:cam' }] }, 'cam'), 'c:tel1');

// Recoupements : dans les deux sens, une seule fois, et rien pour une paire quelconque.
assert.equal(pieceRecoupement(a, vide, 'c:cam', 'doc:journal'), 'x:heure');
assert.equal(pieceRecoupement(a, vide, 'doc:journal', 'c:cam'), 'x:heure');
assert.equal(pieceRecoupement(a, { pieces: [{ f: 'x:heure' }] }, 'c:cam', 'doc:journal'), null);
assert.equal(recoupementDe(a, 'c:cam', 'occ:2'), null);
assert.equal(pieceRecoupement(a, vide, 'r:tel', 'mob:0'), 'x:wifi');
// Réaudition : Grégoire face au SMS d’Élodie.
assert.equal(pieceReaudition(a, { pieces: [{ f: 'mob:0' }] }, 1, 'mob:0'), 'Ra:1');

// Confrontation : deux décisives au moins, sur l'assassin.
assert.ok(!confrontationOk(a, 1, ['x:liste', 'A:1', 'x:wifi']), 'une seule décisive');
assert.ok(confrontationOk(a, 1, ['x:wifi', 'moy:1', 'A:1']));
assert.ok(!confrontationOk(a, 1, ['x:wifi', 'moy:1', 'doc:journal']), 'le journal ne met personne en face de rien');
assert.ok(confrontationOk(a, 1, ['Rb:4', 'Ra:1', 'c:cam']));
assert.ok(!confrontationOk(a, 1, ['Rb:4', 'x:liste', 'c:cam']), 'la liste du Cercle accable sans prouver');
assert.ok(!confrontationOk(a, 1, ['x:wifi', 'moy:1', 'occ:2']), 'un leurre');
assert.ok(!confrontationOk(a, 0, ['x:wifi', 'moy:1', 'A:1']), 'mauvaise personne');

// Hypothèse au juge : avec tout le dossier, la vérité n'est contredite par rien ; chaque innocent l'est.
const K = new Set(tout);
assert.deepEqual(evaluerHypothese(K, 1, 1).contre, []);
for (const i of [0, 2, 3, 4]) for (let s = 0; s < CRENEAUX.length; s++) assert.ok(evaluerHypothese(K, i, s).contre.length > 0, `innocent ${i} créneau ${s}`);
for (const s of [0, 3, 4]) assert.ok(evaluerHypothese(K, 1, s).contre.length > 0, `mauvais créneau ${s}`);
// Avant les recoupements, la bonne hypothèse bute sur la caméra et le SMS : la « fausse solution ».
const naif = new Set(['c:legiste2', 'c:cam', 'c:tel1', 'occ:4', 'mob:2']);
const h = evaluerHypothese(naif, 1, 1);
assert.ok(h.contre.includes('c:cam') && h.contre.includes('c:tel1'));
assert.ok(!evaluerHypothese(new Set([...naif, 'x:heure', 'x:wifi']), 1, 1).contre.length);

// Partie complète : affaire 1 vol, 2 meurtre de la rue de la Clef, 3 vol, 4 la Rampe.
const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let st = createGame({ seed: 'rampe' });
st = resolveTurn(st, { players }).state;
let garde = 0;
while (st.enquete.n < 4 && garde++ < 40) st = resolveTurn(st, { players, orders: { A: base, B: base, C: base } }).state;
assert.equal(st.meurtreDes, 2); assert.equal(st.meurtre2Des, 4); assert.equal(st.enquete.n, 4);
let m = affaire(st, 4);
assert.equal(m.cas, 'rampe');
for (const u of 'ABC') st.zones[u].budget = 80;
// Jour 1 : A fouille le bureau et vérifie l'alibi de Thibault ; A recoupe le journal et rien (rien) ; B soumet une hypothèse.
let r = resolveTurn(st, { players, orders: {
  A: { ...base, demarches: ['temoin', 'alibi:4'], recoup: ['doc:journal', 'doc:pvc'] },
  B: { ...base, demarches: ['cam'], hypo: { i: 0, s: 2 } },
  C: { ...base, accusation: 0, confront: ['doc:journal', 'doc:pvc', 'A:0'] },
} });
st = r.state;
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'c:agenda'));
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'occ:4'));
assert.ok(st.zones.A.rapport.some((x) => /recoupement .* rien de neuf/.test(x)), 'recoupement stérile');
assert.ok(st.zones.B.rapport.some((x) => /juge d’instruction a lu ton hypothèse/.test(x)));
assert.equal(st.zones.C.enquete.exclu, true, 'Élodie : mauvaise personne');
// Jour 2 : A perquisitionne chez Grégoire (mandat grâce aux badges) et réentend Thibault face aux badges ; B recoupe la caméra et le journal.
r = resolveTurn(st, { players, orders: {
  A: { ...base, demarches: ['moyens:1'], reaud: { i: 4, f: 'occ:4' } },
  B: { ...base, recoup: ['c:cam', 'doc:journal'] },
  C: base,
} });
st = r.state;
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'moy:1'));
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'Rb:4'));
assert.ok(st.zones.B.enquete.pieces.some((p) => p.f === 'x:heure' && p.src === 'recoup'));
// Jour 3 : A confronte Grégoire avec la perquisition, les aveux de Thibault, et nomme le vrai mobile.
const avant = st.zones.A.stats.limier;
r = resolveTurn(st, { players, orders: { A: { ...base, accusation: 1, confront: ['moy:1', 'Rb:4', 'occ:4'], mobile: 2 }, B: base, C: base } });
st = r.state;
assert.ok(st.zones.A.rapport.some((x) => /tu avais aussi compris pourquoi/.test(x)));
assert.ok(st.zones.A.stats.limier >= avant + 20 + 30, 'aveux + mobile');
assert.ok(!st.traques.some((t) => t.n === 4), 'pas de traque');
assert.notEqual(affaire(st, st.enquete.n).meurtre, true, 'nouvelle affaire : un vol');
assert.equal(st.meurtre2Des, 4, 'une seule fois par partie');

// Déclic : avec les lettres, le relevé et le message vocal, une lettre anonyme arrive.
{
  let s2 = createGame({ seed: 'declic' });
  s2.meurtre2Des = 1; s2.meurtreDes = 0;
  s2 = resolveTurn(s2, { players }).state;
  assert.equal(affaire(s2, s2.enquete.n).cas, 'rampe');
  for (const u of 'ABC') s2.zones[u].budget = 80;
  for (let k = 0; k < 2; k++) s2 = resolveTurn(s2, { players, orders: { A: { ...base, demarches: ['temoin', 'cam'] }, B: base, C: base } }).state;
  assert.ok(!s2.zones.A.enquete.pieces.some((p) => p.f === 'd:corbeau'), 'pas encore : il faut aussi le message vocal');
  s2 = resolveTurn(s2, { players, orders: { A: { ...base, demarches: ['banque:2'] }, B: base, C: base } }).state;
  assert.ok(s2.zones.A.enquete.pieces.some((p) => p.f === 'd:corbeau' && p.src === 'declic'));
  assert.ok(opposables(affaire(s2, s2.enquete.n), s2.zones.A.enquete).has('d:corbeau'));
}
console.log('meurtre2 : OK');

// Lancement programmé : au premier tour résolu après le 4 octobre 2026 à 20:00, la Rampe s'ouvre le soir même.
{
  const { MEURTRE2 } = await import('../js/engine/enquete.js');
  const players2 = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
  const b2 = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
  const tours = (s, k) => { for (let i = 0; i < k; i++) s = resolveTurn(s, { players: players2, orders: { A: b2, B: b2 } }).state; return s; };
  // a) Un vol en cours, avant la date : rien ne bouge ; après la date : le vol est retiré, la Rampe s'ouvre le soir même.
  let s = createGame({ seed: 'lancement-a' });
  s = resolveTurn(s, { players: players2 }).state;
  s = tours(s, 2);
  assert.equal(s.enquete.n, 1); assert.equal(s.meurtre2Des, undefined);
  s.nextDeadline = MEURTRE2.lancement - 3600e3;
  s = tours(s, 1);
  assert.equal(s.enquete.n, 1, 'avant la date : rien');
  s.nextDeadline = MEURTRE2.lancement + 1800e3;
  const r = resolveTurn(s, { players: players2, orders: { A: { ...b2, demarches: ['cam'] }, B: b2 } });
  s = r.state;
  assert.equal(s.enquete.n, 2); assert.equal(s.meurtre2Des, 2); assert.equal(affaire(s, 2).cas, 'rampe');
  assert.ok(s.zones.A.rapport.some((x) => /pas d’affaire en cours ce soir/.test(x)));
  // La suivante est un vol, et la rue de la Clef ne vient qu'après un vol.
  for (let k = 0; k < ENQ.dureeMax + 1; k++) s = tours(s, 1);
  assert.equal(s.enquete.n, 3); assert.notEqual(affaire(s, 3).meurtre, true);
  assert.equal(s.meurtreDes == null || s.meurtreDes >= 4, true);
  // b) La rue de la Clef en cours : elle va jusqu'au bout, la Rampe suit directement.
  let t = createGame({ seed: 'lancement-b' });
  t.meurtreDes = 1;
  t = resolveTurn(t, { players: players2 }).state;
  t = tours(t, 1);
  assert.equal(affaire(t, t.enquete.n).titre, 'Meurtre rue de la Clef');
  t.nextDeadline = MEURTRE2.lancement + 1800e3;
  t = tours(t, 1);
  assert.equal(affaire(t, t.enquete.n).titre, 'Meurtre rue de la Clef', 'pas interrompue');
  assert.equal(t.meurtre2Suivante, true);
  for (let k = 0; k < ENQ.dureeMax; k++) t = tours(t, 1);
  assert.equal(affaire(t, t.enquete.n).cas, 'rampe', 'la Rampe suit');
  // c) Affaire retirée à la main par le maître du jeu juste avant le lancement : c'est la Rampe qui s'ouvre (pas un vol, pas la Clef).
  let u = createGame({ seed: 'lancement-c' });
  u = resolveTurn(u, { players: players2 }).state;
  u = tours(u, 2);
  u.enquetePause = { id: 'x', n: u.enquete.n, titre: 'retirée', tour: u.turn, reprise: u.nextDeadline };
  u.enquete = null;
  u.nextDeadline = MEURTRE2.lancement + 1800e3;
  u = tours(u, 1);
  assert.equal(affaire(u, u.enquete.n).cas, 'rampe', 'pause manuelle : la Rampe s’ouvre');
  // d) Réparation : la rue de la Clef ouverte par erreur le soir du lancement est retirée le lendemain, la Rampe s'ouvre, la Clef reviendra.
  let v = createGame({ seed: 'lancement-d' });
  v = resolveTurn(v, { players: players2 }).state;
  v = tours(v, 2);
  v.enquetePause = { id: 'x', n: v.enquete.n, titre: 'retirée', tour: v.turn, reprise: v.nextDeadline, suivante: 'aucune' };
  v.enquete = null; v.meurtreDes = undefined;
  v.nextDeadline = MEURTRE2.lancement + 1800e3;
  v = resolveTurn(v, { players: players2 }).state; v.lastResolvedAt = MEURTRE2.lancement + 1800e3;
  assert.equal(affaire(v, v.enquete.n).titre, 'Meurtre rue de la Clef', 'situation de départ : la Clef ouverte à tort');
  v = tours(v, 1);
  assert.equal(affaire(v, v.enquete.n).cas, 'rampe', 'réparée le lendemain');
  assert.equal(v.meurtreDes, undefined, 'la Clef reviendra plus tard');
}
// e) Maître du jeu : ouvrir la Rampe tout de suite (sans tour), puis le 20:00 suivant la fait avancer normalement.
{
  const { ouvrirRampeMaintenant, rampeDisponible } = await import('../js/engine/enquete.js');
  const players2 = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
  const b2 = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
  let w = createGame({ seed: 'maintenant' });
  w = resolveTurn(w, { players: players2 }).state;
  w = resolveTurn(w, { players: players2, orders: { A: b2, B: b2 } }).state;
  const tour = w.turn, n0 = w.enquete.n;
  assert.ok(rampeDisponible(w));
  assert.ok(ouvrirRampeMaintenant(w));
  assert.equal(w.turn, tour); assert.equal(w.enquete.n, n0 + 1); assert.equal(affaire(w, w.enquete.n).cas, 'rampe');
  assert.equal(w.enquetePause, undefined); assert.ok(w.zones.A.enquete && w.zones.A.enquete.n === w.enquete.n);
  assert.equal(rampeDisponible(w), false); assert.equal(ouvrirRampeMaintenant(w), null);
  w = JSON.parse(JSON.stringify(w));
  w = resolveTurn(w, { players: players2, orders: { A: b2, B: b2 } }).state;
  assert.equal(affaire(w, w.enquete.n).cas, 'rampe'); assert.equal(w.enquete.jour, 2);
}
console.log('lancement programmé : OK');

// Maître du jeu : liste des affaires écrites ouvrables, ouverture de la rue de la Clef, puis plus rien de rejouable.
{
  const { affairesOuvrables, ouvrirAffaireMaintenant } = await import('../js/engine/enquete.js');
  const players2 = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
  let w = createGame({ seed: 'liste' });
  w = resolveTurn(w, { players: players2 }).state;
  w.meurtreDes = undefined; w.meurtre2Des = undefined;
  assert.deepEqual(affairesOuvrables(w).map((a) => a.cas).sort(), ['clef', 'rampe']);
  assert.ok(ouvrirAffaireMaintenant(w, 'clef') != null);
  assert.equal(affaire(w, w.enquete.n).titre, 'Meurtre rue de la Clef');
  assert.deepEqual(affairesOuvrables(w).map((a) => a.cas), ['rampe'], 'la Clef en cours ne se rouvre pas');
  assert.ok(ouvrirAffaireMaintenant(w, 'rampe') != null);
  assert.deepEqual(affairesOuvrables(w).map((a) => a.cas), ['clef'], 'la Clef retirée au jour 1 redevient disponible');
  assert.equal(ouvrirAffaireMaintenant(w, 'rampe'), null);
  console.log('OK : affaires écrites ouvrables par le maître du jeu.');
}
