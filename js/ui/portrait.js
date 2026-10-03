// Portraits des suspects, façon photo d'identité judiciaire : dessinés d'après leur fiche (femme ou homme,
// âge, métier) avec une part de hasard tirée du nom. Modelé du visage par dégradés et ombres floutées,
// iris, reflets, mèches, rides selon l'âge, grain photo et vignettage.
import { hashString } from '../engine/rng.js';

// [clair, moyen, ombre, lèvres]
const PEAUX = [
  ['#F7DCC8', '#E9BFA3', '#C8957A', '#C97B78'], ['#F0CFB2', '#DFB18F', '#B9876A', '#BE7068'], ['#E2B48E', '#CC9A72', '#A1704E', '#AE6658'],
  ['#C99069', '#B07A54', '#835537', '#97564A'], ['#9C6644', '#835235', '#5E3822', '#7A4236'], ['#EBC6A6', '#D7A884', '#AE7D5E', '#B86F66'],
];
const CHEVEUX = ['#1C1410', '#2C1E15', '#45301F', '#644226', '#86592F', '#A9783F', '#C9A46A', '#28282A'];
const YEUX = [['#5B3A1F', '#2E1C0E'], ['#6B4A2A', '#3A2412'], ['#4B7BA0', '#24445E'], ['#5E7F52', '#2F4527'], ['#7A6A48', '#433825'], ['#3E5F7A', '#1F3346']];
const FONDS = [['#D9DEE2', '#A9B1B8'], ['#E1DAD0', '#B3A898'], ['#D3D9D0', '#A2AA9D'], ['#D6D2DC', '#A6A0AE'], ['#CBD5DD', '#94A3AF']];

function teinteCheveux(base, age, h) {
  if (age >= 56) return h % 2 ? '#D9D7D2' : '#BDBAB4';
  if (age >= 46) return h % 3 === 0 ? '#9D9893' : base === CHEVEUX[0] || base === CHEVEUX[1] || base === CHEVEUX[7] ? '#56504B' : '#887D72';
  return base;
}

/** Tenue d'après le lien avec la victime. */
function tenue(role) {
  const r = role.toLowerCase();
  if (/entretien|ménag/.test(r)) return 'blouse';
  if (/technicien/.test(r)) return 'polo';
  if (/livreu/.test(r)) return 'livreur';
  if (/associ|expert|commissaire|promoteur|immobilier|notaire/.test(r)) return 'costume';
  if (/brasserie|restaura|patron|café/.test(r)) return 'tablier';
  if (/restauratrice|apprenti/.test(r)) return 'atelier';
  if (/brocant|voisin/.test(r)) return 'pull';
  if (/client/.test(r)) return 'sweat';
  if (/concurrent/.test(r)) return 'tablier';
  if (/intérim|interim/.test(r)) return 'gilet';
  return 'chemise';
}

const mix = (a, b, t) => {
  const p = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, k) => Math.round(v + (y[k] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

function vetement(t, f, h, id) {
  const cols = {
    blouse: ['#4A6888', '#30485F'], polo: ['#26323F', '#151C24'], livreur: ['#8A5A2B', '#5E3C1A'], costume: f ? ['#3B3F4A', '#22252C'] : ['#2E333D', '#1A1D23'],
    pull: [['#7A3E3E', '#4E2525'], ['#4E6140', '#2F3B26'], ['#5E5487', '#3A3356'], ['#7A6A55', '#4C4134']][h % 4], sweat: [['#4A6FA5', '#2D4468'], ['#5E5E5E', '#3A3A3A'], ['#9A5530', '#62351C']][h % 3],
    tablier: ['#2E3B4C', '#1B2430'], atelier: ['#7C8A6E', '#4F5A45'], gilet: ['#5A6470', '#3A414A'], chemise: [['#C5D6E8', '#8EA4BC'], ['#E8E2D2', '#B8AE96'], ['#D9C4C4', '#A88F8F']][h % 3],
  }[t];
  const [c, o] = cols;
  const corps = `<path d="M8 192c4-30 26-44 60-50l32 8 32-8c34 6 56 20 60 50z" fill="url(#${id}v)"/>`;
  const chemiseCol = (coul) => `<path d="M78 140l22 22 22-22-6-6-16 16-16-16z" fill="${coul}"/><path d="M78 140l22 22 22-22" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/>`;
  switch (t) {
    case 'costume':
      return corps + chemiseCol('#F2F0EA') + (f ? `<path d="M88 152q12 10 24 0" fill="none" stroke="#D9C27A" stroke-width="1.6"/><circle cx="100" cy="158" r="2.4" fill="#E2CB86"/>` : `<path d="M97 150h6l3 32-6 8-6-8z" fill="#6E2430"/><path d="M97 150h6l-1 4h-4z" fill="#561B25"/>`)
        + `<path d="M50 192c2-26 12-42 30-52l20 26-14 26zM150 192c-2-26-12-42-30-52l-20 26 14 26z" fill="${o}"/><path d="M80 140l20 26M120 140l-20 26" stroke="rgba(255,255,255,.12)" stroke-width="1.2"/>`;
    case 'polo':
      return corps + `<path d="M82 138l18 12 18-12v10l-18 10-18-10z" fill="${o}"/><path d="M100 150v16" stroke="#0E141B" stroke-width="2"/><circle cx="100" cy="156" r="1.4" fill="#ddd"/><circle cx="100" cy="163" r="1.4" fill="#ddd"/><rect x="122" y="164" width="22" height="11" rx="2" fill="#B23528"/>`;
    case 'blouse':
      return corps + `<path d="M84 140q16 16 32 0" fill="none" stroke="${o}" stroke-width="4"/><path d="M100 156v36" stroke="${o}" stroke-width="2"/><rect x="114" y="168" width="22" height="16" rx="2" fill="${o}"/>`;
    case 'livreur':
      return corps + `<path d="M80 140q20 14 40 0l2 10q-22 13-44 0z" fill="#4A3014"/><path d="M100 152v40" stroke="#2E1F0C" stroke-width="3"/><path d="M30 178h140" stroke="#E8C14A" stroke-width="6" opacity=".85"/>`;
    case 'pull':
      return corps + `<path d="M80 142q20 16 40 0" fill="none" stroke="${o}" stroke-width="7" stroke-linecap="round"/><g stroke="${o}" stroke-width="1" opacity=".45">${[160, 168, 176, 184].map((y) => `<path d="M24 ${y}h152" stroke-dasharray="3 3"/>`).join('')}</g>`;
    case 'sweat':
      return corps + `<path d="M60 150q40 30 80 0" fill="none" stroke="${o}" stroke-width="10" stroke-linecap="round"/><path d="M90 162l-2 20M110 162l2 20" stroke="#EEE" stroke-width="2"/>`;
    case 'tablier':
      return corps + chemiseCol('#F2F0EA') + `<path d="M64 192v-30q36-8 72 0v30z" fill="#ECE7DC"/><path d="M64 162l16-24M136 162l-16-24" stroke="#CFC7B6" stroke-width="4"/>`;
    case 'atelier':
      return corps + `<path d="M82 140q18 14 36 0" fill="none" stroke="${o}" stroke-width="5"/><path d="M60 192v-28q40-10 80 0v28z" fill="#5C4632"/><path d="M60 164l20-24M140 164l-20-24" stroke="#4A3826" stroke-width="5"/><path d="M84 176h14" stroke="#C9B48A" stroke-width="2"/>`;
    case 'gilet':
      return corps + `<path d="M46 192c2-26 10-42 32-52l12 52zM154 192c-2-26-10-42-32-52l-12 52z" fill="#CFE83A"/><path d="M48 176h40M112 176h40" stroke="#C9CDD2" stroke-width="6"/>`;
    default:
      return corps + chemiseCol(mix(c, '#FFFFFF', 0.35)) + `<path d="M100 162v30" stroke="${o}" stroke-width="1.4"/><circle cx="100" cy="172" r="1.6" fill="${o}"/><circle cx="100" cy="184" r="1.6" fill="${o}"/>`;
  }
}

/** Mèches : quelques traits courbes tirés du nom, plus clairs ou plus foncés que la masse. */
function meches(h, d, c, n = 14) {
  n = Math.round(n * 0.6);
  let out = '';
  for (let k = 0; k < n; k++) {
    const r = hashString(`${h}m${k}`);
    const x = d.x0 + (r % 1000) / 1000 * (d.x1 - d.x0), y = d.y0 + ((r >> 10) % 1000) / 1000 * (d.y1 - d.y0);
    const dx = ((r >> 20) % 20) - 10, l = 10 + (r % 14);
    out += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${dx / 2} ${l / 2} ${dx} ${l}" stroke="${k % 3 ? mix(c, '#000000', 0.3) : mix(c, '#FFFFFF', 0.25)}" stroke-width="${k % 3 ? 1.2 : 0.9}" fill="none" stroke-linecap="round" opacity=".32"/>`;
  }
  return out;
}

function cheveuxArriere(style, c, id) {
  const f = `fill="url(#${id}h)"`;
  if (style === 'long') return `<path d="M62 84c-6-40 12-58 38-58s44 18 38 58l6 66c-14 8-30 10-44 10s-30-2-44-10z" ${f}/>`;
  if (style === 'mi-long') return `<path d="M64 84c-5-36 12-54 36-54s41 18 36 54l2 32c-10 6-24 8-38 8s-28-2-38-8z" ${f}/>`;
  if (style === 'boucles') return `<g ${f}>${[[64, 78], [60, 98], [64, 118], [136, 78], [140, 98], [136, 118], [74, 132], [126, 132]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15"/>`).join('')}</g>`;
  if (style === 'queue') return `<path d="M128 58c18 8 24 28 18 60-4 12-12 16-16 12 6-20 4-40-8-56z" ${f}/>`;
  return '';
}

function cheveuxAvant(style, c, age, id, h) {
  const f = `fill="url(#${id}h)"`;
  const ombreFront = `<path d="M72 72q28-10 56 0" stroke="rgba(0,0,0,.18)" stroke-width="6" fill="none" filter="url(#${id}b)"/>`;
  switch (style) {
    case 'court': return ombreFront + `<path d="M69 80c-2-30 12-46 31-46s33 16 31 46c-4-12-10-18-16-20-10 4-20 4-30 0-6 2-12 8-16 20z" ${f}/><clipPath id="${id}hc"><path d="M69 80c-2-30 12-46 31-46s33 16 31 46c-4-12-10-18-16-20-10 4-20 4-30 0-6 2-12 8-16 20z"/></clipPath><g clip-path="url(#${id}hc)">${meches(h, { x0: 76, x1: 124, y0: 38, y1: 52 }, c, 10)}</g>`;
    case 'raie': return ombreFront + `<path d="M67 84c-3-34 12-50 33-50 22 0 36 16 33 48-6-14-16-22-36-24-12 0-22 10-30 26z" ${f}/><path d="M84 38q-4 10-2 20" stroke="rgba(0,0,0,.25)" stroke-width="1.6" fill="none"/>` + `<clipPath id="${id}hc"><path d="M67 84c-3-34 12-50 33-50 22 0 36 16 33 48-6-14-16-22-36-24-12 0-22 10-30 26z"/></clipPath><g clip-path="url(#${id}hc)">${meches(h, { x0: 86, x1: 126, y0: 38, y1: 54 }, c, 12)}</g>`;
    case 'ras': return `<path d="M70 78c0-28 13-42 30-42s30 14 30 42c-2-12-6-18-12-20-12 2-24 2-36 0-6 2-10 8-12 20z" ${f} opacity=".8"/>`;
    case 'frise': return `<g ${f}>${[[76, 54], [86, 44], [100, 40], [114, 44], [124, 54], [72, 66], [128, 66], [92, 50], [108, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10"/>`).join('')}</g>`;
    case 'degarni': return `<path d="M69 92c-2-18 0-30 6-38l4 8c-2 8-2 18 0 30zM131 92c2-18 0-30-6-38l-4 8c2 8 2 18 0 30z" ${f}/>${age > 50 ? '' : `<path d="M84 46q16-6 32 0" stroke="${c}" stroke-width="4" opacity=".45" fill="none"/>`}`;
    case 'long': case 'mi-long': return ombreFront + `<path d="M68 80c2-24 15-38 32-38s30 14 32 38c-8-12-16-18-26-18-4 6-12 12-28 12-4 0-8 2-10 6z" ${f}/><clipPath id="${id}hc"><path d="M68 80c2-24 15-38 32-38s30 14 32 38c-8-12-16-18-26-18-4 6-12 12-28 12-4 0-8 2-10 6z"/></clipPath><g clip-path="url(#${id}hc)">${meches(h, { x0: 70, x1: 130, y0: 44, y1: 70 }, c, 14)}</g>`;
    case 'boucles': return `<g ${f}>${[[74, 58], [86, 46], [100, 42], [114, 46], [126, 58], [70, 72], [130, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12"/>`).join('')}</g>`;
    case 'chignon': return `<circle cx="100" cy="30" r="14" ${f}/><path d="M70 78c0-24 13-38 30-38s30 14 30 38c-6-12-16-18-30-18s-24 6-30 18z" ${f}/>` + `<clipPath id="${id}hc"><path d="M70 78c0-24 13-38 30-38s30 14 30 38c-6-12-16-18-30-18s-24 6-30 18z"/></clipPath><g clip-path="url(#${id}hc)">${meches(h, { x0: 74, x1: 126, y0: 44, y1: 60 }, c, 10)}</g>`;
    case 'queue': return `<path d="M70 78c0-24 13-38 30-38s30 14 30 38c-6-12-16-18-30-18s-24 6-30 18z" ${f}/><clipPath id="${id}hc"><path d="M70 78c0-24 13-38 30-38s30 14 30 38c-6-12-16-18-30-18s-24 6-30 18z"/></clipPath><g clip-path="url(#${id}hc)">${meches(h, { x0: 74, x1: 126, y0: 44, y1: 60 }, c, 10)}</g>`;
    default: return '';
  }
}

/**
 * Portrait SVG d'un suspect.
 * @param {object} s suspect (nom, f, age, role)
 */
export function portraitSuspect(s, i, cls = 'tb-face') {
  const h = hashString(`${s.nom}#${i}`);
  const pick = (arr, k) => arr[Math.floor(h / k) % arr.length];
  const [clair, peau, ombre, levres] = pick(PEAUX, 3);
  const age = s.age || 35;
  const base = pick(CHEVEUX, 7);
  const cheveux = teinteCheveux(base, age, h);
  const sourcilC = mix(teinteCheveux(base, Math.min(age, 50), h), '#000000', 0.15);
  const [iris, irisF] = pick(YEUX, 11);
  const [fond1, fond2] = pick(FONDS, 13);
  const t = tenue(s.role || '');
  let style;
  if (s.f) style = pick(age > 50 ? ['mi-long', 'chignon', 'mi-long', 'boucles'] : ['long', 'mi-long', 'chignon', 'queue', 'boucles'], 17);
  else style = age > 47 && (h % 3 !== 0) ? 'degarni' : pick(['court', 'raie', 'ras', 'frise', 'court'], 17);
  const barbe = !s.f ? pick(['', '', 'courte', 'moustache', 'pleine', 'ombre'], 19) : '';
  const lunettes = (h % 10) < (age > 48 ? 5 : 2);
  const casquette = t === 'livreur' && (!s.f || h % 2 === 0);
  const id = `pt${i}${h % 9973}`;
  const vieux = Math.max(0, Math.min(1, (age - 32) / 30)); // 0 jeune → 1 âgé
  const larg = s.f ? 27 : 30; // demi-largeur du visage
  const tete = ((h >> 7) % 5) - 2; // légère inclinaison
  const regard = ((h >> 11) % 3) - 1; // regard un peu à gauche ou à droite
  const visage = `M${100 - larg} 84C${100 - larg} 54 ${100 - larg + 14} 38 100 38S${100 + larg} 54 ${100 + larg} 84C${100 + larg} ${s.f ? 104 : 108} ${100 + larg - 6} ${s.f ? 122 : 126} ${100 + larg - 16} 134C${100 + 9} 140 ${100 + 4} 142 100 142S${100 - 9} 140 ${100 - larg + 16} 134C${100 - larg + 6} ${s.f ? 122 : 126} ${100 - larg} ${s.f ? 104 : 108} ${100 - larg} 84Z`;
  const oeil = (cx, k) => `
    <ellipse cx="${cx}" cy="87" rx="10" ry="5" fill="${ombre}" opacity=".35" filter="url(#${id}b)"/>
    <path d="M${cx - 8} 88q8 -6 16 0q-8 4.4 -16 0z" fill="#E9E1DA"/>
    <clipPath id="${id}o${k}"><path d="M${cx - 8} 88q8 -6 16 0q-8 4.4 -16 0z"/></clipPath>
    <g clip-path="url(#${id}o${k})"><circle cx="${cx + regard * 1.3}" cy="87.4" r="3.7" fill="url(#${id}i)"/><circle cx="${cx + regard * 1.3}" cy="87.4" r="1.6" fill="#0D0A08"/><circle cx="${cx + regard * 1.3 + 1.2}" cy="86.1" r=".9" fill="#FFFFFF" opacity=".9"/>
      <path d="M${cx - 8} 83h16v3.6q-8 -2.6 -16 0z" fill="rgba(0,0,0,.28)"/></g>
    <path d="M${cx - 8.6} 88.3q8.6 -7.2 17.2 0" fill="none" stroke="#24180F" stroke-width="${s.f ? 1.6 : 1.2}" stroke-linecap="round"/>
    <path d="M${cx - 7} 83.4q7 -4 14 -.4" fill="none" stroke="${ombre}" stroke-width=".9" opacity=".5"/>
    <path d="M${cx - 6.5} 91.2q6.5 2.6 13 0" fill="none" stroke="${ombre}" stroke-width="${0.6 + vieux}" opacity="${0.2 + vieux * 0.4}"/>`;
  const rides = vieux > 0.25 ? `<g fill="none" stroke="${ombre}" stroke-linecap="round" opacity="${(0.2 + vieux * 0.45).toFixed(2)}">
      <path d="M84 64q16 -3 32 0" stroke-width="1.1"/><path d="M86 70q14 -2.5 28 0" stroke-width=".9"/>
      <path d="M90 112q-5 6 -3 14M110 112q5 6 3 14" stroke-width="1.4"/>
      ${vieux > 0.6 ? `<path d="M${100 - larg + 4} 86l-5 -2M${100 - larg + 4} 89l-5 1M${100 + larg - 4} 86l5 -2M${100 + larg - 4} 89l5 1" stroke-width=".8"/>` : ''}</g>` : '';
  const levreH = s.f ? mix(levres, '#B03A48', 0.35) : levres;
  const bouche = `<path d="M89 123q5.5 -3 11 -1.4q5.5 -1.6 11 1.4q-5.5 1.6 -11 1.6t-11 -1.6z" fill="${mix(levreH, '#000000', 0.12)}"/>
    <path d="M89.5 123.4q10.5 ${s.f ? 8 : 6.5} 21 0q-10.5 2.4 -21 0z" fill="${levreH}"/>
    <path d="M89 123.2q11 2.6 22 0" stroke="${mix(levres, '#000000', 0.45)}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M95 127.5q5 1.8 10 0" stroke="#FFFFFF" stroke-width="1" fill="none" opacity=".25" stroke-linecap="round"/>`;
  const nez = `<path d="M${regard >= 0 ? 104 : 96} 90q${regard >= 0 ? 2 : -2} 12 ${regard >= 0 ? 3 : -3} 20" stroke="${ombre}" stroke-width="3" fill="none" opacity=".35" filter="url(#${id}b)"/>
    <path d="M93 110q-3 4 1 6q3 1 6 -0.5q3 1.5 6 .5q4 -2 1 -6" fill="none" stroke="${ombre}" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>
    <ellipse cx="95.5" cy="114" rx="2.2" ry="1.3" fill="${mix(ombre, '#000000', 0.3)}" opacity=".7"/><ellipse cx="104.5" cy="114" rx="2.2" ry="1.3" fill="${mix(ombre, '#000000', 0.3)}" opacity=".7"/>
    <ellipse cx="${100 + regard}" cy="108" rx="3" ry="2" fill="#FFFFFF" opacity=".22"/>`;
  const sourcils = `<path d="M${s.f ? 80 : 79} 78q9 ${s.f ? -6 : -4.5} 18 -1.5" stroke="${sourcilC}" stroke-width="${s.f ? 2.6 : 4}" fill="none" stroke-linecap="round" opacity=".9"/>
    <path d="M103 76.5q9 ${s.f ? -4.5 : -3} 18 1.5" stroke="${sourcilC}" stroke-width="${s.f ? 2.6 : 4}" fill="none" stroke-linecap="round" opacity=".9"/>`;
  const barbeHtml = {
    ombre: `<path d="${visage}" fill="${cheveux}" opacity=".26" mask="url(#${id}bas)" filter="url(#${id}b)"/>`,
    courte: `<path d="${visage}" fill="${cheveux}" opacity=".55" mask="url(#${id}bas)"/><path d="${visage}" fill="url(#${id}g)" opacity=".5" mask="url(#${id}bas)"/>`,
    pleine: `<path d="${visage}" fill="${cheveux}" opacity=".9" mask="url(#${id}bas)"/><path d="${visage}" fill="url(#${id}g)" opacity=".6" mask="url(#${id}bas)"/>`,
    moustache: '',
  }[barbe] || '';
  const moustache = barbe === 'moustache' || barbe === 'pleine' || barbe === 'courte'
    ? `<path d="M87 121c4-4 9-5 13-2 4-3 9-2 13 2-5 1.4-9 1.4-13 .4-4 1-8 1-13-.4z" fill="${cheveux}" opacity="${barbe === 'courte' ? 0.7 : 1}"/>` : '';
  return `<svg class="${cls}" viewBox="24 16 152 146" aria-hidden="true">
    <defs>
      <radialGradient id="${id}f" cx="42%" cy="34%" r="80%"><stop offset="0" stop-color="${fond1}"/><stop offset="1" stop-color="${fond2}"/></radialGradient>
      <radialGradient id="${id}p" cx="42%" cy="40%" r="62%"><stop offset="0" stop-color="${clair}"/><stop offset=".55" stop-color="${peau}"/><stop offset="1" stop-color="${ombre}"/></radialGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ombre}"/><stop offset=".6" stop-color="${peau}"/></linearGradient>
      <radialGradient id="${id}i" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="${mix(iris, '#FFFFFF', 0.25)}"/><stop offset=".7" stop-color="${iris}"/><stop offset="1" stop-color="${irisF}"/></radialGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${mix(cheveux, '#FFFFFF', 0.18)}"/><stop offset=".5" stop-color="${cheveux}"/><stop offset="1" stop-color="${mix(cheveux, '#000000', 0.35)}"/></linearGradient>
      <linearGradient id="${id}v" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(vetementCouleur(t, s.f, h), '#FFFFFF', 0.12)}"/><stop offset="1" stop-color="${mix(vetementCouleur(t, s.f, h), '#000000', 0.35)}"/></linearGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
      <pattern id="${id}bb" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="${mix(cheveux, '#000000', 0.2)}"/><circle cx="2.4" cy="2.2" r=".5" fill="${cheveux}"/></pattern>
      <mask id="${id}bas" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="192"><path d="M60 116q12 -8 22 -6q18 4 36 0q10 -2 22 6v40h-80z" fill="#fff" filter="url(#${id}b)"/></mask>
      <linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF4E4" stop-opacity=".22"/><stop offset=".45" stop-color="#FFF4E4" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
      <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${h % 97}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .55 0"/></filter>
      <radialGradient id="${id}vg" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>
    </defs>
    <rect width="200" height="192" fill="url(#${id}f)"/>
    <ellipse cx="128" cy="120" rx="58" ry="70" fill="#000" opacity=".12" filter="url(#${id}b)"/>
    <g transform="rotate(${tete} 100 150)">
    ${cheveuxArriere(style, cheveux, id)}
    <path d="M86 126h28v26q-14 8 -28 0z" fill="url(#${id}c)"/>
    <path d="M86 132q14 10 28 0v6q-14 8 -28 0z" fill="${ombre}" opacity=".5"/>
    ${vetement(t, s.f, h, id)}
    <ellipse cx="${100 - larg}" cy="94" rx="5.5" ry="10" fill="${peau}"/><ellipse cx="${100 - larg + 1}" cy="94" rx="2.6" ry="6" fill="${ombre}" opacity=".55"/>
    <ellipse cx="${100 + larg}" cy="94" rx="5.5" ry="10" fill="${peau}"/><ellipse cx="${100 + larg - 1}" cy="94" rx="2.6" ry="6" fill="${ombre}" opacity=".55"/>
    ${s.f && h % 2 ? `<circle cx="${100 - larg}" cy="106" r="2.2" fill="#E8C878"/><circle cx="${100 + larg}" cy="106" r="2.2" fill="#E8C878"/>` : ''}
    <path d="${visage}" fill="url(#${id}p)"/>
    <path d="${visage}" fill="url(#${id}g)" opacity=".45"/>
    <path d="${visage}" fill="url(#${id}l)"/>
    <path d="M86 112q-4 8 -2 16M114 112q4 8 2 16" stroke="${ombre}" stroke-width="3" fill="none" opacity=".18" filter="url(#${id}b)"/>
    <ellipse cx="${84 - regard * 2}" cy="104" rx="9" ry="6" fill="${s.f ? '#E58C80' : '#D88A78'}" opacity="${s.f ? 0.22 : 0.12}" filter="url(#${id}b)"/>
    <ellipse cx="${116 - regard * 2}" cy="104" rx="9" ry="6" fill="${s.f ? '#E58C80' : '#D88A78'}" opacity="${s.f ? 0.22 : 0.12}" filter="url(#${id}b)"/>
    <ellipse cx="90" cy="66" rx="10" ry="6" fill="#FFFFFF" opacity=".16" filter="url(#${id}b)"/>
    ${barbeHtml}
    ${rides}
    ${oeil(88, 0)}${oeil(112, 1)}
    ${sourcils}
    ${nez}
    ${moustache}
    ${bouche}
    <path d="M92 136q8 4 16 0" stroke="${ombre}" stroke-width="1.2" fill="none" opacity=".35"/>
    ${cheveuxAvant(style, cheveux, age, id, h)}
    ${casquette ? `<path d="M68 70c0-20 14-34 32-34s32 14 32 34z" fill="#9A5420"/><path d="M100 66c18-1 38 2 46 8-14 3-30 2-46-2z" fill="#6E3A14"/>` : ''}
    ${lunettes ? `<g fill="rgba(220,235,245,.14)" stroke="#2A2420" stroke-width="1.4"><rect x="76" y="80" width="22" height="16" rx="6"/><rect x="102" y="80" width="22" height="16" rx="6"/></g><path d="M98 87h4M76 86l-${larg - 22} -3M124 86l${larg - 22} -3" stroke="#2A2420" stroke-width="1.3"/><path d="M80 83l6 8M106 83l6 8" stroke="#FFFFFF" stroke-width="1.4" opacity=".35"/>` : ''}
    </g>
    <rect width="200" height="192" filter="url(#${id}n)" opacity=".16" style="mix-blend-mode:multiply"/>
    <rect width="200" height="192" fill="url(#${id}vg)"/>
    <rect width="200" height="192" fill="rgba(255,236,205,.06)"/>
  </svg>`;
}

function vetementCouleur(t, f, h) {
  return {
    blouse: '#4A6888', polo: '#26323F', livreur: '#8A5A2B', costume: f ? '#3B3F4A' : '#2E333D',
    pull: ['#7A3E3E', '#4E6140', '#5E5487', '#7A6A55'][h % 4], sweat: ['#4A6FA5', '#5E5E5E', '#9A5530'][h % 3],
    tablier: '#2E3B4C', atelier: '#7C8A6E', gilet: '#5A6470', chemise: ['#C5D6E8', '#E8E2D2', '#D9C4C4'][h % 3],
  }[t] || '#555555';
}
