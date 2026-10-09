// Carte « plateau » de la saison 2 : chaque quartier devient une tuile nette et arrondie, séparée de ses voisines,
// colorée par sa tension (ma zone) ou par la couleur de sa zone (le district). Pas de rues ni de parcs : un fond sombre
// et pointillé, le fleuve en ruban lumineux, de gros chiffres lisibles et des pastilles pour les noms.
import { S, esc } from './common.js';
import { territoires, W, H, WW, HH } from './ville.js';
import { bezier, ICONES } from './plan.js';
import { siteDe } from '../engine/sites.js';
import { tensionsDe, quartiersFrontaliers, niveauTension } from '../engine/quartiers.js';
import { milieuDe } from '../engine/nondroit.js';
import { hashString } from '../engine/rng.js';
import { operationActive } from '../engine/zone.js';

const f1 = (v) => v.toFixed(1);
const pts = (poly) => poly.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
const retrecir = (poly, c, f) => poly.map(([x, y]) => [c[0] + (x - c[0]) * f, c[1] + (y - c[1]) * f]);

/** Couleurs des tuiles selon la tension : franches, sans boue, et lisibles avec un texte blanc. */
const TENSION = { calme: ['#1F7A5A', '#2E9E74'], surveille: ['#8E7420', '#B8962E'], tendu: ['#A2531E', '#CF7432'], chaud: ['#9E2F2B', '#D2463E'] };

/** Mélange deux couleurs hexadécimales (t = part de b). */
function mix(a, b, t) {
  const h = (x) => [1, 3, 5].map((k) => parseInt(x.slice(k, k + 2), 16));
  const A = h(a.length === 4 ? `#${a[1]}${a[1]}${a[2]}${a[2]}${a[3]}${a[3]}` : a), B = h(b);
  return `#${A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export function planPlateau(st, me, { zoom = false } = {}) {
  const T = territoires(S.config.seed, Object.values(st.zones));
  const zoneOf = (i) => (T.owner[i] >= 0 ? st.zones[T.order[T.owner[i]]] : null);
  const moi = T.zones.find((x) => x.uid === me.uid);
  const mesQ = new Set(moi ? moi.quartiers : []);
  const ndSet = new Set(T.nd.cells);

  // Cadrage : ma zone et ses voisines immédiates, ou tout le district.
  const poss = [...T.zones.flatMap((tz) => tz.quartiers), ...T.nd.cells];
  const cadre = (idx, marge) => {
    const pp = idx.flatMap((i) => T.cells[i].poly);
    let x0 = Math.min(...pp.map((p) => p[0])) - marge, x1 = Math.max(...pp.map((p) => p[0])) + marge;
    let y0 = Math.min(...pp.map((p) => p[1])) - marge, y1 = Math.max(...pp.map((p) => p[1])) + marge;
    const r = W / H, w = x1 - x0, h = y1 - y0;
    if (w / h > r) { const nh = w / r; y0 -= (nh - h) / 2; y1 = y0 + nh; } else { const nw = h * r; x0 -= (nw - w) / 2; x1 = x0 + nw; }
    return [x0, y0, x1 - x0, y1 - y0];
  };
  const [vx, vy, vw, vh] = zoom && moi ? cadre(moi.quartiers, 10) : cadre(poss, 12);
  const ech = vw / W; // les textes gardent la même taille à l'écran quel que soit le cadrage
  const sel = S.quartierSel != null ? Number(S.quartierSel) : null;
  const pat = (S.draft && S.draft.patrouilles) || {};
  const mesT = tensionsDe(st, me);
  const front = new Set(quartiersFrontaliers(st, me.uid));

  // Fleuve : même tracé que l'ancienne carte, en ruban lumineux.
  const P0 = [-10, HH * 0.58], P1 = [WW * 0.3, HH * 0.7], P2 = [WW * 0.58, HH * 0.28], P3 = [WW + 10, HH * 0.42];
  const A = [], B = [], axe = [];
  for (let k = 0; k <= 48; k++) {
    const t = k / 48, a = bezier(Math.max(0, t - 0.01), P0, P1, P2, P3), b = bezier(Math.min(1, t + 0.01), P0, P1, P2, P3), c = bezier(t, P0, P1, P2, P3);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), w = 6 + 10 * t * t;
    A.push([c[0] - Math.sin(ang) * w, c[1] + Math.cos(ang) * w]); B.push([c[0] + Math.sin(ang) * w, c[1] - Math.cos(ang) * w]); axe.push(c);
  }
  const fleuve = `<polygon points="${pts([...A, ...B.reverse()])}" fill="url(#pl-eau)"/><polyline points="${pts(axe)}" fill="none" stroke="#7FB4FF" stroke-opacity=".35" stroke-width="${f1(1.2 * ech)}" stroke-dasharray="${f1(6 * ech)} ${f1(9 * ech)}" stroke-linecap="round"/>`;

  // Tuiles.
  const tuile = (i, fill, { trait = fill, op = 1, action = '', glow = '', titre = '', tirets = false } = {}) => {
    const c = T.cells[i], g = retrecir(c.poly, c.c, 0.9);
    return `<polygon points="${pts(g)}" fill="${fill}" fill-opacity="${op}" stroke="${trait}" stroke-opacity="${op}" stroke-width="${f1((tirets ? 1.6 : 4) * ech)}" stroke-linejoin="round" ${tirets ? `stroke-dasharray="${f1(3 * ech)} ${f1(3 * ech)}"` : ''} ${glow ? `filter="url(#${glow})"` : ''} ${action}>${titre ? `<title>${esc(titre)}</title>` : ''}</polygon>`;
  };
  const tuiles = [], textes = [], badges = [];
  for (const c of T.cells) {
    const i = c.i, z = zoneOf(i);
    if (ndSet.has(i)) {
      const s = st.nonDroit && st.nonDroit.secteurs[i];
      const repris = s && s.statut === 'repris', chef = s && s.chef && st.zones[s.chef];
      tuiles.push(tuile(i, repris ? mix(chef ? chef.couleur : '#4FBF8A', '#0B1124', 0.45) : '#4A1517', { trait: repris ? mix(chef ? chef.couleur : '#4FBF8A', '#0B1124', 0.3) : '#6B1D1F', action: 'data-action="carte-calque" data-v="nondroit" style="cursor:pointer"', titre: `${c.nom} · zone de non-droit${s ? ` · ${repris ? 'reprise' : `emprise ${Math.round(s.emprise)}`}` : ''}` }));
      if (!repris) tuiles.push(`<polygon points="${pts(retrecir(c.poly, c.c, 0.9))}" fill="url(#pl-hach)" style="pointer-events:none"/>`);
      if (s && !zoom) textes.push(`<text x="${f1(c.c[0])}" y="${f1(c.c[1] + 3.2 * ech)}" text-anchor="middle" class="pl-n" style="font-size:${f1(9 * ech)}px">${repris ? '✓' : Math.round(s.emprise)}</text>`);
      continue;
    }
    if (!z) continue; // hors du district : le fond suffit
    const mien = mesQ.has(i);
    if (zoom && mien) {
      const t = mesT[i], n = niveauTension(t), [fonce, clair] = TENSION[n.id];
      tuiles.push(tuile(i, `url(#pl-${n.id})`, { trait: i === sel ? '#FFFFFF' : clair, glow: i === sel ? 'pl-lueur-b' : 'pl-ombre', action: `data-action="quartier" data-c="${i}" style="cursor:pointer"`, titre: `${c.nom} : ${n.nom} (${Math.round(t)})` }));
      void fonce;
      textes.push(`<g transform="translate(${f1(c.c[0])} ${f1(c.c[1])})" style="pointer-events:none">
        <text y="${f1(-2 * ech)}" text-anchor="middle" class="pl-n" style="font-size:${f1(15 * ech)}px">${Math.round(t)}</text>
        <text y="${f1(9 * ech)}" text-anchor="middle" class="pl-q" style="font-size:${f1(6.6 * ech)}px">${esc(c.nom)}</text></g>`);
      continue;
    }
    if (zoom && front.has(i)) {
      const t = tensionsDe(st, z)[i], n = niveauTension(t);
      tuiles.push(tuile(i, mix(z.couleur, '#0B1124', 0.78), { trait: n.couleur, op: 0.9, tirets: true, action: `data-action="quartier" data-c="${i}" style="cursor:pointer"`, titre: `${c.nom} (${z.nom}) : ${n.nom} (${Math.round(t)})` }));
      textes.push(`<text x="${f1(c.c[0])}" y="${f1(c.c[1] + 2.5 * ech)}" text-anchor="middle" class="pl-q" style="font-size:${f1(6 * ech)}px;fill-opacity:.75">${esc(c.nom)}</text>`);
      continue;
    }
    // Vue du district (ou quartier lointain en vue de ma zone) : la couleur de la zone, adoucie.
    tuiles.push(tuile(i, mix(z.couleur, '#0B1124', mien ? 0.35 : zoom ? 0.8 : 0.55), { trait: mien ? '#FFB23F' : mix(z.couleur, '#0B1124', zoom ? 0.7 : 0.4), glow: mien ? 'pl-lueur' : '', action: mien ? `data-action="quartier" data-c="${i}" style="cursor:pointer"` : '', titre: `${c.nom} · ${z.nom}` }));
  }

  // Repères : patrouilles, point chaud, hôtel de police, sites, affaires, événement, opération.
  const at = (i, dx, dy, inner, extra = '') => { const c = T.cells[i].c; return `<g transform="translate(${f1(c[0] + dx * ech)} ${f1(c[1] + dy * ech)}) scale(${f1(ech)})" style="pointer-events:none" ${extra}>${inner}</g>`; };
  if (zoom) {
    for (const [k, a] of Object.entries(pat)) {
      if (!a || !mesQ.has(Number(k))) continue;
      badges.push(at(Number(k), 13, -13, `<circle r="8.5" fill="#63B0FF" stroke="#0B1124" stroke-width="1.6"/><text y="3.4" text-anchor="middle" class="pl-b">${a}</text>`));
    }
    const pc = me.pointChaud;
    if (pc && mesQ.has(Number(pc.cell))) badges.push(at(Number(pc.cell), -13, -13, `<circle r="9" fill="#E0625A" stroke="#0B1124" stroke-width="1.6"><animate attributeName="r" values="8;10;8" dur="1.6s" repeatCount="indefinite"/></circle><path d="M0 -5c2.6 2.4 3.6 4.2 3.6 6a3.6 3.6 0 0 1-7.2 0c0-1.2.6-2.4 1.6-3.3.2 1.2.8 1.8 1.4 1.8C-.6 -.6-.8 -3 0 -5z" fill="#fff"/>`));
  }
  if (moi) badges.push(at(moi.capitale, 0, zoom ? 21 : 0, `<path d="M0 -10l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10v-5z" fill="#FFB23F" stroke="#0B1124" stroke-width="1.6"/><path d="M-3.5 0l2.5 2.5 4.5-5" fill="none" stroke="#0B1124" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`));
  for (const tz of T.zones) {
    const z = st.zones[tz.uid], s = siteDe(z);
    if (!s || (zoom && tz.uid !== me.uid)) continue;
    const q = tz.quartiers.filter((i) => i !== tz.capitale);
    const i = (q.length ? q : tz.quartiers)[Math.abs(hashString(`${tz.uid}:${s.id}`)) % (q.length || tz.quartiers.length)];
    badges.push(at(i, zoom ? 0 : 0, zoom ? 21 : 0, `<circle r="8" fill="${s.couleur}" stroke="#0B1124" stroke-width="1.6"/><g transform="scale(.8)">${ICONES[s.id] || ''}</g>`));
  }
  st.affaires.forEach((a, k) => {
    const tz = T.zones.find((x) => x.uid === a.zone);
    if (!tz) return;
    const i = tz.quartiers[Math.abs(hashString(a.id)) % tz.quartiers.length];
    badges.push(at(i, 12, 12, `<path d="M0 9c-5-5.5-8-8.6-8-12.4a8 8 0 0 1 16 0C8 .4 5 3.5 0 9z" fill="#FFB23F" stroke="#0B1124" stroke-width="1.5"/><text y="-.6" text-anchor="middle" class="pl-b" style="fill:#1A1204">${k + 1}</text>`));
  });
  if (st.evenement) badges.push(at(T.nd.coeur, 0, 22, `<circle r="9" fill="#EDF0FA" stroke="#0B1124" stroke-width="1.5"/><path d="M0 -5.5l1.6 3.4 3.7.5-2.7 2.6.7 3.7L0 3 -3.3 4.7l.7-3.7-2.7-2.6 3.7-.5z" fill="#0B1124"/>`));
  const op = operationActive(me, st.turn);
  if (op && moi) badges.push(at(moi.capitale, 0, 0, `<circle r="14" fill="none" stroke="#FF6E6A" stroke-width="2"><animate attributeName="r" values="10;22;10" dur="2s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values="1;0;1" dur="2s" repeatCount="indefinite"/></circle>`));

  // Pastilles des zones : une par zone visible, sur sa capitale.
  const pastilles = T.zones.map((tz) => {
    const z = st.zones[tz.uid], c = T.cells[tz.capitale].c, mien = tz.uid === me.uid;
    if (zoom && mien) return '';
    if (c[0] < vx || c[0] > vx + vw || c[1] < vy || c[1] > vy + vh) return '';
    const nom = z.nom.slice(0, 14), w = (nom.length * 6.2 + 22) * ech, h = 16 * ech;
    const y = c[1] - (zoom ? 0 : 14 * ech);
    return `<g style="pointer-events:none"><rect x="${f1(c[0] - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="#0B1124" fill-opacity=".9" stroke="${mien ? '#FFB23F' : 'rgba(255,255,255,.18)'}" stroke-width="${f1((mien ? 1.6 : 1) * ech)}" filter="url(#pl-ombre)"/>
      <circle cx="${f1(c[0] - w / 2 + 9 * ech)}" cy="${f1(y)}" r="${f1(3.4 * ech)}" fill="${esc(z.couleur)}"/>
      <text x="${f1(c[0] + 4 * ech)}" y="${f1(y + 3.6 * ech)}" text-anchor="middle" class="pl-z" style="font-size:${f1(10 * ech)}px">${esc(nom)}</text></g>`;
  }).join('');
  const ndTitre = !zoom ? (() => { const c = T.cells[T.nd.coeur].c; return `<text x="${f1(c[0])}" y="${f1(c[1] - 16 * ech)}" text-anchor="middle" class="pl-nd" style="font-size:${f1(7.5 * ech)}px">NON-DROIT</text>`; })() : '';

  return `<svg class="plan-plateau" viewBox="${f1(vx)} ${f1(vy)} ${f1(vw)} ${f1(vh)}" width="100%" role="img" aria-label="${zoom ? `Tes ${mesQ.size} quartiers et leur tension` : `Le district : ${T.zones.length} zones et la zone de non-droit`}" style="display:block;aspect-ratio:${W}/${H};background:#070B19">
    <defs>
      <pattern id="pl-points" width="${f1(9 * ech)}" height="${f1(9 * ech)}" patternUnits="userSpaceOnUse"><circle cx="${f1(1 * ech)}" cy="${f1(1 * ech)}" r="${f1(0.7 * ech)}" fill="#2A3560"/></pattern>
      <pattern id="pl-hach" width="${f1(5 * ech)}" height="${f1(5 * ech)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V${f1(5 * ech)}" stroke="#E0625A" stroke-opacity=".45" stroke-width="${f1(1.6 * ech)}"/></pattern>
      <linearGradient id="pl-eau" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0F2A57"/><stop offset="1" stop-color="#14356B"/></linearGradient>
      ${Object.entries(TENSION).map(([k, [a, b]]) => `<linearGradient id="pl-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>`).join('')}
      <filter id="pl-ombre" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${f1(2 * ech)}" stdDeviation="${f1(2 * ech)}" flood-color="#000" flood-opacity=".55"/></filter>
      <filter id="pl-lueur" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="${f1(2.6 * ech)}" flood-color="#FFB23F" flood-opacity=".55"/></filter>
      <filter id="pl-lueur-b" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="${f1(3 * ech)}" flood-color="#FFFFFF" flood-opacity=".7"/></filter>
      <radialGradient id="pl-vign" cx="50%" cy="50%" r="72%"><stop offset="58%" stop-color="#05081A" stop-opacity="0"/><stop offset="100%" stop-color="#05081A" stop-opacity=".85"/></radialGradient>
    </defs>
    <style>
      text{pointer-events:none}
      .pl-n{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:${f1(2 * ech)}px}
      .pl-q{font-family:'Instrument Sans',sans-serif;font-weight:700;fill:#fff;fill-opacity:.92}
      .pl-z{font-family:'Instrument Sans',sans-serif;font-weight:700;fill:#EDF0FA}
      .pl-b{font-family:'Instrument Sans',sans-serif;font-weight:800;font-size:9px;fill:#0B1124}
      .pl-nd{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;fill:#FF8A84;letter-spacing:${f1(1.4 * ech)}px;paint-order:stroke;stroke:#0B1124;stroke-width:${f1(2.4 * ech)}px}
    </style>
    <rect x="${f1(vx - 50)}" y="${f1(vy - 50)}" width="${f1(vw + 100)}" height="${f1(vh + 100)}" fill="url(#pl-points)"/>
    ${fleuve}
    ${tuiles.join('')}
    ${textes.join('')}${ndTitre}
    ${pastilles}
    ${badges.join('')}
    <rect x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vh)}" fill="url(#pl-vign)" style="pointer-events:none"/>
  </svg>`;
}

void milieuDe;
