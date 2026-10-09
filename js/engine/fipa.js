// FIPA : événements organisés à deux zones, à la demande du bourgmestre.
// Demande (tour 1) → invitation d'une zone partenaire (tour 2) → réponse (tour 3)
// → jour J : agents mobilisés et choix secret « partager » ou « revendiquer » (tour 4).
import { makeRng } from './rng.js';

export const FIPA_EVENTS = [
  { titre: 'Braderie annuelle', texte: 'Le bourgmestre veut un dispositif visible dans les rues commerçantes.' },
  { titre: 'Match de football à risque', texte: 'Deux groupes de supporters rivaux sont attendus au stade.' },
  { titre: 'Visite d’un ministre', texte: 'Sécurisation du parcours et de la réception à l’hôtel de ville.' },
  { titre: 'Festival de musique en plein air', texte: 'Trois jours de concerts, des milliers de personnes attendues.' },
  { titre: 'Marché de Noël', texte: 'Affluence record attendue sur la Grand-Place.' },
  { titre: 'Course cycliste', texte: 'Fermetures de routes et points de passage à sécuriser.' },
  { titre: 'Carnaval', texte: 'Cortège, bals et fêtes de rue jusque tard dans la nuit.' },
  { titre: 'Manifestation annoncée', texte: 'Un cortège de plusieurs milliers de personnes traverse le centre.' },
];

export const FIPA = { chance: 0.16, delaiPaire: 7, minAgents: 2, maxAgents: 8 };

/** Partage de la récompense selon les deux choix secrets. */
export const PARTAGE = {
  'partager/partager': [0.5, 0.5],
  'revendiquer/partager': [0.75, 0.15],
  'partager/revendiquer': [0.15, 0.75],
  'revendiquer/revendiquer': [0.25, 0.25],
};

const absTurn = (state, T) => (state.season - 1) * 100 + T;
const paireKey = (a, b) => [a, b].sort().join('|');
// Zone retirée de la partie : jamais de plantage du tour pour un nom.
const nomZone = (z) => (z ? `ZP ${z.code} ${z.nom}` : "une zone qui a quitté la partie");

/** Peut-on inviter cette zone ? (null si oui, sinon la raison) */
export function invitationImpossible(state, fipa, uid, T = state.turn) {
  if (!uid || uid === fipa.demandeur) return 'Choisis une autre zone';
  const z = state.zones[uid];
  if (!z || z.toursSansOrdres >= 3) return 'Zone inactive';
  const last = (state.fipaPaires || {})[paireKey(uid, fipa.demandeur)];
  if (last !== undefined && absTurn(state, T) - last < FIPA.delaiPaire) return 'Vous avez déjà fait une FIPA ensemble cette semaine';
  if ((state.fipas || []).some((f) => f.id !== fipa.id && f.etape !== 'demande' && (f.demandeur === uid || f.partenaire === uid))) return 'Cette zone a déjà une FIPA en cours';
  return null;
}

/** Fiabilité affichée d'une zone. */
export function fiabilite(z) {
  const f = z.stats.fipaFaites || 0, h = z.stats.fipaHonorees || 0;
  return f ? `${h} sur ${f} honorée${h > 1 ? 's' : ''}` : 'aucune FIPA';
}

/** Avant la simulation : étapes des FIPA en cours. Renvoie les agents prélevés. */
export function fipaPre(state, uids, ord, push, T) {
  const prises = {};
  const res = [];
  const garder = [];
  for (const f of state.fipas || []) {
    const A = state.zones[f.demandeur];
    if (!A) continue;
    if (f.etape === 'demande' && f.tourDecision === T) {
      const o = uids.includes(f.demandeur) ? ord[f.demandeur].fipa : null;
      const ok = o && o.id === f.id && !invitationImpossible(state, f, o.invite, T)
        && o.moi >= FIPA.minAgents && o.lui >= FIPA.minAgents && o.moi + o.lui >= f.besoin;
      if (ok) {
        Object.assign(f, { etape: 'invite', partenaire: o.invite, moi: o.moi, lui: o.lui, tourReponse: T + 1 });
        A.rapport.push(`FIPA ${f.titre} : invitation envoyée à ${nomZone(state.zones[o.invite])}.`);
        state.zones[o.invite].rapport.push(`FIPA : ${nomZone(A)} t’invite à organiser « ${f.titre} » avec elle. Réponds pendant ce tour.`);
        garder.push(f);
      } else {
        A.satisfaction -= 4;
        A.rapport.push(`FIPA ${f.titre} : aucune zone invitée, le bourgmestre est déçu (−4 de satisfaction).`);
      }
    } else if (f.etape === 'invite' && f.tourReponse === T) {
      const B = state.zones[f.partenaire];
      const r = B && uids.includes(f.partenaire) ? ord[f.partenaire].fipaReponse : null;
      if (B && r && r.id === f.id && r.accepte) {
        Object.assign(f, { etape: 'accepte', tourJ: T + 1 });
        state.fipaPaires = state.fipaPaires || {};
        state.fipaPaires[paireKey(f.demandeur, f.partenaire)] = absTurn(state, T);
        A.rapport.push(`FIPA ${f.titre} : ${nomZone(B)} accepte. Jour J demain.`);
        B.rapport.push(`FIPA ${f.titre} : c’est confirmé, jour J demain.`);
        push(4, 'FIPA', `${nomZone(A)} et ${nomZone(B)} organisent ensemble : ${f.titre.toLowerCase()}`, 'Le dispositif commun est prévu pour demain.');
        garder.push(f);
      } else {
        A.satisfaction -= 3;
        A.rapport.push(`FIPA ${f.titre} : ${B ? nomZone(B) : 'la zone invitée'} n’a pas donné suite (−3 de satisfaction).`);
        if (B) { B.rapport.push(`FIPA ${f.titre} : invitation laissée sans suite.`); B.stats.refusFipa = (B.stats.refusFipa || 0) + 1; }
      }
    } else if (f.etape === 'accepte' && f.tourJ === T) {
      const B = state.zones[f.partenaire];
      if (!B) continue;
      const envoie = (u, n) => {
        const al = uids.includes(u) ? ord[u].alloc : {};
        const p = {};
        let reste = n;
        const libres = Math.min(reste, uids.includes(u) ? ((ord[u] && ord[u]._libres) || 0) : 0);
        if (libres > 0) { p.proximite = libres; reste -= libres; } // retirés d'abord des agents sans affectation (à la résolution)
        for (const s of ['proximite', 'intervention', 'roulage', 'recherche', 'admin']) {
          const k = Math.min(reste, al[s] || 0);
          if (k > 0) { p[s] = (p[s] || 0) + k; reste -= k; }
        }
        prises[u] = prises[u] || {};
        for (const [s, k] of Object.entries(p)) prises[u][s] = (prises[u][s] || 0) + k;
        return n - reste;
      };
      const eA = envoie(f.demandeur, f.moi), eB = envoie(f.partenaire, f.lui);
      const ratio = (eA + eB) / (f.moi + f.lui);
      const cA = (ord[f.demandeur] && ord[f.demandeur].fipaChoix && ord[f.demandeur].fipaChoix.id === f.id && ord[f.demandeur].fipaChoix.choix === 'revendiquer') ? 'revendiquer' : 'partager';
      const cB = (ord[f.partenaire] && ord[f.partenaire].fipaChoix && ord[f.partenaire].fipaChoix.id === f.id && ord[f.partenaire].fipaChoix.choix === 'revendiquer') ? 'revendiquer' : 'partager';
      const mult = ratio >= 0.9 ? 1 : ratio >= 0.5 ? 0.5 : 0;
      const pot = f.recompense * mult;
      const [pA, pB] = PARTAGE[`${cA}/${cB}`];
      const gainA = Math.round(pot * pA * 10) / 10, gainB = Math.round(pot * pB * 10) / 10;
      for (const [z, c, gain, env, promis] of [[A, cA, gainA, eA, f.moi], [B, cB, gainB, eB, f.lui]]) {
        z.stats.fipaFaites += 1;
        if (c === 'partager' && env >= promis) z.stats.fipaHonorees += 1;
        z._psEntraide = (z._psEntraide || 0) + 10;
        if (mult > 0) { z.budget += gain; (z._compta ||= []).push({ k: 'fipa', l: 'Récompense FIPA', v: gain }); z.satisfaction += mult === 1 ? 4 : 1; }
        else z.satisfaction -= 5;
        if (cA === 'partager' && cB === 'partager' && mult > 0) z.reputation += 2;
        if (cA === 'revendiquer' && cB === 'revendiquer') z.satisfaction -= 3;
        z.rapport.push(`FIPA ${f.titre} : ${env} agent${env > 1 ? 's' : ''} envoyé${env > 1 ? 's' : ''} sur ${promis}, ${mult ? `tu touches ${String(gain).replace('.', ',')} k€` : 'échec du dispositif (−5 de satisfaction)'}.`);
      }
      let titre, texte;
      if (!mult) { titre = `${f.titre} : fiasco pour ${nomZone(A)} et ${nomZone(B)}`; texte = `Seulement ${eA + eB} agents sur ${f.moi + f.lui} prévus.`; }
      else if (cA === 'partager' && cB === 'partager') { titre = `${f.titre} : ${nomZone(A)} et ${nomZone(B)} partagent le succès`; texte = `${f.recompense * mult} k€ répartis équitablement. Le bourgmestre salue une collaboration exemplaire.`; }
      else if (cA === 'revendiquer' && cB === 'revendiquer') { titre = `${f.titre} : ${nomZone(A)} et ${nomZone(B)} se disputent le mérite`; texte = 'Chacun revendique le succès. Le bourgmestre n’apprécie pas du tout.'; }
      else {
        const [tricheur, floue] = cA === 'revendiquer' ? [A, B] : [B, A];
        titre = `${f.titre} : ${nomZone(tricheur)} revendique seul le succès`; texte = `${nomZone(floue)} a pourtant fait sa part. On s’en souviendra.`;
      }
      push(mult ? 9 : 10, 'FIPA', titre, texte);
      res.push({ titre: f.titre, a: nomZone(A), b: nomZone(B), choixA: cA, choixB: cB, mult, gainA, gainB });
    } else garder.push(f);
  }
  state.fipas = garder;
  return { prises, res };
}

/** Après la simulation : nouvelles demandes du bourgmestre pour le tour suivant. */
export function fipaGenerer(state, T, finSaison) {
  state.fipas = state.fipas || [];
  const actives = Object.values(state.zones).filter((z) => z.toursSansOrdres < 3 && z.joinedTurn <= T);
  if (actives.length < 2 || T < 1 || finSaison) return;
  const occupees = new Set(state.fipas.flatMap((f) => [f.demandeur, f.partenaire].filter(Boolean)));
  const max = Math.ceil(actives.length / 2);
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:fipa`);
  for (const z of actives.slice().sort((a, b) => (a.uid < b.uid ? -1 : 1))) {
    if (state.fipas.length >= max || occupees.has(z.uid)) continue;
    const bonus = (z.stats.fipaFaites || 0) === 0 ? 1.5 : 1;
    if (!rng.chance(FIPA.chance * bonus)) continue;
    const ev = rng.pick(FIPA_EVENTS);
    state.fipaSeq = (state.fipaSeq || 0) + 1;
    state.fipas.push({
      id: `f${state.season}-${state.fipaSeq}`, demandeur: z.uid, titre: ev.titre, texte: ev.texte,
      besoin: rng.int(6, 10), recompense: rng.int(10, 14), etape: 'demande', tourDecision: T + 1,
    });
    occupees.add(z.uid);
    z.rapport.push(`FIPA : le bourgmestre te demande d’organiser « ${ev.titre} ». Invite une zone partenaire pendant le prochain tour.`);
  }
}

/** FIPA qui concernent une zone au tour courant (pour l'interface et les robots). */
export function fipaPour(state, uid) {
  return (state.fipas || []).filter((f) => f.demandeur === uid || f.partenaire === uid);
}
