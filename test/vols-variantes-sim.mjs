// Simulation : les variantes des affaires de vol (deux complices, faux témoin, fraude à l'assurance) se résolvent-elles
// dans les mêmes délais que le moule classique ? Ni nettement plus vite, ni jamais.
// Deux profils de joueurs, sur le vrai moteur (resolveTurn) :
//  - « seul assidu » : une zone qui enquête seule (3 démarches par soir), tous les soirs, en raisonnant juste ;
//  - « cellule active » : trois zones d'une même cellule, assidues, qui s'échangent chaque soir une pièce (donnant-donnant).
// Le joueur ne connaît pas la solution : il fait d'abord les constatations, puis vérifie les suspects encore possibles
// (en commençant par le mobile quand l'affaire annonce deux complices, puisque le mobile écarte à lui seul), met sa piste
// prioritaire sur un suspect de sa cellule, et accuse dès que le parquet l'accepterait.
// node test/vols-variantes-sim.mjs   (SEEDS=… pour changer le nombre de parties ; 40 par défaut)
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { hashString } from '../js/engine/rng.js';
import { botOrders } from '../js/engine/bots.js';
import {
  VARIANTES, affaire, dossierDe, faitsConnus, candidats, accusesPrets, pieceDemarche, coutDemarche, maxDemarchesDe,
  dansMaCellule, ENQ,
} from '../js/engine/enquete.js';

const SEEDS = Number(process.env.SEEDS || 40), TOURS = 36;
const MODES = ['classique', 'complices', 'fauxTemoin', 'fraude'];
const PROFILS = { 'seul assidu': ['A'], 'cellule active': ['A', 'B', 'C'] };

/** Ordres d'enquête d'un joueur assidu et logique. */
function enqueteAssidue(state, z, uids) {
  const e = state.enquete;
  const out = { demarches: [], accusation: null, accusation2: null, piste: null, partages: [], traque: null };
  if (!e) return out;
  const aff = affaire(state, e.n);
  const d = dossierDe(state, z);
  const connus = new Set(faitsConnus(d));
  const c = candidats(aff, [...connus]).suspects;
  const prets = accusesPrets(aff, d);
  if (prets && !d.exclu && d.accuse === null) { out.accusation = prets[0]; if (prets.length > 1) out.accusation2 = prets[1]; return out; }
  const nb = maxDemarchesDe(state, z);
  let budget = z.budget - 8;
  const prendre = (x) => { const p = coutDemarche(state, z.uid, x); if (out.demarches.length < nb && p <= budget && pieceDemarche(aff, d, x)) { out.demarches.push(x); budget -= p; } };
  for (const k of ['temoin', 'cam', 'labo']) if (!connus.has(`c:${{ temoin: 'mob', cam: 'occ', labo: 'moy' }[k]}`)) prendre(k);
  // Vérifications : les suspects encore possibles, ceux de sa cellule d'abord, en largeur (le suspect le moins vérifié
  // d'abord, un élément au hasard) ; le mobile en premier quand l'affaire annonce deux complices (il écarte à lui seul).
  const sur = (i) => [...connus].filter((f) => /^(mob|moy|occ):/.test(f) && Number(f.split(':')[1]) === i).length;
  const alea = (i, k) => (hashString(`${state.seed}:${e.n}:${z.uid}:${i}:${k}`) % 1000) / 1000;
  const choix = [];
  for (const i of c) for (const k of ['banque', 'alibi', 'moyens']) {
    if (!pieceDemarche(aff, d, `${k}:${i}`)) continue;
    choix.push({ x: `${k}:${i}`, r: (dansMaCellule(state, z.uid, i) ? 0 : 100) + (aff.variante === 'complices' && k === 'banque' ? 0 : 10) + sur(i) + alea(i, k) });
  }
  choix.sort((p, q) => p.r - q.r);
  for (const { x } of choix) prendre(x);
  const miens = c.filter((i) => dansMaCellule(state, z.uid, i));
  out.piste = miens.length ? miens[e.jour % miens.length] : null;
  // Cellule : une pièce de son travail envoyée à chaque collègue (celle qu'il n'a pas), donnant-donnant.
  for (const v of uids) {
    if (v === z.uid) continue;
    const dv = new Set(faitsConnus(dossierDe(state, state.zones[v])));
    const p = d.pieces.find((x) => !['ouverture', 'rebond', 'partage'].includes(x.src) && x.f !== 'p:humidite' && !dv.has(x.f) && !out.partages.some((y) => y.f === x.f));
    if (p && out.partages.length < ENQ.maxPartages) out.partages.push({ f: p.f, a: v });
  }
  return out;
}

const res = [];
for (const [profil, uids] of Object.entries(PROFILS)) {
  for (const mode of MODES) {
    VARIANTES.force = mode;
    const jours = [];
    let total = 0, restants = 0, budgetFin = 0, rates = 0;
    for (let sd = 0; sd < SEEDS; sd++) {
      let st = createGame({ seed: `vv-${sd}` });
      st.meurtreDes = -9; st.meurtre2Des = -9; st.corbeauDes = -9; // que des vols
      const players = Object.fromEntries(uids.map((u, k) => [u, { code: String(4100 + k), nom: `Zone ${u}` }]));
      st = resolveTurn(st, { players }).state;
      const base = {};
      let n0 = null, compte = false, fini = false, dernier = null;
      for (let t = 0; t < TOURS; t++) {
        const e = st.enquete;
        if (e && e.n !== n0) {
          // Affaire précédente jamais résolue : on note ce qui manquait (suspects encore possibles, budget).
          // (une affaire coupée avant le jour 7, par la fin de saison, ne compte pas)
          if (compte && !fini && dernier && dernier.j >= ENQ.dureeMax) { total++; rates++; restants += dernier.c; budgetFin += dernier.b; }
          n0 = e.n; fini = false;
          // On ne compte que les affaires du mode étudié (la fraude n'existe pas dans tous les décors ; la 1re affaire est toujours classique).
          compte = n0 >= 2 && (affaire(st, n0).variante || 'classique') === mode;
        }
        if (e) {
          const aff = affaire(st, e.n);
          dernier = { c: Math.min(...uids.map((u) => candidats(aff, faitsConnus(dossierDe(st, st.zones[u]))).suspects.length)), b: uids.reduce((a, u) => a + st.zones[u].budget, 0) / uids.length, j: e.jour };
        }
        const orders = {};
        for (const u of uids) {
          const o = botOrders(st.zones[u], st, 'equilibre') || base[u];
          if (!o) continue;
          base[u] = o;
          // Un enquêteur assidu garde son budget pour l'enquête : pas d'achat sous 45 k€, pas de dépenses de confort.
          orders[u] = { ...o, decision: st.zones[u].budget > 45 ? o.decision : null, depenses: {}, ...enqueteAssidue(st, st.zones[u], uids) };
        }
        const jour0 = e ? e.jour : null;
        const r = resolveTurn(st, { players, orders, nextWeekday: (t + 2) % 7 });
        if (r.gazette.enquete && r.gazette.enquete.decouverte && compte && !fini) { jours.push(jour0); total++; fini = true; }
        st = r.state;
      }
    }
    const moy = jours.reduce((a, b) => a + b, 0) / (jours.length || 1);
    const pct = (k) => `${Math.round((100 * jours.filter((x) => x <= k).length) / (total || 1))} %`;
    res.push({ profil, affaire: mode, affaires: total, 'résolues': `${Math.round((100 * jours.length) / (total || 1))} %`, 'jour moyen': moy.toFixed(2), '≤ J4': pct(4), '≤ J5': pct(5), '≤ J6': pct(6), '≤ J7': pct(7),
      'non résolues : suspects restants / budget': rates ? `${(restants / rates).toFixed(1)} / ${Math.round(budgetFin / rates)} k€` : '-' });
  }
}
VARIANTES.force = null;
console.table(res);
