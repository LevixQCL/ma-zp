// Illustration de l'hôtel de police (carte « Mon hôtel de police » de l'HP).
// Tout est dessiné ici en SVG : un étage par niveau du bâtiment, une porte de garage par niveau
// du garage, l'enseigne néon au nom de la zone et les véhicules en service garés devant.
import { esc } from './common.js';
import { BATIMENT_MAX } from '../engine/constants.js';

const LIT = '#F2B544', DIM = '#223041', EDGE = '#2C3D51';

/** Petit générateur pseudo-aléatoire stable (mêmes fenêtres allumées d'un affichage à l'autre). */
function rnd(seed) { let s = seed % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
const graine = (txt) => [...String(txt)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 233280, 7);

/** Combi (camionnette) aux couleurs de la police, vue de profil, environ 46 × 21. */
function combi(x, y, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M2 17 V5 Q2 2 5 2 H31 Q33 2 34.5 4 L40 10 H43 Q46 10 46 13 V17 Z" fill="#E9EEF3"/>
    <path d="M32 4 L37.5 10 H32 Z" fill="#8CC8F5" opacity=".6"/>
    <rect x="6" y="4.5" width="9" height="4.5" rx="1" fill="#0B1119" opacity=".55"/><rect x="17" y="4.5" width="9" height="4.5" rx="1" fill="#0B1119" opacity=".55"/>
    <rect x="2" y="11" width="44" height="3" fill="#2F6FB5"/>
    <g fill="#E3E84A">${[4, 12, 20, 28, 36].map((i) => `<rect x="${i}" y="11" width="4" height="3"/>`).join('')}</g>
    <rect x="13" y="0" width="8" height="2.2" rx="1" fill="#5AB0F0"/>
    <circle cx="11" cy="17" r="3.4" fill="#0B1119"/><circle cx="11" cy="17" r="1.4" fill="#6B7A8A"/>
    <circle cx="37" cy="17" r="3.4" fill="#0B1119"/><circle cx="37" cy="17" r="1.4" fill="#6B7A8A"/></g>`;
}
/** Voiture anonymisée : banalisée, sans marquage ni gyrophare, environ 46 × 20. */
function anonyme(x, y, s = 1, teinte = '#4B5968') {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M1 16 V12 Q1 10 4 9.5 L11 8.5 L16 3.5 Q17 3 19 3 H30 Q32 3 33 4 L37 8.5 L43 9.5 Q46 10 46 12.5 V16 Z" fill="${teinte}"/>
    <path d="M13 8.5 L17.5 4.5 H23 V8.5 Z M25 8.5 V4.5 H30 L34 8.5 Z" fill="#0B1119" opacity=".6"/>
    <rect x="42" y="10.5" width="3" height="1.6" rx=".8" fill="#F2B544" opacity=".8"/>
    <circle cx="10" cy="16" r="3.2" fill="#0B1119"/><circle cx="10" cy="16" r="1.3" fill="#6B7A8A"/>
    <circle cx="37" cy="16" r="3.2" fill="#0B1119"/><circle cx="37" cy="16" r="1.3" fill="#6B7A8A"/></g>`;
}

/** Icône de véhicule pour les tuiles du parc. */
export function vehiculeSvg(type, h = 18) {
  return type === 'anonyme'
    ? `<svg viewBox="0 0 48 20" style="height:${h}px;width:auto" aria-hidden="true">${anonyme(0, 0, 1, '#5B6B7D')}</svg>`
    : `<svg viewBox="0 0 48 22" style="height:${h}px;width:auto" aria-hidden="true">${combi(0, 0.5)}</svg>`;
}

/**
 * Scène complète. `b` et `g` : niveaux du bâtiment et du garage ; `devant` : types des véhicules
 * en service à garer devant (3 au plus) ; `travaux` : 'bureaux' | 'garage' | null.
 */
export function sceneHp({ nom, b, g, devant = [], travaux = null, atelier = false }) {
  const W = 360, H = 210, base = 172, x0 = 22, w = 160, gf = 30, fh = 24;
  const r = rnd(graine(nom));
  const top = base - gf - (b - 1) * fh;
  const vy = Math.max(0, Math.min(top - 48, 56));
  let s = `<svg class="scene-hp" viewBox="0 ${vy} ${W} ${H - vy}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hôtel de police niveau ${b} sur ${BATIMENT_MAX}, garage niveau ${g} sur ${BATIMENT_MAX}">
  <defs><linearGradient id="hp-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A121C"/><stop offset="1" stop-color="#16222F"/></linearGradient>
  <radialGradient id="hp-bleu"><stop offset="0" stop-color="#5AB0F0" stop-opacity=".55"/><stop offset="1" stop-color="#5AB0F0" stop-opacity="0"/></radialGradient>
  <radialGradient id="hp-ambre"><stop offset="0" stop-color="#F2B544" stop-opacity=".22"/><stop offset="1" stop-color="#F2B544" stop-opacity="0"/></radialGradient>
  <filter id="hp-neon" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="hp-facade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1E2B39"/><stop offset="1" stop-color="#18222E"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#hp-ciel)"/>`;
  for (let i = 0; i < 22; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(vy + r() * 70).toFixed(1)}" r="${(r() * 0.9 + 0.3).toFixed(2)}" fill="#C8D3DD" opacity="${(r() * 0.4 + 0.15).toFixed(2)}"/>`;
  s += `<circle cx="318" cy="${vy + 26}" r="11" fill="#E9EEF3" opacity=".9"/><circle cx="323" cy="${vy + 22}" r="10" fill="#0E1822"/>`;
  // Ville en arrière-plan.
  const sk = rnd(3);
  for (let sx = 0; sx < W;) { const ww = 18 + sk() * 26, hh = 30 + sk() * 50; s += `<rect x="${sx.toFixed(1)}" y="${(base - hh).toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" fill="#121C27"/>`; sx += ww + 2; }
  s += `<rect y="${base}" width="${W}" height="${H - base}" fill="#0F1720"/><rect y="${base}" width="${W}" height="2" fill="#283647"/>`;
  for (let i = 0; i < 9; i++) s += `<rect x="${8 + i * 42}" y="${H - 10}" width="20" height="2" rx="1" fill="#283647"/>`;
  s += `<ellipse cx="${x0 + w / 2}" cy="${base - 20}" rx="${w * 0.8}" ry="${(base - top) * 0.9}" fill="url(#hp-ambre)"/>`;
  // Étage en travaux (échafaudage).
  if (travaux === 'bureaux' && b < BATIMENT_MAX) {
    const ty = top - fh - 4;
    s += `<rect x="${x0 + 1}" y="${ty}" width="${w - 2}" height="${fh}" fill="#F2B544" fill-opacity=".05" stroke="#5A4418" stroke-dasharray="4 3"/>`;
    for (let i = 0; i <= 6; i++) s += `<line x1="${x0 + 4 + i * 25.5}" y1="${ty}" x2="${x0 + 4 + i * 25.5}" y2="${top}" stroke="#8A6A2A" stroke-width="1"/>`;
    s += `<line x1="${x0}" y1="${ty + fh / 2}" x2="${x0 + w}" y2="${ty + fh / 2}" stroke="#8A6A2A"/>`;
  }
  // Bâtiment.
  s += `<rect x="${x0}" y="${top}" width="${w}" height="${base - top}" fill="url(#hp-facade)"/><rect x="${x0}" y="${top}" width="16" height="${base - top}" fill="#243345"/>`;
  for (let f = 0; f < b - 1; f++) {
    const y = base - gf - (f + 1) * fh;
    s += `<rect x="${x0}" y="${y + fh - 1}" width="${w}" height="1" fill="${EDGE}"/>`;
    for (let k = 0; k < 6; k++) { const on = r() < 0.62; s += `<rect x="${x0 + 24 + k * 22}" y="${y + 6}" width="16" height="11" rx="1.5" fill="${on ? LIT : DIM}"${on ? ` opacity="${(0.7 + r() * 0.3).toFixed(2)}"` : ''}/>`; }
    s += `<rect x="${x0 + 5}" y="${y + 7}" width="6" height="10" rx="1" fill="${r() < 0.5 ? LIT : DIM}" opacity=".8"/>`;
  }
  const gy = base - gf;
  s += `<rect x="${x0}" y="${gy}" width="${w}" height="3" fill="#2F6FB5"/>
  <rect x="${x0 + 24}" y="${gy + 11}" width="30" height="14" rx="1.5" fill="#8CC8F5" opacity=".22"/><rect x="${x0 + w - 54}" y="${gy + 11}" width="30" height="14" rx="1.5" fill="#8CC8F5" opacity=".22"/>
  <rect x="${x0 + w / 2 - 14}" y="${gy + 12}" width="28" height="${gf - 12}" fill="#8CC8F5" opacity=".35"/><rect x="${x0 + w / 2 - 0.5}" y="${gy + 12}" width="1" height="${gf - 12}" fill="#1A2531"/>
  <ellipse cx="${x0 + w / 2}" cy="${gy + 2}" rx="40" ry="16" fill="url(#hp-bleu)"/>
  <rect x="${x0 + w / 2 - 24}" y="${gy - 1}" width="48" height="11" rx="2" fill="#1B4C80" stroke="#2F6FB5" stroke-width=".8"/>
  <text x="${x0 + w / 2}" y="${gy + 7.6}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="10" letter-spacing="1.5" fill="#fff">POLICE</text>`;
  // Toit : les équipements s'ajoutent avec les niveaux, à droite de l'enseigne.
  s += `<rect x="${x0 - 3}" y="${top - 4}" width="${w + 6}" height="4" rx="1" fill="${EDGE}"/>`;
  if (b >= 2) s += `<rect x="${x0 + w - 30}" y="${top - 11}" width="20" height="7" rx="1" fill="#2A3A4D"/><rect x="${x0 + w - 27}" y="${top - 9}" width="14" height="1" fill="#3D5068"/>`;
  if (b >= 3) s += `<line x1="${x0 + w - 6}" y1="${top - 4}" x2="${x0 + w - 6}" y2="${top - 30}" stroke="#4A5D73" stroke-width="1.4"/><line x1="${x0 + w - 10}" y1="${top - 20}" x2="${x0 + w - 2}" y2="${top - 20}" stroke="#4A5D73"/><circle cx="${x0 + w - 6}" cy="${top - 32}" r="4" fill="#F0736A" opacity=".22"/><circle class="hp-balise" cx="${x0 + w - 6}" cy="${top - 32}" r="1.7" fill="#F0736A"/>`;
  if (b >= 4) s += `<g transform="translate(${x0 + w - 22},${top - 11})"><path d="M0 0 L2 -6" stroke="#4A5D73" stroke-width="1.3"/><path d="M-5 -6 Q2 -14 9 -6 Z" fill="#3D5068"/></g>`;
  if (b >= 5) s += `<rect x="${x0 + w - 44}" y="${top - 12}" width="12" height="8" rx="1" fill="#2A3A4D"/>`;
  // Enseigne néon « ZP + nom de la zone ».
  const texte = `ZP ${nom}`;
  const nx = x0 + 8, nw = Math.min(112, 14 + texte.length * 5.2), ny = top - 9;
  s += `<line x1="${nx + 8}" y1="${top - 4}" x2="${nx + 8}" y2="${ny}" stroke="#3D5068" stroke-width="1.2"/><line x1="${nx + nw - 8}" y1="${top - 4}" x2="${nx + nw - 8}" y2="${ny}" stroke="#3D5068" stroke-width="1.2"/>
  <rect x="${nx - 2}" y="${ny - 2}" width="${nw + 4}" height="1" fill="#3D5068"/>
  <ellipse cx="${nx + nw / 2}" cy="${ny - 10}" rx="${nw * 0.62}" ry="13" fill="url(#hp-bleu)" opacity=".45"/>
  <g filter="url(#hp-neon)"><text x="${nx + nw / 2}" y="${ny - 4}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="600" font-size="14" letter-spacing=".6" textLength="${nw}" lengthAdjust="spacingAndGlyphs" fill="#DDF0FF" stroke="#7CC3F7" stroke-width=".35">${esc(texte)}</text></g>`;
  // Garage : une porte par niveau ; la première est ouverte si un véhicule est à l'atelier.
  const gx = 196, gw = 24 + g * 26, gh = 46, gtop = base - gh;
  s += `<rect x="${gx}" y="${gtop}" width="${gw}" height="${gh}" fill="#18222E"/><rect x="${gx - 2}" y="${gtop - 4}" width="${gw + 4}" height="5" rx="1" fill="${EDGE}"/>
  <text x="${gx + 8}" y="${gtop + 11}" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="9" letter-spacing="1.2" fill="#6B7A8A">GARAGE</text>`;
  if (travaux === 'garage' && g < BATIMENT_MAX) s += `<rect x="${gx + gw + 2}" y="${gtop + 4}" width="22" height="${gh - 4}" fill="#F2B544" fill-opacity=".05" stroke="#5A4418" stroke-dasharray="4 3"/>`;
  for (let d = 0; d < g; d++) {
    const dx = gx + 12 + d * 26, ouverte = atelier && d === 0;
    s += `<circle cx="${dx + 11}" cy="${gtop + 17}" r="1.3" fill="${LIT}"/><ellipse cx="${dx + 11}" cy="${gtop + 26}" rx="12" ry="8" fill="url(#hp-ambre)"/>`;
    if (ouverte) {
      s += `<rect x="${dx}" y="${gtop + 20}" width="22" height="${gh - 20}" fill="#0B1119"/><rect x="${dx}" y="${gtop + 20}" width="22" height="5" fill="#2A3A4D"/>
      <g transform="translate(${dx + 11},${base - 3})"><path d="M-6 0 L-3 -8 H3 L6 0" fill="#F0736A" opacity=".9"/><rect x="-7" y="-1" width="14" height="1.5" fill="#F0736A"/></g>`;
    } else {
      s += `<rect x="${dx}" y="${gtop + 20}" width="22" height="${gh - 20}" fill="#2A3A4D"/>`;
      for (let j = 1; j < 5; j++) s += `<rect x="${dx}" y="${(gtop + 20 + j * 5.2).toFixed(1)}" width="22" height=".8" fill="#1A2531"/>`;
    }
  }
  // Véhicules en service garés devant.
  let vx = gx - 2;
  for (const t of devant.slice(0, 3)) { s += t === 'anonyme' ? anonyme(vx, base + 10, 0.9) : combi(vx, base + 8, 0.95); vx += 48; }
  return `${s}</svg>`;
}
