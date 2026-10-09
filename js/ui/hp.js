import { chefACreer, creationChefHtml, portraitChef, ficheChefHtml, chefNuitHtml, zoneAvecAgenda } from './chef.js';
import { absenceHtml, semaineHtml, portraitAdjoint } from './chef-semaine.js';
import { humeurReseau } from '../engine/chef.js';
import { titresDefi } from './defis.js';
import { DOCTRINES, SERVICE_LABELS } from '../engine/constants.js';
import { doctrineOuverte, dernierJourDoctrine } from '../engine/regles.js';
import { maxDemarchesDe } from '../engine/enquete.js';
import { pistesHpHtml, faitsDeLaNuit } from './pistes.js';
import { noteVue } from './nouveautes.js';
import { actuLigne } from './actu.js';
// Écran HP (Hôtel de police) : l'accueil.
import { cabossesChoisis } from '../engine/parc.js';
import { S, esc, icon, fmt1, fmtK, gauge, tabbar, rangDe, gradeInfo, myZone, skyline, cielStyle, slotsJour, slotsCompte } from './common.js';
import { agentsDisponibles, blessesActifs, enFormation, vehiculesDisponibles } from '../engine/zone.js';
import { coutCarrosserie } from '../engine/sinistres.js';
import { formatCountdown, formatDateBe } from '../engine/time.js';
import { QUEST_LABELS } from '../quests/quests.js';
import { COULEURS_ZONE } from '../engine/constants.js';
import { estimations, besoinService } from './ordres.js';
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
import { incidentsHtml, jaugeSkinsLigne } from './incidents.js';
import { vignetteVentes, vignetteEquipe, vignetteTrophees, vignetteRapport, vignetteGazette, vignetteClassement, vignetteChallenge } from './vignettes-hp.js';
import { phaseVente } from '../engine/ventes.js';
import { reglesV2 } from '../engine/regles.js';
import { renderHPAncien } from './hp-ancien.js';

/** Variation depuis la veille, en petite pastille colorée. */
function pastilleDelta(v, avant) {
  if (avant === undefined || avant === null) return '';
  const d = Math.round((v - avant) * 10) / 10;
  if (Math.abs(d) < 0.05) return '';
  return `<span class="pdelta ${d > 0 ? 'up' : 'down'}" aria-label="${d > 0 ? 'en hausse' : 'en baisse'} de ${fmt1(Math.abs(d))} depuis hier">${d > 0 ? '▲' : '▼'} ${fmt1(Math.abs(d))}</span>`;
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
  // Saison 2 : la nuit en un coup d'œil — l'IPZ et sa composition, ce qui a aidé, ce qui a coûté ; le reste à un toucher.
  const tons = lignes.map((l) => ({ l, t: tonFait(l) }));
  const fort = (l) => (/élucidé|interpellé|arrêt|repris|gagn|réussi/i.test(l) ? 2 : /\+\d/.test(l) ? 1 : 0);
  const bons = tons.filter((x) => x.t === 'bon').sort((x, y) => fort(y.l) - fort(x.l)).slice(0, 3), mauvais = tons.filter((x) => x.t === 'mauvais' || x.t === 'alerte').sort((x, y) => (y.t === 'alerte') - (x.t === 'alerte')).slice(0, 3);
  const delta = d.hierIpz !== null && d.hierIpz !== undefined && Number.isFinite(d.ipz) ? Math.round((d.ipz - d.hierIpz) * 10) / 10 : null;
  const pts = d.ipzComp ? pointsIpz(d.ipzComp) : null;
  const COUL = { satisfaction: '#3DD39A', affaires: '#63B0FF', moral: '#FFB23F', budget: '#B79BFF', reputation: '#FF8F6B' };
  const tot = pts ? Object.values(pts).reduce((a2, b2) => a2 + b2, 0) || 1 : 1;
  const ouvert = (k) => (S.ouverts && S.ouverts[k] ? 'open' : '');
  return `<div class="card tight rap2" id="rapport-complet" style="scroll-margin-top:16px">
    <div class="between"><span class="kicker">Nuit du tour ${d.tour || ''}${d.saison && d.saison !== saisonLive ? ` (saison ${d.saison})` : ''}${d.date ? ` · ${formatDateBe(d.date)}` : ''}</span>${nav}</div>
    ${Number.isFinite(d.ipz) ? `<div class="rap2-ipz"><span class="rap2-k">IPZ</span><span class="rap2-v">${fmt1(d.ipz)}</span>${delta !== null ? `<span class="rap2-d">${evol(delta)}</span>` : ''}</div>` : ''}
    ${pts ? `<div class="rap2-compo" role="img" aria-label="Composition de l’IPZ">${Object.keys(IPZ_POIDS).map((k) => `<i style="flex:${Math.max(0.5, pts[k] / tot * 100)};background:${COUL[k]}" title="${IPZ_LABELS[k]} : ${fmt1(pts[k])} pts"></i>`).join('')}</div>
      <div class="rap2-leg">${Object.keys(IPZ_POIDS).map((k) => `<span><i style="background:${COUL[k]}"></i>${IPZ_LABELS[k]} <b>${fmt1(pts[k])}</b></span>`).join('')}</div>` : ''}
    ${bons.length ? `<span class="rap2-t ok">Ce qui a aidé</span><div class="faits">${bons.map((x) => faitHtml(x.l)).join('')}</div>` : ''}
    ${mauvais.length ? `<span class="rap2-t bad">Ce qui a coûté</span><div class="faits">${mauvais.map((x) => faitHtml(x.l)).join('')}</div>` : ''}
    ${!bons.length && !mauvais.length ? `<div class="faits">${lignes.slice(0, 3).map(faitHtml).join('')}</div>` : ''}
    <details class="rap2-pli" data-k="rap-journal" ${ouvert('rap-journal')}><summary><span>Tout le journal · ${lignes.length} ligne${lignes.length > 1 ? 's' : ''}</span>${icon('chevron', 16)}</summary><div class="faits">${lignes.map(faitHtml).join('')}</div></details>
    ${d.journal ? `<details class="rap2-pli" data-k="rap-jauges" ${ouvert('rap-jauges')}><summary><span>Pourquoi tes jauges ont bougé</span>${icon('chevron', 16)}</summary>${journalHtml(d.journal)}</details>` : ''}
    ${!d.journal && idx > 0 ? '<p class="tiny muted" style="margin:0">Détail des jauges indisponible pour les tours d’avant la mise à jour.</p>' : ''}
    ${d.ipzComp ? `<details class="rap2-pli" data-k="rap-calcul" ${ouvert('rap-calcul')}><summary><span>Le calcul de l’IPZ</span>${icon('chevron', 16)}</summary>${ipzDetailHtml(d)}</details>` : ''}
  </div>`;
}
/** Ton d'une ligne du rapport : 'bon', 'mauvais', 'alerte' ou ''. */
function tonFait(l) {
  if (/^Décision refusée/.test(l)) return 'alerte';
  // Un « −1 dossier » de paperasse ou une usure ne sont pas des coups durs ; un échec ou un blessé, si.
  const dur = /personne n’est venu|n’a rien donné|refusée|bless|manqu|échou|raté|perdu/i.test(l);
  const moins = /−\d|-\d/.test(l) && !/paperasse|dossiers? quand|usure/i.test(l);
  if (dur || moins) return 'mauvais';
  return /\+\d|réussi|élucidé|interpellé|repris|gagn|traités sur|(\d+) sur \1/i.test(l) ? 'bon' : '';
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
  const ton = tonFait(l), mauvais = ton === 'mauvais' || ton === 'alerte', bon = ton === 'bon';
  const m = l.match(/^([^:·]{2,48}?)\s*[:·]\s+(.*)$/s);
  const corps = m ? `<strong>${esc(m[1])}</strong> · ${esc(m[2])}` : esc(l);
  return `<div class="fait ${mauvais ? 'mauvais' : bon ? 'bon' : ''}${/^Décision refusée/.test(l) ? ' alerte' : ''}"><span class="fait-i" aria-hidden="true">${ico}</span><span class="small">${corps}</span></div>`;
}

function cleNuit(z) { return `mazp-nuit-${S.backend.gameId ? S.backend.gameId() : ''}-${S.state.season}-${S.state.turn}-${z.uid}`; }

/** HP allégée : en service pour tous (8 oct. 2026). */
export function hpCompacte() {
  return true;
}

/** Texte sans balises, pour un attribut (aria-label, title). */
const attr = (h) => String(h).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;');

/**
 * Bulle de l'adjoint : la nuit en une ou deux phrases (décision refusée, fait marquant) et les jauges qui ont bougé,
 * jusqu'à ce que le joueur touche « Compris ». Remplace les anciennes cartes « Résultat de la nuit » et « Cette nuit ».
 */
function bulleNuitHtml(z) {
  if (!z.hier || !z.rapport || !z.rapport.length || S.state.turn <= 1 || S.nuitVue === cleNuit(z)) return '';
  try { if (localStorage.getItem(cleNuit(z))) return ''; } catch (e) { /* pas de stockage : on l'affiche */ }
  const pastilles = [['IPZ', z.ipz, z.hier.ipz], ['Budget', z.budget, z.hier.budget, true], ['Moral', z.moral, z.hier.moral], ['Satisfaction', z.satisfaction, z.hier.satisfaction], ['Réputation', z.reputation, z.hier.reputation]]
    .filter(([, v, a]) => a !== undefined && a !== null && Math.abs(v - a) >= 0.05)
    .map(([l, v, a, eur]) => { const d = Math.round((v - a) * 10) / 10; return `<span class="bn-p ${d > 0 ? 'up' : 'down'}">${l} ${d > 0 ? '▲' : '▼'} ${eur ? fmtK(Math.abs(d)) : fmt1(Math.abs(d))}</span>`; });
  const refusees = z.rapport.filter((l) => /^Décision refusée/.test(l));
  const faits = faitsDeLaNuit(z).filter((l) => !refusees.includes(l));
  const court = (t) => (t.length > 150 ? `${t.slice(0, 147)}…` : t);
  const a = z.adjoint;
  const qui = a ? `${a.f ? 'Ton adjointe' : 'Ton adjoint'} ${esc(a.prenom)}` : 'Ton adjoint';
  const autres = Math.max(0, faits.length - 1);
  return `<section class="hp-bulle" aria-label="Résultat de la nuit">
    ${a ? portraitAdjoint(a, 40) : `<span class="bn-ico" aria-hidden="true">${icon('radio', 20)}</span>`}
    <div class="bn-corps">
      <span class="bn-qui">${qui} · nuit du tour ${S.state.turn - 1}</span>
      ${refusees.map((l) => `<p class="bn-t bn-refus">${esc(court(l))}</p>`).join('')}
      ${faits.length ? `<p class="bn-t">${esc(court(faits[0]))}</p>` : refusees.length ? '' : '<p class="bn-t">Nuit sans fait marquant. Tout est dans le rapport.</p>'}
      ${pastilles.length ? `<div class="bn-ps">${pastilles.join('')}</div>` : ''}
      <div class="bn-act"><button type="button" class="bn-l" data-action="voir-rapport">Rapport${autres ? ` · ${autres} autre${autres > 1 ? 's' : ''} fait${autres > 1 ? 's' : ''}` : ''}</button><a class="bn-l" href="#gazette">La Gazette</a><button type="button" class="bn-ok" data-action="nuit-ok">Compris</button></div>
    </div></section>`;
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

/** Tout ce qu'il y a à faire avant 20:00, dans l'ordre où il vaut mieux le faire. */
function itemsDuSoir(st, z, { ordresOk, faites, reussies, delegue }) {
  const d = S.draft || {};
  const nbDem = (d.demarches || []).length;
  const items = [];
  items.push({ ok: ordresOk, href: '#ordres', t: ordresOk ? 'Ordres validés' : S.ordersDirty ? 'Valider mes ordres modifiés' : 'Valider mes ordres', s: ordresOk ? 'modifiables jusqu’à 20:00' : 'sans ordres validés, ce tour ne compte pas' });
  items.push({ ok: !!d.decision || !!d.sansDecision, href: '#ordres-decision', t: d.decision ? 'Grande décision choisie' : d.sansDecision ? 'Grande décision : aucune ce soir' : 'Grande décision', s: d.decision ? 'payée à 20:00 si le budget le permet' : d.sansDecision ? 'tu peux encore changer d’avis' : 'en choisir une, ou « Aucune ce soir »' });
  const pc = z.pointChaud;
  if (pc) {
    const a = (d.patrouilles || {})[pc.cell] || 0;
    items.push({ ok: a >= 2, href: '#carte', t: a >= 2 ? `Point chaud : ${a} agents envoyés` : `Point chaud : ${esc(pc.titre.toLowerCase())}`, s: a >= 2 ? 'désamorcé à 20:00 si tes ordres sont validés' : 'envoie 2 patrouilles depuis la Carte' });
  }
  if (st.enquete) items.push({ ok: nbDem >= 1 || (d.accusation !== null && d.accusation !== undefined), href: '#enquete', t: `Enquête : ${nbDem} démarche${nbDem > 1 ? 's' : ''} sur ${maxDemarchesDe(st, zoneAvecAgenda())}`, s: (st.traques || []).length ? 'une traque est en cours !' : 'constatations, vérifications, partage, accusation' });
  const dl = dilemmeDuJour(st, z);
  if (dl) items.unshift({ ok: Number.isInteger(d.dilemme), href: '#hp-dilemme', t: `Dilemme : ${esc(dl.titre.toLowerCase())}`, s: Number.isInteger(d.dilemme) ? `« ${esc(dl.choix[d.dilemme].l)} »` : 'deux choix, à trancher avant 20:00' });
  const fe = feuilletonEnCours(st, z);
  for (const sg of (z.pressions || []).filter((p) => (p.feuilleton || p.coop) && (p.quartier != null || p.service))) {
    if (sg.feuilleton && !(fe && fe.tour === st.turn)) continue; // audit annoncé plusieurs jours à l'avance : pas encore ce soir
    let ok;
    let s = esc(sg.texte);
    if (sg.quartier != null) ok = ((d.patrouilles || {})[sg.quartier] || 0) >= (sg.patrouilles || 2);
    else {
      const b = besoinService(sg);
      ok = b.ok;
      const manque = b.l.find((x) => x.n < x.min);
      if (manque) s = `${manque.n} sur ${manque.min} en ${esc(SERVICE_LABELS[manque.s] || manque.s)} comptés à 20:00${manque.brut > manque.n ? ` (${manque.brut - manque.n} partent en relève, opération ou FIPA)` : ''} : ajoutes-en dans tes Ordres`;
    }
    items.unshift({ ok, href: sg.quartier != null ? '#carte' : '#ordres', t: esc(sg.titre), s });
  }
  { let vt = null; try { vt = vagueTodo(estimations()); } catch (e) { /* pas de brouillon */ } if (vt) items.unshift(vt); }
  for (const x of releveTodos()) items.unshift(x);
  { const bt = bilanTodo(); if (bt) items.unshift(bt); }
  if (doctrineOuverte(st, z)) { const dc = d.doctrine && DOCTRINES[d.doctrine]; const r = dernierJourDoctrine(z) - st.turn; items.unshift({ ok: !!dc, href: '#ordres', t: dc ? `Doctrine : ${dc.ico} ${esc(dc.nom)}` : 'Choisis la doctrine de ta zone', s: dc ? 'fixée pour la saison avec tes ordres de ce soir' : r <= 0 ? 'dernier jour, ensuite la saison se joue sans doctrine' : `dans tes ordres, encore ${r + 1} jours` }); }
  { const ct = criseTodo(); if (ct) items.unshift(ct); }
  items.push(delegue ? { ok: true, href: '#quete', t: delegue.statut === 'quiz' ? `Quiz express : ${Number(delegue.tentatives) || 0} sur 5` : 'Énigmes confiées à un agent', s: delegue.statut === 'quiz' ? ((Number(delegue.tentatives) || 0) >= 3 ? (delegue.bonus ? 'bonus choisi' : 'choisis ton bonus') : 'pas de bonus') : 'résultat ce soir' } : { ok: faites >= slotsCompte().length, href: '#quete', t: `Énigmes : ${faites} sur ${slotsCompte().length}`, s: reussies >= 2 ? 'bonus débloqué' : 'bonus dès 2 bonnes réponses' });
  const fipa = (st.fipas || []).filter((f) => (f.demandeur === z.uid && f.etape === 'demande' && f.tourDecision === st.turn) || (f.partenaire === z.uid && f.etape === 'invite' && f.tourReponse === st.turn) || (f.etape === 'accepte' && f.tourJ === st.turn && (f.demandeur === z.uid || f.partenaire === z.uid)));
  if (fipa.length) items.push({ ok: !!(d.fipa || d.fipaReponse || d.fipaChoix), href: '#hp-fipa', t: 'FIPA : une décision t’attend', s: 'dans « Aujourd’hui »' });
  for (const x of aFairePactes()) items.push({ ok: x.fait, href: '#pactes', t: esc(x.titre), s: esc(x.texte) });
  return items;
}

/** Nom court et icône d'une étape du soir : chaque pastille doit se comprendre sans la liste. */
function etiquetteEtape(i) {
  const t = String(i.t).replace(/<[^>]*>/g, '');
  if (i.href.startsWith('#ordres-decision')) return ['Décision', 'star'];
  if (/doctrine/i.test(t)) return ['Doctrine', 'shield'];
  if (/^(Valider|Ordres)/.test(t)) return ['Ordres', 'ordres'];
  if (/^Enquête/.test(t)) return ['Enquête', 'enquete'];
  if (/^(Énigmes|Quiz)/.test(t)) return ['Énigmes', 'quete'];
  if (/^Point chaud/.test(t)) return ['Point chaud', 'carte'];
  if (/^Dilemme/.test(t)) return ['Dilemme', 'alert'];
  if (/^Vague/.test(t)) return ['Vague', 'carte'];
  if (i.href === '#hp-releve') return ['Relève', 'carte'];
  if (i.href === '#hp-bilan') return ['Bilan', 'ordres'];
  if (i.href === '#hp-crise') return ['Conseil', 'shield'];
  if (i.href === '#hp-fipa') return ['FIPA', 'radio'];
  if (i.href === '#pactes') return ['Pacte', 'radio'];
  const mot = t.split(/[\s:]/)[0];
  return [mot.length > 11 ? `${mot.slice(0, 10)}…` : mot, icoEtape(i.href)];
}

/** Icône d'une étape du soir, d'après l'endroit où elle se règle. */
function icoEtape(href) {
  if (href.startsWith('#ordres-decision')) return 'star';
  if (href.startsWith('#ordres')) return 'ordres';
  if (href.startsWith('#enquete')) return 'enquete';
  if (href.startsWith('#quete')) return 'quete';
  if (href.startsWith('#carte') || href.startsWith('#terrain')) return 'carte';
  if (href.startsWith('#pactes')) return 'shield';
  if (href.startsWith('#prive') || href.startsWith('#radio')) return 'radio';
  return 'alert';
}

/** « Avant 20:00 » : la situation du jour, une icône par étape, et un seul gros bouton vers la prochaine. */
function avantHtml(st, z, items) {
  const reste = items.filter((i) => !i.ok), fait = items.length - reste.length;
  const p = reste[0];
  return `<section class="card hp-soir" aria-label="Prochain tour">
    <div class="hs-tete"><span class="kicker">20:00 dans <b id="countdown" class="hs-cd">${formatCountdown(st.nextDeadline - Date.now())}</b></span>${situationPastilles(z, cielDe(z))}</div>
    <div class="hs-pips" aria-label="${fait} étape${fait > 1 ? 's' : ''} faite${fait > 1 ? 's' : ''} sur ${items.length}">${items.map((i) => { const [nom, ico] = etiquetteEtape(i); return `<a class="hs-pip${i.ok ? ' ok' : i === p ? ' suiv' : ''}" href="${i.href}" title="${attr(i.t)}" aria-label="${attr(i.t)} : ${i.ok ? 'fait' : 'à faire'}">${i.ok ? icon('check', 14) : icon(ico, 15)}<span>${nom}</span></a>`; }).join('')}</div>
    <a class="hs-cta${p ? '' : ' fini'}" href="${p ? p.href : '#ordres'}">
      <span class="hs-cta-t">${p ? p.t : `${icon('check', 18)} Tout est prêt pour ce soir`}</span>
      <span class="hs-cta-s">${p ? p.s : 'tu peux encore tout modifier jusqu’à 20:00'}</span></a>
    <details class="hs-liste" data-k="soir-liste" ${S.ouverts && S.ouverts['soir-liste'] ? 'open' : ''}>
      <summary>${reste.length ? `${reste.length} étape${reste.length > 1 ? 's' : ''} à faire` : 'Tout est fait'}${fait ? ` · ${fait} faite${fait > 1 ? 's' : ''}` : ''} <span class="muted">· la liste</span>${icon('chevron', 14)}</summary>
      <div class="col" style="gap:6px">${items.map((i) => `<a class="todo ${i.ok ? 'done' : ''}" href="${i.href}"><span class="box" aria-hidden="true">${i.ok ? icon('check', 14) : ''}</span>
        <span class="col grow" style="gap:0;min-width:0"><span style="font-weight:600">${i.t}</span><span class="tiny muted">${i.s}</span></span>${icon('chevron', 16)}</a>`).join('')}</div>
    </details>
  </section>`;
}

/** Une jauge ronde compacte : la valeur au centre, le nom (touche pour l'aide), la variation depuis la veille. */
function rond(label, value, color, aide, avant) {
  const v = Math.round(value), L = 2 * Math.PI * 21, f = Math.max(0, Math.min(100, value)) / 100;
  const d = avant === undefined || avant === null ? 0 : Math.round((value - avant) * 10) / 10;
  return `<button type="button" class="hp-rond" data-action="aide" data-k="${aide}" aria-label="${esc(label)} : ${v} sur 100${Math.abs(d) >= 0.05 ? `, ${d > 0 ? 'en hausse' : 'en baisse'} de ${fmt1(Math.abs(d))}` : ''}. Comment c’est calculé ?">
    <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="21" fill="none" stroke="var(--surface3)" stroke-width="6"/><circle cx="26" cy="26" r="21" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(L * f).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 26 26)"/><text x="26" y="31.5" text-anchor="middle">${v}</text></svg>
    <span class="hr-l">${esc(label)}</span><span class="hr-d ${Math.abs(d) < 0.05 ? '' : d > 0 ? 'up' : 'down'}">${Math.abs(d) < 0.05 ? '=' : `${d > 0 ? '▲' : '▼'} ${fmt1(Math.abs(d))}`}</span></button>`;
}

/** « Ma zone » : les quatre jauges toujours visibles, puis agents, budget et véhicules. */
function jaugesHtml(z, T) {
  const dispo = agentsDisponibles(z, T), blesses = blessesActifs(z, T), vDispo = vehiculesDisponibles(z, T);
  const cab = (z.cabosses || []).length, ff = fraisFixesDuJour(z), h = z.hier || {};
  return `<section class="card hp-zone" aria-label="Ma zone">
    <div class="hz-ronds">
      ${rond('Moral', z.moral, '#FFB23F', 'moral', h.moral)}
      ${z.ipzComp ? rond('Terrain', z.ipzComp.affaires, '#9DCBFF', 'terrain', z.ipzCompHier && z.ipzCompHier.affaires) : ''}
      ${rond('Satisfaction', z.satisfaction, '#63B0FF', 'satisfaction', h.satisfaction)}
      ${rond('Réputation', z.reputation, '#3DD39A', 'reputation', h.reputation)}
    </div>
    <div class="hz-stats">
      <span class="hz-s"><b>${dispo}</b><span>/${z.agents} agents</span>${blesses ? ` <span class="bad">· ${blesses} absent${blesses > 1 ? 's' : ''}</span>` : ''}</span>
      <button type="button" class="hz-s" data-action="budget" aria-label="Budget ${attr(fmtK(z.budget))}, détail du budget"><b class="${z.budget < 0 ? 'bad' : ''}">${fmtK(z.budget)}</b><span class="${ff < 0 ? 'bad' : 'ok'}">${ff >= 0 ? '+' : '−'}${fmtK(Math.abs(ff))}/j</span></button>
      <button type="button" class="hz-s" data-action="parc" aria-label="Parc automobile : ${vDispo} véhicules disponibles sur ${z.vehicules}"><b>${vDispo}</b><span>/${z.vehicules} véhicules</span>${cab ? ` <span class="bad">· ${cab} cabossé${cab > 1 ? 's' : ''}</span>` : ''}</button>
    </div>
  </section>`;
}

/** Une ligne repliable de « Aujourd'hui » : icône, titre, une phrase ; le détail (la carte d'avant) se déplie. */
function ligneAjd({ k, ico, titre, sous, badge = '', cls = '', corps, ouvert = false, label = '' }) {
  // Carte qui sait déjà se replier sur une ligne (plan du district, vote déjà donné…) : on ne l'emballe pas une 2e fois.
  if (/^\s*<(details|button)/.test(corps)) return corps;
  const force = S.ancre && corps.includes(`id="${S.ancre}"`);
  const o = force || (S.ouverts && S.ouverts[k] !== undefined ? S.ouverts[k] : ouvert);
  // Une ligne dépliée d'office (décision en attente) le reste jusqu'à ce que le joueur la replie :
  // elle ne se referme pas sous ses doigts dès qu'il a fait son choix.
  if (o && !(S.ouverts && S.ouverts[k] !== undefined)) S.ouverts = { ...(S.ouverts || {}), [k]: true };
  return `<details class="ajd ${cls}" data-k="${k}"${label ? ` aria-label="${label}"` : ''} ${o ? 'open' : ''}><summary><span class="ajd-ico" aria-hidden="true">${ico}</span>
    <span class="ajd-txt"><b>${titre}</b>${sous ? `<span>${sous}</span>` : ''}</span>${badge}<span class="ajd-chev" aria-hidden="true">${icon('chevron', 16)}</span></summary>
    <div class="ajd-corps">${corps}</div></details>`;
}
const pastilleAFaire = (ok) => (ok ? `<span class="ajd-badge ok" aria-label="fait">${icon('check', 12)}</span>` : '<span class="ajd-badge" aria-label="à faire">!</span>');

/** Alertes de la zone (blessés, dossiers, paperasse, budget, renforts…), les plus graves d'abord. */
function alertesDe(st, z, T) {
  const alertes = [];
  for (const b of z.blesses.filter((x) => x.retour > T)) {
    const tours = b.retour - T, pl = b.n > 1;
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
    alertes.push({ cls: prevu ? 'blue' : 'red', titre: `${cab} véhicule${cab > 1 ? 's' : ''} cabossé${cab > 1 ? 's' : ''}`, texte: prevu ? `${prevu < cab ? `${prevu} sur ${cab} ` : ''}en carrosserie ce soir (${fmtK(coutCarrosserie(z, choix))})` : `carrosserie dans tes dépenses (${fmtK(coutCarrosserie(z))}), sinon ton image en prend un coup chaque tour`, href: '#ordres' });
  }
  if (z.primeAChoisir) {
    const ch = S.draft && S.draft.prime, lab = ch && PRIME_LABELS[String(ch).split(':')[0]];
    if (ch) alertes.push({ cls: 'blue', titre: `✓ Mise à prix : ${lab ? esc(lab.nom.toLowerCase()) : 'récompense'} choisi${lab && /^(confiscation|formation)/.test(String(ch)) ? 'e' : ''}`, texte: 'appliqué à 20:00 · tu peux encore changer d’avis dans les Ordres', href: '#ordres' });
    else alertes.unshift({ cls: 'amber', titre: `Mise à prix : ${esc(z.primeAChoisir.suspect)} sous les verrous, choisis ta récompense`, texte: '12 000 €, renfort fédéral ou formation offerte, avant 20:00', href: '#ordres' });
  }
  for (const x of z.indemnites || []) alertes.push({ cls: 'blue', titre: `Assurance : +${fmtK(x.montant)} attendus`, texte: `remboursement du véhicule sinistré, ${x.tour - T <= 0 ? 'ce soir' : `dans ${x.tour - T} tour${x.tour - T > 1 ? 's' : ''}`}`, href: '#ordres' });
  { const ds = z.dossiers || [], retard = ds.filter((d) => d.age > 6).length, vieux = ds.filter((d) => d.age >= 5).length;
    if (vieux) alertes.push({ cls: retard ? 'red' : 'amber', titre: retard ? `${retard} dossier${retard > 1 ? 's' : ''} en retard` : `${vieux} dossier${vieux > 1 ? 's' : ''} de 5 jours ou plus`, texte: retard ? '−0,4 de satisfaction chacun par jour : renforce la Recherche' : 'renforce la Recherche avant qu’ils coûtent de la satisfaction', href: '#ordres' }); }
  if (z.paperasse > 14) alertes.push({ cls: 'red', titre: `Paperasse : ${Math.round(z.paperasse)} dossiers en attente`, texte: '−2 de moral chaque soir tant qu’elle dépasse 14, et l’Inspection au-delà de 20 · renforce l’Accueil ou paie la sous-traitance (−5 dossiers, 3 000 €)', href: '#ordres' });
  if (z.budget < 0) alertes.push({ cls: 'red', titre: 'Budget dans le rouge', texte: 'deux tours de suite et c’est l’Inspection', href: '#ordres' });
  { const dg = S.draft ? secteursEnDanger() : []; if (dg.length) alertes.unshift({ cls: 'red', titre: `Zone de non-droit : ${dg.map((k) => esc(nomSecteur(k))).join(', ')} menacé${dg.length > 1 ? 's' : ''}`, texte: 'le milieu remonte : mets 2 ou 3 agents de garde ce soir', href: '#terrain' }); }
  if (st.nonDroit && S.draft && !agentsND()) { const sc = Object.values(st.nonDroit.secteurs); const hier = sc.reduce((n, x) => n + ((x.hier || []).length ? 1 : 0), 0); const rep = sc.filter((x) => x.statut === 'repris').length; alertes.push({ cls: 'blue', titre: `Zone de non-droit : ${rep} secteur${rep > 1 ? 's' : ''} repris sur ${sc.length}`, texte: hier ? `des zones y étaient hier sur ${hier} secteur${hier > 1 ? 's' : ''} : rejoins-les, à plusieurs ça tombe plus vite` : 'personne n’y était hier : lance le mouvement sur la radio', href: '#terrain' }); }
  if (st.affaires.length) alertes.push({ cls: 'blue', titre: `${st.affaires.length} affaire${st.affaires.length > 1 ? 's' : ''} disputée${st.affaires.length > 1 ? 's' : ''} sur la carte`, texte: st.affaires.map((a) => esc(a.titre)).join(' · '), href: '#carte' });
  if (st.finSaison) alertes.unshift({ cls: 'amber', titre: st.finSaison === 'enquete' ? 'Fin de saison : le soir où l’affaire en cours se clôt' : 'Fin de saison ce soir à 20:00', texte: 'L’affaire et ses traques continuent dans la saison suivante. S’arrêtent : formations et travaux en cours, pactes, défis et crise du Conseil. Bilan de saison allégé.', href: '#guide' });
  for (const x of aFairePactes()) if (!x.fait) alertes.unshift({ cls: 'amber', titre: esc(x.titre), texte: esc(x.texte), href: '#pactes' });
  for (const a of appelsRenfort()) if (!renfortPrevu(a.uid)) alertes.unshift({ cls: 'amber', titre: `${esc(a.zone.nom)} appelle du renfort`, texte: `${a.agents} agents demandés pour « ${esc(a.op.titre)} » · ${a.op.appel ? 'appel du district : renfort payé ×1,5' : 'prête des agents contre de la réputation'}`, href: '#prive' });
  const perils = Object.values(st.zones).filter((x) => (x.peril || x.tutelle) && x.uid !== z.uid);
  if (perils.length) alertes.push({ cls: 'red', titre: `${perils.map((x) => esc(x.nom)).join(', ')} en difficulté`, texte: 'un coup de main (onglet Pactes de la Carte) rapporte jusqu’à +7 de réputation', href: '#pactes' });
  const op = operationActive(z, T);
  if (op) alertes.unshift({ cls: 'red', titre: `Opération d’envergure : ${esc(op.titre)}`, texte: `dispositif à régler dans tes ordres${op.duree > 1 ? ` · jour ${T - op.tourDebut + 1} sur ${op.duree}` : ''}`, href: '#ordres' });
  const tr = (st.traques || [])[0];
  if (tr) { const ta = affaire(st, tr.n); alertes.unshift({ cls: 'red', titre: `Suspect identifié : ${esc(ta.suspects[ta.coupable].nom)} en fuite`, texte: `affaire « ${esc(ta.titre)} » résolue · ${delaiTraque(toursTraque(tr))} pour trouver sa planque et l’arrêter`, href: '#enquete' }); }
  { const ve = vagueEnvoyeeAlerte(); if (ve) alertes.push(ve); }
  return alertes.slice().sort((x, y) => (x.cls === 'red' ? 0 : 1) - (y.cls === 'red' ? 0 : 1));
}
const ligneAlerte = (a) => `<a class="ajd-alerte ${a.cls}" href="${a.href}"><span class="ajd-point" aria-hidden="true"></span>
  <span class="ajd-txt"><b>${a.titre}</b><span>${a.texte}</span></span><span class="ajd-chev" aria-hidden="true">${icon('chevron', 16)}</span></a>`;

/** « Aujourd'hui » : une ligne par sujet, l'urgent d'abord ; au-delà de 6, le reste se déplie. */
function aujourdhuiHtml(st, z, T, items) {
  const L = []; // { html, prio } : 0 urgent, 1 décision, 2 jeu du jour, 3 information
  const alertes = alertesDe(st, z, T);
  if (z.tutelle) L.push({ prio: 0, html: ligneAjd({ k: 'ajd-tutelle', label: 'Zone sous tutelle', cls: 'rouge', ico: '⚖️', titre: `Zone sous tutelle · verdict dans ${z.tutelle.fin - T + 1} résolution${z.tutelle.fin - T + 1 > 1 ? 's' : ''}`, sous: (z.tutelle.raisons || []).length ? esc(z.tutelle.raisons.join(', ')) : 'la zone tient le cap : continue comme ça', ouvert: true,
    corps: `<p class="small" style="margin:0">Dernière chance : si ta zone est encore en péril au tour ${z.tutelle.fin}, c’est la faillite. En attendant : pas de rythme renforcé, d’agents de réserve, de défi ni d’enchère, et seul le recrutement est permis comme grande décision. Tes collègues peuvent t’aider.</p><a class="small" href="#guide-faillite">Tutelle et faillite dans le guide</a>` }) });
  if (z.peril) L.push({ prio: 0, html: ligneAjd({ k: 'ajd-peril', label: 'Zone en péril', cls: 'rouge', ico: '🚨', titre: `Zone en péril · ${z.tutelleSaison ? 'faillite' : 'tutelle'} dans ${z.peril.fin - T + 1} résolution${z.peril.fin - T + 1 > 1 ? 's' : ''}`, sous: esc((z.peril.raisons || []).join(', ')), ouvert: true,
    corps: `<p class="small" style="margin:0">Pour t’en sortir : budget au-dessus de ${fmtK(PERIL.budget)}, au moins ${PERIL.agents} agents disponibles, moral au-dessus de ${PERIL.moral}. Rythme allégé, prime, moins de dépenses ; tes collègues peuvent t’aider.</p><a class="small" href="#guide-faillite">${z.tutelleSaison ? 'Ce qui se passe en cas de faillite' : `Tutelle (${TUTELLE.tours} tours sous contrôle) puis faillite`}</a>` }) });
  for (const a of alertes.filter((x) => x.cls === 'red')) L.push({ prio: 0, html: ligneAlerte(a) });
  if (chefACreer()) L.push({ prio: 0, html: `<button type="button" class="ajd-alerte amber" data-action="chef-maintenant" style="width:100%;text-align:left;font:inherit;cursor:pointer"><span class="ajd-point" aria-hidden="true"></span><span class="ajd-txt"><b>Crée ton chef de corps</b><span>un portrait et un parcours : une minute, une seule fois</span></span><span class="ajd-chev" aria-hidden="true">${icon('chevron', 16)}</span></button>` });

  const d = S.draft || {};
  const dl = dilemmeDuJour(st, z);
  if (dl) {
    const perso = { appelBourgmestre: 'bourgmestre', appelMarche: 'bourgmestre', appelProcureur: 'procureur', appelSyndicat: 'syndicat', appelPresse: 'journaliste' }[dl.id] || null;
    const pris = Number.isInteger(d.dilemme);
    L.push({ prio: 1, html: ligneAjd({ k: `ajd-dilemme-${T}`, ico: perso ? `<img src="img/bureau/${perso}-${humeurReseau(z, perso) > 0 ? 1 : humeurReseau(z, perso) < 0 ? '-1' : 0}.webp" alt="" width="40" height="40">` : '⚖️',
      titre: `${perso ? 'Appel' : 'Dilemme'} : ${esc(dl.titre)}`, sous: pris ? `« ${esc(dl.choix[d.dilemme].l)} »` : 'deux choix, à trancher avant 20:00', badge: pastilleAFaire(pris), ouvert: !pris, corps: dilemmeHtml(st, z) }) });
  }
  { const h = criseHtml(); if (h) { const ct = criseTodo(); L.push({ prio: 1, html: ligneAjd({ k: `ajd-crise-${T}`, ico: '🏛', titre: ct ? ct.t : 'Conseil des chefs', sous: ct ? ct.s : 'plan du district', badge: ct ? pastilleAFaire(ct.ok) : '', ouvert: !!ct && !ct.ok, corps: h }) }); } }
  { const h = releveHtml(); if (h) { const r = releveTodos()[0]; L.push({ prio: 1, html: ligneAjd({ k: `ajd-releve-${T}`, ico: '🚔', titre: r ? r.t : 'Relève', sous: r ? r.s : 'suspect en fuite chez un voisin', badge: r ? pastilleAFaire(r.ok) : '', ouvert: !!r && !r.ok, corps: h }) }); } }
  { const h = bilanHtml(); if (h) { const bt = bilanTodo(); L.push({ prio: 1, html: ligneAjd({ k: `ajd-bilan-${T}`, ico: '📋', titre: bt ? bt.t : 'Bilan de saison', sous: bt ? bt.s : '', badge: bt ? pastilleAFaire(bt.ok) : '', ouvert: !!bt && !bt.ok, corps: h }) }); } }
  { const h = fipaCards(); if (h) { const att = items.some((i) => i.href === '#hp-fipa' && !i.ok); L.push({ prio: 1, html: ligneAjd({ k: `ajd-fipa-${T}`, ico: '🤝', titre: att ? 'FIPA : une décision t’attend' : 'FIPA', sous: 'renfort d’une zone partenaire', badge: att ? pastilleAFaire(false) : '', ouvert: att, corps: `<div id="hp-fipa">${h}</div>` }) }); } }

  { const h = incidentsHtml({ avant: actuLigne(), nu: true }); if (h) L.push({ prio: 2, html: `<div class="ajd-inc" id="hp-incidents" aria-label="Incidents du jour">${h}</div>` }); }

  { const h = absenceHtml(z); if (h) { const a = z.adjoint, retour = /Bon retour/.test(h); L.push({ prio: 3, html: ligneAjd({ k: 'ajd-absence', ico: portraitAdjoint(a, 40), titre: retour ? 'Bon retour, chef' : 'Pendant ton absence', sous: `${esc(a.prenom)} ${esc(a.nom)} a tenu la zone`, ouvert: retour, corps: h }) }); } }
  { const h = pistesHpHtml(z); if (h) { const n = (z.pistes || []).length; L.push({ prio: 3, html: ligneAjd({ k: 'ajd-pistes', ico: '🔎', titre: 'Pistes en cours', sous: `${n} piste${n > 1 ? 's' : ''} · résultat à venir`, corps: h }) }); } }
  for (const a of alertes.filter((x) => x.cls !== 'red')) L.push({ prio: 3, html: ligneAlerte(a) });

  L.sort((a, b) => a.prio - b.prio);
  const MAX = 6, vus = L.slice(0, MAX), plus = L.slice(MAX);
  if (!L.length) return '';
  return `<section class="hp-ajd" aria-label="Aujourd’hui">
    <div class="between"><h2 class="section">Aujourd’hui</h2><a class="tiny" href="#guide-incidents">Les incidents ?</a></div>
    ${vus.map((x) => x.html).join('')}
    ${plus.length ? `<details class="ajd-plus" data-k="ajd-plus" ${S.ouverts && S.ouverts['ajd-plus'] ? 'open' : ''}><summary>${plus.length} autre${plus.length > 1 ? 's' : ''} sujet${plus.length > 1 ? 's' : ''}</summary><div class="hp-ajd-l">${plus.map((x) => x.html).join('')}</div></details>` : ''}
    ${jaugeSkinsLigne()}
  </section>`;
}

/** Les raccourcis que le joueur peut épingler sur son HP (4 au plus). */
const TUILES = ['encheres', 'equipe', 'rapport', 'gazette', 'trophees', 'classement', 'challenge'];
const TUILES_DEFAUT = ['encheres', 'equipe', 'rapport', 'gazette'];
export const MAX_TUILES = 4;
export function mesTuiles() {
  const t = S.player && Array.isArray(S.player.hpTuiles) ? S.player.hpTuiles.filter((k) => TUILES.includes(k)) : null;
  return t && t.length ? t.slice(0, MAX_TUILES) : TUILES_DEFAUT;
}
function tuileInfo(k, st, z) {
  const T = st.turn, last = S.gazettes && S.gazettes[0];
  if (k === 'encheres') {
    const v2 = (Number(st.regles) || 1) >= 2;
    const s = v2 ? (!st.vente ? 'vente à 20:00' : phaseVente(st) === 'visible' ? '3 lots ouverts' : 'marteau ce soir') : (st.enchere && st.enchere.tour === T ? 'lot du jour' : 'lot à 20:00');
    return { nom: 'Enchères', vign: vignetteVentes(!!(st.vente || (st.enchere && st.enchere.tour === T))), s, carte: true };
  }
  if (k === 'equipe') return { nom: 'Mon équipe', vign: vignetteEquipe(z.couleur), s: `${(z.equipe || []).length || 5} figures`, carte: true };
  if (k === 'trophees') return { nom: 'Trophées', vign: vignetteTrophees((z.trophees || []).length), s: `${(z.trophees || []).length} sur ${TROPHEES.length}`, carte: true };
  if (k === 'rapport') return { nom: 'Rapport', vign: vignetteRapport(), s: T > 1 ? `tour ${T - 1}` : 'après 20:00', action: 'toggle-rapport' };
  if (k === 'gazette') return { nom: 'Gazette', vign: vignetteGazette(), s: last ? `tour ${last.turn}` : 'après 20:00', href: '#gazette' };
  if (k === 'classement') { const { rang, total } = rangDe(z.uid); return { nom: 'Classement', vign: vignetteClassement(z.couleur), s: z.toursJoues >= 5 ? `${rang}${rang === 1 ? 'er' : 'e'} sur ${total}` : 'non classé', href: '#classement' }; }
  return { nom: 'Challenge', vign: vignetteChallenge(), s: 'mini-jeux', action: 'hp-challenge' };
}
function raccourcisHtml(st, z) {
  const edit = !!S.hpEdit, mes = mesTuiles();
  const liste = edit ? TUILES : mes;
  const tuile = (k) => {
    const t = tuileInfo(k, st, z), on = mes.includes(k);
    const ouvert = (t.carte && S.hpTuile === k) || (k === 'rapport' && S.showRapport);
    const corps = `<span class="ht-v">${t.vign}${edit ? `<i class="ht-coche${on ? ' on' : ''}" aria-hidden="true">${on ? icon('check', 12) : ''}</i>` : ''}</span><span class="ht-n">${t.nom}</span><span class="ht-s">${t.s}</span>`;
    if (edit) return `<button type="button" class="hp-tuile${on ? '' : ' off'}" data-action="hp-tuile-choix" data-k="${k}" aria-pressed="${on}">${corps}</button>`;
    if (t.href) return `<a class="hp-tuile" href="${t.href}">${corps}</a>`;
    const act = t.carte ? `data-action="hp-tuile" data-k="${k}"` : `data-action="${t.action}"`;
    return `<button type="button" class="hp-tuile${ouvert ? ' ouvert' : ''}" ${act} aria-expanded="${!!ouvert}">${corps}</button>`;
  };
  const carte = !edit && mes.includes(S.hpTuile) ? ({ encheres: encheresHtml, equipe: equipeHtml, trophees: tropheesHtml }[S.hpTuile] || (() => ''))() : '';
  return `<section class="hp-racc" aria-label="Mes raccourcis">
    <div class="between"><h2 class="section">Mes raccourcis</h2><button type="button" class="btn small ghost" data-action="hp-tuiles-edit" aria-pressed="${edit}">${edit ? 'Terminé' : 'Modifier'}</button></div>
    ${edit ? `<p class="tiny muted" style="margin:0">Touche une tuile pour l’ajouter ou l’enlever : ${MAX_TUILES} au plus.</p>` : ''}
    <div class="hp-tuiles${edit ? ' edit' : ''}">${liste.map(tuile).join('')}</div>
    ${carte}
    ${!edit && S.showRapport ? rapportHtml(z) : ''}
  </section>`;
}

/** Le héros : le commissariat en grand (on le fait glisser), avec par-dessus le chef, la zone et l'IPZ. */
function heroHtml(st, z) {
  const { g, n, pct } = gradeInfo(z.ps);
  const { rang, total } = rangDe(z.uid);
  const ciel = S.player && ['jour', 'crepuscule', 'nuit'].includes(S.player.hpCiel) ? { moment: S.player.hpCiel } : {};
  const scene = sceneCarteHtml({ grand: true, ...ciel });
  const m = scene.match(/viewBox="0 [\d.]+ ([\d.]+) ([\d.]+)"/);
  const ratio = m ? (Number(m[1]) / Number(m[2])).toFixed(3) : '2.2';
  const L = 2 * Math.PI * 23;
  const anneau = `<svg class="hud-anneau" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="3"/><circle cx="26" cy="26" r="23" fill="none" stroke="var(--amber)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(L * Math.max(2, pct) / 100).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 26 26)"/></svg>`;
  const gradeTxt = `${g.nom}${n ? `, ${pct} % vers ${n.nom}` : ', grade maximal'}`;
  const chef = z.chef
    ? `<button type="button" class="hud-chef hp-chef" data-action="bureau-ouvrir" aria-label="Mon chef de corps · ${attr(gradeTxt)}">${anneau}${portraitChef(z.uid, 40, { galons: false })}</button>`
    : `<a class="hud-chef" href="#profil" aria-label="Mon profil · ${attr(gradeTxt)}">${anneau}<span class="hud-ecu">${S.player && S.player.blason && GRADES.indexOf(gradeFor(z.ps)) >= 4 ? blasonSvg(S.player.blason, z.couleur, 30) : icon('shield', 22)}</span></a>`;
  const doc = z.doctrine && DOCTRINES[z.doctrine];
  return `<section class="hp-hero" aria-label="Mon commissariat">
    <div class="hp-scene" style="--ratio:${ratio}">${scene}</div>
    <div class="hp-hud">
      ${chef}
      <div class="hud-id"><span class="hud-nom">${esc(z.nom)}</span>
        <a class="hud-sous" href="#parties">ZP ${esc(z.code)}${doc ? ` · <span title="Doctrine : ${esc(doc.force)}">${doc.ico}</span>` : ''} · ${esc((S.partie && S.partie.nom) || 'District Delta')}</a></div>
      <a class="hud-ipz" href="#classement" aria-label="Classements · IPZ ${fmt1(z.ipz)}${z.hier && z.hier.ipz != null ? `, ${z.ipz >= z.hier.ipz ? 'en hausse' : 'en baisse'} de ${fmt1(Math.abs(z.ipz - z.hier.ipz))}` : ''}, ${z.toursJoues >= 5 ? `${rang}${rang === 1 ? 'er' : 'e'} sur ${total}` : 'non classé'}"><span class="hud-ipz-l">IPZ</span><span class="hud-ipz-v">${fmt1(z.ipz)}</span>${pastilleDelta(z.ipz, z.hier && z.hier.ipz)}${z.toursJoues >= 5 ? `<span class="hud-rang">${rang}<sup>${rang === 1 ? 'er' : 'e'}</sup>/${total}</span>` : ''}</a>
    </div>
    <div class="hud-bas">
      <button type="button" class="hud-btn roue" data-action="menu-hp" aria-expanded="${!!S.menuHp}" aria-label="Guide, nouveautés, partie et profil">${icon('gear', 20)}${noteVue() ? '' : '<i class="roue-pastille" aria-hidden="true"></i>'}</button>
      <button type="button" class="hud-btn hud-perso" data-action="decor" aria-label="Personnaliser mon commissariat">${icon('pencil', 18)}</button>
    </div>
  </section>`;
}

export function renderHP() {
  // Le nouvel HP arrive avec la saison 2 (bascule à 20:00) : avant, l'ancien reste affiché.
  if (!reglesV2(S.state)) return renderHPAncien();
  const st = S.state, z = myZone();
  const T = st.turn;
  const ordresOk = !!S.savedOrders && !S.ordersDirty;
  const qr = S.questResults || [];
  const compte = slotsCompte().map((k) => qr[k]);
  const faites = compte.filter((r) => r && (r.statut === 'ok' || r.statut === 'rate')).length;
  const reussies = compte.filter((r) => r && r.statut === 'ok').length;
  const delegue = qr.find((r) => r && (r.statut === 'delegue' || r.statut === 'quiz'));
  const questDone = faites >= slotsCompte().length || !!delegue;
  const items = itemsDuSoir(st, z, { ordresOk, faites, reussies, delegue });
  // Première ouverture de la saison 2 : la création du chef prend tout l'écran (une minute, une fois).
  // « Plus tard » ramène à l'HP, où une ligne rappelle de le faire.
  let plusTard = !!S.chefPlusTard; try { plusTard = plusTard || !!sessionStorage.getItem('mazp-chef-plus-tard'); } catch (e) { /* pas de stockage */ }
  if (chefACreer() && !plusTard) {
    return `<main class="screen chef-accueil">
      <div class="ca-tete"><span class="kicker">Saison ${st.season} · tour ${T} · 20:00 dans <b id="countdown" class="hs-cd">${formatCountdown(st.nextDeadline - Date.now())}</b></span><h1 class="big">Ton chef de corps</h1>
        <p class="small muted" style="margin:0">Avant de reprendre ta zone : choisis qui la dirige. Ça prend une minute, une seule fois.</p></div>
      ${creationChefHtml()}
      <button type="button" class="btn ghost block" data-action="chef-plus-tard">Plus tard</button>
    </main>${tabbar('hp', { questBadge: !questDone })}`;
  }

  return `<main class="screen hp v3">
    ${heroHtml(st, z)}
    ${S.menuHp ? `<nav class="card menu-hp" aria-label="Menu">
      <a class="list-row" href="#guide">${icon('news', 18)}<span>Guide du joueur</span></a>
      <button type="button" class="list-row" data-action="maj-voir">${icon('star', 18)}<span>Nouveautés${noteVue() ? '' : ' <span class="tiny" style="color:var(--amber)">· nouvelle version</span>'}</span></button>
      <a class="list-row" href="#parties">${icon('carte', 18)}<span>Partie : ${esc((S.partie && S.partie.nom) || 'District Delta')}</span></a>
      <a class="list-row" href="#profil">${icon('gear', 18)}<span>Profil</span></a>
      ${S.backend.isMaster(S.user) ? `<a class="list-row" href="#admin">${icon('shield', 18)}<span>Maître du jeu</span></a>` : ''}
    </nav>` : ''}
    <div class="hp-cols">
      <div class="hp-col">
        ${bulleNuitHtml(z)}
        ${avantHtml(st, z, items)}
        ${jaugesHtml(z, T)}
      </div>
      <div class="hp-col">
        ${aujourdhuiHtml(st, z, T, items)}
        ${raccourcisHtml(st, z)}
        ${S.backend.mode === 'demo' ? '<button class="btn outline block" data-action="demo-next">Démo : passer au tour suivant</button>' : ''}
        ${z.toursJoues < 2 && !premiersPasVus() ? '<button type="button" class="list-row" data-action="tuto" style="border-color:var(--amber-line);width:100%;text-align:left"><span class="bullet" style="background:var(--amber)"></span><span class="col grow" style="gap:1px"><span style="font-weight:600">Nouveau ? Fais la visite guidée</span><span class="small muted">3 minutes pour découvrir les onglets et ta journée de chef de zone</span></span></button>' : ''}
      </div>
    </div>
  </main>${tabbar('hp', { questBadge: !questDone })}`;
}


function recompensesGrade(z) {
  const gi = GRADES.indexOf(gradeFor(z.ps));
  const cs = (S.player && S.player.consignes) || {};
  const out = [];
  if (gi >= 2) {
    const opt = (k, t) => `<button type="button" class="choice" data-action="toggle-consigne" data-k="${k}" aria-pressed="${!!cs[k]}" style="text-align:left;align-items:flex-start">${t}</button>`;
    out.push(`<section class="card"><h2 class="card-title">Consignes du pilote automatique</h2>
      <p class="small muted" style="margin:0">Appliquées les jours où tu ne passes pas d’ordres (grade Inspecteur principal).</p>
      <div class="col" style="gap:6px">
        ${opt('alloc', cs.alloc ? `Répartition de secours enregistrée : ${Object.values(cs.alloc).join(' / ')}<span class="s">Touche pour l’effacer</span>` : 'Utiliser ma répartition actuelle comme répartition de secours')}
        ${opt('situation', 'Adapter la répartition à la situation du jour<span class="s">+2 agents là où la situation l’exige</span>')}
        ${opt('temoin', 'Poursuivre l’enquête<span class="s">Une audition de témoin par jour</span>')}
        ${opt('prime', 'Verser une prime si le moral passe sous 45<span class="s">3 k€, si le budget le permet</span>')}
      </div></section>`);
  }
  if (gi >= 4) {
    out.push(`<section class="card"><h2 class="card-title">Blason de la zone</h2><p class="small muted" style="margin:0">Affiché sur l’HP et sur la carte (grade Commissaire divisionnaire).</p>
      <div class="swatches">${Object.entries(BLASONS).map(([k, b]) => `<button type="button" class="swatch" style="background:transparent;width:48px;height:52px" data-action="pick-blason" data-v="${k}" aria-pressed="${S.player && S.player.blason === k}" aria-label="Blason ${b.nom}">${blasonSvg(k, z.couleur, 36, b.nom)}</button>`).join('')}</div></section>`);
  }
  if (gi >= 5) out.push(`<section class="card tight"><span class="kicker">Chef de corps</span><span class="small">${z.motionSaison ? 'Ta motion de la saison est déposée.' : 'Tu peux proposer une motion au Conseil cette saison, depuis l’onglet Pactes de la Carte.'}</span></section>`);
  return out.join('');
}

export function renderProfil() {
  const z = myZone();
  const p = S.player || {};
  const { g, n, pct } = gradeInfo(z.ps);
  const etendue = z.ps >= 200;
  const records = titresDefi(z.uid);
  const affiches = (z.affiches || []).slice().reverse();
  const nbTro = (z.trophees || []).length;
  const stat = (v, l) => `<div class="pc-stat"><span class="v">${v}</span><span class="l">${l}</span></div>`;
  const editer = S.editingName || S.profilColor || !(p.pseudo);
  if (reglesV2(S.state)) {
    // Saison 2 : une carte de service (sans le commissariat, déjà à l'HP) et tes parties juste dessous.
    const cur = S.backend.gameId && S.backend.gameId();
    const parties = (S.parties || []).slice().sort((a2, b2) => (b2.id === cur) - (a2.id === cur));
    const titres = [...records.map((t) => `<span class="pc-plaque">🏆 ${esc(t.titre)} <small>niv. ${t.niveau}</small></span>`), ...(z.titres || []).map((t) => `<span class="pc-plaque">${icon('trophy', 12)} ${esc(t)}</span>`), ...(z.badges || []).map((b) => `<span class="pc-plaque argent">${esc(b)}</span>`)];
    return `<main class="screen profil2">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <section class="carte-service" style="--zc:${esc(z.couleur || '#5AA0F0')}" aria-label="Carte de service">
      <span class="cs-k">Police · District Delta · carte de service</span>
      <div class="pc-id">
        <span class="pc-insigne">${p.blason ? blasonSvg(p.blason, z.couleur, 44, '') : `<span class="pc-ecu">${icon('shield', 26)}</span>`}</span>
        <span class="col" style="gap:1px;min-width:0"><span class="pc-pseudo">${esc(p.pseudo || 'Sans pseudo')}</span>
          <span class="small">Chef de la <strong style="color:var(--zc)">ZP ${esc(z.code)} ${esc(z.nom)}</strong></span></span>
      </div>
      <div class="pc-grade">
        <div class="between"><span style="font-weight:700">${esc(g.nom)}</span><span class="tiny mono" style="opacity:.75">${z.ps} PS${n ? ` · ${esc(n.nom)} à ${n.ps}` : ' · grade maximal'}</span></div>
        <span class="pc-barre"><span style="width:${Math.max(3, pct)}%"></span></span>
      </div>
      <div class="cs-stats">${stat(z.ipz !== undefined && z.ipz !== null ? fmt1(z.ipz) : '—', 'IPZ')}${stat(`${nbTro}<small>/${TROPHEES.length}</small>`, 'Trophées')}${stat(affiches.length, `Arrestation${affiches.length > 1 ? 's' : ''}`)}</div>
      <span class="cs-plus">${records.length} record${records.length > 1 ? 's' : ''} · ${z.toursJoues || 0} tours joués${z.faillites ? ` · ${z.faillites} faillite${z.faillites > 1 ? 's' : ''}` : ''}</span>
      ${titres.length ? `<div class="pc-titres">${titres.join('')}</div>` : ''}
      ${affiches.length ? `<div class="pc-affiches" aria-label="Suspects arrêtés">${affiches.slice(0, 6).map((a2) => `<span class="pc-affiche" title="${esc(a2.titre)} · saison ${a2.season}"><b>ARRÊTÉ</b><span>${esc(String(a2.nom).split(' ')[0])}</span></span>`).join('')}</div>` : ''}
    </section>
    ${z.chef ? `<button type="button" class="btn primary block" data-action="bureau-ouvrir">${portraitChef(z.uid, 22, { galons: false })} Voir mon chef de corps</button>` : ''}
    <section class="col" style="gap:8px" aria-label="Mes parties"><h2 class="section" style="margin:0">Mes parties</h2>
      ${parties.map((x) => `<div class="partie2 ${x.id === cur ? 'ici' : ''}" style="--zc:${esc(x.id === cur ? (z.couleur || '#FFB23F') : '#4A5788')}">
        <span class="col grow" style="gap:1px;min-width:0"><b>${esc(x.nom)}</b><span class="tiny muted">${x.id === cur ? `ZP ${esc(z.code)} ${esc(z.nom)} · saison ${S.state.season}, jour ${S.state.turn}` : `code ${esc(x.code || '')}`}${x.owner === S.user.uid ? ' · maître du jeu' : ''}</span></span>
        ${x.id === cur ? '<span class="pill amber">ici</span>' : `<button class="btn small" data-action="party-open" data-id="${esc(x.id)}">Ouvrir</button>`}</div>`).join('')}
      <div class="tuiles2"><a class="card tuile2-l" href="#parties" data-action="parties-ouvrir" data-k="parties-rejoindre"><span class="tuile2-i">＋</span><span class="col" style="gap:0"><b>Rejoindre</b><span class="tiny muted">avec un code</span></span></a>
        <a class="card tuile2-l" href="#parties" data-action="parties-ouvrir" data-k="parties-creer"><span class="tuile2-i">＋</span><span class="col" style="gap:0"><b>Créer</b><span class="tiny muted">ta partie</span></span></a></div>
    </section>
    ${z.chef && !chefACreer() ? (S.chefEdit ? creationChefHtml() : '<button type="button" class="btn small outline block" data-action="chef-modifier">Changer le portrait ou la devise de mon chef</button>') : ''}
    <details class="card repli" data-k="profil-edit" ${editer ? 'open' : ''}>
      <summary><span style="color:var(--amber)">${icon('pencil', 18)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Modifier ma zone</span><span class="tiny muted">pseudo, nom, code et couleur</span></span>${icon('chevron', 16)}</summary>
    <form class="col" data-form="profil" style="gap:12px">
      <label class="field">Ton prénom ou pseudo<input class="text" name="pseudo" maxlength="24" required value="${esc(p.pseudo || '')}"></label>
      <label class="field">Nom de la zone<input class="text" name="nom" maxlength="24" required value="${esc(z.nom)}"></label>
      <label class="field">Code de zone (4 chiffres)<input class="text mono" name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required value="${esc(z.code)}"></label>
      <fieldset style="border:none;padding:0;margin:0" class="col"><legend class="small muted" style="font-weight:600;margin-bottom:6px">Couleur</legend>
        <div class="swatches">${COULEURS_ZONE.map((c, i) => `<button type="button" class="swatch" style="background:${c}" data-action="pick-color-profil" data-color="${c}" aria-pressed="${(S.profilColor || z.couleur) === c}" ${i >= 6 && !etendue ? 'disabled title="Grade Inspecteur requis"' : ''} aria-label="Couleur ${i + 1}"></button>`).join('')}</div>
      </fieldset>
      <button class="btn primary block" type="submit">Enregistrer</button>
    </form></details>
    ${recompensesGrade(z)}
    <details class="card repli" data-k="profil-install"><summary><span style="color:var(--amber)">📱</span><span class="col grow" style="gap:0"><span style="font-weight:600">Installer sur ton téléphone</span><span class="tiny muted">une icône comme une vraie appli</span></span>${icon('chevron', 16)}</summary>
      <p class="small muted" style="margin:0">Android (Chrome) : menu ⋮ puis « Installer l’application ». iPhone (Safari) : bouton Partager puis « Sur l’écran d’accueil ».</p></details>
    <p class="tiny muted" style="margin:0">Connecté${S.user.email ? ` : ${esc(S.user.email)}` : ''}</p>
    <button class="btn danger block" data-action="logout">Se déconnecter</button>
  </main>${tabbar('hp')}`;
  }
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <section class="card profil-carte" style="--zc:${esc(z.couleur || '#5AA0F0')}">
      <div class="pc-scene">${sceneZone(z, S.state, monDecor(z), mesSkins(z).choix)}</div>
      <div class="pc-id">
        <span class="pc-insigne">${p.blason ? blasonSvg(p.blason, z.couleur, 40, '') : `<span class="pc-ecu">${icon('shield', 24)}</span>`}</span>
        <span class="col" style="gap:1px;min-width:0"><span class="pc-pseudo">${esc(p.pseudo || 'Sans pseudo')}</span>
          <span class="small muted">Chef de la <strong style="color:var(--zc)">ZP ${esc(z.code)} ${esc(z.nom)}</strong></span></span>
      </div>
      <div class="pc-grade">
        <div class="between"><span style="font-weight:700">${esc(g.nom)}</span><span class="tiny muted mono">${z.ps} PS${n ? ` · ${esc(n.nom)} à ${n.ps}` : ' · grade maximal'}</span></div>
        <span class="pc-barre"><span style="width:${Math.max(3, pct)}%"></span></span>
      </div>
      <div class="pc-stats">
        ${stat(z.ipz !== undefined && z.ipz !== null ? fmt1(z.ipz) : '—', 'IPZ')}
        ${stat(`${nbTro}<small>/${TROPHEES.length}</small>`, 'Trophées')}
        ${stat(affiches.length, `Arrestation${affiches.length > 1 ? 's' : ''}`)}
        ${stat(records.length, `Record${records.length > 1 ? 's' : ''}`)}
        ${stat(z.toursJoues || 0, 'Tours joués')}
        ${stat(z.faillites || 0, `Faillite${(z.faillites || 0) > 1 ? 's' : ''}`)}
      </div>
      ${records.length || (z.titres || []).length || (z.badges || []).length ? `<div class="pc-titres">
        ${records.map((t) => `<span class="pc-plaque">🏆 ${esc(t.titre)} <small>niv. ${t.niveau} · ${esc(p.pseudo || '')}</small></span>`).join('')}
        ${(z.titres || []).map((t) => `<span class="pc-plaque">${icon('trophy', 12)} ${esc(t)}</span>`).join('')}
        ${(z.badges || []).map((b) => `<span class="pc-plaque argent">${esc(b)}</span>`).join('')}
      </div>` : ''}
      ${affiches.length ? `<div class="pc-affiches" aria-label="Suspects arrêtés">${affiches.slice(0, 6).map((a) => `<span class="pc-affiche" title="${esc(a.titre)} · saison ${a.season}"><b>ARRÊTÉ</b><span>${esc(String(a.nom).split(' ')[0])}</span></span>`).join('')}</div>` : ''}
    </section>
    ${z.chef ? `<button type="button" class="btn primary block" data-action="bureau-ouvrir">${portraitChef(z.uid, 22, { galons: false })} Voir mon chef de corps</button>` : ''}
    ${z.chef && !chefACreer() ? (S.chefEdit ? creationChefHtml() : '<button type="button" class="btn small outline block" data-action="chef-modifier">Changer le portrait ou la devise de mon chef</button>') : ''}
    <details class="card repli" data-k="profil-edit" ${editer ? 'open' : ''}>
      <summary><span style="color:var(--amber)">${icon('pencil', 18)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Modifier ma zone</span><span class="tiny muted">pseudo, nom, code et couleur</span></span>${icon('chevron', 16)}</summary>
    <form class="col" data-form="profil" style="gap:12px">
      <label class="field">Ton prénom ou pseudo<input class="text" name="pseudo" maxlength="24" required value="${esc(p.pseudo || '')}"></label>
      <label class="field">Nom de la zone<input class="text" name="nom" maxlength="24" required value="${esc(z.nom)}"></label>
      <label class="field">Code de zone (4 chiffres)<input class="text mono" name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required value="${esc(z.code)}"></label>
      <fieldset style="border:none;padding:0;margin:0" class="col"><legend class="small muted" style="font-weight:600;margin-bottom:6px">Couleur</legend>
        <div class="swatches">${COULEURS_ZONE.map((c, i) => `<button type="button" class="swatch" style="background:${c}" data-action="pick-color-profil" data-color="${c}" aria-pressed="${(S.profilColor || z.couleur) === c}" ${i >= 6 && !etendue ? 'disabled title="Grade Inspecteur requis"' : ''} aria-label="Couleur ${c}"></button>`).join('')}</div>
      </fieldset>
      <button class="btn primary block" type="submit">Enregistrer</button>
    </form></details>
    ${recompensesGrade(z)}
    <a class="list-row" href="#parties"><span class="col grow" style="gap:1px"><span style="font-weight:600">Changer de partie</span><span class="small muted">${esc((S.partie && S.partie.nom) || '')} · rejoindre ou créer une partie</span></span>${icon('chevron', 18)}</a>
    <section class="card"><h2 class="card-title">Installer le jeu sur ton téléphone</h2>
      <p class="small muted" style="margin:0">Android (Chrome) : menu ⋮ puis « Installer l’application ». iPhone (Safari) : bouton Partager puis « Sur l’écran d’accueil ».</p></section>
    <p class="tiny muted" style="margin:0">Connecté${S.user.email ? ` : ${esc(S.user.email)}` : ''}</p>
    <button class="btn danger block" data-action="logout">Se déconnecter</button>
  </main>${tabbar('hp')}`;
}
