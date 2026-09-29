// Attribution des sites sensibles (un par zone, tous différents tant qu'il en reste).
import { SITES } from './contenu.js';
import { makeRng, hashString } from './rng.js';

export const SITE_PAR_ID = Object.fromEntries(SITES.map((s) => [s.id, s]));
export const siteDe = (z) => (z && z.site && SITE_PAR_ID[z.site]) || null;

/** Donne un site aux zones qui n'en ont pas encore (ordre stable : ancienneté, puis identifiant). */
export function attribuerSites(state) {
  const zones = Object.values(state.zones || {});
  if (!zones.some((z) => !z.site)) return state;
  const rng = makeRng(`${state.seed || 'delta'}:sites`);
  const ordre = rng.shuffle ? rng.shuffle(SITES.map((s) => s.id)) : SITES.map((s) => s.id).sort((a, b) => hashString(`${state.seed}:${a}`) - hashString(`${state.seed}:${b}`));
  const pris = new Set(zones.filter((z) => z.site).map((z) => z.site));
  const aFaire = zones.filter((z) => !z.site).sort((a, b) => ((a.joinedTurn ?? 1) - (b.joinedTurn ?? 1)) || (hashString(a.uid) - hashString(b.uid)));
  for (const z of aFaire) {
    let id = ordre.find((s) => !pris.has(s));
    if (!id) id = ordre[Math.abs(hashString(z.uid)) % ordre.length]; // plus de sites que de zones : on recommence
    z.site = id; pris.add(id);
  }
  return state;
}
