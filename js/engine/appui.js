// Appui fédéral (PJF) pour l'enquête : labo de police technique et scientifique, ou RCCU (cybercriminalité).
// 1. Avant 20:00, une zone demande un appui (une demande par jour, dans ses ordres).
// 2. À 20:00, chaque service n'a que quelques équipes pour tout le district, et leur nombre varie d'un jour à
//    l'autre. Les équipes vont aux zones demandeuses, d'abord à celles qui ont été refusées la fois précédente.
// 3. Le lendemain, la zone qui a obtenu une équipe joue son mini-jeu (un seul essai, niveau normal).
// 4. Réussi : une pièce sur un suspect arrive au dossier à la résolution suivante (le labo trouve plutôt
//    les moyens, la RCCU plutôt le mobile ou l'occasion). Raté, abandonné ou pas joué : rien.
import { makeRng } from './rng.js';
import { affaire, faitsConnus, titrePiece, dansMaCellule, piecesLibres } from './enquete.js';
import { DEFAULT_ALLOC } from './constants.js';

export const APPUI = {
  unites: {
    labo: { nom: 'Labo PJF', court: 'Labo', jeux: ['empreintes', 'adn'], elements: ['moy'], quoi: 'traces, empreintes, ADN' },
    rccu: { nom: 'RCCU', court: 'RCCU', jeux: ['reseau', 'interception'], elements: ['mob', 'occ'], quoi: 'téléphones, ordinateurs, comptes en ligne' },
  },
  zonesParEquipe: 6,       // une équipe par service pour 6 zones actives (au moins une) : voir test/appui-sim.mjs
  ecart: [[-1, 0.2], [0, 0.5], [1, 0.3]], // disponibilité du jour autour de la base
  diff: 'normal',          // niveau du mini-jeu par défaut (2 experts)
  // Experts envoyés : 2 de base, +1 si une équipe du service reste libre ce soir (elle vient en renfort),
  // ±1 selon la Recherche de la zone dans ses ordres (un dossier bien préparé fait gagner du temps).
  experts: { base: 2, min: 1, max: 3 },
  rechercheFaible: 0.7,    // Recherche sous 70 % de la base : −1 expert
  rechercheForte: 1.5,     // Recherche à 150 % de la base ou plus : +1 expert
};
export const DIFF_EXPERTS = { 1: 'difficile', 2: 'normal', 3: 'facile' };

/**
 * Experts envoyés à une zone, avec leurs raisons (affichées au joueur).
 * @param {boolean} renfort  une équipe du service est restée libre ce soir
 * @param {number} recherche agents de la Recherche dans les ordres validés de la zone
 */
export function expertsAppui(renfort, recherche) {
  const r = (recherche || 0) / DEFAULT_ALLOC.recherche;
  const raisons = [];
  let n = APPUI.experts.base;
  if (renfort) { n++; raisons.push('+1 : une équipe restée libre ce soir vient en renfort'); }
  if (r >= APPUI.rechercheForte) { n++; raisons.push(`+1 : ta Recherche (${recherche} agents) a bien préparé le dossier`); }
  else if (r < APPUI.rechercheFaible) { n--; raisons.push(`−1 : ta Recherche (${recherche || 0} agent${recherche > 1 ? 's' : ''}) n’a pas pu préparer le dossier`); }
  n = Math.max(APPUI.experts.min, Math.min(APPUI.experts.max, n));
  return { n, diff: DIFF_EXPERTS[n], raisons };
}
export const UNITES_APPUI = Object.keys(APPUI.unites);

/** Équipes disponibles ce soir pour un service (dépend du nombre de zones actives et d'un tirage du jour). */
export function equipesDispo(state, unite, T, nZones) {
  const base = Math.max(1, Math.ceil(nZones / APPUI.zonesParEquipe));
  const r = makeRng(`${state.seed}:s${state.season}:t${T}:appui:${unite}`).next();
  let acc = 0, d = 0;
  for (const [delta, p] of APPUI.ecart) { acc += p; if (r < acc) { d = delta; break; } }
  return Math.max(0, base + d);
}

/** Identifiant du mini-jeu d'appui joué pendant le tour T. */
export const idAppui = (state, T) => `s${state.season}t${T}-appui`;

/** Appui obtenu pour le tour en cours (à jouer aujourd'hui), sinon null. */
export function appuiDuJour(state, z) {
  return z && z.appui && z.appui.tour === state.turn ? z.appui : null;
}

/** Une pièce inconnue sur un suspect, du type que le service sait trouver (sinon n'importe laquelle). */
function pieceAppui(state, z, aff, rng, elements) {
  const connus = new Set(faitsConnus(z.enquete));
  const inconnues = piecesLibres(aff).filter((f) => !connus.has(f));
  const duService = inconnues.filter((f) => elements.includes(f.split(':')[0]));
  const pool0 = duService.length ? duService : inconnues;
  const miennes = pool0.filter((f) => dansMaCellule(state, z.uid, Number(f.split(':')[1])));
  const pool = miennes.length ? miennes : pool0;
  return pool.length ? rng.pick(pool) : null;
}

/**
 * Pendant la résolution du tour T (après la préparation des dossiers d'enquête) :
 * règle les appuis joués aujourd'hui, puis répartit les équipes demandées pour demain.
 * @param {object} players  profils : players[uid].appui = { id, statut: 'ok'|'rate'|'abandon' }
 */
export function appuiResolution(state, uids, ord, players, T, push) {
  const e = state.enquete;
  // 1. Appuis du jour : la pièce arrive si le mini-jeu est réussi.
  for (const uid of uids) {
    const z = state.zones[uid];
    const a = z.appui;
    if (!a || a.tour > T) continue;
    delete z.appui;
    const u = APPUI.unites[a.unite];
    const res = players[uid] && players[uid].appui && players[uid].appui.id === a.id ? players[uid].appui : null;
    if (!res) { z.rapport.push(`Appui ${u.court} : l’équipe est repartie sans que tu aies fait l’analyse. Pas de pièce.`); continue; }
    if (res.statut !== 'ok') { z.rapport.push(`Appui ${u.court} : l’analyse n’a rien donné. Pas de pièce.`); continue; }
    if (!e || e.n !== a.n || !z.enquete) { z.rapport.push(`Appui ${u.court} : analyse réussie, mais l’affaire est close entre-temps.`); continue; }
    const aff = affaire(state, e.n);
    const f = pieceAppui(state, z, aff, makeRng(`${state.seed}:s${state.season}:t${T}:appui-piece:${uid}`), u.elements);
    if (!f) { z.rapport.push(`Appui ${u.court} : analyse réussie, mais il n’y a plus rien à trouver dans ce dossier.`); continue; }
    z.enquete.pieces.push({ f, j: e.jour, src: 'pjf' });
    z.rapport.push(`Appui ${u.court} : analyse réussie. Nouvelle pièce au dossier : « ${titrePiece(aff, f)} ».`);
  }
  // 2. Demandes pour demain : équipes limitées, partagées entre toutes les zones.
  if (!e) return;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:appui-repartition`);
  for (const unite of UNITES_APPUI) {
    const u = APPUI.unites[unite];
    const demandes = uids.filter((uid) => ord[uid] && ord[uid].appui === unite);
    if (!demandes.length) continue;
    const dispo = equipesDispo(state, unite, T, uids.length);
    // Les zones refusées la dernière fois passent devant ; ensuite, ordre tiré au sort.
    const tirage = rng.shuffle(demandes);
    const file = [...tirage.filter((x) => state.zones[x].appuiPrio), ...tirage.filter((x) => !state.zones[x].appuiPrio)];
    file.forEach((uid, k) => {
      const z = state.zones[uid];
      if (k < dispo) {
        const alloc = (ord[uid] && ord[uid].alloc) || (z.dernierOrdre && z.dernierOrdre.alloc) || DEFAULT_ALLOC;
        const ex = expertsAppui(demandes.length < dispo, alloc.recherche);
        z.appui = { unite, jeu: rng.pick(u.jeux), tour: T + 1, n: e.n, id: idAppui(state, T + 1), experts: ex.n, pourquoi: ex.raisons };
        delete z.appuiPrio;
        z.rapport.push(`Appui ${u.court} : demande acceptée. ${ex.n} ${unite === 'rccu' ? 'enquêteur' : 'expert'}${ex.n > 1 ? 's' : ''} passe${ex.n > 1 ? 'nt' : ''} demain (analyse ${ex.diff}) : fais l’analyse (mini-jeu) avant 20:00 depuis l’écran Enquête.`);
      } else {
        z.appuiPrio = true;
        z.rapport.push(`Appui ${u.court} : ${dispo ? `${dispo} équipe${dispo > 1 ? 's' : ''} pour ${demandes.length} demandes ce soir` : 'aucune équipe disponible ce soir'}, la tienne est refusée. Tu seras prioritaire la prochaine fois.`);
      }
    });
    if (demandes.length > 1) push(2, 'PJF', `${u.nom} : ${demandes.length} zones demandent un appui`, `${Math.min(dispo, demandes.length)} équipe${Math.min(dispo, demandes.length) > 1 ? 's' : ''} disponible${Math.min(dispo, demandes.length) > 1 ? 's' : ''} ce soir.`);
  }
}
