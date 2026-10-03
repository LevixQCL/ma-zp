// Compare des répartitions d'agents sur une saison complète, avec les mêmes tirages au hasard.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, operationActive, agentsDisponibles } from '../js/engine/zone.js';
import { SERVICES, EQUIP, NIVEAU_MAX, coutEquipement, coutFormation, SEASON_LENGTH } from '../js/engine/constants.js';

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


// Priorité des services : là où il y a le plus d'agents.
const PRIO = ['intervention', 'proximite', 'recherche', 'admin', 'roulage'];
function choisir(z, mode, t) {
  const reserve = 12;
  const f = PRIO.find((s) => z.niveaux[s] < NIVEAU_MAX && !(z.formations || []).some((x) => x.service === s && x.fin > t));
  const e = PRIO.find((s) => z.equip[s] < NIVEAU_MAX);
  const former = f && z.budget - coutFormation(z, f) >= reserve ? { type: 'former', service: f } : null;
  const equiper = e && z.budget - coutEquipement(z.equip[e]) >= reserve ? { type: 'equiper', cible: e } : null;
  if (mode === 'rien') return null;
  if (mode === 'former') return former;
  if (mode === 'equiper') return equiper;
  return t % 2 ? (former || equiper) : (equiper || former); // mixte
}

const SEEDS = 24; const PROFIL = process.argv[2] || 'adaptatif';
const MODES = { 'Aucune': 'rien', 'Toujours former': 'former', 'Toujours équiper': 'equiper', 'Alterner': 'mixte' };
for (const actif of [false, true]) {
  EQUIP.actif = actif;
  const rows = [];
  for (const [nom, mode] of Object.entries(MODES)) {
    const acc = { ipz: 0, satis: 0, budget: 0, blesses: 0, eq: 0, fo: 0 };
    for (let s = 0; s < SEEDS; s++) {
      let state = createGame({ seed: `eq-${s}` });
      for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
      state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
      for (let t = 1; t <= SEASON_LENGTH; t++) {
        const z0 = state.zones.moi;
        const o = PROFIL === 'fixe' ? { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' } : adaptatif(z0, state); o.decision = choisir(z0, mode, t);
        const orders = { moi: o };
        for (const b of BOT_PROFILES) { const ob = botOrders(state.zones[b.uid], state, b.style); if (ob) orders[b.uid] = ob; }
        const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
        acc.blesses += (r.gazette.rapports.moi || []).filter((l) => /bless/i.test(l)).length;
        if (t === SEASON_LENGTH) { acc.ipz += r.gazette.classement.find((x) => x.uid === 'moi').moyenne; }
        else { state = r.state; const z = state.zones.moi; if (t === SEASON_LENGTH - 1) { acc.satis += z.satisfaction; acc.budget += z.budget; acc.eq += SERVICES.reduce((a, k) => a + z.equip[k] - 1, 0); acc.fo += SERVICES.reduce((a, k) => a + z.niveaux[k] - 1, 0); } }
      }
    }
    const f = (v) => Math.round((v / SEEDS) * 10) / 10;
    rows.push({ strategie: nom, 'IPZ moyen': f(acc.ipz), satisfaction: f(acc.satis), 'budget k€': f(acc.budget), 'lignes blessés': f(acc.blesses), 'niv. formation +': f(acc.fo), 'niv. matériel +': f(acc.eq) });
  }
  console.log(actif ? '\n=== NOUVEAU matériel (+8 % + effet propre) ===' : '=== ACTUEL (+15 %) ===');
  console.table(rows);
}
