// Magasin et armurerie (oct. 2026, onglet Brigade › Matériel) : la dotation individuelle des agents.
// Tenue (polos, chaussures) payée avec la masse d'habillement, gilets pare-balles qui périment, armement collectif
// (taser, avec agents brevetés), bodycams, équipement de maintien de l'ordre. Trois façons d'acheter, comme une vraie zone :
// la centrale d'achat fédérale (prix normal, livraison en 3 jours), la procédure négociée (cher, le lendemain)
// et le marché lancé par une zone, auquel les autres adhèrent (moins cher pour tous, plus il y a de zones).
// Rien ici ne touche au niveau de matériel des services (z.equip), qui reste la grande décision « Équiper ».
import { makeRng } from './rng.js';

export const MAT = {
  masse: { parJour: 1, max: 12 },                       // points de masse d'habillement (perdus en fin de saison)
  tenue: { usure: 2, cout: 4 },                          // polos et t-shirts : état −2/jour, renouvelés pour 4 points
  chaussures: { usure: 1, cout: 5 },
  // Moral par jour selon l'état de la tenue.
  moralTenue: [[75, 0.8], [45, 0], [25, -1], [0, -1.5]],
  gilets: { lot: 5, prix: 1.5, validite: 28, perime: 1.35, refus: 0.3, coupRefus: 0.4, arrete: 0.7, ajuste: { prix: 2, risque: 0.85, moral: 0.3 }, moralTrou: -0.6 },
  taser: { lot: 1, prix: 1, possession: 0.15, cert: { agents: 2, prix: 1, validite: 14 }, max: 3, risque: 0.05 },
  // FN 303 : lanceur de projectiles non létaux, même vocation que le taser (neutraliser à distance), plus de portée.
  fn303: { lot: 1, prix: 0.8, possession: 0.1, cert: { agents: 2, prix: 1, validite: 14 }, max: 2, risque: 0.03 },
  bodycam: { lot: 3, prix: 1.2, entretien: 0.08, max: 3, sat: 0.15, procedure: 0.05 },
  gnep: { lot: 5, prix: 1.4 },
  voies: {
    centrale: { nom: 'Centrale d’achat fédérale', mult: 1, delai: 3 },
    negociee: { nom: 'Procédure négociée', mult: 1.4, delai: 1 },
  },
  lotsMax: 8,
  // Fournisseurs : prix, validité des gilets, risque de lot recalé à la livraison.
  gammes: {
    eco: { nom: 'Économique', prix: 0.8, validite: 21, defaut: 0.15 },
    std: { nom: 'Standard', prix: 1, validite: 28, defaut: 0.04 },
    qualite: { nom: 'Haut de gamme', prix: 1.25, validite: 35, defaut: 0 },
  },
  retard: { centrale: 0.15, marche: 0.1, jours: 2 },
  // Usure selon l'activité : rythme (tenue), part des agents sur le terrain (chaussures).
  usure: { renforce: 1.5, allege: 0.7, terrain: 1 },
  // Inspection surprise (en moyenne une fois tous les 8 jours).
  inspection: { chance: 0.125, seuil: 0.15, amende: 2, rep: 1, masse: 4, moral: 1 },
  // Céder du matériel à une autre zone.
  ceder: { psPar: 2, psMax: 5, rep: 1 },
  // Non-droit : casques et boucliers.
  nd: { force: 0.08, risque: 0.2, malus: 1.1, casse: 0.25 },
  masseRecrue: 1,
  // Recyclage TTI (techniques et tactiques d'intervention) : avec arme à feu (tir) et sans arme à feu (maîtrise).
  tti: { validite: 28, groupe: 4, af: { nom: 'TTI avec arme à feu', prix: 1 }, saf: { nom: 'TTI sans arme à feu', prix: 0.5 },
    seuilAF: 0.1, coupAF: 0.8, risqueSAF: 0.3, seuilSAF: 0.3, satSAF: -0.2, groupesMax: 4 },
  // Fonctions matériel des figures (dès leur premier surnom) : une figure par fonction.
  fonctions: {
    moniteurTTI: { nom: 'Moniteur TTI', texte: 'Recyclages TTI à moitié prix, valables 35 jours au lieu de 28.' },
    moniteurTaser: { nom: 'Moniteur taser et FN 303', texte: 'Brevets taser et FN 303 à moitié prix, valables 21 jours au lieu de 14.' },
    magasinier: { nom: 'Magasinier', texte: 'Plus aucun retard de livraison, masse d’habillement jusqu’à 16 points.' },
    acheteur: { nom: 'Acheteur', texte: 'Moitié moins de lots recalés, procédure négociée à +20 % au lieu de +40 %.' },
  },
  marche: { duree: 2, livraison: 2, base: 0.95, remiseParZone: 0.05, remiseMax: 0.25, psLanceur: 2 },
};
export const ARTICLES = {
  gilets: { nom: 'Gilets pare-balles', lot: MAT.gilets.lot, prix: MAT.gilets.prix },
  gilets_ajustes: { nom: 'Gilets ajustés (port discret)', lot: MAT.gilets.lot, prix: MAT.gilets.ajuste.prix },
  taser: { nom: 'Taser', lot: MAT.taser.lot, prix: MAT.taser.prix },
  fn303: { nom: 'FN 303', lot: MAT.fn303.lot, prix: MAT.fn303.prix },
  bodycam: { nom: 'Bodycams', lot: MAT.bodycam.lot, prix: MAT.bodycam.prix },
  gnep: { nom: 'Casques et boucliers', lot: MAT.gnep.lot, prix: MAT.gnep.prix },
};

export const gammeDe = (k) => MAT.gammes[k] || MAT.gammes.std;
/** Dotation de départ : gilets pour tous, mais achetés à des dates différentes (un tiers périme dans la semaine). */
export function creerMateriel(z, T = 1) {
  const n = (z && z.agents) || 20, a = Math.ceil(n / 3);
  return {
    masse: 6, tenue: 60, chaussures: 70,
    gilets: [{ n: a, fin: T + 5, m: 'std' }, { n: a, fin: T + 16, m: 'std' }, { n: n - 2 * a, fin: T + 30, m: 'std' }],
    taser: 0, certifies: [], fn303: 0, brevetsFN: [], bodycam: 0, gnep: 0, commandes: [], tti: ttiDepart(n, T),
  };
}
/** Qualifications TTI de départ : tout le monde à jour, mais recyclé à des dates différentes. */
export function ttiDepart(n, T) {
  const a = Math.ceil(n / 3);
  return { af: [{ n: a, fin: T + 6 }, { n: a, fin: T + 18 }, { n: n - 2 * a, fin: T + 31 }], saf: [{ n: a, fin: T + 9 }, { n: a, fin: T + 21 }, { n: n - 2 * a, fin: T + 33 }] };
}
/** Agents à jour de leur recyclage TTI (type 'af' ou 'saf'). */
export const ttiValides = (m, T, type) => Math.min(1e9, ((m && m.tti && m.tti[type]) || []).filter((x) => x.fin > T).reduce((s, x) => s + x.n, 0));
/** Part des agents dont le recyclage est échu. */
export const trouTTI = (z, T, type) => { const n = Math.max(1, (z && z.agents) || 1); return Math.max(0, n - ttiValides(z && z.materiel, T, type)) / n; };
/** Intervention : sans recyclage TTI avec arme à feu, un agent ne peut plus porter son arme (au-delà de 10 % de la zone). */
export const facteurTTI = (z, T) => { const t = trouTTI(z, T, 'af'); return t > MAT.tti.seuilAF ? 1 - MAT.tti.coupAF * (t - MAT.tti.seuilAF) : 1; };
/** Figure qui tient une fonction matériel (ou null). */
export function fonction(z, k) {
  const role = z && z.fonctions && z.fonctions[k];
  const f = role && (z.equipe || []).find((m) => m.role === role);
  return f && (f.niveau || 0) >= 1 ? f : null;
}
/** Fonctions demandées dans les ordres : { fonction: rôle | null }. Une figure ne tient qu'une fonction. */
export function appliquerFonctions(z, dem) {
  if (!dem || typeof dem !== 'object') return [];
  const L = [], f = (z.fonctions ||= {});
  for (const [k, role] of Object.entries(dem)) {
    if (!MAT.fonctions[k] || f[k] === role) continue;
    if (role == null) { delete f[k]; continue; }
    const fig = (z.equipe || []).find((m) => m.role === role);
    if (!fig || (fig.niveau || 0) < 1) continue;
    for (const k2 of Object.keys(f)) if (f[k2] === role) delete f[k2];
    f[k] = role; L.push(`Fonction : ${fig.prenom} ${fig.nom} devient ${MAT.fonctions[k].nom.toLowerCase()}.`);
  }
  return L;
}
/** Recyclage : les agents dont la qualification expire le plus tôt passent d'abord. */
function recycler(m, type, n, fin) {
  const l = (m.tti ||= { af: [], saf: [] })[type] ||= [];
  let r = n;
  for (const x of l.sort((a, b) => a.fin - b.fin)) { const k = Math.min(r, x.n); x.n -= k; r -= k; if (!r) break; }
  m.tti[type] = l.filter((x) => x.n > 0); m.tti[type].push({ n, fin });
}
export const mat = (z) => (z.materiel ||= creerMateriel(z, 1));
export const certifiesActifs = (m, T) => (m.certifies || []).filter((c) => c.fin > T).reduce((s, c) => s + c.n, 0);
export const auRatelier = (m, T) => !!(m && m.rangeT && m.rangeT === T);
/** Coût de possession quotidien de l'armurerie (k€). */
export const possession = (m) => Math.round(((m.taser || 0) * MAT.taser.possession + (m.fn303 || 0) * MAT.fn303.possession + (m.bodycam || 0) * MAT.bodycam.entretien) * 100) / 100;
export const tasersActifs = (m, T) => auRatelier(m, T) ? 0 : Math.min(MAT.taser.max, m.taser || 0, Math.floor(certifiesActifs(m, T) / 2));
export const brevetesFN = (m, T) => ((m && m.brevetsFN) || []).filter((c) => c.fin > T).reduce((s, c) => s + c.n, 0);
export const fnActifs = (m, T) => auRatelier(m, T) ? 0 : Math.min(MAT.fn303.max, (m && m.fn303) || 0, Math.floor(brevetesFN(m, T) / 2));
/** Gilets valides ce soir : { std, ajustes, total }. */
export function giletsValides(m, T) {
  const ok = (m.gilets || []).filter((g) => g.fin > T);
  const aj = ok.filter((g) => g.m === 'ajuste').reduce((s, g) => s + g.n, 0);
  const std = ok.filter((g) => g.m !== 'ajuste').reduce((s, g) => s + g.n, 0);
  return { std, ajustes: aj, total: std + aj };
}
/** Multiplicateur du risque de blessure (1 = tout le monde a un gilet valide, comme avant). */
export function risqueMateriel(z, T) {
  const m = mat(z), n = Math.max(1, z.agents || 1), g = giletsValides(m, T);
  const aj = Math.min(n, g.ajustes), std = Math.min(n - aj, g.std), trou = n - aj - std;
  let r = (aj * MAT.gilets.ajuste.risque + std + trou * MAT.gilets.perime) / n;
  r *= 1 - MAT.taser.risque * tasersActifs(m, T) - MAT.fn303.risque * fnActifs(m, T);
  if (m.chaussures >= 50) r *= 0.97; else if (m.chaussures < 25) r *= 1.08;
  if (m.tti) r *= 1 + MAT.tti.risqueSAF * trouTTI(z, T, 'saf');
  return r;
}

/** Part des agents sans gilet valide. */
export function trouGilets(z, T) { const m = z && z.materiel; if (!m) return 0; const n = Math.max(1, z.agents || 1); return Math.max(0, n - giletsValides(m, T).total) / n; }
/** Intervention : sans gilet valide, une partie des agents refuse les interventions à risque (au-delà de 30 % de trous). */
export const facteurGilets = (z, T) => { const t = trouGilets(z, T); return t > MAT.gilets.refus ? 1 - MAT.gilets.coupRefus * t : 1; };

/** Prix d'un marché selon le nombre de zones qui y ont adhéré (lanceur compris). */
export const prixMarche = (nZones) => MAT.marche.base * (1 - Math.min(MAT.marche.remiseMax, MAT.marche.remiseParZone * Math.max(0, nZones - 1)));

function livrer(z, m, c, T, lignes, rng) {
  const a = ARTICLES[c.item], q = gammeDe(c.q);
  let lots = c.lots, recale = '';
  // Lot recalé au contrôle de réception (surtout en gamme économique) : renvoyé, remboursé à moitié.
  if (rng && q.defaut && rng.chance(q.defaut * (fonction(z, 'acheteur') ? 0.5 : 1))) {
    lots -= 1; const r = Math.round(a.prix * q.prix * 0.5 * 10) / 10; z.budget += r; (z._compta ||= []).push({ k: 'materiel', l: `Lot recalé : ${a.nom.toLowerCase()}`, v: r });
    recale = ` Un lot est recalé au contrôle de réception (${a.lot} ${a.nom.toLowerCase()} renvoyés, ${r} k€ remboursés).`;
  }
  const n = lots * a.lot;
  if (n > 0) {
    if (c.item === 'gilets' || c.item === 'gilets_ajustes') m.gilets.push({ n, fin: T + q.validite, m: c.item === 'gilets' ? 'std' : 'ajuste', q: c.q || 'std' });
    else m[c.item] = (m[c.item] || 0) + n;
  }
  lignes.push(`Livraison : ${n} ${a.nom.toLowerCase()}${c.voie === 'marche' ? ' (marché groupé)' : ''}${c.q && c.q !== 'std' ? `, gamme ${q.nom.toLowerCase()}` : ''}.${recale}`);
}

/** Ferme les marchés arrivés à échéance : prix final, paiement et livraison programmée. Une fois par tour. */
export function fermerMarches(state, T) {
  if (state._marchesT === T) return;
  state._marchesT = T;
  for (const mk of state.marches || []) {
    if (mk.clos || mk.ferme >= T) continue;
    mk.clos = true;
    const zones = Object.keys(mk.part).filter((u) => state.zones[u]);
    const pm = prixMarche(zones.length);
    for (const u of zones) {
      const z = state.zones[u], m = mat(z), a = ARTICLES[mk.item];
      let lots = mk.part[u];
      while (lots > 0 && z.budget < lots * a.prix * pm) lots--;
      if (!lots) { (z.rapportMat ||= []).push(`Marché ${a.nom.toLowerCase()} : budget insuffisant, ta part est annulée.`); continue; }
      const cout = Math.round(lots * a.prix * pm * gammeDe(mk.q).prix * 10) / 10;
      z.budget -= cout; (z._compta ||= []).push({ k: 'materiel', l: `Marché groupé : ${a.nom.toLowerCase()}`, v: -cout });
      m.commandes.push({ item: mk.item, lots, arrive: T + MAT.marche.livraison, voie: 'marche', q: mk.q || 'std' });
      (z.rapportMat ||= []).push(`Marché ${a.nom.toLowerCase()} clos à ${zones.length} zone${zones.length > 1 ? 's' : ''} : ${Math.round((1 - pm) * 100)} % de remise, ${cout} k€, livraison dans ${MAT.marche.livraison} jours.`);
      if (u === mk.lanceur && zones.length > 1) { z.psMarche = (z.psMarche || 0) + MAT.marche.psLanceur * (zones.length - 1); (z.rapportMat ||= []).push(`Ton marché a réuni ${zones.length} zones : +${MAT.marche.psLanceur * (zones.length - 1)} PS.`); }
    }
  }
  state.marches = (state.marches || []).filter((mk) => !mk.clos || mk.ferme >= T - 3);
}

/**
 * Le matériel d'une zone au tour de 20:00 : ordres (masse, commandes, marchés, brevets taser), livraisons, usure,
 * péremptions. Pose z.risqueMat (lu par risqueBlessure) et applique moral et satisfaction. Renvoie les lignes du rapport.
 */
export function materielDuTour(state, z, o, T) {
  fermerMarches(state, T);
  if (!z.materiel) z.materiel = creerMateriel(z, T);
  const m = mat(z), L = (z.rapportMat || []).splice(0), om = (o && o.materiel) || {};
  m._T = T; z._blessesAvant = (z.blesses || []).length;
  if (z.psMarche) { z._ps = (z._ps || 0) + z.psMarche; delete z.psMarche; }
  L.push(...appliquerFonctions(z, om.fonctions));
  // Masse d'habillement.
  const masseMax = fonction(z, 'magasinier') ? 16 : MAT.masse.max;
  m.masse = Math.min(masseMax, m.masse + MAT.masse.parJour);
  for (const k of Array.isArray(om.masse) ? om.masse : []) {
    const c = MAT[k] && MAT[k].cout;
    if ((k === 'tenue' || k === 'chaussures') && m.masse >= c) { m.masse -= c; m[k] = 100; L.push(k === 'tenue' ? 'Masse d’habillement : polos et t-shirts neufs pour tout le monde.' : 'Masse d’habillement : chaussures d’intervention neuves.'); }
  }
  // Commandes directes.
  for (const c of Array.isArray(om.commandes) ? om.commandes.slice(0, 3) : []) {
    const a = ARTICLES[c && c.item], v = MAT.voies[c && c.voie], lots = Math.max(1, Math.min(MAT.lotsMax, Math.round(Number(c && c.lots) || 1)));
    if (!a || !v) continue;
    const q = MAT.gammes[c.q] ? c.q : 'std';
    const mult = c.voie === 'negociee' && fonction(z, 'acheteur') ? 1.2 : v.mult;
    const cout = Math.round(lots * a.prix * mult * gammeDe(q).prix * 10) / 10;
    if (z.budget < cout) { L.push(`Commande ${a.nom.toLowerCase()} refusée : budget insuffisant (${cout} k€).`); continue; }
    z.budget -= cout; (z._compta ||= []).push({ k: 'materiel', l: `${a.nom} (${v.nom.toLowerCase()})`, v: -cout });
    m.commandes.push({ item: c.item, lots, arrive: T + v.delai, voie: c.voie, q });
    L.push(`Commande : ${lots * a.lot} ${a.nom.toLowerCase()}${q !== 'std' ? ` (${gammeDe(q).nom.toLowerCase()})` : ''}, ${cout} k€, ${v.nom.toLowerCase()}, livraison dans ${v.delai} jour${v.delai > 1 ? 's' : ''}.`);
  }
  // Lancer un marché, adhérer à ceux des autres.
  const ms = (state.marches ||= []);
  if (om.lancer && ARTICLES[om.lancer.item] && !ms.some((x) => !x.clos && x.lanceur === z.uid)) {
    const id = `${state.season}-${T}-${z.uid}`;
    ms.push({ id, item: om.lancer.item, q: MAT.gammes[om.lancer.q] ? om.lancer.q : 'std', lanceur: z.uid, ouvert: T, ferme: T + MAT.marche.duree, part: { [z.uid]: Math.max(1, Math.min(MAT.lotsMax, Math.round(om.lancer.lots || 1))) } });
    L.push(`Marché lancé : ${ARTICLES[om.lancer.item].nom.toLowerCase()}. Les autres zones peuvent y adhérer pendant ${MAT.marche.duree} jours ; plus elles sont nombreuses, plus le prix baisse.`);
  }
  for (const ad of Array.isArray(om.adherer) ? om.adherer : []) {
    const mk = ms.find((x) => x.id === (ad && ad.id) && !x.clos && x.ferme >= T);
    if (mk && !mk.part[z.uid]) { mk.part[z.uid] = Math.max(1, Math.min(MAT.lotsMax, Math.round(ad.lots || 1))); L.push(`Adhésion au marché ${ARTICLES[mk.item].nom.toLowerCase()} de ${(state.zones[mk.lanceur] || {}).nom || 'une zone voisine'}.`); }
  }
  // Brevet taser : 2 agents absents demain, 1 k€.
  const mt = fonction(z, 'moniteurTaser'), prixB = MAT.taser.cert.prix * (mt ? 0.5 : 1), valB = mt ? 21 : MAT.taser.cert.validite;
  if (om.certifier && (m.taser || 0) > 0 && z.budget >= prixB) {
    z.budget -= prixB; (z._compta ||= []).push({ k: 'materiel', l: 'Brevet taser', v: -prixB });
    m.certifies.push({ n: MAT.taser.cert.agents, fin: T + 1 + valB });
    (z.blesses ||= []).push({ n: MAT.taser.cert.agents, retour: T + 2, motif: 'brevet taser' });
    L.push(`Brevet taser : ${MAT.taser.cert.agents} agents en formation demain${mt ? ` avec ${mt.prenom} ${mt.nom} (moniteur)` : ''}, brevetés pour ${valB} jours.`);
  }
  if (om.brevetFN && (m.fn303 || 0) > 0 && z.budget >= prixB) {
    z.budget -= prixB; (z._compta ||= []).push({ k: 'materiel', l: 'Brevet FN 303', v: -prixB });
    (m.brevetsFN ||= []).push({ n: MAT.fn303.cert.agents, fin: T + 1 + valB });
    (z.blesses ||= []).push({ n: MAT.fn303.cert.agents, retour: T + 2, motif: 'brevet FN 303' });
    L.push(`Brevet FN 303 : ${MAT.fn303.cert.agents} agents en formation demain${mt ? ` avec ${mt.prenom} ${mt.nom} (moniteur)` : ''}, brevetés pour ${valB} jours.`);
  }
  // Recyclages TTI : par groupes de 4 agents, en formation demain (au stand de tir : moitié prix et moitié moins d'absents pour le tir).
  if (!m.tti) m.tti = ttiDepart(z.agents || 20, T);
  for (const rc of Array.isArray(om.recyclage) ? om.recyclage.slice(0, 2) : []) {
    const type = rc && rc.type === 'saf' ? 'saf' : rc && rc.type === 'af' ? 'af' : null; if (!type) continue;
    const g = Math.max(1, Math.min(MAT.tti.groupesMax, Math.round(Number(rc.groupes) || 1))), n = g * MAT.tti.groupe;
    const mo = fonction(z, 'moniteurTTI'), stand = type === 'af' && z.infra && z.infra.tir;
    const cout = Math.round(g * MAT.tti[type].prix * (mo ? 0.5 : 1) * (stand ? 0.5 : 1) * 10) / 10;
    if (z.budget < cout) { L.push(`Recyclage ${MAT.tti[type].nom} refusé : budget insuffisant.`); continue; }
    z.budget -= cout; (z._compta ||= []).push({ k: 'materiel', l: `Recyclage ${MAT.tti[type].nom}`, v: -cout });
    const abs = stand ? Math.floor(g / 2) : g; // demi-journée par roulement : un agent absent par groupe de 4
    if (abs) (z.blesses ||= []).push({ n: abs, retour: T + 2, motif: 'recyclage TTI' });
    recycler(m, type, n, T + 1 + MAT.tti.validite + (mo ? 7 : 0));
    L.push(`Recyclage ${MAT.tti[type].nom} : ${n} agents demain${stand ? ' au stand de tir' : ''}${mo ? ` avec ${mo.prenom} ${mo.nom}` : ''} (${abs ? `${abs} absent${abs > 1 ? 's' : ''} demain, par roulement` : 'sans absence'}), à jour pour ${MAT.tti.validite + (mo ? 7 : 0)} jours.`);
  }
  // Livraisons.
  const rl = makeRng(`${state.seed}:s${state.season}:t${T}:livr:${z.uid}`);
  for (const c of m.commandes.filter((x) => x.arrive <= T)) {
    // Rupture chez le fournisseur : la centrale ou le marché annoncent un retard (une seule fois par commande).
    const pr = fonction(z, 'magasinier') ? 0 : MAT.retard[c.voie] || 0;
    if (!c.retard && pr && rl.chance(pr)) { c.retard = 1; c.arrive = T + MAT.retard.jours; L.push(`Retard de livraison : rupture de stock chez le fournisseur, ${ARTICLES[c.item].nom.toLowerCase()} attendus dans ${MAT.retard.jours} jours.`); continue; }
    livrer(z, m, c, T, L, rl);
    c.livre = true;
  }
  m.commandes = m.commandes.filter((x) => !x.livre);
  // Usure, péremptions, entretien.
  { const ry = (o && o.rythme) || 'normal', al = (o && o.alloc) || {}, ag = Math.max(1, z.agents || 1);
    const ut = MAT.tenue.usure * (ry === 'renforce' ? MAT.usure.renforce : ry === 'allege' ? MAT.usure.allege : 1);
    const terrain = Math.min(1, ((Number(al.intervention) || 0) + (Number(al.roulage) || 0) + (Number(al.proximite) || 0)) / ag);
    const uc = MAT.chaussures.usure * (0.5 + MAT.usure.terrain * terrain);
    m.usureJour = { tenue: Math.round(ut * 10) / 10, chaussures: Math.round(uc * 10) / 10 };
    m.tenue = Math.max(0, Math.round((m.tenue - ut) * 10) / 10); m.chaussures = Math.max(0, Math.round((m.chaussures - uc) * 10) / 10); }
  const perimes = (m.gilets || []).filter((g) => g.fin === T).reduce((s, g) => s + g.n, 0);
  if (perimes) L.push(`${perimes} gilets pare-balles arrivent en fin de validité ce soir.`);
  m.gilets = (m.gilets || []).filter((g) => g.fin > T - 10); // on garde les périmés quelques jours pour l'affichage
  const dc = (m.certifies || []).filter((c) => c.fin === T).reduce((s, c) => s + c.n, 0);
  if (dc) L.push(`${dc} agents perdent leur brevet taser ce soir : recyclage nécessaire.`);
  { const df = (m.brevetsFN || []).filter((c) => c.fin === T).reduce((s, c) => s + c.n, 0); if (df) L.push(`${df} agents perdent leur brevet FN 303 ce soir : recyclage nécessaire.`); }
  for (const type of ['af', 'saf']) { const e = ((m.tti && m.tti[type]) || []).filter((x) => x.fin === T).reduce((s, x) => s + x.n, 0); if (e) L.push(`${e} agents arrivent au terme de leur ${MAT.tti[type].nom} ce soir : recyclage à prévoir.`); }
  if (m.tti) for (const type of ['af', 'saf']) m.tti[type] = m.tti[type].filter((x) => x.fin > T - 10);
  // Coût de possession (audit des prix, oct. 2026) : licences et cartouches des tasers, munitions du FN 303, stockage des vidéos.
  // Si le budget ne suit pas, l'armement reste au râtelier ce jour-là (pas de dette).
  { const c = possession(m);
    if (c > 0) {
      if (z.budget >= c) { z.budget -= c; (z._compta ||= []).push({ k: 'materiel', l: 'Armurerie : licences, cartouches, stockage vidéo', v: -c }); delete m.rangeT; }
      else { m.rangeT = T + 1; L.push('Budget insuffisant pour l’armurerie (licences, cartouches, stockage) : tasers, FN 303 et bodycams restent au râtelier demain.'); }
    } }
  // Céder du matériel à une autre zone (son surplus seulement).
  for (const cd of Array.isArray(om.ceder) ? om.ceder.slice(0, 2) : []) { const t = ceder(state, z, cd, T); if (t) L.push(t); }
  // Inspection surprise.
  { const ri = makeRng(`${state.seed}:s${state.season}:t${T}:inspect:${z.uid}`);
    if (ri.chance(MAT.inspection.chance)) L.push(inspecter(z, T)); }
  // Effets.
  z.risqueMat = risqueMateriel(z, T);
  const n = Math.max(1, z.agents || 1), g = giletsValides(m, T);
  let dm = MAT.moralTenue.find(([s]) => m.tenue >= s)[1];
  dm += MAT.gilets.ajuste.moral * Math.min(1, g.ajustes / n);
  const trou = Math.max(0, n - g.total) / n;
  if (trou > 0.3) { dm += MAT.gilets.moralTrou; if (makeRng(`${state.seed}:s${state.season}:t${T}:syndic:${z.uid}`).chance(0.25)) L.push(`Les syndicats s’inquiètent : ${Math.round(trou * 100)} % des agents sans gilet valide.`); }
  z.moral += dm;
  const bc = auRatelier(m, T) ? 0 : Math.min(MAT.bodycam.max, Math.floor((m.bodycam || 0) / MAT.bodycam.lot));
  if (bc) z.satisfaction += MAT.bodycam.sat * bc;
  if (trouTTI(z, T, 'saf') > MAT.tti.seuilSAF) { z.satisfaction += MAT.tti.satSAF; }
  return L;
}

/** Options en plus sur l'appel du jour, ouvertes par le matériel. */
export function optionsMateriel(z, appel, T) {
  const m = z && z.materiel; if (!m) return [];
  const o = [];
  if (tasersActifs(m, T) && ['arme', 'fuite', 'foule'].includes(appel.ctx)) o.push({ app: 'force', label: 'Neutraliser au taser', p: 0.8, ok: { pts: 6 }, ko: { sat: -1 }, tOk: 'Neutralisé à distance, personne n’est blessé.', tKo: 'Le tir manque sa cible, la situation dégénère.', materiel: 'taser' });
  if (fnActifs(m, T) && ['arme', 'foule'].includes(appel.ctx)) o.push({ app: 'force', label: 'Tir FN 303 à distance', p: 0.78, ok: { pts: 6, sat: 1 }, ko: { sat: -2 }, tOk: 'Neutralisé à distance d’un tir précis, sans contact.', tKo: 'Le projectile manque, la situation dégénère.', materiel: 'fn303' });
  if ((m.gnep || 0) >= MAT.gnep.lot && appel.ctx === 'foule') o.push({ app: 'force', label: 'Cordon casqué', p: 0.78, ok: { pts: 5, sat: 1 }, ko: { sat: -1 }, tOk: 'Le cordon tient, la foule se disperse.', tKo: 'Le cordon cède sous la pression.', materiel: 'gnep' });
  return o;
}
/** Bonus de réussite des approches « procédure » avec des bodycams. */
export const bonusBodycam = (z, T) => (z && z.materiel && z.materiel.bodycam >= MAT.bodycam.lot && !auRatelier(z.materiel, T ?? z.materiel._T) ? MAT.bodycam.procedure : 0);

/** Gilets qui manqueront dans `jours` jours (en comptant les commandes en route). */
export function giletsAPrevoir(z, T, jours = 3) {
  const m = z.materiel; if (!m) return 0;
  const dans = (m.gilets || []).filter((g) => g.fin > T + jours).reduce((s, g) => s + g.n, 0);
  const enCmd = (m.commandes || []).filter((c) => c.item.startsWith('gilets')).reduce((s, c) => s + c.lots * MAT.gilets.lot, 0);
  return Math.max(0, (z.agents || 0) - dans - enCmd);
}
/** Ordres de matériel d'un robot : tenue avec la masse, gilets remplacés à temps (en adhérant à un marché ouvert s'il y en a un). */
export function ordresMaterielRobot(z, state) {
  const m = z.materiel; if (!m) return null;
  const T = state.turn, om = { masse: [], commandes: [], adherer: [] };
  if (m.tenue < 50 && m.masse >= MAT.tenue.cout) om.masse.push('tenue');
  else if (m.chaussures < 40 && m.masse >= MAT.chaussures.cout) om.masse.push('chaussures');
  const deja = (state.marches || []).some((x) => !x.clos && x.part[z.uid] && x.item.startsWith('gilets'));
  const manque = deja ? 0 : giletsAPrevoir(z, T, 4);
  if (manque > 0) {
    const lots = Math.min(MAT.lotsMax, Math.ceil(manque / MAT.gilets.lot));
    const mk = (state.marches || []).find((x) => !x.clos && x.ferme >= T && x.item.startsWith('gilets'));
    if (mk && giletsAPrevoir(z, T, 2) === 0) om.adherer.push({ id: mk.id, lots });
    else om.commandes.push({ item: 'gilets', lots, voie: giletsAPrevoir(z, T, 1) > 0 ? 'negociee' : 'centrale' });
  }
  // Recyclages TTI : les agents dont la qualification échoit dans 3 jours.
  if (m.tti) { om.recyclage = [];
    for (const type of ['af', 'saf']) { const manque = Math.max(0, (z.agents || 0) - ttiValides(m, T + 3, type)); if (manque > 0) om.recyclage.push({ type, groupes: Math.min(MAT.tti.groupesMax, Math.ceil(manque / MAT.tti.groupe)) }); } }
  // Casques et boucliers pour le non-droit, quand le budget le permet.
  if ((m.gnep || 0) < MAT.gnep.lot && z.budget > 15 && !(m.commandes || []).some((c) => c.item === 'gnep')) om.commandes.push({ item: 'gnep', lots: 1, voie: 'centrale' });
  // Céder des gilets en trop à une zone qui en manque.
  const sp = surplus(z, T).gilets;
  if (sp >= MAT.gilets.lot) {
    const cible = Object.values(state.zones || {}).filter((x) => x.uid !== z.uid && x.materiel && trouGilets(x, T) > MAT.gilets.refus).sort((a, b) => trouGilets(b, T) - trouGilets(a, T))[0];
    if (cible) om.ceder = [{ cible: cible.uid, item: 'gilets', n: Math.min(sp, Math.ceil(trouGilets(cible, T) * (cible.agents || 0))) }];
  }
  return om;
}

// ───── Matériel abîmé en intervention ─────
const DEGATS = {
  gilets: ['un gilet entaillé par un coup de couteau', 'un gilet déformé par un impact', 'un gilet arraché pendant une interpellation'],
  taser: ['un taser cassé dans la lutte', 'un taser tombé et écrasé'],
  fn303: ['un FN 303 endommagé dans la bousculade', 'le chargeur d’un FN 303 brisé'],
  bodycam: ['une bodycam arrachée pendant l’interpellation', 'une bodycam fendue dans la bousculade'],
  gnep: ['un casque fendu par un pavé', 'un bouclier brisé'],
};
/** Retire `n` objets abîmés (le gilet le plus ancien d'abord). Renvoie la phrase du rapport, ou ''. */
export function abimer(z, item, n, rng) {
  const m = z.materiel; if (!m || n <= 0) return '';
  let fait = 0;
  if (item === 'gilets') {
    for (const g of (m.gilets || []).slice().sort((a, b) => a.fin - b.fin)) { while (fait < n && g.n > 0 && g.fin > (m._T || 0)) { g.n--; fait++; } }
    m.gilets = (m.gilets || []).filter((g) => g.n > 0);
  } else { fait = Math.min(n, m[item] || 0); m[item] = (m[item] || 0) - fait; }
  if (!fait) return '';
  m.hs = (m.hs || 0) + fait;
  const l = DEGATS[item]; const quoi = l[Math.floor(rng.next() * l.length)];
  return fait > 1 ? `${fait} objets hors service, dont ${quoi}` : `${quoi[0].toUpperCase()}${quoi.slice(1)} : hors service`;
}
/**
 * Fin de soirée : les blessures de la journée (non-droit, rébellions, urgences) abîment aussi des gilets.
 * `avant` : nombre d'entrées dans z.blesses au début du tour.
 */
export function degatsDuSoir(state, z, T, avant) {
  if (!z.materiel || !Array.isArray(z.blesses)) return [];
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:degats:${z.uid}`), L = [];
  const nouveaux = z.blesses.slice(avant).filter((b) => !/brevet|certification|recyclage/.test(b.motif || '')).reduce((s, b) => s + (b.n || 0), 0);
  let g = 0; for (let i = 0; i < nouveaux; i++) if (rng.chance(0.5)) g++;
  const t = abimer(z, 'gilets', g, rng); if (t) L.push(`Magasin : ${t[0].toLowerCase()}${t.slice(1)} (blessés du jour).`);
  return L;
}

/** Surplus cédable : gilets au-delà des agents, tasers, bodycams, casques. */
export function surplus(z, T) {
  const m = z && z.materiel; if (!m) return { gilets: 0, taser: 0, bodycam: 0, gnep: 0 };
  return { gilets: Math.max(0, giletsValides(m, T).std - Math.max(0, (z.agents || 0) - giletsValides(m, T).ajustes)), taser: Math.max(0, (m.taser || 0) - tasersActifs(m, T)), fn303: Math.max(0, (m.fn303 || 0) - fnActifs(m, T)), bodycam: m.bodycam || 0, gnep: m.gnep || 0 };
}
/** Cède `n` objets à une autre zone. Le donneur gagne des PS (et de la réputation s'il comble un vrai manque). */
export function ceder(state, z, cd, T) {
  const cible = cd && state.zones[cd.cible], item = cd && cd.item;
  if (!cible || cible.uid === z.uid || !['gilets', 'taser', 'fn303', 'bodycam', 'gnep'].includes(item)) return '';
  const dispo = surplus(z, T)[item], n = Math.max(0, Math.min(dispo, Math.round(Number(cd.n) || 0), 20));
  if (!n) return '';
  if (!cible.materiel) cible.materiel = creerMateriel(cible, T);
  const m = z.materiel, mc = cible.materiel;
  const manquait = item === 'gilets' && trouGilets(cible, T) > MAT.gilets.refus;
  if (item === 'gilets') {
    let r = n;
    for (const g of m.gilets.filter((x) => x.fin > T && x.m !== 'ajuste').sort((a, b) => b.fin - a.fin)) { const k = Math.min(r, g.n); if (!k) continue; g.n -= k; r -= k; mc.gilets.push({ n: k, fin: g.fin, m: 'std', q: g.q || 'std' }); if (!r) break; }
    m.gilets = m.gilets.filter((g) => g.n > 0);
  } else { m[item] -= n; mc[item] = (mc[item] || 0) + n; }
  const ps = Math.min(MAT.ceder.psMax, Math.ceil(n / MAT.ceder.psPar));
  z._ps = (z._ps || 0) + ps; if (manquait) z.reputation += MAT.ceder.rep;
  const nom = ARTICLES[item].nom.toLowerCase();
  (cible.rapportMat ||= []).push(`${z.nom || 'Une zone voisine'} te cède ${n} ${nom}.`);
  return `Tu cèdes ${n} ${nom} à ${cible.nom || 'une zone voisine'} (+${ps} PS${manquait ? `, +${MAT.ceder.rep} de réputation : ses agents n’avaient plus de gilet` : ''}).`;
}
/** Inspection surprise du magasin : gilets périmés en service, masse d'habillement accumulée. */
export function inspecter(z, T) {
  const m = z.materiel, I = MAT.inspection, t = trouGilets(z, T), fautes = [];
  if (t > I.seuil) { z.budget -= I.amende; (z._compta ||= []).push({ k: 'materiel', l: 'Inspection : gilets non conformes', v: -I.amende }); z.reputation -= I.rep; fautes.push(`${Math.round(t * 100)} % d’agents sans gilet valide (${I.amende} k€ de mise en conformité, réputation −${I.rep})`); }
  if (m.tti && trouTTI(z, T, 'af') > 0.2) { z.reputation -= I.rep; fautes.push(`${Math.round(trouTTI(z, T, 'af') * 100)} % d’agents armés sans recyclage TTI avec arme à feu (réputation −${I.rep})`); }
  if (m.masse >= MAT.masse.max) { m.masse -= I.masse; fautes.push(`masse d’habillement accumulée sans être utilisée (${I.masse} points retirés)`); }
  m.inspection = { t: T, ok: !fautes.length };
  if (!fautes.length) { z.moral += I.moral; return `Inspection surprise du magasin : rien à signaler (moral +${I.moral}).`; }
  return `Inspection surprise du magasin : ${fautes.join(' ; ')}.`;
}
/** Recrues qui sortent de l'académie : un peu de masse pour leur tenue, et un rappel s'il manque des gilets. */
export function accueillirRecrues(z, n, T) {
  if (!z.materiel || !n) return null;
  const m = z.materiel; m.masse = Math.min(fonction(z, 'magasinier') ? 16 : MAT.masse.max, m.masse + MAT.masseRecrue * n);
  if (m.tti) for (const type of ['af', 'saf']) m.tti[type].push({ n, fin: T + MAT.tti.validite }); // sortie d'école : recyclages à jour
  const manque = Math.max(0, (z.agents || 0) - giletsValides(m, T).total);
  return manque ? `Magasin : ${manque} agent${manque > 1 ? 's' : ''} (dont tes recrues) sans gilet valide. Commande-les avant de les envoyer sur le terrain.` : null;
}
/** Non-droit : effet des casques et boucliers sur un engagement de `n` agents. */
export function effetCasquesND(z, n) {
  const g = (z && z.materiel && z.materiel.gnep) || 0, part = n > 0 ? Math.min(1, g / n) : 0;
  if (!z || !z.materiel || n <= 0) return { force: 1, risque: 1, part: 1 };
  return { force: 1 + MAT.nd.force * part, risque: (1 - MAT.nd.risque * part) * (part < 0.5 ? MAT.nd.malus : 1), part };
}
