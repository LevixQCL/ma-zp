// Jours de l'événement « Rattrape Luc » (mini-jeu clin d'œil, sans effet sur les zones).
// Tirés au sort pour toute la partie, en moyenne une fois par semaine et jamais deux jours de suite.
// Partagé par le moteur (pas d'urgence Bitonal un jour de Luc : Luc la remplace) et par l'interface.
function h32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const LUC_CHANCE = 16; // % des jours tirés (puis on retire ceux qui suivent un jour tiré)
const tire = (st, T) => h32(`${st.seed}:s${st.season}:t${T}:luc`) % 100 < LUC_CHANCE;
/** Jour de Luc pour toute la partie (tour T de la saison en cours). */
export const jourDeLuc = (st, T) => !!st && tire(st, T) && !tire(st, T - 1);
