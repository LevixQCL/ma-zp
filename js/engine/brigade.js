// La brigade en direct (oct. 2026) : appel du jour commun à toutes les zones, brigade qui apprend le style du joueur,
// effets des galons des figures, rodage des recrues avec tuteur.
// Calibrage : test/brigade-sim.mjs (un joueur attentif gagne environ +1 à +2 d'IPZ sur la saison ; l'absent ne perd rien).
import { makeRng } from './rng.js';
import { bonusChef, risqueBlessure } from './constants.js';
import { optionsMateriel, bonusBodycam, trouGilets, MAT, abimer } from './materiel.js';

export const BRIGADE = {
  rodage: { jours: 4, tuteur: 2, efficacite: 0.5 },   // recrues à 50 % pendant 4 jours (2 avec un tuteur)
  reaffecter: 30,                                     // PS pour rendre les galons d'une figure
  specMissions: 2,                                    // missions de renfort pour qu'une figure rapporte une spécialité
  specBonus: 0.1,                                     // chance en plus sur l'appel du jour pour une figure spécialisée
  xpAppel: 2,                                         // expérience de la figure qui mène l'appel réussi
};

export const CTX = {
  arme: { nom: 'Face à une arme', role: 'inter' },
  temoin: { nom: 'Face à un témoin qui se tait', role: 'rech' },
  fuite: { nom: 'Face à un suspect qui fuit', role: 'roul' },
  foule: { nom: 'Face à une foule tendue', role: 'prox' },
  flou: { nom: 'Quand il n’y a aucune preuve', role: 'admin' },
};
export const APPROCHES = {
  dialogue: { nom: 'Dialogue', ico: '🗣️' }, force: { nom: 'Intervention', ico: '✊' }, procedure: { nom: 'Procédure', ico: '📋' }, prudence: { nom: 'Prudence', ico: '🛡️' },
};
// Une approche réservée par galon « terrain » : role, palier (0 à 2), contexte où elle s'ouvre.
export const RESERVEES = {
  'inter:0': { ctx: ['arme', 'fuite'], base: 'force', nom: 'Interpellation coordonnée', p: 0.75, ok: { pts: 6 }, ko: { sat: -1 } },
  'inter:1': { ctx: ['arme'], base: 'dialogue', nom: 'Négociation de crise', p: 0.82, ok: { pts: 6, sat: 2 }, ko: { sat: -1 } },
  'inter:2': { ctx: ['arme', 'foule'], base: 'force', nom: 'Interpellation à haut risque', p: 0.6, ok: { pts: 10, rep: 1 }, ko: { sat: -2, moral: -2 } },
  'rech:0': { ctx: ['temoin'], base: 'procedure', nom: 'Audition ciblée', p: 0.75, ok: { pts: 6 }, ko: {} },
  'rech:1': { ctx: ['fuite', 'flou'], base: 'procedure', nom: 'Filature', p: 0.72, ok: { pts: 7 }, ko: {} },
  'rech:2': { ctx: ['flou', 'temoin'], base: 'procedure', nom: 'Perquisition préparée', p: 0.65, ok: { pts: 10, rep: 1 }, ko: { rep: -1 } },
  'prox:0': { ctx: ['flou', 'foule'], base: 'dialogue', nom: 'Médiation', p: 0.78, ok: { pts: 4, sat: 2 }, ko: {} },
  'prox:1': { ctx: ['foule'], base: 'dialogue', nom: 'Désamorcer', p: 0.8, ok: { pts: 5, sat: 2 }, ko: { sat: -1 } },
  'prox:2': { ctx: ['foule', 'temoin'], base: 'dialogue', nom: 'Grande sœur du quartier', p: 0.7, ok: { pts: 6, sat: 3 }, ko: { sat: -1 } },
  'roul:0': { ctx: ['fuite'], base: 'procedure', nom: 'Contrôle ciblé', p: 0.78, ok: { pts: 6 }, ko: {} },
  'roul:1': { ctx: ['fuite', 'arme'], base: 'force', nom: 'Poursuite encadrée', p: 0.7, ok: { pts: 7 }, ko: { sat: -1 } },
  'roul:2': { ctx: ['fuite'], base: 'force', nom: 'Barrage coordonné', p: 0.68, ok: { pts: 10, rep: 1 }, ko: { sat: -1 } },
  'admin:0': { ctx: ['temoin'], base: 'dialogue', nom: 'Plainte bien prise', p: 0.78, ok: { pts: 5, sat: 1 }, ko: {} },
  'admin:1': { ctx: ['temoin', 'flou'], base: 'dialogue', nom: 'Témoin en confiance', p: 0.74, ok: { pts: 6, sat: 1 }, ko: {} },
  'admin:2': { ctx: ['flou'], base: 'procedure', nom: 'Dossier en béton', p: 0.66, ok: { pts: 10, rep: 1 }, ko: {} },
};

const o = (app, label, p, ok, ko, tOk, tKo) => ({ app, label, p, ok, ko, tOk, tKo });
export const APPELS = [
  { ctx: 'arme', titre: 'Forcené retranché chez lui avec un fusil de chasse', opts: [
    o('dialogue', 'Négocier à travers la porte', 0.55, { pts: 3, sat: 2 }, { sat: -1 }, 'Il sort sans son arme après une heure de discussion.', 'Il tire en l’air, le quartier panique.'),
    o('force', 'Entrer par surprise', 0.5, { pts: 5 }, { sat: -2, moral: -2 }, 'Maîtrisé dans son salon avant d’avoir compris.', 'Un coup part, un agent est touché au bras.'),
    o('prudence', 'Boucler et attendre les unités spéciales', 0.85, { pts: 2 }, { sat: -1 }, 'Les unités spéciales l’interpellent sans casse.', 'Six heures de bouclage, le quartier est excédé.')] },
  { ctx: 'arme', titre: 'Braquage d’une bijouterie, la gérante est retenue', opts: [
    o('dialogue', 'Parler au braqueur', 0.45, { pts: 4, sat: 2 }, { sat: -2 }, 'Il libère la gérante et se rend.', 'Il s’énerve, la gérante est bousculée.'),
    o('force', 'Assaut éclair', 0.45, { pts: 6, rep: 1 }, { sat: -2, moral: -2 }, 'Braqueur au sol, gérante indemne.', 'La gérante est blessée pendant l’assaut.'),
    o('prudence', 'Boucler, attendre les unités spéciales', 0.8, { pts: 2 }, { sat: -1 }, 'Les unités spéciales règlent l’affaire en trois heures.', 'Il s’échappe par les caves avant leur arrivée.')] },
  { ctx: 'temoin', titre: 'Agression au marché : vingt témoins, aucun ne parle', opts: [
    o('dialogue', 'Faire le tour des étals un par un', 0.6, { pts: 4, sat: 1 }, {}, 'Une marchande finit par donner un prénom.', 'Tout le monde a « regardé ailleurs ».'),
    o('procedure', 'Convocations et vidéosurveillance', 0.6, { pts: 4 }, { sat: -1 }, 'Les caméras de la halle montrent l’agresseur.', 'Les convocations restent lettre morte.'),
    o('prudence', 'Soigner la victime, revenir demain', 0.75, { pts: 1, sat: 1 }, {}, 'La victime, rassurée, se souvient d’un tatouage.', 'Le lendemain, plus personne ne se souvient.')] },
  { ctx: 'temoin', titre: 'Un commerçant semble payer un racket mais nie tout', opts: [
    o('dialogue', 'Le revoir seul, en confiance', 0.55, { pts: 4, sat: 1 }, {}, 'Il finit par raconter : 200 € par semaine.', 'Il nie de plus belle.'),
    o('procedure', 'Surveillance du commerce', 0.6, { pts: 4 }, { sat: -1 }, 'Le collecteur est filmé en plein passage.', 'Le collecteur a repéré la surveillance.'),
    o('prudence', 'Laisser une carte, revenir plus tard', 0.8, { sat: 1 }, {}, 'Il appelle le soir même.', 'Il ne rappelle jamais.')] },
  { ctx: 'fuite', titre: 'Voiture-bélier dans une vitrine, les auteurs s’enfuient', opts: [
    o('force', 'Prendre les fuyards en chasse', 0.5, { pts: 5 }, { sat: -2 }, 'Deux auteurs interpellés dans une ruelle.', 'Course-poursuite, un passant renversé légèrement.'),
    o('procedure', 'Relever les traces, alerter les zones voisines', 0.65, { pts: 4 }, {}, 'Les zones voisines les cueillent sur l’autoroute.', 'Les traces ne mènent nulle part.'),
    o('prudence', 'Sécuriser la vitrine et le quartier', 0.85, { pts: 1, sat: 1 }, {}, 'Aucun pillage, les commerçants remercient.', 'Les auteurs courent toujours.')] },
  { ctx: 'fuite', titre: 'Conducteur qui refuse d’obtempérer', opts: [
    o('force', 'Prise en chasse', 0.5, { pts: 4 }, { sat: -2 }, 'Arrêté au rond-point, permis retiré.', 'Course-poursuite dangereuse, il s’échappe.'),
    o('procedure', 'Plaque relevée, visite à domicile', 0.75, { pts: 3 }, {}, 'Il ouvre le lendemain matin : procès-verbal et saisie.', 'Plaque volée sur une autre voiture.'),
    o('prudence', 'Laisser filer, protéger les passants', 0.9, { sat: 1 }, {}, 'Aucun risque pris, signalement diffusé.', 'Il recommence deux rues plus loin.')] },
  { ctx: 'foule', titre: 'Deux groupes de supporters se font face à la gare', opts: [
    o('dialogue', 'Parler aux meneurs des deux camps', 0.55, { pts: 2, sat: 2 }, { sat: -2 }, 'Les meneurs calment leurs troupes, escorte jusqu’au stade.', 'Les palabres traînent, les bouteilles volent.'),
    o('force', 'Séparer de force les deux groupes', 0.65, { pts: 4 }, { sat: -2 }, 'Cordon tenu, les deux groupes partent séparément.', 'La charge met le feu au quai.'),
    o('procedure', 'Filmer et identifier les meneurs', 0.6, { pts: 4 }, { sat: -1 }, 'Six meneurs identifiés, interdits de stade.', 'On filme, mais la bagarre éclate.')] },
  { ctx: 'foule', titre: 'Fête de quartier qui dégénère', opts: [
    o('dialogue', 'Parler aux organisateurs', 0.7, { pts: 1, sat: 2 }, { sat: -1 }, 'Musique coupée, la fête finit calmement.', 'Les organisateurs sont débordés.'),
    o('force', 'Faire évacuer la place', 0.65, { pts: 3, sat: -1 }, { sat: -2 }, 'Place évacuée, quelques huées.', 'Bousculade à la sortie.'),
    o('prudence', 'Présence visible, sans intervenir', 0.75, { pts: 1, sat: 1 }, {}, 'Votre présence suffit à calmer tout le monde.', 'Deux bagarres éclatent quand même.')] },
  { ctx: 'flou', titre: 'Plainte pour harcèlement, aucune preuve', opts: [
    o('dialogue', 'Médiation entre les deux voisins', 0.6, { pts: 1, sat: 2 }, { sat: -1 }, 'Accord trouvé, les messages cessent.', 'La médiation tourne court.'),
    o('procedure', 'Audition complète des deux parties', 0.65, { pts: 4 }, {}, 'Les auditions révèlent une capture d’écran décisive.', 'Parole contre parole.'),
    o('prudence', 'Acter et surveiller', 0.85, { sat: 1 }, {}, 'Plainte actée, la victime se sent écoutée.', 'La victime trouve qu’on ne fait rien.')] },
  { ctx: 'flou', titre: 'Série de vols dans des caves, aucun témoin', opts: [
    o('procedure', 'Recouper les plaintes et les horaires', 0.65, { pts: 4 }, {}, 'Les vols tombent tous les mardis : planque, flagrant délit.', 'Rien ne ressort des plaintes.'),
    o('force', 'Fouiller les caves de l’immeuble', 0.5, { pts: 4 }, { sat: -2 }, 'Le butin dort dans une cave inoccupée.', 'Les habitants n’apprécient pas la fouille.'),
    o('prudence', 'Conseils de prévention aux habitants', 0.85, { sat: 1 }, {}, 'Les caves sont fermées, les vols cessent.', 'Les vols continuent ailleurs.')] },
];

/** L'appel du jour : le même pour toutes les zones de la partie. */
export function appelDuJour(state, T = state.turn) {
  const i = makeRng(`${state.seed}:s${state.season}:t${T}:appel-jour`).int(0, APPELS.length - 1);
  return { i, T, ...APPELS[i] };
}

// ───── Figures et galons ─────
export const figureDe = (z, role) => (z && z.equipe || []).find((m) => m.role === role) || null;
/** Vrai si la figure de ce rôle a pris ce galon (palier 0 à 2, 'A' terrain ou 'B' service). */
export function aGalon(z, role, palier, k) {
  const m = figureDe(z, role);
  return !!(m && Array.isArray(m.galons) && m.galons[palier] === k);
}
/** Le tuteur : une figure avec le galon service du palier 2. */
export const aTuteur = (z) => (z && z.equipe || []).some((m) => Array.isArray(m.galons) && m.galons[1] === 'B');

/** Options de l'appel pour cette zone : les approches de base plus celles réservées par les galons terrain. */
export function optionsAppel(z, appel) {
  const l = appel.opts.map((x) => ({ ...x }));
  for (const [cle, r] of Object.entries(RESERVEES)) {
    const [role, p] = cle.split(':');
    if (r.ctx.includes(appel.ctx) && aGalon(z, role, Number(p), 'A')) {
      const m = figureDe(z, role);
      l.push(o(r.base, r.nom, r.p, r.ok, r.ko, `${m ? m.nom : 'La figure'} : « ${r.nom} » réussie.`, `« ${r.nom} » tentée, sans succès.`));
      l[l.length - 1].reservee = cle;
    }
  }
  for (const x of optionsMateriel(z, appel, appel.T)) l.push({ ...x });
  return l;
}
/** Ce que ferait la brigade seule : ce que le joueur a choisi dans ce genre de situation, sinon son style, sinon la prudence. */
export function intentionBrigade(z, appel) {
  const opts = optionsAppel(z, appel), sb = (z && z.styleBrigade) || {}, m = sb[appel.ctx] || {}, g = sb._ || {};
  let best = null, bs = 0;
  for (const op of opts) { const s = (m[op.app] || 0) * 2 + (g[op.app] || 0) * 0.5 + (op.reservee ? 0.2 : 0); if (s > bs) { bs = s; best = op; } }
  if (best) {
    const n = m[best.app] || 0;
    return { op: best, appris: true, pourquoi: n ? `${CTX[appel.ctx].nom.toLowerCase()}, tu as choisi « ${APPROCHES[best.app].nom.toLowerCase()} » ${n} fois` : `ton style en général : « ${APPROCHES[best.app].nom.toLowerCase()} »` };
  }
  return { op: opts.find((x) => x.app === 'prudence') || opts[0], appris: false, pourquoi: 'elle ne sait pas encore ce que tu ferais : prudence par défaut' };
}
/** Choix lu dans les ordres : l'index d'une option (ou rien : la brigade décide seule). */
export const lireAppel = (ord) => (ord && Number.isInteger(ord.appel) && ord.appel >= 0 && ord.appel < 8 ? ord.appel : null);

/**
 * Résout l'appel du jour pour une zone (tour de 20:00). Le choix du joueur apprend son style à la brigade.
 * Effets : points de terrain, satisfaction, réputation, moral, expérience de la figure qui mène.
 */
export function resoudreAppel(state, z, ord, T) {
  const appel = appelDuJour(state, T), opts = optionsAppel(z, appel), k = lireAppel(ord);
  const choisi = k != null && opts[k] ? opts[k] : null, it = intentionBrigade(z, appel);
  const op = choisi || it.op;
  if (choisi) {
    const sb = (z.styleBrigade ||= {}), c = (sb[appel.ctx] ||= {}), g = (sb._ ||= {});
    c[op.app] = (c[op.app] || 0) + 1; g[op.app] = (g[op.app] || 0) + 1;
  }
  const meneur = figureDe(z, CTX[appel.ctx].role);
  const binome = adjointsDe(z).find((a) => a.role === CTX[appel.ctx].role) || null;
  const p = Math.min(0.95, op.p + (meneur && meneur.spec ? BRIGADE.specBonus : 0) + (binome ? RANG.bonusAppel : 0) + (op.app === 'procedure' ? bonusBodycam(z) : 0));
  const ok = makeRng(`${state.seed}:s${state.season}:t${T}:appel-res:${z.uid}`).next() < p;
  const eff = { ...(ok ? op.ok : op.ko) };
  z._points = (z._points || 0) + (eff.pts || 0);
  z.satisfaction += eff.sat || 0; z.reputation += eff.rep || 0; z.moral += eff.moral || 0;
  if (ok && meneur) meneur.xp = (meneur.xp || 0) + BRIGADE.xpAppel;
  if (ok && binome) binome.xp = (binome.xp || 0) + BRIGADE.xpAppel;
  let blesseMat = '';
  // Matériel abîmé : un taser ou un cordon casqué qui échoue, une interpellation ratée avec des bodycams.
  if (!ok && z.materiel) {
    const rd = makeRng(`${state.seed}:s${state.season}:t${T}:appel-mat:${z.uid}`);
    const d = op.materiel === 'taser' && rd.chance(0.4) ? abimer(z, 'taser', 1, rd)
      : op.materiel === 'gnep' && rd.chance(0.5) ? abimer(z, 'gnep', 1 + (rd.chance(0.3) ? 1 : 0), rd)
      : op.app === 'force' && (z.materiel.bodycam || 0) > 0 && rd.chance(0.25) ? abimer(z, 'bodycam', 1, rd) : '';
    if (d) blesseMat = ` ${d}.`;
  }
  // Appel raté qui tourne mal (moral en baisse) : un agent peut être touché. Un gilet valide arrête souvent le coup.
  let blesse = '';
  if (!ok && (eff.moral || 0) < 0) {
    const r = makeRng(`${state.seed}:s${state.season}:t${T}:appel-bl:${z.uid}`);
    if (r.chance(Math.min(0.9, 0.6 * risqueBlessure(z)))) {
      const couvert = z.materiel ? 1 - trouGilets(z, T) : 1;
      if (r.chance(couvert * MAT.gilets.arrete)) { const d = z.materiel ? abimer(z, 'gilets', 1, r) : ''; blesse = ` Un agent est touché, mais son gilet a arrêté le coup${d ? ` (${d[0].toLowerCase()}${d.slice(1)})` : ''}.`; z.stats = z.stats || {}; z.stats.coupsArretes = (z.stats.coupsArretes || 0) + 1; }
      else { (z.blesses ||= []).push({ n: 1, retour: T + 4, motif: 'appel du jour' }); z.stats = z.stats || {}; z.stats.blessesAppel = (z.stats.blessesAppel || 0) + 1; z.moral -= 1; blesse = ` Un agent est blessé${couvert < 1 ? ' (son gilet n’était plus valide)' : ''} : absent 3 jours.`; }
    }
  }
  z.appelHier = { t: T, i: appel.i, titre: appel.titre, app: op.app, label: op.label, ok, txt: ok ? op.tOk : op.tKo, seule: !choisi, pourquoi: choisi ? null : it.pourquoi, eff };
  const effTxt = [eff.pts ? `+${eff.pts} pts` : '', eff.sat ? `satisfaction ${eff.sat > 0 ? '+' : ''}${eff.sat}` : '', eff.rep ? `réputation ${eff.rep > 0 ? '+' : ''}${eff.rep}` : '', eff.moral ? `moral ${eff.moral}` : ''].filter(Boolean).join(', ');
  return `Appel du jour (« ${appel.titre} »${binome ? `, avec ${binome.prenom} ${binome.nom} en binôme` : ''}) : ${choisi ? 'ta brigade suit ta consigne' : `ta brigade décide seule (${it.pourquoi})`}, ${APPROCHES[op.app].ico} ${op.label.toLowerCase()}. ${ok ? 'Réussi' : 'Raté'} : ${ok ? op.tOk : op.tKo}${effTxt ? ` (${effTxt})` : ''}.${blesse}${blesseMat}`;
}

// ───── Rodage des recrues ─────
/** Recrues encore en formation ce soir. */
export const enRodage = (z, T) => (z && z.rodage || []).filter((r) => r.fin > T).reduce((s, r) => s + r.n, 0);
/** Multiplicateur de capacité de tous les services : une recrue en formation compte pour un demi-agent. */
export function facteurRodage(z, T) {
  const n = enRodage(z, T), a = Math.max(1, (z && z.agents) || 1);
  return Math.max(0.5, 1 - (n * (1 - BRIGADE.rodage.efficacite)) / a);
}
/** Recrues qui sortent de l'académie ce soir : en formation jusqu'au jour indiqué. */
export function ajouterRodage(z, n, T) {
  if (!n) return null;
  const d = aTuteur(z) ? BRIGADE.rodage.tuteur : BRIGADE.rodage.jours;
  (z.rodage ||= []).push({ n, fin: T + 1 + d });
  z.rodage = z.rodage.filter((r) => r.fin > T);
  return d;
}

// ───── Sortir du rang : 6e et 7e figures (adjoints) ─────
// Une recrue formée sous une figure devient candidate. Places : 6e à l'hôtel de police niveau 2, 7e au niveau 4.
// L'adjoint double la figure de son service : il prend le service quand elle part en mission ou encadre ailleurs (relève),
// et l'accompagne sur l'appel du jour de son service (+5 %). Il progresse à mi-vitesse avec les gains de son service.
export const RANG = { places: [[2, 6], [4, 7]], niveauDepart: 1, xpDepart: 25, bonusAppel: 0.05, xpPart: 0.5 };
const PRENOMS_RANG = [['Moussa', 0], ['Yasmine', 1], ['Thomas', 0], ['Inès', 1], ['Bastien', 0], ['Chloé', 1], ['Mehdi', 0], ['Aurélie', 1], ['Lucas', 0], ['Fatima', 1]];
const NOMS_RANG = ['Diallo', 'Renard', 'Collard', 'Lambert', 'Fontaine', 'Delvaux', 'Bodart', 'Hennebert', 'Masson', 'Gilson'];
/** Nombre de places de figure de la zone (5, puis 6 et 7 avec l'hôtel de police). */
export function placesFigures(z) {
  const hp = (z && z.batiments && z.batiments.bureaux) || 0;
  return 5 + RANG.places.filter(([niv]) => hp >= niv).length;
}
export const adjointsDe = (z) => (z && Array.isArray(z.adjoints) ? z.adjoints : []);
/** Niveau de l'hôtel de police qui ouvre la prochaine place (ou null). */
export function prochainePlace(z) {
  const p = RANG.places.find(([, n]) => n > placesFigures(z));
  return p ? p[0] : null;
}
/** Une promotion est-elle possible ce soir ? */
export const peutSortir = (z, T) => !!(z && z.candidat && z.candidat.pret <= T && 5 + adjointsDe(z).length < placesFigures(z));

/** Désigne la candidate ou le candidat d'une promotion de recrues (formé par la figure la plus expérimentée, le tuteur d'abord). */
export function designerCandidat(state, z, T, finFormation) {
  if (z.candidat || adjointsDe(z).length >= RANG.places.length || !(z.equipe || []).length) return null;
  const pris = new Set(adjointsDe(z).map((a) => a.role));
  const fig = (z.equipe || []).filter((m) => !pris.has(m.role))
    .sort((a, b) => ((Array.isArray(b.galons) && b.galons[1] === 'B') - (Array.isArray(a.galons) && a.galons[1] === 'B')) || (b.niveau || 0) - (a.niveau || 0) || (b.xp || 0) - (a.xp || 0))[0];
  if (!fig) return null;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:rang:${z.uid}`);
  const deja = new Set([...(z.equipe || []), ...adjointsDe(z)].map((m) => m.nom));
  const noms = rng.shuffle(NOMS_RANG).filter((n) => !deja.has(n)), p = rng.shuffle(PRENOMS_RANG)[0];
  z.candidat = { prenom: p[0], f: p[1], nom: noms[0] || 'Martin', role: fig.role, mentor: `${fig.prenom} ${fig.nom}`, pret: finFormation };
  return z.candidat;
}
/** Promotion demandée dans les ordres. Renvoie l'adjoint créé, ou null. */
export function sortirDuRang(z, T) {
  if (!peutSortir(z, T)) return null;
  const c = z.candidat;
  const a = { role: c.role, prenom: c.prenom, nom: c.nom, f: c.f, mentor: c.mentor, xp: RANG.xpDepart, niveau: RANG.niveauDepart, depuis: T };
  (z.adjoints ||= []).push(a);
  delete z.candidat;
  return a;
}
/** Relève : chaque adjoint encadre le service de sa figure quand personne ne l'encadre ce soir. Modifie `out`. */
export function releve(z, out, service) {
  const faits = [];
  for (const a of adjointsDe(z)) {
    const s = service[a.role];
    if (!s || out[s]) continue;
    out[s] = { role: a.role, bonus: bonusChef(a.niveau), adjoint: a };
    faits.push({ a, s });
  }
  return faits;
}
/** Expérience des adjoints : la moitié de ce qu'a gagné leur service. Renvoie les adjoints qui changent de niveau. */
export function progresserAdjoints(z, gains, seuils) {
  const montees = [];
  for (const a of adjointsDe(z)) {
    a.xp += Math.max(0, Math.round((gains[a.role] || 0) * RANG.xpPart));
    let niv = 0; for (let k = 0; k < seuils.length; k++) if (a.xp >= seuils[k]) niv = k;
    if (niv > a.niveau) { a.niveau = niv; montees.push(a); }
  }
  return montees;
}
