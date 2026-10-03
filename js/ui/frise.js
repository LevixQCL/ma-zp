// Chronologie à reconstituer (affaire de Mons) : une frise de 20:00 à 00:30, une ligne pour la scène et une par suspect.
// Le joueur y place lui-même les événements que ses pièces lui ont appris ; rien n'y est mis d'office.
import { esc } from './common.js';
import { EVENEMENTS } from '../engine/meurtre-mons.js';

const T0 = 20 * 60, T1 = 24 * 60 + 30;
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const COUL = ['#C2302B', '#C88A12', '#2F6FD3', '#2E9E62', '#6B4FB8'];

/** Événements que ce dossier permet de placer (pièce connue, ou document public). */
export function evenementsDispo(connus) { return EVENEMENTS.filter((e) => connus.has(e.f)); }

/**
 * La frise en SVG. `ids` : événements placés. `mini` : version punaisée au tableau (sans légendes).
 */
export function friseSvg(aff, ids, { mini = false } = {}) {
  const evs = EVENEMENTS.filter((e) => ids.includes(e.id));
  const W = 640, G = 96, L = 30, top = 26;
  const lignes = [{ nom: 'Scène', c: '#5E574A' }, ...aff.suspects.map((s, i) => ({ nom: s.prenom, c: COUL[i] }))];
  const H = top + lignes.length * L + 10;
  const x = (m) => G + ((Math.max(T0, Math.min(T1, m)) - T0) / (T1 - T0)) * (W - G - 10);
  const y = (qui) => top + (qui === null || qui === undefined ? 0 : qui + 1) * L + L / 2;
  const heures = [];
  for (let m = T0; m <= T1; m += 30) heures.push(m);
  const num = (e) => evs.indexOf(e) + 1;
  return `<svg class="fr-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <rect width="${W}" height="${H}" fill="#FFFDF6"/>
    ${lignes.map((l, k) => `<rect x="0" y="${top + k * L}" width="${W}" height="${L}" fill="${k % 2 ? '#F6F1E4' : '#FFFDF6'}"/><text x="8" y="${top + k * L + L / 2 + 4}" font-family="Caveat, cursive" font-size="17" font-weight="700" fill="${l.c}">${esc(l.nom)}</text>`).join('')}
    ${heures.map((m) => `<path d="M${x(m)} ${top - 4}V${H - 6}" stroke="${m % 60 ? '#E4DCC8' : '#CFC4AA'}" stroke-width="${m % 60 ? 0.8 : 1.2}"/>${m % 60 ? '' : `<text x="${x(m)}" y="${top - 8}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="10" fill="#5E574A">${hm(m)}</text>`}`).join('')}
    ${evs.filter((e) => e.a).map((e) => `<rect x="${x(e.de)}" y="${y(e.qui) - (e.dit ? 7 : 5)}" width="${Math.max(3, x(e.a) - x(e.de))}" height="${e.dit ? 14 : 10}" rx="3" fill="${e.qui === null || e.qui === undefined ? '#8E877A' : COUL[e.qui]}" opacity="${e.dit ? 0.18 : 0.55}" ${e.dit ? `stroke="${COUL[e.qui]}" stroke-dasharray="4 3"` : ''}/>
      ${mini ? '' : `<text x="${x(e.de) + 3}" y="${y(e.qui) + 3.5}" font-family="Instrument Sans, sans-serif" font-size="8" font-weight="700" fill="#1D1A15">${num(e)}</text>`}`).join('')}
    ${evs.filter((e) => !e.a).map((e) => `<g transform="translate(${x(e.de)} ${y(e.qui)})"><circle r="${mini ? 5 : 7}" fill="${e.qui === null || e.qui === undefined ? '#1D1A15' : COUL[e.qui]}"/>${mini ? '' : `<text y="3" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="8" font-weight="700" fill="#FFF">${num(e)}</text>`}</g>`).join('')}
  </svg>`;
}

/** Volet de la frise : la frise, sa légende, et les événements disponibles à placer ou retirer. */
export function friseVolet(aff, connus, ids) {
  const dispo = evenementsDispo(connus);
  const places = EVENEMENTS.filter((e) => ids.includes(e.id));
  const ligne = (e) => {
    const on = ids.includes(e.id);
    return `<button type="button" class="tb-trajet-l ${on ? 'on' : ''}" style="--c:${e.qui === null || e.qui === undefined ? 'var(--amber)' : COUL[e.qui]}" data-action="frise-ev" data-id="${e.id}" aria-pressed="${on}"><span>${esc(e.t)}</span><strong>${hm(e.de)}${e.a ? `–${hm(e.a)}` : ''}</strong></button>`;
  };
  return `<span class="tb-ligne-k" style="color:var(--amber)">Chronologie · ${places.length} événement${places.length > 1 ? 's' : ''} placé${places.length > 1 ? 's' : ''}</span>
    <span class="tb-titre">La soirée de mardi</span>
    <div class="fr-cadre">${friseSvg(aff, ids)}</div>
    ${places.length ? `<ol class="fr-leg">${places.map((e) => `<li>${esc(e.t)} <span class="muted">${hm(e.de)}${e.a ? `–${hm(e.a)}` : ''}</span></li>`).join('')}</ol>` : ''}
    <p class="tiny muted" style="margin:0">Touche un événement pour le placer sur la frise ou l’en retirer. Les barres en pointillés : ce que chacun dit de sa soirée. Ta frise est rangée avec ton tableau.</p>
    <span class="tb-ligne-k">Ce que ton dossier permet de placer · ${dispo.length}</span>
    ${dispo.map(ligne).join('')}`;
}
