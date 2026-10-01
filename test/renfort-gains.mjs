// Compare les gains d’un renfort prêté selon les réglages (PS, indemnité, points de résultats), mêmes tirages.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, operationActive, agentsDisponibles } from '../js/engine/zone.js';
import { RENFORT, PS } from '../js/engine/constants.js';
const SC = {
  'Actuel sans aide': { ps: 2, ind: 0, entr: 0, pts: 0 },
  'Avant (2 PS/agent, dans le plafond, 0 €)': { ps: 2, ind: 0, entr: 0 },
  '1 : PS hors plafond seulement': { ps: 2, ind: 0, entr: 30 },
  '1+2 : hors plafond, 5 PS/agent': { ps: 5, ind: 0, entr: 30 },
  '1+2+3 : + indemnité 0,5 k€': { ps: 5, ind: 0.5, entr: 30 },
  '1+2+3 + 1 pt de résultats/agent': { ps: 5, ind: 0.5, entr: 30, pts: 1 },
  '1+2+3 + 1,5 pt de résultats/agent': { ps: 5, ind: 0.5, entr: 30, pts: 1.5 },
};
const rows = [];
for (const [nom, c] of Object.entries(SC)) {
  RENFORT.psParAgent = c.ps; RENFORT.indemnite = c.ind; RENFORT.pointsParAgent = c.pts || 0;
  for (const aide of (nom.startsWith('Actuel') ? [false] : [true])) {
    let ipz = 0, bud = 0, ps = 0, n = 0, pretes = 0, aideRecu = 0;
    for (let s = 0; s < 30; s++) {
      PS.plafondEntraide = c.entr;
      let state = createGame({ seed: `renf-${s}` });
      for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
      state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
      if (!c.entr) PS.plafondEntraide = 0;
      for (let t = 1; t <= 14; t++) {
        const T = state.turn; const z = state.zones.moi;
        const alloc = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
        const dispo = agentsDisponibles(z, T); let tot = 21; while (tot > dispo) { alloc.intervention--; tot--; } while (tot < dispo) { alloc.intervention++; tot++; }
        const orders = { moi: { alloc, rythme: 'normal' } };
        if (aide) {
          const cible = BOT_PROFILES.map((b) => b.uid).find((u) => operationActive(state.zones[u], T));
          if (cible) { alloc.proximite -= 1; alloc.recherche -= 1; alloc.roulage -= 1; alloc.admin -= 1; orders.moi.renfort = { cible, agents: 4 }; }
        }
        for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
        const ps0 = z.ps;
        const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
        if (t === 14) { ipz += r.gazette.classement.find((x) => x.uid === 'moi').moyenne; break; }
        state = r.state; n++;
        const zz = state.zones.moi; ps += zz.ps - ps0;
        if (r.gazette.rapports.moi.some((l) => l.startsWith('Renfort :'))) pretes++;
        if (t === 13) bud += zz.budget;
      }
    }
    const f = (v) => Math.round(v * 100) / 100;
    rows.push({ réglage: nom, joueur: aide ? 'aide (4 agents)' : 'n’aide pas', 'IPZ moy': f(ipz / 30), 'budget fin': f(bud / 30), 'PS/jour': f(ps / n), 'renforts/saison': f(pretes / 30) });
  }
}
console.table(rows);
