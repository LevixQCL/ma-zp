// Carte « Mes trophées » de l'accueil.
import { S, esc, icon, myZone } from './common.js';
import { TROPHEES } from '../engine/trophees.js';
import { vignetteTrophees } from './vignettes-hp.js';

export function tropheesHtml() {
  const z = myZone();
  const acquis = new Map((z.trophees || []).map((t) => [t.id, t]));
  const liste = TROPHEES.filter((t) => !t.ancien || acquis.has(t.id));
  const trophees = liste.map((t) => {
    const a = acquis.get(t.id);
    return `<div class="trophee ${a ? 'on' : ''}" title="${esc(t.texte)}">${icon('trophy', 18)}<span class="n">${esc(t.nom)}</span><span class="d">${esc(t.texte)}</span>${a ? `<span class="d gagne">${icon('check', 12)} gagné · saison ${a.s}, tour ${a.t}</span>` : ''}</div>`;
  }).join('');
  const nb = acquis.size;
  return `<details class="card repli" aria-label="Mes trophées" data-k="trophees" ${S.ouverts && S.ouverts.trophees ? 'open' : ''}>
    <summary><span class="vign">${vignetteTrophees(nb)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Mes trophées</span>
      <span class="tiny muted">${nb} sur ${liste.length}</span></span>${icon('chevron', 16)}</summary>
    <div class="trophees">${trophees}</div></details>`;
}
