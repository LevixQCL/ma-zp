// La semaine du chef de corps (saison 2) : trois objectifs, un rival, des honneurs.
//  • Objectifs : chaque semaine, trois défis tirés pour ce chef (sa force, son point faible, un au hasard), à la
//    mesure de son niveau. Seuls les jours joués comptent. Chacun rapporte de l'expérience et un peu de réputation ;
//    les trois réussis donnent la médaille de la semaine.
//  • Rival : chaque semaine, le chef le plus proche au classement. Celui qui cumule le plus d'IPZ sur ses jours joués
//    gagne le duel (réputation, expérience, palmarès).
//  • Honneurs : le cadre du portrait (selon les niveaux) et des rubans gagnés au fil de la carrière, à afficher.
import { makeRng } from './rng.js';
import { IDS_COMPETENCES, COMPETENCES, niveauChef, totalNiveaux, XP_CUMUL } from './chef.js';
import { SEASON_LENGTH } from './constants.js';

export const SEMAINE = 7;
export const semaineDe = (T) => Math.ceil(T / SEMAINE);
/** Numéro de semaine sur toute la carrière (les semaines de la saison repartent à 1) : pour les séries d'une saison à l'autre. */
export const semaineCarriere = (season, w) => ((Number(season) || 1) - 1) * Math.ceil(SEASON_LENGTH / SEMAINE) + w;
export const joursSemaine = (w) => [(w - 1) * SEMAINE + 1, w * SEMAINE];
export const cleSemaine = (state, T) => `${state.season}:${semaineDe(T)}`;

// ───── Objectifs de la semaine ─────
// mesure(j) : progrès du jour (j = contexte de la soirée, jour joué seulement). cibles : selon le niveau du chef dans la compétence.
export const OBJECTIFS = {
  incidents: { comp: 'commandement', ico: '🚨', nom: (n) => `Réussir ${n} incidents du jour`, cibles: [3, 5, 7], mesure: (j) => j.d.incidentsOk },
  tenir: { comp: 'commandement', ico: '🛡️', nom: (n) => `Traiter 90 % des incidents ${n} soirs`, cibles: [3, 4, 5], mesure: (j) => (j.ratio >= 0.9 ? 1 : 0) },
  moral: { comp: 'commandement', ico: '💪', nom: (n) => `Finir ${n} soirs avec le moral à 65 ou plus`, cibles: [3, 4, 5], mesure: (j) => (j.z.moral >= 65 ? 1 : 0) },
  front: { comp: 'commandement', ico: '⚔️', nom: (n) => (n > 1 ? `Monter ${n} fois en première ligne` : 'Monter une fois en première ligne'), cibles: [1, 2, 3], mesure: (j) => (j.front ? 1 : 0) },
  pieces: { comp: 'flair', ico: '🧩', nom: (n) => `Obtenir ${n} pièces d’enquête`, cibles: [2, 3, 4], mesure: (j) => j.pieces },
  jeux: { comp: 'flair', ico: '🔎', nom: (n) => `Réussir ${n} énigmes ou jeux d’enquête`, cibles: [3, 5, 7], mesure: (j) => j.jeux.flair },
  vert: { comp: 'gestion', ico: '💶', nom: (n) => `Finir ${n} soirs dans le vert`, cibles: [3, 4, 6], mesure: (j) => (j.revenu > 0 ? 1 : 0) },
  paperasse: { comp: 'gestion', ico: '🗂️', nom: (n) => `Garder la paperasse sous 8 dossiers ${n} soirs`, cibles: [3, 4, 5], mesure: (j) => (j.z.paperasse < 8 ? 1 : 0) },
  investir: { comp: 'gestion', ico: '🏗️', nom: (n) => (n > 1 ? `Investir ${n} fois (formation, équipement, annexe)` : 'Investir une fois (formation, équipement, annexe)'), cibles: [1, 2, 3], mesure: (j) => (j.investi ? 1 : 0) },
  enchere: { comp: 'gestion', ico: '🔨', nom: (n) => (n > 1 ? `Remporter ${n} lots aux enchères` : 'Remporter un lot aux enchères'), cibles: [1, 1, 2], mesure: (j) => j.lots },
  entraide: { comp: 'diplomatie', ico: '🤝', nom: (n) => (n > 1 ? `Prêter ${n} renforts ou prendre des relèves` : 'Prêter un renfort ou prendre une relève'), cibles: [1, 2, 4], mesure: (j) => j.d.renfortsPretes + j.d.releves },
  reseau: { comp: 'diplomatie', ico: '📞', nom: (n) => (n > 1 ? `Obtenir ${n} services du réseau` : 'Obtenir un service du réseau'), cibles: [1, 2, 3], mesure: (j) => (j.service ? 1 : 0) },
  partage: { comp: 'diplomatie', ico: '📤', nom: (n) => (n > 1 ? `Partager ${n} pièces ou indices avec un partenaire` : 'Partager une pièce ou un indice avec un partenaire'), cibles: [1, 2, 3], mesure: (j) => j.d.indicesPartages + j.d.piecesPacte },
  satisfaction: { comp: 'proximite', ico: '😊', nom: (n) => `Finir ${n} soirs avec 70 de satisfaction ou plus`, cibles: [3, 4, 6], mesure: (j) => (j.z.satisfaction >= 70 ? 1 : 0) },
  vagues: { comp: 'proximite', ico: '🌊', nom: (n) => (n > 1 ? `Absorber ${n} vagues ou éviter des imprévus` : 'Absorber une vague ou éviter un imprévu'), cibles: [1, 2, 3], mesure: (j) => j.d.vaguesAbsorbees + j.d.evites },
  quartier: { comp: 'proximite', ico: '🏘️', nom: (n) => `Passer ${n} journées dans les quartiers (réunion ou terrain en Proximité)`, cibles: [2, 3, 4], mesure: (j) => (j.agenda && (j.agenda.type === 'quartier' || (j.agenda.type === 'terrain' && j.agenda.service === 'proximite')) ? 1 : 0) },
};
export const IDS_OBJECTIFS = Object.keys(OBJECTIFS);
export const RECOMPENSE = { xp: [4, 6, 8], rep: 1, medaille: { ps: 3, rep: 1 } };
export const palierDe = (L) => (L >= 7 ? 2 : L >= 4 ? 1 : 0);

/** Tire les trois objectifs de la semaine : la compétence forte, la plus faible, une autre au hasard. */
export function tirerObjectifs(state, z, T) {
  const w = semaineDe(T), rng = makeRng(`${state.seed}:s${state.season}:w${w}:obj:${z.uid}`);
  const comps = IDS_COMPETENCES.map((c) => ({ c, n: niveauChef(z.chef, c), x: rng.next() })).sort((a, b) => b.n - a.n || a.x - b.x);
  const forte = comps[0].c, faible = comps[comps.length - 1].c;
  const autres = rng.shuffle(IDS_COMPETENCES.filter((c) => c !== forte && c !== faible));
  const liste = [forte, faible, autres[0]].map((c) => {
    const ids = IDS_OBJECTIFS.filter((id) => OBJECTIFS[id].comp === c && !(id === 'enchere' && !state.vente) && !(id === 'partage' && !state.enquete));
    const id = rng.pick(ids.length ? ids : IDS_OBJECTIFS.filter((x) => OBJECTIFS[x].comp === c));
    const p = palierDe(niveauChef(z.chef, c));
    return { id, cible: OBJECTIFS[id].cibles[p], palier: p, prog: 0, fait: false };
  });
  return { cle: cleSemaine(state, T), w, wc: semaineCarriere(state.season, w), liste, finie: false };
}

/**
 * Progrès du soir (jour joué). `j` : { z, d, ratio, revenu, pieces, jeux, investi, lots, service, front, agenda }.
 * Retourne les objectifs réussis ce soir (avec la récompense déjà versée au chef) et si la semaine est parfaite.
 */
export function avancerObjectifs(z, j) {
  const o = z.chef && z.chef.objectifs;
  if (!o) return { reussis: [], parfaite: false };
  const reussis = [];
  for (const x of o.liste) {
    if (x.fait || !OBJECTIFS[x.id]) continue;
    x.prog = Math.min(x.cible, x.prog + Math.max(0, Number(OBJECTIFS[x.id].mesure(j)) || 0));
    if (x.prog >= x.cible) {
      x.fait = true;
      const c = OBJECTIFS[x.id].comp, xp = RECOMPENSE.xp[x.palier] || 4;
      z.chef.xp[c] = Math.round(((z.chef.xp[c] || 0) + xp) * 10) / 10;
      z.chef.saison[c] = Math.round(((z.chef.saison[c] || 0) + xp) * 10) / 10;
      z.reputation += RECOMPENSE.rep;
      reussis.push({ ...x, comp: c, xp });
    }
  }
  let parfaite = false;
  if (!o.finie && o.liste.every((x) => x.fait)) {
    o.finie = true; parfaite = true;
    z.ps += RECOMPENSE.medaille.ps; z.reputation += RECOMPENSE.medaille.rep;
    const h = (z.chef.hebdo ||= { semaines: 0, serie: 0, derniere: null });
    const wc = o.wc ?? o.w;
    h.serie = h.derniere === wc - 1 ? h.serie + 1 : 1;
    h.semaines += 1; h.derniere = wc;
  }
  return { reussis, parfaite };
}
export const texteObjectif = (x) => (OBJECTIFS[x.id] ? OBJECTIFS[x.id].nom(x.cible) : '');

// ───── Rival de la semaine ─────
export const DUEL = { rep: 2, xp: 3 };
const moyenneSaison = (z) => (z.toursJoues ? z.ipzSomme / z.toursJoues : 0);
const estRobot = (u) => String(u).startsWith('bot-');
/**
 * Paires de rivaux de la semaine : les chefs actifs triés par moyenne d'IPZ, appariés deux à deux (décalés d'un cran
 * une semaine sur deux, pour varier). Les joueurs passent avant les robots ; un chef seul reçoit le voisin le plus proche.
 */
export function apparier(state, uids, w) {
  const actifs = uids.filter((u) => state.zones[u] && state.zones[u].chef && (state.zones[u].toursSansOrdres || 0) < 3);
  const humains = actifs.filter((u) => !estRobot(u));
  const pool = (humains.length >= 2 ? humains : actifs).slice().sort((a, b) => moyenneSaison(state.zones[b]) - moyenneSaison(state.zones[a]) || a.localeCompare(b));
  const rivaux = {};
  if (pool.length < 2) return rivaux;
  const debut = w % 2 === 0 && pool.length >= 3 ? 1 : 0;
  for (let i = debut; i + 1 < pool.length; i += 2) { rivaux[pool[i]] = pool[i + 1]; rivaux[pool[i + 1]] = pool[i]; }
  for (const [k, u] of pool.entries()) if (!rivaux[u]) rivaux[u] = pool[k === 0 ? 1 : k - 1];
  return rivaux;
}
/** Score d'un chef dans son duel : somme de l'IPZ des jours joués de la semaine. */
export function scoreDuel(z, w) {
  const [a, b] = joursSemaine(w);
  return Math.round((z.ipzHist || []).filter((h) => h.joue && !h.faillite && h.t >= a && h.t <= b).reduce((s, h) => s + (Number(h.v) || 0), 0) * 10) / 10;
}

// ───── Honneurs : cadre du portrait et rubans ─────
export const CADRES = [
  { id: 'aucun', nom: 'Sans cadre', min: 0 },
  { id: 'bronze', nom: 'Cadre de bronze', min: 10 },
  { id: 'argent', nom: 'Cadre d’argent', min: 20 },
  { id: 'or', nom: 'Cadre d’or', min: 30 },
  { id: 'diamant', nom: 'Cadre de diamant', min: 40 },
];
export const cadreDe = (chef) => { const n = totalNiveaux(chef); return CADRES.filter((c) => n >= c.min).pop(); };
export const cadreSuivant = (chef) => { const n = totalNiveaux(chef); return CADRES.find((c) => c.min > n) || null; };
export const RUBANS = {
  assidu: { nom: 'Assidu', ico: '📅', texte: 'deux semaines parfaites (les trois objectifs)', ok: (c) => ((c.hebdo && c.hebdo.semaines) || 0) >= 2 },
  regulier: { nom: 'Régulier', ico: '🔥', texte: 'trois semaines parfaites d’affilée', ok: (c) => ((c.hebdo && c.hebdo.serie) || 0) >= 3 },
  duelliste: { nom: 'Duelliste', ico: '🤺', texte: 'trois duels de la semaine gagnés', ok: (c) => ((c.duels && c.duels.v) || 0) >= 3 },
  invaincu: { nom: 'Invaincu', ico: '🏅', texte: 'trois duels gagnés d’affilée', ok: (c) => ((c.duels && c.duels.serieMax) || 0) >= 3 },
  blesse: { nom: 'Blessé en service', ico: '🩹', texte: 'blessé en première ligne', ok: (c) => (c.blessures || 0) >= 1 },
  reseau: { nom: 'Homme de réseau', ico: '📞', texte: 'six services obtenus du réseau', ok: (c) => (c.nbServices || 0) >= 6 },
  priseur: { nom: 'Commissaire-priseur', ico: '🔨', texte: 'trois lots remportés aux enchères', ok: (c) => (c.lotsGagnes || 0) >= 3 },
  breve: { nom: 'Breveté', ico: '🎓', texte: 'brevet de carrière obtenu', ok: (c) => !!c.brevet },
  medaille: { nom: 'Médaillé', ico: '🎖️', texte: 'une médaille de compétence en fin de saison', ok: (c) => (c.medailles || []).length >= 1 },
  maitre: { nom: 'Maître', ico: '⭐', texte: 'une compétence au niveau 10', ok: (c) => IDS_COMPETENCES.some((k) => ((c.xp && c.xp[k]) || 0) >= XP_CUMUL[10]) },
};
export const IDS_RUBANS = Object.keys(RUBANS);
export const rubansDe = (chef) => (chef ? IDS_RUBANS.filter((id) => RUBANS[id].ok(chef)) : []);
export { COMPETENCES };
