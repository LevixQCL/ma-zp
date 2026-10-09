// Calibrage du parapheur : un chef qui répond toujours « au mieux » contre un chef qui ne répond jamais.
// Objectif : écart d'IPZ moyen sur la saison sous 0,5 point (le parapheur entraîne le chef, il ne décide pas du classement).
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { courriersDuJour, COURRIERS } from '../js/engine/parapheur.js';

const alloc = { intervention: 6, proximite: 4, recherche: 3, roulage: 2, admin: 3 };
const valeur = (fx) => (fx.sat || 0) * 1 + (fx.moral || 0) * 0.6 + (fx.rep || 0) * 1 + (fx.budget || 0) * 1.5 - (fx.demain || 0) * 1.2 - (fx.pap || 0) * 0.5;
function saison(seed, repond) {
  const players = { A: { code: '1', nom: 'A', chef: { parcours: 'intervention', portrait: 'p01' } }, B: { code: '2', nom: 'B', chef: { parcours: 'intervention', portrait: 'p02' } } };
  let st = createGame({ seed: `psim-${seed}` }); st.regles = 2;
  st.zones.A = newZone({ uid: 'A', code: '1', nom: 'A' }, 1); st.zones.B = newZone({ uid: 'B', code: '2', nom: 'B' }, 1);
  let somme = 0;
  for (let t = 0; t < 14; t++) {
    const zA = st.zones.A.chef ? st.zones.A : { ...st.zones.A, chef: { xp: {}, saison: {} } };
    const rep = repond ? Object.fromEntries(courriersDuJour(st, zA).map((id) => [id, valeur(COURRIERS[id].o[0].fx) >= valeur(COURRIERS[id].o[1].fx) ? 0 : 1])) : {};
    st = resolveTurn(st, { players, orders: { A: { alloc, rythme: 'normal', parapheur: rep }, B: { alloc, rythme: 'normal' } } }).state;
    somme += st.zones.A.ipz;
  }
  return somme / 14;
}
const ecarts = [];
for (let i = 0; i < 16; i++) ecarts.push(saison(`s${i}`, true) - saison(`s${i}`, false));
const moy = ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
console.log('Écart d’IPZ moyen sur la saison (répond au mieux − ne répond pas), même tirage :', ecarts.map((x) => x.toFixed(2)).join(' '));
console.log('→ moyenne', moy.toFixed(2), moy < 0.5 ? '(objectif tenu : < 0,5)' : '(TROP FORT)');
