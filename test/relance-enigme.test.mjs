// Relance d'une énigme ratée : 30 PS, même type, un niveau plus dure ; réussie, elle compte comme une bonne réponse.
import assert from 'node:assert/strict';
import { questsFor, RELANCE_PS, DIFF_NOIR } from '../js/quests/quests.js';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';

const args = { seed: 'r', uid: 'moi', season: 2, turn: 4, weekday: 3, formes: true, quatre: true };
const base = questsFor(args), rel = questsFor({ ...args, relance: 1 });
const q0 = base.find((q) => q.slot === 1), q1 = rel.find((q) => q.slot === 1);
assert.equal(q1.type, q0.type, 'même type'); assert.equal(q1.difficulte, Math.min(DIFF_NOIR, q0.difficulte + 1), 'un niveau au-dessus'); assert.ok(q1.relance);
assert.notEqual(JSON.stringify(q1.choix || q1.answer), JSON.stringify(q0.choix || q0.answer), 'une autre énigme');
assert.deepEqual(rel.filter((q) => q.slot !== 1).map((q) => q.id), base.filter((q) => q.slot !== 1).map((q) => q.id), 'les autres ne bougent pas');

const fin = Date.parse('2026-10-15T18:00:00Z');
const tour = (ps, relance, q1statut = 'rate') => {
  const st = createGame({ seed: 'relance' }); st.nextDeadline = fin;
  st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1); st.zones.moi.ps = ps;
  const quests = { moi: [{ slot: 0, statut: 'ok', bonus: 'moral', service: 'intervention' }, { slot: 1, statut: q1statut }, { slot: 2, statut: 'ok' }, null, { slot: 4, statut: 'rate' }] };
  const r = resolveTurn(st, { orders: { moi: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal', relance } }, quests, nextWeekday: 4 });
  return { z: r.state.zones.moi, rap: (r.gazette.rapports.moi || []).join('\n') };
};
let t = tour(100, { slot: 1, statut: 'ok' });
assert.equal(t.z.psDepense, RELANCE_PS); assert.match(t.rap, /prime des 3 réussies/, 'la relance réussie compte pour la prime');
assert.ok(t.z.enigCarriere.ok >= 3 && t.z.enigCarriere.n === t.z.enigCarriere.ok + 1, 'compte comme une réussite au classement (1 seul échec : la 4e)');
t = tour(100, { slot: 1, statut: 'rate' });
assert.equal(t.z.psDepense, RELANCE_PS, 'payée même ratée'); assert.doesNotMatch(t.rap, /prime des 3/);
t = tour(10, { slot: 1, statut: 'ok' });
assert.ok(!t.z.psDepense, 'pas assez de PS : pas payée'); assert.doesNotMatch(t.rap, /prime des 3/); assert.match(t.rap, /pas payée/);
t = tour(100, { slot: 1, statut: null });
assert.ok(!t.z.psDepense, 'relance commencée mais pas répondue : rien payé');
t = tour(100, { slot: 1, statut: 'ok' }, 'ok');
assert.ok(!t.z.psDepense, 'pas de relance sur une énigme réussie');
console.log('OK : relance d’énigme ratée.');
