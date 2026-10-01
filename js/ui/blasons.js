// Blasons de zone (grade Commissaire divisionnaire) et insigne de grade (Commissaire).
import { GRADES, gradeFor } from '../engine/constants.js';

export const BLASONS = {
  etoile: { nom: 'Étoile', motif: '<path d="M0 -7l2.1 4.3 4.7.7-3.4 3.3.8 4.7L0 3.8-4.2 6l.8-4.7L-6.8-2l4.7-.7z"/>' },
  tour: { nom: 'Tour', motif: '<path d="M-5 7V-2h-1.5v-5h2v2h2v-2h3v2h2v-2h2v5H5v9zM-1.5 7V3h3v4z"/>' },
  cle: { nom: 'Clé', motif: '<circle cx="-3" cy="-3" r="3.2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M-.8-.8L5.5 5.5M2.5 2.5l1.8-1.8M4.2 4.2l1.8-1.8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>' },
  epees: { nom: 'Épées', motif: '<path d="M-6-6L6 6M6-6L-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M-4 2l2 2M4 2l-2 2" stroke="#fff" stroke-width="2"/>' },
  chene: { nom: 'Chêne', motif: '<path d="M0-7c3 0 5 2.2 5 5 0 2.5-1.8 4.4-4 4.8V7h-2V2.8C-3.2 2.4-5 .5-5-2c0-2.8 2-5 5-5z"/>' },
  ancre: { nom: 'Ancre', motif: '<circle cx="0" cy="-5" r="1.8" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M0-3v10M-3-.5h6M-6 2c1 3.5 3.2 5 6 5s5-1.5 6-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>' },
};

export function blasonSvg(id, couleur = '#63B0FF', size = 28, label = '') {
  const b = BLASONS[id];
  if (!b) return '';
  return `<svg width="${size}" height="${Math.round(size * 1.15)}" viewBox="-10 -11 20 23" role="img" aria-label="${label || `Blason ${b.nom}`}" style="flex-shrink:0">
    <path d="M0 -10l9 3v6c0 6-4 10-9 12-5-2-9-6-9-12v-6z" fill="${couleur}" stroke="#0C1124" stroke-width="1"/>
    <g fill="#fff">${b.motif}</g></svg>`;
}

/** Insigne affiché à partir du grade Commissaire. */
export function insigne(ps) {
  const i = GRADES.indexOf(gradeFor(ps));
  if (i < 3) return '';
  const n = i - 2; // 1 à 3 étoiles
  return `<span class="insigne" title="${gradeFor(ps).nom}" aria-label="${gradeFor(ps).nom}">${'★'.repeat(n)}</span>`;
}
