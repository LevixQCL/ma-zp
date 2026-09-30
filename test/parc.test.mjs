// Parc automobile : noms stables, réparation ciblée d'un véhicule cabossé.
import assert from 'node:assert/strict';
import { parcVehicules, cabossesChoisis, typeVehicule, nomVehicule } from '../js/engine/parc.js';
import { reparerCabosses, coutCarrosserie } from '../js/engine/sinistres.js';
import { carrosserieOrdre, coutDepenses } from '../js/engine/zone.js';

assert.equal(typeVehicule(0), 'combi'); assert.equal(typeVehicule(2), 'anonyme');
assert.equal(nomVehicule(3), 'Combi 3'); assert.equal(nomVehicule(5), 'Anonyme 2');

const z = { vehicules: 6, cabosses: [{ depuis: 3, slot: 1 }, { depuis: 4, slot: 5 }, { depuis: 5 }], vehiculesHS: [{ retour: 8, slot: 4 }, { retour: 2 }], infra: {} };
const p = parcVehicules(z, 5);
assert.equal(p.length, 6);
assert.equal(p[1].etat, 'cabosse'); assert.equal(p[5].etat, 'cabosse'); assert.equal(p[4].etat, 'atelier'); assert.equal(p[4].jours, 3);
assert.equal(p.filter((v) => v.etat === 'cabosse').length, 3, 'cabossé sans place : placé sur une place libre');

assert.deepEqual(cabossesChoisis(z, true), [0, 1, 2]);
assert.deepEqual(cabossesChoisis(z, [2, 2, 9, -1, 'x']), [2]);
assert.deepEqual(carrosserieOrdre(z, []), false);
assert.equal(coutCarrosserie(z, [1]), 1.5);
assert.equal(coutDepenses({ carrosserie: [0, 2] }, z), 3);
assert.equal(coutDepenses({ carrosserie: true }, z), 4.5);

const n = reparerCabosses(z, 5, [1]);
assert.equal(n, 1);
assert.equal(z.cabosses.length, 2); assert.equal(z.cabosses[0].slot, 1);
assert.equal(z.vehiculesHS.at(-1).slot, 5, 'le véhicule réparé part à l’atelier sur sa place');
assert.equal(parcVehicules(z, 5)[5].etat, 'atelier');
console.log('parc : ok');
