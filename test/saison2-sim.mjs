// Saison 2 : chef de corps (talents, agenda) et nouvelles annexes, contre les 5 zones robots, règles v2.
// Usage : node test/saison2-sim.mjs [graines] [chef|agenda|annexes|progression]
// Objectif : aucun chef optimisé (3 talents de niveau 8, agenda bien choisi) à plus d'un point d'IPZ d'un chef laissé
// par défaut ; aucune annexe incontournable.
const R = new URL('../js/engine/', import.meta.url).href;
const { createGame, resolveTurn } = await import(R + 'resolve.js');
const { BOT_PROFILES, botOrders } = await import(R + 'bots.js');
const { newZone, operationActive, agentsDisponibles, decisionImpossible, coutDecision } = await import(R + 'zone.js');
const { SERVICES } = await import(R + 'constants.js');
const { creerChef, XP_CUMUL, totalNiveaux, niveauxChef } = await import(R + 'chef.js');

function adaptatif(z, state, opt = {}) {
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
  const dispo = agentsDisponibles(z, T);
  const ordre = ['roulage', 'recherche', 'proximite', 'admin', 'intervention'];
  let total = SERVICES.reduce((s, k) => s + a[k], 0), i = 0;
  while (total > dispo && i < 500) { const k = ordre[i % ordre.length]; const min = op && op.besoins[k] ? op.besoins[k] : 1; if (a[k] > min) { a[k]--; total--; } i++; }
  while (total < dispo) { a.intervention++; total++; }
  let decision = null;
  const essais = [
    ...(opt.annexe ? [{ type: 'construire', infra: opt.annexe }] : []),
    { type: 'former', service: 'proximite' }, { type: 'former', service: 'intervention' }, { type: 'equiper', cible: 'intervention' },
  ];
  decision = essais.find((d) => !decisionImpossible(z, d, T) && z.budget - coutDecision(z, d) >= 5) || null;
  const depenses = {};
  let budget = z.budget - 10 - (decision ? coutDecision(z, decision) : 0);
  const achat = (k, cout, v = true) => { if (budget >= cout) { depenses[k] = v; budget -= cout; } };
  if (z.criminalite > 55) achat('prevention', 4);
  if (z.paperasse > 12) achat('soustraitance', 3);
  if (z.moral < 55) achat('prime', 3);
  { const n = Math.min(4, Math.floor(budget / 1.5)); if (n > 0) { depenses.reserve = n; depenses.reserveService = op ? Object.keys(op.besoins)[0] : 'intervention'; } }
  const rythme = opt.rythme || (op && z.moral > 60 ? 'renforce' : z.moral < 45 ? 'allege' : 'normal');
  const agenda = typeof opt.agenda === 'function' ? opt.agenda(z, state) : opt.agenda ? { type: opt.agenda, service: opt.service || 'intervention' } : undefined;
  return { alloc: a, rythme, operation: 'complet', depenses, decision, doctrine: 'quartier', ...(agenda ? { agenda } : {}), ...(opt.talents ? { talents: opt.talents } : {}) };
}

// Agenda « malin » : la commune si la caisse est basse, le quartier si la satisfaction baisse, sinon le terrain.
const malin = (z) => (z.budget < 12 ? { type: 'commune' } : z.satisfaction < 62 ? { type: 'quartier' } : z.paperasse > 9 ? { type: 'bureau' } : { type: 'terrain', service: 'intervention' });

const MODE = process.argv[3] || 'chef';
const SEEDS = Number(process.argv[2] || 12);
const TOUS = ['gestionnaire', 'marches', 'rallonge', 'meneur', 'sangfroid', 'tacticien', 'carnet', 'intuition', 'renard', 'adresses', 'bonvoisin', 'porteparole', 'visage', 'communicant', 'mediateur'];
const STRATS = MODE === 'agenda' ? {
  'Chef par défaut (bureau)': {},
  'Toujours à la commune': { agenda: 'commune' },
  'Toujours sur le terrain (Intervention)': { agenda: 'terrain' },
  'Toujours sur le terrain (Proximité)': { agenda: 'terrain', service: 'proximite' },
  'Toujours au parquet': { agenda: 'parquet' },
  'Toujours en réunion de quartier': { agenda: 'quartier' },
  'Agenda malin': { agenda: malin },
} : MODE === 'annexes' ? {
  'Sans nouvelle annexe': {},
  'Complexe cellulaire': { annexe: 'cachots' },
  'Cellule drone': { annexe: 'drone' },
  'Salle de crise': { annexe: 'crise' },
  'Assistance aux victimes': { annexe: 'sapv' },
  'Antenne de quartier (réf. ancienne)': { annexe: 'antenne' },
  'Assauts non-droit, sans annexe': { nd: true },
  'Assauts non-droit + drone': { nd: true, annexe: 'drone' },
  'Assauts non-droit + salle de crise': { nd: true, annexe: 'crise' },
  'Assauts non-droit + tacticien': { nd: true, talents: ['tacticien'] },
  'Stand de tir (réf. ancienne)': { annexe: 'tir' },
} : MODE === 'progression' ? {
  'Adaptatif, agenda bureau': { neuf: true },
  'Adaptatif, agenda malin': { neuf: true, agenda: malin },
  'Adaptatif, toujours au parquet': { neuf: true, agenda: 'parquet' },
} : {
  'Chef par défaut (aucun talent)': {},
  ...Object.fromEntries(TOUS.map((t) => [`Talent seul : ${t}`, { talents: [t] }])),
  'Combo gestion (gestionnaire, marchés, rallonge)': { talents: ['gestionnaire', 'marches', 'rallonge'] },
  'Combo proximité (visage, communicant, médiateur)': { talents: ['visage', 'communicant', 'mediateur'] },
  'Combo mixte (visage, gestionnaire, meneur) + agenda malin': { talents: ['visage', 'gestionnaire', 'meneur'], agenda: malin },
  'Combo mixte (visage, sangfroid, marchés) + agenda malin': { talents: ['visage', 'sangfroid', 'marches'], agenda: malin },
};

const rows = [];
let ref = null;
for (const [nom, opt] of Object.entries(STRATS)) {
  const ipz = [], niv = [];
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `s2-${s}`, regles: 2 });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    if (!opt.neuf) { const c = creerChef({}); for (const k of Object.keys(c.xp)) c.xp[k] = XP_CUMUL[10]; state.zones.moi.chef = c; }
    let fin = null;
    for (let t = 1; t <= 14; t++) {
      const orders = {};
      for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
      orders.moi = adaptatif(state.zones.moi, state, opt);
      if (opt.nd) {
        // Assaut commun : 4 agents là où les robots frappent le plus fort ce soir.
        const tot = {}; for (const b of BOT_PROFILES) for (const [k, n] of Object.entries((orders[b.uid] && orders[b.uid].secteurs) || {})) tot[k] = (tot[k] || 0) + n;
        const k = Object.keys(tot).sort((a, b) => tot[b] - tot[a])[0];
        if (k && orders.moi.alloc.intervention > 8) { orders.moi.secteurs = { [k]: 4 }; orders.moi.alloc.intervention -= 4; }
      }
      const r = resolveTurn(state, { orders, quests: {}, nextWeekday: (t + 1) % 7 });
      if (t === 14) { fin = r.gazette.classement; niv.push(totalNiveaux(state.zones.moi.chef)); } else state = r.state;
    }
    ipz.push(fin.find((x) => x.uid === 'moi').moyenne);
  }
  const m = (l) => Math.round(l.reduce((a, b) => a + b, 0) / l.length * 100) / 100;
  if (ref === null) ref = m(ipz);
  rows.push({ strategie: nom, 'IPZ moyen': m(ipz), 'écart réf.': Math.round((m(ipz) - ref) * 100) / 100, ...(MODE === 'progression' ? { 'niveaux gagnés (13 jours)': m(niv) } : {}) });
}
console.log(`Saison 2, mode ${MODE}, ${SEEDS} graines`);
console.table(rows);
void niveauxChef;
