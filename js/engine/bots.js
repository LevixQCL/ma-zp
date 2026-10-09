// Zones robots : utilisées par le mode démo et par la simulation d'équilibrage.
import { dilemmeDuJour } from './directeur.js';
import { SERVICES, INFRAS, COUTS, BATIMENTS , REGLES, nbAnnexes, emplacementsAnnexes } from './constants.js';
import { makeRng } from './rng.js';
import { agentsDisponibles, coutDecision, decisionImpossible, operationActive, NIVEAUX_OPERATION, capaciteVehicules } from './zone.js';
import { affaire, dossierDe, dossierAffaire, faitsConnus, candidats, coutDemarche, DEMARCHES, ENQ, dansMaCellule, pieceDemarche, confrontationOk } from './enquete.js';
import { fipaPour, invitationImpossible, FIPA } from './fipa.js';
import { pactesDe, pacteImpossible, defiImpossible, PACTES, DEFI_INDICATEURS } from './pactes.js';
import { encherePossible } from './encheres.js';
import { ND, secteurOuvert } from './constants.js';
import { partsDe, secteursVoisins, faille, repere, ouvertCeSoir } from './nondroit.js';

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
  for (const a of (state.affaires || []).filter((x) => x.zone === zone.uid)) {
    const envie = style === 'prudent' ? 0.7 : 0.9; // ses propres affaires : presque toujours
    if (reste > 12 && rng.chance(envie)) {
      const n = Math.min(reste - 10, a.forceConseillee + rng.int(-1, 2));
      if (n > 0) { engagements[a.id] = { agents: n, acceptes: [] }; reste -= n; }
    }
  }
  const { secteurs, roles } = state.nonDroit && state.nonDroit.roles ? botNonDroitRoles(zone, state, style, rng, reste) : { secteurs: botNonDroit(zone, state, style, rng, reste), roles: undefined };
  reste -= Object.values(secteurs).reduce((a, b) => a + b, 0);
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
    for (const [id, inf] of Object.entries(INFRAS)) if (!zone.infra[id] && zone.budget - inf.cout > 15 && !(inf.v2 && !REGLES.v2) && !(REGLES.v2 && nbAnnexes(zone) >= emplacementsAnnexes(zone))) options.push({ type: 'construire', infra: id });
    options.push({ type: 'former', service: rng.pick(SERVICES) });
    if (zone.agents < 22) options.push({ type: 'recruter', n: 2 });
    if (!zone.travaux && zone.batiments && zone.agents + 2 > BATIMENTS.bureaux.capacite(zone.batiments.bureaux) && zone.batiments.bureaux < 5) options.push({ type: 'agrandir', batiment: 'bureaux' });
  }
  // Flotte : chaque style a son modèle préféré (agressif : fourgon pour les engagements ; prudent : électrique, qui se rembourse ;
  // équilibré : anonyme pour les flagrants ; distrait : combi).
  const prefere = { agressif: 'fourgon', prudent: 'electrique', equilibre: 'anonyme' }[style] || 'diesel';
  if (zone.budget > COUTS.vehicule + 10 && zone.vehicules < 6) options.push({ type: 'equiper', cible: 'vehicule', modele: zone.budget > 30 ? prefere : 'diesel' });
  // Garage plein : ils remplacent un vieux combi par leur modèle préféré (reprise).
  const vieille = (zone.flotte || []).reduce((b, v, i, f) => (v.m === 'diesel' && (b < 0 || v.u > f[b].u) ? i : b), -1);
  if (zone.budget > 30 && prefere !== 'diesel' && vieille >= 0 && zone.vehicules >= capaciteVehicules(zone)) options.push({ type: 'equiper', cible: 'vehicule', modele: prefere, reprise: vieille });
  if (options.length && rng.chance(style === 'prudent' ? 0.25 : 0.45)) {
    const d = rng.pick(options);
    if (!decisionImpossible(zone, d, T) && zone.budget - coutDecision(zone, d) > 5) decision = d;
  }
  // Véhicule perdu dans un accident : les robots le remplacent en priorité quand ils en ont les moyens.
  const rachat = { type: 'equiper', cible: 'vehicule' };
  if (zone.vehicules < 4 && zone.budget > COUTS.vehicule + 5 && !decisionImpossible(zone, rachat, T) && rng.chance(style === 'distrait' ? 0.4 : 0.8)) decision = rachat;
  const depenses = {};
  if (zone.budget > 45) { depenses.reserve = style === 'agressif' ? 3 : 2; depenses.reserveService = zone.paperasse > 14 ? 'admin' : 'intervention'; }
  if (zone.criminalite > 62 && zone.budget > 30) depenses.prevention = true;
  if (zone.moral < 50 && zone.budget > 25) depenses.prime = true;
  if ((zone.cabosses || []).length && zone.budget > 8 && rng.chance(style === 'distrait' ? 0.3 : style === 'agressif' ? 0.6 : 0.9)) depenses.carrosserie = true;
  // Patrouilles : les robots attentifs envoient 2 agents sur le point chaud annoncé.
  const patrouilles = {};
  if (zone.pointChaud && style !== 'distrait' && alloc.proximite >= 2 && rng.chance(style === 'agressif' ? 0.5 : 0.8)) patrouilles[zone.pointChaud.cell] = 2;
  // Le Directeur : les robots attentifs répondent souvent à ce qui est annoncé (feuilleton, fugitif, Fantôme) et aux dilemmes.
  let dilemme = null;
  if (style !== 'distrait') {
    for (const sg of (zone.pressions || []).filter((p) => (p.feuilleton || p.coop) && (p.quartier != null || p.service))) {
      if (!rng.chance(style === 'agressif' ? 0.5 : 0.75)) continue;
      if (sg.quartier != null && alloc.proximite >= (sg.patrouilles || 2)) patrouilles[sg.quartier] = sg.patrouilles || 2;
      // Soirée chargée (deux demandes) : les robots couvrent la première, et la seconde s'il reste de quoi.
      if (sg.service2 && alloc[sg.service2] < sg.min2 && rng.chance(0.5)) {
        const manque2 = sg.min2 - alloc[sg.service2];
        const donneur2 = Object.keys(alloc).filter((k) => k !== sg.service2 && k !== sg.service).sort((a2, b2) => alloc[b2] - alloc[a2])[0];
        const n2 = Math.min(manque2, Math.max(0, alloc[donneur2] - 1));
        alloc[donneur2] -= n2; alloc[sg.service2] += n2;
      }
      if (sg.service && alloc[sg.service] < sg.min) {
        const manque = sg.min - alloc[sg.service];
        const donneur = Object.keys(alloc).filter((k) => k !== sg.service).sort((a2, b2) => alloc[b2] - alloc[a2])[0];
        const n = Math.min(manque, Math.max(0, alloc[donneur] - 2));
        alloc[donneur] -= n; alloc[sg.service] += n;
      }
    }
    if (dilemmeDuJour(state, zone)) dilemme = rng.int(0, 1);
  }
  return { dilemme, patrouilles, alloc, rythme, engagements, secteurs, ...(roles ? { roles } : {}), evenement, decision, operation, depenses, ...botEnquete(zone, state, style, rng, alloc), ...botFipa(zone, state, style, rng), ...botRivalites(zone, state, style, rng) };
}

/**
 * Zone de non-droit : les robots gardent les secteurs où ils ont de l'influence, et attaquent ensemble
 * le secteur le plus avancé (le même pour tous : c'est leur façon de se coordonner sans se parler).
 */
function botNonDroit(zone, state, style, rng, reste) {
  const out = {};
  const nd = state.nonDroit;
  if (!nd) return out;
  let dispo = Math.min(ND.maxTotal, Math.max(0, reste - 13));
  if (dispo <= 0 || (style === 'distrait' && rng.chance(0.6))) return out;
  const cles = Object.keys(nd.secteurs).filter((k) => secteurOuvert(nd, k));
  // Garde.
  for (const k of cles) {
    const s = nd.secteurs[k];
    if (s.statut !== 'repris' || dispo <= 0) continue;
    const p = partsDe(s).find((x) => x.uid === zone.uid);
    if (!p || p.part < ND.partMin) continue;
    if (s.emprise >= 20 && rng.chance(style === 'prudent' ? 0.9 : 0.75)) { const n = Math.min(dispo, s.emprise >= 40 ? 3 : 2); out[k] = n; dispo -= n; }
  }
  // Assaut : le secteur du milieu le plus entamé (le Cœur d'abord s'il est ouvert), de préférence voisin.
  const voisins = new Set(secteursVoisins(state, zone.uid));
  const cibles = cles.filter((k) => nd.secteurs[k].statut === 'milieu').sort((a, b) => (nd.secteurs[b].coeur - nd.secteurs[a].coeur) || (nd.secteurs[a].emprise - nd.secteurs[b].emprise) || (voisins.has(b) - voisins.has(a)) || Number(a) - Number(b));
  const envie = { agressif: 0.8, equilibre: 0.7, prudent: 0.5, distrait: 0.6 }[style] || 0.6;
  if (cibles.length && dispo > 0 && rng.chance(envie)) {
    const n = Math.min(dispo, { agressif: 4, equilibre: 3, prudent: 2, distrait: 3 }[style] || 3);
    out[cibles[0]] = (out[cibles[0]] || 0) + n;
  }
  return out;
}

/**
 * Zone de non-droit avec rôles. Les robots lisent la « radio » (ce que les robots précédents ont annoncé ce soir) :
 * ils complètent le repérage, le bouclage ou la descente qui manque, selon leur point fort.
 * Une partie d'entre eux (distraits, agressifs) fonce en descente sans regarder.
 */
const radioBots = { cle: null, ann: {} };
function botNonDroitRoles(zone, state, style, rng, reste) {
  const secteurs = {}, roles = {};
  const nd = state.nonDroit, T = state.turn, R0 = ND.roles;
  const cle = `${state.seed}:${state.season}:${T}`;
  if (radioBots.cle !== cle) { radioBots.cle = cle; radioBots.ann = {}; }
  const ann = radioBots.ann;
  let dispo = Math.min(ND.maxTotal, Math.max(0, reste - 13));
  if (dispo <= 0 || (style === 'distrait' && rng.chance(0.6))) return { secteurs, roles };
  const mettre = (k, role, n) => {
    n = Math.min(n, dispo, ND.maxParSecteur - (secteurs[k] || 0));
    if (n <= 0) return 0;
    (roles[k] ||= { rep: 0, desc: 0, bouc: 0 })[role] += n; secteurs[k] = (secteurs[k] || 0) + n; dispo -= n;
    ((ann[k] ||= { rep: 0, desc: 0, bouc: 0 })[role] += n);
    return n;
  };
  const cles = Object.keys(nd.secteurs).filter((k) => secteurOuvert(nd, k));
  // Garde.
  for (const k of cles) {
    const s = nd.secteurs[k];
    if (s.statut !== 'repris' || dispo <= 0) continue;
    const p = partsDe(s).find((x) => x.uid === zone.uid);
    if (!p || p.part < ND.partMin) continue;
    if (s.emprise >= 20 && rng.chance(style === 'prudent' ? 0.9 : 0.75)) mettre(k, 'desc', s.emprise >= 40 ? 3 : 2);
  }
  const envie = { agressif: 0.8, equilibre: 0.7, prudent: 0.5, distrait: 0.6 }[style] || 0.6;
  if (dispo <= 0 || !rng.chance(envie)) return { secteurs, roles };
  const milieu = cles.filter((k) => nd.secteurs[k].statut === 'milieu');
  if (!milieu.length) return { secteurs, roles };
  const parEmprise = (a, b) => (nd.secteurs[b].coeur - nd.secteurs[a].coeur) || nd.secteurs[a].emprise - nd.secteurs[b].emprise || Number(a) - Number(b);
  const ok = (k) => { const s = nd.secteurs[k]; return repere(s, T) && !(faille(s).soirs && s.connue && !ouvertCeSoir(s, T)); };
    // Cible : le secteur repéré le plus entamé (tout le monde frappe au même endroit, sinon le milieu se refait partout).
  const A = milieu.filter(ok).sort(parEmprise)[0] || null;
  const aReperer = milieu.filter((k) => !(nd.secteurs[k].repere && nd.secteurs[k].repere.a > T)).sort(parEmprise);
  // Point fort : le service le mieux formé (avec une petite préférence propre à chaque zone).
  const h = [...zone.uid].reduce((a, c) => a + c.charCodeAt(0), 0);
  const niv = { rep: zone.niveaux.recherche + (h % 3 === 0 ? 0.5 : 0), desc: zone.niveaux.intervention + (h % 3 === 1 ? 0.5 : 0), bouc: Math.max(zone.niveaux.roulage, zone.niveaux.proximite) + (h % 3 === 2 ? 0.5 : 0) };
  const fort = Object.entries(niv).sort((a, b) => b[1] - a[1])[0][0];
  const lit = style === 'prudent' || style === 'equilibre' ? rng.chance(0.85) : rng.chance(0.4);
  if (!lit) { mettre(A || milieu.sort(parEmprise)[0], 'desc', { agressif: 4, equilibre: 3, prudent: 2, distrait: 3 }[style] || 3); return { secteurs, roles }; }
  const a = A ? (ann[A] || { rep: 0, desc: 0, bouc: 0 }) : null;
  const ratio = A ? (faille(nd.secteurs[A]).ratio ?? R0.ratio) : R0.ratio;
  const manqueBouc = a ? Math.max(0, Math.ceil(a.desc * ratio) - a.bouc) : 0;
  const B = aReperer.find((k) => (ann[k] || {}).rep < 2 || !ann[k]);
  // Ce qui manque, en commençant par son point fort.
  const besoins = [];
  if (B) besoins.push(['rep', B, 2 - ((ann[B] || {}).rep || 0)]);
  if (A) besoins.push(['desc', A, a.desc < 6 ? 3 : 0]);
  if (A && manqueBouc) besoins.push(['bouc', A, manqueBouc]);
  besoins.sort((x, y) => (y[0] === fort) - (x[0] === fort));
  for (const [role, k, n] of besoins) { if (n > 0) mettre(k, role, n); if (dispo <= 2) break; }
  // Après une descente, compléter son propre bouclage si personne ne l'a fait.
  if (A && roles[A] && roles[A].desc) { const aa = ann[A]; const m = Math.max(0, Math.ceil(aa.desc * ratio) - aa.bouc); if (m) mettre(A, 'bouc', m); }
  return { secteurs, roles };
}

/** Enquête : constatations d'abord, puis vérifications ciblées ; accusation quand un seul suspect reste. */
function botEnquete(zone, state, style, rng, alloc) {
  const out = { demarches: [], accusation: null, accusation2: null, traque: null, partages: [], piste: null };
  if (!state.enquete) return out;
  const aff = affaire(state, state.enquete.n);
  const d = dossierDe(state, zone);
  const connus = new Set(faitsConnus(d));
  const c = candidats(aff, faitsConnus(d));
  const nb = zone.budget > 35 ? 2 : zone.budget > 15 ? 1 : 0;
  const envie = style === 'distrait' ? 0.4 : style === 'prudent' ? 0.7 : 0.9;
  // Les constatations (surtout l'audition, gratuite), puis les suspects encore possibles.
  const scenes = ['temoin', 'cam', 'labo'].filter((k) => (aff.meurtre ? !!pieceDemarche(aff, d, k) : !connus.has(`c:${DEMARCHES[k].scene}`)));
  const cibles = [];
  for (const i of c.suspects) {
    for (const [k, dm] of Object.entries(DEMARCHES)) {
      if (!dm.cible || connus.has(`${dm.cible}:${i}`) || (aff.meurtre ? !pieceDemarche(aff, d, `${k}:${i}`) : !connus.has(`c:${dm.cible}`))) continue;
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
  // Piste prioritaire des enquêteurs : un suspect encore possible de sa cellule.
  if (style !== 'distrait') {
    const miens = c.suspects.filter((i) => dansMaCellule(state, zone.uid, i));
    if (miens.length && rng.chance(style === 'prudent' ? 0.9 : 0.7)) out.piste = rng.pick(miens);
  }
  // Accusation : seulement quand un seul suspect reste (l'agressif tente parfois à deux).
  if (aff.meurtre) {
    // Confrontation : seulement avec trois pièces qui tiennent (le robot sait les reconnaître).
    if (!d.exclu && d.accuse === null && c.suspects.length === 1 && rng.chance(0.8)) {
      const dispo2 = [...aff.confront.decisives, ...aff.confront.accablantes].filter((f, k, a) => a.indexOf(f) === k && (f.startsWith('doc:') || connus.has(f)));
      const choix = dispo2.slice(0, 3);
      if (confrontationOk(aff, c.suspects[0], choix)) { out.accusation = c.suspects[0]; out.confront = choix; }
    }
  } else if (!d.exclu && d.accuse === null) {
    // Deux complices : le robot accuse la paire quand il ne reste qu'elle (l'agressif tente parfois à trois).
    const nA = aff.variante === 'complices' ? 2 : 1;
    if (c.suspects.length === nA && rng.chance(style === 'distrait' ? 0.5 : 0.85)) { out.accusation = c.suspects[0]; if (nA === 2) out.accusation2 = c.suspects[1]; }
    else if (style === 'agressif' && c.suspects.length === nA + 1 && rng.chance(0.25)) { if (nA === 1) out.accusation = rng.pick(c.suspects); else { const p = rng.shuffle(c.suspects); out.accusation = p[0]; out.accusation2 = p[1]; } }
  }
  // Partage : les zones coopératives transmettent les pièces de leur cellule.
  // (avec parcimonie : le joueur doit garder de quoi raisonner lui-même).
  if (style !== 'distrait' && rng.chance(style === 'agressif' ? 0.1 : 0.25)) {
    const aDonner = d.pieces.filter((p) => p.src !== 'ouverture' && p.src !== 'rebond' && p.src !== 'partage' && !p.f.startsWith('c:'));
    if (aDonner.length) out.partages.push({ f: rng.pick(aDonner).f, a: '*' });
  }
  // Traque : fouille la planque la plus probable si les indices sont assez précis.
  for (const tr of state.traques || []) {
    const a2 = affaire(state, tr.n);
    const cp = candidats(a2, faitsConnus(dossierAffaire(state, zone, tr.n)));
    const agents = Math.min(alloc.intervention - 2, ENQ.agentsTraque + (style === 'agressif' ? 1 : 0));
    if (agents >= ENQ.agentsTraque && cp.planques.length <= 2 && rng.chance(0.8)) { const pq = rng.shuffle(cp.planques); out.traque = { n: tr.n, planque: pq[0], agents, ...(pq.length > 1 && (zone.flotte || []).some((v) => v.m === 'anonyme') ? { planque2: pq[1] } : {}) }; break; }
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

/** Coup de main, pactes, défis et votes des robots. */
function botRivalites(zone, state, style, rng) {
  const out = {};
  const autres = Object.values(state.zones).filter((z) => z.uid !== zone.uid && z.toursSansOrdres < 3);
  // Entraide : les robots coopératifs aident une zone en péril.
  const peril = autres.find((z) => z.peril || z.tutelle);
  if (peril && style !== 'agressif' && zone.budget > 30 && rng.chance(0.6)) out.aide = { cible: peril.uid, budget: 5, agents: agentsDisponibles(zone, state.turn) > 15 ? 1 : 0 };
  // Pactes : répondre, mettre en commun les demi-pièces, en proposer de temps en temps.
  const T = state.turn;
  for (const p of pactesDe(state, zone.uid)) {
    if (p.etape === 'propose' && p.b === zone.uid && p.tourReponse === T) out.pacteReponse = { id: p.id, accepte: rng.chance(style === 'prudent' ? 0.5 : 0.75) };
    if (p.etape === 'actif' && p.frag && !(p.frag.donne && p.frag.donne[zone.uid]) && rng.chance(style === 'distrait' ? 0.6 : 0.85)) out.fragment = p.id;
  }
  const libres = autres.filter((z) => !pacteImpossible(state, zone.uid, z.uid));
  if (libres.length && rng.chance(style === 'agressif' ? 0.04 : 0.1)) out.pacte = { cible: rng.pick(libres).uid, type: rng.pick(Object.keys(PACTES)) };
  // Défis amicaux.
  const inv = (state.defis || []).find((d) => d.b === zone.uid && d.etape === 'propose' && d.tourReponse === T);
  if (inv) out.defiReponse = { id: inv.id, accepte: rng.chance(style === 'prudent' ? 0.3 : 0.6) };
  const defiables = autres.filter((z) => !defiImpossible(state, zone.uid, z.uid));
  if (defiables.length && rng.chance(style === 'agressif' ? 0.08 : 0.02)) out.defi = { cible: rng.pick(defiables).uid, ind: rng.pick(Object.keys(DEFI_INDICATEURS)), mise: zone.budget > 30 ? 3 : 0 };
  // Salle des ventes : les robots enchérissent quand ils ont de la marge.
  const e = state.enchere;
  if (e && !encherePossible(state, zone) && zone.budget > 30 && rng.chance(style === 'agressif' ? 0.45 : style === 'prudent' ? 0.15 : 0.3)) {
    const montant = Math.min(Math.floor(zone.budget - 25), e.prixMin + rng.int(0, style === 'agressif' ? 6 : 3));
    if (montant >= e.prixMin) out.offre = { id: e.id, montant };
  }
  // Saison 2 : vente aux enchères, offre finale secrète sur un lot (et parfois une expertise le premier jour).
  const v = state.vente;
  if (v && v.cloture === state.turn && zone.budget > 25 && rng.chance(style === 'agressif' ? 0.5 : style === 'prudent' ? 0.2 : 0.35)) {
    const lot = rng.pick(v.lots), cur = (v.meneurs && v.meneurs[lot.k] && v.meneurs[lot.k].montant) || lot.prixMin;
    const montant = Math.min(Math.floor(zone.budget - 20), Math.ceil(cur + rng.int(0, style === 'agressif' ? 5 : 2)));
    if (montant >= lot.prixMin) out.finales = { [lot.k]: { montant } };
  } else if (v && v.ouverture === state.turn && zone.agents > 18 && rng.chance(0.15)) out.expertise = rng.pick(v.lots).k;
  // Conseil.
  if (state.conseil && state.conseil.tour === state.turn) {
    out.votes = {};
    for (const m of state.conseil.motions) {
      if (m.id === 'dotation') out.votes.dotation = style === 'agressif' ? 0 : rng.chance(0.7) ? 1 : 0;
      else if (m.id === 'theme') out.votes.theme = rng.int(0, 2);
      else if (m.id === 'solidarite') out.votes.solidarite = m.cible === zone.uid || rng.chance(style === 'agressif' ? 0.3 : 0.7) ? 1 : 0;
      else if (m.id === 'blame') out.votes.blame = m.cibles.includes(zone.uid) ? 0 : rng.chance(0.5) ? 1 : 0;
      else if (m.id === 'chef') out.votes.chef = rng.chance(0.8) ? 1 : 0;
    }
  }
  return out;
}
