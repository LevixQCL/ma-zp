// Personnalisation du commissariat (« skins ») : façade, enseigne néon, abords.
// Chaque élément se débloque avec un grade ou un trophée ; le choix est fait dans le profil du joueur
// et recopié dans la zone à 20:00 (comme le nom et la couleur), après vérification.
import { GRADES } from './constants.js';
import { TROPHEE } from './equipe.js';

const g = (nom) => ({ grade: nom });
const t = (id) => ({ trophee: id });

export const DECOR = {
  facade: {
    titre: 'Façade',
    options: {
      beton:    { nom: 'Béton clair', jour: ['#C9D2DC', '#B3BECA', '#A3B0BF'] },
      brique:   { nom: 'Brique rouge', jour: ['#B86A4E', '#A15944', '#8A4A38'], ...g('Inspecteur') },
      pierre:   { nom: 'Pierre bleue', jour: ['#7A8793', '#687480', '#58636E'], ...t('batisseur') },
      verre:    { nom: 'Verre et acier', jour: ['#86AECB', '#7098B8', '#50708A'], ...g('Commissaire') },
      artdeco:  { nom: 'Art déco', jour: ['#E6D9BC', '#D6C7A6', '#C2B08A'], ...t('incorruptible') },
    },
  },
  neon: {
    titre: 'Enseigne néon',
    options: {
      bleu:  { nom: 'Bleu', lettre: '#DDF0FF', trait: '#7CC3F7', halo: '#5AB0F0', jour: '#1B4C80' },
      blanc: { nom: 'Blanc', lettre: '#FFFFFF', trait: '#E9EEF3', halo: '#F4EFE3', jour: '#4B5968', ...t('limier') },
      ambre: { nom: 'Ambre', lettre: '#FFE7B0', trait: '#F2B544', halo: '#F2B544', jour: '#8A5A12', ...t('solidaire') },
      vert:  { nom: 'Vert', lettre: '#D8FFE9', trait: '#4CC38A', halo: '#4CC38A', jour: '#1F6B47', ...t('sansfaute') },
      rouge: { nom: 'Rouge', lettre: '#FFE0DC', trait: '#F0736A', halo: '#F0736A', jour: '#9A2B1F', ...t('menottes') },
    },
  },
  abords: {
    titre: 'Abords',
    options: {
      aucun:    { nom: 'Sobre' },
      arbres:   { nom: 'Arbres et jardinières', ...t('sauveur') },
      fresque:  { nom: 'Fresque sur le garage', ...t('orchestre') },
      horloge:  { nom: 'Horloge de façade', ...t('increvable') },
      plaque:   { nom: 'Plaque et enseigne dorées', ...t('veteran') },
      toitvert: { nom: 'Toit végétalisé', ...t('cerveau') },
      mat:      { nom: 'Grand mât et oriflammes', ...g('Chef de corps') },
    },
  },
};

export const DECOR_DEFAUT = { facade: 'beton', neon: 'bleu', abords: 'aucun' };

/** Condition de déblocage, en clair (« Grade Inspecteur », « Trophée Bâtisseur »). */
export function conditionDecor(o) {
  if (o.grade) return `Grade ${o.grade}`;
  if (o.trophee) return `Trophée « ${(TROPHEE[o.trophee] && TROPHEE[o.trophee].nom) || o.trophee} »`;
  return 'Disponible';
}

/** L'élément est-il débloqué pour cette zone ? */
export function decorDebloque(z, o) {
  if (!o) return false;
  if (o.grade) { const gr = GRADES.find((x) => x.nom === o.grade); return !!gr && (z.ps || 0) >= gr.ps; }
  if (o.trophee) return (z.trophees || []).some((x) => x.id === o.trophee);
  return true;
}

/** Choix valide pour la zone : tout élément inconnu ou verrouillé revient à la valeur par défaut. */
export function decorValide(z, choix) {
  const d = { ...DECOR_DEFAUT };
  if (!choix || typeof choix !== 'object') return d;
  for (const cat of Object.keys(DECOR)) {
    const o = typeof choix[cat] === 'string' && Object.hasOwn(DECOR[cat].options, choix[cat]) ? DECOR[cat].options[choix[cat]] : null;
    if (o && decorDebloque(z, o)) d[cat] = choix[cat];
  }
  return d;
}

/** Nombre d'éléments débloqués sur le total (pour « 4 / 17 »). */
export function decorCompte(z) {
  let n = 0, total = 0;
  for (const cat of Object.values(DECOR)) for (const o of Object.values(cat.options)) { total++; if (decorDebloque(z, o)) n++; }
  return { n, total };
}

// ───── Skins « Early birds » : offerts aux premiers joueurs (roulette), un par bâtiment ─────
export const SKINS = {
  batiment: {
    titre: 'Hôtel de police',
    options: {
      friterie: { nom: 'Friterie de garde', texte: 'Façade jaune frite, auvent rayé et cornet géant sur le toit.', jour: ['#F2D06B', '#E3BD55', '#D9A93A'] },
      chateau:  { nom: 'Fort Delta', texte: 'Pierres, créneaux et deux tourelles à fanions.', jour: ['#A8A397', '#948F84', '#827D73'] },
      orbitale: { nom: 'Base orbitale', texte: 'Coque blanche, hublots, dôme et satellite.', jour: ['#E4EBF2', '#CAD5DF', '#AEBCC9'] },
      chalet:   { nom: 'Chalet des Fagnes', texte: 'Bois, toit à deux pans et jardinières fleuries.', jour: ['#9A6A40', '#86592F', '#6E4826'] },
      gateau:   { nom: 'Gâteau d’anniversaire', texte: 'Glaçage rose qui coule et bougies allumées sur le toit.', jour: ['#F6D6E0', '#EDC2D2', '#E0A9BE'] },
    },
  },
  garage: {
    titre: 'Garage',
    options: {
      hangar:  { nom: 'Hangar à dirigeable', texte: 'Toit en voûte et petit dirigeable de la zone amarré au-dessus.', jour: ['#9AA8B6', '#7E8C9B'] },
      grange:  { nom: 'Grange de ferme', texte: 'Planches rouges, portes à croix blanche et botte de foin.', jour: ['#A8432F', '#8A3424'] },
      retro:   { nom: 'Garage rétro 80', texte: 'Violet nuit, néons rose et turquoise, damier chromé.', jour: ['#3A2A55', '#2A1F3D'] },
      lavage:  { nom: 'Car-wash à bulles', texte: 'Carrelage bleu et bulles de savon qui s’envolent.', jour: ['#8CC8F5', '#5AB0F0'] },
    },
  },
  fete: {
    titre: 'Décor d’événement',
    options: {
      halloween: { nom: 'Nuit des citrouilles', texte: 'Citrouilles, toiles d’araignée et chauves-souris. Édition limitée : fin octobre.', jour: ['#F28C28', '#6B3FA0'] },
      stnicolas: { nom: 'Saint-Nicolas', texte: 'Cadeaux devant l’entrée, étoiles dorées et son âne. Édition limitée : début décembre.', jour: ['#D8453A', '#F2B544'] },
      carnaval:  { nom: 'Carnaval', texte: 'Plumes géantes sur le toit, guirlandes et confettis. Édition limitée : avant le Mardi gras.', jour: ['#F2D02E', '#E1332B'] },
      dragon:    { nom: 'Dragon de la Ducasse', texte: 'Un dragon vert bonhomme enroulé sur le garage. Édition limitée : à la Trinité.', jour: ['#4C9A5E', '#E1332B'] },
    },
  },
  aile: {
    titre: 'Aile des annexes',
    options: {
      conteneurs: { nom: 'Conteneurs empilés', texte: 'Chaque annexe dans un conteneur de couleur.', jour: ['#E07A3A', '#3C7DB8'] },
      roulotte:   { nom: 'Roulotte de cirque', texte: 'Rayures rouges et blanches, toit festonné, roues à rayons.', jour: ['#D8453A', '#F4EFE3'] },
      serre:      { nom: 'Serre tropicale', texte: 'Verrière en arc et plantes qui débordent.', jour: ['#BFE3D0', '#7FC6A0'] },
    },
  },
};

/** Skins possédés par la zone (liste d'identifiants « categorie:id »). */
export const skinsPossedes = (z) => new Set(z.skins || []);

/** Skins choisis, limités à ceux que la zone possède. */
export function skinsValides(z, choix) {
  const own = skinsPossedes(z), d = {};
  if (!choix || typeof choix !== 'object') return d;
  for (const cat of Object.keys(SKINS)) if (choix[cat] && SKINS[cat].options[choix[cat]] && own.has(`${cat}:${choix[cat]}`)) d[cat] = choix[cat];
  return d;
}

/** Tous les skins, à plat : [{ cat, id, nom, texte }]. */
export const TOUS_SKINS = Object.entries(SKINS).filter(([cat]) => cat !== 'fete').flatMap(([cat, C]) => Object.entries(C.options).map(([id, o]) => ({ cat, id, nom: o.nom, texte: o.texte, categorie: C.titre })));

/**
 * Early birds : les zones présentes au lancement des skins. La liste est figée à la première
 * résolution qui suit la mise à jour (`state.earlyBird.uids`) ; avant cela, toute zone existante compte.
 */
export function earlyBirdEligible(z, st) {
  if (!z || !st) return false;
  return st.earlyBird && Array.isArray(st.earlyBird.uids) ? st.earlyBird.uids.includes(z.uid) : !!(st.zones && st.zones[z.uid]);
}

/** « batiment:friterie » → { cat, id } si le skin existe. */
export function skinDe(cle) {
  const [cat, id] = String(cle || '').split(':');
  return Object.hasOwn(SKINS, cat) && Object.hasOwn(SKINS[cat].options, id || '') ? { cat, id } : null;
}

/** Tirage de la roulette : un skin au hasard parmi les 12. */
export function tirerSkin(alea = Math.random()) {
  const s = TOUS_SKINS[Math.min(TOUS_SKINS.length - 1, Math.floor(alea * TOUS_SKINS.length))];
  return `${s.cat}:${s.id}`;
}

// ───── Décors d'événement : se gagnent pendant une période, en aidant au grand événement du district
// ou en faisant une découverte dans l'enquête de la semaine. ─────
function paques(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}
const jours = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Période d'événement en cours à cette date : { id, fin } ou null. */
export function periodeFete(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()), y = d.getFullYear();
  const dans = (a, b) => d >= a && d <= b;
  if (dans(new Date(y, 9, 24), new Date(y, 10, 2))) return { id: 'halloween', fin: new Date(y, 10, 2) };
  if (dans(new Date(y, 10, 29), new Date(y, 11, 6))) return { id: 'stnicolas', fin: new Date(y, 11, 6) };
  const p = paques(y), mardiGras = jours(p, -47), trinite = jours(p, 56);
  if (dans(jours(mardiGras, -10), jours(mardiGras, 1))) return { id: 'carnaval', fin: jours(mardiGras, 1) };
  if (dans(jours(trinite, -7), jours(trinite, 1))) return { id: 'dragon', fin: jours(trinite, 1) };
  return null;
}

/** Ajoute un skin possédé (sans doublon). Renvoie true s'il est nouveau. */
export function ajouterSkin(z, cle) {
  if (!skinDe(cle)) return false;
  z.skins = z.skins || [];
  if (z.skins.includes(cle)) return false;
  z.skins.push(cle);
  return true;
}
