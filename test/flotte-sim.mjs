// Simulation de la flotte : chaque zone roule une saison avec un parc d'un seul modèle (4 véhicules achetés au départ),
// pour vérifier qu'aucun modèle n'est le choix évident. Usage : node test/flotte-sim.mjs [graines]
// Mesures : IPZ moyen, budget de fin, état moyen du parc, places pour l'Intervention, blessés,
// et urgences (même modèle de joueur que test/urgence-sim.mjs, plus maniabilité et accélération du véhicule).
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { moyenneIpz } from '../js/engine/zone.js';
import { incidentsDuTour, refUrgence } from '../js/engine/incidents.js';
import { MODELES, IDS_MODELES, placesIntervention, syncFlotte } from '../js/engine/flotte.js';
import { makeRng } from '../js/engine/rng.js';

const graines = (process.argv[2] || 'f1,f2,f3').split(',');
const TOURS = 14;
const H = 3600 * 1000, d0 = Date.UTC(2026, 9, 2, 18, 0, 0);
const normale = (r, m, sd) => m + sd * Math.sqrt(-2 * Math.log(Math.max(1e-9, r.next()))) * Math.cos(2 * Math.PI * r.next());
const POLITIQUES = [...IDS_MODELES.map((m) => [m, [m, m, m, m]]), ['mixte', ['diesel', 'diesel', 'electrique', 'fourgon']]];

function saison(graine, politique) {
  let state = createGame({ seed: graine, turnDeadline: d0 });
  const players = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, { ...b }]));
  state = resolveTurn(state, { players }).state;
  state.nextDeadline = d0 + 24 * H;
  const uids = Object.keys(state.zones);
  // Le parc de chaque zone est remplacé par la politique ; on paie la différence de prix avec les combis diesel.
  for (const u of uids) {
    const z = state.zones[u];
    z.flotte = politique.map((m) => ({ m, u: 0, km: 0, achat: 1 }));
    z.budget -= politique.reduce((s, m) => s + MODELES[m].prix - MODELES.diesel.prix, 0);
    syncFlotte(z);
  }
  const rs = makeRng(`${graine}:talents`), rc = makeRng(`${graine}:${politique.join()}:courses`);
  const talent = Object.fromEntries(uids.map((u) => [u, normale(rs, 1.22, 0.1)]));
  const st = { courses: 0, ok: 0, hs: 0, blesses: 0, places: 0, n: 0 };
  for (let t = 0; t < TOURS; t++) {
    const orders = {};
    for (const u of uids) { const o = botOrders(state.zones[u], state, 'equilibre'); if (o) { if (o.decision && o.decision.cible === 'vehicule') o.decision.modele = politique[0]; orders[u] = o; } }
    for (const u of uids) {
      const inc = incidentsDuTour(state, u).find((i) => i.urgence);
      delete players[u].incidents;
      if (!inc) continue;
      const v = inc.vehicules[0];
      // Accrochages : plus fréquents avec un véhicule peu maniable, ou discret (on s'écarte tard devant une anonyme).
      const x = rc.next() / v.maniab * (v.m === 'anonyme' ? 1.25 : 1);
      const hits = Math.min(v.pv, x < 0.5 ? 0 : x < 0.8 ? 1 : x < 0.95 ? 2 : 3);
      let res;
      if (hits >= v.pv) res = { statut: 'rate', raison: 'hs', fautes: 3, vehicule: v.slot };
      else {
        const r = Math.max(1.02, normale(rc, talent[u], 0.07)) + hits * 0.04;
        const temps = Math.round((r * refUrgence(inc.diff)) / (v.mult * (1 + 0.1 * (v.accel - 1))) * 10) / 10;
        res = { statut: temps <= inc.cible ? 'ok' : 'rate', fautes: hits, temps, niveau: inc.diff, vehicule: v.slot };
      }
      st.courses++; if (res.statut === 'ok') st.ok++; if (res.raison === 'hs') st.hs++;
      players[u].incidents = { cle: inc.id.split('-')[0], r: { [inc.id]: res } };
    }
    state = resolveTurn(state, { orders, players }).state;
    state.nextDeadline = d0 + (t + 2) * 24 * H;
    for (const u of uids) {
      const z = state.zones[u];
      st.places += placesIntervention(z, state.turn); st.n++;
      st.blesses += (z.rapport || []).filter((l) => /est blessé|blessé (à|lors|pendant)|agents? blessés?/.test(l) && !/personne n’est blessé/.test(l)).length;
    }
  }
  const zs = uids.map((u) => state.zones[u]);
  const moy = (f) => zs.reduce((s, z) => s + f(z), 0) / zs.length;
  return { ipz: moy(moyenneIpz), budget: moy((z) => z.budget), etat: moy((z) => 100 - z.usure), st };
}

const lignes = [];
for (const [nom, pol] of POLITIQUES) {
  const a = { ipz: 0, budget: 0, etat: 0, courses: 0, ok: 0, hs: 0, blesses: 0, places: 0, n: 0, g: 0 };
  for (const g of graines) {
    const r = saison(g, pol);
    a.ipz += r.ipz; a.budget += r.budget; a.etat += r.etat; a.g++;
    for (const k of ['courses', 'ok', 'hs', 'blesses', 'places', 'n']) a[k] += r.st[k];
  }
  lignes.push({
    parc: nom, 'coût du parc': `${pol.reduce((s, m) => s + MODELES[m].prix, 0)} k€`, 'IPZ moyen': (a.ipz / a.g).toFixed(1), 'budget fin': `${(a.budget / a.g).toFixed(1)} k€`,
    'état fin': `${(a.etat / a.g).toFixed(0)} %`, 'places Intervention': (a.places / a.n).toFixed(1),
    'urgences à temps': `${Math.round((100 * a.ok) / a.courses)} %`, 'hors service': `${Math.round((100 * a.hs) / a.courses)} %`, 'blessures (rapports)': a.blesses, 'coût saison / véhicule': `${(pol.reduce((s, m) => s + MODELES[m].prix + MODELES[m].entretien * TOURS, 0) / pol.length).toFixed(1)} k€`,
  });
}
console.log(`Flotte : ${graines.length} graines × ${TOURS} jours × ${BOT_PROFILES.length} zones robots, parc de 4 véhicules d'un seul modèle`);
console.table(lignes);
