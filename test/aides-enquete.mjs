// Aides pour les tests de l'enquête en direct (saison 4) : construisent les actions horodatées
// passées à resolveTurn(state, { enqueteActions: { uid: [action, …] } }).
// Les démarches partent le matin (au plus 2 en cours avec 4 enquêteurs, d'où les créneaux espacés de 4 h),
// les confrontations deux heures avant 20:00 (le parquet ferme 45 minutes avant).
export const H = 3600000, MIN = 60000;

/**
 * 20:00 de la journée jouée. Une partie de test sans échéance (nextDeadline = 0) n'a pas de limite horaire :
 * on prend alors une journée fictive par tour, pour que les heures avancent d'un tour à l'autre
 * (une pièce de la veille est déjà arrivée le lendemain matin), y compris d'une saison à l'autre.
 */
export const finJournee = (state) => Number(state.nextDeadline) || ((state.season || 1) * 1000 + state.turn) * 24 * H;

/** Heure de départ de la k-ième démarche de la journée : deux par créneau, un créneau toutes les 4 h à partir de 20:00 − 12 h. */
export const heureDemarche = (state, k = 0) => finJournee(state) - 12 * H + Math.floor(k / 2) * 4 * H + (k % 2) * MIN;

/** Une démarche : 'cam' | 'labo' | 'temoin' | 'alibi:3' | 'moyens:2' | 'banque:1'. */
export const demarche = (state, x, k = 0) => ({ k: 'dem', x, at: heureDemarche(state, k) });
/** Plusieurs démarches de la journée, dans l'ordre, sur des créneaux qui ne saturent pas les enquêteurs. */
export const demarches = (state, xs) => xs.map((x, k) => demarche(state, x, k));

/** Réaudition d'un suspect (meurtre) en lui opposant une pièce. */
export const reaudition = (state, i, f, h = 6) => ({ k: 'reaud', i, f, at: finJournee(state) - h * H });
/** Recoupement de deux pièces. */
export const recoupement = (state, a, b, h = 5) => ({ k: 'recoup', a, b, at: finJournee(state) - h * H });

/**
 * Confrontation (remplace les anciens ordres accusation / accusation2 / confront / mobile).
 * `opts` : { i2, pieces, mobile, h (heures avant 20:00, 2 par défaut) }.
 */
export function confrontation(state, i, { i2, pieces, mobile, h = 2 } = {}) {
  return { k: 'confront', i, ...(Number.isInteger(i2) ? { i2 } : {}), ...(pieces ? { pieces } : {}), ...(Number.isInteger(mobile) ? { mobile } : {}), at: finJournee(state) - h * H };
}

/**
 * Traduit un ancien ordre d'enquête ({ demarches, accusation, accusation2, confront, mobile, reaud: { i, f }, recoup: [a, b] })
 * en actions horodatées pour une zone.
 */
export function actionsDe(state, o = {}) {
  const l = demarches(state, o.demarches || []);
  if (o.reaud) l.push(reaudition(state, o.reaud.i, o.reaud.f));
  if (o.recoup) l.push(Array.isArray(o.recoup) ? recoupement(state, o.recoup[0], o.recoup[1]) : recoupement(state, o.recoup.a, o.recoup.b));
  if (Number.isInteger(o.accusation)) l.push(confrontation(state, o.accusation, { i2: o.accusation2, pieces: o.confront, mobile: o.mobile }));
  return l;
}

/** Les enquêteurs d'une zone sont connus du tour précédent ; pour un test, on les fixe. */
export const fixerEnqueteurs = (z, n = 4) => { z.enqueteurs = n; return z; };
