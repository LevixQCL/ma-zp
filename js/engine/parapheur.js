// Le parapheur du chef de corps (saison 2) : chaque jour, un ou deux courriers sur son bureau.
// Deux réponses qui se valent : chacune entraîne une compétence (+2 XP, dans le plafond du jour) et coûte quelque chose.
// Certaines réponses ont une suite le lendemain. Sans réponse, l'adjoint classe le courrier (sans effet ni expérience).
// La prise de fonctions ouvre les prérogatives du chef une à une, sur ses six premiers jours.
// Calibrage : test/parapheur-sim.mjs (toujours répondre « au mieux » rapporte moins d'un demi-point d'IPZ moyen).
import { makeRng } from './rng.js';
import { RESEAU, changerEstime } from './chef.js';

export const XP_COURRIER = 2;

// fx : moral, sat (satisfaction), rep, budget (k€), pap (dossiers), demain (agents pris demain), estime { perso: ±1 }.
export const COURRIERS = {
  gilets: { de: 'Le délégué syndical', img: 'syndicat', obj: 'Gilets pare-balles en fin de garantie',
    txt: 'Douze gilets arrivent en fin de garantie le mois prochain. Les équipes de nuit demandent qu’on les remplace avant l’hiver.',
    o: [{ l: 'Commander tout de suite', comp: 'commandement', fx: { budget: -1.2, moral: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Faire prolonger d’un an', comp: 'gestion', fx: { estime: { syndicat: -1 } }, tampon: 'REPORTÉ', suite: 'gilets2' }] },
  gilets2: { suite: true, de: 'Le délégué syndical', img: 'syndicat', humeur: -1, obj: 'Le syndicat revient à la charge',
    txt: '« Un collègue a déchiré son gilet en intervention hier. Il était encore sous garantie, heureusement. Et la prochaine fois ? »',
    o: [{ l: 'Commander la moitié', comp: 'diplomatie', fx: { budget: -0.6, estime: { syndicat: 1 } }, tampon: 'ACCORDÉ' },
      { l: 'Maintenir la décision', comp: 'gestion', fx: { moral: -1 }, tampon: 'MAINTENU' }] },
  braderie: { de: 'Le bourgmestre', img: 'bourgmestre', obj: 'Braderie de dimanche',
    txt: '« Chef, la braderie du centre attire 20 000 personnes. J’aimerais quatre agents en tenue, bien visibles, toute la journée. »',
    o: [{ l: 'Envoyer des agents', comp: 'proximite', fx: { demain: 2, sat: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Proposer des stewards communaux', comp: 'diplomatie', fx: { estime: { bourgmestre: -1 } }, tampon: 'CONTRE-PROPOSITION' }] },
  conge: { de: 'Un inspecteur de l’Intervention', av: 'IN', obj: 'Demande de congé',
    txt: 'La communion de ma fille tombe demain. Je sais que c’est chargé, mais je n’ai pas pris un jour depuis des semaines.',
    o: [{ l: 'Accorder', comp: 'commandement', fx: { demain: 1, moral: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Refuser, avec un mot', comp: 'gestion', fx: { moral: -1, pap: -1 }, tampon: 'REFUSÉ' }] },
  radar: { de: 'Une pétition de 84 riverains', av: '✍', obj: 'Vitesse devant l’école',
    txt: 'Des voitures à 70 km/h devant l’école. Les parents demandent une action « avant qu’il n’y ait un drame ».',
    o: [{ l: 'Contrôle radar cette semaine', comp: 'gestion', fx: { budget: 0.6, pap: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Réunion avec les parents', comp: 'proximite', fx: { demain: 1, sat: 1 }, tampon: 'RÉUNION' }] },
  rapport: { de: 'Le procureur', img: 'procureur', obj: 'Rapport sur l’affaire en cours', enquete: true,
    txt: '« Je souhaite un état précis de vos devoirs d’enquête. Pas un résumé : un vrai rapport. »',
    o: [{ l: 'Y mettre un enquêteur', comp: 'flair', fx: { demain: 1, estime: { procureur: 1 } }, tampon: 'TRANSMIS' },
      { l: 'Rapport court', comp: 'gestion', fx: { pap: -1, estime: { procureur: -1 } }, tampon: 'CLASSÉ' }] },
  photo: { de: 'La Voix du Delta', img: 'journaliste', obj: 'Un reportage dans la salle de garde',
    txt: '« Une journée avec vos équipes, photos comprises. Nos lecteurs adorent ce genre de sujet. »',
    o: [{ l: 'Ouvrir les portes', comp: 'proximite', fx: { sat: 1, estime: { journaliste: 1 } }, tampon: 'ACCORDÉ' },
      { l: 'Protéger les équipes', comp: 'commandement', fx: { moral: 1, estime: { journaliste: -1 } }, tampon: 'REFUSÉ' }] },
  carburant: { de: 'Le service comptable', av: '€', obj: 'Facture de carburant',
    txt: 'La facture du trimestre dépasse le devis de 18 %. Le fournisseur parle d’une « erreur d’indexation ».',
    o: [{ l: 'Contester', comp: 'gestion', fx: { budget: 0.8, pap: 1 }, tampon: 'CONTESTÉ' },
      { l: 'Payer et garder le fournisseur', comp: 'diplomatie', fx: {}, tampon: 'PAYÉ' }] },
  ecole: { de: 'La directrice de l’école communale', av: 'É', obj: 'Prévention du harcèlement',
    txt: 'Une séance de prévention avec deux policiers, devant les sixièmes primaires ? Les enfants posent beaucoup de questions.',
    o: [{ l: 'Envoyer deux agents', comp: 'proximite', fx: { demain: 1, sat: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Envoyer un dossier pédagogique', comp: 'gestion', fx: { pap: 1 }, tampon: 'ENVOYÉ' }] },
  tuteur: { de: 'L’académie de police', av: 'A', obj: 'Un tuteur pour un aspirant',
    txt: 'Un aspirant cherche un service d’accueil pour son stage. Il faut un tuteur expérimenté pendant quelques jours.',
    o: [{ l: 'Désigner un tuteur', comp: 'commandement', fx: { demain: 1, rep: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Pas cette fois', comp: 'gestion', fx: {}, tampon: 'DÉCLINÉ' }] },
  garde: { de: 'Le chef d’une zone voisine', av: '🤝', obj: 'Mutualiser la garde du week-end', voisin: true,
    txt: '« Et si on partageait une équipe de garde le week-end ? Chacun économise des heures, et on se connaît mieux. »',
    o: [{ l: 'D’accord', comp: 'diplomatie', fx: { demain: 2, rep: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Chacun chez soi', comp: 'gestion', fx: {}, tampon: 'DÉCLINÉ' }] },
  cameras: { de: 'Le bourgmestre', img: 'bourgmestre', obj: 'Des caméras place du marché',
    txt: '« Trois caméras sur la place, ça rassurerait les commerçants. La commune n’a pas le budget cette année… »',
    o: [{ l: 'La zone les paie', comp: 'gestion', fx: { budget: -1.5, sat: 1, estime: { bourgmestre: 1 } }, tampon: 'ACCORDÉ' },
      { l: 'Négocier : la commune paie', comp: 'diplomatie', fx: { estime: { bourgmestre: -1 } }, tampon: 'NÉGOCIÉ' }] },
  interview: { de: 'La Voix du Delta', img: 'journaliste', obj: 'Interview du chef', enquete: true,
    txt: '« Une interview sur l’affaire en cours ? Juste ce que vous pouvez dire, bien sûr. »',
    o: [{ l: 'Accepter', comp: 'proximite', fx: { pap: 1, estime: { journaliste: 1 } }, tampon: 'ACCORDÉ' },
      { l: 'Refuser : secret de l’enquête', comp: 'flair', fx: { estime: { procureur: 1, journaliste: -1 } }, tampon: 'REFUSÉ' }] },
  plainte: { de: 'Un citoyen mécontent', av: '!', obj: 'Un agent jugé impoli',
    txt: 'Il se plaint du ton d’un agent lors d’un contrôle routier. Il menace d’écrire au bourgmestre.',
    o: [{ l: 'Recadrer l’agent', comp: 'commandement', fx: { moral: -1, sat: 1 }, tampon: 'TRAITÉ' },
      { l: 'Enquête interne', comp: 'flair', fx: { pap: 2, rep: 1 }, tampon: 'OUVERT' }] },
  tournoi: { de: 'L’amicale du personnel', av: '⚽', obj: 'Tournoi de foot entre zones',
    txt: 'Les agents veulent organiser un tournoi avec les zones voisines. Il faudrait payer la location du terrain et les maillots.',
    o: [{ l: 'Financer le tournoi', comp: 'diplomatie', fx: { budget: -0.8, moral: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Pas de budget', comp: 'gestion', fx: {}, tampon: 'REFUSÉ' }] },
  heures: { de: 'Le délégué syndical', img: 'syndicat', obj: 'Heures supplémentaires',
    txt: '« Les heures de la nuit de la braderie ne sont toujours pas payées. Les collègues commencent à grogner. »',
    o: [{ l: 'Payer les heures', comp: 'gestion', fx: { budget: -1, estime: { syndicat: 1 } }, tampon: 'PAYÉ' },
      { l: 'Accorder des récupérations', comp: 'commandement', fx: { demain: 1, estime: { syndicat: 1 } }, tampon: 'RÉCUP' }] },
  velos: { de: 'L’association des commerçants', av: '🛍', obj: 'Une patrouille vélo au centre',
    txt: 'Les commerçants voudraient voir des agents à vélo dans le piétonnier, surtout le samedi.',
    o: [{ l: 'Lancer la patrouille', comp: 'proximite', fx: { demain: 1, sat: 1 }, tampon: 'ACCORDÉ' },
      { l: 'Pas d’effectif pour ça', comp: 'gestion', fx: {}, tampon: 'REFUSÉ' }] },
  tolerance: { de: 'Le procureur', img: 'procureur', obj: 'Tolérance zéro sur les stupéfiants',
    txt: '« Le parquet fait des stupéfiants sa priorité ce trimestre. Je compte sur chaque zone pour suivre. »',
    o: [{ l: 'Suivre la consigne', comp: 'flair', fx: { pap: 1, estime: { procureur: 1 } }, tampon: 'APPLIQUÉ' },
      { l: 'Garder tes priorités de quartier', comp: 'proximite', fx: { estime: { procureur: -1 } }, tampon: 'NOTÉ' }] },
  don: { de: 'Un concessionnaire local', av: '🚲', obj: 'Un vélo électrique offert',
    txt: 'Il offre un vélo électrique à la zone. En échange : son logo sur le cadre et une photo pour son site.',
    o: [{ l: 'Accepter', comp: 'gestion', fx: { budget: 0.5, estime: { journaliste: -1 } }, tampon: 'ACCEPTÉ' },
      { l: 'Refuser poliment', comp: 'diplomatie', fx: {}, tampon: 'REFUSÉ' }] },
  secourisme: { de: 'La Croix-Rouge', av: '✚', obj: 'Recyclage secourisme',
    txt: 'Une journée de recyclage aux premiers secours pour vos agents, à prix d’ami.',
    o: [{ l: 'Inscrire les équipes', comp: 'commandement', fx: { budget: -0.8, moral: 1 }, tampon: 'INSCRIT' },
      { l: 'Reporter', comp: 'gestion', fx: {}, tampon: 'REPORTÉ' }] },
};
export const IDS_COURRIERS = Object.keys(COURRIERS).filter((k) => !COURRIERS[k].suite);

// ───── Prise de fonctions : une prérogative de plus par jour, sur les six premiers jours du chef ─────
export const PRISE = [
  { j: 1, k: 'agenda', ico: '🗓️', lb: 'Agenda', tease: '' },
  { j: 2, k: 'objectifs', ico: '🎯', lb: 'Objectifs', tease: 'tes trois objectifs de la semaine (de l’expérience et de la réputation à la clé)' },
  { j: 3, k: 'talents', ico: '🏅', lb: 'Talents', tease: 'tu équipes ton premier talent' },
  { j: 4, k: 'front', ico: '⚔️', lb: '1re ligne', tease: 'ton chef peut monter en première ligne (un bonus, un risque)' },
  { j: 5, k: 'reseau', ico: '📞', lb: 'Réseau', tease: 'le bourgmestre, le procureur, le syndicat et la presse peuvent te rendre service' },
  { j: 6, k: 'rival', ico: '🤺', lb: 'Rival', tease: 'un rival pour la semaine et les réunions chez les chefs voisins' },
];
export const PRISE_JOURS = PRISE.length;
/** Lieux de l'agenda ouverts à partir de quel jour de prise de fonctions. */
export const AGENDA_JOUR = { bureau: 1, terrain: 1, quartier: 1, commune: 2, parquet: 2, voisin: 6 };

/** Jour de prise de fonctions du chef (1 à 6), ou 99 quand tout est ouvert (vétéran, ou les six jours passés). */
export function jourPrise(chef, T) {
  if (!chef || chef.priseFaite) return 99;
  if (chef.priseT == null) return 1;
  const j = (Number(T) || 1) - chef.priseT + 1;
  return j > PRISE_JOURS ? 99 : Math.max(1, j);
}
export const priseOuverte = (chef, T, k) => { const p = PRISE.find((x) => x.k === k); return !p || jourPrise(chef, T) >= p.j; };

/** Courriers du jour pour une zone (déterministe : le même à l'écran et au tour de 20:00). */
export function courriersDuJour(state, z) {
  if (!state || !z || !z.chef) return [];
  const T = Number(state.turn) || 1, c = z.chef;
  const n = jourPrise(c, T) === 1 ? 1 : 2;
  const l = [];
  if (c.paraSuite && c.paraSuite.t === T) for (const id of c.paraSuite.ids || []) if (COURRIERS[id] && l.length < n) l.push(id);
  const vus = new Set(c.paraVus || []);
  const voisins = Object.keys(state.zones || {}).length > 1;
  const ok = (id) => !(COURRIERS[id].enquete && (!state.enquete || state.enquetePause)) && !(COURRIERS[id].voisin && !voisins);
  let pool = IDS_COURRIERS.filter((id) => ok(id) && !vus.has(id) && !l.includes(id));
  if (pool.length < n) pool = IDS_COURRIERS.filter((id) => ok(id) && !l.includes(id));
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:para:${z.uid}`);
  const m = rng.shuffle(pool.slice());
  while (l.length < n && m.length) l.push(m.shift());
  return l;
}

const plus = (v) => `${v > 0 ? '+' : '−'}${String(Math.abs(Math.round(v * 10) / 10)).replace('.', ',')}`;
const euros = (k) => `${k > 0 ? '+' : '−'}${Math.round(Math.abs(k) * 1000).toLocaleString('fr-BE').replace(/ | /g, ' ')} €`;
/** Texte des effets d'une réponse (le même à l'écran et dans le rapport). */
export function texteFx(fx) {
  const t = [];
  if (fx.budget) t.push(euros(fx.budget));
  if (fx.moral) t.push(`${plus(fx.moral)} de moral`);
  if (fx.sat) t.push(`${plus(fx.sat)} de satisfaction`);
  if (fx.rep) t.push(`${plus(fx.rep)} de réputation`);
  if (fx.pap) t.push(fx.pap < 0 ? `${-fx.pap} dossier${fx.pap < -1 ? 's' : ''} de paperasse en moins` : `+${fx.pap} dossier${fx.pap > 1 ? 's' : ''} de paperasse`);
  if (fx.demain) t.push(`${fx.demain} agent${fx.demain > 1 ? 's' : ''} pris demain`);
  for (const [id, v] of Object.entries(fx.estime || {})) if (RESEAU[id]) t.push(`${RESEAU[id].nom.replace(/^(Le|La) /, '').toLowerCase()} : estime ${plus(v)}`);
  return t.length ? t.join(' · ') : 'rien ne change';
}

/**
 * Applique les réponses du parapheur (tour de 20:00). `rep` : { id: 0|1 } venu des ordres.
 * Retourne l'expérience gagnée par compétence. Prépare les suites du lendemain.
 */
export function appliquerParapheur(state, z, rep, T, liste) {
  const gains = {};
  const c = z.chef;
  if (!c) return gains;
  const suites = [];
  let n = 0;
  for (const id of liste) {
    const C = COURRIERS[id], k = rep && Object.hasOwn(rep, id) ? Number(rep[id]) : null;
    if (!C || !(k === 0 || k === 1)) { if (C) z.rapport.push(`Parapheur : « ${C.obj} », sans réponse, classé par ton adjoint.`); continue; }
    const o = C.o[k], fx = o.fx || {};
    if (fx.budget) { z.budget += fx.budget; (z._compta ||= []).push({ k: 'agenda', l: `Parapheur : ${C.obj.toLowerCase()}`, v: fx.budget }); }
    if (fx.moral) z.moral += fx.moral;
    if (fx.sat) z.satisfaction += fx.sat;
    if (fx.rep) z.reputation += fx.rep;
    if (fx.pap) z.paperasse = Math.max(0, z.paperasse + fx.pap);
    if (fx.demain) (z.blesses ||= []).push({ n: fx.demain, retour: T + 2, motif: 'mission du chef' });
    for (const [p, v] of Object.entries(fx.estime || {})) changerEstime(z, p, v);
    gains[o.comp] = (gains[o.comp] || 0) + XP_COURRIER;
    n += 1;
    if (o.suite && COURRIERS[o.suite]) suites.push(o.suite);
    z.rapport.push(`Parapheur : « ${C.obj} », ${o.l.charAt(0).toLowerCase()}${o.l.slice(1)} (${texteFx(fx)}).`);
  }
  c.paraVus = [...(c.paraVus || []), ...liste.filter((id) => !COURRIERS[id].suite)].slice(-12);
  c.paraSuite = suites.length ? { t: T + 1, ids: suites } : null;
  c.nbCourriers = (c.nbCourriers || 0) + n;
  return gains;
}
