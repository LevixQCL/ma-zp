// Carte de la saison 2 : Carte, Terrain, Non-droit et Pactes réunis sous deux boutons seulement (Ma zone, District).
// La maquette isométrique en grand ; en dessous, la fiche du quartier touché (Ma zone) ou une ligne par sujet (District).
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { planIso, brancherAnnoncesND } from './plan-iso.js';
import { siteDe } from '../engine/sites.js';
import { siteHtml, ficheQuartierHtml, chipsQuartiersHtml } from './carte.js';
import { aFairePactes } from './pactes.js';
import { terrainBlocs, terrainAFaire } from './terrain.js';
import { nonDroitHtml, secteursEnDanger, annoncesND } from './nondroit.js';

brancherAnnoncesND(annoncesND);
import { tensionsDe } from '../engine/quartiers.js';

// Le non-droit d'abord (c'est l'objectif commun de la ville, on doit le trouver sans chercher), Ma zone ensuite.
// « district » (anciens liens) mène au même écran que « nondroit ».
export const CALQUES = [['nondroit', 'Non-droit'], ['mazone', 'Ma zone']];

/** Calque ouvert en arrivant par l'ancien lien « Terrain » : le non-droit et le district. */
export function calqueTerrain() { return 'nondroit'; }

/** Petits compteurs sur les deux boutons : ce qui attend une action. */
function badges(st, me) {
  const pc = me.pointChaud && (S.draft && ((S.draft.patrouilles || {})[me.pointChaud.cell] || 0) < 2) ? 1 : 0;
  return { mazone: pc, nondroit: terrainAFaire() + aFairePactes().filter((x) => !x.fait).length };
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
  // Pactes, défis et Conseil : ce qui attend une réponse, puis l'accès à l'écran complet.
  const af = aFairePactes(), reste = af.filter((x) => !x.fait);
  const actifs = (st.pactes || []).filter((p) => (p.a === me.uid || p.b === me.uid) && p.etape === 'actif').length;
  L.push(ligne('cv-pactes', '🤝', 'Pactes et Conseil', reste.length ? esc(reste[0].titre) : actifs ? `${actifs} pacte${actifs > 1 ? 's' : ''} actif${actifs > 1 ? 's' : ''}` : 'aucun pacte en cours · propose-en un',
    `${af.map((x) => `<a class="ajd-alerte ${x.fait ? '' : 'amber'}" href="#pactes"><b>${x.fait ? '✓ ' : ''}${esc(x.titre)}</b><span>${esc(x.texte)}</span></a>`).join('')}
     <a class="btn small outline block" href="#pactes">Ouvrir les pactes, défis et le Conseil</a>`, { badge: reste.length ? `<span class="ajd-badge">${reste.length}</span>` : '', ouvert: !!reste.length }));
  return `<section class="hp-ajd" aria-label="Ce soir dans le district">
      <h2 class="section">Aussi dans le district</h2>
      ${L.length ? L.join('') : '<p class="small muted" style="margin:0">Aucune demande d’aide pour l’instant. Les appels à renfort, les affaires disputées et les grands événements arrivent ici.</p>'}
      <p class="tiny muted" style="margin:0">Touche la zone d’un collègue sur la carte pour voir son commissariat.</p>
      <div class="sr-only">${Object.values(st.zones).filter((z) => z.uid !== me.uid).map((z) => `<button type="button" data-action="voir-hp" data-uid="${esc(z.uid)}">Commissariat de ${esc(z.nom)}</button>`).join('')}</div>
    </section>`;
}

/** Quartier montré dans la fiche : celui touché, sinon le point chaud, sinon le plus tendu. */
function quartierChoisi(st, me) {
  const mesT = tensionsDe(st, me);
  if (S.quartierSel != null && String(S.quartierSel) in mesT) return String(S.quartierSel);
  if (me.pointChaud && String(me.pointChaud.cell) in mesT) return String(me.pointChaud.cell);
  return Object.keys(mesT).sort((a, b) => mesT[b] - mesT[a])[0] ?? null;
}

export function renderCarteV2(calque = S.carteCalque || 'nondroit') {
  const st = S.state, me = myZone();
  if (calque === 'district') calque = 'nondroit';
  if (!CALQUES.some(([k]) => k === calque)) calque = 'nondroit';
  const b = badges(st, me);
  const nd = st.nonDroit ? Object.values(st.nonDroit.secteurs) : [];
  const nomCalque = (k, l) => (k === 'nondroit' && !nd.length ? 'District' : l);
  const boutons = CALQUES.map(([k, l]) => `<button type="button" role="tab" data-action="carte-calque" data-v="${k}" aria-selected="${calque === k}">
    <span>${nomCalque(k, l)}</span>${b[k] ? `<i class="cv-badge" aria-label="${b[k]} à faire">${b[k]}</i>` : ''}</button>`).join('');
  const sel = calque === 'mazone' ? quartierChoisi(st, me) : (S.secteurSel ?? null);
  const mesT = tensionsDe(st, me), nbChauds = Object.values(mesT).filter((t) => t >= 60).length;
  const danger = secteursEnDanger().length;
  const sousTitre = calque === 'mazone' ? `${Object.keys(mesT).length} quartiers${nbChauds ? ` · <span class="bad">${nbChauds} chaud${nbChauds > 1 ? 's' : ''}</span>` : ''}`
    : nd.length ? `${nd.filter((x) => x.statut === 'repris').length}/${nd.length} repris${danger ? ` · <span class="bad">${danger} en danger</span>` : ''}` : `${Object.keys(st.zones).length} zones`;
  const astuce = calque === 'mazone' ? 'Touche un quartier' : nd.length ? 'Touche un secteur rouge · ou une zone' : 'Touche une zone';
  const carte = `<div class="cv-carte">${planIso(st, me, { vue: calque, sel })}<span class="cv-astuce" aria-hidden="true">${astuce}</span></div>`;
  const ndCorps = calque === 'nondroit' ? nonDroitHtml({ sansPlan: true }) : '';
  const corps = calque === 'mazone' ? `${ficheQuartierHtml(st, me, sel)}${chipsQuartiersHtml(st, me, sel)}${siteHtml(siteDe(me))}`
    : `${ndCorps || '<p class="small muted" style="margin:0">La zone de non-droit n’est pas encore ouverte dans cette partie.</p>'}${districtHtml(st, me)}`;
  return `<main class="screen carte-v3">
    <header class="cv-tete"><h1 class="big">${calque === 'mazone' ? esc(me.nom) : nd.length ? 'Non-droit' : 'District Delta'}</h1><span class="small muted">${sousTitre}</span></header>
    <div class="cv-calques deux" role="tablist" aria-label="Vue de la carte">${boutons}</div>
    ${carte}
    <div class="cv-corps">${corps}</div>
  </main>${tabbar('carte')}`;
}

export { zoneName };
