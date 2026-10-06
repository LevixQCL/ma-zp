// Flotte : modèles, état propre à chaque véhicule, places, revente, migration des anciennes parties.
import assert from 'node:assert/strict';
import { createGame, buildJoinZone, resolveTurn, migrateState } from '../js/engine/resolve.js';
import { MODELES, assurerFlotte, ajouterVehicule, retirerVehicule, placesIntervention, prixRevente, usureDuTour, reviser, vehiculesUrgence, entretienFlotte, protectionFourgons } from '../js/engine/flotte.js';
import { risqueBlessure } from '../js/engine/constants.js';
import { parcVehicules } from '../js/engine/parc.js';
import { coutDecision } from '../js/engine/zone.js';

// 1. Migration : une ancienne zone garde son nombre de véhicules et son usure, en combis diesel.
{
  const z = { vehicules: 5, usure: 30, cabosses: [{ slot: 2 }], vehiculesHS: [] };
  assurerFlotte(z);
  assert.equal(z.flotte.length, 5); assert.ok(z.flotte.every((v) => v.m === 'diesel' && v.u === 30));
  assert.equal(z.vehicules, 5); assert.equal(z.usure, 30);
}
// 2. Ajouter, retirer : les places des cabossés et immobilisés suivent.
{
  const z = assurerFlotte({ vehicules: 4, usure: 0, cabosses: [{ slot: 1 }, { slot: 3 }], vehiculesHS: [{ slot: 2, retour: 9 }] });
  ajouterVehicule(z, 'electrique', 3);
  assert.equal(z.vehicules, 5); assert.equal(z.flotte[4].m, 'electrique');
  retirerVehicule(z, 1);
  assert.deepEqual(z.cabosses.map((c) => c.slot), [2], 'le cabossé de la place 3 passe en 2, celui de la place 1 part avec le véhicule');
  assert.deepEqual(z.vehiculesHS.map((c) => c.slot), [1]);
  assert.equal(z.vehicules, 4);
}
// 3. Usure par modèle, révision, moyenne.
{
  const z = assurerFlotte({ vehicules: 0, usure: 0, cabosses: [], vehiculesHS: [] });
  for (const m of ['diesel', 'electrique', 'fourgon']) ajouterVehicule(z, m);
  usureDuTour(z, 3, false);
  const [d, e, f] = z.flotte.map((v) => v.u);
  assert.ok(e < d && f < d && e < f, 'électrique et fourgon s’usent moins');
  assert.equal(z.usure, Math.round(((d + e + f) / 3) * 10) / 10);
  reviser(z, 20); assert.ok(z.flotte.every((v) => v.u === 0));
}
// 4. Places, recharge, protection, entretien, revente.
{
  const z = assurerFlotte({ vehicules: 0, usure: 0, cabosses: [], vehiculesHS: [] });
  for (const m of ['diesel', 'electrique', 'anonyme', 'fourgon']) ajouterVehicule(z, m);
  assert.equal(placesIntervention(z, 0, 'normal'), 2.5 + 2.5 + 2 + 3.5);
  assert.equal(placesIntervention(z, 0, 'renforce'), 2.5 + 1.5 + 2 + 3.5, 'électrique en recharge le soir en rythme renforcé');
  z.vehiculesHS = [{ slot: 3, retour: 5 }];
  assert.equal(placesIntervention(z, 2), 7, 'le fourgon à l’atelier ne compte pas');
  assert.equal(protectionFourgons(z), 0.9);
  assert.ok(Math.abs(risqueBlessure(z) - 0.9) < 1e-9);
  assert.equal(entretienFlotte(z), 0.75);
  assert.equal(prixRevente(z, 1), Math.round(MODELES.electrique.prix * 0.6 * 10) / 10);
  z.flotte[0].u = 70; assert.equal(prixRevente(z, 0), Math.round(6 * 0.18 * 10) / 10);
  z.cabosses = [{ slot: 2 }]; assert.equal(prixRevente(z, 2), Math.round(7 * 0.6 * 0.7 * 10) / 10);
  assert.equal(coutDecision(z, { type: 'equiper', cible: 'vehicule', modele: 'fourgon' }), MODELES.fourgon.prix);
  const l = vehiculesUrgence(z, 2);
  assert.ok(!l.some((v) => v.slot === 3) && l[0].mult >= l[l.length - 1].mult, 'urgence : véhicules en service, du plus rapide au plus lent');
  const noms = parcVehicules(z, 2).map((v) => v.nom);
  assert.deepEqual(noms, ['Combi 1', 'Électrique 1', 'Anonyme 1', 'Fourgon 1']);
}
// 5. Résolution : achat d'un modèle, revente, entretien ; une ancienne partie migre sans changer ses véhicules.
{
  const H = 3600 * 1000, d0 = Date.UTC(2026, 9, 2, 18);
  let st = createGame({ seed: 'flotte', turnDeadline: d0 });
  st.zones.a = buildJoinZone(st, 'a', { code: '1111', nom: 'A', couleur: '#fff' }, 1);
  const players = { a: { nom: 'A', code: '1111' } };
  const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
  st.zones.a.batiments.garage = 3; // de la place au garage
  st = resolveTurn(st, { players, orders: { a: { ...base, decision: { type: 'equiper', cible: 'vehicule', modele: 'electrique' } } } }).state;
  assert.ok(st.zones.a.flotte.some((v) => v.m === 'electrique'), 'combi électrique livrée');
  assert.ok(st.zones.a.rapport.some((l) => l.includes('Combi électrique')));
  const n1 = st.zones.a.vehicules;
  st = resolveTurn(st, { players, orders: { a: { ...base, ventes: [0, 0, 99] } } }).state;
  assert.equal(st.zones.a.rapport.filter((l) => l.startsWith('Véhicule revendu')).length, 1, 'une seule revente (doublon et place inconnue ignorés)');
  assert.ok(st.zones.a.vehicules <= n1 - 1);
  // Ancienne partie : pas de flotte, 6 véhicules usés à 40 %.
  const vieux = JSON.parse(JSON.stringify(st));
  delete vieux.zones.a.flotte; vieux.zones.a.vehicules = 6; vieux.zones.a.usure = 40;
  migrateState(vieux);
  assert.equal(vieux.zones.a.flotte.length, 6); assert.equal(vieux.zones.a.usure, 40);
}
console.log('OK : flotte (modèles, usure par véhicule, places, revente, migration).');
