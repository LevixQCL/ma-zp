// Tableau d'honneur de la Gazette : quand plusieurs zones décrochent le même trophée
// le même soir, une seule ligne les cite toutes au lieu de répéter la même phrase.
const RE = /^(ZP \S+ .+?) décroche (le trophée « .+ »)$/;

const enumerer = (noms) => (noms.length < 2 ? noms.join('') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`);

/** Regroupe les lignes « ZP … décroche le trophée « X » » identiques. Les autres lignes restent telles quelles, à leur place. */
export function regrouperHonneur(liste) {
  const out = [], groupes = new Map();
  for (const h of liste || []) {
    const m = h && h.kicker === 'Trophée' && typeof h.titre === 'string' && h.titre.match(RE);
    if (!m) { out.push(h); continue; }
    const g = groupes.get(m[2]);
    if (g) { g.zones.push(m[1]); continue; }
    const ng = { ...h, zones: [m[1]], objet: m[2] };
    groupes.set(m[2], ng); out.push(ng);
  }
  return out.map((h) => {
    if (!h.zones) return h;
    const { zones, objet, ...reste } = h;
    if (zones.length === 1) return reste;
    return { ...reste, titre: `${zones.length} zones décrochent ${objet} : ${enumerer(zones)}` };
  });
}
