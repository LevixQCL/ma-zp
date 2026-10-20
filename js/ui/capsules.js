// Ordres (mode essai) : chaque service est une capsule, façon Fallout Shelter mais sans bâtiment autour.
// Les agents affectés s'y baladent, avec les mêmes repères que les pions :
// gilet manquant, recrue à ½, taser, places à pourvoir, agents « en plus », agents partis en mission.
// Les agents sont les petites figurines des pions (même tenue, même équipement) ; en marche, elles se dandinent.
// Animation : une seule boucle requestAnimationFrame à ~16 images/s, qui ne tourne que si des capsules sont à l'écran
// (et s'arrête onglet caché ou « réduire les animations »). Les positions survivent aux rerendus (clé par agent).

/** Fond illustré (Gemini) disponible pour ces services ; les autres gardent la capsule dessinée en CSS. */
export const FONDS_CAPSULE = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];

const etat = new Map();
let boucle = 0, dernier = 0;
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const hasard = (k) => { let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }; };

function tic(ts) {
  boucle = 0;
  const els = document.querySelectorAll('.cap-ag');
  if (!els.length || document.hidden) { setTimeout(lancerCapsules, 600); return; }
  if (ts - dernier < 60) { boucle = requestAnimationFrame(tic); return; }
  const dt = Math.min(0.2, (ts - dernier) / 1000 || 0.06); dernier = ts;
  const fige = calme();
  for (const el of els) {
    const k = el.dataset.k, L = el.parentElement.clientWidth || 300;
    let s = etat.get(k);
    if (!s) {
      const r = hasard(k), marche = !el.classList.contains('fixe');
      s = { x: L * 0.1 + (el.dataset.x !== undefined && el.dataset.x !== '' ? Number(el.dataset.x) : r() * 0.8) * (L * 0.8 - 30), dir: r() < 0.5 ? -1 : 1, v: 14 + r() * 10, t: r() * 5, pause: marche ? r() * 2 : 1e9, marche, r };
      etat.set(k, s);
    }
    s.t += dt;
    let geste = 'idle';
    if (!fige && s.marche) {
      if (s.pause > 0) { s.pause -= dt; geste = 'idle'; if (s.pause <= 0) { s.dir = s.r() < 0.5 ? -1 : 1; s.trajet = 1.5 + s.r() * 3; } }
      else { geste = 'walk'; s.x += s.dir * s.v * dt; s.trajet -= dt; const g0 = L * 0.1, g1 = L * 0.9 - 30; if (s.x < g0 || s.x > g1) { s.dir *= -1; s.x = Math.max(g0, Math.min(g1, s.x)); } if (s.trajet <= 0) s.pause = 1 + s.r() * 3; }
    }
    el.style.transform = `translateX(${s.x}px)`;
    el.classList.toggle('marche', geste === 'walk');
    el.classList.toggle('gauche', s.dir < 0);
  }
  boucle = requestAnimationFrame(tic);
}
/** À appeler après un rendu qui contient des capsules (sans effet si la boucle tourne déjà). */
export function lancerCapsules() { if (!boucle && typeof requestAnimationFrame === 'function') boucle = requestAnimationFrame(tic); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) lancerCapsules(); });
