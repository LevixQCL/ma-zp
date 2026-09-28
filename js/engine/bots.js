// Zones robots : utilisées par le mode démo et par la simulation d'équilibrage.
import { SERVICES, INFRAS, COUTS } from './constants.js';
import { makeRng } from './rng.js';
import { agentsDisponibles, coutDecision, decisionImpossible, operationActive, NIVEAUX_OPERATION } from './zone.js';
import { genererAffaire, dossierDe, dossierAffaire, faitsConnus, candidats, coutDemarche, DEMARCHES, ENQ } from './enquete.js';
import { fipaPour, invitationImpossible, FIPA } from './fipa.js';
import { cibleImpossible, enDuel } from './rivalites.js';

export const BOT_PROFILES = [
  { uid: 'bot-canal', code: '5301', nom: 'Canal', pseudo: 'Sam', couleur: '#3CC6B8', style: 'equilibre' },
  { uid: 'bot-vallee', code: '5412', nom: 'Vallée', pseudo: 'Nora', couleur: '#A78BFA', style: 'agressif' },
  { uid: 'bot-plateau', code: '5288', nom: 'Plateau', pseudo: 'Luc', couleur: '#F59E5B', style: 'distrait' },
  { uid: 'bot-port', code: '5350', nom: 'Port', pseudo: 'Inès', couleur: '#E6C36A', style: 'prudent' },
  { uid: 'bot-gare', code: '5267', nom: 'Gare', pseudo: 'Max', couleur: '#F08BB4', style: 'equilibre' },
];

/** Ordres d'une zone robot. Renvoie null si le robot « oublie » de jouer. */
export function botOrders(zone, state, style = 'equilibre') {
  const T = state.turn;
  const rng = makeRng(`${state.seed}:bot:${zone.uid}:${state.season}:${T}`);
  if (style === 'distrait' && rng.chance(0.35)) return null;
  if (rng.chance(0.05)) return null;

  const dispo = agentsDisponibles(zone, T);
  let reste = dispo;
  const engagements = {};
  let evenement = 0;

  if (state.evenement && state.evenement.tour === T) {
    const part = style === 'agressif' ? rng.int(0, 2) : rng.int(2, 4);
    evenement = Math.min(part, Math.floor(reste / 4));
    reste -= evenement;
  }
  for (const a of state.affaires || []) {
    const envie = style === 'agressif' ? 0.8 : style === 'prudent' ? 0.25 : 0.45;
    if (reste > 12 && rng.chance(envie)) {
      const n = Math.min(reste - 10, a.forceConseillee + rng.int(-1, 2));
      if (n > 0) { engagements[a.id] = { agents: n, partenaire: null }; reste -= n; }
    }
  }
  const poids = { intervention: 0.36, proximite: 0.18, recherche: 0.18, roulage: 0.12, admin: 0.16 };
  if (zone.paperasse > 12) poids.admin += 0.08;
  if (zone.dossiers.length > 3) poids.recherche += 0.06;
  const alloc = {};
  let used = 0;
  for (const s of SERVICES) { alloc[s] = Math.floor(reste * poids[s]); used += alloc[s]; }
  let i = 0;
  while (used < reste) { alloc[SERVICES[i % SERVICES.length]]++; used++; i++; }

  // Opération d'envergure : les robots renforcent les services concernés.
  const op = operationActive(zone, T);
  let operation = 'reduit';
  if (op) {
    operation = style === 'distrait' ? 'aucun' : style === 'prudent' ? 'reduit' : 'complet';
    const f = NIVEAUX_OPERATION[operation];
    for (const [s, n] of Object.entries(op.besoins)) {
      const voulu = Math.ceil(n * f) + 1;
      while (alloc[s] < voulu) {
        const donneur = SERVICES.filter((k) => !op.besoins[k] && alloc[k] > 1).sort((a, b) => alloc[b] - alloc[a])[0];
        if (!donneur) break;
        alloc[donneur]--; alloc[s]++;
      }
    }
  }

  let rythme = 'normal';
  if (zone.moral < 50) rythme = 'allege';
  else if (style === 'agressif' && zone.moral > 65 && rng.chance(0.4)) rythme = 'renforce';

  let decision = null;
  const options = [];
  if (zone.budget > 25) {
    for (const [id, inf] of Object.entries(INFRAS)) if (!zone.infra[id] && zone.budget - inf.cout > 15) options.push({ type: 'construire', infra: id });
    options.push({ type: 'former', service: rng.pick(SERVICES) });
    if (zone.agents < 22) options.push({ type: 'recruter', n: 2 });
  }
  if (zone.budget > COUTS.vehicule + 10 && zone.vehicules < 5) options.push({ type: 'equiper', cible: 'vehicule' });
  if (options.length && rng.chance(style === 'prudent' ? 0.25 : 0.45)) {
    const d = rng.pick(options);
    if (!decisionImpossible(zone, d, T) && zone.budget - coutDecision(zone, d) > 5) decision = d;
  }
  const depenses = {};
  if (zone.budget > 45) { depenses.reserve = style === 'agressif' ? 3 : 2; depenses.reserveService = zone.paperasse > 14 ? 'admin' : 'intervention'; }
  if (zone.criminalite > 62 && zone.budget > 30) depenses.prevention = true;
  if (zone.moral < 50 && zone.budget > 25) depenses.prime = true;
  return { alloc, rythme, engagements, evenement, decision, operation, depenses, ...botEnquete(zone, state, style, rng, alloc), ...botFipa(zone, state, style, rng), ...botRivalites(zone, state, style, rng) };
}

/** Enquête : constatations d'abord, puis vérifications ciblées ; accusation quand un seul suspect reste. */
function botEnquete(zone, state, style, rng, alloc) {
  const out = { demarches: [], accusation: null, traque: null, partages: [] };
  if (!state.enquete) return out;
  const aff = genererAffaire(state.seed, state.enquete.n);
  const d = dossierDe(state, zone);
  const connus = new Set(faitsConnus(d));
  const c = candidats(aff, faitsConnus(d));
  const nb = zone.budget > 35 ? 2 : zone.budget > 15 ? 1 : 0;
  const envie = style === 'distrait' ? 0.4 : style === 'prudent' ? 0.7 : 0.9;
  // Les constatations (surtout l'audition, gratuite), puis les suspects encore possibles.
  const scenes = ['temoin', 'cam', 'labo'].filter((k) => !connus.has(`c:${DEMARCHES[k].scene}`));
  const cibles = [];
  for (const i of c.suspects) {
    for (const [k, dm] of Object.entries(DEMARCHES)) {
      if (!dm.cible || connus.has(`${dm.cible}:${i}`) || !connus.has(`c:${dm.cible}`)) continue;
      cibles.push({ x: `${k}:${i}`, prix: coutDemarche(state, zone.uid, `${k}:${i}`) });
    }
  }
  cibles.sort((x, y) => x.prix - y.prix || (rng.chance(0.5) ? 1 : -1));
  const envies = [...scenes, ...cibles.map((t) => t.x)];
  let budget = zone.budget - 10;
  for (const x of envies) {
    if (out.demarches.length >= nb) break;
    const prix = coutDemarche(state, zone.uid, x);
    if (prix > budget || !rng.chance(envie)) continue;
    out.demarches.push(x); budget -= prix;
  }
  // Accusation : seulement quand un seul suspect reste (l'agressif tente parfois à deux).
  if (!d.exclu && d.accuse === null) {
    if (c.suspects.length === 1 && rng.chance(style === 'distrait' ? 0.5 : 0.85)) out.accusation = c.suspects[0];
    else if (style === 'agressif' && c.suspects.length === 2 && rng.chance(0.25)) out.accusation = rng.pick(c.suspects);
  }
  // Partage : les zones coopératives transmettent les pièces de leur cellule.
  // (avec parcimonie : le joueur doit garder de quoi raisonner lui-même).
  if (style !== 'distrait' && rng.chance(style === 'agressif' ? 0.1 : 0.25)) {
    const aDonner = d.pieces.filter((p) => p.src !== 'ouverture' && p.src !== 'rebond' && p.src !== 'partage' && !p.f.startsWith('c:'));
    if (aDonner.length) out.partages.push({ f: rng.pick(aDonner).f, a: '*' });
  }
  // Traque : fouille la planque la plus probable si les indices sont assez précis.
  for (const tr of state.traques || []) {
    const a2 = genererAffaire(state.seed, tr.n);
    const cp = candidats(a2, faitsConnus(dossierAffaire(state, zone, tr.n)));
    const agents = Math.min(alloc.intervention - 2, ENQ.agentsTraque + (style === 'agressif' ? 1 : 0));
    if (agents >= ENQ.agentsTraque && cp.planques.length <= 2 && rng.chance(0.8)) { out.traque = { n: tr.n, planque: rng.pick(cp.planques), agents }; break; }
  }
  return out;
}

/** FIPA : invitation, réponse et choix secret des robots. */
function botFipa(zone, state, style, rng) {
  const out = {};
  for (const f of fipaPour(state, zone.uid)) {
    if (f.etape === 'demande' && f.tourDecision === state.turn && f.demandeur === zone.uid) {
      const possibles = Object.keys(state.zones).filter((u) => !invitationImpossible(state, f, u));
      if (possibles.length && style !== 'distrait') {
        const moi = Math.ceil(f.besoin / 2), lui = f.besoin - moi;
        out.fipa = { id: f.id, invite: rng.pick(possibles), moi: Math.max(FIPA.minAgents, moi), lui: Math.max(FIPA.minAgents, lui) };
      }
    }
    if (f.etape === 'invite' && f.tourReponse === state.turn && f.partenaire === zone.uid) {
      out.fipaReponse = { id: f.id, accepte: rng.chance(style === 'prudent' ? 0.6 : 0.85) };
    }
    if (f.etape === 'accepte' && f.tourJ === state.turn) {
      const traitre = style === 'agressif' ? 0.5 : style === 'distrait' ? 0.2 : 0.1;
      out.fipaChoix = { id: f.id, choix: rng.chance(traitre) ? 'revendiquer' : 'partager' };
    }
  }
  return out;
}

/** Entraide, manœuvres, duels et votes des robots. */
function botRivalites(zone, state, style, rng) {
  const out = {};
  const autres = Object.values(state.zones).filter((z) => z.uid !== zone.uid && z.toursSansOrdres < 3);
  // Entraide : les robots coopératifs aident une zone en péril.
  const peril = autres.find((z) => z.peril);
  if (peril && style !== 'agressif' && zone.budget > 30 && rng.chance(0.6)) out.aide = { cible: peril.uid, budget: 5, agents: agentsDisponibles(zone, state.turn) > 15 ? 1 : 0 };
  // Manœuvres : surtout le robot agressif.
  const envie = style === 'agressif' ? 0.18 : style === 'distrait' ? 0.04 : 0.02;
  const cibles = autres.filter((z) => !cibleImpossible(state, z));
  if (cibles.length && rng.chance(envie)) {
    const c = rng.pick(cibles);
    const type = c.paperasse > 14 ? 'signalement' : c.moral < 50 ? 'debauchage' : c.dossiers.some((d) => d.age > 3) ? 'dessaisissement' : 'poste';
    out.manoeuvre = { type, cible: c.uid };
  }
  // Duels.
  if (!enDuel(state, zone.uid) && cibles.length && rng.chance(style === 'agressif' ? 0.08 : 0.02)) {
    const c = rng.pick(cibles.filter((z) => !enDuel(state, z.uid)).concat([]));
    if (c) out.duel = { cible: c.uid, ind: rng.pick(['satisfaction', 'affaires', 'incidents']) };
  }
  const invit = (state.duels || []).find((d) => d.b === zone.uid && d.etape === 'propose' && d.tourReponse === state.turn);
  if (invit) out.duelReponse = { id: invit.id, accepte: rng.chance(style === 'prudent' ? 0.3 : 0.65) };
  // Conseil.
  if (state.conseil && state.conseil.tour === state.turn) {
    out.votes = {};
    for (const m of state.conseil.motions) {
      if (m.id === 'dotation') out.votes.dotation = style === 'agressif' ? 0 : rng.chance(0.7) ? 1 : 0;
      else if (m.id === 'theme') out.votes.theme = rng.int(0, 2);
      else if (m.id === 'blame') out.votes.blame = m.cibles.includes(zone.uid) ? 0 : rng.chance(0.5) ? 1 : 0;
      else if (m.id === 'chef') out.votes.chef = rng.chance(0.8) ? 1 : 0;
    }
  }
  return out;
}
