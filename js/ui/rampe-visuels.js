// Visuels de l'affaire « Le notaire de la Rampe » : photos des pièces, scène à fouiller, une du journal.
// Même règle que pour la première affaire : l'indice se lit dans l'image (une heure, un détail), sans être souligné.
import { MONO, MAIN, TAPE, defsPhoto, finPhoto, svg, plot, echelle } from './photo-base.js';

// ───── Briques ─────
/** La Rampe Sainte-Waudru dans le brouillard, vue de la caméra du cabinet voisin, trois maisons plus bas. */
function rampeCam(id, inner = '') {
  return `<rect width="320" height="180" fill="#3A3C3E"/>
    <path d="M0 0H320V40L0 90Z" fill="#55585A"/>
    <path d="M0 40L150 18H320V180H0Z" fill="#46494B"/>
    <g fill="#2E3032"><rect x="20" y="40" width="120" height="96"/></g>
    <rect x="62" y="74" width="34" height="62" fill="#1E1F21"/><rect x="66" y="78" width="26" height="22" fill="#6A6C64" opacity=".5"/><circle cx="88" cy="110" r="1.6" fill="#AAA"/>
    <rect x="26" y="52" width="26" height="30" fill="#7E8078" opacity=".55"/><rect x="108" y="52" width="26" height="30" fill="#5E605A" opacity=".55"/>
    <text x="80" y="70" text-anchor="middle" ${MONO} font-size="5" fill="#BBB" opacity=".6">ÉTUDE</text>
    <path d="M0 136L320 104V180H0Z" fill="#5A5D5F"/>
    <g stroke="#6C6F71" stroke-width=".8" opacity=".7">${Array.from({ length: 9 }, (_, k) => `<path d="M0 ${144 + k * 4.5}L320 ${112 + k * 7.6}"/>`).join('')}${Array.from({ length: 16 }, (_, k) => `<path d="M${k * 22} ${136 - k * 2}L${k * 24 - 20} 180"/>`).join('')}</g>
    <g transform="translate(232 40)"><rect x="-1.5" y="0" width="3" height="80" fill="#2A2A2A"/><circle cx="0" cy="0" r="5" fill="#F2F0E0"/></g>
    <circle cx="232" cy="40" r="26" fill="#F2F0E0" opacity=".28" filter="url(#${id}bb)"/>
    ${inner}
    <rect width="320" height="180" fill="#D9DCDE" opacity=".32"/>
    <path d="M0 120Q160 90 320 110V180H0Z" fill="#E4E6E8" opacity=".18"/>`;
}
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
    <g style="filter:grayscale(1) contrast(1.05)">${rampeCam(id, inner)}</g>
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

// ───── Photos des pièces ─────
export const PHOTOS_RAMPE = {
  'c:cam': (id) => svg(id, 640, 540, [
    vignetteCam(`${id}1`, 0, 0, '22:04:12', personne(84, 150, 1.1, 'femme')),
    vignetteCam(`${id}2`, 320, 0, '22:31:40', personne(150, 160, 1.15, 'femme', { dos: true })),
    vignetteCam(`${id}3`, 0, 180, '22:47:20', personne(104, 146, 1.25, 'capuche')),
    vignetteCam(`${id}4`, 320, 180, '23:09:31', personne(140, 158, 1.25, 'capuche', { dossier: true, dos: true })),
    vignetteCam(`${id}5`, 0, 360, '23:36:18', personne(90, 148, 1.08, 'cire')),
    vignetteCam(`${id}6`, 320, 360, '23:39:02', personne(170, 162, 1.1, 'cire', { dos: true })),
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

  'c:legiste2': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#4F5C55"/>
    <g transform="rotate(-3 80 110)"><rect x="18" y="24" width="120" height="176" fill="#FBF9F2"/>
      ${ligne(28, 46, 'TRAITEUR', { taille: 10, gras: true })}${ligne(28, 58, 'livraison à domicile', { taille: 6.5, coul: '#555' })}
      <path d="M28 66H128" stroke="#999" stroke-dasharray="2 2"/>
      ${ligne(28, 82, 'JEU.     19:08', { taille: 8 })}${ligne(28, 96, 'RAMPE STE-WAUDRU', { taille: 7.4 })}
      ${ligne(28, 116, '1 SOUPE      4,50', { taille: 7.6 })}${ligne(28, 130, '1 VOL-AU-VENT 14,00', { taille: 7.6 })}
      <path d="M28 140H128" stroke="#999" stroke-dasharray="2 2"/>${ligne(28, 158, 'TOTAL   18,50 €', { taille: 9, gras: true })}</g>
    <g transform="translate(222 108)"><circle r="62" fill="#E9E4DA"/><circle r="40" fill="none" stroke="#7A3A30" stroke-width="2"/><circle r="34" fill="none" stroke="#7A3A30" stroke-width=".8" stroke-dasharray="2 2"/>
      <g><text x="0" y="5" text-anchor="middle" font-family="'Special Elite', monospace" font-size="15" fill="#7A3A30" letter-spacing="1">…BERT</text>
      <path d="M0 -24l2.4 5 5.4.6-4 3.6 1.2 5.3L0 -12l-5 2.5 1.2-5.3-4-3.6 5.4-.6z" fill="#7A3A30"/></g>
      <text x="0" y="56" text-anchor="middle" ${MONO} font-size="6.5" fill="#333">moulage · plaie tempe G · ×1</text></g>
    ${finPhoto(id, 300, 220, 0.12)}`),

  'c:labo': (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#5B4636"/>
    <rect x="0" y="0" width="300" height="70" fill="#7A6250"/>
    ${[[60, 'rouge'], [110, ''], [230, 'lave']].map(([x, t]) => `<g transform="translate(${x} 128)"><path d="M-9 -30h18l-2 18q-7 6 -14 0z" fill="rgba(240,240,248,.75)" stroke="#CCC"/>${t === 'lave' ? '' : '<path d="M-6 -22h12l-1 8q-5 4 -10 0z" fill="#6A1E2A" opacity=".75"/>'}${t === 'rouge' ? '<path d="M-8 -30q3 -2 6 0" stroke="#C2302B" stroke-width="2.2"/>' : ''}<path d="M0 -12v22M-8 10h16" stroke="#DDD" stroke-width="2"/>${t === 'lave' ? '<circle cx="4" cy="-20" r="1.4" fill="#BFD7E6"/><circle cx="-3" cy="-14" r="1.1" fill="#BFD7E6"/>' : ''}</g>`).join('')}
    <path d="M190 160h80" stroke="#AAA" stroke-width="2"/><text x="230" y="176" text-anchor="middle" ${MONO} font-size="7" fill="#EEE">cuisine · égouttoir</text>
    <text x="85" y="176" text-anchor="middle" ${MONO} font-size="7" fill="#EEE">salon · table basse</text>
    ${plot(60, 160, 9)}${plot(110, 160, 9)}${plot(230, 150, 10)}${echelle(16, 186)}
    ${finPhoto(id, 300, 200, 0.14)}`),

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
    <text x="110" y="70" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="7" fill="#888">Jeu. 22:42</text>
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

  'moy:2': (id) => svg(id, 260, 300, `${defsPhoto(id, 260, 300)}<rect width="260" height="300" fill="#3A2C22"/>
    <g transform="rotate(-4 130 150)"><rect x="24" y="22" width="212" height="250" fill="#F2E9D6"/>
    <g transform="translate(36 34)"><rect width="188" height="190" fill="#A88E6A"/>
      <g style="filter:sepia(1)"><rect width="188" height="190" fill="#B89C74"/>
      ${Array.from({ length: 14 }, (_, k) => `<circle cx="${8 + k * 13}" cy="${36 + (k % 3) * 5}" r="7" fill="#8A6E4C" opacity=".7"/>`).join('')}
      <path d="M0 64H188V190H0Z" fill="#9C8058"/>
      <g transform="translate(64 168)"><ellipse cx="0" cy="-80" rx="11" ry="13" fill="#E4C9A4"/><path d="M-12 -86q12 -20 24 0q-2 -18 -12 -18t-12 18z" fill="#5A3A22"/><path d="M-12 -82q-6 24 -4 40h6zM12 -82q6 24 4 40h-6z" fill="#5A3A22"/>
        <path d="M-18 -66q18 -8 36 0l4 66h-44z" fill="#D9D2C2"/><path d="M14 -56l26 -18" stroke="#E4C9A4" stroke-width="5" stroke-linecap="round"/><path d="M40 -74q8 -4 14 -16M40 -74q10 0 18 -8M40 -74q4 -8 2 -18" stroke="#2A1E14" stroke-width="1.4" fill="none"/>
        <path d="M-6 -78q6 4 12 0" stroke="#7A4A3A" stroke-width="1.6" fill="none"/></g>
      <g transform="translate(130 170)"><path d="M-22 -110q22 -16 44 0l6 110h-56z" fill="#3E5A2A"/>${Array.from({ length: 40 }, (_, k) => `<ellipse cx="${-20 + (k * 7) % 42}" cy="${-104 + Math.floor(k / 6) * 16 + (k % 2) * 6}" rx="5" ry="3.4" transform="rotate(${(k * 37) % 180})" fill="${k % 3 ? '#4E6E34' : '#2F4A1E'}"/>`).join('')}
        <rect x="-34" y="-74" width="16" height="14" fill="#EFE7D2" stroke="#333" stroke-width=".6"/><text x="-26" y="-63" text-anchor="middle" ${MONO} font-size="11" font-weight="700" fill="#222">7</text>
        <path d="M-34 -60q-14 0 -30 -6" stroke="#4E6E34" stroke-width="6" stroke-linecap="round"/></g>
      </g></g>
    <text x="130" y="250" text-anchor="middle" ${MAIN} font-size="17" fill="#3A2E20">Doudou 1999 — Lumeçon</text></g>
    ${finPhoto(id, 260, 300, 0.16)}`),

  'moy:1': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#2A2420"/>
    <ellipse cx="150" cy="130" rx="130" ry="70" fill="#4A403A"/>${Array.from({ length: 40 }, (_, k) => `<path d="M${30 + (k * 53) % 240} ${90 + (k * 29) % 80}l${6 + (k % 5)} ${(k % 3) - 1}" stroke="#8A8580" stroke-width="${1 + (k % 3)}" opacity=".6"/>`).join('')}
    <g transform="rotate(-8 140 110)"><path d="M70 70L210 62L222 92Q200 120 214 150L130 160Q100 140 80 156L64 120Q78 98 70 70Z" fill="#EDE4CF"/>
      <path d="M70 70L210 62L222 92Q200 120 214 150L130 160Q100 140 80 156L64 120Q78 98 70 70Z" fill="none" stroke="#2A1A10" stroke-width="5" opacity=".8"/>
      <text x="86" y="90" ${TAPE} font-size="7" fill="#7A2E26">CERCLE SAINT-GEORGES · ACTEURS DU COMBAT</text>
      <text x="86" y="112" ${MONO} font-size="9" fill="#222">…euilles · n° 7 : G. Wau…</text>
      <text x="86" y="128" ${MONO} font-size="9" fill="#222" opacity=".45">…euilles · n° 8 : …</text></g>
    <g transform="translate(226 170) rotate(14)"><rect x="-26" y="-18" width="52" height="36" fill="#B89C74"/><path d="M-26 -18h52v36h-52z" fill="none" stroke="#1A1008" stroke-width="4"/>${Array.from({ length: 8 }, (_, k) => `<ellipse cx="${-16 + k * 5}" cy="${-4 + (k % 2) * 6}" rx="4" ry="2.6" fill="#3E5A2A"/>`).join('')}</g>
    ${plot(40, 206, 1)}${finPhoto(id, 300, 220, 0.16)}`),

  'occ:4': (id) => feuille(id, 300, 220, '#33404A', 1, `
    ${ligne(40, 32, 'IMMEUBLE DOLEZ · CONTRÔLE D’ACCÈS · JEUDI', { taille: 7.4, gras: true })}
    <path d="M40 38H262" stroke="#999" stroke-dasharray="2 2"/>
    ${[['18:05', 'SORTIE', 'WAUTELET G.'], ['18:12', 'ENTRÉE', 'WAUTELET G.'], ['18:40', 'ENTRÉE', 'LEMPEREUR T.'], ['20:55', 'SORTIE', 'WAUTELET G.'], ['22:25', 'SORTIE', 'LEMPEREUR T.']].map(([h, t, q], k) => ligne(40, 58 + k * 18, `${h}   ${t.padEnd(8, ' ')} ${q}`, { taille: 8 })).join('')}
    <path d="M40 152H262" stroke="#999" stroke-dasharray="2 2"/>
    ${ligne(40, 170, 'Caméra couloir 2e étage : 1 personne', { taille: 7.2 })}${ligne(40, 184, 'de 21:00 à 22:25 (LEMPEREUR T.).', { taille: 7.2 })}`),

  'occ:3': (id) => svg(id, 300, 190, `${defsPhoto(id, 300, 190)}<rect width="300" height="190" fill="#3C3430"/>
    <g transform="rotate(-5 110 90)"><rect x="30" y="34" width="150" height="96" rx="10" fill="#E8EEF4"/><rect x="30" y="34" width="150" height="26" rx="10" fill="#E2001A"/><rect x="30" y="50" width="150" height="10" fill="#E2001A"/>
      <text x="44" y="53" font-family="Instrument Sans, sans-serif" font-size="12" font-weight="800" fill="#FFF">MOBIB</text><text x="44" y="90" ${MONO} font-size="8" fill="#333">DEBOUCK S.</text><circle cx="156" cy="104" r="12" fill="#C9D3DC"/></g>
    <g transform="rotate(3 230 100)"><rect x="176" y="40" width="108" height="112" fill="#FBF9F2"/>
      ${ligne(184, 58, 'VALIDATIONS', { taille: 7.6, gras: true })}${ligne(184, 80, 'JEU 22:14', { taille: 8 })}${ligne(184, 92, 'Cuesmes → Mons', { taille: 7 })}${ligne(184, 114, 'JEU 22:52', { taille: 8 })}${ligne(184, 126, 'Mons → Cuesmes', { taille: 7 })}</g>
    ${finPhoto(id, 300, 190, 0.12)}`),

  'moy:3': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#5A4A3E"/>
    <g transform="rotate(-4 90 110)"><rect x="24" y="30" width="130" height="160" fill="#F3E9C8"/>
      <text x="89" y="52" text-anchor="middle" ${TAPE} font-size="8" fill="#222">PRÊT SUR GAGES</text><text x="89" y="80" text-anchor="middle" ${MONO} font-size="20" font-weight="700" fill="#B3261E">4471</text>
      ${ligne(36, 104, 'Montre de gousset', { taille: 7.4 })}${ligne(36, 116, 'or 18 ct · gravée « A.H. »', { taille: 7.4 })}${ligne(36, 136, 'Prêté : 700 €', { taille: 7.4 })}${ligne(36, 150, 'Dégagé : 735 € · jeu. 16:10', { taille: 7.4, gras: true })}</g>
    <g transform="rotate(5 220 120)"><rect x="160" y="40" width="124" height="150" fill="#FCFBF6"/>
      <text x="168" y="62" ${MAIN} font-size="13" fill="#22305A">Monsieur Hennebert,</text><text x="168" y="82" ${MAIN} font-size="12" fill="#22305A" textLength="108" lengthAdjust="spacingAndGlyphs">je vous ai rapporté</text><text x="168" y="98" ${MAIN} font-size="12" fill="#22305A" textLength="108" lengthAdjust="spacingAndGlyphs">votre montre jeudi soir.</text>
      <text x="168" y="118" ${MAIN} font-size="12" fill="#22305A" textLength="108" lengthAdjust="spacingAndGlyphs">Vous étiez déjà en bas</text><text x="168" y="134" ${MAIN} font-size="12" fill="#22305A" textLength="96" lengthAdjust="spacingAndGlyphs">de l’escalier. Pardon.</text><text x="230" y="170" ${MAIN} font-size="14" fill="#22305A">S.</text></g>
    ${finPhoto(id, 300, 220, 0.12)}`),

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

  'x:liste': (id) => feuille(id, 240, 290, '#3A2E26', -1, `
    <text x="120" y="42" text-anchor="middle" ${TAPE} font-size="8.5" fill="#7A2E26">CERCLE SAINT-GEORGES</text>
    <text x="120" y="56" text-anchor="middle" ${TAPE} font-size="7.4" fill="#222">Combat 1999 · hommes de feuilles</text>
    ${['DEPRETER P.', 'HOUZIAUX M.', 'FOSTIER F.', 'QUINTART L.', 'BURNIAUX T.', 'ROSSIGNON J.-F.', 'WAUTELET G.', 'VERVAET D.', 'HOYAS A.', 'LANDRAIN R.', 'LEMPEREUR T.', 'NIZET S.'].map((n, k) => `<text x="44" y="${76 + k * 15}" ${TAPE} font-size="7.6" fill="#222">n° ${String(k + 1).padStart(2, ' ')}  ${n}</text>`).join('')}`, { papier: '#F4EEDC' }),

  'r:tel': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#D6D3CB"/>
    <rect x="66" y="14" width="168" height="194" rx="6" fill="rgba(235,240,245,.55)" stroke="#9AA3AA"/><rect x="66" y="14" width="168" height="22" fill="#2F6FD3" opacity=".85"/>
    <text x="150" y="29" text-anchor="middle" ${MONO} font-size="8.5" fill="#FFF">SCELLÉ · TÉLÉPHONIE</text>
    <g transform="translate(150 116) rotate(-12)"><rect x="-30" y="-56" width="60" height="112" rx="9" fill="#15171A"/><rect x="-25" y="-46" width="50" height="90" rx="3" fill="#2A2E33"/><path d="M-25 20l50 -40" stroke="#5A6068" stroke-width="1"/><circle cx="12" cy="30" r="3" fill="#88A6B8" opacity=".6"/><circle cx="-8" cy="-12" r="2" fill="#88A6B8" opacity=".6"/></g>
    <rect x="82" y="188" width="136" height="14" fill="#FFF"/><text x="150" y="198" text-anchor="middle" ${MONO} font-size="7" fill="#222">JARDIN DU MAYEUR · BASSIN · SAM. 07:50</text>
    ${finPhoto(id, 300, 220, 0.1)}`),

  'd:corbeau': (id) => feuille(id, 240, 200, '#3E4A54', 3, `
    ${['Vous cherchez qui il attendait jeudi ?', 'Demandez au Cercle Saint-Georges', 'qui portait le brassard n° 7 en 1999.', 'Et demandez à celui qui a pris la photo', 'ce qu’il a vu ce soir-là.'].map((t, k) => `<text x="34" y="${48 + k * 18}" ${TAPE} font-size="8.4" fill="#222">${t}</text>`).join('')}
    <text x="34" y="164" ${MONO} font-size="6.6" fill="#777">Enveloppe sans timbre · déposée dans la boîte du commissariat</text>`, { papier: '#FCFBF6' }),
};

// ───── La scène à fouiller ─────
export const POINTS_SCENE_RAMPE = [
  { k: 'corps', n: 1, x: 124, y: 334, px: 170, py: 505, titre: 'Au pied de l’escalier', texte: 'L’endroit où la victime a été retrouvée, la tête contre la première marche. Peu de sang sur la marche. Le tapis du couloir est plissé en accordéon, du côté du bureau.' },
  { k: 'lunettes', n: 2, x: 186, y: 252, px: 222, py: 360, titre: 'La troisième marche', texte: 'Les lunettes de lecture de la victime, intactes, posées bien à plat, verres vers le haut.' },
  { k: 'socle', n: 3, x: 318, y: 232, px: 508, py: 356, titre: 'Le socle vide', texte: 'Sur le bureau, un petit socle en bois verni, vide : une trace ronde, propre, dans la poussière. Une plaque de cuivre : « Étude Hennebert · 1979 ».' },
  { k: 'tiroir', n: 4, x: 404, y: 270, px: 528, py: 452, titre: 'Le tiroir de gauche', texte: 'Ouvert. Une chemise cartonnée vide, étiquetée à la main : « L. M. — 1999 ». Le reste du bureau est en ordre.' },
  { k: 'sousmain', n: 5, x: 356, y: 254, px: 640, py: 372, titre: 'Le sous-main', texte: 'Le cuir est plus clair à un endroit, un petit rectangle de la taille d’un GSM. Il n’y a de GSM ni sur le bureau, ni ailleurs dans la maison.' },
  { k: 'calendrier', n: 6, x: 470, y: 96, px: 702, py: 160, titre: 'Le calendrier', texte: 'Un vieux calendrier du Doudou, année 1999, jamais décroché. Un dimanche de la fin mai est entouré au stylo.' },
  { k: 'fenetre', n: 7, x: 372, y: 104, px: 563, py: 96, titre: 'La fenêtre de l’étude', texte: 'Elle donne sur les pavés de la Rampe et, en face, sur le haut mur de la Collégiale. Plus bas dans la rue, au-dessus de la porte d’un cabinet de kinésithérapie, on devine une petite caméra tournée vers la montée.' },
  { k: 'console', n: 8, x: 576, y: 236, px: 835, py: 276, titre: 'La console de l’entrée', texte: 'Une montre de gousset en or, gravée « A.H. ». À la chaîne, une étiquette en carton : « 4471 ». Pas un grain de poussière dessus, contrairement au reste du meuble.' },
  { k: 'salon', n: 9, x: 620, y: 336, px: 905, py: 468, titre: 'Le salon, par l’arche', texte: 'Sur la table basse, deux verres de porto ; l’un porte une trace de rouge à lèvres. La bouteille est presque pleine. Deux fauteuils tirés l’un vers l’autre.' },
  { k: 'cuisine', n: 10, x: 506, y: 196, px: 793, py: 218, titre: 'La porte de la cuisine', texte: 'Sur l’égouttoir, un troisième verre à porto, lavé, encore perlé d’eau. L’évier est sec, sauf sous ce verre.' },
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

/** L'étude au rez-de-chaussée (ancien dessin, gardé en secours) : l'escalier à gauche, le bureau au centre, l'entrée et le salon à droite. */
export function decorSceneRampe(id) {
  return `<defs>
      <linearGradient id="${id}mur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E5E4A"/><stop offset="1" stop-color="#54473A"/></linearGradient>
      <linearGradient id="${id}chene" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A5432"/><stop offset="1" stop-color="#4A3020"/></linearGradient>
      <linearGradient id="${id}brume" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8DCDE"/><stop offset="1" stop-color="#AEB4B8"/></linearGradient>
      <radialGradient id="${id}lampe" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".55"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}flash" cx="45%" cy="45%" r="75%"><stop offset="0" stop-color="#FFF6E0" stop-opacity=".18"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
      <filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .5 0"/></filter>
      <filter id="${id}b"><feGaussianBlur stdDeviation="3"/></filter>
      <pattern id="${id}parq" width="36" height="12" patternUnits="userSpaceOnUse"><rect width="36" height="12" fill="#4A3624"/><path d="M0 11.5H36M18 0V12" stroke="#36261A" stroke-width="1"/></pattern>
      <pattern id="${id}livres" width="14" height="40" patternUnits="userSpaceOnUse"><rect width="14" height="40" fill="#3A2A1E"/><rect x="1" y="4" width="5" height="34" fill="#6A2A24"/><rect x="7" y="8" width="5" height="30" fill="#2A4A3A"/></pattern>
    </defs>
    <rect width="680" height="380" fill="url(#${id}mur)"/>
    <path d="M0 290H680V380H0Z" fill="url(#${id}parq)"/><path d="M0 290H680" stroke="#2A1E14" stroke-width="3"/>
    <rect x="236" y="40" width="70" height="200" fill="url(#${id}livres)"/><rect x="236" y="40" width="70" height="200" fill="none" stroke="#2A1E14" stroke-width="3"/>
    <rect x="330" y="50" width="100" height="110" fill="url(#${id}brume)"/><path d="M380 50V160M330 105H430" stroke="#3A2A1E" stroke-width="4"/><rect x="330" y="50" width="100" height="110" fill="none" stroke="#2A1E14" stroke-width="5"/>
    <rect x="404" y="62" width="10" height="6" fill="#555" opacity=".5"/>
    <rect x="452" y="70" width="38" height="50" fill="#EFE6D0"/><rect x="452" y="70" width="38" height="12" fill="#B3261E"/><text x="471" y="79" text-anchor="middle" font-family="'Special Elite', monospace" font-size="6" fill="#FFF">1999</text>
    <g stroke="#9A8E78" stroke-width=".5">${[0, 1, 2, 3].map((k) => `<path d="M454 ${88 + k * 8}h34"/>`).join('')}</g><circle cx="466" cy="104" r="4" fill="none" stroke="#B3261E" stroke-width="1.2"/>
    <g>${Array.from({ length: 9 }, (_, k) => `<path d="M${40 + k * 22} ${370 - k * 26}h${48 - k * 1.5}v${26}h-${48 - k * 1.5}z" fill="url(#${id}chene)" stroke="#2A1A10" stroke-width="1.2"/>`).join('')}</g>
    <path d="M30 376L236 140" stroke="#2A1A10" stroke-width="6"/><path d="M14 382L222 148" stroke="#3E2A1A" stroke-width="3"/>
    <path d="M70 352q30 -10 70 4q22 8 26 22q-40 10 -78 4q-20 -4 -18 -30z" fill="none" stroke="#F2E8C8" stroke-width="2.4" stroke-dasharray="6 4" opacity=".75"/>
    <path d="M150 360q40 -6 80 0q30 4 70 -2" stroke="#7A2E2E" stroke-width="14" opacity=".55" fill="none"/><path d="M162 356l8 8M190 354l6 10M222 356l6 9" stroke="#5A1E1E" stroke-width="2" opacity=".6"/>
    <g transform="translate(186 247)"><circle cx="-6" cy="0" r="5" fill="none" stroke="#C9B98E" stroke-width="1.4"/><circle cx="6" cy="0" r="5" fill="none" stroke="#C9B98E" stroke-width="1.4"/><path d="M-1 0h2" stroke="#C9B98E"/></g>
    <rect x="276" y="250" width="164" height="12" fill="#5A3A22"/><rect x="284" y="262" width="12" height="40" fill="#4A2E1A"/><rect x="420" y="262" width="12" height="40" fill="#4A2E1A"/>
    <rect x="388" y="262" width="34" height="24" fill="#5E3E26" stroke="#2A1A10"/><rect x="392" y="282" width="28" height="10" fill="#6E4A2E" transform="translate(4 8)"/>
    <rect x="330" y="244" width="56" height="8" fill="#2E4A2E"/><rect x="342" y="246" width="16" height="5" fill="#3E5E3E"/>
    <rect x="306" y="240" width="22" height="10" rx="2" fill="#7A5432"/>
    <path d="M300 250l10 -40h18l6 40" fill="#2E5A3A" opacity=".9"/><circle cx="320" cy="208" r="40" fill="url(#${id}lampe)"/>
    <rect x="520" y="60" width="90" height="230" fill="#3E3024"/><path d="M520 60h90v230" fill="none" stroke="#2A1E14" stroke-width="4"/>
    <rect x="490" y="160" width="40" height="80" fill="#4A3828" stroke="#2A1E14" stroke-width="2"/><circle cx="522" cy="202" r="2" fill="#C9B98E"/>
    <rect x="548" y="226" width="62" height="10" fill="#6E4A2E"/><path d="M552 236v40M604 236v40" stroke="#4A2E1A" stroke-width="4"/>
    <g transform="translate(578 229)"><circle r="5" fill="#E2C46A" stroke="#8A6A20"/><path d="M5 0q8 2 10 10" stroke="#C9A84A" fill="none"/><rect x="12" y="8" width="8" height="5" fill="#EDE4CF" transform="rotate(20 16 10)"/></g>
    <path d="M626 80q12 -8 22 0v60" stroke="#2A1E14" stroke-width="4" fill="none"/><path d="M630 86q-10 40 -4 90h24q6 -50 -4 -90z" fill="#3A3A42"/>
    <path d="M560 300q60 -30 120 0V380H560Z" fill="#2E2218" opacity=".6"/><rect x="590" y="322" width="70" height="10" fill="#6E4A2E"/>
    <g transform="translate(608 318)"><path d="M-4 -12h8l-1 9h-6z" fill="rgba(240,240,248,.7)"/><path d="M-3 -9h6l-1 5h-4z" fill="#6A1E2A" opacity=".7"/></g>
    <g transform="translate(634 318)"><path d="M-4 -12h8l-1 9h-6z" fill="rgba(240,240,248,.7)"/><path d="M-3 -12q2 -1 4 0" stroke="#C2302B" stroke-width="1.6"/></g>
    <rect width="680" height="380" fill="url(#${id}flash)"/>
    <rect width="680" height="380" filter="url(#${id}n)" opacity=".14" style="mix-blend-mode:multiply"/>`;
}

// ───── Une du journal et vignette de la scène ─────
/** La maison de la Rampe dans le brouillard, rubalise et gyrophares (une du journal). */
export function photoUneRampe(id = 'un') {
  return `<svg viewBox="0 0 200 120" class="tb-photo-svg" aria-hidden="true">
    <defs><radialGradient id="${id}g" cx="24%" cy="72%" r="40%"><stop offset="0" stop-color="rgba(120,170,255,.55)"/><stop offset="1" stop-color="rgba(120,170,255,0)"/></radialGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CBD0D4" stop-opacity=".5"/><stop offset="1" stop-color="#CBD0D4" stop-opacity=".1"/></linearGradient></defs>
    <rect width="200" height="120" fill="#5A5E62"/>
    <path d="M150 0h50v40h-50z" fill="#6E7276"/><path d="M160 0l16 -0v20h-16z" fill="#4A4E52"/><path d="M168 -2l-6 12h12z" fill="#3E4246"/>
    <path d="M0 30L200 6V120H0Z" fill="#45484C"/>
    <rect x="34" y="26" width="88" height="70" fill="#3A3C40"/><rect x="40" y="36" width="20" height="24" fill="#8A8A70" opacity=".6"/><rect x="96" y="36" width="20" height="24" fill="#6A6C66" opacity=".6"/>
    <rect x="66" y="58" width="24" height="38" fill="#1E1F22"/><text x="78" y="52" text-anchor="middle" font-family="'Special Elite', monospace" font-size="5" fill="#BBB">ÉTUDE</text>
    <path d="M0 96L200 74V120H0Z" fill="#55585C"/><g stroke="#666A6E" stroke-width=".6">${Array.from({ length: 6 }, (_, k) => `<path d="M0 ${100 + k * 4}L200 ${78 + k * 7}"/>`).join('')}</g>
    <g transform="translate(14 84)"><rect x="0" y="6" width="44" height="14" rx="3" fill="#E8E8E8"/><rect x="8" y="0" width="26" height="9" rx="2" fill="#D6D6D6"/><rect x="0" y="12" width="44" height="3" fill="#2F6FD3"/><rect x="14" y="-3" width="6" height="3" fill="#2F6FD3"/></g>
    <path d="M30 98L190 82" stroke="#F2C230" stroke-width="3.5"/>
    <rect width="200" height="120" fill="url(#${id}f)"/><rect width="200" height="120" fill="url(#${id}g)"/>
  </svg>`;
}
/** Vignette de la scène au tableau (l'escalier et le contour). */
export function photoSceneRampe(id = 'sc') {
  return `<svg viewBox="0 0 400 224" class="tb-photo-svg" aria-hidden="true"><image href="${PHOTO_SCENE_RAMPE.mini}" width="400" height="224"/></svg>`;
}
