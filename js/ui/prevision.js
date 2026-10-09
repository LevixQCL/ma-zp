import { REGLES } from '../engine/constants.js';
// Prévision en direct de l'IPZ du soir, dans l'écran des ordres.
// Le moteur calcule le tour avec tes ordres du moment (les autres zones en pilote automatique, sans énigmes ni incidents),
// sur un hasard différent de celui de 20:00 : c'est une tendance (une fourchette), pas le résultat exact.
import { S, myZone } from './common.js';
import { resolveTurn } from '../engine/resolve.js';

const ECART = 2; // demi-largeur de la fourchette affichée (points d'IPZ)
let cache = { cle: null, v: null }, minuterie = null, veille = null;

function cleDe() {
  const st = S.state;
  return st && S.draft ? `${st.season}:${st.turn}:${JSON.stringify(S.draft)}` : null;
}

function calculer() {
  const st = S.state, z = myZone();
  if (!st || !z || !S.draft) return null;
  try {
    const r = resolveTurn({ ...st, seed: `${st.seed}:prevision:${st.turn}` }, { orders: { [z.uid]: S.draft }, players: S.players || {} });
    const zz = r.state.zones[z.uid];
    return zz && Number.isFinite(zz.ipz) ? { ipz: zz.ipz, comp: zz.ipzComp || null } : null;
  } catch (e) { console.warn('Prévision impossible :', e); return null; }
}

/** Contenu de la bande (vide tant que le calcul n'est pas fait). */
export function previsionHtml() {
  const z = myZone(), v = cache.cle === cleDe() ? cache.v : null;
  if (!v) return '<span class="tiny muted">Prévision du soir : calcul…</span>';
  const bas = Math.max(0, Math.round(v.ipz - ECART)), haut = Math.min(100, Math.round(v.ipz + ECART));
  const hier = z && Number.isFinite(z.ipz) ? z.ipz : null;
  const d = hier == null ? null : Math.round(v.ipz - hier);
  if (S.ordresV2) {
    // Saison 2 : la prévision en jauge (0 à 100), la fourchette en vert, le trait d'hier.
    return `<div class="pv2-t"><span class="pv2-k">IPZ prévu ce soir</span><span class="pv2-v">${bas} – ${haut}${d == null ? '' : ` <small class="${d > 0 ? 'ok' : d < 0 ? 'bad' : 'muted'}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)}</small>`}</span></div>
      <div class="pv2-j" aria-hidden="true"><i style="left:${bas}%;width:${Math.max(2, haut - bas)}%"></i>${hier == null ? '' : `<u style="left:${Math.max(0, Math.min(100, hier))}%" title="hier"></u>`}</div>`;
  }
  return `<span class="small"><strong>Ce soir, avec ces ordres :</strong> IPZ entre ${bas} et ${haut}${d == null ? '' : ` <span class="${d > 0 ? 'ok' : d < 0 ? 'bad' : 'muted'}">(${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)} sur hier)</span>`}</span>
    ${REGLES.v2 ? '<details class="prev-pq"><summary class="tiny muted">Pourquoi une fourchette ?</summary><span class="tiny muted">Tendance calculée par le moteur, sans tes énigmes ni tes incidents du jour ; le hasard de 20:00 peut la faire varier.</span></details>' : '<span class="tiny muted">Tendance calculée par le moteur, sans tes énigmes ni tes incidents du jour ; le hasard de 20:00 peut la faire varier.</span>'}`;
}

/** « IPZ 55–59 » pour la barre de validation (vide tant que le calcul n'est pas fait). */
export function previsionCourte() {
  const v = cache.cle === cleDe() ? cache.v : null;
  if (!v) return '';
  return `IPZ ${Math.max(0, Math.round(v.ipz - ECART))}–${Math.min(100, Math.round(v.ipz + ECART))}`;
}

/** Recalcule (après un court délai) quand les ordres changent, et met la bande à jour sans redessiner l'écran. */
function rafraichir() {
  const cle = cleDe();
  if (!cle || cle === cache.cle) return;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => {
    const k = cleDe();
    if (!k) return;
    cache = { cle: k, v: calculer() };
    const el = document.getElementById('prev-ipz');
    if (el) el.innerHTML = previsionHtml();
    const c = document.getElementById('prev-court');
    if (c) c.textContent = previsionCourte();
  }, 350);
}

/** Surveille les ordres tant que l'écran est ouvert (vérification légère toutes les 0,6 s). */
export function suivrePrevision() {
  if (veille) return;
  veille = setInterval(() => {
    if (S.route !== 'ordres' || !document.getElementById('prev-ipz')) { clearInterval(veille); veille = null; return; }
    rafraichir();
  }, 600);
  rafraichir();
}
