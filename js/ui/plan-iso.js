// Carte isométrique de la saison 2 (vue 3/4) : ma zone ou tout le district en maquette, immeubles éclairés selon la tension,
// maisons, commerces, tours, arbres, rues et lampadaires ; voitures de police animées (une par patrouille envoyée).
// Chaque quartier se touche sur toute sa surface (îlot + volume des immeubles) : data-action="quartier".
// Le dessin fixe est mis en cache par tour ; seuls la sélection et les patrouilles changent à chaque toucher.
import { S } from './common.js';
import { territoires, WW, HH } from './ville.js';
import { bezier } from './plan.js';
import { makeRng } from '../engine/rng.js';
import { tensionsDe, niveauTension } from '../engine/quartiers.js';

let cache = null;
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export function planIso(st, me, { vue = 'mazone', sel = null } = {}) {
  const seed = S.config.seed, reduit = calme();
  const mesT0 = tensionsDe(st, me);
  const cle = [seed, st.season, st.turn, me.uid, vue, reduit, Object.values(st.zones).map((z) => z.uid).sort().join(','), Object.entries(mesT0).map(([k, v]) => `${k}:${Math.round(v)}`).join(','), me.pointChaud ? me.pointChaud.cell : ''].join('|');
  if (!cache || cache.cle !== cle) cache = { cle, svg: dessiner(st, me, seed, vue === 'mazone' ? 'zone' : 'district', reduit) };
  let svg = cache.svg;
  // Patrouilles du soir : une voiture visible par agent (3 au plus), pastille bleue avec le nombre.
  const pat = (S.draft && S.draft.patrouilles) || {};
  for (const [q, n0] of Object.entries(pat)) {
    const n = Math.min(3, n0 || 0);
    for (let k = 0; k < n; k++) svg = svg.replace(`class="pv" data-q="${q}" data-k="${k}" visibility="hidden"`, `class="pv" data-q="${q}" data-k="${k}"`);
    if (n0) svg = svg.replace(new RegExp(`(class="pb" data-q="${q}"[^>]*?) visibility="hidden">([\\s\\S]*?class="iso-pbt">)0<`), `$1>$2${n0}<`);
  }
  if (sel != null) svg = svg.replace(`class="sel" data-q="${sel}" visibility="hidden"`, `class="sel" data-q="${sel}"`).replace(`class="nomq" data-q="${sel}" visibility="hidden"`, `class="nomq" data-q="${sel}"`);
  return svg;
}

function dessiner(st, me, seed, vue, reduit) {
  const patrouilles = {};
  const T = territoires(seed, Object.values(st.zones));
  const moi = T.zones.find((x) => x.uid === me.uid);
  const mes = new Set(moi.quartiers);
  const mesT = tensionsDe(st, me);
  const voisins = new Set(moi.quartiers.flatMap((i) => T.adj[i]).filter((i) => !mes.has(i)));
  const ndSet = new Set(T.nd.cells);
  const zoomZone = vue === 'zone';
  const cellsVue = zoomZone ? [...mes, ...voisins] : T.cells.map((c) => c.i).filter((i) => T.owner[i] >= 0 || ndSet.has(i));
  const C = 0.866, S = 0.5;
  const P = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z];
  const f = (v) => v.toFixed(1);
  const poly = (pp) => pp.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  const pts3 = (pp) => poly(pp.map(([x, y, z]) => P(x, y, z)));
  const inset = (pp, c, k) => pp.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
  const dedans = (pt, pp) => { let ins = false; for (let i = 0, j = pp.length - 1; i < pp.length; j = i++) { const [xi, yi] = pp[i], [xj, yj] = pp[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
  const enveloppe = (pts) => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], hi = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
  const LUM = { calme: '#FFD58A', surveille: '#FFC34D', tendu: '#FF9A3C', chaud: '#FF5A4E' };
  const id = (k) => `${k}-${vue}`;

  // Fleuve.
  const P0 = [-10, HH * 0.58], P1 = [WW * 0.3, HH * 0.7], P2 = [WW * 0.58, HH * 0.28], P3 = [WW + 10, HH * 0.42];
  const axe = [], A = [], B = [];
  for (let k = 0; k <= 60; k++) { const t = k / 60, a = bezier(Math.max(0, t - 0.01), P0, P1, P2, P3), b = bezier(Math.min(1, t + 0.01), P0, P1, P2, P3), c = bezier(t, P0, P1, P2, P3); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), w = 7 + 12 * t * t; axe.push([c, w]); A.push([c[0] - Math.sin(ang) * w, c[1] + Math.cos(ang) * w]); B.push([c[0] + Math.sin(ang) * w, c[1] - Math.cos(ang) * w]); }
  const dansFleuve = (p, m = 4) => axe.some(([c, w]) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 < (w + m) ** 2);

  const cx0 = WW * 0.5, cy0 = HH * 0.5, R = Math.hypot(WW, HH) * 0.45;
  const urb = (p) => Math.max(0, 1 - Math.hypot(p[0] - cx0, p[1] - cy0) / R);

  const ptsVue = cellsVue.flatMap((i) => T.cells[i].poly).map(([x, y]) => P(x, y));
  const xs = ptsVue.map((p) => p[0]), ys = ptsVue.map((p) => p[1]);
  const x0 = Math.min(...xs) - 6, x1 = Math.max(...xs) + 6, y0 = Math.min(...ys) - 46, y1 = Math.max(...ys) + 10;

  const routes = [], sol = [], lueurs = [], objets = [], etiq = [], fumees = [], voitures = [], cibles = [], selections = [];
  for (const i of cellsVue) {
    const c = T.cells[i], mien = mes.has(i), nd = ndSet.has(i);
    const t = mien ? mesT[i] : null, n = mien ? niveauTension(t) : null;
    const rng = makeRng(`${seed}:iso:${i}`);
    routes.push(`<polygon points="${poly(c.poly.map(([x, y]) => P(x, y)))}" fill="#0C1128" stroke="#3A4470" stroke-opacity=".35" stroke-width=".35" stroke-dasharray="1.5 2"/>`);
    const ilot = inset(c.poly, c.c, 0.9);
    const top = ilot.map(([x, y]) => P(x, y, 1.2));
    sol.push(`<polygon points="${poly(ilot.map(([x, y]) => P(x, y)))}" fill="#090D20"/><polygon points="${poly(top)}" fill="${nd ? '#26141B' : mien ? '#1E2A4C' : '#151C36'}" stroke="${mien ? '#33447A' : '#1D2547'}" stroke-width=".5"/>`);
    if (mien || (!zoomZone && rng.next() < 0.3)) for (const [k, v] of c.poly.entries()) { if (k % (zoomZone ? 1 : 2)) continue; const [lx, ly] = P(v[0], v[1], 3); lueurs.push(`<circle cx="${f(lx)}" cy="${f(ly + 3)}" r="${zoomZone ? 5 : 3}" fill="url(#${id('lampe')})"/><circle cx="${f(lx)}" cy="${f(ly)}" r=".7" fill="#FFE2A8"/>`); }
    if (mien) { const [cx, cy] = P(c.c[0], c.c[1]); lueurs.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="40" ry="22" fill="${LUM[n.id]}" opacity="${0.1 + (t / 100) * 0.28}" filter="url(#${id('flou')})"/>`); }

    const u = urb(c.c), capitale = moi.capitale === i;
    const zoneInt = inset(c.poly, c.c, 0.76);
    const bx = [Math.min(...zoneInt.map((q) => q[0])), Math.max(...zoneInt.map((q) => q[0]))], by = [Math.min(...zoneInt.map((q) => q[1])), Math.max(...zoneInt.map((q) => q[1]))];
    const nb = zoomZone ? (mien ? 16 : 12) : 7;
    const poses = capitale ? [[c.c[0], c.c[1], 12]] : [];
    let essais = 0;
    while (poses.length < nb && essais++ < 400) {
      const p = [rng.float(bx[0], bx[1]), rng.float(by[0], by[1])];
      if (!dedans(p, zoneInt) || dansFleuve(p, 3)) continue;
      if (poses.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < (q[2] || 7.5))) continue;
      poses.push(p);
    }
    for (const [k, p] of poses.entries()) {
      const r2 = makeRng(`${seed}:b:${i}:${k}`);
      if (capitale && k === 0) { objets.push({ x: p[0], y: p[1], type: 'hp', n, mien, rng: r2 }); continue; }
      const roll = r2.next();
      let type;
      if (nd) type = roll < 0.45 ? 'entrepot' : roll < 0.7 ? 'ruine' : roll < 0.85 ? 'feu' : 'arbre';
      else if (u > 0.55) type = roll < 0.22 ? 'tour' : roll < 0.6 ? 'immeuble' : roll < 0.8 ? 'commerce' : 'arbre';
      else if (u > 0.3) type = roll < 0.35 ? 'immeuble' : roll < 0.7 ? 'maison' : roll < 0.82 ? 'commerce' : 'arbre';
      else type = roll < 0.6 ? 'maison' : roll < 0.72 ? 'immeuble' : 'arbre';
      objets.push({ x: p[0], y: p[1], type, n, mien, nd, u, rng: r2 });
    }
    if (mien && t >= 55) { const [sx, sy] = P(c.c[0] + 6, c.c[1] - 4, 14); for (let k = 0; k < 3; k++) fumees.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="3" fill="#8A8FA8" opacity="0"><animate attributeName="cy" values="${f(sy)};${f(sy - 26)}" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/><animate attributeName="r" values="2.5;8" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.45;0" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/><animate attributeName="cx" values="${f(sx)};${f(sx + 7)}" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/></circle>`); }

    // Voitures : jusqu'à 3 voitures de police par quartier à moi (une par patrouille), civils ailleurs.
    const tour = c.poly.map(([x, y]) => P(x, y, 0.3));
    const d = `M${tour.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
    const perim = tour.reduce((s, p, k) => s + Math.hypot(p[0] - tour[(k + 1) % tour.length][0], p[1] - tour[(k + 1) % tour.length][1]), 0);
    const mvt = (dur, deb, sens) => reduit ? '' : `<animateMotion dur="${f(dur)}s" begin="${f(deb)}s" repeatCount="indefinite" rotate="auto" keyPoints="${sens ? '0;1' : '1;0'}" keyTimes="0;1" calcMode="linear" path="${d}"/>`;
    if (mien) {
      const nbP = patrouilles[i] || 0, dur = perim / 9;
      for (let k = 0; k < 3; k++) voitures.push(`<g class="pv" data-q="${i}" data-k="${k}" ${k < nbP ? '' : 'visibility="hidden"'}${reduit ? ` transform="translate(${f(tour[k][0])} ${f(tour[k][1])})"` : ''}><rect x="-2.6" y="-1.3" width="5.2" height="2.6" rx=".8" fill="#E9EEF8"/><rect x="-.6" y="-1.3" width="1.6" height="2.6" fill="#1F4FA8"/><circle r="5" fill="#63B0FF" opacity=".28"><animate attributeName="fill" values="#63B0FF;#FF4E4E;#63B0FF" dur=".5s" repeatCount="indefinite"/></circle><rect x="-.3" y="-.9" width=".9" height="1.8" rx=".3" fill="#63B0FF"><animate attributeName="fill" values="#63B0FF;#FF4E4E;#63B0FF" dur=".5s" repeatCount="indefinite"/></rect><path d="M2.4 -1L9 -3.2V3.2L2.4 1Z" fill="#FFE9B0" opacity=".28"/>${mvt(dur, -(dur * k) / 3, k % 2 === 0)}</g>`);
    } else if (rng.next() < (zoomZone ? 0.55 : 0.18)) {
      const dur = perim / 6;
      if (!reduit) voitures.push(`<g><rect x="-2.2" y="-1.1" width="4.4" height="2.2" rx=".7" fill="${['#3C4466', '#5A3A3A', '#2F4B4A'][Math.floor(rng.next() * 3)]}"/><circle cx="-2.2" cy="0" r=".5" fill="#FF4E4E" opacity=".8"/><path d="M2.4 -1L9 -3.2V3.2L2.4 1Z" fill="#FFE9B0" opacity=".16"/>${mvt(dur, -rng.float(0, dur), rng.next() < 0.5)}</g>`);
    }

    if (!zoomZone && nd) cibles.push({ prof: -1, h: `<polygon class="hit-nd" data-action="cv-nd" points="${poly(top)}" fill="transparent"><title>Zone de non-droit</title></polygon>` });
    // Zone cliquable : l'îlot et le volume au-dessus (là où sont les immeubles), triée par profondeur.
    if (mien) {
      const hull = enveloppe([...ilot.map(([x, y]) => P(x, y)), ...inset(c.poly, c.c, 0.7).map(([x, y]) => P(x, y, 16))]);
      cibles.push({ prof: c.c[0] + c.c[1], h: `<polygon class="hit" data-action="quartier" data-c="${i}" points="${poly(hull)}" fill="transparent"><title>${c.nom} · tension ${Math.round(t)}</title></polygon>` });
      selections.push(`<polygon class="sel" data-q="${i}" visibility="hidden" points="${poly(top)}" fill="#FFB23F" fill-opacity=".14" stroke="#FFB23F" stroke-width="1.2"/>`);
      const nom = c.nom.length > 16 ? `${c.nom.slice(0, 15)}…` : c.nom, lw = 22 + nom.length * 3.9, np = patrouilles[i] || 0;
      const [lx, ly] = P(c.c[0], c.c[1], 30);
      etiq.push({ lx, ly, lw: 22, h: `<g class="lab" data-action="quartier" data-c="${i}" style="cursor:pointer"><circle r="11" fill="transparent"/><path d="M0 9L-3.5 4.5H3.5Z" fill="${LUM[n.id]}"/><circle r="7.5" fill="${LUM[n.id]}" stroke="#0B1124" stroke-width="1.2"/><text y="2.5" text-anchor="middle" class="iso-tn">${Math.round(t)}</text>${me.pointChaud && String(me.pointChaud.cell) === String(i) ? '<text x="-9" y="-6" style="font-size:8px">🔥</text>' : ''}
        <g class="pb" data-q="${i}" transform="translate(8 -7)" ${np ? '' : 'visibility="hidden"'}><rect x="-5" y="-4.5" width="10" height="9" rx="4.5" fill="#1F4FA8" stroke="#0B1124" stroke-width=".8"/><text y="2.4" text-anchor="middle" class="iso-pbt">${np}</text></g>
        <g class="nomq" data-q="${i}" visibility="hidden" transform="translate(0 -19)"><rect x="${f(-lw / 2)}" y="-7.5" width="${f(lw)}" height="14" rx="7" fill="#FFB23F"/><text y="2.4" text-anchor="middle" class="iso-nmq">${nom}</text></g></g>` });
    }
  }

  const face = (pp, fill, extra = '') => `<polygon points="${pts3(pp)}" fill="${fill}"${extra}/>`;
  const fenetres = (b, X0, X1, Y0, Y1, h, lum, proba, pas = 4) => {
    let s = '';
    for (let zz = 3; zz < h - 2; zz += pas) {
      const nx = Math.max(1, Math.round((X1 - X0) / 3)), ny = Math.max(1, Math.round((Y1 - Y0) / 3));
      for (let u = 1; u <= nx; u++) if (b.rng.next() < proba) { const fx = X0 + ((X1 - X0) * u) / (nx + 1); s += face([[fx - 0.7, Y1, zz], [fx + 0.7, Y1, zz], [fx + 0.7, Y1, zz + 1.8], [fx - 0.7, Y1, zz + 1.8]], lum, ` opacity="${b.mien ? 0.95 : 0.55}"`); }
      for (let u = 1; u <= ny; u++) if (b.rng.next() < proba) { const fy = Y0 + ((Y1 - Y0) * u) / (ny + 1); s += face([[X1, fy - 0.7, zz], [X1, fy + 0.7, zz], [X1, fy + 0.7, zz + 1.8], [X1, fy - 0.7, zz + 1.8]], lum, ` opacity="${b.mien ? 0.8 : 0.45}"`); }
    }
    return s;
  };
  const boite = (X0, X1, Y0, Y1, h, [cTop, cDroite, cGauche], z0 = 1.2) =>
    face([[X0, Y1, z0], [X1, Y1, z0], [X1, Y1, h], [X0, Y1, h]], cGauche) + face([[X1, Y0, z0], [X1, Y1, z0], [X1, Y1, h], [X1, Y0, h]], cDroite) + face([[X0, Y0, h], [X1, Y0, h], [X1, Y1, h], [X0, Y1, h]], cTop);
  const ombre = (X0, X1, Y0, Y1) => face([[X0 - 0.8, Y0 - 0.8, 1.2], [X1 + 2.5, Y0 - 0.8, 1.2], [X1 + 2.5, Y1 + 2.5, 1.2], [X0 - 0.8, Y1 + 2.5, 1.2]], '#050816', ' opacity=".45"');
  const PAL = { mien: ['#4A5A86', '#334068', '#283255'], autre: ['#2C3558', '#222A48', '#1B223D'], nd: ['#3B2A33', '#2A1E26', '#22181F'] };

  const dessin = (b) => {
    const { x, y, rng } = b, pal = b.nd ? PAL.nd : b.mien ? PAL.mien : PAL.autre;
    const lum = b.mien && b.n ? LUM[b.n.id] : b.nd ? '#FF6B5E' : '#C9B37A';
    const tendu = b.mien && b.n && (b.n.id === 'chaud' || b.n.id === 'tendu');
    let s = '';
    if (b.type === 'arbre') {
      const [tx, ty] = P(x, y, 1.2), hh = rng.float(5, 8), r = rng.float(2.2, 3.2), sapin = rng.next() < 0.4, vert = b.nd ? '#2B3326' : b.mien ? '#1F5442' : '#173A33';
      s += `<ellipse cx="${f(tx + 1.5)}" cy="${f(ty + 0.8)}" rx="${f(r)}" ry="${f(r / 2)}" fill="#050816" opacity=".4"/><line x1="${f(tx)}" y1="${f(ty)}" x2="${f(tx)}" y2="${f(ty - hh * 0.5)}" stroke="#3A2A20" stroke-width=".8"/>`;
      s += sapin ? `<path d="M${f(tx - r)} ${f(ty - hh * 0.35)}L${f(tx)} ${f(ty - hh - 2)}L${f(tx + r)} ${f(ty - hh * 0.35)}Z" fill="${vert}"/><path d="M${f(tx)} ${f(ty - hh - 2)}L${f(tx + r)} ${f(ty - hh * 0.35)}H${f(tx)}Z" fill="#0E2A24" opacity=".6"/>`
        : `<circle cx="${f(tx)}" cy="${f(ty - hh * 0.7)}" r="${f(r)}" fill="${vert}"/><circle cx="${f(tx - r * 0.35)}" cy="${f(ty - hh * 0.7 - r * 0.35)}" r="${f(r * 0.45)}" fill="#2E6B55" opacity=".5"/>`;
      return s;
    }
    if (b.type === 'maison') {
      const w = rng.float(4.5, 6), d = rng.float(4, 5), h = rng.float(4, 5.5), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2, rh = h + rng.float(2.5, 3.5), ym = y;
      const toit = rng.next() < 0.6 ? '#7A3E36' : '#4A5068';
      const mur = b.mien ? ['#5A5F78', '#4A4E66'] : ['#2E3450', '#262B44'];
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, h, [pal[0], mur[0], mur[1]]);
      s += face([[X1, Y0, h], [X1, Y1, h], [X1, ym, rh]], mur[0]);
      s += face([[X0, Y1, h], [X1, Y1, h], [X1, ym, rh], [X0, ym, rh]], toit);
      if (rng.next() < 0.4) s += boite(X0 + 0.8, X0 + 1.8, ym + 0.3, ym + 1.3, rh + 1.2, ['#3A2A28', '#2E211F', '#251A18'], h + 1);
      if (rng.next() < (b.mien ? 0.75 : 0.4)) { const fx = x - 0.3; s += face([[fx - 0.7, Y1, 1.8], [fx + 0.7, Y1, 1.8], [fx + 0.7, Y1, 3.6], [fx - 0.7, Y1, 3.6]], lum, ` opacity="${b.mien ? 0.95 : 0.6}"`); }
      if (rng.next() < 0.5) s += face([[X1, y - 0.6, 1.8], [X1, y + 0.6, 1.8], [X1, y + 0.6, 3.4], [X1, y - 0.6, 3.4]], lum, ` opacity="${b.mien ? 0.8 : 0.45}"`);
      return s;
    }
    if (b.type === 'commerce') {
      const w = rng.float(7, 9), d = rng.float(5, 6.5), h = rng.float(4.5, 6), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      const store = ['#E0625A', '#3FA27A', '#E2C04A', '#7A6CE0'][Math.floor(rng.next() * 4)];
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, h, pal);
      s += face([[X0 + 0.5, Y1, 1.6], [X1 - 0.5, Y1, 1.6], [X1 - 0.5, Y1, 3.4], [X0 + 0.5, Y1, 3.4]], lum, ` opacity="${b.mien ? 0.85 : 0.45}"`);
      s += face([[X0, Y1, 3.6], [X1, Y1, 3.6], [X1, Y1 + 1.4, 3.0], [X0, Y1 + 1.4, 3.0]], store, ' opacity=".9"');
      const [ex, ey] = P(x, Y1, h + 2.2); s += `<rect x="${f(ex - 3)}" y="${f(ey - 1.2)}" width="6" height="2.4" rx=".6" fill="${store}" opacity="${b.mien ? 1 : 0.6}"/>`;
      return s;
    }
    if (b.type === 'immeuble' || b.type === 'tour') {
      const tourL = b.type === 'tour', w = tourL ? rng.float(6.5, 8) : rng.float(6, 8.5), d = tourL ? rng.float(6.5, 8) : rng.float(5.5, 7.5);
      const h = tourL ? rng.float(28, 42) : rng.float(10, b.mien ? 22 : 18), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, h, pal) + fenetres(b, X0, X1, Y0, Y1, h, lum, b.mien ? 0.5 : 0.28);
      if (!tourL && rng.next() < 0.6) s += boite(x - 1.2, x + 1.2, y - 1, y + 1, h + 2, pal, h);
      if (tourL) { const [ax, ay] = P(x, y, h); s += `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(ax)}" y2="${f(ay - 8)}" stroke="#9AA3C4" stroke-width=".5"/><circle cx="${f(ax)}" cy="${f(ay - 8)}" r=".9" fill="#FF4E4E"><animate attributeName="opacity" values="1;.15;1" dur="2s" repeatCount="indefinite"/></circle>`; }
      if (tendu && rng.next() < 0.3) { const [gx, gy] = P(x, y, h + 1); s += `<circle cx="${f(gx)}" cy="${f(gy)}" r="1.5" fill="#63B0FF"><animate attributeName="fill" values="#63B0FF;#FF5A4E;#63B0FF" dur=".8s" repeatCount="indefinite"/></circle>`; }
      return s;
    }
    if (b.type === 'entrepot') {
      const w = rng.float(8, 10), d = rng.float(6, 7), h = rng.float(4, 6), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, h, pal);
      for (let k = 0; k < 3; k++) { const a = X0 + (w * k) / 3, bb = a + w / 3; s += face([[a, Y1, h], [bb, Y1, h], [bb, Y1, h + 2.2]], '#2A1E26'); }
      if (rng.next() < 0.5) s += face([[X0 + 2, Y1, 1.2], [X0 + 4, Y1, 1.2], [X0 + 4, Y1, 3.4], [X0 + 2, Y1, 3.4]], '#FF6B5E', ' opacity=".35"');
      return s;
    }
    if (b.type === 'ruine') {
      const w = rng.float(5, 7), d = rng.float(4.5, 6), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      return boite(X0, X0 + w * 0.45, Y0, Y1, rng.float(5, 9), pal) + boite(X0 + w * 0.5, X1, Y0 + 1, Y1, rng.float(2.5, 4), pal);
    }
    if (b.type === 'feu') {
      const [fx, fy] = P(x, y, 1.2);
      const fl = (q) => `M${f(fx - 1)} ${f(fy - 3)}Q${f(fx + q[0])} ${f(fy - q[1])} ${f(fx + 1)} ${f(fy - 3)}Z`;
      return `<circle cx="${f(fx)}" cy="${f(fy - 1)}" r="7" fill="url(#${id('feu')})"/><rect x="${f(fx - 1.2)}" y="${f(fy - 3)}" width="2.4" height="3" fill="#3A2A2A"/><path d="${fl([0, 7])}" fill="#FF9A3C"><animate attributeName="d" values="${fl([0, 7])};${fl([0.6, 5.5])};${fl([0, 7])}" dur=".6s" repeatCount="indefinite"/></path>`;
    }
    if (b.type === 'hp') {
      const X0 = x - 7, X1 = x + 7, Y0 = y - 5.5, Y1 = y + 5.5, h = 20;
      s += face([[X0 - 1, Y1 + 0.5, 1.25], [X1 + 1, Y1 + 0.5, 1.25], [X1 + 1, Y1 + 6, 1.25], [X0 - 1, Y1 + 6, 1.25]], '#1A2140');
      for (const px of [X0 + 2.5, X0 + 7.5]) { s += boite(px, px + 3.2, Y1 + 2, Y1 + 4.2, 3.2, ['#E9EEF8', '#C9D1E6', '#AEB8D2']); const [lx, ly] = P(px + 1.6, Y1 + 3.1, 3.4); s += `<circle cx="${f(lx)}" cy="${f(ly)}" r=".8" fill="#63B0FF"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></circle>`; }
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, h, ['#4A6FB8', '#2F4C8C', '#253D73']) + fenetres(b, X0, X1, Y0, Y1, h, '#FFE2A8', 0.6);
      s += face([[X0, Y1, 8], [X1, Y1, 8], [X1, Y1, 10.5], [X0, Y1, 10.5]], '#63B0FF') + face([[X1, Y0, 8], [X1, Y1, 8], [X1, Y1, 10.5], [X1, Y0, 10.5]], '#4C90DA');
      const [hx, hy] = P(x, y, h); s += `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="4.6" ry="2.6" fill="none" stroke="#FFB23F" stroke-width=".6"/><text x="${f(hx)}" y="${f(hy + 1.3)}" text-anchor="middle" style="font:800 3.4px sans-serif;fill:#FFB23F">H</text>`;
      const [mx, my] = P(X0 + 1, Y0 + 1, h); s += `<line x1="${f(mx)}" y1="${f(my)}" x2="${f(mx)}" y2="${f(my - 12)}" stroke="#C9CFE6" stroke-width=".7"/><path d="M${f(mx)} ${f(my - 12)}h7l-2 2.5 2 2.5h-7z" fill="#FFB23F"><animateTransform attributeName="transform" type="skewY" values="0;-6;0;5;0" dur="2.4s" additive="sum" repeatCount="indefinite"/></path>`;
      return s;
    }
    return s;
  };

  objets.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  cibles.sort((a, b) => a.prof - b.prof);
  etiq.sort((a, b) => b.ly - a.ly);
  const posees = [];
  for (const e of etiq) { let essai = 0; while (essai++ < 6 && posees.some((q) => Math.abs(q.lx - e.lx) < (q.lw + e.lw) / 2 + 2 && Math.abs(q.ly - e.ly) < 22)) e.ly -= 12; posees.push(e); }
  const etiqHtml = zoomZone ? posees.map((e) => `<g transform="translate(${f(e.lx)} ${f(e.ly)})">${e.h}</g>`).join('') : '';

  const fleuveP = [...A, ...B.slice().reverse()].map(([x, y]) => P(x, y));
  const reflets = [0.2, 0.45, 0.7].map((k, j) => { const pts = axe.slice(Math.floor(k * 50), Math.floor(k * 50) + 10).map(([c]) => P(c[0], c[1])); return `<polyline points="${poly(pts)}" fill="none" stroke="#6FA0E8" stroke-opacity=".35" stroke-width=".6" stroke-dasharray="2 6"><animate attributeName="stroke-dashoffset" values="0;-16" dur="${3 + j}s" repeatCount="indefinite"/></polyline>`; }).join('');
  const fleuve = `<polygon points="${poly(fleuveP)}" fill="#0E2550" stroke="#3E6BB0" stroke-opacity=".5" stroke-width=".6"/>${reflets}`;
  // En vue district, ma zone entière est une seule cible : on y « zoome ».
  const cibleDistrict = zoomZone ? '' : `<polygon class="hit-zone" data-action="carte-calque" data-v="mazone" points="${poly(enveloppe([...mes].flatMap((i) => T.cells[i].poly.map(([x, y]) => P(x, y)))))}" fill="#FFB23F" fill-opacity=".05" stroke="#FFB23F" stroke-width="1" stroke-dasharray="3 2"><title>Ouvrir ma zone</title></polygon>`;

  const out = `<svg viewBox="${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}" width="100%" style="display:block;background:radial-gradient(ellipse at 50% 40%, #121A3A, #05081A 75%)" class="iso" role="img" aria-label="Maquette de ${zoomZone ? 'ta zone : touche un quartier pour le choisir, la liste en dessous fait la même chose' : 'tout le district : touche ta zone pour y entrer'}">
    <defs><filter id="${id('flou')}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
      <radialGradient id="${id('lampe')}"><stop offset="0" stop-color="#FFD58A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id('feu')}"><stop offset="0" stop-color="#FF7A3C" stop-opacity=".6"/><stop offset="1" stop-color="#FF7A3C" stop-opacity="0"/></radialGradient>
      <clipPath id="${id('vue')}"><rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}"/></clipPath></defs>
    <style>.iso-tn{font:800 7px 'Bricolage Grotesque',sans-serif;fill:#0B1124}.iso-nmq{font:800 7px 'Instrument Sans',sans-serif;fill:#0B1124}.iso-pbt{font:800 6px 'Bricolage Grotesque',sans-serif;fill:#fff}.iso .hit,.iso .hit-zone,.iso .hit-nd{cursor:pointer}</style>
    <g clip-path="url(#${id('vue')})">${routes.join('')}${fleuve}${sol.join('')}${selections.join('')}${lueurs.join('')}${voitures.join('')}${objets.map(dessin).join('')}${fumees.join('')}${cibles.map((c) => c.h).join('')}${cibleDistrict}${etiqHtml}</g>
  </svg>`;
  return reduit ? out.replace(/<animate[^>]*\/>|<animateTransform[^>]*\/>/g, '') : out;
}
