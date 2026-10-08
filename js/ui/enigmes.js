// Énigmes visuelles : chaque type d'énigme se joue sur un objet qu'on manipule
// (ligne du temps, disque de décodage, plaques, plan, étiquettes de scellés…).
// Les générateurs ne changent pas : seules l'apparence et la façon de répondre changent.
import { S, esc, questDuSlot } from './common.js';
import { digicodeTouche } from './digicode.js';

const rerender = () => document.dispatchEvent(new CustomEvent('mazp:rerender'));
const mod = (v, n) => ((v % n) + n) % n;
const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
function etat(nom, id, def) {
  S[nom] = S[nom] || {};
  if (!(id in S[nom])) S[nom][id] = def();
  return S[nom][id];
}
const questCourante = () => (S.questMode === 'train' ? S.train : S.questIdx === 3 ? S.noir : questDuSlot(S.questIdx || 0));

// Avatar : initiale sur une pastille de couleur stable pour un prénom donné.
const TEINTES = ['#63B0FF', '#3CC6B8', '#A78BFA', '#F59E5B', '#F08BB4', '#E6C36A', '#7FD18B', '#F2766B', '#8FA8FF', '#D9A5F5'];
export function avatar(nom, taille = 34) {
  let h = 0; for (const c of String(nom)) h = (h * 31 + c.charCodeAt(0)) % 997;
  const initiale = String(nom).replace(/^(la |le |les |l’|un |une )/i, '').charAt(0).toUpperCase();
  return `<span class="av" style="--av:${TEINTES[h % TEINTES.length]};width:${taille}px;height:${taille}px;font-size:${Math.round(taille * 0.44)}px" aria-hidden="true">${esc(initiale)}</span>`;
}

// ───────────────────────────── Chronologie ─────────────────────────────

export function chronoHtml(q) {
  const lettres = (q.lettres || q.elements.map((e) => e.label).join('')).split('');
  const faits = Object.fromEntries(q.elements.map((e) => [e.label, e.texte]));
  let ordre = etat('chrono', q.id, () => lettres.slice());
  if (ordre.length !== lettres.length) ordre = S.chrono[q.id] = lettres.slice();
  return `<form data-form="quest-text" class="chr" aria-label="Ligne du temps" data-q="${esc(q.id)}">
    <span class="chr-bout">Premier fait</span>
    <ol class="chr-liste">${ordre.map((l, k) => `<li class="chr-carte" data-l="${l}">
      <span class="chr-n" aria-hidden="true">${k + 1}</span>
      <span class="chr-lettre">${l}</span><span class="chr-txt">${esc(faits[l])}</span>
      <span class="chr-fl"><button type="button" data-chr="-1" aria-label="Avancer le fait ${l}"><svg viewBox="0 0 12 8"><path d="M1 7l5-5 5 5"/></svg></button><button type="button" data-chr="1" aria-label="Reculer le fait ${l}"><svg viewBox="0 0 12 8"><path d="M1 1l5 5 5-5"/></svg></button></span>
      <span class="chr-poignee" aria-hidden="true"><i></i><i></i><i></i></span></li>`).join('')}</ol>
    <span class="chr-bout fin">Dernier fait</span>
    <input type="hidden" name="reponse" value="${ordre.join('')}">
    <p class="tiny muted" style="margin:0">Fais glisser les cartes par leur poignée, ou utilise les flèches.</p>
    <button class="btn primary block" type="submit">Valider cet ordre</button>
  </form>`;
}

function chronoMaj(liste) {
  const form = liste.closest('form');
  const ordre = [...liste.children].map((li) => li.dataset.l);
  [...liste.children].forEach((li, k) => { li.querySelector('.chr-n').textContent = k + 1; });
  form.reponse.value = ordre.join('');
  S.chrono = S.chrono || {}; S.chrono[form.dataset.q] = ordre;
}

// ───────────────────────────── Disque de décodage ─────────────────────────────

const PAS = 360 / 26;
function cleRoue(q, i) { return (q.cles || 1) > 1 ? `${q.id}:${i}` : q.id; }
function decalage(q, i) { return mod((S.roue || {})[cleRoue(q, i)] || 0, 26); }

function anneau(r, lettres, cls) {
  return lettres.map((l, j) => {
    const a = (j * PAS - 90) * Math.PI / 180;
    return `<text class="${cls}" x="${(r * Math.cos(a)).toFixed(1)}" y="${(r * Math.sin(a)).toFixed(1)}" transform="rotate(${(j * PAS).toFixed(2)} ${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)})" text-anchor="middle" dominant-baseline="central">${l}</text>`;
  }).join('');
}

/** Lettre illisible d'un message codé (tache d'encre). */
export const TROU_HTML = '<span class="trou" role="img" aria-label="lettre illisible"></span>';
/** Message codé prêt à afficher : les lettres effacées deviennent des taches. */
export const codeHtml = (code) => esc(code).replace(/_/g, TROU_HTML);

export function disqueHtml(q) {
  const n = q.cles || 1;
  const sel = Math.min(etat('disqueSel', q.id, () => 0), n - 1);
  const k = decalage(q, sel);
  const ticks = AB.map((_, j) => { const a = (j * PAS - 90 + PAS / 2) * Math.PI / 180; return `<line x1="${(141 * Math.cos(a)).toFixed(1)}" y1="${(141 * Math.sin(a)).toFixed(1)}" x2="${(108 * Math.cos(a)).toFixed(1)}" y2="${(108 * Math.sin(a)).toFixed(1)}"/>`; }).join('');
  const disque = `<svg class="dq" viewBox="-150 -150 300 300" role="img" aria-label="Disque de décodage, décalage ${k}">
    <circle r="148" class="dq-ext"/><g class="dq-traits">${ticks}</g>
    ${anneau(125, AB, 'dq-code')}
    <g class="dq-int" data-k="${k}" style="transform:rotate(${k * PAS}deg)"><circle r="107" class="dq-int-fond"/>${anneau(91, AB, 'dq-clair')}
      <circle r="74" class="dq-moyeu"/><path class="dq-repere" d="M0 -106 L5 -97 L-5 -97 Z"/></g>
    <text class="dq-k" y="-6" text-anchor="middle">${AB[k]}</text><text class="dq-ks" y="20" text-anchor="middle">décalage ${k}</text>
  </svg>`;
  let lecture = '';
  // Le message codé reste sous les yeux pendant qu'on tourne le disque (plus besoin de remonter).
  const rappel = n > 1 ? '' : `<div class="roue-lecture dq-rappel" aria-label="Message codé">${codeHtml(q.code)}</div>`;
  if (n > 1) {
    let pos = 0;
    const brut = q.code.split(' ').map((g) => g.split('').map((c) => (c === '_' ? (pos++, TROU_HTML) : `<span class="roue-c${pos++ % n}">${c}</span>`)).join('')).join(' ');
    lecture = `<span class="tiny muted">Message codé</span><div class="roue-lecture">${brut}</div>
      <span class="tiny muted">Lecture avec ces clés</span><div class="roue-lecture dq-lecture" data-code="${esc(q.code)}" data-n="${n}" data-cles="${Array.from({ length: n }, (_, i) => decalage(q, i)).join(',')}">${lireAvec(q.code, Array.from({ length: n }, (_, i) => decalage(q, i)))}</div>`;
  }
  return `<section class="card tight dq-carte roue-c${sel}" aria-label="Disque de décodage" data-q="${esc(q.id)}" data-cle="${esc(cleRoue(q, sel))}" data-i="${sel}">
    <div class="between"><h2 class="section" style="margin:0">${n > 1 ? 'Disques de décodage' : 'Disque de décodage'}</h2>
      <span class="row" style="gap:4px"><button type="button" class="btn small" data-action="roue" data-i="${sel}" data-d="-1" aria-label="Tourner d’un cran vers la gauche">−</button><button type="button" class="btn small" data-action="roue" data-i="${sel}" data-d="1" aria-label="Tourner d’un cran vers la droite">+</button></span></div>
    ${n > 1 ? `<div class="seg${n === 2 ? '2' : n === 3 ? '3' : '4'}" role="tablist">${Array.from({ length: n }, (_, i) => `<button type="button" role="tab" class="roue-c${i}" aria-selected="${i === sel}" data-disque="${i}">Roue ${i + 1} · ${AB[decalage(q, i)]}</button>`).join('')}</div>` : ''}
    ${rappel}
    <div class="dq-wrap"><div class="dq-boite">${disque}<div class="dq-prise" aria-hidden="true"></div><div class="dq-libre" aria-hidden="true"></div></div></div>
    <p class="tiny muted" style="margin:0;text-align:center">Tourne l’anneau orange du doigt (le centre et le bord laissent défiler la page). Dehors, la lettre du message codé ; dedans, la lettre claire.</p>
    ${lecture}
  </section>`;
}

function lireAvec(code, cles) {
  let pos = 0;
  const n = cles.length;
  return code.split(' ').map((g) => g.split('').map((c) => { const i = pos++ % n; if (c === '_') return TROU_HTML; return `<span class="roue-c${i}">${AB[mod(c.charCodeAt(0) - 65 - cles[i], 26)]}</span>`; }).join('')).join(' ');
}

function disqueRegler(carte, crans) {
  const k = mod(crans, 26);
  const g = carte.querySelector('.dq-int');
  g.style.transition = '';
  g.style.transform = `rotate(${crans * PAS}deg)`; // en crans bruts : pas de tour complet animé à l'envers
  g.dataset.k = k;
  carte.querySelector('.dq-k').textContent = AB[k];
  carte.querySelector('.dq-ks').textContent = `décalage ${k}`;
  S.roue = { ...(S.roue || {}), [carte.dataset.cle]: k };
  const tab = carte.querySelector(`[data-disque="${carte.dataset.i}"]`);
  if (tab) tab.textContent = `Roue ${Number(carte.dataset.i) + 1} · ${AB[k]}`;
  const lec = carte.querySelector('.dq-lecture');
  if (lec) {
    const cles = lec.dataset.cles.split(',').map(Number); cles[Number(carte.dataset.i)] = k;
    lec.dataset.cles = cles.join(','); lec.innerHTML = lireAvec(lec.dataset.code, cles);
  }
}

// ───────────────────────────── La plaque ─────────────────────────────

const ETOILES = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<circle cx="${(7 * Math.cos(a)).toFixed(2)}" cy="${(7 * Math.sin(a)).toFixed(2)}" r="1.1"/>`; }).join('');
export function plaquesHtml(q, picked, fini) {
  const rayes = etat('rayes', q.id, () => ({}));
  return `<div class="pl-grille" role="group" aria-label="Plaques proposées" data-q="${esc(q.id)}">${q.choix.map((c) => `<div class="pl-item ${rayes[c.id] ? 'raye' : ''}">
      <button type="button" class="pl" data-action="quest-pick" data-v="${esc(c.id)}" aria-pressed="${picked === c.id}" ${fini ? 'disabled' : ''} aria-label="Plaque ${esc(c.label)}">
        <span class="pl-eu" aria-hidden="true"><svg viewBox="-10 -10 20 20">${ETOILES}</svg>B</span><span class="pl-txt">${esc(c.label)}</span></button>
      ${fini ? '' : `<button type="button" class="pl-x" data-raye="${esc(c.id)}" aria-pressed="${!!rayes[c.id]}" aria-label="${rayes[c.id] ? 'Remettre' : 'Rayer'} la plaque ${esc(c.label)}"><svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>`}
    </div>`).join('')}</div>
    ${fini ? '' : '<p class="tiny muted" style="margin:0">Touche la croix pour rayer une plaque qu’un témoignage contredit. Touche une plaque pour la choisir.</p>'}`;
}

// ───────────────────────────── Témoignages (qui ment, plaque) ─────────────────────────────

export function temoignagesHtml(q, { marques = false } = {}) {
  const m = marques ? etat('qm', q.id, () => ({})) : {};
  const lib = { '': 'À vérifier', v: 'Dit vrai', m: 'Ment' };
  return `<section class="col tem-liste" aria-label="Déclarations" data-q="${esc(q.id)}">${q.elements.map((el) => `<div class="tem ${m[el.label] ? `tem-${m[el.label]}` : ''}">
      ${avatar(el.label)}<div class="tem-corps"><span class="tem-nom">${esc(el.label)}</span>${(el.phrases || [el.texte]).map((t) => `<p class="tem-bulle">${esc(t)}</p>`).join('')}</div>
      ${marques ? `<button type="button" class="tem-marque" data-qm="${esc(el.label)}" aria-label="Ton avis sur ${esc(el.label)} : ${lib[m[el.label] || '']}">${lib[m[el.label] || '']}</button>` : ''}
    </div>`).join('')}</section>`;
}

// ───────────────────────────── Les deux photos, la filature ─────────────────────────────

/** Met en évidence la place ou le lieu choisi, et redessine le tracé de la filature. */
export function figureInteractive(q, svg, picked) {
  let s = svg;
  if (picked) s = s.replace(`data-v="${picked}"`, `data-v="${picked}" data-sel="1"`);
  if (q.type === 'filature') {
    const m = s.match(/data-depart="([\d.]+),([\d.]+)"/);
    const pts = m ? [`${m[1]},${m[2]}`, ...(((S.trace || {})[q.id]) || [])] : [];
    s = s.replace('<polyline class="fi-trace" points=""', `<polyline class="fi-trace" points="${pts.join(' ')}"`);
  }
  return s;
}

export function filatureOutils(q) {
  const n = (((S.trace || {})[q.id]) || []).length;
  return `<div class="row fi-outils" data-q="${esc(q.id)}"><span class="tiny muted grow">${q.forme === 'rebours' ? 'Touche les carrefours pour remonter son chemin depuis le point rouge, puis touche le lieu de départ.' : 'Touche les carrefours pour tracer son chemin, puis touche le lieu d’arrivée.'}</span>
    <button type="button" class="btn small" data-fi="annuler" ${n ? '' : 'disabled'}>Annuler</button><button type="button" class="btn small" data-fi="effacer" ${n ? '' : 'disabled'}>Effacer</button></div>`;
}

// ───────────────────────────── Le butin ─────────────────────────────

const ICONES_OBJ = {
  montre: '<circle cx="16" cy="16" r="7"/><path d="M16 12.5V16l2.4 1.6M12.5 9.5l1-5h5l1 5M12.5 22.5l1 5h5l1-5"/>',
  collier: '<path d="M6 5c0 9 4.5 14 10 14s10-5 10-14"/><path d="M16 19v2"/><path d="M16 21l-3 4 3 3 3-3z"/>',
  bague: '<circle cx="16" cy="20" r="8"/><path d="M12 12l-2-4h12l-2 4M10 8l6-3 6 3"/>',
  tableau: '<rect x="4" y="6" width="24" height="20" rx="1"/><rect x="8" y="10" width="16" height="12"/><path d="M8 20l5-5 4 4 3-3 4 4"/>',
  ordinateur: '<rect x="6" y="7" width="20" height="13" rx="1.5"/><path d="M3 25h26l-3-5H6z"/>',
  statuette: '<circle cx="16" cy="7" r="3"/><path d="M16 10v9M11 14l5-2 5 2M13 27l3-8 3 8M10 27h12"/>',
  velo: '<circle cx="8" cy="21" r="5"/><circle cx="24" cy="21" r="5"/><path d="M8 21l5-9h7l4 9M13 12l3 9h-8M18 9h4"/><path d="M15 8l-2 4"/>',
  boucles: '<circle cx="10" cy="7" r="2"/><circle cx="22" cy="7" r="2"/><path d="M10 9l-3 7 3 7 3-7zM22 9l-3 7 3 7 3-7z"/>',
};
const icoObjet = (o) => { const k = /montre/.test(o) ? 'montre' : /collier/.test(o) ? 'collier' : /bague/.test(o) ? 'bague' : /tableau/.test(o) ? 'tableau' : /ordinateur/.test(o) ? 'ordinateur' : /statuette/.test(o) ? 'statuette' : /vélo/.test(o) ? 'velo' : 'boucles';
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${ICONES_OBJ[k]}</svg>`; };
const sansArticle = (o) => o.replace(/^(la |le |les |l’)/, '');

export function butinHtml(q, fini, r) {
  const notes = etat('butin', q.id, () => ({}));
  return `<form data-form="quest-text" class="bt" aria-label="Scellés" data-q="${esc(q.id)}">
    <div class="bt-grille">${q.objets.map((o, k) => {
      const cible = k === q.cible;
      const val = cible && fini ? (r.statut === 'ok' ? q.answer : r.reponse || '') : notes[k] || '';
      return `<label class="bt-tag ${cible ? 'cible' : ''}">
        <span class="bt-trou" aria-hidden="true"></span>
        <span class="bt-ico">${icoObjet(o)}</span>
        <span class="bt-nom">${esc(cap(sansArticle(o)))}</span>
        <span class="bt-num">Scellé n° ${String(k + 1).padStart(2, '0')}${cible ? ' · à estimer' : ''}</span>
        <span class="bt-val"><input ${cible ? 'name="reponse" required' : `data-bt="${k}"`} inputmode="numeric" autocomplete="off" value="${esc(val)}" placeholder="?" ${fini ? 'disabled' : ''} aria-label="Valeur ${cible ? 'à trouver' : 'estimée'} de ${esc(o)}"><span>€</span></span>
      </label>`;
    }).join('')}</div>
    ${fini ? '' : `<p class="tiny muted" style="margin:0">Note tes calculs sur les étiquettes. Seule l’étiquette « à estimer » compte comme réponse.</p>
    <button class="btn primary block" type="submit">Envoyer l’estimation</button>`}
  </form>`;
}

// ───────────────────────────── Les horaires ─────────────────────────────

export function ligneHtml(q) {
  const { arrets, cumul, departs, num = 7, quand = 'ce soir-là' } = q.ligne;
  return `<section class="card tight hb" aria-label="Ligne ${num}">
    <div class="row" style="gap:10px"><span class="hb-num">${num}</span><div class="col" style="gap:0"><strong>Ligne ${num}</strong><span class="tiny muted">Départs de ${esc(arrets[0])}</span></div></div>
    <div class="hb-departs">${departs.map((d) => `<span>${d}</span>`).join('')}</div>
    <ol class="hb-arrets">${arrets.map((a, k) => `<li><span class="hb-pt" aria-hidden="true"></span><span class="grow">${esc(a)}</span><span class="hb-min">${k ? `+${cumul[k]} min` : 'départ'}</span></li>`).join('')}</ol>
    <p class="tiny muted" style="margin:0">Les bus sont à l’heure ${esc(quand)}. Personne ne court, mais on peut arriver en retard ou traîner en route.</p>
  </section>`;
}

export function trajetsHtml(q, picked, fini) {
  const n = q.ligne.arrets.length;
  const decl = Object.fromEntries(q.elements.map((e) => [e.label, e.texte]));
  return `<div class="col hb-trajets" role="group" aria-label="Déclarations">${q.trajets.map((t) => `<button type="button" class="hb-trajet" data-action="quest-pick" data-v="${esc(t.nom)}" aria-pressed="${picked === t.nom}" ${fini ? 'disabled' : ''}>
      <span class="row" style="gap:10px;align-items:flex-start">${avatar(t.nom)}<span class="col grow" style="gap:4px;min-width:0"><strong>${esc(t.nom)}</strong><span class="hb-quote">${esc(decl[t.nom] || '')}</span></span></span>
      <span class="hb-mini" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i class="${k === t.a ? 'mt' : k === t.b ? 'ds' : k > t.a && k < t.b ? 'in' : ''}"></i>`).join('')}</span>
      <span class="hb-resume tiny"><span>${esc(q.ligne.arrets[t.a])}</span><span>${esc(q.ligne.arrets[t.b])}</span></span>
    </button>`).join('')}</div>`;
}

// ───────────────────────────── Enquête de voisinage : icônes ─────────────────────────────

const ICONES_GRILLE = {
  Camionnette: '<path d="M2 16V8h11v8M13 11h4l3 3v2H2"/><circle cx="6" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/>',
  Scooter: '<circle cx="5" cy="16" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M5 16h7l3-8h3M12 16l-2-5H7"/>',
  Golf: '<path d="M2 15v-3l3-4h9l4 4h2v3z"/><circle cx="6" cy="16" r="1.8"/><circle cx="16" cy="16" r="1.8"/>',
  Break: '<path d="M2 15v-3l2-4h13l3 4v3z"/><circle cx="6" cy="16" r="1.8"/><circle cx="16" cy="16" r="1.8"/>',
  'Vélo cargo': '<circle cx="5" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M2 9h8v4H2zM10 12l3 4h5l-3-8h-2"/>',
  Gare: '<path d="M3 19V9l8-5 8 5v10M3 19h16M8 19v-5h6v5"/><circle cx="11" cy="9" r="1.6"/>',
  Stade: '<ellipse cx="11" cy="12" rx="9" ry="5.5"/><ellipse cx="11" cy="12" rx="5" ry="2.5"/>',
  Écluse: '<path d="M2 15c2 0 2-2 4.5-2s2.5 2 4.5 2 2-2 4.5-2 2.5 2 4.5 2M6 5v8M16 5v8M6 8h10"/>',
  Station: '<path d="M4 19V5h8v14M3 19h10M12 9h3l2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3M6 8h4"/>',
  Marché: '<path d="M2 9l2-5h14l2 5M2 9h18M4 9v10h14V9M9 19v-5h4v5"/>',
};
export function icoGrille(nom) {
  const p = ICONES_GRILLE[nom];
  return p ? `<svg class="gico" viewBox="0 0 22 22" aria-hidden="true">${p}</svg>` : '';
}

// ───────────────────────────── Expertise d'écriture ─────────────────────────────

// La lettre reste épinglée en haut de l'écran pendant qu'on fait défiler les échantillons :
// on compare toujours l'original et un échantillon côte à côte, sans remonter.
export function ecritureHtml(q, picked, fini) {
  const [lettre, ...ech] = q.figures;
  const ecartes = etat('ecr-x', q.id, () => ({}));
  return `<figure class="fig ec-lettre"><figcaption>${esc(lettre.titre)} <span class="tiny">· reste affichée pendant que tu compares</span></figcaption>${lettre.svg}</figure>
    <div class="col ec-liste" role="group" aria-label="Échantillons" data-q="${esc(q.id)}">${ech.map((f) => {
      const nom = f.titre.replace(/^Échantillon de /, '');
      const x = !!ecartes[nom];
      return `<div class="ec-ech ${picked === nom ? 'sel' : ''} ${x ? 'ecarte' : ''}">
        <button type="button" class="ec-pick" data-action="quest-pick" data-v="${esc(nom)}" aria-pressed="${picked === nom}" ${fini ? 'disabled' : ''}>
          <span class="row" style="gap:8px">${avatar(nom, 26)}<strong>${esc(nom)}</strong><span class="tiny muted grow" style="text-align:right;padding-right:${fini ? 0 : 84}px">${picked === nom ? 'ton choix' : x ? 'écarté' : 'choisir'}</span></span>${f.svg}</button>
        ${fini ? '' : `<button type="button" class="ec-x" data-ecx="${esc(nom)}" aria-pressed="${x}">${x ? 'Remettre' : 'Écarter'}</button>`}
      </div>`;
    }).join('')}</div>`;
}

// ───────────────────────────── Interactions ─────────────────────────────

let installe = false;
export function installerEnigmes() {
  if (installe) return; installe = true;

  document.addEventListener('click', (e) => {
    const t = e.target;
    // Digicode : touches
    const dg = t.closest('[data-dg]');
    if (dg) { digicodeTouche(dg); return; }
    // Chronologie : flèches
    const fl = t.closest('[data-chr]');
    if (fl) {
      const li = fl.closest('.chr-carte'), liste = li.parentElement;
      if (fl.dataset.chr === '-1' && li.previousElementSibling) liste.insertBefore(li, li.previousElementSibling);
      else if (fl.dataset.chr === '1' && li.nextElementSibling) liste.insertBefore(li.nextElementSibling, li);
      li.classList.remove('bouge'); void li.offsetWidth; li.classList.add('bouge');
      fl.focus();
      chronoMaj(liste); return;
    }
    // Disques : changer de roue
    const dq = t.closest('[data-disque]');
    if (dq) { const q = questCourante(); S.disqueSel = { ...(S.disqueSel || {}), [q.id]: Number(dq.dataset.disque) }; rerender(); return; }
    // Plaques : rayer
    const rx = t.closest('[data-raye]');
    if (rx) {
      const id = rx.closest('[data-q]').dataset.q, v = rx.dataset.raye;
      const m = etat('rayes', id, () => ({})); m[v] = !m[v];
      rx.closest('.pl-item').classList.toggle('raye', m[v]); rx.setAttribute('aria-pressed', m[v]);
      return;
    }
    // Qui ment : avis sur chaque déclaration
    const qm = t.closest('[data-qm]');
    if (qm) {
      const id = qm.closest('[data-q]').dataset.q, nom = qm.dataset.qm;
      const m = etat('qm', id, () => ({}));
      m[nom] = { '': 'v', v: 'm', m: '' }[m[nom] || ''];
      const tem = qm.closest('.tem'); tem.classList.remove('tem-v', 'tem-m'); if (m[nom]) tem.classList.add(`tem-${m[nom]}`);
      qm.textContent = { '': 'À vérifier', v: 'Dit vrai', m: 'Ment' }[m[nom]];
      return;
    }
    // Écriture : écarter un suspect (barré, gardé sur l'appareil pendant la partie)
    const ecx = t.closest('[data-ecx]');
    if (ecx) {
      const id = ecx.closest('[data-q]').dataset.q, nom = ecx.dataset.ecx;
      const m = etat('ecr-x', id, () => ({})); m[nom] = !m[nom];
      const carte = ecx.closest('.ec-ech'); carte.classList.toggle('ecarte', m[nom]);
      ecx.setAttribute('aria-pressed', m[nom]); ecx.textContent = m[nom] ? 'Remettre' : 'Écarter';
      const lib = carte.querySelector('.ec-pick .grow'); if (lib && !carte.classList.contains('sel')) lib.textContent = m[nom] ? 'écarté' : 'choisir';
      return;
    }
    // Filature : tracé
    const fi = t.closest('[data-fi]');
    if (fi) {
      const q = questCourante(); const tr = ((S.trace || {})[q.id] || []).slice();
      if (fi.dataset.fi === 'annuler') tr.pop(); else tr.length = 0;
      S.trace = { ...(S.trace || {}), [q.id]: tr }; rerender(); return;
    }
    const x = t.closest('.fi-x');
    if (x) {
      const q = questCourante(); const tr = ((S.trace || {})[q.id] || []).slice();
      const p = `${x.getAttribute('cx')},${x.getAttribute('cy')}`;
      if (tr[tr.length - 1] !== p) tr.push(p);
      S.trace = { ...(S.trace || {}), [q.id]: tr }; rerender();
    }
  });

  // Butin : notes sur les étiquettes
  document.addEventListener('input', (e) => {
    const i = e.target.closest && e.target.closest('[data-bt]');
    if (!i) return;
    const id = i.closest('[data-q]').dataset.q;
    etat('butin', id, () => ({}))[i.dataset.bt] = i.value.replace(/[^\d]/g, '').slice(0, 7);
  });

  // Glisser : cartes de la chronologie, disque de décodage
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const poignee = e.target.closest('.chr-poignee');
    if (poignee) {
      const li = poignee.closest('.chr-carte');
      const r = li.getBoundingClientRect();
      drag = { type: 'chr', li, liste: li.parentElement, prise: e.clientY - r.top, id: e.pointerId };
      li.classList.add('drag'); li.setPointerCapture(e.pointerId); e.preventDefault();
      return;
    }
    // Seul l'anneau intérieur fait tourner le disque : ailleurs, le doigt fait défiler la page.
    const prise = e.target.closest('.dq-prise');
    const svg = prise && prise.parentElement.querySelector('svg.dq');
    if (svg) {
      const carte = svg.closest('.dq-carte'), g = svg.querySelector('.dq-int'), r = svg.getBoundingClientRect();
      const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const ang = Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI;
      const base = Number((g.style.transform.match(/-?[\d.]+/) || [0])[0]);
      drag = { type: 'dq', carte, g, c, ang, base, id: e.pointerId };
      g.style.transition = 'none'; prise.setPointerCapture(e.pointerId); e.preventDefault();
    }
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.type === 'chr') {
      const { li, liste } = drag;
      const place = () => { const tr = Number(li.dataset.tr || 0); const nat = li.getBoundingClientRect().top - tr; const v = e.clientY - drag.prise - nat; li.style.transform = `translateY(${v}px)`; li.dataset.tr = v; };
      place();
      const prev = li.previousElementSibling, next = li.nextElementSibling;
      if (prev && e.clientY < prev.getBoundingClientRect().top + prev.offsetHeight / 2) { liste.insertBefore(li, prev); place(); }
      else if (next && e.clientY > next.getBoundingClientRect().top + next.offsetHeight / 2) { liste.insertBefore(next, li); place(); }
    } else {
      let d = Math.atan2(e.clientY - drag.c.y, e.clientX - drag.c.x) * 180 / Math.PI - drag.ang;
      if (d > 180) d -= 360; if (d < -180) d += 360;
      drag.ang += d; drag.base += d;
      drag.g.style.transform = `rotate(${drag.base}deg)`;
      const k = mod(Math.round(drag.base / PAS), 26);
      if (k !== drag.k) { drag.k = k; drag.carte.querySelector('.dq-k').textContent = AB[k]; drag.carte.querySelector('.dq-ks').textContent = `décalage ${k}`; try { if (navigator.vibrate) navigator.vibrate(4); } catch (er) { /* rien */ } }
    }
  });
  const fin = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.type === 'chr') {
      const { li, liste } = drag;
      li.classList.remove('drag'); li.style.transform = ''; delete li.dataset.tr;
      chronoMaj(liste);
    } else {
      disqueRegler(drag.carte, Math.round(drag.base / PAS));
    }
    drag = null;
  };
  document.addEventListener('pointerup', fin);
  document.addEventListener('pointercancel', fin);
}
