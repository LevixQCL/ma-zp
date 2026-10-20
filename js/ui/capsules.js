// Ordres (mode essai) : chaque service est une capsule, façon Fallout Shelter mais sans bâtiment autour.
// Les agents affectés s'y baladent, avec les mêmes repères que les pions :
// gilet manquant, recrue à ½, taser, places à pourvoir, agents « en plus », agents partis en mission.
// Les agents sont les petites figurines des pions (même tenue, même équipement) ; en marche, elles se dandinent.
// Animation économe (mesurée : la carte prenait ~95 % du processeur d'un téléphone lent) : pas de boucle image par image.
// Chaque agent reçoit de temps en temps une destination, et c'est le navigateur qui fait glisser la figurine
// (transition CSS sur transform, gérée par la carte graphique). Rien ne bouge hors de l'écran, onglet caché
// ou avec « réduire les animations ». Les positions survivent aux rerendus (clé par agent).

/** Fond illustré (Gemini) disponible pour ces services ; les autres gardent la capsule dessinée en CSS. */
export const FONDS_CAPSULE = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];

const etat = new Map();
const suivis = new WeakSet();
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const hasard = (k) => { let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }; };
const visible = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

function placer(el, s, duree) {
  el.style.transition = duree ? `transform ${duree.toFixed(2)}s linear` : 'none';
  el.style.transform = `translateX(${s.x.toFixed(1)}px)`;
}
function pas(el) {
  if (!el.isConnected) return;
  const s = etat.get(el.dataset.k);
  el.classList.remove('marche');
  if (!s.marche || calme()) return;
  if (document.hidden || !visible(el)) { setTimeout(() => pas(el), 2500); return; }
  const L = el.parentElement.clientWidth || 300, g0 = L * 0.1, g1 = L * 0.9 - 26;
  const cible = g0 + s.r() * (g1 - g0), d = Math.abs(cible - s.x) / s.v;
  el.classList.toggle('gauche', cible < s.x);
  el.classList.add('marche');
  s.x = cible; placer(el, s, d);
  setTimeout(() => { if (!el.isConnected) return; el.classList.remove('marche'); setTimeout(() => pas(el), 1500 + s.r() * 4000); }, d * 1000);
}
/** À appeler après un rendu qui contient des capsules : prend en charge les nouvelles figurines. */
export function lancerCapsules() {
  if (typeof document === 'undefined') return;
  for (const el of document.querySelectorAll('.cap-ag')) {
    if (suivis.has(el)) continue;
    suivis.add(el);
    const k = el.dataset.k, L = el.parentElement.clientWidth || 300;
    let s = etat.get(k);
    if (!s) {
      const r = hasard(k);
      s = { x: L * 0.1 + (el.dataset.x !== undefined && el.dataset.x !== '' ? Number(el.dataset.x) : r() * 0.8) * (L * 0.8 - 26), v: 14 + r() * 10, r, marche: !el.classList.contains('fixe') };
      etat.set(k, s);
    }
    placer(el, s, 0);
    setTimeout(() => pas(el), 400 + s.r() * 2500);
  }
}
