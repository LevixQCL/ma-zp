// Fin de saison : « on retire un niveau partout (et le matériel repart à 1) » comparé au « Bilan de saison »
// (des cas concrets — départs à la pension, matériel cassé, entretien — calculés sur la moyenne du district,
// avec une remise en état payable en début de saison suivante).
// Saison 1 jouée par des robots « humains » qui investissent, puis saison 2 jouée à l'identique dans les deux branches.
// node test/fin-saison-sim.mjs [nbZones=12] [graines=12]
import { createGame, resolveTurn, buildJoinZone } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone, moyenneIpz, decisionImpossible, coutDecision } from '../js/engine/zone.js';
import { SERVICES, NIVEAU_MAX, BATIMENTS, BATIMENT_MAX, COUTS, coutEquipement, SEASON_LENGTH } from '../js/engine/constants.js';
import { makeRng } from '../js/engine/rng.js';

const N = Number(process.argv[2] || 12), SEEDS = Number(process.argv[3] || 12);
const clone = (o) => JSON.parse(JSON.stringify(o));
const f = (x) => Math.round(x * 10) / 10;

// assid : chance de jouer un jour ; invest : envie d'investir quand la caisse le permet ; focus : services préférés.
const PROFILS = [
  { nom: 'Assidu équilibré', assid: 0.95, invest: 0.8, style: 'equilibre', rachete: 0.9 },
  { nom: 'Assidu spécialiste', assid: 0.95, invest: 0.85, style: 'agressif', focus: ['intervention', 'roulage'], rachete: 0.9 },
  { nom: 'Bâtisseur', assid: 0.9, invest: 0.8, style: 'equilibre', batit: true, rachete: 0.8 },
  { nom: 'Régulier', assid: 0.8, invest: 0.55, style: 'equilibre', rachete: 0.6 },
  { nom: 'Prudent', assid: 0.85, invest: 0.4, style: 'prudent', rachete: 0.5 },
  { nom: 'Occasionnel', assid: 0.55, invest: 0.35, style: 'equilibre', rachete: 0.3 },
  { nom: 'Distrait', assid: 0.45, invest: 0.25, style: 'distrait', rachete: 0.1 },
  { nom: 'Arrive tard (J8)', assid: 0.85, invest: 0.6, style: 'equilibre', arrive: 8, rachete: 0.6 },
];

/** Décision d'investissement « humaine » (formation, matériel, agrandissement). */
function investir(z, state, p, rng) {
  if (!rng.chance(p.invest) || z.budget < 18) return null;
  const T = state.turn;
  const cibles = p.focus && rng.chance(0.7) ? p.focus : SERVICES;
  const s = rng.pick(cibles);
  const opts = [{ type: 'former', service: s }, { type: 'equiper', cible: s }];
  if (p.batit || rng.chance(0.3)) opts.push({ type: 'agrandir', batiment: rng.chance(0.6) ? 'bureaux' : 'garage' });
  const d = rng.pick(opts);
  if (decisionImpossible(z, d, T) || z.budget - coutDecision(z, d) < 8) return null;
  if (d.type === 'agrandir' && d.batiment === 'bureaux') { /* les recrues suivent : géré par les robots */ }
  return d;
}

function jouer(state, prof, seed, saison, tours, hook) {
  for (let t = 1; t <= tours; t++) {
    for (const [uid, p] of Object.entries(prof)) if (saison === 1 && p.arrive === t) state.zones[uid] = buildJoinZone(state, uid, { code: String(5390 + Object.keys(state.zones).length), nom: uid }, t, t);
    if (hook) hook(state, t);
    const orders = {};
    for (const [uid, z] of Object.entries(state.zones)) {
      const p = prof[uid];
      const rng = makeRng(`${seed}:s${saison}:${uid}:${t}`);
      if (!rng.chance(p.assid)) continue;
      const o = botOrders(z, state, p.style);
      if (!o) continue;
      const inv = investir(z, state, p, rng);
      if (inv) o.decision = inv;
      if (state.turn === SEASON_LENGTH && saison === 1) o.decision = null; // pas d'achat le dernier soir (photo de fin de saison stable)
      orders[uid] = o;
    }
    state = resolveTurn(state, { orders, quests: {}, nextWeekday: (t + 1) % 7 }).state;
  }
  return state;
}

// ───── Valeur des niveaux (k€) : ce qu'ils ont coûté ─────
const valeur = {
  formation: () => COUTS.formation,
  equip: (n) => coutEquipement(n - 1),           // le niveau n a coûté coutEquipement(n-1)
  bureaux: (n) => BATIMENTS.bureaux.coutAgrandir(n - 1),
  garage: (n) => BATIMENTS.garage.coutAgrandir(n - 1),
};
function items(z) {
  const l = [];
  for (const s of SERVICES) { l.push({ k: 'niveaux', s, n: z.niveaux[s] }); l.push({ k: 'equip', s, n: z.equip[s] }); }
  l.push({ k: 'batiments', s: 'bureaux', n: z.batiments.bureaux }); l.push({ k: 'batiments', s: 'garage', n: z.batiments.garage });
  return l;
}
const points = (z) => items(z).reduce((a, it) => a + it.n - 1, 0);
const prixNiveau = (it) => it.k === 'niveaux' ? valeur.formation() : it.k === 'equip' ? valeur.equip(it.n) : valeur[it.s](it.n);

/** Règle actuelle : formations et bâtiments −1 (min 1), matériel remis à 1. */
function regleActuelle(z) {
  let perdus = 0, k = 0;
  for (const it of items(z)) {
    const apres = it.k === 'equip' ? 1 : Math.max(1, it.n - 1);
    for (let n = it.n; n > apres; n--) { perdus++; k += prixNiveau({ ...it, n }); }
  }
  return { perdus, keuros: k };
}

/**
 * Bilan de saison : nombre de cas = PART × points + SURPLUS × (points au-dessus de la moyenne du district).
 * Chaque cas retire un niveau à l'élément le plus au-dessus de la moyenne du district pour cet élément
 * (au plus 2 par élément) ; l'hôtel de police ne redescend jamais sous 4 une fois atteint.
 * Retourne les cas (avec leur prix de remise en état) et la zone modifiée.
 */
function bilan(z, moy, P, rng) {
  const pts = points(z);
  const nb = Math.round(P.part * pts + P.surplus * Math.max(0, pts - moy.total));
  const etat = items(z).map((it) => ({ ...it, pris: 0 }));
  const cas = [];
  for (let i = 0; i < nb; i++) {
    const cand = etat.filter((it) => it.n > 1 && it.pris < 2 && !(it.s === 'bureaux' && it.n <= 4 && z.batiments.bureaux >= 4))
      .map((it) => ({ it, ecart: it.n - moy[`${it.k}:${it.s}`] + rng.float(0, 0.4) }))
      .sort((a, b) => b.ecart - a.ecart);
    if (!cand.length) break;
    const it = cand[0].it;
    cas.push({ k: it.k, s: it.s, de: it.n, prix: Math.round(prixNiveau(it) * P.rachat * 10) / 10 });
    it.n--; it.pris++;
  }
  return { cas, nb };
}

function appliquerBilan(nz, avant, b) {
  for (const s of SERVICES) { nz.niveaux[s] = avant.niveaux[s]; nz.equip[s] = avant.equip[s]; }
  nz.batiments = { ...avant.batiments };
  for (const c of b.cas) { if (c.k === 'batiments') nz.batiments[c.s]--; else nz[c.k][c.s]--; }
}

const REGLES = {
  'Actuel (−1 partout, matériel à 1)': null,
  'Bilan doux (30 % + 30 % du surplus)': { part: 0.30, surplus: 0.30, rachat: 0.5, plafondRachat: 0.5 },
  'Bilan moyen (40 % + 40 % du surplus)': { part: 0.40, surplus: 0.40, rachat: 0.5, plafondRachat: 0.5 },
  'Bilan ciblé (35 % + 70 % du surplus)': { part: 0.35, surplus: 0.70, rachat: 0.5, plafondRachat: 0.5 },
  'Bilan moyen sans rachat': { part: 0.40, surplus: 0.40, rachat: 0.5, plafondRachat: 0 },
};

const agg = {};
for (let sd = 0; sd < SEEDS; sd++) {
  const seed = `fin-${N}-${sd}`;
  let s1 = createGame({ seed });
  const prof = {};
  for (let i = 0; i < N; i++) {
    const uid = `z${String(i).padStart(2, '0')}`;
    prof[uid] = PROFILS[i % PROFILS.length];
    if (!prof[uid].arrive) s1.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Z${i}` }, 1, { arrivee: i });
  }
  s1 = jouer(s1, prof, seed, 1, SEASON_LENGTH - 1);
  const photo = clone(s1.zones);
  const apres = jouer(clone(s1), prof, seed, 1.5, 1); // tour 14 : fin de saison (règle actuelle dans le moteur)
  const actifs = Object.values(photo).filter((z) => z.toursJoues >= 3);
  const moy = { total: actifs.reduce((a, z) => a + points(z), 0) / actifs.length };
  for (const it of items(actifs[0])) moy[`${it.k}:${it.s}`] = actifs.reduce((a, z) => a + items(z).find((x) => x.k === it.k && x.s === it.s).n, 0) / actifs.length;

  for (const [nomR, P] of Object.entries(REGLES)) {
    const st = clone(apres);
    const pertes = {};
    for (const [uid, z] of Object.entries(photo)) {
      if (!st.zones[uid]) continue;
      if (!P) { const r = regleActuelle(z); pertes[uid] = { ...r, cas: [], pts: points(z) }; continue; }
      const b = bilan(z, moy, P, makeRng(`${seed}:bilan:${uid}`));
      appliquerBilan(st.zones[uid], z, b);
      pertes[uid] = { perdus: b.cas.length, keuros: b.cas.reduce((a, c) => a + c.prix / P.rachat, 0), cas: b.cas, pts: points(z), rachats: 0, depense: 0 };
    }
    // Saison 2 : remise en état possible pendant les 3 premiers soirs (au plus plafondRachat des cas).
    const hook = P ? (state, t) => {
      if (t > 3) return;
      for (const [uid, z] of Object.entries(state.zones)) {
        const pe = pertes[uid]; if (!pe) continue;
        const rng = makeRng(`${seed}:rachat:${uid}:${t}`);
        const max = Math.floor(pe.cas.length * P.plafondRachat);
        for (const c of pe.cas.slice().sort((a, b) => a.prix - b.prix)) {
          if (c.rachete || pe.rachats >= max || z.budget - c.prix < 35 || !rng.chance(prof[uid].rachete)) continue;
          z.budget -= c.prix; c.rachete = true; pe.rachats++; pe.depense += c.prix;
          if (c.k === 'batiments') z.batiments[c.s]++; else z[c.k][c.s]++;
        }
      }
    } : null;
    const s2 = jouer(st, prof, seed, 2, SEASON_LENGTH - 1, hook);
    const classes = Object.values(s2.zones).filter((z) => z.toursJoues >= 5).map((z) => ({ uid: z.uid, ipz: moyenneIpz(z) })).sort((a, b) => b.ipz - a.ipz);
    const a = (agg[nomR] ||= { ipz: [], parProfil: {}, perdus: 0, pts: 0, n: 0, k: 0, rachats: 0, depense: 0, cas: 0 });
    const lst = classes.map((c) => c.ipz);
    a.ipz.push({ moy: lst.reduce((x, y) => x + y, 0) / lst.length, ecart: lst[0] - lst[lst.length - 1] });
    classes.forEach((c, i) => {
      const p = prof[c.uid].nom, pe = pertes[c.uid] || { perdus: 0, pts: 0, keuros: 0 };
      const q = (a.parProfil[p] ||= { ipz: 0, rang: 0, n: 0, perdus: 0, pts: 0, k: 0, rachats: 0 });
      q.ipz += c.ipz; q.rang += i + 1; q.n++; q.perdus += pe.perdus; q.pts += pe.pts; q.k += pe.keuros; q.rachats += pe.rachats || 0;
    });
    for (const pe of Object.values(pertes)) { a.perdus += pe.perdus; a.pts += pe.pts; a.n++; a.k += pe.keuros; a.rachats += pe.rachats || 0; a.depense += pe.depense || 0; a.cas += pe.cas.length; }
    if (sd === 0 && P && nomR.startsWith('Bilan moyen (')) {
      console.log(`\nExemple (graine 0, ${nomR}) — moyenne du district : ${f(moy.total)} niveaux au-dessus du départ`);
      for (const [uid, pe] of Object.entries(pertes)) console.log(`  ${prof[uid].nom.padEnd(20)} ${String(pe.pts).padStart(2)} niv. → ${pe.cas.length} cas : ${pe.cas.map((c) => `${c.k === 'niveaux' ? 'form.' : c.k === 'equip' ? 'mat.' : ''}${c.s.slice(0, 5)} ${c.de}→${c.de - 1}${c.rachete ? ' (remis, ' + c.prix + ' k€)' : ''}`).join(', ')}`);
    }
  }
}

console.log(`\n=== ${N} zones, ${SEEDS} parties : saison 1 jouée, fin de saison, saison 2 jouée ===`);
console.table(Object.entries(agg).map(([nom, a]) => ({
  règle: nom,
  'niveaux gagnés S1 (moy.)': f(a.pts / a.n), 'niveaux perdus (moy.)': f(a.perdus / a.n), '% perdu': Math.round(100 * a.perdus / a.pts),
  'valeur perdue k€': f(a.k / a.n), 'remises en état / zone': f(a.rachats / a.n), 'dépensé k€': f(a.depense / a.n),
  'IPZ S2 moyen': f(a.ipz.reduce((x, y) => x + y.moy, 0) / a.ipz.length), 'écart 1er–dernier S2': f(a.ipz.reduce((x, y) => x + y.ecart, 0) / a.ipz.length),
})));
for (const [nom, a] of Object.entries(agg)) {
  console.log(`\n${nom}`);
  console.table(PROFILS.map((p) => { const q = a.parProfil[p.nom]; return q ? { profil: p.nom, 'niv. S1': f(q.pts / q.n), perdus: f(q.perdus / q.n), '% perdu': Math.round(100 * q.perdus / Math.max(1, q.pts)), 'remises': f(q.rachats / q.n), 'IPZ S2': f(q.ipz / q.n), 'rang S2': f(q.rang / q.n) } : { profil: p.nom }; }));
}
