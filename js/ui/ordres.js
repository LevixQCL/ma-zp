// Écran des ordres du tour.
import { S, esc, icon, fmt1, tabbar, myZone, zoneName } from './common.js';
import { AIDE, themeActif } from '../engine/rivalites.js';
import { AFFAIRE, SERVICES, SERVICE_LABELS, RYTHMES, INFRAS, COUTS, DEFAULT_ALLOC, DEPENSES, NIVEAU_MAX, BATIMENTS, BATIMENT_MAX, TRAVAUX_TOURS, ENTRETIEN_ANNEXE, DELAI_ACADEMIE, DUREE_FORMATION, AGENTS_EN_FORMATION, SEASON_LENGTH, SUBSIDE, ROULAGE, seuilChasse, tourEffet, malusEtat, coutEquipement, effetEquip, bonusEquip, multNiveau, multEquip, ECONOMIE, coutFormation, agentsFormation, EQUIP, DOSSIER } from '../engine/constants.js';
import { agentsFipaCeSoir } from './fipa.js';
import { demandeRenfortHtml } from './renfort.js';
import { chefDe, maCandidature, candidaturesRecues, placesRestantes, statutLabel, postulerCtrl, candidatureCtrl } from './affaires.js';
import { effectifPrevu, capaciteAgents, capaciteAgentsPrevue, capaciteVehicules, coutRecrue, sousTutelle, moralMult, bonusLots } from '../engine/zone.js';
import { coutCarrosserie } from '../engine/sinistres.js';
import { agentsND } from './nondroit.js';
import { COULEUR_ROLE, initiales, echelleBonus } from './equipe.js';
import { creerEquipe, appliquerNoms, missionValide, surnomDe } from '../engine/equipe.js';
import { nomSecteur } from '../engine/nondroit.js';
import { secteurOuvert, ROLE_SERVICE, bonusChef, CHEFS } from '../engine/constants.js';
import { carteQuartiers } from '../engine/quartiers.js';
import { forceEngagement, multAffaire, agentsDisponibles, blessesActifs, enFormation, capacite, coutDecision, decisionImpossible, effetsOperation, operationActive, NIVEAUX_OPERATION, coutDepenses } from '../engine/zone.js';

function enqueteDraft() {
  const o = S.savedOrders || {};
  return {
    demarches: o.demarches || [], appui: o.appui || null, piste: o.piste ?? null, accusation: o.accusation ?? null, traque: o.traque || null, partages: o.partages || [],
    fipa: o.fipa || null, fipaReponse: o.fipaReponse || null, fipaChoix: o.fipaChoix || null,
    manoeuvre: o.manoeuvre || null, renfort: o.renfort || null, aide: o.aide || null, duel: o.duel || null, duelReponse: o.duelReponse || null, votes: o.votes || {}, motionChef: o.motionChef || null, offre: o.offre || null,
  };
}

export function initDraft() {
  const z = myZone();
  const st = S.state;
  const dispo = agentsDisponibles(z, st.turn);
  const base = S.savedOrders || (z.dernierOrdre ? { alloc: z.dernierOrdre.alloc, rythme: z.dernierOrdre.rythme, patrouilles: z.dernierOrdre.patrouilles } : { alloc: DEFAULT_ALLOC, rythme: 'normal' });
  const d = JSON.parse(JSON.stringify({ secteurs: base.secteurs || (!S.savedOrders && z.dernierOrdre && z.dernierOrdre.secteurs) || {}, alloc: { ...DEFAULT_ALLOC, ...(base.alloc || {}) }, rythme: base.rythme || 'normal', decision: base.decision || null, engagements: base.engagements || {}, evenement: base.evenement || 0, operation: base.operation || 'complet', patrouilles: base.patrouilles || {}, sansDecision: !!(S.savedOrders && S.savedOrders.sansDecision), depenses: (S.savedOrders && S.savedOrders.depenses) || { reserve: 0, reserveService: 'intervention' }, ...enqueteDraft() }));
  // Patrouilles : seulement dans mes quartiers.
  const mesQ = new Set((carteQuartiers(st).deZone[z.uid] || []).map(String));
  for (const k of Object.keys(d.patrouilles)) if (!mesQ.has(k)) delete d.patrouilles[k];
  // Zone de non-droit : seulement les secteurs ouverts ce soir.
  for (const k of Object.keys(d.secteurs)) if (!secteurOuvert(st.nonDroit, k) || !(d.secteurs[k] > 0)) delete d.secteurs[k];
  // On ne garde que les engagements sur des affaires encore ouvertes.
  const ids = new Set(st.affaires.map((a) => a.id));
  for (const k of Object.keys(d.engagements)) if (!ids.has(k)) delete d.engagements[k];
  // Ajuste la répartition si des agents manquent (blessés, formation…).
  let total = SERVICES.reduce((s, k) => s + d.alloc[k], 0) + engages(d);
  let i = 0;
  while (total > dispo && i < 200) { const k = SERVICES[i % SERVICES.length]; if (d.alloc[k] > 0) { d.alloc[k]--; total--; } i++; }
  S.draft = d;
}

/** Grand événement du district ouvert aujourd'hui ? (sinon les agents « envoyés » ne partent pas). */
const evenementDuJour = () => !!(S.state.evenement && S.state.evenement.tour === S.state.turn);

function engages(d) {
  return agentsND(d) + Object.values(d.engagements).reduce((s, e) => s + (e.agents || 0), 0) + (evenementDuJour() ? d.evenement || 0 : 0) + (d.renfort && S.state.zones[d.renfort.cible] && operationActive(S.state.zones[d.renfort.cible], S.state.turn) ? d.renfort.agents || 0 : 0);
}

/**
 * Où sont mes agents ? Tout ce qui retient des agents hors des cinq services,
 * avec un indicateur « bloqué » quand l'engagement n'est plus visible ailleurs à l'écran.
 */
export function agentsHorsServices() {
  const st = S.state, d = S.draft, z = myZone(), l = [];
  for (const [id, e] of Object.entries(d.engagements)) {
    if (!e.agents) continue;
    const a = st.affaires.find((x) => x.id === id);
    const moiChef = a && a.zone === z.uid;
    const cand = a && !moiChef ? maCandidature(a) : null;
    const bloque = !a ? 'affaire terminée' : moiChef ? null : !cand ? 'aucune candidature envoyée' : cand.statut === 'refusee' ? 'candidature refusée' : null;
    l.push({ k: `eng:${id}`, t: `Affaire « ${a ? a.titre : '?'} »`, n: e.agents, bloque });
  }
  for (const [k, n] of Object.entries(d.secteurs || {})) if (n) l.push({ k: `nd:${k}`, t: `Zone de non-droit · ${esc(nomSecteur(k))}`, n, bloque: secteurOuvert(st.nonDroit, k) ? null : 'secteur fermé' });
  if (d.evenement) l.push({ k: 'ev', t: 'Grand événement du district', n: d.evenement, bloque: evenementDuJour() ? null : 'pas d’événement aujourd’hui', compte: evenementDuJour() });
  if (d.renfort && d.renfort.agents) {
    const cz = st.zones[d.renfort.cible];
    const actif = cz && operationActive(cz, st.turn);
    l.push({ k: 'renfort', t: `Renfort prêté à ${cz ? esc(cz.nom) : '?'}`, n: d.renfort.agents, bloque: actif ? null : 'plus d’opération chez eux', compte: !!actif });
  }
  return l;
}

/**
 * Agents pris dans les services pour la journée (même ordre que la résolution) :
 * opération d'envergure, puis audition, traque et FIPA. Renvoie { s: [[n, motif], …] }.
 */
/** Agents partis pour la journée hors des services : audition, traque, FIPA. */
export function missionsEnquete(d) {
  const l = [];
  if ((d.demarches || []).includes('temoin')) l.push({ k: 'audition', t: 'Audition de la victime (enquête)', n: 2, service: 'recherche' });
  if (d.traque && d.traque.agents) l.push({ k: 'traque', t: 'Traque du suspect (enquête)', n: d.traque.agents, service: 'intervention' });
  const f = agentsFipaCeSoir();
  if (f) l.push({ k: 'FIPA', t: 'FIPA (dispositif commun)', n: f, service: null });
  return l;
}

/**
 * Agents pris dans les services pour la journée (même ordre que la résolution) : opération d'envergure,
 * puis audition, traque et FIPA, qui partent d'abord parmi les agents laissés sans affectation.
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
  const pr = {};
  for (const p of z.pressions || []) Object.assign(pr, p.effet);
  const dep = d.depenses || {};
  const cap = {};
  for (const s of SERVICES) cap[s] = capacite(z, s, eff[s] + (dep.reserve && dep.reserveService === s ? dep.reserve * DEPENSES.reserve.efficacite : 0), opts);
  // Figures de l'équipe : bonus dans leur service, sauf celle prévue en mission.
  const mi = missionValide(d);
  for (const m of z.equipe || []) { const sv = ROLE_SERVICE[m.role]; if (sv && cap[sv] && !(mi && mi.role === m.role)) cap[sv] *= 1 + bonusChef(m.niveau); }
  const crim = Math.max(10, Math.min(95, z.criminalite + (pr.criminalite || 0) - (dep.prevention ? 6 : 0)));
  const attendus = Math.max(1, Math.round(1.5 + crim / 14) + (pr.incidents || 0));
  const couverts = Math.min(attendus, Math.floor(cap.intervention / 1.1));
  const pap = Math.round(couverts * 0.4 + 0.6 + 1.2 + (pr.paperasse || 0) - (dep.soustraitance ? 5 : 0) - cap.admin * 1.2);
  const amendes = cap.roulage * ECONOMIE.amendeParCapacite;
  const total = SERVICES.reduce((s, k) => s + eff[k], 0) || 1;
  const chasse = eff.roulage / total > seuilChasse(z) && !((themeActif(S.state, S.state.turn) || {}).id === 'routiere');
  const dispo = dispo0;
  // Les agents en mission d'enquête ou en FIPA sortent du total : ils ne sont plus à répartir.
  const reste = resteBase - enquete;
  const coutDep = coutDepenses(dep, z);
  const coutTotal = coutDep + (d.decision && !decisionImpossible(z, d.decision, st.turn) ? coutDecision(z, d.decision) : 0);
  return { attendus, couverts, pap, amendes, chasse, dispo, reste, resteBase, enquete, opx, coutDep, coutTotal, prises, crim, cap };
}

/** « dont 2 en audition » sous un service : ces agents ne travaillent pas dans le service aujourd'hui. */
function prisHtml(e, s) {
  const l = (e.prises || {})[s];
  if (!l || !l.length) return '';
  const n = l.reduce((t, [k]) => t + k, 0);
  return `<span class="tiny warn">dont ${l.map(([k, m]) => `${k} ${m === 'l’opération' ? 'sur l’opération' : `en ${m}`}`).join(', ')} : ${Math.max(0, S.draft.alloc[s] - n)} au travail dans le service</span>`;
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
      <span class="svc-t"><span class="svc-n">Agents de réserve</span><span class="svc-r muted">${fmt1(DEPENSES.reserve.cout)} k€ pièce · efficacité ${Math.round(DEPENSES.reserve.efficacite * 100)} % · ${DEPENSES.reserve.max} max.</span></span>
      <span class="stepper"><button type="button" data-action="dep-reserve" data-d="-1" aria-label="Un agent de réserve en moins" ${n <= 0 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="dep-reserve" data-d="1" aria-label="Un agent de réserve en plus" ${n >= DEPENSES.reserve.max ? 'disabled' : ''}>+</button></span></div>
    ${n ? `<div class="svc-plus"><label class="field" style="font-weight:500">Ils prennent la place de tes agents en
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
    case 'intervention': return `<span class="${e.couverts >= e.attendus ? 'ok' : 'warn'}">${e.couverts} incident${e.couverts > 1 ? 's' : ''} sur ${e.attendus} couvert${e.couverts > 1 ? 's' : ''}</span>`;
    case 'proximite': return `<span class="muted">criminalité ${Math.round(e.crim)}</span>`;
    case 'recherche': {
      const p = projeterDossiers(z, e.cap && e.cap.recherche);
      const retard = p.lignes.filter((l) => !l.boucle && l.d.age + 1 > 6).length;
      return `<span class="${retard ? 'bad' : p.boucles ? 'ok' : 'muted'}">${p.boucles ? `${p.boucles} bouclé${p.boucles > 1 ? 's' : ''} ce soir · ` : ''}${p.restants} restant${p.restants > 1 ? 's' : ''} après 20:00</span>`;
    }
    case 'roulage': return e.chasse ? '<span class="bad">« chasse aux PV » : satisfaction en baisse</span>' : `<span class="ok">+${fmt1(e.amendes)} k€ d’amendes</span>`;
    case 'admin': return `<span class="${e.pap > 0 ? 'warn' : 'muted'}">paperasse ${pap(e.pap)} ce soir</span>`;
    default: return '';
  }
}

function statusHtml(e) {
  if (e.reste === 0) return `<span class="small ok" style="font-weight:600">${e.dispo} agents affectés</span>`;
  if (e.reste > 0) return `<span class="small warn" style="font-weight:600">${e.reste} agent${e.reste > 1 ? 's' : ''} sans affectation</span>`;
  if (e.resteBase >= 0) return `<span class="small warn" style="font-weight:600">${-e.reste} pris dans tes services pour l’enquête</span>`;
  return `<span class="small bad" style="font-weight:600">${-e.reste} agent${e.reste < -1 ? 's' : ''} de trop</span>`;
}

/** Mise à jour sans redessiner l'écran (pendant qu'on glisse un curseur). */
export function updateOrdresLive() {
  const e = estimations();
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  for (const s of SERVICES) set(`pris-${s}`, prisHtml(e, s));
  if (e.opx.op) set('op-couv', opCouvHtml(e));
  set('alloc-status', statusHtml(e));
  for (const s of SERVICES) set(`res-${s}`, resultatService(e, s));
  set('dos-recherche', dossiersHtml(myZone(), e));
  const ch = document.getElementById('est-chasse'); if (ch) ch.hidden = !e.chasse;
  const btn = document.getElementById('btn-valider'); if (btn) btn.disabled = e.resteBase < 0;
  const dirty = document.getElementById('dirty'); if (dirty) dirty.hidden = !S.ordersDirty;
}

function decisionLabel(z, d) {
  if (!d) return 'Aucune';
  if (d.type === 'recruter') return `Recruter ${d.n} agent${d.n > 1 ? 's' : ''}`;
  if (d.type === 'former') return `Former : ${SERVICE_LABELS[d.service]} niveau ${z.niveaux[d.service]} → ${z.niveaux[d.service] + 1}`;
  if (d.type === 'equiper') return d.cible === 'vehicule' ? 'Acheter un véhicule' : `Équiper : ${SERVICE_LABELS[d.cible]} niveau ${z.equip[d.cible]} → ${z.equip[d.cible] + 1}`;
  if (d.type === 'construire') return `Construire : ${INFRAS[d.infra].nom}`;
  if (d.type === 'agrandir') return `Agrandir : ${BATIMENTS[d.batiment].nom} niveau ${z.batiments[d.batiment]} → ${z.batiments[d.batiment] + 1}`;
  return '';
}

function decisionOptions(z, T) {
  const opts = [];
  for (const n of [1, 2, 3]) opts.push({ d: { type: 'recruter', n }, sub: `${coutRecrue(z) * n} k€ · arrivée dans ${DELAI_ACADEMIE} tour${DELAI_ACADEMIE > 1 ? 's' : ''}` });
  for (const s of SERVICES) opts.push({ d: { type: 'former', service: s }, sub: `${coutFormation(z, s)} k€ · ${agentsFormation(z, s) ? `${agentsFormation(z, s)} agents absents ${DUREE_FORMATION} tour${DUREE_FORMATION > 1 ? 's' : ''}` : 'au stand de tir, personne d’absent'}` });
  opts.push({ d: { type: 'equiper', cible: 'vehicule' }, sub: `${COUTS.vehicule} k€ · ${z.vehicules} véhicules actuellement` });
  for (const s of SERVICES) opts.push({ d: { type: 'equiper', cible: s }, sub: `${coutEquipement(z.equip[s])} k€` });
  for (const [id, B] of Object.entries(BATIMENTS)) if (z.batiments[id] < BATIMENT_MAX) opts.push({ d: { type: 'agrandir', batiment: id }, sub: `${B.coutAgrandir(z.batiments[id])} k€ · ${B.capacite(z.batiments[id] + 1)} ${B.unite} · ${TRAVAUX_TOURS} tours de travaux` });
  for (const [id, inf] of Object.entries(INFRAS)) if (!z.infra[id]) opts.push({ d: { type: 'construire', infra: id }, sub: `${inf.cout} k€ · ${inf.effet} · entretien ${String(ENTRETIEN_ANNEXE).replace('.', ',')} k€/tour` });
  return opts.map((o) => ({ ...o, refus: decisionImpossible(z, o.d, T) }));
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
    l.push(`${abs ? `${abs} agents absents au tour ${T + 1}` : 'Formation au stand de tir : moitié prix et personne d’absent'}, niveau gagné à la résolution du tour ${T + DUREE_FORMATION + 1}. Conservé à la saison suivante (un niveau de moins).`);
    effet(s, g); argent(s, g);
  } else if (dec.type === 'equiper' && dec.cible === 'vehicule') {
    const inter = S.draft.alloc.intervention || 0, lim = (v) => v * 2.5;
    const g = gainService(z, 'intervention', (x) => { x.usure = x.usure * x.vehicules / (x.vehicules + 1); x.vehicules += 1; });
    l.push(`${z.vehicules} → ${z.vehicules + 1} véhicules, dès le tour ${T + 1}. Chaque véhicule emmène pleinement 2,5 agents d’Intervention : ${fmt1(lim(z.vehicules))} → ${fmt1(lim(z.vehicules + 1))} (tu en mets ${inter}).`);
    l.push(`L’usure du parc se répartit sur un véhicule de plus. Entretien : +${fmt1(ECONOMIE.entretienVehicule)} k€ par tour.`);
    if (inter <= lim(z.vehicules)) l.push('Aujourd’hui, tes véhicules suffisent déjà : un véhicule de plus ne sert que si tu renforces l’Intervention.');
    else effet('intervention', g);
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

/** Sélecteur de grande décision : quatre catégories, des tuiles compactes. */
function decisionPicker(z, T, d) {
  const cat = S.decCat || catDe(d.decision) || 'recruter';
  const choisi = (dec) => JSON.stringify(d.decision) === JSON.stringify(dec);
  const tuile = (dec, titre, detail0, cout, extra = '') => {
    let detail = detail0;
    const refus = decisionImpossible(z, dec, T);
    const te = tourEffet(dec, T);
    const trop = te !== null && te > SEASON_LENGTH;
    if (trop && !refus) detail = `⚠ effet au tour ${te} : après la fin de saison, perdu`;
    return `<button type="button" class="dtuile ${trop ? 'tard' : ''}" data-action="decision" data-json='${esc(JSON.stringify(dec))}' aria-pressed="${choisi(dec)}" ${refus && !choisi(dec) ? 'disabled' : ''}>
      <span class="t">${titre}</span>${extra}<span class="d">${esc(refus || detail)}</span><span class="c">${cout} k€</span></button>`;
  };
  const pc = (x) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)} %`;
  const ent = (v) => `${fmt1(v)} k€`;
  let corps = '';
  if (cat === 'recruter') {
    corps = `<div class="dgrille trois">${[1, 2, 3].map((n) => tuile({ type: 'recruter', n }, `+${n} agent${n > 1 ? 's' : ''}`, `au tour ${T + DELAI_ACADEMIE} · +${fmt1(n * ECONOMIE.salaire)} k€/tour de salaire`, fmt1(coutRecrue(z) * n))).join('')}</div>${coutRecrue(z) !== COUTS.recrue ? `<p class="tiny ${coutRecrue(z) < COUTS.recrue ? 'ok' : 'bad'}" style="margin:0">Réputation ${Math.round(z.reputation)} : une recrue te coûte ${fmt1(coutRecrue(z))} k€ au lieu de ${COUTS.recrue} k€.</p>` : ''}`;
  } else if (cat === 'former') {
    corps = `<p class="tiny muted" style="margin:0"><strong>Former</strong> = le long terme : +20 % d’efficacité par niveau, <strong>gardé d’une saison à l’autre</strong> (un niveau de moins). Coûte peu, mais 2 agents sont absents pendant la formation. <strong>Équiper</strong>, à côté, c’est le coup de pouce immédiat, perdu en fin de saison.</p>
      <div class="dgrille">${SERVICES.map((sv) => tuile({ type: 'former', service: sv }, SERVICE_LABELS[sv], `niveau ${z.niveaux[sv]} → ${z.niveaux[sv] + 1} · efficacité ${pc(multNiveau(z.niveaux[sv] + 1) / multNiveau(z.niveaux[sv]) - 1)}${agentsFormation(z, sv) ? '' : ' · au stand de tir'}`, coutFormation(z, sv), niv(z.niveaux[sv]))).join('')}</div>`;
  } else if (cat === 'equiper') {
    corps = `<p class="tiny muted" style="margin:0"><strong>Équiper</strong> = le coup de pouce immédiat : +${Math.round(EQUIP.efficacite * 100)} % d’efficacité et un effet propre au service, sans agent absent, mais <strong>perdu en fin de saison</strong>. <strong>Former</strong> (+20 %) est plus fort et se garde d’une saison à l’autre.</p>
      <div class="dgrille">${tuile({ type: 'equiper', cible: 'vehicule' }, 'Véhicule', `${z.vehicules} → ${z.vehicules + 1} véhicules (garage : ${capaciteVehicules(z)} places) · +${fmt1(ECONOMIE.entretienVehicule)} k€/tour`, COUTS.vehicule)}
      ${SERVICES.map((sv) => tuile({ type: 'equiper', cible: sv }, SERVICE_LABELS[sv], `matériel ${z.equip[sv]} → ${z.equip[sv] + 1} · ${effetEquip(sv, 1)} · efficacité ${pc(multEquip(z.equip[sv] + 1) / multEquip(z.equip[sv]) - 1)}`, coutEquipement(z.equip[sv]), niv(z.equip[sv]))).join('')}</div>`;
  } else {
    const faites = Object.entries(INFRAS).filter(([id]) => z.infra[id]).map(([, i]) => i);
    corps = `<div class="dgrille">${Object.entries(BATIMENTS).map(([id, B]) => { const n = z.batiments[id]; return n >= BATIMENT_MAX ? '' : tuile({ type: 'agrandir', batiment: id }, `Agrandir : ${B.nom}`, `${B.capacite(n)} → ${B.capacite(n + 1)} ${B.unite} · entretien ${ent(B.entretien(n))} → ${ent(B.entretien(n + 1))}/tour`, B.coutAgrandir(n), niv(n, BATIMENT_MAX)); }).join('')}
      ${Object.entries(INFRAS).filter(([id]) => !z.infra[id]).map(([id, inf]) => tuile({ type: 'construire', infra: id }, inf.nom, `${inf.effet} · entretien ${ent(ENTRETIEN_ANNEXE)}/tour`, inf.cout)).join('')}</div>
      ${faites.length ? `<div class="col" style="gap:3px"><span class="tiny muted">Déjà construit :</span>${faites.map((i) => `<span class="tiny"><strong>${esc(i.nom)}</strong> <span class="muted">· ${esc(i.effet)}</span></span>`).join('')}</div>` : ''}`;
  }
  const det = d.decision && catDe(d.decision) === cat ? detailDecision(z, d.decision, T) : '';
  corps += det ? `<div class="ddetail">${det}</div>` : '<p class="tiny muted" style="margin:0">Touche une option : le détail de ce qu’elle change pour ta zone s’affiche ici.</p>';
  return `<div class="col" style="gap:10px">
    <div class="between dchoix"><span class="col" style="gap:1px"><span class="tiny muted">Ta grande décision de ce soir</span><strong>${esc(d.decision || d.sansDecision ? decisionLabel(z, d.decision) : 'Pas encore choisie')}${d.decision ? ` · ${coutDecision(z, d.decision)} k€` : ''}</strong></span>
      ${d.decision || !d.sansDecision ? `<button type="button" class="btn small ghost" data-action="decision" data-json="null" data-aucune="1">${d.decision ? 'Aucune' : 'Aucune ce soir'}</button>` : ''}</div>
    <div class="segn" role="tablist" aria-label="Type de décision" style="grid-template-columns:repeat(4,minmax(0,1fr))">${DEC_CATS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${cat === k}" data-action="dec-cat" data-v="${k}">${l}${catDe(d.decision) === k ? ' ●' : ''}</button>`).join('')}</div>
    ${corps}
    <p class="tiny muted" style="margin:0">Une seule grande décision par tour, payée à 20:00 si le budget le permet (${fmt1(z.budget)} k€ aujourd’hui).</p>
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
  const aide = d.aide && d.aide.cible && d.aide.agents ? d.aide.agents : 0;
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
    ${ligne(e.reste >= 0 ? '<strong>Sans affectation</strong>' : e.resteBase >= 0 ? '<strong>Manquent pour l’enquête</strong>' : '<strong>De trop</strong>', `<strong>${Math.abs(e.reste)}</strong>`, `tot ${e.reste > 0 ? 'warn' : e.reste < 0 ? 'bad' : 'ok'}`)}
    ${prises.length ? `<span class="tiny warn" style="margin-top:4px">Pris dans tes services pour la journée : ${prises.map(([t, n]) => `${t} ${n}`).join(' · ')}. Enlève des agents d’un service pour les laisser libres, sinon ces services tourneront avec moins de monde.</span>` : ''}
    ${aide ? `<span class="tiny muted">Entraide : ${aide} agent${aide > 1 ? 's' : ''} partiront demain pour ${AIDE.dureePret} tours.</span>` : ''}
    ${academie ? `<span class="tiny muted">À l’académie : ${academie} recrue${academie > 1 ? 's' : ''}, pas encore disponible${academie > 1 ? 's' : ''}.</span>` : ''}
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
  const lots = bonusLots(z, 'roulage');
  if (lots !== 1) facteurs.push(`lots ${x(lots)}`);
  const un = capacite(z, 'roulage', 1, { rythme, turn: T }) * ECONOMIE.amendeParCapacite;
  const tous = n ? capacite(z, 'roulage', n, { rythme, turn: T }) * ECONOMIE.amendeParCapacite : 0;
  return `Rapporte ${fmt1(ECONOMIE.amendeParCapacite)} k€ par unité de capacité. Aujourd’hui, un agent vaut ${fmt1(ECONOMIE.amendeParCapacite)} × ${facteurs.join(' × ')} = ${String(Math.round(un * 100) / 100).replace('.', ',')} k€ par jour${n ? ` ; tes ${n} agents : ${fmt1(tous)} k€` : ''}. Le moral compte : à 60, il retire 4 % ; à 100, il ajoute 20 %.`;
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
  const lignes = (z.dossiers || []).slice().sort((a, b) => b.age - a.age).map((d) => {
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
  const p = projeterDossiers(z, e.cap && e.cap.recherche);
  if (!p.lignes.length) return '<span class="tiny muted">Aucun dossier en cours : le dossier du soir sera entamé à 20:00.</span>';
  const n = S.draft.alloc.recherche || 0;
  const ligne = (l) => {
    const d = l.d, tot = d.total || d.reste;
    const deja = Math.max(0, (tot - d.reste) / tot) * 100, soir = (l.fait / tot) * 100;
    const ageSoir = d.age + 1, retard = !l.boucle && ageSoir > 6, bientot = !l.boucle && ageSoir >= 5;
    return `<div class="dos ${retard ? 'bad' : bientot ? 'warn' : ''}">
      <div class="between" style="gap:8px"><span class="dos-t"><span class="dos-age">J${d.age}</span>${esc(d.titre)}</span>
        <span class="dos-f ${l.boucle ? 'ok' : retard ? 'bad' : ''}">${l.boucle ? '✓ bouclé ce soir' : `reste ${Math.round((l.reste / tot) * 100)} %`}</span></div>
      <div class="dos-bar" aria-hidden="true"><i class="deja" style="width:${deja}%"></i><i class="soir" style="width:${soir}%"></i></div>
      ${retard ? '<span class="tiny bad">pas bouclé : il coûtera de la satisfaction chaque soir</span>' : bientot ? `<span class="tiny warn">pas bouclé ce soir : J${ageSoir} demain, en retard après J6</span>` : ''}
    </div>`;
  };
  return `<div class="dossiers">${p.lignes.map(ligne).join('')}</div>
    <span class="tiny muted">${n ? 'Gris : déjà fait · bleu : ce que tes enquêteurs feront ce soir, les plus vieux d’abord. ' : 'Personne en Recherche : aucun dossier n’avancera ce soir. '}Un nouveau dossier arrive chaque soir, compté dans les dossiers restants.</span>`;
}

/** Aide courte de chaque service, avec la situation actuelle de la zone. */
function aide(s, z) {
  const f = (v) => fmt1(v);
  switch (s) {
    case 'intervention': return `Traite les incidents du jour (environ 1 agent par incident, ${Math.max(1, Math.round(1.5 + z.criminalite / 14))} attendus). Incident traité : +0,5 de satisfaction ; raté : −1,8. Au-delà de 2,5 agents par véhicule, les agents en trop comptent pour moitié. Chaque intervention use les véhicules : état du parc ${Math.round(100 - z.usure)} %${malusEtat(100 - z.usure) < 1 ? ` (efficacité −${Math.round((1 - malusEtat(100 - z.usure)) * 100)} %)` : ''} ; sous 80 %, l’Intervention perd de l’efficacité. Une révision du parc (dépense du jour, 2 k€) rend +20 %. Les patrouilles qui restent libres après les incidents remplissent la jauge de flagrant délit (${Math.round((z.jaugeFlagrant || 0) * 100)} % aujourd’hui ; +10 % par unité de marge, 40 % au plus par jour) : à 100 %, flagrant délit (+3 pts de résultats, PS et un quartier apaisé).`;
    case 'proximite': return `Prévention : fait baisser la criminalité (actuellement ${Math.round(z.criminalite)}). Environ 4 agents la stabilisent. Au-dessus de 55, un quartier coûte de la satisfaction chaque jour, et la criminalité augmente les incidents. Tu peux envoyer ces agents en patrouille dans des quartiers précis depuis la Carte.`;
    case 'recherche': return `Fait avancer tes dossiers locaux (${z.dossiers.length} en cours). Chaque unité de travail sur un dossier rapporte +0,5 pt de résultats le jour même ; dossier élucidé : +2 de satisfaction. Un nouveau dossier arrive chaque jour. Tes enquêteurs traitent toujours les dossiers les plus vieux en premier ; un dossier de plus de 6 jours coûte de la satisfaction chaque jour (signalé dès 5 jours). Au-delà de 2 agents, tes enquêteurs font aussi l’enquête de voisinage : chaque soir, une chance de rapporter des pièces pour l’enquête de la semaine (bien plus avec une piste prioritaire, à choisir dans l’Enquête).`;
    case 'roulage': return `${amendeParAgentTxt(z)} Au-delà de ${ROULAGE.seuil} agents, chaque agent de plus compte pour moitié. Au-delà de ${Math.round(seuilChasse(z) * 100)} % de tes effectifs : « chasse aux PV », −2 de satisfaction par jour.`;
    case 'admin': return `Traite la paperasse (environ 1 dossier par agent ; ${f(z.paperasse)} en attente). Au-delà de 14 : −2 de moral par jour. Au-delà de 20 : Inspection générale, 5 k€ d’amende. C’est aussi ton assurance : chaque agent au-delà de 2 évite 15 % des tracas internes (panne, dégât des eaux, grève, papiers égarés, plainte…), jusqu’à 60 %. Aujourd’hui : ${Math.round(Math.min(0.6, Math.max(0, ((S.draft && S.draft.alloc.admin) || 0) - 2) * 0.15) * 100)} %.`;
    default: return '';
  }
}

function prisesHtml() {
  const d = S.draft, l = [];
  if (d.traque && d.traque.agents) l.push(`${d.traque.agents} agent${d.traque.agents > 1 ? 's' : ''} d’Intervention partent en traque`);
  if ((d.demarches || []).includes('temoin')) l.push('2 agents de Recherche passent la journée sur une audition');
  const f = agentsFipaCeSoir();
  if (f) l.push(`${f} agents partent en FIPA (pris d’abord en Proximité)`);
  const fo = d.decision && d.decision.type === 'former' && agentsFormation(z, d.decision.service) ? `<p class="small muted" style="margin:0">Formation choisie : ${agentsFormation(z, d.decision.service)} agents seront absents demain (${DUREE_FORMATION} tour), ils sortiront alors du total disponible.</p>` : '';
  return (l.length ? `<p class="small warn" style="margin:0">Enquête et FIPA : ${l.join(' ; ')}. Ils sont retirés du total à répartir ; s’il ne reste pas assez d’agents libres, ils sont pris dans le service indiqué.</p>` : '') + fo;
}

export function situationHtml(z) {
  if (!z.pressions || !z.pressions.length) return '';
  return `<section class="card amber" aria-label="Situation du jour" style="gap:6px"><span class="kicker">Situation du jour</span>
    ${z.pressions.map((p) => `<div class="col" style="gap:1px"><span style="font-weight:600;font-size:14px">${esc(p.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(p.texte)}</span></div>`).join('')}
  </section>`;
}

/** Mon équipe dans les ordres : bonus de chaque figure, et la mission du jour (une figure au plus). */
function equipeOrdres(z, d) {
  const equipe = appliquerNoms(JSON.parse(JSON.stringify(z.equipe || creerEquipe(z.uid))), z.uid, (S.player && S.player.equipeNoms) || null);
  const mis = missionValide(d);
  const voulu = d.mission || null;
  const qui = S.missionQui || null;
  const nom = (m) => `${m.prenom} ${m.nom}${surnomDe(m) ? ` « ${surnomDe(m)} »` : ''}`;
  const secteurs = Object.entries(d.secteurs || {}).filter(([, n]) => n > 0);
  const cible = d.renfort && d.renfort.agents > 0 && S.state.zones[d.renfort.cible] ? S.state.zones[d.renfort.cible] : null;
  const lignes = equipe.map((m) => {
    const sv = ROLE_SERVICE[m.role], b = Math.round(bonusChef(m.niveau) * 100);
    const enMission = mis && mis.role === m.role;
    const choix = qui === m.role && !enMission;
    const dest = choix ? `<div class="mission-dest">${secteurs.map(([k, n]) => `<button type="button" class="choice" data-action="mission-ou" data-role="${m.role}" data-type="nondroit" data-secteur="${esc(k)}"><span>Zone de non-droit · ${esc(nomSecteur(k))}</span><span class="s">avec tes ${n} agent${n > 1 ? 's' : ''} · force +${b} %, blessures ÷2</span></button>`).join('')}
        ${cible ? `<button type="button" class="choice" data-action="mission-ou" data-role="${m.role}" data-type="renfort"><span>Renfort chez ${esc(cible.nom)}</span><span class="s">compte pour ${CHEFS.renfort.agents} agent de plus dans son dispositif</span></button>` : ''}
        ${secteurs.length || cible ? '' : '<p class="tiny muted" style="margin:0">Aucune mission possible ce soir : envoie d’abord des agents en zone de non-droit (Terrain) ou prête des agents en renfort à un collègue.</p>'}</div>` : '';
    return `<div class="col" style="gap:4px"><div class="membre-o">
      <span class="avatar" style="background:${COULEUR_ROLE[m.role]};width:30px;height:30px;font-size:12px" aria-hidden="true">${esc(initiales(m))}</span>
      <span class="col grow" style="gap:1px;min-width:0"><span class="small" style="font-weight:600">${esc(nom(m))}</span>
        <span class="tiny ${enMission ? 'warn' : 'muted'}">${enMission ? (mis.type === 'nondroit' ? `en mission · zone de non-droit, ${esc(nomSecteur(mis.secteur))}` : `en mission · renfort chez ${esc(cible ? cible.nom : 'un collègue')}`) + ` (${esc(SERVICE_LABELS[sv])} sans son bonus ce soir)` : `encadre ${esc(SERVICE_LABELS[sv])}`}</span></span>
      ${enMission ? `<button type="button" class="btn small ghost" data-action="mission-annuler">Rappeler</button>` : `<button type="button" class="btn small ${choix ? 'primary' : 'ghost'}" data-action="mission-qui" data-role="${m.role}" aria-expanded="${choix}">Mission</button>`}
    </div>${enMission ? '' : `<div class="membre-ech">${echelleBonus(m)}</div>`}${dest}</div>`;
  }).join('');
  const perdue = voulu && !mis ? '<p class="tiny bad" style="margin:0">Mission annulée : plus d’agents à l’endroit prévu. La figure reste à son service.</p>' : '';
  return `<div class="col" style="gap:8px">${perdue}${lignes}
    <p class="tiny muted" style="margin:0">Une figure au plus en mission par jour. Son service perd alors son bonus pour la journée ; elle gagne un peu d’expérience en plus.</p></div>`;
}

/** Une ligne repliable de la carte « Ce soir aussi » (même arguments que `pli`, plus une pastille). */
function pliItem(key, titre, resume, contenu, alerte = false, pastille = null) { return { key, titre, resume, contenu, alerte, pastille }; }
/** Les sections repliables regroupées dans une seule carte, une ligne chacune. */
function pliGroupe(items) {
  return `<section class="card plis" aria-label="Ce soir aussi">${items.filter(Boolean).map((x) => {
    const ouvert = !!(S.ordOpen && S.ordOpen[x.key]);
    const chip = x.pastille || (x.alerte ? 'à voir' : '');
    return `<div class="pli-l${ouvert ? ' ouvert' : ''}">
      <button type="button" class="pli" data-action="ord-open" data-k="${x.key}" aria-expanded="${ouvert}">
        <span class="col grow" style="gap:1px;align-items:flex-start;text-align:left;min-width:0"><span class="tiny muted" style="font-weight:700">${esc(x.titre)}</span>
        <span style="font-size:14.5px;font-weight:600">${x.resume}</span></span>${chip ? `<span class="pli-chip">${esc(chip)}</span>` : ''}${icon('chevron', 18, ouvert ? 'style="transform:rotate(90deg)"' : '')}</button>
      ${ouvert ? `<div class="pli-c">${x.contenu}</div>` : ''}</div>`;
  }).join('')}</section>`;
}

/** Une section repliable : une ligne résumé, ouverte à la demande. */
function pli(key, titre, resume, contenu, alerte = false) {
  const ouvert = !!(S.ordOpen && S.ordOpen[key]);
  return `<section class="card ${alerte ? 'amber' : ''}" aria-label="${esc(titre)}" style="gap:8px">
    <button type="button" class="pli" data-action="ord-open" data-k="${key}" aria-expanded="${ouvert}">
      <span class="col" style="gap:1px;align-items:flex-start;text-align:left"><span class="tiny muted" style="font-weight:700">${esc(titre)}</span>
      <span style="font-size:14px;font-weight:600">${resume}</span></span>${icon('chevron', 18, ouvert ? 'style="transform:rotate(90deg)"' : '')}</button>
    ${ouvert ? contenu : ''}
  </section>`;
}

/** Carte d'une affaire disputée, avec les agents engagés (écran Terrain). */
export function carteAffaire(a) {
  const z = myZone(), d = S.draft;

    const eg = d.engagements[a.id] || { agents: 0, acceptes: [] };
    const force = eg.agents ? Math.round(forceEngagement(z, eg.agents) * 10) / 10 : 0;
    const chef = chefDe(a);
    const moiChef = a.zone === z.uid;
    const cand = !moiChef && maCandidature(a);
    const stepper = `<div class="between"><span class="small">${moiChef ? 'Tes agents' : 'Agents proposés'}</span>
        <span class="stepper"><button type="button" data-action="eng" data-id="${a.id}" data-d="-1" aria-label="Retirer un agent">−</button><span class="n">${eg.agents}</span><button type="button" data-action="eng" data-id="${a.id}" data-d="1" aria-label="Ajouter un agent">+</button></span></div>`;
    let corps;
    if (moiChef) {
      const recues = candidaturesRecues().filter((c) => c.aid === a.id);
      const acc = recues.filter((c) => c.statut === 'acceptee');
      const att = recues.filter((c) => c.statut === 'attente').length;
      const fEquipe = force + acc.reduce((s2, c) => s2 + (S.state.zones[c.uid] ? forceEngagement(S.state.zones[c.uid], c.agents) : 0), 0);
      const m = eg.agents ? multAffaire(a, fEquipe) : 0;
      corps = `${stepper}
        ${eg.agents ? '' : '<p class="tiny warn" style="margin:0">Sans agents de ta part, l’affaire n’est pas lancée ce soir.</p>'}
        ${eg.agents ? `<p class="tiny ${m ? (m >= 1 ? 'ok' : '') : 'bad'}" style="margin:0">${m ? `Force de l’équipe ${fmt1(fEquipe)} : environ <strong>${fmt1(a.recompense * m * AFFAIRE.prime)} k€</strong> de prime et ${fmt1(a.recompense * m)} pts (${Math.round(m * 100)} %), à partager selon les agents.${m < 1.3 ? ` Plus de force = plus de gains, jusqu’à 130 % vers ${fmt1(a.forceConseillee * 1.5)}.` : ' Maximum atteint.'}` : `Force de l’équipe ${fmt1(fEquipe)} : sous le minimum (${a.forceMin}), l’affaire échouera.`}</p>` : ''}
        <p class="tiny muted" style="margin:0">Équipe : ${acc.length ? acc.map((c) => `${esc(S.state.zones[c.uid] ? S.state.zones[c.uid].nom : '?')} (${c.agents})`).join(', ') : 'toi seul pour l’instant'} · places restantes : ${placesRestantes(a)} sur ${a.agentsMax}${att ? ` · <a href="#prive">${att} candidature${att > 1 ? 's' : ''} à traiter</a>` : ''}</p>`;
    } else if (cand) {
      corps = `<p class="tiny" style="margin:0">Ta candidature auprès de ${esc(chef ? chef.nom : '?')} : ${statutLabel(cand.statut)}</p>${cand.statut !== 'refusee' ? stepper : eg.agents ? `<div class="between"><span class="tiny bad">${eg.agents} agent${eg.agents > 1 ? 's' : ''} encore réservé${eg.agents > 1 ? 's' : ''} ici</span><button type="button" class="btn small ghost" data-action="rapatrier" data-k="eng:${a.id}">Rapatrier</button></div>` : ''}`;
    } else {
      corps = `<p class="tiny muted" style="margin:0">Dirigée par ${chef ? zoneName(chef) : '?'}.</p>${postulerCtrl(a)}`;
    }
    const recuesCtl = moiChef ? candidaturesRecues().filter((c) => c.aid === a.id).map((c) => `<div class="col" style="gap:4px"><span class="small" style="font-weight:600">${esc(S.state.zones[c.uid] ? S.state.zones[c.uid].nom : '?')} postule avec ${c.agents} agent${c.agents > 1 ? 's' : ''}</span>${candidatureCtrl(c)}</div>`).join('') : '';
    return `<div class="card tight">
      <div class="between"><span style="font-weight:600;font-size:14px">${esc(a.titre)}</span><span class="pill amber">≈ ${fmt1(a.recompense * AFFAIRE.prime)} k€</span></div>
      <p class="tiny" style="margin:0;color:var(--amber-soft)">Si l’affaire est résolue : prime d’environ ${fmt1(a.recompense * AFFAIRE.prime)} k€ partagée selon les agents engagés, +2 de moral pour chaque zone, de la réputation (+${AFFAIRE.repChef} pour qui dirige, plus pour les renforts), de la satisfaction pour la zone qui dirige, et des points d’IPZ.</p>
      <p class="tiny muted" style="margin:0">${moiChef ? '<strong style="color:var(--amber)">Chez toi · tu diriges</strong> · ' : ''}Force minimale ${a.forceMin}, conseillée ${a.forceConseillee}${eg.agents ? ` · ta force : <strong style="color:${force >= a.forceConseillee ? 'var(--green-soft)' : 'var(--text)'}">${fmt1(force)}</strong>` : ''} · ${a.tours > 1 ? 'nouvelle affaire' : 'dernier tour'}</p>
      ${corps}
      ${recuesCtl}
    </div>`;
}

export function renderOrdres() {
  const z = myZone(), st = S.state, d = S.draft, T = st.turn;
  const e = estimations();
  const bl = blessesActifs(z, T), fo = enFormation(z, T);
  const others = Object.values(st.zones).filter((x) => x.uid !== z.uid);
  const saved = !!S.savedOrders && !S.ordersDirty;
  const pap = (v) => (v < 0 ? `−${-v}` : v > 0 ? `+${v}` : '±0');
  const nbEng = Object.values(d.engagements).filter((x) => x.agents > 0).length;
  const dep = d.depenses || {};
  const cab = (z.cabosses || []).length;
  const depKeys = [...(cab ? ['carrosserie'] : []), 'prime', 'prevention', 'soustraitance', 'revision'];
  const nbDep = (dep.reserve ? 1 : 0) + depKeys.filter((k) => dep[k]).length;

  const nbAgentsAff = Object.values(d.engagements).reduce((s2, x) => s2 + (x.agents || 0), 0);
  const affairesHtml = `<div class="col" style="gap:8px">${st.affaires.map((a) => { const eg = d.engagements[a.id]; return `<div class="between"><span class="small" style="font-weight:600">${esc(a.titre)}</span><span class="tiny ${eg && eg.agents ? 'ok' : 'muted'}" style="white-space:nowrap">${eg && eg.agents ? `${eg.agents} agent${eg.agents > 1 ? 's' : ''}` : a.zone === z.uid ? 'à lancer' : '—'}</span></div>`; }).join('')}
      <p class="tiny muted" style="margin:0">Les affaires disputées se gèrent au même endroit : engager tes agents, postuler chez un voisin, accepter les candidatures.${nbAgentsAff ? ` ${nbAgentsAff} agent${nbAgentsAff > 1 ? 's' : ''} engagé${nbAgentsAff > 1 ? 's' : ''}, pris sur tes services.` : ''}</p>
      <a class="btn small primary block" href="#terrain">Gérer les affaires sur le Terrain</a></div>`;

  const decisionHtml = decisionPicker(z, T, d);

  const depensesHtml = `<div class="col" style="gap:6px">
      <p class="tiny muted" style="margin:0">Agents de réserve : ${dep.reserve ? `<strong>${dep.reserve}</strong> en ${SERVICE_LABELS[dep.reserveService]} (${fmt1(dep.reserve * DEPENSES.reserve.cout)} k€)` : 'aucun'} · ils se règlent dans l’Affectation, plus haut.</p>
    </div>
    <div class="col" style="gap:6px">${depKeys.map((k) => `
      <button type="button" class="choice" data-action="dep-toggle" data-k="${k}" aria-pressed="${!!dep[k]}" style="flex-direction:row;justify-content:space-between;text-align:left">
        <span class="col" style="gap:1px;align-items:flex-start"><span style="font-size:14px">${esc(DEPENSES[k].nom)}</span><span class="s">${esc(DEPENSES[k].texte)}${k === 'carrosserie' && Array.isArray(dep.carrosserie) && dep.carrosserie.length < cab ? ` · ${dep.carrosserie.length} sur ${cab} choisi${dep.carrosserie.length > 1 ? 's' : ''} depuis l’HP` : ''}${k === 'revision' ? ` · état actuel ${Math.round(100 - z.usure)} %${z.stats && z.stats.risqueAccident != null ? ` · risque d’accident hier ${fmt1(z.stats.risqueAccident)} %` : ''}` : ''}${k === 'carrosserie' ? ` · ${cab} véhicule${cab > 1 ? 's' : ''} cabossé${cab > 1 ? 's' : ''} : sans réparation, −${Math.min(3, cab)} de satisfaction et de réputation par tour` : ''}</span></span><span class="mono small">${fmt1(k === 'carrosserie' ? coutCarrosserie(z, dep.carrosserie || true) : DEPENSES[k].cout)} k€</span></button>`).join('')}
    </div>
    <p class="tiny muted" style="margin:0">Payées à 20:00 si le budget le permet (${fmt1(z.budget)} k€). Elles ne sont pas reconduites le lendemain.</p>`;

  return `<main class="screen">
    <header class="between" style="align-items:flex-start;gap:10px"><div class="col" style="gap:3px;min-width:0"><h1 class="big">Ordres du tour ${T}</h1>
      <p class="sub">${e.dispo} agents disponibles${e.enquete ? `, dont ${e.enquete} en mission (enquête ou FIPA) : ${e.dispo - e.enquete} à répartir` : ''}${bl || fo || z.absents ? ` (${[bl ? `${bl} absent${bl > 1 ? 's' : ''}` : '', fo ? `${fo} en formation` : '', z.absents ? `${z.absents} en congé maladie, moral bas` : ''].filter(Boolean).join(', ')})` : ''} · secrets jusqu’à 20:00</p></div>
      <span class="statut-ordres ${saved ? 'ok' : ''}">${saved ? `${icon('check', 13)} Validés` : S.savedOrders ? 'Modifiés' : 'Pas validés'}</span></header>

    ${saved ? '<p class="tiny muted" style="margin:-6px 0 0">Tes ordres sont validés ; tu peux encore les modifier jusqu’à 20:00.</p>'
      : !S.savedOrders && !S.ordersDirty && z.dernierOrdre ? `<button class="btn primary block" data-action="save-orders">Reprendre les ordres d’hier et valider</button>
        <p class="tiny muted" style="margin:-4px 0 0;text-align:center">Ou ajuste ci-dessous, puis valide.</p>` : ''}

    ${sousTutelle(z, T) ? `<section class="card red" aria-label="Zone sous tutelle"><span class="kicker" style="color:var(--red-soft)">Zone sous tutelle · jusqu’au tour ${z.tutelle.fin}</span>
      <span class="small">Pas de rythme renforcé, d’agents de réserve, de manœuvre, de duel ni d’enchère. Grande décision : recruter seulement.</span></section>` : ''}
    ${situationHtml(z)}
    ${e.opx.op ? (() => { const op = e.opx.op; const jour = T - op.tourDebut + 1; return `<section class="card red" aria-label="Opération d'envergure">
      <div class="between"><span class="kicker" style="color:var(--red-soft)">Opération d’envergure${op.duree > 1 ? ` · jour ${jour} sur ${op.duree}` : ''}</span><span class="pill amber">${op.recompense} pts</span></div>
      <h2 class="card-title">${esc(op.titre)}</h2>
      <p class="small" style="margin:0;color:var(--text2)">${esc(op.texte)} Les agents engagés quittent leur service pour la journée.</p>
      <p class="small" style="margin:0"><strong>Dispositif requis :</strong> ${Object.entries(op.besoins).map(([s2, n]) => `${n} en ${SERVICE_LABELS[s2]}`).join(' · ')}</p>
      <div class="seg" role="group" aria-label="Niveau du dispositif">${[['complet', 'Complet', 'réussite : +pts, +6 satisf.'], ['reduit', 'Réduit', 'moitié des agents'], ['aucun', 'Aucun', 'échec : −10 satisf.']].map(([k, t, dsc]) => `
        <button type="button" data-action="op-niveau" data-v="${k}" aria-pressed="${d.operation === k}"><span class="t">${t}</span><span class="d">${dsc}</span></button>`).join('')}</div>
      <div class="col" id="op-couv" style="gap:2px">${opCouvHtml(e)}</div>
      ${demandeRenfortHtml()}
    </section>`; })() : ''}

    <section class="card affect" aria-label="Affectation des agents">
      <div class="between" style="align-items:baseline;margin-bottom:2px"><h2 class="card-title">Affectation</h2>
        <button type="button" class="lien-statut" data-action="ventilation" aria-expanded="${!!S.ventilation}"><span id="alloc-status">${statusHtml(e)}</span><span class="tiny muted"> · ${S.ventilation ? 'masquer' : 'détail'}</span>${agentsHorsServices().some((h) => h.bloque) ? ' <span class="small bad">· agents bloqués</span>' : ''}</button></div>
      ${S.ventilation ? ventilationHtml(z, e) : ''}
      ${SERVICES.map((s2) => `<div class="svc">
        <div class="svc-l"><i class="svc-c" style="background:${COUL_SVC[s2]}"></i>
          <span class="svc-t"><span class="svc-n">${s2 === 'admin' ? 'Accueil / admin.' : SERVICE_LABELS[s2]} <span class="svc-niv">niv. ${z.niveaux[s2]}</span></span><span class="svc-r" id="res-${s2}">${resultatService(e, s2)}</span></span>
          <button type="button" class="helpbtn" data-action="help" data-s="${s2}" aria-expanded="${!!(S.help && S.help[s2])}" aria-label="À quoi sert ${SERVICE_LABELS[s2]} ?">?</button>
          <span class="stepper"><button type="button" data-action="alloc" data-s="${s2}" data-d="-1" aria-label="Un agent de moins en ${SERVICE_LABELS[s2]}" ${d.alloc[s2] <= 0 ? 'disabled' : ''}>−</button><span class="n">${d.alloc[s2]}</span><button type="button" data-action="alloc" data-s="${s2}" data-d="1" aria-label="Un agent de plus en ${SERVICE_LABELS[s2]}">+</button></span></div>
        <span id="pris-${s2}" class="svc-plus">${prisHtml(e, s2)}</span>
        ${dep.reserve && dep.reserveService === s2 ? `<span class="tiny svc-plus" style="color:var(--amber-soft)">+ ${dep.reserve} agent${dep.reserve > 1 ? 's' : ''} de réserve en renfort (efficacité ${Math.round(DEPENSES.reserve.efficacite * 100)} %)</span>` : ''}
        ${s2 === 'recherche' ? `<div class="svc-plus" id="dos-recherche">${dossiersHtml(z, e)}</div>` : ''}
        ${S.help && S.help[s2] ? `<p class="tiny svc-plus" style="margin:2px 0 6px;color:var(--text2);line-height:1.45">${esc(aide(s2, z))}</p>` : ''}
      </div>`).join('')}
      ${reserveHtml(z, d, e)}
      <p class="tiny muted" style="margin:6px 0 0">Touche + : si aucun agent n’est libre, il est pris dans ton service le plus fourni. Résultats estimés : le hasard du tour peut les faire varier.</p>
    </section>

    <section class="col" aria-label="Rythme" style="gap:8px"><h2 class="section" style="margin:0">Rythme de travail</h2>
      <div class="seg creux" role="group" aria-label="Rythme de travail">${Object.entries(RYTHMES).map(([k, r]) => `
        <button type="button" data-action="rythme" data-v="${k}" aria-pressed="${d.rythme === k}" ${k === 'renforce' && sousTutelle(z, T) ? 'disabled' : ''}><span class="t">${r.label}</span><span class="d">${k === 'renforce' && sousTutelle(z, T) ? 'interdit sous tutelle' : r.sub}</span></button>`).join('')}</div>
      ${z.renforceSuite >= 2 && d.rythme === 'renforce' ? '<p class="small bad" style="margin:0">Attention : plus de 3 tours renforcés d’affilée exposent à l’épuisement.</p>' : ''}
    </section>

    ${prisesHtml()}
    ${pliGroupe([pliItem('nondroit', 'Zone de non-droit', (() => { const n = agentsND(d); const sects = Object.keys(d.secteurs || {}).filter((k) => d.secteurs[k]); return n ? `${n} agent${n > 1 ? 's' : ''} sur ${sects.map((k) => esc(nomSecteur(k))).join(', ')}` : 'Aucun agent ce soir'; })(), `<div class="col" style="gap:6px">${Object.entries(d.secteurs || {}).filter(([, n]) => n).map(([k, n]) => `<div class="between"><span class="small" style="font-weight:600">${esc(nomSecteur(k))}</span><span class="tiny ok">${n} agent${n > 1 ? 's' : ''}</span></div>`).join('')}
      <p class="tiny muted" style="margin:0">Le centre de la ville, à reprendre au milieu avec les autres zones. Les agents envoyés sont pris sur tes services pour la journée. Une figure de ton équipe peut mener l’assaut : plus de force, deux fois moins de blessés (section « Mon équipe »).</p>
      <a class="btn small primary block" href="#terrain">Choisir les secteurs sur le Terrain</a></div>`),
    pliItem('equipe', 'Mon équipe', (() => { const mi = missionValide(d); const m = mi && (z.equipe || []).find((x) => x.role === mi.role); return m ? `${esc(m.prenom)} en mission ${mi.type === 'nondroit' ? 'en zone de non-droit' : 'en renfort'}` : 'Chacun encadre son service'; })(), equipeOrdres(z, d)),
    st.affaires.length ? pliItem('affaires', 'Affaires disputées', nbEng ? `${nbEng} affaire${nbEng > 1 ? 's' : ''} engagée${nbEng > 1 ? 's' : ''} sur ${st.affaires.length}` : `${st.affaires.length} affaire${st.affaires.length > 1 ? 's' : ''} ouverte${st.affaires.length > 1 ? 's' : ''} · aucun agent engagé`, `<div class="col" style="gap:8px">${affairesHtml}</div>`) : null,
    pliItem('decision', 'Grande décision', `${esc(d.decision || d.sansDecision ? decisionLabel(z, d.decision) : 'Pas encore choisie')}${d.decision ? ` · ${coutDecision(z, d.decision)} k€` : ''}`, decisionHtml, !d.decision && !d.sansDecision, !d.decision && !d.sansDecision ? 'à choisir' : null),
    pliItem('depenses', 'Dépenses du jour', cab && !dep.carrosserie ? `${cab} véhicule${cab > 1 ? 's' : ''} cabossé${cab > 1 ? 's' : ''} à réparer${nbDep ? ` · ${nbDep} dépense${nbDep > 1 ? 's' : ''}` : ''}` : nbDep ? `${nbDep} dépense${nbDep > 1 ? 's' : ''} · ${fmt1(e.coutDep)} k€` : 'Aucune', depensesHtml, cab > 0 && !dep.carrosserie, cab > 0 && !dep.carrosserie ? 'à réparer' : null)])}

    <a class="small" href="#guide-ordres" style="text-align:center;padding:10px">Comment fonctionnent les ordres ?</a>
  </main>${tabbar('ordres')}`;
}
