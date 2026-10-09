// Passage anticipé à la saison suivante : combien d'agents recrutés garder ?
// Saison 1 jouée 10 soirs par des robots « humains » (dont des recruteurs), bascule anticipée le 11e soir,
// puis saison 2 jouée à l'identique (14 soirs) avec 0 %, 50 % ou 100 % des recrues gardées au-delà de 20.
// On regarde l'écart d'IPZ de saison 2 entre recruteurs et autres, et la santé du budget (faillites, tutelles).
// node test/agents-bascule-sim.mjs [nbZones=10] [graines=10]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, decisionImpossible, coutDecision } from '../js/engine/zone.js';
import { SERVICES, SEASON_LENGTH } from '../js/engine/constants.js';
import { AGENTS_BASCULE } from '../js/engine/bilan.js';
import { makeRng } from '../js/engine/rng.js';

const N = Number(process.argv[2] || 10), SEEDS = Number(process.argv[3] || 10);
const clone = (o) => JSON.parse(JSON.stringify(o));
const f = (x) => Math.round(x * 10) / 10;

const PROFILS = [
  { nom: 'Recruteur', assid: 0.95, invest: 0.85, style: 'equilibre', recrute: 0.7 },
  { nom: 'Recruteur agressif', assid: 0.9, invest: 0.85, style: 'agressif', recrute: 0.6 },
  { nom: 'Formateur', assid: 0.95, invest: 0.8, style: 'equilibre', recrute: 0 },
  { nom: 'Régulier', assid: 0.8, invest: 0.55, style: 'equilibre', recrute: 0.2 },
  { nom: 'Prudent', assid: 0.85, invest: 0.4, style: 'prudent', recrute: 0 },
  { nom: 'Occasionnel', assid: 0.55, invest: 0.35, style: 'equilibre', recrute: 0.1 },
];

function investir(z, state, p, rng) {
  if (!rng.chance(p.invest) || z.budget < 15) return null;
  const T = state.turn;
  const opts = [];
  if (rng.chance(p.recrute)) opts.push({ type: 'agrandir', batiment: 'bureaux' }, { type: 'recruter', n: 2 }, { type: 'recruter', n: 3 });
  else { const s = rng.pick(SERVICES); opts.push({ type: 'former', service: s }, { type: 'equiper', cible: s }); }
  for (const d of opts) if (!decisionImpossible(z, d, T) && z.budget - coutDecision(z, d) >= 6) return d;
  return null;
}

function jouer(state, prof, seed, saison, tours, hook) {
  for (let t = 1; t <= tours; t++) {
    if (hook) hook(state, t);
    const orders = {};
    for (const [uid, z] of Object.entries(state.zones)) {
      const p = prof[uid];
      const rng = makeRng(`${seed}:s${saison}:${uid}:${t}`);
      if (!rng.chance(p.assid)) continue;
      const o = botOrders(z, state, p.style);
      if (!o) continue;
      const inv = investir(z, state, p, rng);
      if (inv) o.decision = inv;
      orders[uid] = o;
    }
    state = resolveTurn(state, { orders, quests: {}, nextWeekday: (t + 1) % 7 }).state;
  }
  return state;
}

const VARIANTES = [0, 0.5, 1];
const agg = Object.fromEntries(VARIANTES.map((v) => [v, { rec: [], aut: [], agentsRec: [], tutelles: 0, budgetMin: [], zones: 0 }]));
let finS1 = [];
for (let sd = 0; sd < SEEDS; sd++) {
  const seed = `bascule-${N}-${sd}`;
  let s1 = createGame({ seed, regles: 2 });
  const prof = {};
  for (let i = 0; i < N; i++) {
    const uid = `z${String(i).padStart(2, '0')}`;
    prof[uid] = PROFILS[i % PROFILS.length];
    s1.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1, { arrivee: i });
  }
  s1 = jouer(s1, prof, seed, 1, 10);
  const agentsS1 = Object.fromEntries(Object.entries(s1.zones).map(([u, z]) => [u, z.agents]));
  finS1.push(...Object.values(agentsS1));
  for (const v of VARIANTES) {
    AGENTS_BASCULE.part = v;
    let st = clone(s1);
    st.finSaison = 'soir';
    st = jouer(st, prof, seed, 1.5, 1); // bascule anticipée
    const debut = Object.fromEntries(Object.entries(st.zones).map(([u, z]) => [u, z.agents]));
    st = jouer(st, prof, seed, 2, SEASON_LENGTH - 1, (state) => {
      for (const z of Object.values(state.zones)) { agg[v].budgetMin.push(z.budget); }
    });
    for (const [u, z] of Object.entries(st.zones)) {
      const m = moyenneIpz(z, st.turn);
      const rec = agentsS1[u] >= 25;
      (rec ? agg[v].rec : agg[v].aut).push(m);
      if (rec) agg[v].agentsRec.push(debut[u]);
      if (z.tutelle || z.faillites > 0) agg[v].tutelles++;
      agg[v].zones++;
    }
  }
}
const moy = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : NaN);
const recruteurs = finS1.filter((a) => a >= 25).length;
console.log(`${SEEDS} graines × ${N} zones · fin de saison 1 (10 soirs) : ${recruteurs} zones sur ${finS1.length} à 25 agents ou plus (max ${Math.max(...finS1)})`);
console.log('Recrues gardées | agents des recruteurs au départ S2 | IPZ moyen S2 recruteurs | autres | écart | zones en tutelle/faillite | budget < 0 (part des soirs)');
for (const v of VARIANTES) {
  const a = agg[v];
  console.log(`${String(v * 100).padStart(5)} %        | ${f(moy(a.agentsRec)).toString().padStart(5)}                            | ${f(moy(a.rec)).toString().padStart(5)}                   | ${f(moy(a.aut)).toString().padStart(5)}  | ${f(moy(a.rec) - moy(a.aut)).toString().padStart(5)} | ${a.tutelles} / ${a.zones} | ${f(100 * a.budgetMin.filter((b) => b < 0).length / a.budgetMin.length)} %`);
}
