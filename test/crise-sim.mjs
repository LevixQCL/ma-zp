// Crises du district : valeur de chaque plan sur une saison, selon les votes et la participation.
// node test/crise-sim.mjs [nbZones=12] [graines=8]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone, moyenneIpz, agentsDisponibles } from '../js/engine/zone.js';
import { SERVICES } from '../js/engine/constants.js';
import { CRISE, criseCourante } from '../js/engine/crise.js';
import { VAGUES } from '../js/engine/vagues.js';
import { RELEVE } from '../js/engine/releve.js';

const N = Number(process.argv[2] || 12), SEEDS = Number(process.argv[3] || 8);
VAGUES.actif = false; RELEVE.actif = false; // on isole l'effet des crises
const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
function ajuster(a0, dispo) {
  const a = { ...a0 }; let tot = SERVICES.reduce((s, k) => s + a[k], 0); let i = 0;
  const ordre = ['roulage', 'recherche', 'admin', 'proximite', 'intervention'];
  while (tot > dispo && i < 500) { const k = ordre[i % 5]; if (a[k] > 0) { a[k]--; tot--; } i++; }
  while (tot < dispo) { a.intervention++; tot++; }
  return a;
}
// Scénarios : vote de chaque zone (0 A, 1 B, 2 C) et participation à C.
const SCEN = {
  'sans crise': null,
  'tous A': () => 0,
  'tous B': () => 1,
  'tous C (tous participent)': () => 2,
  'C voté par 7/12, seuls eux participent': (i) => (i < 7 ? 2 : 0),
  'C voté par 5/12 + 2 B (C perd ?)': (i) => (i < 5 ? 2 : i < 7 ? 1 : 0),
  'C, mais seulement 4 participent': (i) => 2,
};
const rows = [];
for (const [nom, vote] of Object.entries(SCEN)) {
  CRISE.actif = !!vote;
  let ipz = 0, n = 0, ipzC = 0, nC = 0, ipzNC = 0, nNC = 0, plans = {}, reussies = 0, ops = 0;
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `crise-${s}` });
    const uids = [];
    for (let i = 0; i < N; i++) { const uid = `z${String(i).padStart(2, '0')}`; uids.push(uid); state.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1); }
    for (let t = 1; t <= 13; t++) {
      const orders = {};
      uids.forEach((uid, i) => {
        const z = state.zones[uid];
        const o = { alloc: ajuster(BASE, agentsDisponibles(z, state.turn)), rythme: 'normal' };
        const c = criseCourante(state);
        if (vote && c && c.vote === state.turn) o.crise = vote(i);
        if (nom.startsWith('C, mais') && i >= 4) o.criseC = 'non';
        orders[uid] = o;
      });
      const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
      state = r.state;
      const c = criseCourante(state);
      if (c && c.plan && c.fin === t) { plans[c.plan] = (plans[c.plan] || 0) + 1; if (c.plan === 'C') { ops++; if ((c.nuits || []).filter((x) => x.ok).length >= 2) reussies++; } }
    }
    uids.forEach((uid, i) => {
      const z = state.zones[uid], m = moyenneIpz(z);
      ipz += m; n++;
      const participe = (nom.startsWith('C voté par 7') && i < 7) || (nom.startsWith('C, mais') && i < 4) || nom.startsWith('tous C') || (nom.startsWith('C voté par 5') && i < 5);
      if (participe) { ipzC += m; nC++; } else { ipzNC += m; nNC++; }
    });
  }
  const f = (x) => Math.round(x * 100) / 100;
  rows.push({ scénario: nom, 'IPZ moyen': f(ipz / n), 'participants C': nC ? f(ipzC / nC) : '', 'non-participants': nNC ? f(ipzNC / nNC) : '', plans: JSON.stringify(plans), 'C réussies': ops ? `${reussies}/${ops}` : '' });
}
console.table(rows);
