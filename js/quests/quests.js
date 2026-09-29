// Générateurs d’énigmes du jour. Chaque joueur reçoit sa propre variante
// (noms, heures, chiffres différents), à partir d'une graine unique.
// Chaque énigme est vérifiée à la génération : une seule solution, et
// aucune ne se résout d'un coup d'œil (il faut croiser plusieurs indices).

import { makeRng } from '../engine/rng.js';
import { GENERATORS2, LABELS2 } from './quests2.js';

export const QUEST_TYPES = ['quiment', 'grille', 'cadenas', 'chronologie', 'code', 'plaque', 'photos', 'filature', 'butin', 'horaires', 'ecriture'];
export const QUEST_LABELS = {
  quiment: 'Qui ment ?', chronologie: 'Chronologie', code: 'Message codé',
  cadenas: 'Le cadenas', grille: 'Enquête de voisinage', ...LABELS2,
};
export const QUESTS_PAR_JOUR = 3;

// Difficulté selon le jour : lundi facile, dimanche corsé.
const DIFF_PAR_JOUR = [2, 3, 3, 4, 4, 5, 5];

/**
 * Les 3 énigmes du jour d'un joueur : trois types différents, qui tournent sur toute la saison.
 * `rerolls` : emplacements que le joueur a changés (une autre énigme, d'un type absent du jour).
 */
export function questsFor({ seed, uid, season, turn, weekday = 0, rerolls = [] }) {
  const order = makeRng(`${seed}:qorder:${uid}:${season}`).shuffle(QUEST_TYPES);
  const base = DIFF_PAR_JOUR[weekday] || 3;
  const diffs = [Math.max(1, base - 1), base, Math.min(5, base + 1)];
  const out = [];
  for (let slot = 0; slot < QUESTS_PAR_JOUR; slot++) {
    const type = order[((turn - 1) * QUESTS_PAR_JOUR + slot) % order.length];
    const rng = makeRng(`${seed}:quest:${uid}:${season}:${turn}:${slot}`);
    const q = GENERATORS[type](rng, diffs[slot]);
    out.push({ ...q, type, typeLabel: QUEST_LABELS[type], difficulte: diffs[slot], slot, id: `${season}-${turn}-${slot}` });
  }
  // Énigmes changées : même difficulté, type absent des énigmes du jour.
  for (const slot of rerolls) {
    if (!out[slot]) continue;
    const pris = new Set(out.map((q) => q.type));
    const autres = QUEST_TYPES.filter((t) => !pris.has(t));
    const rng = makeRng(`${seed}:reroll:${uid}:${season}:${turn}:${slot}`);
    const type = rng.pick(autres);
    const q = GENERATORS[type](rng, diffs[slot]);
    out[slot] = { ...q, type, typeLabel: QUEST_LABELS[type], difficulte: diffs[slot], slot, id: `${season}-${turn}-${slot}r`, variante: 1 };
  }
  return out;
}

export function questFor(args) { return questsFor(args)[0]; }

export function generateQuest(type, seedStr, diff = 2) {
  const q = GENERATORS[type](makeRng(seedStr), diff);
  return { ...q, type, typeLabel: QUEST_LABELS[type], difficulte: diff };
}

export function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function checkAnswer(q, reponse) {
  if (q.mode === 'texte') {
    const tok = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
    const rep = tok(reponse);
    const contient = (mot) => { const m = tok(mot); return rep.some((_, i) => m.every((w, j) => rep[i + j] === w)); };
    const phrase = new Set(tok(q.phraseClaire || q.answer));
    // Un mot qui désigne un autre lieu : la réponse est une liste au hasard, refusée.
    if ((q.interdits || []).some((w) => !phrase.has(w) && rep.includes(w))) return false;
    return (q.mots || [q.answer]).some(contient);
  }
  if (q.mode === 'exact') return normalize(reponse) === normalize(q.answer);
  return String(reponse) === String(q.answer);
}

const hm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const PERSONNES = [
  ['Karim', 'm'], ['Léa', 'f'], ['Marc', 'm'], ['Sofia', 'f'], ['Julien', 'm'], ['Nadia', 'f'], ['Thomas', 'm'], ['Emma', 'f'],
  ['Hugo', 'm'], ['Inès', 'f'], ['Lucas', 'm'], ['Chloé', 'f'], ['Mehdi', 'm'], ['Sarah', 'f'], ['Kevin', 'm'], ['Laura', 'f'],
  ['Yannick', 'm'], ['Fatima', 'f'], ['Olivier', 'm'], ['Manon', 'f'],
];
const ou = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} ou ${l[l.length - 1]}`);
const voyelle = (n) => /^[aeiouyéèêh]/i.test(n);
const de = (n) => (voyelle(n) ? `d’${n}` : `de ${n}`);
const et = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}`);

/** Parties d'une liste (par taille croissante) : sert à mesurer combien d'indices sont indispensables. */
function* parTaille(n) {
  for (let k = 1; k <= n; k++) {
    const idx = [...Array(k).keys()];
    for (;;) {
      yield idx.slice();
      let p = k - 1;
      while (p >= 0 && idx[p] === n - k + p) p--;
      if (p < 0) break;
      idx[p]++;
      for (let q = p + 1; q < k; q++) idx[q] = idx[q - 1] + 1;
    }
  }
}
/**
 * Nombre minimal d'indices à croiser pour trancher la question.
 * mondes : hypothèses possibles ; ok(indice, monde) ; rep(monde) : la réponse dans ce monde.
 */
function indispensables(indices, mondes, ok, rep, vraie) {
  for (const sub of parTaille(indices.length)) {
    const restes = mondes.filter((w) => sub.every((i) => ok(indices[i], w)));
    if (restes.every((w) => rep(w) === vraie)) return sub.length;
  }
  return indices.length + 1;
}

// ─────────────────────────────── Qui ment ? ───────────────────────────────
// Les déclarations portent sur la sincérité des autres. On génère au hasard,
// puis on garde seulement les énigmes à solution unique qui demandent au
// moins 2 ou 3 déclarations croisées (jamais « le plus accusé »).

const CONTEXTES_MENT = [
  'La recette de la kermesse a disparu du bureau du comité des fêtes',
  'Le trophée du tournoi de mini-foot interzones a disparu de la vitrine du hall',
  'Le rétroviseur d’une combi a été arraché cette nuit sur le parking de la zone',
  'Les clés du local des saisies ont disparu du tableau de l’accueil',
  'La caisse de la buvette du club de basket est vide ce matin',
  'Quelqu’un a vidé la cagnotte du pot de départ du commissaire',
  'Le saxophone du chef de la fanfare a disparu de la salle de répétition',
  'Les cotisations de la salle de sport se sont volatilisées du vestiaire',
];

function quiment(rng, diff) {
  const deux = diff >= 5;
  const n = diff >= 2 ? 5 : 4;
  const besoin = diff <= 3 ? 2 : 3;
  const gens = rng.shuffle(PERSONNES).slice(0, n);
  const noms = gens.map((g) => g[0]);
  const fem = (...ix) => ix.every((i) => gens[i][1] === 'f');
  const hyps = [];
  if (deux) { for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) hyps.push([a, b]); }
  else for (let a = 0; a < n; a++) hyps.push([a]);
  const cle = (h) => h.join('-');
  const vrai = (st, h) => {
    const ment = (i) => h.includes(i);
    switch (st.k) {
      case 'accuse': return ment(st.a);
      case 'couvre': return !ment(st.a);
      case 'deux': return !ment(st.a) && !ment(st.b);
      case 'lesdeux': return ment(st.a) && ment(st.b);
      case 'unseul': return ment(st.a) !== ment(st.b);
      case 'parmi': return st.l.some((i) => ment(i));
      default: return false;
    }
  };
  const texte = (st) => {
    switch (st.k) {
      case 'accuse': return `« ${noms[st.a]} ment. »`;
      case 'couvre': return `« ${noms[st.a]} dit la vérité. »`;
      case 'deux': return `« ${noms[st.a]} et ${noms[st.b]} disent ${fem(st.a, st.b) ? 'toutes' : 'tous'} les deux la vérité. »`;
      case 'lesdeux': return `« ${noms[st.a]} et ${noms[st.b]} mentent ${fem(st.a, st.b) ? 'toutes' : 'tous'} les deux. »`;
      case 'unseul': return `« Entre ${noms[st.a]} et ${noms[st.b]}, ${fem(st.a, st.b) ? 'une seule' : 'un seul'} des deux ment. »`;
      case 'parmi': return deux ? `« Au moins une personne ment parmi ${et(st.l.map((i) => noms[i]))}. »` : `« Le menteur, c’est ${ou(st.l.map((i) => noms[i]))}. »`;
      default: return '';
    }
  };
  // Une déclaration est cohérente avec une hypothèse si elle est vraie
  // exactement quand celui qui la prononce n'est pas un menteur.
  const coherent = (st, h) => vrai(st, h) === !h.includes(st.self);
  const types = deux
    ? [{ w: 3, k: 'accuse' }, { w: 2, k: 'couvre' }, { w: 3, k: 'unseul' }, { w: 2, k: 'parmi' }, { w: 1, k: 'lesdeux' }, { w: 1, k: 'deux' }]
    : [{ w: 3, k: 'accuse' }, { w: 2, k: 'couvre' }, { w: 1, k: 'deux' }, { w: 3, k: 'unseul' }, { w: diff >= 3 ? 3 : 1, k: 'parmi' }];
  let meilleur = null;
  for (let essai = 0; essai < 4000; essai++) {
    const vraiH = rng.pick(hyps);
    const st = [];
    for (let i = 0; i < n; i++) {
      const autres = [...Array(n).keys()].filter((j) => j !== i);
      let s2 = null;
      for (let t = 0; t < 40; t++) {
        const [a, b, c] = rng.shuffle(autres);
        const k = rng.weighted(types.filter((x) => x.w > 0)).k;
        const cand = { k, a, b, l: [a, b, c].slice(0, diff >= 4 ? 3 : 2).sort((x, y) => x - y), self: i };
        if (coherent(cand, vraiH)) { s2 = cand; break; }
      }
      if (!s2) break;
      st.push(s2);
    }
    if (st.length !== n) continue;
    // Deux déclarations identiques, c'est louche et sans intérêt.
    const sig = st.map((x) => `${x.k}:${['accuse', 'couvre'].includes(x.k) ? x.a : x.k === 'parmi' ? x.l.join(',') : [x.a, x.b].sort().join(',')}`);
    if (new Set(sig).size !== sig.length) continue;
    // Pas plus d'une déclaration « X dit la vérité » : trop directes.
    if (st.filter((x) => x.k === 'couvre' || x.k === 'deux').length > (diff <= 2 ? 2 : 1)) continue;
    const restes = hyps.filter((h) => st.every((x) => coherent(x, h)));
    if (restes.length !== 1 || cle(restes[0]) !== cle(vraiH)) continue;
    // Le menteur ne doit pas être simplement « celui qu'on met en cause le plus » :
    // on compte les mentions négatives moins les mentions positives de chacun.
    const score = [...Array(n).keys()].map((p) => st.reduce((t, x) => {
      const cite = x.k === 'parmi' ? x.l.includes(p) : x.k === 'accuse' || x.k === 'couvre' ? x.a === p : x.a === p || x.b === p;
      if (!cite) return t;
      return t + (['accuse', 'parmi', 'unseul', 'lesdeux'].includes(x.k) ? 1 : -1);
    }, 0));
    const tri = [...Array(n).keys()].sort((a, b) => score[b] - score[a]);
    const nbM = vraiH.length;
    const seuilScore = score[tri[nbM - 1]];
    const enTete = tri.filter((p) => score[p] >= seuilScore);
    if (enTete.length === nbM && vraiH.every((p) => enTete.includes(p))) continue;
    const pas = indispensables(st, hyps, coherent, cle, cle(vraiH));
    if (!meilleur || pas > meilleur.pas) meilleur = { st, vraiH, pas };
    if (pas >= besoin) break;
  }
  const { st, vraiH, pas } = meilleur;
  const decl = rng.shuffle(st.map((x) => ({ nom: noms[x.self], texte: texte(x) })));
  const intro = rng.pick(CONTEXTES_MENT);
  const choix = deux
    ? rng.shuffle(hyps).map((h) => ({ id: cle(h.map((i) => noms[i]).sort()), label: et(h.map((i) => noms[i]).sort()) }))
    : decl.map((d) => ({ id: d.nom, label: d.nom }));
  const answer = deux ? cle(vraiH.map((i) => noms[i]).sort()) : noms[vraiH[0]];
  const qui = deux ? et(vraiH.map((i) => noms[i]).sort()) : noms[vraiH[0]];
  return {
    titre: 'Qui ment ?', mode: 'choix',
    contexte: `${intro}. ${n} personnes ont été entendues. ${deux ? 'Deux d’entre elles mentent' : 'Une seule d’entre elles ment'} : ${deux ? 'les trois autres disent' : 'toutes les autres disent'} la vérité.`,
    elements: decl.map((d) => ({ label: d.nom, texte: d.texte })),
    question: deux ? 'Qui sont les deux menteurs ?' : 'Qui ment ?', _pas: pas,
    choix, answer,
    astuce: deux ? 'Essaie chaque paire : si ces deux-là mentent, les trois autres déclarations sont-elles toutes vraies ?'
      : 'Suppose qu’une personne ment, puis vérifie que toutes les autres déclarations deviennent vraies.',
    explication: `Seule l’hypothèse « ${qui} ${deux ? 'mentent' : 'ment'} » rend toutes les autres déclarations vraies en même temps. Avec ${deux ? 'n’importe quelle autre paire' : 'n’importe quel autre menteur'}, au moins une déclaration deviendrait contradictoire.`,
  };
}

// ─────────────────────────────── Chronologie ───────────────────────────────
// Un extrait du journal du 101 sans heures : seulement des écarts entre les
// faits. Il faut additionner et soustraire pour tout remettre dans l'ordre.

// v : visible sur une caméra ; appel : signalement au 101 ; fin : arrivée de la police (toujours en dernier).
const FAITS = [
  { t: 'L’alarme de la bijouterie se déclenche' }, { t: 'Une riveraine appelle le 101', appel: true },
  { t: 'Une camionnette démarre en trombe', v: true }, { t: 'La lumière s’éteint dans l’arrière-boutique', v: true },
  { t: 'Un chien aboie longuement' }, { t: 'Un livreur de pizzas sonne chez le voisin', v: true },
  { t: 'L’éclairage public de la rue s’éteint', v: true }, { t: 'Un bruit de verre brisé retentit' },
  { t: 'Un scooter sans phare remonte la rue', v: true }, { t: 'Le gardien du parking fait sa ronde', v: true },
  { t: 'Une portière claque' }, { t: 'Le téléphone du gérant sonne dans le vide' },
  { t: 'La première patrouille arrive sur place', v: true, fin: true }, { t: 'Deux silhouettes cagoulées traversent la rue', v: true },
  { t: 'Le dernier bus passe à l’arrêt', v: true }, { t: 'Un voisin sort ses poubelles', v: true },
];
const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];

function chronologie(rng, diff) {
  const n = diff <= 2 ? 4 : diff === 3 ? 5 : 6;
  const besoin = diff <= 1 ? 1 : diff <= 3 ? 2 : 3;
  const piege = diff >= 5;
  let meilleur = null;
  for (let essai = 0; essai < 300; essai++) {
    const r = chronoEssai(rng, n, piege);
    if (!meilleur || r.calculs > meilleur.calculs) meilleur = r;
    if (r.calculs >= besoin) break;
  }
  const { faits, times, perm, lettreDe, indices, ancres } = meilleur;
  const elements = perm.map((idx, k) => ({ label: LETTRES[k], texte: faits[idx].t }));
  const bonOrdre = [...Array(n).keys()].map((i) => lettreDe[i]);
  // Exemple de saisie : jamais la bonne réponse.
  let exemple;
  do { exemple = rng.shuffle(LETTRES.slice(0, n)).join(''); } while (exemple === bonOrdre.join('') || exemple === LETTRES.slice(0, n).join(''));
  return {
    titre: 'Chronologie', mode: 'exact',
    contexte: `Extrait du journal du dispatching (101), cette nuit. ${piege ? 'L’opérateur a noté les écarts entre les faits, et deux heures venues de sources différentes.' : 'L’opérateur a noté les faits signalés, mais pas les heures : il ne reste que les écarts entre eux.'} Remets les faits dans l’ordre.`,
    elements, indices: rng.shuffle(indices).concat(ancres),
    question: 'Dans quel ordre les faits se sont-ils produits ?', _pas: meilleur.calculs,
    consigne: `Tape les ${n} lettres dans l’ordre chronologique, du premier au dernier (ex. : ${exemple}).`,
    placeholder: 'Les lettres dans l’ordre', lettres: LETTRES.slice(0, n).join(''),
    answer: bonOrdre.join(''),
    astuce: 'Place un fait à « 0 » puis calcule la position des autres en minutes (négatif = avant).',
    explication: `L’ordre est ${bonOrdre.join(' → ')} : ${bonOrdre.map((l, i) => `${l} à ${hm(times[i])}`).join(', ')}.${piege ? ' Attention : l’horloge de la caméra avance, il fallait corriger son heure.' : ''}`,
  };
}

function chronoEssai(rng, n, piege) {
  // Bon sens : l'appel au 101 n'ouvre jamais la nuit, la patrouille arrive en dernier.
  let faits = rng.shuffle(FAITS.filter((f) => !piege || !f.fin)).slice(0, n);
  const fin = faits.filter((f) => f.fin);
  faits = faits.filter((f) => !f.fin).concat(fin);
  if (faits[0].appel) [faits[0], faits[1]] = [faits[1], faits[0]];
  let t = rng.int(22 * 60, 23 * 60 + 10);
  const times = [];
  for (let i = 0; i < n; i++) { times.push(t); t += rng.int(3, 14); }
  // faits[i] se produit au temps times[i] ; on les affiche sous des lettres mélangées.
  const perm = rng.shuffle([...Array(n).keys()]);
  const lettreDe = {}; perm.forEach((idx, k) => { lettreDe[idx] = LETTRES[k]; });
  const relie = (a, b) => { // a et b : indices chronologiques, a avant b
    const g = times[b] - times[a];
    return rng.chance(0.5) ? `${lettreDe[b]} a lieu ${g} minutes après ${lettreDe[a]}.` : `${lettreDe[a]} a lieu ${g} minutes avant ${lettreDe[b]}.`;
  };
  // Composantes : un seul arbre d'écarts, ou deux arbres reliés par deux heures (dont une fausse).
  let groupes = [[...Array(n).keys()]];
  let X = -1, Y = -1, decalage = 0;
  if (piege) {
    const filmables = [...Array(n - 1).keys()].filter((i) => faits[i].v);
    if (!filmables.length) return { calculs: -1 };
    X = rng.pick(filmables); Y = X + 1;
    // X et Y sont très proches : lire l'heure de la caméra sans la corriger inverse leur ordre.
    const reduit = (times[Y] - times[X]) - rng.int(2, 5);
    for (let i = Y; i < n; i++) times[i] -= reduit;
    decalage = rng.pick([7, 8, 9]);
    const ga = [X], gb = [Y];
    for (let i = 0; i < n; i++) if (i !== X && i !== Y) (rng.chance(0.5) ? ga : gb).push(i);
    groupes = [ga, gb];
  }
  const aretes = [];
  for (const g of groupes) {
    const ordre = rng.shuffle(g);
    for (let k = 1; k < ordre.length; k++) aretes.push([ordre[k], ordre[rng.int(0, k - 1)]]);
  }
  const indices = aretes.map(([x, y]) => relie(Math.min(x, y), Math.max(x, y)));
  const ancres = [];
  if (piege) {
    ancres.push(`La caméra du parking filme ${lettreDe[X]} à ${hm(times[X] + decalage)}, mais son horloge avance : elle affiche ${decalage} minutes de trop.`);
    ancres.push(`Un témoin, qui a regardé l’heure sur son GSM, situe ${lettreDe[Y]} à ${hm(times[Y])} (heure exacte).`);
  }
  // Paires de faits consécutifs qu'aucun indice ne relie directement et qu'on
  // ne peut ordonner qu'en additionnant des écarts de sens contraires.
  const voisins = [...Array(n)].map(() => []);
  aretes.forEach(([x, y]) => { voisins[x].push(y); voisins[y].push(x); });
  const chemin = (a, b) => {
    const prec = { [a]: -1 }; const file = [a];
    while (file.length) { const u = file.shift(); for (const v of voisins[u]) if (!(v in prec)) { prec[v] = u; file.push(v); } }
    if (!(b in prec)) return null;
    const c = []; for (let u = b; u !== -1; u = prec[u]) c.push(u); return c;
  };
  let calculs = 0;
  for (let i = 0; i < n - 1; i++) {
    const c = chemin(i, i + 1);
    if (!c) { calculs++; continue; } // relié seulement par les deux heures : il faut corriger l'horloge
    if (c.length <= 2) continue;
    const ts = c.map((u) => times[u]);
    const monotone = ts.every((v, k) => k === 0 || v > ts[k - 1]) || ts.every((v, k) => k === 0 || v < ts[k - 1]);
    if (!monotone) calculs++;
  }
  return { faits, times, perm, lettreDe, indices, ancres, calculs };
}

// ─────────────────────────────── Message codé ───────────────────────────────

const MESSAGES = [
  ['RDV SOUS LE PONT A MINUIT', ['PONT']],
  ['RDV DERRIERE LA GARE DEMAIN SOIR', ['GARE']],
  ['RDV AU PORT QUAI SEPT A VINGT DEUX HEURES', ['PORT', 'QUAI SEPT', 'QUAI 7']],
  ['RDV PRES DE L ECLUSE AVANT L AUBE', ['ECLUSE']],
  ['RDV AU PARKING DU STADE SAMEDI', ['STADE', 'PARKING']],
  ['RDV A LA CHAPELLE APRES LA MESSE', ['CHAPELLE']],
  ['RDV AU CIMETIERE PORTE NORD', ['CIMETIERE']],
  ['RDV SUR LE TOIT DU CINEMA', ['CINEMA', 'TOIT']],
  ['RDV AU LAVOIR QUAND LA CLOCHE SONNE', ['LAVOIR']],
  ['RDV A LA PISCINE COTE VESTIAIRES', ['PISCINE', 'VESTIAIRES']],
  ['RDV A L AIRE D AUTOROUTE VERS MIDI', ['AUTOROUTE', 'AIRE']],
  ['LIVRAISON A LA FRITERIE JEUDI SOIR', ['FRITERIE']],
  ['LIVRAISON AU GARAGE DU BOUT DE LA RUE', ['GARAGE']],
  ['LIVRAISON A LA BOULANGERIE AVANT L OUVERTURE', ['BOULANGERIE']],
  ['LIVRAISON AU HANGAR DERRIERE LA SCIERIE', ['HANGAR', 'SCIERIE']],
  ['LIVRAISON A LA STATION SERVICE DE LA NATIONALE', ['STATION', 'NATIONALE']],
  ['LIVRAISON AU MARCHE ENTRE LES CAMIONS', ['MARCHE']],
  ['LIVRAISON A L ENTREPOT NUMERO TROIS', ['ENTREPOT']],
  ['LIVRAISON A LA FERME DU MOULIN', ['FERME', 'MOULIN']],
  ['LIVRAISON AU CAMPING PRES DU LAC', ['CAMPING', 'LAC']],
  ['LIVRAISON AU CAFE DE LA PLACE', ['CAFE']],
  ['PLANQUE DANS LA CAVE DU BOUCHER', ['CAVE', 'BOUCHER', 'BOUCHERIE']],
  ['PLANQUE AU GRENIER DE L ECOLE', ['GRENIER', 'ECOLE']],
  ['PLANQUE SOUS LE KIOSQUE DU PARC', ['KIOSQUE', 'PARC']],
  ['PLANQUE DANS LA PENICHE ROUGE', ['PENICHE']],
  ['PLANQUE AU FOND DU TERRAIN DE TENNIS', ['TENNIS']],
  ['PLANQUE DERRIERE L EGLISE', ['EGLISE']],
  ['PLANQUE DANS LE BOX DOUZE', ['BOX']],
  ['PLANQUE A LA DECHETTERIE', ['DECHETTERIE']],
  ['PLANQUE DANS LA SERRE DU JARDINIER', ['SERRE']],
  ['PLANQUE AU BOWLING SOUS LA PISTE HUIT', ['BOWLING']],
  ['ON SE VOIT A LA LAVERIE VERS DIX HEURES', ['LAVERIE']],
  ['ON SE VOIT AU SNACK DU ROND POINT', ['SNACK', 'ROND POINT']],
  ['ON SE VOIT A LA PATINOIRE', ['PATINOIRE']],
  ['ON SE VOIT A L ARRET DE BUS DU LYCEE', ['LYCEE', 'ARRET DE BUS']],
  ['ON SE VOIT DERRIERE LA SALLE DES FETES', ['SALLE DES FETES', 'FETES']],
  ['ON SE VOIT AU PHARE AU BOUT DE LA DIGUE', ['PHARE', 'DIGUE']],
  ['ON SE VOIT A LA BIBLIOTHEQUE AU DEUXIEME', ['BIBLIOTHEQUE']],
  ['ON SE VOIT AU SKATEPARK APRES LES COURS', ['SKATEPARK']],
  ['ON SE VOIT A LA CARRIERE ABANDONNEE', ['CARRIERE']],
  ['ON SE VOIT AU CHATEAU D EAU', ['CHATEAU D EAU', 'CHATEAU']],
].map(([phrase, mots]) => ({ phrase, mots }));
const OUVERTURES = ['RDV', 'LIVRAISON', 'PLANQUE', 'ON SE VOIT'];
const shiftChar = (c, k) => (c >= 'A' && c <= 'Z' ? String.fromCharCode(((c.charCodeAt(0) - 65 + (k % 26) + 26) % 26) + 65) : c);
const miroir = (c) => (c >= 'A' && c <= 'Z' ? String.fromCharCode(90 - (c.charCodeAt(0) - 65)) : c);

function code(rng, diff) {
  const m = rng.pick(MESSAGES);
  const ouverture = OUVERTURES.find((o) => m.phrase.startsWith(`${o} `));
  const mots = m.phrase.split(' ');
  const listeOuv = `Dans cette bande, les messages commencent toujours par ${ou(OUVERTURES.map((o) => `« ${o} »`))}.`;
  let chiffre, aide, explication;
  const methode = diff >= 5 ? 'progressif' : diff === 4 && rng.chance(0.5) ? 'miroir' : 'decalage';
  const k = diff <= 1 ? rng.int(1, 3) : rng.int(3, diff >= 5 ? 9 : 12);
  if (methode === 'miroir') {
    chiffre = m.phrase.split('').map(miroir).join('');
    explication = `Alphabet miroir (A↔Z, B↔Y, C↔X…) : « ${m.phrase} ».`;
  } else if (methode === 'progressif') {
    chiffre = mots.map((w, i) => w.split('').map((c) => shiftChar(c, k + i)).join('')).join(' ');
    explication = `Décalage de ${k} rang${k > 1 ? 's' : ''} pour le 1er mot, ${k + 1} pour le 2e, et ainsi de suite : « ${m.phrase} ».`;
  } else {
    chiffre = m.phrase.split('').map((c) => shiftChar(c, k)).join('');
    explication = `Décalage de ${k} rang${k > 1 ? 's' : ''} : « ${m.phrase} ».`;
  }
  if (diff <= 1) aide = `Chaque lettre a été remplacée par celle qui se trouve ${k} rang${k > 1 ? 's' : ''} plus loin dans l’alphabet (après Z, on repart à A). Recule de ${k} pour lire.`;
  else if (diff === 2) aide = `Chaque lettre a été décalée du même nombre de rangs dans l’alphabet (après Z, on repart à A). Un informateur assure que ce message commence par « ${ouverture} ».`;
  else if (diff === 3) aide = `Chaque lettre a été décalée du même nombre de rangs dans l’alphabet (après Z, on repart à A). ${listeOuv}`;
  else if (diff === 4) aide = `Deux méthodes sont connues dans ce milieu : le décalage (chaque lettre avance du même nombre de rangs) ou l’alphabet miroir (A↔Z, B↔Y…). ${listeOuv}`;
  else aide = `Ce suspect est prudent : il décale chaque mot d’un rang de plus que le précédent (le 2e mot d’un rang de plus que le 1er, etc.). ${listeOuv}`;
  return {
    titre: 'Message codé', mode: 'texte',
    contexte: rng.pick([
      'Ce billet a été saisi dans la poche d’un suspect lors d’un contrôle.',
      'Ce SMS a été retrouvé sur le GSM saisi chez un revendeur.',
      'Ce mot était glissé sous l’essuie-glace d’une voiture surveillée.',
      'Ce message a été intercepté sur la messagerie d’un jeu en ligne.',
    ]),
    code: chiffre, aide, elements: [],
    question: 'Quel lieu est désigné dans le message ? (un mot suffit)',
    answer: m.mots[0], mots: m.mots, phraseClaire: m.phrase,
    interdits: [...new Set(MESSAGES.filter((x) => x !== m).flatMap((x) => x.mots.flatMap((w) => w.split(' '))).filter((w) => w.length >= 3 && !['DES', 'EAU'].includes(w) && !/^\d+$/.test(w)))],
    astuce: diff >= 2 ? 'Commence par le premier mot : si tu sais comment il se lit, tu connais la clé.' : null,
    explication,
  };
}

// ─────────────────────────────── Le cadenas ───────────────────────────────

const CADENAS = [
  (len) => `Le cadenas du box n° %N protège peut-être le butin. Dans le carnet du suspect, on retrouve ses essais annotés. Le code a ${len} chiffres, tous différents.`,
  (len) => `Le digicode du hall de l’immeuble a enregistré les derniers essais d’un visiteur, avec la réponse du boîtier. Le code a ${len} chiffres, tous différents.`,
  (len) => (len === 4 ? `Le GSM saisi est verrouillé. Au dos d’un ticket, le suspect a noté ses tentatives de code PIN et ce que le téléphone a laissé deviner. Le code a ${len} chiffres, tous différents.` : null),
  (len) => `Le coffre de la voiture-bélier est fermé par un cadenas à molettes. Sur un post-it collé au tableau de bord, le conducteur a noté ses essais. Le code a ${len} chiffres, tous différents.`,
];

function cadenas(rng, diff) {
  const len = diff >= 4 ? 4 : 3;
  const maxAucun = diff <= 1 ? 2 : diff === 2 ? 1 : 0;
  const all = [];
  for (let i = 0; i < 10 ** len; i++) {
    const c = String(i).padStart(len, '0');
    if (new Set(c).size === len) all.push(c);
  }
  const score = (g, c) => {
    let bien = 0, mal = 0;
    for (let i = 0; i < len; i++) { if (g[i] === c[i]) bien++; else if (c.includes(g[i])) mal++; }
    return [bien, mal];
  };
  const compatibles = (liste) => all.filter((c) => liste.every((k) => { const [b2, m2] = score(k.g, c); return b2 === k.b && m2 === k.m; }));
  const essai = () => {
    const secret = rng.pick(all);
    const clues = [];
    let candidats = all;
    let guard = 0;
    while (candidats.length > 1 && guard++ < 600) {
      const g = rng.pick(all);
      const [b, m] = score(g, secret);
      if (b === len || clues.some((c) => c.g === g)) continue;
      if (b + m === 0 && clues.filter((c) => c.b + c.m === 0).length >= maxAucun) continue;
      const reste = candidats.filter((c) => { const [b2, m2] = score(g, c); return b2 === b && m2 === m; });
      if (reste.length === candidats.length) continue; // essai inutile
      clues.push({ g, b, m }); candidats = reste;
    }
    if (candidats.length !== 1) return null;
    // On retire les essais superflus : chacun devient indispensable.
    for (const c of rng.shuffle(clues.slice())) {
      const sans = clues.filter((k) => k !== c);
      if (compatibles(sans).length === 1) clues.splice(clues.indexOf(c), 1);
    }
    // Force du meilleur essai pris seul : plus il élimine, plus l'énigme est facile.
    const fort = Math.min(...clues.map((k) => compatibles([k]).length));
    return { secret, clues, fort };
  };
  // Au niveau 5, on tire plusieurs codes et on garde celui dont les essais sont les moins parlants.
  let res = null;
  for (let t = 0; t < (diff >= 5 ? 4 : 1) || !res; t++) {
    const r = essai();
    if (r && (!res || r.clues.length > res.clues.length || (r.clues.length === res.clues.length && r.fort > res.fort))) res = r;
  }
  const phrase = ({ b, m }) => {
    const parts = [];
    if (b) parts.push(`${b} bon${b > 1 ? 's' : ''} chiffre${b > 1 ? 's' : ''} bien placé${b > 1 ? 's' : ''}`);
    if (m) parts.push(`${m} bon${m > 1 ? 's' : ''} chiffre${m > 1 ? 's' : ''} mal placé${m > 1 ? 's' : ''}`);
    return parts.length ? parts.join(' + ') : 'aucun bon chiffre';
  };
  return {
    titre: 'Le cadenas', mode: 'exact',
    contexte: rng.pick(CADENAS.map((f) => f(len)).filter(Boolean)).replace('%N', rng.int(2, 48)),
    elements: rng.shuffle(res.clues).map((c) => ({ label: c.g.split('').join(' '), texte: phrase(c) })),
    question: `Quel est le code à ${len} chiffres ?`,
    placeholder: '0'.repeat(len),
    inputmode: 'numeric',
    answer: res.secret,
    astuce: 'Cherche d’abord quels chiffres font partie du code, puis où ils se placent.',
    explication: `Le code est ${res.secret}. C’est la seule combinaison compatible avec tous les essais.`,
  };
}

// ─────────────────────────── Enquête de voisinage ───────────────────────────
// Grille de déduction : qui, avec quel véhicule, où. On mesure combien de
// témoignages il faut croiser pour répondre, et on pose la question la plus dure.

const VEHICULES_GRILLE = ['la camionnette blanche', 'le scooter rouge', 'la Golf grise', 'le break noir', 'le vélo cargo'];
const LIEUX_GRILLE = ['devant la gare', 'sur le parking du stade', 'près de l’écluse', 'à la station-service', 'derrière le marché'];
const TEMOINS = ['Le boulanger', 'La pharmacienne', 'Le chauffeur de taxi', 'Une riveraine', 'Le gardien de nuit', 'Le livreur de journaux', 'La serveuse du café', 'Un joggeur', 'Le pompiste', 'Une agente de quartier'];
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

function grille(rng, diff) {
  const n = diff >= 4 ? 4 : 3;
  const seuil = diff <= 1 ? 2 : diff <= 3 ? 3 : diff === 4 ? 4 : 5;
  let meilleur = null;
  for (let t = 0; t < 60; t++) {
    const r = grilleEssai(rng, n, diff);
    if (!r) continue;
    if (!meilleur || r.q.pas > meilleur.q.pas) meilleur = r;
    if (r.q.pas >= seuil) break;
  }
  const { gens, veh, lieux, solV, solL, clues, q } = meilleur;
  const temoins = rng.shuffle(TEMOINS);
  const lieu = (l) => cap(l);
  return {
    titre: 'Enquête de voisinage', mode: 'choix',
    contexte: `Un vol a eu lieu cette nuit. L’enquête de voisinage a identifié ${n} personnes qui circulaient dans le quartier : ${et(gens)}. Chacune avait un véhicule différent (${veh.join(', ')}) et se trouvait à un endroit différent (${lieux.join(', ')}). Recoupe les auditions.`,
    elements: [], indices: clues.map((c, i) => `${temoins[i % temoins.length]} : « ${c.t} »`),
    grille: { gens, veh: veh.map(court), lieux: lieux.map(court) },
    question: q.question, _pas: q.pas,
    choix: q.type === 'lieu' ? lieux.map((l) => ({ id: l, label: lieu(l) }))
      : q.type === 'veh' ? veh.map((v) => ({ id: v, label: cap(v) }))
        : gens.map((g) => ({ id: g, label: g })),
    answer: q.answer,
    astuce: 'Utilise la grille : coche ✗ ce qui est impossible, ✓ ce qui est certain.',
    explication: `Solution : ${gens.map((g, i) => `${g}, ${veh[solV[i]]}, ${lieux[solL[i]]}`).join(' ; ')}.`,
  };
}

function grilleEssai(rng, n, diff) {
  const tirage = rng.shuffle(PERSONNES).slice(0, n);
  const gens = tirage.map((g) => g[0]);
  const il = (i) => (tirage[i][1] === 'f' ? 'elle' : 'il');
  const veh = rng.shuffle(VEHICULES_GRILLE).slice(0, n);
  const lieux = rng.shuffle(LIEUX_GRILLE).slice(0, n);
  const perms = permutations([...Array(n).keys()]);
  const solV = rng.pick(perms), solL = rng.pick(perms); // solV[i] = véhicule de la personne i
  const mondes = [];
  for (const pv of perms) for (const pl of perms) mondes.push([pv, pl]);
  const conducteur = (j) => `la personne qui conduisait ${veh[j]}`;
  const gen = () => {
    const i = rng.int(0, n - 1), j = rng.int(0, n - 1), k = rng.int(0, n - 1);
    switch (rng.int(0, 5)) {
      case 0: return solV[i] !== j ? { t: `${gens[i]} ne conduisait pas ${veh[j]}.`, f: ([pv]) => pv[i] !== j } : null;
      case 1: return solL[i] !== j ? { t: `${gens[i]} n’était pas ${lieux[j]}.`, f: ([, pl]) => pl[i] !== j } : null;
      case 2: { const p = solL.indexOf(j); return { t: `La personne vue ${lieux[j]} conduisait ${veh[solV[p]]}.`, f: ([pv, pl]) => pv[pl.indexOf(j)] === solV[p], pos: true }; }
      case 3: { const p = solV.indexOf(j); return solL[p] !== k ? { t: `${cap(conducteur(j))} n’était pas ${lieux[k]}.`, f: ([pv, pl]) => pl[pv.indexOf(j)] !== k } : null; }
      case 4: {
        // « Soit… soit… » : exactement une des deux affirmations est vraie.
        const vj = rng.chance(0.5);
        const jj = vj ? solV[i] : (solV[i] + rng.int(1, n - 1)) % n;
        const kk = vj ? (solL[i] + rng.int(1, n - 1)) % n : solL[i];
        return { t: `Soit ${gens[i]} conduisait ${veh[jj]}, soit ${il(i)} était ${lieux[kk]}, mais pas les deux.`, f: ([pv, pl]) => (pv[i] === jj) !== (pl[i] === kk) };
      }
      case 5: return diff <= 2 ? { t: `${gens[i]} était ${lieux[solL[i]]}.`, f: ([, pl]) => pl[i] === solL[i], pos: true } : null;
      default: return null;
    }
  };
  let reste = mondes;
  const clues = [];
  let guard = 0;
  while (reste.length > 1 && guard++ < 600) {
    const c = gen();
    if (!c) continue;
    if (c.pos && clues.filter((x) => x.pos).length >= (diff <= 2 ? 2 : 1)) continue;
    if (clues.some((x) => x.t === c.t)) continue;
    const r2 = reste.filter(c.f);
    if (r2.length === reste.length) continue;
    clues.push(c); reste = r2;
  }
  if (reste.length !== 1) return null;
  // On retire les témoignages superflus (sauf au niveau 1) : chacun devient indispensable.
  if (diff >= 2) {
    for (const c of rng.shuffle(clues.slice())) {
      const sans = clues.filter((k) => k !== c);
      if (mondes.filter((w) => sans.every((k) => k.f(w))).length === 1) clues.splice(clues.indexOf(c), 1);
    }
  }
  // Questions possibles, et nombre de témoignages indispensables pour chacune.
  const questions = [];
  for (let j = 0; j < n; j++) {
    const p = solV.indexOf(j);
    questions.push({ type: 'qui', question: `Qui conduisait ${veh[j]} ?`, answer: gens[p], rep: ([pv]) => gens[pv.indexOf(j)] });
    if (diff >= 4) questions.push({ type: 'lieu', question: `Où se trouvait ${conducteur(j)} ?`, answer: lieux[solL[p]], rep: ([pv, pl]) => lieux[pl[pv.indexOf(j)]] });
  }
  if (diff >= 3) {
    for (let k = 0; k < n; k++) {
      const p = solL.indexOf(k);
      questions.push({ type: 'veh', question: `Quel véhicule conduisait la personne vue ${lieux[k]} ?`, answer: veh[solV[p]], rep: ([pv, pl]) => veh[pv[pl.indexOf(k)]] });
    }
  }
  for (const q of questions) q.pas = indispensables(clues, mondes, (c, w) => c.f(w), q.rep, q.answer);
  // La question la plus proche du niveau visé : assez dure, sans devenir un casse-tête interminable.
  const seuil = diff <= 1 ? 2 : diff <= 3 ? 3 : diff === 4 ? 4 : 5;
  const ok = questions.filter((x) => x.pas >= seuil);
  const cible = ok.length ? Math.min(...ok.map((x) => x.pas)) : Math.max(...questions.map((x) => x.pas));
  const q = rng.pick(questions.filter((x) => x.pas === cible));
  return { gens, veh, lieux, solV, solL, clues, q };
}

const COURTS = { 'la camionnette blanche': 'Camionnette', 'le scooter rouge': 'Scooter', 'la Golf grise': 'Golf', 'le break noir': 'Break', 'le vélo cargo': 'Vélo cargo',
  'devant la gare': 'Gare', 'sur le parking du stade': 'Stade', 'près de l’écluse': 'Écluse', 'à la station-service': 'Station', 'derrière le marché': 'Marché' };
const court = (s) => COURTS[s] || s;

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

const GENERATORS = { quiment, chronologie, code, cadenas, grille, ...GENERATORS2 };
