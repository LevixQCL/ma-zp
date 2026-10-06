// Flotte : chaque véhicule a son modèle et son propre état (usure).
// z.flotte = [{ m: modèle, u: usure en %, km: interventions, achat: tour }] ; l'indice est la place (`slot`)
// utilisée par les véhicules cabossés (`z.cabosses`) et immobilisés (`z.vehiculesHS`).
// Pour le reste du moteur, `z.vehicules` (nombre) et `z.usure` (usure moyenne) restent tenus à jour par `syncFlotte`.
import { USURE, PREPA, START, BATIMENTS } from './constants.js';

/**
 * Catalogue. `vitesse`, `accel`, `maniab`, `frein` : multiplicateurs sur les urgences (mini-jeu « Bitonal ») ;
 * `places` : agents d'Intervention emmenés pleinement (au-delà, à moitié) ; `usure` : multiplicateur de l'usure ;
 * `entretien` : k€ par tour ; `pv` : accrochages encaissés avant d'être hors service sur une urgence.
 * Calibrage : test/flotte-sim.mjs.
 */
export const MODELES = {
  diesel: { nom: 'Combi diesel', court: 'Combi', type: 'combi', prix: 6, vitesse: 1, accel: 1, maniab: 1, frein: 1, places: 2.5, usure: 1, entretien: 0.2, pv: 3,
    role: 'Polyvalente, la moins chère',
    texte: 'Le cheval de bataille : 2,5 places, le meilleur prix par place. Chaque place libre après l’Intervention met un agent de Roulage ou de Proximité en voiture.' },
  electrique: { nom: 'Combi électrique', court: 'Électrique', type: 'electrique', prix: 9, vitesse: 1.06, accel: 1.25, maniab: 0.85, frein: 0.92, places: 2.5, usure: 0.6, entretien: 0.1, pv: 3, recharge: 1.5,
    role: 'Se rembourse : prime verte',
    texte: 'La commune verse une prime « plan climat » chaque jour (3 électriques au plus), l’entretien est moitié prix et elle s’use moins : elle se rembourse en une saison. Plus vive sur les urgences, mais plus lourde (change de voie et freine moins bien). En rythme renforcé, la recharge la limite à 1,5 place.' },
  anonyme: { nom: 'Voiture anonymisée', court: 'Anonyme', type: 'anonyme', prix: 7, vitesse: 1.05, accel: 1.1, maniab: 1.15, frein: 1.05, places: 2, usure: 1, entretien: 0.15, pv: 3, recherche: 0.05, discrete: 0.65,
    role: 'Filatures : flagrants et traques',
    texte: 'Planques en voiture banalisée : la jauge de flagrant délit monte chaque soir, +5 % de Recherche, et pendant une traque elle surveille une deuxième planque. Vive et maniable, mais sans marquage on la remarque tard sur les urgences. 2 places seulement.' },
  fourgon: { nom: 'Fourgon d’intervention', court: 'Fourgon', type: 'fourgon', prix: 10, vitesse: 0.95, accel: 0.9, maniab: 0.9, frein: 0.95, places: 3.5, usure: 0.8, entretien: 0.3, pv: 4, protection: 0.1,
    role: 'Maintien de l’ordre : engagements',
    texte: 'Un peloton entier à bord : force des engagements (affaires disputées, zone de non-droit) majorée, 3,5 places, −10 % de risque de blessure. Lourd et lent sur les urgences, mais encaisse un accrochage de plus.' },
};
export const IDS_MODELES = Object.keys(MODELES);
export const modeleDe = (v) => MODELES[v && v.m] || MODELES.diesel;

/**
 * Ce que rapporte la flotte, au-delà des places de l'Intervention (calibrage : test/vehicule-valeur-sim.mjs).
 * - `monte` : un agent de Roulage ou de Proximité qui a une place libre dans un véhicule travaille +X %
 *   (contrôles mobiles, patrouilles motorisées). Les places vont d'abord à l'Intervention, puis au Roulage, puis à la Proximité.
 *   À pied, ils travaillent comme avant : pas de malus, seulement un bonus.
 * - `verte` : prime communale « plan climat » par véhicule électrique (k€ par tour), `verteMax` au plus.
 * - `filature` : jauge de flagrant délit remplie chaque soir par voiture anonymisée en service, `filatureMax` au plus ;
 *   et une anonyme en service permet d'interpeller en traque avec `traque` agent de moins.
 * - `ordre` : force des engagements (affaires disputées, zone de non-droit) par fourgon en service, `ordreMax` au plus.
 */
export const RENDEMENT = { monte: 0.4, verte: 0.45, verteMax: 3, filature: 0.12, filatureMax: 0.24, traque: 1, ordre: 0.12, ordreMax: 0.24 };

/** Revente : part du prix selon l'état (60 % neuf, 15 % au minimum), −30 % si cabossé. */
export const REVENTE = { part: 0.6, plancher: 0.15, cabosse: 0.7 };

/** Crée la flotte d'une zone qui n'en a pas (anciennes parties : tous en combis diesel, à l'usure commune). */
export function assurerFlotte(z) {
  if (!z) return z;
  if (!Array.isArray(z.flotte)) {
    const n = Math.max(0, z.vehicules || 0), u = Math.max(0, z.usure || 0);
    z.flotte = Array.from({ length: n }, () => ({ m: 'diesel', u, km: 0, achat: 0 }));
  }
  return syncFlotte(z);
}

/** Recalcule le nombre de véhicules et l'usure moyenne (lus partout ailleurs). */
export function syncFlotte(z) {
  const f = z.flotte || [];
  for (const v of f) v.u = Math.round(Math.max(0, Math.min(USURE.max, v.u || 0)) * 10) / 10;
  z.vehicules = f.length;
  z.usure = f.length ? Math.round((f.reduce((s, v) => s + v.u, 0) / f.length) * 10) / 10 : 0;
  return z;
}

/** Ajoute un véhicule neuf (achat, enchère, saisie). Renvoie sa place. */
export function ajouterVehicule(z, m = 'diesel', T = 0, u = 0) {
  assurerFlotte(z);
  z.flotte.push({ m: MODELES[m] ? m : 'diesel', u, km: 0, achat: T });
  syncFlotte(z);
  return z.flotte.length - 1;
}

/** Retire le véhicule d'une place (perte totale, revente) et décale les places des cabossés et immobilisés. */
export function retirerVehicule(z, slot) {
  assurerFlotte(z);
  if (!(slot >= 0 && slot < z.flotte.length)) return null;
  const [v] = z.flotte.splice(slot, 1);
  const decale = (l) => (l || []).filter((x) => x.slot !== slot).map((x) => (x.slot != null && x.slot > slot ? { ...x, slot: x.slot - 1 } : x));
  z.cabosses = decale(z.cabosses);
  z.vehiculesHS = decale(z.vehiculesHS);
  syncFlotte(z);
  return v;
}

/** Place du véhicule le plus usé (perte totale d'un accident : c'est lui qui lâche). */
export const plusUse = (z) => (z.flotte || []).reduce((b, v, i, f) => (b < 0 || v.u > f[b].u ? i : b), -1);

/** Usure ajoutée à un véhicule (ou à tous s'il n'est pas précisé), selon son modèle. */
export function user(z, slot, pts) {
  assurerFlotte(z);
  for (const [i, v] of z.flotte.entries()) if (slot == null || i === slot) v.u += pts * modeleDe(v).usure;
  syncFlotte(z);
}

/** Usure du tour : chaque véhicule s'use un peu, plus selon les interventions (partagées entre les véhicules). */
export function usureDuTour(z, traites, garage) {
  assurerFlotte(z);
  const n = Math.max(1, z.flotte.length);
  for (const v of z.flotte) {
    v.u += (USURE.parTour + traites * USURE.parIntervention / n) * (garage ? 0.5 : 1) * modeleDe(v).usure;
    v.km = (v.km || 0) + traites / n;
  }
  syncFlotte(z);
}

/** Révision du parc : chaque véhicule regagne `pts` % d'état. */
export function reviser(z, pts) {
  assurerFlotte(z);
  for (const v of z.flotte) v.u -= pts;
  syncFlotte(z);
}

/** Prix de revente d'un véhicule (k€). */
export function prixRevente(z, slot) {
  const v = z.flotte && z.flotte[slot];
  if (!v) return 0;
  const m = modeleDe(v), etat = 100 - (v.u || 0);
  const cab = (z.cabosses || []).some((c) => c.slot === slot);
  return Math.round(m.prix * Math.max(REVENTE.plancher, REVENTE.part * etat / 100) * (cab ? REVENTE.cabosse : 1) * 10) / 10;
}

/** Places immobilisées au tour T (atelier), y compris celles sans place précise (rangées sur les dernières places libres). */
export function placesAtelier(z, T) {
  const n = (z.flotte || []).length;
  const hs = (z.vehiculesHS || []).filter((v) => v.retour > T);
  const prises = new Set();
  for (const h of hs) if (h.slot != null && h.slot < n && !prises.has(h.slot)) prises.add(h.slot);
  // Sans place : les véhicules les plus usés.
  const sans = hs.filter((h) => h.slot == null || h.slot >= n).length;
  const ordre = (z.flotte || []).map((v, i) => i).filter((i) => !prises.has(i)).sort((a, b) => z.flotte[b].u - z.flotte[a].u);
  for (let k = 0; k < sans && k < ordre.length; k++) prises.add(ordre[k]);
  return prises;
}

/** Agents d'Intervention emmenés pleinement par les véhicules en service (électriques limitées en rythme renforcé). */
export function placesIntervention(z, T = 0, rythme = 'normal') {
  assurerFlotte(z);
  const hs = placesAtelier(z, T);
  return z.flotte.reduce((s, v, i) => {
    if (hs.has(i)) return s;
    const m = modeleDe(v);
    return s + (rythme === 'renforce' && m.recharge ? m.recharge : m.places);
  }, 0);
}

/** Entretien du parc par tour (k€). */
export const entretienFlotte = (z) => Math.round((z.flotte || []).reduce((s, v) => s + modeleDe(v).entretien, 0) * 100) / 100;

/** Bonus de Recherche des voitures anonymisées en service (filatures). */
export function bonusAnonymes(z, T = 0) {
  const hs = placesAtelier(z, T);
  const n = (z.flotte || []).filter((v, i) => v.m === 'anonyme' && !hs.has(i)).length;
  return Math.min(0.1, n * MODELES.anonyme.recherche);
}
/** Protection des fourgons : multiplicateur du risque de blessure. */
export function protectionFourgons(z) {
  const n = (z.flotte || []).filter((v) => v.m === 'fourgon').length;
  return 1 - Math.min(0.2, n * MODELES.fourgon.protection);
}

/**
 * Ce qu'un véhicule donne sur une urgence : vitesse de pointe (état du véhicule, cabossé, préparation, modèle),
 * accélération, maniabilité, freinage, accrochages encaissés.
 */
export function vitesseVehicule(z, slot) {
  assurerFlotte(z);
  const v = z.flotte[slot];
  if (!v) return null;
  const m = modeleDe(v);
  const etat = Math.round(100 - (v.u || 0));
  const cabosse = (z.cabosses || []).some((c) => c.slot === slot);
  const prepa = Math.max(0, Math.min(PREPA.max, z.prepa || 0));
  const r3 = (x) => Math.round(x * 1000) / 1000;
  return {
    slot, m: v.m, etat, cabosse, prepa, pv: m.pv,
    mult: r3((0.8 + 0.2 * etat / 100) * (cabosse ? 0.94 : 1) * (1 + PREPA.vitesse * prepa) * m.vitesse),
    frein: r3((1 + PREPA.frein * prepa) * m.frein), accel: m.accel, maniab: m.maniab,
  };
}

/** Le véhicule le plus rapide en service (affichage du parc, entraînement). */
export function vitesseCombi(z, T = 0) {
  if (!z) return { slot: -1, m: 'diesel', etat: 100, cabosse: false, prepa: 0, pv: 3, mult: 1, frein: 1, accel: 1, maniab: 1 };
  assurerFlotte(z);
  const hs = placesAtelier(z, T);
  const l = z.flotte.map((_, i) => i).filter((i) => !hs.has(i)).map((i) => vitesseVehicule(z, i));
  return l.sort((a, b) => b.mult - a.mult)[0] || vitesseVehicule(z, 0) || vitesseCombi(null);
}
/** Véhicules disponibles pour une urgence (en service), du plus rapide au plus lent. */
export function vehiculesUrgence(z, T = 0) {
  assurerFlotte(z);
  const hs = placesAtelier(z, T);
  return z.flotte.map((_, i) => i).filter((i) => !hs.has(i)).map((i) => vitesseVehicule(z, i)).sort((a, b) => b.mult - a.mult);
}

/** Véhicules en service (hors atelier) d'un modèle. */
export function enService(z, m, T = 0) {
  assurerFlotte(z);
  const hs = placesAtelier(z, T);
  return z.flotte.filter((v, i) => (!m || v.m === m) && !hs.has(i)).length;
}

/**
 * Agents de Roulage et de Proximité qui ont une place dans un véhicule (après l'équipage de l'Intervention).
 * `alloc` : agents par service ; renvoie { libres, roulage, proximite }.
 */
export function agentsMontes(z, alloc = {}, T = 0, rythme = 'normal') {
  if (!z || !z.flotte) return { libres: 0, roulage: 0, proximite: 0 };
  let libres = Math.max(0, placesIntervention(z, T, rythme) - (alloc.intervention || 0));
  const out = { libres: Math.round(libres * 10) / 10, roulage: 0, proximite: 0 };
  for (const s of ['roulage', 'proximite']) {
    const n = Math.min(libres, Math.max(0, alloc[s] || 0));
    out[s] = Math.round(n * 10) / 10; libres -= n;
  }
  return out;
}
/** Prime verte communale (k€ par tour) pour les électriques du parc. */
export const primeVerte = (z) => Math.round(Math.min(RENDEMENT.verteMax, (z.flotte || []).filter((v) => v.m === 'electrique').length) * RENDEMENT.verte * 100) / 100;
/** Jauge de flagrant délit ajoutée chaque soir par les anonymes en service (planques en voiture banalisée). */
export const bonusFilature = (z, T = 0) => Math.min(RENDEMENT.filatureMax, enService(z, 'anonyme', T) * RENDEMENT.filature);
/** Force des engagements apportée par les fourgons (multiplicateur). */
export function bonusOrdre(z, T) {
  if (!z || !z.flotte) return 1;
  const n = T == null ? z.flotte.filter((v) => v.m === 'fourgon').length : enService(z, 'fourgon', T);
  return 1 + Math.min(RENDEMENT.ordreMax, n * RENDEMENT.ordre);
}

/**
 * Bilan lisible de ce que rapporte la flotte (panneau du parc, rapport du soir).
 * `alloc` : répartition prévue (ou celle de la veille).
 */
export function rendementFlotte(z, alloc = {}, T = 0, rythme = 'normal') {
  assurerFlotte(z);
  const m = agentsMontes(z, alloc, T, rythme);
  return {
    places: Math.round(placesIntervention(z, T, rythme) * 10) / 10,
    intervention: alloc.intervention || 0,
    montes: m,
    gainMonte: Math.round((m.roulage + m.proximite) * RENDEMENT.monte * 10) / 10,
    verte: primeVerte(z),
    filature: Math.round(bonusFilature(z, T) * 100),
    traque: enService(z, 'anonyme', T) > 0,
    ordre: Math.round((bonusOrdre(z, T) - 1) * 100),
    recherche: Math.round(bonusAnonymes(z, T) * 100),
    protection: Math.round((1 - protectionFourgons(z)) * 100),
    entretien: entretienFlotte(z),
  };
}

/**
 * Ce qu'un véhicule de plus apporterait aujourd'hui (fiche d'achat) : une liste de phrases courtes.
 * `alloc` : répartition prévue.
 */
export function apportAchat(z, m, alloc = {}, T = 0, rythme = 'normal', reprise = null) {
  assurerFlotte(z);
  const M = MODELES[m] || MODELES.diesel;
  const neuf = { m, u: 0, km: 0, achat: T };
  const z2 = reprise != null && z.flotte[reprise]
    ? { ...z, flotte: z.flotte.map((v, i) => (i === reprise ? neuf : v)), cabosses: (z.cabosses || []).filter((x) => x.slot !== reprise), vehiculesHS: (z.vehiculesHS || []).filter((x) => x.slot !== reprise) }
    : { ...z, flotte: [...z.flotte, neuf] };
  const f1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  const a = agentsMontes(z, alloc, T, rythme), b = agentsMontes(z2, alloc, T, rythme);
  const dI = Math.max(0, Math.min(alloc.intervention || 0, placesIntervention(z2, T, rythme)) - Math.min(alloc.intervention || 0, placesIntervention(z, T, rythme)));
  const dM = Math.round((b.roulage + b.proximite - a.roulage - a.proximite) * 10) / 10;
  const out = [];
  if (dI > 0) out.push(`${f1(dI)} agent${dI > 1 ? 's' : ''} d’Intervention de plus à bord (ils travaillaient à moitié faute de place)`);
  if (dM > 0) out.push(`${f1(dM)} agent${dM > 1 ? 's' : ''} de Roulage ou de Proximité en voiture : +${Math.round(RENDEMENT.monte * 100)} % chacun${b.roulage > a.roulage ? ` (dont ${f1(b.roulage - a.roulage)} au Roulage : plus d’amendes)` : ''}`);
  const perdu = Math.round((a.roulage + a.proximite - b.roulage - b.proximite) * 10) / 10;
  if (perdu > 0) out.push(`${f1(perdu)} agent${perdu > 1 ? 's' : ''} de moins en voiture (moins de places que le véhicule repris)`);
  if (!dI && !dM && !(perdu > 0)) out.push(reprise != null ? 'autant de places utiles qu’avant' : 'aucune place utile aujourd’hui : tout le monde a déjà un véhicule (mets plus d’agents en Roulage ou en Proximité, ou recrute)');
  if (m === 'electrique') { const v = primeVerte(z2) - primeVerte(z); out.push(v > 0 ? `prime verte +${f1(v)} k€ par jour` : `prime verte déjà au maximum (${RENDEMENT.verteMax} électriques)`); }
  if (m === 'anonyme') { const v = bonusFilature(z2, T) - bonusFilature(z, T); out.push(v > 0 ? `jauge de flagrant délit +${Math.round(v * 100)} % chaque soir` : 'flagrants : déjà au maximum (2 anonymes)'); if (!enService(z, 'anonyme', T)) out.push('traque : surveille une deuxième planque'); }
  if (m === 'fourgon') { const v = bonusOrdre(z2, T) - bonusOrdre(z, T); out.push(v > 0 ? `force des engagements +${Math.round(v * 100)} %` : 'engagements : déjà au maximum (2 fourgons)'); }
  out.push(`entretien ${f1(M.entretien)} k€ par jour`);
  return out;
}

/**
 * Nouvelle saison : `nz` (zone neuve, garage déjà baissé d'un niveau) reprend le parc de `z`.
 * Les véhicules gardent leur modèle ; usure divisée par deux (contrôle technique), plus de cabossés ni d'atelier.
 * Faute de place au garage, les plus usés sont revendus (prix de revente, sans malus de carrosserie) au profit du budget.
 * Toujours au moins START.vehicules véhicules (complétés en combis diesel). Renvoie { gardes, vendus, produit }.
 */
export function heritageFlotte(z, nz) {
  const places = BATIMENTS.garage.capacite((nz.batiments && nz.batiments.garage) || 1);
  const ancien = Array.isArray(z.flotte) ? z.flotte.filter((v) => v && MODELES[v.m]) : [];
  const tri = ancien.map((v) => ({ m: v.m, u: v.u || 0, km: v.km || 0 })).sort((a, b) => a.u - b.u);
  const gardes = tri.slice(0, places), vendus = tri.slice(places);
  const produit = Math.round(vendus.reduce((s, v) => s + MODELES[v.m].prix * Math.max(REVENTE.plancher, REVENTE.part * (100 - v.u) / 100), 0) * 10) / 10;
  nz.flotte = gardes.map((v) => ({ m: v.m, u: Math.round(v.u / 2 * 10) / 10, km: Math.round(v.km), achat: 0 }));
  while (nz.flotte.length < START.vehicules) nz.flotte.push({ m: 'diesel', u: 0, km: 0, achat: 0 });
  nz.cabosses = []; nz.vehiculesHS = [];
  nz.budget = Math.round(((nz.budget || 0) + produit) * 10) / 10;
  syncFlotte(nz);
  return { gardes: nz.flotte.length, vendus: vendus.length, produit };
}

/** Achat avec reprise : le nouveau véhicule prend la place de l'ancien (mêmes numéros de place pour le reste du parc). Renvoie le prix de reprise. */
export function remplacerVehicule(z, slot, m = 'diesel', T = 0) {
  assurerFlotte(z);
  if (!(slot >= 0 && slot < z.flotte.length)) { ajouterVehicule(z, m, T); return 0; }
  const prix = prixRevente(z, slot);
  z.flotte[slot] = { m: MODELES[m] ? m : 'diesel', u: 0, km: 0, achat: T };
  z.cabosses = (z.cabosses || []).filter((x) => x.slot !== slot);
  z.vehiculesHS = (z.vehiculesHS || []).filter((x) => x.slot !== slot);
  syncFlotte(z);
  return prix;
}
/** Place reprise par défaut quand le garage est plein : le véhicule le plus usé. */
export const repriseParDefaut = plusUse;
