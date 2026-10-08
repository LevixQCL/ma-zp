// Débrief d'affaire (« Dossier clos ») : publié dans la Gazette à l'arrestation, à la fuite, aux aveux et au classement.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, ENQ } from '../js/engine/enquete.js';
import { construireDebrief, piecesCles, piecesDisculpantes } from '../js/engine/debrief.js';
import { affaireMeurtre } from '../js/engine/meurtre-mons.js';
import { affaireMeurtreRampe } from '../js/engine/meurtre-rampe.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };

// 1. Vol : A cherche, B se trompe, A partage, C démasque ; la traque arrête l'auteur → débrief dans la Gazette.
let state = createGame({ seed: 'test-debrief' });
state = resolveTurn(state, { players }).state;
const aff = affaire(state, state.enquete.n);
const faux = (aff.coupable + 1) % ENQ.nbSuspects;
const c = aff.coupable;
let r = resolveTurn(state, { players, orders: { A: { ...base, demarches: ['labo', `alibi:${c}`] }, B: { ...base, accusation: faux }, C: base } });
state = r.state;
assert.ok(!r.gazette.enquete.debriefs, 'pas de débrief tant que l’affaire court');
const aPieces = state.zones.A.enquete.pieces.filter((p) => p.src !== 'ouverture').map((p) => p.f).slice(0, 2);
state = resolveTurn(state, { players, orders: { A: { ...base, partages: aPieces.map((f) => ({ f, a: 'C' })) }, B: base, C: base } }).state;
// Le parquet exige un dossier qui écarte les autres suspects (et le juge, des caractéristiques de la planque) : on les donne à C.
{ const d = state.zones.C.enquete, add = (f) => { if (!d.pieces.some((p) => p.f === f)) d.pieces.push({ f, j: state.enquete.jour, src: 'test' }); };
  for (const e of ['mob', 'moy', 'occ']) add(`c:${e}`);
  aff.suspects.forEach((sus, i) => { for (const e of ['mob', 'moy', 'occ']) if (!sus.statut[e]) add(`${e}:${i}`); });
  for (const k of ['humidite', 'temperature', 'rive', 'acces']) add(`p:${k}`); }
r = resolveTurn(state, { players, orders: { A: base, B: base, C: { ...base, accusation: c } } });
state = r.state;
assert.ok(r.gazette.enquete.decouverte);
assert.ok(!r.gazette.enquete.debriefs, 'à la découverte, la traque commence : pas encore de débrief (la planque resterait secrète)');
assert.equal(state.traques[0].jour, 3, 'la traque retient le jour de la découverte');
const avantTraque = JSON.parse(JSON.stringify(state));
r = resolveTurn(state, { players, orders: { A: base, B: base, C: { ...base, traque: { n: aff.n, planque: aff.planque, agents: 5 } } } });
const db = r.gazette.enquete.debriefs && r.gazette.enquete.debriefs[0];
assert.ok(db, 'débrief publié à l’arrestation');
assert.equal(db.issue, 'arrestation');
assert.equal(db.n, aff.n);
assert.equal(db.jours, 3);
assert.equal(db.coupable.nom, aff.suspects[c].nom);
assert.equal(db.planque.nom, aff.planques[aff.planque].nom);
assert.equal(db.cles.length, 7, 'mobile, moyen, occasion + 4 indices de planque');
const occ = db.cles.find((k) => k.f === `occ:${c}`);
assert.deepEqual(occ.par, ['A'], 'A a trouvé l’alibi de l’auteur le premier');
assert.equal(occ.j, 1);
assert.equal(db.pistes.length, 4, 'quatre innocents');
for (const p of db.pistes) assert.equal(p.pieces.length, 1, 'une pièce écarte chaque innocent');
assert.ok(!(db.pistes.find((p) => p.i === faux).accusePar || []).length, 'l’accusation sans dossier de B a été refusée : pas de fausse accusation');
const zB = db.zones.find((z) => z.uid === 'B'), zC = db.zones.find((z) => z.uid === 'C'), zA = db.zones.find((z) => z.uid === 'A');
assert.ok(!zB || zB.accuse == null, 'B n’a pas pu accuser sans dossier');
assert.ok(zC.juste && zC.arrete);
assert.equal(zA.donnees, aPieces.length, 'les pièces données par A');
assert.equal(db.zones[0].uid, 'C', 'la zone qui a démasqué l’auteur en tête');
assert.ok(db.chrono.some((x) => x.t === 'decouverte' && x.j === 3));
assert.ok(JSON.stringify(db).length < 12000, 'débrief compact (Gazette)');
assert.ok(!/undefined|NaN/.test(JSON.stringify(db)));

// 2. Fuite : débrief aussi.
const fu = resolveTurn(avantTraque, { players, orders: { A: base, B: base, C: base } });
assert.equal(fu.gazette.enquete.debriefs[0].issue, 'fuite');

// 3. Classée au bout de 7 jours.
let s2 = createGame({ seed: 'debrief-classee' });
s2 = resolveTurn(s2, { players }).state;
let dbc = null;
for (let i = 0; i < ENQ.dureeMax; i++) {
  const g = resolveTurn(s2, { players, orders: { A: { ...base, demarches: ['labo'] }, B: base, C: base } }); s2 = g.state;
  if (g.gazette.enquete.classee) dbc = g.gazette.enquete.debriefs[0];
}
assert.ok(dbc && dbc.issue === 'classee' && dbc.jours === ENQ.dureeMax);
assert.ok(dbc.theatre && typeof dbc.theatre.juste === 'boolean', 'coup de théâtre du jour 3 expliqué');

// 4. Meurtres écrits : pièces clés = décisives, chaque innocent a sa pièce disculpante.
for (const am of [affaireMeurtre(4), affaireMeurtreRampe(5)]) {
  assert.ok(piecesCles(am).length >= 3);
  const d = piecesDisculpantes(am);
  assert.equal(d.length, 4);
  for (const p of d) assert.ok(p.fs.length >= 1, `innocent ${p.i} sans pièce disculpante`);
  const fake = { zones: {} };
  const out = construireDebrief(fake, am, 'aveux', { jour: 5 });
  assert.equal(out.coupable.i, am.coupable);
  assert.ok(!/undefined|NaN/.test(JSON.stringify(out)));
}

console.log('OK : débrief d’affaire vérifié.');
