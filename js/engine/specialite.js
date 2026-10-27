// Spécialité (saison 4) : choix, progression par jours joués, et jauge du 3e palier.
// La jauge se remplit avec le travail du soir dans son domaine ; à 100 %, elle déborde en une récompense concrète
// (une fois par soir au plus) et le surplus reste dans la jauge.
import { SPECIALITES, PALIERS_SPE, palierSpe, jaugeSpeOuverte } from './constants.js';
import { clamp, round1 } from './zone.js';
import { assurerQuartiers, carteQuartiers } from './quartiers.js';
import { pieceDoctrine } from './enquete.js';

const fmt1 = (v) => String(round1(v)).replace('.', ',');
const SAISIES = ['une liasse de billets trouvée lors d’une fouille de véhicule', 'l’argent d’un point de deal démantelé pendant une intervention', 'une caisse noire découverte lors d’un différend familial', 'le butin d’un cambrioleur interpellé à la sortie', 'des billets cachés dans une voiture contrôlée', 'la recette d’un trafic de cigarettes saisie sur un marché'];
const CAMPAGNES = ['contrôles d’alcoolémie aux sorties de discothèque', 'opération radar devant les écoles', 'campagne ceinture et téléphone au volant', 'contrôles des poids lourds sur la nationale', 'opération deux-roues et trottinettes'];
const TUYAUX = ['un commerçant signale un guetteur', 'une riveraine note des allées et venues suspectes', 'le gardien d’un immeuble repère une cave squattée', 'un éducateur de rue désamorce une bagarre annoncée', 'un patron de café calme une rivalité entre bandes'];

/** Spécialité demandée dans les ordres : en changer remet la progression et la jauge à zéro. */
export function choisirSpecialite(z, voulue, push, zoneLabel, uid) {
  if (typeof voulue !== 'string' || !Object.hasOwn(SPECIALITES, voulue) || (z.specialite && z.specialite.id === voulue)) return;
  const avant = z.specialite && SPECIALITES[z.specialite.id];
  z.specialite = { id: voulue, jours: 0 };
  z.jaugeSpe = 0;
  const S = SPECIALITES[voulue];
  z.rapport.push(`Spécialité ${avant ? `changée (${avant.nom.toLowerCase()} → ${S.nom.toLowerCase()}, progression remise à zéro)` : 'choisie'} : ${S.nom}. Palier 1 dès ce soir : ${S.paliers[0].t}.`);
  push(3, 'Spécialité', `${zoneLabel(z)} se spécialise : ${S.nom.toLowerCase()}`, `${S.paliers[0].t}.`, uid);
}

/** Fin de soirée jouée : un jour de plus avec la spécialité, et l'annonce d'un nouveau palier. */
export function avancerSpecialite(z) {
  if (!z.specialite || !Object.hasOwn(SPECIALITES, z.specialite.id)) return;
  const avant = palierSpe(z);
  z.specialite.jours = (Number(z.specialite.jours) || 0) + 1;
  const apres = palierSpe(z), S = SPECIALITES[z.specialite.id];
  if (apres > avant) z.rapport.push(`Spécialité ${S.nom.toLowerCase()} : palier ${apres} atteint. ${S.paliers[apres - 1].t}.`);
  else if (apres < PALIERS_SPE.length) { const reste = PALIERS_SPE[apres] - z.specialite.jours; z.rapport.push(`Spécialité ${S.nom.toLowerCase()} : palier ${apres + 1} dans ${reste} jour${reste > 1 ? 's' : ''} joué${reste > 1 ? 's' : ''}.`); }
}

/** Ce que la jauge gagne ce soir. `ctx` : { traites, recettes, cap, resolus, demarches }. */
export function gainJauge(state, z, ctx) {
  const S = z && z.specialite && SPECIALITES[z.specialite.id];
  if (!S || !jaugeSpeOuverte(z)) return 0;
  const J = S.jauge;
  switch (z.specialite.id) {
    case 'intervention': return (ctx.traites || 0) * J.parInc;
    case 'routiere': return (ctx.recettes || 0) * J.parK;
    case 'quartier': return ((ctx.cap && ctx.cap.proximite) || 0) * J.parCap;
    case 'judiciaire': return J.parSoir + (ctx.resolus || 0) * J.parDossier + (ctx.demarches || 0) * J.parDemarche;
    default: return 0;
  }
}

export function jaugeSpecialite(state, z, ctx, rng, push, zoneLabel) {
  const S = z.specialite && SPECIALITES[z.specialite.id];
  if (!S) return;
  const J = S.jauge;
  const brut = gainJauge(state, z, ctx);
  if (brut <= 0) return;
  z.jaugeSpe = Math.round(Math.min(1.5, (z.jaugeSpe || 0) + brut) * 100) / 100;
  if (z.jaugeSpe < 0.995) {
    z.rapport.push(`${J.ico} ${J.nom} : ${Math.round(z.jaugeSpe * 100)} % (+${Math.round(brut * 100)} % ce soir ; à 100 %, ${J.gain}).`);
    return;
  }
  z.jaugeSpe = Math.max(0, Math.round((z.jaugeSpe - 1) * 100) / 100);
  z.stats.jaugesDoc = (z.stats.jaugesDoc || 0) + 1;
  const ici = (t) => { (z.cetteNuit ||= []).push({ ico: J.ico, t }); };
  switch (z.specialite.id) {
    case 'intervention': {
      const saisie = round1(rng.float(J.saisie, J.saisieMax));
      z.budget += saisie; z.stats.saisies = round1((z.stats.saisies || 0) + saisie); z.stats.nbSaisies = (z.stats.nbSaisies || 0) + 1;
      z.rapport.push(`💰 Saisie : ${rng.pick(SAISIES)}, +${fmt1(saisie)} k€.`);
      ici(`Saisie : +${fmt1(saisie)} k€ en liquide`);
      push(2, 'Saisie', `${zoneLabel(z)} : ${fmt1(saisie)} k€ saisis en intervention`, 'Spécialité d’intervention.', z.uid);
      break;
    }
    case 'routiere': {
      z.satisfaction += J.sat; z.budget += J.prime;
      z.rapport.push(`🚦 Campagne de contrôles : ${rng.pick(CAMPAGNES)}. +${J.sat} de satisfaction, prime de la commune +${fmt1(J.prime)} k€.`);
      ici(`Campagne de contrôles : +${J.sat} de satisfaction, +${fmt1(J.prime)} k€`);
      push(2, 'Sécurité routière', `${zoneLabel(z)} mène une campagne de contrôles`, 'Spécialité routière.', z.uid);
      break;
    }
    case 'quartier': {
      const q = assurerQuartiers(state, z);
      const cells = Object.keys(q).sort((a, b) => q[b] - q[a]);
      const cell = cells[0];
      if (cell) q[cell] = clamp(q[cell] - J.tension, 10, 95);
      z.satisfaction += J.sat;
      const piece = rng.next() < J.piece ? pieceDoctrine(state, z, rng) : null;
      const lieu = cell ? carteQuartiers(state).nomDe(Number(cell)) : 'un quartier';
      z.rapport.push(`👂 Réseau d’îlotiers : ${rng.pick(TUYAUX)} à ${lieu}. Tension −${J.tension}, +${J.sat} de satisfaction${piece ? ', et un îlotier te rapporte une pièce d’enquête' : ''}.`);
      ici(`Réseau d’îlotiers : tension de ${lieu} −${J.tension}${piece ? ', une pièce d’enquête' : ''}`);
      break;
    }
    case 'judiciaire': {
      const piece = pieceDoctrine(state, z, rng);
      if (piece) {
        z.rapport.push('📁 Dossier au parquet : le substitut te transmet un élément du dossier. Une pièce s’ajoute à ton enquête.');
        ici('Dossier au parquet : une pièce d’enquête');
      } else {
        z._points = (z._points || 0) + J.points;
        z.rapport.push(`📁 Dossier au parquet : pas d’affaire en cours, le parquet salue ton travail (+${J.points} points).`);
        ici(`Dossier au parquet : +${J.points} points`);
      }
      break;
    }
  }
}
