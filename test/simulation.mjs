// Simulation d'une saison complète avec des robots, pour vérifier l'équilibrage.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { moyenneIpz } from '../js/engine/zone.js';

const seedArg = process.argv[2] || 'sim';
let state = createGame({ seed: seedArg });
const players = {};
for (const b of BOT_PROFILES) players[b.uid] = b;
players['humain'] = { code: '5324', nom: 'Horizon', couleur: '#5AB0F0' };
const styles = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, b.style]));
styles.humain = 'equilibre';

// Tour 1 : inscription (les zones sont créées pendant la résolution).
let r = resolveTurn(state, { players });
state = r.state;

const rows = [];
for (let i = 0; i < 16; i++) {
  const orders = {};
  for (const uid of Object.keys(state.zones)) {
    const o = botOrders(state.zones[uid], state, styles[uid]);
    if (o) orders[uid] = o;
  }
  const quests = { humain: [{ statut: 'ok' }, { statut: 'ok', bonus: 'moral' }, null] };
  const t = state.turn, s = state.season;
  r = resolveTurn(state, { orders, quests, players });
  state = r.state;
  const snap = Object.values(r.state.zones);
  rows.push({ s, t, une: r.gazette.une.titre });
  if (r.gazette.finSaison) {
    console.log('FIN DE SAISON', JSON.stringify(r.gazette.finSaison.titres));
    console.table(r.gazette.classement.map((c) => ({ zone: `${c.code} ${c.nom}`, moyenne: c.moyenne, tours: c.tours })));
  }
  if (t % 3 === 0 || r.gazette.finSaison) {
    console.log(`--- S${s} T${t} : ${r.gazette.une.kicker} | ${r.gazette.une.titre}`);
    console.table(snap.map((z) => ({
      zone: z.nom, agents: z.agents, budget: z.budget, moral: z.moral, satis: z.satisfaction, rep: z.reputation,
      crim: z.criminalite, pap: z.paperasse, dossiers: z.dossiers.length, ipz: z.ipz, moy: moyenneIpz(z), ps: z.ps,
    })));
  }
}
