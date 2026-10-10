// Écran Enquête : le tableau Mobile · Moyen · Occasion, les pièces, les planques et les notes.
import { zoneAvecAgenda } from './chef.js';
import { formatDateBe } from '../engine/time.js';
import { enService } from '../engine/flotte.js';
import { banniereDebrief } from './debrief.js';
import { S, esc, icon, fmt1, tabbar, myZone, zoneName, bonusEnigme } from './common.js';
import { capacite } from '../engine/zone.js';
import { engagementsDuJour } from './engagements.js';
import { APPUI } from '../engine/appui.js';
import { monAppui } from './incidents.js';
import { renderTableau } from './tableau.js';
import { renderEnqueteDossier } from './enquete-dossier.js';
import { reglesV2 } from '../engine/regles.js';
import { aideBtn } from './aide.js';
import { journalHtml, journalAuto } from './journal.js';
import { tutoActif } from './tutoriel.js';
import { dossierAffaire3 } from '../engine/dossier.js';
import { minutes, MODES } from '../engine/carte3.js';
import { planifierEnvoi, synchroniser, synchroniserMaintenant, contenuChange, carnetVide } from './carnet-sync.js';
import { accusesPrets, VARIANTE_INFO, traqueAutorisee, maxDemarchesDe,
  ENQ, DEMARCHES, SOURCES, ELEMENTS, ELEMENT_NOM, affaire, dossierDe, dossierAffaire, texteFait, titrePiece,
  chanceVoisinage, VOISINAGE,
  ficheSuspect, fichePlanque, pointsDecouverte, pieceDemarche, coutDemarche, dansMaCellule, zonesDuSuspect, rebondsPublies, dejaPartagee,
  demarcheDe, mandatOk, lireDemarche,
  toursTraque, delaiTraque, REAUD, RECOUP, PRIME, PRIME_LABELS, texteMisePrix,
} from '../engine/enquete.js';
import { SERVICES, SERVICE_LABELS, NIVEAU_MAX } from '../engine/constants.js';
import { lienItineraire, lieuxMons, MODES_GMAPS, modeSuspect } from '../engine/meurtre-mons.js';

// ───── Carnet : marques et notes, gardées sur l'appareil ─────
const MARQUES = [
  { sym: '·', nom: 'sans marque', cls: '' },
  { sym: '✕', nom: 'exclu', cls: 'm-x' },
  { sym: '?', nom: 'douteux', cls: 'm-q' },
  { sym: '●', nom: 'retenu', cls: 'm-ok' },
];
// Tableau Mobile · Moyen · Occasion : · pas établi, ✓ établi, ✕ exclu.
const CASES = [{ sym: '·', nom: 'pas encore établi', cls: '' }, { sym: '✓', nom: 'établi', cls: 'm-ok' }, { sym: '✕', nom: 'exclu', cls: 'm-x' }];
function carnetKey(n) { return `mazp-carnet2-${S.state.seed}-${n}-${S.user.uid}`; }
export function lireCarnet(n) {
  const vide = { g: {}, p: {}, notes: '' };
  try { return { ...vide, ...(JSON.parse(localStorage.getItem(carnetKey(n))) || S.carnetMem?.[n] || {}) }; } catch (e) { return { ...vide, ...(S.carnetMem?.[n] || {}) }; }
}
function ecrireLocal(n, c) {
  S.carnetMem = { ...(S.carnetMem || {}), [n]: c };
  try { localStorage.setItem(carnetKey(n), JSON.stringify(c)); } catch (e) { /* stockage indisponible : on garde en mémoire */ }
}
/** Écrit le carnet sur l'appareil et, s'il a vraiment changé (pas seulement la vue), le prépare pour l'envoi en ligne. */
export function ecrireCarnet(n, c) {
  const avant = lireCarnet(n);
  if (contenuChange(avant, c)) c.maj = Date.now(); else c.maj = avant.maj || c.maj || 0;
  ecrireLocal(n, c);
  planifierEnvoi(lireCarnet);
}
/** Récupère le carnet enregistré en ligne (tableau, marques, notes) s'il est plus récent. */
/** Écriture venue de la synchro : garde d'abord une copie du tableau de cet appareil (bouton « Restaurer »). */
function ecrireDepuisLigne(n, c) {
  const avant = lireCarnet(n);
  if (!carnetVide(avant)) try { localStorage.setItem(`${carnetKey(n)}-avant-synchro`, JSON.stringify(avant)); } catch (e) { /* stockage indisponible */ }
  ecrireLocal(n, c);
}
/** Copie du tableau de cet appareil prise avant la dernière synchro, s'il y en a une. */
export function sauvegardeCarnet(n) { try { return JSON.parse(localStorage.getItem(`${carnetKey(n)}-avant-synchro`)); } catch (e) { return null; } }
/** Remet cette copie (et la renvoie en ligne, fusionnée avec ce qui y est). */
export function restaurerCarnet(n) {
  const c = sauvegardeCarnet(n);
  if (!c) return false;
  const actuel = lireCarnet(n);
  ecrireCarnet(n, { ...c, tab: c.tab ? { ...c.tab, vue: (actuel.tab && actuel.tab.vue) || c.tab.vue || null } : c.tab });
  return true;
}
export function synchroCarnet(rerender, opts) { return synchroniser(lireCarnet, ecrireDepuisLigne, rerender, opts); }
export function synchroCarnetMaintenant(rerender) { return synchroniserMaintenant(lireCarnet, ecrireDepuisLigne, rerender); }

function autresZones() {
  return Object.values(S.state.zones).filter((z) => z.uid !== S.user.uid && z.toursSansOrdres < 3).sort((a, b) => a.code.localeCompare(b.code));
}
export const coutTotal = (d) => (d.demarches || []).reduce((s, x) => s + coutDemarche(S.state, S.user.uid, x), 0) + (d.reaud ? REAUD.cout : 0) + (d.recoup ? RECOUP.cout : 0);

export function partageCtl(piece) {
  const d = S.draft;
  if (piece.src === 'ouverture' || piece.src === 'rebond') return '<span class="tiny muted">connue de tous</span>';
  const prevu = (d.partages || []).filter((p) => p.f === piece.f);
  if (prevu.length) {
    const qui = prevu.map((p) => (p.a === '*' ? 'à tous' : zoneName(S.state.zones[p.a]))).join(', ');
    return `<span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="tag" style="background:rgba(90,176,240,.14);color:var(--blue-soft)">Partage prévu ${qui}</span>
      <button class="btn small ghost" data-action="partage-annuler" data-f="${piece.f}">Annuler</button></span>`;
  }
  const deja = dejaPartagee(S.state, S.user.uid, piece.f);
  const dejaTxt = deja.size ? `<span class="tiny muted" style="text-align:right">Déjà chez : ${[...deja].filter((u) => S.state.zones[u]).map((u) => zoneName(S.state.zones[u])).join(', ')}</span>` : '';
  const restantes = autresZones().filter((z) => !deja.has(z.uid));
  if (!restantes.length) return `<span class="col" style="gap:2px;align-items:flex-end"><span class="tag" style="background:rgba(60,198,184,.14);color:var(--green)">Partagée avec toutes les zones</span>${dejaTxt}</span>`;
  if ((d.partages || []).length >= ENQ.maxPartages) return `<span class="col" style="gap:2px;align-items:flex-end"><span class="tiny muted">${ENQ.maxPartages} partages maximum par tour · chaque zone n’en reçoit qu’${ENQ.maxRecus === 1 ? 'une' : ENQ.maxRecus} par soir, sauf en donnant-donnant (deux zones qui s’envoient une pièce l’une à l’autre le même soir)</span>${dejaTxt}</span>`;
  const id = `pz-${piece.f.replace(':', '-')}`;
  return `<span class="col" style="gap:4px;align-items:flex-end"><span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
    <label class="sr" for="${id}">Partager à une zone</label>
    <select id="${id}" class="text" data-change="partage-zone" data-f="${piece.f}" style="min-height:40px;font-size:12.5px;padding:0 8px;max-width:150px">
      <option value="">Partager à…</option>${restantes.map((z) => `<option value="${esc(z.uid)}">${zoneName(z)}</option>`).join('')}</select>
    <button class="btn small" data-action="partage" data-f="${piece.f}" data-a="*">${deja.size ? 'Aux autres' : 'À tous'}</button></span>${dejaTxt}</span>`;
}

export function sourceDe(p) {
  if (p.src === 'partage' && p.de && S.state.zones[p.de]) return `Partagée par ${zoneName(S.state.zones[p.de])}`;
  if (DEMARCHES[p.src] && S.state.enquete) { const aff = affaire(S.state, S.state.enquete.n); if (aff.dem) return esc(demarcheDe(aff, p.src).nom); }
  return esc(SOURCES[p.src] || p.src);
}

function pieceHtml(aff, p, { share = true } = {}) {
  return `<div class="piece">
    <div class="between" style="gap:8px;align-items:flex-start"><span class="kicker">${esc(titrePiece(aff, p.f))}</span><span class="tiny muted" style="text-align:right">J${p.j} · ${sourceDe(p)}</span></div>
    <p>${esc(texteFait(aff, p.f)).replace(/\n/g, '<br>')}</p>
    ${share ? `<div class="row" style="justify-content:flex-end">${partageCtl(p)}</div>` : ''}
  </div>`;
}

// Bouton de démarche (constatation ou vérification) : demandé, possible ou impossible, avec son prix.
const faitsDe = (dos) => new Set(dos.pieces.map((p) => p.f));
export function demBtn(aff, dos, x, label, { compact = false } = {}) {
  const d = S.draft, z = myZone();
  const dem = d.demarches || [];
  const on = dem.includes(x);
  const prix = coutDemarche(S.state, S.user.uid, x);
  const dm = demarcheDe(aff, x.split(':')[0]);
  const ld = lireDemarche(x);
  let raison = '';
  if (!on) {
    if (aff.meurtre && ld && ld.k === 'moyens' && !mandatOk(aff, dos, ld.i) && !faitsDe(dos).has(x.replace('moyens', 'moy'))) raison = 'pas de mandat';
    else if (!pieceDemarche(aff, dos, x)) raison = 'au dossier';
    else if (dem.length >= maxDemarchesDe(S.state, zoneAvecAgenda())) raison = `${maxDemarchesDe(S.state, zoneAvecAgenda())} par jour`;
    else if (prix > z.budget - engagementsDuJour(d, z).total) raison = 'budget';
  }
  const prixTxt = prix ? `${prix} k€` : `${dm.agents} agents`;
  return `<button type="button" class="dem ${compact ? 'compact' : ''}" data-action="dem-toggle" data-k="${x}" aria-pressed="${on}" ${raison ? 'disabled' : ''}>
    <span class="l">${esc(label)}</span><span class="p">${on ? 'demandé ✓' : raison || prixTxt}</span></button>`;
}

/** Bandeau : l'affaire précédente est résolue, son auteur identifié est en fuite. */
export { primeHtml } from './prime.js';
import { primeHtml } from './prime.js';
/** Ligne de l'avis de recherche, en tête de l'enquête. */
export const avisMisePrix = () => `<details class="recit" data-k="prime"><summary class="small">💰 Mise à prix ${icon('chevron', 14)}</summary><p class="small" style="margin:6px 0 0;color:var(--text2);line-height:1.5">${esc(texteMisePrix())}</p></details>`;

export function banniereTraque(st, { tableau = false } = {}) {
  const tr = (st.traques || []).find((t) => !t.fini);
  if (!tr) return '';
  const a = affaire(st, tr.n), s = a.suspects[a.coupable];
  const zones = (tr.decouvreurs || []).map((u) => st.zones[u]).filter(Boolean).map((z) => `ZP ${z.code} ${z.nom}`);
  const e = s.f ? 'e' : '';
  return `<section class="card red banniere-traque ${tableau ? 'tb-ui' : ''}" role="status">
    <span class="kicker" style="color:var(--red-soft)">Affaire n° ${a.n} résolue · « ${esc(a.titre)} »</span>
    <span style="font-weight:700;font-size:16px">Suspect identifié : ${esc(s.nom)}</span>
    <span class="small">${zones.length ? `Démasqué${e} par ${esc(zones.join(' et '))}. ` : ''}${a.complice != null && a.suspects[a.complice] ? `${esc(a.suspects[a.complice].nom)}, qui avait fourni le moyen, est déjà sous les verrous. ` : ''}Mandat d’arrêt délivré, mais ${s.f ? 'elle' : 'il'} se cache. Toutes les zones peuvent l’arrêter : il reste <strong>${delaiTraque(toursTraque(tr))}</strong> pour trouver sa planque.</span>
    <button type="button" class="btn small" data-action="traque-voir" style="align-self:flex-start">${tableau ? 'Lancer la traque' : 'Voir la traque ↓'}</button>
  </section>`;
}

export function traqueHtml(tr) {
  const st = S.state, z = myZone(), d = S.draft;
  const a = affaire(st, tr.n);
  const dos = dossierAffaire(st, z, tr.n);
  const t = d.traque && d.traque.n === tr.n ? d.traque : null;
  const carnet = lireCarnet(tr.n);
  const maxAg = d.alloc.intervention || 0;
  const s = a.suspects[a.coupable];
  const indices = dos.pieces.filter((p) => p.f.startsWith('p:')).map((p) => esc(texteFait(a, p.f)));
  const anonymes = enService(z, 'anonyme', st.turn) > 0;
  return `<section id="traque" class="card red" aria-label="Traque en cours">
    <div class="between"><span class="kicker" style="color:var(--red-soft)">Traque · ${toursTraque(tr) > 1 ? `${toursTraque(tr)} tours restants` : 'jusqu’au prochain 20:00'}</span><span class="tiny muted">${esc(a.titre)}</span></div>
    <h2 class="card-title" style="margin:0">${esc(s.nom)} est en fuite</h2>
    <p class="small" style="margin:0">Choisis une planque et envoie au moins ${ENQ.agentsTraque} agents d’Intervention${anonymes ? ' ; ta voiture anonymisée peut en surveiller une deuxième' : ''}. Le juge ne signe la perquisition que pour un lieu que ton dossier désigne (au moins ${tr.attrs || ENQ.attrsTraque} caractéristiques de la planque qui lui correspondent : badge « mandat »). Ce que tu sais de la planque${indices.length ? '' : ' : rien. Les indices sur la planque viennent de ton dossier sur cette affaire (constatations, butin retrouvé)'}.</p>
    ${indices.length ? `<ul class="small" style="margin:0;padding-left:18px">${indices.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
    <div class="col" style="gap:6px">${a.planques.map((p, i) => {
      const m = MARQUES[carnet.p[i] || 0];
      return `<button type="button" class="choice" data-action="traque-planque" data-n="${tr.n}" data-i="${i}" aria-pressed="${!!t && t.planque === i}" style="flex-direction:row;justify-content:space-between;text-align:left;align-items:center;gap:10px">
        <span class="col" style="gap:1px;align-items:flex-start"><span style="font-size:14px">${esc(p.nom)}</span><span class="s">${esc(fichePlanque(p))}</span></span>
        <span class="row" style="gap:6px;align-items:center">${traqueAutorisee(a, dos, i, tr.attrs) ? '<span class="tag" style="background:var(--green-bg,#1d3a2c);color:var(--green,#3DD39A)">mandat</span>' : ''}<span class="mark ${m.cls}" aria-label="${m.nom} dans ton carnet">${m.sym}</span></span></button>`;
    }).join('')}</div>
    ${t && anonymes ? `<div class="col" style="gap:4px"><span class="small" style="font-weight:600">🕶️ Voiture anonymisée en planque</span>
      <span class="tiny muted">Elle surveille une deuxième planque : si ${esc(s.nom)} y est, tes agents y foncent et l’interpellent.</span>
      <div class="row wrap" style="gap:6px">${a.planques.map((p, i) => i === t.planque ? '' : `<button type="button" class="chip${t.planque2 === i ? ' on' : ''}" data-action="traque-planque2" data-i="${i}" aria-pressed="${t.planque2 === i}">${esc(p.nom)}</button>`).join('')}</div></div>` : ''}
    ${t ? `<div class="between"><span class="small" style="font-weight:600">Agents envoyés</span>
      <span class="stepper"><button type="button" data-action="traque-agents" data-d="-1" aria-label="Un agent en moins">−</button><span class="n">${t.agents}</span><button type="button" data-action="traque-agents" data-d="1" aria-label="Un agent en plus" ${t.agents >= maxAg ? 'disabled' : ''}>+</button></span></div>
      <p class="tiny ${t.agents < ENQ.agentsTraque ? 'bad' : 'muted'}" style="margin:0">${t.agents < ENQ.agentsTraque ? `Il faut au moins ${ENQ.agentsTraque} agents.` : `Pris sur tes ${maxAg} agents d’Intervention du jour.`} <button class="btn small ghost" data-action="traque-annuler">Ne pas intervenir</button></p>` : ''}
  </section>`;
}

/**
 * Bouton d'accusation d'un suspect (vol) : « Accuser X », ou « Accuser X et Y » pour deux complices ;
 * à défaut, la raison pour laquelle le parquet n'en veut pas encore.
 */
export function accuserHtml(aff, dos, i, { cls = 'btn small outline', style = '' } = {}) {
  const prets = accusesPrets(aff, dos);
  const s = aff.suspects[i];
  if (!prets || !prets.includes(i)) {
    return aff.variante === 'complices'
      ? `<span class="tiny muted">Deux complices : le parquet acceptera d’accuser ${esc(s.prenom)} quand ton dossier aura écarté les trois autres suspects.</span>`
      : `<span class="tiny muted">Le parquet n’acceptera d’accuser ${esc(s.prenom)} que si ton dossier écarte tous les autres suspects (pièces à l’appui, les tiennes ou celles reçues).</span>`;
  }
  const j = prets.find((k) => k !== i);
  return j === undefined
    ? `<button type="button" class="${cls}" data-action="accuser" data-i="${i}" ${style ? `style="${style}"` : ''}>Accuser ${esc(s.prenom)}</button>`
    : `<button type="button" class="${cls}" data-action="accuser" data-i="${i}" data-j="${j}" ${style ? `style="${style}"` : ''}>Accuser ${esc(s.prenom)} et ${esc(aff.suspects[j].prenom)}</button>`;
}
/** Noms de l'accusation prête (un ou deux complices). */
export function nomsAccuses(aff, d, champ = 'nom') {
  return [d.accusation, d.accusation2].filter((x) => x !== null && x !== undefined && aff.suspects[x]).map((x) => aff.suspects[x][champ]).join(' et ');
}
/** Encadré de la particularité de l'affaire (variante), ou ''. */
export function regleHtml(aff) {
  if (!aff.variante || !VARIANTE_INFO[aff.variante]) return '';
  return `<section class="card amber tight" aria-label="Particularité de l’affaire"><span class="kicker">Particularité · ${esc(VARIANTE_INFO[aff.variante].nom)}</span><span class="small" style="line-height:1.5">${esc(aff.regle)}</span></section>`;
}

// ───── Tableau : constatations puis suspects ─────
function constatations(aff, dos) {
  if (aff.meurtre) {
    const connus = faitsDe(dos);
    return `<section class="col" style="gap:8px" aria-label="Scène"><h2 class="section">La scène</h2>
      ${['occ', 'moy', 'mob'].map((e) => { const fi = aff.fiches[e], dm = demarcheDe(aff, fi.dem), seq = aff.sceneSeq[fi.dem]; const kn = seq.filter((f) => connus.has(f));
        return `<div class="constat ${kn.length ? 'fait' : ''}"><span class="kicker">${esc(fi.titre)} · ${esc(dm.nom)}</span>${kn.map((f) => `<p><strong>${esc(titrePiece(aff, f))}</strong> : ${esc(texteFait(aff, f))}</p>`).join('') || '<p class="muted">Rien encore.</p>'}${kn.length < seq.length ? demBtn(aff, dos, fi.dem, dm.nom) : ''}</div>`; }).join('')}</section>`;
  }
  const lignes = [['occ', 'cam'], ['moy', 'labo'], ['mob', 'temoin']].map(([e, k]) => {
    const f = `c:${e}`, dm = DEMARCHES[k];
    const piece = dos.pieces.find((p) => p.f === f);
    return `<div class="constat ${piece ? "fait" : ""}">
      <div class="between" style="gap:8px"><span class="kicker">${ELEMENT_NOM[e]} · ${esc(dm.dit)}</span>${piece ? `<span class="tiny muted">${sourceDe(piece)}</span>` : ''}</div>
      ${piece ? `<p>${esc(texteFait(aff, f))}</p>` : `<p class="muted">Pas encore établi.</p>${demBtn(aff, dos, k, dm.nom)}`}
    </div>`;
  }).join('');
  return `<section class="col" style="gap:8px" aria-label="Constatations">
    <h2 class="section">Ce qu’il fallait pour commettre les faits</h2>
    <p class="tiny muted" style="margin:0">Sans ces constatations, une vérification sur un suspect ne prouve rien : ce sont elles qui disent quelle heure, quel moyen et quel mobile comptent.</p>
    ${lignes}</section>`;
}

function suspectCard(aff, dos, s, i, carnet) {
  const st = S.state, d = S.draft;
  const fiche = ficheSuspect(aff, s);
  const open = !!(S.enqOpen && S.enqOpen[i]);
  const mien = dansMaCellule(st, S.user.uid, i);
  const suivi = zonesDuSuspect(st, i).filter((u) => u !== S.user.uid && st.zones[u]).map((u) => zoneName(st.zones[u]));
  const pieces = dos.pieces.filter((p) => !p.f.startsWith('c:') && !p.f.startsWith('p:') && Number(p.f.split(':')[1]) === i);
  const cases = ELEMENTS.map((e) => {
    const m = CASES[carnet.g[`${i}:${e}`] || 0];
    return `<button type="button" class="mmo ${m.cls}" data-action="mmo-mark" data-i="${i}" data-e="${e}" aria-label="${ELEMENT_NOM[e]} de ${esc(s.nom)} : ${m.nom}. Changer"><span>${ELEMENT_NOM[e]}</span><span class="v">${m.sym}</span></button>`;
  }).join('');
  const accuse = d.accusation === i || d.accusation2 === i;
  const exclu = etatSuspect(carnet, i, aff) === 'exclu';
  const multi = st.enquete.nbCellules > 1;
  return `<article class="suspect ${exclu ? 'exclu' : ''} ${accuse ? 'accuse' : ''}">
    <button type="button" class="suspect-tete" data-action="enq-open" data-i="${i}" aria-expanded="${open}">
      <span class="col grow" style="gap:2px;align-items:flex-start;min-width:0"><span class="nom">${esc(s.nom)}${accuse ? ` <span class="tag" style="background:var(--amber-bg);color:var(--amber)">accusé${s.f ? 'e' : ''}</span>` : ''}</span>
        <span class="tiny muted">${esc(fiche.lien)}</span></span>
      <span class="col" style="gap:2px;align-items:flex-end;flex-shrink:0">${multi ? `<span class="tiny ${mien ? 'good' : 'muted'}">${mien ? 'ta zone enquête' : 'autre groupe'}</span>` : ''}<span class="tiny muted">${pieces.length} pièce${pieces.length > 1 ? 's' : ''} ${open ? '▴' : '▾'}</span></span>
    </button>
    ${open ? `<div class="mmo-row">${cases}</div>` : ''}
    ${open ? `<div class="col" style="gap:8px">
      <p class="small" style="margin:0;line-height:1.55">${esc(fiche.vehicule)}<br>${esc(fiche.declaration)}<br>${fiche.trajet ? `${esc(fiche.trajet)}<br>` : ''}<span class="muted">${esc(fiche.rumeur)}</span></p>
      ${aff.ville === 'mons' && s.alibi.pos !== aff.pos ? (() => { const [m, ic, nom] = MODES_GMAPS.find((x) => x[0] === modeSuspect(s)); return `<a class="small" href="${lienItineraire(s.alibi.pos, aff.pos, lieuxMons(aff), m)}" target="_blank" rel="noopener">${ic} Itinéraire ${nom.toLowerCase()} jusqu’à la scène (Google Maps)</a>`; })() : ''}
      ${aff.prof && !aff.ville && s.alibi.type !== 'seul' ? `<p class="tiny muted" style="margin:0">Par la route, du lieu déclaré jusqu’${esc(/^le /.test(aff.lieu) ? `au ${aff.lieu.slice(3)}` : `à ${aff.lieu}`)} : ${Object.entries(MODES).map(([m, md]) => `${md.icone} ${minutes(s.alibi.pos, aff.pos, m, aff.travaux)} min`).join(' · ')}${aff.travaux ? ' (avec les travaux)' : ''}.</p>` : ''}
      ${aff.prof ? (() => { const a = dossierAffaire3(st.seed, aff).auditions[i]; return `<details class="piece"><summary class="kicker" style="cursor:pointer">PV d’audition · ${esc(a.heure)}</summary>${a.qr.map(([q, r]) => `<p class="small" style="margin:6px 0 0"><strong>Q :</strong> ${esc(q)}<br><strong>R :</strong> ${esc(r)}</p>`).join('')}</details>`; })() : ''}
      ${pieces.map((p) => pieceHtml(aff, p)).join('')}
      ${(() => { const surPiste = d.piste === i; return `<button type="button" class="btn small ${surPiste ? 'primary' : 'outline'} block" data-action="piste" data-i="${i}" aria-pressed="${surPiste}">${surPiste ? `✓ Piste prioritaire des enquêteurs (retirer)` : `Mettre les enquêteurs de Recherche sur ${esc(s.prenom)}`}</button>
        <span class="tiny muted" style="margin-top:-4px">${surPiste ? 'L’enquête de voisinage de ce soir cherche d’abord de ce côté.' : `Gratuit : l’enquête de voisinage cherchera ses pièces en priorité${mien ? '' : ' (pas un de tes suspects : deux fois moins efficace)'}.`}</span>`; })()}
      <span class="tiny muted">Faire vérifier :</span>
      <div class="dem-row">${demBtn(aff, dos, `alibi:${i}`, 'Son alibi', { compact: true })}${demBtn(aff, dos, `moyens:${i}`, aff.meurtre ? 'Perquisition' : 'Ses moyens', { compact: true })}${demBtn(aff, dos, `banque:${i}`, aff.meurtre ? 'Téléphone, comptes' : 'Son mobile', { compact: true })}</div>
      ${mien ? '' : `<div class="col" style="gap:6px"><p class="tiny muted" style="margin:0">Suspect suivi par ${suivi.length ? esc(suivi.join(', ')) : 'un autre groupe d’enquête'} : tes vérifications coûtent le double. Demande-leur leurs pièces :</p>
        <div class="row" style="gap:6px;flex-wrap:wrap">${zonesDuSuspect(st, i).filter((u) => u !== S.user.uid && st.zones[u]).map((u) => `<button type="button" class="btn small" data-action="ecrire-a" data-uid="${esc(u)}">✉ ${esc(st.zones[u].nom)}</button>`).join('')}<a class="btn small ghost" href="#radio">Radio</a></div></div>`}
      ${!dos.exclu && dos.accuse === null ? (accuse ? '<button class="btn small ghost" data-action="accuser-annuler">Retirer l’accusation</button>' : aff.meurtre ? `<button class="btn small outline" data-action="tab-confront" data-i="${i}">Confronter ${esc(s.prenom)}</button>` : accuserHtml(aff, dos, i)) : ''}
    </div>` : ''}
  </article>`;
}

/** État d'un suspect d'après ton carnet : 'exclu' (au moins un ✕), 'complet' (3 ✓) ou 'ouvert'. */
export function etatSuspect(carnet, i, aff = null) {
  const v = ELEMENTS.map((e) => carnet.g[`${i}:${e}`] || 0);
  // Deux complices : hors de cause sans le mobile, ou sans le moyen ni l'occasion.
  if (aff && aff.variante === 'complices') { if (v[0] === 2 || (v[1] === 2 && v[2] === 2)) return 'exclu'; }
  else if (v.includes(2)) return 'exclu';
  if (v.every((x) => x === 1)) return 'complet';
  return 'ouvert';
}

/** Enquête de voisinage de ce soir : ce que la Recherche peut rapporter, avec ou sans piste. */
export function voisinageInfo(aff) {
  const st = S.state, d = S.draft, z = myZone();
  const n = (d.alloc && d.alloc.recherche) || 0;
  const cap = capacite(z, 'recherche', n, { rythme: d.rythme, turn: st.turn, bonus: bonusEnigme('recherche') });
  const piste = Number.isInteger(d.piste) ? d.piste : null;
  const x = chanceVoisinage(st, S.user.uid, cap, piste);
  const txt = x <= 0 ? 'aucune chance' : x < 1 ? `${Math.round(x * 100)} % de chance d’une pièce` : `1 pièce assurée${x % 1 > 0.05 ? ` + ${Math.round((x % 1) * 100)} % d’une 2e` : ''}`;
  const sansPiste = chanceVoisinage(st, S.user.uid, cap, null);
  return { n, piste, x, txt, sansPiste, nom: piste !== null ? aff.suspects[piste].prenom : null };
}

/** Appui fédéral : équipe du jour à faire travailler, et demande pour demain (labo ou RCCU).
 *  compact : une seule ligne de puces (écran Enquête en liste). */
export function appuiHtml({ compact = false } = {}) {
  const d = S.draft, z = myZone(), a = monAppui();
  let jour = '';
  if (a) {
    const u = APPUI.unites[a.unite];
    const quoi = a.unite === 'labo' ? 'sur les moyens d’un suspect' : 'sur le mobile ou l’occasion d’un suspect';
    jour = !a.res ? `<div class="between" style="gap:10px"><span class="small"><strong>${esc(u.nom)} sur place aujourd’hui.</strong><br><span class="tiny muted">${esc(a.nomJeu)} · un seul essai. Réussi : une pièce ${quoi}, au dossier à 20:00.</span></span>
        <button type="button" class="btn primary small" data-action="appui-jouer">Analyser</button></div>`
      : a.res.statut === 'ok' ? `<p class="small ok" style="margin:0">${icon('check', 14)} ${esc(u.court)} : analyse réussie, la pièce arrive dans ton dossier à 20:00.</p>`
      : `<p class="small muted" style="margin:0">${esc(u.court)} : l’analyse n’a rien donné aujourd’hui.</p>`;
  }
  if (compact) {
    const puce = (k, ico) => { const u = APPUI.unites[k], on = d.appui === k; return `<button type="button" class="chip ${on ? 'on' : ''}" data-action="appui-demande" data-k="${k}" aria-pressed="${on}" title="${esc(u.quoi)}">${ico} ${esc(u.court || u.nom)}${on ? ' ✓' : ''}</button>`; };
    return `${jour ? `<div class="voisinage">${jour}</div>` : ''}
      <div class="enq-ligne"><span class="tiny muted">Appui fédéral pour demain${z.appuiPrio ? ' · <strong>prioritaire</strong>' : ''}</span><span class="row" style="gap:6px">${puce('labo', '🧪')}${puce('rccu', '💻')}${aideBtn('appui')}</span></div>`;
  }
  const btn = (k) => { const u = APPUI.unites[k]; return `<button type="button" class="dem compact" data-action="appui-demande" data-k="${k}" aria-pressed="${d.appui === k}"><span class="l">${esc(u.nom)}</span><span class="p">${d.appui === k ? 'demandé ✓' : esc(u.quoi)}</span></button>`; };
  return `<div class="voisinage" style="gap:6px">
      ${jour}
      <div class="between" style="gap:8px"><span class="small"><strong>Appui fédéral</strong> · une demande par jour, pour demain</span>${aideBtn('appui')}</div>
      <div class="choices" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">${btn('labo')}${btn('rccu')}</div>
      ${z.appuiPrio ? '<span class="tiny"><strong>Refusé la dernière fois : tu es prioritaire.</strong></span>' : ''}
    </div>`;
}

/** Carte « Aujourd'hui » : démarches choisies, prochaine étape conseillée, accusation. */
function aujourdhui(aff, dos) {
  const d = S.draft, z = myZone(), st = S.state;
  const carnet = lireCarnet(aff.n);
  const dem = d.demarches || [];
  const constatsFaites = aff.meurtre ? ['labo', 'cam', 'temoin'].filter((k) => aff.sceneSeq[k].some((f) => dos.pieces.some((p) => p.f === f))).length : ['occ', 'moy', 'mob'].filter((e) => dos.pieces.some((p) => p.f === `c:${e}`)).length;
  const constatsPrevues = dem.filter((x) => ['cam', 'labo', 'temoin'].includes(x)).length;
  const enLice = aff.suspects.map((_, i) => i).filter((i) => etatSuspect(carnet, i, aff) !== 'exclu');
  const nA = aff.variante === 'complices' ? 2 : 1;
  const nomDem = (x) => {
    const [k, i] = x.split(':');
    const dm = demarcheDe(aff, k);
    return i !== undefined ? `${dm.nom} · ${aff.suspects[Number(i)].prenom}` : dm.nom;
  };
  let etape;
  if (dos.exclu) etape = 'Ton accusation a été rejetée : tu ne peux plus accuser, mais tes pièces partagées peuvent encore rapporter des points.';
  else if (dos.accuse !== null) etape = 'Accusation transmise au parquet. Résultat ce soir à 20:00.';
  else if (d.accusation !== null && d.accusation !== undefined) etape = `Accusation prête contre ${esc(nomsAccuses(aff, d, 'prenom'))} : elle part à 20:00 avec tes ordres.`;
  else if (constatsFaites + constatsPrevues < 3) etape = `<strong>Étape 1 · la scène.</strong> Il manque ${3 - constatsFaites} constatation${3 - constatsFaites > 1 ? 's' : ''} : elles disent quelle heure, quel moyen et quel mobile comptent. <button type="button" class="lien" data-action="enq-tab" data-t="scene">Voir la scène</button>`;
  else if (enLice.length > nA) etape = `<strong>Étape 2 · les suspects.</strong> Vérifie l’alibi, les moyens ou le mobile des suspects sur qui ta zone enquête, et coche ✕ dès qu’un élément ne colle pas${nA === 2 ? ' (ici : pas de mobile, ou ni moyen ni occasion)' : ''}. Encore ${enLice.length} en lice.`;
  else if (enLice.length === nA) etape = nA === 2 ? `<strong>Étape 3 · l’accusation.</strong> Il ne reste que ${esc(aff.suspects[enLice[0]].prenom)} et ${esc(aff.suspects[enLice[1]].prenom)} dans ton tableau : les deux complices ? Accuse-les ensemble si tu es sûr : une seule chance.` : `<strong>Étape 3 · l’accusation.</strong> Il ne reste que ${aff.suspects[enLice[0]].prenom} dans ton tableau. Accuse si tu es sûr : une seule chance.`;
  else etape = 'Tous les suspects sont exclus dans ton tableau : une coche est sans doute fausse. Relis les pièces.';
  const miens = aff.suspects.map((s2, i) => (dansMaCellule(st, S.user.uid, i) ? s2.prenom : null)).filter(Boolean);
  const v = voisinageInfo(aff);
  const vCourt = v.x <= 0 ? 'aucune chance' : v.x < 1 ? `${Math.round(v.x * 100)} %` : `1 pièce${v.x % 1 > 0.05 ? ` + ${Math.round((v.x % 1) * 100)} %` : ''}`;
  const reste = z.budget - engagementsDuJour(d, z).total;
  return `<section class="card tight aujourdhui" aria-label="Aujourd’hui" style="gap:8px">
    <div class="between"><span style="font-weight:700">Aujourd’hui · ${dem.length}/${maxDemarchesDe(S.state, zoneAvecAgenda())} démarches${maxDemarchesDe(S.state, zoneAvecAgenda()) > ENQ.maxDemarches ? ` (${maxDemarchesDe(S.state, myZone()) > ENQ.maxDemarches ? 'une de plus : tu enquêtes seul' : ''}${maxDemarchesDe(S.state, zoneAvecAgenda()) > maxDemarchesDe(S.state, myZone()) ? `${maxDemarchesDe(S.state, myZone()) > ENQ.maxDemarches ? ', ' : ''}une de plus : ton chef au parquet, Intuition` : ''})` : ''}</span><span class="small mono" style="white-space:nowrap">${fmt1(coutTotal(d))} k€</span></div>
    ${dem.length ? `<div class="row" style="gap:6px;flex-wrap:wrap">${dem.map((x) => `<button type="button" class="chip on" data-action="dem-toggle" data-k="${x}" aria-label="Annuler : ${esc(nomDem(x))}">${esc(nomDem(x))} ✕</button>`).join('')}</div>` : ''}
    <p class="small" style="margin:0;line-height:1.5">${etape}</p>
    <div class="row enq-pastilles" style="gap:6px;flex-wrap:wrap">
      <span class="pill ${v.x >= 0.5 ? 'green' : v.x > 0 ? 'blue' : 'red'}" title="Voisinage ce soir : ${v.n} agent${v.n > 1 ? 's' : ''} en Recherche${v.nom ? `, piste ${esc(v.nom)}` : ''} · ${esc(v.txt)}">🏘 Voisinage ${vCourt}${v.nom ? ` · ${esc(v.nom)}` : ''}</span>
      <span class="pill" title="Budget restant après tes engagements du jour">💶 reste ${fmt1(reste)} k€</span>
      ${st.enquete.nbCellules > 1 ? `<span class="pill violet" title="Ta zone enquête sur eux : les autres suspects coûtent le double">● ${esc(miens.join(', '))}</span>` : ''}
      ${aideBtn('voisinage')}
    </div>
    ${appuiHtml({ compact: true })}
  </section>`;
}

/** Pièces que j'ai obtenues moi-même (démarches payées ou agents envoyés, voisinage, énigmes) et où elles en sont. */
function mesPieces(aff, dos) {
  const st = S.state, d = S.draft;
  const miennes = dos.pieces.filter((p) => DEMARCHES[p.src] || p.src === 'voisinage' || p.src === 'quete' || p.src === 'pjf' || p.src === 'reaud' || p.src === 'gav' || p.src === 'doctrine' || p.src === 'drone').sort((a, b) => b.j - a.j);
  if (!miennes.length) return '';
  const ligne = (p) => {
    const prevu = (d.partages || []).filter((x) => x.f === p.f);
    const deja = [...dejaPartagee(st, S.user.uid, p.f)].filter((u) => st.zones[u]);
    const etat = prevu.length ? `<span class="tag" style="background:rgba(90,176,240,.14);color:var(--blue-soft)">partage prévu ce soir</span>`
      : deja.length ? `<span class="tiny muted">partagée avec ${esc(deja.map((u) => zoneName(st.zones[u])).join(', '))}</span>`
      : '<span class="tag" style="background:var(--amber-bg);color:var(--amber)">gardée pour toi</span>';
    const dm = DEMARCHES[p.src];
    const moyen = dm ? (dm.cout ? 'payée' : `${dm.agents} agents envoyés`) : SOURCES[p.src];
    return `<div class="between" style="gap:8px;align-items:flex-start;padding:6px 0;border-top:1px solid var(--line)">
      <span class="col" style="gap:1px;min-width:0"><span class="small" style="font-weight:600">${esc(titrePiece(aff, p.f))}</span><span class="tiny muted">J${p.j} · ${esc(SOURCES[p.src] || p.src)} · ${esc(moyen)}</span></span>
      <span style="flex-shrink:0;text-align:right">${etat}</span></div>`;
  };
  const gardees = miennes.filter((p) => !(d.partages || []).some((x) => x.f === p.f) && !dejaPartagee(st, S.user.uid, p.f).size).length;
  const ouvert = S.ouverts && 'mespieces' in S.ouverts ? S.ouverts.mespieces : false;
  return `<details class="card tight" data-k="mespieces" ${ouvert ? 'open' : ''} style="gap:4px">
    <summary class="between" style="cursor:pointer"><span style="font-weight:700">Mes démarches · ${miennes.length} pièce${miennes.length > 1 ? "s" : ""}</span><span class="tiny muted">${gardees} gardée${gardees > 1 ? 's' : ''} pour toi ${icon('chevron', 14)}</span></summary>
    <p class="tiny muted" style="margin:4px 0 2px">Ce que tu as demandé toi-même, jour après jour. « Gardée pour toi » : tu ne l’as partagée avec personne.</p>
    ${miennes.map(ligne).join('')}
  </details>`;
}

/** Tableau de synthèse : suspects × mobile / moyen / occasion, à cocher d'un coup d'œil. */
function synthese(aff, carnet, ordre) {
  const st = S.state;
  return `<div class="synthese" role="table" aria-label="Tableau de synthèse">
    <div class="syn-l syn-h" role="row"><span role="columnheader">Suspect</span>${ELEMENTS.map((e) => `<span role="columnheader">${ELEMENT_NOM[e]}</span>`).join('')}</div>
    ${ordre.map((i) => {
      const s2 = aff.suspects[i], etat = etatSuspect(carnet, i, aff), mien = dansMaCellule(st, S.user.uid, i);
      return `<div class="syn-l ${etat}" role="row"><span role="rowheader" class="syn-nom">${S.draft && S.draft.piste === i ? '<i title="piste prioritaire" aria-label="piste prioritaire">🔎</i> ' : ''}${esc(s2.prenom)}${st.enquete.nbCellules > 1 && mien ? ' <i class="cel" title="ta zone enquête sur ce suspect">●</i>' : ''}</span>${ELEMENTS.map((e) => {
        const m = CASES[carnet.g[`${i}:${e}`] || 0];
        return `<button type="button" role="cell" class="syn-c ${m.cls}" data-action="mmo-mark" data-i="${i}" data-e="${e}" aria-label="${ELEMENT_NOM[e]} de ${esc(s2.prenom)} : ${m.nom}. Changer">${m.sym}</button>`;
      }).join('')}</div>`;
    }).join('')}
  </div>
  <p class="tiny muted" style="margin:0">Touche une case : ✓ établi, puis ✕ exclu, puis vide. ${aff.variante === 'complices' ? 'Ici, deux complices : tous deux ont le mobile, l’un le moyen, l’autre l’occasion.' : 'Le coupable est le seul à avoir les trois ✓.'} ${st.enquete.nbCellules > 1 ? '● = ta zone enquête sur ce suspect.' : ''}</p>`;
}

function vueSuspects(aff, dos) {
  const st = S.state;
  const carnet = lireCarnet(aff.n);
  const filtre = S.enqFiltre || 'tous';
  const idx = aff.suspects.map((_, i) => i);
  // Tri : ta cellule d'abord, les exclus en dernier.
  const rang = (i) => (etatSuspect(carnet, i, aff) === 'exclu' ? 2 : 0) + (dansMaCellule(st, S.user.uid, i) ? 0 : 1);
  const ordre = idx.slice().sort((x, y) => rang(x) - rang(y) || x - y);
  const visibles = ordre.filter((i) => filtre === 'tous' || (filtre === 'cellule' ? dansMaCellule(st, S.user.uid, i) : etatSuspect(carnet, i, aff) !== 'exclu'));
  const f = (k, l) => `<button type="button" class="chip ${filtre === k ? 'on' : ''}" data-action="enq-filtre" data-v="${k}">${l}</button>`;
  return `${synthese(aff, carnet, ordre)}
    <div class="row" style="gap:6px;flex-wrap:wrap">${f('tous', 'Tous')}${st.enquete.nbCellules > 1 ? f('cellule', 'Mes suspects') : ''}${f('lice', 'Encore en lice')}</div>
    ${visibles.map((i) => suspectCard(aff, dos, aff.suspects[i], i, carnet)).join('') || '<p class="small muted">Aucun suspect dans ce filtre.</p>'}`;
}

function vuePieces(aff, dos) {
  const j = S.state.enquete.jour;
  const filtre = S.piecesFiltre || 'toutes';
  const groupe = (p) => (p.f.startsWith('c:') ? 'scene' : p.f.startsWith('p:') ? 'planques' : `s${p.f.split(':')[1]}`);
  const tri = dos.pieces.slice().sort((x, y) => y.j - x.j || (x.f < y.f ? -1 : 1))
    .filter((p) => filtre === 'toutes' || (filtre === 'nouvelles' ? p.j >= j - 1 : groupe(p) === filtre));
  const nb = (g) => dos.pieces.filter((p) => groupe(p) === g).length;
  const f = (k, l, n) => `<button type="button" class="chip ${filtre === k ? 'on' : ''}" data-action="pieces-filtre" data-v="${k}">${l}${n !== undefined ? ` <span class="muted">${n}</span>` : ''}</button>`;
  const nouvelles = dos.pieces.filter((p) => p.j >= j - 1).length;
  return `<div class="row" style="gap:6px;flex-wrap:wrap">${f('toutes', 'Toutes', dos.pieces.length)}${nouvelles ? f('nouvelles', 'Nouvelles', nouvelles) : ''}${nb('scene') ? f('scene', 'Scène', nb('scene')) : ''}
      ${aff.suspects.map((s2, i) => (nb(`s${i}`) ? f(`s${i}`, esc(s2.prenom), nb(`s${i}`)) : '')).join('')}${nb('planques') ? f('planques', 'Planques', nb('planques')) : ''}</div>
    <p class="tiny muted" style="margin:0">Partager rapporte des PS, et des points d’enquête si ta pièce aide une zone à trouver l’auteur.</p>
    ${tri.map((p) => pieceHtml(aff, p)).join('') || '<p class="small muted">Aucune pièce ici pour l’instant.</p>'}`;
}

export function vuePlanques(aff, dos) {
  const c = lireCarnet(aff.n);
  const indices = dos.pieces.filter((p) => p.f.startsWith('p:'));
  const relances = ['cam', 'labo', 'temoin'].filter((k) => dos.pieces.some((p) => p.f === `c:${DEMARCHES[k].scene}`) && pieceDemarche(aff, dos, k));
  return `<p class="tiny muted" style="margin:0">Une fois l’auteur identifié, il faudra le cueillir dans sa planque en ${delaiTraque(ENQ.traqueTours).replace(/,$/, '')}. Prépare-toi dès maintenant.</p>
    ${indices.map((p) => pieceHtml(aff, p)).join('')}
    ${relances.length ? `<div class="card tight"><span class="small" style="font-weight:600">Relancer une constatation : un indice de plus sur la planque</span><div class="dem-row">${relances.map((k) => demBtn(aff, dos, k, DEMARCHES[k].nom, { compact: true })).join('')}</div></div>` : ''}
    ${aff.planques.map((p, i) => {
      const m = MARQUES[c.p[i] || 0];
      return `<div class="list-row" style="align-items:center;gap:10px${m.cls === 'm-x' ? ';opacity:.6' : ''}">
        <button type="button" class="mark ${m.cls}" data-action="carnet-mark" data-t="p" data-i="${i}" aria-label="${esc(p.nom)} : ${m.nom}. Changer la marque">${m.sym}</button>
        <span class="col grow" style="gap:2px;min-width:0"><span style="font-weight:600">${esc(p.nom)}</span><span class="tiny muted">${esc(fichePlanque(p))}</span></span></div>`;
    }).join('')}`;
}

function vueNotes(aff) {
  const c = lireCarnet(aff.n);
  return `<label class="field" for="carnet-notes">Notes libres <span class="tiny muted" style="font-weight:400">(gardées sur cet appareil)</span></label>
    <textarea id="carnet-notes" data-notes="${aff.n}" rows="14" class="notes" placeholder="Hypothèses, heures à comparer, qui a menti…">${esc(c.notes || '')}</textarea>`;
}

/** Affichage de l'enquête : le tableau (par défaut) ou la liste. */
export function vueEnquete() {
  // Saison 2 : l'enquête s'ouvre en dossier (mur, ce soir, classeur) ; le liège et la liste restent au choix (menu ⋯).
  const v2 = reglesV2(S.state);
  if (S.enqVue && (!v2 || S.enqVueV2)) return S.enqVue;
  const cle = v2 ? 'mazp-enq-vue2' : 'mazp-enq-vue';
  try { S.enqVue = localStorage.getItem(cle) || (v2 ? 'dossier' : 'tableau'); } catch (e) { S.enqVue = v2 ? 'dossier' : 'tableau'; }
  if (v2) S.enqVueV2 = true;
  return S.enqVue;
}
/** Change l'affichage de l'enquête et le retient sur l'appareil. */
export function choisirVueEnquete(v) {
  S.enqVue = v;
  if (reglesV2(S.state)) S.enqVueV2 = true;
  try { localStorage.setItem(reglesV2(S.state) ? 'mazp-enq-vue2' : 'mazp-enq-vue', v); } catch (e) { /* pas de stockage */ }
}

export function renderEnquete() {
  const st = S.state, z = myZone();
  if (!st.enquete && st.enquetePause) {
    return `<main class="screen">
      ${primeHtml()}${banniereTraque(st)}${banniereDebrief()}
      <header class="col" style="gap:3px"><span class="kicker">Enquête</span><h1 class="big">Nouvelle affaire ${esc(formatDateBe(st.nextDeadline))} à 20:00</h1>
        <p class="small muted" style="margin:0">Pas d’enquête ce soir : place à la traque. La prochaine affaire s’ouvre à la Gazette de demain.</p></header>
      <button type="button" class="btn" data-action="edition-ouvrir">📰 Relire l’édition spéciale</button>
      ${(st.traques || []).map(traqueHtml).join('')}
    </main>${tabbar('enquete')}`;
  }
  if (!st.enquete) {
    return `<main class="screen"><header class="col" style="gap:3px"><span class="kicker">Enquête</span><h1 class="big">Pas d’affaire en cours</h1></header>
      <p class="small muted">La première affaire s’ouvrira au prochain tour.</p></main>${tabbar('enquete')}`;
  }
  if (vueEnquete() === 'dossier' && reglesV2(st)) return renderEnqueteDossier();
  if (vueEnquete() === 'tableau' || vueEnquete() === 'dossier') return renderTableau();
  const aff = affaire(st, st.enquete.n);
  if (!tutoActif()) journalAuto(aff);
  const dos = dossierDe(st, z);
  const tab = ['suspects', 'scene', 'pieces', 'planques', 'notes'].includes(S.enqTab) ? S.enqTab : 'suspects';
  const j = st.enquete.jour;
  const rebonds = rebondsPublies(st);
  const constats = aff.meurtre ? ['labo', 'cam', 'temoin'].filter((k) => aff.sceneSeq[k].some((f) => dos.pieces.some((p) => p.f === f))).length : ['occ', 'moy', 'mob'].filter((e) => dos.pieces.some((p) => p.f === `c:${e}`)).length;
  const tabs0 = [['suspects', 'Suspects'], ['scene', `Scène<small>${constats}/3</small>`], ['pieces', `Pièces<small>${dos.pieces.length}</small>`], ['planques', 'Planques'], ['notes', 'Notes']];
  const tabs = aff.meurtre ? tabs0.filter(([k]) => k !== 'planques') : tabs0;
  let body;
  if (tab === 'pieces') body = vuePieces(aff, dos);
  else if (tab === 'planques') body = vuePlanques(aff, dos);
  else if (tab === 'notes') body = vueNotes(aff);
  else if (tab === 'scene') body = constatations(aff, dos);
  else body = vueSuspects(aff, dos);
  return `<main class="screen">
    ${primeHtml()}${banniereTraque(st)}${banniereDebrief()}
    <header class="col" style="gap:6px">
      <div class="between"><span class="kicker">Enquête · affaire n° ${aff.n}</span><span class="row" style="gap:6px">${aff.prof ? '<button type="button" class="btn small" data-action="journal-ouvrir">📰 Journal</button>' : ''}${reglesV2(st) ? `<button type="button" class="btn small" data-action="tab-vue" data-v="dossier">${icon('tableau', 16)} Dossier</button>` : `<button type="button" class="btn small" data-action="tab-vue" data-v="tableau">${icon('tableau', 16)} Tableau</button>`}</span></div>
      <h1 class="big" style="line-height:1.05">${esc(aff.titre)}</h1>
      <details class="recit" data-k="recit" ${(S.ouverts && 'recit' in S.ouverts ? S.ouverts.recit : j <= 1) ? 'open' : ''}><summary class="small">Les faits ${icon('chevron', 14)}</summary>
        <p class="small" style="margin:6px 0 0;color:var(--text2);line-height:1.5">${esc(aff.recit)}</p></details>
      ${avisMisePrix()}
      ${regleHtml(aff)}
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="pill">Jour ${j} sur ${ENQ.dureeMax}</span>
        <span class="pill amber">Découverte ce soir : ${pointsDecouverte(j)} pts</span>
      </div>
    </header>
    ${(() => {
      // Le rebondissement du jour s'affiche en grand ; les précédents se replient sur une ligne.
      const carte = (r) => `<section class="card amber tight"><span class="kicker">Jour ${r.j} · rebondissement</span><span style="font-weight:700">${esc(r.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(r.texte)}</span></section>`;
      const neufs = rebonds.filter((r) => r.j === j), anciens = rebonds.filter((r) => r.j !== j);
      return `${neufs.map(carte).join('')}${anciens.length ? `<details class="rebonds-anciens" data-k="rebonds" ${S.ouverts && S.ouverts.rebonds ? 'open' : ''}><summary class="small">${anciens.length} rebondissement${anciens.length > 1 ? 's' : ''} précédent${anciens.length > 1 ? 's' : ''} ${icon('chevron', 14)}</summary><div class="col" style="gap:8px;margin-top:8px">${anciens.map(carte).join('')}</div></details>` : ''}`;
    })()}
    ${(st.traques || []).map(traqueHtml).join('')}
    ${aujourdhui(aff, dos)}
    <div class="segn onglets-enq" role="tablist" aria-label="Parties du dossier" style="grid-template-columns:repeat(${tabs.length},minmax(0,1fr))">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-action="enq-tab" data-t="${k}">${l}</button>`).join('')}</div>
    <section class="col" style="gap:10px">${body}</section>
    ${mesPieces(aff, dos)}
    <a class="small" href="#guide-enquete" style="text-align:center">Comment fonctionne l’enquête ?</a>
    ${S.savedOrders && !S.ordersDirty ? `<p class="tiny muted" style="margin:0;text-align:center">${icon('check', 14)} Choix enregistrés avec tes ordres du tour.</p>` : ''}
  </main>${journalHtml(aff)}${tabbar('enquete')}`;
}
