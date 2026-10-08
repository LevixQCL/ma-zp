// Aile des annexes de l'hôtel de police : un module par annexe construite, chacun avec sa façade
// et, derrière la vitre, un aperçu de la pièce (salle de sport, pas de tir, salle d'audition…).
// Les skins (conteneurs, roulotte, serre, cabanes, wagons, pilotis, tiroirs, cabines) reprennent les mêmes intérieurs.

// Ordre fixe, de gauche à droite (les nouvelles annexes viennent après, l'aile d'une zone existante ne bouge pas).
// L'atelier mécanique (porte du garage) et les caméras ANPR (mâts) sont dessinés ailleurs : au plus 9 modules ici.
export const ANNEXES_AILE = ['sport', 'tir', 'audition', 'logiciel', 'antenne', 'cachots', 'drone', 'crise', 'sapv'];
export const MODULE = 30;
export const HAUT_AILE = 40;
/** Largeur de l'aile pour `n` annexes. */
export const largeurAile = (n) => (n ? 6 + n * MODULE : 0);

const LIT = '#FFC56B';
const LIT_DOUX = '#FFD9A8'; // lumière plus douce de l'accueil des victimes
// Couleur de l'écusson de chaque annexe.
const COULEUR = { sport: '#F59E5B', tir: '#E1453A', audition: '#A78BFA', logiciel: '#5AB0F0', antenne: '#3DD39A', cachots: '#7C8798', drone: '#E8B530', crise: '#2E4FA8', sapv: '#F28FB0' };
// Pictogrammes (dessinés autour de 0,0, environ 12 × 12), repris dans les écussons.
const PICTO = {
  sport: '<path d="M-5 0 H5"/><path d="M-5 -3.5 V3.5 M-3 -2.5 V2.5 M5 -3.5 V3.5 M3 -2.5 V2.5"/>',
  tir: '<circle r="5"/><circle r="2"/><path d="M0 -7 V-3.5 M0 3.5 V7 M-7 0 H-3.5 M3.5 0 H7"/>',
  audition: '<path d="M-5 1 H5 M-3.5 1 V4.5 M3.5 1 V4.5"/><circle cx="-4" cy="-3" r="1.4"/><circle cx="4" cy="-3" r="1.4"/>',
  logiciel: '<rect x="-5" y="-4.5" width="10" height="7" rx="1"/><path d="M-2 5 H2 M0 2.5 V5"/>',
  antenne: '<path d="M-5 0 L0 -4.5 L5 0 M-3.5 -1 V4.5 H3.5 V-1"/><path d="M-1 4.5 V1.5 H1 V4.5"/>',
  cachots: '<rect x="-5" y="-5" width="10" height="10" rx="1"/><path d="M-1.7 -5 V5 M1.7 -5 V5"/>',
  drone: '<path d="M-3 -3 L3 3 M3 -3 L-3 3"/><circle cx="-4.4" cy="-4.4" r="1.9"/><circle cx="4.4" cy="-4.4" r="1.9"/><circle cx="-4.4" cy="4.4" r="1.9"/><circle cx="4.4" cy="4.4" r="1.9"/>',
  crise: '<path d="M0 -5.5 L6 5 H-6 Z"/><path d="M0 -1.6 V1.2 M0 3.2 V3.3"/>',
  sapv: '<path d="M0 5 C-7.5 -0.5 -5.5 -7 0 -2.6 C5.5 -7 7.5 -0.5 0 5 Z"/>',
};
const f1 = (v) => Math.round(v * 10) / 10;

/** Écusson rond de l'annexe. */
function ecusson(id, cx, cy, r = 3.8) {
  const k = (r * 2 - 1.6) / 14;
  return `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="${COULEUR[id]}" stroke="#FFFFFF" stroke-width=".7"/>
    <g transform="translate(${f1(cx)},${f1(cy)}) scale(${f1(k * 100) / 100})" stroke="#FFFFFF" fill="none" stroke-width="2.1" stroke-linecap="round">${PICTO[id]}</g>`;
}

/**
 * Intérieur d'une pièce, dessiné dans un cadre w × h (origine en haut à gauche).
 * `k` : couleur des silhouettes ; `a` : petites lumières (voyants, cible…) ; `fond` : couleur du mur du fond.
 */
const INTERIEUR = {
  sport(w, h, k) {
    const sol = h - 1.5;
    // Sac de frappe suspendu, rack d'haltères, tapis de course.
    return `<path d="M${f1(w * 0.22)} 0 V${f1(h * 0.16)}" stroke="${k}" stroke-width=".5"/>
      <rect x="${f1(w * 0.22 - 1.8)}" y="${f1(h * 0.16)}" width="3.6" height="${f1(h * 0.42)}" rx="1.6" fill="${k}"/>
      <rect x="${f1(w * 0.22 - 1.8)}" y="${f1(h * 0.3)}" width="3.6" height=".6" fill="#FFFFFF" opacity=".25"/>
      <rect x="${f1(w * 0.38)}" y="${f1(sol - 3.6)}" width="${f1(w * 0.22)}" height="1.3" rx=".5" fill="${k}"/><path d="M${f1(w * 0.41)} ${f1(sol - 2.3)} V${f1(sol)} M${f1(w * 0.57)} ${f1(sol - 2.3)} V${f1(sol)} M${f1(w * 0.42)} ${f1(sol - 3.6)} V${f1(sol - 8)} M${f1(w * 0.56)} ${f1(sol - 3.6)} V${f1(sol - 8)}" stroke="${k}" stroke-width=".7"/>
      <path d="M${f1(w * 0.34)} ${f1(sol - 7.6)} H${f1(w * 0.64)}" stroke="${k}" stroke-width=".6"/><rect x="${f1(w * 0.34)}" y="${f1(sol - 9.4)}" width="1.1" height="3.6" rx=".4" fill="${k}"/><rect x="${f1(w * 0.64 - 1.1)}" y="${f1(sol - 9.4)}" width="1.1" height="3.6" rx=".4" fill="${k}"/>
      <rect x="${f1(w * 0.68)}" y="${f1(sol - 8)}" width="${f1(w * 0.26)}" height=".8" fill="${k}"/><rect x="${f1(w * 0.68)}" y="${f1(sol - 4)}" width="${f1(w * 0.26)}" height=".8" fill="${k}"/>
      <rect x="${f1(w * 0.68)}" y="${f1(sol - 8)}" width=".8" height="8" fill="${k}"/><rect x="${f1(w * 0.94 - 0.8)}" y="${f1(sol - 8)}" width=".8" height="8" fill="${k}"/>
      ${[0.73, 0.81, 0.89].map((x) => `<circle cx="${f1(w * x)}" cy="${f1(sol - 9.3)}" r="1.1" fill="${k}"/><circle cx="${f1(w * x)}" cy="${f1(sol - 5.3)}" r="1.1" fill="${k}"/>`).join('')}
      <rect x="0" y="${f1(sol)}" width="${w}" height="1.5" fill="${k}" opacity=".55"/>`;
  },
  tir(w, h, k, a) {
    // Couloir de tir en perspective : cible au fond, cloisons et plafond qui fuient.
    const cx = w / 2, cy = h * 0.42, tw = Math.max(w * 0.22, 4.2), th = Math.min(h * 0.3, tw * 1.4);
    const x1 = cx - tw / 2, x2 = cx + tw / 2, y1 = cy - th / 2, y2 = cy + th / 2;
    return `<path d="M0 0 L${f1(x1)} ${f1(y1)} M${w} 0 L${f1(x2)} ${f1(y1)} M0 ${h} L${f1(x1)} ${f1(y2)} M${w} ${h} L${f1(x2)} ${f1(y2)}" stroke="${k}" stroke-width=".6" opacity=".7"/>
      <path d="M0 ${f1(h * 0.55)} L${f1(x1)} ${f1(cy + th * 0.1)} M${w} ${f1(h * 0.55)} L${f1(x2)} ${f1(cy + th * 0.1)}" stroke="${k}" stroke-width=".4" opacity=".45"/>
      <path d="M0 ${h} L${f1(x1)} ${f1(y2)} H${f1(x2)} L${w} ${h} Z" fill="${k}" opacity=".35"/>
      <rect x="${f1(x1)}" y="${f1(y1)}" width="${f1(tw)}" height="${f1(th)}" fill="${k}" opacity=".5"/>
      <rect x="${f1(cx - tw * 0.32)}" y="${f1(y1 + th * 0.08)}" width="${f1(tw * 0.64)}" height="${f1(th * 0.84)}" fill="#F4EFE3"/>
      <circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(tw * 0.26)}" fill="none" stroke="#1D1A15" stroke-width=".35"/>
      <circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(tw * 0.14)}" fill="${a}"/>
      <path d="M${f1(w * 0.12)} ${f1(h - 0.6)} H${f1(w * 0.34)} V${f1(h * 0.78)} M${f1(w * 0.66)} ${f1(h * 0.78)} V${f1(h - 0.6)} H${f1(w * 0.88)}" stroke="${k}" stroke-width="1" fill="none"/>`;
  },
  audition(w, h, k) {
    // Table, deux chaises, lampe et miroir sans tain au fond.
    const sol = h - 1.2;
    return `<rect x="${f1(w * 0.12)}" y="${f1(h * 0.14)}" width="${f1(w * 0.42)}" height="${f1(h * 0.34)}" fill="${k}" opacity=".45"/>
      <path d="M${f1(w * 0.16)} ${f1(h * 0.42)} L${f1(w * 0.3)} ${f1(h * 0.18)}" stroke="#FFFFFF" stroke-width=".6" opacity=".35"/>
      <path d="M${f1(w * 0.78)} ${f1(sol - 11)} V${f1(sol - 8.5)} M${f1(w * 0.74)} ${f1(sol - 8.5)} H${f1(w * 0.82)}" stroke="${k}" stroke-width=".7"/>
      <path d="M${f1(w * 0.75)} ${f1(sol - 11)} L${f1(w * 0.78)} ${f1(sol - 13)} L${f1(w * 0.82)} ${f1(sol - 11)} Z" fill="${k}"/>
      <rect x="${f1(w * 0.3)}" y="${f1(sol - 6)}" width="${f1(w * 0.42)}" height="1.1" fill="${k}"/>
      <rect x="${f1(w * 0.34)}" y="${f1(sol - 5)}" width=".8" height="5" fill="${k}"/><rect x="${f1(w * 0.67)}" y="${f1(sol - 5)}" width=".8" height="5" fill="${k}"/>
      <path d="M${f1(w * 0.14)} ${f1(sol - 8)} V${f1(sol)} M${f1(w * 0.14)} ${f1(sol - 3.5)} H${f1(w * 0.25)} V${f1(sol)}" stroke="${k}" stroke-width=".9" fill="none"/>
      <path d="M${f1(w * 0.94)} ${f1(sol - 8)} V${f1(sol)} M${f1(w * 0.94)} ${f1(sol - 3.5)} H${f1(w * 0.83)} V${f1(sol)}" stroke="${k}" stroke-width=".9" fill="none"/>
      <rect x="0" y="${f1(sol)}" width="${w}" height="1.2" fill="${k}" opacity=".55"/>`;
  },
  logiciel(w, h, k, a) {
    // Baies de serveurs avec leurs voyants, chemin de câbles au plafond.
    const n = w < 14 ? 2 : 3, bw = Math.max(1.6, (w - 4) / n - 1.2);
    let s = `<rect x="0" y="0" width="${w}" height="1.4" fill="${k}" opacity=".8"/>`;
    for (let i = 0; i < n; i++) {
      const x = 2 + i * (bw + 1.2);
      s += `<rect x="${f1(x)}" y="2.6" width="${f1(bw)}" height="${f1(h - 2.6)}" fill="${k}"/>`;
      for (let y = 4.4, j = 0; y < h - 2; y += 2.2, j++) {
        s += `<rect x="${f1(x + 0.8)}" y="${f1(y)}" width="${f1(Math.max(0.4, bw - 1.6))}" height="1.3" fill="#FFFFFF" opacity=".08"/>`;
        s += `<circle cx="${f1(x + 1.6)}" cy="${f1(y + 0.65)}" r=".42" fill="${(i + j) % 3 ? a : '#63B0FF'}"${(i + j) % 4 === 1 ? ' class="hp-balise"' : ''}/>`;
        if ((i * 7 + j) % 3 === 0) s += `<circle cx="${f1(x + 2.8)}" cy="${f1(y + 0.65)}" r=".42" fill="${a}"/>`;
      }
    }
    return s;
  },
  antenne(w, h, k) {
    // Comptoir d'accueil avec un agent, présentoir à dépliants, panneau « i ».
    const sol = h - 1.2;
    return `<rect x="${f1(w * 0.06)}" y="${f1(sol - 11)}" width="${f1(w * 0.22)}" height="11" fill="${k}" opacity=".5"/>
      ${[0, 1, 2].map((j) => `<rect x="${f1(w * 0.08)}" y="${f1(sol - 10 + j * 3.4)}" width="${f1(w * 0.18)}" height="2.4" fill="${['#F59E5B', '#63B0FF', '#3DD39A'][j]}" opacity=".9"/>`).join('')}
      <circle cx="${f1(w * 0.62)}" cy="${f1(sol - 10.5)}" r="1.7" fill="${k}"/><path d="M${f1(w * 0.62 - 2.6)} ${f1(sol - 4.5)} Q${f1(w * 0.62)} ${f1(sol - 9.5)} ${f1(w * 0.62 + 2.6)} ${f1(sol - 4.5)} Z" fill="${k}"/>
      <rect x="${f1(w * 0.4)}" y="${f1(sol - 5)}" width="${f1(w * 0.56)}" height="5" fill="${k}"/><rect x="${f1(w * 0.4)}" y="${f1(sol - 5)}" width="${f1(w * 0.56)}" height=".8" fill="#FFFFFF" opacity=".3"/>
      <circle cx="${f1(w * 0.86)}" cy="${f1(h * 0.2)}" r="1.9" fill="#2F6FB5"/><rect x="${f1(w * 0.86 - 0.3)}" y="${f1(h * 0.2 - 0.6)}" width=".6" height="1.6" fill="#FFFFFF"/><circle cx="${f1(w * 0.86)}" cy="${f1(h * 0.2 - 1.1)}" r=".32" fill="#FFFFFF"/>`;
  },
  cachots(w, h, k) {
    // Cellule : banc-couchette avec sa couverture, WC inox, puis les barreaux devant.
    const sol = h - 1;
    let s = `<rect x="${f1(w * 0.08)}" y="${f1(sol - Math.min(4.5, h * 0.3))}" width="${f1(w * 0.55)}" height="${f1(Math.min(1.8, h * 0.12))}" fill="${k}"/>
      <rect x="${f1(w * 0.12)}" y="${f1(sol - Math.min(5.3, h * 0.36))}" width="${f1(w * 0.3)}" height=".9" rx=".4" fill="${k}" opacity=".7"/>
      <rect x="${f1(w * 0.74)}" y="${f1(sol - Math.min(3, h * 0.22))}" width="${f1(Math.max(1.2, w * 0.14))}" height="${f1(Math.min(3, h * 0.22))}" rx=".5" fill="${k}" opacity=".8"/>
      <rect x="0" y="${f1(sol)}" width="${w}" height="1" fill="${k}" opacity=".55"/>`;
    const pas = w < 8 ? 1.6 : 2.3;
    for (let x = pas / 2 + 0.2; x < w; x += pas) s += `<rect x="${f1(x - 0.35)}" y="0" width=".7" height="${h}" fill="#4A5566"/><rect x="${f1(x - 0.35)}" y="0" width=".25" height="${h}" fill="#FFFFFF" opacity=".25"/>`;
    s += `<rect x="0" y="${f1(h * 0.3)}" width="${w}" height=".7" fill="#4A5566"/>`;
    return s;
  },
  drone(w, h, k, a) {
    // Établi avec un drone posé, écran du retour caméra thermique au mur.
    const sol = h - 1.2, et = sol - Math.min(6, h * 0.32);
    const sx = w * 0.56, sw = w * 0.38, sy = h * 0.1, sh = Math.min(h * 0.32, sw * 0.7);
    const dx = w * 0.3, dy = et - 1.6;
    return `<rect x="${f1(sx - 0.6)}" y="${f1(sy - 0.6)}" width="${f1(sw + 1.2)}" height="${f1(sh + 1.2)}" fill="${k}"/>
      <rect x="${f1(sx)}" y="${f1(sy)}" width="${f1(sw)}" height="${f1(sh)}" fill="#1B2440"/>
      <circle cx="${f1(sx + sw * 0.45)}" cy="${f1(sy + sh * 0.55)}" r="${f1(sh * 0.36)}" fill="#C2410C"/><circle cx="${f1(sx + sw * 0.45)}" cy="${f1(sy + sh * 0.55)}" r="${f1(sh * 0.2)}" fill="${a}"/><circle cx="${f1(sx + sw * 0.45)}" cy="${f1(sy + sh * 0.5)}" r="${f1(sh * 0.08)}" fill="#FFF1C2"/>
      <path d="M${f1(sx + sw * 0.8)} ${f1(sy + sh * 0.2)} v${f1(sh * 0.6)} M${f1(sx + sw * 0.1)} ${f1(sy + sh * 0.2)} h${f1(sw * 0.15)}" stroke="#63B0FF" stroke-width=".4"/>
      <rect x="${f1(w * 0.06)}" y="${f1(et)}" width="${f1(w * 0.62)}" height="1.1" fill="${k}"/><path d="M${f1(w * 0.1)} ${f1(et + 1.1)} V${f1(sol)} M${f1(w * 0.64)} ${f1(et + 1.1)} V${f1(sol)}" stroke="${k}" stroke-width=".8"/>
      <path d="M${f1(dx - 4.4)} ${f1(dy - 0.4)} H${f1(dx + 4.4)}" stroke="${k}" stroke-width=".6"/><rect x="${f1(dx - 1.6)}" y="${f1(dy - 0.8)}" width="3.2" height="1.6" rx=".6" fill="${k}"/>
      <ellipse cx="${f1(dx - 4.4)}" cy="${f1(dy - 0.9)}" rx="1.8" ry=".35" fill="${k}"/><ellipse cx="${f1(dx + 4.4)}" cy="${f1(dy - 0.9)}" rx="1.8" ry=".35" fill="${k}"/>
      <path d="M${f1(dx - 1.2)} ${f1(dy + 0.8)} l-.6 .8 M${f1(dx + 1.2)} ${f1(dy + 0.8)} l.6 .8" stroke="${k}" stroke-width=".4"/>
      <rect x="0" y="${f1(sol)}" width="${w}" height="1.2" fill="${k}" opacity=".55"/>`;
  },
  crise(w, h, k, a) {
    // Mur d'écrans (carte du secteur au centre, une alerte rouge) et, devant, la table de crise vue de dos.
    const n = w < 14 ? 2 : 3, mur = h * 0.6, gap = 0.7;
    const cw = (w - 1.4 - gap * (n - 1)) / n, ch = (mur - 1 - gap) / 2;
    let s = `<rect x="0" y="0" width="${w}" height="${f1(mur + 0.6)}" fill="#0A1220"/>`;
    for (let r = 0; r < 2; r++) for (let c = 0; c < n; c++) {
      const x = 0.7 + c * (cw + gap), y = 0.7 + r * (ch + gap), j = r * n + c, centre = c === Math.floor(n / 2);
      const alerte = j === n * 2 - 1;
      s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(cw)}" height="${f1(ch)}" fill="${alerte ? '#7A1F1F' : centre ? '#1F5E8C' : '#1C4770'}"/>`;
      if (centre) s += `<path d="M${f1(x + cw * 0.1)} ${f1(y + ch * 0.7)} L${f1(x + cw * 0.35)} ${f1(y + ch * 0.25)} L${f1(x + cw * 0.65)} ${f1(y + ch * 0.45)} L${f1(x + cw * 0.9)} ${f1(y + ch * 0.2)}" stroke="#8CC8F5" stroke-width=".35" fill="none"/><circle cx="${f1(x + cw * 0.6)}" cy="${f1(y + ch * 0.5)}" r=".7" fill="${a}"${r ? '' : ' class="hp-balise"'}/>`;
      else if (alerte) { const t2 = Math.min(ch * 0.6, cw * 0.7); s += `<path d="M${f1(x + cw / 2)} ${f1(y + (ch - t2) / 2)} l${f1(t2 / 2)} ${f1(t2)} h${f1(-t2)} Z" fill="#FF6E6A"/>`; }
      else for (let b = 0; b < 3; b++) s += `<rect x="${f1(x + cw * (0.15 + b * 0.27))}" y="${f1(y + ch * (0.75 - (b + 1) * 0.15))}" width="${f1(cw * 0.18)}" height="${f1(ch * (b + 1) * 0.15)}" fill="#63B0FF" opacity=".75"/>`;
    }
    // Têtes et épaules, table.
    const ty = h * 0.82;
    for (const fx of (w < 14 ? [0.3, 0.72] : [0.2, 0.5, 0.8])) s += `<circle cx="${f1(w * fx)}" cy="${f1(ty - 3.6)}" r="1.4" fill="${k}"/><path d="M${f1(w * fx - 2.6)} ${f1(ty)} Q${f1(w * fx)} ${f1(ty - 3.8)} ${f1(w * fx + 2.6)} ${f1(ty)} Z" fill="${k}"/>`;
    s += `<rect x="0" y="${f1(ty)}" width="${w}" height="${f1(h - ty)}" fill="${k}"/><rect x="0" y="${f1(ty)}" width="${w}" height=".5" fill="#63B0FF" opacity=".35"/>`;
    return s;
  },
  sapv(w, h, k) {
    // Petit salon d'accueil : fauteuil, table basse et tasse, lampadaire, plante et cadre au mur.
    const sol = h - 1.2;
    return `<rect x="${f1(w * 0.42)}" y="${f1(h * 0.14)}" width="${f1(w * 0.26)}" height="${f1(Math.min(h * 0.24, w * 0.2))}" fill="none" stroke="${k}" stroke-width=".6" opacity=".7"/>
      <path d="M${f1(w * 0.46)} ${f1(h * 0.14 + Math.min(h * 0.24, w * 0.2) - 0.8)} l${f1(w * 0.06)} ${f1(-Math.min(h * 0.12, w * 0.1))} l${f1(w * 0.05)} ${f1(Math.min(h * 0.07, w * 0.06))} l${f1(w * 0.06)} ${f1(-Math.min(h * 0.08, w * 0.07))}" stroke="${k}" stroke-width=".4" fill="none" opacity=".6"/>
      <path d="M${f1(w * 0.84)} ${f1(sol)} V${f1(sol - 11)}" stroke="${k}" stroke-width=".5"/><path d="M${f1(w * 0.84 - 2)} ${f1(sol - 11)} h4 l-1 -2.6 h-2 Z" fill="${k}"/>
      <path d="M${f1(w * 0.36)} ${f1(sol)} V${f1(sol - 7.5)} Q${f1(w * 0.36)} ${f1(sol - 9)} ${f1(w * 0.36 + 1.6)} ${f1(sol - 9)} H${f1(w * 0.62)} Q${f1(w * 0.64)} ${f1(sol - 9)} ${f1(w * 0.64)} ${f1(sol - 7.5)} V${f1(sol)} Z" fill="${k}"/>
      <rect x="${f1(w * 0.33)}" y="${f1(sol - 4.6)}" width="${f1(w * 0.34)}" height="2.6" rx="1" fill="${k}"/><rect x="${f1(w * 0.38)}" y="${f1(sol - 5.4)}" width="${f1(w * 0.22)}" height="1" fill="#FFFFFF" opacity=".18"/>
      <rect x="${f1(w * 0.68)}" y="${f1(sol - 3)}" width="${f1(w * 0.12)}" height=".8" fill="${k}"/><path d="M${f1(w * 0.74)} ${f1(sol - 2.2)} V${f1(sol)}" stroke="${k}" stroke-width=".6"/><rect x="${f1(w * 0.72)}" y="${f1(sol - 4.4)}" width="1.3" height="1.4" rx=".3" fill="${k}"/>
      <path d="M${f1(w * 0.07)} ${f1(sol - 3)} h${f1(w * 0.16)} l-1 3 h${f1(-w * 0.16 + 2)} Z" fill="${k}"/>
      <path d="M${f1(w * 0.15)} ${f1(sol - 3)} q-3 -3 -2 -8 q2 4 2 8 Z M${f1(w * 0.15)} ${f1(sol - 3)} q3 -2.5 3.5 -6.5 q-2 3.2 -3.5 6.5 Z M${f1(w * 0.15)} ${f1(sol - 3)} q.5 -5 -.6 -9.5" fill="${k}" stroke="${k}" stroke-width=".4"/>
      <rect x="0" y="${f1(sol)}" width="${w}" height="1.2" fill="${k}" opacity=".55"/>`;
  },
};

/**
 * Vitre avec l'intérieur de la pièce. `lit` : lumière allumée (soir et nuit).
 * Le jour, la vitre reflète le ciel et laisse deviner l'intérieur.
 */
// Pièces toujours éclairées de l'intérieur par leurs écrans (fond sombre, même le jour).
const SALLE_ECRANS = { logiciel: ['#141E2B', '#2A3A4F', '#3DD39A'], crise: ['#0E1726', '#16233A', '#E1453A'] };
function vitre(id, x, y, w, h, { P, lit, moment, mix, cadre, clip }) {
  const ecrans = SALLE_ECRANS[id];
  const fond = ecrans ? ecrans[0] : lit ? (id === 'sapv' ? LIT_DOUX : LIT) : P.vitre;
  const k = ecrans ? ecrans[1] : lit ? (id === 'sapv' ? '#8A5A3A' : '#7A4A12') : mix(P.vitre, '#0C1124', 0.45);
  const a = ecrans ? ecrans[2] : id === 'tir' ? '#E1453A' : id === 'drone' ? '#FFB23F' : '#FFFFFF';
  let s = `<clipPath id="${clip}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/></clipPath>
    <rect x="${f1(x - 0.8)}" y="${f1(y - 0.8)}" width="${f1(w + 1.6)}" height="${f1(h + 1.6)}" rx=".6" fill="${cadre}"/>
    <rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fond}"/>`;
  if (lit && !ecrans) s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h * 0.45)}" fill="${id === 'sapv' ? '#FFF1E0' : '#FFE7B0'}" opacity=".45"/>`;
  s += `<g clip-path="url(#${clip})"><g transform="translate(${f1(x)},${f1(y)})">${INTERIEUR[id](w, h, k, a)}</g>`;
  if (moment === 'jour') s += `<path d="M${f1(x + w * 0.15)} ${f1(y + h)} L${f1(x + w * 0.55)} ${f1(y)} H${f1(x + w * 0.72)} L${f1(x + w * 0.32)} ${f1(y + h)} Z" fill="#FFFFFF" opacity=".16"/>`;
  s += '</g>';
  return s;
}

/**
 * L'aile complète. `ax` : bord gauche ; `base` : niveau du trottoir ; `SA` : skin choisi ou null.
 * `teinte` assombrit une couleur de jour selon le moment ; `mix` mélange deux couleurs.
 * `garde` : quelqu'un dort en cellule cette nuit (une fenêtre du complexe cellulaire reste allumée) ;
 * sans précision, on laisse une cellule allumée.
 */
export function aileSvg({ ids, ax, base, P, moment, SA, teinte, mix, uid, garde = true }) {
  if (!ids.length) return '';
  const aw = largeurAile(ids.length), ah = HAUT_AILE, atop = base - ah;
  const lit = P.allume > 0;
  const mx = (i) => ax + 3 + i * MODULE;
  const clip = (i) => `hp-aile-${uid}-${i}`;
  let s = '';

  if (SA === 'conteneurs') return s + conteneurs();
  if (SA === 'roulotte') return s + roulotte();
  if (SA === 'serre') return s + serre();
  if (SA === 'cabanes') return s + cabanes();
  if (SA === 'wagons') return s + wagons();
  if (SA === 'pilotis') return s + pilotis();
  if (SA === 'tiroirs') return s + tiroirs();
  if (SA === 'cabines') return s + cabines();
  return s + standard();

  // ───── Aile standard : façade sobre, un module par annexe ─────
  function standard() {
    const mur = mix(P.facade[1], P.garage, 0.5), sombre = mix(mur, '#000000', 0.22), cadre = mix(mur, '#0C1124', 0.55);
    let t = `<rect x="${ax}" y="${atop}" width="${aw}" height="${ah}" fill="${mur}"/>
      <rect x="${ax}" y="${atop}" width="${aw}" height="${ah}" fill="#FFFFFF" opacity="${moment === 'jour' ? 0.06 : 0.02}"/>`;
    // Toitures techniques (derrière l'acrotère).
    ids.forEach((id, i) => {
      const x = mx(i);
      if (id === 'sport') t += [0, 1].map((j) => `<path d="M${x + 4 + j * 11} ${atop - 2} l2.5 -5.5 h8 l-2.5 5.5 Z" fill="${teinte('#2B4C7E')}" stroke="${teinte('#9FB0C0')}" stroke-width=".5"/><path d="M${x + 7.6 + j * 11} ${atop - 4.8} h8" stroke="${teinte('#9FB0C0')}" stroke-width=".3" opacity=".6"/>`).join('');
      if (id === 'tir') t += `<rect x="${x + 19}" y="${atop - 12}" width="4" height="10" fill="${P.mat}"/><rect x="${x + 17.5}" y="${atop - 14}" width="7" height="2.4" rx=".8" fill="${P.toit2}"/><path d="M${x + 19} ${atop - 6} H${x + 13} V${atop - 2}" stroke="${P.mat}" stroke-width="2.2" fill="none"/>`;
      if (id === 'logiciel') t += `<rect x="${x + 6}" y="${atop - 9}" width="15" height="7" rx="1" fill="${P.toit}"/><circle cx="${x + 10.5}" cy="${atop - 5.5}" r="2.4" fill="${P.toit2}"/><path d="M${x + 8.1} ${atop - 5.5} H${x + 12.9} M${x + 10.5} ${atop - 7.9} V${atop - 3.1}" stroke="${P.toit}" stroke-width=".5"/>${[15, 17, 19].map((dx) => `<rect x="${x + dx}" y="${atop - 7.8}" width=".8" height="4.6" fill="${P.toit2}"/>`).join('')}`;
      if (id === 'cachots') {
        // Concertina sur l'acrotère et extracteur d'air.
        t += `<rect x="${x + 4}" y="${atop - 8}" width="7" height="5" rx=".8" fill="${P.toit}"/><path d="M${x + 5} ${atop - 6.5} h5 M${x + 5} ${atop - 5} h5" stroke="${P.toit2}" stroke-width=".5"/>`;
        t += `<path d="M${x + 13} ${atop - 3} V${atop - 8} M${x + 28} ${atop - 3} V${atop - 8}" stroke="${P.mat}" stroke-width=".6"/>`;
        for (let cx = x + 14.2; cx < x + 28; cx += 2.2) t += `<circle cx="${f1(cx)}" cy="${atop - 6}" r="1.5" fill="none" stroke="${teinte('#A9B4C0')}" stroke-width=".35"/>`;
      }
      if (id === 'drone') {
        // Hélisurface : plot surélevé, « H » dans un cercle, balises ; le drone fait du surplace au-dessus.
        const cx = x + 15, cy = atop - 6.4;
        t += `<rect x="${x + 6}" y="${cy}" width="1.2" height="${atop - 3 - cy}" fill="${P.mat}"/><rect x="${x + 22.8}" y="${cy}" width="1.2" height="${atop - 3 - cy}" fill="${P.mat}"/>
          <ellipse cx="${cx}" cy="${cy + 0.8}" rx="12.5" ry="3.4" fill="${mix(P.toit, '#000000', 0.25)}"/><ellipse cx="${cx}" cy="${cy}" rx="12.5" ry="3.4" fill="${teinte('#3C4656')}"/>
          <ellipse cx="${cx}" cy="${cy}" rx="9" ry="2.4" fill="none" stroke="${teinte('#F2D02E')}" stroke-width=".6"/>
          <path d="M${cx - 2.6} ${cy - 1.3} V${cy + 1.3} M${cx + 2.6} ${cy - 1.3} V${cy + 1.3} M${cx - 2.6} ${cy} H${cx + 2.6}" stroke="${teinte('#FFFFFF')}" stroke-width=".8"/>
          ${[x + 3.4, x + 26.6].map((bx) => `<circle cx="${bx}" cy="${cy}" r=".7" fill="${lit ? '#7CF29A' : teinte('#3DD39A')}"/>${lit ? `<circle cx="${bx}" cy="${cy}" r="2" fill="#7CF29A" opacity=".3"/>` : ''}`).join('')}`;
        const dy = cy - 9;
        t += `<g class="hp-flotte" style="animation-delay:-.6s">
          <path d="M${cx - 6} ${dy} H${cx + 6}" stroke="#1D2335" stroke-width=".9"/>
          <rect x="${cx - 2.4}" y="${dy - 0.8}" width="4.8" height="2.4" rx=".9" fill="${teinte('#EDF0FA')}"/><rect x="${cx - 2.4}" y="${dy + 0.6}" width="4.8" height=".6" fill="${teinte('#2F6FB5')}"/>
          <circle cx="${cx}" cy="${dy + 2.1}" r=".9" fill="#1D2335"/>
          <path d="M${cx - 6} ${dy} V${dy - 1} M${cx + 6} ${dy} V${dy - 1}" stroke="#1D2335" stroke-width=".6"/>
          <ellipse cx="${cx - 6}" cy="${dy - 1.2}" rx="3" ry=".45" fill="${teinte('#9FB0C0')}" opacity=".8"/><ellipse cx="${cx + 6}" cy="${dy - 1.2}" rx="3" ry=".45" fill="${teinte('#9FB0C0')}" opacity=".8"/>
          <path d="M${cx - 1.6} ${dy + 1.6} l-.9 1.5 h-.8 M${cx + 1.6} ${dy + 1.6} l.9 1.5 h.8" stroke="#1D2335" stroke-width=".4" fill="none"/>
          <circle class="hp-balise" cx="${cx + 2.4}" cy="${dy - 0.2}" r=".55" fill="#FF4A3D"/><circle cx="${cx - 2.4}" cy="${dy - 0.2}" r=".55" fill="#3DD39A"/>
          ${lit ? `<path d="M${cx - 0.6} ${dy + 3} L${cx - 3.2} ${cy - 1} H${cx + 3.2} L${cx + 0.6} ${dy + 3} Z" fill="#FFF1C2" opacity=".18"/>` : ''}</g>`;
      }
      if (id === 'crise') {
        // Parabole satellite et mât d'antennes avec son feu.
        t += `<rect x="${x + 7.4}" y="${atop - 6}" width="1.2" height="3" fill="${P.mat}"/><path d="M${x + 3} ${atop - 9.5} A6 6 0 0 0 ${x + 12.4} ${atop - 4.2} Z" fill="${teinte('#E4EAF0')}"/><path d="M${x + 7.7} ${atop - 6.8} L${x + 5.2} ${atop - 9.6}" stroke="${P.mat}" stroke-width=".5"/><circle cx="${x + 5}" cy="${atop - 9.8}" r=".7" fill="${P.mat}"/>
          <line x1="${x + 23}" y1="${atop - 2}" x2="${x + 23}" y2="${atop - 16}" stroke="${P.mat}" stroke-width=".9"/><path d="M${x + 20.5} ${atop - 12} H${x + 25.5} M${x + 21.3} ${atop - 9} H${x + 24.7}" stroke="${P.mat}" stroke-width=".6"/>
          <circle cx="${x + 23}" cy="${atop - 16.8}" r="2.8" fill="#FF6E6A" opacity="${lit ? 0.25 : 0}"/><circle class="hp-balise" cx="${x + 23}" cy="${atop - 16.8}" r=".9" fill="#FF4A3D"/>`;
      }
      if (id === 'sapv') {
        // Toit-jardin : bacs et petits arbustes.
        t += `<rect x="${x + 3}" y="${atop - 5}" width="24" height="2.2" fill="${teinte('#8A5A36')}"/>`;
        [[6, 2.6], [10.5, 3.2], [15.5, 2.4], [20, 3.4], [24.5, 2.6]].forEach(([dx, r], j) => { t += `<circle cx="${x + dx}" cy="${f1(atop - 5 - r * 0.55)}" r="${r}" fill="${teinte(j % 2 ? '#4E9A5E' : '#3E7D4F')}"/>`; });
        t += `<circle cx="${x + 10.5}" cy="${atop - 8.4}" r=".7" fill="${teinte('#F28FB0')}"/><circle cx="${x + 20}" cy="${atop - 8.8}" r=".7" fill="${teinte('#FFD27A')}"/>`;
      }
      if (id === 'antenne') t += `<line x1="${x + 24}" y1="${atop - 2}" x2="${x + 24}" y2="${atop - 13}" stroke="${P.mat}" stroke-width=".8"/><path d="M${x + 24} ${atop - 13} h6 l-1.5 2 l1.5 2 h-6 Z" fill="#FFFFFF" opacity=".9"/><rect x="${x + 24}" y="${atop - 13}" width="2" height="4" fill="${teinte('#2F6FB5')}"/>`;
    });
    ids.forEach((id, i) => {
      const x = mx(i);
      if (i) t += `<rect x="${x - 0.8}" y="${atop}" width="1.6" height="${ah}" fill="${sombre}"/>`;
      if (id === 'sport') {
        t += vitre(id, x + 3, atop + 12, 24, ah - 17, { P, lit, moment, mix, cadre, clip: clip(i) });
        t += `<rect x="${x + 14.6}" y="${atop + 12}" width=".8" height="${ah - 17}" fill="${cadre}"/>`;
      } else if (id === 'tir') {
        // Béton à panneaux acoustiques, porte blindée et voyant « tir en cours ».
        for (let xx = x + 2; xx < x + 29; xx += 2.4) t += `<rect x="${f1(xx)}" y="${atop + 11}" width=".7" height="${ah - 14}" fill="${sombre}" opacity=".55"/>`;
        t += `<rect x="${x + 2}" y="${atop + 10.4}" width="26" height=".8" fill="${sombre}"/>
          <rect x="${x + 9}" y="${base - 20}" width="12" height="17" fill="${cadre}"/><rect x="${x + 10}" y="${base - 19}" width="10" height="16" fill="${mix(P.porte, '#5B6B7D', 0.4)}"/>
          <rect x="${x + 10}" y="${base - 13}" width="10" height=".6" fill="${cadre}" opacity=".6"/><rect x="${x + 17.6}" y="${base - 12}" width="1.6" height=".9" rx=".4" fill="#C8D3DD"/>
          <rect x="${x + 12.5}" y="${base - 24}" width="5" height="2.8" rx=".8" fill="${cadre}"/>
          ${lit ? `<circle cx="${x + 15}" cy="${base - 22.6}" r="4" fill="#FF6E6A" opacity=".25"/>` : ''}<circle class="hp-balise" cx="${x + 15}" cy="${base - 22.6}" r="1" fill="#FF4A3D"/>
          <path d="M${x + 4} ${base - 9} l2.2 -4 l2.2 4 Z" fill="#F2D02E" stroke="#1D1A15" stroke-width=".3"/><rect x="${x + 6}" y="${base - 11.8}" width=".4" height="1.6" fill="#1D1A15"/>`;
      } else if (id === 'audition') {
        const wx = x + 3, wy = atop + 12, ww = 24, wh = ah - 19;
        t += vitre(id, wx, wy, ww, wh, { P, lit, moment, mix, cadre, clip: clip(i) });
        // Store vénitien à moitié baissé.
        const lame = lit ? '#E8B460' : teinte('#D8DEE6');
        for (let y = wy; y < wy + wh * 0.45; y += 1.5) t += `<rect x="${wx}" y="${f1(y)}" width="${ww}" height="1.1" fill="${lame}"/>`;
        t += `<rect x="${wx}" y="${f1(wy + wh * 0.45)}" width="${ww}" height="1" fill="${mix(lame, '#000000', 0.3)}"/><rect x="${wx - 1.5}" y="${wy + wh + 0.8}" width="${ww + 3}" height="1.2" fill="${sombre}"/>`;
      } else if (id === 'logiciel') {
        t += vitre(id, x + 5, atop + 12, 20, ah - 16, { P, lit, moment, mix, cadre, clip: clip(i) });
        t += `<rect x="${x + 5}" y="${atop + 12}" width="20" height="${ah - 16}" fill="#5AB0F0" opacity=".08"/>`;
      } else if (id === 'antenne') {
        t += vitre(id, x + 3, atop + 17, 15, ah - 20, { P, lit, moment, mix, cadre, clip: clip(i) });
        // Porte vitrée.
        t += `<rect x="${x + 19.2}" y="${atop + 16.2}" width="8.6" height="${ah - 19.2}" fill="${cadre}"/><rect x="${x + 20}" y="${atop + 17}" width="7" height="${ah - 20}" fill="${lit ? LIT : P.vitre}" opacity="${lit ? 0.85 : 1}"/>
          <rect x="${x + 21}" y="${atop + 27}" width="5" height=".8" fill="#C8D3DD"/>`;
        // Auvent rayé festonné.
        const ay = atop + 11;
        t += `<rect x="${x + 1.5}" y="${ay - 0.8}" width="27" height=".8" fill="${cadre}"/>`;
        for (let k2 = 0, xx = x + 1.5; xx < x + 28.5; xx += 3, k2++) t += `<path d="M${f1(xx)} ${ay} h3 v3.2 q-1.5 1.8 -3 0 Z" fill="${k2 % 2 ? teinte('#F4F8FB') : teinte('#2F6FB5')}"/>`;
      } else if (id === 'cachots') {
        // Béton à bandeaux, trois fenêtres de cellule à barreaux, porte blindée à judas, caméra de surveillance.
        for (let yy = atop + 11; yy < base - 3; yy += 4) t += `<rect x="${x + 1}" y="${yy}" width="28" height=".5" fill="${sombre}" opacity=".5"/>`;
        [0, 1, 2].forEach((j) => {
          const wx = x + 3.6 + j * 8.4, allume = lit && garde && j === 1;
          if (allume) t += `<circle cx="${wx + 3}" cy="${atop + 17}" r="5" fill="#FFC56B" opacity=".18"/>`;
          t += vitre(id, wx, atop + 13, 6, 8, { P, lit: allume, moment, mix, cadre, clip: `${clip(i)}-${j}` });
          t += `<rect x="${wx - 1}" y="${atop + 21.6}" width="8" height=".9" fill="${sombre}"/>`;
        });
        t += `<rect x="${x + 10}" y="${base - 13.5}" width="10" height="10.5" fill="${cadre}"/><rect x="${x + 11}" y="${base - 12.5}" width="8" height="9.5" fill="${mix(P.porte, '#5B6B7D', 0.4)}"/>
          <rect x="${x + 13.6}" y="${base - 11}" width="2.8" height="1.4" fill="${cadre}"/><rect x="${x + 11}" y="${base - 7.4}" width="8" height=".5" fill="${cadre}" opacity=".6"/><rect x="${x + 17}" y="${base - 7}" width="1.4" height=".9" rx=".4" fill="#C8D3DD"/>
          <path d="M${x + 27} ${base - 15} h-2 v1.6" stroke="${cadre}" stroke-width=".6" fill="none"/><rect x="${x + 22.4}" y="${base - 13.8}" width="4.2" height="1.8" rx=".5" fill="${teinte('#C8D3DD')}" transform="rotate(14 ${x + 24.5} ${base - 12.9})"/><circle class="hp-balise" cx="${x + 22.9}" cy="${base - 13.4}" r=".35" fill="#FF4A3D"/>`;
      } else if (id === 'drone') {
        // Bande de balisage jaune et noir, grande baie sur l'atelier des télépilotes.
        for (let xx = x + 1, k2 = 0; xx < x + 29; xx += 2, k2++) t += `<rect x="${xx}" y="${atop + 9.6}" width="2" height="1.2" fill="${k2 % 2 ? teinte('#1D1A15') : teinte('#F2D02E')}"/>`;
        t += vitre(id, x + 3, atop + 12.5, 24, ah - 17.5, { P, lit, moment, mix, cadre, clip: clip(i) });
        t += `<rect x="${x + 3}" y="${atop + 12.5}" width="24" height="1.4" fill="${cadre}" opacity=".7"/>`;
      } else if (id === 'crise') {
        // Large baie sur le mur d'écrans, qui jette sa lueur bleue dehors le soir.
        if (lit) t += `<ellipse cx="${x + 15}" cy="${atop + 24}" rx="14" ry="10" fill="#63B0FF" opacity=".1"/>`;
        t += vitre(id, x + 2.5, atop + 12, 25, ah - 17, { P, lit, moment, mix, cadre, clip: clip(i) });
        t += `<rect x="${x + 2.5}" y="${atop + 12}" width="25" height="${ah - 17}" fill="#63B0FF" opacity="${lit ? 0.1 : 0.05}"/><rect x="${x + 10.8}" y="${atop + 12}" width=".7" height="${ah - 17}" fill="${cadre}"/><rect x="${x + 18.6}" y="${atop + 12}" width=".7" height="${ah - 17}" fill="${cadre}"/>`;
      } else if (id === 'sapv') {
        // Façade accueillante : bardage bois autour de la porte, plaque douce, banc et plante, applique chaude.
        t += vitre(id, x + 3, atop + 15, 12, ah - 20, { P, lit, moment, mix, cadre, clip: clip(i) });
        const bois = teinte('#B98A5E');
        t += `<rect x="${x + 17.6}" y="${atop + 10.5}" width="11.4" height="${ah - 13.5}" fill="${bois}"/>`;
        for (let xx = x + 18.8; xx < x + 29; xx += 1.6) t += `<rect x="${f1(xx)}" y="${atop + 10.5}" width=".4" height="${ah - 13.5}" fill="${mix(bois, '#000000', 0.25)}" opacity=".6"/>`;
        t += `<rect x="${x + 19.2}" y="${atop + 18.2}" width="8.6" height="${ah - 21.2}" rx="1" fill="${cadre}"/><rect x="${x + 20}" y="${atop + 19}" width="7" height="${ah - 22}" rx=".6" fill="${lit ? LIT_DOUX : P.vitre}" opacity="${lit ? 0.85 : 1}"/>
          <rect x="${x + 21}" y="${atop + 28}" width="5" height=".8" fill="#C8D3DD"/>
          <rect x="${x + 19.4}" y="${atop + 12.6}" width="8.2" height="4" rx="2" fill="${teinte('#F28FB0')}"/><path d="M${x + 23.5} ${atop + 15.8} c-2.2 -1.4 -1.6 -3 0 -1.9 c1.6 -1.1 2.2 .5 0 1.9 Z" fill="#FFFFFF"/>
          ${lit ? `<circle cx="${x + 18.6}" cy="${atop + 20.9}" r="2.2" fill="#FFD9A8" opacity=".35"/>` : ''}<rect x="${x + 18.1}" y="${atop + 20}" width="1" height="1.8" rx=".4" fill="${lit ? '#FFE7B0' : teinte('#F4EFE3')}"/>
          <rect x="${x + 3.5}" y="${base - 6}" width="11" height="1.2" rx=".5" fill="${teinte('#8A5A36')}"/><path d="M${x + 4.6} ${base - 4.8} V${base - 3} M${x + 13.4} ${base - 4.8} V${base - 3}" stroke="${teinte('#5B4630')}" stroke-width=".8"/>
          <path d="M${x + 15.4} ${base - 6} h2.4 l-.4 3 h-1.6 Z" fill="${teinte('#C8693E')}"/>
          <path d="M${x + 16.6} ${base - 6} q-2.6 -2.4 -1.6 -6.4 q1.6 3 1.6 6.4 Z M${x + 16.6} ${base - 6} q2.4 -1.8 2.4 -5 q-1.6 2.4 -2.4 5 Z" fill="${teinte('#4E9A5E')}"/>`;
      }
      // Écusson de l'annexe.
      t += ecusson(id, x + (id === 'tir' ? 8 : 15), atop + 5.6);
    });
    // Acrotère, socle et bandeau bleu.
    t += `<rect x="${ax - 2}" y="${atop - 3}" width="${aw + 4}" height="3" rx=".8" fill="${P.arete}"/><rect x="${ax - 2}" y="${atop - 3}" width="${aw + 4}" height=".7" fill="#FFFFFF" opacity=".18"/>
      <rect x="${ax}" y="${base - 3}" width="${aw}" height="3" fill="${sombre}"/><rect x="${ax}" y="${atop}" width="${aw}" height="1.2" fill="#2F6FB5"/>`;
    return t;
  }

  // ───── Skin « Conteneurs empilés » ─────
  function conteneurs() {
    const couleurs = ['#D9662E', '#2F6FB5', '#3E8A55', '#C9A13B', '#B8413A'];
    let t = '';
    // Un conteneur couché sur les deux premiers (vu de côté).
    if (ids.length >= 2) {
      const cx = mx(0) - 1, cw = 2 * MODULE - 1, cy = atop - 9, c = teinte('#7A8C9E');
      t += `<rect x="${cx}" y="${cy}" width="${cw}" height="11" fill="${c}"/>`;
      for (let xx = cx + 2.5; xx < cx + cw - 2; xx += 2.2) t += `<rect x="${f1(xx)}" y="${cy + 1.4}" width=".9" height="8.2" fill="${mix(c, '#000000', 0.25)}" opacity=".7"/>`;
      t += `<rect x="${cx}" y="${cy}" width="${cw}" height="1.3" fill="${mix(c, '#000000', 0.3)}"/><rect x="${cx}" y="${cy + 9.7}" width="${cw}" height="1.3" fill="${mix(c, '#000000', 0.3)}"/>
        ${[cx, cx + cw - 2].map((xx) => `<rect x="${xx}" y="${cy}" width="2" height="11" fill="${mix(c, '#000000', 0.35)}"/>`).join('')}
        <text x="${cx + 6}" y="${cy + 7}" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="5" letter-spacing=".6" fill="#FFFFFF" opacity=".75">ZPDU 532·4</text>`;
    }
    ids.forEach((id, i) => {
      const x = mx(i) - 1, y = atop + 2, w = MODULE - 1, h = ah - 2, c = teinte(couleurs[i % couleurs.length]), fonce = mix(c, '#000000', 0.32);
      t += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
      // Porte de gauche : nervures et barres de verrouillage.
      for (let xx = x + 2.6; xx < x + 11; xx += 1.8) t += `<rect x="${f1(xx)}" y="${y + 2}" width=".7" height="${h - 4}" fill="${fonce}" opacity=".45"/>`;
      for (const bx of [x + 4, x + 8.4]) t += `<rect x="${bx}" y="${y + 2}" width=".8" height="${h - 4}" fill="${teinte('#C8D3DD')}" opacity=".85"/><rect x="${bx - 0.6}" y="${y + h / 2}" width="2" height="1.6" rx=".4" fill="${teinte('#C8D3DD')}"/>`;
      // Porte de droite remplacée par une baie vitrée.
      t += vitre(id, x + 12.6, y + 4, w - 15, h - 8, { P, lit, moment, mix, cadre: fonce, clip: clip(i) });
      t += `<rect x="${x}" y="${y}" width="${w}" height="2" fill="${fonce}"/><rect x="${x}" y="${y + h - 2}" width="${w}" height="2" fill="${fonce}"/>
        <rect x="${x}" y="${y}" width="1.8" height="${h}" fill="${fonce}"/><rect x="${x + w - 1.8}" y="${y}" width="1.8" height="${h}" fill="${fonce}"/><rect x="${x + 11.2}" y="${y + 2}" width=".8" height="${h - 4}" fill="${fonce}"/>
        ${[[x, y], [x + w - 2.4, y], [x, y + h - 2.4], [x + w - 2.4, y + h - 2.4]].map(([cx2, cy2]) => `<rect x="${f1(cx2)}" y="${f1(cy2)}" width="2.4" height="2.4" fill="${mix(c, '#000000', 0.5)}"/>`).join('')}
        <text x="${x + 6.2}" y="${y + 13.6}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="3.4" fill="#FFFFFF" opacity=".85">ZP 0${i + 1}</text>`;
      t += ecusson(id, x + 6.2, y + 7.2, 3);
    });
    return t;
  }

  // ───── Skin « Roulotte de cirque » ─────
  function roulotte() {
    const by = atop + 4, bh = ah - 12, rouge = teinte('#C8382E'), creme = teinte('#F4EFE3'), or = teinte('#E0A93A'), bois = teinte('#6B4420');
    let t = '';
    // Châssis et roues à rayons.
    t += `<rect x="${ax + 3}" y="${by + bh}" width="${aw - 6}" height="2.4" fill="${bois}"/>`;
    for (const wx of [ax + 11, ax + aw - 11]) {
      t += `<circle cx="${wx}" cy="${base - 6.5}" r="6.4" fill="none" stroke="${or}" stroke-width="1.5"/><circle cx="${wx}" cy="${base - 6.5}" r="1.4" fill="${or}"/>`;
      for (let a = 0; a < 8; a++) t += `<line x1="${wx}" y1="${base - 6.5}" x2="${f1(wx + 5.8 * Math.cos(a * Math.PI / 4))}" y2="${f1(base - 6.5 + 5.8 * Math.sin(a * Math.PI / 4))}" stroke="${or}" stroke-width=".55"/>`;
    }
    // Marchepied au milieu.
    const sx = ax + aw / 2;
    t += `<path d="M${sx - 4} ${by + bh + 2.4} h8 l1 3 h-10 Z M${sx - 5} ${by + bh + 6} h10 l1 2.6 h-12 Z" fill="${bois}"/>`;
    // Caisse à rayures.
    t += `<rect x="${ax}" y="${by}" width="${aw}" height="${bh}" fill="${creme}"/>`;
    for (let xx = ax, k2 = 0; xx < ax + aw; xx += 4, k2++) if (k2 % 2) t += `<rect x="${xx}" y="${by}" width="${Math.min(4, ax + aw - xx)}" height="${bh}" fill="${rouge}"/>`;
    t += `<rect x="${ax}" y="${by}" width="${aw}" height="1.2" fill="${or}"/><rect x="${ax}" y="${by + bh - 3}" width="${aw}" height="3" fill="${teinte('#3A2410')}"/><rect x="${ax}" y="${by + bh - 3.6}" width="${aw}" height=".7" fill="${or}"/>`;
    ids.forEach((id, i) => {
      const x = mx(i) + 6, w = MODULE - 12, haut = by + 8, ressaut = haut + w / 2, bas = by + bh - 6;
      // Fenêtre en arc, cadre doré, écusson en clé de voûte.
      t += `<path d="M${x - 1.4} ${bas + 1.4} V${ressaut} A${w / 2 + 1.4} ${w / 2 + 1.4} 0 0 1 ${x + w + 1.4} ${ressaut} V${bas + 1.4} Z" fill="${or}"/>`;
      t += `<clipPath id="${clip(i)}-arc"><path d="M${x} ${bas} V${ressaut} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${ressaut} V${bas} Z"/></clipPath><g clip-path="url(#${clip(i)}-arc)">${vitre(id, x, haut, w, bas - haut, { P, lit, moment, mix, cadre: or, clip: clip(i) })}</g>`;
      t += `<rect x="${x - 2.4}" y="${bas + 1}" width="${w + 4.8}" height="1.8" rx=".6" fill="${or}"/>`;
      t += ecusson(id, x + w / 2, haut + 0.4, 2.6);
      // Lanterne entre deux fenêtres.
      if (i < ids.length - 1) { const lx = mx(i) + MODULE; t += `<path d="M${lx} ${by + 1.2} V${by + 4}" stroke="${or}" stroke-width=".4"/><rect x="${lx - 1.3}" y="${by + 4}" width="2.6" height="3.6" rx=".6" fill="${lit ? '#FFD27A' : teinte('#F2D02E')}" stroke="${or}" stroke-width=".4"/>${lit ? `<circle cx="${lx}" cy="${by + 5.8}" r="3.4" fill="#FFC56B" opacity=".3"/>` : ''}`; }
    });
    // Toit bombé et lambrequin festonné avec ampoules.
    t += `<path d="M${ax - 4} ${by + 1} Q${ax + aw / 2} ${by - 17} ${ax + aw + 4} ${by + 1} Z" fill="${teinte('#8E2A22')}"/><path d="M${ax - 4} ${by + 1} Q${ax + aw / 2} ${by - 17} ${ax + aw + 4} ${by + 1}" stroke="${or}" stroke-width="1" fill="none"/>`;
    for (let xx = ax - 4, k2 = 0; xx < ax + aw + 4; xx += 5, k2++) {
      t += `<path d="M${xx} ${by + 0.6} h5 v1.6 q-2.5 3 -5 0 Z" fill="${k2 % 2 ? or : teinte('#2F6FB5')}"/>`;
      t += `<circle cx="${xx + 2.5}" cy="${by + 3.6}" r=".7" fill="${lit ? '#FFF1C2' : teinte('#F4EFE3')}"/>${lit ? `<circle cx="${xx + 2.5}" cy="${by + 3.6}" r="1.8" fill="#FFC56B" opacity=".35"/>` : ''}`;
    }
    // Ligne dorée sur le toit, petit chapiteau et fanion au sommet.
    t += `<path d="M${ax + 4} ${by - 1} Q${ax + aw / 2} ${by - 14} ${ax + aw - 4} ${by - 1}" stroke="${or}" stroke-width=".4" fill="none" opacity=".7"/>
      <path d="M${ax + aw / 2 - 3.5} ${by - 7.2} l3.5 -5 l3.5 5 Z" fill="${or}"/><line x1="${ax + aw / 2}" y1="${by - 12.2}" x2="${ax + aw / 2}" y2="${by - 17.6}" stroke="${or}" stroke-width=".5"/><path d="M${ax + aw / 2} ${by - 17.6} l5 1.4 l-5 1.4 Z" fill="${teinte('#2F6FB5')}"/>`;
    return t;
  }

  // ───── Skin « Cabanes de plage » ─────
  function cabanes() {
    const pastels = ['#F2C14E', '#5FA8D3', '#F28482', '#2A9D8F', '#B39CD0'];
    const blanc = teinte('#FBF7EE'), sable = teinte('#E9D8A6');
    let t = `<rect x="${ax - 2}" y="${base - 3}" width="${aw + 4}" height="3" fill="${sable}"/>`;
    ids.forEach((id, i) => {
      const x = mx(i) + 1, w = MODULE - 2, haut = atop + 9, c = teinte(pastels[i % pastels.length]), toit = mix(c, '#000000', 0.25);
      // Planches rayées.
      t += `<rect x="${x}" y="${haut}" width="${w}" height="${base - 3 - haut}" fill="${blanc}"/>`;
      for (let xx = x, k = 0; xx < x + w; xx += 3, k++) if (k % 2 === 0) t += `<rect x="${f1(xx)}" y="${haut}" width="${f1(Math.min(3, x + w - xx))}" height="${base - 3 - haut}" fill="${c}"/>`;
      // Porte vitrée au milieu.
      t += vitre(id, x + 7, haut + 6, w - 14, base - 3 - haut - 7, { P, lit, moment, mix, cadre: toit, clip: clip(i) });
      // Toit en pointe et petite fenêtre en losange.
      t += `<path d="M${x - 2} ${haut + 1} L${x + w / 2} ${atop - 6} L${x + w + 2} ${haut + 1} Z" fill="${toit}"/><path d="M${x - 2} ${haut + 1} L${x + w / 2} ${atop - 6} L${x + w + 2} ${haut + 1}" stroke="${blanc}" stroke-width=".9" fill="none"/>`;
      t += ecusson(id, x + w / 2, atop + 2.4, 2.8);
      // Fanion au sommet, une cabine sur deux.
      if (i % 2 === 0) t += `<line x1="${x + w / 2}" y1="${atop - 6}" x2="${x + w / 2}" y2="${atop - 13}" stroke="${teinte('#6B4420')}" stroke-width=".5"/><g class="hp-flotte" style="animation-delay:${-i * 0.7}s"><path d="M${x + w / 2} ${atop - 13} l5 1.4 l-5 1.4 Z" fill="${teinte(pastels[(i + 2) % pastels.length])}"/></g>`;
      // Bouée sur la première cabine.
      if (i === 0) t += `<circle cx="${x + 3.6}" cy="${haut + 9}" r="2.6" fill="none" stroke="${teinte('#E1332B')}" stroke-width="1.5"/><circle cx="${x + 3.6}" cy="${haut + 9}" r="2.6" fill="none" stroke="${blanc}" stroke-width="1.5" stroke-dasharray="2 2.08"/>`;
    });
    return t;
  }

  // ───── Skin « Wagons d'époque » ─────
  function wagons() {
    const vert = teinte('#344E41'), clair = teinte('#A3B18A'), or = teinte('#C9A13B'), noir = teinte('#1A1A1A');
    const caisse = atop + 6, bas = base - 8;
    let t = `<rect x="${ax - 2}" y="${base - 2}" width="${aw + 4}" height="1.2" fill="${teinte('#8A97A6')}"/>`;
    ids.forEach((id, i) => {
      const x = mx(i) + 1.5, w = MODULE - 3;
      // Soufflet vers le wagon suivant.
      if (i < ids.length - 1) { t += `<rect x="${x + w}" y="${caisse + 5}" width="3" height="${bas - caisse - 8}" fill="${noir}"/>`; for (let yy = caisse + 7; yy < bas - 3; yy += 2) t += `<rect x="${x + w}" y="${yy}" width="3" height=".5" fill="${teinte('#4A4A4A')}"/>`; }
      // Toit bombé, caisse, filet doré.
      t += `<path d="M${x - 1} ${caisse + 1} Q${x + w / 2} ${caisse - 7} ${x + w + 1} ${caisse + 1} Z" fill="${noir}"/>
        <rect x="${x}" y="${caisse}" width="${w}" height="${bas - caisse}" rx="2.5" fill="${vert}"/>
        <rect x="${x + 1}" y="${bas - 5}" width="${w - 2}" height=".8" fill="${or}"/><rect x="${x + 1}" y="${caisse + 2}" width="${w - 2}" height=".6" fill="${clair}" opacity=".7"/>`;
      t += vitre(id, x + 4, caisse + 4, w - 8, bas - caisse - 11, { P, lit, moment, mix, cadre: or, clip: clip(i) });
      // Bogies : deux petites roues.
      for (const rx of [x + 6, x + w - 6]) t += `<circle cx="${rx}" cy="${base - 5}" r="3.2" fill="${noir}"/><circle cx="${rx}" cy="${base - 5}" r="1.1" fill="${teinte('#8A97A6')}"/>`;
      t += `<rect x="${x + 3}" y="${bas}" width="${w - 6}" height="1.6" fill="${noir}"/>`;
      t += ecusson(id, x + w / 2, bas - 2.6, 2.2);
    });
    // Cheminée et vapeur sur le premier wagon, fanal au bout du dernier.
    const x0 = mx(0) + 5;
    t += `<rect x="${x0}" y="${caisse - 9}" width="3" height="6" fill="${noir}"/><rect x="${x0 - 0.8}" y="${caisse - 10}" width="4.6" height="1.6" fill="${noir}"/>
      ${[0, 1, 2].map((k) => `<circle class="hp-fumee" style="animation-delay:${-k * 0.9}s" cx="${x0 + 1.5}" cy="${caisse - 13}" r="2.2" fill="#FFFFFF" opacity=".7"/>`).join('')}`;
    const xf = mx(ids.length - 1) + MODULE - 1.5;
    t += `<rect x="${xf}" y="${bas - 8}" width="2.4" height="3.4" rx=".6" fill="${lit ? '#FFD27A' : teinte('#F2D02E')}"/>${lit ? `<circle cx="${xf + 1.2}" cy="${bas - 6.3}" r="3.6" fill="#FFC56B" opacity=".35"/>` : ''}`;
    return t;
  }

  // ───── Skin « Cabanes sur pilotis » ─────
  function pilotis() {
    const bambou = teinte('#D9C27E'), trait = teinte('#9C8445'), chaume = teinte('#B8893E'), bois = teinte('#6B4420'), corde = teinte('#E9D8A6');
    const sol = base - 11, haut = atop + 9;
    let t = '';
    ids.forEach((id, i) => {
      const x = mx(i) + 1, w = MODULE - 2;
      // Pilotis croisés et cordages.
      t += `<path d="M${x + 3} ${base} L${x + w / 2} ${sol} L${x + w - 3} ${base} M${x + 3} ${sol} L${x + w - 3} ${base} M${x + w - 3} ${sol} L${x + 3} ${base}" stroke="${bois}" stroke-width="1.3" fill="none"/>
        <circle cx="${x + w / 2}" cy="${f1((sol + base) / 2)}" r="1.3" fill="${corde}"/>
        <rect x="${x - 1}" y="${sol - 1.5}" width="${w + 2}" height="2.2" fill="${bois}"/>`;
      // Murs de bambou.
      t += `<rect x="${x + 1}" y="${haut}" width="${w - 2}" height="${sol - 1.5 - haut}" fill="${bambou}"/>`;
      for (let xx = x + 3; xx < x + w - 1; xx += 2.6) t += `<rect x="${f1(xx)}" y="${haut}" width=".5" height="${sol - 1.5 - haut}" fill="${trait}" opacity=".7"/>`;
      t += vitre(id, x + 6, haut + 3, w - 12, sol - haut - 8, { P, lit, moment, mix, cadre: bois, clip: clip(i) });
      // Toit de chaume à frange.
      let fr = `M${x - 3} ${haut + 2}`;
      for (let xx = x - 3; xx < x + w + 3; xx += 2.5) fr += ` l1.25 1.8 l1.25 -1.8`;
      t += `<path d="M${x - 3} ${haut + 2} L${x + w / 2} ${atop - 7} L${x + w + 3} ${haut + 2} Z" fill="${chaume}"/><path d="${fr} L${x + w + 3} ${haut + 2} Z" fill="${chaume}"/>`;
      for (let k = 1; k < 4; k++) t += `<path d="M${f1(x - 3 + k * 1.6)} ${f1(haut + 2 - k * 2.6)} H${f1(x + w + 3 - k * 1.6)}" stroke="${mix(chaume, '#000000', 0.25)}" stroke-width=".4" opacity=".7"/>`;
      t += ecusson(id, x + w / 2, atop + 1.4, 2.4);
    });
    // Une palme qui se balance au bout de l'aile.
    const px = ax + aw + 1;
    t += `<line x1="${px}" y1="${base}" x2="${px + 2}" y2="${atop + 4}" stroke="${teinte('#8A6A3A')}" stroke-width="1.4"/>
      <g class="hp-pivote" style="transform-origin:${px + 2}px ${atop + 4}px">${[[-9, -3], [-6, -7], [2, -8], [8, -4], [9, 2]].map(([dx, dy]) => `<path d="M${px + 2} ${atop + 4} q${dx / 2} ${dy - 2} ${dx} ${dy}" stroke="${teinte('#3E8A55')}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    return t;
  }

  // ───── Skin « Bibliothèque à tiroirs » ─────
  function tiroirs() {
    const bois = teinte('#5A3A22'), boisF = teinte('#3E2614'), face = teinte('#8A5A36'), laiton = teinte('#D4A04A'), carte = teinte('#F4EFE3');
    let t = `<rect x="${ax}" y="${atop - 3}" width="${aw}" height="${ah + 3}" fill="${bois}"/><rect x="${ax - 2.5}" y="${atop - 6}" width="${aw + 5}" height="3.4" rx=".8" fill="${boisF}"/>`;
    // Rangée de petits tiroirs décoratifs en haut.
    for (let xx = ax + 2; xx < ax + aw - 7; xx += 9) t += `<rect x="${f1(xx)}" y="${atop - 1.6}" width="8" height="5.4" rx=".6" fill="${face}"/><circle cx="${f1(xx + 4)}" cy="${atop + 1.6}" r=".7" fill="${laiton}"/>`;
    ids.forEach((id, i) => {
      const x = mx(i) + 1.5, w = MODULE - 3, y = atop + 5.5, h = ah - 9.5, sortie = 1 + (i % 3) * 0.8;
      // Tiroir entrouvert : ombre et flanc, puis la façade.
      t += `<rect x="${x - sortie}" y="${y + sortie}" width="${w}" height="${h}" fill="${boisF}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".8" fill="${face}"/>
        <rect x="${x}" y="${y}" width="${w}" height=".8" fill="#FFFFFF" opacity=".12"/>`;
      // Porte-étiquette en laiton avec l'écusson de l'annexe.
      t += `<rect x="${x + w / 2 - 6}" y="${y + 1.6}" width="12" height="6" rx=".6" fill="${laiton}"/><rect x="${x + w / 2 - 5}" y="${y + 2.4}" width="10" height="4.4" fill="${carte}"/>`;
      t += ecusson(id, x + w / 2, y + 4.6, 1.9);
      t += vitre(id, x + 3.5, y + 9.5, w - 7, h - 16, { P, lit, moment, mix, cadre: boisF, clip: clip(i) });
      // Poignée coquille.
      t += `<path d="M${x + w / 2 - 4} ${y + h - 4.4} a4 3 0 0 0 8 0 Z" fill="${laiton}"/><path d="M${x + w / 2 - 2} ${y + h - 4.4} v1.6 M${x + w / 2} ${y + h - 4.4} v2.4 M${x + w / 2 + 2} ${y + h - 4.4} v1.6" stroke="${mix(laiton, '#000000', 0.3)}" stroke-width=".4"/>`;
    });
    t += `<rect x="${ax + 2}" y="${base - 2}" width="4" height="2" fill="${boisF}"/><rect x="${ax + aw - 6}" y="${base - 2}" width="4" height="2" fill="${boisF}"/>`;
    return t;
  }

  // ───── Skin « Cabines téléphoniques » ─────
  function cabines() {
    const rouge = teinte('#C8102E'), fonce = teinte('#8A0A1E'), noir = teinte('#2B2D42');
    let t = '';
    const centres = ids.map((_, i) => mx(i) + MODULE / 2);
    // Gros câble qui relie les toits.
    for (let i = 0; i < centres.length - 1; i++) t += `<path d="M${centres[i] + 6} ${atop - 2} Q${f1((centres[i] + centres[i + 1]) / 2)} ${atop + 5} ${centres[i + 1] - 6} ${atop - 2}" stroke="${noir}" stroke-width="1.3" fill="none"/>`;
    const veille = Math.floor(ids.length / 2);
    ids.forEach((id, i) => {
      const w = 21, x = centres[i] - w / 2, haut = atop - 2;
      t += `<rect x="${x - 1}" y="${base - 2.5}" width="${w + 2}" height="2.5" fill="${fonce}"/>
        <rect x="${x}" y="${haut}" width="${w}" height="${base - 2.5 - haut}" fill="${rouge}"/>
        <path d="M${x - 1} ${haut + 0.5} Q${x + w / 2} ${haut - 7} ${x + w + 1} ${haut + 0.5} Z" fill="${rouge}"/><path d="M${x + 1} ${haut} Q${x + w / 2} ${haut - 5} ${x + w - 1} ${haut}" stroke="${fonce}" stroke-width=".6" fill="none"/>
        <rect x="${x + 2}" y="${haut + 2}" width="${w - 4}" height="4" fill="${noir}"/><text x="${x + w / 2}" y="${haut + 5.2}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="3.4" letter-spacing=".4" fill="#FFFFFF">POLICE</text>`;
      const vx = x + 3, vy = haut + 8, vw = w - 6, vh = base - 2.5 - haut - 11;
      t += vitre(id, vx, vy, vw, vh, { P, lit, moment, mix, cadre: fonce, clip: clip(i) });
      if (lit && i === veille) t += `<rect class="hp-clignote" x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#FFE7B0" opacity=".35"/>`;
      // Petits carreaux.
      for (let k = 1; k < 3; k++) t += `<rect x="${f1(vx + (vw * k) / 3 - 0.4)}" y="${vy}" width=".8" height="${vh}" fill="${rouge}"/>`;
      for (let k = 1; k < 5; k++) t += `<rect x="${vx}" y="${f1(vy + (vh * k) / 5 - 0.4)}" width="${vw}" height=".8" fill="${rouge}"/>`;
      t += `<rect x="${x + w - 2.2}" y="${vy + vh / 2}" width="1" height="3" rx=".4" fill="${teinte('#C8D3DD')}"/>`;
      t += ecusson(id, x + w / 2, haut - 2.6, 2);
    });
    return t;
  }

  // ───── Skin « Serre tropicale » ─────
  function serre() {
    const blanc = teinte('#F4F8FB'), verre = teinte('#CDE9DD'), brique = teinte('#A85A3E'), feuille = teinte('#3E8A55'), feuille2 = teinte('#5DB070');
    const kw = 9, gy = atop + 6;
    let t = '';
    // Toit à deux pans vitré avec crête ouvragée.
    const faite = gy - 9;
    t += `<path d="M${ax - 2} ${gy} L${ax + aw / 2} ${faite} L${ax + aw + 2} ${gy} Z" fill="${verre}" opacity=".85"/>`;
    for (let xx = ax + 6; xx < ax + aw; xx += 6) { const yy = gy - (9 * (1 - Math.abs(xx - (ax + aw / 2)) / (aw / 2 + 2))); t += `<line x1="${f1(xx)}" y1="${gy}" x2="${f1(xx)}" y2="${f1(yy)}" stroke="${blanc}" stroke-width=".5"/>`; }
    t += `<path d="M${ax - 2} ${gy} L${ax + aw / 2} ${faite} L${ax + aw + 2} ${gy}" stroke="${blanc}" stroke-width="1.1" fill="none"/>`;
    for (let xx = ax + aw / 2 - 18; xx <= ax + aw / 2 + 18; xx += 4) { const yy = faite + Math.abs(xx - (ax + aw / 2)) * 9 / (aw / 2 + 2); t += `<path d="M${f1(xx)} ${f1(yy)} v-2" stroke="${blanc}" stroke-width=".5"/><circle cx="${f1(xx)}" cy="${f1(yy - 2.6)}" r=".8" fill="${blanc}"/>`; }
    // Corps vitré : chaque travée laisse voir sa pièce.
    t += `<rect x="${ax}" y="${gy}" width="${aw}" height="${base - kw - gy}" fill="${blanc}"/>`;
    ids.forEach((id, i) => {
      const x = mx(i) + 1, w = MODULE - 2, y = gy + 1.4, h = base - kw - gy - 2.8;
      t += vitre(id, x, y, w, h, { P, lit, moment, mix, cadre: blanc, clip: clip(i) });
      t += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${verre}" opacity="${lit ? 0.12 : 0.28}"/>`;
      // Petits-bois blancs.
      t += `<rect x="${x + w / 2 - 0.4}" y="${y}" width=".8" height="${h}" fill="${blanc}"/><rect x="${x}" y="${f1(y + h / 3)}" width="${w}" height=".7" fill="${blanc}"/>`;
      t += ecusson(id, x + 4.4, y + 4.4, 2.8);
    });
    // Plantes qui débordent devant le muret.
    const pl = (x, s2, c) => `<path d="M${f1(x)} ${base - kw} q${-3 * s2} ${-6 * s2} ${-1 * s2} ${-11 * s2} q${1.5 * s2} ${5 * s2} ${1 * s2} ${11 * s2} Z" fill="${c}"/><path d="M${f1(x)} ${base - kw} q${3 * s2} ${-5 * s2} ${6 * s2} ${-8 * s2} q${-1 * s2} ${5 * s2} ${-6 * s2} ${8 * s2} Z" fill="${c}"/>`;
    for (let xx = ax + 4, k2 = 0; xx < ax + aw - 2; xx += 9, k2++) {
      t += pl(xx, 0.48 + (k2 % 3) * 0.12, k2 % 2 ? feuille : feuille2);
      if (k2 % 3 === 1) t += `<circle cx="${f1(xx + 1)}" cy="${base - kw - 4.6}" r="1.2" fill="${teinte('#FF6E6A')}"/><circle cx="${f1(xx + 1)}" cy="${base - kw - 4.6}" r=".45" fill="${teinte('#F2D02E')}"/>`;
    }
    // Muret de briques.
    t += `<rect x="${ax}" y="${base - kw}" width="${aw}" height="${kw}" fill="${brique}"/><rect x="${ax - 1}" y="${base - kw - 1}" width="${aw + 2}" height="1.4" fill="${teinte('#C8D3DD')}"/>`;
    for (let yy = base - kw + 2.2, r2 = 0; yy < base; yy += 2.2, r2++) {
      t += `<rect x="${ax}" y="${f1(yy)}" width="${aw}" height=".4" fill="${mix(brique, '#000000', 0.35)}" opacity=".7"/>`;
      for (let xx = ax + (r2 % 2 ? 2.5 : 0); xx < ax + aw; xx += 5) t += `<rect x="${f1(xx)}" y="${f1(yy - 2.2)}" width=".4" height="2.2" fill="${mix(brique, '#000000', 0.35)}" opacity=".6"/>`;
    }
    return t;
  }
}
