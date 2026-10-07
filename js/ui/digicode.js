// Énigme « Le digicode » (forme du cadenas) : un vrai clavier de digicode, avec les touches
// usées révélées par la poudre. On tape le code, on valide avec la touche verte.
import { S, esc } from './common.js';

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];

function saisie(q) {
  S.digi = S.digi || {};
  return S.digi[q.id] || '';
}

function clavier(q, { saisi = '', etat = '', inerte = false } = {}) {
  const len = String(q.answer).length;
  const uses = new Set((q.clavier || []).map(String));
  const ecran = Array.from({ length: len }, (_, k) => `<span class="dg-c${saisi[k] ? ' plein' : ''}">${esc(saisi[k] || '')}</span>`).join('');
  return `<div class="dg ${etat}" data-q="${esc(q.id || '')}" data-len="${len}">
    <div class="dg-tete"><span class="dg-led" aria-hidden="true"></span><div class="dg-ecran" aria-live="polite" aria-label="Code tapé">${ecran}</div></div>
    <div class="dg-touches">${TOUCHES.map((t) => {
      const cls = t === 'OK' ? 'ok' : t === 'C' ? 'eff' : uses.has(t) ? 'use' : '';
      const action = t === 'OK' ? 'type="submit"' : `type="button" data-dg="${t}"`;
      return `<button ${action} class="dg-t ${cls}" ${inerte ? 'disabled' : ''} aria-label="${t === 'C' ? 'Effacer' : t === 'OK' ? 'Valider le code' : `Touche ${t}${uses.has(t) ? ' (usée)' : ''}`}">${t === 'OK' ? '✓' : t}${uses.has(t) ? '<i aria-hidden="true"></i>' : ''}</button>`;
    }).join('')}</div>
  </div>`;
}

/** Le clavier à taper. */
export function digicodeHtml(q) {
  const v = saisie(q);
  return `<form data-form="quest-text" class="dg-form" aria-label="Digicode">
    ${clavier(q, { saisi: v })}
    <input type="hidden" name="reponse" value="${esc(v)}">
    <p class="tiny muted" style="margin:0;text-align:center">Les touches marquées de poudre sont celles du code. Tape-le, puis la touche verte.</p>
  </form>`;
}

/** Après la réponse : la LED passe au vert, ou reste rouge sur le code essayé. */
export function digicodeResultat(q, r) {
  const ok = r.statut === 'ok';
  const code = String(ok ? q.answer : (r.reponse || '')).replace(/\D/g, '').slice(0, String(q.answer).length);
  return `<div class="dg-form fini" aria-hidden="true">${clavier(q, { saisi: code, etat: ok ? 'ouvert' : 'refuse', inerte: true })}</div>`;
}

/** Touche pressée (appelé par le gestionnaire de clics des énigmes). */
export function digicodeTouche(btn) {
  const dg = btn.closest('.dg'), form = btn.closest('form');
  if (!dg || !form) return;
  const id = dg.dataset.q, len = Number(dg.dataset.len);
  S.digi = S.digi || {};
  let v = S.digi[id] || '';
  const t = btn.dataset.dg;
  if (t === 'C') v = ''; else if (v.length < len) v += t;
  S.digi[id] = v;
  form.reponse.value = v;
  dg.querySelectorAll('.dg-c').forEach((c, k) => { c.textContent = v[k] || ''; c.classList.toggle('plein', !!v[k]); });
  btn.classList.remove('appui'); void btn.offsetWidth; btn.classList.add('appui');
  try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) { /* rien */ }
}
