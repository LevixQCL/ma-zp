// Résolution d'un tour. Fonction pure et déterministe :
// mêmes données en entrée → même résultat, quel que soit l'ordinateur qui calcule.

import {
  APP_VERSION, AFFAIRE, SERVICES, SERVICE_LABELS, SEASON_LENGTH, ECONOMIE, RYTHMES, DELAI_ACADEMIE, DUREE_FORMATION, INFRAS, PS,
  MIN_TOURS_CLASSEMENT, START, DEPENSES, FLAGRANT, RENFORT, BATIMENTS, BATIMENT_MAX, TRAVAUX_TOURS, HERITAGE_PERTE, USURE, malusEtat, gainPrime, seuilChasse, gainRenfort, psEvenement, repRenfortAffaire } from './constants.js';
import { makeRng, hashString } from './rng.js';
import { attribuerSites, siteDe } from './sites.js';
import { genererEchos } from './gazette.js';
import { faireProgresser, surnomDe, intitule, verifierTrophees, donnerTrophee, TROPHEE, creerEquipe, appliquerNoms } from './equipe.js';
import {
  clone, clamp, round1, newZone, sanitizeOrders, autopilotOrders, agentsDisponibles, agentsLibres, capacite,
  forceEngagement, multAffaire, coutDecision, fraisFixes, ajusterBatiments, decisionImpossible, operationActive, ipzComposantes, ipzFrom, moyenneIpz, blessesActifs, migrateZone, effetsOperation, coutDepenses, ligneIpz, ouvrirJournal, jalon, noter, fermerJournal, vehiculesDisponibles,
} from './zone.js';
import { tourQuartiers, annoncerPointChaud, lirePatrouilles, assurerQuartiers, carteQuartiers } from './quartiers.js';
import { enquetePre, enqueteZone, enquetePost, nouvelleAffaire, indiceBonus } from './enquete.js';
import { fipaPre, fipaGenerer } from './fipa.js';
import { creerNonDroit, nonDroitResoudre } from './nondroit.js';
import { encheresResoudre, annoncerLot } from './encheres.js';
import { rivalitesPre, rivalitesPost, postesContre, themeActif, appliquerConsignes, absT, MAN } from './rivalites.js';
import { FLAGRANTS } from './contenu.js';
import { cabossesChoisis, placeLibre } from './parc.js';
import { decorValide, earlyBirdEligible, skinDe, skinsValides, SKINS, periodeFete, ajouterSkin } from './decor.js';
import { accidentVehicule, imageCabosses, payerIndemnites, reparerCabosses, coutCarrosserie } from './sinistres.js';
import { AFFAIRES_DISPUTEES, DOSSIERS_LOCAUX, EVENEMENTS_COLLECTIFS, COUPS_DURS, ALEAS, OPERATIONS, PRESSIONS, PRESSION_WEEKEND } from './contenu.js';

const fmt1 = (v) => String(round1(v)).replace('.', ',');
const median = (arr) => {
  if (!arr.length) return undefined;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function zoneLabel(z) { return `ZP ${z.code} ${z.nom}`; }

/** Zone d'un nouveau joueur : ressources médianes des zones actives, sans infrastructure. */
export function buildJoinZone(state, uid, profile, turn = state.turn) {
  const existants = Object.values(state.zones).filter((z) => isActive(z) && z.uid !== uid);
  const base = {};
  if (existants.length) {
    base.agents = Math.round(median(existants.map((z) => z.agents)));
    base.budget = round1(median(existants.map((z) => z.budget)));
    base.moral = Math.round(median(existants.map((z) => z.moral)));
    base.satisfaction = Math.round(median(existants.map((z) => z.satisfaction)));
    base.niveaux = {}; base.equip = {};
    for (const s of SERVICES) {
      base.niveaux[s] = Math.round(median(existants.map((z) => z.niveaux[s])));
      base.equip[s] = Math.round(median(existants.map((z) => z.equip[s])));
    }
  }
  const z = newZone({ uid, code: profile.code, nom: profile.nom, couleur: profile.couleur }, turn, { ...base, arrivee: Date.now() });
  // Site sensible : le même que celui que calculeraient tous les autres appareils.
  const tmp = { seed: state.seed, zones: { ...clone(state.zones || {}), [uid]: clone(z) } };
  attribuerSites(tmp);
  z.site = tmp.zones[uid].site;
  ajusterBatiments(z);
  z.protegeJusqua = absT(state, turn) + MAN.protectionTours;
  return z;
}

/**
 * Met un état enregistré par une ancienne version au format actuel :
 * les nouveaux champs reçoivent leur valeur par défaut, rien n'est effacé.
 */
export function migrateState(state) {
  if (!state) return state;
  const defaults = { version: 1, season: 1, turn: 1, zones: {}, affaires: [], evenement: null, affaireSeq: 0, palmares: [], minClientVersion: 0, enquete: null, enqueteSeq: 0, traques: [], fipas: [], fipaSeq: 0, fipaPaires: {}, duels: [], postes: [], conseil: null, theme: null, motionsChef: [], toursSansFaillite: 0, aReveler: [], enchere: null, enchereResultat: null, lotsRecents: [] };
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
export function createGame({ seed = 'delta', turnDeadline = 0 } = {}) {
  const state = {
    version: 1, minClientVersion: APP_VERSION, seed, season: 1, turn: 1, nextDeadline: turnDeadline,
    zones: {}, affaires: [], evenement: null, affaireSeq: 0, palmares: [], createdAt: turnDeadline,
  };
  state.nonDroit = creerNonDroit(seed, 1);
  nouvelleAffaire(state);
  annoncerLot(state);
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
export function resolveTurn(stateIn, { orders = {}, quests = {}, players = {}, nextWeekday = null } = {}) {
  const state = migrateState(clone(stateIn));
  state.minClientVersion = Math.max(state.minClientVersion || 0, APP_VERSION);
  const T = state.turn;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}`);
  const news = [];            // brèves de la Gazette
  const push = (prio, kicker, titre, texte, uid) => news.push({ prio, kicker, titre, texte, uid });

  // Early birds : les zones présentes à la première résolution après la mise à jour des skins.
  if (!state.earlyBird) state.earlyBird = { uids: Object.keys(state.zones || {}) };

  // 1. Joueurs inscrits sans zone (filet de sécurité) : ils jouent au tour suivant.
  for (const [uid, p] of Object.entries(players)) {
    if (state.zones[uid] || !p || p.retire) continue;
    state.zones[uid] = buildJoinZone(state, uid, p, T + 1);
    push(3, 'Bienvenue', `${zoneLabel(state.zones[uid])} rejoint le District Delta`, 'Nouvelle zone en service dès demain.', uid);
  }
  for (const z of Object.values(state.zones)) {
    if (z.joinedTurn === T && z.toursJoues === 0 && !z._annoncee) {
      push(3, 'Bienvenue', `${zoneLabel(z)} rejoint le District Delta`, 'Une nouvelle zone entre en service.', z.uid);
    }
  }
  // Mise à jour des noms, codes et couleurs (renommage) et retraits.
  for (const [uid, z] of Object.entries(state.zones)) {
    const p = players[uid];
    if (p) { if (p.nom) z.nom = String(p.nom).slice(0, 24); if (p.code) z.code = String(p.code).slice(0, 4); if (p.couleur) z.couleur = p.couleur; if (p.equipeNoms) appliquerNoms(z.equipe, uid, p.equipeNoms); if (p.decor) z.decor = decorValide(z, p.decor);
      if (p.earlyBird && earlyBirdEligible(z, state) && !(z.skins || []).some((k) => SKINS[String(k).split(':')[0]] && String(k).split(':')[0] !== 'fete')) ajouterSkin(z, p.earlyBird.skin);
      if (p.skinsChoix) z.skinsChoix = skinsValides(z, p.skinsChoix); }
    if (p && p.retire) delete state.zones[uid];
  }

  const uids = Object.keys(state.zones).filter((u) => state.zones[u].joinedTurn <= T).sort();
  const budget0 = Object.fromEntries(uids.map((u) => [u, state.zones[u].budget]));

  // 2. Ordres de chaque zone (joués ou pilote automatique).
  const ord = {};
  for (const uid of uids) {
    const z = state.zones[uid];
    z.rapport = [];
    if (orders[uid]) {
      ord[uid] = sanitizeOrders(z, orders[uid], state);
      z.toursSansOrdres = 0;
      z.dernierOrdre = { alloc: ord[uid].alloc, rythme: ord[uid].rythme, patrouilles: ord[uid].patrouilles || {}, secteurs: ord[uid].secteurs || {} };
      z._joue = true;
    } else {
      ord[uid] = autopilotOrders(z, state);
      if (players[uid] && players[uid].consignes) ord[uid] = sanitizeOrders(z, appliquerConsignes(z, ord[uid], players[uid].consignes, state), state);
      z.toursSansOrdres += 1;
      z._joue = false;
      z.rapport.push('Pas d’ordres ce tour : le pilote automatique a repris la dernière répartition.');
    }
    z._points = 0;
    z._compta = z._compta || [];
    z._ps = 0;
    // Photo d'avant le tour (pour les évolutions affichées au joueur) et journal des jauges.
    z.hier = { moral: z.moral, satisfaction: z.satisfaction, reputation: z.reputation, budget: z.budget, ipz: z.ipz, turn: T };
    ouvrirJournal(z);
  }
  const jalonTous = (label) => { for (const u of uids) jalon(state.zones[u], label); };

  // Relations entre zones (entraide, manœuvres, duels, Conseil).
  const riv = rivalitesPre(state, uids, ord, push, T);
  jalonTous('Diplomatie (entraide, manœuvres, duels, Conseil)');
  const theme = themeActif(state, T);
  // Salle des ventes : le lot gagné sert dès ce soir.
  const ench = encheresResoudre(state, uids, ord, push, T);
  jalonTous('Salle des ventes');

  // Enquête (partages, accusations, traques) et FIPA : avant la simulation des zones.
  // Les agents laissés sans affectation partent en premier (audition, traque, FIPA).
  for (const u of uids) ord[u]._libres = agentsLibres(state.zones[u], ord[u], T);
  const pre = enquetePre(state, uids, ord, push, T);
  jalonTous('Enquête (partages, accusation, traque)');
  const fp = fipaPre(state, uids, ord, push, T);
  jalonTous('FIPA');

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

    const force = equipe.reduce((s, x) => s + forceEngagement(state.zones[x.u], x.n), 0);
    if (force < aff.forceMin) {
      for (const x of equipe) state.zones[x.u].rapport.push(`${aff.titre} : force insuffisante (${fmt1(force)} sur ${aff.forceMin}), l’affaire reste ouverte.`);
      continue;
    }
    // Plus l'équipe est forte, plus l'affaire rapporte (de 60 % à 130 % des points annoncés).
    const mult = multAffaire(aff, force);
    const qualite = mult < 1 ? `dispositif juste suffisant, ${Math.round(mult * 100)} % des points` : mult > 1.001 ? `dispositif solide, ${Math.round(mult * 100)} % des points` : 'dispositif conseillé, 100 % des points';
    // Poste avancé : une zone rivale prélève 30 % des points.
    const preleveurs = postesContre(state, chef, ord, T).filter((u) => !equipe.some((x) => x.u === u) && state.zones[u]);
    let total = aff.recompense * mult;
    if (preleveurs.length) {
      const pris = total * 0.3; total -= pris;
      for (const u of preleveurs) { state.zones[u]._points += pris / preleveurs.length; state.zones[u].rapport.push(`Poste avancé : tu récupères ${fmt1(pris / preleveurs.length)} pts sur « ${aff.titre} ».`); }
      state.zones[chef].rapport.push(`${aff.titre} : un poste avancé rival a prélevé ${fmt1(pris)} pts.`);
    }
    const sommeN = equipe.reduce((s, x) => s + x.n, 0);
    for (const x of equipe) {
      const z = state.zones[x.u];
      const part = total * x.n / sommeN;
      z._points += part; z.stats.pointsAffaires += part; z.stats.affairesGagnees += 1; z.moral += 2;
      // Prime : de l'argent concret, partagé selon les agents engagés.
      const prime = round1(aff.recompense * mult * AFFAIRE.prime * x.n / sommeN);
      if (prime > 0) { z.budget += prime; z._compta.push({ k: 'affaire', l: `Prime d’affaire : ${aff.titre}`, v: prime }); }
      if (x.u === chef) { z.satisfaction += aff.recompense * 0.5 * mult; z.reputation += AFFAIRE.repChef + (equipe.length > 1 ? 1 : 0); if (equipe.length >= 3) z.stats.affairesOrchestre = (z.stats.affairesOrchestre || 0) + 1; }
      else z.reputation += repRenfortAffaire(x.n);
      jalon(z, `Affaire « ${aff.titre} » résolue (+2 de moral${x.u === chef ? `, satisfaction +${fmt1(aff.recompense * 0.5 * mult)} = moitié des points annoncés` : ''}${x.u === chef && equipe.length > 1 ? ', +1 réputation en chef d’équipe' : x.u !== chef ? ', réputation pour ton renfort' : ''})`);
      z.rapport.push(`${aff.titre} : affaire résolue${x.u === chef ? ' sous ta direction' : ` avec ${zoneLabel(state.zones[chef])}`} (prime +${fmt1(round1(aff.recompense * mult * AFFAIRE.prime * x.n / sommeN))} k€, +2 de moral, +${fmt1(part)} pts pour ${x.n} agent${x.n > 1 ? 's' : ''} ; force de l’équipe ${fmt1(force)}, ${qualite}).`);
      // Intervention musclée : plus on engage d'agents, plus le risque d'un blessé augmente.
      const risque = Math.min(0.3, Math.max(0, (x.n - 3) * 0.05));
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
    const requis = Math.max(3, 3 * actives.length);
    const total = uids.reduce((s, u) => s + ord[u].evenement, 0);
    const reussi = total >= requis;
    const absents = actives.filter((u) => ord[u].evenement === 0);
    for (const u of uids) {
      const z = state.zones[u];
      const c = ord[u].evenement;
      if (c > 0) {
        z.stats.contributions += 1;
        z._ps += psEvenement(c);
        if (reussi) z.reputation += Math.max(1, Math.round(10 * c / total));
      } else if (actives.includes(u)) z.stats.evenementsManques += 1;
      if (c > 0) z._contribEvenement = true;
      if (c > 0 && reussi) jalon(z, 'Événement du district : ta part des agents envoyés');
      if (reussi) { z.satisfaction += 8; z.rapport.push(`${ev.titre} : réussi (+8 de satisfaction).`); }
      else { z.satisfaction -= 10; z.rapport.push(`${ev.titre} : échec, ${total} agents sur ${requis} (−10 de satisfaction).`); }
    }
    evResultat = { titre: ev.titre, reussi, total, requis, absents: absents.map((u) => zoneLabel(state.zones[u])) };
    push(12, ev.titre, reussi ? `Mission accomplie : ${total} agents pour ${requis} requis` : `Raté : ${total} agents pour ${requis} requis`,
      reussi ? 'Tout le district gagne 8 points de satisfaction.' : `Tout le district perd 10 points de satisfaction.${absents.length ? ` Aucun agent envoyé par : ${evResultat.absents.join(', ')}.` : ''}`);
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
    (renfortsRecus[r.cible] ||= []).push({ de: u, n: r.agents });
    const { rep, ps } = gainRenfort(r.agents);
    z.reputation += rep; z._ps += ps; z.stats.renfortsPretes = (z.stats.renfortsPretes || 0) + 1;
    z.rapport.push(`Renfort : ${r.agents} de tes agents aident ${zoneLabel(c)} sur « ${op.titre} » (+${rep} de réputation, +${ps} PS).`);
  }
  for (const [cible, l] of Object.entries(renfortsRecus)) {
    const n = l.reduce((a, b) => a + b.n, 0);
    const noms = l.map((x) => zoneLabel(state.zones[x.de]));
    push(7, 'Solidarité', `${noms.join(', ')} ${l.length > 1 ? 'volent' : 'vole'} au secours de ${zoneLabel(state.zones[cible])}`, `${n} agent${n > 1 ? 's' : ''} en renfort sur l’opération d’envergure.`, cible);
  }

  jalonTous('Renforts prêtés');
  // 5. Simulation locale de chaque zone.
  for (const uid of uids) {
    const z = state.zones[uid];
    const o = ord[uid];
    const zr = makeRng(`${state.seed}:s${state.season}:t${T}:${uid}`);
    const q = quests[uid];


    // Fins de formation, arrivées de l'académie.
    if (z.travaux && z.travaux.fin <= T) {
      const bt = z.travaux.batiment;
      z.batiments[bt] = Math.min(BATIMENT_MAX, z.batiments[bt] + 1);
      z.rapport.push(`Travaux terminés : ${BATIMENTS[bt].nom} au niveau ${z.batiments[bt]} (${BATIMENTS[bt].capacite(z.batiments[bt])} ${BATIMENTS[bt].unite}).`);
      push(3, 'Chantier', `${zoneLabel(z)} agrandit son ${BATIMENTS[bt].nom.toLowerCase()}`, `Niveau ${z.batiments[bt]} : jusqu’à ${BATIMENTS[bt].capacite(z.batiments[bt])} ${BATIMENTS[bt].unite}.`, uid);
      z.travaux = null;
    }
    payerIndemnites(z, T);
    for (const f of z.formations) if (f.fin === T) { z.niveaux[f.service] = Math.min(5, z.niveaux[f.service] + 1); z.rapport.push(`Formation terminée : ${SERVICE_LABELS[f.service]} passe au niveau ${z.niveaux[f.service]}.`); }
    const arrivees = z.academie.filter((a) => a.arrivee === T).reduce((s, a) => s + a.n, 0);
    if (arrivees) { z.agents += arrivees; z.rapport.push(`${arrivees} recrue${arrivees > 1 ? 's' : ''} sort${arrivees > 1 ? 'ent' : ''} de l’académie.`); }
    z.academie = z.academie.filter((a) => a.arrivee > T);

    // Aléa léger et coup dur (effets immédiats sur ce tour ou les suivants). `z.scene` les garde pour l'illustration de l'HP.
    z.scene = { tour: T };
    let adminMult = 1;
    // L'Accueil comme assurance : chaque agent au-delà de 2 évite 15 % des tracas internes (jusqu'à 60 %).
    const nAdmin = (o.alloc && o.alloc.admin) || 0;
    const protection = clamp((nAdmin - 2) * 0.15, 0, 0.6);
    const evite = (titre) => { z.rapport.push(`Évité : ${titre.charAt(0).toLowerCase()}${titre.slice(1)}. Ton Accueil (${nAdmin} agents) a paré le coup.`); z.stats.evites = (z.stats.evites || 0) + 1; };
    if (zr.chance(0.3)) {
      const a = zr.pick(ALEAS);
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
        z.rapport.push(`${a.titre} : ${a.texte}${a.interne && protection < 0.6 ? ' (un Accueil plus fourni réduit ce risque)' : ''}`);
        jalon(z, `Imprévu : ${a.titre}`);
        z.scene.alea = a.id;
        push(2, 'Insolite', `${zoneLabel(z)} : ${a.titre.charAt(0).toLowerCase()}${a.titre.slice(1)}`, a.texte, uid);
      }
    }
    let coupDur = null;
    if (zr.chance(0.13)) {
      const pool = COUPS_DURS.map((c) => {
        let w = c.w;
        if (c.id === 'rebellion') { if (z.niveaux.intervention >= 3) w *= 0.5; if (z.equip.intervention >= 3) w *= 0.7; }
        if (c.id === 'grippe') { if (z.moral > 70) w *= 0.5; if (z.infra.sport) w *= 0.6; }
        if (c.id === 'plainte') { if (z.paperasse < 8) w *= 0.5; if (z.reputation > 60) w *= 0.6; }
        if (c.id === 'panne' && z.infra.logiciel) w *= 0.4;
        return { ...c, w };
      });
      coupDur = zr.weighted(pool);
      if (coupDur.interne && zr.chance(protection)) { evite(coupDur.titre); coupDur = null; }
    }
    if (!coupDur && z.renforceSuite >= 3 && o.rythme === 'renforce' && zr.chance(0.5)) coupDur = { id: 'epuisement', titre: 'Épuisement' };
    if (coupDur) {
      z.scene.coup = coupDur.id;
      let texte = '';
      switch (coupDur.id) {
        case 'rebellion': {
          const n = zr.int(1, 2), duree = zr.int(2, 4);
          z.blesses.push({ n, retour: T + 1 + duree, motif: 'blessé' }); z.moral -= 4;
          texte = `${n} agent${n > 1 ? 's' : ''} blessé${n > 1 ? 's' : ''}, absent${n > 1 ? 's' : ''} ${duree} tours. −4 de moral.`; break;
        }
        case 'grippe': {
          const n = Math.max(1, Math.round(z.agents * zr.float(0.1, 0.2)));
          z.blesses.push({ n, retour: T + 3, motif: 'malade' });
          texte = `${n} agents malades, absents 2 tours.`; break;
        }
        case 'plainte': {
          z.satisfaction -= 6; z.blesses.push({ n: 1, retour: T + 3, motif: 'enquête interne' });
          texte = '−6 de satisfaction, un agent bloqué en administration 2 tours.'; break;
        }
        case 'panne': { adminMult = 0; texte = 'Administration à l’arrêt ce tour.'; break; }
        case 'epuisement': {
          z.blesses.push({ n: 1, retour: T + 6, motif: 'épuisé' });
          texte = 'Trop d’heures supplémentaires : un agent absent 5 tours.'; break;
        }
        default: break;
      }
      z.rapport.push(`Coup dur, ${coupDur.titre.toLowerCase()} : ${texte}`);
      z.dernierCoupDur = { titre: coupDur.titre, texte, tour: T };
      jalon(z, `Coup dur : ${coupDur.titre.toLowerCase()}`);
      push(coupDur.id === 'rebellion' ? 9 : 5, 'Coup dur', `${coupDur.titre} à ${zoneLabel(z)}`, texte, uid);
    }

    // Énigmes du jour (jusqu'à 3) : bonus au choix dès 2 bonnes réponses.
    let bonusService = null;
    const tous = (Array.isArray(q) ? q : q ? [q] : []);
    const qs = tous.filter((x, k) => x && (x.slot ?? k) !== 3);
    const noir = tous.find((x, k) => x && (x.slot ?? k) === 3);
    if (noir && noir.statut === 'ok') { z.stats.noirs = (z.stats.noirs || 0) + 1; z._ps += PS.noir; z.rapport.push(`Dossier noir résolu : chapeau (+${PS.noir} PS).`); }
    else if (noir && noir.statut === 'rate') z.rapport.push('Dossier noir : raté cette fois, sans conséquence.');
    const ok = qs.filter((x) => x.statut === 'ok').length;
    const faux = qs.filter((x) => x.statut === 'rate').length;
    if (qs.length) {
      z.stats.quetesOk += ok;
      z._ps += ok * PS.queteOk + faux * PS.queteTentee;
      if (faux) z.moral -= faux;
      jalon(z, `Énigmes : ${faux} mauvaise${faux > 1 ? 's' : ''} réponse${faux > 1 ? 's' : ''} (−1 de moral chacune)`);
      const b = qs.find((x) => x.bonus);
      let txt = `Énigmes du jour : ${ok} bonne${ok > 1 ? 's' : ''} réponse${ok > 1 ? 's' : ''} sur ${qs.length}${faux ? ` (−${faux} de moral)` : ''}`;
      if (ok >= 2 && b) {
        if (b.bonus === 'moral') { z.moral += 3; txt += ', bonus +3 de moral'; }
        else if (b.bonus === 'budget') { z.budget += 2; z._compta.push({ k: 'bonus', l: 'Bonus d’énigmes', v: 2 }); txt += ', bonus +2 k€'; }
        else if (b.bonus === 'indice') { txt += indiceBonus(state, z, zr) ? ', bonus +1 indice d’enquête' : ', bonus indice (rien de nouveau à trouver)'; }
        else if (b.bonus === 'capacite' && SERVICES.includes(b.service)) { bonusService = b.service; txt += `, bonus +10 % en ${SERVICE_LABELS[b.service]}`; }
      }
      jalon(z, 'Énigmes : bonus choisi');
      if (ok === 3) { z._ps += 5; z.budget += 3; z.moral += 2; z._compta.push({ k: 'bonus', l: 'Prime « sans faute » (énigmes)', v: 3 }); txt += ', sans faute : +3 k€, +2 de moral, +5 PS'; }
      z.rapport.push(`${txt}.`);
    }

    jalon(z, 'Énigmes : sans faute (+2 de moral)');
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
    for (const pr2 of [pre.prises[uid], fp.prises[uid]]) {
      if (!pr2) continue;
      for (const [s, n0] of Object.entries(pr2)) { const k = Math.min(libres, n0); libres -= k; alloc[s] = Math.max(0, (alloc[s] || 0) - (n0 - k)); }
      const n = Object.values(pr2).reduce((a2, b2) => a2 + b2, 0);
      if (n && pr2 === fp.prises[uid]) z.rapport.push(`FIPA : ${n} agent${n > 1 ? 's' : ''} mobilisé${n > 1 ? 's' : ''} sur le dispositif commun.`);
    }
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
    let reserve = 0;
    if (dep && coutDepenses(dep, z) > 0) {
      const achats = [];
      let paye = 0;
      const payer = (k, cout, fn) => { if (z.budget >= cout) { z.budget -= cout; paye += cout; fn(); achats.push(k); } else achats.push(`${k} (refusé : budget insuffisant)`); };
      if (dep.reserve) payer(`${dep.reserve} agent${dep.reserve > 1 ? 's' : ''} de réserve en ${SERVICE_LABELS[dep.reserveService]}`, dep.reserve * DEPENSES.reserve.cout, () => { reserve = dep.reserve; });
      if (dep.prime) { const g = gainPrime(z.moral); payer(`prime au personnel (+${g} de moral)`, DEPENSES.prime.cout, () => { z.moral += g; }); }
      if (dep.prevention) payer('campagne de prévention (criminalité −6)', DEPENSES.prevention.cout, () => { z.criminalite = clamp(z.criminalite - 6, 10, 95); });
      if (dep.soustraitance) payer('sous-traitance administrative (−5 dossiers)', DEPENSES.soustraitance.cout, () => { z.paperasse = Math.max(0, z.paperasse - 5); });
      if (dep.revision) payer(`révision du parc (état ${Math.round(100 - z.usure)} % → ${Math.round(100 - Math.max(0, z.usure - USURE.revision))} %)`, DEPENSES.revision.cout, () => { z.usure = Math.max(0, z.usure - USURE.revision); });
      if (dep.carrosserie && (z.cabosses || []).length) { const nc = cabossesChoisis(z, dep.carrosserie).length; payer(`carrosserie (${nc} véhicule${nc > 1 ? 's' : ''} réparé${nc > 1 ? 's' : ''}${z.infra.garage ? ' à l’atelier' : ', immobilisé' + (nc > 1 ? 's' : '') + ' ce tour'})`, coutCarrosserie(z, dep.carrosserie), () => { reparerCabosses(z, T, dep.carrosserie); }); }
      z.rapport.push(`Dépenses du jour : ${achats.join(', ')}.`);
      if (paye) z._compta.push({ k: 'depenses', l: 'Dépenses du jour', v: -paye });
    }

    jalon(z, 'Prime au personnel (+4 sous 70 de moral, +2 sous 85, +1 au-delà)');
    imageCabosses(z, T, push, zoneLabel(z));
    jalon(z, 'Véhicules cabossés non réparés (image)');
    // Capacités des services (avec les agents restés à leur poste, plus la réserve).
    const cap = {};
    for (const s of SERVICES) {
      const renfort = reserve && dep.reserveService === s ? reserve * 0.8 : 0;
      const bTheme = theme && ((theme.id === 'routiere' && s === 'roulage') ? 1.5 : (theme.id === 'proximite' && s === 'proximite') ? 1.3 : 1) || 1;
      cap[s] = capacite(z, s, alloc[s] + renfort, { rythme: o.rythme, turn: T, bonus: (bonusService === s ? 1.1 : 1) * bTheme, adminMult });
    }

    // Enquête : démarches et enquête de voisinage.
    const detaches = enqueteZone(state, z, o, makeRng(`${state.seed}:s${state.season}:t${T}:${uid}:enq`), cap, pre) || 0;

    jalon(z, 'Enquête (démarches)');
    // Intervention : incidents du jour.
    const incidents = clamp(Math.round(1.5 + z.criminalite / 14) + (pr.incidents || 0) + zr.int(-1, 1), 1, 14);
    const traites = Math.min(incidents, Math.floor(cap.intervention / 1.1));
    const rates = incidents - traites;
    z.stats.incidents += incidents; z.stats.traites += traites;
    z.satisfaction += traites * 0.5 - rates * 1.8;
    noter(z, 'satisfaction', `Incidents traités : ${traites} × +0,5`, traites * 0.5);
    noter(z, 'satisfaction', `Incidents ratés : ${rates} × −1,8`, -rates * 1.8);
    jalon(z, 'Incidents');
    if (rates >= 3) z.moral -= 2;
    jalon(z, '3 incidents ratés ou plus : −2 de moral');
    z.rapport.push(`Intervention : ${traites} incident${traites > 1 ? 's' : ''} traité${traites > 1 ? 's' : ''} sur ${incidents}.`);
    // Flagrant délit : les patrouilles qui ne sont pas prises par les incidents peuvent tomber sur un auteur.
    const surplus = Math.max(0, cap.intervention / 1.1 - incidents);
    const chanceFlag = Math.min(FLAGRANT.max, surplus * FLAGRANT.parUnite);
    if (chanceFlag > 0 && zr.chance(chanceFlag)) {
      const q = assurerQuartiers(state, z);
      const cells = Object.keys(q).sort((a, b) => q[b] - q[a]);
      const cell = cells.length ? cells[zr.int(0, Math.min(2, cells.length - 1))] : null;
      const lieu = cell ? carteQuartiers(state).nomDe(Number(cell)) : 'dans la zone';
      const fait = zr.pick(FLAGRANTS);
      z._points += FLAGRANT.points; z._ps += FLAGRANT.ps; z.satisfaction += 1; z.stats.flagrants = (z.stats.flagrants || 0) + 1;
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
    jalon(z, `Présence de la Proximité : capacité ${fmt1(cap.proximite)} × 0,12`);
    z.satisfaction += tourQuartiers(state, z, { patrouilles, agentsProx: alloc.proximite || 0, capProx: cap.proximite, rng: zr, zoneLabel });
    noter(z, 'satisfaction', 'Point chaud désamorcé', z._pcSatisf || 0); delete z._pcSatisf;
    jalon(z, `Quartiers inquiets (criminalité moyenne ${Math.round(z.criminalite)})`);
    // Recherche : dossiers locaux.
    let nouveauDossier = 0;
    if (zr.chance(0.6)) {
      const reste = zr.int(6, 14);
      z.dossiers.push({ id: ++z.dossierSeq, titre: zr.pick(DOSSIERS_LOCAUX), reste, total: reste, points: Math.round(reste / 2), age: 0 });
      nouveauDossier = 1;
    }
    let travail = Math.max(0, cap.recherche - detaches);
    let resolus = 0;
    for (const d of z.dossiers) {
      if (travail <= 0) break;
      const t = Math.min(travail, d.reste);
      d.reste = round1(d.reste - t); travail -= t;
      if (d.reste <= 0.05) {
        resolus += 1; z._points += d.points; z.satisfaction += 2;
        jalon(z, `Dossier « ${d.titre} » élucidé (+2 de satisfaction)`);
        z.rapport.push(`Recherche : dossier « ${d.titre} » élucidé (+${d.points} pts).`);
      }
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
    const recettes = cap.roulage * ECONOMIE.amendeParCapacite;
    const totalAlloc = SERVICES.reduce((s, k) => s + alloc[k], 0) || 1;
    if (pr.roulageMin) {
      if (alloc.roulage >= pr.roulageMin) { z.satisfaction += 2; z.rapport.push('Contrôles de vitesse demandés par les riverains : assurés (+2 de satisfaction).'); }
      else { z.satisfaction -= 3; z.rapport.push('Contrôles de vitesse demandés par les riverains : pas assez d\u2019agents (−3 de satisfaction).'); }
    }
    jalon(z, 'Contrôles de vitesse demandés par les riverains');
    if (alloc.roulage / totalAlloc > seuilChasse(z) && !(theme && theme.id === 'routiere')) {
      z.satisfaction -= 2; z.rapport.push(`Roulage : plus de ${Math.round(seuilChasse(z) * 100)} % des effectifs, effet « chasse aux PV » (−2 de satisfaction).`);
      jalon(z, 'Roulage : effet « chasse aux PV »');
    } else { z.satisfaction += cap.roulage * 0.1; jalon(z, `Sécurité routière : capacité Roulage ${fmt1(cap.roulage)} × 0,1`); }
    // Administration : la pile de paperasse.
    z.paperasse = Math.max(0, z.paperasse + traites * 0.4 + nouveauDossier + 1.2 - cap.admin * 1.2);
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
        z.budget -= cd;
        z._compta.push({ k: 'decision', l: 'Grande décision', v: -cd });
        if (dec.type === 'agrandir') { z.travaux = { batiment: dec.batiment, fin: T + TRAVAUX_TOURS }; z.rapport.push(`Travaux lancés : ${BATIMENTS[dec.batiment].nom}, niveau ${z.batiments[dec.batiment] + 1} dans ${TRAVAUX_TOURS} tour${TRAVAUX_TOURS > 1 ? 's' : ''}.`); }
        if (dec.type === 'recruter') { z.academie.push({ n: dec.n, arrivee: T + DELAI_ACADEMIE }); z.rapport.push(`${dec.n} recrue${dec.n > 1 ? 's' : ''} à l’académie, arrivée dans ${DELAI_ACADEMIE} tour${DELAI_ACADEMIE > 1 ? 's' : ''}.`); }
        if (dec.type === 'former') { z.formations.push({ service: dec.service, fin: T + DUREE_FORMATION + 1 }); z.rapport.push(`Formation lancée : ${SERVICE_LABELS[dec.service]} (2 agents indisponibles ${DUREE_FORMATION} tour${DUREE_FORMATION > 1 ? 's' : ''}).`); }
        if (dec.type === 'equiper') {
          if (dec.cible === 'vehicule') { z.usure = z.usure * z.vehicules / (z.vehicules + 1); z.vehicules += 1; z.rapport.push('Nouveau véhicule livré.'); }
          else { z.equip[dec.cible] += 1; z.rapport.push(`Équipement ${SERVICE_LABELS[dec.cible]} au niveau ${z.equip[dec.cible]}.`); }
        }
        if (dec.type === 'construire') { z.infra[dec.infra] = true; z.rapport.push(`Infrastructure construite : ${INFRAS[dec.infra].nom}.`); push(4, 'Chantier', `${zoneLabel(z)} inaugure : ${INFRAS[dec.infra].nom.toLowerCase()}`, INFRAS[dec.infra].effet + '.', uid); }
      }
    }

    // Budget du tour.
    const ff = fraisFixes(z, state, { amendes: recettes, rythme: o.rythme });
    z.budget += ff.total;
    z._compta.push(...ff.lignes);
    // Usure : un peu chaque jour, et surtout à chaque intervention (répartie sur le parc).
    const avant = z.usure;
    z.usure = clamp(z.usure + (USURE.parTour + traites * USURE.parIntervention / Math.max(1, z.vehicules)) * (z.infra.garage ? 0.5 : 1), 0, USURE.max);
    const etat = Math.round(100 - z.usure), malus = Math.round((1 - malusEtat(etat)) * 100);
    z.rapport.push(`Véhicules : ${traites} intervention${traites > 1 ? 's' : ''}, usure +${fmt1(z.usure - avant)} %, état du parc ${etat} %${malus ? ` (Intervention −${malus} %, pense à une révision)` : ''}.`);
    // Accident de véhicule de service : le risque suit la façon dont la zone roule.
    const acc = accidentVehicule(z, T, makeRng(`${state.seed}:s${state.season}:t${T}:${uid}:veh`),
      { traites, rythme: o.rythme, interventionAgents: alloc.intervention || 0, vehiculesDispo: vehiculesDisponibles(z, T) }, push, zoneLabel(z));
    if (acc) jalon(z, acc.type === 'accrochage' ? 'Accrochage d’un véhicule' : 'Véhicule sinistré');

    // Moral.
    jalon(z, 'Accident de véhicule');
    const m0 = z.moral;
    z.moral += (60 - z.moral) * 0.08;
    jalon(z, `Retour naturel vers 60 : 8 % de l’écart (${fmt1(m0)} → 60)`);
    z.moral += RYTHMES[o.rythme].moral;
    jalon(z, `Rythme ${RYTHMES[o.rythme].label.toLowerCase()}`);
    if (z.infra.sport) z.moral += 1;
    jalon(z, 'Salle de sport');
    if (z.budget < 0) z.moral -= 3;
    jalon(z, 'Budget négatif : −3');
    z.renforceSuite = o.rythme === 'renforce' ? z.renforceSuite + 1 : 0;

    // Dérives naturelles.
    z.satisfaction += (50 - z.satisfaction) * 0.04;
    jalon(z, 'Retour naturel vers 50 : 4 % de l’écart');
    z.reputation += (50 - z.reputation) * 0.03;
    jalon(z, 'Retour naturel vers 50 : 3 % de l’écart');

    // Malus : chef absent, inspection générale.
    if (z.toursSansOrdres >= 2) { z.satisfaction -= 2; z.moral -= 2; z.rapport.push('Chef absent depuis plusieurs tours : −2 de satisfaction et de moral.'); }
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
    z.blesses = z.blesses.filter((b) => b.retour > T + 1 || b.retour > T);
    z.vehiculesHS = z.vehiculesHS.filter((v) => v.retour > T + 1);
    z.formations = z.formations.filter((f) => f.fin > T);
    z.renforts = (z.renforts || []).filter((x) => x.retour > T + 1);

    // IPZ.
    jalon(z, 'Divers');
    const comp = ipzComposantes(z, { ratio: incidents ? traites / incidents : 1, points: z._points });
    const ipzHier = z.ipz, compHier = z.ipzComp || null;
    z.ipz = ipzFrom(comp);
    z.ipzComp = comp;
    z.ipzCompHier = compHier;
    z.ipzDetail = { incidents, traites, points: round1(z._points), budget: round1(z.budget) };
    z.rapport.push(ligneIpz(comp, compHier, z.ipz, z.toursJoues > 0 || compHier ? ipzHier : null, z.ipzDetail));
    if (z._joue) {
      z.ipzSomme += z.ipz; z.toursJoues += 1;
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
    });
    if (prog.ligne) z.rapport.push(prog.ligne);
    for (const m of prog.montees) {
      z.rapport.push(`Promotion d’honneur : ${m.prenom} ${m.nom} gagne un surnom, « ${surnomDe(m)} ».`);
      push(4, 'Portrait', `${zoneLabel(z)} : ${m.prenom} ${m.nom} devient « ${surnomDe(m)} »`, `${intitule(m)} de la zone, ${m.f ? 'saluée' : 'salué'} par ses collègues.`, uid);
    }
    for (const id of verifierTrophees(z)) if (donnerTrophee(z, id, state.season, T)) {
      z.rapport.push(`Trophée débloqué : « ${TROPHEE[id].nom} » (${TROPHEE[id].texte.toLowerCase()}).`);
      push(5, 'Trophée', `${zoneLabel(z)} décroche le trophée « ${TROPHEE[id].nom} »`, TROPHEE[id].texte + '.', uid);
    }
    if (z.ipzHist.length > 30) z.ipzHist.shift();
    z.ps += Math.min(PS.plafondJour, z._ps);
    z.budget = round1(z.budget);
    z.criminalite = round1(z.criminalite);
    z.paperasse = round1(z.paperasse);
    z.satisfaction = round1(z.satisfaction);
    z.moral = round1(z.moral);
    z.reputation = round1(z.reputation);
  }

  // Enquête : fin d'affaire, nouvelle affaire ; nouvelles demandes de FIPA.
  enquetePost(state, pre, push);
  jalonTous('Enquête (fin d’affaire)');
  const rivPost = rivalitesPost(state, uids, push, T, nextWeekday, players);
  jalonTous('Duels, péril, tutelle');
  fipaGenerer(state, T, T >= SEASON_LENGTH - 3);

  // 5 bis. Situation du jour et opérations d'envergure pour le tour suivant.
  for (const z of Object.values(state.zones)) {
    const nr = makeRng(`${state.seed}:s${state.season}:t${T}:next:${z.uid}`);
    if (z.operation && T + 1 >= z.operation.tourDebut + z.operation.duree) z.operation = null;
    const site = siteDe(z);
    // Le site sensible peut déclencher sa propre opération d'envergure…
    if (!z.operation && site && site.operation && T + 1 >= 3 && nr.chance(0.05)) {
      z.operation = { id: `site-${site.id}`, ...JSON.parse(JSON.stringify(site.operation)), site: site.id, tourDebut: T + 1, couvertures: [] };
    }
    if (!z.operation && T + 1 >= 3 && nr.chance(0.16)) {
      const op = nr.pick(OPERATIONS);
      z.operation = { ...JSON.parse(JSON.stringify(op)), tourDebut: T + 1, couvertures: [] };
    }
    const pressions = [];
    if (nextWeekday === 5 || nextWeekday === 6) pressions.push(PRESSION_WEEKEND);
    if (nr.chance(0.75)) pressions.push(nr.pick(PRESSIONS.filter((p) => !(p.id === 'nuit' && pressions.length))));
    // … et, plus souvent, un imprévu du jour.
    if (site && nr.chance(0.25)) {
      const ev = nr.pick(site.evenements);
      pressions.unshift({ id: `site-${site.id}`, site: site.id, titre: `${site.nom} · ${ev.titre}`, texte: ev.texte, effet: ev.effet });
    }
    z.pressions = JSON.parse(JSON.stringify(pressions.slice(0, 3)));
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
    honneur: news.filter((n) => n.kicker === 'Portrait' || n.kicker === 'Trophée').slice(0, 6),
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
    const fete = periodeFete(new Date(state.nextDeadline || Date.now()));
    if (fete && (z._contribEvenement || z._decouverteJour) && ajouterSkin(z, `fete:${fete.id}`)) {
      z.skinsChoix = { ...(z.skinsChoix || {}), fete: fete.id };
      z.rapport.push(`Décor d’événement gagné : « ${SKINS.fete.options[fete.id].nom} ». Il est équipé ; tu peux l’enlever dans « Personnaliser mon commissariat ».`);
      push(3, 'Décor', `${zoneLabel(z)} décroche le décor « ${SKINS.fete.options[fete.id].nom} »`, 'Une édition limitée, à gagner seulement pendant la période.', u);
    }
    delete z._joue; delete z._points; delete z._ps; delete z._compta; delete z._decouverteJour; delete z._retardEnquete; delete z._contribEvenement;
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
  if (T >= SEASON_LENGTH) {
    gazette.finSaison = finDeSaison(state, classement);
  } else {
    state.turn = T + 1;
    // Les événements collectifs sont remplacés par les FIPA (plus de nouvel événement).
  }
  genererAffaires(state, makeRng(`${state.seed}:s${state.season}:t${state.turn}:affaires`));
  const prochain = annoncerLot(state);
  gazette.prochainLot = prochain;
  return { state, gazette };
}

function finDeSaison(state, classement) {
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
    if (!(z.stats.manoeuvresSaison > 0) && donnerTrophee(z, 'incorruptible', state.season, state.turn)) z.rapport.push('Trophée débloqué : « Incorruptible » (une saison classée sans aucune manœuvre).');
  }
  for (const z of zones) if ((z.stats.toursValides || 0) >= SEASON_LENGTH && donnerTrophee(z, 'increvable', state.season, state.turn)) z.rapport.push('Trophée débloqué : « Increvable » (ordres validés les 14 tours de la saison).');
  for (const [rang, c] of classes.slice(0, 3).entries()) {
    const z = state.zones[c.uid];
    z.plaques = [...(z.plaques || []), { season: state.season, rang: rang + 1 }];
    if (z.failliteSaison && !z.badges.includes('Phénix')) { z.badges.push('Phénix'); titres.push({ uid: c.uid, titre: 'Phénix' }); }
  }
  const resume = { season: state.season, classement: classes.slice(0, 10), titres };
  state.palmares.push(resume);

  // Remise à zéro des zones, on garde l'identité, les PS, badges et titres.
  const oldSeason = state.season;
  state.season += 1;
  state.turn = 1;
  state.affaires = [];
  state.evenement = null;
  state.nonDroit = creerNonDroit(state.seed, state.season);
  state.fipas = []; state.traques = []; state.fipaPaires = {}; state.duels = []; state.postes = []; state.conseil = null; state.theme = null; state.motionsChef = [];
  for (const [uid, z] of Object.entries(state.zones)) {
    // Héritage : formations et bâtiments baissent d'un niveau, les annexes restent.
    const baisse = (n) => Math.max(1, (n || 1) - HERITAGE_PERTE);
    const niveaux = Object.fromEntries(SERVICES.map((s) => [s, baisse(z.niveaux && z.niveaux[s])]));
    const nz = newZone({ uid, code: z.code, nom: z.nom, couleur: z.couleur }, 1, { ps: z.ps, badges: z.badges, titres: z.titres, faillites: z.faillites, niveaux, arrivee: z.arrivee || 0 });
    const b = z.batiments || {};
    nz.batiments = { bureaux: baisse(b.bureaux), garage: baisse(b.garage) };
    nz.infra = { ...(z.infra || {}) };
    nz.equipe = z.equipe || creerEquipe(uid);
    nz.trophees = z.trophees || [];
    if (z.plaques) nz.plaques = z.plaques;
    if (z.decor) nz.decor = z.decor;
    if (z.skins) nz.skins = z.skins;
    if (z.skinsChoix) nz.skinsChoix = z.skinsChoix;
    nz.rapport = [`Nouvelle saison : tu conserves tes formations et tes bâtiments, baissés d’un niveau (hôtel de police ${nz.batiments.bureaux}, garage ${nz.batiments.garage}), et tes annexes. Budget, effectifs et véhicules repartent des valeurs de départ.`];
    nz.heritage = { season: oldSeason, niveaux, batiments: { ...nz.batiments }, annexes: Object.keys(nz.infra).filter((k) => nz.infra[k]).length };
    state.zones[uid] = nz;
  }
  nouvelleAffaire(state);
  return { ...resume, saisonSuivante: oldSeason + 1 };
}

export { START };
