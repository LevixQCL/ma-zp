// Zone de non-droit : ce que rapporte d'y aller seul, à plusieurs, ou pas du tout,
// et ce que deviennent les secteurs quand une partie des joueurs ne joue plus.
// Usage : node test/nondroit.mjs [graines]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, agentsDisponibles } from '../js/engine/zone.js';
import { ND, secteurOuvert } from '../js/engine/constants.js';
import { partsDe } from '../js/engine/nondroit.js';

const SEEDS = Number(process.argv[2]) || 12;
const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };

// Stratégies du joueur « moi » dans la zone de non-droit.
function focus(state) {
  const nd = state.nonDroit;
  return Object.keys(nd.secteurs).filter((k) => secteurOuvert(nd, k) && nd.secteurs[k].statut === 'milieu')
    .sort((a, b) => (nd.secteurs[b].coeur - nd.secteurs[a].coeur) || nd.secteurs[a].emprise - nd.secteurs[b].emprise || Number(a) - Number(b))[0];
}
function garde(state, uid, n) {
  const out = {};
  for (const [k, s] of Object.entries(state.nonDroit.secteurs)) {
    const p = partsDe(s).find((x) => x.uid === uid);
    if (s.statut === 'repris' && p && p.part >= ND.partMin && s.emprise >= 20) out[k] = n;
  }
  return out;
}
const STRATS = {
  'N’y va jamais': () => ({}),
  '(témoin) 5 agents retirés des services, envoyés nulle part': () => ({ _retire: 5 }),
  'Seul, 4 agents sur un secteur que personne ne vise': (state) => {
    const nd = state.nonDroit;
    const f = focus(state);
    const k = Object.keys(nd.secteurs).filter((x) => x !== f && secteurOuvert(nd, x) && !nd.secteurs[x].coeur).sort((a, b) => Number(b) - Number(a))[0];
    return nd.secteurs[k].statut === 'repris' ? { [k]: 2 } : { [k]: 4 };
  },
  'Avec les autres : 3 sur le secteur commun + garde 2': (state) => { const g = garde(state, 'moi', 2); const f = focus(state); if (f) g[f] = 3; return g; },
  'Avec les autres : 5 sur le secteur commun + garde 3': (state) => { const g = garde(state, 'moi', 3); const f = focus(state); if (f) g[f] = 5; return g; },
};

function partie(seed, strat, { inactifs = 0 } = {}) {
  let state = createGame({ seed });
  for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
  state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  const absents = new Set(BOT_PROFILES.slice(0, inactifs).map((b) => b.uid));
  const stats = { prises: 0, rechutes: 0, coeur: 0, ipz: 0, tenusFin: 0, maxTenus: 0, critMoi: 0, budgetMoi: 0 };
  for (let t = 1; t <= 14; t++) {
    const T = state.turn;
    const secteurs = strat(state);
    const n = secteurs._retire || Object.values(secteurs).reduce((a, b) => a + b, 0);
    delete secteurs._retire;
    // Les agents envoyés au centre sont retirés des services, d'abord en Intervention et en Roulage.
    const alloc = { ...BASE };
    let manque = Math.max(0, n + Object.values(alloc).reduce((a, b) => a + b, 0) - agentsDisponibles(state.zones.moi, T));
    for (const s of ['roulage', 'recherche', 'admin', 'proximite', 'intervention']) { const k = Math.min(manque, Math.max(0, alloc[s] - 1)); alloc[s] -= k; manque -= k; }
    const orders = { moi: { alloc, rythme: 'normal', secteurs } };
    for (const b of BOT_PROFILES) { if (absents.has(b.uid)) continue; const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
    const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
    stats.prises += r.gazette.nonDroit.prises.length;
    stats.rechutes += r.gazette.nonDroit.rechutes.length;
    stats.coeur += r.gazette.nonDroit.prises.filter((p) => p.coeur).length;
    const tenus = r.gazette.nonDroit.etat.filter((x) => x.statut === 'repris').length;
    stats.maxTenus = Math.max(stats.maxTenus, tenus);
    if (t === 14) { stats.ipz = r.gazette.classement.find((x) => x.uid === 'moi').moyenne; break; }
    state = r.state;
    if (t === 13) { stats.tenusFin = tenus; stats.critMoi = state.zones.moi.criminalite; stats.budgetMoi = state.zones.moi.budget; }
  }
  return stats;
}

function tableau(titre, lignes) {
  console.log(`\n${titre}`);
  console.table(lignes);
}
const moyenne = (l, k) => Math.round((l.reduce((a, x) => a + x[k], 0) / l.length) * 10) / 10;

const rows = [];
for (const [nom, strat] of Object.entries(STRATS)) {
  const l = Array.from({ length: SEEDS }, (_, s) => partie(`nd-${s}`, strat));
  rows.push({ strategie: nom, 'IPZ moyen': moyenne(l, 'ipz'), 'budget fin': moyenne(l, 'budgetMoi'), 'criminalité fin': moyenne(l, 'critMoi'), 'reprises (district)': moyenne(l, 'prises'), rechutes: moyenne(l, 'rechutes'), 'Cœur tombé': moyenne(l, 'coeur'), 'max tenus': moyenne(l, 'maxTenus') });
}
tableau(`Stratégie de « moi » face à 5 robots (${SEEDS} saisons)`, rows);

const rows2 = [];
for (const inactifs of [0, 2, 4, 5]) {
  const l = Array.from({ length: SEEDS }, (_, s) => partie(`nd-${s}`, STRATS['Avec les autres : 3 sur le secteur commun + garde 2'], { inactifs }));
  rows2.push({ 'robots inactifs (sur 5)': inactifs, 'IPZ moyen de moi': moyenne(l, 'ipz'), 'reprises': moyenne(l, 'prises'), rechutes: moyenne(l, 'rechutes'), 'tenus en fin': moyenne(l, 'tenusFin'), 'max tenus': moyenne(l, 'maxTenus'), 'Cœur tombé': moyenne(l, 'coeur') });
}
tableau('Joueurs inactifs : « moi » coopère, une partie des robots ne joue plus', rows2);
