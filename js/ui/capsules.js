// Ordres, Affectation « La colonne » : chaque service est une capsule, façon Fallout Shelter mais sans bâtiment autour,
// et les capsules sont reliées par un ascenseur où attendent les agents libres.
// Les agents affectés y sont rangés à leur place (on les compte d'un coup d'œil) ; un sur trois flâne autour.
// Animation économe (mesurée : la carte prenait ~95 % du processeur d'un téléphone lent) : pas de boucle image par image,
// pas de minuterie. La flânerie est une animation CSS (transform, gérée par la carte graphique) dont le délai négatif
// est calculé à l'heure du rendu : elle reprend au même point après un rerendu au lieu de repartir de zéro.
// Ici, seulement ce qui se passe entre deux rendus : quand un agent arrive ou part, les autres glissent vers leur
// nouvelle place (une transition, une fois) au lieu de sauter. Rien hors de l'écran, rien avec « réduire les animations ».

const places = new Map();
const suivis = new WeakSet();
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
/** Glisse un élément depuis son ancienne position (dx, dy) jusqu'à la nouvelle. */
function glisserDepuis(el, dx, dy, duree) {
  el.style.transition = 'none'; el.style.transform = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px)`;
  el.getBoundingClientRect();
  el.style.transition = `transform ${duree}s cubic-bezier(.4,0,.2,1)`; el.style.transform = '';
}
/** À appeler après un rendu qui contient des capsules : les figurines déplacées glissent jusqu'à leur place. */
export function lancerCapsules() {
  if (typeof document === 'undefined') return;
  const vues = new Set();
  for (const el of document.querySelectorAll('.cap-ag[data-k]')) {
    const k = el.dataset.k; vues.add(k);
    const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect(), x = r.left - p.left;
    if (!suivis.has(el)) {
      suivis.add(el);
      const avant = places.get(k);
      if (avant != null && Math.abs(avant - x) > 1 && !calme() && r.bottom > 0 && r.top < innerHeight) glisserDepuis(el, avant - x, 0, 0.5);
    }
    places.set(k, x);
  }
  for (const k of places.keys()) if (!vues.has(k)) places.delete(k);
}

// ───── La colonne : cabine d'ascenseur, pause hors écran, glisser-déposer, feuille du bas ─────
let cabineY = null;
let obs = null;
let arreterClic = 0;
/** Un toucher programmé sur une action (même chemin que les boutons : un seul écouteur dans app.js). */
function agir(action, s) {
  const b = document.createElement('button');
  b.type = 'button'; b.hidden = true; b.dataset.action = action; b.dataset.s = s;
  document.body.appendChild(b); b.click(); b.remove();
}
function glisser(cab) {
  let d = null;
  cab.addEventListener('pointerdown', (e) => { if (cab.disabled) return; d = { x: e.clientX, y: e.clientY, on: false }; try { cab.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } });
  cab.addEventListener('pointermove', (e) => {
    if (!d) return;
    if (!d.on && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) {
      d.on = true;
      const img = cab.querySelector('img');
      d.g = document.createElement('img'); d.g.className = 'col-fantome'; d.g.src = img ? img.src : ''; d.g.alt = '';
      document.body.appendChild(d.g);
    }
    if (!d.on) return;
    e.preventDefault();
    d.g.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 44}px)`;
    const sous = document.elementFromPoint(e.clientX, e.clientY);
    const et = sous && sous.closest('.col-etage');
    for (const x of document.querySelectorAll('.col-etage.cible')) if (x !== et) x.classList.remove('cible');
    if (et) et.classList.add('cible');
    d.cible = et;
  });
  const fin = () => {
    if (!d) return;
    const g = d;
    d = null;
    if (!g.on) return;
    g.g.remove();
    for (const x of document.querySelectorAll('.col-etage.cible')) x.classList.remove('cible');
    arreterClic = Date.now();
    if (g.cible) agir('alloc-libre', g.cible.dataset.s);
  };
  cab.addEventListener('pointerup', fin);
  cab.addEventListener('pointercancel', () => { if (d && d.g) d.g.remove(); d = null; });
}
function tirerFeuille(p) {
  let y0 = null;
  const f = p.closest('.col-feuille');
  p.addEventListener('pointerdown', (e) => { y0 = e.clientY; f.style.transition = 'none'; });
  p.addEventListener('pointermove', (e) => { if (y0 != null) f.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  const fin = (e) => {
    if (y0 == null) return;
    const dy = e.clientY - y0; y0 = null; f.style.transition = ''; f.style.transform = '';
    if (dy > 80) { arreterClic = Date.now(); agir('col-fermer', ''); }
  };
  p.addEventListener('pointerup', fin); p.addEventListener('pointercancel', fin);
}
let pret = false;
function preparer() {
  if (pret) return;
  pret = true;
  // Après un glisser, le navigateur envoie aussi un « clic » : on l'ignore.
  document.addEventListener('click', (e) => { if (Date.now() - arreterClic < 450 && e.target.closest('.col-cabine, .col-poignee')) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.col-feuille')) agir('col-fermer', ''); });
  if (typeof IntersectionObserver === 'function') obs = new IntersectionObserver((l) => { for (const x of l) x.target.classList.toggle('pause', !x.isIntersecting); }, { rootMargin: '40px' });
}
/** À appeler après chaque rendu de la colonne. */
export function lancerColonne() {
  if (typeof document === 'undefined') return;
  preparer();
  lancerCapsules();
  const col = document.getElementById('colonne');
  if (!col) { cabineY = null; return; }
  if (obs) for (const x of col.querySelectorAll('.col-etage')) { if (!suivis.has(x)) { suivis.add(x); obs.observe(x); } }
  if (obs && !suivis.has(col)) { suivis.add(col); obs.observe(col); }
  const cab = col.querySelector('.col-cabine');
  if (cab && !suivis.has(cab)) {
    suivis.add(cab);
    if (!cab.disabled) glisser(cab);
    // La cabine descend (ou monte) jusqu'à l'étage conseillé au lieu d'y apparaître.
    const y = cab.getBoundingClientRect().top - col.getBoundingClientRect().top;
    if (cabineY != null && Math.abs(cabineY - y) > 2 && !calme()) for (const el of [cab, cab.nextElementSibling]) if (el) glisserDepuis(el, 0, cabineY - y, 0.6);
    cabineY = y;
  }
  const p = document.querySelector('.col-poignee');
  if (p && !suivis.has(p)) { suivis.add(p); tirerFeuille(p); }
}
