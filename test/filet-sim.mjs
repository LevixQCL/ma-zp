// Usage : node test/filet-sim.mjs [graines]
// Coups de filet : compare, sur une saison, une zone qui n'en fait pas, un joueur du soir (une visite à 19:00)
// et un joueur actif (quatre visites par jour). Mesure l'IPZ, les points, les agents mobilisés et l'écart actifs / soir.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { FILET, rejouer, etapeImpossible, solMax, placesLibres, heuresParService } from '../js/engine/filet.js';

const S = Number(process.argv[2] || 24), T = 13;
// Variantes : FILET_MULT (×valeur des cibles), FILET_HJ (heures-agents par journée d'agent).
const MULT = Number(process.env.FILET_MULT || 1);
for (const k of [1, 2, 3]) FILET.valeur[k] = FILET.valeur[k].map((v) => Math.round(v * MULT));
if (process.env.FILET_HJ) FILET.heuresJour = Number(process.env.FILET_HJ);
const H = 3600 * 1000, J = 24 * H, T0 = Date.UTC(2026, 9, 5, 18); // un lundi 20:00 (heure belge)
const r1 = (v) => Math.round(v * 10) / 10;

// Décision d'un joueur à une visite : `dur` = durée préférée des étapes.
function decider(st, z, fil, t, dur) {
  const op = fil.op;
  if (!op || op.fini) {
    const eng = (fil.faits || 0) + (fil.aSolder || []).length + (op && op.fini ? 1 : 0);
    if (eng >= FILET.maxSemaine || !(fil.cibles || []).length) return null;
    const pl = placesLibres(z, fil, t).tot;
    const c = fil.cibles.slice().sort((a, b) => (Math.min(b.suspects, pl) / b.suspects) * b.valeur - (Math.min(a.suspects, pl) / a.suspects) * a.valeur)[0];
    return { k: 'ouvrir', c: c.id };
  }
  if (op.fini || (op.en && op.en.fin > t)) return null;
  const c = op.cible;
  const d = op.alerte ? Math.min(dur, 6) : dur;
  if (op.r < c.suspects + 1) return { k: 'filature', d };
  if (op.sol < 70 && !etapeImpossible(fil, 'recoupement', dur, c, t)) return { k: 'recoupement', d: dur };
  if (op.sol < 70 && op.r < 3) return { k: 'filature', d };
  return { k: 'interpellation' };
}

const PROFILS = {
  'Sans coup de filet': null,
  'Joueur du soir (19:00, étapes de 12 h)': { visites: [-1], dur: 12 },
  'Joueur du soir (19:00, étapes de 6 h)': { visites: [-1], dur: 6 },
  'Actif (8, 12, 16, 19 h, étapes de 2 h)': { visites: [-12, -8, -4, -1], dur: 2 },
  'Actif (8, 12, 16, 19 h, étapes de 6 h)': { visites: [-12, -8, -4, -1], dur: 6 },
  'Actif (8, 14, 19 h, étapes de 6 h)': { visites: [-12, -6, -1], dur: 6 },
};
const rows = [];
const base = {};
for (const [nom, prof] of Object.entries(PROFILS)) {
  let pire = 0, ipz = 0, pts = 0, reussis = 0, perdus = 0, agentsJour = 0, nJ = 0, budget = 0, pointsTerrain = 0;
  for (let s = 0; s < S; s++) {
    let st = createGame({ seed: `filet-${s}` });
    for (const p of BOT_PROFILES) st.zones[p.uid] = newZone(p, 1);
    st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    st.nextDeadline = T0; st.lastResolvedAt = T0 - J;
    const log = [];
    let somme = 0, ptsS = 0;
    for (let t = 1; t <= T; t++) {
      if (prof) for (const dv of prof.visites) {
        const v = st.nextDeadline + dv * H;
        // Plusieurs actions possibles à une même visite (ouvrir puis lancer la première étape).
        for (let k = 0; k < 3; k++) {
          const { fil, acceptees } = rejouer(st, st.zones.moi, st.zones.moi.filet, log, v, { depuis: st.lastResolvedAt });
          let a = decider(st, st.zones.moi, fil, v, prof.dur);
          if (!a) break;
          // Plafond d'agents du jour : une étape plus courte, sinon on attend.
          if (FILET.etapes[a.k]) {
            const hJ = heuresParService(acceptees);
            const essais = a.k === 'interpellation' ? [a] : [a.d, 6, 2].filter((d) => d <= a.d).map((d) => ({ ...a, d }));
            a = essais.find((x) => !etapeImpossible(fil, x.k, x.d, fil.op.cible, v, hJ)) || null;
            if (!a) break;
          }
          log.push({ ...a, s: fil.s + 1, at: v + k });
        }
      }
      const orders = {};
      for (const p of BOT_PROFILES) { const o = botOrders(st.zones[p.uid], st, p.style); if (o) orders[p.uid] = o; }
      const om = botOrders(st.zones.moi, { ...st, seed: `${st.seed}:moi` }, 'equilibre') || botOrders(st.zones.moi, { ...st, seed: `${st.seed}:moi2` }, 'prudent');
      if (om) orders.moi = om;
      const avant = st.zones.moi.filet ? st.zones.moi.filet.hist.length : 0;
      const res = resolveTurn(st, { orders, players: { moi: { filet: { log } } }, nextWeekday: (t + 1) % 7 });
      st = res.state;
      st.lastResolvedAt = st.nextDeadline; st.nextDeadline += J;
      const z = st.zones.moi;
      const lignes = (z.rapport || []).filter((l) => /^Coup de filet : \d+ agent/.test(l));
      { let j = 0; for (const l of lignes) { const n = Number(l.match(/: (\d+) agent/)[1]); agentsJour += n; j += n; } pire = Math.max(pire, j); }
      nJ++;
      for (const h of (z.filet.hist || []).slice(avant)) { if (h.fini === 'reussie') { reussis++; ptsS += h.points; } if (h.fini === 'perdue') perdus++; }
      if (t > 3) somme += z.ipz;
    }
    ipz += somme / (T - 3); pts += ptsS; budget += st.zones.moi.budget;
  }
  const m = ipz / S;
  if (!prof) base.ipz = m;
  rows.push({ profil: nom, 'IPZ moyen': r1(m), 'écart': r1(m - base.ipz), 'filets réussis / sem.': r1(reussis / S / 2), 'cibles perdues / sem.': r1(perdus / S / 2), 'points / filet': r1(reussis ? pts / reussis : 0), 'agents retirés / jour': r1(agentsJour / nJ), 'pire jour': pire, 'budget fin (k€)': r1(budget / S) });
}
console.table(rows);
