// Écran de l’énigme du jour.
import { S, esc, icon, tabbar } from './common.js';
import { QUEST_TYPES, QUEST_LABELS } from '../quests/quests.js';
import { SERVICES, SERVICE_LABELS } from '../engine/constants.js';
import { MINI_JEUX } from './incidents.js';
import { cadenasHtml, cadenasResultat, essaisHtml } from './cadenas.js';
import { chronoHtml, disqueHtml, plaquesHtml, temoignagesHtml, figureInteractive, filatureOutils, butinHtml, ligneHtml, trajetsHtml, icoGrille, ecritureHtml, avatar } from './enigmes.js';

/** Le joueur a-t-il déjà changé une énigme aujourd'hui ? */
function rerollUtilise() { return (S.quests || []).some((q) => q.variante); }

const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

// Documents de l'énigme. Photos « à mémoriser » : la photo 1 disparaît dès qu'on ouvre la photo 2
// (mémorisé sur l'appareil, pour qu'un rechargement ne la fasse pas revenir).
function renderFigures(q, fini) {
  if (q.type === 'ecriture') return ecritureHtml(q, S.questPick, fini);
  const tactile = (q.type === 'photos' || q.type === 'filature') && !fini;
  const fig = (f) => `<figure class="fig ${tactile ? 'tactile' : ''}"><figcaption>${esc(f.titre)}</figcaption>${tactile ? figureInteractive(q, f.svg, S.questPick) : f.svg}</figure>`;
  const cls = 'figs';
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

/** Mini-jeu choisi dans le menu de l'entraînement (valeur « mj:<jeu> »), sinon null. */
function miniJeuChoisi() {
  const t = S.trainType || '';
  return t.startsWith('mj:') ? MINI_JEUX.find((m) => m.jeu === t.slice(3)) || null : null;
}

/** Barre de l'entraînement : type, difficulté, statistiques personnelles. */
function entrainementBarre() {
  let st = {};
  try { st = JSON.parse(localStorage.getItem('mazp-entrainement') || '{}'); } catch (e) { /* rien */ }
  const t = S.trainType || 'quiment', d = S.trainDiff || 3;
  const x = st[t];
  const mj = miniJeuChoisi();
  return `<section class="card tight" aria-label="Réglages de l’entraînement" style="gap:8px">
    <label class="field" style="margin:0">Énigme ou mini-jeu
      <select class="text" data-change="train-type" style="min-height:44px;font-size:14px">
        <optgroup label="Énigmes">${QUEST_TYPES.map((k) => `<option value="${k}" ${k === t ? 'selected' : ''}>${esc(QUEST_LABELS[k])}</option>`).join('')}</optgroup>
        <optgroup label="Mini-jeux d’incident">${MINI_JEUX.map((m) => `<option value="mj:${m.jeu}" ${`mj:${m.jeu}` === t ? 'selected' : ''}>${esc(m.nom)} (${SERVICE_LABELS[m.service]})</option>`).join('')}</optgroup>
      </select></label>
    ${mj ? '<span class="tiny muted">Rien ne compte ici : choisis l’effectif, refais le tuto, recommence autant que tu veux.</span>' : `<div class="col" style="gap:4px"><span class="small" style="font-weight:600">Difficulté</span>
      <div class="segn" style="grid-template-columns:repeat(6,minmax(0,1fr))">${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" aria-selected="${n === d}" data-action="train-diff" data-v="${n}">${n === 6 ? 'HC' : n}</button>`).join('')}</div></div>
    <span class="tiny muted">${x ? `Ton entraînement en ${esc(QUEST_LABELS[t])} : ${x.ok} réussie${x.ok > 1 ? 's' : ''} sur ${x.n}.` : 'Rien ne compte ici : ni classement, ni moral, ni PS.'} « HC » = niveau hardcore, celui du dossier noir.</span>`}
  </section>`;
}

export function renderQuete() {
  const train = S.questMode === 'train';
  const modes = `<div class="seg2" role="tablist" aria-label="Mode"><button type="button" role="tab" aria-selected="${!train}" data-action="quest-mode" data-v="jour">Énigmes du jour</button><button type="button" role="tab" aria-selected="${train}" data-action="quest-mode" data-v="train">Entraînement</button></div>`;
  const mj = train && miniJeuChoisi();
  if (mj) {
    return `<main class="screen">
    ${modes}
    ${entrainementBarre()}
    <header class="col" style="gap:3px"><span class="kicker">Entraînement · ne compte pas</span><h1 class="big">${esc(mj.nom)}</h1><span class="tiny muted">Mini-jeu d’incident · ${SERVICE_LABELS[mj.service]}</span></header>
    <button type="button" class="btn primary block" data-action="mj-train" data-j="${mj.jeu}">Lancer le mini-jeu</button>
    <a class="small" href="#guide-quetes" style="text-align:center">Règles des énigmes</a>
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
  const icone = (x) => (!x || !x.statut ? '' : x.statut === 'ok' ? ' ✓' : ' ✗');

  const choixHtml = q.mode !== 'choix' ? ''
    : q.type === 'plaque' ? plaquesHtml(q, picked, fini)
    : q.type === 'horaires' && q.trajets ? trajetsHtml(q, picked, fini)
    : q.type === 'ecriture' ? (picked ? `<p class="small" style="margin:0">Ton choix : <strong>${esc(picked)}</strong></p>` : '<p class="small muted" style="margin:0">Touche l’échantillon de l’auteur, plus haut.</p>')
    : q.type === 'photos' && q.figures[1].svg.includes('ph-hit') ? `<p class="small ${picked ? '' : 'muted'}" style="margin:0">${picked ? `Place choisie : <strong>${esc(picked)}</strong>` : 'Touche la place sur une des photos.'}</p>`
    : q.mode === 'choix' ? `<div class="choices ${q.choix.length > 4 || q.choix.some((c) => c.label.length > 12) ? 'one' : ''}" role="group" aria-label="Réponses">
      ${q.choix.map((c) => `<button type="button" class="choice" data-action="quest-pick" data-v="${esc(c.id)}" aria-pressed="${picked === c.id}" ${fini ? 'disabled' : ''}>
        <span ${q.mono ? 'class="code" style="letter-spacing:1px"' : q.type === 'quiment' || q.type === 'grille' ? 'class="row" style="gap:8px;justify-content:center"' : ''}>${q.type === 'quiment' ? c.label.split(' et ').map((x) => avatar(x, 24)).join('') : q.type === 'grille' ? icoGrille(c.label) : ''}${esc(c.label)}</span>${c.sub ? `<span class="s">${esc(c.sub)}</span>` : ''}</button>`).join('')}
    </div>` : '';

  const bonusCard = !train && !noir && ok >= 2 ? `<section class="card green">
      ${bonusPris && !S.bonusChanger ? `<div class="between" style="gap:8px"><p class="small" style="margin:0;font-weight:600">Bonus du jour : ${bonusPris.bonus === 'moral' ? '+3 de moral' : bonusPris.bonus === 'budget' ? '+2 k€' : bonusPris.bonus === 'indice' ? '+1 indice pour l’enquête' : `+10 % de capacité en ${SERVICE_LABELS[bonusPris.service]}`}. Il sera appliqué à 20:00.</p><button type="button" class="btn small ghost" data-action="bonus-changer">Changer</button></div><span class="tiny muted">Tu peux changer d’avis jusqu’à 20:00.</span>`
        : `<span class="ok" style="font-weight:700">${bonusPris ? 'Change ton bonus du jour (jusqu’à 20:00)' : `${ok} bonnes réponses : choisis ton bonus du jour`}</span>
        <div class="choices" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          <button type="button" class="choice" data-action="quest-bonus" data-v="indice" aria-pressed="${!!bonusPris && bonusPris.bonus === 'indice'}"><span>+1 indice</span><span class="s">enquête</span></button>
          <button type="button" class="choice" data-action="quest-bonus" data-v="moral" aria-pressed="${!!bonusPris && bonusPris.bonus === 'moral'}"><span>+3 moral</span></button>
          <button type="button" class="choice" data-action="quest-bonus" data-v="budget" aria-pressed="${!!bonusPris && bonusPris.bonus === 'budget'}"><span>+2 k€</span></button>
        </div>
        <label class="field">Ou +10 % de capacité pour un service
          <select class="text" data-change="quest-capacite"><option value="">Choisir un service…</option>${SERVICES.map((s) => `<option value="${s}">${SERVICE_LABELS[s]}</option>`).join('')}</select></label>`}
      ${ok >= 3 ? '<p class="small ok" style="margin:0;font-weight:700">🏅 Sans faute ! Prime en plus de ton bonus : +3 k€, +2 de moral et +5 PS ce soir.</p>' : '<p class="tiny muted" style="margin:0">Réussis les 3 énigmes pour une prime « sans faute » : +3 k€, +2 de moral et +5 PS.</p>'}
    </section>` : '';

  const onglets = train ? entrainementBarre() : `<div class="seg quatre" role="tablist" aria-label="Énigmes du jour">${S.quests.map((x, k) => `
      <button type="button" role="tab" data-action="quest-tab" data-i="${k}" aria-pressed="${k === i}" aria-selected="${k === i}"><span class="t">Énigme ${k + 1}${icone(results[k])}</span><span class="d">${esc(x.typeLabel)}</span></button>`).join('')}
      <button type="button" role="tab" class="noir" data-action="quest-tab" data-i="3" aria-pressed="${noir}" aria-selected="${noir}"><span class="t">Dossier noir${icone(S.noirResult)}</span><span class="d">facultatif</span></button></div>`;
  return `<main class="screen ${noir ? 'mode-noir' : ''} ${train ? '' : 'sans-copie'}">
    ${modes}
    ${onglets}
    ${bonusCard}
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
    ${q.mode === 'texte' ? `<div class="codebox" aria-label="Message codé">${esc(q.code)}</div>
      <p class="small muted" style="margin:0">${esc(q.aide)}</p>` : ''}
    ${q.grille && !fini ? renderGrille(q) : ''}
    ${q.mode === 'texte' && !fini ? disqueHtml(q) : ''}
    ${q.astuce && !fini ? `<details class="astuce"><summary>Un coup de pouce ?</summary><p class="small" style="margin:6px 0 0">${esc(q.astuce)}</p></details>` : ''}
    ${!fini ? `<label class="field">Brouillon <span class="tiny muted">(pour toi seul, gardé sur cet appareil)</span>
      <textarea class="text notes" rows="2" data-qnote="${esc(q.id || '')}" placeholder="Tes hypothèses, tes calculs…">${esc(lire(`mazp-qnote-${q.id}`) || '')}</textarea></label>` : ''}

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
