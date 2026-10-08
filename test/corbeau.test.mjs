// Troisième affaire écrite (« Le corbeau de la rue d'Havré », sans meurtre) : cohérence, mandat, recoupements, déclic,
// hypothèse au juge, confrontation avec mobile, programmation juste après la Rampe, ouverture par le maître du jeu.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, candidats, confrontationOk, mandatOk, pieceDemarche, texteFait, titrePiece, pieceRecoupement, recoupementDe, opposables, pieceReaudition, affairesOuvrables, ouvrirAffaireMaintenant } from '../js/engine/enquete.js';
import { LIEUX_CORBEAU, evaluerHypotheseCorbeau as evaluer, EVENEMENTS, RECOUPEMENTS, RELECTURES, COUPS_DE_POUCE, CRENEAUX } from '../js/engine/corbeau-havre.js';
import { dossierAffaire3 } from '../js/engine/dossier.js';
import { construireDebrief } from '../js/engine/debrief.js';

const st0 = { seed: 'c', meurtreDes: 2, meurtre2Des: 4, corbeauDes: 5 };
const a = affaire(st0, 5);
assert.equal(a.cas, 'corbeau');
assert.equal(a.genre, 'corbeau');
assert.ok(a.meurtre && a.prof && a.planques.length === 0, 'même moteur que les meurtres écrits : confrontation, pas de traque');
assert.equal(affaire(st0, 4).cas, 'rampe');
assert.equal(affaire(st0, 6).meurtre, undefined, 'la suivante redevient un vol');

// Toutes les pièces ont un texte et un titre ; tous les lieux une adresse ; les pièces citées existent.
const REB = ['r:odile', 'r:relais', 'r:l1', 'r:l2', 'r:l3'];
for (const f of [...a.faits, ...REB]) { assert.ok(texteFait(a, f).length > 40, f); assert.ok(titrePiece(a, f) && !/undefined/.test(titrePiece(a, f)), f); }
for (const s of a.suspects) assert.ok(LIEUX_CORBEAU[s.alibi.pos], s.nom);
for (const l of Object.values(LIEUX_CORBEAU)) assert.ok(l.adresse);
const publics = new Set(['doc:journal', 'doc:pvc', ...a.suspects.map((_, i) => `A:${i}`), ...REB]);
const existe = (f) => a.faits.includes(f) || publics.has(f);
for (const r of RECOUPEMENTS) for (const p of r.paires) for (const f of p) assert.ok(existe(f), `recoupement ${r.f} : ${f}`);
for (const [f, l] of Object.entries(RELECTURES)) { assert.ok(existe(f), f); for (const x of l) assert.ok(existe(x.si), x.si); }
for (const e of EVENEMENTS) assert.ok(existe(e.f), e.id);
for (const [i, l] of Object.entries(a.charges)) for (const f of l) assert.ok(existe(f), `mandat ${i} ${f}`);
for (const f of [...a.confront.decisives, ...a.confront.accablantes]) assert.ok(existe(f), `confrontation ${f}`);
for (const f of a.confront.decisives) assert.ok(a.confront.accablantes.includes(f), `décisive mais pas accablante : ${f}`);
for (const [i, l] of Object.entries(a.innocente)) for (const x of l) for (const f of [].concat(x)) assert.ok(existe(f), `innocente ${i} ${f}`);
for (const d of a.declics) for (const f of [...d.si, d.f]) assert.ok(existe(f), `déclic ${f}`);
assert.equal(COUPS_DE_POUCE.length, 6);
for (const c of COUPS_DE_POUCE) assert.deepEqual(c.niveaux.map(([j]) => j), [2, 4, 6]);
assert.equal(CRENEAUX.length, 5);

// Avec tout le dossier, un seul suspect reste : le corbeau.
const tout = [...a.faits, ...REB];
assert.deepEqual(candidats(a, tout).suspects, [a.coupable]);
assert.equal(candidats(a, ['c:labo1', 'c:direct', 'c:dest', 'mob:2', 'moy:0']).suspects.length, 5);

// Le récit : rien de mal formé ; la plaignante parle de « sept » dans le PV et dans son audition, personne d'autre.
const d3 = dossierAffaire3('c', a);
assert.ok(!/undefined|NaN/.test(JSON.stringify(d3)));
assert.ok(d3.pvc.lignes.some((l) => /sept affiches/.test(l)) && d3.pvc.lignes.some((l) => /six affiches/.test(l)), 'le PV : six constatées, « sept » dans la plainte');
d3.auditions.forEach((au, i) => assert.equal(/sept vitrines|sept affiches/.test(JSON.stringify(au.qr)), i === a.coupable, au.qui));
assert.ok(/21:05 et 21:40/.test(d3.journal.breve[1]), 'la brève météo fixe la fin de l’averse');
// Aucun texte ne trahit le nombre d'affiches avant la septième (sauf la plaignante).
for (const f of ['x:fenetre', 'c:labo1', 'c:direct', 'c:rosine', 'c:sonnette']) assert.ok(!/\bsept\b/i.test(texteFait(a, f)), f);

// Mandat : refusé sans pièce sérieuse, accordé avec ; la scène se donne une pièce à la fois.
const vide = { pieces: [] };
assert.equal(mandatOk(a, vide, 4), false);
assert.equal(pieceDemarche(a, vide, 'moyens:4'), null);
assert.equal(pieceDemarche(a, { pieces: [{ f: 'occ:4' }] }, 'moyens:4'), 'moy:4');
assert.equal(pieceDemarche(a, { pieces: [{ f: 'mob:0' }] }, 'moyens:0'), 'moy:0');
assert.equal(pieceDemarche(a, vide, 'temoin'), 'c:dest');
assert.equal(pieceDemarche(a, { pieces: [{ f: 'c:dest' }] }, 'temoin'), 'c:septieme');

// Recoupements : la septième affiche contre le PV ; la lettre cachée contre les destinataires ; rien pour une paire quelconque.
assert.equal(pieceRecoupement(a, vide, 'c:septieme', 'doc:pvc'), 'x:sept');
assert.equal(pieceRecoupement(a, vide, 'doc:pvc', 'c:septieme'), 'x:sept');
assert.equal(pieceRecoupement(a, vide, 'c:labo1', 'doc:journal'), 'x:fenetre');
assert.equal(pieceRecoupement(a, vide, 'moy:0', 'c:dest'), 'x:premiere');
assert.equal(pieceRecoupement(a, vide, 'r:relais', 'mob:4'), 'x:relais');
assert.equal(recoupementDe(a, 'c:direct', 'occ:3'), null);
// Réauditions.
assert.equal(pieceReaudition(a, { pieces: [{ f: 'c:septieme' }] }, 4, 'c:septieme'), 'Rb:4');
assert.equal(pieceReaudition(a, { pieces: [{ f: 'occ:2' }] }, 2, 'occ:2'), 'Ra:2');

// Confrontation : deux décisives au moins, sur le corbeau.
assert.ok(confrontationOk(a, 4, ['moy:4', 'x:sept', 'occ:4']));
assert.ok(confrontationOk(a, 4, ['x:relais', 'Rb:4', 'doc:pvc']));
assert.ok(!confrontationOk(a, 4, ['moy:4', 'occ:4', 'A:4']), 'une seule décisive');
assert.ok(!confrontationOk(a, 4, ['moy:4', 'x:sept', 'occ:2']), 'un leurre');
assert.ok(!confrontationOk(a, 0, ['moy:4', 'x:sept', 'occ:4']), 'mauvaise personne');

// Hypothèse au juge : avec tout le dossier, la vérité (Hélène, 21:40-22:00) n'est contredite par rien ; le reste l'est.
const K = new Set(tout);
assert.deepEqual(evaluer(K, 4, 1).contre, []);
for (const i of [0, 1, 2, 3]) for (let s = 0; s < CRENEAUX.length; s++) assert.ok(evaluer(K, i, s).contre.length > 0, `innocent ${i} créneau ${s}`);
for (const s of [0, 2, 3, 4]) assert.ok(evaluer(K, 4, s).contre.length > 0, `mauvais créneau ${s}`);
// Lecture naïve : huit minutes ne suffisent pas pour coller six affiches… jusqu'au recoupement.
const naif = new Set(['c:direct', 'occ:4']);
assert.ok(evaluer(naif, 4, 1).contre.includes('c:direct'));
assert.ok(!evaluer(new Set([...naif, 'c:labo1', 'x:fenetre']), 4, 1).contre.length);

// Partie : la Rampe se termine, le corbeau s'ouvre directement ; A le résout ; débrief « corbeau ».
const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let st = createGame({ seed: 'corbeau' });
st.variantes = { 1: 'a', 2: 'a' }; // ce scénario suit l'histoire d'origine (la variante b a son test, variantes.test.mjs)
st.meurtreDes = 0; st.meurtre2Des = 1;
st = resolveTurn(st, { players }).state;
assert.equal(affaire(st, st.enquete.n).cas, 'rampe');
st = resolveTurn(st, { players, orders: { A: base, B: base, C: base } }).state;
// La Rampe résolue au jour 2 (pièces données pour le test) : le corbeau s'ouvre le soir même.
st.zones.A.enquete.pieces.push({ f: 'moy:1', j: 1 }, { f: 'Rb:4', j: 1 }, { f: 'occ:4', j: 1 });
st = resolveTurn(st, { players, orders: { A: { ...base, accusation: 1, confront: ['moy:1', 'Rb:4', 'occ:4'] }, B: base, C: base } }).state;
assert.equal(st.corbeauDes, st.enquete.n, 'le corbeau suit directement la Rampe');
let c = affaire(st, st.enquete.n);
assert.equal(c.cas, 'corbeau');
for (const u of 'ABC') st.zones[u].budget = 80;
// Jour 1 : A fait le tour des destinataires et vérifie l'alibi d'Hélène ; B soumet une hypothèse ; C confond Bernard (faux).
let r = resolveTurn(st, { players, orders: {
  A: { ...base, demarches: ['temoin', 'alibi:4'] },
  B: { ...base, demarches: ['cam'], hypo: { i: 0, s: 1 } },
  C: { ...base, accusation: 0, confront: ['doc:pvc', 'doc:journal', 'A:0'] },
} });
st = r.state;
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'c:dest'));
assert.ok(st.zones.B.rapport.some((x) => /juge d’instruction a lu ton hypothèse/.test(x)));
assert.equal(st.zones.C.enquete.exclu, true, 'Bernard : mauvaise personne');
assert.ok(st.zones.C.rapport.some((x) => /rien à voir avec les lettres et les affiches du corbeau/.test(x)));
// Jour 2 : A perquisitionne la librairie (mandat : l'alibi d'Hélène) et découvre la septième affiche.
r = resolveTurn(st, { players, orders: { A: { ...base, demarches: ['temoin', 'moyens:4'] }, B: base, C: base } });
st = r.state;
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'moy:4'));
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'c:septieme'));
// Jour 3 : A recoupe la septième affiche avec le PV, et réentend Hélène face à la septième affiche.
r = resolveTurn(st, { players, orders: { A: { ...base, recoup: ['c:septieme', 'doc:pvc'], reaud: { i: 4, f: 'c:septieme' } }, B: base, C: base } });
st = r.state;
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'x:sept' && p.src === 'recoup'));
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'Rb:4'));
// Jour 4 : confrontation avec le vrai mobile.
const avant = st.zones.A.stats.limier;
const n = st.enquete.n;
r = resolveTurn(st, { players, orders: { A: { ...base, accusation: 4, confront: ['moy:4', 'x:sept', 'Rb:4'], mobile: 2 }, B: base, C: base } });
st = r.state;
assert.ok(st.zones.A.rapport.some((x) => /passe aux aveux/.test(x)));
assert.ok(st.zones.A.rapport.some((x) => /tu avais aussi compris pourquoi/.test(x)));
assert.ok(st.zones.A.stats.limier > avant);
assert.ok(!st.traques.some((t) => t.n === n), 'pas de traque');
assert.notEqual(affaire(st, st.enquete.n).meurtre, true, 'la suivante : un vol');
const db = construireDebrief(st, c, 'aveux', { jour: 4, decouvreurs: ['A'], arreteurs: ['A'] });
assert.equal(db.genre, 'corbeau');

// Déclic : avec les destinataires, la septième affiche et le direct, une lettre en ruban arrive.
{
  let s2 = createGame({ seed: 'declic-c' });
  s2.meurtreDes = -1; s2.meurtre2Des = 0; s2.corbeauDes = 1;
  s2 = resolveTurn(s2, { players }).state;
  assert.equal(affaire(s2, s2.enquete.n).cas, 'corbeau');
  for (const u of 'ABC') s2.zones[u].budget = 80;
  s2 = resolveTurn(s2, { players, orders: { A: { ...base, demarches: ['temoin', 'cam'] }, B: base, C: base } }).state;
  assert.ok(!s2.zones.A.enquete.pieces.some((p) => p.f === 'd:lettre'), 'pas encore : il faut la septième affiche');
  s2 = resolveTurn(s2, { players, orders: { A: { ...base, demarches: ['temoin'] }, B: base, C: base } }).state;
  assert.ok(s2.zones.A.enquete.pieces.some((p) => p.f === 'd:lettre' && p.src === 'declic'));
  assert.ok(opposables(affaire(s2, s2.enquete.n), s2.zones.A.enquete).has('d:lettre'));
  assert.ok(mandatOk(affaire(s2, s2.enquete.n), s2.zones.A.enquete, 0), 'la lettre au commissariat ouvre le mandat chez Bernard');
}

// Maître du jeu : le corbeau est ouvrable, une seule fois.
{
  let w = createGame({ seed: 'mj-corbeau' });
  w = resolveTurn(w, { players }).state;
  w.meurtreDes = undefined; w.meurtre2Des = undefined;
  assert.ok(affairesOuvrables(w).some((x) => x.cas === 'corbeau'));
  assert.ok(ouvrirAffaireMaintenant(w, 'corbeau') != null);
  assert.equal(affaire(w, w.enquete.n).cas, 'corbeau');
  assert.ok(!affairesOuvrables(w).some((x) => x.cas === 'corbeau'), 'en cours : pas rouvrable');
}
console.log('corbeau : OK');
