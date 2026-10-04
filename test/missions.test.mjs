// Figures de l'équipe en mission : plusieurs le même soir, une par destination.
import assert from 'node:assert/strict';
import { missionsValides } from '../js/engine/equipe.js';
const o = { secteurs: { 3: 2, 5: 3 }, renfort: { cible: 'x', agents: 2 }, missions: [
  { role: 'inter', type: 'nondroit', secteur: '3' }, { role: 'rech', type: 'nondroit', secteur: '3' }, { role: 'prox', type: 'nondroit', secteur: '5' }, { role: 'roul', type: 'renfort' }] };
const v = missionsValides(o);
assert.deepEqual(v.map((x) => x.role), ['inter', 'prox', 'roul'], 'une figure par destination');
assert.equal(missionsValides({ secteurs: {}, missions: [{ role: 'inter', type: 'nondroit', secteur: '3' }] }).length, 0, 'pas de mission sans agents');
assert.equal(missionsValides({ secteurs: { 3: 1 }, mission: { role: 'inter', type: 'nondroit', secteur: '3' } }).length, 1, 'ancien format accepté');
console.log('OK : missions de l’équipe (plusieurs, une par destination).');
