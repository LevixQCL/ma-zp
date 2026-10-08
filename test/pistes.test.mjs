// Pistes en cours (Lot 4) : lancées avec les ordres, résultat une à trois nuits plus tard, dans le rapport et « Cette nuit ».
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { carteQuartiers } from '../js/engine/quartiers.js';
import { PISTES, pisteImpossible } from '../js/engine/pistes.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let state = createGame({ seed: 'test-pistes' });
state = resolveTurn(state, { players }).state;
const quartier = Number((carteQuartiers(state).deZone.A || [])[0]);
const b0 = state.zones.A.budget;
const T0 = state.turn;
let r = resolveTurn(state, { players, orders: { A: { ...base, pistesNew: [{ type: 'indic' }, { type: 'filature', cible: 1 }, { type: 'dialogue', cible: quartier }] }, B: base, C: base } });
state = r.state;
const A = state.zones.A;
assert.equal(A.pistes.length, 3, 'trois pistes en cours');
assert.ok(A.rapport.filter((l) => l.startsWith('Piste lancée')).length === 3);
assert.ok(A.blesses.some((b) => b.motif === 'en filature'), 'l’enquêteur en filature est absent');
assert.ok(pisteImpossible(state, A, 'indic', null), 'pas deux indics en même temps');
void b0; void T0; void PISTES;
// Sans venir, les résultats tombent quand même.
let vus = 0;
for (let k = 0; k < 4; k++) { r = resolveTurn(state, { players, orders: { A: base, B: base, C: base } }); state = r.state; vus += (state.zones.A.cetteNuit || []).length; }
assert.equal(state.zones.A.pistes.length, 0, 'toutes les pistes sont revenues');
assert.equal(vus, 3, 'trois résultats dans « Cette nuit »');
assert.ok(!JSON.stringify(state).includes('undefined'));
console.log('OK : pistes en cours.');
