// Salle des ventes : carte repliable de l'HP (un lot par jour, offre secrète dans les ordres).
import { S, esc, icon, fmt1, myZone, zoneName } from './common.js';
import { LOTS, ENCHERE } from '../engine/constants.js';
import { encherePossible } from '../engine/encheres.js';

/** Offre en cours dans le brouillon pour le lot du jour (0 si aucune). */
export function monOffre() {
  const e = S.state && S.state.enchere, o = S.draft && S.draft.offre;
  return e && o && o.id === e.id ? o.montant || 0 : 0;
}

/** Nouvelle offre après un clic sur le pas `d` (en k€). */
export function offreApres(d) {
  const e = S.state.enchere;
  const cur = monOffre();
  if (!cur) return d > 0 ? Math.min(ENCHERE.max, Math.max(e.prixMin, d)) : 0;
  const n = cur + d;
  if (n < e.prixMin) return 0;
  return Math.min(ENCHERE.max, n);
}

function resultatHtml(st) {
  const r = st.enchereResultat;
  if (!r) return '';
  const lot = LOTS[r.lot];
  const g = r.gagnant && st.zones[r.gagnant];
  return `<p class="tiny muted" style="margin:0">Dernière vente (tour ${r.tour}) : ${esc(lot ? lot.nom : r.nom)} · ${g ? `remporté par ${zoneName(g)} pour ${r.montant} k€ (${r.offres} offre${r.offres > 1 ? 's' : ''})` : 'aucun acheteur'}.</p>`;
}

import { vignetteVentes } from './vignettes-hp.js';
export function encheresHtml() {
  const z = myZone(), st = S.state;
  const e = st.enchere && st.enchere.tour === st.turn ? st.enchere : null;
  const lot = e && LOTS[e.lot];
  const offre = monOffre();
  const mesLots = (z.lots || []).map((l) => LOTS[l.id]).filter(Boolean);
  const resume = lot ? `${esc(lot.nom)} · mise à prix ${e.prixMin} k€${offre ? (S.ordersDirty ? ` · <strong class="warn">offre de ${offre} k€ à valider</strong>` : ` · <strong class="ok">ton offre : ${offre} k€</strong>`) : ''}` : 'Premier lot annoncé à 20:00';
  let corps;
  if (!lot) corps = '<p class="small muted" style="margin:0">La salle des ventes ouvre après la prochaine résolution : un nouveau lot chaque jour.</p>';
  else {
    const refus = encherePossible(st, z);
    corps = `<div class="bat">
        <div class="between" style="align-items:flex-start;gap:8px"><span style="font-weight:700">${esc(lot.nom)}</span>${lot.reserve ? `<span class="pill amber" style="flex-shrink:0">réputation ${ENCHERE.repReserve}+</span>` : ''}</div>
        <span class="tiny muted">${esc(lot.texte)}</span>
        <span class="small ok" style="font-weight:600">${esc(lot.effet)}</span>
        <span class="tiny muted">Mise à prix : ${e.prixMin} k€ · offre maximale ${ENCHERE.max} k€</span>
      </div>
      ${refus ? `<p class="small warn" style="margin:0">${esc(refus)}.</p>` : `
      <div class="col" style="gap:6px">
        <div class="between"><span style="font-weight:600;font-size:14px">Ton offre secrète</span><span class="tiny muted">budget ${fmt1(z.budget)} k€</span></div>
        <span class="stepper" style="align-self:center"><button type="button" data-action="offre" data-d="-5" aria-label="5 k€ de moins" ${offre ? '' : 'disabled'}>−5</button><button type="button" data-action="offre" data-d="-1" aria-label="1 k€ de moins" ${offre ? '' : 'disabled'}>−</button>
          <span class="n" style="min-width:64px">${offre ? `${offre} k€` : '—'}</span>
          <button type="button" data-action="offre" data-d="1" aria-label="1 k€ de plus">+</button><button type="button" data-action="offre" data-d="5" aria-label="5 k€ de plus">+5</button></span>
        <span class="tiny muted" style="text-align:center">${offre ? 'Débitée seulement si tu l’emportes.' : 'Aucune offre : touche + pour enchérir à partir de la mise à prix.'}</span>
      </div>
      ${offre > z.budget ? '<p class="small bad" style="margin:0">Ton budget actuel ne couvre pas cette offre : elle sera refusée si c’est encore le cas à 20:00.</p>' : ''}
      ${offre && S.ordersDirty ? '<p class="small warn" style="margin:0">Offre pas encore envoyée : valide tes ordres avant 20:00, sinon elle ne compte pas.</p>' : ''}
      ${offre && !S.ordersDirty && S.savedOrders ? `<p class="tiny ok" style="margin:0;text-align:center">${icon('check', 14)} Offre envoyée avec tes ordres.</p>` : ''}
      ${offre ? '<button type="button" class="btn small ghost block" data-action="offre-retirer">Retirer mon offre</button>' : ''}`}
      <p class="tiny muted" style="margin:0">Offres secrètes, dévoilées à 20:00. Le plus offrant gagne et paie son offre ; à égalité, la meilleure réputation l’emporte. Après un lot gagné, pas d’enchère pendant ${ENCHERE.delaiGain} tours.</p>`;
  }
  return `<details class="card repli" aria-label="Salle des ventes" data-k="encheres" ${S.ouverts && S.ouverts.encheres ? 'open' : ''}>
    <summary><span class="vign">${vignetteVentes(!!offre)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Salle des ventes</span>
      <span class="tiny muted">${resume}</span></span>${icon('chevron', 16)}</summary>
    <div class="col" style="gap:10px">${corps}
      ${mesLots.length ? `<p class="small" style="margin:0"><strong>Tes lots cette saison</strong> : ${mesLots.map((l) => esc(l.nom)).join(' · ')}</p>` : ''}
      ${resultatHtml(st)}
      <a class="tiny" href="#guide-ventes">Règles de la salle des ventes</a>
    </div></details>`;
}
