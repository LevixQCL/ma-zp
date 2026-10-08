// Énigme « Le cadenas » : un vrai cadenas à molettes. On fait rouler les chiffres
// (glisser, toucher les flèches, molette de la souris ou clavier), puis on tire l'anse.
import { S, esc, questDuSlot } from './common.js';

const H = 46; // hauteur d'un chiffre sur la molette (px), à garder égale à --cad-h dans le CSS

const cle = (q) => q.id || q.answer || 'cadenas';
function valeurs(q, len) {
  S.cadVal = S.cadVal || {};
  const v = S.cadVal[cle(q)];
  return v && v.length === len ? v : (S.cadVal[cle(q)] = Array(len).fill(0));
}

function roue(k, v, inerte) {
  const chiffres = Array.from({ length: 30 }, (_, i) => `<span>${i % 10}</span>`).join('');
  return `<div class="cad-col">
    ${inerte ? '' : `<button type="button" class="cad-pas" data-cad-pas="1" data-k="${k}" aria-label="Molette ${k + 1} : chiffre suivant" tabindex="-1"><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 7l5-5 5 5"/></svg></button>`}
    <div class="cad-roue" ${inerte ? '' : `role="spinbutton" tabindex="0" aria-label="Molette ${k + 1}" aria-valuemin="0" aria-valuemax="9" aria-valuenow="${v}"`} data-k="${k}">
      <div class="cad-bande" style="transform:translateY(${-(inerte ? 10 + v : 9 + v) * H}px)" data-pos="${10 + v}">${chiffres}</div>
    </div>
    ${inerte ? '' : `<button type="button" class="cad-pas" data-cad-pas="-1" data-k="${k}" aria-label="Molette ${k + 1} : chiffre précédent" tabindex="-1"><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5"/></svg></button>`}
  </div>`;
}

function dessin(chiffres, { etat = '', inerte = false } = {}) {
  return `<div class="cad ${etat}" data-n="${chiffres.length}">
    <svg class="cad-anse" viewBox="0 0 120 92" aria-hidden="true"><defs><linearGradient id="cad-acier" x1="0" x2="1"><stop offset="0" stop-color="#7C88A8"/><stop offset=".35" stop-color="#E9EEF8"/><stop offset=".6" stop-color="#9AA6C4"/><stop offset="1" stop-color="#596482"/></linearGradient></defs>
      <path d="M22 92V48a38 38 0 0 1 76 0v44" fill="none" stroke="url(#cad-acier)" stroke-width="15" stroke-linecap="butt"/></svg>
    <div class="cad-corps">
      <span class="cad-vis" aria-hidden="true"></span><span class="cad-vis d" aria-hidden="true"></span>
      <div class="cad-fenetre">${chiffres.map((v, k) => roue(k, v, inerte)).join('')}</div>
      <span class="cad-marque" aria-hidden="true">DELTA · ${chiffres.length} MOLETTES</span>
    </div>
  </div>`;
}

/** Le cadenas à manipuler, avec le bouton pour tenter l'ouverture. */
export function cadenasHtml(q) {
  const len = String(q.answer).length;
  const v = valeurs(q, len);
  return `<form data-form="quest-text" class="cad-form" aria-label="Cadenas à molettes">
    ${dessin(v)}
    <input type="hidden" name="reponse" value="${v.join('')}">
    <p class="tiny muted cad-aide">Fais rouler chaque molette du doigt (ou touche les flèches), puis tire l’anse.</p>
    <button class="btn primary block" type="submit">Tirer l’anse</button>
  </form>`;
}

/** Le cadenas après la réponse : ouvert sur le bon code, ou resté fermé sur l'essai du joueur. */
export function cadenasResultat(q, r) {
  const ok = r.statut === 'ok';
  const code = String(ok ? q.answer : (r.reponse || '')).replace(/\D/g, '').padEnd(String(q.answer).length, '0').slice(0, String(q.answer).length);
  return `<div class="cad-form fini" aria-hidden="true">${dessin(code.split('').map(Number), { etat: ok ? 'ouvert' : 'bloque', inerte: true })}</div>`;
}

// ───── Interactions (installées une fois, par délégation) ─────

function regler(roueEl, pos, anime = true) {
  const bande = roueEl.querySelector('.cad-bande');
  bande.style.transition = anime ? '' : 'none';
  bande.style.transform = `translateY(${-(pos - 1) * H}px)`;
  bande.dataset.pos = pos;
  const v = ((pos % 10) + 10) % 10;
  roueEl.setAttribute('aria-valuenow', v);
  const form = roueEl.closest('form');
  const q = S.questMode === 'train' ? S.train : S.questIdx === 3 ? S.noir : questDuSlot(S.questIdx || 0);
  const vals = [...form.querySelectorAll('.cad-roue')].map((x) => Number(x.getAttribute('aria-valuenow')));
  form.reponse.value = vals.join('');
  if (q) { S.cadVal = S.cadVal || {}; S.cadVal[cle(q)] = vals; }
}
function pas(roueEl, d) {
  const pos = Number(roueEl.querySelector('.cad-bande').dataset.pos) + d;
  regler(roueEl, pos);
  try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) { /* pas de vibreur */ }
}
// Après l'animation, on recentre la bande sur sa 2e série de chiffres, sans que ça se voie.
function recentrer(roueEl) {
  const pos = Number(roueEl.querySelector('.cad-bande').dataset.pos);
  if (pos < 10 || pos > 19) regler(roueEl, ((pos % 10) + 10) % 10 + 10, false);
}

let installe = false;
export function installerCadenas() {
  if (installe) return; installe = true;
  let drag = null;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cad-pas]');
    if (!b) return;
    const roueEl = b.closest('.cad-col').querySelector('.cad-roue');
    pas(roueEl, Number(b.dataset.cadPas));
  });
  document.addEventListener('transitionend', (e) => { if (e.target.classList && e.target.classList.contains('cad-bande')) recentrer(e.target.parentElement); });
  document.addEventListener('pointerdown', (e) => {
    const roueEl = e.target.closest('.cad-roue[role="spinbutton"]');
    if (!roueEl) return;
    const bande = roueEl.querySelector('.cad-bande');
    drag = { roueEl, y: e.clientY, pos: Number(bande.dataset.pos), id: e.pointerId, bouge: false };
    roueEl.setPointerCapture(e.pointerId);
    bande.style.transition = 'none';
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 4) drag.bouge = true;
    drag.roueEl.querySelector('.cad-bande').style.transform = `translateY(${-(drag.pos - 1) * H + dy}px)`;
    const cran = Math.round(-dy / H);
    if (cran !== drag.cran) { if (drag.cran !== undefined) { try { if (navigator.vibrate) navigator.vibrate(4); } catch (er) { /* rien */ } } drag.cran = cran; }
  });
  const fin = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    const { roueEl } = drag;
    // Un simple toucher sur le chiffre du haut ou du bas l'amène au centre.
    if (!drag.bouge) { const r = roueEl.getBoundingClientRect(), y = e.clientY - r.top; if (y < r.height / 3) pas(roueEl, -1); else if (y > (2 * r.height) / 3) pas(roueEl, 1); }
    else regler(roueEl, drag.pos + Math.round(-dy / H));
    drag = null;
  };
  document.addEventListener('pointerup', fin);
  document.addEventListener('pointercancel', fin);
  document.addEventListener('wheel', (e) => {
    const roueEl = e.target.closest('.cad-roue[role="spinbutton"]');
    if (!roueEl) return;
    e.preventDefault();
    pas(roueEl, e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    const roueEl = e.target.closest && e.target.closest('.cad-roue[role="spinbutton"]');
    if (!roueEl) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); pas(roueEl, 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pas(roueEl, -1); }
    else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const cur = Number(roueEl.querySelector('.cad-bande').dataset.pos);
      regler(roueEl, cur - (((cur % 10) + 10) % 10) + Number(e.key));
      const suiv = roueEl.closest('.cad-col').nextElementSibling;
      if (suiv) suiv.querySelector('.cad-roue').focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const col = roueEl.closest('.cad-col')[e.key === 'ArrowRight' ? 'nextElementSibling' : 'previousElementSibling'];
      if (col) { e.preventDefault(); col.querySelector('.cad-roue').focus(); }
    }
  });
}

/** Les essais notés par le suspect : chiffres en petites molettes, et pastilles bien placé / mal placé. */
export function essaisHtml(q) {
  return `<section class="col cad-essais" aria-label="Essais notés">${q.elements.map((el) => {
    const b = Number((el.texte.match(/(\d) bons? chiffres? bien/) || [])[1] || 0);
    const m = Number((el.texte.match(/(\d) bons? chiffres? mal/) || [])[1] || 0);
    const pastilles = `${'<i class="b"></i>'.repeat(b)}${'<i class="m"></i>'.repeat(m)}${b + m ? '' : '<i class="z"></i>'}`;
    return `<div class="cad-essai"><span class="cad-mini" aria-label="Essai ${esc(el.label.replace(/ /g, ''))}">${el.label.split(' ').map((c) => `<b>${esc(c)}</b>`).join('')}</span>
      <span class="col grow" style="gap:3px"><span class="cad-past" aria-hidden="true">${pastilles}</span><span class="small">${esc(el.texte)}</span></span></div>`;
  }).join('')}</section>`;
}
