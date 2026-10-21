// Le central (calque « Ma zone » de la Carte, phase de test) : la zone tourne en temps réel, sur toute la journée de tour
// (de 20:00 la veille à 20:00). Les appels tombent à des minutes tirées d'une graine (partie, saison, tour, zone) ;
// les équipes mettent de vraies minutes à arriver et à régler l'affaire. Le joueur passe quand il veut : il dispatche,
// redirige, met une équipe en pause ou en poste, se renseigne. Sans lui, l'adjoint dispatche au bout de 10 minutes.
// Tout est recalculé à partir des actions horodatées du joueur : même résultat sur tous les appareils, aucun hasard
// à la résolution. Phase de test : rien ici ne touche encore à la zone.
import { makeRng } from './rng.js';

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
  renseignements: 4,                // coups de fil au requérant par jour
  pts: { maitrise: 3, moyen: 1, deborde: -1, incident: -3, arretee: 4 },
  // Appels par heure selon l'heure de la journée (heure de Bruxelles).
  debit: (h) => (h >= 2 && h < 8 ? 1.1 : h < 12 && h >= 8 ? 2.8 : h < 18 && h >= 12 ? 3.5 : h >= 18 && h < 23 ? 4.2 : 2.8),
};
export const STATUTS_C = { maitrise: 'Maîtrisé', moyen: 'Moyen', deborde: 'Débordé', incident: 'Incident', arretee: 'Bande arrêtée' };
const PIRE = { maitrise: 'moyen', moyen: 'deborde', deborde: 'incident', incident: 'incident', arretee: 'moyen' };
const RATE = new Set(['moyen', 'deborde', 'incident']);

export const TYPES_C = [
  { titre: 'Rixe à la sortie d’un café', tags: ['violence', 'ivresse'], g: 2, suite: true, w: 3 },
  { titre: 'Tapage nocturne', tags: ['médiation'], g: 1, suite: true, w: 3 },
  { titre: 'Accident avec blessé', tags: ['véhicule'], g: 2, w: 3 },
  { titre: 'Différend de voisinage', tags: ['médiation'], g: 2, suite: true, w: 3 },
  { titre: 'Violences intrafamiliales', tags: ['violence', 'médiation'], g: 3, suite: true, w: 2 },
  { titre: 'Ivresse sur la voie publique', tags: ['ivresse'], g: 1, w: 3 },
  { titre: 'Bande de cambrioleurs signalée', tags: ['bande'], g: 3, w: 2 },
  { titre: 'Rodéo en scooter', tags: ['véhicule'], g: 1, w: 2 },
  { titre: 'Vol à l’étalage avec violence', tags: ['violence'], g: 2, w: 2 },
  { titre: 'Personne désorientée', tags: ['médiation'], g: 1, w: 2 },
];
const ANNONCES = [
  { titre: 'Sortie de match', texte: 'risque de bagarres', type: 'Bagarre en sortie de match', tags: ['violence', 'ivresse'], g: 3, n: 2 },
  { titre: 'Fête de quartier', texte: 'tapage et ivresse attendus', type: 'Fête qui dégénère', tags: ['médiation', 'ivresse'], g: 2, n: 2 },
  { titre: 'Marché du soir', texte: 'vols et accrochages', type: 'Accrochage au marché', tags: ['véhicule'], g: 2, n: 1 },
  { titre: 'Bande repérée par la zone voisine', texte: 'passage probable', type: 'Bande de cambrioleurs signalée', tags: ['bande'], g: 3, n: 1 },
];

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
    appels.push({ id: `a${appels.length}`, t: m, cell: r.pick(cells), titre: T.titre, tags: T.tags, g: T.g, flou, gReel: flou ? (r.next() < 0.5 ? 1 : 3) : T.g, suite: !!T.suite });
  }
  // Événements annoncés une heure avant, entre 10 h et 22 h (minutes 840 → 1560 modulo 1440).
  const nA = 4 + Math.floor(r.next() * 3);
  for (let i = 0; i < nA; i++) {
    const A = r.pick(ANNONCES), t = (14 * 60 + Math.floor(r.next() * 9 * 60)) % CENTRAL.jour, cell = r.pick(cells);
    annonces.push({ id: `n${i}`, t, ta: t - CENTRAL.annonce, cell, titre: A.titre, texte: A.texte });
    for (let k = 0; k < A.n; k++) appels.push({ id: `n${i}-${k}`, t: t + k * 8, cell, titre: A.type, tags: A.tags, g: A.g, flou: false, gReel: A.g, suite: !A.tags.includes('bande'), annonce: `n${i}` });
  }
  appels.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  return { appels, annonces };
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
  const acts = (actions || []).filter((x) => x.t <= fin).slice().sort((x, y) => x.t - y.t);
  let ia = 0, rensUtil = 0;
  const journal = [];
  const libre = (e) => e.etat === 'libre' || e.etat === 'poste';
  const engager = (e, a, m, par) => {
    // Redirection : l'appel qu'elle quittait redevient en attente.
    if (e.etat === 'route' && e.mission && e.mission !== a.id) { const b = parId[e.mission]; if (b && !b.statut) { b.eq = null; b.arr = null; } }
    const arr = m + trajet(e, e.ou, a.cell, dist);
    e.etat = 'route'; e.mission = a.id; e.jusqua = arr; e.dest = a.cell; e.poste = null;
    a.eq = e.id; a.arr = arr; a.par = par;
  };
  const arriver = (e, a, m) => {
    const g0 = a.gReel, retard = Math.max(0, m - a.t), fat = e.n >= CENTRAL.fatigue;
    const st = resultatC(e, a, retard, g0, fat);
    a.statut = st; a.finA = m; a.fatigue = fat; a.g = g0; a.flou = false;
    e.n++; e.ou = a.cell; e.etat = 'surplace'; e.jusqua = m + CENTRAL.surPlace(g0);
    journal.push({ m, id: a.id, statut: st, eq: e.id, pts: CENTRAL.pts[st] });
    if (a.suite && !a.parent && RATE.has(st) && m + CENTRAL.reprise < CENTRAL.jour) {
      const s2 = { id: `${a.id}s`, t: a.t + CENTRAL.reprise, cell: a.cell, titre: `${a.titre} : ça reprend`, tags: a.tags, g: Math.min(3, g0 + 1), gReel: Math.min(3, g0 + 1), flou: false, suite: false, parent: a.id, statut: null, eq: null };
      if (s2.t < CENTRAL.jour) { A.push(s2); parId[s2.id] = s2; }
    }
  };
  for (let m = 0; m <= Math.min(fin, CENTRAL.jour - 1); m++) {
    // 1. Fin de mission, de pause, arrivée sur place.
    for (const e of E) {
      if (e.etat === 'route' && m >= e.jusqua) { const a = parId[e.mission]; if (a && !a.statut && a.eq === e.id) arriver(e, a, m); else { e.etat = 'libre'; e.mission = null; } }
      else if (e.etat === 'surplace' && m >= e.jusqua) { e.etat = 'libre'; e.mission = null; e.depuis = m; }
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
        const dispo = E.filter(libre);
        if (!dispo.length) continue;
        const arr = (e) => trajet(e, e.ou, a.cell, dist), t0 = Math.min(...dispo.map(arr)), forme = (e) => a.tags.some((t) => e.comp.includes(t));
        const e = dispo.filter((q) => arr(q) <= t0 + 5).sort((x, y) => (forme(y) - forme(x)) || ((x.n >= CENTRAL.fatigue) - (y.n >= CENTRAL.fatigue)) || arr(x) - arr(y) || x.id.localeCompare(y.id))[0];
        engager(e, a, m, 'adjoint');
      }
    }
    // 5. L'adjoint met en pause une équipe usée quand rien n'attend.
    if (!A.some((a) => !a.statut && !a.eq && a.t <= m)) for (const e of E) if (e.etat === 'libre' && e.n >= CENTRAL.fatigue) { e.etat = 'pause'; e.jusqua = m + CENTRAL.pause + trajet(e, e.ou, capitale, dist); e.ou = capitale; }
  }
  const pts = journal.reduce((s, j) => s + j.pts, 0);
  return { appels: A, equipes: E, journal, pts, rensRestants: CENTRAL.renseignements - rensUtil };
}

/** Prévision : ce que ferait une équipe sur un appel si on l'envoyait maintenant (flou compté à 2, sauf renseigné). */
export function prevoir(e, a, m, { dist }) {
  const arr = m + (e.etat === 'libre' || e.etat === 'poste' || e.etat === 'route' ? trajet(e, e.ou, a.cell, dist) : (e.jusqua - m) + trajet(e, e.dest || e.ou, a.cell, dist));
  const g0 = a.flou && !a.rens ? 2 : a.gReel;
  return { arr, statut: resultatC(e, a, Math.max(0, arr - a.t), g0, e.n >= CENTRAL.fatigue) };
}
