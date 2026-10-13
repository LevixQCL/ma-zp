// Roulette « Early bird » : une fois, à la première connexion après la mise à jour des skins,
// chaque zone déjà présente gagne un skin au hasard parmi les 12 (et il est équipé tout de suite).
import { S, esc, myZone } from './common.js';
import { TOUS_SKINS, SKINS, tirerSkin, skinDe } from '../engine/decor.js';
import { sceneZone, monDecorPublic } from './logistique.js';
import { ANNEXES_AILE } from './scene-aile.js';

const N = TOUS_SKINS.length, SEG = 360 / N;




/** Tire le skin, l'enregistre tout de suite (pas de second essai en rechargeant), puis fait tourner la roue. */
export async function lancerRoulette(backend) {
  const z = myZone();
  if (!z || (S.player && S.player.earlyBird)) return;
  const bouton = document.querySelector('[data-action="roulette-lancer"]');
  if (bouton) { bouton.disabled = true; bouton.textContent = 'La roue tourne…'; }
  const cle = tirerSkin();
  const sk = skinDe(cle);
  S.player = { ...(S.player || {}), earlyBird: { skin: cle, at: Date.now() }, skinsChoix: { ...((S.player && S.player.skinsChoix) || z.skinsChoix || {}), [sk.cat]: sk.id } };
  try { await backend.savePlayer(S.user.uid, S.player); } catch (e) { console.warn(e); }
  const i = TOUS_SKINS.findIndex((x) => `${x.cat}:${x.id}` === cle);
  const angle = 360 * 6 + (360 - (i * SEG + SEG / 2)) + (Math.random() - 0.5) * SEG * 0.6;
  const g = document.getElementById('roue-g');
  const reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (g) { g.style.transition = reduit ? 'none' : 'transform 4.2s cubic-bezier(.15,.85,.2,1)'; g.style.transformOrigin = '130px 130px'; requestAnimationFrame(() => { g.style.transform = `rotate(${angle}deg)`; }); }
  setTimeout(() => afficherGain(sk), reduit ? 100 : 4400);
}

function afficherGain(sk) {
  const z = myZone(), o = SKINS[sk.cat].options[sk.id];
  const sansAile = sk.cat === 'aile' && !ANNEXES_AILE.some((k) => z && z.infra && z.infra[k]);
  const res = document.getElementById('roulette-res');
  const bouton = document.querySelector('[data-action="roulette-lancer"]');
  if (bouton) bouton.remove();
  if (!res || !z) return;
  res.innerHTML = `<div class="card amber" style="gap:8px;padding:12px">
    <span class="kicker">Tu gagnes · ${esc(SKINS[sk.cat].titre)}</span>
    <span style="font:700 24px var(--display)">${esc(o.nom)}</span>
    <span class="small" style="color:var(--amber-soft)">${esc(o.texte)}</span>
    <div class="scene-voisin">${sceneZone(sansAile ? { ...z, infra: { ...(z.infra || {}), sport: true } } : z, S.state, monDecorPublic(z), { [sk.cat]: sk.id })}</div>
    ${sansAile ? '<span class="tiny" style="color:var(--amber-soft)">L’aile des annexes apparaît avec ta première annexe (salle de sport, stand de tir, salle d’audition, logiciel ou antenne de quartier). Aperçu ci-dessus avec une salle de sport.</span>' : ''}
    <span class="tiny muted">Déjà équipé. Tu peux l’enlever ou le remettre quand tu veux dans « Personnaliser mon hôtel de police ». Les autres le verront à partir de 20:00.</span>
    <button type="button" class="btn primary block" data-close>Voir mon hôtel de police</button></div>`;
  document.querySelector('.roue-wrap')?.classList.add('fini');
}
