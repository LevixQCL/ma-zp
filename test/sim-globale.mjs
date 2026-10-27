// Simulation globale : tous les systèmes, avec des robots qui jouent « comme des humains » (assiduité,
// réactivité variables, décisions au hasard mais plausibles). On compare la même partie
// sans les vagues de délinquance et avec (saison 4 : la relève et les crises ont été retirées).
// node test/sim-globale.mjs [nbZones=12] [graines=8]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, agentsDisponibles, capacite } from '../js/engine/zone.js';
import { SERVICES } from '../js/engine/constants.js';
import { makeRng } from '../js/engine/rng.js';
import { VAGUES, vagueVisee, seuilAbsorption } from '../js/engine/vagues.js';

const N = Number(process.argv[2] || 12), SEEDS = Number(process.argv[3] || 8);

// Profils de joueurs. assid : chance de jouer un jour donné ; reac : lit l'HP et réagit aux annonces ;
// coop : envie d'aider (gardé pour mémoire, plus lu depuis la saison 4) ; style : répartition de base (moteur des robots).
const PROFILS = [
  { nom: 'Assidu coopératif', assid: 0.95, reac: 0.85, coop: 0.8, style: 'equilibre', enig: 0.8 },
  { nom: 'Assidu compétitif', assid: 0.95, reac: 0.8, coop: 0.25, style: 'agressif', enig: 0.85 },
  { nom: 'Régulier', assid: 0.8, reac: 0.6, coop: 0.5, style: 'equilibre', enig: 0.6 },
  { nom: 'Prudent', assid: 0.85, reac: 0.7, coop: 0.4, style: 'prudent', enig: 0.6 },
  { nom: 'Occasionnel', assid: 0.55, reac: 0.35, coop: 0.4, style: 'equilibre', enig: 0.4 },
  { nom: 'Distrait', assid: 0.45, reac: 0.2, coop: 0.3, style: 'distrait', enig: 0.3 },
  { nom: 'Spécialiste Proximité', assid: 0.9, reac: 0.6, coop: 0.5, style: 'equilibre', enig: 0.6, special: 'proximite' },
  { nom: 'Spécialiste Intervention', assid: 0.9, reac: 0.5, coop: 0.3, style: 'agressif', enig: 0.5, special: 'intervention' },
  { nom: 'Décroche (J5)', assid: 0.9, reac: 0.6, coop: 0.5, style: 'equilibre', enig: 0.5, stop: 5 },
  { nom: 'Arrive tard (J5)', assid: 0.85, reac: 0.6, coop: 0.6, style: 'equilibre', enig: 0.6, arrive: 5 },
];

/** Déplace `n` agents vers le service `s` en prenant dans les plus gros autres services. */
function deplacer(alloc, s, n) {
  for (let i = 0; i < n; i++) {
    const d = SERVICES.filter((k) => k !== s && alloc[k] > 1).sort((a, b) => alloc[b] - alloc[a])[0];
    if (!d) break;
    alloc[d]--; alloc[s]++;
  }
}

function ordresHumains(z, state, p, rng, stats) {
  const T = state.turn;
  const o = botOrders(z, state, p.style);
  if (!o) return null;
  const a = o.alloc;
  if (p.special) deplacer(a, p.special, 5);
  // Vague annoncée : un joueur qui lit l'HP ajoute à peu près ce qu'il faut (parfois un peu moins).
  const v = vagueVisee(state, z.uid, T);
  if (v && rng.chance(p.reac)) {
    const seuil = seuilAbsorption(v);
    let k = 0;
    while (k < 6 && capacite(z, v.domaine, a[v.domaine] + k, { turn: T, alloc: a }) < seuil) k++;
    deplacer(a, v.domaine, Math.max(0, k - (rng.chance(0.25) ? 1 : 0)));
    stats.reactions++;
  }
  return o;
}

function partie(seed, mode) {
  VAGUES.actif = mode.vagues;
  let state = createGame({ seed });
  const prof = {};
  for (let i = 0; i < N; i++) {
    const uid = `z${String(i).padStart(2, '0')}`;
    prof[uid] = PROFILS[i % PROFILS.length];
    if (!prof[uid].arrive) state.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1);
  }
  const stats = { reactions: 0, perils: 0, tutelles: 0, faillites: 0, demandes: 0, joursJoueurs: 0, rapport: 0 };
  for (let t = 1; t <= 13; t++) {
    for (const [uid, p] of Object.entries(prof)) if (p.arrive === t) state.zones[uid] = newZone({ uid, code: '5399', nom: uid }, t);
    const orders = {}, quests = {};
    for (const [uid, z] of Object.entries(state.zones)) {
      const p = prof[uid];
      const rng = makeRng(`${seed}:humain:${uid}:${t}`); // mêmes tirages avec ou sans nouveautés
      if ((p.stop && t >= p.stop) || !rng.chance(p.assid)) continue;
      // Ce que le joueur doit trancher aujourd'hui (pour mesurer la charge).
      const dem = vagueVisee(state, uid, state.turn) ? 1 : 0;
      stats.demandes += dem; stats.joursJoueurs++
      const o = ordresHumains(z, state, p, rng, stats);
      if (o) orders[uid] = o;
      if (rng.chance(p.enig)) quests[uid] = [{ statut: rng.chance(0.75) ? 'ok' : 'rate' }, { statut: rng.chance(0.7) ? 'ok' : 'rate', bonus: rng.pick(['moral', 'budget']) }, { statut: rng.chance(0.6) ? 'ok' : 'rate' }];
    }
    const r = resolveTurn(state, { orders, quests, nextWeekday: (t + 1) % 7 });
    state = r.state;
    for (const z of Object.values(state.zones)) { if (z.peril && z.peril.debut === t) stats.perils++; if (z.tutelle && z.tutelle.debut === t + 1) stats.tutelles++; }
    stats.faillites += (r.gazette.peril && r.gazette.peril.faillites ? r.gazette.peril.faillites.length : 0);
    for (const l of Object.values(r.gazette.rapports || {})) {
      stats.rapport += l.length;
      for (const x of l) {
        if (/^Vague absorbée/.test(x)) stats.vAbs = (stats.vAbs || 0) + 1;
        if (/^Vague subie/.test(x)) stats.vSub = (stats.vSub || 0) + 1;
      }
    }
  }
  const zones = Object.entries(state.zones).map(([uid, z]) => ({ uid, p: prof[uid].nom, ipz: moyenneIpz(z), sat: z.satisfaction, moral: z.moral, crim: z.criminalite, budget: z.budget, ps: z.ps, vr: z.stats.vaguesRecues || 0, va: z.stats.vaguesAbsorbees || 0, ve: z.stats.vaguesEnvoyees || 0}));
  const classes = zones.filter((x) => x.ipz > 0).sort((a, b) => b.ipz - a.ipz);
  classes.forEach((x, i) => { x.rang = i + 1; });
  return { zones, stats };
}

const MODES = {
  'sans vagues': { vagues: false },
  'avec vagues': { vagues: true },
};
const res = {};
for (const [nom, mode] of Object.entries(MODES)) {
  const parProfil = {}, glob = { ipz: [], sat: 0, moral: 0, crim: 0, budget: 0, n: 0 }, st = {};
  for (let s = 0; s < SEEDS; s++) {
    const g = partie(`glob-${N}-${s}`, mode);
    for (const [k, v] of Object.entries(g.stats)) st[k] = (st[k] || 0) + v;
    for (const z of g.zones) {
      const a = (parProfil[z.p] ||= { ipz: 0, rang: 0, n: 0, nr: 0, vr: 0, va: 0, ve: 0, sat: 0 });
      if (z.ipz > 0) { a.ipz += z.ipz; a.n++; a.rang += z.rang; a.nr++; }
      a.vr += z.vr; a.va += z.va; a.ve += z.ve; a.sat += z.sat; a.cnt = (a.cnt || 0) + 1;
      if (z.ipz > 0) { glob.ipz.push(z.ipz); glob.sat += z.sat; glob.moral += z.moral; glob.crim += z.crim; glob.budget += z.budget; glob.n++; }
    }
  }
  res[nom] = { parProfil, glob, st };
}
const f = (x) => Math.round(x * 10) / 10;
const ecart = (l) => { const m = l.reduce((a, b) => a + b, 0) / l.length; return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length); };
console.log(`\n=== ${N} zones, ${SEEDS} saisons de 13 tours ===`);
console.table(Object.entries(res).map(([nom, r]) => ({
  mode: nom, 'IPZ moyen': f(r.glob.ipz.reduce((a, b) => a + b, 0) / r.glob.n), 'écart-type IPZ': f(ecart(r.glob.ipz)),
  'écart 1er-dernier': f(Math.max(...r.glob.ipz) - Math.min(...r.glob.ipz)), satisfaction: f(r.glob.sat / r.glob.n), moral: f(r.glob.moral / r.glob.n), criminalité: f(r.glob.crim / r.glob.n), 'budget k€': f(r.glob.budget / r.glob.n),
  'périls/saison': f(r.st.perils / SEEDS), 'tutelles/saison': f(r.st.tutelles / SEEDS), 'lignes de rapport/zone/jour': f(r.st.rapport / (SEEDS * 13 * N)),
})));
const base = res['sans vagues'].parProfil, tout = res['avec vagues'].parProfil;
console.log('\nPar profil (avec vagues, comparé à sans)');
console.table(PROFILS.filter((p) => base[p.nom] && tout[p.nom]).map((p) => {
  const b = base[p.nom], t = tout[p.nom];
  return { profil: p.nom, 'IPZ sans': f(b.ipz / b.n), 'IPZ avec': f(t.ipz / t.n), 'écart': f(t.ipz / t.n - b.ipz / b.n), 'rang sans': f(b.rang / b.nr), 'rang avec': f(t.rang / t.nr),
    'vagues reçues': f(t.vr / t.cnt), 'brisées': f(t.va / t.cnt), 'envoyées': f(t.ve / t.cnt) };
}));
const t = res['avec vagues'].st;
console.log(`Vagues : brisées ${t.vAbs || 0}, subies ${t.vSub || 0} (${f((t.vAbs + t.vSub) / (SEEDS * 13))} par soir)`);
console.log(`\nCharge (avec vagues) : ${f(t.demandes / t.joursJoueurs)} vague(s) à parer par joueur et par jour joué ; réactions aux vagues ${t.reactions}`);
