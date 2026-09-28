// Hasard déterministe : une même graine donne toujours la même suite de nombres.
// Ainsi, quel que soit le joueur qui calcule un tour, le résultat est identique.

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function makeRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    /** Entier compris entre min et max inclus. */
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    float(min, max) { return min + next() * (max - min); },
    chance(p) { return next() < p; },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    /** Choix pondéré : items = [{ w: poids, ... }]. */
    weighted(items) {
      const total = items.reduce((s, it) => s + it.w, 0);
      let r = next() * total;
      for (const it of items) { r -= it.w; if (r <= 0) return it; }
      return items[items.length - 1];
    },
  };
  return rng;
}
