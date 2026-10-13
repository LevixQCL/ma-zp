// Visuels de l'affaire « Le notaire de la Rampe » : photos des pièces, scène à fouiller, une du journal.
// Même règle que pour la première affaire : l'indice se lit dans l'image (une heure, un détail), sans être souligné.
import { MONO, MAIN, TAPE, defsPhoto, finPhoto, svg } from './photo-base.js';

/** Silhouettes de la caméra : femme aux cheveux longs, homme à capuche (avec ou sans dossier), femme en ciré clair. */
function personne(x, y, s, type, { dossier = false, dos = false } = {}) {
  const sombre = type === 'cire' ? '#9EA0A2' : '#161616';
  const tete = type === 'femme' ? `<ellipse cx="0" cy="-44" rx="6" ry="7.5" fill="#1A1A1A"/><path d="M-7 -46q-2 14 -3 20h5zM7 -46q2 14 3 20h-5z" fill="#1A1A1A"/>`
    : type === 'capuche' ? '<path d="M-9 -38q-1 -16 9 -16t9 16z" fill="#121212"/><ellipse cx="0" cy="-42" rx="4.6" ry="5.8" fill="#0A0A0A"/>'
      : '<path d="M-8 -38q-1 -15 8 -15t8 15z" fill="#B4B6B8"/><ellipse cx="0" cy="-42" rx="4.4" ry="5.4" fill="#2A2A2A"/>';
  const corps = type === 'capuche' ? 'M-11 -36Q-14 -8 -12 24L-5 26L0 2L5 26L12 24Q14 -8 11 -36Q0 -40 -11 -36Z' : 'M-10 -34Q-13 -8 -12 22L-5 24L0 2L5 24L12 22Q13 -8 10 -34Q0 -38 -10 -34Z';
  return `<g transform="translate(${x} ${y}) scale(${s})">${tete}<path d="${corps}" fill="${sombre}"/>
    ${dossier ? `<rect x="${dos ? -13 : 2}" y="-24" width="12" height="16" rx="1" fill="#2C2C2C" transform="rotate(${dos ? -8 : 8})"/>` : ''}</g>`;
}
function vignetteCam(id, x, y, heure, inner) {
  return `<svg x="${x}" y="${y}" width="320" height="180" viewBox="0 0 320 180">${defsPhoto(id, 320, 180, { gris: true })}
    <image href="img/rampe/cam.webp" width="320" height="179" preserveAspectRatio="xMidYMid slice"/><g style="filter:grayscale(1)">${inner}</g>
    <g opacity=".18">${Array.from({ length: 45 }, (_, k) => `<rect y="${k * 4}" width="320" height="1.2" fill="#000"/>`).join('')}</g>
    ${finPhoto(id, 320, 180, 0.3)}
    <text x="8" y="14" ${MONO} font-size="9" fill="#F5F5F5">CAB. KINÉ · PORTE</text>
    <text x="312" y="14" text-anchor="end" ${MONO} font-size="9" fill="#F5F5F5">JEU ${heure}</text>
    <circle cx="10" cy="171" r="3" fill="#E53935"/><text x="17" y="174" ${MONO} font-size="8" fill="#F5F5F5">REC</text></svg>`;
}
/** Feuille imprimée (listing, relevé) posée de travers sur une table. */
function feuille(id, w, h, fond, rot, contenu, { papier = '#FBF9F2', grain = 0.12 } = {}) {
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="${fond}"/>
    <g transform="rotate(${rot} ${w / 2} ${h / 2})"><rect x="${w * 0.08}" y="${h * 0.06}" width="${w * 0.84}" height="${h * 0.88}" fill="${papier}"/>${contenu}</g>
    ${finPhoto(id, w, h, grain)}`);
}
const ligne = (x, y, t, { taille = 8.5, coul = '#222', gras = false, police = MONO } = {}) => `<text x="${x}" y="${y}" ${police} font-size="${taille}" fill="${coul}"${gras ? ' font-weight="600"' : ''}>${t}</text>`;
/** Écran de téléphone (SMS, messagerie, wifi). */
function ecranGsm(id, titre, contenu, { w = 220, h = 320 } = {}) {
  return svg(id, w, h, `${defsPhoto(id, w, h)}<rect width="${w}" height="${h}" fill="#2C2622"/>
    <g transform="rotate(-3 ${w / 2} ${h / 2})"><rect x="40" y="14" width="${w - 80}" height="${h - 28}" rx="16" fill="#0E0F12"/>
    <rect x="46" y="30" width="${w - 92}" height="${h - 60}" rx="4" fill="#F4F5F7"/>
    <rect x="46" y="30" width="${w - 92}" height="22" fill="#E3E6EA"/><text x="${w / 2}" y="45" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="9" font-weight="700" fill="#222">${titre}</text>
    ${contenu}</g>${finPhoto(id, w, h, 0.1)}`);
}

/** Cendres de la cheminée, avec le fragment de la liste du Cercle qui a échappé au feu (perquisition de l'assassin). */
const cendres = (id, fragment) => svg(id, 1024, 572, `<image href="img/rampe/cendres.webp" width="1024" height="572"/>
    <g transform="translate(545 228) rotate(-2)" style="mix-blend-mode:multiply">
      <text x="0" y="-62" text-anchor="middle" ${TAPE} font-size="13" fill="#7A2E26">CERCLE SAINT-GEORGES</text>
      <text x="0" y="-44" text-anchor="middle" ${TAPE} font-size="11" fill="#7A2E26">Acteurs du Combat · 1999</text>
      <path d="M-96 -32H96" stroke="#7A2E26" stroke-width="1" opacity=".6"/>
      <text x="-102" y="2" ${MONO} font-size="13.5" fill="#2A2420" textLength="204" lengthAdjust="spacingAndGlyphs">${fragment}</text>
      <text x="-102" y="26" ${MONO} font-size="13.5" fill="#2A2420" opacity=".35" textLength="150" lengthAdjust="spacingAndGlyphs">…euilles · n° 8 : …</text></g>`);
/** Journal des badges de l'immeuble du boulevard Dolez (lignes [heure, sens, nom]) et ce que montre la caméra du couloir. */
const badgesDolez = (id, lignes, couloir) => feuille(id, 300, 220, '#33404A', 1, `
    ${ligne(40, 32, 'IMMEUBLE DOLEZ · CONTRÔLE D’ACCÈS · JEUDI', { taille: 7.4, gras: true })}
    <path d="M40 38H262" stroke="#999" stroke-dasharray="2 2"/>
    ${lignes.map(([h, t, q], k) => ligne(40, 58 + k * 18, `${h}   ${t.padEnd(8, ' ')} ${q}`, { taille: 8 })).join('')}
    <path d="M40 152H262" stroke="#999" stroke-dasharray="2 2"/>
    ${ligne(40, 170, 'Caméra couloir 2e étage : 1 personne', { taille: 7.2 })}${ligne(40, 184, couloir, { taille: 7.2 })}`);
/** Liste des douze hommes de feuilles du Combat de 1999, dans l'ordre des brassards. */
const listeCercle = (id, noms) => feuille(id, 240, 290, '#3A2E26', -1, `
    <text x="120" y="42" text-anchor="middle" ${TAPE} font-size="8.5" fill="#7A2E26">CERCLE SAINT-GEORGES</text>
    <text x="120" y="56" text-anchor="middle" ${TAPE} font-size="7.4" fill="#222">Combat 1999 · hommes de feuilles</text>
    ${noms.map((n, k) => `<text x="44" y="${76 + k * 15}" ${TAPE} font-size="7.6" fill="#222">n° ${String(k + 1).padStart(2, ' ')}  ${n}</text>`).join('')}`, { papier: '#F4EEDC' });

// ───── Photos des pièces ─────
export const PHOTOS_RAMPE = {
  'c:cam': (id) => svg(id, 640, 540, [
    vignetteCam(`${id}1`, 0, 0, '22:04:12', personne(52, 150, 0.68, 'femme')),
    vignetteCam(`${id}2`, 320, 0, '22:31:40', personne(118, 172, 0.95, 'femme', { dos: true })),
    vignetteCam(`${id}3`, 0, 180, '22:47:20', personne(54, 150, 0.74, 'capuche')),
    vignetteCam(`${id}4`, 320, 180, '23:09:31', personne(122, 174, 1.0, 'capuche', { dossier: true, dos: true })),
    vignetteCam(`${id}5`, 0, 360, '23:36:18', personne(52, 150, 0.66, 'cire')),
    vignetteCam(`${id}6`, 320, 360, '23:39:02', personne(132, 174, 0.95, 'cire', { dos: true })),
  ].join('') + '<path d="M320 0V540M0 180H640M0 360H640" stroke="#111" stroke-width="3"/>'),

  'c:tel1': (id) => feuille(id, 300, 230, '#3E4A54', -2, `
    ${ligne(40, 34, 'PROXIMUS · RELEVÉ DÉTAILLÉ · RÉQUISITION', { taille: 7.5, gras: true })}
    ${ligne(40, 46, 'Ligne 0475 ** ** 18 · titulaire HENNEBERT J.-B.', { taille: 7 })}
    <path d="M40 52H262" stroke="#999" stroke-dasharray="2 2"/>
    ${[['21:47:02', 'APPEL SORT.', 'STIÉVENART R.', '41 s'], ['22:33:15', 'APPEL ENTR.', 'STIÉVENART R.', 'non déc.'], ['22:41:38', 'SMS SORT.', 'HENNEBERT É.', '1'], ['22:42:20', 'APPEL ENTR.', 'HENNEBERT É.', 'rejeté'], ['22:44:51', 'DÉTACHEMENT', '—', 'éteint']].map(([h, t, q, d], k) => ligne(40, 72 + k * 18, `${h}  ${t.padEnd(12, ' ')} ${q.padEnd(12, ' ')} ${d}`, { taille: 7.4 })).join('')}
    <path d="M40 166H262" stroke="#999" stroke-dasharray="2 2"/>
    ${ligne(40, 182, 'Plus aucun événement après 22:44:51.', { taille: 7, coul: '#555' })}
    ${ligne(196, 206, 'p. 1/1', { taille: 7, coul: '#555' })}`, { papier: '#F2F6F0' }),

  'c:tel2': (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#222"/>
    <rect x="20" y="16" width="260" height="168" rx="6" fill="#F6F7F9"/><rect x="20" y="16" width="260" height="22" rx="6" fill="#2F6FD3"/>
    <text x="30" y="31" font-family="Instrument Sans, sans-serif" font-size="9" font-weight="700" fill="#FFF">Box internet · appareils connus · journal</text>
    ${[['GSM-JB-HENNEBERT', '14:02', '22:09', '#C2302B'], ['Tablette-salon', '08:15', '—', '#2E9E62'], ['Imprimante-étude', '09:00', '—', '#2E9E62']].map(([n, a, b, c], k) => `
      <circle cx="38" cy="${62 + k * 34}" r="5" fill="${c}"/>${ligne(50, 66 + k * 34, n, { taille: 9, gras: true })}${ligne(50, 79 + k * 34, `connecté depuis ${a} · ${b === '—' ? 'toujours connecté' : `déconnecté à ${b}`}`, { taille: 7.4, coul: '#555' })}`).join('')}
    ${ligne(32, 172, 'Jeudi · heure de la box (synchronisée sur Internet)', { taille: 7, coul: '#777' })}
    ${finPhoto(id, 300, 200, 0.08)}`),

  'c:legiste1': (id) => feuille(id, 220, 280, '#5E6F64', 2, `
    ${ligne(36, 40, 'MÉDECINE LÉGALE · CONSTATS', { taille: 8, gras: true })}
    <g transform="translate(110 130)"><ellipse rx="44" ry="56" fill="none" stroke="#333" stroke-width="1.4"/><path d="M-44 -6q44 -30 88 0" fill="none" stroke="#333"/>
      <circle cx="-34" cy="-6" r="7" fill="none" stroke="#B3261E" stroke-width="2"/><text x="-60" y="-20" ${MONO} font-size="7" fill="#B3261E">tempe G</text>
      <path d="M10 46q8 8 20 2" stroke="#B3261E" stroke-width="2" fill="none"/><text x="18" y="66" ${MONO} font-size="7" fill="#B3261E">occiput</text></g>
    ${ligne(36, 214, '1 · ronde, nette, 4 cm', { taille: 7.5 })}${ligne(36, 228, '2 · arête de marche, peu de sang', { taille: 7.5 })}${ligne(36, 246, 'Décès : 21:00 → 23:30', { taille: 8, gras: true })}`),

  'c:legiste2': (id) => svg(id, 1024, 572, `<image href="img/rampe/moulage.webp" width="1024" height="572"/>
    <g transform="translate(511 270) scale(1 .82)" style="mix-blend-mode:multiply" opacity=".78">
      <text x="0" y="8" text-anchor="middle" font-family="'Special Elite', monospace" font-size="27" fill="#5A5A5A" letter-spacing="2">…BERT</text>
      <path d="M0 -38l3.6 7.4 8.1.9-6 5.4 1.8 8L0 -20.4l-7.5 3.7 1.8-8-6-5.4 8.1-.9z" fill="#5A5A5A"/></g>
    <g transform="rotate(-3 300 470)"><rect x="196" y="452" width="212" height="40" fill="#F4F2EC" stroke="#CFCBC0"/><text x="208" y="477" ${MONO} font-size="14" fill="#333" textLength="188" lengthAdjust="spacingAndGlyphs">MOULAGE · PLAIE TEMPE G.</text></g>
    <path d="M396 456Q450 400 470 330" stroke="#F4F2EC" stroke-width="3" fill="none" stroke-dasharray="6 5"/>
    <g transform="translate(-24 0) rotate(4 920 140)"><rect x="846" y="256" width="150" height="26" fill="#F4F2EC" stroke="#CFCBC0"/><text x="854" y="274" ${MONO} font-size="12" fill="#555" textLength="134" lengthAdjust="spacingAndGlyphs">trouvé · cuisine</text><path d="M846 26H996V246L986 252 976 246 966 252 956 246 946 252 936 246 926 252 916 246 906 252 896 246 886 252 876 246 866 252 856 246 846 252Z" fill="#FBF9F2" stroke="#DDD"/>
      <text x="858" y="54" ${MONO} font-size="15" font-weight="600" fill="#222">TRAITEUR</text><text x="858" y="72" ${MONO} font-size="11" fill="#555" textLength="126" lengthAdjust="spacingAndGlyphs">livraison à domicile</text>
      <text x="858" y="100" ${MONO} font-size="13" fill="#222">JEU.     19:08</text><text x="858" y="120" ${MONO} font-size="11" fill="#222" textLength="120" lengthAdjust="spacingAndGlyphs">RAMPE STE-WAUDRU</text>
      <text x="858" y="150" ${MONO} font-size="12" fill="#222" textLength="126" lengthAdjust="spacingAndGlyphs">1 SOUPE      4,50</text><text x="858" y="170" ${MONO} font-size="11" fill="#222" textLength="126" lengthAdjust="spacingAndGlyphs">1 VOL-AU-VENT 14,00</text>
      <text x="858" y="204" ${MONO} font-size="14" font-weight="600" fill="#222" textLength="126" lengthAdjust="spacingAndGlyphs">TOTAL  18,50 €</text></g>`),
  'c:labo': (id) => svg(id, 1024, 572, `<image href="img/rampe/verres.webp" width="1024" height="572"/>
    <g transform="rotate(-2 170 170)"><rect x="96" y="136" width="196" height="64" fill="#F4F2EC" stroke="#CFCBC0"/><text x="108" y="161" ${MONO} font-size="14" fill="#333" textLength="150" lengthAdjust="spacingAndGlyphs">SCELLÉS L-09/10</text><text x="108" y="184" ${MONO} font-size="12" fill="#666" textLength="172" lengthAdjust="spacingAndGlyphs">salon · table basse</text></g>
    <g transform="translate(-16 0) rotate(3 940 400)"><rect x="852" y="350" width="168" height="96" fill="#F4F2EC" stroke="#CFCBC0"/><text x="864" y="376" ${MONO} font-size="14" fill="#333" textLength="110" lengthAdjust="spacingAndGlyphs">SCELLÉ L-11</text><text x="864" y="399" ${MONO} font-size="12" fill="#666" textLength="144" lengthAdjust="spacingAndGlyphs">cuisine · égouttoir</text><text x="864" y="420" ${MONO} font-size="12" fill="#666" textLength="144" lengthAdjust="spacingAndGlyphs">lunettes : marche 3</text></g>`),
  'c:agenda': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#3E2E22"/>
    <g transform="rotate(-2 150 110)"><rect x="24" y="16" width="252" height="192" fill="#F4EDD6"/><path d="M150 16V208" stroke="#C8B98F" stroke-width="2"/>
    <g stroke="#D7CCAE">${Array.from({ length: 10 }, (_, k) => `<path d="M160 ${50 + k * 15}H268"/><path d="M32 ${50 + k * 15}H142"/>`).join('')}</g>
    <text x="34" y="38" ${TAPE} font-size="10" fill="#7A2E26">MARDI</text><text x="160" y="38" ${TAPE} font-size="10" fill="#7A2E26">JEUDI</text>
    <text x="40" y="76" ${MAIN} font-size="15" fill="#23335A" textLength="92" lengthAdjust="spacingAndGlyphs">Montre de Père ??</text><text x="104" y="94" ${MAIN} font-size="17" fill="#23335A">— M.</text>
    <text x="40" y="140" ${MAIN} font-size="15" fill="#23335A" opacity=".85" textLength="96" lengthAdjust="spacingAndGlyphs">Thibault — non, non</text><path d="M38 136h100" stroke="#23335A" stroke-width="1.2"/>
    <text x="166" y="62" ${MAIN} font-size="15" fill="#23335A">9 h Samira</text><text x="166" y="88" ${MAIN} font-size="15" fill="#23335A">15 h banque</text>
    <text x="166" y="136" ${MAIN} font-size="21" fill="#1B2747">21 h 45</text><text x="166" y="160" ${MAIN} font-size="19" fill="#1B2747" textLength="96" lengthAdjust="spacingAndGlyphs">le n° 7. Enfin.</text>
    <path d="M168 164q30 3 92 -1" stroke="#1B2747" stroke-width="1.2" fill="none"/></g>
    <g transform="rotate(5 238 196)"><rect x="196" y="182" width="88" height="30" fill="#F7E36A"/><text x="202" y="200" ${MAIN} font-size="12" fill="#3A2E10" textLength="76" lengthAdjust="spacingAndGlyphs">lun. 10 h Me Dutrieux (L.)</text></g>
    ${finPhoto(id, 300, 220, 0.14)}`),

  'c:lettres': (id) => svg(id, 300, 230, `${defsPhoto(id, 300, 230)}<rect width="300" height="230" fill="#4A3B2E"/>
    <g transform="rotate(-6 80 120)"><rect x="18" y="26" width="120" height="170" fill="#C9A86A"/><rect x="30" y="20" width="60" height="12" rx="2" fill="#C9A86A"/><text x="34" y="54" ${MAIN} font-size="16" fill="#3A2A12">L. M. — 1999</text><text x="40" y="120" ${MONO} font-size="8" fill="#5A4422" opacity=".7">(vide)</text></g>
    ${[['Le soir du Doudou 1999,', 'Lise n’est pas tombée', 'toute seule dans le canal.'], ['Demandez-vous pourquoi', 'Étienne Wautelet m’a prêté', 'de l’argent en juillet 99.'], ['Le n° 7 n’a jamais été', 'inquiété. Moi, je dors', 'mal depuis 27 ans.']].map((l, k) => `<g transform="translate(${140 + k * 18} ${24 + k * 58}) rotate(${[3, -2, 4][k]})"><rect width="130" height="74" fill="#FCFBF6" stroke="#DDD"/>${l.map((t, j) => `<text x="8" y="${18 + j * 14}" ${TAPE} font-size="8" fill="#222">${t}</text>`).join('')}</g>`).join('')}
    ${finPhoto(id, 300, 230, 0.12)}`),

  'c:acte': (id) => feuille(id, 240, 300, '#3A2E26', 1.5, `
    <text x="120" y="44" text-anchor="middle" ${TAPE} font-size="9" fill="#222">ACTE DE PRÊT</text>
    <text x="120" y="58" text-anchor="middle" ${MONO} font-size="6.5" fill="#444">L’an mil neuf cent nonante-neuf, le deux juillet,</text>
    <text x="120" y="68" text-anchor="middle" ${MONO} font-size="6.5" fill="#444">par-devant Maître Jean-Baptiste HENNEBERT, notaire à Mons,</text>
    ${['ONT COMPARU : M. Étienne WAUTELET, industriel,', 'prêteur, et M. Rudy STIÉVENART, cafetier,', 'emprunteur. Le prêteur remet ce jour', 'la somme de SIX CENT MILLE FRANCS', '(600.000 BEF), sans intérêts, remboursable', 'au gré de l’emprunteur.'].map((t, k) => `<text x="34" y="${92 + k * 12}" ${MONO} font-size="6.6" fill="#222">${t}</text>`).join('')}
    <text x="40" y="196" ${MAIN} font-size="16" fill="#22305A">J. Wautelet</text><text x="132" y="196" ${MAIN} font-size="16" fill="#22305A">R. Stiévenart</text>
    <text x="96" y="238" ${MAIN} font-size="19" fill="#22305A">J.-B. Hennebert</text>
    <circle cx="180" cy="250" r="20" fill="none" stroke="#7A3A30" stroke-width="1.4" opacity=".75"/><text x="180" y="253" text-anchor="middle" ${TAPE} font-size="6" fill="#7A3A30" opacity=".75">HENNEBERT</text>`, { papier: '#F2EAD3' }),

  'occ:0': (id) => feuille(id, 300, 200, '#2E3A44', -1.5, `
    ${ligne(36, 34, 'ANPR · BOULEVARD DE CEINTURE · JEUDI', { taille: 7.6, gras: true })}
    <g transform="translate(46 50)"><rect width="104" height="24" rx="3" fill="#FFF" stroke="#B3261E" stroke-width="1.6"/><rect width="10" height="24" rx="2" fill="#2F55B0"/><text x="58" y="17" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="13" font-weight="700" fill="#B3261E">1-NDU-417</text></g>
    ${ligne(160, 66, 'PEUGEOT · GRIS', { taille: 7.4 })}
    ${ligne(46, 104, '20:58:41  CAM 12  ENTRÉE CENTRE', { taille: 8 })}${ligne(46, 122, '21:36:09  CAM 12  SORTIE → JEMAPPES', { taille: 8 })}
    ${ligne(46, 148, 'Aucun autre passage jusqu’à 06:00.', { taille: 7.2, coul: '#555' })}`),

  'mob:0': (id) => ecranGsm(id, 'Papa', `
    <text x="110" y="70" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="7" fill="#888">Jeu. 22:41</text>
    <rect x="54" y="80" width="100" height="44" rx="10" fill="#E2E5EA"/><text x="62" y="98" font-family="Instrument Sans, sans-serif" font-size="9" fill="#111">Reviens. Il faut</text><text x="62" y="112" font-family="Instrument Sans, sans-serif" font-size="9" fill="#111">qu’on parle. Papa.</text>
    <text x="110" y="148" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="7" fill="#888">Dim. 19:12</text>
    <rect x="54" y="156" width="104" height="30" rx="10" fill="#E2E5EA" opacity=".7"/><text x="62" y="174" font-family="Instrument Sans, sans-serif" font-size="8.5" fill="#333">Merci pour le dîner. J.-B.</text>
    <rect x="50" y="250" width="120" height="16" rx="3" fill="#B3261E"/><text x="110" y="261" text-anchor="middle" ${MONO} font-size="7" fill="#FFF">RÉCUPÉRÉ · effacé 22:50</text>`),

  'mob:2': (id) => svg(id, 320, 200, `${defsPhoto(id, 320, 200)}<rect width="320" height="200" fill="#1B1D22"/>
    <text x="16" y="24" ${MONO} font-size="8.5" fill="#9BE7B5">LABO · MESSAGERIE RÉCUPÉRÉE · 21:47 · 41 s</text>
    <g transform="translate(16 70)">${Array.from({ length: 96 }, (_, k) => { const t = k / 96; const son = k > 62 && k < 70; const a = son ? 26 : 6 + 18 * Math.abs(Math.sin(k * 1.7) * Math.cos(k * 0.31)) * (t > 0.86 ? 0.4 : 1); return `<rect x="${k * 3}" y="${-a}" width="2" height="${a * 2}" fill="${son ? '#F2C230' : '#59C98A'}"/>`; }).join('')}</g>
    <text x="${16 + 66 * 3}" y="108" text-anchor="middle" ${MONO} font-size="7" fill="#F2C230">♪ sonnette ×2</text>
    <text x="16" y="132" ${MONO} font-size="7.6" fill="#DDD">« Rudy, c’est Jean-Baptiste Hennebert. J’ai la liste du Cercle.</text>
    <text x="16" y="146" ${MONO} font-size="7.6" fill="#DDD">Tu avais raison pour le n° 7… [sonnette] Ah, le voilà.</text>
    <text x="16" y="160" ${MONO} font-size="7.6" fill="#DDD">Je te rappelle. »</text>
    <text x="16" y="186" ${MONO} font-size="7" fill="#888">écouté 22:30 · effacé 22:31 · GSM de Rudy Stiévenart</text>
    ${finPhoto(id, 320, 200, 0.06)}`),

  'moy:2': (id) => svg(id, 1024, 860, `<rect width="1024" height="860" fill="#F2E9D6"/>
    <image href="img/rampe/doudou1999.webp" x="0" y="0" width="1024" height="765"/>
    <g transform="translate(788 566) rotate(-6)"><text text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="46" font-weight="700" fill="#2A2420" opacity=".82">7</text></g>
    <text x="512" y="826" text-anchor="middle" ${MAIN} font-size="44" fill="#3A2E20">Doudou 1999 — Lumeçon</text>`),
  'moy:1': (id) => cendres(id, '…euilles · n° 7 : G. Wau…'),
  'occ:4': (id) => badgesDolez(id, [['18:05', 'SORTIE', 'WAUTELET G.'], ['18:12', 'ENTRÉE', 'WAUTELET G.'], ['18:40', 'ENTRÉE', 'LEMPEREUR T.'], ['20:55', 'SORTIE', 'WAUTELET G.'], ['22:25', 'SORTIE', 'LEMPEREUR T.']], 'de 21:00 à 22:25 (LEMPEREUR T.).'),

  'occ:3': (id) => svg(id, 300, 190, `${defsPhoto(id, 300, 190)}<rect width="300" height="190" fill="#3C3430"/>
    <g transform="rotate(-5 110 90)"><rect x="30" y="34" width="150" height="96" rx="10" fill="#E8EEF4"/><rect x="30" y="34" width="150" height="26" rx="10" fill="#E2001A"/><rect x="30" y="50" width="150" height="10" fill="#E2001A"/>
      <text x="44" y="53" font-family="Instrument Sans, sans-serif" font-size="12" font-weight="800" fill="#FFF">MOBIB</text><text x="44" y="90" ${MONO} font-size="8" fill="#333">DEBOUCK S.</text><circle cx="156" cy="104" r="12" fill="#C9D3DC"/></g>
    <g transform="rotate(3 230 100)"><rect x="176" y="40" width="108" height="112" fill="#FBF9F2"/>
      ${ligne(184, 58, 'VALIDATIONS', { taille: 7.6, gras: true })}${ligne(184, 80, 'JEU 22:14', { taille: 8 })}${ligne(184, 92, 'Cuesmes → Mons', { taille: 7 })}${ligne(184, 114, 'JEU 22:52', { taille: 8 })}${ligne(184, 126, 'Mons → Cuesmes', { taille: 7 })}</g>
    ${finPhoto(id, 300, 190, 0.12)}`),

  'moy:3': (id) => svg(id, 1024, 572, `<image href="img/rampe/montre.webp" width="1024" height="572"/>
    <g transform="translate(500 432) rotate(16)" style="mix-blend-mode:multiply"><text x="0" y="8" text-anchor="middle" ${MONO} font-size="26" font-weight="700" fill="#B3261E">4471</text></g>
    <g transform="translate(746 360) rotate(-4)" style="mix-blend-mode:multiply" opacity=".9">
      <text x="0" y="-52" text-anchor="middle" ${TAPE} font-size="15" fill="#2A2420">PRÊT SUR GAGES</text>
      <text x="0" y="-26" text-anchor="middle" ${MONO} font-size="20" font-weight="700" fill="#B3261E">N° 4471</text>
      <text x="0" y="4" text-anchor="middle" ${MONO} font-size="12" fill="#2A2420" textLength="200" lengthAdjust="spacingAndGlyphs">montre de gousset · or 18 ct</text>
      <text x="0" y="24" text-anchor="middle" ${MONO} font-size="12" fill="#2A2420">prêté : 700 €</text>
      <text x="0" y="46" text-anchor="middle" ${MONO} font-size="12.5" font-weight="700" fill="#2A2420" textLength="196" lengthAdjust="spacingAndGlyphs">dégagé jeu. 16:10 · 735 €</text></g>`),
  'x:heure': (id) => svg(id, 300, 190, `${defsPhoto(id, 300, 190)}<rect width="300" height="190" fill="#1E2024"/>
    <rect x="24" y="20" width="252" height="150" rx="6" fill="#0D1A2A"/>
    <text x="38" y="44" ${MONO} font-size="9" fill="#7FC3FF">ENREGISTREUR · RÉGLAGES · SYSTÈME</text>
    <text x="38" y="72" ${MONO} font-size="9.5" fill="#E6F2FF">Heure système      08:47</text>
    <text x="38" y="92" ${MONO} font-size="9.5" fill="#E6F2FF">Heure d’été (auto)  NON</text>
    <text x="38" y="112" ${MONO} font-size="9.5" fill="#E6F2FF">Décalage manuel    +01:00</text>
    <rect x="34" y="124" width="232" height="28" fill="#F2C230" opacity=".9"/><text x="150" y="142" text-anchor="middle" ${MONO} font-size="9" fill="#1D1A15">Montre de l’enquêteur : 07:47</text>
    ${finPhoto(id, 300, 190, 0.06)}`),

  'x:wifi': (id) => ecranGsm(id, 'Extraction · GSM victime', `
    <text x="56" y="70" ${MONO} font-size="7" fill="#555">RÉSEAUX WIFI · JEUDI</text>
    ${[['Maison-Hennebert', '14:02 → 22:09'], ['Echevins-Clients', '22:39 → 22:44'], ['(éteint)', '22:44']].map(([n, h], k) => `<rect x="52" y="${80 + k * 30}" width="116" height="24" rx="4" fill="${k === 1 ? '#FFF3C4' : '#FFF'}" stroke="#DDD"/><text x="58" y="${91 + k * 30}" ${MONO} font-size="7.5" font-weight="600" fill="#222">${n}</text><text x="58" y="${100 + k * 30}" ${MONO} font-size="6.5" fill="#666">${h}</text>`).join('')}
    <text x="56" y="190" ${MONO} font-size="7" fill="#555">SMS ENVOYÉS</text>
    <rect x="52" y="198" width="116" height="34" rx="4" fill="#FFF" stroke="#DDD"/><text x="58" y="211" ${MONO} font-size="6.6" fill="#222">22:41 → Élodie</text><text x="58" y="223" ${MONO} font-size="6.6" fill="#B3261E">wifi : Echevins-Clients</text>
    <text x="56" y="252" ${MONO} font-size="6.4" fill="#666">47 autres SMS signés « J.-B. »</text>`),

  'x:liste': (id) => listeCercle(id, ['DEPRETER P.', 'HOUZIAUX M.', 'FOSTIER F.', 'QUINTART L.', 'BURNIAUX T.', 'ROSSIGNON J.-F.', 'WAUTELET G.', 'VERVAET D.', 'HOYAS A.', 'LANDRAIN R.', 'LEMPEREUR T.', 'NIZET S.']),

  'r:tel': (id) => svg(id, 1024, 572, `<image href="img/rampe/gsm.webp" width="1024" height="572"/>
    <rect x="300" y="520" width="424" height="34" fill="#FFF" opacity=".92"/><text x="512" y="543" text-anchor="middle" ${MONO} font-size="17" fill="#222">SCELLÉ · JARDIN DU MAYEUR · BASSIN · SAM. 07:50</text>`),
  'd:corbeau': (id) => feuille(id, 240, 200, '#3E4A54', 3, `
    ${['Vous cherchez qui il attendait jeudi ?', 'Demandez au Cercle Saint-Georges', 'qui portait le brassard n° 7 en 1999.', 'Et demandez à celui qui a pris la photo', 'ce qu’il a vu ce soir-là.'].map((t, k) => `<text x="34" y="${48 + k * 18}" ${TAPE} font-size="8.4" fill="#222">${t}</text>`).join('')}
    <text x="34" y="164" ${MONO} font-size="6.6" fill="#777">Enveloppe sans timbre · déposée dans la boîte du commissariat</text>`, { papier: '#FCFBF6' }),
};
// Variante b (Thibault Lempereur, n° 7) : les cendres sont chez lui, les badges et la liste du Cercle s'inversent.
// Les images générées (cendres, photo de 1999) ne portent aucun texte : seuls les textes posés par le jeu changent.
export const PHOTOS_RAMPE_B = {
  ...Object.fromEntries(Object.entries(PHOTOS_RAMPE).filter(([f]) => f !== 'moy:1')),
  'moy:4': (id) => cendres(id, '…euilles · n° 7 : T. Lemp…'),
  'occ:4': (id) => badgesDolez(id, [['18:05', 'SORTIE', 'WAUTELET G.'], ['18:12', 'ENTRÉE', 'WAUTELET G.'], ['18:40', 'ENTRÉE', 'LEMPEREUR T.'], ['20:55', 'SORTIE', 'LEMPEREUR T.'], ['22:10', 'SORTIE', 'WAUTELET G.']], 'de 21:00 à 22:10 (WAUTELET G.).'),
  'x:liste': (id) => listeCercle(id, ['DEPRETER P.', 'HOUZIAUX M.', 'FOSTIER F.', 'QUINTART L.', 'BURNIAUX T.', 'ROSSIGNON J.-F.', 'LEMPEREUR T.', 'VERVAET D.', 'HOYAS A.', 'LANDRAIN R.', 'WAUTELET G.', 'NIZET S.']),
};
/** Photos des pièces de la Rampe dans la variante de l'affaire. */
export const photosRampe = (variante) => (variante === 'b' ? PHOTOS_RAMPE_B : PHOTOS_RAMPE);

// ───── La scène à fouiller ─────
export const POINTS_SCENE_RAMPE = [
  { k: 'corps', n: 1, x: 124, y: 334, px: 232, py: 488, titre: 'Au pied de l’escalier', texte: 'L’endroit où la victime a été retrouvée, la tête vers la première marche. Peu de sang sur la marche. Le tapis du couloir est de travers, replié sur lui-même, comme si on l’avait tiré vers le bureau.' },
  { k: 'lunettes', n: 2, x: 186, y: 252, px: 186, py: 300, titre: 'La troisième marche', texte: 'Les lunettes de lecture de la victime, intactes, posées bien à plat, verres vers le haut.' },
  { k: 'socle', n: 3, x: 318, y: 232, px: 614, py: 388, titre: 'Le socle vide', texte: 'Sur le bureau, un petit socle en bois verni, vide : une trace ronde, propre, dans la poussière. Une plaque de cuivre : « Étude Hennebert · 1979 ».' },
  { k: 'tiroir', n: 4, x: 404, y: 270, px: 428, py: 462, titre: 'Le tiroir de gauche', texte: 'Ouvert. Une chemise cartonnée vide, étiquetée à la main : « L. M. — 1999 ». Le reste du bureau est en ordre.' },
  { k: 'sousmain', n: 5, x: 356, y: 254, px: 540, py: 410, titre: 'Le sous-main', texte: 'Le cuir est plus clair à un endroit, un petit rectangle de la taille d’un GSM. Il n’y a de GSM ni sur le bureau, ni ailleurs dans la maison.' },
  { k: 'calendrier', n: 6, photo: 'img/rampe/fenetre.webp', x: 470, y: 96, px: 676, py: 178, titre: 'Le calendrier', texte: 'Un vieux calendrier, resté ouvert sur juin 1999. Vingt-sept ans que personne ne l’a tourné.' },
  { k: 'fenetre', n: 7, photo: 'img/rampe/fenetre.webp', x: 372, y: 104, px: 548, py: 150, titre: 'La fenêtre de l’étude', texte: 'Elle donne sur les pavés de la Rampe et, en face, sur le haut mur de la Collégiale. Plus bas dans la rue, au-dessus de la porte d’un cabinet de kinésithérapie, on devine une petite caméra tournée vers la montée.' },
  { k: 'console', n: 8, x: 576, y: 236, px: 796, py: 292, titre: 'La console de l’entrée', texte: 'Une montre de gousset en or, gravée « A.H. ». À la chaîne, une étiquette en carton : « 4471 ». Pas un grain de poussière dessus, contrairement au reste du meuble.' },
  { k: 'salon', n: 9, x: 620, y: 336, px: 925, py: 468, titre: 'Le salon, par l’arche', texte: 'Sur la table basse, deux verres de porto ; l’un porte une trace de rouge à lèvres. La bouteille est presque pleine. Deux fauteuils tirés l’un vers l’autre.' },
  { k: 'cuisine', n: 10, x: 506, y: 196, px: 752, py: 246, titre: 'La porte de la cuisine', texte: 'Sur l’égouttoir, un troisième verre à porto, lavé, encore perlé d’eau. L’évier est sec, sauf sous ce verre.' },
];

/** Photo de la scène (image générée, sans texte) : les plots et ce qui se lit sont posés par le jeu par-dessus. */
export const PHOTO_SCENE_RAMPE = { src: 'img/rampe/scene.webp', mini: 'img/rampe/scene-mini.webp', w: 1024, h: 572 };
/** La scène en photo, avec ses plots (coordonnées px/py de la photo). */
export function sceneRampeSvg(sel, vus, esc) {
  const P = PHOTO_SCENE_RAMPE;
  return `<svg viewBox="0 0 ${P.w} ${P.h}" role="img" aria-label="Rez-de-chaussée de l’étude, avec dix plots numérotés">
    <image href="${P.src}" width="${P.w}" height="${P.h}" preserveAspectRatio="xMidYMid slice"/>
    ${POINTS_SCENE_RAMPE.map((p) => `<g class="sf-plot ${sel && sel.k === p.k ? 'on' : ''} ${vus.has(p.k) ? 'vu' : ''}" data-action="scene-pt" data-k="${p.k}" transform="translate(${p.px} ${p.py}) scale(2.2)" tabindex="0" role="button" aria-label="Plot ${p.n} : ${esc(p.titre)}">
      <circle r="22" fill="transparent"/><path d="M-11 0L0 -20L11 0Z" fill="#F2C230" stroke="#3A2E0A" stroke-width="1.2"/><text y="-5" text-anchor="middle" font-family="'Special Elite', monospace" font-size="11" fill="#1D1A15">${p.n}</text></g>`).join('')}
  </svg>`;
}


// ───── Une du journal et vignette de la scène ─────
/** La maison de la Rampe dans le brouillard, rubalise et gyrophares (une du journal). */
export function photoUneRampe(id = 'un') {
  return `<svg viewBox="0 0 200 112" class="tb-photo-svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><image href="img/rampe/une.webp" width="200" height="112" preserveAspectRatio="xMidYMid slice"/></svg>`;
}
/** Vignette de la scène au tableau (l'escalier et le contour). */
export function photoSceneRampe(id = 'sc') {
  return `<svg viewBox="0 0 400 224" class="tb-photo-svg" aria-hidden="true"><image href="${PHOTO_SCENE_RAMPE.mini}" width="400" height="224"/></svg>`;
}
