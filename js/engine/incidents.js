// Incidents de la journée : un mini-jeu qui tombe sur un service, une ou deux fois par jour,
// tôt le matin. Il reste ouvert 12 heures (jusqu'en fin d'après-midi). Joué : réussite (jauge des skins) ou échec (malus
// à 20:00). Pas joué : l'équipe se débrouille seule, avec une chance qui dépend de ses effectifs.
import { makeRng } from './rng.js';
import { DEFAULT_ALLOC, SERVICE_LABELS, PS, gainMoral } from './constants.js';
import { TOUS_SKINS, ajouterSkin } from './decor.js';

const H = 3600 * 1000;

/** Un mini-jeu par service (l'Accueil n'en a pas). */
export const INCIDENTS = {
  intervention: { jeu: 'colis', titre: 'Colis suspect', texte: 'Un sac abandonné bipe devant la gare. Le SEDEE est retenu ailleurs.' },
  recherche: { jeu: 'crochetage', titre: 'Porte verrouillée', texte: 'Perquisition sous mandat : personne n’ouvre et le serrurier ne répond pas.' },
  roulage: { jeu: 'depanneuse', titre: 'Accident sur le parking', texte: 'Une voiture accidentée est coincée : la dépanneuse attend à la sortie.' },
  proximite: { jeu: 'dossier', titre: 'Dossier à relire', texte: 'Un rapport de domiciliation doit partir à la commune : 3 erreurs s’y sont glissées.' },
};
export const SERVICES_INCIDENTS = Object.keys(INCIDENTS);

export const INC = {
  ouverture: 12 * H,      // durée pendant laquelle l'incident peut être joué
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
export function difficulte(service, agents) {
  const r = (agents || 0) / (DEFAULT_ALLOC[service] || 1);
  return r < 0.7 ? 'difficile' : r >= 1.5 ? 'facile' : 'normal';
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
  // 12 heures pour jouer, bouclées avant la résolution de 20:00 : le premier incident tombe entre 6 h et 7 h,
  // le second 30 à 60 minutes plus tard (au plus tard vers 8 h). On a donc toute la journée pour intervenir.
  const ouvre1 = debut + 10 * H + Math.floor(r.next() * H);
  const liste = [{ service: tirer([]), ouvre: ouvre1 }];
  if (r.next() < INC.deuxiemeChance) liste.push({ service: tirer([liste[0].service]), ouvre: ouvre1 + H / 2 + Math.floor(r.next() * H / 2) });
  return liste.map((x, k) => ({
    id: `s${state.season}t${state.turn}-${k}`,
    service: x.service, jeu: INCIDENTS[x.service].jeu, titre: INCIDENTS[x.service].titre,
    ouvre: x.ouvre, ferme: Math.min(x.ouvre + INC.ouverture, fin - 2 * 60 * 1000),
  }));
}

/** Résultats enregistrés par le joueur (profil), pour les incidents de ce tour seulement. */
export function resultatsIncidents(player, incidents) {
  const r = (player && player.incidents && player.incidents.r) || {};
  return Object.fromEntries(incidents.filter((i) => r[i.id]).map((i) => [i.id, r[i.id]]));
}

/** Points de jauge d'un incident réussi en jouant : 2 sans faute, sinon 1. */
export const pointsJauge = (res) => (res && res.statut === 'ok' ? (res.fautes ? 1 : 2) : 0);

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
    } else if (rng.chance(chanceSeule(inc.service, alloc[inc.service]))) {
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
