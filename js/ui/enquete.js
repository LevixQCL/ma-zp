// Écran Enquête : le tableau Mobile · Moyen · Occasion, les pièces, les planques et les notes.
import { S, esc, icon, fmt1, tabbar, myZone, zoneName } from './common.js';
import {
  ENQ, DEMARCHES, SOURCES, ELEMENTS, ELEMENT_NOM, genererAffaire, dossierDe, dossierAffaire, texteFait, titrePiece,
  ficheSuspect, fichePlanque, pointsDecouverte, pieceDemarche, coutDemarche, dansMaCellule, zonesDuSuspect, rebondsPublies,
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
export function ecrireCarnet(n, c) {
  S.carnetMem = { ...(S.carnetMem || {}), [n]: c };
  try { localStorage.setItem(carnetKey(n), JSON.stringify(c)); } catch (e) { /* stockage indisponible : on garde en mémoire */ }
}

function autresZones() {
  return Object.values(S.state.zones).filter((z) => z.uid !== S.user.uid && z.toursSansOrdres < 3).sort((a, b) => a.code.localeCompare(b.code));
}
const coutTotal = (d) => (d.demarches || []).reduce((s, x) => s + coutDemarche(S.state, S.user.uid, x), 0);

function partageCtl(piece) {
  const d = S.draft;
  if (piece.src === 'ouverture' || piece.src === 'rebond') return '<span class="tiny muted">connue de tous</span>';
  const prevu = (d.partages || []).filter((p) => p.f === piece.f);
  if (prevu.length) {
    const qui = prevu.map((p) => (p.a === '*' ? 'à tous' : zoneName(S.state.zones[p.a]))).join(', ');
    return `<span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="tag" style="background:rgba(90,176,240,.14);color:var(--blue-soft)">Partage prévu ${qui}</span>
      <button class="btn small ghost" data-action="partage-annuler" data-f="${piece.f}">Annuler</button></span>`;
  }
  if ((d.partages || []).length >= ENQ.maxPartages) return `<span class="tiny muted">${ENQ.maxPartages} partages maximum par tour</span>`;
  const id = `pz-${piece.f.replace(':', '-')}`;
  return `<span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
    <label class="sr" for="${id}">Partager à une zone</label>
    <select id="${id}" class="text" data-change="partage-zone" data-f="${piece.f}" style="min-height:40px;font-size:12.5px;padding:0 8px;max-width:150px">
      <option value="">Partager à…</option>${autresZones().map((z) => `<option value="${esc(z.uid)}">${zoneName(z)}</option>`).join('')}</select>
    <button class="btn small" data-action="partage" data-f="${piece.f}" data-a="*">À tous</button></span>`;
}

function sourceDe(p) {
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
function demBtn(aff, dos, x, label, { compact = false } = {}) {
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

function traqueHtml(tr) {
  const st = S.state, z = myZone(), d = S.draft;
  const a = genererAffaire(st.seed, tr.n);
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
    <div class="mmo-row">${cases}</div>
    ${open ? `<div class="col" style="gap:8px">
      <p class="small" style="margin:0;line-height:1.55">${esc(fiche.vehicule)}<br>${esc(fiche.declaration)}<br><span class="muted">${esc(fiche.rumeur)}</span></p>
      ${pieces.map((p) => pieceHtml(aff, p)).join('')}
      <span class="tiny muted">Faire vérifier :</span>
      <div class="dem-row">${demBtn(aff, dos, `alibi:${i}`, 'Son alibi', { compact: true })}${demBtn(aff, dos, `moyens:${i}`, 'Ses moyens', { compact: true })}${demBtn(aff, dos, `banque:${i}`, 'Son mobile', { compact: true })}</div>
      ${mien ? '' : `<p class="tiny muted" style="margin:0">Suspect suivi par ${suivi.length ? esc(suivi.join(', ')) : 'une autre cellule'} : tes vérifications coûtent le double. Demande-leur leurs pièces à la <a href="#radio">radio</a>.</p>`}
      ${!dos.exclu && dos.accuse === null ? (accuse ? '<button class="btn small ghost" data-action="accuser-annuler">Retirer l’accusation</button>' : `<button class="btn small outline" data-action="accuser" data-i="${i}">Accuser ${esc(s.prenom)}</button>`) : ''}
    </div>` : ''}
  </article>`;
}

function tableau(aff, dos) {
  const d = S.draft, z = myZone(), st = S.state;
  const carnet = lireCarnet(aff.n);
  const dem = d.demarches || [];
  const miens = aff.suspects.map((s, i) => (dansMaCellule(st, S.user.uid, i) ? s.prenom : null)).filter(Boolean);
  const cellule = st.enquete.nbCellules > 1
    ? `<span class="small">Le parquet a réparti les suspects entre ${st.enquete.nbCellules} cellules de zones. Tu suis <strong>${esc(miens.join(' et '))}</strong> ; vérifier un autre suspect coûte le double. Partager fait avancer tout le monde.</span>`
    : '';
  let accus = '';
  if (dos.exclu) accus = '<div class="card tight"><span style="font-weight:600">Accusation rejetée par le parquet</span><span class="small muted">Tu ne peux plus accuser sur cette affaire, mais tes pièces peuvent encore aider les autres zones.</span></div>';
  else if (dos.accuse !== null) accus = `<div class="card tight"><span style="font-weight:600">Accusation transmise</span><span class="small muted">${esc(aff.suspects[dos.accuse].nom)}.</span></div>`;
  else if (d.accusation !== null && d.accusation !== undefined) accus = `<div class="card amber tight"><span class="kicker">Accusation prête</span><span style="font-weight:700;font-size:15px">${esc(aff.suspects[d.accusation].nom)}</span>
    <span class="small" style="color:var(--amber-soft)">Transmise au parquet à 20:00. Une seule accusation par affaire : une erreur t’écarte de l’affaire.</span></div>`;
  return `
    <div class="card tight" style="gap:4px">
      <div class="between"><span style="font-weight:700">Démarches du jour : ${dem.length} sur ${ENQ.maxDemarches}</span><span class="small mono">${fmt1(coutTotal(d))} k€</span></div>
      <span class="tiny muted">Résultats ce soir à 20:00 · budget restant : ${fmt1(z.budget - coutTotal(d))} k€.</span>
      ${cellule}
    </div>
    ${accus ? `<section class="col" aria-label="Accusation">${accus}</section>` : ''}
    ${constatations(aff, dos)}
    <section class="col" style="gap:8px" aria-label="Suspects">
      <h2 class="section">Les cinq suspects</h2>
      <p class="tiny muted" style="margin:0">Le coupable est le seul à réunir un mobile, un moyen et l’occasion. À toi de cocher : ✓ établi, ✕ exclu. Touche un nom pour sa fiche, ses pièces et les vérifications.</p>
      ${aff.suspects.map((s, i) => suspectCard(aff, dos, s, i, carnet)).join('')}
    </section>`;
}

function vuePieces(aff, dos) {
  const tri = dos.pieces.slice().sort((x, y) => y.j - x.j || (x.f < y.f ? -1 : 1));
  return `<p class="tiny muted" style="margin:0">Partager rapporte des PS, et ${'des points d’enquête'} si ta pièce aide une zone à trouver l’auteur.</p>
    ${tri.map((p) => pieceHtml(aff, p)).join('')}`;
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

export function renderEnquete() {
  const st = S.state, z = myZone();
  if (!st.enquete) {
    return `<main class="screen"><header class="col" style="gap:3px"><span class="kicker">Enquête</span><h1 class="big">Pas d’affaire en cours</h1></header>
      <p class="small muted">La première affaire s’ouvrira au prochain tour.</p></main>${tabbar('enquete')}`;
  }
  const aff = genererAffaire(st.seed, st.enquete.n);
  const dos = dossierDe(st, z);
  const tab = S.enqTab || 'tableau';
  const j = st.enquete.jour;
  const rebonds = rebondsPublies(st);
  const tabs = [['tableau', 'Tableau'], ['pieces', `Pièces (${dos.pieces.length})`], ['planques', 'Planques'], ['notes', 'Notes']];
  let body;
  if (tab === 'pieces') body = vuePieces(aff, dos);
  else if (tab === 'planques') body = vuePlanques(aff, dos);
  else if (tab === 'notes') body = vueNotes(aff);
  else body = tableau(aff, dos);
  return `<main class="screen">
    <header class="col" style="gap:6px">
      <span class="kicker">Enquête · affaire n° ${aff.n}</span>
      <h1 class="big" style="line-height:1.05">${esc(aff.titre)}</h1>
      <p class="small" style="margin:0;color:var(--text2);line-height:1.5">${esc(aff.recit)}</p>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="pill">Jour ${j} sur ${ENQ.dureeMax}</span>
        <span class="pill amber">Découverte ce soir : ${pointsDecouverte(j)} pts</span>
      </div>
    </header>
    ${rebonds.map((r) => `<section class="card amber tight"><span class="kicker">Jour ${r.j} · rebondissement</span><span style="font-weight:700">${esc(r.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(r.texte)}</span></section>`).join('')}
    ${(st.traques || []).map(traqueHtml).join('')}
    <div class="seg4" role="tablist" aria-label="Parties du dossier">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-action="enq-tab" data-t="${k}">${l}</button>`).join('')}</div>
    <section class="col" style="gap:10px">${body}</section>
    <a class="small" href="#guide-enquete" style="text-align:center">Comment fonctionne l’enquête ?</a>
    ${S.savedOrders && !S.ordersDirty ? `<p class="tiny muted" style="margin:0;text-align:center">${icon('check', 14)} Choix enregistrés avec tes ordres du tour.</p>` : ''}
  </main>${tabbar('enquete')}`;
}
