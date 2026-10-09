// Zone de non-droit avec rôles (repérage, descente, bouclage) : comparaison avec le système actuel,
// rendement de chaque façon de jouer pour « moi », et effet des joueurs inactifs.
// Usage : node test/nondroit-roles-sim.mjs [graines] [tours]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, agentsDisponibles } from '../js/engine/zone.js';
import { ND, secteurOuvert } from '../js/engine/constants.js';
import { partsDe, faille, repere, ouvertCeSoir } from '../js/engine/nondroit.js';

const SEEDS = Number(process.argv[2]) || 16;
const TOURS = Number(process.argv[3]) || 14;
const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
const R0 = ND.roles;

const milieu = (st) => Object.keys(st.nonDroit.secteurs).filter((k) => secteurOuvert(st.nonDroit, k) && st.nonDroit.secteurs[k].statut === 'milieu');
const parEmprise = (st) => (a, b) => (st.nonDroit.secteurs[b].coeur - st.nonDroit.secteurs[a].coeur) || st.nonDroit.secteurs[a].emprise - st.nonDroit.secteurs[b].emprise || Number(a) - Number(b);
const cibleA = (st, ann = {}) => { const l = milieu(st).filter((k) => { const s = st.nonDroit.secteurs[k]; return repere(s, st.turn) && !(faille(s).soirs && s.connue && !ouvertCeSoir(s, st.turn)); }).sort(parEmprise(st)); return l[0]; };
const cibleB = (st) => milieu(st).filter((k) => !(st.nonDroit.secteurs[k].repere && st.nonDroit.secteurs[k].repere.a > st.turn)).sort(parEmprise(st))[0];
function garde(st, n) {
  const out = {};
  for (const [k, s] of Object.entries(st.nonDroit.secteurs)) {
    const p = partsDe(s).find((x) => x.uid === 'moi');
    if (s.statut === 'repris' && p && p.part >= ND.partMin && s.emprise >= 20) out[k] = { rep: 0, desc: n, bouc: 0 };
  }
  return out;
}
const ajoute = (r, k, role, n) => { if (!k || n <= 0) return; (r[k] ||= { rep: 0, desc: 0, bouc: 0 })[role] += n; };

// Stratégies de « moi ». `ann` : ce que les robots ont annoncé ce soir, par secteur et par rôle.
const STRATS = {
  'N’y va jamais': () => ({}),
  'Descente seule, sans lire (5 sur le plus entamé)': (st) => { const r = garde(st, 2); ajoute(r, milieu(st).sort(parEmprise(st))[0], 'desc', 5); return r; },
  'Complète ce qui manque (6 agents)': (st, ann) => {
    const r = garde(st, 2); const A = cibleA(st, ann), B = cibleB(st); let reste = 6;
    if (A) { const a = ann[A] || { desc: 0, bouc: 0 }; const ratio = faille(st.nonDroit.secteurs[A]).ratio ?? R0.ratio;
      const d = Math.min(reste, 3); ajoute(r, A, 'desc', d); reste -= d;
      const b = Math.min(reste, Math.max(0, Math.ceil((a.desc + d) * ratio) - a.bouc)); ajoute(r, A, 'bouc', b); reste -= b; }
    if (B && !((ann[B] || {}).rep >= 2)) ajoute(r, B, 'rep', Math.min(2, reste));
    return r;
  },
  'Spécialiste repérage (2 agents, seulement là où il en manque)': (st, ann) => { const r = garde(st, 2); const l = milieu(st).filter((k) => !(st.nonDroit.secteurs[k].repere && st.nonDroit.secteurs[k].repere.a > st.turn)).sort(parEmprise(st)).slice(0, 2); const B = l.find((k) => !((ann[k] || {}).rep >= 2)); ajoute(r, B, 'rep', 2); return r; },
  'Spécialiste bouclage (ce qui manque, au moins 2)': (st, ann) => { const r = garde(st, 2); const A = cibleA(st, ann); if (A) { const a = ann[A] || { desc: 0, bouc: 0 }; const ratio = faille(st.nonDroit.secteurs[A]).ratio ?? R0.ratio; ajoute(r, A, 'bouc', Math.max(2, Math.ceil(a.desc * ratio) - a.bouc)); } return r; },
  'Seul sur un secteur à part : repère, puis 4 descente + 2 bouclage': (st) => {
    const r = garde(st, 2); const l = milieu(st).filter((k) => !st.nonDroit.secteurs[k].coeur).sort((a, b) => Number(b) - Number(a)); const k = l[0]; if (!k) return r;
    const s = st.nonDroit.secteurs[k];
    if (repere(s, st.turn)) { ajoute(r, k, 'desc', 4); ajoute(r, k, 'bouc', (faille(s).ratio ?? 0.5) >= 1 ? 3 : 2); } else ajoute(r, k, 'rep', 2);
    return r;
  },
};
const STRATS_ANCIEN = {
  'N’y va jamais': () => ({}),
  'Avec les autres : 5 sur le secteur commun + garde 3': (st) => { const r = {}; for (const [k, v] of Object.entries(garde(st, 3))) r[k] = v.desc; const f = milieu(st).sort(parEmprise(st))[0]; if (f) r[f] = 5; return r; },
};

function partie(seed, strat, { roles = true, inactifs = 0 } = {}) {
  let state = createGame({ seed });
  if (roles) state.nonDroit.roles = true;
  for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
  state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  const absents = new Set(BOT_PROFILES.slice(0, inactifs).map((b) => b.uid));
  const st = { prises: 0, rechutes: 0, coeur: 0, ipz: 0, maxTenus: 0, budget: 0, agentsNuits: 0, blesses: 0, repousses: 0, descentes: 0, fuite: 0, repereDesc: 0, saisies: 0, reflux: 0 };
  const b0 = state.zones.moi.blesses.length;
  for (let t = 1; t <= TOURS; t++) {
    const T = state.turn;
    const orders = {};
    for (const b of BOT_PROFILES) { if (absents.has(b.uid)) continue; const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
    const ann = {};
    for (const o of Object.values(orders)) for (const [k, r] of Object.entries(o.roles || {})) for (const x of ['rep', 'desc', 'bouc']) ((ann[k] ||= { rep: 0, desc: 0, bouc: 0 })[x] += r[x]);
    const plan = strat(state, ann);
    const secteurs = {};
    for (const [k, v] of Object.entries(plan)) secteurs[k] = typeof v === 'number' ? v : v.rep + v.desc + v.bouc;
    const n = Object.values(secteurs).reduce((a, b) => a + b, 0);
    st.agentsNuits += Math.min(n, ND.maxTotal);
    const alloc = { ...BASE };
    let manque = Math.max(0, n + Object.values(alloc).reduce((a, b) => a + b, 0) - agentsDisponibles(state.zones.moi, T));
    for (const s of ['roulage', 'recherche', 'admin', 'proximite', 'intervention']) { const k = Math.min(manque, Math.max(0, alloc[s] - 1)); alloc[s] -= k; manque -= k; }
    orders.moi = { alloc, rythme: 'normal', secteurs, ...(roles ? { roles: Object.fromEntries(Object.entries(plan).filter(([, v]) => typeof v === 'object')) } : {}) };
    const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
    const g = r.gazette.nonDroit;
    st.prises += g.prises.length; st.rechutes += g.rechutes.length; st.coeur += g.prises.filter((p) => p.coeur).length;
    st.repousses += (g.repousses || []).length;
    for (const d of g.descentes || []) { st.descentes++; st.fuite += d.fuite; st.repereDesc += d.repere ? 1 : 0; st.saisies += d.butin; }
    st.reflux += (g.reflux || []).reduce((a, x) => a + x.v, 0);
    st.maxTenus = Math.max(st.maxTenus, g.etat.filter((x) => x.statut === 'repris').length);
    if (t === TOURS) st.ipz = r.gazette.classement.find((x) => x.uid === 'moi').moyenne;
    state = r.state;
    if (t === TOURS - 1) {
      // Avant la fin de saison (qui remet les compteurs à zéro).
      const z = state.zones.moi;
      st.budget = z.budget;
      st.blesses = z.blesses.slice(b0).reduce((a, b) => a + b.n, 0);
      st.saisiesMoi = z.stats.ndSaisies || 0;
      st.interpMoi = z.stats.ndInterpellations || 0;
      st.repMoi = z.stats.reperages || 0; st.repUtilesMoi = z.stats.reperagesUtiles || 0;
      st.ipzAvant = r.gazette.classement.find((x) => x.uid === 'moi').moyenne;
    }
  }
  return st;
}

const moy = (l, k, d = 1) => Math.round((l.reduce((a, x) => a + (x[k] || 0), 0) / l.length) * 10 ** d) / 10 ** d;
const run = (strat, o) => Array.from({ length: SEEDS }, (_, s) => partie(`ndr-${s}`, strat, o));

// 1. Le district : ancien système contre rôles (moi coopère dans les deux cas).
{
  const rows = [];
  const a = run(STRATS_ANCIEN['Avec les autres : 5 sur le secteur commun + garde 3'], { roles: false });
  const b = run(STRATS['Complète ce qui manque (6 agents)'], { roles: true });
  for (const [nom, l] of [['Système actuel', a], ['Rôles', b]]) rows.push({ système: nom, 'secteurs repris': moy(l, 'prises'), rechutes: moy(l, 'rechutes'), 'Cœur tombé': moy(l, 'coeur', 2), 'max tenus': moy(l, 'maxTenus'), 'assauts repoussés': moy(l, 'repousses'), 'descentes réussies': moy(l, 'descentes'), '% repérées': l[0].descentes !== undefined ? Math.round(100 * l.reduce((x, y) => x + y.repereDesc, 0) / Math.max(1, l.reduce((x, y) => x + y.descentes, 0))) : '', 'fuite moy. %': Math.round(100 * l.reduce((x, y) => x + y.fuite, 0) / Math.max(1, l.reduce((x, y) => x + y.descentes, 0))), 'saisies district (k€)': moy(l, 'saisies') });
  console.log(`\n1. Le district, 6 zones, ${TOURS} jours, ${SEEDS} parties`); console.table(rows);
}

// 2. Rendement pour « moi » : ce que rapporte chaque façon de jouer, par agent et par soir passé au centre.
{
  const ref = run(STRATS['N’y va jamais'], { roles: true });
  const refA = run(STRATS_ANCIEN['N’y va jamais'], { roles: false });
  const rows = [];
  const ligne = (nom, l, r) => ({ stratégie: nom, IPZ: moy(l, 'ipz'), 'budget fin (k€)': moy(l, 'budget'), 'gain vs n’y va jamais (k€)': Math.round((moy(l, 'budget') - moy(r, 'budget')) * 10) / 10, 'agents·soirs': moy(l, 'agentsNuits', 0), 'k€ par agent·soir': moy(l, 'agentsNuits') ? Math.round(((moy(l, 'budget') - moy(r, 'budget')) / moy(l, 'agentsNuits')) * 100) / 100 : '', 'dont saisies (k€)': moy(l, 'saisiesMoi'), interpellés: moy(l, 'interpMoi'), 'repérages (utiles)': `${moy(l, 'repMoi')} (${moy(l, 'repUtilesMoi')})`, blessés: moy(l, 'blesses') });
  for (const [nom, s] of Object.entries(STRATS_ANCIEN)) rows.push(ligne(`[actuel] ${nom}`, nom.startsWith('N’y') ? refA : run(s, { roles: false }), refA));
  for (const [nom, s] of Object.entries(STRATS)) rows.push(ligne(`[rôles] ${nom}`, nom.startsWith('N’y') ? ref : run(s, { roles: true }), ref));
  console.log('\n2. « Moi » face à 5 robots'); console.table(rows);
}

// 3. Joueurs inactifs.
{
  const rows = [];
  for (const inactifs of [0, 2, 4]) {
    const a = run(STRATS_ANCIEN['Avec les autres : 5 sur le secteur commun + garde 3'], { roles: false, inactifs });
    const b = run(STRATS['Complète ce qui manque (6 agents)'], { roles: true, inactifs });
    rows.push({ 'robots inactifs': inactifs, 'repris (actuel)': moy(a, 'prises'), 'repris (rôles)': moy(b, 'prises'), 'IPZ moi (actuel)': moy(a, 'ipz'), 'IPZ moi (rôles)': moy(b, 'ipz'), 'repoussés (rôles)': moy(b, 'repousses') });
  }
  console.log('\n3. Une partie des robots ne joue plus'); console.table(rows);
}
