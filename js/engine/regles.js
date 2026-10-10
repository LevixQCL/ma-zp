// Profils de règles. La révision d'oct. 2026 (lots 1 à 3 : classement, doctrines, choix qui coûtent) change l'équilibrage :
// elle ne s'applique qu'aux parties passées à `state.regles = 2` (nouvelle saison après la mise à jour, ou nouvelle partie),
// pour ne jamais changer les règles d'un classement en cours de saison.
// Les valeurs sont posées dans les objets partagés de constants.js au début de chaque calcul de tour et à l'affichage.
import { IPZ_POIDS, CLASSEMENT, RYTHMES, ENIGMES, REGLES } from './constants.js';

const V1 = {
  poids: { satisfaction: 0.30, affaires: 0.25, moral: 0.20, budget: 0.10, reputation: 0.15 },
  recence: 0.8,
  allege: { moral: 5, sub: '−35 % d’efficacité · +5 moral' },
  renforce: { moral: -6, sub: '+35 % d’efficacité · −6 moral · 2 k€' },
  sansFaute: { budget: 3, moral: 2, ps: 5, jauge: 0 },
};
// Simulation (test/regles-v2-sim.mjs) : objectifs du lot 1 — aucun raccourci à plus d'un point d'un joueur régulier qui investit,
// l'arrivée tardive ne finit plus en tête.
const V2 = {
  poids: { satisfaction: 0.25, affaires: 0.35, moral: 0.10, budget: 0.10, reputation: 0.20 },
  recence: 0.93,
  allege: { moral: 2, sub: '−35 % d’efficacité · +2 moral' },
  renforce: { moral: -3, sub: '+35 % d’efficacité · −3 moral · 2 k€' },
  sansFaute: { budget: 0, moral: 0, ps: 5, jauge: 3 },
};

/** Vrai si la partie suit les règles de la révision d'oct. 2026. */
export const reglesV2 = (state) => !!state && (Number(state.regles) || 1) >= 2;

/** Pose les valeurs du profil de la partie dans les objets partagés (IPZ, classement, rythmes, prime des énigmes). */
export function appliquerRegles(state) {
  const R = reglesV2(state) ? V2 : V1;
  Object.assign(IPZ_POIDS, R.poids);
  CLASSEMENT.recence = R.recence;
  Object.assign(RYTHMES.allege, R.allege);
  Object.assign(RYTHMES.renforce, R.renforce);
  Object.assign(ENIGMES.sansFaute, R.sansFaute);
  REGLES.v2 = reglesV2(state);
  return REGLES.v2;
}

// ───── Lot 3 : des choix qui coûtent ─────
/** Dépenses du jour au plus (règles v2) ; les agents de réserve comptent pour une. */
export const MAX_DEPENSES = 2;
/** Pression qui monte au fil de la saison (règles v2) : incidents de base en plus. */
export const pressionSaison = (state, T) => (reglesV2(state) ? Math.floor(Math.max(0, T - 1) / 4) : 0);
/** Note du terrain sans plafond dur (règles v2) : au-delà de 80, chaque point brut compte moitié. */
export const terrainDoux = (brut) => (brut <= 80 ? Math.max(0, brut) : 80 + (brut - 80) * 0.5);
/** Doctrine (règles v2) : à choisir pendant les 3 premiers jours de la saison (ou de la présence de la zone). */
export const DOCTRINE_JOURS = 3;
export const dernierJourDoctrine = (z) => Math.max(DOCTRINE_JOURS, ((z && z.joinedTurn) || 1) + DOCTRINE_JOURS - 1);
/** Rééquilibrage des doctrines (10 oct. 2026) : pendant la saison 2, une zone qui en a déjà choisi une peut en changer une fois. */
export const REVUE_DOCTRINES = { saison: 2 };
export const doctrineRevisable = (state, z) => !!z && !!z.doctrine && !z.doctrineRevue && Number(state && state.season) === REVUE_DOCTRINES.saison;
export const doctrineOuverte = (state, z) => reglesV2(state) && !!z && (!z.doctrine || doctrineRevisable(state, z)) && (Number(state.turn) || 1) <= dernierJourDoctrine(z);
