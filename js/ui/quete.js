// Écran de l’énigme du jour.
import { nominette, ligneSemaine, laureatsProvisoires, enTeteSemaine } from './defis.js';
import { CHALLENGE } from '../engine/challenge.js';
import { euros } from './euros.js';
import { nominetteBitonal } from './bitonal.js';
import { S, esc, icon, tabbar, myZone } from './common.js';
import { QUEST_TYPES, QUEST_LABELS } from '../quests/quests.js';
import { SERVICES, SERVICE_LABELS, ENIGMES, gainMoral, chanceDelegue } from '../engine/constants.js';
import { MINI_JEUX } from './incidents.js';
import { quizLocal, quizEnregistre, quizQuestionHtml, bonnesReponses } from './quiz.js';
import { QUIZ, QUIZ_THEMES } from '../quests/quiz.js';
import { cadenasHtml, cadenasResultat, essaisHtml } from './cadenas.js';
import { chronoHtml, disqueHtml, plaquesHtml, temoignagesHtml, figureInteractive, filatureOutils, butinHtml, ligneHtml, trajetsHtml, icoGrille, ecritureHtml, avatar, codeHtml } from './enigmes.js';

/** Le joueur a-t-il déjà changé une énigme aujourd'hui ? */
function rerollUtilise() { return (S.quests || []).some((q) => q.variante); }

const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

// Documents de l'énigme. Photos « à mémoriser » : la photo 1 disparaît dès qu'on ouvre la photo 2
// (mémorisé sur l'appareil, pour qu'un rechargement ne la fasse pas revenir).
function renderFigures(q, fini) {
  if (q.type === 'ecriture') return ecritureHtml(q, S.questPick, fini);
  const tactile = (q.type === 'photos' || q.type === 'filature') && !fini;
  const fig = (f) => `<figure class="fig ${tactile ? 'tactile' : ''}"><figcaption>${esc(f.titre)}</figcaption>${tactile ? figureInteractive(q, f.svg, S.questPick) : f.svg}</figure>`;
  // Photos à comparer : côte à côte pour les voir sur le même écran (sauf pendant la mémorisation, une seule à la fois).
  const cote = q.type === 'photos' && q.figures.length === 2 && (!q.memo || fini);
  const cls = cote ? 'figs cote' : 'figs';
  if (!q.memo || fini) return `<section class="${cls}" aria-label="Documents">${q.figures.map(fig).join('')}</section>`;
  const vu = (S.memoVu && S.memoVu[q.id]) || lire(`mazp-memo-${q.id}`);
  const [f1, f2] = q.figures;
  const range = (f, txt) => `<figure class="fig"><figcaption>${esc(f.titre)}</figcaption><div class="fig-range">${txt}</div></figure>`;
  return `<section class="${cls}" aria-label="Documents">${vu ? range(f1, 'Rangée au dossier') + fig(f2) : fig(f1) + range(f2, 'Pas encore ouverte')}</section>
    ${vu ? '' : '<button type="button" class="btn outline block" data-action="memo-voir">J’ai mémorisé : ouvrir la photo 2</button>'}`;
}

// Grille de déduction à cocher : ✗ impossible, ✓ certain (mémorisée sur cet appareil).
function renderGrille(q) {
  const { gens, veh, lieux } = q.grille;
  const m = (S.grilleMarks && S.grilleMarks[q.id]) || lire(`mazp-grille-${q.id}`) || {};
  S.grilleMarks = { ...(S.grilleMarks || {}), [q.id]: m };
  const table = (titre, lignes, cols, pre) => `<div class="gtab"><table><caption>${titre}</caption>
    <tr><th></th>${cols.map((c) => `<th scope="col">${icoGrille(c)}<span>${esc(c)}</span></th>`).join('')}</tr>
    ${lignes.map((l, i) => `<tr><th scope="row"><span class="row" style="gap:6px">${icoGrille(l) || avatar(l, 22)}${esc(l)}</span></th>${cols.map((c, j) => {
      const k = `${pre}:${i}:${j}`; const v = m[k] || '';
      return `<td><button type="button" class="gcell ${v === '✓' ? 'yes' : v ? 'no' : ''}" data-action="grille-mark" data-k="${k}" aria-label="${esc(l)} / ${esc(c)} : ${v === '✓' ? 'certain' : v ? 'impossible' : 'inconnu'}">${v}</button></td>`;
    }).join('')}</tr>`).join('')}</table></div>`;
  return `<section class="card tight" aria-label="Grille de déduction">
    <div class="between"><h2 class="section" style="margin:0">Ta grille</h2><button type="button" class="btn small ghost" data-action="grille-reset">Effacer</button></div>
    <p class="tiny muted" style="margin:0">Touche une case : ✗ impossible, puis ✓ certain, puis vide.</p>
    ${table('Qui · véhicule', gens, veh, 'v')}${table('Qui · endroit', gens, lieux, 'l')}${table('Véhicule · endroit', veh, lieux, 'x')}
  </section>`;
}

const ICO_ENIGME = { quiment: '🤥', grille: '🏘️', cadenas: '🔐', chronologie: '🕒', code: '🔣', plaque: '🚗', photos: '📷', filature: '👣', butin: '💰', horaires: '🚌', ecriture: '✍️' };
const GROUPES_ENIGMES = [['Logique', ['quiment', 'grille', 'chronologie', 'horaires']], ['Observation', ['photos', 'plaque', 'ecriture', 'filature']], ['Chiffres et codes', ['cadenas', 'code', 'butin']]];
const ICO_MJ = { bitonal: '🚨', bouclage: '🛡️', colis: '💣', crochetage: '🔓', depanneuse: '🚧', dossier: '📄', empreintes: '🖐️', adn: '🧬', reseau: '🔌', interception: '📡' };
const COUL_MJ = { intervention: '#FF6E6A', recherche: '#63B0FF', roulage: '#FFB23F', proximite: '#3DD39A', labo: '#A78BFA', rccu: '#5AD1E6' };

/** Encart « Prime de la semaine » du Challenge : la règle, les lauréats provisoires et ceux de la semaine passée. */
function primeSemaine() {
  const nomJeu = (j) => (MINI_JEUX.find((m) => m.jeu === j) || {}).nom || j;
  const moi = S.user && S.user.uid;
  const prov = laureatsProvisoires();
  const zn = (uid) => { const z = S.state && S.state.zones[uid]; return z ? z.nom : 'une zone'; };
  const passe = (S.state && S.state.challenge && S.state.challenge.laureats) || [];
  const ligne = (l, nom) => `<li><span>${esc(nomJeu(l.jeu))}</span><span class="${l.uid === moi ? 'ok' : ''}">${esc(l.uid === moi ? 'toi' : nom)} · niv. ${l.niveau}</span></li>`;
  // Tous les mini-jeux du Challenge : le lauréat provisoire, ou pourquoi la prime reste à prendre
  // (personne au niveau minimum, ou le seul en tête a déjà sa prime sur un autre jeu).
  const qui = (uid, nom) => esc(uid === moi ? 'toi' : nom);
  const ligneProv = (j, l) => {
    const tete = enTeteSemaine(j);
    if (l) {
      const note = !l.premier && tete ? `<small class="muted" style="display:block;font-weight:400">${qui(tete.uid, tete.nom)} en tête, déjà primé${tete.uid === moi ? '' : '(e)'} ailleurs</small>` : '';
      return `<li><span>${esc(nomJeu(j))}</span><span class="${l.uid === moi ? 'ok' : ''}">${qui(l.uid, l.nom)} · niv. ${l.niveau}${note}</span></li>`;
    }
    const etat = tete ? `à prendre <small style="display:block">${qui(tete.uid, tete.nom)} en tête (niv. ${tete.niveau}), déjà primé${tete.uid === moi ? '' : '(e)'} ailleurs</small>` : `à prendre dès le niv. ${CHALLENGE.niveauMin}`;
    return `<li class="muted"><span>${esc(nomJeu(j))}</span><span style="font-weight:400">${etat}</span></li>`;
  };
  return `<div class="prime-chal">
    <div class="between" style="gap:8px;align-items:flex-start"><span class="prime-t">🏅 Prime de la semaine</span><span class="tiny muted" style="text-align:right">remise dimanche 20:00</span></div>
    <span class="small">Le meilleur niveau de la semaine sur chaque mini-jeu (dès le niveau ${CHALLENGE.niveauMin}) rapporte <strong>${euros(CHALLENGE.prime)}</strong> à sa zone et <strong>+${CHALLENGE.jauge}</strong> sur la jauge des skins. <strong>Une prime par joueur</strong> : en tête sur plusieurs jeux, les autres primes passent au suivant.</span>
    ${prov.length ? `<span class="tr-grp">Si la semaine finissait maintenant</span><ul class="prime-l">${CHALLENGE.jeux.map((j) => ligneProv(j, prov.find((l) => l.jeu === j))).join('')}</ul>` : '<span class="tiny muted">Personne n’a encore atteint le niveau ' + CHALLENGE.niveauMin + ' cette semaine : les primes sont à prendre.</span>'}
    ${passe.length ? `<details class="prime-d"><summary class="tiny muted">Lauréats de la semaine passée</summary><ul class="prime-l">${passe.map((l) => ligne(l, zn(l.uid))).join('')}</ul></details>` : ''}
  </div>`;
}

/** Entraînement aux mini-jeux : des tuiles par famille (incidents du jour, appui PJF), lancées directement. */
function entrainementMiniJeux() {
  const tuile = (m) => `<button type="button" class="tr-tuile" data-action="mj-train" data-j="${m.jeu}" style="--c:${COUL_MJ[m.service] || '#63B0FF'}"><span class="tr-ico" aria-hidden="true">${ICO_MJ[m.jeu] || '🎮'}</span><span class="tr-nom">${esc(m.nom)}</span><span class="tr-s">${esc(SERVICE_LABELS[m.service] || (m.service === 'labo' ? 'Labo' : 'RCCU'))}</span>${m.jeu === 'bitonal' ? nominetteBitonal() : nominette(m.jeu) + (CHALLENGE.jeux.includes(m.jeu) ? ligneSemaine(m.jeu) : '')}</button>`;
  const inc = MINI_JEUX.filter((m) => !['labo', 'rccu'].includes(m.service)), pjf = MINI_JEUX.filter((m) => ['labo', 'rccu'].includes(m.service));
  return `<section class="card tight" aria-label="Mini-jeux" style="gap:10px">
    <span class="tiny muted">Chaque mini-jeu, du niveau 1 (tout doux) aussi haut que possible, trois erreurs permises. Le record de la partie met son nom sur la tuile.</span>
    ${primeSemaine()}
    <span class="tr-grp">Incidents du jour</span><div class="tr-grille">${inc.map(tuile).join('')}</div>
    <span class="tr-grp">Appui PJF à l’enquête</span><div class="tr-grille">${pjf.map(tuile).join('')}</div>
  </section>`;
}

/** Barre de l'entraînement : type (tuiles par famille), difficulté, statistiques personnelles. */
function entrainementBarre() {
  let st = {};
  try { st = JSON.parse(localStorage.getItem('mazp-entrainement') || '{}'); } catch (e) { /* rien */ }
  const t = S.trainType || 'quiment', d = S.trainDiff || 3;
  const x = st[t];
  const ouvert = S.trainChoix !== false;
  const tuile = (k) => { const y = st[k]; return `<button type="button" class="tr-tuile petite" data-action="train-type" data-v="${k}" aria-pressed="${k === t}"><span class="tr-ico" aria-hidden="true">${ICO_ENIGME[k] || '❓'}</span><span class="tr-nom">${esc(QUEST_LABELS[k])}</span>${y ? `<span class="tr-s">${y.ok}/${y.n}</span>` : ''}</button>`; };
  const autres = QUEST_TYPES.filter((k) => !GROUPES_ENIGMES.some(([, l]) => l.includes(k)));
  const groupes = [...GROUPES_ENIGMES, ...(autres.length ? [['Autres', autres]] : [])];
  return `<section class="card tight" aria-label="Réglages de l’entraînement" style="gap:8px">
    <button type="button" class="between tr-entete" data-action="train-choix" aria-expanded="${ouvert}"><span class="small" style="font-weight:600">Énigme : ${ICO_ENIGME[t] || ''} ${esc(QUEST_LABELS[t])}</span><span class="tiny muted">${ouvert ? 'replier' : 'changer'} ${icon('chevron', 12)}</span></button>
    ${ouvert ? groupes.map(([g, l]) => `<span class="tr-grp">${esc(g)}</span><div class="tr-grille">${l.filter((k) => QUEST_TYPES.includes(k)).map(tuile).join('')}</div>`).join('') : ''}
    <div class="col" style="gap:4px"><span class="small" style="font-weight:600">Difficulté</span>
      <div class="segn" style="grid-template-columns:repeat(6,minmax(0,1fr))">${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" aria-selected="${n === d}" data-action="train-diff" data-v="${n}">${n === 6 ? 'HC' : n}</button>`).join('')}</div></div>
    <span class="tiny muted">${x ? `Ton entraînement en ${esc(QUEST_LABELS[t])} : ${x.ok} réussie${x.ok > 1 ? 's' : ''} sur ${x.n}.` : 'Rien ne compte ici : ni classement, ni moral, ni PS.'} « HC » = niveau hardcore, celui du dossier noir.</span>
  </section>`;
}


/** Libellé d'un bonus d'énigmes. */
function bonusLabel(b, gBonus, enqueteOuverte) {
  return b.bonus === 'moral' ? `+${gBonus} de moral` : b.bonus === 'budget' ? `+${ENIGMES.bonusBudget} k€` : b.bonus === 'indice' ? (enqueteOuverte ? '+1 indice pour l’enquête' : `+${ENIGMES.bonusBudget} k€ (pas d’enquête en cours)`) : `+${Math.round((ENIGMES.bonusCapacite - 1) * 100)} % de capacité en ${SERVICE_LABELS[b.service] || '?'}`;
}

/** Boutons de choix du bonus (énigmes réussies ou confiées à un agent). */
function choixBonus(pris, gBonus, enqueteOuverte, { action = 'quest-bonus', change = 'quest-capacite' } = {}) {
  return `<div class="choices" style="grid-template-columns:repeat(${enqueteOuverte ? 3 : 2},minmax(0,1fr))">
      ${enqueteOuverte ? `<button type="button" class="choice" data-action="${action}" data-v="indice" aria-pressed="${!!pris && pris.bonus === 'indice'}"><span>+1 indice</span><span class="s">enquête</span></button>` : ''}
      <button type="button" class="choice" data-action="${action}" data-v="moral" aria-pressed="${!!pris && pris.bonus === 'moral'}"><span>+${gBonus} moral</span>${gBonus < ENIGMES.bonusMoral ? '<span class="s">moral déjà haut</span>' : ''}</button>
      <button type="button" class="choice" data-action="${action}" data-v="budget" aria-pressed="${!!pris && pris.bonus === 'budget'}"><span>+${ENIGMES.bonusBudget} k€</span></button>
    </div>
    <label class="field">Ou +${Math.round((ENIGMES.bonusCapacite - 1) * 100)} % de capacité pour un service
      <select class="text" data-change="${change}"><option value="">Choisir un service…</option>${SERVICES.map((s) => `<option value="${s}" ${pris && pris.bonus === 'capacite' && pris.service === s ? 'selected' : ''}>${SERVICE_LABELS[s]}</option>`).join('')}</select></label>`;
}

/** Énigmes confiées à un agent : proposition (aucune réponse donnée) ou suivi (déjà confiées). */
function delegueHtml(delegue, moral, gBonus, enqueteOuverte) {
  const pct = Math.round(chanceDelegue(moral) * 100);
  const regles = `Il a <strong>${pct} %</strong> de chances de décrocher le bonus (selon le moral de tes troupes). Pas de PS ni de prime « sans faute », pas de moral perdu s’il sèche. Pendant qu’il planche, +${ENIGMES.delegue.paperasse} dossier de paperasse.`;
  if (delegue) {
    return `<section class="card" aria-label="Énigmes confiées à un agent" style="gap:10px">
      <span class="kicker">Énigmes du jour</span>
      <h1 class="big" style="margin:0">Confiées à un agent</h1>
      <p class="small" style="margin:0">Bonus visé : <strong>${esc(bonusLabel(delegue, gBonus, enqueteOuverte))}</strong>. Verdict dans ton rapport, à 20:00.</p>
      <p class="tiny muted" style="margin:0">${regles}</p>
      ${S.delegueChanger ? `<span class="small" style="font-weight:600">Changer le bonus visé</span>${choixBonus(delegue, gBonus, enqueteOuverte, { action: 'quest-delegue', change: 'quest-delegue-capacite' })}`
        : '<button type="button" class="btn small ghost" data-action="delegue-changer">Changer le bonus visé</button>'}
    </section>`;
  }
  if (!S.altVue) return `<button type="button" class="btn small ghost block" data-action="alt-vue" data-v="choix">${icon('send', 16)} Pas le temps ou pas l’envie ? Deux autres façons de gagner ton bonus</button>`;
  const fermer = '<button type="button" class="btn small ghost" data-action="alt-vue" data-v="" aria-label="Fermer">✕</button>';
  if (S.altVue === 'choix') {
    return `<section class="card" aria-label="Autres façons de gagner le bonus" style="gap:10px">
      <div class="between"><span style="font-weight:700">Pas le temps ou pas l’envie ?</span>${fermer}</div>
      <div class="choices one">
        <button type="button" class="choice alt-c" data-action="alt-vue" data-v="quiz"><span>⏱ Quiz express</span><span class="s">${QUIZ.questions} questions de culture générale, ${QUIZ.secondes} s chacune. ${QUIZ.seuil} bonnes réponses : bonus complet.</span></button>
        <button type="button" class="choice alt-c" data-action="alt-vue" data-v="agent"><span>🧑‍💼 Confier à un agent</span><span class="s">Rien à faire : il a ${pct} % de chances de décrocher le bonus.</span></button>
      </div>
      <p class="tiny muted" style="margin:0">Dans les deux cas : pas de PS ni de prime « sans faute », et les 3 énigmes du jour se ferment (le dossier noir reste ouvert).</p>
    </section>`;
  }
  if (S.altVue === 'quiz') {
    return `<section class="card" aria-label="Quiz express" style="gap:10px">
      <div class="between"><span style="font-weight:700">⏱ Quiz express</span>${fermer}</div>
      <p class="small" style="margin:0">${QUIZ.questions} questions, ${QUIZ.secondes} secondes chacune, 4 réponses possibles. Thèmes : ${Object.values(QUIZ_THEMES).map((t) => `${t.ico} ${esc(t.nom)}`).join(', ')}.</p>
      <p class="small" style="margin:0"><strong>${QUIZ.seuil} bonnes réponses sur ${QUIZ.questions}</strong> : tu choisis ton bonus, comme avec les énigmes. Moins : pas de bonus, sans autre conséquence.</p>
      <p class="tiny" style="margin:0;color:var(--red-soft)">Un seul essai. Le chrono tourne même si tu quittes l’écran. Les 3 énigmes du jour se ferment dès la première question.</p>
      <button type="button" class="btn primary block" data-action="quiz-start">Lancer le quiz</button>
    </section>`;
  }
  return `<section class="card" aria-label="Confier les énigmes à un agent" style="gap:10px">
      <div class="between"><span style="font-weight:700">🧑‍💼 Confier les énigmes à un agent</span>${fermer}</div>
      <p class="small" style="margin:0">Un agent planche dessus à ta place. ${regles}</p>
      <p class="tiny" style="margin:0;color:var(--red-soft)">Définitif pour aujourd’hui : tu ne pourras plus répondre aux 3 énigmes (le dossier noir reste ouvert).</p>
      <span class="small" style="font-weight:600">Quel bonus doit-il viser ?</span>
      ${choixBonus(null, gBonus, enqueteOuverte, { action: 'quest-delegue', change: 'quest-delegue-capacite' })}
    </section>`;
}

/** Résultat du quiz express (enregistré), avec le choix du bonus s'il est gagné. */
function quizResultatHtml(r, gBonus, enqueteOuverte) {
  const bons = Number(r.tentatives) || 0, gagne = bons >= QUIZ.seuil;
  return `<section class="card ${gagne ? 'green' : ''}" aria-label="Quiz express" style="gap:10px">
      <span class="kicker">Énigmes du jour · quiz express</span>
      <h1 class="big" style="margin:0">${bons} sur ${QUIZ.questions}</h1>
      ${gagne ? (r.bonus && !S.bonusChanger
        ? `<div class="between" style="gap:8px"><p class="small" style="margin:0;font-weight:600">Bonus du jour : ${esc(bonusLabel(r, gBonus, enqueteOuverte))}. Il sera appliqué à 20:00.</p><button type="button" class="btn small ghost" data-action="bonus-changer">Changer</button></div>`
        : `<span class="ok" style="font-weight:700">Gagné ! Choisis ton bonus du jour</span>${choixBonus(r.bonus ? r : null, gBonus, enqueteOuverte, { action: 'quiz-bonus', change: 'quiz-capacite' })}<span class="tiny muted">Sans choix, ce sera +${ENIGMES.bonusBudget} k€.</span>`)
        : `<p class="small" style="margin:0">Il fallait ${QUIZ.seuil} bonnes réponses : pas de bonus aujourd’hui, sans autre conséquence. Nouvelles énigmes demain après 20:00.</p>`}
    </section>`;
}

export function renderQuete() {
  const train = S.questMode === 'train';
  const modes = `<div class="seg2" role="tablist" aria-label="Mode"><button type="button" role="tab" aria-selected="${!train}" data-action="quest-mode" data-v="jour">Énigmes du jour</button><button type="button" role="tab" aria-selected="${train}" data-action="quest-mode" data-v="train">Entraînement</button></div>`;
  const vueMj = train && S.trainVue === 'minijeux';
  const sousOnglets = train ? `<div class="seg2" role="tablist" aria-label="Entraînement"><button type="button" role="tab" aria-selected="${vueMj}" data-action="train-vue" data-v="minijeux">🏆 Challenge</button><button type="button" role="tab" aria-selected="${!vueMj}" data-action="train-vue" data-v="enigmes">Énigmes</button></div>` : '';
  if (vueMj) {
    return `<main class="screen quete">
    ${modes}
    ${sousOnglets}
    ${entrainementMiniJeux()}
  </main>${tabbar('quete', { questBadge: false })}`;
  }
  const i = Math.min(S.questIdx || 0, 3);
  const noir = !train && i === 3;
  const q = train ? S.train : noir ? S.noir : S.quests[i];
  const results = S.questResults || [];
  const r = train ? (S.trainRes ? { statut: S.trainRes.ok ? 'ok' : 'rate', reponse: S.trainRes.reponse } : { statut: null })
    : noir ? (S.noirResult || { statut: null, tentatives: 0 }) : (results[i] || { statut: null, tentatives: 0 });
  const fini = r.statut === 'ok' || r.statut === 'rate';
  const picked = S.questPick;
  const ok = results.filter((x) => x && x.statut === 'ok').length;
  const bonusPris = results.find((x) => x && x.bonus);
  const icone = (x) => (!x || !x.statut ? '' : x.statut === 'ok' ? ' ✓' : x.statut === 'delegue' ? ' ⇢' : x.statut === 'quiz' ? ' ⏱' : ' ✗');

  const choixHtml = q.mode !== 'choix' ? ''
    : q.type === 'plaque' ? plaquesHtml(q, picked, fini)
    : q.type === 'horaires' && q.trajets ? trajetsHtml(q, picked, fini)
    : q.type === 'ecriture' ? (picked ? `<p class="small" style="margin:0">Ton choix : <strong>${esc(picked)}</strong></p>` : '<p class="small muted" style="margin:0">Touche l’échantillon de l’auteur, plus haut.</p>')
    : q.type === 'photos' && q.figures[1].svg.includes('ph-hit') ? `<p class="small ${picked ? '' : 'muted'}" style="margin:0">${picked ? `Place choisie : <strong>${esc(picked)}</strong>` : 'Touche la place sur une des photos.'}</p>`
    : q.mode === 'choix' ? `<div class="choices ${q.choix.length > 4 || q.choix.some((c) => c.label.length > 12) ? 'one' : ''}" role="group" aria-label="Réponses">
      ${q.choix.map((c) => `<button type="button" class="choice" data-action="quest-pick" data-v="${esc(c.id)}" aria-pressed="${picked === c.id}" ${fini ? 'disabled' : ''}>
        <span ${q.mono ? 'class="code" style="letter-spacing:1px"' : q.type === 'quiment' || q.type === 'grille' ? 'class="row" style="gap:8px;justify-content:center"' : ''}>${q.type === 'quiment' ? c.label.split(' et ').map((x) => avatar(x, 24)).join('') : q.type === 'grille' ? icoGrille(c.label) : ''}${esc(c.label)}</span>${c.sub ? `<span class="s">${esc(c.sub)}</span>` : ''}</button>`).join('')}
    </div>` : '';

  const mz = myZone(), moralZ = mz ? mz.moral : 50;
  const enqueteOuverte = !!(S.state && S.state.enquete && !S.state.enquetePause);
  const gBonus = gainMoral(ENIGMES.bonusMoral, moralZ), sf = ENIGMES.sansFaute, gSf = gainMoral(sf.moral, moralZ);
  const primeSf = `+${sf.budget} k€, +${gSf} de moral${gSf < sf.moral ? ' (moral déjà haut)' : ''} et +${sf.ps} PS`;
  const bonusCard = !train && !noir && ok >= 2 ? `<section class="card green">
      ${bonusPris && !S.bonusChanger ? `<div class="between" style="gap:8px"><p class="small" style="margin:0;font-weight:600">Bonus du jour : ${esc(bonusLabel(bonusPris, gBonus, enqueteOuverte))}. Il sera appliqué à 20:00.</p><button type="button" class="btn small ghost" data-action="bonus-changer">Changer</button></div><span class="tiny muted">Tu peux changer d’avis jusqu’à 20:00.</span>`
        : `<span class="ok" style="font-weight:700">${bonusPris ? 'Change ton bonus du jour (jusqu’à 20:00)' : `${ok} bonnes réponses : choisis ton bonus du jour`}</span>
        ${choixBonus(bonusPris, gBonus, enqueteOuverte)}`}
      ${ok >= 3 ? `<p class="small ok" style="margin:0;font-weight:700">🏅 Sans faute ! Prime en plus de ton bonus : ${primeSf} ce soir.</p>` : `<p class="tiny muted" style="margin:0">Réussis les 3 énigmes pour une prime « sans faute » : ${primeSf}.</p>`}
    </section>` : '';

  const onglets = train ? entrainementBarre() : `<div class="seg quatre" role="tablist" aria-label="Énigmes du jour">${S.quests.map((x, k) => `
      <button type="button" role="tab" data-action="quest-tab" data-i="${k}" aria-pressed="${k === i}" aria-selected="${k === i}"><span class="t">Énigme ${k + 1}${icone(results[k])}</span><span class="d">${esc(x.typeLabel)}</span></button>`).join('')}
      <button type="button" role="tab" class="noir" data-action="quest-tab" data-i="3" aria-pressed="${noir}" aria-selected="${noir}"><span class="t">Dossier noir${icone(S.noirResult)}</span><span class="d">facultatif</span></button></div>`;
  const delegue = !train ? results.find((x) => x && x.statut === 'delegue') : null;
  const aucuneReponse = !results.some((x) => x && (x.statut === 'ok' || x.statut === 'rate'));
  const qzLocal = !train ? quizLocal() : null, qzFait = !train ? quizEnregistre() : null;
  if (!noir && (qzFait || qzLocal)) {
    return `<main class="screen quete sans-copie">
    ${modes}
    ${onglets}
    ${qzFait ? quizResultatHtml(qzFait, gBonus, enqueteOuverte) : qzLocal.i >= QUIZ.questions ? `<section class="card"><p class="small" style="margin:0">Quiz terminé : ${bonnesReponses(qzLocal)} sur ${QUIZ.questions}. Le résultat n’a pas pu être enregistré.</p><button type="button" class="btn primary block" data-action="quiz-enregistrer">Réessayer</button></section>` : quizQuestionHtml()}
    <a class="small" href="#guide-quetes" style="text-align:center">Règles des énigmes</a>
  </main>${tabbar('quete', { questBadge: false })}`;
  }
  if (delegue && !noir) {
    return `<main class="screen quete">
    ${modes}
    ${onglets}
    ${delegueHtml(delegue, moralZ, gBonus, enqueteOuverte)}
    <a class="small" href="#guide-quetes" style="text-align:center">Règles des énigmes</a>
  </main>${tabbar('quete', { questBadge: false })}`;
  }
  const propositionDelegue = !train && !noir && aucuneReponse ? delegueHtml(null, moralZ, gBonus, enqueteOuverte) : '';
  return `<main class="screen quete ${noir ? 'mode-noir' : ''} ${train ? '' : 'sans-copie'}">
    ${modes}
    ${sousOnglets}
    ${onglets}
    ${bonusCard}
    ${propositionDelegue}
    <header class="between" style="align-items:flex-start">
      <div class="col" style="gap:3px"><span class="kicker" ${noir ? 'style="color:#E0625A"' : ''}>${train ? 'Entraînement · ne compte pas' : noir ? 'Dossier noir · niveau hardcore' : `Énigme ${i + 1} sur 3`}</span><h1 class="big">${esc(q.typeLabel)}</h1></div>
      <div class="col" style="gap:4px;align-items:flex-end"><span class="pill" ${q.difficulte >= 6 ? 'style="background:#2A1414;border-color:#6B2E2A;color:#F59A92"' : ''}>${q.difficulte >= 6 ? 'Hardcore' : `Difficulté ${q.difficulte}/5`}</span>
        <span class="tiny muted">${fini ? 'terminée' : train ? 'correction immédiate' : 'une seule réponse'}</span></div>
    </header>
    ${noir && !fini ? '<p class="small" style="margin:0;color:var(--red-soft)">Le dossier que personne n’a su boucler. Pas de coup de pouce, une seule réponse. Une erreur ne coûte rien ; une réussite rapporte des PS et compte pour le titre « Cerveau du district ».</p>' : ''}
    ${!train && !noir && !fini && !rerollUtilise() ? `<button type="button" class="btn small ghost block" data-action="quest-reroll">${icon('refresh', 16)} Pas ton style ? Changer cette énigme (une fois par jour)</button>` : ''}
    ${q.variante ? '<p class="tiny muted" style="margin:0">Énigme changée : c’est ton changement du jour.</p>' : ''}
    <p style="margin:0;font-size:14px;line-height:1.45;color:var(--text2)">${esc(q.contexte)}</p>
    ${q.figures ? renderFigures(q, fini) : ''}
    ${q.ligne ? ligneHtml(q) : q.tableau ? `<section class="card tight" aria-label="Fiche horaire">${q.tableau}</section>` : ''}
    ${q.type === 'filature' && !fini ? filatureOutils(q) : ''}

    ${q.elements && q.elements.length && !((q.type === 'chronologie' && !fini) || (q.type === 'horaires' && q.trajets)) ? (q.type === 'cadenas' ? essaisHtml(q) : q.type === 'quiment' ? temoignagesHtml(q, { marques: !fini }) : q.type === 'plaque' ? temoignagesHtml(q) : `<section class="col" aria-label="Éléments">${q.elements.map((el) => `<div class="statement"><span class="who">${esc(el.label)}</span><span class="what">${esc(el.texte)}</span></div>`).join('')}</section>`) : ''}
    ${q.indices ? `<section class="card tight" aria-label="Indices"><h2 class="section">${q.type === 'grille' ? 'Auditions' : 'Indices'}</h2>${q.indices.map((t) => `<p class="small" style="margin:0">• ${esc(t)}</p>`).join('')}</section>` : ''}
    ${q.mode === 'texte' ? `<div class="codebox" aria-label="Message codé">${codeHtml(q.code)}</div>
      <p class="small muted" style="margin:0">${esc(q.aide)}</p>` : ''}
    ${q.grille && !fini ? renderGrille(q) : ''}
    ${q.mode === 'texte' && !fini ? disqueHtml(q) : ''}
    ${q.astuce && !fini ? `<details class="astuce"><summary>Un coup de pouce ?</summary><p class="small" style="margin:6px 0 0">${esc(q.astuce)}</p></details>` : ''}
    ${!fini ? `<label class="field">Brouillon <span class="tiny muted">(pour toi seul, gardé sur cet appareil)</span>
      <textarea class="text notes" rows="6" data-qnote="${esc(q.id || '')}" placeholder="Tes hypothèses, tes calculs…">${esc(lire(`mazp-qnote-${q.id}`) || '')}</textarea></label>` : ''}

    ${!fini ? `<section class="col" aria-label="Ta réponse"><h2 class="section">${esc(q.question)}</h2>
      ${q.consigne && q.type !== 'chronologie' ? `<p class="small muted" style="margin:0">${esc(q.consigne)}</p>` : ''}
      ${choixHtml}
      ${q.type === 'cadenas' ? cadenasHtml(q) : q.type === 'chronologie' ? chronoHtml(q) : q.type === 'butin' && q.objets ? butinHtml(q, false) : q.mode === 'texte' || q.mode === 'exact' ? `<form data-form="quest-text" class="row"><label class="sr" for="qtext">Ta réponse</label><input id="qtext" class="text grow ${q.mode === 'exact' ? 'mono' : ''}" name="reponse" autocomplete="off" ${q.inputmode ? `inputmode="${q.inputmode}"` : 'autocapitalize="characters"'} placeholder="${esc(q.placeholder || 'Ta réponse')}"><button class="btn primary" type="submit">Valider</button></form>` : ''}
      <p class="tiny muted" style="margin:0">${train ? 'Entraînement : la réponse est corrigée tout de suite, sans effet sur ta zone.' : noir ? 'Une seule réponse, sans pénalité en cas d’erreur.' : 'Une seule réponse possible : une erreur est définitive (−1 de moral).'}</p>
      ${q.mode !== 'texte' && q.mode !== 'exact' ? `<button class="btn primary block" data-action="quest-submit" ${picked == null ? 'disabled' : ''}>Valider ma réponse</button>` : ''}
    </section>` : ''}

    ${q.type === 'cadenas' && fini ? cadenasResultat(q, r) : ''}
    ${q.type === 'butin' && q.objets && fini ? butinHtml(q, true, r) : ''}
    ${r.statut === 'ok' ? `<section class="card green"><span class="ok" style="font-size:15px;font-weight:700">Bien vu !</span>
      <p class="small" style="margin:0;line-height:1.45;color:var(--text2)">${esc(q.explication)}</p></section>` : ''}
    ${r.statut === 'rate' ? `<section class="card"><span style="font-size:15px;font-weight:700">Mauvaise réponse${r.reponse ? ` : ${esc(r.reponse)}` : ''}</span>
      <p class="small" style="margin:0;line-height:1.45;color:var(--text2)">${esc(q.explication)}</p>
      <p class="tiny muted" style="margin:0">${train ? 'Aucune conséquence : c’était pour s’entraîner.' : noir ? 'Aucune conséquence. Un nouveau dossier noir demain après 20:00.' : '−1 de moral. De nouvelles énigmes demain après 20:00.'}</p></section>` : ''}
    ${train && fini ? '<button class="btn primary block" data-action="train-new">Une autre énigme</button>' : ''}
    ${!train && fini && results.some((x) => !x || !x.statut) ? `<button class="btn outline block" data-action="quest-tab" data-i="${results.findIndex((x) => !x || !x.statut)}">Énigme suivante</button>` : ''}
    ${train ? '' : `<p class="tiny muted" style="margin:0">Chaque joueur reçoit ses propres variantes : on peut en discuter, mais la réponse d’un collègue ne marchera pas chez toi. 2 bonnes réponses sur 3 débloquent un bonus.</p>`}
    <a class="small" href="#guide-quetes" style="text-align:center">Règles des énigmes</a>
  </main>${tabbar('quete', { questBadge: false })}`;
}
