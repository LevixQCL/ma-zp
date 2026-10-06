// Affichage en euros.
// Le moteur compte en milliers d'euros (k€) : on garde ces valeurs telles quelles (aucun changement d'équilibrage,
// les parties en cours restent compatibles) et on convertit seulement à l'écran : « 1,5 k€ » → « 1 500 € ».
// La conversion porte sur tout le texte affiché (écrans, fenêtres, toasts, Gazettes déjà parues, libellés d'accessibilité).

const NBSP = ' ';
// Nombre à la belge : « 12 », « 1,5 », « 1 234,5 » (séparateur de milliers espace, espace fine ou insécable).
const NUM = String.raw`\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?`; // le point aussi : certaines sommes sont affichées brutes (0.3)
// Une fourchette ou une liste qui se termine par k€ : « 2 à 4 k€ », « 18 / 26 / 34 k€ ».
// (Pas la virgule : « Tour 12, 3 k€ » ne doit pas devenir « 12 000 ».)
const SEP = String.raw`\s?(?:à|ou|et|/|–)\s`;
const RE_LISTE = new RegExp(String.raw`((?:(?:${NUM})(?:${SEP}))*)(${NUM})[   ]?k€`, 'g');
const RE_NUM = new RegExp(NUM, 'g');

const versNombre = (s) => Number(s.replace(/[   ]/g, '').replace(',', '.'));

/** Valeur en k€ → texte en euros, sans le symbole : 1.5 → « 1 500 ». */
export function eurosNombre(k) {
  const e = Math.round(Number(k) * 1000);
  return e.toLocaleString('fr-BE', { maximumFractionDigits: 0 }).replace(/[  ]/g, NBSP);
}

/** Valeur en k€ → « 1 500 € ». */
export const euros = (k) => `${eurosNombre(k)}${NBSP}€`;

/** Remplace dans un texte toutes les sommes en k€ par des sommes en euros. */
export function enEuros(txt) {
  if (!txt || txt.indexOf('k€') < 0) return txt;
  let out = txt.replace(RE_LISTE, (m, avant, dernier) => {
    const tete = avant ? avant.replace(RE_NUM, (n) => eurosNombre(versNombre(n))) : '';
    return `${tete}${eurosNombre(versNombre(dernier))}${NBSP}€`;
  });
  // Unité seule, sans montant devant (« 1 point par k€ ») : la tranche de 1 000 €.
  out = out.replace(/k€/g, `1${NBSP}000${NBSP}€`);
  return out;
}

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];

function convertirNoeud(n) {
  if (n.nodeType === 3) {
    if (n.nodeValue.indexOf('k€') >= 0) n.nodeValue = enEuros(n.nodeValue);
    return;
  }
  if (n.nodeType !== 1) return;
  for (const a of ATTRS) {
    const v = n.getAttribute && n.getAttribute(a);
    if (v && v.indexOf('k€') >= 0) n.setAttribute(a, enEuros(v));
  }
  if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
  // Parcours rapide : on ne descend que si le sous-arbre contient « k€ ».
  if ((n.textContent || '').indexOf('k€') < 0 && !(n.querySelector && n.querySelector('[aria-label*="k€"],[title*="k€"]'))) return;
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
  const textes = [];
  while (w.nextNode()) if (w.currentNode.nodeValue.indexOf('k€') >= 0) textes.push(w.currentNode);
  for (const t of textes) t.nodeValue = enEuros(t.nodeValue);
  if (n.querySelectorAll) for (const el of n.querySelectorAll('[aria-label*="k€"],[title*="k€"],[placeholder*="k€"],[alt*="k€"]')) {
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && v.indexOf('k€') >= 0) el.setAttribute(a, enEuros(v)); }
  }
}

/** À appeler une fois au démarrage : tout ce qui s'affiche ensuite est converti avant d'être peint. */
export function installerEuros(racine = document.body) {
  if (typeof MutationObserver === 'undefined' || !racine) return;
  convertirNoeud(racine);
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') convertirNoeud(m.target);
      else if (m.type === 'attributes') convertirNoeud(m.target);
      else for (const n of m.addedNodes) convertirNoeud(n);
    }
  });
  obs.observe(racine, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  if (document.title.indexOf('k€') >= 0) document.title = enEuros(document.title);
}
