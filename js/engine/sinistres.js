// Sinistralité du parc : accidents de véhicules de service.
// Le risque dépend de la façon dont la zone roule (interventions du jour, état du parc, rythme,
// moral, équipages entassés) ; la gravité décide de la suite :
//  - accrochage : le véhicule roule cabossé. Il sert encore, mais abîme l'image de la zone
//    chaque tour tant qu'il n'est pas passé en carrosserie (et finit en photo sur les réseaux) ;
//  - sinistre total : le véhicule est perdu, il faut en racheter un. Si le tiers est en tort,
//    son assurance rembourse une partie deux tours plus tard ; si la zone est en tort, rien,
//    mais un rapport de sinistre et de la réputation en moins ;
//  - accident grave : sinistre total et un agent blessé.
import { COUTS } from './constants.js';
import { placeLibre, cabossesChoisis } from './parc.js';
import { retirerVehicule, plusUse, assurerFlotte } from './flotte.js';

export const SINISTRE = {
  base: 0.02,             // risque de base par tour
  parIntervention: 0.004, // + par intervention traitée
  usure: 0.1,             // + usure du parc (0 à 70 %) × 0,1 → jusqu'à +7 %
  renforce: 0.03,         // rythme renforcé : on roule vite et fatigué
  moralBas: 0.02,         // moral sous 40
  surcharge: 0.02,        // plus de 2,5 agents d'Intervention par véhicule disponible
  formation: 0.08,        // −8 % du risque par niveau d'Intervention au-delà de 1
  atelier: 0.8,           // atelier mécanique : −20 % (freins, pneus suivis)
  max: 0.25,
  poids: { accrochage: 55, total: 30, grave: 15 },
  carrosserie: 1.5,       // k€ par véhicule cabossé (moitié prix avec l'atelier)
  grace: 1,               // tours sans effet sur l'image après l'accrochage
  imageSatisfaction: 1,   // par véhicule cabossé et par tour (au plus 3)
  imageReputation: 1,
  virale: 3,              // tours cabossé avant la photo sur les réseaux
  viraleReputation: 3,
  indemnite: 0.7,         // part du prix d'un véhicule remboursée par l'assureur du tiers
  delaiIndemnite: 2,
  tortBase: 0.35,
};

/** Probabilité d'un accident ce tour, avec le détail des facteurs (pour l'affichage). */
export function risqueAccident(z, { traites = 0, rythme = 'normal', interventionAgents = 0, vehiculesDispo = z.vehicules } = {}) {
  const f = [];
  let p = SINISTRE.base;
  const add = (v, l) => { if (v > 0) { p += v; f.push(l); } };
  add(traites * SINISTRE.parIntervention, `${traites} intervention${traites > 1 ? 's' : ''}`);
  add((z.usure || 0) / 100 * SINISTRE.usure, `parc usé à ${Math.round(z.usure || 0)} %`);
  if (rythme === 'renforce') add(SINISTRE.renforce, 'rythme renforcé');
  if (z.moral < 40) add(SINISTRE.moralBas, 'moral bas');
  if (interventionAgents > Math.max(1, vehiculesDispo) * 2.5) add(SINISTRE.surcharge, 'équipages entassés');
  const niv = (z.niveaux && z.niveaux.intervention) || 1;
  p *= Math.max(0.6, 1 - SINISTRE.formation * (niv - 1));
  if (z.infra && z.infra.garage) p *= SINISTRE.atelier;
  return { p: Math.min(SINISTRE.max, p), facteurs: f };
}

/** Coût de la carrosserie : tous les véhicules cabossés (`choix` = true) ou une sélection d'indices. */
export const coutCarrosserie = (z, choix = true) => Math.round(cabossesChoisis(z, choix).length * SINISTRE.carrosserie * (z.infra && z.infra.garage ? 0.5 : 1) * 10) / 10;

/** Probabilité que la zone soit en tort. */
function chanceTort(z, rythme) {
  let p = SINISTRE.tortBase;
  if (rythme === 'renforce') p += 0.15;
  if (z.moral < 40) p += 0.15;
  p -= 0.05 * (((z.niveaux && z.niveaux.intervention) || 1) - 1);
  return Math.min(0.8, Math.max(0.1, p));
}

const k = (v) => `${String(Math.round(v * 10) / 10).replace('.', ',')} k€`;

/** Indemnités d'assurance attendues ce tour (début de tour). */
export function payerIndemnites(z, T) {
  const dues = (z.indemnites || []).filter((x) => x.tour <= T);
  if (!dues.length) return;
  for (const x of dues) {
    z.budget += x.montant;
    (z._compta ||= []).push({ k: 'assurance', l: 'Indemnité d’assurance (véhicule)', v: x.montant });
    z.rapport.push(`Assurance : l’assureur du tiers rembourse ${k(x.montant)} pour le véhicule perdu au tour ${x.accident}.`);
  }
  z.indemnites = z.indemnites.filter((x) => x.tour > T);
}

/** Passage en carrosserie (dépense du jour) : les véhicules cabossés sont immobilisés ce tour, sauf avec l'atelier. */
export function reparerCabosses(z, T, choix = true) {
  const idx = new Set(cabossesChoisis(z, choix));
  if (!idx.size) return 0;
  const repares = z.cabosses.filter((_, i) => idx.has(i));
  if (!(z.infra && z.infra.garage)) for (const c of repares) z.vehiculesHS.push({ retour: T + 1, ...(c.slot != null ? { slot: c.slot } : {}) });
  z.cabosses = z.cabosses.filter((_, i) => !idx.has(i));
  return repares.length;
}

/** Effet sur l'image des véhicules qui roulent cabossés (après les dépenses du jour). */
export function imageCabosses(z, T, push, label) {
  const vieux = (z.cabosses || []).filter((c) => T - c.depuis >= SINISTRE.grace);
  if (!vieux.length) return;
  const n = Math.min(3, vieux.length);
  z.satisfaction -= n * SINISTRE.imageSatisfaction;
  z.reputation -= n * SINISTRE.imageReputation;
  z.rapport.push(`Image : ${vieux.length > 1 ? `${vieux.length} véhicules cabossés roulent` : 'un véhicule cabossé roule'} encore sous les yeux des habitants (−${n} de satisfaction, −${n} de réputation). Passe-${vieux.length > 1 ? 'les' : 'le'} en carrosserie dans tes dépenses.`);
  for (const c of vieux) {
    if (T - c.depuis === SINISTRE.virale && !c.viral) {
      c.viral = true;
      z.reputation -= SINISTRE.viraleReputation;
      z.rapport.push(`Réseaux sociaux : la photo de ton combi cabossé fait le tour de la ville (−${SINISTRE.viraleReputation} de réputation).`);
      push(4, 'Vu sur les réseaux', `Le combi cabossé de ${label} fait le buzz`, 'Pare-chocs scotché, portière enfoncée : les habitants se demandent si la zone a encore les moyens de rouler.', z.uid);
    }
  }
}

/**
 * Tirage de l'accident du tour (après les interventions). Renvoie l'accident ou null.
 * ctx : { traites, rythme, interventionAgents, vehiculesDispo }
 */
export function accidentVehicule(z, T, rng, ctx, push, label) {
  z.cabosses ||= []; z.indemnites ||= [];
  if (z.vehicules <= 0) return null;
  const { p } = risqueAccident(z, ctx);
  z.stats.risqueAccident = Math.round(p * 1000) / 10;
  if (!rng.chance(p)) return null;
  const sains = z.vehicules - z.cabosses.length;
  let type = rng.weighted(Object.entries(SINISTRE.poids).map(([id, w]) => ({ id, w }))).id;
  if (type === 'accrochage' && sains <= 0) type = 'total'; // un véhicule déjà cabossé qui retape : il ne s'en remet pas
  const tort = rng.chance(chanceTort(z, ctx.rythme));
  z.stats.accidents = (z.stats.accidents || 0) + 1;

  if (type === 'accrochage') {
    const slot = placeLibre(z, T);
    z.cabosses.push({ depuis: T, ...(slot >= 0 ? { slot } : {}) });
    const quoi = rng.pick(['un rétroviseur arraché contre un poteau', 'une portière enfoncée en manœuvrant', 'un pare-chocs plié contre une borne', 'une aile froissée dans un parking trop étroit', 'un feu arrière brisé en marche arrière']);
    z.rapport.push(`Accident de véhicule : accrochage, ${quoi}. Le véhicule roule encore mais il est cabossé : passe-le en carrosserie (${k(coutCarrosserie(z) / z.cabosses.length)}) avant qu’il ne ternisse l’image de la zone.`);
    return { type, tort };
  }

  // Sinistre total (avec ou sans blessé).
  const grave = type === 'grave';
  const dernier = z.vehicules <= 1;
  if (dernier) {
    // On ne laisse jamais une zone sans aucun véhicule : le dernier part en réparation lourde.
    z.vehiculesHS.push({ retour: T + 4, slot: 0 });
  } else {
    assurerFlotte(z);
    retirerVehicule(z, plusUse(z)); // c'est le plus usé qui lâche
    if (z.cabosses.length > z.vehicules) z.cabosses.pop();
    z.stats.sinistres = (z.stats.sinistres || 0) + 1;
  }
  const bilan = [dernier ? 'le véhicule est immobilisé 3 tours pour une réparation lourde (ton dernier véhicule)' : 'le véhicule est déclaré en perte totale : il faudra en racheter un'];
  if (grave) {
    const duree = rng.int(2, 3);
    z.blesses.push({ n: 1, retour: T + 1 + duree, motif: 'blessé' });
    z.satisfaction -= 4; z.moral -= 3;
    bilan.push(`un agent blessé, absent ${duree} tours (−3 de moral, −4 de satisfaction)`);
  }
  if (tort) {
    const rep = grave ? 4 : 2;
    z.reputation -= rep; z.paperasse += 2;
    bilan.push(`le constat met la zone en tort : pas d’indemnité, rapport de sinistre (+2 dossiers) et −${rep} de réputation`);
  } else if (!dernier) {
    const montant = Math.round(COUTS.vehicule * SINISTRE.indemnite * 10) / 10;
    z.indemnites.push({ montant, tour: T + SINISTRE.delaiIndemnite, accident: T });
    bilan.push(`le tiers est en tort : son assureur remboursera ${k(montant)} dans ${SINISTRE.delaiIndemnite} tours`);
  }
  const titre = grave ? 'Accident grave' : 'Véhicule sinistré';
  z.rapport.push(`${titre} : ${bilan.join(' ; ')}.`);
  z.dernierCoupDur = { titre: grave ? 'Accident grave d’un véhicule de service' : 'Véhicule de service sinistré', texte: bilan.join(', '), tour: T };
  push(grave ? 8 : 4, grave ? 'Coup dur' : 'Faits divers', grave ? `Collision : un véhicule de ${label} détruit, un policier blessé` : `${label} perd un véhicule dans un accident`,
    tort ? 'Selon le constat, le véhicule de police est en tort.' : 'Le conducteur d’en face est en tort ; les assurances s’en mêlent.', z.uid);
  return { type, tort, grave };
}
