// Énigmes : réussir n°1, n°2 et n°4 doit donner la prime (3 au choix sur 4), à partir du tour du 11 oct. 2026.
// Retour joueur du 10 oct. : l'écran annonçait « prime à 3 » sur 4 énigmes, mais la 4e ne comptait pas.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { slotsComptes } from '../js/quests/quests.js';

const tour = (fin, q) => {
  const state = createGame({ seed: 'quatre' });
  state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  state.nextDeadline = fin;
  const r = resolveTurn(state, { orders: { moi: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' } }, quests: { moi: q }, nextWeekday: 1 });
  return (r.gazette.rapports.moi || []).join('\n');
};
const q124 = [{ slot: 0, statut: 'ok', bonus: 'moral', service: 'intervention' }, { slot: 1, statut: 'ok' }, { slot: 2, statut: 'rate' }, { slot: 4, statut: 'ok' }];
const demain = Date.parse('2026-10-11T18:00:00Z'), hier = Date.parse('2026-10-10T18:00:00Z');

assert.deepEqual(slotsComptes(demain), [0, 1, 2, 4], 'les 4 énigmes comptent');
assert.deepEqual(slotsComptes(hier), [0, 1, 2], 'le tour déjà joué garde sa règle');
const apres = tour(demain, q124);
assert.match(apres, /prime des 3 réussies/, `n°1, n°2 et n°4 réussies : prime attendue\n${apres}`);
assert.doesNotMatch(apres, /pour le plaisir/);
const avant = tour(hier, q124);
assert.doesNotMatch(avant, /prime des 3 réussies/, 'ancienne règle inchangée pour le tour passé');
const deux = tour(demain, [{ slot: 0, statut: 'ok', bonus: 'moral', service: 'intervention' }, { slot: 1, statut: 'rate' }, { slot: 2, statut: 'rate' }, { slot: 4, statut: 'ok' }]);
assert.match(deux, /bonus/i, 'n°1 et n°4 : bonus');
assert.doesNotMatch(deux, /prime des 3 réussies/);
console.log('OK : énigmes, 3 au choix sur 4 pour la prime.');
