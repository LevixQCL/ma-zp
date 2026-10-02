import { lireDemarche, ENQ } from './enquete.js';
import { creerEquipe } from './equipe.js';
import {
  SERVICES, START, DEFAULT_ALLOC, AGENTS_EN_FORMATION, RYTHMES, IPZ_POIDS, COUTS, INFRAS, NIVEAU_MAX, DEPENSES, RENFORT, BATIMENTS, BATIMENT_MAX, ENTRETIEN_ANNEXE, PEREQUATION, ECONOMIE, TRAVAUX_TOURS, SUBSIDE, REPUTATION, ENCHERE, LOTS, ROULAGE, ND, TERRAIN, secteurOuvert, malusEtat, scoreBudget, coutEquipement, multNiveau, multEquip, coutFormation } from './constants.js';
import { coutCarrosserie } from './sinistres.js';
import { cabossesChoisis } from './parc.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round1 = (v) => Math.round(v * 10) / 10;

export function newZone({ uid, code, nom, couleur }, turn, base = {}) {
  const niveaux = {}, equip = {};
  for (const s of SERVICES) { niveaux[s] = (base.niveaux && base.niveaux[s]) || 1; equip[s] = (base.equip && base.equip[s]) || 1; }
  return {
    uid, code: String(code || '0000'), nom: nom || 'Nouvelle zone', couleur: couleur || '#5AB0F0',
    joinedTurn: turn, arrivee: base.arrivee ?? 0, // ordre d'arrivée : fixe la place de la zone sur la carte
    agents: base.agents ?? START.agents,
    blesses: [], formations: [], academie: [], absents: 0,
    budget: base.budget ?? START.budget,
    vehicules: START.vehicules, vehiculesHS: [], usure: 0, cabosses: [], indemnites: [],
    moral: base.moral ?? START.moral,
    satisfaction: base.satisfaction ?? START.satisfaction,
    reputation: base.reputation ?? START.reputation,
    niveaux, equip, infra: {}, batiments: { bureaux: 1, garage: 1 }, travaux: null,
    criminalite: START.criminalite, paperasse: START.paperasse, paperassePic: START.paperasse,
    dossiers: [], dossierSeq: 0,
    operation: null, pressions: [],
    renforts: [], peril: null, tutelle: null, tutelleSaison: false, lots: [], derniereEnchere: -99, manoeuvres: [], faillites: base.faillites ?? 0, protegeJusqua: 0, motionSaison: false, failliteSaison: false,
    dernierOrdre: null, toursSansOrdres: 0, toursJoues: 0,
    ipz: 0, ipzSomme: 0, ipzHist: [],
    ps: base.ps ?? 0, badges: base.badges ?? [], titres: base.titres ?? [],
    budgetNegSuite: 0, inspectionCooldown: 0, renforceSuite: 0,
    stats: { incidents: 0, traites: 0, affairesGagnees: 0, pointsAffaires: 0, dossiersResolus: 0, contributions: 0, evenementsManques: 0, quetesOk: 0, noirs: 0, limier: 0, decouvertes: 0, arrestations: 0, indicesPartages: 0, fipaFaites: 0, fipaHonorees: 0 },
    rapport: [],
  };
}

function isPlainObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

/** Complète un objet avec les valeurs par défaut manquantes, sans rien écraser. */
export function fillDefaults(target, tpl) {
  for (const [k, v] of Object.entries(tpl)) {
    if (target[k] === undefined) target[k] = clone(v);
    else if (isPlainObject(v) && isPlainObject(target[k])) fillDefaults(target[k], v);
  }
  return target;
}

/** Met une zone enregistrée par une ancienne version au format actuel. */
export function migrateZone(z) {
  const neuf = !z.batiments;
  fillDefaults(z, newZone({ uid: z.uid, code: z.code, nom: z.nom, couleur: z.couleur }, z.joinedTurn ?? 1));
  // Zones d'avant la logistique : des bâtiments à la taille de leurs effectifs.
  if (neuf) ajusterBatiments(z);
  if (!z.equipe) z.equipe = creerEquipe(z.uid);
  if (!z.trophees) z.trophees = [];
  return z;
}

/** Monte les bâtiments au niveau minimum qui accueille les agents et véhicules actuels. */
export function ajusterBatiments(z) {
  const besoinAgents = z.agents + (z.academie || []).reduce((s, a) => s + a.n, 0);
  while (z.batiments.bureaux < BATIMENT_MAX && BATIMENTS.bureaux.capacite(z.batiments.bureaux) < besoinAgents) z.batiments.bureaux++;
  while (z.batiments.garage < BATIMENT_MAX && BATIMENTS.garage.capacite(z.batiments.garage) < z.vehicules) z.batiments.garage++;
  return z;
}

export const capaciteAgents = (z) => BATIMENTS.bureaux.capacite(z.batiments.bureaux);
/** Places d'agents une fois les travaux en cours terminés : un agrandissement de l'hôtel de police
 *  finit avant l'arrivée des recrues (académie), on peut donc recruter pour les futures places. */
export const capaciteAgentsPrevue = (z) => BATIMENTS.bureaux.capacite(z.batiments.bureaux + (z.travaux && z.travaux.batiment === 'bureaux' ? 1 : 0));
export const capaciteVehicules = (z) => BATIMENTS.garage.capacite(z.batiments.garage);
export const effectifPrevu = (z) => z.agents + (z.academie || []).reduce((s, a) => s + a.n, 0);
export const niveauEquipement = (z) => z.batiments.bureaux + z.batiments.garage + Object.values(z.infra || {}).filter(Boolean).length;

/** Subside communal : une part du salaire de chaque agent au-delà de l'effectif de départ. */
export const subsideAgents = (z) => SUBSIDE.parAgent * Math.max(0, z.agents - SUBSIDE.seuil);
/** Bonus (ou malus) communal selon la réputation : 0 à 50, jusqu'à ±2,5 k€ par tour aux extrêmes. */
export const confianceCommune = (z) => { const e = clamp(z.reputation, 0, 100) - 50; return round1(e * (e >= 0 ? SUBSIDE.confiance : SUBSIDE.confianceMalus)); };
/** Prix d'une recrue selon la réputation de la zone. */
export function coutRecrue(z) {
  if (z.reputation >= REPUTATION.recrueHaute) return REPUTATION.coutRecrueHaute;
  if (z.reputation < REPUTATION.recrueBasse) return REPUTATION.coutRecrueBasse;
  return COUTS.recrue;
}
/** Vrai si la zone est sous tutelle pendant le tour `turn`. */
export const sousTutelle = (z, turn) => !!(z && z.tutelle && turn <= z.tutelle.fin);
/** Zone en difficulté (péril ou tutelle) : protégée des manœuvres, aide mieux récompensée. */
export const enDifficulte = (z) => !!(z && (z.peril || z.tutelle));

/** Péréquation : zone nettement moins équipée que la moyenne des zones actives. */
export function perequation(z, state) {
  const zs = Object.values((state && state.zones) || {}).filter((x) => x.toursSansOrdres < 3);
  if (zs.length < 2) return 0;
  const moy = zs.reduce((s, x) => s + niveauEquipement(x), 0) / zs.length;
  return niveauEquipement(z) <= moy - PEREQUATION.ecart ? PEREQUATION.montant : 0;
}

/**
 * Recettes et frais fixes d'une journée (hors dépenses choisies et événements).
 * La même fonction sert à la résolution et à la prévision affichée au joueur.
 */
export function fraisFixes(z, state, { amendes = 0, rythme = 'normal' } = {}) {
  const annexes = Object.values(z.infra || {}).filter(Boolean).length;
  const b = z.batiments;
  const lignes = [
    { k: 'dotation', l: 'Dotation fédérale', v: ECONOMIE.dotation },
    { k: 'subside', l: `Subside communal (${Math.max(0, z.agents - SUBSIDE.seuil)} agents au-delà de ${SUBSIDE.seuil})`, v: subsideAgents(z) },
    { k: 'confiance', l: 'Confiance de la commune (réputation)', v: confianceCommune(z) },
    { k: 'perequation', l: 'Péréquation (zone moins équipée)', v: perequation(z, state) },
    { k: 'amendes', l: 'Amendes du Roulage', v: amendes },
    { k: 'radars', l: 'Radars automatiques (caméras)', v: z.infra && z.infra.anpr ? INFRAS.anpr.fixe : 0 },
    { k: 'salaires', l: `Salaires (${z.agents} agents)`, v: -z.agents * ECONOMIE.salaire },
    { k: 'vehicules', l: `Entretien des véhicules (${z.vehicules})`, v: -z.vehicules * ECONOMIE.entretienVehicule },
    { k: 'batiments', l: `Entretien des bâtiments (niveaux ${b.bureaux} et ${b.garage})`, v: -(BATIMENTS.bureaux.entretien(b.bureaux) + BATIMENTS.garage.entretien(b.garage)) },
    { k: 'annexes', l: `Entretien des annexes (${annexes})`, v: -annexes * ENTRETIEN_ANNEXE },
    { k: 'rythme', l: 'Heures supplémentaires (rythme renforcé)', v: -(RYTHMES[rythme] ? RYTHMES[rythme].cout : 0) },
  ].filter((x) => Math.abs(x.v) >= 0.05);
  for (const x of lignes) x.v = round1(x.v);
  return { lignes, total: round1(lignes.reduce((s, x) => s + x.v, 0)) };
}


export function blessesActifs(zone, turn) {
  return zone.blesses.filter((b) => b.retour > turn).reduce((s, b) => s + b.n, 0);
}

export function enFormation(zone, turn) {
  return zone.formations.filter((f) => f.fin > turn).reduce((s, f) => s + (typeof f.agents === 'number' ? f.agents : AGENTS_EN_FORMATION), 0);
}

/** Agents réellement disponibles pour le tour `turn`. */
export function agentsDisponibles(zone, turn) {
  const renforts = (zone.renforts || []).filter((r) => r.debut <= turn && r.retour > turn).reduce((s, r) => s + r.n, 0);
  return Math.max(0, zone.agents + renforts - blessesActifs(zone, turn) - enFormation(zone, turn) - (zone.absents || 0));
}

/**
 * Agents disponibles laissés sans affectation dans les ordres : ce sont eux qui partent
 * en premier en audition, en traque ou en FIPA (avant de puiser dans les services).
 */
export function agentsLibres(zone, o, turn) {
  if (!o) return 0;
  const services = Object.values(o.alloc || {}).reduce((s, n) => s + (n || 0), 0);
  const eng = Object.values(o.engagements || {}).reduce((s, e) => s + ((e && e.agents) || 0), 0);
  const nd = Object.values(o.secteurs || {}).reduce((s, n) => s + (n || 0), 0);
  return Math.max(0, agentsDisponibles(zone, turn) - services - eng - nd - (o.evenement || 0) - ((o.renfort && o.renfort.agents) || 0));
}

export function vehiculesDisponibles(zone, turn) {
  return Math.max(0, zone.vehicules - zone.vehiculesHS.filter((v) => v.retour > turn).length);
}

export function moralMult(moral) { return 0.6 + 0.6 * clamp(moral, 0, 100) / 100; }

/** Capacité d'un service pour un nombre d'agents donné. */
export function capacite(zone, service, n, { rythme = 'normal', bonus = 1, turn = 0, adminMult = 1 } = {}) {
  if (n <= 0) return 0;
  let eff = n;
  if (service === 'intervention') {
    const v = vehiculesDisponibles(zone, turn);
    const lim = v * 2.5;
    if (eff > lim) eff = lim + (eff - lim) * 0.5;
    eff *= malusEtat(100 - zone.usure);
  }
  if (service === 'roulage' && eff > ROULAGE.seuil) eff = ROULAGE.seuil + (eff - ROULAGE.seuil) * ROULAGE.auDela;
  let c = eff * multNiveau(zone.niveaux[service]) * multEquip(zone.equip[service]) * moralMult(zone.moral) * RYTHMES[rythme].mult * bonus;
  if (service === 'proximite' && zone.infra.antenne) c *= 1.3;
  if (service === 'roulage' && zone.infra.anpr) c *= 1.2;
  if (service === 'recherche' && zone.infra.audition) c *= 1.2;
  if (service === 'intervention' && zone.infra.tir) c *= INFRAS.tir.bonus;
  if (service === 'admin') c *= (zone.infra.logiciel ? 1.5 : 1) * adminMult;
  c *= bonusLots(zone, service);
  return c;
}

/** Multiplicateur apporté par les lots gagnés aux enchères pour un service. */
export function bonusLots(zone, service) {
  let m = 1;
  for (const l of zone.lots || []) { const b = LOTS[l.id] && LOTS[l.id].bonus; if (b && b[service]) m *= b[service]; }
  return m;
}

/**
 * Récompense d'une affaire disputée selon la force engagée (multiplicateur des points) :
 * sous la force minimale, échec ; entre minimale et conseillée, de 60 % à 100 % ;
 * au-delà, bonus jusqu'à +30 % pour un dispositif une fois et demie plus fort que conseillé.
 */
export function multAffaire(aff, force) {
  if (force < aff.forceMin) return 0;
  const c = aff.forceConseillee;
  if (force < c) return 0.6 + 0.4 * (force - aff.forceMin) / Math.max(0.1, c - aff.forceMin);
  return 1 + 0.3 * Math.min(1, (force - c) / (c * 0.5));
}

export function forceEngagement(zone, n) {
  return n * (0.8 + 0.2 * Math.max(zone.niveaux.recherche, zone.niveaux.intervention)) * moralMult(zone.moral);
}

/** Nettoie et borne des ordres reçus du client (on ne fait jamais confiance aux données). */
export function sanitizeOrders(zone, raw, state) {
  const turn = state.turn;
  const dispo = agentsDisponibles(zone, turn);
  const o = raw && typeof raw === 'object' ? raw : {};
  const alloc = {};
  // Nombres finis seulement (Infinity ou NaN envoyés par un appareil défaillant valent 0).
  const fini = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  // Identifiants : seulement des clés propres (jamais « constructor », « __proto__ »…).
  const zoneExiste = (u) => typeof u === 'string' && !!state.zones && Object.hasOwn(state.zones, u);
  for (const s of SERVICES) alloc[s] = Math.min(999, Math.max(0, Math.floor(fini(o.alloc && o.alloc[s]))));
  const tutelle = sousTutelle(zone, turn);
  const rythme = typeof o.rythme === 'string' && Object.hasOwn(RYTHMES, o.rythme) && !(tutelle && o.rythme === 'renforce') ? o.rythme : 'normal';

  const affIds = new Set((state.affaires || []).map((a) => a.id));
  const engagements = {};
  if (o.engagements && typeof o.engagements === 'object') {
    for (const [id, e] of Object.entries(o.engagements)) {
      if (!affIds.has(id) || !e) continue;
      const n = Math.min(999, Math.max(0, Math.floor(fini(e.agents))));
      const acceptes = Array.isArray(e.acceptes) ? [...new Set(e.acceptes.filter((u) => typeof u === 'string' && u !== zone.uid))].slice(0, 8) : [];
      if (n > 0) engagements[id] = { agents: n, acceptes };
    }
  }
  const ev = state.evenement && state.evenement.tour === turn ? Math.min(999, Math.max(0, Math.floor(fini(o.evenement)))) : 0;

  // L'événement et les engagements passent d'abord ; les services se partagent le reste.
  const evenement0 = Math.min(ev, dispo);
  // Renfort envoyé à une zone qui mène une opération d'envergure aujourd'hui.
  let renfort = null;
  if (o.renfort && typeof o.renfort === 'object' && zoneExiste(o.renfort.cible) && o.renfort.cible !== zone.uid) {
    const cz = state.zones && state.zones[o.renfort.cible];
    const n = Math.min(clamp(Math.floor(fini(o.renfort.agents)), 0, RENFORT.maxParZone), dispo - evenement0);
    if (cz && operationActive(cz, turn) && n > 0) renfort = { cible: o.renfort.cible, agents: n };
  }
  // Zone de non-droit : { secteur: agents }, plafonnés par secteur et au total.
  const secteurs = {};
  if (o.secteurs && typeof o.secteurs === 'object' && state.nonDroit) {
    for (const [k, v] of Object.entries(o.secteurs)) {
      if (!secteurOuvert(state.nonDroit, k)) continue;
      const n = clamp(Math.floor(fini(v)), 0, ND.maxParSecteur);
      if (n > 0) secteurs[k] = n;
    }
  }
  const sumSect = () => Object.values(secteurs).reduce((s, n) => s + n, 0);
  const maxSect = Math.min(ND.maxTotal, Math.max(0, dispo - evenement0 - (renfort ? renfort.agents : 0)));
  while (sumSect() > maxSect) { const k = Object.keys(secteurs).sort((a, b) => secteurs[b] - secteurs[a])[0]; secteurs[k]--; if (!secteurs[k]) delete secteurs[k]; }
  const evenement = evenement0 + (renfort ? renfort.agents : 0) + sumSect(); // agents réservés hors services
  const sumEng = () => Object.values(engagements).reduce((s, e) => s + e.agents, 0);
  if (sumEng() + evenement > dispo) {
    const place = dispo - evenement;
    const f = sumEng() > 0 ? place / sumEng() : 0;
    for (const [id, e] of Object.entries(engagements)) { e.agents = Math.floor(e.agents * f); if (e.agents <= 0) delete engagements[id]; }
  }
  const reste = Math.max(0, dispo - sumEng() - evenement);
  const total = SERVICES.reduce((s, k) => s + alloc[k], 0);
  if (total > reste && total > 0) {
    const f = reste / total;
    let used = 0;
    for (const s of SERVICES) { alloc[s] = Math.floor(alloc[s] * f); used += alloc[s]; }
    // redistribue les arrondis dans l'ordre des services
    for (const s of SERVICES) { if (used >= reste) break; if ((o.alloc?.[s] || 0) > alloc[s]) { alloc[s]++; used++; } }
  }

  let decision = null;
  const d = o.decision;
  if (d && typeof d === 'object') {
    if (d.type === 'recruter') decision = { type: 'recruter', n: clamp(Math.floor(fini(d.n) || 1), 1, 3) };
    else if (d.type === 'former' && SERVICES.includes(d.service)) decision = { type: 'former', service: d.service };
    else if (d.type === 'equiper' && (d.cible === 'vehicule' || SERVICES.includes(d.cible))) decision = { type: 'equiper', cible: d.cible };
    else if (d.type === 'construire' && typeof d.infra === 'string' && Object.hasOwn(INFRAS, d.infra)) decision = { type: 'construire', infra: d.infra };
    else if (d.type === 'agrandir' && typeof d.batiment === 'string' && Object.hasOwn(BATIMENTS, d.batiment)) decision = { type: 'agrandir', batiment: d.batiment };
    if (tutelle && decision && decision.type !== 'recruter') decision = null;
  }
  const operation = ['complet', 'reduit', 'aucun'].includes(o.operation) ? o.operation : 'reduit';
  const dp = o.depenses && typeof o.depenses === 'object' ? o.depenses : {};
  const depenses = {
    reserve: tutelle ? 0 : clamp(Math.floor(fini(dp.reserve)), 0, DEPENSES.reserve.max),
    reserveService: SERVICES.includes(dp.reserveService) ? dp.reserveService : 'intervention',
    prime: !!dp.prime, prevention: !!dp.prevention, soustraitance: !!dp.soustraitance, revision: !!dp.revision, carrosserie: carrosserieOrdre(zone, dp.carrosserie),
  };
  // Enquête et FIPA : validés plus finement pendant la résolution.
  const int = (v, a, b) => clamp(Math.floor(fini(v)), a, b);
  const str = (v) => (typeof v === 'string' ? v.slice(0, 64) : '');
  const cible = (v) => (zoneExiste(v) ? v : '');
  const demarches = Array.isArray(o.demarches) ? [...new Set(o.demarches.filter((x) => typeof x === 'string' && lireDemarche(x)))].slice(0, 2) : [];
  const accusation = Number.isInteger(o.accusation) && o.accusation >= 0 && o.accusation < ENQ.nbSuspects ? o.accusation : null;
  const piste = Number.isInteger(o.piste) && o.piste >= 0 && o.piste < ENQ.nbSuspects ? o.piste : null;
  const traque = o.traque && typeof o.traque === 'object' ? { n: int(o.traque.n, 0, 1e6), planque: int(o.traque.planque, 0, 5), agents: int(o.traque.agents, 0, 30) } : null;
  const partages = Array.isArray(o.partages) ? o.partages.slice(0, 3).filter((p) => p && typeof p === 'object').map((p) => ({ f: str(p.f), a: str(p.a) })) : [];
  const fipa = o.fipa && typeof o.fipa === 'object' ? { id: str(o.fipa.id), invite: cible(o.fipa.invite), moi: int(o.fipa.moi, 0, 8), lui: int(o.fipa.lui, 0, 8) } : null;
  const fipaReponse = o.fipaReponse && typeof o.fipaReponse === 'object' ? { id: str(o.fipaReponse.id), accepte: !!o.fipaReponse.accepte } : null;
  const fipaChoix = o.fipaChoix && typeof o.fipaChoix === 'object' ? { id: str(o.fipaChoix.id), choix: o.fipaChoix.choix === 'revendiquer' ? 'revendiquer' : 'partager' } : null;
  const MAN = ['debauchage', 'dessaisissement', 'signalement', 'poste'];
  const manoeuvre = o.manoeuvre && MAN.includes(o.manoeuvre.type) ? { type: o.manoeuvre.type, cible: cible(o.manoeuvre.cible) } : null;
  const aide = o.aide && typeof o.aide === 'object' ? { cible: cible(o.aide.cible), budget: clamp(Math.round(fini(o.aide.budget) * 10) / 10, 0, 10), agents: int(o.aide.agents, 0, 3) } : null;
  const duel = o.duel && ['satisfaction', 'affaires', 'incidents'].includes(o.duel.ind) ? { cible: cible(o.duel.cible), ind: o.duel.ind } : null;
  const duelReponse = o.duelReponse && typeof o.duelReponse === 'object' ? { id: str(o.duelReponse.id), accepte: !!o.duelReponse.accepte } : null;
  const votes = {};
  if (o.votes && typeof o.votes === 'object') for (const [k2, v] of Object.entries(o.votes)) if (['dotation', 'theme', 'blame', 'chef'].includes(k2) && Number.isInteger(v)) votes[k2] = clamp(v, 0, 5);
  const motionChef = ['prime', 'amnistie', 'subside'].includes(o.motionChef) ? o.motionChef : null;
  const montant = o.offre && typeof o.offre === 'object' ? int(o.offre.montant, 0, ENCHERE.max) : 0;
  const offre = montant > 0 && !tutelle ? { id: str(o.offre.id), montant } : null;
  // Patrouilles ciblées : { quartier: agents } (validées plus finement pendant la résolution).
  const patrouilles = {};
  if (o.patrouilles && typeof o.patrouilles === 'object') {
    for (const [k2, v] of Object.entries(o.patrouilles).slice(0, 8)) { const n = int(v, 0, 12); if (/^\d{1,4}$/.test(k2) && n > 0) patrouilles[k2] = n; }
  }
  return { piste, patrouilles, alloc, rythme, engagements, evenement: evenement0, renfort, secteurs, decision, operation, depenses, demarches, accusation, traque, partages, fipa, fipaReponse, fipaChoix, manoeuvre: tutelle ? null : manoeuvre, aide, duel: tutelle ? null : duel, duelReponse, votes, motionChef, offre };
}

/** Coût total des dépenses du jour. */
/** Carrosserie demandée dans les ordres : false, ou la liste des véhicules cabossés à réparer (indices). */
export function carrosserieOrdre(zone, v) {
  const idx = cabossesChoisis(zone, v);
  return idx.length ? idx : false;
}

export function coutDepenses(d, z = null) {
  if (!d) return 0;
  return (d.carrosserie && z ? coutCarrosserie(z, d.carrosserie) : 0) + (d.reserve || 0) * DEPENSES.reserve.cout + (d.prime ? DEPENSES.prime.cout : 0) + (d.prevention ? DEPENSES.prevention.cout : 0) + (d.soustraitance ? DEPENSES.soustraitance.cout : 0) + (d.revision ? DEPENSES.revision.cout : 0);
}

export const NIVEAUX_OPERATION = { complet: 1, reduit: 0.5, aucun: 0 };

/** Opération d'envergure en cours pour le tour `turn`, ou null. */
export function operationActive(zone, turn) {
  const op = zone.operation;
  return op && turn >= op.tourDebut && turn < op.tourDebut + op.duree ? op : null;
}

/**
 * Agents prélevés dans chaque service par l'opération d'envergure.
 * Renvoie l'affectation restante pour le travail habituel et le taux de couverture.
 */
export function effetsOperation(zone, alloc, niveau, turn) {
  const op = operationActive(zone, turn);
  const eff = { ...alloc };
  const pris = {};
  if (!op) return { eff, pris, couverture: null, op: null };
  const f = NIVEAUX_OPERATION[niveau] ?? 0.5;
  let besoin = 0, fourni = 0;
  for (const [s, n] of Object.entries(op.besoins)) {
    const voulu = Math.ceil(n * f);
    pris[s] = Math.min(alloc[s] || 0, voulu);
    eff[s] = (alloc[s] || 0) - pris[s];
    besoin += n; fourni += pris[s];
  }
  return { eff, pris, couverture: besoin ? fourni / besoin : 1, op };
}

/** Ordres du pilote automatique : on reprend la dernière répartition, sans décision ni engagement. */
export function autopilotOrders(zone, state) {
  const base = zone.dernierOrdre ? { alloc: zone.dernierOrdre.alloc, rythme: 'normal', operation: 'reduit', patrouilles: zone.dernierOrdre.patrouilles } : { alloc: DEFAULT_ALLOC, rythme: 'normal', operation: 'reduit' };
  // Un oubli d'un jour : les agents restent sur place dans la zone de non-droit. Au-delà, ils rentrent.
  if (zone.dernierOrdre && zone.dernierOrdre.secteurs && (zone.toursSansOrdres || 0) === 0) base.secteurs = zone.dernierOrdre.secteurs;
  return sanitizeOrders(zone, base, state);
}

export function coutDecision(zone, decision) {
  if (!decision) return 0;
  switch (decision.type) {
    case 'recruter': return coutRecrue(zone) * decision.n;
    case 'former': return coutFormation(zone, decision.service);
    case 'equiper': return decision.cible === 'vehicule' ? COUTS.vehicule : coutEquipement(zone.equip[decision.cible]);
    case 'construire': return INFRAS[decision.infra].cout;
    case 'agrandir': return BATIMENTS[decision.batiment] ? BATIMENTS[decision.batiment].coutAgrandir(zone.batiments[decision.batiment]) : 0;
    default: return 0;
  }
}

/** Indique pourquoi une décision est impossible (ou null si elle l'est). */
export function decisionImpossible(zone, decision, turn) {
  if (!decision) return null;
  if (sousTutelle(zone, turn) && decision.type !== 'recruter') return 'Zone sous tutelle : seul le recrutement est autorisé';
  const cout = coutDecision(zone, decision);
  if (zone.budget < cout) return 'Budget insuffisant';
  if (decision.type === 'former') {
    if (zone.niveaux[decision.service] + zone.formations.filter((f) => f.service === decision.service && f.fin > turn).length >= NIVEAU_MAX) return 'Niveau maximum atteint';
    if (agentsDisponibles(zone, turn) < 6) return 'Pas assez d’agents disponibles';
  }
  if (decision.type === 'equiper' && decision.cible !== 'vehicule' && zone.equip[decision.cible] >= NIVEAU_MAX) return 'Équipement au maximum';
  if (decision.type === 'construire' && zone.infra[decision.infra]) return 'Déjà construit';
  if (decision.type === 'agrandir') {
    if (zone.travaux) return 'Des travaux sont déjà en cours';
    if (zone.batiments[decision.batiment] >= BATIMENT_MAX) return 'Niveau maximum atteint';
  }
  if (decision.type === 'recruter' && effectifPrevu(zone) + decision.n > capaciteAgentsPrevue(zone)) return `Hôtel de police plein (${capaciteAgentsPrevue(zone)} agents${zone.travaux && zone.travaux.batiment === 'bureaux' ? ', travaux compris' : ''}) : agrandis-le d’abord`;
  if (decision.type === 'equiper' && decision.cible === 'vehicule' && zone.vehicules + 1 > capaciteVehicules(zone)) return `Garage plein (${capaciteVehicules(zone)} véhicules) : agrandis-le d’abord`;
  return null;
}

/** Résultats terrain : incidents traités (sur 60) + bilan des points de résultats, plafonné à 100. */
export function terrainBrut(ratio, bilan) { return TERRAIN.incidents * ratio + TERRAIN.parPoint * bilan; }

export function ipzComposantes(zone, { ratio = 1, bilan = 0 } = {}) {
  return {
    satisfaction: clamp(zone.satisfaction, 0, 100),
    affaires: clamp(terrainBrut(ratio, bilan), 0, 100),
    moral: clamp(zone.moral, 0, 100),
    budget: scoreBudget(zone.budget),
    reputation: clamp(zone.reputation, 0, 100),
  };
}

export function ipzFrom(comp) {
  let v = 0;
  for (const [k, w] of Object.entries(IPZ_POIDS)) v += comp[k] * w;
  return round1(v);
}

// ───── Journal des jauges : d'où vient chaque variation du tour ─────
export const JOURNAL_CLES = ['moral', 'satisfaction', 'reputation', 'points'];
const valeurJournal = (z, k) => (k === 'points' ? z._points || 0 : z[k]);
/** Démarre le journal d'un tour (à appeler avant tout changement). */
export function ouvrirJournal(z) {
  z._journal = {};
  z._pt = Object.fromEntries(JOURNAL_CLES.map((k) => [k, valeurJournal(z, k)]));
}
/** Note ce qui a changé depuis le jalon précédent, sous l'étiquette `label`. */
export function jalon(z, label) {
  if (!z || !z._pt) return;
  for (const k of JOURNAL_CLES) {
    const v = valeurJournal(z, k), d = v - z._pt[k];
    if (Math.abs(d) >= 0.05) {
      const l = (z._journal[k] ||= []);
      const der = l[l.length - 1];
      if (der && der.l === label) der.v += d; else l.push({ l: label, v: d });
    }
    z._pt[k] = v;
  }
}
/** Note une cause sans toucher à la jauge (déjà modifiée) : le jalon suivant n'en recompte pas la valeur. */
export function noter(z, k, label, v) {
  if (!z || !z._pt || Math.abs(v) < 0.05) return;
  const l = (z._journal[k] ||= []);
  const der = l[l.length - 1];
  if (der && der.l === label) der.v += v; else l.push({ l: label, v });
  z._pt[k] += v;
}
/** Ferme le journal : valeurs arrondies, lignes nulles retirées. */
export function fermerJournal(z) {
  const out = {};
  for (const k of JOURNAL_CLES) {
    const l = (z._journal && z._journal[k] || []).map((x) => ({ l: x.l, v: round1(x.v) })).filter((x) => Math.abs(x.v) >= 0.1);
    if (l.length) out[k] = l;
  }
  delete z._journal; delete z._pt;
  return out;
}

export const IPZ_LABELS = { satisfaction: 'Satisfaction', affaires: 'Résultats terrain', moral: 'Moral', budget: 'Budget', reputation: 'Réputation' };

/** Points apportés à l'IPZ par chaque composante (valeur × poids). */
export function pointsIpz(comp) {
  return Object.fromEntries(Object.entries(IPZ_POIDS).map(([k, w]) => [k, round1((comp[k] || 0) * w)]));
}

/** Ligne du rapport quotidien : l'IPZ et ce qui l'a fait bouger depuis la veille. */
export function ligneIpz(comp, hier, ipz, ipzHier, det) {
  const f = (v) => String(round1(v)).replace('.', ',');
  const sgn = (v) => `${v >= 0 ? '+' : '−'}${f(Math.abs(v))}`;
  const pts = pointsIpz(comp), ptsH = hier ? pointsIpz(hier) : null;
  const d = ipzHier === null || ipzHier === undefined ? null : round1(ipz - ipzHier);
  const parts = Object.keys(IPZ_POIDS).map((k) => {
    const dv = ptsH ? round1(pts[k] - ptsH[k]) : null;
    return { k, txt: `${IPZ_LABELS[k]} ${f(pts[k])}${dv !== null && Math.abs(dv) >= 0.1 ? ` (${sgn(dv)})` : ''}`, dv: dv || 0 };
  });
  let tete = `IPZ du jour : ${f(ipz)}${d !== null ? ` (${d === 0 ? 'stable' : `${sgn(d)} depuis hier`})` : ''}`;
  if (ptsH) {
    const plus = parts.filter((p) => p.dv >= 0.5).sort((a, b) => b.dv - a.dv)[0];
    const moins = parts.filter((p) => p.dv <= -0.5).sort((a, b) => a.dv - b.dv)[0];
    const pourquoi = [plus ? `surtout grâce à : ${IPZ_LABELS[plus.k].toLowerCase()}` : '', moins ? `plombé par : ${IPZ_LABELS[moins.k].toLowerCase()}` : ''].filter(Boolean).join(' ; ');
    if (pourquoi) tete += `, ${pourquoi}`;
  }
  const res = det ? ` Résultats terrain : ${det.traites}/${det.incidents} incidents traités, ${f(det.points)} pts de résultats aujourd’hui${det.bilan !== undefined ? ` (bilan ${f(det.bilan)} avec la moitié d’hier)` : ''}.` : '';
  return `${tete}. Détail en points d’IPZ : ${parts.map((p) => p.txt).join(' · ')}.${res}`;
}

export function moyenneIpz(zone) {
  return zone.toursJoues ? round1(zone.ipzSomme / zone.toursJoues) : 0;
}

export { clone };
