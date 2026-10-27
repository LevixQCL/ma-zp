// Armurerie (saison 4) : achats permanents, un par soir, refus si déjà possédé ou trop cher,
// effets sur la capacité et le risque de blessure, migration de l'ancien magasin (z.materiel).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone, migrateZone, capacite, clone } from '../js/engine/zone.js';
import { ARMURERIE, possede, achatImpossible, multArmurerie, risqueArmurerie, migrerMateriel, materielDuTour } from '../js/engine/materiel.js';
import { risqueBlessure } from '../js/engine/constants.js';

const alloc = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
let st = createGame({ seed: 'armurerie' });
st.zones.a = newZone({ uid: 'a', code: '5301', nom: 'A' }, 1);
st.zones.b = newZone({ uid: 'b', code: '5302', nom: 'B' }, 1);
st.zones.a.budget = 40;

// Achat au tour de 20:00 : payé, livré, gardé pour de bon.
let r = resolveTurn(st, { orders: { a: { alloc, materiel: { acheter: 'gilets' } }, b: { alloc } } });
let za = r.state.zones.a;
assert.ok(possede(za, 'gilets'), 'gilets livrés le soir même');
assert.ok(za.rapport.some((l) => l.startsWith('Armurerie : gilets pare-balles neufs livrés')), 'ligne de rapport de l’achat');
st = r.state;

// Le lendemain, sans ordre d'achat : l'équipement reste.
r = resolveTurn(st, { orders: { a: { alloc }, b: { alloc } } });
assert.ok(possede(r.state.zones.a, 'gilets'), 'achat permanent');
st = r.state;

// Refus : déjà possédé, budget insuffisant, équipement inconnu (ou clé piège).
assert.equal(achatImpossible(st.zones.a, 'gilets'), 'déjà dans ton armurerie');
const pauvre = clone(st.zones.b); pauvre.budget = 2;
assert.equal(achatImpossible(pauvre, 'taser'), 'budget insuffisant');
assert.equal(achatImpossible(pauvre, 'constructor'), 'équipement inconnu');
assert.equal(achatImpossible(pauvre, 'lance-flammes'), 'équipement inconnu');
{
  const z = clone(st.zones.a); z.rapport = []; z._compta = [];
  const b0 = z.budget;
  const L = materielDuTour(st, z, { materiel: { acheter: 'gilets' } });
  assert.ok(L.some((l) => l.includes('achat refusé (déjà dans ton armurerie)')), 'refus si déjà possédé');
  assert.equal(z.budget, b0, 'rien n’est débité sur un refus');
  const p = clone(pauvre); p.rapport = []; p._compta = [];
  const L2 = materielDuTour(st, p, { materiel: { acheter: 'taser' } });
  assert.ok(L2.some((l) => l.includes('budget insuffisant')) && !possede(p, 'taser'), 'refus si trop pauvre');
  assert.equal(p.budget, 2);
}

// Un achat par soir : l'ordre ne porte qu'une clé.
{
  const z = newZone({ uid: 'c', code: '5303', nom: 'C' }, 1); z.budget = 50; z.rapport = []; z._compta = [];
  materielDuTour(st, z, { materiel: { acheter: 'taser', autre: 'radios' } });
  assert.deepEqual(Object.keys(z.armurerie), ['taser']);
  assert.ok(Math.abs(z.budget - (50 - ARMURERIE.taser.prix - ARMURERIE.taser.entretien)) < 1e-9, 'prix et entretien débités');
}

// Multiplicateur de capacité : tasers sur l'Intervention, radios sur l'Accueil, rien ailleurs.
{
  const z = newZone({ uid: 'd', code: '5304', nom: 'D' }, 1);
  const base = { i: capacite(z, 'intervention', 6), a: capacite(z, 'admin', 3), p: capacite(z, 'proximite', 4) };
  z.armurerie = { taser: true, radios: true };
  assert.equal(multArmurerie(z, 'intervention'), ARMURERIE.taser.cap.intervention);
  assert.equal(multArmurerie(z, 'admin'), ARMURERIE.radios.cap.admin);
  assert.equal(multArmurerie(z, 'proximite'), 1);
  assert.ok(Math.abs(capacite(z, 'intervention', 6) - base.i * 1.05) < 1e-9, 'Intervention +5 % avec les tasers');
  assert.ok(Math.abs(capacite(z, 'admin', 3) - base.a * 1.08) < 1e-9, 'Accueil +8 % avec les radios');
  assert.equal(capacite(z, 'proximite', 4), base.p, 'Proximité inchangée');
}

// Multiplicateur de risque : gilets × tasers, lu par risqueBlessure via z.risqueMat.
{
  const z = newZone({ uid: 'e', code: '5305', nom: 'E' }, 1);
  assert.equal(risqueArmurerie(z), 1);
  z.armurerie = { gilets: true, taser: true };
  assert.ok(Math.abs(risqueArmurerie(z) - 0.8 * 0.95) < 1e-9);
  const r0 = risqueBlessure(z);
  z.rapport = []; z._compta = [];
  materielDuTour(st, z, {});
  assert.ok(Math.abs(z.risqueMat - 0.76) < 1e-9, 'risque posé au tour');
  assert.ok(Math.abs(risqueBlessure(z) - r0 * 0.76) < 1e-9, 'risque de blessure réduit');
}

// Migration de l'ancien magasin : ce que la zone avait vraiment devient son armurerie, puis z.materiel disparaît.
{
  const z = newZone({ uid: 'f', code: '5306', nom: 'F' }, 1);
  delete z.armurerie;
  z.agents = 20;
  z.materiel = { _T: 5, gilets: [{ n: 10, fin: 9 }, { n: 5, fin: 8 }, { n: 10, fin: 3 }], taser: 2, bodycam: 1, gnep: 6 };
  const m = migrateZone(z);
  assert.equal(m.materiel, undefined, 'ancien champ supprimé');
  assert.deepEqual(m.armurerie, { gilets: true, taser: true, gnep: true }, 'gilets valides (15/20), tasers, casques ; trop peu de bodycams');
  // Gilets périmés ou trop peu nombreux : pas de gilets.
  const y = { agents: 20, materiel: { _T: 5, gilets: [{ n: 10, fin: 9 }, { n: 10, fin: 4 }] } };
  migrerMateriel(y);
  assert.deepEqual(y.armurerie, {});
  // Une zone qui a déjà une armurerie ne la perd pas.
  const w = { agents: 10, armurerie: { radios: true }, materiel: { taser: 3 } };
  migrerMateriel(w);
  assert.deepEqual(w.armurerie, { radios: true });
}

console.log('armurerie : ok');
