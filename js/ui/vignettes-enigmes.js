// Vignettes des énigmes (liste de l'entraînement) : une miniature de l'objet qu'on manipule
// dans chaque énigme (plaque, cadenas, fiche horaire…), dessinée en SVG, sans image à charger.

const FOND = (c) => `<defs><linearGradient id="vg-${c.replace('#', '')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity=".06"/></linearGradient></defs><rect width="96" height="72" fill="#121933"/><rect width="96" height="72" fill="url(#vg-${c.replace('#', '')})"/>`;
const T = (x, y, s, txt, f = '#EDF0FA', w = 700, fam = 'Instrument Sans,sans-serif', a = 'middle') => `<text x="${x}" y="${y}" text-anchor="${a}" font-family="${fam}" font-weight="${w}" font-size="${s}" fill="${f}">${txt}</text>`;

const DESSINS = {
  quiment: (c) => `${FOND(c)}
    <path d="M6 6h38a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H22l-6 6v-6H6a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z" fill="#1C2442" stroke="#3DD39A" stroke-width="1.4"/>${T(25, 18.5, 8.5, 'Il ment.', '#C3C9DE', 600)}
    <path d="M52 22h38a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-10v6l-6-6H52a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z" fill="#1C2442" stroke="#FF6E6A" stroke-width="1.4"/>${T(71, 34.5, 8.5, 'Pas moi !', '#C3C9DE', 600)}
    <circle cx="16" cy="52" r="10" fill="#63B0FF"/>${T(16, 56, 11, 'K', '#0C1124')}
    <circle cx="76" cy="58" r="10" fill="#F08BB4"/>${T(76, 62, 11, 'L', '#0C1124')}`,
  grille: (c) => {
    let s = FOND(c);
    const m = ['✓', '✗', '', '✗', '', '✓', '✗', '', '✗', '', '', '✓'];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
      const x = 22 + k * 16, y = 12 + r * 17, v = m[r * 4 + k];
      s += `<rect x="${x}" y="${y}" width="14" height="15" rx="3" fill="${v === '✓' ? '#16392E' : '#1C2442'}" stroke="${v === '✓' ? '#3DD39A' : '#29345A'}"/>`;
      if (v) s += T(x + 7, y + 11.5, 10, v, v === '✓' ? '#78E2B8' : '#FF9E99');
    }
    for (let r = 0; r < 3; r++) s += `<circle cx="13" cy="${19.5 + r * 17}" r="5" fill="${['#63B0FF', '#F59E5B', '#A78BFA'][r]}"/>`;
    return s;
  },
  chronologie: (c) => `${FOND(c)}
    <path d="M14 10V64" stroke="#29345A" stroke-width="2"/>
    ${['A', 'C', 'B'].map((l, k) => `<circle cx="14" cy="${18 + k * 19}" r="3.5" fill="${c}"/><rect x="24" y="${10 + k * 19}" width="${58 - k * 6}" height="15" rx="4" fill="#1C2442" stroke="#29345A"/>${T(32, 21 + k * 19, 10, l, c, 800)}<rect x="41" y="${16 + k * 19}" width="${30 - k * 6}" height="3" rx="1.5" fill="#67719A"/>`).join('')}`,
  horaires: (c) => `${FOND(c)}
    <rect x="8" y="9" width="18" height="16" rx="4" fill="${c}"/>${T(17, 21, 11, '7', '#0C1124', 800)}
    ${T(31, 16, 7.5, 'DÉPARTS', '#96A0BF', 700, 'Instrument Sans,sans-serif', 'start')}${T(31, 25, 7.5, '07:12 07:20', '#EDF0FA', 600, 'IBM Plex Mono,monospace', 'start')}
    <path d="M14 38V64" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    ${[38, 51, 64].map((y, k) => `<circle cx="14" cy="${y}" r="3.5" fill="#121933" stroke="${c}" stroke-width="2"/><rect x="24" y="${y - 2}" width="${34 - k * 5}" height="4" rx="2" fill="#67719A"/>${T(88, y + 3, 8, `+${k * 4} min`, '#C3C9DE', 600, 'IBM Plex Mono,monospace', 'end')}`).join('')}`,
  photos: (c) => {
    const voit = (x, y, col) => `<rect x="${x}" y="${y}" width="9" height="15" rx="3" fill="${col}" stroke="#0C1124" stroke-width=".8"/><rect x="${x + 1.5}" y="${y + 2}" width="6" height="3" rx="1" fill="#1B2A3A"/>`;
    const photo = (x, y, r, cols) => `<g transform="rotate(${r} ${x + 21} ${y + 17})"><rect x="${x}" y="${y}" width="42" height="34" rx="2" fill="#F4EFE3"/><rect x="${x + 3}" y="${y + 3}" width="36" height="25" fill="#3B4148"/>${cols.map((col, k) => (col ? voit(x + 6 + k * 11, y + 8, col) : '')).join('')}</g>`;
    return `${FOND(c)}${photo(6, 10, -6, ['#C8453B', '#E8ECEF', '#3F6FC4'])}${photo(46, 24, 5, ['#C8453B', null, '#3F6FC4'])}<circle cx="73" cy="44" r="8" fill="none" stroke="#FFB23F" stroke-width="2"/>`;
  },
  plaque: (c) => `${FOND(c)}
    <rect x="6" y="24" width="84" height="24" rx="3" fill="#FFFFFF" stroke="#C8453B" stroke-width="1.5"/>
    <rect x="7" y="25" width="11" height="22" rx="2" fill="#2B4B8A"/>${T(12.5, 43, 7, 'B', '#FFFFFF')}
    ${T(54, 41, 13.5, '1-ABC-234', '#B0283A', 700, 'IBM Plex Mono,monospace')}
    <path d="M30 56l8 6M66 56l-8 6" stroke="#67719A" stroke-width="1.5" stroke-linecap="round"/>${T(48, 68, 7.5, '1-ABE-284 ?', '#96A0BF', 600, 'IBM Plex Mono,monospace')}`,
  ecriture: (c) => `${FOND(c)}
    <rect x="8" y="10" width="62" height="40" rx="3" fill="#F4EFE3" transform="rotate(-4 39 30)"/>
    <path d="M12 38H66" stroke="#9EB7D6" stroke-width=".8" transform="rotate(-4 39 30)"/>
    <g transform="rotate(-4 39 30)">${T(38, 34, 13, 'Je sais tout', '#2E4FA3', 400, 'Caveat,Segoe Print,cursive')}</g>
    <circle cx="70" cy="46" r="11" fill="#FFFFFF" fill-opacity=".12" stroke="#C3C9DE" stroke-width="2.5"/><path d="M78 54l9 9" stroke="#C3C9DE" stroke-width="4" stroke-linecap="round"/>`,
  filature: (c) => {
    let s = FOND(c);
    for (let k = 0; k < 4; k++) s += `<path d="M10 ${12 + k * 16}H86M${16 + k * 22} 6V66" stroke="#29345A" stroke-width="4" stroke-linecap="round"/>`;
    s += `<path d="M16 60V28H60V12" fill="none" stroke="${c}" stroke-width="2.4" stroke-dasharray="4 3" stroke-linecap="round"/>`;
    s += '<circle cx="16" cy="60" r="5" fill="#63B0FF" stroke="#0C1124" stroke-width="1.2"/><circle cx="60" cy="12" r="4.5" fill="#FFB23F" stroke="#0C1124" stroke-width="1.2"/>';
    return s;
  },
  cadenas: (c) => `${FOND(c)}
    <path d="M34 34V24a14 14 0 0 1 28 0v10" fill="none" stroke="#C3C9DE" stroke-width="5"/>
    <rect x="22" y="32" width="52" height="34" rx="9" fill="#C9A13B" stroke="#7A5A12" stroke-width="1.2"/>
    <rect x="28" y="40" width="40" height="18" rx="4" fill="#12141C"/>
    ${['3', '7', '1'].map((d, k) => `<rect x="${31 + k * 12.5}" y="42" width="10" height="14" rx="2" fill="#EDEFF5"/>${T(36 + k * 12.5, 53, 10, d, '#1F2433', 800, 'IBM Plex Mono,monospace')}`).join('')}`,
  code: (c) => `${FOND(c)}
    <rect x="6" y="12" width="56" height="30" rx="2" fill="#F4EFE3" transform="rotate(-3 34 27)"/>
    <g transform="rotate(-3 34 27)">${T(34, 25, 9.5, 'QHVKZ RD', '#1D1A15', 700, 'IBM Plex Mono,monospace')}${T(34, 37, 9.5, 'XFP_M AL', '#1D1A15', 700, 'IBM Plex Mono,monospace')}</g>
    <circle cx="72" cy="48" r="18" fill="#1C2442" stroke="${c}" stroke-width="2"/><circle cx="72" cy="48" r="10" fill="#121933" stroke="#29345A"/>
    ${T(72, 35, 7, 'A', c, 800)}${T(84, 51, 7, 'D', '#96A0BF', 700)}${T(60, 51, 7, 'X', '#96A0BF', 700)}${T(72, 64, 7, 'N', '#96A0BF', 700)}`,
  butin: (c) => {
    const tag = (x, y, r, txt) => `<g transform="rotate(${r} ${x + 18} ${y + 22})"><path d="M${x + 8} ${y}h28v44H${x}V${y + 8}z" fill="#F4EFE3" stroke="#CFC5B0"/><circle cx="${x + 8}" cy="${y + 8}" r="2.5" fill="#121933"/>${T(x + 18, y + 26, 11, txt, '#9A2B1F', 800)}<rect x="${x + 6}" y="${y + 32}" width="24" height="3" rx="1.5" fill="#CFC5B0"/></g>`;
    return `${FOND(c)}${tag(12, 14, -8, '? €')}${tag(48, 12, 7, '€ ×2')}`;
  },
};
const COUL = { quiment: '#63B0FF', grille: '#63B0FF', chronologie: '#63B0FF', horaires: '#63B0FF', photos: '#3DD39A', plaque: '#3DD39A', ecriture: '#3DD39A', filature: '#3DD39A', cadenas: '#FFB23F', code: '#FFB23F', butin: '#FFB23F' };

export const couleurEnigme = (type) => COUL[type] || '#FFB23F';

export function vignetteEnigme(type, ico = '❓') {
  const d = DESSINS[type];
  return d ? `<svg class="vig" viewBox="0 0 96 72" aria-hidden="true">${d(couleurEnigme(type))}</svg>`
    : `<span class="vig vig-ico" aria-hidden="true">${ico}</span>`;
}
