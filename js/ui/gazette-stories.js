// La Gazette du Delta, saison 2 : une suite de cartes plein écran à toucher, comme des « stories ».
// Une carte = une chose : la une, toi cette nuit, l'enquête, le district, le tribunal, les services, les petites annonces, le sommaire.
// Règles de rédaction appliquées à l'affichage (les Gazettes déjà parues en profitent aussi) :
//  - les faits d'une même rubrique sont regroupés ;
//  - la une est choisie pour chaque lecteur (ta zone d'abord), jamais une simple annonce ;
//  - les chiffres de règles (×0,3, +7 points, −4 de moral…) restent dans le rapport de la nuit ;
//  - l'enquête n'apparaît qu'une fois ;
//  - les échos (« Petites annonces ») sont toujours affichés en entier : certains soirs, leurs initiales cachent un indice.
import { S, esc, icon, tabbar, myZone } from './common.js';
import { insigne } from './blasons.js';
import { regrouperHonneur } from '../engine/honneur.js';
import { affaire } from '../engine/enquete.js';
import { formatDateBe } from '../engine/time.js';
import { debriefsRecents, lienDebrief } from './debrief.js';
import { portraitSuspect } from './portrait.js';
import { sceneVignette } from './logistique.js';
import { reglesV2 } from '../engine/regles.js';
const zoneLabel = (z) => `ZP ${z.code} ${z.nom}`;

// ——— Rubriques et illustrations ———
// Illustrations Gemini déposées dans img/gazette/ (format 4:3). Tant qu'une image manque, une vignette dessinée la remplace.
const IMAGES = new Set(['operation']);
const CATEGORIE = {
  operation: ['Opération réussie', 'Opération', 'Flagrant délit', 'Héros du jour', 'Champion', 'Performance', 'Solidarité', 'Redressement', 'Coopération', 'Félicitations du juge'],
  coupdur: ['Coup dur', 'Fiasco', 'Faillite', 'Zone en péril', 'Tutelle', 'Inspection générale', 'Ressources humaines', 'Parquet', 'Le milieu riposte', 'Pacte rompu'],
  nondroit: ['Zone de non-droit', 'Reconquête', 'Vague brisée', 'Vague de délinquance'],
  enquete: ['Enquête', 'Nouvelle affaire', 'Affaire classée', 'Traque', 'Arrestation', 'Aveux', 'Révélation', 'PJF', 'Relève'],
  tribunal: ['Au tribunal'],
  district: ['Conseil des chefs', 'Conseil de police', 'District', 'Pacte', 'Défi amical', 'Défi en duo', 'FIPA'],
  ennemi: ['L’ennemi du district'],
  ventes: ['Salle des ventes', 'Adjugé !'],
  meteo: ['Canicule', 'Tempête', 'Neige', 'Verglas', 'Grand froid', 'Inondations'],
};
const catDe = (k) => {
  for (const [c, l] of Object.entries(CATEGORIE)) if (l.includes(k)) return c;
  if (/^(Duel|Le fil de)/.test(k || '')) return /^Duel/.test(k) ? 'district' : 'enquete';
  return 'calme';
};
const ENQUETE = new Set(CATEGORIE.enquete);
// Jamais à la une : des annonces, pas des nouvelles.
const PAS_A_LA_UNE = new Set(['Salle des ventes', 'Adjugé !', 'Bienvenue', 'Performance', 'Chantier', 'Décor', 'Conseil de police', 'Doctrine', 'Parrainage', 'Challenge', 'Carrière', 'Chef de corps', 'Retour', 'FIPA']);

/** Une rubrique au pluriel quand plusieurs faits sont regroupés. */
const PLURIEL = {
  'Coup dur': (n) => `Nuit agitée : ${n} coups durs dans le district`,
  Bienvenue: (n) => `${n} nouvelles zones rejoignent le district`,
  'Zone de non-droit': (n) => `Zone de non-droit : ${n} secteurs bougent`,
  'Adjugé !': (n) => `Salle des ventes : ${n} lots adjugés`,
  Chantier: (n) => `${n} chantiers dans le district`,
  Décor: (n) => `${n} commissariats changent de décor`,
  Reconquête: (n) => `${n} secteurs repris au milieu`,
  'Opération réussie': (n) => `${n} opérations réussies cette nuit`,
};

/** Sans les chiffres de règles : on retire les phrases qui comptent des points, des multiplicateurs ou des jauges. */
const RE_REGLE = /×\s?\d|[+−-]\s?\d+(?:[,.]\d+)?\s?(?:pts?|points?|PS)\b|[+−-]\s?\d+(?:[,.]\d+)?\s(?:de |d’)(?:moral|satisfaction|réputation|IPZ)/;
export function sansRegles(t) {
  if (!t) return '';
  const phrases = String(t).match(/[^.!?]+[.!?]*\s*/g) || [String(t)];
  return phrases.filter((p) => !RE_REGLE.test(p)).join('').trim();
}

/** Regroupe les faits par rubrique. Chaque article garde ses faits (titre, texte, zone). */
export function regrouper(news) {
  const par = new Map();
  for (const n of news) {
    if (!n || !n.titre) continue;
    const a = par.get(n.kicker);
    if (a) { a.faits.push(n); a.prio = Math.max(a.prio, n.prio || 0); continue; }
    par.set(n.kicker, { kicker: n.kicker, prio: n.prio || 0, faits: [n] });
  }
  return [...par.values()].map((a) => ({ ...a, titre: a.faits.length > 1 && PLURIEL[a.kicker] ? PLURIEL[a.kicker](a.faits.length) : a.faits[0].titre }));
}

const toucheMoi = (n, me) => !!me && (n.uid === me.uid || String(n.titre || '').includes(zoneLabel(me)) || String(n.texte || '').includes(zoneLabel(me)));

/** La une pour ce lecteur : priorité, plus un bonus quand le fait touche sa zone ou plusieurs zones. */
export function choisirUne(articles, me) {
  const score = (a) => a.prio + (a.faits.some((n) => toucheMoi(n, me)) ? 4 : 0) + Math.min(3, a.faits.length - 1) + (ENQUETE.has(a.kicker) ? 1 : 0);
  const cands = articles.filter((a) => !PAS_A_LA_UNE.has(a.kicker));
  return (cands.length ? cands : articles).slice().sort((x, y) => score(y) - score(x))[0] || null;
}

// ——— Vignettes dessinées (en attendant les illustrations) ———
function vignette(cat, id) {
  if (IMAGES.has(cat)) return `<img class="gzs-img" src="img/gazette/${cat}.webp" alt="" loading="lazy">`;
  const fond = { coupdur: '#4A4030', nondroit: '#3B3428', enquete: '#C9B994', tribunal: '#D7C8A4', ennemi: '#2E2A24', meteo: '#D9B26A' }[cat] || '#CDBE98';
  const motifs = {
    operation: '<path d="M30 150V78l70-30 70 30v72Z" fill="#6B5B40"/><rect x="50" y="92" width="20" height="20" fill="#E9DEC4"/><rect x="90" y="92" width="20" height="20" fill="#E9DEC4"/><rect x="130" y="92" width="20" height="20" fill="#E9DEC4"/><rect x="200" y="118" width="94" height="32" rx="4" fill="#2C2418"/><rect x="208" y="106" width="46" height="16" rx="3" fill="#2C2418"/><rect x="224" y="100" width="14" height="6" rx="2" fill="#9A2B1F"/><path d="M231 100 194 70M231 100l38-30" stroke="#9A2B1F" stroke-width="2" opacity=".5"/>',
    coupdur: '<circle cx="262" cy="40" r="16" fill="#E9DEC4" opacity=".85"/><path d="M0 160V92h40V62h30v34h30V52h40v48h30V72h40v34h30V82h40v18h40v60Z" fill="#1D1A15"/><g fill="#E9C46A" opacity=".8"><rect x="50" y="72" width="6" height="8"/><rect x="112" y="64" width="6" height="8"/><rect x="186" y="84" width="6" height="8"/><rect x="254" y="94" width="6" height="8"/></g><rect x="138" y="142" width="26" height="10" rx="3" fill="#9A2B1F"/>',
    nondroit: '<path d="M0 160V86h50V60h40v40h40V70h60v30h40V56h50v104Z" fill="#1D1A15"/><path d="M20 138h280" stroke="#E9C46A" stroke-width="10" stroke-dasharray="22 14"/><path d="M60 128v20M140 128v20M220 128v20" stroke="#E9DEC4" stroke-width="3"/>',
    enquete: '<rect x="40" y="28" width="170" height="114" fill="#B89B62" transform="rotate(-4 125 85)"/><rect x="48" y="36" width="156" height="100" fill="#D6BD86" transform="rotate(-4 125 85)"/><path d="M70 70h110M70 88h110M70 106h70" stroke="#2C2418" stroke-width="3" opacity=".5" transform="rotate(-4 125 85)"/><g transform="translate(224 42) rotate(6)"><rect width="70" height="84" fill="#fff"/><rect x="5" y="5" width="60" height="58" fill="#7A6A4E"/><circle cx="35" cy="28" r="12" fill="#3A2F20"/><path d="M13 63c2-19 42-19 44 0Z" fill="#3A2F20"/></g>',
    tribunal: '<path d="M60 150h200M80 150V80M120 150V80M160 150V80M200 150V80M240 150V80M60 80h200L160 40Z" stroke="#2C2418" stroke-width="8" fill="none" stroke-linejoin="round"/>',
    district: '<g fill="#6B5B40"><rect x="40" y="70" width="240" height="70" rx="6"/></g><g fill="#2C2418">' + [0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${70 + k * 36}" cy="58" r="11"/><rect x="${60 + k * 36}" y="66" width="20" height="18" rx="5"/>`).join('') + '</g>',
    ennemi: '<circle cx="160" cy="70" r="34" fill="#E9DEC4" opacity=".12"/><path d="M120 150c0-50 15-90 40-90s40 40 40 90Z" fill="#0F0D0A"/><rect x="120" y="96" width="80" height="14" fill="#0F0D0A"/><path d="M100 98h120" stroke="#0F0D0A" stroke-width="8"/><rect x="200" y="128" width="70" height="40" fill="#E9DEC4" transform="rotate(-12 235 148)"/>',
    ventes: '<path d="M130 70l60 60M118 82l24-24 40 40-24 24Z" fill="#2C2418" stroke="#2C2418" stroke-width="8" stroke-linejoin="round"/><rect x="60" y="138" width="200" height="12" fill="#6B5B40"/>',
    meteo: '<circle cx="230" cy="52" r="30" fill="#F4D58D"/><path d="M0 160V100h60V80h50v30h60V90h70v20h80v50Z" fill="#6B5B40"/>',
    calme: '<path d="M0 160V96h60V70h50v32h50V60h60v40h50V84h50v76Z" fill="#6B5B40"/><circle cx="70" cy="46" r="14" fill="#E9DEC4"/>',
  };
  return `<svg class="gzs-img" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration">
    <defs><pattern id="tr${id}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#4A3F2C" opacity=".35"/></pattern></defs>
    <rect width="320" height="180" fill="${fond}"/>${motifs[cat] || motifs.calme}<rect width="320" height="180" fill="url(#tr${id})"/></svg>`;
}

// ——— Les cartes ———
function carte(id, titre, corps, { cat = '', classe = '' } = {}) {
  return { id, titre, html: `<section class="gzs-carte pp ${classe}" data-gzs-carte="${id}" aria-label="${esc(titre)}">${corps}</section>`, cat };
}
const tete = (g, rubrique) => `<header class="gzs-tete"><span>La Gazette du Delta</span><span>${esc(rubrique)}</span></header>`;
const fait = (n) => { const t = sansRegles(n.texte); return `<div class="gzs-fait"><strong>${esc(n.titre)}</strong>${t ? `<p>${esc(t)}</p>` : ''}</div>`; };

function carteFinSaison(g) {
  const f = g.finSaison;
  const v2 = reglesV2(S.state);
  return carte('saison', 'Fin de saison', `${tete(g, `Saison ${f.season}`)}
    ${vignette('saison', 's')}
    <div class="gzs-corps"><span class="sur">Fin de la saison ${f.season}</span>
      <h2>${v2 ? `La saison ${f.saisonSuivante} commence ce soir` : `Rideau sur la saison ${f.season}`}</h2>
      <ul class="gzs-palmares">${f.titres.map((t) => { const z = S.state.zones[t.uid]; return `<li><span>${esc(t.titre)}</span><b>${z ? esc(zoneLabel(z)) : ''}</b></li>`; }).join('')}</ul>
      <p>Chaque zone reçoit son bilan de saison : quelques imprévus à remettre en état ou à accepter dans les 3 premiers jours.${v2 ? ' Nouveau : ton chef de corps prend ses fonctions, quatre annexes à bâtir et la doctrine de ta zone à choisir.' : ''}</p>
      ${f.filetManque ? `<p>${esc(f.filetManque)} a filé entre les mailles avant l’Opération Filet. On le reverra peut-être.</p>` : ''}</div>`, { cat: 'saison' });
}

function carteUne(g, une) {
  const seul = une.faits.length === 1;
  const t = seul ? sansRegles(une.faits[0].texte) : '';
  return carte('une', 'À la une', `${tete(g, `n° ${g.turn}`)}
    ${vignette(catDe(une.kicker), 'u')}
    <div class="gzs-corps"><span class="sur">${esc(une.kicker)}</span><h2>${esc(une.titre)}</h2>
      ${seul ? (t ? `<p class="chapo">${esc(t)}</p>` : '') : `<ul class="gzs-liste">${une.faits.map((n) => `<li>${esc(n.titre)}</li>`).join('')}</ul>`}</div>`, { cat: catDe(une.kicker) });
}

function carteToi(g, me, i, cites) {
  const j = (g.journaux || {})[me.uid] || {};
  const classes = (g.classement || []).filter((c) => c.classe);
  const place = classes.findIndex((c) => c.uid === me.uid);
  const prec = S.gazettes[i + 1];
  const placeAvant = prec ? (prec.classement || []).filter((c) => c.classe).findIndex((c) => c.uid === me.uid) : -1;
  const mouv = place >= 0 && placeAvant >= 0 ? placeAvant - place : 0;
  const d = j.ipz != null && j.hierIpz != null ? Math.round((j.ipz - j.hierIpz) * 10) / 10 : null;
  const f1 = (x) => String(x).replace('.', ',');
  let scene = '';
  try { scene = sceneVignette(me); } catch (e) { scene = vignette('calme', 't'); }
  return carte('toi', 'Toi cette nuit', `${tete(g, `ZP ${me.code}`)}
    <div class="gzs-scene">${scene}</div>
    <div class="gzs-corps"><span class="sur">Toi cette nuit</span>
      <div class="gzs-ipz"><span class="v">${j.ipz != null ? f1(Math.round(j.ipz * 10) / 10) : '—'}</span>
        <span class="l">IPZ du jour${d != null ? ` · <b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${f1(Math.abs(d))}</b>` : ''}<br>${place >= 0 ? `${place + 1}<sup>e</sup> sur ${classes.length}${mouv ? ` · <b class="${mouv > 0 ? 'up' : 'down'}">${mouv > 0 ? '▲' : '▼'} ${Math.abs(mouv)}</b>` : ''}` : 'pas encore classé'} ${insigne(me.ps)}</span></div>
      ${jauges(j)}
      ${cites.length ? `<div class="gzs-cites"><span class="sur">Ta zone dans ce numéro</span>${cites.slice(0, 3).map((n) => `<p>« ${esc(n.titre)} »</p>`).join('')}</div>` : '<p class="gris">Ta zone n’est pas citée ce soir.</p>'}
      <button type="button" class="gzs-btn ghost" data-action="gazette-rapport">Rapport de la nuit ${icon('chevron', 16)}</button></div>`);
}

/** Moral, satisfaction, réputation et budget : la valeur ce soir et ce qui a bougé depuis hier. */
function jauges(j) {
  const jr = j.journal, c = j.compta;
  const l = [];
  const f1 = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  if (jr && jr.apres) for (const [k, nom] of [['moral', 'Moral'], ['satisfaction', 'Satisfaction'], ['reputation', 'Réputation']]) {
    const a = jr.apres[k], d = jr.avant ? a - jr.avant[k] : null;
    if (a != null) l.push([nom, f1(a), d]);
  }
  if (c && c.fin != null) l.push(['Budget', `${f1(c.fin)} k€`, c.debut != null ? c.fin - c.debut : null]);
  if (!l.length) return '';
  return `<div class="gzs-jauges">${l.map(([nom, v, d]) => `<div><span>${nom}</span><b>${v}</b>${d != null && Math.abs(d) >= 0.1 ? `<i class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${nom === 'Budget' ? `${f1(Math.abs(d))} k€` : f1(Math.abs(d))}</i>` : '<i>=</i>'}</div>`).join('')}</div>`;
}

function carteEnquete(g, faitsEnq) {
  const e = g.enquete;
  const l = [];
  let photo = '';
  let titre = e ? e.titre : (faitsEnq[0] && faitsEnq[0].titre) || 'L’enquête';
  let jour = e ? (e.classee ? 'Classée' : e.decouverte ? 'Auteur démasqué' : `Jour ${e.jour}`) : '';
  const vus = new Set();
  if (e) {
    try {
      const af = affaire(S.state, e.n);
      const s = af && af.suspects[af.coupable];
      if (s && (e.decouverte || (e.arrestations || []).length || e.classee)) photo = portraitSuspect(s, af.coupable, 'gzs-face');
    } catch (x) { /* affaire introuvable */ }
    if (e.decouverte) l.push(`<p><strong>${esc(e.decouverte.suspect)}${e.decouverte.complice ? ` et ${esc(e.decouverte.complice)}` : ''}</strong> démasqué${e.decouverte.complice ? 's' : ''} par ${esc(e.decouverte.zones.join(' et '))}. La traque commence.</p>`);
    for (const a of e.arrestations || []) l.push(a.planque ? `<p><strong>Arrestation</strong> : ${esc(a.suspect)}, à ${esc(a.planque)}, par ${esc(a.zones.join(' et '))}.</p>` : `<p><strong>Aveux</strong> : ${esc(a.suspect)}, confronté·e par ${esc(a.zones.join(' et '))}.</p>`);
    for (const a of e.fuites || []) l.push(`<p><strong>Fuite</strong> : ${esc(a.suspect)} se cachait à ${esc(a.planque)}.</p>`);
    if (e.classee && e.solution) l.push(`<p>Classée sans suite. C’était <strong>${esc(e.solution.suspect)}</strong>${e.solution.complice ? ` avec ${esc(e.solution.complice)}` : ''}.</p>`);
    if (e.rebond) { vus.add(e.rebond.titre); l.push(`<div class="gzs-fait"><strong>${esc(e.rebond.titre)}</strong><p>${esc(e.rebond.texte)}</p></div>`); }
    if (!e.decouverte && !e.classee && !e.pause && !e.rebond && !(e.arrestations || []).length) l.push('<p>Toujours pas d’auteur identifié.</p>');
    // Le fin mot : une phrase. Jamais pendant une traque (la planque ne doit pas fuiter).
    const traqueEnCours = (S.state.traques || []).some((t) => t.n === e.n && !t.fini);
    if (e.recit && !traqueEnCours) { const p = String(e.recit).split('\n')[0].match(/^[^.]+\./); if (p) l.push(`<p class="gzs-finmot">${esc(p[0])}</p>`); }
  }
  for (const n of faitsEnq) if (!vus.has(n.titre) && !(e && e.titre && n.titre.includes(e.titre) && (e.classee || e.decouverte))) { vus.add(n.titre); l.push(fait(n)); }
  const dbs = debriefsRecents().filter((x) => x.g === g);
  const nouvelle = e && e.nouvelle;
  return carte('enquete', 'L’enquête', `${tete(g, 'L’enquête')}
    <div class="gzs-corps"><div class="gzs-enq-t"><div class="pola">${photo || '<svg viewBox="0 0 60 64" aria-hidden="true"><rect width="60" height="64" fill="#7A6A4E"/><circle cx="30" cy="25" r="12" fill="#3A2F20"/><path d="M8 64c2-22 42-22 44 0Z" fill="#3A2F20"/><text x="30" y="31" text-anchor="middle" font-size="16" font-weight="800" fill="#E9DEC4">?</text></svg>'}</div>
      <div><span class="sur">${esc(jour || 'Enquête')}</span><h2>${esc(titre)}</h2></div></div>
      ${l.join('')}
      ${nouvelle ? `<div class="gzs-fait gzs-nouvelle"><span class="sur">Nouvelle affaire</span><strong>${esc(nouvelle)}</strong></div>` : ''}
      <div class="gzs-actions">${dbs.map((x) => lienDebrief(x, { compact: true })).join('')}<a class="gzs-btn" href="#enquete">Ouvrir le dossier ${icon('chevron', 16)}</a></div></div>`, { cat: 'enquete', classe: 'gzs-dossier' });
}

function carteDistrict(g, articles) {
  const vus = articles.slice(0, 4), reste = articles.slice(4);
  const art = (a) => a.faits.length === 1 ? `<div class="gzs-art"><span class="sur">${esc(a.kicker)}</span>${fait(a.faits[0])}</div>`
    : `<div class="gzs-art"><span class="sur">${esc(a.kicker)} · ${a.faits.length}</span><strong>${esc(a.titre)}</strong><ul class="gzs-liste">${a.faits.map((n) => `<li>${esc(n.titre)}</li>`).join('')}</ul></div>`;
  return carte('district', 'Le district', `${tete(g, 'Le district')}
    <div class="gzs-corps">${vus.map(art).join('')}
      ${reste.length ? `<details class="gzs-plus"><summary>${reste.length} autre${reste.length > 1 ? 's' : ''} nouvelle${reste.length > 1 ? 's' : ''}</summary>${reste.map(art).join('')}</details>` : ''}</div>`);
}

function carteTribunal(g) {
  return carte('tribunal', 'Au tribunal', `${tete(g, 'Au tribunal')}
    ${vignette('tribunal', 'tr')}
    <div class="gzs-corps">${g.tribunal.map((p) => `<span class="sur">Affaire « ${esc(p.titre)} »</span><h2>${esc(p.suspect)}</h2><p class="chapo">${esc(p.peine)}</p>
      <p>Interpellation par ${esc(p.arrestation.join(' et '))}.${p.temoins.length ? ` Cités à la barre : les enquêteurs de ${esc(p.temoins.join(', '))}.` : ''}</p>`).join('')}</div>`, { cat: 'tribunal' });
}

function carteServices(g, me) {
  const h = regrouperHonneur(g.honneur || []), b = g.betisier || [];
  const ligne = (n, cls) => { const moi = toucheMoi(n, me); const t = sansRegles(n.texte); return `<li class="${cls}${moi ? ' moi' : ''}"><strong>${esc(n.titre)}</strong>${t ? ` ${esc(t)}` : ''}${moi ? ' <span class="gzs-toi">toi</span>' : ''}</li>`; };
  // Les surnoms (« X devient Gyrophare ») sont tous pareils : une seule liste courte.
  const RE_SURNOM = /^(ZP \d+ [^:]+) : (.+) devient « ([^»]+) »$/;
  const surnoms = h.filter((n) => n.kicker === 'Portrait' && RE_SURNOM.test(n.titre));
  const autres = h.filter((n) => !surnoms.includes(n));
  const surnom = (n) => { const [, zl, qui, sn] = n.titre.match(RE_SURNOM); const moi = toucheMoi(n, me); return `<li class="${moi ? 'moi' : ''}"><b>« ${esc(sn)} »</b> ${esc(qui)} <span class="gris">· ${esc(zl.replace(/^ZP \d+ /, ''))}</span>${moi ? ' <span class="gzs-toi">toi</span>' : ''}</li>`; };
  return carte('services', 'Dans les services', `${tete(g, 'Dans les services')}
    <div class="gzs-corps">${autres.length ? `<span class="sur">Tableau d’honneur</span><ul class="gzs-honneur">${autres.map((n) => ligne(n, 'h')).join('')}</ul>` : ''}
      ${surnoms.length ? `<span class="sur">Nouveaux surnoms · ${surnoms.length}</span><ul class="gzs-honneur gzs-surnoms">${surnoms.map(surnom).join('')}</ul>` : ''}
      ${b.length ? `<span class="sur">Le bêtisier</span><ul class="gzs-honneur">${b.map((n) => ligne(n, 'b')).join('')}</ul>` : ''}</div>`);
}

function carteAnnonces(g) {
  return carte('annonces', 'Petites annonces', `${tete(g, 'Petites annonces')}
    <div class="gzs-corps"><span class="sur">Échos du district</span><div class="gzs-annonces">${g.echos.map((x) => `<p>${esc(x)}</p>`).join('')}</div></div>`);
}

function carteSommaire(g, cartes, i, list) {
  const extra = [];
  if (g.toursSansFaillite !== undefined) extra.push(`District Delta : <b>${g.toursSansFaillite}</b> tour${g.toursSansFaillite > 1 ? 's' : ''} sans faillite`);
  if (g.vente) extra.push('Salle des ventes : de nouveaux lots sont ouverts');
  return carte('sommaire', 'Sommaire', `${tete(g, 'Sommaire')}
    <div class="gzs-corps"><span class="sur">Dans ce numéro</span>
      <ol class="gzs-sommaire">${cartes.map((c, k) => `<li><button type="button" data-gzs-aller="${k}">${esc(c.titre)}</button></li>`).join('')}</ol>
      ${extra.length ? `<div class="gzs-extra">${extra.map((x) => `<p>${x}</p>`).join('')}</div>` : ''}
      <div class="gzs-actions">
        <a class="gzs-btn" href="#ordres">Mes ordres ${icon('chevron', 16)}</a>
        <button type="button" class="gzs-btn ghost" data-action="gazette-nav" data-d="1" ${i >= list.length - 1 ? 'disabled' : ''}>Numéro précédent</button>
        <a class="gzs-btn ghost" href="#classement">Classements</a></div></div>`);
}

/** Toutes les cartes d'un numéro, dans l'ordre de lecture. */
export function cartesGazette(g, me, i = 0, list = [g]) {
  const pool = [g.une, ...(g.breves || [])].filter((n) => n && n.titre && n.kicker !== 'Calme plat');
  const enq = pool.filter((n) => ENQUETE.has(n.kicker));
  const articles = regrouper(pool.filter((n) => !ENQUETE.has(n.kicker)));
  const avecEnq = !!g.enquete || enq.length > 0;
  // La une peut être un fait d'enquête : il ouvre alors le journal et n'est pas répété dans la carte Enquête.
  const enqArts = regrouper(enq);
  let une = choisirUne([...articles, ...enqArts], me);
  if (!une) une = { kicker: (g.une && g.une.kicker) || 'Calme plat', titre: (g.une && g.une.titre) || 'Nuit tranquille sur le District Delta', prio: 0, faits: [g.une || { titre: 'Nuit tranquille sur le District Delta', texte: 'Aucun fait marquant à signaler.' }] };
  const cites = [...pool, ...(g.honneur || []), ...(g.betisier || [])].filter((n) => toucheMoi(n, me));
  const c = [];
  if (g.finSaison) c.push(carteFinSaison(g));
  c.push(carteUne(g, une));
  if (me) c.push(carteToi(g, me, i, cites));
  const enqReste = enq.filter((n) => !une.faits.includes(n));
  if (avecEnq && (g.enquete || enqReste.length)) c.push(carteEnquete(g, enqReste));
  const reste = articles.filter((a) => a !== une);
  if (reste.length) c.push(carteDistrict(g, reste));
  if ((g.tribunal || []).length) c.push(carteTribunal(g));
  if ((g.honneur || []).length || (g.betisier || []).length) c.push(carteServices(g, me));
  if ((g.echos || []).length) c.push(carteAnnonces(g));
  c.push(carteSommaire(g, c, i, list));
  return c;
}

/** L'écran : une carte visible à la fois ; toucher à droite avance, à gauche recule. */
export function renderGazetteStories() {
  const list = S.gazettes;
  const me = myZone();
  const i = Math.min(S.gazetteIndex, list.length - 1);
  const g = list[i];
  const cartes = cartesGazette(g, me, i, list);
  const cle = `${g.season}_${g.turn}`;
  if (S.gzsCle !== cle) { S.gzsCle = cle; S.gzsCarte = 0; }
  const k = Math.min(S.gzsCarte || 0, cartes.length - 1);
  return `<main class="screen gzs" data-gzs>
    <div class="gzs-haut">
      <a href="#hp" class="iconbtn" aria-label="Retour à l’HP">${icon('back', 20)}</a>
      <div class="gzs-barres" role="tablist" aria-label="Cartes de la Gazette">${cartes.map((c, n) => `<button type="button" role="tab" aria-selected="${n === k}" aria-label="${esc(c.titre)}" data-gzs-aller="${n}" class="${n <= k ? 'vu' : ''}"><i></i></button>`).join('')}</div>
      <span class="tiny mono gzs-num">n° ${g.turn}${i ? ` · ${esc(formatDateBe(g.date || Date.now()).split(' ').slice(1, 3).join(' '))}` : ''}</span>
    </div>
    <div class="gzs-pile" data-gzs-pile data-k="${k}" aria-live="polite">${cartes.map((c, n) => c.html.replace('class="gzs-carte', `class="gzs-carte${n === k ? ' on' : ''}`)).join('')}</div>
    <div class="gzs-bas"><button type="button" class="gzs-fl" data-gzs-d="-1" aria-label="Carte précédente" ${k === 0 ? 'disabled' : ''}>${icon('back', 18)}</button>
      <span class="tiny muted" data-gzs-aide>${k === 0 ? 'Touche à droite pour avancer, à gauche pour revenir' : `${k + 1} / ${cartes.length}`}</span>
      <button type="button" class="gzs-fl" data-gzs-d="1" aria-label="Carte suivante" ${k >= cartes.length - 1 ? 'disabled' : ''}>${icon('chevron', 18)}</button></div>
  </main>${tabbar('hp')}`;
}

// ——— Navigation (sans recalculer l'écran) ———
function aller(main, k) {
  const pile = main.querySelector('[data-gzs-pile]');
  const cartes = [...pile.querySelectorAll('.gzs-carte')];
  k = Math.max(0, Math.min(cartes.length - 1, k));
  const avant = Number(pile.dataset.k) || 0;
  if (k === avant) return;
  cartes.forEach((c, n) => { c.classList.toggle('on', n === k); c.classList.toggle('arr', n === k && k < avant); });
  cartes[k].scrollTop = 0;
  pile.dataset.k = k; S.gzsCarte = k;
  main.querySelectorAll('[data-gzs-aller]').forEach((b) => { if (b.closest('.gzs-barres')) { const n = Number(b.dataset.gzsAller); b.classList.toggle('vu', n <= k); b.setAttribute('aria-selected', String(n === k)); } });
  main.querySelector('[data-gzs-d="-1"]').disabled = k === 0;
  main.querySelector('[data-gzs-d="1"]').disabled = k >= cartes.length - 1;
  const aide = main.querySelector('[data-gzs-aide]');
  if (aide) aide.textContent = `${k + 1} / ${cartes.length}`;
}
const courant = (main) => Number(main.querySelector('[data-gzs-pile]').dataset.k) || 0;

let installe = false;
export function installerGazetteStories() {
  if (installe) return;
  installe = true;
  document.addEventListener('click', (e) => {
    const main = e.target.closest('[data-gzs]');
    if (!main) return;
    const a = e.target.closest('[data-gzs-aller]');
    if (a) { aller(main, Number(a.dataset.gzsAller)); return; }
    const d = e.target.closest('[data-gzs-d]');
    if (d) { aller(main, courant(main) + Number(d.dataset.gzsD)); return; }
    // Toucher la carte elle-même (pas un bouton, un lien ou un repli) : à gauche on recule, ailleurs on avance.
    const c = e.target.closest('.gzs-carte');
    if (!c || e.target.closest('a, button, details, summary, input, [data-action]')) return;
    const r = c.getBoundingClientRect();
    aller(main, courant(main) + (e.clientX - r.left < r.width * 0.3 ? -1 : 1));
  });
  let x0 = null, y0 = null;
  document.addEventListener('touchstart', (e) => { if (e.target.closest('.gzs-pile')) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } else x0 = null; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    const main = e.target.closest('[data-gzs]');
    if (main && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); aller(main, courant(main) + (dx < 0 ? 1 : -1)); }
  });
  document.addEventListener('keydown', (e) => {
    const main = document.querySelector('[data-gzs]');
    if (!main || e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') aller(main, courant(main) + 1);
    else if (e.key === 'ArrowLeft') aller(main, courant(main) - 1);
  });
}
