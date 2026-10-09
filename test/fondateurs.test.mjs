// Zones fondatrices : au moins 7 soirs joués en saison 1, gardé à vie, jamais attribué en saison 2 ou après.
import assert from 'node:assert/strict';
import { createGame, resolveTurn, FONDATEUR_SOIRS } from '../js/engine/resolve.js';
import { SEASON_LENGTH } from '../js/engine/constants.js';

const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const nuit = (s, qui) => { const r = resolveTurn(s, { players, orders: Object.fromEntries(qui.map((u) => [u, { ...base }])) }); r.state.nextDeadline += 864e5; return r.state; };

let s = createGame({ seed: 'fond-1', regles: 1, turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
// A joue tous les soirs, B exactement le seuil, C deux soirs de moins.
for (let t = 1; s.season === 1; t++) {
  const qui = ['A'];
  if (t <= FONDATEUR_SOIRS + 1) qui.push('B'); // le premier tour d'une zone ne compte pas toujours : on vérifie le compteur réel ci-dessous
  if (t <= FONDATEUR_SOIRS - 2) qui.push('C');
  const avant = s;
  s = nuit(s, qui);
  if (s.season === 1) continue;
  for (const u of ['A', 'B', 'C']) {
    const joues = avant.zones[u].toursJoues;
    assert.equal(!!s.zones[u].fondateur, joues >= FONDATEUR_SOIRS, `${u} : ${joues} soirs joués`);
  }
  assert.ok(t <= SEASON_LENGTH + 1);
}
assert.ok(s.zones.A.fondateur, 'A a joué toute la saison');
assert.ok(!s.zones.C.fondateur, 'C a arrêté trop tôt');
assert.deepEqual(s.zones.A.fondateur, { season: 1 });

// Saison 2 → 3 : le titre est gardé, et personne ne le gagne en saison 2 (même en jouant tout).
while (s.season === 2) s = nuit(s, ['A', 'B', 'C']);
assert.equal(s.season, 3);
assert.ok(s.zones.A.fondateur, 'gardé en saison 3');
assert.ok(!s.zones.C.fondateur, 'pas attribué à la fin de la saison 2');
console.log('fondateurs : ok');
