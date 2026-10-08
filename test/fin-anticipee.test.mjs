// Fin de saison anticipée par le maître du jeu : à la clôture de l'enquête (la suivante continue), bilan allégé.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { ENQ } from '../js/engine/enquete.js';
import { calculerBilan, moyennesDistrict } from '../js/engine/bilan.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let s = createGame({ seed: 'fin-anticipee' });
for (let k = 0; k < 6; k++) s = resolveTurn(s, { players, orders: { A: base, B: base } }).state;
assert.equal(s.season, 1);
// L'affaire en cours devient la Rampe (affaire écrite) : le corbeau doit lui succéder, même à travers la bascule.
s.finSaison = 'enquete';
s = resolveTurn(s, { players, orders: { A: base, B: base } }).state;
assert.equal(s.season, 1, 'pas de fin tant que l’enquête court');
s.meurtre2Des = s.enquete.n; delete s.corbeauDes;
s.enquete.jour = ENQ.dureeMax;
const n0 = s.enquete.n;
const r = resolveTurn(s, { players, orders: { A: base, B: base } });
s = r.state;
assert.equal(s.season, 2, 'la saison bascule le soir où l’affaire se clôt');
assert.equal(s.turn, 1);
assert.equal(s.regles, 2);
assert.equal(s.finSaison, undefined);
assert.equal(s.enquete.n, n0 + 1, 'une seule nouvelle affaire');
assert.equal(s.corbeauDes, n0 + 1, 'le corbeau suit la Rampe');
assert.ok(s.zones.A.enquete && s.zones.A.enquete.n === n0 + 1);
assert.ok(r.gazette.finSaison && r.gazette.finSaison.anticipee);
// « Ce soir » : bascule immédiate.
let t = createGame({ seed: 'fin-soir' });
t = resolveTurn(t, { players, orders: { A: base, B: base } }).state;
t.finSaison = 'soir';
t = resolveTurn(t, { players, orders: { A: base, B: base } }).state;
assert.equal(t.season, 2);
// Bilan allégé : nettement moins de pertes, au plus un niveau par élément.
const forte = { niveaux: { intervention: 4, proximite: 4, recherche: 4, roulage: 3, admin: 3 }, equip: { intervention: 4, proximite: 3, recherche: 3, roulage: 2, admin: 2 }, batiments: { bureaux: 3, garage: 3 }, toursJoues: 10 };
const faible = { niveaux: { intervention: 2, proximite: 1, recherche: 1, roulage: 1, admin: 1 }, equip: { intervention: 1, proximite: 1, recherche: 1, roulage: 1, admin: 1 }, batiments: { bureaux: 1, garage: 1 }, toursJoues: 10 };
const moy = moyennesDistrict([forte, faible]);
const n = calculerBilan(forte, moy, 'x').cas.length, l = calculerBilan(forte, moy, 'x', true).cas;
assert.ok(l.length < n / 2, `bilan léger ${l.length} contre ${n}`);
const parEl = {}; for (const c of l) parEl[`${c.k}:${c.s}`] = (parEl[`${c.k}:${c.s}`] || 0) + 1;
assert.ok(Object.values(parEl).every((v) => v <= 1));
console.log(`fin anticipée OK (bilan normal ${n} cas, allégé ${l.length})`);
