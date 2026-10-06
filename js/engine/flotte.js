// Flotte : chaque véhicule a son modèle et son propre état (usure).
// z.flotte = [{ m: modèle, u: usure en %, km: interventions, achat: tour }] ; l'indice est la place (`slot`)
// utilisée par les véhicules cabossés (`z.cabosses`) et immobilisés (`z.vehiculesHS`).
// Pour le reste du moteur, `z.vehicules` (nombre) et `z.usure` (usure moyenne) restent tenus à jour par `syncFlotte`.
import { USURE, PREPA } from './constants.js';

/**
 * Catalogue. `vitesse`, `accel`, `maniab`, `frein` : multiplicateurs sur les urgences (mini-jeu « Bitonal ») ;
 * `places` : agents d'Intervention emmenés pleinement (au-delà, à moitié) ; `usure` : multiplicateur de l'usure ;
 * `entretien` : k€ par tour ; `pv` : accrochages encaissés avant d'être hors service sur une urgence.
 * Calibrage : test/flotte-sim.mjs.
 */
export const MODELES = {
  diesel: { nom: 'Combi diesel', court: 'Combi', type: 'combi', prix: 6, vitesse: 1, accel: 1, maniab: 1, frein: 1, places: 2.5, usure: 1, entretien: 0.2, pv: 3,
    texte: 'Le cheval de bataille : 2,5 agents à bord, rien d’exceptionnel.' },
  electrique: { nom: 'Combi électrique', court: 'Électrique', type: 'electrique', prix: 9, vitesse: 1.06, accel: 1.25, maniab: 0.85, frein: 0.92, places: 2.5, usure: 0.6, entretien: 0.1, pv: 3, recharge: 1.5,
    texte: 'Plus vive et plus rapide, s’use moins, coûte peu à l’entretien. Plus lourde : change de voie et freine moins bien. En rythme renforcé, la recharge la limite à 1,5 agent.' },
  anonyme: { nom: 'Voiture anonymisée', court: 'Anonyme', type: 'anonyme', prix: 7, vitesse: 1.05, accel: 1.1, maniab: 1.15, frein: 1.05, places: 2, usure: 1, entretien: 0.15, pv: 3, recherche: 0.05, discrete: 0.65,
    texte: 'Vive et maniable, discrète pour les filatures (+5 % de Recherche chacune, +10 % au plus). Mais sans marquage, on la remarque tard : les voitures s’écartent plus tard. N’emmène que 2 agents.' },
  fourgon: { nom: 'Fourgon d’intervention', court: 'Fourgon', type: 'fourgon', prix: 10, vitesse: 0.95, accel: 0.9, maniab: 0.9, frein: 0.95, places: 3.5, usure: 0.8, entretien: 0.3, pv: 4, protection: 0.1,
    texte: 'Lourd et lent, mais 3,5 agents à bord, encaisse un accrochage de plus, et protège : −10 % de risque de blessure chacun (−20 % au plus).' },
};
export const IDS_MODELES = Object.keys(MODELES);
export const modeleDe = (v) => MODELES[v && v.m] || MODELES.diesel;

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
