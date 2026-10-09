import { chefACreer, creationChefHtml, portraitChef, ficheChefHtml, chefNuitHtml, zoneAvecAgenda } from './chef.js';
import { absenceHtml, semaineHtml } from './chef-semaine.js';
import { humeurReseau } from '../engine/chef.js';
import { titresDefi } from './defis.js';
import { DOCTRINES } from '../engine/constants.js';
import { doctrineOuverte, dernierJourDoctrine } from '../engine/regles.js';
import { maxDemarchesDe } from '../engine/enquete.js';
import { cetteNuitHtml, pistesHpHtml } from './pistes.js';
import { noteVue } from './nouveautes.js';
import { actuHtml, actuLigne } from './actu.js';
// Écran HP d'avant la saison 2 (règles v1) : gardé tel quel jusqu'à la bascule de saison, puis remplacé par hp.js.
import { cabossesChoisis } from '../engine/parc.js';
import { S, esc, icon, fmt1, fmtK, gauge, tabbar, rangDe, gradeInfo, myZone, skyline, cielStyle, slotsJour, slotsCompte } from './common.js';
import { agentsDisponibles, blessesActifs, enFormation, vehiculesDisponibles } from '../engine/zone.js';
import { coutCarrosserie } from '../engine/sinistres.js';
import { formatCountdown, formatDateBe } from '../engine/time.js';
import { QUEST_LABELS } from '../quests/quests.js';
import { COULEURS_ZONE } from '../engine/constants.js';
import { estimations } from './ordres.js';
import { vagueTodo, vagueEnvoyeeAlerte } from './vagues.js';
import { releveTodos, releveHtml } from './releve.js';
import { bilanTodo, bilanHtml } from './bilan.js';
import { criseTodo, criseHtml } from './crise.js';
import { operationActive } from '../engine/zone.js';
import { cielDe, dilemmeDuJour, feuilletonEnCours, pressionsVisibles } from '../engine/directeur.js';
import { fipaCards } from './fipa.js';
import { blasonSvg, BLASONS, insigne } from './blasons.js';
import { GRADES, gradeFor } from '../engine/constants.js';
import { PERIL } from '../engine/rivalites.js';
import { aFairePactes } from './pactes.js';
import { affaire, dossierDe, pointsDecouverte, ENQ, toursTraque, delaiTraque, PRIME_LABELS } from '../engine/enquete.js';
import { aideBtn } from './aide.js';
import { sceneCarteHtml, sceneZone, monDecor, mesSkins } from './logistique.js';
import { encheresHtml } from './encheres.js';
import { TUTELLE } from '../engine/constants.js';
import { equipeHtml, tropheesHtml } from './equipe.js';
import { TROPHEES } from '../engine/equipe.js';
import { fraisFixes, pointsIpz, IPZ_LABELS, confianceCommune, moralMult, moyenneIpz } from '../engine/zone.js';
const AIDE_COMP = { satisfaction: 'satisfaction', affaires: 'terrain', moral: 'moral', budget: 'budgetIpz', reputation: 'reputation' };
import { IPZ_POIDS, TERRAIN, BUDGET_IPZ } from '../engine/constants.js';
const fraisFixesDuJour = (z) => { let amendes = 0; try { amendes = estimations().amendes; } catch (e) { /* pas de brouillon */ } return fraisFixes(z, S.state, { amendes, rythme: (S.draft && S.draft.rythme) || 'normal' }).total; };
import { appelsRenfort, renfortPrevu } from './renfort.js';
import { secteursEnDanger, agentsND } from './nondroit.js';
import { nomSecteur } from '../engine/nondroit.js';
import { incidentsHtml, duree } from './incidents.js';

/** Petite flèche d'évolution depuis la veille. */
function delta(v, avant) {
  if (avant === undefined || avant === null) return '';
  const d = Math.round((v - avant) * 10) / 10;
  if (Math.abs(d) < 0.05) return '';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${fmt1(Math.abs(d))}</span>`;
}

/** Variation d'un montant (k€ en interne), affichée en euros comme le montant lui-même. */
function deltaEuros(v, avant) {
  const d = Math.round((v - avant) * 10) / 10;
  if (Math.abs(d) < 0.05) return '';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${fmtK(Math.abs(d))}</span>`;
}

/** Variation depuis la veille, en petite pastille colorée. */
function pastilleDelta(v, avant) {
  if (avant === undefined || avant === null) return '';
  const d = Math.round((v - avant) * 10) / 10;
  if (Math.abs(d) < 0.05) return '';
  return `<span class="pdelta ${d > 0 ? 'up' : 'down'}" aria-label="${d > 0 ? 'en hausse' : 'en baisse'} de ${fmt1(Math.abs(d))} depuis hier">${d > 0 ? '▲' : '▼'} ${fmt1(Math.abs(d))}</span>`;
}
/**
 * Un cadran de « Ma zone » : arc de 0 à 100, valeur au centre, variation en pastille, nom (touche pour l'aide)
 * et une ligne de détail.
 */
function cadran(label, value, color, aide, dl, detail) {
  const v = Math.round(value), f = Math.max(0, Math.min(100, value)) / 100;
  // Arc de 240° : longueur relative 2/3 du cercle (r = 30, circonférence ≈ 188,5).
  const L = 2 * Math.PI * 30, arc = L * 2 / 3;
  return `<div class="cadran">
    <svg viewBox="0 3 80 68" class="cad-svg" role="img" aria-label="${esc(label)} : ${v} sur 100">
      <circle cx="40" cy="40" r="30" fill="none" stroke="var(--surface2)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${arc.toFixed(1)} ${L.toFixed(1)}" transform="rotate(150 40 40)"/>
      <circle cx="40" cy="40" r="30" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(arc * f).toFixed(1)} ${L.toFixed(1)}" transform="rotate(150 40 40)"/>
      <text x="40" y="47" text-anchor="middle" class="cad-v">${v}</text>
    </svg>
    <div class="cad-txt">
      <button type="button" class="cad-l" data-action="aide" data-k="${aide}" aria-label="Aide : ${esc(label)}">${esc(label)} <span class="cad-q" aria-hidden="true">?</span></button>
      <span class="cad-d">${dl || '<span class="tiny muted">stable</span>'}</span>
      <span class="cad-s">${detail}</span>
    </div>
  </div>`;
}

const evol = (v) => (Math.abs(v) < 0.1 ? '<span class="muted">=</span>' : `<span class="${v > 0 ? 'ok' : 'bad'}">${v > 0 ? '▲' : '▼'}${fmt1(Math.abs(v))}</span>`);
const sgn1 = (v) => `${v > 0 ? '+' : '−'}${fmt1(Math.abs(v))}`;

/** Tableau « Détail de l'IPZ » : ce que chaque composante rapporte, et son évolution depuis la veille. */
function ipzDetailHtml(d) {
  if (!d.ipzComp) return '';
  const pts = pointsIpz(d.ipzComp), ptsH = d.ipzCompHier ? pointsIpz(d.ipzCompHier) : null;
  const delta = d.hierIpz !== null && d.hierIpz !== undefined && d.ipzCompHier ? Math.round((d.ipz - d.hierIpz) * 10) / 10 : null;
  const ligne = (k) => `<tr><td>${IPZ_LABELS[k]}${aideBtn(AIDE_COMP[k], `Comment est calculé : ${IPZ_LABELS[k]}`)}</td><td class="mono">${Math.round(d.ipzComp[k])}</td><td class="mono muted">×${Math.round(IPZ_POIDS[k] * 100)} %</td><td class="mono">${fmt1(pts[k])}</td><td class="mono">${ptsH ? evol(Math.round((pts[k] - ptsH[k]) * 10) / 10) : ''}</td></tr>`;
  const det = d.ipzDetail;
  return `<div class="col" style="gap:4px">
    <div class="between"><span style="font-weight:700">IPZ ${fmt1(d.ipz)}</span>${delta !== null ? `<span class="small">${evol(delta)} depuis la veille</span>` : ''}</div>
    <table class="ipz-table"><thead><tr><th>Composante</th><th>Valeur</th><th>Poids</th><th>Points</th><th>vs veille</th></tr></thead>
      <tbody>${Object.keys(IPZ_POIDS).map(ligne).join('')}</tbody></table>
    <details class="formule"><summary class="tiny muted">Comment c’est calculé ? ${icon('chevron', 12)}</summary><span class="tiny muted"><strong>Résultats terrain</strong> (ce ne sont pas les PS, qui servent aux grades) = ${TERRAIN.incidents} × part des incidents traités + ${fmt1(TERRAIN.parPoint)} × bilan des points (points du jour + ${Math.round(TERRAIN.report * 100)} % du bilan d’hier), plafonné à 100${det ? ` · ce tour : ${det.traites}/${det.incidents} incidents, ${fmt1(det.points)} points, bilan ${fmt1(det.bilan !== undefined ? det.bilan : det.points)}` : ''}. <strong>Budget</strong> = ${BUDGET_IPZ.revenu.base} + ${BUDGET_IPZ.revenu.parK} par tranche de 1 000 € de revenu moyen des ${BUDGET_IPZ.jours} derniers jours (tes achats ne comptent pas ; 100 dès 15 000 € par jour).</span></details>
  </div>`;
}

const JAUGES = [['moral', 'Moral'], ['satisfaction', 'Satisfaction'], ['reputation', 'Réputation']];
/** « Pourquoi mes jauges ont bougé » : chaque variation du tour, avec sa cause. */
function journalHtml(j) {
  if (!j || !j.lignes) return '';
  const bloc = (k, nom) => {
    const l = (j.lignes[k] || []).slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    const av = j.avant && j.avant[k], ap = j.apres && j.apres[k];
    const tot = av !== undefined && ap !== undefined ? Math.round((ap - av) * 10) / 10 : null;
    return `<details class="journal"><summary><span style="font-weight:600">${nom}</span><span class="mono small">${av !== undefined ? `${fmt1(av)} → ${fmt1(ap)} ` : ''}${tot !== null ? evol(tot) : ''}</span></summary>
      ${l.length ? l.map((x) => `<div class="between small j-l"><span>${esc(x.l)}</span><span class="mono ${x.v > 0 ? 'ok' : 'bad'}">${sgn1(x.v)}</span></div>`).join('') : '<p class="tiny muted" style="margin:0">Aucun changement.</p>'}</details>`;
  };
  const pts = j.lignes.points || [];
  return `<div class="col" style="gap:2px"><span class="kicker" style="margin-top:4px">Pourquoi tes jauges ont bougé</span>
    ${JAUGES.map(([k, n]) => bloc(k, n)).join('')}
    ${pts.length ? `<details class="journal"><summary><span style="font-weight:600">Points de résultats terrain</span><span class="mono small">${fmt1(pts.reduce((s2, x) => s2 + x.v, 0))}</span></summary>
      ${pts.map((x) => `<div class="between small j-l"><span>${esc(x.l)}</span><span class="mono ok">${sgn1(x.v)}</span></div>`).join('')}</details>` : ''}
    <span class="tiny muted">Touche une jauge pour voir le détail, de la plus grosse cause à la plus petite.</span></div>`;
}

/** Rapport d'un tour : le dernier (données de la zone) ou un plus ancien (archives de la Gazette). */
function rapportHtml(z) {
  // Le dernier rapport vient de la zone elle-même ; les plus anciens, des Gazettes archivées,
  // triées par saison et tour (et jamais le tour du dernier rapport en double).
  const st = S.state;
  const tourLive = z.journal ? z.journal.tour : (st.turn > 1 ? st.turn - 1 : null);
  const saisonLive = st.season;
  const archives = (S.gazettes || [])
    .filter((g) => g.rapports && g.rapports[z.uid] && !(g.season === saisonLive && g.turn === tourLive))
    .sort((a, b) => (b.season - a.season) || (b.turn - a.turn));
  const entrees = [null, ...archives];
  const idx = Math.max(0, Math.min(entrees.length - 1, S.rapportIdx || 0));
  const g = entrees[idx];
  const d = !g
    ? { tour: tourLive, date: st.lastResolvedAt, lignes: z.rapport, journal: z.journal, ipz: z.ipz, ipzComp: z.ipzComp, ipzCompHier: z.ipzCompHier, ipzDetail: z.ipzDetail, hierIpz: z.hier ? z.hier.ipz : null }
    : { tour: g.turn, saison: g.season, date: g.date, lignes: g.rapports[z.uid], ...((g.journaux && g.journaux[z.uid]) || {}) };
  const lignes = (d.lignes && d.lignes.length ? d.lignes.filter((l) => !(d.ipzComp && l.startsWith('IPZ du jour'))) : ['Pas encore de rapport : le premier tour n’a pas été résolu.']);
  const nav = entrees.length > 1 ? `<span class="row" style="gap:4px">
      <button type="button" class="iconbtn" data-action="rapport-nav" data-d="1" ${idx >= entrees.length - 1 ? 'disabled' : ''} aria-label="Tour précédent" style="width:34px;height:34px">${icon('back', 16)}</button>
      <button type="button" class="iconbtn" data-action="rapport-nav" data-d="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Tour suivant" style="width:34px;height:34px">${icon('chevron', 16)}</button></span>` : '';
  return `<div class="card tight" id="rapport-complet" style="scroll-margin-top:16px">
    <div class="between"><span class="kicker">Rapport du tour ${d.tour || ''}${d.saison && d.saison !== saisonLive ? ` (saison ${d.saison})` : ''}${d.date ? ` · soir du ${formatDateBe(d.date)}` : ''}${idx === 0 ? ' · le dernier' : ''}</span>${nav}</div>
    ${ipzDetailHtml(d)}
    ${journalHtml(d.journal)}
    ${!d.journal && idx > 0 ? '<p class="tiny muted" style="margin:0">Détail des jauges indisponible pour les tours d’avant la mise à jour.</p>' : ''}
    <span class="kicker" style="margin-top:6px">Tout ce qui s’est passé</span>
    <div class="faits">${lignes.map(faitHtml).join('')}</div></div>`;
}

/** Une ligne du rapport : icône du service, intitulé en gras, ton (bon / mauvais / neutre) en liseré. */
const FAITS_ICO = [
  [/^(Intervention|Urgence|Colis|Bitonal)/i, '🚨'], [/^(Recherche|Enquête|Appui|Voisinage|Dossier|Pièce|Traque)/i, '🔎'],
  [/^(Proximité|Patrouille|Point chaud|Flagrant|Quartier|Vague)/i, '🏘'], [/^(Roulage|Flotte|Véhicule|Garage)/i, '🚓'],
  [/^(Accueil|Paperasse)/i, '🗂'], [/^(Moral|Équipe|Chef|Agent|Formation|Recrut)/i, '👮'], [/^(Incident|Imprévu|Coup dur)/i, '⚠️'],
  [/^(Décision|Plan|Conseil|Pacte|District|Crise|Défi|Relève)/i, '🏛'], [/^(Budget|Salle|Vente|Enchère|Subside|Prime)/i, '💶'],
  [/^(Zone de non-droit|Non-droit|Assaut)/i, '🧱'], [/^(Pas d’ordres|Pilote)/i, '🤖'], [/^(Énigme|Challenge)/i, '🧩'],
];
function faitHtml(l) {
  const ico = (FAITS_ICO.find(([re]) => re.test(l)) || [null, '•'])[1];
  const mauvais = /^Décision refusée|personne n’est venu|n’a rien donné|refusée|bless|−\d|-\d|manqu|échou|raté|perdu/i.test(l);
  const bon = !mauvais && /\+\d|réussi|élucidé|interpellé|repris|gagn/i.test(l);
  const m = l.match(/^([^:·]{2,48}?)\s*[:·]\s+(.*)$/s);
  const corps = m ? `<strong>${esc(m[1])}</strong> · ${esc(m[2])}` : esc(l);
  return `<div class="fait ${mauvais ? 'mauvais' : bon ? 'bon' : ''}${/^Décision refusée/.test(l) ? ' alerte' : ''}"><span class="fait-i" aria-hidden="true">${ico}</span><span class="small">${corps}</span></div>`;
}

function cleNuit(z) { return `mazp-nuit-${S.backend.gameId ? S.backend.gameId() : ''}-${S.state.season}-${S.state.turn}-${z.uid}`; }

/** HP allégée : en service pour tous (8 oct. 2026). */
function hpCompacte() {
  return true;
}

/** Carte « Résultat de la nuit », affichée jusqu'à ce que le joueur la ferme. */
function nuitHtml(z) {
  // Inutile quand le rapport complet est ouvert juste en dessous : il dit la même chose, en entier.
  if (!z.hier || !z.rapport || !z.rapport.length || S.nuitVue === cleNuit(z) || S.showRapport) return '';
  try { if (localStorage.getItem(cleNuit(z))) return ''; } catch (e) { /* pas de stockage : on l'affiche */ }
  const lignes = [
    ['IPZ', z.ipz, z.hier.ipz], ['Satisfaction', z.satisfaction, z.hier.satisfaction], ['Moral', z.moral, z.hier.moral],
    ['Budget', z.budget, z.hier.budget, ' k€'], ['Réputation', z.reputation, z.hier.reputation],
  ].filter(([, v, a]) => a !== undefined && Math.abs(v - a) >= 0.05);
  // Une décision refusée passe toujours en tête (sinon elle se perd dans le rapport).
  const refusees = z.rapport.filter((l) => /^Décision refusée/.test(l));
  const importants = [...refusees, ...z.rapport.filter((l) => !/^Pas d’ordres/.test(l) && !/^Décision refusée/.test(l))].slice(0, 4);
  return `<section class="card" aria-label="Résultat de la nuit" style="border-color:var(--blue-soft)">
    <div class="between"><span class="kicker" style="color:var(--blue-soft)">Résultat de la nuit · tour ${S.state.turn - 1 || ''}</span>
      <button class="btn small ghost" data-action="nuit-ok">OK</button></div>
    ${lignes.length ? `<div class="row" style="gap:6px;flex-wrap:wrap">${lignes.map(([l, v, a, u]) => `<span class="pill">${l} ${u ? fmtK(v) : fmt1(v)} ${u ? deltaEuros(v, a) : delta(v, a)}</span>`).join('')}</div>` : ''}
    ${(() => {
      const ps = importants.map((l) => `<p class="small" style="margin:0;color:${/^Décision refusée/.test(l) ? 'var(--red-soft);font-weight:700' : 'var(--text2)'}">• ${esc(l)}</p>`);
      if (!hpCompacte()) return `<div class="col" style="gap:4px">${ps.join('')}</div>`;
      // Allégée : une décision refusée reste visible, le reste se déplie.
      const nRef = refusees.length;
      return `${nRef ? `<div class="col" style="gap:4px">${ps.slice(0, nRef).join('')}</div>` : ''}${ps.length > nRef ? `<details class="nuit-plus"><summary>Ce qui s’est passé · ${ps.length - nRef} fait${ps.length - nRef > 1 ? 's' : ''}</summary><div class="col" style="gap:4px;margin-top:6px">${ps.slice(nRef).join('')}</div></details>` : ''}`;
    })()}
    <div class="row"><button class="btn small grow" data-action="voir-rapport">Rapport complet</button><a class="btn small grow" href="#gazette">La Gazette</a></div>
  </section>`;
}

/** Le joueur a-t-il déjà ouvert les « Premiers pas » du guide ? */
function premiersPasVus() {
  if (S.premiersPasVus) return true;
  try { return !!localStorage.getItem('mazp-premiers-pas-vus'); } catch (e) { return false; }
}

/** Liste de ce qu'il reste à faire avant 20:00. */
/** Situation du jour en pastilles sous le compte à rebours ; le détail complet reste dans les Ordres. */
function situationPastilles(z, ciel) {
  const l = pressionsVisibles(S.state, z);
  const cielP = `<button type="button" class="pill ciel-pill ciel-p-${ciel.id}" data-action="aide" data-k="ciel" title="${esc(ciel.texte)}">${esc(ciel.nom)} ›</button>`;
  return `<div class="soir-situ" aria-label="Situation du jour">${cielP}${l.map((p) => `<a class="pill ${p.feuilleton ? 'violet' : p.district ? 'blue' : 'amber'}" href="${p.feuilleton && p.quartier != null ? '#carte' : '#ordres'}" title="${esc(p.texte)}">${esc(p.titre)}${String(p.texte || '').length <= 32 ? ` · ${esc(p.texte.replace(/\.$/, ''))}` : ' ›'}</a>`).join('')}</div>`;
}

function meteoHtml(c) {
  if (c.id === 'calme') return '';
  const nuages = c.id === 'eclaircie' ? 2 : c.id === 'montee' ? 3 : 4;
  return `<span class="meteo meteo-${c.id}" aria-hidden="true">${c.id === 'eclaircie' ? '<i class="m-arc"></i>' : ''}${Array.from({ length: nuages }, (_, i) => `<i class="m-nuage n${i}"></i>`).join('')}${c.id === 'orage' ? '<i class="m-pluie"></i><i class="m-eclair"></i>' : ''}</span>`;
}

/** Dilemme du Directeur : une carte, deux choix, envoyés avec les ordres. */
function dilemmeHtml(st, z) {
  const dl = dilemmeDuJour(st, z);
  if (!dl) return '';
  const perso = { appelBourgmestre: 'bourgmestre', appelMarche: 'bourgmestre', appelProcureur: 'procureur', appelSyndicat: 'syndicat', appelPresse: 'journaliste' }[dl.id] || null;
  const d = S.draft || {};
  const pris = Number.isInteger(d.dilemme) ? d.dilemme : null;
  const enregistre = pris !== null && S.savedOrders && S.savedOrders.dilemme === pris && !S.ordersDirty;
  return `<section class="card dilemme" id="hp-dilemme" aria-label="Dilemme du jour">
    <span class="kicker">${perso ? 'Appel pour ton chef' : 'Dilemme du jour'} · ${esc(dl.titre)}</span>
    ${perso ? `<div class="row" style="gap:10px;align-items:center"><img src="img/bureau/${perso}-${humeurReseau(z, perso) > 0 ? 1 : humeurReseau(z, perso) < 0 ? '-1' : 0}.webp" alt="" width="56" height="56" style="border-radius:12px;flex-shrink:0"><p class="dil-q" style="margin:0">${esc(dl.question)}</p></div>` : `<p class="dil-q">${esc(dl.question)}</p>`}
    <div class="dil-choix">${dl.choix.map((c, i) => `<button type="button" class="dil-btn${c.chef ? ' dil-chef' : ''}" data-action="dilemme" data-i="${i}" aria-pressed="${pris === i}"><span class="t">${c.chef ? `${portraitChef(z.uid, 20, { galons: false })} ` : ''}${esc(c.l)}</span><span class="s">${esc(c.s)}</span></button>`).join('')}</div>
    <p class="tiny muted" style="margin:0">${pris === null ? `Sans réponse à 20:00, ton adjoint choisira « ${esc(dl.choix[dl.defaut].l)} ».` : enregistre ? 'Choix enregistré avec tes ordres. Tu peux encore changer d’avis.' : 'Valide tes ordres pour l’envoyer.'}</p>
    ${pris !== null && !enregistre ? '<button type="button" class="btn primary small" data-action="save-orders">Valider mes ordres</button>' : ''}
  </section>`;
}

function ceSoirHtml(st, z, { ordresOk, faites, reussies, delegue }) {
  const d = S.draft || {};
  const ciel = cielDe(z);
  const nbDem = (d.demarches || []).length;
  const items = [];
  items.push({ ok: ordresOk, href: '#ordres', t: ordresOk ? 'Ordres validés' : S.ordersDirty ? 'Ordres modifiés : à valider' : 'Passer et valider tes ordres', s: ordresOk ? 'modifiables jusqu’à 20:00' : 'sans ordres validés, ce tour ne compte pas pour le classement' });
  items.push({ ok: !!d.decision || !!d.sansDecision, href: '#ordres-decision', t: d.decision ? 'Grande décision choisie' : d.sansDecision ? 'Grande décision : aucune ce soir' : 'Grande décision', s: d.decision ? 'payée à 20:00 si le budget le permet' : d.sansDecision ? 'tu peux encore changer d’avis' : 'en choisir une, ou « Aucune ce soir »' });
  const pc = z.pointChaud;
  if (pc) {
    const a = (d.patrouilles || {})[pc.cell] || 0;
    items.push({ ok: a >= 2, href: '#carte', t: a >= 2 ? `Point chaud : ${a} agents envoyés` : `Point chaud : ${pc.titre.toLowerCase()}`, s: a >= 2 ? 'désamorcé à 20:00 si tes ordres sont validés' : 'envoie 2 patrouilles depuis la Carte' });
  }
  if (st.enquete) items.push({ ok: nbDem >= 1 || (d.accusation !== null && d.accusation !== undefined), href: '#enquete', t: `Enquête : ${nbDem} démarche${nbDem > 1 ? 's' : ''} sur ${maxDemarchesDe(st, zoneAvecAgenda())}`, s: (st.traques || []).length ? 'une traque est en cours !' : 'constatations, vérifications, partage, accusation' });
  // Le Directeur : dilemme à trancher, feuilleton à préparer pour ce soir.
  const dl = dilemmeDuJour(st, z);
  if (dl) items.unshift({ ok: Number.isInteger(d.dilemme), href: '#hp-dilemme', t: `Dilemme : ${esc(dl.titre.toLowerCase())}`, s: Number.isInteger(d.dilemme) ? `« ${esc(dl.choix[d.dilemme].l)} »` : 'deux choix, à trancher avant 20:00' });
  // Feuilletons, fugitif à la frontière, Fantôme : ce qu'il faut ce soir (patrouilles dans un quartier ou agents dans un service).
  const fe = feuilletonEnCours(st, z);
  for (const sg of (z.pressions || []).filter((p) => (p.feuilleton || p.coop) && (p.quartier != null || p.service))) {
    if (sg.feuilleton && !(fe && fe.tour === st.turn)) continue; // audit annoncé plusieurs jours à l'avance : pas encore ce soir
    const al = d.alloc || {};
    const ok = sg.quartier != null ? ((d.patrouilles || {})[sg.quartier] || 0) >= (sg.patrouilles || 2) : (al[sg.service] || 0) >= sg.min && (!sg.service2 || (al[sg.service2] || 0) >= sg.min2);
    items.unshift({ ok, href: sg.quartier != null ? '#carte' : '#ordres', t: esc(sg.titre), s: esc(sg.texte) });
  }
  { let vt = null; try { vt = vagueTodo(estimations()); } catch (e) { /* pas de brouillon */ } if (vt) items.unshift(vt); }
  for (const x of releveTodos()) items.unshift(x);
  { const bt = bilanTodo(); if (bt) items.unshift(bt); }
  // Doctrine de la saison (règles v2) : le seul choix nouveau des premiers jours.
  if (doctrineOuverte(st, z)) { const dc = d.doctrine && DOCTRINES[d.doctrine]; const r = dernierJourDoctrine(z) - st.turn; items.unshift({ ok: !!dc, href: '#ordres', t: dc ? `Doctrine : ${dc.ico} ${esc(dc.nom)}` : 'Choisis la doctrine de ta zone', s: dc ? 'fixée pour la saison avec tes ordres de ce soir' : r <= 0 ? 'dernier jour, ensuite la saison se joue sans doctrine' : `dans tes ordres, encore ${r + 1} jours` }); }
  { const ct = criseTodo(); if (ct) items.unshift(ct); }
  // Un incident ouvert a déjà sa carte (avec son compte à rebours) juste sous la liste : pas de ligne en double ici.
  items.push(delegue ? { ok: true, href: '#quete', t: delegue.statut === 'quiz' ? `Quiz express : ${Number(delegue.tentatives) || 0} sur 5` : 'Énigmes confiées à un agent', s: delegue.statut === 'quiz' ? ((Number(delegue.tentatives) || 0) >= 3 ? (delegue.bonus ? 'bonus choisi' : 'choisis ton bonus') : 'pas de bonus') : 'résultat ce soir' } : { ok: faites >= slotsCompte().length, href: '#quete', t: `Énigmes : ${faites} sur ${slotsCompte().length}`, s: reussies >= 2 ? 'bonus débloqué' : 'bonus dès 2 bonnes réponses' });
  const fipa = (st.fipas || []).filter((f) => (f.demandeur === z.uid && f.etape === 'demande' && f.tourDecision === st.turn) || (f.partenaire === z.uid && f.etape === 'invite' && f.tourReponse === st.turn) || (f.etape === 'accepte' && f.tourJ === st.turn && (f.demandeur === z.uid || f.partenaire === z.uid)));
  if (fipa.length) items.push({ ok: !!(d.fipa || d.fipaReponse || d.fipaChoix), href: '#hp-fipa', t: 'FIPA : une décision t’attend', s: 'voir la carte FIPA ci-dessous' });
  for (const x of aFairePactes()) items.push({ ok: x.fait, href: '#pactes', t: esc(x.titre), s: esc(x.texte) });
  const reste = items.filter((i) => !i.ok).length;
  const fait = items.length - reste;
  return `<section class="card soir" aria-label="Prochain tour" style="${cielStyle()}">
    <div class="soir-ciel ciel-${ciel.id}" aria-hidden="true"><i class="soir-astre"></i>${meteoHtml(ciel)}${skyline()}</div>
    <div class="soir-tete">
      <span class="soir-l">Résolution du tour à 20:00 dans</span>
      <span id="countdown" class="soir-cd">${formatCountdown(st.nextDeadline - Date.now())}</span>
      <span class="soir-prog" role="img" aria-label="${fait} sur ${items.length} fait">${items.map((i) => `<i class="${i.ok ? 'on' : ''}"></i>`).join('')}</span>
    </div>
    ${situationPastilles(z, ciel)}
    <p class="soir-etat ${reste ? '' : 'ok'}">${reste ? `${reste} chose${reste > 1 ? 's' : ''} à faire avant ce soir` : 'Tout est prêt pour ce soir'}</p>
    ${reste ? `<div class="col soir-todo" style="gap:6px">${items.filter((i) => !hpCompacte() || !i.ok).map((i) => `<a class="todo ${i.ok ? 'done' : ''}" href="${i.href}"><span class="box" aria-hidden="true">${i.ok ? icon('check', 14) : ''}</span>
      <span class="col grow" style="gap:0;min-width:0"><span style="font-weight:600">${i.t}</span><span class="tiny muted">${i.s}</span></span>${icon('chevron', 16)}</a>`).join('')}
      ${hpCompacte() && fait ? `<span class="soir-faits">${icon('check', 12)} ${fait} déjà fait${fait > 1 ? 's' : ''} : ${items.filter((i) => i.ok).map((i) => i.t.replace(/ :.*$/, '')).join(' · ')}</span>` : ''}</div>` : ''}
  </section>`;
}

export function renderHPAncien() {
  const st = S.state, z = myZone();
  const T = st.turn;
  const { g, n, pct } = gradeInfo(z.ps);
  const { rang, total } = rangDe(z.uid);
  const dispo = agentsDisponibles(z, T);
  const blesses = blessesActifs(z, T);
  const form = enFormation(z, T);
  const vDispo = vehiculesDisponibles(z, T);
  const ordresOk = !!S.savedOrders && !S.ordersDirty;
  const qr = S.questResults || [];
  const compte = slotsCompte().map((k) => qr[k]);
  const faites = compte.filter((r) => r && (r.statut === 'ok' || r.statut === 'rate')).length;
  const reussies = compte.filter((r) => r && r.statut === 'ok').length;
  const delegue = qr.find((r) => r && (r.statut === 'delegue' || r.statut === 'quiz'));
  const questDone = faites >= slotsCompte().length || !!delegue;

  const alertes = [];
  const bless = z.blesses.filter((b) => b.retour > T);
  for (const b of bless) {
    const tours = b.retour - T;
    const pl = b.n > 1;
    const motif = { 'blessé': pl ? 'blessés' : 'blessé', malade: pl ? 'malades' : 'malade', 'épuisé': pl ? 'épuisés' : 'épuisé', 'enquête interne': 'en enquête interne' }[b.motif] || b.motif;
    alertes.push({ cls: 'red', titre: `${b.n} agent${pl ? 's' : ''} ${motif}`, texte: `de retour dans ${tours} tour${tours > 1 ? 's' : ''}`, href: '#ordres' });
  }
  if (st.evenement && (!st.evenement.fantome || st.evenement.tour - T <= 3)) {
    const dans = st.evenement.tour - T;
    const requis = Math.max(3, Math.round((st.evenement.parZone || 3) * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length));
    alertes.push({ cls: 'amber', titre: dans === 0 ? `${esc(st.evenement.titre)} : ce soir !` : `${esc(st.evenement.titre)} dans ${dans} tour${dans > 1 ? 's' : ''}`, texte: `environ ${requis} agents requis pour tout le district`, href: dans === 0 ? '#ordres' : '#carte' });
  }
  { const pq = z.dir && z.dir.parquet; if (pq && pq.stade && st.enquete && pq.n === st.enquete.n) alertes.push({ cls: pq.stade >= 2 ? 'red' : 'amber', titre: pq.stade >= 2 ? 'Parquet : subside judiciaire réduit' : 'Parquet : dossier trop dépendant', texte: `${Math.round(pq.part * 100)} % de ton dossier vient des autres zones (${pq.recues} reçues, ${pq.propres} à toi) · fais tes propres démarches`, href: '#enquete' }); }
  const cab = (z.cabosses || []).length;
  if (cab) {
    const choix = cabossesChoisis(z, S.draft && S.draft.depenses && S.draft.depenses.carrosserie), prevu = choix.length;
    alertes.push({ cls: prevu ? 'blue' : 'red', titre: `${cab} véhicule${cab > 1 ? 's' : ''} cabossé${cab > 1 ? 's' : ''}`, texte: prevu ? `${prevu < cab ? `${prevu} sur ${cab} ` : ''}en carrosserie ce soir (${fmt1(coutCarrosserie(z, choix))} k€)` : `carrosserie dans tes dépenses (${fmt1(coutCarrosserie(z))} k€), sinon ton image en prend un coup chaque tour`, href: '#ordres' });
  }
  if (z.primeAChoisir) {
    // Choix fait : plus une alerte à traiter, juste un rappel discret en bas de la liste.
    const ch = S.draft && S.draft.prime, lab = ch && PRIME_LABELS[String(ch).split(':')[0]];
    if (ch) alertes.push({ cls: 'blue', titre: `✓ Mise à prix : ${lab ? esc(lab.nom.toLowerCase()) : 'récompense'} choisi${lab && /^(confiscation|formation)/.test(String(ch)) ? 'e' : ''}`, texte: 'appliqué à 20:00 · tu peux encore changer d’avis dans les Ordres', href: '#ordres' });
    else alertes.unshift({ cls: 'amber', titre: `Mise à prix : ${esc(z.primeAChoisir.suspect)} sous les verrous, choisis ta récompense`, texte: '12 k€, renfort fédéral ou formation offerte, avant 20:00', href: '#ordres' });
  }
  for (const x of z.indemnites || []) alertes.push({ cls: 'blue', titre: `Assurance : +${fmt1(x.montant)} k€ attendus`, texte: `remboursement du véhicule sinistré, ${x.tour - T <= 0 ? 'ce soir' : `dans ${x.tour - T} tour${x.tour - T > 1 ? 's' : ''}`}`, href: '#ordres' });
  { const ds = z.dossiers || [], retard = ds.filter((d) => d.age > 6).length, vieux = ds.filter((d) => d.age >= 5).length;
    if (vieux) alertes.push({ cls: retard ? 'red' : 'amber', titre: retard ? `${retard} dossier${retard > 1 ? 's' : ''} en retard` : `${vieux} dossier${vieux > 1 ? 's' : ''} de 5 jours ou plus`, texte: retard ? '−0,4 de satisfaction chacun par jour : renforce la Recherche' : 'renforce la Recherche avant qu’ils coûtent de la satisfaction', href: '#ordres' }); }
  if (z.paperasse > 14) alertes.push({ cls: 'red', titre: `Paperasse : ${Math.round(z.paperasse)} dossiers en attente`, texte: `−2 de moral chaque soir tant qu’elle dépasse 14, et l’Inspection au-delà de 20 · renforce l’Accueil ou paie la sous-traitance (−5 dossiers, 3 k€)`, href: '#ordres' });
  if (z.budget < 0) alertes.push({ cls: 'red', titre: 'Budget dans le rouge', texte: 'deux tours de suite et c’est l’Inspection', href: '#ordres' });
  const vieux = z.dossiers.filter((d) => d.age > 6).length;
  if (vieux) alertes.push({ cls: 'amber', titre: `${vieux} dossier${vieux > 1 ? 's' : ''} qui traîne${vieux > 1 ? 'nt' : ''}`, texte: 'renforce la Recherche', href: '#ordres' });
  { const dg = S.draft ? secteursEnDanger() : []; if (dg.length) alertes.unshift({ cls: 'red', titre: `Zone de non-droit : ${dg.map((k) => esc(nomSecteur(k))).join(', ')} menacé${dg.length > 1 ? 's' : ''}`, texte: 'le milieu remonte : mets 2 ou 3 agents de garde ce soir', href: '#terrain' }); }
  if (st.nonDroit && S.draft && !agentsND()) { const sc = Object.values(st.nonDroit.secteurs); const hier = sc.reduce((n, x) => n + ((x.hier || []).length ? 1 : 0), 0); alertes.push({ cls: 'blue', titre: `Zone de non-droit : ${sc.filter((x) => x.statut === 'repris').length} secteur${sc.filter((x) => x.statut === 'repris').length > 1 ? 's' : ''} repris sur ${sc.length}`, texte: hier ? `des zones y étaient hier sur ${hier} secteur${hier > 1 ? 's' : ''} : rejoins-les, à plusieurs ça tombe plus vite` : 'personne n’y était hier : lance le mouvement sur la radio', href: '#terrain' }); }
  if (st.affaires.length) alertes.push({ cls: 'blue', titre: `${st.affaires.length} affaire${st.affaires.length > 1 ? 's' : ''} disputée${st.affaires.length > 1 ? 's' : ''} sur la carte`, texte: st.affaires.map((a) => esc(a.titre)).join(' · '), href: '#carte' });

  // Fin de saison programmée par le maître du jeu : prévenir tout le monde de ce qui s'arrête.
  if (st.finSaison) alertes.unshift({ cls: 'amber', titre: st.finSaison === 'enquete' ? 'Fin de saison : le soir où l’affaire en cours se clôt' : 'Fin de saison ce soir à 20:00', texte: 'L’affaire et ses traques continuent dans la saison suivante. S’arrêtent : formations et travaux en cours, pactes, défis et crise du Conseil. Bilan de saison allégé.', href: '#hp' });
  for (const x of aFairePactes()) if (!x.fait) alertes.unshift({ cls: 'amber', titre: esc(x.titre), texte: esc(x.texte), href: '#pactes' });
  for (const a of appelsRenfort()) if (!renfortPrevu(a.uid)) alertes.unshift({ cls: 'amber', titre: `${esc(a.zone.nom)} appelle du renfort`, texte: `${a.agents} agents demandés pour « ${esc(a.op.titre)} » · ${a.op.appel ? 'appel du district : renfort payé ×1,5' : 'prête des agents contre de la réputation'}`, href: '#prive' });
  const perils = Object.values(st.zones).filter((x) => (x.peril || x.tutelle) && x.uid !== z.uid);
  if (perils.length) alertes.push({ cls: 'red', titre: `${perils.map((x) => esc(x.nom)).join(', ')} en difficulté`, texte: 'un coup de main (onglet Pactes de la Carte) rapporte jusqu’à +7 de réputation', href: '#pactes' });
  const op = operationActive(z, T);
  if (op) alertes.unshift({ cls: 'red', titre: `Opération d\u2019envergure : ${esc(op.titre)}`, texte: `dispositif à régler dans tes ordres${op.duree > 1 ? ` · jour ${T - op.tourDebut + 1} sur ${op.duree}` : ''}`, href: '#ordres' });
  const tr = (st.traques || [])[0];
  if (tr) { const ta = affaire(st, tr.n); alertes.unshift({ cls: 'red', titre: `Suspect identifié : ${esc(ta.suspects[ta.coupable].nom)} en fuite`, texte: `affaire « ${esc(ta.titre)} » résolue · ${delaiTraque(toursTraque(tr))} pour trouver sa planque et l’arrêter`, href: '#enquete' }); }
  { const ve = vagueEnvoyeeAlerte(); if (ve) alertes.push(ve); }
  const dotColor = { red: 'var(--red)', amber: 'var(--amber)', blue: 'var(--blue)' };
  const last = S.gazettes[0];

  const compacte = hpCompacte();
  const MAX_ALERTES = 3;
  const ligneAlerte = (a) => `<a class="list-row" href="${a.href}" ${a.cls === 'red' ? 'style="background:var(--red-bg);border-color:var(--red-line)"' : ''}><span class="bullet" style="background:${dotColor[a.cls]}"></span>
        <span class="col" style="gap:1px"><span style="font-weight:600">${a.titre}</span><span class="small muted">${a.texte}</span></span></a>`;
  // Allégée : les alertes rouges d'abord, 3 visibles, le reste se déplie.
  const alertesTri = compacte ? alertes.slice().sort((x, y) => (x.cls === 'red' ? 0 : 1) - (y.cls === 'red' ? 0 : 1)) : alertes;
  return `<main class="screen hp${compacte ? ' compacte' : ''}">
    <header class="between" style="align-items:flex-start">
      <div class="col" style="gap:3px"><h1 class="brand">Ma ZP</h1><a class="sub" href="#parties" style="text-decoration:none">Hôtel de police · <span style="color:var(--amber-soft);text-decoration:underline">${esc((S.partie && S.partie.nom) || 'District Delta')}</span></a></div>
      <div class="col" style="gap:6px;align-items:flex-end">
        <span class="row" style="gap:6px"><span class="pill">Tour ${T} · Saison ${st.season}</span>
          <button type="button" class="iconbtn roue" data-action="menu-hp" aria-expanded="${!!S.menuHp}" aria-label="Guide, nouveautés et profil">${icon('gear', 20)}${noteVue() ? '' : '<i class="roue-pastille" aria-hidden="true"></i>'}</button></span>
        <span class="row" style="gap:8px;align-items:center">${z.chef ? `<button type="button" class="hp-chef" data-action="bureau-ouvrir" aria-label="Mon chef de corps">${portraitChef(z.uid, 34, { galons: false })}<span class="tiny">Mon chef</span></button>` : ''}
        <a href="#classement" class="row" style="gap:6px;text-decoration:none;color:var(--text)">
          ${z.chef ? '' : `<span style="color:var(--amber)">${icon('shield', 14)}</span>`}<span class="small" style="font-weight:600">${g.nom}</span>
          <span role="img" aria-label="${z.ps} points de service${n ? ` sur ${n.ps}` : ''}" style="width:56px;height:5px;background:var(--line);border-radius:3px;display:inline-block"><span style="display:block;width:${pct}%;height:5px;background:var(--amber);border-radius:3px"></span></span>
        </a></span>
      </div>
    </header>
    ${S.menuHp ? `<nav class="card menu-hp" aria-label="Menu">
      <a class="list-row" href="#guide">${icon('news', 18)}<span>Guide du joueur</span></a>
      <button type="button" class="list-row" data-action="maj-voir">${icon('star', 18)}<span>Nouveautés${noteVue() ? '' : ' <span class="tiny" style="color:var(--amber)">· nouvelle version</span>'}</span></button>
      <a class="list-row" href="#profil">${icon('gear', 18)}<span>Profil</span></a>
      ${S.backend.isMaster(S.user) ? `<a class="list-row" href="#admin">${icon('shield', 18)}<span>Maître du jeu</span></a>` : ''}
    </nav>` : ''}

    ${chefACreer() ? creationChefHtml() : ''}
    ${absenceHtml(z)}
    ${chefNuitHtml(z)}
    ${cetteNuitHtml(z)}
    ${ceSoirHtml(st, z, { ordresOk, faites, reussies, delegue })}
    ${pistesHpHtml(z)}
    ${bilanHtml()}
    ${dilemmeHtml(st, z)}
    ${semaineHtml(z)}
    ${criseHtml()}
    ${releveHtml()}
    ${compacte ? incidentsHtml({ avant: actuLigne(), titre: 'Aujourd’hui' }) : `${actuHtml()}${incidentsHtml()}`}
    <section class="card mazone" aria-label="Ma zone">
      <div class="mz-tete">
        ${S.player && S.player.blason && GRADES.indexOf(gradeFor(z.ps)) >= 4 ? blasonSvg(S.player.blason, z.couleur, 34) : `<span class="mz-coul" style="background:${esc(z.couleur)}"></span>`}
        <div class="mz-id">
          <span class="mz-sur"><span style="color:var(--blue-soft)">ZP ${esc(z.code)} ${insigne(z.ps)}</span>${z.doctrine && DOCTRINES[z.doctrine] ? ` · <span title="Doctrine : ${esc(DOCTRINES[z.doctrine].force)}">${DOCTRINES[z.doctrine].ico} ${esc(DOCTRINES[z.doctrine].nom)}${z.maitrise ? ` ${'★'.repeat(z.maitrise + 1)}` : ''}</span>` : ''}${z.toursJoues >= 5 ? ` · ${rang}${rang === 1 ? 'er' : 'e'} sur ${total}` : ` · non classé (${z.toursJoues}/5 tours)`}${z.toursJoues ? ` · moy. ${fmt1(moyenneIpz(z))}` : ''}</span>
          ${S.editingName ? `<form class="row" data-form="rename" style="gap:6px"><label class="sr" for="nom-zone">Nom de la zone</label>
            <input id="nom-zone" class="text" name="nom" maxlength="24" value="${esc(z.nom)}" style="min-height:36px;width:170px;font:700 18px var(--display)">
            <button class="btn primary small" type="submit">OK</button></form>`
            : `<div class="mz-nomrow"><h2 class="mz-nom">${esc(z.nom)}</h2><button class="iconbtn mz-crayon" data-action="rename" aria-label="Renommer la zone">${icon('pencil', 14)}</button></div>`}
        </div>
      </div>
      <div class="mz-scene">
        ${sceneCarteHtml()}
        <button type="button" class="mz-ipz" data-action="aide" data-k="ipz" aria-label="IPZ ${fmt1(z.ipz)} : qu’est-ce que l’IPZ ?">
          <span class="mz-ipz-l">IPZ</span><span class="mz-ipz-v">${fmt1(z.ipz)}</span>${pastilleDelta(z.ipz, z.hier && z.hier.ipz)}
          ${z.toursJoues ? `<span class="mz-ipz-m">moy. ${fmt1(moyenneIpz(z))}</span>` : ''}
        </button>
      </div>
      <div class="tiles mz-tiles">
        <div class="tile"><span class="l">Agents</span><span class="v">${dispo}<span class="muted" style="font-size:13px">/${z.agents}</span></span>
          <span class="s ${blesses ? 'bad' : ''}">${blesses ? `${blesses} absent${blesses > 1 ? 's' : ''}` : form ? `${form} en form.` : z.academie.length ? `+${z.academie.reduce((s, a) => s + a.n, 0)} recrue${z.academie.reduce((s, a) => s + a.n, 0) > 1 ? 's' : ''}` : 'au complet'}</span></div>
        <button type="button" class="tile tile-btn" data-action="budget" aria-label="Détail du budget"><span class="l row" style="gap:4px">Budget ${icon('chevron', 12)}</span><span class="v v-euros ${z.budget < 0 ? 'bad' : ''}">${fmtK(z.budget)}</span><span class="s ${fraisFixesDuJour(z) < 0 ? 'bad' : 'ok'}">${fraisFixesDuJour(z) >= 0 ? '+' : '−'}${fmt1(Math.abs(fraisFixesDuJour(z)))} k€/j</span></button>
        <button type="button" class="tile tile-btn" data-action="parc" aria-label="Parc automobile"><span class="l row" style="gap:4px">Véhicules ${icon('chevron', 12)}</span><span class="v">${vDispo}<span class="muted" style="font-size:13px">/${z.vehicules}</span></span><span class="s ${cab || 100 - z.usure < 60 ? 'bad' : 100 - z.usure < 80 ? 'warn' : ''}">${cab ? `${cab} cabossé${cab > 1 ? 's' : ''}` : `état ${Math.round(100 - z.usure)} %`}</span></button>
      </div>
      <div class="cadrans">
        ${cadran('Moral', z.moral, '#FFB23F', 'moral', pastilleDelta(z.moral, z.hier && z.hier.moral), `efficacité <b class="${moralMult(z.moral) >= 1 ? 'ok' : 'bad'}">${Math.round(moralMult(z.moral) * 100)} %</b>`)}
        ${z.ipzComp ? cadran('Terrain', z.ipzComp.affaires, '#9DCBFF', 'terrain', pastilleDelta(z.ipzComp.affaires, z.ipzCompHier && z.ipzCompHier.affaires), `${Math.round(IPZ_POIDS.affaires * 100)} % de l’IPZ`) : ''}
        ${cadran('Satisfaction', z.satisfaction, '#63B0FF', 'satisfaction', pastilleDelta(z.satisfaction, z.hier && z.hier.satisfaction), `${Math.round(IPZ_POIDS.satisfaction * 100)} % de l’IPZ`)}
        ${cadran('Réputation', z.reputation, '#3DD39A', 'reputation', pastilleDelta(z.reputation, z.hier && z.hier.reputation), `commune <b class="${confianceCommune(z) > 0 ? 'ok' : confianceCommune(z) < 0 ? 'bad' : ''}">${confianceCommune(z) >= 0 ? '+' : '−'}${fmt1(Math.abs(confianceCommune(z)))} k€/j</b>`)}
      </div>
    </section>
    <div class="duo">${encheresHtml()}${equipeHtml()}${tropheesHtml()}</div>

    ${nuitHtml(z)}


    ${z.tutelle ? `<section class="card red" aria-label="Zone sous tutelle"><span class="kicker" style="color:var(--red-soft)">Zone sous tutelle · verdict dans ${z.tutelle.fin - T + 1} résolution${z.tutelle.fin - T + 1 > 1 ? 's' : ''}</span>
      <span style="font-weight:700">${(z.tutelle.raisons || []).length ? esc(z.tutelle.raisons.join(', ')) : 'La zone tient le cap : continue comme ça'}</span>
      <span class="small">Dernière chance : si ta zone est encore en péril au tour ${z.tutelle.fin}, c’est la faillite. En attendant : pas de rythme renforcé, d’agents de réserve, de défi ni d’enchère, et seul le recrutement est permis comme grande décision. Tes collègues peuvent t’aider.</span>
      <a class="small" href="#guide-faillite">Tutelle et faillite dans le guide</a></section>` : ''}
    ${z.peril ? `<section class="card red" aria-label="Zone en péril"><span class="kicker" style="color:var(--red-soft)">Zone en péril · ${z.tutelleSaison ? 'faillite' : 'tutelle'} dans ${z.peril.fin - T + 1} résolution${z.peril.fin - T + 1 > 1 ? 's' : ''}</span>
      <span style="font-weight:700">${esc((z.peril.raisons || []).join(', '))}</span>
      <span class="small">Pour t’en sortir : budget au-dessus de ${PERIL.budget} k€, au moins ${PERIL.agents} agents disponibles, moral au-dessus de ${PERIL.moral}. Rythme allégé, prime, moins de dépenses ; tes collègues peuvent t’aider.</span>
      <a class="small" href="#guide-faillite">${z.tutelleSaison ? 'Ce qui se passe en cas de faillite' : `Tutelle (${TUTELLE.tours} tours sous contrôle) puis faillite`}</a></section>` : ''}
    <div id="hp-fipa">${fipaCards()}</div>


    ${alertes.length ? `<section class="col" aria-label="À traiter"><h2 class="section">À traiter</h2>
      ${(compacte ? alertesTri.slice(0, MAX_ALERTES) : alertesTri).map(ligneAlerte).join('')}
      ${compacte && alertesTri.length > MAX_ALERTES ? `<details class="alertes-plus"><summary>${alertesTri.length - MAX_ALERTES} autre${alertesTri.length - MAX_ALERTES > 1 ? 's' : ''}</summary><div class="col" style="gap:8px;margin-top:8px">${alertesTri.slice(MAX_ALERTES).map(ligneAlerte).join('')}</div></details>` : ''}</section>` : ''}

    <section class="col">
      <div class="trio">
        <button type="button" class="btn" data-action="toggle-rapport" aria-expanded="${!!S.showRapport}" ${S.showRapport ? 'style="border-color:var(--amber-line);background:var(--amber-bg)"' : ''}>${icon('news', 18)}<span>Rapport</span></button>
        <a class="btn" href="#gazette">${icon('news', 18)}<span>${last ? `Gazette <span class="mono tiny muted">T${last.turn}</span>` : 'Gazette'}</span></a>
        <a class="btn" href="#classement">${icon('trophy', 18)}<span>Classement</span></a>
      </div>
      ${S.showRapport ? rapportHtml(z) : ''}
      ${S.backend.mode === 'demo' ? '<button class="btn outline block" data-action="demo-next">Démo : passer au tour suivant</button>' : ''}
    </section>
    ${z.toursJoues < 2 && !premiersPasVus() ? '<button type="button" class="list-row" data-action="tuto" style="border-color:var(--amber-line);width:100%;text-align:left"><span class="bullet" style="background:var(--amber)"></span><span class="col grow" style="gap:1px"><span style="font-weight:600">Nouveau ? Fais la visite guidée</span><span class="small muted">3 minutes pour découvrir les onglets et ta journée de chef de zone</span></span></button>' : ''}
  </main>${tabbar('hp', { questBadge: !questDone })}`;
}

