import { lireDemarche, ENQ } from './enquete.js';
import {
  SERVICES, START, DEFAULT_ALLOC, AGENTS_EN_FORMATION, RYTHMES, IPZ_POIDS, COUTS, INFRAS, NIVEAU_MAX, DEPENSES,
} from './constants.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round1 = (v) => Math.round(v * 10) / 10;

export function newZone({ uid, code, nom, couleur }, turn, base = {}) {
  const niveaux = {}, equip = {};
  for (const s of SERVICES) { niveaux[s] = (base.niveaux && base.niveaux[s]) || 1; equip[s] = (base.equip && base.equip[s]) || 1; }
  return {
    uid, code: String(code || '0000'), nom: nom || 'Nouvelle zone', couleur: couleur || '#5AB0F0',
    joinedTurn: turn,
    agents: base.agents ?? START.agents,
    blesses: [], formations: [], academie: [], absents: 0,
    budget: base.budget ?? START.budget,
    vehicules: START.vehicules, vehiculesHS: [], usure: 0,
    moral: base.moral ?? START.moral,
    satisfaction: base.satisfaction ?? START.satisfaction,
    reputation: base.reputation ?? START.reputation,
    niveaux, equip, infra: {},
    criminalite: START.criminalite, paperasse: START.paperasse, paperassePic: START.paperasse,
    dossiers: [], dossierSeq: 0,
    operation: null, pressions: [],
    renforts: [], peril: null, manoeuvres: [], faillites: base.faillites ?? 0, protegeJusqua: 0, motionSaison: false, failliteSaison: false,
    dernierOrdre: null, toursSansOrdres: 0, toursJoues: 0,
    ipz: 0, ipzSomme: 0, ipzHist: [],
    ps: base.ps ?? 0, badges: base.badges ?? [], titres: base.titres ?? [],
    budgetNegSuite: 0, inspectionCooldown: 0, renforceSuite: 0,
    stats: { incidents: 0, traites: 0, affairesGagnees: 0, pointsAffaires: 0, dossiersResolus: 0, contributions: 0, evenementsManques: 0, quetesOk: 0, limier: 0, decouvertes: 0, arrestations: 0, indicesPartages: 0, fipaFaites: 0, fipaHonorees: 0 },
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
  return fillDefaults(z, newZone({ uid: z.uid, code: z.code, nom: z.nom, couleur: z.couleur }, z.joinedTurn ?? 1));
}

export function blessesActifs(zone, turn) {
  return zone.blesses.filter((b) => b.retour > turn).reduce((s, b) => s + b.n, 0);
}

export function enFormation(zone, turn) {
  return zone.formations.filter((f) => f.fin > turn).length * AGENTS_EN_FORMATION;
}

/** Agents réellement disponibles pour le tour `turn`. */
export function agentsDisponibles(zone, turn) {
  const renforts = (zone.renforts || []).filter((r) => r.debut <= turn && r.retour > turn).reduce((s, r) => s + r.n, 0);
  return Math.max(0, zone.agents + renforts - blessesActifs(zone, turn) - enFormation(zone, turn) - (zone.absents || 0));
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
    const etat = 100 - zone.usure;
    if (etat < 60) eff *= 0.9;
  }
  let c = eff * (0.8 + 0.2 * zone.niveaux[service]) * (0.9 + 0.1 * zone.equip[service]) * moralMult(zone.moral) * RYTHMES[rythme].mult * bonus;
  if (service === 'proximite' && zone.infra.antenne) c *= 1.3;
  if (service === 'roulage' && zone.infra.anpr) c *= 1.3;
  if (service === 'recherche' && zone.infra.audition) c *= 1.2;
  if (service === 'admin') c *= (zone.infra.logiciel ? 1.5 : 1) * adminMult;
  return c;
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
  for (const s of SERVICES) alloc[s] = Math.max(0, Math.floor(Number(o.alloc && o.alloc[s]) || 0));
  const rythme = RYTHMES[o.rythme] ? o.rythme : 'normal';

  const affIds = new Set((state.affaires || []).map((a) => a.id));
  const engagements = {};
  if (o.engagements && typeof o.engagements === 'object') {
    for (const [id, e] of Object.entries(o.engagements)) {
      if (!affIds.has(id) || !e) continue;
      const n = Math.max(0, Math.floor(Number(e.agents) || 0));
      if (n > 0) engagements[id] = { agents: n, partenaire: typeof e.partenaire === 'string' && e.partenaire !== zone.uid ? e.partenaire : null };
    }
  }
  const ev = state.evenement && state.evenement.tour === turn ? Math.max(0, Math.floor(Number(o.evenement) || 0)) : 0;

  // L'événement et les engagements passent d'abord ; les services se partagent le reste.
  const evenement = Math.min(ev, dispo);
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
    if (d.type === 'recruter') decision = { type: 'recruter', n: clamp(Math.floor(Number(d.n) || 1), 1, 3) };
    else if (d.type === 'former' && SERVICES.includes(d.service)) decision = { type: 'former', service: d.service };
    else if (d.type === 'equiper' && (d.cible === 'vehicule' || SERVICES.includes(d.cible))) decision = { type: 'equiper', cible: d.cible };
    else if (d.type === 'construire' && INFRAS[d.infra]) decision = { type: 'construire', infra: d.infra };
  }
  const operation = ['complet', 'reduit', 'aucun'].includes(o.operation) ? o.operation : 'reduit';
  const dp = o.depenses && typeof o.depenses === 'object' ? o.depenses : {};
  const depenses = {
    reserve: clamp(Math.floor(Number(dp.reserve) || 0), 0, DEPENSES.reserve.max),
    reserveService: SERVICES.includes(dp.reserveService) ? dp.reserveService : 'intervention',
    prime: !!dp.prime, prevention: !!dp.prevention, soustraitance: !!dp.soustraitance,
  };
  // Enquête et FIPA : validés plus finement pendant la résolution.
  const int = (v, a, b) => clamp(Math.floor(Number(v) || 0), a, b);
  const str = (v) => (typeof v === 'string' ? v.slice(0, 64) : '');
  const demarches = Array.isArray(o.demarches) ? [...new Set(o.demarches.filter((x) => typeof x === 'string' && lireDemarche(x)))].slice(0, 2) : [];
  const accusation = Number.isInteger(o.accusation) && o.accusation >= 0 && o.accusation < ENQ.nbSuspects ? o.accusation : null;
  const traque = o.traque && typeof o.traque === 'object' ? { n: int(o.traque.n, 0, 1e6), planque: int(o.traque.planque, 0, 5), agents: int(o.traque.agents, 0, 30) } : null;
  const partages = Array.isArray(o.partages) ? o.partages.slice(0, 3).filter((p) => p && typeof p === 'object').map((p) => ({ f: str(p.f), a: str(p.a) })) : [];
  const fipa = o.fipa && typeof o.fipa === 'object' ? { id: str(o.fipa.id), invite: str(o.fipa.invite), moi: int(o.fipa.moi, 0, 8), lui: int(o.fipa.lui, 0, 8) } : null;
  const fipaReponse = o.fipaReponse && typeof o.fipaReponse === 'object' ? { id: str(o.fipaReponse.id), accepte: !!o.fipaReponse.accepte } : null;
  const fipaChoix = o.fipaChoix && typeof o.fipaChoix === 'object' ? { id: str(o.fipaChoix.id), choix: o.fipaChoix.choix === 'revendiquer' ? 'revendiquer' : 'partager' } : null;
  const MAN = ['debauchage', 'dessaisissement', 'signalement', 'poste'];
  const manoeuvre = o.manoeuvre && MAN.includes(o.manoeuvre.type) ? { type: o.manoeuvre.type, cible: str(o.manoeuvre.cible) } : null;
  const aide = o.aide && typeof o.aide === 'object' ? { cible: str(o.aide.cible), budget: clamp(Math.round((Number(o.aide.budget) || 0) * 10) / 10, 0, 10), agents: int(o.aide.agents, 0, 3) } : null;
  const duel = o.duel && ['satisfaction', 'affaires', 'incidents'].includes(o.duel.ind) ? { cible: str(o.duel.cible), ind: o.duel.ind } : null;
  const duelReponse = o.duelReponse && typeof o.duelReponse === 'object' ? { id: str(o.duelReponse.id), accepte: !!o.duelReponse.accepte } : null;
  const votes = {};
  if (o.votes && typeof o.votes === 'object') for (const [k2, v] of Object.entries(o.votes)) if (['dotation', 'theme', 'blame', 'chef'].includes(k2) && Number.isInteger(v)) votes[k2] = clamp(v, 0, 5);
  const motionChef = ['prime', 'amnistie', 'subside'].includes(o.motionChef) ? o.motionChef : null;
  return { alloc, rythme, engagements, evenement, decision, operation, depenses, demarches, accusation, traque, partages, fipa, fipaReponse, fipaChoix, manoeuvre, aide, duel, duelReponse, votes, motionChef };
}

/** Coût total des dépenses du jour. */
export function coutDepenses(d) {
  if (!d) return 0;
  return (d.reserve || 0) * DEPENSES.reserve.cout + (d.prime ? DEPENSES.prime.cout : 0) + (d.prevention ? DEPENSES.prevention.cout : 0) + (d.soustraitance ? DEPENSES.soustraitance.cout : 0);
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
  const base = zone.dernierOrdre ? { alloc: zone.dernierOrdre.alloc, rythme: 'normal', operation: 'reduit' } : { alloc: DEFAULT_ALLOC, rythme: 'normal', operation: 'reduit' };
  return sanitizeOrders(zone, base, state);
}

export function coutDecision(zone, decision) {
  if (!decision) return 0;
  switch (decision.type) {
    case 'recruter': return COUTS.recrue * decision.n;
    case 'former': return COUTS.formation;
    case 'equiper': return decision.cible === 'vehicule' ? COUTS.vehicule : COUTS.equipementBase * zone.equip[decision.cible];
    case 'construire': return INFRAS[decision.infra].cout;
    default: return 0;
  }
}

/** Indique pourquoi une décision est impossible (ou null si elle l'est). */
export function decisionImpossible(zone, decision, turn) {
  if (!decision) return null;
  const cout = coutDecision(zone, decision);
  if (zone.budget < cout) return 'Budget insuffisant';
  if (decision.type === 'former') {
    if (zone.niveaux[decision.service] + zone.formations.filter((f) => f.service === decision.service && f.fin > turn).length >= NIVEAU_MAX) return 'Niveau maximum atteint';
    if (agentsDisponibles(zone, turn) < 6) return 'Pas assez d’agents disponibles';
  }
  if (decision.type === 'equiper' && decision.cible !== 'vehicule' && zone.equip[decision.cible] >= NIVEAU_MAX) return 'Équipement au maximum';
  if (decision.type === 'construire' && zone.infra[decision.infra]) return 'Déjà construit';
  return null;
}

export function ipzComposantes(zone, { ratio = 1, points = 0 } = {}) {
  return {
    satisfaction: clamp(zone.satisfaction, 0, 100),
    affaires: clamp(60 * ratio + 6 * points, 0, 100),
    moral: clamp(zone.moral, 0, 100),
    budget: clamp(50 + zone.budget * 1.5, 0, 100),
    reputation: clamp(zone.reputation, 0, 100),
  };
}

export function ipzFrom(comp) {
  let v = 0;
  for (const [k, w] of Object.entries(IPZ_POIDS)) v += comp[k] * w;
  return round1(v);
}

export function moyenneIpz(zone) {
  return zone.toursJoues ? round1(zone.ipzSomme / zone.toursJoues) : 0;
}

export { clone };
