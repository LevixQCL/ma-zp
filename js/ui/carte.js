// Carte du District Delta, Radio Delta.
import { S, esc, icon, bonusEnigme } from './common.js';
import { iconeSite } from './plan.js';
import { tensionsDe, niveauTension, prevoirTensions, carteQuartiers, QUARTIERS } from '../engine/quartiers.js';
import { capacite, effetsOperation } from '../engine/zone.js';


/** Petite voiture de police vue de côté, sobre (cases de patrouille, liste des quartiers). */
const VOITURE = (w = 22) => `<svg viewBox="0 0 24 12" width="${w}" height="${Math.round(w / 2)}" aria-hidden="true" class="cv-auto"><path d="M2 9V6.5L5 6l2.6-3h8.2L19 6l3 .6V9z" fill="currentColor"/><rect x="10" y="1.6" width="4" height="1.4" rx=".6" fill="#63B0FF"/><circle cx="6.5" cy="9.5" r="1.8" fill="#0B1124"/><circle cx="17.5" cy="9.5" r="1.8" fill="#0B1124"/></svg>`;

/** Ce qu'il faut pour la fiche et la liste : agents de Proximité, patrouilles, prévision du soir. */
function etatPatrouilles(st, me) {
  const d = S.draft, pat = (d && d.patrouilles) || {};
  const opx = effetsOperation(me, (d && d.alloc) || {}, d && d.operation, st.turn);
  const prox = opx.eff.proximite || 0;
  const capProx = capacite(me, 'proximite', prox, { rythme: d && d.rythme, turn: st.turn, bonus: bonusEnigme('proximite'), alloc: opx.eff });
  const prev = prevoirTensions(st, me, { patrouilles: pat, agentsProx: prox, capProx });
  const cibles = Object.values(pat).reduce((s2, x) => s2 + x, 0);
  return { d, pat, prox, prev, cibles, pris: (opx.pris && opx.pris.proximite) || 0 };
}

/**
 * Saison 2 : la fiche du quartier touché sur la carte, compacte. Une rangée de cases : toucher la n-ième envoie
 * n patrouilles (une voiture par patrouille sur la carte) ; toucher la dernière remplie en retire une.
 */
export function ficheQuartierHtml(st, me, k) {
  const mesT = tensionsDe(st, me);
  if (!S.draft || k == null || !(k in mesT)) return '';
  const { pat, prox, prev, cibles, pris } = etatPatrouilles(st, me);
  const c = carteQuartiers(st);
  const t = mesT[k], n = niveauTension(t), a = pat[k] || 0, nom = esc(c.nomDe(Number(k)));
  const libres = Math.max(0, prox - cibles);
  const ap = prev[k], dlt = ap - t, nAp = niveauTension(ap);
  const pc = me.pointChaud && String(me.pointChaud.cell) === String(k) ? me.pointChaud : null;
  const hp = c.capitale[me.uid] === Number(k);
  const nbCases = Math.min(QUARTIERS.seuilDeplacement, Math.max(prox, a, 1));
  const cases = Array.from({ length: nbCases }, (_, j) => {
    const on = j < a, cible = on && j === a - 1 ? j : j + 1, trop = j + 1 >= QUARTIERS.seuilDeplacement;
    return `<button type="button" class="cv-case ${on ? 'on' : ''} ${trop ? 'trop' : ''}" data-action="patrouille-n" data-c="${k}" data-n="${cible}" ${prox && cible <= prox ? '' : 'disabled'}
      aria-label="${cible} patrouille${cible > 1 ? 's' : ''} à ${nom}" aria-pressed="${on}">${on ? VOITURE(22) : ''}</button>`;
  }).join('');
  return `<section class="cv-fiche" id="mes-quartiers" aria-label="Quartier choisi" aria-live="polite">
    <div class="cv-fiche-t"><span class="cv-pastille" style="background:${n.couleur}">${Math.round(t)}</span>
      <span class="col grow" style="gap:0;min-width:0"><b class="cv-nom">${nom}${hp ? ' <span class="tiny muted">HP</span>' : ''}${pc ? ' 🔥' : ''}</b>
        <span class="tiny muted">${n.nom} · ce soir <b class="${dlt <= -4 ? 'good' : dlt >= 4 ? 'bad' : ''}">${dlt <= -4 ? '↓' : dlt >= 4 ? '↑' : '→'} ${Math.round(ap)}</b></span></span></div>
    <div class="cv-meter" aria-hidden="true"><span style="width:${Math.round(t)}%;background:${n.couleur}"></span><i style="left:${Math.round(ap)}%;border-color:${nAp.couleur}"></i></div>
    ${pc ? `<p class="tiny" style="margin:0;color:${a >= QUARTIERS.agentsDesamorcer ? 'var(--green, #3DD39A)' : 'var(--red-soft)'}"><b>Point chaud</b> · ${esc(pc.titre)} · ${a >= QUARTIERS.agentsDesamorcer ? 'désamorcé à 20:00' : `${QUARTIERS.agentsDesamorcer} patrouilles pour le désamorcer`}</p>` : ''}
    <div class="cv-fiche-p"><span class="small" style="font-weight:600">Patrouilles</span><span class="cv-cases" role="group" aria-label="Patrouilles à ${nom}">${cases}</span></div>
    <span class="tiny muted">${prox ? `Proximité : ${cibles}/${prox} envoyé${cibles > 1 ? 's' : ''}${libres ? ` · ${libres} patrouille${libres > 1 ? 'nt' : ''} partout` : ''}` : '<a href="#ordres">Aucun agent en Proximité : règle-le dans tes ordres</a>'}${pris ? ` · ${pris} pris par l’opération` : ''}${a >= QUARTIERS.seuilDeplacement ? ' · <span class="bad">trop de monde ici, la délinquance ira chez les voisins</span>' : ''}</span>
  </section>`;
}

/** Saison 2 : mes quartiers en liste compacte (tension, ce soir, patrouilles), un toucher pour les choisir. */
export function chipsQuartiersHtml(st, me, sel) {
  const mesT = tensionsDe(st, me);
  if (!Object.keys(mesT).length || !S.draft) return '';
  const { pat, prev } = etatPatrouilles(st, me);
  const c = carteQuartiers(st);
  const pc = me.pointChaud ? String(me.pointChaud.cell) : null;
  return `<section class="cv-liste" aria-label="Mes quartiers"><h2 class="section" style="margin:0 0 4px">Mes quartiers</h2>${Object.keys(mesT).sort((x, y) => mesT[y] - mesT[x]).map((k) => {
    const t = mesT[k], n = niveauTension(t), dlt = prev[k] - t;
    return `<button type="button" class="cv-ql" data-action="quartier" data-c="${k}" aria-pressed="${String(sel) === k}">
      <span class="cv-ql-d" style="background:${n.couleur}"></span><span class="cv-ql-n">${esc(c.nomDe(Number(k)))}${pc === k ? ' 🔥' : ''}</span>
      <span class="cv-ql-p">${pat[k] ? `${VOITURE(16)}<b>${pat[k]}</b>` : ''}</span>
      <span class="cv-ql-t"><b>${Math.round(t)}</b> <span class="${dlt <= -4 ? 'good' : dlt >= 4 ? 'bad' : 'muted'}">${dlt <= -4 ? '↓' : dlt >= 4 ? '↑' : '→'}${Math.round(prev[k])}</span></span></button>`;
  }).join('')}</section>`;
}


/** Le site sensible de ma zone, replié. */
export function siteHtml(monSite) {
  if (!monSite) return '';
  return `<details class="card repli" data-k="site" ${S.ouverts && S.ouverts.site ? 'open' : ''}><summary><span class="row grow" style="gap:8px">${iconeSite(monSite.id, monSite.couleur, 22)}<span class="col" style="gap:0"><span style="font-weight:600">Ton site sensible</span><span class="tiny muted">${esc(monSite.nom)} · ${esc(monSite.type)}</span></span></span>${icon('chevron', 16)}</summary>

      <p class="small muted" style="margin:0">Il peut provoquer des imprévus dans ta zone (environ un jour sur quatre), et plus rarement une opération d’envergure :</p>
      <ul class="aide-liste">${monSite.evenements.map((e) => `<li>${esc(e.titre)} <span class="muted">· ${esc(e.texte)}</span></li>`).join('')}<li><strong>${esc(monSite.operation.titre)}</strong> <span class="muted">· opération d’envergure</span></li></ul>
    </details>`;
}


