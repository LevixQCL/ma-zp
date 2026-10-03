import { PEINES } from './contenu.js';
// Enquête principale : une affaire de 7 jours au plus, résolue par le trio
// Mobile · Moyen · Occasion. Cinq suspects ; le coupable est le seul à réunir
// les trois. Les constatations disent ce qu'il fallait (l'heure exacte, la façon
// d'entrer, la raison du vol) ; les vérifications sur les suspects donnent des
// faits bruts, qu'il faut confronter aux constatations.
// Les suspects sont répartis entre des « cellules » de zones : on vérifie les
// siens à prix normal, ceux des autres coûtent le double, d'où l'intérêt de partager.
// Tout est déterministe : une affaire se recalcule à partir de la graine et de son numéro.
import { makeRng, hashString } from './rng.js';
import { bonusEquip } from './constants.js';

export const ENQ_VERSION = 2;
export const ENQ = {
  dureeMax: 7,          // jours pour désigner le suspect
  traqueTours: 2,       // tours pour l'arrêter ensuite
  agentsTraque: 4,      // agents d'Intervention minimum pour une interpellation
  maxDemarches: 2,      // démarches par tour
  maxPartages: 3,       // pièces partagées par tour
  maxRecus: 2,          // pièces partagées qu'une zone peut recevoir par soir (les grandes parties restent équitables)
  nbSuspects: 5,
  maxCellules: 3,
  surcoutHorsCellule: 2, // multiplicateur de coût pour un suspect d'une autre cellule
};

/** Points d'enquête pour une découverte au jour `j`. */
export const pointsDecouverte = (j) => Math.max(40, 110 - 10 * j);
export const POINTS = { contribution: 25, arrestation: 30 };

// Enquête de voisinage (service Recherche) : pièces rapportées chaque soir sur les suspects.
// Nombre attendu de pièces = (capacité de Recherche − 2) × taux, plafonné.
// Sans piste : pièces au hasard. Avec une piste prioritaire : pièces sur ce suspect, taux plus fort,
// Chaque pièce rapportée compte aussi dans les résultats du jour (IPZ).
export const VOISINAGE = { seuil: 2, taux: 0.07, max: 0.5, tauxPiste: 0.14, maxPiste: 1.4, detaches: 0, pointsParPiece: 2, horsCellule: 0.5 };
/** Nombre attendu de pièces de voisinage ce soir (0,4 = 40 % de chance d'une pièce ; 1,3 = une pièce sûre et 30 % d'une deuxième). */
export function chanceVoisinage(state, uid, capRecherche, piste) {
  const V = VOISINAGE;
  const u = Math.max(0, capRecherche - V.seuil);
  if (piste === null || piste === undefined) return Math.min(V.max, u * V.taux);
  const c = Math.min(V.maxPiste, u * V.tauxPiste);
  return dansMaCellule(state, uid, piste) ? c : c * V.horsCellule;
}

export const ELEMENTS = ['mob', 'moy', 'occ'];
export const ELEMENT_NOM = { mob: 'Mobile', moy: 'Moyen', occ: 'Occasion' };

// Constatations (sur les lieux) et vérifications (sur un suspect choisi).
export const DEMARCHES = {
  cam: { nom: 'Images de caméras', motif: 'Le service communal extrait et visionne les images de la rue.', cout: 3, scene: 'occ', planque: 'p:rive', dit: 'l’heure exacte des faits' },
  labo: { nom: 'Analyse des traces', motif: 'Le labo de police scientifique examine la porte, la serrure et l’alarme.', cout: 5, scene: 'moy', planque: 'p:temperature', dit: 'comment l’auteur est entré' },
  temoin: { nom: 'Audition de la victime', motif: 'Deux enquêteurs passent la journée avec la victime et le voisinage.', cout: 0, agents: 2, scene: 'mob', planque: 'p:acces', dit: 'pourquoi on a volé' },
  alibi: { nom: 'Vérifier l’alibi', motif: 'Caméras, paiements, badges et témoins : on recoupe sa déclaration.', cout: 2, cible: 'occ', dit: 'où il ou elle était vraiment' },
  moyens: { nom: 'Vérifier les moyens', motif: 'Registres des clés et de l’alarme, loueurs, garages.', cout: 3, cible: 'moy', dit: 'clés, code d’alarme, véhicule' },
  banque: { nom: 'Comptes et entourage', motif: 'Extraits de compte via le parquet, téléphonie, entourage.', cout: 3, cible: 'mob', dit: 'dettes, rancunes, fréquentations' },
};
export const SOURCES = {
  ouverture: 'Ouverture du dossier', voisinage: 'Enquête de voisinage', quete: 'Bonus d’énigme', pjf: 'Appui PJF', partage: 'Partagé', rebond: 'Rebondissement',
  ...Object.fromEntries(Object.entries(DEMARCHES).map(([k, d]) => [k, d.nom])),
};

/** Découpe un ordre de démarche : « cam » ou « alibi:3 ». */
export function lireDemarche(x) {
  const [k, s] = String(x).split(':');
  const dm = Object.prototype.hasOwnProperty.call(DEMARCHES, k) ? DEMARCHES[k] : null;
  if (!dm) return null;
  if (dm.cible) { const i = Number(s); return s !== undefined && Number.isInteger(i) && i >= 0 && i < ENQ.nbSuspects ? { k, dm, i } : null; }
  return s === undefined ? { k, dm, i: null } : null;
}

// ─────────────────────────────── Contenu ───────────────────────────────

const AFFAIRES = [
  { titre: 'Le casse du dépôt des Tanneurs', lieu: 'le dépôt des Tanneurs', pres: 'du dépôt des Tanneurs', texte: 'Un dépôt de matériel électronique a été vidé pendant la nuit.', butin: 'ordinateurs portables', gros: true, vic: ['le gérant', 'au gérant', 'du gérant'] },
  { titre: 'La bijouterie de la Grand-Place', lieu: 'la bijouterie', pres: 'de la bijouterie', texte: 'Une bijouterie a été visitée après la fermeture.', butin: 'montres et bijoux', gros: false, vic: ['la bijoutière', 'à la bijoutière', 'de la bijoutière'] },
  { titre: 'Le fourgon de la Porte Sud', lieu: 'l’entrepôt de la Porte Sud', pres: 'de l’entrepôt de la Porte Sud', texte: 'L’entrepôt d’un grossiste en parfums a été vidé.', butin: 'cartons de parfums', gros: true, vic: ['le grossiste', 'au grossiste', 'du grossiste'] },
  { titre: 'Les caves du Béguinage', lieu: 'le restaurant du Béguinage', pres: 'du restaurant du Béguinage', texte: 'La cave d’un restaurant réputé a été pillée.', butin: 'caisses de grands vins', gros: true, vic: ['le restaurateur', 'au restaurateur', 'du restaurateur'] },
  { titre: 'L’atelier des Filatures', lieu: 'l’atelier des Filatures', pres: 'de l’atelier des Filatures', texte: 'Un atelier de vélos électriques a perdu une partie de son stock.', butin: 'vélos électriques', gros: true, vic: ['la gérante', 'à la gérante', 'de la gérante'] },
  { titre: 'Le musée des Moulins', lieu: 'le musée des Moulins', pres: 'du musée des Moulins', texte: 'Des pièces d’une exposition temporaire ont disparu.', butin: 'objets de collection', gros: false, vic: ['la conservatrice', 'à la conservatrice', 'de la conservatrice'] },
  { titre: 'La pharmacie du Petit-Pont', lieu: 'la pharmacie du Petit-Pont', pres: 'de la pharmacie du Petit-Pont', texte: 'La réserve d’une pharmacie a été visitée.', butin: 'matériel médical', gros: false, vic: ['le pharmacien', 'au pharmacien', 'du pharmacien'] },
  { titre: 'Le chantier des Hauts-Prés', lieu: 'le chantier des Hauts-Prés', pres: 'du chantier des Hauts-Prés', texte: 'Le conteneur d’un chantier a été vidé pendant la nuit.', butin: 'outillage professionnel', gros: true, vic: ['le chef de chantier', 'au chef de chantier', 'du chef de chantier'] },
  { titre: 'La salle des ventes', lieu: 'la salle des ventes', pres: 'de la salle des ventes', texte: 'Des lots ont disparu la veille d’une vente aux enchères.', butin: 'tableaux et bibelots', gros: false, vic: ['la commissaire-priseuse', 'à la commissaire-priseuse', 'de la commissaire-priseuse'] },
  { titre: 'Le magasin de la gare', lieu: 'la boutique de la gare', pres: 'de la boutique de la gare', texte: 'Une boutique de téléphonie a été vidée en quelques minutes.', butin: 'smartphones neufs', gros: false, vic: ['le patron', 'au patron', 'du patron'] },
];
const PRENOMS = [['Kevin', 0], ['Julie', 1], ['Marc', 0], ['Sarah', 1], ['Thomas', 0], ['Nadia', 1], ['Olivier', 0], ['Laura', 1], ['Mehdi', 0], ['Céline', 1], ['Yannick', 0], ['Sophie', 1], ['Bruno', 0], ['Inès', 1], ['Cédric', 0], ['Aurélie', 1], ['Ludovic', 0], ['Fatima', 1]];
const NOMS = ['Dubois', 'Moreau', 'Lambert', 'Petit', 'Renard', 'Janssens', 'Leclercq', 'Dupont', 'Maes', 'Willems', 'Lemaire', 'Hermans', 'Claes', 'Mertens', 'Delvaux', 'Collard', 'Gilson', 'Hanquet'];
// Lien avec la victime (public) : il suggère des moyens, sans rien prouver.
const ROLES = [
  { m: 'ancien employé', f: 'ancienne employée', detail: (f) => `${f ? 'partie' : 'parti'} il y a six mois`, proche: true },
  { m: 'agent d’entretien', f: 'agente d’entretien', detail: () => 'fait le ménage trois soirs par semaine', proche: true },
  { m: 'technicien de la société d’alarme', f: 'technicienne de la société d’alarme', detail: () => 'a installé le système l’an dernier', proche: true, tech: true },
  { m: 'livreur attitré', f: 'livreuse attitrée', detail: () => 'passe chaque matin en camionnette', proche: true },
  { m: 'associé minoritaire', f: 'associée minoritaire', detail: () => 'ne vient presque plus', proche: true },
  { m: 'voisin', f: 'voisine', detail: () => 'habite juste au-dessus' },
  { m: 'client régulier', f: 'cliente régulière', detail: () => 'passe presque chaque semaine' },
  { m: 'concurrent', f: 'concurrente', detail: () => 'tient un commerce semblable deux rues plus loin' },
  { m: 'intérimaire', f: 'intérimaire', detail: () => 'a fait un remplacement de trois semaines le mois dernier', proche: true },
];
const VEHICULES = [
  { t: 'une petite citadine', gros: false }, { t: 'un scooter', gros: false }, { t: 'un break', gros: false },
  { t: 'la camionnette de son employeur', gros: true }, { t: 'une moto', gros: false }, { t: 'pas de voiture (vélo et bus)', gros: false, rien: true },
];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const voy = (s) => /^[aeiouéèêh]/i.test(s);
const queN = (n) => (voy(n) ? `qu’${n}` : `que ${n}`);
const deN = (n) => (voy(n) ? `d’${n}` : `de ${n}`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Lieux d'alibi « sociaux » : une preuve peut les confirmer, en tout ou en partie.
const ALIBIS = [
  { lieu: 'au cinéma Le Palace', preuve: 'les caméras du cinéma', trace: 'Ticket de sortie du parking du cinéma' },
  { lieu: 'au restaurant Le Relais', preuve: 'le paiement par carte et le serveur', trace: 'Paiement de l’addition par carte' },
  { lieu: 'à l’entraînement de mini-foot', preuve: 'le badge de la salle de sport', trace: 'Badge scanné à la salle de sport' },
  { lieu: 'au travail, à l’usine', preuve: 'le registre de pointage', trace: 'Pointage à l’usine' },
  { lieu: 'chez ses parents, à l’autre bout de la ville', preuve: 'le bornage de son GSM et un voisin', trace: 'Dernier bornage de son GSM chez ses parents' },
  { lieu: 'au bowling du Zoning', preuve: 'les caméras du bowling', trace: 'Fin de la réservation de piste au bowling' },
  { lieu: 'à l’anniversaire d’un collègue', preuve: 'les photos de la soirée et trois invités', trace: 'Photo horodatée de l’anniversaire' },
];
// Alibis solitaires : personne pour les confirmer. `voiture` : seulement pour qui en a une.
const SOLITAIRES = [
  { t: (f) => `${f ? 'seule' : 'seul'} chez ${f ? 'elle' : 'lui'}, devant la télévision` },
  { t: () => 'en promenade à pied, sans son téléphone' },
  { t: (f) => `${f ? 'couchée' : 'couché'} tôt, avec un mal de tête` },
  { t: () => 'en voiture, à rouler pour se changer les idées', voiture: true },
];

// Planques (pour la traque).
const PLANQUES = [
  { nom: 'Péniche amarrée', lieu: 'Quai du Canal', humidite: 'humide', temperature: 'froid', rive: 'sud', acces: 'à pied' },
  { nom: 'Cave du bistrot', lieu: 'Grand-Place', humidite: 'humide', temperature: 'tempéré', rive: 'nord', acces: 'à pied' },
  { nom: 'Box de garage n° 12', lieu: 'Quartier Gare', humidite: 'sec', temperature: 'froid', rive: 'sud', acces: 'véhicule' },
  { nom: 'Lavoir couvert', lieu: 'Les Moulins', humidite: 'humide', temperature: 'tempéré', rive: 'sud', acces: 'véhicule' },
  { nom: 'Ancien cinéma', lieu: 'Les Filatures', humidite: 'sec', temperature: 'tempéré', rive: 'sud', acces: 'véhicule' },
  { nom: 'Serre abandonnée', lieu: 'Cité Jardin', humidite: 'humide', temperature: 'chaud', rive: 'sud', acces: 'véhicule' },
  { nom: 'Entrepôt frigorifique', lieu: 'Zoning Nord', humidite: 'sec', temperature: 'froid', rive: 'nord', acces: 'véhicule' },
  { nom: 'Grenier d’une ferme', lieu: 'Hauts-Prés', humidite: 'sec', temperature: 'chaud', rive: 'nord', acces: 'véhicule' },
  { nom: 'Local de chaufferie', lieu: 'Cité Nouvelle', humidite: 'sec', temperature: 'chaud', rive: 'sud', acces: 'à pied' },
  { nom: 'Parking souterrain', lieu: 'Place des Martyrs', humidite: 'humide', temperature: 'froid', rive: 'nord', acces: 'véhicule' },
  { nom: 'Atelier désaffecté', lieu: 'Les Tanneurs', humidite: 'sec', temperature: 'tempéré', rive: 'nord', acces: 'véhicule' },
  { nom: 'Cabanon de jardin', lieu: 'Val-Fleuri', humidite: 'sec', temperature: 'tempéré', rive: 'sud', acces: 'à pied' },
  { nom: 'Galerie de l’ancienne mine', lieu: 'Terrils', humidite: 'humide', temperature: 'froid', rive: 'nord', acces: 'à pied' },
  { nom: 'Chambre sous les toits', lieu: 'Le Béguinage', humidite: 'sec', temperature: 'chaud', rive: 'nord', acces: 'à pied' },
  { nom: 'Laverie fermée', lieu: 'Porte Sud', humidite: 'humide', temperature: 'chaud', rive: 'sud', acces: 'à pied' },
];
const ATTRS_P = ['humidite', 'temperature', 'rive', 'acces'];
const MOY = ['cle', 'code', 'volume'];
const MOB = ['argent', 'vengeance', 'commande'];

function pairs(arr) { const out = []; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]); return out; }
function nbCompatibles(items, cible, attrs) { return items.filter((x) => attrs.every((a) => x[a] === cible[a])).length; }
function bonneDifficulte(items, cible, attrs, strict = true) {
  if (nbCompatibles(items, cible, attrs) !== 1) return false;
  if (!attrs.every((a) => nbCompatibles(items, cible, [a]) < items.length)) return false;
  if (!strict) return attrs.every((a) => nbCompatibles(items, cible, [a]) >= 2);
  return pairs(attrs).every((p) => nbCompatibles(items, cible, p) >= 2);
}

// ─────────────────────────────── Génération ───────────────────────────────

const cache = new Map();

/** Affaire n° `n` de la partie. */
export function genererAffaire(seed, n) {
  const key = `${seed}#${n}`;
  if (cache.has(key)) return cache.get(key);
  const rng = makeRng(`${seed}:enquete2:${n}`);
  const modele = AFFAIRES[(n - 1 + rng.int(0, AFFAIRES.length - 1)) % AFFAIRES.length];
  const [vic, aVic, deVic] = modele.vic;

  // Ce qu'il fallait pour commettre les faits.
  const req = {
    moy: rng.pick(modele.gros ? MOY : ['cle', 'code']),
    mob: rng.pick(MOB),
  };
  const heure = 21 * 60 + 40 + 5 * rng.int(0, 8);           // entrée
  const fin = heure + 5 * rng.int(3, 6);                    // sortie
  const annonce = Math.round(heure / 30) * 30;              // « vers 22:00 » à l'ouverture

  // Suspects : le coupable a les trois ; chaque innocent en rate un, et un seul.
  const prenoms = rng.shuffle(PRENOMS), noms = rng.shuffle(NOMS), roles = rng.shuffle(ROLES);
  const manques = rng.shuffle(['mob', 'moy', 'occ', rng.pick(ELEMENTS)]);
  let suspects = [];
  for (let i = 0; i < ENQ.nbSuspects; i++) {
    const [prenom, fem] = prenoms[i];
    const f = !!fem;
    const coupable = i === 0;
    const statut = { mob: true, moy: true, occ: true };
    if (!coupable) statut[manques[i - 1]] = false;
    // Profil complet : l'attribut requis suit le statut, les autres servent de fausses pistes.
    const moy = {}, mob = {};
    for (const a of MOY) moy[a] = a === req.moy ? statut.moy : rng.chance(0.45);
    for (const a of MOB) mob[a] = a === req.mob ? statut.mob : rng.chance(0.45);
    // Un innocent sans le bon mobile (ou moyen) en a souvent un autre : le piège.
    if (!statut.moy) moy[rng.pick(MOY.filter((a) => a !== req.moy))] = true;
    if (!statut.mob) mob[rng.pick(MOB.filter((a) => a !== req.mob))] = true;
    const role = roles[i];
    const vehicule = rng.pick(VEHICULES);
    // Occasion : même loi pour tous ceux qui n'ont pas d'alibi pendant les faits.
    const alibi = { type: statut.occ ? rng.pick(['partiel', 'partiel', 'seul', 'mensonge']) : 'couvre', ...rng.pick(ALIBIS) };
    const voiture = /citadine|break|camionnette/.test(vehicule.t);
    if (alibi.type === 'seul') alibi.solitaire = rng.pick(SOLITAIRES.filter((x) => voiture || !x.voiture)).t(f);
    suspects.push({ nom: `${prenom} ${noms[i]}`, prenom, f, coupable, statut, moy, mob, role: f ? role.f : role.m, roleDetail: role.detail(f), proche: !!role.proche, tech: !!role.tech, vehicule, alibi, rumeur: rng.pick(MOB), age: rng.int(24, 58) });
  }
  // Heures des alibis.
  for (const s of suspects) {
    const a = s.alibi;
    a.ditDe = heure - 5 * rng.int(10, 20); a.ditA = fin + 5 * rng.int(8, 18);
    // La vérification ne confirme jamais toute la soirée : seule l'heure exacte des faits
    // (les caméras) dit si le trou tombe pendant les faits ou non.
    if (a.type === 'couvre') {
      // Toujours ancrée sur une heure déclarée, comme un alibi troué : impossible de les distinguer sans les caméras.
      if (rng.chance(0.5)) { a.de = a.ditDe; a.a = fin + 5 * rng.int(1, 5); } else { a.de = heure - 5 * rng.int(1, 5); a.a = a.ditA; }
    } else if (a.type === 'partiel') {
      if (rng.chance(0.5)) { a.de = a.ditDe; a.a = heure - 5 * rng.int(1, 5); } else { a.de = fin + 5 * rng.int(1, 5); a.a = a.ditA; }
    }
  }
  suspects = rng.shuffle(suspects);
  const coupable = suspects.findIndex((s) => s.coupable);

  // Planques.
  let planques = null;
  let cibleP = rng.pick(PLANQUES);
  for (let essai = 0; essai < 3000 && !planques; essai++) {
    if (essai % 600 === 599) cibleP = rng.pick(PLANQUES);
    const liste = [cibleP, ...rng.shuffle(PLANQUES.filter((p) => p !== cibleP)).slice(0, 5)].map((p) => ({ ...p }));
    if (bonneDifficulte(liste, liste[0], ATTRS_P, essai < 2400)) planques = liste;
  }
  const planqueNom = planques[0].nom;
  planques = rng.shuffle(planques);

  const aff = {
    n, id: `aff${n}`, titre: modele.titre, texte: modele.texte, butin: modele.butin, lieu: modele.lieu, pres: modele.pres,
    vic, aVic, deVic, req, heure, fin, annonce, jourSemaine: rng.pick(JOURS),
    suspects, coupable, planques, planque: planques.findIndex((p) => p.nom === planqueNom),
  };
  const alerte = rng.pick(['le gardien de nuit', `${vic}, ${vic.startsWith('la') ? 'prévenue' : 'prévenu'} par un voisin,`, 'une patrouille de passage', 'un voisin insomniaque']);
  aff.recit = `${modele.texte} Les faits remontent à ${aff.jourSemaine} soir, quelque part entre 21:00 et 23:00 ; c’est ${alerte} qui a donné l’alerte. Butin : ${modele.butin}. Cinq personnes gravitent autour ${modele.pres}, et chacune pourrait avoir fait le coup.`;
  aff.faits = [...ELEMENTS.map((e) => `c:${e}`), ...suspects.flatMap((_, i) => ELEMENTS.map((e) => `${e}:${i}`)), ...ATTRS_P.map((a) => `p:${a}`)];
  aff.textes = {};
  const r2 = makeRng(`${seed}:enquete2:${n}:textes`);
  for (const f of aff.faits) aff.textes[f] = ecrirePiece(aff, f, r2);
  // Rebondissements : au jour 3, une pièce accablante (mais pas décisive) sur n'importe quel suspect,
  // coupable compris ; au jour 5, le butin refait surface.
  const cible = r2.int(0, suspects.length - 1);
  const el = r2.pick(ELEMENTS.filter((e) => suspects[cible].statut[e]));
  aff.rebonds = {
    3: { f: `${el}:${cible}`, titre: `Coup de théâtre : ${suspects[cible].nom} dans le viseur`, texte: `Une information remonte jusqu’au parquet au sujet ${deN(suspects[cible].nom)}. Elle est versée au dossier de toutes les zones.` },
    5: { f: r2.pick(['p:rive', 'p:acces', 'p:temperature']), titre: 'Le butin refait surface', texte: `Une partie du butin (${modele.butin}) est retrouvée abandonnée : elle en dit long sur la planque.` },
  };
  cache.set(key, aff);
  return aff;
}

/** Texte d'une pièce (écrit une fois pour toutes à la génération). */
function ecrirePiece(aff, f, rng) {
  const [k, x] = f.split(':');
  if (k === 'c') return constat(aff, x, rng);
  if (k === 'p') return piecePlanque(aff, x);
  const s = aff.suspects[Number(x)];
  if (k === 'occ') return verifAlibi(aff, s);
  if (k === 'moy') return verifTrois(aff, s, rng, MOY, s.moy, phraseMoyen);
  if (k === 'mob') return verifTrois(aff, s, rng, MOB, s.mob, phraseMobile);
  return '';
}

function constat(aff, e, rng) {
  if (e === 'occ') {
    return rng.pick([
      `Les caméras de la rue montrent une silhouette encapuchonnée entrer dans ${aff.lieu} à ${hm(aff.heure)} et ressortir, chargée, à ${hm(aff.fin)}. Personne d’autre n’entre ni ne sort de la nuit.`,
      `Sur les images de la rue, la porte ${aff.pres} s’ouvre à ${hm(aff.heure)} ; une silhouette ressort à ${hm(aff.fin)} avec des sacs. C’est la seule intrusion de la nuit.`,
    ]);
  }
  if (e === 'moy') {
    return {
      cle: 'Aucune trace d’effraction : la serrure a été ouverte avec une vraie clé, le labo exclut un passe-partout. L’alarme a sonné, mais l’auteur a pris son temps.',
      code: 'Une vitre de service a été brisée, mais l’alarme a été désactivée avec le bon code, du premier essai : l’auteur connaissait le code.',
      volume: `Le butin (${aff.butin}) pèse près de 300 kg et a été emporté en un seul voyage, portes forcées au pied-de-biche : il fallait un véhicule utilitaire.`,
    }[aff.req.moy];
  }
  return {
    argent: `D’après ${aff.vic}, seuls les objets faciles à revendre ont disparu ; des pièces plus chères mais encombrantes sont restées. L’auteur voulait de l’argent, et vite.`,
    vengeance: `Le bureau ${aff.deVic} a été saccagé, sa photo lacérée et des dossiers jetés par terre, sans aucune utilité pour le vol : l’auteur lui en voulait personnellement.`,
    commande: 'Seules des pièces bien précises ont été emportées, comme sur une liste, alors que d’autres plus précieuses étaient à portée de main : un vol sur commande, pour un receleur.',
  }[aff.req.mob];
}

function piecePlanque(aff, a) {
  const p = aff.planques[aff.planque];
  switch (a) {
    case 'humidite': return p.humidite === 'sec' ? 'Une partie du butin a été retrouvée dans un fossé : les emballages sont parfaitement secs, la planque est un lieu sec.' : 'Une partie du butin a été retrouvée dans un fossé : les emballages sentent le moisi, la planque est un lieu humide.';
    case 'temperature':
      if (p.temperature === 'froid') return 'Le labo relève de la condensation sur les emballages : la planque est un lieu froid.';
      if (p.temperature === 'chaud') return 'Les emballages sont déformés par la chaleur : la planque est un lieu chaud.';
      return 'Ni chaleur ni froid sur les emballages : la planque est un lieu tempéré.';
    case 'rive': return `Après les faits, un véhicule chargé est filmé en train de passer un pont vers la rive ${p.rive} : la planque s’y trouve.`;
    case 'acces': return p.acces === 'véhicule' ? 'Un voisin a entendu un véhicule manœuvrer jusqu’à la porte de la planque : elle est accessible en véhicule.' : 'L’auteur a fini le trajet à pied, par une ruelle trop étroite pour un véhicule : la planque n’est accessible qu’à pied.';
    default: return '';
  }
}

/** Ce que le suspect a déclaré (public dès l'ouverture). */
export function declaration(s) {
  const a = s.alibi;
  if (a.type === 'seul') return `dit avoir été ${a.solitaire}, toute la soirée`;
  return `dit avoir été ${a.lieu}, de ${hm(a.ditDe)} à ${hm(a.ditA)}`;
}

function verifAlibi(aff, s) {
  const a = s.alibi, e = s.f ? 'e' : '', il = s.f ? 'elle' : 'il';
  switch (a.type) {
    case 'couvre': case 'partiel': {
      const reste = a.de === a.ditDe && a.a === a.ditA ? '' : ` Pour le reste de la soirée, personne ne peut confirmer ce qu’${il} dit.`;
      return `Alibi vérifié en partie : d’après ${a.preuve}, ${s.nom} était bien ${a.lieu}, de ${hm(a.de)} à ${hm(a.a)}.${reste}`;
    }
    case 'seul': return `Alibi invérifiable : personne ne peut confirmer ${queN(s.nom)} était ${a.solitaire}, et son GSM est resté éteint toute la soirée.`;
    case 'mensonge':
      // Même texte pour le coupable et pour un innocent : un mensonge ne suffit pas à conclure.
      return `Déclaration fausse : ${s.nom} n’était pas ${a.lieu} ; personne ne l’y a vu${e}. Confronté${e} à son mensonge, ${il} refuse de dire où ${il} se trouvait, « pour une affaire personnelle ». Aucun alibi pour la soirée.`;
    default: return '';
  }
}

// Moyens : chaque vérification parle des clés, de l'alarme et du véhicule. Les phrases ne
// concernent que le suspect lui-même (jamais un changement qui vaudrait pour tout le monde).
function phraseMoyen(aff, s, a, v, rng) {
  const il = s.f ? 'elle' : 'il', e = s.f ? 'e' : '';
  const gros = s.vehicule.gros, veh = s.vehicule.rien ? 'un vélo' : s.vehicule.t;
  if (a === 'cle') {
    if (v) return rng.pick([s.proche ? `Clés : ${s.nom} possède un jeu de clés ${aff.pres} et ne l’a jamais rendu.` : `Clés : un double des clés ${aff.pres} a été retrouvé chez ${s.nom}, qui ne sait pas l’expliquer.`, `Clés : un double des clés ${aff.pres} pendait au tableau de l’entrée, chez ${s.nom}.`, ...(s.proche ? [`Clés : ${aff.vic} avait confié un jeu de clés à ${s.nom}, « pour dépanner ».`] : [])]);
    return s.proche ? `Clés : ${s.nom} a rendu son jeu de clés contre signature ; le registre des clés le confirme, aucun double n’a été fait.` : `Clés : ${s.nom} n’a jamais eu de clés ${aff.pres}, ni accès au trousseau.`;
  }
  if (a === 'code') {
    if (v) return s.tech ? `Alarme : ${s.nom} a gardé un code de maintenance depuis l’installation, toujours actif.` : rng.pick([`Alarme : ${s.nom} dispose d’un code personnel, toujours actif selon le journal du boîtier.`, `Alarme : un code d’accès valide est noté dans un carnet retrouvé chez ${s.nom}.`]);
    return s.tech ? `Alarme : ${s.nom} a installé le système, mais son code de maintenance a été supprimé à la réception du chantier ; ${il} n’en a plus aucun.` : `Alarme : ${s.nom} n’a aucun code ; son nom n’apparaît nulle part dans le journal du boîtier.`;
  }
  if (v) return gros ? `Véhicule : la camionnette qu’utilise ${s.nom} était à sa disposition ce soir-là, garée devant chez ${s.f ? 'elle' : 'lui'}.` : `Véhicule : ${s.nom} a loué une camionnette le jour des faits (contrat de location à l’appui), alors qu’${il} n’a qu’${veh}.`;
  return gros ? `Véhicule : la camionnette qu’utilise ${s.nom} était au garage toute la semaine (facture du garagiste), et aucun loueur ne ${s.f ? 'la' : 'le'} connaît.` : `Véhicule : ${s.nom} n’a qu’${veh} et n’a loué aucun véhicule (vérification faite auprès des loueurs de la région).`;
}

// Mobiles : chaque vérification parle d'argent, de rancune et de recel.
function phraseMobile(aff, s, a, v, rng) {
  const e = s.f ? 'e' : '', il = s.f ? 'elle' : 'il';
  const ils = s.f && aff.vic.startsWith('la ') ? 'elles' : 'ils';
  if (a === 'argent') {
    return v ? rng.pick([`Argent : ${s.nom} est criblé${e} de dettes, avec trois crédits en retard et une saisie sur salaire annoncée.`, `Argent : le compte ${deN(s.nom)} est à découvert depuis huit mois ; un huissier est passé la semaine dernière.`])
      : rng.pick([`Argent : les comptes ${deN(s.nom)} sont sains, sans aucune dette et avec une épargne confortable.`, `Argent : ${s.nom} vient d’hériter d’une somme importante ; l’argent n’est pas un souci.`]);
  }
  if (a === 'vengeance') {
    if (v) return rng.pick([`Rancune : après une violente dispute au printemps, ${s.nom} a juré devant témoins de « faire payer » ${aff.vic}.`, `Rancune : ${s.nom} a perdu un procès contre ${aff.vic} l’an dernier et ne s’en est jamais remis${e}, selon ses proches.`]);
    return s.proche ? `Rancune : aucune ; ${s.nom} et ${aff.vic} s’entendent bien, ${ils} ont encore dîné ensemble le mois dernier.` : `Rancune : aucune ; ${s.nom} et ${aff.vic} se connaissent à peine.`;
  }
  return v ? rng.pick([`Recel : la téléphonie montre trois appels entre ${s.nom} et un receleur connu, la semaine des faits.`, `Recel : ${s.nom} échange des messages avec un receleur fiché, qui lui passe des « listes de courses ».`])
    : rng.pick([`Recel : aucun contact avec le milieu du recel, ni dans la téléphonie ni dans l’entourage ${deN(s.nom)}.`, `Recel : rien ne relie ${s.nom} à un receleur, ni appels, ni messages, ni annonces en ligne.`]);
}

/** Vérification sur un suspect : les trois pistes, dans le même ordre pour tous. */
function verifTrois(aff, s, rng, liste, profil, phrase) {
  return liste.map((a) => phrase(aff, s, a, profil[a], rng)).join('\n');
}

// ─────────────────────────────── Lecture ───────────────────────────────

/** Fiche publique d'un suspect : lien avec la victime, véhicule, déclaration, rumeur. */
export function ficheSuspect(aff, s) {
  const rum = {
    argent: s.f ? 'on la dit endettée' : 'on le dit endetté',
    vengeance: `on dit qu’${s.f ? 'elle' : 'il'} s’est disputé${s.f ? 'e' : ''} avec ${aff.vic}`,
    commande: s.f ? 'on l’a vue traîner avec un revendeur' : 'on l’a vu traîner avec un revendeur',
  }[s.rumeur];
  return { lien: `${cap(s.role)}, ${s.age} ans · ${s.roleDetail}`, vehicule: `Véhicule : ${s.vehicule.t}`, declaration: `${cap(declaration(s))}.`, rumeur: `Rumeur : ${rum}.` };
}
export function fichePlanque(p) {
  return `${p.lieu} · rive ${p.rive} · lieu ${p.humidite} et ${p.temperature} · accès ${p.acces === 'véhicule' ? 'en véhicule' : 'à pied seulement'}`;
}

/** Titre court d'une pièce. */
export function titrePiece(aff, f) {
  const [k, x] = f.split(':');
  if (k === 'c') return { occ: 'Constatations · l’heure exacte', moy: 'Constatations · comment on est entré', mob: 'Constatations · pourquoi on a volé' }[x];
  if (k === 'p') return 'Planque · indice sur le butin';
  const s = aff.suspects[Number(x)];
  return `${{ occ: 'Alibi', moy: 'Moyens', mob: 'Mobile' }[k]} · ${s ? s.nom : '?'}`;
}
export function texteFait(aff, f) { return (aff.textes && aff.textes[f]) || ''; }

/**
 * Suspects qu'on ne peut pas encore écarter avec ces pièces, en raisonnant
 * comme un enquêteur : une vérification n'écarte quelqu'un que si l'on connaît
 * aussi la constatation correspondante.
 */
export function candidats(aff, faits) {
  const connus = new Set(faits);
  const p0 = aff.planques[aff.planque];
  const aP = ATTRS_P.filter((a) => connus.has(`p:${a}`));
  return {
    suspects: aff.suspects.map((s, i) => i).filter((i) => ELEMENTS.every((e) => !(connus.has(`c:${e}`) && connus.has(`${e}:${i}`) && !aff.suspects[i].statut[e]))),
    planques: aff.planques.map((p, i) => i).filter((i) => aP.every((a) => aff.planques[i][a] === p0[a])),
  };
}

// ─────────────────────────────── Cellules ───────────────────────────────

/** Cellule d'une zone sur l'affaire en cours (0 s'il n'y en a qu'une). */
export function celluleDe(state, uid) {
  const e = state.enquete;
  if (!e || !e.nbCellules || e.nbCellules <= 1) return 0;
  if (e.cellules && uid in e.cellules) return e.cellules[uid];
  return hashString(`${state.seed}:${e.n}:${uid}`) % e.nbCellules;
}
export const celluleSuspect = (state, i) => (state.enquete && state.enquete.nbCellules > 1 ? i % state.enquete.nbCellules : 0);
/**
 * Cellules qui suivent un suspect. Chaque cellule a au moins deux suspects : avec 3 cellules et 5 suspects,
 * la troisième (qui n'en aurait qu'un) suit aussi un suspect d'une autre cellule, qui est alors suivi à deux.
 */
export function cellulesSuspect(state, i) {
  const e = state.enquete;
  const nb = e && e.nbCellules > 1 ? e.nbCellules : 1;
  if (nb <= 1) return [0];
  const out = [i % nb];
  const tous = [...Array(ENQ.nbSuspects).keys()];
  const de = (c) => tous.filter((k) => k % nb === c);
  for (let c = 0; c < nb; c++) {
    if (de(c).length >= 2 || c === i % nb) continue;
    // Suspect « partagé » : le second suspect d'une cellule qui en a deux, en alternant d'une affaire à l'autre.
    const partageables = tous.filter((k) => k >= nb && de(k % nb).length >= 2);
    if (partageables.length && i === partageables[(e.n || 0) % partageables.length]) out.push(c);
  }
  return out;
}
export const dansMaCellule = (state, uid, i) => cellulesSuspect(state, i).includes(celluleDe(state, uid));

/** Coût d'une démarche pour cette zone (double pour un suspect d'une autre cellule). */
export function coutDemarche(state, uid, x) {
  const d = lireDemarche(x);
  if (!d) return 0;
  if (d.i !== null && !dansMaCellule(state, uid, d.i)) return d.dm.cout * ENQ.surcoutHorsCellule;
  return d.dm.cout;
}

/** Zones qui suivent ce suspect (même cellule). */
export function zonesDuSuspect(state, i) {
  const cs = cellulesSuspect(state, i);
  return Object.values(state.zones || {}).filter((z) => cs.includes(celluleDe(state, z.uid))).map((z) => z.uid);
}

// ─────────────────────────────── Dossiers ───────────────────────────────

const pieceOuverture = () => ({ f: 'p:humidite', j: 1, src: 'ouverture' });

/** Dossier d'enquête d'une zone pour l'affaire en cours (sans modifier la zone). */
export function dossierDe(state, z) {
  const e = state.enquete;
  if (!e) return null;
  if (z.enquete && z.enquete.n === e.n && z.enquete.v === ENQ_VERSION) return z.enquete;
  const base = { n: e.n, v: ENQ_VERSION, pieces: [pieceOuverture()], accuse: null, exclu: false };
  // Une zone qui arrive en cours d'affaire reçoit aussi les rebondissements déjà publiés.
  for (const r of e.rebonds || []) if (!base.pieces.some((p) => p.f === r.f)) base.pieces.push({ f: r.f, j: r.j, src: 'rebond' });
  return base;
}

/**
 * Zones qui ont déjà reçu cette pièce par partage (de `uid` ou d'une autre zone), ou qui l'ont donnée à `uid`.
 * Calculé à partir des dossiers : juste, même pour les partages faits avant cette fonction.
 */
export function dejaPartagee(state, uid, f) {
  const out = new Set();
  const moi = state.zones[uid];
  const mienne = moi && dossierDe(state, moi) && dossierDe(state, moi).pieces.find((p) => p.f === f);
  if (mienne && mienne.src === 'partage' && mienne.de) out.add(mienne.de);
  for (const z of Object.values(state.zones)) {
    if (z.uid === uid) continue;
    const d = dossierDe(state, z);
    // Reçue par partage (de moi ou d'un collègue) : l'info circule déjà, inutile de la renvoyer.
    if (d && d.pieces.some((p) => p.f === f && p.src === 'partage')) out.add(z.uid);
  }
  return out;
}

/** Pièces d'une zone sur l'affaire n (en cours ou précédente, pour la traque). */
export function dossierAffaire(state, z, n) {
  if (state.enquete && state.enquete.n === n) return dossierDe(state, z);
  if (z.enquetePrecedente && z.enquetePrecedente.n === n) return z.enquetePrecedente;
  return { n, v: ENQ_VERSION, pieces: [pieceOuverture()], accuse: null, exclu: false };
}

export function faitsConnus(dossier) { return dossier ? dossier.pieces.map((p) => p.f) : []; }

/** Pièce qu'apporterait une démarche (null si elle n'apporte plus rien). */
export function pieceDemarche(aff, dossier, x) {
  const d = lireDemarche(x);
  if (!d) return null;
  const connus = new Set(faitsConnus(dossier));
  if (d.dm.scene) {
    for (const f of [`c:${d.dm.scene}`, d.dm.planque]) if (!connus.has(f)) return f;
    return null;
  }
  const f = `${d.dm.cible}:${d.i}`;
  return connus.has(f) ? null : f;
}
export function demarcheUtile(dossier, x, aff) { return !!pieceDemarche(aff, dossier, x); }

/** Le fin mot de l'affaire, publié dans la Gazette à la clôture. */
export function recitFinal(aff) {
  const s = aff.suspects[aff.coupable], p = aff.planques[aff.planque];
  const il = s.f ? 'elle' : 'il', e = s.f ? 'e' : '';
  const mobile = { argent: `criblé${e} de dettes`, vengeance: `rongé${e} de rancune envers ${aff.vic}`, commande: `payé${e} par un receleur` }[aff.req.mob];
  const moyen = { cle: `est entré${e} avec une clé qu’${il} n’aurait jamais dû avoir`, code: `a coupé l’alarme avec le code qu’${il} connaissait`, volume: 'a tout emporté en un voyage grâce à un utilitaire' }[aff.req.moy];
  const occ = { partiel: 'son alibi avait un trou pile au moment des faits', seul: 'personne ne pouvait confirmer son alibi', mensonge: 'son alibi était un mensonge' }[s.alibi.type] || '';
  const innocents = aff.suspects.filter((x) => !x.coupable).map((x) => {
    const manque = ELEMENTS.find((el) => !x.statut[el]);
    return `${x.nom} (${{ mob: 'pas le bon mobile', moy: 'aucun moyen d’agir ainsi', occ: 'un alibi solide pendant les faits' }[manque]})`;
  });
  return `À ${hm(aff.heure)}, ${s.nom}, ${s.role} ${mobile}, ${moyen} ; ${occ}. ${cap(il)} a caché le butin dans la planque « ${p.nom} » (${p.lieu}). Les autres étaient innocents : ${innocents.join(', ')}.`;
}

/** Cellules : les zones actives sont réparties en 1 à 3 groupes (au moins deux zones chacun), chacun chargé de certains suspects. */
function repartirCellules(state) {
  const e = state.enquete;
  const actives = Object.values(state.zones).filter((z) => (z.toursSansOrdres || 0) < 3).map((z) => z.uid).sort();
  // Au moins deux zones par cellule : 1 cellule jusqu'à 3 zones, 2 de 4 à 6, 3 à partir de 7.
  const nb = Math.max(1, Math.min(ENQ.maxCellules, actives.length <= 3 ? 1 : actives.length <= 6 ? 2 : 3));
  const ordre = makeRng(`${state.seed}:cellules:${e.n}`).shuffle(actives);
  e.nbCellules = nb;
  e.cellules = Object.fromEntries(ordre.map((u, k) => [u, k % nb]));
}

export function nouvelleAffaire(state) {
  const n = (state.enqueteSeq || 0) + 1;
  state.enqueteSeq = n;
  state.enqueteV = ENQ_VERSION;
  state.enquete = { n, jour: 1, nbCellules: 1, cellules: {}, rebonds: [], figee: false };
  repartirCellules(state);
  for (const z of Object.values(state.zones)) {
    if (z.enquete && z.enquete.n === n - 1) z.enquetePrecedente = z.enquete; // gardée pour la traque
    z.enquete = dossierDe(state, z);
  }
  return genererAffaire(state.seed, n);
}

const nomZone = (z) => `ZP ${z.code} ${z.nom}`;

/**
 * Avant la simulation des zones : partages, accusations, traques.
 * Renvoie les agents prélevés par zone et le résultat du jour.
 */
export function enquetePre(state, uids, ord, push) {
  // Ancienne version de l'enquête : on repart sur une affaire neuve.
  if (state.enquete && state.enqueteV !== ENQ_VERSION) {
    state.traques = [];
    for (const z of Object.values(state.zones)) { delete z.enquete; delete z.enquetePrecedente; }
    state.enquete = null;
  }
  if (!state.enquete) nouvelleAffaire(state);
  const e = state.enquete;
  // Tant que personne n'a encore joué sur cette affaire, la répartition suit les arrivées.
  if (!e.figee) { repartirCellules(state); if (uids.length) e.figee = true; }
  const aff = genererAffaire(state.seed, e.n);
  const prises = {};
  const prendre = (u, s, n) => { prises[u] = prises[u] || {}; prises[u][s] = (prises[u][s] || 0) + n; };
  for (const u of uids) state.zones[u].enquete = dossierDe(state, state.zones[u]);
  const res = { actifs: uids.length, n: e.n, titre: aff.titre, jour: e.jour, decouverte: null, arrestations: [], fuites: [], classee: false };

  // Partages : reçus le soir même. Chaque zone ne peut traiter que ENQ.maxRecus pièces partagées par soir :
  // dans une grande partie, celle qui collecte tout n'a pas d'avantage, et chaque envoi compte.
  // Priorité aux envois qui lui sont adressés personnellement, puis aux envois « à tous », dans un ordre tiré au sort.
  const envois = [];
  const nonEnvoyees = {};
  for (const u of uids) {
    const z = state.zones[u];
    const mes = new Set(faitsConnus(z.enquete));
    for (const p of (ord[u].partages || []).slice(0, ENQ.maxPartages)) {
      if (!mes.has(p.f) || p.f === 'p:humidite') continue;
      const dests = p.a === '*' ? uids.filter((x) => x !== u) : (uids.includes(p.a) && p.a !== u ? [p.a] : []);
      for (const d of dests) envois.push({ u, d, f: p.f, direct: p.a !== '*' });
    }
  }
  const ordreTirage = makeRng(`${state.seed}:s${state.season}:t${state.turn}:partages`);
  const aleaPos = Object.fromEntries(ordreTirage.shuffle(uids.slice()).map((x, k) => [x, k]));
  const livrees = []; // { u, d, f }
  for (const d of uids) {
    const dz = state.zones[d];
    const pour = envois.filter((x) => x.d === d);
    if (!pour.length) continue;
    // Ordre de traitement : envois personnels d'abord, puis une pièce par expéditeur à tour de rôle (ordre tiré au sort).
    const pos = Object.fromEntries(makeRng(`${state.seed}:s${state.season}:t${state.turn}:partages:${d}`).shuffle(uids.slice()).map((x, k2) => [x, k2]));
    const rangEnvoi = {};
    const tries = pour.slice().sort((a, b) => aleaPos[a.u] - aleaPos[b.u]).map((x) => ({ ...x, r: (rangEnvoi[x.u] = (rangEnvoi[x.u] || 0) + 1) }));
    const parPiece = new Map();
    for (const x of tries.sort((a, b) => (b.direct - a.direct) || a.r - b.r || pos[a.u] - pos[b.u])) {
      if (dz.enquete.pieces.some((y) => y.f === x.f)) { if (x.direct) (nonEnvoyees[x.u] ||= []).push(`« ${titrePiece(aff, x.f)} » (${nomZone(dz)} l’avait déjà)`); continue; }
      if (!parPiece.has(x.f)) parPiece.set(x.f, []);
      parPiece.get(x.f).push(x);
    }
    let k = 0, debord = 0;
    for (const [f, l] of parPiece) {
      if (k >= ENQ.maxRecus) { debord += 1; for (const x of l) if (x.direct) (nonEnvoyees[x.u] ||= []).push(`« ${titrePiece(aff, f)} » (${nomZone(dz)} a déjà reçu ${ENQ.maxRecus} pièces ce soir)`); continue; }
      k += 1;
      dz.enquete.pieces.push({ f, j: e.jour, src: 'partage', de: l[0].u });
      dz.rapport.push(`Enquête : ${l.map((x) => nomZone(state.zones[x.u])).join(' et ')} ${l.length > 1 ? 'te transmettent' : 'te transmet'} une pièce (« ${titrePiece(aff, f)} »).`);
      for (const x of l) livrees.push({ u: x.u, d, f });
    }
    if (debord) dz.rapport.push(`Enquête : ${debord} autre${debord > 1 ? 's' : ''} pièce${debord > 1 ? 's' : ''} partagée${debord > 1 ? 's' : ''} t’attendai${debord > 1 ? 'en' : ''}t ; tes enquêteurs n’en traitent que ${ENQ.maxRecus} par soir. ${debord > 1 ? 'Elles pourront' : 'Elle pourra'} être renvoyée${debord > 1 ? 's' : ''} demain.`);
  }
  // Récompense par pièce transmise (une pièce envoyée à tout le district compte une fois).
  for (const u of uids) {
    const z = state.zones[u];
    const mien = livrees.filter((x) => x.u === u);
    const pieces = [...new Set(mien.map((x) => x.f))];
    const transmises = pieces.map((f) => { const ds = mien.filter((x) => x.f === f).map((x) => x.d); return `« ${titrePiece(aff, f)} » à ${ds.length > 1 ? `${ds.length} zones` : nomZone(state.zones[ds[0]])}`; });
    const n = transmises.length;
    if (n) {
      z._psEntraide = (z._psEntraide || 0) + 5 * n; z.stats.indicesPartages += n; z.reputation += n;
      z.rapport.push(`Enquête : ${n} pièce${n > 1 ? 's' : ''} transmise${n > 1 ? 's' : ''} : ${transmises.join(' ; ')} (+${5 * n} PS, +${n} de réputation).`);
    }
    if (nonEnvoyees[u] && nonEnvoyees[u].length) z.rapport.push(`Enquête : pas transmise${nonEnvoyees[u].length > 1 ? 's' : ''} : ${nonEnvoyees[u].join(' ; ')}.`);
  }

  // Audition de la victime : deux agents de Recherche pris pour la journée.
  for (const u of uids) if ((ord[u].demarches || []).includes('temoin')) prendre(u, 'recherche', DEMARCHES.temoin.agents);

  // Accusations (une seule par affaire et par zone).
  const justes = [];
  for (const u of uids) {
    const z = state.zones[u], d = z.enquete;
    const a = ord[u].accusation;
    if (a === null || a === undefined || d.exclu || d.accuse !== null) continue;
    if (!(a >= 0 && a < aff.suspects.length)) continue;
    d.accuse = a;
    if (a === aff.coupable) justes.push(u);
    else {
      d.exclu = true; z.reputation -= 3;
      z.rapport.push(`Enquête : accusation ${deN(aff.suspects[a].nom)} rejetée par le parquet. Plus d’accusation possible sur cette affaire (−3 de réputation). Tu peux encore aider les autres en partageant tes pièces.`);
      push(6, 'Enquête', `Fausse piste pour ${nomZone(z)}`, `${aff.suspects[a].nom} est mis${aff.suspects[a].f ? 'e' : ''} hors de cause dans « ${aff.titre} ».`, u);
    }
  }
  if (justes.length) {
    const pts = pointsDecouverte(e.jour);
    const contributeurs = new Set();
    const cs = aff.suspects[aff.coupable];
    for (const u of justes) {
      const z = state.zones[u];
      z.stats.limier += pts; z.stats.decouvertes += 1; z._decouverteJour = true; z._points += 8; z._ps += 15; z.satisfaction += 3;
      z.rapport.push(`Enquête : bien vu, ${cs.nom} est l’auteur des faits (+${pts} pts d’enquête).`);
      for (const p of z.enquete.pieces) if (p.de && !justes.includes(p.de)) contributeurs.add(p.de);
    }
    for (const c of contributeurs) {
      const z = state.zones[c];
      if (!z) continue;
      z.stats.limier += POINTS.contribution; z._psEntraide = (z._psEntraide || 0) + 8;
      z.rapport.push(`Enquête : tes pièces ont aidé à identifier l’auteur (+${POINTS.contribution} pts d’enquête).`);
    }
    res.recit = recitFinal(aff);
    res.decouverte = { suspect: cs.nom, zones: justes.map((u) => nomZone(state.zones[u])), uids: justes, pts, contributeurs: [...contributeurs].map((u) => nomZone(state.zones[u])), contribUids: [...contributeurs] };
    push(14, 'Enquête', `${aff.titre} : ${cs.nom} identifié${cs.f ? 'e' : ''} par ${res.decouverte.zones.join(' et ')}`,
      `Mandat d’arrêt délivré. ${cs.f ? 'Elle' : 'Il'} se cache : la traque commence, 2 tours pour l’arrêter.${res.decouverte.contributeurs.length ? ` Avec les pièces de ${res.decouverte.contributeurs.join(', ')}.` : ''}`);
  }

  // Traques en cours : interpellations.
  for (const tr of state.traques || []) {
    const a = genererAffaire(state.seed, tr.n);
    const gagnants = [];
    for (const u of uids) {
      const t = ord[u].traque;
      if (!t || t.n !== tr.n) continue;
      const dispo = ((ord[u].alloc && ord[u].alloc.intervention) || 0) + (ord[u]._libres || 0); // agents sans affectation d'abord
      const n = Math.min(t.agents, dispo);
      if (n <= 0) continue;
      prendre(u, 'intervention', n);
      const z = state.zones[u];
      const lieu = a.planques[t.planque] ? a.planques[t.planque].nom : 'un lieu inconnu';
      if (n < ENQ.agentsTraque) { z.rapport.push(`Traque : ${n} agents à ${lieu}, trop peu pour une interpellation (${ENQ.agentsTraque} minimum).`); continue; }
      if (t.planque === a.planque) gagnants.push({ u, n });
      else z.rapport.push(`Traque : ${lieu} fouillé avec ${n} agents, personne.`);
    }
    const s = a.suspects[a.coupable];
    if (gagnants.length) {
      for (const { u } of gagnants) {
        const z = state.zones[u];
        z.stats.limier += POINTS.arrestation; z.stats.arrestations += 1;
        z._points += 6; z.budget += 4; (z._compta ||= []).push({ k: 'prime', l: 'Prime d’arrestation', v: 4 }); z.satisfaction += 5; z.reputation += 3; z._ps += 10;
        z.rapport.push(`Traque : ${s.nom} arrêté${s.f ? 'e' : ''} à ${a.planques[a.planque].nom} (+${POINTS.arrestation} pts d’enquête, prime de 4 k€).`);
      }
      const noms = gagnants.map((g) => nomZone(state.zones[g.u]));
      res.arrestations.push({ titre: a.titre, suspect: s.nom, planque: a.planques[a.planque].nom, zones: noms });
      // Le procès : les zones qui ont trouvé ou apporté des pièces sont citées à la barre.
      const temoins = [...new Set([...(tr.decouvreurs || []), ...(tr.contributeurs || [])])].filter((u) => state.zones[u]).map((u) => nomZone(state.zones[u]));
      const pr = makeRng(`${state.seed}:proces:${tr.n}`);
      const peine = pr.pick(PEINES).replace('condamné·e', s.f ? 'condamnée' : 'condamné');
      (res.proces ||= []).push({ titre: a.titre, suspect: s.nom, peine, temoins, arrestation: noms, mobile: a.suspects[a.coupable].rumeur || '' });
      push(13, 'Au tribunal', `${s.nom} ${peine}`, `Affaire « ${a.titre} ». ${temoins.length ? `À la barre, les enquêteurs de ${temoins.join(', ')}.` : ''} Interpellation par ${noms.join(' et ')}.`);
      push(15, 'Arrestation', `${s.nom} arrêté${s.f ? 'e' : ''} à ${a.planques[a.planque].nom}`, `Interpellation menée par ${noms.join(' et ')}. Affaire « ${a.titre} » bouclée.`);
      tr.fini = true;
    } else if (tr.tours <= 1) {
      res.fuites.push({ titre: a.titre, suspect: s.nom, planque: a.planques[a.planque].nom });
      push(9, 'Traque', `${s.nom} a pris la fuite`, `${s.f ? 'Elle' : 'Il'} se cachait à ${a.planques[a.planque].nom}. Personne n’est venu ${s.f ? 'la' : 'le'} chercher à temps.`);
      tr.fini = true;
    }
  }
  return { prises, res };
}

/** Pendant la simulation d'une zone : démarches payées et résultats, enquête de voisinage. */
export function enqueteZone(state, z, o, zr, capa, pre) {
  if (!state.enquete || pre.res.decouverte) {
    if ((o.demarches || []).length && pre.res.decouverte) z.rapport.push('Enquête : l’affaire est résolue, tes démarches sont annulées.');
    return;
  }
  const e = state.enquete;
  const aff = genererAffaire(state.seed, e.n);
  const d = z.enquete;
  // Pièces retardées par un dégât des eaux : elles arrivent ce soir (si l'affaire est la même).
  if (z.enqueteDiffere && z.enqueteDiffere.length) {
    const arrivees = z.enqueteDiffere.filter((x) => x.n === e.n && !faitsConnus(d).includes(x.f));
    for (const x of arrivees) d.pieces.push({ f: x.f, j: e.jour, src: x.src });
    if (arrivees.length) z.rapport.push(`Enquête : les pièces retardées par le dégât des eaux arrivent (${arrivees.map((x) => `« ${titrePiece(aff, x.f)} »`).join(', ')}).`);
    z.enqueteDiffere = [];
  }
  const faites = [];
  for (const x of (o.demarches || []).slice(0, ENQ.maxDemarches)) {
    const dm = lireDemarche(x);
    const f = dm && pieceDemarche(aff, d, x);
    if (!f) continue;
    const cout = coutDemarche(state, z.uid, x);
    if (z.budget < cout) { faites.push(`${dm.dm.nom} refusée (budget insuffisant)`); continue; }
    z.budget -= cout;
    if (cout) (z._compta ||= []).push({ k: 'enquete', l: 'Démarches d’enquête', v: -cout });
    if (z._retardEnquete) { (z.enqueteDiffere ||= []).push({ f, n: e.n, src: dm.k }); faites.push(`« ${titrePiece(aff, f)} » (retardée d’un tour)`); continue; }
    d.pieces.push({ f, j: e.jour, src: dm.k });
    faites.push(`« ${titrePiece(aff, f)} »`);
  }
  if (faites.length) z.rapport.push(`Enquête : au dossier ce soir : ${faites.join(', ')}.`);
  // Enquête de voisinage : plus on a de capacité de Recherche, plus elle rapporte ; une piste prioritaire la concentre.
  const piste = Number.isInteger(o.piste) && o.piste >= 0 && o.piste < aff.suspects.length ? o.piste : null;
  const surPiste = piste !== null && aff.faits.some((f) => !faitsConnus(d).includes(f) && !f.startsWith('p:') && !f.startsWith('c:') && Number(f.split(':')[1]) === piste);
  const attendu = chanceVoisinage(state, z.uid, capa.recherche * (1 + bonusEquip(z, 'recherche', 'enquete')), surPiste ? piste : null);
  const nb = Math.floor(attendu) + (zr.chance(attendu % 1) ? 1 : 0);
  const trouvees = [];
  for (let k = 0; k < nb; k++) {
    const f = (surPiste && pieceSur(aff, d, piste, zr)) || pieceHasard(state, z, aff, zr);
    if (!f) break;
    d.pieces.push({ f, j: e.jour, src: 'voisinage' }); trouvees.push(`« ${titrePiece(aff, f)} »`);
    z._points += VOISINAGE.pointsParPiece;
  }
  if (trouvees.length) z.rapport.push(`Enquête de voisinage${surPiste ? ` (piste ${aff.suspects[piste].prenom})` : ''} : tes enquêteurs rapportent ${trouvees.length > 1 ? `${trouvees.length} pièces` : 'une pièce'} (${trouvees.join(', ')}).`);
  else if (surPiste) z.rapport.push(`Enquête de voisinage (piste ${aff.suspects[piste].prenom}) : rien de neuf ce soir.`);
  return surPiste ? VOISINAGE.detaches : 0;
}

/** Une pièce inconnue sur un suspect donné. */
function pieceSur(aff, d, i, rng) {
  const connus = new Set(faitsConnus(d));
  const pool = aff.faits.filter((f) => !connus.has(f) && !f.startsWith('p:') && !f.startsWith('c:') && Number(f.split(':')[1]) === i);
  return pool.length ? rng.pick(pool) : null;
}

/** Une pièce inconnue, de préférence sur un suspect de sa cellule. */
function pieceHasard(state, z, aff, rng) {
  const connus = new Set(faitsConnus(z.enquete));
  const inconnues = aff.faits.filter((f) => !connus.has(f) && !f.startsWith('p:') && !f.startsWith('c:'));
  const miennes = inconnues.filter((f) => dansMaCellule(state, z.uid, Number(f.split(':')[1])));
  const pool = miennes.length ? miennes : inconnues;
  return pool.length ? rng.pick(pool) : null;
}

/** Bonus d’énigme : une pièce de l'affaire en cours. */
export function indiceBonus(state, z, rng) {
  if (!state.enquete || !z.enquete) return false;
  const aff = genererAffaire(state.seed, state.enquete.n);
  const f = pieceHasard(state, z, aff, rng);
  if (!f) return false;
  z.enquete.pieces.push({ f, j: state.enquete.jour, src: 'quete' });
  return true;
}

/** Après la simulation : fin de l'affaire, rebondissements, nouvelle affaire, traques. */
export function enquetePost(state, pre, push) {
  const e = state.enquete;
  if (!e.figee) repartirCellules(state);
  if (!pre.res.actifs) return; // personne ne joue encore : l'affaire n'avance pas
  state.traques = (state.traques || []).filter((t) => !t.fini).map((t) => ({ ...t, tours: t.tours - 1 }));
  const accroche = 'Cinq suspects : une seule personne réunit le mobile, le moyen et l’occasion.';
  if (pre.res.decouverte) {
    state.traques.push({ n: e.n, tours: ENQ.traqueTours, decouvreurs: pre.res.decouverte.uids, contributeurs: pre.res.decouverte.contribUids || [] });
    const a = nouvelleAffaire(state);
    pre.res.nouvelle = a.titre;
    push(5, 'Nouvelle affaire', a.titre, `${a.texte} ${accroche}`);
  } else if (e.jour >= ENQ.dureeMax) {
    const a = genererAffaire(state.seed, e.n);
    const s = a.suspects[a.coupable];
    pre.res.classee = true;
    pre.res.recit = recitFinal(a);
    pre.res.solution = { suspect: s.nom, planque: a.planques[a.planque].nom };
    push(8, 'Affaire classée', `« ${a.titre} » classée sans suite`, `Personne n’a trouvé : c’était ${s.nom}, caché${s.f ? 'e' : ''} à ${a.planques[a.planque].nom}.`);
    const b = nouvelleAffaire(state);
    pre.res.nouvelle = b.titre;
    push(5, 'Nouvelle affaire', b.titre, `${b.texte} ${accroche}`);
  } else {
    e.jour += 1;
    // Rebondissement du jour : publié à toutes les zones.
    const aff = genererAffaire(state.seed, e.n);
    const r = aff.rebonds[e.jour];
    if (r) {
      e.rebonds = [...(e.rebonds || []), { j: e.jour, f: r.f }];
      for (const z of Object.values(state.zones)) {
        z.enquete = dossierDe(state, z);
        if (!z.enquete.pieces.some((p) => p.f === r.f)) z.enquete.pieces.push({ f: r.f, j: e.jour, src: 'rebond' });
      }
      pre.res.rebond = { titre: r.titre, texte: r.texte, piece: titrePiece(aff, r.f) };
      push(7, 'Enquête', r.titre, `${r.texte} (« ${titrePiece(aff, r.f)} »)`);
    }
  }
}

/** Rebondissements déjà publiés sur l'affaire en cours (pour l'écran Enquête). */
export function rebondsPublies(state) {
  const e = state.enquete;
  if (!e) return [];
  const aff = genererAffaire(state.seed, e.n);
  return (e.rebonds || []).map((r) => ({ ...aff.rebonds[r.j], j: r.j }));
}
