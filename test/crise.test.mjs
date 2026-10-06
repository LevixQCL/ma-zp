// Crise du district : annonce, vote (une voix par zone), plan appliqué 3 jours, opération commune.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { criseCourante, planDuJour } from '../js/engine/crise.js';

const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
let st = createGame({ seed: 'crt' });
const uids = ['a', 'b', 'c', 'd', 'e'];
for (const u of uids) st.zones[u] = newZone({ uid: u, code: '5300', nom: u }, 1);
// a et b votent C, c vote A, d et e ne votent pas : C l'emporte 2 contre 1.
const votes = { a: 2, b: 2, c: 0 };
let vu = false, planVu = 0, cIrrigue = false;
for (let t = 1; t <= 6; t++) {
  const c = criseCourante(st);
  const orders = {};
  for (const u of uids) { orders[u] = { alloc: BASE, rythme: 'normal' }; if (c && c.vote === st.turn && u in votes) orders[u].crise = votes[u]; }
  if (c && planDuJour(st) === 'C') orders.d.criseC = 'oui'; // d rejoint
  const r = resolveTurn(st, { orders });
  st = r.state;
  const c2 = criseCourante(st);
  if (c2 && c2.plan) { vu = true; assert.equal(c2.plan, 'C'); assert.deepEqual(c2.votes, [1, 0, 2]); assert.ok(c2.participants.a && c2.participants.b && !c2.participants.c); }
  if (c2 && c2.nuits) { planVu = c2.nuits.length; cIrrigue = c2.nuits.every((x) => x.n === 3); }
}
assert.ok(vu, 'une crise a été votée');
assert.equal(planVu, 3, 'trois soirs d’opération commune');
assert.ok(cIrrigue, 'a, b et d (qui a rejoint) participent');
console.log('crise : ok');
