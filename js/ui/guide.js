// Guide du joueur (wiki intégré). Les chiffres viennent directement du moteur,
// pour que le guide reste exact quand l'équilibrage change.
import { DECOR, conditionDecor } from '../engine/decor.js';
import { S, esc, icon, tabbar } from './common.js';
import {
  AFFAIRE, SERVICES, SERVICE_LABELS, EQUIP, effetEquip, SEASON_LENGTH, START, DEFAULT_ALLOC, ECONOMIE, COUTS, DEPENSES, DELAI_ACADEMIE, DUREE_FORMATION,
  INFRAS, RYTHMES, GRADES, PS, IPZ_POIDS, MIN_TOURS_CLASSEMENT, NIVEAU_MAX, RENFORT, BATIMENTS, BATIMENT_MAX, TRAVAUX_TOURS, ENTRETIEN_ANNEXE, PEREQUATION, SUBSIDE, REPUTATION, ENCHERE, LOTS, TUTELLE, ND } from '../engine/constants.js';
import { SINISTRE } from '../engine/sinistres.js';
import { OPERATIONS, PRESSIONS, COUPS_DURS } from '../engine/contenu.js';
import { ENQ, DEMARCHES, POINTS, pointsDecouverte, delaiTraque, PRIME } from '../engine/enquete.js';
import { PARTAGE, FIPA } from '../engine/fipa.js';
import { QUEST_LABELS } from '../quests/quests.js';
import { INCIDENTS, INC, MALUS, GAIN, texteMalus, texteGain, URGENCE } from '../engine/incidents.js';
import { PREPA, coutPrepa } from '../engine/constants.js';
import { MODELES, RENDEMENT } from '../engine/flotte.js';
import { AIDE, THEMES, MOTIONS_CHEF, PERIL, SOLIDARITE } from '../engine/rivalites.js';
import { PACTES, PACTE, DEFI, DEFI_INDICATEURS } from '../engine/pactes.js';
import { VAGUES } from '../engine/vagues.js';
import { RELEVE } from '../engine/releve.js';
import { CRISE, PLANS } from '../engine/crise.js';

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
        <button type="button" class="btn primary block" data-action="tuto" style="margin-bottom:6px">Lancer la visite guidée (3 minutes)</button>
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
          ['Ordres', 'Répartition des agents, rythme, opérations, zone de non-droit, grande décision, dépenses du jour.'],
          ['Enquête', 'L’affaire en cours : démarches, pièces, carnet, accusation, traque.'],
          ['Énigmes', 'Les trois énigmes du jour.'],
          ['Carte', 'Le plan de la ville, tes quartiers (zones chaudes, point chaud, patrouilles), la zone de non-droit, la liste des zones.'],
          ['Radio', 'Messagerie commune entre tous les chefs de zone.'],
        ])}`,
    },
    {
      id: 'zone', titre: 'Ta zone et ses jauges', html: `
        <p>Chaque zone démarre avec ${START.agents} agents, ${k(START.budget)}, ${START.vehicules} véhicules, un moral de ${START.moral}, une satisfaction et une réputation de ${START.satisfaction}.</p>
        ${table(['Jauge', 'Ce qui la fait monter', 'Ce qui la fait baisser'], [
          ['<strong>Moral</strong> (0 à 100)', 'rythme allégé, prime, salle de sport, succès, bonnes nouvelles', 'rythme renforcé, incidents ratés en série, budget négatif, erreurs aux énigmes, coups durs'],
          ['<strong>Satisfaction</strong> citoyenne', 'incidents traités, Proximité, dossiers élucidés, opérations et FIPA réussies', 'incidents ratés, criminalité au-dessus de 55, vieux dossiers, « chasse aux PV », fiascos'],
          ['<strong>Réputation</strong> (collègues et autorités)', 'partager des indices, aider une zone en difficulté, secteurs repris à plusieurs, FIPA partagées, renforts, arrestations', 'fausses accusations, manœuvres (et scandale), blâme du Conseil, fiascos'],
          ['<strong>Budget</strong>', `dotation ${k(ECONOMIE.dotation)} par tour, subside communal (${k(SUBSIDE.parAgent)} par agent au-delà de ${SUBSIDE.seuil}), confiance de la commune, amendes du Roulage, primes`, `salaires (${k(ECONOMIE.salaire)} par agent), entretien (${k(ECONOMIE.entretienVehicule)} par véhicule), décisions, dépenses, démarches`],
          ['<strong>Criminalité</strong>', 'elle monte d’elle-même chaque jour', 'Proximité, campagne de prévention'],
          ['<strong>Paperasse</strong>', 'chaque incident traité et chaque nouveau dossier', 'Accueil et administration, sous-traitance, logiciel'],
        ])}
        <h3>Ce que rapporte la réputation</h3>
        ${ul([
          `<strong>Confiance de la commune</strong> : ${k(SUBSIDE.confiance)} par point au-dessus de 50, chaque tour ; en dessous, ${k(SUBSIDE.confianceMalus)} par point seulement. Réputation 60 : +${String(10 * SUBSIDE.confiance).replace('.', ',')} k€ ; réputation 80 : +${String(30 * SUBSIDE.confiance).replace('.', ',')} k€ ; réputation 30 : −${String(20 * SUBSIDE.confianceMalus).replace('.', ',')} k€.`,
          `<strong>Recrutement</strong> : à ${REPUTATION.recrueHaute} ou plus, une recrue coûte ${k(REPUTATION.coutRecrueHaute)} au lieu de ${k(COUTS.recrue)} ; sous ${REPUTATION.recrueBasse}, elle coûte ${k(REPUTATION.coutRecrueBasse)}.`,
          `<strong>Salle des ventes</strong> : certains lots sont réservés aux zones de réputation ${ENCHERE.repReserve} ou plus, et la réputation départage les offres égales.`,
          'Au-dessus de 60, moins de plaintes contre ta zone ; en fin de saison, la meilleure réputation reçoit le titre « Collègue en or ».',
        ])}
        <p>Le moral multiplie l'efficacité de tous tes agents : 100 % à 67 de moral, +1,5 % par point au-dessus, −0,6 % par point en dessous. Moral 40 → 84 % · 50 → 90 % · 60 → 96 % · 67 → 100 % · 75 → 113 % · 80 → 120 % · 90 → 135 % · 100 → 150 %. Chaque soir, il redescend vers 60 d’autant plus vite qu’il est haut (5 % de l’écart de 60 à 70, 10 % de 70 à 80, 15 % de 80 à 90, 20 % au-delà) : garder une équipe vers 75-80 demande primes, énigmes et succès. Le rapport du soir indique l'efficacité appliquée. Sous 40, 10 % des agents restent absents ; sous 20, un agent démissionne.</p>
        <h3>Logistique : les bâtiments</h3>
        <p>Chaque zone a un <strong>hôtel de police</strong> et un <strong>garage</strong>, du niveau 1 au niveau ${BATIMENT_MAX}. L’hôtel de police fixe le nombre d’agents que tu peux avoir (recrues à l’académie comprises), le garage le nombre de véhicules. Agrandir est une grande décision : ${TRAVAUX_TOURS} tour${TRAVAUX_TOURS > 1 ? 's' : ''} de travaux, puis un entretien plus élevé. En contrepartie, la commune verse un <strong>subside de ${k(SUBSIDE.parAgent)} par tour pour chaque agent au-delà de ${SUBSIDE.seuil}</strong> (la moitié de son salaire) : grandir coûte moins cher, sans être gratuit.</p>
        ${table(['Bâtiment', 'Capacité par niveau', 'Agrandir', 'Entretien par tour'], Object.values(BATIMENTS).map((B) => [B.nom, [1, 2, 3, 4, 5].map((n) => B.capacite(n)).join(' / ') + ' ' + B.unite, [1, 2, 3, 4].map((n) => B.coutAgrandir(n)).join(' / ') + ' k€', [1, 2, 3, 4, 5].map((n) => String(B.entretien(n)).replace('.', ',')).join(' / ') + ' k€']))}
        <p><strong>Un projet sur plusieurs saisons.</strong> Les bâtiments sont conservés d’une saison à l’autre, avec un niveau de moins. En une saison, un hôtel de police de niveau 2 ou 3 est un objectif réaliste. Viser plus haut coûte cher (${k([1, 2, 3].reduce((s, n) => s + BATIMENTS.bureaux.coutAgrandir(n), 0))} pour passer du niveau 1 au niveau 4) et chaque chantier prend la grande décision du jour, au lieu d’un recrutement : des places vides ne rapportent rien. Les niveaux 4 et 5 se construisent saison après saison : finis-en une au niveau 3, tu repars au niveau 2, et un seul chantier te remet au niveau 3 avec toute la saison devant toi pour aller plus haut.</p>
        <p>Sur l’HP, l’illustration de la carte « Ma zone » montre tout ça en image : un étage par niveau du bâtiment, une porte par niveau du garage. Touche-la (ou la tuile Véhicules) pour ouvrir la fiche <strong>« Mon hôtel de police »</strong> : agrandissements, annexes et chaque véhicule avec son état (en service, cabossé, à l’atelier). Toucher un véhicule ouvre sa fiche : son état, son modèle, la carrosserie, la revente ou la révision du parc, payées à 20:00 avec tes dépenses du jour.</p>
        <p><strong>Les véhicules</strong> : chacun a son modèle et son propre état (il s’use chaque jour et à chaque intervention ; la révision du parc les remet tous en forme). On les achète en Grande décision › Équiper, on les revend depuis leur fiche (60 % du prix neuf pour un véhicule parfait, moins s’il est usé, −30 % s’il est cabossé, 15 % au minimum ; il roule encore le soir de la vente).</p>
        ${table(['Modèle', 'Prix', 'Agents à bord', 'Urgences', 'Usure', 'Entretien'], Object.values(MODELES).map((m) => [esc(m.nom), `${m.prix} k€`, String(m.places).replace('.', ','), `${Math.round(31 * 3.6 * m.vitesse)} km/h${m.maniab !== 1 ? `, maniabilité ${m.maniab > 1 ? '+' : '−'}${Math.round(Math.abs(m.maniab - 1) * 100)} %` : ''}${m.pv > 3 ? ', encaisse 4 chocs' : ''}`, m.usure === 1 ? 'normale' : `−${Math.round((1 - m.usure) * 100)} %`, `${String(m.entretien).replace('.', ',')} k€/tour`]))}
        <p><strong>Ce que rapporte un véhicule.</strong> Les places à bord vont d’abord à l’Intervention (au-delà, ses agents travaillent à moitié). Chaque place qui reste met un agent de <strong>Roulage</strong> (contrôles mobiles : plus d’amendes), puis de <strong>Proximité</strong> (patrouilles motorisées), en voiture : <strong>+${Math.round(RENDEMENT.monte * 100)} %</strong> d’efficacité chacun. À pied, ils travaillent comme avant. Le parc (HP › Véhicules) montre qui est en voiture avec ta répartition du jour.</p>
        <p>Chaque modèle a en plus son rôle, à combiner selon ta façon de jouer :</p>
        ${table(['Modèle', 'Rôle', 'Effet'], [
          [esc(MODELES.diesel.nom), 'Polyvalent', `le meilleur prix par place (${k(MODELES.diesel.prix / MODELES.diesel.places)} la place)`],
          [esc(MODELES.electrique.nom), 'Se rembourse', `prime verte de la commune : +${k(RENDEMENT.verte)} par jour chacun (${RENDEMENT.verteMax} au plus), entretien moitié prix, usure −40 %`],
          [esc(MODELES.anonyme.nom), 'Filatures', `jauge de flagrant délit +${Math.round(RENDEMENT.filature * 100)} % chaque soir chacune (${Math.round(RENDEMENT.filatureMax * 100)} % au plus), Recherche +5 %, et pendant une traque elle surveille une deuxième planque`],
          [esc(MODELES.fourgon.nom), 'Maintien de l’ordre', `force des engagements (affaires disputées, zone de non-droit) +${Math.round(RENDEMENT.ordre * 100)} % chacun (${Math.round(RENDEMENT.ordreMax * 100)} % au plus), −10 % de risque de blessure, 3,5 places`],
        ])}
        <p><strong>Un investissement sur plusieurs saisons</strong> : ton parc te suit d’une saison à l’autre (voir Saisons), dans la limite du garage. Remplacer peu à peu les combis de départ par des modèles choisis, sans même agrandir le garage, est une stratégie à part entière : garage plein, l’achat se fait <strong>avec reprise</strong> de ton véhicule le plus usé (son prix de revente est déduit, le neuf prend sa place).</p>
        <p>Un véhicule à l’atelier ne rapporte rien ce jour-là (sauf la prime verte, versée pour le parc). Les plafonds évitent la flotte d’un seul modèle : au-delà de 2 ou 3, un modèle ne rapporte plus que ses places.</p>
        <p>${esc(MODELES.electrique.texte)} ${esc(MODELES.anonyme.texte)} ${esc(MODELES.fourgon.texte)}</p>
        <h3>Ton commissariat en image</h3>
        <p>L’illustration montre aussi la vie de ta zone : tes annexes et tes lots, le drapeau en berne quand le moral passe sous 35, une file de citoyens devant l’entrée quand la satisfaction passe sous 35, toutes les fenêtres allumées après un rythme renforcé, les imprévus de la veille (fuite d’eau, grève, pigeons, cheval sur la route, équipe de télévision…), les barrières d’une opération d’envergure et les combis cabossés. Le ciel suit l’heure, la météo change d’un jour à l’autre, et les fêtes se voient (21 juillet, fin d’année). Sur la Carte, « Les zones du district » fait défiler le commissariat de chaque zone avec son grade, son site sensible et son IPZ moyen : touche-en un pour le visiter (FIPA, annexes, bouton pour écrire). Dans le classement, touche le nom d’une zone.</p>
        <p>Dans la fiche « Mon hôtel de police », <strong>Personnaliser mon commissariat</strong> te laisse choisir la façade, la couleur du néon et les abords. Chaque élément se débloque avec ton grade ou un trophée :</p>
        ${table(['Élément', 'Pour le débloquer'], Object.values(DECOR).flatMap((C) => Object.values(C.options).filter((o) => o.grade || o.trophee).map((o) => [`${C.titre} : ${o.nom}`, conditionDecor(o)])))}
        <p><strong>Récompenses visibles.</strong> Chaque semaine (tours 7 et 14), la zone au meilleur IPZ moyen (4 tours joués au moins) devient <strong>championne de la semaine</strong> : une étoile dorée brille sur son toit pendant 7 jours. En fin de saison, le podium reçoit une plaque (or, argent, bronze) à côté de l’entrée, conservée d’une saison à l’autre. Une manœuvre réussie contre toi laisse une trace le lendemain (affiches de recrutement, cartons de dossiers emportés, voiture de l’Inspection), et un poste avancé plante sa tente devant chez toi tant qu’il dure.</p>
        <p><strong>Décors d’événement.</strong> Pendant certaines périodes, aider au grand événement du district ou faire une découverte dans l’enquête fait gagner un décor en édition limitée : Nuit des citrouilles (24 octobre – 2 novembre), Saint-Nicolas (29 novembre – 6 décembre), Carnaval (les dix jours avant le Mardi gras) et Dragon de la Ducasse (la semaine de la Trinité).</p>
        <p>À la première ouverture après la résolution de 20:00, tes combis sortent en patrouille, gyrophares allumés, puis reviennent.</p>
        <p><strong>Early birds.</strong> Les zones présentes au lancement des skins ont reçu une roulette : un skin exclusif parmi douze (hôtel de police, garage ou aile des annexes), qu’on équipe ou enlève dans « Personnaliser mon commissariat ». Il ne peut plus être gagné par la suite.</p>
        <p>Chaque annexe (salle de sport, logiciel, caméras…) coûte ${String(ENTRETIEN_ANNEXE).replace('.', ',')} k€ d’entretien par tour. Une zone nettement moins équipée que la moyenne du district reçoit une péréquation de ${String(PEREQUATION.montant).replace('.', ',')} k€ par tour. </p>
        <h3>Ton équipe et tes trophées</h3>
        <p>Cinq figures incarnent ta zone (une par service). Elles gagnent de l’expérience avec le travail de leur service et reçoivent des surnoms au fil des tours ; elles restent d’une saison à l’autre. Les trophées récompensent des exploits sur la durée (zéro incident raté pendant 7 tours, aide à une zone en péril, arrestation, saison sans manœuvre…) : ils sont visibles sur l’HP (carte « Mes trophées ») et dans la liste des zones de la Carte. Chacune encadre son service et le rend plus efficace : +3 % sans surnom, +8 % au 1er, +14 % au 2e, +20 % au 3e. Chaque jour, dans les ordres (section « Mon équipe »), tu peux en envoyer une en mission : mener l’assaut sur un secteur de la zone de non-droit où tu envoies des agents (force de ta zone sur ce secteur augmentée du même pourcentage, risque de blessure divisé par deux) ou encadrer ton renfort chez un collègue (un agent de plus dans son dispositif). Son service perd alors son bonus pour la journée.</p>
        <h3>D’une saison à l’autre</h3>
        <p>À la fin de la saison, ta zone garde un <strong>héritage</strong> : les niveaux de formation des services et les bâtiments, chacun baissé d’un niveau (minimum 1), toutes tes annexes (leur entretien continue) et <strong>ton parc</strong> : chaque véhicule garde son modèle et passe au contrôle technique (usure divisée par deux). Si le garage, baissé d’un niveau, n’a plus assez de places, les plus usés sont revendus et le produit s’ajoute au budget de départ. Le budget, les effectifs, l’équipement, le moral et les jauges repartent des valeurs de départ. Une décision dont l’effet tomberait après la fin de saison est signalée dans tes ordres.</p>
        <h3>L'IPZ, ton score du jour</h3>
        <p>L'Indice de performance de zone est calculé à chaque tour :</p>
        ${table(['Composante', 'Poids'], Object.entries(IPZ_POIDS).map(([c, w]) => [{ satisfaction: 'Satisfaction', affaires: 'Résultats (incidents traités et points gagnés)', moral: 'Moral', budget: 'Budget', reputation: 'Réputation' }[c], pc(w)]))}
        <p>La composante « Résultats terrain » vaut 60 × la part d'incidents traités, plus 3 × ton <strong>bilan</strong> de points, plafonnée à 100. Le bilan = les points du jour + la moitié du bilan de la veille : un gros coup compte encore les jours suivants, et un jour creux ne fait pas tout tomber. Les points viennent de la Recherche (+0,5 par unité de travail sur les dossiers, chaque jour), des flagrants délits (+3), de la zone de non-droit, des opérations d'envergure, des pièces de voisinage (+2), d'une découverte (+8) ou d'une arrestation (+6).</p>`,
    },
    {
      id: 'ordres', titre: 'Les ordres et les cinq services', html: `
        <p>Tes agents disponibles (hors blessés, malades, formations) se répartissent entre cinq services. Répartition de départ : ${Object.entries(DEFAULT_ALLOC).map(([s, n]) => `${n} ${SERVICE_LABELS[s]}`).join(', ')}.</p>
        ${table(['Service', 'Son rôle'], [
          ['Intervention', 'Traite les incidents du jour (environ 1,1 de capacité par incident). Chaque incident raté coûte 1,8 de satisfaction. Limité par les véhicules : au-delà de 2,5 agents par véhicule, les agents en plus ne comptent qu’à moitié. Les patrouilles restées libres après les incidents remplissent une jauge de flagrant délit (+10 % par unité de marge, 40 % au plus par jour) : à 100 %, flagrant délit sûr (+3 pts, +3 PS, quartier apaisé).'],
          ['Proximité', 'Fait baisser la criminalité (0,6 par unité de capacité) et soigne la satisfaction. Ses agents peuvent patrouiller dans des quartiers précis, depuis la Carte.'],
          ['Recherche', 'Élucide les dossiers locaux, qui rapportent des points ; mène l’enquête de voisinage, qui rapporte des pièces pour l’enquête de la semaine (surtout avec une piste prioritaire).'],
          ['Roulage', `Rapporte des amendes (${k(ECONOMIE.amendeParCapacite)} par unité de capacité). Au-delà de 6 agents, chaque agent de plus compte pour moitié. Au-delà de 25 % des effectifs (40 % avec les caméras) : effet « chasse aux PV », −2 de satisfaction.`],
          ['Accueil et administration', 'Écluse la paperasse. Au-delà de 14 dossiers : −2 de moral par tour ; au-delà de 20 : l’Inspection. C’est aussi l’assurance de la zone : chaque agent au-delà de 2 évite 15 % des tracas internes (jusqu’à 60 %).'],
        ])}
        <p>La capacité d'un service dépend du nombre d'agents, de son niveau (1 à ${NIVEAU_MAX}), de son équipement (1 à ${NIVEAU_MAX}), du moral et du rythme.</p>
        <h3>Le rythme</h3>
        ${table(['Rythme', 'Effet'], Object.values(RYTHMES).map((r) => [r.label, `${r.mult === 1 ? 'efficacité normale' : `efficacité ${r.mult > 1 ? '+' : '−'}${Math.round(Math.abs(r.mult - 1) * 100)} %`}${r.moral ? `, ${r.moral > 0 ? '+' : ''}${r.moral} de moral` : ''}${r.cout ? `, ${k(r.cout)} d’heures supplémentaires` : ''}`]))}
        ${note('Trois tours de suite en rythme renforcé : risque d’épuisement, un agent absent 5 tours.')}
        <h3>Les quartiers et les patrouilles</h3>
        <p>Ta zone compte six quartiers, chacun avec sa <strong>tension</strong> : calme (moins de 45), à surveiller, tendu (55 et plus : coûte de la satisfaction), chaud (70 et plus). La criminalité de ta zone est la moyenne de ses quartiers. Au-dessus de 55, un quartier coûte un peu de satisfaction chaque jour.</p>
        <ul class="aide-liste">
          <li><strong>Patrouilles ciblées</strong> : sur la Carte, envoie des agents de Proximité dans un quartier précis. Les autres patrouillent partout, comme d’habitude. Là où tu concentres, la tension baisse davantage ; ailleurs, elle baisse moins.</li>
          <li><strong>Point chaud</strong> : presque chaque jour, un quartier est signalé la veille (deal, rodéos, cambriolages…). 2 agents sur place le désamorcent (+1 de satisfaction) ; sinon, la tension y grimpe fortement.</li>
          <li><strong>Déplacement de la délinquance</strong> : à partir de 4 agents au même endroit, une partie de la délinquance glisse vers les quartiers voisins, y compris chez la zone d’à côté.</li>
          <li><strong>Frontière</strong> : tu vois la tension des quartiers voisins qui touchent les tiens (en pointillés). La tension passe d’un quartier à l’autre : un voisin qui laisse filer finit par te coûter, d’où l’intérêt de se coordonner.</li>
        </ul>
        <h3>La situation du jour</h3>
        <p>Annoncée dès le début du tour sur l'écran HP, elle change les besoins de ta zone : il faut donc adapter sa répartition. Une répartition figée finit toujours par coûter.</p>
        ${table(['Situation', 'Effet'], [...PRESSIONS.map((p) => [esc(p.titre), esc(p.texte)]), ['Nuit du week-end (vendredi et samedi)', '+2 incidents attendus.']])}
        <h3>Opérations d'envergure</h3>
        <p>Environ une fois tous les six jours, une grosse opération tombe dans ta zone. Les agents qu'elle mobilise quittent leur service. Tu choisis le dispositif : <strong>complet</strong> (tous les agents demandés), <strong>réduit</strong> (la moitié) ou <strong>aucun</strong>.</p>
        ${table(['Opération', 'Agents demandés', 'Durée', 'Points'], OPERATIONS.map((o) => [esc(o.titre), besoinsOp(o.besoins), `${o.duree} tour${o.duree > 1 ? 's' : ''}`, o.recompense]))}
        <p>Couverture moyenne d'au moins 90 % : réussite (points, +6 de satisfaction). Entre 50 et 90 % : réussite partielle. En dessous : fiasco (−10 de satisfaction, −4 de moral).</p>
        <p><strong>Appel à renfort</strong> : pendant l'opération, lance un appel sur la radio (bouton sur l'HP ou dans tes ordres, un par tour). Les autres zones peuvent te prêter jusqu'à ${RENFORT.maxParZone} agents chacune pour la journée, en l'inscrivant dans leurs ordres : ces agents comptent dans la couverture de ton dispositif. Chaque zone qui aide gagne, par agent prêté, +${RENFORT.repParAgent} de réputation (maximum +${RENFORT.repMax}) +${RENFORT.psParAgent} PS d'entraide, +${RENFORT.pointsParAgent} point de résultats terrain et une indemnité fédérale de ${String(RENFORT.indemnite).replace('.', ',')} k€ (qui couvre son salaire) : prêter ne te coûte presque rien, et plus tu prêtes, plus ça rapporte.</p>`,
    },
    {
      id: 'decisions', titre: 'Grande décision, dépenses et infrastructures', html: `
        <h3>La grande décision (une par tour)</h3>
        ${table(['Décision', 'Coût', 'Effet'], [
          ['Recruter (1 à 3)', `${k(COUTS.recrue)} par recrue`, `arrivée après ${DELAI_ACADEMIE} tours d’académie`],
          ['Former un service', k(COUTS.formation), `+1 niveau ; 2 agents indisponibles ${DUREE_FORMATION} tours (Intervention avec un stand de tir : ${k(INFRAS.tir.formation.cout)} et personne d’absent)`],
          ['Équiper un service', `${k(COUTS.equipementBase)}, puis +2 k€ par niveau`, `+${Math.round(EQUIP.efficacite * 100)} % d’efficacité par niveau et un effet propre au service : ${SERVICES.map((sv) => `${SERVICE_LABELS[sv]} ${effetEquip(sv, 1)}`).join(' ; ')}. Immédiat, mais perdu en fin de saison`],
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
      id: 'affaires', titre: 'Zone de non-droit', html: `
        <p>Le centre de la ville est aux mains du milieu : ${Object.keys((S.state && S.state.nonDroit && S.state.nonDroit.secteurs) || {}).length || 8} secteurs hachurés de rouge sur la carte, avec au milieu le QG. Les zones s'installent tout autour. <strong>Toutes peuvent y envoyer des agents, sans candidature ni accord de personne</strong> : il suffit de les placer depuis le Terrain et de valider ses ordres.</p>
        ${ul([
          `<strong>L'emprise</strong> : chaque secteur a une emprise du milieu (0 à 100). Chaque soir, la force de toutes les zones présentes la fait baisser ; la nuit, le milieu se refait. Plus il y a de zones actives dans la partie, plus il se refait vite : seul, on n'y arrive presque jamais.`,
          `<strong>Assaut repoussé</strong> : si la force du soir ne suffit pas à faire reculer le milieu, l'assaut échoue ; une zone seule sur un secteur tombe aussi dans un piège une fois sur ${Math.round(1 / ND.seulEchec)} environ. L'emprise ne baisse pas et chaque agent engagé a ${Math.round(ND.blesseRepousse * 100)} % de risque d'être blessé (${ND.absenceRepousse} tours d'absence ; moitié moins avec un stand de tir) : envoyer beaucoup d'agents seul est le pire calcul.`,
          `<strong>À plusieurs</strong> : les forces du soir s'additionnent, avec +${Math.round(ND.coop * 100)} % par zone en plus sur le même secteur (jusqu'à ${ND.coopMax} zones). Le Terrain montre qui y était hier soir : c'est le meilleur endroit pour se retrouver. Le bouton radio prévient tout le monde.`,
          `<strong>La reprise</strong> (emprise à 0) : chaque zone qui a au moins ${Math.round(ND.partMin * 100)} % de l'influence reçoit la même part fixe (+${ND.prise.points} pts, +${ND.prise.satisfaction} de satisfaction, +${ND.prise.rep} de réputation, +1 si on était plusieurs, +${ND.prise.moral} de moral), plus des points et une prime selon son influence. S'y mettre à plusieurs ne divise donc pas la part fixe.`,
          `<strong>Tenir le secteur</strong> : chaque nuit, il rapporte à chaque zone qui a de l'influence (des points, un peu de satisfaction, ${ND.retombees.ps} PS et jusqu’à ${String(ND.retombees.budget).replace('.', ',')} k€ selon ta part d’influence). Mais le milieu revient de ${ND.remontee} par nuit, et riposte parfois : il faut laisser 2 ou 3 agents de garde (à plusieurs, c'est plus léger). À ${ND.seuilRechute}, le secteur retombe et tout est à refaire.`,
          `<strong>L'influence</strong> : elle vient de la force engagée et s'efface de ${Math.round((1 - ND.usure) * 100)} % par nuit sur un secteur tenu. Qui monte la garde garde son influence ; qui ne vient plus la perd peu à peu. La zone qui en a le plus est la « zone de référence » : le secteur prend sa couleur sur la carte.`,
          `<strong>Le QG</strong> : il ne s'attaque qu'une fois ${ND.coeurSeuil} secteurs de l'anneau tenus en même temps. Plus coriace, il rapporte ${String(ND.coeurMult).replace('.', ',')} fois plus, et le trophée « Libérateur ».`,
          `<strong>Les voisins du centre</strong> : un quartier qui touche un secteur du milieu prend +${String(ND.contagion).replace('.', ',')} de tension chaque nuit ; s'il touche un secteur repris, il perd ${String(ND.apaisement).replace('.', ',')}.`,
          `<strong>Limites</strong> : ${ND.maxParSecteur} agents par secteur et ${ND.maxTotal} en tout, pris sur tes services pour la journée. Au-delà de 3 agents au même endroit, risque d'un blessé pendant l'assaut. Si tu oublies tes ordres un jour, tes agents restent sur place ; au-delà, ils rentrent.`,
          'Une zone qui ne joue plus ne bloque personne : les autres continuent sans elle. La zone de non-droit repart de zéro à chaque saison.',
        ])}`,
    },
    {
      id: 'enquete', titre: 'L’enquête', html: `
        <p>Le cœur coopératif du jeu. Les affaires s'enchaînent : <strong>${ENQ.dureeMax} jours maximum</strong> pour désigner l'auteur, puis <strong>${delaiTraque(ENQ.traqueTours).replace(/,$/, '')}</strong> pour l'arrêter, pendant que l'affaire suivante commence.</p>
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
        <p><strong>Enquête de voisinage</strong> : chaque soir, tes agents de Recherche peuvent rapporter des pièces gratuites sur les suspects (jamais sur la scène ni les planques). Au-delà de 2 unités de capacité, chaque unité ajoute 7 % de chance (jusqu’à 50 %). Chaque pièce rapportée compte aussi dans tes résultats du jour.</p>
        <p><strong>Piste prioritaire</strong> : depuis la fiche d’un suspect, mets tes enquêteurs sur sa piste. Le voisinage cherche alors d’abord de ce côté, avec un taux doublé (14 % par unité, jusqu’à plus d’une pièce par soir). Hors de ta cellule, c’est deux fois moins efficace. La piste est gratuite, mais une mauvaise piste fait perdre des jours.</p>
        <p><strong>Bonus d’énigme</strong> : avec deux bonnes réponses aux énigmes du jour, tu peux choisir « +1 indice ».</p>
        <p><strong>Appui fédéral (PJF)</strong> : une fois par jour, demande le <strong>labo</strong> (traces, empreintes, ADN) ou la <strong>RCCU</strong> (téléphones, ordinateurs, comptes en ligne) dans la carte « Aujourd’hui ». Leurs équipes sont partagées entre toutes les zones (environ une par service pour 6 zones, plus ou moins selon le jour) : réponse à 20:00. Refusé ? Tu passes en priorité la fois suivante. Accepté : l’équipe passe le lendemain et tu joues son mini-jeu (empreintes ou ADN pour le labo, réseau ou interception pour la RCCU), un seul essai, avant 20:00. Réussi : une pièce sur un suspect arrive à 20:00, plutôt sur les moyens avec le labo, plutôt sur le mobile ou l’occasion avec la RCCU. Raté ou pas joué : rien.</p>
        <h3>Les cellules et le partage</h3>
        ${ul([
          `Le parquet répartit les zones en cellules : une seule jusqu’à 3 zones, deux de 4 à 6 zones, trois à partir de 7. Chaque cellule compte au moins deux zones et suit au moins deux suspects (avec trois cellules, un suspect est suivi par deux cellules à la fois). Vérifier un suspect de ta cellule coûte le prix normal, un autre coûte le double.`,
          'L’écran te dit quelles zones suivent chaque suspect : demande-leur leurs pièces à la radio, et propose les tiennes.',
          `Tu peux partager jusqu’à ${ENQ.maxPartages} pièces par tour, à une zone ou à toutes. Elles arrivent le soir même, avec ton nom : +5 PS et +1 de réputation par pièce transmise (une pièce envoyée à toutes les zones compte une fois). Une pièce que le destinataire a déjà n’est pas comptée.`,
          `Chaque zone ne traite que <strong>${ENQ.maxRecus} pièces partagées par soir</strong> : d’abord celles qu’on lui adresse personnellement, puis une par expéditeur à tour de rôle. Dans une grande partie, celui qui attend que tout le monde lui envoie tout n’a donc pas d’avantage : mieux vaut choisir à qui l’on envoie quoi.`,
          `Si une pièce que tu as donnée se trouve dans le dossier d’une zone qui identifie l’auteur, tu touches ${POINTS.contribution} points d’enquête.`,
          'Garder ses pièces peut faire gagner une découverte… ou laisser l’affaire se faire classer.',
        ])}
        <h3>Le tableau d’enquête</h3>
        ${ul([
          'Le récit de l’affaire reste au tableau : le <strong>procès-verbal d’ouverture</strong> (les faits, la victime, le butin) et la <strong>main courante</strong>, qui note jour après jour ce qui est arrivé (rebondissements, constatations, pièces reçues, accusation). Dans les nouvelles affaires, s’ajoutent la <strong>une de la Gazette</strong> du premier matin, la <strong>photo de la scène</strong> prise par le labo et le <strong>dépôt de plainte</strong> de la victime : du récit, sans indice caché. Les rebondissements arrivent aussi en coupures de la Gazette, avec leur article et leur photo. Touche l’un ou l’autre pour tout relire.',
          'L’écran Enquête s’ouvre sur un grand <strong>tableau en liège</strong> : glisse pour te déplacer, pince à deux doigts (ou la molette) pour zoomer. Le bouton liste en haut ramène l’affichage classique, et « ? » relance le petit tuto.',
          'Au centre, le <strong>plan du district</strong> : la croix rouge marque les lieux des faits, les cercles bleus les endroits où les suspects disent avoir été, avec le <strong>temps de trajet</strong> en pointillés, et les petites maisons violettes les <strong>six planques possibles</strong>, chacune sur sa rive du canal. Touche une planque pour voir sa fiche, les indices réunis et la marquer (écartée, douteuse, retenue).',
          'Les trajets comptent : un alibi qui s’arrête 10 minutes avant les faits n’innocente personne si le trajet prend 5 minutes, mais il innocente si la route en prend 20. Même chose pour un alibi qui reprend peu après la sortie. (Les affaires ouvertes avant l’arrivée du plan ne tiennent pas compte des trajets.)',
          '<strong>Affaire de meurtre</strong> (une fois par partie, écrite à la main) : pas de mobile, moyen et occasion à cocher mécaniquement, ni de planque. Chacun des cinq proches ment ; les innocents pour cacher un secret, que l’on découvre (souvent par une perquisition) et qui les blanchit. La perquisition demande un mandat : une pièce sérieuse contre la personne au dossier. Pour conclure, la <strong>confrontation</strong> : un suspect et trois éléments à lui opposer (pièces, journal, PV). Le plan est celui du centre de Mons : chaque lieu ouvre son itinéraire à pied dans Google Maps.',
          '<strong>Dossier complet</strong> (nouvelles affaires) : un <strong>journal</strong> raconte l’affaire à l’ouverture (il reste punaisé au tableau), le PV de premières constatations remplace le récit, et la boîte contient les <strong>PV d’audition</strong> des cinq suspects : ce qu’ils déclarent, et comment ils se déplacent. Les vérifications arrivent sous forme de petits PV.',
          'Le <strong>plan routier</strong> est à l’échelle : de vraies rues, trois ponts routiers, deux passerelles et la zone piétonne de la Grand-Place (vélos et piétons seulement), parfois un pont fermé pour travaux (le journal l’annonce). Plus de temps écrits sur le plan : touche un lieu pour mesurer l’itinéraire le plus court jusqu’à la scène en voiture ou deux-roues (2 min/km), à vélo (4 min/km) ou à pied (12 min/km). Compte avec le moyen de transport du suspect : un trou de 15 minutes suffit en voiture, pas forcément à vélo. Une camionnette louée (vérification des moyens) compte.',
          'Les pièces arrivent dans la <strong>boîte à pièces</strong>, chaque soir à 20:00. Sors-les une à une et punaise-les où tu veux. Rien n’est rangé d’avance.',
          'Touche une photo, une fiche de constatation, une pièce ou un lieu du plan pour ouvrir son volet : ce qu’on sait, tes ✓ / ✕, les démarches, la piste prioritaire, l’accusation et le partage.',
          '<strong>Partager une pièce</strong> : touche le petit bouton de partage dans le coin de la pièce (ou son titre dans la boîte à pièces), puis choisis une zone ou « À tous ». La couleur du bouton dit où elle en est : blanc, gardée pour toi ; jaune, partage prévu ce soir ; vert, déjà partagée ; bleu, reçue d’une autre zone (touche-la pour voir avec qui). Le bouton « Ce soir » liste tes partages prévus et permet de les annuler.',
          'Pour tirer une <strong>ficelle</strong>, pose le doigt sur une punaise et glisse jusqu’à un autre élément ou un lieu du plan : elle s’accroche à la punaise la plus proche, et le tableau défile quand tu approches du bord. Pour retirer une ficelle, attrape-la et tire-la hors de sa ligne : elle se décroche (si tu la relâches près de sa ligne, elle reste). Le mode ficelle permet de partir de n’importe où sur un élément, et d’y couper une ficelle d’un simple toucher. Ta disposition, tes ficelles, tes marques et tes notes sont enregistrées en ligne quelques secondes après ton dernier geste : tu les retrouves sur ton téléphone comme sur ton ordinateur (le zoom et l’endroit où tu regardes restent propres à chaque appareil).',
          'Le bouton <strong>Ce soir</strong> résume ce qui partira avec tes ordres : démarches, voisinage, appui fédéral, partages, accusation.',
        ])}
        <h3>La vue liste</h3>
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
          `Après la découverte, le suspect se cache dans l’une des six planques. <strong>Toutes les zones</strong> ont ${delaiTraque(ENQ.traqueTours).replace(/,$/, '')} pour l’arrêter : mettez-vous d’accord sur la radio pour fouiller des planques différentes.`,
          `Pour intervenir : choisis une planque et envoie au moins ${ENQ.agentsTraque} agents d’Intervention. Ils sont pris sur ton service du jour.`,
          `<strong>Mise à prix</strong> : chaque zone qui arrête l’auteur (ou obtient ses aveux) choisit sa récompense le lendemain, avec ses ordres : ${PRIME.confiscation} k€, ${PRIME.renfort.agents} agents fédéraux pendant ${PRIME.renfort.tours} jours, ou +1 niveau de formation offert. Démasquer sans arrêter rapporte ${PRIME.partIdentification} k€, aider avec ses pièces ${PRIME.partContribution} k€.`,
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
      id: 'pactes', titre: 'Pactes, défis amicaux et Conseil', html: `
        <p>Tout se trouve dans l'onglet <strong>Pactes</strong> de la Carte et part avec tes ordres à 20:00.</p>
        <h3>Les pactes</h3>
        ${ul([
          `Un pacte lie deux zones pendant <strong>${PACTE.duree} tours</strong>. Ta proposition part tout de suite en message privé. Si l’autre zone accepte avant 20:00, le pacte est signé le soir même ; sinon elle peut encore répondre le lendemain. Il joue dès le soir qui suit la signature. Même chose pour le défi amical.`,
          `${PACTE.max} pactes au plus en même temps, un seul avec une même zone. À la fin, chacune gagne ${PACTE.psFin} PS et peut le reconduire.`,
          `Si ton partenaire ne joue plus pendant ${PACTE.inactif} jours, le pacte s’éteint sans pénalité.`,
          `Rompre un pacte avant la fin est annoncé dans la Gazette, interdit tout nouveau pacte pendant ${PACTE.blocage} tours et peut valoir un blâme au Conseil.`,
          'Sur la carte de l’onglet, chaque pacte est un lien de couleur entre deux hôtels de police.',
        ])}
        ${table(['Pacte', 'Effet'], Object.values(PACTES).map((p) => [p.nom, esc(p.texte)]))}
        ${note('Pacte d’enquête : une pièce que vous n’avez ni l’un ni l’autre (une de celles qu’on obtient par les vérifications) est déchirée en deux. L’un reçoit l’en-tête et le début, l’autre la fin, noms masqués : le fait décisif est souvent dans l’autre moitié. Il faut que les deux cliquent « Mettre en commun » avant le 20:00 suivant (le même soir ou l’un après l’autre) pour que chacun ait la pièce entière. Une pièce par affaire tous les deux soirs au plus : le pacte aide sans résoudre l’enquête à votre place.')}
        <h3>Le défi amical</h3>
        ${ul([
          `${DEFI.duree} tours sur une activité que tu fais toi-même : ${Object.values(DEFI_INDICATEURS).map((x) => x.nom.toLowerCase()).join(', ')}.`,
          `Chacun mise la même somme (${DEFI.mises.filter(Boolean).map((m) => `${m} k€`).join(' ou ')}, ou rien). Le gagnant prend le pot et ${DEFI.prime} k€ de prime du district ; en cas d’égalité, chacun récupère sa mise.`,
          'La zone défiée répond le jour même (en message) ou le lendemain ; refuser ne coûte rien. Un seul défi à la fois, pas de défi pour une zone en difficulté.',
        ])}
        <h3>Coup de main</h3>
        ${ul([
          `Seulement vers une zone en péril ou sous tutelle : jusqu’à ${AIDE.budgetMax} k€ (reçus le soir même) et ${AIDE.agentsMax} agents prêtés pour ${AIDE.dureePret} tours. Tu gardes toujours au moins 8 agents.`,
          'Jusqu’à +5 de réputation, atteints avec 3 agents ou 7,5 k€ (1 agent vaut 2,5 k€) ; une aide plus large rapporte jusqu’à 40 % de plus (+7).',
        ])}
        <h3>Le Conseil de police</h3>
        <p>Chaque dimanche, une voix par zone active, vote secret, résultat à 20:00 (égalité : la première option l'emporte).</p>
        ${ul([
          '<strong>Dotation fédérale de 20 k€</strong> : parts égales, ou prime aux zones les plus coopératives (pactes tenus, FIPA honorées, pièces partagées).',
          `<strong>Fonds de solidarité</strong>, quand une zone est en difficulté : chaque autre zone active lui verse ${SOLIDARITE.parZone} k€.`,
          '<strong>Blâme</strong> : proposé contre les zones les moins coopératives de la semaine (FIPA revendiquées ou refusées, pactes rompus). Effet : −10 de réputation et −30 PS.',
          `<strong>Motion de Chef de corps</strong>, une par saison : ${Object.values(MOTIONS_CHEF).map((m) => m.titre.toLowerCase()).join(', ')}.`,
        ])}
        <h3>Le Conseil des chefs : les crises du district</h3>
        <p>Environ tous les 5 jours, le Directeur annonce une crise choisie d’après l’état du district (cambriolages, rodéos, deal, nuits agitées). Le lendemain, chaque zone active vote sur l’HP, en secret jusqu’à 20:00. Le plan gagnant s’applique à tout le district pendant ${CRISE.duree} jours.</p>
        ${table(['Plan', 'Avantage', 'Prix'], PLANS.map((p) => [`<strong>${p.k}</strong> · ${esc(p.nom)}`, esc(p.plus), esc(p.moins)]))}
        ${ul([
          'Une zone, une voix, quelle que soit sa taille. Égalité ou aucune voix : travail discret (B). La Gazette publie le score, pas qui a voté quoi.',
          `Opération commune : voter C, c’est s’engager (on peut se retirer un soir sur l’HP) ; les autres zones peuvent la rejoindre. Chaque participant engage ${Math.round(CRISE.C.part * 100)} % de ses agents (${CRISE.C.min} au moins), à laisser sans affectation dans les Ordres. Un soir est réussi si au moins les 3/4 des zones qui ont voté C sont là (2 au moins ; celles qui rejoignent comptent aussi) ; il en faut ${CRISE.C.nuitsOk} sur 3.`,
          `Réussie : chaque zone présente au moins ${CRISE.C.nuitsOk} soirs est récompensée, les autres ont seulement criminalité −${Math.abs(CRISE.C.crimDistrict)}. Ratée : rien de plus. Qui ne participe pas ne paie ni ne gagne.`,
          'Le bon plan dépend de ta zone : une zone forte en Recherche gagne plus au B, une zone d’Intervention et de Roulage au A. De quoi discuter sur la radio avant le vote.',
        ])}`,
    },
    {
      id: 'vagues', titre: 'Vagues de délinquance et relèves', html: `
        <p>Ce que fait ta zone déborde chez les voisines, en bien comme en mal.</p>
        <h3>Les vagues de délinquance</h3>
        ${ul([
          `Une zone dont un service (Intervention, Proximité, Recherche ou Roulage) atteint au moins <strong>${String(VAGUES.seuil).replace('.', ',')} fois la médiane du district</strong> chasse la délinquance de chez elle. Elle part, la nuit, vers <strong>la zone voisine la plus faible</strong>, et frappe le soir suivant là où cette voisine est la plus faible (n’importe quel service, Accueil compris).`,
          'Le matin, la Gazette annonce la vague et le quartier visé, sans dire qui l’a provoquée. Un repère 🌊 apparaît sur la carte. La zone visée voit sur son HP et dans ses ordres combien de capacité il lui faut pour tenir.',
          `<strong>Vague brisée</strong> (capacité au moins égale à la médiane, un peu plus pour une vague forte) : +${VAGUES.gain.points} pts, +${VAGUES.gain.moral} de moral, +${VAGUES.gain.satisfaction} de satisfaction et +${VAGUES.gain.ps} PS par niveau de force (1 à ${VAGUES.forceMax}).`,
          `<strong>Vague subie</strong>, par niveau de force : +${VAGUES.effet.incidents} incidents (Intervention), +${VAGUES.effet.tension} de tension dans le quartier frontalier (Proximité), un dossier en plus (Recherche), −${String(VAGUES.effet.roulageSatisf).replace('.', ',')} de satisfaction (Roulage) ou +${VAGUES.effet.paperasse} de paperasse (Accueil).`,
          `Une zone envoie au plus une vague tous les ${VAGUES.repos} soirs et en reçoit au plus une par soir. Les zones arrivées depuis moins de ${VAGUES.protectionNouveaux} tours et celles sans ordres depuis 2 tours n’en reçoivent pas.`,
          'Tout miser sur un service, c’est donc envoyer des vagues… et laisser un trou ailleurs, où celles des autres arriveront.',
        ])}
        <h3>La relève</h3>
        ${ul([
          'Quand une opération d’envergure ne réussit qu’à moitié, qu’une affaire disputée est bouclée avec un dispositif juste suffisant, ou parfois quand une vague est brisée, un suspect file vers une zone voisine.',
          `Le lendemain, cette zone choisit : <strong>le prendre</strong> (${RELEVE.min} à ${RELEVE.max} agents d’Intervention pour la soirée), <strong>« pas l’effectif »</strong> (aucune conséquence, le suspect s’évapore) ou <strong>le transmettre</strong> à une autre de ses voisines (une seule fois).`,
          `La zone de départ peut ajouter jusqu’à ${RELEVE.appuiMax} agents d’appui. Avec ${RELEVE.requis} agents au total, la capture est assurée ; à un près, une chance sur deux.`,
          `Capture : +${RELEVE.gain.releve.points} pts, +${RELEVE.gain.releve.reputation} de réputation et +${RELEVE.gain.releve.satisfaction} de satisfaction pour celle qui l’a prise ; +${RELEVE.gain.depart.points} pts et +${RELEVE.gain.depart.reputation} de réputation pour celle qui a passé le relais (+${RELEVE.gain.appui.points} pts par agent d’appui).`,
          `Une fois sur trois environ, un bonus : les <strong>félicitations du juge</strong> (+${RELEVE.juge.reputation} de réputation, +${RELEVE.juge.moral} de moral), ou une <strong>saisie à partager</strong> : celle qui a fait la capture choisit l’argent (${RELEVE.saisie.argent} k€) ou une voiture anonymisée, l’autre zone reçoit le reste.`,
        ])}`,
    },
    {
      id: 'faillite', titre: 'Péril, tutelle et faillite', html: `
        <p>Une zone est <strong>en péril</strong> dès que l'une de ces conditions est atteinte :</p>
        ${ul([`budget sous ${PERIL.budget} k€ ;`, `moins de ${PERIL.agents} agents disponibles ;`, `moral sous ${PERIL.moral}.`])}
        <p>Le chef a alors <strong>${PERIL.tours} tours pour redresser la barre</strong>. Un bandeau rouge s'affiche sur l'HP ; les autres zones peuvent lui donner un coup de main (onglet Pactes de la Carte) et le Conseil peut voter un fonds de solidarité.</p>
        <h3>Toujours en péril au bout de ${PERIL.tours} tours : la tutelle</h3>
        <p>La première fois de la saison, la zone passe <strong>sous tutelle pendant ${TUTELLE.tours} tours</strong> : c'est la dernière chance.</p>
        ${ul([
          `Avance de trésorerie de ${k(TUTELLE.avance)} et +${TUTELLE.moral} de moral (la nouvelle direction rassure).`,
          'Interdit : rythme renforcé, agents de réserve, défis, enchères, et toute grande décision sauf recruter.',
          'Les autres zones peuvent toujours lui donner un coup de main (jusqu’à +7 de réputation pour elles).',
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
          'Deux bonnes réponses débloquent un bonus au choix : +1 indice d’enquête, +3 de moral, +2 k€ ou +10 % de capacité pour un service. Trois sur trois : prime « sans faute » en plus (+3 k€, +2 de moral, +5 PS). Comme pour la prime au personnel, les bonus de moral rapportent moins quand le moral est déjà haut : moitié de 70 à 85, +1 au-delà.',
        ])}
        <h3>Pas le temps ou pas l’envie ?</h3>
        <p>Tant que tu n’as répondu à aucune énigme du jour, deux autres façons de gagner le bonus (bouton en haut de l’écran Énigmes). Dans les deux cas, pas de PS ni de prime « sans faute », et les 3 énigmes se ferment (le dossier noir reste ouvert).</p>
        <p><strong>Quiz express</strong> : 5 questions de culture générale (Monde, Sciences, Belgique), 15 secondes chacune, 4 réponses possibles. 3 bonnes réponses : tu choisis ton bonus comme avec les énigmes. Moins : pas de bonus, sans autre conséquence. Un seul essai, et le chrono tourne même si tu quittes l’écran.</p>
        <p>Ou les <strong>confier à un agent</strong> et choisir le bonus qu’il doit viser. À 20:00, il le décroche avec 60 % de chances à 50 de moral (de 40 à 80 % selon le moral : 5 points de chance par 10 points de moral). Pas de moral perdu s’il sèche ; pendant qu’il planche, +1 dossier de paperasse. Tu peux changer le bonus visé jusqu’à 20:00.</p>
        <h3>Les outils</h3>
        ${ul([
          '<strong>Un coup de pouce ?</strong> : une piste de méthode, sans la réponse.',
          '<strong>Brouillon</strong> : une zone de notes par énigme, gardée sur ton appareil.',
          'Chaque énigme a une seule solution, et il faut toujours croiser plusieurs indices : aucune ne se devine au hasard.',
        ])}
        <h3>Les types d'énigmes</h3>
        ${table(['Type', 'Principe'], [
          [QUEST_LABELS.quiment, 'Des témoins parlent de la sincérité des autres. Un seul ment (deux le dimanche) : trouve qui. Tu peux marquer chaque déclaration « dit vrai » ou « ment » pour tester tes hypothèses.'],
          [QUEST_LABELS.grille, 'Des auditions à recouper : qui conduisait quoi, et où. Une grille à cocher est fournie.'],
          [QUEST_LABELS.cadenas, 'Trouver le code à partir des essais annotés du suspect, puis le composer en faisant rouler les molettes du cadenas.'],
          [QUEST_LABELS.chronologie, 'Le journal du 101 ne garde que les écarts entre les faits : remets les cartes dans l’ordre sur la ligne du temps (glisser ou flèches).'],
          [QUEST_LABELS.code, 'Déchiffrer un message saisi en faisant tourner le disque de décodage ; les méthodes se corsent en fin de semaine.'],
        ])}`,
    },
    {
      id: 'incidents', titre: 'Les incidents du jour (mini-jeux)', html: `
        <p>Une ou deux fois par jour, à une heure imprévue (entre 6 h et 12 h, ouvert jusqu’à 20:00), un incident tombe sur un de tes services. L’HP affiche un compte à rebours jusqu’au prochain, puis l’incident reste ouvert <strong>jusqu’à 20:00</strong> (8 à 14 heures pour jouer). Plus un service compte d’agents, plus il a de chances d’être touché.</p>
        ${ul([
          '<strong>Un seul essai</strong> par incident. Quitter en cours de partie compte comme un échec.',
          'La difficulté suit l’effectif du service en service le jour où l’incident tombe (tes ordres validés la veille à 20:00) : plus d’agents que la répartition de base, c’est plus facile ; moins, c’est plus dur. Elle est fixée dès que l’incident tombe : changer tes ordres ensuite n’y change rien.',
          `<strong>Réussi</strong> : +${PS.queteOk} PS, un bonus propre au service (voir le tableau) et des points sur la <strong>jauge des skins</strong> (+2 sans faute, +1 sinon). À ${INC.jauge} points, un nouveau skin pour ton commissariat (ou +5 k€ si tu les as tous).`,
          `<strong>Raté ou abandonné</strong> : −1 de moral, comme une énigme ratée (+${PS.queteTentee} PS pour avoir essayé).`,
          '<strong>Pas joué</strong> : ton équipe se débrouille seule. Elle réussit d’autant plus souvent que le service est fourni ; sinon, un petit malus. Rien à gagner sans jouer.',
          'Chaque mini-jeu a son tuto. Pour t’exercer sans enjeu : écran Énigmes, onglet « Entraînement ».',
        ])}
        ${table(['Service', 'Incident', 'Réussi', 'Raté', 'Pas joué et raté'], Object.entries(INCIDENTS).map(([k, x]) => [SERVICE_LABELS[k], esc(x.titre), esc(texteGain(GAIN[k])), esc(texteMalus(MALUS[k].plein)), esc(texteMalus(MALUS[k].leger))]))}
        <h3 class="kicker" style="margin:10px 0 0">🚨 L’urgence du jour : « ${esc(URGENCE.titre)} »</h3>
        <p>Une fois par jour, en plus des incidents, des collègues pris à partie demandent du renfort (même horaire, ouvert jusqu’à 20:00). Mini-jeu <strong>Bitonal</strong> : rejoindre l’adresse au plus vite, en feu bleu, sur une rue à double sens. Les voitures devant toi s’écartent tard, celles d’en face serrent (pas toutes), des îlots bloquent l’axe, des voitures traversent aux feux rouges : passe sous 30 km/h et elles s’arrêtent.</p>
        ${ul([
          '<strong>Tu choisis le véhicule qui part</strong> parmi ceux en service quand l’urgence tombe. Sa vitesse dépend de son modèle, de son état (de 80 % de la vitesse usé à 100 % neuf), de sa carrosserie (cabossé : −6 %) et de la <strong>préparation des combis</strong> (Grande décision › Équiper, ' + PREPA.max + ' niveaux à ' + [0, 1, 2].map(coutPrepa).join(', ') + ' k€ : +' + Math.round(PREPA.vitesse * 100) + ' % de vitesse et +' + Math.round(PREPA.frein * 100) + ' % de freinage par niveau, remise à zéro chaque saison).',
          `<strong>À temps</strong> : +${URGENCE.gain.moral} de moral, +${PS.queteOk} PS et la jauge des skins (+2 sans accrochage, +1 sinon). Chaque accrochage use le parc (+${URGENCE.usureParAccrochage} %).`,
          `<strong>Trop tard</strong> (ou abandon en route) : ${Math.round(URGENCE.blessure * 100)} % de risque qu’un collègue soit blessé, absent ${URGENCE.absence} jours (moins avec le stand de tir et le matériel d’Intervention) ; sinon ${URGENCE.moralRetard} de moral.`,
          `<strong>Trop d’accrochages</strong> (3, ou 4 pour un fourgon) : le véhicule doit s’arrêter et une autre équipe prend le relais. Il n’est pas perdu : il rentre cabossé (s’il l’était déjà, +${URGENCE.usureHS} % d’usure). Rien d’autre. Chaque accrochage use le véhicule parti.`,
          '<strong>Temps cible</strong> : il s’ajuste chaque nuit sur les courses réelles de la partie (les 30 dernières de chaque niveau, ramenées à un combi neuf), pour qu’environ deux courses sur trois arrivent à temps avec un combi en parfait état. Un combi usé ou cabossée garde moins de marge, un combi préparé en a plus.',
          '<strong>« Pas le temps »</strong> : une autre équipe y va. Ni bonus, ni malus.',
          `<strong>Pas joué</strong> : l’Intervention se débrouille seule ; si elle n’y arrive pas, ${Math.round(URGENCE.seule.blessure * 100)} % de risque de blessé, sinon ${URGENCE.seule.moral} de moral.`,
          '<strong>Meilleurs scores</strong> : le score de chaque urgence (dépassements, frôlements, avance) entre au classement de la partie, un par niveau (facile, normal, difficile), affiché à l’ouverture du mini-jeu et sur sa tuile d’entraînement. L’entraînement ne compte pas.',
        ])}`,
    },
    {
      id: 'imprevus', titre: 'Le Directeur, imprévus et coups durs', html: `
        <p><strong>Le Directeur</strong> : un maître du jeu invisible décide de ce qui arrive à chaque zone. Pas de dés à heure fixe : il suit un rythme, lit tes points faibles et ton classement, et s’adapte.</p>
        <p><strong>Le ciel du jour</strong> (en haut de l’HP) : <strong>ciel clair</strong> (calme, le moment d’investir), <strong>ciel chargé</strong> (ça se couvre : signes à surveiller, tracas possibles), <strong>orage</strong> (grosse journée : opération d’envergure, coup dur ou feuilleton décisif), puis <strong>éclaircie</strong> (rien de grave, de bonnes nouvelles possibles). Après un orage vient toujours une éclaircie.</p>
        <p><strong>Feuilletons</strong> : des histoires sur un ou plusieurs jours (cambrioleur des toits, rodéos urbains, audit de l’Inspection, contrôle technique, évasion, fête de quartier…). Le signe apparaît dans la situation du jour avec ce qu’il faut faire ce soir : réussis et l’histoire s’arrête avec des points et de la satisfaction, rate et elle peut empirer.</p>
        <p><strong>Dilemmes</strong> : une carte avec deux choix sur l’HP (grogne syndicale, indic, journaliste, sponsor…). Ton choix part avec tes ordres validés ; sans réponse, ton adjoint tranche.</p>
        <p><strong>Événements du district</strong> : tempête, canicule, Fêtes du Delta, marathon. Annoncés la veille, vécus par toutes les zones le même soir ; la Gazette cite celles qui ont tenu bon.</p>
        <p><strong>Ensemble</strong> : un <strong>fugitif à la frontière</strong> de deux zones ne se prend qu’avec 2 patrouilles de chaque côté, le même soir (une seconde chance le lendemain) ; un <strong>défi en duo</strong> donne le même feuilleton à deux zones proches au classement, avec un bonus commun si les deux réussissent ; une zone en difficulté prise dans un orage lance un <strong>appel du district</strong> : le renfort y est payé ×1,5.</p>
        <p><strong>L’ennemi de la saison</strong> : un malfaiteur insaisissable (le Fantôme du Delta, la Fouine…) apparaît dans une zone tous les deux ou trois jours. 3 patrouilles là où il est aperçu ajoutent une pièce à son dossier. Le dernier soir de la saison, l’« Opération Filet » réunit tout le district : plus le dossier est épais, moins il faut d’agents.</p>
        <p><strong>Il se souvient</strong> : l’indic payé revient, la journaliste bien reçue prend ta défense lors d’une plainte (celle que tu as déçue en rajoute), le sponsor du combi finit par faire parler de lui, la grogne revient si la prime a « marché ».</p>
        <p><strong>Il lit ta façon de jouer</strong> : la même répartition plusieurs jours d’affilée finit par se voir (feuilletons sur les services que tu délaisses) ; de l’argent qui dort attire des occasions (matériel fédéral à prix cassé) ; une Proximité délaissée déclenche des pétitions de quartier.</p>
        <p><strong>Le parquet surveille</strong> : il finance les zones pour leur propre travail d’enquête. Si ton dossier de l’affaire en cours vient surtout des pièces des autres (au moins 4 reçues et 60 % du dossier), il t’avertit ; au-delà (6 reçues et 70 %), ton subside judiciaire est réduit chaque soir (−2 k€, −1 de réputation) et, si tu identifies l’auteur à ce moment-là, le mérite est partagé (moitié des points d’enquête). Partager reste récompensé : seul celui qui reçoit sans enquêter lui-même est visé. Tes propres démarches, l’enquête de voisinage, l’appui PJF et les bonus d’énigme comptent comme ton travail.</p>
        <p><strong>Enquête</strong> : si le district piétine en fin de semaine, un témoin tardif apporte aux zones à la traîne une pièce qui permet d’écarter quelqu’un. Celles qui avancent ne reçoivent rien.</p>
        <p><strong>Retour d’absence</strong> : après quelques jours sans ordres, ton retour est salué (moral, Gazette) et suivi de deux jours d’éclaircie.</p>
        <p><strong>Équitable</strong> : une zone en tête du classement est surtout testée par des défis qui rapportent ; une zone en difficulté a des éclaircies plus longues et plus d’occasions. Une zone absente est laissée tranquille (ni coup dur ni opération).</p>
        <p><strong>Énigmes et mini-jeux à ta mesure</strong> : le niveau des énigmes du jour (lundi facile, dimanche corsé) se décale d’un cran au plus par nuit selon tes réussites récentes et ton rang aux énigmes, de 2 niveaux plus facile à 1 plus difficile ; le dossier noir garde son niveau. Les mini-jeux des incidents font pareil, d’un cran (facile, normal, difficile).</p>
        <p><strong>Aléas légers</strong> : de petites surprises, bonnes ou mauvaises (croissants offerts, subside, agent cloué au lit, imprimante en panne, dégât des eaux qui retarde d’un tour les pièces d’enquête demandées…). Plus fréquentes par ciel chargé ; un Accueil laissé vide plusieurs jours attire les tracas internes.</p>
        <p><strong>L’Accueil comme assurance</strong> : les tracas internes (informatique, locaux, papiers, grève, plainte, panne générale) sont évités dans 15 % des cas par agent d’Accueil au-delà de 2, jusqu’à 60 %. Le rapport le signale quand ton Accueil a paré le coup.</p>
        <p><strong>Interventions musclées</strong> : dans la zone de non-droit, chaque agent engagé au-delà de 3 sur un même secteur ajoute ${Math.round(ND.risqueParAgent * 100)} % de risque qu’un agent soit blessé pendant l’assaut (3 tours d’absence), jusqu’à ${Math.round(ND.risqueMax * 100)} %. Le <strong>stand de tir</strong> divise ces risques par deux, comme celui des grosses équipes engagées sur une affaire.</p>
        <p><strong>Coups durs</strong> : ils tombent surtout les jours d’orage, et visent ta plus grande faiblesse ; le rapport dit pourquoi. Ta gestion en réduit le risque :</p>
        ${table(['Coup dur', 'Effet', 'Ce qui le rend plus rare'], COUPS_DURS.map((c) => [esc(c.titre), {
          rebellion: '1 ou 2 agents blessés (1 seul avec un stand de tir), absents 2 à 4 tours, −4 de moral',
          grippe: '10 à 20 % des agents malades 2 tours',
          plainte: '−6 de satisfaction, un agent bloqué 2 tours',
          panne: 'administration à l’arrêt ce tour',
        }[c.id], {
          rebellion: 'niveau et équipement en Intervention',
          grippe: 'moral au-dessus de 70, salle de sport',
          plainte: 'paperasse sous 8, réputation au-dessus de 60, Accueil fourni',
          panne: 'logiciel de gestion, Accueil fourni',
        }[c.id]]))}
        <h3>Accidents de véhicules de service</h3>
        <p>Chaque soir, tes véhicules peuvent avoir un accident. Le risque (environ ${Math.round(SINISTRE.base * 100)} % de base, ${Math.round(SINISTRE.max * 100)} % au maximum) dépend de ta façon de rouler :</p>
        ${ul([
          'il <strong>augmente</strong> avec le nombre d’interventions du jour, l’usure du parc (une révision le fait baisser), le rythme renforcé, un moral sous 40 et des équipages entassés (plus de 2,5 agents d’Intervention par véhicule disponible) ;',
          `il <strong>baisse</strong> avec la formation en Intervention (−${Math.round(SINISTRE.formation * 100)} % par niveau) et l’atelier mécanique (−${Math.round((1 - SINISTRE.atelier) * 100)} %). Le risque de la veille est affiché avec la révision, dans tes dépenses.`,
        ])}
        ${table(['Gravité', 'Fréquence', 'Conséquences'], [
          ['Accrochage', `${SINISTRE.poids.accrochage} %`, `Le véhicule reste en service mais il est <strong>cabossé</strong>. Tu as un tour pour le passer en carrosserie (${k(SINISTRE.carrosserie)} par véhicule, moitié prix et sans immobilisation avec l’atelier) : tous d’un coup dans tes dépenses, ou un par un en touchant le véhicule sur l’HP. Ensuite, chaque tour : −${SINISTRE.imageSatisfaction} de satisfaction et −${SINISTRE.imageReputation} de réputation par véhicule cabossé ; au bout de ${SINISTRE.virale} tours, la photo fait le tour des réseaux (−${SINISTRE.viraleReputation} de réputation, dans la Gazette).`],
          ['Véhicule sinistré', `${SINISTRE.poids.total} %`, `Perte totale : un véhicule de moins, à racheter (grande décision « Équiper », ${COUTS.vehicule} k€, ou un lot de la salle des ventes). Si le tiers est en tort, son assureur rembourse ${k(Math.round(COUTS.vehicule * SINISTRE.indemnite * 10) / 10)} ${SINISTRE.delaiIndemnite} tours plus tard. Si ta zone est en tort : rien, +2 dossiers de paperasse et −2 de réputation.`],
          ['Accident grave', `${SINISTRE.poids.grave} %`, 'Perte totale comme ci-dessus, plus un agent blessé (2 ou 3 tours), −3 de moral et −4 de satisfaction ; −4 de réputation si ta zone est en tort.'],
        ])}
        ${note('Qui est en tort ? Environ une fois sur trois au départ, plus souvent en rythme renforcé ou avec un moral sous 40, moins souvent avec une Intervention bien formée. Une zone ne perd jamais son dernier véhicule : il part 3 tours en réparation lourde.')}
        <p><strong>Inspection générale</strong> : deux tours de budget négatif ou plus de 20 dossiers de paperasse. Amende de 5 k€, −5 de satisfaction, puis 4 tours de répit.</p>`,
    },
    {
      id: 'progression', titre: 'Points de service, grades et saisons', html: `
        <h3>Points de service (PS)</h3>
        <p>Ils récompensent l'assiduité et ne se perdent jamais, même d'une saison à l'autre. Maximum ${PS.plafondJour} PS par jour pour ton propre jeu, plus ${PS.plafondEntraide} PS d’entraide (renfort, indices partagés, contribution à l’enquête, FIPA, pactes, grand événement, secteurs tenus dans la zone de non-droit) : aider les autres n’est jamais perdu.</p>
        ${table(['Action', 'PS'], [
          ['Passer ses ordres', `+${PS.ordres}`], ['Bonne réponse à une énigme', `+${PS.queteOk} (tentative ratée : +${PS.queteTentee})`], ['Trois énigmes sur trois', '+5'],
          ['Découverte d’un auteur', '+15'], ['Arrestation', '+10'], ['Participer à une FIPA', '+10'], ['Partager un indice', '+5'], ['Indice qui aide une découverte', '+5'],
          ['Agents envoyés sur un grand événement du district', `+${PS.evenement} pour 3 agents, proportionnel au nombre envoyé (max. +${PS.evenementMax})`], ['Renfort prêté sur une opération d’envergure', `+${RENFORT.psParAgent} par agent prêté`], ['Pacte conclu', `+${PACTE.psAccord}`], ['Pacte mené à son terme', `+${PACTE.psFin}`],
          ['Finir une saison classé', `+${PS.finSaison}`],
        ])}
        <h3>Grades</h3>
        ${table(['Grade', 'PS', 'Débloque'], GRADES.map((g) => [g.nom, g.ps, esc(g.debloque)]))}
        <p>Les consignes du pilote et le blason se règlent dans ton Profil ; la motion du Chef de corps dans l'onglet Pactes de la Carte. Un blâme du Conseil retire 30 PS ; seule une faillite fait redescendre d'un grade.</p>
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
