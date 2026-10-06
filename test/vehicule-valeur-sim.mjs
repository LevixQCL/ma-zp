// Ce que rapporte un véhicule : on donne à une zone un véhicule de plus au tour 2 (prix payé) et on compare
// sa saison à la même zone sans rien (mêmes graines), à côté des autres investissements.
// Usage : node test/vehicule-valeur-sim.mjs   (SEEDS=40, INTER=7 agents d'Intervention par défaut)
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { SEASON_LENGTH, COUTS, coutEquipement } from '../js/engine/constants.js';
import { MODELES, ajouterVehicule, remplacerVehicule, prixRevente } from '../js/engine/flotte.js';

const SEEDS = Number(process.env.SEEDS || 30), INTER = Number(process.env.INTER || 7), AGENTS = Number(process.env.AGENTS || 20);
const ALLOC = { intervention: INTER, proximite: 4, recherche: 3, roulage: 4, admin: 2 };
ALLOC.proximite += AGENTS - Object.values(ALLOC).reduce((a, b) => a + b, 0);
function saison(seed, action) {
  let state = createGame({ seed });
  for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
  const cible = BOT_PROFILES[0].uid; let somme = 0, n = 0, fin = {};
  state.zones[cible].agents = AGENTS;
  for (let t = 1; t <= SEASON_LENGTH; t++) {
    const orders = {};
    for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style) || {}; delete o.decision; orders[b.uid] = o; }
    const oc = orders[cible];
    oc.alloc = { ...ALLOC }; oc.rythme = 'normal'; oc.depenses = {}; delete oc.ventes;
    const z = state.zones[cible];
    if (t === 2 && action) {
      if (action.type === 'reprise') for (let k = 0; k < (action.n || 1); k++) { z.budget -= MODELES[action.m].prix - prixRevente(z, k); remplacerVehicule(z, k, action.m, t); }
      if (action.type === 'vehicule') for (let k = 0; k < (action.n || 1); k++) { z.budget -= MODELES[action.m].prix; ajouterVehicule(z, action.m, t); }
      if (action.type === 'equiper') { z.budget -= coutEquipement(z.equip[action.s]); z.equip[action.s] += 1; }
      if (action.type === 'former') { z.budget -= COUTS.formation; z.niveaux[action.s] += 1; }
    }
    const players = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, { nom: b.nom, code: b.code }]));
    state = resolveTurn(state, { orders, players, nextWeekday: (t + 1) % 7 }).state;
    const zz = state.zones[cible];
    if (t < SEASON_LENGTH) { somme += zz.ipz || 0; n++; fin = { budget: zz.budget, sat: zz.satisfaction, crim: zz.criminalite, acc: (zz.stats && zz.stats.traites) || 0 }; }
  }
  return { ipz: somme / n, ...fin };
}
const base = Array.from({ length: SEEDS }, (_, s) => saison(`vv-${s}`, null));
function ecart(action) {
  const d = { ipz: 0, budget: 0, sat: 0, crim: 0, acc: 0 };
  for (let s = 0; s < SEEDS; s++) { const b = saison(`vv-${s}`, action); for (const k in d) d[k] += (b[k] - base[s][k]) / SEEDS; }
  const f = (v, p = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(p)}`;
  return { 'IPZ moyen': f(d.ipz, 2), 'budget fin': `${f(d.budget)} k€`, satisfaction: f(d.sat), criminalité: f(d.crim), 'incidents traités': f(d.acc) };
}
const actions = [
  ...Object.keys(MODELES).map((m) => [`+1 ${MODELES[m].court} (${MODELES[m].prix} k€)`, { type: 'vehicule', m }]),
  ...Object.keys(MODELES).map((m) => [`+2 ${MODELES[m].court} (${2 * MODELES[m].prix} k€)`, { type: 'vehicule', m, n: 2 }]),
  ...['electrique', 'anonyme', 'fourgon'].map((m) => [`Reprise : 2 combis → 2 ${MODELES[m].court}`, { type: 'reprise', m, n: 2 }]),
  [`Équiper Intervention (${coutEquipement(1)} k€)`, { type: 'equiper', s: 'intervention' }],
  [`Former Intervention (${COUTS.formation} k€)`, { type: 'former', s: 'intervention' }],
  [`Équiper Roulage (${coutEquipement(1)} k€)`, { type: 'equiper', s: 'roulage' }],
];
console.log(`Valeur d'un véhicule : ${SEEDS} graines, ${AGENTS} agents dont ${INTER} en Intervention, 4 combis au départ`);
console.table(Object.fromEntries(actions.map(([l, a]) => [l, ecart(a)])));
