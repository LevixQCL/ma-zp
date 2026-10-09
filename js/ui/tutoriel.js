// Visite guidée de la première connexion : les onglets et le fil rouge de la journée.
// Une bulle qui suit l'écran réel, un projecteur sur l'élément dont on parle, et trois petits
// gestes à faire soi-même (ouvrir les Ordres, déplacer un agent, valider). On peut la quitter
// à tout moment et la relancer depuis le Guide ; les anciens joueurs peuvent la zapper.
import { S, esc, myZone } from './common.js';
import { ENQ, delaiTraque, affaire } from '../engine/enquete.js';
import { marquerTutoVu } from './tableau.js';
import { reglesV2 } from '../engine/regles.js';

const CLE = 'mazp-tuto';            // 'fait' ou 'zappe' une fois terminée ou refusée
const CLE_ETAPE = 'mazp-tuto-etape'; // étape en cours (reprise après un rechargement)
const lire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const ecrire = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* pas de stockage */ } };

const zoneNom = () => { const z = myZone(); return z ? `ZP ${esc(z.code)} ${esc(z.nom)}` : 'ta zone'; };
const alloc = () => JSON.stringify((S.draft && S.draft.alloc) || {});

/**
 * Étapes. `route` : onglet affiché ; `cible` : sélecteur de l'élément mis en lumière (sinon bulle centrée) ;
 * `geste` : ce que le joueur fait lui-même, avec `fait()` qui dit quand c'est réussi.
 * `onglet` : première étape d'un onglet. On ne change pas d'écran à la place du joueur : on éclaire
 * l'onglet dans la barre du bas et on lui demande de le toucher (le texte donné sert d'accroche).
 */
const ONGLETS = { hp: 'HP', ordres: 'Ordres', terrain: 'Terrain', enquete: 'Enquête', quete: 'Énigmes', carte: 'Carte', radio: 'Radio' };
/** Étape « onglet » dont l'écran n'est pas encore ouvert : le joueur doit toucher l'onglet. */
const attendOnglet = (e) => !!(e.onglet && e.route && S.route !== e.route);
/** L'affaire en cours se conclut-elle par une confrontation (meurtre) plutôt qu'une accusation ? */
const corbeau = () => { try { const n = S.state && S.state.enquete && S.state.enquete.n; return !!(n && affaire(S.state, n).genre === 'corbeau'); } catch (e) { return false; } };
const meurtre = () => { try { const n = S.state && S.state.enquete && S.state.enquete.n; return !!(n && affaire(S.state, n).meurtre); } catch (e) { return false; } };

export const ETAPES = [
  {
    id: 'bienvenue', route: 'hp',
    titre: () => `Bienvenue, chef de la ${zoneNom()} !`,
    texte: () => `<p>Tu diriges une zone de police du District Delta, aux côtés d’autres chefs de zone. En trois minutes : les <strong>sept onglets</strong> et ce qu’il y a à faire chaque jour.</p>
      <p class="tuto-note">Tu peux quitter à tout moment : la visite se relance depuis le Guide du joueur.</p>`,
  },
  {
    id: 'fil-rouge', route: 'hp', cible: 'section[aria-label="Prochain tour"]',
    titre: 'Le fil rouge de ta journée',
    texte: () => (reglesV2(S.state) ? `<p><strong>Tout se joue à 20:00</strong>, pour toutes les zones en même temps : jouer tôt ne donne aucun avantage. Le <strong>gros bouton</strong> t’emmène à la prochaine chose à faire ; les petites icônes au-dessus se cochent au fur et à mesure.</p>
      <p>Le <strong>ciel</strong> annonce ta journée : clair, chargé, orage ou éclaircie. Touche sa pastille pour comprendre.</p>` : `<p><strong>Tout se joue à 20:00</strong>, pour toutes les zones en même temps : jouer tôt ne donne aucun avantage. Cette liste dit ce qu’il te reste à faire avant ce soir.</p>
      <p>Le <strong>ciel</strong> annonce ta journée : clair, chargé, orage ou éclaircie. Touche sa pastille pour comprendre. Certains jours, un <strong>dilemme</strong> apparaît juste en dessous : deux choix, à trancher avant 20:00.</p>`),
  },
  {
    id: 'incidents', route: 'hp', cible: ['section[aria-label="Aujourd’hui"]', '#hp-incidents'],
    titre: () => (reglesV2(S.state) ? 'Aujourd’hui : incidents et décisions' : 'Les incidents du jour'),
    texte: () => (reglesV2(S.state) ? `<p>Une ou deux fois par jour, à une heure imprévue, un <strong>incident</strong> tombe sur un de tes services : colis suspect, porte à crocheter, parking à débloquer, rapport à corriger.</p>
      <p>Tu as <strong>12 heures</strong> pour jouer le mini-jeu, avec <strong>un seul essai</strong>. Si tu réussis : des PS, un bonus, et ta jauge de skins monte. Si tu rates : jamais pire que si tu n’y étais pas allé.</p>
      <p>Les dilemmes, le Conseil et les alertes arrivent ici aussi, une ligne chacun : touche une ligne pour la déplier.</p>` : `<p>Une ou deux fois par jour, à une heure imprévue, un <strong>incident</strong> tombe sur un de tes services : colis suspect, porte à crocheter, parking à débloquer, rapport à corriger.</p>
      <p>Tu as <strong>12 heures</strong> pour jouer le mini-jeu, avec <strong>un seul essai</strong>. Si tu réussis : des PS, un bonus, et ta jauge de skins monte. Si tu rates : jamais pire que si tu n’y étais pas allé, ton équipe peut encore rattraper le coup. Chaque mini-jeu a son propre tuto.</p>`),
  },
  {
    id: 'zone', route: 'hp', cible: 'section[aria-label="Ma zone"]',
    titre: 'Ta zone en un coup d’œil',
    texte: () => (reglesV2(S.state) ? `<p>L’<strong>IPZ</strong> est ta note du jour, sur 100 ; c’est la moyenne de la saison qui compte au classement (les derniers jours comptent plus).</p>
      <p>Surveille la <strong>satisfaction</strong> (le plus gros poids) et le <strong>moral</strong>, qui règle l’efficacité de tous tes agents. Touche une jauge pour voir le calcul avec tes chiffres. Touche ton commissariat, en haut, pour voir ce que te rapportent tes bâtiments, et le pinceau pour le personnaliser.</p>` : `<p>L’<strong>IPZ</strong> est ta note du jour, sur 100 ; c’est la moyenne de la saison qui compte au classement (les derniers jours comptent plus).</p>
      <p>Surveille la <strong>satisfaction</strong> (le plus gros poids) et le <strong>moral</strong>, qui règle l’efficacité de tous tes agents. Chaque <strong>?</strong> détaille le calcul avec tes chiffres. Touche ton commissariat pour voir ce que te rapportent tes bâtiments.</p>`),
  },
  {
    id: 'classement', route: 'hp', v2: true, cible: '.hp-classement',
    titre: 'Les classements',
    texte: `<p>Ce bouton ouvre les <strong>classements</strong> du district : IPZ de la saison, enquête, énigmes et grades. Ton rang s’affiche à droite.</p>
      <p>On n’est classé qu’après <strong>5 soirs joués</strong> dans la saison : c’est la régularité qui paie.</p>`,
  },
  {
    id: 'rapport', route: 'hp', cible: ['section[aria-label="Mes raccourcis"]', '[data-action="toggle-rapport"]'],
    titre: 'Chaque soir : rapport et Gazette',
    texte: () => (reglesV2(S.state) ? `<p>Après 20:00, ton adjoint te résume la nuit dans une bulle. Ton <strong>rapport</strong> dit tout ce qui s’est passé chez toi, la <strong>Gazette</strong> raconte la soirée du district.</p>
      <p>Tes <strong>raccourcis</strong> sont à toi : touche « Modifier » pour choisir les quatre que tu veux voir (enchères, équipe, rapport, Gazette, trophées, classement, Challenge).</p>` : `<p>Après 20:00, ton <strong>rapport</strong> dit ce qui s’est passé chez toi et pourquoi. La <strong>Gazette</strong> raconte la soirée du district.</p>
      <p>Plus bas sur l’HP : <strong>Mon équipe</strong>, cinq figures qui encadrent chacune un service et gagnent des surnoms (et du bonus) avec l’expérience.</p>`),
  },
  {
    id: 'affectation', route: 'ordres', onglet: 'L’onglet le plus important de la journée : c’est là que tu décides où travaillent tes agents.',
    cible: 'section[aria-label="Affectation des agents"]',
    titre: 'Cinq services à équilibrer',
    texte: () => (reglesV2(S.state) ? `<p>Chaque ligne est un service, avec <strong>une case par agent</strong> dont il a besoin : une case vide en pointillé, c’est un manque. Le badge à droite dit si le service est couvert.</p>
      <p><strong>Intervention</strong> traite les incidents · <strong>Proximité</strong> calme les quartiers · <strong>Recherche</strong> élucide les dossiers et nourrit l’enquête · <strong>Roulage</strong> rapporte des amendes · <strong>Accueil</strong> vide la paperasse. Aucun ne suffit seul.</p>` : `<p><strong>Intervention</strong> traite les incidents · <strong>Proximité</strong> calme les quartiers · <strong>Recherche</strong> élucide les dossiers et nourrit l’enquête · <strong>Roulage</strong> rapporte des amendes · <strong>Accueil</strong> vide la paperasse.</p>
      <p>Sous chaque service, son résultat estimé pour ce soir. Aucun ne suffit seul : un incident raté ou une pile de dossiers se paie vite.</p>`),
  },
  {
    id: 'doctrine', route: 'ordres', v2: true, cible: 'section[aria-label="Doctrine de la saison"]',
    titre: 'Saison 2 : la doctrine de ta zone',
    texte: `<p>Les <strong>trois premiers jours</strong> de la saison, tu choisis une <strong>doctrine</strong> : une vraie force, et un vrai prix. Elle vaut pour toute la saison.</p>
      <p>Garde la même d’une saison à l’autre et ta <strong>maîtrise</strong> monte. Sans choix au soir du jour 3, ta zone reste « sans doctrine ».</p>`,
  },
  {
    id: 'proxi', route: 'ordres', cible: '[data-action="alloc"][data-s="proximite"][data-d="1"]', parent: '.between',
    titre: 'À toi : ajoute un agent en Proximité',
    texte: '<p>S’il n’y a plus d’agent libre, il est pris au service le plus fourni.</p>',
    geste: { consigne: 'Touche le <strong>+</strong> de la ligne <strong>Proximité</strong>.', avant: () => { S.tutoAlloc = alloc(); }, fait: () => alloc() !== S.tutoAlloc },
  },
  {
    id: 'rythme', route: 'ordres', cible: 'section[aria-label="Rythme"]',
    titre: 'Le rythme de travail',
    texte: `<p><strong>Renforcé</strong> : +35 % d’efficacité, mais le moral baisse et les heures sup’ coûtent. Plusieurs jours de suite, attention à l’épuisement.</p>
      <p><strong>Allégé</strong> : l’inverse, pour remonter le moral. Dans le doute, reste en <strong>Normal</strong>.</p>`,
  },
  {
    id: 'decision', route: 'ordres', cible: ['section[aria-label="Ce soir aussi"]', '[data-action="ord-open"][data-k="decision"]'],
    titre: 'Ce soir aussi',
    texte: () => (reglesV2(S.state) ? `<p>Quatre cases pour le reste de la soirée : ton <strong>chef de corps</strong> (sa journée, ses talents), la <strong>grande décision</strong> (recruter, former, équiper, acheter un véhicule, construire : <strong>une seule par tour</strong>), les <strong>pistes</strong> en cours et les <strong>agents de réserve</strong>.</p>
      <p>Touche une case pour l’ouvrir. Celles qui n’attendent plus rien se replient sur une ligne.</p>` : `<p>La <strong>grande décision</strong> : recruter, former, équiper, acheter un véhicule, construire ou agrandir. <strong>Une seule par tour</strong>, alors choisis bien.</p>
      <p>Dans la même carte : les <strong>dépenses du jour</strong>, les agents envoyés dans la <strong>zone de non-droit</strong> et la figure de <strong>ton équipe</strong> que tu envoies en mission. Touche une ligne pour l’ouvrir.</p>`),
  },
  {
    id: 'valider', route: 'ordres', cible: ['.savebar [data-action="save-orders"]', 'main .card.green', 'main [data-action="save-orders"]'],
    titre: 'À toi : valide tes ordres',
    texte: `<p>Tant que tu n’as pas validé, rien n’est enregistré. Tu peux encore changer d’avis <strong>jusqu’à 20:00</strong>.</p>
      <p>Un jour sans ordres ? Le <strong>pilote automatique</strong> reprend ta dernière répartition, mais ce tour ne compte pas pour ton classement.</p>`,
    geste: { consigne: 'Touche <strong>Valider</strong>.', fait: () => !!S.savedOrders && !S.ordersDirty },
  },
  {
    id: 'chef', route: 'chef', v2: true, onglet: 'Ton chef de corps : ce qu’il fait aujourd’hui, sa semaine, sa carrière.', cible: ['section[aria-label="Ton chef aujourd’hui"]', '.chef-creation'],
    titre: 'Ton chef de corps',
    texte: `<p>C’est toi. Chaque jour, choisis <strong>où il passe sa journée</strong>, s’il monte <strong>en première ligne</strong> et quel <strong>service</strong> demander au réseau : ça part avec tes ordres de 20:00.</p>
      <p>Ses 5 compétences montent selon ta façon de gérer ta zone <strong>et</strong> quand tu réussis tes énigmes et tes mini-jeux. Elles débloquent des <strong>talents</strong>. Plus bas : sa semaine (objectifs, duel) et sa fiche.</p>`,
  },
  {
    id: 'terrain', route: 'terrain', v1: true, /* saison 2 : le Terrain est un calque de la Carte */ onglet: 'Ce qui se joue avec les autres zones.', cible: ['section[aria-label="Zone de non-droit"]', 'section[aria-label="Chez les voisins"]'], union: true,
    titre: 'Terrain : à plusieurs',
    texte: `<p><strong>Zone de non-droit</strong> : le centre de la ville, à reprendre avec les autres zones. Plus on est nombreux sur un secteur le même soir, plus il tombe vite, et il rapporte chaque nuit où on le tient. Un assaut trop léger peut échouer et coûter des blessés.</p>
      <p><strong>Chez les voisins</strong> : appels à renfort et zones en difficulté. Prêter des agents rapporte des PS et de la réputation.</p>`,
  },
  {
    id: 'enquete2', route: 'enquete', v2: true, onglet: 'L’affaire de la semaine, commune à toutes les zones.', cible: ['.e2-hero', '.e2-cta'], union: true,
    avant: () => { S.tabTuto = null; marquerTutoVu(); },
    titre: 'Ton enquête',
    texte: () => `<p>Une affaire par semaine (<strong>${ENQ.dureeMax} jours</strong> au plus), la même pour toutes les zones. Le gros bouton te dit quoi faire ensuite.</p>
      <p>Chaque soir à 20:00, tes nouvelles pièces arrivent <strong>sous enveloppe</strong> : ouvre-les une à une.</p>`,
  },
  {
    id: 'mur2', route: 'enquete', v2: true, cible: ['.e2-mur'],
    titre: 'Le mur des suspects',
    texte: () => (meurtre()
      ? `<p>En haut, ce que dit la scène. Dessous, les suspects : touche un visage pour lire ce qu’on sait, vérifier son alibi ou le réentendre. Note tes ✓ et ✕ : ils s’affichent en tampons.</p><p>${corbeau() ? 'Un seul suspect est le corbeau' : 'Un seul suspect a tué'} : quand tu es sûr, <strong>confronte-le</strong> avec trois éléments du dossier.</p>`
      : `<p>En haut, les trois constatations : quelle heure, quel moyen, quel mobile comptent. Dessous, les suspects : touche un visage pour vérifier son alibi, ses moyens ou son mobile.</p><p>Le coupable est le <strong>seul</strong> à réunir les trois ✓. Une seule accusation par affaire ; ensuite, toutes les zones le traquent.</p>`),
  },
  {
    id: 'soir2', route: 'enquete', v2: true, cible: ['.e2-soir'],
    titre: 'Ce soir',
    texte: `<p>Tes <strong>démarches</strong> en cases : « + » ouvre la liste, prix compris. La <strong>piste</strong> oriente l’enquête de voisinage de tes agents de Recherche, l’<strong>appui fédéral</strong> (labo ou RCCU) arrive le lendemain.</p>
      <p>Tout part avec tes ordres à 20:00. Le grand liège et l’affichage en liste sont dans le menu <strong>⋯</strong>.</p>`,
  },
  {
    id: 'enquete', route: 'enquete', v1: true, onglet: 'L’affaire de la semaine, commune à toutes les zones.',
    avant: () => { S.tabTuto = null; marquerTutoVu(); },
    titre: 'Ton tableau d’enquête',
    texte: () => `<p>Une affaire par semaine (<strong>${ENQ.dureeMax} jours</strong> au plus), la même pour toutes les zones. Tout ce que tu apprends est punaisé sur ce grand liège : suspects, plan de la ville, pièces, et le journal qui ouvre l’affaire.</p>
      <p>Glisse pour te déplacer, pince (ou molette) pour zoomer. Pour relier deux éléments, tire une <strong>ficelle</strong> d’une punaise à l’autre.</p>`,
  },
  {
    id: 'demarches', route: 'enquete', v1: true, cible: ['.tb-haut [data-action="tab-volet"][data-k="boite"]', '.tb-haut [data-action="tab-volet"][data-k="soir"]', 'section[aria-label="Aujourd’hui"]'], union: true,
    titre: 'La boîte et «\u00a0Ce soir\u00a0»',
    texte: `<p>Les pièces arrivent chaque soir dans la <strong>boîte</strong>. C’est toi qui les sors et les punaises où tu veux : le jeu ne trie rien pour toi.</p>
      <p>Touche un suspect ou une pièce pour lancer une <strong>démarche</strong> (deux par jour), demander l’<strong>appui fédéral</strong> (labo ou RCCU, une fois par jour) ou <strong>partager</strong> une pièce avec une autre zone. «\u00a0Ce soir\u00a0» récapitule tout ce qui part à 20:00.</p>`,
  },
  {
    id: 'conclure', route: 'enquete', v1: true, cible: ['.tb-outils [data-action="tab-tuto"]', '.synthese'], parent: '.tb-outils',
    titre: 'Démasquer le coupable',
    texte: () => (meurtre()
      ? `<p>${corbeau() ? 'Un seul suspect est le corbeau' : 'Un seul suspect a tué'} ; les autres mentent pour d’autres raisons. Quand tu es sûr de toi, <strong>confronte-le</strong> avec trois éléments de ton dossier. Si tu as visé juste, il avoue. Sinon, il nie et repart, et tu perds de la réputation. Si tu t’es trompé de personne, le parquet te retire l’affaire.</p>
         <p>Le bouton <strong>?</strong> remontre les gestes du tableau.</p>`
      : `<p>Le coupable est le <strong>seul</strong> à réunir mobile, moyen et occasion. Note tes ✓ et ✕ sur chaque fiche, puis porte <strong>une seule accusation</strong>. Plus elle tombe tôt, plus elle rapporte.</p>
         <p>Ensuite, toutes les zones ont ${delaiTraque(ENQ.traqueTours).replace(/,$/, '')} pour <strong>l’arrêter</strong> dans sa planque. Le bouton <strong>?</strong> remontre les gestes du tableau.</p>`),
  },
  {
    id: 'enigmes', route: 'quete', onglet: 'Trois casse-tête par jour, cinq minutes de réflexion.', cible: ['[aria-label="Énigmes du jour"]', '[data-action="alt-vue"]'], union: true,
    titre: 'Trois énigmes par jour',
    texte: `<p>Trois casse-tête à manipuler chaque jour, <strong>une seule réponse</strong> chacun. Dès deux bonnes réponses, tu choisis un bonus (un indice, du moral, du budget…). Le <strong>dossier noir</strong> est facultatif et vraiment difficile.</p>
      <p>Pas le temps ou pas l’envie ? Un <strong>quiz express</strong> ou un <strong>agent</strong> qui planche à ta place peuvent aussi décrocher le bonus. L’<strong>Entraînement</strong> permet de s’exercer aux énigmes sans enjeu, et le <strong>Challenge</strong> aux mini-jeux d’incident.</p>`,
  },
  {
    id: 'carte-v2', route: 'carte', v2: true, onglet: 'Ta ville en maquette : la zone de non-droit, tes quartiers et tout le district.', cible: '#mes-quartiers', avant: () => { S.carteCalque = 'mazone'; },
    titre: 'La carte : Non-droit et Ma zone',
    texte: `<p><strong>Non-droit</strong> (l’écran qui s’ouvre d’abord) : le centre de la ville, à reprendre ensemble. Touche un secteur rouge et place tes agents dans un rôle : <strong>repérage</strong> (Recherche, révèle la faille du milieu), <strong>descente</strong> (Intervention, fait tomber l’emprise) ou <strong>bouclage</strong> (Roulage et Proximité, plus de saisies). À plusieurs le même soir, c’est bien plus fort ; seul et trop léger, gare aux blessés.</p>
      <p><strong>Ma zone</strong> : touche un quartier, puis remplis ses cases : une case, une patrouille de Proximité, et une voiture qui part tourner dans le quartier. Vise d’abord le <strong>point chaud</strong> 🔥.</p>`,
  },
  {
    id: 'carte', route: 'carte', v1: true, /* saison 2 : la Carte vient juste après les Ordres (étape carte-v2) */ onglet: 'Tes quartiers et tout le district.', cible: '#mes-quartiers',
    titre: 'La carte et tes quartiers',
    texte: `<p>Chaque quartier a sa <strong>tension</strong>. Envoie des patrouilles de <strong>Proximité</strong> là où ça chauffe, surtout sur le <strong>point chaud</strong> annoncé la veille.</p>
      <p>Au centre, hachurée de rouge : la zone de non-droit. L’onglet <strong>Pactes</strong>, en haut, sert à t’allier avec une autre zone (jumelage, enquête, achats) et à voter au Conseil.</p>`,
  },
  {
    id: 'radio2', route: 'radio', v2: true, onglet: 'Pour parler avec les autres chefs de zone.', cible: '[aria-label="Fréquences"]',
    titre: 'La radio : deux fréquences et le privé',
    texte: `<p><strong>F1 · Discussion</strong> : le canal commun, comme une messagerie. On y négocie, on échange des pièces, on se donne rendez-vous.</p>
      <p><strong>F2 · Renforts &amp; ops</strong> : le tableau des appels de ce soir (renforts, non-droit, opérations), avec un bouton pour répondre présent. <strong>Privé</strong> : en tête-à-tête, pour préparer un pacte ou un défi amical.</p>`,
  },
  {
    id: 'radio', route: 'radio', v1: true, onglet: 'Pour parler avec les autres chefs de zone.', cible: '[aria-label="Radio et messages privés"]',
    titre: 'Radio et messages privés',
    texte: `<p><strong>Radio</strong> : le canal commun. On s’y organise pour la zone de non-droit (bouton « Rejoindre » sous une annonce), on échange des pièces, on négocie.</p>
      <p><strong>Privé</strong> : en tête-à-tête, pour se mettre d’accord avant un pacte ou un défi amical.</p>`,
  },
  {
    id: 'fin', route: 'hp', v1: true,
    titre: 'Ta journée type',
    texte: `<ol class="tuto-liste">
        <li>Lis ton <strong>rapport</strong> et la <strong>Gazette</strong>.</li>
        <li>Règle et <strong>valide tes ordres</strong> (et tranche le dilemme s’il y en a un).</li>
        <li>Avance l’<strong>enquête</strong> : pièces au tableau, deux démarches.</li>
        <li>Fais tes <strong>énigmes</strong>, ou le quiz express.</li>
        <li>Quand un <strong>incident</strong> tombe, tu as jusqu’à 20:00 (il tombe entre 7 h et 19 h et reste ouvert 12 heures).</li>
        <li>Coup d’œil au <strong>Terrain</strong> et à la <strong>Radio</strong> : on avance mieux à plusieurs.</li>
      </ol>
      <p class="tuto-note">Le détail est dans le <strong>Guide du joueur</strong> (roue dentée en haut de l’HP), d’où tu peux aussi relancer cette visite. Bon service !</p>`,
  },
  {
    id: 'fin2', route: 'hp', v2: true,
    titre: 'Ta journée type',
    texte: `<ol class="tuto-liste">
        <li>Lis la <strong>Gazette</strong> (touche pour avancer) et ton <strong>rapport</strong>.</li>
        <li>Règle et <strong>valide tes ordres</strong> ; les 3 premiers jours, choisis ta <strong>doctrine</strong>.</li>
        <li>Onglet <strong>Chef</strong> : sa journée, et les lettres du <strong>parapheur</strong>.</li>
        <li>Avance l’<strong>enquête</strong> : ouvre tes enveloppes, lance tes démarches.</li>
        <li>Fais tes <strong>énigmes</strong>, ou le quiz express.</li>
        <li>Quand un <strong>incident</strong> tombe (entre 7 h et 19 h), tu as 12 heures pour le jouer.</li>
        <li>Coup d’œil à la <strong>Carte</strong> (non-droit) et à la <strong>Radio</strong> : on avance mieux à plusieurs.</li>
      </ol>
      <p class="tuto-note">Le détail est dans le <strong>Guide du joueur</strong> (roue dentée en haut de l’HP), d’où tu peux aussi relancer cette visite. Bon service !</p>`,
  },
  // ───── Mini-visite « ce qui change en saison 2 », pour les anciens joueurs (étapes mini: true) ─────
  {
    id: 'm-bienvenue', route: 'hp', v2: true, mini: true,
    titre: 'Saison 2 : ce qui a changé',
    texte: `<p>Une minute, écran par écran, seulement les nouveautés. Les <strong>sept onglets</strong> sont maintenant : HP · Ordres · <strong>Chef</strong> · Enquête · Énigmes · Carte · Radio.</p>
      <p>Le <strong>Terrain</strong> a disparu : il est rangé dans la <strong>Carte</strong>.</p>`,
  },
  {
    id: 'm-hp', route: 'hp', v2: true, mini: true, cible: 'section[aria-label="Prochain tour"]',
    titre: 'L’HP allégé',
    texte: `<p>Le <strong>gros bouton</strong> t’emmène à la prochaine chose à faire ; les petites icônes au-dessus se cochent au fil de la journée.</p>
      <p>Plus bas, « <strong>Aujourd’hui</strong> » regroupe incidents, dilemmes et alertes, une ligne chacun.</p>`,
  },
  {
    id: 'm-classement', route: 'hp', v2: true, mini: true, cible: '.hp-classement',
    titre: 'Classements et raccourcis',
    texte: `<p>Le bouton <strong>Classements</strong> affiche ton rang (on est classé après 5 soirs de la saison).</p>
      <p>Tes <strong>raccourcis</strong> se choisissent avec « Modifier » : enchères des saisies, équipe, rapport, Gazette, trophées, Challenge.</p>`,
  },
  {
    id: 'm-ordres', route: 'ordres', v2: true, mini: true, onglet: 'Tes ordres ont changé de tête.', cible: ['section[aria-label="Doctrine de la saison"]', 'section[aria-label="Affectation des agents"]'],
    titre: 'Ordres : doctrine et cases',
    texte: `<p>Les <strong>3 premiers jours</strong>, choisis la <strong>doctrine</strong> de ta zone pour toute la saison : une vraie force, un vrai prix.</p>
      <p>Chaque service a maintenant <strong>une case par agent</strong> dont il a besoin : une case vide en pointillé, c’est un manque. En bas, « Ce soir aussi » regroupe chef, grande décision, pistes et réserve.</p>`,
  },
  {
    id: 'm-chef', route: 'chef', v2: true, mini: true, onglet: 'Nouvel onglet : ton chef de corps, c’est toi.', cible: ['section[aria-label="Ton chef aujourd’hui"]', '.chef-creation'],
    titre: 'Ton chef de corps',
    texte: `<p>Crée-le une fois (portrait et parcours). Chaque jour, choisis <strong>où il passe sa journée</strong> et réponds aux lettres du <strong>parapheur</strong> ; de nouvelles prérogatives se débloquent jour après jour.</p>
      <p>Ses compétences montent avec ta gestion, tes énigmes et tes mini-jeux, et <strong>restent d’une saison à l’autre</strong>.</p>`,
  },
  {
    id: 'm-enquete', route: 'enquete', v2: true, mini: true, onglet: 'L’enquête n’est plus un grand liège.', cible: ['.e2-hero', '.e2-cta'], union: true,
    avant: () => { S.tabTuto = null; marquerTutoVu(); },
    titre: 'L’enquête en dossier',
    texte: `<p>Un <strong>gros bouton</strong> dit quoi faire ensuite. Les nouvelles pièces arrivent <strong>sous enveloppe</strong> : ouvre-les une à une. Les suspects sont sur un <strong>mur de polaroïds</strong> ; tes démarches du soir sont dans « <strong>Ce soir</strong> ».</p>
      <p>Le grand liège existe toujours : menu <strong>⋯</strong>.</p>`,
  },
  {
    id: 'm-carte', route: 'carte', v2: true, mini: true, onglet: 'La carte remplace aussi l’ancien Terrain.', cible: '#mes-quartiers', avant: () => { S.carteCalque = 'mazone'; },
    titre: 'Carte : non-droit et ma zone',
    texte: `<p><strong>Non-droit</strong> : place tes agents dans un <strong>rôle</strong>, repérage (révèle la faille), descente (fait tomber l’emprise) ou bouclage (plus de saisies). À plusieurs, c’est bien plus fort.</p>
      <p><strong>Ma zone</strong> : tes quartiers et tes patrouilles, l’ancien Terrain. Renforts, pactes et Conseil sont en bas de la carte.</p>`,
  },
  {
    id: 'm-radio', route: 'radio', v2: true, mini: true, onglet: 'La radio a deux fréquences.', cible: '[aria-label="Fréquences"]',
    titre: 'Radio : F1 et F2',
    texte: `<p><strong>F1 · Discussion</strong> : le canal commun. <strong>F2 · Renforts &amp; ops</strong> : le tableau des appels de ce soir, avec un bouton pour répondre présent. <strong>Privé</strong> pour les tête-à-tête.</p>`,
  },
  {
    id: 'm-fin', route: 'hp', v2: true, mini: true,
    titre: 'Et aussi…',
    texte: `<ul class="tuto-liste">
        <li>La <strong>Gazette</strong> se lit en cartes : touche à droite pour avancer.</li>
        <li><strong>Enchères des saisies</strong> : 3 lots tous les 2 jours, relances visibles puis une offre finale secrète.</li>
        <li><strong>Bilan de saison</strong> sur l’HP : quelques imprévus à remettre en état les 3 premiers jours.</li>
      </ul>
      <p class="tuto-note">La visite complète et le Guide du joueur sont dans la roue dentée en haut de l’HP. Bon service !</p>`,
  },
];

// ───────────────────────── État et cycle de vie ─────────────────────────

let layer = null, raf = 0, derniereCible = null, dernierIndex = -1;

export const tutoActif = () => S.tuto != null;
// Saison 2 : la visite est refaite pour les nouveaux écrans ; elle est reproposée une fois à tout le monde.
const CLE2 = 'mazp-tuto-s2';
export const tutoFait = () => (reglesV2(S.state)
  ? ['fait', 'zappe'].includes(lire(CLE2)) || !!(S.player && S.player.tuto2)
  : ['fait', 'zappe'].includes(lire(CLE)) || !!(S.player && S.player.tuto));

/** Marque la visite comme terminée ou refusée, sur l'appareil et dans le profil du joueur. */
function marquer(v) {
  const v2 = reglesV2(S.state);
  ecrire(CLE, v); if (v2) ecrire(CLE2, v); ecrire(CLE_ETAPE, null);
  if (S.player && (!S.player.tuto || (v2 && !S.player.tuto2)) && S.backend && S.backend.savePlayer && S.user) {
    const p = { ...S.player, tuto: S.player.tuto || v, ...(v2 ? { tuto2: v } : {}) };
    S.player = p;
    Promise.resolve(S.backend.savePlayer(S.user.uid, p)).catch((e) => console.warn('tuto', e));
  }
}

export function lancerTuto(i = 0, mini = false) {
  S.tutoMini = !!mini;
  ecrire('mazp-tuto-mini', mini ? '1' : null);
  document.querySelector('.aide-wrap')?.remove();
  S.tuto = Math.max(0, Math.min(ETAPES.length - 1, sauterAbsentes(i, 1)));
  ecrire(CLE_ETAPE, String(S.tuto));
  dernierIndex = -1;
  monter();
}

function quitter(v = 'fait') {
  S.tuto = null; marquer(v);
  cancelAnimationFrame(raf); raf = 0;
  layer?.remove(); layer = null;
  document.removeEventListener('keydown', clavier);
}

/** Étape suivante (ou précédente) qui existe dans cette partie : le chef de corps n'est pas montré en règles v1. */
function sauterAbsentes(i, sens) {
  while (i >= 0 && i < ETAPES.length && !presente(ETAPES[i])) i += sens;
  return i;
}

function aller(i) {
  i = sauterAbsentes(i, i >= (S.tuto ?? 0) ? 1 : -1);
  if (i >= ETAPES.length) { quitter('fait'); if (S.route !== 'hp') location.hash = '#hp'; return; }
  S.tuto = Math.max(0, i);
  ecrire(CLE_ETAPE, String(S.tuto));
}

const clavier = (e) => {
  if (!tutoActif()) return;
  if (e.key === 'Escape') quitter('fait');
};

// ───────────────────────── Affichage ─────────────────────────

function monter() {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'tuto';
    layer.innerHTML = '<div class="tuto-bloc"></div><div class="tuto-spot" aria-hidden="true"></div><div class="tuto-bulle card" role="dialog" aria-modal="false" aria-live="polite"></div>';
    layer.addEventListener('click', onClic);
    document.body.appendChild(layer);
    document.addEventListener('keydown', clavier);
  }
  if (!raf) boucle();
}

const valeur = (v) => (typeof v === 'function' ? v() : v);

/** Étapes présentes dans cette partie (règles v1 ou v2) : rang affiché et total. */
const presente = (x) => !((x.v2 && !reglesV2(S.state)) || (x.v1 && reglesV2(S.state)) || (!!x.mini !== !!S.tutoMini));
function etapeHtml(e) {
  const vis = ETAPES.filter(presente), n = vis.length;
  const i = Math.max(0, vis.indexOf(e));
  if (attendOnglet(e)) {
    const nom = ONGLETS[e.route] || e.route;
    return `<div class="between" style="gap:8px"><span class="kicker">Visite guidée · ${i + 1} / ${n}</span>
      <button type="button" class="tuto-x" data-tuto="quitter" aria-label="Quitter la visite guidée">Quitter</button></div>
    <div class="tuto-prog" aria-hidden="true"><span style="width:${Math.round((i + 1) / n * 100)}%"></span></div>
    <h2 class="tuto-titre">À toi : ouvre l’onglet ${nom}</h2>
    <div class="tuto-texte"><p>${e.onglet}</p></div>
    <div class="tuto-geste"><span class="tuto-coche" aria-hidden="true">→</span><span>Touche l’onglet <strong>${nom}</strong>, éclairé en bas de l’écran.</span></div>
    <div class="tuto-nav">
      ${i > 0 ? '<button type="button" class="btn ghost small" data-tuto="prec">Précédent</button>' : '<span></span>'}
      <button type="button" class="btn ghost small" data-tuto="retour">Passer</button>
    </div>`;
  }
  const g = e.geste, ok = g ? g.fait() : true;
  const surPlace = !e.route || S.route === e.route;
  return `<div class="between" style="gap:8px"><span class="kicker">Visite guidée · ${i + 1} / ${n}</span>
      <button type="button" class="tuto-x" data-tuto="quitter" aria-label="Quitter la visite guidée">Quitter</button></div>
    <div class="tuto-prog" aria-hidden="true"><span style="width:${Math.round((i + 1) / n * 100)}%"></span></div>
    <h2 class="tuto-titre">${valeur(e.titre)}</h2>
    <div class="tuto-texte">${valeur(e.texte)}</div>
    ${g ? `<div class="tuto-geste ${ok ? 'ok' : ''}"><span class="tuto-coche" aria-hidden="true">${ok ? '✓' : '→'}</span><span>${ok ? 'Bien joué !' : g.consigne}</span></div>` : ''}
    ${!surPlace ? `<button type="button" class="btn small block" data-tuto="retour">Revenir à l’écran de cette étape</button>` : ''}
    <div class="tuto-nav">
      ${i > 0 ? '<button type="button" class="btn ghost small" data-tuto="prec">Précédent</button>' : '<span></span>'}
      ${g && !ok ? '<button type="button" class="btn ghost small" data-tuto="suiv">Passer</button>'
        : `<button type="button" class="btn primary small" data-tuto="suiv">${i === 0 ? 'C’est parti' : i === n - 1 ? 'Terminer' : 'Suivant'}</button>`}
    </div>`;
}

function onClic(ev) {
  const b = ev.target.closest('[data-tuto]');
  if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const i = S.tuto;
  switch (b.dataset.tuto) {
    case 'quitter': quitter('fait'); break;
    case 'prec': aller(i - 1); break;
    case 'suiv': aller(i + 1); break;
    case 'retour': { const r = ETAPES[i].route; if (r) location.hash = `#${r}`; break; }
    default: break;
  }
}

/** Rectangle à éclairer : un élément, ou l'union de plusieurs (étapes `union`). */
function rectCible(e, el) {
  if (!e.union) return el.getBoundingClientRect();
  let r = null;
  for (const sel of [].concat(e.cible)) {
    const x = document.querySelector(sel);
    if (!x) continue;
    const b = x.getBoundingClientRect();
    r = r ? { top: Math.min(r.top, b.top), left: Math.min(r.left, b.left), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { top: b.top, left: b.left, right: b.right, bottom: b.bottom };
  }
  return { ...r, width: r.right - r.left, height: r.bottom - r.top };
}

function trouverCible(e) {
  if (!e.cible) return null;
  for (const sel of [].concat(e.cible)) {
    let el = null;
    try { el = document.querySelector(sel); } catch (err) { continue; }
    if (el) return e.parent ? (el.closest(e.parent) || el) : el;
  }
  return null;
}

let signature = '';
function boucle() {
  raf = requestAnimationFrame(boucle);
  if (!tutoActif() || !layer) return;
  const i = S.tuto, e = ETAPES[i];
  // Changement d'étape : on va sur le bon écran et on prépare le geste.
  if (i !== dernierIndex) {
    dernierIndex = i; derniereCible = null;
    if (e.route && S.route !== e.route && !e.onglet) location.hash = `#${e.route}`;
    if (e.avant) e.avant();
    if (e.geste && e.geste.avant) e.geste.avant();
  }
  const attente = attendOnglet(e);
  const surPlace = !e.route || S.route === e.route;
  const cible = attente ? document.querySelector(`nav.tabs a[href="#${e.route}"]`) : surPlace ? trouverCible(e) : null;
  if (cible && cible !== derniereCible) {
    derniereCible = cible;
    const r = attente ? cible.getBoundingClientRect() : rectCible(e, cible);
    const fixe = getComputedStyle(cible).position === 'fixed' || cible.closest('nav.tabs, .savebar');
    if (!fixe && (r.top < 70 || r.bottom > innerHeight * 0.55)) window.scrollTo({ top: Math.max(0, scrollY + r.top - 70), behavior: 'smooth' });
  }
  // Contenu de la bulle : redessiné seulement s'il change (geste réussi, écran quitté…).
  const g = e.geste;
  const sig = `${i}|${g ? g.fait() : ''}|${surPlace}|${attente}`;
  const bulle = layer.querySelector('.tuto-bulle');
  if (sig !== signature) { signature = sig; bulle.innerHTML = etapeHtml(e, i); }
  // Projecteur et position de la bulle.
  const spot = layer.querySelector('.tuto-spot'), bloc = layer.querySelector('.tuto-bloc');
  // Pendant un geste, l'écran reste utilisable ; sinon on bloque les clics hors de la bulle.
  bloc.style.pointerEvents = attente || (g && !g.fait()) ? 'none' : 'auto';
  if (cible) {
    const r = attente ? cible.getBoundingClientRect() : rectCible(e, cible), m = 6;
    const top = Math.max(4, r.top - m), bottom = Math.min(innerHeight - 4, r.bottom + m);
    Object.assign(spot.style, { display: 'block', top: `${top}px`, left: `${Math.max(4, r.left - m)}px`, width: `${Math.min(innerWidth - 8, r.width + 2 * m)}px`, height: `${Math.max(0, bottom - top)}px` });
    layer.classList.remove('centre');
    const centre = (top + bottom) / 2;
    const enBas = centre < innerHeight * 0.5;
    bulle.classList.toggle('bas', enBas); bulle.classList.toggle('haut', !enBas);
  } else {
    spot.style.display = 'none';
    layer.classList.add('centre');
    bulle.classList.remove('bas', 'haut');
  }
}

// ───────────────────────── Déclenchement ─────────────────────────

/** Fenêtre d'invitation (première connexion, ou joueur déjà en place qui ne l'a jamais vue). */
function inviter() {
  const z = myZone();
  const ancien = z && z.toursJoues > 0;
  // Ancien joueur qui découvre la saison 2 : on lui présente la nouvelle visite.
  const s2 = reglesV2(S.state) && (ancien || (S.player && S.player.tuto) || ['fait', 'zappe'].includes(lire(CLE)));
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card tuto-invite" role="dialog" aria-modal="true" aria-labelledby="tuto-inv-titre">
    <span class="kicker">${s2 ? 'Saison 2' : ancien ? 'Nouveau' : 'Prise de fonction'}</span>
    <h2 id="tuto-inv-titre" class="aide-titre">${s2 ? 'La visite guidée de la saison 2' : ancien ? 'Une visite guidée du jeu' : `Bienvenue à la ${zoneNom()} !`}</h2>
    <p class="aide-intro">${s2 ? 'Doctrine, chef de corps, nouvelle carte, enquête sous enveloppe, radio à deux fréquences : beaucoup de choses ont changé. La mini-visite ne montre que les nouveautés, en une minute.' : ancien ? 'Les sept onglets et ce qu’il y a à faire chaque jour, en trois minutes. Utile pour revoir les bases… ou pour la montrer à un collègue.' : 'Avant de prendre ton service : une visite guidée de trois minutes pour découvrir les onglets et ce qu’il faut faire chaque jour.'}</p>
    <div class="col" style="gap:8px">
      ${s2 ? '<button type="button" class="btn primary block" data-inv="mini">Ce qui a changé (1 minute)</button><button type="button" class="btn ghost block" data-inv="go">La visite complète (3 minutes)</button>'
        : `<button type="button" class="btn primary block" data-inv="go">${ancien ? 'Faire la visite' : 'Commencer la visite'}</button>`}
      ${ancien || s2 ? '' : '<button type="button" class="btn ghost block" data-inv="plus-tard">Plus tard</button>'}
      <button type="button" class="btn ghost block" data-inv="non">${s2 ? 'Non merci' : ancien ? 'Non merci, je connais le jeu' : 'Je connais déjà le jeu'}</button>
    </div>
    <p class="tiny muted" style="margin:0">Tu pourras toujours la lancer depuis le Guide du joueur.</p>
  </div>`;
  wrap.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-inv]');
    if (!b) return;
    ev.stopPropagation();
    wrap.remove();
    if (b.dataset.inv === 'go') lancerTuto(0);
    else if (b.dataset.inv === 'mini') lancerTuto(0, true);
    else if (b.dataset.inv === 'non') marquer('zappe');
    else { try { sessionStorage.setItem('mazp-tuto-plus-tard', '1'); } catch (e) { /* pas de stockage */ } }
  });
  document.body.appendChild(wrap);
  (wrap.querySelector('[data-inv="mini"]') || wrap.querySelector('[data-inv="go"]')).focus();
}

/**
 * À appeler après chaque affichage de l'HP. Reprend une visite interrompue, sinon propose la visite
 * une fois (nouveau joueur, ou ancien joueur qui ne l'a jamais vue). Renvoie true si quelque chose s'affiche.
 */
export function tutoAuBesoin() {
  if (tutoActif()) return true;
  if (S.tutoPropose || tutoFait()) return false;
  const reprise = lire(CLE_ETAPE);
  S.tutoPropose = true;
  if (reprise != null) { lancerTuto(Number(reprise) || 0, lire('mazp-tuto-mini') === '1'); return true; }
  try { if (sessionStorage.getItem('mazp-tuto-plus-tard')) return false; } catch (e) { /* pas de stockage */ }
  if (document.querySelector('.aide-wrap')) return false;
  setTimeout(inviter, 400);
  return true;
}
