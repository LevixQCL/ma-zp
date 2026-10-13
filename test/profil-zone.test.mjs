// Profil de zone (onglet Chef v3) : les multiplicateurs affichés doivent être exactement ceux du moteur (capacite),
// moral, rythme et chef du jour mis à part. Usage : node test/profil-zone.test.mjs
import assert from 'node:assert/strict';
import { profilZone, SEUIL_TITRE } from '../js/ui/profil-zone.js';
import { capacite, moralMult } from '../js/engine/zone.js';

const base = () => ({ uid: 'u', niveaux: { intervention: 1, proximite: 1, recherche: 1, roulage: 1, admin: 1 }, equip: { intervention: 1, proximite: 1, recherche: 1, roulage: 1, admin: 1 }, infra: {}, lots: [], flotte: [], vehicules: 2, vehiculesHS: [], usure: 0, moral: 80 });

// Zone de départ : tout à ×1, pas de titre.
{
  const p = profilZone(base());
  for (const s of p.svc) assert.ok(Math.abs(s.v - 1) < 1e-9, `${s.k} devrait valoir ×1`);
  assert.equal(p.titre, 'Zone polyvalente');
}

// Zone spécialisée : mêmes chiffres que capacite() pour les services sans places ni seuil (Recherche, Proximité, Accueil).
{
  const z = base();
  Object.assign(z.niveaux, { recherche: 4, proximite: 3, admin: 2 });
  Object.assign(z.equip, { recherche: 3, proximite: 2 });
  z.infra = { audition: true, antenne: true, logiciel: true };
  z.doctrine = 'judiciaire'; z.maitrise = 1;
  const p = profilZone(z);
  for (const k of ['recherche', 'proximite', 'admin']) {
    const attendu = capacite(z, k, 1) / moralMult(z.moral);
    const v = p.svc.find((s) => s.k === k).v;
    assert.ok(Math.abs(v - attendu) < 1e-9, `${k} : profil ${v} ≠ moteur ${attendu}`);
  }
  // Le malus de doctrine (Intervention −5 %) apparaît bien.
  assert.ok(p.svc.find((s) => s.k === 'intervention').v < 1);
  assert.equal(p.top.k, 'recherche');
}

// Titre : il faut SEUIL_TITRE d'avance sur le deuxième service.
{
  const z = base(); z.niveaux.intervention = 2; // ×1,2 : assez
  assert.equal(profilZone(z).titre, 1.2 >= SEUIL_TITRE ? 'Zone de choc' : 'Zone polyvalente');
  z.niveaux.proximite = 2; // égalité : plus de titre
  assert.equal(profilZone(z).titre, 'Zone polyvalente');
}
console.log('OK : profil de zone conforme au moteur.');
