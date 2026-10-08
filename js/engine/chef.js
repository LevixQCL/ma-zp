// Le chef de corps (saison 2, règles v2) : le personnage du joueur.
// Cinq compétences qui montent par l'usage (plafond d'expérience par jour : on ne « farme » pas), quinze talents
// à débloquer dont trois seulement équipés (un vétéran a plus de choix, pas plus de puissance), un agenda
// (une décision par jour), une carrière gardée de saison en saison.
// Calibrage : test/chef-sim.mjs (aucun chef optimisé à plus d'un point d'IPZ d'un chef laissé par défaut).
import { REGLES, PS } from './constants.js';

export const COMPETENCES = {
  gestion: { nom: 'Gestion', ico: '📊', court: 'Gest.' },
  commandement: { nom: 'Commandement', ico: '🎖️', court: 'Cdt' },
  flair: { nom: 'Flair', ico: '🔎', court: 'Flair' },
  diplomatie: { nom: 'Diplomatie', ico: '🤝', court: 'Diplo.' },
  proximite: { nom: 'Proximité', ico: '🏘️', court: 'Prox.' },
};
export const IDS_COMPETENCES = Object.keys(COMPETENCES);

/** Parcours de départ : +2 niveaux dans une compétence. */
export const PARCOURS = {
  intervention: { nom: 'Ancien de l’intervention', comp: 'commandement', texte: 'Des années de nuits en combi : tu sais tenir une équipe sous pression.' },
  enqueteur: { nom: 'Ancien enquêteur', comp: 'flair', texte: 'Tu as passé ta carrière dans les dossiers : un détail qui cloche ne t’échappe pas.' },
  gestionnaire: { nom: 'Gestionnaire', comp: 'gestion', texte: 'Budgets, marchés publics, plannings : tu fais tourner une maison.' },
  ilotier: { nom: 'Îlotier de toujours', comp: 'proximite', texte: 'Tout le quartier te connaît par ton prénom.' },
  negociateur: { nom: 'Négociateur', comp: 'diplomatie', texte: 'Syndicats, parquet, zones voisines : tu sais trouver un terrain d’entente.' },
};
export const IDS_PARCOURS = Object.keys(PARCOURS);

/** Expérience pour passer du niveau L-1 au niveau L : 8 + 3 × L (niveau 2 en ~5 jours, 5 en ~17, 8 en ~2,5 saisons). */
export const NIVEAU_MAX_CHEF = 10;
export const xpPourNiveau = (L) => 8 + 3 * L;
export const XP_CUMUL = [0];
for (let L = 1; L <= NIVEAU_MAX_CHEF; L++) XP_CUMUL.push(XP_CUMUL[L - 1] + xpPourNiveau(L));
export const BONUS_PARCOURS = 2;
export const CHEF = {
  plafondJour: 5,        // expérience au plus par compétence et par jour
  rattrapage: 2,         // progression doublée tant que le chef est sous le niveau moyen de la partie
  parrainage: { mult: 1.5, jours: 7, ps: 2, minParrain: 12, maxFilleul: 6 },
  semaine: 7,            // jours entre deux changements de talents
  maxTalents: 3,
};

/** Niveau (0 à 10) pour une expérience donnée. */
export function niveauXp(xp) {
  let L = 0;
  while (L < NIVEAU_MAX_CHEF && xp >= XP_CUMUL[L + 1]) L++;
  return L;
}
/** Niveau d'une compétence, parcours compris. */
export function niveauChef(chef, comp) {
  if (!chef) return 0;
  const base = niveauXp((chef.xp && chef.xp[comp]) || 0);
  const bonus = chef.parcours && PARCOURS[chef.parcours] && PARCOURS[chef.parcours].comp === comp ? BONUS_PARCOURS : 0;
  return Math.min(NIVEAU_MAX_CHEF, base + bonus);
}
export const niveauxChef = (chef) => Object.fromEntries(IDS_COMPETENCES.map((c) => [c, niveauChef(chef, c)]));
export const totalNiveaux = (chef) => IDS_COMPETENCES.reduce((a, c) => a + niveauChef(chef, c), 0);
/** Progression vers le niveau suivant (0 à 1) d'une compétence. */
export function progresChef(chef, comp) {
  const xp = (chef && chef.xp && chef.xp[comp]) || 0;
  const L = niveauXp(xp);
  if (L >= NIVEAU_MAX_CHEF) return 1;
  return (xp - XP_CUMUL[L]) / (XP_CUMUL[L + 1] - XP_CUMUL[L]);
}

// ───── Talents : niveau 2, 5 et 8 de chaque compétence ─────
export const TALENTS = [
  { id: 'gestionnaire', comp: 'gestion', niv: 2, nom: 'Bon gestionnaire', texte: 'Entretien des bâtiments et des annexes −20 %', entretien: 0.8 },
  { id: 'marches', comp: 'gestion', niv: 5, nom: 'Marchés publics', texte: 'Véhicules et équipement −10 %', remise: 0.1 },
  { id: 'rallonge', comp: 'gestion', niv: 8, nom: 'Rallonge budgétaire', texte: 'Une fois par semaine, une 3e dépense dans la journée' },
  { id: 'meneur', comp: 'commandement', niv: 2, nom: 'Meneur d’hommes', texte: 'Le rythme renforcé coûte 1 point de moral de moins', moral: 1 },
  { id: 'sangfroid', comp: 'commandement', niv: 5, nom: 'Sang-froid', texte: 'Après un incident raté, chance de s’en sortir +15 points', chance: 0.15 },
  { id: 'tacticien', comp: 'commandement', niv: 8, nom: 'Tacticien', texte: 'Non-droit : force +8 %, blessures −20 %', force: 0.08, blessure: 0.8 },
  { id: 'carnet', comp: 'flair', niv: 2, nom: 'Carnet noir', texte: 'Pistes : l’indic coûte moitié prix, l’agent en filature ou en dialogue revient une nuit plus tôt', cout: 0.5 },
  { id: 'intuition', comp: 'flair', niv: 5, nom: 'Intuition', texte: 'Une démarche d’enquête de plus les jours où le chef passe au parquet' },
  { id: 'renard', comp: 'flair', niv: 8, nom: 'Vieux renard', texte: 'Une accusation rejetée ne coûte aucune réputation' },
  { id: 'adresses', comp: 'diplomatie', niv: 2, nom: 'Carnet d’adresses', texte: 'Un pacte de plus en même temps' },
  { id: 'bonvoisin', comp: 'diplomatie', niv: 5, nom: 'Bon voisin', texte: 'Un renfort prêté ou une relève prise rapporte +1 de réputation', rep: 1 },
  { id: 'porteparole', comp: 'diplomatie', niv: 8, nom: 'Porte-parole', texte: 'Ta voix compte double dans les votes de crise du district' },
  { id: 'visage', comp: 'proximite', niv: 2, nom: 'Visage connu', texte: 'La satisfaction retombe 25 % moins vite', derive: 0.75 },
  { id: 'communicant', comp: 'proximite', niv: 5, nom: 'Communicant', texte: 'Plaintes médiatisées et mauvaise presse : effets réduits de moitié', presse: 0.5 },
  { id: 'mediateur', comp: 'proximite', niv: 8, nom: 'Médiateur', texte: 'Vagues de délinquance reçues −25 %', vagues: 0.75 },
];
export const TALENT = Object.fromEntries(TALENTS.map((t) => [t.id, t]));
/** Talents débloqués par ce chef. */
export const talentsDebloques = (chef) => TALENTS.filter((t) => niveauChef(chef, t.comp) >= t.niv).map((t) => t.id);
/** Vrai si la zone a ce talent équipé (et que la partie suit les règles v2). */
export const talent = (z, id) => !!(REGLES.v2 && z && z.chef && Array.isArray(z.chef.talents) && z.chef.talents.includes(id));
/** Valeur d'un talent équipé (ou `defaut`). */
export const talentVal = (z, id, cle, defaut) => (talent(z, id) ? TALENT[id][cle] : defaut);

// ───── Agenda : où passe le chef aujourd'hui ─────
export const AGENDA = {
  bureau: { nom: 'Au bureau', ico: '🗂️', comp: 'gestion', effet: 'paperasse −1 dossier quand elle dépasse 8', defaut: true, paperasse: 1, seuil: 8 },
  commune: { nom: 'À la commune', ico: '🏛️', comp: 'gestion', effet: 'réunion budgétaire : +1 500 € de subside', budget: 1.5 },
  terrain: { nom: 'Sur le terrain', ico: '🚓', comp: 'commandement', effet: 'le service choisi +10 %', cap: 1.1 },
  parquet: { nom: 'Au parquet', ico: '⚖️', comp: 'flair', effet: 'chance de pièce d’enquête +10 %', enquete: 0.1 },
  quartier: { nom: 'En réunion de quartier', ico: '🏘️', comp: 'proximite', effet: 'satisfaction +1', satisfaction: 1 },
  voisin: { nom: 'Chez un voisin', ico: '🤝', comp: 'diplomatie', effet: 'si ce chef vient chez toi le même jour : +3 PS d’entraide et +1 de réputation chacun', ps: 3, rep: 1 },
};
export const IDS_AGENDA = Object.keys(AGENDA);
const SERVICES_A = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];

/** Lecture sûre de l'agenda dans des ordres : { type, service?, zone? }. */
export function lireAgenda(o, state, uid) {
  const a = o && o.agenda;
  if (!a || typeof a !== 'object' || !Object.hasOwn(AGENDA, a.type)) return { type: 'bureau' };
  if (a.type === 'terrain') return { type: 'terrain', service: SERVICES_A.includes(a.service) ? a.service : 'intervention' };
  if (a.type === 'voisin') return typeof a.zone === 'string' && a.zone !== uid && state && state.zones && Object.hasOwn(state.zones, a.zone) ? { type: 'voisin', zone: a.zone } : { type: 'bureau' };
  return { type: a.type };
}
/** Talents demandés dans des ordres (sans doublon, au plus 3, ids connus). */
export function lireTalents(o) {
  if (!o || !Array.isArray(o.talents)) return null;
  return [...new Set(o.talents.filter((t) => typeof t === 'string' && Object.hasOwn(TALENT, t)))].slice(0, CHEF.maxTalents);
}

/** Crée le chef d'une zone (première résolution en règles v2). `profil` : fiche du joueur ({ parcours }). */
export function creerChef(profil) {
  const parcours = profil && Object.hasOwn(PARCOURS, profil.parcours) ? profil.parcours : null;
  return { parcours, xp: Object.fromEntries(IDS_COMPETENCES.map((c) => [c, 0])), saison: Object.fromEntries(IDS_COMPETENCES.map((c) => [c, 0])), talents: [], talentsT: null, medailles: [], etats: [] };
}

/**
 * Gains d'expérience du jour, d'après ce que la zone a fait (pur).
 * `f` : { revenu, investi, ratio, satisfaction, piecesGagnees, agenda, croise, d } où `d` = différence des statistiques sur la journée.
 * Retourne { gestion, commandement, … } (avant plafond et multiplicateurs).
 */
export function gainsDuJour(f) {
  const d = f.d || {};
  const n = (k) => Math.max(0, d[k] || 0);
  const g = { gestion: 0, commandement: 0, flair: 0, diplomatie: 0, proximite: 0 };
  // Gestion : finir la journée dans le vert, investir, boucler la paperasse.
  if (f.revenu > 0) g.gestion += 1;
  if (f.investi) g.gestion += 2;
  g.gestion += Math.min(1, n('dossiersResolus'));
  // Commandement : tenir les services, réussir les incidents et les urgences, les assauts et les affaires.
  if (f.ratio >= 0.9) g.commandement += 1;
  g.commandement += Math.min(2, n('incidentsOk')) + Math.min(1, n('urgencesOk')) + Math.min(1, n('affairesGagnees')) + Math.min(1, n('flagrants'));
  g.commandement += Math.min(2, 2 * (n('secteursRepris') + n('gangsRepousses') + n('coeur')));
  // Flair : pièces d'enquête, identification, dossiers noirs, arrestations.
  g.flair += Math.min(3, f.piecesGagnees || 0) + Math.min(3, 3 * (n('decouvertes') + n('limier'))) + Math.min(2, 2 * n('noirs')) + Math.min(2, 2 * n('arrestations')) + Math.min(1, n('contributions'));
  // Diplomatie : renforts, relèves, pactes tenus, opérations communes, pièces partagées, aides.
  g.diplomatie += Math.min(2, 2 * n('renfortsPretes')) + Math.min(2, 2 * n('releves')) + Math.min(1, n('pactesTenus')) + Math.min(1, n('operationsCommunes')) + Math.min(1, n('indicesPartages') + n('piecesPacte')) + Math.min(2, 2 * (n('aides') + n('sauvetages'))) + Math.min(1, n('fipaHonorees'));
  // Proximité : satisfaction haute, vagues absorbées, imprévus évités grâce à l'accueil.
  if (f.satisfaction >= 80) g.proximite += 2; else if (f.satisfaction >= 70) g.proximite += 1;
  g.proximite += Math.min(2, n('vaguesAbsorbees')) + Math.min(1, n('evites'));
  // Agenda : la compétence nourrie par la journée du chef.
  const A = f.agenda && AGENDA[f.agenda.type];
  if (A) g[A.comp] += 2 + (f.agenda.type === 'voisin' && f.croise ? 1 : 0);
  return g;
}

/**
 * Applique les gains du jour au chef (plafond par jour, rattrapage, parrainage). Retourne les niveaux gagnés
 * [{ comp, niveau }] et les talents débloqués ce soir.
 */
export function progresser(chef, gains, { rattrapage = false, parrain = null } = {}) {
  const montees = [], avantT = new Set(talentsDebloques(chef));
  for (const c of IDS_COMPETENCES) {
    let g = Math.min(CHEF.plafondJour, Math.max(0, gains[c] || 0));
    if (!g) continue;
    if (rattrapage) g *= CHEF.rattrapage;
    if (parrain && parrain.comp === c) g *= CHEF.parrainage.mult;
    g = Math.round(g * 10) / 10;
    const avant = niveauChef(chef, c);
    chef.xp[c] = Math.round(((chef.xp[c] || 0) + g) * 10) / 10;
    chef.saison[c] = Math.round(((chef.saison[c] || 0) + g) * 10) / 10;
    const apres = niveauChef(chef, c);
    if (apres > avant) montees.push({ comp: c, niveau: apres });
  }
  const nouveaux = talentsDebloques(chef).filter((t) => !avantT.has(t));
  return { montees, nouveaux };
}

/** Change les talents équipés si c'est permis (premier choix libre, puis une fois tous les 7 jours). Retourne un texte ou null. */
export function changerTalents(chef, voulus, T) {
  if (!voulus) return null;
  const ok = talentsDebloques(chef);
  const l = voulus.filter((t) => ok.includes(t)).slice(0, CHEF.maxTalents);
  const pareil = l.length === (chef.talents || []).length && l.every((t) => chef.talents.includes(t));
  if (pareil) return null;
  // Ajouter un talent dans un emplacement vide est toujours permis ; retirer ou remplacer, une fois par semaine.
  const ajoutSeul = (chef.talents || []).every((t) => l.includes(t));
  if (!ajoutSeul && chef.talentsT != null && T < chef.talentsT + CHEF.semaine) return `Talents : changement refusé, le prochain est possible au jour ${chef.talentsT + CHEF.semaine}.`;
  if (!ajoutSeul) chef.talentsT = T;
  chef.talents = l;
  return `Talents équipés : ${l.length ? l.map((t) => TALENT[t].nom).join(', ') : 'aucun'}.`;
}

/** Plafond de PS d'entraide (pour l'agenda « chez un voisin »). */
export const psEntraideMax = () => PS.plafondEntraide;
