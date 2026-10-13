// Révision d'oct. 2026 (lots 1 à 3), seules règles en vigueur depuis le retrait de la saison 1.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { IPZ_POIDS, CLASSEMENT, RYTHMES, DOCTRINES } from '../js/engine/constants.js';
import { moyenneIpz } from '../js/engine/zone.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };

// Poids, rythme, doctrine, deux dépenses au plus.
assert.equal(CLASSEMENT.recence, 0.93);
let s = createGame({ seed: 'v2' });
s = resolveTurn(s, { players }).state;
assert.equal(IPZ_POIDS.moral, 0.1); assert.equal(IPZ_POIDS.affaires, 0.35); assert.equal(RYTHMES.allege.moral, 2);
s.zones.A.budget = 100;
const r = resolveTurn(s, { players, orders: { A: { ...base, doctrine: 'judiciaire', depenses: { prime: true, prevention: true, soustraitance: true, reserve: 0 } }, B: base } });
s = r.state;
assert.equal(s.zones.A.doctrine, 'judiciaire');
assert.ok(s.zones.A.rapport.some((l) => /refusé : 2 dépenses par jour/.test(l)), 'la 3e dépense est refusée');
assert.ok(DOCTRINES.judiciaire);
// La doctrine ne change plus en cours de saison.
s = resolveTurn(s, { players, orders: { A: { ...base, doctrine: 'routiere' }, B: base } }).state;
assert.equal(s.zones.A.doctrine, 'judiciaire');
// Prime deux jours de suite : prix doublé.
s.zones.A.budget = 100;
s = resolveTurn(s, { players, orders: { A: { ...base, depenses: { prime: true } }, B: base } }).state;
const b0 = s.zones.A.budget;
s = resolveTurn(s, { players, orders: { A: { ...base, depenses: { prime: true } }, B: base } }).state;
assert.ok(s.zones.A.rapport.some((l) => /prix doublé/.test(l)), 'prime doublée le lendemain');
void b0;
// Classement : les jours en pilote automatique comptent.
for (let k = 0; k < 4; k++) s = resolveTurn(s, { players, orders: { A: base } }).state;
const zB = s.zones.B;
assert.ok(zB.ipzHist.some((x) => !x.joue));
assert.ok(moyenneIpz(zB) > 0, 'une zone en pilote automatique a une moyenne');
// Soirée chargée : deux demandes le même soir ; ne couvrir que la première = réussite partielle racontée.
{
  let c = createGame({ seed: 'conflit' });
  c = resolveTurn(c, { players }).state;
  const T = c.turn;
  c.zones.A.dir = c.zones.A.dir || {}; c.zones.A.dir.fe = { id: 'conflit', e: 'debut', tour: T, d: { k: 0 } };
  const r2 = resolveTurn(c, { players, orders: { A: { ...base, alloc: { intervention: 10, proximite: 2, recherche: 3, roulage: 2, admin: 3 } }, B: base } });
  assert.ok(r2.state.zones.A.rapport.some((l) => /fête de quartier a débordé/.test(l)), 'ce qui a été laissé de côté est raconté');
}
console.log('OK : règles v2 (poids, doctrine, dépenses, prime, classement).');
