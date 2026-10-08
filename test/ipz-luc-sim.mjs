// Retour de Luc (oct. 2026) : « on monte trop vite à 100 dans tout ». Composantes de l'IPZ sur une saison,
// avec des joueurs « humains » (assiduité, énigmes) dont deux très assidus, selon les réglages.
// node test/ipz-luc-sim.mjs [variante=actuel] [graines=8]   variantes : actuel, terrain, satisf, budget, luc, retenu
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz } from '../js/engine/zone.js';
import { TERRAIN, DERIVE, BUDGET_IPZ, SEASON_LENGTH } from '../js/engine/constants.js';
import { makeRng } from '../js/engine/rng.js';

const V = process.argv[2] || 'actuel', SEEDS = Number(process.argv[3] || 8);
const plusSat = () => { DERIVE.satisfaction.base += 0.05; DERIVE.satisfaction.paliers = DERIVE.satisfaction.paliers.map(([a, b]) => [a, Math.round((b + 0.05) * 100) / 100]); };
const plusSatRel = () => { DERIVE.satisfaction.paliers = DERIVE.satisfaction.paliers.map(([a, b]) => [a, Math.round(b * 1.25 * 1000) / 1000]); };
if (['terrain', 'luc'].includes(V)) TERRAIN.report = 0.25;
if (['satisf', 'luc'].includes(V)) plusSat();
if (['budget', 'luc', 'retenu'].includes(V)) BUDGET_IPZ.mode = 'revenu';
if (V === 'retenu') { TERRAIN.report = 0.25; plusSatRel(); }
if (process.env.PARK) BUDGET_IPZ.revenu.parK = Number(process.env.PARK);
if (process.env.BASE) BUDGET_IPZ.revenu.base = Number(process.env.BASE);
if (process.env.REPORT) TERRAIN.report = Number(process.env.REPORT);
if (process.env.PARPT) TERRAIN.parPoint = Number(process.env.PARPT);

const PROFILS = [
  { nom: 'Très assidu A', assid: 1, enig: 0.95, style: 'equilibre' },
  { nom: 'Très assidu B', assid: 1, enig: 0.95, style: 'agressif' },
  { nom: 'Régulier', assid: 0.85, enig: 0.6, style: 'equilibre' },
  { nom: 'Prudent', assid: 0.85, enig: 0.6, style: 'prudent' },
  { nom: 'Occasionnel', assid: 0.55, enig: 0.4, style: 'equilibre' },
  { nom: 'Distrait', assid: 0.45, enig: 0.3, style: 'distrait' },
];
const K = ['satisfaction', 'affaires', 'moral', 'budget', 'reputation'];
const acc = Object.fromEntries(PROFILS.map((p) => [p.nom, { comp: Object.fromEntries(K.map((k) => [k, 0])), c95: Object.fromEntries(K.map((k) => [k, 0])), ipz: 0, n: 0, moy: 0, nm: 0, j100: 0 }]));
const revs = [];
// Classement : moyenne de la saison, 5 derniers jours joués, ou moyenne pondérée (les jours récents comptent plus).
const FORM = { saison: (h) => h.reduce((a, x) => a + x.v, 0) / h.length, '5 derniers': (h) => { const l = h.slice(-5); return l.reduce((a, x) => a + x.v, 0) / l.length; },
  'pondérée 0,8': (h, T) => { let s = 0, w = 0; for (const x of h) { const k = 0.8 ** (T - x.t); s += k * x.v; w += k; } return s / w; } };
const chg = Object.fromEntries(Object.keys(FORM).map((k) => [k, { leaders: 0, saut: 0, n: 0 }]));
for (let s = 0; s < SEEDS; s++) {
  let state = createGame({ seed: `ipzluc-${s}` });
  const prof = {};
  PROFILS.forEach((p, i) => { const uid = `z${i}`; prof[uid] = p; state.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1); });
  for (let t = 1; t <= SEASON_LENGTH - 1; t++) {
    const orders = {}, quests = {};
    for (const [uid, z] of Object.entries(state.zones)) {
      const p = prof[uid], rng = makeRng(`${s}:h:${uid}:${t}`);
      if (!rng.chance(p.assid)) continue;
      const o = botOrders(z, state, p.style); if (o) orders[uid] = o;
      if (rng.chance(p.enig)) quests[uid] = [{ statut: rng.chance(0.85) ? 'ok' : 'rate' }, { statut: rng.chance(0.8) ? 'ok' : 'rate', bonus: rng.pick(['moral', 'budget']) }, { statut: rng.chance(0.7) ? 'ok' : 'rate' }];
    }
    state = resolveTurn(state, { orders, quests, nextWeekday: (t + 1) % 7 }).state;
    if (t >= 5) for (const [f, fn] of Object.entries(FORM)) {
      const cl = Object.values(state.zones).map((z) => ({ u: z.uid, h: z.ipzHist.filter((x) => x.joue) })).filter((x) => x.h.length).map((x) => ({ u: x.u, m: fn(x.h, t) })).sort((a, b) => b.m - a.m);
      const c = chg[f]; if (c.prev && c.prev !== cl[0].u) c.leaders++; c.prev = cl[0].u;
      const r = Object.fromEntries(cl.map((x, i) => [x.u, i])); if (c.prevR) for (const u in r) c.saut += Math.abs(r[u] - (c.prevR[u] ?? r[u])); c.prevR = r; c.n++;
    }
    if (t < 4) continue;
    for (const [uid, z] of Object.entries(state.zones)) {
      const a = acc[prof[uid].nom]; if (!z.ipzComp) continue;
      for (const k of K) { a.comp[k] += z.ipzComp[k]; if (z.ipzComp[k] >= 95) a.c95[k]++; }
      a.ipz += z.ipz; a.n++; if (z.ipzDetail && Number.isFinite(z.ipzDetail.revenu)) revs.push(z.ipzDetail.revenu);
    }
  }
  for (const c of Object.values(chg)) { c.prev = null; c.prevR = null; }
  for (const [uid, z] of Object.entries(state.zones)) { acc[prof[uid].nom].moy += moyenneIpz(z); acc[prof[uid].nom].nm++; }
}
revs.sort((a, b) => a - b); const q = (f) => revs[Math.floor(f * (revs.length - 1))].toFixed(1);
console.log(`Variante ${V} · revenu/jour (k€) : p10 ${q(.1)} · médiane ${q(.5)} · p90 ${q(.9)} · max ${revs[revs.length - 1].toFixed(1)}`);
console.table(PROFILS.map((p) => { const a = acc[p.nom]; const r = { profil: p.nom, 'IPZ moy saison': +(a.moy / a.nm).toFixed(1) };
  for (const k of K) r[k] = `${(a.comp[k] / a.n).toFixed(0)} (${Math.round(100 * a.c95[k] / a.n)}%≥95)`; return r; }));
console.log('Classement (tours 5 à 13) : changements de 1er par saison · places gagnées/perdues par zone et par soir');
for (const [f, c] of Object.entries(chg)) console.log(`  ${f.padEnd(13)} ${(c.leaders / SEEDS).toFixed(1)} changements de 1er · ${(c.saut / c.n / PROFILS.length).toFixed(2)} place/soir`);
