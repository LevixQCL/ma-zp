// Visuels de l'affaire « Le corbeau de la rue d'Havré » : photos des pièces, scène à fouiller, une du journal.
// Même règle que pour les autres affaires : l'indice se lit dans l'image (une heure, un détail), sans être souligné.
// Photos générées (img/corbeau/…), sans texte : les écritures et les plots sont posés par le jeu par-dessus.
import { MONO, defsPhoto, finPhoto, svg, cadreCam } from './photo-base.js';

// ───── Briques ─────
const ligne = (x, y, t, { taille = 8.5, coul = '#222', gras = false, police = MONO, ancre = '' } = {}) => `<text x="${x}" y="${y}" ${police} font-size="${taille}" fill="${coul}"${gras ? ' font-weight="600"' : ''}${ancre ? ` text-anchor="${ancre}"` : ''}>${t}</text>`;
/** Feuille posée de travers sur une table. */
function feuille(id, w, h, fond, rot, contenu, { papier = '#FBF9F2', grain = 0.12 } = {}) {
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="${fond}"/>
    <g transform="rotate(${rot} ${w / 2} ${h / 2})"><rect x="${w * 0.08}" y="${h * 0.06}" width="${w * 0.84}" height="${h * 0.88}" fill="${papier}"/>${contenu}</g>
    ${finPhoto(id, w, h, grain)}`);
}
/** Mots imprimés à l'étiqueteuse : bandes blanches de ruban, texte noir, légèrement de travers. */
function ruban(x, y, mots, { taille = 7.5, h = 11, rot = 0 } = {}) {
  let cx = x;
  return mots.map((m, k) => {
    const w = m.length * taille * 0.62 + 8;
    const g = `<g transform="translate(${cx} ${y}) rotate(${((k * 37) % 5) - 2 + rot})"><rect width="${w}" height="${h}" fill="#FDFDFB" stroke="#CFCFCF" stroke-width=".4"/><text x="4" y="${h - 3}" font-family="Helvetica, Arial, sans-serif" font-size="${taille}" font-weight="600" fill="#151515">${m}</text></g>`;
    cx += w + 3;
    return g;
  }).join('');
}
/** Écran de téléphone. */
function ecranGsm(id, titre, contenu, { w = 220, h = 320 } = {}) {
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="#2C2622"/>
    <g transform="rotate(-3 ${w / 2} ${h / 2})"><rect x="40" y="14" width="${w - 80}" height="${h - 28}" rx="16" fill="#0E0F12"/>
    <rect x="46" y="30" width="${w - 92}" height="${h - 60}" rx="4" fill="#F4F5F7"/>
    <rect x="46" y="30" width="${w - 92}" height="22" fill="#E3E6EA"/><text x="${w / 2}" y="45" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="9" font-weight="700" fill="#222">${titre}</text>
    ${contenu}</g>${finPhoto(id, w, h, 0.1)}`);
}
/** La cassette d'étiqueteuse saisie (photo générée, sans texte) : légende de la saisie et ce que garde le ruban encreur. */
const cassette = (id, legende, ruban) => svg(id, 1024, 559, `<image href="img/corbeau/cassette.webp" width="1024" height="559"/>
    <g transform="translate(560 430)"><rect width="440" height="96" rx="4" fill="#F4F2EC" opacity=".96"/>${ligne(18, 30, 'Ruban encreur déroulé (négatif, lu à l’envers) :', { taille: 15 })}${ligne(18, 66, ruban, { taille: 17, gras: true })}</g>
    <rect x="12" y="12" width="520" height="26" rx="3" fill="#000" opacity=".55"/>${ligne(22, 30, legende, { taille: 14, coul: '#F5F5F5' })}`);
/** Registre du point relais de la librairie (lignes [heure de remise, expéditeur, destinataire, statut]). */
const registreRelais = (id, lignes) => feuille(id, 280, 230, '#3E4A54', 1.5, `
    ${ligne(36, 34, 'COLIS-POINT · REGISTRE DU POINT RELAIS', { taille: 7.5, gras: true })}
    ${ligne(36, 46, 'Librairie Dufrasne · rue d’Havré · ouvert 9:30-18:30', { taille: 6.5, coul: '#555' })}
    <path d="M36 54H246" stroke="#999"/>
    ${lignes.map((r, k) => `${ligne(36, 72 + k * 22, r[0], { taille: 7.4 })}${ligne(96, 72 + k * 22, r[1], { taille: 7.4 })}${ligne(168, 72 + k * 22, r[2], { taille: 7.4 })}${ligne(214, 72 + k * 22, r[3], { taille: 7.4 })}<path d="M214 ${76 + k * 22}q8 -6 18 0q6 -8 12 2" stroke="#2A3A8A" fill="none"/>`).join('')}
    ${ligne(36, 180, 'Signature du destinataire à la remise.', { taille: 6.5, coul: '#777' })}`);
/** Écran de la plateforme de livraison : le trajet de Jordan (et, s'il y en a, un arrêt marqué sur la carte). */
const gpsLivraisons = (id, arret, bilan) => ecranGsm(id, 'Livraisons · jeudi', `
    <rect x="46" y="52" width="128" height="170" fill="#E8EEE4"/>
    <g stroke="#FFFFFF" stroke-width="5"><path d="M50 120H170M110 56V220M60 70L160 200"/></g>
    <path d="M70 70L92 98L104 120L122 140L132 172L150 196" stroke="#1E88E5" stroke-width="3" fill="none"/>
    ${[[70, 70], [104, 120], [132, 172], [150, 196]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#E53935"/>`).join('')}
    ${ligne(108, 114, '22:10', { taille: 6.5, coul: '#1E88E5', gras: true })}${ligne(112, 124, 'r. d’Havré · 18 km/h', { taille: 5, coul: '#333' })}${arret}
    ${ligne(52, 240, 'Compte : Ryan L. · 21:30 → 22:45', { taille: 6.5 })}${ligne(52, 252, bilan, { taille: 6.5 })}`);

// ───── Photos des pièces ─────
export const PHOTOS_CORBEAU = {
  'c:labo1': (id) => svg(id, 320, 230, `${defsPhoto(id, 320, 230)}<rect width="320" height="230" fill="#26313A"/>
    <rect x="18" y="14" width="284" height="200" fill="#4C6070" opacity=".85"/>
    ${Array.from({ length: 60 }, (_, k) => { const x = 24 + ((k * 47) % 272), y = 20 + ((k * 31) % 186); return (x > 78 && x < 242 && y > 26 && y < 198) ? '' : `<ellipse cx="${x}" cy="${y}" rx="${2 + (k % 3)}" ry="${1.4 + (k % 2)}" fill="#D9DEE2" opacity=".35"/>`; }).join('')}
    <rect x="80" y="28" width="160" height="170" fill="#F6F5F1"/>
    <rect x="80" y="28" width="160" height="170" fill="url(#${id}pl)"/>
    ${['LE PRÉSIDENT', 'SE SERT DANS', 'LA CAISSE DES', 'COLIS DE NOËL.', 'ET DANS LES', 'COMPTES DE CEUX', 'QU’IL « AIDE ».'].map((t, k) => ligne(160, 52 + k * 17, t, { taille: 11, gras: true, police: 'font-family="Impact, Arial Black, sans-serif"', ancre: 'middle' })).join('')}
    ${ligne(160, 186, '— LE CORBEAU D’HAVRÉ', { taille: 7, ancre: 'middle' })}
    <path d="M232 30q8 6 6 14" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".6"/>
    ${ligne(22, 224, 'Film électrostatique A2 · vitrine de la pharmacie · scellé 4/6', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 320, 230, 0.12)}`),

  'c:labo2': (id) => feuille(id, 260, 300, '#3A3C40', -2, `
    ${ruban(40, 56, ['NATHALIE.'])}
    ${ruban(40, 82, ['TES', 'COURONNES', 'ONT-ELLES'])}
    ${ruban(40, 100, ['DÉJÀ', 'SERVI', 'AU', 'CIMETIÈRE', '?'])}
    ${ruban(40, 136, ['TOUTE', 'LA', 'RUE', 'VA', 'LE', 'SAVOIR.'])}
    ${ruban(130, 196, ['LE', 'CORBEAU'])}
    ${ligne(36, 268, 'Lettre n° 2 · reçue le 26/9 · ruban 12 mm · scellé L2', { taille: 6.4, coul: '#666' })}`, { papier: '#FFFFFF' }),

  'c:labo3': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#3E3A36"/>
    ${[0, 1, 2, 3].map((k) => `<g transform="translate(${26 + k * 16} ${30 + k * 34}) rotate(${[-4, 3, -2, 5][k]})"><rect width="200" height="100" fill="#C29A62"/><rect width="200" height="100" fill="none" stroke="#A07C48"/>
      <circle cx="166" cy="26" r="15" fill="none" stroke="#3A3A6A" stroke-width="1.4" opacity=".7"/><text x="166" y="24" text-anchor="middle" ${MONO} font-size="5.6" fill="#3A3A6A" opacity=".8">MONS X</text><text x="166" y="32" text-anchor="middle" ${MONO} font-size="5.6" fill="#3A3A6A" opacity=".8">${['24-9', '25-9', '28-9', '6-10'][k]}</text>
      ${ruban(30, 52, ['RUE', 'D’HAVRÉ', '7000', 'MONS'], { taille: 6, h: 9 })}</g>`).join('')}
    ${ligne(16, 212, 'Enveloppes kraft C5 « Bürokraft » · 10 scellés', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 300, 220, 0.12)}`),

  'c:direct': (id) => svg(id, 640, 180, [0, 1].map((k) => `<svg x="${k * 320}" y="0" width="320" height="180" viewBox="0 0 320 180">${defsPhoto(`${id}${k}`, 320, 180)}
      <rect width="320" height="180" fill="#5A4636"/><rect y="0" width="320" height="70" fill="#6E5644"/><rect x="40" y="88" width="240" height="14" fill="#3A2A1E"/>
      ${[70, 110, 150, 190, 230].map((x, j) => (k === 1 && j === 3) ? `<g transform="translate(${x + 30} 100)"><rect x="-9" y="-46" width="18" height="44" rx="5" fill="#2C2C34"/><circle cy="-54" r="8" fill="#C9A890"/></g>` : `<g transform="translate(${x} 86)"><rect x="-10" y="-26" width="20" height="26" rx="5" fill="${['#3A4A5A', '#5A3A3A', '#2C3A2C', '#2C2C34', '#4A4A3A'][j]}"/><circle cy="-34" r="8" fill="#C9A890"/></g>`).join('')}
      ${k === 1 ? '' : '<g transform="translate(230 86)"><rect x="-10" y="-26" width="20" height="26" rx="5" fill="#2C2C34"/><circle cy="-34" r="8" fill="#C9A890"/></g>'}
      ${Array.from({ length: 14 }, (_, j) => `<circle cx="${20 + j * 22}" cy="${150 + (j % 2) * 10}" r="9" fill="#2A221C"/>`).join('')}
      ${finPhoto(`${id}${k}`, 320, 180, 0.2)}
      <rect x="8" y="6" width="58" height="14" rx="3" fill="#E53935"/><text x="37" y="16" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="8" font-weight="700" fill="#FFF">EN DIRECT</text>
      <text x="312" y="16" text-anchor="end" ${MONO} font-size="9" fill="#FFF">${['21:48:51', '21:49:07'][k]}</text>
      <text x="8" y="172" font-family="Instrument Sans, sans-serif" font-size="8" fill="#FFF">Comité Havré-Centre · réunion d’octobre · 31 spectateurs</text></svg>`).join('') + '<path d="M320 0V180" stroke="#111" stroke-width="3"/>'),

  'c:camville': (id) => svg(id, 320, 180, cadreCam(id, 'CAM 12 · GRAND-PLACE / R. D’HAVRÉ', 'JEU 22:10:04', `<rect width="320" height="180" fill="#2A2C2E"/>
      <path d="M0 0H320V64L214 92H104L0 64Z" fill="#3A3C3E"/><path d="M0 64L104 92V180H0Z" fill="#4A4C4E"/><path d="M320 64L214 92V180H320Z" fill="#45474A"/>
      <path d="M104 92H214L300 180H20Z" fill="#5A5C5E"/><g fill="#F2F0E0"><circle cx="70" cy="34" r="4"/><circle cx="250" cy="30" r="4"/></g>
      <g transform="translate(150 150)"><circle cx="-16" cy="18" r="11" fill="none" stroke="#DDD" stroke-width="2"/><circle cx="18" cy="18" r="11" fill="none" stroke="#DDD" stroke-width="2"/><path d="M-16 18L0 0L18 18M0 0L-4 -10" stroke="#DDD" stroke-width="2" fill="none"/>
        <path d="M-6 -12q4 -22 12 -26l4 12q-6 8 -8 22z" fill="#E8E070"/><circle cx="6" cy="-42" r="6" fill="#1A1A1A"/><rect x="-14" y="-44" width="34" height="6" rx="3" fill="#111" transform="rotate(-28 2 -41)"/></g>`)),

  'c:sonnette': (id) => svg(id, 1024, 572, `<image href="img/corbeau/sonnette.webp" width="1024" height="572"/>
    <text x="150" y="60" ${MONO} font-size="22" fill="#F5F5F5">PHARMACIE D’HAVRÉ · SONNETTE</text><text x="880" y="530" text-anchor="end" ${MONO} font-size="24" fill="#F5F5F5">JEU 21:52:14</text>`),

  'c:septieme': (id) => svg(id, 1024, 572, `<image href="img/corbeau/porte.webp" width="1024" height="572"/>
    ${['MADAME ODILE.', 'NE SIGNEZ', 'RIEN LUNDI.', 'CELUI QUI', 'VOUS AIDE', 'VOUS VOLE.'].map((t, k) => ligne(510, 190 + k * 20, t, { taille: k === 0 ? 10.5 : 13, gras: true, police: 'font-family="Impact, Arial Black, sans-serif"', ancre: 'middle' })).join('')}
    <g transform="translate(562 169)"><rect width="7" height="129" fill="#F5F2E8" stroke="#333" stroke-width=".5"/>${[0, 1, 2, 3, 4, 5, 6].map((k) => `<rect y="${k * 18}" width="7" height="9" fill="#C62828"/>`).join('')}</g>
    <rect x="12" y="540" width="420" height="24" rx="3" fill="#000" opacity=".55"/>${ligne(22, 557, 'Cour du n° 40 · porte de Mme Hautecœur · vendredi 9:52 · à 1,40 m', { taille: 13, coul: '#F5F5F5' })}`),

  'moy:0': (id) => svg(id, 300, 230, `${defsPhoto(id, 300, 230)}<rect width="300" height="230" fill="#3A2E26"/>
    <g transform="rotate(-8 90 120)"><rect x="20" y="60" width="150" height="90" fill="#C29A62"/><path d="M20 60L95 112L170 60" fill="none" stroke="#A07C48" stroke-width="1.2"/>
      ${ruban(34, 120, ['MADAME', 'ODILE', 'HAUTECŒUR'], { taille: 6, h: 9 })}${ruban(52, 136, ['EN', 'MAIN', 'PROPRE'], { taille: 6, h: 9 })}</g>
    <g transform="translate(150 30) rotate(5)"><rect width="130" height="170" fill="#FFFFFF"/>
      ${ruban(10, 22, ['MADAME', 'ODILE.'], { taille: 6.4, h: 10 })}${ruban(10, 46, ['NE', 'SIGNEZ', 'RIEN', 'LUNDI.'], { taille: 6.4, h: 10 })}
      ${ruban(10, 70, ['CELUI', 'QUI', 'VOUS', 'AIDE'], { taille: 6.4, h: 10 })}${ruban(10, 86, ['VOUS', 'VOLE.'], { taille: 6.4, h: 10 })}${ruban(54, 130, ['UNE', 'AMIE.'], { taille: 6.4, h: 10 })}</g>
    ${ligne(14, 222, 'Perquisition Vanderhaegen · tiroir du bureau · pas de timbre', { taille: 6.5, coul: '#EEE' })}
    ${finPhoto(id, 300, 230, 0.12)}`),

  'moy:4': (id) => cassette(id, 'Perquisition Librairie Dufrasne · bac à papier · cassette usagée', '« MADAME ODILE. NE SIGNEZ RIEN LUNDI. »'),

  'mob:4': (id) => registreRelais(id, [['LUN 10:12', 'Bol.com', 'J. Pire', 'remis'], ['MAR 11:40', 'Zalando', 'S. Cornez', 'remis'], ['MAR 18:41', 'AfficheExpress', 'M. Odon', 'remis'], ['MER 16:05', 'Amazon', 'G. Petit', 'remis']]),

  'occ:3': (id) => gpsLivraisons(id, '', '6 courses · 0 arrêt hors adresse'),

  'd:lettre': (id) => feuille(id, 260, 200, '#3E4A54', 3, `
    ${ruban(36, 50, ['VOUS', 'COMPTEZ', 'LES', 'LETTRES', '?'])}
    ${ruban(36, 74, ['IL', 'EN', 'MANQUE', 'UNE.'])}
    ${ruban(36, 98, ['LA', 'PREMIÈRE.'])}
    ${ruban(36, 122, ['LE', 'PRÉSIDENT', 'SAIT', 'OÙ', 'ELLE', 'EST.'])}
    ${ligne(36, 166, 'Sans timbre · boîte du commissariat', { taille: 6.6, coul: '#777' })}`, { papier: '#FFFFFF' }),
};
// Variante b (Jordan Lambotte, le corbeau) : sa cassette parle, celle de la librairie ne garde que des prix ; le GPS
// garde son arrêt ; le colis de Gand a été retiré le mercredi. La photo de la cassette ne porte aucun texte.
export const PHOTOS_CORBEAU_B = {
  ...PHOTOS_CORBEAU,
  'moy:3': (id) => cassette(id, 'Perquisition Lambotte · Jemappes · poubelle de l’atelier · cassette usagée', '« MADAME ODILE. NE SIGNEZ RIEN LUNDI. »'),
  'moy:4': (id) => cassette(id, 'Perquisition Librairie Dufrasne · bac à papier · cassette usagée', '« POCHE · BD · 4,90 € · 12,50 € · POCHE »'),
  'mob:4': (id) => registreRelais(id, [['LUN 10:12', 'Bol.com', 'J. Pire', 'remis'], ['MAR 11:40', 'Zalando', 'S. Cornez', 'remis'], ['MER 16:05', 'Amazon', 'G. Petit', 'remis'], ['MER 17:52', 'AfficheExpress', 'M. Odon', 'remis']]),
  'occ:3': (id) => gpsLivraisons(id, `<circle cx="138" cy="150" r="5" fill="none" stroke="#E53935" stroke-width="2"/>${ligne(60, 162, 'arrêt 21:48 → 21:56', { taille: 5.6, coul: '#E53935', gras: true })}`, '6 courses · 1 arrêt (8 min)'),
};
/** Photos des pièces du corbeau dans la variante de l'affaire. */
export const photosCorbeau = (variante) => (variante === 'b' ? PHOTOS_CORBEAU_B : PHOTOS_CORBEAU);

// ───── La scène à fouiller ─────
export const PHOTO_SCENE_CORBEAU = { src: 'img/corbeau/scene.webp', mini: 'img/corbeau/scene-mini.webp', w: 1376, h: 768 };
// px/py : coordonnées sur la photo de la scène.
export const POINTS_SCENE_CORBEAU = [
  { k: 'fleuriste', n: 1, px: 92, py: 470, titre: 'Le fleuriste', texte: 'Le Jardin d’Havré, le fleuriste. Pas d’affiche ici : la vitrine est pleine de fleurs et de cartes, et les étagères débordent sur le trottoir.' },
  { k: 'imprimerie', n: 2, px: 262, py: 450, titre: 'Imprim’Havré', texte: 'Une grande affiche sur la vitrine. À côté, une petite feuille scotchée à l’intérieur : « Grand format indisponible jusqu’à nouvel ordre (panne). Merci de votre compréhension. »' },
  { k: 'librairie', n: 3, px: 424, py: 450, titre: 'La Librairie Dufrasne', texte: 'Une affiche, comme sur les autres vitrines. Sur la porte, un autocollant « Point relais Colis-Point » et les horaires : du mardi au samedi, 9:30-18:30. Elle est à quinze mètres de la porte du café.' },
  { k: 'comptoir', n: 4, px: 640, py: 420, titre: 'Le Comptoir d’Havré', texte: 'La salle de la réunion, éclairée. Au fond, un téléphone sur un pied, tourné vers la table du bureau. Une porte vitrée, derrière le bar, donne sur une petite cour.' },
  { k: 'pharmacie', n: 5, px: 798, py: 450, titre: 'La pharmacie', texte: 'Une affiche sur la vitrine. Au-dessus de la porte, une sonnette vidéo, l’objectif tourné vers le trottoir.' },
  { k: 'porche', n: 6, px: 1050, py: 470, titre: 'Le porche du n° 40', texte: 'Un porche ouvert mène à une cour pavée et, au fond, à une porte basse : chez Odile Hautecœur. Dans le porche, sa boîte aux lettres. Le facteur passe en fin de matinée.' },
  { k: 'evasion', n: 7, px: 1262, py: 450, titre: 'L’agence Évasion', texte: 'Une affiche, au-dessus de photos de voyages. Même hauteur que sur les autres vitrines, à hauteur d’homme.' },
  { k: 'papier', n: 8, px: 300, py: 580, titre: 'Sur le trottoir', texte: 'Devant l’imprimerie, un petit ruban de papier blanc, glacé d’un côté, enroulé sur lui-même, encore sec. Le labo le saisit : du papier siliconé, comme celui qui protège un autocollant ou un film avant la pose.' },
  { k: 'pave', n: 9, px: 700, py: 680, titre: 'La chaussée', texte: 'Les pavés brillent encore ; de petites flaques sous les gouttières. La drache s’est arrêtée une heure avant le passage de la patrouille.' },
  { k: 'lampadaire', n: 10, px: 490, py: 170, titre: 'Le lampadaire', texte: 'Le seul de ce tronçon. Sa lumière n’atteint pas les vitrines du bout de la rue. Aucune caméra communale ici : la plus proche est à l’angle de la Grand-Place.' },
];

export function sceneCorbeauSvg(sel, vus, esc) {
  const P = PHOTO_SCENE_CORBEAU;
  return `<svg viewBox="0 0 ${P.w} ${P.h}" role="img" aria-label="La rue d’Havré de nuit, avec dix plots numérotés">
    <image href="${P.src}" width="${P.w}" height="${P.h}" preserveAspectRatio="xMidYMid slice"/>
    ${POINTS_SCENE_CORBEAU.map((p) => `<g class="sf-plot ${sel && sel.k === p.k ? 'on' : ''} ${vus.has(p.k) ? 'vu' : ''}" data-action="scene-pt" data-k="${p.k}" transform="translate(${p.px} ${p.py}) scale(2.6)" tabindex="0" role="button" aria-label="Plot ${p.n} : ${esc(p.titre)}">
      <circle r="22" fill="transparent"/><path d="M-11 0L0 -20L11 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width="1.2"/><text y="-5" text-anchor="middle" font-family="'Special Elite', monospace" font-size="11" fill="#1D1A15">${p.n}</text></g>`).join('')}
  </svg>`;
}

// ───── Une du journal et vignette de la scène ─────
/** La rue d'Havré, la nuit, une patrouille sur place (une du journal). */
export function photoUneCorbeau(id = 'un') {
  return `<svg viewBox="0 0 960 536" class="tb-photo-svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><image href="img/corbeau/une.webp" width="960" height="536" preserveAspectRatio="xMidYMid slice"/></svg>`;
}
/** Vignette de la scène au tableau. */
export function photoSceneCorbeau(id = 'sc') {
  return `<svg viewBox="0 0 480 268" class="tb-photo-svg" aria-hidden="true"><image href="${PHOTO_SCENE_CORBEAU.mini}" width="480" height="268"/></svg>`;
}
