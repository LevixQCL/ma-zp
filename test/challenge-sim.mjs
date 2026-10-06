// Prime du Challenge : quel montant récompense sans déséquilibrer ?
// Même partie (mêmes graines) jouée sans prime, puis avec une zone qui gagne une prime chaque dimanche
// (le pire cas : le meilleur joueur du Challenge, chaque semaine). On mesure le poids de la prime dans les revenus
// de la semaine, l'écart d'IPZ moyen de la saison et le rang final de la zone primée.
// node test/challenge-sim.mjs [graines=12]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { moyenneIpz } from '../js/engine/zone.js';
import { CHALLENGE } from '../js/engine/challenge.js';

const SEEDS = Number(process.argv[2] || 12);
const MONTANTS = [0, 1.5, 3, 5, 8];
const TOURS = 28; // deux saisons de 14 tours, 4 dimanches

function partie(seed, montant, gagnant) {
  CHALLENGE.prime = montant;
  let state = createGame({ seed });
  const players = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, { ...b }]));
  state = resolveTurn(state, { players }).state;
  const revenus = {}; const ipzFin = []; const rangs = [];
  for (let i = 0; i < TOURS; i++) {
    const dimanche = state.turn % 7 === 0;
    state.nextDeadline = 1e12 + state.turn * 86400000;
    if (montant > 0) players[gagnant].defisSem = { colis: { c: state.nextDeadline, n: 12, at: 1 } };
    else delete players[gagnant].defisSem;
    const orders = {};
    for (const uid of Object.keys(state.zones)) { const o = botOrders(state.zones[uid], state, players[uid].style); if (o) orders[uid] = o; }
    const r = resolveTurn(state, { orders, players, nextWeekday: dimanche ? 0 : 1 });
    for (const z of Object.values(r.state.zones)) {
      const g = ((z.compta && z.compta.lignes) || []).filter((l) => l.v > 0 && l.k !== 'challenge').reduce((s, l) => s + l.v, 0);
      revenus[z.uid] = (revenus[z.uid] || 0) + g;
    }
    if (r.gazette.finSaison) {
      const cl = r.gazette.classement;
      rangs.push(cl.findIndex((c) => c.uid === gagnant) + 1);
      ipzFin.push(cl.find((c) => c.uid === gagnant).moyenne);
    }
    state = r.state;
  }
  const z = state.zones[gagnant];
  return { revSem: (revenus[gagnant] / TOURS) * 7, ipz: ipzFin, rangs, budget: z.budget, skins: (z.skins || []).length };
}

const lignes = [];
for (const m of MONTANTS) {
  let dIpz = 0, dRang = 0, rev = 0, n = 0, dSkins = 0, gainsRang = 0;
  for (let s = 0; s < SEEDS; s++) {
    const gagnant = BOT_PROFILES[s % BOT_PROFILES.length].uid;
    const base = partie(`chal-${s}`, 0, gagnant), avec = partie(`chal-${s}`, m, gagnant);
    for (let k = 0; k < base.ipz.length; k++) {
      dIpz += avec.ipz[k] - base.ipz[k]; dRang += base.rangs[k] - avec.rangs[k]; if (avec.rangs[k] < base.rangs[k]) gainsRang++; n++;
    }
    rev += base.revSem; dSkins += avec.skins - base.skins;
  }
  lignes.push({ 'prime (k€)': m, 'revenus/sem (k€)': +(rev / SEEDS).toFixed(1), 'prime / revenus': `${((m / (rev / SEEDS)) * 100).toFixed(1)} %`,
    'Δ IPZ moyen saison': +(dIpz / n).toFixed(2), 'Δ rang moyen': +(dRang / n).toFixed(2), 'saisons avec place gagnée': `${gainsRang}/${n}`, 'skins en + (4 sem.)': +(dSkins / SEEDS).toFixed(2) });
}
console.table(lignes);
