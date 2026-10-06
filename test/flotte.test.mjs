// Flotte : modèles, état propre à chaque véhicule, places, revente, migration des anciennes parties.
import assert from 'node:assert/strict';
import { createGame, buildJoinZone, resolveTurn, migrateState } from '../js/engine/resolve.js';
import { MODELES, assurerFlotte, ajouterVehicule, retirerVehicule, placesIntervention, prixRevente, usureDuTour, reviser, vehiculesUrgence, entretienFlotte, protectionFourgons } from '../js/engine/flotte.js';
import { risqueBlessure } from '../js/engine/constants.js';
import { parcVehicules } from '../js/engine/parc.js';
import { coutDecision, capacite, forceEngagement, decisionImpossible, sanitizeOrders } from '../js/engine/zone.js';
import { agentsMontes, primeVerte, bonusFilature, bonusOrdre, apportAchat, heritageFlotte, remplacerVehicule, RENDEMENT } from '../js/engine/flotte.js';

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
// Rendement : places libres → Roulage puis Proximité en voiture ; prime verte, filatures, fourgons (plafonnés).
{
  const z = assurerFlotte({ vehicules: 4, usure: 0, cabosses: [], vehiculesHS: [], niveaux: { intervention: 1, recherche: 1, roulage: 1, proximite: 1, admin: 1 }, equip: { intervention: 1, recherche: 1, roulage: 1, proximite: 1, admin: 1 }, moral: 67, infra: {}, lots: [] });
  const alloc = { intervention: 7, roulage: 2, proximite: 4 };
  assert.deepEqual(agentsMontes(z, alloc, 1), { libres: 3, roulage: 2, proximite: 1 });
  assert.deepEqual(agentsMontes(z, { intervention: 12, roulage: 2 }, 1), { libres: 0, roulage: 0, proximite: 0 }, 'Intervention d’abord');
  const sans = capacite(z, 'roulage', 2, { turn: 1 }), avec = capacite(z, 'roulage', 2, { turn: 1, alloc });
  assert.ok(Math.abs(avec / sans - (1 + RENDEMENT.monte)) < 1e-9, 'Roulage en voiture : +monte');
  assert.equal(primeVerte(z), 0); assert.equal(bonusFilature(z, 1), 0); assert.equal(bonusOrdre(z, 1), 1);
  const f0 = forceEngagement(z, 4, 1);
  for (let k = 0; k < 4; k++) { ajouterVehicule(z, 'electrique'); ajouterVehicule(z, 'anonyme'); ajouterVehicule(z, 'fourgon'); }
  assert.equal(primeVerte(z), Math.round(RENDEMENT.verte * RENDEMENT.verteMax * 100) / 100, 'prime verte plafonnée');
  assert.equal(bonusFilature(z, 1), RENDEMENT.filatureMax);
  assert.ok(Math.abs(forceEngagement(z, 4, 1) / f0 - (1 + RENDEMENT.ordreMax)) < 1e-9, 'force des fourgons plafonnée');
  z.vehiculesHS = z.flotte.map((v, i) => (v.m === 'fourgon' ? { slot: i, retour: 9 } : null)).filter(Boolean);
  assert.equal(bonusOrdre(z, 1), 1, 'fourgons à l’atelier : pas de bonus');
  assert.ok(apportAchat(z, 'electrique', alloc, 1).some((l) => l.includes('maximum')));
}
// Nouvelle saison : le parc suit, dans la limite du garage ; les plus usés sont revendus.
{
  const z = { flotte: [{ m: 'anonyme', u: 10 }, { m: 'diesel', u: 60 }, { m: 'electrique', u: 20 }, { m: 'fourgon', u: 0 }, { m: 'diesel', u: 40 }, { m: 'diesel', u: 50 }] };
  const nz = { batiments: { garage: 1 }, budget: 60 };
  const r = heritageFlotte(z, nz);
  assert.equal(r.gardes, 4); assert.equal(r.vendus, 2);
  assert.deepEqual(nz.flotte.map((v) => v.m).sort(), ['anonyme', 'diesel', 'electrique', 'fourgon']);
  assert.equal(nz.flotte.find((v) => v.m === 'diesel').u, 20, 'usure divisée par deux');
  assert.ok(nz.budget > 60 && nz.budget === Math.round((60 + r.produit) * 10) / 10);
  const nz2 = { batiments: { garage: 2 }, budget: 60 };
  assert.equal(heritageFlotte({ flotte: [{ m: 'fourgon', u: 0 }] }, nz2).gardes, 4, 'complété à 4 en combis');
}
// Reprise : garage plein, on achète en reprenant un véhicule (il cède sa place, son prix est déduit).
{
  let st = createGame({ seed: 'reprise' });
  const players = { a: { uid: 'a', code: '5324', nom: 'Horizon' } };
  st.zones.a = buildJoinZone(st, 'a', players.a, 1);
  const z = st.zones.a;
  z.flotte[2].u = 50; z.budget = 40;
  const sansRep = { type: 'equiper', cible: 'vehicule', modele: 'anonyme' };
  assert.ok(decisionImpossible(z, sansRep, st.turn), 'garage plein');
  const o = sanitizeOrders(z, { decision: { ...sansRep, reprise: 2 }, ventes: [2, 1] }, st);
  assert.equal(o.decision.reprise, 2); assert.deepEqual(o.ventes, [1], 'le véhicule repris n’est pas revendu en plus');
  assert.equal(decisionImpossible(z, o.decision, st.turn), null);
  assert.equal(coutDecision(z, o.decision), Math.round((MODELES.anonyme.prix - prixRevente(z, 2)) * 10) / 10);
  const zz = JSON.parse(JSON.stringify(z));
  const px = remplacerVehicule(zz, 2, 'anonyme', 3);
  assert.equal(zz.flotte.length, 4); assert.equal(zz.flotte[2].m, 'anonyme'); assert.equal(zz.flotte[2].u, 0); assert.ok(px > 0);
}
console.log('OK : flotte (modèles, usure par véhicule, places, revente, migration, rendement).');
