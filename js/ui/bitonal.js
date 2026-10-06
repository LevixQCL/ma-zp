// « Bitonal » (urgence du jour) : meilleurs scores de la partie par niveau, gardés dans le profil de chaque joueur
// (players/{uid}.bitonal = { facile, normal, difficile }, bitonalAt = { niveau: date }). Seules les urgences du jour
// comptent (un essai par jour) : l'entraînement est hors classement.
import { S, esc } from './common.js';
import { vitesseCombi } from '../engine/flotte.js';
import { cibleUrgence } from '../engine/incidents.js';

export const NIVEAUX_BITONAL = ['facile', 'normal', 'difficile'];
export const NOM_NIVEAU = { facile: 'Facile', normal: 'Normal', difficile: 'Difficile' };

const nomJoueur = (uid) => {
  const p = (S.players || {})[uid] || {}, z = S.state && S.state.zones[uid];
  return (z && `ZP ${z.code} ${z.nom}`) || p.pseudo || p.nom || 'Un joueur';
};

/** Meilleur score de la partie sur un niveau : { uid, nom, score } ou null (premier arrivé en cas d'égalité). */
export function recordBitonal(niv) {
  let best = null;
  for (const [uid, p] of Object.entries(S.players || {})) {
    if (!p || p.retire) continue;
    const sc = Math.floor(Number(p.bitonal && p.bitonal[niv]) || 0);
    if (sc <= 0) continue;
    const at = Number(p.bitonalAt && p.bitonalAt[niv]) || Infinity;
    if (!best || sc > best.score || (sc === best.score && at < best.at)) best = { uid, score: sc, at };
  }
  return best ? { ...best, nom: nomJoueur(best.uid) } : null;
}
export const monScoreBitonal = (niv) => Math.floor(Number(S.player && S.player.bitonal && S.player.bitonal[niv]) || 0);

/** Paramètres d'adresse du mini-jeu : records de la partie, records perso, vitesse du combi. */
export function paramsBitonal(v = vitesseCombi(S.state && S.user ? S.state.zones[S.user.uid] : null)) {
  const p = { vit: String(v.mult), frein: String(v.frein), etat: String(v.etat), prepa: String(v.prepa), cabosse: v.cabosse ? '1' : '0' };
  for (const n of NIVEAUX_BITONAL) {
    const r = recordBitonal(n), moi = S.user && r && r.uid === S.user.uid;
    const c = cibleUrgence(S.state, n); p[`c_${n}`] = String(c.cible); p[`k_${n}`] = String(c.courses);
    p[`r_${n}`] = String(r ? r.score : 0); p[`rn_${n}`] = r ? (moi ? 'toi' : r.nom) : ''; p[`m_${n}`] = String(monScoreBitonal(n));
  }
  return p;
}

/** Score d'une urgence : gardé s'il bat le record perso du niveau. Renvoie true si c'est le nouveau record de la partie. */
export async function noterScoreBitonal(niv, score) {
  const sc = Math.min(1e6, Math.floor(Number(score) || 0));
  if (!S.user || !S.backend || !NIVEAUX_BITONAL.includes(niv) || sc <= monScoreBitonal(niv)) return false;
  const avant = recordBitonal(niv);
  const p = { ...(S.player || {}) };
  p.bitonal = { ...(p.bitonal || {}), [niv]: sc };
  p.bitonalAt = { ...(p.bitonalAt || {}), [niv]: Date.now() };
  S.player = p;
  S.players = { ...(S.players || {}), [S.user.uid]: { ...((S.players || {})[S.user.uid] || {}), bitonal: p.bitonal, bitonalAt: p.bitonalAt } };
  await S.backend.savePlayer(S.user.uid, p);
  return !avant || sc > avant.score;
}

/** Nominette de la tuile d'entraînement : le meilleur score de la partie (niveau le plus dur où il y en a un). */
export function nominetteBitonal() {
  const n = ['difficile', 'normal', 'facile'].find((k) => recordBitonal(k));
  if (!n) return '<span class="nominette vide">🏆 aucun score</span>';
  const r = recordBitonal(n), moi = S.user && r.uid === S.user.uid;
  return `<span class="nominette${moi ? ' moi' : ''}" title="Meilleur score en ${NOM_NIVEAU[n].toLowerCase()}">🏆 ${esc(moi ? 'Toi' : r.nom.replace(/^ZP \d+ /, ''))} · ${r.score.toLocaleString('fr-BE')}</span>`;
}
