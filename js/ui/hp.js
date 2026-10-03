import { noteVue } from './nouveautes.js';
// Écran HP (Hôtel de police) : l'accueil.
import { cabossesChoisis } from '../engine/parc.js';
import { S, esc, icon, fmt1, fmtK, gauge, tabbar, rangDe, gradeInfo, myZone, skyline, cielStyle } from './common.js';
import { agentsDisponibles, blessesActifs, enFormation, vehiculesDisponibles } from '../engine/zone.js';
import { coutCarrosserie } from '../engine/sinistres.js';
import { formatCountdown, formatDateBe } from '../engine/time.js';
import { QUEST_LABELS } from '../quests/quests.js';
import { COULEURS_ZONE } from '../engine/constants.js';
import { estimations } from './ordres.js';
import { operationActive } from '../engine/zone.js';
import { fipaCards } from './fipa.js';
import { blasonSvg, BLASONS, insigne } from './blasons.js';
import { GRADES, gradeFor } from '../engine/constants.js';
import { PERIL, DUEL_INDICATEURS } from '../engine/rivalites.js';
import { affaire, dossierDe, pointsDecouverte, ENQ } from '../engine/enquete.js';
import { aideBtn } from './aide.js';
import { sceneCarteHtml } from './logistique.js';
import { encheresHtml } from './encheres.js';
import { TUTELLE } from '../engine/constants.js';
import { equipeHtml } from './equipe.js';
import { fraisFixes, pointsIpz, IPZ_LABELS, confianceCommune, moralMult, moyenneIpz } from '../engine/zone.js';
const AIDE_COMP = { satisfaction: 'satisfaction', affaires: 'terrain', moral: 'moral', budget: 'budgetIpz', reputation: 'reputation' };
import { IPZ_POIDS, TERRAIN, BUDGET_IPZ } from '../engine/constants.js';
const fraisFixesDuJour = (z) => { let amendes = 0; try { amendes = estimations().amendes; } catch (e) { /* pas de brouillon */ } return fraisFixes(z, S.state, { amendes, rythme: (S.draft && S.draft.rythme) || 'normal' }).total; };
import { demandeRenfortHtml, appelsRenfort, renfortPrevu } from './renfort.js';
import { secteursEnDanger, agentsND } from './nondroit.js';
import { nomSecteur } from '../engine/nondroit.js';
import { operationActive as opActive } from '../engine/zone.js';
import { incidentsHtml, incidentEnCours, duree } from './incidents.js';

/** Petite flèche d'évolution depuis la veille. */
function delta(v, avant) {
  if (avant === undefined || avant === null) return '';
  const d = Math.round((v - avant) * 10) / 10;
  if (Math.abs(d) < 0.05) return '';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${fmt1(Math.abs(d))}</span>`;
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
    <span class="tiny muted"><strong>Résultats terrain</strong> (ce ne sont pas les PS, qui servent aux grades) = ${TERRAIN.incidents} × part des incidents traités + ${fmt1(TERRAIN.parPoint)} × bilan des points (points du jour + moitié du bilan d’hier), plafonné à 100${det ? ` · ce tour : ${det.traites}/${det.incidents} incidents, ${fmt1(det.points)} points, bilan ${fmt1(det.bilan !== undefined ? det.bilan : det.points)}` : ''}. <strong>Budget</strong> = 50 + 1,5 × budget en k€ (100 de 34 à ${BUDGET_IPZ.dormant} k€ ; au-delà, l’argent qui dort coûte ${BUDGET_IPZ.pente} point par k€).</span>
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
    ${lignes.map((l) => `<p class="small" style="margin:0">• ${esc(l)}</p>`).join('')}</div>`;
}

function cleNuit(z) { return `mazp-nuit-${S.backend.gameId ? S.backend.gameId() : ''}-${S.state.season}-${S.state.turn}-${z.uid}`; }

/** Carte « Résultat de la nuit », affichée jusqu'à ce que le joueur la ferme. */
function nuitHtml(z) {
  if (!z.hier || !z.rapport || !z.rapport.length || S.nuitVue === cleNuit(z)) return '';
  try { if (localStorage.getItem(cleNuit(z))) return ''; } catch (e) { /* pas de stockage : on l'affiche */ }
  const lignes = [
    ['IPZ', z.ipz, z.hier.ipz], ['Satisfaction', z.satisfaction, z.hier.satisfaction], ['Moral', z.moral, z.hier.moral],
    ['Budget', z.budget, z.hier.budget, ' k€'], ['Réputation', z.reputation, z.hier.reputation],
  ].filter(([, v, a]) => a !== undefined && Math.abs(v - a) >= 0.05);
  const importants = z.rapport.filter((l) => !/^Pas d’ordres/.test(l)).slice(0, 4);
  return `<section class="card" aria-label="Résultat de la nuit" style="border-color:var(--blue-soft)">
    <div class="between"><span class="kicker" style="color:var(--blue-soft)">Résultat de la nuit · tour ${S.state.turn - 1 || ''}</span>
      <button class="btn small ghost" data-action="nuit-ok">OK</button></div>
    ${lignes.length ? `<div class="row" style="gap:6px;flex-wrap:wrap">${lignes.map(([l, v, a, u]) => `<span class="pill">${l} ${fmt1(v)}${u || ''} ${delta(v, a)}</span>`).join('')}</div>` : ''}
    <div class="col" style="gap:4px">${importants.map((l) => `<p class="small" style="margin:0;color:var(--text2)">• ${esc(l)}</p>`).join('')}</div>
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
function situationPastilles(z) {
  const l = z.pressions || [];
  if (!l.length) return '';
  return `<div class="soir-situ" aria-label="Situation du jour">${l.map((p) => `<a class="pill amber" href="#ordres" title="${esc(p.texte)}">${esc(p.titre)}${String(p.texte || '').length <= 32 ? ` · ${esc(p.texte.replace(/\.$/, ''))}` : ' ›'}</a>`).join('')}</div>`;
}

function ceSoirHtml(st, z, { ordresOk, faites, reussies, invit }) {
  const d = S.draft || {};
  const nbDem = (d.demarches || []).length;
  const items = [];
  items.push({ ok: ordresOk, href: '#ordres', t: ordresOk ? 'Ordres validés' : S.ordersDirty ? 'Ordres modifiés : à valider' : 'Passer et valider tes ordres', s: ordresOk ? 'modifiables jusqu’à 20:00' : 'sans ordres validés, ce tour ne compte pas pour le classement' });
  items.push({ ok: !!d.decision || !!d.sansDecision, href: '#ordres-decision', t: d.decision ? 'Grande décision choisie' : d.sansDecision ? 'Grande décision : aucune ce soir' : 'Grande décision', s: d.decision ? 'payée à 20:00 si le budget le permet' : d.sansDecision ? 'tu peux encore changer d’avis' : 'en choisir une, ou « Aucune ce soir »' });
  const pc = z.pointChaud;
  if (pc) {
    const a = (d.patrouilles || {})[pc.cell] || 0;
    items.push({ ok: a >= 2, href: '#carte', t: a >= 2 ? `Point chaud : ${a} agents envoyés` : `Point chaud : ${pc.titre.toLowerCase()}`, s: a >= 2 ? 'désamorcé à 20:00 si tes ordres sont validés' : 'envoie 2 patrouilles depuis la Carte' });
  }
  if (st.enquete) items.push({ ok: nbDem >= 1 || (d.accusation !== null && d.accusation !== undefined), href: '#enquete', t: `Enquête : ${nbDem} démarche${nbDem > 1 ? 's' : ''} sur 2`, s: (st.traques || []).length ? 'une traque est en cours !' : 'constatations, vérifications, partage, accusation' });
  const inc = incidentEnCours();
  if (inc) items.unshift({ ok: false, href: '#hp-incidents', t: `Incident en cours : ${esc(inc.titre)}`, s: `encore ${duree(inc.ferme - Date.now())} pour intervenir, sinon ton équipe se débrouille seule` });
  items.push({ ok: faites >= 3, href: '#quete', t: `Énigmes : ${faites} sur 3`, s: reussies >= 2 ? 'bonus débloqué' : 'bonus dès 2 bonnes réponses' });
  const fipa = (st.fipas || []).filter((f) => (f.demandeur === z.uid && f.etape === 'demande' && f.tourDecision === st.turn) || (f.partenaire === z.uid && f.etape === 'invite' && f.tourReponse === st.turn) || (f.etape === 'accepte' && f.tourJ === st.turn && (f.demandeur === z.uid || f.partenaire === z.uid)));
  if (fipa.length) items.push({ ok: !!(d.fipa || d.fipaReponse || d.fipaChoix), href: '#hp-fipa', t: 'FIPA : une décision t’attend', s: 'voir la carte FIPA ci-dessous' });
  if (st.conseil && st.conseil.tour === st.turn) items.push({ ok: Object.keys(d.votes || {}).length > 0, href: '#diplomatie', t: 'Conseil de police : voter', s: 'une voix par zone, résultat à 20:00' });
  if (invit) items.push({ ok: !!d.duelReponse, href: '#diplomatie', t: 'Répondre au défi en duel', s: 'sans réponse, c’est un refus' });
  const reste = items.filter((i) => !i.ok).length;
  const fait = items.length - reste;
  return `<section class="card soir" aria-label="Prochain tour" style="${cielStyle()}">
    <div class="soir-ciel" aria-hidden="true"><i class="soir-astre"></i>${skyline()}</div>
    <div class="soir-tete">
      <span class="soir-l">Résolution du tour à 20:00 dans</span>
      <span id="countdown" class="soir-cd">${formatCountdown(st.nextDeadline - Date.now())}</span>
      <span class="soir-prog" role="img" aria-label="${fait} sur ${items.length} fait">${items.map((i) => `<i class="${i.ok ? 'on' : ''}"></i>`).join('')}</span>
    </div>
    ${situationPastilles(z)}
    <p class="soir-etat ${reste ? '' : 'ok'}">${reste ? `${reste} chose${reste > 1 ? 's' : ''} à faire avant ce soir` : 'Tout est prêt pour ce soir'}</p>
    ${reste ? `<div class="col soir-todo" style="gap:6px">${items.map((i) => `<a class="todo ${i.ok ? 'done' : ''}" href="${i.href}"><span class="box" aria-hidden="true">${i.ok ? icon('check', 14) : ''}</span>
      <span class="col grow" style="gap:0"><span style="font-weight:600">${i.t}</span><span class="tiny muted">${i.s}</span></span>${icon('chevron', 16)}</a>`).join('')}</div>` : ''}
  </section>`;
}

export function renderHP() {
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
  const faites = qr.filter((r) => r && (r.statut === 'ok' || r.statut === 'rate')).length;
  const reussies = qr.filter((r) => r && r.statut === 'ok').length;
  const questDone = faites >= 3;

  const alertes = [];
  const bless = z.blesses.filter((b) => b.retour > T);
  for (const b of bless) {
    const tours = b.retour - T;
    const pl = b.n > 1;
    const motif = { 'blessé': pl ? 'blessés' : 'blessé', malade: pl ? 'malades' : 'malade', 'épuisé': pl ? 'épuisés' : 'épuisé', 'enquête interne': 'en enquête interne' }[b.motif] || b.motif;
    alertes.push({ cls: 'red', titre: `${b.n} agent${pl ? 's' : ''} ${motif}`, texte: `de retour dans ${tours} tour${tours > 1 ? 's' : ''}`, href: '#ordres' });
  }
  if (st.evenement) {
    const dans = st.evenement.tour - T;
    const requis = 3 * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length;
    alertes.push({ cls: 'amber', titre: dans === 0 ? `${esc(st.evenement.titre)} : ce soir !` : `${esc(st.evenement.titre)} dans ${dans} tour${dans > 1 ? 's' : ''}`, texte: `environ ${requis} agents requis pour tout le district`, href: dans === 0 ? '#ordres' : '#carte' });
  }
  const cab = (z.cabosses || []).length;
  if (cab) {
    const choix = cabossesChoisis(z, S.draft && S.draft.depenses && S.draft.depenses.carrosserie), prevu = choix.length;
    alertes.push({ cls: prevu ? 'blue' : 'red', titre: `${cab} véhicule${cab > 1 ? 's' : ''} cabossé${cab > 1 ? 's' : ''}`, texte: prevu ? `${prevu < cab ? `${prevu} sur ${cab} ` : ''}en carrosserie ce soir (${fmt1(coutCarrosserie(z, choix))} k€)` : `carrosserie dans tes dépenses (${fmt1(coutCarrosserie(z))} k€), sinon ton image en prend un coup chaque tour`, href: '#ordres' });
  }
  for (const x of z.indemnites || []) alertes.push({ cls: 'blue', titre: `Assurance : +${fmt1(x.montant)} k€ attendus`, texte: `remboursement du véhicule sinistré, ${x.tour - T <= 0 ? 'ce soir' : `dans ${x.tour - T} tour${x.tour - T > 1 ? 's' : ''}`}`, href: '#ordres' });
  if (z.paperasse > 14) alertes.push({ cls: 'red', titre: `Paperasse : ${Math.round(z.paperasse)} dossiers en attente`, texte: 'au-delà de 20, gare à l’Inspection', href: '#ordres' });
  if (z.budget < 0) alertes.push({ cls: 'red', titre: 'Budget dans le rouge', texte: 'deux tours de suite et c’est l’Inspection', href: '#ordres' });
  else if (z.budget > BUDGET_IPZ.dormant) alertes.push({ cls: 'amber', titre: `${fmtK(z.budget)} qui dorment`, texte: `au-delà de ${BUDGET_IPZ.dormant} k€, ton IPZ budget baisse : investis (réserve, prévention, formation, matériel…)`, href: '#ordres' });
  const vieux = z.dossiers.filter((d) => d.age > 6).length;
  if (vieux) alertes.push({ cls: 'amber', titre: `${vieux} dossier${vieux > 1 ? 's' : ''} qui traîne${vieux > 1 ? 'nt' : ''}`, texte: 'renforce la Recherche', href: '#ordres' });
  { const dg = S.draft ? secteursEnDanger() : []; if (dg.length) alertes.unshift({ cls: 'red', titre: `Zone de non-droit : ${dg.map((k) => esc(nomSecteur(k))).join(', ')} menacé${dg.length > 1 ? 's' : ''}`, texte: 'le milieu remonte : mets 2 ou 3 agents de garde ce soir', href: '#terrain' }); }
  if (st.nonDroit && S.draft && !agentsND()) { const sc = Object.values(st.nonDroit.secteurs); const hier = sc.reduce((n, x) => n + ((x.hier || []).length ? 1 : 0), 0); alertes.push({ cls: 'blue', titre: `Zone de non-droit : ${sc.filter((x) => x.statut === 'repris').length} secteur${sc.filter((x) => x.statut === 'repris').length > 1 ? 's' : ''} repris sur ${sc.length}`, texte: hier ? `des zones y étaient hier sur ${hier} secteur${hier > 1 ? 's' : ''} : rejoins-les, à plusieurs ça tombe plus vite` : 'personne n’y était hier : lance le mouvement sur la radio', href: '#terrain' }); }
  if (st.affaires.length) alertes.push({ cls: 'blue', titre: `${st.affaires.length} affaire${st.affaires.length > 1 ? 's' : ''} disputée${st.affaires.length > 1 ? 's' : ''} sur la carte`, texte: st.affaires.map((a) => esc(a.titre)).join(' · '), href: '#carte' });

  if (st.conseil && st.conseil.tour === T) alertes.unshift({ cls: 'amber', titre: 'Conseil de police : vote ce soir', texte: st.conseil.motions.map((m) => esc(m.titre)).join(' · '), href: '#diplomatie' });
  const invit = (st.duels || []).find((d) => d.b === z.uid && d.etape === 'propose' && d.tourReponse === T);
  if (invit) alertes.unshift({ cls: 'amber', titre: `${esc(st.zones[invit.a]?.nom || 'Une zone')} te défie en duel`, texte: `${esc(DUEL_INDICATEURS[invit.ind].nom.toLowerCase())} · réponds avant 20:00`, href: '#diplomatie' });
  for (const a of appelsRenfort()) if (!renfortPrevu(a.uid)) alertes.unshift({ cls: 'amber', titre: `${esc(a.zone.nom)} appelle du renfort`, texte: `${a.agents} agents demandés pour « ${esc(a.op.titre)} » · prête des agents contre de la réputation`, href: '#prive' });
  const perils = Object.values(st.zones).filter((x) => (x.peril || x.tutelle) && x.uid !== z.uid);
  if (perils.length) alertes.push({ cls: 'red', titre: `${perils.map((x) => esc(x.nom)).join(', ')} en difficulté`, texte: 'un coup de main rapporte jusqu’à +7 de réputation', href: '#diplomatie' });
  const op = operationActive(z, T);
  if (op) alertes.unshift({ cls: 'red', titre: `Opération d\u2019envergure : ${esc(op.titre)}`, texte: `dispositif à régler dans tes ordres${op.duree > 1 ? ` · jour ${T - op.tourDebut + 1} sur ${op.duree}` : ''}`, href: '#ordres' });
  const tr = (st.traques || [])[0];
  if (tr) { const ta = affaire(st, tr.n); alertes.unshift({ cls: 'red', titre: `Traque : ${esc(ta.suspects[ta.coupable].nom)} en fuite`, texte: `${tr.tours} tour${tr.tours > 1 ? 's' : ''} pour l’arrêter`, href: '#enquete' }); }
  const dotColor = { red: 'var(--red)', amber: 'var(--amber)', blue: 'var(--blue)' };
  const last = S.gazettes[0];

  return `<main class="screen hp">
    <header class="between" style="align-items:flex-start">
      <div class="col" style="gap:3px"><h1 class="brand">Ma ZP</h1><a class="sub" href="#parties" style="text-decoration:none">Hôtel de police · <span style="color:var(--amber-soft);text-decoration:underline">${esc((S.partie && S.partie.nom) || 'District Delta')}</span></a></div>
      <div class="col" style="gap:6px;align-items:flex-end">
        <span class="row" style="gap:6px"><span class="pill">Tour ${T} · Saison ${st.season}</span>
          <button type="button" class="iconbtn roue" data-action="menu-hp" aria-expanded="${!!S.menuHp}" aria-label="Guide, nouveautés et profil">${icon('gear', 20)}${noteVue() ? '' : '<i class="roue-pastille" aria-hidden="true"></i>'}</button></span>
        <a href="#classement" class="row" style="gap:6px;text-decoration:none;color:var(--text)">
          <span style="color:var(--amber)">${icon('shield', 14)}</span><span class="small" style="font-weight:600">${g.nom}</span>
          <span role="img" aria-label="${z.ps} points de service${n ? ` sur ${n.ps}` : ''}" style="width:56px;height:5px;background:var(--line);border-radius:3px;display:inline-block"><span style="display:block;width:${pct}%;height:5px;background:var(--amber);border-radius:3px"></span></span>
        </a>
      </div>
    </header>
    ${S.menuHp ? `<nav class="card menu-hp" aria-label="Menu">
      <a class="list-row" href="#guide">${icon('news', 18)}<span>Guide du joueur</span></a>
      <button type="button" class="list-row" data-action="maj-voir">${icon('star', 18)}<span>Nouveautés${noteVue() ? '' : ' <span class="tiny" style="color:var(--amber)">· nouvelle version</span>'}</span></button>
      <a class="list-row" href="#profil">${icon('gear', 18)}<span>Profil</span></a>
      ${S.backend.isMaster(S.user) ? `<a class="list-row" href="#admin">${icon('shield', 18)}<span>Maître du jeu</span></a>` : ''}
    </nav>` : ''}

    ${ceSoirHtml(st, z, { ordresOk, faites, reussies, invit })}
    ${incidentsHtml()}
    <section class="card" aria-label="Ma zone">
      <div class="between">
        <div class="row" style="gap:10px;min-width:0">
          ${S.player && S.player.blason && GRADES.indexOf(gradeFor(z.ps)) >= 4 ? blasonSvg(S.player.blason, z.couleur, 32) : `<span style="width:12px;height:36px;border-radius:4px;background:${esc(z.couleur)};flex-shrink:0"></span>`}
          <div class="col" style="gap:1px;min-width:0">
            <span class="mono small" style="color:var(--blue-soft)">ZP ${esc(z.code)} ${insigne(z.ps)}</span>
            ${S.editingName ? `<form class="row" data-form="rename" style="gap:6px"><label class="sr" for="nom-zone">Nom de la zone</label>
              <input id="nom-zone" class="text" name="nom" maxlength="24" value="${esc(z.nom)}" style="min-height:36px;width:150px;font:700 18px var(--display)">
              <button class="btn primary small" type="submit">OK</button></form>`
              : `<div class="row" style="gap:2px"><h2 style="margin:0;font-family:var(--display);font-size:25px;font-weight:700;line-height:1.05;overflow-wrap:break-word">${esc(z.nom)}</h2>
              <button class="iconbtn" data-action="rename" aria-label="Renommer la zone">${icon('pencil', 16)}</button></div>`}
          </div>
        </div>
        <div class="col" style="gap:2px;align-items:flex-end;flex-shrink:1;text-align:right">
          <span class="row" style="gap:6px;flex-shrink:0;white-space:nowrap"><span class="mono" style="font-size:18px" aria-label="Indice de performance de zone : ${fmt1(z.ipz)}">IPZ ${fmt1(z.ipz)}</span>${delta(z.ipz, z.hier && z.hier.ipz)}${aideBtn('ipz', 'Qu’est-ce que l’IPZ ?')}</span>
          <span class="tiny muted">${z.toursJoues ? `moy. saison ${fmt1(moyenneIpz(z))} · ` : ""}${z.toursJoues >= 5 ? `${rang}${rang === 1 ? 'er' : 'e'} sur ${total} zone${total > 1 ? 's' : ''}` : `non classé · ${z.toursJoues}/5 tours joués`}</span>
        </div>
      </div>
      ${sceneCarteHtml()}
      <div class="tiles">
        <div class="tile"><span class="l">Agents</span><span class="v">${dispo}<span class="muted" style="font-size:13px"> / ${z.agents}</span></span>
          <span class="s ${blesses ? 'bad' : ''}">${blesses ? `${blesses} absent${blesses > 1 ? 's' : ''}` : form ? `${form} en formation` : z.academie.length ? `${z.academie.reduce((s, a) => s + a.n, 0)} à l’académie` : 'tous disponibles'}</span></div>
        <button type="button" class="tile tile-btn" data-action="budget" aria-label="Détail du budget"><span class="l row" style="gap:4px">Budget ${icon('chevron', 12)}</span><span class="v ${z.budget < 0 ? 'bad' : ''}">${fmtK(z.budget)}</span><span class="s ${fraisFixesDuJour(z) < 0 ? 'bad' : ''}">${fraisFixesDuJour(z) >= 0 ? '+' : '−'}${fmt1(Math.abs(fraisFixesDuJour(z)))} k€/jour · détail</span></button>
        <button type="button" class="tile tile-btn" data-action="logistique" aria-label="Bâtiments et véhicules"><span class="l row" style="gap:4px">Véhicules ${icon('chevron', 12)}</span><span class="v">${vDispo}<span class="muted" style="font-size:13px"> / ${z.vehicules}</span></span><span class="s ${cab || 100 - z.usure < 60 ? 'bad' : 100 - z.usure < 80 ? 'warn' : ''}">état ${Math.round(100 - z.usure)} %${cab ? ` · ${cab} cabossé${cab > 1 ? 's' : ''}` : 100 - z.usure < 80 ? ' · révision ?' : ''}</span></button>
      </div>
      <div class="col" style="gap:9px">
        ${gauge('Moral', z.moral, 'var(--amber)', delta(z.moral, z.hier && z.hier.moral) + aideBtn('moral'))}
        <div class="between small" style="margin-top:-4px"><span class="muted">Efficacité de tes agents</span><span class="mono ${moralMult(z.moral) >= 1 ? 'ok' : 'bad'}">${Math.round(moralMult(z.moral) * 100)} %</span></div>
        ${z.ipzComp ? gauge('Résultats terrain', z.ipzComp.affaires, 'var(--blue-soft)', delta(z.ipzComp.affaires, z.ipzCompHier && z.ipzCompHier.affaires) + aideBtn('terrain', 'Comment gagner des résultats terrain')) : ''}
        ${gauge('Satisfaction citoyenne', z.satisfaction, 'var(--blue)', delta(z.satisfaction, z.hier && z.hier.satisfaction) + aideBtn('satisfaction'))}
        ${gauge('Réputation', z.reputation, 'var(--green)', delta(z.reputation, z.hier && z.hier.reputation) + aideBtn('reputation'))}
        <div class="between small" style="margin-top:-4px"><span class="row muted" style="gap:4px">Confiance de la commune${aideBtn('confiance')}</span><span class="mono ${confianceCommune(z) > 0 ? 'ok' : confianceCommune(z) < 0 ? 'bad' : 'muted'}">${confianceCommune(z) >= 0 ? '+' : '−'}${fmt1(Math.abs(confianceCommune(z)))} k€ / jour</span></div>
      </div>
    </section>
    <div class="duo">${encheresHtml()}${equipeHtml()}</div>

    ${nuitHtml(z)}


    ${z.tutelle ? `<section class="card red" aria-label="Zone sous tutelle"><span class="kicker" style="color:var(--red-soft)">Zone sous tutelle · verdict dans ${z.tutelle.fin - T + 1} résolution${z.tutelle.fin - T + 1 > 1 ? 's' : ''}</span>
      <span style="font-weight:700">${(z.tutelle.raisons || []).length ? esc(z.tutelle.raisons.join(', ')) : 'La zone tient le cap : continue comme ça'}</span>
      <span class="small">Dernière chance : si ta zone est encore en péril au tour ${z.tutelle.fin}, c’est la faillite. En attendant : pas de rythme renforcé, d’agents de réserve, de manœuvre, de duel ni d’enchère, et seul le recrutement est permis comme grande décision. Tes collègues peuvent t’aider.</span>
      <a class="small" href="#guide-faillite">Tutelle et faillite dans le guide</a></section>` : ''}
    ${z.peril ? `<section class="card red" aria-label="Zone en péril"><span class="kicker" style="color:var(--red-soft)">Zone en péril · ${z.tutelleSaison ? 'faillite' : 'tutelle'} dans ${z.peril.fin - T + 1} résolution${z.peril.fin - T + 1 > 1 ? 's' : ''}</span>
      <span style="font-weight:700">${esc((z.peril.raisons || []).join(', '))}</span>
      <span class="small">Pour t’en sortir : budget au-dessus de ${PERIL.budget} k€, au moins ${PERIL.agents} agents disponibles, moral au-dessus de ${PERIL.moral}. Rythme allégé, prime, moins de dépenses ; tes collègues peuvent t’aider.</span>
      <a class="small" href="#guide-faillite">${z.tutelleSaison ? 'Ce qui se passe en cas de faillite' : `Tutelle (${TUTELLE.tours} tours sous contrôle) puis faillite`}</a></section>` : ''}
    ${opActive(z, T) ? `<section class="card red" aria-label="Renfort" style="gap:8px"><span class="kicker" style="color:var(--red-soft)">Opération d’envergure · ${esc(opActive(z, T).titre)}</span>${demandeRenfortHtml()}</section>` : ''}
    <div id="hp-fipa">${fipaCards()}</div>


    ${alertes.length ? `<section class="col" aria-label="À traiter"><h2 class="section">À traiter</h2>
      ${alertes.map((a) => `<a class="list-row" href="${a.href}" ${a.cls === 'red' ? 'style="background:var(--red-bg);border-color:var(--red-line)"' : ''}><span class="bullet" style="background:${dotColor[a.cls]}"></span>
        <span class="col" style="gap:1px"><span style="font-weight:600">${a.titre}</span><span class="small muted">${a.texte}</span></span></a>`).join('')}</section>` : ''}

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
  if (gi >= 5) out.push(`<section class="card tight"><span class="kicker">Chef de corps</span><span class="small">${z.motionSaison ? 'Ta motion de la saison est déposée.' : 'Tu peux proposer une motion au Conseil cette saison, depuis l’écran Diplomatie.'}</span></section>`);
  return out.join('');
}

export function renderProfil() {
  const z = myZone();
  const p = S.player || {};
  const { g } = gradeInfo(z.ps);
  const etendue = z.ps >= 200;
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <div class="col" style="gap:3px"><span class="kicker">Profil</span><h1 class="big">ZP ${esc(z.code)} ${esc(z.nom)}</h1><p class="sub">${g.nom} · ${z.ps} points de service</p></div>
    <form class="card" data-form="profil">
      <label class="field">Ton prénom ou pseudo<input class="text" name="pseudo" maxlength="24" required value="${esc(p.pseudo || '')}"></label>
      <label class="field">Nom de la zone<input class="text" name="nom" maxlength="24" required value="${esc(z.nom)}"></label>
      <label class="field">Code de zone (4 chiffres)<input class="text mono" name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required value="${esc(z.code)}"></label>
      <fieldset style="border:none;padding:0;margin:0" class="col"><legend class="small muted" style="font-weight:600;margin-bottom:6px">Couleur</legend>
        <div class="swatches">${COULEURS_ZONE.map((c, i) => `<button type="button" class="swatch" style="background:${c}" data-action="pick-color-profil" data-color="${c}" aria-pressed="${(S.profilColor || z.couleur) === c}" ${i >= 6 && !etendue ? 'disabled title="Grade Inspecteur requis"' : ''} aria-label="Couleur ${c}"></button>`).join('')}</div>
      </fieldset>
      <button class="btn primary block" type="submit">Enregistrer</button>
    </form>
    ${recompensesGrade(z)}
    <section class="card"><h2 class="card-title">Carrière</h2>
      <p class="small" style="margin:0">Faillites : <strong>${z.faillites || 0}</strong>${(z.badges || []).length ? ` · Badges : ${z.badges.map((b) => `<strong>${esc(b)}</strong>`).join(', ')}` : ''}</p></section>
    ${z.titres && z.titres.length ? `<section class="card"><h2 class="card-title">Titres</h2>${z.titres.map((t) => `<p class="small" style="margin:0">${icon('trophy', 14)} ${esc(t)}</p>`).join('')}</section>` : ''}
    <a class="list-row" href="#parties"><span class="col grow" style="gap:1px"><span style="font-weight:600">Changer de partie</span><span class="small muted">${esc((S.partie && S.partie.nom) || '')} · rejoindre ou créer une partie</span></span>${icon('chevron', 18)}</a>
    <section class="card"><h2 class="card-title">Installer le jeu sur ton téléphone</h2>
      <p class="small muted" style="margin:0">Android (Chrome) : menu ⋮ puis « Installer l’application ». iPhone (Safari) : bouton Partager puis « Sur l’écran d’accueil ».</p></section>
    <p class="tiny muted" style="margin:0">Connecté${S.user.email ? ` : ${esc(S.user.email)}` : ''}${p.bot ? '' : ''}</p>
    <button class="btn danger block" data-action="logout">Se déconnecter</button>
  </main>${tabbar('hp')}`;
}
