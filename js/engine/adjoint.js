// L'adjoint du chef de corps (saison 2) : il tient la zone les jours sans ordres, mieux que l'ancien pilote
// automatique, selon la consigne laissée par le joueur et le Commandement du chef (« un bon chef sait déléguer »).
// Il ne fait jamais mieux qu'un joueur présent : pas de décision d'achat, pas d'enquête, pas d'agenda, et les jours
// tenus par l'adjoint ne comptent pas dans la moyenne d'IPZ du classement.
// Il tient aussi un journal : au retour, le joueur voit ce qui s'est passé pendant son absence.
import { autopilotOrders, sanitizeOrders, operationActive } from './zone.js';
import { SERVICES } from './constants.js';
import { niveauChef } from './chef.js';

export const ADJOINT = {
  adapte: 3,        // Commandement 3 : il déplace des agents vers la pression du jour
  operations: 5,    // Commandement 5 : il mène l'opération d'envergure en entier
  depenses: 7,      // Commandement 7 : il dépense plus volontiers (prime, prévention, réserve)
  tient: 3,         // jours d'absence sans le malus « chef absent » (au lieu d'un seul)
  journal: 7,       // jours gardés dans son journal
  retour: { jours: 3, remise: 1.5, duree: 3 }, // absence de 3 jours ou plus : services du réseau rouverts, expérience ×1,5 pendant 3 jours
};
export const CONSIGNES = {
  prudent: { nom: 'Prudent', ico: '🛡️', texte: 'ménage le moral : rythme allégé dès que le moral fléchit, pas d’opération risquée' },
  equilibre: { nom: 'Équilibré', ico: '⚖️', texte: 'garde la maison comme toi : rythme normal, s’allège seulement si le moral s’effondre' },
  offensif: { nom: 'Offensif', ico: '⚡', texte: 'pousse les équipes : rythme renforcé les jours d’opération si le moral le permet' },
};
export const IDS_CONSIGNES = Object.keys(CONSIGNES);

const PRENOMS = [['Julien', 0, 'p02'], ['Sandrine', 1, 'p05'], ['Michaël', 0, 'p08'], ['Valérie', 1, 'p11'], ['Frédéric', 0, 'p13'], ['Stéphanie', 1, 'p16'], ['Christophe', 0, 'p17'], ['Audrey', 1, 'p22'], ['Damien', 0, 'p20'], ['Caroline', 1, 'p24'], ['Nicolas', 0, 'p23'], ['Émilie', 1, 'p03']];
const NOMS = ['Delvaux', 'Lambert', 'Dubois', 'Peeters', 'Maes', 'Lejeune', 'Collard', 'Renard', 'Hermans', 'Wauters', 'Gilson', 'Leroy'];

/** Crée l'adjoint d'une zone (stable : même graine, même adjoint), avec un portrait différent de celui du chef. */
export function creerAdjoint(uid, portraitChef) {
  let h = 0; for (const c of String(uid)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let i = h % PRENOMS.length;
  if (PRENOMS[i][2] === portraitChef) i = (i + 1) % PRENOMS.length;
  const [prenom, f, portrait] = PRENOMS[i];
  return { prenom, nom: NOMS[(h >>> 4) % NOMS.length], f: !!f, portrait, consigne: 'equilibre', jours: 0, journal: [] };
}
export const consigneDe = (z, pf) => (pf && Object.hasOwn(CONSIGNES, pf.consigne) ? pf.consigne : (z.adjoint && z.adjoint.consigne) || 'equilibre');

/** Ce que l'adjoint sait faire, d'après le Commandement du chef (pour l'affichage et les ordres). */
export function savoirFaire(chef) {
  const L = niveauChef(chef, 'commandement');
  return [
    { ok: true, t: 'reprend la dernière répartition et règle le rythme selon ta consigne' },
    { ok: L >= ADJOINT.adapte, niv: ADJOINT.adapte, t: 'glisse un agent vers le service mis sous pression ce jour-là' },
    { ok: L >= ADJOINT.operations, niv: ADJOINT.operations, t: 'mène l’opération d’envergure en entier' },
    { ok: true, t: 'paie une prime si le moral s’effondre, sous-traite si la paperasse déborde' },
    { ok: L >= ADJOINT.depenses, niv: ADJOINT.depenses, t: 'dépense plus volontiers : prime, prévention, agents de réserve' },
  ];
}

const CIBLE_PRESSION = { nuit: 'intervention', weekend: 'intervention', plaintes: 'admin', deal: 'proximite', vitesse: 'roulage', parquet: 'recherche', bourgmestre: 'intervention' };
function deplacer(alloc, cible, n, garder = {}) {
  for (let i = 0; i < n; i++) {
    const donneur = SERVICES.filter((s) => s !== cible && (alloc[s] || 0) > (garder[s] || 1)).sort((a, b) => alloc[b] - alloc[a])[0];
    if (!donneur) return;
    alloc[donneur] -= 1; alloc[cible] = (alloc[cible] || 0) + 1;
  }
}

/** Ordres de l'adjoint pour une zone sans ordres ce soir. */
export function ordresAdjoint(z, state, consigne = 'equilibre') {
  const T = state.turn, base = autopilotOrders(z, state);
  const L = niveauChef(z.chef, 'commandement');
  const o = { ...base, alloc: { ...base.alloc }, depenses: {} };
  const op = operationActive(z, T);
  if (L >= ADJOINT.adapte) {
    const p = (z.pressions || []).slice(-1)[0], cible = p && CIBLE_PRESSION[p.id];
    if (cible) deplacer(o.alloc, cible, 1);
  }
  if (op && L >= ADJOINT.operations && consigne !== 'prudent') {
    o.operation = 'complet';
    for (const [s, n] of Object.entries(op.besoins)) if ((o.alloc[s] || 0) < n) deplacer(o.alloc, s, n - (o.alloc[s] || 0), op.besoins);
  }
  o.rythme = consigne === 'prudent' ? (z.moral < 55 ? 'allege' : 'normal')
    : consigne === 'offensif' ? (op && z.moral > 60 ? 'renforce' : z.moral < 40 ? 'allege' : 'normal')
      : (z.moral < 42 ? 'allege' : 'normal');
  const large = L >= ADJOINT.depenses;
  if (z.moral < (large ? 55 : 45) && z.budget > 12) o.depenses.prime = true;
  if (z.paperasse > 12 && z.budget > 10) o.depenses.soustraitance = true;
  if (large && !o.depenses.prime && consigne !== 'prudent' && z.criminalite > 55 && z.budget > 15) o.depenses.prevention = true;
  if (large && z.budget > 25) { o.depenses.reserve = 2; o.depenses.reserveService = op ? Object.keys(op.besoins)[0] : 'intervention'; }
  return sanitizeOrders(z, o, state);
}

/** Une ligne du journal de l'adjoint (fin de soirée, jour tenu sans le chef). */
export function noterJournal(z, T, j) {
  const a = z.adjoint;
  if (!a) return;
  a.jours = (a.jours || 0) + 1;
  a.journal = [...(a.journal || []), { t: T, ...j }].slice(-ADJOINT.journal);
}
