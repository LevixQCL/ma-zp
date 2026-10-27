// L'adjoint, côté écran : son portrait et le journal des jours où il a tenu la zone.
import { S, esc, fmt1 } from './common.js';
import { CONSIGNES, IDS_CONSIGNES } from '../engine/adjoint.js';

/** Portrait de l'adjoint (image du jeu de portraits). */
export function portraitAdjoint(a, taille = 40) {
  return `<span class="chef-portrait adj" style="--t:${taille}px;--zc:var(--line)"><img src="img/chefs/${esc(a.portrait)}.webp" alt="" width="${taille}" height="${taille}" loading="lazy"></span>`;
}

/** « Pendant ton absence » ou « Bon retour » : le journal de l'adjoint. */
export function absenceHtml(z) {
  if (!z || !z.adjoint || !S.state) return '';
  const a = z.adjoint, T = S.state.turn;
  const rc = z.retourAbsence && z.retourAbsence.tour === T - 1 ? z.retourAbsence : null;
  const journal = rc ? rc.journal : (z.toursSansOrdres >= 1 ? a.journal || [] : []);
  if (!journal.length) return '';
  const lignes = journal.slice(-5).map((j) => `<tr><td>J${j.t}</td><td><b>${fmt1(j.ipz)}</b></td><td>${esc(j.inc)}</td><td>${j.moral}</td><td>${j.sat}</td></tr>`).join('');
  const tete = rc
    ? `<span class="kicker" style="color:var(--green)">Bon retour</span><span class="small">${esc(a.prenom)} te rend les clés après ${rc.jours} jours. Voici comment la zone a tenu.</span>`
    : `<span class="kicker">Pendant ton absence</span><span class="small">${esc(a.prenom)} ${esc(a.nom)} tient la zone depuis ${z.toursSansOrdres} jour${z.toursSansOrdres > 1 ? 's' : ''} (consigne « ${esc(CONSIGNES[a.consigne || 'equilibre'].nom.toLowerCase())} »).</span>`;
  return `<section class="card adj-carte" aria-label="Ton adjoint">
    <div class="row" style="gap:10px;align-items:flex-start">${portraitAdjoint(a, 44)}<span class="col grow" style="gap:3px;min-width:0">${tete}</span></div>
    <table class="adj-journal"><thead><tr><th>Jour</th><th>IPZ</th><th>Incidents</th><th>Moral</th><th>Satisf.</th></tr></thead><tbody>${lignes}</tbody></table>
  </section>`;
}

/** Choix de la consigne laissée à l'adjoint (profil). */
export function consigneHtml(z) {
  const a = z && z.adjoint;
  if (!a) return '';
  const cur = (S.player && S.player.consigne) || a.consigne || 'equilibre';
  return `<section class="card" aria-label="Ton adjoint">
    <div class="row" style="gap:10px;align-items:center">${portraitAdjoint(a, 40)}<span class="col grow" style="gap:1px;min-width:0"><b>${esc(a.prenom)} ${esc(a.nom)}</b><span class="tiny muted">tient la zone les jours où tu ne donnes pas d’ordres</span></span></div>
    <div class="seg3" role="radiogroup" aria-label="Consigne">${IDS_CONSIGNES.map((k) => `<button type="button" role="radio" aria-checked="${cur === k}" data-action="consigne" data-v="${k}"><span>${CONSIGNES[k].ico} ${esc(CONSIGNES[k].nom)}</span></button>`).join('')}</div>
    <p class="tiny muted" style="margin:0">${esc(CONSIGNES[cur].texte)}.</p>
  </section>`;
}
