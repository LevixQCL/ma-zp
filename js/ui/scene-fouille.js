// Scène à fouiller (affaire de Mons) : la photo de l'arrière-boutique en grand, avec des plots numérotés à toucher.
// Chaque plot décrit ce que l'on voit, sans dire ce qu'il faut en penser : à chacun de faire le lien.
import { S, esc } from './common.js';
import { POINTS_SCENE_RAMPE, sceneRampeSvg } from './rampe-visuels.js';

export const POINTS_SCENE = [
  { k: 'tasses', n: 1, x: 300, y: 262, titre: 'Deux tasses à expresso', texte: 'Sur le bureau, une tasse sale. Sur l’égouttoir, près du petit évier, une seconde tasse rincée, posée à l’envers. Une goutte d’eau perle encore sous l’anse.' },
  { k: 'agenda', n: 2, x: 352, y: 236, titre: 'L’agenda', texte: 'Ouvert à la page de mardi. Écriture de la victime, à l’encre bleue. La page de lundi est en face.' },
  { k: 'socle', n: 3, x: 118, y: 196, titre: 'Le socle vide', texte: 'Sur la console, un socle en marbre vert, vide. Dans la poussière, la trace nette d’une base carrée d’une dizaine de centimètres. Sur le cartel : « Saint Georges terrassant le dragon, bronze, XIXe ».' },
  { k: 'parapluie', n: 4, x: 556, y: 300, titre: 'Le porte-parapluie', texte: 'Dans l’entrée, un grand parapluie noir, encore mouillé : une petite flaque s’est formée dessous. Sur la toile, le logo du Salon des antiquaires de Namur.' },
  { k: 'manteau', n: 5, x: 470, y: 150, titre: 'Le portemanteau', texte: 'Le manteau de la victime et sa casquette : parfaitement secs. Dans la poche, son portefeuille et ses clés.' },
  { k: 'porte', n: 6, x: 600, y: 200, titre: 'La porte vitrée', texte: 'Entrouverte, sans trace d’effraction. La serrure n’a pas été forcée. La poignée intérieure ne porte aucune empreinte, pas même celles de la victime.' },
  { k: 'reserve', n: 7, x: 196, y: 120, titre: 'L’étagère de la réserve', texte: 'Six objets alignés à part, chacun avec une étiquette manuscrite : « Ne pas vendre — H.D. ». Une enveloppe kraft vide est posée à côté.' },
  { k: 'ordi', n: 8, x: 252, y: 226, titre: 'L’ordinateur portable', texte: 'Allumé, en veille. Le labo le saisit pour l’analyser.' },
  { k: 'fenetre', n: 9, x: 404, y: 84, titre: 'La fenêtre sur cour', texte: 'Fermée. Dehors, la cour pavée est encore trempée. Aucune trace sous la fenêtre.' },
  { k: 'sol', n: 10, x: 330, y: 330, titre: 'Derrière le bureau', texte: 'L’endroit où la victime a été retrouvée. Le sol est propre autour : pas de traces de pas mouillées vers l’arrière-boutique, seulement vers la porte.' },
];

function decorScene(id) {
  return `<defs>
      <linearGradient id="${id}mur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E7A62"/><stop offset="1" stop-color="#6E5C47"/></linearGradient>
      <linearGradient id="${id}sol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4632"/><stop offset="1" stop-color="#3A2C1E"/></linearGradient>
      <linearGradient id="${id}bois" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A4E2C"/><stop offset="1" stop-color="#4E2F18"/></linearGradient>
      <radialGradient id="${id}flash" cx="45%" cy="45%" r="70%"><stop offset="0" stop-color="#FFF6E0" stop-opacity=".22"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
      <filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .5 0"/></filter>
      <filter id="${id}b"><feGaussianBlur stdDeviation="2"/></filter>
      <pattern id="${id}parq" width="40" height="14" patternUnits="userSpaceOnUse"><rect width="40" height="14" fill="#4E3B28"/><path d="M0 13.5H40M20 0V14" stroke="#3A2B1C" stroke-width="1"/></pattern>
    </defs>
    <rect width="680" height="380" fill="url(#${id}mur)"/>
    <path d="M0 250H680V380H0Z" fill="url(#${id}parq)"/><rect y="250" width="680" height="130" fill="url(#${id}sol)" opacity=".55"/>
    <path d="M0 250H680" stroke="#2E2216" stroke-width="3"/>
    <!-- fenêtre sur cour -->
    <rect x="360" y="40" width="90" height="90" fill="#2C3A44" stroke="#3E2A18" stroke-width="6"/><path d="M405 40V130M360 85H450" stroke="#3E2A18" stroke-width="4"/>
    ${Array.from({ length: 16 }, (_, k) => `<path d="M${366 + (k * 23) % 80} ${46 + (k * 31) % 76}l-2 8" stroke="#A8C0D0" stroke-width="1" opacity=".6"/>`).join('')}
    <!-- étagère de la réserve -->
    <rect x="140" y="70" width="120" height="8" fill="url(#${id}bois)"/><rect x="140" y="130" width="120" height="8" fill="url(#${id}bois)"/>
    ${[0, 1, 2, 3, 4, 5].map((k) => `<g transform="translate(${150 + k * 18} 112)"><rect x="-6" y="-14" width="12" height="18" rx="2" fill="${['#B08A4A', '#7A8C9A', '#9A5A3A', '#C9B07A', '#6E7A5A', '#A07050'][k]}"/><rect x="-5" y="4" width="10" height="5" fill="#F4EFE0"/></g>`).join('')}
    <rect x="236" y="116" width="20" height="14" fill="#C9A878" transform="rotate(-6 246 123)"/>
    <!-- console et socle vide -->
    <rect x="70" y="200" width="110" height="10" fill="url(#${id}bois)"/><path d="M78 210v40M172 210v40" stroke="#4E2F18" stroke-width="5"/>
    <rect x="102" y="176" width="34" height="24" fill="#3E6A50"/><rect x="102" y="176" width="34" height="4" fill="#5E8A70"/>
    <rect x="110" y="172" width="18" height="4" fill="none" stroke="#B9A98A" stroke-width="1" stroke-dasharray="2 1"/>
    <rect x="92" y="190" width="18" height="8" fill="#E8E0C8"/>
    <!-- portemanteau -->
    <path d="M470 120V250M456 250h28" stroke="#3E2A18" stroke-width="5"/><path d="M458 128l12 -6 12 6" stroke="#3E2A18" stroke-width="3" fill="none"/>
    <path d="M458 132q-12 30 -8 80h40q4 -50 -8 -80q-12 6 -24 0z" fill="#6A5A48"/><ellipse cx="482" cy="126" rx="14" ry="5" fill="#4A3E30"/>
    <!-- bureau -->
    <path d="M200 240H420V256H200Z" fill="url(#${id}bois)"/><path d="M210 256V330M410 256V330" stroke="#3E2414" stroke-width="10"/>
    <rect x="232" y="214" width="44" height="26" rx="2" fill="#2A2E33"/><rect x="236" y="218" width="36" height="18" fill="#3E5A72" opacity=".8"/><path d="M226 240h56" stroke="#1A1D21" stroke-width="3"/>
    <g transform="translate(340 232)"><rect x="-4" y="-6" width="44" height="12" fill="#F4ECD6" transform="rotate(-4)"/><path d="M18 -6v12" stroke="#C8B98F" transform="rotate(-4)"/></g>
    <g transform="translate(298 236)"><path d="M-7 -8h14l-2 10h-10z" fill="#F4F2EE"/><path d="M7 -5q5 0 5 4t-5 3" stroke="#F4F2EE" stroke-width="1.6" fill="none"/><ellipse cx="0" cy="3" rx="11" ry="2.4" fill="#E9E6DF"/></g>
    <!-- petit évier et égouttoir -->
    <rect x="270" y="270" width="60" height="6" fill="#9AA0A4"/><g stroke="#C7CCD0" stroke-width="1.5">${[0, 1, 2, 3, 4].map((k) => `<path d="M${276 + k * 11} 270v-8"/>`).join('')}</g>
    <g transform="translate(304 260)"><path d="M-6 10h12l-2 -12h-8z" fill="#F4F2EE"/></g>
    <!-- entrée : porte vitrée et porte-parapluie -->
    <rect x="580" y="60" width="80" height="190" fill="#3A2A1A"/><rect x="590" y="70" width="60" height="170" fill="#4E6878" opacity=".7"/><rect x="560" y="60" width="20" height="190" fill="#2A1C10" transform="skewY(4)"/>
    <circle cx="588" cy="160" r="4" fill="#C9A85A"/>
    <rect x="540" y="250" width="30" height="40" rx="3" fill="#5E5650"/><path d="M552 250L560 170" stroke="#151515" stroke-width="5"/><path d="M546 196q14 -30 28 0z" fill="#151515" transform="rotate(8 560 190)"/>
    <ellipse cx="556" cy="296" rx="26" ry="5" fill="#8EA6B4" opacity=".55"/>
    <!-- contour au sol, derrière le bureau -->
    <path d="M300 320q20 -14 54 -6q22 6 34 20q-30 14 -62 10q-22 -2 -26 -24z" fill="none" stroke="#F2E8C8" stroke-width="2.4" stroke-dasharray="6 4" opacity=".75"/>
    <rect width="680" height="380" fill="url(#${id}flash)"/>
    <rect width="680" height="380" filter="url(#${id}n)" opacity=".16" style="mix-blend-mode:multiply"/>`;
}

/** La scène en grand, avec ses plots (overlay plein écran, comme le journal). */
export function sceneFouilleHtml(aff) {
  if (!aff || !aff.meurtre || S.sceneOuverte !== aff.n) return '';
  const rampe = aff.cas === 'rampe';
  const PTS = rampe ? POINTS_SCENE_RAMPE : POINTS_SCENE;
  const sel = PTS.find((p) => p.k === S.scenePt) || null;
  const vus = new Set(S.scenePtsVus || []);
  return `<div class="jr-wrap sf-wrap" role="dialog" aria-modal="true" aria-label="La scène">
    <article class="sf">
      <div class="between" style="gap:10px"><div class="col" style="gap:2px"><span class="kicker" style="color:var(--amber)">${rampe ? 'Photo du labo · rez-de-chaussée · vendredi 10:10' : 'Photo du labo · arrière-boutique · mercredi 00:30'}</span><h2 class="sf-titre">${rampe ? 'La scène, Rampe Sainte-Waudru' : 'La scène, rue de la Clef'}</h2></div>
        <button type="button" class="tb-fermer" style="position:static" data-action="scene-fermer" aria-label="Fermer">✕</button></div>
      <div class="sf-photo">${rampe ? sceneRampeSvg(sel, vus, esc) : `<svg viewBox="0 0 680 380" aria-hidden="false" role="img" aria-label="Arrière-boutique, avec dix plots numérotés">${decorScene('sf')}
        ${POINTS_SCENE.map((p) => `<g class="sf-plot ${sel && sel.k === p.k ? 'on' : ''} ${vus.has(p.k) ? 'vu' : ''}" data-action="scene-pt" data-k="${p.k}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="Plot ${p.n} : ${esc(p.titre)}">
          <circle r="22" fill="transparent"/><path d="M-11 0L0 -20L11 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width="1.2"/><text y="-5" text-anchor="middle" font-family="'Special Elite', monospace" font-size="11" fill="#1D1A15">${p.n}</text></g>`).join('')}
      </svg>`}</div>
      <div class="sf-detail">${sel ? `<span class="tb-ligne-k" style="color:var(--amber)">Plot ${sel.n}</span><strong>${esc(sel.titre)}</strong><p>${esc(sel.texte)}</p>` : '<p class="muted">Touche un plot jaune pour voir ce que le labo a relevé. Tout est sous tes yeux ; rien n’est souligné.</p>'}</div>
      <p class="tiny muted" style="margin:0">${vus.size} plot${vus.size > 1 ? 's' : ''} examiné${vus.size > 1 ? 's' : ''} sur ${PTS.length} · ce que montre la photo est connu de toutes les zones.</p>
    </article>
  </div>`;
}
