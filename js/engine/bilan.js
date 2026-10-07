// Bilan de fin de saison : au lieu de retirer un niveau partout (et de remettre le matériel à 1),
// la zone subit des « cas » concrets — départs à la pension, mutations, matériel cassé, entretien des bâtiments.
// Leur nombre dépend de ce que la zone a gagné et de ce qu'elle a au-dessus de la moyenne du district :
//   cas = PART × niveaux gagnés + SURPLUS × (niveaux gagnés − moyenne du district, si positif).
// Chaque cas retire un niveau à l'élément le plus au-dessus de la moyenne du district (au plus 2 par élément).
// Pendant les premiers soirs de la saison suivante, la moitié des cas peut être remise en état, à moitié prix.
// Calibrage : test/fin-saison-sim.mjs (« Bilan ciblé ») — environ 50 % des niveaux perdus au lieu de 85 %,
// 55–58 % pour les zones très développées, 34–35 % pour les petites ; écart entre zones inchangé la saison suivante.

import { SERVICES, SERVICE_LABELS, BATIMENTS, NIVEAU_MAX, BATIMENT_MAX, COUTS, coutEquipement, MIN_TOURS_CLASSEMENT } from './constants.js';
import { makeRng } from './rng.js';

export const BILAN = {
  part: 0.35,          // part des niveaux gagnés
  surplus: 0.70,       // part de ce qui dépasse la moyenne du district
  plafondCas: 0.6,     // jamais plus de 60 % des niveaux gagnés (zone très en avance sur un district peu développé)
  maxParElement: 2,    // niveaux perdus au plus par élément
  hpProtege: 4,        // l'hôtel de police ne redescend pas sous 4 une fois atteint
  rachat: 0.5,         // prix d'une remise en état : moitié du prix du niveau
  plafond: 0.5,        // part des cas qu'on peut remettre en état (arrondi en dessous, au moins 1 s'il y a des cas)
  tours: 3,            // soirs pour décider (sans réponse : accepté)
};

const round1 = (v) => Math.round(v * 10) / 10;

/** Éléments qui comptent dans le bilan : formation et matériel de chaque service, hôtel de police, garage. */
export function elementsZone(z) {
  const l = [];
  for (const s of SERVICES) {
    l.push({ k: 'niveaux', s, n: (z.niveaux && z.niveaux[s]) || 1 });
    l.push({ k: 'equip', s, n: (z.equip && z.equip[s]) || 1 });
  }
  const b = z.batiments || {};
  l.push({ k: 'batiments', s: 'bureaux', n: b.bureaux || 1 });
  l.push({ k: 'batiments', s: 'garage', n: b.garage || 1 });
  return l;
}
const cle = (it) => `${it.k}:${it.s}`;
/** Niveaux gagnés depuis le départ (tout élément part du niveau 1). */
export const niveauxGagnes = (z) => elementsZone(z).reduce((a, it) => a + it.n - 1, 0);

/** Prix d'origine (k€) du niveau `n` d'un élément. */
export function prixNiveau(k, s, n) {
  if (k === 'niveaux') return COUTS.formation;
  if (k === 'equip') return coutEquipement(n - 1);
  return BATIMENTS[s].coutAgrandir(n - 1);
}

/** Moyennes du district (zones classées, ou toutes s'il n'y en a pas). */
export function moyennesDistrict(zones) {
  const classees = zones.filter((z) => (z.toursJoues || 0) >= MIN_TOURS_CLASSEMENT);
  const base = classees.length ? classees : zones;
  const m = { total: 0 };
  if (!base.length) return m;
  m.total = base.reduce((a, z) => a + niveauxGagnes(z), 0) / base.length;
  for (const z of base) for (const it of elementsZone(z)) m[cle(it)] = (m[cle(it)] || 0) + it.n / base.length;
  return m;
}

// ───── Récits : un cas = un événement concret ─────
const DE = { intervention: 'de l’Intervention', proximite: 'de la Proximité', recherche: 'de la Recherche', roulage: 'du Roulage', admin: 'de l’accueil' };
const FORMATION = [
  { t: 'Départs à la pension', x: (s) => `Les anciens ${DE[s]} raccrochent. Leurs remplaçants sortent de l’école et doivent encore apprendre le terrain.`, a: 'Formation accélérée' },
  { t: 'Mutation vers la fédérale', x: (s) => `Ton meilleur élément ${DE[s]} rejoint la police judiciaire fédérale. Son expérience part avec lui.`, a: 'Former un remplaçant' },
  { t: 'Départ vers une autre zone', x: (s) => `Deux agents ${DE[s]} demandent leur mutation pour se rapprocher de chez eux.`, a: 'Recycler l’équipe' },
];
const MATERIEL = {
  intervention: [
    { t: 'Le drone s’est écrasé', x: 'Une rafale de vent pendant un survol du centre-ville. Il est irréparable.', a: 'En racheter un' },
    { t: 'Gilets pare-balles périmés', x: 'La date de validité est dépassée : ils doivent être remplacés avant de ressortir.', a: 'Remplacer les gilets' },
  ],
  proximite: [
    { t: 'Les vélos de patrouille volés', x: 'Volés dans la cour pendant la nuit. Un comble, et toute la presse en parle.', a: 'Racheter des vélos' },
    { t: 'Tablettes de quartier en panne', x: 'Les tablettes des agents de quartier ne démarrent plus après la dernière mise à jour.', a: 'Les remplacer' },
  ],
  recherche: [
    { t: 'Licence du logiciel expirée', x: 'Le logiciel d’analyse n’a pas été renouvelé à temps : les enquêteurs sont revenus aux fiches papier.', a: 'Renouveler la licence' },
    { t: 'Ordinateurs d’enquête obsolètes', x: 'Ils ne lisent plus les extractions de téléphones récents.', a: 'Moderniser le parc' },
  ],
  roulage: [
    { t: 'Le radar mobile recalé à l’étalonnage', x: 'Le contrôle annuel du cinémomètre est négatif : il ne peut plus servir pour verbaliser.', a: 'Faire réétalonner' },
    { t: 'Éthylomètres hors service', x: 'Les appareils n’ont pas passé leur vérification : les contrôles d’alcoolémie sont à l’arrêt.', a: 'Remplacer les appareils' },
  ],
  admin: [
    { t: 'Le serveur de l’accueil a lâché', x: 'Panne du serveur : les plaintes s’encodent à nouveau à la main.', a: 'Remplacer le serveur' },
    { t: 'Bornes d’accueil vandalisées', x: 'Les bornes de prise de numéro ont été cassées pendant une nuit agitée.', a: 'Les remplacer' },
  ],
};
const BATIMENT = {
  bureaux: [
    { t: 'Le deuxième étage doit être rénové', x: 'L’inspection du travail a fermé un plateau de bureaux en attendant les travaux.', a: 'Payer la rénovation' },
    { t: 'Chauffage en panne dans une aile', x: 'La chaudière d’une aile a rendu l’âme : les bureaux sont inutilisables cet hiver.', a: 'Remplacer la chaudière' },
  ],
  garage: [
    { t: 'La toiture du garage fuit', x: 'Deux places sont condamnées en attendant les travaux.', a: 'Payer l’entretien' },
    { t: 'Le pont élévateur est hors d’usage', x: 'Le contrôle de sécurité l’a interdit : une partie du garage est à l’arrêt.', a: 'Le faire réparer' },
  ],
};

/** Libellé de l'effet : « Formation Intervention 4 → 3 ». */
export function libelleCas(c) {
  const nom = c.k === 'niveaux' ? `Formation ${SERVICE_LABELS[c.s]}` : c.k === 'equip' ? `Matériel ${SERVICE_LABELS[c.s]}` : BATIMENTS[c.s].nom;
  return `${nom} ${c.de} → ${c.de - 1}`;
}

/**
 * Cas de fin de saison d'une zone (pur, déterministe). `moy` : moyennesDistrict().
 * Retourne { gagnes, moyenne, cas: [{ id, k, s, de, prix, t, x, a, etat }] }.
 */
export function calculerBilan(z, moy, seed) {
  const rng = makeRng(seed);
  const gagnes = niveauxGagnes(z);
  const nb = Math.min(Math.round(BILAN.plafondCas * gagnes), Math.round(BILAN.part * gagnes + BILAN.surplus * Math.max(0, gagnes - (moy.total || 0))));
  const etat = elementsZone(z).map((it) => ({ ...it, pris: 0 }));
  const hp = (z.batiments && z.batiments.bureaux) || 1;
  const vus = {};
  const cas = [];
  for (let i = 0; i < nb; i++) {
    const cand = etat
      .filter((it) => it.n > 1 && it.pris < BILAN.maxParElement && !(it.s === 'bureaux' && hp >= BILAN.hpProtege && it.n <= BILAN.hpProtege))
      .map((it) => ({ it, e: it.n - (moy[cle(it)] || 1) + rng.next() * 0.4 }))
      .sort((a, b) => b.e - a.e);
    if (!cand.length) break;
    const it = cand[0].it;
    // Récit : on évite de raconter deux fois la même histoire dans un bilan.
    const pool = it.k === 'niveaux' ? FORMATION : it.k === 'equip' ? MATERIEL[it.s] : BATIMENT[it.s];
    const libres = pool.map((_, j) => j).filter((j) => !vus[`${it.k}:${it.s}:${j}`] && !(it.k === 'niveaux' && vus[`niveaux:*:${j}`]));
    const j = libres.length ? libres[Math.floor(rng.next() * libres.length)] : Math.floor(rng.next() * pool.length);
    vus[`${it.k}:${it.s}:${j}`] = true; if (it.k === 'niveaux') vus[`niveaux:*:${j}`] = true;
    const r = pool[j];
    cas.push({ id: `b${i}`, k: it.k, s: it.s, de: it.n, prix: round1(prixNiveau(it.k, it.s, it.n) * BILAN.rachat), t: r.t, x: typeof r.x === 'function' ? r.x(it.s) : r.x, a: r.a, etat: null });
    it.n--; it.pris++;
  }
  return { gagnes, moyenne: round1(moy.total || 0), cas };
}

/** Applique les pertes du bilan à la nouvelle zone (niveaux d'avant moins les cas). */
export function appliquerBilan(nz, ancienne, b) {
  nz.niveaux = {}; nz.equip = {};
  for (const s of SERVICES) { nz.niveaux[s] = (ancienne.niveaux && ancienne.niveaux[s]) || 1; nz.equip[s] = (ancienne.equip && ancienne.equip[s]) || 1; }
  const ab = ancienne.batiments || {};
  nz.batiments = { bureaux: ab.bureaux || 1, garage: ab.garage || 1 };
  for (const c of b.cas) {
    if (c.k === 'batiments') nz.batiments[c.s] = Math.max(1, nz.batiments[c.s] - 1);
    else nz[c.k][c.s] = Math.max(1, nz[c.k][c.s] - 1);
  }
}

/** Nombre de remises en état permises. */
export const maxRemises = (b) => (b && b.cas.length ? Math.max(1, Math.floor(b.cas.length * BILAN.plafond)) : 0);
/** Bilan encore ouvert aux choix ce tour-ci. */
export function bilanOuvert(z, turn) {
  const b = z && z.bilan;
  return !!(b && !b.clos && turn <= b.fin && b.cas.some((c) => !c.etat));
}

/** Lecture sûre du choix envoyé dans les ordres : { idCas: 'paye' | 'accepte' }. */
export function lireOrdresBilan(o) {
  if (!o || !o.bilan || typeof o.bilan !== 'object' || Array.isArray(o.bilan)) return {};
  const out = {};
  for (const [id, v] of Object.entries(o.bilan).slice(0, 20)) if (/^b\d{1,2}$/.test(id) && (v === 'paye' || v === 'accepte')) out[id] = v;
  return Object.keys(out).length ? { bilan: out } : {};
}

/** Coût (k€) des remises en état choisies dans un brouillon d'ordres (pour l'affichage). */
export function coutBilan(z, choix) {
  const b = z && z.bilan;
  if (!b || !choix) return 0;
  return round1(b.cas.filter((c) => !c.etat && choix[c.id] === 'paye').reduce((a, c) => a + c.prix, 0));
}

/**
 * Au début de la résolution d'un tour : remises en état payées, cas acceptés ;
 * au dernier soir, ce qui reste sans réponse est accepté.
 */
export function resoudreBilan(z, ordre, T) {
  const b = z.bilan;
  if (!b || b.clos) return;
  const choix = (ordre && ordre.bilan) || {};
  const max = maxRemises(b);
  for (const c of b.cas) {
    if (c.etat || !choix[c.id]) continue;
    if (choix[c.id] === 'accepte') { c.etat = 'accepte'; continue; }
    const deja = b.cas.filter((x) => x.etat === 'paye').length;
    if (deja >= max) { z.rapport.push(`Bilan de saison : « ${c.t} » n’a pas pu être remis en état (${max} remise${max > 1 ? 's' : ''} au maximum).`); continue; }
    if (z.budget < c.prix) { z.rapport.push(`Bilan de saison : budget insuffisant pour « ${c.a.toLowerCase()} » (${c.prix} k€). Tu peux réessayer demain.`); continue; }
    z.budget = round1(z.budget - c.prix);
    if (z._compta) z._compta.push({ k: 'bilan', l: `Bilan de saison : ${c.a.toLowerCase()}`, v: -c.prix });
    if (c.k === 'batiments') z.batiments[c.s] = Math.min(BATIMENT_MAX, z.batiments[c.s] + 1);
    else z[c.k][c.s] = Math.min(NIVEAU_MAX, z[c.k][c.s] + 1);
    c.etat = 'paye';
    z.rapport.push(`Bilan de saison : ${c.a.toLowerCase()} (${c.prix} k€). ${libelleCas(c).replace(/ (\d) → \d$/, ' de nouveau au niveau $1')}.`);
  }
  if (T >= b.fin) {
    const restants = b.cas.filter((c) => !c.etat);
    for (const c of restants) c.etat = 'accepte';
    if (restants.length) z.rapport.push(`Bilan de saison clos : ${restants.length} cas sans réponse accepté${restants.length > 1 ? 's' : ''}.`);
    b.clos = true;
  } else if (b.cas.every((c) => c.etat)) b.clos = true;
}
