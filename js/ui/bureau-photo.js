// Bureau du chef, version illustrée (images Gemini dans img/bureau/) : le décor jour/nuit et les objets détourés
// posés par-dessus selon la progression du chef. Mêmes options et mêmes zones touchables (data-obj) que bureau-scene.js.
import { TALENT } from '../engine/chef.js';
import { COULEURS_COMP } from './bureau-scene.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const I = (f) => `img/bureau/${f}.webp`;
// Une image posée par le bas (x centre, y bas) avec une largeur donnée ; hauteur selon le ratio de l'objet.
const RATIO = { classeurs: 1.08, calculatrice: 0.77, stylo: 0.52, radio: 2.89, carte: 0.77, casquette: 0.6, loupe: 1.04, liege: 0.73, archives: 0.83, telephone: 0.68, poignee: 0.79, drapeaux: 1.0, plante: 1.51, 'plan-coeurs': 0.76, bouquet: 0.86, dessin: 1.14, medaille: 2.39, certificat: 0.75, affiche: 1.36 };
const pose = (f, cx, bas, w, extra = '') => { const h = w * (RATIO[f] || 1); return `<image href="${I(f)}" x="${(cx - w / 2).toFixed(1)}" y="${(bas - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" ${extra}/>`; };
const grp = (id, contenu, titre) => `<g data-obj="${id}" style="cursor:pointer"><title>${esc(titre)}</title>${contenu}</g>`;
const RESEAU = [['bourgmestre', 'Bourgmestre'], ['procureur', 'Procureur'], ['syndicat', 'Syndicat'], ['journaliste', 'Presse']];

export function bureauPhotoSvg(o = {}) {
  const n = o.niveaux || {}, L = (c) => Math.max(0, Math.min(10, Number(n[c]) || 0));
  const jour = o.moment === 'jour';
  const coul = /^#[0-9a-f]{6}$/i.test(o.couleur || '') ? o.couleur : '#5AB0F0';
  const u = String(o.uid || 'p').replace(/[^a-z0-9]/gi, '');
  let s = `<svg viewBox="0 0 632 400" width="100%" role="img" aria-label="Bureau du chef" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto">
    <defs><radialGradient id="${u}lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD98A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
    <filter id="${u}om" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="1.5" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity=".45"/></filter></defs>
    <image href="${I(jour ? 'jour' : 'nuit')}" x="0" y="0" width="632" height="400" preserveAspectRatio="none"/>`;
  const om = `filter="url(#${u}om)"`;
  // ── Mur de gauche : médailles, carte tactique, certificats.
  const med = (o.medailles || []).slice(-5);
  if (med.length) s += grp('medailles', med.map((m, i) => { const x = 22 + i * 25; return `${pose('medaille', x, 64, 20, om)}<rect x="${x - 5}" y="${64 - 42}" width="10" height="17" fill="${COULEURS_COMP[m.comp] || coul}" opacity=".55" style="mix-blend-mode:multiply"/>`; }).join(''), 'Médailles');
  if (L('commandement') >= 5) s += grp('commandement', pose('carte', 118, 112, 48, om), 'Carte tactique de la ville');
  const et = (o.etats || []).slice(-3);
  if (et.length) s += grp('etats', et.map((e, i) => { const y = 150 + i * 36; const c = e.rang === 1 ? '#E6B84A' : e.rang === 2 ? '#C9CED8' : e.rang === 3 ? '#C98A54' : null; return `${pose('certificat', 118, y, 44, om)}${c ? `<rect x="96" y="${y - 33}" width="44" height="33" fill="none" stroke="${c}" stroke-width="2"/>` : ''}`; }).join(''), 'États de service');
  // ── Veste : talents cousus.
  const tal = (o.talents || []).filter((t) => TALENT[t]).slice(0, 3);
  const actifs = new Set(o.actifs || []);
  s += grp('talents', tal.map((t, i) => `${actifs.has(t) ? `<circle cx="${40 + i * 10}" cy="160" r="7" fill="#FFD98A" opacity=".55"><animate attributeName="opacity" values=".2;.75;.2" dur="1.6s" repeatCount="indefinite"/></circle>` : ''}<circle cx="${40 + i * 10}" cy="160" r="4.2" fill="${COULEURS_COMP[TALENT[t].comp]}" stroke="#F4EFE3" stroke-width=".9" stroke-dasharray="1.2 .8"/>`).join('') + '<rect x="14" y="125" width="70" height="95" fill="transparent"/>', tal.length ? `Talents : ${tal.map((t) => TALENT[t].nom).join(', ')}` : 'Veste du chef (les talents s’y cousent)');
  // ── Mur de droite : le réseau, le tableau d'enquête, les affiches, le plan du quartier.
  const hum = Object.fromEntries((o.reseau || []).map((r) => [r.id, Math.max(-1, Math.min(1, Math.round(Number(r.humeur) || 0)))]));
  RESEAU.forEach(([id, nom], i) => {
    const x = 510 + (i % 2) * 46, y = 14 + Math.floor(i / 2) * 64, h = hum[id] ?? 0;
    const img = `<image href="${I(`${id}-${h > 0 ? 1 : 0}`)}" x="${x + 3}" y="${y + 3}" width="36" height="40" preserveAspectRatio="xMidYMid slice" ${h < 0 ? 'style="filter:grayscale(.55) brightness(.8) sepia(.25) hue-rotate(-20deg)"' : ''}/>`;
    s += grp(`reseau-${id}`, `<rect x="${x}" y="${y}" width="42" height="46" rx="2" fill="#4A3426" ${om}/>${img}<circle cx="${x + 38}" cy="${y + 4}" r="3.6" fill="${h > 0 ? '#3DD39A' : h < 0 ? '#E1453A' : '#9AA3B5'}" stroke="#1B2436" stroke-width="1"/>
      <rect x="${x}" y="${y + 47}" width="42" height="11" rx="2" fill="#1B2436" opacity=".85"/><text x="${x + 21}" y="${y + 55.5}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#F4EFE3" font-family="Barlow Condensed, Arial Narrow, sans-serif">${nom}</text>`, `${nom} : ${h > 0 ? 'satisfait' : h < 0 ? 'mécontent' : 'neutre'}`);
  });
  if (L('flair') >= 5) s += grp('flair', pose('liege', 553, 196, 74, om), 'Tableau d’enquête');
  const aff = Math.max(0, Math.min(4, Number(o.affiches) || 0));
  if (aff) s += grp('affiches', Array.from({ length: aff }, (_, i) => pose('affiche', 522 + i * 21, 226, 16, `${om} transform="rotate(${[-4, 3, -2, 5][i]} ${522 + i * 21} 225)"`)).join(''), `${aff} suspect${aff > 1 ? 's' : ''} arrêté${aff > 1 ? 's' : ''}`);
  if (L('proximite') >= 5) s += grp('proximite', pose('plan-coeurs', 553, 288, 56, om), 'Plan du quartier');
  // ── Sol : plante, archives.
  if (L('proximite') >= 2) s += grp('proximite', pose('plante', 112, 300, 34, om), 'Plante verte');
  if (L('flair') >= 8) s += grp('flair', pose('archives', 578, 375, 62, om), 'Dossiers classés');
  // ── Rebord de fenêtre : bouquet.
  if (L('proximite') >= 8) s += grp('proximite', pose('bouquet', 212, 218, 44, om), 'Fleurs et dessins d’enfants');
  // ── Rebord de fenêtre : photos souvenirs des réunions avec d'autres chefs.
  (o.souvenirs || []).slice(-2).forEach((sv, i) => {
    const x = i ? 238 : 160, y = 194;
    const ph = (id, dx) => (id ? `<image href="img/chefs/${esc(id)}.webp" x="${x + dx}" y="${y + 3}" width="12" height="16" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="${x + dx}" y="${y + 3}" width="12" height="16" fill="#24324d"/>`);
    s += grp('souvenirs', `<rect x="${x}" y="${y}" width="30" height="22" rx="1.5" fill="#C9A26B" ${om}/>${ph(sv.a, 2.5)}${ph(sv.b, 15.5)}`, `Souvenir de réunion${sv.nom ? ` avec ${sv.nom}` : ''}`);
  });
  // ── Bureau : objets posés (bas à y = 242).
  const D = 243;
  if (L('gestion') >= 2) s += grp('gestion', pose('classeurs', 158, D, 34, om), 'Classeurs');
  if (L('gestion') >= 5) s += grp('gestion', pose('calculatrice', 196, D + 1, 36, om), 'Calculatrice et graphiques');
  if (L('commandement') >= 2) s += grp('commandement', pose('radio', 224, D, 11, om), 'Radio portative');
  if (L('flair') >= 2) s += grp('flair', pose('loupe', 246, D + 2, 24, om), 'Loupe');
  if (L('commandement') >= 8) s += grp('commandement', pose('casquette', 274, D + 2, 34, om), 'Casquette de commandement');
  if (L('gestion') >= 8) s += grp('gestion', pose('stylo', 322, D + 4, 46, om), 'Stylo plume doré');
  // Le portrait du chef dans son cadre.
  s += grp('portrait', `<rect x="352" y="${D - 31}" width="26" height="31" rx="1.5" fill="#6B4A2E" ${om}/>${o.portrait ? `<image href="img/chefs/${esc(o.portrait)}.webp" x="355" y="${D - 28}" width="20" height="25" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="355" y="${D - 28}" width="20" height="25" fill="#24324d"/>`}`, 'Le chef');
  if (L('diplomatie') >= 2) s += grp('diplomatie', pose('telephone', 400, D + 1, 34, om), 'Téléphone');
  if (L('diplomatie') >= 8) s += grp('diplomatie', pose('drapeaux', 470, D, 26, om), 'Drapeaux et jumelage');
  if (L('diplomatie') >= 5) s += grp('diplomatie', pose('poignee', 500, D, 30, om), 'Poignée de main');
  if (L('proximite') >= 8) s += grp('proximite', pose('dessin', 185, 318, 36, `${om} transform="rotate(-5 185 300)"`), 'Dessin d’enfant');
  // Lampe allumée la nuit.
  if (!jour) s += '<ellipse cx="440" cy="220" rx="95" ry="55" fill="url(#' + u + 'lamp)" style="mix-blend-mode:screen"/>';
  // Plaque nominative.
  const et5 = Math.max(0, Math.min(5, Number(o.etoiles) || 0));
  s += grp('nom', `<text x="323" y="286" text-anchor="middle" font-size="10.5" font-weight="700" fill="#3B2A12" font-family="Barlow Condensed, Arial Narrow, sans-serif" textLength="${Math.min(70, 6 + String(o.nom || '').length * 6)}" lengthAdjust="spacingAndGlyphs">${esc(o.nom || '')}</text>
    <text x="323" y="296" text-anchor="middle" font-size="6.5" font-weight="700" fill="#5A4220" font-family="Barlow Condensed, Arial Narrow, sans-serif" letter-spacing=".5"${String(o.grade || '').length + et5 > 10 ? ' textLength="68" lengthAdjust="spacingAndGlyphs"' : ''}>${esc(String(o.grade || '').toUpperCase())}${et5 ? ` ${'★'.repeat(et5)}` : ''}</text>`, o.devise ? `« ${o.devise} »` : 'Plaque nominative');
  // Nouveau chef : des cartons à déballer.
  const total = ['gestion', 'commandement', 'flair', 'diplomatie', 'proximite'].reduce((a, c) => a + L(c), 0);
  if (total < 5 && !med.length) s += pose('archives', 585, 380, 52, `${om} opacity=".9"`);
  return `${s}</svg>`;
}
