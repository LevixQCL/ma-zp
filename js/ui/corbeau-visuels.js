// Visuels de l'affaire « Le corbeau de la rue d'Havré » : photos des pièces, scène à fouiller, une du journal.
// Même règle que pour les autres affaires : l'indice se lit dans l'image (une heure, un détail), sans être souligné.
// Dessins provisoires : quand les photos générées arrivent (img/corbeau/…), elles remplacent la scène et la une.
import { MONO, defsPhoto, finPhoto, svg, cadreCam } from './photo-base.js';

// ───── Briques ─────
const ligne = (x, y, t, { taille = 8.5, coul = '#222', gras = false, police = MONO, ancre = '' } = {}) => `<text x="${x}" y="${y}" ${police} font-size="${taille}" fill="${coul}"${gras ? ' font-weight="600"' : ''}${ancre ? ` text-anchor="${ancre}"` : ''}>${t}</text>`;
/** Feuille posée de travers sur une table. */
function feuille(id, w, h, fond, rot, contenu, { papier = '#FBF9F2', grain = 0.12 } = {}) {
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="${fond}"/>
    <g transform="rotate(${rot} ${w / 2} ${h / 2})"><rect x="${w * 0.08}" y="${h * 0.06}" width="${w * 0.84}" height="${h * 0.88}" fill="${papier}"/>${contenu}</g>
    ${finPhoto(id, w, h, grain)}`);
}
/** Mots imprimés à l'étiqueteuse : bandes blanches de ruban, texte noir, légèrement de travers. */
function ruban(x, y, mots, { taille = 7.5, h = 11, rot = 0 } = {}) {
  let cx = x;
  return mots.map((m, k) => {
    const w = m.length * taille * 0.62 + 8;
    const g = `<g transform="translate(${cx} ${y}) rotate(${((k * 37) % 5) - 2 + rot})"><rect width="${w}" height="${h}" fill="#FDFDFB" stroke="#CFCFCF" stroke-width=".4"/><text x="4" y="${h - 3}" font-family="Helvetica, Arial, sans-serif" font-size="${taille}" font-weight="600" fill="#151515">${m}</text></g>`;
    cx += w + 3;
    return g;
  }).join('');
}
/** Écran de téléphone. */
function ecranGsm(id, titre, contenu, { w = 220, h = 320 } = {}) {
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="#2C2622"/>
    <g transform="rotate(-3 ${w / 2} ${h / 2})"><rect x="40" y="14" width="${w - 80}" height="${h - 28}" rx="16" fill="#0E0F12"/>
    <rect x="46" y="30" width="${w - 92}" height="${h - 60}" rx="4" fill="#F4F5F7"/>
    <rect x="46" y="30" width="${w - 92}" height="22" fill="#E3E6EA"/><text x="${w / 2}" y="45" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="9" font-weight="700" fill="#222">${titre}</text>
    ${contenu}</g>${finPhoto(id, w, h, 0.1)}`);
}
/** Une façade de la rue d'Havré, de nuit : vitrine, enseigne, affiche éventuelle. */
function facade(x, w, { enseigne, couleur = '#4A4C55', vitrine = '#2E3A44', affiche = false, eclaire = false, croix = false } = {}) {
  return `<g transform="translate(${x} 0)">
    <rect width="${w}" height="250" y="20" fill="${couleur}"/>
    ${[0, 1].map((k) => `<rect x="${w * 0.18 + k * w * 0.38}" y="44" width="${w * 0.26}" height="46" fill="${eclaire ? '#E9C877' : '#1F232A'}" opacity="${eclaire ? 0.75 : 0.9}"/>`).join('')}
    <rect x="6" y="122" width="${w - 12}" height="18" fill="#1C1E22"/>
    <text x="${w / 2}" y="135" text-anchor="middle" ${MONO} font-size="9" fill="${eclaire ? '#F2D58A' : '#C9C3B4'}">${enseigne}</text>
    <rect x="10" y="146" width="${w - 20}" height="96" fill="${eclaire ? '#C99A4A' : vitrine}" opacity="${eclaire ? 0.85 : 1}"/>
    <path d="M10 146h${w - 20}" stroke="#14161A" stroke-width="3"/>
    ${affiche ? `<rect x="${w / 2 - 26}" y="160" width="52" height="70" fill="#F4F2EC"/><g fill="#1A1A1A">${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${w / 2 - 21}" y="${168 + k * 9}" width="${[42, 34, 40, 30, 38, 22][k]}" height="4"/>`).join('')}</g>` : ''}
    ${croix ? `<g transform="translate(${w - 18} 104)"><rect x="-8" y="-3" width="16" height="6" fill="#3BD16F"/><rect x="-3" y="-8" width="6" height="16" fill="#3BD16F"/></g>` : ''}
    <rect x="10" y="146" width="${w - 20}" height="96" fill="none" stroke="#14161A" stroke-width="2"/>
  </g>`;
}
/** La rue d'Havré de nuit, après la drache (scène et une). */
function decorRue(id) {
  return `<defs>
      <linearGradient id="${id}ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14171F"/><stop offset="1" stop-color="#2A2D36"/></linearGradient>
      <linearGradient id="${id}pave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3530"/><stop offset="1" stop-color="#1E1B18"/></linearGradient>
      <radialGradient id="${id}lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE3A0" stop-opacity=".55"/><stop offset="1" stop-color="#FFE3A0" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}flash" cx="45%" cy="45%" r="75%"><stop offset="0" stop-color="#FFF6E0" stop-opacity=".12"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
      <filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .5 0"/></filter>
      <pattern id="${id}p" width="18" height="9" patternUnits="userSpaceOnUse"><rect width="18" height="9" fill="none"/><path d="M0 8.5H18M9 0V9" stroke="#14110E" stroke-width="1"/></pattern>
    </defs>
    <rect width="680" height="380" fill="url(#${id}ciel)"/>
    ${facade(0, 104, { enseigne: 'LE JARDIN D’HAVRÉ', couleur: '#4C4A44', vitrine: '#2E4034', affiche: true })}
    ${facade(108, 92, { enseigne: 'IMPRIM’HAVRÉ', couleur: '#46484E', affiche: true })}
    ${facade(204, 96, { enseigne: 'LIBRAIRIE DUFRASNE', couleur: '#52463C', vitrine: '#3A3428' })}
    ${facade(304, 112, { enseigne: 'LE COMPTOIR D’HAVRÉ', couleur: '#4E4034', eclaire: true })}
    ${facade(420, 92, { enseigne: 'PHARMACIE', couleur: '#4A4E52', affiche: true, croix: true })}
    <g transform="translate(516 0)"><rect width="74" height="250" y="20" fill="#3E4048"/><path d="M12 270V170q25 -34 50 0v100z" fill="#0E0F12"/><text x="37" y="160" text-anchor="middle" ${MONO} font-size="9" fill="#BDB7A8">40</text>
      <rect x="28" y="214" width="18" height="12" fill="#C9B24A"/><text x="37" y="223" text-anchor="middle" ${MONO} font-size="5" fill="#222">BOÎTE</text></g>
    ${facade(594, 86, { enseigne: 'ÉVASION', couleur: '#4A4652', vitrine: '#2A3446', affiche: true })}
    <path d="M0 270H680V380H0Z" fill="url(#${id}pave)"/><rect y="270" width="680" height="110" fill="url(#${id}p)" opacity=".5"/>
    <path d="M0 270H680" stroke="#0E0D0C" stroke-width="3"/>
    ${[[360, 300, 90, 10, '#C99A4A'], [150, 318, 60, 7, '#8C9AA6'], [470, 340, 70, 8, '#8C9AA6'], [600, 310, 50, 6, '#9AA6B0']].map(([x, y, rx, ry, c]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity=".28"/>`).join('')}
    <g transform="translate(302 270)"><rect x="-2" y="-220" width="4" height="220" fill="#1A1A1A"/><circle cx="0" cy="-222" r="6" fill="#FFE9B0"/></g><circle cx="302" cy="48" r="60" fill="url(#${id}lamp)"/>
    <g transform="translate(146 292) rotate(-14)"><rect width="22" height="5" fill="#F4F4F0" opacity=".8"/><path d="M22 0q4 2 0 5" fill="#E8E8E2"/></g>
    <rect width="680" height="380" fill="url(#${id}flash)"/>
    <rect width="680" height="380" filter="url(#${id}n)" opacity=".14" style="mix-blend-mode:multiply"/>`;
}

// ───── Photos des pièces ─────
export const PHOTOS_CORBEAU = {
  'c:labo1': (id) => svg(id, 320, 230, `${defsPhoto(id, 320, 230)}<rect width="320" height="230" fill="#26313A"/>
    <rect x="18" y="14" width="284" height="200" fill="#4C6070" opacity=".85"/>
    ${Array.from({ length: 60 }, (_, k) => { const x = 24 + ((k * 47) % 272), y = 20 + ((k * 31) % 186); return (x > 78 && x < 242 && y > 26 && y < 198) ? '' : `<ellipse cx="${x}" cy="${y}" rx="${2 + (k % 3)}" ry="${1.4 + (k % 2)}" fill="#D9DEE2" opacity=".35"/>`; }).join('')}
    <rect x="80" y="28" width="160" height="170" fill="#F6F5F1"/>
    <rect x="80" y="28" width="160" height="170" fill="url(#${id}pl)"/>
    ${['LE PRÉSIDENT', 'SE SERT DANS', 'LA CAISSE DES', 'COLIS DE NOËL.', 'ET DANS LES', 'COMPTES DE CEUX', 'QU’IL « AIDE ».'].map((t, k) => ligne(160, 52 + k * 17, t, { taille: 11, gras: true, police: 'font-family="Impact, Arial Black, sans-serif"', ancre: 'middle' })).join('')}
    ${ligne(160, 186, '— LE CORBEAU D’HAVRÉ', { taille: 7, ancre: 'middle' })}
    <path d="M232 30q8 6 6 14" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".6"/>
    ${ligne(22, 224, 'Film électrostatique A2 · vitrine du Jardin d’Havré · scellé 1/6', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 320, 230, 0.12)}`),

  'c:labo2': (id) => feuille(id, 260, 300, '#3A3C40', -2, `
    ${ruban(40, 56, ['NATHALIE.'])}
    ${ruban(40, 82, ['TES', 'COURONNES', 'ONT-ELLES'])}
    ${ruban(40, 100, ['DÉJÀ', 'SERVI', 'AU', 'CIMETIÈRE', '?'])}
    ${ruban(40, 136, ['TOUTE', 'LA', 'RUE', 'VA', 'LE', 'SAVOIR.'])}
    ${ruban(130, 196, ['LE', 'CORBEAU'])}
    ${ligne(36, 268, 'Lettre n° 2 · reçue le 26/9 · ruban 12 mm · scellé L2', { taille: 6.4, coul: '#666' })}`, { papier: '#FFFFFF' }),

  'c:labo3': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#3E3A36"/>
    ${[0, 1, 2, 3].map((k) => `<g transform="translate(${26 + k * 16} ${30 + k * 34}) rotate(${[-4, 3, -2, 5][k]})"><rect width="200" height="100" fill="#C29A62"/><rect width="200" height="100" fill="none" stroke="#A07C48"/>
      <circle cx="166" cy="26" r="15" fill="none" stroke="#3A3A6A" stroke-width="1.4" opacity=".7"/><text x="166" y="24" text-anchor="middle" ${MONO} font-size="5.6" fill="#3A3A6A" opacity=".8">MONS X</text><text x="166" y="32" text-anchor="middle" ${MONO} font-size="5.6" fill="#3A3A6A" opacity=".8">${['24-9', '25-9', '28-9', '6-10'][k]}</text>
      ${ruban(30, 52, ['RUE', 'D’HAVRÉ', '7000', 'MONS'], { taille: 6, h: 9 })}</g>`).join('')}
    ${ligne(16, 212, 'Enveloppes kraft C5 « Bürokraft » · 10 scellés', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 300, 220, 0.12)}`),

  'c:direct': (id) => svg(id, 640, 180, [0, 1].map((k) => `<svg x="${k * 320}" y="0" width="320" height="180" viewBox="0 0 320 180">${defsPhoto(`${id}${k}`, 320, 180)}
      <rect width="320" height="180" fill="#5A4636"/><rect y="0" width="320" height="70" fill="#6E5644"/><rect x="40" y="88" width="240" height="14" fill="#3A2A1E"/>
      ${[70, 110, 150, 190, 230].map((x, j) => (k === 1 && j === 3) ? `<g transform="translate(${x + 30} 100)"><rect x="-9" y="-46" width="18" height="44" rx="5" fill="#2C2C34"/><circle cy="-54" r="8" fill="#C9A890"/></g>` : `<g transform="translate(${x} 86)"><rect x="-10" y="-26" width="20" height="26" rx="5" fill="${['#3A4A5A', '#5A3A3A', '#2C3A2C', '#2C2C34', '#4A4A3A'][j]}"/><circle cy="-34" r="8" fill="#C9A890"/></g>`).join('')}
      ${k === 1 ? '' : '<g transform="translate(230 86)"><rect x="-10" y="-26" width="20" height="26" rx="5" fill="#2C2C34"/><circle cy="-34" r="8" fill="#C9A890"/></g>'}
      ${Array.from({ length: 14 }, (_, j) => `<circle cx="${20 + j * 22}" cy="${150 + (j % 2) * 10}" r="9" fill="#2A221C"/>`).join('')}
      ${finPhoto(`${id}${k}`, 320, 180, 0.2)}
      <rect x="8" y="6" width="58" height="14" rx="3" fill="#E53935"/><text x="37" y="16" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="8" font-weight="700" fill="#FFF">EN DIRECT</text>
      <text x="312" y="16" text-anchor="end" ${MONO} font-size="9" fill="#FFF">${['21:48:51', '21:49:07'][k]}</text>
      <text x="8" y="172" font-family="Instrument Sans, sans-serif" font-size="8" fill="#FFF">Comité Havré-Centre · réunion d’octobre · 31 spectateurs</text></svg>`).join('') + '<path d="M320 0V180" stroke="#111" stroke-width="3"/>'),

  'c:camville': (id) => svg(id, 320, 180, cadreCam(id, 'CAM 12 · GRAND-PLACE / R. D’HAVRÉ', 'JEU 22:10:04', `<rect width="320" height="180" fill="#2A2C2E"/>
      <path d="M0 0H320V64L214 92H104L0 64Z" fill="#3A3C3E"/><path d="M0 64L104 92V180H0Z" fill="#4A4C4E"/><path d="M320 64L214 92V180H320Z" fill="#45474A"/>
      <path d="M104 92H214L300 180H20Z" fill="#5A5C5E"/><g fill="#F2F0E0"><circle cx="70" cy="34" r="4"/><circle cx="250" cy="30" r="4"/></g>
      <g transform="translate(150 150)"><circle cx="-16" cy="18" r="11" fill="none" stroke="#DDD" stroke-width="2"/><circle cx="18" cy="18" r="11" fill="none" stroke="#DDD" stroke-width="2"/><path d="M-16 18L0 0L18 18M0 0L-4 -10" stroke="#DDD" stroke-width="2" fill="none"/>
        <path d="M-6 -12q4 -22 12 -26l4 12q-6 8 -8 22z" fill="#E8E070"/><circle cx="6" cy="-42" r="6" fill="#1A1A1A"/><rect x="-14" y="-44" width="34" height="6" rx="3" fill="#111" transform="rotate(-28 2 -41)"/></g>`)),

  'c:sonnette': (id) => svg(id, 320, 200, `${defsPhoto(id, 320, 200, { gris: true })}<clipPath id="${id}c"><ellipse cx="160" cy="100" rx="158" ry="98"/></clipPath>
    <g clip-path="url(#${id}c)" style="filter:grayscale(1) contrast(1.1)"><rect width="320" height="200" fill="#3A3836"/><path d="M0 120Q160 90 320 120V200H0Z" fill="#555250"/>
      <g stroke="#454240" stroke-width="1">${Array.from({ length: 10 }, (_, k) => `<path d="M${k * 36} 200Q${160} 110 ${320 - k * 36} 200" fill="none"/>`).join('')}</g>
      <g transform="translate(150 70)"><path d="M-14 0L-18 92h12l4 -70l4 70h12L30 0z" fill="#1C1C22"/><path d="M-22 92h18v8h-20zM10 92h18l2 8h-20z" fill="#262626"/><path d="M-22 99h20M10 99h20" stroke="#D8D4C8" stroke-width="2.4"/>
        <rect x="26" y="-4" width="10" height="56" rx="5" fill="#ECEAE2" transform="rotate(12 31 24)"/></g></g>
    <ellipse cx="160" cy="100" rx="158" ry="98" fill="none" stroke="#111" stroke-width="4"/>
    ${finPhoto(id, 320, 200, 0.3)}
    <text x="40" y="26" ${MONO} font-size="9" fill="#F5F5F5">PHARMACIE D’HAVRÉ · SONNETTE</text><text x="282" y="186" text-anchor="end" ${MONO} font-size="9" fill="#F5F5F5">JEU 21:52:14</text>`),

  'c:septieme': (id) => svg(id, 260, 320, `${defsPhoto(id, 260, 320)}<rect width="260" height="320" fill="#4A4038"/>
    <rect x="40" y="0" width="180" height="320" fill="#5E3A2A"/><rect x="40" y="0" width="180" height="320" fill="none" stroke="#2A1A10" stroke-width="5"/>
    <rect x="56" y="110" width="148" height="150" fill="#F6F5F1"/>
    ${['MADAME ODILE.', 'NE SIGNEZ', 'RIEN LUNDI.', 'CELUI QUI', 'VOUS AIDE', 'VOUS VOLE.'].map((t, k) => ligne(130, 134 + k * 22, t, { taille: 15, gras: true, police: 'font-family="Impact, Arial Black, sans-serif"', ancre: 'middle' })).join('')}
    <circle cx="196" cy="180" r="5" fill="#C9A85A"/>
    <g transform="translate(222 110)"><rect width="8" height="150" fill="#F5F2E8" stroke="#333" stroke-width=".5"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<rect y="${k * 19}" width="8" height="9" fill="#C62828"/>`).join('')}</g>
    ${ligne(228, 302, '1,40 m', { taille: 7, coul: '#F5F5F5', ancre: 'middle' })}
    ${ligne(10, 314, 'Cour du n° 40 · porte de Mme Hautecœur · vendredi 9:52', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 260, 320, 0.12)}`),

  'moy:0': (id) => svg(id, 300, 230, `${defsPhoto(id, 300, 230)}<rect width="300" height="230" fill="#3A2E26"/>
    <g transform="rotate(-8 90 120)"><rect x="20" y="60" width="150" height="90" fill="#C29A62"/><path d="M20 60L95 112L170 60" fill="none" stroke="#A07C48" stroke-width="1.2"/>
      ${ruban(34, 120, ['MADAME', 'ODILE', 'HAUTECŒUR'], { taille: 6, h: 9 })}${ruban(52, 136, ['EN', 'MAIN', 'PROPRE'], { taille: 6, h: 9 })}</g>
    <g transform="translate(150 30) rotate(5)"><rect width="130" height="170" fill="#FFFFFF"/>
      ${ruban(10, 22, ['MADAME', 'ODILE.'], { taille: 6.4, h: 10 })}${ruban(10, 46, ['NE', 'SIGNEZ', 'RIEN', 'LUNDI.'], { taille: 6.4, h: 10 })}
      ${ruban(10, 70, ['CELUI', 'QUI', 'VOUS', 'AIDE'], { taille: 6.4, h: 10 })}${ruban(10, 86, ['VOUS', 'VOLE.'], { taille: 6.4, h: 10 })}${ruban(54, 130, ['UNE', 'AMIE.'], { taille: 6.4, h: 10 })}</g>
    ${ligne(14, 222, 'Perquisition Vanderhaegen · tiroir du bureau · pas de timbre', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 300, 230, 0.12)}`),

  'moy:4': (id) => svg(id, 340, 220, `${defsPhoto(id, 340, 220)}<rect width="340" height="220" fill="#2E3236"/>
    <g transform="translate(28 40)"><rect width="74" height="60" rx="6" fill="#1C1C1E"/><rect x="8" y="8" width="58" height="20" rx="3" fill="#F2F2EE"/><text x="37" y="22" text-anchor="middle" ${MONO} font-size="7" fill="#222">12 mm</text><circle cx="22" cy="42" r="9" fill="#333"/><circle cx="52" cy="42" r="9" fill="#333"/></g>
    <path d="M100 76C150 70 170 120 330 110" stroke="#111" stroke-width="16" fill="none"/>
    <path d="M100 76C150 70 170 120 330 110" stroke="#2A2A2E" stroke-width="13" fill="none" id="${id}r"/>
    <text ${MONO} font-size="8" fill="#BFC3C8" letter-spacing="1"><textPath href="#${id}r" startOffset="4%">.IDNUL NEIR ZENGIS EN .ELIDO EMADAM</textPath></text>
    <g transform="translate(120 150)"><rect width="200" height="42" fill="#F4F2EC"/>${ligne(10, 16, 'Ruban encreur déroulé (négatif) :', { taille: 7 })}${ligne(10, 32, '« MADAME ODILE. NE SIGNEZ RIEN LUNDI. »', { taille: 7.4, gras: true })}</g>
    ${ligne(14, 212, 'Perquisition Librairie Dufrasne · bac à papier · cassette usagée', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 340, 220, 0.12)}`),

  'mob:4': (id) => feuille(id, 280, 230, '#3E4A54', 1.5, `
    ${ligne(36, 34, 'COLIS-POINT · REGISTRE DU POINT RELAIS', { taille: 7.5, gras: true })}
    ${ligne(36, 46, 'Librairie Dufrasne · rue d’Havré · ouvert 9:30-18:30', { taille: 6.5, coul: '#555' })}
    <path d="M36 54H246" stroke="#999"/>
    ${[['LUN 10:12', 'Bol.com', 'J. Pire', 'remis'], ['MAR 11:40', 'Zalando', 'S. Cornez', 'remis'], ['MAR 18:41', 'AfficheExpress', 'M. Odon', 'remis'], ['MER 16:05', 'Amazon', 'G. Petit', 'remis']].map((r, k) => `${ligne(36, 72 + k * 22, r[0], { taille: 7.4 })}${ligne(96, 72 + k * 22, r[1], { taille: 7.4 })}${ligne(168, 72 + k * 22, r[2], { taille: 7.4 })}${ligne(214, 72 + k * 22, r[3], { taille: 7.4 })}<path d="M214 ${76 + k * 22}q8 -6 18 0q6 -8 12 2" stroke="#2A3A8A" fill="none"/>`).join('')}
    ${ligne(36, 180, 'Signature du destinataire à la remise.', { taille: 6.5, coul: '#777' })}`),

  'occ:3': (id) => ecranGsm(id, 'Livraisons · jeudi', `
    <rect x="46" y="52" width="128" height="170" fill="#E8EEE4"/>
    <g stroke="#FFFFFF" stroke-width="5"><path d="M50 120H170M110 56V220M60 70L160 200"/></g>
    <path d="M70 70L92 98L104 120L122 140L132 172L150 196" stroke="#1E88E5" stroke-width="3" fill="none"/>
    ${[[70, 70], [104, 120], [132, 172], [150, 196]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#E53935"/>`).join('')}
    ${ligne(108, 114, '22:10', { taille: 6.5, coul: '#1E88E5', gras: true })}${ligne(112, 124, 'r. d’Havré · 18 km/h', { taille: 5, coul: '#333' })}
    ${ligne(52, 240, 'Compte : Ryan L. · 21:30 → 22:45', { taille: 6.5 })}${ligne(52, 252, '6 courses · 0 arrêt hors adresse', { taille: 6.5 })}`),

  'd:lettre': (id) => feuille(id, 260, 200, '#3E4A54', 3, `
    ${ruban(36, 50, ['VOUS', 'COMPTEZ', 'LES', 'LETTRES', '?'])}
    ${ruban(36, 74, ['IL', 'EN', 'MANQUE', 'UNE.'])}
    ${ruban(36, 98, ['LA', 'PREMIÈRE.'])}
    ${ruban(36, 122, ['LE', 'PRÉSIDENT', 'SAIT', 'OÙ', 'ELLE', 'EST.'])}
    ${ligne(36, 166, 'Sans timbre · boîte du commissariat', { taille: 6.6, coul: '#777' })}`, { papier: '#FFFFFF' }),
};

// ───── La scène à fouiller ─────
export const POINTS_SCENE_CORBEAU = [
  { k: 'fleuriste', n: 1, x: 52, y: 214, titre: 'La vitrine du fleuriste', texte: 'L’affiche est parfaitement lisse, sans une bulle. Tout autour, la vitrine garde les petites taches blanches que laisse la pluie en séchant. Sous l’affiche, que le labo a soulevée d’un coin, la vitre est propre.' },
  { k: 'imprimerie', n: 2, x: 154, y: 214, titre: 'Imprim’Havré', texte: 'Une affiche, comme chez le fleuriste. Derrière, scotchée à l’intérieur de la vitrine, une feuille : « Grand format indisponible jusqu’à nouvel ordre (panne). Merci de votre compréhension. »' },
  { k: 'librairie', n: 3, x: 252, y: 214, titre: 'La Librairie Dufrasne', texte: 'Pas d’affiche sur cette vitrine. Sur la porte, un autocollant « Point relais Colis-Point » et les horaires : du mardi au samedi, 9:30-18:30. Elle est à quinze mètres de la porte du café.' },
  { k: 'comptoir', n: 4, x: 360, y: 190, titre: 'Le Comptoir d’Havré', texte: 'La salle de la réunion, éclairée. Au fond, un téléphone sur un pied, tourné vers la table du bureau. Une porte vitrée, derrière le bar, donne sur une petite cour.' },
  { k: 'pharmacie', n: 5, x: 466, y: 214, titre: 'La pharmacie', texte: 'Une affiche sur la vitrine. Au-dessus de la porte, une sonnette vidéo, l’objectif tourné vers le trottoir.' },
  { k: 'porche', n: 6, x: 553, y: 236, titre: 'Le porche du n° 40', texte: 'Un porche ouvert mène à une cour pavée et, au fond, à une petite maison basse. Dans le porche, la boîte aux lettres : « O. Hautecœur ». Le facteur passe en fin de matinée.' },
  { k: 'evasion', n: 7, x: 637, y: 214, titre: 'L’agence Évasion', texte: 'Une affiche, posée juste au-dessus d’une publicité pour un circuit à Malte. Même hauteur que sur les autres vitrines, à hauteur d’homme.' },
  { k: 'papier', n: 8, x: 154, y: 300, titre: 'Sur les pavés', texte: 'Devant l’imprimerie, un petit ruban de papier blanc, glacé d’un côté, enroulé sur lui-même, encore sec. Le labo le saisit : du papier siliconé, comme celui qui protège un autocollant ou un film avant la pose.' },
  { k: 'pave', n: 9, x: 400, y: 330, titre: 'La chaussée', texte: 'Les pavés brillent encore ; de petites flaques sous les gouttières. La drache s’est arrêtée une heure avant le passage de la patrouille.' },
  { k: 'lampadaire', n: 10, x: 302, y: 200, titre: 'Le lampadaire', texte: 'Le seul de ce tronçon. Sa lumière n’atteint pas les vitrines du bout de la rue. Aucune caméra communale à cet endroit : la plus proche est à l’angle de la Grand-Place.' },
];

export function sceneCorbeauSvg(sel, vus, esc) {
  return `<svg viewBox="0 0 680 380" role="img" aria-label="La rue d’Havré de nuit, avec dix plots numérotés">${decorRue('sco')}
    ${POINTS_SCENE_CORBEAU.map((p) => `<g class="sf-plot ${sel && sel.k === p.k ? 'on' : ''} ${vus.has(p.k) ? 'vu' : ''}" data-action="scene-pt" data-k="${p.k}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="Plot ${p.n} : ${esc(p.titre)}">
      <circle r="22" fill="transparent"/><path d="M-11 0L0 -20L11 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width="1.2"/><text y="-5" text-anchor="middle" font-family="'Special Elite', monospace" font-size="11" fill="#1D1A15">${p.n}</text></g>`).join('')}
  </svg>`;
}

// ───── Une du journal et vignette de la scène ─────
/** Les vitrines de la rue d'Havré, la nuit, gyrophares (une du journal). */
export function photoUneCorbeau(id = 'un') {
  return `<svg viewBox="0 0 680 380" class="tb-photo-svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${decorRue(id)}
    <defs><radialGradient id="${id}g" cx="18%" cy="80%" r="40%"><stop offset="0" stop-color="rgba(120,170,255,.5)"/><stop offset="1" stop-color="rgba(120,170,255,0)"/></radialGradient></defs>
    <g transform="translate(40 300) scale(2.4)"><rect x="0" y="6" width="44" height="14" rx="3" fill="#E8E8E8"/><rect x="8" y="0" width="26" height="9" rx="2" fill="#D6D6D6"/><rect x="0" y="12" width="44" height="3" fill="#2F6FD3"/><rect x="14" y="-3" width="6" height="3" fill="#63B0FF"/><rect x="21" y="-3" width="6" height="3" fill="#FF6E6A"/><circle cx="9" cy="21" r="3.5" fill="#111"/><circle cx="35" cy="21" r="3.5" fill="#111"/></g>
    <rect width="680" height="380" fill="url(#${id}g)"/></svg>`;
}
/** Vignette de la scène au tableau. */
export function photoSceneCorbeau(id = 'sc') {
  return `<svg viewBox="0 0 680 380" class="tb-photo-svg" aria-hidden="true">${decorRue(id)}</svg>`;
}
