// Valeurs d'équilibrage du jeu. Toutes les valeurs chiffrées sont regroupées ici
// pour pouvoir les ajuster facilement après les premiers tests.

// Version du code. À augmenter à chaque mise à jour qui change les règles :
// les appareils restés sur une ancienne version ne calculent alors plus les tours.
export const APP_VERSION = 113;

export const SERVICES = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];

export const SERVICE_LABELS = {
  intervention: 'Intervention',
  proximite: 'Proximité',
  recherche: 'Recherche',
  roulage: 'Roulage',
  admin: 'Accueil et administration',
};

export const SEASON_LENGTH = 14;          // tours par saison
export const RESOLUTION_HOUR = 20;        // heure de résolution (heure belge)
/** Classement : poids d'un soir selon son ancienneté (voir moyenneIpz). */
export const CLASSEMENT = { recence: 0.8 };
export const MIN_TOURS_CLASSEMENT = 5;    // tours joués pour être classé

export const START = {
  agents: 20,
  budget: 60,          // k€
  vehicules: 4,
  moral: 70,
  satisfaction: 50,
  reputation: 50,
  criminalite: 50,
  paperasse: 6,
};

export const DEFAULT_ALLOC = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };

export const ECONOMIE = {
  dotation: 10,            // k€ par tour
  salaire: 0.3,            // k€ par agent et par tour
  entretienVehicule: 0.2,  // k€ par véhicule et par tour
  coutRenforce: 2,         // k€ par tour en rythme renforcé
  amendeParCapacite: 0.7,  // k€ par unité de capacité Roulage
};

export const COUTS = {
  recrue: 2,          // k€ par recrue
  formation: 4,       // k€
  vehicule: 6,        // k€
  equipementBase: 5,  // k€ pour passer du niveau 1 au niveau 2, puis +2 k€ par niveau
};
/** Coût du matériel pour passer du niveau n au niveau n+1 : 5, 7, 9, 11 k€. */
export const coutEquipement = (n) => (REGLES.v2 ? INVEST_V2.equipementBase : COUTS.equipementBase) + 2 * (n - 1);
/** Multiplicateurs d'efficacité : formation (+20 % par niveau) et matériel (+15 % par niveau). */
export const FORMATION = { parNiveau: 0.2 };
export const multNiveau = (n) => 1 - FORMATION.parNiveau + FORMATION.parNiveau * n;
/** Matériel : un petit gain d'efficacité et surtout un effet propre à chaque service (k = niveau − 1).
 *  `actif: false` rend l'ancien comportement (+15 % d'efficacité, rien d'autre). */
export const EQUIP = {
  actif: true,
  efficacite: 0.08,     // +5 % par niveau
  blessure: 0.15,       // Intervention : −15 % de risque de blessure par niveau
  amendes: 0.15,        // Roulage : +15 % d'amendes par niveau, en plus de l'efficacité (simulation : rentabilisé dans la saison, voir test/equip-sim.mjs)
  chasse: 0.05,         // Roulage : « chasse aux PV » repoussée de 5 points d'effectifs par niveau
  enquete: 0.15,        // Recherche : +15 % de chances de pièce d'enquête par niveau
  satisfaction: 0.5,    // Proximité : +0,5 de satisfaction par tour et par niveau
  protection: 0.1,      // Accueil : +10 % de tracas internes évités par niveau
};
export const multEquip = (n) => (EQUIP.actif ? 1 - EQUIP.efficacite + EQUIP.efficacite * n : 0.85 + 0.15 * n);
/** Effet propre du matériel, en clair, pour `k` niveaux au-delà du premier. */
export const effetEquip = (service, k) => {
  const pc = (v) => `${Math.round(v * 100)} %`;
  switch (service) {
    case 'intervention': return `risque de blessure −${pc(Math.min(0.8, k * EQUIP.blessure))}`;
    case 'roulage': return `amendes +${pc(k * EQUIP.amendes)} et seuil de la « chasse aux PV » +${Math.round(k * EQUIP.chasse * 100)} % des effectifs`;
    case 'recherche': return `chances de pièce d’enquête +${pc(k * EQUIP.enquete)}`;
    case 'proximite': return `+${String(Math.round(k * EQUIP.satisfaction * 10) / 10).replace('.', ',')} de satisfaction par jour (≈ +${Math.round(k * EQUIP.satisfaction * 12)} sur une saison)`;
    case 'admin': return `tracas internes évités +${pc(k * EQUIP.protection)}`;
    default: return '';
  }
};
/** Bonus propre au matériel d'un service : k × valeur (0 si l'effet n'est pas actif). */
export const bonusEquip = (z, service, cle) => (EQUIP.actif && z && z.equip ? Math.max(0, (z.equip[service] || 1) - 1) * EQUIP[cle] : 0);

// Dépenses du jour : cumulables avec la grande décision, payées sur le budget du tour.
// Roulage : au-delà de `seuil` agents, chaque agent de plus compte pour moitié (les automobilistes sont prévenus).
// « Chasse aux PV » : au-delà de 25 % des effectifs en Roulage (40 % avec les caméras).
// Affaires disputées : prime versée en plus des points (k€ par point annoncé, multipliée par la qualité du dispositif).
export const AFFAIRE = { prime: 0.6, repChef: 1 };
export const ROULAGE = { seuil: 6, auDela: 0.5, chasse: 0.25, chasseCameras: 0.4 };
/**
 * Moral gagné par un bonus (prime, énigmes, incident réussi) : de moins en moins quand le moral est déjà haut.
 * Plein effet sous 70, moitié (arrondie au-dessus) de 70 à 85, +1 au-delà.
 */
export const MORAL_PALIERS = [70, 85];
/**
 * Effet du moral sur l'efficacité des agents, et retour naturel chaque soir.
 * Efficacité : 100 % à `neutre` ; +`haut` par point au-dessus, −`bas` par point en dessous.
 * Retour vers `cible` : taux de l'écart selon la tranche où se trouve le moral (`retour` : [à partir de, taux]).
 */
export const MORAL = {
  // Au-dessus du point neutre, chaque point compte 2,5 fois plus qu'en dessous : 120 % à 80, 150 % à 100.
  neutre: 200 / 3, haut: 0.015, bas: 0.006, cible: 60,
  // Plus le moral est haut, plus il redescend vite : le garder vers 75-80 demande de l'entretien.
  retourBas: 0.08,
  retour: [[60, 0.05], [70, 0.10], [80, 0.15], [90, 0.20]],
};
/** Part de l'écart à la cible rattrapée ce soir. */
export function tauxRetourMoral(m) {
  if (m < MORAL.cible) return MORAL.retourBas;
  let t = MORAL.retour[0][1];
  for (const [min, taux] of MORAL.retour) if (m >= min) t = taux;
  return t;
}
/**
 * Retour naturel de la satisfaction et de la réputation vers 50 : part de l'écart rattrapée chaque soir.
 * `paliers` : au-dessus de ces valeurs, le taux grimpe (comme le moral). Vide = taux fixe `base`.
 */
export const DERIVE = {
  // Plus c'est haut, plus ça redescend vite (retour de Luc, adouci) : 90+ reste possible pour une zone très active.
  // Oct. 2026 (retour de Luc) : +5 points de % dans chaque tranche.
  satisfaction: { cible: 50, base: 0.09, paliers: [[60, 0.11], [70, 0.15], [80, 0.20], [90, 0.25]] },
  reputation: { cible: 50, base: 0.03, paliers: [[60, 0.05], [70, 0.08], [80, 0.12], [90, 0.16]] },
};
export function tauxDerive(k, v) {
  const d = DERIVE[k];
  let t = d.base;
  if (v > d.cible) for (const [min, taux] of d.paliers) if (v >= min) t = taux;
  return t;
}
export const gainMoral = (base, moral) => (base <= 0 ? base : moral < MORAL_PALIERS[0] ? base : moral < MORAL_PALIERS[1] ? Math.ceil(base / 2) : 1);
export const gainPrime = (moral) => gainMoral(4, moral);
/**
 * Les figures de l'équipe (une par service) : bonus d'efficacité dans leur service, selon leurs surnoms
 * (`bonus[niveau]`, niveau 0 à 3). Une seule peut partir en mission par jour, son service perd alors son bonus :
 *  - zone de non-droit : force de la zone sur le secteur × (1 + bonus) et risque de blessure × `nd.blessure` ;
 *  - renfort chez un collègue : compte comme `renfort.agents` agent de plus dans son dispositif.
 */
export const CHEFS = { bonus: [0.03, 0.08, 0.14, 0.2], nd: { blessure: 0.5 }, renfort: { agents: 1 }, xpMission: 3 };
export const ROLE_SERVICE = { inter: 'intervention', rech: 'recherche', prox: 'proximite', roul: 'roulage', admin: 'admin' };
/** Bonus d'une figure de niveau `niveau`. */
export const bonusChef = (niveau) => CHEFS.bonus[Math.max(0, Math.min(3, niveau || 0))];
// Énigmes du jour : bonus au choix dès 2 bonnes réponses, prime « sans faute » à 3 sur 3.
// Une énigme ratée ne coûte plus rien (révision d'oct. 2026) : seule la réussite compte.
export const ENIGMES = { rateeMoral: 0, bonusMoral: 3, bonusBudget: 2, bonusCapacite: 1.1, sansFaute: { budget: 3, moral: 2, ps: 5 },
  // Retour de Luc (oct. 2026) : 4 énigmes par jour. Bonus dès 2 bonnes réponses, prime dès 3 (rien de plus à 4).
  primeSeuil: 3,
  // Paliers de carrière (toutes saisons confondues) : toutes les `pas` énigmes réussies, une récompense.
  paliers: { pas: 10, budget: 2, jauge: 3 },
  // Énigmes confiées à un agent (pas le temps, pas l'envie) : un agent planche dessus toute la journée
  // (sa paperasse prend du retard : +`paperasse` dossiers) et décroche le bonus choisi avec une chance qui dépend du moral.
  // Jamais de PS, jamais de prime « sans faute », jamais de moral perdu.
  delegue: { base: 0.6, parMoral: 0.005, min: 0.4, max: 0.8, paperasse: 1 } };
/** Chance qu'un agent chargé des énigmes décroche le bonus, selon le moral de la zone. */
export const chanceDelegue = (moral) => { const d = ENIGMES.delegue; return Math.min(d.max, Math.max(d.min, d.base + ((Number(moral) || 50) - 50) * d.parMoral)); };
/** Part des effectifs en Roulage au-delà de laquelle joue l'effet « chasse aux PV ». */
export const seuilChasse = (z) => (z.infra && z.infra.anpr ? ROULAGE.chasseCameras : ROULAGE.chasse) + bonusEquip(z, 'roulage', 'chasse') + forceDoctrine(z, 'chasse');

export const DEPENSES = {
  reserve:      { nom: 'Agents de réserve', cout: 1.5, max: 4, efficacite: 0.8, texte: '1,5 k€ par agent, pour la journée, dans le service de ton choix (efficacité 80 %)' },
  prime:        { nom: 'Prime au personnel', cout: 3, texte: '+4 de moral (sous 70), +2 (de 70 à 85), +1 au-delà' },
  prevention:   { nom: 'Campagne de prévention', cout: 4, texte: 'criminalité −6' },
  soustraitance: { nom: 'Sous-traitance administrative', cout: 3, texte: '−5 dossiers de paperasse' },
  // Simulation (test/equip-sim.mjs, FILTRE=enquêteurs) : à 3 unités, un peu plus efficace que 2 agents de réserve pour le même prix, mais réservé aux dossiers.
  enqueteurs:   { nom: 'Heures sup’ des enquêteurs', cout: 3, unites: 3, texte: '+3 unités de travail sur tes dossiers locaux ce soir (environ un demi-dossier, les plus vieux d’abord)' },
  revision:     { nom: 'Révision du parc', cout: 2, texte: 'état des véhicules +20 %, effet le jour même' },
  carrosserie:  { nom: 'Carrosserie', cout: 1.5, texte: 'répare les véhicules cabossés (1,5 k€ chacun, moitié prix avec l’atelier) ; immobilisés ce jour-là, sauf avec l’atelier' },
};

// Préparation des combis (Grande décision › Équiper) : moteur, freins, pneus. Sert sur les urgences
// (mini-jeu « Bitonal ») : chaque niveau donne +5 % de vitesse de pointe et +8 % de freinage. Remise à 0 chaque saison.
export const PREPA = { max: 3, vitesse: 0.05, frein: 0.08 };
/** Coût du niveau suivant : 4, 6, 8 k€. */
export const coutPrepa = (n) => 4 + 2 * (n || 0);
// Usure des véhicules (en % du parc) : chaque intervention use un peu les véhicules.
export const USURE = { parTour: 1, parIntervention: 1.5, max: 70, revision: 20 };
/** Efficacité de l'Intervention selon l'état du parc (100 − usure). */
export function malusEtat(etat) { return etat >= 80 ? 1 : etat >= 60 ? 0.95 : etat >= 40 ? 0.9 : 0.8; }

// Flagrant délit : chance par unité de capacité d'Intervention non prise par les incidents du jour.
// Flagrant délit : les patrouilles libres remplissent une jauge (au plus `max` par jour) ; à 100 %, flagrant délit.
export const FLAGRANT = { parUnite: 0.1, max: 0.4, points: 3, ps: 3, tension: 5 };
/**
 * Résultats terrain (composante de l'IPZ) : incidents traités + bilan des points de résultats.
 * Le bilan garde le quart de celui de la veille (`report`) : un gros coup compte encore le lendemain,
 * un jour creux ne fait pas tout tomber. Bilan stable ≈ 1,33 × points moyens par jour.
 */
// Retour de Luc (oct. 2026) : le bilan ne garde plus que le quart de celui de la veille (simulation test/ipz-luc-sim.mjs :
// terrain moyen des joueurs assidus 77 → 65, soirs à 95+ divisés par 2 à 6).
export const TERRAIN = { incidents: 45, parPoint: 2, report: 0.25 };
/** Recherche : chaque unité de travail sur un dossier rapporte des points tout de suite (≈ 0,5). */
// Dossiers locaux plus courts (retour de Luc : 6 agents doivent suivre le rythme d'un dossier par jour), même récompense par dossier.
// Simulation : 6 agents bouclent ~12 dossiers sur 13 (contre ~9 avant) ; il en fallait 8 à 11.
export const DOSSIER = { tailleMin: 3, tailleMax: 5, ptsParUnite: 0.75, version: 2, delai: 1, decote: 0.2, plancher: 0.25 };
// Décote des vieux dossiers (retour de Luc, oct. 2026) : rattraper d'un coup ne doit pas rapporter plus que suivre le rythme.
// Simulation (test/dossiers-decote-sim.mjs) : joueur régulier inchangé (57,1) ; rattrapage 58,0 → 54,6 de terrain moyen.
/** Valeur d'une unité de travail selon l'âge du dossier : pleine les `delai` premiers jours, puis −`decote` par jour (plancher). */
export const valeurDossier = (age) => Math.max(DOSSIER.plancher, 1 - DOSSIER.decote * Math.max(0, (age || 0) - DOSSIER.delai));

export const DELAI_ACADEMIE = 2;       // tours avant l'arrivée d'une recrue
export const DUREE_FORMATION = 1;      // tours d'indisponibilité
export const AGENTS_EN_FORMATION = 2;
export const NIVEAU_MAX = 5;

export const INFRAS = {
  sport:    { nom: 'Salle de sport', cout: 10, effet: '+1 de moral par tour' },
  logiciel: { nom: 'Logiciel de gestion des dossiers', cout: 10, effet: 'Paperasse traitée 50 % plus vite' },
  anpr:     { nom: 'Caméras de lecture de plaques', cout: 10, effet: 'Radars automatiques +1 k€ par tour, Roulage +20 %, « chasse aux PV » seulement au-delà de 40 % des effectifs', fixe: 1 },
  antenne:  { nom: 'Antenne de quartier', cout: 10, effet: 'Proximité +30 %' },
  garage:   { nom: 'Atelier mécanique', cout: 8, effet: 'Usure des véhicules divisée par deux' },
  audition: { nom: "Salle d'audition moderne", cout: 10, effet: 'Recherche +20 %' },
  // Stand de tir : entraînement régulier au tir et aux techniques d'intervention.
  // `bonus` : multiplicateur de l'Intervention ; `blessure` : multiplicateur du risque de blessure
  // (interpellations des affaires, assauts en zone de non-droit) ; une rébellion ne blesse plus qu'un agent.
  // `formation` : la formation Intervention se fait au stand, moins chère et sans agents absents.
  tir:      { nom: 'Stand de tir', cout: 10, effet: 'Intervention +15 %, formation Intervention à moitié prix et sans agents absents, agents deux fois moins souvent blessés', bonus: 1.15, blessure: 0.5, formation: { cout: 2, agents: 0 } },
  // Saison 2 (règles v2) : quatre annexes de plus, dans des emplacements limités (voir emplacementsAnnexes).
  cachots:  { nom: 'Complexe cellulaire', cout: 10, v2: true, effet: 'Interpellations (affaires, flagrants délits) +25 % de points, une relève se prend avec un agent de moins, garde à vue : le premier interpellé de chaque affaire balance une pièce d’enquête (1 agent de garde le lendemain)', points: 0.25 },
  drone:    { nom: 'Cellule drone', cout: 12, v2: true, effet: 'Non-droit : dès 3 agents engagés, le drone les guide (force +20 %, blessures −30 %). Traque : un survol ajoute un indice sur la planque', force: 1.2, blessure: 0.7, minAgents: 3 },
  crise:    { nom: 'Salle de crise', cout: 10, v2: true, effet: 'Non-droit : force +15 % quand au moins deux zones attaquent le même secteur ; crise du district : ta participation compte un agent de plus', coop: 0.15 },
  sapv:     { nom: 'Assistance aux victimes', cout: 10, v2: true, effet: 'Accueil +20 %, la satisfaction retombe 20 % moins vite, plaintes et audits de l’Inspection deux fois moins fréquents', admin: 1.2, derive: 0.8 },
};
/** Annexes de base (avant la saison 2), dessinées et proposées dans toutes les parties. */
export const ANNEXES_V1 = ['sport', 'logiciel', 'anpr', 'antenne', 'garage', 'audition', 'tir'];
/** Emplacements d'annexes (règles v2) : 3 + niveau des bureaux. */
export const emplacementsAnnexes = (z) => 3 + ((z && z.batiments && z.batiments.bureaux) || 1);
export const nbAnnexes = (z) => Object.values((z && z.infra) || {}).filter(Boolean).length;
/** Vrai si la zone a cette annexe (et que les règles de la partie la font jouer). */
export const aAnnexe = (z, k) => !!(z && z.infra && z.infra[k]) && (!INFRAS[k] || !INFRAS[k].v2 || REGLES.v2);
/** Formation au stand de tir : seulement pour l'Intervention, et si le stand est construit. */
const auStand = (z, service) => service === 'intervention' && !!(z && z.infra && z.infra.tir);
/** Coût d'une formation (k€) pour ce service. */
// Règles v2 : former et équiper coûtent moins et immobilisent moins (simulation test/regles-v2-sim.mjs, mode builder).
export const INVEST_V2 = { formation: 3, agentsFormation: 1, equipementBase: 4 };
export const coutFormation = (z, service) => (auStand(z, service) ? INFRAS.tir.formation.cout : REGLES.v2 ? INVEST_V2.formation : COUTS.formation);
/** Agents absents pendant une formation de ce service. */
export const agentsFormation = (z, service) => (auStand(z, service) ? INFRAS.tir.formation.agents : REGLES.v2 ? INVEST_V2.agentsFormation : AGENTS_EN_FORMATION);
/** Multiplicateur du risque de blessure d'une zone (stand de tir). */
// Fourgons d'intervention : −10 % de risque chacun, −20 % au plus (voir engine/flotte.js, MODELES.fourgon).
export const risqueBlessure = (z) => (z && z.infra && z.infra.tir ? INFRAS.tir.blessure : 1) * Math.max(0.2, 1 - bonusEquip(z, 'intervention', 'blessure')) * (1 - Math.min(0.2, 0.1 * ((z && z.flotte) || []).filter((v) => v.m === 'fourgon').length));

export const RYTHMES = {
  normal:   { label: 'Normal', mult: 1, moral: 0, cout: 0, sub: 'aucun effet' },
  // Simulation (test/equip-sim.mjs) : à ×1,2 / ×0,8, allégé tous les jours battait le normal et renforcé ne payait jamais.
  renforce: { label: 'Renforcé', mult: 1.35, moral: -6, cout: 2, sub: '+35 % d’efficacité · −6 moral · 2 k€' },
  allege:   { label: 'Allégé', mult: 0.65, moral: 5, cout: 0, sub: '−35 % d’efficacité · +5 moral' },
};

export const GRADES = [
  { nom: 'Aspirant', ps: 0, debloque: '—' },
  { nom: 'Inspecteur', ps: 200, debloque: 'Palette de couleurs étendue' },
  { nom: 'Inspecteur principal', ps: 600, debloque: 'Consignes du pilote automatique (répartition de secours, situation du jour, enquête, prime)' },
  { nom: 'Commissaire', ps: 1200, debloque: 'Insigne de grade (étoiles) sur la carte et dans la Gazette' },
  { nom: 'Commissaire divisionnaire', ps: 2000, debloque: 'Blason personnalisé pour sa zone' },
  { nom: 'Chef de corps', ps: 3000, debloque: 'Proposer une motion au Conseil, une fois par saison' },
];

export const PS = { ordres: 10, queteOk: 5, queteTentee: 2, noir: 15, evenement: 10, evenementMax: 15, finSaison: 50, plafondJour: 40, plafondEntraide: 30 };
// Les PS d'entraide (renfort, pièces partagées, contribution à l'enquête, FIPA, mission collective, secteurs tenus) ont leur propre plafond, en plus des 40.
// Événement du district : PS.evenement pour la part attendue (3 agents), proportionnel au nombre d'agents envoyés.
export const psEvenement = (c) => (c > 0 ? Math.max(1, Math.min(PS.evenementMax, Math.round(PS.evenement * c / 3))) : 0);

// Composante Budget de l'IPZ : 50 + 1,5 × budget (100 dès 34 k€). Au-delà de `dormant` k€, l'argent qui dort
// coûte `pente` point par k€ (jusqu'à `plancher`) : la commune juge qu'une zone qui ne dépense pas est trop dotée.
export const BUDGET_IPZ = { base: 50, parK: 1.5, dormant: 75, pente: 1, plancher: 50,
  // Retour de Luc : le budget de l'IPZ suit le revenu (moyenne des `jours` derniers jours) et non plus l'argent amassé.
  mode: 'revenu', jours: 3, revenu: { base: 40, parK: 4 } };
// Revenu moyen de 0 → 40 ; 10 k€ par jour → 80 ; 100 dès 15 k€ par jour (simulation : 100 atteint 3 à 8 % des soirs, contre 50 à 90 % avant).
/** Mouvements qui ne comptent pas dans le revenu du jour : achats, dépenses choisies, reventes, bilan de saison. */
export const HORS_REVENU = new Set(['decision', 'depenses', 'vente', 'bilan']);
/** Composante Budget selon le revenu moyen des derniers jours (k€ par jour). */
export function scoreRevenu(revenus) {
  const l = (revenus || []).filter(Number.isFinite);
  if (!l.length) return BUDGET_IPZ.revenu.base;
  const m = l.reduce((a, b) => a + b, 0) / l.length;
  return Math.max(0, Math.min(100, BUDGET_IPZ.revenu.base + BUDGET_IPZ.revenu.parK * m));
}
export function scoreBudget(b) {
  if (b > BUDGET_IPZ.dormant) return Math.max(BUDGET_IPZ.plancher, 100 - BUDGET_IPZ.pente * (b - BUDGET_IPZ.dormant));
  return Math.max(0, Math.min(100, BUDGET_IPZ.base + BUDGET_IPZ.parK * b));
}

// Poids de l'IPZ en version 1 (l'enquête arrivera en version 2).
export const IPZ_POIDS = { satisfaction: 0.30, affaires: 0.25, moral: 0.20, budget: 0.10, reputation: 0.15 };

export const COULEURS_ZONE = ['#5AB0F0', '#3CC6B8', '#A78BFA', '#F59E5B', '#F08BB4', '#E6C36A', '#7FD18B', '#F2766B', '#8FA8FF', '#D9A5F5'];

export function gradeFor(ps) {
  let g = GRADES[0];
  for (const gr of GRADES) if (ps >= gr.ps) g = gr;
  return g;
}

export function nextGrade(ps) {
  return GRADES.find((g) => g.ps > ps) || null;
}

// Renfort pour une opération d'envergure : agents prêtés pour la journée, contre de la réputation.
export const RENFORT = { maxParZone: 4, maxDemande: 6, repParAgent: 1, repMax: 4, psParAgent: 5, indemnite: 0.5, pointsParAgent: 1 };
// Récompense d'un renfort prêté sur une opération d'envergure : proportionnelle aux agents prêtés.
export const gainRenfort = (n) => ({ rep: Math.min(RENFORT.repMax, n * RENFORT.repParAgent), ps: n * RENFORT.psParAgent });
// Affaire disputée : réputation d'une zone venue en renfort selon ses agents (1 → +1, 2-3 → +2, 4 et plus → +3).
export const repRenfortAffaire = (n) => Math.min(3, 1 + Math.floor(n / 2));

// ───── Zone de non-droit (le centre de la ville) ─────
// Chaque secteur a une « emprise » du milieu (0 à 100). Les zones y envoient des agents :
// leurs forces s'additionnent, avec un bonus quand plusieurs zones agissent le même soir.
// À 0, le secteur est repris ; il faut ensuite y laisser un peu de monde pour qu'il ne retombe pas.
export const ND = {
  maxParSecteur: 6,       // agents d'une zone sur un même secteur
  maxTotal: 8,            // agents d'une zone dans toute la zone de non-droit
  efficacite: 3,          // emprise retirée par point de force
  coop: 0.2,              // +20 % de force par zone en plus sur le même secteur (jusqu'à 4 zones)
  coopMax: 4,
  // Emprise regagnée chaque nuit par un secteur pas encore repris : elle suit le nombre de zones actives,
  // pour qu'il faille toujours s'y mettre à plusieurs, qu'on soit 3 ou 30 dans la partie.
  regenBase: 3,
  regenParZone: 1.6,
  regenMax: 40,
  empriseAnneau: [55, 80],
  empriseCoeur: 100,
  regenCoeur: 1.5,        // multiplicateur pour le Cœur
  coeurSeuil: 3,          // secteurs de l'anneau tenus en même temps pour pouvoir attaquer le Cœur
  apresPrise: 15,         // emprise d'un secteur juste repris
  remontee: 8,            // ce que le milieu regagne chaque nuit sur un secteur tenu
  seuilRechute: 60,       // au-delà, le secteur retombe aux mains du milieu
  rechute: 65,
  usure: 0.85,            // l'influence sur un secteur tenu s'efface de 15 % par nuit
  partMin: 0.1,           // part d'influence minimale pour toucher les retombées
  // Récompenses : une part fixe pour CHAQUE zone qui a au moins 10 % d'influence (s'y mettre à plusieurs
  // ne divise pas les gains), plus une part selon l'influence.
  prise: { points: 4.5, pointsPart: 9, prime: 7.5, satisfaction: 3, rep: 3, moral: 2 },     // à la reprise, partagés selon l'influence (rep et moral : pour chacun)
  coeurMult: 2.5,
  retombees: { points: 0.45, pointsPart: 1.2, budget: 3, satisfaction: 0.3, ps: 3, satisfactionMax: 1 },       // chaque nuit, par secteur tenu, partagés selon l'influence
  contagion: 1.2,         // tension ajoutée chaque nuit aux quartiers qui touchent un secteur du milieu
  apaisement: 0.8,        // tension retirée chaque nuit aux quartiers qui touchent un secteur repris
  riposte: 0.25,          // chance, chaque nuit, que le milieu riposte sur un secteur tenu
  riposteForce: [10, 18],
  // Assaut repoussé : force trop faible pour faire reculer le milieu (échec certain), ou zone seule sur le secteur
  // (le milieu la voit venir : échec possible). L'assaut ne sert à rien et chaque agent engagé risque d'être blessé.
  seulEchec: 0.35,
  blesseRepousse: 0.15,   // par agent engagé dans un assaut repoussé
  absenceRepousse: 2,     // tours d'absence des blessés
  risqueParAgent: 0.04,   // assaut réussi : risque de blessé par agent engagé au-delà de 3 (plafonné)
  risqueMax: 0.2,
  // Gangs (retour de Luc, oct. 2026) : plus le district tient de secteurs, plus le milieu envoie de gangs les reprendre.
  // Au-delà de `seuil` secteurs de l'anneau tenus, un gang par secteur en plus ; le Cœur tenu : un gang de plus et +`coeur` de force.
  // Chaque gang est annoncé la veille (Gazette, carte) sur un secteur tenu : il ajoute sa force à l'emprise ce soir-là.
  // Force : `base` + `parZone` par zone active (plafond `max`). Le repousser rapporte à chaque zone de garde.
  gangs: { seuil: 2, base: 10, parZone: 2, max: 40, coeur: 20, ps: 5, rep: 1 },
};
/** Nombre maximum de zones par partie (le document d'état de Firestore est limité à 1 Mo : ~800 Ko à 100 zones, trop près ;
 *  40 garde de la marge). La même valeur est dans firestore.rules. */
export const MAX_ZONES = 40;
/** Vrai si la partie n'accepte plus de nouvelle zone. */
export const partieComplete = (state, uid = null) => !!state && !(uid && state.zones && state.zones[uid]) && Object.keys((state && state.zones) || {}).length >= MAX_ZONES;

/** Zones actives (qui ont joué hier ou avant-hier) : elles fixent la résistance du milieu. */
export const zonesActivesND = (state) => Object.values((state && state.zones) || {}).filter((z) => (z.toursSansOrdres || 0) < 2).length;
/** Emprise que le milieu regagne cette nuit sur un secteur. */
export function regenSecteur(state, s) {
  if (s.statut === 'repris') return ND.remontee;
  const r = Math.min(ND.regenMax, ND.regenBase + ND.regenParZone * zonesActivesND(state));
  return Math.round(r * (s.coeur ? ND.regenCoeur : 1) * 10) / 10;
}
/** Le secteur `k` peut-il recevoir des agents ? (le Cœur s'ouvre quand assez de secteurs de l'anneau sont tenus) */
export function secteurOuvert(nd, k) {
  const s = nd && nd.secteurs && Object.hasOwn(nd.secteurs, k) ? nd.secteurs[k] : null;
  if (!s) return false;
  if (!s.coeur) return true;
  return Object.values(nd.secteurs).filter((x) => !x.coeur && x.statut === 'repris').length >= ND.coeurSeuil;
}

// ───── Logistique : les bâtiments de la zone ─────
// Un niveau par bâtiment (1 à BATIMENT_MAX). Agrandir coûte cher, prend du temps (travaux),
// et augmente l'entretien plus vite que les subsides : grandir n'est jamais gratuit.
export const BATIMENT_MAX = 5;
export const BATIMENTS = {
  bureaux: {
    nom: 'Hôtel de police', unite: 'agents', texte: 'Bureaux, vestiaires, salles de briefing : fixe le nombre d’agents que la zone peut accueillir.',
    capacite: (n) => 14 + 8 * n,          // 22, 30, 38, 46, 54 agents
    coutAgrandir: (n) => 10 + 8 * n,      // passer de n à n+1 : 18, 26, 34, 42 k€
    entretien: (n) => 0.5 * n,            // k€ par tour
  },
  garage: {
    nom: 'Garage', unite: 'véhicules', texte: 'Places de parking et pont de levage : fixe le nombre de véhicules de la zone.',
    capacite: (n) => 2 + 2 * n,           // 4, 6, 8, 10, 12 véhicules
    coutAgrandir: (n) => 6 + 4 * n,       // 10, 14, 18, 22 k€
    entretien: (n) => 0.25 * n,
  },
};
// Subside communal : la commune finance une partie de chaque agent au-delà de l'effectif de départ,
// et ajoute (ou retire) un montant selon la confiance qu'elle a dans la zone (sa réputation).
// Bonus de 0,2 k€ par point au-dessus de 50 ; malus deux fois plus doux en dessous, pour ne pas enfoncer une zone déjà en difficulté.
export const SUBSIDE = { parAgent: 0.15, seuil: START.agents, confiance: 0.2, confianceMalus: 0.1 };

// Réputation : effets concrets.
export const REPUTATION = {
  recrueHaute: 65, coutRecrueHaute: 1.5,   // zone réputée : les candidats se bousculent
  recrueBasse: 35, coutRecrueBasse: 2.5,   // zone mal vue : il faut payer plus pour attirer
  scandale: 60, scandaleMalus: 3,          // (ancien : manœuvre ratée d'une zone bien vue ; les manœuvres ont disparu)
};

// ───── Salle des ventes (enchères) ─────
// Un lot par jour, offres secrètes dans les ordres, résolues à 20:00. Le plus offrant paie son offre.
export const ENCHERE = { max: 30, delaiGain: 5, repReserve: 60, partReserve: 0.25 };
export const LOTS = {
  chien:     { nom: 'Chien pisteur', texte: 'Un malinois dressé et son maître-chien rejoignent tes enquêteurs.', effet: 'Recherche +15 % jusqu’à la fin de la saison', prix: 5, bonus: { recherche: 1.15 } },
  drone:     { nom: 'Drone de surveillance', texte: 'Un drone avec caméra thermique, et un agent formé pour le piloter.', effet: 'Intervention +10 % jusqu’à la fin de la saison', prix: 6, bonus: { intervention: 1.1 } },
  radar:     { nom: 'Radar-tronçon mobile', texte: 'Un radar de vitesse moyenne qu’on déplace d’une route à l’autre.', effet: 'Roulage +15 % jusqu’à la fin de la saison', prix: 4, bonus: { roulage: 1.15 } },
  analyse:   { nom: 'Logiciel d’analyse criminelle', texte: 'Une licence de logiciel qui trie les dossiers et repère les séries.', effet: 'Accueil et administration +15 % jusqu’à la fin de la saison, et −6 dossiers de paperasse tout de suite', prix: 5, bonus: { admin: 1.15 }, immediat: 'paperasse' },
  banalise:  { nom: 'Véhicule banalisé saisi', texte: 'Une berline confisquée par la justice, remise en état.', effet: '+1 véhicule tout de suite, même si le garage est plein', prix: 4, immediat: 'vehicule' },
  prevention:{ nom: 'Subside européen de prévention', texte: 'Un appel à projets gagné sur le fil : éclairage, caméras, animateurs de rue.', effet: 'Criminalité −10 et +4 de satisfaction tout de suite', prix: 4, immediat: 'prevention' },
  stage:     { nom: 'Stage de formation offert', texte: 'Une place libérée à la dernière minute dans un stage spécialisé.', effet: '+1 niveau de formation dans ton service le plus faible (sans agents immobilisés)', prix: 6, immediat: 'stage' },
  gilets:    { nom: 'Lot de gilets et de radios', texte: 'Du matériel neuf racheté à une zone qui s’est trop équipée.', effet: 'Équipement de l’Intervention +1 niveau, sans prendre ta grande décision du jour', prix: 3, immediat: 'gilets' },
  // prix 3 (mise à prix 2 à 4 k€) : toujours sous le coût normal d'un niveau (5 k€ au minimum, puis 7, 9, 11). Avant : 4 à 6 k€, pas plus intéressant qu'équiper soi-même.
  // Lots réservés aux zones qui ont bonne réputation.
  parquet:   { nom: 'Convention avec le parquet', texte: 'Le parquet accepte de traiter tes dossiers en priorité.', effet: 'Recherche +20 % jusqu’à la fin de la saison', prix: 7, bonus: { recherche: 1.2 }, reserve: true },
  quartier:  { nom: 'Bureau de quartier prêté par la commune', texte: 'Un rez-de-chaussée en plein centre, gratuit pour la saison.', effet: 'Proximité +20 % jusqu’à la fin de la saison', prix: 6, bonus: { proximite: 1.2 }, reserve: true },
  // Saison 2 : gros lots de la vente aux enchères (trop chers pour une zone seule, achetables à deux zones liées par un pacte).
  helico:    { nom: 'Prêt d’un hélicoptère fédéral', texte: 'La police fédérale prête son hélicoptère et son équipage pour la saison.', effet: 'Intervention +10 % et force d’assaut en non-droit +15 % jusqu’à la fin de la saison', prix: 28, bonus: { intervention: 1.1 }, nd: { force: 0.15 }, gros: true },
  blinde:    { nom: 'Véhicule blindé saisi', texte: 'Un blindé de transport saisi à un réseau, remis aux normes de la police.', effet: 'Non-droit : force +10 %, blessures divisées par deux jusqu’à la fin de la saison', prix: 24, bonus: {}, nd: { force: 0.1, blessure: 0.5 }, gros: true },
  cellulef:  { nom: 'Cellule d’appui fédérale (renforcée)', texte: 'Quatre spécialistes fédéraux détachés auprès des zones acheteuses.', effet: '+2 agents tout de suite (salaire à ta charge), même si l’hôtel de police est plein', prix: 22, immediat: 'agents', gros: true },
  cellule:   { nom: 'Cellule d’appui de la police fédérale', texte: 'Deux spécialistes détachés pour épauler ta zone.', effet: '+2 agents tout de suite (salaire à ta charge), même si l’hôtel de police est plein', prix: 7, immediat: 'agents', reserve: true },
};

// ───── Tutelle : dernière chance avant la faillite ─────
// Une zone encore en péril au bout du délai passe sous tutelle (une fois par saison) :
// avance de trésorerie, mais plus de défis, d'enchères, d'heures sup ni de grande décision
// (sauf recruter). Si elle est toujours en péril à la fin de la tutelle : faillite.
export const TUTELLE = { tours: 5, avance: 10, moral: 8 };

export const TRAVAUX_TOURS = 1;          // durée d'un agrandissement
export const ENTRETIEN_ANNEXE = 0.3;     // k€ par tour et par annexe (salle de sport, logiciel…)
// Péréquation : une zone nettement moins équipée que la moyenne du district reçoit un coup de pouce.
export const PEREQUATION = { ecart: 2, montant: 1.5 };

// Héritage de fin de saison : voir bilan.js (Bilan de saison, cas calculés sur la moyenne du district).
// Ancienne règle (jusqu'à la v. du bilan) : formations et bâtiments −1, matériel remis à 1.
export const HERITAGE_PERTE = 1;

/** Tour où une décision prise au tour `turn` produira son effet (null = immédiat). */
export function tourEffet(decision, turn) {
  if (!decision) return null;
  if (decision.type === 'recruter') return turn + DELAI_ACADEMIE;
  if (decision.type === 'former') return turn + DUREE_FORMATION + 1;
  if (decision.type === 'agrandir') return turn + TRAVAUX_TOURS;
  return null;
}

// ───────────── Révision d'oct. 2026 : règles « v2 » (lots 1 à 3), actives à partir de la saison qui suit la mise à jour ─────────────
/** Drapeau des règles en vigueur pour la partie en cours de calcul ou d'affichage (posé par appliquerRegles, engine/regles.js). */
export const REGLES = { v2: false };
/**
 * Doctrines de zone (choisies au début de chaque saison) : une vraie force, un vrai prix.
 * `cap` : multiplicateur de capacité par service ('*' = tous). Maîtrise (même doctrine d'une saison à l'autre, 0 à 2) :
 * la force grandit de `MAITRISE` par cran (le prix ne bouge pas).
 */
export const DOCTRINES = {
  routiere: { nom: 'Routière', ico: '🚓', force: 'amendes +20 %, « chasse aux PV » repoussée de 15 points d’effectifs', prix: 'satisfaction −0,3 par jour (les automobilistes râlent)', brille: 'opérations de contrôle, besoin d’argent pour bâtir', amendes: 0.2, chasse: 0.15, satJour: -0.3 },
  quartier: { nom: 'De quartier', ico: '🏘️', force: 'Proximité +15 %, la satisfaction redescend bien moins vite, vagues de délinquance reçues atténuées de moitié', prix: 'Intervention −5 % de capacité', brille: 'fêtes, tensions de quartier, vagues venues des voisins', derive: 0.4, vagues: 0.5, cap: { proximite: 1.15, intervention: 0.95 } },
  judiciaire: { nom: 'Judiciaire', ico: '🔎', force: 'chances de pièce d’enquête +25 %, Recherche +15 %', prix: 'Intervention −8 % (patrouilles plus minces)', brille: 'semaines d’affaire, appuis PJF, traques', enquete: 0.25, cap: { recherche: 1.15, intervention: 0.92 } },
  intervention: { nom: 'D’intervention', ico: '🚨', force: 'Intervention +10 %, flagrants délits 30 % plus fréquents', prix: 'usure des véhicules +50 %, −1 de moral de plus en rythme renforcé', brille: 'urgences, zone de non-droit, émeutes, nuits d’orage', flagrant: 0.3, usure: 1.5, renforce: -1, cap: { intervention: 1.10 } },
  partenaire: { nom: 'Partenaire', ico: '🤝', force: 'un renfort envoyé compte pour un agent de plus, plafond des PS d’entraide +50 %', prix: 'capacité −3 % dans tous les services', brille: 'crises de district, assauts de la zone de non-droit, grandes parties', renfort: 1, entraide: 0.5, cap: { '*': 0.97 } },
};
export const IDS_DOCTRINES = Object.keys(DOCTRINES);
export const MAITRISE = 0.15;
/** Force d'une doctrine pour la clé `cle` (0 si la zone n'a pas cette doctrine), maîtrise comprise. */
export function forceDoctrine(z, cle) {
  const d = z && z.doctrine && DOCTRINES[z.doctrine];
  if (!d || d[cle] == null) return 0;
  const v = d[cle];
  return typeof v === 'number' && cle !== 'derive' && cle !== 'vagues' && cle !== 'usure' && cle !== 'renforce' && cle !== 'satJour' ? v * (1 + MAITRISE * (z.maitrise || 0)) : v;
}
/** Multiplicateur de capacité de la doctrine pour un service (bonus grandi par la maîtrise, malus fixe). */
export function multDoctrine(z, service) {
  const d = z && z.doctrine && DOCTRINES[z.doctrine];
  if (!d || !d.cap) return 1;
  const m = d.cap[service] ?? d.cap['*'] ?? 1;
  return m > 1 ? 1 + (m - 1) * (1 + MAITRISE * (z.maitrise || 0)) : m;
}

/** Prix de la prime au personnel ce soir : doublé si elle a déjà été versée la veille (règles v2). */
export const coutPrime = (z, T) => DEPENSES.prime.cout * (REGLES.v2 && z && z.primeVeille === T - 1 ? 2 : 1);
