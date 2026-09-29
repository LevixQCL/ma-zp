// Salle des ventes : un lot par jour, offres secrètes dans les ordres, résolues à 20:00.
// Le plus offrant l'emporte et paie son offre ; à égalité, la meilleure réputation gagne.
import { SERVICES, SERVICE_LABELS, ENCHERE, LOTS, NIVEAU_MAX } from './constants.js';
import { makeRng } from './rng.js';
import { round1, sousTutelle } from './zone.js';
import { absT } from './rivalites.js';

const nomZone = (z) => `ZP ${z.code} ${z.nom}`;
const fmt1 = (v) => String(round1(v)).replace('.', ',');

/** Raison pour laquelle une zone ne peut pas enchérir sur le lot en cours (null si elle peut). */
export function encherePossible(state, z, T = state.turn) {
  const e = state.enchere;
  if (!e || e.tour !== T) return 'Pas de lot en vente aujourd’hui';
  if (sousTutelle(z, T)) return 'Zone sous tutelle : pas d’enchères';
  const lot = LOTS[e.lot];
  if (lot && lot.reserve && z.reputation < ENCHERE.repReserve) return `Lot réservé aux zones de réputation ${ENCHERE.repReserve} ou plus`;
  const depuis = absT(state, T) - (z.derniereEnchere ?? -99);
  if (depuis < ENCHERE.delaiGain) return `Tu as déjà remporté un lot il y a ${depuis} tour${depuis > 1 ? 's' : ''} : attends ${ENCHERE.delaiGain - depuis} tour${ENCHERE.delaiGain - depuis > 1 ? 's' : ''}`;
  return null;
}

/** Tire le lot mis en vente au tour `state.turn` (déterministe). */
export function annoncerLot(state) {
  const T = state.turn;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:enchere`);
  const recents = (state.lotsRecents || []).slice(-3);
  const ids = Object.keys(LOTS).filter((id) => !recents.includes(id));
  const reserves = ids.filter((id) => LOTS[id].reserve), ouverts = ids.filter((id) => !LOTS[id].reserve);
  const pool = reserves.length && rng.chance(ENCHERE.partReserve) ? reserves : ouverts;
  const lot = rng.pick(pool);
  const prixMin = Math.max(2, LOTS[lot].prix + rng.int(-1, 1));
  state.lotsRecents = [...recents, lot];
  state.enchere = { id: `e${state.season}-${T}`, lot, tour: T, prixMin };
  return state.enchere;
}

/** Donne le lot au gagnant. Renvoie le texte du rapport. */
function livrer(z, id, T) {
  const lot = LOTS[id];
  if (lot.bonus) z.lots = [...(z.lots || []), { id, tour: T }];
  switch (lot.immediat) {
    case 'paperasse': z.paperasse = Math.max(0, z.paperasse - 6); break;
    case 'vehicule': z.usure = z.usure * z.vehicules / (z.vehicules + 1); z.vehicules += 1; break;
    case 'prevention': z.criminalite = Math.max(10, z.criminalite - 10); z.satisfaction += 4; break;
    case 'agents': z.agents += 2; break;
    case 'stage': {
      const s = SERVICES.filter((x) => z.niveaux[x] < NIVEAU_MAX).sort((a, b) => z.niveaux[a] - z.niveaux[b])[0];
      if (!s) return 'toutes tes formations sont déjà au maximum, le stage ne sert à rien';
      z.niveaux[s] += 1; return `${SERVICE_LABELS[s]} passe au niveau ${z.niveaux[s]}`;
    }
    case 'gilets':
      if (z.equip.intervention >= NIVEAU_MAX) return 'ton équipement d’Intervention était déjà au maximum';
      z.equip.intervention += 1; return `équipement de l’Intervention au niveau ${z.equip.intervention}`;
    default: break;
  }
  return lot.effet.charAt(0).toLowerCase() + lot.effet.slice(1);
}

/**
 * Résout la vente du jour (avant la simulation des zones, pour que le lot serve dès ce soir).
 * Renvoie le résultat pour la Gazette, ou null s'il n'y avait pas de vente.
 */
export function encheresResoudre(state, uids, ord, push, T) {
  const e = state.enchere;
  if (!e || e.tour !== T || !LOTS[e.lot]) return null;
  const lot = LOTS[e.lot];
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:enchere:resolution`);
  const offres = [];
  for (const u of uids) {
    const o = ord[u].offre;
    if (!o || o.id !== e.id) continue;
    const z = state.zones[u];
    const refus = encherePossible(state, z, T);
    if (refus) { z.rapport.push(`Salle des ventes : offre refusée (${refus.toLowerCase()}).`); continue; }
    if (o.montant < e.prixMin) { z.rapport.push(`Salle des ventes : offre de ${o.montant} k€ sous la mise à prix (${e.prixMin} k€), refusée.`); continue; }
    if (o.montant > z.budget) { z.rapport.push(`Salle des ventes : offre de ${o.montant} k€ refusée, ton budget (${fmt1(z.budget)} k€) ne la couvre pas.`); continue; }
    offres.push({ u, montant: o.montant, rep: z.reputation, tirage: rng.next() });
  }
  const res = { lot: e.lot, nom: lot.nom, prixMin: e.prixMin, offres: offres.length, tour: T };
  if (!offres.length) {
    push(2, 'Salle des ventes', `Personne n’a voulu du lot « ${lot.nom} »`, `Mise à prix : ${e.prixMin} k€. Il repart au dépôt.`);
    state.enchereResultat = res;
    return res;
  }
  offres.sort((a, b) => (b.montant - a.montant) || (b.rep - a.rep) || (a.tirage - b.tirage));
  const g = offres[0];
  const z = state.zones[g.u];
  const egalite = offres[1] && offres[1].montant === g.montant;
  z.budget -= g.montant;
  (z._compta ||= []).push({ k: 'enchere', l: `Salle des ventes : ${lot.nom}`, v: -g.montant });
  z.derniereEnchere = absT(state, T);
  z.stats.encheres = (z.stats.encheres || 0) + 1;
  const quoi = livrer(z, e.lot, T);
  z.rapport.push(`Salle des ventes : tu remportes « ${lot.nom} » pour ${g.montant} k€${egalite ? ' (à égalité, ta réputation a fait la différence)' : ''} : ${quoi}.`);
  for (const x of offres.slice(1)) state.zones[x.u].rapport.push(`Salle des ventes : « ${lot.nom} » part chez ${nomZone(z)} pour ${g.montant} k€ (ton offre : ${x.montant} k€). Rien n’est débité.`);
  push(offres.length > 1 ? 5 : 3, 'Salle des ventes', `${nomZone(z)} remporte « ${lot.nom} » pour ${g.montant} k€`,
    `${offres.length} offre${offres.length > 1 ? 's' : ''} déposée${offres.length > 1 ? 's' : ''}, mise à prix ${e.prixMin} k€.${egalite ? ' Égalité départagée à la réputation.' : ''}`, g.u);
  Object.assign(res, { gagnant: g.u, montant: g.montant, egalite });
  state.enchereResultat = res;
  return res;
}
