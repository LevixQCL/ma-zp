// Comparatif des modèles de véhicules (parc automobile et achat en grande décision).
import { esc, icon, fmt1 } from './common.js';
import { PREPA } from '../engine/constants.js';
import { MODELES } from '../engine/flotte.js';
import { vehiculeSvg } from './scene-hp.js';

/**
 * Comparatif de tous les modèles achetables (retour de Luc) : une colonne par modèle, la meilleure valeur de chaque ligne en vert.
 * `ouvert` : déplié d'emblée.
 */
export function comparatifModeles(z, { ouvert = false } = {}) {
  const ids = Object.keys(MODELES), prepa = 1 + PREPA.vitesse * ((z && z.prepa) || 0);
  const pc = (x) => (x === 1 ? '=' : `${x > 1 ? '+' : '−'}${Math.round(Math.abs(x - 1) * 100)} %`);
  // [libellé, valeur numérique (pour trouver la meilleure), texte, plus haut = mieux ?]
  const L = [
    ['Prix', (M) => M.prix, (M) => `${fmt1(M.prix)} k€`, false],
    ['Places', (M) => M.places, (M) => fmt1(M.places), true],
    ['Vitesse', (M) => M.vitesse, (M) => `${Math.round(31 * 3.6 * M.vitesse * prepa)}`, true],
    ['Accélér.', (M) => M.accel, (M) => pc(M.accel), true],
    ['Maniab.', (M) => M.maniab, (M) => pc(M.maniab), true],
    ['Freinage', (M) => M.frein, (M) => pc(M.frein), true],
    ['Accrochages', (M) => M.pv, (M) => String(M.pv), true],
    ['Usure', (M) => M.usure, (M) => (M.usure === 1 ? 'normale' : `−${Math.round((1 - M.usure) * 100)} %`), false],
    ['Entretien/j', (M) => M.entretien, (M) => `${fmt1(M.entretien)} k€`, false],
  ];
  const best = (f, haut) => { const v = ids.map((m) => f(MODELES[m])); return haut ? Math.max(...v) : Math.min(...v); };
  const lignes = L.map(([l, f, t, haut]) => { const b = best(f, haut), tous = ids.every((m) => f(MODELES[m]) === b);
    return `<tr><th scope="row">${l}</th>${ids.map((m) => `<td class="${!tous && f(MODELES[m]) === b ? 'ok' : ''}">${t(MODELES[m])}</td>`).join('')}</tr>`; }).join('');
  return `<details class="cmp-modeles" ${ouvert ? 'open' : ''}><summary class="small" style="font-weight:600">Comparer les ${ids.length} modèles ${icon('chevron', 12)}</summary>
    <div class="cmp-scroll"><table class="cmp-table"><thead><tr><th></th>${ids.map((m) => `<th scope="col">${vehiculeSvg(MODELES[m].type, 14)}<span>${esc(MODELES[m].court)}</span></th>`).join('')}</tr></thead>
    <tbody>${lignes}<tr><th scope="row">Atout</th>${ids.map((m) => `<td class="role">${esc(MODELES[m].role)}</td>`).join('')}</tr></tbody></table></div>
    <span class="tiny muted">Vitesse en km/h sur les urgences, véhicule neuf${(z && z.prepa) ? `, avec ta préparation des combis (niv. ${z.prepa})` : ''}. En vert : le meilleur de la ligne. Accrochages : ce qu’il encaisse sur une urgence avant de devoir s’arrêter.</span></details>`;
}

