// Visuels de l'affaire « Quatre-vingt-quatorze secondes » : photos des pièces, scène à fouiller, une du journal.
// Même règle que pour les autres affaires : l'indice se lit dans l'image (une heure, un détail), sans être souligné.
// Photos générées (img/medaillon/…), sans texte : les écritures et les plots sont posés par le jeu par-dessus.
import { MONO, MAIN, defsPhoto, finPhoto, svg } from './photo-base.js';

// ───── Briques ─────
const ligne = (x, y, t, { taille = 8.5, coul = '#222', gras = false, police = MONO, ancre = '' } = {}) => `<text x="${x}" y="${y}" ${police} font-size="${taille}" fill="${coul}"${gras ? ' font-weight="600"' : ''}${ancre ? ` text-anchor="${ancre}"` : ''}>${t}</text>`;
/** Feuille posée de travers sur une table. */
function feuille(id, w, h, fond, rot, contenu, { papier = '#FBF9F2', grain = 0.12 } = {}) {
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="${fond}"/>
    <g transform="rotate(${rot} ${w / 2} ${h / 2})"><rect x="${w * 0.08}" y="${h * 0.06}" width="${w * 0.84}" height="${h * 0.88}" fill="${papier}"/>${contenu}</g>
    ${finPhoto(id, w, h, grain)}`);
}
/** Photo générée, avec une légende de saisie dans un bandeau (et, au besoin, un repère en haut à droite). */
const photo = (id, src, legende, { coin = '' } = {}) => svg(id, 1024, 572, `<image href="img/medaillon/${src}" width="1024" height="572"/>
    ${coin ? `<rect x="${1012 - coin.length * 12.5}" y="12" width="${coin.length * 12.5}" height="28" rx="3" fill="#000" opacity=".55"/>${ligne(1004, 32, coin, { taille: 17, coul: '#F5F5F5', ancre: 'end' })}` : ''}
    <rect x="12" y="532" width="${legende.length * 8.6 + 20}" height="28" rx="3" fill="#000" opacity=".55"/>${ligne(22, 551, legende, { taille: 14, coul: '#F5F5F5' })}`);
/** Écran de téléphone : une conversation (bulles [de moi ?, texte, heure]). */
function ecranGsm(id, titre, bulles, { w = 240, h = 340 } = {}) {
  let y = 64;
  const b = bulles.map(([moi, t, heure]) => {
    const lignes = t.match(/.{1,26}(\s|$)/g) || [t];
    const hh = lignes.length * 11 + 16, x = moi ? 92 : 52, g = `<rect x="${x}" y="${y}" width="96" height="${hh}" rx="7" fill="${moi ? '#D9F2D0' : '#FFFFFF'}" stroke="#D5D8DC"/>
      ${lignes.map((l, k) => ligne(x + 6, y + 12 + k * 11, l.trim(), { taille: 6.6 })).join('')}${ligne(x + 90, y + hh - 4, heure, { taille: 5.2, coul: '#888', ancre: 'end' })}`;
    y += hh + 8;
    return g;
  }).join('');
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="#2C2622"/>
    <g transform="rotate(-3 ${w / 2} ${h / 2})"><rect x="40" y="14" width="${w - 80}" height="${h - 28}" rx="16" fill="#0E0F12"/>
    <rect x="46" y="30" width="${w - 92}" height="${h - 60}" rx="4" fill="#ECE5DD"/>
    <rect x="46" y="30" width="${w - 92}" height="24" fill="#DCE3E8"/>${ligne(w / 2, 46, titre, { taille: 8.5, gras: true, ancre: 'middle', police: 'font-family="Instrument Sans, sans-serif"' })}
    ${b}</g>${finPhoto(id, w, h, 0.1)}`);
}

// ───── Photos des pièces ─────
export const PHOTOS_MEDAILLON = {
  'c:copie': (id) => photo(id, 'copie.webp', 'Labo · objet saisi dans la vitrine · scellé M1 · émail uniforme, gravure complète'),

  'c:archive': (id) => feuille(id, 300, 320, '#3E4A54', -1.5, `
    ${ligne(42, 46, 'EXPERTISE · OBJET D’ART · MARS 2024', { taille: 8.2, gras: true })}
    ${ligne(42, 58, 'Mons, Mémoire & Patrimoine · Médaillon d’Aulne', { taille: 6.6, coul: '#555' })}
    <path d="M42 66H258" stroke="#999"/>
    <g transform="translate(92 118)"><circle r="40" fill="#C9A447"/><circle r="33" fill="#1E3A8F"/><path d="M0 -20L5 -5L20 0L5 5L0 20L-5 5L-20 0L-5 -5Z" fill="#D8B860"/>${ligne(0, 58, 'avers', { taille: 6, coul: '#666', ancre: 'middle' })}</g>
    <g transform="translate(206 118)"><circle r="40" fill="#C9A447"/><circle r="35" fill="#B8923A"/>${ligne(-17, 4, 'M·1', { taille: 13, gras: true, coul: '#5A4410', police: 'font-family="Georgia, serif"' })}<path d="M10 -8V2M10 5V9" stroke="#5A4410" stroke-width="2.2"/>${ligne(0, 58, 'revers', { taille: 6, coul: '#666', ancre: 'middle' })}</g>
    ${ligne(42, 196, 'Ø 46,1 mm · or 18 ct · émail bleu cuit', { taille: 7.4 })}
    ${ligne(42, 210, 'État : remarquable, émail intact.', { taille: 7.4 })}
    ${ligne(42, 224, 'Revers : « M·17 », dernier trait interrompu', { taille: 7.4 })}
    ${ligne(42, 236, 'sur 0,8 mm (défaut d’origine, authentifie la pièce).', { taille: 7.4 })}
    ${ligne(42, 268, 'Deux conservateurs · copie à l’assureur', { taille: 6.4, coul: '#777' })}
    ${ligne(186, 292, 'P.-Y. Lauwers', { taille: 13, coul: '#2A3A8A', police: MAIN })}`),

  'c:photo': (id) => photo(id, 'vitrine.webp', 'Photo officielle · Camille Ronveaux · prise à 2,40 m', { coin: 'IMG_4182.CR3 · JEU 19:06:12' }),

  'c:coupure': (id) => feuille(id, 300, 250, '#4A4E52', 2, `
    ${ligne(40, 42, 'TABLEAU GÉNÉRAL · JOURNAL', { taille: 8, gras: true })}
    <path d="M40 50H260" stroke="#999"/>
    ${[['20:12:04', 'C-2 cuisine', 'OK'], ['20:41:00', 'C-4 appliques + PC serv.', 'DÉCLENCHÉ'], ['20:42:34', 'C-4', 'RÉARMÉ'], ['21:20:10', 'C-4', 'OK']].map((r, k) => `${ligne(40, 68 + k * 15, r[0], { taille: 7 })}${ligne(96, 68 + k * 15, r[1], { taille: 7 })}${ligne(206, 68 + k * 15, r[2], { taille: 7, gras: k === 1 })}`).join('')}
    <g transform="translate(70 150) rotate(-4)"><rect width="170" height="64" fill="#FFF59D"/>
      ${ligne(10, 22, 'Plancha traiteur', { taille: 15, coul: '#1B2A6B', police: MAIN })}${ligne(10, 40, 'sur prise de service', { taille: 15, coul: '#1B2A6B', police: MAIN })}${ligne(10, 58, 'D. Hallez — 20:37', { taille: 15, coul: '#1B2A6B', police: MAIN })}</g>`),

  'c:discours': (id) => photo(id, 'discours.webp', 'Vidéo d’un invité · discours de la présidente', { coin: '▶ JEU 20:31' }),

  'occ:4': (id) => feuille(id, 300, 230, '#3E4A54', 1, `
    ${ligne(40, 40, 'SERRURE À BADGE · BUREAU B-2 · SECRÉTARIAT', { taille: 7.6, gras: true })}
    ${ligne(40, 52, 'Journal du jeudi, 17:00 → 21:30', { taille: 6.6, coul: '#555' })}
    <path d="M40 60H260" stroke="#999"/>
    ${[['18:34:12', 'OUVERTURE', 'badge 04 · S. WATTIEZ'], ['18:59:40', 'OUVERTURE', 'badge 04 · S. WATTIEZ'], ['—', '—', 'aucun autre événement']].map((r, k) => `${ligne(40, 80 + k * 18, r[0], { taille: 7.2 })}${ligne(98, 80 + k * 18, r[1], { taille: 7.2 })}${ligne(160, 80 + k * 18, r[2], { taille: 7.2 })}`).join('')}
    ${ligne(40, 160, 'Badges autorisés : secrétariat (02, 04), gardien (09).', { taille: 6.4, coul: '#666' })}
    ${ligne(40, 172, 'Le lecteur enregistre le badge qui ouvre la porte.', { taille: 6.4, coul: '#666' })}`),

  'moy:0': (id) => photo(id, 'carnet.webp', 'Perquisition atelier Cauchie, Hyon · carnet de restauration · photo du 14 avril'),

  'moy:4': (id) => photo(id, 'boite.webp', 'Perquisition Wattiez, Saint-Symphorien · armoire de la cuisine · boîte à biscuits'),

  'moy:2': (id) => feuille(id, 300, 240, '#5A4E44', -2, `
    ${ligne(150, 50, 'CERTIFICAT DE VENTE', { taille: 10, gras: true, ancre: 'middle', police: 'font-family="Georgia, serif"' })}
    <path d="M60 58H240" stroke="#B9A98A"/>
    ${ligne(48, 82, 'Objet : Médaillon d’Aulne, or et émail bleu,', { taille: 7.2 })}
    ${ligne(48, 94, 'Ø 46 mm, fin XVIIᵉ siècle.', { taille: 7.2 })}
    ${ligne(48, 116, 'Cédé par : ................................................', { taille: 7.2 })}
    ${ligne(48, 132, 'à : M. Georges Lemmens, Ghlin', { taille: 7.2 })}
    ${ligne(48, 148, 'Prix : ........................ €', { taille: 7.2 })}
    ${ligne(48, 172, 'Fait à Mons, le ...................', { taille: 7.2 })}
    ${ligne(48, 206, 'Perquisition Lemmens · bureau · tiroir', { taille: 6.4, coul: '#777' })}`),

  'mob:4': (id) => ecranGsm(id, 'Georges L.', [[false, 'Samedi comme convenu. Le reste en liquide, à la remise.', 'mar. 18:02'], [true, 'Oui. Samedi.', 'mar. 18:40']]),
  'mob:2': (id) => ecranGsm(id, 'Séverine W.', [[true, 'Samedi comme convenu. Le reste en liquide, à la remise.', 'mar. 18:02'], [false, 'Oui. Samedi.', 'mar. 18:40']]),
};
// Variante b : l'original est chez le collectionneur ; la secrétaire n'a que les papiers, et le message de 20:50.
export const PHOTOS_MEDAILLON_B = {
  ...PHOTOS_MEDAILLON,
  'moy:2': (id) => photo(id, 'ecrin.webp', 'Perquisition Lemmens, Ghlin · coffre du bureau · écrin'),
  'moy:4': (id) => feuille(id, 300, 230, '#33373C', 2, `
    ${ligne(40, 44, 'PERQUISITION WATTIEZ · VÉHICULE', { taille: 8, gras: true })}
    <path d="M40 52H260" stroke="#999"/>
    ${['Enveloppe rigide crème, contenant :', '— papiers de provenance du médaillon d’Aulne', '— copie de la fiche d’expertise de mars 2024', 'Tiroir du bureau : 4 800 € en liquide.', 'Pas de médaillon.'].map((t, k) => ligne(40, 74 + k * 18, t, { taille: 7.4 })).join('')}`),
  'mob:4': (id) => ecranGsm(id, 'Georges L.', [[false, 'Samedi comme convenu. Le reste en liquide, à la remise.', 'mar. 18:02'], [true, 'Oui. Samedi.', 'mar. 18:40'], [false, 'Inutile de me l’apporter samedi. Je l’ai déjà. Merci pour l’acompte.', 'jeu. 20:50 · lu 20:51']]),
  'mob:2': (id) => ecranGsm(id, 'Séverine W.', [[true, 'Samedi comme convenu. Le reste en liquide, à la remise.', 'mar. 18:02'], [false, 'Oui. Samedi.', 'mar. 18:40'], [true, '(message effacé)', 'jeu. 20:50']]),
};
/** Photos des pièces du médaillon dans la variante de l'affaire. */
export const photosMedaillon = (variante) => (variante === 'b' ? PHOTOS_MEDAILLON_B : PHOTOS_MEDAILLON);

// ───── La scène à fouiller ─────
export const PHOTO_SCENE_MEDAILLON = { src: 'img/medaillon/scene.webp', mini: 'img/medaillon/scene-mini.webp', w: 1376, h: 768 };
// px/py : coordonnées sur la photo de la scène.
export const POINTS_SCENE_MEDAILLON = [
  { k: 'cloche', n: 1, px: 688, py: 420, titre: 'La cloche de verre', texte: 'Le médaillon sous sa cloche, tel qu’il était à 21:05. Sur le haut du verre, des traces de doigts d’invités ; rien sur les quatre vis. La cloche est revissée, bien droite.' },
  { k: 'tiroir', n: 2, px: 688, py: 588, titre: 'Le tiroir du socle', texte: 'Un petit tiroir sans serrure. Dedans : un tournevis à empreinte spéciale, un chiffon, la notice du loueur : « cloche démontable par une personne, environ une minute ».' },
  { k: 'spots', n: 3, px: 440, py: 250, titre: 'Les spots', texte: 'Deux spots sur pied, réglés sur la cloche, à hauteur d’homme. Sous cette lumière, le verre fait miroir quand on se tient à plus d’un mètre.' },
  { k: 'pupitre', n: 4, px: 555, py: 395, titre: 'Le pupitre', texte: 'Le pupitre du discours, devant le rideau. Le premier rang des invités se tenait juste devant, à trois mètres de la vitrine.' },
  { k: 'plancha', n: 5, px: 250, py: 465, titre: 'La plancha du traiteur', texte: 'Encore tiède à 21:20. Sa rallonge orange file sous la table et disparaît vers le rideau du fond.' },
  { k: 'rideau', n: 6, px: 860, py: 230, titre: 'Derrière le rideau', texte: 'Une prise de service, au ras du sol. La rallonge orange de la plancha y est branchée.' },
  { k: 'tableau', n: 7, px: 1185, py: 295, titre: 'Le tableau électrique', texte: 'Un boîtier gris, porte fermée. Un disjoncteur réarmé ; sur la porte, une fiche manuscrite scotchée, que le labo photographie.' },
  { k: 'porte', n: 8, px: 1100, py: 380, titre: 'La porte de service', texte: 'Elle donne sur l’escalier de service, qui monte aux bureaux du premier étage (B-1 comptabilité, B-2 secrétariat, serrures à badge), et sur le parking arrière.' },
  { k: 'manteaux', n: 9, px: 1000, py: 395, titre: 'Le portemanteau', texte: 'Le portemanteau du personnel : un imperméable beige, une veste noire. Les invités ont laissé leurs manteaux au vestiaire de l’entrée principale.' },
  { k: 'verre', n: 10, px: 985, py: 676, titre: 'Le verre cassé', texte: 'Une coupe de champagne brisée, à cinq mètres de la vitrine. Lâchée pendant la coupure ; personne ne l’a ramassée.' },
];

export function sceneMedaillonSvg(sel, vus, esc) {
  const P = PHOTO_SCENE_MEDAILLON;
  return `<svg viewBox="0 0 ${P.w} ${P.h}" role="img" aria-label="La salle de réception après la soirée, avec dix plots numérotés">
    <image href="${P.src}" width="${P.w}" height="${P.h}" preserveAspectRatio="xMidYMid slice"/>
    ${POINTS_SCENE_MEDAILLON.map((p) => `<g class="sf-plot ${sel && sel.k === p.k ? 'on' : ''} ${vus.has(p.k) ? 'vu' : ''}" data-action="scene-pt" data-k="${p.k}" transform="translate(${p.px} ${p.py}) scale(2.6)" tabindex="0" role="button" aria-label="Plot ${p.n} : ${esc(p.titre)}">
      <circle r="22" fill="transparent"/><path d="M-11 0L0 -20L11 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width="1.2"/><text y="-5" text-anchor="middle" font-family="'Special Elite', monospace" font-size="11" fill="#1D1A15">${p.n}</text></g>`).join('')}
  </svg>`;
}

// ───── Une du journal et vignette de la scène ─────
export function photoUneMedaillon() {
  return '<svg viewBox="0 0 960 536" class="tb-photo-svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><image href="img/medaillon/une.webp" width="960" height="536" preserveAspectRatio="xMidYMid slice"/></svg>';
}
export function photoSceneMedaillon() {
  return `<svg viewBox="0 0 480 268" class="tb-photo-svg" aria-hidden="true"><image href="${PHOTO_SCENE_MEDAILLON.mini}" width="480" height="268"/></svg>`;
}
