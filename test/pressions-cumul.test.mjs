// Situations du jour : leurs effets se cumulent (deux « +2 incidents » = +4), dans le moteur comme dans l'estimation des Ordres.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { effetsPressions, PRESSION_WEEKEND } from '../js/engine/contenu.js';

const nuit = { id: 'nuit', effet: { incidents: 2 } }, bourg = { id: 'bourgmestre', effet: { bourgmestre: true } };
assert.deepEqual(effetsPressions([PRESSION_WEEKEND, nuit, bourg]), { incidents: 4, bourgmestre: true });
assert.deepEqual(effetsPressions([{ effet: { adminMult: 0.5 } }, { effet: { adminMult: 0.8 } }]), { adminMult: 0.4 });
assert.deepEqual(effetsPressions([{ effet: { roulageMin: 3 } }, { effet: { roulageMin: 4, incidents: 2 } }]), { roulageMin: 4, incidents: 2 });
assert.deepEqual(effetsPressions(null), {});
// Plus aucun « Object.assign » qui écrase un effet par un autre.
for (const f of ['js/engine/resolve.js', 'js/ui/ordres.js']) assert.ok(!/pressions[^\n]*Object\.assign\(pr/.test(readFileSync(f, 'utf8')), `${f} écrase encore les effets`);
console.log('OK : situations du jour cumulées.');
