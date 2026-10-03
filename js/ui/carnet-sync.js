// Carnet d'enquête en ligne : le tableau (pièces punaisées, ficelles), les ✓ / ✕ et les notes
// suivent le joueur d'un appareil à l'autre. Une fiche par joueur et par partie (parties/{id}/carnets/{uid}).
// Économe : on n'envoie que si le contenu a changé, au plus une fois toutes les 20 secondes, 8 secondes
// après le dernier geste (ou tout de suite quand on quitte l'appli). La vue (zoom, déplacement) reste sur l'appareil.
// Lecture : à la première ouverture de l'enquête, puis au retour dans l'appli (au plus une fois par minute).
import { S } from './common.js';

const ATTENTE = 8000, ECART_MIN = 20000, RELIRE_APRES = 60000;
let ecrireRef = null, minuterie = null, dernierEnvoi = 0, dernierEnvoye = '', derniereLecture = 0, rafraichir = null, branche = false;

/** Un tableau sans rien de posé (seulement une vue ou des listes vides) compte comme pas de tableau. */
const tableauVide = (t) => !t || (!(t.places || []).length && !(t.liens || []).length && !(t.fiches || []).length && !Object.keys(t.pos || {}).length);
const sansVue = (c) => {
  if (!c) return c;
  const { tab, maj, ...reste } = c;
  if (tableauVide(tab)) return reste;
  const { vue, ...t } = tab;
  return { ...reste, tab: t };
};
/**
 * Carnet sans contenu : ni ✓ / ✕, ni marque, ni note, ni tableau. Un appareil qui ouvre le tableau pour la première
 * fois (ou qui déplace seulement la vue) ne doit jamais écraser le carnet d'un autre appareil.
 */
export const carnetVide = (c) => !c || (!String(c.notes || '').trim() && tableauVide(c.tab)
  && !Object.entries(c).some(([k, v]) => !['maj', 'tab', 'notes'].includes(k) && v && typeof v === 'object' && Object.values(v).some(Boolean)));
/** Le contenu a-t-il changé (hors vue et date) ? */
export const contenuChange = (avant, apres) => JSON.stringify(sansVue(avant || {})) !== JSON.stringify(sansVue(apres || {}));

const disponible = () => !!(S.backend && S.backend.saveCarnet && S.user && S.state && S.state.enquete);

/** Affaires gardées en ligne : celle en cours et la précédente (pour la traque). */
function charge(lire) {
  const n = S.state.enquete.n;
  const affaires = {};
  for (const k of [n, n - 1]) {
    if (k < 1) continue;
    const c = lire(k);
    if (c && !carnetVide(c)) affaires[k] = { ...sansVue(c), maj: c.maj || 0 };
  }
  return affaires;
}

/** Synchroniser tout de suite (bouton du tableau) : relit en ligne, fusionne, puis envoie. */
export async function synchroniserMaintenant(lire, ecrireLocal, rerender) {
  await synchroniser(lire, ecrireLocal, rerender, { force: true });
  clearTimeout(minuterie); dernierEnvoye = '';
  await envoyer(lire);
  if (rerender && S.route === 'enquete') rerender();
}

/** À appeler après chaque écriture du carnet : planifie l'envoi. */
export function planifierEnvoi(lire) {
  if (!disponible()) return;
  brancher(lire);
  clearTimeout(minuterie);
  const attente = Math.max(ATTENTE, dernierEnvoi + ECART_MIN - Date.now());
  minuterie = setTimeout(() => envoyer(lire), attente);
}

async function envoyer(lire) {
  minuterie = null;
  if (!disponible()) return;
  const affaires = charge(lire);
  const json = JSON.stringify(affaires);
  if (json === dernierEnvoye || !Object.keys(affaires).length) return;
  try {
    await S.backend.saveCarnet(S.user.uid, { affaires, maj: Date.now() });
    dernierEnvoye = json; dernierEnvoi = Date.now(); S.carnetSync = 'ok';
  } catch (e) { console.warn('Carnet non enregistré en ligne', e); S.carnetSync = (e && e.code) || 'erreur'; }
}

/**
 * Fusion de deux carnets d'une même affaire (cet appareil et la version en ligne) :
 * pièces posées, fiches et ficelles réunies ; positions, coches et marques : la version la plus récente l'emporte
 * pour une même clé ; notes : la plus récente non vide. La vue (zoom, déplacement) reste celle de cet appareil.
 */
export function fusionner(local, loin) {
  if (carnetVide(local)) return { ...loin, tab: loin.tab ? { ...loin.tab, vue: (local.tab && local.tab.vue) || null } : loin.tab };
  const [vieux, recent] = (loin.maj || 0) > (local.maj || 0) ? [local, loin] : [loin, local];
  const out = { maj: Math.max(local.maj || 0, loin.maj || 0) };
  for (const k of new Set([...Object.keys(vieux), ...Object.keys(recent)])) {
    if (['maj', 'tab', 'notes'].includes(k)) continue;
    const a = vieux[k], b = recent[k];
    out[k] = a && typeof a === 'object' && b && typeof b === 'object' ? { ...a, ...b } : (b !== undefined ? b : a);
  }
  out.notes = String(recent.notes || '').trim() ? recent.notes : (vieux.notes || '');
  const ta = vieux.tab || {}, tb = recent.tab || {};
  if (!tableauVide(ta) || !tableauVide(tb)) {
    const union = (x, y) => [...new Set([...(x || []), ...(y || [])])];
    const cle = (l) => [...l].sort().join('|');
    const liens = [];
    for (const l of [...(tb.liens || []), ...(ta.liens || [])]) if (Array.isArray(l) && !liens.some((m) => cle(m) === cle(l))) liens.push(l);
    out.tab = { ...ta, ...tb, v: tb.v || ta.v, pos: { ...(ta.pos || {}), ...(tb.pos || {}) }, places: union(tb.places, ta.places), fiches: union(tb.fiches, ta.fiches),
      liens, neuf: union(tb.neuf, ta.neuf), vue: (local.tab && local.tab.vue) || null };
  } else if (local.tab) out.tab = local.tab;
  return out;
}

/** Lit la fiche en ligne et la fusionne, affaire par affaire, avec ce que cet appareil a. */
export async function synchroniser(lire, ecrireLocal, rerender, { force = false } = {}) {
  if (!disponible() || !S.backend.getCarnet) return;
  brancher(lire);
  rafraichir = rerender; ecrireRef = ecrireLocal;
  if (!force && Date.now() - derniereLecture < RELIRE_APRES) return;
  derniereLecture = Date.now();
  let distant = null;
  try { distant = await S.backend.getCarnet(S.user.uid); S.carnetSync = S.carnetSync === 'erreur' ? S.carnetSync : 'ok'; } catch (e) {
    console.warn('Carnet non lu en ligne', e); S.carnetSync = (e && e.code) || 'erreur';
    if (rafraichir && S.route === 'enquete') rafraichir();
    return;
  }
  const aff = (distant && distant.affaires) || {};
  let change = false, aEnvoyer = false;
  const n = S.state.enquete.n;
  for (const k of [n, n - 1]) {
    if (k < 1) continue;
    const local = lire(k), loin = aff[k] && !carnetVide(aff[k]) ? aff[k] : null;
    if (!loin) { if (!carnetVide(local)) aEnvoyer = true; continue; }
    // Fusion : rien de ce qui a été posé sur un appareil ne se perd sur l'autre.
    const neuf = fusionner(local, loin);
    if (contenuChange(local, neuf)) { ecrireLocal(k, neuf); change = true; }
    if (contenuChange(loin, neuf)) aEnvoyer = true;
  }
  dernierEnvoye = JSON.stringify(charge(lire));
  if (aEnvoyer) { dernierEnvoye = ''; planifierEnvoi(lire); }
  if (change && rafraichir && S.route === 'enquete') rafraichir();
}

/** Envoi immédiat quand on quitte l'appli, relecture quand on y revient. */
function brancher(lire) {
  if (branche) return;
  branche = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (minuterie) { clearTimeout(minuterie); envoyer(lire); } }
    else if (S.route === 'enquete' && rafraichir && ecrireRef) synchroniser(lire, ecrireRef, rafraichir);
  });
  window.addEventListener('pagehide', () => { if (minuterie) { clearTimeout(minuterie); envoyer(lire); } });
}
