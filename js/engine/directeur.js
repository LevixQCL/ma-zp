// Le Directeur : le maître du jeu invisible de Ma ZP.
//
// Il remplace les tirages fixes (30 % d'aléa, 13 % de coup dur, 16 % d'opération chaque jour) par un
// rythme et une lecture de chaque zone :
//   • un rythme dramatique par zone : ciel clair → ciel chargé → orage → éclaircie, puis on recommence ;
//   • des conséquences plutôt que des dés : les coups durs visent les vraies faiblesses (et le rapport dit pourquoi),
//     une zone bien tenue est surtout « testée » par des opérations qui rapportent ;
//   • des feuilletons sur plusieurs jours, annoncés la veille, qu'on gagne en se préparant ;
//   • des dilemmes (deux choix, des conséquences) ;
//   • des événements de district vécus par toutes les zones le même jour ;
//   • de l'équité : une zone en difficulté a plus d'éclaircies et d'occasions, une zone absente est épargnée.
//
// Tout reste déterministe (hasard à graine) : chaque appareil calcule le même tour.

import { clamp, round1, moyenneIpz } from './zone.js';
import { assurerQuartiers, carteQuartiers } from './quartiers.js';
import { ALEAS, COUPS_DURS, OPERATIONS, PRESSIONS } from './contenu.js';
import { siteDe } from './sites.js';
import { SEASON_LENGTH } from './constants.js';

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
  memoire: 10,                // derniers événements retenus (pas de redite)
};

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

// ───── État du Directeur dans une zone ─────
export function assurerDir(z) {
  const d = z.dir && typeof z.dir === 'object' ? z.dir : {};
  if (!PHASES.includes(d.ph)) { d.ph = 'calme'; d.j = 0; d.n = 3; }
  d.j = Number.isFinite(d.j) ? d.j : 0;
  d.n = Number.isFinite(d.n) ? d.n : 3;
  if (!Array.isArray(d.h)) d.h = [];
  if (!d.neg || typeof d.neg !== 'object') d.neg = {};
  if (d.fe === undefined) d.fe = null;
  d.cdF = d.cdF || 0; d.cdD = d.cdD || 0;
  z.dir = d;
  return d;
}

/** Ciel du jour d'une zone (pour l'affichage). */
export function cielDe(z) {
  const ph = z && z.dir && PHASES.includes(z.dir.ph) ? z.dir.ph : 'calme';
  return { id: ph, ...CIELS[ph] };
}

const memoriser = (d, id) => { d.h = [...d.h.filter((x) => x !== id), id].slice(-DIR.memoire); };
const recent = (d, id, n = 6) => d.h.slice(-n).includes(id);
const actif = (z) => (z.toursSansOrdres || 0) < 2;

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
  tri.forEach((z, i) => { out[z.uid] = round1(1 - (2 * i) / (tri.length - 1)) ; });
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
  const out = { alea: null, coupDur: null, pourquoi: null, heros: null };
  // Zone absente : seulement de petites bonnes nouvelles, de temps en temps.
  if (!actif(z)) {
    if (rng.chance(0.15)) out.alea = rng.pick(ALEAS_POSITIFS);
    return out;
  }
  // Aléa léger.
  if (rng.chance(DIR.alea[ph])) {
    const positif = rng.chance(DIR.aleaPositif[ph]);
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
  if ((ph === 'orage' && d.orage === 'coup') || (ph === 'montee' && pire >= DIR.fragile && rng.chance(DIR.coupMontee))) {
    const pool = fr.filter((x) => !recent(d, x.id, 4));
    const c = rng.weighted(pool.length ? pool : fr);
    out.coupDur = { ...COUPS_DURS.find((x) => x.id === c.id) };
    out.pourquoi = c.pourquoi;
    memoriser(d, c.id);
  }
  return out;
}

// ───── Feuilletons et dilemmes ─────
// Chaque étape : un signe affiché la veille et le jour même (dans la situation du jour), éventuellement
// un choix, puis un test résolu à 20:00. `delai` : nombre de tours avant le test (1 = le lendemain).

const nomQ = (state, cell) => carteQuartiers(state).nomDe(Number(cell));

function quartierTendu(state, z, rng, eviter = null) {
  const q = assurerQuartiers(state, z);
  const cells = Object.keys(q).filter((k) => k !== String(eviter));
  if (!cells.length) return null;
  const tri = cells.sort((a, b) => q[b] - q[a]);
  return tri[rng.int(0, Math.min(1, tri.length - 1))];
}

export const FEUILLETONS = {
  cambrioleur: {
    titre: 'Le cambrioleur des toits',
    poids: (z, x) => (x.quartiers ? 1 + ((z.dir.neg.proximite || 0) >= 2 ? 2 : 0) + (x.tensionMax >= 60 ? 1 : 0) : 0),
    init: (state, z, rng) => { const cell = quartierTendu(state, z, rng, z.pointChaud && z.pointChaud.cell); return cell ? { cell } : null; },
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
          ? { ok: true, fx: { pts: 6, sat: 4, rep: 1, quartier: -8 }, texte: 'enfin coincé, les riverains applaudissent', une: [7, 'Faits divers', `Fin de cavale pour le cambrioleur des toits`] }
          : { ok: false, fx: { sat: -4, crim: 3, rep: -1 }, texte: 'il court toujours, le quartier perd confiance', une: [5, 'Faits divers', 'Le cambrioleur des toits court toujours'] }),
      },
    },
  },
  rodeos: {
    titre: 'Rodéos urbains',
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
    titre: 'Audit de l’Inspection',
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
    titre: 'Évasion lors d’un transfert',
    orage: true,
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
    titre: 'Fête de quartier',
    poids: (z, x) => (x.quartiers && (z.dir.neg.proximite || 0) === 0 ? 1.2 : 0),
    init: (state, z, rng) => { const q = assurerQuartiers(state, z); const cells = Object.keys(q); return cells.length ? { cell: rng.pick(cells) } : null; },
    etapes: {
      debut: {
        signe: (s, d) => ({ titre: `Fête de quartier à ${nomQ(s, d.cell)}`, texte: 'Les habitants invitent la police : 4 agents en Proximité ce soir.', service: 'proximite', min: 4 }),
        resoudre: (c, d) => (c.alloc.proximite >= 4
          ? { ok: true, fx: { sat: 4, moral: 1, quartier: -6 }, texte: 'barbecue, photos avec les enfants, quartier apaisé' }
          : { ok: false, fx: { sat: -1 }, texte: 'personne n’est venu, les habitants sont déçus' }),
      },
    },
  },
  // ── Dilemmes ──
  greve: {
    titre: 'Grogne au vestiaire', dilemme: true,
    poids: (z) => (z.moral < 52 ? 2.5 : 0) + ((z.renforceSuite || 0) >= 2 ? 2 : 0),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Grogne au vestiaire', texte: 'Le délégué syndical attend ta réponse avant 20:00.' }),
        question: 'Heures sup’, vestiaires vétustes : le délégué syndical menace d’un arrêt de travail.',
        choix: [
          { l: 'Lâcher une prime', s: '−2,5 k€, +5 de moral' },
          { l: 'Tenir bon', s: 'si le moral est à 50 ou plus ce soir, la grogne retombe ; sinon, arrêt de travail' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => (ch === 0
          ? { ok: true, fx: { budget: -2.5, moral: 5 }, texte: 'prime versée, la tension retombe' }
          : c.z.moral >= 50
            ? { ok: true, fx: { moral: 2, rep: 1 }, texte: 'la grogne retombe d’elle-même' }
            : { ok: false, fx: { bloques: 2, moral: -2 }, texte: 'arrêt de travail, 2 agents absents 2 tours', une: [6, 'Social', `Arrêt de travail à ${c.label}`] }),
      },
    },
  },
  indic: {
    titre: 'Un indic veut parler', dilemme: true,
    poids: (z, x) => (x.enquete ? 1.2 + (x.forme < 0 ? 1 : 0) : 0),
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
          if (ch === 0) return { ok: true, fx: { budget: -2, indice: 1 }, texte: 'il a parlé' };
          return c.alloc.recherche >= 4 ? { ok: true, fx: { indice: 1 }, texte: 'tes enquêteurs l’ont fait parler sans débourser un euro' } : { ok: false, fx: {}, texte: 'personne pour l’écouter, il s’est évaporé' };
        },
      },
    },
  },
  journaliste: {
    titre: 'Une journaliste à la porte', dilemme: true,
    poids: (z) => 0.8 + (z.satisfaction > 60 || z.satisfaction < 42 ? 1 : 0),
    etapes: {
      debut: {
        signe: () => ({ titre: 'Une journaliste demande une interview', texte: 'Réponds avant 20:00.' }),
        question: (z) => `La Voix du Delta prépare un portrait de la zone. Ta satisfaction ce matin : ${Math.round(z.satisfaction)}.`,
        choix: [
          { l: 'Accorder l’interview', s: 'satisfaction à 55 ou plus ce soir : bonne presse ; sinon, ça se retourne contre toi' },
          { l: 'Pas de commentaire', s: '−1 de satisfaction' },
        ],
        defaut: 1,
        resoudre: (c, d, ch) => (ch === 1
          ? { ok: true, fx: { sat: -1 }, texte: '« la police ne souhaite pas s’exprimer »' }
          : c.z.satisfaction >= 55
            ? { ok: true, fx: { sat: 4, rep: 2 }, texte: 'portrait élogieux', une: [5, 'Presse', `Portrait flatteur de ${c.label} dans La Voix du Delta`] }
            : { ok: false, fx: { sat: -4, rep: -1 }, texte: 'article au vitriol', une: [5, 'Presse', `${c.label} étrillée par La Voix du Delta`] }),
      },
    },
  },
  mecene: {
    titre: 'Un sponsor pour le combi', dilemme: true,
    poids: (z, x) => (z.budget < 8 || x.forme < -0.3 ? 2 : 0.5),
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
          ? { ok: true, fx: { budget: 4, rep: -2 }, texte: 'le combi « Delta Auto » fait sourire le district', une: [2, 'Insolite', `Un combi publicitaire chez ${c.label}`, 'Le logo d’un garage s’affiche désormais sur la portière.'] }
          : { ok: true, fx: { rep: 1 }, texte: 'la commune salue ton intégrité' }),
      },
    },
  },
};

/** Dilemme posé aujourd'hui à cette zone (pour l'affichage), ou null. */
export function dilemmeDuJour(state, z) {
  const fe = z && z.dir && z.dir.fe;
  if (!fe || fe.tour !== state.turn) return null;
  const def = FEUILLETONS[fe.id];
  const et = def && def.etapes[fe.e];
  if (!et || !et.choix) return null;
  return { id: fe.id, titre: def.titre, question: typeof et.question === 'function' ? et.question(z) : et.question, choix: et.choix, defaut: et.defaut };
}

/** Feuilleton en cours (pour l'affichage) : { titre, signe, test (tour du test) } ou null. */
export function feuilletonEnCours(state, z) {
  const fe = z && z.dir && z.dir.fe;
  if (!fe || !FEUILLETONS[fe.id]) return null;
  const def = FEUILLETONS[fe.id], et = def.etapes[fe.e];
  if (!et) return null;
  return { id: fe.id, titre: def.titre, dilemme: !!et.choix, tour: fe.tour, signe: et.signe(state, fe.d || {}, Math.max(1, fe.tour - state.turn + 1)) };
}

function lancerFeuilleton(state, z, id, rng, T1) {
  const def = FEUILLETONS[id];
  const data = def.init ? def.init(state, z, rng) : {};
  if (!data) return false;
  const d = z.dir;
  d.fe = { id, e: 'debut', tour: T1 + (def.etapes.debut.delai || 1) - 1, d: data };
  memoriser(d, `fe-${id}`);
  if (def.dilemme) d.cdD = T1 + DIR.pauseDilemme;
  return true;
}

// ───── Effets ─────
const plus = (v) => `${v > 0 ? '+' : '−'}${String(Math.abs(round1(v))).replace('.', ',')}`;
function appliquer(z, fx, c) {
  const t = [];
  if (fx.sat) { z.satisfaction += fx.sat; t.push(`${plus(fx.sat)} de satisfaction`); }
  if (fx.moral) { z.moral += fx.moral; t.push(`${plus(fx.moral)} de moral`); }
  if (fx.rep) { z.reputation += fx.rep; t.push(`${plus(fx.rep)} de réputation`); }
  if (fx.pts) { z._points = (z._points || 0) + fx.pts; t.push(`${plus(fx.pts)} pts`); }
  if (fx.budget) { z.budget += fx.budget; (z._compta ||= []).push({ k: 'directeur', l: c.compta || 'Feuilleton', v: fx.budget }); t.push(`${plus(fx.budget)} k€`); }
  // Criminalité = moyenne des quartiers : on garde les deux d'accord.
  const resync = () => { const v = Object.values(z.quartiers || {}); if (v.length) z.criminalite = round1(v.reduce((a, b) => a + b, 0) / v.length); };
  if (fx.crim) {
    if (z.quartiers && Object.keys(z.quartiers).length) { for (const k of Object.keys(z.quartiers)) z.quartiers[k] = clamp(z.quartiers[k] + fx.crim, 10, 95); resync(); }
    else z.criminalite = clamp(z.criminalite + fx.crim, 10, 95);
    t.push(`criminalité ${plus(fx.crim)}`);
  }
  if (fx.pap) { z.paperasse = Math.max(0, z.paperasse + fx.pap); t.push(`${plus(fx.pap)} dossiers`); }
  if (fx.quartier && c.cell != null && z.quartiers && c.cell in z.quartiers) { z.quartiers[c.cell] = clamp(z.quartiers[c.cell] + fx.quartier, 10, 95); resync(); t.push(`tension du quartier ${plus(fx.quartier)}`); }
  if (fx.bloques) { z.blesses.push({ n: fx.bloques, retour: c.T + 3, motif: 'grève' }); }
  if (fx.vhs) { z.vehiculesHS.push({ retour: c.T + 2 }); }
  if (fx.indice) t.push(c.indice() ? '+1 indice d’enquête' : 'rien de neuf pour l’enquête');
  return t.join(', ');
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

/** Planifie les événements de district (avant la planification des zones, la nuit du tour T). */
export function districtNuit(state, T, rng) {
  const dd = state.dir && typeof state.dir === 'object' ? state.dir : (state.dir = {});
  if (!dd.prochain) dd.prochain = DIR.premierOrage + 3 + rng.int(0, 3);
  const actives = Object.values(state.zones || {}).filter(actif).length;
  if ((!dd.g || dd.g.tour <= T) && T + 2 >= dd.prochain && T + 2 <= SEASON_LENGTH && actives >= 2) {
    const ids = Object.keys(DISTRICT).filter((k) => k !== dd.dernier);
    const id = rng.pick(ids);
    dd.g = { id, tour: T + 2 };
    dd.dernier = id;
    dd.prochain = T + 2 + rng.int(...DIR.district);
  }
  if (dd.g && dd.g.tour < T + 1) dd.g = null;
  return dd;
}

/** Signes du district pour le tour T+1 (annonce la veille, puis l'événement). */
function pressionsDistrict(state, T1) {
  const g = state.dir && state.dir.g;
  if (!g || !DISTRICT[g.id]) return [];
  const e = DISTRICT[g.id];
  if (g.tour === T1) return [{ id: `district-${g.id}`, district: g.id, titre: e.titre, texte: e.texte, effet: { ...e.effet } }];
  if (g.tour === T1 + 1) return [{ id: `district-annonce`, district: g.id, titre: e.annonce, texte: e.texteAnnonce, effet: {} }];
  return [];
}

// ───── La nuit : préparer le tour suivant ─────

function duree([a, b], rng, ajust = 0) { return Math.max(1, rng.int(a, b) + ajust); }

/**
 * Prépare le tour T+1 d'une zone (appelé à la place des anciens tirages d'opération et de situation du jour).
 * @param ctx { T, nextWeekday, forme, site, PRESSION_WEEKEND }
 */
export function directeurNuit(state, z, rng, { T, nextWeekday, forme = 0, PRESSION_WEEKEND = null }) {
  const d = assurerDir(z);
  const T1 = T + 1;
  const site = siteDe(z);
  if (z.operation && T1 >= z.operation.tourDebut + z.operation.duree) z.operation = null;

  // 1. Le ciel de demain.
  if (!actif(z)) {
    // Zone absente : on la laisse tranquille (et on range ce qui était en cours).
    d.ph = 'calme'; d.j = 0; d.n = 2; d.orage = null;
    if (d.fe && d.fe.tour <= T1) d.fe = null;
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
      { id: 'coup', w: Math.max(0.3, pire - 0.6) * 1.5 },
      { id: 'feuilleton', w: d.fe ? 0 : 0.7 },
    ].filter((x) => x.w > 0);
    const choix = options.length ? rng.weighted(options).id : 'coup';
    if (choix === 'operation') planifierOperation(z, d, rng, site, T1, 0.35);
    else if (choix === 'feuilleton') lancerFeuilleton(state, z, 'evasion', rng, T1);
    else d.orage = 'coup';
    d.orageType = choix;
  } else if (actif(z) && !z.operation && T1 >= DIR.premierOrage && DIR.operation[d.ph] && rng.chance(DIR.operation[d.ph] * (1 + 0.5 * forme))) {
    // Une opération peut aussi tomber un jour ordinaire (elle se prépare et rapporte).
    planifierOperation(z, d, rng, site, T1, 0.25);
  }

  // 3. Feuilleton ou dilemme (ciel clair ou chargé, zone présente hier).
  const x = {
    forme, enquete: !!(state.enquete && z.enquete),
    quartiers: Object.keys(assurerQuartiers(state, z)).length > 0,
    tensionMax: Math.max(0, ...Object.values(z.quartiers || {})),
  };
  if (!d.fe && (z.toursSansOrdres || 0) === 0 && T1 >= d.cdF && (d.ph === 'calme' || d.ph === 'montee') && rng.chance(DIR.feuilleton)) {
    const pool = Object.entries(FEUILLETONS)
      .filter(([id, f]) => !f.orage && !recent(d, `fe-${id}`, 8) && !(f.dilemme && T1 < d.cdD))
      .map(([id, f]) => ({ id, w: f.poids(z, x) }))
      .filter((p) => p.w > 0);
    if (pool.length) lancerFeuilleton(state, z, rng.weighted(pool).id, rng, T1);
  }

  // 4. Situation du jour : événement du district, feuilleton, week-end, puis pressions selon le ciel.
  const pressions = [...pressionsDistrict(state, T1)];
  if (d.fe && FEUILLETONS[d.fe.id]) {
    const def = FEUILLETONS[d.fe.id], et = def.etapes[d.fe.e];
    if (et) pressions.push({ id: `fe-${d.fe.id}`, feuilleton: d.fe.id, ...et.signe(state, d.fe.d || {}, d.fe.tour - T1 + 1), effet: {} });
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
      const orig = PRESSIONS.find((q) => q.id === p.id);
      pressions.push(orig);
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

function planifierOperation(z, d, rng, site, T1, partSite) {
  if (site && site.operation && rng.chance(partSite) && !recent(d, `op-site`, 10)) {
    z.operation = { id: `site-${site.id}`, ...JSON.parse(JSON.stringify(site.operation)), site: site.id, tourDebut: T1, couvertures: [] };
    memoriser(d, 'op-site');
    return;
  }
  const pool = OPERATIONS.filter((o) => !recent(d, `op-${o.id}`, 10));
  const op = rng.pick(pool.length ? pool : OPERATIONS);
  z.operation = { ...JSON.parse(JSON.stringify(op)), tourDebut: T1, couvertures: [] };
  memoriser(d, `op-${op.id}`);
}

// ───── Le soir : résoudre ce qui était annoncé ─────

/**
 * Résout le feuilleton du jour et l'événement de district pour une zone (pendant la simulation de la zone).
 * @param c { state, T, o, alloc, patrouilles, rates, achete:Set, indice:()=>bool, push, label, district:[] }
 */
export function directeurSoir(state, z, c) {
  const d = assurerDir(z);
  const lignes = [];
  // Services laissés vides : la mémoire du Directeur.
  for (const [s, seuil] of Object.entries(SERVICES_SEUIL)) d.neg[s] = (c.alloc[s] || 0) <= seuil ? (d.neg[s] || 0) + 1 : 0;

  // Feuilleton ou dilemme du jour.
  const fe = d.fe;
  if (fe && fe.tour === c.T && FEUILLETONS[fe.id]) {
    const def = FEUILLETONS[fe.id], et = def.etapes[fe.e];
    let ch = null;
    if (et.choix) {
      const v = c.o && Number.isInteger(c.o.dilemme) && c.o.dilemme >= 0 && c.o.dilemme < et.choix.length ? c.o.dilemme : null;
      ch = v === null ? et.defaut : v;
      if (v === null) lignes.push(`${def.titre} : sans réponse de ta part, ton adjoint a choisi « ${et.choix[ch].l} ».`);
    }
    const r = et.resoudre({ ...c, z }, fe.d || {}, ch);
    const eff = appliquer(z, r.fx || {}, { T: c.T, cell: fe.d && fe.d.cell, indice: c.indice, compta: def.titre });
    lignes.push(`${def.titre}${ch !== null ? ` (« ${et.choix[ch].l} »)` : ''} : ${r.texte}${eff ? ` (${eff})` : ''}.`);
    if (r.une) c.push(r.une[0], r.une[1], r.une[2], r.une[3] || `${def.titre} : ${r.texte}.`, z.uid);
    if (r.suite && def.etapes[r.suite]) { fe.e = r.suite; fe.tour = c.T + (def.etapes[r.suite].delai || 1); }
    else { d.fe = null; d.cdF = c.T + 1 + DIR.pauseFeuilleton; }
    d.bilan = { tour: c.T, titre: def.titre, ok: !!r.ok };
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
export function districtBilan(state, T, res, push, label) {
  const g = state.dir && state.dir.g;
  if (!g || g.tour !== T || !DISTRICT[g.id]) return null;
  const e = DISTRICT[g.id];
  const ok = res.filter((x) => x.ok);
  push(9, e.titre, ok.length === res.length ? `${e.titre} : tout le district a tenu bon` : `${e.titre} : ${ok.length} zone${ok.length > 1 ? 's' : ''} sur ${res.length} ${ok.length > 1 ? 'ont' : 'a'} tenu bon`,
    ok.length ? `Citées en exemple : ${ok.map((x) => label(state.zones[x.uid])).join(', ')}.` : 'Aucune zone n’était prête.');
  state.dir.g = null;
  return { id: g.id, titre: e.titre, ok: ok.map((x) => x.uid), total: res.length };
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

/** Cible de décalage d'après l'historique [[bonnes, tentées], …] et le rang (0 à 1, ou undefined). */
export function cibleEnigmes(hist, rang) {
  const ok = hist.reduce((s, x) => s + x[0], 0), tot = hist.reduce((s, x) => s + x[1], 0);
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
  if (tentees > 0) e.h = [...e.h, [ok, tentees]].slice(-ENIG.jours);
  const cible = cibleEnigmes(e.h, rang);
  const niv = Number.isFinite(e.niv) ? e.niv : 0;
  e.niv = clamp(niv + Math.sign(cible - niv), ENIG.min, ENIG.max);
  d.enig = e;
  return e.niv;
}

/** Décalage du niveau des énigmes du jour pour cette zone. */
export const niveauEnigmes = (z) => (z && z.dir && z.dir.enig && Number.isFinite(z.dir.enig.niv) ? z.dir.enig.niv : 0);
