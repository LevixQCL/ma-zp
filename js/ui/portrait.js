// Portraits des suspects : dessinés d'après leur fiche (femme ou homme, âge, métier),
// avec une part de hasard tirée du nom pour que chaque suspect ait son propre visage.
import { hashString } from '../engine/rng.js';

const PEAUX = [['#F6D9C4', '#E4B99C'], ['#EDC7A6', '#D7A986'], ['#D9A57E', '#C08A63'], ['#B98159', '#9C6844'], ['#8E5A3A', '#74462C'], ['#E9C1A0', '#D2A27F']];
const CHEVEUX = ['#1F1612', '#2E1F16', '#4A3020', '#6B4528', '#8C5A2E', '#B07A3C', '#C9A464', '#2B2B2B'];
const YEUX = ['#4A3020', '#5B3A1F', '#3B6A8C', '#4F7A4A', '#6B5B3A'];
const FONDS = [['#C9D6E3', '#8796A6'], ['#E3D2C9', '#A08C80'], ['#D3DDCB', '#8E9C86'], ['#DCD5C3', '#9A927E'], ['#D5CEE0', '#8F879E']];

/** Gris des cheveux selon l'âge (poivre et sel puis blanc). */
function teinteCheveux(base, age, h) {
  if (age >= 54) return h % 2 ? '#D8D6D2' : '#B9B7B2';
  if (age >= 46) return h % 3 === 0 ? '#9C9893' : base === '#1F1612' || base === '#2E1F16' ? '#5A544E' : '#8A7F74';
  return base;
}

/** Tenue d'après le lien avec la victime. */
function tenue(role) {
  const r = role.toLowerCase();
  if (/entretien/.test(r)) return 'blouse';
  if (/technicien/.test(r)) return 'polo';
  if (/livreu/.test(r)) return 'livreur';
  if (/associ/.test(r)) return 'costume';
  if (/voisin/.test(r)) return 'pull';
  if (/client/.test(r)) return 'sweat';
  if (/concurrent/.test(r)) return 'tablier';
  if (/intérim|interim/.test(r)) return 'gilet';
  return 'chemise'; // ancien(ne) employé(e)
}

function vetement(t, f, h, peau) {
  const couleurs = {
    blouse: ['#3E5C7A', '#2E4760'], polo: ['#23303F', '#18212C'], livreur: ['#8A5A2B', '#6E4720'], costume: ['#2F3440', '#232731'],
    pull: [['#7A3B3B', '#5E2C2C'], ['#4B5E3A', '#3A4A2C'], ['#6B5B95', '#54477A']][h % 3], sweat: [['#4A6FA5', '#3A5884'], ['#5E5E5E', '#474747'], ['#A0522D', '#844322']][h % 3],
    tablier: ['#E8E4DA', '#CFC9BB'], gilet: ['#5A6470', '#48505A'], chemise: [['#BFD3E6', '#9FB6CC'], ['#E6E0D0', '#CBC3AF'], ['#D9C2C2', '#BFA5A5']][h % 3],
  }[t];
  const [c, o] = couleurs;
  const corps = `<path d="M10 100c2-21 17-32 40-32s38 11 40 32z" fill="${c}"/><path d="M10 100c2-21 17-32 40-32-14 4-24 16-26 32z" fill="${o}" opacity=".55"/>`;
  const col = `<path d="M42 68l8 10 8-10" fill="none" stroke="${o}" stroke-width="2"/>`;
  switch (t) {
    case 'chemise':
      return corps + `<path d="M41 66l9 9 9-9-3-3-6 7-6-7z" fill="#F4F2EC"/><path d="M50 75v25" stroke="${o}" stroke-width="1"/><circle cx="50" cy="83" r=".9" fill="${o}"/><circle cx="50" cy="92" r=".9" fill="${o}"/>`;
    case 'costume':
      return corps + `<path d="M41 66l9 9 9-9-3-3-6 7-6-7z" fill="#F4F2EC"/>` + (f ? `<path d="M44 72q6 6 12 0" fill="none" stroke="#D9C27A" stroke-width="1.2"/><circle cx="50" cy="76" r="1.4" fill="#D9C27A"/>` : `<path d="M48.5 74h3l1.5 18-3 4-3-4z" fill="#8C2F39"/>`) + `<path d="M28 100c0-14 6-24 15-31l7 10-9 21zM72 100c0-14-6-24-15-31l-7 10 9 21z" fill="${o}"/>`;
    case 'polo':
      return corps + `<path d="M42 66l8 6 8-6v5l-8 5-8-5z" fill="${o}"/><path d="M50 72v7" stroke="#0E141B" stroke-width="1.2"/><rect x="59" y="80" width="11" height="6" rx="1" fill="#C0392B"/><path d="M61 83h7" stroke="#fff" stroke-width=".9"/><path d="M43 69l-5 22M57 69l5 22" stroke="#C0392B" stroke-width="1"/><rect x="58.5" y="89" width="8" height="10" rx="1" fill="#EDEDED" stroke="#999" stroke-width=".5"/><rect x="60" y="91" width="5" height="3" fill="#7FA6C0"/>`;
    case 'blouse':
      return corps + col + `<path d="M50 76v24" stroke="${o}" stroke-width="1.2"/><rect x="56" y="84" width="11" height="9" rx="1.5" fill="${o}"/><path d="M58 84v-3" stroke="#D0D4D8" stroke-width="1.5"/><circle cx="50" cy="82" r=".9" fill="#ddd"/><circle cx="50" cy="91" r=".9" fill="#ddd"/>`;
    case 'livreur':
      return corps + `<path d="M40 67q10 8 20 0l1 6q-11 7-22 0z" fill="#5A3A18"/><path d="M50 74v26" stroke="#3A2A12" stroke-width="1.5"/><path d="M20 90h60" stroke="#E8C14A" stroke-width="3" opacity=".9"/>`;
    case 'pull':
      return corps + `<path d="M41 68q9 7 18 0" fill="none" stroke="${o}" stroke-width="3"/><g stroke="${o}" stroke-width=".8" opacity=".6">${[78, 84, 90, 96].map((y) => `<path d="M16 ${y}h68" stroke-dasharray="2 2"/>`).join('')}</g>`;
    case 'sweat':
      return corps + `<path d="M30 74q20 14 40 0" fill="none" stroke="${o}" stroke-width="5" stroke-linecap="round"/><path d="M45 80l-1 10M55 80l1 10" stroke="#EEE" stroke-width="1"/>`;
    case 'tablier':
      return `<path d="M10 100c2-21 17-32 40-32s38 11 40 32z" fill="#3D4B5C"/>` + `<path d="M41 66l9 9 9-9-3-3-6 7-6-7z" fill="#F4F2EC"/><path d="M33 100V80q17-4 34 0v20z" fill="${c}"/><path d="M33 80l8-13M67 80l-8-13" stroke="${o}" stroke-width="2"/><rect x="44" y="86" width="12" height="7" rx="1" fill="${o}"/>`;
    case 'gilet':
      return corps + `<path d="M24 100c1-14 6-24 16-31l6 31zM76 100c-1-14-6-24-16-31l-6 31z" fill="#D7F23C"/><path d="M24 90h22M54 90h22" stroke="#C9CDD2" stroke-width="3"/><path d="M42 68q8 6 16 0" fill="none" stroke="${o}" stroke-width="2"/>`;
    default: return corps;
  }
}

function cheveuxArriere(style, c) {
  if (style === 'long') return `<path d="M31 42c-2-17 7-26 19-26s21 9 19 26l3 30c-7 4-14 5-22 5s-15-1-22-5z" fill="${c}"/>`;
  if (style === 'mi-long') return `<path d="M32 42c-2-16 6-25 18-25s20 9 18 25l1 15c-5 3-12 4-19 4s-14-1-19-4z" fill="${c}"/>`;
  if (style === 'boucles') return `<g fill="${c}">${[[33, 40], [31, 50], [33, 60], [67, 40], [69, 50], [67, 60], [38, 66], [62, 66], [50, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')}</g>`;
  if (style === 'queue') return `<path d="M64 30c9 4 12 14 9 30-2 6-6 8-8 6 3-10 2-20-4-28z" fill="${c}"/>`;
  return '';
}

function cheveuxAvant(style, c, age) {
  switch (style) {
    case 'court': return `<path d="M35 38c0-12 7-18 15-18s15 6 15 18c-2-5-5-8-8-9-4 2-10 2-14 0-3 1-6 4-8 9z" fill="${c}"/>`;
    case 'raie': return `<path d="M34 40c-1-14 7-21 16-21 10 0 17 7 16 20-3-6-8-10-17-11-5 0-10 5-15 12z" fill="${c}"/><path d="M42 22q-2 5-1 10" stroke="rgba(0,0,0,.18)" stroke-width="1" fill="none"/>`;
    case 'ras': return `<path d="M35 38c0-12 7-18 15-18s15 6 15 18c-1-6-3-9-6-10-6 1-12 1-18 0-3 1-5 4-6 10z" fill="${c}" opacity=".75"/>`;
    case 'frise': return `<g fill="${c}">${[[38, 26], [44, 22], [50, 21], [56, 22], [62, 26], [36, 32], [64, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}</g>`;
    case 'degarni': return `<path d="M34.5 44c-1-9 0-15 3-19l2 4c-1 4-1 9 0 15zM65.5 44c1-9 0-15-3-19l-2 4c1 4 1 9 0 15z" fill="${c}"/>${age > 50 ? '' : `<path d="M42 23q8-3 16 0" stroke="${c}" stroke-width="2" opacity=".5" fill="none"/>`}`;
    case 'long': case 'mi-long': return `<path d="M34 37c1-11 8-17 16-17s15 6 16 17c-4-6-9-8-12-8-1 3-6 6-14 6-2 0-4 1-6 2z" fill="${c}"/>`;
    case 'boucles': return `<g fill="${c}">${[[37, 28], [43, 23], [50, 21], [57, 23], [63, 28], [35, 35], [65, 35]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6"/>`).join('')}</g>`;
    case 'chignon': return `<circle cx="50" cy="16" r="7" fill="${c}"/><path d="M35 37c0-11 7-17 15-17s15 6 15 17c-3-5-8-8-15-8s-12 3-15 8z" fill="${c}"/>`;
    case 'queue': return `<path d="M35 37c0-11 7-17 15-17s15 6 15 17c-3-5-8-8-15-8s-12 3-15 8z" fill="${c}"/>`;
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
  const [peau, ombre] = pick(PEAUX, 3);
  const age = s.age || 35;
  const cheveux = teinteCheveux(pick(CHEVEUX, 7), age, h);
  const yeux = pick(YEUX, 11);
  const [fond1, fond2] = pick(FONDS, 13);
  const t = tenue(s.role || '');
  let style;
  if (s.f) style = pick(age > 50 ? ['mi-long', 'chignon', 'mi-long', 'boucles'] : ['long', 'mi-long', 'chignon', 'queue', 'boucles'], 17);
  else style = age > 47 && (h % 3 !== 0) ? 'degarni' : pick(['court', 'raie', 'ras', 'frise', 'court'], 17);
  const barbe = !s.f ? pick(['', '', 'courte', 'moustache', 'pleine', 'ombre'], 19) : '';
  const lunettes = (h % 10) < (age > 48 ? 5 : 2);
  const casquette = t === 'livreur' && !s.f ? true : t === 'livreur' && h % 2 === 0;
  const id = `pt${i}${h % 1000}`;
  const rides = age > 44;
  const sourcils = s.f ? 1.3 : 2.1;
  return `<svg class="${cls}" viewBox="0 0 100 96" aria-hidden="true">
    <defs><radialGradient id="${id}f" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${fond1}"/><stop offset="1" stop-color="${fond2}"/></radialGradient>
    <linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${ombre}"/><stop offset=".35" stop-color="${peau}"/><stop offset=".7" stop-color="${peau}"/><stop offset="1" stop-color="${ombre}"/></linearGradient></defs>
    <rect width="100" height="96" fill="url(#${id}f)"/>
    ${cheveuxArriere(style, cheveux)}
    <path d="M44 52h12v16q-6 4-12 0z" fill="${ombre}"/>
    ${vetement(t, s.f, h, peau)}
    <ellipse cx="34.5" cy="42" rx="2.6" ry="4.2" fill="${ombre}"/><ellipse cx="65.5" cy="42" rx="2.6" ry="4.2" fill="${ombre}"/>
    ${s.f && h % 2 ? `<circle cx="34.5" cy="47.5" r="1.3" fill="#E8C14A"/><circle cx="65.5" cy="47.5" r="1.3" fill="#E8C14A"/>` : ''}
    <path d="M35 36c0-11 7-18 15-18s15 7 15 18v6c0 10-7 18-15 18s-15-8-15-18z" fill="url(#${id}p)"/>
    ${barbe === 'ombre' ? `<path d="M37 47c2 8 7 12 13 12s11-4 13-12c-3 4-8 6-13 6s-10-2-13-6z" fill="${cheveux}" opacity=".22"/>` : ''}
    ${barbe === 'courte' ? `<path d="M36 45c1 9 7 15 14 15s13-6 14-15c-2 4-5 6-7 6-2-2-5-3-7-3s-5 1-7 3c-2 0-5-2-7-6z" fill="${cheveux}" opacity=".55"/>` : ''}
    ${barbe === 'pleine' ? `<path d="M35.5 43c0 11 6 19 14.5 19s14.5-8 14.5-19c-2 5-5 8-8 8-2-2-4-3-6.5-3s-4.5 1-6.5 3c-3 0-6-3-8-8z" fill="${cheveux}"/>` : ''}
    ${rides ? `<path d="M43 28.5q7-1.5 14 0" stroke="${ombre}" stroke-width=".8" fill="none" opacity=".8"/><path d="M44.5 46q-1.5 3 0 6M55.5 46q1.5 3 0 6" stroke="${ombre}" stroke-width=".9" fill="none"/>` : ''}
    ${age > 52 ? `<path d="M38 39l-2.5-1M38 40.5l-2.5.5M62 39l2.5-1M62 40.5l2.5.5" stroke="${ombre}" stroke-width=".7"/>` : ''}
    <path d="M40 34.5q4-${s.f ? 2 : 1.5} 7.5 0M52.5 34.5q3.5-${s.f ? 2 : 1.5} 7.5 0" stroke="${teinteCheveux(pick(CHEVEUX, 7), Math.min(age, 50), h)}" stroke-width="${sourcils}" fill="none" stroke-linecap="round"/>
    <ellipse cx="44" cy="39.5" rx="2.8" ry="1.7" fill="#FBFAF7"/><ellipse cx="56" cy="39.5" rx="2.8" ry="1.7" fill="#FBFAF7"/>
    <circle cx="44.3" cy="39.6" r="1.35" fill="${yeux}"/><circle cx="56.3" cy="39.6" r="1.35" fill="${yeux}"/>
    <circle cx="44.6" cy="39.2" r=".4" fill="#fff"/><circle cx="56.6" cy="39.2" r=".4" fill="#fff"/>
    ${s.f ? '<path d="M41 38.3q3-1.4 6 0M53 38.3q3-1.4 6 0" stroke="#1D1A15" stroke-width=".7" fill="none"/>' : ''}
    <path d="M50 41c-.8 3-1.8 5-1.4 6.6 1 .7 2.3.7 3.2 0" fill="none" stroke="${ombre}" stroke-width="1.1" stroke-linecap="round"/>
    ${s.f ? `<ellipse cx="41" cy="47" rx="3" ry="1.6" fill="#E59A8A" opacity=".25"/><ellipse cx="59" cy="47" rx="3" ry="1.6" fill="#E59A8A" opacity=".25"/>` : ''}
    ${barbe === 'moustache' || barbe === 'pleine' ? `<path d="M44 50.5c2-1.6 4.5-1.8 6-.6 1.5-1.2 4-1 6 .6-2.2.8-4.4.9-6 .3-1.6.6-3.8.5-6-.3z" fill="${cheveux}"/>` : ''}
    <path d="M45.5 53q4.5 ${age > 50 ? 1.2 : 2.2} 9 0" stroke="${s.f ? '#B5545A' : '#8A4A3E'}" stroke-width="${s.f ? 1.6 : 1.2}" fill="none" stroke-linecap="round"/>
    ${cheveuxAvant(style, cheveux, age)}
    ${casquette ? `<path d="M34 33c0-9 7-15 16-15s16 6 16 15z" fill="#B5652A"/><path d="M50 31c9-.5 19 1 23 4-7 1.5-15 1.2-23-1z" fill="#8A4A1E"/><circle cx="50" cy="18.5" r="1.3" fill="#8A4A1E"/>` : ''}
    ${lunettes ? `<g fill="rgba(255,255,255,.12)" stroke="#2A2420" stroke-width="1.3"><rect x="39" y="36" width="10" height="7" rx="2.5"/><rect x="51" y="36" width="10" height="7" rx="2.5"/></g><path d="M49 39h2M39 38.5l-4-1M61 38.5l4-1" stroke="#2A2420" stroke-width="1.1"/>` : ''}
    <rect width="100" height="96" fill="rgba(255,236,200,.07)"/>
  </svg>`;
}
