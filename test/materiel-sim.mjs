// Simulation du magasin et de l'armurerie (prototype) : IPZ de saison, blessés, moral et dépense de « moi »
// selon sa façon de gérer le matériel, face aux robots (qui entretiennent le leur au minimum).
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { adaptatif } from './strat-adaptatif.mjs';
import { appelDuJour, optionsAppel } from '../js/engine/brigade.js';
import { brevetesFN, mat, giletsValides, certifiesActifs, MAT, ttiValides } from '../js/engine/materiel.js';
const N = Number(process.argv[2] || 8), filtre = process.argv[3];
const moy = (a) => a.reduce((s, x) => s + x, 0) / a.length;

/** Entretien de base : tenue et chaussures avec la masse, gilets remplacés avant le trou. */
function entretien(z, st, voie = 'centrale', opts = {}) {
  const m = mat(z), T = st.turn, om = { masse: [], commandes: [] };
  if (m.tenue < 50 && m.masse >= MAT.tenue.cout) om.masse.push('tenue');
  else if (m.chaussures < 40 && m.masse >= MAT.chaussures.cout) om.masse.push('chaussures');
  // Gilets valides dans 3 jours (le temps de la centrale) + ceux en commande.
  const dans = (m.gilets || []).filter((g) => g.fin > T + 3).reduce((s, g) => s + g.n, 0);
  const enCmd = (m.commandes || []).filter((c) => c.item.startsWith('gilets')).reduce((s, c) => s + c.lots * 5, 0);
  const manque = z.agents - dans - enCmd;
  const art = opts.ajustes ? 'gilets_ajustes' : 'gilets';
  if (manque > 0) {
    const lots = Math.min(4, Math.ceil(manque / 5));
    if (voie === 'marche') {
      const ouvert = (st.marches || []).some((x) => !x.clos && x.lanceur === z.uid);
      const enMarche = (st.marches || []).some((x) => !x.clos && x.part[z.uid]);
      if (!ouvert && !enMarche) om.lancer = { item: art, lots };
    } else om.commandes.push({ item: art, lots, voie, q: opts.q || 'std' });
  }
  if (!opts.sansTTI && m.tti) { om.recyclage = []; for (const type of ['af', 'saf']) { const manque = Math.max(0, z.agents - ttiValides(m, T + 2, type)); if (manque > 0) om.recyclage.push({ type, groupes: Math.min(4, Math.ceil(manque / 4)) }); } }
  if (opts.fonctions) om.fonctions = opts.fonctions;
  return om;
}
function equiperPlus(z, st, om) {
  const m = mat(z), T = st.turn;
  if ((m.taser || 0) + (m.commandes || []).filter((c) => c.item === 'taser').length < 2 && z.budget > 12) om.commandes.push({ item: 'taser', lots: 1, voie: 'centrale' });
  if (m.taser && certifiesActifs(m, T + 1) < 2 * Math.min(2, m.taser)) om.certifier = true;
  if (!m.bodycam && !(m.commandes || []).some((c) => c.item === 'bodycam') && z.budget > 10) om.commandes.push({ item: 'bodycam', lots: 1, voie: 'centrale' });
}
function equiperFN(z, st, om) {
  const m = mat(z), T = st.turn;
  if ((m.fn303 || 0) + (m.commandes || []).filter((c) => c.item === 'fn303').length < 1 && z.budget > 12) om.commandes.push({ item: 'fn303', lots: 1, voie: 'centrale' });
  if (m.fn303 && brevetesFN(m, T + 1) < 2) om.brevetFN = true;
}
function meilleurAppel(z, st) {
  const a = appelDuJour(st), op = optionsAppel(z, a); let bi = 0, bv = -1e9;
  op.forEach((x, i) => { const v = x.p * ((x.ok.pts || 0) + 2 * (x.ok.sat || 0) + 3 * (x.ok.rep || 0)) + (1 - x.p) * ((x.ko.pts || 0) + 2 * (x.ko.sat || 0) + (x.ko.moral || 0)); if (v > bv) { bv = v; bi = i; } });
  return bi;
}

function saison(seed, pol) {
  let st = createGame({ seed });
  for (const b of BOT_PROFILES) st.zones[b.uid] = newZone(b, 1);
  st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  let fin = null, blesses = 0, moral = [], depense = 0, arretes = 0, budget = null, budgets = [], possTot = 0, refus = 0;
  for (let t = 1; t <= 14; t++) {
    const ord = {};
    for (const b of BOT_PROFILES) {
      const x = botOrders(st.zones[b.uid], st, b.style); if (!x) continue;
      const zb = st.zones[b.uid];
      if (zb.materiel) {
        x.materiel = entretien(zb, st);
        if (pol.voie === 'marche') { const mk = (st.marches || []).find((k) => !k.clos && k.lanceur === 'moi' && k.ferme >= st.turn); if (mk && !mk.part[b.uid] && x.materiel.commandes.length) { x.materiel.commandes = []; x.materiel.adherer = [{ id: mk.id, lots: 2 }]; } }
      }
      ord[b.uid] = x;
    }
    const z = st.zones.moi, o = adaptatif(z, st);
    o.appel = meilleurAppel(z, st);
    if (pol.fonceur) { const op = optionsAppel(z, appelDuJour(st)); const i = op.findIndex((x) => x.app === 'force' && !x.materiel); if (i >= 0) o.appel = i; }
    if (z.materiel && pol.gerer) { o.materiel = entretien(z, st, pol.voie || 'centrale', pol); if (pol.plus) equiperPlus(z, st, o.materiel); if (pol.fn) equiperFN(z, st, o.materiel); if (pol.casques && (mat(z).gnep || 0) < 10 && !(mat(z).commandes || []).some((c) => c.item === 'gnep')) o.materiel.commandes.push({ item: 'gnep', lots: 2, voie: 'centrale' }); }
    if (pol.passif) { Object.assign(o, { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' }); for (const k of Object.keys(o)) if (!['alloc', 'rythme', 'materiel', 'appel'].includes(k)) delete o[k]; }
    const avant = (z.blesses || []).length, b0 = z.budget;
    const r = resolveTurn(st, { orders: { ...ord, moi: o }, quests: {}, players: {}, nextWeekday: (t + 1) % 7 });
    st = r.state; const z2 = st.zones.moi;
    moral.push(z2.moral);
    if (z2.compta && z2.compta.lignes) depense -= z2.compta.lignes.filter((l) => l.k === 'materiel').reduce((a, l) => a + l.v, 0);
    budgets.push(z2.budget); refus += (z2.rapport || []).filter((l) => /refus[ée]+ : budget/.test(l)).length;
    if (t === 13) { budget = z2.budget; fin = z2.ipz; const zs = z2.stats || {}; blesses = zs.blessesAppel || 0; arretes = zs.coupsArretes || 0; }
    if (st.turn === 1) { const c = st.gazette && st.gazette.classement; const l = Array.isArray(c) ? c.find((x) => x.uid === 'moi') : null; if (l) fin = l.ipz; }
  }
  return { fin, blesses, arretes, moral: moy(moral), budget, depense: depense / 13, mini: Math.min(...budgets.slice(0, 13)), poss: possTot / 13, refus };
}
const pols = {
  'passif, rien': { passif: 1 },
  'passif + essentiel': { passif: 1, gerer: 1 },
  'passif + tout (max)': { passif: 1, gerer: 1, plus: 1, fn: 1, casques: 1, q: 'qualite', voie: 'negociee', ajustes: 1 },
  'passif + essentiel + taser + FN': { passif: 1, gerer: 1, plus: 1, fn: 1 },
  'matériel négligé': {},
  'tout acheter (max)': { gerer: 1, plus: 1, fn: 1, casques: 1, q: 'qualite', voie: 'negociee', ajustes: 1 },
  'entretien (centrale)': { gerer: 1 },
  'entretien (procédure négociée)': { gerer: 1, voie: 'negociee' },
  'entretien en marchés groupés': { gerer: 1, voie: 'marche' },
  'gilets ajustés': { gerer: 1, ajustes: 1 },
  'entretien + taser + bodycams': { gerer: 1, plus: 1 },
  'entretien + taser + bodycams + FN 303': { gerer: 1, plus: 1, fn: 1 },
  'entretien + FN 303': { gerer: 1, fn: 1 },
  'entretien économique': { gerer: 1, q: 'eco' },
  'entretien haut de gamme': { gerer: 1, q: 'qualite' },
  'entretien + casques (non-droit)': { gerer: 1, casques: 1 },
  'entretien sans recyclage TTI': { gerer: 1, sansTTI: 1 },
  'entretien + fonctions (moniteur TTI, magasinier)': { gerer: 1, fonctions: { moniteurTTI: 'inter', magasinier: 'admin' } },
  'fonceur, matériel négligé': { fonceur: 1 },
  'fonceur, gilets entretenus': { fonceur: 1, gerer: 1 },
};
for (const [nom, pol] of Object.entries(pols)) {
  if (filtre && !nom.includes(filtre)) continue;
  const v = []; for (let s = 0; s < N; s++) v.push(saison(`mat-${s}`, pol));
  console.log(nom.padEnd(34), 'IPZ', moy(v.map((x) => x.fin)).toFixed(2), '· blessés à l’appel', moy(v.map((x) => x.blesses)).toFixed(1), '· moral', moy(v.map((x) => x.moral)).toFixed(1), '· budget J13', moy(v.map((x) => x.budget)).toFixed(0), 'k€ (mini', Math.min(...v.map((x) => x.mini)).toFixed(0) + ')', '· matériel/jour', moy(v.map((x) => x.depense)).toFixed(1), 'k€ · refus', moy(v.map((x) => x.refus)).toFixed(1));
}
