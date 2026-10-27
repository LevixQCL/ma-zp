// Enquête en direct (saison 4) : chaque démarche part à l'heure où le joueur la lance et rend sa pièce après un temps
// de recherche ; une confrontation se joue quand il veut et son verdict tombe après la mise en place de l'audition.
// Les actions sont horodatées par le serveur (collection `enquete`, comme le central). Le calcul de 20:00 les rejoue
// dans l'ordre et verse au dossier les pièces avec leur heure de disponibilité (`dispo`, en ms) : une démarche lancée
// à 19:30 rend sa pièce à 22:00, même si le tour est passé entre-temps. L'appareil rejoue les mêmes actions pour
// afficher l'enquête en direct : le résultat est le même partout.
import { affaire, lireDemarche, pieceDemarche, mandatOk, coutDemarche, demarcheDe, opposables, pieceReaudition,
  pieceRecoupement, REAUD, RECOUP, ENQ, confrontationOk, bilanConfrontation, candidats, estAuteur, titrePiece } from './enquete.js';

const MIN = 60000;
export const DIRECT = {
  // Temps de recherche (minutes) avant que la pièce arrive, selon la démarche.
  duree: { cam: 150, labo: 150, temoin: 150, alibi: 150, banque: 180, moyens: 90, reaud: 90, recoup: 60 },
  enCours: 2,              // démarches en cours en même temps (+1 avec 8 agents de Recherche ou plus)
  parTour: 5,              // démarches lancées par journée de tour (réauditions et recoupements à part)
  reaudParTour: 1, recoupParTour: 1,
  // Confrontation : le verdict tombe après ces étapes (minutes depuis le lancement).
  verdict: [
    { m: 0, t: 'Mise en place de l’audition' },
    { m: 10, t: 'Le suspect est amené au commissariat' },
    { m: 20, t: 'Interrogatoire' },
    { m: 35, t: 'Le parquet examine le dossier' },
    { m: 45, t: 'Verdict' },
  ],
  relache: 6 * 60,         // après un échec, le suspect est relâché : pas de nouvelle confrontation avant 6 h
};
export const DELAI_VERDICT = DIRECT.verdict[DIRECT.verdict.length - 1].m;
const KINDS = new Set(['dem', 'reaud', 'recoup', 'confront']);

/** Les agents de Recherche accélèrent les démarches : ×1,3 avec 0 agent, ×1 avec 6, ×0,7 à partir de 12. */
export function facteurRecherche(agents) {
  return Math.max(0.7, Math.min(1.3, 1.3 - 0.05 * (Number(agents) || 0)));
}
/** Enquêteurs de la zone pour la journée : ses agents de Recherche du dernier tour (connus de tous les appareils). */
export function enqueteursDe(z) {
  if (z && Number.isFinite(Number(z.enqueteurs))) return Number(z.enqueteurs);
  const r = z && z.dernierOrdre && z.dernierOrdre.alloc && z.dernierOrdre.alloc.recherche;
  return Number.isFinite(Number(r)) ? Number(r) : 4;
}
export const enCoursMax = (agents) => DIRECT.enCours + ((Number(agents) || 0) >= 8 ? 1 : 0);
/** Durée (minutes) d'une démarche pour une zone qui a `agents` agents en Recherche. */
export function dureeDemarche(k, agents) {
  return Math.round((DIRECT.duree[k] || 150) * facteurRecherche(agents));
}

/** Pièces disponibles à l'instant t (ms) : une pièce sans heure de disponibilité l'est déjà. */
export const piecesA = (dossier, t) => (dossier ? dossier.pieces.filter((p) => !(p.dispo > t)) : []);
/** Le même dossier, réduit à ce qui est arrivé à l'instant t. */
export const dossierA = (dossier, t) => (dossier ? { ...dossier, pieces: piecesA(dossier, t) } : dossier);

/** Actions lisibles, triées par heure (serveur). */
export function actionsValides(liste) {
  return (Array.isArray(liste) ? liste : []).filter((x) => x && KINDS.has(x.k) && Number.isFinite(x.at))
    .slice(0, 200).sort((a, b) => a.at - b.at);
}

/**
 * Rejoue les actions d'une zone sur une copie de son dossier.
 * `ctx` : { state, z, agents (Recherche), budget, limite (heure du prochain 20:00, en ms) }. Renvoie le dossier enrichi (pièces avec `dispo`), ce qui a été
 * dépensé, les confrontations (avec heure du verdict et issue) et les refus (avec la raison), dans l'ordre.
 */
export function rejouer(ctx, dossier, actions) {
  const { state, z } = ctx, e = state.enquete;
  if (!e || !dossier) return { dossier, depense: 0, confrontations: [], refus: [], lancees: [] };
  const aff = affaire(state, e.n);
  const d = { ...dossier, pieces: dossier.pieces.slice(), relache: { ...(dossier.relache || {}) } };
  let budget = ctx.budget, depense = 0, nDem = 0, nReaud = 0, nRecoup = 0;
  const confrontations = [], refus = [], lancees = [];
  const enCours = (t) => d.pieces.filter((p) => p.dispo > t && Object.hasOwn(DIRECT.duree, p.src) && p.src !== 'reaud' && p.src !== 'recoup').length;
  const payer = (c, x, t) => { if (budget < c) { refus.push({ at: x.at, x, raison: 'budget insuffisant' }); return false; } budget -= c; depense += c; return true; };
  const limite = Number(ctx.limite) || Infinity;
  for (const x of actionsValides(actions)) {
    const t = x.at, ici = dossierA(d, t);
    if (t > limite) continue; // après 20:00 : compte pour la journée suivante
    if (d.exclu || (d.accuse != null && !d.exclu)) { refus.push({ at: t, x, raison: 'affaire terminée pour toi' }); continue; }
    if (x.k === 'dem') {
      const dm = lireDemarche(x.x);
      if (!dm) continue;
      if (nDem >= DIRECT.parTour) { refus.push({ at: t, x, raison: `pas plus de ${DIRECT.parTour} démarches par jour` }); continue; }
      if (enCours(t) >= enCoursMax(ctx.agents)) { refus.push({ at: t, x, raison: 'tes enquêteurs sont tous occupés' }); continue; }
      // Déjà lancée et pas encore revenue : la même pièce n'est pas cherchée deux fois.
      const f = pieceDemarche(aff, { ...d, pieces: d.pieces }, x.x);
      if (!f) {
        if (dm.k === 'moyens' && aff.meurtre && !mandatOk(aff, ici, dm.i)) refus.push({ at: t, x, raison: 'le juge refuse le mandat' });
        else refus.push({ at: t, x, raison: 'rien de neuf à en tirer' });
        continue;
      }
      if (dm.k === 'moyens' && aff.meurtre && !mandatOk(aff, ici, dm.i)) { refus.push({ at: t, x, raison: 'le juge refuse le mandat' }); continue; }
      if (!payer(coutDemarche(state, z.uid, x.x), x, t)) continue;
      nDem += 1;
      const dispo = t + dureeDemarche(dm.k, ctx.agents) * MIN;
      d.pieces.push({ f, j: e.jour, src: dm.k, lance: t, dispo });
      lancees.push({ at: t, k: dm.k, f, fin: dispo, nom: demarcheDe(aff, dm.k).nom });
    } else if (x.k === 'reaud' && aff.meurtre) {
      const i = Number(x.i), s = aff.suspects[i];
      if (!s || !opposables(aff, ici).has(x.f)) continue;
      if (nReaud >= DIRECT.reaudParTour) { refus.push({ at: t, x, raison: 'une réaudition par jour' }); continue; }
      if (!mandatOk(aff, ici, i)) { refus.push({ at: t, x, raison: 'le magistrat refuse la réaudition' }); continue; }
      if (!payer(REAUD.cout, x, t)) continue;
      nReaud += 1;
      const dispo = t + dureeDemarche('reaud', ctx.agents) * MIN, p = pieceReaudition(aff, d, i, x.f);
      if (p) d.pieces.push({ f: p, j: e.jour, src: 'reaud', lance: t, dispo });
      lancees.push({ at: t, k: 'reaud', f: p, fin: dispo, nom: `Réaudition de ${s.prenom}`, vide: !p });
    } else if (x.k === 'recoup' && aff.recoupements) {
      const [a, b] = [x.a, x.b], op = opposables(aff, ici);
      if (!op.has(a) || !op.has(b) || a === b) continue;
      if (nRecoup >= DIRECT.recoupParTour) { refus.push({ at: t, x, raison: 'un recoupement par jour' }); continue; }
      if (!payer(RECOUP.cout, x, t)) continue;
      nRecoup += 1;
      d.recoups = [...(d.recoups || []).slice(-30), [a, b].sort().join('|')];
      const dispo = t + dureeDemarche('recoup', ctx.agents) * MIN, p = pieceRecoupement(aff, d, a, b);
      if (p) d.pieces.push({ f: p, j: e.jour, src: 'recoup', lance: t, dispo });
      lancees.push({ at: t, k: 'recoup', f: p, fin: dispo, nom: 'Recoupement', vide: !p });
    } else if (x.k === 'confront') {
      const i = Number(x.i);
      if (!(i >= 0 && i < aff.suspects.length)) continue;
      if (t + DELAI_VERDICT * MIN > limite) { refus.push({ at: t, x, raison: `le parquet ferme : plus de confrontation dans les ${DELAI_VERDICT} minutes avant 20:00` }); continue; }
      if (d.relache[i] && d.relache[i] > t) { refus.push({ at: t, x, raison: `${aff.suspects[i].prenom} vient d’être relâché${aff.suspects[i].f ? 'e' : ''}` }); continue; }
      const fin = t + DELAI_VERDICT * MIN;
      // Second nom (deux complices) : un autre suspect de l'affaire, jamais le même deux fois.
      const i2 = Number.isInteger(x.i2) && x.i2 !== i && x.i2 >= 0 && x.i2 < aff.suspects.length ? x.i2 : null;
      const c = { at: t, fin, i, i2, pieces: [], mobile: Number.isInteger(x.mobile) ? x.mobile : null };
      if (aff.meurtre) {
        const connus = opposables(aff, ici);
        c.pieces = (Array.isArray(x.pieces) ? x.pieces : []).filter((f) => typeof f === 'string' && connus.has(f)).slice(0, 3);
        if (i === aff.coupable && confrontationOk(aff, i, c.pieces)) { c.issue = 'aveux'; d.accuse = i; d.accuseT = fin; }
        else if (i === aff.coupable) { c.issue = 'nie'; c.bilan = bilanConfrontation(aff, i, c.pieces); d.relache[i] = fin + DIRECT.relache * MIN; }
        else { c.issue = 'innocent'; d.accuse = i; d.exclu = true; d.accuseT = fin; }
      } else {
        // Vol : le parquet exige un dossier qui écarte tous les autres suspects ; refus sans pénalité sinon.
        const restants = candidats(aff, piecesA(d, t).map((p) => p.f)).suspects;
        const paire = aff.variante === 'complices' ? [i, c.i2] : null;
        const ok = paire ? (Number.isInteger(c.i2) && restants.length === 2 && paire.every((k) => restants.includes(k))) : (restants.length === 1 && restants[0] === i);
        if (!ok) {
          c.issue = 'refus';
          c.bilan = paire && c.i2 == null ? `Le parquet refuse : dans cette affaire, il attend les deux complices, et ton dossier doit écarter les trois autres suspects. Aucune pénalité.`
            : 'Le parquet refuse : ton dossier n’écarte pas encore tous les autres suspects. Aucune pénalité.';
        }
        // Paire juste, dans un ordre ou dans l'autre : le dossier retient l'exécutant puis le complice (lu par le débrief et la traque).
        else if (paire ? paire.every((k) => estAuteur(aff, k)) : i === aff.coupable) { c.issue = 'identifie'; d.accuse = aff.coupable; if (paire) d.accuse2 = aff.complice; d.accuseT = fin; }
        else { c.issue = 'innocent'; d.accuse = i; if (paire) d.accuse2 = c.i2; d.exclu = true; d.accuseT = fin; }
      }
      confrontations.push(c);
    }
  }
  return { dossier: d, depense, confrontations, refus, lancees };
}

/** Étape de la confrontation à l'instant t (ms) : texte de l'étape en cours, minutes restantes, fini ou non. */
export function etapeVerdict(c, t) {
  const m = (t - c.at) / MIN;
  let cur = DIRECT.verdict[0];
  for (const s of DIRECT.verdict) if (m >= s.m) cur = s;
  return { t: cur.t, reste: Math.max(0, Math.ceil(DELAI_VERDICT - m)), fini: m >= DELAI_VERDICT, part: Math.min(1, Math.max(0, m / DELAI_VERDICT)) };
}

/** Texte du verdict, une fois tombé. */
export function texteVerdict(state, c) {
  const aff = affaire(state, state.enquete.n), s = aff.suspects[c.i];
  if (c.issue === 'aveux') return `${s.nom} craque et passe aux aveux.`;
  if (c.issue === 'identifie') return `Le parquet suit ton dossier : ${s.nom} est bien l’auteur. Mandat d’arrêt délivré.`;
  if (c.issue === 'innocent') return `${s.nom} n’avait rien à voir avec l’affaire. Le parquet te la retire.`;
  if (c.issue === 'refus') return c.bilan;
  return `${s.nom} nie tout et repart libre. ${c.bilan} Tu pourras ${s.f ? 'la' : 'le'} reconvoquer dans ${DIRECT.relache / 60} h.`;
}

/** Titre lisible d'une démarche lancée (pour le journal de l'enquête). */
export const nomLancee = (state, l) => (l.f ? `${l.nom} : « ${titrePiece(affaire(state, state.enquete.n), l.f)} »` : `${l.nom} : rien de neuf`);
export { ENQ };
