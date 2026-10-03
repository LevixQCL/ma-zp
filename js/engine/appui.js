// Appui fédéral (PJF) pour l'enquête : labo de police technique et scientifique, ou RCCU (cybercriminalité).
// 1. Avant 20:00, une zone demande un appui (une demande par jour, dans ses ordres).
// 2. À 20:00, chaque service n'a que quelques équipes pour tout le district, et leur nombre varie d'un jour à
//    l'autre. Les équipes vont aux zones demandeuses, d'abord à celles qui ont été refusées la fois précédente.
// 3. Le lendemain, la zone qui a obtenu une équipe joue son mini-jeu (un seul essai, niveau normal).
// 4. Réussi : une pièce sur un suspect arrive au dossier à la résolution suivante (le labo trouve plutôt
//    les moyens, la RCCU plutôt le mobile ou l'occasion). Raté, abandonné ou pas joué : rien.
import { makeRng } from './rng.js';
import { affaire, faitsConnus, titrePiece, dansMaCellule } from './enquete.js';

export const APPUI = {
  unites: {
    labo: { nom: 'Labo PJF', court: 'Labo', jeux: ['empreintes', 'adn'], elements: ['moy'], quoi: 'traces, empreintes, ADN' },
    rccu: { nom: 'RCCU', court: 'RCCU', jeux: ['reseau', 'tracage'], elements: ['mob', 'occ'], quoi: 'téléphones, ordinateurs, comptes en ligne' },
  },
  zonesParEquipe: 6,       // une équipe par service pour 6 zones actives (au moins une) : voir test/appui-sim.mjs
  ecart: [[-1, 0.2], [0, 0.5], [1, 0.3]], // disponibilité du jour autour de la base
  diff: 'normal',          // niveau du mini-jeu (assez difficile)
};
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
  const inconnues = aff.faits.filter((f) => !connus.has(f) && !f.startsWith('p:') && !f.startsWith('c:'));
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
        z.appui = { unite, jeu: rng.pick(u.jeux), tour: T + 1, n: e.n, id: idAppui(state, T + 1) };
        delete z.appuiPrio;
        z.rapport.push(`Appui ${u.court} : demande acceptée. Une équipe passe demain : fais l’analyse (mini-jeu) avant 20:00 depuis l’écran Enquête.`);
      } else {
        z.appuiPrio = true;
        z.rapport.push(`Appui ${u.court} : ${dispo ? `${dispo} équipe${dispo > 1 ? 's' : ''} pour ${demandes.length} demandes ce soir` : 'aucune équipe disponible ce soir'}, la tienne est refusée. Tu seras prioritaire la prochaine fois.`);
      }
    });
    if (demandes.length > 1) push(2, 'PJF', `${u.nom} : ${demandes.length} zones demandent un appui`, `${Math.min(dispo, demandes.length)} équipe${Math.min(dispo, demandes.length) > 1 ? 's' : ''} disponible${Math.min(dispo, demandes.length) > 1 ? 's' : ''} ce soir.`);
  }
}
