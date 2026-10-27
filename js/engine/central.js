// Le central (calque « Ma zone » de la Carte, phase de test) : la zone tourne en temps réel, sur toute la journée de tour
// (de 20:00 la veille à 20:00). Les appels tombent à des minutes tirées d'une graine (partie, saison, tour, zone) ;
// les équipes mettent de vraies minutes à arriver et à régler l'affaire. Le joueur passe quand il veut : il dispatche,
// redirige, met une équipe en pause ou en poste, se renseigne. Sans lui, l'adjoint dispatche au bout de 10 minutes.
// Tout est recalculé à partir des actions horodatées du joueur : même résultat sur tous les appareils, aucun hasard
// à la résolution. À 20 h, le calcul du tour rejoue la journée (heure des actions donnée par le serveur) et l'inscrit
// au carnet de la zone : saisies, confiscation, pièce d'enquête, trophées, classement du central.
import { makeRng } from './rng.js';
import { carteQuartiers } from './quartiers.js';
import { vehiculesDisponibles } from './zone.js';

export const CENTRAL = {
  jour: 1440,                       // minutes dans une journée de tour (20:00 → 20:00)
  delaiAdjoint: 10,                 // l'adjoint dispatche un appel resté 10 minutes sans équipe
  aggravation: 30,                  // un cran de gravité par 30 minutes d'attente
  aTemps: 15,                       // sur place dans le quart d'heure : à temps
  route: { base: 4, parQuartier: 6, moto: 3 },
  surPlace: (g) => 8 + 6 * g,       // minutes sur place selon la gravité
  pause: 20, fatigue: 3, repos: 45, // à la 4e mission sans pause, le résultat baisse d'un cran ; 45 min sans mission reposent
  reprise: 60,                      // un appel mal réglé peut reprendre une heure plus tard
  annonce: 60,                      // les événements annoncés le sont une heure avant
  renseignements: 6,                // coups de fil au requérant par jour
  pts: { maitrise: 3, moyen: 1, deborde: -1, incident: -3, arretee: 4, saisie: 1, rare: 2 },
  fouille: 10,                      // minutes de plus sur place pour fouiller
  chanceFouille: { maitrise: 0.6, arretee: 0.8, moyen: 0.35, deborde: 0.15, incident: 0 },
  confiscation: 10,                 // valeur de saisies qui fait une confiscation (vendue par le parquet)
  produitConfiscation: 2.5,         // k€ versés à la zone à chaque confiscation
  maxActions: 600,
  // Appels par heure selon l'heure de la journée (heure de Bruxelles).
  debit: (h) => (h >= 2 && h < 8 ? 1 : h < 12 && h >= 8 ? 2.4 : h < 18 && h >= 12 ? 3 : h >= 18 && h < 23 ? 3.6 : 2.4),
  plafondJour: 25,                  // classement : chaque journée compte de 0 à +25 (la présence ne fait pas tout)
  consignes: { fouille: 'non', reserve: null, pause: 3 },
};
export const STATUTS_C = { maitrise: 'Maîtrisé', moyen: 'Moyen', deborde: 'Débordé', incident: 'Incident', arretee: 'Bande arrêtée' };
const PIRE = { maitrise: 'moyen', moyen: 'deborde', deborde: 'incident', incident: 'incident', arretee: 'moyen' };
const RATE = new Set(['moyen', 'deborde', 'incident']);
const KINDS = new Set(['envoi', 'pause', 'poste', 'rens', 'fouille', 'consigne']);

export const TYPES_C = [
  { titre: 'Rixe à la sortie d’un café', tags: ['violence', 'ivresse'], g: 2, suite: true, w: 3, f: 'rixe' },
  { titre: 'Tapage nocturne', tags: ['médiation'], g: 1, suite: true, w: 3, f: 'tapage' },
  { titre: 'Accident avec blessé', tags: ['véhicule'], g: 2, w: 3, f: 'accident' },
  { titre: 'Différend de voisinage', tags: ['médiation'], g: 2, suite: true, w: 3 },
  { titre: 'Violences intrafamiliales', tags: ['violence', 'médiation'], g: 3, suite: true, w: 2, f: 'vif' },
  { titre: 'Ivresse sur la voie publique', tags: ['ivresse'], g: 1, w: 3, f: 'ivresse' },
  { titre: 'Bande de cambrioleurs signalée', tags: ['bande'], g: 3, w: 2, f: 'bande' },
  { titre: 'Rodéo en scooter', tags: ['véhicule'], g: 1, w: 2, f: 'rodeo' },
  { titre: 'Vol à l’étalage avec violence', tags: ['violence'], g: 2, w: 2, f: 'etalage' },
  { titre: 'Personne désorientée', tags: ['médiation'], g: 1, w: 2 },
];
const ANNONCES = [
  { titre: 'Sortie de match', texte: 'risque de bagarres', type: 'Bagarre en sortie de match', tags: ['violence', 'ivresse'], g: 3, n: 2, f: 'match' },
  { titre: 'Fête de quartier', texte: 'tapage et ivresse attendus', type: 'Fête qui dégénère', tags: ['médiation', 'ivresse'], g: 2, n: 2, f: 'fete' },
  { titre: 'Marché du soir', texte: 'vols et accrochages', type: 'Accrochage au marché', tags: ['véhicule'], g: 2, n: 1, f: 'marche' },
  { titre: 'Bande repérée par la zone voisine', texte: 'passage probable', type: 'Bande de cambrioleurs signalée', tags: ['bande'], g: 3, n: 1, f: 'bande' },
];
/** Tous les types d'appel du carnet (titres uniques). */
export const CARNET_TYPES = [...new Set([...TYPES_C.map((t) => t.titre), ...ANNONCES.map((a) => a.type)])];

// Ce qu'une fouille peut trouver. val : valeur pour la confiscation ; piste : un indice pour ton
// enquête ; rare : +2 au lieu de +1 ; interp : l'auteur est interpellé.
export const SAISIES_C = {
  couteau: { nom: 'Couteau', ico: '🔪', val: 1 },
  cannabis: { nom: 'Cannabis', ico: '🌿', val: 1 },
  poing: { nom: 'Poing américain', ico: '✊', val: 1 },
  sono: { nom: 'Matériel de sonorisation', ico: '🔊', val: 1 },
  plaques: { nom: 'Plaques volées', ico: '🔖', val: 1 },
  piedbiche: { nom: 'Pied-de-biche', ico: '🔧', val: 1 },
  bijoux: { nom: 'Bijoux volés', ico: '💍', val: 2 },
  telephone: { nom: 'Téléphone du guetteur', ico: '📱', val: 1, piste: true },
  voiture: { nom: 'Voiture volée', ico: '🚗', val: 3 },
  scooter: { nom: 'Scooter volé', ico: '🛵', val: 2 },
  marchandise: { nom: 'Marchandise volée', ico: '🛍️', val: 1 },
  carte: { nom: 'Carte bancaire volée', ico: '💳', val: 1, piste: true },
  fumigene: { nom: 'Fumigènes', ico: '🧨', val: 1 },
  contrefacon: { nom: 'Contrefaçons', ico: '👜', val: 2 },
  armefeu: { nom: 'Arme à feu', ico: '🔫', val: 2, rare: true, interp: true, acc: 'saisie' },
  fauxbillets: { nom: 'Faux billets', ico: '💶', val: 3, rare: true, piste: true, acc: 'saisis' },
  carnet: { nom: 'Carnet de comptes', ico: '📒', val: 1, rare: true, piste: true, acc: 'saisi' },
};
// Poids de chaque objet selon le type d'appel (une fouille ne trouve qu'un objet).
const FOUILLE = {
  rixe: { couteau: 3, poing: 2, cannabis: 2, armefeu: 0.3 },
  tapage: { sono: 3, cannabis: 2 },
  accident: { cannabis: 2, plaques: 2, voiture: 0.5 },
  vif: { couteau: 3, armefeu: 0.5 },
  ivresse: { cannabis: 2, couteau: 1 },
  bande: { piedbiche: 3, bijoux: 2, telephone: 2, voiture: 1, carnet: 0.4 },
  rodeo: { scooter: 3, cannabis: 1 },
  etalage: { marchandise: 3, couteau: 1, carte: 1, fauxbillets: 0.3 },
  match: { fumigene: 3, couteau: 1, cannabis: 1 },
  fete: { sono: 2, cannabis: 2, carnet: 0.2 },
  marche: { contrefacon: 3, plaques: 1, fauxbillets: 0.4 },
};
/** On peut fouiller sur cet appel. */
export const fouillable = (a) => !!(a && a.f && FOUILLE[a.f]);

/** Heure de Bruxelles (en heures, 0-24) d'une minute de la journée de tour (minute 0 = 20:00). */
export const heureDe = (m) => ((20 * 60 + m) / 60) % 24;
export function horloge(m) { const t = (20 * 60 + Math.floor(m)) % 1440; return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')}`; }

/** Équipes du central, tirées de la gestion (véhicules disponibles, formations). */
export function equipesCentral(zone, { capitale, autre, vehicules = 4 } = {}) {
  const niv = zone.niveaux || {};
  const nC = Math.max(1, Math.min(3, Math.floor(vehicules / 2)));
  const out = [];
  for (let i = 0; i < nC; i++) out.push({ id: `C${i + 1}`, nom: `Combi ${i + 1}`, serv: 'Intervention', comp: (niv.intervention || 1) >= 2 || i === 0 ? ['violence', 'ivresse'] : ['violence'], base: capitale });
  out.push({ id: 'PA', nom: 'Patrouille A', serv: 'Proximité', comp: (niv.proximite || 1) >= 2 ? ['médiation', 'ivresse'] : ['médiation'], base: autre ?? capitale });
  out.push({ id: 'PB', nom: 'Patrouille B', serv: 'Proximité', comp: ['médiation'], base: capitale, moto: vehicules >= 3 });
  out.push({ id: 'K1', nom: 'Contrôle', serv: 'Roulage', comp: ['véhicule', 'bande'], base: capitale });
  if ((niv.roulage || 1) >= 3) out.push({ id: 'K2', nom: 'Contrôle 2', serv: 'Roulage', comp: ['véhicule', 'bande'], base: capitale });
  return out;
}

/** Les appels et annonces de la journée de tour, tirés d'une graine. */
export function genererJournee(graine, cells) {
  const r = makeRng(graine), appels = [], annonces = [];
  const poids = TYPES_C.reduce((s, t) => s + t.w, 0);
  const tirerType = () => { let x = r.next() * poids; for (const t of TYPES_C) { x -= t.w; if (x <= 0) return t; } return TYPES_C[0]; };
  for (let m = 0; m < CENTRAL.jour; m++) {
    if (r.next() >= CENTRAL.debit(heureDe(m)) / 60) continue;
    const T = tirerType(), flou = !T.tags.includes('bande') && r.next() < 0.33;
    appels.push({ id: `a${appels.length}`, t: m, cell: r.pick(cells), titre: T.titre, tags: T.tags, g: T.g, flou, gReel: flou ? (r.next() < 0.5 ? 1 : 3) : T.g, suite: !!T.suite, f: T.f || null });
  }
  // Événements annoncés une heure avant, entre 10 h et 22 h (minutes 840 → 1560 modulo 1440).
  const nA = 4 + Math.floor(r.next() * 3);
  for (let i = 0; i < nA; i++) {
    const A = r.pick(ANNONCES), t = (14 * 60 + Math.floor(r.next() * 9 * 60)) % CENTRAL.jour, cell = r.pick(cells);
    annonces.push({ id: `n${i}`, t, ta: t - CENTRAL.annonce, cell, titre: A.titre, texte: A.texte });
    for (let k = 0; k < A.n; k++) appels.push({ id: `n${i}-${k}`, t: t + k * 8, cell, titre: A.type, tags: A.tags, g: A.g, flou: false, gReel: A.g, suite: !A.tags.includes('bande'), annonce: `n${i}`, f: A.f });
  }
  appels.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  return { appels, annonces, graine: String(graine) };
}

export function distancesCentral(cells, adj) {
  const set = new Set(cells), d = {};
  for (const a of cells) { const m = { [a]: 0 }, f = [a]; while (f.length) { const u = f.shift(); for (const v of adj[u] || []) if (set.has(v) && m[v] == null) { m[v] = m[u] + 1; f.push(v); } } d[a] = m; }
  return (a, b) => (a === b ? 0 : (d[a] && d[a][b] != null ? d[a][b] : 2));
}
const trajet = (e, de, vers, dist) => (de === vers ? (e.poste === vers ? 0 : 2) : e.moto ? CENTRAL.route.moto + 3 * dist(de, vers) : CENTRAL.route.base + CENTRAL.route.parQuartier * dist(de, vers));

/** Résultat d'une équipe arrivée avec `retard` minutes sur un appel de gravité g0. */
export function resultatC(e, a, retard, g0, fatigue) {
  const g = g0 + Math.floor(retard / CENTRAL.aggravation), couvre = a.tags.some((t) => e.comp.includes(t));
  let st;
  if (g > 3) st = 'incident';
  else if (a.tags.includes('bande')) st = e.comp.includes('bande') && retard <= CENTRAL.aTemps ? 'arretee' : retard <= CENTRAL.aTemps ? 'moyen' : 'deborde';
  else if (couvre && retard <= CENTRAL.aTemps) st = 'maitrise';
  else if (!couvre && g >= 3) st = 'deborde';
  else st = 'moyen';
  return fatigue ? PIRE[st] : st;
}

/**
 * Rejoue la journée jusqu'à la minute `fin` avec les actions du joueur (triées par minute) :
 * { t, k: 'envoi', a, e } · { t, k: 'pause', e } · { t, k: 'poste', e, q } · { t, k: 'rens', a }.
 * Renvoie l'état des appels et des équipes à cette minute, le score et le journal.
 */
export function simuler(jour, equipes, actions, fin, { dist, capitale }) {
  const E = equipes.map((e) => ({ ...e, ou: e.base, etat: 'libre', jusqua: 0, mission: null, n: 0, poste: null }));
  const A = jour.appels.map((a) => ({ ...a, statut: null, eq: null, arr: null, finA: null, rens: false, par: null }));
  const parId = Object.fromEntries(A.map((a) => [a.id, a]));
  const acts = actionsValides(actions).filter((x) => x.t <= fin);
  let ia = 0, rensUtil = 0;
  const cons = { ...CENTRAL.consignes };
  const journal = [];
  const libre = (e) => e.etat === 'libre' || e.etat === 'poste';
  const engager = (e, a, m, par) => {
    // Redirection : l'appel qu'elle quittait redevient en attente.
    if (e.etat === 'route' && e.mission && e.mission !== a.id) { const b = parId[e.mission]; if (b && !b.statut) { b.eq = null; b.arr = null; b.fouille = false; } }
    const arr = m + trajet(e, e.ou, a.cell, dist);
    e.etat = 'route'; e.mission = a.id; e.jusqua = arr; e.dest = a.cell; e.poste = null;
    a.eq = e.id; a.arr = arr; a.par = par;
  };
  const arriver = (e, a, m) => {
    const g0 = a.gReel, retard = Math.max(0, m - a.t), fat = e.n >= CENTRAL.fatigue;
    const st = resultatC(e, a, retard, g0, fat);
    // Consigne « fouiller quand c'est réussi » : l'équipe fouille d'elle-même.
    if (!a.fouille && cons.fouille === 'reussi' && fouillable(a) && (st === 'maitrise' || st === 'arretee')) { a.fouille = true; a.fouillePar = 'consigne'; }
    a.statut = st; a.finA = m; a.fatigue = fat; a.g = g0; a.flou = false;
    e.n++; e.ou = a.cell; e.etat = 'surplace'; e.jusqua = m + CENTRAL.surPlace(g0) + (a.fouille && st !== 'incident' ? CENTRAL.fouille : 0);
    journal.push({ m, id: a.id, statut: st, eq: e.id, pts: CENTRAL.pts[st] });
    if (a.suite && !a.parent && RATE.has(st) && m + CENTRAL.reprise < CENTRAL.jour) {
      const s2 = { id: `${a.id}s`, t: a.t + CENTRAL.reprise, cell: a.cell, titre: `${a.titre} : ça reprend`, base: a.titre, tags: a.tags, g: Math.min(3, g0 + 1), gReel: Math.min(3, g0 + 1), flou: false, suite: false, parent: a.id, statut: null, eq: null, f: a.f };
      if (s2.t < CENTRAL.jour) { A.push(s2); parId[s2.id] = s2; }
    }
  };
  for (let m = 0; m <= Math.min(fin, CENTRAL.jour - 1); m++) {
    // 1. Fin de mission, de pause, arrivée sur place.
    for (const e of E) {
      if (e.etat === 'route' && m >= e.jusqua) { const a = parId[e.mission]; if (a && !a.statut && a.eq === e.id) arriver(e, a, m); else { e.etat = 'libre'; e.mission = null; } }
      else if (e.etat === 'surplace' && m >= e.jusqua) {
        // Fin de la fouille : ce que l'équipe a trouvé (tiré sur la graine du jour et l'appel, rien au hasard à 20 h).
        const a = parId[e.mission];
        if (a && a.fouille && !a.fouilleFaite) {
          a.fouilleFaite = true; a.saisie = tirerSaisie(jour.graine, a);
          if (a.saisie) { const o = SAISIES_C[a.saisie]; journal.push({ m, id: a.id, k: 'saisie', obj: a.saisie, eq: e.id, pts: o.rare ? CENTRAL.pts.rare : CENTRAL.pts.saisie }); }
          else journal.push({ m, id: a.id, k: 'fouille', eq: e.id, pts: 0 });
        }
        e.etat = 'libre'; e.mission = null; e.depuis = m;
      }
      else if ((e.etat === 'libre' || e.etat === 'poste') && e.n && m - (e.depuis ?? 0) >= CENTRAL.repos) e.n = 0;
      else if (e.etat === 'pause' && m >= e.jusqua) { e.etat = 'libre'; e.n = 0; }
    }
    // 2. Actions du joueur à cette minute.
    while (ia < acts.length && acts[ia].t <= m) {
      const x = acts[ia++], e = E.find((q) => q.id === x.e), a = parId[x.a];
      if (x.k === 'envoi' && e && a && !a.statut && a.t <= m && (libre(e) || e.etat === 'route')) engager(e, a, m, 'toi');
      else if (x.k === 'pause' && e && libre(e)) { e.etat = 'pause'; e.jusqua = m + CENTRAL.pause + trajet(e, e.ou, capitale, dist); e.ou = capitale; e.poste = null; }
      else if (x.k === 'poste' && e && libre(e)) { e.etat = 'poste'; e.poste = x.q; e.ou = x.q; }
      else if (x.k === 'rens' && a && a.flou && !a.rens && a.t <= m && rensUtil < CENTRAL.renseignements) { a.rens = true; rensUtil++; }
      else if (x.k === 'consigne' && x.c && typeof x.c === 'object') {
        if (['non', 'reussi'].includes(x.c.fouille)) cons.fouille = x.c.fouille;
        if (x.c.reserve === null || E.some((w) => w.id === x.c.reserve)) cons.reserve = x.c.reserve;
        if ([2, 3, 4].includes(x.c.pause)) cons.pause = x.c.pause;
      }
      else if (x.k === 'fouille' && a && fouillable(a) && !a.fouille && a.eq) {
        // Fouiller : ordonné en route (l'équipe fouillera en arrivant) ou sur place (10 minutes de plus).
        const q = E.find((w) => w.id === a.eq);
        if (q && q.mission === a.id && q.etat === 'route') { a.fouille = true; a.fouillePar = 'toi'; }
        else if (q && q.mission === a.id && q.etat === 'surplace' && a.statut !== 'incident') { a.fouille = true; a.fouillePar = 'toi'; q.jusqua += CENTRAL.fouille; }
      }
    }
    // 3. Appels qui tombent : un contrôle en poste dans le quartier cueille une bande à l'instant.
    for (const a of A) {
      if (a.t !== m || a.statut) continue;
      if (a.tags.includes('bande')) { const k = E.find((e) => e.etat === 'poste' && e.poste === a.cell && e.comp.includes('bande')); if (k) { engager(k, a, m, 'poste'); arriver(k, a, m); } }
    }
    // 4. Attente : aggravation jusqu'à l'incident ; l'adjoint dispatche au bout de 10 minutes.
    for (const a of A) {
      if (a.statut || a.t > m || a.eq) continue;
      const attente = m - a.t;
      if (a.gReel + Math.floor(attente / CENTRAL.aggravation) > 3) { a.statut = 'incident'; a.finA = m; journal.push({ m, id: a.id, statut: 'incident', eq: null, pts: CENTRAL.pts.incident }); continue; }
      if (attente >= CENTRAL.delaiAdjoint) {
        // Équipe gardée en réserve : l'adjoint ne l'engage que sur un appel grave ou une bande.
        const dispo = E.filter((q) => libre(q) && (q.id !== cons.reserve || a.gReel >= 3 || a.tags.includes('bande')));
        if (!dispo.length) continue;
        const arr = (e) => trajet(e, e.ou, a.cell, dist), t0 = Math.min(...dispo.map(arr)), forme = (e) => a.tags.some((t) => e.comp.includes(t));
        const e = dispo.filter((q) => arr(q) <= t0 + 5).sort((x, y) => (forme(y) - forme(x)) || ((x.n >= CENTRAL.fatigue) - (y.n >= CENTRAL.fatigue)) || arr(x) - arr(y) || x.id.localeCompare(y.id))[0];
        engager(e, a, m, 'adjoint');
      }
    }
    // 5. L'adjoint met en pause une équipe usée quand rien n'attend.
    if (!A.some((a) => !a.statut && !a.eq && a.t <= m)) for (const e of E) if (e.etat === 'libre' && e.n >= cons.pause) { e.etat = 'pause'; e.jusqua = m + CENTRAL.pause + trajet(e, e.ou, capitale, dist); e.ou = capitale; }
  }
  const pts = journal.reduce((s, j) => s + j.pts, 0);
  return { appels: A, equipes: E, journal, pts, rensRestants: CENTRAL.renseignements - rensUtil, consignes: cons };
}

/** Actions lisibles (horodatées dans la journée, d'un type connu), triées par minute : protège le rejeu de 20 h. */
export function actionsValides(actions) {
  return (Array.isArray(actions) ? actions : []).filter((x) => x && KINDS.has(x.k) && Number.isInteger(x.t) && x.t >= 0 && x.t < CENTRAL.jour)
    .slice(0, CENTRAL.maxActions).map((x, i) => [x, i]).sort((p, q) => p[0].t - q[0].t || p[1] - q[1]).map((p) => p[0]);
}
function tirerSaisie(graine, a) {
  const r = makeRng(`${graine}:${a.id}:fouille`);
  if (r.next() >= (CENTRAL.chanceFouille[a.statut] || 0)) return null;
  const P = FOUILLE[a.f], tot = Object.values(P).reduce((t, v) => t + v, 0);
  let x = r.next() * tot;
  for (const [id, w] of Object.entries(P)) { x -= w; if (x <= 0) return id; }
  return Object.keys(P)[0];
}
/** Chance qu'une fouille trouve quelque chose, selon le résultat de l'intervention. */
export const chanceFouille = (statut) => CENTRAL.chanceFouille[statut] || 0;

/** Prévision : ce que ferait une équipe sur un appel si on l'envoyait maintenant (flou compté à 2, sauf renseigné). */
export function prevoir(e, a, m, { dist }) {
  const arr = m + (e.etat === 'libre' || e.etat === 'poste' || e.etat === 'route' ? trajet(e, e.ou, a.cell, dist) : (e.jusqua - m) + trajet(e, e.dest || e.ou, a.cell, dist));
  const g0 = a.flou && !a.rens ? 2 : a.gReel;
  return { arr, statut: resultatC(e, a, Math.max(0, arr - a.t), g0, e.n >= CENTRAL.fatigue) };
}

// ───── Bilan de 20 h : la journée rejouée par le calcul du tour, puis ce qu'elle rapporte ─────
const MAXDEF = { C1: ['violence', 'ivresse'], C2: ['violence', 'ivresse'], C3: ['violence', 'ivresse'], PA: ['médiation', 'ivresse'], PB: ['médiation'], K1: ['véhicule', 'bande'], K2: ['véhicule', 'bande'] };
const NOMS = { C1: 'Combi 1', C2: 'Combi 2', C3: 'Combi 3', PA: 'Patrouille A', PB: 'Patrouille B', K1: 'Contrôle', K2: 'Contrôle 2' };
const SERV = { C: 'Intervention', P: 'Proximité', K: 'Roulage' };
/** Équipes enregistrées par l'appareil, ramenées à ce qu'une zone peut avoir (jamais plus fortes que le maximum). */
export function equipesValides(liste, cells, capitale) {
  const vus = new Set();
  return (Array.isArray(liste) ? liste : []).filter((e) => e && MAXDEF[e.id] && !vus.has(e.id) && vus.add(e.id)).map((e) => ({
    id: e.id, nom: NOMS[e.id], serv: SERV[e.id[0]], comp: (Array.isArray(e.comp) ? e.comp : []).filter((t) => MAXDEF[e.id].includes(t)),
    base: cells.includes(e.base) ? e.base : capitale, ...(e.id === 'PB' && e.moto ? { moto: true } : {}),
  }));
}

/**
 * Rejoue la journée de tour d'une zone telle que le joueur l'a jouée (doc joueur `central`), à partir de l'état d'avant
 * le calcul. `seed` : graine de la partie (CONFIG.seed, la même que sur les appareils). Rien si le joueur n'a pas ouvert
 * le central aujourd'hui.
 */
export function bilanCentral(state, uid, player, seed, serveur = null) {
  const mem = player && player.central, cle = `${state.season}-${state.turn}`, z = state.zones && state.zones[uid];
  if (!seed || !z || !mem || mem.cle !== cle) return null;
  const carte = carteQuartiers(state), cells = (carte.deZone[uid] || []).slice();
  if (!cells.length) return null;
  const capitale = carte.capitale[uid] ?? cells[0];
  // Équipes : celles que l'appareil a figées au matin, mais jamais au-delà de ce que la zone a vraiment.
  const reelles = equipesCentral(z, { capitale, autre: cells.find((c) => c !== capitale), vehicules: Math.max(vehiculesDisponibles(z, state.turn), 2) });
  const equipes = equipesValides(mem.equipes, cells, capitale).filter((e) => reelles.some((r) => r.id === e.id))
    .map((e) => { const r = reelles.find((x) => x.id === e.id); return { ...e, comp: e.comp.filter((t) => r.comp.includes(t)), ...(e.moto && !r.moto ? { moto: false } : {}) }; });
  if (!equipes.length) return null;
  const opt = { dist: distancesCentral(cells, carte.adj), capitale };
  const jour = genererJournee(`${seed}-central-${cle}-${uid}`, cells);
  // Heure des actions : celle du serveur quand il l'a notée (une action ne peut pas être antidatée de plus de 3 minutes).
  const actions = actionsValides(serveur ? actionsServeur(serveur, state.nextDeadline - CENTRAL.jour * 60000) : mem.actions);
  return { s: simuler(jour, equipes, actions, CENTRAL.jour - 1, opt), adj: simuler(jour, equipes, [], CENTRAL.jour - 1, opt), actions: actions.length, capitale };
}

/** Actions notées par le serveur ({ ...action, at: ms }) ramenées à la minute de la journée de tour. */
export function actionsServeur(liste, debut) {
  return (Array.isArray(liste) ? liste : []).filter((x) => x && Number.isFinite(x.at)).map((x) => {
    const tS = Math.floor((x.at - debut) / 60000), t = Number.isInteger(x.t) && x.t <= tS + 1 && x.t >= tS - 3 ? x.t : tS;
    const { at, ...reste } = x;
    return { ...reste, t };
  }).filter((x) => x.t >= 0 && x.t < CENTRAL.jour);
}

/** Ce que la journée a rapporté : en points de carnet, et ce que ça vaut pour la zone. */
export function resumeJournee(b) {
  const parToi = (a) => a.par === 'toi' || a.par === 'poste';
  const regles = b.s.appels.filter((a) => (a.statut === 'maitrise' || a.statut === 'arretee') && parToi(a));
  const saisies = b.s.appels.filter((a) => a.saisie).map((a) => a.saisie);
  const interp = b.s.appels.filter((a) => a.statut === 'arretee' && parToi(a)).length + saisies.filter((id) => SAISIES_C[id].interp).length;
  return { gain: b.s.pts - b.adj.pts, pts: b.s.pts, adj: b.adj.pts, types: regles.map((a) => a.base || a.titre), saisies, interp, valeur: saisies.reduce((t, id) => t + SAISIES_C[id].val, 0), pistes: saisies.filter((id) => SAISIES_C[id].piste).length };
}

/**
 * Inscrit la journée dans le carnet de la zone (z.central) et en tire les effets : confiscation vendue par le parquet
 * (le produit revient à la zone), un indice pour son enquête (une fois par jour), rapport du soir.
 * `indice()` : ajoute une pièce au dossier d'enquête de la zone (true si fait). Renvoie le résumé.
 */
export function appliquerCentral(state, uid, b, T, { indice = () => false } = {}) {
  const z = state.zones[uid];
  if (!z || !b) return null;
  const r = resumeJournee(b);
  const c = (z.central ||= { jours: 0, types: {}, saisies: {}, interp: 0, jauge: 0, gainMax: 0, gainSaison: 0, joursSaison: 0, s: state.season });
  if (c.s !== state.season) Object.assign(c, { s: state.season, gainSaison: 0, joursSaison: 0 });
  // Classement : chaque journée compte de 0 à +25. Record et série de journées à +15 pour les trophées.
  const compte = Math.max(0, Math.min(CENTRAL.plafondJour, r.gain));
  c.jours++; c.joursSaison++; c.gainSaison += compte; c.gainMax = Math.max(c.gainMax || 0, r.gain); c.interp = (c.interp || 0) + r.interp;
  c.serie15 = r.gain >= 15 && c.dernier && c.dernier.T === T - 1 ? (c.serie15 || 0) + 1 : r.gain >= 15 ? 1 : 0;
  r.compte = compte;
  for (const t of r.types) c.types[t] = (c.types[t] || 0) + 1;
  for (const id of r.saisies) c.saisies[id] = (c.saisies[id] || 0) + 1;
  c.jauge = Math.min(CENTRAL.confiscation, (c.jauge || 0) + r.valeur);
  const lignes = [`Central : ${r.pts >= 0 ? '+' : ''}${r.pts} points, ${r.gain >= 0 ? '+' : ''}${r.gain} par rapport à l’adjoint seul${r.saisies.length ? ` · saisies : ${r.saisies.map((id) => SAISIES_C[id].nom.toLowerCase()).join(', ')}` : ''}${r.interp ? ` · ${r.interp} interpellation${r.interp > 1 ? 's' : ''}` : ''}.`];
  // Confiscation : assez de biens saisis, le parquet les fait vendre et le produit revient à la zone.
  if (c.jauge >= CENTRAL.confiscation) {
    c.jauge -= CENTRAL.confiscation;
    const v = CENTRAL.produitConfiscation;
    z.budget = Math.round((z.budget + v) * 10) / 10; (z._compta ||= []).push({ k: 'central', l: 'Biens confisqués au central, vendus par le parquet', v });
    lignes.push(`Central : assez de biens confisqués. Le parquet les fait vendre : +${String(v).replace('.', ',')} k€ pour ta zone.`);
  }
  if (r.pistes && indice()) lignes.push('Central : une saisie parle (téléphone, carte ou carnet). Une pièce de plus dans ton dossier d’enquête.');
  c.dernier = { T, ...r, actions: b.actions };
  z.rapport = z.rapport || [];
  z.rapport.push(...lignes);
  return r;
}

/** Gazette : le meilleur central du jour et les saisies rares. */
export function gazetteCentral(state, T, push, label) {
  const jouees = Object.entries(state.zones || {}).filter(([, z]) => z.central && z.central.dernier && z.central.dernier.T === T && z.central.dernier.actions > 0);
  const best = jouees.slice().sort((x, y) => y[1].central.dernier.gain - x[1].central.dernier.gain)[0];
  if (best && best[1].central.dernier.gain > 0) {
    const d = best[1].central.dernier;
    push(3, 'Central', `${label(best[1])} tient le meilleur central du jour`, `${d.gain > 0 ? '+' : ''}${d.gain} points de mieux que son adjoint seul${d.saisies.length ? `, ${d.saisies.length} saisie${d.saisies.length > 1 ? 's' : ''}` : ''}.`, best[0]);
  }
  for (const [u, z] of jouees) for (const id of z.central.dernier.saisies.filter((x) => SAISIES_C[x].rare)) push(3, 'Saisie', `${label(z)} : ${SAISIES_C[id].nom.toLowerCase()} ${SAISIES_C[id].acc} lors d’une fouille`, 'Le central avait fait fouiller.', u);
}
