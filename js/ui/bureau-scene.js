// Bureau du chef : illustration SVG (400 × 300) qui se remplit avec la progression du chef de corps.
// Chaque compétence pose ses objets aux niveaux 2, 5 et 8 ; médailles, états de service, talents (écussons
// cousus sur la veste du portemanteau), réseau (quatre portraits dont l'humeur se lit sur le visage),
// affiches « ARRÊTÉ » et vue par la fenêtre selon le moment de la journée.
// Purement visuel : les groupes cliquables portent `data-obj` (gestion, commandement, flair, diplomatie,
// proximite, medailles, etats, talents, affiches, reseau-<id>, portrait), l'interface y attache ses bulles.
import { TALENT } from '../engine/chef.js';

const f1 = (v) => Math.round(v * 10) / 10;
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function mix(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
function rnd(seed) { let s = seed % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
/** Attributs qui forcent un texte à tenir dans `max` unités (largeur estimée en police étroite). */
const ajuste = (txt, fs, em, ls, max) => { const l = String(txt).length * (fs * em + ls); return l > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ''; };
const hex = (c, d) => (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : d);
const nb = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

const POLICE = 'Barlow Condensed, Arial Narrow, sans-serif';
/** Couleur de chaque compétence (rubans, écussons). */
export const COULEURS_COMP = { gestion: '#E8B530', commandement: '#E1453A', flair: '#A78BFA', diplomatie: '#5AB0F0', proximite: '#3DD39A' };
// Pictogrammes (autour de 0,0, environ 10 × 10), tracés en contour.
const PICTO = {
  gestion: '<path d="M-4 4.5 V1 M0 4.5 V-4 M4 4.5 V-1.5"/>',
  commandement: '<path d="M0 -4.6 L1.4 -1.4 L4.6 -1.2 L2.2 1 L2.9 4.4 L0 2.6 L-2.9 4.4 L-2.2 1 L-4.6 -1.2 L-1.4 -1.4 Z"/>',
  flair: '<circle cx="-1" cy="-1" r="3"/><path d="M1.2 1.2 L4.4 4.4"/>',
  diplomatie: '<circle cx="-1.9" cy="0" r="2.9"/><circle cx="1.9" cy="0" r="2.9"/>',
  proximite: '<path d="M-4.4 0.2 L0 -4 L4.4 0.2 M-3 -1 V4.2 H3 V-1"/>',
};
const picto = (comp, x, y, k, c, w = 1.4) => `<g transform="translate(${f1(x)},${f1(y)}) scale(${k})" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${PICTO[comp] || PICTO.commandement}</g>`;

// Ciel par la fenêtre, et force de l'assombrissement de la pièce (k) et de la lampe.
const MOMENTS = {
  nuit: { ciel: ['#090E25', '#1E2250'], ville: '#141A35', k: 0.52, lampe: 1, allume: 0.5 },
  crepuscule: { ciel: ['#26345A', '#E39A5E'], ville: '#2B3548', k: 0.32, lampe: 0.6, allume: 0.3 },
  jour: { ciel: ['#4F86C0', '#B4D3EC'], ville: '#8FA5BA', k: 0, lampe: 0, allume: 0 },
};

// Paliers d'objets : 0 (rien) à 3, aux niveaux 2, 5 et 8.
const palier = (n) => (n >= 8 ? 3 : n >= 5 ? 2 : n >= 2 ? 1 : 0);
const RESEAU = [
  { id: 'bourgmestre', nom: 'Bourgmestre' },
  { id: 'procureur', nom: 'Procureur' },
  { id: 'syndicat', nom: 'Syndicat' },
  { id: 'journaliste', nom: 'Presse' },
];

/**
 * SVG du bureau du chef.
 * opts : { niveaux, portrait, grade, etoiles, nom, devise, couleur, medailles, etats, talents, reseau, moment, affiches, uid }
 */
export function bureauSvg(opts = {}) {
  const o = opts || {};
  const uid = String(o.uid || 'b').replace(/[^\w-]/g, '');
  const id = (s) => `bz-${uid}-${s}`;
  const M = MOMENTS[o.moment] || MOMENTS.nuit;
  const moment = MOMENTS[o.moment] ? o.moment : 'nuit';
  const zc = hex(o.couleur, '#5AB0F0');
  const N = o.niveaux || {};
  const P = Object.fromEntries(['gestion', 'commandement', 'flair', 'diplomatie', 'proximite'].map((c) => [c, palier(nb(N[c], 10))]));
  const T = (c) => (M.k ? mix(c, '#0C1124', M.k) : c);         // couleur dans la pénombre de la pièce
  const Td = (c) => (M.k ? mix(c, '#0C1124', M.k * 0.55) : c);  // objets éclairés par la lampe (bureau)
  const medailles = (Array.isArray(o.medailles) ? o.medailles : []).slice(-5);
  const etats = (Array.isArray(o.etats) ? o.etats : []).slice(-5);
  const talents = (Array.isArray(o.talents) ? o.talents : []).filter((t) => TALENT[t]).slice(0, 3);
  const humeurs = Object.fromEntries((Array.isArray(o.reseau) ? o.reseau : []).filter((r) => r && r.id).map((r) => [r.id, Math.max(-1, Math.min(1, Math.round(Number(r.humeur) || 0)))]));
  const affiches = nb(o.affiches, 4);
  const grp = (obj, contenu, titre = '') => (contenu ? `<g data-obj="${obj}" style="cursor:pointer">${titre ? `<title>${esc(titre)}</title>` : ''}${contenu}</g>` : '');

  const mur = T('#7C88A6'), murFonce = T('#66718F'), plinthe = T('#3F3A4A'), bois = Td('#7A4E30'), boisFonce = Td('#5A3620'), boisClair = Td('#9A6A44');
  const cadreBois = T('#6B4420'), papier = T('#F4EFE3'), liege = T('#B98A5E');

  let s = `<svg class="bureau-chef" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bureau du chef" style="display:block;width:100%;height:auto">
  <defs>
    <linearGradient id="${id('ciel')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${M.ciel[0]}"/><stop offset="1" stop-color="${M.ciel[1]}"/></linearGradient>
    <radialGradient id="${id('lampe')}"><stop offset="0" stop-color="#FFC56B" stop-opacity=".6"/><stop offset=".45" stop-color="#FFB23F" stop-opacity=".16"/><stop offset="1" stop-color="#FFB23F" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id('vign')}" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#05081A" stop-opacity="0"/><stop offset="1" stop-color="#05081A" stop-opacity=".55"/></radialGradient>
    <radialGradient id="${id('astre')}"><stop offset="0" stop-color="#FFF4D0" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4D0" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id('laiton')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${Td('#F0D58C')}"/><stop offset=".55" stop-color="${Td('#D2A84E')}"/><stop offset="1" stop-color="${Td('#A87E2C')}"/></linearGradient>
    <linearGradient id="${id('or')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE7A0"/><stop offset=".5" stop-color="#E8B530"/><stop offset="1" stop-color="#A8771A"/></linearGradient>
    <clipPath id="${id('vitre')}"><rect x="162" y="18" width="76" height="92"/></clipPath>
    <clipPath id="${id('photo')}"><rect x="176.5" y="185" width="21" height="25"/></clipPath>
  </defs>`;

  // ───── Mur, lambris, plinthe, parquet ─────
  s += `<rect width="400" height="206" fill="${mur}"/>
    ${[40, 120, 280, 360].map((x) => `<rect x="${x}" y="6" width="1" height="174" fill="#FFFFFF" opacity=".025"/>`).join('')}
    <rect width="400" height="6" fill="${murFonce}"/><rect y="6" width="400" height="1.2" fill="#FFFFFF" opacity=".08"/>
    <rect y="182" width="400" height="18" fill="${murFonce}"/><rect y="181" width="400" height="2" fill="${T('#8C98B4')}"/>
    <rect y="200" width="400" height="6" fill="${plinthe}"/>
    <rect y="206" width="400" height="94" fill="${T('#6A4A33')}"/>`;
  for (let y = 214, i = 0; y < 300; y += 10 + i * 1.5, i++) s += `<rect y="${f1(y)}" width="400" height=".8" fill="#000000" opacity=".18"/>`;
  {
    const r = rnd(5);
    for (let y = 206, i = 0; y < 300; y += 10 + i * 1.5, i++) for (let x = r() * 60; x < 400; x += 60 + r() * 50) s += `<rect x="${f1(x)}" y="${f1(y)}" width=".8" height="${f1(10 + i * 1.5)}" fill="#000000" opacity=".14"/>`;
  }

  // ───── Fenêtre ─────
  s += fenetre();

  // ───── Mur de gauche : médailles, états de service ─────
  if (medailles.length) {
    let t = `<rect x="10" y="10" width="${f1(14 + medailles.length * 27)}" height="3.4" rx="1" fill="${cadreBois}"/><rect x="10" y="10" width="${f1(14 + medailles.length * 27)}" height=".9" fill="#FFFFFF" opacity=".15"/>`;
    medailles.forEach((m, i) => {
      const cx = 24 + i * 27, c = T(COULEURS_COMP[m && m.comp] || zc), c2 = mix(c, '#000000', 0.3);
      t += `<path d="M${cx - 5.5} 13 H${cx + 5.5} V31 L${cx} 35 L${cx - 5.5} 31 Z" fill="${c}"/>
        <rect x="${cx - 1.4}" y="13" width="2.8" height="20" fill="${T('#F4F8FB')}" opacity=".85"/><rect x="${cx - 5.5}" y="13" width="1.4" height="18" fill="${c2}"/><rect x="${cx + 4.1}" y="13" width="1.4" height="18" fill="${c2}"/>
        <circle cx="${cx}" cy="42.5" r="7.6" fill="${T('#A8771A')}"/><circle cx="${cx}" cy="42" r="7" fill="url(#${id('or')})" opacity="${M.k ? 0.75 : 1}"/><circle cx="${cx}" cy="42" r="5" fill="none" stroke="${T('#8A5A12')}" stroke-width=".6"/>
        ${picto(m && m.comp, cx, 42, 0.62, T('#7A4A0A'), 1.6)}`;
    });
    s += grp('medailles', t, 'Médailles');
  } else {
    // Bureau neuf : quelques clous attendent leurs médailles.
    s += [24, 51, 78].map((x) => `<circle cx="${x}" cy="14" r="1" fill="${T('#2A2F45')}"/><circle cx="${x - 0.3}" cy="13.7" r=".35" fill="#FFFFFF" opacity=".25"/>`).join('');
  }
  if (etats.length) {
    let t = '';
    etats.forEach((e, i) => {
      const x = 12 + i * 27, y = 54, r = Number(e && e.rang) || 0;
      const cad = r === 1 ? T('#E8B530') : r === 2 ? T('#C8D3DD') : r === 3 ? T('#C98A4B') : cadreBois;
      const sceau = r === 1 ? '#F2C14E' : r === 2 ? '#DDE3EA' : r === 3 ? '#D9945A' : '#C8382E';
      t += `<rect x="${x + 1}" y="${y + 1.5}" width="23" height="30" fill="#000000" opacity=".25"/>
        <rect x="${x}" y="${y}" width="23" height="30" fill="${cad}"/>${r === 1 ? `<rect x="${x}" y="${y}" width="23" height="30" fill="url(#${id('or')})" opacity="${M.k ? 0.5 : 0.8}"/>` : ''}
        <rect x="${x + 2.6}" y="${y + 2.6}" width="17.8" height="24.8" fill="${papier}"/>
        <rect x="${x + 6}" y="${y + 5.5}" width="11" height="1.6" fill="${T('#2F3A55')}" opacity=".7"/>
        ${[10, 12.5, 15, 17.5].map((dy, j) => `<rect x="${x + 5}" y="${y + dy}" width="${j === 3 ? 7 : 13}" height=".7" fill="${T('#6B7A8A')}" opacity=".7"/>`).join('')}
        <path d="M${x + 15.3} ${y + 22} l-1.3 4 l1.6 -1 l.9 1.6 Z M${x + 16.7} ${y + 22} l1.3 4 l-1.6 -1 l-.9 1.6 Z" fill="${T(r === 1 ? '#C8382E' : '#2F6FB5')}"/>
        <circle cx="${x + 16}" cy="${y + 21.6}" r="2.6" fill="${T(sceau)}"/>${r === 1 ? `<circle cx="${x + 16}" cy="${y + 21.6}" r="1.1" fill="${T('#FFF1C2')}"/>` : ''}`;
    });
    s += grp('etats', t, 'États de service');
  }

  // ───── Commandement au mur : carte tactique (5), console radio (8) ─────
  {
    let t = '';
    if (P.commandement >= 2) {
      const x = 60, y = 92, w = 86, h = 48;
      t += `<rect x="${x + 1.2}" y="${y + 1.6}" width="${w}" height="${h}" fill="#000000" opacity=".25"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${T('#2A2F45')}"/>
        <rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" fill="${T('#DCE3D0')}"/>
        <path d="M${x + 2.5} ${y + 30} C${x + 20} ${y + 24} ${x + 30} ${y + 40} ${x + 50} ${y + 33} S${x + 76} ${y + 22} ${x + w - 2.5} ${y + 27}" stroke="${T('#63B0FF')}" stroke-width="2.2" fill="none" opacity=".8"/>
        <path d="M${x + 10} ${y + 2.5} L${x + 22} ${y + h - 2.5} M${x + 2.5} ${y + 16} H${x + w - 2.5} M${x + 58} ${y + 2.5} L${x + 48} ${y + h - 2.5} M${x + 34} ${y + 16} L${x + 70} ${y + h - 2.5}" stroke="${T('#FFFFFF')}" stroke-width="1.4" opacity=".9"/>
        <path d="M${x + 6} ${y + 6} H${x + 40} V${y + 23} H${x + 6} Z M${x + 44} ${y + 6} H${x + 80} V${y + 42} H${x + 52} Z" fill="${zc}" fill-opacity=".14" stroke="${T(zc)}" stroke-width=".9" stroke-dasharray="2.4 1.4"/>
        ${[[18, 12, '#E1453A'], [30, 19, '#2F6FB5'], [60, 14, '#E1453A'], [70, 34, '#E8B530'], [54, 26, '#2F6FB5'], [14, 38, '#3DD39A']].map(([dx, dy, c]) => `<path d="M${x + dx} ${y + dy} l1.2 3.4" stroke="${T('#3A3A3A')}" stroke-width=".6"/><circle cx="${x + dx}" cy="${y + dy}" r="2" fill="${T(c)}"/><circle cx="${x + dx - 0.6}" cy="${y + dy - 0.6}" r=".6" fill="#FFFFFF" opacity=".6"/>`).join('')}`;
    }
    if (P.commandement >= 3) {
      const x = 62, y = 150;
      t += `<rect x="${x - 4}" y="${y + 26}" width="62" height="3" fill="${cadreBois}"/><path d="M${x} ${y + 29} l4 5 M${x + 54} ${y + 29} l-4 5" stroke="${cadreBois}" stroke-width="1.6"/>
        <rect x="${x}" y="${y}" width="54" height="26" rx="2" fill="${T('#3B4256')}"/><rect x="${x}" y="${y}" width="54" height="3" rx="1.5" fill="#FFFFFF" opacity=".1"/>
        <rect x="${x + 4}" y="${y + 5}" width="20" height="9" rx="1" fill="${T('#0F1A2E')}"/><path d="M${x + 6} ${y + 11} l3 -3 l3 2 l3 -4 l3 3 l3 -1" stroke="${T('#3DD39A')}" stroke-width=".9" fill="none"/>
        ${[0, 1, 2, 3, 4].map((j) => `<rect x="${x + 5 + j * 4}" y="${y + 17}" width="2.6" height="5" rx=".5" fill="${T(j === 2 ? '#E1453A' : '#9AA6B4')}"/>`).join('')}
        <circle cx="${x + 33}" cy="${y + 13}" r="5.4" fill="${T('#1D2335')}"/><circle cx="${x + 33}" cy="${y + 13}" r="3.6" fill="${T('#6B7A8A')}"/><path d="M${x + 33} ${y + 13} l2.2 -2.2" stroke="${T('#EDF0FA')}" stroke-width=".8"/>
        ${[0, 1, 2].map((j) => `<rect x="${x + 42}" y="${y + 5 + j * 4}" width="8" height="2" rx="1" fill="${T('#1D2335')}"/>`).join('')}
        <circle class="hp-balise" cx="${x + 46}" cy="${y + 20}" r="1.3" fill="#3DD39A"/><circle cx="${x + 41}" cy="${y + 20}" r="1.3" fill="${T('#FFB23F')}"/>
        <path d="M${x + 27} ${y} C${x + 27} ${y - 6} ${x + 22} ${y - 8} ${x + 18} ${y - 8}" stroke="${T('#1D2335')}" stroke-width="1.2" fill="none"/><rect x="${x + 14}" y="${y - 10}" width="5" height="4" rx="1.5" fill="${T('#1D2335')}"/>`;
    }
    s += grp('commandement', t, 'Commandement');
  }

  // ───── Gestion au mur : plaque « budget en équilibre » (8) ─────
  const plaqueGestion = P.gestion >= 3 ? (() => {
    const x = 122, y = 146;
    return `<rect x="${x + 1}" y="${y + 1.4}" width="26" height="22" fill="#000000" opacity=".25"/><rect x="${x}" y="${y}" width="26" height="22" fill="${T('#2A2F45')}"/>
      <rect x="${x + 2.4}" y="${y + 2.4}" width="21.2" height="17.2" fill="url(#${id('laiton')})"/>
      <path d="M${x + 13} ${y + 5} V${y + 16} M${x + 9} ${y + 16.4} H${x + 17} M${x + 6} ${y + 8} H${x + 20}" stroke="${T('#6B4A12')}" stroke-width=".9" stroke-linecap="round"/>
      <path d="M${x + 6} ${y + 8} l-2.4 4.6 h4.8 Z M${x + 20} ${y + 8} l-2.4 4.6 h4.8 Z" fill="none" stroke="${T('#6B4A12')}" stroke-width=".7"/>
      <path d="M${x + 3.8} ${y + 12.6} h4.4 a2.2 1.2 0 0 1 -4.4 0 Z M${x + 17.8} ${y + 12.6} h4.4 a2.2 1.2 0 0 1 -4.4 0 Z" fill="${T('#6B4A12')}"/>
      <circle cx="${x + 13}" cy="${y + 5}" r="1" fill="${T('#6B4A12')}"/>`;
  })() : '';

  // ───── Sous la fenêtre : poignée de main (diplomatie 5), plan du quartier (proximité 5), jumelage (diplomatie 8) ─────
  let murDiplo = '';
  if (P.diplomatie >= 2) {
    const x = 154, y = 126;
    murDiplo += `<rect x="${x + 1}" y="${y + 1.4}" width="30" height="24" fill="#000000" opacity=".25"/><rect x="${x}" y="${y}" width="30" height="24" fill="${cadreBois}"/>
      <rect x="${x + 2.4}" y="${y + 2.4}" width="25.2" height="19.2" fill="${T('#A9C4DE')}"/>
      <rect x="${x + 2.4}" y="${y + 15}" width="25.2" height="6.6" fill="${T('#7C8BA0')}"/>
      <circle cx="${x + 8.5}" cy="${y + 8}" r="2.6" fill="${T('#E0AC86')}"/><path d="M${x + 4} ${y + 21.6} V${y + 14} Q${x + 8.5} ${y + 9.8} ${x + 13} ${y + 14} V${y + 21.6} Z" fill="${T('#26324F')}"/>
      <circle cx="${x + 21.5}" cy="${y + 8}" r="2.6" fill="${T('#9C6644')}"/><path d="M${x + 17} ${y + 21.6} V${y + 14} Q${x + 21.5} ${y + 9.8} ${x + 26} ${y + 14} V${y + 21.6} Z" fill="${T('#5B4A3A')}"/>
      <path d="M${x + 12} ${y + 16} L${x + 15} ${y + 14.6} L${x + 18} ${y + 16}" stroke="${T('#E0AC86')}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M${x + 2.4} ${y + 21.6} L${x + 12} ${y + 2.4} H${x + 15} L${x + 5.4} ${y + 21.6} Z" fill="#FFFFFF" opacity=".12"/>`;
  }
  if (P.diplomatie >= 3) {
    const x = 226, y = 128;
    murDiplo += `<rect x="${x + 1}" y="${y + 1.4}" width="26" height="22" fill="#000000" opacity=".25"/><rect x="${x}" y="${y}" width="26" height="22" rx="2" fill="${T('#2A2F45')}"/>
      <rect x="${x + 2.4}" y="${y + 2.4}" width="21.2" height="17.2" rx="1" fill="url(#${id('laiton')})"/>
      <path d="M${x + 4.5} ${y + 16} V${y + 10} l2.5 -3 l2.5 3 V${y + 16} Z M${x + 16.5} ${y + 16} V${y + 9} h2 V${y + 6.5} h1.5 V${y + 9} h1.5 V${y + 16} Z" fill="${T('#6B4A12')}"/>
      <path d="M${x + 10} ${y + 11} q3 -3 6 0" stroke="${T('#6B4A12')}" stroke-width=".9" fill="none"/>
      <path d="M${x + 13} ${y + 15.6} c-2.2 -1.4 -1.6 -3.1 0 -2 c1.6 -1.1 2.2 .6 0 2 Z" fill="${T('#C8382E')}"/>`;
  }

  let murProx = '';
  if (P.proximite >= 2) {
    const x = 188, y = 122;
    murProx += `<rect x="${x + 1}" y="${y + 1.4}" width="34" height="27" fill="#000000" opacity=".25"/><rect x="${x}" y="${y}" width="34" height="27" fill="${T('#F4F8FB')}"/>
      <rect x="${x + 1.6}" y="${y + 1.6}" width="30.8" height="23.8" fill="${T('#E6EDD8')}"/>
      ${[[3, 3, 8, 6], [13, 3, 9, 6], [24, 3, 7, 9], [3, 12, 11, 7], [17, 13, 6, 6], [26, 15, 5, 9], [3, 21, 9, 3.6]].map(([dx, dy, w, h]) => `<rect x="${x + dx}" y="${y + dy}" width="${w}" height="${h}" fill="${T('#C9D2BE')}"/>`).join('')}
      <path d="M${x + 1.6} ${y + 10.6} H${x + 32.4} M${x + 23} ${y + 1.6} V${y + 25.4} M${x + 14.8} ${y + 10.6} V${y + 25.4}" stroke="${T('#FFFFFF')}" stroke-width="1.4"/>
      <circle cx="${x + 20}" cy="${y + 18}" r="3.4" fill="${T('#7CCB8C')}"/>
      ${[[8, 7], [19, 6], [28, 13], [10, 17], [27, 21]].map(([dx, dy]) => `<path transform="translate(${x + dx},${y + dy})" d="M0 2.4 c-3.2 -2 -2.4 -4.6 0 -3 c2.4 -1.6 3.2 1 0 3 Z" fill="${T('#E5486B')}"/>`).join('')}`;
  }

  // ───── Mur de droite : réseau (quatre portraits) ─────
  RESEAU.forEach((r, i) => {
    const cx = 290 + (i % 2) * 68, y = 12 + Math.floor(i / 2) * 50, h = r.id in humeurs ? humeurs[r.id] : 0;
    const pastille = h > 0 ? '#3DD39A' : h < 0 ? '#FF6E6A' : '#9AA6B4';
    const t = `<rect x="${cx - 18}" y="${y + 1.5}" width="38" height="34" fill="#000000" opacity=".25"/>
      <rect x="${cx - 19}" y="${y}" width="38" height="34" fill="${cadreBois}"/><rect x="${cx - 19}" y="${y}" width="38" height="1.2" fill="#FFFFFF" opacity=".15"/>
      <svg x="${cx - 16}" y="${y + 3}" width="32" height="28" viewBox="-16 -14 32 28" overflow="hidden">${visage(r.id, h)}</svg>
      <circle cx="${cx + 15.5}" cy="${y + 3.5}" r="2.4" fill="${T(pastille)}" stroke="${T('#1D2335')}" stroke-width=".6"/>
      <rect x="${cx - 24}" y="${y + 36.5}" width="48" height="10.5" rx="1.5" fill="${T('#1D2335')}" opacity=".85"/>
      <text x="${cx}" y="${y + 44.6}" text-anchor="middle" font-family="${POLICE}" font-weight="700" font-size="8.6" letter-spacing=".3" fill="${moment === 'jour' ? '#F4EFE3' : '#E9C894'}">${r.nom}</text>`;
    s += grp(`reseau-${r.id}`, t, `${r.nom} : ${h > 0 ? 'bien disposé' : h < 0 ? 'fâché' : 'neutre'}`);
  });

  // ───── Flair au mur : petit tableau (5), grand mur d'enquête (8) ; affiches « ARRÊTÉ » ─────
  {
    let t = '';
    const photo = (x, y, rot, teinteP) => `<g transform="rotate(${rot} ${x + 6} ${y + 7})"><rect x="${x}" y="${y}" width="12" height="14" fill="${T('#F4F8FB')}"/><rect x="${x + 1.2}" y="${y + 1.2}" width="9.6" height="9" fill="${T(teinteP)}"/><circle cx="${x + 6}" cy="${y + 4.8}" r="2" fill="${T('#2A2F45')}" opacity=".8"/><path d="M${x + 2.4} ${y + 10.2} q3.6 -4.4 7.2 0 Z" fill="${T('#2A2F45')}" opacity=".8"/></g>`;
    const punaise = (x, y, c = '#E1453A') => `<circle cx="${x}" cy="${y}" r="1.3" fill="${T(c)}"/><circle cx="${x - 0.4}" cy="${y - 0.4}" r=".45" fill="#FFFFFF" opacity=".6"/>`;
    const fil = (pts) => `<path d="M${pts.map((p) => p.join(' ')).join(' L')}" stroke="${T('#E1453A')}" stroke-width=".9" fill="none"/>`;
    if (P.flair >= 3) {
      t += `<rect x="255" y="113" width="138" height="84" fill="#000000" opacity=".25"/><rect x="254" y="112" width="138" height="84" fill="${cadreBois}"/><rect x="257" y="115" width="132" height="78" fill="${liege}"/>`;
      const r = rnd(17);
      for (let i = 0; i < 40; i++) t += `<circle cx="${f1(258 + r() * 130)}" cy="${f1(116 + r() * 76)}" r=".5" fill="${T('#7A5636')}" opacity=".6"/>`;
      const pts = [[264, 154, -6, '#8C9DB4'], [286, 166, 5, '#B48C7A'], [306, 152, -3, '#9AB48C'], [276, 176, 4, '#A39AC4'], [300, 176, -5, '#C4B48C'], [322, 162, 3, '#8CB4B0']];
      t += fil([[270, 161], [292, 173], [312, 159], [328, 169]]) + fil([[282, 183], [292, 173]]) + fil([[306, 183], [312, 159]]) + fil([[270, 161], [282, 183]]);
      t += fil([[269, 128], [270, 161]]) + fil([[294, 128], [312, 159]]) + fil([[328, 169], [366, 168]]);
      pts.forEach(([x, y, rot, c]) => { t += photo(x, y, rot, c) + punaise(x + 6, y + 1.5); });
      // Notes et fiches éparses.
      t += [[340, 150, 4], [346, 176, -4]].map(([x, y, rot]) => `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x}" y="${y}" width="14" height="11" fill="${T('#FFE58A')}"/>${[3, 5.5, 8].map((dy) => `<rect x="${x + 2}" y="${y + dy}" width="10" height=".6" fill="${T('#8A6A2A')}" opacity=".6"/>`).join('')}</g>${punaise(x + 7, y + 1.5, '#2F6FB5')}`).join('');
    }
    if (P.flair >= 2) {
      // Petit tableau de liège (niveau 5), repris dans le grand mur au niveau 8.
      const x = 334, y = 150, w = 54, h = 40;
      if (P.flair < 3) t += `<rect x="${x + 1}" y="${y + 1.4}" width="${w}" height="${h}" fill="#000000" opacity=".25"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cadreBois}"/><rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" fill="${liege}"/>`;
      if (P.flair < 3) {
        t += fil([[x + 12, y + 12], [x + 40, y + 10], [x + 27, y + 28], [x + 12, y + 12]]);
        t += photo(x + 5, y + 5, -5, '#8C9DB4') + punaise(x + 11, y + 6.5) + photo(x + 34, y + 4, 4, '#B48C7A') + punaise(x + 40, y + 5.5) + photo(x + 21, y + 21, -2, '#9AB48C') + punaise(x + 27, y + 22.5);
      }
    }
    // Affiches « ARRÊTÉ » (suspects capturés).
    let aff = '';
    for (let i = 0; i < affiches; i++) {
      const x = 260 + i * 25, y = 117, rot = [-3, 2, -1.5, 3][i];
      aff += `<g transform="rotate(${rot} ${x + 11} ${y + 14})"><rect x="${x + 0.8}" y="${y + 1.2}" width="22" height="28" fill="#000000" opacity=".22"/><rect x="${x}" y="${y}" width="22" height="28" fill="${T('#EFE4C8')}"/>
        <rect x="${x + 3}" y="${y + 3}" width="16" height="3" fill="${T('#5A4630')}" opacity=".75"/>
        <rect x="${x + 5}" y="${y + 8}" width="12" height="11" fill="${T('#CDBF9E')}"/><circle cx="${x + 11}" cy="${y + 12.4}" r="2.6" fill="${T('#5A4630')}"/><path d="M${x + 6.2} ${y + 19} q4.8 -6 9.6 0 Z" fill="${T('#5A4630')}"/>
        <rect x="${x + 4}" y="${y + 21.5}" width="14" height=".7" fill="${T('#5A4630')}" opacity=".6"/><rect x="${x + 4}" y="${y + 23.5}" width="10" height=".7" fill="${T('#5A4630')}" opacity=".6"/>
        <g transform="rotate(-18 ${x + 11} ${y + 15})"><rect x="${x - 1.5}" y="${y + 10.6}" width="25" height="9" fill="none" stroke="${T('#D3302A')}" stroke-width="1.1" opacity=".9"/>
        <text x="${x + 11}" y="${y + 17.9}" text-anchor="middle" font-family="${POLICE}" font-weight="700" font-size="8" textLength="21" lengthAdjust="spacingAndGlyphs" fill="${T('#D3302A')}">ARRÊTÉ</text></g></g>${punaise(x + 11, y + 1.6, '#2F6FB5')}`;
    }
    if (P.flair >= 3 && affiches) t += fil([[271, 120], [269, 128]]);
    s += grp('flair', t, 'Flair');
    s += grp('affiches', aff, `${affiches} suspect${affiches > 1 ? 's' : ''} arrêté${affiches > 1 ? 's' : ''}`);
  }

  s += grp('gestion', plaqueGestion, 'Gestion');
  s += grp('diplomatie', murDiplo, 'Diplomatie');
  s += grp('proximite', murProx, 'Proximité');

  // ───── Portemanteau et veste du chef (talents cousus) ─────
  {
    const pied = T('#3A2A20');
    let t = `<path d="M30 96 V284 M30 284 L16 292 M30 284 L44 292 M30 284 V293" stroke="${pied}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="30" cy="95" r="2.4" fill="${pied}"/><path d="M30 102 l-7 -4 M30 102 l7 -4" stroke="${pied}" stroke-width="1.8" stroke-linecap="round"/>`;
    const veste = T('#26324F'), vesteC = T('#30406A'), ep = T(zc);
    t += `<path d="M30 102 L22 106" stroke="${T('#9AA6B4')}" stroke-width="1"/>
      <path d="M13 110 Q14 104 22 103 L30 106 L38 103 Q46 104 47 110 L50 168 Q50 172 46 172 L46 128 L44 128 L44 190 H16 L16 128 L14 128 L14 172 Q10 172 10 168 Z" fill="${veste}"/>
      <path d="M22 103 L30 120 L38 103 L34 103 L30 112 L26 103 Z" fill="${T('#E8ECF5')}"/><path d="M28.6 112 h2.8 l-.6 10 h-1.6 Z" fill="${T('#1D2335')}"/>
      <path d="M22 103 L30 124 L30 190 M38 103 L30 124" stroke="${vesteC}" stroke-width="1.2" fill="none"/>
      <rect x="14" y="104.5" width="8" height="3" rx="1" fill="${ep}" transform="rotate(-12 18 106)"/><rect x="38" y="104.5" width="8" height="3" rx="1" fill="${ep}" transform="rotate(12 42 106)"/>
      ${[132, 146, 160, 174].map((y) => `<circle cx="32" cy="${y}" r=".9" fill="${T('#C8D3DD')}"/>`).join('')}
      <rect x="16" y="176" width="28" height="2" fill="${T('#1D2335')}"/>`;
    // Emplacements des écussons : poitrine gauche, poitrine droite, manche.
    const places = [[21.5, 128], [39, 128], [21.5, 152]];
    talents.forEach((tid, i) => {
      const [x, y] = places[i], comp = TALENT[tid].comp, c = T(COULEURS_COMP[comp] || zc), c2 = mix(c, '#000000', 0.35);
      t += `<path d="M${x - 6} ${y - 6} H${x + 6} V${y + 1.5} Q${x + 6} ${y + 6} ${x} ${y + 8} Q${x - 6} ${y + 6} ${x - 6} ${y + 1.5} Z" fill="${c2}"/>
        <path d="M${x - 5} ${y - 5} H${x + 5} V${y + 1.2} Q${x + 5} ${y + 5} ${x} ${y + 6.8} Q${x - 5} ${y + 5} ${x - 5} ${y + 1.2} Z" fill="${c}" stroke="${T('#FFF1C2')}" stroke-width=".55" stroke-dasharray="1 .8"/>
        ${picto(comp, x, y + 0.4, 0.62, T('#FFFFFF'), 1.7)}`;
    });
    s += grp('talents', t, 'Talents');
  }

  // ───── Plante (proximité) ─────
  if (P.proximite >= 1) {
    const x = 74, y = 292, f = T('#3E7D4F'), f2 = T('#4E9A5E');
    let t = `<ellipse cx="${x}" cy="${y}" rx="15" ry="2.4" fill="#000000" opacity=".3"/>
      <path d="M${x} ${y - 30} C${x - 26} ${y - 46} ${x - 22} ${y - 72} ${x - 16} ${y - 82} C${x - 12} ${y - 62} ${x - 6} ${y - 46} ${x} ${y - 30} Z" fill="${f}"/>
      <path d="M${x} ${y - 30} C${x + 22} ${y - 44} ${x + 22} ${y - 66} ${x + 14} ${y - 80} C${x + 10} ${y - 60} ${x + 4} ${y - 44} ${x} ${y - 30} Z" fill="${f2}"/>
      <path d="M${x} ${y - 30} C${x - 6} ${y - 50} ${x + 2} ${y - 74} ${x + 1} ${y - 92} C${x + 8} ${y - 72} ${x + 6} ${y - 50} ${x} ${y - 30} Z" fill="${f}"/>
      <path d="M${x} ${y - 30} C${x - 18} ${y - 32} ${x - 28} ${y - 44} ${x - 30} ${y - 54} C${x - 18} ${y - 48} ${x - 8} ${y - 40} ${x} ${y - 30} Z" fill="${f2}"/>
      <path d="M${x} ${y - 30} C${x + 16} ${y - 32} ${x + 24} ${y - 40} ${x + 28} ${y - 50} C${x + 16} ${y - 46} ${x + 8} ${y - 40} ${x} ${y - 30} Z" fill="${f}"/>
      <path d="M${x} ${y - 30} V${y - 84} M${x} ${y - 30} L${x - 15} ${y - 78} M${x} ${y - 30} L${x + 13} ${y - 76}" stroke="#000000" stroke-width=".6" opacity=".2"/>
      <path d="M${x - 13} ${y - 30} H${x + 13} L${x + 10} ${y} H${x - 10} Z" fill="${T('#C8693E')}"/><rect x="${x - 14}" y="${y - 33}" width="28" height="5" rx="1" fill="${T('#D97B4E')}"/>
      <rect x="${x - 10}" y="${y - 20}" width="20" height="1.4" fill="${T(zc)}" opacity=".8"/>`;
    if (P.proximite >= 3) t += [[-16, -76, '#F28FB0'], [14, -72, '#FFD27A'], [1, -88, '#F28FB0'], [-27, -52, '#FFD27A'], [25, -48, '#F28FB0'], [-8, -60, '#FFFFFF']].map(([dx, dy, c]) => `<g transform="translate(${x + dx},${y + dy})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-2.2" rx="1.5" ry="2.2" fill="${T(c)}" transform="rotate(${a})"/>`).join('')}<circle r="1.3" fill="${T('#E8B530')}"/></g>`).join('');
    s += grp('proximite', t, 'Proximité');
  }

  // ───── Fauteuil du chef ─────
  s += `<path d="M172 214 V160 Q172 148 184 148 H216 Q228 148 228 160 V214 Z" fill="${Td('#2A2F45')}"/>
    <path d="M178 212 V162 Q178 154 186 154 H214 Q222 154 222 162 V212 Z" fill="${Td('#343B56')}"/>
    ${[166, 180, 194].map((y) => `<path d="M180 ${y} H220" stroke="#000000" stroke-width=".8" opacity=".25"/>`).join('')}
    <path d="M184 150 Q200 146 216 150" stroke="#FFFFFF" stroke-width="1" opacity=".1" fill="none"/>`;

  // ───── Bureau : plateau ─────
  s += `<path d="M86 214 H314 L318 232 H82 Z" fill="${boisClair}"/><path d="M86 214 H314 L315 217 H85 Z" fill="#FFFFFF" opacity=".08"/>
    <path d="M150 218 H250 L252 230 H148 Z" fill="${Td('#2E4A3A')}"/><path d="M150 218 H250 L252 230 H148 Z" fill="none" stroke="${Td(zc)}" stroke-width=".8" opacity=".7"/>
    <path d="M160 220 l26 -1 l1 7 l-27 1 Z" fill="${Td('#F4EFE3')}" opacity=".9"/><path d="M164 222 h16 M164 224 h12" stroke="${Td('#6B7A8A')}" stroke-width=".5"/>`;

  // Lueur de la lampe (sous les objets, sur le plateau et le mur).
  if (M.lampe) s += `<ellipse cx="232" cy="200" rx="${f1(120 + 40 * M.lampe)}" ry="${f1(80 + 30 * M.lampe)}" fill="url(#${id('lampe')})" opacity="${M.lampe}" pointer-events="none"/>`;

  // ───── Objets du bureau, rangée du fond (pied à y = 218) ─────
  // Gestion : classeurs (2), écran avec graphique (5).
  {
    let t = '';
    if (P.gestion >= 1) {
      t += [['#2F6FB5', 0, 30], ['#C8382E', 7.6, 28], [zc, 15.2, 31]].map(([c, dx, h]) => `<rect x="${96 + dx}" y="${218 - h}" width="7" height="${h}" rx=".8" fill="${Td(c)}"/><rect x="${96 + dx}" y="${218 - h}" width="7" height="2" fill="#000000" opacity=".2"/><rect x="${97.4 + dx}" y="${222 - h}" width="4.2" height="6" rx=".6" fill="${Td('#F4EFE3')}"/><circle cx="${99.5 + dx}" cy="${208}" r="1.4" fill="none" stroke="${Td('#F4EFE3')}" stroke-width=".7" opacity=".8"/>`).join('');
    }
    if (P.gestion >= 2) {
      const x = 122, y = 180;
      t += `<rect x="${x + 18}" y="${y + 26}" width="6" height="8" fill="${Td('#3B4256')}"/><path d="M${x + 13} ${y + 38} h16 l-2 -4 h-12 Z" fill="${Td('#3B4256')}"/>
        <rect x="${x}" y="${y}" width="42" height="28" rx="2" fill="${Td('#1D2335')}"/><rect x="${x + 2}" y="${y + 2}" width="38" height="23" rx="1" fill="#0F1A2E"/>
        ${[[5, 8], [12, 13], [19, 10], [26, 17], [33, 15]].map(([dx, h], j) => `<rect x="${x + dx}" y="${y + 23 - h}" width="4.6" height="${h}" fill="${j === 3 ? '#3DD39A' : zc}" opacity=".9"/>`).join('')}
        <path d="M${x + 5} ${y + 12} L${x + 14} ${y + 9} L${x + 22} ${y + 10} L${x + 30} ${y + 5} L${x + 37} ${y + 6}" stroke="#FFC56B" stroke-width=".9" fill="none"/>
        <rect x="${x + 2}" y="${y + 2}" width="38" height="3" fill="#FFFFFF" opacity=".06"/>`;
      if (M.k) t += `<ellipse cx="${x + 21}" cy="${y + 14}" rx="30" ry="22" fill="${zc}" opacity=".08"/>`;
    }
    s += grp('gestion', t, 'Gestion');
  }
  // Portrait du chef (cadre posé).
  {
    const x = 174, y = 182;
    let t = `<path d="M${x + 13} ${y + 20} L${x + 19} ${y + 36}" stroke="${Td('#3A2A20')}" stroke-width="1.4"/>
      <rect x="${x}" y="${y}" width="26" height="31" rx="1.2" fill="${Td('#C8D3DD')}"/><rect x="${x}" y="${y}" width="26" height="31" rx="1.2" fill="none" stroke="${Td('#8A97A8')}" stroke-width=".8"/>`;
    if (o.portrait && /^p\d{2}$/.test(o.portrait)) {
      t += `<rect x="${x + 2.5}" y="${y + 3}" width="21" height="25" fill="#1B2436"/><image href="img/chefs/${o.portrait}.webp" x="${x + 2.5}" y="${y + 3}" width="21" height="25" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id('photo')})"${M.k ? ` opacity="${f1(1 - M.k * 0.35)}"` : ''}/>`;
    } else {
      t += `<rect x="${x + 2.5}" y="${y + 3}" width="21" height="25" fill="${Td('#3A4A6A')}"/>
        <g clip-path="url(#${id('photo')})"><path d="M${x + 4} ${y + 28} C${x + 4} ${y + 21} ${x + 8} ${y + 19} ${x + 13} ${y + 19} C${x + 18} ${y + 19} ${x + 22} ${y + 21} ${x + 22} ${y + 28} Z" fill="${Td('#1D2335')}"/>
        <circle cx="${x + 13}" cy="${y + 13}" r="4.6" fill="${Td('#1D2335')}"/><rect x="${x + 7.6}" y="${y + 7.2}" width="10.8" height="3" rx="1.2" fill="${Td('#1D2335')}"/><rect x="${x + 11.6}" y="${y + 7.6}" width="2.8" height="1.8" fill="${Td(zc)}"/></g>`;
    }
    t += `<path d="M${x + 2.5} ${y + 28} L${x + 12} ${y + 3} H${x + 16} L${x + 6.5} ${y + 28} Z" fill="#FFFFFF" opacity=".1"/>`;
    s += grp('portrait', t, 'Portrait');
  }
  // Lampe de bureau (abat-jour vert), allumée le soir.
  {
    const x = 232;
    s += `<ellipse cx="${x}" cy="218" rx="9" ry="2.2" fill="${Td('#8A6A2A')}"/><rect x="${x - 8}" y="214" width="16" height="4" rx="1.5" fill="url(#${id('laiton')})"/>
      <rect x="${x - 1}" y="194" width="2" height="20" fill="url(#${id('laiton')})"/><path d="M${x} 200 l5 8" stroke="${Td('#A87E2C')}" stroke-width=".7"/><circle cx="${x + 5}" cy="208.6" r="1" fill="${Td('#D2A84E')}"/>
      <path d="M${x - 17} 196 Q${x - 17} 184 ${x} 184 Q${x + 17} 184 ${x + 17} 196 Z" fill="${Td('#1F6B4A')}"/><path d="M${x - 15} 191 Q${x} 186 ${x + 12} 190" stroke="#FFFFFF" stroke-width="1" opacity=".25" fill="none"/>
      <rect x="${x - 17.5}" y="195" width="35" height="2" rx="1" fill="url(#${id('laiton')})"/>`;
    if (M.lampe) s += `<path d="M${x - 16} 197 L${x - 30} 218 H${x + 30} L${x + 16} 197 Z" fill="#FFE7B0" opacity="${f1(0.14 * M.lampe)}" pointer-events="none"/><ellipse cx="${x}" cy="197.4" rx="15" ry="1.6" fill="#FFF1C2" opacity="${f1(0.9 * M.lampe)}"/>`;
  }
  // Diplomatie : téléphone (2), drapeaux (8).
  {
    let t = '';
    if (P.diplomatie >= 1) {
      const x = 252;
      t += `<path d="M${x} 219 L${x + 3} 205 H${x + 21} L${x + 24} 219 Z" fill="${Td('#2A2F45')}"/>
        <rect x="${x + 6}" y="208" width="12" height="7" rx="1" fill="${Td('#3B4256')}"/>${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${x + 7.2 + c * 3.8}" y="${209 + r * 2.1}" width="2.4" height="1.3" rx=".3" fill="${Td('#C8D3DD')}"/>`).join('')).join('')}
        <path d="M${x - 1} 203 Q${x - 1} 199 ${x + 3} 199 H${x + 21} Q${x + 25} 199 ${x + 25} 203 L${x + 22} 204.6 Q${x + 12} 202.4 ${x + 2} 204.6 Z" fill="${Td('#1D2335')}"/>
        <circle cx="${x + 21}" cy="216.6" r=".9" fill="${zc}"/>
        <path d="M${x} 214 c-4 1 -3 4 -6 4 c-3 0 -2 3 -5 4" stroke="${Td('#1D2335')}" stroke-width=".8" fill="none"/>`;
    }
    if (P.diplomatie >= 3) {
      const x = 290;
      t += `<rect x="${x - 6}" y="216" width="14" height="3" rx="1" fill="${Td('#3A2A20')}"/>
        <path d="M${x - 3} 216 V190 M${x + 5} 216 V192" stroke="${Td('#C8D3DD')}" stroke-width=".9"/><circle cx="${x - 3}" cy="189.6" r=".9" fill="${Td('#E8B530')}"/><circle cx="${x + 5}" cy="191.6" r=".9" fill="${Td('#E8B530')}"/>
        <rect x="${x - 15}" y="191" width="4" height="8.4" fill="${Td('#1D1A15')}"/><rect x="${x - 11}" y="191" width="4" height="8.4" fill="${Td('#F2D02E')}"/><rect x="${x - 7}" y="191" width="4" height="8.4" fill="${Td('#E1453A')}"/>
        <path d="M${x + 5} 193 H${x + 17} Q${x + 14.6} 197.2 ${x + 17} 201.4 H${x + 5} Z" fill="${Td(zc)}"/><circle cx="${x + 10}" cy="197.2" r="1.8" fill="none" stroke="#FFFFFF" stroke-width=".7" opacity=".8"/>`;
    }
    s += grp('diplomatie', t, 'Diplomatie');
  }
  // Commandement : radio portative sur son chargeur (2), console (8, au mur).
  {
    let t = '';
    if (P.commandement >= 1) {
      const x = 280;
      t += `<rect x="${x - 1}" y="214" width="12" height="5" rx="1" fill="${Td('#1D2335')}"/><circle class="hp-balise" cx="${x + 8.6}" cy="216.4" r=".8" fill="#3DD39A"/>
        <rect x="${x + 0.5}" y="196" width="8" height="19" rx="1.6" fill="${Td('#2A2F45')}"/><rect x="${x + 2}" y="199" width="5" height="4" rx=".6" fill="${Td('#8CC8F5')}" opacity=".8"/>
        ${[0, 1, 2].map((r) => `<rect x="${x + 2}" y="${205 + r * 2.4}" width="5" height="1.2" rx=".4" fill="${Td('#5B6B7D')}"/>`).join('')}
        <rect x="${x + 6}" y="184" width="1.8" height="12" rx=".8" fill="${Td('#1D2335')}"/><rect x="${x + 2}" y="193.6" width="2.6" height="2.4" rx=".6" fill="${Td('#E1453A')}"/>`;
    }
    s += grp('commandement', t, 'Commandement');
  }
  // Flair : boîte « DOSSIERS CLASSÉS » (8, au sol).
  // (dessinée plus bas, devant le bureau)

  // ───── Bureau : façade ─────
  s += `<rect x="84" y="232" width="232" height="68" fill="${bois}"/><rect x="84" y="232" width="232" height="3" fill="${boisFonce}"/>
    <rect x="94" y="240" width="56" height="60" rx="1" fill="none" stroke="${boisFonce}" stroke-width="1.4"/><rect x="250" y="240" width="56" height="60" rx="1" fill="none" stroke="${boisFonce}" stroke-width="1.4"/>
    <rect x="84" y="235" width="232" height="1.2" fill="${Td(zc)}" opacity=".55"/>
    <rect x="84" y="232" width="4" height="68" fill="#000000" opacity=".15"/><rect x="312" y="232" width="4" height="68" fill="#000000" opacity=".2"/>`;

  // ───── Objets du bureau, rangée de devant (posés au bord, y ≈ 230) ─────
  {
    let t = '';
    if (P.gestion >= 2) {
      // Calculatrice.
      t += `<path d="M98 230 L100 221 H116 L118 230 Z" fill="${Td('#3B4256')}"/><rect x="102" y="222" width="12" height="2.6" rx=".4" fill="${Td('#9FD8B0')}"/>
        ${[0, 1].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${101.6 + c * 3.4 + r * 0.3}" y="${225.6 + r * 2.2}" width="2.4" height="1.4" rx=".3" fill="${Td(c === 3 ? '#FFB23F' : '#C8D3DD')}"/>`).join('')).join('')}`;
    }
    if (P.gestion >= 3) {
      // Stylo-plume doré sur son socle.
      t += `<ellipse cx="128" cy="229" rx="7" ry="2" fill="${Td('#1D2335')}"/><path d="M128 228 L141 212" stroke="${Td('#1D2335')}" stroke-width="3.2" stroke-linecap="round"/><path d="M128 228 L141 212" stroke="url(#${id('or')})" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M141 212 l2.6 -3.4" stroke="${Td('#F0D58C')}" stroke-width="1.2" stroke-linecap="round"/><rect x="132" y="219" width="2.4" height="1.2" fill="${Td('#1D2335')}" transform="rotate(-50 133 219.6)"/>`;
    }
    s += grp('gestion', t, 'Gestion');
  }
  // Tasse de café (toujours là).
  s += `<rect x="154" y="221" width="9" height="9" rx="1.6" fill="${Td('#EDF0FA')}"/><path d="M163 223 q3.6 .6 0 4.6" stroke="${Td('#EDF0FA')}" stroke-width="1.3" fill="none"/><rect x="154" y="223" width="9" height="1.6" fill="${Td(zc)}"/>
    ${M.k ? '<path d="M157 218 q-1.6 -2.4 0 -4.6 M160 218 q1.6 -2.6 0 -5" stroke="#FFFFFF" stroke-width=".6" fill="none" opacity=".35"/>' : ''}`;
  // Commandement : casquette de commandant (8).
  if (P.commandement >= 3) {
    const x = 246;
    s += grp('commandement', `<ellipse cx="${x + 12}" cy="230" rx="15" ry="2" fill="#000000" opacity=".25"/>
      <path d="M${x} 222 Q${x + 12} 214 ${x + 26} 220 L${x + 24} 226 H${x + 2} Z" fill="${Td('#1D2335')}"/>
      <rect x="${x + 2}" y="223" width="22" height="3.6" fill="${Td(zc)}"/><rect x="${x + 2}" y="223" width="22" height=".8" fill="${Td('#E8B530')}"/>
      <path d="M${x + 1} 226.6 H${x + 25} Q${x + 22} 231 ${x + 13} 231 Q${x + 4} 231 ${x + 1} 226.6 Z" fill="${Td('#0F1428')}"/><path d="M${x + 6} 228.4 Q${x + 13} 230 ${x + 20} 228.4" stroke="#FFFFFF" stroke-width=".5" opacity=".3" fill="none"/>
      <circle cx="${x + 13}" cy="219.4" r="2.6" fill="url(#${id('or')})"/>${picto('commandement', x + 13, 219.4, 0.36, Td('#7A4A0A'), 1.4)}
      <path d="M${x + 8} 221.4 l-2 1.6 M${x + 18} 221.4 l2 1.6" stroke="${Td('#E8B530')}" stroke-width=".7"/>`, 'Commandement');
  }
  // Flair : loupe (2).
  if (P.flair >= 1) {
    const x = 284;
    s += grp('flair', `<path d="M${x + 6} 227 L${x + 22} 229.4" stroke="${Td('#5A3620')}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="${x}" cy="225.6" rx="8" ry="4" fill="${Td('#8CC8F5')}" opacity=".45"/><ellipse cx="${x}" cy="225.6" rx="8" ry="4" fill="none" stroke="${Td('#C8D3DD')}" stroke-width="1.4"/>
      <path d="M${x - 4} 224.4 q2 -1.6 4.6 -1.4" stroke="#FFFFFF" stroke-width=".8" fill="none" opacity=".7"/>`, 'Flair');
  }

  // ───── Plaque nominative (sur la façade du bureau) ─────
  {
    const nom = String(o.nom || '').trim().slice(0, 22) || 'Chef de corps';
    const grade = String(o.grade || '').trim().slice(0, 30);
    const et = nb(o.etoiles, 5);
    const fs = Math.min(12, f1(104 / Math.max(6, nom.length * 0.52)));
    const x = 140, y = 240, w = 120, h = 34;
    let t = `<rect x="${x + 1}" y="${y + 1.6}" width="${w}" height="${h}" rx="2" fill="#000000" opacity=".3"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#${id('laiton')})"/>
      <rect x="${x + 2.4}" y="${y + 2.4}" width="${w - 4.8}" height="${h - 4.8}" rx="1.2" fill="none" stroke="${Td('#8A6420')}" stroke-width=".7"/>
      ${[[4.6, 4.6], [w - 4.6, 4.6], [4.6, h - 4.6], [w - 4.6, h - 4.6]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="1.1" fill="${Td('#8A6420')}"/>`).join('')}`;
    const ySt = y + 7.4;
    for (let i = 0; i < et; i++) t += `<g transform="translate(${f1(x + w / 2 + (i - (et - 1) / 2) * 7.4)},${ySt}) scale(.62)"><path d="M0 -4.6 L1.4 -1.4 L4.6 -1.2 L2.2 1 L2.9 4.4 L0 2.6 L-2.9 4.4 L-2.2 1 L-4.6 -1.2 L-1.4 -1.4 Z" fill="${Td('#5A3E0E')}"/></g>`;
    t += `<text x="${x + w / 2}" y="${y + (et ? 21.4 : 18.4)}" text-anchor="middle" font-family="${POLICE}" font-weight="700" font-size="${fs}" letter-spacing=".4"${ajuste(nom, fs, 0.5, 0.4, 106)} fill="${Td('#2A1A06')}">${esc(nom)}</text>`;
    if (grade) t += `<text x="${x + w / 2}" y="${y + (et ? 30 : 28)}" text-anchor="middle" font-family="${POLICE}" font-weight="600" font-size="7.6" letter-spacing=".6"${ajuste(grade, 7.6, 0.5, 0.6, 106)} fill="${Td('#4A3410')}">${esc(grade.toUpperCase())}</text>`;
    s += `<g data-obj="nom" style="cursor:pointer">${o.devise ? `<title>${esc(o.devise)}</title>` : ''}${t}</g>`;
  }

  // ───── Proximité : dessins d'enfants scotchés à la façade du bureau (8) ─────
  if (P.proximite >= 3) {
    const dessin = (x, y, rot, k) => {
      const ruban = `<rect x="${x + 6}" y="${y - 1.6}" width="8" height="3" fill="${Td('#F4F8FB')}" opacity=".6" transform="rotate(${-rot * 2} ${x + 10} ${y})"/>`;
      let d = `<rect x="${x}" y="${y}" width="22" height="18" fill="${Td('#FFFFFF')}"/>`;
      if (k === 0) d += `<circle cx="${x + 17}" cy="${y + 4.6}" r="2.6" fill="${Td('#FFC83D')}"/><path d="M${x + 4} ${y + 15} V${y + 9} L${x + 8.5} ${y + 5} L${x + 13} ${y + 9} V${y + 15} Z" fill="none" stroke="${Td('#E1453A')}" stroke-width="1.1"/><path d="M${x + 1.5} ${y + 15.6} H${x + 20.5}" stroke="${Td('#3DD39A')}" stroke-width="1.4"/>`;
      if (k === 1) d += `<circle cx="${x + 11}" cy="${y + 5.6}" r="2.2" fill="none" stroke="${Td('#2F6FB5')}" stroke-width="1"/><path d="M${x + 11} ${y + 7.8} V${y + 13} M${x + 7} ${y + 10} H${x + 15} M${x + 11} ${y + 13} l-3 3.4 M${x + 11} ${y + 13} l3 3.4" stroke="${Td('#2F6FB5')}" stroke-width="1" fill="none"/><rect x="${x + 8.6}" y="${y + 2}" width="4.8" height="1.6" fill="${Td('#2F6FB5')}"/><path d="M${x + 17} ${y + 6} c-2.4 -1.6 -1.8 -3.4 0 -2.2 c1.8 -1.2 2.4 .6 0 2.2 Z" fill="${Td('#E5486B')}"/>`;
      if (k === 2) d += `<path d="M${x + 11} ${y + 14} c-7.6 -4.6 -5.6 -10.6 0 -7 c5.6 -3.6 7.6 2.4 0 7 Z" fill="${Td('#E5486B')}"/><path d="M${x + 3} ${y + 4} l2 2 M${x + 19} ${y + 4} l-2 2 M${x + 3} ${y + 16} h4" stroke="${Td('#FFC83D')}" stroke-width="1"/>`;
      return `<g transform="rotate(${rot} ${x + 11} ${y + 9})">${d}${ruban}</g>`;
    };
    s += grp('proximite', dessin(100, 248, -5, 0) + dessin(122, 262, 4, 1) + dessin(270, 252, 5, 2), 'Proximité');
  }

  // ───── Flair : boîte « DOSSIERS CLASSÉS » au sol (8) ─────
  if (P.flair >= 3) {
    const x = 324, y = 252, w = 66, h = 40, c = T('#B98A5E'), c2 = T('#9A6E46');
    s += grp('flair', `<ellipse cx="${x + w / 2}" cy="${y + h}" rx="${w / 2 + 4}" ry="3" fill="#000000" opacity=".3"/>
      <rect x="${x + 6}" y="${y - 8}" width="22" height="10" fill="${T('#F4EFE3')}" transform="rotate(-6 ${x + 17} ${y - 3})"/><rect x="${x + 30}" y="${y - 9}" width="20" height="10" fill="${T('#E8D9A8')}" transform="rotate(5 ${x + 40} ${y - 4})"/>
      <rect x="${x + 22}" y="${y - 7}" width="18" height="9" fill="${T('#C9D8E8')}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/><rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="7" fill="${c2}"/>
      <rect x="${x + w / 2 - 6}" y="${y + 7}" width="12" height="3.6" rx="1.6" fill="${T('#5A3E26')}"/>
      <rect x="${x + 4}" y="${y + 15}" width="${w - 8}" height="15" fill="${T('#F4EFE3')}"/>
      <text x="${x + w / 2}" y="${y + 21.6}" text-anchor="middle" font-family="${POLICE}" font-weight="700" font-size="7" letter-spacing=".5" fill="${T('#2A2F45')}">DOSSIERS</text>
      <text x="${x + w / 2}" y="${y + 28.4}" text-anchor="middle" font-family="${POLICE}" font-weight="700" font-size="7" letter-spacing=".5" fill="${T('#2A2F45')}">CLASSÉS</text>
      <rect x="${x + 4}" y="${y + 15}" width="${w - 8}" height="15" fill="none" stroke="${T('#C8382E')}" stroke-width=".8"/>`, 'Flair');
  }

  // Bureau tout neuf : un carton de déménagement attend encore d'être déballé.
  const total = Object.values(N).reduce((a, v) => a + nb(v, 10), 0);
  if (P.flair < 3 && total < 5 && !medailles.length) {
    const x = 330, y = 260, c = T('#C9995F'), c2 = T('#A87A48');
    s += `<ellipse cx="${x + 26}" cy="${y + 32}" rx="30" ry="2.6" fill="#000000" opacity=".3"/>
      <rect x="${x}" y="${y}" width="52" height="32" fill="${c}"/><path d="M${x} ${y} L${x - 6} ${y - 8} H${x + 20} L${x + 26} ${y} Z" fill="${c2}"/><path d="M${x + 52} ${y} L${x + 58} ${y - 8} H${x + 32} L${x + 26} ${y} Z" fill="${c2}"/>
      <rect x="${x + 22}" y="${y}" width="8" height="32" fill="${T('#D9C08A')}" opacity=".7"/>
      <rect x="${x + 6}" y="${y - 6}" width="14" height="9" fill="${T('#F4EFE3')}" transform="rotate(-8 ${x + 13} ${y - 2})"/><rect x="${x + 34}" y="${y - 4}" width="10" height="6" rx="1" fill="${T('#C8D3DD')}"/>
      <path d="M${x + 6} ${y + 22} h12 M${x + 6} ${y + 25} h8" stroke="${T('#5A3E26')}" stroke-width=".8" opacity=".6"/>`;
  }
  // Vignettage de nuit (ne capte pas les touches).
  if (M.k) s += `<rect width="400" height="300" fill="url(#${id('vign')})" opacity="${f1(M.k + 0.1)}" pointer-events="none"/>`;
  return `${s}</svg>`;

  // ───── Fenêtre et vue sur la ville ─────
  function fenetre() {
    const x = 162, y = 18, w = 76, h = 92;
    let t = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id('ciel')})"/><g clip-path="url(#${id('vitre')})">`;
    const r = rnd(11);
    if (moment === 'nuit') {
      for (let i = 0; i < 16; i++) t += `<circle cx="${f1(x + r() * w)}" cy="${f1(y + r() * 50)}" r="${f1(r() * 0.7 + 0.3)}" fill="#C8D3DD" opacity="${f1(r() * 0.5 + 0.2)}"/>`;
      t += `<circle cx="${x + 56}" cy="${y + 18}" r="7.5" fill="#EDF0FA" opacity=".9"/><circle cx="${x + 59.5}" cy="${y + 15.5}" r="6.8" fill="${M.ciel[0]}"/>`;
    } else if (moment === 'crepuscule') {
      t += `<circle cx="${x + 20}" cy="${y + 66}" r="26" fill="url(#${id('astre')})" opacity=".8"/><circle cx="${x + 20}" cy="${y + 66}" r="8" fill="#FFC98A"/>`;
      for (let i = 0; i < 5; i++) t += `<circle cx="${f1(x + r() * w)}" cy="${f1(y + r() * 22)}" r=".5" fill="#C8D3DD" opacity=".4"/>`;
    } else {
      t += `<circle cx="${x + 58}" cy="${y + 16}" r="20" fill="url(#${id('astre')})"/><circle cx="${x + 58}" cy="${y + 16}" r="6.5" fill="#FFF1C2"/>
        <g fill="#FFFFFF" opacity=".8"><ellipse cx="${x + 20}" cy="${y + 30}" rx="13" ry="4"/><ellipse cx="${x + 25}" cy="${y + 26.6}" rx="7" ry="4.4"/></g>`;
    }
    // Toits de la ville (beffroi au centre), fenêtres allumées.
    const ville = M.ville, sombre = mix(ville, '#000000', 0.2);
    t += `<path d="M${x} ${y + 72} L${x + 8} ${y + 64} L${x + 16} ${y + 72} V${y + h} H${x} Z" fill="${sombre}"/>
      <rect x="${x + 14}" y="${y + 68}" width="16" height="${h - 68}" fill="${ville}"/>
      <path d="M${x + 32} ${y + 56} V${y + 44} l3 -6 l3 6 V${y + 56} Z M${x + 30} ${y + 58} h12 V${y + h} H${x + 30} Z" fill="${sombre}"/><path d="M${x + 36.5} ${y + 38} V${y + 33}" stroke="${sombre}" stroke-width=".8"/>
      <path d="M${x + 40} ${y + 66} L${x + 50} ${y + 58} L${x + 60} ${y + 66} V${y + h} H${x + 40} Z" fill="${ville}"/>
      <rect x="${x + 58}" y="${y + 62}" width="18" height="${h - 62}" fill="${sombre}"/><rect x="${x + 62}" y="${y + 56}" width="3" height="6" fill="${sombre}"/>`;
    if (M.allume) {
      [[3, 76], [8, 82], [18, 74], [24, 80], [18, 86], [34, 62], [44, 72], [52, 78], [46, 84], [62, 68], [70, 74], [64, 82], [70, 86]].forEach(([dx, dy]) => {
        if (r() < M.allume + 0.25) t += `<rect x="${x + dx}" y="${y + dy}" width="2.6" height="3" fill="#FFB23F" opacity="${f1(0.6 + r() * 0.4)}"/>`;
      });
      t += `<rect x="${x + 35.6}" y="${y + 47}" width="2" height="2.4" fill="#FFE7B0" opacity=".85"/>`;
    }
    if (moment === 'jour') t += `<path d="M${x + 6} ${y + h} L${x + 40} ${y} H${x + 52} L${x + 18} ${y + h} Z" fill="#FFFFFF" opacity=".12"/>`;
    t += '</g>';
    // Châssis, croisillons, appui, rideaux.
    const ch = T('#E4E0D6');
    t += `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="${ch}" stroke-width="5"/>
      <rect x="${x + w / 2 - 1.4}" y="${y}" width="2.8" height="${h}" fill="${ch}"/><rect x="${x}" y="${y + 38}" width="${w}" height="2.8" fill="${ch}"/>
      <rect x="${x - 10}" y="${y + h + 2}" width="${w + 20}" height="5" rx="1" fill="${T('#D6D0C2')}"/><rect x="${x - 10}" y="${y + h + 6}" width="${w + 20}" height="1.6" fill="#000000" opacity=".2"/>`;
    const rideau = T(mix('#3A4570', zc, 0.18));
    t += `<rect x="${x - 18}" y="${y - 10}" width="${w + 36}" height="3" rx="1.5" fill="${T('#8A6A2A')}"/>
      <path d="M${x - 16} ${y - 7} H${x - 4} Q${x - 2} ${y + 40} ${x - 7} ${y + 60} Q${x - 10} ${y + 84} ${x - 6} ${y + 100} H${x - 16} Z" fill="${rideau}"/>
      <path d="M${x + w + 16} ${y - 7} H${x + w + 4} Q${x + w + 2} ${y + 40} ${x + w + 7} ${y + 60} Q${x + w + 10} ${y + 84} ${x + w + 6} ${y + 100} H${x + w + 16} Z" fill="${rideau}"/>
      <path d="M${x - 12} ${y - 6} V${y + 98} M${x + w + 12} ${y - 6} V${y + 98}" stroke="#000000" stroke-width="1" opacity=".15"/>
      <rect x="${x - 12}" y="${y + 58}" width="8" height="2.6" rx="1" fill="${T(zc)}"/><rect x="${x + w + 4}" y="${y + 58}" width="8" height="2.6" rx="1" fill="${T(zc)}"/>`;
    if (moment !== 'jour') t += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#63B0FF" opacity=".05"/>`;
    // Proximité 8 : bouquet sur l'appui de fenêtre.
    if (P.proximite >= 3) {
      const vx = x + w - 6, vy = y + h + 2;
      t += `<g data-obj="proximite" style="cursor:pointer"><path d="M${vx - 3.5} ${vy} L${vx - 4.5} ${vy - 9} H${vx + 4.5} L${vx + 3.5} ${vy} Z" fill="${T('#8CC8F5')}" opacity=".85"/>
        <path d="M${vx} ${vy - 8} L${vx - 5} ${vy - 17} M${vx} ${vy - 8} V${vy - 20} M${vx} ${vy - 8} L${vx + 5} ${vy - 16}" stroke="${T('#4E9A5E')}" stroke-width=".9"/>
        ${[[-5, -17, '#F28FB0'], [0, -20.5, '#FFD27A'], [5, -16, '#E5486B'], [-2.4, -13, '#FFFFFF']].map(([dx, dy, c]) => `<circle cx="${vx + dx}" cy="${vy + dy}" r="2.3" fill="${T(c)}"/><circle cx="${vx + dx}" cy="${vy + dy}" r=".8" fill="${T('#E8B530')}"/>`).join('')}</g>`;
    }
    return t;
  }

  // ───── Visages du réseau (autour de 0,0 ; cadre −16..16 × −14..14) ─────
  function visage(rid, h) {
    const fonds = { bourgmestre: '#C9D8E8', procureur: '#D8D0E6', syndicat: '#E8D6C2', journaliste: '#CFE3D6' };
    const peaux = { bourgmestre: '#F1C9A5', procureur: '#E0AC86', syndicat: '#C68B62', journaliste: '#F5D6BA' };
    const peau = T(peaux[rid]), trait = T('#2B2118');
    let v = `<rect x="-16" y="-14" width="32" height="28" fill="${T(fonds[rid])}"/>`;
    // Corps et tenue.
    if (rid === 'bourgmestre') v += `<path d="M-14 14 Q-13 3 0 3 Q13 3 14 14 Z" fill="${T('#2F3A55')}"/><path d="M-3 3 L0 8 L3 3 Z" fill="${T('#F4F8FB')}"/>
      <path d="M-11 6 L8 14 L4 14 L-12 8.4 Z" fill="${T('#1D1A15')}"/><path d="M-12 8.4 L4 14 L0 14 L-12.6 10.6 Z" fill="${T('#F2D02E')}"/><path d="M-12.6 10.6 L0 14 L-4 14 L-13 12.8 Z" fill="${T('#E1453A')}"/>`;
    if (rid === 'procureur') v += `<path d="M-14 14 Q-13 3 0 3 Q13 3 14 14 Z" fill="${T('#15161C')}"/><path d="M-2.6 4 H2.6 V10 H-2.6 Z" fill="${T('#FFFFFF')}"/><path d="M0 4 V10" stroke="${T('#C8D3DD')}" stroke-width=".5"/>`;
    if (rid === 'syndicat') v += `<path d="M-14 14 Q-13 3 0 3 Q13 3 14 14 Z" fill="${T('#E1453A')}"/><path d="M-6 3.6 Q0 7.6 6 3.6 L5 6 Q0 9 -5 6 Z" fill="${T('#B8312A')}"/><rect x="5" y="8" width="5" height="3.6" rx=".6" fill="${T('#F4F8FB')}"/>`;
    if (rid === 'journaliste') v += `<path d="M-14 14 Q-13 3 0 3 Q13 3 14 14 Z" fill="${T('#3E7D4F')}"/><path d="M-4 3.4 L-1 12 M4 3.4 L1 12" stroke="${T('#1D2335')}" stroke-width=".6"/><rect x="-2.4" y="10" width="4.8" height="3.4" rx=".5" fill="${T('#F4F8FB')}"/>
      <path d="M9 14 L9.6 7" stroke="${T('#1D2335')}" stroke-width="1.6"/><ellipse cx="9.8" cy="5.6" rx="2.2" ry="2.6" fill="${T('#3B4256')}"/>`;
    // Cou, tête.
    v += `<rect x="-2" y="0" width="4" height="4" fill="${peau}"/><ellipse cx="0" cy="-4.4" rx="6.2" ry="6.8" fill="${peau}"/>`;
    // Cheveux, accessoires.
    if (rid === 'bourgmestre') v += `<path d="M-6.4 -5 Q-7 -10 -3 -10 Q-6 -8 -5.6 -4 Z M6.4 -5 Q7 -10 3 -10 Q6 -8 5.6 -4 Z" fill="${T('#C8CCD4')}"/><path d="M-5 -9.4 Q0 -12.4 5 -9.4 Q0 -10.6 -5 -9.4 Z" fill="${T('#C8CCD4')}"/>`;
    if (rid === 'procureur') v += `<path d="M-6.4 -4 Q-7.4 -12 0 -11.6 Q7.4 -12 6.4 -4 Q5.6 -8.6 0 -8.8 Q-4 -8.8 -6.4 -4 Z" fill="${T('#2B2118')}"/>
      <circle cx="-2.6" cy="-4.4" r="2.1" fill="none" stroke="${T('#1D1A15')}" stroke-width=".7"/><circle cx="2.6" cy="-4.4" r="2.1" fill="none" stroke="${T('#1D1A15')}" stroke-width=".7"/><path d="M-.5 -4.6 H.5" stroke="${T('#1D1A15')}" stroke-width=".7"/>`;
    if (rid === 'syndicat') v += `<path d="M-6.8 -7 Q-6 -12.6 0 -12.4 Q7 -12.4 7.4 -7 Q9.6 -6.4 9 -5.6 H-6.8 Z" fill="${T('#5A3B22')}"/><rect x="-6.8" y="-7.4" width="14.2" height="1.6" fill="${T('#3F2A16')}"/>
      <path d="M-6 -1.6 Q-6 4.4 0 4.6 Q6 4.4 6 -1.6 Q4 1.6 0 1.4 Q-4 1.6 -6 -1.6 Z" fill="${T('#3F2A16')}"/>`;
    if (rid === 'journaliste') v += `<path d="M-6.8 -2 Q-8.6 -12.4 0 -12 Q8.6 -12.4 6.8 -2 Q6 -8 0 -9 Q-6 -8 -6.8 -2 Z" fill="${T('#8C4A22')}"/><path d="M5.6 -6 Q10.4 -4 9 2 Q7.2 -1.6 6 -2 Z" fill="${T('#8C4A22')}"/>`;
    // Expression : sourcils et bouche selon l'humeur.
    const yeux = rid === 'procureur' ? -4.4 : -4;
    v += `<circle cx="-2.6" cy="${yeux}" r=".85" fill="${trait}"/><circle cx="2.6" cy="${yeux}" r=".85" fill="${trait}"/>`;
    const sb = yeux - 2.6;
    if (h > 0) v += `<path d="M-4.2 ${sb + 0.4} Q-2.6 ${sb - 1} -1 ${sb + 0.2} M1 ${sb + 0.2} Q2.6 ${sb - 1} 4.2 ${sb + 0.4}" stroke="${trait}" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
    else if (h < 0) v += `<path d="M-4.4 ${sb - 0.6} L-1 ${sb + 0.9} M1 ${sb + 0.9} L4.4 ${sb - 0.6}" stroke="${trait}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    else v += `<path d="M-4.2 ${sb} H-1 M1 ${sb} H4.2" stroke="${trait}" stroke-width=".8" stroke-linecap="round"/>`;
    const by = rid === 'syndicat' ? 0.6 : 0.2;
    if (h > 0) v += `<path d="M-3 ${by - 0.6} Q0 ${by + 2.8} 3 ${by - 0.6}" stroke="${trait}" stroke-width=".9" fill="${T('#FFFFFF')}" stroke-linecap="round"/><circle cx="-4.2" cy="-1.6" r="1.2" fill="${T('#F28FB0')}" opacity=".55"/><circle cx="4.2" cy="-1.6" r="1.2" fill="${T('#F28FB0')}" opacity=".55"/>`;
    else if (h < 0) v += `<path d="M-2.8 ${by + 1.2} Q0 ${by - 1.4} 2.8 ${by + 1.2}" stroke="${trait}" stroke-width=".95" fill="none" stroke-linecap="round"/>`;
    else v += `<path d="M-2.2 ${by + 0.3} H2.2" stroke="${trait}" stroke-width=".9" stroke-linecap="round"/>`;
    return v;
  }
}
