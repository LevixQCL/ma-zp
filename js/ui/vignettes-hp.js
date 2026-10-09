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

/** Rapport du tour : bloc-notes à pince, lignes et coches. */
export function vignetteRapport() {
  return cadre(`
  <rect x="30" y="7" width="36" height="44" rx="3" fill="#EFE3C4"/>
  <rect x="40" y="4" width="16" height="7" rx="2" fill="#8A95A3"/><rect x="44" y="2" width="8" height="4" rx="2" fill="#C3CAD3"/>
  <path d="M36 20 l2 2 4 -4 M36 30 l2 2 4 -4" stroke="#1F7A52" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M36 40 l5 5 M41 40 l-5 5" stroke="#B5342C" stroke-width="2" stroke-linecap="round"/>
  <rect x="46" y="19" width="15" height="2.4" rx="1.2" fill="#8C7B62"/><rect x="46" y="29" width="13" height="2.4" rx="1.2" fill="#8C7B62"/><rect x="46" y="41" width="11" height="2.4" rx="1.2" fill="#8C7B62"/>`, 'Rapport du tour');
}

/** La Gazette : journal plié, gros titre et photo. */
export function vignetteGazette() {
  return cadre(`
  <g transform="rotate(-6 48 30)">
    <rect x="20" y="8" width="56" height="40" rx="2" fill="#F4EFE3"/>
    <rect x="25" y="12" width="46" height="6" fill="#1D1A15"/>
    <rect x="25" y="22" width="20" height="16" fill="#8A95A3"/><circle cx="35" cy="28" r="3.5" fill="#5E6B7C"/>
    <rect x="49" y="22" width="22" height="2.2" fill="#5E574A"/><rect x="49" y="27" width="22" height="2.2" fill="#5E574A"/><rect x="49" y="32" width="18" height="2.2" fill="#5E574A"/>
    <rect x="25" y="41" width="46" height="2.2" fill="#CFC5B0"/>
  </g>`, 'La Gazette');
}

/** Classement : podium à trois marches, la zone en tête. */
export function vignetteClassement(couleur = '#5AA0F0') {
  return cadre(`
  <rect x="18" y="32" width="20" height="18" rx="2" fill="#2C3A63"/><text x="28" y="45" text-anchor="middle" font-size="9" font-weight="800" font-family="system-ui" fill="#C9CFE6">2</text>
  <rect x="38" y="22" width="20" height="28" rx="2" fill="${couleur}"/><text x="48" y="35" text-anchor="middle" font-size="10" font-weight="900" font-family="system-ui" fill="#141B33">1</text>
  <rect x="58" y="37" width="20" height="13" rx="2" fill="#2C3A63"/><text x="68" y="47" text-anchor="middle" font-size="8" font-weight="800" font-family="system-ui" fill="#C9CFE6">3</text>
  <path d="M48 6 l2.4 4.9 5.4.8 -3.9 3.8 .9 5.3 -4.8 -2.5 -4.8 2.5 .9 -5.3 -3.9 -3.8 5.4 -.8 z" fill="#FFB23F"/>`, 'Classement');
}

/** Challenge : manette et étoile de record. */
export function vignetteChallenge() {
  return cadre(`
  <path d="M26 22 q0 -6 7 -6 h30 q7 0 7 6 l4 16 q1 8 -6 8 q-4 0 -7 -5 l-2 -3 h-22 l-2 3 q-3 5 -7 5 q-7 0 -6 -8 z" fill="#2E4A86"/>
  <rect x="34" y="25" width="10" height="3" rx="1.5" fill="#C9CFE6"/><rect x="37.5" y="21.5" width="3" height="10" rx="1.5" fill="#C9CFE6"/>
  <circle cx="58" cy="24" r="2.6" fill="#FFB23F"/><circle cx="63" cy="29" r="2.6" fill="#3DD39A"/><circle cx="53" cy="29" r="2.6" fill="#63B0FF"/><circle cx="58" cy="34" r="2.6" fill="#FF6E6A"/>
  <path d="M78 6 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z" fill="#FFB23F"/>`, 'Challenge');
}
