// Carte de la saison 2 : Carte, Terrain, Non-droit et Pactes réunis sous deux boutons seulement (Ma zone, District).
// La maquette isométrique en grand ; en dessous, la fiche du quartier touché (Ma zone) ou une ligne par sujet (District).
import { S, esc, icon, tabbar, myZone, zoneName, aFaireCentralTab } from './common.js';
import { planIso, brancherAnnoncesND, brancherMarqueursQ } from './plan-iso.js';

import { aFairePactes } from './pactes.js';
import { terrainBlocs, terrainAFaire } from './terrain.js';
import { nonDroitHtml, secteursEnDanger, annoncesND, agentsND } from './nondroit.js';
import { ND } from '../engine/constants.js';
import { marqueursQ } from './quartier.js';
import { centralHtml } from './central.js';
import { quartierChoisi, resumePatrouilles } from './carte.js';

brancherAnnoncesND(annoncesND);
brancherMarqueursQ(marqueursQ);
import { tensionsDe } from '../engine/quartiers.js';

// Ma zone d'abord : c'est le central en temps réel, ce qui bouge pendant la journée. Le non-droit et le district ensuite.
// « district » (anciens liens) mène au même écran que « nondroit ». Calque par défaut à chaque ouverture du jeu : Ma zone
// (le choix du joueur est gardé pendant la session dans S.carteCalque, pas au-delà).
export const CALQUES = [['mazone', 'Ma zone'], ['nondroit', 'Non-droit']];
export const CALQUE_DEFAUT = 'mazone';

/** Cadrage de la carte au calque Non-droit, retenu par appareil : « nondroit » (zoom) ou « district » (tout). */
let vueND = null;
export function vueCarteND() {
  if (vueND === null) { try { vueND = localStorage.getItem('mazp-carte-vue') === 'district' ? 'district' : 'nondroit'; } catch (e) { vueND = 'nondroit'; } }
  return vueND;
}
export function basculerVueCarteND() {
  vueND = vueCarteND() === 'district' ? 'nondroit' : 'district';
  try { localStorage.setItem('mazp-carte-vue', vueND); } catch (e) { /* stockage indisponible : on garde le choix pour la session */ }
}

/** Calque ouvert en arrivant par l'ancien lien « Terrain » : le non-droit et le district. */
export function calqueTerrain() { return 'nondroit'; }

/** Petits compteurs sur les deux boutons : ce qui attend une action. */
function badges() {
  // Le point chaud et les patrouilles du soir se règlent dans les Ordres : leur pastille est là-bas.
  return { mazone: aFaireCentralTab(), nondroit: terrainAFaire() };
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
  district.forEach((h, i) => L.push(ligne(`cv-dist-${T}-${i}`, '⭐', titreDe(h), st.evenement && st.evenement.tour === T ? 'ce soir : envoie des agents' : (st.evenement && st.evenement.tour > T ? `dans ${st.evenement.tour - T} tour${st.evenement.tour - T > 1 ? 's' : ''}` : 'bientôt'), h, { ouvert: !!(st.evenement && st.evenement.tour === T) })));
  // Pactes, défis et Conseil : toujours une ligne (ce qui attend une réponse, sinon les pactes actifs), puis l'accès à l'écran complet.
  const af = aFairePactes(), reste = af.filter((x) => !x.fait);
  const actifs = (st.pactes || []).filter((p) => (p.a === me.uid || p.b === me.uid) && p.etape === 'actif').length;
  if (Object.keys(st.zones).length > 1) L.push(ligne('cv-pactes', '🤝', 'Pactes et Conseil', reste.length ? esc(reste[0].titre) : actifs ? `${actifs} pacte${actifs > 1 ? 's' : ''} actif${actifs > 1 ? 's' : ''}` : 'aucun pacte en cours · propose-en un',
    `${af.map((x) => `<a class="ajd-alerte ${x.fait ? '' : 'amber'}" href="#pactes"><b>${x.fait ? '✓ ' : ''}${esc(x.titre)}</b><span>${esc(x.texte)}</span></a>`).join('')}
     <a class="btn small outline block" href="#pactes">Ouvrir les pactes, défis et le Conseil</a>`, { badge: reste.length ? `<span class="ajd-badge">${reste.length}</span>` : '', ouvert: !!reste.length }));
  return `<section class="hp-ajd" aria-label="Ce soir dans le district">
      <h2 class="section">Aussi dans le district</h2>
      ${L.length ? L.join('') : '<p class="small muted" style="margin:0">Aucune demande d’aide pour l’instant. Les appels à renfort, les affaires disputées et les grands événements arrivent ici.</p>'}
      <a class="btn small outline block" href="#classement">🏆 Classements : district et central</a>
      <p class="tiny muted" style="margin:0">Touche la zone d’un collègue sur la carte pour voir son hôtel de police.</p>
      <div class="sr-only">${Object.values(st.zones).filter((z) => z.uid !== me.uid).map((z) => `<button type="button" data-action="voir-hp" data-uid="${esc(z.uid)}">Hôtel de police de ${esc(z.nom)}</button>`).join('')}</div>
    </section>`;
}

/** Sous le central : les deux choses qui se règlent ailleurs (patrouilles du soir dans les Ordres, classements). */
function liensMaZone(st, me) {
  const rp = resumePatrouilles(st, me);
  return `<nav class="cv-liens" aria-label="Aussi pour ta zone">
    ${rp ? `<a class="cv-lien ${rp.ok ? '' : 'alerte'}" href="#ordres-patrouilles"><span aria-hidden="true">🚓</span><span class="col" style="gap:0;min-width:0;flex:1"><b>Patrouilles du soir</b><span>${rp.resume} · dans tes Ordres</span></span>${icon('chevron', 16)}</a>` : ''}
    <a class="cv-lien" href="#classement-central"><span aria-hidden="true">🏆</span><span class="col" style="gap:0;min-width:0;flex:1"><b>Classements</b><span>central, IPZ et district</span></span>${icon('chevron', 16)}</a>
  </nav>`;
}

export function renderCarteV2(calque = S.carteCalque || CALQUE_DEFAUT) {
  const st = S.state, me = myZone();
  if (calque === 'district') calque = 'nondroit';
  if (!CALQUES.some(([k]) => k === calque)) calque = CALQUE_DEFAUT;
  const b = badges();
  const nd = st.nonDroit ? Object.values(st.nonDroit.secteurs) : [];
  const nomCalque = (k, l) => (k === 'nondroit' && !nd.length ? 'District' : l);
  const boutons = CALQUES.map(([k, l]) => `<button type="button" role="tab" data-action="carte-calque" data-v="${k}" aria-selected="${calque === k}">
    <span>${nomCalque(k, l)}</span>${b[k] ? `<i class="cv-badge" aria-label="${b[k]} à faire">${b[k]}</i>` : ''}</button>`).join('');
  const sel = calque === 'mazone' ? quartierChoisi(st, me) : (S.secteurSel ?? null);
  const mesT = tensionsDe(st, me), nbChauds = Object.values(mesT).filter((t) => t >= 60).length;
  const danger = secteursEnDanger().length;
  const sousTitre = calque === 'mazone' ? `${Object.keys(mesT).length} quartiers${nbChauds ? ` · <span class="bad">${nbChauds} chaud${nbChauds > 1 ? 's' : ''}</span>` : ''}`
    : nd.length ? `${nd.filter((x) => x.statut === 'repris').length}/${nd.length} repris · tes agents ${agentsND()}/${ND.maxTotal}${danger ? ` · <span class="bad">${danger} en danger</span>` : ''}` : `${Object.keys(st.zones).length} zones`;
  const astuce = calque === 'mazone' ? 'Touche un quartier' : nd.length ? 'Touche un secteur rouge · ou une zone' : 'Touche une zone';
  // Pactes : un bouton posé sur la carte (visible sans défiler, sans onglet de plus), avec ce qui attend une réponse.
  const aRepondre = aFairePactes().filter((x) => !x.fait).length;
  const nbPactes = (st.pactes || []).filter((p) => (p.a === me.uid || p.b === me.uid) && p.etape === 'actif').length;
  const btnPactes = Object.keys(st.zones).length > 1 ? `<a class="cv-pactes ${aRepondre ? 'alerte' : ''}" href="#pactes" aria-label="Pactes${aRepondre ? ` : ${aRepondre} à répondre` : ''}"><span aria-hidden="true">🤝</span>Pactes${aRepondre ? `<i>${aRepondre}</i>` : nbPactes ? `<small>${nbPactes}</small>` : ''}</a>` : '';
  // Non-droit : cadrage serré sur la zone de non-droit (pour jouer) ou tout le district avec les zones des joueurs (pour regarder).
  const vueDist = calque === 'nondroit' && nd.length && vueCarteND() === 'district';
  const btnVue = calque === 'nondroit' && nd.length ? `<button type="button" class="cv-vue" data-action="carte-vue" aria-pressed="${vueDist}" title="${vueDist ? 'Revenir au zoom sur le non-droit' : 'Voir tout le district et les zones des joueurs'}"><span aria-hidden="true">${vueDist ? '🎯' : '🗺️'}</span>${vueDist ? 'Non-droit' : 'District'}</button>` : '';
  const astuceV = vueDist ? 'Touche une zone · ou un secteur rouge' : astuce;
  // Zoom sur le non-droit : la maquette en grand (recadrée au centre sur téléphone), le tiroir du secteur vient mordre dessus.
  const zoomND = calque === 'nondroit' && nd.length && !vueDist;
  let iso = planIso(st, me, { vue: vueDist ? 'district' : calque, sel });
  if (zoomND) iso = iso.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
  const montrerAstuce = !(zoomND && S.secteurSel);
  const carte = `<div class="cv-carte">${iso}${btnVue}${btnPactes}${montrerAstuce ? `<span class="cv-astuce" aria-hidden="true">${astuceV}</span>` : ''}</div>`;
  const ndCorps = calque === 'nondroit' && !vueDist ? nonDroitHtml({ sansPlan: true }) : '';
  // Le reste du district (renforts, opérations, pactes, classements) vit sous la vue « District » : sous le non-droit, une seule ligne y mène.
  const dist = districtHtml(st, me);
  const aVoir = (dist.match(/class="ajd-badge"/g) || []).length;
  const lienDistrict = `<button type="button" class="cv-lien-dist ${aVoir ? 'alerte' : ''}" data-action="carte-vue"><span aria-hidden="true">🗺️</span><span class="col" style="gap:0;min-width:0;flex:1;text-align:left"><b>Aussi dans le district</b><span>renforts, opérations, pactes, classements</span></span>${aVoir ? `<i>${aVoir}</i>` : ''}<span aria-hidden="true">${icon('chevron', 16)}</span></button>`;
  const corps = calque === 'mazone' ? `${centralHtml({ surCarte: btnPactes })}${liensMaZone(st, me)}`
    : !nd.length ? `<p class="small muted" style="margin:0">La zone de non-droit n’est pas encore ouverte dans cette partie.</p>${dist}`
      : vueDist ? dist : `${ndCorps}${lienDistrict}`;
  return `<main class="screen carte-v3${zoomND ? ' cv-nd' : ''}">
    <header class="cv-tete"><h1 class="big">${calque === 'mazone' ? esc(me.nom) : nd.length ? 'Non-droit' : 'District Delta'}</h1><span class="small muted">${sousTitre}</span></header>
    <div class="cv-calques deux" role="tablist" aria-label="Vue de la carte">${boutons}</div>
    ${calque === 'mazone' ? '' : carte}
    <div class="cv-corps">${corps}</div>
  </main>${tabbar('carte')}`;
}

export { zoneName };
