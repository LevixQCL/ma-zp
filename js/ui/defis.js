// Défi d'endurance des mini-jeux (entraînement) : records de la partie, nominettes et titres.
// Records sans effet sur le jeu ; la prime de la semaine est dans engine/challenge.js. Chaque joueur garde son meilleur niveau par mini-jeu dans son profil de la partie
// (players/{uid}.defis = { jeu: niveau }, defisAt = { jeu: date }) ; le record est le plus haut niveau, le premier
// arrivé gardant le record en cas d'égalité.
import { S, esc, pseudoJoueur } from './common.js';
import { CHALLENGE, cleSemaine, classementSemaine, laureatsSemaine, niveauSemaine } from '../engine/challenge.js';
import { CONFIG } from '../config.js';

export const TITRES_DEFI = {
  colis: 'Démineur du district', crochetage: 'Maître serrurier', depanneuse: 'As du dépannage', dossier: 'Œil de lynx',
  empreintes: 'Maître des empreintes', adn: 'Génie de l’ADN', reseau: 'Maître du réseau', interception: 'As de l’interception',
  bouclage: 'Maître du maintien de l’ordre',
};
export const NIVEAU_MAX = 500;

const nomJoueur = pseudoJoueur;

/** Record de la partie sur ce mini-jeu : { uid, nom, niveau } ou null. */
export function recordDefi(jeu) {
  let best = null;
  for (const [uid, p] of Object.entries(S.players || {})) {
    if (!p || p.retire) continue;
    const n = Math.min(NIVEAU_MAX, Math.floor(Number(p.defis && p.defis[jeu]) || 0));
    if (n <= 0) continue;
    const at = Number(p.defisAt && p.defisAt[jeu]) || Infinity;
    if (!best || n > best.niveau || (n === best.niveau && at < best.at)) best = { uid, niveau: n, at };
  }
  return best ? { ...best, nom: nomJoueur(best.uid) } : null;
}

export const monRecordDefi = (jeu) => Math.floor(Number(S.player && S.player.defis && S.player.defis[jeu]) || 0);

/** Nominette d'une tuile d'entraînement. */
export function nominette(jeu) {
  const r = recordDefi(jeu);
  if (!r) return '<span class="nominette vide">🏆 aucun record</span>';
  const moi = S.user && r.uid === S.user.uid;
  return `<span class="nominette${moi ? ' moi' : ''}" title="${esc(TITRES_DEFI[jeu] || '')}">🏆 ${esc(moi ? 'Toi' : r.nom)} · niv. ${r.niveau}</span>`;
}

/** Titres de défi détenus par ce joueur (un par record qu'il détient). */
export function titresDefi(uid) {
  return Object.keys(TITRES_DEFI).map((j) => ({ jeu: j, r: recordDefi(j) })).filter((x) => x.r && x.r.uid === uid).map((x) => ({ titre: TITRES_DEFI[x.jeu], niveau: x.r.niveau, jeu: x.jeu }));
}

/** Paramètres d'adresse transmis au mini-jeu (record et record personnel). */
export function paramsDefi(jeu) {
  const r = recordDefi(jeu), moi = S.user && r && r.uid === S.user.uid;
  return { rec: String(r ? r.niveau : 0), recNom: r ? (moi ? 'toi' : r.nom) : '', moi: String(monRecordDefi(jeu)) };
}

/** Semaine du Challenge en cours (échéance du dimanche 20:00 qui la clôt). */
export const cleSemaineEnCours = () => cleSemaine(S.state && S.state.nextDeadline, CONFIG.resolutionHour || 20);

/** En tête cette semaine sur ce mini-jeu (dès le niveau minimum) : { uid, nom, niveau } ou null. */
export function enTeteSemaine(jeu) {
  const cl = classementSemaine(S.players, cleSemaineEnCours(), jeu);
  return cl.length ? { ...cl[0], nom: nomJoueur(cl[0].uid) } : null;
}

/** Lauréats si la semaine s'arrêtait maintenant (une prime par joueur). */
export const laureatsProvisoires = () => laureatsSemaine(S.players, cleSemaineEnCours()).map((l) => ({ ...l, nom: nomJoueur(l.uid) }));

/** Ligne « cette semaine » d'une tuile du Challenge. */
export function ligneSemaine(jeu) {
  const r = enTeteSemaine(jeu);
  if (!r) return '<span class="tr-sem">semaine : libre</span>';
  const moi = S.user && r.uid === S.user.uid;
  return `<span class="tr-sem${moi ? ' moi' : ''}">semaine : ${esc(moi ? 'toi' : r.nom)} · ${r.niveau}</span>`;
}

/** Niveau réussi pendant une course : record personnel et meilleur niveau de la semaine. Renvoie true si c'est un nouveau record de la partie. */
export async function noterNiveauDefi(jeu, niveau) {
  const n = Math.min(NIVEAU_MAX, Math.floor(Number(niveau) || 0));
  if (!S.user || !S.backend || !TITRES_DEFI[jeu]) return false;
  const cle = cleSemaineEnCours();
  const record = n > monRecordDefi(jeu);
  // La semaine ne compte qu'à partir du niveau minimum de la prime (moins d'écritures pendant les premiers niveaux).
  const semaine = CHALLENGE.jeux.includes(jeu) && cle && n >= CHALLENGE.niveauMin && n > niveauSemaine(S.player, cle, jeu);
  if (!record && !semaine) return false;
  const avant = recordDefi(jeu);
  const p = { ...(S.player || {}) };
  if (record) {
    p.defis = { ...(p.defis || {}), [jeu]: n };
    p.defisAt = { ...(p.defisAt || {}), [jeu]: Date.now() };
  }
  if (semaine) {
    p.defisSem = { ...(p.defisSem || {}), [jeu]: { c: cle, n, at: Date.now() } };
  }
  S.player = p;
  const moi = { ...((S.players || {})[S.user.uid] || {}) };
  for (const k of ['defis', 'defisAt', 'defisSem']) if (p[k]) moi[k] = p[k];
  S.players = { ...(S.players || {}), [S.user.uid]: moi };
  await S.backend.savePlayer(S.user.uid, p);
  return record && (!avant || n > avant.niveau);
}
