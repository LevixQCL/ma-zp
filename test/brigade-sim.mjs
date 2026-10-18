// Simulation de la brigade en direct : appel du jour (seul / choisi), galons, rodage. IPZ de saison de « moi » face aux robots.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { adaptatif } from './strat-adaptatif.mjs';
import { appelDuJour, optionsAppel } from '../js/engine/brigade.js';
const N = Number(process.argv[2] || 10);
const moy = (a) => a.reduce((s, x) => s + x, 0) / a.length;
function saison(seed, pol) {
  let st = createGame({ seed });
  for (const b of BOT_PROFILES) st.zones[b.uid] = newZone(b, 1);
  st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  let fin = null;
  for (let t = 1; t <= 14; t++) {
    const ord = {}; for (const b of BOT_PROFILES) { const x = botOrders(st.zones[b.uid], st, b.style); if (x) ord[b.uid] = x; }
    const z = st.zones.moi, o = adaptatif(z, st);
    if (pol.appel) { const a = appelDuJour(st), op = optionsAppel(z, a); let bi = 0, bv = -1e9; op.forEach((x, i) => { const v = x.p * ((x.ok.pts || 0) + 2 * (x.ok.sat || 0) + 3 * (x.ok.rep || 0)) + (1 - x.p) * ((x.ko.pts || 0) + 2 * (x.ko.sat || 0) + (x.ko.moral || 0)); if (v > bv) { bv = v; bi = i; } }); o.appel = bi; }
    if (pol.galons) o.galons = Object.fromEntries((z.equipe || []).map((m) => [m.role, Array(Math.min(3, m.niveau || 0)).fill(pol.galons)]));
    if (pol.recrues && [3, 6, 9].includes(t)) o.decision = { type: 'recruter', n: 2 };
    if (pol.hp && t === 1) z.batiments.bureaux = Math.max(z.batiments.bureaux, 4);
    if (pol.rang) o.sortirRang = true;
    const r = resolveTurn(st, { orders: { ...ord, moi: o }, quests: {}, players: {}, nextWeekday: (t + 1) % 7 });
    st = r.state;
    const c = st.gazette && st.gazette.classement; const l = Array.isArray(c) ? c.find((x) => x.uid === 'moi') : null;
    if (t === 13) fin = st.zones.moi.ipz; if (l && st.turn === 1) fin = l.ipz;
  }
  return fin;
}
const pols = { 'brigade seule': {}, 'appel choisi': { appel: 1 }, 'appel + galons service': { appel: 1, galons: 'B' }, 'appel + galons terrain': { appel: 1, galons: 'A' }, 'recrues sans choix': { recrues: 1 }, 'recrues + tuteur (galons service)': { recrues: 1, galons: 'B' }, 'recrues, HP 4, sans sortie du rang': { recrues: 1, hp: 1 }, 'recrues, HP 4, sortie du rang': { recrues: 1, hp: 1, rang: 1 } };
const filtre = process.argv[3]; for (const [nom, pol] of Object.entries(pols)) { if (filtre && !nom.includes(filtre)) continue; const v = []; for (let s = 0; s < N; s++) v.push(saison(`brig-${s}`, pol)); console.log(nom.padEnd(36), moy(v).toFixed(2)); }
