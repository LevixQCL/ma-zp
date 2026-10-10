// Jauges de doctrine (règles v2) : chaque doctrine a sa jauge, remplie par le travail du soir dans son domaine.
// À 100 %, elle déborde en une récompense concrète (une fois par soir au plus) ; le surplus reste dans la jauge.
// La maîtrise (semaines d'affilée avec la même doctrine) remplit la jauge plus vite.
import { DOCTRINES, MAITRISE } from './constants.js';
import { clamp, round1 } from './zone.js';
import { assurerQuartiers, carteQuartiers } from './quartiers.js';
import { pieceDoctrine } from './enquete.js';
import { pactesDe, pacteJoue, partenaire } from './pactes.js';

const fmt1 = (v) => String(round1(v)).replace('.', ',');
const SAISIES = ['une liasse de billets trouvée lors d’une fouille de véhicule', 'l’argent d’un point de deal démantelé pendant une intervention', 'une caisse noire découverte lors d’un différend familial', 'le butin d’un cambrioleur interpellé à la sortie', 'des billets cachés dans une voiture contrôlée', 'la recette d’un trafic de cigarettes saisie sur un marché'];
const CAMPAGNES = ['contrôles d’alcoolémie aux sorties de discothèque', 'opération radar devant les écoles', 'campagne ceinture et téléphone au volant', 'contrôles des poids lourds sur la nationale', 'opération deux-roues et trottinettes'];
const TUYAUX = ['un commerçant signale un guetteur', 'une riveraine note des allées et venues suspectes', 'le gardien d’un immeuble repère une cave squattée', 'un éducateur de rue désamorce une bagarre annoncée', 'un patron de café calme une rivalité entre bandes'];

/** Ce que la jauge gagne ce soir (avant la maîtrise). `ctx` : { traites, recettes, cap, resolus, demarches }. */
export function gainJauge(state, z, ctx) {
  const d = z && z.doctrine && DOCTRINES[z.doctrine];
  if (!d || !d.jauge) return 0;
  const J = d.jauge;
  switch (z.doctrine) {
    case 'intervention': return (ctx.traites || 0) * d.saisieJauge;
    case 'routiere': return (ctx.recettes || 0) * J.parK;
    case 'quartier': return ((ctx.cap && ctx.cap.proximite) || 0) * J.parCap;
    case 'judiciaire': return J.parSoir + (ctx.resolus || 0) * J.parDossier + (ctx.demarches || 0) * J.parDemarche;
    case 'partenaire': {
      const av = z._docAvant || { renforts: 0, releves: 0 };
      const renf = Math.max(0, (Number(z.stats.renfortsPretes) || 0) - av.renforts), rel = Math.max(0, (Number(z.stats.releves) || 0) - av.releves);
      const pactes = pactesDe(state, z.uid).filter((p) => pacteJoue(state, p)).length;
      const visite = z._agenda && z._agenda.type === 'voisin' ? 1 : 0;
      return J.parSoir + renf * J.parRenfort + rel * J.parReleve + pactes * J.parPacte + visite * J.parVisite;
    }
    default: return 0;
  }
}

export function jaugeDoctrine(state, z, ctx, rng, push, zoneLabel, T) {
  const d = DOCTRINES[z.doctrine];
  if (!d || !d.jauge) return;
  const J = d.jauge;
  // Reprise de l'ancienne jauge de saisie (10 octobre) dans la jauge commune.
  if (z.jaugeSaisie != null) { if (z.jaugeDoc == null && z.doctrine === 'intervention') z.jaugeDoc = z.jaugeSaisie; delete z.jaugeSaisie; }
  const brut = gainJauge(state, z, ctx) * (1 + MAITRISE * (z.maitrise || 0));
  if (brut <= 0) return;
  z.jaugeDoc = Math.round(Math.min(1.5, (z.jaugeDoc || 0) + brut) * 100) / 100;
  if (z.jaugeDoc < 0.995) {
    z.rapport.push(`${J.ico} ${J.nom} (doctrine ${d.nom.toLowerCase()}) : ${Math.round(z.jaugeDoc * 100)} % (+${Math.round(brut * 100)} % ce soir ; à 100 %, ${J.gain}).`);
    return;
  }
  z.jaugeDoc = Math.max(0, Math.round((z.jaugeDoc - 1) * 100) / 100);
  z.stats.jaugesDoc = (z.stats.jaugesDoc || 0) + 1;
  const ici = (t) => { (z.cetteNuit ||= []).push({ ico: J.ico, t }); };
  switch (z.doctrine) {
    case 'intervention': {
      const saisie = round1(rng.float(d.saisie, d.saisieMax) * (1 + MAITRISE * (z.maitrise || 0)));
      z.budget += saisie; z.stats.saisies = round1((z.stats.saisies || 0) + saisie); z.stats.nbSaisies = (z.stats.nbSaisies || 0) + 1;
      z.rapport.push(`💰 Saisie (doctrine d’intervention) : ${rng.pick(SAISIES)}, +${fmt1(saisie)} k€.`);
      ici(`Saisie : +${fmt1(saisie)} k€ en liquide`);
      push(2, 'Saisie', `${zoneLabel(z)} : ${fmt1(saisie)} k€ saisis en intervention`, 'Doctrine d’intervention.', z.uid);
      break;
    }
    case 'routiere': {
      z.satisfaction += J.sat; z.budget += J.prime;
      z.rapport.push(`🚦 Campagne de contrôles (doctrine routière) : ${rng.pick(CAMPAGNES)}. +${J.sat} de satisfaction, prime de la commune +${fmt1(J.prime)} k€.`);
      ici(`Campagne de contrôles : +${J.sat} de satisfaction, +${fmt1(J.prime)} k€`);
      push(2, 'Sécurité routière', `${zoneLabel(z)} mène une campagne de contrôles`, 'Doctrine routière.', z.uid);
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
      z.rapport.push(`👂 Réseau d’îlotiers (doctrine de quartier) : ${rng.pick(TUYAUX)} à ${lieu}. Tension −${J.tension}, +${J.sat} de satisfaction${piece ? ', et un îlotier te rapporte une pièce d’enquête' : ''}.`);
      ici(`Réseau d’îlotiers : tension de ${lieu} −${J.tension}${piece ? ', une pièce d’enquête' : ''}`);
      break;
    }
    case 'judiciaire': {
      const piece = pieceDoctrine(state, z, rng);
      if (piece) {
        z.rapport.push('📁 Dossier au parquet (doctrine judiciaire) : le substitut te transmet un élément du dossier. Une pièce s’ajoute à ton enquête.');
        ici('Dossier au parquet : une pièce d’enquête');
      } else {
        z._points = (z._points || 0) + J.points;
        z.rapport.push(`📁 Dossier au parquet (doctrine judiciaire) : pas d’affaire en cours, le parquet salue ton travail (+${J.points} points).`);
        ici(`Dossier au parquet : +${J.points} points`);
      }
      break;
    }
    case 'partenaire': {
      z.reputation += J.rep; z.budget += J.prime;
      const parts = [...new Set(pactesDe(state, z.uid).filter((p) => pacteJoue(state, p)).map((p) => partenaire(p, z.uid)))].map((u) => state.zones[u]).filter(Boolean);
      for (const pz of parts) { pz.reputation += J.repPartenaire; (pz.rapport ||= []).push(`🤝 ${zoneLabel(z)} a fait reconnaître votre coopération : +${J.repPartenaire} de réputation.`); }
      z.rapport.push(`🤝 Crédit de coopération (doctrine partenaire) : le district reconnaît ton soutien. +${J.rep} de réputation, indemnité +${fmt1(J.prime)} k€${parts.length ? `, +${J.repPartenaire} de réputation pour ${parts.map((p) => p.nom).join(' et ')}` : ''}.`);
      ici(`Crédit de coopération : +${J.rep} de réputation, +${fmt1(J.prime)} k€`);
      push(2, 'Coopération', `${zoneLabel(z)} : le district salue sa coopération`, 'Doctrine partenaire.', z.uid);
      break;
    }
  }
}
