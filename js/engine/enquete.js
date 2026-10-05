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
import { bonusEquip, SERVICE_LABELS } from './constants.js';
import { LIEUX as LIEUX3, minutes as minutes3, TRAVAUX_POSSIBLES } from './carte3.js';
import { affaireMeurtre } from './meurtre-mons.js';
import { affaireMeurtreRampe, evaluerHypothese } from './meurtre-rampe.js';
import { construireDebrief } from './debrief.js';

/** Deuxième affaire de meurtre écrite à la main (« Le notaire de la Rampe ») : ouverte une fois par partie,
 * au plus tôt deux affaires après la première (une affaire de vol entre les deux). */
export const MEURTRE2 = { actif: true, ecart: 2, lancement: Date.parse('2026-10-04T17:30:00Z') };
/**
 * Lancement programmé : au premier tour résolu après `lancement` (dimanche 4 octobre 2026, 20:00), une partie qui n'a pas
 * encore joué la Rampe retire l'affaire en cours (comme le maître du jeu le ferait) et l'ouvre le soir même.
 * Exception : un meurtre de la rue de la Clef en cours va jusqu'au bout ; la Rampe suit alors directement.
 */
function lancementRampe(state, push) {
  if (!MEURTRE2.actif || state.meurtre2Des != null) return;
  if (!(state.nextDeadline >= MEURTRE2.lancement)) return;
  // Affaire déjà retirée à la main par le maître du jeu : la nouvelle affaire qui s'ouvre ce soir est la Rampe
  // (avant, la pause manuelle court-circuitait le lancement et ouvrait un vol ou la rue de la Clef à la place).
  if (state.enquetePause) { if (!state.enquetePause.suivante) state.enquetePause.suivante = 'rampe'; return; }
  if (!state.enquete) return;
  const e = state.enquete;
  // La rue de la Clef ouverte le soir même du lancement (à cause de cette pause) n'a pas encore été jouée :
  // on la retire aussi, elle reviendra plus tard (après un vol).
  const clefDuLancement = state.meurtreDes != null && e.n === state.meurtreDes && (e.jour || 1) <= 1 && (state.lastResolvedAt || 0) >= MEURTRE2.lancement;
  if (clefDuLancement) delete state.meurtreDes;
  else if (state.meurtreDes != null && e.n === state.meurtreDes) { state.meurtre2Suivante = true; return; }
  const aff = affaire(state, e.n);
  state.enquetePause = { id: `rampe-${state.season}-${state.turn}-${e.n}`, n: e.n, titre: aff.titre, tour: state.turn, reprise: state.nextDeadline, suivante: 'rampe' };
  state.enquete = null;
  if (push) push(9, 'Enquête', `« ${aff.titre} » est retirée`, 'Le parquet mobilise tout le district sur une affaire plus grave, qui s’ouvre ce soir. Les traques en cours continuent.');
}

/**
 * Affaires écrites à la main que le maître du jeu peut ouvrir tout de suite (sans attendre le 20:00).
 * Une nouvelle affaire écrite s'ajoute ici : `dispo` (pas encore jouée dans la partie) et `programmer`
 * (marque le numéro `n` de la prochaine affaire pour qu'elle soit celle-ci).
 */
export const AFFAIRES_ECRITES = [
  { cas: 'rampe', titre: 'Le notaire de la Rampe', resume: 'Meurtre d’un notaire, Rampe Sainte-Waudru · 5 suspects · mandat puis confrontation',
    dispo: (st) => MEURTRE2.actif && st.meurtre2Des == null, programmer: (st, n) => { st.meurtre2Des = n; delete st.meurtre2Suivante; } },
  { cas: 'clef', titre: 'Meurtre rue de la Clef', resume: 'Meurtre d’un antiquaire dans sa boutique · 5 suspects · perquisition puis confrontation',
    dispo: (st) => st.meurtreDes == null, programmer: (st, n) => { st.meurtreDes = n; } },
];
const casEnCours = (st) => (st.enquete ? (st.meurtre2Des === st.enquete.n ? 'rampe' : st.meurtreDes === st.enquete.n ? 'clef' : null) : null);
/** Affaires écrites que le maître du jeu peut ouvrir maintenant dans cette partie. */
export function affairesOuvrables(state) {
  if (!state || !(state.enquete || state.enquetePause)) return [];
  const enCours = casEnCours(state);
  return AFFAIRES_ECRITES.filter((a) => a.cas !== enCours && a.dispo(state));
}
export const rampeDisponible = (state) => affairesOuvrables(state).some((a) => a.cas === 'rampe');
/**
 * Maître du jeu : ouvre l'affaire écrite `cas` tout de suite. L'affaire en cours est retirée (traques intactes) ;
 * une affaire écrite retirée au jour 1 (pas encore jouée) redevient disponible. Renvoie le titre de l'affaire
 * retirée ('' s'il n'y en avait pas), ou null si cette affaire n'est pas disponible.
 */
export function ouvrirAffaireMaintenant(state, cas = 'rampe', now = Date.now()) {
  const def = affairesOuvrables(state).find((a) => a.cas === cas);
  if (!def) return null;
  let retiree = state.enquetePause ? state.enquetePause.titre : '';
  if (state.enquete) {
    const e = state.enquete;
    retiree = affaire(state, e.n).titre;
    if ((e.jour || 1) <= 1) { if (state.meurtreDes === e.n) delete state.meurtreDes; if (state.meurtre2Des === e.n) delete state.meurtre2Des; }
    state.enquetePause = { id: `mj-${cas}-${state.season}-${state.turn}-${e.n}`, n: e.n, titre: retiree, tour: state.turn, reprise: state.nextDeadline };
    state.enquete = null;
  }
  state.enquetePause.suivante = cas;
  nouvelleAffaire(state);
  // Ouverte après l'échéance mais avant que le tour soit calculé : ce calcul ne doit pas la faire passer au jour 2
  // (le 4 octobre, la Rampe ouverte à la main vers 20:30 s'est retrouvée au jour 2 dès le soir même).
  if (state.enquete && state.nextDeadline && now >= state.nextDeadline) state.enquete.sansAvance = state.nextDeadline;
  return retiree;
}
export const ouvrirRampeMaintenant = (state) => ouvrirAffaireMaintenant(state, 'rampe');

/**
 * Réparation ponctuelle (partie où la Rampe a été ouverte à la main le 4 octobre après 20:00, avant le calcul
 * du tour) : l'affaire affiche le jour 2 alors qu'elle s'est ouverte ce soir-là. Vrai si l'état est concerné.
 */
export const jourRampeARecaler = (state) => !!(state && state.enquete && state.meurtre2Des === state.enquete.n && state.enquete.jour === 2
  && !state.enquete.recale && state.nextDeadline === Date.parse('2026-10-05T18:00:00Z'));
export function recalerJourRampe(state) {
  if (!jourRampeARecaler(state)) return null;
  state.enquete.jour = 1; state.enquete.recale = true;
  for (const z of Object.values(state.zones || {})) for (const p of (z.enquete && z.enquete.n === state.enquete.n && z.enquete.pieces) || []) if (p.j === 2) p.j = 1;
  return true;
}

export const ENQ_VERSION = 2;
export const ENQ = {
  dureeMax: 7,          // jours pour désigner le suspect
  traqueTours: 1,       // tours pour l'arrêter ensuite (une seule nuit : les indices sur la planque s'accumulent pendant l'enquête)
  agentsTraque: 2,      // agents d'Intervention minimum pour une interpellation (4 coûtaient plus que l'arrestation ne rapportait : voir l'historique)
  maxDemarches: 2,      // démarches par tour
  maxPartages: 3,       // pièces partagées par tour
  maxRecus: 2,          // pièces partagées qu'une zone peut recevoir par soir (les grandes parties restent équitables)
  nbSuspects: 5,
  maxCellules: 3,
  surcoutHorsCellule: 2, // multiplicateur de coût pour un suspect d'une autre cellule
};

/** Points d'enquête pour une découverte au jour `j`. */
export const pointsDecouverte = (j) => Math.max(40, 110 - 10 * j);
export const POINTS = { contribution: 25, arrestation: 30, mobile: 20 };

/**
 * Mise à prix d'une affaire, annoncée dès l'ouverture. Chaque zone qui arrête l'auteur (ou obtient ses aveux)
 * choisit sa récompense avant le 20:00 suivant ; sans choix, la confiscation est versée.
 * Calibrage : test/equip-sim.mjs (FILTRE=Prime) — renfort et formation valent environ +2,4 d'IPZ moyen
 * reçus en milieu de saison ; 12 k€ rachètent largement les démarches d'une affaire.
 * Les zones qui ont démasqué l'auteur sans l'arrêter et celles dont les pièces ont aidé touchent une part.
 */
export const PRIME = {
  confiscation: 12,                 // k€
  renfort: { agents: 2, tours: 5 }, // renfort fédéral, salaires payés par le fédéral
  partIdentification: 6,            // k€ : démasqué sans arrêter
  partContribution: 2,              // k€ : pièces partagées qui ont aidé
};
export const PRIME_CHOIX = ['confiscation', 'renfort', 'formation'];
export const PRIME_LABELS = {
  confiscation: { ico: '💶', nom: 'Confiscation des avoirs', effet: `+${PRIME.confiscation} k€ tout de suite` },
  renfort: { ico: '👮', nom: 'Renfort fédéral', effet: `+${PRIME.renfort.agents} agents pendant ${PRIME.renfort.tours} jours, salaires payés par le fédéral` },
  formation: { ico: '🎓', nom: 'Formation offerte', effet: '+1 niveau dans le service de ton choix, sans agent absent' },
};
/** Texte de l'avis de recherche (ouverture de l'affaire). */
export const texteMisePrix = () => `Mise à prix : la zone qui arrête l’auteur choisit sa récompense, ${PRIME_LABELS.confiscation.effet.replace(' tout de suite', '')}, ${PRIME.renfort.agents} agents fédéraux pendant ${PRIME.renfort.tours} jours ou une formation offerte. Démasquer sans arrêter rapporte ${PRIME.partIdentification} k€, aider avec ses pièces ${PRIME.partContribution} k€.`;

/** Ouvre le choix de la mise à prix pour une zone (arrestation ou aveux). */
function ouvrirPrime(state, z, aff, suspect) {
  z.primeAChoisir = { n: aff.n, titre: aff.titre, suspect, tour: state.turn };
  // Avis de recherche tamponné « ARRÊTÉ », accroché au commissariat (les 12 derniers, gardés d'une saison à l'autre).
  const s = aff.suspects[aff.coupable] || {};
  const affiche = { n: aff.n, titre: aff.titre, nom: s.nom || suspect, f: !!s.f, age: s.age || null, role: s.role || '', i: aff.coupable, season: state.season, tour: state.turn, prime: null };
  if (s.photo) affiche.photo = s.photo;
  z.affiches = [...(z.affiches || []).filter((a) => !(a.n === aff.n && a.season === state.season)), affiche].slice(-12);
  z.rapport.push(`Mise à prix : choisis ta récompense avant le prochain 20:00 (écran Enquête). Sans choix, la confiscation des avoirs (+${PRIME.confiscation} k€) est versée.`);
}
/** Parts de la mise à prix : démasqué sans arrêter, pièces qui ont aidé. */
function partsPrime(state, decouvreurs, contributeurs, arreteurs) {
  const deja = new Set(arreteurs);
  for (const u of new Set(decouvreurs)) {
    const z = state.zones[u];
    if (!z || deja.has(u)) continue; deja.add(u);
    z.budget += PRIME.partIdentification; (z._compta ||= []).push({ k: 'prime', l: 'Mise à prix : part pour avoir démasqué l’auteur', v: PRIME.partIdentification });
    z.rapport.push(`Mise à prix : tu as démasqué l’auteur, ta part est de ${PRIME.partIdentification} k€.`);
  }
  for (const u of new Set(contributeurs)) {
    const z = state.zones[u];
    if (!z || deja.has(u)) continue; deja.add(u);
    z.budget += PRIME.partContribution; (z._compta ||= []).push({ k: 'prime', l: 'Mise à prix : part pour tes pièces partagées', v: PRIME.partContribution });
    z.rapport.push(`Mise à prix : tes pièces ont aidé, ta part est de ${PRIME.partContribution} k€.`);
  }
}

/**
 * Applique le choix de la mise à prix (au début de la résolution qui suit l'arrestation).
 * `choix` : 'confiscation' | 'renfort' | 'formation:<service>'. Renvoie la ligne du rapport, ou null.
 */
export function appliquerPrime(z, choix, T, { services, niveauMax }) {
  const p = z.primeAChoisir;
  if (!p || p.tour >= T) return null;
  delete z.primeAChoisir;
  let [k, s] = String(choix || '').split(':');
  if (k === 'formation' && !(services.includes(s) && (z.niveaux[s] || 1) < niveauMax)) k = 'confiscation';
  if (!PRIME_CHOIX.includes(k)) k = 'confiscation';
  const af = (z.affiches || []).slice().reverse().find((a) => a.n === p.n && !a.prime);
  if (af) af.prime = k === 'formation' ? `formation:${s}` : k;
  if (k === 'renfort') {
    z.renforts = [...(z.renforts || []), { n: PRIME.renfort.agents, debut: T + 1, retour: T + 1 + PRIME.renfort.tours, de: 'federal' }];
    return `Mise à prix « ${p.titre} » : renfort fédéral, ${PRIME.renfort.agents} agents dans tes ordres dès demain, pendant ${PRIME.renfort.tours} jours.`;
  }
  if (k === 'formation') {
    z.niveaux[s] += 1;
    return `Mise à prix « ${p.titre} » : formation offerte, ${SERVICE_LABELS[s] || s} au niveau ${z.niveaux[s]}.`;
  }
  z.budget += PRIME.confiscation; (z._compta ||= []).push({ k: 'prime', l: 'Mise à prix : confiscation des avoirs', v: PRIME.confiscation });
  return `Mise à prix « ${p.titre} » : confiscation des avoirs, +${PRIME.confiscation} k€.${choix ? '' : ' (aucun choix reçu : versée par défaut)'}`;
}

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
  ouverture: 'Ouverture du dossier', tardif: 'Témoin tardif', recoup: 'Recoupement', declic: 'Reçue au commissariat', audition: 'PV d’audition', reaud: 'Réaudition', rattrapage: 'Dossier de rattrapage', voisinage: 'Enquête de voisinage', quete: 'Bonus d’énigme', pjf: 'Appui PJF', partage: 'Partagé', pacte: 'Pacte d’enquête', rebond: 'Rebondissement',
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

/** Démarche telle qu'elle s'appelle dans cette affaire (une affaire de meurtre renomme les siennes). */
export function demarcheDe(aff, k) {
  const base = DEMARCHES[k];
  return aff && aff.dem && aff.dem[k] ? { ...base, ...aff.dem[k] } : base;
}
/** Pièces qu'on peut obtenir sans démarche dédiée (voisinage, énigmes, appui, rattrapage). */
export function piecesLibres(aff) {
  return aff.libres || aff.faits.filter((f) => !f.startsWith('p:') && !f.startsWith('c:'));
}
/** Meurtre : le juge accorde un mandat de perquisition si le dossier contient une pièce sérieuse contre la personne. */
export function mandatOk(aff, dossier, i) {
  if (!aff.meurtre) return true;
  const connus = new Set(faitsConnus(dossier));
  return (aff.charges[i] || []).some((f) => connus.has(f));
}
/** Meurtre : la confrontation réussit-elle ? (bon suspect, trois pièces accablantes dont deux décisives) */
export function confrontationOk(aff, i, pieces) {
  if (!aff.meurtre) return i === aff.coupable;
  const p = [...new Set(pieces || [])];
  if (i !== aff.coupable || p.length !== 3) return false;
  return p.every((f) => aff.confront.accablantes.includes(f)) && p.filter((f) => aff.confront.decisives.includes(f)).length >= 2;
}

// ─────────────────────────────── Contenu ───────────────────────────────

const AFFAIRES = [
  { titre: 'Le casse du dépôt des Tanneurs', pos: 'tanneurs', lieu: 'le dépôt des Tanneurs', pres: 'du dépôt des Tanneurs', texte: 'Un dépôt de matériel électronique a été vidé pendant la nuit.', butin: 'ordinateurs portables', gros: true, vic: ['le gérant', 'au gérant', 'du gérant'] },
  { titre: 'La bijouterie de la Grand-Place', pos: 'bijouterie', lieu: 'la bijouterie', pres: 'de la bijouterie', texte: 'Une bijouterie a été visitée après la fermeture.', butin: 'montres et bijoux', gros: false, vic: ['la bijoutière', 'à la bijoutière', 'de la bijoutière'] },
  { titre: 'Le fourgon de la Porte Sud', pos: 'portesud', lieu: 'l’entrepôt de la Porte Sud', pres: 'de l’entrepôt de la Porte Sud', texte: 'L’entrepôt d’un grossiste en parfums a été vidé.', butin: 'cartons de parfums', gros: true, vic: ['le grossiste', 'au grossiste', 'du grossiste'] },
  { titre: 'Les caves du Béguinage', pos: 'beguinage', lieu: 'le restaurant du Béguinage', pres: 'du restaurant du Béguinage', texte: 'La cave d’un restaurant réputé a été pillée.', butin: 'caisses de grands vins', gros: true, vic: ['le restaurateur', 'au restaurateur', 'du restaurateur'] },
  { titre: 'L’atelier des Filatures', pos: 'filatures', lieu: 'l’atelier des Filatures', pres: 'de l’atelier des Filatures', texte: 'Un atelier de vélos électriques a perdu une partie de son stock.', butin: 'vélos électriques', gros: true, vic: ['la gérante', 'à la gérante', 'de la gérante'] },
  { titre: 'Le musée des Moulins', pos: 'moulins', lieu: 'le musée des Moulins', pres: 'du musée des Moulins', texte: 'Des pièces d’une exposition temporaire ont disparu.', butin: 'objets de collection', gros: false, vic: ['la conservatrice', 'à la conservatrice', 'de la conservatrice'] },
  { titre: 'La pharmacie du Petit-Pont', pos: 'petitpont', lieu: 'la pharmacie du Petit-Pont', pres: 'de la pharmacie du Petit-Pont', texte: 'La réserve d’une pharmacie a été visitée.', butin: 'matériel médical', gros: false, vic: ['le pharmacien', 'au pharmacien', 'du pharmacien'] },
  { titre: 'Le chantier des Hauts-Prés', pos: 'hautspres', lieu: 'le chantier des Hauts-Prés', pres: 'du chantier des Hauts-Prés', texte: 'Le conteneur d’un chantier a été vidé pendant la nuit.', butin: 'outillage professionnel', gros: true, vic: ['le chef de chantier', 'au chef de chantier', 'du chef de chantier'] },
  { titre: 'La salle des ventes', pos: 'ventes', lieu: 'la salle des ventes', pres: 'de la salle des ventes', texte: 'Des lots ont disparu la veille d’une vente aux enchères.', butin: 'tableaux et bibelots', gros: false, vic: ['la commissaire-priseuse', 'à la commissaire-priseuse', 'de la commissaire-priseuse'] },
  { titre: 'Le magasin de la gare', pos: 'gare', lieu: 'la boutique de la gare', pres: 'de la boutique de la gare', texte: 'Une boutique de téléphonie a été vidée en quelques minutes.', butin: 'smartphones neufs', gros: false, vic: ['le patron', 'au patron', 'du patron'] },
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
// Affaires « dossier complet » : plus de suspects sans voiture, la route compte vraiment.
const VEHICULES3 = [
  { t: 'une petite citadine', gros: false, mode: 'moteur', je: 'Avec ma petite citadine.' },
  { t: 'un scooter', gros: false, mode: 'moteur', je: 'Avec mon scooter.' },
  { t: 'un break', gros: false, mode: 'moteur', je: 'Avec mon break.' },
  { t: 'la camionnette de son employeur', gros: true, mode: 'moteur', je: 'Avec la camionnette de mon employeur, je la ramène chez moi le soir.' },
  { t: 'une moto', gros: false, mode: 'moteur', je: 'Avec ma moto.' },
  { t: 'un vélo (pas de voiture)', v: 'un vélo', gros: false, rien: true, mode: 'velo', je: 'À vélo, comme toujours. Je n’ai pas de voiture.' },
  { t: 'un vélo électrique (pas de permis)', v: 'un vélo électrique', gros: false, rien: true, mode: 'velo', je: 'Avec mon vélo électrique. Je n’ai pas le permis.' },
  { t: 'aucun : se déplace à pied', gros: false, rien: true, mode: 'pied', je: 'À pied. Je n’ai ni voiture ni vélo, je prends le bus en journée.' },
];
// Lieux des alibis tels qu'on les dit sur le plan routier.
const ALIBI3 = { parents: { lieu: 'chez ses parents, à Haut-Delta', je: 'chez mes parents, à Haut-Delta' } };
const JE_ALIBI = { palace: 'au cinéma Le Palace', relais: 'au restaurant Le Relais', minifoot: 'à l’entraînement de mini-foot', usine: 'au travail, à l’usine', parents: 'chez mes parents', bowling: 'au bowling du Zoning', anniversaire: 'à l’anniversaire d’un collègue' };
export { JE_ALIBI };
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const voy = (s) => /^[aeiouéèêh]/i.test(s);
const queN = (n) => (voy(n) ? `qu’${n}` : `que ${n}`);
const deN = (n) => (voy(n) ? `d’${n}` : `de ${n}`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Lieux d'alibi « sociaux » : une preuve peut les confirmer, en tout ou en partie.
const ALIBIS = [
  { pos: 'palace', lieu: 'au cinéma Le Palace', preuve: 'les caméras du cinéma', trace: 'Ticket de sortie du parking du cinéma' },
  { pos: 'relais', lieu: 'au restaurant Le Relais', preuve: 'le paiement par carte et le serveur', trace: 'Paiement de l’addition par carte' },
  { pos: 'minifoot', lieu: 'à l’entraînement de mini-foot', preuve: 'le badge de la salle de sport', trace: 'Badge scanné à la salle de sport' },
  { pos: 'usine', lieu: 'au travail, à l’usine', preuve: 'le registre de pointage', trace: 'Pointage à l’usine' },
  { pos: 'parents', lieu: 'chez ses parents, à l’autre bout de la ville', preuve: 'le bornage de son GSM et un voisin', trace: 'Dernier bornage de son GSM chez ses parents' },
  { pos: 'bowling', lieu: 'au bowling du Zoning', preuve: 'les caméras du bowling', trace: 'Fin de la réservation de piste au bowling' },
  { pos: 'anniversaire', lieu: 'à l’anniversaire d’un collègue', preuve: 'les photos de la soirée et trois invités', trace: 'Photo horodatée de l’anniversaire' },
];
// Alibis solitaires : personne pour les confirmer. `voiture` : seulement pour qui en a une.
const SOLITAIRES = [
  { t: (f) => `${f ? 'seule' : 'seul'} chez ${f ? 'elle' : 'lui'}, devant la télévision` },
  { t: () => 'en promenade à pied, sans son téléphone' },
  { t: (f) => `${f ? 'couchée' : 'couché'} tôt, avec un mal de tête` },
  { t: () => 'en voiture, à rouler pour se changer les idées', voiture: true },
];

// Plan du district (880 × 680) : lieux des affaires et lieux des alibis.
// Le temps de trajet (en voiture ou à vélo, le plus court) entre deux lieux se lit sur la carte du tableau d'enquête.
export const CARTE = {
  lieux: {
    tanneurs: { nom: 'Dépôt des Tanneurs', x: 700, y: 150 },
    bijouterie: { nom: 'Bijouterie, Grand-Place', x: 430, y: 330 },
    portesud: { nom: 'Entrepôt de la Porte Sud', x: 580, y: 640 },
    beguinage: { nom: 'Restaurant du Béguinage', x: 150, y: 330 },
    filatures: { nom: 'Atelier des Filatures', x: 810, y: 400 },
    moulins: { nom: 'Musée des Moulins', x: 470, y: 170 },
    petitpont: { nom: 'Pharmacie du Petit-Pont', x: 300, y: 480 },
    hautspres: { nom: 'Chantier des Hauts-Prés', x: 230, y: 60 },
    ventes: { nom: 'Salle des ventes', x: 610, y: 320 },
    gare: { nom: 'Boutique de la gare', x: 310, y: 210 },
    palace: { nom: 'Cinéma Le Palace', x: 150, y: 170 },
    relais: { nom: 'Restaurant Le Relais', x: 700, y: 480 },
    minifoot: { nom: 'Salle de mini-foot', x: 90, y: 510 },
    usine: { nom: 'Usine du Zoning Nord', x: 820, y: 60 },
    parents: { nom: 'Chez ses parents (autre bout de la ville)', x: 860, y: 660, loin: true },
    bowling: { nom: 'Bowling du Zoning', x: 770, y: 635 },
    anniversaire: { nom: 'Anniversaire chez un collègue', x: 430, y: 520 },
  },
};
/** Temps de trajet en minutes entre deux lieux du plan (au plus court, en voiture ou à vélo). */
export function trajet(a, b) {
  const A = CARTE.lieux[a], B = CARTE.lieux[b];
  if (!A || !B) return null;
  if (A.loin || B.loin) return 30;
  return Math.max(3, Math.min(25, Math.round(Math.hypot(A.x - B.x, A.y - B.y) / 22)));
}

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
const indexBrut = (seed, n) => (n - 1 + makeRng(`${seed}:enquete2:${n}`).int(0, AFFAIRES.length - 1)) % AFFAIRES.length;
/**
 * Décor réellement utilisé par l'affaire n : à partir de l'affaire `dd`, jamais le même que les deux précédentes
 * (la précédente peut encore être en traque quand la suivante s'ouvre).
 */
const memoModele = new Map();
function indexModele(seed, n, dd) {
  if (dd == null || n < dd || n <= 1) return indexBrut(seed, n);
  const k = `${seed}#${n}#${dd}`;
  if (memoModele.has(k)) return memoModele.get(k);
  const avant = [n - 1, n - 2].filter((x) => x >= 1).map((x) => indexModele(seed, x, dd));
  let im = indexBrut(seed, n);
  while (avant.includes(im)) im = (im + 1) % AFFAIRES.length;
  memoModele.set(k, im);
  return im;
}

/**
 * Affaire n° `n` de la partie.
 * `dd` : à partir de cette affaire, une affaire ne reprend pas le décor de la précédente
 * (avant, pour les affaires déjà ouvertes, seul le titre change).
 */
export function genererAffaire(seed, n, carte = false, prof = false, dd = null) {
  if (prof) carte = true;
  const distinct = dd != null && n >= dd;
  const key = `${seed}#${n}${carte ? '#c' : ''}${prof ? '#p' : ''}${distinct ? `#d${dd}` : ''}`;
  if (cache.has(key)) return cache.get(key);
  const rng = makeRng(`${seed}:enquete2:${n}`);
  rng.int(0, AFFAIRES.length - 1); // tirage du décor (le même que dans indexBrut)
  const im = indexModele(seed, n, distinct ? dd : null);
  const memeQuAvant = !distinct && n > 1 && im === indexBrut(seed, n - 1);
  const modele = memeQuAvant && !distinct ? { ...AFFAIRES[im], titre: `${AFFAIRES[im].titre}, le retour` } : AFFAIRES[im];
  const [vic, aVic, deVic] = modele.vic;

  // Ce qu'il fallait pour commettre les faits.
  const req = {
    moy: rng.pick(modele.gros ? MOY : ['cle', 'code']),
    mob: rng.pick(MOB),
  };
  const heure = 21 * 60 + 40 + 5 * rng.int(0, 8);           // entrée
  const fin = heure + 5 * rng.int(3, 6);                    // sortie
  const annonce = Math.round(heure / 30) * 30;              // « vers 22:00 » à l'ouverture
  // Dossier complet : un pont routier est parfois fermé aux voitures pour travaux (tirage à part).
  const rt = makeRng(`${seed}:enquete3:${n}:route`);
  const travaux = prof && rt.chance(0.45) ? rt.pick(TRAVAUX_POSSIBLES) : null;

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
    // Dossier complet : la camionnette de l'employeur est toujours disponible (sinon on ne saurait plus comment il roulait).
    const vehicule = rng.pick(prof ? VEHICULES3.filter((v) => !v.gros || moy.volume) : VEHICULES);
    // Occasion : même loi pour tous ceux qui n'ont pas d'alibi pendant les faits.
    const alibi = { type: statut.occ ? rng.pick(['partiel', 'partiel', 'seul', 'mensonge']) : 'couvre', ...rng.pick(ALIBIS) };
    if (prof && ALIBI3[alibi.pos]) alibi.lieu = ALIBI3[alibi.pos].lieu;
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
    if (prof && (a.type === 'couvre' || a.type === 'partiel')) {
      alibiRoute(a, s, modele.pos, heure, fin, travaux, rng);
    } else if (carte && (a.type === 'couvre' || a.type === 'partiel')) {
      // Avec le plan : un trou dans l'alibi ne suffit pas, il faut aussi avoir eu le temps de faire le trajet.
      // Alibi qui couvre : soit toute la durée des faits, soit un trou trop court pour l'aller (ou le retour).
      // Alibi troué : un trou au moins aussi long que le trajet.
      const t = trajet(modele.pos, a.pos);
      const avant = rng.chance(0.5);
      let g = null;
      if (a.type === 'partiel') g = 5 * Math.ceil(t / 5) + 5 * rng.int(0, 2);
      else if (t > 5 && rng.chance(0.6)) g = 5 * rng.int(1, Math.ceil(t / 5) - 1);
      if (g === null) { if (avant) { a.de = a.ditDe; a.a = fin + 5 * rng.int(1, 5); } else { a.de = heure - 5 * rng.int(1, 5); a.a = a.ditA; } }
      else if (avant) { a.de = a.ditDe; a.a = heure - g; } else { a.de = fin + g; a.a = a.ditA; }
    } else if (a.type === 'couvre') {
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
    n, id: `aff${n}`, carte: !!carte, prof: !!prof, travaux, pos: modele.pos, titre: modele.titre, texte: modele.texte, butin: modele.butin, lieu: modele.lieu, pres: modele.pres,
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

/**
 * Moyens de transport qu'un suspect avait ce soir-là : le sien, une camionnette louée (vérification des moyens),
 * un vélo pour qui a un véhicule à moteur (on peut toujours en emprunter un), et ses pieds.
 */
export function modesPossibles(s) {
  const own = s.vehicule.mode || (s.vehicule.rien ? 'velo' : 'moteur');
  const m = new Set([own, 'pied']);
  if (own === 'moteur') m.add('velo');
  if (s.vehicule.rien && s.moy.volume) m.add('moteur');
  return [...m];
}

/**
 * Dossier complet : heures vérifiées d'un alibi d'après la vraie route entre le lieu déclaré et la scène.
 * Alibi troué : le trou laisse le temps de faire la route avec son propre véhicule.
 * Alibi qui couvre : s'il y a un trou, il est trop court pour la route, quel que soit le moyen de transport possible.
 * Piège : un suspect sans voiture a parfois un trou où une voiture serait passée, mais pas son vélo ni ses pieds.
 */
function alibiRoute(a, s, scene, heure, fin, ferme, rng) {
  const t = (mode) => minutes3(scene, a.pos, mode, ferme);
  const own = s.vehicule.mode;
  const possibles = modesPossibles(s);
  const tFast = Math.min(...possibles.map(t));
  const avant = rng.chance(0.5);
  let g = null;
  if (a.type === 'partiel') g = 5 * Math.ceil(t(own) / 5) + 5 * rng.int(0, 2);
  else {
    const max = Math.floor((tFast - 2) / 5); // trou le plus long (multiple de 5), avec 2 min de marge
    if (max >= 1) {
      const piege = !possibles.includes('moteur') ? Math.max(1, Math.ceil(t('moteur') / 5)) : null;
      if (piege !== null && piege <= max && rng.chance(0.75)) g = 5 * rng.int(piege, max);
      else if (rng.chance(0.6)) g = 5 * rng.int(1, max);
    }
  }
  if (g !== null) { a.ditDe = Math.min(a.ditDe, heure - g - 30); a.ditA = Math.max(a.ditA, fin + g + 30); }
  if (g === null) { if (avant) { a.de = a.ditDe; a.a = fin + 5 * rng.int(1, 5); } else { a.de = heure - 5 * rng.int(1, 5); a.a = a.ditA; } }
  else if (avant) { a.de = a.ditDe; a.a = heure - g; } else { a.de = fin + g; a.a = a.ditA; }
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
    case 'rive': return `Après les faits, un véhicule chargé est filmé en train de passer un pont vers la rive ${p.rive} : la planque est sur la rive ${p.rive}.`;
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
  const gros = s.vehicule.gros, veh = s.vehicule.rien ? (s.vehicule.mode === 'pied' ? null : s.vehicule.v || 'un vélo') : s.vehicule.t;
  const nAQue = veh ? `n’a qu’${veh}` : 'n’a aucun véhicule';
  if (a === 'cle') {
    if (v) return rng.pick([s.proche ? `Clés : ${s.nom} possède un jeu de clés ${aff.pres} et ne l’a jamais rendu.` : `Clés : un double des clés ${aff.pres} a été retrouvé chez ${s.nom}, qui ne sait pas l’expliquer.`, `Clés : un double des clés ${aff.pres} pendait au tableau de l’entrée, chez ${s.nom}.`, ...(s.proche ? [`Clés : ${aff.vic} avait confié un jeu de clés à ${s.nom}, « pour dépanner ».`] : [])]);
    return s.proche ? `Clés : ${s.nom} a rendu son jeu de clés contre signature ; le registre des clés le confirme, aucun double n’a été fait.` : `Clés : ${s.nom} n’a jamais eu de clés ${aff.pres}, ni accès au trousseau.`;
  }
  if (a === 'code') {
    if (v) return s.tech ? `Alarme : ${s.nom} a gardé un code de maintenance depuis l’installation, toujours actif.` : rng.pick([`Alarme : ${s.nom} dispose d’un code personnel, toujours actif selon le journal du boîtier.`, `Alarme : un code d’accès valide est noté dans un carnet retrouvé chez ${s.nom}.`]);
    return s.tech ? `Alarme : ${s.nom} a installé le système, mais son code de maintenance a été supprimé à la réception du chantier ; ${il} n’en a plus aucun.` : `Alarme : ${s.nom} n’a aucun code ; son nom n’apparaît nulle part dans le journal du boîtier.`;
  }
  if (v) return gros ? `Véhicule : la camionnette qu’utilise ${s.nom} était à sa disposition ce soir-là, garée devant chez ${s.f ? 'elle' : 'lui'}.` : `Véhicule : ${s.nom} a loué une camionnette le jour des faits (contrat de location à l’appui), alors qu’${il} ${nAQue}.`;
  return gros ? `Véhicule : la camionnette qu’utilise ${s.nom} était au garage toute la semaine (facture du garagiste), et aucun loueur ne ${s.f ? 'la' : 'le'} connaît.` : `Véhicule : ${s.nom} ${nAQue} et n’a loué aucun véhicule (vérification faite auprès des loueurs de la région).`;
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
  const t = aff.carte && !aff.prof && s.alibi.type !== 'seul' ? trajet(aff.pos, s.alibi.pos) : null;
  const base = { lien: `${cap(s.role)}, ${s.age} ans · ${s.roleDetail}`, vehicule: `${aff.meurtre ? 'Se déplace' : 'Véhicule'} : ${s.vehicule.t}`, declaration: `${cap(declaration(s))}.`, rumeur: rum ? `Rumeur : ${rum}.` : '',
    trajet: t ? `Trajet : ${t} min entre le lieu déclaré et ${aff.lieu}.` : '' };
  return s.fiche ? { ...base, ...s.fiche } : base;
}
export function fichePlanque(p) {
  return `${p.lieu} · rive ${p.rive} · lieu ${p.humidite} et ${p.temperature} · accès ${p.acces === 'véhicule' ? 'en véhicule' : 'à pied seulement'}`;
}

/** Titre court d'une pièce. */
export function titrePiece(aff, f) {
  if (aff.titres && aff.titres[f]) return aff.titres[f];
  if (f === 'doc:journal') return 'Le journal du lendemain';
  if (f === 'doc:pvc') return 'PV de premières constatations';
  const [k, x] = f.split(':');
  if (k === 'c') return { occ: 'Constatations · l’heure exacte', moy: 'Constatations · comment on est entré', mob: 'Constatations · pourquoi on a volé' }[x];
  if (k === 'p') return 'Planque · indice sur le butin';
  const s = aff.suspects[Number(x)];
  if (k === 'A') return `PV d’audition · ${s ? s.nom : '?'}`;
  if (aff.meurtre) return `${{ occ: 'Alibi', moy: 'Perquisition', mob: 'Téléphone et comptes' }[k]} · ${s ? s.nom : '?'}`;
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
  if (aff.meurtre) return { suspects: aff.suspects.map((s, i) => i).filter((i) => !(aff.innocente[i] || []).some((f) => (Array.isArray(f) ? f.every((g) => connus.has(g)) : connus.has(f)))), planques: [] };
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

// Pièce connue de tous à l'ouverture (un indice sur la planque) ; une affaire de meurtre n'en a pas.
const pieceOuverture = (aff) => (aff && aff.meurtre ? [] : [{ f: 'p:humidite', j: 1, src: 'ouverture' }]);

/**
 * Dossier de rattrapage d'une zone qui arrive en cours d'affaire (jour 2 et plus) : autant de pièces que la moyenne
 * des zones déjà dans l'affaire, moins RATTRAPAGE.retrait (à défaut de zones de référence, RATTRAPAGE.parJour
 * pièce par jour écoulé). D'abord les constatations de la scène (heure, moyens, mobile : les premières démarches de
 * tout le monde), puis des pièces au hasard sur les suspects de sa cellule. Jamais d'indice de planque.
 * Tirage fixe pour une zone et une affaire.
 */
export const RATTRAPAGE = { retrait: 1, parJour: 1.2, max: 12 };
function piecesRattrapage(state, z, base) {
  const e = state.enquete;
  if (!e || (e.jour || 1) < 2) return [];
  const aff = affaire(state, e.n);
  if (!aff) return [];
  // Moyenne des zones déjà dans l'affaire (leur dossier enregistré, sans recalcul), pièces communes comprises.
  const autres = Object.values(state.zones || {}).filter((x) => x.uid !== z.uid && x.enquete && x.enquete.n === e.n && Array.isArray(x.enquete.pieces));
  const cible = autres.length
    ? Math.round(autres.reduce((t, x) => t + x.enquete.pieces.length, 0) / autres.length) - RATTRAPAGE.retrait
    : base.pieces.length + Math.round(((e.jour || 1) - 1) * RATTRAPAGE.parJour);
  const nb = Math.max(0, Math.min(RATTRAPAGE.max, cible - base.pieces.length));
  const connus = new Set(base.pieces.map((p) => p.f));
  const out = [];
  for (const f of aff.constatsBase || ['c:occ', 'c:moy', 'c:mob']) if (out.length < nb && aff.faits.includes(f) && !connus.has(f)) out.push(f);
  const rng = makeRng(`${state.seed}:rattrapage:${e.n}:${z.uid}`);
  const inconnues = piecesLibres(aff).filter((f) => !connus.has(f) && !out.includes(f));
  const miennes = inconnues.filter((f) => dansMaCellule(state, z.uid, Number(f.split(':')[1])));
  const pool = rng.shuffle(miennes.length >= nb - out.length ? miennes : inconnues);
  while (out.length < nb && pool.length) out.push(pool.shift());
  return out;
}

/** Dossier d'enquête d'une zone pour l'affaire en cours (sans modifier la zone). */
export function dossierDe(state, z) {
  const e = state.enquete;
  if (!e) return null;
  if (z.enquete && z.enquete.n === e.n && z.enquete.v === ENQ_VERSION) {
    // Zone arrivée après le début de l'affaire, avant que le rattrapage existe : on le lui donne une fois.
    const debut = state.turn - ((e.jour || 1) - 1);
    if (!z.enquete.ratt && (z.joinedTurn || 0) > debut) {
      const extra = piecesRattrapage(state, z, z.enquete);
      return { ...z.enquete, ratt: true, pieces: [...z.enquete.pieces, ...extra.map((f) => ({ f, j: e.jour, src: 'rattrapage' }))] };
    }
    return z.enquete;
  }
  const base = { n: e.n, v: ENQ_VERSION, pieces: pieceOuverture(affaire(state, e.n)), accuse: null, exclu: false, ratt: true };
  // Une zone qui arrive en cours d'affaire reçoit aussi les rebondissements déjà publiés…
  for (const r of e.rebonds || []) if (!base.pieces.some((p) => p.f === r.f)) base.pieces.push({ f: r.f, j: r.j, src: 'rebond' });
  // … et un dossier de rattrapage, au prorata des jours écoulés.
  for (const f of piecesRattrapage(state, z, base)) base.pieces.push({ f, j: e.jour, src: 'rattrapage' });
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
  return { n, v: ENQ_VERSION, pieces: pieceOuverture(affaire(state, n)), accuse: null, exclu: false };
}

export function faitsConnus(dossier) { return dossier ? dossier.pieces.map((p) => p.f) : []; }

/** Pièce qu'apporterait une démarche (null si elle n'apporte plus rien). */
export function pieceDemarche(aff, dossier, x) {
  const d = lireDemarche(x);
  if (!d) return null;
  const connus = new Set(faitsConnus(dossier));
  if (d.dm.scene) {
    for (const f of (aff.sceneSeq ? aff.sceneSeq[d.k] : [`c:${d.dm.scene}`, d.dm.planque])) if (!connus.has(f)) return f;
    return null;
  }
  const f = `${d.dm.cible}:${d.i}`;
  if (connus.has(f)) return null;
  if (d.k === 'moyens' && !mandatOk(aff, dossier, d.i)) return null;
  return f;
}
export function demarcheUtile(dossier, x, aff) { return !!pieceDemarche(aff, dossier, x); }

/**
 * Le fin mot de l'affaire, publié dans la Gazette à la clôture.
 * À la découverte, la traque commence : la planque reste secrète (`avecPlanque` = false).
 */
// ───── Le fin mot de l'affaire : un vrai récit, pour le coupable comme pour chaque innocent ─────
// Ce que cachaient les innocents qui ont menti sur leur soirée (jamais un crime, toujours une gêne).
const SECRETS = [
  (s) => `passait un entretien d’embauche chez un concurrent, et ne voulait surtout pas que ça se sache`,
  () => `jouait au poker dans l’arrière-salle d’un café, une habitude que sa famille croit abandonnée`,
  (s) => `aidait en cachette un frère endetté à déménager de nuit`,
  (s) => `répétait une pièce de théâtre amateur qu’${s.f ? 'elle' : 'il'} n’osait avouer à personne`,
  () => `dînait avec un ancien associé brouillé avec toute la famille, un rendez-vous qu’il valait mieux taire`,
  () => `rendait visite à une vieille tante en maison de repos, en cachette d’un frère avec qui c’est la guerre`,
  (s) => `faisait des heures au noir dans un restaurant pour boucler la fin du mois`,
];
// Ce qui rendait l'innocent suspect (le mobile qu'il avait vraiment, même s'il ne collait pas).
const MOBILE_RECIT = {
  argent: [(s) => `les dettes ${deN(s.prenom)} étaient bien réelles`, (s) => `${s.f ? 'elle' : 'il'} avait un huissier aux trousses`, (s) => `son compte était à sec depuis des mois`],
  vengeance: [(s, aff) => `${s.f ? 'elle' : 'il'} en voulait réellement ${aff.aVic}`, (s, aff) => `la brouille avec ${aff.vic} était connue de tous`, () => `les menaces lancées en public avaient marqué les esprits`],
  commande: [(s) => `${s.f ? 'elle' : 'il'} fréquentait bel et bien un receleur`, () => `son téléphone était plein d’appels vers le milieu`, () => `un receleur fiché figurait dans ses contacts`],
};
const MOYEN_RECIT = {
  cle: [(s, aff) => `${s.f ? 'elle' : 'il'} avait un jeu de clés ${aff.pres}`, () => `un double des clés traînait dans son tiroir`, (s) => `${s.f ? 'elle' : 'il'} n’avait jamais rendu ses clés`],
  code: [(s) => `${s.f ? 'elle' : 'il'} connaissait un code de l’alarme`, () => `son code d’alarme était toujours actif`, (s) => `${s.f ? 'elle' : 'il'} savait couper l’alarme`],
  volume: [(s) => `${s.f ? 'elle' : 'il'} avait une camionnette à disposition`, () => `un utilitaire dormait devant sa porte`, () => `un contrat de location de camionnette portait son nom`],
};

function recitInnocent(aff, x, k) {
  const il = x.f ? 'elle' : 'il', Il = cap(il), e = x.f ? 'e' : '';
  const r = makeRng(`${aff.titre}:${aff.n || ''}:${x.nom}:recit`);
  const manque = ELEMENTS.find((el) => !x.statut[el]);
  const a = x.alibi;
  // Pourquoi on a pu la ou le soupçonner.
  const soupcons = [];
  const mobVrai = MOB.filter((m) => x.mob[m]);
  const moyVrai = MOY.filter((m) => x.moy[m]);
  if (mobVrai.length) soupcons.push(MOBILE_RECIT[mobVrai.includes(aff.req.mob) ? aff.req.mob : r.pick(mobVrai)][(k + 1) % 3](x, aff));
  if (moyVrai.length) soupcons.push(MOYEN_RECIT[moyVrai.includes(aff.req.moy) ? aff.req.moy : r.pick(moyVrai)][k % 3](x, aff));
  if (a.type === 'mensonge') soupcons.push(`${il} avait menti sur sa soirée`);
  else if (a.type === 'seul') soupcons.push(`personne ne pouvait confirmer sa soirée`);
  const ouverture = [
    `${x.nom}, ${x.role}, avait tout ${x.f ? 'de la suspecte idéale' : 'du suspect idéal'}`,
    `Le dossier ${deN(x.nom)}, ${x.role}, a longtemps pesé lourd`,
    `On a beaucoup regardé du côté ${deN(x.nom)}, ${x.role}`,
  ][k % 3];
  let t = `${ouverture}${soupcons.length ? ` : ${soupcons.slice(0, 2).join(', et ')}` : ''}.`;
  // Ce qui l'innocente.
  if (manque === 'occ') {
    const plein = a.de <= aff.heure && a.a >= aff.fin;
    t += plein
      ? ` Mais à ${hm(aff.heure)}, ${il} était ${a.lieu} : ${a.preuve} l’attestent, de ${hm(a.de)} à ${hm(a.a)}.`
      : ` Mais ${il} était ${a.lieu} jusqu’à peu avant les faits (${a.preuve}) : le trou dans son alibi était bien trop court pour faire la route et revenir à temps.`;
  } else if (manque === 'moy') {
    t += {
      cle: ` Mais ${il} n’avait aucune clé ${aff.pres}, et la serrure avait été ouverte avec une vraie clé.`,
      code: ` Mais ${il} n’avait aucun code d’alarme valide, et l’alarme avait été coupée du premier coup.`,
      volume: ` Mais sans utilitaire, impossible d’emporter ${aff.butin} en un seul voyage.`,
    }[aff.req.moy];
  } else {
    t += {
      argent: ` Mais l’auteur voulait de l’argent vite, et ${il} n’en manquait pas.`,
      vengeance: ` Mais le saccage visait ${aff.vic} personnellement, et ${il} n’avait aucune raison de lui en vouloir.`,
      commande: ` Mais le vol avait été fait sur commande, et ${il} n’avait aucun lien avec le milieu du recel.`,
    }[aff.req.mob];
  }
  if (a.type === 'mensonge') t += ` Son mensonge ? ${Il} ${r.pick(SECRETS)(x)}.`;
  else if (a.type === 'seul' && manque !== 'occ') t += ` Ce soir-là, ${il} était vraiment ${a.solitaire}, et c’est tout.`;
  else if (manque !== 'occ' && r.chance(0.5)) t += ` ${Il} est sorti${e} de l’enquête soulagé${e}, mais pas indemne : tout le quartier en parle.`;
  return t;
}

export function recitFinal(aff, avecPlanque = true) {
  if (aff.recitFinal) return aff.recitFinal;
  const s = aff.suspects[aff.coupable], p = aff.planques[aff.planque];
  const il = s.f ? 'elle' : 'il', e = s.f ? 'e' : '';
  const mobile = { argent: `criblé${e} de dettes`, vengeance: `rongé${e} de rancune envers ${aff.vic}`, commande: `payé${e} par un receleur` }[aff.req.mob];
  const moyen = { cle: `est entré${e} avec une clé qu’${il} n’aurait jamais dû avoir`, code: `a coupé l’alarme avec le code qu’${il} connaissait`, volume: 'a tout emporté en un voyage grâce à un utilitaire' }[aff.req.moy];
  const occ = { partiel: 'son alibi avait un trou pile au moment des faits', seul: 'personne ne pouvait confirmer son alibi', mensonge: 'son alibi était un mensonge' }[s.alibi.type] || '';
  const cache = avecPlanque ? ` ${cap(il)} a caché le butin dans la planque « ${p.nom} » (${p.lieu}).` : ` Où ${il} se cache avec le butin reste à trouver : c’est l’enjeu de la traque.`;
  const innocents = aff.suspects.filter((x) => !x.coupable).map((x, k) => recitInnocent(aff, x, k));
  return `À ${hm(aff.heure)}, ${s.nom}, ${s.role} ${mobile}, ${moyen} ; ${occ}. ${cap(il)} ${s.roleDetail} : personne ne se méfiait.${cache}\n${innocents.join('\n')}`;
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
  if (state.carteDes == null) state.carteDes = n; // les affaires ouvertes depuis cette version se jouent avec le plan
  if (state.profDes == null) state.profDes = n; // … et en dossier complet (plan routier, journal, PV) depuis la suivante
  if (state.distinctDes == null) state.distinctDes = n; // deux affaires de suite n'ont plus le même décor
  const choisie = state.enquetePause && state.enquetePause.suivante && state.enquetePause.suivante !== 'rampe' && AFFAIRES_ECRITES.find((a) => a.cas === state.enquetePause.suivante && a.dispo(state));
  const rampeProgrammee = MEURTRE2.actif && state.meurtre2Des == null && ((state.enquetePause && state.enquetePause.suivante === 'rampe') || state.meurtre2Suivante);
  if (choisie) choisie.programmer(state, n); // affaire écrite choisie par le maître du jeu
  else if (rampeProgrammee) { state.meurtre2Des = n; delete state.meurtre2Suivante; } // la Rampe, programmée par le lancement : elle passe avant tout
  // Une affaire de meurtre écrite à la main, une fois par partie (jamais juste après la Rampe : un vol entre les deux).
  else if (state.meurtreDes == null && n >= 2 && !(state.meurtre2Des != null && n < state.meurtre2Des + MEURTRE2.ecart)) state.meurtreDes = n;
  else if (MEURTRE2.actif && state.meurtre2Des == null && state.meurtreDes != null && n >= state.meurtreDes + MEURTRE2.ecart) state.meurtre2Des = n; // … puis la seconde
  state.enquete = { n, jour: 1, nbCellules: 1, cellules: {}, rebonds: [], figee: false };
  repartirCellules(state);
  for (const z of Object.values(state.zones)) {
    if (z.enquete && z.enquete.n === n - 1 && !state.enquetePause) z.enquetePrecedente = z.enquete; // gardée pour la traque
    z.enquete = dossierDe(state, z);
  }
  delete state.enquetePause;
  return affaire(state, n);
}

/** Affaire n° n de cette partie (avec le plan des trajets si elle a été ouverte depuis son arrivée). */
export function affaire(state, n) {
  if (state.meurtreDes != null && n === state.meurtreDes) return affaireMeurtre(n);
  if (state.meurtre2Des != null && n === state.meurtre2Des) return affaireMeurtreRampe(n);
  return genererAffaire(state.seed, n, state.carteDes != null && n >= state.carteDes, state.profDes != null && n >= state.profDes, state.distinctDes);
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
  lancementRampe(state, push);
  if (state.enquetePause) {
    // Enquête en pause (affaire retirée par le maître du jeu) : seules les traques continuent.
    const prises = {};
    const prendre = (u, s, n) => { prises[u] = prises[u] || {}; prises[u][s] = (prises[u][s] || 0) + n; };
    const p = state.enquetePause;
    const res = { actifs: uids.length, n: p.n, titre: p.titre, jour: 0, pause: true, decouverte: null, arrestations: [], fuites: [], classee: false };
    for (const u of uids) if ((ord[u].demarches || []).length || ord[u].accusation != null) state.zones[u].rapport.push('Enquête : pas d’affaire en cours ce soir, tes démarches sont annulées. La nouvelle affaire s’ouvre ce soir.');
    traquesDuSoir(state, uids, ord, push, prendre, res);
    return { prises, res };
  }
  if (!state.enquete) nouvelleAffaire(state);
  const e = state.enquete;
  // Tant que personne n'a encore joué sur cette affaire, la répartition suit les arrivées.
  if (!e.figee) { repartirCellules(state); if (uids.length) e.figee = true; }
  const aff = affaire(state, e.n);
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
      if (!mes.has(p.f) || p.f === 'p:humidite' || (aff.rebonds && Object.values(aff.rebonds).some((r) => r.f === p.f))) continue;
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
    if (aff.meurtre) {
      // Confrontation : trois pièces que la zone a (ou connues de tous) opposées au suspect.
      const connus = new Set([...faitsConnus(d), 'doc:journal', 'doc:pvc', ...aff.suspects.map((_, k) => `A:${k}`)]);
      const pieces = (Array.isArray(ord[u].confront) ? ord[u].confront : []).filter((f) => typeof f === 'string' && connus.has(f)).slice(0, 3);
      if (a === aff.coupable && !confrontationOk(aff, a, pieces)) {
        z.reputation -= 1;
        z.rapport.push(`Enquête : confronté${aff.suspects[a].f ? 'e' : ''} à tes pièces, ${aff.suspects[a].nom} nie tout et repart libre. Tes pièces ne le mettaient pas face à ses contradictions (−1 de réputation). Tu peux recommencer demain avec d’autres pièces.`);
        continue;
      }
      d.accuse = a; d.accuseJ = e.jour;
      if (a === aff.coupable) { justes.push(u); continue; }
      d.exclu = true; z.reputation -= 3;
      z.rapport.push(`Enquête : ${aff.suspects[a].nom} n’avait rien à voir avec le meurtre ; le parquet te retire l’affaire (−3 de réputation). Tu peux encore aider les autres en partageant tes pièces.`);
      push(6, 'Enquête', `Fausse piste pour ${nomZone(z)}`, `Sa confrontation dans « ${aff.titre} » n’a rien donné. L’enquête continue pour les autres zones.`, u);
      continue;
    }
    d.accuse = a; d.accuseJ = e.jour;
    if (a === aff.coupable) justes.push(u);
    else {
      d.exclu = true; z.reputation -= 3;
      z.rapport.push(`Enquête : accusation ${deN(aff.suspects[a].nom)} rejetée par le parquet. Plus d’accusation possible sur cette affaire (−3 de réputation). Tu peux encore aider les autres en partageant tes pièces.`);
      // La Gazette ne dit pas qui a été accusé : le nom d'un innocent serait un indice gratuit pour toutes les zones.
      push(6, 'Enquête', `Fausse piste pour ${nomZone(z)}`, `Son accusation dans « ${aff.titre} » est rejetée par le parquet. L’enquête continue pour les autres zones.`, u);
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
    res.recit = recitFinal(aff, !!aff.meurtre);
    res.decouverte = { suspect: cs.nom, zones: justes.map((u) => nomZone(state.zones[u])), uids: justes, pts, contributeurs: [...contributeurs].map((u) => nomZone(state.zones[u])), contribUids: [...contributeurs] };
    if (aff.meurtre) {
      // Pas de traque : les aveux valent arrestation.
      for (const u of justes) { const z = state.zones[u]; z.stats.limier += POINTS.arrestation; z.stats.arrestations += 1; z.reputation += 3; z.rapport.push(`Enquête : ${cs.nom} passe aux aveux (+${POINTS.arrestation} pts d’enquête).`); ouvrirPrime(state, z, aff, cs.nom); }
      partsPrime(state, [], [...contributeurs], justes);
      // Le vrai mobile, nommé pendant la confrontation : un bonus pour qui a compris toute l'histoire.
      if (aff.mobiles) {
        const bons = justes.filter((u) => ord[u].mobile === aff.mobileVrai);
        for (const u of justes) {
          const z = state.zones[u];
          if (bons.includes(u)) { z.stats.limier += POINTS.mobile; z.reputation += 2; z.rapport.push(`Enquête : tu avais aussi compris pourquoi : « ${aff.mobiles[aff.mobileVrai]} » (+${POINTS.mobile} pts d’enquête, +2 de réputation).`); }
          else if (Number.isInteger(ord[u].mobile)) z.rapport.push(`Enquête : le mobile que tu avançais (« ${aff.mobiles[ord[u].mobile] || '?'} ») n’était pas le bon. Les aveux disent tout dans la Gazette.`);
        }
        res.mobileTrouve = bons.map((u) => nomZone(state.zones[u]));
      }
      res.arrestations.push({ titre: aff.titre, suspect: cs.nom, planque: '', zones: res.decouverte.zones });
      ajouterDebrief(res, () => construireDebrief(state, aff, 'aveux', { jour: e.jour, decouvreurs: justes, arreteurs: justes, mobileTrouve: res.mobileTrouve }));
      push(15, 'Aveux', `${aff.titre} : ${cs.nom} passe aux aveux`, `Confronté${cs.f ? 'e' : ''} à ses contradictions par ${res.decouverte.zones.join(' et ')}.${res.decouverte.contributeurs.length ? ` Avec les pièces de ${res.decouverte.contributeurs.join(', ')}.` : ''}`);
    } else push(14, 'Enquête', `${aff.titre} : ${cs.nom} identifié${cs.f ? 'e' : ''} par ${res.decouverte.zones.join(' et ')}`,
      `Mandat d’arrêt délivré. ${cs.f ? 'Elle' : 'Il'} se cache : la traque commence : une seule nuit pour l’arrêter, jusqu’à demain 20:00.${res.decouverte.contributeurs.length ? ` Avec les pièces de ${res.decouverte.contributeurs.join(', ')}.` : ''}`);
  }

  traquesDuSoir(state, uids, ord, push, prendre, res);
  return { prises, res };
}

/** Tours qui restent à une traque (celles ouvertes avant le passage à une nuit comptent comme les nouvelles). */
export const toursTraque = (tr) => Math.min(tr.tours, ENQ.traqueTours);
export const delaiTraque = (n) => (n <= 1 ? 'une seule nuit, jusqu’au prochain 20:00,' : `${n} tours`);

/** Traques en cours : interpellations (aussi pendant une pause de l'enquête). */
function traquesDuSoir(state, uids, ord, push, prendre, res) {
  // Les traques ouvertes quand elles duraient plus longtemps sont ramenées à la durée actuelle.
  for (const tr of state.traques || []) tr.tours = Math.min(tr.tours, ENQ.traqueTours);
  for (const tr of state.traques || []) {
    const a = affaire(state, tr.n);
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
        z._points += 6; z.satisfaction += 5; z.reputation += 3; z._ps += 10;
        z.rapport.push(`Traque : ${s.nom} arrêté${s.f ? 'e' : ''} à ${a.planques[a.planque].nom} (+${POINTS.arrestation} pts d’enquête).`);
        ouvrirPrime(state, z, a, s.nom);
      }
      partsPrime(state, tr.decouvreurs || [], tr.contributeurs || [], gagnants.map((g) => g.u));
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
      ajouterDebrief(res, () => construireDebrief(state, a, 'arrestation', { jour: tr.jour, decouvreurs: tr.decouvreurs || [], arreteurs: gagnants.map((g) => g.u) }));
    } else if (tr.tours <= 1) {
      res.fuites.push({ titre: a.titre, suspect: s.nom, planque: a.planques[a.planque].nom });
      push(9, 'Traque', `${s.nom} a pris la fuite`, `${s.f ? 'Elle' : 'Il'} se cachait à ${a.planques[a.planque].nom}. Personne n’est venu ${s.f ? 'la' : 'le'} chercher à temps.`);
      tr.fini = true;
      ajouterDebrief(res, () => construireDebrief(state, a, 'fuite', { jour: tr.jour, decouvreurs: tr.decouvreurs || [], arreteurs: [] }));
    }
  }
}

/** Débrief de fin d'affaire, publié dans la Gazette (une erreur de calcul ne doit jamais bloquer le tour). */
function ajouterDebrief(res, f) {
  try { (res.debriefs ||= []).push(f()); } catch (err) { console.error('débrief', err); }
}

/** Pendant la simulation d'une zone : démarches payées et résultats, enquête de voisinage. */
export function enqueteZone(state, z, o, zr, capa, pre) {
  if (!state.enquete || pre.res.decouverte) {
    if ((o.demarches || []).length && pre.res.decouverte) z.rapport.push('Enquête : l’affaire est résolue, tes démarches sont annulées.');
    return;
  }
  const e = state.enquete;
  const aff = affaire(state, e.n);
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
    if (!f) { if (dm && dm.k === 'moyens' && aff.meurtre && !mandatOk(aff, d, dm.i)) faites.push(`perquisition chez ${aff.suspects[dm.i].nom} refusée par le juge (aucune pièce sérieuse contre ${aff.suspects[dm.i].f ? 'elle' : 'lui'} au dossier)`); continue; }
    const cout = coutDemarche(state, z.uid, x);
    if (z.budget < cout) { faites.push(`${dm.dm.nom} refusée (budget insuffisant)`); continue; }
    z.budget -= cout;
    if (cout) (z._compta ||= []).push({ k: 'enquete', l: 'Démarches d’enquête', v: -cout });
    if (z._retardEnquete) { (z.enqueteDiffere ||= []).push({ f, n: e.n, src: dm.k }); faites.push(`« ${titrePiece(aff, f)} » (retardée d’un tour)`); continue; }
    d.pieces.push({ f, j: e.jour, src: dm.k });
    faites.push(`« ${titrePiece(aff, f)} »`);
  }
  if (faites.length) z.rapport.push(`Enquête : au dossier ce soir : ${faites.join(', ')}.`);
  if (aff.meurtre && o.reaud) reentendre(aff, z, d, o.reaud, e.jour);
  if (aff.recoupements && Array.isArray(o.recoup) && o.recoup.length === 2) recouper(aff, z, d, o.recoup, e.jour);
  if (aff.declics) declics(aff, z, d, e.jour);
  if (aff.hypothese && o.hypo) hypotheseAuJuge(aff, z, d, o.hypo);
  // Enquête de voisinage : plus on a de capacité de Recherche, plus elle rapporte ; une piste prioritaire la concentre.
  const piste = Number.isInteger(o.piste) && o.piste >= 0 && o.piste < aff.suspects.length ? o.piste : null;
  const surPiste = piste !== null && piecesLibres(aff).some((f) => !faitsConnus(d).includes(f) && Number(f.split(':')[1]) === piste);
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

export const REAUD = { cout: 1 };
/** Ce qu'une zone peut opposer à un suspect : ses pièces, le journal, le PV de constatations et les auditions. */
export function opposables(aff, dossier) {
  return new Set([...faitsConnus(dossier), 'doc:journal', 'doc:pvc', ...aff.suspects.map((_, k) => `A:${k}`)]);
}
/** Pièce qu'apporterait la réaudition du suspect i face à f (null si rien de neuf). */
export function pieceReaudition(aff, dossier, i, f) {
  const r = aff.reactions && aff.reactions[i] && aff.reactions[i][f];
  if (!r) return null;
  const p = `${r[0]}:${i}`;
  return faitsConnus(dossier).includes(p) ? null : p;
}
/** Réaudition (affaire de meurtre) : on oppose une pièce à un suspect ; certaines le font parler. */
function reentendre(aff, z, d, r, jour) {
  const i = r.i, s = aff.suspects[i];
  if (!s || !opposables(aff, d).has(r.f)) return;
  if (!mandatOk(aff, d, i)) { z.rapport.push(`Enquête : réaudition de ${s.nom} refusée par le magistrat (aucune pièce sérieuse contre ${s.f ? 'elle' : 'lui'} au dossier).`); return; }
  if (z.budget < REAUD.cout) { z.rapport.push(`Enquête : réaudition de ${s.nom} annulée (budget insuffisant).`); return; }
  z.budget -= REAUD.cout; (z._compta ||= []).push({ k: 'enquete', l: 'Démarches d’enquête', v: -REAUD.cout });
  const p = pieceReaudition(aff, d, i, r.f);
  if (!p) { z.rapport.push(`Enquête : réentendu${s.f ? 'e' : ''} face à « ${titrePiece(aff, r.f)} », ${s.nom} n’a rien à ajouter.`); return; }
  d.pieces.push({ f: p, j: jour, src: 'reaud' });
  z.rapport.push(`Enquête : réentendu${s.f ? 'e' : ''} face à « ${titrePiece(aff, r.f)} », ${s.nom} change de version (« ${titrePiece(aff, p)} »).`);
}

export const RECOUP = { cout: 1 };
/** Recoupement prévu par l'affaire pour ces deux pièces (dans un sens ou dans l'autre), ou null. */
export function recoupementDe(aff, a, b) {
  if (!aff.recoupements || !a || !b || a === b) return null;
  return aff.recoupements.find((r) => r.paires.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) || null;
}
/** Pièce qu'apporterait le recoupement de a et b (null si rien de neuf ou rien à en tirer). */
export function pieceRecoupement(aff, dossier, a, b) {
  const r = recoupementDe(aff, a, b);
  return r && !faitsConnus(dossier).includes(r.f) ? r.f : null;
}
/** Recoupement (affaire de meurtre) : deux pièces opposées l'une à l'autre ; certaines paires apprennent du neuf. */
function recouper(aff, z, d, [a, b], jour) {
  const op = opposables(aff, d);
  if (!op.has(a) || !op.has(b) || a === b) return;
  if (z.budget < RECOUP.cout) { z.rapport.push('Enquête : recoupement annulé (budget insuffisant).'); return; }
  z.budget -= RECOUP.cout; (z._compta ||= []).push({ k: 'enquete', l: 'Démarches d’enquête', v: -RECOUP.cout });
  d.recoups = [...(d.recoups || []).slice(-30), [a, b].sort()];
  const p = pieceRecoupement(aff, d, a, b);
  if (!p) { z.rapport.push(`Enquête : recoupement de « ${titrePiece(aff, a)} » et « ${titrePiece(aff, b)} » : rien de neuf.`); return; }
  d.pieces.push({ f: p, j: jour, src: 'recoup' });
  z.rapport.push(`Enquête : en recoupant « ${titrePiece(aff, a)} » et « ${titrePiece(aff, b)} », tes enquêteurs trouvent du neuf (« ${titrePiece(aff, p)} »).`);
}
/** Déclics : une pièce qui arrive d'elle-même quand le dossier contient certaines pièces. */
function declics(aff, z, d, jour) {
  const connus = new Set(faitsConnus(d));
  for (const x of aff.declics) {
    if (connus.has(x.f) || !x.si.every((f) => connus.has(f))) continue;
    d.pieces.push({ f: x.f, j: jour, src: 'declic' });
    z.rapport.push(`Enquête : ${x.rapport} (« ${titrePiece(aff, x.f)} »).`);
  }
}
/** Hypothèse soumise au juge : il la confronte au dossier de la zone, sans dire si elle est juste. */
function hypotheseAuJuge(aff, z, d, h) {
  const s = aff.suspects[h.i], c = aff.creneaux[h.s];
  if (!s || !c) return;
  const { pour, contre } = evaluerHypothese(new Set(opposables(aff, d)), h.i, h.s);
  const liste = (l) => l.slice(0, 4).map((f) => `« ${titrePiece(aff, f)} »`).join(', ') + (l.length > 4 ? ` et ${l.length - 4} autre${l.length > 5 ? 's' : ''}` : '');
  const t = `Le juge d’instruction a lu ton hypothèse (${s.nom}, ${c}). ${pour.length ? `${pour.length} pièce${pour.length > 1 ? 's' : ''} de ton dossier l’appui${pour.length > 1 ? 'ent' : 'e'}` : 'Aucune pièce de ton dossier ne l’appuie'}${contre.length ? ` ; ${contre.length} la contredi${contre.length > 1 ? 'sent' : 't'} : ${liste(contre)}. Explique-les avant de confronter.` : '. Rien dans ton dossier ne la contredit.'}`;
  z.rapport.push(`Enquête : ${t}`);
  d.hypos = [...(d.hypos || []).slice(-6), { i: h.i, s: h.s, pour: pour.length, contre }];
}

/** Une pièce inconnue sur un suspect donné. */
function pieceSur(aff, d, i, rng) {
  const connus = new Set(faitsConnus(d));
  const pool = piecesLibres(aff).filter((f) => !connus.has(f) && Number(f.split(':')[1]) === i);
  return pool.length ? rng.pick(pool) : null;
}

/** Une pièce inconnue, de préférence sur un suspect de sa cellule. */
function pieceHasard(state, z, aff, rng) {
  const connus = new Set(faitsConnus(z.enquete));
  const inconnues = piecesLibres(aff).filter((f) => !connus.has(f));
  const miennes = inconnues.filter((f) => dansMaCellule(state, z.uid, Number(f.split(':')[1])));
  const pool = miennes.length ? miennes : inconnues;
  return pool.length ? rng.pick(pool) : null;
}

/**
 * Coup de pouce du Directeur (témoin tardif) : une pièce qui écarte exactement UN suspect de plus,
 * jamais deux d'un coup, jamais d'indice de planque. Aucune pièce de ce genre : rien (null).
 * Le dossier d'une zone à la traîne avance d'un pas, sans la faire passer devant celles qui ont travaillé.
 */
export function pieceCoupDePouce(state, z, aff, rng) {
  const connus = [...new Set(faitsConnus(z.enquete))];
  const avant = candidats(aff, connus).suspects.length;
  if (avant <= 2) return null;
  const pool = (aff.faits || []).filter((f) => !connus.includes(f) && !f.startsWith('p:'))
    .filter((f) => avant - candidats(aff, [...connus, f]).suspects.length === 1);
  return pool.length ? rng.pick(pool) : null;
}

/** Bonus d’énigme : une pièce de l'affaire en cours. */
export function indiceBonus(state, z, rng) {
  if (!state.enquete || !z.enquete) return false;
  const aff = affaire(state, state.enquete.n);
  const f = pieceHasard(state, z, aff, rng);
  if (!f) return false;
  z.enquete.pieces.push({ f, j: state.enquete.jour, src: 'quete' });
  return true;
}

/** Après la simulation : fin de l'affaire, rebondissements, nouvelle affaire, traques. */
export function enquetePost(state, pre, push) {
  if (state.enquetePause) {
    state.traques = (state.traques || []).filter((t) => !t.fini).map((t) => ({ ...t, tours: t.tours - 1 }));
    const a = nouvelleAffaire(state);
    pre.res.nouvelle = a.titre;
    push(5, 'Nouvelle affaire', a.titre, `${a.texte} ${a.accroche || 'Cinq suspects : une seule personne réunit le mobile, le moyen et l’occasion.'}`);
    return;
  }
  const e = state.enquete;
  if (!e.figee) repartirCellules(state);
  if (!pre.res.actifs) return; // personne ne joue encore : l'affaire n'avance pas
  state.traques = (state.traques || []).filter((t) => !t.fini).map((t) => ({ ...t, tours: t.tours - 1 }));
  const accroche = 'Cinq suspects : une seule personne réunit le mobile, le moyen et l’occasion.';
  if (pre.res.decouverte) {
    if (!affaire(state, e.n).meurtre) state.traques.push({ n: e.n, jour: e.jour, tours: ENQ.traqueTours, decouvreurs: pre.res.decouverte.uids, contributeurs: pre.res.decouverte.contribUids || [] });
    const a = nouvelleAffaire(state);
    pre.res.nouvelle = a.titre;
    push(5, 'Nouvelle affaire', a.titre, `${a.texte} ${a.accroche || accroche}`);
  } else if (e.jour >= ENQ.dureeMax) {
    const a = affaire(state, e.n);
    const s = a.suspects[a.coupable];
    pre.res.classee = true;
    pre.res.recit = recitFinal(a);
    pre.res.solution = { suspect: s.nom, planque: a.meurtre ? '' : a.planques[a.planque].nom };
    ajouterDebrief(pre.res, () => construireDebrief(state, a, 'classee', { jour: e.jour }));
    push(8, 'Affaire classée', `« ${a.titre} » classée sans suite`, a.meurtre ? `Personne n’a obtenu d’aveux : c’était ${s.nom}.` : `Personne n’a trouvé : c’était ${s.nom}, caché${s.f ? 'e' : ''} à ${a.planques[a.planque].nom}.`);
    const b = nouvelleAffaire(state);
    pre.res.nouvelle = b.titre;
    push(5, 'Nouvelle affaire', b.titre, `${b.texte} ${b.accroche || accroche}`);
  } else if (e.sansAvance && e.sansAvance === state.nextDeadline) {
    delete e.sansAvance; // affaire ouverte à la main juste avant ce calcul : elle reste au jour 1
  } else {
    delete e.sansAvance;
    e.jour += 1;
    // Rebondissement du jour : publié à toutes les zones.
    const aff = affaire(state, e.n);
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
  const aff = affaire(state, e.n);
  return (e.rebonds || []).map((r) => ({ ...aff.rebonds[r.j], j: r.j }));
}
