// Quiz express : banque saine, séries sans répétition sur une saison, bonus appliqué à 3 bonnes réponses.
import assert from 'node:assert/strict';
import { QUIZ, QUIZ_BANQUE, quizDuJour } from '../js/quests/quiz.js';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { SEASON_LENGTH } from '../js/engine/constants.js';

for (const [th, b] of Object.entries(QUIZ_BANQUE)) {
  for (const q of b) assert.equal(new Set(q.slice(1)).size, 4, `${th} : 4 réponses distinctes — ${q[0]}`);
  assert.equal(new Set(b.map((q) => q[0])).size, b.length, `${th} : pas de doublon`);
}
const vus = new Set();
for (let t = 1; t <= SEASON_LENGTH; t++) {
  const s = quizDuJour({ seed: 'x', uid: 'u1', season: 1, turn: t });
  assert.equal(s.length, QUIZ.questions);
  assert.equal(new Set(s.map((q) => q.theme)).size, 3, 'trois thèmes chaque jour');
  for (const q of s) { assert.ok(!vus.has(q.id), `répétée : ${q.id}`); vus.add(q.id); assert.ok(q.bonne >= 0 && q.bonne < 4); }
}
const autre = quizDuJour({ seed: 'x', uid: 'u2', season: 1, turn: 1 }).map((q) => q.id).join();
assert.notEqual(autre, quizDuJour({ seed: 'x', uid: 'u1', season: 1, turn: 1 }).map((q) => q.id).join(), 'séries différentes par joueur');

function budgetApres(q) {
  const state = createGame({ seed: 'quiz' });
  state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  const r = resolveTurn(state, { orders: {}, quests: { moi: q } });
  return { b: r.state.zones.moi.budget, rap: r.gazette.rapports.moi.join(' | ') };
}
const base = budgetApres(null), gagne = budgetApres([{ slot: 0, statut: 'quiz', tentatives: 3, bonus: 'budget' }]), perdu = budgetApres([{ slot: 0, statut: 'quiz', tentatives: 2, bonus: 'budget' }]);
assert.ok(/Quiz express : 3 bonnes/.test(gagne.rap), gagne.rap);
assert.ok(/il en fallait 3/.test(perdu.rap), perdu.rap);
assert.ok(gagne.b > perdu.b, 'le bonus k€ est versé à 3 bonnes réponses');
console.log('quiz ok', base.b, gagne.b, perdu.b);
