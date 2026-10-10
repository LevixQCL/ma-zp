// Résolution d'un tour. Fonction pure et déterministe :
// mêmes données en entrée → même résultat, quel que soit l'ordinateur qui calcule.

import { VAGUES, vagueVisee, appliquerVague, vaguesNuit } from './vagues.js';
import { RELEVE, lireOrdresReleve, releveResoudre, releveNuit } from './releve.js';
import { lireOrdresCrise, crisePre, criseZone, crisePost } from './crise.js';
import { regrouperHonneur } from './honneur.js';
import { appuiResolution } from './appui.js';
import { BILAN, AGENTS_BASCULE, moyennesDistrict, calculerBilan, appliquerBilan, lireOrdresBilan, resoudreBilan } from './bilan.js';
import {
  APP_VERSION, NIVEAU_MAX, AFFAIRE, SERVICES, SERVICE_LABELS, SEASON_LENGTH, ECONOMIE, RYTHMES, DELAI_ACADEMIE, DUREE_FORMATION, INFRAS, PS,
  MIN_TOURS_CLASSEMENT, BUDGET_IPZ, HORS_REVENU, horsRevenu, START, DEPENSES, FLAGRANT, TERRAIN, DOSSIER, valeurDossier, RENFORT, BATIMENTS, BATIMENT_MAX, TRAVAUX_TOURS, USURE, ENIGMES, MORAL, CHEFS, ROLE_SERVICE, bonusChef, tauxRetourMoral, tauxDerive, DERIVE, bonusEquip, malusEtat, gainPrime, gainMoral, seuilChasse, gainRenfort, psEvenement, repRenfortAffaire, partieComplete, risqueBlessure, agentsFormation, chanceDelegue , PREPA } from './constants.js';
import { makeRng, hashString } from './rng.js';
import { QUIZ } from '../quests/quiz.js';
import { pistesDuSoir, lireOrdresPistes } from './pistes.js';
import { appliquerRegles, reglesV2, MAX_DEPENSES, pressionSaison, doctrineOuverte } from './regles.js';
import { REGLES, forceDoctrine, DOCTRINES, MAITRISE, coutPrime, aAnnexe } from './constants.js';
import { enquetePourTour, quatreComptePourTour, SLOT_QUATRE } from '../quests/quests.js';
import { jourBe } from './time.js';
import { attribuerSites, siteDe } from './sites.js';
import { genererEchos } from './gazette.js';
import { faireProgresser, surnomDe, intitule, verifierTrophees, donnerTrophee, TROPHEE, creerEquipe, appliquerNoms, missionsValides, figure, nomComplet, encadrement } from './equipe.js';
import {
  clone, clamp, round1, newZone, capaciteAgents, sanitizeOrders, autopilotOrders, agentsDisponibles, agentsLibres, capacite,
  forceEngagement, multAffaire, coutDecision, fraisFixes, ajusterBatiments, decisionImpossible, operationActive, ipzComposantes, ipzFrom, pointsIpz, moyenneIpz, moralMult, blessesActifs, migrateZone, effetsOperation, coutDepenses, ligneIpz, ouvrirJournal, jalon, noter, fermerJournal, vehiculesDisponibles,
} from './zone.js';
import { tourQuartiers, annoncerPointChaud, lirePatrouilles, assurerQuartiers, carteQuartiers } from './quartiers.js';
import { enquetePre, enqueteZone, enquetePost, nouvelleAffaire, indiceBonus, appliquerPrime, pieceSurSuspect, affaire, dossierDe, pieceGardeAVue } from './enquete.js';
import { fipaPre, fipaGenerer } from './fipa.js';
import { creerNonDroit, nonDroitResoudre } from './nondroit.js';
import { encheresResoudre, annoncerLot } from './encheres.js';
import { venteResoudre, annoncerVente } from './ventes.js';
import { rivalitesPre, rivalitesPost, themeActif, appliquerConsignes } from './rivalites.js';
import { pactesPre, pactesPost, lies, PACTE } from './pactes.js';
import { FLAGRANTS } from './contenu.js';
const SAISIES = ['une liasse de billets trouvée lors d’une fouille de véhicule', 'l’argent d’un point de deal démantelé pendant une intervention', 'une caisse noire découverte lors d’un différend familial', 'le butin d’un cambrioleur interpellé à la sortie', 'des billets cachés dans une voiture contrôlée', 'la recette d’un trafic de cigarettes saisie sur un marché'];
import { cabossesChoisis, placeLibre } from './parc.js';
import { ajouterVehicule, remplacerVehicule, retirerVehicule, usureDuTour, reviser, prixRevente, modeleDe, MODELES, heritageFlotte, bonusFilature, agentsMontes, primeVerte, bonusOrdre, RENDEMENT } from './flotte.js';
import { decorValide, earlyBirdEligible, skinDe, skinsValides, SKINS, periodeFete, ajouterSkin } from './decor.js';
import { primeChallenge, CHALLENGE } from './challenge.js';
import { courriersDuJour, appliquerParapheur, jourPrise, PRISE, PRISE_JOURS, AGENDA_JOUR } from './parapheur.js';
import { creerChef, lireAgenda, lireTalents, changerTalents, gainsDuJour, progresser, totalNiveaux, niveauChef, talentsDebloques, talent, TALENT, AGENDA, COMPETENCES, IDS_COMPETENCES, PARCOURS, CHEF, noterChef, signatureChef, faitsDArmes, JEUX_COMP, FRONT, RISQUE_FRONT, lireFront, RESEAU, IDS_RESEAU, RESEAU_REGLES, servicePossible, VOIES, brevetPossible, humeurReseau, tasserEstime } from './chef.js';
import { creerAdjoint, consigneDe, ordresAdjoint, noterJournal, ADJOINT, CONSIGNES } from './adjoint.js';
import { cleSemaine, semaineDe, tirerObjectifs, avancerObjectifs, texteObjectif, OBJECTIFS, apparier, scoreDuel, DUEL } from './chef-semaine.js';
import { separerIncidents, appliquerIncidents, remplirJauge, resultatsIncidents, incidentsVisibles, adapterCibleUrgence, NIVEAUX_URGENCE } from './incidents.js';
import { accidentVehicule, imageCabosses, payerIndemnites, reparerCabosses, coutCarrosserie } from './sinistres.js';
import { AFFAIRES_DISPUTEES, DOSSIERS_LOCAUX, PRESSION_WEEKEND } from './contenu.js';
import { imprevusDuJour, directeurNuit, directeurSoir, districtNuit, districtBilan, duoBilan, coopResoudre, enqueteDirecteur, memoirePlainte, formes, rangsEnigmes, adapterEnigmes, adapterIncidents, dirHeritage, parquetSoir, parquetDecouverte, DIR } from './directeur.js';

const fmt1 = (v) => String(round1(v)).replace('.', ',');
const median = (arr) => {
  if (!arr.length) return undefined;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const NOMS_CHALLENGE = { colis: 'Colis suspect', crochetage: 'Crochetage', depanneuse: 'Dépanneuse', dossier: 'Dossier à relire', empreintes: 'Empreintes', adn: 'Fragment d’ADN', reseau: 'Réseau à reconnecter', interception: 'Interception', bouclage: 'Maintien de l’ordre' };

export function zoneLabel(z) { return `ZP ${z.code} ${z.nom}`; }

/** Couleur de zone : « #RRGGBB » seulement (sinon undefined, et la zone garde la sienne). */
export const couleurValide = (c) => (typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : undefined);

/** Zone d'un nouveau joueur : ressources médianes des zones actives, sans infrastructure. */
export function buildJoinZone(state, uid, profile, turn = state.turn, arrivee = Date.now()) {
  const existants = Object.values(state.zones).filter((z) => isActive(z) && z.uid !== uid);
  const base = {};
  if (existants.length) {
    // Au plus 40 agents : c'est aussi le plafond des règles Firestore pour une zone qui rejoint la partie.
    base.agents = Math.min(40, Math.round(median(existants.map((z) => z.agents))));
    // Jamais plus que le budget de départ : arriver en cours de saison ne doit pas rapporter une caisse déjà pleine.
    base.budget = Math.min(START.budget, round1(median(existants.map((z) => z.budget))));
    base.moral = Math.round(median(existants.map((z) => z.moral)));
    base.satisfaction = Math.round(median(existants.map((z) => z.satisfaction)));
    base.niveaux = {}; base.equip = {};
    for (const s of SERVICES) {
      base.niveaux[s] = Math.round(median(existants.map((z) => z.niveaux[s])));
      base.equip[s] = Math.round(median(existants.map((z) => z.equip[s])));
    }
  }
  const z = newZone({ uid, code: profile.code, nom: profile.nom, couleur: couleurValide(profile.couleur) }, turn, { ...base, arrivee });
  // Site sensible : le même que celui que calculeraient tous les autres appareils.
  const tmp = { seed: state.seed, zones: { ...clone(state.zones || {}), [uid]: clone(z) } };
  attribuerSites(tmp);
  z.site = tmp.zones[uid].site;
  ajusterBatiments(z);
  // Règles v2 : les jours de la saison d'avant l'arrivée comptent à l'IPZ médian du district moins 5 (voir moyenneIpz).
  if (reglesV2(state) && existants.length && turn > 1) z.avantArrivee = { n: turn - 1, v: round1(Math.max(0, median(existants.map((x) => Number(x.ipz) || 50)) - 5)) };
  return z;
}

/**
 * Met un état enregistré par une ancienne version au format actuel :
 * les nouveaux champs reçoivent leur valeur par défaut, rien n'est effacé.
 */
export function migrateState(state) {
  if (!state) return state;
  const defaults = { version: 1, season: 1, turn: 1, zones: {}, affaires: [], evenement: null, affaireSeq: 0, palmares: [], minClientVersion: 0, enquete: null, enqueteSeq: 0, traques: [], fipas: [], fipaSeq: 0, fipaPaires: {}, pactes: [], pacteSeq: 0, defis: [], defiSeq: 0, conseil: null, theme: null, motionsChef: [], toursSansFaillite: 0, aReveler: [], enchere: null, enchereResultat: null, lotsRecents: [] };
  for (const [k, v] of Object.entries(defaults)) if (state[k] === undefined) state[k] = v;
  for (const z of Object.values(state.zones)) migrateZone(z);
  attribuerSites(state);
  // Zone de non-droit (ajoutée en cours de partie : elle part de zéro).
  if (!state.nonDroit || state.nonDroit.season !== state.season) state.nonDroit = creerNonDroit(state.seed, state.season);
  // Affaires d'avant la réforme : on leur donne une zone qui les dirige et un plafond d'agents.
  for (const a of state.affaires || []) {
    if (!a.zone || !state.zones[a.zone]) a.zone = zonePourAffaire(state, (x) => Math.abs(hashString(`${a.id}:${x.length}`)) % x.length);
    if (!a.agentsMax) a.agentsMax = (a.forceMin || 4) + 7;
  }
  return state;
}

/**
 * Zone qui dirigera une nouvelle affaire : jamais deux affaires dans la même zone tant qu'il reste
 * une zone libre ; on évite aussi les zones déjà prises par une opération d'envergure.
 * `choisir(liste)` renvoie un indice (hasard du tour ou hachage stable).
 */
function zonePourAffaire(state, choisir) {
  const toutes = Object.values(state.zones);
  if (!toutes.length) return null;
  const actives = toutes.filter(isActive);
  const pool = (actives.length ? actives : toutes).map((z) => z.uid).sort();
  const charge = (u) => state.affaires.filter((a) => a.zone === u).length;
  const occupee = (u) => { const z = state.zones[u]; return z.operation && state.turn >= z.operation.tourDebut && state.turn < z.operation.tourDebut + z.operation.duree ? 1 : 0; };
  const score = (u) => charge(u) * 2 + occupee(u);
  const min = Math.min(...pool.map(score));
  const libres = pool.filter((u) => score(u) === min);
  return libres[choisir(libres)];
}

/** Vrai si cet appareil utilise une version du jeu plus ancienne que celle de la partie. */
export function isOutdated(state) {
  return !!state && (state.minClientVersion || 0) > APP_VERSION;
}

export function isActive(z) { return z.toursSansOrdres < 3; }

/** Crée une nouvelle partie. */
export function createGame({ seed = 'delta', turnDeadline = 0, regles = 1 } = {}) {
  const state = {
    version: 1, minClientVersion: APP_VERSION, seed, season: 1, turn: 1, nextDeadline: turnDeadline, regles,
    zones: {}, affaires: [], evenement: null, affaireSeq: 0, palmares: [], createdAt: turnDeadline,
  };
  state.nonDroit = creerNonDroit(seed, 1);
  nouvelleAffaire(state);
  if (regles >= 2) annoncerVente(state, 1); else annoncerLot(state);
  return state;
}

// Les affaires disputées (dirigées par une zone qui acceptait ou non les candidatures) sont remplacées
// par la zone de non-droit, où personne n'a besoin d'être accepté. Plus aucune n'est créée ;
// celles encore ouvertes au moment de la mise à jour vont au bout de leurs tours.
function genererAffaires(state, rng) {
  const cible = 0;
  const deja = new Set(state.affaires.map((a) => a.titre));
  while (state.affaires.length < cible) {
    const titre = rng.pick(AFFAIRES_DISPUTEES.filter((t) => !deja.has(t)));
    deja.add(titre);
    const forceMin = rng.int(3, 7);
    // L'affaire éclate dans une zone (une zone sans affaire ni opération) : c'est elle qui la dirige.
    state.affaires.push({
      id: `a${state.season}-${++state.affaireSeq}`,
      titre, recompense: rng.int(6, 14), forceMin, forceConseillee: forceMin + 2, tours: 2,
      zone: zonePourAffaire(state, (l) => rng.int(0, l.length - 1)), agentsMax: forceMin + 7,
      pos: { x: rng.int(40, 320), y: rng.int(30, 300) },
    });
  }
}

/**
 * Résout le tour `state.turn`.
 * @param {object} state  état de la partie
 * @param {object} input  { orders: {uid: ordres}, quests: {uid: énigme}, players: {uid: profil} }
 * @returns {{ state: object, gazette: object }}
 */
export function resolveTurn(stateIn, { orders = {}, quests = {}, players = {}, nextWeekday = null, historiqueEnigmes = null, encheres = [] } = {}) {
  // Incidents du jour : tirés sur l'état d'avant la résolution, comme les joueurs les ont vus.
  // Ceux encore ouverts après 20:00 et pas encore joués sont reportés à la résolution de demain.
  const coursesUrgence = []; // temps des urgences jouées cette nuit : ajustent le temps cible de demain
  const incidentsAvant = Object.fromEntries(Object.keys((stateIn && stateIn.zones) || {}).map((u) => [u, separerIncidents(stateIn, u, resultatsIncidents(players[u], incidentsVisibles(stateIn, u)))]));
  const state = migrateState(clone(stateIn));
  appliquerRegles(state);
  state.minClientVersion = Math.max(state.minClientVersion || 0, APP_VERSION);
  const T = state.turn;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}`);
  const news = [];            // brèves de la Gazette
  const push = (prio, kicker, titre, texte, uid) => news.push({ prio, kicker, titre, texte, uid });

  // Early birds : les zones présentes à la première résolution après la mise à jour des skins.
  if (!state.earlyBird) state.earlyBird = { uids: Object.keys(state.zones || {}) };

  // 1. Joueurs inscrits sans zone (filet de sécurité) : ils jouent au tour suivant.
  for (const [uid, p] of Object.entries(players)) {
    if (state.zones[uid] || !p || p.retire || partieComplete(state, uid)) continue;
    state.zones[uid] = buildJoinZone(state, uid, p, T + 1, state.nextDeadline || 0);
    state.zones[uid]._annoncee = true;
    push(3, 'Bienvenue', `${zoneLabel(state.zones[uid])} rejoint le District Delta`, 'Nouvelle zone en service dès demain.', uid);
  }
  // Zone d'un nouveau joueur : écrite par son propre appareil à l'inscription. On la reconstruit ici avec les mêmes règles
  // (seuls le code, le nom, la couleur et l'heure d'arrivée viennent de lui) : personne ne peut s'inscrire avec un
  // classement, un chef ou des annexes « offerts ».
  // Zones connues = celles présentes à la fin du dernier calcul (liste écrite par le moteur seul : les règles Firestore
  // n'autorisent un joueur qu'à ajouter sa zone). Avant le premier calcul qui l'écrit, rien n'est vérifié.
  { const connues = Array.isArray(state.zonesConnues) ? new Set(state.zonesConnues) : null;
    for (const [uid, z] of Object.entries(state.zones)) {
      if (z._annoncee) continue; // créée par le filet de sécurité ci-dessus
      if (!connues || connues.has(uid)) continue;
      const autres = { ...state, zones: Object.fromEntries(Object.entries(state.zones).filter(([u]) => u !== uid)) };
      state.zones[uid] = buildJoinZone(autres, uid, { code: z.code, nom: z.nom, couleur: z.couleur }, T, Number(z.arrivee) || 0);
    } }
  for (const z of Object.values(state.zones)) {
    if (z.joinedTurn === T && z.toursJoues === 0) {
      if (z._annoncee) { delete z._annoncee; continue; } // déjà annoncée par le filet de sécurité
      push(3, 'Bienvenue', `${zoneLabel(z)} rejoint le District Delta`, 'Une nouvelle zone entre en service.', z.uid);
    }
  }
  // Mise à jour des noms, codes et couleurs (renommage) et retraits.
  for (const [uid, z] of Object.entries(state.zones)) {
    const p = players[uid];
    if (p) { if (p.nom) z.nom = String(p.nom).slice(0, 24); if (p.code) z.code = String(p.code).slice(0, 4); if (couleurValide(p.couleur)) z.couleur = p.couleur; if (p.equipeNoms) appliquerNoms(z.equipe, uid, p.equipeNoms); if (p.decor) z.decor = decorValide(z, p.decor);
      if (p.earlyBird && earlyBirdEligible(z, state) && !(z.skins || []).some((k) => SKINS[String(k).split(':')[0]] && String(k).split(':')[0] !== 'fete')) ajouterSkin(z, p.earlyBird.skin);
      if (p.skinsChoix) z.skinsChoix = skinsValides(z, p.skinsChoix); }
    if (p && p.retire) delete state.zones[uid];
  }

  // Une seule fois par partie : compteurs de carrière aux énigmes repris de l'historique des réponses (tours d'avant celui-ci).
  if (!state.enigCarriereInit && Array.isArray(historiqueEnigmes)) {
    for (const z of Object.values(state.zones)) z.enigCarriere = { ok: 0, n: 0, noirOk: 0, noirN: 0 };
    for (const r of historiqueEnigmes) {
      const z = r && state.zones[r.uid];
      if (!z || (r.statut !== 'ok' && r.statut !== 'rate') || (r.season === state.season && r.turn >= T)) continue;
      const c = z.enigCarriere;
      if (r.slot === 3) { c.noirN += 1; if (r.statut === 'ok') c.noirOk += 1; } else { c.n += 1; if (r.statut === 'ok') c.ok += 1; }
    }
    state.enigCarriereInit = true;
  }
  const uids = Object.keys(state.zones).filter((u) => state.zones[u].joinedTurn <= T).sort();
  const budget0 = Object.fromEntries(uids.map((u) => [u, state.zones[u].budget]));

  // 2. Ordres de chaque zone (joués ou pilote automatique).
  const ord = {};
  for (const uid of uids) {
    const z = state.zones[uid];
    z.rapport = [];
    // Premier soir de la saison 2 : l'adjoint existe déjà pour tenir une zone sans ordres (pas l'ancien pilote automatique).
    if (reglesV2(state) && z.chef && !z.adjoint) z.adjoint = creerAdjoint(uid, players[uid] && players[uid].chef && players[uid].chef.portrait);
    if (orders[uid]) {
      ord[uid] = sanitizeOrders(z, orders[uid], state);
      Object.assign(ord[uid], lireOrdresReleve(orders[uid]), lireOrdresCrise(orders[uid]), lireOrdresBilan(orders[uid]), lireOrdresPistes(orders[uid]));
      if (z.toursSansOrdres >= 3) z._retour = z.toursSansOrdres; // retour d'absence (accueilli par le Directeur)
      z.toursSansOrdres = 0;
      z.dernierOrdre = { alloc: ord[uid].alloc, rythme: ord[uid].rythme, patrouilles: ord[uid].patrouilles || {}, secteurs: ord[uid].secteurs || {}, roles: ord[uid].roles || {} };
      z._joue = true;
    } else {
      // Saison 2 : l'adjoint du chef tient la zone (selon la consigne laissée et le Commandement du chef).
      const adj = reglesV2(state) && z.chef && z.adjoint ? z.adjoint : null;
      const consigne = adj ? consigneDe(z, players[uid] && players[uid].chef) : null;
      ord[uid] = adj ? ordresAdjoint(z, state, consigne) : autopilotOrders(z, state);
      if (players[uid] && players[uid].consignes) ord[uid] = sanitizeOrders(z, appliquerConsignes(z, ord[uid], players[uid].consignes, state), state);
      z.toursSansOrdres += 1;
      z._joue = false;
      z.rapport.push(adj ? `Pas d’ordres ce tour : ton adjoint${adj.f ? 'e' : ''} ${adj.prenom} ${adj.nom} a tenu la zone (consigne « ${CONSIGNES[consigne].nom.toLowerCase()} »).` : 'Pas d’ordres ce tour : le pilote automatique a repris la dernière répartition.');
    }
    // Doctrine de la saison (règles v2) : choisie une fois, au plus tard en fin de 3e jour (sinon « sans doctrine »).
    if (doctrineOuverte(state, z) && orders[uid] && typeof orders[uid].doctrine === 'string' && Object.hasOwn(DOCTRINES, orders[uid].doctrine) && orders[uid].doctrine !== z.doctrine) {
      if (z.doctrine) z.doctrineRevue = true;
      z.doctrine = orders[uid].doctrine;
      z.maitrise = z.doctrinePrec === z.doctrine ? Math.min(2, (z.maitrisePrec || 0) + 1) : 0;
      z.rapport.push(`Doctrine de la saison : ${DOCTRINES[z.doctrine].nom}${z.maitrise ? ` (maîtrise ${z.maitrise + 1})` : ''}. Force : ${DOCTRINES[z.doctrine].force}. Prix : ${DOCTRINES[z.doctrine].prix}.`);
      push(3, 'Doctrine', `${zoneLabel(z)} choisit la doctrine ${DOCTRINES[z.doctrine].nom.toLowerCase()}`, `${DOCTRINES[z.doctrine].force}.`, uid);
    }
    // Chef de corps (saison 2) : création, parcours, talents (une fois par semaine), agenda du jour.
    if (reglesV2(state)) {
      const pf = players[uid] && players[uid].chef;
      if (!z.chef) z.chef = creerChef(pf);
      if (!z.adjoint) z.adjoint = creerAdjoint(uid, pf && pf.portrait);
      z.adjoint.consigne = consigneDe(z, pf);
      // Retour d'absence (3 jours ou plus) : services du réseau rouverts, expérience ×1,5 pendant 3 jours, journal de l'adjoint.
      if (z._retour && z._retour >= ADJOINT.retour.jours) {
        z.chef.services = {};
        z.chef.remise = T + ADJOINT.retour.duree - 1;
        z.retourChef = { tour: T, jours: z._retour, journal: (z.adjoint.journal || []).slice() };
        z.adjoint.journal = [];
        z.rapport.push(`Retour aux commandes : le réseau est prêt à te rendre service (tous les services rouverts) et ton chef progresse 50 % plus vite pendant ${ADJOINT.retour.duree} jours.`);
      }
      // Objectifs de la semaine (nouvelle semaine : nouveaux objectifs, l'estime du réseau se tasse d'un cran).
      if (!z.chef.objectifs || z.chef.objectifs.cle !== cleSemaine(state, T)) {
        if (z.chef.objectifs) tasserEstime(z.chef);
        z.chef.objectifs = tirerObjectifs(state, z, T);
      }
      if (!z.chef.defisVus) z.chef.defisVus = Object.fromEntries(Object.entries((players[uid] && players[uid].defis) || {}).map(([k, v]) => [k, Math.floor(Number(v) || 0)]));
      // Parcours : choisi une fois, il compte dès le soir où il est choisi.
      if (!z.chef.parcours && pf && Object.hasOwn(PARCOURS, pf.parcours)) z.chef.parcours = pf.parcours;
      // Parapheur du jour (calculé avant toute modification : le même qu'à l'écran) et prise de fonctions.
      z._para = courriersDuJour(state, z);
      z._paraRep = orders[uid] && orders[uid].parapheur && typeof orders[uid].parapheur === 'object' ? orders[uid].parapheur : null;
      // Prise de fonctions (jours joués) : ce qui n'est pas encore ouvert est ignoré, même dans un ordre forgé.
      if (z.chef.priseJ == null && !z.chef.priseFaite) z.chef.priseJ = z.chef.priseT != null ? Math.max(0, Math.min(PRISE_JOURS, T - z.chef.priseT)) : 0;
      const jp = jourPrise(z.chef, T);
      const ouvert = (k) => jp >= ((PRISE.find((x) => x.k === k) || { j: 0 }).j);
      // Chef blessé (première ligne) : à l'hôpital, talents coupés, agenda au bureau.
      z.chef.hs = z.chef.blesse != null && T <= z.chef.blesse;
      z._agenda = z.chef.hs ? { type: 'bureau' } : lireAgenda(orders[uid], state, uid);
      if (z._agenda && (AGENDA_JOUR[z._agenda.type] || 1) > jp) z._agenda = { type: 'bureau' };
      if (z.chef.hs) z.rapport.push(`Ton chef est à l’hôpital jusqu’au jour ${z.chef.blesse} : ses talents sont coupés et son agenda reste au bureau.`);
      if (orders[uid] && z.dernierOrdre) z.dernierOrdre.agenda = z._agenda;
      z._front = z.chef.hs || !ouvert('front') ? null : lireFront(orders[uid]);
      // Service demandé au réseau (une fois par semaine et par personnage, s'il est satisfait).
      { const sv = orders[uid] && orders[uid].reseau;
        if (typeof sv === 'string' && Object.hasOwn(RESEAU, sv) && !z.chef.hs && ouvert('reseau')) { const refus = servicePossible(z, sv, T); if (refus) z.rapport.push(`Réseau : ${RESEAU[sv].nom.toLowerCase()} ne peut pas t’aider (${refus}).`); else { z._service = sv; z.chef.services = { ...(z.chef.services || {}), [sv]: T }; z.chef.nbServices = (z.chef.nbServices || 0) + 1; } } }
      // Brevet de carrière (une fois, à 15 niveaux au total).
      { const br = orders[uid] && orders[uid].brevet;
        if (typeof br === 'string' && Object.hasOwn(VOIES, br) && brevetPossible(z.chef)) { z.chef.brevet = br; z.rapport.push(`Brevet de carrière : ${VOIES[br].nom}. Ton chef devient ${VOIES[br].titre.toLowerCase()} et gagne un 4e emplacement de talent (${VOIES[br].comps.map((c) => COMPETENCES[c].nom).join(' ou ')}).`); push(5, 'Carrière', `Le chef de ${zoneLabel(z)} obtient son brevet : ${VOIES[br].titre.toLowerCase()}`, VOIES[br].texte, uid); noterChef(z, 'brevet', `Brevet obtenu : ${VOIES[br].titre}.`); } }
      const lt = ouvert('talents') ? changerTalents(z.chef, lireTalents(orders[uid]), T) : null;
      if (lt) z.rapport.push(lt);
      z._chefAvant = { stats: { ...z.stats }, n: z.enquete && z.enquete.n, pieces: piecesPropres(z), lots: (z.lots || []).length };
      // Démolition d'une annexe (gratuite, sans remboursement) : libère un emplacement dès ce soir.
      const dm = orders[uid] && orders[uid].demolir;
      if (typeof dm === 'string' && Object.hasOwn(INFRAS, dm) && z.infra[dm]) { delete z.infra[dm]; z.rapport.push(`Annexe démolie : ${INFRAS[dm].nom}. Un emplacement est libre.`); }
      // Un jour de prise de fonctions de plus, seulement si le joueur a donné ses ordres.
      if (orders[uid] && !z.chef.priseFaite) { z.chef.priseJ = (z.chef.priseJ || 0) + 1; if (z.chef.priseJ >= PRISE_JOURS) z.chef.priseFaite = true; }
    } else delete z._agenda;
    // Mise à prix de l'enquête : le choix fait aujourd'hui (ou la confiscation par défaut).
    { const lp = appliquerPrime(z, ord[uid].prime, T, { services: SERVICES, niveauMax: NIVEAU_MAX }); if (lp) z.rapport.push(lp); }
    ord[uid].missions = missionsValides(ord[uid]);
    ord[uid].mission = ord[uid].missions[0] || null;
    z._missions = []; // rôles réellement partis en mission (renseignés par la zone de non-droit ou le renfort)
    z._points = 0;
    z._compta = z._compta || [];
    z._ps = 0;
    z._psEntraide = 0;
    // Photo d'avant le tour (pour les évolutions affichées au joueur) et journal des jauges.
    z.hier = { moral: z.moral, satisfaction: z.satisfaction, reputation: z.reputation, budget: z.budget, ipz: z.ipz, turn: T };
    ouvrirJournal(z);
  }
  const jalonTous = (label) => { for (const u of uids) jalon(state.zones[u], label); };
  // Chef de corps : visites croisées, parrainages, niveau moyen de la partie (rattrapage des arrivées tardives).
  let moyChef = 0;
  if (reglesV2(state)) {
    for (const u of uids) {
      const z = state.zones[u], a = z._agenda;
      z._croise = !!(a && a.type === 'voisin' && state.zones[a.zone] && state.zones[a.zone]._agenda && state.zones[a.zone]._agenda.type === 'voisin' && state.zones[a.zone]._agenda.zone === u);
    }
    // Audit du 9 octobre : une réunion « chez un voisin » ne rapporte qu'une fois par semaine avec le même chef
    // (deux amis qui se reçoivent chaque jour prenaient +1,5 d'IPZ, trois à quatre fois tout autre agenda).
    for (const u of uids) {
      const z = state.zones[u];
      if (!z._croise || !z.chef) continue;
      const vis = (z.chef.visites ||= {}), der = vis[z._agenda.zone];
      if (der != null && T - der < CHEF.semaine) { z._croise = false; z._croiseDeja = der; }
    }
    for (const u of uids) {
      const z = state.zones[u];
      if (!z._croise || !z.chef) continue;
      z.chef.visites[z._agenda.zone] = T;
      for (const [k, t] of Object.entries(z.chef.visites)) if (T - t >= CHEF.semaine) delete z.chef.visites[k];
    }
    for (const u of uids) {
      const z = state.zones[u], fu = orders[u] && orders[u].parrainer, f = typeof fu === 'string' && Object.hasOwn(state.zones, fu) && fu !== u ? state.zones[fu] : null;
      if (!f || !f.chef || !z.chef) continue;
      if (totalNiveaux(z.chef) < CHEF.parrainage.minParrain) { z.rapport.push(`Parrainage refusé : il faut ${CHEF.parrainage.minParrain} niveaux de compétence au total pour parrainer.`); continue; }
      if (totalNiveaux(f.chef) > CHEF.parrainage.maxFilleul || (f.chef.parrain && f.chef.parrain.fin >= T)) { z.rapport.push(`Parrainage refusé : ${zoneLabel(f)} a déjà un parrain ou assez d’expérience.`); continue; }
      const comp = IDS_COMPETENCES.slice().sort((a, b) => niveauChef(z.chef, b) - niveauChef(z.chef, a))[0];
      f.chef.parrain = { uid: u, comp, fin: T + CHEF.parrainage.jours - 1 };
      z.rapport.push(`Parrainage : tu prends sous ton aile le chef de ${zoneLabel(f)} pendant ${CHEF.parrainage.jours} jours (${COMPETENCES[comp].nom}).`);
      f.rapport.push(`Parrainage : le chef de ${zoneLabel(z)} te prend sous son aile. Pendant ${CHEF.parrainage.jours} jours, ta ${COMPETENCES[comp].nom.toLowerCase()} progresse 50 % plus vite.`);
      push(3, 'Parrainage', `${zoneLabel(z)} parraine ${zoneLabel(f)}`, 'Un chef expérimenté prend un nouveau sous son aile.', u);
    }
    // Le parrain gagne des PS d'entraide chaque jour où son filleul joue.
    for (const u of uids) { const p = state.zones[u].chef && state.zones[u].chef.parrain; if (p && p.fin >= T && orders[u] && state.zones[p.uid]) state.zones[p.uid]._psEntraide += CHEF.parrainage.ps; }
    const chefs = uids.map((u) => state.zones[u].chef).filter(Boolean);
    moyChef = chefs.length ? chefs.reduce((a, c) => a + totalNiveaux(c), 0) / chefs.length : 0;
    // Rivaux de la semaine : appariés le premier soir de la semaine (ou dès l'arrivée de la saison 2).
    if (!state.rivaux || state.rivaux.cle !== cleSemaine(state, T)) state.rivaux = { cle: cleSemaine(state, T), w: semaineDe(T), paires: apparier(state, uids, semaineDe(T)) };
    // Un chef qui revient ou arrive en cours de semaine reçoit le rival le plus proche (sans le lui retirer).
    else if (T % 7 !== 0) for (const u of uids) {
      const bot = (x) => String(x).startsWith('bot-'), humains = Object.keys(state.rivaux.paires).some((x) => !bot(x));
      if ((state.rivaux.paires[u] && state.zones[state.rivaux.paires[u]]) || !orders[u] || !state.zones[u].chef || (bot(u) && humains)) continue;
      const m = (z) => (z.toursJoues ? z.ipzSomme / z.toursJoues : 0), mz = m(state.zones[u]);
      const r = Object.keys(state.rivaux.paires).filter((x) => x !== u && state.zones[x] && !(humains && bot(x))).sort((a, b) => Math.abs(m(state.zones[a]) - mz) - Math.abs(m(state.zones[b]) - mz))[0];
      if (r) state.rivaux.paires[u] = r;
    }
  }

  // Bilan de fin de saison : remises en état payées ce soir (avant tout le reste, elles servent dès ce soir).
  for (const u of uids) resoudreBilan(state.zones[u], ord[u], T);

  // Relations entre zones : pactes, défis amicaux, coup de main, Conseil.
  pactesPre(state, uids, ord, push, T);
  const riv = rivalitesPre(state, uids, ord, push, T);
  jalonTous('Pactes, défis, Conseil');
  const theme = themeActif(state, T);
  // Salle des ventes : le lot gagné sert dès ce soir.
  // Saison 2 : vente aux enchères des saisies (deux jours, trois lots) à la place du lot du jour.
  const ench = reglesV2(state) ? venteResoudre(state, uids, orders, encheres, push, T) : encheresResoudre(state, uids, ord, push, T);
  jalonTous('Salle des ventes');

  // Enquête (partages, accusations, traques) et FIPA : avant la simulation des zones.
  // Les agents laissés sans affectation partent en premier (audition, traque, FIPA).
  for (const u of uids) ord[u]._libres = agentsLibres(state.zones[u], ord[u], T);
  const pre = enquetePre(state, uids, ord, push, T);
  parquetDecouverte(state, pre); // identification au stade du malus : mérite partagé
  // Appui fédéral (labo, RCCU) : pièces des analyses réussies aujourd'hui, équipes pour demain.
  appuiResolution(state, uids, ord, players, T, push);
  jalonTous('Enquête (partages, accusation, traque)');
  const fp = fipaPre(state, uids, ord, push, T);
  jalonTous('FIPA');
  // La relève : suspects en fuite pris en charge (ou non) par les zones voisines, saisies partagées.
  const rel = releveResoudre(state, uids, ord, push, T, zoneLabel);
  const fuites = []; // suspects qui filent ce soir : relèves proposées demain
  // Crise du district : vote du Conseil des chefs, opération commune de ce soir.
  const cri = crisePre(state, uids, ord, push, T, zoneLabel);
  jalonTous('Relève');

  // 3. Affaires disputées : la zone où l'affaire éclate la dirige ; les autres postulent,
  // et seules celles qu'elle accepte participent, dans la limite des places (agentsMax).
  for (const aff of state.affaires) {
    const chef = aff.zone && state.zones[aff.zone] ? aff.zone : null;
    const candidats = uids.filter((u) => u !== chef && ord[u].engagements[aff.id]);
    const rendre = (u, n, pourquoi) => {
      if (n <= 0) return;
      ord[u].alloc.intervention = (ord[u].alloc.intervention || 0) + n; // les agents restent au travail chez eux
      state.zones[u].rapport.push(`${aff.titre} : ${pourquoi} Tes ${n} agent${n > 1 ? 's' : ''} sont resté${n > 1 ? 's' : ''} en Intervention.`);
    };
    const eChef = chef && ord[chef].engagements[aff.id];
    if (!eChef || !eChef.agents) {
      for (const u of candidats) rendre(u, ord[u].engagements[aff.id].agents, `${chef ? zoneLabel(state.zones[chef]) : 'La zone'} n’a pas lancé l’affaire ce tour.`);
      continue;
    }
    let restant = aff.agentsMax || 99;
    const equipe = [];
    const nChef = Math.min(eChef.agents, restant);
    equipe.push({ u: chef, n: nChef }); restant -= nChef;
    if (eChef.agents > nChef) ord[chef].alloc.intervention += eChef.agents - nChef;
    const acceptes = (eChef.acceptes || []).filter((u) => candidats.includes(u));
    for (const u of acceptes) {
      const voulu = ord[u].engagements[aff.id].agents;
      const n = Math.min(voulu, restant);
      if (n > 0) { equipe.push({ u, n }); restant -= n; }
      if (voulu > n) rendre(u, voulu - n, n > 0 ? 'l’équipe était complète au-delà de ta part.' : 'l’équipe était déjà complète.');
    }
    for (const u of candidats) if (!acceptes.includes(u)) rendre(u, ord[u].engagements[aff.id].agents, 'candidature non retenue.');

    const force = equipe.reduce((s, x) => { const zx = state.zones[x.u], fr = zx._front === 'affaire' && zx.chef ? 1 + FRONT.affaire.force * niveauChef(zx.chef, 'commandement') : 1; if (fr > 1) zx._frontUtilise = `il a mené ton équipe sur « ${aff.titre} »`; return s + forceEngagement(zx, x.n, T) * fr; }, 0);
    if (force < aff.forceMin) {
      for (const x of equipe) state.zones[x.u].rapport.push(`${aff.titre} : force insuffisante (${fmt1(force)} sur ${aff.forceMin}), l’affaire reste ouverte.`);
      continue;
    }
    // Plus l'équipe est forte, plus l'affaire rapporte (de 60 % à 130 % des points annoncés).
    const mult = multAffaire(aff, force);
    const qualite = mult < 1 ? `dispositif juste suffisant, ${Math.round(mult * 100)} % des points` : mult > 1.001 ? `dispositif solide, ${Math.round(mult * 100)} % des points` : 'dispositif conseillé, 100 % des points';
    const total = aff.recompense * mult;
    const sommeN = equipe.reduce((s, x) => s + x.n, 0);
    for (const x of equipe) {
      const z = state.zones[x.u];
      const part = total * x.n / sommeN * (aAnnexe(z, 'cachots') ? 1 + INFRAS.cachots.points : 1);
      z._interpelle = true;
      z._points += part; z.stats.pointsAffaires += part; z.stats.affairesGagnees += 1; z.moral += 2;
      // Prime : de l'argent concret, partagé selon les agents engagés.
      const prime = round1(aff.recompense * mult * AFFAIRE.prime * x.n / sommeN);
      if (prime > 0) { z.budget += prime; z._compta.push({ k: 'affaire', l: `Prime d’affaire : ${aff.titre}`, v: prime }); }
      if (x.u === chef) { z.satisfaction += aff.recompense * 0.5 * mult; z.reputation += AFFAIRE.repChef + (equipe.length > 1 ? 1 : 0); if (equipe.length >= 3) z.stats.affairesOrchestre = (z.stats.affairesOrchestre || 0) + 1; }
      else z.reputation += repRenfortAffaire(x.n);
      jalon(z, `Affaire « ${aff.titre} » résolue (+2 de moral${x.u === chef ? `, satisfaction +${fmt1(aff.recompense * 0.5 * mult)} = moitié des points annoncés` : ''}${x.u === chef && equipe.length > 1 ? ', +1 réputation en chef d’équipe' : x.u !== chef ? ', réputation pour ton renfort' : ''})`);
      z.rapport.push(`${aff.titre} : affaire résolue${x.u === chef ? ' sous ta direction' : ` avec ${zoneLabel(state.zones[chef])}`} (prime +${fmt1(round1(aff.recompense * mult * AFFAIRE.prime * x.n / sommeN))} k€, +2 de moral, +${fmt1(part)} pts pour ${x.n} agent${x.n > 1 ? 's' : ''} ; force de l’équipe ${fmt1(force)}, ${qualite}).`);
      // Intervention musclée : plus on engage d'agents, plus le risque d'un blessé augmente.
      const risque = Math.min(0.3, Math.max(0, (x.n - 3) * 0.05)) * risqueBlessure(z);
      if (risque && makeRng(`${state.seed}:s${state.season}:t${T}:blesse:${aff.id}:${x.u}`).chance(risque)) {
        z.blesses.push({ n: 1, retour: T + 4, motif: 'blessé' }); z.moral -= 2;
        jalon(z, `Agent blessé sur « ${aff.titre} »`);
        z.rapport.push(`${aff.titre} : un agent blessé pendant l’interpellation, absent 3 tours (−2 de moral). Plus l’équipe engagée est grande, plus le risque monte.`);
      }
    }
    const aides = equipe.filter((x) => x.u !== chef).map((x) => zoneLabel(state.zones[x.u]));
    push(8 + aff.recompense / 4, 'Affaire résolue', `${zoneLabel(state.zones[chef])} boucle l’affaire : ${aff.titre.toLowerCase()}`,
      `${aff.recompense} points en jeu.${aides.length ? ` Avec l’appui de ${aides.join(', ')}.` : ' Sans aide extérieure.'}`, chef);
    aff._resolue = true;
    if (mult < 1) fuites.push({ de: chef, titre: aff.titre, cause: `${aff.titre} : dispositif juste suffisant` });
  }

  jalonTous('Affaires disputées');
  // 3 bis. Zone de non-droit : assauts, gardes, reprises, rechutes, débordement sur les quartiers voisins.
  const ndRes = nonDroitResoudre(state, uids, ord, push, T, zoneLabel);
  jalonTous('Zone de non-droit');
  // 4. Événement collectif.
  let evResultat = null;
  if (state.evenement && state.evenement.tour === T) {
    const ev = state.evenement;
    const actives = uids.filter((u) => state.zones[u].toursSansOrdres < 3 || ord[u].evenement > 0);
    const requis = Math.max(3, Math.round((ev.parZone || 3) * actives.length));
    const gainEv = ev.gain ?? 8, perteEv = ev.perte ?? 10;
    const total = uids.reduce((s, u) => s + ord[u].evenement, 0);
    const reussi = total >= requis;
    const absents = actives.filter((u) => ord[u].evenement === 0);
    for (const u of uids) {
      const z = state.zones[u];
      const c = ord[u].evenement;
      if (c > 0) {
        z.stats.contributions += 1;
        z._psEntraide += psEvenement(c);
        if (reussi) z.reputation += Math.max(1, Math.round(10 * c / total));
      } else if (actives.includes(u)) z.stats.evenementsManques += 1;
      if (c > 0) z._contribEvenement = true;
      if (c > 0 && reussi && ev.pts) z._points += ev.pts;
      if (c > 0 && reussi) jalon(z, 'Événement du district : ta part des agents envoyés');
      if (reussi) { z.satisfaction += gainEv; z.rapport.push(`${ev.titre} : réussi (+${gainEv} de satisfaction${c > 0 && ev.pts ? `, +${ev.pts} pts pour tes agents` : ''}).`); }
      else { z.satisfaction -= perteEv; z.rapport.push(`${ev.titre} : échec, ${total} agents sur ${requis} (−${perteEv} de satisfaction).`); }
    }
    evResultat = { titre: ev.titre, reussi, total, requis, absents: absents.map((u) => zoneLabel(state.zones[u])) };
    const fan = ev.fantome && state.dir && state.dir.fantome;
    if (fan) { fan.fini = true; fan.arrete = reussi; }
    push(12, ev.titre, fan ? (reussi ? `Fin de cavale : ${fan.nom} sous les verrous` : `${fan.nom.charAt(0).toUpperCase()}${fan.nom.slice(1)} file entre les doigts du district`) : reussi ? `Mission accomplie : ${total} agents pour ${requis} requis` : `Raté : ${total} agents pour ${requis} requis`,
      `${total} agents pour ${requis} requis. ${reussi ? `Tout le district gagne ${gainEv} points de satisfaction.` : `Tout le district perd ${perteEv} points de satisfaction.`}${!reussi && absents.length ? ` Aucun agent envoyé par : ${evResultat.absents.join(', ')}.` : ''}`);
    state.evenement = null;
  }

  jalonTous('Événement collectif');
  // 4 bis. Renforts prêtés pour une opération d'envergure (pour la journée).
  const renfortsRecus = {};
  for (const u of uids) {
    const r = ord[u].renfort;
    if (!r || !state.zones[r.cible]) continue;
    const z = state.zones[u], c = state.zones[r.cible];
    const op = operationActive(c, T);
    if (!op) continue;
    const mr = (ord[u].missions || []).find((m) => m.type === 'renfort');
    const mis = mr ? figure(z, mr.role) : null;
    const nChef = mis ? CHEFS.renfort.agents : 0;
    if (mis) { z._missions.push(mis.role); z.rapport.push(`Mission : ${nomComplet(mis)} encadre ton renfort chez ${zoneLabel(c)} (compte pour ${nChef} agent de plus dans son dispositif).`); }
    // Doctrine Partenaire : un agent de plus ; la maîtrise (force 1,15 puis 1,3) ajoute la fraction en réserve,
    // qui donne un deuxième agent une fois cumulée.
    let nDoc = 0;
    if (r.agents > 0) { const f = forceDoctrine(z, 'renfort'); nDoc = Math.floor(f); z.partenaireReste = round1((z.partenaireReste || 0) + f - nDoc); if (z.partenaireReste >= 1) { nDoc += 1; z.partenaireReste = round1(z.partenaireReste - 1); } }
    (renfortsRecus[r.cible] ||= []).push({ de: u, n: r.agents + nChef + nDoc, chef: mis ? nomComplet(mis) : null });
    let { rep, ps } = gainRenfort(r.agents);
    const appel = op.appel ? DIR.appel : 1;
    if (op.appel) { rep += 1; ps = Math.round(ps * appel); }
    if (talent(z, 'bonvoisin')) { rep += TALENT.bonvoisin.rep; noterChef(z, 'bonvoisin', `Bon voisin : ton renfort chez ${zoneLabel(c)} te vaut +1 de réputation.`); }
    z.reputation += rep; z._psEntraide += ps; z.stats.renfortsPretes = (z.stats.renfortsPretes || 0) + 1;
    const ptsR = round1(r.agents * RENFORT.pointsParAgent * appel);
    if (ptsR > 0) { z._points += ptsR; jalon(z, `Renfort prêté à ${zoneLabel(c)}`); }
    const jumeles = lies(state, u, r.cible, 'terrain', T);
    const indem = round1(r.agents * RENFORT.indemnite * appel * (jumeles ? PACTE.indemnite : 1));
    if (indem > 0) { z.budget += indem; z._compta.push({ k: 'renfort', l: `Indemnité fédérale de renfort (${r.agents} agent${r.agents > 1 ? 's' : ''})`, v: indem }); }
    z.rapport.push(`Renfort : ${r.agents} de tes agents aident ${zoneLabel(c)} sur « ${op.titre} » (+${rep} de réputation, +${ps} PS d’entraide, indemnité fédérale +${fmt1(indem)} k€${jumeles ? ', doublée par votre jumelage' : ''}${op.appel ? ' ; appel du district : renfort payé ×1,5' : ''}).`);
  }
  for (const [cible, l] of Object.entries(renfortsRecus)) {
    const n = l.reduce((a, b) => a + b.n, 0);
    const noms = l.map((x) => zoneLabel(state.zones[x.de]));
    push(7, 'Solidarité', `${noms.join(', ')} ${l.length > 1 ? 'volent' : 'vole'} au secours de ${zoneLabel(state.zones[cible])}`, `${n} agent${n > 1 ? 's' : ''} en renfort sur l’opération d’envergure.`, cible);
  }

  jalonTous('Renforts prêtés');
  // Le Directeur : fugitif à la frontière de deux zones (il faut les patrouilles des deux côtés).
  coopResoudre(state, uids, ord, push, T);
  jalonTous('Coopération (fugitif à la frontière)');
  // Le Directeur : rang aux énigmes, bilan de l'événement de district.
  const rangEnig = rangsEnigmes(state), districtRes = [];
  const capsSoir = {}; // capacités de chaque zone ce soir (vagues de délinquance pour demain)
  // 5. Simulation locale de chaque zone. Une erreur dans une zone ne bloque plus la partie : la zone garde son état
  // d'avant ce passage (son tour est sauté, c'est noté dans son rapport) et les autres continuent.
  const zonesEnErreur = [];
  for (const uid of uids) {
    const sauve = clone(state.zones[uid]);
    try {
    const z = state.zones[uid];
    const o = ord[uid];
    z.cetteNuit = []; // faits marquants de la nuit pour la carte « Cette nuit » de l'HP
    const zr = makeRng(`${state.seed}:s${state.season}:t${T}:${uid}`);
    const q = quests[uid];
    // Agenda du chef (saison 2).
    // Réseau : le service demandé ce soir, et la mauvaise humeur de ceux qui sont mécontents.
    if (z.chef && REGLES.v2) {
      const sv = z._service, Ld = niveauChef(z.chef, 'diplomatie');
      if (sv === 'bourgmestre') { const v = round1(2 + 0.2 * Ld); z.budget += v; z._compta.push({ k: 'agenda', l: 'Subside exceptionnel du bourgmestre', v }); }
      if (sv === 'syndicat') z.moral += 3;
      if (sv === 'journaliste') { z.satisfaction += 2; z.reputation += 1; }
      if (sv) { z.rapport.push(`Réseau : ${RESEAU[sv].nom.toLowerCase()} te rend service, ${RESEAU[sv].service} (${RESEAU[sv].geste(Ld)}).`); noterChef(z, `svc-${sv}`, `${RESEAU[sv].nom} te rend service : ${RESEAU[sv].geste(Ld)}.`); }
      const cr = makeRng(`${state.seed}:s${state.season}:t${T}:colere:${uid}`);
      for (const id of IDS_RESEAU) if (humeurReseau(z, id) < 0 && cr.chance(RESEAU_REGLES.colere)) {
        if (id === 'bourgmestre') { z.budget -= 1.5; z._compta.push({ k: 'alea', l: 'Subside gelé par le bourgmestre', v: -1.5 }); }
        if (id === 'procureur') z.reputation -= 1;
        if (id === 'syndicat') z.moral -= 2;
        if (id === 'journaliste') z.satisfaction -= 2;
        z.rapport.push(`Réseau : ${RESEAU[id].nom.toLowerCase()}, mécontent, ${RESEAU[id].colere}.`);
        (z.cetteNuit ||= []).push({ ico: '😠', t: `${RESEAU[id].nom}, mécontent, ${RESEAU[id].colere}.` });
      }
    }
    // Chef en première ligne au point chaud du quartier.
    if (z.chef && z._front === 'quartier') {
      const qq = assurerQuartiers(state, z), k = Object.keys(qq).sort((a, b) => qq[b] - qq[a])[0];
      if (k) { const d = 2 + niveauChef(z.chef, 'proximite'); qq[k] = clamp(qq[k] - d, 10, 95); z._frontUtilise = `il a passé la journée au point chaud du quartier (tension −${d})`; }
    }
    if (z.chef && z._agenda) {
      const a = z._agenda, A = AGENDA[a.type];
      let fx = A.effet;
      if (a.type === 'bureau' && z.paperasse > A.seuil) z.paperasse = Math.max(0, z.paperasse - A.paperasse);
      if (a.type === 'commune') { z.budget += A.budget; z._compta.push({ k: 'agenda', l: 'Réunion budgétaire à la commune', v: A.budget }); }
      if (a.type === 'quartier') z.satisfaction += A.satisfaction;
      if (a.type === 'terrain') fx = `${SERVICE_LABELS[a.service]} +${Math.round((A.cap - 1) * 100)} % aujourd’hui`;
      if (a.type === 'voisin') {
        const v = state.zones[a.zone];
        if (z._croise) { z._psEntraide += A.ps; z.reputation += A.rep;
          { const sv = (z.chef.souvenirs ||= []); const neuf = !sv.some((x) => x.u === a.zone && x.s === state.season); if (neuf) { sv.push({ u: a.zone, s: state.season, t: T }); z.chef.souvenirs = sv.slice(-6); }
            noterChef(z, 'visite', `Réunion avec le chef de ${zoneLabel(v)}${neuf ? ' : une photo souvenir rejoint ton bureau' : ''}.`); }
          fx = `réunion avec le chef de ${zoneLabel(v)}, venu chez toi le même jour : +${A.ps} PS d’entraide, +${A.rep} de réputation`; }
        else if (z._croiseDeja != null) fx = `réunion avec le chef de ${zoneLabel(v)}, mais vous vous êtes déjà réunis cette semaine (jour ${z._croiseDeja}) : pas de bonus avant le jour ${z._croiseDeja + CHEF.semaine}`;
        else fx = `visite à ${v ? zoneLabel(v) : 'une zone voisine'} (son chef n’est pas venu chez toi : pas de réunion)`;
      }
      z.rapport.push(`Agenda du chef : ${A.nom.toLowerCase()}, ${fx}.`);
    }
    // Parapheur du chef : les réponses aux courriers du jour (sans ordres, l'adjoint les classe sans effet).
    if (z.chef && z._para) z._paraGains = z._joue ? appliquerParapheur(state, z, z._paraRep, T, z._para) : appliquerParapheur(state, z, null, T, []);


    // Fins de formation, arrivées de l'académie.
    if (z.travaux && z.travaux.fin <= T) {
      const bt = z.travaux.batiment;
      z.batiments[bt] = Math.min(BATIMENT_MAX, z.batiments[bt] + 1);
      z.rapport.push(`Travaux terminés : ${BATIMENTS[bt].nom} au niveau ${z.batiments[bt]} (${BATIMENTS[bt].capacite(z.batiments[bt])} ${BATIMENTS[bt].unite}).`);
      push(3, 'Chantier', `${zoneLabel(z)} agrandit son ${BATIMENTS[bt].nom.toLowerCase()}`, `Niveau ${z.batiments[bt]} : jusqu’à ${BATIMENTS[bt].capacite(z.batiments[bt])} ${BATIMENTS[bt].unite}.`, uid);
      z.travaux = null;
    }
    payerIndemnites(z, T);
    for (const f of z.formations) if (f.fin === T && !f.fait) { z.niveaux[f.service] = Math.min(5, z.niveaux[f.service] + 1); z.rapport.push(`Formation terminée : ${SERVICE_LABELS[f.service]} passe au niveau ${z.niveaux[f.service]}.`); }

    // Aléa léger et coup dur (effets immédiats sur ce tour ou les suivants). `z.scene` les garde pour l'illustration de l'HP.
    z.scene = { tour: T };
    let adminMult = 1;
    // L'Accueil comme assurance : chaque agent au-delà de 2 évite 15 % des tracas internes (jusqu'à 60 %).
    const nAdmin = (o.alloc && o.alloc.admin) || 0;
    const protection = clamp(clamp((nAdmin - 2) * 0.15, 0, 0.6) + (nAdmin > 0 ? bonusEquip(z, 'admin', 'protection') : 0), 0, 0.85);
    const evite = (titre) => { z.rapport.push(`Évité : ${titre.charAt(0).toLowerCase()}${titre.slice(1)}. Ton Accueil (${nAdmin} agents) a paré le coup.`); z.stats.evites = (z.stats.evites || 0) + 1; };
    // Le Directeur choisit les imprévus du jour selon le ciel de la zone et ses faiblesses (plus de tirage fixe).
    const imp = imprevusDuJour(state, z, makeRng(`${state.seed}:s${state.season}:t${T}:dir-jour:${uid}`));
    if (imp.alea) {
      const a = imp.alea;
      const e = a.effet;
      if (a.interne && zr.chance(protection)) evite(a.titre);
      else {
        if (e.moral) z.moral += e.moral;
        if (e.budget) { z.budget += e.budget; z._compta.push({ k: 'alea', l: `Imprévu : ${a.titre || 'aléa'}`, v: e.budget }); }
        if (e.satisfaction) z.satisfaction += e.satisfaction;
        if (e.paperasse) z.paperasse = Math.max(0, z.paperasse + e.paperasse);
        if (e.adminMult) adminMult *= e.adminMult;
        if (e.vehiculeHS) { const sl = placeLibre(z, T); z.vehiculesHS.push({ retour: T + 1, ...(sl >= 0 ? { slot: sl } : {}) }); }
        if (e.bloques) z.blesses.push({ n: e.bloques, retour: T + 2, motif: a.id === 'greve' ? 'grève' : 'malade' });
        if (e.retardEnquete) z._retardEnquete = true;
        z.rapport.push(`${a.titre} : ${a.texte}${imp.pourquoiAlea ? ` Pourquoi ? ${imp.pourquoiAlea}.` : a.interne && protection < 0.6 ? ' (un Accueil plus fourni réduit ce risque)' : ''}`);
        jalon(z, `Imprévu : ${a.titre}`);
        z.scene.alea = a.id;
        push(2, 'Insolite', `${zoneLabel(z)} : ${a.titre.charAt(0).toLowerCase()}${a.titre.slice(1)}`, a.texte, uid);
      }
    }
    if (imp.heros) {
      const m = imp.heros.membre, gm = gainMoral(3, z.moral);
      z.moral += gm; z.satisfaction += 2;
      z.rapport.push(`Héros du jour : ${nomComplet(m)} ${imp.heros.exploit} (+${gm} de moral, +2 de satisfaction).`);
      jalon(z, 'Héros du jour');
      push(4, 'Héros du jour', `${zoneLabel(z)} : ${m.prenom} ${m.nom} ${imp.heros.exploit}`, 'Toute l’équipe est fière.', uid);
    }
    let coupDur = null;
    if (imp.coupDur) {
      coupDur = imp.coupDur;
      if (coupDur.interne && zr.chance(protection)) { evite(coupDur.titre); coupDur = null; }
    }
    if (!coupDur && z.renforceSuite >= 3 && o.rythme === 'renforce' && zr.chance(0.5)) coupDur = { id: 'epuisement', titre: 'Épuisement' };
    if (coupDur) {
      z.scene.coup = coupDur.id;
      let texte = '';
      switch (coupDur.id) {
        case 'rebellion': {
          // Avec le stand de tir, les agents maîtrisent mieux la situation : un seul blessé au plus.
          const n = z.infra.tir ? Math.min(1, zr.int(1, 2)) : zr.int(1, 2), duree = zr.int(2, 4);
          z.blesses.push({ n, retour: T + 1 + duree, motif: 'blessé' }); z.moral -= 4;
          texte = `${n} agent${n > 1 ? 's' : ''} blessé${n > 1 ? 's' : ''}, absent${n > 1 ? 's' : ''} ${duree} tours. −4 de moral.${z.infra.tir ? ' L’entraînement au stand de tir a limité les dégâts.' : ''}`; break;
        }
        case 'grippe': {
          const n = Math.max(1, Math.round(z.agents * zr.float(0.1, 0.2)));
          z.blesses.push({ n, retour: T + 3, motif: 'malade' });
          texte = `${n} agents malades, absents 2 tours.`; break;
        }
        case 'plainte': {
          const presse = memoirePlainte(z);
          const perte = Math.round((6 - presse.sat) * (talent(z, 'communicant') ? TALENT.communicant.presse : 1));
          if (talent(z, 'communicant')) noterChef(z, 'communicant', 'Communicant : la plainte médiatisée fait deux fois moins de dégâts.');
          z.satisfaction -= perte; z.blesses.push({ n: 1, retour: T + 3, motif: 'enquête interne' });
          texte = `−${perte} de satisfaction, un agent bloqué en administration 2 tours.${presse.texte}${talent(z, 'communicant') ? ' Ton talent de communicant a limité les dégâts.' : ''}`; break;
        }
        case 'panne': { adminMult = 0; texte = 'Administration à l’arrêt ce tour.'; break; }
        case 'epuisement': {
          z.blesses.push({ n: 1, retour: T + 6, motif: 'épuisé' });
          texte = 'Trop d’heures supplémentaires : un agent absent 5 tours.'; break;
        }
        default: break;
      }
      z.rapport.push(`Coup dur, ${coupDur.titre.toLowerCase()} : ${texte}${imp.pourquoi && coupDur.id !== 'epuisement' ? ` Pourquoi ? ${imp.pourquoi.charAt(0).toUpperCase()}${imp.pourquoi.slice(1)}.` : ''}`);
      z.dernierCoupDur = { titre: coupDur.titre, texte, tour: T };
      jalon(z, `Coup dur : ${coupDur.titre.toLowerCase()}`);
      push(coupDur.id === 'rebellion' ? 9 : 5, 'Coup dur', `${coupDur.titre} à ${zoneLabel(z)}`, texte, uid);
    }

    // Énigmes du jour (jusqu'à 3) : bonus au choix dès 2 bonnes réponses.
    let bonusService = null;
    const tous = (Array.isArray(q) ? q : q ? [q] : []);
    const ALT = ['delegue', 'quiz'];
    const qsTous = tous.filter((x, k) => x && (x.slot ?? k) !== 3 && !ALT.includes(x.statut));
    // Révision d'oct. 2026 : seules les 3 premières comptent ; la 4e est « pour le plaisir » (PS seulement).
    // Depuis le 10 oct. 2026 au soir, les 4 comptent de nouveau (3 au choix sur 4 pour la prime).
    const troisComptent = enquetePourTour(state.nextDeadline) && !quatreComptePourTour(state.nextDeadline);
    const qs = troisComptent ? qsTous.filter((x) => x.slot !== SLOT_QUATRE) : qsTous;
    const plaisir = troisComptent ? qsTous.filter((x) => x.slot === SLOT_QUATRE && x.statut === 'ok').length : 0;
    if (plaisir) { z._ps += PS.queteOk; z.rapport.push(`4e énigme (pour le plaisir) réussie : +${PS.queteOk} PS.`); }
    // Énigme d'enquête réussie : une pièce sur la piste prioritaire (ou sur un suspect encore possible).
    for (const x of qs) if (x.enquete && x.statut === 'ok') {
      const pc = pieceSurSuspect(state, z, o.piste, makeRng(`${state.seed}:s${state.season}:t${T}:enigme-enq:${uid}`), 'enigme');
      const aff0 = pc && affaire(state, state.enquete.n);
      z.rapport.push(pc ? `Énigme d’enquête réussie : une pièce de plus sur ${aff0.suspects[pc.i].nom}, dans ton dossier.` : 'Énigme d’enquête réussie, mais il n’y avait plus rien à trouver sur tes suspects.');
      if (pc) (z.cetteNuit ||= []).push({ ico: '🧩', t: `Ton énigme d’enquête a payé : une pièce de plus sur ${aff0.suspects[pc.i].nom}.` });
    }
    const noir = tous.find((x, k) => x && (x.slot ?? k) === 3);
    if (noir && noir.statut === 'ok') { paliersEnigmes(z, 1); z.stats.noirs = (z.stats.noirs || 0) + 1; z._ps += PS.noir; z.rapport.push(`Dossier noir résolu : chapeau (+${PS.noir} PS).`); }
    else if (noir && noir.statut === 'rate') z.rapport.push('Dossier noir : raté cette fois, sans conséquence.');
    const ok = qs.filter((x) => x.statut === 'ok').length;
    const faux = qs.filter((x) => x.statut === 'rate').length;
    // Compteurs de carrière (classement « Esprit vif ») : tenus ici, plus besoin de relire toutes les réponses de la partie.
    { const c = (z.enigCarriere ||= { ok: 0, n: 0, noirOk: 0, noirN: 0 }); c.ok += ok; c.n += ok + faux;
      if (noir && (noir.statut === 'ok' || noir.statut === 'rate')) { c.noirN += 1; if (noir.statut === 'ok') c.noirOk += 1; } }
    const appliquerBonus = (b) => {
      if (b.bonus === 'moral') { const g = gainMoral(ENIGMES.bonusMoral, z.moral); z.moral += g; return `bonus +${g} de moral`; }
      if (b.bonus === 'budget' || (b.bonus === 'indice' && (!state.enquete || state.enquetePause))) {
        z.budget += ENIGMES.bonusBudget; z._compta.push({ k: 'bonus', l: 'Bonus d’énigmes', v: ENIGMES.bonusBudget });
        return b.bonus === 'budget' ? `bonus +${ENIGMES.bonusBudget} k€` : `pas d’enquête en cours : bonus converti en +${ENIGMES.bonusBudget} k€`;
      }
      if (b.bonus === 'indice') return indiceBonus(state, z, zr) ? 'bonus +1 indice d’enquête' : 'bonus indice (rien de nouveau à trouver)';
      if (b.bonus === 'capacite' && SERVICES.includes(b.service)) { bonusService = b.service; return `bonus +${Math.round((ENIGMES.bonusCapacite - 1) * 100)} % en ${SERVICE_LABELS[b.service]}`; }
      return null;
    };
    // Énigmes confiées à un agent : seulement si le joueur n'a répondu à aucune énigme du jour.
    const delegue = !qs.length ? tous.find((x, k) => x && (x.slot ?? k) !== 3 && x.statut === 'delegue') : null;
    if (delegue) {
      z._delegue = true;
      const chance = chanceDelegue(z.moral);
      const reussi = makeRng(`${state.seed}:s${state.season}:t${T}:delegue:${uid}`).chance(chance);
      const t = reussi ? appliquerBonus(delegue) : null;
      z.rapport.push(reussi && t
        ? `Énigmes confiées à un agent : il a trouvé ! ${t.charAt(0).toUpperCase()}${t.slice(1)}.`
        : `Énigmes confiées à un agent : il a séché (${Math.round(chance * 100)} % de chances avec ce moral). Pas de bonus aujourd’hui, sans autre conséquence.`);
    }
    // Quiz express (alternative aux énigmes) : le nombre de bonnes réponses est gardé dans « tentatives ».
    const quiz = !qs.length ? tous.find((x, k) => x && (x.slot ?? k) !== 3 && x.statut === 'quiz') : null;
    if (quiz) {
      const bons = Math.max(0, Math.min(QUIZ.questions, Math.floor(Number(quiz.tentatives) || 0)));
      if (bons >= QUIZ.seuil) {
        const t = appliquerBonus(quiz.bonus ? quiz : { bonus: 'budget' });
        z.rapport.push(`Quiz express : ${bons} bonnes réponses sur ${QUIZ.questions}${t ? `, ${t}` : ''}${quiz.bonus ? '' : ' (bonus non choisi : argent par défaut)'}.`);
      } else z.rapport.push(`Quiz express : ${bons} bonne${bons > 1 ? 's' : ''} réponse${bons > 1 ? 's' : ''} sur ${QUIZ.questions}, il en fallait ${QUIZ.seuil}. Pas de bonus, sans autre conséquence.`);
    }
    if (qs.length) {
      z.stats.quetesOk += ok;
      z._ps += ok * PS.queteOk + faux * PS.queteTentee;
      if (faux && ENIGMES.rateeMoral) { z.moral -= faux * ENIGMES.rateeMoral; jalon(z, `Énigmes : ${faux} mauvaise${faux > 1 ? 's' : ''} réponse${faux > 1 ? 's' : ''} (−${ENIGMES.rateeMoral} de moral chacune)`); }
      const b = qs.find((x) => x.bonus);
      let txt = `Énigmes du jour : ${ok} bonne${ok > 1 ? 's' : ''} réponse${ok > 1 ? 's' : ''} sur ${qs.length}${faux && ENIGMES.rateeMoral ? ` (−${faux * ENIGMES.rateeMoral} de moral)` : ''}`;
      if (ok >= 2 && b) { const t = appliquerBonus(b); if (t) txt += `, ${t}`; }
      jalon(z, 'Énigmes : bonus choisi');
      if (ok >= ENIGMES.primeSeuil) { const sf = ENIGMES.sansFaute, g = gainMoral(sf.moral, z.moral); z._ps += sf.ps; z.budget += sf.budget; z.moral += g; if (sf.budget) z._compta.push({ k: 'bonus', l: 'Prime « sans faute » (énigmes)', v: sf.budget }); if (sf.jauge) z.jaugeIncidents = (z.jaugeIncidents || 0) + sf.jauge;
        txt += `, prime des ${ENIGMES.primeSeuil} réussies : ${[sf.budget ? `+${sf.budget} k€` : '', g ? `+${g} de moral` : '', `+${sf.ps} PS`, sf.jauge ? `+${sf.jauge} sur la jauge des skins` : ''].filter(Boolean).join(', ')}`; }
      paliersEnigmes(z, ok);
      z.rapport.push(`${txt}.`);
    }
    // Le Directeur ajuste le niveau des énigmes de demain (réussites récentes et classement aux énigmes).
    adapterEnigmes(z, ok, ok + faux, rangEnig[uid]);
    // Pistes en cours : résultats arrivés à terme, puis pistes lancées ce soir.
    z.rapport.push(...pistesDuSoir(state, z, o.pistesNew, T, makeRng(`${state.seed}:s${state.season}:t${T}:pistes:${uid}`)));

    jalon(z, 'Énigmes : sans faute (+2 de moral)');
    // Incidents du jour (mini-jeux) : réussite, échec, ou équipe livrée à elle-même.
    const incs = incidentsAvant[uid] || { maintenant: [], reportes: [] };
    if (incs.reportes.length) z.incidentsReportes = incs.reportes; else delete z.incidentsReportes;
    if (incs.maintenant.length) {
      const resInc = Object.values(resultatsIncidents(players[uid], incs.maintenant));
      // L'urgence a son propre réglage (temps cible ajusté sur toute la partie) : elle ne pousse pas le niveau du Directeur.
      const comptes = Object.values(resultatsIncidents(players[uid], incs.maintenant.filter((i) => !i.urgence))).filter((x) => x.statut !== 'passe');
      adapterIncidents(z, comptes.filter((x) => x.statut === 'ok').length, comptes.length);
      const inc = appliquerIncidents(z, { incidents: incs.maintenant, resultats: resultatsIncidents(players[uid], incs.maintenant), alloc: o.alloc || {}, T, rng: makeRng(`${state.seed}:s${state.season}:t${T}:incidents-res:${uid}`), indice: () => indiceBonus(state, z, zr) });
      z.rapport.push(...inc.lignes);
      for (const i of incs.maintenant) {
        const r0 = i.urgence && resultatsIncidents(players[uid], [i])[i.id];
        if (r0 && (r0.statut === 'ok' || r0.statut === 'rate') && r0.raison !== 'hs' && Number.isFinite(Number(r0.temps))) {
          const niveau = NIVEAUX_URGENCE.includes(r0.niveau) ? r0.niveau : i.diff;
          const vh = (i.vehicules || []).find((x) => x.slot === r0.vehicule);
          coursesUrgence.push({ niveau, temps: Math.max(10, Math.min(900, Number(r0.temps))), vit: vh ? vh.mult : Number.isFinite(i.vit) ? i.vit : 1 });
        }
      }
      if (inc.skin) push(3, 'Décor', `${zoneLabel(z)} décroche le skin « ${inc.skin.nom} »`, 'Jauge des skins remplie à force d’interventions réussies.', uid);
    }
    jalon(z, 'Incidents du jour');
    // Situation du jour (annoncée au début du tour).
    const pr = {};
    for (const p of z.pressions || []) Object.assign(pr, p.effet);
    if (pr.criminalite) z.criminalite = clamp(z.criminalite + pr.criminalite, 10, 95);
    if (pr.paperasse) z.paperasse += pr.paperasse;

    // Opération d'envergure : ses agents quittent leur service pour la journée.
    const opx = effetsOperation(z, o.alloc, o.operation, T);
    const alloc = opx.eff;
    // Agents partis en traque, en audition ou en FIPA : d'abord ceux laissés sans affectation, puis les services.
    let libres = agentsLibres(z, o, T);
    for (const pr2 of [pre.prises[uid], fp.prises[uid], rel.prises[uid], cri.prises[uid]]) {
      if (!pr2) continue;
      for (const [s, n0] of Object.entries(pr2)) { const k = Math.min(libres, n0); libres -= k; alloc[s] = Math.max(0, (alloc[s] || 0) - (n0 - k)); }
      const n = Object.values(pr2).reduce((a2, b2) => a2 + b2, 0);
      if (n && pr2 === rel.prises[uid]) z.rapport.push(`Relève : ${n} agent${n > 1 ? 's' : ''} d’Intervention sur le suspect en fuite.`);
      if (n && pr2 === fp.prises[uid]) z.rapport.push(`FIPA : ${n} agent${n > 1 ? 's' : ''} mobilisé${n > 1 ? 's' : ''} sur le dispositif commun.`);
    }
    // Agent chargé des énigmes du jour : pendant qu'il planche, sa paperasse prend du retard.
    if (z._delegue) { delete z._delegue; z.paperasse += ENIGMES.delegue.paperasse; }
    if (opx.op && renfortsRecus[uid]) {
      const besoin = Object.values(opx.op.besoins).reduce((a, b) => a + b, 0) || 1;
      const recu = renfortsRecus[uid].reduce((a, b) => a + b.n, 0);
      opx.couverture = Math.min(1, opx.couverture + recu / besoin);
      z.rapport.push(`Renfort reçu : ${renfortsRecus[uid].map((x) => `${x.n} agent${x.n > 1 ? 's' : ''} de ${zoneLabel(state.zones[x.de])}`).join(', ')}.`);
    }
    if (opx.op) {
      const op = opx.op;
      op.couvertures = [...(op.couvertures || []), round1(opx.couverture)];
      const n = Object.values(opx.pris).reduce((s2, v) => s2 + v, 0);
      z.rapport.push(`${op.titre} : ${n} agent${n > 1 ? 's' : ''} mobilisé${n > 1 ? 's' : ''} (${Math.round(opx.couverture * 100)} % du dispositif requis).`);
      // Règles v2 : un dispositif complet fatigue (un agent en récupération demain).
      if (REGLES.v2 && (o.operation || 'complet') === 'complet' && n >= 4) { z.blesses.push({ n: 1, retour: T + 2, motif: 'en récupération' }); z.rapport.push('Dispositif complet : un agent en récupération demain.'); }
      if (T === op.tourDebut + op.duree - 1) {
        const moy = op.couvertures.reduce((s2, v) => s2 + v, 0) / op.couvertures.length;
        if (moy >= 0.9) {
          z._points += op.recompense; z.satisfaction += 6; z.reputation += 3; z.moral += 2;
          z.rapport.push(`${op.titre} : opération réussie (+${op.recompense} pts, +6 de satisfaction).`);
          push(10, 'Opération réussie', `${zoneLabel(z)} : ${op.titre.charAt(0).toLowerCase()}${op.titre.slice(1)}, dispositif exemplaire`, `Tous les services ont tenu. +${op.recompense} points.`, uid);
        } else if (moy >= 0.5) {
          const pts = Math.round(op.recompense * 0.4);
          z._points += pts; z.satisfaction += 1;
          z.rapport.push(`${op.titre} : réussite partielle, dispositif incomplet (+${pts} pts).`);
          fuites.push({ de: uid, titre: op.titre, cause: `${op.titre} réussie à moitié` });
          push(6, 'Opération', `${zoneLabel(z)} : ${op.titre.charAt(0).toLowerCase()}${op.titre.slice(1)}, résultat mitigé`, 'Le dispositif était incomplet.', uid);
        } else {
          z.satisfaction -= 10; z.moral -= 4; z.reputation -= 2;
          z.rapport.push(`${op.titre} : échec, dispositif insuffisant (−10 de satisfaction, −4 de moral).`);
          push(11, 'Fiasco', `${op.titre} : ${zoneLabel(z)} dépassée`, 'Le dispositif engagé était bien trop léger. La population ne comprend pas.', uid);
        }
      }
    }

    jalon(z, 'Opération d’envergure');
    // Dépenses du jour (payées seulement si le budget le permet).
    const dep = o.depenses || {};
    const achete = new Set();
    let reserve = 0;
    if (dep && coutDepenses(dep, z) > 0) {
      const achats = [];
      let paye = 0;
      // Règles v2 : deux dépenses par jour au plus (la carrosserie, une réparation, ne compte pas).
      let nbDep = 0;
      const payer = (k, cout, fn, compte = true) => {
        // Talent « Rallonge budgétaire » : une 3e dépense, une fois par semaine.
        const rallonge = talent(z, 'rallonge') && !(z.chef.rallongeT != null && T < z.chef.rallongeT + CHEF.semaine);
        if (compte && REGLES.v2 && nbDep >= MAX_DEPENSES + (rallonge ? 1 : 0)) { achats.push(`${k} (refusé : ${MAX_DEPENSES} dépenses par jour au plus)`); return false; }
        if (compte && REGLES.v2 && nbDep >= MAX_DEPENSES && rallonge && z.budget >= cout) { z.chef.rallongeT = T; achats.push('rallonge budgétaire utilisée'); noterChef(z, 'rallonge', 'Rallonge budgétaire : une 3e dépense acceptée aujourd’hui.'); }
        if (z.budget >= cout) { z.budget -= cout; paye += cout; fn(); achats.push(k); if (compte) nbDep += 1; return true; }
        achats.push(`${k} (refusé : budget insuffisant)`); return false;
      };
      if (dep.reserve) payer(`${dep.reserve} agent${dep.reserve > 1 ? 's' : ''} de réserve en ${SERVICE_LABELS[dep.reserveService]}`, dep.reserve * DEPENSES.reserve.cout, () => { reserve = dep.reserve; });
      if (dep.prime) { const g = gainPrime(z.moral), cp = coutPrime(z, T); if (payer(`prime au personnel (+${g} de moral${cp > DEPENSES.prime.cout ? ', prix doublé : déjà versée hier' : ''})`, cp, () => { z.moral += g; z.primeVeille = T; })) achete.add('prime'); }
      if (dep.prevention) { if (payer('campagne de prévention (criminalité −6)', DEPENSES.prevention.cout, () => { z.criminalite = clamp(z.criminalite - 6, 10, 95); })) achete.add('prevention'); }
      if (dep.enqueteurs) { if (payer(`heures sup’ des enquêteurs (+${DEPENSES.enqueteurs.unites} unités sur les dossiers)`, DEPENSES.enqueteurs.cout, () => { z._travailBonus = DEPENSES.enqueteurs.unites; })) achete.add('enqueteurs'); }
      if (dep.soustraitance) { if (payer('sous-traitance administrative (−5 dossiers)', DEPENSES.soustraitance.cout, () => { z.paperasse = Math.max(0, z.paperasse - 5); })) achete.add('soustraitance'); }
      if (dep.revision) { if (payer(`révision du parc (état ${Math.round(100 - z.usure)} % → ${Math.round(100 - Math.max(0, z.usure - USURE.revision))} %)`, DEPENSES.revision.cout, () => { reviser(z, USURE.revision); })) achete.add('revision'); }
      if (dep.carrosserie && (z.cabosses || []).length) { const nc = cabossesChoisis(z, dep.carrosserie).length; payer(`carrosserie (${nc} véhicule${nc > 1 ? 's' : ''} réparé${nc > 1 ? 's' : ''}${z.infra.garage ? ' à l’atelier' : ', immobilisé' + (nc > 1 ? 's' : '') + ' ce tour'})`, coutCarrosserie(z, dep.carrosserie), () => { reparerCabosses(z, T, dep.carrosserie); }, false); }
      z.rapport.push(`Dépenses du jour : ${achats.join(', ')}.`);
      if (paye) z._compta.push({ k: 'depenses', l: 'Dépenses du jour', v: -paye });
    }

    jalon(z, 'Prime au personnel (+4 sous 70 de moral, +2 sous 85, +1 au-delà)');
    imageCabosses(z, T, push, zoneLabel(z));
    jalon(z, 'Véhicules cabossés non réparés (image)');
    // Capacités des services (avec les agents restés à leur poste, plus la réserve).
    const cap = {};
    for (const s of SERVICES) {
      const renfort = reserve && dep.reserveService === s ? reserve * DEPENSES.reserve.efficacite : 0;
      const bTheme = theme && ((theme.id === 'routiere' && s === 'roulage') ? 1.5 : (theme.id === 'proximite' && s === 'proximite') ? 1.3 : 1) || 1;
      cap[s] = capacite(z, s, alloc[s] + renfort, { rythme: o.rythme, turn: T, bonus: (bonusService === s ? ENIGMES.bonusCapacite : 1) * bTheme, adminMult, alloc });
    }
    // Figures de l'équipe : bonus dans leur service (si quelqu'un y travaille), sauf celle partie en mission.
    z.bonusChefs = {};
    for (const [s, x] of Object.entries(encadrement(z.equipe, o.postes, z._missions || []))) {
      if (!cap[s]) continue;
      cap[s] *= 1 + x.bonus; z.bonusChefs[s] = x.bonus;
    }

    // Plan du district en vigueur (crise votée par le Conseil des chefs).
    if (criseZone(state, z, cap, T)) jalon(z, 'Plan du district');
    capsSoir[uid] = { ...cap };
    // Vague de délinquance chassée d'une zone voisine hier soir : absorbée ou subie.
    if (VAGUES.actif) {
      const vg = appliquerVague(state, z, vagueVisee(state, uid, T), cap, { T, zoneLabel, push });
      if (vg && vg.incidents) pr.incidents = (pr.incidents || 0) + vg.incidents;
      if (vg) jalon(z, vg.absorbee ? 'Vague de délinquance absorbée' : 'Vague de délinquance subie');
      if (vg && vg.absorbee && makeRng(`${state.seed}:s${state.season}:t${T}:vague-fuite:${uid}`).chance(RELEVE.chanceVague)) fuites.push({ de: uid, titre: '', cause: 'Vague brisée' });
    }
    // Flotte : agents de Roulage et de Proximité en voiture, prime verte, force des fourgons (affichage).
    {
      const mt = agentsMontes(z, alloc, T, o.rythme), bouts = [];
      if (mt.roulage + mt.proximite > 0) bouts.push(`${[mt.roulage ? `${fmt1(mt.roulage)} agent${mt.roulage > 1 ? 's' : ''} de Roulage` : '', mt.proximite ? `${fmt1(mt.proximite)} de Proximité` : ''].filter(Boolean).join(' et ')} en voiture (+${Math.round(RENDEMENT.monte * 100)} % chacun)`);
      else if (mt.libres < 0.5 && (alloc.roulage || alloc.proximite)) bouts.push('aucune place libre après l’Intervention : Roulage et Proximité à pied');
      const pv = primeVerte(z); if (pv) bouts.push(`prime verte +${fmt1(pv)} k€`);
      const bo = Math.round((bonusOrdre(z, T) - 1) * 100); if (bo) bouts.push(`fourgons : force des engagements +${bo} %`);
      if (bouts.length) z.rapport.push(`Flotte : ${bouts.join(' · ')}.`);
    }
    // Efficacité due au moral (celui du moment du calcul, après aléas, énigmes et primes du jour).
    const mm = moralMult(z.moral);
    z.efficaciteMoral = { moral: round1(z.moral), mult: Math.round(mm * 100) / 100 };
    const ecart = Math.round((mm - 1) * 100);
    z.rapport.push(`Moral ${Math.round(z.moral)} au moment du travail : efficacité de tous tes agents ${Math.round(mm * 100)} % (${ecart === 0 ? 'neutre' : `${ecart > 0 ? '+' : '−'}${Math.abs(ecart)} %`} ; 100 % à 67 de moral).`);
    // Enquête : démarches et enquête de voisinage.
    const detaches = enqueteZone(state, z, o, makeRng(`${state.seed}:s${state.season}:t${T}:${uid}:enq`), cap, pre) || 0;

    jalon(z, 'Enquête (démarches)');
    // Intervention : incidents du jour.
    const incidents = clamp(Math.round(1.5 + z.criminalite / 14) + (pr.incidents || 0) + pressionSaison(state, T) + zr.int(-1, 1), 1, 14);
    const traites = Math.min(incidents, Math.floor(cap.intervention / 1.1));
    const rates = incidents - traites;
    z.stats.incidents += incidents; z.stats.traites += traites;
    z.satisfaction += traites * 0.5 - rates * 1.8;
    noter(z, 'satisfaction', `Incidents traités : ${traites} × +0,5`, traites * 0.5);
    noter(z, 'satisfaction', `Incidents ratés : ${rates} × −1,8`, -rates * 1.8);
    jalon(z, 'Incidents');
    // Doctrine d'intervention : chaque incident traité (fouilles, contrôles d'identité) remplit la jauge de saisie ;
    // à 100 %, une saisie d'argent liquide de 2 à 4 k€ (plus avec la maîtrise). Au plus une saisie par soir.
    if (REGLES.v2 && z.doctrine === 'intervention' && traites > 0) {
      const D = DOCTRINES.intervention;
      z.jaugeSaisie = round1(Math.min(1.5, (z.jaugeSaisie || 0) + traites * D.saisieJauge) * 100) / 100;
      if (z.jaugeSaisie >= 0.995) {
        z.jaugeSaisie = Math.max(0, round1((z.jaugeSaisie - 1) * 100) / 100);
        const saisie = round1(zr.float(D.saisie, D.saisieMax) * (1 + MAITRISE * (z.maitrise || 0)));
        z.budget += saisie; z.stats.saisies = round1((z.stats.saisies || 0) + saisie); z.stats.nbSaisies = (z.stats.nbSaisies || 0) + 1;
        z.rapport.push(`Saisie (doctrine d’intervention) : ${zr.pick(SAISIES)}, +${fmt1(saisie)} k€.`);
        push(2, 'Saisie', `${zoneLabel(z)} : ${fmt1(saisie)} k€ saisis en intervention`, 'Doctrine d’intervention.', uid);
      } else z.rapport.push(`Doctrine d’intervention : jauge de saisie ${Math.round(z.jaugeSaisie * 100)} % (+${Math.round(traites * D.saisieJauge * 100)} % ce soir, ${traites} incident${traites > 1 ? 's' : ''} traité${traites > 1 ? 's' : ''} ; à 100 %, saisie d’argent liquide).`);
    }
    jalon(z, 'Doctrine d’intervention : saisie');
    if (rates >= 3) z.moral -= 2;
    jalon(z, '3 incidents ratés ou plus : −2 de moral');
    z.rapport.push(`Intervention : ${traites} incident${traites > 1 ? 's' : ''} traité${traites > 1 ? 's' : ''} sur ${incidents}.`);
    // Flagrant délit : les patrouilles qui ne sont pas prises par les incidents peuvent tomber sur un auteur.
    const surplus = Math.max(0, cap.intervention / 1.1 - incidents);
    // Jauge de flagrant délit : la marge des patrouilles s'accumule jour après jour (plus de tirage au sort).
    // Les voitures anonymisées en service planquent aux bons endroits : la jauge monte aussi sans patrouilles libres.
    const filature = bonusFilature(z, T);
    const gainFlag = Math.min(FLAGRANT.max * (1 + forceDoctrine(z, 'flagrant')), surplus * FLAGRANT.parUnite * (1 + forceDoctrine(z, 'flagrant'))) + filature;
    z.jaugeFlagrant = round1(Math.min(1.5, (z.jaugeFlagrant || 0) + gainFlag) * 100) / 100;
    if (z.jaugeFlagrant < 0.995 && gainFlag > 0) z.rapport.push(`${filature ? 'Patrouilles libres et planques en voiture banalisée' : 'Patrouilles libres'} : jauge de flagrant délit ${Math.round(z.jaugeFlagrant * 100)} % (+${Math.round(gainFlag * 100)} % aujourd’hui${filature ? `, dont ${Math.round(filature * 100)} % par les anonymes` : ''} ; à 100 %, flagrant délit).`);
    if (z.jaugeFlagrant >= 0.995) {
      z.jaugeFlagrant = Math.max(0, round1((z.jaugeFlagrant - 1) * 100) / 100);
      const q = assurerQuartiers(state, z);
      const cells = Object.keys(q).sort((a, b) => q[b] - q[a]);
      const cell = cells.length ? cells[zr.int(0, Math.min(2, cells.length - 1))] : null;
      const lieu = cell ? carteQuartiers(state).nomDe(Number(cell)) : 'dans la zone';
      const fait = zr.pick(FLAGRANTS);
      z._points += FLAGRANT.points * (aAnnexe(z, 'cachots') ? 1 + INFRAS.cachots.points : 1); z._ps += FLAGRANT.ps; z.satisfaction += 1; z.stats.flagrants = (z.stats.flagrants || 0) + 1;
      z._interpelle = true;
      if (cell) { q[cell] = clamp(q[cell] - FLAGRANT.tension, 10, 95); z.criminalite = clamp(z.criminalite - FLAGRANT.tension / cells.length, 10, 95); }
      jalon(z, 'Flagrant délit (patrouilles libres)');
      z.rapport.push(`Flagrant délit ${cell ? `à ${lieu}` : lieu} : ${fait}. +${FLAGRANT.points} pts, +${FLAGRANT.ps} PS${cell ? `, tension du quartier −${FLAGRANT.tension}` : ''}.`);
      push(3, 'Flagrant délit', `${zoneLabel(z)} : ${fait}`, `Interpellation ${cell ? `à ${lieu}` : 'dans la zone'}.`, uid);
    }
    if (pr.bourgmestre) {
      if (rates === 0) { z.satisfaction += 4; z.rapport.push('Visite du bourgmestre : aucun incident raté, +4 de satisfaction.'); }
      else { z.satisfaction -= 4; z.rapport.push(`Visite du bourgmestre : ${rates} incident${rates > 1 ? 's' : ''} raté${rates > 1 ? 's' : ''}, −4 de satisfaction.`); }
    }

    jalon(z, 'Visite du bourgmestre');
    // Proximité : prévention.
    // Quartier par quartier : patrouilles ciblées, point chaud, déplacement de la délinquance.
    const patrouilles = lirePatrouilles(state, z, o.patrouilles, alloc.proximite || 0);
    z.satisfaction += cap.proximite * 0.12;
    if (alloc.proximite > 0) z.satisfaction += bonusEquip(z, 'proximite', 'satisfaction');
    jalon(z, `Présence de la Proximité : capacité ${fmt1(cap.proximite)} × 0,12`);
    z.satisfaction += tourQuartiers(state, z, { patrouilles, agentsProx: alloc.proximite || 0, capProx: cap.proximite, rng: zr, zoneLabel });
    noter(z, 'satisfaction', 'Point chaud désamorcé', z._pcSatisf || 0); delete z._pcSatisf;
    jalon(z, `Quartiers inquiets (criminalité moyenne ${Math.round(z.criminalite)})`);
    // Recherche : dossiers locaux.
    // Un nouveau dossier chaque jour, de taille régulière : la Recherche a toujours du travail.
    const nouveauDossier = 1;
    {
      const reste = zr.int(DOSSIER.tailleMin, DOSSIER.tailleMax);
      z.dossiers.push({ id: ++z.dossierSeq, titre: zr.pick(DOSSIERS_LOCAUX), reste, total: reste, points: round1(reste * DOSSIER.ptsParUnite), age: 0 });
    }
    // Dossiers ouverts avec l'ancienne taille (4 à 8 unités) : ramenés à la nouvelle taille maximale, même récompense.
    if ((z.dossiersV || 1) < DOSSIER.version) {
      for (const d of z.dossiers) { const tot = d.total || d.reste; if (tot > DOSSIER.tailleMax) { const k = DOSSIER.tailleMax / tot; d.reste = round1(d.reste * k); d.total = DOSSIER.tailleMax; } }
      z.dossiersV = DOSSIER.version;
    }
    let travail = Math.max(0, cap.recherche - detaches) + (z._travailBonus || 0);
    const travail0 = travail;
    delete z._travailBonus;
    let resolus = 0, ptsRech = 0;
    // Les plus vieux d'abord (avant qu'ils ne coûtent de la satisfaction).
    z.dossiers.sort((a, b) => b.age - a.age);
    for (const d of z.dossiers) {
      if (travail <= 0) break;
      const t = Math.min(travail, d.reste);
      d.reste = round1(d.reste - t); travail -= t;
      // Les points tombent au fil du travail (et non d'un coup à l'élucidation).
      const p = (d.points || 0) * t / (d.total || t || 1) * valeurDossier(d.age);
      z._points += p; ptsRech += p;
      if (d.reste <= 0.05) {
        resolus += 1; z.satisfaction += 2;
        noter(z, 'satisfaction', 'Dossiers élucidés : +2 chacun', 2);
        z.rapport.push(`Recherche : dossier « ${d.titre} » élucidé (+2 de satisfaction).`);
      }
    }
    if (ptsRech > 0) {
      jalon(z, 'Recherche : travail sur les dossiers');
      z.rapport.push(`Recherche : ${fmt1(travail0 - Math.max(0, travail))} unités de travail sur les dossiers, +${fmt1(ptsRech)} pts de résultats.`);
    }
    z.dossiers = z.dossiers.filter((d) => d.reste > 0.05);
    for (const d of z.dossiers) { d.age += 1; if (d.age > 6) z.satisfaction -= 0.4; }
    jalon(z, 'Dossiers de plus de 6 jours : −0,4 chacun');
    if (pr.parquet) {
      const vieux = z.dossiers.filter((d) => d.age > 4).length;
      if (vieux) { z.satisfaction -= vieux; z.rapport.push(`Le parquet réclame ${vieux} dossier${vieux > 1 ? 's' : ''} en retard (−${vieux} de satisfaction).`); }
    }
    z.stats.dossiersResolus += resolus;
    jalon(z, 'Le parquet réclame les dossiers en retard');

    // Roulage : amendes et sécurité routière.
    const totalAlloc = SERVICES.reduce((s, k) => s + alloc[k], 0) || 1;
    // Doctrine routière : au-delà d'une part des effectifs au Roulage, les agents en plus rapportent moitié moins.
    const rendR = forceDoctrine(z, 'rendement'), partR = alloc.roulage / totalAlloc;
    const capAmendes = rendR && partR > rendR ? cap.roulage * (1 - 0.5 * (partR - rendR) / partR) : cap.roulage;
    const recettes = capAmendes * ECONOMIE.amendeParCapacite * (1 + bonusEquip(z, 'roulage', 'amendes') + forceDoctrine(z, 'amendes'));
    if (pr.roulageMin) {
      if (alloc.roulage >= pr.roulageMin) { z.satisfaction += 2; z.rapport.push('Contrôles de vitesse demandés par les riverains : assurés (+2 de satisfaction).'); }
      else { z.satisfaction -= 3; z.rapport.push('Contrôles de vitesse demandés par les riverains : pas assez d\u2019agents (−3 de satisfaction).'); }
    }
    jalon(z, 'Contrôles de vitesse demandés par les riverains');
    if (alloc.roulage / totalAlloc > seuilChasse(z) && !(theme && theme.id === 'routiere')) {
      z.satisfaction -= 2; z.rapport.push(`Roulage : plus de ${Math.round(seuilChasse(z) * 100)} % des effectifs, effet « chasse aux PV » (−2 de satisfaction).`);
      jalon(z, 'Roulage : effet « chasse aux PV »');
    } else { const fs = 0.1 * (1 + forceDoctrine(z, 'securite')); z.satisfaction += cap.roulage * fs; jalon(z, `Sécurité routière : capacité Roulage ${fmt1(cap.roulage)} × ${String(round1(fs * 100) / 100).replace('.', ',')}`); }
    // Administration : la pile de paperasse.
    z.paperasse = Math.max(0, z.paperasse + traites * 0.4 * (forceDoctrine(z, 'paperasse') || 1) + nouveauDossier * 0.6 + 1.2 - cap.admin * 1.2);
    z.paperassePic = Math.max(z.paperassePic || 0, z.paperasse);
    if (z.paperasse > 14) { z.moral -= 2; z.satisfaction -= 1; z.rapport.push(`Paperasse : ${Math.round(z.paperasse)} dossiers en attente (−2 de moral).`); }

    jalon(z, 'Paperasse au-delà de 14 dossiers');
    // Grande décision.
    const dec = o.decision;
    if (dec) {
      const refus = decisionImpossible(z, dec, T);
      if (refus) z.rapport.push(`Décision refusée : ${refus}.`);
      else {
        const cd = coutDecision(z, dec);
        if (dec.type !== 'recruter') z._investi = true;
        if (dec.type === 'equiper' && talent(z, 'marches')) noterChef(z, 'marches', 'Marchés publics : ton achat t’a coûté 10 % de moins.');
        z.budget -= cd;
        z._compta.push({ k: 'decision', l: 'Grande décision', v: -cd });
        if (dec.type === 'agrandir') { z.travaux = { batiment: dec.batiment, fin: T + TRAVAUX_TOURS }; z.rapport.push(`Travaux lancés : ${BATIMENTS[dec.batiment].nom}, niveau ${z.batiments[dec.batiment] + 1} dans ${TRAVAUX_TOURS} tour${TRAVAUX_TOURS > 1 ? 's' : ''}.`); }
        if (dec.type === 'recruter') { z.academie.push({ n: dec.n, arrivee: T + DELAI_ACADEMIE }); z.rapport.push(`${dec.n} recrue${dec.n > 1 ? 's' : ''} à l’académie, arrivée dans ${DELAI_ACADEMIE} tour${DELAI_ACADEMIE > 1 ? 's' : ''}.`); }
        if (dec.type === 'former') {
          const absents = agentsFormation(z, dec.service);
          z.formations.push({ service: dec.service, fin: T + DUREE_FORMATION + 1, agents: absents });
          z.rapport.push(`Formation lancée : ${SERVICE_LABELS[dec.service]} (${absents ? `${absents} agents indisponibles ${DUREE_FORMATION} tour${DUREE_FORMATION > 1 ? 's' : ''}` : 'au stand de tir, sans agent absent'}).`);
        }
        if (dec.type === 'equiper') {
          if (dec.cible === 'vehicule' && dec.reprise != null && dec.reprise < z.flotte.length) {
            const ancien = modeleDe(z.flotte[dec.reprise]).nom, px = remplacerVehicule(z, dec.reprise, dec.modele || 'diesel', T);
            z.rapport.push(`Nouveau véhicule livré : ${(MODELES[dec.modele] || MODELES.diesel).nom}, avec reprise d’un${ancien.startsWith('Voiture') ? 'e' : ''} ${ancien.toLowerCase()} (${fmt1(px)} k€ déduits du prix).`);
          } else if (dec.cible === 'vehicule') { ajouterVehicule(z, dec.modele || 'diesel', T); z.rapport.push(`Nouveau véhicule livré : ${(MODELES[dec.modele] || MODELES.diesel).nom}.`); }
          else if (dec.cible === 'prepa') { z.prepa = (z.prepa || 0) + 1; z.rapport.push(`Combis préparés au niveau ${z.prepa} : +${Math.round(z.prepa * PREPA.vitesse * 100)} % de vitesse de pointe et freinage renforcé sur les urgences.`); }
          else { z.equip[dec.cible] += 1; z.rapport.push(`Équipement ${SERVICE_LABELS[dec.cible]} au niveau ${z.equip[dec.cible]}.`); }
        }
        if (dec.type === 'construire') { z.infra[dec.infra] = true; z.rapport.push(`Infrastructure construite : ${INFRAS[dec.infra].nom}.`); push(4, 'Chantier', `${zoneLabel(z)} inaugure : ${INFRAS[dec.infra].nom.toLowerCase()}`, INFRAS[dec.infra].effet + '.', uid); }
      }
    }

    // Le Directeur : feuilleton ou dilemme du jour, événement de district.
    const dirL = directeurSoir(state, z, { state, T, o, alloc, patrouilles, rates, traites, achete, label: zoneLabel(z), push, district: districtRes, indice: () => indiceBonus(state, z, zr), rng: makeRng(`${state.seed}:s${state.season}:t${T}:dir-soir:${uid}`) });
    if (dirL.length) { z.rapport.push(...dirL); jalon(z, 'Feuilletons et événements du Directeur'); }

    // Budget du tour.
    const ff = fraisFixes(z, state, { amendes: recettes, rythme: o.rythme });
    z.budget += ff.total;
    z._compta.push(...ff.lignes);
    delete z._nouveaux;
    // Sortie d'académie : les recrues arrivent ce soir, après la paie, pour être dans les ordres de demain.
    // Filet de sécurité : un groupe à la date de sortie invalide ou plus lointaine que le délai normal
    // (resté coincé lors d'un changement de règles) sort ce soir.
    z.academie = (z.academie || []).map((a) => {
      const n = Math.max(0, Math.floor(Number(a && a.n) || 0)), arr = Number(a && a.arrivee);
      return { n, arrivee: Number.isFinite(arr) && arr <= T + DELAI_ACADEMIE ? arr : T + 1 };
    }).filter((a) => a.n > 0);
    const arrivees = z.academie.filter((a) => a.arrivee <= T + 1).reduce((s2, a) => s2 + a.n, 0);
    if (arrivees) { z.agents += arrivees; z.rapport.push(`${arrivees} recrue${arrivees > 1 ? 's' : ''} sort${arrivees > 1 ? 'ent' : ''} de l’académie : dans tes ordres dès demain.`); }
    z.academie = z.academie.filter((a) => a.arrivee > T + 1);
    // Usure : un peu chaque jour, et surtout à chaque intervention (répartie sur le parc).
    // Chaque véhicule s'use selon son modèle (électriques −40 %, fourgons −20 %).
    const avant = z.usure;
    usureDuTour(z, traites * (forceDoctrine(z, 'usure') || 1), !!z.infra.garage);
    const etat = Math.round(100 - z.usure), malus = Math.round((1 - malusEtat(etat)) * 100);
    z.rapport.push(`Véhicules : ${traites} intervention${traites > 1 ? 's' : ''}, usure +${fmt1(z.usure - avant)} %, état du parc ${etat} %${malus ? ` (Intervention −${malus} %, pense à une révision)` : ''}.`);
    // Accident de véhicule de service : le risque suit la façon dont la zone roule.
    const acc = accidentVehicule(z, T, makeRng(`${state.seed}:s${state.season}:t${T}:${uid}:veh`),
      { traites, rythme: o.rythme, interventionAgents: alloc.intervention || 0, vehiculesDispo: vehiculesDisponibles(z, T) }, push, zoneLabel(z));
    if (acc) jalon(z, acc.type === 'accrochage' ? 'Accrochage d’un véhicule' : 'Véhicule sinistré');
    // Reventes : les véhicules vendus roulent encore ce soir, puis quittent le parc (il en reste toujours un).
    for (const slot of [...(o.ventes || [])].sort((a, b) => b - a)) {
      if (z.vehicules <= 1 || !(slot < z.vehicules)) continue;
      const prix = prixRevente(z, slot), nom = modeleDe(z.flotte[slot]).nom;
      retirerVehicule(z, slot);
      z.budget += prix; z._compta.push({ k: 'vente', l: `Revente : ${nom}`, v: prix });
      z.rapport.push(`Véhicule revendu : ${nom}, +${fmt1(prix)} k€.`);
    }

    // Moral.
    jalon(z, 'Accident de véhicule');
    const m0 = z.moral;
    const tr = tauxRetourMoral(z.moral);
    z.moral += (MORAL.cible - z.moral) * tr;
    jalon(z, `Retour naturel vers ${MORAL.cible} : ${Math.round(tr * 100)} % de l’écart (${fmt1(m0)} → ${MORAL.cible})`);
    z.moral += (o.rythme === 'renforce' && z._service === 'syndicat' ? 0 : RYTHMES[o.rythme].moral + (o.rythme === 'renforce' ? forceDoctrine(z, 'renforce') + (talent(z, 'meneur') ? TALENT.meneur.moral : 0) : 0));
    if (o.rythme === 'renforce' && talent(z, 'meneur')) noterChef(z, 'meneur', 'Meneur d’hommes : le rythme renforcé a moins pesé sur le moral.');
    jalon(z, `Rythme ${RYTHMES[o.rythme].label.toLowerCase()}`);
    if (z.infra.sport) z.moral += 1;
    if (forceDoctrine(z, 'repJour')) z.reputation += forceDoctrine(z, 'repJour');
    jalon(z, 'Doctrine partenaire : réputation');
    jalon(z, 'Salle de sport');
    if (z.budget < 0) z.moral -= 3;
    jalon(z, 'Budget négatif : −3');
    z.renforceSuite = o.rythme === 'renforce' ? z.renforceSuite + 1 : 0;

    // Dérives naturelles.
    { const ts = tauxDerive('satisfaction', z.satisfaction) * (forceDoctrine(z, 'derive') || 1) * (aAnnexe(z, 'sapv') ? INFRAS.sapv.derive : 1) * (talent(z, 'visage') ? TALENT.visage.derive : 1); z.satisfaction += (DERIVE.satisfaction.cible - z.satisfaction) * ts + forceDoctrine(z, 'satJour');
      jalon(z, `Retour naturel vers ${DERIVE.satisfaction.cible} : ${Math.round(ts * 100)} % de l’écart`); }
    { const tp = tauxDerive('reputation', z.reputation); z.reputation += (DERIVE.reputation.cible - z.reputation) * tp;
      jalon(z, `Retour naturel vers ${DERIVE.reputation.cible} : ${Math.round(tp * 100)} % de l’écart`); }

    // Malus : chef absent, inspection générale.
    { const adj = reglesV2(state) && z.adjoint, seuil = adj ? 1 + ADJOINT.tient : 2;
      if (z.toursSansOrdres >= seuil) { z.satisfaction -= 2; z.moral -= 2; z.rapport.push(adj ? `${z.adjoint.prenom} ne peut plus porter la zone seul${z.adjoint.f ? 'e' : ''} : −2 de satisfaction et de moral.` : 'Chef absent depuis plusieurs tours : −2 de satisfaction et de moral.'); } }
    jalon(z, 'Chef absent (2 tours sans ordres ou plus)');
    z.budgetNegSuite = z.budget < 0 ? z.budgetNegSuite + 1 : 0;
    if (z.inspectionCooldown > 0) z.inspectionCooldown -= 1;
    else if (z.budgetNegSuite >= 2 || z.paperasse > 20) {
      z.budget -= 5; z.satisfaction -= 5; z.inspectionCooldown = 4;
      z._compta.push({ k: 'inspection', l: 'Amende de l’Inspection générale', v: -5 });
      const motif = z.paperasse > 20 ? 'paperasse débordante' : 'budget dans le rouge';
      z.rapport.push(`Inspection générale (${motif}) : amende de 5 k€ et −5 de satisfaction.`);
      push(7, 'Inspection générale', `L’Inspection débarque à ${zoneLabel(z)}`, `Motif : ${motif}. Amende de 5 k€.`, uid);
    }

    jalon(z, 'Inspection générale');
    // Bornes.
    z.moral = clamp(z.moral, 0, 100);
    z.satisfaction = clamp(z.satisfaction, 0, 100);
    z.reputation = clamp(z.reputation, 0, 100);

    jalon(z, 'Plafond (jauges entre 0 et 100)');
    // Absences et démissions pour le tour suivant.
    z.absents = z.moral < 40 ? Math.ceil(z.agents * 0.1) : 0;
    if (z.moral < 20 && z.agents > 5) {
      z.agents -= 1; z.rapport.push('Moral au plus bas : un agent démissionne.');
      push(6, 'Ressources humaines', `Démission à ${zoneLabel(z)}`, 'Le moral est au plus bas.', uid);
    }
    z.blesses = z.blesses.filter((b) => b.retour > T);
    z.vehiculesHS = z.vehiculesHS.filter((v) => v.retour > T + 1);
    // Fin de formation : les agents reviennent demain déjà formés, le niveau s'affiche tout de suite (retour de Luc :
    // avant, il ne montait qu'au début du calcul suivant, et la formation semblait « ne pas être passée »).
    for (const f of z.formations) if (f.fin === T + 1 && !f.fait) { f.fait = true; z.niveaux[f.service] = Math.min(5, z.niveaux[f.service] + 1); z.rapport.push(`Formation terminée : ${SERVICE_LABELS[f.service]} passe au niveau ${z.niveaux[f.service]}, tes agents reviennent demain.`); }
    z.formations = z.formations.filter((f) => f.fin > T);
    z.renforts = (z.renforts || []).filter((x) => x.retour > T + 1);

    // IPZ.
    jalon(z, 'Divers');
    // Bilan des résultats : les points du jour + la moitié du bilan d'hier.
    const bilanHier = z.bilanTerrain || 0;
    z.bilanTerrain = round1(bilanHier * TERRAIN.report + z._points);
    // Revenu du jour (composante Budget) : ce que la zone gagne ou perd en fonctionnant, sans ses achats
    // (grandes décisions, dépenses du jour), reventes ni bilan de saison : investir ne fait pas baisser l'IPZ.
    const revenu = round1(z.budget - budget0[uid] - (z._compta || []).filter((x) => horsRevenu(x.k)).reduce((a2, x) => a2 + x.v, 0));
    z.revenus = [...(z.revenus || []), revenu].slice(-BUDGET_IPZ.jours);
    if (revenu > (z.stats.revenuMax || 0)) z.stats.revenuMax = revenu;
    const comp = ipzComposantes(z, { ratio: incidents ? traites / incidents : 1, bilan: z.bilanTerrain, revenus: z.revenus });
    const ipzHier = z.ipz, compHier = z.ipzComp || null;
    z.ipz = ipzFrom(comp);
    z.ipzComp = comp;
    z.ipzCompHier = compHier;
    z.ipzDetail = { revenu, revenus: z.revenus.slice(), incidents, traites, points: round1(z._points), report: round1(bilanHier * TERRAIN.report), bilan: z.bilanTerrain, budget: round1(z.budget), coefInc: TERRAIN.incidents, coefPt: TERRAIN.parPoint };
    z.rapport.push(ligneIpz(comp, compHier, z.ipz, z.toursJoues > 0 || compHier ? ipzHier : null, z.ipzDetail));
    if (z._joue) {
      z.ipzSomme += z.ipz; z.toursJoues += 1;
      // Composition de l'IPZ de la saison (classement : d'où vient la moyenne de chacun).
      { const pt = pointsIpz(comp); z.compSomme = Object.fromEntries(Object.keys(pt).map((k) => [k, round1(((z.compSomme && z.compSomme[k]) || 0) + pt[k])])); z.compTours = (z.compTours || 0) + 1; }
      z.ipzSemaine = { s: ((z.ipzSemaine && z.ipzSemaine.s) || 0) + z.ipz, n: ((z.ipzSemaine && z.ipzSemaine.n) || 0) + 1 };
      z._ps += PS.ordres;
    }
    z.ipzHist.push({ t: T, v: z.ipz, joue: z._joue });
    // Série sans incident raté, équipe et trophées.
    z.stats.serieSansRate = rates === 0 ? (z.stats.serieSansRate || 0) + 1 : 0;
    if (z._joue) z.stats.toursValides = (z.stats.toursValides || 0) + 1;
    const prog = faireProgresser(z, {
      inter: traites, rech: resolus * 3 + (o.demarches || []).length * 2 + (z._decouverteJour ? 8 : 0),
      prox: cap.proximite / 2, roul: cap.roulage / 2, admin: Math.max(0, cap.admin * 1.2 - 1.2) / 1.5,
    }, (z._missions || []).length ? Object.fromEntries(z._missions.map((r) => [r, CHEFS.xpMission])) : null);
    if (prog.ligne) z.rapport.push(prog.ligne);
    // Complexe cellulaire : garde à vue des interpellés de la journée (relève comprise).
    if (aAnnexe(z, 'cachots') && (z._interpelle || (z._chefAvant && (z.stats.releves || 0) > (z._chefAvant.stats.releves || 0)))) {
      const f = pieceGardeAVue(state, z, makeRng(`${state.seed}:s${state.season}:t${T}:gav:${uid}`));
      if (f) {
        z.blesses.push({ n: 1, retour: T + 2, motif: 'garde des cellules' });
        z.rapport.push('Garde à vue : un interpellé balance, espérant la clémence du juge. Une pièce s’ajoute à ton dossier d’enquête ; un agent reste demain à la garde des cellules.');
        (z.cetteNuit ||= []).push({ ico: '🔒', t: 'Garde à vue : un interpellé a parlé (une pièce d’enquête)' });
      }
    }
    // Journal de l'adjoint : un jour tenu sans le chef.
    if (!z._joue && z.adjoint && reglesV2(state)) noterJournal(z, T, { ipz: round1(z.ipz), inc: `${traites}/${incidents}`, budget: round1(z.budget), moral: Math.round(z.moral), sat: Math.round(z.satisfaction) });
    // Chef de corps : expérience du jour (par l'usage), montées de niveau, talents débloqués.
    if (z.chef && reglesV2(state)) {
      const av = z._chefAvant || { stats: {} };
      const d = {}; for (const k of Object.keys(z.stats)) d[k] = (Number(z.stats[k]) || 0) - (Number(av.stats[k]) || 0);
      const piecesGagnees = z.enquete && z.enquete.n === av.n ? Math.max(0, piecesPropres(z) - (av.pieces || 0)) : 0;
      // Audit du 9 octobre : un jour tenu par l'adjoint ne fait pas progresser le chef par la gestion (il n'a rien décidé) ;
      // seuls comptent les jeux réellement joués (mini-jeux, énigmes). Pas de rattrapage non plus ce jour-là.
      const gains = z._joue ? gainsDuJour({ revenu, investi: !!z._investi, ratio: incidents ? traites / incidents : 1, satisfaction: z.satisfaction, piecesGagnees, agenda: z._agenda, croise: z._croise, d }) : {};
      const par = z.chef.parrain && z.chef.parrain.fin >= T ? z.chef.parrain : null;
      for (const [c, v] of Object.entries(z._paraGains || {})) gains[c] = (gains[c] || 0) + v;
      // Mini-jeux et énigmes du jour : chaque réussite entraîne une compétence (plafond à part).
      const jeux = { gestion: 0, commandement: 0, flair: 0, diplomatie: 0, proximite: 0 };
      for (const sv of z._incOk || []) if (JEUX_COMP[sv]) jeux[JEUX_COMP[sv]] += 1;
      jeux.flair += Math.min(3, (Array.isArray(q) ? q : []).filter((x, k) => x && x.statut === 'ok' && (x.slot ?? k) !== 3).length);
      { const vus = (z.chef.defisVus ||= {}), defis = (players[uid] && players[uid].defis) || {};
        for (const [jeu, niv] of Object.entries(defis)) { const n = Math.min(CHALLENGE.niveauMax, Math.floor(Number(niv) || 0)); if (!JEUX_COMP[jeu]) continue;
          if (n > (vus[jeu] || 0)) jeux[JEUX_COMP[jeu]] += Math.min(3, Math.ceil((n - (vus[jeu] || 0)) / 2));
          vus[jeu] = Math.max(vus[jeu] || 0, n); } }
      const jeuxTxt = Object.entries(jeux).filter(([, v]) => v > 0).map(([c, v]) => `${COMPETENCES[c].nom} +${Math.min(CHEF.plafondJeux, v)}`).join(', ');
      if (jeuxTxt) noterChef(z, 'jeux', `Entraînement du jour (mini-jeux et énigmes) : ${jeuxTxt}.`);
      // Chef en première ligne : expérience, et le risque d'être blessé.
      if (z._front && FRONT[z._front]) {
        if (z._frontUtilise) {
          gains[FRONT[z._front].comp] = (gains[FRONT[z._front].comp] || 0) + 2;
          const blesse = makeRng(`${state.seed}:s${state.season}:t${T}:front:${uid}`).chance(RISQUE_FRONT.base);
          if (blesse) { z.chef.blesse = T + RISQUE_FRONT.jours; z.chef.blessures = (z.chef.blessures || 0) + 1; z.rapport.push(`Chef en première ligne : ${z._frontUtilise}, mais il est blessé. Hôpital jusqu’au jour ${z.chef.blesse} (talents coupés).`); push(4, 'Chef de corps', `Le chef de ${zoneLabel(z)} blessé en première ligne`, 'Il a payé de sa personne : quelques jours d’hôpital.', uid); noterChef(z, 'front', 'En première ligne, ton chef a été blessé : hôpital pour deux jours.'); }
          else { z.rapport.push(`Chef en première ligne : ${z._frontUtilise}.`); noterChef(z, 'front', `En première ligne : ${z._frontUtilise}.`); }
        } else z.rapport.push(`Chef en première ligne (${FRONT[z._front].nom.toLowerCase()}) : pas d’occasion ce soir, il est resté au bureau.`);
      }
      const lotsJour = Math.max(0, (z.lots || []).length - (av.lots ?? (z.lots || []).length));
      if (lotsJour) z.chef.lotsGagnes = (z.chef.lotsGagnes || 0) + lotsJour;
      // Niveaux et talents d'avant la nuit : les objectifs de la semaine ajoutent de l'XP après progresser(), on compare donc à la fin.
      const nivAvant = Object.fromEntries(IDS_COMPETENCES.map((c) => [c, niveauChef(z.chef, c)])), talAvant = new Set(talentsDebloques(z.chef));
      const r = progresser(z.chef, gains, { rattrapage: !!z._joue && totalNiveaux(z.chef) < moyChef - 1, parrain: par, jeux, mult: z.chef.remise != null && T <= z.chef.remise ? ADJOINT.retour.remise : 1 });
      // Objectifs de la semaine (jours joués seulement).
      if (z._joue && z.chef.objectifs) {
        const ob = avancerObjectifs(z, { z, d: new Proxy(d, { get: (o, k) => Math.max(0, Number(o[k]) || 0) }), ratio: incidents ? traites / incidents : 1, revenu, pieces: piecesGagnees, jeux, investi: !!z._investi, lots: lotsJour, service: !!z._service, front: !!z._frontUtilise, agenda: z._agenda });
        for (const x of ob.reussis) { z.rapport.push(`Objectif de la semaine réussi : ${texteObjectif(x)} (+${x.xp} XP en ${COMPETENCES[x.comp].nom}, +1 de réputation).`); noterChef(z, `obj-${x.id}`, `Objectif réussi : ${texteObjectif(x)}.`); }
        if (ob.parfaite) { const h = z.chef.hebdo; z.rapport.push(`Semaine parfaite : les trois objectifs sont remplis ! Médaille de la semaine (+3 PS, +1 de réputation)${h.serie > 1 ? `, ${h.serie} semaines d’affilée` : ''}.`); push(4, 'Chef de corps', `Semaine parfaite pour le chef de ${zoneLabel(z)}`, `Ses trois objectifs de la semaine sont remplis${h.serie > 1 ? ` (${h.serie} semaines d’affilée)` : ''}.`, uid); }
      }
      r.montees = IDS_COMPETENCES.filter((c) => niveauChef(z.chef, c) > nivAvant[c]).map((c) => ({ comp: c, niveau: niveauChef(z.chef, c) }));
      r.nouveaux = talentsDebloques(z.chef).filter((t) => !talAvant.has(t));
      for (const m of r.montees) {
        z.rapport.push(`Chef de corps : ${COMPETENCES[m.comp].nom} niveau ${m.niveau}.`);
        if (m.niveau >= 5) push(3, 'Chef de corps', `Le chef de ${zoneLabel(z)} passe ${COMPETENCES[m.comp].nom.toLowerCase()} ${m.niveau}`, 'Son expérience se fait sentir dans tout le district.', uid);
      }
      if ((o.demarches || []).length && talent(z, 'intuition') && z._agenda && z._agenda.type === 'parquet') noterChef(z, 'intuition', 'Intuition : une démarche d’enquête de plus aujourd’hui.');
      z.chefNuit = { tour: T, faits: (z._chefFaits || []).slice(0, 4), montees: r.montees, nouveaux: r.nouveaux, signature: signatureChef(z.chef) };
      for (const t of r.nouveaux) z.rapport.push(`Nouveau talent débloqué : « ${TALENT[t].nom} » (${TALENT[t].texte.toLowerCase()}). Équipe-le dans tes ordres.`);
      // Pastille « nouveau » : vue dès que le joueur a validé ses ordres (il est passé par le pli du chef) ; seuls les talents de la nuit restent.
      if (z._joue) z.chef.nouveauxTalents = [];
      if (r.nouveaux.length) z.chef.nouveauxTalents = [...new Set([...(z.chef.nouveauxTalents || []), ...r.nouveaux])];
    }
    for (const m of prog.montees) {
      z.rapport.push(`Promotion d’honneur : ${m.prenom} ${m.nom} gagne un surnom, « ${surnomDe(m)} ».`);
      push(4, 'Portrait', `${zoneLabel(z)} : ${m.prenom} ${m.nom} devient « ${surnomDe(m)} »`, `${intitule(m)} de la zone, ${m.f ? 'saluée' : 'salué'} par ses collègues.`, uid);
    }
    for (const id of verifierTrophees(z)) if (donnerTrophee(z, id, state.season, T)) {
      z.rapport.push(`Trophée débloqué : « ${TROPHEE[id].nom} » (${TROPHEE[id].texte.toLowerCase()}).`);
      push(5, 'Trophée', `${zoneLabel(z)} décroche le trophée « ${TROPHEE[id].nom} »`, TROPHEE[id].texte + '.', uid);
    }
    if (z.ipzHist.length > 30) z.ipzHist.shift();
    const psSolo = Math.min(PS.plafondJour, z._ps), psEntr = Math.min(PS.plafondEntraide * (1 + forceDoctrine(z, 'entraide')), z._psEntraide || 0);
    z.ps += psSolo + psEntr;
    // Au-delà du plafond du jour, les PS ne sont plus perdus : 1 point de jauge des skins par tranche de 5.
    const psTrop = Math.max(0, (z._ps || 0) - PS.plafondJour), jaugeSurplus = Math.floor(psTrop / 5);
    if (jaugeSurplus) { z.jaugeIncidents = (z.jaugeIncidents || 0) + jaugeSurplus; z.rapport.push(`Plafond de ${PS.plafondJour} PS atteint : les ${psTrop} PS en plus passent dans la jauge des skins (+${jaugeSurplus}).`); }
    z.psJour = { solo: psSolo, entraide: psEntr, tour: T, plafond: psTrop > 0 };
    z.budget = round1(z.budget);
    z.criminalite = round1(z.criminalite);
    z.paperasse = round1(z.paperasse);
    z.satisfaction = round1(z.satisfaction);
    z.moral = round1(z.moral);
    z.reputation = round1(z.reputation);
    } catch (err) {
      console.error(`Tour ${T}, zone ${uid} :`, err);
      const z = (state.zones[uid] = sauve);
      z.rapport = [...(z.rapport || []), `Incident technique : ta zone n’a pas pu être calculée ce soir (${String((err && err.message) || err).slice(0, 120)}). Rien n’est perdu : elle reprend demain. Préviens le maître du jeu.`];
      zonesEnErreur.push(uid);
    }
  }
  if (zonesEnErreur.length) state.zonesEnErreur = { tour: T, uids: zonesEnErreur }; else delete state.zonesEnErreur;

  // Vagues de délinquance : les zones très fortes dans un domaine chassent la délinquance chez une voisine.
  vaguesNuit(state, uids, capsSoir, T, { zoneLabel, push });
  releveNuit(state, fuites, T, { push, zoneLabel });
  crisePost(state, uids, push, T, zoneLabel);
  // Le parquet surveille les dossiers trop dépendants des pièces des autres (avant la fin d'affaire).
  parquetSoir(state, uids, push);
  // Urgences : le temps cible s'ajuste sur les courses de la partie.
  adapterCibleUrgence(state, coursesUrgence);
  // Enquête : fin d'affaire, nouvelle affaire ; nouvelles demandes de FIPA.
  enquetePost(state, pre, push);
  // Le Directeur : témoin tardif si le district piétine sur l'enquête.
  enqueteDirecteur(state, push, makeRng(`${state.seed}:s${state.season}:t${T}:dir-enquete`));
  jalonTous('Enquête (fin d’affaire)');
  const rivPost = rivalitesPost(state, uids, push, T, nextWeekday, players);
  // Records du Challenge battus (trophée « Recordman ») : relevés chaque soir.
  recordsBattus(state, players, push, zoneLabel);
  // Prime du Challenge : le dimanche, meilleur niveau de la semaine sur chaque mini-jeu (une prime par joueur).
  if (nextWeekday === 0) {
    primeChallenge(state, uids, players, { push, zoneLabel, noms: NOMS_CHALLENGE, remplirJauge: (z) => {
      const r = remplirJauge(z, makeRng(`${state.seed}:s${state.season}:t${T}:challenge:${z.uid}`));
      if (r.skin) push(3, 'Décor', `${zoneLabel(z)} décroche le skin « ${r.skin.nom} »`, 'Jauge des skins remplie grâce au Challenge.', z.uid);
      return r;
    } });
  }
  pactesPost(state, uids, push, T);
  jalonTous('Pactes, défis, péril, tutelle');
  fipaGenerer(state, T, T >= SEASON_LENGTH - 3);

  // Bilan de l'événement de district.
  const districtG = districtBilan(state, T, districtRes, push, zoneLabel);
  const duoG = duoBilan(state, T, push, zoneLabel);

  // 5 bis. Le Directeur prépare demain : ciel, opérations d'envergure, feuilletons, dilemmes, situation du jour.
  districtNuit(state, T, makeRng(`${state.seed}:s${state.season}:t${T}:district`));
  const formeNuit = formes(state);
  for (const z of Object.values(state.zones)) {
    const nr = makeRng(`${state.seed}:s${state.season}:t${T}:next:${z.uid}`);
    directeurNuit(state, z, nr, { T, nextWeekday, forme: formeNuit[z.uid] || 0, PRESSION_WEEKEND });
    annoncerPointChaud(state, z, makeRng(`${state.seed}:s${state.season}:t${T}:chaud:${z.uid}`));
  }

  // 6. Affaires : celles non résolues restent un tour de plus, moins bien dotées.
  const nextAffaires = [];
  for (const a of state.affaires) {
    if (a._resolue) continue;
    if (a.tours > 1) nextAffaires.push({ ...a, tours: a.tours - 1, recompense: Math.max(3, Math.round(a.recompense * 0.6)) });
  }
  state.affaires = nextAffaires;

  // 7. Meilleure zone du tour.
  const joueurs = uids.map((u) => state.zones[u]);
  if (joueurs.length) {
    const top = joueurs.slice().sort((a, b) => b.ipz - a.ipz)[0];
    push(1, 'Performance', `${zoneLabel(top)} signe le meilleur IPZ du jour : ${fmt1(top.ipz)}`, '', top.uid);
  }

  // 8. Classement.
  const classement = Object.values(state.zones)
    .map((z) => ({ uid: z.uid, code: z.code, nom: z.nom, couleur: z.couleur, moyenne: moyenneIpz(z), tours: z.toursJoues, ipz: z.ipz, classe: z.toursJoues >= MIN_TOURS_CLASSEMENT }))
    .sort((a, b) => (b.classe - a.classe) || (b.moyenne - a.moyenne));

  // 9. Gazette.
  news.sort((a, b) => b.prio - a.prio);
  // Rubriques : le bêtisier, le tableau d'honneur et le tribunal ont leur propre place.
  const RUBRIQUES = ['Insolite', 'Portrait', 'Trophée', 'Au tribunal'];
  const principales = news.filter((n) => !RUBRIQUES.includes(n.kicker));
  const gazette = {
    season: state.season, turn: T,
    une: principales[0] || news.find((n) => n.kicker === 'Au tribunal') || { kicker: 'Calme plat', titre: 'Nuit tranquille sur le District Delta', texte: 'Aucun fait marquant à signaler.' },
    breves: principales.slice(1, 7),
    betisier: news.filter((n) => n.kicker === 'Insolite').slice(0, 4),
    honneur: regrouperHonneur(news.filter((n) => n.kicker === 'Portrait' || n.kicker === 'Trophée')).slice(0, 6),
    tribunal: (pre.res && pre.res.proces) || [],
    echos: genererEchos(state, T).lignes,
    evenement: evResultat,
    enquete: pre.res,
    conseil: riv.conseil,
    rivalites: rivPost,
    toursSansFaillite: state.toursSansFaillite,
    enchere: ench,
    fipa: fp.res,
    nonDroit: ndRes,
    district: districtG,
    duo: duoG,
    classement,
    rapports: Object.fromEntries(uids.map((u) => [u, state.zones[u].rapport])),
    finSaison: null,
  };
  for (const u of uids) {
    const z = state.zones[u];
    // Relevé du budget : lignes connues + le reste (aléas, enquête, FIPA, Conseil, entraide…).
    const lignes = (z._compta || []).map((x) => ({ ...x, v: round1(x.v) }));
    const autres = round1(z.budget - budget0[u] - lignes.reduce((s, x) => s + x.v, 0));
    if (Math.abs(autres) >= 0.1) lignes.push({ k: 'autres', l: 'Autres mouvements', v: autres });
    z.compta = { tour: T, debut: round1(budget0[u]), fin: z.budget, lignes };
    // Journal des jauges (moral, satisfaction, réputation, points de résultats).
    if (z._pt) {
      jalon(z, 'Divers');
      const j = fermerJournal(z);
      z.journal = { tour: T, avant: z.hier ? { moral: z.hier.moral, satisfaction: z.hier.satisfaction, reputation: z.hier.reputation } : null, apres: { moral: z.moral, satisfaction: z.satisfaction, reputation: z.reputation }, lignes: j };
      (gazette.journaux ||= {})[u] = { journal: z.journal, ipz: z.ipz, ipzComp: z.ipzComp, ipzCompHier: z.ipzCompHier, ipzDetail: z.ipzDetail, hierIpz: z.hier ? z.hier.ipz : null, compta: z.compta };
    }
    // Décor d'événement : gagné en aidant au grand événement ou en faisant une découverte pendant la période.
    const fete = state.nextDeadline ? periodeFete(jourBe(state.nextDeadline)) : null;
    if (fete && (z._contribEvenement || z._decouverteJour) && ajouterSkin(z, `fete:${fete.id}`)) {
      z.skinsChoix = { ...(z.skinsChoix || {}), fete: fete.id };
      z.rapport.push(`Décor d’événement gagné : « ${SKINS.fete.options[fete.id].nom} ». Il est équipé ; tu peux l’enlever dans « Personnaliser mon commissariat ».`);
      push(3, 'Décor', `${zoneLabel(z)} décroche le décor « ${SKINS.fete.options[fete.id].nom} »`, 'Une édition limitée, à gagner seulement pendant la période.', u);
    }
    delete z._joue; delete z._croiseDeja; delete z._nouveaux; delete z._missions; delete z._mission; delete z._points; delete z._ps; delete z._psEntraide; delete z._compta; delete z._decouverteJour; delete z._retardEnquete; delete z._contribEvenement; delete z._delegue; delete z._agenda; delete z._para; delete z._paraRep; delete z._paraGains; delete z._chefFaits; delete z._front; delete z._frontUtilise; delete z._service; delete z._incOk; delete z._croise; delete z._chefAvant; delete z._investi; delete z._interpelle;
  }

  // Champion de la semaine : meilleur IPZ moyen sur les 7 derniers tours (4 tours joués au moins).
  if (T % 7 === 0) {
    const cand = Object.values(state.zones).filter((z) => z.ipzSemaine && z.ipzSemaine.n >= 4).map((z) => ({ z, m: z.ipzSemaine.s / z.ipzSemaine.n })).sort((a, b) => b.m - a.m);
    if (cand[0]) {
      state.champion = { uid: cand[0].z.uid, tour: T, season: state.season, moyenne: round1(cand[0].m) };
      cand[0].z.rapport.push(`Champion de la semaine : meilleur IPZ moyen du district (${fmt1(cand[0].m)}). Une étoile dorée brille sur ton toit pendant 7 jours.`);
      push(8, 'Champion', `${zoneLabel(cand[0].z)}, champion de la semaine`, `Meilleur IPZ moyen du district sur 7 jours : ${fmt1(cand[0].m)}.`, cand[0].z.uid);
    } else state.champion = null;
    for (const z of Object.values(state.zones)) z.ipzSemaine = null;
  }

  // 10. Fin de saison ou tour suivant.
  // Fin anticipée décidée par le maître du jeu : ce soir, ou le soir où l'affaire en cours se termine (et la suivante s'ouvre).
  const finAnticipee = T < SEASON_LENGTH && (state.finSaison === 'soir' || (state.finSaison === 'enquete' && !!(pre && pre.res && pre.res.nouvelle)));
  // Duels de la semaine : le dernier soir de la semaine (ou de la saison), le meilleur cumul d'IPZ l'emporte.
  if (reglesV2(state) && state.rivaux && state.rivaux.w === semaineDe(T) && (T % 7 === 0 || T >= SEASON_LENGTH || finAnticipee)) resoudreDuels(state, push, T);
  if (T >= SEASON_LENGTH || finAnticipee) {
    delete state.finSaison;
    gazette.finSaison = finDeSaison(state, classement, { leger: finAnticipee });
  } else {
    state.turn = T + 1;
    // Les événements collectifs sont remplacés par les FIPA (plus de nouvel événement).
  }
  state.zonesConnues = Object.keys(state.zones);
  genererAffaires(state, makeRng(`${state.seed}:s${state.season}:t${state.turn}:affaires`));
  if (reglesV2(state)) { state.enchere = null; gazette.vente = annoncerVente(state, state.turn); }
  else gazette.prochainLot = annoncerLot(state);
  return { state, gazette };
}

/**
 * Records du Challenge (meilleur niveau de la partie sur chaque mini-jeu, meilleur score Bitonal par niveau) :
 * chaque soir, un record plus haut que celui relevé la veille compte pour son auteur (carrière, trophée « Recordman »).
 * Premier relevé (mise en service) : on note les records existants sans rien compter.
 */
function recordsBattus(state, players, push, zoneLabel) {
  if (!players) return;
  const cles = [...CHALLENGE.jeux.map((j) => ['defis', j]), ...NIVEAUX_URGENCE.map((n) => ['bitonal', n])];
  const init = !state.records;
  const rec = (state.records ||= {});
  for (const [champ, k] of cles) {
    let best = null;
    for (const [uid, p] of Object.entries(players)) {
      if (!p || p.retire || !state.zones[uid]) continue;
      const v = Math.min(champ === 'defis' ? CHALLENGE.niveauMax : 1e7, Math.floor(Number(p[champ] && p[champ][k]) || 0));
      if (v > 0 && (!best || v > best.v)) best = { uid, v };
    }
    const cle = `${champ}:${k}`, avant = rec[cle];
    if (!best || (avant && best.v <= avant.v)) continue;
    rec[cle] = { uid: best.uid, v: best.v };
    if (init || !avant) continue;
    const z = state.zones[best.uid];
    const c = (z.carriere ||= {});
    c.records = (c.records || 0) + 1;
    z.rapport.push(`Record battu (${champ === 'defis' ? NOMS_CHALLENGE[k] || k : `Bitonal ${k}`}) : ${c.records} record${c.records > 1 ? 's' : ''} battu${c.records > 1 ? 's' : ''} au total.`);
  }
}

/** Pièces d'enquête trouvées par la zone elle-même (pas reçues, ni données à tous). */
const SRC_RECUES = new Set(['partage', 'pacte', 'ouverture', 'rebond', 'rattrapage', 'tardif', 'audition']);
function piecesPropres(z) { return ((z.enquete && z.enquete.pieces) || []).filter((p) => !SRC_RECUES.has(p.src)).length; }

/** Énigmes réussies sur toute la carrière (toutes saisons) et paliers : toutes les ENIGMES.paliers.pas, une récompense. */
function paliersEnigmes(z, n) {
  if (!n) return;
  const c = (z.carriere ||= {});
  if (!Number.isFinite(c.enigmes)) c.enigmes = (z.stats && z.stats.quetesOk) || 0;
  const P = ENIGMES.paliers, avant = Math.floor(c.enigmes / P.pas);
  c.enigmes += n;
  for (let k = avant + 1; k <= Math.floor(c.enigmes / P.pas); k++) {
    z.budget += P.budget; (z._compta ||= []).push({ k: 'bonus', l: `Palier des énigmes (${k * P.pas} réussies)`, v: P.budget });
    z.jaugeIncidents = (z.jaugeIncidents || 0) + P.jauge;
    z.rapport.push(`Palier des énigmes : ${k * P.pas} énigmes réussies depuis ton arrivée ! +${P.budget} k€ et +${P.jauge} sur la jauge des skins.`);
  }
}

function resoudreDuels(state, push, T) {
  const { w, paires } = state.rivaux;
  for (const [u, r] of Object.entries(paires || {})) {
    const z = state.zones[u], zr = state.zones[r];
    if (!z || !zr || !z.chef) continue;
    const moi = scoreDuel(z, w), lui = scoreDuel(zr, w);
    const res = moi > lui && moi > 0 ? 'v' : lui > moi ? 'd' : 'n';
    const du = (z.chef.duels ||= { v: 0, d: 0, serie: 0, serieMax: 0 });
    if (res === 'v') {
      du.v += 1; du.serie += 1; du.serieMax = Math.max(du.serieMax || 0, du.serie);
      const nivAv = niveauChef(z.chef, 'commandement'), talAv = new Set(talentsDebloques(z.chef));
      z.reputation += DUEL.rep; z.chef.xp.commandement = Math.round(((z.chef.xp.commandement || 0) + DUEL.xp) * 10) / 10;
      z.chef.saison.commandement = Math.round(((z.chef.saison.commandement || 0) + DUEL.xp) * 10) / 10;
      z.rapport.push(`Duel de la semaine gagné contre ${zoneLabel(zr)} (${fmt1(moi)} contre ${fmt1(lui)} d’IPZ cumulé) : +${DUEL.rep} de réputation, +${DUEL.xp} XP en Commandement.`);
      if (niveauChef(z.chef, 'commandement') > nivAv) z.rapport.push(`Chef de corps : ${COMPETENCES.commandement.nom} niveau ${niveauChef(z.chef, 'commandement')}.`);
      const talNv = talentsDebloques(z.chef).filter((t) => !talAv.has(t));
      for (const t of talNv) z.rapport.push(`Nouveau talent débloqué : « ${TALENT[t].nom} » (${TALENT[t].texte.toLowerCase()}). Équipe-le dans tes ordres.`);
      if (talNv.length) z.chef.nouveauxTalents = [...new Set([...(z.chef.nouveauxTalents || []), ...talNv])];
      if (paires[r] === u) push(4, 'Duel de la semaine', `${zoneLabel(z)} remporte son duel contre ${zoneLabel(zr)}`, `${fmt1(moi)} contre ${fmt1(lui)} d’IPZ cumulé sur la semaine.${du.serie >= 3 ? ` ${du.serie} victoires d’affilée.` : ''}`, u);
    } else if (res === 'd') { du.d += 1; du.serie = 0; z.rapport.push(`Duel de la semaine perdu contre ${zoneLabel(zr)} (${fmt1(moi)} contre ${fmt1(lui)}). Revanche la semaine prochaine, peut-être.`); }
    z.chef.dernierDuel = { w, season: state.season, rival: r, moi, lui, res };
  }
}

/** Soirs joués en saison 1 pour devenir « Zone fondatrice ». */
export const FONDATEUR_SOIRS = 7;

function finDeSaison(state, classement, opts = {}) {
  const zones = Object.values(state.zones);
  const classes = classement.filter((c) => c.classe);
  const titres = [];
  const give = (uid, titre) => { if (!uid) return; titres.push({ uid, titre }); state.zones[uid].titres.push(`${titre} (saison ${state.season})`); };
  if (classes[0]) give(classes[0].uid, 'Zone de l’année');
  const byRep = zones.slice().sort((a, b) => b.reputation - a.reputation)[0];
  if (byRep) give(byRep.uid, 'Collègue en or');
  const byPap = zones.slice().sort((a, b) => b.paperassePic - a.paperassePic)[0];
  if (byPap) give(byPap.uid, 'Roi de la paperasse');
  const eligibles = zones.filter((z) => z.toursJoues >= MIN_TOURS_CLASSEMENT);
  const byPass = eligibles.slice().sort((a, b) => (b.stats.evenementsManques - a.stats.evenementsManques))[0];
  if (byPass && byPass.stats.evenementsManques > 0) give(byPass.uid, 'Passager clandestin');
  const byLimier = zones.slice().sort((a, b) => b.stats.limier - a.stats.limier)[0];
  if (byLimier && byLimier.stats.limier > 0) give(byLimier.uid, 'Fin limier');
  const byQuest = zones.slice().sort((a, b) => b.stats.quetesOk - a.stats.quetesOk)[0];
  if (byQuest && byQuest.stats.quetesOk > 0) give(byQuest.uid, 'Esprit vif');
  const byNoir = zones.slice().sort((a, b) => (b.stats.noirs || 0) - (a.stats.noirs || 0))[0];
  if (byNoir && (byNoir.stats.noirs || 0) > 0) give(byNoir.uid, 'Cerveau du district');

  for (const c of classes) state.zones[c.uid].ps += PS.finSaison;
  for (const c of classes) {
    const z = state.zones[c.uid];
    if (!(z.stats.pactesRompus > 0) && donnerTrophee(z, 'incorruptible', state.season, state.turn)) z.rapport.push('Trophée débloqué : « Incorruptible » (une saison classée sans jamais rompre un pacte).');
  }
  for (const z of zones) if ((z.stats.toursValides || 0) >= SEASON_LENGTH && donnerTrophee(z, 'increvable', state.season, state.turn)) z.rapport.push('Trophée débloqué : « Increvable » (ordres validés les 14 tours de la saison).');
  for (const [rang, c] of classes.slice(0, 3).entries()) {
    const z = state.zones[c.uid];
    z.plaques = [...(z.plaques || []), { season: state.season, rang: rang + 1 }];
    if (z.failliteSaison && !z.badges.includes('Phénix')) { z.badges.push('Phénix'); titres.push({ uid: c.uid, titre: 'Phénix' }); }
  }
  // Chef de corps : une médaille par compétence pour la plus forte progression de la saison (pas le plus haut niveau).
  for (const c of IDS_COMPETENCES) {
    const prog = (z) => (z.chef.saison[c] || 0) - ((z.chef.saisonJeux || {})[c] || 0);
    const best = zones.filter((z) => z.chef && prog(z) > 0).sort((a, b) => prog(b) - prog(a))[0];
    if (!best) continue;
    const nomM = `Médaille ${({ gestion: 'de la bonne gestion', commandement: 'du commandement', flair: 'du mérite judiciaire', diplomatie: 'de la coopération', proximite: 'de la proximité' })[c]}`;
    best.chef.medailles = [...(best.chef.medailles || []), { season: state.season, comp: c, nom: nomM }];
    give(best.uid, nomM);
  }
  const resume = { season: state.season, classement: classes.slice(0, 10), titres };
  state.palmares.push(resume);
  // Le document d'état est limité à 1 Mo : on garde les 12 dernières saisons au palmarès.
  if (state.palmares.length > 12) state.palmares = state.palmares.slice(-12);

  // Remise à zéro des zones, on garde l'identité, les PS, badges et titres.
  const oldSeason = state.season, tourFin = Number(state.turn) || 1;
  state.season += 1;
  state.turn = 1;
  // Révision d'oct. 2026 : la nouvelle saison passe aux règles v2 (classement, doctrines, choix qui coûtent).
  state.regles = 2;
  state.affaires = [];
  // Saison écourtée : l'Opération Filet contre l'ennemi de la saison n'a pas eu lieu, on le dit dans la Gazette.
  const filetManque = state.evenement && state.evenement.fantome && state.dir && state.dir.fantome ? state.dir.fantome.nom : null;
  state.evenement = null;
  // Directeur : les rendez-vous datés de l'ancienne saison (jours 15 à 19 introuvables) repartent de zéro.
  if (state.dir) { for (const k of ['g', 'prochain', 'coop', 'duo', 'coopProchain', 'duoProchain', 'forcer']) delete state.dir[k]; }
  // Relèves en cours : datées de l'ancienne saison, elles reviendraient au mauvais jour.
  state.releves = [];
  state.nonDroit = creerNonDroit(state.seed, state.season);
  state.vente = null; state.enchere = null;
  // L'enquête et ses traques continuent dans la nouvelle saison (voir plus bas) : on ne vide pas state.traques.
  state.fipas = []; state.fipaPaires = {}; state.duels = []; state.postes = []; state.pactes = []; state.defis = []; state.conseil = null; state.theme = null; state.motionsChef = [];
  // Bilan de saison : les pertes dépendent de ce que chaque zone a gagné et de la moyenne du district.
  const moy = moyennesDistrict(zones);
  for (const [uid, z] of Object.entries(state.zones)) {
    const bilan = calculerBilan(z, moy, `${state.seed}:bilan:${oldSeason}:${uid}`, !!opts.leger);
    const nz = newZone({ uid, code: z.code, nom: z.nom, couleur: z.couleur }, 1, { ps: z.ps, badges: z.badges, titres: z.titres, faillites: z.faillites, arrivee: z.arrivee || 0 });
    appliquerBilan(nz, z, bilan);
    // Passage anticipé (saison écourtée) : la moitié des agents recrutés au-delà des effectifs de départ reste,
    // dans la limite des bureaux après le bilan. Fin de saison normale : les effectifs repartent de zéro.
    const garde = opts.leger ? Math.floor(AGENTS_BASCULE.part * Math.max(0, (Number(z.agents) || START.agents) - START.agents)) : 0;
    if (garde) nz.agents = Math.min(capaciteAgents(nz), START.agents + garde);
    nz.bilan = { season: oldSeason, gagnes: bilan.gagnes, moyenne: bilan.moyenne, cas: bilan.cas, fin: BILAN.tours, clos: !bilan.cas.length };
    nz.infra = { ...(z.infra || {}) };
    nz.equipe = z.equipe || creerEquipe(uid);
    // Doctrine : à rechoisir ; garder la même fait monter la maîtrise.
    if (z.doctrine) { nz.doctrinePrec = z.doctrine; nz.maitrisePrec = z.maitrise || 0; }
    nz.trophees = z.trophees || [];
    if (z.affiches) nz.affiches = z.affiches;
    if (z.plaques) nz.plaques = z.plaques;
    // Zone fondatrice : présente depuis la saison 1 (au moins FONDATEUR_SOIRS soirs joués), gardé à vie, plus jamais attribué ensuite.
    if (z.fondateur) nz.fondateur = z.fondateur;
    else if (oldSeason === 1 && (Number(z.toursJoues) || 0) >= FONDATEUR_SOIRS) nz.fondateur = { season: 1 };
    if (z.decor) nz.decor = z.decor;
    if (z.skins) nz.skins = z.skins;
    if (z.skinsChoix) nz.skinsChoix = z.skinsChoix;
    if (z.jaugeIncidents) nz.jaugeIncidents = z.jaugeIncidents;
    if (z.carriere) nz.carriere = z.carriere;
    if (z.enigCarriere) nz.enigCarriere = z.enigCarriere; // classement « Esprit vif » de carrière
    // Une zone qui ne jouait plus reste inactive (duels, relèves, crises) jusqu'à son retour.
    nz.toursSansOrdres = z.toursSansOrdres || 0;
    // Enquête en cours : le dossier, les pièces en route et la mise à prix à choisir suivent la zone.
    if (z.enquete) nz.enquete = { ...z.enquete, ratt: true }; // pas de dossier de rattrapage : la zone était là
    if (z.enquetePrecedente) nz.enquetePrecedente = z.enquetePrecedente;
    if (z.enqueteDiffere && z.enqueteDiffere.length) nz.enqueteDiffere = z.enqueteDiffere;
    // Pistes en cours : leurs dates sont celles de l'ancienne saison, on les recale sur le nouveau compteur (jour 1).
    if (z.pistes) nz.pistes = z.pistes.map((p) => ({ ...p, retour: Math.max(1, (Number(p.retour) || 0) - tourFin), ...(p.lance != null ? { lance: Number(p.lance) - tourFin } : {}) }));
    if (z.primeAChoisir) nz.primeAChoisir = { ...z.primeAChoisir, tour: 0 };
    // Chef de corps : gardé de saison en saison (compétences, talents, médailles), avec une ligne d'états de service.
    nz.chef = z.chef ? { ...z.chef, saison: Object.fromEntries(IDS_COMPETENCES.map((c) => [c, 0])), saisonJeux: {} } : creerChef(null);
    delete nz.chef.parrain;
    // Les jours du chef sont ceux de l'ancienne saison (le compteur repart à 1) : blessure, délais du réseau,
    // changement de talents, rallonge et remise en route repartent à zéro.
    for (const k of ['blesse', 'hs', 'services', 'talentsT', 'rallongeT', 'remise', 'paraSuite', 'visites']) delete nz.chef[k];
    delete nz.chef.priseT; // la prise de fonctions se compte en jours joués (priseJ) : elle reprend là où elle en était
    if (z.adjoint) nz.adjoint = { ...z.adjoint, journal: [] };
    { const ci = classes.findIndex((c) => c.uid === uid), cl = classes[ci];
      nz.chef.etats = [...(nz.chef.etats || []), { season: oldSeason, rang: cl ? ci + 1 : null, sur: classes.length, moyenne: cl ? round1(cl.moyenne) : null, affaires: (z.stats.decouvertes || 0) + (z.stats.arrestations || 0), trophees: (z.trophees || []).filter((t) => t.s === oldSeason).length, anticipee: !!opts.leger, faits: faitsDArmes(z.stats), signature: z.chef ? signatureChef(z.chef) : null }].slice(-20); }
    if (z.dir) nz.dir = dirHeritage(z); // niveau des énigmes et des mini-jeux, souvenirs du Directeur
    // Le parc suit la zone : les véhicules gardent leur modèle et passent au contrôle technique (usure divisée par deux).
    // Si le garage a perdu un niveau et manque de places, les plus usés sont revendus et le produit s'ajoute au budget.
    const parc = heritageFlotte(z, nz);
    const n = bilan.cas.length;
    nz.rapport = [`Nouvelle saison : tu conserves tes formations, ton matériel, tes bâtiments, tes annexes et ton parc (${parc.gardes} véhicule${parc.gardes > 1 ? 's' : ''}, passés au contrôle technique${parc.vendus ? ` ; ${parc.vendus} revendu${parc.vendus > 1 ? 's' : ''} faute de place au garage, +${fmt1(parc.produit)} k€` : ''}), ${n ? `moins ${n} imprévu${n > 1 ? 's' : ''} de fin de saison (voir le Bilan de saison sur l’HP : tu peux en remettre en état jusqu’au tour ${BILAN.tours})` : 'sans aucun imprévu de fin de saison'}. ${nz.agents > START.agents ? `Le budget repart de la valeur de départ ; tu gardes ${nz.agents} agents (la moitié de tes recrues au-delà de ${START.agents}).` : 'Budget et effectifs repartent des valeurs de départ.'}`];
    nz.heritage = { season: oldSeason, niveaux: { ...nz.niveaux }, batiments: { ...nz.batiments }, annexes: Object.keys(nz.infra).filter((k) => nz.infra[k]).length };
    state.zones[uid] = nz;
  }
  // L'affaire en cours (qu'elle vienne de s'ouvrir ou non) continue dans la nouvelle saison, avec ses traques :
  // chaque zone retrouve son dossier. On n'en ouvre une neuve que s'il n'y en a pas (ou si elle est en pause).
  if (state.enquete && !state.enquetePause) {
    for (const nz of Object.values(state.zones)) nz.enquete = dossierDe(state, nz);
  } else if (!state.enquetePause) nouvelleAffaire(state);
  state.traques = (state.traques || []).filter((t) => t && !t.fini);
  return { ...resume, saisonSuivante: oldSeason + 1, ...(opts.leger ? { anticipee: true } : {}), ...(filetManque ? { filetManque } : {}) };
}

export { START };
