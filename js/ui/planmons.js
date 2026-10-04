// Plan du centre de Mons (affaire de meurtre) : un dessin simplifié des grands axes et des rues du centre,
// fait à la main pour le jeu. Les temps de trajet ne sont pas calculés ici : chaque lieu ouvre l'itinéraire
// à pied dans Google Maps. Les commerces et les personnes de l'affaire sont fictifs.
import { lieuxMons } from '../engine/meurtre-mons.js';
import { hm } from '../engine/enquete.js';

const W = 880, H = 900;
// Tracés relevés sur un plan du centre (repère 1000 × 1075), mis à l'échelle du plan du tableau.
const T = ([x, y]) => [Math.round(x * 0.88), Math.round(y * 0.838)];
const BOULEVARDS = [
  ['Boulevard Winston Churchill', [[330, 100], [450, 55], [560, 22], [700, 5], [780, 10]]],
  ['', [[780, 10], [870, 35], [905, 85], [930, 250], [945, 440], [938, 515]]],
  ['Boulevard Dolez', [[938, 515], [880, 585], [800, 670], [720, 760], [640, 850], [560, 960], [520, 1074]]],
  ['', [[330, 100], [290, 190], [230, 320], [160, 430], [120, 490], [60, 600], [0, 700]]],
  ['', [[0, 885], [120, 930], [250, 980], [400, 1040], [440, 1074]]],
];
const AXES = [
  ['', [[240, 330], [300, 240], [380, 180], [480, 140], [600, 110], [720, 92], [790, 110], [830, 130]]],
  ['', [[830, 130], [840, 250], [850, 450], [848, 520]]],
  ['', [[848, 520], [800, 600], [700, 690], [620, 780], [560, 860], [540, 905], [470, 950]]],
  ['', [[0, 830], [120, 880], [240, 935], [380, 985], [470, 950]]],
];
const RUES = [
  ['Rue de Nimy', [[505, 470], [555, 410], [600, 340], [640, 270], [680, 200], [710, 120], [720, 92]]],
  ['Rue d’Havré', [[560, 505], [650, 515], [750, 510], [850, 505], [938, 515]]],
  ['Rue de la Clef', [[535, 520], [560, 570], [585, 625], [600, 655]]],
  ['Rue du Hautbois', [[600, 520], [612, 580], [618, 630]]],
  ['Rue de la Halle', [[618, 630], [622, 700], [628, 760]]],
  ['Avenue d’Hyon', [[628, 760], [634, 830], [640, 900]]],
  ['Rue du Gouvernement', [[640, 445], [730, 420], [850, 400]]],
  ['Rue des Dominicains', [[470, 430], [440, 340], [420, 260], [410, 200]]],
  ['Rue des Gaillers', [[440, 340], [380, 290], [330, 250]]],
  ['Rue du Parc', [[470, 120], [490, 200], [495, 260], [480, 330]]],
  ['Rue de la Chaussée', [[500, 500], [465, 560], [440, 620], [420, 690]]],
  ['Rue de Bertaimont', [[420, 690], [405, 780], [395, 880], [385, 990]]],
  ['Rue des Capucins', [[240, 700], [330, 718], [420, 690]]],
  ['Rue de Bouzanton', [[150, 690], [240, 700]]],
  ['Rue Chisaire', [[100, 640], [150, 690]]],
  ['Rue de la Trouille', [[470, 880], [580, 860]]],
  ['Rue Rachot', [[618, 615], [730, 590]]],
  ['', [[40, 500], [130, 528], [240, 535], [350, 540], [420, 510], [500, 490]]],
  ['', [[350, 540], [380, 470], [420, 440], [470, 430]]],
  ['', [[230, 320], [330, 400], [420, 440]]],
  ['', [[160, 430], [280, 470], [380, 470]]],
  ['', [[120, 560], [240, 600], [330, 600], [440, 620]]],
  ['', [[640, 445], [600, 520]]],
  ['', [[750, 510], [760, 600], [730, 590]]],
  ['', [[628, 760], [720, 760]]],
  ['', [[420, 690], [520, 735], [628, 760]]],
  ['', [[240, 700], [260, 800], [300, 900]]],
  ['', [[100, 640], [60, 760], [30, 880]]],
  ['', [[690, 250], [840, 250]]],
  ['', [[600, 340], [700, 330], [845, 330]]],
  ['', [[555, 410], [640, 445]]],
  ['', [[200, 780], [400, 800]]],
  ['', [[300, 240], [330, 250]]],
  ['', [[480, 330], [555, 410]]],
  ['', [[760, 600], [800, 670]]],
  ['', [[520, 735], [480, 880]]],
];
const PIETON = [[468, 452], [545, 440], [572, 500], [535, 532], [482, 522]];
const PARCS = [
  [[520, 150], [600, 172], [592, 232], [520, 212]],
  [[335, 558], [392, 552], [398, 592], [342, 598]],
  [[330, 0], [425, 0], [405, 34], [350, 34]],
  [[0, 300], [70, 250], [120, 330], [40, 380], [0, 380]],
];
const pts = (l) => l.map(T).map(([x, y]) => `${x},${y}`).join(' ');
const chemin = (l) => l.map(T).map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join('');

function etiquettes(liste) {
  return liste.filter(([n]) => n).map(([nom, l]) => {
    // Le plus long tronçon porte le nom.
    let best = null;
    for (let k = 0; k < l.length - 1; k++) { const a = T(l[k]), b = T(l[k + 1]); const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!best || d > best.d) best = { a, b, d }; }
    let ang = Math.atan2(best.b[1] - best.a[1], best.b[0] - best.a[0]) * 180 / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    const mx = (best.a[0] + best.b[0]) / 2, my = (best.a[1] + best.b[1]) / 2;
    const court = nom.length * 4.6 > best.d - 6 ? nom.replace(/^(Rue|Avenue|Boulevard) (du |de la |de l’|des |de |d’)?/, '') : nom;
    return `<text x="${mx}" y="${my}" dy="3" text-anchor="middle" transform="rotate(${ang.toFixed(1)} ${mx} ${my})">${court}</text>`;
  }).join('');
}

/** Le plan du centre de Mons. `crop` : extrait [x, y, w, h] (pour le journal). */
export function planMons(aff, { crop = null, heures = false, id = 'pm' } = {}) {
  const LIEUX_MONS = lieuxMons(aff);
  const sc = LIEUX_MONS[aff.pos];
  const rues = [...RUES, ...(aff.ruesPlan || [])];
  const vb = crop ? crop.join(' ') : `0 0 ${W} ${H}`;
  const [, , cw, ch] = crop || [0, 0, W, H];
  const reperes = Object.values(LIEUX_MONS).filter((l) => l.repere);
  return `<svg class="tb-plan p3 pm" viewBox="${vb}" width="${cw}" height="${ch}" aria-hidden="true">
    <defs><linearGradient id="${id}papier" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1E9D2"/><stop offset="1" stop-color="#E6DABB"/></linearGradient>
      <pattern id="${id}bati" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#E2D5B5"/><rect x="2" y="2" width="9" height="8" rx="1" fill="#D6C7A2"/></pattern></defs>
    <rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" fill="url(#${id}papier)"/>
    <polygon points="${pts([[150, 30], [900, 30], [930, 520], [560, 1000], [200, 960], [80, 640], [180, 330]])}" fill="url(#${id}bati)" opacity=".75"/>
    ${PARCS.map((p) => `<polygon points="${pts(p)}" fill="#C9D9AE"/>`).join('')}
    <path d="${chemin([[0, 245], [60, 200], [130, 150]])}" stroke="#A7C7DA" stroke-width="9" fill="none" stroke-linecap="round"/><text x="22" y="172" class="p3-canal" transform="rotate(-36 22 172)">la Haine</text>
    <g stroke="#7C6E58" stroke-width="2" fill="none">${[0, 9, 18, 27].map((o) => `<path d="${chemin([[-10 + o, 560], [60 + o, 380], [160 + o, 120], [205 + o, 0]])}"/>`).join('')}</g>
    <polygon points="${pts(PIETON)}" fill="#EBD9B4" stroke="#D2B886"/>
    <g stroke="#B9A782" fill="none" stroke-linecap="round" stroke-linejoin="round">${BOULEVARDS.map(([, l]) => `<path d="${chemin(l)}" stroke-width="20"/>`).join('')}${AXES.map(([, l]) => `<path d="${chemin(l)}" stroke-width="15"/>`).join('')}${rues.map(([, l]) => `<path d="${chemin(l)}" stroke-width="11"/>`).join('')}</g>
    <g stroke="#FFF6D9" fill="none" stroke-linecap="round" stroke-linejoin="round">${BOULEVARDS.map(([, l]) => `<path d="${chemin(l)}" stroke-width="15"/>`).join('')}${AXES.map(([, l]) => `<path d="${chemin(l)}" stroke-width="11"/>`).join('')}</g>
    <g stroke="#FFFCF3" fill="none" stroke-linecap="round" stroke-linejoin="round">${rues.map(([, l]) => `<path d="${chemin(l)}" stroke-width="8"/>`).join('')}</g>
    <g class="p3-noms">${etiquettes([...BOULEVARDS, ...rues])}</g>
    <g class="pm-reperes">${reperes.map((l) => `<g transform="translate(${l.x} ${l.y})"><rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="#6B5B3A"/><text x="0" y="-11" text-anchor="middle">${l.nom}</text></g>`).join('')}</g>
    <g class="p3-quartiers"><text x="${T([180, 520])[0]}" y="${T([180, 520])[1]}">GARE</text><text x="${T([600, 300])[0]}" y="${T([600, 300])[1] - 20}">NIMY</text></g>
    <circle cx="${sc.x}" cy="${sc.y}" r="30" fill="none" stroke="#B3261E" stroke-width="3" stroke-dasharray="170 26" transform="rotate(-10 ${sc.x} ${sc.y})"/>
    <text x="${sc.x}" y="${sc.y + 11}" text-anchor="middle" class="tb-croix">✕</text>
    ${heures ? `<text x="${sc.x + 36}" y="${sc.y + 46}" class="tb-heures">${hm(aff.heure)} → ${hm(aff.fin)}</text>` : ''}
    ${crop ? '' : `<g transform="translate(842 828)"><circle r="24" fill="#F1E9D2" stroke="#6B5B3A" stroke-width="1.5"/><path d="M0 -18L5 0L0 18L-5 0Z" fill="#6B5B3A"/><path d="M0 -18L5 0L-5 0Z" fill="#B3261E"/><text x="-4" y="-27" class="p3-n">N</text></g>
    <g transform="translate(16 874)"><rect x="-6" y="-26" width="${W - 84}" height="40" rx="4" fill="#FFFAEC" stroke="#C4B48C" opacity=".95"/>
      <text x="0" y="-8" class="p3-leg">Mons, centre · plan simplifié, pas à l’échelle exacte</text>
      <text x="0" y="7" class="p3-leg2">Les temps de trajet se mesurent à pied sur Google Maps : touche un lieu. Commerces et personnes de l’affaire : fictifs.</text></g>
    <text x="16" y="20" class="p3-n" style="letter-spacing:1px">MONS — LE CENTRE</text>`}
  </svg>`;
}
