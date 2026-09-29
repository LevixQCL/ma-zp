// Textes du jeu : affaires, événements, coups durs, aléas.
// Tout est fictif. On peut enrichir ces listes librement.

export const AFFAIRES_DISPUTEES = [
  'Trafic de pièces auto entre deux communes',
  'Vols dans les parkings de la gare',
  'Série de cambriolages de caves',
  'Réseau de vélos volés revendus en ligne',
  'Vols de câbles de cuivre sur le chantier du tram',
  'Escroqueries aux faux techniciens',
  'Tags en série sur les ponts',
  'Vols à la tire au marché du dimanche',
  'Trafic de cigarettes de contrebande',
  'Rodéos urbains nocturnes',
  'Vols de catalyseurs',
  'Faux billets dans les commerces',
  'Cambriolages de chantiers',
  'Vols de colis devant les portes',
  'Arnaque au faux neveu',
  'Vols de carburant sur les parkings poids lourds',
];

export const DOSSIERS_LOCAUX = [
  'Vol de vélo électrique', 'Dégradation de voiture', 'Vol dans un véhicule', 'Escroquerie en ligne',
  'Harcèlement téléphonique', 'Vol à l’étalage répété', 'Cambriolage de garage', 'Fraude à la carte bancaire',
  'Vol de plaques d’immatriculation', 'Graffitis sur l’école', 'Vol de matériel de jardin', 'Usurpation d’identité',
  'Vol de scooter', 'Menaces entre voisins', 'Vol dans un vestiaire', 'Dépôt clandestin de déchets',
];

export const EVENEMENTS_COLLECTIFS = [
  { titre: 'Festival du Parc', texte: 'Trois scènes, 20 000 personnes attendues.' },
  { titre: 'Match à risque au stade du Delta', texte: 'Les supporters adverses arrivent en train spécial.' },
  { titre: 'Tempête annoncée sur le district', texte: 'Arbres tombés et routes coupées à prévoir.' },
  { titre: 'Visite officielle au District Delta', texte: 'Cortège, fermetures de voiries et sécurité renforcée.' },
  { titre: 'Marathon du Delta', texte: '42 km de parcours à sécuriser.' },
  { titre: 'Braderie géante', texte: 'Tout le centre fermé à la circulation.' },
  { titre: 'Grand feu de la Saint-Jean', texte: 'Rassemblement nocturne au bord du canal.' },
];

// Coups durs : poids de tirage, effets appliqués dans le moteur.
export const COUPS_DURS = [
  { id: 'rebellion', titre: 'Rébellion lors d’une intervention', w: 3 },
  { id: 'grippe', titre: 'Vague de grippe', w: 2 },
  { id: 'accident', titre: 'Accident de la circulation en service', w: 2 },
  { id: 'plainte', titre: 'Plainte médiatisée contre la zone', w: 2 },
  { id: 'panne', titre: 'Panne informatique générale', w: 1 },
];

// Aléas légers, avec leur effet direct.
export const ALEAS = [
  { id: 'carwash', titre: 'Le combi est resté coincé au car-wash', effet: { vehiculeHS: 1 }, texte: 'Un véhicule indisponible pour un tour.' },
  { id: 'croissants', titre: 'Un commerçant offre des croissants', effet: { moral: 3 }, texte: '+3 de moral.' },
  { id: 'miseajour', titre: 'Mise à jour informatique surprise', effet: { adminMult: 0.5 }, texte: 'L’administration tourne à 50 %.' },
  { id: 'barbecue', titre: 'Barbecue du personnel', effet: { moral: 4, budget: -0.5 }, texte: '+4 de moral, 0,5 k€ de merguez.' },
  { id: 'article', titre: 'Article élogieux dans la presse locale', effet: { satisfaction: 3 }, texte: '+3 de satisfaction.' },
  { id: 'subside', titre: 'Petit subside communal', effet: { budget: 2 }, texte: '+2 k€.' },
  { id: 'imprimante', titre: 'L’imprimante du rez-de-chaussée rend l’âme', effet: { paperasse: 3 }, texte: '+3 dossiers en attente.' },
  { id: 'stagiaire', titre: 'Un stagiaire très motivé', effet: { paperasse: -3 }, texte: '3 dossiers traités en bonus.' },
  { id: 'fuite', titre: 'Fuite d’eau dans les vestiaires', effet: { moral: -2, budget: -1 }, texte: '−2 de moral, 1 k€ de réparations.' },
  { id: 'chien', titre: 'Un chien errant adopté par le service', effet: { moral: 2 }, texte: '+2 de moral. Il s’appelle Matricule.' },
];

export const TITRES_UNE_AFFAIRE = [
  (z) => `${z} démantèle le réseau`,
  (z) => `Coup de filet réussi pour ${z}`,
  (z) => `${z} rafle la mise`,
];

// Opérations d'envergure : elles mobilisent des agents de plusieurs services,
// qui ne font donc plus leur travail habituel pendant la durée de l'opération.
export const OPERATIONS = [
  { id: 'otages', titre: 'Prise d’otages dans une agence bancaire', texte: 'Périmètre, négociation, enquête : tous les services sont mobilisés.', besoins: { intervention: 5, recherche: 2, proximite: 1 }, duree: 1, recompense: 10 },
  { id: 'incendie', titre: 'Incendie d’un immeuble à appartements', texte: 'Évacuation, bouclage du quartier et relogement des habitants.', besoins: { intervention: 4, proximite: 3, roulage: 2 }, duree: 1, recompense: 8 },
  { id: 'disparition', titre: 'Disparition inquiétante d’une personne âgée', texte: 'Battue dans le quartier, auditions des proches, diffusion de l’avis de recherche.', besoins: { proximite: 3, recherche: 2, intervention: 2 }, duree: 2, recompense: 9 },
  { id: 'homicide', titre: 'Homicide dans un appartement', texte: 'Constatations, enquête de voisinage, auditions : un dossier lourd sur trois jours.', besoins: { recherche: 4, intervention: 2, admin: 1 }, duree: 3, recompense: 14 },
  { id: 'accident', titre: 'Accident grave sur la nationale', texte: 'Plusieurs véhicules impliqués : déviation, constats et auditions.', besoins: { roulage: 3, intervention: 3, admin: 1 }, duree: 1, recompense: 7 },
  { id: 'rixe', titre: 'Rixe générale à la sortie d’une discothèque', texte: 'Rétablir l’ordre, identifier les auteurs, acter les plaintes.', besoins: { intervention: 5, recherche: 1, admin: 2 }, duree: 1, recompense: 8 },
  { id: 'deal', titre: 'Démantèlement d’un point de deal', texte: 'Observations, perquisitions et saisies sur deux jours.', besoins: { recherche: 3, proximite: 2, intervention: 2 }, duree: 2, recompense: 12 },
  { id: 'gaz', titre: 'Fuite de gaz et évacuation d’une école', texte: 'Évacuer, sécuriser le périmètre, rassurer les parents.', besoins: { intervention: 3, proximite: 3, roulage: 1 }, duree: 1, recompense: 7 },
];

// Situation du jour : annoncée au début du tour, elle change les besoins de la zone.
export const PRESSIONS = [
  { id: 'nuit', titre: 'Nuit agitée annoncée', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
  { id: 'plaintes', titre: 'Afflux de plaintes après une série de vols', texte: '+5 dossiers de paperasse.', effet: { paperasse: 5 } },
  { id: 'deal', titre: 'Deal signalé près de l’école', texte: 'Criminalité +6.', effet: { criminalite: 6 } },
  { id: 'vitesse', titre: 'Riverains excédés par la vitesse', texte: 'Moins de 3 agents en Roulage : −3 de satisfaction. 3 ou plus : +2.', effet: { roulageMin: 3 } },
  { id: 'parquet', titre: 'Le parquet réclame les dossiers en retard', texte: 'Chaque dossier ouvert depuis plus de 4 tours coûte 1 point de satisfaction.', effet: { parquet: true } },
  { id: 'bourgmestre', titre: 'Visite du bourgmestre', texte: 'Aucun incident raté : +4 de satisfaction. Sinon : −4.', effet: { bourgmestre: true } },
];
export const PRESSION_WEEKEND = { id: 'weekend', titre: 'Nuit du week-end', texte: '+2 incidents attendus.', effet: { incidents: 2 } };

// Sites sensibles : chaque zone en possède un, qui génère ses propres imprévus.
// « evenements » = situations du jour (mêmes effets que les pressions) ; « operation » = opération d'envergure propre au site.
export const SITES = [
  { id: 'seveso', nom: 'Usine Solvadelta', type: 'Site Seveso', couleur: '#E0A030',
    evenements: [
      { titre: 'Odeur suspecte signalée autour de l’usine', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
      { titre: 'Exercice du plan d’urgence imposé par le gouverneur', texte: '+4 dossiers de paperasse.', effet: { paperasse: 4 } },
      { titre: 'Manifestation écologiste devant les grilles', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
    ],
    operation: { titre: 'Fuite de chlore à l’usine Solvadelta', texte: 'Périmètre de sécurité, évacuation des riverains, déviation de la circulation.', besoins: { intervention: 4, proximite: 3, roulage: 2 }, duree: 1, recompense: 11 } },
  { id: 'stade', nom: 'Stade du Sporting Delta', type: 'Stade de football', couleur: '#4CC38A',
    evenements: [
      { titre: 'Match à risque au Sporting Delta', texte: '+3 incidents attendus.', effet: { incidents: 3 } },
      { titre: 'Supporters adverses en déplacement', texte: '+2 incidents. Moins de 3 agents en Roulage : −3 de satisfaction, sinon +2.', effet: { incidents: 2, roulageMin: 3 } },
      { titre: 'Engins pyrotechniques saisis en tribune', texte: '+3 dossiers de paperasse.', effet: { paperasse: 3 } },
    ],
    operation: { titre: 'Envahissement de terrain et bagarre en tribune', texte: 'Rétablir l’ordre, séparer les groupes, identifier les meneurs sur les images.', besoins: { intervention: 5, recherche: 2, admin: 1 }, duree: 1, recompense: 10 } },
  { id: 'gare', nom: 'Gare centrale', type: 'Gare', couleur: '#8CC8F5',
    evenements: [
      { titre: 'Vols à la tire en série sur les quais', texte: '+4 dossiers, criminalité +3.', effet: { paperasse: 4, criminalite: 3 } },
      { titre: 'Grève des chemins de fer : foule et tensions', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
    ],
    operation: { titre: 'Colis suspect : évacuation de la gare centrale', texte: 'Évacuation des quais, périmètre, intervention du service de déminage.', besoins: { intervention: 4, proximite: 2, roulage: 2 }, duree: 1, recompense: 9 } },
  { id: 'port', nom: 'Port fluvial', type: 'Port', couleur: '#5AB0F0',
    evenements: [
      { titre: 'Trafic signalé sur les quais de déchargement', texte: 'Criminalité +5.', effet: { criminalite: 5 } },
      { titre: 'Contrôle conjoint avec la douane', texte: '+3 dossiers de paperasse.', effet: { paperasse: 3 } },
    ],
    operation: { titre: 'Saisie de stupéfiants dans une péniche', texte: 'Surveillance, perquisition à bord, auditions : deux jours de travail.', besoins: { recherche: 4, intervention: 2, admin: 1 }, duree: 2, recompense: 13 } },
  { id: 'prison', nom: 'Prison de Delta', type: 'Établissement pénitentiaire', couleur: '#9FB0C0',
    evenements: [
      { titre: 'Grève des agents pénitentiaires', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
      { titre: 'Extractions judiciaires en série', texte: '+3 dossiers de paperasse.', effet: { paperasse: 3 } },
    ],
    operation: { titre: 'Mutinerie au quartier B', texte: 'Bouclage extérieur, appui aux équipes pénitentiaires, transferts sous escorte.', besoins: { intervention: 6, recherche: 1, roulage: 1 }, duree: 1, recompense: 11 } },
  { id: 'hopital', nom: 'CHU du Delta', type: 'Hôpital', couleur: '#F0736A',
    evenements: [
      { titre: 'Urgences saturées : agressivité en salle d’attente', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
      { titre: 'Réquisitions et constats à l’hôpital', texte: '+3 dossiers de paperasse.', effet: { paperasse: 3 } },
    ],
    operation: { titre: 'Individu armé retranché aux urgences', texte: 'Évacuation des patients, négociation, interpellation.', besoins: { intervention: 5, recherche: 2, proximite: 1 }, duree: 1, recompense: 11 } },
  { id: 'boite', nom: 'Le Hangar', type: 'Boîte de nuit', couleur: '#C084FC',
    evenements: [
      { titre: 'Soirée géante au Hangar', texte: '+3 incidents attendus.', effet: { incidents: 3 } },
      { titre: 'Riverains excédés par le bruit du Hangar', texte: '+1 incident, +2 dossiers.', effet: { incidents: 1, paperasse: 2 } },
    ],
    operation: { titre: 'Rixe générale à la sortie du Hangar', texte: 'Rétablir l’ordre, identifier les auteurs, acter les plaintes.', besoins: { intervention: 5, recherche: 1, admin: 2 }, duree: 1, recompense: 8 } },
  { id: 'centre', nom: 'Delta Shopping', type: 'Centre commercial', couleur: '#F2B544',
    evenements: [
      { titre: 'Soldes : vols à l’étalage en cascade', texte: '+4 dossiers de paperasse.', effet: { paperasse: 4 } },
      { titre: 'Pickpockets repérés dans la galerie', texte: 'Criminalité +4.', effet: { criminalite: 4 } },
    ],
    operation: { titre: 'Braquage de la bijouterie de Delta Shopping', texte: 'Bouclage du centre, poursuite, exploitation des caméras.', besoins: { intervention: 4, recherche: 3, roulage: 1 }, duree: 1, recompense: 10 } },
  { id: 'campus', nom: 'Campus universitaire', type: 'Université', couleur: '#6FD9A5',
    evenements: [
      { titre: 'Baptêmes étudiants dans le quartier', texte: '+3 incidents attendus.', effet: { incidents: 3 } },
      { titre: 'Tags et dégradations sur le campus', texte: 'Criminalité +3, +2 dossiers.', effet: { criminalite: 3, paperasse: 2 } },
    ],
    operation: { titre: 'Occupation d’un auditoire', texte: 'Dialogue, sécurisation des bâtiments, évacuation si nécessaire : deux jours.', besoins: { proximite: 3, intervention: 3, admin: 1 }, duree: 2, recompense: 10 } },
  { id: 'aerodrome', nom: 'Aérodrome régional', type: 'Aérodrome', couleur: '#8CC8F5',
    evenements: [
      { titre: 'Vol officiel : escorte demandée', texte: 'Moins de 3 agents en Roulage : −3 de satisfaction, sinon +2.', effet: { roulageMin: 3 } },
      { titre: 'Drone signalé au-dessus de la piste', texte: '+1 incident, +2 dossiers.', effet: { incidents: 1, paperasse: 2 } },
    ],
    operation: { titre: 'Alerte à la bombe à l’aérodrome', texte: 'Évacuation du terminal, fouille, contrôle des accès.', besoins: { intervention: 4, recherche: 2, roulage: 2 }, duree: 1, recompense: 10 } },
  { id: 'echangeur', nom: 'Échangeur de l’E42', type: 'Autoroute', couleur: '#5AB0F0',
    evenements: [
      { titre: 'Chantier sur l’E42 : bouchons monstres', texte: 'Moins de 4 agents en Roulage : −3 de satisfaction, sinon +2.', effet: { roulageMin: 4 } },
      { titre: 'Course-poursuite venue de l’autoroute', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
    ],
    operation: { titre: 'Carambolage sur l’E42', texte: 'Sécurisation, déviation, constats et auditions des témoins.', besoins: { roulage: 4, intervention: 3, admin: 1 }, duree: 1, recompense: 9 } },
  { id: 'parc', nom: 'Deltaland', type: 'Parc d’attractions', couleur: '#F59A92',
    evenements: [
      { titre: 'Afflux record à Deltaland : enfants égarés', texte: '+2 incidents attendus.', effet: { incidents: 2 } },
      { titre: 'Vols dans les casiers de Deltaland', texte: '+3 dossiers de paperasse.', effet: { paperasse: 3 } },
    ],
    operation: { titre: 'Accident grave sur une attraction de Deltaland', texte: 'Secours, évacuation du parc, constatations avec le parquet.', besoins: { intervention: 3, proximite: 3, admin: 2 }, duree: 1, recompense: 9 } },
];
