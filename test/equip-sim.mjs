// Équilibrage « Équiper » et « Former » (retours de Luc) : on donne à une zone une amélioration au tour 2
// (coût payé) et on compare sa saison à la même zone sans rien (mêmes graines). Mesures : IPZ moyen de la
// saison (classement), budget final, satisfaction finale. Usage : node test/equip-sim.mjs
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { EQUIP, FORMATION, SEASON_LENGTH, COUTS, coutEquipement } from '../js/engine/constants.js';

const SEEDS = Number(process.env.SEEDS || 40);
function saison(seed, action) {
  let state = createGame({ seed });
  for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
  const cible = BOT_PROFILES[0].uid; let somme = 0, n = 0, fin = {};
  for (let t = 1; t <= SEASON_LENGTH; t++) {
    const orders = {};
    for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style) || {}; delete o.decision; orders[b.uid] = o; }
    // La zone testée garde une répartition fixe (Roulage 4, comme Luc) : on ne mesure que l'amélioration.
    const oc = orders[cible];
    oc.alloc = { intervention: 7, proximite: 4, recherche: 3, roulage: 4, admin: 2 }; oc.rythme = 'normal';
    if (t === 2 && action) {
      const z = state.zones[cible];
      if (action.type === 'equiper') { z.budget -= coutEquipement(z.equip[action.s]); z.equip[action.s] += 1; }
      if (action.type === 'former') { z.budget -= COUTS.formation; z.niveaux[action.s] += 1; z.formations.push({ service: action.s, fin: t + 1, agents: 2 }); /* absents un tour, comme dans le jeu */ }
      if (action.type === 'recruter') { z.budget -= COUTS.recrue; z.agents += 1; oc.alloc.roulage += 1; }
    }
    if (t > 2 && action && action.type === 'recruter') oc.alloc.roulage += 1;
    const players = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, { nom: b.nom, code: b.code }]));
    state = resolveTurn(state, { orders, players, nextWeekday: (t + 1) % 7 }).state;
    if (t < SEASON_LENGTH) { somme += state.zones[cible].ipz || 0; n++; fin = { budget: state.zones[cible].budget, sat: state.zones[cible].satisfaction }; }
  }
  return { ipz: somme / n, ...fin };
}
function ecart(action) {
  let d = { ipz: 0, budget: 0, sat: 0 };
  for (let s = 0; s < SEEDS; s++) { const a = saison(`eq-${s}`, null), b = saison(`eq-${s}`, action); for (const k in d) d[k] += (b[k] - a[k]) / SEEDS; }
  return `IPZ moyen ${d.ipz >= 0 ? '+' : ''}${d.ipz.toFixed(2)} · budget fin ${d.budget >= 0 ? '+' : ''}${d.budget.toFixed(1)} k€ · satisfaction ${d.sat >= 0 ? '+' : ''}${d.sat.toFixed(1)}`;
}
const actions = [
  ['Équiper Roulage', { type: 'equiper', s: 'roulage' }], ['Équiper Proximité', { type: 'equiper', s: 'proximite' }],
  ['Équiper Intervention', { type: 'equiper', s: 'intervention' }], ['Équiper Recherche', { type: 'equiper', s: 'recherche' }],
  ['Former Roulage', { type: 'former', s: 'roulage' }], ['Former Proximité', { type: 'former', s: 'proximite' }],
  ['Recruter 1 agent (Roulage)', { type: 'recruter' }],
];
const variante = process.argv[2] || 'actuel';
// Variantes : clé=valeur séparées par des virgules, ex. « efficacite=0.15,amendes=0.1,formation=0.3 ».
for (const kv of (variante === 'actuel' ? [] : variante.split(','))) { const [k, v] = kv.split('='); if (k === 'formation') FORMATION.parNiveau = Number(v); else EQUIP[k] = Number(v); }
console.log(`Variante : ${variante} (efficacité ${EQUIP.efficacite}, amendes Roulage ${EQUIP.amendes}, satisfaction Prox ${EQUIP.satisfaction}, formation ${FORMATION.parNiveau})`);
for (const [n, a] of actions) console.log(n.padEnd(28), ecart(a));
