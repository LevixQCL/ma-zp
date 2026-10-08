// La relève : un suspect file d'une zone vers sa voisine, qui choisit de le prendre en charge ou non.
//
// Déclencheurs (le soir) : opération d'envergure réussie à moitié, affaire disputée bouclée avec un dispositif
// juste suffisant, vague de délinquance brisée (une fois sur RELEVE.chanceVague).
// Le lendemain, la zone voisine choisit dans ses ordres :
// - « Je prends » : 2 à 4 agents d'Intervention partent sur la relève ; la zone de départ peut y ajouter
//   jusqu'à 2 agents d'appui. Capture assurée si l'équipe atteint RELEVE.requis, une chance sur deux à un près.
// - « Pas l'effectif » : refus clair, sans aucun malus. Le suspect s'évapore.
// - « Transmettre » : à une autre de ses voisines (une seule fois par relève).
// Capture : mérite partagé, et parfois un bonus (félicitations du juge, ou saisie à se partager :
// l'une prend l'argent, l'autre la voiture).

import { aAnnexe } from './constants.js';
import { talent, TALENT, noterChef } from './chef.js';
import { makeRng } from './rng.js';
import { zonesVoisines, peutRecevoir } from './vagues.js';
import { carteQuartiers } from './quartiers.js';
import { ajouterVehicule } from './flotte.js';
import { capaciteVehicules, agentsDisponibles, clamp } from './zone.js';

export const RELEVE = {
  actif: true,
  requis: 3,              // agents pour une capture assurée (relève + appui)
  min: 2, max: 4,         // agents de la zone qui prend la relève
  appuiMax: 2,            // agents d'appui de la zone de départ
  chanceVague: 0.4,       // une vague brisée laisse filer quelqu'un
  chanceBonus: 0.35,       // bonus après une capture
  gain: {
    releve: { points: 10, reputation: 3, ps: 8, satisfaction: 3 },
    depart: { points: 3, reputation: 1, ps: 4 },
    appui: { points: 2, ps: 3 },           // par agent d'appui envoyé
    transmis: { reputation: 1, ps: 3 },    // zone qui a transmis à la bonne voisine
  },
  juge: { reputation: 3, moral: 3, reputationDepart: 1 },
  saisie: { argent: 7, usure: 30, argentSiGaragePlein: 6 },
};

/** Agents au minimum pour prendre une relève (un de moins avec le complexe cellulaire). */
export const minReleve = (z) => Math.max(1, RELEVE.min - (aAnnexe(z, 'cachots') ? 1 : 0));

const SUSPECTS = ['le chauffeur', 'le guetteur', 'le receleur', 'le troisième homme', 'la complice', 'le passager du scooter', 'le rabatteur', 'la conductrice'];

const actives = (state) => (state.releves || []).filter((r) => r && typeof r === 'object');

/** Relève proposée à la zone ce soir (ou null). */
export function releveRecue(state, uid, T = state.turn) {
  return actives(state).find((r) => r.vers === uid && r.tour === T && r.etape === 'proposee') || null;
}
/** Relèves que la zone a lancées et qui se jouent ce soir (pour l'appui). */
export function relevesLancees(state, uid, T = state.turn) {
  return actives(state).filter((r) => r.origine === uid && r.tour === T && r.etape === 'proposee');
}
/** Saisie à partager dont la zone choisit la part ce soir. */
export function saisieAChoisir(state, uid, T = state.turn) {
  return actives(state).find((r) => r.etape === 'saisie' && r.vers === uid && r.tour === T) || null;
}
/** Voisines à qui la relève peut être transmise. */
export function ciblesTransmission(state, r, T = state.turn) {
  if (!r || r.transmis) return [];
  return Object.keys(zonesVoisines(state, r.vers)).filter((u) => u !== r.origine && u !== r.vers && peutRecevoir(state.zones[u], T + 1)).sort();
}

/** Lecture sûre des choix de relève dans des ordres reçus. */
export function lireOrdresReleve(o) {
  const out = {};
  const str = (v) => (typeof v === 'string' ? v.slice(0, 40) : '');
  if (o && o.releve && typeof o.releve === 'object' && ['prendre', 'refuser', 'transmettre'].includes(o.releve.choix)) {
    out.releve = { id: str(o.releve.id), choix: o.releve.choix, agents: clamp(Math.floor(Number(o.releve.agents) || 0), 0, RELEVE.max), vers: str(o.releve.vers) };
  }
  if (o && Array.isArray(o.releveAppui)) out.releveAppui = o.releveAppui.slice(0, 3).filter((x) => x && typeof x === 'object').map((x) => ({ id: str(x.id), agents: clamp(Math.floor(Number(x.agents) || 0), 0, RELEVE.appuiMax) })).filter((x) => x.agents > 0);
  if (o && o.saisie && typeof o.saisie === 'object' && ['argent', 'voiture'].includes(o.saisie.part)) out.saisie = { id: str(o.saisie.id), part: o.saisie.part };
  return out;
}

/** Agents que la zone engage ce soir sur les relèves (pour les retirer de ses services). */
export function agentsReleve(state, uid, o, T = state.turn) {
  let n = 0;
  const r = releveRecue(state, uid, T);
  if (r && o && o.releve && o.releve.id === r.id && o.releve.choix === 'prendre') n += clamp(o.releve.agents || minReleve(state.zones[uid]), minReleve(state.zones[uid]), RELEVE.max);
  for (const a of (o && o.releveAppui) || []) if (relevesLancees(state, uid, T).some((x) => x.id === a.id)) n += a.agents;
  return n;
}

/**
 * Avant la simulation des zones : choix des relèves de ce soir, captures, transmissions, saisies.
 * Renvoie { prises: { uid: { intervention: n } } } (agents partis sur les relèves).
 */
export function releveResoudre(state, uids, ord, push, T, zoneLabel) {
  const prises = {};
  if (!Array.isArray(state.releves)) state.releves = [];
  const c = carteQuartiers(state);
  const Z = (u) => state.zones[u];
  const gagner = (z, fx) => {
    if (!z) return '';
    const bouts = [];
    if (fx.points) { z._points += fx.points; bouts.push(`+${fx.points} pts`); }
    if (fx.reputation) { z.reputation += fx.reputation; bouts.push(`+${fx.reputation} de réputation`); }
    if (fx.satisfaction) { z.satisfaction += fx.satisfaction; bouts.push(`+${fx.satisfaction} de satisfaction`); }
    if (fx.moral) { z.moral += fx.moral; bouts.push(`+${fx.moral} de moral`); }
    if (fx.ps) { z._psEntraide = (z._psEntraide || 0) + fx.ps; bouts.push(`+${fx.ps} PS d’entraide`); }
    if (fx.budget) { z.budget += fx.budget; (z._compta ||= []).push({ k: 'releve', l: 'Saisie partagée (relève)', v: fx.budget }); bouts.push(`+${fx.budget} k€`); }
    return bouts.join(', ');
  };
  const prendre = (u, n) => { if (n > 0) { prises[u] ||= {}; prises[u].intervention = (prises[u].intervention || 0) + n; } };
  const nouvelles = [];

  // 1. Saisies : la zone qui a fait la capture a choisi sa part (argent par défaut).
  for (const r of actives(state).filter((x) => x.etape === 'saisie' && x.tour === T)) {
    const zb = Z(r.vers), za = Z(r.origine);
    const ch = ord[r.vers] && ord[r.vers].saisie && ord[r.vers].saisie.id === r.id ? ord[r.vers].saisie.part : 'argent';
    const voiture = (z) => {
      if (!z) return '';
      if ((z.flotte || []).length + 1 > capaciteVehicules(z)) return `garage plein : voiture revendue, ${gagner(z, { budget: RELEVE.saisie.argentSiGaragePlein })}`;
      ajouterVehicule(z, 'anonyme', T, RELEVE.saisie.usure);
      return 'une voiture anonymisée rejoint ton parc';
    };
    const pour = (z, part) => (part === 'voiture' ? voiture(z) : gagner(z, { budget: RELEVE.saisie.argent }));
    const autre = ch === 'voiture' ? 'argent' : 'voiture';
    if (zb) zb.rapport.push(`Saisie partagée (${r.suspect}) : tu as pris ${ch === 'voiture' ? 'la voiture' : 'l’argent'}, ${pour(zb, ch)}.`);
    if (za) za.rapport.push(`Saisie partagée (${r.suspect}) : ${zb ? zoneLabel(zb) : 'ta voisine'} a pris ${ch === 'voiture' ? 'la voiture' : 'l’argent'}, il te reste ${autre === 'voiture' ? 'la voiture' : 'l’argent'} : ${pour(za, autre)}.`);
    r.etape = 'fini';
  }

  // 2. Relèves de ce soir.
  for (const r of actives(state).filter((x) => x.etape === 'proposee' && x.tour === T)) {
    const zb = Z(r.vers), za = Z(r.origine);
    const ob = ord[r.vers] || {};
    const choix = zb && uids.includes(r.vers) && ob.releve && ob.releve.id === r.id ? ob.releve : null;
    const lieu = c.nomDe(Number(r.cell));
    if (choix && choix.choix === 'prendre') {
      const dispo = agentsDisponibles(zb, T);
      const n = clamp(choix.agents || minReleve(zb), minReleve(zb), Math.min(RELEVE.max, dispo));
      const ap = (ord[r.origine] && (ord[r.origine].releveAppui || []).find((x) => x.id === r.id)) || null;
      const nAp = za && ap && uids.includes(r.origine) ? Math.min(ap.agents, RELEVE.appuiMax) : 0;
      prendre(r.vers, n); prendre(r.origine, nAp);
      // Complexe cellulaire (saison 2) : la zone qui prend la relève a les cellules pour garder l'interpellé, un agent de moins suffit.
      const force = n + nAp + (aAnnexe(zb, 'cachots') ? 1 : 0);
      const rng = makeRng(`${state.seed}:s${state.season}:t${T}:releve:${r.id}`);
      const pris = force >= RELEVE.requis || (force === RELEVE.requis - 1 && rng.chance(0.5));
      const equipe = `${n} agent${n > 1 ? 's' : ''}${nAp ? ` + ${nAp} d’appui de ${zoneLabel(za)}` : ''}`;
      if (pris) {
        const gB = gagner(zb, RELEVE.gain.releve);
        const fxA = { ...RELEVE.gain.depart, points: RELEVE.gain.depart.points + nAp * RELEVE.gain.appui.points, ps: RELEVE.gain.depart.ps + nAp * RELEVE.gain.appui.ps };
        const gA = gagner(za, fxA);
        zb.stats.releves = (zb.stats.releves || 0) + 1;
        if (talent(zb, 'bonvoisin')) { zb.reputation += TALENT.bonvoisin.rep; zb.rapport.push('Bon voisin : +1 de réputation pour cette relève.'); noterChef(zb, 'bonvoisin', 'Bon voisin : ta relève te vaut +1 de réputation.'); }
        zb.rapport.push(`Relève réussie à ${lieu} : ${r.suspect} interpellé${r.suspect.startsWith('la ') ? 'e' : ''} (${equipe}) : ${gB}.`);
        if (za) za.rapport.push(`Ta relève a payé : ${zoneLabel(zb)} a interpellé ${r.suspect} à ${lieu}. Ta part du mérite : ${gA}.`);
        if (r.par && Z(r.par)) Z(r.par).rapport.push(`Bien vu : ${zoneLabel(zb)} a interpellé ${r.suspect}, que tu lui avais transmis (${gagner(Z(r.par), RELEVE.gain.transmis)}).`);
        push(7, 'Relève', `${zoneLabel(zb)} cueille ${r.suspect} à ${lieu}`, `${za ? `${zoneLabel(za)} avait passé le relais` : 'Un relais bien tenu'}${r.par && Z(r.par) ? `, via ${zoneLabel(Z(r.par))}` : ''}. ${r.titre ? `Suite de « ${r.titre} ».` : ''}`, r.vers);
        // Bonus : félicitations du juge, ou saisie à partager.
        if (rng.chance(RELEVE.chanceBonus)) {
          if (rng.chance(0.5) || !za) {
            const j = RELEVE.juge;
            zb.rapport.push(`Félicitations du juge d’instruction pour ce dossier impeccable : ${gagner(zb, { reputation: j.reputation, moral: j.moral })}.`);
            if (za) za.rapport.push(`Le juge salue aussi ta part du travail sur ${r.suspect} : ${gagner(za, { reputation: j.reputationDepart })}.`);
            push(6, 'Félicitations du juge', `Le juge félicite ${zoneLabel(zb)}${za ? ` et ${zoneLabel(za)}` : ''}`, `Dossier ${r.suspect} : « un travail d’équipe exemplaire ».`, r.vers);
          } else {
            r.etape = 'saisie'; r.tour = T + 1;
            zb.rapport.push(`Saisie chez ${r.suspect} : de l’argent liquide (${RELEVE.saisie.argent} k€) et une voiture, à partager avec ${zoneLabel(za)}. Choisis ta part demain, avant 20:00 (sans réponse : l’argent).`);
            za.rapport.push(`Saisie chez ${r.suspect} : de l’argent et une voiture, à partager. ${zoneLabel(zb)} choisit sa part demain, tu auras l’autre.`);
            continue;
          }
        }
      } else {
        zb.rapport.push(`Relève à ${lieu} : ${r.suspect} vous a filé entre les doigts (${equipe} ; il en fallait ${RELEVE.requis} pour être sûr). Pas d’autre conséquence.`);
        if (za) za.rapport.push(`${zoneLabel(zb)} a pris ta relève, mais ${r.suspect} lui a filé entre les doigts.`);
      }
      r.etape = 'fini';
    } else if (choix && choix.choix === 'transmettre' && ciblesTransmission(state, r, T).includes(choix.vers)) {
      const fr = zonesVoisines(state, r.vers)[choix.vers];
      nouvelles.push({ ...r, id: `${r.id}t`, vers: choix.vers, par: r.vers, transmis: true, cell: fr ? fr.chezLui : r.cell, tour: T + 1, etape: 'proposee' });
      zb.rapport.push(`Relève transmise : ${r.suspect} part vers ${zoneLabel(Z(choix.vers))}, mieux placée pour le cueillir.`);
      if (za) za.rapport.push(`${zoneLabel(zb)} n’avait pas la main : elle transmet ${r.suspect} à ${zoneLabel(Z(choix.vers))}.`);
      push(4, 'Relève', `${r.suspect.charAt(0).toUpperCase()}${r.suspect.slice(1)} poursuit sa route vers ${zoneLabel(Z(choix.vers))}`, `${zoneLabel(zb)} passe le relais à son tour.`, choix.vers);
      r.etape = 'fini';
    } else {
      const refus = choix && choix.choix === 'refuser';
      if (zb) zb.rapport.push(refus ? `Relève déclinée (${r.suspect}) : pas l’effectif ce soir. Aucune conséquence.` : `Relève sans réponse (${r.suspect}) : le suspect s’est évaporé. Aucune conséquence.`);
      if (za) za.rapport.push(`${zb ? zoneLabel(zb) : 'Ta voisine'} ${refus ? 'n’avait pas l’effectif' : 'n’a pas répondu'} : ${r.suspect} s’évapore.`);
      r.etape = 'fini';
    }
  }
  state.releves = [...actives(state).filter((x) => x.etape !== 'fini'), ...nouvelles];
  return { prises };
}

/**
 * Après la simulation : les fuites de la soirée deviennent des relèves pour demain.
 * `fuites` : [{ de, titre, cause }] dans l'ordre où elles sont arrivées.
 */
export function releveNuit(state, fuites, T, { push, zoneLabel }) {
  if (!RELEVE.actif || !fuites.length) return;
  if (!Array.isArray(state.releves)) state.releves = [];
  const c = carteQuartiers(state);
  const occupees = new Set(actives(state).filter((r) => r.tour === T + 1 && r.etape === 'proposee').map((r) => r.vers));
  const lancees = new Set();
  for (const f of fuites) {
    if (lancees.has(f.de) || !state.zones[f.de]) continue;
    const rng = makeRng(`${state.seed}:s${state.season}:t${T}:releve-nuit:${f.de}`);
    const vois = zonesVoisines(state, f.de);
    const cibles = Object.keys(vois).filter((u) => !occupees.has(u) && peutRecevoir(state.zones[u], T + 1)).sort();
    if (!cibles.length) continue;
    // De préférence une voisine qui a joué ce soir (elle a plus de chances de voir la relève demain).
    const presentes = cibles.filter((u) => (state.zones[u].toursSansOrdres || 0) === 0);
    const vers = rng.pick(presentes.length ? presentes : cibles);
    occupees.add(vers); lancees.add(f.de);
    const suspect = rng.pick(SUSPECTS);
    const r = { id: `r${state.season}-${T}-${f.de}`, origine: f.de, vers, par: null, transmis: false, suspect, titre: f.titre || '', cause: f.cause, cell: vois[vers].chezLui, tour: T + 1, etape: 'proposee' };
    state.releves.push(r);
    const za = state.zones[f.de], zb = state.zones[vers];
    za.rapport.push(`${f.cause} : ${suspect} a pris la fuite vers ${zoneLabel(zb)}. Relève proposée demain ; tu peux lui envoyer jusqu’à ${RELEVE.appuiMax} agents d’appui.`);
    push(5, 'Relève', `${suspect.charAt(0).toUpperCase()}${suspect.slice(1)} file vers ${c.nomDe(Number(r.cell))}`, `${zoneLabel(za)} passe le relais à ${zoneLabel(zb)}. Le prendra-t-elle ?`, vers);
  }
}
