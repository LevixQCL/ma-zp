// Échec de confrontation du bon suspect (27 oct. 2026) : le conseil doit coller à l'affaire.
// Rue de la Clef : aucun recoupement n'existe ; l'ancien texte disait « croiser deux pièces », ce qui égarait les joueurs.
import assert from 'node:assert/strict';
import { bilanConfrontation } from '../js/engine/enquete.js';
import { affaireMeurtre } from '../js/engine/meurtre-mons.js';
import { affaireCorbeau } from '../js/engine/corbeau-havre.js';

const clef = affaireMeurtre(1, 'a');
// Le cas de Laura : trois pièces qui accablent Julien Mertens, aucune décisive.
const t = bilanConfrontation(clef, clef.coupable, ['c:cam', 'r:temoin', 'mob:2']);
assert.ok(!/croiser|croisées/.test(t), t);
assert.match(t, /rien ne se croise/);
assert.match(t, /Tes 3 pièces le mettent bien en cause/);
// Une seule décisive : on garde le compte, toujours sans « croiser ».
const t1 = bilanConfrontation(clef, clef.coupable, ['c:cam', 'r:temoin', 'occ:2']);
assert.match(t1, /Une seule de tes pièces le mettait/);
assert.ok(!/croiser|croisées/.test(t1));
// Affaire avec recoupements décisifs : le croisement reste suggéré.
const corb = affaireCorbeau(1, 'a');
const t2 = bilanConfrontation(corb, corb.coupable, ['doc:journal']);
assert.match(t2, /croisées/);
console.log('confront-conseil : ok');
