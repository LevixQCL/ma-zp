// Magasin et armurerie (oct. 2026, onglet Brigade › Matériel) : la dotation individuelle des agents.
// Tenue (polos, chaussures) payée avec la masse d'habillement, gilets pare-balles qui périment, armement collectif
// (taser, avec agents certifiés), bodycams, équipement de maintien de l'ordre. Trois façons d'acheter, comme une vraie zone :
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
  gilets: { lot: 5, prix: 3, validite: 28, perime: 1.35, refus: 0.3, coupRefus: 0.4, arrete: 0.7, ajuste: { prix: 4, risque: 0.85, moral: 0.3 }, moralTrou: -0.6 },
  taser: { lot: 1, prix: 2.5, cert: { agents: 2, prix: 1, validite: 14 }, max: 3, risque: 0.05 },
  bodycam: { lot: 3, prix: 2, entretien: 0.05, max: 3, sat: 0.15, procedure: 0.05 },
  gnep: { lot: 5, prix: 2.5 },
  voies: {
    centrale: { nom: 'Centrale d’achat fédérale', mult: 1, delai: 3 },
    negociee: { nom: 'Procédure négociée', mult: 1.4, delai: 1 },
  },
  lotsMax: 8,
  marche: { duree: 2, livraison: 2, base: 0.95, remiseParZone: 0.05, remiseMax: 0.25, psLanceur: 2 },
};
export const ARTICLES = {
  gilets: { nom: 'Gilets pare-balles', lot: MAT.gilets.lot, prix: MAT.gilets.prix },
  gilets_ajustes: { nom: 'Gilets ajustés (port discret)', lot: MAT.gilets.lot, prix: MAT.gilets.ajuste.prix },
  taser: { nom: 'Taser', lot: MAT.taser.lot, prix: MAT.taser.prix },
  bodycam: { nom: 'Bodycams', lot: MAT.bodycam.lot, prix: MAT.bodycam.prix },
  gnep: { nom: 'Casques et boucliers', lot: MAT.gnep.lot, prix: MAT.gnep.prix },
};

/** Dotation de départ : gilets pour tous, mais achetés à des dates différentes (un tiers périme dans la semaine). */
export function creerMateriel(z, T = 1) {
  const n = (z && z.agents) || 20, a = Math.ceil(n / 3);
  return {
    masse: 6, tenue: 60, chaussures: 70,
    gilets: [{ n: a, fin: T + 5, m: 'std' }, { n: a, fin: T + 16, m: 'std' }, { n: n - 2 * a, fin: T + 30, m: 'std' }],
    taser: 0, certifies: [], bodycam: 0, gnep: 0, commandes: [],
  };
}
export const mat = (z) => (z.materiel ||= creerMateriel(z, 1));
export const certifiesActifs = (m, T) => (m.certifies || []).filter((c) => c.fin > T).reduce((s, c) => s + c.n, 0);
export const tasersActifs = (m, T) => Math.min(MAT.taser.max, m.taser || 0, Math.floor(certifiesActifs(m, T) / 2));
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
  r *= 1 - MAT.taser.risque * tasersActifs(m, T);
  if (m.chaussures >= 50) r *= 0.97; else if (m.chaussures < 25) r *= 1.08;
  return r;
}

/** Part des agents sans gilet valide. */
export function trouGilets(z, T) { const m = z && z.materiel; if (!m) return 0; const n = Math.max(1, z.agents || 1); return Math.max(0, n - giletsValides(m, T).total) / n; }
/** Intervention : sans gilet valide, une partie des agents refuse les interventions à risque (au-delà de 30 % de trous). */
export const facteurGilets = (z, T) => { const t = trouGilets(z, T); return t > MAT.gilets.refus ? 1 - MAT.gilets.coupRefus * t : 1; };

/** Prix d'un marché selon le nombre de zones qui y ont adhéré (lanceur compris). */
export const prixMarche = (nZones) => MAT.marche.base * (1 - Math.min(MAT.marche.remiseMax, MAT.marche.remiseParZone * Math.max(0, nZones - 1)));

function livrer(z, m, c, T, lignes) {
  const a = ARTICLES[c.item], n = c.lots * a.lot;
  if (c.item === 'gilets' || c.item === 'gilets_ajustes') m.gilets.push({ n, fin: T + MAT.gilets.validite, m: c.item === 'gilets' ? 'std' : 'ajuste' });
  else m[c.item] = (m[c.item] || 0) + n;
  lignes.push(`Livraison : ${n} ${a.nom.toLowerCase()}${c.voie === 'marche' ? ' (marché groupé)' : ''}.`);
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
      const cout = Math.round(lots * a.prix * pm * 10) / 10;
      z.budget -= cout; (z._compta ||= []).push({ k: 'materiel', l: `Marché groupé : ${a.nom.toLowerCase()}`, v: -cout });
      m.commandes.push({ item: mk.item, lots, arrive: T + MAT.marche.livraison, voie: 'marche' });
      (z.rapportMat ||= []).push(`Marché ${a.nom.toLowerCase()} clos à ${zones.length} zone${zones.length > 1 ? 's' : ''} : ${Math.round((1 - pm) * 100)} % de remise, ${cout} k€, livraison dans ${MAT.marche.livraison} jours.`);
      if (u === mk.lanceur && zones.length > 1) z._ps = (z._ps || 0) + MAT.marche.psLanceur * (zones.length - 1);
    }
  }
  state.marches = (state.marches || []).filter((mk) => !mk.clos || mk.ferme >= T - 3);
}

/**
 * Le matériel d'une zone au tour de 20:00 : ordres (masse, commandes, marchés, certifications), livraisons, usure,
 * péremptions. Pose z.risqueMat (lu par risqueBlessure) et applique moral et satisfaction. Renvoie les lignes du rapport.
 */
export function materielDuTour(state, z, o, T) {
  fermerMarches(state, T);
  if (!z.materiel) z.materiel = creerMateriel(z, T);
  const m = mat(z), L = (z.rapportMat || []).splice(0), om = (o && o.materiel) || {};
  m._T = T; z._blessesAvant = (z.blesses || []).length;
  // Masse d'habillement.
  m.masse = Math.min(MAT.masse.max, m.masse + MAT.masse.parJour);
  for (const k of Array.isArray(om.masse) ? om.masse : []) {
    const c = MAT[k] && MAT[k].cout;
    if ((k === 'tenue' || k === 'chaussures') && m.masse >= c) { m.masse -= c; m[k] = 100; L.push(k === 'tenue' ? 'Masse d’habillement : polos et t-shirts neufs pour tout le monde.' : 'Masse d’habillement : chaussures d’intervention neuves.'); }
  }
  // Commandes directes.
  for (const c of Array.isArray(om.commandes) ? om.commandes.slice(0, 3) : []) {
    const a = ARTICLES[c && c.item], v = MAT.voies[c && c.voie], lots = Math.max(1, Math.min(MAT.lotsMax, Math.round(Number(c && c.lots) || 1)));
    if (!a || !v) continue;
    const cout = Math.round(lots * a.prix * v.mult * 10) / 10;
    if (z.budget < cout) { L.push(`Commande ${a.nom.toLowerCase()} refusée : budget insuffisant (${cout} k€).`); continue; }
    z.budget -= cout; (z._compta ||= []).push({ k: 'materiel', l: `${a.nom} (${v.nom.toLowerCase()})`, v: -cout });
    m.commandes.push({ item: c.item, lots, arrive: T + v.delai, voie: c.voie });
    L.push(`Commande : ${lots * a.lot} ${a.nom.toLowerCase()}, ${cout} k€, ${v.nom.toLowerCase()}, livraison dans ${v.delai} jour${v.delai > 1 ? 's' : ''}.`);
  }
  // Lancer un marché, adhérer à ceux des autres.
  const ms = (state.marches ||= []);
  if (om.lancer && ARTICLES[om.lancer.item] && !ms.some((x) => !x.clos && x.lanceur === z.uid)) {
    const id = `${state.season}-${T}-${z.uid}`;
    ms.push({ id, item: om.lancer.item, lanceur: z.uid, ouvert: T, ferme: T + MAT.marche.duree, part: { [z.uid]: Math.max(1, Math.min(MAT.lotsMax, Math.round(om.lancer.lots || 1))) } });
    L.push(`Marché lancé : ${ARTICLES[om.lancer.item].nom.toLowerCase()}. Les autres zones peuvent y adhérer pendant ${MAT.marche.duree} jours ; plus elles sont nombreuses, plus le prix baisse.`);
  }
  for (const ad of Array.isArray(om.adherer) ? om.adherer : []) {
    const mk = ms.find((x) => x.id === (ad && ad.id) && !x.clos && x.ferme >= T);
    if (mk && !mk.part[z.uid]) { mk.part[z.uid] = Math.max(1, Math.min(MAT.lotsMax, Math.round(ad.lots || 1))); L.push(`Adhésion au marché ${ARTICLES[mk.item].nom.toLowerCase()} de ${(state.zones[mk.lanceur] || {}).nom || 'une zone voisine'}.`); }
  }
  // Certification taser : 2 agents absents demain, 1 k€.
  if (om.certifier && (m.taser || 0) > 0 && z.budget >= MAT.taser.cert.prix) {
    z.budget -= MAT.taser.cert.prix; (z._compta ||= []).push({ k: 'materiel', l: 'Certification taser', v: -MAT.taser.cert.prix });
    m.certifies.push({ n: MAT.taser.cert.agents, fin: T + 1 + MAT.taser.cert.validite });
    (z.blesses ||= []).push({ n: MAT.taser.cert.agents, retour: T + 2, motif: 'certification taser' });
    L.push(`Certification taser : ${MAT.taser.cert.agents} agents en formation demain, certifiés pour ${MAT.taser.cert.validite} jours.`);
  }
  // Livraisons.
  for (const c of m.commandes.filter((x) => x.arrive <= T)) livrer(z, m, c, T, L);
  m.commandes = m.commandes.filter((x) => x.arrive > T);
  // Usure, péremptions, entretien.
  m.tenue = Math.max(0, m.tenue - MAT.tenue.usure); m.chaussures = Math.max(0, m.chaussures - MAT.chaussures.usure);
  const perimes = (m.gilets || []).filter((g) => g.fin === T).reduce((s, g) => s + g.n, 0);
  if (perimes) L.push(`${perimes} gilets pare-balles arrivent en fin de validité ce soir.`);
  m.gilets = (m.gilets || []).filter((g) => g.fin > T - 10); // on garde les périmés quelques jours pour l'affichage
  const dc = (m.certifies || []).filter((c) => c.fin === T).reduce((s, c) => s + c.n, 0);
  if (dc) L.push(`${dc} certifications taser expirent : recyclage nécessaire.`);
  if (m.bodycam) { const e = Math.round(Math.ceil(m.bodycam / MAT.bodycam.lot) * MAT.bodycam.entretien * 100) / 100; z.budget -= e; (z._compta ||= []).push({ k: 'materiel', l: 'Maintenance des bodycams', v: -e }); }
  // Effets.
  z.risqueMat = risqueMateriel(z, T);
  const n = Math.max(1, z.agents || 1), g = giletsValides(m, T);
  let dm = MAT.moralTenue.find(([s]) => m.tenue >= s)[1];
  dm += MAT.gilets.ajuste.moral * Math.min(1, g.ajustes / n);
  const trou = Math.max(0, n - g.total) / n;
  if (trou > 0.3) { dm += MAT.gilets.moralTrou; if (makeRng(`${state.seed}:s${state.season}:t${T}:syndic:${z.uid}`).chance(0.25)) L.push(`Les syndicats s’inquiètent : ${Math.round(trou * 100)} % des agents sans gilet valide.`); }
  z.moral += dm;
  const bc = Math.min(MAT.bodycam.max, Math.floor((m.bodycam || 0) / MAT.bodycam.lot));
  if (bc) z.satisfaction += MAT.bodycam.sat * bc;
  return L;
}

/** Options en plus sur l'appel du jour, ouvertes par le matériel. */
export function optionsMateriel(z, appel, T) {
  const m = z && z.materiel; if (!m) return [];
  const o = [];
  if (tasersActifs(m, T) && ['arme', 'fuite', 'foule'].includes(appel.ctx)) o.push({ app: 'force', label: 'Neutraliser au taser', p: 0.8, ok: { pts: 6 }, ko: { sat: -1 }, tOk: 'Neutralisé à distance, personne n’est blessé.', tKo: 'Le tir manque sa cible, la situation dégénère.', materiel: 'taser' });
  if ((m.gnep || 0) >= MAT.gnep.lot && appel.ctx === 'foule') o.push({ app: 'force', label: 'Cordon casqué', p: 0.78, ok: { pts: 5, sat: 1 }, ko: { sat: -1 }, tOk: 'Le cordon tient, la foule se disperse.', tKo: 'Le cordon cède sous la pression.', materiel: 'gnep' });
  return o;
}
/** Bonus de réussite des approches « procédure » avec des bodycams. */
export const bonusBodycam = (z) => (z && z.materiel && z.materiel.bodycam >= MAT.bodycam.lot ? MAT.bodycam.procedure : 0);

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
  return om;
}

// ───── Matériel abîmé en intervention ─────
const DEGATS = {
  gilets: ['un gilet entaillé par un coup de couteau', 'un gilet déformé par un impact', 'un gilet arraché pendant une interpellation'],
  taser: ['un taser cassé dans la lutte', 'un taser tombé et écrasé'],
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
  const nouveaux = z.blesses.slice(avant).filter((b) => !/certification/.test(b.motif || '')).reduce((s, b) => s + (b.n || 0), 0);
  let g = 0; for (let i = 0; i < nouveaux; i++) if (rng.chance(0.5)) g++;
  const t = abimer(z, 'gilets', g, rng); if (t) L.push(`Magasin : ${t[0].toLowerCase()}${t.slice(1)} (blessés du jour).`);
  return L;
}
