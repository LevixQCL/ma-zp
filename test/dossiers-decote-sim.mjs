// Usage : node test/dossiers-decote-sim.mjs [graines]
// Décote des vieux dossiers (retour de Luc) : pleine valeur 2 jours, puis −x %/jour. Compare avec/sans décote
// pour un joueur régulier, un joueur sous-staffé et un joueur qui rattrape tout d'un coup.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { DOSSIER } from '../js/engine/constants.js';
const S = Number(process.argv[2] || 30), T = 13;  // une saison
const A = (rech) => { const autres = 20 - rech; return { intervention: Math.min(8, autres), proximite: Math.max(0, Math.min(4, autres - 8)), recherche: rech, roulage: Math.max(0, Math.min(2, autres - 12)), admin: Math.max(0, autres - 14) }; };
const SCEN = {
  'Régulier (Recherche 6)': () => ({ alloc: A(6) }),
  'Juste (Recherche 4)': () => ({ alloc: A(4) }),
  'Rattrapage (2 puis 11 + heures sup)': (t) => (t <= 9 ? { alloc: A(2) } : { alloc: A(11), depenses: { enqueteurs: true } }),
};
const r1 = (v) => Math.round(v * 10) / 10;
const rows = [];
const VARIANTES = [[1, 0, 0.25], [2, 0.15, 0.4], [1, 0.2, 0.25], [1, 0.3, 0.2]];
for (const [delai, decote, plancher] of VARIANTES) {
  Object.assign(DOSSIER, { delai, decote, plancher });
  for (const [nom, f] of Object.entries(SCEN)) {
    let tot = 0, pic = 0, terr = 0, nT = 0, sat = 0;
    for (let s = 0; s < S; s++) {
      let st = createGame({ seed: `dec-${s}` }); for (const p of BOT_PROFILES) st.zones[p.uid] = newZone(p, 1);
      st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
      let picS = 0;
      for (let t = 1; t <= T; t++) {
        const orders = { moi: { ...f(t), rythme: 'normal' } };
        for (const p of BOT_PROFILES) { const o = botOrders(st.zones[p.uid], st, p.style); if (o) orders[p.uid] = o; }
        st = resolveTurn(st, { orders, nextWeekday: (t + 1) % 7 }).state;
        const z = st.zones.moi;
        const l = ((z.journal && z.journal.lignes.points) || []).find((x) => /dossiers/.test(x.l));
        const v = l ? l.v : 0; tot += v / S; picS = Math.max(picS, v);
        if (t > 3) { terr += z.ipzComp.affaires; nT++; }
      }
      pic += picS / S; sat += st.zones.moi.satisfaction / S;
    }
    rows.push({ décote: decote ? `−${Math.round(decote * 100)} %/j après ${delai} j (min ${Math.round(plancher * 100)} %)` : 'aucune', joueur: nom, 'pts dossiers (13 j)': r1(tot), 'pire soir (pts)': r1(pic), 'terrain moyen': r1(terr / nT), 'satisfaction fin': r1(sat) });
  }
}
console.table(rows);
