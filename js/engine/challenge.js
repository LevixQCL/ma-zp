// Prime du Challenge : chaque dimanche à 20:00, le meilleur niveau de la semaine sur chaque mini-jeu du Challenge
// rapporte une petite prime à sa zone et des points sur la jauge des skins. Une seule prime par joueur et par semaine :
// celui qui est en tête sur plusieurs mini-jeux laisse les autres au suivant. Les niveaux de la semaine sont gardés
// dans le profil de chaque joueur (players/{uid}.defisSem = { jeu: { c, n, at } }), `c` étant l'échéance du
// dimanche 20:00 qui clôt la semaine. (Une entrée par mini-jeu portant sa semaine : l'enregistrement du profil
// fusionne les champs, une ancienne semaine ne doit pas se mélanger à la nouvelle.)
import { nextResolutionAfter, weekdayBe } from './time.js';

export const CHALLENGE = {
  jeux: ['colis', 'crochetage', 'depanneuse', 'dossier', 'empreintes', 'adn', 'reseau', 'interception'],
  prime: 5,        // k€ par mini-jeu remporté : ~5 % des revenus d'une semaine (voir test/challenge-sim.mjs)
  jauge: 10,       // points sur la jauge des skins (50 pour un skin)
  niveauMin: 5,    // en dessous, la course ne compte pas pour la prime (les premiers niveaux servent d'entraînement)
  niveauMax: 500,
};

/** Échéance du dimanche 20:00 qui clôt la semaine en cours (à partir de l'échéance du tour en cours). */
export function cleSemaine(nextDeadline, hour = 20) {
  let d = Number(nextDeadline) || 0;
  if (!d) return 0;
  for (let i = 0; i < 7 && weekdayBe(d) !== 6; i++) d = nextResolutionAfter(d, hour);
  return d;
}

/** Entrée de la semaine `cle` d'un joueur sur un mini-jeu ({ n, at }) ou null. */
function entree(p, cle, jeu) {
  const e = p && p.defisSem && p.defisSem[jeu];
  return e && cle && Number(e.c) === Number(cle) ? e : null;
}

/** Niveau de la semaine `cle` d'un joueur sur un mini-jeu (0 si rien ou si c'est une autre semaine). */
export function niveauSemaine(p, cle, jeu) {
  const e = entree(p, cle, jeu);
  return e ? Math.min(CHALLENGE.niveauMax, Math.floor(Number(e.n) || 0)) : 0;
}

/** Classement de la semaine sur un mini-jeu : [{ uid, niveau, at }], meilleur d'abord (premier arrivé en cas d'égalité). */
export function classementSemaine(players, cle, jeu, uidsValides = null) {
  const out = [];
  for (const [uid, p] of Object.entries(players || {})) {
    if (!p || p.retire || (uidsValides && !uidsValides.includes(uid))) continue;
    const niveau = niveauSemaine(p, cle, jeu);
    if (niveau < CHALLENGE.niveauMin) continue;
    out.push({ uid, niveau, at: Number(entree(p, cle, jeu).at) || Infinity });
  }
  return out.sort((a, b) => b.niveau - a.niveau || a.at - b.at || (a.uid < b.uid ? -1 : 1));
}

/**
 * Lauréats de la semaine : pour chaque mini-jeu, le premier du classement qui n'a pas déjà une prime.
 * Les mini-jeux les plus disputés sont attribués d'abord, pour que le joueur en tête partout garde le plus beau.
 */
export function laureatsSemaine(players, cle, uidsValides = null) {
  const cls = CHALLENGE.jeux.map((jeu) => ({ jeu, cl: classementSemaine(players, cle, jeu, uidsValides) })).filter((x) => x.cl.length);
  cls.sort((a, b) => b.cl.length - a.cl.length || b.cl[0].niveau - a.cl[0].niveau || (a.jeu < b.jeu ? -1 : 1));
  const pris = new Set(), out = [];
  for (const { jeu, cl } of cls) {
    const g = cl.find((x) => !pris.has(x.uid));
    if (!g) continue;
    pris.add(g.uid);
    out.push({ jeu, uid: g.uid, niveau: g.niveau, premier: g.uid === cl[0].uid });
  }
  return out;
}

/**
 * Remise des primes (résolution du dimanche). `remplirJauge(z)` attribue le skin si la jauge déborde.
 * Renvoie la liste des lauréats (rangée aussi dans state.challenge pour l'affichage).
 */
export function primeChallenge(state, uids, players, { push, zoneLabel, noms = {}, remplirJauge = () => null }) {
  const cle = Number(state.nextDeadline) || 0;
  const laureats = laureatsSemaine(players, cle, uids);
  for (const l of laureats) {
    const z = state.zones[l.uid];
    if (!z) continue;
    z.budget += CHALLENGE.prime;
    (z._compta ||= []).push({ k: 'challenge', l: 'Prime du Challenge', v: CHALLENGE.prime });
    z.jaugeIncidents = (z.jaugeIncidents || 0) + CHALLENGE.jauge;
    z.stats.primesChallenge = (z.stats.primesChallenge || 0) + 1;
    const nom = noms[l.jeu] || l.jeu;
    z.rapport.push(`Prime du Challenge : meilleur niveau de la semaine en ${nom} (niveau ${l.niveau}${l.premier ? '' : ', le premier a déjà sa prime ailleurs'}). +${CHALLENGE.prime} k€, +${CHALLENGE.jauge} sur la jauge des skins.`);
    const r = remplirJauge(z);
    if (r && r.lignes) z.rapport.push(...r.lignes);
  }
  if (laureats.length) {
    const liste = laureats.map((l) => `${noms[l.jeu] || l.jeu} : ${zoneLabel(state.zones[l.uid])} (niv. ${l.niveau})`).join(' · ');
    push(4, 'Challenge', `Primes du Challenge : ${laureats.length} lauréat${laureats.length > 1 ? 's' : ''} cette semaine`, `${liste}. Nouvelle semaine dès maintenant : les compteurs repartent de zéro.`);
  }
  state.challenge = { cle, laureats: laureats.map(({ jeu, uid, niveau }) => ({ jeu, uid, niveau })) };
  return laureats;
}
