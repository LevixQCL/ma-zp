// Vente aux enchères des saisies (saison 2, règles v2). Remplace la salle des ventes d'un lot par jour.
// Une vente tous les deux jours, trois lots (dont un gros lot qu'on peut acheter à deux zones liées par un pacte) :
//   jour 1 : enchères visibles (relances publiées sur la Radio, par paliers, quelques-unes par jour), expertise d'un lot
//            par un agent (le flair du chef décide de ce qu'il voit), tuyau du commissaire-priseur ;
//   jour 2 : une offre finale secrète par zone et par lot, dans les ordres ; coup de marteau à 20:00.
// Une offre visible engage : elle compte comme offre finale si la zone n'en dépose pas une plus haute.
// À offre égale, la négociation (Diplomatie) du chef départage, puis la réputation.
// Calibrage : test/saison2-sim.mjs (mode ventes).
import { LOTS, SERVICES, SERVICE_LABELS, NIVEAU_MAX } from './constants.js';
import { makeRng } from './rng.js';
import { round1, sousTutelle } from './zone.js';
import { ajouterVehicule } from './flotte.js';
import { niveauChef } from './chef.js';
import { pactesDe, pacteJoue } from './pactes.js';

/** Deux zones liées par un pacte (quel qu'il soit) qui joue ce soir. */
export const liees = (state, u, v, T = state.turn) => pactesDe(state, u).some((p) => (p.a === v || p.b === v) && pacteJoue(state, p, T));

export const VENTE = {
  nbLots: 3,
  pas: 0.5,               // palier minimal d'une relance (k€)
  relancesJour: 5,        // relances visibles comptées par zone et par jour
  max: 60,                // offre maximale (k€)
  bluffRep: 2,            // réputation perdue quand une relance publique n'est pas couverte au coup de marteau
  partMin: 0.4,           // gros lot à deux : chaque part doit atteindre 40 % de la mise à prix (audit du 9 octobre)
  expertise: { base: 0.5, parNiveau: 0.06 }, // chance de voir l'état exact selon le Flair du chef
  etats: { neuf: 0.25, use: 0.55, defectueux: 0.2 },
};
export const ETATS = {
  neuf: { nom: 'comme neuf', mult: 1.5 },
  use: { nom: 'usé', mult: 1 },
  defectueux: { nom: 'défectueux', mult: 0.5 },
};
// Lots dont l'état est caché (matériel, véhicules) : l'expertise a un sens.
const A_ETAT = new Set(['chien', 'drone', 'radar', 'analyse', 'banalise', 'gilets', 'helico', 'blinde']);
export const aEtat = (id) => A_ETAT.has(id);
const GROS = ['helico', 'blinde', 'cellulef'];

// Zone retirée de la partie : jamais de plantage du tour pour un nom.
const nomZone = (z) => (z ? `ZP ${z.code} ${z.nom}` : "une zone qui a quitté la partie");
const fmt = (v) => `${String(Math.round(v * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;

/** État caché d'un lot (déterministe : graine de la partie, vente, lot). */
export function etatLot(state, vente, k) {
  const l = vente.lots.find((x) => x.k === k);
  if (!l || !aEtat(l.id)) return null;
  const r = makeRng(`${state.seed}:vente:${vente.id}:${k}:etat`).next();
  return r < VENTE.etats.neuf ? 'neuf' : r < VENTE.etats.neuf + VENTE.etats.use ? 'use' : 'defectueux';
}

/** Ouvre la vente suivante si aucune n'est en cours (à la fin d'un calcul de tour). `T` : jour des enchères visibles. */
export function annoncerVente(state, T = state.turn) {
  if (state.vente && state.vente.cloture >= T) return state.vente;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:vente`);
  const recents = (state.lotsRecents || []).slice(-4);
  const petits = Object.keys(LOTS).filter((id) => !GROS.includes(id) && !recents.includes(id));
  const ch = rng.shuffle(petits).slice(0, VENTE.nbLots - 1);
  const gros = rng.pick(GROS.filter((id) => !recents.includes(id)).length ? GROS.filter((id) => !recents.includes(id)) : GROS);
  const ids = [...ch, gros];
  state.lotsRecents = [...recents, ...ids].slice(-6);
  const lots = ids.map((id, i) => ({ k: 'abc'[i], id, prixMin: Math.max(2, LOTS[id].prix + rng.int(-1, 1)), ...(GROS.includes(id) ? { gros: true } : {}) }));
  state.vente = { id: `v${state.season}-${T}`, ouverture: T, cloture: T + 1, lots, meneurs: {} };
  return state.vente;
}

/** Phase de la vente au jour T : 'visible' (jour 1), 'finale' (jour 2) ou null. */
export function phaseVente(state, T = state.turn) {
  const v = state.vente;
  if (!v) return null;
  return T === v.ouverture ? 'visible' : T === v.cloture ? 'finale' : null;
}

/**
 * Relances visibles valides (publiées sur la Radio pendant le jour 1) : au plus `relancesJour` par zone, chacune au moins
 * au palier au-dessus du meneur du moment. Retourne { meneurs: { k: { uid, montant } }, parZone: { uid: { k: montant } }, n: { k: nb } }.
 */
export function lireRelances(state, encheres) {
  const v = state.vente, meneurs = {}, parZone = {}, n = {}, compte = {};
  if (!v) return { meneurs, parZone, n };
  const l = (encheres || []).filter((e) => e && e.vente === v.id && v.lots.some((x) => x.k === e.lot) && Number.isFinite(Number(e.montant)) && state.zones[e.uid])
    .sort((a, b) => (a.at || 0) - (b.at || 0));
  for (const e of l) {
    if ((compte[e.uid] || 0) >= VENTE.relancesJour) continue;
    const lot = v.lots.find((x) => x.k === e.lot), m = round1(Math.min(VENTE.max, Number(e.montant)));
    const cur = meneurs[e.lot];
    if (m < lot.prixMin || (cur && m < cur.montant + VENTE.pas)) continue; // relance refusée : elle n'entame pas le quota
    // Une relance engage : la somme des relances d'une zone (une par lot, la dernière) ne dépasse jamais son budget.
    const engage = Object.entries(parZone[e.uid] || {}).reduce((t, [k, x]) => t + (k === e.lot ? 0 : x), 0) + m;
    if (engage > (Number(state.zones[e.uid].budget) || 0)) continue;
    compte[e.uid] = (compte[e.uid] || 0) + 1;
    meneurs[e.lot] = { uid: e.uid, montant: m };
    (parZone[e.uid] ||= {})[e.lot] = m;
    n[e.lot] = (n[e.lot] || 0) + 1;
  }
  return { meneurs, parZone, n };
}

/** Lecture sûre des choix de vente dans des ordres. */
export function lireOrdresVente(o) {
  const out = {};
  if (o && typeof o.expertise === 'string' && /^[abc]$/.test(o.expertise)) out.expertise = o.expertise;
  if (o && typeof o.tuyau === 'string' && /^[abc]$/.test(o.tuyau)) out.tuyau = o.tuyau;
  if (o && o.finales && typeof o.finales === 'object') {
    out.finales = {};
    for (const k of ['a', 'b', 'c']) {
      const f = o.finales[k];
      const m = Number(f && typeof f === 'object' ? f.montant : f);
      if (Number.isFinite(m) && m > 0) out.finales[k] = { montant: round1(Math.min(VENTE.max, m)), ...(f && typeof f.partenaire === 'string' ? { partenaire: f.partenaire } : {}) };
    }
  }
  return out;
}

/** Donne un lot (avec son état) à une zone. Renvoie le texte du rapport. */
function livrer(z, id, T, etat) {
  const lot = LOTS[id];
  const E = etat ? ETATS[etat] : null;
  if (lot.bonus) z.lots = [...(z.lots || []), { id, tour: T, ...(etat ? { etat } : {}) }];
  switch (lot.immediat) {
    case 'paperasse': z.paperasse = Math.max(0, z.paperasse - Math.round(6 * (E ? E.mult : 1))); break;
    case 'vehicule': { ajouterVehicule(z, 'anonyme', T); const v = (z.flotte || [])[z.flotte.length - 1]; if (v && etat === 'defectueux') v.u = 55; if (v && etat === 'use') v.u = Math.max(v.u || 0, 25); break; }
    case 'prevention': z.criminalite = Math.max(10, z.criminalite - 10); z.satisfaction += 4; break;
    case 'agents': z.agents += 2; z._nouveaux = (z._nouveaux || 0) + 2; break;
    case 'stage': {
      const s = SERVICES.filter((x) => z.niveaux[x] < NIVEAU_MAX).sort((a, b) => z.niveaux[a] - z.niveaux[b])[0];
      if (!s) return 'toutes tes formations sont déjà au maximum, le stage ne sert à rien';
      z.niveaux[s] += 1; return `${SERVICE_LABELS[s]} passe au niveau ${z.niveaux[s]}`;
    }
    case 'gilets':
      if (etat === 'defectueux') return 'le lot est défectueux : les gilets sont périmés, rien n’est utilisable';
      if (z.equip.intervention >= NIVEAU_MAX) return 'ton équipement d’Intervention était déjà au maximum';
      z.equip.intervention += 1; return `équipement de l’Intervention au niveau ${z.equip.intervention}`;
    default: break;
  }
  const effet = lot.effet.charAt(0).toLowerCase() + lot.effet.slice(1);
  return E && etat !== 'use' ? `${effet} (lot ${E.nom} : effet ${etat === 'neuf' ? 'renforcé de moitié' : 'réduit de moitié'})` : effet;
}

/**
 * Résolution du soir (avant la simulation des zones). `ordres` : ordres bruts des zones ; `encheres` : relances
 * publiées sur la Radio. Jour 1 : meneurs, expertises, tuyaux. Jour 2 : coup de marteau.
 * Renvoie un résumé pour la Gazette (ou null).
 */
export function venteResoudre(state, uids, ordres, encheres, push, T) {
  const v = state.vente;
  if (!v) return null;
  const ph = phaseVente(state, T);
  const O = Object.fromEntries(uids.map((u) => [u, lireOrdresVente(ordres[u])]));
  if (ph === 'visible') {
    const r = lireRelances(state, encheres);
    v.meneurs = r.meneurs; v.engagees = r.parZone; v.relances = r.n;
    const interet = {};
    for (const [u, m] of Object.entries(r.parZone)) for (const k of Object.keys(m)) (interet[k] ||= new Set()).add(u);
    for (const u of uids) {
      const z = state.zones[u], o = O[u];
      if (o.expertise) {
        const lot = v.lots.find((x) => x.k === o.expertise);
        (interet[o.expertise] ||= new Set()).add(u);
        const etat = etatLot(state, v, o.expertise);
        if (!etat) { z.rapport.push(`Expertise (${LOTS[lot.id].nom}) : rien à expertiser, ce lot n’a pas d’état caché. Ton agent reste au service.`); continue; }
        z.blesses.push({ n: 1, retour: T + 2, motif: 'expertise à la salle des ventes' });
        const chance = Math.min(0.98, VENTE.expertise.base + VENTE.expertise.parNiveau * niveauChef(z.chef, 'flair'));
        const vu = makeRng(`${state.seed}:${v.id}:exp:${u}`).chance(chance) ? `le lot est ${ETATS[etat].nom}` : `difficile à dire : ${etat === 'defectueux' ? 'usé ou défectueux' : etat === 'neuf' ? 'comme neuf ou usé' : 'usé, peut-être mieux, peut-être pire'}`;
        z.expertises = { ...(z.expertises || {}), [`${v.id}:${o.expertise}`]: vu };
        z.rapport.push(`Expertise (${LOTS[lot.id].nom}) : ton agent a passé la journée au dépôt. Verdict : ${vu}. Il est immobilisé demain.`);
        (z.cetteNuit ||= []).push({ ico: '🔍', t: `Expertise : ${LOTS[lot.id].nom}, ${vu}` });
      }
    }
    for (const u of uids) {
      const z = state.zones[u], o = O[u];
      if (o.tuyau && z.chef && !(z.tuyaux || []).includes(v.id)) {
        const lot = v.lots.find((x) => x.k === o.tuyau);
        const n = interet[o.tuyau] ? interet[o.tuyau].size - (interet[o.tuyau].has(u) ? 1 : 0) : 0;
        z.tuyaux = [...(z.tuyaux || []), v.id].slice(-4);
        z.rapport.push(`Tuyau du commissaire-priseur (${LOTS[lot.id].nom}) : ${n ? `${n} autre${n > 1 ? 's' : ''} zone${n > 1 ? 's s’y intéressent' : ' s’y intéresse'} (relance ou expertise)` : 'personne d’autre ne s’y intéresse pour l’instant'}.`);
      }
    }
    const txt = v.lots.map((l) => `${LOTS[l.id].nom} : ${r.meneurs[l.k] ? `${nomZone(state.zones[r.meneurs[l.k].uid])} mène à ${fmt(r.meneurs[l.k].montant)}` : 'aucune relance'}`).join(' · ');
    push(4, 'Salle des ventes', 'Enchères : dernier jour, offres finales secrètes', `${txt}. Demain à 20:00, coup de marteau : chaque zone dépose une seule offre finale, secrète.`);
    return { phase: 'visible', id: v.id };
  }
  if (ph !== 'finale') return null;
  // Coup de marteau.
  const res = { phase: 'finale', id: v.id, adjuges: [] };
  for (const lot of v.lots) {
    const L = LOTS[lot.id];
    const offres = [];
    for (const u of uids) {
      const z = state.zones[u];
      if (sousTutelle(z, T)) continue;
      const vis = (v.engagees && v.engagees[u] && v.engagees[u][lot.k]) || 0;
      const fin = O[u].finales && O[u].finales[lot.k];
      let m = Math.max(vis, fin ? fin.montant : 0);
      // Offre finale au-delà du budget : la relance visible, elle, reste valable si le budget la couvre.
      if (fin && fin.montant > z.budget && vis > 0 && vis <= z.budget) m = vis;
      if (m <= 0) continue;
      offres.push({ u, m, partenaire: lot.gros && fin && fin.partenaire && state.zones[fin.partenaire] ? fin.partenaire : null });
    }
    // Gros lot : deux zones liées par un pacte qui se désignent l'une l'autre mettent leurs offres en commun.
    const groupes = [], pris = new Set();
    for (const x of offres) {
      if (pris.has(x.u)) continue;
      const y = x.partenaire && offres.find((w) => w.u === x.partenaire && w.partenaire === x.u && !pris.has(w.u));
      const partOk = (w) => w.m >= VENTE.partMin * lot.prixMin - 1e-9;
      if (y && liees(state, x.u, y.u, T) && partOk(x) && partOk(y)) { groupes.push({ membres: [x, y], m: round1(x.m + y.m) }); pris.add(x.u); pris.add(y.u); }
      else if (y && liees(state, x.u, y.u, T)) {
        // Achat à deux refusé : une part trop petite. Chacun reste sur son offre propre.
        for (const w of [x, y]) state.zones[w.u].rapport.push(`Salle des ventes (${L.nom}) : achat à deux refusé, chaque part doit atteindre ${fmt(VENTE.partMin * lot.prixMin)} (40 % de la mise à prix). Ton offre compte seule.`);
        groupes.push({ membres: [x], m: x.m }); pris.add(x.u);
      }
      else { groupes.push({ membres: [x], m: x.m }); pris.add(x.u); }
    }
    const negoc = (g) => Math.max(...g.membres.map((x) => niveauChef(state.zones[x.u].chef, 'diplomatie')));
    const rep = (g) => Math.max(...g.membres.map((x) => state.zones[x.u].reputation));
    const tri = groupes.filter((g) => g.m >= lot.prixMin).sort((a, b) => (b.m - a.m) || (negoc(b) - negoc(a)) || (rep(b) - rep(a)) || (a.membres[0].u < b.membres[0].u ? -1 : 1));
    let gagnant = null;
    let ecartee = false;
    for (const g of tri) if (g.membres.every((x) => state.zones[x.u].budget >= x.m)) { gagnant = g; break; }
      else {
        ecartee = true;
        for (const x of g.membres) {
          const z = state.zones[x.u], vis = (v.engagees && v.engagees[x.u] && v.engagees[x.u][lot.k]) || 0;
          // Une relance publique non honorée fait mauvaise impression (pas de bluff gratuit).
          if (vis > 0 && z.budget < x.m) { z.reputation -= VENTE.bluffRep; z.rapport.push(`Salle des ventes (${L.nom}) : offre écartée, ton budget ne couvre pas ${fmt(x.m)}. Ta relance publique n’est pas honorée : −${VENTE.bluffRep} de réputation.`); }
          else z.rapport.push(`Salle des ventes (${L.nom}) : offre écartée, ton budget ne couvre pas ${fmt(x.m)}.`);
        }
      }
    const etat = etatLot(state, v, lot.k);
    if (!gagnant) {
      if (tri.length || offres.length) for (const x of offres) state.zones[x.u].rapport.push(`Salle des ventes : « ${L.nom} » n’est pas adjugé (mise à prix ${fmt(lot.prixMin)}).`);
      continue;
    }
    // Égalité réellement départagée (et pas une meilleure offre écartée faute de budget) : par la négociation ou la réputation.
    const autre = !ecartee && tri[0] === gagnant && tri[1] && tri[1].m === gagnant.m ? tri[1] : null;
    const egal = autre ? (negoc(gagnant) !== negoc(autre) ? 'la négociation de ton chef' : 'ta réputation') : null;
    const noms = gagnant.membres.map((x) => nomZone(state.zones[x.u])).join(' et ');
    for (const x of gagnant.membres) {
      const z = state.zones[x.u];
      z.budget = round1(z.budget - x.m);
      (z._compta ||= []).push({ k: 'enchere', l: `Salle des ventes : ${L.nom}`, v: -x.m });
      z.stats.encheres = (z.stats.encheres || 0) + 1;
      const quoi = livrer(z, lot.id, T, etat);
      z.rapport.push(`Adjugé ! « ${L.nom} »${gagnant.membres.length > 1 ? ` acheté avec ${nomZone(state.zones[gagnant.membres.find((w) => w.u !== x.u).u])} (ta part : ${fmt(x.m)})` : ` pour ${fmt(x.m)}`}${egal ? ` (à égalité : ${egal} a fait la différence)` : ''}${etat ? `. Le lot est ${ETATS[etat].nom}` : ''} : ${quoi}.`);
      (z.cetteNuit ||= []).push({ ico: '🔨', t: `Adjugé : ${L.nom}${etat ? ` (${ETATS[etat].nom})` : ''}` });
    }
    for (const x of offres) if (!gagnant.membres.some((w) => w.u === x.u)) {
      const z = state.zones[x.u];
      z.rapport.push(`Salle des ventes : « ${L.nom} » part chez ${noms} pour ${fmt(gagnant.m)} (ton offre : ${fmt(x.m)}). Rien n’est débité.`);
      (z.cetteNuit ||= []).push({ ico: '🔨', t: `${L.nom} : adjugé à ${noms}` });
    }
    res.adjuges.push({ k: lot.k, id: lot.id, nom: L.nom, uids: gagnant.membres.map((x) => x.u), montant: gagnant.m, offres: groupes.length, etat });
    push(lot.gros ? 7 : 5, 'Adjugé !', `${noms} ${gagnant.membres.length > 1 ? 'remportent' : 'remporte'} « ${L.nom} » pour ${fmt(gagnant.m)}`,
      `${groupes.length} offre${groupes.length > 1 ? 's' : ''}, mise à prix ${fmt(lot.prixMin)}.${etat ? ` Le lot était ${ETATS[etat].nom}.` : ''}${egal ? ` Égalité départagée par ${egal === 'ta réputation' ? 'la réputation' : 'la négociation'}.` : ''}`, gagnant.membres[0].u);
  }
  state.venteResultat = { ...res, tour: T };
  state.vente = null;
  return res;
}
