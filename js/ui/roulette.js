// Roulette « Early bird » : une fois, à la première connexion après la mise à jour des skins,
// chaque zone déjà présente gagne un skin au hasard parmi les 12 (et il est équipé tout de suite).
import { S, esc, myZone } from './common.js';
import { TOUS_SKINS, SKINS, tirerSkin, skinDe, earlyBirdEligible } from '../engine/decor.js';
import { ouvrirPanneau, sceneZone, monDecorPublic } from './logistique.js';

const COURT = { friterie: 'Friterie', chateau: 'Fort Delta', orbitale: 'Orbitale', chalet: 'Chalet', gateau: 'Gâteau', hangar: 'Dirigeable', grange: 'Grange', retro: 'Rétro 80', lavage: 'Car-wash', conteneurs: 'Conteneurs', roulotte: 'Roulotte', serre: 'Serre' };
const TEINTE = { batiment: ['#FFB23F', '#C98F1E'], garage: ['#63B0FF', '#2F6FB5'], aile: ['#3DD39A', '#2F8F5E'] };
const N = TOUS_SKINS.length, SEG = 360 / N;

/** La roulette doit-elle s'afficher ? (appelée après l'affichage de l'HP) */
export function rouletteAuBesoin() {
  const z = myZone();
  if (!z || !S.player || S.player.earlyBird || S.roulettePropose) return false;
  if (!earlyBirdEligible(z, S.state) || document.querySelector('.aide-wrap')) return false;
  S.roulettePropose = true;
  setTimeout(ouvrirRoulette, 400);
  return true;
}

function roueSvg() {
  const R = 120, c = 130;
  const pt = (a, r) => [c + r * Math.sin((a * Math.PI) / 180), c - r * Math.cos((a * Math.PI) / 180)];
  const parts = TOUS_SKINS.map((sk, i) => {
    const a0 = i * SEG, a1 = a0 + SEG, [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), mid = a0 + SEG / 2;
    const col = TEINTE[sk.cat][i % 2];
    const [tx, ty] = pt(mid, R * 0.62);
    return `<path d="M${c} ${c} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${col}" stroke="#0C1124" stroke-width="1.5"/>
      <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${(mid - 90).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="13" fill="#0C1124">${esc(COURT[sk.id] || sk.nom)}</text>`;
  }).join('');
  return `<div class="roue-wrap"><svg viewBox="0 0 260 260" class="roue-svg" aria-hidden="true"><g id="roue-g">${parts}<circle cx="${c}" cy="${c}" r="16" fill="#141D28" stroke="#FFB23F" stroke-width="2"/></g></svg>
    <svg viewBox="0 0 30 26" class="roue-fleche" aria-hidden="true"><path d="M15 26 L2 2 H28 Z" fill="#EDF0FA" stroke="#0C1124" stroke-width="2"/></svg></div>`;
}

export function ouvrirRoulette() {
  ouvrirPanneau(`<div class="col roulette" style="gap:12px">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">Cadeau des premiers joueurs</span><h2 id="aide-titre" class="aide-titre" style="margin:0">Early bird</h2></div>
      <button class="iconbtn" data-close aria-label="Plus tard" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <p class="small" style="margin:0">Merci d’être là depuis le début. Lance la roulette pour gagner un skin exclusif pour ton commissariat : un hôtel de police, un garage ou une aile d’annexes hors du commun. Personne d’autre ne pourra plus l’obtenir.</p>
    ${roueSvg()}
    <div id="roulette-res" aria-live="polite"></div>
    <button type="button" class="btn primary block" data-action="roulette-lancer">Lancer la roulette</button>
    <div class="row tiny muted" style="gap:10px;justify-content:center"><span><i class="leg" style="background:#FFB23F"></i>Hôtel de police</span><span><i class="leg" style="background:#63B0FF"></i>Garage</span><span><i class="leg" style="background:#3DD39A"></i>Aile des annexes</span></div>
  </div>`);
}

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
  const sansAile = sk.cat === 'aile' && !['sport', 'tir', 'audition', 'logiciel', 'antenne'].some((k) => z && z.infra && z.infra[k]);
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
    <span class="tiny muted">Déjà équipé. Tu peux l’enlever ou le remettre quand tu veux dans « Personnaliser mon commissariat ». Les autres le verront à partir de 20:00.</span>
    <button type="button" class="btn primary block" data-close>Voir mon commissariat</button></div>`;
  document.querySelector('.roue-wrap')?.classList.add('fini');
}
