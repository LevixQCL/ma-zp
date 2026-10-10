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
/** Vue « non-droit » : cadrée sur le centre et sa couronne de quartiers ; sans non-droit, tout le district. */
const T_VUE = (st) => (st.nonDroit && Object.keys(st.nonDroit.secteurs || {}).length ? 'nondroit' : 'district');
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export function planIso(st, me, { vue = 'mazone', sel = null } = {}) {
  const seed = S.config.seed, reduit = calme();
  const mesT0 = tensionsDe(st, me);
  const ndS = (st.nonDroit && st.nonDroit.secteurs) || {};
  const cle = [seed, st.season, st.turn, me.uid, vue, reduit, Object.entries(ndS).map(([k, x]) => `${k}:${x.statut}:${Math.round(x.emprise)}`).join(','), Object.values(st.zones).map((z) => `${z.uid}:${z.nom}:${z.fondateur ? 1 : 0}`).sort().join(','), Object.entries(mesT0).map(([k, v]) => `${k}:${Math.round(v)}`).join(','), me.pointChaud ? me.pointChaud.cell : ''].join('|');
  if (!cache || cache.cle !== cle) cache = { cle, ...dessiner(st, me, seed, vue === 'mazone' ? 'zone' : T_VUE(st), reduit) };
  let svg = cache.svg;
  // Non-droit : mes fourgons partent de mon HP vers les secteurs où j'engage des agents ce soir ; ceux des collègues
  // annoncés à la radio aussi (gris), avec le total sur place.
  const dyn = [];
  const sect = (S.draft && S.draft.secteurs) || {}, ann = annonces();
  for (const k of new Set([...Object.keys(sect).filter((x) => sect[x] > 0), ...Object.keys(ann)])) {
    const b = cache.pos(Number(k), 4);
    if (!b) continue;
    const venus = [...(sect[k] ? [{ uid: me.uid, n: sect[k] }] : []), ...(ann[k] || [])];
    venus.forEach((v, j) => {
      // Les fourgons suivent les rues et contournent le non-droit (pas de ligne droite à travers les secteurs tenus).
      const pts = cache.route(cache.capitale[v.uid], Number(k)) || [cache.pos(cache.capitale[v.uid], 4), b];
      if (!pts[0]) return;
      const long = pts.reduce((t, p, m) => (m ? t + Math.hypot(p[0] - pts[m - 1][0], p[1] - pts[m - 1][1]) : 0), 0);
      const moi = v.uid === me.uid, dur = Math.max(3, Math.min(14, long / 22)), a = pts[0];
      const d = `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}`;
      if (moi) dyn.push(`<path d="${d}" stroke="#63B0FF" stroke-width=".8" stroke-dasharray="2 2.5" fill="none" opacity=".7"/>`);
      for (let q = 0; q < Math.min(4, v.n); q++) {
        const corps = moi ? '<rect x="-3" y="-1.5" width="6" height="3" rx=".9" fill="#E9EEF8"/><rect x="-.7" y="-1.5" width="1.6" height="3" fill="#1F4FA8"/><rect x="-.3" y="-1" width=".9" height="2" rx=".3" fill="#63B0FF"/>'
          : '<rect x="-2.6" y="-1.3" width="5.2" height="2.6" rx=".8" fill="#9AA3C4"/>';
        dyn.push(reduit ? `<g transform="translate(${((a[0] + b[0]) / 2 + q * 3).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)})">${corps}</g>`
          : `<g opacity="0">${corps}<animateMotion dur="${dur.toFixed(1)}s" begin="${(q * 0.7 + j * 0.4).toFixed(1)}s" repeatCount="indefinite" rotate="auto" path="${d}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="${dur.toFixed(1)}s" begin="${(q * 0.7 + j * 0.4).toFixed(1)}s" repeatCount="indefinite"/></g>`);
      }
    });
    const total = venus.reduce((t, v) => t + v.n, 0);
    dyn.push(`<g transform="translate(${b[0].toFixed(1)} ${(b[1] - 30).toFixed(1)})"><rect x="-13" y="-6.5" width="26" height="13" rx="6.5" fill="#1F4FA8" stroke="#0B1124" stroke-width=".8"/><text x="0" y="2.6" text-anchor="middle" class="iso-pbt" style="font-size:7px">${total} ag.</text></g>`);
  }
  svg = svg.replace('<!--dyn-->', dyn.join(''));
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

/** Annonces des collègues pour le non-droit (radio) : branché par la Carte pour éviter un import circulaire. */
let annonces = () => ({});
export function brancherAnnoncesND(f) { annonces = f; }

function dessiner(st, me, seed, vue, reduit) {
  const patrouilles = {};
  const T = territoires(seed, Object.values(st.zones));
  const moi = T.zones.find((x) => x.uid === me.uid);
  const mes = new Set(moi.quartiers);
  const mesT = tensionsDe(st, me);
  const voisins = new Set(moi.quartiers.flatMap((i) => T.adj[i]).filter((i) => !mes.has(i)));
  const ndSet = new Set(T.nd.cells);
  const zoomZone = vue === 'zone';
  const couronne = [...new Set(T.nd.cells.flatMap((i) => [i, ...T.adj[i]]))].filter((i) => T.owner[i] >= 0 || ndSet.has(i));
  const cellsVue = zoomZone ? [...mes, ...voisins] : vue === 'nondroit' ? couronne : T.cells.map((c) => c.i).filter((i) => T.owner[i] >= 0 || ndSet.has(i));
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

  const etiqND = [];
  const routes = [], sol = [], lueurs = [], objets = [], etiq = [], fumees = [], voitures = [], cibles = [], selections = [];
  for (const i of cellsVue) {
    const sND = ndSet.has(i) && st.nonDroit && st.nonDroit.secteurs[i];
    const repris = !!(sND && sND.statut === 'repris');
    const c = T.cells[i], mien = mes.has(i), nd = ndSet.has(i) && !repris;
    const kND = nd ? Math.min(1, Math.max(0.1, ((sND && sND.emprise) ?? 60) / 100)) : 0;
    const t = mien ? mesT[i] : null, n = mien ? niveauTension(t) : null;
    const rng = makeRng(`${seed}:iso:${i}`);
    routes.push(`<polygon points="${poly(c.poly.map(([x, y]) => P(x, y)))}" fill="#0C1128" stroke="#3A4470" stroke-opacity=".35" stroke-width=".35" stroke-dasharray="1.5 2"/>`);
    const ilot = inset(c.poly, c.c, 0.9);
    const top = ilot.map(([x, y]) => P(x, y, 1.2));
    sol.push(`<polygon points="${poly(ilot.map(([x, y]) => P(x, y)))}" fill="#090D20"/><polygon points="${poly(top)}" fill="${nd ? '#26141B' : repris ? '#16322B' : mien ? '#1E2A4C' : '#151C36'}" stroke="${repris ? '#2E6B55' : mien ? '#33447A' : '#1D2547'}" stroke-width=".5"/>`);
    if (mien || (!zoomZone && rng.next() < 0.3)) for (const [k, v] of c.poly.entries()) { if (k % (zoomZone ? 1 : 2)) continue; const [lx, ly] = P(v[0], v[1], 3); lueurs.push(`<circle cx="${f(lx)}" cy="${f(ly + 3)}" r="${zoomZone ? 5 : 3}" fill="url(#${id('lampe')})"/><circle cx="${f(lx)}" cy="${f(ly)}" r=".7" fill="#FFE2A8"/>`); }
    if (nd) { const [cx, cy] = P(c.c[0], c.c[1]); lueurs.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="34" ry="18" fill="#FF5A2A" opacity="${f(0.06 + kND * 0.1)}" filter="url(#${id('flou')})"><animate attributeName="opacity" values="${f(0.05 + kND * 0.07)};${f(0.08 + kND * 0.12)};${f(0.05 + kND * 0.07)}" dur="${f(1.6 + rng.next())}s" repeatCount="indefinite"/></ellipse>`); }
    if (mien) { const [cx, cy] = P(c.c[0], c.c[1]); lueurs.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="40" ry="22" fill="${LUM[n.id]}" opacity="${0.1 + (t / 100) * 0.28}" filter="url(#${id('flou')})"/>`); }

    const u = urb(c.c), capitale = moi.capitale === i;
    const zoneInt = inset(c.poly, c.c, 0.76);
    const bx = [Math.min(...zoneInt.map((q) => q[0])), Math.max(...zoneInt.map((q) => q[0]))], by = [Math.min(...zoneInt.map((q) => q[1])), Math.max(...zoneInt.map((q) => q[1]))];
    const nb = zoomZone ? (mien ? 16 : 12) : sND && sND.coeur && nd ? 5 : 7;
    const poses = capitale ? [[c.c[0], c.c[1], 12]] : [];
    // Non-droit : une scène propre au milieu du secteur (deal, recel, rodéos…), et une émeute quand l'emprise est forte.
    const scenes = [];
    if (nd) {
      const milieu = sND && sND.coeur ? 'qg' : (sND && sND.milieu) || 'deal', centre = inset(c.poly, c.c, 0.5);
      const reserver = (r) => { for (let e = 0; e < 200; e++) { const p = [rng.float(bx[0], bx[1]), rng.float(by[0], by[1])]; const [sx, sy] = P(p[0], p[1], 1.2), [ex, ey] = P(c.c[0], c.c[1], 18), sousPastille = Math.abs(sx - ex) < 13 && sy > ey - 10 && sy < ey + 16;
          if (!sousPastille && dedans(p, inset(c.poly, c.c, 0.62)) && !dansFleuve(p, 4) && !poses.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < (q[2] || 7.5) + 1)) { poses.push([p[0], p[1], r]); return p; } } return null; };
      const a = milieu === 'qg' ? (poses.push([c.c[0], c.c[1], 17]), c.c) : reserver(10);
      if (a) scenes.push({ x: a[0], y: a[1], type: 'scene', milieu, rng: makeRng(`${seed}:sc:${i}`) });
      if (milieu !== 'qg' && milieu !== 'contrefacon' && kND >= 0.68) { const b = reserver(9); if (b) scenes.push({ x: b[0], y: b[1], type: 'scene', milieu: 'emeute', rng: makeRng(`${seed}:em:${i}`) }); }
    }
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
      if (nd) type = roll < 0.3 ? 'entrepot' : roll < 0.55 ? 'ruine' : roll < 0.8 ? 'immeuble' : roll < 0.86 ? 'feu' : 'arbre';
      else if (u > 0.55) type = roll < 0.22 ? 'tour' : roll < 0.6 ? 'immeuble' : roll < 0.8 ? 'commerce' : 'arbre';
      else if (u > 0.3) type = roll < 0.35 ? 'immeuble' : roll < 0.7 ? 'maison' : roll < 0.82 ? 'commerce' : 'arbre';
      else type = roll < 0.6 ? 'maison' : roll < 0.72 ? 'immeuble' : 'arbre';
      objets.push({ x: p[0], y: p[1], type, n, mien, nd, u, rng: r2, brule: nd && type !== 'arbre' && type !== 'feu' && r2.next() < 0.06 + 0.22 * kND });
    }
    // Non-droit : carcasses de voitures en feu et fusillades entre bandes rivales (milieux armés), selon l'emprise.
    if (nd) {
      objets.push(...scenes);
      const libre = (p, m) => dedans(p, zoneInt) && !dansFleuve(p, 2) && !poses.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.max(m, q[2] || 0));
      const placer = (m) => { for (let e = 0; e < 120; e++) { const p = [rng.float(bx[0], bx[1]), rng.float(by[0], by[1])]; if (libre(p, m)) { poses.push([...p, m]); return p; } } return null; };
      for (let k = 0; k < Math.round(kND * 1.4); k++) { const p = placer(4); if (p) objets.push({ x: p[0], y: p[1], type: 'carcasse', rng: makeRng(`${seed}:car:${i}:${k}`) }); }
      const arme = sND && (sND.coeur || ['deal', 'recel', 'garage'].includes(sND.milieu));
      const nbFus = arme && kND >= 0.3 ? 1 : 0;
      for (let k = 0; k < nbFus; k++) {
        const r3 = makeRng(`${seed}:fus:${i}:${k}`), p = placer(6);
        if (!p) continue;
        const a = r3.float(0, Math.PI * 2), dx = Math.cos(a) * 5.5, dy = Math.sin(a) * 5.5, px = -dy / 5.5, py = dx / 5.5;
        const camps = [[p[0] - dx, p[1] - dy, p[0] + dx, p[1] + dy, '#C94A3A'], [p[0] + dx, p[1] + dy, p[0] - dx, p[1] - dy, '#D9B44A']];
        for (const [ax, ay, cx2, cy2, coul] of camps) for (let m = 0; m < 2; m++) {
          const o = (m - 0.5) * 2.4;
          objets.push({ x: ax + px * o, y: ay + py * o, type: 'tireur', cible: [cx2 - px * o, cy2 - py * o], coul, accroupi: r3.next() < 0.35, rng: makeRng(`${seed}:t:${i}:${k}:${coul}:${m}`) });
        }
      }
    }
    if (mien && t >= 55) { const [sx, sy] = P(c.c[0] + 6, c.c[1] - 4, 14); for (let k = 0; k < 3; k++) fumees.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="3" fill="#8A8FA8" opacity="0"><animate attributeName="cy" values="${f(sy)};${f(sy - 26)}" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/><animate attributeName="r" values="2.5;8" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.45;0" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/><animate attributeName="cx" values="${f(sx)};${f(sx + 7)}" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/></circle>`); }

    // Voitures : jusqu'à 3 voitures de police par quartier à moi (une par patrouille), civils ailleurs.
    const tour = c.poly.map(([x, y]) => P(x, y, 0.3));
    const d = `M${tour.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
    const perim = tour.reduce((s, p, k) => s + Math.hypot(p[0] - tour[(k + 1) % tour.length][0], p[1] - tour[(k + 1) % tour.length][1]), 0);
    // Sens inverse : on parcourt le tracé à l'envers plutôt que keyPoints="1;0" (avec rotate="auto",
    // l'orientation suit le tracé d'origine → la voiture reculait, phares à l'arrière).
    const dInv = `M${tour.slice().reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
    const mvt = (dur, deb, sens) => reduit ? '' : `<animateMotion dur="${f(dur)}s" begin="${f(deb)}s" repeatCount="indefinite" rotate="auto" calcMode="linear" path="${sens ? d : dInv}"/>`;
    if (mien) {
      const nbP = patrouilles[i] || 0, dur = perim / 9;
      for (let k = 0; k < 3; k++) voitures.push(`<g class="pv" data-q="${i}" data-k="${k}" ${k < nbP ? '' : 'visibility="hidden"'}${reduit ? ` transform="translate(${f(tour[k][0])} ${f(tour[k][1])})"` : ''}><rect x="-2.6" y="-1.3" width="5.2" height="2.6" rx=".8" fill="#E9EEF8"/><rect x="-.6" y="-1.3" width="1.6" height="2.6" fill="#1F4FA8"/><circle r="5" fill="#63B0FF" opacity=".28"><animate attributeName="fill" values="#63B0FF;#FF4E4E;#63B0FF" dur=".5s" repeatCount="indefinite"/></circle><rect x="-.3" y="-.9" width=".9" height="1.8" rx=".3" fill="#63B0FF"><animate attributeName="fill" values="#63B0FF;#FF4E4E;#63B0FF" dur=".5s" repeatCount="indefinite"/></rect><path d="M2.4 -1L9 -3.2V3.2L2.4 1Z" fill="#FFE9B0" opacity=".28"/>${mvt(dur, -(dur * k) / 3, k % 2 === 0)}</g>`);
    } else if (rng.next() < (zoomZone ? 0.55 : 0.18)) {
      const dur = perim / 6;
      if (!reduit) voitures.push(`<g><rect x="-2.2" y="-1.1" width="4.4" height="2.2" rx=".7" fill="${['#3C4466', '#5A3A3A', '#2F4B4A'][Math.floor(rng.next() * 3)]}"/><circle cx="-2.2" cy="0" r=".5" fill="#FF4E4E" opacity=".8"/><path d="M2.4 -1L9 -3.2V3.2L2.4 1Z" fill="#FFE9B0" opacity=".16"/>${mvt(dur, -rng.float(0, dur), rng.next() < 0.5)}</g>`);
    }

    // District : chaque quartier d'une zone se touche. Le mien ouvre « Ma zone », celui d'un collègue ouvre son commissariat.
    if (!zoomZone && T.owner[i] >= 0) {
      const uid = T.order[T.owner[i]], z = st.zones[uid];
      if (z) cibles.push({ prof: -1, h: mien ? `<polygon class="hit-zone" data-action="carte-calque" data-v="mazone" points="${poly(top)}" fill="transparent"><title>Ouvrir ma zone</title></polygon>`
        : `<polygon class="hit-autre" data-action="voir-hp" data-uid="${uid}" points="${poly(top)}" fill="transparent"><title>Commissariat de ${String(z.nom).replace(/[<&"]/g, '')}</title></polygon>` });
    }
    // Secteurs de non-droit (repris ou non) : touchables partout ; repère avec l'emprise, contour quand il est choisi.
    if (sND) {
      cibles.push({ prof: -1, h: `<polygon class="hit-nd" data-action="secteur" data-c="${i}" points="${poly(top)}" fill="transparent"><title>${c.nom} · ${repris ? 'repris' : `emprise ${Math.round(sND.emprise)}`}</title></polygon>` });
      selections.push(`<polygon class="sel" data-q="${i}" visibility="hidden" points="${poly(top)}" fill="#FFFFFF" fill-opacity=".1" stroke="#FFFFFF" stroke-width="1.2"/>`);
      const [px, py] = P(c.c[0], c.c[1], sND.coeur && !repris ? 68 : 18);
      etiqND.push(`<g data-action="secteur" data-c="${i}" style="cursor:pointer" transform="translate(${f(px)} ${f(py)})">${sND.coeur && !repris ? '<path d="M-5 -7L-5 -12.5L-2.5 -9.5L0 -13.5L2.5 -9.5L5 -12.5L5 -7Z" fill="#F3C84B" stroke="#0B1124" stroke-width=".7"/>' : ''}<path d="M0 8L-3 4H3Z" fill="${repris ? '#3DD39A' : '#E0625A'}"/><circle r="6.5" fill="${repris ? '#3DD39A' : '#E0625A'}" stroke="#0B1124" stroke-width="1"/><text y="2.4" text-anchor="middle" class="iso-tn" style="fill:${repris ? '#0B1124' : '#fff'}">${repris ? '✓' : Math.round(sND.emprise)}</text></g>`);
    }
    // Zone cliquable : l'îlot et le volume au-dessus (là où sont les immeubles), triée par profondeur.
    if (mien && zoomZone) {
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

  // Flammes animées (3 langues superposées) et colonne de fumée noire, pour le non-droit.
  const flammes = (fx, fy, k, r) => {
    const lg = (w, h, dx) => { const a = `M${f(fx + dx - w)} ${f(fy)}Q${f(fx + dx - w * 0.6)} ${f(fy - h * 0.55)} ${f(fx + dx)} ${f(fy - h)}Q${f(fx + dx + w * 0.6)} ${f(fy - h * 0.55)} ${f(fx + dx + w)} ${f(fy)}Z`; const b2 = `M${f(fx + dx - w)} ${f(fy)}Q${f(fx + dx - w * 0.9)} ${f(fy - h * 0.5)} ${f(fx + dx + w * 0.4)} ${f(fy - h * 0.8)}Q${f(fx + dx + w * 0.5)} ${f(fy - h * 0.45)} ${f(fx + dx + w)} ${f(fy)}Z`; return [a, b2]; };
    const d = r.float(0.45, 0.75);
    return `<circle cx="${f(fx)}" cy="${f(fy - 2 * k)}" r="${f(8 * k)}" fill="url(#${id('feu')})"/>` + [[2.2, 7, 0, '#E8401E'], [1.6, 5.5, -1.1, '#FF8A2A'], [1.1, 4, 0.8, '#FFD86A']].map(([w, h, dx, col], j) => {
      const [a, b2] = lg(w * k, h * k, dx * k);
      return `<path d="${a}" fill="${col}"><animate attributeName="d" values="${a};${b2};${a}" dur="${f(d + j * 0.12)}s" begin="${f(-r.next())}s" repeatCount="indefinite"/></path>`;
    }).join('');
  };
  const fumee = (sx, sy, k, r) => { for (let j = 0; j < 3; j++) { const du = r.float(4, 6), dx = r.float(4, 10); fumees.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="3" fill="url(#${id('fumee')})" opacity="0"><animate attributeName="cy" values="${f(sy)};${f(sy - 34 * k)}" dur="${f(du)}s" begin="${f(j * du / 3)}s" repeatCount="indefinite"/><animate attributeName="r" values="${f(2 * k)};${f(9 * k)}" dur="${f(du)}s" begin="${f(j * du / 3)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.7;0" dur="${f(du)}s" begin="${f(j * du / 3)}s" repeatCount="indefinite"/><animate attributeName="cx" values="${f(sx)};${f(sx + dx)}" dur="${f(du)}s" begin="${f(j * du / 3)}s" repeatCount="indefinite"/></circle>`); } };
  const tirs = [];
  // Petit personnage (1,35 × la taille de base) : jambes, buste à la couleur de la bande, tête ; bras selon le geste.
  const perso = (wx, wy, coul, { geste = null, sens = 1, accroupi = false, anim = '', z = 1.2, k = 1 } = {}) => {
    const [x, y] = P(wx, wy, z), hb = accroupi ? 1.8 : 3;
    let s = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(1.05 * k)})">${anim}<ellipse cx=".4" cy=".2" rx="1.3" ry=".5" fill="#050816" opacity=".5"/>`;
    s += accroupi ? '<path d="M-.7 0L.3 -.9L0 -1.2" fill="none" stroke="#14121A" stroke-width=".55" stroke-linecap="round"/>' : '<path d="M-.6 0L0 -1.5L.6 0" fill="none" stroke="#14121A" stroke-width=".55" stroke-linecap="round"/>';
    s += `<line x1="0" y1="${f(-hb + 1.5)}" x2="0" y2="${f(-hb)}" stroke="${coul}" stroke-width="1.2" stroke-linecap="round"/><circle cy="${f(-hb - 0.7)}" r=".62" fill="#1A1820"/>`;
    if (geste === 'leve') s += `<line x1="0" y1="${f(-hb + 0.2)}" x2="${f(sens * 0.8)}" y2="${f(-hb - 1.4)}" stroke="${coul}" stroke-width=".45" stroke-linecap="round"/>`;
    if (geste === 'porte') s += `<rect x="${f(sens * 0.3)}" y="${f(-hb - 0.1)}" width="1.4" height="1.2" fill="#A97A4A" stroke="#6E4E2E" stroke-width=".2"/>`;
    if (geste === 'arme') s += `<line x1="0" y1="${f(-hb + 0.4)}" x2="${f(sens * 1.8)}" y2="${f(-hb + 0.2)}" stroke="#0E0C12" stroke-width=".5" stroke-linecap="round"/>`;
    if (geste === 'cigare') s += `<circle cx="${f(sens * 0.7)}" cy="${f(-hb - 0.5)}" r=".28" fill="#FF7A2A"><animate attributeName="opacity" values=".3;1;.3" dur="2.4s" repeatCount="indefinite"/></circle>`;
    if (geste === 'tel') s += `<circle cx="${f(sens * 0.6)}" cy="${f(-hb - 0.2)}" r=".35" fill="#8FD3FF"><animate attributeName="opacity" values="1;.2;1" dur="${f(0.8 + Math.abs(wx * 7 % 1))}s" repeatCount="indefinite"/></circle>`;
    return s + '</g>';
  };
  const marche = (dx, dy, du, deb = 0) => `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;${f(dx)} ${f(dy)};0 0" dur="${f(du)}s" begin="${f(-deb)}s" repeatCount="indefinite"/>`;
  const voiture = (wx, wy, couls, rot) => { const w = rot ? 4.4 : 2.2, d = rot ? 2.2 : 4.4; return boite(wx - w / 2, wx + w / 2, wy - d / 2, wy + d / 2, 2.2, couls) + boite(wx - w / 2 + (rot ? 1 : 0.25), wx + w / 2 - (rot ? 1 : 0.25), wy - d / 2 + (rot ? 0.25 : 1), wy + d / 2 - (rot ? 0.25 : 1), 3.3, [couls[0], couls[1], couls[2]], 2.2); };
  const scene = (b) => {
    const { x, y, rng } = b, R = (k) => rng.float(-k, k);
    let s = '';
    const pied = (dx, dy) => P(x + dx, y + dy, 1.2);
    switch (b.milieu) {
      case 'deal': { // Point de deal : le vendeur, une file de clients, des guetteurs au téléphone aux coins.
        s += perso(x, y, '#3FA27A', { geste: 'porte', sens: 1 });
        for (let k = 0; k < 3; k++) s += perso(x + 1.6 + k * 1.4, y + 0.6 + k * 1.1, '#6C7393', { anim: k === 0 ? marche(-0.6, -0.4, 2.2) : '' });
        for (const [dx, dy] of [[-5, -4], [5, -4.5], [-4.5, 4.5]]) s += perso(x + dx, y + dy, '#C94A3A', { geste: 'tel', sens: dx > 0 ? -1 : 1 });
        return s;
      }
      case 'recel': { // Recel : une camionnette ouverte, on décharge des cartons vers l'entrepôt.
        s += voiture(x - 2.5, y, ['#C9CBD6', '#9A9DAE', '#7D8092'], true);
        s += boite(x + 1.2, x + 2.4, y - 2.5, y - 1.3, 2.4, ['#A97A4A', '#8A6038', '#6E4E2E']) + boite(x + 1.4, x + 2.2, y - 2.3, y - 1.5, 3.4, ['#B8895A', '#8A6038', '#6E4E2E'], 2.4);
        for (let k = 0; k < 2; k++) s += perso(x + 0.4, y + 1.2 + k * 1.3, '#7A6CE0', { geste: 'porte', sens: 1, anim: marche(3, -1.5, 2.6, k * 1.3) });
        s += perso(x - 3.5, y + 2.6, '#C94A3A', { geste: 'tel' });
        return s;
      }
      case 'squat': { // Squat : matelas au sol, brasero et un groupe autour.
        s += face([[x - 4, y + 1.5, 1.3], [x - 1.5, y + 1.5, 1.3], [x - 1.5, y + 3, 1.3], [x - 4, y + 3, 1.3]], '#8C8471') + face([[x + 2, y - 3.5, 1.3], [x + 4.2, y - 3.5, 1.3], [x + 4.2, y - 2, 1.3], [x + 2, y - 2, 1.3]], '#6F6A5C');
        s += boite(x - 0.5, x + 0.5, y - 0.5, y + 0.5, 2.6, ['#3A3238', '#2A2428', '#1E1A1D']);
        const [bx2, by2] = P(x, y, 2.6); s += flammes(bx2, by2, 0.55, rng);
        for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.5; s += perso(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, ['#6C7393', '#8A6A4A', '#4A6A5A', '#7A4A5A'][k], { accroupi: k % 2 === 1 }); }
        return s;
      }
      case 'garage': { // Garage clandestin : voiture sur cales sans roues, meuleuse qui crache des étincelles.
        s += voiture(x, y, ['#3E5C8A', '#2C4468', '#22364F'], true);
        for (const [dx, dy] of [[-3.5, 2.6], [-2.4, 3.3], [3.4, 2.4]]) { const [rx, ry] = P(x + dx, y + dy, 1.4); s += `<ellipse cx="${f(rx)}" cy="${f(ry)}" rx="1" ry=".55" fill="#14121A" stroke="#3A3842" stroke-width=".3"/>`; }
        s += perso(x + 1, y + 2, '#D98A3A', { accroupi: true });
        const [ex, ey] = P(x + 0.6, y + 1.4, 2.3);
        for (let k = 0; k < 6; k++) { const a = -2.4 + k * 0.32, L = 2 + rng.next() * 2; s += `<line x1="${f(ex)}" y1="${f(ey)}" x2="${f(ex + Math.cos(a) * L)}" y2="${f(ey + Math.sin(a) * L)}" stroke="#FFD86A" stroke-width=".3" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="${f(0.25 + rng.next() * 0.3)}s" begin="${f(rng.next())}s" repeatCount="indefinite"/></line>`; }
        s += perso(x - 3.8, y - 2.2, '#C94A3A', { geste: 'tel' });
        return s;
      }
      case 'rodeos': { // Rodéos urbains : motos qui tournent en rond, phare allumé, et des spectateurs.
        const [cx, cy] = P(x, y, 1.4), rx = 7, ry = 3.6;
        s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" fill="none" stroke="#3A2A2A" stroke-width="1.6" opacity=".55"/>`;
        const tr = `M${f(cx - rx)} ${f(cy)}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
        for (let k = 0; k < 3; k++) s += `<g><path d="M3 0L13 -3.5V3.5Z" fill="#FFF2C0" opacity=".25"/><rect x="-1.8" y="-.5" width="3.6" height="1" rx=".5" fill="#14121A"/><circle cx="1.6" r=".5" fill="#FFF2C0"/><circle cx="-1.8" r=".4" fill="#FF3B3B"/><line x1="0" y1="-.4" x2="0" y2="-2.6" stroke="#C94A3A" stroke-width="1"/><circle cy="-3.2" r=".6" fill="#1A1820"/><animateMotion dur="${f(3 + k * 0.6)}s" begin="${f(-k * 1.1)}s" repeatCount="indefinite" rotate="auto" path="${tr}"/></g>`;
        for (const [dx, dy] of [[-6, 5], [-4.8, 5.8], [6.5, -5]]) s += perso(x + dx, y + dy, '#6C7393', { geste: 'leve', sens: 1 });
        return s;
      }
      case 'jeux': { // Tripot : enseigne néon qui clignote, videur à la porte, berlines garées.
        s += boite(x - 3, x + 1.5, y - 3, y + 1, 6, ['#3B2A33', '#2A1E26', '#22181F']);
        const [nx, ny] = P(x - 0.7, y + 1, 7.5);
        s += `<rect x="${f(nx - 4)}" y="${f(ny - 2)}" width="8" height="3.4" rx=".8" fill="#14121A" stroke="#FF4FD8" stroke-width=".5"><animate attributeName="stroke-opacity" values="1;.2;1;1;.1;1" dur="2.2s" repeatCount="indefinite"/></rect><text x="${f(nx)}" y="${f(ny + 0.6)}" text-anchor="middle" style="font:800 2.6px sans-serif;fill:#FF4FD8">♠ ♦</text>`;
        const [dx2, dy2] = P(x - 0.5, y + 1, 1.2); s += face([[x - 1.2, y + 1, 1.2], [x + 0.2, y + 1, 1.2], [x + 0.2, y + 1, 3.6], [x - 1.2, y + 1, 3.6]], '#FFB23F', ' opacity=".7"');
        s += perso(x + 0.9, y + 2.2, '#14121A', {}) + perso(x - 2.4, y + 3.4, '#6C7393', { anim: marche(1.6, -1.6, 3) });
        s += voiture(x + 4, y - 1, ['#1A1A20', '#111116', '#0B0B10'], false) + voiture(x + 4, y + 3.5, ['#2A2A32', '#1C1C22', '#141418'], false);
        return s;
      }
      case 'sommeil': { // Marchands de sommeil : file de locataires avec leurs sacs, linge tendu, matelas entassés.
        const [l1x, l1y] = P(x - 4, y - 2, 5), [l2x, l2y] = P(x + 2, y - 4, 5);
        s += `<line x1="${f(l1x)}" y1="${f(l1y)}" x2="${f(l1x)}" y2="${f(l1y + 3.8)}" stroke="#5A5F78" stroke-width=".4"/><line x1="${f(l2x)}" y1="${f(l2y)}" x2="${f(l2x)}" y2="${f(l2y + 3.8)}" stroke="#5A5F78" stroke-width=".4"/><path d="M${f(l1x)} ${f(l1y)}Q${f((l1x + l2x) / 2)} ${f((l1y + l2y) / 2 + 1.5)} ${f(l2x)} ${f(l2y)}" fill="none" stroke="#9AA3C4" stroke-width=".25"/>`;
        for (let k = 1; k < 5; k++) { const t = k / 5, lx = l1x + (l2x - l1x) * t, ly = l1y + (l2y - l1y) * t + Math.sin(t * Math.PI) * 0.75; s += `<rect x="${f(lx - 0.6)}" y="${f(ly)}" width="1.2" height="1.6" fill="${['#E0625A', '#E2C04A', '#63B0FF', '#3FA27A'][k - 1]}" opacity=".85"/>`; }
        for (let k = 0; k < 3; k++) s += boite(x + 2, x + 4.4, y + 1, y + 2.2, 1.6 + k * 0.45, ['#8C8471', '#6F6A5C', '#5A5649'], 1.2 + k * 0.45);
        for (let k = 0; k < 4; k++) s += perso(x - 3 + k * 1.3, y + 2 + k * 0.6, ['#6C7393', '#8A6A4A', '#4A6A5A', '#7A4A5A'][k], { geste: 'porte', sens: -1 });
        s += perso(x - 0.5, y - 0.8, '#14121A', { geste: 'leve', sens: 1 });
        return s;
      }
      case 'contrefacon': { // Marché de contrefaçon : étals sur le trottoir, vendeurs et acheteurs qui circulent.
        for (const [dx, dy] of [[-3.5, -1], [0.5, -2.5], [3.5, 1]]) {
          s += boite(x + dx - 1.4, x + dx + 1.4, y + dy - 0.8, y + dy + 0.8, 2.2, ['#5A4A3A', '#4A3C2E', '#3A2E22']);
          for (let k = 0; k < 3; k++) { const [ox, oy] = P(x + dx - 0.8 + k * 0.8, y + dy, 2.6); s += `<rect x="${f(ox - 0.5)}" y="${f(oy - 0.6)}" width="1" height=".9" rx=".2" fill="${['#E2C04A', '#E0625A', '#7A6CE0', '#3FA27A', '#FF9A3C'][(k + Math.round(dx)) % 5 < 0 ? 0 : (k + Math.round(dx)) % 5]}"/>`; }
          s += perso(x + dx - 0.4, y + dy - 1.8, '#3FA27A', {});
        }
        for (let k = 0; k < 4; k++) s += perso(x - 3 + k * 2.2 + R(0.5), y + 3 + R(0.6), '#6C7393', { anim: marche(R(2), R(1.5), 2.5 + rng.next() * 2, rng.next() * 2), geste: k === 1 ? 'porte' : null });
        return s;
      }
      case 'qg': { // QG du boss : forteresse murée, miradors, tour du chef éclairée, cour gardée, convoi de SUV.
        const pk = 0.72, M = 7.5, hm = 3.4, mur = ['#4A4048', '#33292F', '#2A2228'], ep = 0.7;
        const barbele = (pts) => `<polyline points="${poly(pts.map(([a, b2]) => P(x + a, y + b2, hm + 0.7)))}" fill="none" stroke="#9AA3C4" stroke-width=".25" stroke-dasharray=".6 .4"/>`;
        const zig = (a0, b0, a1, b1) => { const n = 14, pts = []; for (let k = 0; k <= n; k++) pts.push([a0 + (a1 - a0) * k / n, b0 + (b1 - b0) * k / n]); return barbele(pts); };
        const mirador = (a, b2, phase) => {
          let m = '';
          for (const [dx, dy] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const [l1x, l1y] = P(x + a + dx, y + b2 + dy, 1.2), [l2x, l2y] = P(x + a + dx * 0.7, y + b2 + dy * 0.7, 8); m += `<line x1="${f(l1x)}" y1="${f(l1y)}" x2="${f(l2x)}" y2="${f(l2y)}" stroke="#3A3238" stroke-width=".5"/>`; }
          m += boite(x + a - 1.1, x + a + 1.1, y + b2 - 1.1, y + b2 + 1.1, 9.5, ['#3A3238', '#2A2428', '#1E1A1D'], 8);
          m += boite(x + a - 1.3, x + a + 1.3, y + b2 - 1.3, y + b2 + 1.3, 10.4, ['#5A3A3A', '#3E2828', '#2E1E1E'], 9.9);
          m += perso(x + a, y + b2, '#14121A', { geste: 'arme', sens: -1, z: 9.5, k: pk });
          const [sx2, sy2] = P(x + a, y + b2, 10);
          m += `<g transform="translate(${f(sx2)} ${f(sy2)})"><path d="M0 0L20 -4L20 4Z" fill="#FFF2C0" opacity=".16"><animateTransform attributeName="transform" type="rotate" values="${phase};${phase + 70};${phase}" dur="${f(6 + phase / 40)}s" repeatCount="indefinite"/></path><circle r=".9" fill="#FFF2C0"/></g>`;
          return m;
        };
        // Sol de la cour : dalle sombre, lueur rouge.
        s += face([[x - M, y - M, 1.25], [x + M, y - M, 1.25], [x + M, y + M, 1.25], [x - M, y + M, 1.25]], '#1E1418');
        { const [gx, gy] = P(x, y, 1.3); s += `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="18" ry="9" fill="#FF2A2A" opacity=".12"><animate attributeName="opacity" values=".08;.18;.08" dur="2.6s" repeatCount="indefinite"/></ellipse>`; }
        // Murs du fond, barbelés et mirador arrière.
        s += mirador(-M, -M, 200);
        s += boite(x - M, x + M, y - M, y - M + ep, hm, mur) + boite(x - M, x - M + ep, y - M, y + M, hm, mur);
        s += zig(-M, -M, M, -M) + zig(-M, -M, -M, M);
        s += mirador(M, -M, 250) + mirador(-M, M, 150);
        // Tags rouges sur le mur du fond.
        // Cour arrière : caisses d'armes, table où l'on compte les billets.
        for (const [a, b2, h] of [[-5.5, -4.5, 2.6], [-4.3, -4.5, 2.6], [-5.5, -3.3, 2.6], [-4.9, -3.9, 3.9]]) s += boite(x + a - 0.6, x + a + 0.6, y + b2 - 0.6, y + b2 + 0.6, h, ['#4A5A3A', '#36422A', '#2A3420'], h - 1.3);
        s += boite(x + 2.5, x + 5, y - 5.5, y - 4, 2.3, ['#5A4A3A', '#4A3C2E', '#3A2E22']);
        for (let k = 0; k < 4; k++) { const [bx3, by3] = P(x + 2.9 + k * 0.55, y - 4.8, 2.4); s += `<rect x="${f(bx3 - 0.45)}" y="${f(by3 - 0.3)}" width=".9" height=".5" fill="#4FA35A"/>`; }
        s += perso(x + 3.7, y - 6.5, '#D9B44A', { k: pk }) + perso(x + 5.8, y - 4.6, '#14121A', { geste: 'arme', sens: -1, k: pk });
        // La tour du boss : béton sombre, fenêtres rouges, penthouse doré, antenne et drapeau.
        const H = 28, T0 = -2.8, T1 = 2.8;
        s += ombre(x + T0, x + T1, y + T0, y + T1) + boite(x + T0, x + T1, y + T0, y + T1, H, ['#2A2028', '#1E171C', '#171215']);
        for (let zz = 4; zz < H - 6; zz += 3.4) for (let u = 0; u < 3; u++) {
          const r = rng.next();
          if (r < 0.45) { const fx = x + T0 + 1 + u * 1.8; s += face([[fx - 0.5, y + T1, zz], [fx + 0.5, y + T1, zz], [fx + 0.5, y + T1, zz + 1.6], [fx - 0.5, y + T1, zz + 1.6]], '#FF4E4E', ' opacity=".7"'); }
          if (rng.next() < 0.4) { const fy = y + T0 + 1 + u * 1.8; s += face([[x + T1, fy - 0.5, zz], [x + T1, fy + 0.5, zz], [x + T1, fy + 0.5, zz + 1.6], [x + T1, fy - 0.5, zz + 1.6]], '#FF4E4E', ' opacity=".55"'); }
        }
        s += boite(x + T0 - 0.4, x + T1 + 0.4, y + T0 - 0.4, y + T1 + 0.4, H + 0.6, ['#3A2A30', '#2A1E24', '#22181D'], H);
        s += boite(x + T0 + 0.6, x + T1 - 0.6, y + T0 + 0.6, y + T1 - 0.6, H + 4.4, ['#2A2028', '#1E171C', '#171215'], H + 0.6);
        s += face([[x + T0 + 0.8, y + T1 - 0.6, H + 1.4], [x + T1 - 0.8, y + T1 - 0.6, H + 1.4], [x + T1 - 0.8, y + T1 - 0.6, H + 3.8], [x + T0 + 0.8, y + T1 - 0.6, H + 3.8]], '#F3C84B', ' opacity=".9"');
        s += face([[x + T1 - 0.6, y + T0 + 0.8, H + 1.4], [x + T1 - 0.6, y + T1 - 0.8, H + 1.4], [x + T1 - 0.6, y + T1 - 0.8, H + 3.8], [x + T1 - 0.6, y + T0 + 0.8, H + 3.8]], '#D9A83A', ' opacity=".8"');
        s += perso(x + 1.2, y + T1 + 0.1, '#F3C84B', { geste: 'cigare', sens: 1, z: H + 0.6, k: pk }) + perso(x - 0.8, y + T1 + 0.1, '#14121A', { geste: 'arme', sens: -1, z: H + 0.6, k: pk });
        { const [ax, ay] = P(x - 1.5, y - 1.5, H + 4.4); s += `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(ax)}" y2="${f(ay - 9)}" stroke="#9AA3C4" stroke-width=".5"/><circle cx="${f(ax)}" cy="${f(ay - 9)}" r=".9" fill="#FF4E4E"><animate attributeName="opacity" values="1;.15;1" dur="1.4s" repeatCount="indefinite"/></circle>`; }
        { const [mx, my] = P(x + 1.6, y + 1.6, H + 4.4); s += `<line x1="${f(mx)}" y1="${f(my)}" x2="${f(mx)}" y2="${f(my - 8)}" stroke="#C9CFE6" stroke-width=".5"/><path d="M${f(mx)} ${f(my - 8)}h6v3.6h-6z" fill="#14121A"><animateTransform attributeName="transform" type="skewY" values="0;-5;0;4;0" dur="2.6s" additive="sum" repeatCount="indefinite"/></path><text x="${f(mx + 3)}" y="${f(my - 5.3)}" text-anchor="middle" style="font:700 2.8px sans-serif;fill:#EDE6D6">☠</text>`; }
        // Cour avant : convoi de SUV noirs, gardes qui patrouillent.
        s += voiture(x + 4.6, y + 1, ['#1A1A20', '#111116', '#0B0B10'], false) + voiture(x + 4.6, y + 5, ['#1A1A20', '#111116', '#0B0B10'], false);
        for (const [a, b2] of [[4.2, 6.9], [5, 6.9]]) { const [hx, hy] = P(x + a, y + b2, 1.8); s += `<circle cx="${f(hx)}" cy="${f(hy)}" r=".35" fill="#FFF2C0"/>`; }
        s += perso(x - 4.5, y + 3, '#14121A', { geste: 'arme', sens: 1, anim: marche(5, 0, 6), k: pk });
        s += perso(x + 3, y + 3.5, '#14121A', { geste: 'arme', sens: -1, anim: marche(0, -4, 5, 2), k: pk });
        s += perso(x - 1.5, y + 4.6, '#C94A3A', { geste: 'tel', k: pk });
        // Murs de devant avec portail et barrière, mirador avant, gardes à l'entrée.
        s += boite(x + M - ep, x + M, y - M, y + M, hm, mur) + zig(M, -M, M, M);
        s += boite(x - M, x - 1.6, y + M - ep, y + M, hm, mur) + boite(x + 1.6, x + M, y + M - ep, y + M, hm, mur) + zig(-M, M, -1.6, M) + zig(1.6, M, M, M);
        s += boite(x - 1.9, x - 1.3, y + M - 0.9, y + M + 0.2, hm + 1.4, ['#5A4A4A', '#3E3030', '#2E2424']) + boite(x + 1.3, x + 1.9, y + M - 0.9, y + M + 0.2, hm + 1.4, ['#5A4A4A', '#3E3030', '#2E2424']);
        { const [g1x, g1y] = P(x - 1.3, y + M - 0.3, 2), [g2x, g2y] = P(x + 1.3, y + M - 0.3, 2); s += `<line x1="${f(g1x)}" y1="${f(g1y)}" x2="${f(g2x)}" y2="${f(g2y)}" stroke="#E0625A" stroke-width=".7" stroke-dasharray="1 1"/>`; }
        s += mirador(M, M, 100);
        s += perso(x - 2.6, y + M + 1.3, '#14121A', { geste: 'arme', sens: 1, k: pk }) + perso(x + 2.6, y + M + 1.3, '#14121A', { geste: 'arme', sens: -1, k: pk });
        // Toute la forteresse est agrandie autour de son pied (l'isométrie est affine : l'échelle à l'écran reste juste).
        const [qx, qy] = P(x, y, 1.2);
        return `<g transform="translate(${f(qx)} ${f(qy)}) scale(1.4) translate(${f(-qx)} ${f(-qy)})">${s}</g>`;
      }
      case 'emeute': { // Émeute : foule massée derrière une banderole, cocktails Molotov lancés, pavés au sol.
        const coul = ['#C94A3A', '#6C7393', '#14121A', '#8A6A4A', '#4A4A5A'];
        const [b1x, b1y] = P(x - 1.6, y + 1.6, 4.8), [b2x, b2y] = P(x + 1.6, y + 1.6, 4.8);
        for (let k = 0; k < 8; k++) { const dx = -2.8 + (k % 4) * 1.8 + R(0.3), dy = (k < 4 ? -0.8 : -2.6) + R(0.3); s += perso(x + dx, y + dy, coul[k % 5], { geste: k % 3 === 0 ? 'leve' : null, sens: 1 }); }
        s += `<path d="M${f(b1x)} ${f(b1y)}L${f(b2x)} ${f(b2y)}L${f(b2x)} ${f(b2y + 2.6)}L${f(b1x)} ${f(b1y + 2.6)}Z" fill="#EDE6D6"/><path d="M${f(b1x + 0.6)} ${f(b1y + 1.3)}l1 -.6l1 .7l1 -.6l1 .6l1 -.5" fill="none" stroke="#C94A3A" stroke-width=".5"/>`;
        for (const [ax, ay] of [[b1x, b1y], [b2x, b2y]]) s += `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(ax)}" y2="${f(ay + 4.8)}" stroke="#5A3F2E" stroke-width=".35"/>`;
        s += perso(x - 1.6, y + 2.2, '#C94A3A', {}) + perso(x + 1.6, y + 2.2, '#6C7393', {});
        for (let k = 0; k < 5; k++) { const [qx, qy] = pied(R(4), 3.5 + rng.next() * 2.5); s += `<rect x="${f(qx)}" y="${f(qy)}" width=".8" height=".55" fill="#6A6470"/>`; }
        // Le Molotov : arc du lanceur vers la chaussée devant la foule, puis une gerbe de flammes à l'impact.
        const [lx, ly] = P(x + 1, y - 0.8, 6), [ix, iy] = P(x + R(2), y + 6.5, 1.2);
        const arc = `M${f(lx)} ${f(ly)}Q${f((lx + ix) / 2)} ${f(Math.min(ly, iy) - 10)} ${f(ix)} ${f(iy)}`, du = 2.6 + rng.next();
        s += `<circle r=".7" fill="#FF9A3C"><animateMotion dur="${f(du)}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.35;1" calcMode="linear" path="${arc}"/><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.34;.36;1" dur="${f(du)}s" repeatCount="indefinite"/></circle>`;
        s += `<circle cx="${f(ix)}" cy="${f(iy - 1)}" r="3" fill="#FF7A2A" opacity="0"><animate attributeName="opacity" values="0;0;.9;0" keyTimes="0;.35;.42;1" dur="${f(du)}s" repeatCount="indefinite"/><animate attributeName="r" values="0;0;3.5;1" keyTimes="0;.35;.45;1" dur="${f(du)}s" repeatCount="indefinite"/></circle>`;
        return s;
      }
    }
    return s;
  };
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
      const h = tourL ? rng.float(28, 42) : b.nd ? rng.float(8, 14) : rng.float(10, b.mien ? 22 : 18), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, h, pal) + fenetres(b, X0, X1, Y0, Y1, h, lum, b.mien ? 0.5 : 0.28);
      if (!tourL && rng.next() < 0.6) s += boite(x - 1.2, x + 1.2, y - 1, y + 1, h + 2, pal, h);
      if (tourL) { const [ax, ay] = P(x, y, h); s += `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(ax)}" y2="${f(ay - 8)}" stroke="#9AA3C4" stroke-width=".5"/><circle cx="${f(ax)}" cy="${f(ay - 8)}" r=".9" fill="#FF4E4E"><animate attributeName="opacity" values="1;.15;1" dur="2s" repeatCount="indefinite"/></circle>`; }
      if (b.brule) { const [gx, gy] = P(x + rng.float(-1.5, 1.5), y + rng.float(-1.5, 1.5), h); s += flammes(gx, gy, 1.1, rng); fumee(gx, gy - 6, 1.1, rng); }
      if (tendu && rng.next() < 0.3) { const [gx, gy] = P(x, y, h + 1); s += `<circle cx="${f(gx)}" cy="${f(gy)}" r="1.5" fill="#63B0FF"><animate attributeName="fill" values="#63B0FF;#FF5A4E;#63B0FF" dur=".8s" repeatCount="indefinite"/></circle>`; }
      return s;
    }
    if (b.type === 'entrepot') {
      const w = rng.float(8, 10), d = rng.float(6, 7), h = rng.float(4, 6), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, h, pal);
      for (let k = 0; k < 3; k++) { const a = X0 + (w * k) / 3, bb = a + w / 3; s += face([[a, Y1, h], [bb, Y1, h], [bb, Y1, h + 2.2]], '#2A1E26'); }
      if (rng.next() < 0.3 || b.brule) s += face([[X0 + 2, Y1, 1.2], [X0 + 4, Y1, 1.2], [X0 + 4, Y1, 3.4], [X0 + 2, Y1, 3.4]], '#FF6B3C', ` opacity="${b.brule ? 0.85 : 0.35}"`);
      if (b.brule) { const [gx, gy] = P(x + 1, y, h + 1); s += flammes(gx, gy, 1, rng); fumee(gx, gy - 6, 1, rng); }
      return s;
    }
    if (b.type === 'ruine') {
      const w = rng.float(5, 7), d = rng.float(4.5, 6), X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      const h1 = rng.float(5, 9);
      s += boite(X0, X0 + w * 0.45, Y0, Y1, h1, pal) + boite(X0 + w * 0.5, X1, Y0 + 1, Y1, rng.float(2.5, 4), pal);
      // Façade noircie, fenêtre éventrée qui rougeoie.
      s += face([[X0 + 0.6, Y1, h1 - 3], [X0 + w * 0.4, Y1, h1 - 3], [X0 + w * 0.4, Y1, h1 - 1], [X0 + 0.6, Y1, h1 - 1]], '#FF6B3C', ' opacity=".55"');
      if (b.brule) { const [gx, gy] = P(X0 + w * 0.25, y, h1); s += flammes(gx, gy, 0.9, rng); fumee(gx, gy - 5, 0.9, rng); }
      return s;
    }
    if (b.type === 'feu') {
      const [fx, fy] = P(x, y, 1.2);
      if (b.nd) {
        let p = `<ellipse cx="${f(fx + 1)}" cy="${f(fy + 0.6)}" rx="5" ry="2" fill="#050816" opacity=".5"/>`;
        for (const [ox, oy] of [[-2.4, 0.6], [0, 1.1], [2.4, 0.6], [-1.2, -0.5], [1.2, -0.5]]) p += `<ellipse cx="${f(fx + ox)}" cy="${f(fy + oy)}" rx="1.6" ry="1" fill="#16141A" stroke="#2C2A33" stroke-width=".35"/>`;
        p += `<path d="M${f(fx - 4)} ${f(fy - 0.5)}l2.5 -2.2l1.8 1.6l2.2 -2l2.6 2.4" fill="none" stroke="#5A3F2E" stroke-width=".7"/>`;
        fumee(fx, fy - 7, 1, rng);
        return p + flammes(fx, fy - 0.5, 1.15, rng);
      }
      const fl = (q) => `M${f(fx - 1)} ${f(fy - 3)}Q${f(fx + q[0])} ${f(fy - q[1])} ${f(fx + 1)} ${f(fy - 3)}Z`;
      return `<circle cx="${f(fx)}" cy="${f(fy - 1)}" r="7" fill="url(#${id('feu')})"/><rect x="${f(fx - 1.2)}" y="${f(fy - 3)}" width="2.4" height="3" fill="#3A2A2A"/><path d="${fl([0, 7])}" fill="#FF9A3C"><animate attributeName="d" values="${fl([0, 7])};${fl([0.6, 5.5])};${fl([0, 7])}" dur=".6s" repeatCount="indefinite"/></path>`;
    }
    if (b.type === 'scene') return scene(b);
    if (b.type === 'carcasse') {
      const r = rng.next() < 0.5, w = r ? 4.6 : 2.2, d = r ? 2.2 : 4.6, X0 = x - w / 2, X1 = x + w / 2, Y0 = y - d / 2, Y1 = y + d / 2;
      s += ombre(X0, X1, Y0, Y1) + boite(X0, X1, Y0, Y1, 2.6, ['#2A2326', '#1C1719', '#151113']) + boite(X0 + (r ? 1 : 0.3), X1 - (r ? 1 : 0.3), Y0 + (r ? 0.3 : 1), Y1 - (r ? 0.3 : 1), 3.8, ['#241D20', '#181315', '#120E10'], 2.6);
      const [gx, gy] = P(x, y, 3.8); s += flammes(gx, gy, 0.8, rng); fumee(gx, gy - 5, 0.8, rng);
      return s;
    }
    if (b.type === 'tireur') {
      const [bx2, by2] = P(x, y, 1.2), [cx2, cy2] = P(b.cible[0], b.cible[1], 1.2), sens = cx2 >= bx2 ? 1 : -1, hb = b.accroupi ? 1.8 : 3, E = 1;
      const ax0 = bx2 + sens * 1.9, ay0 = by2 - hb + 0.3, ax = bx2 + sens * 1.9 * E, ay = by2 + (-hb + 0.3) * E;
      s += `<g transform="translate(${f(bx2)} ${f(by2)}) scale(${E}) translate(${f(-bx2)} ${f(-by2)})">`;
      s += `<ellipse cx="${f(bx2 + 0.4)}" cy="${f(by2 + 0.2)}" rx="1.3" ry=".5" fill="#050816" opacity=".5"/>`;
      s += b.accroupi ? `<path d="M${f(bx2 - 0.7)} ${f(by2)}L${f(bx2 + 0.3)} ${f(by2 - 0.9)}L${f(bx2)} ${f(by2 - 1.2)}" fill="none" stroke="#14121A" stroke-width=".55" stroke-linecap="round"/>`
        : `<path d="M${f(bx2 - 0.6)} ${f(by2)}L${f(bx2)} ${f(by2 - 1.5)}L${f(bx2 + 0.6)} ${f(by2)}" fill="none" stroke="#14121A" stroke-width=".55" stroke-linecap="round"/>`;
      s += `<line x1="${f(bx2)}" y1="${f(by2 - hb + 1.5)}" x2="${f(bx2)}" y2="${f(by2 - hb)}" stroke="${b.coul}" stroke-width="1.2" stroke-linecap="round"/><circle cx="${f(bx2)}" cy="${f(by2 - hb - 0.7)}" r=".62" fill="#1A1820"/>`;
      s += `<line x1="${f(bx2)}" y1="${f(by2 - hb + 0.3)}" x2="${f(ax0)}" y2="${f(ay0)}" stroke="#0E0C12" stroke-width=".45" stroke-linecap="round"/></g>`;
      const du = rng.float(0.9, 1.7), deb = -rng.float(0, du), kt = 'keyTimes="0;.06;.12;1"';
      s += `<circle cx="${f(ax + sens * 0.5)}" cy="${f(ay)}" r="1.25" fill="#FFE59A" opacity="0"><animate attributeName="opacity" values="0;1;0;0" ${kt} dur="${f(du)}s" begin="${f(deb)}s" repeatCount="indefinite"/></circle>`;
      const tx = cx2 - sens * 1.4, ty = cy2 - 3, L = Math.hypot(tx - ax, ty - ay);
      tirs.push(`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(tx)}" y2="${f(ty)}" stroke="#FFE59A" stroke-width=".35" stroke-linecap="round" stroke-dasharray="1.8 ${f(L + 4)}" stroke-dashoffset="0" opacity="0"><animate attributeName="stroke-dashoffset" values="0;${f(-L)};${f(-L)}" keyTimes="0;.14;1" dur="${f(du)}s" begin="${f(deb)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;.02;.15;1" dur="${f(du)}s" begin="${f(deb)}s" repeatCount="indefinite"/></line>`);
      return s;
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
  const cibleDistrict = zoomZone ? '' : `<polygon points="${poly(enveloppe([...mes].flatMap((i) => T.cells[i].poly.map(([x, y]) => P(x, y)))))}" fill="#FFB23F" fill-opacity=".05" stroke="#FFB23F" stroke-width="1" stroke-dasharray="3 2" pointer-events="none"/>`;
  // District : le nom de chaque zone sur son quartier principal (touche → son commissariat).
  const nomsZones = zoomZone ? '' : T.zones.filter((tz) => st.zones[tz.uid]).map((tz) => {
    // Le nom se pose sur le quartier de la zone visible le plus proche du centre (sa capitale en vue district).
    const vus = vue === 'nondroit' ? tz.quartiers.filter((i) => cellsVue.includes(i)) : [tz.capitale];
    if (!vus.length) return '';
    const ndC = T.nd.cells.length ? T.nd.cells.reduce((a, i) => [a[0] + T.cells[i].c[0] / T.nd.cells.length, a[1] + T.cells[i].c[1] / T.nd.cells.length], [0, 0]) : [WW / 2, HH / 2];
    const ci = vus.slice().sort((a, b) => Math.hypot(T.cells[b].c[0] - ndC[0], T.cells[b].c[1] - ndC[1]) - Math.hypot(T.cells[a].c[0] - ndC[0], T.cells[a].c[1] - ndC[1]))[vue === 'nondroit' ? vus.length - 1 : 0];
    const c = T.cells[ci], moiZ = tz.uid === me.uid, z = st.zones[tz.uid];
    const nom = moiZ ? 'Ma zone' : (z.nom.length > 12 ? `${z.nom.slice(0, 11)}…` : z.nom), fd = !!z.fondateur, lw = 14 + nom.length * 4.3 + (fd ? 10 : 0);
    // Zone fondatrice (saison 1) : médaillon de bronze « S1 » devant le nom, liseré bronze.
    const med = fd ? `<g transform="translate(${f(-lw / 2 + 7.5)} -.5)"><title>Zone fondatrice (saison 1)</title><circle r="5.2" fill="url(#${id('bronze')})" stroke="#6E4B17" stroke-width=".6"/><text y="2" text-anchor="middle" style="font:700 5px 'Barlow Condensed',sans-serif;fill:#4A3010">S1</text></g>` : '';
    const [lx, ly] = P(c.c[0], c.c[1], 30);
    const attrs = moiZ ? 'data-action="carte-calque" data-v="mazone"' : `data-action="voir-hp" data-uid="${tz.uid}"`;
    return `<g ${attrs} style="cursor:pointer" transform="translate(${f(lx)} ${f(ly)})"><rect x="${f(-lw / 2)}" y="-8" width="${f(lw)}" height="15" rx="7.5" fill="${moiZ ? '#FFB23F' : '#0B1124'}" fill-opacity="${moiZ ? 1 : 0.88}" stroke="${fd ? '#C99A45' : moiZ ? '#FFB23F' : '#5A6699'}" stroke-width="${fd ? 1 : 0.7}"/>${med}<text ${fd ? 'x="5" ' : ''}y="2.6" text-anchor="middle" class="iso-zn" ${moiZ ? 'style="fill:#0B1124"' : ''}>${nom.replace(/[<&]/g, '')}</text></g>`;
  }).join('');

  const out = `<svg viewBox="${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}" width="100%" style="display:block;background:radial-gradient(ellipse at 50% 40%, #121A3A, #05081A 75%)" class="iso" role="img" aria-label="Maquette de ${zoomZone ? 'ta zone : touche un quartier pour le choisir, la liste en dessous fait la même chose' : 'tout le district : touche ta zone pour y entrer, ou celle d’un collègue pour voir son commissariat'}">
    <defs><filter id="${id('flou')}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
      <linearGradient id="${id('bronze')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3D58C"/><stop offset=".55" stop-color="#C99A45"/><stop offset="1" stop-color="#8E6224"/></linearGradient>
      <radialGradient id="${id('lampe')}"><stop offset="0" stop-color="#FFD58A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id('fumee')}"><stop offset="0" stop-color="#2A2630" stop-opacity=".95"/><stop offset=".6" stop-color="#2A2630" stop-opacity=".6"/><stop offset="1" stop-color="#2A2630" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id('feu')}"><stop offset="0" stop-color="#FF7A3C" stop-opacity=".6"/><stop offset="1" stop-color="#FF7A3C" stop-opacity="0"/></radialGradient>
      <clipPath id="${id('vue')}"><rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}"/></clipPath></defs>
    <style>.iso-tn{font:800 7px 'Bricolage Grotesque',sans-serif;fill:#0B1124}.iso-nmq{font:800 7px 'Instrument Sans',sans-serif;fill:#0B1124}.iso-pbt{font:800 6px 'Bricolage Grotesque',sans-serif;fill:#fff}.iso-zn{font:700 7.5px 'Instrument Sans',sans-serif;fill:#EDF0FA}.iso .hit,.iso .hit-zone,.iso .hit-nd,.iso .hit-autre{cursor:pointer}</style>
    <g clip-path="url(#${id('vue')})">${routes.join('')}${fleuve}${sol.join('')}${selections.join('')}${lueurs.join('')}${voitures.join('')}${objets.map(dessin).join('')}${tirs.join('')}${fumees.join('')}<!--dyn-->${cibles.map((c) => c.h).join('')}${cibleDistrict}${etiqND.join('')}${etiqHtml}${nomsZones}</g>
  </svg>`;
  const pos = (i, z = 0) => (T.cells[i] ? P(T.cells[i].c[0], T.cells[i].c[1], z) : null);
  const route = itineraire(T, ndSet, st, P);
  const capitale = Object.fromEntries(T.zones.map((tz) => [tz.uid, tz.capitale]));
  return { svg: reduit ? out.replace(/<animate[^>]*\/>|<animateTransform[^>]*\/>/g, '') : out, pos, capitale, route };
}

/**
 * Itinéraire des fourgons par les rues (les bords des quartiers) : les rues qui traversent le non-droit
 * (entre deux secteurs tenus par le milieu) sont évitées ; on n'y entre qu'au dernier moment, par le bord du secteur visé.
 * Rend une fonction (de, vers) → points à l'écran.
 */
export function itineraire(T, ndSet, st, P) {
  const tenu = (i) => ndSet.has(i) && !(st.nonDroit && st.nonDroit.secteurs[i] && st.nonDroit.secteurs[i].statut === 'repris');
  const sommets = [], cle = (p) => { for (let k = 0; k < sommets.length; k++) if (Math.abs(sommets[k][0] - p[0]) < 0.6 && Math.abs(sommets[k][1] - p[1]) < 0.6) return k; sommets.push(p); return sommets.length - 1; };
  const parCellule = T.cells.map((c) => c.poly.map(cle));
  const aretes = new Map();
  parCellule.forEach((ks, i) => ks.forEach((a, j) => { const b = ks[(j + 1) % ks.length]; if (a === b) return; const k = a < b ? `${a}-${b}` : `${b}-${a}`; if (!aretes.has(k)) aretes.set(k, { a, b, cells: [] }); aretes.get(k).cells.push(i); }));
  const vois = sommets.map(() => []);
  for (const e of aretes.values()) {
    const L = Math.hypot(sommets[e.a][0] - sommets[e.b][0], sommets[e.a][1] - sommets[e.b][1]);
    const dedansND = e.cells.length > 1 && e.cells.every(tenu);
    vois[e.a].push([e.b, L, dedansND]); vois[e.b].push([e.a, L, dedansND]);
  }
  const memo = new Map();
  return (de, vers, z = 0.6) => {
    const k0 = `${de}>${vers}`;
    if (memo.has(k0)) return memo.get(k0);
    if (!T.cells[de] || !T.cells[vers]) return null;
    const N = sommets.length, SRC = N, DST = N + 1, dist = new Array(N + 2).fill(Infinity), prec = new Array(N + 2).fill(-1), fait = new Array(N + 2).fill(false);
    const cD = T.cells[de].c, cV = T.cells[vers].c, depart = new Set(parCellule[de]), arrivee = new Set(parCellule[vers]);
    dist[SRC] = 0;
    for (;;) {
      let u = -1;
      for (let k = 0; k < N + 2; k++) if (!fait[k] && dist[k] < Infinity && (u < 0 || dist[k] < dist[u])) u = k;
      if (u < 0 || u === DST) break;
      fait[u] = true;
      const pu = u === SRC ? cD : sommets[u];
      const suiv = u === SRC ? [...depart].map((v) => [v, Math.hypot(sommets[v][0] - cD[0], sommets[v][1] - cD[1]), false]) : vois[u];
      for (const [v, L, nd] of suiv) { const c = dist[u] + L * (nd ? 12 : 1); if (c < dist[v]) { dist[v] = c; prec[v] = u; } }
      if (u !== SRC && arrivee.has(u)) { const c = dist[u] + Math.hypot(cV[0] - pu[0], cV[1] - pu[1]); if (c < dist[DST]) { dist[DST] = c; prec[DST] = u; } }
    }
    if (prec[DST] < 0) { memo.set(k0, null); return null; }
    const pts = [];
    for (let u = DST; u >= 0; u = prec[u]) pts.unshift(u === SRC ? cD : u === DST ? cV : sommets[u]);
    const res = pts.map(([x, y]) => P(x, y, z));
    memo.set(k0, res);
    return res;
  };
}
