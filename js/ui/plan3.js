// Plan routier du district (affaires « dossier complet ») : dessiné à partir du même graphe que le moteur,
// pour que ce que l'on voit (rues, ponts, passerelles, zone piétonne, travaux) soit exactement ce qui compte.
import { NOEUDS, TRONCONS, LIEUX, PONTS, ECHELLE, MODES, itineraire, fmtDist } from '../engine/carte3.js';
import { hashString } from '../engine/rng.js';
import { hm } from '../engine/enquete.js';

const W = 880, H = 900;
const P = (n) => NOEUDS[n];
const nid = (r, c) => `n${r}${c}`;

/** Position d'un lieu sur le plan (le lieu hors plan est punaisé au bord est, au départ de la nationale). */
export function posLieu3(k) {
  const l = LIEUX[k];
  if (!l) return null;
  return l.horsPlan ? [862, 646] : [l.x, l.y];
}

// Planques : chacune dans son quartier, sur la bonne rive du canal.
export const PLANQUE_POS3 = {
  'Péniche amarrée': [470, 622], 'Cave du bistrot': [392, 282], 'Box de garage n° 12': [250, 742], 'Lavoir couvert': [445, 712],
  'Ancien cinéma': [716, 722], 'Serre abandonnée': [84, 700], 'Entrepôt frigorifique': [742, 128], 'Grenier d’une ferme': [62, 104],
  'Local de chaufferie': [620, 800], 'Parking souterrain': [226, 466], 'Atelier désaffecté': [806, 360], 'Cabanon de jardin': [232, 828],
  'Galerie de l’ancienne mine': [70, 205], 'Chambre sous les toits': [126, 398], 'Laverie fermée': [724, 842],
};

// Îlots particuliers (rangée, colonne de la case en haut à gauche).
const PARCS = new Set(['32', '60']);
const CHAMPS = new Set(['00']);
const ZONING = new Set(['05', '15']);
const TERRILS = new Set(['10']);

function cellule(r, c) {
  const pts = [nid(r, c), nid(r, c + 1), nid(r + 1, c + 1), nid(r + 1, c)].map(P);
  return pts;
}
const poly = (pts) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Bâtiments d'un îlot : quelques blocs rectangulaires tirés d'après la case (toujours les mêmes). */
function batiments(r, c) {
  const [a, b, d2, d] = cellule(r, c);
  const x0 = Math.max(a.x, d.x) + 12, x1 = Math.min(b.x, d2.x) - 12, y0 = Math.max(a.y, b.y) + 12, y1 = Math.min(d.y, d2.y) - 12;
  if (x1 - x0 < 30 || y1 - y0 < 30) return '';
  let out = '';
  const h = hashString(`bat${r}${c}`) >>> 0;
  const n = 3 + (h % 4);
  for (let k = 0; k < n; k++) {
    const hh = hashString(`b${r}${c}${k}`) >>> 0;
    const w = 22 + (hh % 38), ht = 18 + ((hh >>> 5) % 30);
    const x = x0 + ((hh >>> 9) % Math.max(1, Math.round(x1 - x0 - w)));
    const y = y0 + ((hh >>> 15) % Math.max(1, Math.round(y1 - y0 - ht)));
    out += `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="1.5"/>`;
  }
  return out;
}

function decor() {
  let cases = '', bats = '';
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
    if (r === 4) continue; // le canal
    const k = `${r}${c}`, pts = cellule(r, c);
    if (PARCS.has(k)) {
      cases += `<polygon points="${poly(pts)}" fill="#C9D9AE"/>`;
      const cx = (pts[0].x + pts[2].x) / 2, cy = (pts[0].y + pts[2].y) / 2;
      cases += `<g fill="#86A96E">${[[-30, -20, 9], [10, -28, 11], [32, 6, 8], [-18, 22, 10], [20, 26, 7], [-40, 8, 7]].map(([dx, dy, rr]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="${rr}"/>`).join('')}</g>`;
      cases += `<path d="M${pts[0].x + 16} ${pts[0].y + 18} Q${cx} ${cy + 30} ${pts[2].x - 16} ${pts[2].y - 18}" fill="none" stroke="#E8DDBF" stroke-width="3" stroke-dasharray="1 4" stroke-linecap="round"/>`;
    } else if (CHAMPS.has(k)) {
      cases += `<polygon points="${poly(pts)}" fill="#DCE3B8"/>`;
      cases += `<g stroke="#C7D29C" stroke-width="1.5">${[0, 1, 2, 3, 4, 5, 6].map((q) => `<path d="M${pts[0].x + 10} ${pts[0].y + 16 + q * 15}h${pts[1].x - pts[0].x - 20}"/>`).join('')}</g>`;
    } else if (TERRILS.has(k)) {
      cases += `<polygon points="${poly(pts)}" fill="#D5C9AE"/>`;
      const cx = (pts[0].x + pts[2].x) / 2, cy = (pts[0].y + pts[2].y) / 2;
      cases += `<path d="M${cx - 55} ${cy + 35} L${cx - 8} ${cy - 30} L${cx + 50} ${cy + 35} Z" fill="#8F8370" opacity=".55"/><path d="M${cx - 8} ${cy - 30} L${cx + 6} ${cy + 35}" stroke="#6F6452" stroke-width="1.5" opacity=".6"/>`;
    } else if (ZONING.has(k)) {
      cases += `<polygon points="${poly(pts)}" fill="#DCD6C8"/>`;
      const x0 = Math.max(pts[0].x, pts[3].x) + 14, y0 = Math.max(pts[0].y, pts[1].y) + 14;
      bats += `<rect x="${x0}" y="${y0}" width="70" height="44" rx="2" fill="#BDB4A2"/><rect x="${x0 + 80}" y="${y0 + 6}" width="40" height="60" rx="2" fill="#BDB4A2"/>`;
    } else {
      bats += batiments(r, c);
    }
  }
  return `<g>${cases}</g><g fill="#D2C3A0" stroke="#BCAB84" stroke-width=".8">${bats}</g>`;
}

const STYLE = {
  bd: { c: 19, f: 14 }, rue: { c: 13, f: 9.5 }, pieton: { c: 0, f: 9 }, pont: { c: 16, f: 11 }, passerelle: { c: 0, f: 0 }, nationale: { c: 17, f: 12 },
};
const ligne = (t) => {
  const a = P(t.a), b = P(t.b);
  const bx = b.horsPlan ? W + 10 : b.x;
  return `M${a.x} ${a.y}L${bx} ${b.y}`;
};

function rues(ferme) {
  const vraies = TRONCONS.filter((t) => !t.demi);
  const cas = vraies.filter((t) => STYLE[t.type].c).map((t) => `<path d="${ligne(t)}" stroke-width="${STYLE[t.type].c}" ${t.type === 'pont' ? 'stroke="#7C6E58"' : ''}/>`).join('');
  const fill = vraies.filter((t) => STYLE[t.type].f && t.type !== 'pieton').map((t) => `<path d="${ligne(t)}" stroke-width="${STYLE[t.type].f}" ${t.type === 'bd' || t.type === 'nationale' ? 'stroke="#FFF6D9"' : ''}/>`).join('');
  const pietons = vraies.filter((t) => t.type === 'pieton').map((t) => `<path d="${ligne(t)}"/>`).join('');
  const passerelles = vraies.filter((t) => t.type === 'passerelle').map((t) => `<path d="${ligne(t)}"/>`).join('');
  let travaux = '';
  if (ferme) {
    const t = TRONCONS.find((x) => x.k === ferme);
    if (t) {
      const a = P(t.a), b = P(t.b), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      travaux = `<g transform="translate(${mx} ${my})"><rect x="-17" y="-6" width="34" height="12" rx="2" fill="url(#p3barre)" stroke="#8A1C14" stroke-width="1.2"/>
        <g transform="translate(26 -2)"><rect x="-2" y="-11" width="58" height="17" rx="3" fill="#FFF3D6" stroke="#B3261E"/><text x="27" y="2" text-anchor="middle" class="p3-trav">TRAVAUX</text></g></g>`;
    }
  }
  return `<g stroke="#B9A782" fill="none" stroke-linecap="round">${cas}</g>
    <g stroke="#FFFCF3" fill="none" stroke-linecap="round">${fill}</g>
    <g stroke="#E9D3A6" stroke-width="9" fill="none" stroke-linecap="round">${pietons}</g>
    <g stroke="#C9A974" stroke-width="1.6" stroke-dasharray="1.5 3" fill="none">${pietons}</g>
    <g stroke="#8C6A43" stroke-width="5" fill="none" stroke-linecap="round">${passerelles}</g>
    <g stroke="#F4E9D0" stroke-width="1.8" stroke-dasharray="3 3" fill="none">${passerelles}</g>
    ${travaux}`;
}

function noms() {
  const par = {};
  for (const t of TRONCONS) {
    if (t.demi || t.type === 'nationale' || t.pont !== undefined || t.nom === 'Grand-Place') continue;
    const a = P(t.a), b = P(t.b), l = Math.hypot(b.x - a.x, b.y - a.y);
    if (!par[t.nom] || l > par[t.nom].l) par[t.nom] = { l, a, b };
  }
  return Object.entries(par).map(([nom, { a, b, l }]) => {
    let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const court = nom.length * 4.7 > l - 20 ? nom.replace(/^(Rue|Avenue|Boulevard|Chaussée|Chemin|Route) (du |de la |de l’|des |de )?/, '') : nom;
    return `<text x="${mx}" y="${my}" dy="3" text-anchor="middle" transform="rotate(${ang.toFixed(1)} ${mx} ${my})">${court}</text>`;
  }).join('');
}

function ponts(ferme) {
  return Object.entries(PONTS).map(([c, p]) => {
    const a = P(nid(4, Number(c))), b = P(nid(5, Number(c)));
    const droite = Number(c) === 6, x = (a.x + b.x) / 2 + (droite ? -9 : 9), y = (a.y + b.y) / 2;
    const ferm = ferme === `${nid(4, Number(c))}-${nid(5, Number(c))}`;
    return `<text x="${x}" y="${y - 2}" ${droite ? 'text-anchor="end"' : ''} class="p3-pont ${p.type}">${p.nom.replace(/^Passerelle /, 'Passerelle ')}${ferm ? ' (fermé)' : ''}</text>`;
  }).join('');
}

const QUARTIERS = [
  ['HAUTS-PRÉS', 60, 150], ['ZONING NORD', 700, 30], ['TERRILS', 40, 255], ['BÉGUINAGE', 42, 390], ['LES TANNEURS', 728, 262],
  ['GRAND-PLACE', 450, 290], ['PL. DES MARTYRS', 180, 490], ['QUAI DU CANAL', 380, 636], ['QUARTIER GARE', 180, 730], ['LES MOULINS', 470, 800],
  ['FILATURES', 712, 738], ['CITÉ JARDIN', 50, 735], ['CITÉ NOUVELLE', 585, 760], ['VAL-FLEURI', 190, 856], ['PORTE SUD', 690, 896],
];

/** Le tracé d'un itinéraire (surligné sur le plan) et son étiquette. */
export function traceItineraire(it, mode) {
  if (!it) return '';
  const pts = it.chemin.map(([x, y]) => [Math.min(x, W + 6), y]);
  const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join('');
  const mi = pts[Math.floor(pts.length / 2)];
  const col = { moteur: '#D9480F', velo: '#1B7F4B', pied: '#5B3FA8' }[mode];
  return `<g class="p3-route"><path d="${d}" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>
    <path d="${d}" stroke="${col}" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${mode === 'moteur' ? '0' : mode === 'velo' ? '10 5' : '3 5'}"/>
    <g transform="translate(${Math.min(mi[0], W - 70)} ${mi[1] - 22})"><rect x="-58" y="-17" width="116" height="30" rx="6" fill="#FFFDF6" stroke="${col}" stroke-width="2"/>
    <text x="0" y="4" text-anchor="middle" class="p3-etiq" fill="${col}">${MODES[mode].icone} ${fmtDist(it.m)} · ${it.min} min</text></g></g>`;
}

/**
 * Le plan complet. `route` : { a, b, mode } à surligner ; `heures` : afficher l'heure exacte près de la scène ;
 * `crop` : [x, y, w, h] pour un extrait (le journal) ; `id` : préfixe des motifs SVG.
 */
export function planSvg3(aff, { route = null, heures = false, crop = null, id = 'p3' } = {}) {
  const sc = LIEUX[aff.pos];
  const vb = crop ? crop.join(' ') : `0 0 ${W} ${H}`;
  const [, , cw, ch] = crop || [0, 0, W, H];
  const it = route ? itineraire(route.a, route.b, route.mode, aff.travaux) : null;
  const km = 1000 / ECHELLE;
  return `<svg class="tb-plan p3" viewBox="${vb}" width="${cw}" height="${ch}" aria-hidden="true">
    <defs>
      <pattern id="${id}barre" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#D32F2F"/><rect x="4" width="4" height="8" fill="#FFFFFF"/></pattern>
      <linearGradient id="${id}papier" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1E9D2"/><stop offset="1" stop-color="#E6DABB"/></linearGradient>
    </defs>
    <rect x="-20" y="-20" width="${W + 60}" height="${H + 40}" fill="url(#${id}papier)"/>
    ${decor()}
    <g class="p3-rail"><path d="M0 712 C200 708 420 716 880 702" stroke="#6E6252" stroke-width="5" fill="none"/><path d="M0 712 C200 708 420 716 880 702" stroke="#F1E9D2" stroke-width="2.4" stroke-dasharray="4 6" fill="none"/></g>
    <rect x="186" y="690" width="70" height="20" rx="2" fill="#B9A27C" stroke="#8C7651"/><text x="221" y="704" text-anchor="middle" class="p3-gare">GARE</text>
    <path d="M-20 570 C120 556 260 590 420 580 S700 556 900 572 L900 616 C720 600 560 626 420 622 S140 602 -20 618 Z" fill="#A7C7DA"/>
    <path d="M-20 570 C120 556 260 590 420 580 S700 556 900 572" fill="none" stroke="#86ABC2" stroke-width="2"/>
    <path d="M-20 618 C140 602 280 626 420 622 S720 600 900 616" fill="none" stroke="#86ABC2" stroke-width="2"/>
    <text x="250" y="603" class="p3-canal" transform="rotate(-2 250 603)">canal</text>
    ${rues(aff.travaux)}
    <g class="p3-noms">${noms()}</g>
    <g>${ponts(aff.travaux)}</g>
    <g class="p3-quartiers">${QUARTIERS.map(([t, x, y]) => `<text x="${x}" y="${y}">${t}</text>`).join('')}</g>
    <g transform="translate(828 662)"><path d="M0 -12h34l10 12-10 12h-34z" fill="#FFF6D9" stroke="#8C7651"/><text x="20" y="4" text-anchor="middle" class="p3-n">N90</text></g>
    <text x="874" y="638" text-anchor="end" class="p3-n">Haut-Delta 6 km →</text>
    ${traceItineraire(it, route && route.mode)}
    <circle cx="${sc.x}" cy="${sc.y}" r="34" fill="none" stroke="#B3261E" stroke-width="3" stroke-dasharray="190 30" transform="rotate(-10 ${sc.x} ${sc.y})"/>
    <text x="${sc.x}" y="${sc.y + 12}" text-anchor="middle" class="tb-croix">✕</text>
    ${heures ? `<text x="${sc.x}" y="${sc.y - 42}" text-anchor="middle" class="tb-heures">${hm(aff.heure)} → ${hm(aff.fin)}</text>` : ''}
    ${crop ? '' : `<g transform="translate(838 120)"><circle r="24" fill="#F1E9D2" stroke="#6B5B3A" stroke-width="1.5"/><path d="M0 -18L5 0L0 18L-5 0Z" fill="#6B5B3A"/><path d="M0 -18L5 0L-5 0Z" fill="#B3261E"/><text x="-4" y="-27" class="p3-n">N</text></g>
    <g transform="translate(16 846)"><rect x="-6" y="-24" width="${km + 230}" height="${H - 846 + 18}" rx="4" fill="#FFFAEC" stroke="#C4B48C" opacity=".95"/>
      <path d="M0 0h${km}M0 -5v10M${km / 2} -3v6M${km} -5v10" stroke="#3A352C" stroke-width="2"/>
      <rect x="0" y="-2" width="${km / 2}" height="4" fill="#3A352C"/>
      <text x="0" y="-9" class="p3-n">0</text><text x="${km / 2 - 14}" y="-9" class="p3-n">500 m</text><text x="${km - 12}" y="-9" class="p3-n">1 km</text>
      <text x="${km + 34}" y="-8" class="p3-leg">🚗 2 min/km · 🚲 4 min/km</text><text x="${km + 34}" y="7" class="p3-leg">🚶 12 min/km</text>
      <text x="0" y="22" class="p3-leg2">Passerelles et zone piétonne : vélos et piétons seulement.</text></g>
    <text x="16" y="20" class="p3-n" style="letter-spacing:1px">DISTRICT DELTA — PLAN ROUTIER</text>`}
  </svg>`;
}
