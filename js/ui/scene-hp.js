// Illustration de l'hôtel de police (carte « Mon hôtel de police » de l'HP).
// Tout est dessiné ici en SVG : un étage par niveau du bâtiment, une porte de garage par niveau
// du garage, l'enseigne néon au nom de la zone et les véhicules en service garés devant.
import { esc } from './common.js';
import { BATIMENT_MAX } from '../engine/constants.js';
import { DECOR, DECOR_DEFAUT } from '../engine/decor.js';

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

// Annexes visibles dans l'aile vitrée, et leur pictogramme (dessiné autour de 0,0, environ 12 × 12).
const ANNEXES_AILE = ['sport', 'audition', 'logiciel', 'antenne'];
const PICTO = {
  sport: '<path d="M-5 0 H5"/><path d="M-5 -3.5 V3.5 M-3 -2.5 V2.5 M5 -3.5 V3.5 M3 -2.5 V2.5"/>',
  audition: '<path d="M-5 1 H5 M-3.5 1 V4.5 M3.5 1 V4.5"/><circle cx="-4" cy="-3" r="1.4"/><circle cx="4" cy="-3" r="1.4"/>',
  logiciel: '<rect x="-5" y="-4.5" width="10" height="7" rx="1"/><path d="M-2 5 H2 M0 2.5 V5"/>',
  antenne: '<path d="M-5 0 L0 -4.5 L5 0 M-3.5 -1 V4.5 H3.5 V-1"/><path d="M-1 4.5 V1.5 H1 V4.5"/>',
};

// Lever et coucher du soleil en Belgique, heure locale (approximatifs, heure d'été comprise), par mois.
const SOLEIL = [[8.7, 16.9], [8.0, 17.8], [7.1, 18.6], [7.0, 20.4], [6.1, 21.2], [5.5, 21.9], [5.8, 21.8], [6.5, 21.1], [7.3, 19.9], [8.2, 18.8], [8.1, 17.0], [8.7, 16.7]];
/** Moment de la journée sur l'appareil du joueur : 'jour', 'aube', 'crepuscule' ou 'nuit'. */
export function momentDuJour(d = new Date()) {
  const [lever, coucher] = SOLEIL[d.getMonth()];
  const h = d.getHours() + d.getMinutes() / 60;
  if (Math.abs(h - lever) <= 0.6) return 'aube';
  if (Math.abs(h - coucher) <= 0.6) return 'crepuscule';
  return h > lever && h < coucher ? 'jour' : 'nuit';
}

// Couleurs de la scène selon le moment.
const NUIT = {
  ciel: ['#0A121C', '#16222F'], ville: '#121C27', sol: '#0F1720', bord: '#283647', marquage: '#283647',
  facade: ['#1E2B39', '#18222E'], tour: '#243345', arete: EDGE, vitre: DIM, allume: 0.62, lueur: 1,
  garage: '#18222E', porte: '#2A3A4D', lamelle: '#1A2531', texteGarage: '#6B7A8A', toit: '#2A3A4D', toit2: '#3D5068', mat: '#4A5D73', neon: true,
};
const PALETTES = {
  nuit: NUIT,
  jour: {
    ciel: ['#4F86C0', '#B4D3EC'], ville: '#8FA5BA', sol: '#3B4755', bord: '#5B6B7E', marquage: '#C8D3DD',
    facade: ['#C9D2DC', '#B3BECA'], tour: '#A3B0BF', arete: '#98A6B6', vitre: '#5F88B0', allume: 0, lueur: 0,
    garage: '#AEB9C5', porte: '#8795A5', lamelle: '#76849A', texteGarage: '#4B5968', toit: '#8795A5', toit2: '#6F7E90', mat: '#5B6B7E', neon: false,
  },
  crepuscule: {
    ciel: ['#26345A', '#E39A5E'], ville: '#2B3548', sol: '#1A2330', bord: '#3A4658', marquage: '#3A4658',
    facade: ['#3A4658', '#2F3A4B'], tour: '#435166', arete: '#4A5870', vitre: '#2E3C50', allume: 0.4, lueur: 0.6,
    garage: '#2F3A4B', porte: '#3F4D61', lamelle: '#2A3547', texteGarage: '#8A97A6', toit: '#3F4D61', toit2: '#56657B', mat: '#5B6B7E', neon: true,
  },
};
PALETTES.aube = PALETTES.crepuscule;

/** Mélange deux couleurs hexadécimales (t = part de la seconde). */
function mix(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Météo et fêtes du jour, identiques pour tous les joueurs (tirées de la date). */
export function meteoDuJour(d = new Date()) {
  const m = d.getMonth(), j = d.getDate();
  const r1 = rnd(graine(`${d.getFullYear()}-${m + 1}-${j}`)); r1();
  const tirage = Math.floor(r1() * 100);
  const hiver = m === 11 || m <= 1;
  return {
    neige: hiver && tirage < 35,
    pluie: !hiver && tirage < 18,
    fete: m === 6 && j >= 20 && j <= 22 ? 'nationale' : (m === 11 || (m === 0 && j <= 6)) ? 'noel' : null,
  };
}

/** Petit personnage vu de face (pieds en 0,0), environ 5 × 14. */
function passant(x, y, habit, peau = '#E8C39E') {
  return `<g transform="translate(${x},${y})"><circle cx="0" cy="-12" r="2.1" fill="${peau}"/><rect x="-2.4" y="-9.6" width="4.8" height="6.4" rx="1.2" fill="${habit}"/>
    <rect x="-2.1" y="-3.4" width="1.7" height="3.4" fill="#2A3547"/><rect x=".4" y="-3.4" width="1.7" height="3.4" fill="#2A3547"/></g>`;
}

/**
 * Scène complète. `b` et `g` : niveaux du bâtiment et du garage ; `devant` : types des véhicules
 * en service à garer devant (3 au plus) ; `travaux` : 'bureaux' | 'garage' | null ;
 * `moment` : 'jour' | 'aube' | 'crepuscule' | 'nuit' (par défaut, l'heure de l'appareil).
 */
export function sceneHp({ nom, b, g, devant = [], travaux = null, atelier = false, infra = {}, lots = [], moment = momentDuJour(), decor = null, drapeau = null, file = false, renforce = false, imprevu = {}, operation = false, date = new Date() }) {
  const H = 210, base = 172, x0 = 22, w = 160, gf = 30, fh = 24;
  // Aile des annexes entre l'hôtel de police et le garage (une travée par annexe).
  const aile = ANNEXES_AILE.filter((id) => infra[id]);
  const ax = x0 + w + 6, aw = aile.length ? 8 + aile.length * 24 : 0;
  const gx = ax + aw + (aile.length ? 6 : 8), gw = 24 + g * 26;
  const W = Math.max(360, gx + gw + 14);
  const aLots = new Set((lots || []).map((l) => l.id || l));
  let P = { ...(PALETTES[moment] || NUIT) };
  // Personnalisation : façade et enseigne choisies par le joueur.
  const D = { ...DECOR_DEFAUT, ...(decor || {}) };
  const F = DECOR.facade.options[D.facade] || DECOR.facade.options.beton;
  const N = DECOR.neon.options[D.neon] || DECOR.neon.options.bleu;
  if (D.facade !== 'beton') {
    const vers = moment === 'jour' ? null : moment === 'nuit' ? ['#0B1119', 0.8] : ['#1A2330', 0.66];
    const c = (x) => (vers ? mix(x, vers[0], vers[1]) : x);
    P.facade = [c(F.jour[0]), c(F.jour[1])]; P.tour = c(F.jour[2]); P.arete = c(mix(F.jour[2], '#000000', 0.12));
  }
  if (renforce && P.neon) P.allume = 1;
  const meteo = meteoDuJour(date);
  const gris = moment === 'jour' && (meteo.neige || meteo.pluie);
  if (gris) P.ciel = meteo.neige ? ['#8FA3B8', '#D5DEE7'] : ['#6F8295', '#AEBBC8'];
  const vehs = devant.map((v) => (typeof v === 'string' ? { type: v } : v));
  const r = rnd(graine(nom));
  const top = base - gf - (b - 1) * fh;
  const vy = Math.max(0, Math.min(top - 48, 56));
  let s = `<svg class="scene-hp" viewBox="0 ${vy} ${W} ${H - vy}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hôtel de police niveau ${b} sur ${BATIMENT_MAX}, garage niveau ${g} sur ${BATIMENT_MAX}">
  <defs><linearGradient id="hp-ciel-${moment}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.ciel[0]}"/><stop offset="1" stop-color="${P.ciel[1]}"/></linearGradient>
  <radialGradient id="hp-bleu-${moment}"><stop offset="0" stop-color="#5AB0F0" stop-opacity=".55"/><stop offset="1" stop-color="#5AB0F0" stop-opacity="0"/></radialGradient>
  <radialGradient id="hp-ambre-${moment}"><stop offset="0" stop-color="#F2B544" stop-opacity=".22"/><stop offset="1" stop-color="#F2B544" stop-opacity="0"/></radialGradient>
  <radialGradient id="hp-halo-${moment}"><stop offset="0" stop-color="${N.halo}" stop-opacity=".55"/><stop offset="1" stop-color="${N.halo}" stop-opacity="0"/></radialGradient>
  <radialGradient id="hp-soleil-${moment}"><stop offset="0" stop-color="#FFF4D0" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4D0" stop-opacity="0"/></radialGradient>
  <filter id="hp-neon-${moment}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="hp-facade-${moment}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.facade[0]}"/><stop offset="1" stop-color="${P.facade[1]}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#hp-ciel-${moment})"/>`;
  // Ciel : étoiles et lune la nuit, soleil et nuages le jour, soleil bas à l'aube et au crépuscule.
  const nuages = (op, k2 = 11) => { const n = rnd(graine(nom) + k2); let c = ''; for (let i = 0; i < 3; i++) { const cx = 40 + n() * 250, cy = vy + 16 + n() * 30, k = 0.7 + n() * 0.6; c += `<g fill="#FFFFFF" opacity="${op}"><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(20 * k).toFixed(1)}" ry="${(6 * k).toFixed(1)}"/><ellipse cx="${(cx + 8 * k).toFixed(1)}" cy="${(cy - 5 * k).toFixed(1)}" rx="${(11 * k).toFixed(1)}" ry="${(7 * k).toFixed(1)}"/></g>`; } return c; };
  if (gris) {
    s += nuages(0.9).replace(/#FFFFFF/g, '#E4EAF0') + nuages(0.6, 23).replace(/#FFFFFF/g, '#C8D3DD');
  } else if (moment === 'jour') {
    s += `<circle cx="${W - 42}" cy="${vy + 28}" r="30" fill="url(#hp-soleil-${moment})"/><circle cx="${W - 42}" cy="${vy + 28}" r="10" fill="#FFF1C2"/>${nuages(0.75)}`;
  } else if (moment === 'aube' || moment === 'crepuscule') {
    const sx = moment === 'aube' ? 40 : W - 42;
    s += `<circle cx="${sx}" cy="${base - 42}" r="36" fill="url(#hp-soleil-${moment})" opacity=".8"/><circle cx="${sx}" cy="${base - 42}" r="11" fill="#FFC98A"/>${nuages(0.25)}`;
    for (let i = 0; i < 8; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(vy + r() * 30).toFixed(1)}" r=".6" fill="#C8D3DD" opacity=".35"/>`;
  } else {
    for (let i = 0; i < 22; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(vy + r() * 70).toFixed(1)}" r="${(r() * 0.9 + 0.3).toFixed(2)}" fill="#C8D3DD" opacity="${(r() * 0.4 + 0.15).toFixed(2)}"/>`;
    s += `<circle cx="${W - 42}" cy="${vy + 26}" r="11" fill="#E9EEF3" opacity=".9"/><circle cx="${W - 37}" cy="${vy + 22}" r="10" fill="#0E1822"/>`;
  }
  // Ville en arrière-plan.
  const sk = rnd(3);
  for (let sx = 0; sx < W;) { const ww = 18 + sk() * 26, hh = 30 + sk() * 50; s += `<rect x="${sx.toFixed(1)}" y="${(base - hh).toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" fill="${P.ville}"/>`; sx += ww + 2; }
  s += `<rect y="${base}" width="${W}" height="${H - base}" fill="${P.sol}"/><rect y="${base}" width="${W}" height="2" fill="${P.bord}"/>`;
  for (let i = 0; i < Math.ceil(W / 42); i++) s += `<rect x="${8 + i * 42}" y="${H - 10}" width="20" height="2" rx="1" fill="${P.marquage}"/>`;
  if (P.lueur) s += `<ellipse cx="${x0 + w / 2}" cy="${base - 20}" rx="${w * 0.8}" ry="${(base - top) * 0.9}" fill="url(#hp-ambre-${moment})" opacity="${P.lueur}"/>`;
  // Étage en travaux (échafaudage).
  if (travaux === 'bureaux' && b < BATIMENT_MAX) {
    const ty = top - fh - 4;
    s += `<rect x="${x0 + 1}" y="${ty}" width="${w - 2}" height="${fh}" fill="#F2B544" fill-opacity=".05" stroke="#5A4418" stroke-dasharray="4 3"/>`;
    for (let i = 0; i <= 6; i++) s += `<line x1="${x0 + 4 + i * 25.5}" y1="${ty}" x2="${x0 + 4 + i * 25.5}" y2="${top}" stroke="#8A6A2A" stroke-width="1"/>`;
    s += `<line x1="${x0}" y1="${ty + fh / 2}" x2="${x0 + w}" y2="${ty + fh / 2}" stroke="#8A6A2A"/>`;
  }
  // Bâtiment.
  s += `<rect x="${x0}" y="${top}" width="${w}" height="${base - top}" fill="url(#hp-facade-${moment})"/><rect x="${x0}" y="${top}" width="16" height="${base - top}" fill="${P.tour}"/>`;
  for (let f = 0; f < b - 1; f++) {
    const y = base - gf - (f + 1) * fh;
    s += `<rect x="${x0}" y="${y + fh - 1}" width="${w}" height="1" fill="${P.arete}"/>`;
    for (let k = 0; k < 6; k++) {
      const on = r() < P.allume, x = x0 + 24 + k * 22;
      s += `<rect x="${x}" y="${y + 6}" width="16" height="11" rx="1.5" fill="${on ? LIT : P.vitre}"${on ? ` opacity="${(0.7 + r() * 0.3).toFixed(2)}"` : ''}/>`;
      if (moment === 'jour') s += `<path d="M${x + 3} ${y + 17} L${x + 9} ${y + 6} H${x + 12} L${x + 6} ${y + 17} Z" fill="#FFFFFF" opacity=".22"/>`;
    }
    s += `<rect x="${x0 + 5}" y="${y + 7}" width="6" height="10" rx="1" fill="${r() < P.allume * 0.8 ? LIT : P.vitre}" opacity=".8"/>`;
  }
  // Texture de la façade choisie.
  const trait = mix(P.facade[1], '#000000', 0.18);
  if (D.facade === 'brique') for (let y = top + 3; y < base; y += 4) s += `<rect x="${x0 + 16}" y="${y}" width="${w - 16}" height=".5" fill="${trait}" opacity=".45"/>`;
  if (D.facade === 'pierre') for (let y = top + 8; y < base - gf; y += 8) s += `<rect x="${x0 + 16}" y="${y}" width="${w - 16}" height=".6" fill="${trait}" opacity=".5"/>`;
  if (D.facade === 'verre') for (let x = x0 + 21; x < x0 + w; x += 22) s += `<rect x="${x}" y="${top}" width="1.2" height="${base - top - gf}" fill="${mix(P.facade[0], '#FFFFFF', 0.25)}" opacity=".7"/>`;
  if (D.facade === 'artdeco') { s += `<rect x="${x0}" y="${top + 1}" width="${w}" height="2" fill="#C9A13B" opacity=".8"/>`; for (let x = x0 + 30; x < x0 + w; x += 44) s += `<rect x="${x}" y="${top + 3}" width="2" height="${base - top - gf - 3}" fill="#C9A13B" opacity=".45"/>`; }
  // Abords accrochés à la façade.
  if (D.abords === 'fresque') s += `<g opacity=".95"><rect x="${x0}" y="${top}" width="16" height="${base - top}" fill="#2A3A4D"/>${[['#F2B544', 0.1], ['#F0736A', 0.3], ['#5AB0F0', 0.5], ['#4CC38A', 0.7], ['#A78BFA', 0.88]].map(([c, k]) => `<circle cx="${x0 + 8}" cy="${(top + (base - top) * k).toFixed(1)}" r="${(3.5 + (k * 10) % 2).toFixed(1)}" fill="${c}"/>`).join('')}<path d="M${x0} ${base - 8} Q${x0 + 8} ${top + 20} ${x0 + 16} ${top + 6}" stroke="#E9EEF3" stroke-width="1.4" fill="none"/></g>`;
  if (D.abords === 'horloge') s += `<circle cx="${x0 + 8}" cy="${top + 11}" r="5.5" fill="#F4EFE3" stroke="#C9A13B" stroke-width="1"/><path d="M${x0 + 8} ${top + 11} V${top + 7.5} M${x0 + 8} ${top + 11} H${x0 + 10.6}" stroke="#1D1A15" stroke-width=".8"/>`;
  if (D.abords === 'mat' && b >= 2) for (const bx of [x0 + 19, x0 + w - 11]) s += `<rect x="${bx}" y="${top + 3}" width="8" height="${Math.min(40, base - top - gf - 6)}" fill="${drapeau ? drapeau.couleur : '#5AB0F0'}"/><rect x="${bx + 3}" y="${top + 3}" width="2" height="${Math.min(40, base - top - gf - 6)}" fill="#FFFFFF" opacity=".6"/><path d="M${bx} ${top + 3 + Math.min(40, base - top - gf - 6)} l4 4 l4 -4 Z" fill="${drapeau ? drapeau.couleur : '#5AB0F0'}"/>`;
  const gy = base - gf;
  s += `<rect x="${x0}" y="${gy}" width="${w}" height="3" fill="#2F6FB5"/>
  <rect x="${x0 + 24}" y="${gy + 11}" width="30" height="14" rx="1.5" fill="#8CC8F5" opacity="${moment === 'jour' ? 0.55 : 0.22}"/><rect x="${x0 + w - 54}" y="${gy + 11}" width="30" height="14" rx="1.5" fill="#8CC8F5" opacity="${moment === 'jour' ? 0.55 : 0.22}"/>
  <rect x="${x0 + w / 2 - 14}" y="${gy + 12}" width="28" height="${gf - 12}" fill="#8CC8F5" opacity="${moment === 'jour' ? 0.6 : 0.35}"/><rect x="${x0 + w / 2 - 0.5}" y="${gy + 12}" width="1" height="${gf - 12}" fill="#1A2531"/>
  ${P.neon ? `<ellipse cx="${x0 + w / 2}" cy="${gy + 2}" rx="40" ry="16" fill="url(#hp-bleu-${moment})"/>` : ''}
  <rect x="${x0 + w / 2 - 24}" y="${gy - 1}" width="48" height="11" rx="2" fill="${D.abords === 'plaque' ? '#7A5A12' : '#1B4C80'}" stroke="${D.abords === 'plaque' ? '#F2B544' : '#2F6FB5'}" stroke-width=".8"/>
  ${D.abords === 'plaque' ? `<rect x="${x0 + w / 2 + 17}" y="${gy + 14}" width="7" height="9" rx="1" fill="#C9A13B" stroke="#F2D27A" stroke-width=".5"/>` : ''}
  <text x="${x0 + w / 2}" y="${gy + 7.6}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="10" letter-spacing="1.5" fill="#fff">POLICE</text>`;
  // Toit : les équipements s'ajoutent avec les niveaux, à droite de l'enseigne.
  s += `<rect x="${x0 - 3}" y="${top - 4}" width="${w + 6}" height="4" rx="1" fill="${P.arete}"/>`;
  if (D.abords === 'toitvert') { s += `<rect x="${x0 - 3}" y="${top - 6}" width="${w + 6}" height="3" rx="1.5" fill="#3E7D4F"/>`; for (let i = 0; i < 9; i++) s += `<circle cx="${x0 + 4 + i * 11}" cy="${top - 6.5}" r="${2.2 + (i % 3) * 0.6}" fill="${i % 2 ? '#4E9A5E' : '#3E7D4F'}"/>`; }
  if (b >= 2) s += `<rect x="${x0 + w - 30}" y="${top - 11}" width="20" height="7" rx="1" fill="${P.toit}"/><rect x="${x0 + w - 27}" y="${top - 9}" width="14" height="1" fill="${P.toit2}"/>`;
  if (b >= 3) s += `<line x1="${x0 + w - 6}" y1="${top - 4}" x2="${x0 + w - 6}" y2="${top - 30}" stroke="${P.mat}" stroke-width="1.4"/><line x1="${x0 + w - 10}" y1="${top - 20}" x2="${x0 + w - 2}" y2="${top - 20}" stroke="${P.mat}"/><circle cx="${x0 + w - 6}" cy="${top - 32}" r="4" fill="#F0736A" opacity=".22"/><circle class="hp-balise" cx="${x0 + w - 6}" cy="${top - 32}" r="1.7" fill="#F0736A"/>`;
  if (b >= 4) s += `<g transform="translate(${x0 + w - 22},${top - 11})"><path d="M0 0 L2 -6" stroke="${P.mat}" stroke-width="1.3"/><path d="M-5 -6 Q2 -14 9 -6 Z" fill="${P.toit2}"/></g>`;
  if (b >= 5) s += `<rect x="${x0 + w - 44}" y="${top - 12}" width="12" height="8" rx="1" fill="${P.toit}"/>`;
  // Enseigne « ZP + nom de la zone » : néon allumé le soir et la nuit, lettres bleues éteintes le jour.
  const texte = `ZP ${nom}`;
  const nx = x0 + 8, nw = Math.min(112, 14 + texte.length * 5.2), ny = top - 9;
  s += `<line x1="${nx + 8}" y1="${top - 4}" x2="${nx + 8}" y2="${ny}" stroke="${P.toit2}" stroke-width="1.2"/><line x1="${nx + nw - 8}" y1="${top - 4}" x2="${nx + nw - 8}" y2="${ny}" stroke="${P.toit2}" stroke-width="1.2"/>
  <rect x="${nx - 2}" y="${ny - 2}" width="${nw + 4}" height="1" fill="${P.toit2}"/>`;
  const lettres = `<text x="${nx + nw / 2}" y="${ny - 4}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="600" font-size="14" letter-spacing=".6" textLength="${nw}" lengthAdjust="spacingAndGlyphs"`;
  s += P.neon
    ? `<ellipse cx="${nx + nw / 2}" cy="${ny - 10}" rx="${nw * 0.62}" ry="13" fill="url(#hp-halo-${moment})" opacity=".45"/><g filter="url(#hp-neon-${moment})">${lettres} fill="${N.lettre}" stroke="${N.trait}" stroke-width=".35">${esc(texte)}</text></g>`
    : `${lettres} fill="${N.jour}" stroke="#E9EEF3" stroke-width=".5" paint-order="stroke">${esc(texte)}</text>`;
  // Aile des annexes : une travée vitrée par annexe, avec son pictogramme.
  if (aile.length) {
    const ah = 38, atop = base - ah;
    s += `<rect x="${ax}" y="${atop}" width="${aw}" height="${ah}" fill="${P.garage}"/><rect x="${ax - 2}" y="${atop - 3}" width="${aw + 4}" height="4" rx="1" fill="${P.arete}"/>
    <rect x="${ax}" y="${base - 9}" width="${aw}" height="2" fill="#2F6FB5"/>`;
    aile.forEach((id, i) => {
      const mx = ax + 6 + i * 24, my = atop + 6;
      const lum = P.allume ? LIT : P.vitre;
      s += `<rect x="${mx}" y="${my}" width="20" height="20" rx="2" fill="${lum}" opacity="${P.allume ? 0.95 : 1}"/>`;
      if (moment === 'jour') s += `<path d="M${mx + 3} ${my + 20} L${mx + 11} ${my} H${mx + 14} L${mx + 6} ${my + 20} Z" fill="#FFFFFF" opacity=".15"/>`;
      s += `<g transform="translate(${mx + 10},${my + 10})" stroke="${P.allume ? '#3A2A08' : '#E9EEF3'}" fill="none" stroke-width="1.4" stroke-linecap="round">${PICTO[id]}</g>`;
    });
  }
  // Garage : une porte par niveau ; la première est ouverte si un véhicule est à l'atelier.
  const gh = 46, gtop = base - gh;
  s += `<rect x="${gx}" y="${gtop}" width="${gw}" height="${gh}" fill="${P.garage}"/><rect x="${gx - 2}" y="${gtop - 4}" width="${gw + 4}" height="5" rx="1" fill="${P.arete}"/>
  <text x="${gx + 8}" y="${gtop + 11}" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="9" letter-spacing="1.2" fill="${P.texteGarage}">GARAGE</text>`;
  if (travaux === 'garage' && g < BATIMENT_MAX) s += `<rect x="${gx + gw + 2}" y="${gtop + 4}" width="22" height="${gh - 4}" fill="#F2B544" fill-opacity=".05" stroke="#5A4418" stroke-dasharray="4 3"/>`;
  for (let d = 0; d < g; d++) {
    const dx = gx + 12 + d * 26, ouverte = (atelier || infra.garage) && d === 0;
    s += `<circle cx="${dx + 11}" cy="${gtop + 17}" r="1.3" fill="${P.lueur ? LIT : P.lamelle}"/>${P.lueur ? `<ellipse cx="${dx + 11}" cy="${gtop + 26}" rx="12" ry="8" fill="url(#hp-ambre-${moment})" opacity="${P.lueur}"/>` : ''}`;
    if (ouverte) {
      s += `<rect x="${dx}" y="${gtop + 20}" width="22" height="${gh - 20}" fill="#0B1119"/><rect x="${dx}" y="${gtop + 20}" width="22" height="5" fill="${P.porte}"/>`;
      if (infra.garage) {
        // Atelier mécanique : pont élévateur, avec le véhicule en réparation levé dessus.
        s += `<rect x="${dx + 2}" y="${gtop + 26}" width="2" height="${gh - 26}" fill="#F2B544"/><rect x="${dx + 18}" y="${gtop + 26}" width="2" height="${gh - 26}" fill="#F2B544"/>
        <rect x="${dx + 2}" y="${base - 12}" width="18" height="1.5" fill="#C9B68F"/>
        ${atelier ? `<g transform="translate(${dx + 1.5},${base - 22}) scale(.42)">${combi(0, 0)}</g>` : `<path d="M${dx + 9} ${base - 6} l4 -4 m-1 -1 a2 2 0 1 1 2 2" stroke="#9FB0C0" stroke-width="1" fill="none"/>`}`;
      } else {
        s += `<g transform="translate(${dx + 11},${base - 3})"><path d="M-6 0 L-3 -8 H3 L6 0" fill="#F0736A" opacity=".9"/><rect x="-7" y="-1" width="14" height="1.5" fill="#F0736A"/></g>`;
      }
    } else {
      s += `<rect x="${dx}" y="${gtop + 20}" width="22" height="${gh - 20}" fill="${P.porte}"/>`;
      for (let j = 1; j < 5; j++) s += `<rect x="${dx}" y="${(gtop + 20 + j * 5.2).toFixed(1)}" width="22" height=".8" fill="${P.lamelle}"/>`;
    }
  }
  // Caméras de lecture de plaques : deux mâts au bord de la route.
  if (infra.anpr) for (const px of [8, gx + gw + 6]) {
    if (px > W - 4) continue;
    s += `<line x1="${px}" y1="${base}" x2="${px}" y2="${base - 34}" stroke="${P.mat}" stroke-width="1.6"/><line x1="${px}" y1="${base - 32}" x2="${px + 6}" y2="${base - 32}" stroke="${P.mat}" stroke-width="1.2"/>
    <rect x="${px + 4}" y="${base - 35}" width="8" height="5" rx="1" fill="#5B6B7D"/><circle class="hp-balise" cx="${px + 10.5}" cy="${base - 32.5}" r=".9" fill="#F0736A"/>`;
  }
  // Lots de la salle des ventes : chien pisteur, drone, radar-tronçon.
  if (aLots.has('chien')) {
    const cx = x0 + w / 2 + 30;
    s += `<g transform="translate(${cx},${base}) scale(1.3)">
      <circle cx="0" cy="-15" r="2.3" fill="#E8C39E"/><rect x="-2.6" y="-18.4" width="5.2" height="1.8" rx=".8" fill="#1B2A3F"/>
      <rect x="-2.6" y="-12.6" width="5.2" height="7" rx="1.2" fill="#1B2A3F"/><rect x="-2.6" y="-10" width="5.2" height="1" fill="#E3E84A"/>
      <rect x="-2.3" y="-5.8" width="1.8" height="5.8" fill="#12202F"/><rect x=".5" y="-5.8" width="1.8" height="5.8" fill="#12202F"/>
      <path d="M2.6 -9 Q6 -8 8 -6.5" stroke="#9FB0C0" stroke-width=".6" fill="none"/>
      <ellipse cx="11.5" cy="-4.2" rx="4.2" ry="1.9" fill="#8A5A2B"/><circle cx="16" cy="-6" r="1.6" fill="#6B4420"/><path d="M16.4 -7.2 l.6 -1.8 l.8 1.6 Z" fill="#3A2410"/>
      <path d="M17.2 -5.6 l1.5 .5" stroke="#3A2410" stroke-width="1"/><path d="M7.4 -4.6 Q5.8 -7 6.4 -8" stroke="#6B4420" stroke-width="1" fill="none"/>
      <rect x="8.6" y="-3" width=".9" height="3" fill="#6B4420"/><rect x="10.4" y="-3" width=".9" height="3" fill="#6B4420"/><rect x="13" y="-3" width=".9" height="3" fill="#6B4420"/><rect x="14.6" y="-3" width=".9" height="3" fill="#6B4420"/>
    </g>`;
  }
  if (aLots.has('drone')) {
    const dx = x0 + w + 16, dy = Math.max(vy + 12, top - 24);
    s += `<g transform="translate(${dx},${dy}) scale(1.3)"><rect x="-4" y="-1.2" width="8" height="2.6" rx="1" fill="#C8D3DD"/>
      <line x1="-9" y1="-2" x2="9" y2="-2" stroke="#9FB0C0" stroke-width=".8"/><ellipse cx="-9" cy="-2.6" rx="3.4" ry=".7" fill="#C8D3DD" opacity=".7"/><ellipse cx="9" cy="-2.6" rx="3.4" ry=".7" fill="#C8D3DD" opacity=".7"/>
      <circle cx="0" cy="2.2" r="1.1" fill="#5B6B7D"/><circle class="hp-balise" cx="3.4" cy="0" r=".8" fill="#4CC38A"/></g>`;
  }
  if (aLots.has('radar')) {
    const rx = x0 + 10;
    s += `<g transform="translate(${rx},${base + 22})"><path d="M0 0 L3 -9 L6 0 M3 -9 V0" stroke="#6B7A8A" stroke-width=".9" fill="none"/>
      <rect x="-1" y="-15" width="8" height="6" rx="1" fill="#E3E84A"/><rect x=".5" y="-13.6" width="3" height="3" rx=".5" fill="#0B1119"/><circle cx="5" cy="-12" r=".8" fill="#F0736A"/></g>`;
  }
  // Devant l'entrée : arbres, mât et drapeau de la zone, file de citoyens, imprévus du jour.
  const porte = x0 + w / 2;
  if (D.abords === 'arbres') for (const tx of [x0 + 12, x0 + w - 10]) s += `<rect x="${tx - 5}" y="${base - 5}" width="10" height="5" rx="1" fill="#8A6A4A"/><rect x="${tx - 0.8}" y="${base - 14}" width="1.6" height="9" fill="#6B4420"/><circle cx="${tx}" cy="${base - 17}" r="6" fill="${moment === 'jour' ? '#4E9A5E' : '#2F5E3E'}"/><circle cx="${tx - 3}" cy="${base - 14}" r="3.5" fill="${moment === 'jour' ? '#3E7D4F' : '#264C33'}"/>`;
  if (drapeau) {
    const fx = x0 + w - 26, haut = base - 46, fy = drapeau.berne ? base - 30 : haut;
    const couleurs = meteo.fete === 'nationale' ? ['#1D1A15', '#F2D02E', '#E1332B'] : null;
    s += `<line x1="${fx}" y1="${base}" x2="${fx}" y2="${haut - 2}" stroke="${P.mat}" stroke-width="1.2"/><circle cx="${fx}" cy="${haut - 2.5}" r="1" fill="#C9A13B"/>`;
    s += couleurs ? couleurs.map((c, i) => `<rect x="${fx + 0.6 + i * 4.3}" y="${fy}" width="4.3" height="9" fill="${c}"/>`).join('')
      : `<path d="M${fx + 0.6} ${fy} h13 ${drapeau.berne ? 'l-1.5 4.5 l1.5 4.5' : 'q-1.5 4.5 0 9'} h-13 Z" fill="${drapeau.couleur}"/>`;
  }
  if (file) for (let i = 0; i < 4; i++) s += passant(porte - 20 - i * 8, base, ['#5B6B7D', '#8A4A38', '#3E7D4F', '#7A5A9E'][i]);
  const al = imprevu.alea, cd = imprevu.coup;
  if (al === 'fuite' || al === 'degat') s += `<ellipse cx="${porte + 2}" cy="${base + 3}" rx="14" ry="2.2" fill="#5AB0F0" opacity=".5"/><path d="M${porte + 10} ${base - 5} h6 l-1 5 h-4 Z" fill="#9FB0C0"/>`;
  if (al === 'anniv') [['#F0736A', -4], ['#F2B544', 0], ['#5AB0F0', 4]].forEach(([c, dx]) => { s += `<path d="M${porte - 30} ${base - 4} Q${porte - 30 + dx / 2} ${base - 14} ${porte - 30 + dx} ${base - 22}" stroke="#C8D3DD" stroke-width=".4" fill="none"/><ellipse cx="${porte - 30 + dx}" cy="${base - 25}" rx="2.6" ry="3.2" fill="${c}"/>`; });
  if (al === 'barbecue') s += `<rect x="${x0 + 30}" y="${base - 8}" width="10" height="3" rx="1" fill="#2A3547"/><path d="M${x0 + 31} ${base - 5} l-1 5 M${x0 + 39} ${base - 5} l1 5" stroke="#2A3547"/>${[0, 1, 2].map((i) => `<circle cx="${x0 + 33 + i * 2}" cy="${base - 13 - i * 5}" r="${2 + i}" fill="#C8D3DD" opacity="${0.35 - i * 0.08}"/>`).join('')}`;
  if (al === 'chien') s += `<g transform="translate(${porte - 30},${base})"><ellipse cx="0" cy="-3" rx="3.4" ry="1.6" fill="#F4EFE3"/><circle cx="3.6" cy="-4.6" r="1.4" fill="#F4EFE3"/><path d="M-3 -3.4 l-1.6 -1.6" stroke="#F4EFE3" stroke-width=".8"/><rect x="-2.2" y="-2" width=".7" height="2" fill="#F4EFE3"/><rect x="1.4" y="-2" width=".7" height="2" fill="#F4EFE3"/></g>`;
  if (al === 'pigeon') for (let i = 0; i < 3; i++) s += `<g transform="translate(${x0 + 30 + i * 9},${top - 4})"><ellipse cx="0" cy="-2" rx="2.4" ry="1.5" fill="#9FB0C0"/><circle cx="2" cy="-3.4" r="1" fill="#8A97A6"/></g>`;
  if (al === 'cheval') s += `<g transform="translate(${Math.round(W * 0.42)},${base + 26})"><ellipse cx="0" cy="-8" rx="7" ry="3.4" fill="#7A4A26"/><path d="M5 -9 L9 -15 L11 -14 L8 -8 Z" fill="#7A4A26"/><path d="M-7 -9 q-3 1 -3 5" stroke="#3A2410" stroke-width="1.2" fill="none"/>${[-5, -3, 3, 5].map((lx) => `<rect x="${lx}" y="-5" width="1.2" height="5" fill="#5A3418"/>`).join('')}</g>`;
  if (al === 'sanglier') s += `<g transform="translate(${x0 + 20},${base + 24})"><ellipse cx="0" cy="-4" rx="5.5" ry="3" fill="#4A3A2E"/><path d="M5 -5 l3 1.5 l-3 1.5 Z" fill="#4A3A2E"/><path d="M7.4 -3.6 l1 -1" stroke="#F4EFE3" stroke-width=".6"/>${[-3, -1, 2, 4].map((lx) => `<rect x="${lx}" y="-1.5" width="1" height="1.5" fill="#2A2018"/>`).join('')}</g>`;
  if (al === 'greve') s += `<g transform="translate(${gx + 8},${gtop - 13})"><line x1="0" y1="0" x2="0" y2="10" stroke="${P.mat}"/><line x1="40" y1="0" x2="40" y2="10" stroke="${P.mat}"/><rect x="0" y="0" width="40" height="7" fill="#F0736A"/><text x="20" y="5.6" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="6.5" fill="#fff">EN GRÈVE</text></g>`;
  if (cd === 'plainte') s += `<g transform="translate(${x0 + 8},${base + 22})"><rect x="0" y="-12" width="26" height="11" rx="2" fill="#E9EEF3"/><rect x="18" y="-10" width="6" height="4" fill="#0B1119" opacity=".5"/><text x="9" y="-4.5" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="5" fill="#9A2B1F">TV</text><line x1="8" y1="-12" x2="8" y2="-17" stroke="#9FB0C0"/><ellipse cx="8" cy="-18" rx="4" ry="1.4" fill="#C8D3DD"/><circle cx="5" cy="0" r="2" fill="#0B1119"/><circle cx="21" cy="0" r="2" fill="#0B1119"/></g>${passant(x0 + 40, base + 20, '#2A3547')}<rect x="${x0 + 42}" y="${base + 10}" width="5" height="3" rx=".5" fill="#1D1A15"/>`;
  if (operation) for (let i = 0; i < 4; i++) { const bx = x0 + 18 + i * 34; s += `<g transform="translate(${bx},${base + 1})"><rect x="0" y="-7" width="22" height="1.2" fill="#C8D3DD"/><rect x="0" y="-4" width="22" height="1" fill="#C8D3DD"/>${[1, 7, 13, 19].map((vx) => `<rect x="${vx}" y="-7" width=".8" height="6" fill="#C8D3DD"/>`).join('')}<path d="M1 0 l-1.5 1.5 M21 0 l1.5 1.5" stroke="#9FB0C0"/></g>`; }
  // Véhicules en service garés devant.
  let vx = Math.min(gx - 2, W - 150);
  for (const v of vehs.slice(0, 3)) {
    s += v.type === 'anonyme' ? anonyme(vx, base + 10, 0.9) : combi(vx, base + 8, 0.95);
    if (v.cabosse) s += `<path d="M${vx + 30} ${base + 18} l3 -3 l2 2 l3 -3" stroke="#0B1119" stroke-width="1" fill="none" opacity=".7"/><path d="M${vx + 34} ${base + 12} l5 5 M${vx + 39} ${base + 12} l-5 5" stroke="#C8D3DD" stroke-width="1.4" opacity=".9"/>`;
    if (operation && v.type !== 'anonyme') s += `<circle cx="${vx + 16}" cy="${base + 8}" r="7" fill="url(#hp-bleu-${moment})"/>`;
    vx += 48;
  }
  // Fêtes : drapeaux belges le 21 juillet, guirlandes lumineuses en décembre.
  if (meteo.fete === 'nationale') for (let x = x0, i = 0; x < x0 + w; x += 8, i++) s += `<path d="M${x} ${gy - 2} l4 6 l4 -6 Z" fill="${['#1D1A15', '#F2D02E', '#E1332B'][i % 3]}"/>`;
  if (meteo.fete === 'noel') {
    const lignes = [[x0 - 3, top - 4, x0 + w + 3], [gx - 2, gtop - 4, gx + gw + 2]];
    for (const [xa, ya, xb] of lignes) { s += `<path d="M${xa} ${ya} Q${(xa + xb) / 2} ${ya + 5} ${xb} ${ya}" stroke="${P.mat}" stroke-width=".5" fill="none"/>`; for (let x = xa + 4, i = 0; x < xb; x += 7, i++) s += `<circle cx="${x}" cy="${(ya + 5 * (1 - ((2 * (x - xa)) / (xb - xa) - 1) ** 2) * 0.5 + 0.8).toFixed(1)}" r="1.1" fill="${['#F0736A', '#F2B544', '#4CC38A', '#5AB0F0'][i % 4]}"${P.neon ? '' : ' opacity=".7"'}/>`; }
  }
  // Météo : neige sur les toits et flocons, ou pluie.
  if (meteo.neige) {
    s += `<rect x="${x0 - 3}" y="${top - 6}" width="${w + 6}" height="3" rx="1.5" fill="#F4F8FB"/><rect x="${gx - 2}" y="${gtop - 6}" width="${gw + 4}" height="3" rx="1.5" fill="#F4F8FB"/><rect y="${base}" width="${W}" height="2.5" fill="#E4EAF0" opacity=".85"/>`;
    if (aile.length) s += `<rect x="${ax - 2}" y="${base - 38 - 5}" width="${aw + 4}" height="3" rx="1.5" fill="#F4F8FB"/>`;
    const fl = rnd(graine(nom) + 5);
    for (let i = 0; i < 40; i++) s += `<circle cx="${(fl() * W).toFixed(1)}" cy="${(vy + fl() * (H - vy)).toFixed(1)}" r="${(0.5 + fl() * 0.9).toFixed(2)}" fill="#FFFFFF" opacity="${(0.5 + fl() * 0.4).toFixed(2)}"/>`;
  }
  if (meteo.pluie) {
    const pl = rnd(graine(nom) + 9);
    let traits = '';
    for (let i = 0; i < 60; i++) { const x = pl() * W, y = vy + pl() * (H - vy); traits += `M${x.toFixed(1)} ${y.toFixed(1)} l-2 7 `; }
    s += `<path d="${traits}" stroke="${moment === 'jour' ? '#EAF2F8' : '#8CC8F5'}" stroke-width=".6" opacity=".45"/>`;
  }
  return `${s}</svg>`;
}
