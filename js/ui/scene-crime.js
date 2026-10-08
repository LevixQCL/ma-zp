// Illustrations des documents de l'affaire : photo de la scène (police scientifique),
// photo de la une de la Gazette, photos des rebondissements. SVG dessinés, sans indice
// (pas de porte forcée ni de vitre brisée : la façon d'entrer reste à constater).

const PLOTS = (pts) => pts.map(([x, y, n]) => `<g transform="translate(${x} ${y})"><path d="M-7 0L0 -13L7 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width=".8"/><text x="0" y="-3" text-anchor="middle" font-family="Special Elite, monospace" font-size="7" fill="#1D1A15">${n}</text></g>`).join('');
const RUBALISE = (y) => `<g transform="rotate(-6 100 ${y})"><rect x="-10" y="${y}" width="220" height="9" fill="#F2C230"/><text x="100" y="${y + 7}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="7" letter-spacing="1" fill="#1D1A15">POLICE · NE PAS FRANCHIR · POLICE · NE PAS FRANCHIR</text></g>`;

function decor(type) {
  switch (type) {
    case 'vitrine': return `
      <rect x="0" y="0" width="200" height="88" fill="#B9B3A6"/><rect x="0" y="88" width="200" height="62" fill="#8E877A"/>
      <path d="M0 88L200 88" stroke="#6E6759" stroke-width="2"/>
      <g fill="none" stroke="#5E574A" stroke-width="1.5"><rect x="18" y="30" width="62" height="40" fill="rgba(220,235,240,.35)"/><rect x="118" y="30" width="62" height="40" fill="rgba(220,235,240,.35)"/></g>
      <g fill="#6E6759"><rect x="22" y="58" width="12" height="3"/><rect x="40" y="58" width="12" height="3"/><rect x="58" y="58" width="12" height="3"/><rect x="124" y="58" width="12" height="3"/><rect x="142" y="58" width="12" height="3"/><rect x="160" y="58" width="12" height="3"/></g>
      <rect x="40" y="96" width="120" height="30" fill="#7A7366" stroke="#5E574A"/><rect x="40" y="96" width="120" height="6" fill="#A39C8E"/>
      <path d="M0 150L40 126M200 150L160 126" stroke="#6E6759"/>`;
    case 'musee': return `
      <rect x="0" y="0" width="200" height="92" fill="#C7C1B4"/><rect x="0" y="92" width="200" height="58" fill="#9A9284"/>
      <g fill="none" stroke="#6E6759" stroke-width="2"><rect x="20" y="18" width="34" height="44"/><rect x="146" y="18" width="34" height="44"/></g><rect x="24" y="22" width="26" height="36" fill="#8E877A"/>
      <rect x="146" y="18" width="34" height="44" fill="#BDB6A8" stroke="#6E6759" stroke-dasharray="3 2"/>
      <g fill="#E6E1D6" stroke="#6E6759"><rect x="62" y="70" width="20" height="40"/><rect x="92" y="66" width="20" height="44"/><rect x="122" y="70" width="20" height="40"/></g>
      <g fill="none" stroke="#6E6759"><path d="M60 70h24M90 66h24M120 70h24"/></g>
      <path d="M72 60v10M102 56v10" stroke="#C0392B" stroke-width="1.2"/>`;
    case 'cave': return `
      <rect x="0" y="0" width="200" height="150" fill="#6E5B48"/><path d="M0 40Q100 -10 200 40V0H0Z" fill="#4E3F31"/>
      <g fill="#3E3226">${[0, 1, 2, 3, 4, 5].map((i) => [0, 1, 2].map((j) => `<rect x="${12 + i * 30}" y="${46 + j * 22}" width="26" height="18"/>`).join('')).join('')}</g>
      <g fill="#7A2E2E">${[[12, 46], [42, 46], [12, 68], [132, 90], [162, 68], [162, 90]].map(([x, y]) => `<circle cx="${x + 6}" cy="${y + 9}" r="4"/><circle cx="${x + 18}" cy="${y + 9}" r="4"/>`).join('')}</g>
      <rect x="0" y="118" width="200" height="32" fill="#57483A"/>`;
    case 'conteneur': return `
      <rect x="0" y="0" width="200" height="96" fill="#A9B5BE"/><rect x="0" y="96" width="200" height="54" fill="#8C8270"/>
      <rect x="30" y="22" width="140" height="84" fill="#2F5E7A"/><g stroke="#24485E" stroke-width="2">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${40 + i * 20} 22v84"/>`).join('')}</g>
      <rect x="70" y="30" width="60" height="74" fill="#1C1C1C"/><path d="M70 30l-14 6v66l14 2z" fill="#3A6E8C"/><path d="M130 30l14 6v66l-14 2z" fill="#3A6E8C"/>`;
    default: return `
      <rect x="0" y="0" width="200" height="94" fill="#A8A296"/><rect x="0" y="94" width="200" height="56" fill="#868074"/>
      <g fill="none" stroke="#5E574A" stroke-width="1.5">${[0, 1, 2].map((i) => `<rect x="${12 + i * 64}" y="20" width="56" height="70"/><path d="M${12 + i * 64} 43h56M${12 + i * 64} 66h56"/>`).join('')}</g>
      <g fill="#C9A86A" stroke="#7A6440">${[[16, 72], [36, 72], [80, 26], [144, 49], [160, 72]].map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="16"/>`).join('')}</g>
      <rect x="150" y="110" width="30" height="22" fill="#C9A86A" stroke="#7A6440"/>`;
  }
}

/** Photo de la scène prise par le labo : décor, plots numérotés, rubalise, flash. */
import { photoUneRampe, photoSceneRampe } from './rampe-visuels.js';
import { photoUneCorbeau, photoSceneCorbeau } from './corbeau-visuels.js';

export function photoScene(type, id = 'sc') {
  if (type === 'rampe') return photoSceneRampe(id);
  if (type === 'corbeau') return photoSceneCorbeau(id);
  return `<svg viewBox="0 0 200 150" class="tb-photo-svg" aria-hidden="true">
    <defs><radialGradient id="${id}fl" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="rgba(255,250,235,.35)"/><stop offset="1" stop-color="rgba(0,0,0,.45)"/></radialGradient></defs>
    ${decor(type)}
    ${PLOTS([[60, 140, 1], [100, 132, 2], [150, 142, 3]])}
    ${RUBALISE(118)}
    <rect width="200" height="150" fill="url(#${id}fl)"/>
  </svg>`;
}

/** Photo de façade pour la une : rue de nuit, gyrophares, rubalise. */
export function photoUne(type, id = 'un') {
  if (type === 'rampe') return photoUneRampe(id);
  if (type === 'corbeau') return photoUneCorbeau(id);
  const vitrine = type === 'vitrine' || type === 'musee';
  return `<svg viewBox="0 0 200 120" class="tb-photo-svg" aria-hidden="true">
    <defs><radialGradient id="${id}g" cx="22%" cy="70%" r="40%"><stop offset="0" stop-color="rgba(120,170,255,.55)"/><stop offset="1" stop-color="rgba(120,170,255,0)"/></radialGradient>
    <radialGradient id="${id}r" cx="78%" cy="70%" r="35%"><stop offset="0" stop-color="rgba(255,120,110,.45)"/><stop offset="1" stop-color="rgba(255,120,110,0)"/></radialGradient></defs>
    <rect width="200" height="120" fill="#2A2C33"/>
    <rect x="30" y="18" width="140" height="78" fill="#4A4C55"/><rect x="30" y="18" width="140" height="10" fill="#3A3C44"/>
    ${vitrine ? '<rect x="44" y="40" width="50" height="40" fill="#6E7A86"/><rect x="106" y="40" width="50" height="40" fill="#6E7A86"/>' : '<rect x="60" y="38" width="80" height="58" fill="#3A3C44"/><g stroke="#55575F">' + [0, 1, 2, 3].map((i) => `<path d="M60 ${46 + i * 12}h80"/>`).join('') + '</g>'}
    <rect x="0" y="96" width="200" height="24" fill="#1E2026"/>
    <g transform="translate(18 84)"><rect x="0" y="6" width="44" height="14" rx="3" fill="#E8E8E8"/><rect x="8" y="0" width="26" height="9" rx="2" fill="#D6D6D6"/><rect x="0" y="12" width="44" height="3" fill="#2F6FD3"/><rect x="14" y="-3" width="6" height="3" fill="#63B0FF"/><rect x="21" y="-3" width="6" height="3" fill="#FF6E6A"/><circle cx="9" cy="21" r="3.5" fill="#111"/><circle cx="35" cy="21" r="3.5" fill="#111"/></g>
    <g fill="#15161A"><circle cx="150" cy="78" r="5"/><rect x="146" y="83" width="9" height="16" rx="3"/><circle cx="166" cy="80" r="5"/><rect x="162" y="85" width="9" height="15" rx="3"/></g>
    <path d="M0 92L200 86" stroke="#F2C230" stroke-width="4"/>
    <rect width="200" height="120" fill="url(#${id}g)"/><rect width="200" height="120" fill="url(#${id}r)"/>
  </svg>`;
}

/** Photo « butin retrouvé » : cartons abandonnés au bord d'un chemin. */
export function photoButin(id = 'bt') {
  return `<svg viewBox="0 0 200 120" class="tb-photo-svg" aria-hidden="true">
    <rect width="200" height="120" fill="#8E9A86"/><path d="M0 70Q100 55 200 72V120H0Z" fill="#6E7A62"/><path d="M0 92Q100 80 200 96" stroke="#5A6450" stroke-width="14" fill="none"/>
    <g fill="#B08A5A" stroke="#6E5532">${[[60, 66, 30, 22], [86, 74, 26, 20], [110, 64, 32, 24]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/><path d="M${x} ${y + 6}h${w}"/>`).join('')}</g>
    ${PLOTS([[70, 98, 1], [128, 96, 2]])}
  </svg>`;
}
