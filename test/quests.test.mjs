// Vérifie que chaque quête générée est valide et n'a qu'une seule bonne réponse.
import assert from 'node:assert/strict';
import { generateQuest, QUEST_TYPES, checkAnswer, questsFor, normalize } from '../js/quests/quests.js';

let n = 0;
for (const type of QUEST_TYPES) {
  for (let diff = 1; diff <= 5; diff++) {
    for (let i = 0; i < 200; i++) {
      const q = generateQuest(type, `t-${type}-${diff}-${i}`, diff);
      n++;
      assert.ok(q.question && q.contexte, `${type} sans texte`);
      if (q.mode === 'choix') {
        const ids = q.choix.map((c) => c.id);
        assert.equal(new Set(ids).size, ids.length, `${type} : choix en double`);
        assert.ok(ids.includes(q.answer), `${type} : la réponse n'est pas parmi les choix`);
        assert.ok(ids.length >= 3, `${type} : trop peu de choix (${ids.length})`);
        assert.equal(ids.filter((id) => checkAnswer(q, id)).length, 1, `${type} : plusieurs bonnes réponses`);
      }
      if (q.mode === 'exact') {
        assert.ok(checkAnswer(q, q.answer), 'exact : réponse refusée');
        assert.ok(!checkAnswer(q, q.answer + '1'), 'exact : réponse fausse acceptée');
      }
      if (q.mode === 'texte') {
        assert.ok(checkAnswer(q, q.answer.toLowerCase()), 'texte : réponse refusée');
        assert.ok(!checkAnswer(q, 'xyz'), 'texte : réponse absurde acceptée');
        assert.notEqual(normalize(q.code), normalize(q.explication), 'code non chiffré');
      }
      if (type === 'chronologie') {
        assert.equal([...q.answer].sort().join(''), q.lettres, 'chronologie : la réponse doit utiliser chaque lettre une fois');
      }
      if (type === 'grille') assert.ok(q.grille && q.grille.gens.length === q.grille.veh.length, 'grille : tableau à cocher manquant');
      if (['quiment', 'grille', 'chronologie'].includes(type)) assert.ok(q._pas >= (diff <= 1 ? 1 : 2), `${type} : trop facile (${q._pas})`);
    }
  }
}
// Rotation : 3 types différents chaque jour, et tous les types reviennent régulièrement.
for (const uid of ['a', 'b', 'c']) {
  const vus = new Set();
  for (let t = 1; t <= 14; t++) {
    const qs = questsFor({ seed: 's', uid, season: 1, turn: t, weekday: t % 7 });
    assert.equal(qs.length, 3);
    assert.equal(new Set(qs.map((q) => q.type)).size, 3, 'types en double le même jour');
    qs.forEach((q) => vus.add(q.type));
  }
  assert.equal(vus.size, QUEST_TYPES.length, 'tous les types doivent apparaître');
}
console.log(`OK : ${n} quêtes générées et vérifiées.`);
for (const t of QUEST_TYPES) console.log(JSON.stringify(generateQuest(t, 'demo', 3), null, 1).slice(0, 900));
// Dossier noir : jamais le même type qu'une des énigmes du jour (sauf s'il a déjà été tenté).
{
  const { dossierNoir } = await import('../js/quests/quests.js');
  for (const uid of ['a', 'b', 'c', 'd']) for (let t = 1; t <= 40; t++) {
    const types = questsFor({ seed: 's', uid, season: 1, turn: t, weekday: t % 7 }).map((q) => q.type);
    const noir = dossierNoir({ seed: 's', uid, season: 1, turn: t, exclure: types });
    assert.ok(!types.includes(noir.type), `dossier noir en double (${noir.type})`);
    assert.equal(dossierNoir({ seed: 's', uid, season: 1, turn: t, exclure: types, garder: 'butin' }).type, 'butin');
  }
  console.log('OK : dossier noir jamais en double avec les énigmes du jour.');
}
// Formes d'énigmes : chaque forme, chaque niveau (hardcore compris), une seule bonne réponse.
{
  const { FORMES } = await import('../js/quests/quests.js');
  let nf = 0;
  for (const [type, fs] of Object.entries(FORMES)) for (const f of fs.filter((x) => x.gen)) for (let diff = 1; diff <= 6; diff++) for (let i = 0; i < 40; i++) {
    const q = generateQuest(type, `f-${f.id}-${diff}-${i}`, diff, f.id);
    nf++;
    assert.equal(q.forme, f.id); assert.equal(q.type, type);
    assert.ok(q.question && q.contexte, `${f.id} sans texte`);
    if (q.mode === 'choix') {
      const ids = q.choix.map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length, `${f.id} : choix en double`);
      assert.ok(ids.length >= 3, `${f.id} : trop peu de choix`);
      assert.equal(ids.filter((id) => checkAnswer(q, id)).length, 1, `${f.id} : plusieurs bonnes réponses`);
    } else {
      assert.ok(checkAnswer(q, q.answer), `${f.id} : réponse refusée`);
      assert.ok(!checkAnswer(q, q.answer + '1'), `${f.id} : réponse fausse acceptée`);
    }
    if (f.id === 'sansmontre') assert.equal([...q.answer].sort().join(''), q.lettres);
    if (f.id === 'arrivees') assert.equal(q.grille.gens.length, q.grille.veh.length);
    if (['alibis', 'demi', 'arrivees', 'sansmontre', 'digicode'].includes(f.id)) assert.ok(q._pas >= 2, `${f.id} niv. ${diff} : trop facile (${q._pas})`);
  }
  console.log(`OK : ${nf} énigmes en formes nouvelles vérifiées.`);
}
