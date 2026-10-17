// Usage : node test/absence-sim.mjs [graines=16] [tours=13]
// Prototype « Pendant ton absence » (rien n'est branché dans le jeu) : des situations tombent à toute heure,
// attendent le joueur et s'aggravent par étapes. Sans réponse, l'officier de garde tranche.
// Variante A : l'officier de garde donne toujours un résultat neutre (0).
// Variante B : neutre, sauf les escalades de quartier laissées à elles-mêmes (légère perte).
// Le vrai moteur calcule les tours de 20:00 ; les effets des situations sont versés juste avant le tour
// (points de terrain, budget, moral, satisfaction, réputation, blessés) et les agents engagés sont retirés
// des ordres du soir, comme pour les coups de filet.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { TERRAIN, SERVICES } from '../js/engine/constants.js';
import { makeRng } from '../js/engine/rng.js';

const S = Number(process.argv[2] || 16), T = Number(process.argv[3] || 13);
const r1 = (v) => Math.round(v * 10) / 10;
const MULT = Number(process.env.ABS_MULT || 1);      // ×récompenses
const PAR_JOUR = Number(process.env.ABS_JOUR || 1.5); // situations par jour (moyenne)
const MAX_ATTENTE = 3;

// Étapes : [fin de l'étape en heures depuis l'apparition, effet si on répond pendant l'étape].
// eff : pts (terrain), k€, moral, sat, rep, ps, ha { service: heures-agents } (12 h = un agent retiré ce soir), p = chance de réussite,
// blesse = chance d'un agent blessé (3 tours).
const TYPES = {
  gav: { poids: 0.25, nom: 'Garde à vue', etapes: [
    [6, { ha: { recherche: 6 }, p: 0.75, pts: 5, ps: 1 }],         // audition « à chaud » (2 agents × 3 h)
    [24, { ha: { recherche: 6 }, p: 0.45, pts: 5, ps: 1 }],
  ], defaut: { A: {}, B: {} } },                                    // remis en liberté par le parquet
  escalade: { poids: 0.3, nom: 'Escalade de quartier', etapes: [
    [4, { ha: { proximite: 4 }, pts: 2.5, sat: 1 }],                 // médiation (2 agents × 2 h)
    [12, { ha: { intervention: 12 }, pts: 1.5 }],                     // rixe (4 × 3 h)
    [24, { ha: { intervention: 24 }, pts: 3, blesse: 0.15 }], // troubles (6 × 4 h)
  ], defaut: { A: {}, B: { sat: -Number(process.env.ABS_BS || 3), rep: -Number(process.env.ABS_BR || 2) } } },
  opportunite: { poids: 0.2, nom: 'Opportunité', etapes: [
    [12, { keur: -1, p: 0.6, pts: 5 }],                            // tuyau d'un indic, payé 1 000 €
  ], defaut: { A: {}, B: {} } },
  interne: { poids: 0.15, nom: 'Pépin interne', etapes: [
    [12, { choix: true }],                                          // soutenir (+3 moral) ou sanctionner (+2 rép., −1 moral)
  ], defaut: { A: {}, B: {} } },
  voisin: { poids: 0.1, nom: 'Demande d’un voisin', etapes: [
    [12, { ha: { intervention: 12 }, pts: 1.5, rep: 2, ps: 2 }],     // 2 agents × 6 h
  ], defaut: { A: {}, B: {} } },
};
const DUREE = Object.fromEntries(Object.entries(TYPES).map(([k, t]) => [k, t.etapes[t.etapes.length - 1][0]]));

// Visites en heure locale ; p = chance de passer à cette heure-là un jour donné.
const PROFILS = {
  'Sans le système': null,
  'Assidu (8, 12, 17, 19 h)': [[8, 0.9], [12.5, 0.9], [17, 0.85], [19.5, 0.95]],
  'Midi et soir (12, 19 h)': [[12.5, 0.85], [19.5, 0.95]],
  'Joueur du soir (19 h)': [[19.5, 0.95]],
  'Occasionnel (1 jour sur 2)': [[19.5, 0.5]],
  'Absent (2 fois / semaine)': [[19.5, 0.28]],
};
// Heure locale → heures depuis le 20:00 précédent.
const depuis20 = (L) => (L - 20 + 24) % 24;

function tirerSituations(rng, jour) {
  const n = rng.chance(PAR_JOUR - Math.floor(PAR_JOUR)) ? Math.ceil(PAR_JOUR) : Math.floor(PAR_JOUR);
  const out = [];
  for (let i = 0; i < n; i++) {
    const L = rng.chance(0.7) ? rng.float(7, 19) : (rng.chance(0.5) ? rng.float(19, 24) : rng.float(0, 7));
    let x = rng.next(), type = 'gav';
    for (const [k, t] of Object.entries(TYPES)) { if (x < t.poids) { type = k; break; } x -= t.poids; }
    out.push({ type, h: 24 * (jour - 1) + depuis20(L) });
  }
  return out.sort((a, b) => a.h - b.h);
}

function effetReponse(rng, s, z, h) {
  const t = TYPES[s.type], age = h - s.h;
  const k = t.etapes.findIndex(([fin]) => age <= fin);
  const e = t.etapes[k][1];
  const out = { etape: k, ha: e.ha || {} };
  if (e.choix) { if (z.moral < 70) out.moral = 3; else { out.rep = 2; out.moral = -1; } return out; }
  if (e.keur) out.keur = e.keur;
  const ok = e.p === undefined || rng.chance(e.p);
  if (ok) for (const c of ['pts', 'sat', 'rep', 'ps', 'moral']) if (e[c]) out[c] = (out[c] || 0) + (e[c] > 0 ? e[c] * MULT : e[c]);
  if (e.blesse && rng.chance(e.blesse)) out.blesse = 1;
  return out;
}

function simuler(nom, visites, variante) {
  const acc = { ipz: 0, apparues: 0, repondues: 0, etape1: 0, defauts: 0, agentsJour: 0, pire: 0, pts: 0, attenteSoir: 0, plein: 0, jours: 0, perte: 0 };
  let ipzBase = 0;
  for (let s = 0; s < S; s++) {
    let st = createGame({ seed: `abs-${s}` });
    for (const p of BOT_PROFILES) st.zones[p.uid] = newZone(p, 1);
    st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    const rng = makeRng(`abs-${s}-${nom}`), rngR = makeRng(`abs-r-${s}`);
    const rngGen = makeRng(`abs-gen-${s}`); // mêmes situations pour tous les profils
    const enAttente = [];
    let somme = 0;
    for (let t = 1; t <= T; t++) {
      const z = st.zones.moi;
      const eff = { pts: 0, keur: 0, moral: 0, sat: 0, rep: 0, ps: 0, blesse: 0, ha: {} };
      const ajouter = (e) => { for (const c of ['pts', 'keur', 'moral', 'sat', 'rep', 'ps', 'blesse']) eff[c] += e[c] || 0; for (const [sv, n] of Object.entries(e.ha || {})) eff.ha[sv] = (eff.ha[sv] || 0) + n; };
      const nouvelles = tirerSituations(rngGen, t);
      const jVisites = visites ? visites.filter(([, p]) => rng.chance(p)).map(([L]) => 24 * (t - 1) + depuis20(L)) : [];
      // Événements de la journée dans l'ordre : apparitions, visites, expirations.
      const evts = [...nouvelles.map((x) => ({ h: x.h, k: 'nouv', x })), ...jVisites.map((h) => ({ h, k: 'visite' }))].sort((a, b) => a.h - b.h);
      const expirer = (h) => {
        for (let i = enAttente.length - 1; i >= 0; i--) {
          const x = enAttente[i];
          if (h - x.h > DUREE[x.type]) { enAttente.splice(i, 1); acc.defauts++; const d = TYPES[x.type].defaut[variante]; ajouter(d); acc.perte += (d.sat || 0) + (d.rep || 0); }
        }
      };
      for (const e of evts) {
        expirer(e.h);
        if (e.k === 'nouv') {
          if (!visites) continue;
          if (enAttente.length >= MAX_ATTENTE) { acc.plein++; continue; }
          enAttente.push(e.x); acc.apparues++;
        } else {
          // Visite : on traite tout ce qui attend (sauf une opportunité trop chère).
          for (const x of enAttente.splice(0)) {
            if (x.type === 'opportunite' && z.budget < 3) { enAttente.push(x); continue; }
            const r = effetReponse(rngR, x, z, e.h);
            ajouter(r); acc.repondues++; if (r.etape === 0) acc.etape1++;
          }
        }
      }
      expirer(24 * t);
      acc.attenteSoir += enAttente.length;
      // Versement avant le tour de 20:00.
      z.bilanTerrain = (z.bilanTerrain || 0) + eff.pts / TERRAIN.report;
      z.budget += eff.keur; z.moral += eff.moral; z.satisfaction += eff.sat; z.reputation += eff.rep;
      z.ps = (z.ps || 0) + eff.ps;
      if (eff.blesse) z.blesses.push({ n: eff.blesse, retour: st.turn + 4, motif: 'blessé' });
      acc.pts += eff.pts;
      const orders = {};
      for (const p of BOT_PROFILES) { const o = botOrders(st.zones[p.uid], st, p.style); if (o) orders[p.uid] = o; }
      const om = botOrders(z, { ...st, seed: `${st.seed}:moi` }, 'equilibre') || botOrders(z, { ...st, seed: `${st.seed}:moi2` }, 'prudent');
      let engages = 0;
      if (om && om.alloc) {
        om.alloc = { ...om.alloc };
        for (const [sv, h] of Object.entries(eff.ha)) {
          const n0 = Math.ceil(h / 12); // une journée d'agent = 12 heures-agents (comme les coups de filet)
          let n = n0; const pris = Math.min(n, om.alloc[sv] || 0); om.alloc[sv] -= pris; n -= pris; engages += pris;
          for (const o2 of SERVICES.filter((k) => k !== sv).sort((a, b) => (om.alloc[b] || 0) - (om.alloc[a] || 0))) { if (!n) break; const p2 = Math.min(n, om.alloc[o2] || 0); om.alloc[o2] -= p2; n -= p2; engages += p2; }
        }
        orders.moi = om;
      }
      acc.agentsJour += engages; acc.pire = Math.max(acc.pire, engages); acc.jours++;
      const res = resolveTurn(st, { orders, players: {}, nextWeekday: (t + 1) % 7 });
      st = res.state;
      if (t > 3) somme += st.zones.moi.ipz;
    }
    acc.ipz += somme / (T - 3);
  }
  return acc;
}

for (const variante of ['A', 'B']) {
  const rows = []; let base = null;
  for (const [nom, v] of Object.entries(PROFILS)) {
    const a = simuler(nom, v, variante);
    const ipz = a.ipz / S; if (base === null) base = ipz;
    const j = a.jours || 1;
    rows.push({
      profil: nom, 'IPZ moyen': r1(ipz), 'écart': r1(ipz - base),
      'situations / jour': r1(a.apparues / j), 'traitées %': a.apparues ? Math.round(100 * a.repondues / a.apparues) : 0,
      'dès l’étape 1 %': a.repondues ? Math.round(100 * a.etape1 / a.repondues) : 0,
      'laissées au garde / sem.': r1(a.defauts / j * 7), 'en attente à 20:00': r1(a.attenteSoir / j),
      'agents engagés / jour': r1(a.agentsJour / j), 'pire jour': a.pire, 'pts terrain / jour': r1(a.pts / j),
    });
  }
  console.log(`\nVariante ${variante} — ${variante === 'A' ? 'officier de garde neutre partout' : 'escalades ignorées : −3 satisfaction, −2 réputation'} (${S} graines, ${T} tours, ${PAR_JOUR} situation(s)/jour)`);
  console.table(rows);
}
