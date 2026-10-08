// Incidents de la journée : un mini-jeu qui tombe sur un service, une ou deux fois par jour,
// entre 7 h et 19 h. Il reste ouvert 12 heures : s'il tombe tard,
// il déborde sur le lendemain matin et compte alors à la résolution suivante (incidents « reportés »). Joué : réussite (jauge des skins) ou échec (malus
// à 20:00). Pas joué : l'équipe se débrouille seule, avec une chance qui dépend de ses effectifs.
import { makeRng } from './rng.js';
import { DEFAULT_ALLOC, SERVICE_LABELS, PS, gainMoral, risqueBlessure, USURE } from './constants.js';
import { vitesseCombi, vehiculesUrgence, user, modeleDe } from './flotte.js';
import { TOUS_SKINS, ajouterSkin } from './decor.js';
import { placeLibre } from './parc.js';

const H = 3600 * 1000;

/** Un mini-jeu par service (l'Accueil n'en a pas). */
export const INCIDENTS = {
  intervention: { jeu: 'colis', titre: 'Colis suspect', texte: 'Un sac abandonné bipe devant la gare. Le SEDEE est retenu ailleurs.' },
  recherche: { jeu: 'crochetage', titre: 'Porte verrouillée', texte: 'Perquisition sous mandat : personne n’ouvre et le serrurier ne répond pas.' },
  roulage: { jeu: 'depanneuse', titre: 'Accident sur le parking', texte: 'Une voiture accidentée est coincée : la dépanneuse attend à la sortie.' },
  proximite: { jeu: 'dossier', titre: 'Dossier à relire', texte: 'Un rapport de domiciliation doit partir à la commune : 3 erreurs s’y sont glissées.' },
};
export const SERVICES_INCIDENTS = Object.keys(INCIDENTS);

/**
 * L'urgence du jour (une par jour, en plus des incidents) : des collègues pris à partie demandent du renfort.
 * Mini-jeu « Bitonal » : rejoindre l'adresse au plus vite, en feu bleu. La vitesse du combi dépend du parc
 * (état, véhicules cabossés) et de la préparation des combis ; elle est figée quand l'urgence tombe, comme la difficulté.
 * Issues :
 *  - à temps : +3 de moral (comme un incident d'Intervention réussi), +5 PS, jauge des skins ;
 *  - trop tard (ou abandon en route) : `blessure` de chances qu'un collègue soit blessé (× risque de blessure de la zone :
 *    stand de tir, matériel), absent `absence` tours ; sinon `moralRetard` ;
 *  - combi hors service (3 accrochages) : un véhicule sain devient cabossé (ou, s'ils le sont tous, `usureHS` d'usure), rien d'autre ;
 *  - chaque accrochage en route : +`usureParAccrochage` d'usure du parc ;
 *  - « Pas le temps » : rien, ni bonus ni malus (ni PS, ni jauge) ;
 *  - pas joué : l'équipe se débrouille (chance selon les effectifs d'Intervention), sinon `seule`.
 */
export const URGENCE = {
  jeu: 'bitonal', service: 'intervention', titre: 'Collègues pris à partie',
  texte: 'Une patrouille est prise à partie et demande du renfort. Rejoins-les au plus vite, en feu bleu.',
  gain: { moral: 3 },
  // Simulation (test/urgence-sim.mjs) : jouer ne doit jamais coûter plus de blessés que ne pas venir.
  blessure: 0.25, absence: 2, moralRetard: -1,
  usureParAccrochage: 2, usureHS: 8,
  seule: { blessure: 0.45, moral: -1 },
};
/**
 * Temps cible de l'urgence, par niveau. Parcours (identiques au mini-jeu) : longueur et carrefours.
 * Référence = trajet parfait d'un combi neuf ; cible = référence × marge.
 * La marge s'ajuste chaque nuit sur les courses réelles de la partie : chaque temps est ramené à un combi neuf
 * (temps × vitesse du combi ÷ référence) ; la marge vise le quantile `quantile` de ces temps (≈ 65 % de courses
 * à temps à combi égale), en n'avançant que de `pas` vers lui (au plus `pasMax` par nuit), entre `min` et `max`,
 * et seulement à partir de `minCourses` courses. Un combi lent ou cabossé garde donc moins de marge.
 */
export const CIBLE = {
  base: 31, parInter: 2.8, fixe: 4,
  niveaux: {
    // Marges de départ calées sur la simulation (joueur moyen ≈ 1,25 × le trajet parfait) ; les niveaux se distinguent surtout par le trafic.
    facile: { long: 1800, inter: 3, marge: 1.35, min: 1.15, max: 1.6 },
    normal: { long: 2100, inter: 4, marge: 1.28, min: 1.08, max: 1.55 },
    difficile: { long: 2400, inter: 5, marge: 1.22, min: 1.0, max: 1.5 },
  },
  quantile: 0.7, minCourses: 5, garde: 30, pas: 0.5, pasMax: 0.08,
};
export const NIVEAUX_URGENCE = Object.keys(CIBLE.niveaux);
/** Trajet parfait (s) d'un combi neuf sur ce niveau. */
export const refUrgence = (niv) => { const n = CIBLE.niveaux[niv] || CIBLE.niveaux.normal; return n.long / CIBLE.base + n.inter * CIBLE.parInter + CIBLE.fixe; };
/** Marge actuelle du niveau (ajustée sur les courses de la partie). */
export function margeUrgence(state, niv) {
  const c = state && state.urgenceCible && state.urgenceCible[niv];
  return c && Number.isFinite(c.marge) ? c.marge : (CIBLE.niveaux[niv] || CIBLE.niveaux.normal).marge;
}
/** Temps cible (s) du niveau, et nombre de courses sur lesquelles il s'appuie. */
export function cibleUrgence(state, niv) {
  const c = state && state.urgenceCible && state.urgenceCible[niv];
  return { cible: Math.round(refUrgence(niv) * margeUrgence(state, niv)), courses: (c && c.h && c.h.length) || 0 };
}
/** Quantile q d'une liste (interpolé). */
export function quantile(l, q) {
  const s = l.slice().sort((a, b) => a - b);
  if (!s.length) return NaN;
  const i = (s.length - 1) * q, a = Math.floor(i), b = Math.ceil(i);
  return s[a] + (s[b] - s[a]) * (i - a);
}
/**
 * Ajuste les marges sur les courses de la nuit : [{ niveau, temps, vit }] (temps en s, vitesse du combi en ×).
 * Renvoie les marges modifiées { niveau: [avant, après] }.
 */
export function adapterCibleUrgence(state, courses) {
  const out = {};
  state.urgenceCible ||= {};
  for (const niv of NIVEAUX_URGENCE) {
    const P = CIBLE.niveaux[niv];
    const c = (state.urgenceCible[niv] ||= { marge: P.marge, h: [] });
    const neuves = courses.filter((x) => x && x.niveau === niv && Number.isFinite(x.temps) && x.temps > 0)
      .map((x) => Math.round(Math.max(0.7, Math.min(3, (x.temps * (Number.isFinite(x.vit) ? x.vit : 1)) / refUrgence(niv))) * 1000) / 1000);
    if (!neuves.length) continue;
    c.h = [...c.h, ...neuves].slice(-CIBLE.garde);
    if (c.h.length < CIBLE.minCourses) continue;
    const vise = Math.max(P.min, Math.min(P.max, quantile(c.h, CIBLE.quantile)));
    const pas = Math.max(-CIBLE.pasMax, Math.min(CIBLE.pasMax, (vise - c.marge) * CIBLE.pas));
    const avant = c.marge;
    c.marge = Math.round((c.marge + pas) * 1000) / 1000;
    if (c.marge !== avant) out[niv] = [avant, c.marge];
  }
  return out;
}

/** Ce qu'on risque, en clair (écran du mini-jeu). */
export const texteRisqueUrgence = () => `trop tard : un collègue peut être blessé (${URGENCE.absence} jours d’absence) ; trop d’accrochages : le véhicule doit s’arrêter et rentre cabossé (pas perdu) ; chaque accrochage use le parc (+${URGENCE.usureParAccrochage} %)`;

export const INC = {
  // Retour de Luc : il tombe entre 6 h et 12 h et reste ouvert jusqu'à la résolution de 20:00 (8 à 14 heures pour jouer).
  premier: 10 * H,        // au plus tôt 6 h (la journée de jeu commence à 20:00 la veille)
  dernier: 16 * H,        // au plus tard 12 h
  jauge: 50,              // points de jauge pour un skin
  deuxiemeChance: 0.5,    // probabilité d'un second incident dans la journée
  // Retour de Luc (oct. 2026) : plus l'IPZ de la veille est haut, plus il tombe d'incidents (zone très en vue).
  // Ces incidents « en plus » ne rapportent que les PS et la jauge des skins ; ratés ou laissés, ils coûtent comme les autres.
  pression: { depuis: Date.parse('2026-10-08T18:30:00Z'), deuxieme: [[75, 0.75], [85, 1]], troisieme: { ipz: 90, chance: 0.5 } },
};
/** Chance d'un second incident selon l'IPZ de la veille. */
export function chanceDeuxieme(ipz) {
  let c = INC.deuxiemeChance;
  for (const [min, v] of INC.pression.deuxieme) if ((Number(ipz) || 0) >= min) c = v;
  return c;
}

/**
 * Équilibrage aligné sur les énigmes du jour (une énigme : +5 PS si réussie, −1 de moral si ratée ;
 * le bonus d'énigmes vaut +3 de moral, +2 k€ ou +1 indice).
 * GAIN : réussite en jouant, en plus de +5 PS et de la jauge des skins. Chaque service rapporte
 * ce qu'il sait faire. `plein` : échec en jouant ou abandon. `leger` : l'équipe seule n'y arrive pas.
 */
export const GAIN = {
  intervention: { moral: 3 },
  recherche: { indice: 1 },
  roulage: { budget: 2 },
  proximite: { satisfaction: 2 },
};
export const MALUS = {
  intervention: { plein: { moral: -1 }, leger: { moral: -1 } },
  recherche: { plein: { moral: -1 }, leger: { reputation: -1 } },
  roulage: { plein: { moral: -1 }, leger: { budget: -1 } },
  proximite: { plein: { moral: -1 }, leger: { satisfaction: -1 } },
};

/** Phrase lisible d'un malus, pour le mini-jeu et le rapport. */
export function texteMalus(m) {
  const t = [];
  if (m.agents) t.push(`${m.agents} agent${m.agents > 1 ? 's' : ''} ${m.motif}${m.agents > 1 ? 's' : ''}, absent${m.agents > 1 ? 's' : ''} ${m.tours} tour${m.tours > 1 ? 's' : ''}`);
  if (m.moral) t.push(`${m.moral} de moral`);
  if (m.budget) t.push(`${m.budget} k€`);
  if (m.satisfaction) t.push(`${m.satisfaction} de satisfaction`);
  if (m.reputation) t.push(`${m.reputation} de réputation`);
  return t.join(', ').replace(/-/g, '−');
}

/** Phrase lisible d'un gain (sans les PS ni la jauge, communs à tous). */
export function texteGain(g) {
  const t = [];
  if (g.moral) t.push(`+${g.moral} de moral`);
  if (g.budget) t.push(`+${g.budget} k€`);
  if (g.satisfaction) t.push(`+${g.satisfaction} de satisfaction`);
  if (g.indice) t.push(`+${g.indice} indice d’enquête`);
  return t.join(', ');
}

/** Difficulté du mini-jeu selon les agents du service, rapportés à la répartition de base. */
export function difficulte(service, agents, ajust = 0) {
  const r = (agents || 0) / (DEFAULT_ALLOC[service] || 1);
  const niveaux = ['facile', 'normal', 'difficile'];
  const base = r < 0.7 ? 2 : r >= 1.5 ? 0 : 1;
  // `ajust` : cran du Directeur selon les mini-jeux réussis ou ratés ces derniers jours (−1 plus facile, +1 plus difficile).
  const a = Number.isFinite(ajust) ? Math.max(-1, Math.min(1, Math.round(ajust))) : 0;
  return niveaux[Math.max(0, Math.min(2, base + a))];
}

/** Chance que l'équipe règle l'incident seule (incident non joué). */
export function chanceSeule(service, agents) {
  const r = (agents || 0) / (DEFAULT_ALLOC[service] || 1);
  return Math.max(0.25, Math.min(0.8, 0.25 + 0.35 * r));
}

/** Répartition servant à tirer les incidents : la dernière validée (connue de tous pendant la journée). */
const allocDe = (z) => (z && z.dernierOrdre && z.dernierOrdre.alloc) || DEFAULT_ALLOC;

/**
 * Incidents du tour pour une zone : liste de { id, service, jeu, titre, ouvre, ferme }.
 * Tout est tiré de la graine : chaque appareil et la résolution retrouvent les mêmes.
 */
export function incidentsDuTour(state, uid) {
  const z = state && state.zones && state.zones[uid];
  if (!z || !state.nextDeadline) return [];
  const fin = state.nextDeadline, debut = fin - 24 * H;
  const r = makeRng(`${state.seed}:s${state.season}:t${state.turn}:incidents:${uid}`);
  const al = allocDe(z);
  const tirer = (exclus) => {
    const pool = SERVICES_INCIDENTS.filter((s) => !exclus.includes(s));
    const poids = pool.map((s) => 1 + Math.max(0, al[s] || 0));
    let x = r.next() * poids.reduce((a, b) => a + b, 0);
    for (let k = 0; k < pool.length; k++) { x -= poids[k]; if (x <= 0) return pool[k]; }
    return pool[pool.length - 1];
  };
  // Heure imprévue entre 7 h et 19 h, puis 12 heures pour jouer. Un incident tombé après 8 h déborde
  // sur la résolution de 20:00 : il est alors réglé à la résolution suivante (voir separerIncidents).
  const fenetre = INC.dernier - INC.premier;
  const ouvre1 = debut + INC.premier + Math.floor(r.next() * fenetre);
  const liste = [{ service: tirer([]), ouvre: ouvre1 }];
  const pression = fin > INC.pression.depuis, ipz = Number(z.ipz) || 0;
  const x2 = r.next();
  if (x2 < (pression ? chanceDeuxieme(ipz) : INC.deuxiemeChance)) {
    // Le second, au moins 2 heures avant ou après le premier, toujours entre 7 h et 19 h.
    let o2 = ouvre1 + 2 * H + Math.floor(r.next() * (fenetre - 4 * H));
    if (o2 > debut + INC.dernier) o2 -= fenetre;
    liste.push({ service: tirer([liste[0].service]), ouvre: o2, ...(x2 >= INC.deuxiemeChance ? { pression: true } : {}) });
  }
  // Troisième incident pour une zone à 90 d'IPZ ou plus (tirage à part : ne change rien aux autres).
  if (pression && ipz >= INC.pression.troisieme.ipz) {
    const r3 = makeRng(`${state.seed}:s${state.season}:t${state.turn}:incidents3:${uid}`);
    if (r3.chance(INC.pression.troisieme.chance)) {
      const pris = liste.map((x) => x.service), pool = SERVICES_INCIDENTS.filter((s) => !pris.includes(s));
      liste.push({ service: pool[Math.floor(r3.next() * pool.length)] || SERVICES_INCIDENTS[0], ouvre: debut + INC.premier + Math.floor(r3.next() * fenetre), pression: true });
    }
  }
  liste.sort((a, b) => a.ouvre - b.ouvre);
  // Difficulté figée dès que l'incident tombe : agents du service EN SERVICE aujourd'hui (ordres validés
  // à la dernière résolution) et cran du Directeur du jour. Modifier ses ordres de ce soir ne change plus
  // le niveau (avant : on gonflait un service juste avant de jouer pour l'avoir en facile).
  // Un incident reporté au lendemain garde ces valeurs (elles sont stockées avec lui).
  const niv = z.dir && z.dir.inc && Number.isFinite(z.dir.inc.niv) ? z.dir.inc.niv : 0;
  // L'urgence du jour : tirée à part (n'a aucun effet sur le tirage des autres incidents).
  const ru = makeRng(`${state.seed}:s${state.season}:t${state.turn}:urgence:${uid}`);
  // Véhicules disponibles quand l'urgence tombe : le joueur choisit lequel part (le plus rapide par défaut).
  const vehs = vehiculesUrgence(z, state.turn).slice(0, 12);
  const v = vehs[0] || vitesseCombi(z, state.turn);
  const urgence = {
    id: `s${state.season}t${state.turn}-u`, urgence: true,
    service: URGENCE.service, jeu: URGENCE.jeu, titre: URGENCE.titre,
    ouvre: debut + INC.premier + Math.floor(ru.next() * fenetre), ferme: fin,
    agents: al[URGENCE.service] || 0, ajust: niv,
    diff: difficulte(URGENCE.service, al[URGENCE.service] || 0, niv),
    vit: v.mult, frein: v.frein, etat: v.etat, cabosse: v.cabosse, prepa: v.prepa,
    vehicules: vehs.map((x) => ({ slot: x.slot, m: x.m, etat: x.etat, cabosse: x.cabosse, mult: x.mult, frein: x.frein, accel: x.accel, maniab: x.maniab, pv: x.pv })),
    seed: Math.floor(ru.next() * 1e9),
  };
  { const c = cibleUrgence(state, urgence.diff); urgence.cible = c.cible; urgence.courses = c.courses; }
  return [...liste.map((x, k) => ({
    id: `s${state.season}t${state.turn}-${k}`,
    service: x.service, jeu: INCIDENTS[x.service].jeu, titre: INCIDENTS[x.service].titre,
    ouvre: x.ouvre, ferme: fin,
    agents: al[x.service] || 0, ajust: niv, ...(x.pression ? { pression: true } : {}),
  })), urgence].sort((a, b) => a.ouvre - b.ouvre);
}

/** Incidents visibles par le joueur : ceux du jour, plus ceux d'hier encore ouverts ce matin (reportés). */
export function incidentsVisibles(state, uid) {
  const z = state && state.zones && state.zones[uid];
  return [...((z && z.incidentsReportes) || []), ...incidentsDuTour(state, uid)];
}

/**
 * À la résolution : ce qui se règle ce soir (reportés d'hier + incidents du jour joués ou déjà clos)
 * et ce qui est reporté à demain (incidents du jour encore ouverts et pas encore joués).
 */
export function separerIncidents(state, uid, resultats, fin = state.nextDeadline) {
  const z = state && state.zones && state.zones[uid];
  const maintenant = [...((z && z.incidentsReportes) || [])], reportes = [];
  for (const inc of incidentsDuTour(state, uid)) (inc.ferme > fin && !resultats[inc.id] ? reportes : maintenant).push(inc);
  return { maintenant, reportes };
}

/** Résultats enregistrés par le joueur (profil), pour les incidents de ce tour seulement. */
export function resultatsIncidents(player, incidents) {
  const r = (player && player.incidents && player.incidents.r) || {};
  return Object.fromEntries(incidents.filter((i) => r[i.id]).map((i) => [i.id, r[i.id]]));
}

/** Points de jauge d'un incident réussi en jouant : 2 sans faute, sinon 1 ; +1 si le défi bonus du mini-jeu est réussi (Maintien de l'ordre). */
export const pointsJauge = (res) => (res && res.statut === 'ok' ? (res.fautes ? 1 : 2) + (res.bonus === true ? 1 : 0) : 0);
/** Résultats qui comptent pour le Directeur et les statistiques (« Pas le temps » est neutre). */
export const compte = (res) => !!res && res.statut !== 'passe';

/** Conséquences de l'urgence du jour (voir URGENCE). Renvoie les lignes du rapport. */
export function appliquerUrgence(z, inc, res, { alloc = {}, T, rng }) {
  const U = URGENCE, nom = `Urgence · ${inc.titre}`;
  if (res && res.statut === 'passe') return [`${nom} : « Pas le temps ». Une autre équipe y est allée, sans effet pour ta zone.`];
  z.stats.urgences = (z.stats.urgences || 0) + 1;
  const out = [];
  const blesser = (p, sinon) => {
    if (rng.chance(p * risqueBlessure(z))) { z.blesses.push({ n: 1, retour: T + 1 + U.absence, motif: 'blessé' }); return `un collègue est blessé, absent ${U.absence} jours`; }
    z.moral += sinon; return `personne n’est blessé, mais l’équipe l’a mal vécu (${sinon} de moral)`;
  };
  if (!res) {
    const n = Number.isFinite(inc.agents) ? inc.agents : alloc.intervention;
    if (rng.chance(chanceSeule('intervention', n))) return [`${nom} : personne n’est venu, l’Intervention s’en est sortie seule.`];
    return [`${nom} : personne n’est venu en renfort à temps ; ${blesser(U.seule.blessure, U.seule.moral)}.`];
  }
  const hits = res.statut === 'abandon' ? 0 : Math.max(0, Math.min(3, Math.floor(Number(res.fautes) || 0)));
  // Le véhicule parti (choisi dans le mini-jeu, parmi ceux disponibles quand l'urgence est tombée).
  const veh = (inc.vehicules || []).find((x) => x.slot === res.vehicule) || (inc.vehicules || [])[0] || null;
  // Sans choix connu (urgence d'une version précédente) : le véhicule en meilleur état.
  const slot = veh && veh.slot < ((z.flotte || []).length || z.vehicules || 0) ? veh.slot : (z.flotte || []).reduce((b, x, i, f) => (b < 0 || x.u < f[b].u ? i : b), -1);
  const nomVeh = { diesel: 'le combi', electrique: 'le combi électrique', anonyme: 'la voiture anonymisée', fourgon: 'le fourgon' }[veh ? veh.m : 'diesel'] || 'le combi';
  if (hits && res.raison !== 'hs') { user(z, slot >= 0 ? slot : null, hits * U.usureParAccrochage); out.push(`${hits} accrochage${hits > 1 ? 's' : ''} en route (${nomVeh} s’use de ${hits * U.usureParAccrochage} %)`); }
  if (res.statut === 'ok') {
    const gm = gainMoral(U.gain.moral, z.moral);
    z.moral += gm;
    const pts = pointsJauge(res);
    z.jaugeIncidents = (z.jaugeIncidents || 0) + pts;
    z._ps = (z._ps || 0) + PS.queteOk;
    z.stats.urgencesOk = (z.stats.urgencesOk || 0) + 1;
    (z.carriere ||= {}).incidents = (z.carriere.incidents || 0) + 1;
    return [`${nom} : sur place à temps${res.score ? ` (${res.score} points)` : ''}, les collègues sont dégagés. +${gm} de moral, +${PS.queteOk} PS, +${pts} sur la jauge des skins${out.length ? ` ; ${out.join(', ')}` : ''}.`];
  }
  z._ps = (z._ps || 0) + PS.queteTentee;
  if (res.raison === 'hs') {
    const cible = slot != null && slot >= 0 ? slot : placeLibre(z, T);
    if (cible != null && cible >= 0 && !(z.cabosses || []).some((c) => c.slot === cible)) { z.cabosses = [...(z.cabosses || []), { depuis: T, slot: cible, cause: 'urgence (Bitonal) : trop d’accrochages en route' }]; out.push(`${nomVeh} rentre avec la carrosserie à refaire`); }
    else { user(z, cible != null && cible >= 0 ? cible : null, U.usureHS); out.push(`${nomVeh}, déjà abîmé${nomVeh.startsWith('la ') ? 'e' : ''}, encaisse encore (+${U.usureHS} % d’usure)`); }
    return [`${nom} : trop d’accrochages, ${nomVeh} a dû s’arrêter en route (une autre équipe a pris le relais). ${nomVeh.charAt(0).toUpperCase() + nomVeh.slice(1)} n’est pas perdu${nomVeh.startsWith('le ') ? '' : 'e'} : ${out.join(' ; ')} (+${PS.queteTentee} PS pour avoir essayé).`];
  }
  return [`${nom} : arrivé trop tard${res.statut === 'abandon' ? ' (renfort abandonné en route)' : ''} ; ${blesser(U.blessure, U.moralRetard)}${out.length ? ` ; ${out.join(', ')}` : ''} (+${PS.queteTentee} PS pour avoir essayé).`];
}

function appliquerMalus(z, m, T) {
  if (m.agents) z.blesses.push({ n: m.agents, retour: T + 1 + m.tours, motif: m.motif });
  if (m.moral) z.moral += m.moral;
  if (m.satisfaction) z.satisfaction += m.satisfaction;
  if (m.reputation) z.reputation += m.reputation;
  if (m.budget) { z.budget += m.budget; (z._compta ||= []).push({ k: 'incident', l: 'Incident raté', v: m.budget }); }
}

/**
 * Applique les incidents du tour à une zone (appelé pendant la résolution).
 * @param {object[]} incidents  incidents du tour (incidentsDuTour, calculés sur l'état d'avant la résolution)
 * @param {object} resultats    { id: { statut: 'ok'|'rate'|'abandon', fautes } }
 * @param {object} alloc        répartition des agents ce soir
 * @param {function} indice     donne un indice d'enquête ; renvoie false s'il n'y a rien à trouver
 */
export function appliquerIncidents(z, { incidents, resultats, alloc, T, rng, indice = () => false }) {
  const lignes = [];
  let skin = null;
  for (const inc of incidents) {
    const res = resultats[inc.id];
    const nom = `${inc.titre} (${SERVICE_LABELS[inc.service]})`;
    if (inc.urgence) { lignes.push(...appliquerUrgence(z, inc, res, { alloc, T, rng })); continue; }
    z.stats.incidentsJeu = (z.stats.incidentsJeu || 0) + 1;
    if (res && res.statut === 'ok') {
      const pts = pointsJauge(res);
      z.jaugeIncidents = (z.jaugeIncidents || 0) + pts;
      z._ps = (z._ps || 0) + PS.queteOk;
      z.stats.incidentsOk = (z.stats.incidentsOk || 0) + 1;
      (z.carriere ||= {}).incidents = (z.carriere.incidents || 0) + 1;
      // Incident « en plus » (IPZ élevé) : seulement les PS et la jauge.
      const g = inc.pression ? {} : GAIN[inc.service], gains = inc.pression ? ['incident en plus (IPZ élevé) : pas de gain de service'] : [];
      if (g.moral) { const gm = gainMoral(g.moral, z.moral); z.moral += gm; gains.push(`+${gm} de moral`); }
      if (g.satisfaction) { z.satisfaction += g.satisfaction; gains.push(`+${g.satisfaction} de satisfaction`); }
      if (g.budget) { z.budget += g.budget; (z._compta ||= []).push({ k: 'incident', l: 'Incident réussi', v: g.budget }); gains.push(`+${g.budget} k€`); }
      if (g.indice) {
        if (indice()) gains.push('+1 indice d’enquête');
        else { z.budget += 2; (z._compta ||= []).push({ k: 'incident', l: 'Incident réussi', v: 2 }); gains.push('+2 k€ (rien de neuf à trouver pour l’enquête)'); }
      }
      lignes.push(`Incident · ${nom} : réussi${res.fautes ? '' : ' sans faute'}. ${gains.join(', ')}, +${PS.queteOk} PS, +${pts} sur la jauge des skins.`);
    } else if (res) {
      const m = MALUS[inc.service].plein;
      appliquerMalus(z, m, T);
      z._ps = (z._ps || 0) + PS.queteTentee;
      lignes.push(`Incident · ${nom} : ${res.statut === 'abandon' ? 'abandonné' : 'raté'}. ${texteMalus(m)} (+${PS.queteTentee} PS pour avoir essayé).`);
    } else if (rng.chance(chanceSeule(inc.service, Number.isFinite(inc.agents) ? inc.agents : alloc[inc.service]))) {
      lignes.push(`Incident · ${nom} : personne n’est venu, ton équipe l’a réglé seule.`);
    } else {
      const m = MALUS[inc.service].leger;
      appliquerMalus(z, m, T);
      lignes.push(`Incident · ${nom} : personne n’est venu et ton équipe n’y est pas arrivée seule. ${texteMalus(m)}.`);
    }
  }
  const j = remplirJauge(z, rng);
  lignes.push(...j.lignes);
  if (j.skin) skin = j.skin;
  return { lignes, skin };
}

/** Jauge des skins pleine : un skin que la zone n'a pas encore (sinon une prime). Renvoie { lignes, skin }. */
export function remplirJauge(z, rng) {
  const lignes = [];
  let skin = null;
  while ((z.jaugeIncidents || 0) >= INC.jauge) {
    z.jaugeIncidents -= INC.jauge;
    const manquants = TOUS_SKINS.filter((s) => !(z.skins || []).includes(`${s.cat}:${s.id}`));
    if (manquants.length) {
      const s = manquants[Math.floor(rng.next() * manquants.length)];
      ajouterSkin(z, `${s.cat}:${s.id}`);
      skin = s;
      lignes.push(`Jauge des skins pleine : nouveau skin « ${s.nom} » (${s.categorie}). Équipe-le dans « Personnaliser mon commissariat ».`);
    } else {
      z.budget += 5; (z._compta ||= []).push({ k: 'incident', l: 'Jauge des skins pleine', v: 5 });
      lignes.push('Jauge des skins pleine : tu as déjà tous les skins, prime de +5 k€.');
    }
  }
  return { lignes, skin };
}
