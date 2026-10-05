// Plan de la ville façon « carte routière de nuit » : îlots et rues, parcs, fleuve,
// grands axes avec cartouches, limites de zones, sites sensibles et repères du jeu.
import { S, esc } from './common.js';
import { operationActive } from '../engine/zone.js';
import { territoires, W, H, WW, HH } from './ville.js';
import { makeRng, hashString } from '../engine/rng.js';
import { siteDe } from '../engine/sites.js';
import { GRADES, gradeFor } from '../engine/constants.js';
import { tensionsDe, quartiersFrontaliers, niveauTension } from '../engine/quartiers.js';
import { secteurOuvert } from '../engine/constants.js';
import { milieuDe } from '../engine/nondroit.js';

const C = {
  terre: '#11172C', campagne: '#0D1224', ilot: '#182039', rue: '#252F52', avenue: '#2F3C66', eau: '#0A1030', rive: '#C9D3EE',
  parc: '#15393F', parcFonce: '#11302F', axe: '#6276B0', axeBord: '#0B1022', texte: '#EEF1FA', quartier: '#8290B4',
};
const gradeIdx = (ps) => GRADES.indexOf(gradeFor(ps));
const pseudoDe = (uid) => (S.players && S.players[uid] && S.players[uid].pseudo) || '';
const f1 = (v) => v.toFixed(1);
const pts = (poly) => poly.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');

function bezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
}
function retrecir(poly, c, f) { return poly.map(([x, y]) => [c[0] + (x - c[0]) * f, c[1] + (y - c[1]) * f]); }

/** Pictogrammes des sites (dessinés en blanc dans un cercle de couleur). */
const ICONES = {
  seveso: '<path d="M0 -5.5L5.5 4.5H-5.5Z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M0 -2v3M0 2.6v.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
  stade: '<ellipse rx="5.5" ry="3.8" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M0 -3.8v7.6" stroke="#fff" stroke-width="1"/><circle r="1.3" fill="none" stroke="#fff" stroke-width="1"/>',
  gare: '<rect x="-4" y="-5" width="8" height="8" rx="2" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M-4 -1h8M-2.5 5.5l1-2.5M2.5 5.5l-1-2.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>',
  port: '<path d="M0 -5v10M-4.5 1.5a4.5 4.5 0 0 0 9 0M-2.5 -3h5" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cy="-5.2" r="1.1" fill="#fff"/>',
  prison: '<rect x="-5" y="-4.5" width="10" height="9" rx="1" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M-2 -4.5v9M1.5 -4.5v9" stroke="#fff" stroke-width="1.3"/>',
  hopital: '<path d="M-1.6 -5h3.2v3.4h3.4v3.2h-3.4v3.4h-3.2v-3.4h-3.4v-3.2h3.4z" fill="#fff"/>',
  boite: '<path d="M-1.5 3.5V-4.5l5.5-1.5v8" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><circle cx="-3" cy="3.5" r="1.8" fill="#fff"/><circle cx="2.5" cy="2" r="1.8" fill="#fff"/>',
  centre: '<path d="M-4.5 -2h9l-1 7h-7z" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M-2 -2v-1.5a2 2 0 0 1 4 0V-2" fill="none" stroke="#fff" stroke-width="1.3"/>',
  campus: '<path d="M0 -4.5L6 -1.5 0 1.5-6 -1.5Z" fill="#fff"/><path d="M-3.5 0v3c2.2 1.6 4.8 1.6 7 0v-3" fill="none" stroke="#fff" stroke-width="1.3"/>',
  aerodrome: '<path d="M0 -6c.9 0 1.2 1 1.2 2v2.2l5 3v1.4l-5-1.6v3l1.6 1.2v1.1L0 6.6l-2.8.7V6.2l1.6-1.2v-3l-5 1.6V2.2l5-3V-4c0-1 .3-2 1.2-2z" fill="#fff"/>',
  echangeur: '<circle r="4.8" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M-6.5 0h13M0 -6.5v13" stroke="#fff" stroke-width="1.3"/>',
  parc: '<circle r="5" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M0 -5v10M-5 0h10M-3.5 -3.5l7 7M3.5 -3.5l-7 7" stroke="#fff" stroke-width=".8"/><circle r="1.4" fill="#fff"/>',
};
export const iconeSite = (id, couleur, taille = 18) => `<svg width="${taille}" height="${taille}" viewBox="-9 -9 18 18" aria-hidden="true" style="flex-shrink:0"><circle r="9" fill="${couleur}"/>${ICONES[id] || ''}</svg>`;

/** Emplacement du site d'une zone : un de ses quartiers, loin de l'étiquette de zone. */
function celluleSite(T, tz, site) {
  const q = tz.quartiers.filter((i) => i !== tz.capitale);
  const liste = q.length ? q : tz.quartiers;
  const loin = liste.filter((i) => (T.cells[i].c[0] - tz.label[0]) ** 2 + (T.cells[i].c[1] - tz.label[1]) ** 2 > 26 ** 2);
  const choix = loin.length ? loin : liste;
  return T.cells[choix[Math.abs(hashString(`${tz.uid}:${site.id}`)) % choix.length]];
}

const ND_DEFS = `<pattern id="nd-hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#3A1416"/><path d="M0 0V6" stroke="#B3363A" stroke-width="2.2" stroke-opacity=".55"/></pattern>`;
const ICONE_QG = '<path d="M-5 3.5h10l1-7-3.4 2.6L0 -5.5l-2.6 4.6L-6 -3.5z" fill="#fff"/>';
const ICONE_CADENAS = '<rect x="-4" y="-1" width="8" height="6" rx="1.2" fill="#fff"/><path d="M-2.4 -1v-2a2.4 2.4 0 0 1 4.8 0v2" fill="none" stroke="#fff" stroke-width="1.4"/>';

/**
 * Couche « zone de non-droit » : secteurs du milieu hachurés de rouge (emprise en chiffre),
 * secteurs repris aux couleurs de la zone de référence, Cœur avec sa couronne (ou son cadenas).
 */
function coucheNonDroit(T, st, echelle, { sel = null, chiffres = true } = {}) {
  const nd = st.nonDroit;
  if (!nd) return '';
  const out = [];
  for (const [k, s] of Object.entries(nd.secteurs)) {
    const c = T.cells[Number(k)];
    if (!c) continue;
    const chef = s.chef && st.zones[s.chef];
    const repris = s.statut === 'repris';
    const fill = repris ? (chef ? esc(chef.couleur) : '#4FBF8A') : 'url(#nd-hach)';
    out.push(`<polygon points="${pts(c.poly)}" fill="${fill}" fill-opacity="${repris ? 0.42 : 0.92}" stroke="${String(sel) === k ? '#FFFFFF' : repris ? '#4FBF8A' : '#E0625A'}" stroke-width="${String(sel) === k ? 2.6 : 1.3}" stroke-opacity="${String(sel) === k ? 1 : 0.8}" vector-effect="non-scaling-stroke" data-action="secteur" data-c="${k}" style="cursor:pointer"><title>${esc(c.nom)} · ${esc(milieuDe(s).titre)} · ${repris ? `repris${chef ? ` (${esc(chef.nom)})` : ''}` : 'aux mains du milieu'} · emprise ${Math.round(s.emprise)}</title></polygon>`);
  }
  for (const [k, s] of Object.entries(nd.secteurs)) {
    const c = T.cells[Number(k)];
    if (!c) continue;
    const repris = s.statut === 'repris';
    let inner;
    if (s.coeur) {
      const ouvert = secteurOuvert(nd, k);
      inner = `<circle r="9.5" fill="${repris ? '#2E8F5E' : '#8E1F24'}" stroke="#0C1124" stroke-width="1.4"/>${ouvert || repris ? ICONE_QG : ICONE_CADENAS}`;
    } else if (repris) {
      inner = '<circle r="6.5" fill="#2E8F5E" stroke="#0C1124" stroke-width="1.2"/><path d="M-3 0l2 2.2L3.2 -2.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
    } else inner = '';
    const chiffre = chiffres ? `<text y="${s.coeur ? 19 : inner ? 15 : 3}" text-anchor="middle" class="ndn">${Math.round(s.emprise)}</text>` : '';
    out.push(`<g transform="translate(${f1(c.c[0])} ${f1(c.c[1])}) scale(${f1(echelle)})" style="pointer-events:none">${inner}${chiffre}</g>`);
  }
  return out.join('');
}

/** Gros plan sur la zone de non-droit et les zones qui la bordent (écran Terrain). */
export function planNonDroit(st, me, sel = null) {
  const T = territoires(S.config.seed, Object.values(st.zones));
  const nd = T.nd.cells;
  const autour = [...new Set(nd.flatMap((i) => T.adj[i]))].filter((i) => !nd.includes(i));
  const pp = [...nd, ...autour].flatMap((i) => T.cells[i].poly);
  let x0 = Math.min(...pp.map((p) => p[0])), x1 = Math.max(...pp.map((p) => p[0])), y0 = Math.min(...pp.map((p) => p[1])), y1 = Math.max(...pp.map((p) => p[1]));
  const ndp = nd.flatMap((i) => T.cells[i].poly);
  // Cadre centré sur la zone de non-droit, rapport 16/10, avec un peu de ses voisins autour.
  const cx = (Math.min(...ndp.map((p) => p[0])) + Math.max(...ndp.map((p) => p[0]))) / 2, cy = (Math.min(...ndp.map((p) => p[1])) + Math.max(...ndp.map((p) => p[1]))) / 2;
  let w = Math.max(Math.max(...ndp.map((p) => p[0])) - Math.min(...ndp.map((p) => p[0])), (Math.max(...ndp.map((p) => p[1])) - Math.min(...ndp.map((p) => p[1]))) * 16 / 10) * 1.2;
  w = Math.min(w, x1 - x0); const h = w * 10 / 16;
  x0 = cx - w / 2; y0 = cy - h / 2;
  const echelle = w / W;
  const zoneOf = (i) => (T.owner[i] >= 0 ? st.zones[T.order[T.owner[i]]] : null);
  const moi = T.zones.find((x) => x.uid === me.uid);
  const fond = [...autour].map((i) => {
    const z = zoneOf(i);
    const mine = moi && moi.quartiers.includes(i);
    return `<polygon points="${pts(T.cells[i].poly)}" fill="${z ? C.ilot : C.campagne}"/>${z ? `<polygon points="${pts(T.cells[i].poly)}" fill="${esc(z.couleur)}" fill-opacity="${mine ? 0.45 : 0.22}" stroke="${mine ? '#FFB23F' : esc(z.couleur)}" stroke-opacity="${mine ? 0.95 : 0.4}" stroke-width="${mine ? 2 : 0.8}" vector-effect="non-scaling-stroke"/>` : ''}`;
  }).join('');
  // Noms des zones qui bordent : une étiquette par zone, sur son quartier le plus proche du centre.
  const vus = new Set();
  const noms = autour.slice().sort((a, b) => T.d0[a] - T.d0[b]).map((i) => {
    const z = zoneOf(i);
    if (!z || vus.has(z.uid)) return '';
    vus.add(z.uid);
    const c = T.cells[i].c;
    return `<text x="${f1(c[0])}" y="${f1(c[1])}" text-anchor="middle" class="ndz" style="fill:${esc(z.couleur)}">${esc(z.nom.toUpperCase().slice(0, 12))}${z.uid === me.uid ? ' ·  TOI' : ''}</text>`;
  }).join('');
  const nomsND = nd.map((i) => `<text x="${f1(T.cells[i].c[0])}" y="${f1(T.cells[i].c[1] - 9 * echelle)}" text-anchor="middle" class="ndq">${esc(T.cells[i].nom.toUpperCase())}</text>`).join('');
  return `<svg viewBox="${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}" width="100%" role="img" aria-label="Zone de non-droit : secteurs du centre et zones qui la bordent" style="display:block;border-radius:12px;aspect-ratio:16/10;background:${C.campagne}">
    <defs>${ND_DEFS}</defs>
    <style>
      text{pointer-events:none}
      .ndn{font-family:'Instrument Sans',monospace;font-weight:700;font-size:9px;fill:#fff;paint-order:stroke;stroke:#0C1124;stroke-width:2.6px}
      .ndq{font-family:'Instrument Sans',sans-serif;font-weight:700;font-size:${f1(5.4 * echelle)}px;fill:#F3D9D9;letter-spacing:.6px;paint-order:stroke;stroke:#0C1124;stroke-width:2px}
      .ndz{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:${f1(8 * echelle)}px;letter-spacing:.8px;paint-order:stroke;stroke:#0C1124;stroke-width:2.6px}
    </style>
    ${fond}${coucheNonDroit(T, st, echelle, { sel })}${nomsND}${noms}
  </svg>`;
}

export function planVille(st, me, { zoom = false, chaleur = true, liens = [] } = {}) {
  const zonesArr = Object.values(st.zones);
  const T = territoires(S.config.seed, zonesArr);
  const zoneOf = (k) => st.zones[T.order[k]];
  const moi = T.zones.find((x) => x.uid === me.uid);
  const rng = makeRng(`${S.config.seed}:plan`);

  // Cadrage : tout le district (qui s'agrandit avec les zones), ou ma zone.
  const poss = [...T.zones.flatMap((tz) => tz.quartiers), ...T.nd.cells];
  const cadre = (cellsIdx, marge, minW) => {
    const pp = cellsIdx.flatMap((i) => T.cells[i].poly);
    let x0 = Math.min(...pp.map((p) => p[0])) - marge, x1 = Math.max(...pp.map((p) => p[0])) + marge;
    let y0 = Math.min(...pp.map((p) => p[1])) - marge, y1 = Math.max(...pp.map((p) => p[1])) + marge;
    const r = W / H;
    if (x1 - x0 < minW) { const m = (x0 + x1) / 2; x0 = m - minW / 2; x1 = m + minW / 2; }
    const w = x1 - x0, h = y1 - y0;
    if (w / h > r) { const nh = w / r; y0 -= (nh - h) / 2; y1 = y0 + nh; } else { const nw = h * r; x0 -= (nw - w) / 2; x1 = x0 + nw; }
    const [bx0, by0, bx1, by1] = T.box;
    const vw = Math.min(bx1 - bx0, x1 - x0), vh = Math.min(by1 - by0, y1 - y0);
    x0 = Math.max(bx0, Math.min(bx1 - vw, x0)); y0 = Math.max(by0, Math.min(by1 - vh, y0));
    return [x0, y0, vw, vh];
  };
  // Beaucoup de zones : vue d'ensemble allégée (pas de noms de quartiers ni de sites) et plus de marge autour.
  const dense = !zoom && T.zones.length > 8;
  const [vx, vy, vw, vh] = zoom && moi && moi.quartiers.length ? cadre(moi.quartiers, 14, 0) : poss.length ? cadre(poss, dense ? 34 : 18, W * 0.75) : [(WW - W) / 2, (HH - H) / 2, W, H];
  const vb = `${f1(vx)} ${f1(vy)} ${f1(vw)} ${f1(vh)}`;
  const echelle = vw / W; // textes et repères gardent la même taille à l'écran quand la carte dézoome
  const sc = (x, y, inner) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(echelle)})">${inner}</g>`;

  // Fleuve : un ruban qui s'élargit vers l'estuaire, et un lac.
  const P0 = [-10, HH * 0.58], P1 = [WW * 0.3, HH * 0.7], P2 = [WW * 0.58, HH * 0.28], P3 = [WW + 10, HH * 0.42];
  const bordA = [], bordB = [];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40, a = bezier(Math.max(0, t - 0.01), P0, P1, P2, P3), b = bezier(Math.min(1, t + 0.01), P0, P1, P2, P3), c = bezier(t, P0, P1, P2, P3);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const w = 7 + 12 * t * t + 1.5 * Math.sin(t * 9);
    bordA.push([c[0] - Math.sin(ang) * w, c[1] + Math.cos(ang) * w]);
    bordB.push([c[0] + Math.sin(ang) * w, c[1] - Math.cos(ang) * w]);
  }
  // Monde agrandi : le fleuve continue tout droit jusqu'aux bords.
  const [bx0, , bx1] = T.box;
  if (bx0 < -10) { bordA.unshift([bx0, bordA[0][1]]); bordB.unshift([bx0, bordB[0][1]]); }
  if (bx1 > WW + 10) { bordA.push([bx1, bordA[bordA.length - 1][1]]); bordB.push([bx1, bordB[bordB.length - 1][1]]); }
  const fleuve = [...bordA, ...bordB.reverse()];
  const lac = Array.from({ length: 18 }, (_, k) => { const a = (k / 18) * Math.PI * 2; const r = 1 + 0.18 * Math.sin(a * 3 + 1); return [WW * 0.3 + Math.cos(a) * 34 * r, HH * 0.78 + Math.sin(a) * 22 * r]; });
  const ponts = [0.12, 0.3, 0.46, 0.6, 0.74, 0.88].map((t) => {
    const a = bezier(t - 0.01, P0, P1, P2, P3), b = bezier(t + 0.01, P0, P1, P2, P3), c = bezier(t, P0, P1, P2, P3);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + 90;
    const l = 14 + 12 * t;
    return `<g transform="translate(${f1(c[0])} ${f1(c[1])}) rotate(${ang.toFixed(0)})"><line x1="${-l}" x2="${l}" stroke="${C.axeBord}" stroke-width="4.5"/><line x1="${-l}" x2="${l}" stroke="${C.avenue}" stroke-width="2.6"/></g>`;
  }).join('');

  // Îlots : chaque quartier a sa trame de rues, orientée différemment.
  const angles = [0, 28, -17, 45, 12];
  const ilots = T.cells.map((c) => {
    const z = zoneOf(T.owner[c.i]);
    const mine = z && z.uid === me.uid;
    if (T.owner[c.i] === -2) return `<polygon points="${pts(c.poly)}" fill="${C.ilot}"/><polygon points="${pts(c.poly)}" fill="url(#rues${c.i % angles.length})"/>`;
    // Hors du district : campagne et communes voisines, plus sombres.
    if (!z) return `<polygon points="${pts(c.poly)}" fill="${C.campagne}"/><polygon points="${pts(c.poly)}" fill="url(#rues${c.i % angles.length})" opacity=".35"/>`;
    return `<polygon points="${pts(c.poly)}" fill="${C.ilot}"/><polygon points="${pts(c.poly)}" fill="url(#rues${c.i % angles.length})"/><polygon points="${pts(c.poly)}" fill="${esc(z.couleur)}" fill-opacity="${mine ? 0.3 : 0.24}"/>`;
  }).join('');
  const parcs = rng.shuffle(T.cells.map((c) => c.i)).slice(0, 40).map((i, k) => {
    const c = T.cells[i];
    return `<polygon points="${pts(retrecir(c.poly, c.c, k < 10 ? 0.62 : 0.38))}" fill="${k < 10 ? C.parcFonce : C.parc}" stroke="${C.parc}" stroke-width="1" stroke-linejoin="round"/>`;
  }).join('');
  const avenues = T.edges.map(([, , a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('');

  // Grands axes : l'E42 traverse le district, le ring R5 en fait le tour, la N56 descend vers le sud.
  const prolonge = T.box[0] < -10;
  const e42 = `M${prolonge ? `${T.box[0]} ${HH * 0.2} L` : ''}-5 ${HH * 0.2} C${WW * 0.38} ${HH * 0.3} ${WW * 0.55} ${HH * 0.6} ${WW + 5} ${HH * 0.8}${prolonge ? ` L${T.box[2]} ${HH * 0.8}` : ''}`;
  const n56 = `M${prolonge ? `${WW * 0.58} ${T.box[1]} L` : ''}${WW * 0.58} -5 C${WW * 0.56} ${HH * 0.35} ${WW * 0.44} ${HH * 0.62} ${WW * 0.4} ${HH + 5}${prolonge ? ` L${WW * 0.4} ${T.box[3]}` : ''}`;
  const ring = `M${WW / 2 - W * 0.42} ${HH / 2} a${W * 0.42} ${H * 0.36} 0 1 0 ${W * 0.84} 0 a${W * 0.42} ${H * 0.36} 0 1 0 ${-W * 0.84} 0`;
  const axe = (d) => `<path d="${d}" fill="none" stroke="${C.axeBord}" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path d="${d}" fill="none" stroke="${C.axe}" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  const cartouche = (x, y, txt, fond) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(echelle)})"><rect x="-11" y="-6.5" width="22" height="13" rx="3" fill="${fond}" stroke="#fff" stroke-width="1"/><text y="3.3" text-anchor="middle" class="sh">${txt}</text></g>`;
  const E42 = [[-5, HH * 0.2], [WW * 0.38, HH * 0.3], [WW * 0.55, HH * 0.6], [WW + 5, HH * 0.8]], N56 = [[WW * 0.58, -5], [WW * 0.56, HH * 0.35], [WW * 0.44, HH * 0.62], [WW * 0.4, HH + 5]];
  const pE = bezier(0.36, ...E42);
  const pE2 = bezier(0.62, ...E42);
  const pN = bezier(0.38, ...N56);
  const cartouches = cartouche(pE[0], pE[1], 'E42', '#1E7B4F') + cartouche(pE2[0], pE2[1], 'E42', '#1E7B4F') + cartouche(pN[0], pN[1], 'N56', '#3B6FB6') + cartouche(WW / 2, HH / 2 - H * 0.36 + 1, 'R5', '#3B6FB6');
  const rail = `M${WW * 0.52} -5 C${WW * 0.49} ${HH * 0.3} ${WW * 0.36} ${HH * 0.55} ${WW * 0.22} ${HH + 5}`;

  // Limites de zones (pointillés) et contour de ma zone.
  const limites = T.edges.filter(([i, j]) => T.owner[i] !== T.owner[j]).map(([i, j, a, b]) => {
    const mien = moi && (moi.quartiers.includes(i) !== moi.quartiers.includes(j));
    const bord = T.owner[i] < 0 || T.owner[j] < 0; // limite du district ou de la zone de non-droit
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${mien ? 'class="lm"' : bord ? 'class="ld"' : ''}/>`;
  }).join('');

  // Liseré de couleur à l'intérieur de chaque zone, le long de ses limites : on voit d'un coup d'œil où finit l'une et où commence l'autre.
  const vers = (p, c, d) => { const dx = c[0] - p[0], dy = c[1] - p[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * d, p[1] + dy / l * d]; };
  const liseres = T.edges.filter(([i, j]) => T.owner[i] !== T.owner[j]).flatMap(([i, j, a, b]) => [i, j].map((k) => {
    const z = zoneOf(T.owner[k]);
    if (!z) return '';
    const c = T.cells[k].c, d = 2.4 * echelle;
    const a2 = vers(a, c, d), b2 = vers(b, c, d);
    return `<line x1="${f1(a2[0])}" y1="${f1(a2[1])}" x2="${f1(b2[0])}" y2="${f1(b2[1])}" stroke="${esc(z.couleur)}"/>`;
  })).join('');

  // Zones chaudes : mes quartiers et ceux de mes voisins le long de la frontière, à toucher.
  let chaleurSvg = '', reperesQ = '';
  if (chaleur && moi) {
    const mesT = tensionsDe(st, me);
    const front = quartiersFrontaliers(st, me.uid);
    const tVoisin = (i) => { const z = zoneOf(T.owner[i]); return z ? tensionsDe(st, z)[i] : null; };
    const sel = S.quartierSel != null ? Number(S.quartierSel) : null;
    const pat = (S.draft && S.draft.patrouilles) || {};
    const pc = me.pointChaud;
    const cellule = (i, t, mien) => {
      const n = niveauTension(t);
      return `<polygon points="${pts(T.cells[i].poly)}" fill="${n.couleur}" fill-opacity="${mien ? (i === sel ? 0.5 : 0.36) : 0.22}" ${mien ? '' : 'stroke-dasharray="2 2"'} stroke="${i === sel ? '#FFFFFF' : n.couleur}" stroke-opacity="${i === sel ? 1 : mien ? 0.5 : 0.35}" stroke-width="${i === sel ? 2.4 : 1}" vector-effect="non-scaling-stroke" data-action="quartier" data-c="${i}" style="cursor:pointer"><title>${esc(T.cells[i].nom)} : ${n.nom} (${Math.round(t)})</title></polygon>`;
    };
    chaleurSvg = [...moi.quartiers.map((i) => cellule(i, mesT[i], true)), ...front.map((i) => { const t = tVoisin(i); return t == null ? '' : cellule(i, t, false); })].join('');
    // Repères : point chaud annoncé (flamme) et patrouilles envoyées (écusson bleu avec le nombre d'agents).
    const at = (i, dx, dy, inner) => { const c = T.cells[i].c; return `<g transform="translate(${f1(c[0] + dx * echelle)} ${f1(c[1] + dy * echelle)}) scale(${f1(echelle)})" style="pointer-events:none">${inner}</g>`; };
    if (pc && moi.quartiers.includes(Number(pc.cell))) {
      reperesQ += at(Number(pc.cell), -9, -9, `<circle r="8" fill="#E0625A" stroke="#0C1124" stroke-width="1.4"><animate attributeName="r" values="7;9;7" dur="1.6s" repeatCount="indefinite"/></circle><path d="M0 -5c2.6 2.4 3.6 4.2 3.6 6a3.6 3.6 0 0 1-7.2 0c0-1.2.6-2.4 1.6-3.3.2 1.2.8 1.8 1.4 1.8C-.6 -.6-.8 -3 0 -5z" fill="#fff"/>`);
    }
    for (const [k, a] of Object.entries(pat)) {
      if (!a || !moi.quartiers.includes(Number(k))) continue;
      reperesQ += at(Number(k), 9, 8, `<path d="M0 -8l7 2.6v4.4c0 4.4-3.1 7-7 8.8-3.9-1.8-7-4.4-7-8.8v-4.4z" fill="#63B0FF" stroke="#0C1124" stroke-width="1.3"/><text y="3.4" text-anchor="middle" style="font-family:'Instrument Sans',monospace;font-weight:700;font-size:9px;fill:#0C1124">${a}</text>`);
    }
  }

  // Étiquettes de zones : placées une à une sans se chevaucher (ni chevaucher sites et non-droit),
  // sur un quartier de la zone, dans une pastille sombre pour rester lisibles sur n'importe quel fond.
  const sitesPos = T.zones.map((tz) => { const z = st.zones[tz.uid]; const s = siteDe(z); return s ? { tz, z, s, c: celluleSite(T, tz, s) } : null; }).filter(Boolean);
  const fsN = (dense ? 10.5 : 12) * echelle, fsC = 7 * echelle, ls = 0.6 * echelle;
  const larg = (txt) => txt.length * (fsN * 0.66 + ls) + 10 * echelle;
  const obst = [...sitesPos.map((p) => [p.c.c[0], p.c.c[1], 12 * echelle]),
    ...T.cells.filter((c) => T.owner[c.i] === -2).map((c) => [c.c[0], c.c[1], 11 * echelle])];
  const poses = [];
  const chev = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const zonesLabels = T.zones.map((tz) => ({ tz, z: st.zones[tz.uid] }))
    .sort((a, b) => a.tz.quartiers.length - b.tz.quartiers.length)
    .map(({ tz, z }) => {
      const nom = z.nom.toUpperCase().slice(0, 16);
      // Nom long : sur deux lignes s'il le faut (coupé au mot le plus proche du milieu).
      const mots = nom.split(' ');
      let lignes = [nom];
      if (mots.length > 1 && nom.length > 10) {
        let best = null;
        for (let k = 1; k < mots.length; k++) { const a = mots.slice(0, k).join(' '), b = mots.slice(k).join(' '); const m = Math.max(a.length, b.length); if (!best || m < best[0]) best = [m, [a, b]]; }
        lignes = best[1];
      }
      const code = `ZP ${z.code}${gradeIdx(z.ps) >= 3 ? ` ${'★'.repeat(gradeIdx(z.ps) - 2)}` : ''}${z.peril || z.tutelle ? ' ⚠' : ''}${pseudoDe(tz.uid) && !dense ? ` · ${pseudoDe(tz.uid)}` : ''}`;
      const options = [[nom], ...(lignes.length > 1 ? [lignes] : [])];
      // Seulement les quartiers visibles : une zone hors du cadre n'a pas d'étiquette ramenée au bord.
      const dedans = (c) => c[0] > vx + 4 * echelle && c[0] < vx + vw - 4 * echelle && c[1] > vy + 4 * echelle && c[1] < vy + vh - 4 * echelle;
      const cand = [tz.label, ...tz.quartiers.map((i) => T.cells[i].c)].filter(dedans);
      if (!cand.length) return '';
      let best = null;
      for (const ls2 of options) {
        const w = Math.max(...ls2.map(larg), code.length * fsC * 0.58 + 10 * echelle);
        const h = ls2.length * fsN * 1.05 + fsC * 1.2 + 6 * echelle;
        for (const [k, c] of cand.entries()) {
          const x = Math.max(vx + w / 2 + 2 * echelle, Math.min(vx + vw - w / 2 - 2 * echelle, c[0]));
          const y = Math.max(vy + h / 2 + 2 * echelle, Math.min(vy + vh - h / 2 - 2 * echelle, c[1]));
          const b = { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 };
          let cout = poses.reduce((t, p) => t + chev(b, p) * 40, 0);
          for (const [ox, oy, r] of obst) cout += chev(b, { x0: ox - r, x1: ox + r, y0: oy - r, y1: oy + r }) * 8;
          cout += Math.hypot(x - tz.label[0], y - tz.label[1]) * echelle * 6 + (k ? 20 * echelle * echelle : 0) + (ls2.length > 1 ? 60 * echelle * echelle : 0);
          if (!best || cout < best.cout) best = { cout, b, x, y, w, h, ls2 };
        }
      }
      poses.push(best.b);
      const { x, y, w, h, ls2, b } = best;
      const t0 = b.y0 + 3 * echelle + fsN * 0.82;
      return `<g class="zlab"><rect x="${f1(b.x0)}" y="${f1(b.y0)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(5 * echelle)}" fill="#0C1124" fill-opacity=".78" stroke="${esc(z.couleur)}" stroke-opacity=".9" stroke-width="${tz.uid === me.uid ? 2.2 : 1}" vector-effect="non-scaling-stroke"/>
        ${ls2.map((l, k) => `<text x="${f1(x)}" y="${f1(t0 + k * fsN * 1.05)}" text-anchor="middle" class="zl" style="fill:${esc(z.couleur)}">${esc(l)}</text>`).join('')}
        <text x="${f1(x)}" y="${f1(t0 + (ls2.length - 1) * fsN * 1.05 + fsC * 1.25)}" text-anchor="middle" class="zc">${esc(code)}</text></g>`;
    }).join('');
  const occupe = [...poses.map((b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]), ...sitesPos.map((p) => p.c.c), [WW * 0.3, HH * 0.78]];
  const quartiersLabels = dense ? '' : T.cells.filter((c) => T.owner[c.i] >= 0 && (zoom ? moi && moi.quartiers.includes(c.i) : c.i % 2 === 0 || (moi && moi.quartiers.includes(c.i))))
    .filter((c) => occupe.every((o) => (o[0] - c.c[0]) ** 2 + (o[1] - c.c[1]) ** 2 > (24 * echelle) ** 2))
    .map((c) => `<text x="${f1(c.c[0])}" y="${f1(c.c[1])}" text-anchor="middle" class="ql">${esc(c.nom.toUpperCase())}</text>`).join('');
  const sitesSvg = sitesPos.map(({ z, s, c }) => `<g transform="translate(${f1(c.c[0])} ${f1(c.c[1])}) scale(${f1(echelle)})"><title>${esc(s.nom)} (${esc(s.type)}) · ZP ${esc(z.code)} ${esc(z.nom)}</title>
      <circle r="11" fill="${s.couleur}" fill-opacity=".22"/><circle r="8" fill="${s.couleur}" stroke="#0C1124" stroke-width="1.2"/><g transform="scale(.8)">${ICONES[s.id] || ''}</g>
      ${dense ? '' : `<text y="18" text-anchor="middle" class="sl" style="fill:${s.couleur}">${esc(s.nom)}</text>`}</g>`).join('');

  // Repères du jeu : HP, affaires, opération en cours, événement collectif.
  const pin = (c, inner) => `<g transform="translate(${f1(c.c[0] + 10 * echelle)} ${f1(c.c[1] - 14 * echelle)}) scale(${f1(echelle)})"><path d="M0 9c-5-5.5-8-8.6-8-12.4a8 8 0 0 1 16 0C8 .4 5 3.5 0 9z" fill="#FFB23F" stroke="#0C1124" stroke-width="1.5"/><text y="-.6" text-anchor="middle" class="pn">${inner}</text></g>`;
  const pinsAff = st.affaires.map((a, k) => {
    const tz = T.zones.find((x) => x.uid === a.zone);
    const i = tz ? tz.quartiers[Math.abs(hashString(a.id)) % tz.quartiers.length] : Math.abs(hashString(a.id)) % T.cells.length;
    return pin(T.cells[i], k + 1);
  }).join('');
  const op = operationActive(me, st.turn);
  const opPin = op && moi ? (() => {
    const s = op.site ? sitesPos.find((p) => p.z.uid === me.uid) : null;
    const c = s ? s.c : T.cells[moi.quartiers[Math.abs(hashString(op.id || op.titre)) % moi.quartiers.length]];
    return `<g transform="translate(${f1(c.c[0])} ${f1(c.c[1])}) scale(${f1(echelle)})"><circle r="14" fill="none" stroke="#FF6E6A" stroke-width="2"><animate attributeName="r" values="9;22;9" dur="2s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values="1;0;1" dur="2s" repeatCount="indefinite"/></circle><title>${esc(op.titre)}</title></g>`;
  })() : '';
  const hp = moi ? (() => { const c = T.cells[moi.capitale]; return `<g transform="translate(${f1(c.c[0] - 16 * echelle)} ${f1(c.c[1] + 16 * echelle)}) scale(${f1(echelle)})"><title>Ton hôtel de police</title><circle r="8.5" fill="#0C1124" stroke="#FFB23F" stroke-width="1.5"/><path d="M0 -5l4.5 1.7v2.8c0 2.8-2 4.5-4.5 5.6-2.5-1.1-4.5-2.8-4.5-5.6v-2.8z" fill="#FFB23F"/></g>`; })() : '';
  // Liens entre zones (pactes) : une courbe d'un hôtel de police à l'autre.
  const liensSvg = liens.map((l) => {
    const za = T.zones.find((x) => x.uid === l.a), zb = T.zones.find((x) => x.uid === l.b);
    if (!za || !zb) return '';
    const [x1, y1] = T.cells[za.capitale].c, [x2, y2] = T.cells[zb.capitale].c;
    const mxl = (x1 + x2) / 2, myl = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
    const cx = mxl - dy * 0.18, cy = myl + dx * 0.18;
    const w = l.moi ? 4 : 2.6;
    return `<path d="M${f1(x1)} ${f1(y1)}Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}" fill="none" stroke="#0C1124" stroke-opacity=".7" stroke-width="${w + 2.4}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <path d="M${f1(x1)} ${f1(y1)}Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}" fill="none" stroke="${esc(l.couleur)}" stroke-width="${w}" stroke-linecap="round" ${l.pointille ? 'stroke-dasharray="6 5"' : ''} vector-effect="non-scaling-stroke"/>
      ${[[x1, y1], [x2, y2]].map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4.2 * echelle)}" fill="${esc(l.couleur)}" stroke="#0C1124" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`).join('')}`;
  }).join('');
  const mx = vx + vw / 2, my = vy + vh / 2;
  const place = (poss.length ? poss.map((i) => T.cells[i]) : T.cells).reduce((b, c) => ((c.c[0] - mx) ** 2 + (c.c[1] - my) ** 2 < (b.c[0] - mx) ** 2 + (b.c[1] - my) ** 2 ? c : b));
  const star = st.evenement ? `<g transform="translate(${f1(place.c[0])} ${f1(place.c[1] + 20 * echelle)}) scale(${f1(echelle)})"><title>${esc(st.evenement.titre)}</title><circle r="9" fill="#EDF0FA" stroke="#0C1124" stroke-width="1.5"/><path d="M0 -5.5l1.6 3.4 3.7.5-2.7 2.6.7 3.7L0 3 -3.3 4.7l.7-3.7-2.7-2.6 3.7-.5z" fill="#0C1124"/></g>` : '';


  return `<svg viewBox="${vb}" width="100%" role="img" aria-label="Plan du district : ${poss.length} quartiers, ${T.zones.length} zones" style="display:block;border-radius:12px;aspect-ratio:${W}/${H};background:${C.terre}">
    <defs>
      ${angles.map((a, k) => `<pattern id="rues${k}" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(${a})"><path d="M0 0H11M0 0V11" stroke="${C.rue}" stroke-width=".7"/></pattern>`).join('')}
      <clipPath id="cadre"><rect x="${T.box[0]}" y="${T.box[1]}" width="${T.box[2] - T.box[0]}" height="${T.box[3] - T.box[1]}"/></clipPath>
      ${ND_DEFS}
    </defs>
    <style>
      text{pointer-events:none}
      .zl{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:${f1(fsN)}px;fill:${C.texte};letter-spacing:${f1(ls)}px}
      .zc{font-family:'Instrument Sans',monospace;font-size:${f1(fsC)}px;fill:#C9D4E2}
      .ql{font-family:'Instrument Sans',sans-serif;font-weight:600;font-size:${f1(5.6 * echelle)}px;fill:${C.quartier};letter-spacing:.9px;paint-order:stroke;stroke:${C.terre};stroke-width:2px}
      .sl{font-family:'Instrument Sans',sans-serif;font-weight:700;font-size:${f1(6.4 * echelle)}px;paint-order:stroke;stroke:#0C1124;stroke-width:2.4px}
      .sh{font-family:'Instrument Sans',sans-serif;font-weight:700;font-size:7.5px;fill:#fff}
      .ndn{font-family:'Instrument Sans',monospace;font-weight:700;font-size:8px;fill:#fff;paint-order:stroke;stroke:#0C1124;stroke-width:2.4px}
      .ndt{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:${f1(8.5 * echelle)}px;fill:#F08A8A;letter-spacing:1.4px;paint-order:stroke;stroke:#0C1124;stroke-width:2.6px}
      .pn{font-family:'Instrument Sans',monospace;font-weight:700;font-size:8px;fill:#1A1204}
      .av line{vector-effect:non-scaling-stroke}
      .lis line{vector-effect:non-scaling-stroke;stroke-width:2.6;stroke-opacity:.85;stroke-linecap:round}
      .lim line{vector-effect:non-scaling-stroke;stroke:#AFC0D2;stroke-opacity:.55;stroke-width:1.1;stroke-dasharray:3.5 2.5}
      .lim line.ld{stroke:#7C8DA6;stroke-opacity:.8;stroke-width:1.4;stroke-dasharray:none}
      .lim line.lm{stroke:#FFB23F;stroke-opacity:.95;stroke-width:2;stroke-dasharray:none}
    </style>
    <g clip-path="url(#cadre)">
      <rect x="${T.box[0]}" y="${T.box[1]}" width="${T.box[2] - T.box[0]}" height="${T.box[3] - T.box[1]}" fill="${C.campagne}"/>
      ${ilots}${parcs}
      <g class="av" stroke="${C.avenue}" stroke-width="1.5">${avenues}</g>
      <path d="${rail}" fill="none" stroke="#6E7F97" stroke-width="1.2" stroke-dasharray="4 2.5"/>
      <polygon points="${pts(fleuve)}" fill="${C.eau}" stroke="${C.rive}" stroke-width=".8" stroke-opacity=".75" stroke-linejoin="round"/>
      <polygon points="${pts(lac)}" fill="${C.eau}" stroke="${C.rive}" stroke-width=".8" stroke-opacity=".75"/>
      <text transform="translate(${f1(WW * 0.72)} ${f1(HH * 0.35)}) rotate(-20)" text-anchor="middle" class="ql" style="fill:#5D7FB0;font-style:italic;stroke:none;font-size:${f1(9 * echelle)}px">La Delta</text>
      ${ponts}
      ${axe(ring)}${axe(e42)}${axe(n56)}${cartouches}
      <g class="lis">${liseres}</g>
      ${chaleurSvg}
      ${coucheNonDroit(T, st, echelle, { chiffres: !zoom })}
      <g class="lim">${limites}</g>
      ${(() => { const c = T.cells[T.nd.coeur]; return `<text x="${f1(c.c[0])}" y="${f1(c.c[1] - 16 * echelle)}" text-anchor="middle" class="ndt">ZONE DE NON-DROIT</text>`; })()}
      ${quartiersLabels}${sitesSvg}${zonesLabels}${liensSvg}${hp}${star}${pinsAff}${opPin}${reperesQ}
    </g>
  </svg>`;
}
