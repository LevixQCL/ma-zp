// Bilan de saison, côté joueur : les imprévus de fin de saison, à remettre en état ou à accepter.
import { S, esc, myZone } from './common.js';
import { BILAN, bilanOuvert, maxRemises, libelleCas, coutBilan } from '../engine/bilan.js';

const ICONES = {
  niveaux: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="16" cy="10" r="5"/><path d="M6 28c0-6 4.5-10 10-10s10 4 10 10"/></svg>',
  equip: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 5l7 7-12 12-7-7z"/><path d="M8 17l-3 10 10-3"/></svg>',
  batiments: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 14L16 5l12 9v13H4z"/><path d="M9 27v-8h14v8"/></svg>',
};

/** Ligne de la liste « avant ce soir ». */
export function bilanTodo() {
  const st = S.state, z = myZone();
  if (!st || !z || !bilanOuvert(z, st.turn)) return null;
  const b = z.bilan, ch = (S.draft && S.draft.bilan) || {};
  const ouverts = b.cas.filter((c) => !c.etat);
  const decides = ouverts.filter((c) => ch[c.id]).length;
  const dernier = st.turn >= b.fin;
  return { ok: decides === ouverts.length, href: '#hp-bilan', t: `Bilan de saison : ${decides} imprévu${decides > 1 ? 's' : ''} tranché${decides > 1 ? 's' : ''} sur ${ouverts.length}`, s: dernier ? 'dernier soir : sans réponse, ils sont acceptés' : `remettre en état ou accepter, jusqu’au tour ${b.fin}` };
}

/** Carte de l'HP. */
export function bilanHtml() {
  const st = S.state, z = myZone(), d = S.draft;
  if (!st || !z || !d || !bilanOuvert(z, st.turn)) return '';
  const b = z.bilan, ch = d.bilan || {};
  const max = maxRemises(b);
  const payes = b.cas.filter((c) => c.etat === 'paye').length + b.cas.filter((c) => !c.etat && ch[c.id] === 'paye').length;
  const cout = coutBilan(z, ch);
  const pct = (n) => Math.max(2, Math.min(100, Math.round((n / Math.max(1, b.gagnes, b.moyenne * 1.6)) * 100)));
  const cartes = b.cas.map((c) => {
    const v = c.etat || ch[c.id] || null;
    const fige = !!c.etat;
    const eff = libelleCas(c);
    let bas;
    if (fige) bas = `<p class="tiny muted" style="margin:0">${c.etat === 'paye' ? 'Remis en état' : 'Accepté'}</p>`;
    else bas = `<div class="rel-choix">
        <button type="button" class="dil-btn" data-action="bilan" data-id="${esc(c.id)}" data-v="paye" aria-pressed="${v === 'paye'}" ${v !== 'paye' && payes >= max ? 'disabled' : ''}><span class="t">${esc(c.a)}</span><span class="s">${c.prix} k€ ce soir · niveau conservé</span></button>
        <button type="button" class="dil-btn" data-action="bilan" data-id="${esc(c.id)}" data-v="accepte" aria-pressed="${v === 'accepte'}"><span class="t">Accepter</span><span class="s">${esc(eff)}</span></button>
      </div>`;
    return `<article class="bil-cas ${v || ''}">
      <span class="bil-ic">${ICONES[c.k]}</span>
      <div class="col" style="gap:3px;min-width:0">
        <span style="font-weight:700">${esc(c.t)}</span>
        <span class="small" style="color:var(--text2)">${esc(c.x)}</span>
        <span class="bil-eff">${v === 'paye' ? esc(eff.replace(/ (\d) → \d$/, ' : niveau $1 conservé')) : esc(eff)}</span>
      </div>
      ${bas}
    </article>`;
  }).join('');
  const ouverts = b.cas.filter((c) => !c.etat);
  return `<section id="hp-bilan" class="card bilan" aria-label="Bilan de saison">
    <div class="bil-une">
      <span class="bil-ed">La Gazette · édition spéciale</span>
      <h2 class="bil-titre">Bilan de la saison ${esc(String(b.season))}</h2>
      <p class="bil-chapo">Ta zone a gagné ${b.gagnes} niveau${b.gagnes > 1 ? 'x' : ''} la saison passée, la moyenne du district est à ${String(b.moyenne).replace('.', ',')}. Plus une zone s’est développée, plus elle a de matériel à entretenir et de personnel qui part : ${b.cas.length} imprévu${b.cas.length > 1 ? 's' : ''} pour toi.</p>
      <div class="bil-jauge" role="img" aria-label="Ta zone : ${b.gagnes} niveaux, moyenne du district : ${b.moyenne}"><i style="width:${pct(b.gagnes)}%"></i><b style="left:${pct(b.moyenne)}%"></b></div>
    </div>
    <div class="between small"><span>Remises en état : <strong>${payes} sur ${max}</strong>, à moitié prix</span><span class="muted">jusqu’au tour ${b.fin}</span></div>
    ${ouverts.some((c) => !ch[c.id]) ? `<button type="button" class="btn ghost small" data-action="bilan-tout">${Object.keys(ch).length ? 'Accepter tout le reste' : 'Tout accepter'}</button>` : ''}
    <details class="repli-mini" ${Object.keys(ch).length || S.bilanOuvert ? 'open' : ''}><summary class="small" style="font-weight:700;cursor:pointer">Voir les ${b.cas.length} imprévu${b.cas.length > 1 ? 's' : ''} et remettre en état</summary>
      <div class="col" style="gap:10px;margin-top:8px">${cartes}</div></details>
    <p class="tiny muted" style="margin:0">Tu gardes le reste : formations, matériel, bâtiments (l’hôtel de police ne redescend jamais sous 4 une fois atteint), annexes, parc, équipe, skins et trophées. ${cout ? `Coût ce soir : ${cout} k€, payé à 20:00 si le budget le permet.` : ''} Sans réponse au tour ${b.fin}, les imprévus sont acceptés.</p>
    ${Object.keys(ch).length && S.ordersDirty ? '<button type="button" class="btn primary small" data-action="save-orders">Valider mes ordres</button>' : ''}
  </section>`;
}

/** Actions des boutons (renvoie true si l'action est traitée). */
export function actionBilan(act, el) {
  const d = S.draft, z = myZone();
  if (!d || !z || !z.bilan) return false;
  if (act === 'bilan') {
    const id = el.dataset.id, v = el.dataset.v;
    const ch = { ...(d.bilan || {}) };
    if (ch[id] === v) delete ch[id];
    else {
      if (v === 'paye') {
        const payes = z.bilan.cas.filter((c) => c.etat === 'paye').length + z.bilan.cas.filter((c) => !c.etat && ch[c.id] === 'paye' && c.id !== id).length;
        if (payes >= maxRemises(z.bilan)) return true;
      }
      ch[id] = v;
    }
    d.bilan = ch;
  } else if (act === 'bilan-tout') {
    const ch = { ...(d.bilan || {}) };
    for (const c of z.bilan.cas) if (!c.etat && !ch[c.id]) ch[c.id] = 'accepte';
    d.bilan = ch;
  } else return false;
  S.ordersDirty = true;
  return true;
}

export { BILAN };
