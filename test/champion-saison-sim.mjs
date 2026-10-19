// Récompense de fin de saison : le champion (« Zone de l'année ») se voit offrir la remise en état
// de l'imprévu le plus coûteux de son Bilan de saison. On mesure ce que ça lui donne en saison 2
// (IPZ, rang, écart avec le 2e) en jouant la saison 2 à l'identique avec et sans le cadeau.
// node test/champion-saison-sim.mjs [nbZones=10] [graines=12]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, decisionImpossible, coutDecision } from '../js/engine/zone.js';
import { SERVICES, SEASON_LENGTH, MIN_TOURS_CLASSEMENT } from '../js/engine/constants.js';
import { makeRng } from '../js/engine/rng.js';

const N = Number(process.argv[2] || 10), SEEDS = Number(process.argv[3] || 12);
const clone = (o) => JSON.parse(JSON.stringify(o));
const f = (x) => Math.round(x * 100) / 100;

const PROFILS = [
  { assid: 0.95, invest: 0.85, style: 'equilibre' }, { assid: 0.95, invest: 0.85, style: 'agressif', focus: ['intervention', 'roulage'] },
  { assid: 0.9, invest: 0.8, style: 'equilibre', batit: true }, { assid: 0.8, invest: 0.55, style: 'equilibre' },
  { assid: 0.85, invest: 0.4, style: 'prudent' }, { assid: 0.55, invest: 0.35, style: 'equilibre' }, { assid: 0.45, invest: 0.25, style: 'distrait' },
];

function investir(z, state, p, rng) {
  if (!rng.chance(p.invest) || z.budget < 18) return null;
  const s = rng.pick(p.focus && rng.chance(0.7) ? p.focus : SERVICES);
  const opts = [{ type: 'former', service: s }, { type: 'equiper', cible: s }];
  if (p.batit || rng.chance(0.3)) opts.push({ type: 'agrandir', batiment: rng.chance(0.6) ? 'bureaux' : 'garage' });
  const d = rng.pick(opts);
  if (decisionImpossible(z, d, state.turn) || z.budget - coutDecision(z, d) < 8) return null;
  return d;
}

function jouer(state, prof, seed, saison, tours) {
  for (let t = 1; t <= tours; t++) {
    const orders = {};
    for (const [uid, z] of Object.entries(state.zones)) {
      const p = prof[uid], rng = makeRng(`${seed}:s${saison}:${uid}:${t}`);
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

const classer = (st) => Object.values(st.zones).filter((z) => z.toursJoues >= MIN_TOURS_CLASSEMENT).map((z) => ({ uid: z.uid, ipz: moyenneIpz(z) })).sort((a, b) => b.ipz - a.ipz);

const res = { sans: { ipz: 0, rang: 0, ecart2: 0, garde: 0 }, avec: { ipz: 0, rang: 0, ecart2: 0, garde: 0 }, cas: 0, n: 0 };
for (let sd = 0; sd < SEEDS; sd++) {
  const seed = `champion-${N}-${sd}`;
  let s = createGame({ seed });
  const prof = {};
  for (let i = 0; i < N; i++) { const uid = `z${i}`; prof[uid] = PROFILS[i % PROFILS.length]; s.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1, { arrivee: i }); }
  s = jouer(s, prof, seed, 1, SEASON_LENGTH); // le 14e soir clôt la saison
  const champ = s.palmares[s.palmares.length - 1].classement[0].uid;
  const zc = s.zones[champ], b = zc.bilan;
  res.cas += b.cas.length; res.n++;
  const branches = { sans: clone(s), avec: clone(s) };
  // Le cadeau : l'imprévu le plus coûteux remis en état d'office.
  const zb = branches.avec.zones[champ], cas = zb.bilan.cas.slice().sort((a, c) => process.env.MOINS_CHER ? a.prix - c.prix : c.prix - a.prix)[0];
  if (cas) {
    if (cas.k === 'batiments') zb.batiments[cas.s]++; else zb[cas.k][cas.s]++;
    cas.etat = 'offert';
  }
  for (const [k, st0] of Object.entries(branches)) {
    const st = jouer(st0, prof, seed, 2, SEASON_LENGTH - 1);
    const cl = classer(st), i = cl.findIndex((c) => c.uid === champ);
    const r = res[k];
    r.ipz += cl[i].ipz; r.rang += i + 1; r.garde += i === 0 ? 1 : 0;
    const autre = cl.find((c) => c.uid !== champ);
    r.ecart2 += cl[i].ipz - autre.ipz;
  }
}
const m = (r) => ({ 'IPZ S2 du champion': f(r.ipz / res.n), 'rang S2': f(r.rang / res.n), 'écart avec le meilleur des autres': f(r.ecart2 / res.n), 'garde la 1re place': `${Math.round(100 * r.garde / res.n)} %` });
console.log(`${N} zones, ${res.n} parties. Imprévus au Bilan du champion : ${f(res.cas / res.n)} en moyenne.`);
console.table({ 'Sans cadeau': m(res.sans), 'Un imprévu offert': m(res.avec) });
