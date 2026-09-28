// Compare des répartitions d'agents sur une saison complète, avec les mêmes tirages au hasard.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, operationActive, agentsDisponibles } from '../js/engine/zone.js';
import { SERVICES } from '../js/engine/constants.js';

// Joueur attentif : part d'une base équilibrée et l'adapte à la situation du jour.
function adaptatif(z, state) {
  const T = state.turn;
  const a = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
  const bump = (s, n) => { a[s] += n; };
  for (const p of z.pressions || []) {
    if (p.effet.incidents || p.effet.bourgmestre) bump('intervention', 2);
    if (p.effet.paperasse) bump('admin', 2);
    if (p.effet.criminalite) bump('proximite', 2);
    if (p.effet.roulageMin) a.roulage = Math.max(a.roulage, 3);
    if (p.effet.parquet) bump('recherche', 2);
  }
  if (z.criminalite > 58) bump('proximite', 2);
  if (z.paperasse > 11) bump('admin', 2);
  if (z.dossiers.length > 3) bump('recherche', 1);
  const op = operationActive(z, T);
  if (op) for (const [s, n] of Object.entries(op.besoins)) bump(s, n);
  // ramène le total aux agents disponibles en retirant d'abord ce qui est le moins urgent
  const dispo = agentsDisponibles(z, T);
  const ordre = ['roulage', 'recherche', 'proximite', 'admin', 'intervention'];
  let total = SERVICES.reduce((s, k) => s + a[k], 0), i = 0;
  while (total > dispo && i < 500) { const k = ordre[i % ordre.length]; const min = op && op.besoins[k] ? op.besoins[k] : 1; if (a[k] > min) { a[k]--; total--; } i++; }
  while (total < dispo) { a.intervention++; total++; }
  // Utilise son budget : réserve, prévention, prime, sous-traitance.
  const depenses = {};
  let budget = z.budget - 10;
  const achat = (k, cout, v = true) => { if (budget >= cout) { depenses[k] = v; budget -= cout; } };
  if (z.criminalite > 55) achat('prevention', 4);
  if (z.paperasse > 12) achat('soustraitance', 3);
  if (z.moral < 55) achat('prime', 3);
  const n = Math.min(4, Math.floor(budget / 1.5));
  if (n > 0) { depenses.reserve = n; depenses.reserveService = op ? Object.keys(op.besoins)[0] : 'intervention'; }
  return { alloc: a, rythme: op && z.moral > 60 ? 'renforce' : z.moral < 45 ? 'allege' : 'normal', operation: 'complet', depenses };
}

const STRATS = {
  'Attentive (adapte chaque jour)': 'adaptatif',
  'Équilibrée (7/4/4/2/3)': { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 },
  'Tout en Intervention (14/2/1/1/2)': { intervention: 14, proximite: 2, recherche: 1, roulage: 1, admin: 2 },
  'Sans administration (8/5/5/2/0)': { intervention: 8, proximite: 5, recherche: 5, roulage: 2, admin: 0 },
  'Sans proximité (9/0/5/3/3)': { intervention: 9, proximite: 0, recherche: 5, roulage: 3, admin: 3 },
  'Chasse aux PV (6/3/3/6/2)': { intervention: 6, proximite: 3, recherche: 3, roulage: 6, admin: 2 },
};

const SEEDS = 12;
const rows = [];
for (const [nom, alloc] of Object.entries(STRATS)) {
  const acc = { ipz: 0, satis: 0, moral: 0, budget: 0, crim: 0, pap: 0, inspections: 0, rates: 0 };
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `strat-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    for (let t = 1; t <= 14; t++) {
      const orders = { moi: alloc === 'adaptatif' ? adaptatif(state.zones.moi, state) : { alloc, rythme: 'normal' } };
      for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
      const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
      const z = r.state.zones.moi;
      if (t === 14) {
        // fin de saison : on lit la moyenne dans le classement de la Gazette
        const c = r.gazette.classement.find((x) => x.uid === 'moi');
        acc.ipz += c.moyenne;
      } else {
        state = r.state;
        acc.inspections += r.gazette.rapports.moi.filter((l) => l.startsWith('Inspection')).length;
        const inc = r.gazette.rapports.moi.find((l) => l.startsWith('Intervention'));
        const m = inc && inc.match(/(\d+) incidents? traités? sur (\d+)/);
        if (m) acc.rates += Number(m[2]) - Number(m[1]);
        if (t === 13) { acc.satis += z.satisfaction; acc.moral += z.moral; acc.budget += z.budget; acc.crim += z.criminalite; acc.pap += z.paperasse; }
      }
    }
  }
  const f = (v) => Math.round((v / SEEDS) * 10) / 10;
  rows.push({ strategie: nom, 'IPZ moyen': f(acc.ipz), satisfaction: f(acc.satis), moral: f(acc.moral), 'budget k€': f(acc.budget), criminalité: f(acc.crim), paperasse: f(acc.pap), 'incidents ratés': f(acc.rates), inspections: f(acc.inspections) });
}
console.table(rows);
