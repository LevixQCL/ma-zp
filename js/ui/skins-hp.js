// Skins de l'hôtel de police et du garage ajoutés en octobre 2026 (idées de Gemini, redessinées pour la scène).
// Chaque skin habille le bâtiment existant (mêmes fenêtres, mêmes étages) : un fond sous les fenêtres,
// un habillage par-dessus, et un objet sur le toit à droite de l'enseigne.
// c = { x0, w, top, base, gf, fh, b, P, teinte, mix, uid, nom, moment, rnd, graine, LIT }

const f1 = (v) => Math.round(v * 10) / 10;
/** Positions des fenêtres des étages : [{ x, y }] (y = haut de l'étage). */
function fenetres(c) {
  const out = [];
  for (let f = 0; f < c.b - 1; f++) { const y = c.base - c.gf - (f + 1) * c.fh; for (let k = 0; k < 6; k++) out.push({ x: c.x0 + 24 + k * 22, y, k, f }); }
  return out;
}
/** Entre-deux des fenêtres (pour les motifs qui ne doivent pas couvrir les vitres). */
function trumeaux(c) {
  const out = [];
  for (let f = 0; f < c.b - 1; f++) { const y = c.base - c.gf - (f + 1) * c.fh; for (let k = 0; k < 5; k++) out.push({ x: c.x0 + 43 + k * 22, y, k, f }); }
  return out;
}

/** Skins d'hôtel de police gérés ici (le toit standard s'efface devant leur objet). */
export const SKINS_BATIMENT_NEUFS = ['canard', 'aquarium', 'moulin', 'ampli', 'ruche'];

/** Fond de façade, dessiné sous les fenêtres. */
export function fondBatiment(SB, c) {
  const { x0, w, top, base, gf, teinte, uid } = c;
  const hy = base - gf - top; // hauteur des étages
  if (hy <= 0) return '';
  if (SB === 'moulin') {
    // Planches verticales et deux cerclages de laiton.
    let s = '';
    for (let x = x0 + 22; x < x0 + w; x += 7) s += `<rect x="${x}" y="${top}" width=".7" height="${hy}" fill="${teinte('#3E2416')}" opacity=".45"/>`;
    return s;
  }
  if (SB === 'ampli') {
    // Toile de haut-parleur tissée.
    return `<pattern id="hp-toile-${uid}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="none"/><path d="M0 0 L3 3 M3 0 L0 3" stroke="${teinte('#2A0606')}" stroke-width=".55" opacity=".7"/></pattern>
      <rect x="${x0 + 16}" y="${top}" width="${w - 16}" height="${hy}" fill="url(#hp-toile-${uid})"/>`;
  }
  if (SB === 'ruche') {
    // Alvéoles hexagonales.
    return `<pattern id="hp-hex-${uid}" width="9" height="15.6" patternUnits="userSpaceOnUse"><path d="M0 2.6 L4.5 0 L9 2.6 V7.8 L4.5 10.4 L0 7.8 Z M4.5 10.4 V15.6" fill="none" stroke="${teinte('#B86A00')}" stroke-width=".7"/></pattern>
      <rect x="${x0 + 16}" y="${top}" width="${w - 16}" height="${hy}" fill="url(#hp-hex-${uid})" opacity=".8"/>`;
  }
  if (SB === 'aquarium') {
    // Reflets d'eau : bandes plus claires en biais.
    let s = `<clipPath id="hp-aq-${uid}"><rect x="${x0}" y="${top}" width="${w}" height="${hy}"/></clipPath><g clip-path="url(#hp-aq-${uid})">`;
    for (let x = x0 + 10; x < x0 + w + hy; x += 34) s += `<path d="M${x} ${top} l-${Math.min(hy, 60)} ${Math.min(hy, 60)} h7 l${Math.min(hy, 60)} -${Math.min(hy, 60)} Z" fill="#FFFFFF" opacity=".07"/>`;
    return s + '</g>';
  }
  return '';
}

/** Habillage par-dessus les fenêtres. `rr` : générateur stable propre au skin. */
export function habillageBatiment(SB, c) {
  const { x0, w, top, base, gf, b, P, teinte, mix, LIT } = c;
  const rr = c.rnd(c.graine(c.nom) + 77);
  const gy = base - gf;
  let s = '';
  if (SB === 'canard') {
    // Hublots à la place des fenêtres, cerclés de jaune.
    for (const { x, y } of fenetres(c)) {
      const on = rr() < P.allume;
      s += `<rect x="${x - 1}" y="${y + 5}" width="18" height="13" fill="${P.facade[0]}"/><circle cx="${x + 8}" cy="${y + 11.5}" r="5.2" fill="${on ? LIT : teinte('#1F3B2A')}" stroke="${teinte('#F2D02E')}" stroke-width="1.5"/><circle cx="${x + 6.4}" cy="${y + 9.8}" r="1.3" fill="#FFFFFF" opacity="${on ? 0.35 : 0.5}"/>`;
    }
    // Grande lentille d'observation sur la tour.
    if (b >= 2) s += `<circle cx="${x0 + 8}" cy="${top + 12}" r="6.5" fill="${teinte('#2A4A63')}" stroke="${teinte('#F2D02E')}" stroke-width="1.6"/><circle cx="${x0 + 8}" cy="${top + 12}" r="3" fill="${teinte('#8CC8F5')}" opacity=".8"/><circle cx="${x0 + 6.6}" cy="${top + 10.6}" r="1.1" fill="#FFFFFF" opacity=".8"/>`;
  }
  if (SB === 'aquarium') {
    const hy = gy - top;
    // Surface de l'eau (vague) sous le couvercle.
    let d = `M${x0} ${top + 3}`;
    for (let x = x0; x < x0 + w; x += 10) d += ` q2.5 -2 5 0 t5 0`;
    s += `<path d="${d} V${top} H${x0} Z" fill="${teinte('#BDEBFF')}" opacity=".9"/>`;
    // Algues au pied des étages.
    if (b >= 2) for (const { x, f } of trumeaux(c)) if (f === 0) s += `<path d="M${x} ${gy} q-3 -5 0 -9 q3 -4 0 -9" stroke="${teinte('#2E9E6A')}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M${x + 3} ${gy} q3 -4 0 -7" stroke="${teinte('#45B97F')}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    // Bulles qui montent entre les fenêtres.
    if (hy > 10) for (const k of [0, 2, 4]) {
      const bx = x0 + 43 + k * 22 + 2;
      s += `<g class="hp-bulles" style="animation-delay:${-k * 0.9}s">${[0, 1, 2].map((j) => `<circle cx="${bx + (j % 2) * 1.5}" cy="${f1(gy - 4 - j * (hy / 3.4))}" r="${1 + j * 0.4}" fill="none" stroke="#FFFFFF" stroke-width=".6" opacity=".75"/>`).join('')}</g>`;
    }
    // Poissons-gyrophares (orange, petite coupole bleue sur la tête).
    const nbp = b >= 2 ? Math.min(4, b) : 1;
    for (let i = 0; i < nbp; i++) {
      const fx = x0 + 34 + rr() * (w - 60), fy = b >= 2 ? top + 9 + rr() * Math.max(4, hy - 18) : gy + 20, sens = rr() < 0.5 ? 1 : -1;
      s += `<g class="hp-poisson" transform="translate(${f1(fx)},${f1(fy)}) scale(${sens},1)">${P.neon ? '<circle cx="2" cy="-3.6" r="3.4" fill="#63B0FF" opacity=".35"/>' : ''}<path d="M-5 0 l-3 -2.6 v5.2 Z" fill="${P.neon ? '#E0661A' : '#FF7A1A'}"/><ellipse cx="0" cy="0" rx="5" ry="2.8" fill="${P.neon ? '#F07A28' : '#FF8C2A'}"/><circle cx="2.6" cy="-.6" r=".6" fill="#0C1124"/><path d="M0.6 -2.6 a1.5 1.5 0 0 1 3 0 Z" fill="#63B0FF"/><circle class="hp-balise" cx="2.1" cy="-3" r=".5" fill="#CFE8FF"/></g>`;
    }
  }
  if (SB === 'moulin') {
    // Cerclages de laiton aux angles et grains de café sculptés entre les fenêtres.
    const laiton = teinte('#C9A13B');
    s += `<rect x="${x0 + 16}" y="${top}" width="1.6" height="${gy - top}" fill="${laiton}"/><rect x="${x0 + w - 1.6}" y="${top}" width="1.6" height="${gy - top}" fill="${laiton}"/>`;
    for (const { x, y, k, f } of trumeaux(c)) if ((k + f) % 2 === 0) s += `<g transform="translate(${x},${y + 11.5}) rotate(${k % 2 ? 20 : -20})"><ellipse rx="1.7" ry="3" fill="${teinte('#3A2216')}"/><path d="M0 -2.6 q-1 2.6 0 5.2" stroke="${teinte('#8A5A3A')}" stroke-width=".6" fill="none"/></g>`;
    // Tiroir à mouture sous l'enseigne POLICE, poignée en laiton.
    s += `<circle cx="${x0 + 8}" cy="${gy + 16}" r="1.6" fill="${laiton}"/>`;
  }
  if (SB === 'ampli') {
    // Passepoil beige et coins métalliques.
    const pp = teinte('#D4A373'), coin = teinte('#C8CDD3');
    if (gy - top > 4) s += `<rect x="${x0 + 18}" y="${top + 1.5}" width="${w - 20}" height="${gy - top - 3}" fill="none" stroke="${pp}" stroke-width="1.1" rx="1.5"/>`;
    for (const [cx, cy, sx, sy] of [[x0, top, 1, 1], [x0 + w, top, -1, 1], [x0, base, 1, -1], [x0 + w, base, -1, -1]]) s += `<path d="M${cx} ${cy} h${7 * sx} l${-7 * sx} ${7 * sy} Z" fill="${coin}"/><circle cx="${cx + 2 * sx}" cy="${cy + 2 * sy}" r=".6" fill="${teinte('#5B6B7D')}"/>`;
    // Plaque « ZP » dorée sur la toile.
    s += `<rect x="${x0 + w - 21}" y="${gy + 13}" width="17" height="6" rx="1" fill="${teinte('#C9A13B')}"/><text x="${x0 + w - 12.5}" y="${gy + 17.6}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="5" fill="${teinte('#3A2410')}">ZP</text>`;
  }
  if (SB === 'ruche') {
    // Bandes noires d'abeille entre les étages, bande de sécurité au pied.
    const noir = teinte('#2A2118');
    for (let f = 0; f < b - 1; f++) { const y = gy - (f + 1) * c.fh; s += `<rect x="${x0}" y="${y + c.fh - 2}" width="${w}" height="3" fill="${noir}"/>`; }
    for (let x = x0, i = 0; x < x0 + w; x += 4, i++) s += `<path d="M${x} ${base} l3 -4 h2 l-3 4 Z" fill="${noir}"/>`;
    // Coulure de miel le long de la façade.
    const mx = x0 + w - 12, miel = teinte('#E58A00');
    s += `<path d="M${mx - 3} ${top} h6 v${Math.min(18, gy - top - 2)} q0 3 -3 3 q-3 0 -3 -3 Z" fill="${miel}" opacity=".95"/><circle cx="${mx - 1}" cy="${top + 4}" r=".8" fill="#FFFFFF" opacity=".6"/>`;
  }
  return s;
}

/** Objet sur le toit (à droite de l'enseigne). */
export function toitBatiment(SB, c) {
  const { x0, w, top, P, teinte, mix } = c;
  let s = '';
  if (SB === 'canard') {
    // Dôme d'observation et périscope en forme de canard.
    const dx = x0 + w - 30;
    s += `<path d="M${dx - 15} ${top - 4} A15 13 0 0 1 ${dx + 15} ${top - 4} Z" fill="${teinte('#2F4F38')}"/><rect x="${dx - 2.5}" y="${top - 16}" width="5" height="12" fill="${teinte('#1E3526')}" opacity=".8"/><rect x="${dx - 16}" y="${top - 6}" width="32" height="2.4" rx="1" fill="${teinte('#F2D02E')}"/>
      <rect x="${dx - 1.6}" y="${top - 32}" width="3.2" height="16" fill="${teinte('#7A8C9E')}"/>
      <g class="hp-pivote" style="transform-origin:${dx}px ${top - 30}px"><g transform="translate(${dx},${top - 34})">
        <ellipse cx="-1" cy="0" rx="8" ry="4.6" fill="${teinte('#FFE600')}"/><path d="M-9 -1 l-3 -3 l1 4 Z" fill="${teinte('#FFE600')}"/>
        <circle cx="4" cy="-6" r="4.2" fill="${teinte('#FFE600')}"/><path d="M7.6 -6.4 l4.4 1 l-4.2 1.6 Z" fill="${teinte('#FF8C1A')}"/>
        <circle cx="5" cy="-7" r="1.6" fill="${teinte('#1A2E05')}" stroke="#8CC8F5" stroke-width=".6"/><circle cx="4.5" cy="-7.5" r=".5" fill="#FFFFFF"/>
        <path d="M-5 -1 q3 2 6 0" stroke="${teinte('#E6C600')}" stroke-width=".7" fill="none"/></g></g>`;
  }
  if (SB === 'aquarium') {
    // Couvercle du bocal et petit filtre qui bulle.
    const fx = x0 + w - 30;
    s += `<rect x="${x0 - 3}" y="${top - 5}" width="${w + 6}" height="5" rx="2.5" fill="${teinte('#0B4F7A')}"/><rect x="${x0}" y="${top - 4.4}" width="${w}" height=".8" fill="#FFFFFF" opacity=".25"/>
      <rect x="${fx - 9}" y="${top - 13}" width="18" height="8" rx="2" fill="${teinte('#E4EBF2')}"/><rect x="${fx - 6}" y="${top - 11}" width="12" height="2" rx="1" fill="${teinte('#5AB0F0')}"/><circle class="hp-balise" cx="${fx + 6}" cy="${top - 7.4}" r=".9" fill="#3DD39A"/>
      <rect x="${fx + 10}" y="${top - 10}" width="2" height="12" fill="${teinte('#C8D3DD')}"/>`;
  }
  if (SB === 'moulin') {
    // Trémie en laiton pleine de grains, et la manivelle qui tourne.
    const hx = x0 + w - 28, laiton = teinte('#C9A13B'), fonce = teinte('#8A6A1E');
    s += `<path d="M${hx - 9} ${top - 4} L${hx - 15} ${top - 18} H${hx + 15} L${hx + 9} ${top - 4} Z" fill="${laiton}"/><path d="M${hx - 15} ${top - 18} H${hx + 15}" stroke="${fonce}" stroke-width="1.6"/>
      <ellipse cx="${hx}" cy="${top - 18}" rx="13" ry="2.6" fill="${teinte('#3A2216')}"/>${[-7, -2, 3, 8].map((dx, i) => `<ellipse cx="${hx + dx}" cy="${top - 19 - (i % 2)}" rx="1.6" ry="1.1" fill="${teinte('#5A3422')}"/>`).join('')}
      <path d="M${hx - 12} ${top - 10} H${hx + 12}" stroke="${fonce}" stroke-width=".7" opacity=".7"/>
      <rect x="${hx - 1}" y="${top - 32}" width="2" height="14" fill="${teinte('#6B7A8A')}"/><circle cx="${hx}" cy="${top - 32}" r="2" fill="${fonce}"/>
      <g class="hp-manivelle" style="transform-origin:${hx}px 0px"><path d="M${hx} ${top - 32} H${hx + 15}" stroke="${teinte('#6B7A8A')}" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="${hx + 15}" cy="${top - 36}" rx="2.2" ry="4" fill="${teinte('#D9B98A')}"/></g>`;
  }
  if (SB === 'ampli') {
    // Tête d'ampli posée sur le toit : panneau doré, boutons, voyant rouge.
    const ax = x0 + w - 42;
    s += `<path d="M${ax + 10} ${top - 17} q7 -6 14 0" stroke="${teinte('#1A1A1A')}" stroke-width="1.6" fill="none"/>
      <rect x="${ax}" y="${top - 17}" width="34" height="13" rx="1.5" fill="${teinte('#1A1A1A')}"/><rect x="${ax + 2}" y="${top - 14.5}" width="30" height="5" rx=".8" fill="${teinte('#D4A373')}"/>
      ${[5, 10, 15, 20, 25].map((dx) => `<circle cx="${ax + dx}" cy="${top - 12}" r="1.5" fill="${teinte('#2A2A2A')}"/><rect x="${ax + dx - 0.25}" y="${top - 13.4}" width=".5" height="1.3" fill="#F4EFE3"/>`).join('')}
      ${P.neon ? `<circle cx="${ax + 30}" cy="${top - 12}" r="3" fill="#FF3B3B" opacity=".3"/>` : ''}<circle class="hp-clignote" cx="${ax + 30}" cy="${top - 12}" r="1.3" fill="#FF3B3B"/>
      ${[[ax, top - 17], [ax + 34, top - 17]].map(([cx, cy], i) => `<path d="M${cx} ${cy} h${i ? -3 : 3} v3 Z" fill="${teinte('#C8CDD3')}"/>`).join('')}`;
  }
  if (SB === 'ruche') {
    // Ruche en paille tressée (anneaux empilés), trou d'envol, abeilles.
    const rx = x0 + w - 30, paille = teinte('#E6A93A'), trait = teinte('#A86A12');
    s += [[16, 0], [13.5, 5], [10.5, 10], [7, 14.5]].map(([r2, dy]) => `<ellipse cx="${rx}" cy="${top - 6 - dy}" rx="${r2}" ry="4" fill="${paille}" stroke="${trait}" stroke-width=".7"/>`).join('')
      + `<path d="M${rx - 3} ${top - 4} a3 3 0 0 1 6 0 Z" fill="${teinte('#2A2118')}"/><rect x="${rx - 17}" y="${top - 5}" width="34" height="2" rx="1" fill="${trait}"/>`;
    const abeille = (x, y, d) => `<g class="hp-flotte" style="animation-delay:${d}s"><g transform="translate(${x},${y})"><ellipse cx="-.4" cy="-1.6" rx="1.6" ry="1.1" fill="#FFFFFF" opacity=".75"/><ellipse rx="2.2" ry="1.4" fill="#FFC300"/><path d="M-.6 -1.3 v2.6 M.8 -1.3 v2.6" stroke="#1A1A1A" stroke-width=".7"/></g></g>`;
    s += abeille(rx - 20, top - 22, 0) + abeille(rx + 18, top - 14, -1.2) + abeille(rx + 4, top - 30, -2.1);
  }
  return s;
}

// ───── Garage ─────
export const SKINS_GARAGE_NEUFS = ['cartons', 'coffre'];

/** Habillage du corps du garage (après le fond, avant les portes). */
export function corpsGarage(SG, c) {
  const { gx, gw, gtop, base, teinte, mix, GC } = c;
  let s = '';
  if (SG === 'cartons') {
    const trait = mix(GC[0], '#000000', 0.32), scotch = teinte('#F08A24');
    // Rangée de cartons du haut (deux ou trois) et un carton par porte en bas.
    const n = Math.max(2, Math.ceil(gw / 40)), lw = gw / n;
    for (let i = 1; i < n; i++) s += `<rect x="${f1(gx + i * lw)}" y="${gtop}" width=".8" height="19" fill="${trait}"/>`;
    s += `<rect x="${gx}" y="${gtop + 18.6}" width="${gw}" height=".8" fill="${trait}"/>`;
    for (let i = 0; i < n; i++) { const cx = gx + i * lw + lw / 2; s += `<rect x="${f1(cx - 2)}" y="${gtop + 13}" width="4" height="6" fill="${scotch}" opacity=".85"/>`; }
    // Rabats ouverts en guise d'auvent.
    for (let i = 0; i < n; i++) {
      const xa = gx + i * lw;
      s += `<path d="M${f1(xa)} ${gtop} l-3 -7 h${f1(lw / 2 - 1)} l3 7 Z" fill="${mix(GC[0], '#FFFFFF', 0.08)}" stroke="${trait}" stroke-width=".5"/><path d="M${f1(xa + lw)} ${gtop} l3 -7 h${f1(-lw / 2 + 1)} l-3 7 Z" fill="${GC[1]}" stroke="${trait}" stroke-width=".5"/>`;
    }
    // Pictogrammes « fragile » et « haut ».
    const px = gx + gw - 14;
    if (gw >= 70) s += `<g transform="translate(${px},${gtop + 10})" stroke="${teinte('#C8382E')}" stroke-width=".8" fill="none"><path d="M-2 -4 h4 q0 4 -2 4 q-2 0 -2 -4 Z M0 0 v3 M-1.6 3 h3.2"/><path d="M5 3 v-6 m-1.6 1.6 l1.6 -1.6 l1.6 1.6 M9 3 v-6 m-1.6 1.6 l1.6 -1.6 l1.6 1.6"/></g>`;
    // Bout de scotch qui flotte.
    s += `<g class="hp-flotte"><path d="M${gx + gw} ${gtop + 22} l5 2 l-1 2.6 l-4 -1.6 Z" fill="${scotch}"/></g>`;
  }
  if (SG === 'coffre') {
    const fonce = mix(GC[1], '#000000', 0.35);
    for (let y = gtop + 3; y < base; y += 3) s += `<rect x="${gx}" y="${y}" width="${gw}" height=".5" fill="#FFFFFF" opacity=".12"/>`;
    s += `<rect x="${gx}" y="${gtop}" width="${gw}" height="${base - gtop}" fill="none" stroke="${fonce}" stroke-width="2"/>`;
    for (let x = gx + 3; x < gx + gw - 1; x += 6) s += `<circle cx="${x}" cy="${gtop + 2.5}" r=".8" fill="${fonce}"/><circle cx="${x}" cy="${base - 2.5}" r=".8" fill="${fonce}"/>`;
    for (let y = gtop + 16; y < base - 3; y += 6) s += `<circle cx="${gx + 2.5}" cy="${y}" r=".8" fill="${fonce}"/><circle cx="${gx + gw - 2.5}" cy="${y}" r=".8" fill="${fonce}"/>`;
  }
  return s;
}

/** Porte fermée d'un skin de garage (null : porte standard). */
export function porteGarage(SG, dx, c, d) {
  const { gtop, gh, base, teinte, mix, GC } = c;
  if (SG === 'cartons') {
    const fond = mix(GC[0], '#000000', 0.22);
    return `<rect x="${dx}" y="${gtop + 20}" width="22" height="${gh - 20}" fill="${fond}"/><rect x="${dx - 1.5}" y="${gtop + 18.5}" width="25" height="${gh - 18.5}" fill="none" stroke="${mix(GC[0], '#000000', 0.45)}" stroke-width=".6" stroke-dasharray="2 1.4"/>
      <path d="M${dx + 3} ${gtop + 23} l16 ${gh - 26} M${dx + 19} ${gtop + 23} l-16 ${gh - 26}" stroke="${teinte('#F08A24')}" stroke-width="2.4" opacity=".85"/>`;
  }
  if (SG === 'coffre') {
    const acier = mix(GC[1], '#000000', 0.1), fonce = mix(GC[1], '#000000', 0.45), cx = dx + 11, cy = gtop + 20 + (gh - 20) / 2;
    return `<rect x="${dx}" y="${gtop + 20}" width="22" height="${gh - 20}" fill="${acier}" stroke="${fonce}" stroke-width="1.2"/>
      <rect x="${dx - 2}" y="${gtop + 23}" width="3" height="4" rx=".8" fill="${fonce}"/><rect x="${dx - 2}" y="${base - 7}" width="3" height="4" rx=".8" fill="${fonce}"/>
      <circle cx="${cx}" cy="${f1(cy)}" r="7" fill="${mix(GC[0], '#FFFFFF', 0.15)}" stroke="${fonce}" stroke-width=".8"/>
      <g class="hp-volant" style="animation-delay:${-d * 2.3}s;transform-origin:${cx}px ${f1(cy)}px"><circle cx="${cx}" cy="${f1(cy)}" r="4.6" fill="none" stroke="${fonce}" stroke-width="1.2"/><path d="M${cx - 4.6} ${f1(cy)} H${cx + 4.6} M${cx} ${f1(cy - 4.6)} V${f1(cy + 4.6)}" stroke="${fonce}" stroke-width="1"/><circle cx="${cx}" cy="${f1(cy)}" r="1.4" fill="${teinte('#C9A13B')}"/></g>`;
  }
  return null;
}
