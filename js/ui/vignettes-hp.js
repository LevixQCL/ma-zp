// Petites illustrations des tuiles de l'HP (Salle des ventes, Mon équipe, Mes trophées),
// dans le même esprit que le commissariat dessiné au-dessus : à plat, nuit bleutée, touches ambre.

const cadre = (contenu, label) => `<svg class="vign-svg" viewBox="0 0 96 56" role="img" aria-label="${label}">
  <defs><linearGradient id="vg-fond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2A4D"/><stop offset="1" stop-color="#141B33"/></linearGradient></defs>
  <rect x="0" y="0" width="96" height="56" rx="10" fill="url(#vg-fond)"/>
  ${contenu}
</svg>`;

/** Salle des ventes : marteau qui frappe le socle, étiquette du lot. */
export function vignetteVentes(actif = false) {
  return cadre(`
  <rect x="10" y="40" width="76" height="6" rx="2" fill="#2C3A63"/>
  <rect x="22" y="33" width="30" height="8" rx="2" fill="#6B4A2E"/><rect x="22" y="33" width="30" height="3" rx="1.5" fill="#8A6140"/>
  <g transform="rotate(-28 50 22)">
    <rect x="44" y="9" width="24" height="11" rx="3" fill="#9B6B43"/><rect x="44" y="9" width="5" height="11" rx="1.5" fill="#C9A24A"/><rect x="63" y="9" width="5" height="11" rx="1.5" fill="#C9A24A"/>
    <rect x="54" y="19" width="4" height="22" rx="2" fill="#7A5434"/>
  </g>
  <path d="M30 28 l-4 -4 M36 26 l0 -6 M42 28 l4 -4" stroke="#FFB23F" stroke-width="2" stroke-linecap="round" opacity=".9"/>
  <g transform="translate(64 26)"><path d="M0 0 h18 v14 h-18 l-5 -7 z" fill="${actif ? '#FFB23F' : '#C9CFE6'}"/><circle cx="-1" cy="7" r="1.6" fill="#141B33"/>
    <text x="9" y="10.5" text-anchor="middle" font-size="8" font-weight="800" font-family="system-ui" fill="#141B33">€</text></g>`, 'Salle des ventes');
}

/** Mon équipe : trois silhouettes d'agents en casquette, celui du milieu en vedette. */
export function vignetteEquipe(couleur = '#5AA0F0') {
  const agent = (x, s, c, vedette) => `<g transform="translate(${x} ${56 - 44 * s}) scale(${s})">
    <path d="M-13 44 q0 -18 13 -18 q13 0 13 18 z" fill="${c}"/>
    <rect x="-3" y="27" width="6" height="7" fill="#E9EDF7" opacity=".9"/>
    <circle cx="0" cy="17" r="8" fill="#E8B48E"/>
    <path d="M-9 13 q9 -9 18 0 v2 h-18 z" fill="#1A2342"/><rect x="-10.5" y="14" width="21" height="3" rx="1.5" fill="#1A2342"/>
    <circle cx="0" cy="10.5" r="1.6" fill="#FFB23F"/>
    ${vedette ? '<path d="M7 30 l2 4 4 .5 -3 2.8 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -2.8 4 -.5 z" fill="#FFB23F"/>' : ''}
  </g>`;
  return cadre(`
  <rect x="0" y="44" width="96" height="12" fill="#18213F"/>
  ${agent(26, 0.82, '#2E4A86', false)}${agent(70, 0.82, '#2E4A86', false)}${agent(48, 1, couleur, true)}`, 'Mon équipe');
}

/** Mes trophées : étagère avec coupe, médaille et affiche « ARRÊTÉ ». */
export function vignetteTrophees(nb = 0) {
  const on = nb > 0;
  return cadre(`
  <rect x="8" y="42" width="80" height="4" rx="2" fill="#6B4A2E"/><rect x="8" y="46" width="80" height="2" fill="#4A321F"/>
  <g transform="translate(26 14)" opacity="${on ? 1 : 0.45}">
    <path d="M-10 0 h20 v6 q0 12 -10 13 q-10 -1 -10 -13 z" fill="#FFB23F"/>
    <path d="M-10 3 q-6 0 -5 6 q1 4 6 4 M10 3 q6 0 5 6 q-1 4 -6 4" fill="none" stroke="#FFB23F" stroke-width="2"/>
    <rect x="-2" y="19" width="4" height="5" fill="#D99422"/><rect x="-7" y="24" width="14" height="4" rx="1" fill="#D99422"/>
    <path d="M-6 3 q0 8 3 11" stroke="#FFE2A8" stroke-width="1.6" fill="none" opacity=".7"/>
  </g>
  <g transform="translate(50 22)"><path d="M-4 -8 l4 8 4 -8" stroke="#E0625A" stroke-width="3" fill="none"/><circle cx="0" cy="6" r="7" fill="${on ? '#C9CFE6' : '#56607F'}"/><circle cx="0" cy="6" r="4" fill="none" stroke="#141B33" stroke-width="1"/></g>
  <g transform="translate(64 10)">
    <rect x="0" y="0" width="22" height="31" rx="1.5" fill="#EFE3C4"/>
    <rect x="2" y="2.5" width="18" height="5" fill="#B5342C"/><text x="11" y="6.6" text-anchor="middle" font-size="4.6" font-weight="900" font-family="system-ui" fill="#EFE3C4">ARRÊTÉ</text>
    <circle cx="11" cy="15" r="4" fill="#8C7B62"/><path d="M4 26 q7 -9 14 0 z" fill="#8C7B62"/>
    <rect x="3" y="27.5" width="16" height="1.6" fill="#8C7B62" opacity=".6"/>
  </g>`, 'Mes trophées');
}
