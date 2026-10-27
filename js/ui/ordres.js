// Écran des ordres du tour.
import { vehiculeSvg } from './scene-hp.js';
import { effetsPressions } from '../engine/contenu.js';
import { comparatifModeles } from './modeles.js';
import { lancerColonne } from './capsules.js';
import { S, esc, icon, fmt1, tabbar, myZone, bonusEnigme, academieResume } from './common.js';
import { SERVICES, SERVICE_LABELS, RYTHMES, INFRAS, COUTS, DEFAULT_ALLOC, DEPENSES, NIVEAU_MAX, BATIMENTS, BATIMENT_MAX, TRAVAUX_TOURS, ENTRETIEN_ANNEXE, DELAI_ACADEMIE, DUREE_FORMATION, SEASON_LENGTH, SUBSIDE, ROULAGE, seuilChasse, tourEffet, malusEtat, coutEquipement, effetEquip, bonusEquip, multNiveau, multEquip, ECONOMIE, coutFormation, agentsFormation, EQUIP, DOSSIER, valeurDossier, PREPA, coutPrepa } from '../engine/constants.js';
import { vitesseCombi, MODELES, IDS_MODELES, placesIntervention, agentsMontes, apportAchat, plusUse, prixRevente, modeleDe, RENDEMENT } from '../engine/flotte.js';
import { vagueServiceHtml } from './vagues.js';
import { coutBilan } from '../engine/bilan.js';
import { engagementsDuJour } from './engagements.js';
import { primeHtml } from './prime.js';
import { previsionHtml, suivrePrevision } from './prevision.js';
import { MAX_DEPENSES } from '../engine/regles.js';
import { coutPrime } from '../engine/constants.js';
import { agentsService, resumeArmurerie, armurerieHtml, resumeArmurerieOrdres, specialiteHtml, resumeSpecialite } from './armurerie.js';
import { journeeLive } from './enquete-direct.js';
import { SPECIALITES, palierSpe, multSpe } from '../engine/constants.js';
import { ARMURERIE, possede } from '../engine/materiel.js';
import { demandeRenfortHtml } from './renfort.js';
import { effectifPrevu, capaciteAgents, capaciteAgentsPrevue, capaciteVehicules, coutRecrue, sousTutelle, moralMult } from '../engine/zone.js';
import { coutCarrosserie } from '../engine/sinistres.js';
import { agentsND } from './nondroit.js';
import { nomSecteur } from '../engine/nondroit.js';
import { secteurOuvert } from '../engine/constants.js';
import { niveauTension, QUARTIERS } from '../engine/quartiers.js';
import { pressionsVisibles } from '../engine/directeur.js';
import { agentsDisponibles, blessesActifs, enFormation, capacite, coutDecision, decisionImpossible, effetsOperation, operationActive, NIVEAUX_OPERATION, coutDepenses } from '../engine/zone.js';

function enqueteDraft() {
  const o = S.savedOrders || {};
  return {
    dilemme: Number.isInteger(o.dilemme) ? o.dilemme : null, appui: o.appui || null, prime: o.prime || null, piste: o.piste ?? null, hypo: o.hypo || null, traque: o.traque || null, partages: o.partages || [],
    renfort: o.renfort || null, bilan: o.bilan || {},
  };
}

export function initDraft() {
  const z = myZone();
  const st = S.state;
  const dispo = agentsDisponibles(z, st.turn);
  const base = S.savedOrders || (z.dernierOrdre ? { alloc: z.dernierOrdre.alloc, rythme: z.dernierOrdre.rythme } : { alloc: DEFAULT_ALLOC, rythme: 'normal' });
  const sv = S.savedOrders || {};
  const d = JSON.parse(JSON.stringify({ secteurs: base.secteurs || (!S.savedOrders && z.dernierOrdre && z.dernierOrdre.secteurs) || {}, roles: base.roles || (!S.savedOrders && z.dernierOrdre && z.dernierOrdre.roles) || {}, alloc: { ...DEFAULT_ALLOC, ...(base.alloc || {}) }, rythme: base.rythme || 'normal', decision: base.decision || null, evenement: base.evenement || 0, operation: base.operation || 'complet', sansDecision: !!sv.sansDecision, depenses: sv.depenses || { reserve: 0, reserveService: 'intervention' }, demolir: sv.demolir || null, achat: sv.achat || null, specialite: sv.specialite || null, materiel: sv.materiel && sv.materiel.acheter ? { acheter: sv.materiel.acheter } : { acheter: null }, ...enqueteDraft() }));
  // Zone de non-droit : seulement les secteurs ouverts ce soir.
  for (const k of Object.keys(d.secteurs)) if (!secteurOuvert(st.nonDroit, k) || !(d.secteurs[k] > 0)) delete d.secteurs[k];
  for (const k of Object.keys(d.roles)) { const r = d.roles[k]; if (!d.secteurs[k] || !r || r.rep + r.desc + r.bouc !== d.secteurs[k]) delete d.roles[k]; }
  // Ajuste la répartition si des agents manquent (blessés, formation…).
  let total = SERVICES.reduce((s, k) => s + d.alloc[k], 0) + engages(d);
  let i = 0;
  while (total > dispo && i < 200) { const k = SERVICES[i % SERVICES.length]; if (d.alloc[k] > 0) { d.alloc[k]--; total--; } i++; }
  S.draft = d;
  S.paraIdx = null;
}

/** Grand événement du district ouvert aujourd'hui ? (sinon les agents « envoyés » ne partent pas). */
const evenementDuJour = () => !!(S.state.evenement && S.state.evenement.tour === S.state.turn);

function engages(d) {
  return agentsND(d) + (evenementDuJour() ? d.evenement || 0 : 0) + (d.renfort && S.state.zones[d.renfort.cible] && operationActive(S.state.zones[d.renfort.cible], S.state.turn) ? d.renfort.agents || 0 : 0);
}

/**
 * Où sont mes agents ? Tout ce qui retient des agents hors des cinq services,
 * avec un indicateur « bloqué » quand l'engagement n'est plus visible ailleurs à l'écran.
 */
export function agentsHorsServices() {
  const st = S.state, d = S.draft, l = [];
  for (const [k, n] of Object.entries(d.secteurs || {})) if (n) l.push({ k: `nd:${k}`, t: `Zone de non-droit · ${esc(nomSecteur(k))}`, n, bloque: secteurOuvert(st.nonDroit, k) ? null : 'secteur fermé' });
  if (d.evenement) l.push({ k: 'ev', t: 'Grand événement du district', n: d.evenement, bloque: evenementDuJour() ? null : 'pas d’événement aujourd’hui', compte: evenementDuJour() });
  if (d.renfort && d.renfort.agents) {
    const cz = st.zones[d.renfort.cible];
    const actif = cz && operationActive(cz, st.turn);
    l.push({ k: 'renfort', t: `Renfort prêté à ${cz ? esc(cz.nom) : '?'}`, n: d.renfort.agents, bloque: actif ? null : 'plus d’opération chez eux', compte: !!actif });
  }
  return l;
}

/** L'audition de la victime a-t-elle été lancée aujourd'hui (deux enquêteurs pris pour la journée) ? */
const auditionDuJour = () => { try { const r = journeeLive(); return !!(r && r.lancees.some((l) => l.k === 'temoin')); } catch { return false; } };
/** Agents partis pour la journée hors des services : audition et traque. */
export function missionsEnquete(d) {
  const l = [];
  if (auditionDuJour()) l.push({ k: 'audition', t: 'Audition de la victime (enquête)', n: 2, service: 'recherche' });
  if (d.traque && d.traque.agents) l.push({ k: 'traque', t: 'Traque du suspect (enquête)', n: d.traque.agents, service: 'intervention' });
  return l;
}

/**
 * Agents pris dans les services pour la journée (même ordre que la résolution) : opération d'envergure,
 * puis audition et traque, qui partent d'abord parmi les agents laissés sans affectation.
 * Renvoie { s: [[n, motif], …] } (seulement ce qui manque dans les services).
 */
export function prisesDuJour(z, d, opx, libres0 = 0) {
  const al = d.alloc, pris = {};
  const ajoute = (s, n, motif) => { if (n > 0) (pris[s] ||= []).push([n, motif]); };
  for (const [s, n] of Object.entries(opx.pris || {})) ajoute(s, n, 'l’opération');
  let libres = Math.max(0, libres0);
  for (const m of missionsEnquete(d)) {
    let n = m.n;
    const k = Math.min(libres, n); libres -= k; n -= k;
    if (!n) continue;
    if (m.service) ajoute(m.service, Math.min(n, al[m.service] || 0), m.k);
    else for (const s of ['proximite', 'intervention', 'roulage', 'recherche', 'admin']) { const k2 = Math.min(n, al[s] || 0); ajoute(s, k2, m.k); n -= k2; }
  }
  return pris;
}

export function estimations() {
  const z = myZone(), st = S.state, d = S.draft;
  const opts = { rythme: d.rythme, turn: st.turn };
  const opx = effetsOperation(z, d.alloc, d.operation, st.turn);
  const dispo0 = agentsDisponibles(z, st.turn);
  const resteBase = dispo0 - SERVICES.reduce((s, k) => s + d.alloc[k], 0) - engages(d);
  const enquete = missionsEnquete(d).reduce((s, m) => s + m.n, 0);
  const prises = prisesDuJour(z, d, opx, resteBase);
  const eff = { ...opx.eff };
  for (const [s, l] of Object.entries(prises)) for (const [n, motif] of l) if (motif !== 'l’opération') eff[s] = Math.max(0, (eff[s] || 0) - n);
  const pr = effetsPressions(z.pressions);
  const dep = d.depenses || {};
  const cap = {};
  for (const s of SERVICES) cap[s] = capacite(z, s, eff[s] + (dep.reserve && dep.reserveService === s ? dep.reserve * DEPENSES.reserve.efficacite : 0), { ...opts, bonus: bonusEnigme(s), alloc: eff });
  const crim = Math.max(10, Math.min(95, z.criminalite + (pr.criminalite || 0) - (dep.prevention ? 6 : 0)));
  const attendus = Math.max(1, Math.round(1.5 + crim / 14) + (pr.incidents || 0));
  const couverts = Math.min(attendus, Math.floor(cap.intervention / 1.1));
  const papV = couverts * 0.4 + 0.6 + 1.2 + (pr.paperasse || 0) - (dep.soustraitance ? 5 : 0) - cap.admin * 1.2;
  const pap = Math.round(papV);
  // Ce qu'un agent de plus à l'Accueil retire de la pile ce soir (pour dire combien il en faudrait).
  const capAdmin1 = Math.max(0.3, (capacite(z, 'admin', eff.admin + 1, { ...opts, bonus: bonusEnigme('admin') }) - capacite(z, 'admin', eff.admin, { ...opts, bonus: bonusEnigme('admin') })) * 1.2);
  const amendes = cap.roulage * ECONOMIE.amendeParCapacite;
  const total = SERVICES.reduce((s, k) => s + eff[k], 0) || 1;
  const chasse = eff.roulage / total > seuilChasse(z);
  const dispo = dispo0;
  // Les agents en mission d'enquête sortent du total : ils ne sont plus à répartir.
  const reste = resteBase - enquete;
  const coutDep = coutDepenses(dep, z);
  const coutTotal = coutDep + coutBilan(z, d.bilan) + (d.decision && !decisionImpossible(z, d.decision, st.turn) ? coutDecision(z, d.decision) : 0);
  // Criminalité prévue ce soir (comme le tour des quartiers, sans l'aléa ni la diffusion) : dérive du soir, moins 0,6 par unité de Proximité.
  const crimSoir = Math.max(10, Math.min(95, crim + QUARTIERS.derive - 0.6 * (cap.proximite || 0)));
  return { crimSoir, attendus, couverts, pap, papV, capAdmin1, amendes, chasse, dispo, reste, resteBase, enquete, opx, coutDep, coutTotal, prises, crim, cap, eff };
}

// ───── Remplissage des services : une case par agent dont le service a besoin ce soir ─────
/** Le service a-t-il son compte ce soir ? (mêmes critères que la ligne de résultat sous son nom) */
function serviceRempli(s, e, z) {
  if (s === 'intervention') return e.couverts >= e.attendus;
  if (s === 'proximite') return Math.round(e.crimSoir) <= Math.round(z.criminalite);
  if (s === 'admin') return z.paperasse + e.papV <= 14 && e.papV <= 0.15;
  if (s === 'recherche') {
    const p = projeterDossiers(z, ((e.cap && e.cap.recherche) || 0) + (S.draft && S.draft.depenses && S.draft.depenses.enqueteurs ? DEPENSES.enqueteurs.unites : 0));
    const retard = p.lignes.filter((l) => !l.boucle && l.d.age + 1 > 6).length;
    return !retard && (p.boucles > 0 || !p.restants);
  }
  return true;
}
let cacheBesoins = { cle: null, val: null };
/** Besoin de chaque service : le plus petit nombre d'agents qui le remplit, à répartition égale ailleurs. */
export function besoinsServices(e = estimations()) {
  const z = myZone(), d = S.draft;
  const cle = JSON.stringify([S.state.turn, d.alloc, d.rythme, d.depenses, d.operation, d.secteurs, auditionDuJour(), d.traque]);
  if (cacheBesoins.cle === cle) return cacheBesoins.val;
  const val = {};
  for (const s of SERVICES) {
    const n = d.alloc[s];
    if (s === 'roulage') {
      const total = SERVICES.reduce((t, k) => t + d.alloc[k], 0) || 1;
      const maxChasse = Math.max(1, Math.floor(seuilChasse(z) * total));
      const utile = Math.min(ROULAGE.seuil, maxChasse);
      val[s] = { bes: 0, utile, st: e.chasse ? 'trop' : n > utile ? 'trop' : 'libre' };
      continue;
    }
    let bes = 0;
    if (s === 'recherche' && !(z.dossiers || []).length) bes = 0;
    else {
      const orig = d.alloc[s];
      bes = 31;
      for (let k = 0; k <= 30; k++) { d.alloc[s] = k; if (serviceRempli(s, estimations(), z)) { bes = k; break; } }
      d.alloc[s] = orig;
    }
    // Toujours cohérent avec l'estimation affichée : rempli ⇒ le besoin est couvert, et inversement.
    const ok = serviceRempli(s, e, z);
    if (ok) bes = Math.min(bes, n); else bes = Math.max(bes, n + 1);
    const utile = s === 'intervention' ? bes + 4 : s === 'proximite' ? bes + 3 : Math.max(bes + 2, 6);
    const st = !ok ? (bes - n >= 2 ? 'manque' : 'juste') : !bes && s === 'recherche' ? 'libre' : n > utile ? 'trop' : 'ok';
    val[s] = { bes, utile, st };
  }
  cacheBesoins = { cle, val };
  return val;
}
/** Bandeau posé sur les agents partis ailleurs pour la journée (un mot), et sa version longue (info-bulle). */
const MOTIF_COURT = { 'l’opération': 'Opération', audition: 'Audition', traque: 'Traque' };
const MOTIF_LONG = { 'l’opération': 'l’opération d’envergure', audition: 'l’audition de la victime (enquête)', traque: 'la traque du suspect (enquête)' };
/** Explication affichée en touchant un groupe d'agents partis ailleurs. */
function infoMission(s, k, motif) {
  const de = /^[AEIOUÉ]/.test(SERVICE_LABELS[s]) ? `d’${SERVICE_LABELS[s]}` : `de ${SERVICE_LABELS[s]}`;
  const qui = k > 1 ? `${k} agents ${de} sont pris` : `1 agent ${de} est pris`;
  const suite = motif === 'l’opération' ? `${k > 1 ? 'Ils comptent' : 'Il compte'} pour l’opération, pas pour le service.`
    : 'Ces agents partent d’abord parmi tes agents sans affectation : laisses-en de libres pour garder ce service au complet.';
  return `${qui} aujourd’hui pour ${MOTIF_LONG[motif] || motif}. ${suite}`;
}
/** État du service, en clair : ce qu'il faut encore, ou que le besoin est couvert ([texte, couleur]). */
function etatService(s, b, n) {
  const k = b.bes - n;
  return {
    manque: [`Encore ${k} agent${k > 1 ? 's' : ''}`, 'red'],
    juste: [`Encore ${k} agent${k > 1 ? 's' : ''}`, 'amber'],
    ok: ['Besoin couvert', 'green'],
    trop: [s === 'roulage' ? 'Chasse aux PV' : 'Au-delà du besoin', 'amber'],
    libre: [s === 'roulage' ? 'Pas de besoin' : 'Rien en attente', 'blue'],
  }[b.st];
}

// ───── Affectation « La colonne » ─────
// Les cinq capsules empilées, reliées par un ascenseur où attendent les agents libres. Sur chaque coque, une console
// (+, nombre, −, voyant) ; sous chaque capsule, les chiffres clés en pastilles. La lumière dit l'effectif : éclairée
// (couvert), lueur ambre (il manque 1 agent), dans le noir avec une alarme rouge (il en manque plusieurs).
// Toucher une capsule ouvre la feuille du service ; toucher un agent ouvre sa fiche (« Déplacer vers… »).
// Animations : transitions CSS (capsules.js), rien hors écran, rien avec « réduire les animations ».
const NOM_SVC = (s) => (s === 'admin' ? 'Accueil' : SERVICE_LABELS[s]);
const LUM_SVC = { manque: 'alarme', juste: 'ambre' };
const COL_MAX = 9;
/** Décalage d'une animation CSS en boucle : elle reprend au même point après un rerendu au lieu de repartir de zéro. */
const phase = (dur) => `${(-((Date.now() / 1000) % dur)).toFixed(2)}s`;
const ICO_COL = {
  sir: '<path d="M4 12V8a4 4 0 0 1 8 0v4M2.5 12.5h11M8 1.5v1.2M2.6 3.6l.9.9M13.4 3.6l-.9.9"/>',
  up: '<path d="M2 12l4-4 3 3 5-6M10 5h4v4"/>',
  dos: '<path d="M2 4.5h4l1.5 1.5H14v6.5H2z"/>',
  pap: '<path d="M4 2h6l3 3v9H4zM6.5 8h4M6.5 10.5h4"/>',
  out: '<path d="M6 3H3v10h3M10 5l3 3-3 3M13 8H6"/>',
};
const icoCol = (k) => `<span class="ic" aria-hidden="true"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICO_COL[k]}</svg></span>`;

/** Les agents d'un service ce soir : au service (avec leur équipement), places à pourvoir, « en plus », partis en mission. */
function agentsColonne(s, b, n, e) {
  const groupes = ((e.prises || {})[s] || []).filter(([k]) => k > 0);
  const pris = Math.min(n, groupes.reduce((t, [k]) => t + k, 0));
  const au = n - pris;
  const besoin = s === 'roulage' ? 0 : Math.max(0, b.bes - pris);
  const limite = s === 'roulage' ? Math.max(0, b.utile - pris) : besoin;
  const ag = agentsService(s), l = [];
  for (let i = 0; i < au; i++) {
    const a = ag(i);
    l.push({ ...a, i, plus: i >= limite, recrue: /\/recrue\./.test(a.img), sg: /\bsg\b/.test(a.cls), sa: /\bsa\b/.test(a.cls), taser: /taser/.test(a.img), fn: />FN</.test(a.bdg) });
  }
  return { groupes, pris, au, besoin, limite, l, places: Math.max(0, besoin - au), enPlus: Math.max(0, au - limite) };
}
const INFO_PLUS = 'Il est bien au service, mais au-delà de ce que le service peut utiliser aujourd’hui : il rapporte peu. Tu peux le placer ailleurs.';
/** Petites pastilles sous les pieds : sans gilet, sans recyclage TTI, recrue à ½, en plus. */
const piedsAgent = (a) => [a.sg ? '<i class="sg"></i>' : '', a.sa ? '<i class="sa"></i>' : '', a.recrue ? '<i class="dm"></i>' : '', a.plus ? '<i class="ep"></i>' : ''].join('');
/** Ce qu'on lit de l'agent, en clair. */
function etiquettesAgent(a) {
  const c = [];
  c.push(a.sg ? '<span class="r">sans gilet valide</span>' : '<span class="v">gilet valide</span>');
  c.push(a.sa ? '<span class="r">sans recyclage TTI arme</span>' : '<span>TTI arme à jour</span>');
  if (a.taser) c.push('<span>taser</span>');
  if (a.fn) c.push('<span>FN 303</span>');
  if (a.recrue) c.push('<span class="v">recrue · compte ½</span>');
  if (a.plus) c.push('<span class="b">en plus</span>');
  return c.join('');
}

/** Rangée de pastilles illustrées sous la capsule : les chiffres clés du service, sans rien ouvrir. */
function pastillesService(s, z, e, A) {
  const d = S.draft, dep = d.depenses || {};
  const P = (cls, ic, txt, em = '') => `<span class="pst ${cls}">${ic}<b>${txt}</b>${em ? `<em>${em}</em>` : ''}</span>`;
  const im = (f, sp) => `<img class="${sp ? 'sp' : ''}" src="${f}" alt="" loading="lazy">`;
  const mj = (v, c) => `<span class="mj" aria-hidden="true"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%;background:${c}"></i></span>`;
  const sansG = '';
  const l = [];
  if (s === 'intervention') {
    const r = e.attendus - e.couverts;
    l.push(P(r <= 0 ? 'v' : r >= 2 ? 'r' : 'a', icoCol('sir'), `${e.couverts}/${e.attendus}`, 'incid.'));
    if (possede(z, 'gilets')) l.push(P('v', im('img/materiel/gilets.webp'), 'gilets'));
    const fd = z.jaugeFlagrant || 0;
    l.push(`<span class="pst" title="Flagrant délit">${mj(fd, 'var(--red)')}<em>FD</em><b>${Math.round(fd * 100)} %</b></span>`);
  } else if (s === 'proximite') {
    const avant = Math.round(z.criminalite), apres = Math.round(e.crimSoir), nt = niveauTension(apres);
    const cls = nt.id === 'calme' ? 'v' : nt.id === 'surveille' ? 'a' : 'r';
    l.push(P(cls, icoCol('up'), `${avant} → ${apres}`, 'criminalité'));
    if (nt.id !== 'calme') l.push(P(cls, '', esc(nt.nom)));
    l.push(sansG);
  } else if (s === 'recherche') {
    const p = projeterDossiers(z, ((e.cap && e.cap.recherche) || 0) + (dep.enqueteurs ? DEPENSES.enqueteurs.unites : 0));
    const retard = p.lignes.filter((x) => !x.boucle && x.d.age + 1 > 6).length;
    if (retard) l.push(P('r', icoCol('dos'), retard, `en retard · ${p.restants} en cours`));
    else if (p.boucles) l.push(P('v', icoCol('dos'), p.boucles, `bouclé${p.boucles > 1 ? 's' : ''} ce soir · ${p.restants} en cours`));
    else l.push(P(p.restants ? 'a' : '', icoCol('dos'), p.restants, p.restants ? 'dossier' + (p.restants > 1 ? 's' : '') + ' en cours' : 'dossier en attente'));
    l.push(P('', im('img/materiel/tenue.webp'), 'tenue civile'));
  } else if (s === 'roulage') {
    l.push(e.chasse ? P('r', icoCol('sir'), 'chasse aux PV', 'satisf. −2') : P('v', '<span class="ic">€</span>', `+${fmt1(e.amendes)} k€`, 'amendes'));
    l.push(P('', im('img/capsules/ag/roul.webp', 1), 'gilet fluo'));
    l.push(sansG);
  } else if (s === 'admin') {
    const v = e.papV, avant = Math.round(z.paperasse), apres = Math.round(Math.max(0, z.paperasse + v));
    const cls = apres > 14 ? 'r' : v > 0.15 ? 'a' : 'v';
    l.push(P(cls, icoCol('pap'), `${avant} → ${apres}`, 'paperasse'));
    l.push(`<span class="pst ${cls}">${mj(apres / 14, apres > 14 ? 'var(--red)' : apres >= 11 ? 'var(--amber)' : '#C084FC')}<b>seuil 14</b></span>`);
    const rc = A.l.filter((a) => a.recrue).length;
    if (rc) l.push(P('v', im('img/capsules/ag/recrue.webp', 1), rc > 1 ? `${rc}×½` : '½', 'recrue'));
  }
  for (const [k, motif] of A.groupes) l.push(P('a', icoCol('out'), k, esc((MOTIF_COURT[motif] || motif).toLowerCase())));
  if (dep.reserve && dep.reserveService === s) l.push(P('a', '', `+${dep.reserve}`, 'de réserve'));
  if (A.au > COL_MAX) l.push(P('', '', `+${A.au - COL_MAX}`, 'hors champ'));
  const Sp = jaugeSpeDe(z);
  if (Sp && Sp.service === s) l.push(`<span class="pst" title="${esc(Sp.jauge.nom)}">${mj(z.jaugeSpe || 0, 'var(--amber)')}<em>${Sp.jauge.ico}</em><b>${Math.round((z.jaugeSpe || 0) * 100)} %</b></span>`);
  return l.join('');
}

/** Les services triés pour placer un agent libre : celui qui manque le plus d'abord (comme « Agents libres »). */
function ordrePlacement(bs) {
  const rang = { manque: 0, juste: 1 };
  return [...SERVICES.filter((s2) => bs[s2] && bs[s2].st in rang).sort((a, b) => rang[bs[a].st] - rang[bs[b].st]), 'intervention', 'proximite', ...SERVICES].filter((v, i, t) => t.indexOf(v) === i);
}

function etageHtml(s, z, e, bs, cabine) {
  const d = S.draft, b = bs[s], n = d.alloc[s], A = agentsColonne(s, b, n, e), coul = COUL_SVC[s];
  const lum = LUM_SVC[b.st] || 'lit';
  const [etat] = etatService(s, b, n);
  const slots = Math.min(COL_MAX, Math.max(A.au, A.au + A.places));
  const xs = (i) => (slots <= 1 ? 0.5 : i / (slots - 1)).toFixed(3);
  const vus = A.l.slice(0, COL_MAX);
  // Un agent sur trois flâne autour de sa place (animation CSS, reprise au même point d'un rendu à l'autre).
  const figs = vus.map((a) => { const fl = a.i % 3 === 1, dur = 7 + ((a.i * 13 + s.length) % 5), pas = (a.i % 2 ? -1 : 1) * (6 + (a.i % 3) * 2);
    return `<span class="cap-ag${a.plus ? ' plus' : ''}${fl ? ' flane' : ''}" data-k="${s}-${a.i}" style="--x:${xs(a.i)}${fl ? `;--dur:${dur}s;--del:${phase(dur)};--pas:${pas}px` : ''}" role="button" tabindex="0" data-action="col-agent" data-s="${s}" data-i="${a.i}" aria-label="Agent ${a.i + 1} : ${esc(a.titre || 'rien à signaler')}${a.plus ? ', en plus' : ''}"><span class="col-marche"><img src="${a.img.replace('img/agents/', 'img/capsules/ag/')}" alt="" draggable="false"></span><span class="col-pied">${piedsAgent(a)}</span></span>`; }).join('');
  const places = Array.from({ length: Math.max(0, Math.min(COL_MAX - vus.length, A.places)) }, (_, k) => `<span class="col-place" style="--x:${xs(vus.length + k)}"></span>`).join('');
  const bonus = bonusEnigme(s) > 1 ? ` <small>+${Math.round((bonusEnigme(s) - 1) * 100)} %</small>` : '';
  return `<div class="col-etage col-${lum}" data-s="${s}" style="--c:${coul}">
    <span class="col-sas" aria-hidden="true"></span>
    <div class="col-cap" role="button" tabindex="0" data-action="col-feuille" data-s="${s}" aria-label="${NOM_SVC(s)} : ${n} agent${n > 1 ? 's' : ''}, ${esc(etat)}. Ouvrir le détail">
      <span class="col-halo"></span>
      <span class="col-scene"><img class="col-decor" src="img/capsules/${s}.webp" alt="" width="800" height="259" decoding="async"><span class="col-figs">${figs}</span></span>
      <span class="col-voile"${lum === 'alarme' ? ` style="animation-delay:${phase(3.2)}"` : ''}></span>
      <span class="col-places">${places}</span>
      <span class="col-tag nom">${NOM_SVC(s)}${bonus}</span><span class="col-tag etat ${lum}">${esc(etat)}${lum === 'lit' && A.enPlus && b.st !== 'trop' ? ` · ${A.enPlus} en plus` : ''}</span>
    </div>
    <div class="col-console"><button type="button" data-action="alloc" data-s="${s}" data-d="1" aria-label="Un agent de plus en ${SERVICE_LABELS[s]}">+</button><span class="col-nb"><span class="n">${n}</span>${b.bes ? `<small>/${b.bes}</small>` : ''}<i class="col-voyant"></i></span><button type="button" data-action="alloc" data-s="${s}" data-d="-1" aria-label="Un agent de moins en ${SERVICE_LABELS[s]}" ${n <= 0 ? 'disabled' : ''}>−</button></div>
    <div class="col-pst" role="button" tabindex="0" data-action="col-feuille" data-s="${s}" aria-label="Détail : ${NOM_SVC(s)}">${pastillesService(s, z, e, A)}</div>
    ${cabine || ''}
  </div>`;
}

/** La colonne complète : ascenseur, cabine des agents libres, les cinq capsules. */
function colonneHtml(z, e) {
  const bs = besoinsServices(e), libres = Math.max(0, e.reste);
  const ordre = ordrePlacement(bs), cible = libres ? ordre[0] : null;
  const sprite = libres ? 'img/capsules/ag/inter.webp' : '';
  const menu = libres && S.colMenu ? `<div class="col-menu" role="menu"><span class="tiny muted">Placer ${libres > 1 ? 'un agent libre' : 'l’agent libre'} :</span>${ordre.map((s2) => { const m = bs[s2].bes - S.draft.alloc[s2]; return `<button type="button" role="menuitem" data-action="alloc-libre" data-s="${s2}"><i style="background:${COUL_SVC[s2]}"></i>+ ${NOM_SVC(s2)}${m > 0 ? `<em>il en manque ${m}</em>` : ''}</button>`; }).join('')}</div>` : '';
  const cabine = `<button type="button" class="col-cabine${libres ? '' : ' vide'}" data-action="col-menu" aria-expanded="${!!(libres && S.colMenu)}" aria-label="${libres ? `${libres} agent${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''} dans l’ascenseur : placer` : 'Ascenseur vide'}" ${libres ? '' : 'disabled'}>${libres ? `<img src="${sprite}" alt="" draggable="false"><span class="x">${libres > 1 ? '×' + libres : '1'}</span>` : ''}</button><i class="col-fleche" aria-hidden="true"></i>${menu}`;
  return `<div class="colonne${libres ? ' attend' : ''}" id="colonne">
    <span class="col-tube" aria-hidden="true"><span class="col-flux"${libres ? ` style="animation-delay:${phase(3.2)}"` : ''}></span></span><span class="col-chapeau" aria-hidden="true"></span><span class="col-socle" aria-hidden="true"></span>
    ${cible ? '' : `<span class="col-parking">${cabine}</span>`}
    <div class="col-etages">${SERVICES.map((s2) => etageHtml(s2, z, e, bs, s2 === cible ? cabine : '')).join('')}</div>
  </div>
  <p class="col-leg tiny muted"><span><i class="ep"></i>en plus</span></p>
  ${libres ? '' : ''}${(() => { if (typeof requestAnimationFrame === 'function') requestAnimationFrame(lancerColonne); return ''; })()}`;
}

/** La phrase du besoin, en clair (« besoin 7 · il en manque 3 »). */
function phraseBesoin(s, b, n, A) {
  const pris = A.pris ? ` · dont ${A.pris} pris ailleurs aujourd’hui` : '';
  if (s === 'roulage') return `pas de besoin minimum · utile jusqu’à ${b.utile}${n > b.utile ? ` · ${n - b.utile} en plus` : ''}${pris}`;
  if (!b.bes) return `pas de besoin ce soir${n ? ` · ${n} en plus` : ''}${pris}`;
  const m = b.bes - n;
  return m > 0 ? `besoin ${b.bes} · il en manque ${m}${pris}` : `besoin ${b.bes} · couvert${A.enPlus ? ` · ${A.enPlus} en plus` : ''}${pris}`;
}

/** Feuille du bas : tout le détail d'un service, ou la fiche d'un agent. */
function feuilleColonne(z, e) {
  const f = S.colFeuille;
  if (!f || !SERVICES.includes(f.s)) return '';
  const s = f.s, d = S.draft, dep = d.depenses || {}, bs = besoinsServices(e), b = bs[s], n = d.alloc[s], A = agentsColonne(s, b, n, e);
  const [etat, coulEtat] = etatService(s, b, n);
  const entre = S.colFeuilleEntre ? ' entre' : '';
  S.colFeuilleEntre = false;
  const ancien = typeof document !== 'undefined' && document.getElementById('col-fcorps');
  const haut = S.colFeuilleHaut || !ancien; S.colFeuilleHaut = false;
  if (!haut && ancien) { const y = ancien.scrollTop; setTimeout(() => { const c = document.getElementById('col-fcorps'); if (c) c.scrollTop = y; }, 0); }
  const a = f.i != null ? A.l[f.i] : null;
  let corps;
  if (a) {
    const phr = [a.info ? esc(a.info).replace(/\n/g, '<br>') : 'Rien à signaler : équipé et à jour.', a.plus ? INFO_PLUS : ''].filter(Boolean).join('<br>');
    const apres = n - 1;
    corps = `<button type="button" class="col-retour" data-action="col-agent" data-s="${s}" data-i="">${NOM_SVC(s)} · ${A.au} au service</button>
      <div class="col-fiche" style="--c:${COUL_SVC[s]}"><img src="${a.img}" alt=""><div><b>Agent ${a.i + 1}</b><span>${NOM_SVC(s)}</span><span class="col-chips">${etiquettesAgent(a)}</span></div></div>
      <p class="col-fphr">${phr}</p>
      <span class="col-fh">Déplacer vers</span>
      <div class="col-dep">${SERVICES.filter((x) => x !== s).map((x) => { const m = bs[x].bes - d.alloc[x]; return `<button type="button" data-action="col-deplacer" data-s="${s}" data-v="${x}"><i style="background:${COUL_SVC[x]}"></i><span>${NOM_SVC(x)}${m > 0 ? `<small>il en manque ${m}</small>` : ''}</span></button>`; }).join('')}
        <button type="button" class="lib" data-action="col-deplacer" data-s="${s}" data-v="">Libérer · l’envoyer dans l’ascenseur</button></div>
      <p class="col-fphr">Le retirer d’ici : ${NOM_SVC(s)} passe à ${apres}${b.bes ? ` pour un besoin de ${b.bes}${apres < b.bes ? (b.bes - apres >= 2 ? ' (capsule dans le noir)' : ' (lueur ambre)') : ''}` : ''}.</p>`;
  } else {
    const placer = e.reste > 0 ? 'alloc-libre' : 'alloc';
    const lignes = A.l.map((x) => `<button type="button" class="col-ligne" data-action="col-agent" data-s="${s}" data-i="${x.i}"><span class="av"><img src="${x.img.replace('img/agents/', 'img/capsules/ag/')}" alt=""></span><span class="col-lt"><b>Agent ${x.i + 1}</b><span class="col-chips">${etiquettesAgent(x)}</span></span><i class="chv"></i></button>`).join('')
      + Array.from({ length: A.places }, () => `<div class="col-ligne place ${b.st === 'manque' ? 'r' : ''}"><span class="av"></span><span class="col-lt"><b>Place à pourvoir</b></span><button type="button" data-action="${placer}" data-s="${s}" data-d="1">+ placer</button></div>`).join('')
      + A.groupes.map(([k, motif]) => `<div class="col-ligne mission"><span class="av">${icoCol('out')}</span><span class="col-lt"><b>${k} ${esc((MOTIF_COURT[motif] || motif).toLowerCase())}</b><span class="tiny muted">${esc(infoMission(s, k, motif))}</span></span></div>`).join('');
    corps = `<div class="col-f1"><div class="col-fphrase"><b>${phraseBesoin(s, b, n, A)}</b><span class="svc-r">${resultatService(e, s)}</span></div>
        <span class="stepper"><button type="button" data-action="alloc" data-s="${s}" data-d="-1" aria-label="Un agent de moins en ${SERVICE_LABELS[s]}" ${n <= 0 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="alloc" data-s="${s}" data-d="1" aria-label="Un agent de plus en ${SERVICE_LABELS[s]}">+</button></span></div>
      <div class="col-pst col-pst-f">${pastillesService(s, z, e, A)}</div>
      <span class="col-fh">Agents · ${A.au} au service${b.bes ? ` · besoin ${b.bes}` : ''}</span>
      <div class="col-lignes">${lignes || '<span class="tiny muted">Personne au service ce soir.</span>'}</div>
      ${A.groupes.length ? '' : '<span class="tiny muted">En mission ou en opération : personne ce soir.</span>'}
      ${dep.reserve && dep.reserveService === s ? `<span class="tiny" style="color:var(--amber-soft)">+ ${dep.reserve} de réserve en renfort</span>` : ''}
      ${s === 'intervention' ? `<span class="col-fh">Armurerie</span>${resumeArmurerie()}` : ''}
      ${jaugesService(z, s)}
      ${prisHtml(e, s)}
      ${s === 'recherche' ? `<span class="col-fh">Dossiers</span><div id="dos-recherche">${dossiersHtml(z, e)}</div>` : ''}
      <span class="col-fh">Niveau ${z.niveaux[s]} · comment ça marche</span>
      <p class="tiny" style="margin:0;color:var(--text2);line-height:1.45">${esc(aide(s, z))}</p>`;
  }
  return `<div class="col-fond${entre}" data-action="col-fermer" aria-hidden="true"></div>
  <section class="col-feuille${entre}" role="dialog" aria-modal="true" aria-label="${a ? `Agent ${a.i + 1}, ${NOM_SVC(s)}` : `Détail du service : ${NOM_SVC(s)}`}" style="--c:${COUL_SVC[s]}">
    <button type="button" class="col-poignee" data-action="col-fermer" aria-label="Fermer"><i></i></button>
    <div class="col-ftete col-${LUM_SVC[b.st] || 'lit'}"><img src="img/capsules/${s}.webp" alt=""><span class="col-fti"><b>${NOM_SVC(s)}</b><span class="${coulEtat}">${esc(etat)}</span></span><button type="button" class="col-ferme" data-action="col-fermer" aria-label="Fermer">×</button></div>
    <div class="col-fcorps" id="col-fcorps">${corps}</div>
  </section>`;
}
/** Barre de toute l'affectation : un segment par agent à répartir, couleur de son service ; pointillés = encore libres. */
function barreAffectation(e) {
  const d = S.draft;
  const segs = [];
  for (const s of SERVICES) for (let i = 0; i < d.alloc[s]; i++) segs.push(`<i style="background:${COUL_SVC[s]}"></i>`);
  for (let i = 0; i < Math.max(0, e.reste); i++) segs.push('<i class="libre"></i>');
  return segs.join('');
}

/** « dont 2 en audition » sous un service : ces agents ne travaillent pas dans le service aujourd'hui. */
function prisHtml(e, s) {
  const l = (e.prises || {})[s];
  const vg = vagueServiceHtml(e, s);
  // Les agents partis en mission se voient maintenant dans les cases du service (groupes séparés).
  if (!l || !l.length) return vg;
  return vg;
}

function opCouvHtml(e) {
  const { op, pris, couverture } = e.opx;
  const f = NIVEAUX_OPERATION[S.draft.operation];
  const manques = Object.entries(op.besoins).map(([s, n]) => [s, Math.ceil(n * f) - (pris[s] || 0)]).filter(([, m]) => m > 0);
  const pct = Math.round(couverture * 100);
  const cls = couverture >= 0.9 ? 'ok' : couverture >= 0.5 ? 'warn' : 'bad';
  return `<span class="small ${cls}" style="font-weight:700">Dispositif couvert à ${pct} %</span>${manques.length ? `<span class="tiny muted">Il manque : ${manques.map(([s, m]) => `${m} en ${SERVICE_LABELS[s]}`).join(', ')}. Augmente ces services dans l\u2019affectation.</span>` : ''}`;
}

/**
 * Agents de réserve, dans l'Affectation : ils renforcent un service pour la journée. On peut alors retirer
 * autant de ses propres agents de ce service pour les envoyer ailleurs (zone de non-droit, autre service…).
 */
function reserveHtml(z, d, e) {
  const dep = d.depenses || {};
  const n = dep.reserve || 0;
  if (sousTutelle(z, S.state.turn)) return '';
  const s = dep.reserveService || 'intervention';
  const libres = Math.max(0, e.reste);
  return `<div class="svc svc-res">
    <div class="svc-l"><i class="svc-c" style="background:var(--faint)"></i>
      <span class="svc-t"><span class="svc-n">Agents de réserve</span><span class="svc-r muted">Renfort payant pour la journée, en plus de tes agents : ${fmt1(DEPENSES.reserve.cout)} k€ l’agent, il travaille à ${Math.round(DEPENSES.reserve.efficacite * 100)} % d’un des tiens</span></span>
      <span class="stepper"><button type="button" data-action="dep-reserve" data-d="-1" aria-label="Un agent de réserve en moins" ${n <= 0 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="dep-reserve" data-d="1" aria-label="Un agent de réserve en plus" ${n >= DEPENSES.reserve.max ? 'disabled' : ''}>+</button></span></div>
    ${n ? `<div class="svc-plus"><label class="field" style="font-weight:500">Service renforcé
      <select class="text" data-change="dep-service" style="min-height:44px;font-size:14px">${SERVICES.map((s2) => `<option value="${s2}" ${s === s2 ? 'selected' : ''}>${SERVICE_LABELS[s2]}</option>`).join('')}</select></label>
      ${(d.alloc[s] || 0) > 0 && libres < n ? `<button type="button" class="btn small outline block" data-action="reserve-libere">Libérer ${Math.min(n, d.alloc[s])} de mes agents de ${SERVICE_LABELS[s]}</button>` : ''}
      <span class="tiny muted">La réserve couvre le service pendant que tes propres agents partent ailleurs : zone de non-droit, renfort, autre service. Payée à 20:00 si le budget le permet.</span></div>` : ''}
  </div>
  ${libres ? `<div class="between" style="gap:8px;padding-top:6px"><span class="small warn" style="font-weight:600">${libres} agent${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''} à placer</span><span class="row" style="gap:6px"><a class="btn small primary" href="#terrain">Zone de non-droit</a><button type="button" class="btn small ghost" data-action="repartir">Dans les services</button></span></div>` : ''}`;
}

/** Couleur de chaque service (la même que sa figure dans « Mon équipe »). */
const COUL_SVC = { intervention: '#FF6E6A', proximite: '#3DD39A', recherche: '#63B0FF', roulage: '#FFB23F', admin: '#C084FC' };

/** Ce que le service donnera ce soir, sous son nom (estimation). */
function resultatService(e, s) {
  const z = myZone();
  const pap = (v) => (v < 0 ? `−${-v}` : v > 0 ? `+${v}` : '±0');
  switch (s) {
    case 'intervention': {
      const rates = e.attendus - e.couverts;
      return rates <= 0 ? `<span class="ok">${e.couverts}/${e.attendus} incidents couverts</span>`
        : `<span class="${rates >= 2 ? 'bad' : 'warn'}">${e.couverts}/${e.attendus} couverts · ${rates} raté${rates > 1 ? 's' : ''} prévu${rates > 1 ? 's' : ''}</span>`;
    }
    case 'proximite': {
      // Criminalité = moyenne des quartiers (10 à 95) ; prévision de ce soir, mêmes seuils que la Carte.
      const avant = Math.round(z.criminalite), apres = Math.round(e.crimSoir);
      const n = niveauTension(apres);
      const cls = n.id === 'calme' ? 'ok' : n.id === 'surveille' ? 'warn' : 'bad';
      return `<span class="${cls}">criminalité ${avant} → ${apres} ce soir · ${n.nom}</span>`;
    }
    case 'recherche': {
      const p = projeterDossiers(z, ((e.cap && e.cap.recherche) || 0) + (S.draft && S.draft.depenses && S.draft.depenses.enqueteurs ? DEPENSES.enqueteurs.unites : 0));
      const retard = p.lignes.filter((l) => !l.boucle && l.d.age + 1 > 6).length;
      const enCours = `${p.restants} dossier${p.restants > 1 ? 's' : ''} en cours`;
      if (retard) return `<span class="bad">${retard} dossier${retard > 1 ? 's' : ''} en retard · ${enCours}</span>`;
      if (p.boucles) return `<span class="ok">${p.boucles} dossier${p.boucles > 1 ? 's' : ''} bouclé${p.boucles > 1 ? 's' : ''} ce soir · ${p.restants} en cours</span>`;
      if (!p.restants) return '<span class="ok">aucun dossier en attente</span>';
      return `<span class="warn">aucun dossier bouclé ce soir · ${enCours}</span>`;
    }
    case 'roulage': return e.chasse ? '<span class="bad">« chasse aux PV » : satisfaction −2</span>' : `<span class="ok">+${fmt1(e.amendes)} k€ d’amendes</span>`;
    case 'admin': {
      const v = e.papV;
      const txt = Math.abs(v) < 1 && Math.abs(v) >= 0.15 ? `${v > 0 ? '+' : '−'}${fmt1(Math.abs(Math.round(v * 10) / 10))}` : pap(e.pap);
      // Pile au-dessus de 14 (−2 de moral par soir) qui ne baisse pas : combien d'agents il faudrait en plus.
      const manque = z.paperasse > 14 && v > -1 ? Math.ceil((v + 1) / e.capAdmin1) : 0;
      const apres = Math.max(0, z.paperasse + v);
      // Vert : la pile baisse et reste sous le seuil de 14 ; orange : elle monte ; rouge : au-dessus de 14 (−2 de moral).
      const cls = apres > 14 ? 'bad' : v > 0.15 ? 'warn' : 'ok';
      return `<span class="${cls}">paperasse ${Math.round(z.paperasse)} → ${Math.round(apres)} ce soir (${txt}) · seuil 14${manque ? ` · ≈ ${manque} agent${manque > 1 ? 's' : ''} de plus pour la faire baisser` : ''}</span>`;
    }
    default: return '';
  }
}

function statusHtml(e) {
  if (e.reste === 0) return `<span class="small ok" style="font-weight:600">${e.dispo} agents affectés</span>`;
  if (e.reste > 0) return `<span class="small warn" style="font-weight:600">${e.reste} agent${e.reste > 1 ? 's' : ''} sans affectation</span>`;
  if (e.resteBase >= 0) return `<span class="small warn" style="font-weight:600">${-e.reste} pris dans tes services (missions du jour)</span>`;
  return `<span class="small bad" style="font-weight:600">${-e.reste} agent${e.reste < -1 ? 's' : ''} de trop</span>`;
}

/** Mise à jour sans redessiner l'écran (pendant qu'on glisse un curseur). */
export function updateOrdresLive() {
  const e = estimations();
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  for (const s of SERVICES) set(`pris-${s}`, prisHtml(e, s));
  if (e.opx.op) set('op-couv', opCouvHtml(e));
  set('alloc-status', statusHtml(e));
  set('col-affect', colonneHtml(myZone(), e));
  set('barre-aff', barreAffectation(e));
  set('dos-recherche', dossiersHtml(myZone(), e));
  const ch = document.getElementById('est-chasse'); if (ch) ch.hidden = !e.chasse;
  const btn = document.getElementById('btn-valider'); if (btn) btn.disabled = e.resteBase < 0;
  const dirty = document.getElementById('dirty'); if (dirty) dirty.hidden = !S.ordersDirty;
}

function decisionLabel(z, d) {
  if (!d) return 'Aucune';
  if (d.type === 'recruter') return `Recruter ${d.n} agent${d.n > 1 ? 's' : ''}`;
  if (d.type === 'former') return `Former : ${SERVICE_LABELS[d.service]} niveau ${z.niveaux[d.service]} → ${z.niveaux[d.service] + 1}`;
  if (d.type === 'equiper' && d.cible === 'prepa') return `Préparer les combis : niveau ${z.prepa || 0} → ${(z.prepa || 0) + 1}`;
  if (d.type === 'equiper') return d.cible === 'vehicule' ? `Acheter : ${(MODELES[d.modele] || MODELES.diesel).nom}${d.reprise != null ? ' (avec reprise)' : ''}` : `Équiper : ${SERVICE_LABELS[d.cible]} niveau ${z.equip[d.cible]} → ${z.equip[d.cible] + 1}`;
  if (d.type === 'construire') return `Construire : ${INFRAS[d.infra].nom}`;
  if (d.type === 'agrandir') return `Agrandir : ${BATIMENTS[d.batiment].nom} niveau ${z.batiments[d.batiment]} → ${z.batiments[d.batiment] + 1}`;
  return '';
}


const DEC_CATS = [['recruter', 'Recruter'], ['former', 'Former'], ['equiper', 'Équiper'], ['batir', 'Bâtir']];
const catDe = (dec) => (!dec ? null : dec.type === 'construire' || dec.type === 'agrandir' ? 'batir' : dec.type);
const niv = (n, max = NIVEAU_MAX) => `<span class="niv" aria-label="niveau ${n} sur ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

/** Gain d'un service avec une zone modifiée, à répartition actuelle : { avant, apres } en capacité. */
function gainService(z, s, modif) {
  const z2 = JSON.parse(JSON.stringify(z));
  modif(z2);
  const n = S.draft.alloc[s] || 0, o = { rythme: S.draft.rythme, turn: S.state.turn };
  const am = (x) => 1 + bonusEquip(x, 'roulage', 'amendes');
  return { avant: capacite(z, s, n, o), apres: capacite(z2, s, n, o), n, amAvant: am(z), amApres: am(z2) };
}

/** Ce que change concrètement une grande décision, chiffré sur la répartition du jour. */
function detailDecision(z, dec, T) {
  const cout = coutDecision(z, dec);
  const l = [];
  const pct = (a, b) => (a > 0 ? `${b >= a ? '+' : '−'}${Math.round(Math.abs(b / a - 1) * 100)} %` : '—');
  const argent = (s, g, entretien = 0, fixe = 0) => {
    if (s !== 'roulage') return;
    const var_ = (g.apres * (g.amApres || 1) - g.avant * (g.amAvant || 1)) * ECONOMIE.amendeParCapacite;
    const gain = var_ + fixe - entretien;
    const parts = [fixe ? `+${fmt1(fixe)} fixe` : '', `+${fmt1(var_)} avec tes ${g.n} agents en Roulage`, entretien ? `−${fmt1(entretien)} d’entretien` : ''].filter(Boolean).join(' ');
    l.push(`Gain : ${gain >= 0 ? '+' : '−'}${fmt1(Math.abs(gain))} k€ par tour (${parts})${gain > 0 ? `, rentabilisé en ${Math.ceil(cout / gain)} tours environ` : ''}.`);
  };
  const effet = (s, g) => {
    if (!g.n) { l.push(`Tu n’as aucun agent en ${SERVICE_LABELS[s]} aujourd’hui : le gain dépendra de ceux que tu y mettras.`); return; }
    if (s === 'intervention') l.push(`Intervention : environ ${Math.floor(g.avant / 1.1)} → ${Math.floor(g.apres / 1.1)} incidents traités par jour avec tes ${g.n} agents.`);
    else if (s === 'admin') l.push(`Paperasse : environ ${fmt1(g.avant * 1.2)} → ${fmt1(g.apres * 1.2)} dossiers traités par jour.`);
    else if (s === 'recherche') l.push(`Recherche : tes dossiers avancent ${pct(g.avant, g.apres)} plus vite.`);
    else if (s === 'proximite') l.push(`Proximité : la criminalité baisse ${pct(g.avant, g.apres)} plus vite.`);
  };
  if (dec.type === 'recruter') {
    l.push(`${dec.n} agent${dec.n > 1 ? 's' : ''} de plus au tour ${T + DELAI_ACADEMIE} (académie). Effectif ${effectifPrevu(z)} → ${effectifPrevu(z) + dec.n} sur ${capaciteAgentsPrevue(z)} places${capaciteAgentsPrevue(z) > capaciteAgents(z) ? ' (agrandissement en cours compris)' : ''}.`);
    l.push(`Coût : ${cout} k€ maintenant, puis ${fmt1(dec.n * ECONOMIE.salaire)} k€ de salaires en plus par tour. Mis en Roulage, un agent rapporte environ ${fmt1(capacite(z, 'roulage', 1, { turn: T }) * ECONOMIE.amendeParCapacite)} k€ par tour.`);
  } else if (dec.type === 'former') {
    const s = dec.service, n = z.niveaux[s];
    const g = gainService(z, s, (x) => { x.niveaux[s] = n + 1; });
    l.push(`${SERVICE_LABELS[s]} niveau ${n} → ${n + 1} : efficacité ${pct(multNiveau(n), multNiveau(n + 1))}.`);
    const abs = agentsFormation(z, s);
    l.push(`${abs ? `${abs} agents absents au tour ${T + 1}` : 'Formation au stand de tir : moitié prix et personne d’absent'}, niveau gagné au calcul du tour ${T + DUREE_FORMATION}, quand tes agents reviennent. Conservé à la saison suivante (un niveau de moins).`);
    effet(s, g); argent(s, g);
  } else if (dec.type === 'equiper' && dec.cible === 'vehicule') {
    const inter = S.draft.alloc.intervention || 0, lim = (v) => v * 2.5;
    const M = MODELES[dec.modele] || MODELES.diesel;
    const avec = (x) => { x.flotte = [...(x.flotte || []), { m: dec.modele || 'diesel', u: 0, km: 0, achat: T }]; x.vehicules = x.flotte.length; x.usure = x.flotte.reduce((s, v) => s + v.u, 0) / x.vehicules; };
    const g = gainService(z, 'intervention', avec);
    const pl0 = placesIntervention(z, T, S.draft.rythme), pl1 = pl0 + M.places;
    l.push(`${M.nom} : ${M.texte}`);
    if (dec.reprise != null && z.flotte[dec.reprise]) {
      const A = modeleDe(z.flotte[dec.reprise]);
      l.push(`Avec reprise : ${A.nom.toLowerCase()} à ${Math.round(100 - z.flotte[dec.reprise].u)} % repris ${fmt1(prixRevente(z, dec.reprise))} k€ (déduits du prix : ${fmt1(coutDecision(z, dec))} k€ à payer). Toujours ${z.vehicules} véhicules ; places : ${fmt1(pl0)} → ${fmt1(pl0 - A.places + M.places)}. Entretien : ${M.entretien >= A.entretien ? '+' : '−'}${fmt1(Math.abs(M.entretien - A.entretien))} k€ par tour.`);
    } else l.push(`${z.vehicules} → ${z.vehicules + 1} véhicules, dès le tour ${T + 1}. Places pour l’Intervention : ${fmt1(pl0)} → ${fmt1(pl1)} agents (tu en mets ${inter}). Entretien : +${fmt1(M.entretien)} k€ par tour.`);
    const vv = Math.round(31 * 3.6 * M.vitesse * (1 + PREPA.vitesse * (z.prepa || 0)));
    l.push(`Sur les urgences, neuf : ${vv} km/h de pointe${M.accel !== 1 ? `, accélération ${M.accel > 1 ? '+' : '−'}${Math.round(Math.abs(M.accel - 1) * 100)} %` : ''}${M.maniab !== 1 ? `, maniabilité ${M.maniab > 1 ? '+' : '−'}${Math.round(Math.abs(M.maniab - 1) * 100)} %` : ''}${M.usure !== 1 ? `. S’use ${Math.round((1 - M.usure) * 100)} % moins vite` : ''}.`);
    l.push(`Ce qu’il rapporterait avec ta répartition du jour : ${apportAchat(z, dec.modele || 'diesel', S.draft.alloc || {}, T, S.draft.rythme, dec.reprise != null && z.flotte[dec.reprise] ? dec.reprise : null).join(' ; ')}.`);
    if (inter > pl0) effet('intervention', g);
  } else if (dec.type === 'equiper' && dec.cible === 'prepa') {
    const n = z.prepa || 0, av = vitesseCombi(z), ap = vitesseCombi({ ...z, prepa: n + 1 });
    l.push(`Préparation des combis ${n} → ${n + 1} (moteur, freins, pneus), dès demain : vitesse de pointe sur les urgences ${Math.round(31 * 3.6 * av.mult)} → ${Math.round(31 * 3.6 * ap.mult)} km/h, freinage +${Math.round(PREPA.frein * 100)} %. Remise à zéro en fin de saison.`);
    l.push(`La vitesse dépend aussi de l’état du parc (${av.etat} % aujourd’hui) et des combis cabossés : révision et carrosserie comptent autant.`);
  } else if (dec.type === 'equiper') {
    const s = dec.cible, n = z.equip[s];
    const g = gainService(z, s, (x) => { x.equip[s] = n + 1; });
    l.push(`Matériel ${SERVICE_LABELS[s]} ${n} → ${n + 1} : efficacité ${pct(multEquip(n), multEquip(n + 1))} et ${effetEquip(s, n)} au total, dès le tour ${T + 1}. Pas d’entretien. Remis à zéro en fin de saison.`);
    effet(s, g); argent(s, g);
  } else if (dec.type === 'agrandir') {
    const B = BATIMENTS[dec.batiment], n = z.batiments[dec.batiment];
    l.push(`${B.nom} niveau ${n} → ${n + 1} après ${TRAVAUX_TOURS} tour${TRAVAUX_TOURS > 1 ? 's' : ''} de travaux : ${B.capacite(n)} → ${B.capacite(n + 1)} ${B.unite}.`);
    l.push(`Entretien ${fmt1(B.entretien(n))} → ${fmt1(B.entretien(n + 1))} k€ par tour. Utile seulement si tu comptes ${dec.batiment === 'bureaux' ? 'recruter' : 'acheter des véhicules'} au-delà de la capacité actuelle.`);
    if (dec.batiment === 'bureaux') l.push(`Chaque agent au-delà de ${SUBSIDE.seuil} rapporte un subside communal de ${fmt1(SUBSIDE.parAgent)} k€ par tour (la moitié de son salaire).`);
  } else if (dec.type === 'construire') {
    const id = dec.infra, inf = INFRAS[id];
    l.push(`${inf.effet}. Permanent, conservé d’une saison à l’autre. Entretien ${fmt1(ENTRETIEN_ANNEXE)} k€ par tour.`);
    const svc = { anpr: 'roulage', antenne: 'proximite', audition: 'recherche', logiciel: 'admin', tir: 'intervention' }[id];
    if (svc) { const g = gainService(z, svc, (x) => { x.infra[id] = true; }); effet(svc, g); argent(svc, g, ENTRETIEN_ANNEXE, inf.fixe || 0); }
    if (id === 'anpr') l.push('Surtout : l’effet « chasse aux PV » ne joue plus qu’au-delà de 40 % d’agents en Roulage (au lieu de 25 %).');
    if (id === 'garage') l.push(`Usure des véhicules divisée par deux (état du parc : ${Math.round(100 - z.usure)} %). Pannes et accidents plus rares.`);
    if (id === 'sport') l.push('+1 de moral chaque tour : le moral multiplie l’efficacité de tous les services.');
    if (id === 'tir') l.push(`Formation Intervention au stand : ${INFRAS.tir.formation.cout} k€ au lieu de ${COUTS.formation} k€, sans agent absent. Agents mieux entraînés : risque de blessure divisé par deux quand tu engages une grosse équipe sur une affaire ou à l’assaut de la zone de non-droit, et une rébellion ne blesse plus qu’un agent.`);
  }
  return `<span class="tiny" style="font-weight:700;color:var(--amber)">Ce que ça change · ${cout} k€</span>${l.map((x) => `<p class="small" style="margin:0">${esc(x)}</p>`).join('')}`;
}

/** Annexes : emplacements libres, et démolition d'une annexe (gratuite, ce soir). */
function emplacementsHtml(z, d) {
  const faites = Object.keys(z.infra || {}).filter((k) => z.infra[k] && INFRAS[k]);
  const max = 3 + ((z.batiments && z.batiments.bureaux) || 1);
  return `<div class="col" style="gap:4px"><span class="tiny ${faites.length >= max ? 'warn' : 'muted'}">Emplacements d’annexes : ${faites.length} sur ${max} (3 + niveau ${z.batiments.bureaux} des bureaux).${faites.length >= max ? ' Pour en bâtir une autre, agrandis l’hôtel de police ou démolis une annexe.' : ''}</span>
    ${faites.length ? `<label class="field tiny">Démolir une annexe ce soir (gratuit, sans remboursement)<select class="text" data-change="demolir"><option value="">Aucune</option>${faites.map((k) => `<option value="${k}" ${d.demolir === k ? 'selected' : ''}>${esc(INFRAS[k].nom)}</option>`).join('')}</select></label>` : ''}</div>`;
}

/** Alerte : dépenses + démarches + décision dépassent la caisse ; la décision, payée en dernier, serait refusée. */
function avertBudget(z, d) {
  if (!d.decision) return '';
  const e = engagementsDuJour(d, z);
  if (!e.decision || e.total <= z.budget + 0.05) return '';
  const avant = [e.depenses ? `dépenses ${fmt1(e.depenses)} k€` : '', e.enquete ? `démarches d’enquête ${fmt1(e.enquete)} k€` : ''].filter(Boolean).join(' + ');
  return `<p class="small bad" style="margin:0">⚠ Budget trop juste : ${avant} passent d’abord, il ne restera que ${fmt1(Math.max(0, z.budget - e.depenses - e.enquete))} k€ pour ta décision à ${fmt1(e.decision)} k€. Elle sera <strong>refusée</strong> à 20:00. Retire une dépense ou une démarche, ou choisis une décision moins chère.</p>`;
}

/** Formations lancées les soirs précédents : le niveau tombe à la résolution du tour indiqué. */
function formationsEnCours(z, T) {
  const f = (z.formations || []).filter((x) => x.fin >= T && !x.fait);
  if (!f.length) return '';
  return `<p class="small ok" style="margin:0">${f.map((x) => `🎓 Formation ${esc(SERVICE_LABELS[x.service])} en cours : niveau ${z.niveaux[x.service]} → ${z.niveaux[x.service] + 1} ${x.fin <= T + 1 ? 'ce soir à 20:00, agents de retour demain' : `au calcul du tour ${x.fin - 1}`}`).join('<br>')}</p>`;
}

/**
 * « Tes décisions, d'un soir à l'autre ». Ce qui est arrivé cette nuit (et ce que ça change),
 * puis ce qui est en route et quand. Lecture seule de l'état : aucune règle du jeu ne change.
 */
function suiviDecisionsHtml(z, T) {
  const arrive = (z.rapport || []).filter((l) => /^(Travaux terminés|Formation terminée|Nouveau véhicule livré|\d+ recrues? sort)/.test(l))
    .map((l) => `<li class="sd-l sd-ok"><span class="sd-q">cette nuit</span><span>${esc(l.length > 140 ? `${l.slice(0, 137)}…` : l)}</span></li>`);
  const hier = (z.rapport || []).filter((l) => /^(\d+ recrues? à l’académie|Formation lancée|Travaux lancés|Décision refusée)/.test(l))
    .map((l) => `<li class="sd-l${/^Décision refusée/.test(l) ? ' sd-ko' : ''}"><span class="sd-q">hier soir</span><span>${esc(l)}</span></li>`);
  arrive.unshift(...hier);
  const dans = (t) => { const k = t - T; return k <= 0 ? 'ce soir' : k === 1 ? 'demain' : `dans ${k} jours`; };
  const route = [];
  for (const a of z.academie || []) route.push([a.arrivee - 1, `🎓 ${a.n} recrue${a.n > 1 ? 's' : ''} sort${a.n > 1 ? 'ent' : ''} de l’académie → +${a.n} agent${a.n > 1 ? 's' : ''} dans tes ordres le lendemain`]);
  for (const f of z.formations || []) if (!f.fait && f.fin >= T) route.push([f.fin - 1, `📚 Formation ${SERVICE_LABELS[f.service]} → niveau ${z.niveaux[f.service] + 1}${f.agents ? ` · ${f.agents} agents absents d’ici là` : ''}`]);
  if (z.travaux && z.travaux.fin >= T && BATIMENTS[z.travaux.batiment]) route.push([z.travaux.fin, `🏗 ${BATIMENTS[z.travaux.batiment].nom} → niveau ${(z.batiments[z.travaux.batiment] || 0) + 1}`]);
  { const k = S.draft && S.draft.materiel && S.draft.materiel.acheter; if (k && ARMURERIE[k]) route.push([T, `${ARMURERIE[k].ico} ${esc(ARMURERIE[k].nom)} livrés à l’armurerie`]); }
  if (!arrive.length && !route.length) return '';
  route.sort((a, b) => a[0] - b[0]);
  return `<section class="card sd" aria-label="Tes décisions d’un soir à l’autre">
    <span class="kicker">Tes décisions, d’un soir à l’autre</span>
    <ul class="sd-liste">${arrive.join('')}${route.map(([t, l]) => `<li class="sd-l"><span class="sd-q">${dans(t)}</span><span>${l}</span></li>`).join('')}</ul>
  </section>`;
}

/** Une tuile de grande décision (touchée : elle devient la décision du soir). */
function tuileDecision(z, T, d, dec, titre, detail0, cout, extra = '') {
  const choisi = (x) => JSON.stringify(d.decision) === JSON.stringify(x);
  let detail = detail0;
  const refus = decisionImpossible(z, dec, T);
  const te = tourEffet(dec, T);
  const trop = te !== null && te > SEASON_LENGTH;
  if (trop && !refus) detail = `⚠ effet au tour ${te} : après la fin de saison, perdu`;
  return `<button type="button" class="dtuile ${trop ? 'tard' : ''}" data-action="decision" data-json='${esc(JSON.stringify(dec))}' aria-pressed="${choisi(dec)}" ${refus && !choisi(dec) ? 'disabled' : ''}>
    <span class="t">${titre}</span>${extra}<span class="d">${esc(refus || detail)}</span><span class="c">${cout} k€</span></button>`;
}

/** Tuiles d'achat de véhicules (grande décision « Équiper »), avec la reprise si le garage est plein. */
function vehiculesTuiles(z, T, d) {
  const tuile = (...a) => tuileDecision(z, T, d, ...a);
        // Garage plein : l'achat se fait avec reprise du véhicule le plus usé (il cède sa place au neuf).
        const plein = z.vehicules >= capaciteVehicules(z), rep = plein ? plusUse(z) : null;
        const nomRep = rep != null ? `${modeleDe(z.flotte[rep]).court.toLowerCase()} à ${Math.round(100 - z.flotte[rep].u)} %` : '';
        return `${plein ? `<p class="tiny muted" style="margin:0">Garage plein : achat <strong>avec reprise</strong> de ton véhicule le plus usé (${esc(nomRep)}, ${fmt1(prixRevente(z, rep))} k€ déduits). Pour en avoir plus, agrandis le garage (Bâtir).</p>` : ''}
      <div class="dgrille">${IDS_MODELES.map((m) => { const M = MODELES[m], dec = { type: 'equiper', cible: 'vehicule', modele: m, ...(plein ? { reprise: rep } : {}) }; return tuile(dec, `${vehiculeSvg(M.type, 34)}${M.nom}`, `${M.role} · ${fmt1(M.places)} places · ${String(M.entretien).replace('.', ',')} k€/tour`, fmt1(coutDecision(z, dec))); }).join('')}</div>
      ${comparatifModeles(z)}`;
}
/** Tuile « Préparer les combis » (grande décision « Équiper »), tant que le niveau maximum n'est pas atteint. */
function prepaTuile(z, T, d) {
  const tuile = (...a) => tuileDecision(z, T, d, ...a);
  return (z.prepa || 0) < PREPA.max ? tuile({ type: 'equiper', cible: 'prepa' }, 'Préparer les combis', `niveau ${z.prepa || 0} → ${(z.prepa || 0) + 1} · urgences : +${Math.round(PREPA.vitesse * 100)} % de vitesse, freinage +${Math.round(PREPA.frein * 100)} %`, coutPrepa(z.prepa), niv(z.prepa || 0, PREPA.max)) : '';
}
/** Achat d'un véhicule et préparation des combis, depuis le Parc automobile : la même grande décision que dans les Ordres. */
export function achatVehiculeHtml(z, T, d) {
  const dv = d.decision && d.decision.type === 'equiper' && (d.decision.cible === 'vehicule' || d.decision.cible === 'prepa') ? d.decision : null;
  const autre = d.decision && !dv;
  return `<div class="col" style="gap:8px">
    <span class="tiny ${autre ? 'warn' : 'muted'}">${autre ? `Ta grande décision de ce soir est déjà « ${esc(decisionLabel(z, d.decision))} » : choisir un véhicule la remplace (une seule par soir).` : 'Acheter ou préparer les combis, c’est la grande décision du soir (une seule par soir), payée à 20:00.'}</span>
    ${vehiculesTuiles(z, T, d)}
    <div class="dgrille">${prepaTuile(z, T, d)}</div>
    ${dv ? `<div class="ddetail">${detailDecision(z, dv, T)}</div>` : ''}
  </div>`;
}

/** Sélecteur de grande décision : quatre catégories, des tuiles compactes. */
function decisionPicker(z, T, d) {
  const cat = S.decCat || catDe(d.decision) || 'recruter';
  const tuile = (...a) => tuileDecision(z, T, d, ...a);
  const pc = (x) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)} %`;
  const ent = (v) => `${fmt1(v)} k€`;
  let corps = '';
  if (cat === 'recruter') {
    const ac = academieResume(z, T);
    corps = `${ac ? `<p class="tiny warn" style="margin:0 0 4px">🎓 Déjà en route : ${ac.n} recrue${ac.n > 1 ? 's' : ''} (${ac.texte}).</p>` : ''}<div class="dgrille trois">${[1, 2, 3].map((n) => tuile({ type: 'recruter', n }, `+${n} agent${n > 1 ? 's' : ''}`, `au tour ${T + DELAI_ACADEMIE} · +${fmt1(n * ECONOMIE.salaire)} k€/tour de salaire`, fmt1(coutRecrue(z) * n))).join('')}</div>${coutRecrue(z) !== COUTS.recrue ? `<p class="tiny ${coutRecrue(z) < COUTS.recrue ? 'ok' : 'bad'}" style="margin:0">Réputation ${Math.round(z.reputation)} : une recrue te coûte ${fmt1(coutRecrue(z))} k€ au lieu de ${COUTS.recrue} k€.</p>` : ''}`;
  } else if (cat === 'former') {
    corps = `<p class="tiny muted" style="margin:0"><strong>Former</strong> = le long terme : +20 % d’efficacité par niveau, <strong>gardé d’une saison à l’autre</strong> (un niveau de moins). Coûte peu, mais 2 agents sont absents pendant la formation. <strong>Équiper</strong>, à côté, c’est le coup de pouce immédiat, perdu en fin de saison.</p>
      <div class="dgrille">${SERVICES.map((sv) => tuile({ type: 'former', service: sv }, SERVICE_LABELS[sv], `niveau ${z.niveaux[sv]} → ${z.niveaux[sv] + 1} · efficacité ${pc(multNiveau(z.niveaux[sv] + 1) / multNiveau(z.niveaux[sv]) - 1)}${agentsFormation(z, sv) ? '' : ' · au stand de tir'}`, coutFormation(z, sv), niv(z.niveaux[sv]))).join('')}</div>`;
  } else if (cat === 'equiper') {
    corps = `<p class="tiny muted" style="margin:0"><strong>Équiper</strong> = le coup de pouce immédiat : +${Math.round(EQUIP.efficacite * 100)} % d’efficacité et un effet propre au service, sans agent absent, mais <strong>perdu en fin de saison</strong>. <strong>Former</strong> (+20 %) est plus fort et se garde d’une saison à l’autre.</p>
      <p class="tiny muted" style="margin:0">🚓 <strong>Véhicules</strong> (garage : ${z.vehicules} sur ${capaciteVehicules(z)} places). Les places vont d’abord à l’Intervention ; chaque place libre met un agent de Roulage ou de Proximité en voiture (+${Math.round(RENDEMENT.monte * 100)} %). Chaque modèle a en plus son rôle. Revends les vieux depuis le parc (HP › Véhicules).</p>
      ${vehiculesTuiles(z, T, d)}
      <div class="dgrille">
      ${SERVICES.map((sv) => tuile({ type: 'equiper', cible: sv }, SERVICE_LABELS[sv], `matériel ${z.equip[sv]} → ${z.equip[sv] + 1} · ${effetEquip(sv, 1)} · efficacité ${pc(multEquip(z.equip[sv] + 1) / multEquip(z.equip[sv]) - 1)}`, coutEquipement(z.equip[sv]), niv(z.equip[sv]))).join('')}
      ${prepaTuile(z, T, d)}</div>`;
  } else {
    const faites = Object.entries(INFRAS).filter(([id]) => z.infra[id]).map(([, i]) => i);
    corps = `<div class="dgrille">${Object.entries(BATIMENTS).map(([id, B]) => { const n = z.batiments[id]; return n >= BATIMENT_MAX ? '' : tuile({ type: 'agrandir', batiment: id }, `Agrandir : ${B.nom}`, `${B.capacite(n)} → ${B.capacite(n + 1)} ${B.unite} · entretien ${ent(B.entretien(n))} → ${ent(B.entretien(n + 1))}/tour · ⏱ ${TRAVAUX_TOURS === 1 ? 'prêt demain soir' : `prêt dans ${TRAVAUX_TOURS} tours`}`, B.coutAgrandir(n), niv(n, BATIMENT_MAX)); }).join('')}
      ${Object.entries(INFRAS).filter(([id]) => !z.infra[id]).map(([id, inf]) => tuile({ type: 'construire', infra: id }, inf.nom, `${inf.effet} · entretien ${ent(ENTRETIEN_ANNEXE)}/tour · ⏱ en service ce soir`, inf.cout)).join('')}</div>
      ${emplacementsHtml(z, d)}
      ${faites.length ? `<div class="col" style="gap:3px"><span class="tiny muted">Déjà construit :</span>${faites.map((i) => `<span class="tiny"><strong>${esc(i.nom)}</strong> <span class="muted">· ${esc(i.effet)}</span></span>`).join('')}</div>` : ''}`;
  }
  const det = d.decision && catDe(d.decision) === cat ? detailDecision(z, d.decision, T) : '';
  corps += det ? `<div class="ddetail">${det}</div>` : '';
  return `<div class="col" style="gap:10px">
    <div class="between dchoix"><span class="col" style="gap:1px"><span class="tiny muted">Ta grande décision de ce soir</span><strong>${esc(d.decision || d.sansDecision ? decisionLabel(z, d.decision) : 'Pas encore choisie')}${d.decision ? ` · ${coutDecision(z, d.decision)} k€` : ''}</strong></span>
      ${d.decision || !d.sansDecision ? `<button type="button" class="btn small ghost" data-action="decision" data-json="null" data-aucune="1">${d.decision ? 'Aucune' : 'Aucune ce soir'}</button>` : ''}</div>
    <div class="segn" role="tablist" aria-label="Type de décision" style="grid-template-columns:repeat(4,minmax(0,1fr))">${DEC_CATS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${cat === k}" data-action="dec-cat" data-v="${k}">${l}${catDe(d.decision) === k ? ' ●' : ''}</button>`).join('')}</div>
    ${corps}
    ${avertBudget(z, d)}
    ${formationsEnCours(z, T)}
    <details class="dec-aide"><summary>? Comment ça marche</summary><p class="tiny muted" style="margin:0">Touche une option : le détail de ce qu’elle change pour ta zone s’affiche. Une seule grande décision par tour, payée à 20:00 si le budget le permet (${fmt1(z.budget)} k€ aujourd’hui). Elle passe <strong>après</strong> les dépenses du jour et les démarches d’enquête.</p></details>
  </div>`;
}

/** Panneau « Où sont mes agents ? » : le compte complet, et de quoi rapatrier. */
function ventilationHtml(z, e) {
  const st = S.state, d = S.draft, T = st.turn;
  const ligne = (t, n, cls = '', extra = '') => `<div class="between vent-l ${cls}"><span class="small">${t}</span><span class="row" style="gap:8px">${extra}<span class="mono small" style="min-width:28px;text-align:right">${n}</span></span></div>`;
  const signe = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
  const recus = (z.renforts || []).filter((r) => r.debut <= T && r.retour > T).reduce((s, r) => s + r.n, 0);
  const actifs = (z.blesses || []).filter((b) => b.retour > T);
  const pretes = actifs.filter((b) => b.motif === 'prêté').reduce((s, b) => s + b.n, 0);
  const blesses = actifs.filter((b) => b.motif !== 'prêté').reduce((s, b) => s + b.n, 0);
  const fo = enFormation(z, T);
  const academie = (z.academie || []).reduce((s, a) => s + a.n, 0);
  const hors = agentsHorsServices();
  const btnRap = (k) => `<button type="button" class="btn small ghost" data-action="rapatrier" data-k="${esc(k)}">Rapatrier</button>`;
  const services = SERVICES.reduce((s, k) => s + d.alloc[k], 0);
  const prises = [];
  for (const [s, l] of Object.entries(e.prises || {})) for (const [n, m] of l) if (m !== 'l’opération') prises.push([`${m} (pris en ${SERVICE_LABELS[s]}, faute d’agents libres)`, n]);
  const opPris = Object.values(e.opx.pris || {}).reduce((s, v) => s + v, 0); if (opPris) prises.push(['Opération d’envergure (dans les services)', opPris]);
  const bloques = hors.filter((h) => h.bloque);
  return `<div class="vent col">
    <span class="tiny muted" style="font-weight:700">Effectif</span>
    ${ligne('Agents de la zone', z.agents)}
    ${recus ? ligne('Renforts reçus d’autres zones', signe(recus), 'ok') : ''}
    ${blesses ? ligne('Blessés', signe(-blesses), 'bad') : ''}
    ${pretes ? ligne('Prêtés à une autre zone (entraide)', signe(-pretes), 'warn') : ''}
    ${fo ? ligne('En formation', signe(-fo), 'warn') : ''}
    ${z.absents ? ligne('En congé maladie (moral bas)', signe(-z.absents), 'bad') : ''}
    ${ligne('<strong>Disponibles ce soir</strong>', `<strong>${e.dispo}</strong>`, 'tot')}
    <span class="tiny muted" style="font-weight:700;margin-top:6px">Où ils sont</span>
    ${ligne('Dans les cinq services', services)}
    ${missionsEnquete(d).map((m) => ligne(esc(m.t), m.n, 'warn')).join('')}
    ${hors.map((h) => ligne(`${h.t}${h.bloque ? ` <span class="tiny bad">· ${esc(h.bloque)}</span>` : ''}`, h.compte === false ? `(${h.n})` : h.n, h.bloque ? 'bad' : '', btnRap(h.k))).join('')}
    ${ligne(e.reste >= 0 ? '<strong>Sans affectation</strong>' : e.resteBase >= 0 ? '<strong>Manquent pour les missions</strong>' : '<strong>De trop</strong>', `<strong>${Math.abs(e.reste)}</strong>`, `tot ${e.reste > 0 ? 'warn' : e.reste < 0 ? 'bad' : 'ok'}`)}
    ${prises.length ? `<span class="tiny warn" style="margin-top:4px">Pris dans tes services pour la journée : ${prises.map(([t, n]) => `${t} ${n}`).join(' · ')}. Enlève des agents d’un service pour les laisser libres, sinon ces services tourneront avec moins de monde.</span>` : ''}
    ${academie ? `<span class="tiny muted">À l’académie : ${academie} recrue${academie > 1 ? 's' : ''}, pas encore disponible${academie > 1 ? 's' : ''} (${(academieResume(z, S.state.turn) || {}).texte || "bientôt"}).</span>` : ''}
    ${bloques.length ? `<p class="tiny bad" style="margin:2px 0 0">Des agents sont bloqués : rapatrie-les pour les réaffecter.</p>` : ''}
    <div class="row" style="gap:8px;margin-top:4px;flex-wrap:wrap">
      ${hors.length ? '<button type="button" class="btn small grow" data-action="rapatrier" data-k="tout">Tout rapatrier</button>' : ''}
      ${e.reste > 0 ? `<button type="button" class="btn small primary grow" data-action="repartir">${e.reste > 1 ? `Répartir les ${e.reste} libres` : 'Répartir l’agent libre'}</button>` : ''}
    </div>
  </div>`;
}

/** Ce que rapporte vraiment un agent de Roulage aujourd'hui, facteur par facteur. */
function amendeParAgentTxt(z) {
  const T = S.state.turn, rythme = (S.draft && S.draft.rythme) || 'normal';
  const n = (S.draft && S.draft.alloc && S.draft.alloc.roulage) || 0;
  const x = (v) => `×${String(Math.round(v * 100) / 100).replace('.', ',')}`;
  const facteurs = [
    `niveau ${z.niveaux.roulage} ${x(multNiveau(z.niveaux.roulage))}`,
    `matériel ${z.equip.roulage} ${x(multEquip(z.equip.roulage))}`,
    `moral ${Math.round(z.moral)} ${x(moralMult(z.moral))}`,
  ];
  if (RYTHMES[rythme].mult !== 1) facteurs.push(`rythme ${RYTHMES[rythme].label.toLowerCase()} ${x(RYTHMES[rythme].mult)}`);
  if (z.infra && z.infra.anpr) facteurs.push('caméras ×1,2');
  { const m = multSpe(z, 'roulage'); if (m !== 1) facteurs.push(`spécialité ${x(m)}`); }
  const un = capacite(z, 'roulage', 1, { rythme, turn: T }) * ECONOMIE.amendeParCapacite;
  const alloc = (S.draft && S.draft.alloc) || {};
  const tous = n ? capacite(z, 'roulage', n, { rythme, turn: T, alloc }) * ECONOMIE.amendeParCapacite : 0;
  const mt = agentsMontes(z, alloc, T, rythme).roulage;
  return `Rapporte ${fmt1(ECONOMIE.amendeParCapacite)} k€ par unité de capacité. Aujourd’hui, un agent vaut ${fmt1(ECONOMIE.amendeParCapacite)} × ${facteurs.join(' × ')} = ${String(Math.round(un * 100) / 100).replace('.', ',')} k€ par jour, +${Math.round(RENDEMENT.monte * 100)} % s’il a une place dans un véhicule${n ? ` ; tes ${n} agents (${mt >= n ? 'tous en voiture' : mt > 0 ? `${fmt1(mt)} en voiture` : 'à pied : plus de place après l’Intervention'}) : ${fmt1(tous)} k€` : ''}. Le moral compte : à 60, il retire 4 % ; à 100, il ajoute 20 %.`;
}

/**
 * Dossiers locaux sous la ligne Recherche : les plus vieux sont traités en premier ;
 * dès 5 jours on prévient (au-delà de 6, chaque dossier coûte de la satisfaction chaque soir).
 */
/**
 * Ce que deviendront les dossiers ce soir, avec la capacité Recherche estimée : les plus vieux sont traités
 * d'abord (comme au calcul de 20:00). Le dossier qui arrive ce soir (taille inconnue, environ 6) passe en dernier.
 */
function projeterDossiers(z, capRech) {
  let travail = Math.max(0, capRech || 0);
  // Dossiers à l'ancienne taille : ramenés aux deux tiers au calcul de 20:00 (même règle qu'au moteur).
  const ancien = (z.dossiersV || 1) < DOSSIER.version;
  const dossiers = (z.dossiers || []).map((d) => { const tot = d.total || d.reste; return ancien && tot > DOSSIER.tailleMax ? { ...d, reste: Math.round(d.reste * DOSSIER.tailleMax / tot * 10) / 10, total: DOSSIER.tailleMax } : d; });
  const lignes = dossiers.slice().sort((a, b) => b.age - a.age).map((d) => {
    const fait = Math.min(travail, d.reste); travail -= fait;
    const reste = Math.round((d.reste - fait) * 10) / 10;
    return { d, fait, reste, boucle: reste <= 0.05 };
  });
  const moyNouveau = (DOSSIER.tailleMin + DOSSIER.tailleMax) / 2;
  const nouveauBoucle = travail >= moyNouveau;
  const restants = lignes.filter((l) => !l.boucle).length + (nouveauBoucle ? 0 : 1);
  return { lignes, boucles: lignes.filter((l) => l.boucle).length, restants, surplus: travail };
}

/**
 * Dossiers locaux sous la ligne Recherche : pour chacun, son âge, ce qui est déjà fait, ce que tes enquêteurs
 * feront ce soir, et s'il sera bouclé ; puis le nombre de dossiers qu'il restera après 20:00.
 */
function dossiersHtml(z, e) {
  const p = projeterDossiers(z, ((e.cap && e.cap.recherche) || 0) + (S.draft && S.draft.depenses && S.draft.depenses.enqueteurs ? DEPENSES.enqueteurs.unites : 0));
  if (!p.lignes.length) return '<span class="tiny muted">Aucun dossier en cours : le dossier du soir sera entamé à 20:00.</span>';
  const n = S.draft.alloc.recherche || 0;
  const ligne = (l) => {
    const d = l.d, tot = d.total || d.reste;
    const deja = Math.max(0, (tot - d.reste) / tot) * 100, soir = (l.fait / tot) * 100;
    const ageSoir = d.age + 1, retard = !l.boucle && ageSoir > 6, bientot = !l.boucle && ageSoir >= 5;
    const val = valeurDossier(d.age);
    return `<div class="dos ${retard ? 'bad' : bientot ? 'warn' : ''}">
      <div class="between" style="gap:8px"><span class="dos-t"><span class="dos-age">J${d.age}</span>${esc(d.titre)}${val < 1 ? ` <span class="tiny warn" title="Un dossier qui traîne rapporte moins de points">· vaut ${Math.round(val * 100)} %</span>` : ''}</span>
        <span class="dos-f ${l.boucle ? 'ok' : retard ? 'bad' : ''}">${l.boucle ? '✓ bouclé ce soir' : `reste ${Math.round((l.reste / tot) * 100)} %`}</span></div>
      <div class="dos-bar" aria-hidden="true"><i class="deja" style="width:${deja}%"></i><i class="soir" style="width:${soir}%"></i></div>
      ${retard ? '<span class="tiny bad">pas bouclé : il coûtera de la satisfaction chaque soir</span>' : bientot ? `<span class="tiny warn">pas bouclé ce soir : J${ageSoir} demain, en retard après J6</span>` : ''}
    </div>`;
  };
  const capR = (e.cap && e.cap.recherche) || 0, hs = S.draft && S.draft.depenses && S.draft.depenses.enqueteurs ? DEPENSES.enqueteurs.unites : 0;
  const mm = moralMult(z.moral);
  const travailSoir = n ? `<div class="between small" style="gap:8px"><span>Ce soir : <strong>${n} enquêteur${n > 1 ? 's' : ''} → ${fmt1(capR)} unité${capR >= 2 ? 's' : ''}</strong>${hs ? ` <span class="ok">+${hs} heures sup’</span>` : ''}</span><span class="tiny muted">un dossier : ${DOSSIER.tailleMin} à ${DOSSIER.tailleMax}</span></div>
    ${capR < n * 0.95 ? `<span class="tiny warn">Moins d’une unité par agent : moral ${Math.round(z.moral)} (efficacité ${Math.round(mm * 100)} %)${(e.enquete || 0) ? ', enquêteurs en audition' : ''}.</span>` : ''}` : '';
  return `${travailSoir}<div class="dossiers">${p.lignes.map(ligne).join('')}</div>
    <span class="tiny muted">${n ? 'Gris : déjà fait · bleu : ce soir, les plus vieux d’abord.' : 'Personne en Recherche : aucun dossier n’avancera ce soir.'} Le dossier du soir est compté.</span>`;
}

/** Aide courte de chaque service, avec la situation actuelle de la zone. */
function aide(s, z) {
  const f = (v) => fmt1(v);
  switch (s) {
    case 'intervention': return `Traite les incidents du jour (environ 1 agent par incident, ${Math.max(1, Math.round(1.5 + z.criminalite / 14))} attendus). Incident traité : +0,5 de satisfaction ; raté : −1,8. Au-delà de 2,5 agents par véhicule, les agents en trop comptent pour moitié. Chaque intervention use les véhicules : état du parc ${Math.round(100 - z.usure)} %${malusEtat(100 - z.usure) < 1 ? ` (efficacité −${Math.round((1 - malusEtat(100 - z.usure)) * 100)} %)` : ''} ; sous 80 %, l’Intervention perd de l’efficacité. Une révision du parc (dépense du jour, 2 k€) rend +20 %. Les patrouilles qui restent libres après les incidents remplissent la jauge de flagrant délit (${Math.round((z.jaugeFlagrant || 0) * 100)} % aujourd’hui ; +10 % par unité de marge, 40 % au plus par jour) : à 100 %, flagrant délit (+3 pts de résultats, PS et un quartier apaisé).`;
    case 'proximite': return `Prévention : fait baisser la criminalité (actuellement ${Math.round(z.criminalite)}). Environ 4 agents la stabilisent. Au-dessus de 55, un quartier coûte de la satisfaction chaque jour, et la criminalité augmente les incidents. Tu peux envoyer ces agents en patrouille dans des quartiers précis depuis la Carte.`;
    case 'recherche': return `Fait avancer tes dossiers locaux (${z.dossiers.length} en cours). Chaque unité de travail sur un dossier rapporte +${String(DOSSIER.ptsParUnite).replace('.', ',')} pt de résultats le jour même (un dossier fait ${DOSSIER.tailleMin} à ${DOSSIER.tailleMax} unités ; un agent fait environ 1 unité à 67 de moral, moins si le moral est bas ou si des enquêteurs partent en audition : le chiffre exact du soir est affiché sous tes dossiers) ; dossier élucidé : +2 de satisfaction. Un nouveau dossier arrive chaque jour. Tes enquêteurs traitent toujours les dossiers les plus vieux en premier ; un dossier de plus de 6 jours coûte de la satisfaction chaque jour (signalé dès 5 jours). Au-delà de 2 agents, tes enquêteurs font aussi l’enquête de voisinage : chaque soir, une chance de rapporter des pièces pour l’enquête de la semaine (bien plus avec une piste prioritaire, à choisir dans l’Enquête).`;
    case 'roulage': return `${amendeParAgentTxt(z)} Au-delà de ${ROULAGE.seuil} agents, chaque agent de plus compte pour moitié. Au-delà de ${Math.round(seuilChasse(z) * 100)} % de tes effectifs : « chasse aux PV », −2 de satisfaction par jour.`;
    case 'admin': return `Traite la paperasse (environ 1 dossier par agent ; ${f(z.paperasse)} en attente). Au-delà de 14 : −2 de moral par jour. Au-delà de 20 : Inspection générale, 5 k€ d’amende. C’est aussi ton assurance : chaque agent au-delà de 2 évite 15 % des tracas internes (panne, dégât des eaux, grève, papiers égarés, plainte…), jusqu’à 60 %. Aujourd’hui : ${Math.round(Math.min(0.6, Math.max(0, ((S.draft && S.draft.alloc.admin) || 0) - 2) * 0.15) * 100)} %.`;
    default: return '';
  }
}

function prisesHtml() {
  const d = S.draft, z = myZone(), l = [];
  if (d.traque && d.traque.agents) l.push(`${d.traque.agents} agent${d.traque.agents > 1 ? 's' : ''} d’Intervention partent en traque`);
  if (auditionDuJour()) l.push('2 agents de Recherche passent la journée sur l’audition de la victime');
  const fo = d.decision && d.decision.type === 'former' && agentsFormation(z, d.decision.service) ? `<p class="small muted" style="margin:0">Formation choisie : ${agentsFormation(z, d.decision.service)} agents seront absents demain (${DUREE_FORMATION} tour), ils sortiront alors du total disponible.</p>` : '';
  return (l.length ? `<p class="small warn" style="margin:0">Enquête : ${l.join(' ; ')}. Ils sont retirés du total à répartir ; s’il ne reste pas assez d’agents libres, ils sont pris dans le service indiqué.</p>` : '') + fo;
}

export function situationHtml(z) {
  const pressions = pressionsVisibles(S.state, z);
  if (!pressions.length) return '';
  const corps = pressions.map((p) => `<div class="col" style="gap:1px"><span style="font-weight:600;font-size:14px">${esc(p.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(p.texte)}</span></div>`).join('');
  if (S.route !== 'ordres') return `<section class="card amber" aria-label="Situation du jour" style="gap:6px"><span class="kicker">Situation du jour</span>${corps}</section>`;
  // Dans les Ordres : repliée sur une ligne une fois les ordres validés.
  return `<details class="card amber pli-ordres" data-k="ord-situ" aria-label="Situation du jour" ${ouvertOrdres('ord-situ') ? 'open' : ''}>
    <summary><span class="col grow" style="gap:1px;min-width:0"><span class="kicker">Situation du jour</span><span class="pli-resume">${pressions.map((p) => esc(p.titre)).join(' · ')}</span></span>${icon('chevron', 16)}</summary>
    <div class="col" style="gap:6px">${corps}</div></details>`;
}

/** Cartes des Ordres qui se replient une fois les ordres validés (sauf si le joueur les a rouvertes). */
function ouvertOrdres(k, forcer = false) {
  if (forcer) return true;
  if (S.ouverts && k in S.ouverts) return S.ouverts[k];
  return !(S.savedOrders && !S.ordersDirty);
}

/** Une ligne repliable de la carte « Ce soir aussi » (même arguments que `pli`, plus une pastille). */
function pliItem(key, titre, resume, contenu, alerte = false, pastille = null) { return { key, titre, resume, contenu, alerte, pastille }; }
/** Les sections repliables regroupées dans une seule carte, une ligne chacune. */
const ICO_PLI = { nondroit: 'mur', decision: 'star', depenses: 'euro', reserve: 'renfort' };
/** Titres courts des tuiles (le titre complet reste dans le panneau ouvert). */
const COURT_PLI = { nondroit: 'Non-droit', decision: 'Décision', depenses: 'Dépenses', reserve: 'Réserve' };
/** Teinte de chaque tuile (icône et liseré). */
const TEINTE_PLI = { nondroit: '#FF8A65', decision: '#FFD166', depenses: '#7BD3C8', reserve: '#9DB4FF' };
/** Résumé de tuile : sans emoji (l'icône suffit), et « vide » si rien n'est engagé ce soir. */
const sansEmoji = (s) => String(s).replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
const resumeVide = (s) => /^(aucun|aucune|pas encore)\b/i.test(sansEmoji(s).replace(/<[^>]+>/g, ''));
function pliGroupe(items) {
  {
    // Saison 2 : une tuile par sujet ; celle qu'on touche s'ouvre en dessous, sur toute la largeur.
    const l = items.filter(Boolean);
    if (!l.length) return '';
    const ouv = l.find((x) => S.ordOpen && S.ordOpen[x.key]);
    const ico = (k, t = 18) => `<span class="ord-t-i" style="--t:${TEINTE_PLI[k] || 'var(--amber)'}" aria-hidden="true">${icon(ICO_PLI[k] || 'star', t)}</span>`;
    const estVide = (x) => !(x.pastille || x.alerte) && resumeVide(x.resume) && !(ouv && ouv.key === x.key);
    const vides = l.filter(estVide), pleins = l.filter((x) => !estVide(x));
    const ligneVides = vides.length ? `<div class="ord-vides"><span class="tiny muted">Rien ce soir :</span>${vides.map((x) => `<button type="button" class="chip" data-action="ord-open" data-k="${x.key}" aria-expanded="false">${esc(COURT_PLI[x.key] || x.titre)}</button>`).join('')}</div>` : '';
    return `<section class="ord-tuiles" aria-label="Ce soir aussi"><h2 class="section" style="margin:0">Ce soir aussi</h2>
      ${pleins.length ? `<div class="ord-grille${pleins.length % 2 ? ' impair' : ''}">${pleins.map((x) => { const chip = x.pastille || (x.alerte ? 'à voir' : ''); const on = ouv && ouv.key === x.key;
        const r = sansEmoji(x.resume), vide = !chip && resumeVide(x.resume);
        return `<button type="button" class="ord-tuile ${on ? 'on' : ''} ${chip ? 'alerte' : ''} ${vide ? 'vide' : ''}" style="--t:${TEINTE_PLI[x.key] || 'var(--amber)'}" data-action="ord-open" data-k="${x.key}" aria-expanded="${on}"${chip ? ` title="${esc(chip)}"` : ''}>
          ${ico(x.key)}<span class="ord-t-txt"><span class="ord-t-n"><span>${esc(COURT_PLI[x.key] || x.titre)}</span></span><span class="ord-t-r">${r}</span>${chip ? `<span class="sr-only"> (${esc(chip)})</span>` : ''}</span></button>`; }).join('')}</div>` : ''}
      ${ligneVides}
      ${ouv ? `<div class="card ord-ouvert" id="ord-${ouv.key}" style="--t:${TEINTE_PLI[ouv.key] || 'var(--amber)'}"><div class="between"><span class="row" style="gap:10px;align-items:center">${ico(ouv.key)}<b>${esc(ouv.titre)}</b></span><button type="button" class="iconbtn" data-action="ord-open" data-k="${ouv.key}" aria-label="Fermer" style="width:32px;height:32px">✕</button></div>${ouv.contenu}</div>` : ''}
    </section>`;
  }
}


// Prise en main : un nouveau chef de zone découvre les ordres par étapes (les zones arrivées avant cette règle gardent tout).
const OUVERTURE_DEPUIS = Date.parse('2026-10-09T00:00:00Z');
const PALIERS_ORDRES = [['depenses', 3, 'Dépenses du jour'], ['nondroit', 5, 'Zone de non-droit']];
export function ouvertureOrdres(z) {
  const jour = ((z && z.toursJoues) || 0) + 1;
  const ancien = !z || !(z.arrivee > OUVERTURE_DEPUIS);
  const out = { jour, nouveau: [] };
  for (const [k, j, nom] of PALIERS_ORDRES) { out[k] = ancien || jour >= j; if (!ancien && jour === j) out.nouveau.push(nom); }
  out.prochain = ancien ? null : PALIERS_ORDRES.find(([, j]) => jour < j) || null;
  return out;
}
/** Une barre de jauge : seule la barre est visible ; un toucher déplie ce qui la remplit et ce qu'elle rapporte. */
function barreJauge(ico, nom, v, remplit, gain, cls = '') {
  const p = Math.max(0, Math.min(100, Math.round((v || 0) * 100)));
  return `<details class="jg-d${cls}"><summary class="jg-i"><span class="jg-n">${ico} ${esc(nom)}</span><i class="jg-b"><b style="width:${p}%"></b></i><span class="jg-v">${p} %</span></summary>
    <p class="jg-x"><span>Se remplit : ${esc(remplit)}.</span> <span>À 100 % : ${esc(gain)}.</span> <a href="#guide-specialite">Guide</a></p></details>`;
}
/** Spécialité au palier 3 : sa jauge, et le service qui la remplit. */
function jaugeSpeDe(z) {
  const id = z.specialite && z.specialite.id;
  return id && SPECIALITES[id] && palierSpe(z) >= 3 ? SPECIALITES[id] : null;
}
/** Jauges sous un service : flagrant délit sous l'Intervention, et la jauge de la spécialité sous son service. */
function jaugesService(z, s2) {
  const l = [];
  if (s2 === 'intervention') l.push(barreJauge('🚨', 'Flagrant délit', z.jaugeFlagrant, 'tes patrouilles d’Intervention libres après les incidents du soir', '+3 points, +3 PS, +1 de satisfaction, tension d’un quartier chaud −5'));
  const Sp = jaugeSpeDe(z);
  if (Sp && Sp.service === s2) l.push(barreJauge(Sp.jauge.ico, Sp.jauge.nom, z.jaugeSpe, Sp.jauge.remplit, Sp.jauge.gain, ' jg-doc'));
  return l.length ? `<div class="jg-inter">${l.join('')}</div>` : '';
}

/** Une partie des Ordres : en-tête numéroté (résumé toujours visible), corps déplié à la demande. */
function partieOrdres(k, n, titre, resume, etat, corps, { aria = titre, cls = '', defaut = null, pied = '' } = {}) {
  const force = S.ordParts && k in S.ordParts ? S.ordParts[k] : null;
  const ouvert = force != null ? force : !!(S.ordOpen && S.ordOpen[k]) || (defaut != null ? defaut : k === 'affect');
  return `<section class="card op-part ${cls} ${etat} ${ouvert ? 'ouvert' : ''}" id="ord-${k}" aria-label="${esc(aria)}">
    <button type="button" class="op-h" data-action="op-part" data-k="${k}" aria-expanded="${ouvert}"><span class="op-n">${etat === 'ok' ? icon('check', 13) : n}</span><span class="op-t"><b>${esc(titre)}</b><span>${resume}</span></span>${icon('chevron', 16)}</button>
    ${ouvert ? `<div class="op-c">${corps()}</div>` : pied}</section>`;
}
const COURT_SVC = { intervention: 'Int', proximite: 'Prox', recherche: 'Rech', roulage: 'Roul', admin: 'Acc' };
/** Résumé de l'affectation : ce qui manque, sinon la répartition en une ligne. */
function resumeAffect(z, e) {
  const bs = besoinsServices(e), d = S.draft;
  const courts = SERVICES.filter((s2) => bs[s2] && (bs[s2].st === 'manque' || bs[s2].st === 'juste'));
  if (e.reste > 0) return `${e.reste} agent${e.reste > 1 ? 's' : ''} libre${e.reste > 1 ? 's' : ''} à placer`;
  if (courts.length) return `court : ${courts.map((s2) => (s2 === 'admin' ? 'Accueil' : SERVICE_LABELS[s2])).join(', ')}`;
  return SERVICES.map((s2) => `${COURT_SVC[s2]} ${d.alloc[s2]}`).join(' · ');
}
/** L'Affectation s'ouvre repliée quand il n'y a rien à régler, ou seulement des agents libres à placer (un toucher suffit). */
function replierAffect(e, z) {
  if ((z.toursJoues || 0) < 1 || S.tuto != null || e.reste < 0) return false; // dès le 2e soir joué (la 1re fois, on découvre l’Affectation)
  const bs = besoinsServices(e);
  return !SERVICES.some((s2) => bs[s2] && bs[s2].st === 'manque');
}
/** Agents libres : les placer d'un toucher, sans rouvrir toute l'Affectation. Le service qui manque le plus vient en premier. */
function placerLibresHtml(e) {
  const bs = besoinsServices(e);
  const rang = { manque: 0, juste: 1 };
  const cibles = [...SERVICES.filter((s2) => bs[s2] && bs[s2].st in rang).sort((a, b) => rang[bs[a].st] - rang[bs[b].st]), 'intervention', 'proximite'].filter((v, i, t) => t.indexOf(v) === i).slice(0, 3);
  return `<div class="op-libres"><span class="small warn" style="font-weight:600">${e.reste} agent${e.reste > 1 ? 's' : ''} libre${e.reste > 1 ? 's' : ''} :</span>${cibles.map((s2) => `<button type="button" class="chip" data-action="alloc-libre" data-s="${s2}">+ ${s2 === 'admin' ? 'Accueil' : SERVICE_LABELS[s2]}</button>`).join('')}</div>`;
}
export function etatAffect(e) {
  const bs = besoinsServices(e);
  return e.reste !== 0 || SERVICES.some((s2) => bs[s2] && (bs[s2].st === 'manque' || bs[s2].st === 'juste')) ? 'am' : 'ok';
}

export function renderOrdres() {
  const z = myZone(), st = S.state, d = S.draft, T = st.turn;
  const e = estimations();
  const bl = blessesActifs(z, T), fo = enFormation(z, T);
  const saved = !!S.savedOrders && !S.ordersDirty;
  const dep = d.depenses || {};
  const cab = (z.cabosses || []).length;
  const depKeys = [...(cab ? ['carrosserie'] : []), 'prime', 'prevention', 'soustraitance', 'enqueteurs', 'revision'];
  const nbDep = (dep.reserve ? 1 : 0) + depKeys.filter((k) => dep[k]).length;
  const maxDep = MAX_DEPENSES;

  const decisionHtml = decisionPicker(z, T, d);

  const depensesHtml = `<div class="col" style="gap:6px">
      <p class="tiny muted" style="margin:0">Agents de réserve : ${dep.reserve ? `<strong>${dep.reserve}</strong> en ${SERVICE_LABELS[dep.reserveService]} (${fmt1(dep.reserve * DEPENSES.reserve.cout)} k€)` : 'aucun'} · ${'ils se règlent dans leur tuile'}.</p>
    </div>
    ${`<p class="tiny ${nbDep >= maxDep ? 'warn' : 'muted'}" style="margin:0">${MAX_DEPENSES} dépenses par jour au plus (les agents de réserve comptent pour une, la carrosserie ne compte pas) : ${nbDep - (dep.carrosserie ? 1 : 0)} sur ${maxDep}.</p>`}
    <div class="col" style="gap:6px">${depKeys.map((k) => `
      <button type="button" class="choice" data-action="dep-toggle" data-k="${k}" aria-pressed="${!!dep[k]}" ${!dep[k] && k !== 'carrosserie' && nbDep - (dep.carrosserie ? 1 : 0) >= maxDep ? 'disabled' : ''} style="flex-direction:row;justify-content:space-between;text-align:left">
        <span class="col" style="gap:1px;align-items:flex-start"><span style="font-size:14px">${esc(DEPENSES[k].nom)}</span><span class="s">${esc(DEPENSES[k].texte)}${k === 'carrosserie' && Array.isArray(dep.carrosserie) && dep.carrosserie.length < cab ? ` · ${dep.carrosserie.length} sur ${cab} choisi${dep.carrosserie.length > 1 ? 's' : ''} depuis l’HP` : ''}${k === 'revision' ? ` · état actuel ${Math.round(100 - z.usure)} %${z.stats && z.stats.risqueAccident != null ? ` · risque d’accident hier ${fmt1(z.stats.risqueAccident)} %` : ''}` : ''}${k === 'carrosserie' ? ` · ${cab} véhicule${cab > 1 ? 's' : ''} cabossé${cab > 1 ? 's' : ''} : sans réparation, −${Math.min(3, cab)} de satisfaction et de réputation par tour` : ''}</span></span><span class="mono small">${fmt1(k === 'carrosserie' ? coutCarrosserie(z, dep.carrosserie || true) : k === 'prime' ? coutPrime(z, T) : DEPENSES[k].cout)} k€${k === 'prime' && coutPrime(z, T) > DEPENSES.prime.cout ? ' (déjà versée hier)' : ''}</span></button>`).join('')}
    </div>
    <p class="tiny muted" style="margin:0">Payées à 20:00 si le budget le permet (${fmt1(z.budget)} k€). Elles ne sont pas reconduites le lendemain.</p>`;

  return `<main class="screen">
    <header class="between" style="align-items:flex-start;gap:10px"><div class="col" style="gap:3px;min-width:0"><h1 class="big">Gestion · tour ${T}</h1>
      ${`<p class="sub">${e.dispo} agents${e.enquete ? ` · ${e.enquete} en mission` : ''}${bl || fo || z.absents ? ` · ${bl + fo + (z.absents || 0)} absent${bl + fo + (z.absents || 0) > 1 ? 's' : ''}` : ''} · secrets jusqu’à 20:00</p>`}</div>
      <span class="statut-ordres ${saved ? 'ok' : ''}">${saved ? `${icon('check', 13)} Validés` : S.savedOrders ? 'Modifiés' : 'Pas validés'}</span></header>

    ${`<section class="card ord-fiche" aria-label="Ce soir">
      <div id="prev-ipz" class="pv2" aria-live="polite">${previsionHtml()}</div></section>`}${(() => { setTimeout(suivrePrevision, 0); return ''; })()}
    ${saved ? ('')
      : !S.savedOrders && !S.ordersDirty && z.dernierOrdre ? `<button class="btn primary block" data-action="save-orders">Reprendre les ordres d’hier et valider</button>
        <p class="tiny muted" style="margin:-4px 0 0;text-align:center">Ou ajuste ci-dessous, puis valide.</p>` : ''}

    ${sousTutelle(z, T) ? `<section class="card red" aria-label="Zone sous tutelle"><span class="kicker" style="color:var(--red-soft)">Zone sous tutelle · jusqu’au tour ${z.tutelle.fin}</span>
      <span class="small">Pas de rythme renforcé ni d’agents de réserve. Grande décision : recruter seulement.</span></section>` : ''}
    ${primeHtml()}
    ${e.opx.op ? (() => { const op = e.opx.op; const jour = T - op.tourDebut + 1; const couv = Math.round(e.opx.couverture * 100); const niv = { complet: 'Complet', reduit: 'Réduit', aucun: 'Aucun' }[d.operation] || 'Complet'; return `<details class="card red pli-ordres" data-k="ord-op" aria-label="Opération d'envergure" ${ouvertOrdres('ord-op', e.opx.couverture < 0.9 && d.operation !== 'aucun') ? 'open' : ''}>
      <summary><span class="col grow" style="gap:1px;min-width:0"><span class="between" style="gap:8px"><span class="kicker" style="color:var(--red-soft)">Opération d’envergure${op.duree > 1 ? ` · jour ${jour} sur ${op.duree}` : ''}</span><span class="pill amber">${op.recompense} pts</span></span>
        <span class="pli-resume">${esc(op.titre)}</span><span class="tiny pli-resume-s ${couv >= 90 ? 'ok' : couv >= 50 ? 'warn' : 'bad'}">Dispositif ${niv.toLowerCase()} · couvert à ${couv} %</span></span>${icon('chevron', 16)}</summary>
      <div class="col" style="gap:10px">
      <h2 class="card-title">${esc(op.titre)}</h2>
      <p class="small" style="margin:0;color:var(--text2)">${esc(op.texte)} Les agents engagés quittent leur service pour la journée.</p>
      <p class="small" style="margin:0"><strong>Dispositif requis :</strong> ${Object.entries(op.besoins).map(([s2, n]) => `${n} en ${SERVICE_LABELS[s2]}`).join(' · ')}</p>
      <div class="seg" role="group" aria-label="Niveau du dispositif">${[['complet', 'Complet', 'réussite : +pts, +6 satisf.'], ['reduit', 'Réduit', 'moitié des agents'], ['aucun', 'Aucun', 'échec : −10 satisf.']].map(([k, t, dsc]) => `
        <button type="button" data-action="op-niveau" data-v="${k}" aria-pressed="${d.operation === k}"><span class="t">${t}</span><span class="d">${dsc}</span></button>`).join('')}</div>
      <div class="col" id="op-couv" style="gap:2px">${opCouvHtml(e)}</div>
      ${demandeRenfortHtml()}
      </div>
    </details>`; })() : ''}

    ${partieOrdres('affect', 1, 'Affectation', resumeAffect(z, e), etatAffect(e), () => `${situationHtml(z)}
      <div class="between" style="align-items:baseline;margin-bottom:2px"><span></span>
        <button type="button" class="lien-statut" data-action="ventilation" aria-expanded="${!!S.ventilation}"><span id="alloc-status">${statusHtml(e)}</span><span class="tiny muted"> · ${S.ventilation ? 'masquer' : 'détail'}</span>${agentsHorsServices().some((h) => h.bloque) ? ' <span class="small bad">· agents bloqués</span>' : ''}</button></div>
      ${(() => { const ac = academieResume(z, S.state.turn); return ac ? `<p class="tiny muted acad-l" style="margin:0 0 4px">🎓 Académie : ${ac.n} recrue${ac.n > 1 ? 's' : ''} en route (${ac.texte})</p>` : ''; })()}
      ${S.ventilation ? ventilationHtml(z, e) : ''}
      <div class="barre-aff" id="barre-aff" aria-hidden="true">${barreAffectation(e)}</div>
      ${''}
      ${e.reste > 0 ? placerLibresHtml(e) : ''}
      <div id="col-affect">${colonneHtml(z, e)}</div>
      ${''}
      ${prisesHtml()}`, { aria: 'Affectation des agents', cls: 'affect', defaut: replierAffect(e, z) ? false : null, pied: e.reste > 0 ? placerLibresHtml(e) : '' })}
    ${partieOrdres('rythme', 2, 'Rythme de travail', `${RYTHMES[d.rythme] ? RYTHMES[d.rythme].label : 'Normal'} · ${RYTHMES[d.rythme] ? RYTHMES[d.rythme].sub : ''}`, 'ok', () => `      <div class="seg creux" role="group" aria-label="Rythme de travail">${Object.entries(RYTHMES).map(([k, r]) => `
        <button type="button" data-action="rythme" data-v="${k}" aria-pressed="${d.rythme === k}" ${k === 'renforce' && sousTutelle(z, T) ? 'disabled' : ''}><span class="t">${r.label}</span><span class="d">${k === 'renforce' && sousTutelle(z, T) ? 'interdit sous tutelle' : r.sub}</span></button>`).join('')}</div>
      ${z.renforceSuite >= 2 && d.rythme === 'renforce' ? '<p class="small bad" style="margin:0">Attention : plus de 3 tours renforcés d’affilée exposent à l’épuisement.</p>' : ''}
`, { aria: 'Rythme' })}

    ${(() => { const ov = ouvertureOrdres(z); return ov.nouveau.length ? `<p class="small" style="margin:0;color:var(--amber)">Nouveau dans tes ordres : ${ov.nouveau.map(esc).join(', ')}.</p>` : ov.prochain ? `<p class="tiny muted" style="margin:0">Jour ${ov.jour} de ta prise de fonction : ${esc(ov.prochain[2])} s’ouvre au jour ${ov.prochain[1]}.</p>` : ''; })()}
    ${suiviDecisionsHtml(z, T)}
    ${partieOrdres('spe', 3, 'Spécialité', resumeSpecialite(z, d), d.specialite || z.specialite ? 'ok' : 'am', () => specialiteHtml(z, d), { defaut: !z.specialite && !d.specialite ? true : null })}
    ${partieOrdres('decision', 4, 'Grande décision', `${esc(d.decision || d.sansDecision ? decisionLabel(z, d.decision) : 'une seule par soir · pas encore choisie')}${d.decision ? ` · ${coutDecision(z, d.decision)} k€` : ''}`, d.decision || d.sansDecision ? 'ok' : 'am', () => decisionHtml, { defaut: !d.decision && !d.sansDecision })}
    ${partieOrdres('depenses', 5, ouvertureOrdres(z).depenses ? 'Dépenses du jour' : 'Agents de réserve', ouvertureOrdres(z).depenses ? (dep.reserve ? `réserve : ${dep.reserve ? `${dep.reserve} en ${SERVICE_LABELS[dep.reserveService || 'intervention']} · ${fmt1(dep.reserve * DEPENSES.reserve.cout)} k€` : 'Aucun'} · ` : '') + (cab && !dep.carrosserie ? `${cab} véhicule${cab > 1 ? 's' : ''} cabossé${cab > 1 ? 's' : ''} à réparer${nbDep ? ` · ${nbDep} dépense${nbDep > 1 ? 's' : ''}` : ''}` : nbDep ? `${nbDep} dépense${nbDep > 1 ? 's' : ''} · ${fmt1(e.coutDep)} k€` : 'Aucune') : dep.reserve ? `${dep.reserve} en ${SERVICE_LABELS[dep.reserveService || 'intervention']} · ${fmt1(dep.reserve * DEPENSES.reserve.cout)} k€` : 'Aucun', cab > 0 && !dep.carrosserie ? 'am' : nbDep ? 'ok' : '', () => `${!sousTutelle(z, T) ? `<div class="affect">${reserveHtml(z, d, e)}</div>` : ''}${ouvertureOrdres(z).depenses ? depensesHtml : ''}`)}
    ${partieOrdres('arm', 6, 'Armurerie', resumeArmurerieOrdres(z, d), d.materiel && d.materiel.acheter ? 'ok' : '', () => armurerieHtml(z, d), { defaut: false })}
    ${pliGroupe([
    ouvertureOrdres(z).nondroit ? pliItem('nondroit', 'Zone de non-droit', (() => { const n = agentsND(d); const sects = Object.keys(d.secteurs || {}).filter((k) => d.secteurs[k]); return n ? `${n} agent${n > 1 ? 's' : ''} sur ${sects.map((k) => esc(nomSecteur(k))).join(', ')}` : 'Aucun agent ce soir'; })(), `<div class="col" style="gap:6px">${Object.entries(d.secteurs || {}).filter(([, n]) => n).map(([k, n]) => `<div class="between"><span class="small" style="font-weight:600">${esc(nomSecteur(k))}</span><span class="tiny ok">${n} agent${n > 1 ? 's' : ''}</span></div>`).join('')}
      <p class="tiny muted" style="margin:0">Les agents envoyés sont pris sur tes services pour la journée. Qui y va et où : sur la Carte.</p>
      <a class="btn small primary block" href="#terrain">Choisir les secteurs sur la Carte</a></div>`) : null,
    ])}

    <a class="small" href="#guide-ordres" style="text-align:center;padding:10px">Comment fonctionnent les ordres ?</a>
    ${S.ordParts && S.ordParts.affect === false ? '' : feuilleColonne(z, e)}
  </main>${tabbar('ordres')}`;
}

/**
 * Situation du jour qui demande des agents dans un service (évasion, conflit…) : combien seront vraiment
 * comptés à 20:00, après l'opération, l'audition et la traque (comme la résolution).
 */
export function besoinService(sg) {
  const d = S.draft || {};
  let eff = d.alloc || {};
  try { eff = estimations().eff || eff; } catch (e) { /* pas de brouillon complet */ }
  const brut = d.alloc || {};
  const l = [[sg.service, sg.min], ...(sg.service2 ? [[sg.service2, sg.min2]] : [])].map(([s, min]) => ({ s, min, n: eff[s] || 0, brut: brut[s] || 0 }));
  return { ok: l.every((x) => x.n >= x.min), l };
}

/** Minimums demandés ce soir par service (situation du jour), à ne pas vider quand on libère un agent. */
export function minimumsDuSoir(z) {
  const m = {};
  for (const p of (z && z.pressions) || []) {
    if (p.service && p.min) m[p.service] = Math.max(m[p.service] || 0, p.min);
    if (p.service2 && p.min2) m[p.service2] = Math.max(m[p.service2] || 0, p.min2);
  }
  return m;
}
