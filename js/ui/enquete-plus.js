// Outils d'enquête des affaires écrites à la main qui les prévoient (« Le notaire de la Rampe ») :
// recoupement de deux pièces, hypothèse soumise au juge, coups de pouce par jour, relectures d'indices,
// et le vrai mobile nommé pendant la confrontation. Tout part avec les ordres de 20:00, sauf les coups de pouce
// (lus sur l'appareil, gardés dans le carnet) et les relectures (affichées dès que la pièce qui éclaire est au dossier).
import { S, esc } from './common.js';
import { titrePiece, opposables, pieceRecoupement, RECOUP } from '../engine/enquete.js';
import { lireCarnet, ecrireCarnet } from './enquete.js';

const nom = (aff, f) => (f === 'doc:journal' ? 'Le journal du lendemain' : f === 'doc:pvc' ? 'PV de premières constatations' : titrePiece(aff, f));

/** Relectures d'une pièce : ce qu'une autre pièce du dossier y fait voir. */
export function relectures(aff, f, connus) {
  return ((aff.relectures && aff.relectures[f]) || []).filter((r) => connus.has(r.si));
}
export function relecturesHtml(aff, f, connus, { petit = false } = {}) {
  const l = relectures(aff, f, connus);
  if (!l.length) return '';
  return l.map((r) => (petit
    ? `<p class="tb-relu">↻ ${esc(r.t)}</p>`
    : `<p class="small tb-relu-g"><span class="tb-ligne-k" style="color:var(--blue-soft)">Relu avec « ${esc(nom(aff, r.si))} »</span><br>${esc(r.t)}</p>`)).join('');
}

/** Bouton « recouper » sous une pièce, et raccourcis vers les pièces qui lui sont reliées par une ficelle. */
export function recoupBoutons(aff, dos, f, liens = []) {
  if (!aff.recoupements || !opposables(aff, dos).has(f)) return '';
  const d = S.draft;
  const prevu = d.recoup && d.recoup.includes(f);
  const relies = [...new Set(liens.filter(([a, b]) => a === f || b === f).map(([a, b]) => (a === f ? b : a)))].filter((x) => opposables(aff, dos).has(x) && x !== f);
  return `<div class="tb-recoup">
    <button type="button" class="btn small ${prevu ? 'primary' : 'outline'}" data-action="tab-ouvrir" data-tid="rec|${esc(f)}">${prevu ? `✓ Recoupement prévu ce soir` : `🔗 Recouper avec une autre pièce (${RECOUP.cout} k€)`}</button>
    ${relies.length && !prevu ? `<span class="tiny muted">Reliée par une ficelle à : ${relies.map((x) => `<button type="button" class="tb-lien" data-action="recoup-piece" data-a="${esc(f)}" data-b="${esc(x)}">${esc(nom(aff, x))}</button>`).join(' · ')}</span>` : ''}
  </div>`;
}

/** Volet du recoupement : la pièce de départ, puis la seconde à lui opposer. */
export function voletRecoup(aff, dos, f) {
  const d = S.draft;
  const op = [...opposables(aff, dos)].filter((x) => x !== f);
  const deja = new Set((dos.recoups || []).map((r) => (Array.isArray(r) ? r.join('|') : r)));
  const ligne = (x) => {
    const on = d.recoup && d.recoup.includes(f) && d.recoup.includes(x);
    const fait = deja.has([f, x].sort().join('|'));
    return `<button type="button" class="tb-trajet-l ${on ? 'on' : ''}" style="--c:var(--blue-soft)" data-action="recoup-piece" data-a="${esc(f)}" data-b="${esc(x)}" aria-pressed="${on}" ${fait ? 'disabled' : ''}><span>${esc(nom(aff, x))}</span><strong>${on ? '✓' : fait ? 'déjà fait' : ''}</strong></button>`;
  };
  return `<span class="tb-ligne-k" style="color:var(--blue-soft)">Recoupement · ${RECOUP.cout} k€ · un par soir</span><span class="tb-titre">${esc(nom(aff, f))}</span>
    <p class="small muted" style="margin:0">Choisis la pièce à mettre en face. Tes enquêteurs comparent les deux et vérifient ce qui les relie : certaines paires apprennent du neuf, la plupart rien. « Rien de neuf » ne prouve rien. Résultat ce soir à 20:00.</p>
    ${op.map(ligne).join('')}
    ${d.recoup ? '<button type="button" class="btn small ghost" data-action="recoup-annuler">Annuler le recoupement</button>' : ''}`;
}

/** Volet de l'hypothèse soumise au juge : qui, et quand. Le juge répond ce soir, à partir du dossier. */
export function voletHypo(aff, dos) {
  const d = S.draft, h = d.hypo || {};
  const hist = (dos.hypos || []).slice().reverse();
  return `<span class="tb-ligne-k" style="color:var(--amber)">Le juge d’instruction · une hypothèse par soir · gratuit</span><span class="tb-titre">Ton hypothèse</span>
    <p class="small muted" style="margin:0">Le juge ne te dira jamais si tu as raison. Il compare ton hypothèse à ton dossier : les pièces qui l’appuient, et celles qui la contredisent. Une pièce qui contredit la bonne hypothèse est une pièce que tu n’as pas encore comprise.</p>
    <span class="tb-ligne-k">Qui</span>
    <div class="row" style="gap:6px;flex-wrap:wrap">${aff.suspects.map((s, i) => `<button type="button" class="btn small ${h.i === i ? 'primary' : 'outline'}" data-action="hypo-choix" data-i="${i}" aria-pressed="${h.i === i}">${esc(s.prenom)}</button>`).join('')}</div>
    <span class="tb-ligne-k">Quand le coup a été porté</span>
    <div class="row" style="gap:6px;flex-wrap:wrap">${aff.creneaux.map((c, k) => `<button type="button" class="btn small ${h.s === k ? 'primary' : 'outline'}" data-action="hypo-choix" data-s="${k}" aria-pressed="${h.s === k}">${esc(c)}</button>`).join('')}</div>
    ${Number.isInteger(h.i) && Number.isInteger(h.s) ? `<p class="small" style="margin:0;color:var(--amber-soft)">Ce soir, le juge lira : ${esc(aff.suspects[h.i].nom)}, ${esc(aff.creneaux[h.s])}.</p><button type="button" class="btn small ghost" data-action="hypo-annuler">Ne rien soumettre ce soir</button>` : '<p class="tiny muted" style="margin:0">Choisis un suspect et un créneau.</p>'}
    ${hist.length ? `<span class="tb-ligne-k">Réponses du juge</span>${hist.map((x) => `<div class="tb-boite-l"><div class="col grow" style="gap:2px;min-width:0"><span class="small" style="font-weight:600">${esc(aff.suspects[x.i].prenom)}, ${esc(aff.creneaux[x.s])}</span><span class="tiny muted">${x.pour} pièce${x.pour > 1 ? 's' : ''} pour · ${x.contre.length ? `contre : ${x.contre.map((f) => esc(nom(aff, f))).join(', ')}` : 'rien contre'}</span></div></div>`).join('')}` : ''}`;
}

/** Coups de pouce : trois niveaux par fil, débloqués avec les jours ; on les découvre un par un. */
export function voletPouces(aff) {
  const j = S.state.enquete.jour;
  const vus = lireCarnet(aff.n).pouces || {};
  return `<span class="tb-ligne-k" style="color:var(--amber)">Coups de pouce · jour ${j}</span><span class="tb-titre">Le commissaire passe la tête</span>
    <p class="small muted" style="margin:0">Pas la solution : une direction. Un niveau de plus se débloque les jours 2, 4 et 6. Chacun reste caché tant que tu ne le retournes pas.</p>
    ${aff.coupsDePouce.map((c, k) => `<div class="tb-pouce"><span class="tb-ligne-k">${esc(c.fil)}</span>
      ${c.niveaux.map(([jj, t], n) => {
        const cle = `${k}:${n}`;
        if (j < jj) return `<p class="tiny muted" style="margin:0">Niveau ${n + 1} · le jour ${jj}</p>`;
        if (!vus[cle]) return `<button type="button" class="btn small ghost" data-action="pouce-voir" data-k="${cle}">Retourner le niveau ${n + 1}</button>`;
        return `<p class="small" style="margin:0;line-height:1.5"><strong>${n + 1}.</strong> ${esc(t)}</p>`;
      }).join('')}</div>`).join('')}`;
}
export function retournerPouce(aff, cle) {
  const c = lireCarnet(aff.n);
  c.pouces = { ...(c.pouces || {}), [cle]: true };
  ecrireCarnet(aff.n, c);
}

/** Confrontation : le vrai mobile, en bonus. */
export function mobileHtml(aff) {
  if (!aff.mobiles) return '';
  const m = S.draft.mobile;
  return `<span class="tb-ligne-k">Et pourquoi ? · bonus si tu vises juste</span>
    ${aff.mobiles.map((t, k) => `<button type="button" class="tb-trajet-l ${m === k ? 'on' : ''}" style="--c:var(--amber)" data-action="mobile-choix" data-m="${k}" aria-pressed="${m === k}"><span>${esc(t)}</span><strong>${m === k ? '✓' : ''}</strong></button>`).join('')}
    <p class="tiny muted" style="margin:0">Facultatif. Un mauvais mobile ne fait pas échouer les aveux.</p>`;
}

/** Résumé de ce qui part ce soir (volet « Ce soir »). */
export function soirPlusHtml(aff) {
  const d = S.draft;
  const out = [];
  if (d.recoup) out.push(`<div class="tb-boite-l"><span class="small grow" style="font-weight:600">Recoupement · « ${esc(nom(aff, d.recoup[0]))} » × « ${esc(nom(aff, d.recoup[1]))} »</span><button type="button" class="btn small ghost" data-action="recoup-annuler" aria-label="Annuler le recoupement">✕</button></div>`);
  if (d.hypo && Number.isInteger(d.hypo.i) && Number.isInteger(d.hypo.s)) out.push(`<div class="tb-boite-l"><span class="small grow" style="font-weight:600">Hypothèse au juge · ${esc(aff.suspects[d.hypo.i].prenom)}, ${esc(aff.creneaux[d.hypo.s])}</span><button type="button" class="btn small ghost" data-action="hypo-annuler" aria-label="Annuler l’hypothèse">✕</button></div>`);
  return `${out.join('')}<div class="tb-duo"><button type="button" class="btn small outline" data-action="tab-ouvrir" data-tid="hypo">⚖️ Hypothèse au juge</button>${aff.coupsDePouce ? '<button type="button" class="btn small outline" data-action="tab-ouvrir" data-tid="pouce">💡 Coups de pouce</button>' : ''}</div>`;
}
/** Raccourci pour l'action « recouper » : vérifie que les deux pièces sont opposables. */
export function choisirRecoup(aff, dos, a, b) {
  const op = opposables(aff, dos);
  if (!op.has(a) || !op.has(b) || a === b) return false;
  S.draft.recoup = [a, b];
  return true;
}
export { pieceRecoupement };
