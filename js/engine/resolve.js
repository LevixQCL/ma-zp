// Résolution d'un tour. Fonction pure et déterministe :
// mêmes données en entrée → même résultat, quel que soit l'ordinateur qui calcule.

import {
  APP_VERSION, SERVICES, SERVICE_LABELS, SEASON_LENGTH, ECONOMIE, RYTHMES, DELAI_ACADEMIE, DUREE_FORMATION, INFRAS, PS,
  MIN_TOURS_CLASSEMENT, START, DEPENSES,
} from './constants.js';
import { makeRng } from './rng.js';
import {
  clone, clamp, round1, newZone, sanitizeOrders, autopilotOrders, agentsDisponibles, capacite,
  forceEngagement, coutDecision, decisionImpossible, ipzComposantes, ipzFrom, moyenneIpz, blessesActifs, migrateZone, effetsOperation, coutDepenses,
} from './zone.js';
import { enquetePre, enqueteZone, enquetePost, nouvelleAffaire, indiceBonus } from './enquete.js';
import { fipaPre, fipaGenerer } from './fipa.js';
import { rivalitesPre, rivalitesPost, bonusPoste, themeActif, appliquerConsignes, absT, MAN } from './rivalites.js';
import { AFFAIRES_DISPUTEES, DOSSIERS_LOCAUX, EVENEMENTS_COLLECTIFS, COUPS_DURS, ALEAS, OPERATIONS, PRESSIONS, PRESSION_WEEKEND } from './contenu.js';

const fmt1 = (v) => String(round1(v)).replace('.', ',');
const median = (arr) => {
  if (!arr.length) return undefined;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function zoneLabel(z) { return `ZP ${z.code} ${z.nom}`; }

/** Zone d'un nouveau joueur : ressources médianes des zones actives, sans infrastructure. */
export function buildJoinZone(state, uid, profile, turn = state.turn) {
  const existants = Object.values(state.zones).filter((z) => isActive(z) && z.uid !== uid);
  const base = {};
  if (existants.length) {
    base.agents = Math.round(median(existants.map((z) => z.agents)));
    base.budget = round1(median(existants.map((z) => z.budget)));
    base.moral = Math.round(median(existants.map((z) => z.moral)));
    base.satisfaction = Math.round(median(existants.map((z) => z.satisfaction)));
    base.niveaux = {}; base.equip = {};
    for (const s of SERVICES) {
      base.niveaux[s] = Math.round(median(existants.map((z) => z.niveaux[s])));
      base.equip[s] = Math.round(median(existants.map((z) => z.equip[s])));
    }
  }
  const z = newZone({ uid, code: profile.code, nom: profile.nom, couleur: profile.couleur }, turn, base);
  z.protegeJusqua = absT(state, turn) + MAN.protectionTours;
  return z;
}

/**
 * Met un état enregistré par une ancienne version au format actuel :
 * les nouveaux champs reçoivent leur valeur par défaut, rien n'est effacé.
 */
export function migrateState(state) {
  if (!state) return state;
  const defaults = { version: 1, season: 1, turn: 1, zones: {}, affaires: [], evenement: null, affaireSeq: 0, palmares: [], minClientVersion: 0, enquete: null, enqueteSeq: 0, traques: [], fipas: [], fipaSeq: 0, fipaPaires: {}, duels: [], postes: [], conseil: null, theme: null, motionsChef: [], toursSansFaillite: 0, aReveler: [] };
  for (const [k, v] of Object.entries(defaults)) if (state[k] === undefined) state[k] = v;
  for (const z of Object.values(state.zones)) migrateZone(z);
  return state;
}

/** Vrai si cet appareil utilise une version du jeu plus ancienne que celle de la partie. */
export function isOutdated(state) {
  return !!state && (state.minClientVersion || 0) > APP_VERSION;
}

export function isActive(z) { return z.toursSansOrdres < 3; }

/** Crée une nouvelle partie. */
export function createGame({ seed = 'delta', turnDeadline = 0 } = {}) {
  const state = {
    version: 1, minClientVersion: APP_VERSION, seed, season: 1, turn: 1, nextDeadline: turnDeadline,
    zones: {}, affaires: [], evenement: null, affaireSeq: 0, palmares: [], createdAt: turnDeadline,
  };
  genererAffaires(state, makeRng(`${seed}:s1:t0:affaires`));
  nouvelleAffaire(state);
  return state;
}

function genererAffaires(state, rng) {
  const actives = Object.values(state.zones).filter(isActive).length;
  const cible = clamp(Math.ceil(Math.max(actives, 1) / 3), 1, 3);
  const deja = new Set(state.affaires.map((a) => a.titre));
  while (state.affaires.length < cible) {
    const titre = rng.pick(AFFAIRES_DISPUTEES.filter((t) => !deja.has(t)));
    deja.add(titre);
    const forceMin = rng.int(3, 7);
    state.affaires.push({
      id: `a${state.season}-${++state.affaireSeq}`,
      titre, recompense: rng.int(6, 14), forceMin, forceConseillee: forceMin + 2, tours: 2,
      pos: { x: rng.int(40, 320), y: rng.int(30, 300) },
    });
  }
}

/**
 * Résout le tour `state.turn`.
 * @param {object} state  état de la partie
 * @param {object} input  { orders: {uid: ordres}, quests: {uid: quête}, players: {uid: profil} }
 * @returns {{ state: object, gazette: object }}
 */
export function resolveTurn(stateIn, { orders = {}, quests = {}, players = {}, nextWeekday = null } = {}) {
  const state = migrateState(clone(stateIn));
  state.minClientVersion = Math.max(state.minClientVersion || 0, APP_VERSION);
  const T = state.turn;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}`);
  const news = [];            // brèves de la Gazette
  const push = (prio, kicker, titre, texte, uid) => news.push({ prio, kicker, titre, texte, uid });

  // 1. Joueurs inscrits sans zone (filet de sécurité) : ils jouent au tour suivant.
  for (const [uid, p] of Object.entries(players)) {
    if (state.zones[uid] || !p || p.retire) continue;
    state.zones[uid] = buildJoinZone(state, uid, p, T + 1);
    push(3, 'Bienvenue', `${zoneLabel(state.zones[uid])} rejoint le District Delta`, 'Nouvelle zone en service dès demain.', uid);
  }
  for (const z of Object.values(state.zones)) {
    if (z.joinedTurn === T && z.toursJoues === 0 && !z._annoncee) {
      push(3, 'Bienvenue', `${zoneLabel(z)} rejoint le District Delta`, 'Une nouvelle zone entre en service.', z.uid);
    }
  }
  // Mise à jour des noms, codes et couleurs (renommage) et retraits.
  for (const [uid, z] of Object.entries(state.zones)) {
    const p = players[uid];
    if (p) { if (p.nom) z.nom = String(p.nom).slice(0, 24); if (p.code) z.code = String(p.code).slice(0, 4); if (p.couleur) z.couleur = p.couleur; }
    if (p && p.retire) delete state.zones[uid];
  }

  const uids = Object.keys(state.zones).filter((u) => state.zones[u].joinedTurn <= T).sort();

  // 2. Ordres de chaque zone (joués ou pilote automatique).
  const ord = {};
  for (const uid of uids) {
    const z = state.zones[uid];
    z.rapport = [];
    if (orders[uid]) {
      ord[uid] = sanitizeOrders(z, orders[uid], state);
      z.toursSansOrdres = 0;
      z.dernierOrdre = { alloc: ord[uid].alloc, rythme: ord[uid].rythme };
      z._joue = true;
    } else {
      ord[uid] = autopilotOrders(z, state);
      if (players[uid] && players[uid].consignes) ord[uid] = sanitizeOrders(z, appliquerConsignes(z, ord[uid], players[uid].consignes, state), state);
      z.toursSansOrdres += 1;
      z._joue = false;
      z.rapport.push('Pas d’ordres ce tour : le pilote automatique a repris la dernière répartition.');
    }
    z._points = 0;
    z._ps = 0;
  }

  // Relations entre zones (entraide, manœuvres, duels, Conseil).
  const riv = rivalitesPre(state, uids, ord, push, T);
  const theme = themeActif(state, T);

  // Enquête (partages, accusations, traques) et FIPA : avant la simulation des zones.
  const pre = enquetePre(state, uids, ord, push, T);
  const fp = fipaPre(state, uids, ord, push, T);

  // 3. Affaires disputées.
  for (const aff of state.affaires) {
    const engages = uids.filter((u) => ord[u].engagements[aff.id]);
    if (!engages.length) continue;
    // Groupes : une opération conjointe exige une désignation réciproque.
    const groupes = [];
    const vus = new Set();
    for (const u of engages) {
      if (vus.has(u)) continue;
      const p = ord[u].engagements[aff.id].partenaire;
      if (p && ord[p] && ord[p].engagements[aff.id] && ord[p].engagements[aff.id].partenaire === u && !vus.has(p)) {
        groupes.push([u, p]); vus.add(u); vus.add(p);
      } else { groupes.push([u]); vus.add(u); }
    }
    const force = (g) => g.reduce((s, u) => s + forceEngagement(state.zones[u], ord[u].engagements[aff.id].agents) * bonusPoste(state, u, engages.filter((x) => !g.includes(x)), ord, T), 0);
    const scored = groupes.map((g) => ({ g, f: force(g) })).sort((a, b) => b.f - a.f);
    const best = scored[0];
    if (best.f < aff.forceMin) {
      for (const { g } of scored) for (const u of g) state.zones[u].rapport.push(`${aff.titre} : force insuffisante, l’affaire reste ouverte.`);
      continue;
    }
    const gagnants = scored.filter((s) => Math.abs(s.f - best.f) < 1e-9).flatMap((s) => s.g);
    const part = aff.recompense / gagnants.length;
    for (const u of gagnants) {
      const z = state.zones[u];
      z._points += part; z.stats.pointsAffaires += part; z.stats.affairesGagnees += 1;
      z.satisfaction += part * 0.5; z.moral += 2;
      if (gagnants.length > 1) z.reputation += 1;
      z.rapport.push(`${aff.titre} : affaire remportée (+${fmt1(part)} pts).`);
    }
    for (const { g } of scored) for (const u of g) {
      if (gagnants.includes(u)) continue;
      const z = state.zones[u];
      const n = ord[u].engagements[aff.id].agents;
      if (n > 5) { z.moral -= 3; z.rapport.push(`${aff.titre} : échec public avec ${n} agents engagés (−3 de moral).`); }
      else z.rapport.push(`${aff.titre} : une autre zone l’a emporté.`);
    }
    const noms = gagnants.map((u) => zoneLabel(state.zones[u]));
    const titre = noms.length > 1 ? `${noms.join(' et ')} remportent ensemble : ${aff.titre.toLowerCase()}` : `${noms[0]} remporte l’affaire : ${aff.titre.toLowerCase()}`;
    const perdants = scored.filter((s) => !gagnants.includes(s.g[0])).flatMap((s) => s.g).map((u) => zoneLabel(state.zones[u]));
    push(8 + aff.recompense / 4, 'Affaire disputée', titre,
      `${aff.recompense} points en jeu${gagnants.length > 1 ? ', partagés' : ''}.${perdants.length ? ` ${perdants.join(', ')} repart${perdants.length > 1 ? 'ent' : ''} bredouille${perdants.length > 1 ? 's' : ''}.` : ''}`);
    aff._resolue = true;
  }

  // 4. Événement collectif.
  let evResultat = null;
  if (state.evenement && state.evenement.tour === T) {
    const ev = state.evenement;
    const actives = uids.filter((u) => state.zones[u].toursSansOrdres < 3 || ord[u].evenement > 0);
    const requis = Math.max(3, 3 * actives.length);
    const total = uids.reduce((s, u) => s + ord[u].evenement, 0);
    const reussi = total >= requis;
    const absents = actives.filter((u) => ord[u].evenement === 0);
    for (const u of uids) {
      const z = state.zones[u];
      const c = ord[u].evenement;
      if (c > 0) {
        z.stats.contributions += 1;
        z._ps += PS.evenement;
        if (reussi) z.reputation += Math.max(1, Math.round(10 * c / total));
      } else if (actives.includes(u)) z.stats.evenementsManques += 1;
      if (reussi) { z.satisfaction += 8; z.rapport.push(`${ev.titre} : réussi (+8 de satisfaction).`); }
      else { z.satisfaction -= 10; z.rapport.push(`${ev.titre} : échec, ${total} agents sur ${requis} (−10 de satisfaction).`); }
    }
    evResultat = { titre: ev.titre, reussi, total, requis, absents: absents.map((u) => zoneLabel(state.zones[u])) };
    push(12, ev.titre, reussi ? `Mission accomplie : ${total} agents pour ${requis} requis` : `Raté : ${total} agents pour ${requis} requis`,
      reussi ? 'Tout le district gagne 8 points de satisfaction.' : `Tout le district perd 10 points de satisfaction.${absents.length ? ` Aucun agent envoyé par : ${evResultat.absents.join(', ')}.` : ''}`);
    state.evenement = null;
  }

  // 5. Simulation locale de chaque zone.
  for (const uid of uids) {
    const z = state.zones[uid];
    const o = ord[uid];
    const zr = makeRng(`${state.seed}:s${state.season}:t${T}:${uid}`);
    const q = quests[uid];

    // Photo de la veille, pour montrer les évolutions au joueur.
    z.hier = { moral: z.moral, satisfaction: z.satisfaction, reputation: z.reputation, budget: z.budget, ipz: z.ipz, turn: T };

    // Fins de formation, arrivées de l'académie.
    for (const f of z.formations) if (f.fin === T) { z.niveaux[f.service] = Math.min(5, z.niveaux[f.service] + 1); z.rapport.push(`Formation terminée : ${SERVICE_LABELS[f.service]} passe au niveau ${z.niveaux[f.service]}.`); }
    const arrivees = z.academie.filter((a) => a.arrivee === T).reduce((s, a) => s + a.n, 0);
    if (arrivees) { z.agents += arrivees; z.rapport.push(`${arrivees} recrue${arrivees > 1 ? 's' : ''} sort${arrivees > 1 ? 'ent' : ''} de l’académie.`); }
    z.academie = z.academie.filter((a) => a.arrivee > T);

    // Aléa léger et coup dur (effets immédiats sur ce tour ou les suivants).
    let adminMult = 1;
    if (zr.chance(0.22)) {
      const a = zr.pick(ALEAS);
      const e = a.effet;
      if (e.moral) z.moral += e.moral;
      if (e.budget) z.budget += e.budget;
      if (e.satisfaction) z.satisfaction += e.satisfaction;
      if (e.paperasse) z.paperasse = Math.max(0, z.paperasse + e.paperasse);
      if (e.adminMult) adminMult *= e.adminMult;
      if (e.vehiculeHS) z.vehiculesHS.push({ retour: T + 1 });
      z.rapport.push(`${a.titre} : ${a.texte}`);
      push(2, 'Insolite', `${zoneLabel(z)} : ${a.titre.charAt(0).toLowerCase()}${a.titre.slice(1)}`, a.texte, uid);
    }
    let coupDur = null;
    if (zr.chance(0.13)) {
      const pool = COUPS_DURS.map((c) => {
        let w = c.w;
        if (c.id === 'rebellion') { if (z.niveaux.intervention >= 3) w *= 0.5; if (z.equip.intervention >= 3) w *= 0.7; }
        if (c.id === 'grippe') { if (z.moral > 70) w *= 0.5; if (z.infra.sport) w *= 0.6; }
        if (c.id === 'accident' && z.infra.garage) w *= 0.5;
        if (c.id === 'plainte') { if (z.paperasse < 8) w *= 0.5; if (z.reputation > 60) w *= 0.6; }
        if (c.id === 'panne' && z.infra.logiciel) w *= 0.4;
        return { ...c, w };
      });
      coupDur = zr.weighted(pool);
    }
    if (!coupDur && z.renforceSuite >= 3 && o.rythme === 'renforce' && zr.chance(0.5)) coupDur = { id: 'epuisement', titre: 'Épuisement' };
    if (coupDur) {
      let texte = '';
      switch (coupDur.id) {
        case 'rebellion': {
          const n = zr.int(1, 2), duree = zr.int(2, 4);
          z.blesses.push({ n, retour: T + 1 + duree, motif: 'blessé' }); z.moral -= 4;
          texte = `${n} agent${n > 1 ? 's' : ''} blessé${n > 1 ? 's' : ''}, absent${n > 1 ? 's' : ''} ${duree} tours. −4 de moral.`; break;
        }
        case 'grippe': {
          const n = Math.max(1, Math.round(z.agents * zr.float(0.1, 0.2)));
          z.blesses.push({ n, retour: T + 3, motif: 'malade' });
          texte = `${n} agents malades, absents 2 tours.`; break;
        }
        case 'accident': {
          z.vehiculesHS.push({ retour: T + 4 }); z.blesses.push({ n: 1, retour: T + 2, motif: 'blessé' });
          texte = 'Un véhicule hors service 3 tours, un agent absent 1 tour.'; break;
        }
        case 'plainte': {
          z.satisfaction -= 6; z.blesses.push({ n: 1, retour: T + 3, motif: 'enquête interne' });
          texte = '−6 de satisfaction, un agent bloqué en administration 2 tours.'; break;
        }
        case 'panne': { adminMult = 0; texte = 'Administration à l’arrêt ce tour.'; break; }
        case 'epuisement': {
          z.blesses.push({ n: 1, retour: T + 6, motif: 'épuisé' });
          texte = 'Trop d’heures supplémentaires : un agent absent 5 tours.'; break;
        }
        default: break;
      }
      z.rapport.push(`Coup dur, ${coupDur.titre.toLowerCase()} : ${texte}`);
      push(coupDur.id === 'rebellion' ? 9 : 5, 'Coup dur', `${coupDur.titre} à ${zoneLabel(z)}`, texte, uid);
    }

    // Quêtes du jour (jusqu'à 3) : bonus au choix dès 2 bonnes réponses.
    let bonusService = null;
    const qs = (Array.isArray(q) ? q : q ? [q] : []).filter(Boolean);
    const ok = qs.filter((x) => x.statut === 'ok').length;
    const faux = qs.filter((x) => x.statut === 'rate').length;
    if (qs.length) {
      z.stats.quetesOk += ok;
      z._ps += ok * PS.queteOk + faux * PS.queteTentee;
      if (faux) z.moral -= faux;
      const b = qs.find((x) => x.bonus);
      let txt = `Quêtes du jour : ${ok} bonne${ok > 1 ? 's' : ''} réponse${ok > 1 ? 's' : ''} sur ${qs.length}${faux ? ` (−${faux} de moral)` : ''}`;
      if (ok >= 2 && b) {
        if (b.bonus === 'moral') { z.moral += 3; txt += ', bonus +3 de moral'; }
        else if (b.bonus === 'budget') { z.budget += 2; txt += ', bonus +2 k€'; }
        else if (b.bonus === 'indice') { txt += indiceBonus(state, z, zr) ? ', bonus +1 indice d’enquête' : ', bonus indice (rien de nouveau à trouver)'; }
        else if (b.bonus === 'capacite' && SERVICES.includes(b.service)) { bonusService = b.service; txt += `, bonus +10 % en ${SERVICE_LABELS[b.service]}`; }
      }
      if (ok === 3) { z._ps += 5; txt += ', sans faute (+5 PS)'; }
      z.rapport.push(`${txt}.`);
    }

    // Situation du jour (annoncée au début du tour).
    const pr = {};
    for (const p of z.pressions || []) Object.assign(pr, p.effet);
    if (pr.criminalite) z.criminalite = clamp(z.criminalite + pr.criminalite, 10, 95);
    if (pr.paperasse) z.paperasse += pr.paperasse;

    // Opération d'envergure : ses agents quittent leur service pour la journée.
    const opx = effetsOperation(z, o.alloc, o.operation, T);
    const alloc = opx.eff;
    // Agents partis en traque, en audition ou en FIPA.
    for (const pr2 of [pre.prises[uid], fp.prises[uid]]) {
      if (!pr2) continue;
      for (const [s, n] of Object.entries(pr2)) alloc[s] = Math.max(0, (alloc[s] || 0) - n);
      const n = Object.values(pr2).reduce((a2, b2) => a2 + b2, 0);
      if (n && pr2 === fp.prises[uid]) z.rapport.push(`FIPA : ${n} agent${n > 1 ? 's' : ''} mobilisé${n > 1 ? 's' : ''} sur le dispositif commun.`);
    }
    if (opx.op) {
      const op = opx.op;
      op.couvertures = [...(op.couvertures || []), round1(opx.couverture)];
      const n = Object.values(opx.pris).reduce((s2, v) => s2 + v, 0);
      z.rapport.push(`${op.titre} : ${n} agent${n > 1 ? 's' : ''} mobilisé${n > 1 ? 's' : ''} (${Math.round(opx.couverture * 100)} % du dispositif requis).`);
      if (T === op.tourDebut + op.duree - 1) {
        const moy = op.couvertures.reduce((s2, v) => s2 + v, 0) / op.couvertures.length;
        if (moy >= 0.9) {
          z._points += op.recompense; z.satisfaction += 6; z.reputation += 3; z.moral += 2;
          z.rapport.push(`${op.titre} : opération réussie (+${op.recompense} pts, +6 de satisfaction).`);
          push(10, 'Opération réussie', `${zoneLabel(z)} : ${op.titre.charAt(0).toLowerCase()}${op.titre.slice(1)}, dispositif exemplaire`, `Tous les services ont tenu. +${op.recompense} points.`, uid);
        } else if (moy >= 0.5) {
          const pts = Math.round(op.recompense * 0.4);
          z._points += pts; z.satisfaction += 1;
          z.rapport.push(`${op.titre} : réussite partielle, dispositif incomplet (+${pts} pts).`);
          push(6, 'Opération', `${zoneLabel(z)} : ${op.titre.charAt(0).toLowerCase()}${op.titre.slice(1)}, résultat mitigé`, 'Le dispositif était incomplet.', uid);
        } else {
          z.satisfaction -= 10; z.moral -= 4; z.reputation -= 2;
          z.rapport.push(`${op.titre} : échec, dispositif insuffisant (−10 de satisfaction, −4 de moral).`);
          push(11, 'Fiasco', `${op.titre} : ${zoneLabel(z)} dépassée`, 'Le dispositif engagé était bien trop léger. La population ne comprend pas.', uid);
        }
      }
    }

    // Dépenses du jour (payées seulement si le budget le permet).
    const dep = o.depenses || {};
    let reserve = 0;
    if (dep && coutDepenses(dep) > 0) {
      const achats = [];
      const payer = (k, cout, fn) => { if (z.budget >= cout) { z.budget -= cout; fn(); achats.push(k); } else achats.push(`${k} (refusé : budget insuffisant)`); };
      if (dep.reserve) payer(`${dep.reserve} agent${dep.reserve > 1 ? 's' : ''} de réserve en ${SERVICE_LABELS[dep.reserveService]}`, dep.reserve * DEPENSES.reserve.cout, () => { reserve = dep.reserve; });
      if (dep.prime) payer('prime au personnel (+4 de moral)', DEPENSES.prime.cout, () => { z.moral += 4; });
      if (dep.prevention) payer('campagne de prévention (criminalité −6)', DEPENSES.prevention.cout, () => { z.criminalite = clamp(z.criminalite - 6, 10, 95); });
      if (dep.soustraitance) payer('sous-traitance administrative (−5 dossiers)', DEPENSES.soustraitance.cout, () => { z.paperasse = Math.max(0, z.paperasse - 5); });
      z.rapport.push(`Dépenses du jour : ${achats.join(', ')}.`);
    }

    // Capacités des services (avec les agents restés à leur poste, plus la réserve).
    const cap = {};
    for (const s of SERVICES) {
      const renfort = reserve && dep.reserveService === s ? reserve * 0.8 : 0;
      const bTheme = theme && ((theme.id === 'routiere' && s === 'roulage') ? 1.5 : (theme.id === 'proximite' && s === 'proximite') ? 1.3 : 1) || 1;
      cap[s] = capacite(z, s, alloc[s] + renfort, { rythme: o.rythme, turn: T, bonus: (bonusService === s ? 1.1 : 1) * bTheme, adminMult });
    }

    // Enquête : démarches et enquête de voisinage.
    enqueteZone(state, z, o, makeRng(`${state.seed}:s${state.season}:t${T}:${uid}:enq`), cap, pre);

    // Intervention : incidents du jour.
    const incidents = clamp(Math.round(1.5 + z.criminalite / 14) + (pr.incidents || 0) + zr.int(-1, 1), 1, 14);
    const traites = Math.min(incidents, Math.floor(cap.intervention / 1.1));
    const rates = incidents - traites;
    z.stats.incidents += incidents; z.stats.traites += traites;
    z.satisfaction += traites * 0.5 - rates * 1.8;
    if (rates >= 3) z.moral -= 2;
    z.rapport.push(`Intervention : ${traites} incident${traites > 1 ? 's' : ''} traité${traites > 1 ? 's' : ''} sur ${incidents}.`);
    if (pr.bourgmestre) {
      if (rates === 0) { z.satisfaction += 4; z.rapport.push('Visite du bourgmestre : aucun incident raté, +4 de satisfaction.'); }
      else { z.satisfaction -= 4; z.rapport.push(`Visite du bourgmestre : ${rates} incident${rates > 1 ? 's' : ''} raté${rates > 1 ? 's' : ''}, −4 de satisfaction.`); }
    }

    // Proximité : prévention.
    z.criminalite = clamp(z.criminalite + 2.4 + zr.float(-1, 1) - cap.proximite * 0.6, 10, 95);
    z.satisfaction += cap.proximite * 0.12;
    if (z.criminalite > 55) {
      const malus = (z.criminalite - 55) * 0.12;
      z.satisfaction -= malus;
      if (z.criminalite > 70) z.rapport.push(`Criminalité élevée (${Math.round(z.criminalite)}) : le quartier s\u2019inquiète (−${Math.round(malus * 10) / 10} de satisfaction). Renforce la Proximité.`);
    }

    // Recherche : dossiers locaux.
    let nouveauDossier = 0;
    if (zr.chance(0.6)) {
      const reste = zr.int(6, 14);
      z.dossiers.push({ id: ++z.dossierSeq, titre: zr.pick(DOSSIERS_LOCAUX), reste, total: reste, points: Math.round(reste / 2), age: 0 });
      nouveauDossier = 1;
    }
    let travail = cap.recherche;
    let resolus = 0;
    for (const d of z.dossiers) {
      if (travail <= 0) break;
      const t = Math.min(travail, d.reste);
      d.reste = round1(d.reste - t); travail -= t;
      if (d.reste <= 0.05) {
        resolus += 1; z._points += d.points; z.satisfaction += 2;
        z.rapport.push(`Recherche : dossier « ${d.titre} » élucidé (+${d.points} pts).`);
      }
    }
    z.dossiers = z.dossiers.filter((d) => d.reste > 0.05);
    for (const d of z.dossiers) { d.age += 1; if (d.age > 6) z.satisfaction -= 0.4; }
    if (pr.parquet) {
      const vieux = z.dossiers.filter((d) => d.age > 4).length;
      if (vieux) { z.satisfaction -= vieux; z.rapport.push(`Le parquet réclame ${vieux} dossier${vieux > 1 ? 's' : ''} en retard (−${vieux} de satisfaction).`); }
    }
    z.stats.dossiersResolus += resolus;

    // Roulage : amendes et sécurité routière.
    const recettes = cap.roulage * ECONOMIE.amendeParCapacite;
    const totalAlloc = SERVICES.reduce((s, k) => s + alloc[k], 0) || 1;
    if (pr.roulageMin) {
      if (alloc.roulage >= pr.roulageMin) { z.satisfaction += 2; z.rapport.push('Contrôles de vitesse demandés par les riverains : assurés (+2 de satisfaction).'); }
      else { z.satisfaction -= 3; z.rapport.push('Contrôles de vitesse demandés par les riverains : pas assez d\u2019agents (−3 de satisfaction).'); }
    }
    if (alloc.roulage / totalAlloc > 0.25 && !z.infra.anpr && !(theme && theme.id === 'routiere')) {
      z.satisfaction -= 2; z.rapport.push('Roulage : plus de 25 % des effectifs, effet « chasse aux PV » (−2 de satisfaction).');
    } else z.satisfaction += cap.roulage * 0.1;

    // Administration : la pile de paperasse.
    z.paperasse = Math.max(0, z.paperasse + traites * 0.4 + nouveauDossier + 1.2 - cap.admin * 1.2);
    z.paperassePic = Math.max(z.paperassePic || 0, z.paperasse);
    if (z.paperasse > 14) { z.moral -= 2; z.satisfaction -= 1; z.rapport.push(`Paperasse : ${Math.round(z.paperasse)} dossiers en attente (−2 de moral).`); }

    // Grande décision.
    const dec = o.decision;
    if (dec) {
      const refus = decisionImpossible(z, dec, T);
      if (refus) z.rapport.push(`Décision refusée : ${refus}.`);
      else {
        z.budget -= coutDecision(z, dec);
        if (dec.type === 'recruter') { z.academie.push({ n: dec.n, arrivee: T + DELAI_ACADEMIE }); z.rapport.push(`${dec.n} recrue${dec.n > 1 ? 's' : ''} à l’académie, arrivée dans ${DELAI_ACADEMIE} tours.`); }
        if (dec.type === 'former') { z.formations.push({ service: dec.service, fin: T + DUREE_FORMATION + 1 }); z.rapport.push(`Formation lancée : ${SERVICE_LABELS[dec.service]} (2 agents indisponibles ${DUREE_FORMATION} tours).`); }
        if (dec.type === 'equiper') {
          if (dec.cible === 'vehicule') { z.usure = z.usure * z.vehicules / (z.vehicules + 1); z.vehicules += 1; z.rapport.push('Nouveau véhicule livré.'); }
          else { z.equip[dec.cible] += 1; z.rapport.push(`Équipement ${SERVICE_LABELS[dec.cible]} au niveau ${z.equip[dec.cible]}.`); }
        }
        if (dec.type === 'construire') { z.infra[dec.infra] = true; z.rapport.push(`Infrastructure construite : ${INFRAS[dec.infra].nom}.`); push(4, 'Chantier', `${zoneLabel(z)} inaugure : ${INFRAS[dec.infra].nom.toLowerCase()}`, INFRAS[dec.infra].effet + '.', uid); }
      }
    }

    // Budget du tour.
    const salaires = z.agents * ECONOMIE.salaire;
    const entretien = z.vehicules * ECONOMIE.entretienVehicule;
    z.budget += ECONOMIE.dotation + recettes - salaires - entretien - RYTHMES[o.rythme].cout;
    z.usure = clamp(z.usure + (z.infra.garage ? 1 : 2), 0, 60);

    // Moral.
    z.moral += (60 - z.moral) * 0.08 + RYTHMES[o.rythme].moral + (z.infra.sport ? 1 : 0);
    if (z.budget < 0) z.moral -= 3;
    z.renforceSuite = o.rythme === 'renforce' ? z.renforceSuite + 1 : 0;

    // Dérives naturelles.
    z.satisfaction += (50 - z.satisfaction) * 0.04;
    z.reputation += (50 - z.reputation) * 0.03;

    // Malus : chef absent, inspection générale.
    if (z.toursSansOrdres >= 2) { z.satisfaction -= 2; z.moral -= 2; z.rapport.push('Chef absent depuis plusieurs tours : −2 de satisfaction et de moral.'); }
    z.budgetNegSuite = z.budget < 0 ? z.budgetNegSuite + 1 : 0;
    if (z.inspectionCooldown > 0) z.inspectionCooldown -= 1;
    else if (z.budgetNegSuite >= 2 || z.paperasse > 20) {
      z.budget -= 5; z.satisfaction -= 5; z.inspectionCooldown = 4;
      const motif = z.paperasse > 20 ? 'paperasse débordante' : 'budget dans le rouge';
      z.rapport.push(`Inspection générale (${motif}) : amende de 5 k€ et −5 de satisfaction.`);
      push(7, 'Inspection générale', `L’Inspection débarque à ${zoneLabel(z)}`, `Motif : ${motif}. Amende de 5 k€.`, uid);
    }

    // Bornes.
    z.moral = clamp(z.moral, 0, 100);
    z.satisfaction = clamp(z.satisfaction, 0, 100);
    z.reputation = clamp(z.reputation, 0, 100);

    // Absences et démissions pour le tour suivant.
    z.absents = z.moral < 40 ? Math.ceil(z.agents * 0.1) : 0;
    if (z.moral < 20 && z.agents > 5) {
      z.agents -= 1; z.rapport.push('Moral au plus bas : un agent démissionne.');
      push(6, 'Ressources humaines', `Démission à ${zoneLabel(z)}`, 'Le moral est au plus bas.', uid);
    }
    z.blesses = z.blesses.filter((b) => b.retour > T + 1 || b.retour > T);
    z.vehiculesHS = z.vehiculesHS.filter((v) => v.retour > T + 1);
    z.formations = z.formations.filter((f) => f.fin > T);
    z.renforts = (z.renforts || []).filter((x) => x.retour > T + 1);

    // IPZ.
    const comp = ipzComposantes(z, { ratio: incidents ? traites / incidents : 1, points: z._points });
    z.ipz = ipzFrom(comp);
    z.ipzComp = comp;
    if (z._joue) {
      z.ipzSomme += z.ipz; z.toursJoues += 1;
      z._ps += PS.ordres;
    }
    z.ipzHist.push({ t: T, v: z.ipz, joue: z._joue });
    if (z.ipzHist.length > 30) z.ipzHist.shift();
    z.ps += Math.min(PS.plafondJour, z._ps);
    z.budget = round1(z.budget);
    z.criminalite = round1(z.criminalite);
    z.paperasse = round1(z.paperasse);
    z.satisfaction = round1(z.satisfaction);
    z.moral = round1(z.moral);
    z.reputation = round1(z.reputation);
  }

  // Enquête : fin d'affaire, nouvelle affaire ; nouvelles demandes de FIPA.
  enquetePost(state, pre, push);
  const rivPost = rivalitesPost(state, uids, push, T, nextWeekday, players);
  fipaGenerer(state, T, T >= SEASON_LENGTH - 3);

  // 5 bis. Situation du jour et opérations d'envergure pour le tour suivant.
  for (const z of Object.values(state.zones)) {
    const nr = makeRng(`${state.seed}:s${state.season}:t${T}:next:${z.uid}`);
    if (z.operation && T + 1 >= z.operation.tourDebut + z.operation.duree) z.operation = null;
    if (!z.operation && T + 1 >= 3 && nr.chance(0.16)) {
      const op = nr.pick(OPERATIONS);
      z.operation = { ...JSON.parse(JSON.stringify(op)), tourDebut: T + 1, couvertures: [] };
    }
    const pressions = [];
    if (nextWeekday === 5 || nextWeekday === 6) pressions.push(PRESSION_WEEKEND);
    if (nr.chance(0.75)) pressions.push(nr.pick(PRESSIONS.filter((p) => !(p.id === 'nuit' && pressions.length))));
    z.pressions = JSON.parse(JSON.stringify(pressions));
  }

  // 6. Affaires : celles non résolues restent un tour de plus, moins bien dotées.
  const nextAffaires = [];
  for (const a of state.affaires) {
    if (a._resolue) continue;
    if (a.tours > 1) nextAffaires.push({ ...a, tours: a.tours - 1, recompense: Math.max(3, Math.round(a.recompense * 0.6)) });
  }
  state.affaires = nextAffaires;

  // 7. Meilleure zone du tour.
  const joueurs = uids.map((u) => state.zones[u]);
  if (joueurs.length) {
    const top = joueurs.slice().sort((a, b) => b.ipz - a.ipz)[0];
    push(1, 'Performance', `${zoneLabel(top)} signe le meilleur IPZ du jour : ${fmt1(top.ipz)}`, '', top.uid);
  }

  // 8. Classement.
  const classement = Object.values(state.zones)
    .map((z) => ({ uid: z.uid, code: z.code, nom: z.nom, couleur: z.couleur, moyenne: moyenneIpz(z), tours: z.toursJoues, ipz: z.ipz, classe: z.toursJoues >= MIN_TOURS_CLASSEMENT }))
    .sort((a, b) => (b.classe - a.classe) || (b.moyenne - a.moyenne));

  // 9. Gazette.
  news.sort((a, b) => b.prio - a.prio);
  const gazette = {
    season: state.season, turn: T,
    une: news[0] || { kicker: 'Calme plat', titre: 'Nuit tranquille sur le District Delta', texte: 'Aucun fait marquant à signaler.' },
    breves: news.slice(1, 6),
    evenement: evResultat,
    enquete: pre.res,
    conseil: riv.conseil,
    rivalites: rivPost,
    toursSansFaillite: state.toursSansFaillite,
    fipa: fp.res,
    classement,
    rapports: Object.fromEntries(uids.map((u) => [u, state.zones[u].rapport])),
    finSaison: null,
  };
  for (const u of uids) { delete state.zones[u]._joue; delete state.zones[u]._points; delete state.zones[u]._ps; }

  // 10. Fin de saison ou tour suivant.
  if (T >= SEASON_LENGTH) {
    gazette.finSaison = finDeSaison(state, classement);
  } else {
    state.turn = T + 1;
    // Les événements collectifs sont remplacés par les FIPA (plus de nouvel événement).
  }
  genererAffaires(state, makeRng(`${state.seed}:s${state.season}:t${state.turn}:affaires`));
  return { state, gazette };
}

function finDeSaison(state, classement) {
  const zones = Object.values(state.zones);
  const classes = classement.filter((c) => c.classe);
  const titres = [];
  const give = (uid, titre) => { if (!uid) return; titres.push({ uid, titre }); state.zones[uid].titres.push(`${titre} (saison ${state.season})`); };
  if (classes[0]) give(classes[0].uid, 'Zone de l’année');
  const byRep = zones.slice().sort((a, b) => b.reputation - a.reputation)[0];
  if (byRep) give(byRep.uid, 'Collègue en or');
  const byPap = zones.slice().sort((a, b) => b.paperassePic - a.paperassePic)[0];
  if (byPap) give(byPap.uid, 'Roi de la paperasse');
  const eligibles = zones.filter((z) => z.toursJoues >= MIN_TOURS_CLASSEMENT);
  const byPass = eligibles.slice().sort((a, b) => (b.stats.evenementsManques - a.stats.evenementsManques))[0];
  if (byPass && byPass.stats.evenementsManques > 0) give(byPass.uid, 'Passager clandestin');
  const byLimier = zones.slice().sort((a, b) => b.stats.limier - a.stats.limier)[0];
  if (byLimier && byLimier.stats.limier > 0) give(byLimier.uid, 'Fin limier');
  const byQuest = zones.slice().sort((a, b) => b.stats.quetesOk - a.stats.quetesOk)[0];
  if (byQuest && byQuest.stats.quetesOk > 0) give(byQuest.uid, 'Esprit vif');

  for (const c of classes) state.zones[c.uid].ps += PS.finSaison;
  for (const c of classes.slice(0, 3)) {
    const z = state.zones[c.uid];
    if (z.failliteSaison && !z.badges.includes('Phénix')) { z.badges.push('Phénix'); titres.push({ uid: c.uid, titre: 'Phénix' }); }
  }
  const resume = { season: state.season, classement: classes.slice(0, 10), titres };
  state.palmares.push(resume);

  // Remise à zéro des zones, on garde l'identité, les PS, badges et titres.
  const oldSeason = state.season;
  state.season += 1;
  state.turn = 1;
  state.affaires = [];
  state.evenement = null;
  state.fipas = []; state.traques = []; state.fipaPaires = {}; state.duels = []; state.postes = []; state.conseil = null; state.theme = null; state.motionsChef = [];
  for (const [uid, z] of Object.entries(state.zones)) {
    state.zones[uid] = newZone({ uid, code: z.code, nom: z.nom, couleur: z.couleur }, 1, { ps: z.ps, badges: z.badges, titres: z.titres, faillites: z.faillites });
  }
  nouvelleAffaire(state);
  return { ...resume, saisonSuivante: oldSeason + 1 };
}

export { START };
