// Personnalisation du commissariat : déblocages et validation des choix.
import assert from 'node:assert/strict';
import { DECOR, DECOR_DEFAUT, decorValide, decorDebloque, decorCompte } from '../js/engine/decor.js';

const debutant = { ps: 0, trophees: [] };
const confirme = { ps: 1300, trophees: [{ id: 'batisseur' }, { id: 'solidaire' }, { id: 'sauveur' }] };
assert.deepEqual(decorValide(debutant, { facade: 'brique', neon: 'ambre', abords: 'arbres' }), DECOR_DEFAUT, 'tout est verrouillé au départ');
assert.deepEqual(decorValide(confirme, { facade: 'verre', neon: 'ambre', abords: 'arbres' }), { facade: 'verre', neon: 'ambre', abords: 'arbres' });
assert.equal(decorValide(confirme, { facade: 'artdeco' }).facade, 'beton', 'art déco demande Incorruptible');
assert.equal(decorValide(confirme, { neon: 'inconnu' }).neon, 'bleu');
assert.equal(decorValide(confirme, null).facade, 'beton');
assert.ok(decorDebloque({ ps: 200 }, DECOR.facade.options.brique));
assert.ok(!decorDebloque({ ps: 199 }, DECOR.facade.options.brique));
assert.deepEqual(decorCompte(debutant), { n: 3, total: 17 });
console.log('decor : ok');
