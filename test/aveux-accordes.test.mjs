// Aveux accordés par le maître du jeu (9 octobre 2026) : des zones ont confronté le bon suspect sans les pièces décisives ;
// le maître du jeu leur accorde les aveux, le tour recalculé clôt l'affaire et, avec la fin à la clôture de l'enquête, bascule en saison 2.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, casDe, ouvrirAffaireMaintenant } from '../js/engine/enquete.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
const nuit = (s, o) => { const r = resolveTurn(s, { players, orders: o }); r.state.nextDeadline += 864e5; return r; };
const O = (x = {}) => ({ A: { ...base, ...(x.A || {}) }, B: { ...base, ...(x.B || {}) }, C: { ...base, ...(x.C || {}) } });

let s = createGame({ seed: 'aveux', turnDeadline: Date.parse('2026-09-28T18:00:00Z') });
for (let k = 0; k < 9; k++) s = nuit(s, O()).state;
s.meurtreDes = -6; ouvrirAffaireMaintenant(s, 'rampe', 0);
for (let k = 0; k < 3; k++) s = nuit(s, O()).state;
const n0 = s.enquete.n, aff = affaire(s, n0);
for (const f of ['moy:1', 'mob:1', 'occ:1']) if (!s.zones.A.enquete.pieces.some((p) => p.f === f)) s.zones.A.enquete.pieces.push({ f, j: 2, src: 'demarche' });
// Soir 1 : A confronte le bon suspect avec une seule pièce décisive → il nie.
let r = nuit(s, O({ A: { accusation: aff.coupable, confront: ['moy:1', 'mob:1', 'occ:1'] } }));
s = r.state;
assert.ok(s.zones.A.rapport.some((l) => /nie tout et repart libre/.test(l) && l.includes(aff.suspects[aff.coupable].nom)));
assert.equal(s.season, 1);
// Le maître du jeu accorde les aveux à A (et, par erreur, à C qui n'a rien fait : C reçoit aussi les aveux, c'est son choix).
s.aveuxAccordes = { n: n0, uids: ['A'] };
s.finSaison = 'enquete';
r = nuit(s, O());
s = r.state;
assert.equal(s.season, 2, 'bascule en saison 2');
assert.equal(s.aveuxAccordes, undefined);
assert.ok(r.gazette.enquete.decouverte && r.gazette.enquete.decouverte.uids.includes('A'));
assert.deepEqual(r.gazette.enquete.decouverte.uids, ['A']);
assert.equal(casDe(s, s.enquete.n), 'corbeau', 'le corbeau suit');
assert.ok(r.gazette.rapports.A.some((l) => /aveux te sont accordés/.test(l)));
// Aveux accordés sur une autre affaire (numéro périmé) : ignorés.
let t = createGame({ seed: 'aveux2' });
t = nuit(t, O()).state;
t.aveuxAccordes = { n: 999, uids: ['A'] };
const r2 = nuit(t, O());
assert.ok(!r2.gazette.enquete || !r2.gazette.enquete.decouverte);
assert.equal(r2.state.aveuxAccordes, undefined);
console.log('aveux-accordes : OK');
