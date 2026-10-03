// Photos des pièces de l'affaire de Mons : images de caméra horodatées, tickets, billet, agenda, scellés…
// L'indice se lit dans l'image elle-même (une heure, un détail), sans être souligné.
// Dessins SVG avec grain photo ; les textes manuscrits utilisent Caveat, les tickets une police à chasse fixe.

const MONO = "font-family=\"'IBM Plex Mono', 'Special Elite', monospace\"";
const MAIN = "font-family=\"Caveat, cursive\"";
const TAPE = "font-family=\"'Special Elite', monospace\"";

/** Grain, vignettage et reflet de flash, communs à toutes les photos. */
function defsPhoto(id, w, h, { gris = false } = {}) {
  return `<defs>
    <filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .6 0"/></filter>
    <filter id="${id}b"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="${id}bb"><feGaussianBlur stdDeviation="3"/></filter>
    <radialGradient id="${id}v" cx="50%" cy="48%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${gris ? 0.55 : 0.4}"/></radialGradient>
    <linearGradient id="${id}pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
  </defs>`;
}
const finPhoto = (id, w, h, grain = 0.18) => `<rect width="${w}" height="${h}" filter="url(#${id}n)" opacity="${grain}" style="mix-blend-mode:multiply"/><rect width="${w}" height="${h}" fill="url(#${id}v)"/>`;
const svg = (id, w, h, inner, cls = 'ip-photo') => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
const plot = (x, y, n) => `<g transform="translate(${x} ${y})"><path d="M-8 0L0 -15L8 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width=".8"/><text x="0" y="-3.5" text-anchor="middle" ${TAPE} font-size="8" fill="#1D1A15">${n}</text></g>`;
const echelle = (x, y) => `<g transform="translate(${x} ${y})"><rect width="60" height="9" fill="#F5F2E8" stroke="#333" stroke-width=".6"/>${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${k * 10}" y="0" width="5" height="9" fill="#222"/>`).join('')}<text x="0" y="17" ${MONO} font-size="6" fill="#222">0 5 cm · DD.55.L3</text></g>`;

/** Rue de la Clef la nuit, vue de la caméra communale (perspective, pluie, réverbères). */
function rueCam(id, pluie, foule) {
  const gouttes = pluie ? Array.from({ length: 70 }, (_, k) => { const x = (k * 53) % 320, y = (k * 37) % 180; return `<path d="M${x} ${y}l-3 9" stroke="#D8D8D8" stroke-width=".7" opacity=".45"/>`; }).join('') : '';
  return `<rect width="320" height="180" fill="#2A2C2E"/>
    <path d="M0 0H320V70L210 96H110L0 70Z" fill="#3A3C3E"/>
    <path d="M0 70L110 96V180H0Z" fill="#4A4C4E"/><path d="M320 70L210 96V180H320Z" fill="#45474A"/>
    <path d="M110 96H210L300 180H20Z" fill="#5A5C5E"/>
    <path d="M110 96L20 180M210 96L300 180" stroke="#6E7072" stroke-width="2"/>
    ${[0, 1, 2, 3, 4].map((k) => `<rect x="${18 + k * 18}" y="${84 - k * 3}" width="10" height="${14 + k}" fill="#6A6C6E" opacity=".6"/>`).join('')}
    <rect x="232" y="78" width="40" height="24" fill="#8A8C70" opacity=".55"/><text x="252" y="93" text-anchor="middle" ${MONO} font-size="6" fill="#222" opacity=".7">CARILLON</text>
    <g fill="#F2F0E0"><circle cx="80" cy="40" r="5" opacity=".9"/><circle cx="240" cy="36" r="5" opacity=".9"/></g>
    <g filter="url(#${id}bb)" fill="#F2F0E0" opacity=".45"><circle cx="80" cy="40" r="18"/><circle cx="240" cy="36" r="18"/></g>
    <path d="M60 180Q140 150 160 120Q170 150 260 180Z" fill="#7A7C7E" opacity="${pluie ? 0.35 : 0}"/>
    ${foule || ''}
    ${gouttes}`;
}
/** Silhouette : manteau long, avec ou sans parapluie, sac contre soi. */
function silhouette(x, y, s, { parapluie, sac, dos }) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    ${parapluie ? '<path d="M-26 -50Q0 -72 26 -50Z" fill="#111"/><path d="M0 -62V-18" stroke="#111" stroke-width="2"/>' : ''}
    <ellipse cx="0" cy="-44" rx="6.5" ry="7.5" fill="#1A1A1A"/>
    <path d="M-10 -36Q-13 -10 -12 22L-5 24L0 0L5 24L12 22Q13 -10 10 -36Q0 -40 -10 -36Z" fill="#161616"/>
    ${sac ? '<rect x="-12" y="-22" width="13" height="16" rx="2" fill="#2C2C2C"/><path d="M-11 -24q6 -6 12 0" stroke="#2C2C2C" stroke-width="1.5" fill="none"/>' : ''}
    ${dos ? '' : '<path d="M-3 -46h6" stroke="#2A2A2A" stroke-width="1"/>'}
  </g>`;
}
function cadreCam(id, titre, heure, inner) {
  return `${defsPhoto(id, 320, 180, { gris: true })}<g style="filter:grayscale(1) contrast(1.15)">${inner}</g>
    <g opacity=".22">${Array.from({ length: 45 }, (_, k) => `<rect y="${k * 4}" width="320" height="1.2" fill="#000"/>`).join('')}</g>
    ${finPhoto(id, 320, 180, 0.35)}
    <text x="8" y="14" ${MONO} font-size="9" fill="#F5F5F5">${titre}</text>
    <text x="312" y="14" text-anchor="end" ${MONO} font-size="9" fill="#F5F5F5">${heure}</text>
    <circle cx="10" cy="171" r="3" fill="#E53935"/><text x="17" y="174" ${MONO} font-size="8" fill="#F5F5F5">REC</text>`;
}

const PHOTOS = {
  'c:cam': (id) => `<div class="ip-duo">${svg(`${id}a`, 320, 180, cadreCam(`${id}a`, 'CAM 07 · GRAND-PLACE / R. DE LA CLEF', '22:04:31', rueCam(`${id}a`, true, silhouette(176, 150, 1.2, { parapluie: true }))))}
    ${svg(`${id}b`, 320, 180, cadreCam(`${id}b`, 'CAM 07 · GRAND-PLACE / R. DE LA CLEF', '22:24:12', rueCam(`${id}b`, true, silhouette(150, 152, 1.25, { parapluie: false, sac: true, dos: true }))))}</div>`,
  'occ:2': (id) => `<div class="ip-duo">${svg(`${id}a`, 220, 300, `${defsPhoto(`${id}a`, 220, 300)}
      <rect width="220" height="300" fill="#6E6A62"/>
      <g transform="rotate(-4 110 150)"><rect x="34" y="40" width="152" height="220" rx="6" fill="#F4F1E6"/><rect x="34" y="40" width="152" height="34" rx="6" fill="#1F4F8C"/><rect x="34" y="62" width="152" height="12" fill="#1F4F8C"/>
        <text x="110" y="62" text-anchor="middle" ${MONO} font-size="11" fill="#FFF" font-weight="600">BILLET · 2e CLASSE</text>
        <text x="48" y="100" ${MONO} font-size="10" fill="#222">DE   MONS</text><text x="48" y="118" ${MONO} font-size="10" fill="#222">À    BRUXELLES-CENTRAL</text>
        <text x="48" y="146" ${MONO} font-size="9" fill="#555">VALABLE LE JOUR MÊME</text><text x="48" y="160" ${MONO} font-size="9" fill="#555">SUR TOUS LES TRAINS</text>
        <text x="48" y="190" ${MONO} font-size="9" fill="#222">ÉMIS  MAR. 21:48</text><text x="48" y="204" ${MONO} font-size="9" fill="#222">AUTOMATE 03 · MONS</text>
        <text x="172" y="252" text-anchor="end" ${MONO} font-size="14" fill="#222" font-weight="600">10,80 €</text>
        <g fill="#222">${Array.from({ length: 28 }, (_, k) => `<rect x="${48 + k * 3.4}" y="214" width="${k % 3 ? 1.4 : 2.4}" height="20"/>`).join('')}</g></g>
      ${finPhoto(`${id}a`, 220, 300, 0.12)}`)}
    ${svg(`${id}b`, 320, 180, cadreCam(`${id}b`, 'GARE DE MONS · QUAI 3', '22:39:47', `<rect width="320" height="180" fill="#3C3E40"/><path d="M0 120H320V180H0Z" fill="#5C5E60"/><path d="M0 118H320" stroke="#D8D060" stroke-width="3" stroke-dasharray="14 8"/>
      <path d="M0 40H320V112H0Z" fill="#2E3032"/>${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${10 + k * 54}" y="54" width="40" height="26" fill="#8C8E80" opacity=".5"/>`).join('')}
      <rect x="200" y="20" width="90" height="16" fill="#111"/><text x="245" y="31" text-anchor="middle" ${MONO} font-size="8" fill="#F2B030">22:43 BRUXELLES</text>
      ${silhouette(120, 168, 1.3, { parapluie: false })}<path d="M108 120l-3 8M134 122l2 8" stroke="#BBB" stroke-width=".8" opacity=".6"/>`))}</div>`,
  'c:legiste2': (id) => svg(id, 200, 300, `${defsPhoto(id, 200, 300)}<rect width="200" height="300" fill="#5E6F64"/>
      <g transform="rotate(3 100 150)"><path d="M40 20H160V270L150 276 140 270 130 276 120 270 110 276 100 270 90 276 80 270 70 276 60 270 50 276 40 270Z" fill="#FBF9F2"/>
      <text x="100" y="44" text-anchor="middle" ${MONO} font-size="12" font-weight="600" fill="#222">LE CARILLON</text><text x="100" y="58" text-anchor="middle" ${MONO} font-size="6.4" fill="#444">Brasserie · rue de la Clef · Mons</text>
      <path d="M50 68H150" stroke="#999" stroke-dasharray="2 2"/>
      <text x="50" y="84" ${MONO} font-size="8.5" fill="#222">MAR.          20:16</text><text x="50" y="96" ${MONO} font-size="8.5" fill="#222">TABLE 4    COUVERTS 1</text>
      <path d="M50 104H150" stroke="#999" stroke-dasharray="2 2"/>
      <text x="50" y="122" ${MONO} font-size="8.5" fill="#222">1 CARBONNADE    17,50</text><text x="50" y="136" ${MONO} font-size="8.5" fill="#222">1 FRITES         4,00</text><text x="50" y="150" ${MONO} font-size="8.5" fill="#222">1 CAFÉ          2,80</text>
      <path d="M50 160H150" stroke="#999" stroke-dasharray="2 2"/><text x="50" y="178" ${MONO} font-size="10" font-weight="600" fill="#222">TOTAL      24,30 €</text>
      <text x="50" y="200" ${MONO} font-size="8" fill="#444">CARTE ****1187</text><text x="100" y="236" text-anchor="middle" ${MONO} font-size="8" fill="#444">Merci et à bientôt !</text></g>
      ${finPhoto(id, 200, 300, 0.12)}`),
  'c:cafe': (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#2B2420"/>
      <rect x="40" y="20" width="220" height="160" rx="12" fill="#B9BDBF"/><rect x="40" y="20" width="220" height="160" rx="12" fill="url(#${id}pl)"/>
      <rect x="64" y="36" width="172" height="96" rx="4" fill="#0F1A12"/>
      <text x="74" y="54" ${MONO} font-size="9" fill="#7CF29A">JOURNAL · DERNIERS CAFÉS</text>
      <text x="74" y="74" ${MONO} font-size="10" fill="#7CF29A">MAR 22:07:41  EXPRESSO</text><text x="74" y="90" ${MONO} font-size="10" fill="#7CF29A">MAR 22:07:12  EXPRESSO</text>
      <text x="74" y="106" ${MONO} font-size="10" fill="#7CF29A" opacity=".75">MAR 16:40:03  LUNGO</text><text x="74" y="122" ${MONO} font-size="10" fill="#7CF29A" opacity=".55">MAR 10:12:55  EXPRESSO</text>
      <g fill="#505456"><circle cx="100" cy="156" r="9"/><circle cx="150" cy="156" r="9"/><circle cx="200" cy="156" r="9"/></g>
      <rect x="64" y="36" width="172" height="96" rx="4" fill="#9CF2B0" opacity=".06" filter="url(#${id}b)"/>
      ${finPhoto(id, 300, 200, 0.16)}`),
  'c:agenda': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#4A3426"/>
      <g transform="rotate(-3 150 110)"><rect x="30" y="18" width="240" height="190" fill="#F6EFD9"/><path d="M150 18V208" stroke="#C8B98F" stroke-width="2"/>
      <g stroke="#D7CCAE">${Array.from({ length: 10 }, (_, k) => `<path d="M160 ${50 + k * 15}H262"/><path d="M38 ${50 + k * 15}H142"/>`).join('')}</g>
      <text x="160" y="40" ${TAPE} font-size="11" fill="#7A2E26">MARDI</text><text x="38" y="40" ${TAPE} font-size="11" fill="#7A2E26">LUNDI</text>
      <text x="44" y="78" ${MAIN} font-size="15" fill="#23335A" textLength="94" lengthAdjust="spacingAndGlyphs">Mertens — réexpertise</text><text x="44" y="108" ${MAIN} font-size="15" fill="#23335A" textLength="90" lengthAdjust="spacingAndGlyphs">S. : 6 pièces de côté</text>
      <text x="166" y="62" ${MAIN} font-size="16" fill="#23335A">10 h banque</text><text x="166" y="92" ${MAIN} font-size="16" fill="#23335A" textLength="92" lengthAdjust="spacingAndGlyphs">14 h livraison Namur</text>
      <text x="166" y="140" ${MAIN} font-size="19" fill="#1B2747">22 h J.M.</text><text x="176" y="162" ${MAIN} font-size="17" fill="#1B2747" textLength="78" lengthAdjust="spacingAndGlyphs">(certificats !)</text><path d="M184 166q30 3 66 -1M184 170q30 3 66 -1" stroke="#1B2747" stroke-width="1.2" fill="none"/></g>
      ${finPhoto(id, 300, 220, 0.14)}`),
  'c:dette': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#5A4636"/>
      <g transform="rotate(2 150 110)"><rect x="40" y="20" width="220" height="180" fill="#FCFBF6"/>
      <text x="150" y="46" text-anchor="middle" ${TAPE} font-size="11" fill="#222">RECONNAISSANCE DE DETTE</text>
      <text x="54" y="74" ${MAIN} font-size="15" fill="#22305A" textLength="190" lengthAdjust="spacingAndGlyphs">Je soussigné Thierry Gobert reconnais</text><text x="54" y="94" ${MAIN} font-size="15" fill="#22305A" textLength="186" lengthAdjust="spacingAndGlyphs">devoir à Henri Delattre la somme de</text>
      <text x="54" y="116" ${MAIN} font-size="18" fill="#22305A" textLength="170" lengthAdjust="spacingAndGlyphs">8 000 € (huit mille euros),</text><text x="54" y="136" ${MAIN} font-size="15" fill="#22305A" textLength="192" lengthAdjust="spacingAndGlyphs">à rembourser au plus tard le 30 septembre.</text>
      <text x="160" y="176" ${MAIN} font-size="20" fill="#22305A">T. Gobert</text></g>
      <g transform="rotate(-7 200 40)"><rect x="168" y="12" width="96" height="70" fill="#F7E36A"/><text x="176" y="36" ${MAIN} font-size="15" fill="#3A2E10" textLength="76" lengthAdjust="spacingAndGlyphs">Relancer T.G.</text><text x="176" y="58" ${MAIN} font-size="15" fill="#3A2E10" textLength="76" lengthAdjust="spacingAndGlyphs">dernier délai !</text></g>
      ${finPhoto(id, 300, 220, 0.12)}`),
  'c:labo': (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#6B5644"/>
      <rect x="0" y="0" width="300" height="80" fill="#8C7863"/><path d="M0 80H300" stroke="#4E3E30" stroke-width="2"/>
      <g transform="translate(70 120)"><ellipse cx="0" cy="22" rx="26" ry="6" fill="#E9E6DF"/><path d="M-14 -6h28l-3 26h-22z" fill="#F4F2EE"/><path d="M14 0q10 0 10 8t-10 6" stroke="#F4F2EE" stroke-width="3" fill="none"/><ellipse cx="0" cy="-6" rx="14" ry="3.4" fill="#4A2E1C"/></g>
      <g transform="translate(200 108)"><rect x="-36" y="18" width="72" height="20" fill="#9AA0A4"/><g stroke="#C7CCD0" stroke-width="2">${[0, 1, 2, 3, 4, 5, 6].map((k) => `<path d="M${-32 + k * 10} 18v-10"/>`).join('')}</g>
        <path d="M-11 18h22l-3 -24h-16z" fill="#F4F2EE"/><ellipse cx="0" cy="-6" rx="8" ry="2.4" fill="#E6E3DC"/><path d="M-9 4h18" stroke="#B9D4E6" stroke-width="1.6" opacity=".8"/></g>
      ${plot(36, 168, 4)}${plot(240, 168, 5)}${echelle(110, 176)}
      <rect width="300" height="200" fill="#FFF8E8" opacity=".08"/>${finPhoto(id, 300, 200, 0.14)}`),
  'r:statue': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#D9D6CE"/>
      <rect x="70" y="16" width="160" height="196" rx="6" fill="rgba(235,240,245,.55)" stroke="#9AA3AA"/><rect x="70" y="16" width="160" height="22" fill="#C0392B" opacity=".85"/>
      <text x="150" y="31" text-anchor="middle" ${MONO} font-size="9" fill="#FFF">SCELLÉ · PIÈCE À CONVICTION</text>
      <g transform="translate(150 132)"><path d="M-28 52h56l-6 -12h-44z" fill="#4A3A22"/><path d="M-20 40q-6 -24 4 -36q-10 -8 -2 -22q8 -10 18 -2q14 4 10 18q8 10 2 22q4 10 -4 20z" fill="#6B5432"/>
        <path d="M-2 -40l22 -24" stroke="#5A4528" stroke-width="3"/><path d="M-14 22q-14 4 -22 -4" stroke="#5A4528" stroke-width="5" fill="none"/>
        <path d="M-24 50h48" stroke="#7A1E1E" stroke-width="2.5" opacity=".7"/><ellipse cx="10" cy="48" rx="6" ry="2" fill="#6A1616" opacity=".6"/></g>
      <rect x="86" y="190" width="128" height="16" fill="#FFF"/><text x="150" y="201" text-anchor="middle" ${MONO} font-size="7.5" fill="#222">PL. LÉOPOLD · MER. 07:40 · S-01</text>
      <path d="M78 40l10 160" stroke="#FFFFFF" stroke-width="6" opacity=".25"/>${finPhoto(id, 300, 220, 0.12)}`),
  'occ:1': (id) => svg(id, 200, 300, `${defsPhoto(id, 200, 300)}<rect width="200" height="300" fill="#3E4A54"/>
      <g transform="rotate(-2 100 150)"><path d="M44 16H156V280H44Z" fill="#FBF9F2"/>
      <text x="100" y="38" text-anchor="middle" ${MONO} font-size="8.5" font-weight="600" fill="#222">LE CARILLON · CAISSE</text><text x="100" y="52" text-anchor="middle" ${MONO} font-size="7" fill="#444">Ouvertures tiroir · mardi</text>
      ${[['20:16', 'VENTE', 'JML'], ['21:31', 'VENTE', 'JML'], ['22:04', 'OUVERTURE', 'JML'], ['22:19', 'OUVERTURE', 'JML'], ['22:33', 'OUVERTURE', 'JML'], ['22:51', 'VENTE', 'JML'], ['23:14', 'CLÔTURE', 'JML']].map(([h, t, c], k) => `<text x="54" y="${80 + k * 18}" ${MONO} font-size="8.5" fill="#222">${h}  ${t.padEnd(10, ' ')} ${c}</text>`).join('')}</g>
      ${finPhoto(id, 200, 300, 0.12)}`),
  'moy:2': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#D7D3C9"/><rect x="0" y="0" width="300" height="220" fill="#BFC7CC" opacity=".4"/>
      <path d="M150 20q-6 -10 6 -12" stroke="#777" stroke-width="2" fill="none"/><path d="M110 40h80" stroke="#8A8A8A" stroke-width="3"/>
      <path d="M112 40q-30 20 -36 70l-6 100h160l-6 -100q-6 -50 -36 -70l-38 30z" fill="#3A3F46"/>
      <path d="M76 110l-20 90h22l12 -70z" fill="#2B3036"/><path d="M224 110l20 90h-22l-12 -70z" fill="#353A41"/>
      <path d="M244 140l6 60h-26z" fill="#22262B" opacity=".9"/><path d="M226 150q14 10 22 40" stroke="#5E7380" stroke-width="5" opacity=".6"/>
      ${[0, 1, 2, 3, 4].map((k) => `<circle cx="${236 + (k % 2) * 6}" cy="${206 + k * 2}" r="1.6" fill="#8FB3C8" opacity=".8"/>`).join('')}
      ${plot(262, 214, 1)}${finPhoto(id, 300, 220, 0.14)}`),
  'moy:4': (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#6B4E3A"/>
      <g transform="rotate(-6 150 100)"><rect x="80" y="44" width="150" height="100" fill="#FBF7EE"/><text x="98" y="86" ${MAIN} font-size="22" fill="#2A3A6A" textLength="120" lengthAdjust="spacingAndGlyphs">Merci pour ce soir.</text><text x="180" y="120" ${MAIN} font-size="24" fill="#2A3A6A">C.</text></g>
      <g transform="translate(46 60)"><path d="M-10 0h20l-4 30h-12z" fill="rgba(240,240,245,.6)" stroke="#CCC"/><path d="M0 30v20M-8 50h16" stroke="#CCC" stroke-width="2"/></g>
      <g transform="translate(262 66)"><path d="M-10 0h20l-4 30h-12z" fill="rgba(240,240,245,.6)" stroke="#CCC"/><path d="M0 30v20M-8 50h16" stroke="#CCC" stroke-width="2"/><path d="M-6 18h12" stroke="#8A1E2E" stroke-width="5" opacity=".5"/></g>
      ${finPhoto(id, 300, 200, 0.14)}`),
};

/** Photo d'une pièce, ou chaîne vide si la pièce n'en a pas. `id` : préfixe unique des motifs SVG. */
export function photoIndice(aff, f, id = 'ip') {
  if (!aff || aff.ville !== 'mons') return '';
  const p = PHOTOS[f];
  return p ? p(`${id}${f.replace(/[^a-z0-9]/gi, '')}`) : '';
}
export const aPhoto = (aff, f) => !!(aff && aff.ville === 'mons' && PHOTOS[f]);
