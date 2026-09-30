// Parc automobile vu véhicule par véhicule.
// Le moteur ne garde qu'un nombre de véhicules, une usure commune (état du parc) et deux listes :
// les véhicules cabossés (`cabosses`) et ceux immobilisés à l'atelier (`vehiculesHS`).
// Chaque entrée de ces listes porte une place (`slot`) pour qu'un véhicule garde le même nom
// d'un tour à l'autre. Le type (combi ou voiture anonymisée) découle de la place : c'est
// un habillage, sans effet sur les règles.

/** Type d'un véhicule selon sa place : deux combis pour une voiture anonymisée. */
export const typeVehicule = (slot) => (slot % 3 === 2 ? 'anonyme' : 'combi');

/** Nom affiché : « Combi 3 », « Anonyme 1 »… (numérotés par type). */
export function nomVehicule(slot) {
  const t = typeVehicule(slot);
  let n = 0;
  for (let i = 0; i <= slot; i++) if (typeVehicule(i) === t) n++;
  return `${t === 'combi' ? 'Combi' : 'Anonyme'} ${n}`;
}

/** Première place libre (ni cabossée ni à l'atelier), ou -1. */
export function placeLibre(z, T = 0) {
  const prises = new Set([...(z.cabosses || []), ...(z.vehiculesHS || []).filter((v) => v.retour > T)].map((x) => x.slot).filter((s) => s != null));
  for (let i = 0; i < (z.vehicules || 0); i++) if (!prises.has(i)) return i;
  return -1;
}

/**
 * Liste des véhicules de la zone au tour T :
 * [{ slot, type, nom, etat: 'service' | 'cabosse' | 'atelier', jours, cab, depuis }]
 * `cab` est l'indice dans `z.cabosses` (pour la réparation ciblée).
 */
export function parcVehicules(z, T) {
  const n = Math.max(0, z.vehicules || 0);
  const places = Array.from({ length: n }, (_, slot) => ({ slot, type: typeVehicule(slot), nom: nomVehicule(slot), etat: 'service' }));
  const pris = new Set();
  const aPlacer = [];
  const poser = (slot, info) => { pris.add(slot); Object.assign(places[slot], info); };
  const hs = (z.vehiculesHS || []).filter((v) => v.retour > T);
  for (const v of hs) {
    const info = { etat: 'atelier', jours: v.retour - T };
    if (v.slot != null && v.slot < n && !pris.has(v.slot)) poser(v.slot, info); else aPlacer.push(info);
  }
  (z.cabosses || []).forEach((c, i) => {
    const info = { etat: 'cabosse', cab: i, depuis: c.depuis };
    if (c.slot != null && c.slot < n && !pris.has(c.slot)) poser(c.slot, info); else aPlacer.push(info);
  });
  for (const info of aPlacer) {
    const libre = places.find((p) => !pris.has(p.slot));
    if (!libre) break;
    poser(libre.slot, info);
  }
  return places;
}

/** Indices (dans z.cabosses) retenus pour la carrosserie : `true` = tous, sinon une liste. */
export function cabossesChoisis(z, choix) {
  const n = (z.cabosses || []).length;
  if (!choix || !n) return [];
  if (!Array.isArray(choix)) return Array.from({ length: n }, (_, i) => i);
  return [...new Set(choix.map((i) => Math.floor(Number(i))).filter((i) => Number.isInteger(i) && i >= 0 && i < n))].sort((a, b) => a - b);
}
