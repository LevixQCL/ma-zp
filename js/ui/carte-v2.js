// Carte de la saison 2 : Carte et Terrain réunis, en trois calques (Ma zone, District, Non-droit).
// La carte en grand, d'un bord à l'autre ; en dessous, ce qu'on peut faire sur le calque choisi, une ligne par sujet.
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { planPlateau } from './plan-plateau.js';
import { siteDe } from '../engine/sites.js';
import { quartiersHtml, vitrineHtml, siteHtml } from './carte.js';
import { ongletsCarte } from './pactes.js';
import { terrainBlocs, terrainAFaire } from './terrain.js';
import { nonDroitHtml, secteursEnDanger } from './nondroit.js';
import { operationActive } from '../engine/zone.js';
import { tensionsDe } from '../engine/quartiers.js';

export const CALQUES = [['mazone', 'Ma zone'], ['district', 'District'], ['nondroit', 'Non-droit']];

/** Calque ouvert en arrivant par l'ancien lien « Terrain » : le district s'il y a une demande, sinon le non-droit. */
export function calqueTerrain() {
  const { chezMoi, voisins, district } = terrainBlocs();
  return chezMoi.length || voisins.length || district.length ? 'district' : 'nondroit';
}

/** Petits compteurs sur les boutons de calque : ce qui attend une action. */
function badges(st, me) {
  const pc = me.pointChaud && (S.draft && ((S.draft.patrouilles || {})[me.pointChaud.cell] || 0) < 2) ? 1 : 0;
  const nd = st.nonDroit ? Object.values(st.nonDroit.secteurs) : [];
  return {
    mazone: pc,
    district: Math.max(0, terrainAFaire() - secteursEnDanger().length),
    nondroit: secteursEnDanger().length,
    ndTxt: nd.length ? `${nd.filter((x) => x.statut === 'repris').length}/${nd.length}` : '',
  };
}

/** Légende repliée : seulement ce qui est à l'écran sur ce calque. */
function legende(st, me, calque) {
  const items = [];
  if (calque === 'mazone') {
    items.push(...['calme', 'à surveiller', 'tendu', 'chaud'].map((l, k) => `<span><i style="background:${['#4FBF8A', '#E2C04A', '#E8913A', '#E0625A'][k]}"></i>${l}</span>`));
    items.push('<span><i style="background:#63B0FF"></i>patrouille</span>', '<span><i class="pointille"></i>chez le voisin</span>');
  }
  items.push('<span><i class="hach"></i>non-droit</span>', '<span><i style="background:#FFB23F;border-radius:2px;height:3px"></i>ta zone</span>');
  if (st.affaires.length) items.push('<span><i style="background:#FFB23F;border-radius:50% 50% 50% 0"></i>affaire disputée</span>');
  if (st.evenement) items.push('<span>☆ événement</span>');
  if (operationActive(me, st.turn)) items.push('<span class="bad">◎ opération</span>');
  return `<details class="cv-leg" data-k="cv-legende" ${S.ouverts && S.ouverts['cv-legende'] ? 'open' : ''}><summary>Légende</summary><div class="cv-leg-l">${items.join('')}</div></details>`;
}

/** Une ligne de « Ce soir dans le district », dépliable, sur le modèle de l'HP. */
function ligne(k, ico, titre, sous, corps, { cls = '', ouvert = false, badge = '' } = {}) {
  const o = S.ouverts && S.ouverts[k] !== undefined ? S.ouverts[k] : ouvert;
  return `<details class="ajd ${cls}" data-k="${k}" ${o ? 'open' : ''}><summary><span class="ajd-ico" aria-hidden="true">${ico}</span>
    <span class="ajd-txt"><b>${titre}</b>${sous ? `<span>${sous}</span>` : ''}</span>${badge}<span class="ajd-chev" aria-hidden="true">${icon('chevron', 16)}</span></summary>
    <div class="ajd-corps">${corps}</div></details>`;
}

/** Calque « District » : renforts, affaires disputées, grand événement, puis les commissariats de toutes les zones. */
function districtHtml(st, me) {
  const T = st.turn;
  const { chezMoi, voisins, district } = terrainBlocs();
  const L = [];
  // Les blocs du Terrain gardent leurs commandes (prêter des agents, postuler, engager) : on les range en lignes.
  const titreDe = (h) => { const m = h.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || h.match(/class="kicker"[^>]*>([\s\S]*?)<\/span>/); return m ? m[1].replace(/<[^>]*>/g, '') : 'À voir'; };
  const sousDe = (h) => { const m = h.match(/<p class="small[^"]*"[^>]*>([\s\S]*?)<\/p>/); return m ? m[1].replace(/<[^>]*>/g, '').slice(0, 90) : ''; };
  chezMoi.forEach((h, i) => L.push(ligne(`cv-moi-${T}-${i}`, '📍', 'Chez toi : ' + titreDe(h), 'affaire disputée · tu diriges', h, { ouvert: true, badge: '<span class="ajd-badge">!</span>' })));
  voisins.forEach((h, i) => {
    if (/^<(a|div) class="list-row/.test(h)) { L.push(h.replace('class="list-row"', 'class="ajd-alerte"').replace('class="list-row" href', 'class="ajd-alerte red" href')); return; }
    const renfort = /renfort/i.test(h);
    L.push(ligne(`cv-vois-${T}-${i}`, renfort ? '🚨' : '🤝', titreDe(h), sousDe(h), h, { cls: renfort ? 'rouge' : '', ouvert: renfort, badge: renfort ? '<span class="ajd-badge">!</span>' : '' }));
  });
  district.forEach((h, i) => L.push(ligne(`cv-dist-${T}-${i}`, '⭐', titreDe(h), st.evenement && st.evenement.tour === T ? 'ce soir : envoie des agents' : `dans ${st.evenement ? st.evenement.tour - T : '?'} tours`, h, { ouvert: !!(st.evenement && st.evenement.tour === T) })));
  return `<section class="hp-ajd" aria-label="Ce soir dans le district">
      <h2 class="section">Ce soir dans le district</h2>
      ${L.length ? L.join('') : '<p class="small muted" style="margin:0">Aucune demande d’aide pour l’instant. Les appels à renfort, les affaires disputées et les grands événements arrivent ici.</p>'}
    </section>
    <section class="col" aria-label="Les zones du district" style="gap:8px"><div class="between"><h2 class="section" style="margin:0">Les commissariats</h2><span class="tiny muted">touche pour visiter</span></div>
      ${vitrineHtml(st, me)}</section>`;
}

export function renderCarteV2(calque = S.carteCalque || 'mazone') {
  const st = S.state, me = myZone();
  if (!CALQUES.some(([k]) => k === calque)) calque = 'mazone';
  const n = Object.keys(st.zones).length;
  const b = badges(st, me);
  const boutons = CALQUES.map(([k, l]) => `<button type="button" role="tab" data-action="carte-calque" data-v="${k}" aria-selected="${calque === k}">
    <span>${l}</span>${k === 'nondroit' && b.ndTxt ? `<small>${b.ndTxt}</small>` : ''}${b[k] ? `<i class="cv-badge" aria-label="${b[k]} à faire">${b[k]}</i>` : ''}</button>`).join('');
  const carte = calque === 'nondroit' ? '' : `<div class="cv-carte">${planPlateau(st, me, { zoom: calque === 'mazone' })}${legende(st, me, calque)}</div>`;
  const mesT = tensionsDe(st, me), nbChauds = Object.values(mesT).filter((t) => t >= 60).length;
  const sousTitre = calque === 'mazone' ? `${Object.keys(mesT).length} quartiers${nbChauds ? ` · <span class="bad">${nbChauds} chaud${nbChauds > 1 ? 's' : ''}</span>` : ''}` : calque === 'district' ? `${n} zones · tour ${st.turn}` : 'à reprendre ensemble';
  let corps = '';
  if (calque === 'mazone') corps = `${quartiersHtml(st, me)}${siteHtml(siteDe(me))}`;
  else if (calque === 'district') corps = districtHtml(st, me);
  else corps = nonDroitHtml() || '<p class="small muted">La zone de non-droit n’est pas encore ouverte dans cette partie.</p>';
  return `<main class="screen carte-v3">
    ${ongletsCarte('carte')}
    <header class="cv-tete"><h1 class="big">${calque === 'mazone' ? esc(me.nom) : calque === 'district' ? 'District Delta' : 'Non-droit'}</h1><span class="small muted">${sousTitre}</span></header>
    <div class="cv-calques" role="tablist" aria-label="Calques de la carte">${boutons}</div>
    ${carte}
    <div class="cv-corps">${corps}</div>
  </main>${tabbar('carte')}`;
}

export { zoneName };
