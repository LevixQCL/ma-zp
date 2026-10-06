import assert from 'node:assert/strict';
import { createGame, buildJoinZone, resolveTurn } from '../js/engine/resolve.js';
import { coutDecision, decisionImpossible } from '../js/engine/zone.js';
let st = createGame({ seed: 'prepa' });
st.zones.a = buildJoinZone(st, 'a', { code: '1111', nom: 'A', couleur: '#fff' }, 1);
const players = { a: { nom: 'A', code: '1111' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
for (let k = 0; k < 3; k++) {
  const z = st.zones.a;
  assert.equal(coutDecision(z, { type: 'equiper', cible: 'prepa' }), [4, 6, 8][k]);
  st = resolveTurn(st, { players, orders: { a: { ...base, decision: { type: 'equiper', cible: 'prepa' } } } }).state;
  assert.equal(st.zones.a.prepa, k + 1, st.zones.a.rapport.join('\n'));
}
assert.ok(decisionImpossible(st.zones.a, { type: 'equiper', cible: 'prepa' }, st.turn));
console.log('OK : préparation des combis (coût, niveaux, maximum).');
