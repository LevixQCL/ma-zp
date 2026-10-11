// Le milieu, version profonde (projet « non-droit 3 », oct. 2026). Actif seulement si `state.nonDroit.v3`.
//
//  1. Le Parrain et ses lieutenants : chaque secteur de l'anneau est tenu par un lieutenant. Repris avec un bon
//     bouclage, il est arrêté et, interrogé la nuit suivante, il lâche un renseignement sur le QG (cinq sortes).
//     Mal bouclé, il file et renforce un secteur voisin (qui en lâchera deux quand il tombera). Chaque renseignement
//     différent apporté à l'assaut du QG (par une zone présente ce soir-là) : +12 % de force et −10 % de blessés.
//  2. Le secteur revit : un secteur repris a une confiance des habitants (0 à 100). Elle monte chaque nuit de calme et
//     avec la présence de la Proximité (bouclage en garde), baisse avec les gangs et les ripostes. Trois étapes :
//     repris (< 30), sécurisé (le milieu revient 30 % moins vite), rendu à la vie (60 % moins vite, retombées +30 %,
//     et des témoins repèrent un secteur voisin chaque nuit).
//  3. Le milieu s'adapte : trop de descentes sans repérage → il double ses guetteurs (pièges plus fréquents) ;
//     une zone qui écrase tout le monde → représailles annoncées sur son secteur et ses quartiers frontaliers.
//  4. Des scènes chaque soir : émeute, rodéo, livraison, perquisition, annoncées la veille sur un secteur du milieu.
//     Les agents présents sur le secteur ce soir-là la règlent ; un mini-jeu réussi (facultatif) compte double.
//  5. Les saisies (garage, recel, QG) partent à la vente aux enchères ; la moitié du prix revient aux zones qui ont saisi.
import { aAnnexe } from './constants.js';
import { makeRng } from './rng.js';
import { clamp, round1, jalon } from './zone.js';
import { carteQuartiers, assurerQuartiers } from './quartiers.js';
import { ville } from '../ui/ville.js';
import { CONFIG } from '../config.js';

export const M3 = {
  // Renseignements sur le QG
  bonusRens: 0.12, blessureRens: 0.1,
  fuiteArret: 0.5,            // au-delà, le lieutenant file
  renfortFuite: 8,            // emprise ajoutée au secteur où il se replie
  // Confiance des habitants
  confiance: { depart: 15, repere: 10, blesses: -10, calme: 4, parPresence: 4, presenceMax: 12, coup: -12, haute: -8, etapes: [30, 60] },
  remonteeEtape: [1, 0.7, 0.4], retombeesVivant: 1.3,
  // Milieu adaptatif
  guetteurs: { seuil: 3, fenetre: 3, duree: 3, pause: 4, piege: 1.6, sansRep: 0.75 },
  represailles: { part: 0.3, minZones: 3, pause: 5, force: 15, tension: 3 },
  // Scènes
  scenes: { seuil: { emeute: 5, rodeo: 4, livraison: 4, perquisition: 4 }, jeu: 3, sansFaute: 1, rep: 1, ps: 3, pts: 2, ptsJeu: 1, budget: 1.5,
    effet: { emeute: 15, rodeo: 15, perquisition: 12, livraison: 12 }, rate: { emeute: 6, livraison: 8 }, contagionRatee: 2 },
  // Chute du Parrain
  coffre: 12,                 // k€ partagés selon l'influence quand le QG tombe
  venteSaisie: 0.5,           // part du prix de vente reversée aux zones qui ont saisi
};

export const PARRAINS = ['le Baron', 'la Duchesse', 'le Marquis', 'l’Architecte', 'le Prince des Quais', 'la Reine des Docks'];
export const LIEUTENANTS = {
  deal: ['Petit Prince', 'le Facteur', 'Sifflet'],
  recel: ['la Brocante', 'la Chineuse', 'Madame Carton'],
  squat: ['le Concierge', 'Clé-de-Douze', 'le Portier'],
  garage: ['Cric', 'le Mécano', 'Jantes-Alu'],
  rodeos: ['Wheeling', 'le Pilote', 'Kawa'],
  jeux: ['la Croupière', 'la Dame de Pique', 'la Banque'],
  sommeil: ['le Proprio', 'Monsieur Loyer', 'le Bailleur'],
  contrefacon: ['la Couturière', 'la Griffe', 'Faux-Cils'],
};
export const RENSEIGNEMENTS = {
  plan: { nom: 'Plan du QG', texte: 'Les couloirs, les portes, la cave.' },
  garde: { nom: 'Relève des gardes', texte: 'Qui est de garde, et quand ils changent.' },
  compta: { nom: 'Carnet du comptable', texte: 'Où dort l’argent du réseau.' },
  armes: { nom: 'Planque des armes', texte: 'Là où ils cachent ce qui tire.' },
  issue: { nom: 'Issue de secours', texte: 'La sortie par laquelle le Parrain compte filer.' },
};
const TYPES_R = Object.keys(RENSEIGNEMENTS);
export const SCENES = {
  emeute: { titre: 'Émeute', texte: 'Le quartier s’embrase : barricades, cocktails Molotov.', jeu: 'bouclage', service: 'intervention', role: 'desc' },
  rodeo: { titre: 'Rodéo urbain', texte: 'Motos-cross et quads en roue arrière sur le boulevard.', jeu: 'luc', service: 'roulage', role: 'bouc' },
  livraison: { titre: 'Livraison au réseau', texte: 'Un chargement arrive ce soir : les téléphones du réseau s’agitent.', jeu: 'interception', service: 'recherche', role: 'rep' },
  perquisition: { titre: 'Perquisition', texte: 'Le juge a signé : il faut entrer dans l’immeuble muré.', jeu: 'crochetage', service: 'recherche', role: 'rep' },
};
export const ETAPES = [
  { id: 'repris', nom: 'Repris', texte: 'Les feux sont éteints, les habitants restent chez eux.' },
  { id: 'securise', nom: 'Sécurisé', texte: 'Les lampadaires se rallument, les gens ressortent. Le milieu revient 30 % moins vite.' },
  { id: 'vivant', nom: 'Rendu à la vie', texte: 'Les commerces rouvrent. Le milieu revient 60 % moins vite, retombées +30 %, des témoins renseignent sur les secteurs voisins.' },
];

/** Portraits (images Gemini dans img/milieu/) : un par Parrain, un par milieu pour les lieutenants. Silhouettes tant qu'ils ne sont pas livrés. */
export const PORTRAITS_PRETS = true;
export const portraitParrain = (nom) => `img/milieu/parrain-${Math.max(0, PARRAINS.indexOf(nom)) + 1}.webp`;
export const portraitLieutenant = (milieu) => `img/milieu/lt-${milieu}.webp`;
/** Scènes de ce soir (celles qui se règlent à la prochaine résolution). */
export const scenesDuSoir = (state) => (state && state.nonDroit && state.nonDroit.v3 ? (state.nonDroit.scenes || []).filter((x) => x.nuit === state.turn) : []);
/** Agents « scène » : le service d'où ils viennent. */
export const SERVICE_SCENE = { emeute: 'intervention', rodeo: 'roulage', livraison: 'recherche', perquisition: 'recherche' };

export const ndV3 = (state) => !!(state && state.nonDroit && state.nonDroit.v3);
export const etape = (s) => { const c = (s && s.confiance) || 0; return c >= M3.confiance.etapes[1] ? 2 : c >= M3.confiance.etapes[0] ? 1 : 0; };
export const multRemontee = (s) => (s && Number.isFinite(s.confiance) ? M3.remonteeEtape[etape(s)] : 1);
export const sceneId = (season, T, cell) => `nd-s${season}t${T}-${cell}`;

/** Parrain et lieutenants (créés à l'activation, y compris en cours de saison). */
export function assurerMilieu(state, nd) {
  if (!nd.v3) return;
  const rng = makeRng(`${state.seed}:s${nd.season}:parrain`);
  if (!nd.parrain) nd.parrain = { nom: rng.pick(PARRAINS), tombe: false };
  if (!nd.dossier) nd.dossier = {};           // type → uid de la zone qui détient le renseignement
  if (!nd.memoire) nd.memoire = { sansRep: [], guetteurs: null, guetteursPause: 0, represailles: {} };
  for (const [k, s] of Object.entries(nd.secteurs)) {
    if (s.coeur || s.lieutenant) continue;
    const r = makeRng(`${state.seed}:s${nd.season}:lt:${k}`);
    s.lieutenant = { nom: r.pick(LIEUTENANTS[s.milieu] || LIEUTENANTS.deal), etat: s.statut === 'repris' ? 'tombe' : 'libre', pieces: 1 };
    if (s.statut === 'repris' && !Number.isFinite(s.confiance)) s.confiance = M3.confiance.depart;
  }
}

/** Renseignements détenus par une liste de zones (types distincts). */
export function rensDe(nd, uids) {
  const set = new Set(uids);
  return TYPES_R.filter((t) => nd.dossier && set.has(nd.dossier[t]));
}

/** Modificateurs du soir pour un assaut (guetteurs, renseignements au QG). */
export function modsAssaut(state, nd, s, engages, T) {
  const out = { force: 1, blessure: 1, piege: 1, sansRep: 1, rens: [] };
  if (!nd.v3) return out;
  const g = nd.memoire && nd.memoire.guetteurs;
  if (g && g.de <= T && T <= g.a && !s.coeur) { out.piege = M3.guetteurs.piege; out.sansRep = M3.guetteurs.sansRep; }
  if (s.coeur) {
    out.rens = rensDe(nd, engages.map((e) => e.u));
    out.force = 1 + M3.bonusRens * out.rens.length;
    out.blessure = Math.max(0.4, 1 - M3.blessureRens * out.rens.length);
  }
  return out;
}

/** Retient ce qu'a été la descente du soir (pour le sort du lieutenant et la confiance de départ). */
export function noterDescente(nd, k, d) { if (nd.v3) (nd._desc ||= {})[k] = d; }

/** À la reprise d'un secteur : sort du lieutenant, confiance de départ. Renvoie des lignes de Gazette. */
export function aLaPrise(state, nd, s, k, T, parts, push, nomS) {
  if (!nd.v3) return;
  const d = (nd._desc && nd._desc[k]) || { fuite: 0, repere: false, blesses: 0 };
  const C = M3.confiance;
  s.confiance = clamp(C.depart + (d.repere ? C.repere : 0) + (d.blesses ? C.blesses : 0), 0, 100);
  if (s.coeur) return chuteParrain(state, nd, s, k, T, parts, push, nomS);
  const lt = s.lieutenant;
  if (!lt || lt.etat !== 'libre') return;
  if (d.fuite < M3.fuiteArret) {
    // Arrêté : il passe la nuit en garde à vue ; l'interrogatoire a lieu à la prochaine résolution.
    const garde = parts.find((p) => state.zones[p.uid] && aAnnexe(state.zones[p.uid], 'cachots')) || parts[0];
    lt.etat = 'garde'; lt.par = garde ? garde.uid : null; lt.le = T;
    push(6, 'Le milieu', `${cap(lt.nom)} arrêté à ${nomS}`, `Le lieutenant du Parrain passe la nuit en garde à vue${garde ? ` chez ${nomZ(state, garde.uid)}` : ''}. Interrogatoire demain.`);
  } else {
    // Il file : il se replie sur un secteur voisin encore tenu par le milieu.
    const v = (ville(CONFIG.seed).adj[Number(k)] || []).map(String).filter((x) => nd.secteurs[x] && !nd.secteurs[x].coeur && nd.secteurs[x].statut === 'milieu');
    lt.etat = 'enfui';
    if (v.length) {
      const c = v.sort((a, b) => Number(a) - Number(b))[0], cs = nd.secteurs[c];
      cs.emprise = round1(clamp(cs.emprise + M3.renfortFuite, 0, 100)); cs.max = Math.max(cs.max || 0, cs.emprise);
      if (cs.lieutenant) cs.lieutenant.pieces = (cs.lieutenant.pieces || 1) + 1;
      cs.lieutenant && (cs.lieutenant.refugie = lt.nom);
      push(6, 'Le milieu', `${cap(lt.nom)} file à ${nomSect(c)}`, `Faute de bouclage, le lieutenant a filé. Il renforce ${nomSect(c)} (emprise +${M3.renfortFuite}) ; le prendre là-bas rapportera deux renseignements.`);
    } else push(5, 'Le milieu', `${cap(lt.nom)} s’est évaporé`, 'Faute de bouclage, le lieutenant a filé. Plus de trace de lui.');
  }
}

function chuteParrain(state, nd, s, k, T, parts, push, nomS) {
  const p = nd.parrain;
  if (!p || p.tombe) return;
  p.tombe = true; p.le = T;
  for (const x of parts) {
    const z = state.zones[x.uid];
    if (!z) continue;
    const b = round1(M3.coffre * x.part);
    if (b > 0) { z.budget += b; (z._compta ||= []).push({ k: 'nondroit', l: 'Coffre du Parrain', v: b }); }
    z.stats.parrain = (z.stats.parrain || 0) + 1;
    jalon(z, `Chute de ${p.nom}`);
    z.rapport.push(`Le milieu : ${p.nom} est tombé ! Le coffre du réseau est saisi (ta part : ${fmt(b)}).`);
  }
  (nd.saisies ||= []).push({ id: 'blinde', cell: Number(k), parts: Object.fromEntries(parts.map((x) => [x.uid, round1(x.part)])), T });
  push(14, 'La chute du Parrain', `${cap(p.nom)} est tombé`, `Le Parrain du milieu est arrêté dans son QG de ${nomS}. Son coffre est saisi, son blindé partira à la prochaine vente aux enchères.`);
}

/** Début de nuit : interrogatoires des lieutenants arrêtés la veille. */
export function interrogatoires(state, nd, T, push) {
  if (!nd.v3) return;
  for (const [k, s] of Object.entries(nd.secteurs)) {
    const lt = s.lieutenant;
    if (!lt || lt.etat !== 'garde' || lt.le >= T) continue;
    lt.etat = 'tombe';
    const z = lt.par && state.zones[lt.par];
    const libres = TYPES_R.filter((t) => !nd.dossier[t]);
    const n = Math.min(libres.length, lt.pieces || 1);
    const rng = makeRng(`${state.seed}:s${nd.season}:t${T}:interro:${k}`);
    const donnes = rng.shuffle(libres).slice(0, n);
    for (const t of donnes) nd.dossier[t] = lt.par;
    if (z) {
      z.stats.renseignements = (z.stats.renseignements || 0) + donnes.length;
      z.rapport.push(donnes.length
        ? `Interrogatoire de ${lt.nom} : il parle. ${donnes.map((t) => `« ${RENSEIGNEMENTS[t].nom} »`).join(' et ')} au dossier du Parrain, chez toi. Viens à l’assaut du QG pour en faire profiter tout le monde (+${Math.round(M3.bonusRens * 100)} % de force par renseignement).`
        : `Interrogatoire de ${lt.nom} : il n’apprend rien de neuf au dossier du Parrain (déjà complet).`);
    }
    if (donnes.length) push(6, 'Le milieu', `${cap(lt.nom)} a parlé`, `${donnes.map((t) => RENSEIGNEMENTS[t].nom).join(', ')} : ${nomZ(state, lt.par)} détient ${donnes.length > 1 ? 'ces renseignements' : 'ce renseignement'} sur le QG (${Object.keys(nd.dossier).length}/${TYPES_R.length} au dossier).`);
  }
}

/** Secteur tenu ce soir : confiance des habitants. `presence` : agents en bouclage (Proximité) de garde ; `coup` : gang ou riposte. */
export function confianceNuit(nd, s, presence, coup, avant) {
  if (!nd.v3 || !Number.isFinite(s.confiance)) return;
  const C = M3.confiance, e0 = etape(s);
  let d = coup ? C.coup : C.calme;
  d += Math.min(C.presenceMax, presence * C.parPresence);
  if (s.emprise >= 40) d += C.haute;
  s.confiance = round1(clamp(s.confiance + d, 0, 100));
  s._etapeAvant = e0;
}

/** Fin de nuit : témoins des secteurs rendus à la vie, mémoire du milieu (guetteurs, représailles), scènes de demain. */
export function finDeNuit(state, nd, T, res, push, players = {}) {
  if (!nd.v3) return;
  const rng = makeRng(`${state.seed}:s${nd.season}:t${T}:milieu`);
  const adj = ville(CONFIG.seed).adj;
  // Étapes franchies (Gazette).
  for (const [k, s] of Object.entries(nd.secteurs)) {
    if (s.statut !== 'repris' || !Number.isFinite(s.confiance)) continue;
    const e = etape(s);
    if (Number.isFinite(s._etapeAvant) && e > s._etapeAvant) {
      push(e === 2 ? 7 : 5, 'Le centre revit', `${nomSect(k)} : ${ETAPES[e].nom.toLowerCase()}`, ETAPES[e].texte, s.chef);
      (res.etapes ||= []).push({ cell: Number(k), etape: e });
    }
    delete s._etapeAvant;
    // Témoins : un secteur voisin du milieu est repéré gratuitement (demain et après-demain).
    if (e === 2) {
      const v = (adj[Number(k)] || []).map(String).filter((x) => nd.secteurs[x] && nd.secteurs[x].statut === 'milieu' && !(nd.secteurs[x].repere && nd.secteurs[x].repere.a > T));
      if (v.length) { const c = rng.pick(v.sort()); nd.secteurs[c].repere = { de: T + 1, a: T + 2, par: [] }; nd.secteurs[c].connue = true; (res.temoins ||= []).push({ de: Number(k), cell: Number(c) }); }
    }
  }
  // Guetteurs : trop de descentes sans repérage ces derniers soirs.
  const G = M3.guetteurs, mem = nd.memoire;
  const sansRep = (res.descentes || []).filter((d) => !d.repere).length + (res.repoussesSansRep || 0);
  mem.sansRep = [...mem.sansRep, { T, n: sansRep }].filter((x) => x.T > T - G.fenetre);
  const tot = mem.sansRep.reduce((a, x) => a + x.n, 0);
  if (tot >= G.seuil && T >= (mem.guetteursPause || 0) && !(mem.guetteurs && mem.guetteurs.a >= T + 1)) {
    mem.guetteurs = { de: T + 1, a: T + G.duree };
    mem.guetteursPause = T + G.duree + G.pause;
    mem.sansRep = [];
    push(6, 'Le milieu s’adapte', 'Le milieu double ses guetteurs', `Trop de descentes à l’aveugle : pendant ${G.duree} soirs, une descente sans repérage tombe plus souvent dans un piège. Repérez d’abord.`);
    res.guetteurs = mem.guetteurs;
  }
  // Représailles : une zone qui pèse trop lourd dans le non-droit devient la cible du Parrain.
  const R = M3.represailles;
  const infl = {};
  for (const s of Object.values(nd.secteurs)) for (const [u, v] of Object.entries(s.influence || {})) if (state.zones[u]) infl[u] = (infl[u] || 0) + v;
  const totI = Object.values(infl).reduce((a, b) => a + b, 0);
  const actives = Object.keys(infl).length;
  if (totI > 0 && actives >= R.minZones && !(nd.parrain && nd.parrain.tombe)) {
    const [u, v] = Object.entries(infl).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    const tenus = Object.entries(nd.secteurs).filter(([, s]) => s.statut === 'repris' && s.chef === u && !(nd.gangs || []).some((g) => Number(g.cell) === Number(s.cell)));
    if (v / totI >= R.part && T >= (mem.represailles[u] || 0) && tenus.length) {
      mem.represailles[u] = T + R.pause;
      const [k] = tenus.sort((a, b) => b[1].emprise - a[1].emprise || Number(a[0]) - Number(b[0]))[0];
      (nd.gangs ||= []).push({ cell: Number(k), force: R.force, nuit: T + 1, represailles: u });
      // Ses quartiers frontaliers se tendent tout de suite (intimidation).
      const z = state.zones[u], c = carteQuartiers(state), q = assurerQuartiers(state, z);
      const front = (c.deZone[u] || []).filter((i) => (c.adj[i] || []).some((nb) => nd.secteurs[nb])).slice(0, 2);
      for (const i of front) if (i in q) q[i] = round1(clamp(q[i] + R.tension, 10, 95));
      z.rapport.push(`Le milieu : ${nd.parrain.nom} t’a dans le collimateur (tu pèses ${Math.round((v / totI) * 100)} % du non-droit). Représailles demain soir à ${nomSect(k)} (+${R.force} d’emprise) ; tes quartiers frontaliers se tendent. Demande de l’aide aux autres zones.`);
      push(7, 'Le milieu s’adapte', `Représailles annoncées contre ${nomZ(state, u)}`, `${cap(nd.parrain.nom)} vise ${nomSect(k)} demain soir. Les zones qui y monteront la garde seront récompensées comme face à un gang.`);
      res.represailles = { uid: u, cell: Number(k) };
    }
  }
  planifierScenes(state, nd, T, rng, res);
}

/** Scènes de demain : une (deux à partir de 10 zones actives), sur des secteurs du milieu ouverts. */
function planifierScenes(state, nd, T, rng, res) {
  const actives = Object.values(state.zones).filter((z) => (z.toursSansOrdres || 0) < 2).length;
  const n = actives >= 10 ? 2 : 1;
  const pool = Object.entries(nd.secteurs).filter(([, s]) => s.statut === 'milieu' && !s.coeur).map(([k]) => k).sort((a, b) => Number(a) - Number(b));
  const cibles = rng.shuffle(pool).slice(0, n);
  nd.scenes = cibles.map((k) => {
    const s = nd.secteurs[k];
    let type = s.milieu === 'rodeos' ? 'rodeo' : ['squat', 'sommeil'].includes(s.milieu) ? 'perquisition' : ['deal', 'recel', 'garage', 'jeux'].includes(s.milieu) ? 'livraison' : 'emeute';
    if (s.emprise >= 60 && rng.chance(0.35)) type = 'emeute';
    return { cell: Number(k), type, nuit: T + 1, id: sceneId(nd.season, T + 1, k) };
  });
  res.scenes = nd.scenes;
}

/**
 * Résolution des scènes du soir (après les assauts : `s.hier` liste les agents présents par zone).
 * `jeux` : uid → résultat du mini-jeu (statut 'ok', fautes).
 */
export function scenesResoudre(state, nd, T, push, res, players = {}) {
  if (!nd.v3) return;
  const S = M3.scenes;
  const restants = [];
  for (const sc of nd.scenes || []) {
    if (sc.nuit !== T) { if (sc.nuit > T) restants.push(sc); continue; }
    const s = nd.secteurs[sc.cell];
    if (!s) continue;
    const def = SCENES[sc.type], nomS = nomSect(sc.cell);
    // Comptent les agents envoyés à la scène (rôle « sc », hors assaut) ; un mini-jeu réussi compte comme 3 agents de plus.
    const contrib = {};
    for (const h of s.hier || []) { const n = (h.r && h.r.sc) || 0; if (n > 0) contrib[h.u] = (contrib[h.u] || 0) + n; }
    const jeux = {};
    for (const [u, p] of Object.entries(players)) {
      const r = p && p.incidents && p.incidents.r && p.incidents.r[sc.id];
      if (r && r.statut === 'ok' && state.zones[u]) { jeux[u] = r; contrib[u] = (contrib[u] || 0) + S.jeu + (r.fautes ? 0 : S.sansFaute); }
    }
    const tot = Object.values(contrib).reduce((a, b) => a + b, 0);
    const seuil = seuilScene(state, sc.type);
    const ok = tot >= seuil;
    const qui = Object.keys(contrib).filter((u) => contrib[u] > 0).sort();
    (res.scenesRes ||= []).push({ ...sc, ok, tot, zones: qui, jeux: Object.keys(jeux) });
    if (ok) {
      if (S.effet[sc.type] && s.statut === 'milieu') s.emprise = round1(clamp(s.emprise - S.effet[sc.type], 0, 100));
      // Une scène réglée renseigne sur le secteur : il est repéré demain et après-demain (perquisition : dès ce soir pour 3 soirs).
      if (s.statut === 'milieu' && !(s.repere && s.repere.a >= T + 2)) { s.repere = { de: T + 1, a: T + (sc.type === 'perquisition' ? 3 : 2), par: qui }; s.connue = true; }
      if (sc.type === 'livraison') {
        const libres = TYPES_R.filter((t) => !nd.dossier[t]);
        const meilleur = qui.slice().sort((a, b) => (!!jeux[b] - !!jeux[a]) || (contrib[b] - contrib[a]) || (a < b ? -1 : 1))[0];
        // Le renseignement ne tombe que si quelqu'un a intercepté les téléphones (mini-jeu) ; sinon le chargement est saisi.
        if (libres.length && meilleur && jeux[meilleur]) { const t = makeRng(`${state.seed}:t${T}:liv:${sc.cell}`).pick(libres); nd.dossier[t] = meilleur; state.zones[meilleur].rapport.push(`Livraison interceptée à ${nomS} : « ${RENSEIGNEMENTS[t].nom} » au dossier du Parrain, chez toi.`); }
      }
      for (const u of qui) {
        const z = state.zones[u];
        z.reputation += S.rep; z._psEntraide = (z._psEntraide || 0) + S.ps;
        z.budget = round1(z.budget + S.budget); (z._compta ||= []).push({ k: 'nondroit', l: `${def.titre} à ${nomS}`, v: S.budget });
        const pts = S.pts + (jeux[u] ? S.ptsJeu : 0);
        z._points += pts; z.stats.pointsAffaires = (z.stats.pointsAffaires || 0) + pts;
        z.stats.scenes = (z.stats.scenes || 0) + 1;
        s.influence[u] = round1((s.influence[u] || 0) + contrib[u] * 0.5);
        z.rapport.push(`${def.titre} à ${nomS} : maîtrisée${qui.length > 1 ? ` avec ${qui.filter((x) => x !== u).map((x) => nomZ(state, x)).join(', ')}` : ''}${jeux[u] ? ' (ton équipe a joué le coup elle-même)' : ''}. +${S.rep} de réputation, +${S.ps} PS, +${pts} pts, +${fmt(S.budget)}.`);
      }
      push(5, 'Le milieu', `${def.titre} maîtrisée à ${nomS}`, `${qui.map((u) => nomZ(state, u)).join(', ')}.`);
    } else {
      if (S.rate[sc.type] && s.statut === 'milieu') { s.emprise = round1(clamp(s.emprise + S.rate[sc.type], 0, 100)); s.max = Math.max(s.max || 0, s.emprise); }
      if (sc.type === 'emeute') (res.contagionPlus ||= {})[sc.cell] = S.contagionRatee;
      for (const u of qui) state.zones[u].rapport.push(`${def.titre} à ${nomS} : pas assez de monde (${tot} sur ${seuil} nécessaires).`);
      push(4, 'Le milieu', sc.type === 'emeute' ? `Nuit d’émeute à ${nomS}` : sc.type === 'livraison' ? `La livraison est passée à ${nomS}` : sc.type === 'rodeo' ? `Rodéos impunis à ${nomS}` : `Perquisition manquée à ${nomS}`, def.texte);
    }
  }
  nd.scenes = restants;
}

/** Agents (du bon rôle) nécessaires pour régler une scène : un peu plus dans une grande partie. */
export function seuilScene(state, type) {
  const actives = Object.values(state.zones || {}).filter((z) => (z.toursSansOrdres || 0) < 2).length;
  return Math.round(M3.scenes.seuil[type] * (1 + 0.08 * Math.max(0, actives - 6)));
}

/** Saisies d'une descente réussie (garage, recel) : un lot pour la prochaine vente aux enchères. */
export function saisieDescente(nd, s, k, butin, fuite, parts, T) {
  if (!nd.v3 || fuite >= M3.fuiteArret || butin < 2) return;
  const id = s.milieu === 'garage' ? 'banalise' : s.milieu === 'recel' ? 'informatique' : null;
  if (!id) return;
  if ((nd.saisies || []).some((x) => x.id === id)) return;
  (nd.saisies ||= []).push({ id, cell: Number(k), parts, T });
}

const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const fmt = (v) => `${String(Math.round(v * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
const nomZ = (state, u) => (state.zones[u] ? `ZP ${state.zones[u].code} ${state.zones[u].nom}` : 'une zone');
const nomSect = (k) => ville(CONFIG.seed).cells[Number(k)].nom;
