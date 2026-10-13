// Règles de la révision d'oct. 2026 (classement, doctrines, choix qui coûtent), seules en vigueur depuis le retrait de la saison 1.
// Les poids de l'IPZ, la récence du classement, les rythmes et la prime des énigmes sont dans constants.js.

// ───── Lot 3 : des choix qui coûtent ─────
/** Dépenses du jour au plus (règles v2) ; les agents de réserve comptent pour une. */
export const MAX_DEPENSES = 2;
/** Pression qui monte au fil de la saison (règles v2) : incidents de base en plus. */
export const pressionSaison = (state, T) => (Math.floor(Math.max(0, T - 1) / 4));
/** Note du terrain sans plafond dur (règles v2) : au-delà de 80, chaque point brut compte moitié. */
export const terrainDoux = (brut) => (brut <= 80 ? Math.max(0, brut) : 80 + (brut - 80) * 0.5);
/** Doctrine (règles v2) : à choisir pendant les 3 premiers jours de la saison (ou de la présence de la zone). */
export const DOCTRINE_JOURS = 3;
export const dernierJourDoctrine = (z) => Math.max(DOCTRINE_JOURS, ((z && z.joinedTurn) || 1) + DOCTRINE_JOURS - 1);
/** Rééquilibrage des doctrines (10 oct. 2026) : pendant la saison 2, une zone qui en a déjà choisi une peut en changer une fois. */
export const REVUE_DOCTRINES = { saison: 2 };
export const doctrineRevisable = (state, z) => !!z && !!z.doctrine && !z.doctrineRevue && Number(state && state.season) === REVUE_DOCTRINES.saison;
/** Deuxième semaine de la saison : on peut changer de doctrine les jours 8 et 9 (sans choix, on garde la sienne). */
export const DOCTRINE_SEM2 = { debut: 8, fin: 9 };
const semaine1 = (state, z) => (Number(state.turn) || 1) <= dernierJourDoctrine(z) && (!z.doctrine || doctrineRevisable(state, z));
const semaine2 = (state, z) => { const T = Number(state.turn) || 1; return T >= DOCTRINE_SEM2.debut && T <= DOCTRINE_SEM2.fin && !z.doctrineSem2; };
export const doctrineOuverte = (state, z) => !!z && (semaine1(state, z) || semaine2(state, z));
/** Vrai si la fenêtre ouverte est celle de la 2e semaine. */
export const doctrineSemaine2 = (state, z) => !!z && !semaine1(state, z) && semaine2(state, z);
/** Dernier jour de la fenêtre de choix en cours. */
export const finFenetreDoctrine = (state, z) => (doctrineSemaine2(state, z) ? DOCTRINE_SEM2.fin : dernierJourDoctrine(z));
