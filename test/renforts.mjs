// Compare ce que rapporte l'aide aux autres zones selon le nombre d'agents fournis
// (événement du district, renfort sur opération, entraide), sur une saison et plusieurs tirages.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, operationActive } from '../js/engine/zone.js';

const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
const PROFILS = {
  'Égoïste (n’aide jamais)': { ev: 0, renf: 0, aide: null },
  'Minimaliste (1 agent partout)': { ev: 1, renf: 1, aide: { budget: 0, agents: 1 } },
  'Normal (3 / 2 / 2)': { ev: 3, renf: 2, aide: { budget: 2, agents: 2 } },
  'Généreux (5 / 4 / 3 + 10 k€)': { ev: 5, renf: 4, aide: { budget: 10, agents: 3 } },
};
const SEEDS = 12;
const rows = [];
for (const [nom, p] of Object.entries(PROFILS)) {
  const acc = { rep: 0, ps: 0, ipz: 0, budget: 0, satis: 0, prets: 0, aides: 0 };
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `renf-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    for (let t = 1; t <= 14; t++) {
      const T = state.turn;
      const o = { alloc: { ...BASE }, rythme: 'normal' };
      if (state.evenement && state.evenement.tour === T) o.evenement = p.ev;
      const op = Object.values(state.zones).find((z) => z.uid !== 'moi' && operationActive(z, T));
      if (op && p.renf) o.renfort = { cible: op.uid, agents: p.renf };
      const cible = Object.values(state.zones).find((z) => z.uid !== 'moi' && (z.peril || z.tutelle || (z.blesses || []).some((b) => b.retour > T && b.motif !== 'prêté')));
      if (cible && p.aide) o.aide = { cible: cible.uid, ...p.aide };
      const orders = { moi: o };
      for (const b of BOT_PROFILES) { const x = botOrders(state.zones[b.uid], state, b.style); if (x) orders[b.uid] = x; }
      const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
      if (t === 14) { acc.ipz += r.gazette.classement.find((x) => x.uid === 'moi').moyenne; break; }
      state = r.state;
      if (t === 13) { const z = state.zones.moi; acc.rep += z.reputation; acc.ps += z.ps; acc.budget += z.budget; acc.satis += z.satisfaction; acc.prets += z.stats.renfortsPretes || 0; acc.aides += z.stats.aides || 0; }
    }
  }
  const f = (v) => Math.round((v / SEEDS) * 10) / 10;
  rows.push({ profil: nom, réputation: f(acc.rep), PS: f(acc.ps), 'IPZ moyen': f(acc.ipz), 'budget k€': f(acc.budget), satisfaction: f(acc.satis), 'renforts prêtés': f(acc.prets), entraides: f(acc.aides) });
}
console.table(rows);
