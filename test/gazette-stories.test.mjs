// Gazette saison 2 (« stories ») : règles de rédaction appliquées à l'affichage.
import assert from 'node:assert/strict';
import { sansRegles, regrouper, choisirUne } from '../js/ui/gazette-stories.js';

// Les chiffres de règles restent dans le rapport : on retire la phrase qui les porte, pas le reste.
assert.equal(sansRegles('Tous les services ont tenu. +7 points.'), 'Tous les services ont tenu.');
assert.equal(sansRegles('1 agent blessé, absent 4 tours. −4 de moral.'), '1 agent blessé, absent 4 tours.');
assert.equal(sansRegles('Un soir fermé, la descente ne trouve personne (×0,3). Rien à signaler.'), 'Rien à signaler.');
assert.equal(sansRegles('Amende de 5 k€.'), 'Amende de 5 k€.'); // une amende, c'est une nouvelle
assert.equal(sansRegles(''), '');

// Regroupement par rubrique, avec un titre au pluriel quand il existe.
const news = [
  { prio: 6, kicker: 'Coup dur', titre: 'Rébellion à ZP 5412 Vallée', texte: '', uid: 'a' },
  { prio: 6, kicker: 'Coup dur', titre: 'Grippe à ZP 5350 Port', texte: '', uid: 'b' },
  { prio: 9, kicker: 'Coopération', titre: 'Le fugitif s’évapore', texte: '' },
  { prio: 10, kicker: 'FIPA', titre: 'Course cycliste', texte: '' },
  { prio: 3, kicker: 'Chantier', titre: 'ZP 5324 Horizon agrandit ses bureaux', texte: '', uid: 'moi' },
];
const arts = regrouper(news);
assert.equal(arts.length, 4);
const cd = arts.find((a) => a.kicker === 'Coup dur');
assert.equal(cd.faits.length, 2);
assert.match(cd.titre, /2 coups durs/);

// La une : jamais une annonce (FIPA prio 10), la priorité ensuite.
const me = { uid: 'moi', code: '5324', nom: 'Horizon' };
assert.equal(choisirUne(arts, me).kicker, 'Coopération');
// Un fait qui touche ta zone passe devant à priorité proche.
const arts2 = regrouper([{ prio: 7, kicker: 'Opération réussie', titre: 'ZP 5324 Horizon : évacuation exemplaire', uid: 'moi' }, { prio: 9, kicker: 'Coopération', titre: 'Le fugitif s’évapore' }]);
assert.equal(choisirUne(arts2, me).kicker, 'Opération réussie');
console.log('gazette-stories : OK');
