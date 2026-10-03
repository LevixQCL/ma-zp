// Carnet d'enquête en ligne : le tableau (pièces punaisées, ficelles), les ✓ / ✕ et les notes
// suivent le joueur d'un appareil à l'autre. Une fiche par joueur et par partie (parties/{id}/carnets/{uid}).
// Économe : on n'envoie que si le contenu a changé, au plus une fois toutes les 20 secondes, 8 secondes
// après le dernier geste (ou tout de suite quand on quitte l'appli). La vue (zoom, déplacement) reste sur l'appareil.
// Lecture : à la première ouverture de l'enquête, puis au retour dans l'appli (au plus une fois par minute).
import { S } from './common.js';

const ATTENTE = 8000, ECART_MIN = 20000, RELIRE_APRES = 60000;
let ecrireRef = null, minuterie = null, dernierEnvoi = 0, dernierEnvoye = '', derniereLecture = 0, rafraichir = null, branche = false;

const sansVue = (c) => {
  if (!c) return c;
  const { tab, maj, ...reste } = c;
  if (!tab) return reste;
  const { vue, ...t } = tab;
  return { ...reste, tab: t };
};
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
    if (c && (c.maj || Object.keys(c.g || {}).length || c.notes || (c.tab && (c.tab.places || []).length))) affaires[k] = { ...sansVue(c), maj: c.maj || 0 };
  }
  return affaires;
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
    dernierEnvoye = json; dernierEnvoi = Date.now();
  } catch (e) { console.warn('Carnet non enregistré en ligne', e); }
}

/** Lit la fiche en ligne et garde, affaire par affaire, la version la plus récente. */
export async function synchroniser(lire, ecrireLocal, rerender, { force = false } = {}) {
  if (!disponible() || !S.backend.getCarnet) return;
  brancher(lire);
  rafraichir = rerender; ecrireRef = ecrireLocal;
  if (!force && Date.now() - derniereLecture < RELIRE_APRES) return;
  derniereLecture = Date.now();
  let distant = null;
  try { distant = await S.backend.getCarnet(S.user.uid); } catch (e) { return; }
  const aff = (distant && distant.affaires) || {};
  let change = false, aEnvoyer = false;
  const n = S.state.enquete.n;
  for (const k of [n, n - 1]) {
    if (k < 1) continue;
    const local = lire(k), loin = aff[k];
    if (loin && (loin.maj || 0) > (local.maj || 0)) {
      // Plus récent en ligne : on le prend, en gardant la vue de cet appareil.
      const vue = local.tab && local.tab.vue;
      const neuf = { ...loin, tab: loin.tab ? { ...loin.tab, vue: vue || null } : local.tab };
      if (contenuChange(local, neuf)) { ecrireLocal(k, neuf); change = true; }
    } else if ((local.maj || 0) > ((loin && loin.maj) || 0) || (!loin && contenuChange({}, local))) aEnvoyer = true;
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
