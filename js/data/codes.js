// Codes de zone : uniques dans une partie (deux zones « 5324 » sur la même carte, c'est illisible).

/** Codes déjà pris par les autres zones de la partie (le joueur lui-même est ignoré). */
export function codesPris(state, uid = null) {
  return new Set(Object.entries((state && state.zones) || {})
    .filter(([u]) => u !== uid)
    .map(([, z]) => String((z && z.code) || '').trim())
    .filter(Boolean));
}

export const codeDejaPris = (state, code, uid = null) => codesPris(state, uid).has(String(code || '').trim());

/** Un code libre au hasard, pour la suggestion du formulaire d'inscription. */
export function codeLibre(state, uid = null) {
  const pris = codesPris(state, uid);
  for (let i = 0; i < 200; i++) {
    const c = String(1000 + Math.floor(Math.random() * 9000));
    if (!pris.has(c)) return c;
  }
  return '';
}

export const MSG_CODE_PRIS = (code) => `Le code ${code} est déjà utilisé par une autre zone de cette partie. Choisis-en un autre.`;
