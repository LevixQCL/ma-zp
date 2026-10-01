// Valeurs d'équilibrage du jeu. Toutes les valeurs chiffrées sont regroupées ici
// pour pouvoir les ajuster facilement après les premiers tests.

// Version du code. À augmenter à chaque mise à jour qui change les règles :
// les appareils restés sur une ancienne version ne calculent alors plus les tours.
export const APP_VERSION = 24;

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
export const coutEquipement = (n) => COUTS.equipementBase + 2 * (n - 1);
/** Multiplicateurs d'efficacité : formation (+20 % par niveau) et matériel (+15 % par niveau). */
export const multNiveau = (n) => 0.8 + 0.2 * n;
export const multEquip = (n) => 0.85 + 0.15 * n;

// Dépenses du jour : cumulables avec la grande décision, payées sur le budget du tour.
// Roulage : au-delà de `seuil` agents, chaque agent de plus compte pour moitié (les automobilistes sont prévenus).
// « Chasse aux PV » : au-delà de 25 % des effectifs en Roulage (40 % avec les caméras).
// Affaires disputées : prime versée en plus des points (k€ par point annoncé, multipliée par la qualité du dispositif).
export const AFFAIRE = { prime: 0.6, repChef: 1 };
export const ROULAGE = { seuil: 6, auDela: 0.5, chasse: 0.25, chasseCameras: 0.4 };
/** Moral gagné par une prime au personnel : de moins en moins quand le moral est déjà haut. */
export const gainPrime = (moral) => (moral < 70 ? 4 : moral < 85 ? 2 : 1);
/** Part des effectifs en Roulage au-delà de laquelle joue l'effet « chasse aux PV ». */
export const seuilChasse = (z) => (z.infra && z.infra.anpr ? ROULAGE.chasseCameras : ROULAGE.chasse);

export const DEPENSES = {
  reserve:      { nom: 'Agents de réserve', cout: 1.5, max: 4, efficacite: 0.8, texte: '1,5 k€ par agent, pour la journée, dans le service de ton choix (efficacité 80 %)' },
  prime:        { nom: 'Prime au personnel', cout: 3, texte: '+4 de moral (sous 70), +2 (de 70 à 85), +1 au-delà' },
  prevention:   { nom: 'Campagne de prévention', cout: 4, texte: 'criminalité −6' },
  soustraitance: { nom: 'Sous-traitance administrative', cout: 3, texte: '−5 dossiers de paperasse' },
  revision:     { nom: 'Révision du parc', cout: 2, texte: 'état des véhicules +20 %, effet le jour même' },
  carrosserie:  { nom: 'Carrosserie', cout: 1.5, texte: 'répare les véhicules cabossés (1,5 k€ chacun, moitié prix avec l’atelier) ; immobilisés ce jour-là, sauf avec l’atelier' },
};

// Usure des véhicules (en % du parc) : chaque intervention use un peu les véhicules.
export const USURE = { parTour: 1, parIntervention: 1.5, max: 70, revision: 20 };
/** Efficacité de l'Intervention selon l'état du parc (100 − usure). */
export function malusEtat(etat) { return etat >= 80 ? 1 : etat >= 60 ? 0.95 : etat >= 40 ? 0.9 : 0.8; }

// Flagrant délit : chance par unité de capacité d'Intervention non prise par les incidents du jour.
// Flagrant délit : les patrouilles libres remplissent une jauge (au plus `max` par jour) ; à 100 %, flagrant délit.
export const FLAGRANT = { parUnite: 0.1, max: 0.4, points: 3, ps: 3, tension: 5 };
/**
 * Résultats terrain (composante de l'IPZ) : incidents traités + bilan des points de résultats.
 * Le bilan garde la moitié de celui de la veille (`report`) : un gros coup compte plusieurs jours,
 * un jour creux ne fait pas tout tomber. Bilan stable ≈ 2 × points moyens par jour.
 */
export const TERRAIN = { incidents: 60, parPoint: 3, report: 0.5 };
/** Recherche : chaque unité de travail sur un dossier rapporte des points tout de suite (≈ 0,5). */
export const DOSSIER = { tailleMin: 4, tailleMax: 8, ptsParUnite: 0.5 };

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
};

export const RYTHMES = {
  normal:   { label: 'Normal', mult: 1, moral: 0, cout: 0, sub: 'aucun effet' },
  renforce: { label: 'Renforcé', mult: 1.2, moral: -6, cout: 2, sub: '+20 % d’efficacité · −6 moral · 2 k€' },
  allege:   { label: 'Allégé', mult: 0.8, moral: 5, cout: 0, sub: '−20 % d’efficacité · +5 moral' },
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

// Poids de l'IPZ en version 1 (l'enquête arrivera en version 2).
export const IPZ_POIDS = { satisfaction: 0.35, affaires: 0.30, moral: 0.15, budget: 0.10, reputation: 0.10 };

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
};
/** Nombre maximum de zones par partie (le document d'état de Firestore est limité à 1 Mo, environ 8 Ko par zone). */
export const MAX_ZONES = 100;
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
  const s = nd && nd.secteurs && nd.secteurs[k];
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
  scandale: 60, scandaleMalus: 3,          // manœuvre ratée d'une zone bien vue : le scandale fait plus de bruit
};

// ───── Salle des ventes (enchères) ─────
// Un lot par jour, offres secrètes dans les ordres, résolues à 20:00. Le plus offrant paie son offre.
export const ENCHERE = { max: 30, delaiGain: 7, repReserve: 60, partReserve: 0.25 };
export const LOTS = {
  chien:     { nom: 'Chien pisteur', texte: 'Un malinois dressé et son maître-chien rejoignent tes enquêteurs.', effet: 'Recherche +15 % jusqu’à la fin de la saison', prix: 5, bonus: { recherche: 1.15 } },
  drone:     { nom: 'Drone de surveillance', texte: 'Un drone avec caméra thermique, et un agent formé pour le piloter.', effet: 'Intervention +10 % jusqu’à la fin de la saison', prix: 6, bonus: { intervention: 1.1 } },
  radar:     { nom: 'Radar-tronçon mobile', texte: 'Un radar de vitesse moyenne qu’on déplace d’une route à l’autre.', effet: 'Roulage +15 % jusqu’à la fin de la saison', prix: 4, bonus: { roulage: 1.15 } },
  analyse:   { nom: 'Logiciel d’analyse criminelle', texte: 'Une licence de logiciel qui trie les dossiers et repère les séries.', effet: 'Accueil et administration +15 % jusqu’à la fin de la saison, et −6 dossiers de paperasse tout de suite', prix: 5, bonus: { admin: 1.15 }, immediat: 'paperasse' },
  banalise:  { nom: 'Véhicule banalisé saisi', texte: 'Une berline confisquée par la justice, remise en état.', effet: '+1 véhicule tout de suite, même si le garage est plein', prix: 4, immediat: 'vehicule' },
  prevention:{ nom: 'Subside européen de prévention', texte: 'Un appel à projets gagné sur le fil : éclairage, caméras, animateurs de rue.', effet: 'Criminalité −10 et +4 de satisfaction tout de suite', prix: 4, immediat: 'prevention' },
  stage:     { nom: 'Stage de formation offert', texte: 'Une place libérée à la dernière minute dans un stage spécialisé.', effet: '+1 niveau de formation dans ton service le plus faible (sans agents immobilisés)', prix: 6, immediat: 'stage' },
  gilets:    { nom: 'Lot de gilets et de radios', texte: 'Du matériel neuf racheté à une zone qui s’est trop équipée.', effet: 'Équipement de l’Intervention +1 niveau', prix: 5, immediat: 'gilets' },
  // Lots réservés aux zones qui ont bonne réputation.
  parquet:   { nom: 'Convention avec le parquet', texte: 'Le parquet accepte de traiter tes dossiers en priorité.', effet: 'Recherche +20 % jusqu’à la fin de la saison', prix: 7, bonus: { recherche: 1.2 }, reserve: true },
  quartier:  { nom: 'Bureau de quartier prêté par la commune', texte: 'Un rez-de-chaussée en plein centre, gratuit pour la saison.', effet: 'Proximité +20 % jusqu’à la fin de la saison', prix: 6, bonus: { proximite: 1.2 }, reserve: true },
  cellule:   { nom: 'Cellule d’appui de la police fédérale', texte: 'Deux spécialistes détachés pour épauler ta zone.', effet: '+2 agents tout de suite (salaire à ta charge), même si l’hôtel de police est plein', prix: 7, immediat: 'agents', reserve: true },
};

// ───── Tutelle : dernière chance avant la faillite ─────
// Une zone encore en péril au bout du délai passe sous tutelle (une fois par saison) :
// avance de trésorerie, mais plus de manœuvres, de duels, d'enchères, d'heures sup ni de grande décision
// (sauf recruter). Si elle est toujours en péril à la fin de la tutelle : faillite.
export const TUTELLE = { tours: 5, avance: 10, moral: 8 };

export const TRAVAUX_TOURS = 1;          // durée d'un agrandissement
export const ENTRETIEN_ANNEXE = 0.3;     // k€ par tour et par annexe (salle de sport, logiciel…)
// Péréquation : une zone nettement moins équipée que la moyenne du district reçoit un coup de pouce.
export const PEREQUATION = { ecart: 2, montant: 1.5 };

// Héritage de fin de saison : ce qui est conservé (niveaux baissés de HERITAGE_PERTE, minimum 1).
// Le budget, les effectifs, les véhicules, le moral et le reste repartent des valeurs de départ.
export const HERITAGE_PERTE = 1;

/** Tour où une décision prise au tour `turn` produira son effet (null = immédiat). */
export function tourEffet(decision, turn) {
  if (!decision) return null;
  if (decision.type === 'recruter') return turn + DELAI_ACADEMIE;
  if (decision.type === 'former') return turn + DUREE_FORMATION + 1;
  if (decision.type === 'agrandir') return turn + TRAVAUX_TOURS;
  return null;
}
