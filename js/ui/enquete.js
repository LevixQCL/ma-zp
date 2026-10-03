// Écran Enquête : le tableau Mobile · Moyen · Occasion, les pièces, les planques et les notes.
import { S, esc, icon, fmt1, tabbar, myZone, zoneName } from './common.js';
import { capacite } from '../engine/zone.js';
import { APPUI } from '../engine/appui.js';
import { monAppui } from './incidents.js';
import { renderTableau } from './tableau.js';
import { aideBtn } from './aide.js';
import { journalHtml, journalAuto } from './journal.js';
import { dossierAffaire3 } from '../engine/dossier.js';
import { minutes, MODES } from '../engine/carte3.js';
import { planifierEnvoi, synchroniser, synchroniserMaintenant, contenuChange, carnetVide } from './carnet-sync.js';
import {
  ENQ, DEMARCHES, SOURCES, ELEMENTS, ELEMENT_NOM, affaire, dossierDe, dossierAffaire, texteFait, titrePiece,
  chanceVoisinage, VOISINAGE,
  ficheSuspect, fichePlanque, pointsDecouverte, pieceDemarche, coutDemarche, dansMaCellule, zonesDuSuspect, rebondsPublies, dejaPartagee,
} from '../engine/enquete.js';

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
export const coutTotal = (d) => (d.demarches || []).reduce((s, x) => s + coutDemarche(S.state, S.user.uid, x), 0);

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
  if ((d.partages || []).length >= ENQ.maxPartages) return `<span class="col" style="gap:2px;align-items:flex-end"><span class="tiny muted">${ENQ.maxPartages} partages maximum par tour · chaque zone en reçoit ${ENQ.maxRecus} par soir au plus</span>${dejaTxt}</span>`;
  const id = `pz-${piece.f.replace(':', '-')}`;
  return `<span class="col" style="gap:4px;align-items:flex-end"><span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
    <label class="sr" for="${id}">Partager à une zone</label>
    <select id="${id}" class="text" data-change="partage-zone" data-f="${piece.f}" style="min-height:40px;font-size:12.5px;padding:0 8px;max-width:150px">
      <option value="">Partager à…</option>${restantes.map((z) => `<option value="${esc(z.uid)}">${zoneName(z)}</option>`).join('')}</select>
    <button class="btn small" data-action="partage" data-f="${piece.f}" data-a="*">${deja.size ? 'Aux autres' : 'À tous'}</button></span>${dejaTxt}</span>`;
}

export function sourceDe(p) {
  if (p.src === 'partage' && p.de && S.state.zones[p.de]) return `Partagée par ${zoneName(S.state.zones[p.de])}`;
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
export function demBtn(aff, dos, x, label, { compact = false } = {}) {
  const d = S.draft, z = myZone();
  const dem = d.demarches || [];
  const on = dem.includes(x);
  const prix = coutDemarche(S.state, S.user.uid, x);
  const dm = DEMARCHES[x.split(':')[0]];
  let raison = '';
  if (!on) {
    if (!pieceDemarche(aff, dos, x)) raison = 'au dossier';
    else if (dem.length >= ENQ.maxDemarches) raison = `${ENQ.maxDemarches} par jour`;
    else if (prix > z.budget - coutTotal(d)) raison = 'budget';
  }
  const prixTxt = prix ? `${prix} k€` : `${dm.agents} agents`;
  return `<button type="button" class="dem ${compact ? 'compact' : ''}" data-action="dem-toggle" data-k="${x}" aria-pressed="${on}" ${raison ? 'disabled' : ''}>
    <span class="l">${esc(label)}</span><span class="p">${on ? 'demandé ✓' : raison || prixTxt}</span></button>`;
}

export function traqueHtml(tr) {
  const st = S.state, z = myZone(), d = S.draft;
  const a = affaire(st, tr.n);
  const dos = dossierAffaire(st, z, tr.n);
  const t = d.traque && d.traque.n === tr.n ? d.traque : null;
  const carnet = lireCarnet(tr.n);
  const maxAg = d.alloc.intervention || 0;
  const s = a.suspects[a.coupable];
  const indices = dos.pieces.filter((p) => p.f.startsWith('p:')).map((p) => `« ${esc(texteFait(a, p.f).split(' : ').pop())} »`);
  return `<section class="card red" aria-label="Traque en cours">
    <div class="between"><span class="kicker" style="color:var(--red-soft)">Traque · ${tr.tours} tour${tr.tours > 1 ? 's' : ''} restant${tr.tours > 1 ? 's' : ''}</span><span class="tiny muted">${esc(a.titre)}</span></div>
    <h2 class="card-title" style="margin:0">${esc(s.nom)} est en fuite</h2>
    <p class="small" style="margin:0">Choisis une planque et envoie au moins ${ENQ.agentsTraque} agents d’Intervention. Ce que tu sais de la planque : ${indices.join(' ') || 'rien'}.</p>
    <div class="col" style="gap:6px">${a.planques.map((p, i) => {
      const m = MARQUES[carnet.p[i] || 0];
      return `<button type="button" class="choice" data-action="traque-planque" data-n="${tr.n}" data-i="${i}" aria-pressed="${!!t && t.planque === i}" style="flex-direction:row;justify-content:space-between;text-align:left;align-items:center;gap:10px">
        <span class="col" style="gap:1px;align-items:flex-start"><span style="font-size:14px">${esc(p.nom)}</span><span class="s">${esc(fichePlanque(p))}</span></span>
        <span class="mark ${m.cls}" aria-label="${m.nom} dans ton carnet">${m.sym}</span></button>`;
    }).join('')}</div>
    ${t ? `<div class="between"><span class="small" style="font-weight:600">Agents envoyés</span>
      <span class="stepper"><button type="button" data-action="traque-agents" data-d="-1" aria-label="Un agent en moins">−</button><span class="n">${t.agents}</span><button type="button" data-action="traque-agents" data-d="1" aria-label="Un agent en plus" ${t.agents >= maxAg ? 'disabled' : ''}>+</button></span></div>
      <p class="tiny ${t.agents < ENQ.agentsTraque ? 'bad' : 'muted'}" style="margin:0">${t.agents < ENQ.agentsTraque ? `Il faut au moins ${ENQ.agentsTraque} agents.` : `Pris sur tes ${maxAg} agents d’Intervention du jour.`} <button class="btn small ghost" data-action="traque-annuler">Ne pas intervenir</button></p>` : ''}
  </section>`;
}

// ───── Tableau : constatations puis suspects ─────
function constatations(aff, dos) {
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
  const accuse = d.accusation === i;
  const exclu = ELEMENTS.some((e) => carnet.g[`${i}:${e}`] === 2);
  const multi = st.enquete.nbCellules > 1;
  return `<article class="suspect ${exclu ? 'exclu' : ''} ${accuse ? 'accuse' : ''}">
    <button type="button" class="suspect-tete" data-action="enq-open" data-i="${i}" aria-expanded="${open}">
      <span class="col grow" style="gap:2px;align-items:flex-start;min-width:0"><span class="nom">${esc(s.nom)}${accuse ? ` <span class="tag" style="background:var(--amber-bg);color:var(--amber)">accusé${s.f ? 'e' : ''}</span>` : ''}</span>
        <span class="tiny muted">${esc(fiche.lien)}</span></span>
      <span class="col" style="gap:2px;align-items:flex-end;flex-shrink:0">${multi ? `<span class="tiny ${mien ? 'good' : 'muted'}">${mien ? 'ta cellule' : 'autre cellule'}</span>` : ''}<span class="tiny muted">${pieces.length} pièce${pieces.length > 1 ? 's' : ''} ${open ? '▴' : '▾'}</span></span>
    </button>
    ${open ? `<div class="mmo-row">${cases}</div>` : ''}
    ${open ? `<div class="col" style="gap:8px">
      <p class="small" style="margin:0;line-height:1.55">${esc(fiche.vehicule)}<br>${esc(fiche.declaration)}<br>${fiche.trajet ? `${esc(fiche.trajet)}<br>` : ''}<span class="muted">${esc(fiche.rumeur)}</span></p>
      ${aff.prof && s.alibi.type !== 'seul' ? `<p class="tiny muted" style="margin:0">Par la route, du lieu déclaré jusqu’${esc(/^le /.test(aff.lieu) ? `au ${aff.lieu.slice(3)}` : `à ${aff.lieu}`)} : ${Object.entries(MODES).map(([m, md]) => `${md.icone} ${minutes(s.alibi.pos, aff.pos, m, aff.travaux)} min`).join(' · ')}${aff.travaux ? ' (avec les travaux)' : ''}.</p>` : ''}
      ${aff.prof ? (() => { const a = dossierAffaire3(st.seed, aff).auditions[i]; return `<details class="piece"><summary class="kicker" style="cursor:pointer">PV d’audition · ${esc(a.heure)}</summary>${a.qr.map(([q, r]) => `<p class="small" style="margin:6px 0 0"><strong>Q :</strong> ${esc(q)}<br><strong>R :</strong> ${esc(r)}</p>`).join('')}</details>`; })() : ''}
      ${pieces.map((p) => pieceHtml(aff, p)).join('')}
      ${(() => { const surPiste = d.piste === i; return `<button type="button" class="btn small ${surPiste ? 'primary' : 'outline'} block" data-action="piste" data-i="${i}" aria-pressed="${surPiste}">${surPiste ? `✓ Piste prioritaire des enquêteurs (retirer)` : `Mettre les enquêteurs de Recherche sur ${esc(s.prenom)}`}</button>
        <span class="tiny muted" style="margin-top:-4px">${surPiste ? 'L’enquête de voisinage de ce soir cherche d’abord de ce côté.' : `Gratuit : l’enquête de voisinage cherchera ses pièces en priorité${mien ? '' : ' (hors de ta cellule : deux fois moins efficace)'}.`}</span>`; })()}
      <span class="tiny muted">Faire vérifier :</span>
      <div class="dem-row">${demBtn(aff, dos, `alibi:${i}`, 'Son alibi', { compact: true })}${demBtn(aff, dos, `moyens:${i}`, 'Ses moyens', { compact: true })}${demBtn(aff, dos, `banque:${i}`, 'Son mobile', { compact: true })}</div>
      ${mien ? '' : `<div class="col" style="gap:6px"><p class="tiny muted" style="margin:0">Suspect suivi par ${suivi.length ? esc(suivi.join(', ')) : 'une autre cellule'} : tes vérifications coûtent le double. Demande-leur leurs pièces :</p>
        <div class="row" style="gap:6px;flex-wrap:wrap">${zonesDuSuspect(st, i).filter((u) => u !== S.user.uid && st.zones[u]).map((u) => `<button type="button" class="btn small" data-action="ecrire-a" data-uid="${esc(u)}">✉ ${esc(st.zones[u].nom)}</button>`).join('')}<a class="btn small ghost" href="#radio">Radio</a></div></div>`}
      ${!dos.exclu && dos.accuse === null ? (accuse ? '<button class="btn small ghost" data-action="accuser-annuler">Retirer l’accusation</button>' : `<button class="btn small outline" data-action="accuser" data-i="${i}">Accuser ${esc(s.prenom)}</button>`) : ''}
    </div>` : ''}
  </article>`;
}

/** État d'un suspect d'après ton carnet : 'exclu' (au moins un ✕), 'complet' (3 ✓) ou 'ouvert'. */
export function etatSuspect(carnet, i) {
  const v = ELEMENTS.map((e) => carnet.g[`${i}:${e}`] || 0);
  if (v.includes(2)) return 'exclu';
  if (v.every((x) => x === 1)) return 'complet';
  return 'ouvert';
}

/** Enquête de voisinage de ce soir : ce que la Recherche peut rapporter, avec ou sans piste. */
export function voisinageInfo(aff) {
  const st = S.state, d = S.draft, z = myZone();
  const n = (d.alloc && d.alloc.recherche) || 0;
  const cap = capacite(z, 'recherche', n, { rythme: d.rythme, turn: st.turn });
  const piste = Number.isInteger(d.piste) ? d.piste : null;
  const x = chanceVoisinage(st, S.user.uid, cap, piste);
  const txt = x <= 0 ? 'aucune chance' : x < 1 ? `${Math.round(x * 100)} % de chance d’une pièce` : `1 pièce assurée${x % 1 > 0.05 ? ` + ${Math.round((x % 1) * 100)} % d’une 2e` : ''}`;
  const sansPiste = chanceVoisinage(st, S.user.uid, cap, null);
  return { n, piste, x, txt, sansPiste, nom: piste !== null ? aff.suspects[piste].prenom : null };
}

/** Appui fédéral : équipe du jour à faire travailler, et demande pour demain (labo ou RCCU). */
export function appuiHtml() {
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
  const constatsFaites = ['occ', 'moy', 'mob'].filter((e) => dos.pieces.some((p) => p.f === `c:${e}`)).length;
  const constatsPrevues = dem.filter((x) => ['cam', 'labo', 'temoin'].includes(x)).length;
  const enLice = aff.suspects.map((_, i) => i).filter((i) => etatSuspect(carnet, i) !== 'exclu');
  const nomDem = (x) => {
    const [k, i] = x.split(':');
    const dm = DEMARCHES[k];
    return i !== undefined ? `${dm.nom} · ${aff.suspects[Number(i)].prenom}` : dm.nom;
  };
  let etape;
  if (dos.exclu) etape = 'Ton accusation a été rejetée : tu ne peux plus accuser, mais tes pièces partagées peuvent encore rapporter des points.';
  else if (dos.accuse !== null) etape = 'Accusation transmise au parquet. Résultat ce soir à 20:00.';
  else if (d.accusation !== null && d.accusation !== undefined) etape = `Accusation prête contre ${aff.suspects[d.accusation].prenom} : elle part à 20:00 avec tes ordres.`;
  else if (constatsFaites + constatsPrevues < 3) etape = `<strong>Étape 1 · la scène.</strong> Il manque ${3 - constatsFaites} constatation${3 - constatsFaites > 1 ? 's' : ''} : elles disent quelle heure, quel moyen et quel mobile comptent. <button type="button" class="lien" data-action="enq-tab" data-t="scene">Voir la scène</button>`;
  else if (enLice.length > 1) etape = `<strong>Étape 2 · les suspects.</strong> Vérifie l’alibi, les moyens ou le mobile des suspects de ta cellule, et coche ✕ dès qu’un élément ne colle pas. Encore ${enLice.length} en lice.`;
  else if (enLice.length === 1) etape = `<strong>Étape 3 · l’accusation.</strong> Il ne reste que ${aff.suspects[enLice[0]].prenom} dans ton tableau. Accuse si tu es sûr : une seule chance.`;
  else etape = 'Tous les suspects sont exclus dans ton tableau : une coche est sans doute fausse. Relis les pièces.';
  const miens = aff.suspects.map((s2, i) => (dansMaCellule(st, S.user.uid, i) ? s2.prenom : null)).filter(Boolean);
  return `<section class="card tight aujourdhui" aria-label="Aujourd’hui" style="gap:8px">
    <div class="between"><span style="font-weight:700">Aujourd’hui : ${dem.length} démarche${dem.length > 1 ? 's' : ''} sur ${ENQ.maxDemarches}</span><span class="small mono" style="white-space:nowrap">${fmt1(coutTotal(d))} k€</span></div>
    ${dem.length ? `<div class="row" style="gap:6px;flex-wrap:wrap">${dem.map((x) => `<button type="button" class="chip on" data-action="dem-toggle" data-k="${x}" aria-label="Annuler : ${esc(nomDem(x))}">${esc(nomDem(x))} ✕</button>`).join('')}</div>` : ''}
    <p class="small" style="margin:0;line-height:1.5">${etape}</p>
    ${(() => { const v = voisinageInfo(aff); return `<div class="voisinage"><div class="between" style="gap:8px;align-items:flex-start"><span class="small"><strong>Voisinage ce soir</strong> · ${v.n} agent${v.n > 1 ? 's' : ''} en Recherche${v.nom ? ` sur la piste de <strong>${esc(v.nom)}</strong>` : ''} : <span class="${v.x >= 0.5 ? 'good' : v.x > 0 ? '' : 'bad'}">${v.txt}</span>.</span>${aideBtn('voisinage')}</div></div>`; })()}
    ${appuiHtml()}
    <span class="tiny muted">Résultats à 20:00 · budget restant ${fmt1(z.budget - coutTotal(d))} k€${st.enquete.nbCellules > 1 ? ` · ta cellule : ${esc(miens.join(', '))} (les autres suspects coûtent le double)` : ''}</span>
  </section>`;
}

/** Pièces que j'ai obtenues moi-même (démarches payées ou agents envoyés, voisinage, énigmes) et où elles en sont. */
function mesPieces(aff, dos) {
  const st = S.state, d = S.draft;
  const miennes = dos.pieces.filter((p) => DEMARCHES[p.src] || p.src === 'voisinage' || p.src === 'quete' || p.src === 'pjf').sort((a, b) => b.j - a.j);
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
      const s2 = aff.suspects[i], etat = etatSuspect(carnet, i), mien = dansMaCellule(st, S.user.uid, i);
      return `<div class="syn-l ${etat}" role="row"><span role="rowheader" class="syn-nom">${S.draft && S.draft.piste === i ? '<i title="piste prioritaire" aria-label="piste prioritaire">🔎</i> ' : ''}${esc(s2.prenom)}${st.enquete.nbCellules > 1 && mien ? ' <i class="cel" title="ta cellule">●</i>' : ''}</span>${ELEMENTS.map((e) => {
        const m = CASES[carnet.g[`${i}:${e}`] || 0];
        return `<button type="button" role="cell" class="syn-c ${m.cls}" data-action="mmo-mark" data-i="${i}" data-e="${e}" aria-label="${ELEMENT_NOM[e]} de ${esc(s2.prenom)} : ${m.nom}. Changer">${m.sym}</button>`;
      }).join('')}</div>`;
    }).join('')}
  </div>
  <p class="tiny muted" style="margin:0">Touche une case : ✓ établi, puis ✕ exclu, puis vide. Le coupable est le seul à avoir les trois ✓. ${st.enquete.nbCellules > 1 ? '● = suspect de ta cellule.' : ''}</p>`;
}

function vueSuspects(aff, dos) {
  const st = S.state;
  const carnet = lireCarnet(aff.n);
  const filtre = S.enqFiltre || 'tous';
  const idx = aff.suspects.map((_, i) => i);
  // Tri : ta cellule d'abord, les exclus en dernier.
  const rang = (i) => (etatSuspect(carnet, i) === 'exclu' ? 2 : 0) + (dansMaCellule(st, S.user.uid, i) ? 0 : 1);
  const ordre = idx.slice().sort((x, y) => rang(x) - rang(y) || x - y);
  const visibles = ordre.filter((i) => filtre === 'tous' || (filtre === 'cellule' ? dansMaCellule(st, S.user.uid, i) : etatSuspect(carnet, i) !== 'exclu'));
  const f = (k, l) => `<button type="button" class="chip ${filtre === k ? 'on' : ''}" data-action="enq-filtre" data-v="${k}">${l}</button>`;
  return `${synthese(aff, carnet, ordre)}
    <div class="row" style="gap:6px;flex-wrap:wrap">${f('tous', 'Tous')}${st.enquete.nbCellules > 1 ? f('cellule', 'Ma cellule') : ''}${f('lice', 'Encore en lice')}</div>
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

function vuePlanques(aff, dos) {
  const c = lireCarnet(aff.n);
  const indices = dos.pieces.filter((p) => p.f.startsWith('p:'));
  const relances = ['cam', 'labo', 'temoin'].filter((k) => dos.pieces.some((p) => p.f === `c:${DEMARCHES[k].scene}`) && pieceDemarche(aff, dos, k));
  return `<p class="tiny muted" style="margin:0">Une fois l’auteur identifié, il faudra le cueillir dans sa planque en ${ENQ.traqueTours} tours. Prépare-toi dès maintenant.</p>
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
  if (S.enqVue) return S.enqVue;
  try { S.enqVue = localStorage.getItem('mazp-enq-vue') || 'tableau'; } catch (e) { S.enqVue = 'tableau'; }
  return S.enqVue;
}

export function renderEnquete() {
  const st = S.state, z = myZone();
  if (!st.enquete) {
    return `<main class="screen"><header class="col" style="gap:3px"><span class="kicker">Enquête</span><h1 class="big">Pas d’affaire en cours</h1></header>
      <p class="small muted">La première affaire s’ouvrira au prochain tour.</p></main>${tabbar('enquete')}`;
  }
  if (vueEnquete() === 'tableau') return renderTableau();
  const aff = affaire(st, st.enquete.n);
  journalAuto(aff);
  const dos = dossierDe(st, z);
  const tab = ['suspects', 'scene', 'pieces', 'planques', 'notes'].includes(S.enqTab) ? S.enqTab : 'suspects';
  const j = st.enquete.jour;
  const rebonds = rebondsPublies(st);
  const constats = ['occ', 'moy', 'mob'].filter((e) => dos.pieces.some((p) => p.f === `c:${e}`)).length;
  const tabs = [['suspects', 'Suspects'], ['scene', `Scène<small>${constats}/3</small>`], ['pieces', `Pièces<small>${dos.pieces.length}</small>`], ['planques', 'Planques'], ['notes', 'Notes']];
  let body;
  if (tab === 'pieces') body = vuePieces(aff, dos);
  else if (tab === 'planques') body = vuePlanques(aff, dos);
  else if (tab === 'notes') body = vueNotes(aff);
  else if (tab === 'scene') body = constatations(aff, dos);
  else body = vueSuspects(aff, dos);
  return `<main class="screen">
    <header class="col" style="gap:6px">
      <div class="between"><span class="kicker">Enquête · affaire n° ${aff.n}</span><span class="row" style="gap:6px">${aff.prof ? '<button type="button" class="btn small" data-action="journal-ouvrir">📰 Journal</button>' : ''}<button type="button" class="btn small" data-action="tab-vue" data-v="tableau">${icon('tableau', 16)} Tableau</button></span></div>
      <h1 class="big" style="line-height:1.05">${esc(aff.titre)}</h1>
      <details class="recit" data-k="recit" ${(S.ouverts && 'recit' in S.ouverts ? S.ouverts.recit : j <= 1) ? 'open' : ''}><summary class="small">Les faits ${icon('chevron', 14)}</summary>
        <p class="small" style="margin:6px 0 0;color:var(--text2);line-height:1.5">${esc(aff.recit)}</p></details>
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
    ${mesPieces(aff, dos)}
    <div class="segn onglets-enq" role="tablist" aria-label="Parties du dossier" style="grid-template-columns:repeat(5,minmax(0,1fr))">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-action="enq-tab" data-t="${k}">${l}</button>`).join('')}</div>
    <section class="col" style="gap:10px">${body}</section>
    <a class="small" href="#guide-enquete" style="text-align:center">Comment fonctionne l’enquête ?</a>
    ${S.savedOrders && !S.ordersDirty ? `<p class="tiny muted" style="margin:0;text-align:center">${icon('check', 14)} Choix enregistrés avec tes ordres du tour.</p>` : ''}
  </main>${journalHtml(aff)}${tabbar('enquete')}`;
}
