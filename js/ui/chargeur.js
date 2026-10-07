// Écran de chargement : logo, barre d'étapes réelles et silhouette de Mons (collégiale Sainte-Waudru, beffroi)
// dont les fenêtres s'allument au fil du chargement. Le même HTML est recopié dans index.html par
// outils/construire.mjs (il doit s'afficher avant même que le code du jeu soit téléchargé).
// Module sans dépendance : il est aussi importé par l'outil de construction (Node).

// Fenêtres : [x, y, largeur, hauteur, seuil d'allumage en %]
const FEN = [
  // Collégiale : vitraux de la nef et du transept, tour
  [83, 84, 4, 13, 18], [97, 84, 4, 13, 46], [135, 84, 4, 13, 30], [149, 84, 4, 13, 64], [118, 72, 4, 15, 86],
  [53, 62, 4, 10, 40], [53, 80, 4, 10, 72], [166, 88, 3, 9, 56],
  // Beffroi
  [244, 59, 3, 6, 24], [253, 59, 3, 6, 60], [244, 75, 3, 6, 50], [253, 75, 3, 6, 80],
  // Maisons du premier plan
  [8, 108, 3, 4, 12], [22, 106, 3, 4, 70], [192, 109, 3, 4, 34], [207, 107, 3, 4, 90], [226, 110, 3, 4, 20],
  [244, 106, 3, 4, 58], [318, 108, 3, 4, 44], [333, 105, 3, 4, 76], [352, 109, 3, 4, 28], [370, 106, 3, 4, 94], [388, 108, 3, 4, 66],
];

const SVG = `<svg overflow="visible" class="loader-ville" viewBox="32 0 238 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">`
  // Arrière-plan : toits lointains
  + `<path id="lv-l" class="lv-loin" d="M0 120V96l14-6 12 5 10-9 16 7 14-5V80h6v11l20 3 18-6 22 5 30-4 24 6 16-8 18 4 14-6 22 7 18-5 20 6 14-4 22 7 26-5 20 6 20-4v34z"/>`
  + `<use href="#lv-l" x="-400"/><use href="#lv-l" x="400"/><use href="#lv-l" x="-800"/><use href="#lv-l" x="800"/>`
  // Colline du château, sous le beffroi
  + `<path class="lv-mi" d="M178 120q30-24 72-24t80 24z"/>`
  // Collégiale Sainte-Waudru : tour inachevée, nef, transept, chevet
  + `<g class="lv-mi">`
  + `<path d="M38 120V52h4v-3h4v3h6v-3h4v3h6v-3h4v3h4v68z"/>`
  + `<path d="M70 120V76h-2l8-16h80l8 16h-2v44z"/>`
  + `<path d="M110 120V66l10-12 10 12v54z"/>`
  + `<path d="M162 120V78q20 2 22 20v22z"/>`
  + `</g>`
  // Beffroi : fût, galerie et tourelles, bulbe, lanterne, flèche
  + `<g class="lv-mi" transform="translate(-40 0)">`
  + `<path d="M280 98V53h-3v-4h26v4h-3v45z"/>`
  + `<path d="M277 49v-6q2-3 4 0v6zM299 49v-6q2-3 4 0v6z"/>`
  + `<path d="M283 49V36h14v13z"/><path d="M283 36q0-10 7-14 7 4 7 14z"/>`
  + `<path d="M288 22v-7h4v7z"/><path d="M287.5 15q2.5-5 5 0z"/><path d="M289.5 11V3h1v8z"/>`
  + `</g>`
  + `<circle class="lv-horloge" cx="250" cy="42" r="2.6"/>`
  // Premier plan : maisons à pignons
  + `<path id="lv-p" class="lv-pres" d="M0 120v-14l8-8 8 8v-4h4l7-7 7 7v18h8v-8l6-6 6 6v8h132v-8l9-8 9 8v-4l7-6 7 6v6h4v-12l8-7 8 7v12h6v-9l7-6 7 6v9h6v-6l8-8 8 8v6h52v-10l8-7 8 7v-4l8-7 8 7v14h4v-8l8-7 8 7v8h6v-12l8-7 8 7v4l7-6 7 6v14z"/>`
  + `<use href="#lv-p" x="-400"/><use href="#lv-p" x="400"/><use href="#lv-p" x="-800"/><use href="#lv-p" x="800"/>`
  + FEN.map(([x, y, w, h, s]) => `<rect class="lv-fen" data-s="${s}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w > 3 ? 2 : 0.6}"/>`).join('')
  + `</svg>`;

/** HTML complet de l'écran de chargement. */
export function chargeurHtml(msg = 'Chargement…', pct = 6) {
  return `<main class="center-screen loader" aria-busy="true"><div class="loader-halo" aria-hidden="true"></div>${SVG}<div class="loader-coeur"><div class="lightbar" aria-hidden="true"><span class="lb-blue"></span><span class="lb-amber"></span></div><h1 class="brand brand-xl">Ma ZP</h1><p class="loader-tag">Gère ta zone · Démasque le coupable</p><div class="loader-bar" aria-hidden="true"><span style="width:${pct}%"></span></div><p class="loader-msg" role="status">${msg}</p></div></main>`;
}

/** Fait avancer la barre (jamais en arrière) et allume les fenêtres correspondantes. */
export function avancerChargeur(racine, pct) {
  const bar = racine.querySelector('.loader-bar span');
  if (!bar) return;
  const actuel = parseFloat(bar.style.width) || 0;
  const v = Math.max(actuel, Math.min(100, pct));
  bar.style.width = `${v}%`;
  racine.querySelectorAll('.lv-fen').forEach((f) => { if (+f.dataset.s <= v) f.classList.add('on'); });
}

/**
 * Sortie en douceur : l'écran de chargement est gardé par-dessus le jeu qui vient de s'afficher,
 * le logo remonte vers l'en-tête, la ville descend, puis tout s'efface.
 */
export function sortirChargeur(ancien) {
  if (!ancien || !ancien.isConnected) return;
  avancerChargeur(ancien, 100);
  ancien.classList.add('loader-sortie');
  ancien.removeAttribute('aria-busy');
  document.body.appendChild(ancien);
  const fin = () => ancien.remove();
  setTimeout(fin, 750);
}
