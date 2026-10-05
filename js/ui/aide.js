// Aides rapides (bouton « ? ») : l'essentiel d'une jauge en quelques lignes, sans ouvrir le guide.
import { esc, fmt1, myZone } from './common.js';
import { IPZ_POIDS, START, ECONOMIE, SUBSIDE, TERRAIN, FLAGRANT, DOSSIER, ND, BUDGET_IPZ, scoreBudget, MORAL_PALIERS, MORAL } from '../engine/constants.js';
import { confianceCommune, pointsIpz, IPZ_LABELS, moralMult } from '../engine/zone.js';
import { PERIL } from '../engine/rivalites.js';

const pc = (w) => `${Math.round(w * 100)} %`;
const k2 = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

export const AIDES = {
  ciel: {
    titre: 'Le ciel du jour',
    intro: 'Le Directeur, maître du jeu invisible, rythme ce qui arrive à ta zone. Le ciel te dit à quoi t’attendre aujourd’hui.',
    lignes: [
      '<strong>Ciel clair</strong> : journée calme, le bon moment pour investir, former ou rattraper le retard',
      '<strong>Ciel chargé</strong> : surveille les signes dans la situation du jour ; des tracas sont possibles (un Accueil fourni en évite)',
      '<strong>Orage</strong> : grosse journée (opération d’envergure, coup dur ou feuilleton décisif). Évite le rythme renforcé, soigne ton Accueil',
      '<strong>Éclaircie</strong> : après l’orage, rien de grave, de bonnes nouvelles possibles',
      '<strong>Les coups durs visent tes faiblesses</strong> (Intervention pas formée, moral bas, paperasse, pas de logiciel) : le rapport dit pourquoi',
      '<strong>Équitable</strong> : les zones en tête sont testées par des défis qui rapportent, celles en difficulté ont plus d’éclaircies',
    ],
    guide: 'guide-imprevus',
    sansTour: true,
  },
  voisinage: {
    titre: 'Enquête de voisinage',
    intro: 'Chaque soir, tes agents de Recherche font du porte-à-porte autour de l’affaire. Ils peuvent ramener une pièce de plus au dossier.',
    lignes: [
      '<strong>Plus d’agents en Recherche</strong> (dans tes ordres) : plus de chances de ramener une pièce',
      '<strong>La piste</strong> : donne-la depuis la fiche d’un suspect pour concentrer les recherches sur lui, jusqu’à plus d’une pièce par soir. Tu la retires au même endroit',
      'Résultat à 20:00, avec le reste du tour',
    ],
    guide: 'guide-enquete',
    sansTour: true,
  },
  appui: {
    titre: 'Appui fédéral (PJF)',
    intro: 'Une fois par jour, tu peux demander une équipe fédérale pour le lendemain.',
    lignes: [
      '<strong>Labo</strong> (traces, empreintes, ADN) : trouve plutôt les moyens d’un suspect',
      '<strong>RCCU</strong> (téléphones, ordinateurs, comptes en ligne) : trouve plutôt le mobile et l’occasion',
      '<strong>Places limitées</strong> : les équipes sont partagées entre toutes les zones et leur nombre change chaque jour. Réponse à 20:00',
      '<strong>Refusé ?</strong> Tu passes en priorité la fois suivante',
      '<strong>Accordé</strong> : l’équipe est sur place le lendemain, avec un mini-jeu à réussir en un seul essai pour obtenir la pièce',
      '<strong>Nombre d’experts</strong> : 2 de base, +1 si une autre équipe est restée libre ce soir-là (peu de demandes), +1 si ta Recherche est renforcée (150 % de la base ou plus), −1 si elle est en sous-effectif (moins de 70 %). 1 expert : mini-jeu difficile · 2 : normal · 3 : facile',
    ],
    guide: 'guide-enquete',
    sansTour: true,
  },
  ipz: {
    titre: 'IPZ · Indice de performance de zone',
    intro: 'Ton score du jour, sur 100, recalculé à chaque tour à 20:00. La moyenne de tes IPZ fait ton classement de la saison (dès 5 tours joués).',
    lignes: [
      `<strong>Satisfaction</strong> citoyenne : ${pc(IPZ_POIDS.satisfaction)}`,
      `<strong>Résultats</strong> : ${pc(IPZ_POIDS.affaires)} (part des incidents traités + points gagnés dans la journée)`,
      `<strong>Moral</strong> : ${pc(IPZ_POIDS.moral)}`,
      `<strong>Budget</strong> : ${pc(IPZ_POIDS.budget)} (0 k€ = 50/100, chaque k€ en plus ou en moins compte)`,
      `<strong>Réputation</strong> : ${pc(IPZ_POIDS.reputation)}`,
    ],
    conseil: 'Le levier principal : traiter tous les incidents et garder les citoyens contents.',
    guide: 'guide-zone',
  },
  moral: {
    titre: 'Moral des troupes',
    intro: 'La jauge qui pèse sur tout : elle multiplie l’efficacité de tous tes agents.',
    lignes: [
      '<strong>Efficacité</strong> : 100 % à 67 de moral ; chaque point au-dessus ajoute 1,5 %, chaque point en dessous retire 0,6 %. Elle vaut pour <em>tous</em> tes agents et tous les services (incidents, Proximité, dossiers, amendes, paperasse, force engagée dans la zone de non-droit)',
      `<strong>Repères</strong> : ${[30, 40, 50, 60, 67, 74, 80, 90, 100].map((m) => `${m} → ${Math.round(moralMult(m) * 100)} %`).join(' · ')}`,
      '<strong>Point neutre</strong> : à 67 de moral, tes agents sont à 100 %. Un moral haut paie vraiment (120 % à 80), mais il se mérite',
      '<strong>Dans le rapport du soir</strong> : la ligne « Moral … au moment du travail : efficacité … % » donne le moral réellement appliqué (après les aléas, énigmes et primes du jour)',
      '<strong>Sous 40</strong> : 10 % des agents restent absents',
      '<strong>Sous 20</strong> : un agent démissionne à chaque tour',
      `<strong>Sous ${PERIL.moral}</strong> : ta zone passe en péril (risque de faillite)`,
      `<strong>IPZ</strong> : compte pour ${pc(IPZ_POIDS.moral)} · au-dessus de 70, moins de grippes et de débauchages`,
      `<strong>Chaque soir</strong> : il revient vers ${MORAL.cible}, d’autant plus vite qu’il est haut : ${MORAL.retour.map(([m, t], i) => `${m}-${(MORAL.retour[i + 1] || [100])[0]} → ${Math.round(t * 100)} % de l’écart`).join(' · ')} ; sous ${MORAL.cible}, il remonte de ${Math.round(MORAL.retourBas * 100)} % de l’écart`,
      `<strong>Bonus de moral</strong> (prime, énigmes, incident réussi) : plein effet sous ${MORAL_PALIERS[0]}, moitié de ${MORAL_PALIERS[0]} à ${MORAL_PALIERS[1]}, +1 au-delà. Une équipe déjà gonflée à bloc se motive moins facilement`,
      '<strong>Rythme</strong> : renforcé −6, allégé +5 · <strong>budget négatif</strong> : −3 · <strong>3 incidents ratés ou plus</strong> : −2',
    ],
    monte: 'rythme allégé, prime, salle de sport, succès',
    baisse: 'rythme renforcé, incidents ratés, budget négatif, erreurs aux énigmes, coups durs',
    guide: 'guide-zone',
  },
  satisfaction: {
    titre: 'Satisfaction citoyenne',
    intro: 'Ce que la population pense de ta zone. C’est la plus grosse part de ton IPZ.',
    lignes: [
      `<strong>IPZ</strong> : compte pour ${pc(IPZ_POIDS.satisfaction)}, le poids le plus lourd`,
      '<strong>Chaque incident raté</strong> : −1,8',
      '<strong>Chaque incident traité</strong> : +0,5',
      '<strong>Proximité</strong> : +0,12 par point de capacité ; <strong>Roulage</strong> : +0,1 par point de capacité',
      '<strong>Quartiers au-dessus de 55 de tension</strong> : elle baisse chaque jour',
      '<strong>Dossier élucidé</strong> : +2 ; <strong>dossier de plus de 6 jours</strong> : −0,4 chacun, chaque jour',
      '<strong>Chaque soir</strong> : elle revient vers 50. En dessous, de 4 % de l’écart ; au-dessus, d’autant plus vite qu’elle est haute : 4 % jusqu’à 60, 6 % de 60 à 70, 10 % de 70 à 80, 15 % de 80 à 90, 20 % au-delà',
      '<strong>Roulage au-delà de 25 % des effectifs</strong> (40 % avec les caméras) : « chasse aux PV », −2',
    ],
    monte: 'incidents traités, Proximité, dossiers élucidés, opérations et FIPA réussies, arrestations',
    baisse: 'incidents ratés, criminalité élevée, vieux dossiers, fiascos, FIPA ratées',
    guide: 'guide-zone',
  },
  reputation: {
    titre: 'Réputation',
    intro: 'Ce que les collègues et les autorités (commune, parquet) pensent de ta zone. C’est la jauge de la coopération, et elle rapporte.',
    lignes: [
      `<strong>IPZ</strong> : compte pour ${pc(IPZ_POIDS.reputation)}`,
      '<strong>Confiance de la commune</strong> : au-dessus de 50, un bonus de budget chaque tour ; en dessous, un malus',
      '<strong>Recrues</strong> : moins chères à 65 et plus, plus chères sous 35',
      '<strong>Salle des ventes</strong> : lots réservés à 60 et plus, et la réputation départage les égalités',
      '<strong>Au-dessus de 60</strong> : moins de plaintes contre ta zone',
      '<strong>Chaque soir</strong> : elle revient vers 50. En dessous, de 3 % de l’écart ; au-dessus : 3 % jusqu’à 60, 5 % de 60 à 70, 8 % de 70 à 80, 12 % de 80 à 90, 16 % au-delà',
    ],
    monte: 'partager des indices, coup de main à une zone en difficulté, FIPA partagées, renforts, secteurs repris à plusieurs, arrestations',
    baisse: 'fausses accusations, blâme du Conseil, fiascos',
    guide: 'guide-zone',
  },
  budget: {
    titre: 'Budget',
    intro: 'Touche la tuile Budget de l’HP pour voir le détail : ce qui rentre, ce qui sort, et la prévision de ce soir.',
    lignes: [
      `<strong>Recettes</strong> : dotation fédérale (${ECONOMIE.dotation} k€), subside communal (par agent au-delà de l’effectif de départ), confiance de la commune selon ta réputation, amendes du Roulage`,
      `<strong>Frais fixes</strong> : salaires (${String(ECONOMIE.salaire).replace('.', ',')} k€ par agent), entretien des véhicules, des bâtiments et des annexes`,
      '<strong>Choix du jour</strong> : dépenses, grande décision, démarches d’enquête',
      '<strong>Deux tours de suite en négatif</strong> : Inspection générale, 5 k€ d’amende et −5 de satisfaction',
      `<strong>Sous ${PERIL.budget} k€</strong> : ta zone passe en péril`,
    ],
    guide: 'guide-zone',
  },
  confiance: {
    titre: 'Confiance de la commune',
    intro: 'La commune verse (ou retient) un montant chaque soir selon ta réputation. C’est une ligne de ton budget, pas une jauge à part.',
    lignes: [
      `<strong>Calcul</strong> : au-dessus de 50, (réputation − 50) × ${k2(SUBSIDE.confiance)} k€ ; en dessous, × ${k2(SUBSIDE.confianceMalus)} k€ seulement`,
      `<strong>Exemples</strong> : réputation 80 → +${k2(30 * SUBSIDE.confiance)} k€ · 50 → 0 · 30 → −${k2(20 * SUBSIDE.confianceMalus)} k€ · 100 → +${k2(50 * SUBSIDE.confiance)} k€`,
      '<strong>Réputation prise en compte</strong> : celle du moment où le budget est calculé à 20:00, après les affaires, l’entraide et l’enquête du soir, mais avant le retour naturel vers 50',
    ],
    conseil: 'Pour la faire monter : monter ta réputation (partages d’indices, entraide, renforts, zone de non-droit à plusieurs).',
    guide: 'guide-zone',
  },
  terrain: {
    titre: 'Résultats terrain',
    intro: `La composante « terrain » de l’IPZ (${pc(IPZ_POIDS.affaires)}). Ce ne sont pas les PS, qui servent aux grades.`,
    lignes: [
      `<strong>Calcul</strong> : ${TERRAIN.incidents} × part des incidents traités + ${TERRAIN.parPoint} × bilan, plafonné à 100`,
      `<strong>Incidents</strong> : tout traiter donne déjà ${TERRAIN.incidents} ; en rater la moitié n’en donne que ${fmt1(TERRAIN.incidents / 2)}`,
      `<strong>Bilan</strong> = points du jour + ${pc(TERRAIN.report)} du bilan d’hier. Un gros coup compte encore les jours suivants ; en régime régulier, le bilan vaut environ 2 × tes points par jour`,
      `<strong>Recherche</strong> : +${String(DOSSIER.ptsParUnite).replace('.', ',')} pt par unité de travail sur les dossiers, chaque jour (un nouveau dossier arrive chaque jour, il y a toujours du travail). Repère : 4 enquêteurs ≈ +2 pts par jour`,
      `<strong>Flagrant délit</strong> : +${FLAGRANT.points} pts quand la jauge des patrouilles libres atteint 100 % (+${Math.round(FLAGRANT.parUnite * 100)} % par unité de marge après les incidents, ${Math.round(FLAGRANT.max * 100)} % au plus par jour) : plus de tirage au sort`,
      `<strong>Zone de non-droit</strong> : reprise d’un secteur +${String(ND.prise.points).replace('.', ',')} pts + jusqu’à ${ND.prise.pointsPart} selon ta part ; chaque nuit où tu le tiens, +${String(ND.retombees.points).replace('.', ',')} à +${String(Math.round((ND.retombees.points + ND.retombees.pointsPart) * 100) / 100).replace('.', ',')} ; le Cœur compte ×${String(ND.coeurMult).replace('.', ',')}`,
      '<strong>Opération d’envergure</strong> : ses points annoncés si le dispositif est complet (90 % ou plus), 40 % s’il est partiel',
      '<strong>Enquête</strong> : pièce de voisinage +2, bonne accusation +8, arrestation +6',
    ],
    conseil: `D’abord assez d’Intervention pour ne rater aucun incident (c’est ${TERRAIN.incidents} sur 100), puis de la Recherche pour des points réguliers, et la zone de non-droit à plusieurs pour les gros coups.`,
    guide: 'guide-zone',
  },
  budgetIpz: {
    titre: 'Budget dans l’IPZ',
    intro: 'La composante « budget » de l’IPZ (10 %) : elle regarde ton solde à la fin du tour, pas tes dépenses du jour.',
    lignes: [
      `<strong>Calcul</strong> : 50 + 1,5 × budget en k€, entre 0 et 100 (100 dès 34 k€)`,
      `<strong>Argent qui dort</strong> : au-delà de ${BUDGET_IPZ.dormant} k€, −${BUDGET_IPZ.pente} point par k€ en plus (jusqu’à ${BUDGET_IPZ.plancher} au minimum). La commune juge qu’une zone qui ne dépense pas son argent est trop dotée`,
      `<strong>Exemples</strong> : −10 k€ → 35 · 0 k€ → 50 · 20 k€ → 80 · de 34 à ${BUDGET_IPZ.dormant} k€ → 100 · ${BUDGET_IPZ.dormant + 20} k€ → ${scoreBudget(BUDGET_IPZ.dormant + 20)} · ${BUDGET_IPZ.dormant + 50} k€ et plus → ${BUDGET_IPZ.plancher}`,
      `<strong>Le bon réflexe</strong> : garder une réserve de 35 à ${BUDGET_IPZ.dormant} k€ et investir le reste (agents de réserve, prévention, formation, matériel, bâtiments)`,
    ],
    guide: 'guide-zone',
  },
};

// ───── « Ton dernier tour » : le calcul réel, avec les chiffres de ta zone ─────
const sgn = (v) => `${v >= 0 ? '+' : '−'}${fmt1(Math.abs(v))}`;
const cls = (v) => (v > 0 ? 'ok' : v < 0 ? 'bad' : 'muted');
const ligne = (l, v, unite = '') => `<div class="between small aide-l"><span>${l}</span><span class="mono ${cls(v)}">${sgn(v)}${unite}</span></div>`;
const calc = (l, r) => `<div class="between small aide-l"><span>${l}</span><span class="mono">${r}</span></div>`;
const JAUGES = { moral: 'Moral', satisfaction: 'Satisfaction', reputation: 'Réputation' };
const COMP = { moral: 'moral', satisfaction: 'satisfaction', reputation: 'reputation', terrain: 'affaires', budgetIpz: 'budget' };

function partIpz(z, k) {
  const c = COMP[k];
  if (!c || !z.ipzComp) return '';
  const pts = pointsIpz(z.ipzComp)[c];
  return calc(`Dans l’IPZ : ${fmt1(z.ipzComp[c])} × ${pc(IPZ_POIDS[c])}`, `<strong>${fmt1(pts)} pts</strong>`);
}

function tourJauge(z, k) {
  const j = z.journal;
  if (!j || !j.lignes) return null;
  const l = (j.lignes[k] || []).slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const av = j.avant && j.avant[k], ap = j.apres && j.apres[k];
  return { tour: j.tour, html: `${av !== undefined ? calc('Avant le tour', fmt1(av)) : ''}
    ${l.length ? l.map((x) => ligne(esc(x.l), x.v)).join('') : '<p class="tiny muted" style="margin:0">Aucun changement ce tour-là.</p>'}
    ${ap !== undefined ? calc('<strong>Après le tour</strong>', `<strong>${fmt1(ap)}</strong>`) : ''}
    ${k === 'moral' && z.efficaciteMoral ? calc(`Efficacité appliquée ce tour-là (moral ${fmt1(z.efficaciteMoral.moral)} au moment du travail)`, `<strong>${Math.round(z.efficaciteMoral.mult * 100)} %</strong>`) : ''}
    ${k === 'moral' ? calc(`Efficacité pour demain (moral ${fmt1(z.moral)})`, `<strong>${Math.round(moralMult(z.moral) * 100)} %</strong>`) : ''}
    ${partIpz(z, k)}` };
}

function tourTerrain(z) {
  const d = z.ipzDetail;
  if (!d || !z.ipzComp) return null;
  const ratio = d.incidents ? d.traites / d.incidents : 1;
  const bilan = d.bilan !== undefined ? d.bilan : (d.points || 0);
  // Coefficients du tour calculé (un tour calculé par une ancienne version garde sa règle d'alors).
  const ancien = d.bilan === undefined;
  const ci = d.coefInc || (ancien ? 60 : TERRAIN.incidents), cp = d.coefPt || (ancien ? 6 : TERRAIN.parPoint);
  const a = ci * ratio, b = cp * bilan, brut = a + b;
  const pts = (z.journal && z.journal.lignes && z.journal.lignes.points) || [];
  return { tour: z.journal ? z.journal.tour : null, html: `
    ${ancien || ci !== TERRAIN.incidents || cp !== TERRAIN.parPoint ? `<p class="tiny muted" style="margin:0">Ce tour-là a été calculé avec l’ancienne règle (${ci} × incidents + ${String(cp).replace('.', ',')} × bilan). La règle actuelle est expliquée plus bas.</p>` : ''}
    ${calc(`Incidents traités : ${d.traites} sur ${d.incidents}`, `${ci} × ${Math.round(ratio * 100)} % = ${fmt1(a)}`)}
    ${calc(`Points gagnés ce jour-là`, `+${fmt1(d.points || 0)}`)}
    ${pts.length ? `<div class="aide-sous">${pts.slice().sort((x, y) => y.v - x.v).map((x) => ligne(esc(x.l), x.v, ' pt')).join('')}</div>` : ''}
    ${d.report !== undefined ? calc('Reporté du bilan de la veille (moitié)', `+${fmt1(d.report)}`) : ''}
    ${calc(`Bilan : ${fmt1(bilan)}`, `${String(cp).replace('.', ',')} × ${fmt1(bilan)} = ${fmt1(b)}`)}
    ${calc('Total', `${fmt1(brut)}${brut > 100 ? ' → plafonné à 100' : ''}`)}
    ${partIpz(z, 'terrain')}
    <div class="aide-l between small" style="margin-top:4px"><span>Jauge de flagrant délit</span><span class="mono">${Math.round((z.jaugeFlagrant || 0) * 100)} %</span></div>
    <div class="aide-l between small"><span>Demain, sans nouveau point, ton bilan vaudra encore</span><span class="mono">${fmt1(bilan * TERRAIN.report)}</span></div>` };
}

function tourBudget(z, pourIpz) {
  const c = z.compta;
  const d = z.ipzDetail;
  if (!c && !d) return null;
  const b = d && d.budget !== undefined ? d.budget : z.budget;
  const rel = c && c.lignes ? `${calc('Début du tour', `${fmt1(c.debut)} k€`)}
    ${c.lignes.slice().sort((x, y) => y.v - x.v).map((x) => ligne(esc(x.l), x.v, ' k€')).join('')}
    ${calc('<strong>Fin du tour</strong>', `<strong>${fmt1(c.fin)} k€</strong>`)}` : '';
  const brut = 50 + 1.5 * b, dort = b > BUDGET_IPZ.dormant;
  const ipz = pourIpz && z.ipzComp ? `${dort
    ? calc(`Argent qui dort : ${fmt1(b)} k€, soit ${fmt1(b - BUDGET_IPZ.dormant)} au-delà de ${BUDGET_IPZ.dormant}`, `100 − ${fmt1(BUDGET_IPZ.pente * (b - BUDGET_IPZ.dormant))} = ${fmt1(scoreBudget(b))}`)
    : calc(`50 + 1,5 × ${fmt1(b)} k€`, `${fmt1(brut)}${brut > 100 ? ' → 100' : brut < 0 ? ' → 0' : ''}`)}${partIpz(z, 'budgetIpz')}` : '';
  return { tour: c ? c.tour : z.journal && z.journal.tour, html: pourIpz ? `${ipz}${rel ? `<details class="aide-det"><summary class="small">D’où vient ce solde</summary>${rel}</details>` : ''}` : rel };
}

function tourConfiance(z) {
  const c = z.compta;
  const l = c && c.lignes && c.lignes.find((x) => x.k === 'confiance');
  const prev = confianceCommune(z);
  const coefL = l && l.v < 0 ? SUBSIDE.confianceMalus : SUBSIDE.confiance;
  const passe = c ? (l ? `${calc(`Réputation au calcul du budget : ${fmt1(50 + l.v / coefL)} environ`, `(${fmt1(50 + l.v / coefL)} − 50) × ${k2(coefL)}`)}${ligne('Versé par la commune', l.v, ' k€')}`
    : calc('Réputation proche de 50', '0 k€')) : '';
  return { tour: c ? c.tour : null, html: `${passe}
    <div class="aide-l between small" style="margin-top:4px"><span>Ce soir, avec ta réputation actuelle (${fmt1(z.reputation)})</span><span class="mono ${cls(prev)}">${sgn(prev)} k€</span></div>
    <p class="tiny muted" style="margin:0">Prévision : la réputation peut encore bouger avant le calcul de 20:00.</p>` };
}

function tourIpz(z) {
  if (!z.ipzComp) return null;
  const pts = pointsIpz(z.ipzComp);
  return { tour: z.journal && z.journal.tour, html: `${Object.keys(IPZ_POIDS).map((c) => calc(`${IPZ_LABELS[c]} : ${fmt1(z.ipzComp[c])} × ${pc(IPZ_POIDS[c])}`, `${fmt1(pts[c])}`)).join('')}
    ${calc('<strong>IPZ</strong>', `<strong>${fmt1(z.ipz)}</strong>`)}` };
}

/** Bloc « Ton dernier tour » de l'aide `k`, ou '' si rien à montrer. */
function dernierTourHtml(k) {
  let z = null;
  try { z = myZone(); } catch (e) { return ''; }
  if (!z) return '';
  const t = JAUGES[k] ? tourJauge(z, k) : k === 'terrain' ? tourTerrain(z) : k === 'budgetIpz' ? tourBudget(z, true) : k === 'budget' ? tourBudget(z, false)
    : k === 'confiance' ? tourConfiance(z) : k === 'ipz' ? tourIpz(z) : null;
  if (!t) return `<div class="aide-tour"><span class="kicker">Ton dernier tour</span><p class="tiny muted" style="margin:0">Le calcul détaillé apparaîtra ici après la prochaine résolution de 20:00.</p></div>`;
  return `<div class="aide-tour"><span class="kicker">Ton dernier tour${t.tour ? ` · tour ${t.tour}` : ''} : le calcul</span>${t.html}</div>`;
}

/** Petit bouton « ? » qui ouvre l'aide rapide. */
export function aideBtn(k, label) {
  return `<button type="button" class="help" data-action="aide" data-k="${k}" aria-label="${esc(label || `Aide : ${AIDES[k].titre}`)}">?</button>`;
}

/** Fenêtre d'aide, posée en haut de l'écran. */
export function ouvrirAide(k) {
  const a = AIDES[k];
  if (!a) return;
  document.querySelector('.aide-wrap')?.remove();
  const retour = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="aide-titre">
    <div class="between" style="align-items:flex-start"><h2 id="aide-titre" class="aide-titre">${a.titre}</h2>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <p class="aide-intro">${a.intro}</p>
    ${a.sansTour ? '' : dernierTourHtml(k)}
    <span class="kicker" style="margin-top:2px">La règle</span>
    <ul class="aide-liste">${a.lignes.map((l) => `<li>${l}</li>`).join('')}</ul>
    ${a.monte ? `<div class="aide-sens"><span class="up">▲ Monte</span><span>${a.monte}</span><span class="down">▼ Baisse</span><span>${a.baisse}</span></div>` : ''}
    ${a.conseil ? `<p class="aide-conseil">${a.conseil}</p>` : ''}
    <a class="small" href="#${a.guide}" data-close>Tout le détail dans le guide</a>
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); if (retour && retour.focus) retour.focus(); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) { fermer(); return; }
    const c = e.target.closest('[data-close]');
    if (c) { e.stopPropagation(); if (c.tagName !== 'A') e.preventDefault(); fermer(); }
  });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
  wrap.querySelector('[data-close]').focus();
}
