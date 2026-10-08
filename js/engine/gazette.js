// Contenu propre à la Gazette : échos du district (avec, parfois, un indice caché).
import { makeRng } from './rng.js';
import { ECHOS } from './contenu.js';
import { affaire, estAuteur } from './enquete.js';

const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/**
 * Échos du district. Certains soirs (jours 3 et 5 d'une affaire), les initiales des échos,
 * lues de haut en bas, donnent le prénom d'un suspect innocent. Rien ne le signale.
 */
export function genererEchos(state, T) {
  const rng = makeRng(`${state.seed}:echos:${state.season}:${T}`);
  const e = state.enquete;
  let mot = null;
  if (e && (e.jour === 3 || e.jour === 5)) {
    const aff = affaire(state, e.n);
    const innocents = aff.suspects.map((s, i) => ({ s, i })).filter((x) => !estAuteur(aff, x.i));
    const choix = innocents[(e.jour === 3 ? 0 : 1 + (e.n % 2)) % innocents.length];
    const p = sansAccent(choix.s.prenom).replace(/[^A-Z]/g, '');
    if ([...p].every((l) => ECHOS[l])) mot = p;
  }
  const utilises = new Set();
  const tirer = (l) => {
    const libres = (ECHOS[l] || []).filter((x) => !utilises.has(x));
    const x = rng.pick(libres.length ? libres : ECHOS[l]);
    utilises.add(x);
    return x;
  };
  if (mot) return { lignes: [...mot].map(tirer), cache: true };
  // Soir ordinaire : des échos au hasard, en nombre comparable (on ne doit pas deviner quand il y a un indice).
  const lettres = rng.shuffle(Object.keys(ECHOS)).slice(0, rng.int(4, 7));
  return { lignes: lettres.map(tirer), cache: false };
}
