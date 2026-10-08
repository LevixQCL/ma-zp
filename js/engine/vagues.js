// Vagues de délinquance : la criminalité se déplace d'une zone à l'autre.
//
// Une zone nettement plus forte que le district dans un domaine (au moins VAGUES.seuil fois la médiane
// des capacités) en chasse la délinquance. Elle repart, la nuit, vers une zone voisine, et frappe
// le lendemain soir là où cette voisine est la plus faible.
// - Annoncée le matin (Gazette sans nom d'auteur, encart sur l'HP de la zone visée) : on peut s'y préparer.
// - Le soir : si la zone visée couvre ce domaine au moins à la hauteur de la médiane, elle absorbe la
//   vague et en tire des interpellations ; sinon elle en subit les effets dans ce domaine.
// Garde-fous : une seule vague reçue par zone et par nuit, une seule envoyée ; rien vers les zones
// arrivées depuis moins de VAGUES.protectionNouveaux tours ni vers celles sans ordres depuis 2 tours.

import { talent, TALENT } from './chef.js';
import { REGLES, forceDoctrine } from './constants.js';
import { carteQuartiers, assurerQuartiers } from './quartiers.js';
import { clamp, round1 } from './zone.js';

export const VAGUES = {
  actif: true,
  seuil: 1.75,            // capacité ≥ 1,75 × la médiane du district pour chasser la délinquance
  capMin: 5,              // et au moins 5 unités de capacité dans le domaine
  repos: 2,               // une zone n'envoie qu'une vague toutes les 2 nuits
  forceMax: 3,
  absorbe: 1.0,           // la zone visée doit atteindre la médiane (× force : 1 → 1, 2 → 1,1, 3 → 1,2)
  absorbeParForce: 0.1,
  protectionNouveaux: 3,  // tours
  // Gains d'une vague absorbée (par niveau de force).
  gain: { points: 4, ps: 5, moral: 2, satisfaction: 2 },
  // Effets d'une vague subie (par niveau de force).
  effet: { incidents: 2, tension: 8, dossier: 3, roulageSatisf: 3, paperasse: 3 },
};

/** Domaines où la délinquance peut se déplacer (l'Accueil n'en chasse pas, mais peut être visé). */
export const DOMAINES_POUSSE = ['intervention', 'proximite', 'recherche', 'roulage'];
export const DOMAINES_CIBLE = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];

export const VAGUE_TXT = {
  intervention: { nom: 'violences et bagarres', court: 'Intervention', depart: 'des bandes quittent le secteur', effet: 'incidents en plus ce soir' },
  proximite: { nom: 'deal et incivilités', court: 'Proximité', depart: 'un point de deal se déplace', effet: 'tension dans un quartier frontalier' },
  recherche: { nom: 'cambriolages en série', court: 'Recherche', depart: 'une équipe de cambrioleurs change de terrain', effet: 'un dossier local en plus' },
  roulage: { nom: 'rodéos et excès de vitesse', court: 'Roulage', depart: 'les rodéos changent de circuit', effet: 'accidents, satisfaction en baisse' },
  admin: { nom: 'plaintes en cascade', court: 'Accueil', depart: 'les plaignants changent de commissariat', effet: 'paperasse en plus' },
};

const mediane = (v) => { const s = v.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return 0; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Zones voisines (au moins un quartier en commun) et le quartier frontalier de chaque côté. */
export function zonesVoisines(state, uid) {
  const c = carteQuartiers(state);
  const out = {};
  for (const ca of c.deZone[uid] || []) for (const nb of c.adj[ca] || []) {
    const p = c.proprio(nb);
    if (p && p !== uid && state.zones[p] && !out[p]) out[p] = { chezMoi: ca, chezLui: nb };
  }
  return out;
}

/** Une zone peut-elle recevoir une vague ? (protection des nouveaux et des absents) */
export function peutRecevoir(z, T) {
  return !!z && (z.joinedTurn || 0) + VAGUES.protectionNouveaux <= T && (z.toursSansOrdres || 0) < 2;
}

/** Seuil de capacité à atteindre pour absorber une vague de cette force. */
export function seuilAbsorption(v) {
  return round1((v.ref || 0) * (VAGUES.absorbe + VAGUES.absorbeParForce * ((v.force || 1) - 1)));
}

/** Vague attendue ce soir pour la zone (ou null). */
export function vagueVisee(state, uid, T = state.turn) {
  const l = (state.vagues && state.vagues.liste) || [];
  return l.find((v) => v.vers === uid && v.tour === T) || null;
}

/**
 * Pendant la simulation de la zone visée, une fois ses capacités connues.
 * Modifie la situation du jour `pr` (incidents) et la zone ; renvoie les lignes de rapport.
 */
export function appliquerVague(state, z, v, cap, { T, zoneLabel, push }) {
  if (!v) return null;
  const d = v.domaine, f = v.force || 1, txt = VAGUE_TXT[d];
  const seuil = seuilAbsorption(v);
  const c = cap[d] || 0;
  const c2 = carteQuartiers(state);
  const lieu = v.cell != null ? c2.nomDe(Number(v.cell)) : 'la frontière';
  z.stats.vaguesRecues = (z.stats.vaguesRecues || 0) + 1;
  const res = { absorbee: c >= seuil, domaine: d, force: f };
  if (res.absorbee) {
    const pts = VAGUES.gain.points * f, ps = VAGUES.gain.ps * f, mo = VAGUES.gain.moral * f;
    const sa = VAGUES.gain.satisfaction * f;
    z._points += pts; z._ps += ps; z.moral += mo; z.satisfaction += sa;
    z.stats.vaguesAbsorbees = (z.stats.vaguesAbsorbees || 0) + 1;
    z.rapport.push(`Vague absorbée à ${lieu} (${txt.nom}, force ${f}) : ton ${txt.court} était prêt (${Math.round(c * 10) / 10} pour ${seuil} requis). Interpellations : +${pts} pts, +${ps} PS, +${mo} de moral, +${sa} de satisfaction.`);
    push(4, 'Vague brisée', `${zoneLabel(z)} brise la vague de ${txt.nom} à ${lieu}`, `La délinquance chassée d’une zone voisine s’est heurtée à un dispositif prêt.`, z.uid);
  } else {
    const e = VAGUES.effet;
    let effet = '';
    if (d === 'intervention') { res.incidents = e.incidents * f; effet = `+${res.incidents} incident${res.incidents > 1 ? 's' : ''} ce soir`; }
    if (d === 'proximite') {
      const q = assurerQuartiers(state, z);
      const k = v.cell != null && String(v.cell) in q ? String(v.cell) : Object.keys(q)[0];
      if (k != null) { q[k] = clamp(q[k] + e.tension * f, 10, 95); z.criminalite = round1(Object.values(q).reduce((s, x) => s + x, 0) / Object.keys(q).length); }
      effet = `tension +${e.tension * f} à ${lieu}`;
    }
    if (d === 'recherche') {
      const reste = e.dossier * f + 1;
      z.dossiers.push({ id: ++z.dossierSeq, titre: 'Cambriolages venus d’ailleurs', reste, total: reste, points: round1(reste * 0.75), age: 0 });
      effet = `un dossier de ${reste} unités en plus`;
    }
    if (d === 'roulage') { const s = e.roulageSatisf * f; z.satisfaction -= s; effet = `−${String(s).replace('.', ',')} de satisfaction (accidents)`; }
    if (d === 'admin') { z.paperasse += e.paperasse * f; effet = `+${e.paperasse * f} dossiers de paperasse`; }
    z.rapport.push(`Vague subie à ${lieu} (${txt.nom}, force ${f}) : ton ${txt.court} n’a pas suivi (${Math.round(c * 10) / 10} pour ${seuil} requis), ${effet}.`);
  }
  v.resultat = res.absorbee ? 'absorbee' : 'subie';
  return res;
}

/**
 * Après la simulation de toutes les zones : qui chasse la délinquance, vers qui elle part demain.
 * `caps` : { uid: { service: capacité } } des zones qui ont joué ce soir.
 */
export function vaguesNuit(state, uids, caps, T, { zoneLabel, push }) {
  const anciennes = ((state.vagues && state.vagues.liste) || []).filter((v) => v.tour === T);
  const bilan = anciennes.map((v) => ({ de: v.de, vers: v.vers, domaine: v.domaine, force: v.force, resultat: v.resultat || 'perdue' }));
  if (!VAGUES.actif) { state.vagues = { liste: [], ref: {}, bilan }; return; }
  const actifs = uids.filter((u) => caps[u] && state.zones[u]);
  const ref = {};
  for (const d of DOMAINES_CIBLE) ref[d] = round1(mediane(actifs.map((u) => caps[u][d] || 0)));
  const liste = [];
  const recues = new Set();
  // Les plus grands écarts d'abord : ce sont eux qui chassent le plus fort.
  const candidats = [];
  for (const u of actifs) {
    const ve = state.zones[u].vagueEnvoyee;
    if (ve && ve.tour > T - VAGUES.repos) continue;
    let best = null;
    for (const d of DOMAINES_POUSSE) {
      const c = caps[u][d] || 0;
      if (!ref[d] || c < VAGUES.capMin) continue;
      const r = c / ref[d];
      if (r >= VAGUES.seuil && (!best || r > best.r)) best = { d, r };
    }
    if (best) candidats.push({ u, ...best });
  }
  candidats.sort((a, b) => b.r - a.r || (a.u < b.u ? -1 : 1));
  for (const cd of candidats) {
    const force = clamp(1 + Math.floor((cd.r - VAGUES.seuil) / 0.6), 1, VAGUES.forceMax);
    const vois = zonesVoisines(state, cd.u);
    // La délinquance va là où on l'attend le moins : la voisine la plus faible (dans son point le plus faible).
    const cibles = Object.entries(vois).filter(([p]) => !recues.has(p) && caps[p] && peutRecevoir(state.zones[p], T + 1)).map(([p, fr]) => {
      let dom = null, rmin = Infinity;
      for (const d of DOMAINES_CIBLE) { const r = ref[d] ? (caps[p][d] || 0) / ref[d] : 1; if (r < rmin) { rmin = r; dom = d; } }
      return { p, fr, dom, rmin };
    }).sort((a, b) => a.rmin - b.rmin || (a.p < b.p ? -1 : 1));
    const z = state.zones[cd.u];
    z.stats.vaguesEnvoyees = (z.stats.vaguesEnvoyees || 0) + 1;
    if (!cibles.length) { z.vagueEnvoyee = { tour: T, domaine: cd.d, vers: null }; continue; }
    const t = cibles[0];
    recues.add(t.p);
    // Doctrine « De quartier » chez la zone visée : la vague arrive atténuée de moitié (au moins 1).
    const fv0 = state.zones[t.p] && state.zones[t.p].doctrine === 'quartier' ? Math.max(1, Math.round(force * forceDoctrine(state.zones[t.p], 'vagues'))) : force;
    // Talent « Médiateur » (saison 2) : −25 % de plus, sans descendre sous 1.
    const fv = talent(state.zones[t.p], 'mediateur') ? Math.max(1, Math.round(fv0 * TALENT.mediateur.vagues)) : fv0;
    const v = { de: cd.u, vers: t.p, origine: cd.d, domaine: t.dom, force: fv, cell: t.fr.chezLui, depuis: t.fr.chezMoi, ref: ref[t.dom], tour: T + 1 };
    liste.push(v);
    z.vagueEnvoyee = { tour: T, domaine: cd.d, vers: t.p, force };
    // Règles v2 : la zone qui fait fuir la délinquance y gagne aussi (PS et une ligne dans la Gazette).
    if (REGLES.v2) { z.ps = (z.ps || 0) + 5; z.rapport.push('Vague envoyée : +5 PS, ton efficacité se remarque dans tout le district.'); }
    z.rapport.push(`Ton ${VAGUE_TXT[cd.d].court} écrase la concurrence (${Math.round(cd.r * 10) / 10} × la médiane du district) : ${VAGUE_TXT[cd.d].depart} et part vers une zone voisine.`);
    const c = carteQuartiers(state);
    push(3 + force, 'Vague de délinquance', `${c.nomDe(Number(t.fr.chezLui))} : ${VAGUE_TXT[t.dom].nom} attendus ce soir`, `Chassée d’une zone voisine, la délinquance se replie vers ${c.nomDe(Number(t.fr.chezLui))}. ${REGLES.v2 ? `C’est l’efficacité de ${z.nom} qui l’a fait fuir.` : 'Qui l’a fait fuir ?'}`, t.p);
  }
  state.vagues = { liste, ref, bilan };
}
