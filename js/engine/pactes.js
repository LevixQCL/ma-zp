// Pactes entre zones et défis amicaux (remplacent les duels, les manœuvres et l'entraide libre).
//
// Un pacte lie deux zones pendant PACTE.duree tours. On le propose un soir, l'autre répond le lendemain.
//  · Jumelage terrain : +20 % de force les soirs où les deux zones sont sur le même secteur de la zone de non-droit,
//    indemnité fédérale doublée pour les renforts prêtés de l'une à l'autre.
//  · Pacte d'enquête : un soir sur deux, une pièce que ni l'une ni l'autre n'a est coupée en deux : l'une sait sur
//    qui ou sur quoi elle porte, l'autre ce qu'elle dit. Si les deux la mettent en commun, elles l'ont en entier.
//    Calibrage : une pièce entière chaque soir faisait passer les affaires résolues au jour 5 de 17 % à 46 % (modèle
//    simplifié) ; une demi-pièce un soir sur deux, à mettre en commun : de 8 % à 12 % avec 2 paires sur 10 zones et
//    15 % si tout le monde est lié (test/pactes-sim.mjs). Les zones liées identifient un peu plus souvent l'auteur.
//  · Centrale d'achat : formations et équipement −15 % pour les deux.
// Aucun pacte ne déplace l'IPZ moyen de plus d'un demi-point sur une saison (test/pactes-sim.mjs) : c'est un coup de
// pouce, pas un passage obligé.
// Un partenaire qui ne joue plus éteint le pacte sans pénalité. Rompre un pacte est public et bloque quelques tours.
//
// Défi amical : trois tours sur une activité que le joueur fait lui-même ; chacun mise la même somme, le gagnant
// prend le pot et le district ajoute une prime. Refuser n'a aucune conséquence.
import { makeRng } from './rng.js';
import { affaire, piecesLibres, faitsConnus, titrePiece, texteFait, dossierDe } from './enquete.js';
import { enDifficulte } from './zone.js';

export const absT = (state, T = state.turn) => (state.season - 1) * 100 + T;
const nomZone = (z) => `ZP ${z.code} ${z.nom}`;

export const PACTES = {
  terrain: {
    nom: 'Jumelage terrain', icone: 'terrain',
    court: 'Non-droit ensemble : +20 % de force · renforts entre vous payés double',
    texte: 'Les soirs où vous êtes tous les deux sur le même secteur de la zone de non-droit : +20 % de force chacun. Les renforts prêtés de l’un à l’autre rapportent une indemnité fédérale double.',
  },
  enquete: {
    nom: 'Pacte d’enquête', icone: 'enquete',
    court: 'Un soir sur deux, une demi-pièce chacun, à mettre en commun',
    texte: 'Un soir sur deux, une nouvelle pièce est coupée en deux : l’un sait sur qui elle porte, l’autre ce qu’elle dit. Mettez-la en commun le lendemain pour l’avoir en entier, tous les deux.',
  },
  achat: {
    nom: 'Centrale d’achat', icone: 'achat',
    court: 'Formations et équipement −15 % pour vous deux',
    texte: 'Vous achetez ensemble : formations et équipement (véhicules compris) coûtent 15 % de moins à chacun.',
  },
};
export const PACTE = { duree: 7, max: 2, inactif: 2, blocage: 3, ndBonus: 0.2, indemnite: 2, remise: 0.15, fragTous: 2, psAccord: 5, psFin: 10 };

export const DEFI_INDICATEURS = {
  incidents: { nom: 'Incidents réussis', court: 'incidents', mesure: (z) => (z.stats && z.stats.incidentsOk) || 0 },
  enigmes: { nom: 'Énigmes réussies', court: 'énigmes', mesure: (z) => (z.stats && z.stats.quetesOk) || 0 },
  dossiers: { nom: 'Dossiers locaux résolus', court: 'dossiers', mesure: (z) => (z.stats && z.stats.dossiersResolus) || 0 },
};
export const DEFI = { duree: 3, mises: [0, 3, 5], prime: 2 };

// ───── Lecture (partagée avec l'interface) ─────

/** Pactes qui concernent cette zone (proposés ou actifs). */
export const pactesDe = (state, uid) => (state.pactes || []).filter((p) => p.a === uid || p.b === uid);
export const partenaire = (p, uid) => (p.a === uid ? p.b : p.a);
/** Le pacte joue-t-il ce soir (tour T) ? Actif à partir du soir qui suit l'accord. */
export const pacteJoue = (state, p, T = state.turn) => p.etape === 'actif' && absT(state, T) > p.debut && absT(state, T) <= p.fin;
/** Tours restants (ce soir compris). */
export const toursRestants = (state, p, T = state.turn) => Math.max(0, p.fin - absT(state, T) + 1);
/** Les deux zones ont-elles ce type de pacte actif ce soir ? */
export function lies(state, u, v, type, T = state.turn) {
  return (state.pactes || []).some((p) => p.type === type && ((p.a === u && p.b === v) || (p.a === v && p.b === u)) && pacteJoue(state, p, T));
}
/** Remise sur les achats pour cette zone ce soir. */
export const remiseAchat = (state, uid, T = state.turn) => (pactesDe(state, uid).some((p) => p.type === 'achat' && pacteJoue(state, p, T)) ? PACTE.remise : 0);

/** Raison pour laquelle `uid` ne peut pas proposer de pacte à `cible` (null si possible). */
export function pacteImpossible(state, uid, cible, T = state.turn) {
  const z = state.zones[uid], c = state.zones[cible];
  if (!z || !c || uid === cible) return 'zone inconnue';
  if ((z.pacteBloque || 0) >= absT(state, T)) return 'pacte rompu récemment';
  if (pactesDe(state, uid).length >= PACTE.max) return `déjà ${PACTE.max} pactes`;
  if (pactesDe(state, cible).length >= PACTE.max) return `elle a déjà ${PACTE.max} pactes`;
  if (pactesDe(state, uid).some((p) => partenaire(p, uid) === cible)) return 'déjà liée';
  if ((c.toursSansOrdres || 0) >= PACTE.inactif) return 'inactive';
  return null;
}
/** Raison pour laquelle on ne peut pas lancer de défi à cette zone (null si possible). */
export function defiImpossible(state, uid, cible) {
  const z = state.zones[uid], c = state.zones[cible];
  if (!z || !c || uid === cible) return 'zone inconnue';
  if (enDefi(state, uid)) return 'tu as déjà un défi';
  if (enDefi(state, cible)) return 'déjà en défi';
  if (enDifficulte(z)) return 'ta zone est en difficulté';
  if (enDifficulte(c)) return 'en difficulté';
  if ((c.toursSansOrdres || 0) >= PACTE.inactif) return 'inactive';
  return null;
}
export const enDefi = (state, uid) => (state.defis || []).some((d) => d.a === uid || d.b === uid);

/**
 * Les deux moitiés d'une pièce : la première dit sur qui ou sur quoi elle porte (le titre), la seconde ce qu'elle dit
 * (le texte, noms du suspect masqués). Ni l'une ni l'autre ne sert seule.
 */
export function moitiesPiece(aff, f) {
  const titre = titrePiece(aff, f) || 'Pièce du dossier';
  let texte = texteFait(aff, f) || 'Le reste du procès-verbal.';
  const [, x] = String(f).split(':');
  const s = aff.suspects && aff.suspects[Number(x)];
  if (s && s.nom) {
    for (const part of [s.nom, ...s.nom.split(' ').filter((w) => w.length > 3)]) texte = texte.split(part).join('█████');
  }
  const cat = titre.split(' · ')[0];
  return { haut: { titre, texte: `${cat} : la suite du PV est chez ton partenaire.` }, bas: { titre: 'En-tête arraché', texte } };
}

// ───── Résolution ─────

function rapport(z, t) { if (z) z.rapport.push(t); }

/**
 * Avant la simulation des zones : réponses aux pactes, ruptures, propositions, mises en commun, défis.
 * `ord[u]` : { pacte: { cible, type }, pacteReponse: { id, accepte }, pacteRompre: id, fragment: id,
 *             defi: { cible, ind, mise }, defiReponse: { id, accepte } }
 */
export function pactesPre(state, uids, ord, push, T) {
  state.pactes = state.pactes || [];
  state.defis = state.defis || [];
  const A = absT(state, T);
  const Z = state.zones;

  // 1. Pactes : extinction (partenaire inactif ou parti), réponses, ruptures.
  for (const p of state.pactes) {
    if (!Z[p.a] || !Z[p.b]) { p.fini = true; continue; }
    if (p.etape === 'propose' && p.tourReponse === T) {
      const r = ord[p.b] && ord[p.b].pacteReponse;
      if (r && r.id === p.id && r.accepte) {
        p.etape = 'actif'; p.debut = A; p.fin = A + PACTE.duree; p.depuis = T;
        for (const [u, v] of [[p.a, p.b], [p.b, p.a]]) {
          const z = Z[u];
          z.stats.pactes = (z.stats.pactes || 0) + 1;
          z._psEntraide = (z._psEntraide || 0) + PACTE.psAccord;
          if (enDifficulte(Z[v])) z.stats.sauvetages = (z.stats.sauvetages || 0) + 1;
          rapport(z, `Pacte : ${PACTES[p.type].nom.toLowerCase()} conclu avec ${nomZone(Z[v])} pour ${PACTE.duree} tours, à partir de demain (+${PACTE.psAccord} PS).`);
        }
        push(6, 'Pacte', `${nomZone(Z[p.a])} et ${nomZone(Z[p.b])} signent un ${PACTES[p.type].nom.toLowerCase()}`, `${PACTES[p.type].court}. Pour ${PACTE.duree} tours.`);
      } else {
        p.fini = true;
        rapport(Z[p.a], `Pacte : ${nomZone(Z[p.b])} n’a pas donné suite à ton ${PACTES[p.type].nom.toLowerCase()}.`);
      }
      continue;
    }
    if (p.etape === 'propose' && p.tourReponse < T) { p.fini = true; continue; }
    if (p.etape !== 'actif') continue;
    // Rupture (une des deux zones).
    const rompt = [p.a, p.b].find((u) => ord[u] && ord[u].pacteRompre === p.id);
    if (rompt) {
      const z = Z[rompt], autre = Z[partenaire(p, rompt)];
      p.fini = true;
      z.stats.pactesRompus = (z.stats.pactesRompus || 0) + 1;
      z.ruptures = [...(z.ruptures || []).filter((t) => A - t < 7), A];
      z.pacteBloque = A + PACTE.blocage;
      rapport(z, `Pacte : tu romps ton ${PACTES[p.type].nom.toLowerCase()} avec ${nomZone(autre)}. Pas de nouveau pacte pendant ${PACTE.blocage} tours.`);
      rapport(autre, `Pacte : ${nomZone(z)} rompt votre ${PACTES[p.type].nom.toLowerCase()}.`);
      push(6, 'Pacte rompu', `${nomZone(z)} rompt son pacte avec ${nomZone(autre)}`, `${PACTES[p.type].nom} interrompu ${toursRestants(state, p, T)} tours avant la fin.`);
      continue;
    }
    // Partenaire qui ne joue plus : le pacte s'éteint, sans pénalité.
    const absent = [p.a, p.b].find((u) => (Z[u].toursSansOrdres || 0) >= PACTE.inactif);
    if (absent) {
      p.fini = true;
      rapport(Z[partenaire(p, absent)], `Pacte : ${nomZone(Z[absent])} ne donne plus de nouvelles depuis ${PACTE.inactif} jours ; votre ${PACTES[p.type].nom.toLowerCase()} s’éteint, sans pénalité.`);
      continue;
    }
    // Pacte d'enquête : mise en commun de la demi-pièce.
    if (p.type === 'enquete' && p.frag) mettreEnCommun(state, p, ord, T);
  }

  // 2. Nouvelles propositions (le partenaire répond demain).
  for (const u of uids) {
    const o = ord[u].pacte;
    if (!o || !PACTES[o.type] || !o.cible) continue;
    const refus = pacteImpossible(state, u, o.cible, T);
    if (refus) { rapport(Z[u], `Pacte non envoyé : ${refus}.`); continue; }
    state.pacteSeq = (state.pacteSeq || 0) + 1;
    state.pactes.push({ id: `p${state.season}-${state.pacteSeq}`, a: u, b: o.cible, type: o.type, etape: 'propose', tourReponse: T + 1 });
    rapport(Z[u], `Pacte : ${PACTES[o.type].nom.toLowerCase()} proposé à ${nomZone(Z[o.cible])}, réponse demain.`);
    rapport(Z[o.cible], `Pacte : ${nomZone(Z[u])} te propose un ${PACTES[o.type].nom.toLowerCase()}. Réponds avant 20:00 (onglet Pactes de la Carte).`);
  }
  state.pactes = state.pactes.filter((p) => !p.fini);

  // 3. Défis : réponses, puis propositions.
  for (const d of state.defis) {
    if (d.etape !== 'propose' || d.tourReponse !== T) continue;
    const za = Z[d.a], zb = Z[d.b];
    const r = ord[d.b] && ord[d.b].defiReponse;
    if (!za || !zb) { d.fini = true; continue; }
    const mise = Math.min(d.mise, Math.max(0, Math.floor(za.budget)), Math.max(0, Math.floor(zb.budget)));
    if (r && r.id === d.id && r.accepte) {
      d.etape = 'encours'; d.mise = mise; d.fin = T + DEFI.duree; d.base = null;
      for (const z of [za, zb]) if (mise) { z.budget -= mise; (z._compta ||= []).push({ k: 'defi', l: 'Défi amical : mise', v: -mise }); }
      rapport(za, `Défi : ${nomZone(zb)} relève ton défi (${DEFI_INDICATEURS[d.ind].nom.toLowerCase()}, ${DEFI.duree} tours${mise ? `, ${mise} k€ misés chacun` : ''}).`);
      rapport(zb, `Défi : c’est parti contre ${nomZone(za)} (${DEFI_INDICATEURS[d.ind].nom.toLowerCase()}, ${DEFI.duree} tours${mise ? `, ${mise} k€ misés chacun` : ''}).`);
      push(5, 'Défi amical', `${nomZone(za)} et ${nomZone(zb)} se lancent un défi`, `${DEFI_INDICATEURS[d.ind].nom} pendant ${DEFI.duree} tours.${mise ? ` ${mise * 2} k€ dans le pot, ${DEFI.prime} k€ de prime du district.` : ''}`);
    } else {
      d.fini = true;
      rapport(za, `Défi : ${nomZone(zb)} décline, pas cette fois.`);
    }
  }
  for (const u of uids) {
    const o = ord[u].defi;
    if (!o || !DEFI_INDICATEURS[o.ind] || !o.cible) continue;
    const refus = defiImpossible(state, u, o.cible);
    if (refus) { rapport(Z[u], `Défi non envoyé : ${refus}.`); continue; }
    const mise = DEFI.mises.includes(o.mise) ? o.mise : 0;
    state.defiSeq = (state.defiSeq || 0) + 1;
    state.defis.push({ id: `f${state.season}-${state.defiSeq}`, a: u, b: o.cible, ind: o.ind, mise, etape: 'propose', tourReponse: T + 1 });
    rapport(Z[u], `Défi : envoyé à ${nomZone(Z[o.cible])}, réponse demain.`);
    rapport(Z[o.cible], `Défi : ${nomZone(Z[u])} te lance un défi amical (${DEFI_INDICATEURS[o.ind].nom.toLowerCase()}${mise ? `, ${mise} k€ chacun` : ''}). Réponds avant 20:00, refuser ne coûte rien.`);
  }
  state.defis = state.defis.filter((d) => !d.fini);
}

/** Pacte d'enquête : chaque zone qui a cliqué « Mettre en commun » donne sa moitié ; les deux moitiés font une pièce. */
function mettreEnCommun(state, p, ord, T) {
  const fr = p.frag, Z = state.zones;
  const e = state.enquete;
  if (!e || fr.n !== e.n || state.enquetePause) { p.frag = null; return; }
  for (const u of [p.a, p.b]) if (ord[u] && ord[u].fragment === p.id) fr.donne = { ...(fr.donne || {}), [u]: true };
  if (!(fr.donne && fr.donne[p.a] && fr.donne[p.b])) return;
  const aff = affaire(state, e.n);
  for (const u of [p.a, p.b]) {
    const z = Z[u];
    z.enquete = dossierDe(state, z);
    if (!z.enquete || z.enquete.pieces.some((x) => x.f === fr.f)) continue;
    z.enquete.pieces.push({ f: fr.f, j: e.jour, src: 'pacte', de: partenaire(p, u) });
    z.stats.piecesPacte = (z.stats.piecesPacte || 0) + 1;
    rapport(z, `Pacte d’enquête : avec ${nomZone(Z[partenaire(p, u)])}, vous réunissez les deux moitiés. Nouvelle pièce : « ${titrePiece(aff, fr.f)} ».`);
  }
  p.frag = null;
  void T;
}

/**
 * Après la simulation : bonus d'indemnité des renforts jumelés (appliqué dans resolve), fin des pactes,
 * nouvelles demi-pièces, défis terminés, remise sur les achats de demain.
 */
export function pactesPost(state, uids, push, T) {
  state.pactes = state.pactes || [];
  const A = absT(state, T);
  const Z = state.zones;
  const e = state.enquete;
  const aff = e && !state.enquetePause ? affaire(state, e.n) : null;
  for (const p of state.pactes) {
    if (p.etape !== 'actif') continue;
    if (A >= p.fin) {
      p.fini = true;
      for (const [u, v] of [[p.a, p.b], [p.b, p.a]]) {
        const z = Z[u]; if (!z) continue;
        z.stats.pactesTenus = (z.stats.pactesTenus || 0) + 1;
        z.ps = (z.ps || 0) + PACTE.psFin;
        rapport(z, `Pacte : ton ${PACTES[p.type].nom.toLowerCase()} avec ${Z[v] ? nomZone(Z[v]) : 'ton partenaire'} arrive à son terme (+${PACTE.psFin} PS). Tu peux le reconduire dans l’onglet Pactes.`);
      }
      continue;
    }
    // Pacte d'enquête : une nouvelle pièce coupée en deux, un soir sur deux (dès le soir de l'accord).
    // Une nouvelle affaire qui s'ouvre remplace aussitôt la demi-pièce de l'ancienne.
    if (p.type === 'enquete' && aff && ((T - p.depuis) % PACTE.fragTous === 0 || (p.frag && p.frag.n !== e.n))) {
      const za = Z[p.a], zb = Z[p.b];
      const ka = new Set(faitsConnus(dossierDe(state, za))), kb = new Set(faitsConnus(dossierDe(state, zb)));
      const libres = piecesLibres(aff).filter((f) => !ka.has(f) && !kb.has(f));
      const rng = makeRng(`${state.seed}:s${state.season}:t${T}:pacte:${p.id}`);
      if (p.frag && p.frag.n === e.n && !(p.frag.donne && p.frag.donne[p.a] && p.frag.donne[p.b])) {
        for (const u of [p.a, p.b]) rapport(Z[u], 'Pacte d’enquête : la demi-pièce d’avant-hier n’a pas été mise en commun à temps, elle est perdue.');
      }
      p.frag = libres.length ? { f: rng.pick(libres), n: e.n, tour: T, haut: rng.chance(0.5) ? p.a : p.b, donne: {} } : null;
      if (p.frag) for (const u of [p.a, p.b]) rapport(Z[u], `Pacte d’enquête : une demi-pièce t’attend, l’autre moitié est chez ${nomZone(Z[partenaire(p, u)])}. Mettez-la en commun avant le prochain 20:00.`);
    }
  }
  state.pactes = state.pactes.filter((p) => !p.fini);

  // Défis : point de départ mesuré le premier soir, verdict au dernier.
  for (const d of state.defis || []) {
    if (d.etape !== 'encours') continue;
    const za = Z[d.a], zb = Z[d.b];
    if (!za || !zb) { d.fini = true; continue; }
    const mes = DEFI_INDICATEURS[d.ind].mesure;
    if (!d.base) { d.base = { a: mes(za), b: mes(zb) }; continue; }
    if (T < d.fin) continue;
    d.fini = true;
    const ga = mes(za) - d.base.a, gb = mes(zb) - d.base.b;
    if (ga === gb) {
      for (const z of [za, zb]) { if (d.mise) { z.budget += d.mise; (z._compta ||= []).push({ k: 'defi', l: 'Défi amical : mise rendue', v: d.mise }); } rapport(z, `Défi : égalité (${ga} partout)${d.mise ? ', chacun récupère sa mise' : ''}.`); }
      push(4, 'Défi amical', `Égalité entre ${nomZone(za)} et ${nomZone(zb)}`, `${DEFI_INDICATEURS[d.ind].nom} : ${ga} partout.`);
      continue;
    }
    const [w, l, gw, gl] = ga > gb ? [za, zb, ga, gb] : [zb, za, gb, ga];
    const gain = d.mise * 2 + DEFI.prime;
    w.budget += gain; (w._compta ||= []).push({ k: 'defi', l: 'Défi amical gagné', v: gain });
    w.stats.defisGagnes = (w.stats.defisGagnes || 0) + 1;
    rapport(w, `Défi gagné contre ${nomZone(l)} (${gw} contre ${gl}) : +${gain} k€${d.mise ? ` (le pot et ${DEFI.prime} k€ de prime du district)` : ' de prime du district'}.`);
    rapport(l, `Défi perdu contre ${nomZone(w)} (${gl} contre ${gw}).${d.mise ? ` Ta mise de ${d.mise} k€ est pour elle.` : ''}`);
    push(6, 'Défi amical', `${nomZone(w)} remporte son défi contre ${nomZone(l)}`, `${DEFI_INDICATEURS[d.ind].nom} : ${gw} contre ${gl}.`);
  }
  state.defis = (state.defis || []).filter((d) => !d.fini);

  // Centrale d'achat : remise affichée et appliquée demain.
  for (const z of Object.values(Z)) {
    const r = remiseAchat(state, z.uid, T + 1);
    if (r) z.remiseAchat = r; else delete z.remiseAchat;
  }
  void uids;
}

/** Une zone dissoute (faillite) ou partie : ses pactes et défis s'arrêtent. */
export function oublierZone(state, uid) {
  state.pactes = (state.pactes || []).filter((p) => p.a !== uid && p.b !== uid);
  state.defis = (state.defis || []).filter((d) => d.a !== uid && d.b !== uid);
}
