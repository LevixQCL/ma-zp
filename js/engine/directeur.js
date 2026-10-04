// Le Directeur : le maître du jeu invisible de Ma ZP.
//
// Il remplace les tirages fixes (30 % d'aléa, 13 % de coup dur, 16 % d'opération chaque jour) par un
// rythme et une lecture de chaque zone :
//   • un rythme dramatique par zone : ciel clair → ciel chargé → orage → éclaircie, puis on recommence ;
//   • des conséquences plutôt que des dés : les coups durs visent les vraies faiblesses (et le rapport dit pourquoi),
//     une zone bien tenue est surtout « testée » par des opérations qui rapportent ;
//   • des feuilletons sur plusieurs jours, annoncés la veille, qu'on gagne en se préparant ;
//   • des dilemmes (deux choix, des conséquences) dont il se souvient : ils reviennent plus tard ;
//   • des crises à deux zones (fugitif à la frontière, défi en duo) et des appels au district ;
//   • un ennemi de la saison, le « Fantôme », jusqu'à la grande opération finale du district ;
//   • un coup de pouce à l'enquête quand le district piétine ;
//   • la lecture de la façon de jouer (routine, argent qui dort, service délaissé) ;
//   • de l'équité : une zone en difficulté a plus d'éclaircies et d'occasions, une zone absente est épargnée
//     et bien accueillie à son retour ; énigmes et mini-jeux à la mesure de chacun.
//
// Tout reste déterministe (hasard à graine) : chaque appareil calcule le même tour.

import { clamp, round1, moyenneIpz } from './zone.js';
import { assurerQuartiers, carteQuartiers, lirePatrouilles } from './quartiers.js';
import { ALEAS, COUPS_DURS, OPERATIONS, PRESSIONS } from './contenu.js';
import { siteDe } from './sites.js';
import { SEASON_LENGTH, BUDGET_IPZ, NIVEAU_MAX, SERVICES, SERVICE_LABELS, coutEquipement } from './constants.js';
import { affaire, candidats, faitsConnus, pieceCoupDePouce } from './enquete.js';

// ───── Réglages ─────
export const DIR = {
  premierOrage: 3,            // pas d'orage avant ce tour (début de saison en douceur)
  calme: [2, 4],              // durée du ciel clair (tours)
  montee: [1, 2],             // durée du ciel chargé
  eclaircie: [1, 2],          // durée de l'éclaircie
  alea: { calme: 0.3, montee: 0.45, orage: 0.15, eclaircie: 0.4 },          // chance d'un imprévu léger
  aleaPositif: { calme: 0.5, montee: 0.2, orage: 0.4, eclaircie: 1 },     // part des bonnes nouvelles
  pressions: { calme: 0.75, montee: 1.4, eclaircie: 0.4 },               // pressions du jour (en moyenne) selon le ciel
  operation: { calme: 0.15, montee: 0.25 },                                // opérations hors orage (appels au renfort)
  coupMontee: 0.12,           // coup dur possible par ciel chargé, seulement sur une vraie faiblesse
  fragile: 1.8,               // seuil de « vraie faiblesse »
  feuilleton: 0.4,            // chance de lancer un feuilleton (ciel clair ou chargé), hors pause
  pauseFeuilleton: 3,         // tours sans feuilleton après la fin du précédent
  pauseDilemme: 3,            // tours entre deux dilemmes
  district: [8, 12],          // tours entre deux événements de district
  coop: { chance: 0.35, pause: [3, 5] },   // fugitif à la frontière de deux zones
  duo: { chance: 0.3, pause: [4, 6] },     // même feuilleton pour deux zones proches au classement
  fantome: [2, 3],            // tours entre deux apparitions du Fantôme
  routine: 4,                 // jours de répartition identique avant que la rue ne le remarque
  appel: 1.5,                 // renfort payé ×1,5 sur un appel du district
  temoin: [5],                // jours de l'enquête où un témoin tardif peut aider les zones qui piétinent
  memoire: 10,                // derniers événements retenus (pas de redite)
};

/** Réglages du maître du jeu (écran « Maître du jeu ») : rangés dans l'état, donc les mêmes pour tous les appareils. */
export const REGLAGES = {
  intensite: { doux: { nom: 'Doux', mult: 0.6 }, normal: { nom: 'Normal', mult: 1 }, corse: { nom: 'Corsé', mult: 1.4 } },
  feuilletons: { peu: { nom: 'Peu', mult: 0.5 }, normal: { nom: 'Normal', mult: 1 }, beaucoup: { nom: 'Beaucoup', mult: 1.6 } },
};
export function reglages(state) {
  const r = (state && state.dir && state.dir.reglages) || {};
  return { intensite: REGLAGES.intensite[r.intensite] ? r.intensite : 'normal', feuilletons: REGLAGES.feuilletons[r.feuilletons] ? r.feuilletons : 'normal' };
}
const multI = (state) => REGLAGES.intensite[reglages(state).intensite].mult;
const multF = (state) => REGLAGES.feuilletons[reglages(state).feuilletons].mult;

const PHASES = ['calme', 'montee', 'orage', 'eclaircie'];
const SUIVANTE = { calme: 'montee', montee: 'orage', orage: 'eclaircie', eclaircie: 'calme' };

/** Le ciel du jour, tel qu'il est montré au joueur. */
export const CIELS = {
  calme: { nom: 'Ciel clair', court: 'clair', texte: 'Journée calme : le bon moment pour investir, former, rattraper le retard.' },
  montee: { nom: 'Ciel chargé', court: 'chargé', texte: 'Ça se couvre : surveille les signes, des tracas sont possibles (un Accueil fourni en évite).' },
  orage: { nom: 'Orage', court: 'orage', texte: 'Grosse journée : opération, coup dur ou feuilleton décisif. Évite le rythme renforcé et soigne ton Accueil.' },
  eclaircie: { nom: 'Éclaircie', court: 'éclaircie', texte: 'Après l’orage : rien de grave aujourd’hui, de bonnes nouvelles possibles.' },
};

const SERVICES_SEUIL = { intervention: 3, proximite: 1, recherche: 1, roulage: 1, admin: 1 };
const label = (z) => (z ? `ZP ${z.code} ${z.nom}` : 'une zone');
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ───── État du Directeur dans une zone ─────
export function assurerDir(z) {
  const d = z.dir && typeof z.dir === 'object' ? z.dir : {};
  if (!PHASES.includes(d.ph)) { d.ph = 'calme'; d.j = 0; d.n = 3; }
  d.j = Number.isFinite(d.j) ? d.j : 0;
  d.n = Number.isFinite(d.n) ? d.n : 3;
  if (!Array.isArray(d.h)) d.h = [];
  if (!d.neg || typeof d.neg !== 'object') d.neg = {};
  if (!d.mem || typeof d.mem !== 'object') d.mem = {};
  if (d.fe === undefined) d.fe = null;
  d.cdF = d.cdF || 0; d.cdD = d.cdD || 0; d.routine = d.routine || 0;
  z.dir = d;
  return d;
}
/** Ce que le Directeur garde d'une saison à l'autre (niveau des énigmes et des mini-jeux, souvenirs). */
export const dirHeritage = (z) => JSON.parse(JSON.stringify({ enig: (z.dir && z.dir.enig) ? { ...z.dir.enig, h: enObjets(z.dir.enig.h) } : null, inc: (z.dir && z.dir.inc) ? { ...z.dir.inc, h: enObjets(z.dir.inc.h) } : null, mem: (z.dir && z.dir.mem) || {} }));

/** Ciel du jour d'une zone (pour l'affichage). */
export function cielDe(z) {
  const ph = z && z.dir && PHASES.includes(z.dir.ph) ? z.dir.ph : 'calme';
  return { id: ph, ...CIELS[ph] };
}

const memoriser = (d, id) => { d.h = [...d.h.filter((x) => x !== id), id].slice(-DIR.memoire); };
const recent = (d, id, n = 6) => d.h.slice(-n).includes(id);
const actif = (z) => (z.toursSansOrdres || 0) < 2;
const present = (z) => (z.toursSansOrdres || 0) === 0;

// ───── Lecture de la zone ─────

/**
 * Forme de chaque zone active, de −1 (dernière) à +1 (première), d'après l'IPZ moyen.
 * Moins de 3 zones classables : tout le monde à 0.
 */
export function formes(state) {
  const zs = Object.values(state.zones || {}).filter((z) => (z.toursSansOrdres || 0) < 3 && (z.toursJoues || 0) >= 2);
  const out = {};
  for (const z of Object.values(state.zones || {})) out[z.uid] = 0;
  if (zs.length < 3) return out;
  const tri = zs.slice().sort((a, b) => moyenneIpz(b) - moyenneIpz(a) || String(a.uid).localeCompare(String(b.uid)));
  tri.forEach((z, i) => { out[z.uid] = round1(1 - (2 * i) / (tri.length - 1)); });
  return out;
}

/** Faiblesses de la zone : poids des coups durs (≥ DIR.fragile = vraie faiblesse) et explication. */
export function fragilites(z) {
  const niv = (z.niveaux && z.niveaux.intervention) || 1, eq = (z.equip && z.equip.intervention) || 1;
  const infra = z.infra || {};
  const l = [];
  {
    let w = 1, pq = 'les nuits sont chaudes, même pour une équipe aguerrie';
    if (niv <= 1) { w *= 2; pq = 'ton Intervention n’a jamais été formée (niveau 1)'; } else if (niv >= 3) w *= 0.5;
    if (eq <= 1) { w *= 1.4; if (niv > 1) pq = 'l’équipement de ton Intervention est minimal'; } else if (eq >= 3) w *= 0.7;
    if (infra.tir) w *= 0.8;
    l.push({ id: 'rebellion', w: 3 * w, f: w, pourquoi: pq });
  }
  {
    let w = 1, pq = 'la saison s’y prête';
    if (z.moral < 50) { w *= 2.5; pq = `un moral bas (${Math.round(z.moral)}) fragilise les troupes`; } else if (z.moral > 70) w *= 0.5;
    if (infra.sport) w *= 0.6; else if (z.moral < 50) pq += ', et pas de salle de sport';
    l.push({ id: 'grippe', w: 2 * w, f: w, pourquoi: pq });
  }
  {
    let w = 1, pq = 'un plaignant mécontent a alerté la presse';
    if (z.paperasse >= 12) { w *= 2.5; pq = `${Math.round(z.paperasse)} dossiers en souffrance : un plaignant s’est lassé`; } else if (z.paperasse < 8) w *= 0.5;
    if (z.reputation > 60) w *= 0.6; else if (z.reputation < 40) { w *= 1.4; if (z.paperasse < 12) pq = 'ta réputation est fragile'; }
    l.push({ id: 'plainte', w: 2 * w, f: w, pourquoi: pq });
  }
  {
    const w = infra.logiciel ? 0.4 : 1.5;
    l.push({ id: 'panne', w: 1 * w, f: w, pourquoi: infra.logiciel ? 'même le meilleur logiciel plante un jour' : 'pas de logiciel de gestion (annexe) pour sauvegarder' });
  }
  return l;
}

const pireFragilite = (z) => Math.max(...fragilites(z).map((x) => x.f));

// ───── Aléas : bonnes et mauvaises nouvelles ─────
function valence(a) {
  const e = a.effet || {};
  let v = (e.moral || 0) + (e.satisfaction || 0) + (e.budget || 0) * 1.5 - (e.paperasse || 0) * 0.7;
  if (e.vehiculeHS) v -= 2; if (e.bloques) v -= 2 * e.bloques; if (e.retardEnquete) v -= 2;
  if (e.adminMult) v -= (1 - e.adminMult) * 6;
  return v;
}
export const ALEAS_POSITIFS = ALEAS.filter((a) => valence(a) > 0);
export const ALEAS_NEGATIFS = ALEAS.filter((a) => valence(a) <= 0);

/** Le héros du jour : une figure de l'équipe fait la une (éclaircie seulement). */
const EXPLOITS = [
  'sauve un enfant tombé dans le canal', 'maîtrise un forcené sans un coup', 'retrouve un randonneur égaré à la nuit tombée',
  'ramène à sa famille une dame désorientée', 'éteint un début d’incendie dans une cage d’escalier', 'arrête un chauffard en fuite après une course-poursuite à pied',
];

/**
 * Imprévus du jour (appelé au début de la simulation de la zone) : un aléa léger et/ou un coup dur.
 * @returns {{ alea: object|null, coupDur: object|null, pourquoi: string|null, heros: object|null }}
 */
export function imprevusDuJour(state, z, rng) {
  const d = assurerDir(z);
  const ph = d.ph;
  const mi = multI(state);
  const out = { alea: null, coupDur: null, pourquoi: null, heros: null };
  // Zone absente : seulement de petites bonnes nouvelles, de temps en temps.
  if (!actif(z)) {
    if (rng.chance(0.15)) out.alea = rng.pick(ALEAS_POSITIFS);
    return out;
  }
  // Aléa léger.
  if (rng.chance(DIR.alea[ph])) {
    const positif = rng.chance(ph === 'eclaircie' ? 1 : clamp(1 - (1 - DIR.aleaPositif[ph]) * mi, 0, 1));
    if (positif && ph === 'eclaircie' && (z.equipe || []).length && !recent(d, 'heros', 8) && rng.chance(0.3)) {
      const m = rng.pick(z.equipe);
      out.heros = { membre: m, exploit: rng.pick(EXPLOITS) };
      memoriser(d, 'heros');
    } else {
      let pool = (positif ? ALEAS_POSITIFS : ALEAS_NEGATIFS).filter((a) => !recent(d, a.id));
      if (!pool.length) pool = positif ? ALEAS_POSITIFS : ALEAS_NEGATIFS;
      // Accueil dégarni depuis plusieurs jours : les tracas internes sont plus fréquents.
      const negAdmin = d.neg.admin || 0;
      const a = rng.weighted(pool.map((x) => ({ ...x, w: x.interne && negAdmin >= 2 ? 2.5 : 1 })));
      out.alea = ALEAS.find((x) => x.id === a.id);
      if (!positif && a.interne && negAdmin >= 2) out.pourquoiAlea = `Accueil dégarni depuis ${negAdmin} jours`;
      memoriser(d, a.id);
    }
  }
  // Coup dur : l'orage annoncé, ou une vraie faiblesse par ciel chargé.
  const fr = fragilites(z);
  const pire = Math.max(...fr.map((x) => x.f));
  if ((ph === 'orage' && d.orage === 'coup') || (ph === 'montee' && pire >= DIR.fragile && rng.chance(DIR.coupMontee * mi))) {
    const pool = fr.filter((x) => !recent(d, x.id, 4));
    const c = rng.weighted(pool.length ? pool : fr);
    out.coupDur = { ...COUPS_DURS.find((x) => x.id === c.id) };
    out.pourquoi = c.pourquoi;
    memoriser(d, c.id);
  }
  return out;
}

// ───── Feuilletons et dilemmes ─────
// Chaque étape : un signe affiché dans la situation du jour, éventuellement un choix, puis un test résolu à 20:00.
// `delai` : nombre de tours avant le test (1 = le jour même où le signe apparaît).
// `besoin` / `min` : service que le feuilleton sollicite (pour bousculer une zone qui ne change jamais rien).
// `resoudre` peut renvoyer `mem` : ce que le Directeur retient pour plus tard (les dilemmes reviennent).

const nomQ = (state, cell) => carteQuartiers(state).nomDe(Number(cell));

function quartierTendu(state, z, rng, eviter = null) {
  const q = assurerQuartiers(state, z);
  const cells = Object.keys(q).filter((k) => k !== String(eviter));
  if (!cells.length) return null;
  const tri = cells.sort((a, b) => q[b] - q[a]);
  return tri[rng.int(0, Math.min(1, tri.length - 1))];
}
const initQuartier = (state, z, rng) => { const cell = quartierTendu(state, z, rng, z.pointChaud && z.pointChaud.cell); return cell ? { cell } : null; };

/** Noms possibles de l'ennemi de la saison. */
export const FANTOMES = ['le Fantôme du Delta', 'la Fouine', 'le Renard des Glacis', 'l’Horloger', 'le Funambule', 'la Couleuvre'];
const nomFantome = (state) => (state && state.dir && state.dir.fantome && state.dir.fantome.nom) || FANTOMES[0];

export const FEUILLETONS = {
  cambrioleur: {
    titre: 'Le cambrioleur des toits', besoin: 'proximite', min: 2,
    poids: (z, x) => (x.quartiers ? 1 + ((z.dir.neg.proximite || 0) >= 2 ? 2 : 0) + (x.tensionMax >= 60 ? 1 : 0) : 0),
    init: initQuartier,
    etapes: {
      debut: {
        signe: (s, d) => ({ titre: `Cambrioleur des toits à ${nomQ(s, d.cell)}`, texte: `Deux maisons visitées par les toits. 2 patrouilles à ${nomQ(s, d.cell)} ce soir (Carte).`, quartier: d.cell, patrouilles: 2 }),
        resoudre: (c, d) => ((c.patrouilles[d.cell] || 0) >= 2
          ? { ok: true, fx: { pts: 5, sat: 3, quartier: -8 }, texte: `pris sur le fait à ${nomQ(c.state, d.cell)}`, une: [6, 'Faits divers', `Le cambrioleur des toits arrêté à ${nomQ(c.state, d.cell)}`] }
          : { ok: false, fx: { sat: -2, quartier: 4 }, texte: 'il a encore frappé, la presse s’en empare', suite: 'recidive' }),
      },
      recidive: {
        signe: (s, d) => ({ titre: 'Le cambrioleur des toits nargue la police', texte: `3 patrouilles à ${nomQ(s, d.cell)} ou une campagne de prévention ce soir.`, quartier: d.cell, patrouilles: 3 }),
        resoudre: (c, d) => ((c.patrouilles[d.cell] || 0) >= 3 || c.achete.has('prevention')
          ? { ok: true, fx: { pts: 6, sat: 4, rep: 1, quartier: -8 }, texte: 'enfin coincé, les riverains applaudissent', une: [7, 'Faits divers', 'Fin de cavale pour le cambrioleur des toits'] }
          : { ok: false, fx: { sat: -4, crim: 3, rep: -1 }, texte: 'il court toujours, le quartier perd confiance', une: [5, 'Faits divers', 'Le cambrioleur des toits court toujours'] }),
      },
    },
  },
  rodeos: {
    titre: 'Rodéos urbains', besoin: 'roulage', min: 3,
    poids: (z) => 0.6 + ((z.dir.neg.roulage || 0) >= 2 ? 2 : 0),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Rodéos de motos la nuit', texte: '3 agents en Roulage ce soir pour les coincer.', service: 'roulage', min: 3 }),
        resoudre: (c) => (c.alloc.roulage >= 3
          ? { ok: true, fx: { pts: 4, sat: 3, budget: 1.5 }, texte: 'motos saisies et revendues aux enchères' }
          : { ok: false, fx: { sat: -2 }, texte: 'les motards ont filé', suite: 'accident' }),
      },
      accident: {
        signe: () => ({ titre: 'Rodéo : un piéton renversé', texte: 'Les riverains exigent des contrôles : 3 agents en Roulage ce soir.', service: 'roulage', min: 3 }),
        resoudre: (c) => (c.alloc.roulage >= 3
          ? { ok: true, fx: { pts: 3, sat: 3 }, texte: 'les meneurs identifiés, les rodéos cessent', une: [5, 'Faits divers', 'Fin des rodéos urbains'] }
          : { ok: false, fx: { sat: -5, rep: -2, pap: 2 }, texte: 'la colère gronde, pétition des riverains', une: [6, 'Faits divers', 'Rodéos urbains : les riverains à bout'] }),
      },
    },
  },
  audit: {
    titre: 'Audit de l’Inspection', besoin: 'admin', min: 4,
    poids: (z) => ((z.paperasse >= 9 ? 2 : 0) + ((z.dir.neg.admin || 0) >= 2 ? 1 : 0) + ((z.dossiers || []).filter((x) => x.age > 4).length >= 2 ? 1 : 0)),
    etapes: {
      debut: {
        delai: 2,
        signe: (s, d, reste) => ({ titre: reste > 1 ? `Audit de l’Inspection dans ${reste} jours` : 'Audit de l’Inspection ce soir', texte: 'Le jour J : paperasse sous 8 et aucun dossier de plus de 6 jours.' }),
        resoudre: (c) => (c.z.paperasse <= 8 && !(c.z.dossiers || []).some((x) => x.age > 6)
          ? { ok: true, fx: { rep: 4, budget: 2, sat: 1 }, texte: 'gestion exemplaire, prime de bonne gestion', une: [5, 'Inspection', `Audit exemplaire pour ${c.label}`] }
          : { ok: false, fx: { rep: -3, sat: -3, budget: -2 }, texte: `${Math.round(c.z.paperasse)} dossiers en attente, rapport sévère`, une: [6, 'Inspection', `Audit sévère pour ${c.label}`] }),
      },
    },
  },
  parc: {
    titre: 'Contrôle technique surprise',
    poids: (z) => (z.usure >= 40 ? 2 + (z.usure >= 55 ? 1 : 0) : 0),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Contrôle technique surprise', texte: 'Ce soir : état du parc à 60 % ou plus, ou une révision dans tes dépenses.' }),
        resoudre: (c) => (c.achete.has('revision') || 100 - c.z.usure >= 60
          ? { ok: true, fx: { rep: 1, moral: 1 }, texte: 'le parc passe le contrôle sans remarque' }
          : { ok: false, fx: { vhs: 1, budget: -1 }, texte: 'un combi retiré de la circulation 2 tours, amende de 1 k€' }),
      },
    },
  },
  evasion: {
    titre: 'Évasion lors d’un transfert', orage: true, besoin: 'intervention', min: 8,
    poids: (z, x) => (x.forme >= -0.2 ? 1 + x.forme : 0.3),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Évasion lors d’un transfert !', texte: 'Un détenu s’est fait la belle : 8 agents en Intervention ce soir pour le reprendre.', service: 'intervention', min: 8 }),
        resoudre: (c) => (c.alloc.intervention >= 8
          ? { ok: true, fx: { pts: 9, rep: 2, sat: 2, moral: 2 }, texte: 'repris avant minuit', une: [9, 'Évasion', `${c.label} reprend l’évadé avant minuit`] }
          : { ok: false, fx: { sat: -4, rep: -2 }, texte: 'il court toujours, le parquet s’agace', une: [8, 'Évasion', `L’évadé court toujours dans la zone de ${c.label}`] }),
      },
    },
  },
  fete: {
    titre: 'Fête de quartier', besoin: 'proximite', min: 4,
    poids: (z, x) => (x.quartiers && (z.dir.neg.proximite || 0) === 0 ? 1.2 : 0),
    init: (state, z, rng) => { const q = assurerQuartiers(state, z); const cells = Object.keys(q); return cells.length ? { cell: rng.pick(cells) } : null; },
    etapes: {
      debut: {
        signe: (s, d) => ({ titre: `Fête de quartier à ${nomQ(s, d.cell)}`, texte: 'Les habitants invitent la police : 4 agents en Proximité ce soir.', service: 'proximite', min: 4 }),
        resoudre: (c) => (c.alloc.proximite >= 4
          ? { ok: true, fx: { sat: 4, moral: 1, quartier: -6 }, texte: 'barbecue, photos avec les enfants, quartier apaisé' }
          : { ok: false, fx: { sat: -1 }, texte: 'personne n’est venu, les habitants sont déçus' }),
      },
    },
  },
  petition: {
    titre: 'Pétition de quartier', besoin: 'proximite', min: 2,
    poids: (z, x) => (x.quartiers && (z.dir.neg.proximite || 0) >= 3 ? 3 : 0),
    init: initQuartier,
    etapes: {
      debut: {
        signe: (s, d) => ({ titre: `Pétition des habitants de ${nomQ(s, d.cell)}`, texte: `« On ne voit jamais la police ! » 2 patrouilles à ${nomQ(s, d.cell)} ce soir.`, quartier: d.cell, patrouilles: 2 }),
        resoudre: (c, d) => ((c.patrouilles[d.cell] || 0) >= 2
          ? { ok: true, fx: { sat: 3, rep: 1, quartier: -6 }, texte: 'les habitants retirent leur pétition' }
          : { ok: false, fx: { sat: -3, rep: -1 }, texte: 'la pétition part chez le bourgmestre', une: [4, 'Quartiers', `Pétition contre l’absence de ${c.label}`] }),
      },
    },
  },
  // ── L'ennemi de la saison (lancé par le district, jamais tiré au hasard dans une zone) ──
  fantome: {
    titre: 'Le Fantôme', district: true, orage: true, besoin: 'proximite', min: 3,
    poids: () => 0,
    init: initQuartier,
    etapes: {
      debut: {
        signe: (s, d) => ({ titre: `${majuscule(nomFantome(s))} aperçu à ${nomQ(s, d.cell)}`, texte: `L’ennemi du district rôde : 3 patrouilles à ${nomQ(s, d.cell)} ce soir pour le serrer de près.`, quartier: d.cell, patrouilles: 3 }),
        resoudre: (c, d) => {
          const f = c.state.dir && c.state.dir.fantome;
          const nom = nomFantome(c.state);
          if ((c.patrouilles[d.cell] || 0) >= 3) {
            if (f) { f.dossier = (f.dossier || 0) + 1; f.pistes = [...(f.pistes || []), c.z.uid].slice(-12); }
            const n = f ? f.dossier : 1;
            return { ok: true, fx: { pts: 5, rep: 2 }, texte: `il file de justesse mais laisse une trace : dossier à ${n} pièce${n > 1 ? 's' : ''}`,
              une: [8, 'L’ennemi du district', `${c.label} serre de près ${nom}`, `Il s’échappe encore, mais le dossier s’épaissit (${n} pièce${n > 1 ? 's' : ''}) : il faudra moins d’agents pour la grande opération de fin de saison.`] };
          }
          return { ok: false, fx: { sat: -1 }, texte: 'personne au rendez-vous, il nargue la police', une: [5, 'L’ennemi du district', `${majuscule(nom)} nargue ${c.label}`, 'Une carte de visite laissée sur le capot d’un combi.'] };
        },
      },
    },
  },
  // ── Dilemmes ──
  greve: {
    titre: 'Grogne au vestiaire', dilemme: true,
    poids: (z) => ((z.moral < 52 ? 2.5 : 0) + ((z.renforceSuite || 0) >= 2 ? 2 : 0)) * (z.dir.mem.greve === 'prime' ? 1.5 : 1),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Grogne au vestiaire', texte: 'Le délégué syndical attend ta réponse avant 20:00.' }),
        question: (z) => (z.dir.mem.greve === 'prime'
          ? 'Le délégué revient : la dernière prime a donné des idées. Heures sup’, vestiaires vétustes, il menace d’un arrêt de travail.'
          : z.dir.mem.greve === 'arret' ? 'Encore la grogne : le dernier arrêt de travail est dans toutes les têtes. Le délégué menace de recommencer.'
            : 'Heures sup’, vestiaires vétustes : le délégué syndical menace d’un arrêt de travail.'),
        choix: [
          { l: 'Lâcher une prime', s: '−2,5 k€, +5 de moral' },
          { l: 'Tenir bon', s: 'si le moral est à 50 ou plus ce soir, la grogne retombe ; sinon, arrêt de travail' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => (ch === 0
          ? { ok: true, fx: { budget: -2.5, moral: 5 }, texte: 'prime versée, la tension retombe', mem: { greve: 'prime' } }
          : c.z.moral >= 50
            ? { ok: true, fx: { moral: 2, rep: 1 }, texte: 'la grogne retombe d’elle-même', mem: { greve: 'tenu' } }
            : { ok: false, fx: { bloques: 2, moral: -2 }, texte: 'arrêt de travail, 2 agents absents 2 tours', une: [6, 'Social', `Arrêt de travail à ${c.label}`], mem: { greve: 'arret' } }),
      },
    },
  },
  indic: {
    titre: 'Un indic veut parler', dilemme: true,
    poids: (z, x) => (x.enquete && !z.dir.mem.indic ? 1.2 + (x.forme < 0 ? 1 : 0) : 0),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Un indic veut parler', texte: 'Il attend ta réponse avant 20:00.' }),
        question: 'Un petit voyou prétend savoir quelque chose sur l’affaire en cours. Il demande à être payé.',
        choix: [
          { l: 'Le payer', s: '−2 k€ : un indice d’enquête' },
          { l: 'Le confier à la Recherche', s: '4 agents en Recherche ce soir : indice gratuit ; sinon il disparaît' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => {
          if (ch === 0) return { ok: true, fx: { budget: -2, indice: 1 }, texte: 'il a parlé', mem: { indic: 'paye' } };
          return c.alloc.recherche >= 4 ? { ok: true, fx: { indice: 1 }, texte: 'tes enquêteurs l’ont fait parler sans débourser un euro', mem: { indic: 'recherche' } } : { ok: false, fx: {}, texte: 'personne pour l’écouter, il s’est évaporé', mem: { indic: 'perdu' } };
        },
      },
    },
  },
  indic2: {
    titre: 'L’indic revient', dilemme: true,
    poids: (z, x) => (x.enquete && ['paye', 'recherche'].includes(z.dir.mem.indic) ? 3 : 0),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Ton indic est de retour', texte: 'Il attend ta réponse avant 20:00.' }),
        question: (z) => (z.dir.mem.indic === 'paye'
          ? 'Ton indic de l’autre jour revient : « un gros tuyau, mais cette fois c’est 3 k€ ». Il a été fiable… la dernière fois.'
          : 'L’indic que tes enquêteurs ont fait parler revient de lui-même. Un gros tuyau, dit-il, contre 3 k€.'),
        choix: [
          { l: 'Payer 3 k€', s: 'deux indices… si le tuyau est bon' },
          { l: 'Le renvoyer', s: 'rien à payer, mais il pourrait mal le prendre' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => {
          if (ch === 0) return c.rng.chance(0.65) ? { ok: true, fx: { budget: -3, indice: 2 }, texte: 'le tuyau était bon', mem: { indic: 'fini' } } : { ok: false, fx: { budget: -3 }, texte: 'tuyau bidon, l’argent est perdu', mem: { indic: 'fini' } };
          return c.z.dir.mem.indic === 'paye'
            ? { ok: false, fx: { rep: -2 }, texte: 'vexé, il raconte partout que tu paies tes indics', mem: { indic: 'fini' } }
            : { ok: true, fx: { rep: 1 }, texte: 'il repart, ta procédure reste propre', mem: { indic: 'fini' } };
        },
      },
    },
  },
  journaliste: {
    titre: 'Une journaliste à la porte', dilemme: true,
    poids: (z) => (z.dir.mem.journaliste ? 0.4 : 0.8 + (z.satisfaction > 60 || z.satisfaction < 42 ? 1 : 0)),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Une journaliste demande une interview', texte: 'Réponds avant 20:00.' }),
        question: (z) => `La Voix du Delta prépare un portrait de la zone. Ta satisfaction ce matin : ${Math.round(z.satisfaction)}.${z.dir.mem.journaliste === 'amie' ? ' C’est la même journaliste que la dernière fois.' : z.dir.mem.journaliste === 'hostile' ? ' C’est celle qui t’avait étrillé.' : ''}`,
        choix: [
          { l: 'Accorder l’interview', s: 'satisfaction à 55 ou plus ce soir : bonne presse ; sinon, ça se retourne contre toi' },
          { l: 'Pas de commentaire', s: '−1 de satisfaction' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => (ch === 1
          ? { ok: true, fx: { sat: -1 }, texte: '« la police ne souhaite pas s’exprimer »', mem: { journaliste: c.z.dir.mem.journaliste || 'muet' } }
          : c.z.satisfaction >= 55
            ? { ok: true, fx: { sat: 4, rep: 2 }, texte: 'portrait élogieux, la journaliste te garde en estime', une: [5, 'Presse', `Portrait flatteur de ${c.label} dans La Voix du Delta`], mem: { journaliste: 'amie' } }
            : { ok: false, fx: { sat: -4, rep: -1 }, texte: 'article au vitriol', une: [5, 'Presse', `${c.label} étrillée par La Voix du Delta`], mem: { journaliste: 'hostile' } }),
      },
    },
  },
  mecene: {
    titre: 'Un sponsor pour le combi', dilemme: true,
    poids: (z, x) => (z.dir.mem.sponsor ? 0 : z.budget < 8 || x.forme < -0.3 ? 2 : 0.5),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Une proposition de sponsoring', texte: 'Réponds avant 20:00.' }),
        question: 'Le garage Delta Auto offre 4 k€ si son logo est peint sur un de tes combis.',
        choix: [
          { l: 'Accepter', s: '+4 k€, −2 de réputation' },
          { l: 'Refuser poliment', s: '+1 de réputation' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => (ch === 0
          ? { ok: true, fx: { budget: 4, rep: -2 }, texte: 'le combi « Delta Auto » fait sourire le district', une: [2, 'Insolite', `Un combi publicitaire chez ${c.label}`, 'Le logo d’un garage s’affiche désormais sur la portière.'], mem: { sponsor: c.T } }
          : { ok: true, fx: { rep: 1 }, texte: 'la commune salue ton intégrité', mem: { sponsor: 'refuse' } }),
      },
    },
  },
  polemique: {
    titre: 'Delta Auto dans la tourmente', dilemme: true,
    poids: (z, x) => (typeof z.dir.mem.sponsor === 'number' && x.T1 - z.dir.mem.sponsor >= 3 ? 4 : 0),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Ton sponsor dans la tourmente', texte: 'Décide avant 20:00.' }),
        question: 'Le garage Delta Auto, ton sponsor, est soupçonné de fraude. Son logo s’affiche toujours sur ton combi.',
        choix: [
          { l: 'Repeindre la portière', s: '−1 k€, +1 de réputation' },
          { l: 'Laisser le logo', s: 'économique… si personne ne fait le lien' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => (ch === 0
          ? { ok: true, fx: { budget: -1, rep: 1 }, texte: 'portière repeinte en vitesse', mem: { sponsor: 'fini' } }
          : { ok: false, fx: { rep: -3, sat: -2 }, texte: 'la photo du combi fait la une, malaise', une: [5, 'Presse', `Le combi « Delta Auto » de ${c.label} fait jaser`], mem: { sponsor: 'fini' } }),
      },
    },
  },
  occasion: {
    titre: 'Vente de matériel fédéral', dilemme: true,
    poids: (z) => (z.budget > BUDGET_IPZ.dormant ? 4 : z.budget > 60 ? 1 : 0),
    init: (state, z) => {
      const s = SERVICES.filter((k) => (z.equip[k] || 1) < NIVEAU_MAX).sort((a, b) => z.equip[a] - z.equip[b] || a.localeCompare(b))[0];
      return s ? { s, prix: Math.max(3, Math.round(coutEquipement(z.equip[s]) * 0.6)) } : null;
    },
    etapes: {
      debut: {
        signe: () => ({ titre: 'Matériel fédéral à prix cassé', texte: 'Décide avant 20:00.' }),
        question: (z, d) => `La police fédérale brade du matériel ${SERVICE_LABELS[d.s]} presque neuf : ${d.prix} k€ au lieu de ${coutEquipement(z.equip[d.s])}. Ta caisse : ${Math.round(z.budget)} k€.`,
        choix: (z, d) => [
          { l: 'Acheter', s: `−${d.prix} k€ : équipement ${SERVICE_LABELS[d.s]} au niveau ${(z.equip[d.s] || 1) + 1}` },
          { l: 'Garder la réserve', s: 'rien ne change' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => {
          if (ch !== 0) return { ok: true, fx: {}, texte: 'tu gardes ta réserve' };
          if (c.z.budget < d.prix || (c.z.equip[d.s] || 1) >= NIVEAU_MAX) return { ok: false, fx: {}, texte: 'achat impossible ce soir (budget ou niveau maximum)' };
          c.z.equip[d.s] = (c.z.equip[d.s] || 1) + 1;
          return { ok: true, fx: { budget: -d.prix }, texte: `équipement ${SERVICE_LABELS[d.s]} au niveau ${c.z.equip[d.s]}` };
        },
      },
    },
  },
};

/** Dilemme lié à l'enquête (l'indic) alors qu'aucune affaire n'est en cours : il n'a plus de sens. */
const sansEnquete = (state, id) => (id === 'indic' || id === 'indic2') && (!state.enquete || !!state.enquetePause);

/** Situation du jour à afficher : sans affaire en cours, l'indic ne se présente pas. */
export const pressionsVisibles = (state, z) => ((z && z.pressions) || []).filter((p) => !(p.feuilleton && sansEnquete(state, p.feuilleton)));

const choixDe = (et, z, d) => (typeof et.choix === 'function' ? et.choix(z, d || {}) : et.choix);

/** Dilemme posé aujourd'hui à cette zone (pour l'affichage), ou null. */
export function dilemmeDuJour(state, z) {
  const fe = z && z.dir && z.dir.fe;
  if (!fe || fe.tour !== state.turn) return null;
  const def = FEUILLETONS[fe.id];
  const et = def && def.etapes[fe.e];
  if (!et || !et.choix || sansEnquete(state, fe.id)) return null;
  return { id: fe.id, titre: def.titre, question: typeof et.question === 'function' ? et.question(z, fe.d || {}) : et.question, choix: choixDe(et, z, fe.d), defaut: et.defaut };
}

/** Feuilleton en cours (pour l'affichage) : { titre, signe, tour du test, duo } ou null. */
export function feuilletonEnCours(state, z) {
  const fe = z && z.dir && z.dir.fe;
  if (!fe || !FEUILLETONS[fe.id]) return null;
  const def = FEUILLETONS[fe.id], et = def.etapes[fe.e];
  if (!et) return null;
  return { id: fe.id, titre: def.titre, dilemme: !!et.choix, tour: fe.tour, duo: fe.duo || null, signe: et.signe(state, fe.d || {}, Math.max(1, fe.tour - state.turn + 1)) };
}

function lancerFeuilleton(state, z, id, rng, T1, extra = {}) {
  const def = FEUILLETONS[id];
  const data = def.init ? def.init(state, z, rng) : {};
  if (!data) return false;
  const d = assurerDir(z);
  d.fe = { id, e: 'debut', tour: T1 + (def.etapes.debut.delai || 1) - 1, d: data, ...extra };
  memoriser(d, `fe-${id}`);
  if (def.dilemme) d.cdD = T1 + DIR.pauseDilemme;
  return true;
}

// ───── Effets ─────
const plus = (v) => `${v > 0 ? '+' : '−'}${String(Math.abs(round1(v))).replace('.', ',')}`;
function appliquer(z, fx, c) {
  const t = [];
  // Criminalité = moyenne des quartiers : on garde les deux d'accord.
  const resync = () => { const v = Object.values(z.quartiers || {}); if (v.length) z.criminalite = round1(v.reduce((a, b) => a + b, 0) / v.length); };
  if (fx.sat) { z.satisfaction += fx.sat; t.push(`${plus(fx.sat)} de satisfaction`); }
  if (fx.moral) { z.moral += fx.moral; t.push(`${plus(fx.moral)} de moral`); }
  if (fx.rep) { z.reputation += fx.rep; t.push(`${plus(fx.rep)} de réputation`); }
  if (fx.pts) { z._points = (z._points || 0) + fx.pts; t.push(`${plus(fx.pts)} pts`); }
  if (fx.ps) { z._psEntraide = (z._psEntraide || 0) + fx.ps; t.push(`+${fx.ps} PS d’entraide`); }
  if (fx.budget) { z.budget += fx.budget; (z._compta ||= []).push({ k: 'directeur', l: c.compta || 'Feuilleton', v: fx.budget }); t.push(`${plus(fx.budget)} k€`); }
  if (fx.crim) {
    if (z.quartiers && Object.keys(z.quartiers).length) { for (const k of Object.keys(z.quartiers)) z.quartiers[k] = clamp(z.quartiers[k] + fx.crim, 10, 95); resync(); }
    else z.criminalite = clamp(z.criminalite + fx.crim, 10, 95);
    t.push(`criminalité ${plus(fx.crim)}`);
  }
  if (fx.pap) { z.paperasse = Math.max(0, z.paperasse + fx.pap); t.push(`${plus(fx.pap)} dossiers`); }
  if (fx.quartier && c.cell != null && z.quartiers && c.cell in z.quartiers) { z.quartiers[c.cell] = clamp(z.quartiers[c.cell] + fx.quartier, 10, 95); resync(); t.push(`tension du quartier ${plus(fx.quartier)}`); }
  if (fx.bloques) { z.blesses.push({ n: fx.bloques, retour: c.T + 3, motif: 'grève' }); }
  if (fx.vhs) { z.vehiculesHS.push({ retour: c.T + 2 }); }
  if (fx.indice) {
    let n = 0;
    for (let i = 0; i < fx.indice; i++) if (c.indice && c.indice()) n++;
    t.push(n ? `+${n} indice${n > 1 ? 's' : ''} d’enquête` : 'rien de neuf pour l’enquête');
  }
  return t.join(', ');
}

/** Un coup dur « plainte médiatisée » tempéré ou aggravé par la presse, selon le souvenir de la journaliste. */
export function memoirePlainte(z) {
  const j = z && z.dir && z.dir.mem && z.dir.mem.journaliste;
  if (j === 'amie') return { sat: 3, texte: ' La Voix du Delta prend ta défense : l’effet est réduit de moitié.' };
  if (j === 'hostile') return { sat: -2, texte: ' La Voix du Delta en remet une couche (−2 de plus).' };
  return { sat: 0, texte: '' };
}

// ───── Événements de district ─────
export const DISTRICT = {
  tempete: {
    titre: 'Tempête sur le district', annonce: 'Avis de tempête pour demain', texteAnnonce: 'Arbres, toitures, accidents : prévois de l’Intervention et un parc en état.',
    texte: '+2 incidents attendus. Aucun incident raté : la zone est citée en exemple.', effet: { incidents: 2 },
    resoudre: (c) => {
      const fx = c.rates === 0 ? { sat: 3, pts: 3 } : c.rates >= 3 ? { sat: -3 } : { sat: -1 };
      if (!(c.z.infra && c.z.infra.garage) && c.z.usure >= 45) fx.vhs = 1;
      return { ok: c.rates === 0, fx, texte: c.rates === 0 ? 'aucun appel laissé sans réponse' : `${c.rates} incident${c.rates > 1 ? 's' : ''} raté${c.rates > 1 ? 's' : ''}${fx.vhs ? ', un combi fatigué tombe en panne' : ''}` };
    },
  },
  canicule: {
    titre: 'Canicule', annonce: 'Canicule annoncée pour demain', texteAnnonce: 'Personnes âgées isolées, agents qui souffrent de la chaleur.',
    texte: '+1 incident. 3 agents en Proximité ou plus : visites aux aînés. Rythme renforcé : −3 de moral.', effet: { incidents: 1 },
    resoudre: (c) => {
      const fx = c.alloc.proximite >= 3 ? { sat: 3, moral: 1 } : { sat: -2 };
      if (c.o.rythme === 'renforce') fx.moral = (fx.moral || 0) - 3;
      return { ok: c.alloc.proximite >= 3, fx, texte: c.alloc.proximite >= 3 ? 'tournées chez les aînés isolés, la population apprécie' : 'personne pour veiller sur les aînés' };
    },
  },
  fetes: {
    titre: 'Fêtes du Delta', annonce: 'Les Fêtes du Delta, c’est demain', texteAnnonce: 'Cortège, foule et parkings saturés dans tout le district.',
    texte: '+1 incident. 2 agents en Roulage et 3 en Proximité : fête réussie (+ recettes de stationnement).', effet: { incidents: 1 },
    resoudre: (c) => (c.alloc.roulage >= 2 && c.alloc.proximite >= 3
      ? { ok: true, fx: { sat: 4, budget: 1.5 }, texte: 'circulation fluide et ambiance bon enfant' }
      : { ok: false, fx: { sat: -2 }, texte: `${c.alloc.roulage < 2 ? 'embouteillages monstres' : 'foule mal encadrée'}` }),
  },
  marathon: {
    titre: 'Marathon du Delta', annonce: 'Marathon du Delta demain', texteAnnonce: 'Le parcours traverse toutes les zones : il faut fermer les carrefours.',
    texte: '3 agents en Roulage ou plus : parcours sécurisé.', effet: {},
    resoudre: (c) => (c.alloc.roulage >= 3
      ? { ok: true, fx: { sat: 3, rep: 1 }, texte: 'carrefours fermés à temps, record battu' }
      : { ok: false, fx: { sat: -3 }, texte: 'un automobiliste sur le parcours, coureurs furieux' }),
  },
};

/** Agents demandés par zone pour la grande opération contre le Fantôme : moins il y a de pièces au dossier, plus il en faut. */
export const parZoneFantome = (f) => Math.max(1.5, round1(3 - 0.4 * ((f && f.dossier) || 0)));

/** Paires de zones voisines (pour le fugitif à la frontière) : [{ a, b, ca, cb }]. */
function frontieres(state, ok) {
  const c = carteQuartiers(state);
  const out = [];
  for (const a of Object.keys(c.deZone).sort()) {
    if (!state.zones[a] || !ok(state.zones[a])) continue;
    for (const ca of c.deZone[a]) for (const nb of c.adj[ca] || []) {
      const b = c.proprio(nb);
      if (b && b > a && state.zones[b] && ok(state.zones[b])) out.push({ a, b, ca: String(ca), cb: String(nb) });
    }
  }
  return out;
}

/**
 * La nuit du tour T, à l'échelle du district (avant de préparer chaque zone) : événement du district, ennemi de la
 * saison, fugitif à la frontière de deux zones, défi en duo.
 */
export function districtNuit(state, T, rng) {
  const dd = state.dir && typeof state.dir === 'object' ? state.dir : (state.dir = {});
  const T1 = T + 1;
  const zones = Object.values(state.zones || {});
  const actives = zones.filter(actif);
  if (!dd.prochain) dd.prochain = DIR.premierOrage + 3 + rng.int(0, 3);

  // 1. Événement du district (ou celui que le maître du jeu a demandé).
  if ((!dd.g || dd.g.tour <= T) && T + 2 <= SEASON_LENGTH && actives.length >= 2 && ((dd.forcer && DISTRICT[dd.forcer]) || T + 2 >= dd.prochain)) {
    const id = dd.forcer && DISTRICT[dd.forcer] ? dd.forcer : rng.pick(Object.keys(DISTRICT).filter((k) => k !== dd.dernier));
    dd.g = { id, tour: T + 2 };
    dd.dernier = id;
    dd.prochain = T + 2 + rng.int(...DIR.district);
    dd.forcer = null;
  }
  if (dd.forcer && !DISTRICT[dd.forcer]) dd.forcer = null;
  if (dd.g && dd.g.tour < T1) dd.g = null;

  // 2. L'ennemi de la saison et la grande opération finale.
  if (!dd.fantome || dd.fantome.saison !== state.season) dd.fantome = { saison: state.season, nom: rng.pick(FANTOMES), dossier: 0, prochain: DIR.premierOrage + rng.int(0, 2), vus: [] };
  const f = dd.fantome;
  if (!state.evenement && !f.fini && actives.length >= 2 && T1 <= SEASON_LENGTH) {
    state.evenement = { titre: `Opération Filet : coincer ${f.nom}`, tour: SEASON_LENGTH, fantome: true, parZone: parZoneFantome(f), gain: 8, perte: 4, pts: 6 };
  }
  if (state.evenement && state.evenement.fantome) state.evenement.parZone = parZoneFantome(f);
  if (T1 >= f.prochain && T1 <= SEASON_LENGTH - 1) {
    const libres = zones.filter((z) => present(z) && !(z.dir && z.dir.fe) && !f.vus.slice(-2).includes(z.uid)).sort((a, b) => String(a.uid).localeCompare(String(b.uid)));
    if (libres.length) {
      const z = rng.pick(libres);
      if (lancerFeuilleton(state, z, 'fantome', rng, T1)) { f.vus = [...f.vus, z.uid].slice(-8); f.prochain = T1 + rng.int(...DIR.fantome); }
    }
  }

  // 3. Fugitif à la frontière de deux zones : il faut des patrouilles des deux côtés, le même soir.
  dd.coop = (dd.coop || []).filter((x) => x.tour >= T1 && state.zones[x.a] && state.zones[x.b]);
  if (!dd.coop.length && T1 >= DIR.premierOrage && T1 <= SEASON_LENGTH - 1 && T1 >= (dd.coopProchain || 0) && rng.chance(DIR.coop.chance)) {
    const paires = frontieres(state, (z) => present(z));
    if (paires.length) {
      const p = rng.pick(paires);
      dd.coop.push({ id: 'fugitif', ...p, tour: T1, e: 'debut' });
      dd.coopProchain = T1 + rng.int(...DIR.coop.pause);
    }
  }

  // 4. Défi en duo : deux zones proches au classement reçoivent le même feuilleton.
  if (dd.duo && dd.duo.tour < T1) dd.duo = null;
  if (!dd.duo && T1 >= DIR.premierOrage && T1 <= SEASON_LENGTH - 1 && T1 >= (dd.duoProchain || 0) && rng.chance(DIR.duo.chance)) {
    const cl = zones.filter((z) => present(z) && (z.toursJoues || 0) >= 2 && !(z.dir && z.dir.fe))
      .sort((a, b) => moyenneIpz(b) - moyenneIpz(a) || String(a.uid).localeCompare(String(b.uid)));
    if (cl.length >= 2) {
      const i = rng.int(0, cl.length - 2);
      const [za, zb] = [cl[i], cl[i + 1]];
      const id = rng.pick(['rodeos', 'fete', 'cambrioleur']);
      if (lancerFeuilleton(state, za, id, rng, T1, { duo: zb.uid }) && lancerFeuilleton(state, zb, id, rng, T1, { duo: za.uid })) {
        dd.duo = { a: za.uid, b: zb.uid, id, tour: T1 };
        dd.duoProchain = T1 + rng.int(...DIR.duo.pause);
      } else { if (za.dir) za.dir.fe = null; if (zb.dir) zb.dir.fe = null; }
    }
  }
  return dd;
}

/** Signes du district pour le tour T+1 (annonce la veille, puis l'événement ; fugitif à la frontière). */
function pressionsDistrict(state, z, T1) {
  const out = [];
  const g = state.dir && state.dir.g;
  if (g && DISTRICT[g.id]) {
    const e = DISTRICT[g.id];
    if (g.tour === T1) out.push({ id: `district-${g.id}`, district: g.id, titre: e.titre, texte: e.texte, effet: { ...e.effet } });
    if (g.tour === T1 + 1) out.push({ id: 'district-annonce', district: g.id, titre: e.annonce, texte: e.texteAnnonce, effet: {} });
  }
  for (const x of (state.dir && state.dir.coop) || []) {
    if (x.tour !== T1 || (z.uid !== x.a && z.uid !== x.b)) continue;
    const moi = z.uid === x.a ? x.ca : x.cb, lui = z.uid === x.a ? x.cb : x.ca, autre = state.zones[z.uid === x.a ? x.b : x.a];
    out.push({ id: 'coop-fugitif', coop: true, quartier: moi, patrouilles: 2,
      titre: x.e === 'debut' ? `Fugitif entre ${nomQ(state, moi)} et ${nomQ(state, lui)}` : 'Le fugitif se terre encore à la frontière',
      texte: `Avec ${label(autre)} : 2 patrouilles à ${nomQ(state, moi)} chez toi et 2 à ${nomQ(state, lui)} chez eux, le même soir.${x.e === 'debut' ? '' : ' Dernière chance.'}`, effet: {} });
  }
  return out;
}

/** Fugitif à la frontière : résolu avant la simulation des zones (il faut les patrouilles des deux côtés). */
export function coopResoudre(state, uids, ord, push, T) {
  const dd = state.dir;
  if (!dd || !Array.isArray(dd.coop)) return [];
  const res = [];
  for (const x of dd.coop.filter((c) => c.tour === T)) {
    const za = state.zones[x.a], zb = state.zones[x.b];
    if (!za || !zb || !uids.includes(x.a) || !uids.includes(x.b)) { x.fini = true; continue; }
    const pat = (u, z) => lirePatrouilles(state, z, (ord[u] || {}).patrouilles, ((ord[u] || {}).alloc || {}).proximite || 0);
    const okA = (pat(x.a, za)[x.ca] || 0) >= 2, okB = (pat(x.b, zb)[x.cb] || 0) >= 2;
    const c = { T };
    if (okA && okB) {
      const fx = x.e === 'debut' ? { pts: 5, rep: 2, sat: 2, ps: 8 } : { pts: 3, rep: 1, sat: 1, ps: 6 };
      for (const [z, autre] of [[za, zb], [zb, za]]) z.rapport.push(`Fugitif à la frontière : coincé avec ${label(autre)} (${appliquer(z, fx, c)}).`);
      push(9, 'Coopération', `${label(za)} et ${label(zb)} coincent le fugitif`, 'Patrouilles des deux côtés de la frontière, le même soir : il n’avait plus d’issue.', x.a);
      x.fini = true; res.push({ ...x, ok: true });
    } else if (x.e === 'debut') {
      for (const [z, ok, autre] of [[za, okA, zb], [zb, okB, za]]) z.rapport.push(`Fugitif à la frontière : il a filé. ${ok ? `Tes patrouilles étaient là, pas celles de ${label(autre)}.` : `Il fallait 2 patrouilles chez toi${(z === za ? okB : okA) ? `, celles de ${label(autre)} étaient là` : ''}.`} Il se terre encore : dernière chance demain, ensemble.`);
      x.e = 'cavale'; x.tour = T + 1;
    } else {
      for (const [z, ok, autre] of [[za, okA, zb], [zb, okB, za]]) {
        const fx = ok ? { rep: 1 } : { sat: -2 };
        z.rapport.push(`Fugitif à la frontière : il a disparu pour de bon. ${ok ? `Tu étais au rendez-vous, pas ${label(autre)}` : 'Tu n’étais pas au rendez-vous'} (${appliquer(z, fx, c)}).`);
      }
      push(5, 'Coopération', `Le fugitif de la frontière s’évapore`, `${label(za)} et ${label(zb)} ne se sont pas coordonnées.`, x.a);
      x.fini = true; res.push({ ...x, ok: false });
    }
  }
  dd.coop = dd.coop.filter((c) => !c.fini);
  return res;
}

// ───── La nuit : préparer le tour suivant d'une zone ─────

function duree([a, b], rng, ajust = 0) { return Math.max(1, rng.int(a, b) + ajust); }

/**
 * Prépare le tour T+1 d'une zone (à la place des anciens tirages d'opération et de situation du jour).
 * @param ctx { T, nextWeekday, forme, PRESSION_WEEKEND }
 */
export function directeurNuit(state, z, rng, { T, nextWeekday, forme = 0, PRESSION_WEEKEND = null }) {
  const d = assurerDir(z);
  const T1 = T + 1;
  const site = siteDe(z);
  const mi = multI(state);
  if (z.operation && T1 >= z.operation.tourDebut + z.operation.duree) z.operation = null;

  // 1. Le ciel de demain.
  if (!actif(z)) {
    // Zone absente : on la laisse tranquille (et on range ce qui était en cours).
    d.ph = 'calme'; d.j = 0; d.n = 2; d.orage = null;
    if (d.fe && d.fe.tour <= T1) d.fe = null;
  } else if (d.retour === T) {
    // Retour d'absence : deux jours d'éclaircie pour reprendre la main.
    d.ph = 'eclaircie'; d.j = 0; d.n = 2; d.orage = null;
  } else {
    d.j += 1;
    if (d.j >= d.n) {
      let next = SUIVANTE[d.ph];
      if (next === 'orage' && T1 < DIR.premierOrage) next = 'montee';
      d.ph = next; d.j = 0;
      d.n = next === 'calme' ? duree(DIR.calme, rng, (forme > 0.4 ? -1 : 0) + (forme < -0.4 ? 1 : 0))
        : next === 'montee' ? duree(DIR.montee, rng)
          : next === 'orage' ? 1
            : duree(DIR.eclaircie, rng, forme < -0.3 ? 1 : 0);
    }
    d.orage = null;
  }

  // 2. L'orage : une opération (le défi), un coup dur (une faiblesse) ou un feuilleton décisif.
  if (d.ph === 'orage' && d.j === 0) {
    const pire = pireFragilite(z);
    const options = [
      { id: 'operation', w: z.operation ? 0 : 1 + 0.6 * Math.max(0, forme) },
      { id: 'coup', w: Math.max(0.3, pire - 0.6) * 1.5 * mi },
      { id: 'feuilleton', w: d.fe ? 0 : 0.7 },
    ].filter((x) => x.w > 0);
    const choix = options.length ? rng.weighted(options).id : 'coup';
    if (choix === 'operation') planifierOperation(z, d, rng, site, T1, 0.35, forme <= 0);
    else if (choix === 'feuilleton') lancerFeuilleton(state, z, 'evasion', rng, T1);
    else d.orage = 'coup';
    d.orageType = choix;
  } else if (actif(z) && !z.operation && T1 >= DIR.premierOrage && DIR.operation[d.ph] && rng.chance(DIR.operation[d.ph] * (1 + 0.5 * forme))) {
    // Une opération peut aussi tomber un jour ordinaire (elle se prépare et rapporte).
    planifierOperation(z, d, rng, site, T1, 0.25, false);
  }

  // 3. Feuilleton ou dilemme (ciel clair ou chargé, zone présente hier). Une zone qui ne change jamais rien
  //    à sa répartition est bousculée : plus de feuilletons, sur les services qu'elle laisse de côté.
  const x = {
    forme, T1, enquete: !!(state.enquete && z.enquete && !state.enquetePause),
    quartiers: Object.keys(assurerQuartiers(state, z)).length > 0,
    tensionMax: Math.max(0, ...Object.values(z.quartiers || {})),
  };
  const routine = d.routine >= DIR.routine;
  const allocHier = (z.dernierOrdre && z.dernierOrdre.alloc) || {};
  if (!d.fe && present(z) && d.retour !== T && T1 >= d.cdF && (d.ph === 'calme' || d.ph === 'montee') && rng.chance(Math.min(0.95, DIR.feuilleton * multF(state) * (routine ? 2 : 1)))) {
    const pool = Object.entries(FEUILLETONS)
      .filter(([id, f]) => !f.orage && !f.district && !recent(d, `fe-${id}`, 8) && !(f.dilemme && T1 < d.cdD))
      .map(([id, f]) => ({ id, w: f.poids(z, x) * (routine && f.besoin && (allocHier[f.besoin] || 0) < f.min ? 3 : 1) }))
      .filter((p) => p.w > 0);
    if (pool.length) lancerFeuilleton(state, z, rng.weighted(pool).id, rng, T1);
  }

  // 4. Situation du jour : district, feuilleton, week-end, puis pressions selon le ciel.
  const pressions = [...pressionsDistrict(state, z, T1)];
  if (d.fe && FEUILLETONS[d.fe.id]) {
    const def = FEUILLETONS[d.fe.id], et = def.etapes[d.fe.e];
    if (et) {
      const sg = et.signe(state, d.fe.d || {}, d.fe.tour - T1 + 1);
      const duo = d.fe.duo && d.fe.e === 'debut' ? state.zones[d.fe.duo] : null;
      pressions.push({ id: `fe-${d.fe.id}`, feuilleton: d.fe.id, ...sg, ...(duo ? { titre: `Défi en duo · ${sg.titre}`, texte: `${sg.texte} Réussissez tous les deux, avec ${label(duo)}, pour un bonus commun.`, duo: duo.uid } : {}), effet: {} });
    }
  }
  if (PRESSION_WEEKEND && (nextWeekday === 5 || nextWeekday === 6)) pressions.push(PRESSION_WEEKEND);
  if (actif(z)) {
    const nb = { calme: rng.chance(DIR.pressions.calme) ? 1 : 0, montee: 1 + (rng.chance(DIR.pressions.montee - 1) ? 1 : 0), orage: 2, eclaircie: rng.chance(DIR.pressions.eclaircie) ? 1 : 0 }[d.ph];
    const siteChance = { calme: 0.25, montee: 0.4, orage: 0.5, eclaircie: 0.1 }[d.ph];
    if (site && site.evenements && rng.chance(siteChance)) {
      const ev = rng.pick(site.evenements);
      pressions.push({ id: `site-${site.id}`, site: site.id, titre: `${site.nom} · ${ev.titre}`, texte: ev.texte, effet: ev.effet });
    }
    const dejaSite = pressions.some((p) => p.site);
    for (let i = 0; i < nb - (dejaSite ? 1 : 0); i++) {
      // Ciel clair : des pressions qu'on gère bien ; ciel chargé et orage : celles qui visent les points faibles.
      const pool = PRESSIONS.filter((p) => !pressions.some((q) => q.id === p.id) && !(p.id === 'nuit' && pressions.some((q) => q.effet && q.effet.incidents)) && !recent(d, `pr-${p.id}`, 3));
      if (!pool.length) break;
      const vise = d.ph !== 'calme';
      const p = rng.weighted(pool.map((q) => ({ ...q, w: Math.max(0.3, vise ? 1 + pointFaible(z, q) : 1.5 - pointFaible(z, q) * 0.5) })));
      pressions.push(PRESSIONS.find((q) => q.id === p.id));
      memoriser(d, `pr-${p.id}`);
    }
  } else if (rng.chance(0.4)) pressions.push(rng.pick(PRESSIONS.filter((p) => !['bourgmestre', 'parquet'].includes(p.id))));
  z.pressions = JSON.parse(JSON.stringify(pressions.slice(0, 4)));
}

/** À quel point une pression tombe sur un point faible de la zone (0 à 2). */
function pointFaible(z, p) {
  const n = z.dir.neg || {};
  switch (p.id) {
    case 'vitesse': return Math.min(2, (n.roulage || 0) / 2);
    case 'plaintes': return Math.min(2, (n.admin || 0) / 2 + (z.paperasse > 10 ? 1 : 0));
    case 'deal': return Math.min(2, (n.proximite || 0) / 2 + (z.criminalite > 55 ? 1 : 0));
    case 'parquet': return Math.min(2, (z.dossiers || []).filter((x) => x.age > 4).length / 2);
    case 'nuit': case 'bourgmestre': return Math.min(2, (n.intervention || 0) / 2);
    default: return 0.5;
  }
}

/** Opération d'envergure ; `appel` : appel au district, renfort mieux payé (zone en difficulté, jour d'orage). */
function planifierOperation(z, d, rng, site, T1, partSite, appel) {
  if (site && site.operation && rng.chance(partSite) && !recent(d, 'op-site', 10)) {
    z.operation = { id: `site-${site.id}`, ...JSON.parse(JSON.stringify(site.operation)), site: site.id, tourDebut: T1, couvertures: [] };
    memoriser(d, 'op-site');
  } else {
    const pool = OPERATIONS.filter((o) => !recent(d, `op-${o.id}`, 10));
    const op = rng.pick(pool.length ? pool : OPERATIONS);
    z.operation = { ...JSON.parse(JSON.stringify(op)), tourDebut: T1, couvertures: [] };
    memoriser(d, `op-${op.id}`);
  }
  if (appel) z.operation.appel = true;
}

// ───── Le soir : résoudre ce qui était annoncé ─────

/**
 * Pendant la simulation d'une zone : retour d'absence, routine, feuilleton ou dilemme du jour, événement du district.
 * @param c { state, T, o, alloc, patrouilles, rates, achete:Set, indice:()=>bool, rng, push, label, district:[] }
 */
export function directeurSoir(state, z, c) {
  const d = assurerDir(z);
  const lignes = [];
  // Services laissés vides : la mémoire du Directeur.
  for (const [s, seuil] of Object.entries(SERVICES_SEUIL)) d.neg[s] = (c.alloc[s] || 0) <= seuil ? (d.neg[s] || 0) + 1 : 0;

  // Retour d'absence.
  if (z._retour) {
    const n = z._retour;
    const hist = (z.ipzHist || []).filter((h) => h.joue);
    const avant = hist.length ? hist[hist.length - 1].v : null;
    const fx = { moral: 3 };
    lignes.push(`Bon retour aux commandes après ${n} jours ! Ton adjoint a tenu la boutique${avant !== null ? ` (IPZ ${String(round1(avant)).replace('.', ',')} à ton départ, ${String(round1(z.ipz)).replace('.', ',')} hier)` : ''}. L’équipe est contente de te revoir (${appliquer(z, fx, c)}). Deux jours d’éclaircie pour reprendre la main.`);
    c.push(3, 'Retour', `${c.label} reprend les commandes`, 'Les collègues peuvent à nouveau compter sur elle : renforts, enquête, zone de non-droit.', z.uid);
    d.retour = c.T;
    delete z._retour;
  }

  // Routine : la même répartition jour après jour finit par se voir.
  if (z._joue && c.o && c.o.alloc) {
    const cle = SERVICES.map((s) => c.o.alloc[s] || 0).join('-');
    d.routine = cle === d.dernAlloc ? d.routine + 1 : 0;
    d.dernAlloc = cle;
    if (d.routine === DIR.routine) lignes.push(`Ta répartition n’a pas bougé depuis ${DIR.routine + 1} jours : la rue l’a remarqué, attends-toi à être bousculé là où tu n’es jamais.`);
  }

  // Feuilleton ou dilemme du jour.
  let fe = d.fe;
  if (fe && fe.tour === c.T && sansEnquete(state, fe.id)) {
    lignes.push(`${FEUILLETONS[fe.id].titre} : plus d’affaire en cours, l’indic n’a rien à vendre et repart. Rien n’est payé.`);
    d.fe = null; fe = null;
  }
  if (fe && fe.tour === c.T && FEUILLETONS[fe.id]) {
    const def = FEUILLETONS[fe.id], et = def.etapes[fe.e];
    let ch = null;
    const choix = et.choix ? choixDe(et, z, fe.d) : null;
    if (choix) {
      const v = c.o && Number.isInteger(c.o.dilemme) && c.o.dilemme >= 0 && c.o.dilemme < choix.length ? c.o.dilemme : null;
      ch = v === null ? et.defaut : v;
      if (v === null) lignes.push(`${def.titre} : sans réponse de ta part, ton adjoint a choisi « ${choix[ch].l} ».`);
    }
    const r = et.resoudre({ ...c, z }, fe.d || {}, ch);
    const eff = appliquer(z, r.fx || {}, { T: c.T, cell: fe.d && fe.d.cell, indice: c.indice, compta: def.titre });
    lignes.push(`${def.titre}${ch !== null ? ` (« ${choix[ch].l} »)` : ''} : ${r.texte}${eff ? ` (${eff})` : ''}.`);
    if (r.une) c.push(r.une[0], r.une[1], r.une[2], r.une[3] || `${def.titre} : ${r.texte}.`, z.uid);
    if (r.mem) Object.assign(d.mem, r.mem);
    d.bilan = { tour: c.T, id: fe.id, titre: def.titre, ok: !!r.ok, duo: fe.e === 'debut' ? fe.duo || null : null };
    if (r.suite && def.etapes[r.suite]) { fe.e = r.suite; fe.tour = c.T + (def.etapes[r.suite].delai || 1); delete fe.duo; }
    else { d.fe = null; d.cdF = c.T + 1 + DIR.pauseFeuilleton; }
  } else if (fe && fe.tour < c.T) d.fe = null; // filet de sécurité

  // Événement du district.
  const g = state.dir && state.dir.g;
  if (g && g.tour === c.T && DISTRICT[g.id] && actif(z)) {
    const e = DISTRICT[g.id];
    const r = e.resoudre({ ...c, z });
    const eff = appliquer(z, r.fx || {}, { T: c.T, indice: c.indice, compta: e.titre });
    lignes.push(`${e.titre} : ${r.texte}${eff ? ` (${eff})` : ''}.`);
    c.district.push({ uid: z.uid, ok: !!r.ok });
  }
  return lignes;
}

/** Brève de la Gazette pour l'événement de district (après la simulation des zones). */
export function districtBilan(state, T, res, push, lbl) {
  const g = state.dir && state.dir.g;
  if (!g || g.tour !== T || !DISTRICT[g.id]) return null;
  const e = DISTRICT[g.id];
  const ok = res.filter((x) => x.ok);
  push(9, e.titre, ok.length === res.length ? `${e.titre} : tout le district a tenu bon` : `${e.titre} : ${ok.length} zone${ok.length > 1 ? 's' : ''} sur ${res.length} ${ok.length > 1 ? 'ont' : 'a'} tenu bon`,
    ok.length ? `Citées en exemple : ${ok.map((x) => lbl(state.zones[x.uid])).join(', ')}.` : 'Aucune zone n’était prête.');
  state.dir.g = null;
  return { id: g.id, titre: e.titre, ok: ok.map((x) => x.uid), total: res.length };
}

/** Défi en duo : bonus commun si les deux zones ont réussi (après la simulation des zones). */
export function duoBilan(state, T, push, lbl) {
  const du = state.dir && state.dir.duo;
  if (!du || du.tour !== T) return null;
  state.dir.duo = null;
  const za = state.zones[du.a], zb = state.zones[du.b];
  if (!za || !zb) return null;
  const ok = (z, autre) => !!(z.dir && z.dir.bilan && z.dir.bilan.tour === T && z.dir.bilan.ok && z.dir.bilan.duo === autre);
  if (ok(za, du.b) && ok(zb, du.a)) {
    for (const [z, autre] of [[za, zb], [zb, za]]) { z.reputation = clamp(z.reputation + 2, 0, 100); z.ps += 6; z.rapport.push(`Défi en duo relevé avec ${lbl(autre)} : +2 de réputation et +6 PS chacun.`); }
    push(6, 'Défi en duo', `${lbl(za)} et ${lbl(zb)} relèvent le défi du Directeur`, 'Même feuilleton, même soir : réussi des deux côtés.', du.a);
    return { ...du, ok: true };
  }
  for (const [z, autre] of [[za, zb], [zb, za]]) z.rapport.push(`Défi en duo avec ${lbl(autre)} : pas réussi des deux côtés, pas de bonus commun.`);
  return { ...du, ok: false };
}

// ───── L'enquête de la semaine : un coup de pouce quand le district piétine ─────
/**
 * En fin de semaine (jour 5), si la plupart des zones ne peuvent encore écarter qu'un suspect au plus, un témoin tardif apporte à celles qui piétinent une pièce qui fait avancer.
 * Les zones qui avancent bien ne reçoivent rien : l'affaire reste difficile pour elles.
 */
export function enqueteDirecteur(state, push, rng) {
  const e = state.enquete;
  if (!e || !DIR.temoin.includes(e.jour)) return null;
  const dd = state.dir || (state.dir = {});
  const marque = `${state.season}:${e.n}:${e.jour}`;
  if ((dd.enqAide || []).includes(marque)) return null;
  dd.enqAide = [...(dd.enqAide || []), marque].slice(-6);
  const aff = affaire(state, e.n);
  const zs = Object.values(state.zones).filter((z) => actif(z) && z.enquete && z.enquete.n === e.n && !z.enquete.accuse);
  if (!zs.length) return null;
  const nb = zs.map((z) => ({ z, n: candidats(aff, faitsConnus(z.enquete)).suspects.length })).sort((a, b) => a.n - b.n);
  const med = nb[Math.floor(nb.length / 2)].n;
  if (med <= 3) return null; // le district avance : pas d'aide
  const aides = [];
  for (const x of nb.filter((y) => y.n >= Math.max(4, med))) {
    const f = pieceCoupDePouce(state, x.z, aff, rng);
    if (!f) continue;
    x.z.enquete.pieces.push({ f, j: e.jour, src: 'tardif' });
    x.z.rapport.push('Enquête : un témoin tardif s’est présenté à ton accueil. Sa déposition est au dossier.');
    aides.push(x.z.uid);
  }
  if (aides.length) push(6, 'Enquête', 'Un témoin tardif se manifeste', `L’enquête piétinait : ${aides.length} zone${aides.length > 1 ? 's' : ''} reçoi${aides.length > 1 ? 'vent' : 't'} sa déposition.`);
  return { jour: e.jour, aides };
}

// ───── Énigmes : un niveau qui suit la forme du joueur ─────
// Le niveau des énigmes du jour (lundi facile, dimanche corsé) est décalé de −2 à +1 selon les réussites
// des derniers jours et le classement aux énigmes. Il bouge d'un cran par nuit au plus : on s'adapte
// un peu chaque jour, sans à-coups. Le dossier noir garde son niveau.
export const ENIG = { jours: 7, min: -2, max: 1 };

/** Rang aux énigmes de chaque zone active, de 0 (meilleure) à 1 (dernière). */
export function rangsEnigmes(state) {
  const zs = Object.values(state.zones || {}).filter((z) => (z.toursSansOrdres || 0) < 3);
  const out = {};
  if (zs.length < 3) return out;
  const tri = zs.slice().sort((a, b) => ((b.stats && b.stats.quetesOk) || 0) - ((a.stats && a.stats.quetesOk) || 0) || String(a.uid).localeCompare(String(b.uid)));
  tri.forEach((z, i) => { out[z.uid] = i / (tri.length - 1); });
  return out;
}

// Historiques rangés en objets { ok, t } : Firestore refuse un tableau dans un tableau (l'ancien format [ok, t]
// bloquait l'enregistrement du tour dès qu'une zone avait joué). Les deux formats sont lus.
const okDe = (x) => (Array.isArray(x) ? x[0] : (x && x.ok) || 0);
const totDe = (x) => (Array.isArray(x) ? x[1] : (x && x.t) || 0);
const enObjets = (h) => (Array.isArray(h) ? h.map((x) => ({ ok: okDe(x), t: totDe(x) })) : []);

/** Cible de décalage d'après l'historique [{ ok: bonnes, t: tentées }, …] et le rang (0 à 1, ou undefined). */
export function cibleEnigmes(hist, rang) {
  const ok = hist.reduce((s, x) => s + okDe(x), 0), tot = hist.reduce((s, x) => s + totDe(x), 0);
  if (tot < 3) return rang !== undefined && rang > 0.75 ? -1 : 0;
  const taux = ok / tot - (rang !== undefined ? 0.15 * (rang - 0.5) : 0);
  if (taux < 0.4) return -2;
  if (taux < 0.6) return -1;
  if (taux > 0.85 && tot >= 6) return 1;
  return 0;
}

/** Note les énigmes du jour et ajuste le niveau de demain (un cran au plus). */
export function adapterEnigmes(z, ok, tentees, rang) {
  const d = assurerDir(z);
  const e = d.enig && Array.isArray(d.enig.h) ? d.enig : { h: [], niv: 0 };
  e.h = enObjets(e.h);
  if (tentees > 0) e.h = [...e.h, { ok, t: tentees }].slice(-ENIG.jours);
  const cible = cibleEnigmes(e.h, rang);
  const niv = Number.isFinite(e.niv) ? e.niv : 0;
  e.niv = clamp(niv + Math.sign(cible - niv), ENIG.min, ENIG.max);
  d.enig = e;
  return e.niv;
}

/** Décalage du niveau des énigmes du jour pour cette zone. */
export const niveauEnigmes = (z) => (z && z.dir && z.dir.enig && Number.isFinite(z.dir.enig.niv) ? z.dir.enig.niv : 0);

// ───── Mini-jeux des incidents : même principe, sur trois niveaux (facile, normal, difficile) ─────
export const INCA = { jours: 8 };

export function cibleIncidents(hist) {
  const ok = hist.reduce((s, x) => s + okDe(x), 0), tot = hist.reduce((s, x) => s + totDe(x), 0);
  if (tot < 2) return 0;
  if (ok / tot < 0.5) return -1;
  if (ok / tot > 0.85 && tot >= 4) return 1;
  return 0;
}

/** Note les mini-jeux joués ce soir et ajuste le cran de demain (−1 plus facile, +1 plus difficile). */
export function adapterIncidents(z, ok, joues) {
  const d = assurerDir(z);
  const e = d.inc && Array.isArray(d.inc.h) ? d.inc : { h: [], niv: 0 };
  e.h = enObjets(e.h);
  if (joues > 0) e.h = [...e.h, { ok, t: joues }].slice(-INCA.jours);
  const cible = cibleIncidents(e.h);
  const niv = Number.isFinite(e.niv) ? e.niv : 0;
  e.niv = clamp(niv + Math.sign(cible - niv), -1, 1);
  d.inc = e;
  return e.niv;
}
export const niveauIncidents = (z) => (z && z.dir && z.dir.inc && Number.isFinite(z.dir.inc.niv) ? z.dir.inc.niv : 0);

// ───── Pour l'écran du maître du jeu ─────
export function apercuDirecteur(state) {
  const fz = formes(state);
  const zones = Object.values(state.zones || {}).map((z) => {
    const d = z.dir || {};
    const fe = feuilletonEnCours(state, z);
    return {
      uid: z.uid, label: label(z), ciel: cielDe(z), jour: (d.j || 0) + 1, sur: d.n || 0, forme: fz[z.uid] || 0,
      feuilleton: fe ? `${fe.titre}${fe.dilemme ? ' (dilemme)' : ''}${fe.duo ? ' · duo' : ''}` : null,
      enigmes: niveauEnigmes(z), incidents: niveauIncidents(z), routine: d.routine || 0,
      faiblesses: Object.entries(d.neg || {}).filter(([, n]) => n >= 2).map(([s, n]) => `${SERVICE_LABELS[s]} (${n} j)`),
      absent: !actif(z), operation: z.operation ? `${z.operation.titre}${z.operation.appel ? ' · appel du district' : ''}` : null,
    };
  });
  const dd = state.dir || {};
  return {
    zones, reglages: reglages(state),
    district: dd.g ? { ...dd.g, titre: DISTRICT[dd.g.id] && DISTRICT[dd.g.id].titre } : null, prochain: dd.prochain || null,
    fantome: dd.fantome || null, coop: (dd.coop || []).map((x) => ({ ...x, la: label(state.zones[x.a]), lb: label(state.zones[x.b]) })), duo: dd.duo || null,
  };
}

// ───── Le parquet surveille : un dossier fait surtout des pièces des autres coûte des subsides ─────
// Le parquet finance les zones pour leur propre travail d'enquête. Une zone dont le dossier de l'affaire en cours
// repose surtout sur des pièces reçues par partage est d'abord avertie, puis voit son subside judiciaire réduit
// chaque soir (et le mérite d'une identification partagé). Partager reste utile et récompensé : seule la
// dépendance excessive est visée (celui qui reçoit, pas celui qui donne).
export const PARQUET = {
  avertissement: { recues: 4, part: 0.6 },   // au moins 4 pièces reçues et 60 % du travail d'enquête venu des autres
  malus: { recues: 6, part: 0.7 },           // au moins 6 pièces reçues et 70 %
  budget: -2,                                 // k€ par soir au stade du malus
  reputation: -1,                             // par soir au stade du malus
  merite: 0.5,                                // part des points d'enquête gardée en cas d'identification au stade du malus
};

/** Travail d'enquête de la zone sur l'affaire en cours : pièces obtenues elle-même et pièces reçues. */
export function travailEnquete(z) {
  const p = (z && z.enquete && z.enquete.pieces) || [];
  const recues = p.filter((x) => x.src === 'partage').length;
  const propres = p.filter((x) => x.src !== 'partage' && x.src !== 'ouverture' && x.src !== 'rebond' && x.src !== 'rattrapage' && x.src !== 'audition' && x.src !== 'tardif').length;
  const part = recues + propres ? recues / (recues + propres) : 0;
  const stade = recues >= PARQUET.malus.recues && part >= PARQUET.malus.part ? 2 : recues >= PARQUET.avertissement.recues && part >= PARQUET.avertissement.part ? 1 : 0;
  return { recues, propres, part, stade };
}

/** Identification le soir même par une zone au stade du malus : le parquet ne lui laisse qu'une part du mérite. */
export function parquetDecouverte(state, pre) {
  const dec = pre && pre.res && pre.res.decouverte;
  if (!dec) return;
  for (const u of dec.uids || []) {
    const z = state.zones[u];
    if (!z || !z.dir || !z.dir.parquet || z.dir.parquet.stade < 2) continue;
    const retire = Math.round(dec.pts * (1 - PARQUET.merite));
    z.stats.limier = Math.max(0, (z.stats.limier || 0) - retire);
    z.rapport.push(`Parquet : ton dossier reposait surtout sur les pièces des autres zones ; le mérite de l’identification est partagé (−${retire} pts d’enquête).`);
  }
}

/** Chaque soir, après le travail des zones : avertissement ou malus selon la dépendance du dossier. */
export function parquetSoir(state, uids, push) {
  if (!state.enquete) return;
  for (const u of uids) {
    const z = state.zones[u];
    if (!z || !z.enquete || z.enquete.n !== state.enquete.n || z.enquete.exclu) continue;
    const d = assurerDir(z);
    const t = travailEnquete(z);
    const avant = (d.parquet && d.parquet.n === state.enquete.n && d.parquet.stade) || 0;
    d.parquet = { n: state.enquete.n, stade: t.stade, part: round1(t.part * 100) / 100, recues: t.recues, propres: t.propres };
    const pc = Math.round(t.part * 100);
    if (t.stade === 1 && avant < 1) z.rapport.push(`Parquet : ${pc} % de ton dossier vient des pièces des autres zones (${t.recues} reçues, ${t.propres} obtenues par toi). Le parquet finance les zones pour leur propre travail : au-delà de ${Math.round(PARQUET.malus.part * 100)} %, ton subside judiciaire sera réduit. Fais tes propres démarches.`);
    if (t.stade === 2) {
      z.budget += PARQUET.budget; (z._compta ||= []).push({ k: 'parquet', l: 'Subside judiciaire réduit (dossier trop dépendant)', v: PARQUET.budget });
      z.reputation += PARQUET.reputation;
      z.rapport.push(`Parquet : ${pc} % de ton dossier vient des autres zones. Subside judiciaire réduit (${PARQUET.budget} k€, ${PARQUET.reputation} de réputation) tant que tu ne fais pas davantage tes propres démarches.`);
      if (avant < 2) push(4, 'Parquet', `Le parquet rappelle ${label(z)} à l’ordre`, 'Un dossier fait surtout des pièces des autres : son subside judiciaire est réduit.', u);
    }
    if (t.stade < avant) z.rapport.push('Parquet : tes démarches ont rééquilibré ton dossier, le parquet lève sa réserve.');
  }
}
