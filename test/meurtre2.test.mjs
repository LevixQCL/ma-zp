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
assert.ok(candidats(a, ['occ:0']).suspects.includes(0), 'la plaque seule ne blanchit pas Nathalie');
assert.ok(!candidats(a, ['occ:0', 'mob:2']).suspects.includes(0), 'plaque + message vocal : blanchie');
assert.ok(candidats(a, ['occ:3', 'x:heure']).suspects.includes(3));
assert.ok(!candidats(a, ['occ:3', 'x:heure', 'c:legiste2']).suspects.includes(3));

// Le récit : aucun texte mal formé ; seul l'assassin évoque le SMS de 22:41 dans son audition.
const d3 = dossierAffaire3('r', a);
assert.ok(!/undefined|NaN/.test(JSON.stringify(d3)));
d3.auditions.forEach((au, i) => assert.equal(/écrit à Nathalie|onze heures moins vingt/.test(JSON.stringify(au.qr)), i === a.coupable, au.qui));
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
// Réaudition : Olivier face au SMS de Nathalie.
assert.equal(pieceReaudition(a, { pieces: [{ f: 'mob:0' }] }, 1, 'mob:0'), 'Ra:1');

// Confrontation : deux décisives au moins, sur l'assassin.
assert.ok(!confrontationOk(a, 1, ['doc:journal', 'A:1', 'x:wifi']), 'une seule décisive');
assert.ok(confrontationOk(a, 1, ['x:wifi', 'moy:1', 'doc:journal']));
assert.ok(confrontationOk(a, 1, ['Rb:4', 'x:liste', 'c:cam']));
assert.ok(!confrontationOk(a, 1, ['x:wifi', 'moy:1', 'occ:2']), 'un leurre');
assert.ok(!confrontationOk(a, 0, ['x:wifi', 'moy:1', 'doc:journal']), 'mauvaise personne');

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
// Jour 1 : A fouille le bureau et vérifie l'alibi de Jérôme ; A recoupe le journal et rien (rien) ; B soumet une hypothèse.
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
assert.equal(st.zones.C.enquete.exclu, true, 'Nathalie : mauvaise personne');
// Jour 2 : A perquisitionne chez Olivier (mandat grâce aux badges) et réentend Jérôme face aux badges ; B recoupe la caméra et le journal.
r = resolveTurn(st, { players, orders: {
  A: { ...base, demarches: ['moyens:1'], reaud: { i: 4, f: 'occ:4' } },
  B: { ...base, recoup: ['c:cam', 'doc:journal'] },
  C: base,
} });
st = r.state;
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'moy:1'));
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'Rb:4'));
assert.ok(st.zones.B.enquete.pieces.some((p) => p.f === 'x:heure' && p.src === 'recoup'));
// Jour 3 : A confronte Olivier avec la perquisition, les aveux de Jérôme, et nomme le vrai mobile.
const avant = st.zones.A.stats.limier;
r = resolveTurn(st, { players, orders: { A: { ...base, accusation: 1, confront: ['moy:1', 'Rb:4', 'occ:4'], mobile: 2 }, B: base, C: base } });
st = r.state;
assert.ok(st.zones.A.rapport.some((x) => /tu avais aussi compris pourquoi/.test(x)));
assert.ok(st.zones.A.stats.limier >= avant + 20 + 30, 'aveux + mobile');
assert.ok(!st.traques.some((t) => t.n === 4), 'pas de traque');
assert.notEqual(affaire(st, st.enquete.n).meurtre, true, 'nouvelle affaire : un vol');
assert.equal(st.meurtre2Des, 4, 'une seule fois par partie');

// Déclic : avec les lettres et le relevé, une lettre anonyme arrive.
{
  let s2 = createGame({ seed: 'declic' });
  s2.meurtre2Des = 1; s2.meurtreDes = 0;
  s2 = resolveTurn(s2, { players }).state;
  assert.equal(affaire(s2, s2.enquete.n).cas, 'rampe');
  for (const u of 'ABC') s2.zones[u].budget = 80;
  for (let k = 0; k < 2; k++) s2 = resolveTurn(s2, { players, orders: { A: { ...base, demarches: ['temoin', 'cam'] }, B: base, C: base } }).state;
  assert.ok(s2.zones.A.enquete.pieces.some((p) => p.f === 'd:corbeau' && p.src === 'declic'));
  assert.ok(opposables(affaire(s2, s2.enquete.n), s2.zones.A.enquete).has('d:corbeau'));
}
console.log('meurtre2 : OK');
