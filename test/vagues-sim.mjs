// Vagues de délinquance : effet sur une saison, avec et sans, selon le profil des zones.
// node test/vagues-sim.mjs [nbZones=12] [graines=8]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, agentsDisponibles, capacite } from '../js/engine/zone.js';
import { SERVICES } from '../js/engine/constants.js';
import { VAGUES, vagueVisee, seuilAbsorption } from '../js/engine/vagues.js';

const N = Number(process.argv[2] || 12), SEEDS = Number(process.argv[3] || 8);
if (process.argv[4]) { const o = JSON.parse(process.argv[4]); for (const [k, v] of Object.entries(o)) VAGUES[k] = typeof v === 'object' ? { ...VAGUES[k], ...v } : v; }
const FIXES = {
  equilibre: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 },
  'spé Proximité': { intervention: 6, proximite: 9, recherche: 2, roulage: 1, admin: 2 },
  'spé Roulage': { intervention: 6, proximite: 3, recherche: 3, roulage: 6, admin: 2 },
  'spé Intervention': { intervention: 13, proximite: 2, recherche: 2, roulage: 1, admin: 2 },
  'spé Recherche': { intervention: 6, proximite: 3, recherche: 8, roulage: 1, admin: 2 },
};
const PROFILS = ['equilibre', 'spé Proximité', 'réactif', 'spé Roulage', 'robot', 'spé Intervention', 'inactif', 'spé Recherche', 'nouveau (T7)', 'réactif', 'robot', 'equilibre'];

function ajuster(a0, dispo) {
  const a = { ...a0 };
  let tot = SERVICES.reduce((s, k) => s + a[k], 0);
  const ordre = ['roulage', 'recherche', 'admin', 'proximite', 'intervention'];
  let i = 0;
  while (tot > dispo && i < 500) { const k = ordre[i % 5]; if (a[k] > 0) { a[k]--; tot--; } i++; }
  while (tot < dispo) { a.intervention++; tot++; }
  return a;
}
// Joueur réactif : base équilibrée ; s'il voit une vague arriver, il renforce le domaine visé.
function reactif(z, state) {
  const a = { ...FIXES.equilibre };
  const v = vagueVisee(state, z.uid, state.turn);
  if (v) {
    // Comme l'encadré de l'HP : juste assez d'agents pour atteindre le seuil (6 de plus au maximum).
    const seuil = seuilAbsorption(v);
    let ajout = 0;
    while (ajout < 6 && capacite(z, v.domaine, a[v.domaine] + ajout, { turn: state.turn, alloc: a }) < seuil) ajout++;
    if (capacite(z, v.domaine, a[v.domaine] + ajout, { turn: state.turn, alloc: a }) >= seuil) {
      for (let i = 0; i < ajout; i++) {
        const k = Object.keys(a).filter((x) => x !== v.domaine && a[x] > 1).sort((x, y) => a[y] - a[x])[0];
        if (!k) break; a[k]--; a[v.domaine]++;
      }
    }
  }
  return a;
}

const agg = {};
const glob = { on: { envoyees: 0, absorbees: 0, subies: 0, tours: 0, ciblesInactifs: 0 }, off: {} };
for (const mode of ['off', 'on']) {
  VAGUES.actif = mode === 'on';
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `vag-${s}` });
    const prof = {};
    for (let i = 0; i < N; i++) {
      const uid = `z${String(i).padStart(2, '0')}`, p = PROFILS[i % PROFILS.length];
      prof[uid] = p;
      if (p !== 'nouveau (T7)') state.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1);
    }
    for (let t = 1; t <= 13; t++) {
      if (t === 7) for (const [uid, p] of Object.entries(prof)) if (p === 'nouveau (T7)') state.zones[uid] = newZone({ uid, code: '5399', nom: 'Neuve' }, t);
      const orders = {};
      for (const [uid, z] of Object.entries(state.zones)) {
        const p = prof[uid];
        const dispo = agentsDisponibles(z, state.turn);
        if (p === 'inactif') { if (t <= 3) orders[uid] = { alloc: ajuster(FIXES.equilibre, dispo), rythme: 'normal' }; continue; }
        if (p === 'robot') { const o = botOrders(z, state, 'equilibre'); if (o) orders[uid] = o; continue; }
        const a = p.startsWith('réactif') ? reactif(z, state) : FIXES[p === 'nouveau (T7)' ? 'equilibre' : p];
        orders[uid] = { alloc: ajuster(a, dispo), rythme: 'normal' };
      }
      const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
      state = r.state;
      if (mode === 'on') {
        const l = (state.vagues && state.vagues.liste) || [];
        glob.on.envoyees += l.length; glob.on.tours += 1;
        for (const b of (state.vagues && state.vagues.bilan) || []) { if (b.resultat === 'absorbee') glob.on.absorbees++; else if (b.resultat === 'subie') glob.on.subies++; }
        for (const v of l) if (prof[v.vers] === 'inactif') glob.on.ciblesInactifs++;
      }
    }
    for (const [uid, z] of Object.entries(state.zones)) {
      const p = prof[uid];
      const a = (agg[p] ||= { off: { ipz: 0, n: 0 }, on: { ipz: 0, n: 0, env: 0, rec: 0, abs: 0, sat: 0 } , offSat: 0 });
      a[mode].ipz += moyenneIpz(z); a[mode].n += 1;
      if (mode === 'off') a.offSat += z.satisfaction;
      else { a.on.env += z.stats.vaguesEnvoyees || 0; a.on.rec += z.stats.vaguesRecues || 0; a.on.abs += z.stats.vaguesAbsorbees || 0; a.on.sat += z.satisfaction; }
    }
  }
}
const f = (x) => Math.round(x * 10) / 10;
console.log(`\n${N} zones, ${SEEDS} saisons (13 tours). Réglages :`, JSON.stringify({ seuil: VAGUES.seuil, capMin: VAGUES.capMin, absorbe: VAGUES.absorbe, gain: VAGUES.gain, effet: VAGUES.effet }));
console.table(Object.entries(agg).map(([p, a]) => ({
  profil: p,
  'IPZ sans': f(a.off.ipz / a.off.n), 'IPZ avec': f(a.on.ipz / a.on.n), 'écart': f(a.on.ipz / a.on.n - a.off.ipz / a.off.n),
  'satisf. fin (sans→avec)': `${f(a.offSat / a.off.n)} → ${f(a.on.sat / a.on.n)}`,
  'envoyées/saison': f(a.on.env / a.on.n), 'reçues/saison': f(a.on.rec / a.on.n), 'absorbées': f(a.on.abs / a.on.n),
})));
console.log(`Vagues par nuit : ${f(glob.on.envoyees / glob.on.tours)} ; absorbées ${glob.on.absorbees}, subies ${glob.on.subies} ; vers un inactif : ${glob.on.ciblesInactifs}`);
