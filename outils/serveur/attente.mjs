// Attente de l'heure limite pour la tâche lancée en avance (.github/workflows/veille-20h.yml).
// GitHub lance ses tâches planifiées avec 25 à 35 minutes de retard : la tâche part vers 18:20, puis attend ici
// l'heure limite la plus proche des parties (20:00) et calcule le tour aussitôt.

/** Au-delà, l'heure limite est trop loin : la tâche ne l'attend pas (elle ne fait rien et s'arrête). */
export const FENETRE_ATTENTE = 3 * 3600e3;
/** Quelques secondes après l'heure limite : les derniers ordres enregistrés à 19:59:59 sont bien lus. */
export const MARGE_ATTENTE = 5000;

/**
 * Millisecondes à attendre avant de calculer. 0 si une heure limite est déjà passée ou si aucune n'est assez proche.
 * @param {Array<number|null|undefined>} echeances heures limites (ms) des parties
 * @param {number} maintenant
 */
export function attenteAvantTour(echeances, maintenant, { fenetre = FENETRE_ATTENTE, marge = MARGE_ATTENTE } = {}) {
  const proches = (echeances || []).filter((d) => Number.isFinite(d) && d + marge > maintenant && d - maintenant <= fenetre);
  if (!proches.length) return 0;
  return Math.max(0, Math.min(...proches) + marge - maintenant);
}
