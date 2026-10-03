// Équilibrage du moral : compare des réglages (efficacité, retour vers 60) sur des saisons complètes.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone, moralMult } from '../js/engine/zone.js';
import { MORAL } from '../js/engine/constants.js';

const VARIANTES = {
  'avant (oct. 2026)': { neutre: 200 / 3, haut: 0.006, bas: 0.006, retour: [[60, 0.08]] },
  'réglage actuel': {},
  ...JSON.parse(process.env.VARIANTES || '{}'),
};
// Profils de joueurs (zone « moi ») : ce qu'il fait pour son moral.
const PROFILS = {
  passif: { prime: false, enigmes: 0 },
  normal: { prime: false, enigmes: 2 },          // 2 énigmes sur 3, bonus moral si moral < 80
  soigneux: { prime: true, enigmes: 3 },          // prime chaque jour + sans faute + bonus moral
  renforce: { prime: true, enigmes: 3, rythme: 'renforce' },
};
const SEEDS = Number(process.env.SEEDS || 10), TOURS = 14;
const base = { ...MORAL, retour: MORAL.retour.map((x) => [...x]) };
const out = [];
for (const [nv, v] of Object.entries(VARIANTES)) {
  Object.assign(MORAL, base, v);
  for (const [np, p] of Object.entries(PROFILS)) {
    const acc = { moral: 0, mult: 0, n: 0, ipz: 0, budget: 0, crim: 0, pap: 0, satis: 0, botMoral: 0, botMult: 0, nb: 0, points: 0 };
    for (let s = 0; s < SEEDS; s++) {
      let state = createGame({ seed: `moral-${s}` });
      for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
      state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
      for (let t = 1; t <= TOURS; t++) {
        const z0 = state.zones.moi;
        const o = botOrders(z0, state, 'equilibre') || {};
        o.rythme = p.rythme && z0.moral > 55 ? p.rythme : 'normal';
        o.depenses = { ...(o.depenses || {}), prime: p.prime };
        const orders = { moi: o };
        for (const b of BOT_PROFILES) { const ob = botOrders(state.zones[b.uid], state, b.style); if (ob) orders[b.uid] = ob; }
        const qs = p.enigmes === 3 ? [{ statut: 'ok' }, { statut: 'ok', bonus: 'moral' }, { statut: 'ok' }]
          : p.enigmes === 2 ? [{ statut: 'ok' }, { statut: 'ok', bonus: z0.moral < 80 ? 'moral' : 'budget' }, { statut: 'rate' }] : null;
        const r = resolveTurn(state, { orders, quests: qs ? { moi: qs } : {}, nextWeekday: (t + 1) % 7 });
        if (t === TOURS) { acc.ipz += r.gazette.classement.find((x) => x.uid === 'moi').moyenne; break; }
        state = r.state;
        const z = state.zones.moi;
        if (t >= 4) {
          acc.moral += z.moral; acc.mult += z.efficaciteMoral ? z.efficaciteMoral.mult : moralMult(z.moral); acc.n++;
          for (const b of BOT_PROFILES) { const zb = state.zones[b.uid]; acc.botMoral += zb.moral; acc.botMult += moralMult(zb.moral); acc.nb++; }
        }
        if (t === TOURS - 1) { acc.budget += z.budget; acc.crim += z.criminalite; acc.pap += z.paperasse; acc.satis += z.satisfaction; acc.points += z.ipzComp ? z.ipzComp.affaires : 0; }
      }
    }
    const f = (x, d = SEEDS) => Math.round((x / d) * 10) / 10;
    out.push({ variante: nv, joueur: np, 'moral moy.': f(acc.moral, acc.n), 'efficacité %': Math.round(acc.mult / acc.n * 100), 'IPZ saison': f(acc.ipz), 'budget fin': f(acc.budget), crim: f(acc.crim), pap: f(acc.pap), satis: f(acc.satis), terrain: f(acc.points), 'robots moral': f(acc.botMoral, acc.nb), 'robots eff. %': Math.round(acc.botMult / acc.nb * 100) });
  }
}
console.table(out);
