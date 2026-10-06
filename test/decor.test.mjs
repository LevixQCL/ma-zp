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

// Skins Early birds.
import { SKINS, TOUS_SKINS, skinsValides, earlyBirdEligible, tirerSkin, skinDe } from '../js/engine/decor.js';
assert.equal(TOUS_SKINS.length, 13);
const st0 = { zones: { a: { uid: 'a' }, b: { uid: 'b' } } };
assert.ok(earlyBirdEligible(st0.zones.a, st0), 'avant la première résolution : toute zone existante');
const st1 = { ...st0, zones: { ...st0.zones, c: { uid: 'c' } }, earlyBird: { uids: ['a', 'b'] } };
assert.ok(!earlyBirdEligible(st1.zones.c, st1), 'une zone arrivée après n’a pas droit à la roulette');
assert.deepEqual(skinsValides({ skins: ['batiment:friterie'] }, { batiment: 'friterie', garage: 'grange' }), { batiment: 'friterie' }, 'seuls les skins possédés');
for (const a of [0, 0.5, 0.999]) assert.ok(skinDe(tirerSkin(a)));
assert.equal(tirerSkin(0), 'batiment:friterie');
assert.ok(SKINS.aile.options.serre);
console.log('skins : ok');
