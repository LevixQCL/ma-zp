// Affaire de meurtre écrite à la main : cohérence, mandat, confrontation, partie complète.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, candidats, confrontationOk, mandatOk, pieceDemarche, texteFait, titrePiece, ENQ } from '../js/engine/enquete.js';
import { LIEUX_MONS } from '../js/engine/meurtre-mons.js';
import { dossierAffaire3 } from '../js/engine/dossier.js';

const a = affaire({ seed: 'm', meurtreDes: 4 }, 4);
assert.ok(a.meurtre && a.prof && a.planques.length === 0);
assert.equal(affaire({ seed: 'm', meurtreDes: 4 }, 5).meurtre, undefined, 'la suivante redevient un vol');
// Toutes les pièces ont un texte et un titre ; tous les lieux une adresse.
for (const f of [...a.faits, 'r:statue', 'r:temoin']) { assert.ok(texteFait(a, f).length > 40, f); assert.ok(titrePiece(a, f) && !/undefined/.test(titrePiece(a, f)), f); }
for (const s of a.suspects) assert.ok(LIEUX_MONS[s.alibi.pos], s.nom);
for (const l of Object.values(LIEUX_MONS)) assert.ok(l.adresse);
// Avec tout le dossier, un seul suspect reste : l'assassin. Sans les pièces qui blanchissent, tout le monde.
assert.deepEqual(candidats(a, a.faits).suspects, [a.coupable]);
assert.equal(candidats(a, a.faits.filter((f) => !f.startsWith('moy:') && !f.startsWith('R') && f !== 'occ:4' && f !== 'mob:3')).suspects.length, 5);
// Chaque innocent ment (ou se tait) : son secret est quelque part dans le dossier.
for (const [i, fs] of Object.entries(a.innocente)) for (const f of fs) assert.ok(a.faits.includes(f), `${i} ${f}`);
// Mandat : refusé sans pièce sérieuse, accordé avec.
const vide = { pieces: [] };
assert.equal(mandatOk(a, vide, 2), false);
assert.equal(pieceDemarche(a, vide, 'moyens:2'), null);
assert.equal(mandatOk(a, { pieces: [{ f: 'c:agenda' }] }, 2), true);
assert.equal(pieceDemarche(a, { pieces: [{ f: 'c:agenda' }] }, 'moyens:2'), 'moy:2');
// Démarches de la scène : une pièce à la fois, dans l'ordre.
assert.equal(pieceDemarche(a, vide, 'labo'), 'c:legiste1');
assert.equal(pieceDemarche(a, { pieces: [{ f: 'c:legiste1' }] }, 'labo'), 'c:legiste2');
// Confrontation.
assert.ok(!confrontationOk(a, 2, ['doc:journal', 'doc:pvc', 'occ:2']), 'les documents publics ne suffisent pas');
assert.ok(confrontationOk(a, 2, ['doc:journal', 'moy:2', 'occ:2']));
assert.ok(confrontationOk(a, 2, ['moy:2', 'occ:2', 'c:cafe']));
assert.ok(!confrontationOk(a, 2, ['c:cafe', 'c:cam', 'occ:2']), 'une seule décisive');
assert.ok(!confrontationOk(a, 2, ['doc:journal', 'occ:2', 'c:dette']), 'un leurre');
assert.ok(!confrontationOk(a, 1, ['doc:journal', 'moy:2', 'occ:2']), 'mauvais suspect');
// Le récit : aucun texte mal formé, et seul l'assassin parle de la statuette dans les auditions.
const d = dossierAffaire3('m', a);
assert.ok(!/undefined|NaN/.test(JSON.stringify(d)));
d.auditions.forEach((au, i) => assert.equal(/statuette|Saint Georges/.test(JSON.stringify(au.qr)), i === a.coupable));
assert.ok(/22:13/.test(d.journal.breve[1]) && /suppr/.test(d.journal.breve[1]));

// Partie complète : l'affaire n° 2 est le meurtre ; A confronte bien, B se trompe de pièces, C de personne.
const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let st = createGame({ seed: 'meurtre' });
st.variantes = { 2: 'a' }; // ce scénario suit l'histoire d'origine (la variante b a son test, variantes.test.mjs)
st = resolveTurn(st, { players }).state;
assert.equal(st.enquete.n, 1);
// On classe la première affaire en avançant les jours.
for (let k = 0; k < ENQ.dureeMax; k++) st = resolveTurn(st, { players, orders: { A: base, B: base, C: base } }).state;
assert.equal(st.enquete.n, 2); assert.equal(st.meurtreDes, 2);
let m = affaire(st, st.enquete.n);
assert.ok(m.meurtre);
assert.deepEqual(st.zones.A.enquete.pieces, [], 'pas de pièce d’ouverture');
// Jour 1 : A demande la perquisition chez Julien sans mandat (refusée) et le légiste.
st.zones.A.budget = 60; st.zones.B.budget = 60;
let r = resolveTurn(st, { players, orders: { A: { ...base, demarches: ['moyens:2', 'labo'] }, B: { ...base, accusation: 2, confront: ['c:cafe', 'c:cam', 'doc:journal'] }, C: { ...base, accusation: 0, confront: ['doc:journal', 'doc:pvc', 'occ:0'] } } });
st = r.state;
assert.ok(st.zones.A.rapport.some((x) => /refusée par le juge/.test(x)));
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'c:legiste1'));
assert.equal(st.zones.B.enquete.exclu, false, 'mauvaises pièces : pas écarté');
assert.equal(st.zones.B.enquete.accuse, null);
assert.equal(st.zones.C.enquete.exclu, true, 'mauvaise personne : écarté');
// A obtient l'alibi de Julien, puis le mandat, puis confronte.
st = resolveTurn(st, { players, orders: { A: { ...base, demarches: ['alibi:2', 'banque:2'] }, B: base, C: base } }).state;
st = resolveTurn(st, { players, orders: { A: { ...base, demarches: ['moyens:2'] }, B: base, C: base } }).state;
assert.ok(st.zones.A.enquete.pieces.some((p) => p.f === 'moy:2'));
const avant = st.zones.A.stats.limier;
r = resolveTurn(st, { players, orders: { A: { ...base, accusation: 2, confront: ['moy:2', 'occ:2', 'doc:journal'] }, B: base, C: base } });
st = r.state;
assert.ok(st.zones.A.stats.limier > avant, 'aveux : points');
assert.ok(!st.traques.some((t) => t.n === m.n), 'pas de traque');
assert.notEqual(affaire(st, st.enquete.n).meurtre, true, 'nouvelle affaire : un vol');
// Réaudition : Claire face à son bornage avoue sa liaison (et se blanchit) ; face à rien d'utile, rien.
{
  const { pieceReaudition, opposables } = await import('../js/engine/enquete.js');
  const m2 = affaire(st, st.enquete.n - 1);
  assert.equal(pieceReaudition(m2, { pieces: [{ f: 'mob:0' }] }, 0, 'mob:0'), 'Rb:0');
  assert.equal(pieceReaudition(m2, { pieces: [{ f: 'Rb:0' }] }, 0, 'mob:0'), null);
  assert.equal(pieceReaudition(m2, { pieces: [] }, 1, 'doc:journal'), null);
  assert.ok(opposables(m2, { pieces: [] }).has('A:2'));
  assert.ok(confrontationOk(m2, 2, ['Rg:2', 'occ:2', 'c:cam']), 'la statuette dont personne ne parlait');
  assert.ok(!confrontationOk(m2, 2, ['Rg:2', 'doc:journal', 'c:cam']), 'une seule preuve d’enquête');
  // Partie : une zone réentend Julien face à sa propre audition.
  let s2 = createGame({ seed: 'reaud' }); s2.meurtreDes = 1; s2.variantes = { 1: 'a' };
  s2 = resolveTurn(s2, { players }).state;
  s2.zones.A.budget = 20;
  s2 = resolveTurn(s2, { players, orders: { A: { ...base, reaud: { i: 2, f: 'A:2' } }, B: base, C: base } }).state;
  assert.ok(s2.zones.A.rapport.some((x) => /refusée par le magistrat/.test(x)), 'pas de réaudition sans pièce à charge');
  s2 = resolveTurn(s2, { players, orders: { A: { ...base, demarches: ['temoin'] }, B: base, C: base } }).state;
  s2 = resolveTurn(s2, { players, orders: { A: { ...base, reaud: { i: 2, f: 'A:2' } }, B: base, C: base } }).state;
  assert.ok(s2.zones.A.enquete.pieces.some((p) => p.f === 'Rg:2'), 'réaudition au dossier');
  assert.ok(s2.zones.A.rapport.some((x) => /change de version/.test(x)));
}
console.log('OK : affaire de meurtre vérifiée.');
