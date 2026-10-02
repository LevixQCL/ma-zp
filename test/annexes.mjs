// Compare la valeur de chaque annexe (construite dès le début de saison) pour un joueur attentif,
// avec les mêmes tirages au hasard : sert à vérifier qu'une nouvelle annexe ne déséquilibre pas le jeu.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, operationActive, agentsDisponibles } from '../js/engine/zone.js';
import { SERVICES, INFRAS } from '../js/engine/constants.js';

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

const VARIANTES = [null, ...Object.keys(INFRAS)];
const SEEDS = Number(process.argv[2]) || 24;
const rows = [];
for (const id of VARIANTES) {
  const acc = { ipz: 0, satis: 0, moral: 0, crim: 0, rates: 0, blesses: 0, budget: 0 };
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `annexe-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    if (id) { state.zones.moi.infra[id] = true; state.zones.moi.budget -= INFRAS[id].cout; }
    for (let t = 1; t <= 14; t++) {
      const orders = { moi: adaptatif(state.zones.moi, state) };
      for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
      const avant = new Set(state.zones.moi.blesses);
      const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
      const z = r.state.zones.moi;
      acc.blesses += z.blesses.filter((b) => !avant.has(b) && b.motif === 'blessé').reduce((n, b) => n + b.n, 0);
      if (t === 14) acc.ipz += r.gazette.classement.find((x) => x.uid === 'moi').moyenne;
      else {
        state = r.state;
        const inc = r.gazette.rapports.moi.find((l) => l.startsWith('Intervention'));
        const m = inc && inc.match(/(\d+) incidents? traités? sur (\d+)/);
        if (m) acc.rates += Number(m[2]) - Number(m[1]);
        if (t === 13) { acc.satis += z.satisfaction; acc.moral += z.moral; acc.crim += z.criminalite; acc.budget += z.budget; }
      }
    }
  }
  const f = (v) => Math.round((v / SEEDS) * 10) / 10;
  rows.push({ annexe: id ? INFRAS[id].nom : '(aucune)', 'IPZ moyen': f(acc.ipz), satisfaction: f(acc.satis), moral: f(acc.moral), criminalité: f(acc.crim), 'budget k€': f(acc.budget), 'incidents ratés': f(acc.rates), 'agents blessés': f(acc.blesses) });
}
console.table(rows);
