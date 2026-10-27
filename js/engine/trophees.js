// Trophées de la zone : gagnés une fois, gardés de saison en saison.
import { CARNET_TYPES } from './central.js';

export const TROPHEES = [
  { id: 'sansfaute', nom: 'Zéro raté', texte: '7 tours d’affilée sans rater un seul incident' },
  { id: 'sauveur', nom: 'Sauveur', texte: 'Venir en aide à une zone en péril', ancien: true },
  { id: 'solidaire', nom: 'Solidaire', texte: 'Prêter des agents en renfort 3 fois' },
  { id: 'orchestre', nom: 'Chef d’orchestre', texte: 'Reprendre un secteur de la zone de non-droit à au moins 3 zones' },
  { id: 'liberateur', nom: 'Libérateur', texte: 'Participer à la chute du QG du milieu, au cœur de la ville' },
  { id: 'limier', nom: 'Fin limier', texte: 'Identifier l’auteur d’une affaire' },
  { id: 'menottes', nom: 'Menottes d’or', texte: 'Réaliser une arrestation' },
  { id: 'cerveau', nom: 'Cerveau', texte: 'Résoudre 3 dossiers noirs dans une saison' },
  { id: 'batisseur', nom: 'Bâtisseur', texte: 'Porter l’hôtel de police au niveau 4' },
  { id: 'veteran', nom: 'Vétéran', texte: 'Faire progresser un membre de l’équipe jusqu’à son dernier surnom', ancien: true },
  { id: 'incorruptible', nom: 'Incorruptible', texte: 'Finir une saison classé, sans jamais rompre un pacte', ancien: true },
  { id: 'increvable', nom: 'Increvable', texte: 'Valider ses ordres les 14 tours d’une saison' },
  // Oct. 2026 (idées de Luc) : 8 de plus, d'autres viendront.
  { id: 'rempart', nom: 'Rempart', texte: 'Repousser un gang dans la zone de non-droit' },
  { id: 'premiereligne', nom: 'Première ligne', texte: 'Participer à tous les assauts de la zone de non-droit deux soirs d’affilée' },
  { id: 'recordman', nom: 'Recordman', texte: 'Battre 10 records aux mini-jeux' },
  { id: 'erudit', nom: 'Érudit', texte: 'Réussir 50 énigmes' },
  { id: 'urgentiste', nom: 'Sur tous les fronts', texte: 'Réussir 25 incidents du jour' },
  { id: 'tresorier', nom: 'Trésorier', texte: 'Dégager 20 000 € de revenu en une journée' },
  { id: 'collection', nom: 'Collectionneur', texte: 'Débloquer 5 skins pour son commissariat' },
  { id: 'sommet', nom: 'Au sommet', texte: 'Atteindre 85 d’IPZ un soir' },
  // Central (Carte › Ma zone).
  { id: 'mainsure', nom: 'Main sûre', texte: 'Faire 150 saisies au central' },
  { id: 'tourcontrole', nom: 'Tour de contrôle', texte: 'Faire au moins 15 points de mieux que l’adjoint trois journées de central de suite' },
  { id: 'carnetcomplet', nom: 'Carnet complet', texte: 'Régler soi-même chaque type d’appel du central' },
];
export const TROPHEE = Object.fromEntries(TROPHEES.map((t) => [t.id, t]));

/** Donne un trophée s'il n'est pas déjà acquis. Renvoie true s'il est nouveau. */
export function donnerTrophee(z, id, season, turn) {
  z.trophees = z.trophees || [];
  if (z.trophees.some((t) => t.id === id)) return false;
  z.trophees.push({ id, s: season, t: turn });
  return true;
}

/** Trophées vérifiés à chaque tour (« Increvable » est donné en fin de saison). Les anciens (`ancien`) ne se gagnent plus. */
export function verifierTrophees(z) {
  const st = z.stats || {};
  const ok = [];
  if ((st.serieSansRate || 0) >= 7) ok.push('sansfaute');
  if ((st.renfortsPretes || 0) >= 3) ok.push('solidaire');
  if ((st.affairesOrchestre || 0) >= 1) ok.push('orchestre');
  if ((st.decouvertes || 0) >= 1) ok.push('limier');
  if ((st.arrestations || 0) >= 1) ok.push('menottes');
  if ((st.noirs || 0) >= 3) ok.push('cerveau');
  if (z.batiments && z.batiments.bureaux >= 4) ok.push('batisseur');
  const c = z.carriere || {};
  if ((st.gangsRepousses || 0) >= 1) ok.push('rempart');
  if ((st.serieAssauts || 0) >= 2) ok.push('premiereligne');
  if ((c.records || 0) >= 10) ok.push('recordman');
  if ((c.enigmes || 0) >= 50) ok.push('erudit');
  if ((c.incidents || 0) >= 25) ok.push('urgentiste');
  if ((st.revenuMax || 0) >= 20) ok.push('tresorier');
  if ((z.skins || []).length >= 5) ok.push('collection');
  if ((Number(z.ipz) || 0) >= 85) ok.push('sommet');
  const cx = z.central;
  if (cx && Object.values(cx.saisies || {}).reduce((t, n) => t + n, 0) >= 150) ok.push('mainsure');
  if (cx && (cx.serie15 || 0) >= 3) ok.push('tourcontrole');
  if (cx && CARNET_TYPES.every((t) => (cx.types || {})[t] > 0)) ok.push('carnetcomplet');
  return ok;
}
