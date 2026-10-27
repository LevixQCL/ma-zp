// Armurerie (saison 4) : quelques achats clairs, gardés pour de bon, chacun avec un effet visible.
// Un achat par soir au plus, payé et livré le soir même : il sert dès le lendemain.
// Rien ici ne touche au niveau de matériel des services (z.equip), qui reste la grande décision « Équiper ».

export const ARMURERIE = {
  gilets: { nom: 'Gilets pare-balles neufs', ico: '🦺', prix: 6, effet: 'blessures 20 % moins fréquentes', risque: 0.8 },
  taser: { nom: 'Tasers', ico: '⚡', prix: 5, entretien: 0.2, effet: 'Intervention +5 %, blessures 5 % moins fréquentes', cap: { intervention: 1.05 }, risque: 0.95 },
  bodycam: { nom: 'Bodycams', ico: '📹', prix: 5, entretien: 0.1, effet: '+0,3 de satisfaction par soir (interventions filmées, moins de plaintes)', sat: 0.3 },
  gnep: { nom: 'Casques et boucliers', ico: '🛡️', prix: 5, effet: 'zone de non-droit : force +8 %, blessures 20 % moins fréquentes', nd: { force: 1.08, risque: 0.8 } },
  radios: { nom: 'Radios numériques', ico: '📻', prix: 4, effet: 'Accueil et administration +8 %', cap: { admin: 1.08 } },
};
export const IDS_ARMURERIE = Object.keys(ARMURERIE);

/** La zone possède-t-elle cet équipement ? */
export const possede = (z, k) => !!(z && z.armurerie && z.armurerie[k]);

/** Entretien quotidien de l'armurerie (k€). */
export const entretienArmurerie = (z) => Math.round(IDS_ARMURERIE.reduce((s, k) => s + (possede(z, k) ? ARMURERIE[k].entretien || 0 : 0), 0) * 100) / 100;

/** Multiplicateur de capacité apporté par l'armurerie pour un service. */
export function multArmurerie(z, service) {
  let m = 1;
  for (const k of IDS_ARMURERIE) { const c = ARMURERIE[k].cap; if (c && c[service] && possede(z, k)) m *= c[service]; }
  return m;
}

/** Multiplicateur du risque de blessure (1 sans rien). */
export function risqueArmurerie(z) {
  let r = 1;
  for (const k of IDS_ARMURERIE) if (ARMURERIE[k].risque && possede(z, k)) r *= ARMURERIE[k].risque;
  return r;
}

/** Non-droit : effet des casques et boucliers sur un engagement. */
export function effetCasquesND(z) {
  return possede(z, 'gnep') ? { force: ARMURERIE.gnep.nd.force, risque: ARMURERIE.gnep.nd.risque } : { force: 1, risque: 1 };
}

/** Pourquoi cet achat est impossible ce soir (ou null). */
export function achatImpossible(z, k) {
  if (typeof k !== 'string' || !Object.hasOwn(ARMURERIE, k)) return 'équipement inconnu';
  if (possede(z, k)) return 'déjà dans ton armurerie';
  if ((Number(z && z.budget) || 0) < ARMURERIE[k].prix) return 'budget insuffisant';
  return null;
}

/**
 * L'armurerie d'une zone au tour de 20:00 : l'achat du soir, l'entretien, les effets du jour.
 * Pose z.risqueMat (lu par risqueBlessure). Renvoie les lignes du rapport.
 */
export function materielDuTour(state, z, o) {
  const L = [];
  const k = o && o.materiel && o.materiel.acheter;
  if (k) {
    const refus = achatImpossible(z, k);
    if (refus) L.push(`Armurerie : achat refusé (${refus}).`);
    else {
      const A = ARMURERIE[k];
      z.budget -= A.prix; (z._compta ||= []).push({ k: 'materiel', l: `Armurerie : ${A.nom.toLowerCase()}`, v: -A.prix });
      (z.armurerie ||= {})[k] = true;
      L.push(`Armurerie : ${A.nom.toLowerCase()} livrés ce soir, pour de bon (${A.effet}).`);
    }
  }
  const e = entretienArmurerie(z);
  if (e > 0) { z.budget -= e; (z._compta ||= []).push({ k: 'materiel', l: 'Armurerie : entretien', v: -e }); }
  if (possede(z, 'bodycam')) z.satisfaction += ARMURERIE.bodycam.sat;
  z.risqueMat = risqueArmurerie(z);
  return L;
}

/**
 * Ancien magasin (avant la saison 4) : ce que la zone avait vraiment devient son armurerie
 * (gilets valides pour presque tout le monde, tasers, bodycams, casques).
 */
export function migrerMateriel(z) {
  const m = z && z.materiel;
  if (!m || z.armurerie) return;
  const a = {};
  const T = Number(m._T) || 0, n = Math.max(1, Number(z.agents) || 1);
  const gilets = (m.gilets || []).filter((g) => g && g.fin > T).reduce((s, g) => s + (Number(g.n) || 0), 0);
  if (gilets >= 0.7 * n) a.gilets = true;
  if ((m.taser || 0) > 0) a.taser = true;
  if ((m.bodycam || 0) >= 3) a.bodycam = true;
  if ((m.gnep || 0) >= 5) a.gnep = true;
  z.armurerie = a;
}

/** Achat d'un robot : le premier équipement abordable en gardant une marge. */
export function ordresMaterielRobot(z) {
  for (const k of ['gilets', 'gnep', 'radios', 'taser', 'bodycam']) if (!possede(z, k) && (Number(z.budget) || 0) > ARMURERIE[k].prix + 12) return { acheter: k };
  return null;
}
