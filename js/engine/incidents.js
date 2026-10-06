// Incidents de la journée : un mini-jeu qui tombe sur un service, une ou deux fois par jour,
// entre 7 h et 19 h. Il reste ouvert 12 heures : s'il tombe tard,
// il déborde sur le lendemain matin et compte alors à la résolution suivante (incidents « reportés »). Joué : réussite (jauge des skins) ou échec (malus
// à 20:00). Pas joué : l'équipe se débrouille seule, avec une chance qui dépend de ses effectifs.
import { makeRng } from './rng.js';
import { DEFAULT_ALLOC, SERVICE_LABELS, PS, gainMoral, vitesseCombi, risqueBlessure, USURE } from './constants.js';
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
 * Mini-jeu « Bitonal » : rejoindre l'adresse au plus vite, en feu bleu. La vitesse de la combi dépend du parc
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
  blessure: 0.6, absence: 2, moralRetard: -2,
  usureParAccrochage: 2, usureHS: 8,
  seule: { blessure: 0.3, moral: -1 },
};
/** Ce qu'on risque, en clair (écran du mini-jeu). */
export const texteRisqueUrgence = () => `trop tard : un collègue peut être blessé (${URGENCE.absence} jours d’absence) ; combi hors service : un véhicule cabossé ; chaque accrochage use le parc (+${URGENCE.usureParAccrochage} %)`;

export const INC = {
  // Retour de Luc : il tombe entre 6 h et 12 h et reste ouvert jusqu'à la résolution de 20:00 (8 à 14 heures pour jouer).
  premier: 10 * H,        // au plus tôt 6 h (la journée de jeu commence à 20:00 la veille)
  dernier: 16 * H,        // au plus tard 12 h
  jauge: 50,              // points de jauge pour un skin
  deuxiemeChance: 0.5,    // probabilité d'un second incident dans la journée
};

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
  if (r.next() < INC.deuxiemeChance) {
    // Le second, au moins 2 heures avant ou après le premier, toujours entre 7 h et 19 h.
    let o2 = ouvre1 + 2 * H + Math.floor(r.next() * (fenetre - 4 * H));
    if (o2 > debut + INC.dernier) o2 -= fenetre;
    liste.push({ service: tirer([liste[0].service]), ouvre: o2 });
    liste.sort((a, b) => a.ouvre - b.ouvre);
  }
  // Difficulté figée dès que l'incident tombe : agents du service EN SERVICE aujourd'hui (ordres validés
  // à la dernière résolution) et cran du Directeur du jour. Modifier ses ordres de ce soir ne change plus
  // le niveau (avant : on gonflait un service juste avant de jouer pour l'avoir en facile).
  // Un incident reporté au lendemain garde ces valeurs (elles sont stockées avec lui).
  const niv = z.dir && z.dir.inc && Number.isFinite(z.dir.inc.niv) ? z.dir.inc.niv : 0;
  // L'urgence du jour : tirée à part (n'a aucun effet sur le tirage des autres incidents).
  const ru = makeRng(`${state.seed}:s${state.season}:t${state.turn}:urgence:${uid}`);
  const v = vitesseCombi(z);
  const urgence = {
    id: `s${state.season}t${state.turn}-u`, urgence: true,
    service: URGENCE.service, jeu: URGENCE.jeu, titre: URGENCE.titre,
    ouvre: debut + INC.premier + Math.floor(ru.next() * fenetre), ferme: fin,
    agents: al[URGENCE.service] || 0, ajust: niv,
    vit: v.mult, frein: v.frein, etat: v.etat, cabosse: v.cabosse, prepa: v.prepa,
    seed: Math.floor(ru.next() * 1e9),
  };
  return [...liste.map((x, k) => ({
    id: `s${state.season}t${state.turn}-${k}`,
    service: x.service, jeu: INCIDENTS[x.service].jeu, titre: INCIDENTS[x.service].titre,
    ouvre: x.ouvre, ferme: fin,
    agents: al[x.service] || 0, ajust: niv,
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

/** Points de jauge d'un incident réussi en jouant : 2 sans faute, sinon 1. */
export const pointsJauge = (res) => (res && res.statut === 'ok' ? (res.fautes ? 1 : 2) : 0);
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
  if (hits && res.raison !== 'hs') { z.usure = Math.min(USURE.max, (z.usure || 0) + hits * U.usureParAccrochage); out.push(`${hits} accrochage${hits > 1 ? 's' : ''} en route (parc +${hits * U.usureParAccrochage} % d’usure)`); }
  if (res.statut === 'ok') {
    const gm = gainMoral(U.gain.moral, z.moral);
    z.moral += gm;
    const pts = pointsJauge(res);
    z.jaugeIncidents = (z.jaugeIncidents || 0) + pts;
    z._ps = (z._ps || 0) + PS.queteOk;
    z.stats.urgencesOk = (z.stats.urgencesOk || 0) + 1;
    return [`${nom} : sur place à temps${res.score ? ` (${res.score} points)` : ''}, les collègues sont dégagés. +${gm} de moral, +${PS.queteOk} PS, +${pts} sur la jauge des skins${out.length ? ` ; ${out.join(', ')}` : ''}.`];
  }
  z._ps = (z._ps || 0) + PS.queteTentee;
  if (res.raison === 'hs') {
    const slot = placeLibre(z, T);
    if (slot >= 0) { z.cabosses = [...(z.cabosses || []), { depuis: T, slot }]; out.push('la combi rentre cabossée (carrosserie à prévoir)'); }
    else { z.usure = Math.min(USURE.max, (z.usure || 0) + U.usureHS); out.push(`la combi déjà cabossée encaisse encore (parc +${U.usureHS} % d’usure)`); }
    return [`${nom} : combi hors service en route ; ${out.join(' ; ')} (+${PS.queteTentee} PS pour avoir essayé).`];
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
      const g = GAIN[inc.service], gains = [];
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
  // Jauge pleine : un skin que la zone n'a pas encore (sinon une prime).
  while ((z.jaugeIncidents || 0) >= INC.jauge) {
    z.jaugeIncidents -= INC.jauge;
    const manquants = TOUS_SKINS.filter((s) => !(z.skins || []).includes(`${s.cat}:${s.id}`));
    if (manquants.length) {
      const s = manquants[Math.floor(rng.next() * manquants.length)];
      ajouterSkin(z, `${s.cat}:${s.id}`);
      skin = s;
      lignes.push(`Jauge des incidents pleine : nouveau skin « ${s.nom} » (${s.categorie}). Équipe-le dans « Personnaliser mon commissariat ».`);
    } else {
      z.budget += 5; (z._compta ||= []).push({ k: 'incident', l: 'Jauge des incidents pleine', v: 5 });
      lignes.push('Jauge des incidents pleine : tu as déjà tous les skins, prime de +5 k€.');
    }
  }
  return { lignes, skin };
}
