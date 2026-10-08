// La crise du district : le Directeur pose un problème, le district vote un plan qui dure 3 jours.
//
// Cycle : annonce le soir (T), vote le lendemain dans les ordres (T+1, secret jusqu'à 20:00),
// plan appliqué les 3 jours suivants (T+2 à T+4), puis un jour sans crise avant la suivante.
// Une zone = une voix, quelle que soit sa taille. Sans voix : plan B (le plus prudent). Égalité : plan B.
// - A, Opération visible : Intervention +5 %, Roulage +10 %, criminalité en baisse chaque jour,
//   mais Proximité −25 % (méfiance dans les quartiers).
// - B, Travail discret : Recherche +60 % (dossiers, enquête de voisinage), mais −0,3 de satisfaction
//   par jour (la population ne voit rien).
// - C, Opération commune : chaque zone participante engage 10 % de ses agents (2 au moins) chaque soir.
//   Les zones qui ont voté C participent d'office (elles peuvent se retirer), les autres peuvent rejoindre.
//   Objectif : au moins les 3/4 des zones qui ont voté C (2 au moins) présentes, 2 soirs sur 3 : tenir parole. Réussite : grosse récompense
//   pour les participants (2 soirs au moins, criminalité −6 chez eux) et criminalité −2 ailleurs. Échec : rien de plus.
//   Ceux qui ne participent pas ne paient ni ne gagnent rien.

import { makeRng } from './rng.js';
import { SEASON_LENGTH, aAnnexe } from './constants.js';
import { talent, noterChef } from './chef.js';
import { clamp, agentsDisponibles } from './zone.js';

export const CRISE = {
  actif: true,
  premierAnnonce: 2,      // pas d'annonce avant le soir du tour 2
  pause: 1,               // jours sans crise entre deux plans
  duree: 3,
  zonesMin: 3,
  A: { intervention: 1.05, roulage: 1.1, proximite: 0.75, crimDebut: -1, crimJour: -0.5 },
  B: { recherche: 1.6, satisfactionJour: -0.3 },
  C: { part: 0.1, min: 2, seuil: 0.75, nuitsOk: 2, gain: { points: 14, reputation: 4, satisfaction: 3, ps: 15 }, crimParticipants: -5, crimDistrict: -2 },
};

export const CRISES = {
  cambriolages: {
    titre: 'Les cambriolages explosent dans le District Delta',
    texte: 'Des maisons visitées chaque nuit, d’un bout à l’autre du district. Les habitants s’organisent sur les réseaux.',
    plans: ['Patrouilles massives et contrôles aux sorties de ville', 'Enquêtes, recoupements et téléphonie en silence', 'Grand dispositif commun d’une nuit à l’autre'],
  },
  rodeos: {
    titre: 'Rodéos et courses sauvages chaque soir',
    texte: 'Scooters et voitures puissantes transforment les grands axes en circuit. Un piéton a été frôlé hier.',
    plans: ['Contrôles routiers renforcés et radars partout', 'Identifier les meneurs, saisir les véhicules plus tard', 'Bouclage commun des axes, zone par zone'],
  },
  deal: {
    titre: 'Le deal s’installe au cœur des quartiers',
    texte: 'Points de vente à ciel ouvert, guetteurs aux carrefours. Les commerçants n’osent plus rien dire.',
    plans: ['Descentes visibles et présence uniformée', 'Remonter la filière, filatures et écoutes', 'Opération commune sur tous les points de vente'],
  },
  violences: {
    titre: 'Nuits agitées dans tout le district',
    texte: 'Bagarres à la sortie des bars, agressions, rixes : les appels s’enchaînent toute la nuit.',
    plans: ['Présence massive dans les rues la nuit', 'Identifier les auteurs à froid, images et témoins', 'Dispositif de nuit commun à toutes les zones'],
  },
};
const pct = (m) => `${m > 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)} %`;
export const PLANS = [
  { k: 'A', nom: 'Opération visible', plus: `Intervention ${pct(CRISE.A.intervention)}, Roulage ${pct(CRISE.A.roulage)}, criminalité en baisse chaque jour`, moins: `Proximité ${pct(CRISE.A.proximite)} (méfiance dans les quartiers)` },
  { k: 'B', nom: 'Travail discret', plus: `Recherche ${pct(CRISE.B.recherche)} (dossiers, enquête de voisinage)`, moins: `${String(CRISE.B.satisfactionJour).replace('.', ',').replace('-', '−')} de satisfaction par jour (rien de visible)` },
  { k: 'C', nom: 'Opération commune', plus: `réussie : +${CRISE.C.gain.points} pts, +${CRISE.C.gain.reputation} de réputation, +${CRISE.C.gain.satisfaction} de satisfaction et criminalité −${Math.abs(CRISE.C.crimParticipants)} pour chaque participant`, moins: `${Math.round(CRISE.C.part * 100)} % de tes agents chaque soir (${CRISE.C.min} au moins) si tu participes ; ratée si moins des 3/4 des zones qui l’ont votée viennent` },
];

const actif = (z) => z && (z.toursSansOrdres || 0) < 3;

/** Crise de la saison en cours (ou null). */
export function criseCourante(state) {
  const c = state.crise;
  return c && typeof c === 'object' && c.season === state.season ? c : null;
}
/** Plan en vigueur aujourd'hui : 'A', 'B', 'C' ou null. */
export function planDuJour(state, T = state.turn) {
  const c = criseCourante(state);
  return c && c.plan && c.debut <= T && T <= c.fin ? c.plan : null;
}
/** Zones présentes requises chaque soir pour l'opération commune : 3/4 des zones qui l'ont votée, 2 au moins. */
export function requisCommune(c) {
  return Math.max(CRISE.C.min, Math.ceil(Object.keys((c && c.participants) || {}).length * CRISE.C.seuil));
}
/** Agents engagés chaque soir par une zone dans l'opération commune. */
export function agentsCommune(z, T) {
  // Salle de crise (saison 2) : la coordination libère un agent.
  return Math.max(1, Math.max(CRISE.C.min, Math.ceil((z ? agentsDisponibles(z, T) : 0) * CRISE.C.part)) - (aAnnexe(z, 'crise') ? 1 : 0));
}
/** La zone participe-t-elle ce soir à l'opération commune, d'après ses ordres ? */
export function participeCommune(state, uid, o, T = state.turn) {
  const c = criseCourante(state);
  if (!c || planDuJour(state, T) !== 'C') return false;
  const inscrit = !!(c.participants || {})[uid];
  if (o && o.criseC === 'non') return false;
  if (o && o.criseC === 'oui') return true;
  return inscrit;
}

/** Lecture sûre des choix de crise dans des ordres reçus. */
export function lireOrdresCrise(o) {
  const out = {};
  if (o && Number.isInteger(o.crise) && o.crise >= 0 && o.crise <= 2) out.crise = o.crise;
  if (o && (o.criseC === 'oui' || o.criseC === 'non')) out.criseC = o.criseC;
  return out;
}

/** Retire `n` agents des services, dans le même ordre que la FIPA (et que l'écran des Ordres). */
function prendreDansServices(alloc, n) {
  const pris = {};
  let reste = n;
  for (const s of ['proximite', 'intervention', 'roulage', 'recherche', 'admin']) {
    const k = Math.min(reste, alloc[s] || 0);
    if (k > 0) { pris[s] = k; reste -= k; }
    if (!reste) break;
  }
  return pris;
}

/**
 * Avant la simulation des zones : dépouillement du vote, opération commune de ce soir.
 * Renvoie { prises: { uid: { service: n } } }.
 */
export function crisePre(state, uids, ord, push, T, zoneLabel) {
  const prises = {};
  const c = criseCourante(state);
  if (!c) return { prises };
  // 1. Vote.
  if (c.vote === T && !c.plan) {
    const votants = uids.filter((u) => actif(state.zones[u]));
    const compte = [0, 0, 0];
    const participants = {};
    for (const u of votants) { const v = ord[u] && ord[u].crise; if (Number.isInteger(v)) { compte[v] += talent(state.zones[u], 'porteparole') ? 2 : 1; if (talent(state.zones[u], 'porteparole')) noterChef(state.zones[u], 'porteparole', 'Porte-parole : ta voix a compté double au Conseil.'); if (v === 2) participants[u] = true; } }
    const total = compte.reduce((a, b) => a + b, 0);
    const max = Math.max(...compte);
    const gagnants = [0, 1, 2].filter((i) => compte[i] === max);
    const choix = total === 0 || gagnants.length > 1 ? 1 : gagnants[0];
    c.plan = PLANS[choix].k; c.votes = compte; c.participants = choix === 2 ? participants : {};
    const cr = CRISES[c.id];
    const contre = total - compte[choix];
    const detail = total === 0 ? 'Aucune voix : le Directeur applique le travail discret.' : gagnants.length > 1 ? `Égalité (${compte.join('-')}) : le Directeur tranche pour le travail discret.` : `${compte[choix]} voix contre ${contre}.`;
    for (const u of uids) state.zones[u].rapport.push(`Conseil des chefs (${cr.titre.toLowerCase()}) : plan ${c.plan}, « ${PLANS[choix].nom} », adopté pour 3 jours dès demain. ${detail}${choix === 2 ? (participants[u] ? ' Tu as voté C : tu participes d’office (tu peux te retirer).' : ' Tu peux rejoindre l’opération dans tes ordres.') : ''}`);
    push(9, 'Conseil des chefs', `Décision du Conseil : plan ${c.plan}, ${PLANS[choix].nom.toLowerCase()}`, `${detail} « ${cr.plans[choix]} » pendant 3 jours.`);
  }
  // 2. Opération commune de ce soir.
  if (planDuJour(state, T) === 'C') {
    const presents = [];
    for (const u of uids) {
      const z = state.zones[u];
      if (!participeCommune(state, u, ord[u], T)) continue;
      const n = agentsCommune(z, T);
      prises[u] = prendreDansServices(ord[u].alloc || {}, n);
      presents.push(u);
      c.presences = { ...(c.presences || {}), [u]: ((c.presences || {})[u] || 0) + 1 };
      z.rapport.push(`Opération commune : ${n} de tes agents sur le dispositif du district ce soir.`);
    }
    // Objectif : que les zones qui ont voté C tiennent parole (les zones qui rejoignent comptent aussi).
    const requis = requisCommune(c);
    const ok = presents.length >= requis;
    c.nuits = [...(c.nuits || []), { T, n: presents.length, requis, ok }];
    push(ok ? 6 : 5, 'Opération commune', ok ? `Opération commune : ${presents.length} zones au rendez-vous` : `Opération commune : ${presents.length} zone${presents.length > 1 ? 's' : ''} sur ${requis} requises`, ok ? 'Le dispositif tient ce soir.' : 'Le dispositif est troué ce soir : il faut plus de zones.');
  }
  // Dernier jour du plan : bilan (avant la simulation, pour compter dans l'IPZ du soir).
  if (c.plan && T === c.fin && !c.termine) bilanPlan(state, c, uids, push, zoneLabel);
  return { prises };
}

/** Pendant la simulation de la zone, une fois ses capacités connues : effets du plan du jour. */
export function criseZone(state, z, cap, T) {
  const p = planDuJour(state, T);
  if (!p) return null;
  const c = criseCourante(state);
  if (p === 'A') {
    for (const s of ['intervention', 'roulage', 'proximite']) if (cap[s]) cap[s] *= CRISE.A[s];
    const d = CRISE.A.crimJour + (T === c.debut ? CRISE.A.crimDebut : 0);
    z.criminalite = clamp(z.criminalite + d, 10, 95);
    z.rapport.push(`Plan A du district (opération visible) : ${PLANS[0].plus.split(',').slice(0, 2).join(',')}, Proximité ${pct(CRISE.A.proximite)}, criminalité ${String(d).replace('.', ',').replace('-', '−')}.`);
  }
  if (p === 'B') {
    if (cap.recherche) cap.recherche *= CRISE.B.recherche;
    z.satisfaction += CRISE.B.satisfactionJour;
    z.rapport.push(`Plan B du district (travail discret) : Recherche ${pct(CRISE.B.recherche)}, satisfaction ${String(CRISE.B.satisfactionJour).replace('.', ',')} (la population ne voit rien).`);
  }
  return p;
}

function bilanPlan(state, c, uids, push, zoneLabel) {
  {
    if (c.plan === 'C') {
      const reussies = (c.nuits || []).filter((x) => x.ok).length;
      const ok = reussies >= CRISE.C.nuitsOk;
      const g = CRISE.C.gain;
      const recompenses = [];
      for (const u of uids) {
        const z = state.zones[u];
        const pres = (c.presences || {})[u] || 0;
        if (ok) z.criminalite = clamp(z.criminalite + (pres >= CRISE.C.nuitsOk ? CRISE.C.crimParticipants : CRISE.C.crimDistrict), 10, 95);
        if (ok && pres >= CRISE.C.nuitsOk) {
          z._points += g.points; z.reputation += g.reputation; z.satisfaction += g.satisfaction; z._psEntraide = (z._psEntraide || 0) + g.ps;
          z.stats.operationsCommunes = (z.stats.operationsCommunes || 0) + 1;
          recompenses.push(zoneLabel(z));
          z.rapport.push(`Opération commune réussie (${reussies} soirs sur 3) : +${g.points} pts, +${g.reputation} de réputation, +${g.satisfaction} de satisfaction, +${g.ps} PS d’entraide, criminalité −${Math.abs(CRISE.C.crimParticipants)} chez toi.`);
        } else if (ok) z.rapport.push(`Opération commune réussie sans toi : criminalité −${Math.abs(CRISE.C.crimDistrict)} chez toi.`);
        else if (pres) z.rapport.push(`Opération commune ratée (${reussies} soir${reussies > 1 ? 's' : ''} réussi${reussies > 1 ? 's' : ''} sur 3) : pas assez de zones au rendez-vous.`);
      }
      push(ok ? 10 : 7, 'Conseil des chefs', ok ? 'L’opération commune porte ses fruits' : 'L’opération commune tourne court', ok ? `${recompenses.length} zones récompensées : ${recompenses.join(', ')}.` : `${reussies} soir${reussies > 1 ? 's' : ''} sur 3 avec assez de zones. Il en fallait ${CRISE.C.nuitsOk}.`);
    } else push(5, 'Conseil des chefs', `Fin du plan ${c.plan} : ${PLANS[c.plan === 'A' ? 0 : 1].nom.toLowerCase()}`, 'Le district reprend son rythme normal.');
    c.termine = true;
  }
}

/** Après la simulation : annonce de la crise suivante (le bilan est fait avant la simulation du dernier soir). */
export function crisePost(state, uids, push, T, zoneLabel) {
  if (!CRISE.actif) return;
  const c = criseCourante(state);
  const libre = !c || (c.termine && T >= c.fin + CRISE.pause) || (!c.plan && c.vote < T);
  const actives = uids.filter((u) => actif(state.zones[u])).length;
  if (libre && T >= CRISE.premierAnnonce && T + 1 + CRISE.duree <= SEASON_LENGTH && actives >= CRISE.zonesMin) {
    const id = choisirCrise(state, uids, c && c.id);
    const n = ((c && c.n) || 0) + 1;
    state.crise = { season: state.season, n, id, annonce: T, vote: T + 1, debut: T + 2, fin: T + 1 + CRISE.duree, plan: null };
    push(8, 'Conseil des chefs', CRISES[id].titre, `${CRISES[id].texte} Le Conseil des chefs vote demain : opération visible, travail discret ou opération commune. Une voix par zone, résultat à 20:00.`);
  }
}

/** Le Directeur choisit la crise d'après l'état réel du district (pas deux fois la même de suite). */
function choisirCrise(state, uids, derniere) {
  const zs = uids.map((u) => state.zones[u]).filter(actif);
  const moy = (f) => (zs.length ? zs.reduce((s, z) => s + f(z), 0) / zs.length : 0);
  const rng = makeRng(`${state.seed}:s${state.season}:t${state.turn}:crise`);
  const score = {
    cambriolages: moy((z) => (z.dossiers || []).length) / 3,
    rodeos: 1 - moy((z) => ((z.dernierOrdre && z.dernierOrdre.alloc && z.dernierOrdre.alloc.roulage) || 2) / 4),
    deal: (moy((z) => z.criminalite) - 40) / 20,
    violences: moy((z) => (z.stats.incidents ? 1 - z.stats.traites / z.stats.incidents : 0)) * 4,
  };
  const bruit = Object.fromEntries(Object.keys(CRISES).map((k) => [k, rng.float(0, 0.4)]));
  const ids = Object.keys(CRISES).filter((k) => k !== derniere).sort((a, b) => (score[b] + bruit[b]) - (score[a] + bruit[a]));
  return ids[0];
}
