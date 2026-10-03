// Énigmes confiées à un agent : comparaison sur une saison (mêmes tirages) entre
// ne rien faire, déléguer chaque jour, et jouer soi-même (2 bonnes réponses sur 3, ou sans faute).
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';

const SEEDS = Number(process.argv[3]) || 40;
const alloc = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
const bonus = process.argv[2] || 'budget';
const STRATS = {
  'Ignore les énigmes': () => null,
  'Délègue chaque jour': () => [{ slot: 0, statut: 'delegue', bonus, service: 'intervention' }],
  'Joue : 1 bonne sur 3': () => [{ slot: 0, statut: 'ok' }, { slot: 1, statut: 'rate' }, { slot: 2, statut: 'rate' }],
  'Joue : 2 bonnes sur 3': () => [{ slot: 0, statut: 'ok' }, { slot: 1, statut: 'ok', bonus, service: 'intervention' }, { slot: 2, statut: 'rate' }],
  'Joue : sans faute': () => [{ slot: 0, statut: 'ok' }, { slot: 1, statut: 'ok' }, { slot: 2, statut: 'ok', bonus, service: 'intervention' }],
};
const rows = [];
for (const [nom, f] of Object.entries(STRATS)) {
  const acc = { ipz: 0, ps: 0, budget: 0, moral: 0, reussis: 0, delegues: 0 };
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `deleg-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    for (let t = 1; t <= 14; t++) {
      const orders = { moi: { alloc, rythme: 'normal' } };
      for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
      const q = f(); const r = resolveTurn(state, { orders, quests: q ? { moi: q } : {}, nextWeekday: (t + 1) % 7 });
      const rap = r.gazette.rapports.moi || [];
      if (rap.some((l) => l.includes('il a trouvé'))) acc.reussis++;
      if (rap.some((l) => l.startsWith('Énigmes confiées'))) acc.delegues++;
      if (t === 14) { acc.ipz += r.gazette.classement.find((x) => x.uid === 'moi').moyenne; }
      else { state = r.state; if (t === 13) { const z = state.zones.moi; acc.ps += z.ps; acc.budget += z.budget; acc.moral += z.moral; } }
    }
  }
  const m = (v) => Math.round((v / SEEDS) * 10) / 10;
  rows.push({ strategie: nom, 'IPZ moyen': m(acc.ipz), PS: m(acc.ps), 'budget k€': m(acc.budget), moral: m(acc.moral), 'agent a trouvé': acc.delegues ? `${Math.round(acc.reussis / acc.delegues * 100)} %` : '' });
}
console.log(`Bonus choisi : ${bonus}`);
console.table(rows);
