// Écran de l’énigme du jour.
import { S, esc, icon, tabbar } from './common.js';
import { QUEST_TYPES, QUEST_LABELS } from '../quests/quests.js';
import { SERVICES, SERVICE_LABELS } from '../engine/constants.js';
import { entrainementMiniJeuxHtml } from './incidents.js';

/** Le joueur a-t-il déjà changé une énigme aujourd'hui ? */
function rerollUtilise() { return (S.quests || []).some((q) => q.variante); }

const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

// Documents de l'énigme. Photos « à mémoriser » : la photo 1 disparaît dès qu'on ouvre la photo 2
// (mémorisé sur l'appareil, pour qu'un rechargement ne la fasse pas revenir).
function renderFigures(q, fini) {
  const fig = (f) => `<figure class="fig"><figcaption>${esc(f.titre)}</figcaption>${f.svg}</figure>`;
  const cls = `figs ${q.type === 'photos' ? 'deux' : ''}`;
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
    <tr><th></th>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr>
    ${lignes.map((l, i) => `<tr><th scope="row">${esc(l)}</th>${cols.map((c, j) => {
      const k = `${pre}:${i}:${j}`; const v = m[k] || '';
      return `<td><button type="button" class="gcell ${v === '✓' ? 'yes' : v ? 'no' : ''}" data-action="grille-mark" data-k="${k}" aria-label="${esc(l)} / ${esc(c)} : ${v === '✓' ? 'certain' : v ? 'impossible' : 'inconnu'}">${v}</button></td>`;
    }).join('')}</tr>`).join('')}</table></div>`;
  return `<section class="card tight" aria-label="Grille de déduction">
    <div class="between"><h2 class="section" style="margin:0">Ta grille</h2><button type="button" class="btn small ghost" data-action="grille-reset">Effacer</button></div>
    <p class="tiny muted" style="margin:0">Touche une case : ✗ impossible, puis ✓ certain, puis vide.</p>
    ${table('Qui · véhicule', gens, veh, 'v')}${table('Qui · endroit', gens, lieux, 'l')}${table('Véhicule · endroit', veh, lieux, 'x')}
  </section>`;
}

// Roue de décodage : aligne l'alphabet clair et l'alphabet décalé.
function renderRoue(q) {
  const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const n = q.cles || 1;
  const kDe = (i) => ((((S.roue || {})[n > 1 ? `${q.id}:${i}` : q.id] || 0) % 26) + 26) % 26;
  const stepper = (i) => `<div class="row" style="gap:6px;align-items:center">${n > 1 ? `<span class="tiny roue-c${i}" style="font-weight:700">Clé ${i + 1}</span>` : ''}
      <button type="button" class="btn small outline" data-action="roue" data-i="${i}" data-d="-1" aria-label="Décalage ${n > 1 ? `${i + 1} ` : ''}moins un">−</button>
      <span class="mono" style="min-width:34px;text-align:center">${kDe(i)}<span class="tiny muted"> ${AB[kDe(i)]}</span></span>
      <button type="button" class="btn small outline" data-action="roue" data-i="${i}" data-d="1" aria-label="Décalage ${n > 1 ? `${i + 1} ` : ''}plus un">+</button></div>`;
  if (n === 1) {
    const k = kDe(0);
    const bloc = (from) => `<div class="roue">${AB.slice(from, from + 13).map((l, i) => `<span><b>${AB[(from + i + k) % 26]}</b>${l}</span>`).join('')}</div>`;
    return `<section class="card tight" aria-label="Roue de décodage">
    <div class="between"><h2 class="section" style="margin:0">Roue de décodage</h2>${stepper(0)}</div>
    <p class="tiny muted" style="margin:0">En haut, la lettre du message codé ; en dessous, la lettre claire pour ce décalage.</p>
    ${bloc(0)}${bloc(13)}
  </section>`;
  }
  // Mot-clé : un décalage par position, et la lecture du message avec les clés choisies.
  let pos = 0;
  const lecture = q.code.split(' ').map((g) => g.split('').map((c) => { const i = pos++ % n; const k = kDe(i); return `<span class="roue-c${i}">${AB[(c.charCodeAt(0) - 65 - k + 26) % 26]}</span>`; }).join('')).join(' ');
  pos = 0;
  const brut = q.code.split(' ').map((g) => g.split('').map((c) => `<span class="roue-c${pos++ % n}">${c}</span>`).join('')).join(' ');
  return `<section class="card tight" aria-label="Roues de décodage">
    <h2 class="section" style="margin:0">Roues de décodage</h2>
    <p class="tiny muted" style="margin:0">Une roue par lettre de la clé. Chaque couleur montre les lettres décodées par cette roue (A = 0, B = 1…).</p>
    <div class="col" style="gap:6px">${Array.from({ length: n }, (_, i) => stepper(i)).join('')}</div>
    <span class="tiny muted">Message codé</span><div class="roue-lecture" aria-label="Message codé, lettres colorées par roue">${brut}</div>
    <span class="tiny muted">Lecture avec ces clés</span><div class="roue-lecture" aria-label="Lecture avec ces clés">${lecture}</div>
  </section>`;
}

/** Barre de l'entraînement : type, difficulté, statistiques personnelles. */
function entrainementBarre() {
  let st = {};
  try { st = JSON.parse(localStorage.getItem('mazp-entrainement') || '{}'); } catch (e) { /* rien */ }
  const t = S.trainType || 'quiment', d = S.trainDiff || 3;
  const x = st[t];
  return `<section class="card tight" aria-label="Réglages de l’entraînement" style="gap:8px">
    <label class="field" style="margin:0">Type d’énigme
      <select class="text" data-change="train-type" style="min-height:44px;font-size:14px">${QUEST_TYPES.map((k) => `<option value="${k}" ${k === t ? 'selected' : ''}>${esc(QUEST_LABELS[k])}</option>`).join('')}</select></label>
    <div class="col" style="gap:4px"><span class="small" style="font-weight:600">Difficulté</span>
      <div class="segn" style="grid-template-columns:repeat(6,minmax(0,1fr))">${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" aria-selected="${n === d}" data-action="train-diff" data-v="${n}">${n === 6 ? 'HC' : n}</button>`).join('')}</div></div>
    <span class="tiny muted">${x ? `Ton entraînement en ${esc(QUEST_LABELS[t])} : ${x.ok} réussie${x.ok > 1 ? 's' : ''} sur ${x.n}.` : 'Rien ne compte ici : ni classement, ni moral, ni PS.'} « HC » = niveau hardcore, celui du dossier noir.</span>
  </section>
  ${entrainementMiniJeuxHtml()}`;
}

export function renderQuete() {
  const train = S.questMode === 'train';
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

  const choixHtml = q.mode === 'choix' ? `<div class="choices ${q.choix.length > 4 || q.choix.some((c) => c.label.length > 12) ? 'one' : ''}" role="group" aria-label="Réponses">
      ${q.choix.map((c) => `<button type="button" class="choice" data-action="quest-pick" data-v="${esc(c.id)}" aria-pressed="${picked === c.id}" ${fini ? 'disabled' : ''}>
        <span ${q.mono ? 'class="mono" style="letter-spacing:1px"' : ''}>${esc(c.label)}</span>${c.sub ? `<span class="s">${esc(c.sub)}</span>` : ''}</button>`).join('')}
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

  const modes = `<div class="seg2" role="tablist" aria-label="Mode"><button type="button" role="tab" aria-selected="${!train}" data-action="quest-mode" data-v="jour">Énigmes du jour</button><button type="button" role="tab" aria-selected="${train}" data-action="quest-mode" data-v="train">Entraînement</button></div>`;
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
    ${q.tableau ? `<section class="card tight" aria-label="Fiche horaire">${q.tableau}</section>` : ''}

    ${q.elements && q.elements.length ? `<section class="col" aria-label="Éléments">${q.elements.map((el) => `<div class="statement"><span class="who ${q.type === 'cadenas' ? 'mono' : ''}" ${q.type === 'cadenas' ? 'style="font-size:17px;letter-spacing:2px;color:var(--text)"' : ''}>${esc(el.label)}</span><span class="what">${esc(el.texte)}</span></div>`).join('')}</section>` : ''}
    ${q.indices ? `<section class="card tight" aria-label="Indices"><h2 class="section">${q.type === 'grille' ? 'Auditions' : 'Indices'}</h2>${q.indices.map((t) => `<p class="small" style="margin:0">• ${esc(t)}</p>`).join('')}</section>` : ''}
    ${q.mode === 'texte' ? `<div class="codebox" aria-label="Message codé">${esc(q.code)}</div>
      <p class="small muted" style="margin:0">${esc(q.aide)}</p>` : ''}
    ${q.grille && !fini ? renderGrille(q) : ''}
    ${q.mode === 'texte' && !fini ? renderRoue(q) : ''}
    ${q.astuce && !fini ? `<details class="astuce"><summary>Un coup de pouce ?</summary><p class="small" style="margin:6px 0 0">${esc(q.astuce)}</p></details>` : ''}
    ${!fini ? `<label class="field">Brouillon <span class="tiny muted">(pour toi seul, gardé sur cet appareil)</span>
      <textarea class="text notes" rows="2" data-qnote="${esc(q.id || '')}" placeholder="Tes hypothèses, tes calculs…">${esc(lire(`mazp-qnote-${q.id}`) || '')}</textarea></label>` : ''}

    ${!fini ? `<section class="col" aria-label="Ta réponse"><h2 class="section">${esc(q.question)}</h2>
      ${q.consigne ? `<p class="small muted" style="margin:0">${esc(q.consigne)}</p>` : ''}
      ${choixHtml}
      ${q.mode === 'texte' || q.mode === 'exact' ? `<form data-form="quest-text" class="row"><label class="sr" for="qtext">Ta réponse</label><input id="qtext" class="text grow ${q.mode === 'exact' ? 'mono' : ''}" name="reponse" autocomplete="off" ${q.inputmode ? `inputmode="${q.inputmode}"` : 'autocapitalize="characters"'} placeholder="${esc(q.placeholder || 'Ta réponse')}"><button class="btn primary" type="submit">Valider</button></form>` : ''}
      <p class="tiny muted" style="margin:0">${train ? 'Entraînement : la réponse est corrigée tout de suite, sans effet sur ta zone.' : noir ? 'Une seule réponse, sans pénalité en cas d’erreur.' : 'Une seule réponse possible : une erreur est définitive (−1 de moral).'}</p>
      ${q.mode !== 'texte' && q.mode !== 'exact' ? `<button class="btn primary block" data-action="quest-submit" ${picked == null ? 'disabled' : ''}>Valider ma réponse</button>` : ''}
    </section>` : ''}

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
