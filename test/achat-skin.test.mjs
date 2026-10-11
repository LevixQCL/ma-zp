// Boutique de skins : payés en PS (le grade ne bouge pas), équipés, manoir à −50 % pour Halloween.
import assert from 'node:assert/strict';
import { acheterSkin, psDispo, skinsEnVente, TOUS_SKINS } from '../js/engine/decor.js';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';

const avant = Date.parse('2026-10-11T18:00:00Z'), oct = Date.parse('2026-10-15T18:00:00Z'), nov = Date.parse('2026-11-10T18:00:00Z');
assert.equal(skinsEnVente(avant).length, 0, 'boutique fermée avant le 11 octobre 20:00');
const m = (q) => skinsEnVente(q).find((v) => v.cle === 'batiment:manoir');
assert.equal(m(oct).prix, 300); assert.equal(m(oct).prixBase, 600);
assert.equal(m(nov).prix, 600, 'plein tarif après Halloween');
assert.ok(!skinsEnVente(oct).some((v) => v.cat === 'fete' || v.id === 'remise'), 'ni décors d’événement ni remise vendus seuls');
assert.ok(skinsEnVente(oct).some((v) => v.cle === 'batiment:chateau' && v.prix === 250));
assert.ok(!TOUS_SKINS.some((s) => s.id === 'manoir' || s.id === 'remise'), 'jamais tirés par la jauge');

const z = { ps: 578, skins: [], skinsChoix: { aile: 'serre' } };
assert.match(acheterSkin(z, 'batiment:manoir', oct), /achetés et équipés/);
assert.equal(z.ps, 578, 'PS gagnés (grade) intacts');
assert.equal(psDispo(z), 278);
assert.ok(z.skins.includes('batiment:manoir') && z.skins.includes('garage:remise'), 'remise offerte');
assert.deepEqual(z.skinsChoix, { aile: 'serre', batiment: 'manoir', garage: 'remise' }, 'équipés');
assert.equal(acheterSkin(z, 'batiment:manoir', oct), null, 'pas deux fois');
assert.match(acheterSkin(z, 'batiment:chateau', oct), /achetés et équipés/); assert.equal(psDispo(z), 28);
assert.match(acheterSkin(z, 'garage:hangar', oct), /impossible/); assert.equal(psDispo(z), 28);

// Dans un vrai tour : l'ordre « achat » est appliqué à 20:00 et le skin équipé.
const st = createGame({ seed: 'achat' });
st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1); st.zones.moi.ps = 400; st.nextDeadline = oct;
const r = resolveTurn(st, { orders: { moi: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal', achat: 'batiment:manoir' } }, quests: {}, nextWeekday: 3 });
const zz = r.state.zones.moi;
assert.ok(zz.skins.includes('batiment:manoir')); assert.equal(zz.psDepense, 300); assert.ok(zz.ps >= 400);
assert.equal(zz.skinsChoix.batiment, 'manoir');
console.log('OK : boutique de skins (PS).');
