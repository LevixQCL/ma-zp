// Mise à prix de l'enquête : choix appliqué à la résolution suivante, confiscation par défaut.
import assert from 'node:assert/strict';
import { appliquerPrime, PRIME } from '../js/engine/enquete.js';
import { SERVICES, NIVEAU_MAX } from '../js/engine/constants.js';
const opts = { services: SERVICES, niveauMax: NIVEAU_MAX };
const zone = () => ({ budget: 10, niveaux: Object.fromEntries(SERVICES.map((s) => [s, 1])), renforts: [], primeAChoisir: { n: 3, titre: 'Test', suspect: 'X', tour: 5 } });

let z = zone();
assert.equal(appliquerPrime(z, 'renfort', 5, opts), null, 'pas le soir même de l’arrestation');
assert.ok(z.primeAChoisir);
z = zone(); appliquerPrime(z, null, 6, opts);
assert.equal(z.budget, 10 + PRIME.confiscation, 'confiscation par défaut'); assert.equal(z.primeAChoisir, undefined);
z = zone(); appliquerPrime(z, 'renfort', 6, opts);
assert.deepEqual(z.renforts[0], { n: PRIME.renfort.agents, debut: 7, retour: 7 + PRIME.renfort.tours, de: 'federal' });
z = zone(); appliquerPrime(z, 'formation:roulage', 6, opts);
assert.equal(z.niveaux.roulage, 2, 'formation offerte');
z = zone(); z.niveaux.roulage = NIVEAU_MAX; appliquerPrime(z, 'formation:roulage', 6, opts);
assert.equal(z.budget, 10 + PRIME.confiscation, 'formation impossible : confiscation');
z = zone(); appliquerPrime(z, 'formation:pirate', 6, opts);
assert.equal(z.budget, 10 + PRIME.confiscation, 'service inconnu : confiscation');
console.log('OK : mise à prix (défaut, renfort, formation, garde-fous).');
