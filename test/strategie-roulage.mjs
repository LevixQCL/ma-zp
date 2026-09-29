// Simulation demandée : stratégie « tout Roulage » (caméras, hôtel, recrues, formation et matériel Roulage),
// minimum ailleurs, une affaire disputée par jour, 4 énigmes réussies, prime au personnel chaque tour.
// Usage : node test/strategie-roulage.mjs [détail]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, agentsDisponibles, capacite, operationActive, fraisFixes } from '../js/engine/zone.js';
import { SERVICES } from '../js/engine/constants.js';

const DECISIONS = {
  2: { type: 'construire', infra: 'anpr' },
  3: { type: 'agrandir', batiment: 'bureaux' },
  4: { type: 'recruter', n: 3 }, 5: { type: 'recruter', n: 3 }, 6: { type: 'recruter', n: 3 },
  7: { type: 'former', service: 'roulage' },
  8: { type: 'equiper', cible: 'roulage' },
};

/** Plus petit nombre d'agents pour atteindre une capacité donnée dans un service. */
function minPour(z, s, cible, T) {
  for (let n = 0; n <= 40; n++) if (capacite(z, s, n, { turn: T }) >= cible) return n;
  return 40;
}

/** Répartition « minimum partout, le reste en Roulage ». `moins` : un agent de moins en Proximité et en Administration. */
function ordresRoulage(z, state, { moins = false, affaire = true, prime = true, decisions = true } = {}) {
  const T = state.turn;
  const dispo = agentsDisponibles(z, T);
  const pr = {}; for (const p of z.pressions || []) Object.assign(pr, p.effet);
  const crim = Math.min(95, z.criminalite + (pr.criminalite || 0));
  const incidents = Math.max(1, Math.round(1.5 + crim / 14) + (pr.incidents || 0));
  const a = {};
  a.intervention = minPour(z, 'intervention', incidents * 1.1, T);
  a.proximite = Math.max(0, minPour(z, 'proximite', 2.4 / 0.6, T) - (moins ? 1 : 0));          // criminalité stable
  a.admin = Math.max(0, minPour(z, 'admin', (incidents * 0.4 + 0.6 + 1.2 + (pr.paperasse || 0)) / 1.2, T) - (moins ? 1 : 0)); // paperasse stable
  a.recherche = 1;
  if (pr.roulageMin) a.roulage = pr.roulageMin;
  // Opération d'envergure : on fournit le dispositif demandé.
  const op = operationActive(z, T);
  if (op) for (const [s, n] of Object.entries(op.besoins)) a[s] = Math.max(a[s] || 0, (a[s] || 0) + n);
  // Affaire disputée : celle que la zone dirige, sinon on postule chez une autre (acceptée plus bas).
  const engagements = {};
  let aff = null;
  if (affaire) {
    aff = state.affaires.find((x) => x.zone === z.uid) || state.affaires[0] || null;
    if (aff) engagements[aff.id] = { agents: aff.forceConseillee, acceptes: [] };
  }
  const pris = SERVICES.reduce((s, k) => s + (a[k] || 0), 0) + (aff ? aff.forceConseillee : 0);
  a.roulage = (a.roulage || 0) + Math.max(0, dispo - pris);
  return {
    orders: { alloc: a, rythme: 'normal', operation: 'complet', engagements, decision: decisions ? DECISIONS[T] || null : null, depenses: prime ? { prime: true } : {} },
    aff,
  };
}

const quetes = [{ statut: 'ok' }, { statut: 'ok', bonus: 'capacite', service: 'roulage' }, { statut: 'ok' }, { statut: 'ok', slot: 3 }];

function saison(seed, strat, detail = false) {
  let state = createGame({ seed });
  for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
  state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  const lignes = [];
  const stats = { roul: 0, n: 0, amendes: 0, aff: 0 };
  let fin = null;
  for (let t = 1; t <= 14; t++) {
    const orders = {};
    for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
    const z0 = state.zones.moi;
    let aff = null;
    if (strat.equilibree) {
      aff = strat.affaire ? state.affaires.find((x) => x.zone === 'moi') || state.affaires[0] || null : null;
      orders.moi = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal', operation: 'complet',
        engagements: aff ? { [aff.id]: { agents: aff.forceConseillee, acceptes: [] } } : {}, depenses: strat.prime ? { prime: true } : {} };
    } else { const r = ordresRoulage(z0, state, strat); orders.moi = r.orders; aff = r.aff; }
    // Le chef de l'affaire (robot) accepte notre candidature et lance l'affaire.
    if (aff && aff.zone !== 'moi' && state.zones[aff.zone]) {
      const oc = orders[aff.zone] || (orders[aff.zone] = botOrders(state.zones[aff.zone], state, 'equilibre') || { alloc: {} });
      oc.engagements = oc.engagements || {};
      const e = oc.engagements[aff.id] || { agents: Math.max(2, aff.forceMin - aff.forceConseillee + 2), acceptes: [] };
      e.acceptes = [...(e.acceptes || []), 'moi'];
      oc.engagements[aff.id] = e;
    }
    const alloc = orders.moi.alloc;
    const r = resolveTurn(state, { orders, quests: strat.enigmes === false ? {} : { moi: quetes }, nextWeekday: (t + 1) % 7 });
    const z = r.state.zones.moi;
    const rap = r.gazette.rapports.moi;
    if (detail) {
      const inc = rap.find((l) => l.startsWith('Intervention')) || '';
      const m = inc.match(/(\d+) incidents? traités? sur (\d+)/);
      const affL = rap.find((l) => /affaire résolue|force insuffisante|n’a pas lancé|non retenue/.test(l));
      const amendes = z.compta ? z.compta.lignes.find((l) => l.k === 'amendes') : null;
      if (t < 14) lignes.push({
        T: t, agents: z.agents, 'Int/Prox/Rech/Roul/Adm': `${alloc.intervention}/${alloc.proximite}/${alloc.recherche}/${alloc.roulage}/${alloc.admin}`,
        affaire: aff ? (affL ? (affL.includes('résolue') ? 'gagnée' : 'ratée') : '—') : '—',
        incidents: m ? `${m[1]}/${m[2]}` : '', amendes: amendes ? amendes.v : 0, budget: z.budget, moral: z.moral, satis: z.satisfaction, crim: z.criminalite, pap: z.paperasse, dossiers: z.dossiers.length, ipz: z.ipz,
        décision: (rap.find((l) => /Décision refusée|Infrastructure|Travaux lancés|recrue|Formation lancée|Équipement/.test(l)) || '').slice(0, 42),
      });
    }
    if (t >= 8 && t <= 13) { stats.roul += orders.moi.alloc.roulage; stats.n += 1; }
    if (t < 14 && z.compta) stats.amendes += (z.compta.lignes.find((l) => l.k === 'amendes') || { v: 0 }).v + (z.compta.lignes.find((l) => l.k === 'radars') || { v: 0 }).v;
    if (t < 14 && aff) stats.aff += rap.some((l) => l.includes('affaire résolue')) ? 1 : 0;
    if (t === 14) fin = { ...r.gazette.classement.find((x) => x.uid === 'moi'), rang: r.gazette.classement.findIndex((x) => x.uid === 'moi') + 1, avant: state.zones.moi };
    else state = r.state;
  }
  return { lignes, fin, stats };
}

const detail = process.argv[2] === 'détail';
if (detail) {
  for (const [nom, strat] of [['Roulage (minimum stable ailleurs)', {}], ['Roulage (−1 Proximité, −1 Administration)', { moins: true }]]) {
    console.log(`\n=== ${nom} · graine 0 ===`);
    console.table(saison('roul-0', strat, true).lignes);
  }
}
const SEEDS = 12;
const rows = [];
const STRATS = [
  ['A. Plan Roulage complet (demandé)', {}],
  ['A bis. Idem, −1 prox −1 admin', { moins: true }],
  ['B. Plan Roulage sans affaire quotidienne', { affaire: false }],
  ['C. Équilibrée + affaire, énigmes, prime', { equilibree: true, affaire: true, prime: true }],
  ['D. Équilibrée seule', { equilibree: true, enigmes: false }],
];
for (const [nom, strat] of STRATS) {
  const acc = { moy: 0, rang: 0, budget: 0, agents: 0, moral: 0, satis: 0, crim: 0, pap: 0, dossiers: 0, roul: 0, amendes: 0, aff: 0 };
  for (let s = 0; s < SEEDS; s++) {
    const { fin, stats } = saison(`roul-${s}`, strat);
    const z = fin.avant;
    acc.moy += fin.moyenne; acc.rang += fin.rang; acc.budget += z.budget; acc.agents += z.agents; acc.moral += z.moral; acc.satis += z.satisfaction; acc.crim += z.criminalite; acc.pap += z.paperasse; acc.dossiers += z.dossiers.length;
    acc.roul += stats.n ? stats.roul / stats.n : 0; acc.amendes += stats.amendes; acc.aff += stats.aff;
  }
  const f = (v) => Math.round((v / SEEDS) * 10) / 10;
  rows.push({ stratégie: nom, 'IPZ saison': f(acc.moy), rang: f(acc.rang), 'Roulage T8-13': f(acc.roul), 'amendes+radars': f(acc.amendes), 'affaires gagnées': f(acc.aff), 'budget fin': f(acc.budget), moral: f(acc.moral), satisf: f(acc.satis), crim: f(acc.crim), paperasse: f(acc.pap), dossiers: f(acc.dossiers) });
}
console.log(`\n=== Moyenne sur ${SEEDS} saisons ===`);
console.table(rows);
void fraisFixes;
