// Non-droit profond (Parrain, lieutenants, confiance, milieu adaptatif, scènes, saisies) : avant / après.
// Usage : node test/nondroit-v3-sim.mjs [graines] [tours]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, agentsDisponibles } from '../js/engine/zone.js';
import { ND, secteurOuvert } from '../js/engine/constants.js';
import { partsDe, faille, repere, ouvertCeSoir } from '../js/engine/nondroit.js';
import { etape, sceneId } from '../js/engine/milieu.js';
import { makeRng } from '../js/engine/rng.js';

const SEEDS = Number(process.argv[2]) || 12;
const TOURS = Number(process.argv[3]) || 14;
const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
const R0 = ND.roles;
const STYLES = ['equilibre', 'agressif', 'distrait', 'prudent', 'equilibre'];

const milieu = (st) => Object.keys(st.nonDroit.secteurs).filter((k) => secteurOuvert(st.nonDroit, k) && st.nonDroit.secteurs[k].statut === 'milieu');
const parEmprise = (st) => (a, b) => (st.nonDroit.secteurs[b].coeur - st.nonDroit.secteurs[a].coeur) || st.nonDroit.secteurs[a].emprise - st.nonDroit.secteurs[b].emprise || Number(a) - Number(b);
const cibleA = (st) => milieu(st).filter((k) => { const s = st.nonDroit.secteurs[k]; return repere(s, st.turn) && !(faille(s).soirs && s.connue && !ouvertCeSoir(s, st.turn)); }).sort(parEmprise(st))[0];
const cibleB = (st) => milieu(st).filter((k) => !(st.nonDroit.secteurs[k].repere && st.nonDroit.secteurs[k].repere.a > st.turn)).sort(parEmprise(st))[0];
const ajoute = (r, k, role, n) => { if (!k || n <= 0) return; (r[k] ||= { rep: 0, desc: 0, bouc: 0 })[role] = (r[k][role] || 0) + n; };
function garde(st, n, presence) {
  const out = {};
  for (const [k, s] of Object.entries(st.nonDroit.secteurs)) {
    const p = partsDe(s).find((x) => x.uid === 'moi');
    if (s.statut === 'repris' && p && p.part >= ND.partMin && s.emprise >= 20) { ajoute(out, k, 'desc', n - (presence ? 1 : 0)); if (presence) ajoute(out, k, 'bouc', 1); }
  }
  return out;
}
const STRATS = {
  'N’y va jamais': () => ({}),
  'Coopère (6 agents), comme avant': (st, ann) => {
    const r = garde(st, 2, false); const A = cibleA(st), B = cibleB(st); let reste = 6;
    if (A) { const a = ann[A] || { desc: 0, bouc: 0 }; const ratio = faille(st.nonDroit.secteurs[A]).ratio ?? R0.ratio;
      const d = Math.min(reste, 3); ajoute(r, A, 'desc', d); reste -= d;
      const b = Math.min(reste, Math.max(0, Math.ceil((a.desc + d) * ratio) - a.bouc)); ajoute(r, A, 'bouc', b); reste -= b; }
    if (B && !((ann[B] || {}).rep >= 2)) ajoute(r, B, 'rep', Math.min(2, reste));
    return r;
  },
  'Coopère + présence + scènes (agents)': (st, ann) => {
    const r = garde(st, 2, true); const A = cibleA(st), B = cibleB(st); let reste = 6;
    for (const sc of st.nonDroit.scenes || []) if (sc.nuit === st.turn && reste >= 3) { ajoute(r, String(sc.cell), 'sc', 3); reste -= 3; break; }
    if (A) { const a = ann[A] || { desc: 0, bouc: 0 }; const ratio = faille(st.nonDroit.secteurs[A]).ratio ?? R0.ratio;
      const d = Math.min(reste, 3); ajoute(r, A, 'desc', d); reste -= d;
      const b = Math.min(reste, Math.max(0, Math.ceil((a.desc + d) * ratio) - a.bouc)); ajoute(r, A, 'bouc', b); reste -= b; }
    if (B && reste >= 2 && !((ann[B] || {}).rep >= 2)) ajoute(r, B, 'rep', 2);
    return r;
  },
};

function partie(seed, strat, { v3 = true, extra = 0, jeuMoi = 0, jeuBots = 0.25, regles = 1, des = 1 } = {}) {
  let state = createGame({ seed, regles });
  state.nonDroit.roles = true;
  state.nonDroit.v3 = !!(v3 && des <= 1);
  const bots = [...BOT_PROFILES];
  for (let i = 0; i < extra; i++) bots.push({ uid: `bot-x${i}`, code: String(5400 + i), nom: `X${i}`, pseudo: `X${i}`, style: STYLES[i % STYLES.length] });
  for (const b of bots) state.zones[b.uid] = newZone(b, 1);
  state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  const st = { prises: 0, rechutes: 0, coeur: 0, maxTenus: 0, tenusFin: 0, vivant: 0, securise: 0, scenes: 0, scenesOk: 0, rens: 0, represailles: 0, guetteurs: 0, repousses: 0, saisiesVente: 0, ipz: 0, budget: 0, blesses: 0, arretes: 0, enfuis: 0 };
  const b0 = state.zones.moi.blesses.length;
  for (let t = 1; t <= TOURS; t++) {
    const T = state.turn;
    if (v3 && t === des) state.nonDroit.v3 = true;
    const orders = {};
    for (const b of bots) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
    const ann = {};
    for (const o of Object.values(orders)) for (const [k, r] of Object.entries(o.roles || {})) for (const x of ['rep', 'desc', 'bouc']) ((ann[k] ||= { rep: 0, desc: 0, bouc: 0 })[x] += r[x]);
    const plan = strat(state, ann);
    const secteurs = {};
    for (const [k, v] of Object.entries(plan)) secteurs[k] = v.rep + v.desc + v.bouc + (v.sc || 0);
    const n = Object.values(secteurs).reduce((a, b) => a + b, 0);
    const alloc = { ...BASE };
    let manque = Math.max(0, n + Object.values(alloc).reduce((a, b) => a + b, 0) - agentsDisponibles(state.zones.moi, T));
    for (const s of ['roulage', 'recherche', 'admin', 'proximite', 'intervention']) { const k = Math.min(manque, Math.max(0, alloc[s] - 1)); alloc[s] -= k; manque -= k; }
    orders.moi = { alloc, rythme: 'normal', secteurs, roles: plan };
    // Mini-jeux des scènes : joués (et réussis) par une partie des joueurs.
    const players = {};
    const rj = makeRng(`${seed}:jeux:${T}`);
    for (const sc of (state.nonDroit.scenes || []).filter((x) => x.nuit === T)) {
      for (const b of bots) if (rj.chance(jeuBots)) ((players[b.uid] ||= { incidents: { r: {} } }).incidents.r[sc.id] = { statut: 'ok', fautes: rj.chance(0.5) ? 0 : 1 });
      if (rj.chance(jeuMoi)) ((players.moi ||= { incidents: { r: {} } }).incidents.r[sc.id] = { statut: 'ok', fautes: 0 });
    }
    const r = resolveTurn(state, { orders, players, nextWeekday: (t + 1) % 7 });
    const g = r.gazette.nonDroit;
    st.prises += g.prises.length; st.rechutes += g.rechutes.length; st.coeur += g.prises.filter((p) => p.coeur).length;
    st.repousses += (g.repousses || []).length;
    st.scenes += (g.scenesRes || []).length; st.scenesOk += (g.scenesRes || []).filter((x) => x.ok).length;
    st.represailles += g.represailles ? 1 : 0; st.guetteurs += g.guetteurs ? 1 : 0;
    st.maxTenus = Math.max(st.maxTenus, g.etat.filter((x) => x.statut === 'repris').length);
    state = r.state;
    const nd = state.nonDroit;
    if (t === TOURS - 1) {
      const z = state.zones.moi;
      st.budget = z.budget; st.blesses = z.blesses.slice(b0).reduce((a, b) => a + b.n, 0);
      st.ipz = r.gazette.classement.find((x) => x.uid === 'moi').moyenne;
      st.tenusFin = Object.values(nd.secteurs).filter((s) => s.statut === 'repris').length;
      st.vivant = Object.values(nd.secteurs).filter((s) => s.statut === 'repris' && etape(s) === 2).length;
      st.securise = Object.values(nd.secteurs).filter((s) => s.statut === 'repris' && etape(s) >= 1).length;
      st.rens = Object.keys(nd.dossier || {}).length;
      st.arretes = Object.values(nd.secteurs).filter((s) => s.lieutenant && s.lieutenant.etat === 'tombe').length;
      st.enfuis = Object.values(nd.secteurs).filter((s) => s.lieutenant && s.lieutenant.etat === 'enfui').length;
    }
  }
  return st;
}
const moy = (l, k, d = 1) => Math.round((l.reduce((a, x) => a + (x[k] || 0), 0) / l.length) * 10 ** d) / 10 ** d;
const run = (strat, o) => Array.from({ length: SEEDS }, (_, s) => partie(`nd3-${s}`, strat, o));
const ligne = (nom, l) => ({ cas: nom, repris: moy(l, 'prises'), rechutes: moy(l, 'rechutes'), 'QG tombé': moy(l, 'coeur', 2), 'max tenus': moy(l, 'maxTenus'), 'tenus fin': moy(l, 'tenusFin'), 'sécurisés': moy(l, 'securise'), vivants: moy(l, 'vivant'), 'lieut. arrêtés': moy(l, 'arretes'), enfuis: moy(l, 'enfuis'), 'rens.': moy(l, 'rens'), 'scènes ok': `${moy(l, 'scenesOk')}/${moy(l, 'scenes')}`, guetteurs: moy(l, 'guetteurs'), 'représ.': moy(l, 'represailles'), repoussés: moy(l, 'repousses') });

const mode = process.argv[4] || 'tout';
if (mode === 'tout' || mode === 'district') {
  const rows = [];
  for (const extra of [0, 6]) {
    rows.push(ligne(`${6 + extra} zones · avant`, run(STRATS['Coopère (6 agents), comme avant'], { v3: false, extra })));
    rows.push(ligne(`${6 + extra} zones · non-droit profond`, run(STRATS['Coopère + présence + scènes (agents)'], { v3: true, extra })));
  }
  console.log(`\n1. Le district (${TOURS} soirs, ${SEEDS} parties)`); console.table(rows);
}
if (mode === 'saison2') {
  // Comme en ligne : règles de la saison 2, non-droit profond activé au soir 4 (en cours de saison).
  const rows = [];
  for (const extra of [0, 6]) {
    rows.push(ligne(`${6 + extra} zones · saison 2 sans`, run(STRATS['Coopère (6 agents), comme avant'], { v3: false, extra, regles: 2 })));
    rows.push(ligne(`${6 + extra} zones · saison 2, activé au soir 4`, run(STRATS['Coopère + présence + scènes (agents)'], { v3: true, extra, regles: 2, des: 4 })));
  }
  console.log(`\nSaison 2 (${TOURS} soirs, ${SEEDS} parties)`); console.table(rows);
}
if (mode === 'tout' || mode === 'moi') {
  const rows = [];
  const ref = run(STRATS['N’y va jamais'], { v3: true });
  const refA = run(STRATS['N’y va jamais'], { v3: false });
  const l = (nom, x, r) => ({ stratégie: nom, IPZ: moy(x, 'ipz'), 'budget fin': moy(x, 'budget'), 'gain vs absent': Math.round((moy(x, 'budget') - moy(r, 'budget')) * 10) / 10, blessés: moy(x, 'blesses') });
  rows.push(l('[avant] coopère', run(STRATS['Coopère (6 agents), comme avant'], { v3: false }), refA));
  rows.push(l('[profond] coopère comme avant', run(STRATS['Coopère (6 agents), comme avant'], { v3: true }), ref));
  rows.push(l('[profond] + présence + scènes', run(STRATS['Coopère + présence + scènes (agents)'], { v3: true }), ref));
  rows.push(l('[profond] + présence + scènes + mini-jeu (60 %)', run(STRATS['Coopère + présence + scènes (agents)'], { v3: true, jeuMoi: 0.6 }), ref));
  console.log('\n2. « Moi » face à 5 robots'); console.table(rows);
}
