// Coups de filet : une petite affaire locale menée sur plusieurs jours, étape par étape, dans la journée.
//
// Chaque semaine, le service Recherche repère quelques cibles (un réseau de recel, un point de deal…).
// Le joueur en ouvre une, puis enchaîne des étapes dont il choisit la durée (2, 6 ou 12 heures) :
//   filature → recoupement → interpellation → garde à vue → décision du parquet.
// Une étape lancée avance seule ; à la fin, l'opération attend la décision suivante, sans rien perdre.
// Revenir plus tôt donne plus de contrôle (et va plus vite), pas plus de récompenses : le coût est
// compté en heures-agents, et le nombre de coups de filet est plafonné par semaine.
//
// Rien ici ne touche l'enquête de la semaine : ce sont des « renseignements », pas des pièces d'enquête.
//
// Les actions du joueur sont rangées dans son profil (`player.filet.log`), avec l'heure où il les a lancées.
// Le même code rejoue ces actions sur l'appareil (pour afficher le résultat dès la fin d'une étape) et
// dans le calcul de 20:00 (qui les valide, retire les agents des services et verse les récompenses).
// Le hasard dépend de la graine de la partie, de la zone, de la cible et du numéro de l'action : le
// résultat affiché sur l'appareil est exactement celui que retient le tour.

import { makeRng } from './rng.js';
import { aAnnexe } from './constants.js';
import { semaineDe } from './chef-semaine.js';

const H = 3600 * 1000;

export const FILET = {
  actif: true,
  cibles: 3,              // cibles repérées en début de semaine
  maxSemaine: 2,          // coups de filet menés à terme (réussis ou non) par semaine
  heuresJour: 12,         // une journée d'agent = 12 heures-agents
  maxAgentsJour: 3,       // agents mobilisés au plus par jour, tous services confondus (sinon la zone se vide les jours chargés)
  places: 2,              // places de garde à vue de base
  placesCachots: 2,       // places en plus avec le complexe cellulaire
  gav: 24,                // heures en garde à vue après l'interpellation
  alerteMax: 2,           // deux alertes : la cible disparaît
  etapes: {
    filature: {
      nom: 'Filature', service: 'recherche', agents: 2,
      durees: { 2: { n: 1, p: 0.6, risque: 0.05 }, 6: { n: 2, p: 0.8, risque: 0.12 }, 12: { n: 3, p: 0.9, risque: 0.25 } },
    },
    recoupement: {
      nom: 'Recoupement', service: 'recherche', agents: 2,
      durees: { 2: { sol: 20 }, 6: { sol: 45 }, 12: { sol: 70 } },
      parRens: 30,         // chaque renseignement exploitable permet 30 points de solidité
    },
    interpellation: { nom: 'Interpellation', service: 'intervention', agents: 6, heures: 4 },
  },
  interp: { base: 0.6, parRens: 0.15, parNiveau: 0.04, alerte: 0.2, min: 0.15, max: 0.95 },
  // Décision du parquet selon la solidité du dossier : part des points, libellé.
  parquet: [[70, 1, 'poursuites'], [40, 0.6, 'poursuites partielles'], [0, 0.25, 'classement sans suite']],
  saisie: 1.2,            // k€ saisis par interpellé
  ps: 2,                  // PS par coup de filet réussi
  satisfaction: 1,        // par interpellé
  garde: { points: 1, ps: 1 }, // zone voisine qui garde un interpellé faute de place
  satRate: -1,            // cible perdue (repérée deux fois)
  // Points selon le nombre de suspects. Simulation (test/filet-sim.mjs, 20 graines) : +1 à +1,5 d'IPZ moyen sur la saison
  // pour un joueur du soir comme pour un joueur actif (aucun écart notable), 1,2 à 1,6 coup de filet réussi par semaine.
  valeur: { 1: [10, 11], 2: [14, 18], 3: [21, 24] },
};

export const DUREES = [2, 6, 12];

const TYPES = [
  { k: 'recel', titre: 'Réseau de recel', ico: '📦', texte: 'Des objets volés revendus sous le manteau dans une arrière-boutique.' },
  { k: 'deal', titre: 'Point de deal', ico: '💊', texte: 'Un va-et-vient suspect à heures fixes, toujours les mêmes guetteurs.' },
  { k: 'cambrio', titre: 'Cambrioleurs en série', ico: '🏚️', texte: 'Même mode opératoire dans trois maisons : une équipe qui repère avant de frapper.' },
  { k: 'voitures', titre: 'Vols dans les voitures', ico: '🚗', texte: 'Vitres brisées la nuit, GPS et sacs revendus le lendemain.' },
  { k: 'faux', titre: 'Atelier de faux papiers', ico: '🪪', texte: 'Des titres de séjour et des permis trop parfaits circulent dans le quartier.' },
  { k: 'velos', titre: 'Filière de vélos volés', ico: '🚲', texte: 'Des vélos électriques disparaissent et réapparaissent repeints en ligne.' },
  { k: 'cigarettes', titre: 'Trafic de cigarettes', ico: '🚬', texte: 'Des cartouches sans timbre fiscal vendues sur le marché.' },
  { k: 'arnaque', titre: 'Arnaque aux faux techniciens', ico: '🧰', texte: 'Des personnes âgées dépouillées par de faux employés du gaz.' },
];
const LIEUX = ['derrière la gare', 'près du marché couvert', 'dans le quartier du canal', 'autour du parc', 'le long de la chaussée', 'près de l’école', 'dans les garages du boulevard', 'au-dessus d’un snack'];
const NOMS = ['« le Grand »', '« Tito »', '« la Fouine »', '« le Comptable »', '« Mimi »', '« le Chauffeur »', '« Bébert »', '« le Gamin »', '« la Patronne »', '« Zorro »'];

export const filetActif = (state) => !!FILET.actif && !!state;

/** Les cibles de la semaine pour cette zone (tirées le premier soir de la semaine). */
export function tirerCibles(state, uid, T) {
  const w = semaineDe(T);
  const rng = makeRng(`${state.seed}:filet:cibles:${state.season}:${w}:${uid}`);
  const types = rng.shuffle(TYPES).slice(0, FILET.cibles);
  return types.map((t, i) => {
    const suspects = i === 0 ? 1 : i === 1 ? 2 : rng.int(2, 3);
    const valeur = rng.int(...FILET.valeur[suspects]);
    const noms = rng.shuffle(NOMS).slice(0, suspects);
    return { id: `${state.season}-${w}-${i}`, type: t.k, titre: t.titre, ico: t.ico, texte: t.texte, lieu: rng.pick(LIEUX), suspects, noms, valeur, prudence: Math.round(rng.float(0.8, 1.3) * 100) / 100 };
  });
}

/** État de départ du coup de filet d'une zone. */
export function nouveauFilet(state, uid, T) {
  return { w: `${state.season}:${semaineDe(T)}`, cibles: tirerCibles(state, uid, T), faits: 0, s: 0, op: null, gav: [], hist: [] };
}

/** Nouvelle semaine : nouvelles cibles, compteur remis à zéro (l'opération en cours continue). */
export function semaineFilet(state, z, T) {
  const w = `${state.season}:${semaineDe(T)}`;
  if (!z.filet) z.filet = nouveauFilet(state, z.uid, T);
  else if (z.filet.w !== w) { z.filet.w = w; z.filet.cibles = tirerCibles(state, z.uid, T); z.filet.faits = 0; }
  return z.filet;
}

// ───────────────────────────── Règles d'une étape ─────────────────────────────

/** Heures d'une étape. */
export function heuresEtape(k, d) { return k === 'interpellation' ? FILET.etapes.interpellation.heures : d; }

/** Places de garde à vue libres à l'instant `t`. */
export function placesLibres(z, fil, t) {
  const tot = FILET.places + (aAnnexe(z, 'cachots') ? FILET.placesCachots : 0);
  const occ = (fil.gav || []).filter((g) => g.fin > t).reduce((s, g) => s + g.n, 0);
  return { tot, libres: Math.max(0, tot - occ), occ };
}

/** Chance de réussir l'interpellation. */
export function chanceInterp(z, op, cible) {
  const I = FILET.interp;
  const niv = ((z.niveaux && z.niveaux.intervention) || 1) - 1 + ((z.equip && z.equip.intervention) || 1) - 1;
  return Math.max(I.min, Math.min(I.max, I.base + I.parRens * (op.r - cible.suspects) + I.parNiveau * niv - I.alerte * op.alerte));
}

/** Plafond de solidité permis par les renseignements. */
export const solMax = (op) => Math.min(100, op.r * FILET.etapes.recoupement.parRens);

/** Agents mobilisés pour des heures-agents par service ({ recherche: 24 } → 2). */
export const agentsTotal = (hps) => Object.values(hps || {}).reduce((a, h) => a + agentsPourHeures(h), 0);

/**
 * Pourquoi une étape ne peut pas être lancée maintenant (null : elle peut l'être).
 * `hJour` : heures-agents déjà engagées aujourd'hui par service (plafond `maxAgentsJour`).
 */
export function etapeImpossible(fil, k, d, cible, t, hJour = null) {
  const op = fil && fil.op;
  if (!op || op.fini) return 'aucune opération en cours';
  if (op.en && op.en.fin > t) return 'une étape est déjà en cours';
  if (!FILET.etapes[k]) return 'étape inconnue';
  if (k !== 'interpellation' && !DUREES.includes(d)) return 'durée inconnue';
  if (k === 'recoupement' && op.sol >= solMax(op)) return op.r ? 'il faut plus de renseignements pour solidifier le dossier' : 'il faut d’abord un renseignement exploitable';
  if (k === 'interpellation' && op.r < 1) return 'il faut au moins un renseignement exploitable pour localiser la cible';
  if (hJour) {
    const E = FILET.etapes[k], h = { ...hJour };
    h[E.service] = (h[E.service] || 0) + E.agents * heuresEtape(k, d);
    if (agentsTotal(h) > FILET.maxAgentsJour) return `plus assez d’agents pour le coup de filet aujourd’hui (${FILET.maxAgentsJour} au plus par jour, ${agentsTotal(hJour)} déjà mobilisé${agentsTotal(hJour) > 1 ? 's' : ''}) : une étape plus courte, ou après 20:00`;
  }
  return null;
}

/** Résultat d'une étape (tiré à son lancement, révélé à sa fin). */
function resultatEtape(state, z, fil, e, cible) {
  const op = fil.op;
  const rng = makeRng(`${state.seed}:filet:${z.uid}:${op.id}:${e.s}`);
  const E = FILET.etapes;
  if (e.k === 'filature') {
    const D = E.filature.durees[e.d];
    let gain = 0;
    for (let i = 0; i < D.n; i++) if (rng.chance(D.p)) gain++;
    const repere = rng.chance(D.risque * cible.prudence * (op.alerte ? 1.5 : 1));
    return { k: 'filature', d: e.d, vus: D.n, gain, repere };
  }
  if (e.k === 'recoupement') {
    const D = E.recoupement.durees[e.d];
    const gain = Math.max(0, Math.min(D.sol, solMax(op) - op.sol));
    return { k: 'recoupement', d: e.d, gain };
  }
  // Interpellation
  const p = chanceInterp(z, op, cible);
  const ok = rng.chance(p);
  if (!ok) return { k: 'interpellation', ok: false, p };
  const pl = placesLibres(z, fil, e.at);
  const arretes = cible.suspects;
  const enCellule = Math.min(arretes, pl.libres);
  return { k: 'interpellation', ok: true, p, arretes, enCellule, transfert: arretes - enCellule };
}

/** Applique le résultat d'une étape terminée à l'opération. */
function appliquer(fil, res, fin) {
  const op = fil.op;
  op.journal = op.journal || [];
  if (res.k === 'filature') {
    op.r += res.gain; op.vus += res.vus;
    if (res.repere) op.alerte += 1;
    op.journal.push({ k: 'filature', d: res.d, gain: res.gain, vus: res.vus, repere: res.repere, fin });
    if (op.alerte >= FILET.alerteMax) { op.fini = 'perdue'; op.finA = fin; }
  } else if (res.k === 'recoupement') {
    op.sol += res.gain;
    op.journal.push({ k: 'recoupement', d: res.d, gain: res.gain, fin });
  } else if (res.ok) {
    op.fini = 'reussie'; op.finA = fin; op.arretes = res.arretes; op.enCellule = res.enCellule; op.transfert = res.transfert;
    op.journal.push({ k: 'interpellation', ok: true, arretes: res.arretes, enCellule: res.enCellule, transfert: res.transfert, fin });
    if (res.enCellule) (fil.gav ||= []).push({ n: res.enCellule, fin: fin + FILET.gav * H });
  } else {
    op.alerte += 1;
    op.journal.push({ k: 'interpellation', ok: false, fin });
    if (op.alerte >= FILET.alerteMax) { op.fini = 'perdue'; op.finA = fin; }
  }
  op.en = null;
}

/**
 * Rejoue les actions du joueur (numérotées au-delà de `fil.s`) jusqu'à l'instant `t`.
 * Renvoie { fil, acceptees, refusees } : `fil` est une copie mise à jour. Les actions refusées sont ignorées
 * (une action forgée ou arrivée trop tard ne change rien).
 * `depuis` : instant avant lequel une nouvelle action n'est plus acceptée (dernier calcul du tour).
 */
export function rejouer(state, z, filIn, log, t, { depuis = -Infinity } = {}) {
  const fil = JSON.parse(JSON.stringify(filIn || nouveauFilet(state, z.uid, state.turn)));
  const acceptees = [], refusees = [];
  // Étape en cours terminée avant la première nouvelle action.
  const finir = (avant) => {
    const op = fil.op;
    if (op && !op.fini && op.en && op.en.fin <= avant) appliquer(fil, op.en.res, op.en.fin);
  };
  const entrees = (Array.isArray(log) ? log : []).filter((e) => e && Number.isFinite(e.s) && e.s > fil.s).sort((a, b) => a.s - b.s);
  for (const e0 of entrees) {
    const e = { s: Math.floor(e0.s), k: String(e0.k || ''), d: Math.floor(Number(e0.d) || 0), at: Math.floor(Number(e0.at) || 0), c: e0.c != null ? String(e0.c) : null };
    if (e.s !== fil.s + 1 || e.at > t || e.at <= depuis) { refusees.push(e); continue; }
    finir(e.at);
    const op = fil.op;
    let ok = false;
    if (e.k === 'ouvrir') {
      const cible = (fil.cibles || []).find((c) => c.id === e.c);
      // Une opération terminée attend d'être soldée à 20:00 : la suivante peut déjà s'ouvrir.
      const engagees = (fil.faits || 0) + (fil.aSolder || []).filter((x) => x.fini !== 'abandon').length + (op && op.fini && op.fini !== 'abandon' ? 1 : 0);
      if (cible && (!op || op.fini) && engagees < FILET.maxSemaine) {
        if (op && op.fini) fil.aSolder = [...(fil.aSolder || []), op];
        fil.cibles = fil.cibles.filter((c) => c.id !== cible.id);
        fil.op = { id: cible.id, cible, debut: e.at, r: 0, vus: 0, sol: 0, alerte: 0, en: null, fini: null, journal: [] };
        ok = true;
      }
    } else if (e.k === 'abandon') {
      if (op && !op.fini && !(op.en && op.en.fin > e.at)) { op.fini = 'abandon'; op.finA = e.at; op.en = null; ok = true; }
    } else if (FILET.etapes[e.k]) {
      const cible = op && op.cible;
      if (!etapeImpossible(fil, e.k, e.d, cible, e.at, heuresParService(acceptees))) {
        const h = heuresEtape(e.k, e.d);
        const d = e.k === 'interpellation' ? h : e.d;
        op.en = { k: e.k, d, at: e.at, fin: e.at + h * H, s: e.s };
        op.en.res = resultatEtape(state, z, fil, { ...e, d }, cible);
        ok = true;
      }
    }
    if (ok) { fil.s = e.s; acceptees.push(e); } else refusees.push(e);
  }
  finir(t);
  return { fil, acceptees, refusees };
}

/** Résumé d'une opération terminée (historique). */
export function resumeOp(op) {
  return { id: op.id, titre: op.cible.titre, ico: op.cible.ico, fini: op.fini, arretes: op.arretes || 0, sol: op.sol, decision: op.decision || null, points: op.points || 0 };
}

/** Heures-agents des actions acceptées, par service (pour retirer les agents des services ce soir). */
export function heuresParService(acceptees) {
  const out = {};
  for (const e of acceptees) {
    const E = FILET.etapes[e.k];
    if (!E) continue;
    out[E.service] = (out[E.service] || 0) + E.agents * heuresEtape(e.k, e.d);
  }
  return out;
}
/** Agents retirés d'un service pour un total d'heures-agents. */
export const agentsPourHeures = (h) => (h > 0 ? Math.ceil(h / FILET.heuresJour - 1e-9) : 0);

/** Décision du parquet pour une solidité donnée. */
export function decisionParquet(sol) {
  for (const [min, part, nom] of FILET.parquet) if (sol >= min) return { part, nom, min };
  return { part: FILET.parquet[FILET.parquet.length - 1][1], nom: FILET.parquet[FILET.parquet.length - 1][2], min: 0 };
}

/** Zone voisine qui peut garder des interpellés faute de place (avec complexe cellulaire), ou null. */
export function voisinGarde(state, uid, voisins) {
  const l = Object.keys(voisins || {}).filter((u) => u !== uid && state.zones[u] && aAnnexe(state.zones[u], 'cachots')).sort();
  return l[0] || null;
}

/** Points rapportés par un coup de filet réussi (avant la décision du parquet). */
export function pointsFilet(op) {
  const c = op.cible;
  const pris = (op.enCellule || 0) + (op.transfertGarde || 0);
  return c.valeur * (c.suspects ? pris / c.suspects : 0);
}

/**
 * Calcul de 20:00, avant la simulation des zones.
 * - valide les actions du jour, retire les agents des services (`o.alloc`),
 * - verse ce qui s'est terminé (interpellation réussie : décision du parquet ; cible perdue),
 * - prépare les lignes du rapport. Les gains sont rangés dans `z._filet` et versés par `filetAppliquer`.
 */
export function filetPre(state, uids, ord, players, T, { now, depuis, voisinsDe } = {}) {
  if (!filetActif(state)) return;
  for (const uid of uids) {
    const z = state.zones[uid];
    const fil0 = semaineFilet(state, z, T);
    const log = players && players[uid] && players[uid].filet && players[uid].filet.log;
    const { fil, acceptees, refusees } = rejouer(state, z, fil0, log, now, { depuis });
    const g = { lignes: [], points: 0, budget: 0, ps: 0, sat: 0, nuit: [] };
    // Agents mobilisés aujourd'hui : retirés de leur service, puis des autres si le service n'en a pas assez.
    const hps = heuresParService(acceptees);
    const o = ord[uid];
    // Copie : la répartition d'origine sert aussi d'ordres par défaut pour demain (adjoint, pilote automatique).
    if (o && o.alloc && Object.keys(hps).length) o.alloc = { ...o.alloc };
    for (const [svc, h] of Object.entries(hps)) {
      let n = agentsPourHeures(h);
      if (!n || !o || !o.alloc) continue;
      const pris = Math.min(n, o.alloc[svc] || 0);
      o.alloc[svc] -= pris; n -= pris;
      const autres = Object.keys(o.alloc).filter((s) => s !== svc).sort((a, b) => (o.alloc[b] || 0) - (o.alloc[a] || 0));
      for (const s of autres) { if (!n) break; const p = Math.min(n, o.alloc[s] || 0); o.alloc[s] -= p; n -= p; }
      g.lignes.push(`Coup de filet : ${agentsPourHeures(h)} agent${agentsPourHeures(h) > 1 ? 's' : ''} ${svc === 'recherche' ? 'de Recherche' : 'd’Intervention'} mobilisé${agentsPourHeures(h) > 1 ? 's' : ''} aujourd’hui (${Math.round(h)} heures-agents), retiré${agentsPourHeures(h) > 1 ? 's' : ''} de ${svc === 'recherche' ? 'la Recherche' : 'l’Intervention'} ce soir.`);
    }
    if (refusees.length) g.lignes.push(`Coup de filet : ${refusees.length} action${refusees.length > 1 ? 's' : ''} non prise${refusees.length > 1 ? 's' : ''} en compte (lancée${refusees.length > 1 ? 's' : ''} après l’heure ou impossible).`);
    // Opérations terminées et pas encore soldées.
    const aSolder = [...(fil.aSolder || []), ...(fil.op && fil.op.fini ? [fil.op] : [])];
    for (const op of aSolder) {
    if (op && op.fini && !op.solde) {
      op.solde = true;
      if (op.fini === 'reussie') {
        let garde = null;
        if (op.transfert) {
          garde = voisinGarde(state, uid, voisinsDe ? voisinsDe(uid) : {});
          op.transfertGarde = garde ? op.transfert : 0;
          op.relaches = garde ? 0 : op.transfert;
          op.garde = garde;
        }
        const dec = decisionParquet(op.sol);
        const pts = Math.round(pointsFilet(op) * dec.part * 10) / 10;
        const pris = (op.enCellule || 0) + (op.transfertGarde || 0);
        op.decision = dec.nom; op.points = pts;
        g.points += pts;
        g.budget += Math.round(FILET.saisie * pris * 10) / 10;
        g.ps += FILET.ps;
        g.sat += FILET.satisfaction * pris;
        fil.faits = (fil.faits || 0) + 1;
        const qui = pris === 1 ? `${op.cible.noms[0]} interpellé` : `${pris} interpellés`;
        g.lignes.push(`🕵️ Coup de filet « ${op.cible.titre} » : ${qui}${op.relaches ? `, ${op.relaches} relâché${op.relaches > 1 ? 's' : ''} faute de place en cellule` : ''}${garde ? `, ${op.transfertGarde} gardé${op.transfertGarde > 1 ? 's' : ''} par ${state.zones[garde].nom}` : ''}. Parquet : ${dec.nom} (dossier solide à ${Math.round(op.sol)} %). +${String(pts).replace('.', ',')} points, saisie +${String(Math.round(FILET.saisie * pris * 10) / 10).replace('.', ',')} k€, +${FILET.ps} PS.`);
        g.nuit.push({ ico: '🕵️', t: `Coup de filet : ${qui}, parquet : ${dec.nom}` });
        if (garde) { const zg = state.zones[garde]; zg._filetGarde = (zg._filetGarde || 0) + op.transfertGarde; zg._filetGardeDe = z.nom; }
      } else if (op.fini === 'perdue') {
        fil.faits = (fil.faits || 0) + 1;
        g.sat += FILET.satRate;
        g.lignes.push(`🕵️ Coup de filet « ${op.cible.titre} » : la cible a repéré la surveillance et a disparu. Le quartier est déçu (${FILET.satRate} de satisfaction).`);
        g.nuit.push({ ico: '🕵️', t: 'Coup de filet raté : la cible a disparu' });
      } else if (op.fini === 'abandon') {
        g.lignes.push(`🕵️ Coup de filet « ${op.cible.titre} » abandonné.`);
      }
      z.stats = z.stats || {};
      if (op.fini === 'reussie') z.stats.filets = (z.stats.filets || 0) + 1;
    }
    fil.hist = [...(fil.hist || []), resumeOp(op)].slice(-6);
    }
    fil.aSolder = [];
    if (fil.op && fil.op.solde) fil.op = null;
    // Purge : les gardes à vue finies.
    fil.gav = (fil.gav || []).filter((x) => x.fin > now);
    z.filet = fil;
    z._filet = g;
  }
}

/** Pendant la simulation de la zone : gains du coup de filet (et garde d'interpellés d'un voisin). */
export function filetAppliquer(z) {
  const g = z._filet;
  if (g) {
    z._points = (z._points || 0) + g.points;
    if (g.budget) { z.budget += g.budget; (z._compta ||= []).push({ k: 'filet', l: 'Saisie (coup de filet)', v: g.budget }); }
    z._ps = (z._ps || 0) + g.ps;
    z.satisfaction += g.sat;
    for (const l of g.lignes) z.rapport.push(l);
    for (const n of g.nuit) (z.cetteNuit ||= []).push(n);
  }
  if (z._filetGarde) {
    const n = z._filetGarde;
    z._points = (z._points || 0) + FILET.garde.points * n;
    z._ps = (z._ps || 0) + FILET.garde.ps * n;
    z.rapport.push(`🔒 Garde à vue : ton complexe cellulaire a accueilli ${n} interpellé${n > 1 ? 's' : ''} du coup de filet de ${z._filetGardeDe} (+${FILET.garde.points * n} point${n > 1 ? 's' : ''}, +${FILET.garde.ps * n} PS).`);
  }
  delete z._filet; delete z._filetGarde; delete z._filetGardeDe;
}

/** Vue du coup de filet sur l'appareil, à l'instant `t` (actions déjà envoyées comprises). */
export function vueFilet(state, z, player, t) {
  if (!z || !z.filet) return null;
  return rejouer(state, z, z.filet, player && player.filet && player.filet.log, t, { depuis: state.lastResolvedAt || -Infinity }).fil;
}
