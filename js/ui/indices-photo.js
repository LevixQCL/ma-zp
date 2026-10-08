// Photos des pièces de l'affaire de Mons : images de caméra horodatées, tickets, billet, agenda, scellés…
// L'indice se lit dans l'image elle-même (une heure, un détail), sans être souligné.
// Dessins SVG avec grain photo ; les textes manuscrits utilisent Caveat, les tickets une police à chasse fixe.

import { MONO, MAIN, TAPE, defsPhoto, finPhoto, svg, plot, echelle, silhouette, cadreCam } from './photo-base.js';

/** Rue de la Clef la nuit, vue de la caméra communale (perspective, pluie, réverbères). */
function rueCam(id, pluie, foule) {
  const gouttes = pluie ? Array.from({ length: 70 }, (_, k) => { const x = (k * 53) % 320, y = (k * 37) % 180; return `<path d="M${x} ${y}l-3 9" stroke="#D8D8D8" stroke-width=".7" opacity=".45"/>`; }).join('') : '';
  return `<rect width="320" height="180" fill="#2A2C2E"/>
    <path d="M0 0H320V70L210 96H110L0 70Z" fill="#3A3C3E"/>
    <path d="M0 70L110 96V180H0Z" fill="#4A4C4E"/><path d="M320 70L210 96V180H320Z" fill="#45474A"/>
    <path d="M110 96H210L300 180H20Z" fill="#5A5C5E"/>
    <path d="M110 96L20 180M210 96L300 180" stroke="#6E7072" stroke-width="2"/>
    ${[0, 1, 2, 3, 4].map((k) => `<rect x="${18 + k * 18}" y="${84 - k * 3}" width="10" height="${14 + k}" fill="#6A6C6E" opacity=".6"/>`).join('')}
    <rect x="232" y="78" width="40" height="24" fill="#8A8C70" opacity=".55"/><text x="252" y="93" text-anchor="middle" ${MONO} font-size="6" fill="#222" opacity=".7">CARILLON</text>
    <g fill="#F2F0E0"><circle cx="80" cy="40" r="5" opacity=".9"/><circle cx="240" cy="36" r="5" opacity=".9"/></g>
    <g filter="url(#${id}bb)" fill="#F2F0E0" opacity=".45"><circle cx="80" cy="40" r="18"/><circle cx="240" cy="36" r="18"/></g>
    <path d="M60 180Q140 150 160 120Q170 150 260 180Z" fill="#7A7C7E" opacity="${pluie ? 0.35 : 0}"/>
    ${foule || ''}
    ${gouttes}`;
}
import { photosRampe } from './rampe-visuels.js';
import { photosCorbeau } from './corbeau-visuels.js';

/** Billet de train Mons → Bruxelles, émis à 21:48. */
const billet = (id) => svg(id, 220, 300, `${defsPhoto(id, 220, 300)}
      <rect width="220" height="300" fill="#6E6A62"/>
      <g transform="rotate(-4 110 150)"><rect x="34" y="40" width="152" height="220" rx="6" fill="#F4F1E6"/><rect x="34" y="40" width="152" height="34" rx="6" fill="#1F4F8C"/><rect x="34" y="62" width="152" height="12" fill="#1F4F8C"/>
        <text x="110" y="62" text-anchor="middle" ${MONO} font-size="11" fill="#FFF" font-weight="600">BILLET · 2e CLASSE</text>
        <text x="48" y="100" ${MONO} font-size="10" fill="#222">DE   MONS</text><text x="48" y="118" ${MONO} font-size="10" fill="#222">À    BRUXELLES-CENTRAL</text>
        <text x="48" y="146" ${MONO} font-size="9" fill="#555">VALABLE LE JOUR MÊME</text><text x="48" y="160" ${MONO} font-size="9" fill="#555">SUR TOUS LES TRAINS</text>
        <text x="48" y="190" ${MONO} font-size="9" fill="#222">ÉMIS  MAR. 21:48</text><text x="48" y="204" ${MONO} font-size="9" fill="#222">AUTOMATE 03 · MONS</text>
        <text x="172" y="252" text-anchor="end" ${MONO} font-size="14" fill="#222" font-weight="600">10,80 €</text>
        <g fill="#222">${Array.from({ length: 28 }, (_, k) => `<rect x="${48 + k * 3.4}" y="214" width="${k % 3 ? 1.4 : 2.4}" height="20"/>`).join('')}</g></g>
      ${finPhoto(id, 220, 300, 0.12)}`);
/** Manteau long qui sèche, la manche droite rincée (perquisition de l'assassin). */
const manteauRince = (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#D7D3C9"/><rect x="0" y="0" width="300" height="220" fill="#BFC7CC" opacity=".4"/>
      <path d="M150 20q-6 -10 6 -12" stroke="#777" stroke-width="2" fill="none"/><path d="M110 40h80" stroke="#8A8A8A" stroke-width="3"/>
      <path d="M112 40q-30 20 -36 70l-6 100h160l-6 -100q-6 -50 -36 -70l-38 30z" fill="#3A3F46"/>
      <path d="M76 110l-20 90h22l12 -70z" fill="#2B3036"/><path d="M224 110l20 90h-22l-12 -70z" fill="#353A41"/>
      <path d="M244 140l6 60h-26z" fill="#22262B" opacity=".9"/><path d="M226 150q14 10 22 40" stroke="#5E7380" stroke-width="5" opacity=".6"/>
      ${[0, 1, 2, 3, 4].map((k) => `<circle cx="${236 + (k % 2) * 6}" cy="${206 + k * 2}" r="1.6" fill="#8FB3C8" opacity=".8"/>`).join('')}
      ${plot(262, 214, 1)}${finPhoto(id, 300, 220, 0.14)}`);
/** Chez Thierry Gobert : deux verres et le mot de Claire. */
const motDeClaire = (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#6B4E3A"/>
      <g transform="rotate(-6 150 100)"><rect x="80" y="44" width="150" height="100" fill="#FBF7EE"/><text x="98" y="86" ${MAIN} font-size="22" fill="#2A3A6A" textLength="120" lengthAdjust="spacingAndGlyphs">Merci pour ce soir.</text><text x="180" y="120" ${MAIN} font-size="24" fill="#2A3A6A">C.</text></g>
      <g transform="translate(46 60)"><path d="M-10 0h20l-4 30h-12z" fill="rgba(240,240,245,.6)" stroke="#CCC"/><path d="M0 30v20M-8 50h16" stroke="#CCC" stroke-width="2"/></g>
      <g transform="translate(262 66)"><path d="M-10 0h20l-4 30h-12z" fill="rgba(240,240,245,.6)" stroke="#CCC"/><path d="M0 30v20M-8 50h16" stroke="#CCC" stroke-width="2"/><path d="M-6 18h12" stroke="#8A1E2E" stroke-width="5" opacity=".5"/></g>
      ${finPhoto(id, 300, 200, 0.14)}`);

const PHOTOS = {
  'c:cam': (id) => `<div class="ip-duo">${svg(`${id}a`, 320, 180, cadreCam(`${id}a`, 'CAM 07 · GRAND-PLACE / R. DE LA CLEF', '22:04:31', rueCam(`${id}a`, true, silhouette(176, 150, 1.2, { parapluie: true }))))}
    ${svg(`${id}b`, 320, 180, cadreCam(`${id}b`, 'CAM 07 · GRAND-PLACE / R. DE LA CLEF', '22:24:12', rueCam(`${id}b`, true, silhouette(150, 152, 1.25, { parapluie: false, sac: true, dos: true }))))}</div>`,
  'occ:2': (id) => `<div class="ip-duo">${billet(`${id}a`)}
    ${svg(`${id}b`, 320, 180, cadreCam(`${id}b`, 'GARE DE MONS · QUAI 3', '22:39:47', `<rect width="320" height="180" fill="#3C3E40"/><path d="M0 120H320V180H0Z" fill="#5C5E60"/><path d="M0 118H320" stroke="#D8D060" stroke-width="3" stroke-dasharray="14 8"/>
      <path d="M0 40H320V112H0Z" fill="#2E3032"/>${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${10 + k * 54}" y="54" width="40" height="26" fill="#8C8E80" opacity=".5"/>`).join('')}
      <rect x="200" y="20" width="90" height="16" fill="#111"/><text x="245" y="31" text-anchor="middle" ${MONO} font-size="8" fill="#F2B030">22:43 BRUXELLES</text>
      ${silhouette(120, 168, 1.3, { parapluie: false })}<path d="M108 120l-3 8M134 122l2 8" stroke="#BBB" stroke-width=".8" opacity=".6"/>`))}</div>`,
  'c:legiste2': (id) => svg(id, 200, 300, `${defsPhoto(id, 200, 300)}<rect width="200" height="300" fill="#5E6F64"/>
      <g transform="rotate(3 100 150)"><path d="M40 20H160V270L150 276 140 270 130 276 120 270 110 276 100 270 90 276 80 270 70 276 60 270 50 276 40 270Z" fill="#FBF9F2"/>
      <text x="100" y="44" text-anchor="middle" ${MONO} font-size="12" font-weight="600" fill="#222">LE CARILLON</text><text x="100" y="58" text-anchor="middle" ${MONO} font-size="6.4" fill="#444">Brasserie · rue de la Clef · Mons</text>
      <path d="M50 68H150" stroke="#999" stroke-dasharray="2 2"/>
      <text x="50" y="84" ${MONO} font-size="8.5" fill="#222">MAR.          20:16</text><text x="50" y="96" ${MONO} font-size="8.5" fill="#222">TABLE 4    COUVERTS 1</text>
      <path d="M50 104H150" stroke="#999" stroke-dasharray="2 2"/>
      <text x="50" y="122" ${MONO} font-size="8.5" fill="#222">1 CARBONNADE    17,50</text><text x="50" y="136" ${MONO} font-size="8.5" fill="#222">1 FRITES         4,00</text><text x="50" y="150" ${MONO} font-size="8.5" fill="#222">1 CAFÉ          2,80</text>
      <path d="M50 160H150" stroke="#999" stroke-dasharray="2 2"/><text x="50" y="178" ${MONO} font-size="10" font-weight="600" fill="#222">TOTAL      24,30 €</text>
      <text x="50" y="200" ${MONO} font-size="8" fill="#444">CARTE ****1187</text><text x="100" y="236" text-anchor="middle" ${MONO} font-size="8" fill="#444">Merci et à bientôt !</text></g>
      ${finPhoto(id, 200, 300, 0.12)}`),
  'c:cafe': (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#2B2420"/>
      <rect x="40" y="20" width="220" height="160" rx="12" fill="#B9BDBF"/><rect x="40" y="20" width="220" height="160" rx="12" fill="url(#${id}pl)"/>
      <rect x="64" y="36" width="172" height="96" rx="4" fill="#0F1A12"/>
      <text x="74" y="54" ${MONO} font-size="9" fill="#7CF29A">JOURNAL · DERNIERS CAFÉS</text>
      <text x="74" y="74" ${MONO} font-size="10" fill="#7CF29A">MAR 22:07:41  EXPRESSO</text><text x="74" y="90" ${MONO} font-size="10" fill="#7CF29A">MAR 22:07:12  EXPRESSO</text>
      <text x="74" y="106" ${MONO} font-size="10" fill="#7CF29A" opacity=".75">MAR 16:40:03  LUNGO</text><text x="74" y="122" ${MONO} font-size="10" fill="#7CF29A" opacity=".55">MAR 10:12:55  EXPRESSO</text>
      <g fill="#505456"><circle cx="100" cy="156" r="9"/><circle cx="150" cy="156" r="9"/><circle cx="200" cy="156" r="9"/></g>
      <rect x="64" y="36" width="172" height="96" rx="4" fill="#9CF2B0" opacity=".06" filter="url(#${id}b)"/>
      ${finPhoto(id, 300, 200, 0.16)}`),
  'c:agenda': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#4A3426"/>
      <g transform="rotate(-3 150 110)"><rect x="30" y="18" width="240" height="190" fill="#F6EFD9"/><path d="M150 18V208" stroke="#C8B98F" stroke-width="2"/>
      <g stroke="#D7CCAE">${Array.from({ length: 10 }, (_, k) => `<path d="M160 ${50 + k * 15}H262"/><path d="M38 ${50 + k * 15}H142"/>`).join('')}</g>
      <text x="160" y="40" ${TAPE} font-size="11" fill="#7A2E26">MARDI</text><text x="38" y="40" ${TAPE} font-size="11" fill="#7A2E26">LUNDI</text>
      <text x="44" y="78" ${MAIN} font-size="15" fill="#23335A" textLength="94" lengthAdjust="spacingAndGlyphs">Mertens — réexpertise</text><text x="44" y="108" ${MAIN} font-size="15" fill="#23335A" textLength="90" lengthAdjust="spacingAndGlyphs">S. : 6 pièces de côté</text>
      <text x="166" y="62" ${MAIN} font-size="16" fill="#23335A">10 h banque</text><text x="166" y="92" ${MAIN} font-size="16" fill="#23335A" textLength="92" lengthAdjust="spacingAndGlyphs">14 h livraison Namur</text>
      <text x="166" y="140" ${MAIN} font-size="19" fill="#1B2747">22 h J.M.</text><text x="176" y="162" ${MAIN} font-size="17" fill="#1B2747" textLength="78" lengthAdjust="spacingAndGlyphs">(certificats !)</text><path d="M184 166q30 3 66 -1M184 170q30 3 66 -1" stroke="#1B2747" stroke-width="1.2" fill="none"/></g>
      ${finPhoto(id, 300, 220, 0.14)}`),
  'c:dette': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#5A4636"/>
      <g transform="rotate(2 150 110)"><rect x="40" y="20" width="220" height="180" fill="#FCFBF6"/>
      <text x="150" y="46" text-anchor="middle" ${TAPE} font-size="11" fill="#222">RECONNAISSANCE DE DETTE</text>
      <text x="54" y="74" ${MAIN} font-size="15" fill="#22305A" textLength="190" lengthAdjust="spacingAndGlyphs">Je soussigné Thierry Gobert reconnais</text><text x="54" y="94" ${MAIN} font-size="15" fill="#22305A" textLength="186" lengthAdjust="spacingAndGlyphs">devoir à Henri Delattre la somme de</text>
      <text x="54" y="116" ${MAIN} font-size="18" fill="#22305A" textLength="170" lengthAdjust="spacingAndGlyphs">8 000 € (huit mille euros),</text><text x="54" y="136" ${MAIN} font-size="15" fill="#22305A" textLength="192" lengthAdjust="spacingAndGlyphs">à rembourser au plus tard le 30 septembre.</text>
      <text x="160" y="176" ${MAIN} font-size="20" fill="#22305A">T. Gobert</text></g>
      <g transform="rotate(-7 200 40)"><rect x="168" y="12" width="96" height="70" fill="#F7E36A"/><text x="176" y="36" ${MAIN} font-size="15" fill="#3A2E10" textLength="76" lengthAdjust="spacingAndGlyphs">Relancer T.G.</text><text x="176" y="58" ${MAIN} font-size="15" fill="#3A2E10" textLength="76" lengthAdjust="spacingAndGlyphs">dernier délai !</text></g>
      ${finPhoto(id, 300, 220, 0.12)}`),
  'c:labo': (id) => svg(id, 300, 200, `${defsPhoto(id, 300, 200)}<rect width="300" height="200" fill="#6B5644"/>
      <rect x="0" y="0" width="300" height="80" fill="#8C7863"/><path d="M0 80H300" stroke="#4E3E30" stroke-width="2"/>
      <g transform="translate(70 120)"><ellipse cx="0" cy="22" rx="26" ry="6" fill="#E9E6DF"/><path d="M-14 -6h28l-3 26h-22z" fill="#F4F2EE"/><path d="M14 0q10 0 10 8t-10 6" stroke="#F4F2EE" stroke-width="3" fill="none"/><ellipse cx="0" cy="-6" rx="14" ry="3.4" fill="#4A2E1C"/></g>
      <g transform="translate(200 108)"><rect x="-36" y="18" width="72" height="20" fill="#9AA0A4"/><g stroke="#C7CCD0" stroke-width="2">${[0, 1, 2, 3, 4, 5, 6].map((k) => `<path d="M${-32 + k * 10} 18v-10"/>`).join('')}</g>
        <path d="M-11 18h22l-3 -24h-16z" fill="#F4F2EE"/><ellipse cx="0" cy="-6" rx="8" ry="2.4" fill="#E6E3DC"/><path d="M-9 4h18" stroke="#B9D4E6" stroke-width="1.6" opacity=".8"/></g>
      ${plot(36, 168, 4)}${plot(240, 168, 5)}${echelle(110, 176)}
      <rect width="300" height="200" fill="#FFF8E8" opacity=".08"/>${finPhoto(id, 300, 200, 0.14)}`),
  'r:statue': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#D9D6CE"/>
      <rect x="70" y="16" width="160" height="196" rx="6" fill="rgba(235,240,245,.55)" stroke="#9AA3AA"/><rect x="70" y="16" width="160" height="22" fill="#C0392B" opacity=".85"/>
      <text x="150" y="31" text-anchor="middle" ${MONO} font-size="9" fill="#FFF">SCELLÉ · PIÈCE À CONVICTION</text>
      <g transform="translate(150 132)"><path d="M-28 52h56l-6 -12h-44z" fill="#4A3A22"/><path d="M-20 40q-6 -24 4 -36q-10 -8 -2 -22q8 -10 18 -2q14 4 10 18q8 10 2 22q4 10 -4 20z" fill="#6B5432"/>
        <path d="M-2 -40l22 -24" stroke="#5A4528" stroke-width="3"/><path d="M-14 22q-14 4 -22 -4" stroke="#5A4528" stroke-width="5" fill="none"/>
        <path d="M-24 50h48" stroke="#7A1E1E" stroke-width="2.5" opacity=".7"/><ellipse cx="10" cy="48" rx="6" ry="2" fill="#6A1616" opacity=".6"/></g>
      <rect x="86" y="190" width="128" height="16" fill="#FFF"/><text x="150" y="201" text-anchor="middle" ${MONO} font-size="7.5" fill="#222">PL. LÉOPOLD · MER. 07:40 · S-01</text>
      <path d="M78 40l10 160" stroke="#FFFFFF" stroke-width="6" opacity=".25"/>${finPhoto(id, 300, 220, 0.12)}`),
  'occ:1': (id) => svg(id, 200, 300, `${defsPhoto(id, 200, 300)}<rect width="200" height="300" fill="#3E4A54"/>
      <g transform="rotate(-2 100 150)"><path d="M44 16H156V280H44Z" fill="#FBF9F2"/>
      <text x="100" y="38" text-anchor="middle" ${MONO} font-size="8.5" font-weight="600" fill="#222">LE CARILLON · CAISSE</text><text x="100" y="52" text-anchor="middle" ${MONO} font-size="7" fill="#444">Ouvertures tiroir · mardi</text>
      ${[['20:16', 'VENTE', 'JML'], ['21:31', 'VENTE', 'JML'], ['22:04', 'OUVERTURE', 'JML'], ['22:19', 'OUVERTURE', 'JML'], ['22:33', 'OUVERTURE', 'JML'], ['22:51', 'VENTE', 'JML'], ['23:14', 'CLÔTURE', 'JML']].map(([h, t, c], k) => `<text x="54" y="${80 + k * 18}" ${MONO} font-size="8.5" fill="#222">${h}  ${t.padEnd(10, ' ')} ${c}</text>`).join('')}</g>
      ${finPhoto(id, 200, 300, 0.12)}`),
  'moy:2': (id) => manteauRince(id),
  'moy:4': (id) => motDeClaire(id),
};

// Variante b (Thierry Gobert a tué) : Julien attendait au buffet de la gare ; chez lui, son parapluie sec et les
// certificats ; chez Thierry, le mot de Claire et le manteau rincé.
const PHOTOS_B = {
  ...PHOTOS,
  'occ:2': (id) => `<div class="ip-duo">${billet(`${id}a`)}
    ${svg(`${id}b`, 320, 180, cadreCam(`${id}b`, 'GARE DE MONS · BUFFET', '22:15:06', `<rect width="320" height="180" fill="#4A4038"/><path d="M0 0H320V70H0Z" fill="#5E5246"/>
      ${[0, 1, 2, 3].map((k) => `<rect x="${18 + k * 78}" y="14" width="56" height="40" fill="#8C8470" opacity=".45"/>`).join('')}
      <rect x="60" y="118" width="200" height="10" fill="#2E2620"/><path d="M80 128v40M240 128v40" stroke="#2E2620" stroke-width="6"/>
      <g transform="translate(160 118)"><ellipse cx="0" cy="-58" rx="7" ry="8" fill="#1A1A1A"/><path d="M-13 -48Q-16 -20 -14 0H14Q16 -20 13 -48Q0 -53 -13 -48Z" fill="#202020"/>
        <rect x="-30" y="-14" width="60" height="16" fill="#D8D4C8" transform="rotate(-4)"/><path d="M-30 -10h56M-28 -5h50" stroke="#9A968A" stroke-width=".8"/></g>
      <g fill="#E6E2D8"><ellipse cx="96" cy="114" rx="7" ry="2.4"/><ellipse cx="224" cy="114" rx="7" ry="2.4"/></g>`))}</div>`,
  'moy:2': (id) => svg(id, 300, 220, `${defsPhoto(id, 300, 220)}<rect width="300" height="220" fill="#5A4E44"/>
      ${[0, 1, 2, 3, 4, 5].map((k) => `<g transform="translate(${70 + k * 12} ${40 + k * 10}) rotate(${(k % 3) - 1})"><rect width="130" height="96" fill="#FBF8EE" stroke="#D8D0BC"/>
        <text x="65" y="20" text-anchor="middle" ${MONO} font-size="7.5" fill="#222">CERTIFICAT D’AUTHENTICITÉ</text><path d="M14 34H116M14 44H100M14 54H108" stroke="#BBB"/>
        <circle cx="100" cy="76" r="11" fill="none" stroke="#2A3A8A" stroke-width="1.4" opacity=".7"/><text x="100" y="79" text-anchor="middle" ${MONO} font-size="5" fill="#2A3A8A">J. MERTENS</text></g>`).join('')}
      <g transform="translate(30 70) rotate(-8)"><path d="M0 0l8 120" stroke="#151515" stroke-width="4"/><path d="M-6 -2q14 -6 22 4l-4 92q-8 6 -14 0z" fill="#1E1E1E"/><path d="M8 120q4 10 -6 10" stroke="#151515" stroke-width="4" fill="none"/></g>
      ${plot(262, 206, 1)}${finPhoto(id, 300, 220, 0.14)}`),
  'moy:4': (id) => `<div class="ip-duo">${motDeClaire(`${id}a`)}
    ${manteauRince(`${id}b`)}</div>`,
};

// Chaque affaire écrite à la main a ses photos, dans sa variante (les codes de pièces se recoupent d'une affaire à l'autre).
const photosDe = (aff) => (aff.cas === 'rampe' ? photosRampe(aff.variante) : aff.cas === 'corbeau' ? photosCorbeau(aff.variante) : aff.variante === 'b' ? PHOTOS_B : PHOTOS);

/** Photo d'une pièce, ou chaîne vide si la pièce n'en a pas. `id` : préfixe unique des motifs SVG. */
export function photoIndice(aff, f, id = 'ip') {
  if (!aff || aff.ville !== 'mons') return '';
  const p = photosDe(aff)[f];
  return p ? p(`${id}${f.replace(/[^a-z0-9]/gi, '')}`) : '';
}
export const aPhoto = (aff, f) => !!(aff && aff.ville === 'mons' && photosDe(aff)[f]);
