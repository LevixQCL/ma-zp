// Pistes en cours : une action facultative dont le résultat tombe une à trois nuits plus tard, sans savoir d'avance ce qu'il sera.
// Rien n'est perdu si le joueur ne vient pas : le résultat l'attend dans son rapport et sur l'HP (« Cette nuit »).
// Révision d'oct. 2026 (Lot 4) : une raison de revenir par curiosité, pas par obligation.
import { affaire, faitsConnus, indiceBonus, candidats, pieceSurSuspect } from './enquete.js';
import { carteQuartiers } from './quartiers.js';
import { clamp, round1 } from './zone.js';

export const PISTES = {
  indic: {
    nom: 'Approcher un indic', ico: '🕵️', cout: 1.5, agents: 0, nuits: [1, 3],
    texte: 'Un peu d’argent pour un informateur du milieu. Il rappellera… ou pas.',
    chances: { indice: 0.6 },
  },
  filature: {
    nom: 'Filature d’un suspect', ico: '🚶', cout: 0, agents: 1, nuits: [2, 2], cible: 'suspect',
    texte: 'Un enquêteur suit un suspect de l’affaire en cours pendant deux jours (absent de ses services).',
    chances: { piece: 0.8 },
  },
  dialogue: {
    nom: 'Dialogue avec un quartier tendu', ico: '🤝', cout: 0, agents: 1, nuits: [2, 3], cible: 'quartier',
    texte: 'Un agent de Proximité rencontre les habitants et les commerçants. La tension retombe durablement… ou une manifestation s’organise.',
    chances: { apaise: 0.7 }, apaise: 12, manif: { tension: 5, satisfaction: -2 },
  },
};
export const MAX_PISTES = 3;
export const IDS_PISTES = Object.keys(PISTES);

/** Pistes demandées dans les ordres : [{ type, cible }] (validées finement au lancement). */
export function lireOrdresPistes(raw) {
  const l = raw && Array.isArray(raw.pistesNew) ? raw.pistesNew : [];
  return { pistesNew: l.slice(0, MAX_PISTES).filter((p) => p && IDS_PISTES.includes(p.type)).map((p) => ({ type: p.type, cible: Number.isInteger(p.cible) ? p.cible : /^\d{1,4}$/.test(String(p.cible ?? '')) ? Number(p.cible) : null })) };
}

/** Une piste de ce type est-elle possible ce soir pour cette zone ? Renvoie la raison si non. */
export function pisteImpossible(state, z, type, cible) {
  const P = PISTES[type];
  if (!P) return 'piste inconnue';
  if (((z.pistes || []).length) >= MAX_PISTES) return `déjà ${MAX_PISTES} pistes en cours`;
  if ((z.pistes || []).some((p) => p.type === type)) return 'une piste de ce type est déjà en cours';
  if (P.cout && z.budget < P.cout) return 'budget insuffisant';
  if (P.cible === 'suspect') {
    if (!state.enquete || state.enquetePause) return 'pas d’affaire en cours';
    const aff = affaire(state, state.enquete.n);
    if (aff.meurtre) return 'pas pour une affaire écrite : leurs suspects se suivent par les réauditions';
    if (!(cible >= 0 && cible < aff.suspects.length)) return 'choisis un suspect';
  }
  if (P.cible === 'quartier') {
    const cells = (carteQuartiers(state).deZone[z.uid] || []).map(Number);
    if (!cells.includes(Number(cible))) return 'choisis un de tes quartiers';
  }
  return null;
}

/**
 * Pendant la résolution d'une zone : résultats des pistes arrivées à terme, puis lancement des nouvelles.
 * Renvoie les lignes du rapport ; les résultats vont aussi dans `z.cetteNuit` (carte de l'HP).
 */
export function pistesDuSoir(state, z, demandes, T, rng) {
  const lignes = [];
  const garde = [];
  for (const p of z.pistes || []) {
    if (p.retour > T) { garde.push(p); continue; }
    const t = resultatPiste(state, z, p, rng);
    lignes.push(t);
    (z.cetteNuit ||= []).push({ ico: PISTES[p.type] ? PISTES[p.type].ico : '•', t });
  }
  z.pistes = garde;
  for (const d of demandes || []) {
    const raison = pisteImpossible(state, z, d.type, d.cible);
    const P = PISTES[d.type];
    if (raison) { lignes.push(`Piste « ${P ? P.nom : d.type} » non lancée : ${raison}.`); continue; }
    const nuits = P.nuits[0] + Math.floor(rng.next() * (P.nuits[1] - P.nuits[0] + 1));
    if (P.cout) { z.budget = round1(z.budget - P.cout); (z._compta ||= []).push({ k: 'piste', l: P.nom, v: -P.cout }); }
    if (P.agents) z.blesses.push({ n: P.agents, retour: T + nuits + 1, motif: d.type === 'filature' ? 'en filature' : 'en mission de dialogue' });
    const p = { type: d.type, lance: T, retour: T + nuits, ...(d.cible != null ? { cible: d.cible } : {}), ...(state.enquete ? { n: state.enquete.n } : {}) };
    z.pistes.push(p);
    lignes.push(`Piste lancée : ${P.nom}${cibleTexte(state, z, p)}. Résultat d’ici ${nuits} nuit${nuits > 1 ? 's' : ''}${P.cout ? ` (${String(P.cout).replace('.', ',')} k€)` : ''}${P.agents ? ` ; ${P.agents} agent absent de ses services jusque-là` : ''}.`);
  }
  return lignes;
}

function cibleTexte(state, z, p) {
  if (p.type === 'filature' && state.enquete) { const a = affaire(state, p.n ?? state.enquete.n); const s = a.suspects[p.cible]; return s ? ` (${s.nom})` : ''; }
  if (p.type === 'dialogue') return ` (quartier n° ${p.cible})`;
  return '';
}

function resultatPiste(state, z, p, rng) {
  const P = PISTES[p.type];
  const enCours = state.enquete && !state.enquetePause && (p.n == null || p.n === state.enquete.n) && z.enquete;
  if (p.type === 'indic') {
    if (enCours && rng.chance(P.chances.indice) && indiceBonus(state, z, rng)) return '🕵️ Ton indic a rappelé : une pièce de plus pour l’affaire en cours (dans ton dossier).';
    if (!enCours && rng.chance(P.chances.indice)) { z.criminalite = clamp(round1(z.criminalite - 3), 10, 95); return '🕵️ Ton indic a rappelé : un tuyau sur un point de deal, démantelé dans la foulée (criminalité −3).'; }
    return '🕵️ Ton indic n’a pas rappelé. Il demandera sans doute plus la prochaine fois.';
  }
  if (p.type === 'filature') {
    if (!enCours) return '🚶 Filature terminée : l’affaire est close entre-temps, ton enquêteur reprend son service.';
    const aff = affaire(state, state.enquete.n), s = aff.suspects[p.cible];
    const connus = new Set(faitsConnus(z.enquete));
    const reste = (aff.faits || []).some((f) => !connus.has(f) && !f.startsWith('p:') && !f.startsWith('c:') && Number(f.split(':')[1]) === p.cible);
    if (reste && rng.chance(P.chances.piece)) {
      pieceSurSuspect(state, z, p.cible, rng, 'filature');
      const n = candidats(aff, faitsConnus(z.enquete)).suspects.length;
      return `🚶 Filature de ${s ? s.nom : 'ton suspect'} : ton enquêteur a vu quelque chose, une pièce de plus à son sujet (${n} suspect${n > 1 ? 's' : ''} encore possible${n > 1 ? 's' : ''} d’après ton dossier).`;
    }
    return reste ? `🚶 Filature de ${s ? s.nom : 'ton suspect'} : il a semé ton enquêteur dans la foule. Rien de neuf.` : `🚶 Filature de ${s ? s.nom : 'ton suspect'} : rien que tu ne saches déjà.`;
  }
  if (p.type === 'dialogue') {
    const q = z.quartiers || {};
    const k = String(p.cible);
    if (!(k in q)) return '🤝 Dialogue : ce quartier n’est plus le tien, la rencontre est annulée.';
    if (rng.chance(P.chances.apaise)) { q[k] = clamp(round1(q[k] - P.apaise), 10, 95); return `🤝 Dialogue réussi dans le quartier n° ${k} : les habitants se sentent écoutés, la tension retombe (−${P.apaise}).`; }
    q[k] = clamp(round1(q[k] + P.manif.tension), 10, 95); z.satisfaction += P.manif.satisfaction;
    return `🤝 Dialogue tendu dans le quartier n° ${k} : une manifestation s’est organisée devant la maison de quartier (tension +${P.manif.tension}, satisfaction ${P.manif.satisfaction}).`;
  }
  return '';
}
