// Règles de la révision d'oct. 2026 (classement, choix qui coûtent), seules en vigueur depuis le retrait de la saison 1.
// Les poids de l'IPZ, la récence du classement, les rythmes et la prime des énigmes sont dans constants.js.

// ───── Lot 3 : des choix qui coûtent ─────
/** Dépenses du jour au plus (règles v2) ; les agents de réserve comptent pour une. */
export const MAX_DEPENSES = 2;
/** Pression qui monte au fil de la saison (règles v2) : incidents de base en plus. */
export const pressionSaison = (state, T) => (Math.floor(Math.max(0, T - 1) / 4));
/** Note du terrain sans plafond dur (règles v2) : au-delà de 80, chaque point brut compte moitié. */
export const terrainDoux = (brut) => (brut <= 80 ? Math.max(0, brut) : 80 + (brut - 80) * 0.5);
