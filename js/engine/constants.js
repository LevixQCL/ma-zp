// Valeurs d'équilibrage du jeu. Toutes les valeurs chiffrées sont regroupées ici
// pour pouvoir les ajuster facilement après les premiers tests.

// Version du code. À augmenter à chaque mise à jour qui change les règles :
// les appareils restés sur une ancienne version ne calculent alors plus les tours.
export const APP_VERSION = 3;

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
  dotation: 8,             // k€ par tour
  salaire: 0.3,            // k€ par agent et par tour
  entretienVehicule: 0.2,  // k€ par véhicule et par tour
  coutRenforce: 2,         // k€ par tour en rythme renforcé
  amendeParCapacite: 0.7,  // k€ par unité de capacité Roulage
};

export const COUTS = {
  recrue: 2,          // k€ par recrue
  formation: 4,       // k€
  vehicule: 6,        // k€
  equipementBase: 5,  // k€ × niveau actuel
};

// Dépenses du jour : cumulables avec la grande décision, payées sur le budget du tour.
export const DEPENSES = {
  reserve:      { nom: 'Agents de réserve', cout: 1.5, max: 4, texte: '1,5 k€ par agent, pour la journée, dans le service de ton choix (efficacité 80 %)' },
  prime:        { nom: 'Prime au personnel', cout: 3, texte: '+4 de moral' },
  prevention:   { nom: 'Campagne de prévention', cout: 4, texte: 'criminalité −6' },
  soustraitance: { nom: 'Sous-traitance administrative', cout: 3, texte: '−5 dossiers de paperasse' },
};

export const DELAI_ACADEMIE = 3;       // tours avant l'arrivée d'une recrue
export const DUREE_FORMATION = 2;      // tours d'indisponibilité
export const AGENTS_EN_FORMATION = 2;
export const NIVEAU_MAX = 5;

export const INFRAS = {
  sport:    { nom: 'Salle de sport', cout: 10, effet: '+1 de moral par tour' },
  logiciel: { nom: 'Logiciel de gestion des dossiers', cout: 12, effet: 'Paperasse traitée 50 % plus vite' },
  anpr:     { nom: 'Caméras de lecture de plaques', cout: 15, effet: 'Roulage +30 %, sans effet « chasse aux PV »' },
  antenne:  { nom: 'Antenne de quartier', cout: 12, effet: 'Proximité +30 %' },
  garage:   { nom: 'Atelier mécanique', cout: 8, effet: 'Usure des véhicules divisée par deux' },
  audition: { nom: "Salle d'audition moderne", cout: 14, effet: 'Recherche +20 %' },
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

export const PS = { ordres: 10, queteOk: 5, queteTentee: 2, evenement: 10, finSaison: 50, plafondJour: 40 };

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
export const RENFORT = { maxParZone: 4, maxDemande: 6, repParAgent: 1, repMax: 4, ps: 5 };

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
    subside: (n) => 0.3 * (n - 1),        // subside communal pour un plus grand commissariat
  },
  garage: {
    nom: 'Garage', unite: 'véhicules', texte: 'Places de parking et pont de levage : fixe le nombre de véhicules de la zone.',
    capacite: (n) => 2 + 2 * n,           // 4, 6, 8, 10, 12 véhicules
    coutAgrandir: (n) => 6 + 4 * n,       // 10, 14, 18, 22 k€
    entretien: (n) => 0.25 * n,
    subside: () => 0,
  },
};
export const TRAVAUX_TOURS = 2;          // durée d'un agrandissement
export const ENTRETIEN_ANNEXE = 0.3;     // k€ par tour et par annexe (salle de sport, logiciel…)
// Péréquation : une zone nettement moins équipée que la moyenne du district reçoit un coup de pouce.
export const PEREQUATION = { ecart: 2, montant: 1.5 };
