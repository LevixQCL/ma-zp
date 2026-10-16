// Écran « Coup de filet » : une affaire locale menée étape par étape dans la journée.
// Le joueur choisit une cible, puis la durée de chaque étape (2, 6 ou 12 heures). Le résultat s'affiche à la fin
// de l'étape (calculé ici avec le même code que le tour de 20:00) ; les gains sont versés à 20:00.
import { S, esc, icon, tabbar, myZone, toast } from './common.js';
import { FILET, DUREES, vueFilet, etapeImpossible, chanceInterp, solMax, placesLibres, heuresEtape, heuresParService, agentsPourHeures, rejouer, decisionParquet, voisinGarde } from '../engine/filet.js';
import { zonesVoisines } from '../engine/vagues.js';

const H = 3600 * 1000;
const pc = (v) => `${Math.round(v * 100)} %`;
const heure = (t) => new Date(t).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
const jourHeure = (t) => {
  const d = new Date(t), auj = new Date();
  const demain = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + 1);
  const meme = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  return meme(d, auj) ? `à ${heure(t)}` : meme(d, demain) ? `demain à ${heure(t)}` : `le ${d.toLocaleDateString('fr-BE', { weekday: 'long' })} à ${heure(t)}`;
};
export const dureeTxt = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };

/** Vue du coup de filet maintenant (actions envoyées comprises). */
export function filetMaintenant() {
  const z = myZone();
  return z && S.state ? vueFilet(S.state, z, S.player, Date.now()) : null;
}

/** Actions acceptées depuis le dernier tour (pour les agents mobilisés aujourd'hui). */
function acceptesDuJour() {
  const z = myZone();
  if (!z || !z.filet) return [];
  return rejouer(S.state, z, z.filet, S.player && S.player.filet && S.player.filet.log, Date.now(), { depuis: S.state.lastResolvedAt || -Infinity }).acceptees;
}
/** Agents retirés ce soir de chaque service (ex. { recherche: 2 }). */
export function agentsFiletDuJour() {
  const out = {};
  for (const [s, h] of Object.entries(heuresParService(acceptesDuJour()))) { const n = agentsPourHeures(h); if (n) out[s] = n; }
  return out;
}
const nomService = (s) => (s === 'recherche' ? 'Recherche' : 'Intervention');
/** Phrase « 2 agents de Recherche retirés ce soir » (ou ''). */
export function ligneAgentsFilet() {
  const a = agentsFiletDuJour();
  const l = Object.entries(a).map(([s, n]) => `${n} agent${n > 1 ? 's' : ''} ${s === 'recherche' ? 'de Recherche' : 'd’Intervention'}`);
  return l.length ? `🕵️ Coup de filet : ${l.join(' et ')} mobilisé${Object.values(a).reduce((x, y) => x + y, 0) > 1 ? 's' : ''} aujourd’hui, retiré${Object.values(a).reduce((x, y) => x + y, 0) > 1 ? 's' : ''} de ${Object.keys(a).map((s) => (s === 'recherche' ? 'la Recherche' : 'l’Intervention')).join(' et de ')} ce soir.` : '';
}

/** Agents de plus ce soir si l'on lance cette étape maintenant. */
function agentsEnPlus(k, d) {
  const E = FILET.etapes[k];
  const h0 = heuresParService(acceptesDuJour())[E.service] || 0;
  const h1 = h0 + E.agents * heuresEtape(k, d);
  return agentsPourHeures(h1) - agentsPourHeures(h0);
}
const coutTxt = (k, d) => { const n = agentsEnPlus(k, d), s = nomService(FILET.etapes[k].service); return n ? `+${n} agent${n > 1 ? 's' : ''} de ${s} ce soir` : `sans agent de plus ce soir`; };

/** Ligne de l'HP (« À régler ce soir ») : null s'il n'y a rien à montrer. */
export function filetHp() {
  const fil = filetMaintenant();
  if (!fil) return null;
  const op = fil.op, t = Date.now();
  const engagees = (fil.faits || 0) + (fil.aSolder || []).length + (op && op.fini && op.fini !== 'abandon' ? 1 : 0);
  if (!op) {
    if (engagees >= FILET.maxSemaine || !(fil.cibles || []).length) return null;
    return { prio: 3, cls: 'blue', titre: '🕵️ Coup de filet : la Recherche a repéré des cibles', texte: `${fil.cibles.length} dossier${fil.cibles.length > 1 ? 's' : ''} à ouvrir cette semaine · ${FILET.maxSemaine - engagees} coup${FILET.maxSemaine - engagees > 1 ? 's' : ''} de filet possible${FILET.maxSemaine - engagees > 1 ? 's' : ''}` };
  }
  const c = op.cible;
  if (op.fini) return { prio: 3, cls: op.fini === 'reussie' ? 'blue' : 'amber', titre: `🕵️ ${esc(c.titre)} : ${op.fini === 'reussie' ? `${op.arretes} interpellé${op.arretes > 1 ? 's' : ''}` : op.fini === 'perdue' ? 'cible perdue' : 'abandonné'}`, texte: op.fini === 'reussie' ? 'décision du parquet à 20:00' : 'bilan à 20:00' };
  if (op.en && op.en.fin > t) return { prio: 3, cls: 'blue', titre: `🕵️ ${esc(c.titre)} : ${FILET.etapes[op.en.k].nom.toLowerCase()} en cours`, texte: `résultat ${jourHeure(op.en.fin)}`, fin: op.en.fin };
  return { prio: 1, cls: 'amber', titre: `🕵️ ${esc(c.titre)} : une décision t’attend`, texte: op.journal && op.journal.length ? resumeDernier(op) : 'lance la première filature' };
}
function resumeDernier(op) {
  const j = op.journal[op.journal.length - 1];
  if (j.k === 'filature') return `filature finie : ${j.gain ? `+${j.gain} renseignement${j.gain > 1 ? 's' : ''}` : 'rien d’exploitable'}${j.repere ? ' · la cible a remarqué quelque chose' : ''}`;
  if (j.k === 'recoupement') return `recoupement fini : dossier solide à ${Math.round(op.sol)} %`;
  return j.ok ? 'interpellation réussie' : 'interpellation ratée : la cible s’est méfiée';
}

// ───────────────────────────── Écran ─────────────────────────────

const pipsHtml = (n, max, cls) => `<span class="fi-pips ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

function jaugesHtml(z, fil, op) {
  const c = op.cible;
  const besoin = c.suspects + 1;
  const sm = solMax(op);
  const pl = placesLibres(z, fil, Date.now());
  const pt = (x) => `<i class="fi-seuil" style="left:${x}%"></i>`;
  return `<div class="fi-jauges">
    <div class="fi-j"><span class="fi-jl">Renseignements</span>${pipsHtml(Math.min(op.r, Math.max(besoin, op.r)), Math.max(besoin, op.r), 'rens')}<span class="fi-js">${op.r} exploitable${op.r > 1 ? 's' : ''}${op.vus > op.r ? ` sur ${op.vus}` : ''} · ${op.r >= besoin ? 'cible bien localisée' : `${besoin} pour bien localiser ${c.suspects > 1 ? 'les suspects' : 'le suspect'}`}</span></div>
    <div class="fi-j"><span class="fi-jl">Solidité du dossier</span><span class="fi-barre"><b style="width:${Math.min(100, op.sol)}%"></b>${sm < 100 ? `<s style="left:${sm}%;width:${100 - sm}%"></s>` : ''}${pt(40)}${pt(70)}</span><span class="fi-js">${Math.round(op.sol)} % · parquet : ${decisionParquet(op.sol).nom}${sm < 100 && op.r ? ` · plafond ${sm} % avec tes renseignements` : ''}</span></div>
    <div class="fi-j"><span class="fi-jl">Méfiance de la cible</span>${pipsHtml(op.alerte, FILET.alerteMax, 'alerte')}<span class="fi-js">${op.alerte ? (op.alerte >= FILET.alerteMax - 1 ? 'encore une alerte et elle disparaît' : 'elle se méfie') : 'rien remarqué'}</span></div>
    <div class="fi-j"><span class="fi-jl">Cellules</span>${pipsHtml(pl.occ, pl.tot, 'gav')}<span class="fi-js">${pl.libres} place${pl.libres > 1 ? 's' : ''} libre${pl.libres > 1 ? 's' : ''} sur ${pl.tot}${c.suspects > pl.libres ? ` · ${c.suspects - pl.libres} suspect${c.suspects - pl.libres > 1 ? 's' : ''} sans place` : ''}</span></div>
  </div>`;
}

function chaineHtml(op) {
  const fait = (k) => (op.journal || []).some((j) => j.k === k);
  const etapes = [['filature', '👁️', 'Filature'], ['recoupement', '🗂️', 'Recoupement'], ['interpellation', '🚔', 'Interpellation'], ['parquet', '⚖️', 'Parquet']];
  const cour = op.en ? op.en.k : op.fini === 'reussie' ? 'parquet' : null;
  return `<ol class="fi-chaine">${etapes.map(([k, ico, nom]) => `<li class="${cour === k ? 'cour' : fait(k) || (k === 'parquet' && op.fini === 'reussie') ? 'fait' : ''}"><span>${ico}</span>${nom}</li>`).join('')}</ol>`;
}

function enCoursHtml(op) {
  const e = op.en, t = Date.now();
  const tot = e.fin - e.at, pct = Math.max(2, Math.min(100, ((t - e.at) / tot) * 100));
  const E = FILET.etapes[e.k];
  return `<section class="card fi-cours" aria-live="polite">
    <span class="kicker">${E.nom} en cours · ${e.k === 'interpellation' ? `${E.agents} agents` : `${E.agents} agents pendant ${e.d} h`}</span>
    <div class="fi-cd"><b data-filet-fin="${e.fin}">${dureeTxt(e.fin - t)}</b><span>résultat ${jourHeure(e.fin)}</span></div>
    <div class="fi-prog"><b style="width:${pct}%"></b></div>
    <p class="tiny muted" style="margin:0">Tu peux fermer le jeu : l’étape avance seule. À la fin, l’opération t’attend, sans rien perdre si tu ne reviens que demain.</p>
  </section>`;
}

function choixHtml(z, fil, op) {
  const c = op.cible, t = Date.now();
  const sel = (S.filetDuree && S.filetDuree[op.id]) || {};
  const ligneDurees = (k) => {
    const d0 = sel[k] || 6;
    return `<div class="fi-durees" role="radiogroup" aria-label="Durée">${DUREES.map((d) => `<button type="button" class="fi-duree" role="radio" aria-checked="${d === d0}" data-action="filet-duree" data-k="${k}" data-d="${d}">${d} h</button>`).join('')}</div>`;
  };
  const bloc = (k, ico, titre, detail, cout, imp, d) => `<div class="fi-choix${imp ? ' off' : ''}">
    <div class="fi-ch-h"><span class="fi-ch-ico" aria-hidden="true">${ico}</span><span class="fi-ch-t"><b>${titre}</b><span>${detail}</span></span></div>
    ${k !== 'interpellation' && !imp ? ligneDurees(k) : ''}
    ${imp ? `<p class="tiny muted" style="margin:0">${esc(imp)}</p>` : `<button type="button" class="btn ${k === 'interpellation' ? 'primary' : 'outline'} block" data-action="filet-lancer" data-k="${k}" data-d="${d}">Lancer ${k === 'filature' ? 'la filature' : k === 'recoupement' ? 'le recoupement' : 'l’interpellation'} · ${cout}</button>`}
  </div>`;
  const dF = sel.filature || 6, F = FILET.etapes.filature.durees[dF];
  const risque = Math.min(1, F.risque * c.prudence * (op.alerte ? 1.5 : 1));
  const filature = bloc('filature', '👁️', `Filature de ${dF} h`, `${F.n} occasion${F.n > 1 ? 's' : ''} d’observer, chacune exploitable à ${pc(F.p)} · risque d’être repéré ${pc(risque)}`, coutTxt('filature', dF), etapeImpossible(fil, 'filature', dF, c, t), dF);
  const dR = sel.recoupement || 6, R = FILET.etapes.recoupement.durees[dR];
  const gainR = Math.max(0, Math.min(R.sol, solMax(op) - op.sol));
  const recoupement = bloc('recoupement', '🗂️', `Recoupement de ${dR} h`, `auditions, fichiers, téléphonie : +${gainR} % de solidité${gainR < R.sol ? ` (plafond atteint avec ${op.r} renseignement${op.r > 1 ? 's' : ''})` : ''} · aucun risque`, coutTxt('recoupement', dR), etapeImpossible(fil, 'recoupement', dR, c, t), dR);
  const p = chanceInterp(z, op, c), pl = placesLibres(z, fil, t), I = FILET.etapes.interpellation;
  const sans = Math.max(0, c.suspects - pl.libres);
  const garde = sans ? voisinGarde(S.state, z.uid, zonesVoisines(S.state, z.uid)) : null;
  const interp = bloc('interpellation', '🚔', 'Interpellation', `${I.agents} agents pendant ${I.heures} h · réussite ${pc(p)}${op.r < c.suspects + 1 ? ' (plus de renseignements = plus de chances)' : ''} · parquet : ${decisionParquet(op.sol).nom}${sans ? ` · ${sans} sans place en cellule : ${garde ? `gardé${sans > 1 ? 's' : ''} par ${esc(S.state.zones[garde].nom)}` : `relâché${sans > 1 ? 's' : ''}`}` : ''}`, coutTxt('interpellation', I.heures), etapeImpossible(fil, 'interpellation', 0, c, t), 0);
  return `<section class="card fi-choix-l" aria-label="Prochaine étape"><h2 class="card-title">Prochaine étape</h2>${filature}${recoupement}${interp}
    <button type="button" class="btn small ghost" data-action="filet-abandon" style="align-self:flex-start">Abandonner ce dossier</button></section>`;
}

function journalHtml(op) {
  const l = (op.journal || []).slice().reverse();
  if (!l.length) return '';
  const txt = (j) => {
    if (j.k === 'filature') return `👁️ Filature ${j.d} h : ${j.gain ? `+${j.gain} renseignement${j.gain > 1 ? 's' : ''} exploitable${j.gain > 1 ? 's' : ''}` : 'rien d’exploitable'} sur ${j.vus} observation${j.vus > 1 ? 's' : ''}${j.repere ? ' · <span class="warn">la cible a remarqué quelque chose</span>' : ''}`;
    if (j.k === 'recoupement') return `🗂️ Recoupement ${j.d} h : +${j.gain} % de solidité`;
    return j.ok ? `🚔 Interpellation réussie : ${j.arretes} interpellé${j.arretes > 1 ? 's' : ''}${j.transfert ? ` (${j.transfert} sans place en cellule)` : ''}` : '🚔 Interpellation ratée : la cible s’est méfiée';
  };
  return `<details class="card plis fi-journal" data-k="filet-journal" ${S.ouverts && S.ouverts['filet-journal'] ? 'open' : ''}><summary class="card-title">Journal de l’opération</summary><ul>${l.map((j) => `<li><span class="tiny muted">${heure(j.fin)}</span> ${txt(j)}</li>`).join('')}</ul></details>`;
}

function ciblesHtml(z, fil) {
  const engagees = (fil.faits || 0) + (fil.aSolder || []).length + (fil.op && fil.op.fini && fil.op.fini !== 'abandon' ? 1 : 0);
  const reste = FILET.maxSemaine - engagees;
  const pl = placesLibres(z, fil, Date.now());
  if (reste <= 0) return `<section class="card"><p class="small" style="margin:0">Tu as mené tes ${FILET.maxSemaine} coups de filet de la semaine. De nouvelles cibles arrivent le premier soir de la semaine prochaine.</p></section>`;
  if (!(fil.cibles || []).length) return `<section class="card"><p class="small" style="margin:0">Plus de cible cette semaine. La Recherche en repère de nouvelles le premier soir de la semaine prochaine.</p></section>`;
  const mefiance = (p) => (p < 0.95 ? ['peu méfiante', 'ok'] : p < 1.15 ? ['prudente', 'warn'] : ['très méfiante', 'bad']);
  return `<section class="col" style="gap:10px" aria-label="Cibles de la semaine">
    <h2 class="section">Cibles repérées par la Recherche</h2>
    <p class="tiny muted" style="margin:0">${reste} coup${reste > 1 ? 's' : ''} de filet possible${reste > 1 ? 's' : ''} cette semaine · ${pl.tot} places en cellule${z.infra && z.infra.cachots ? ' (complexe cellulaire)' : ''}</p>
    ${fil.cibles.map((c) => { const [m, mc] = mefiance(c.prudence); return `<article class="fi-cible">
      <span class="fi-c-ico" aria-hidden="true">${c.ico}</span>
      <div class="fi-c-t"><b>${esc(c.titre)}</b><span class="small muted">${esc(c.texte)} ${esc(c.lieu.charAt(0).toUpperCase() + c.lieu.slice(1))}.</span>
        <span class="fi-tags"><span>👤 ${c.suspects} suspect${c.suspects > 1 ? 's' : ''}</span><span>⭐ ${c.valeur} points</span><span class="${mc}">${m}</span>${c.suspects > pl.tot ? `<span class="warn">${c.suspects - pl.tot} sans place en cellule</span>` : ''}</span></div>
      <button type="button" class="btn primary small" data-action="filet-ouvrir" data-c="${esc(c.id)}">Ouvrir</button>
    </article>`; }).join('')}
  </section>`;
}

function finiHtml(op) {
  const c = op.cible;
  if (op.fini === 'reussie') {
    const dec = decisionParquet(op.sol);
    return `<section class="card green"><span class="kicker">Interpellation réussie</span><p class="small" style="margin:0"><b>${op.arretes} interpellé${op.arretes > 1 ? 's' : ''}</b> : ${c.noms.slice(0, op.arretes).map(esc).join(', ')}. Dossier solide à ${Math.round(op.sol)} % : le parquet devrait décider « ${dec.nom} ». Points, saisie et PS à 20:00.</p></section>`;
  }
  if (op.fini === 'perdue') return '<section class="card red"><span class="kicker" style="color:var(--red-soft)">Cible perdue</span><p class="small" style="margin:0">Elle a repéré la surveillance et a disparu. Bilan à 20:00.</p></section>';
  return '<section class="card"><p class="small" style="margin:0">Dossier abandonné.</p></section>';
}

export function renderFilet() {
  const z = myZone();
  const fil = filetMaintenant();
  const retour = '<a class="btn small ghost" href="#hp" style="align-self:flex-start">← HP</a>';
  if (!fil) return `<main class="screen fi">${retour}<section class="card"><h1 class="big">Coup de filet</h1><p class="small muted" style="margin:0">La Recherche repère ses premières cibles ce soir à 20:00.</p></section></main>${tabbar('hp')}`;
  const op = fil.op;
  const ag = ligneAgentsFilet();
  const tete = op ? `<header class="fi-tete"><span class="fi-t-ico" aria-hidden="true">${op.cible.ico}</span><div class="col" style="gap:2px;min-width:0"><span class="kicker">Coup de filet · ${esc(op.cible.lieu)}</span><h1 class="big">${esc(op.cible.titre)}</h1>
      <span class="fi-tags"><span>👤 ${op.cible.noms.map(esc).join(', ')}</span><span>⭐ ${op.cible.valeur} points</span></span></div></header>` : '<header class="col" style="gap:3px"><span class="kicker">Recherche · cette semaine</span><h1 class="big">Coup de filet</h1><p class="sub" style="margin:0">Choisis une cible, puis mène l’opération étape par étape : tu choisis la durée de chaque étape.</p></header>';
  let corps = '';
  if (!op) corps = ciblesHtml(z, fil);
  else {
    corps = `<section class="card fi-dossier">${chaineHtml(op)}${jaugesHtml(z, fil, op)}</section>`;
    if (op.fini) corps += finiHtml(op) + ciblesHtml(z, fil);
    else if (op.en && op.en.fin > Date.now()) corps += enCoursHtml(op);
    else corps += choixHtml(z, fil, op);
    corps += journalHtml(op);
  }
  const hist = (fil.hist || []).slice().reverse().slice(0, 3);
  return `<main class="screen fi">
    ${retour}
    ${tete}
    ${ag ? `<p class="tiny warn" style="margin:0">${esc(ag)}</p>` : ''}
    ${corps}
    ${hist.length ? `<section class="col" style="gap:6px"><h2 class="section">Derniers coups de filet</h2>${hist.map((h) => `<div class="between small"><span>${h.ico} ${esc(h.titre)}</span><span class="${h.fini === 'reussie' ? 'ok' : h.fini === 'perdue' ? 'bad' : 'muted'}">${h.fini === 'reussie' ? `${h.arretes} interpellé${h.arretes > 1 ? 's' : ''} · ${esc(h.decision || '')} · +${String(h.points).replace('.', ',')} pts` : h.fini === 'perdue' ? 'cible perdue' : 'abandonné'}</span></div>`).join('')}</section>` : ''}
    <a class="small" href="#guide-filet">Comment ça marche</a>
  </main>${tabbar('hp')}`;
}

/** Comptes à rebours de l'écran (chaque seconde) ; renvoie vrai quand une étape vient de finir (écran à redessiner). */
export function majFilet() {
  let fini = false;
  for (const el of document.querySelectorAll('[data-filet-fin]')) {
    const f = Number(el.dataset.filetFin), r = f - Date.now();
    if (r <= 0) fini = true; else el.textContent = dureeTxt(r);
  }
  return fini;
}

/** Actions de l'écran. Renvoie vrai s'il faut redessiner. */
export async function actionFilet(a, el, { confirmer } = {}) {
  const z = myZone();
  if (!z || !z.filet || !S.player) return false;
  if (a === 'filet-duree') {
    const fil = filetMaintenant(), op = fil && fil.op;
    if (!op) return false;
    S.filetDuree = { ...(S.filetDuree || {}), [op.id]: { ...((S.filetDuree || {})[op.id] || {}), [el.dataset.k]: Number(el.dataset.d) } };
    return true;
  }
  const fil = filetMaintenant();
  const t = Date.now();
  let e = null;
  if (a === 'filet-ouvrir') e = { k: 'ouvrir', c: el.dataset.c };
  else if (a === 'filet-lancer') {
    const k = el.dataset.k, d = Number(el.dataset.d) || 0;
    const imp = etapeImpossible(fil, k, d, fil.op && fil.op.cible, t);
    if (imp) { toast(imp.charAt(0).toUpperCase() + imp.slice(1)); return true; }
    e = { k, d };
  } else if (a === 'filet-abandon') {
    if (confirmer && !(await confirmer('Abandonner ce dossier ? Il ne compte pas dans tes coups de filet de la semaine, mais la cible est perdue.', 'Abandonner'))) return false;
    e = { k: 'abandon' };
  }
  if (!e) return false;
  const log = ((S.player.filet && S.player.filet.log) || []).filter((x) => x && x.s > z.filet.s);
  const entree = { ...e, s: fil.s + 1, at: t };
  const avant = S.player.filet;
  S.player.filet = { log: [...log, entree] };
  // Vérifie que l'action passe bien avant de l'envoyer (même code que le tour de 20:00).
  const apres = filetMaintenant();
  if (apres.s !== entree.s) { S.player.filet = avant; toast('Action impossible pour l’instant.'); return true; }
  try { await S.backend.savePlayer(S.user.uid, S.player); } catch (err) { S.player.filet = avant; toast('Pas de connexion : action non envoyée.'); return true; }
  if (e.k === 'ouvrir') toast('Dossier ouvert : lance la première filature.');
  else if (e.k !== 'abandon') { const op = apres.op; toast(op && op.en ? `${FILET.etapes[e.k].nom} lancé${e.k === 'recoupement' ? '' : 'e'} : résultat ${jourHeure(op.en.fin)}.` : 'Étape lancée.'); }
  return true;
}
