// Briques communes aux photos des pièces (grain, vignettage, cadres de caméra, silhouettes, plots).
export const MONO = "font-family=\"'IBM Plex Mono', 'Special Elite', monospace\"";
export const MAIN = "font-family=\"Caveat, cursive\"";
export const TAPE = "font-family=\"'Special Elite', monospace\"";

/** Grain, vignettage et reflet de flash, communs à toutes les photos. */
export function defsPhoto(id, w, h, { gris = false } = {}) {
  return `<defs>
    <filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .6 0"/></filter>
    <filter id="${id}b"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="${id}bb"><feGaussianBlur stdDeviation="3"/></filter>
    <radialGradient id="${id}v" cx="50%" cy="48%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${gris ? 0.55 : 0.4}"/></radialGradient>
    <linearGradient id="${id}pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
  </defs>`;
}
export const finPhoto = (id, w, h, grain = 0.18) => `<rect width="${w}" height="${h}" filter="url(#${id}n)" opacity="${grain}" style="mix-blend-mode:multiply"/><rect width="${w}" height="${h}" fill="url(#${id}v)"/>`;
export const svg = (id, w, h, inner, cls = 'ip-photo') => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
export const plot = (x, y, n) => `<g transform="translate(${x} ${y})"><path d="M-8 0L0 -15L8 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width=".8"/><text x="0" y="-3.5" text-anchor="middle" ${TAPE} font-size="8" fill="#1D1A15">${n}</text></g>`;
export const echelle = (x, y) => `<g transform="translate(${x} ${y})"><rect width="60" height="9" fill="#F5F2E8" stroke="#333" stroke-width=".6"/>${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${k * 10}" y="0" width="5" height="9" fill="#222"/>`).join('')}<text x="0" y="17" ${MONO} font-size="6" fill="#222">0 5 cm · DD.55.L3</text></g>`;

/** Silhouette : manteau long, avec ou sans parapluie, sac contre soi. */
export function silhouette(x, y, s, { parapluie, sac, dos }) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    ${parapluie ? '<path d="M-26 -50Q0 -72 26 -50Z" fill="#111"/><path d="M0 -62V-18" stroke="#111" stroke-width="2"/>' : ''}
    <ellipse cx="0" cy="-44" rx="6.5" ry="7.5" fill="#1A1A1A"/>
    <path d="M-10 -36Q-13 -10 -12 22L-5 24L0 0L5 24L12 22Q13 -10 10 -36Q0 -40 -10 -36Z" fill="#161616"/>
    ${sac ? '<rect x="-12" y="-22" width="13" height="16" rx="2" fill="#2C2C2C"/><path d="M-11 -24q6 -6 12 0" stroke="#2C2C2C" stroke-width="1.5" fill="none"/>' : ''}
    ${dos ? '' : '<path d="M-3 -46h6" stroke="#2A2A2A" stroke-width="1"/>'}
  </g>`;
}
export function cadreCam(id, titre, heure, inner) {
  return `${defsPhoto(id, 320, 180, { gris: true })}<g style="filter:grayscale(1) contrast(1.15)">${inner}</g>
    <g opacity=".22">${Array.from({ length: 45 }, (_, k) => `<rect y="${k * 4}" width="320" height="1.2" fill="#000"/>`).join('')}</g>
    ${finPhoto(id, 320, 180, 0.35)}
    <text x="8" y="14" ${MONO} font-size="9" fill="#F5F5F5">${titre}</text>
    <text x="312" y="14" text-anchor="end" ${MONO} font-size="9" fill="#F5F5F5">${heure}</text>
    <circle cx="10" cy="171" r="3" fill="#E53935"/><text x="17" y="174" ${MONO} font-size="8" fill="#F5F5F5">REC</text>`;
}

