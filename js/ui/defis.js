// Défi d'endurance des mini-jeux (entraînement) : records de la partie, nominettes et titres.
// Sans aucun effet sur le jeu. Chaque joueur garde son meilleur niveau par mini-jeu dans son profil de la partie
// (players/{uid}.defis = { jeu: niveau }, defisAt = { jeu: date }) ; le record est le plus haut niveau, le premier
// arrivé gardant le record en cas d'égalité.
import { S, esc } from './common.js';

export const TITRES_DEFI = {
  colis: 'Démineur du district', crochetage: 'Maître serrurier', depanneuse: 'As du dépannage', dossier: 'Œil de lynx',
  empreintes: 'Maître des empreintes', adn: 'Génie de l’ADN', reseau: 'Maître du réseau', tracage: 'Traqueur d’IP',
};
export const NIVEAU_MAX = 500;

const nomJoueur = (uid) => {
  const p = (S.players || {})[uid] || {}, z = S.state && S.state.zones[uid];
  return p.pseudo || (z && z.nom) || p.nom || 'Un joueur';
};

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

/** Niveau réussi pendant une course : enregistré s'il bat le record personnel. Renvoie true si c'est un nouveau record de la partie. */
export async function noterNiveauDefi(jeu, niveau) {
  const n = Math.min(NIVEAU_MAX, Math.floor(Number(niveau) || 0));
  if (!S.user || !S.backend || !TITRES_DEFI[jeu] || n <= monRecordDefi(jeu)) return false;
  const avant = recordDefi(jeu);
  const p = { ...(S.player || {}) };
  p.defis = { ...(p.defis || {}), [jeu]: n };
  p.defisAt = { ...(p.defisAt || {}), [jeu]: Date.now() };
  S.player = p;
  S.players = { ...(S.players || {}), [S.user.uid]: { ...((S.players || {})[S.user.uid] || {}), defis: p.defis, defisAt: p.defisAt } };
  await S.backend.savePlayer(S.user.uid, p);
  return !avant || n > avant.niveau;
}
