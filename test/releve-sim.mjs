// La relève : fréquence, captures et effet sur l'IPZ selon qu'on accepte ou non.
// node test/releve-sim.mjs [nbZones=12] [graines=8]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, agentsDisponibles } from '../js/engine/zone.js';
import { SERVICES } from '../js/engine/constants.js';
import { RELEVE, releveRecue, relevesLancees, saisieAChoisir } from '../js/engine/releve.js';

const N = Number(process.argv[2] || 12), SEEDS = Number(process.argv[3] || 8);
const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
const PROFILS = ['prend (3 agents)', 'refuse toujours', 'prend (2 agents)', 'robot', 'prend + appui'];
function ajuster(a0, dispo) {
  const a = { ...a0 }; let tot = SERVICES.reduce((s, k) => s + a[k], 0); let i = 0;
  const ordre = ['roulage', 'recherche', 'admin', 'proximite', 'intervention'];
  while (tot > dispo && i < 500) { const k = ordre[i % 5]; if (a[k] > 0) { a[k]--; tot--; } i++; }
  while (tot < dispo) { a.intervention++; tot++; }
  return a;
}
const agg = {}, g = { releves: 0, tours: 0, prises: 0, juge: 0, saisies: 0 };
for (const mode of ['off', 'on']) {
  RELEVE.actif = mode === 'on';
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `rel-${s}` });
    const prof = {};
    for (let i = 0; i < N; i++) { const uid = `z${String(i).padStart(2, '0')}`; prof[uid] = PROFILS[i % PROFILS.length]; state.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1); }
    for (let t = 1; t <= 13; t++) {
      const orders = {};
      for (const [uid, z] of Object.entries(state.zones)) {
        const p = prof[uid];
        const o = p === 'robot' ? botOrders(z, state, 'equilibre') : { alloc: ajuster(BASE, agentsDisponibles(z, state.turn)), rythme: 'normal' };
        if (!o) continue;
        const r = releveRecue(state, uid);
        if (r) o.releve = p === 'refuse toujours' || p === 'robot' ? { id: r.id, choix: 'refuser' } : { id: r.id, choix: 'prendre', agents: p.includes('2') ? 2 : 3 };
        if (p === 'prend + appui') o.releveAppui = relevesLancees(state, uid).map((x) => ({ id: x.id, agents: 1 }));
        const sz = saisieAChoisir(state, uid); if (sz) o.saisie = { id: sz.id, part: 'voiture' };
        orders[uid] = o;
      }
      const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
      state = r.state;
      if (mode === 'on') {
        g.tours++; g.releves += (state.releves || []).filter((x) => x.tour === state.turn && x.etape === 'proposee').length;
        for (const l of Object.values(r.gazette.rapports || {}).flat()) { if (/^Relève réussie/.test(l)) g.prises++; if (/^Félicitations du juge/.test(l)) g.juge++; if (/^Saisie chez/.test(l)) g.saisies++; }
      }
    }
    for (const [uid, z] of Object.entries(state.zones)) {
      const a = (agg[prof[uid]] ||= { off: 0, on: 0, n: 0, rel: 0 });
      a[mode] += moyenneIpz(z); if (mode === 'on') { a.n++; a.rel += z.stats.releves || 0; }
    }
  }
}
const f = (x) => Math.round(x * 100) / 100;
console.table(Object.entries(agg).map(([p, a]) => ({ profil: p, 'IPZ sans': f(a.off / a.n), 'IPZ avec': f(a.on / a.n), 'écart': f((a.on - a.off) / a.n), 'captures/saison': f(a.rel / a.n) })));
console.log(`Relèves proposées par nuit : ${f(g.releves / g.tours)} ; captures ${g.prises}, félicitations ${g.juge}, saisies ${g.saisies}`);
