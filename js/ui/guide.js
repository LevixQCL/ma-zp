// Guide du joueur (wiki intégré). Les chiffres viennent directement du moteur,
// pour que le guide reste exact quand l'équilibrage change.
import { S, esc, icon, tabbar } from './common.js';
import {
  SERVICE_LABELS, SEASON_LENGTH, START, DEFAULT_ALLOC, ECONOMIE, COUTS, DEPENSES, DELAI_ACADEMIE, DUREE_FORMATION,
  INFRAS, RYTHMES, GRADES, PS, IPZ_POIDS, MIN_TOURS_CLASSEMENT, NIVEAU_MAX, RENFORT, BATIMENTS, BATIMENT_MAX, TRAVAUX_TOURS, ENTRETIEN_ANNEXE, PEREQUATION, SUBSIDE, REPUTATION, ENCHERE, LOTS, TUTELLE } from '../engine/constants.js';
import { OPERATIONS, PRESSIONS, COUPS_DURS } from '../engine/contenu.js';
import { ENQ, DEMARCHES, POINTS, pointsDecouverte } from '../engine/enquete.js';
import { PARTAGE, FIPA } from '../engine/fipa.js';
import { QUEST_LABELS } from '../quests/quests.js';
import { MANOEUVRES, MAN, DUEL, DUEL_INDICATEURS, AIDE, THEMES, MOTIONS_CHEF, PERIL } from '../engine/rivalites.js';

const k = (v) => `${String(v).replace('.', ',')} k€`;
const pc = (v) => `${Math.round(v * 100)} %`;
const table = (head, rows) => `<div class="gtable"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const ol = (items) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
const note = (t) => `<p class="gnote">${t}</p>`;

export function sections() {
  const besoinsOp = (b) => Object.entries(b).map(([s, n]) => `${n} ${SERVICE_LABELS[s]}`).join(', ');
  return [
    {
      id: 'debut', titre: 'Premiers pas', html: `
        <p>Tu diriges une zone de police fictive du District Delta. Chaque jour, tu donnes tes ordres ; <strong>tous les tours sont résolus en même temps à 20:00</strong> (heure belge). Personne n'est avantagé parce qu'il a joué plus tôt ou plus vite.</p>
        <h3>Chaque jour, en cinq minutes</h3>
        ${ol([
          '<strong>Lis la Gazette</strong> de la veille et ton rapport : ce qui s’est passé chez toi et dans le district.',
          '<strong>Passe tes ordres</strong> : répartis tes agents entre les cinq services, choisis ton rythme, éventuellement une grande décision et des dépenses du jour.',
          '<strong>Avance l’enquête</strong> : lance jusqu’à deux démarches, partage des indices, accuse quand tu es sûr.',
          '<strong>Résous tes trois énigmes du jour</strong> : trois petits casse-tête, une seule réponse chacun.',
          'Réponds aux <strong>FIPA</strong> et aux collègues sur la <strong>Radio</strong> si besoin.',
        ])}
        <p>Tu peux modifier tes ordres autant de fois que tu veux jusqu'à 20:00. Si tu oublies un jour, le <strong>pilote automatique</strong> reprend ta dernière répartition (voir « Absences »).</p>
        <h3>Les écrans</h3>
        ${table(['Onglet', 'À quoi il sert'], [
          ['HP', 'Hôtel de police : compte à rebours, état de ta zone, situation du jour, FIPA, enquête, alertes, rapport.'],
          ['Ordres', 'Répartition des agents, rythme, opérations, affaires disputées, grande décision, dépenses du jour.'],
          ['Enquête', 'L’affaire en cours : démarches, pièces, carnet, accusation, traque.'],
          ['Énigmes', 'Les trois énigmes du jour.'],
          ['Carte', 'Le plan de la ville, les territoires, les affaires disputées, la liste des zones.'],
          ['Radio', 'Messagerie commune entre tous les chefs de zone.'],
        ])}`,
    },
    {
      id: 'zone', titre: 'Ta zone et ses jauges', html: `
        <p>Chaque zone démarre avec ${START.agents} agents, ${k(START.budget)}, ${START.vehicules} véhicules, un moral de ${START.moral}, une satisfaction et une réputation de ${START.satisfaction}.</p>
        ${table(['Jauge', 'Ce qui la fait monter', 'Ce qui la fait baisser'], [
          ['<strong>Moral</strong> (0 à 100)', 'rythme allégé, prime, salle de sport, succès, bonnes nouvelles', 'rythme renforcé, incidents ratés en série, budget négatif, erreurs aux énigmes, coups durs'],
          ['<strong>Satisfaction</strong> citoyenne', 'incidents traités, Proximité, dossiers élucidés, opérations et FIPA réussies', 'incidents ratés, criminalité au-dessus de 55, vieux dossiers, « chasse aux PV », fiascos'],
          ['<strong>Réputation</strong> (collègues et autorités)', 'partager des indices, aider une zone en difficulté, affaires gagnées à deux, FIPA partagées, renforts, arrestations', 'fausses accusations, manœuvres (et scandale), blâme du Conseil, fiascos'],
          ['<strong>Budget</strong>', `dotation ${k(ECONOMIE.dotation)} par tour, subside communal (${k(SUBSIDE.parAgent)} par agent au-delà de ${SUBSIDE.seuil}), confiance de la commune, amendes du Roulage, primes`, `salaires (${k(ECONOMIE.salaire)} par agent), entretien (${k(ECONOMIE.entretienVehicule)} par véhicule), décisions, dépenses, démarches`],
          ['<strong>Criminalité</strong>', 'elle monte d’elle-même chaque jour', 'Proximité, campagne de prévention'],
          ['<strong>Paperasse</strong>', 'chaque incident traité et chaque nouveau dossier', 'Accueil et administration, sous-traitance, logiciel'],
        ])}
        <h3>Ce que rapporte la réputation</h3>
        ${ul([
          `<strong>Confiance de la commune</strong> : ${k(SUBSIDE.confiance)} par point au-dessus (ou en dessous) de 50, chaque tour. Réputation 80 : +${String(30 * SUBSIDE.confiance).replace('.', ',')} k€ ; réputation 20 : −${String(30 * SUBSIDE.confiance).replace('.', ',')} k€.`,
          `<strong>Recrutement</strong> : à ${REPUTATION.recrueHaute} ou plus, une recrue coûte ${k(REPUTATION.coutRecrueHaute)} au lieu de ${k(COUTS.recrue)} ; sous ${REPUTATION.recrueBasse}, elle coûte ${k(REPUTATION.coutRecrueBasse)}.`,
          `<strong>Salle des ventes</strong> : certains lots sont réservés aux zones de réputation ${ENCHERE.repReserve} ou plus, et la réputation départage les offres égales.`,
          `<strong>Scandale</strong> : une manœuvre ratée par une zone de réputation supérieure à ${REPUTATION.scandale} coûte ${REPUTATION.scandaleMalus} points de plus.`,
          'Au-dessus de 60, moins de plaintes contre ta zone ; en fin de saison, la meilleure réputation reçoit le titre « Collègue en or ».',
        ])}
        <p>Le moral multiplie l'efficacité de tous tes agents : de 60 % (moral 0) à 120 % (moral 100). Sous 40, 10 % des agents restent absents ; sous 20, un agent démissionne.</p>
        <h3>Logistique : les bâtiments</h3>
        <p>Chaque zone a un <strong>hôtel de police</strong> et un <strong>garage</strong>, du niveau 1 au niveau ${BATIMENT_MAX}. L’hôtel de police fixe le nombre d’agents que tu peux avoir (recrues à l’académie comprises), le garage le nombre de véhicules. Agrandir est une grande décision : ${TRAVAUX_TOURS} tour${TRAVAUX_TOURS > 1 ? 's' : ''} de travaux, puis un entretien plus élevé. En contrepartie, la commune verse un <strong>subside de ${k(SUBSIDE.parAgent)} par tour pour chaque agent au-delà de ${SUBSIDE.seuil}</strong> (la moitié de son salaire) : grandir coûte moins cher, sans être gratuit.</p>
        ${table(['Bâtiment', 'Capacité par niveau', 'Agrandir', 'Entretien par tour'], Object.values(BATIMENTS).map((B) => [B.nom, [1, 2, 3, 4, 5].map((n) => B.capacite(n)).join(' / ') + ' ' + B.unite, [1, 2, 3, 4].map((n) => B.coutAgrandir(n)).join(' / ') + ' k€', [1, 2, 3, 4, 5].map((n) => String(B.entretien(n)).replace('.', ',')).join(' / ') + ' k€']))}
        <p>Chaque annexe (salle de sport, logiciel, caméras…) coûte ${String(ENTRETIEN_ANNEXE).replace('.', ',')} k€ d’entretien par tour. Une zone nettement moins équipée que la moyenne du district reçoit une péréquation de ${String(PEREQUATION.montant).replace('.', ',')} k€ par tour. </p>
        <h3>Ton équipe et tes trophées</h3>
        <p>Cinq figures incarnent ta zone (une par service). Elles gagnent de l’expérience avec le travail de leur service et reçoivent des surnoms au fil des tours ; elles restent d’une saison à l’autre. Les trophées récompensent des exploits sur la durée (zéro incident raté pendant 7 tours, aide à une zone en péril, arrestation, saison sans manœuvre…) : ils sont visibles sur l’HP (« Mon équipe et mes trophées ») et dans la liste des zones de la Carte.</p>
        <h3>D’une saison à l’autre</h3>
        <p>À la fin de la saison, ta zone garde un <strong>héritage</strong> : les niveaux de formation des services et les bâtiments, chacun baissé d’un niveau (minimum 1), et toutes tes annexes (leur entretien continue). Le budget, les effectifs, les véhicules, l’équipement, le moral et les jauges repartent des valeurs de départ. Une décision dont l’effet tomberait après la fin de saison est signalée dans tes ordres.</p>
        <h3>L'IPZ, ton score du jour</h3>
        <p>L'Indice de performance de zone est calculé à chaque tour :</p>
        ${table(['Composante', 'Poids'], Object.entries(IPZ_POIDS).map(([c, w]) => [{ satisfaction: 'Satisfaction', affaires: 'Résultats (incidents traités et points gagnés)', moral: 'Moral', budget: 'Budget', reputation: 'Réputation' }[c], pc(w)]))}
        <p>La composante « Résultats » vaut 60 × la part d'incidents traités, plus 6 par point gagné dans la journée (dossiers, affaires disputées, opérations, découverte ou arrestation), plafonnée à 100.</p>`,
    },
    {
      id: 'ordres', titre: 'Les ordres et les cinq services', html: `
        <p>Tes agents disponibles (hors blessés, malades, formations) se répartissent entre cinq services. Répartition de départ : ${Object.entries(DEFAULT_ALLOC).map(([s, n]) => `${n} ${SERVICE_LABELS[s]}`).join(', ')}.</p>
        ${table(['Service', 'Son rôle'], [
          ['Intervention', 'Traite les incidents du jour (environ 1,1 de capacité par incident). Chaque incident raté coûte 1,8 de satisfaction. Limité par les véhicules : au-delà de 2,5 agents par véhicule, les agents en plus ne comptent qu’à moitié.'],
          ['Proximité', 'Fait baisser la criminalité (0,6 par unité de capacité) et soigne la satisfaction.'],
          ['Recherche', 'Élucide les dossiers locaux, qui rapportent des points ; alimente l’enquête de voisinage.'],
          ['Roulage', `Rapporte des amendes (${k(ECONOMIE.amendeParCapacite)} par unité de capacité). Au-delà de 6 agents, chaque agent de plus compte pour moitié. Au-delà de 25 % des effectifs (40 % avec les caméras) : effet « chasse aux PV », −2 de satisfaction.`],
          ['Accueil et administration', 'Écluse la paperasse. Au-delà de 14 dossiers : −2 de moral par tour ; au-delà de 20 : l’Inspection.'],
        ])}
        <p>La capacité d'un service dépend du nombre d'agents, de son niveau (1 à ${NIVEAU_MAX}), de son équipement (1 à ${NIVEAU_MAX}), du moral et du rythme.</p>
        <h3>Le rythme</h3>
        ${table(['Rythme', 'Effet'], Object.values(RYTHMES).map((r) => [r.label, `${r.mult === 1 ? 'efficacité normale' : `efficacité ${r.mult > 1 ? '+' : '−'}${Math.round(Math.abs(r.mult - 1) * 100)} %`}${r.moral ? `, ${r.moral > 0 ? '+' : ''}${r.moral} de moral` : ''}${r.cout ? `, ${k(r.cout)} d’heures supplémentaires` : ''}`]))}
        ${note('Trois tours de suite en rythme renforcé : risque d’épuisement, un agent absent 5 tours.')}
        <h3>La situation du jour</h3>
        <p>Annoncée dès le début du tour sur l'écran HP, elle change les besoins de ta zone : il faut donc adapter sa répartition. Une répartition figée finit toujours par coûter.</p>
        ${table(['Situation', 'Effet'], [...PRESSIONS.map((p) => [esc(p.titre), esc(p.texte)]), ['Nuit du week-end (vendredi et samedi)', '+2 incidents attendus.']])}
        <h3>Opérations d'envergure</h3>
        <p>Environ une fois tous les six jours, une grosse opération tombe dans ta zone. Les agents qu'elle mobilise quittent leur service. Tu choisis le dispositif : <strong>complet</strong> (tous les agents demandés), <strong>réduit</strong> (la moitié) ou <strong>aucun</strong>.</p>
        ${table(['Opération', 'Agents demandés', 'Durée', 'Points'], OPERATIONS.map((o) => [esc(o.titre), besoinsOp(o.besoins), `${o.duree} tour${o.duree > 1 ? 's' : ''}`, o.recompense]))}
        <p>Couverture moyenne d'au moins 90 % : réussite (points, +6 de satisfaction). Entre 50 et 90 % : réussite partielle. En dessous : fiasco (−10 de satisfaction, −4 de moral).</p>
        <p><strong>Appel à renfort</strong> : pendant l'opération, lance un appel sur la radio (bouton sur l'HP ou dans tes ordres, un par tour). Les autres zones peuvent te prêter jusqu'à ${RENFORT.maxParZone} agents chacune pour la journée, en l'inscrivant dans leurs ordres : ces agents comptent dans la couverture de ton dispositif. Chaque zone qui aide gagne +${RENFORT.repParAgent} de réputation par agent prêté (maximum +${RENFORT.repMax}) et +${RENFORT.ps} PS.</p>`,
    },
    {
      id: 'decisions', titre: 'Grande décision, dépenses et infrastructures', html: `
        <h3>La grande décision (une par tour)</h3>
        ${table(['Décision', 'Coût', 'Effet'], [
          ['Recruter (1 à 3)', `${k(COUTS.recrue)} par recrue`, `arrivée après ${DELAI_ACADEMIE} tours d’académie`],
          ['Former un service', k(COUTS.formation), `+1 niveau ; 2 agents indisponibles ${DUREE_FORMATION} tours`],
          ['Équiper un service', `${k(COUTS.equipementBase)}, puis +2 k€ par niveau`, '+15 % d’efficacité par niveau'],
          ['Acheter un véhicule', k(COUTS.vehicule), 'plus d’agents utiles en Intervention'],
          ['Construire', 'selon l’infrastructure', 'effet permanent (tableau ci-dessous)'],
        ])}
        <h3>Les dépenses du jour (cumulables)</h3>
        <p>Choisies pour un seul tour, payées à 20:00 si le budget le permet.</p>
        ${table(['Dépense', 'Coût', 'Effet'], Object.values(DEPENSES).map((d) => [d.nom, d.max ? `${k(d.cout)} par agent (${d.max} max.)` : k(d.cout), esc(d.texte)]))}
        <h3>Infrastructures</h3>
        ${table(['Infrastructure', 'Coût', 'Effet'], Object.values(INFRAS).map((i) => [i.nom, k(i.cout), esc(i.effet)]))}
        ${note('Deux tours de suite avec un budget négatif déclenchent l’Inspection générale : 5 k€ d’amende et −5 de satisfaction.')}`,
    },
    {
      id: 'affaires', titre: 'Affaires disputées', html: `
        <p>Chaque affaire éclate <strong>dans une zone</strong> (sa punaise est sur son territoire). Cette zone la dirige : elle seule décide de la lancer, en y engageant des agents dans ses ordres.</p>
        ${ul([
          '<strong>Postuler</strong> : les autres zones proposent un nombre d’agents depuis la Carte. La candidature arrive dans l’onglet Privé de la zone qui dirige.',
          '<strong>Accepter ou refuser</strong> : la zone qui dirige répond depuis son onglet Privé. Les zones acceptées participent dans la limite des places (nombre maximum d’agents sur l’affaire, zone qui dirige comprise).',
          'Candidature refusée, sans réponse, ou affaire non lancée : tes agents restent au travail chez toi, en Intervention.',
          'L’équipe réussit si sa force totale atteint la force minimale. La force dépend du nombre d’agents, du niveau en Recherche ou Intervention et du moral.',
          'Les points sont partagés selon le nombre d’agents fournis. La zone qui dirige gagne aussi de la satisfaction ; chaque zone venue en renfort gagne +2 de réputation.',
          'Une affaire non résolue reste un tour de plus, avec une récompense réduite.',
        ])}`,
    },
    {
      id: 'enquete', titre: 'L’enquête', html: `
        <p>Le cœur coopératif du jeu. Les affaires s'enchaînent : <strong>${ENQ.dureeMax} jours maximum</strong> pour désigner l'auteur, puis <strong>${ENQ.traqueTours} tours</strong> pour l'arrêter, pendant que l'affaire suivante commence.</p>
        <h3>L'affaire</h3>
        ${ul([
          'Cinq suspects gravitent autour des lieux. Chacun a une fiche : son lien avec la victime, son véhicule, ce qu’il déclare avoir fait ce soir-là, et une rumeur (vraie ou fausse).',
          'Le coupable est le <strong>seul</strong> à réunir les trois : un <strong>mobile</strong> (pourquoi), un <strong>moyen</strong> (comment entrer) et l’<strong>occasion</strong> (pas d’alibi pendant les faits). Chaque innocent coince sur au moins un point.',
          'Les <strong>constatations</strong> sur les lieux disent ce qu’il fallait : l’heure exacte, la façon d’entrer, la raison du vol. Sans elles, une vérification ne prouve rien : un alibi qui s’arrête à 21:35 innocente ou non selon l’heure exacte des faits.',
          'Les <strong>vérifications</strong> sur un suspect donnent des faits bruts (un ticket, des clés, des dettes…), parfois deux à la fois : à toi de repérer celui qui compte. Méfie-toi des rumeurs et des mensonges : on peut mentir sans être coupable.',
          'Au jour 3, un <strong>coup de théâtre</strong> est versé au dossier de tout le monde. Au jour 5, le butin refait surface et en dit plus sur la planque.',
          'Six planques, chacune avec sa rive, son humidité, sa température et son accès : il faudra trouver la bonne pour l’arrestation.',
          'Une fois l’affaire bouclée, la Gazette publie « le fin mot de l’affaire », avec la raison pour laquelle chaque innocent était innocent.',
        ])}
        <h3>Les démarches</h3>
        <p>Deux démarches au maximum par tour, toujours fructueuses. Le résultat arrive à 20:00 dans ton dossier. Une démarche qui n'a plus rien à t'apprendre est grisée.</p>
        ${table(['Démarche', 'Coût', 'Apprend'], Object.values(DEMARCHES).map((d) => [d.nom + (d.cible ? ' (sur un suspect)' : ' (constatation)'), d.cout ? k(d.cout) + (d.cible ? ', le double hors de ta cellule' : '') : `${d.agents} agents de Recherche pour la journée`, d.dit + (d.planque ? ', puis un indice sur la planque' : '')]))}
        <p><strong>Enquête de voisinage</strong> : chaque soir, tes enquêteurs peuvent rapporter une pièce gratuite. La chance augmente avec ta capacité de Recherche (jusqu'à 50 %).</p>
        <p><strong>Bonus d’énigme</strong> : avec deux bonnes réponses aux énigmes du jour, tu peux choisir « +1 indice ».</p>
        <h3>Les cellules et le partage</h3>
        ${ul([
          `Dès que plusieurs zones jouent, le parquet répartit les suspects entre ${ENQ.maxCellules} cellules de zones au plus. Vérifier un suspect de ta cellule coûte le prix normal, un autre coûte le double.`,
          'L’écran te dit quelles zones suivent chaque suspect : demande-leur leurs pièces à la radio, et propose les tiennes.',
          `Tu peux partager jusqu’à ${ENQ.maxPartages} pièces par tour, à une zone ou à toutes. Elles arrivent le soir même, avec ton nom (+5 PS, +1 de réputation).`,
          `Si une pièce que tu as donnée se trouve dans le dossier d’une zone qui identifie l’auteur, tu touches ${POINTS.contribution} points d’enquête.`,
          'Garder ses pièces peut faire gagner une découverte… ou laisser l’affaire se faire classer.',
        ])}
        <h3>Le tableau</h3>
        <p>L'onglet Tableau regroupe les constatations et les cinq suspects. Sous chaque nom, trois cases <strong>Mobile · Moyen · Occasion</strong> : touche-les pour noter ✓ établi ou ✕ exclu. Le jeu ne coche rien à ta place : c'est toi qui raisonnes. Les onglets Pièces, Planques et Notes complètent le dossier ; tes marques et notes sont gardées sur ton appareil.</p>
        <h3>L'accusation</h3>
        ${ul([
          '<strong>Une seule accusation par affaire.</strong> Elle part au parquet à 20:00 avec tes ordres, et tu peux la retirer jusque-là.',
          'Toutes les accusations sont ouvertes en même temps : toutes les zones qui ont vu juste le même soir partagent la découverte.',
          `Découverte : ${pointsDecouverte(1)} points d’enquête le premier jour, 10 de moins chaque jour (minimum ${pointsDecouverte(9)}), +15 PS, +3 de satisfaction.`,
          'Fausse accusation : −3 de réputation, et tu ne peux plus accuser sur cette affaire. Tu peux encore partager et participer à la traque.',
          `Personne n’a trouvé après ${ENQ.dureeMax} jours : l’affaire est classée, la Gazette publie la solution.`,
        ])}
        <h3>La traque</h3>
        ${ul([
          `Après la découverte, le suspect se cache dans l’une des six planques. <strong>Toutes les zones</strong> ont ${ENQ.traqueTours} tours pour l’arrêter.`,
          `Pour intervenir : choisis une planque et envoie au moins ${ENQ.agentsTraque} agents d’Intervention. Ils sont pris sur ton service du jour.`,
          `Arrestation : ${POINTS.arrestation} points d’enquête, prime de 4 k€, +5 de satisfaction, +3 de réputation. Plusieurs zones à la bonne planque le même soir se partagent l’arrestation.`,
          'Mauvaise planque : tes agents ont perdu leur journée. Sans arrestation après deux tours, le suspect s’enfuit.',
          'Les indices sur les planques de l’affaire précédente restent consultables pendant la traque.',
        ])}`,
    },
    {
      id: 'fipa', titre: 'FIPA : les événements à deux zones', html: `
        <p>Le bourgmestre demande régulièrement à une zone d'organiser un événement (braderie, match à risque, visite officielle, festival…) qui demande ${'6 à 10'} agents : trop pour une seule zone.</p>
        ${ol([
          '<strong>Demande</strong> (écran HP) : tu choisis une zone partenaire et tu répartis les agents entre vous (au moins 2 chacun). Sans invitation : −4 de satisfaction.',
          '<strong>Réponse</strong> : la zone invitée accepte ou refuse au tour suivant. Sans réponse, c’est un refus : −3 de satisfaction pour la demandeuse.',
          '<strong>Jour J</strong> : les agents promis quittent leur service (d’abord en Proximité, puis Intervention). Chacun choisit en secret : <strong>partager</strong> ou <strong>revendiquer</strong>.',
        ])}
        ${table(['Toi \\ l’autre', 'Il partage', 'Il revendique'], [
          ['Partager', `${pc(PARTAGE['partager/partager'][0])} chacun, +2 de réputation`, `toi ${pc(PARTAGE['partager/revendiquer'][0])}, lui ${pc(PARTAGE['partager/revendiquer'][1])}`],
          ['Revendiquer', `toi ${pc(PARTAGE['revendiquer/partager'][0])}, lui ${pc(PARTAGE['revendiquer/partager'][1])}`, `${pc(PARTAGE['revendiquer/revendiquer'][0])} chacun, −3 de satisfaction`],
        ])}
        ${ul([
          'La récompense (10 à 14 k€) est complète si au moins 90 % des agents promis sont venus, divisée par deux au-dessus de 50 %, perdue en dessous (−5 de satisfaction).',
          'Chaque participant gagne +10 PS et, en cas de succès, +4 de satisfaction.',
          '<strong>Fiabilité</strong> : chaque zone affiche le nombre de FIPA honorées (partagé et envoyé tous ses agents) sur le nombre de FIPA faites. Elle est visible sur la Carte et au moment de choisir un partenaire.',
          `Deux mêmes zones ne peuvent pas refaire une FIPA ensemble avant ${FIPA.delaiPaire} tours. Les zones qui n’en ont jamais fait sont sollicitées en priorité.`,
          'La Gazette révèle qui a partagé et qui a revendiqué.',
        ])}`,
    },
    {
      id: 'diplomatie', titre: 'Diplomatie : entraide, duels, Conseil, manœuvres', html: `
        <p>Tout se trouve dans l'écran <strong>Diplomatie</strong> (depuis la Radio) et part avec tes ordres à 20:00.</p>
        <h3>Entraide</h3>
        ${ul([
          `Envoie jusqu’à ${AIDE.budgetMax} k€ (reçus le soir même) et prête jusqu’à ${AIDE.agentsMax} agents pour ${AIDE.dureePret} tours. Tu gardes toujours au moins 8 agents.`,
          'Aider une zone en péril ou sous tutelle : +5 de réputation. Une zone frappée par un coup dur : +3. Sinon : +1.',
        ])}
        <h3>Duels</h3>
        ${ul([
          `Défie une zone pendant ${DUEL.duree} tours sur un indicateur : ${Object.values(DUEL_INDICATEURS).map((d) => d.nom.toLowerCase()).join(', ')}.`,
          'La zone défiée accepte ou refuse au tour suivant ; un refus est publié dans la Gazette.',
          `Le gagnant (la plus forte progression) prend ${DUEL.enjeu} points de réputation au perdant. Un seul duel à la fois par zone.`,
        ])}
        <h3>Le Conseil de police</h3>
        <p>Chaque dimanche, une voix par zone active, vote secret, résultat à 20:00 (égalité : la première option l'emporte).</p>
        ${ul([
          '<strong>Dotation fédérale de 20 k€</strong> : parts égales, ou prime aux zones les plus coopératives (FIPA honorées, indices partagés).',
          `<strong>Thème de la semaine</strong> (7 tours) : ${Object.values(THEMES).map((t) => `${t.nom} (${t.effet})`).join(' ; ')}.`,
          '<strong>Blâme</strong> : proposé contre les zones les moins coopératives de la semaine (FIPA revendiquées ou refusées, manœuvres). Effet : −10 de réputation et −30 PS.',
          `<strong>Motion de Chef de corps</strong>, une par saison : ${Object.values(MOTIONS_CHEF).map((m) => m.titre.toLowerCase()).join(', ')}.`,
        ])}
        <h3>Manœuvres</h3>
        <p>Une manœuvre par tour. Chance de réussite : ${pc(MAN.base)} pour la première, puis ${MAN.pas * 100} points de moins par manœuvre des ${MAN.fenetre} derniers tours (minimum ${pc(MAN.min)}), avant les parades de la cible. Réussie ou non, elle coûte ${MAN.coutReputation} de réputation (et ${REPUTATION.scandaleMalus} de plus si elle rate alors que ta réputation dépasse ${REPUTATION.scandale} : le scandale) ; la cible le sait tout de suite, la Gazette révèle l'auteur le lendemain.</p>
        ${table(['Manœuvre', 'Effet', 'Parade'], Object.values(MANOEUVRES).map((m) => [m.nom, esc(m.texte), esc(m.parade)]))}
        ${note(`On ne peut viser ni une zone en péril ou sous tutelle, ni une zone arrivée depuis moins de ${MAN.protectionTours} tours. L’enquête reste coopérative : aucune manœuvre sur les indices.`)}`,
    },
    {
      id: 'faillite', titre: 'Péril, tutelle et faillite', html: `
        <p>Une zone est <strong>en péril</strong> dès que l'une de ces conditions est atteinte :</p>
        ${ul([`budget sous ${PERIL.budget} k€ ;`, `moins de ${PERIL.agents} agents disponibles ;`, `moral sous ${PERIL.moral}.`])}
        <p>Le chef a alors <strong>${PERIL.tours} tours pour redresser la barre</strong>. Un bandeau rouge s'affiche sur l'HP ; les autres zones peuvent l'aider (entraide) et ne peuvent plus la viser par une manœuvre.</p>
        <h3>Toujours en péril au bout de ${PERIL.tours} tours : la tutelle</h3>
        <p>La première fois de la saison, la zone passe <strong>sous tutelle pendant ${TUTELLE.tours} tours</strong> : c'est la dernière chance.</p>
        ${ul([
          `Avance de trésorerie de ${k(TUTELLE.avance)} et +${TUTELLE.moral} de moral (la nouvelle direction rassure).`,
          'Interdit : rythme renforcé, agents de réserve, manœuvres, duels, enchères, et toute grande décision sauf recruter.',
          'La zone reste intouchable (pas de manœuvre contre elle) et l’entraide rapporte toujours +5 de réputation.',
          `À la fin des ${TUTELLE.tours} tours : si la zone n'est plus en péril, elle retrouve son autonomie ; sinon, c'est la faillite.`,
          'Une zone qui a déjà connu la tutelle cette saison passe directement du péril à la faillite.',
        ])}
        <h3>La faillite</h3>
        ${ul([
          '<strong>Tout est perdu</strong> : budget, infrastructures, équipement, niveaux. Le chef repart aussitôt avec une nouvelle zone et les ressources de départ.',
          '<strong>Rétrogradation</strong> d’un grade (jamais sous Aspirant).',
          '<strong>Classement</strong> : 3 tours comptés à IPZ 0 dans la moyenne de la saison.',
          'La Gazette lui consacre sa une, et le compteur « District Delta : N tours sans faillite » retombe à zéro.',
          'Le nombre de faillites reste affiché à vie sur le profil. Finir dans le top 3 d’une saison après une faillite donne le badge <strong>Phénix</strong>.',
        ])}`,
    },
    {
      id: 'ventes', titre: 'La salle des ventes', html: `
        <p>Chaque soir à 20:00, un nouveau lot est mis en vente : matériel, renfort, subside, formation… La carte <strong>Salle des ventes</strong> de l'HP le présente, avec sa mise à prix.</p>
        ${ul([
          `Tu places une <strong>offre secrète</strong> (de la mise à prix à ${k(ENCHERE.max)}) : elle part avec tes ordres, personne ne la voit avant 20:00.`,
          'Le plus offrant gagne et <strong>paie son offre</strong> ; les autres ne paient rien. À égalité, la meilleure réputation l’emporte.',
          'L’offre est refusée si ton budget ne la couvre pas au moment de la vente.',
          `Après un lot gagné, tu ne peux plus enchérir pendant ${ENCHERE.delaiGain} tours : pas de razzia.`,
          `Environ un lot sur quatre est réservé aux zones de réputation ${ENCHERE.repReserve} ou plus.`,
          'Les bonus « jusqu’à la fin de la saison » disparaissent à la nouvelle saison ; les effets immédiats (véhicule, formation, agents…) suivent les règles habituelles.',
        ])}
        ${table(['Lot', 'Effet', 'Mise à prix'], Object.values(LOTS).map((l) => [`${l.nom}${l.reserve ? ` <span class="tiny muted">(réputation ${ENCHERE.repReserve}+)</span>` : ''}`, esc(l.effet), `environ ${l.prix} k€`]))}`,
    },
    {
      id: 'quetes', titre: 'Les énigmes du jour', html: `
        <p>Trois énigmes par jour, de difficultés différentes, publiées à 20:00. Elles se corsent au fil de la semaine.</p>
        ${ul([
          '<strong>Une seule réponse par énigme</strong>, confirmée avant envoi : une erreur est définitive et coûte 1 point de moral.',
          'Chaque joueur reçoit ses propres données : on peut en discuter, mais la réponse d’un collègue ne marche pas chez toi.',
          `Chaque bonne réponse : +${PS.queteOk} PS (une tentative ratée : +${PS.queteTentee}). Trois sur trois : +5 PS en plus.
        <h3>Le dossier noir</h3>
        <p>Chaque jour, une 4<sup>e</sup> énigme facultative, de niveau hardcore : plus d’indices à croiser, des pièges assumés, aucun coup de pouce, et pas de changement possible. Une seule réponse, mais une erreur ne coûte rien. Une réussite rapporte +15 PS et compte pour le titre de fin de saison « Cerveau du district ».</p>
        <h3>L’entraînement</h3>
        <p>Dans l’écran Énigmes, l’onglet « Entraînement » permet de choisir un type et une difficulté (jusqu’au niveau hardcore) et de s’exercer autant qu’on veut. La correction est immédiate et rien ne compte : ni classement, ni moral, ni PS.</p>`,
          'Deux bonnes réponses débloquent un bonus au choix : +1 indice d’enquête, +3 de moral, +2 k€ ou +10 % de capacité pour un service. Trois sur trois : prime « sans faute » en plus (+3 k€, +2 de moral, +5 PS).',
        ])}
        <h3>Les outils</h3>
        ${ul([
          '<strong>Un coup de pouce ?</strong> : une piste de méthode, sans la réponse.',
          '<strong>Brouillon</strong> : une zone de notes par énigme, gardée sur ton appareil.',
          'Chaque énigme a une seule solution, et il faut toujours croiser plusieurs indices : aucune ne se devine au hasard.',
        ])}
        <h3>Les types d'énigmes</h3>
        ${table(['Type', 'Principe'], [
          [QUEST_LABELS.quiment, 'Des témoins parlent de la sincérité des autres. Un seul ment (deux le dimanche) : trouve qui.'],
          [QUEST_LABELS.grille, 'Des auditions à recouper : qui conduisait quoi, et où. Une grille à cocher est fournie.'],
          [QUEST_LABELS.cadenas, 'Trouver le code à partir des essais annotés du suspect.'],
          [QUEST_LABELS.chronologie, 'Le journal du 101 ne garde que les écarts entre les faits : remets-les dans l’ordre en tapant les lettres.'],
          [QUEST_LABELS.code, 'Déchiffrer un message saisi. Une roue de décodage est fournie ; les méthodes se corsent en fin de semaine.'],
        ])}`,
    },
    {
      id: 'imprevus', titre: 'Imprévus, coups durs et Inspection', html: `
        <p><strong>Aléas légers</strong> : environ un tour sur cinq, une petite surprise (croissants offerts, imprimante en panne, subside communal…).</p>
        <p><strong>Coups durs</strong> : environ un tour sur huit, un vrai coup dur. Ta gestion en réduit le risque :</p>
        ${table(['Coup dur', 'Effet', 'Ce qui le rend plus rare'], COUPS_DURS.map((c) => [esc(c.titre), {
          rebellion: '1 ou 2 agents blessés, absents 2 à 4 tours, −4 de moral',
          grippe: '10 à 20 % des agents malades 2 tours',
          accident: 'un véhicule hors service 3 tours, un agent absent',
          plainte: '−6 de satisfaction, un agent bloqué 2 tours',
          panne: 'administration à l’arrêt ce tour',
        }[c.id], {
          rebellion: 'niveau et équipement en Intervention',
          grippe: 'moral au-dessus de 70, salle de sport',
          accident: 'garage de la zone',
          plainte: 'paperasse sous 8, réputation au-dessus de 60',
          panne: 'logiciel de gestion',
        }[c.id]]))}
        <p><strong>Inspection générale</strong> : deux tours de budget négatif ou plus de 20 dossiers de paperasse. Amende de 5 k€, −5 de satisfaction, puis 4 tours de répit.</p>`,
    },
    {
      id: 'progression', titre: 'Points de service, grades et saisons', html: `
        <h3>Points de service (PS)</h3>
        <p>Ils récompensent l'assiduité et ne se perdent jamais, même d'une saison à l'autre. Maximum ${PS.plafondJour} PS par jour.</p>
        ${table(['Action', 'PS'], [
          ['Passer ses ordres', `+${PS.ordres}`], ['Bonne réponse à une énigme', `+${PS.queteOk} (tentative ratée : +${PS.queteTentee})`], ['Trois énigmes sur trois', '+5'],
          ['Découverte d’un auteur', '+15'], ['Arrestation', '+10'], ['Participer à une FIPA', '+10'], ['Partager un indice', '+5'], ['Indice qui aide une découverte', '+5'],
          ['Finir une saison classé', `+${PS.finSaison}`],
        ])}
        <h3>Grades</h3>
        ${table(['Grade', 'PS', 'Débloque'], GRADES.map((g) => [g.nom, g.ps, esc(g.debloque)]))}
        <p>Les consignes du pilote et le blason se règlent dans ton Profil ; la motion du Chef de corps dans l'écran Diplomatie. Un blâme du Conseil retire 30 PS ; seule une faillite fait redescendre d'un grade.</p>
        <h3>La saison</h3>
        ${ul([
          `Une saison dure ${SEASON_LENGTH} tours. Le classement se fait à la <strong>moyenne de l’IPZ par tour joué</strong> : une absence ne fait pas baisser ta moyenne.`,
          `Il faut avoir joué au moins ${MIN_TOURS_CLASSEMENT} tours pour être classé.`,
          'En fin de saison, les zones repartent de zéro. Grades, PS et titres sont conservés.',
        ])}
        <h3>Titres de fin de saison</h3>
        ${table(['Titre', 'Pour'], [
          ['Zone de l’année', 'la meilleure moyenne d’IPZ'], ['Phénix', 'finir dans le top 3 après une faillite (badge)'], ['Fin limier', 'le plus de points d’enquête'], ['Collègue en or', 'la meilleure réputation'],
          ['Esprit vif', 'le plus d’énigmes réussies'], ['Roi de la paperasse', 'la plus haute pile de paperasse (titre moqueur)'],
        ])}`,
    },
    {
      id: 'absences', titre: 'Absences, arrivées et départs', html: `
        ${table(['Situation', 'Ce qui se passe'], [
          ['Tu n’as pas passé d’ordres', 'Le pilote automatique reprend ta dernière répartition, sans décision, sans dépense et sans engagement. Pas de PS d’ordres.'],
          ['2 tours sans ordres', '−2 de satisfaction et de moral par tour : le « chef absent » se voit.'],
          ['3 tours sans ordres', 'Ta zone passe en veille : elle n’est plus sollicitée pour les FIPA et ne vote plus au Conseil.'],
          ['Arriver en cours de saison', 'Ta zone démarre avec les ressources moyennes des zones actives. Le classement à la moyenne par tour joué ne pénalise pas les retardataires, et la zone est protégée des manœuvres pendant 5 tours.'],
          ['Quitter la partie', 'Le maître du jeu peut retirer une zone.'],
        ])}`,
    },
    {
      id: 'faq', titre: 'Questions fréquentes', html: `
        <h3>Puis-je jouer dans plusieurs parties ?</h3><p>Oui. Touche le nom de la partie sous « Ma ZP » sur l'HP pour ouvrir « Mes parties » : tu peux y rejoindre une partie avec son code d'invitation, créer la tienne (tu en deviens le maître du jeu) et passer de l'une à l'autre. Chaque partie a ses zones, sa Gazette, sa Radio et son classement ; tes grades aussi sont propres à chaque partie.</p>
        <h3>Où trouver le code d'invitation ?</h3><p>Dans « Mes parties », sous le nom de chaque partie, et dans l'espace Maître du jeu avec un message tout prêt à envoyer.</p>
        <h3>Pourquoi mes ordres n'ont-ils pas eu l'effet prévu ?</h3><p>Lis ton rapport sur l'écran HP : blessés, opération, traque, audition ou FIPA peuvent avoir pris des agents. L'écran Ordres affiche aussi ces prélèvements avant 20:00.</p>
        <h3>Quelqu'un qui joue plus tôt est-il avantagé ?</h3><p>Non. Tout est résolu en même temps à 20:00 : ordres, accusations, traques, FIPA.</p>
        <h3>Un collègue peut-il voir mes ordres ?</h3><p>Pas avant 20:00. Ensuite, la Gazette raconte ce qui s'est passé.</p>
        <h3>Je me suis trompé à une énigme, puis-je corriger ?</h3><p>Non : une réponse est définitive. C'est voulu.</p>
        <h3>Mes notes de carnet sont-elles visibles des autres ?</h3><p>Non. Elles restent sur ton appareil (et ne suivent pas si tu changes de téléphone).</p>
        <h3>Le jeu utilise-t-il de vraies données de police ?</h3><p>Non. Tout est fictif : le district, les zones, les affaires, les personnes.</p>
        <h3>Un bouton « Mettre à jour » s'affiche</h3><p>Une nouvelle version est en ligne. Touche le bouton : ta partie est conservée.</p>`,
    },
  ];
}

const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function renderGuide() {
  const all = sections();
  const q = norm((S.guideQuery || '').trim());
  const list = q ? all.filter((s) => norm(s.titre + ' ' + strip(s.html)).includes(q)) : all;
  const ouvert = S.guideSection;
  return `<main class="screen guide">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <header class="col" style="gap:3px"><span class="kicker">Guide du joueur</span><h1 class="big">Comment ça marche</h1>
      <p class="sub">Toutes les règles de Ma ZP. Les chiffres sont ceux du jeu actuel.</p></header>
    <form data-form="guide-search" role="search"><label class="sr" for="guide-q">Rechercher dans le guide</label>
      <input id="guide-q" class="text" type="search" placeholder="Rechercher : traque, FIPA, paperasse…" value="${esc(S.guideQuery || '')}" autocomplete="off"></form>
    ${q ? `<p class="small muted" style="margin:0">${list.length} section${list.length > 1 ? 's' : ''} pour « ${esc(S.guideQuery)} »</p>` : ''}
    <div class="col" style="gap:8px">
      ${list.map((s) => `<details class="gsec" id="g-${s.id}" ${q || ouvert === s.id ? 'open' : ''}><summary>${esc(s.titre)}${icon('chevron', 18)}</summary><div class="gbody">${s.html}</div></details>`).join('')}
      ${!list.length ? '<p class="small muted">Rien trouvé. Essaie un autre mot.</p>' : ''}
    </div>
  </main>${tabbar('hp')}`;
}
