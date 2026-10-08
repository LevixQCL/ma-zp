// Récit de l'affaire : la une de la Gazette, le dépôt de plainte et la scène photographiée.
// Du pur décor narratif : tiré d'une graine à part, il ne change rien à l'affaire et ne donne
// aucun indice (ni la façon d'entrer, ni le mobile, ni l'heure exacte).
import { makeRng } from './rng.js';

const DECOR = {
  tanneurs: { scene: 'entrepot', valeur: '180 000 €', objets: 'une centaine d’ordinateurs portables encore dans leurs cartons', vide: 'les rayonnages du fond sont vides', metier: 'gérant du dépôt', lieuCourt: 'le dépôt' },
  bijouterie: { scene: 'vitrine', valeur: '95 000 €', objets: 'des montres de luxe et une collection de bagues', vide: 'les présentoirs sont vides', metier: 'bijoutière', lieuCourt: 'la boutique' },
  portesud: { scene: 'entrepot', valeur: '120 000 €', objets: 'des dizaines de cartons de parfums de grandes marques', vide: 'une travée entière a disparu', metier: 'grossiste', lieuCourt: 'l’entrepôt' },
  beguinage: { scene: 'cave', valeur: '60 000 €', objets: 'des caisses de grands crus, certaines millésimées', vide: 'les casiers les plus précieux sont vides', metier: 'restaurateur', lieuCourt: 'la cave' },
  filatures: { scene: 'entrepot', valeur: '75 000 €', objets: 'une vingtaine de vélos électriques neufs', vide: 'les supports de l’atelier sont vides', metier: 'gérante de l’atelier', lieuCourt: 'l’atelier' },
  moulins: { scene: 'musee', valeur: '250 000 €', objets: 'des objets de l’exposition temporaire, prêtés par des collectionneurs', vide: 'trois socles sont vides', metier: 'conservatrice', lieuCourt: 'la salle d’exposition' },
  petitpont: { scene: 'vitrine', valeur: '40 000 €', objets: 'du matériel médical et des appareils de mesure', vide: 'la réserve a été vidée', metier: 'pharmacien', lieuCourt: 'la réserve' },
  hautspres: { scene: 'conteneur', valeur: '35 000 €', objets: 'tout l’outillage du chantier : perforateurs, scies, groupe électrogène', vide: 'le conteneur est vide', metier: 'chef de chantier', lieuCourt: 'le conteneur' },
  ventes: { scene: 'musee', valeur: '140 000 €', objets: 'des tableaux et des bibelots de la vente du lendemain', vide: 'des lots manquent sur les cimaises', metier: 'commissaire-priseuse', lieuCourt: 'la salle' },
  gare: { scene: 'vitrine', valeur: '65 000 €', objets: 'des smartphones neufs, encore emballés', vide: 'les étagères de la réserve sont vides', metier: 'patron de la boutique', lieuCourt: 'la boutique' },
};
const PRENOMS_V = { f: ['Martine', 'Christine', 'Isabelle', 'Véronique', 'Nathalie', 'Brigitte'], m: ['Jean-Marc', 'Philippe', 'Didier', 'Patrick', 'Alain', 'Bernard'] };
const NOMS_V = ['Lefèvre', 'Vandenberghe', 'Duchêne', 'Marchal', 'Lambotte', 'Roland', 'Gérard', 'Pirson'];

export function recitAffaire(seed, aff) {
  const d = DECOR[aff.pos] || DECOR.tanneurs;
  const rng = makeRng(`${seed}:recit:${aff.n}`);
  const f = /^la /.test(aff.vic);
  const tire = `${rng.pick(PRENOMS_V[f ? 'f' : 'm'])} ${rng.pick(NOMS_V)}`;
  const victime = aff.victimeNom || tire; // fraude : la victime est l'un des suspects (tirage gardé pour ne rien décaler)
  const e = f ? 'e' : '';
  const lieuMaj = aff.lieu.charAt(0).toUpperCase() + aff.lieu.slice(1);
  const titreUne = rng.pick([
    `Nuit noire ${aff.pres} : ${d.valeur} envolés`,
    `${lieuMaj} dévalisé${/^la /.test(aff.lieu) ? 'e' : ''} en pleine nuit`,
    `Cambriolage ${aff.pres} : l’enquête est ouverte`,
  ]);
  const une = {
    surtitre: 'Faits divers · District Delta',
    titre: titreUne,
    chapo: `${d.objets.charAt(0).toUpperCase() + d.objets.slice(1)} : le préjudice est estimé à ${d.valeur}. Les enquêteurs ont bouclé le quartier dès l’alerte.`,
    corps: [
      `Au petit matin, ${victime}, ${d.metier}, n’en revenait toujours pas. « ${rng.pick(['Je suis arrivé' + e + ' et j’ai compris tout de suite', 'Quand on m’a appelé' + e + ', j’ai cru à une erreur', 'Vingt ans de métier, et jamais ça'])}. ${d.vide.charAt(0).toUpperCase() + d.vide.slice(1)}. »`,
      rng.pick([
        'Dans le quartier, on s’interroge. « On se connaît tous ici, ça fait froid dans le dos », glisse un commerçant voisin.',
        'Les riverains ont vu les gyrophares toute la nuit. « Un endroit si tranquille… », soupire une habitante.',
        'Un habitué des lieux se dit « choqué » et espère « qu’on retrouvera vite les coupables ».',
      ]),
      'La police du district a ouvert une enquête. Plusieurs personnes de l’entourage seront entendues dans les prochains jours.',
    ],
    legende: `${d.lieuCourt.charAt(0).toUpperCase() + d.lieuCourt.slice(1)}, au lendemain des faits.`,
  };
  const plainte = {
    titre: 'Dépôt de plainte',
    qui: `${victime}, ${d.metier}`,
    lignes: [
      `Je me présente pour déposer plainte pour vol ${aff.pres}.`,
      `En arrivant, j’ai constaté que ${d.vide}. Il manque ${d.objets}.`,
      `Je n’ai rien touché et j’ai prévenu la police immédiatement.`,
      `J’estime le préjudice à ${d.valeur}. ${rng.pick(['Je suis assuré' + e + ', mais certaines pièces sont irremplaçables.', 'Mon assurance ne couvrira pas tout.', 'C’est une partie de ma vie qu’on m’a volée.'])}`,
      `Je ne sais pas qui a pu faire ça. Je me tiens à la disposition des enquêteurs.`,
    ],
  };
  return { victime, scene: d.scene, une, plainte, valeur: d.valeur };
}
