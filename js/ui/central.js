// Le central (calque « Ma zone » de la Carte, phase de test) : la zone tourne en temps réel toute la journée.
// En haut ce qu'il y a à faire, la carte avec les appels et les équipes, la bande des équipes, le journal du jour.
// Les patrouilles du soir par quartier (tour de 20 h) restent dans la fiche du quartier touché.
import { S, esc, myZone, zoneName } from './common.js';
import { planIso } from './plan-iso.js';
import { carteQuartiers } from '../engine/quartiers.js';
import { vehiculesDisponibles } from '../engine/zone.js';
import { ficheQuartierHtml, chipsQuartiersHtml, siteHtml } from './carte.js';
import { siteDe } from '../engine/sites.js';
import { CENTRAL, STATUTS_C, SAISIES_C, CARNET_TYPES, equipesCentral, genererJournee, simuler, prevoir, distancesCentral, horloge, fouillable, chanceFouille } from '../engine/central.js';

const COUL = { Intervention: ['#EEF2FA', '#12306E'], Proximité: ['#1E57B8', '#E6F1FF'], Roulage: ['#E59A1F', '#2A1600'] };
const TON = { maitrise: 'v', arretee: 'v', moyen: 'a', deborde: 'r', incident: 'r' };
const FOND = { v: '#1E6B4E', a: '#9A5A12', r: '#8E2328', att: '#B5322E', route: '#2D6FD6' };
const pl = (n) => (n > 1 ? 's' : '');
const ETAT = { libre: 'libre', poste: 'en poste', route: 'en route', surplace: 'sur place', pause: 'en pause' };

/** Minute de la journée de tour (0 = 20:00 la veille). En démo, on peut avancer l'horloge. */
function minute(st) {
  const debut = st.nextDeadline - CENTRAL.jour * 60000;
  return Math.max(0, Math.min(CENTRAL.jour - 1, Math.floor((Date.now() + (S.cxDecalage || 0) * 60000 - debut) / 60000)));
}
function contexte() {
  const st = S.state, me = myZone();
  const carte = carteQuartiers(st), cells = (carte.deZone[me.uid] || []).slice();
  const capitale = carte.capitale[me.uid] ?? cells[0];
  const dist = distancesCentral(cells, carte.adj);
  const cle = `${st.season}-${st.turn}`;
  let mem = (S.player && S.player.central) || {};
  if (mem.cle !== cle) { mem = { cle, actions: [], prev: mem.cle === `${st.season}-${st.turn - 1}` ? { cle: mem.cle, actions: mem.actions || [], equipes: mem.equipes } : null }; }
  const equipes = mem.equipes || equipesCentral(me, { capitale, autre: cells.find((c) => c !== capitale), vehicules: vehiculesDisponibles(me, st.turn) });
  if (!mem.equipes) { mem.equipes = equipes; sauver(mem); }
  const graine = (c) => `${S.config.seed}-central-${c}-${me.uid}`;
  const jour = genererJournee(graine(cle), cells);
  return { st, me, carte, cells, capitale, dist, mem, equipes, jour, graine, m: minute(st) };
}
let tSauve = null;
function sauver(mem) {
  S.player = { ...(S.player || {}), central: mem };
  clearTimeout(tSauve);
  tSauve = setTimeout(() => { try { S.backend.savePlayer(S.user.uid, S.player); } catch (e) { console.warn(e); } }, 500);
}
const nomQ = (c, q) => c.carte.nomDe(q);
const tags = (a) => a.tags.join(' · ');
const gTxt = (a) => (a.flou && !a.rens ? '?' : a.gReel);

/** Ce qu'il y a à faire maintenant, du plus urgent au moins urgent. */
function aFaire(c, s) {
  const out = [], m = c.m;
  const libres = s.equipes.filter((e) => e.etat === 'libre' || e.etat === 'poste');
  for (const a of s.appels.filter((x) => !x.statut && !x.eq && x.t <= m).sort((x, y) => y.gReel - x.gReel || x.t - y.t))
    out.push({ k: 'att', a, titre: a.titre, sous: `${nomQ(c, a.cell)} · attend depuis ${m - a.t} min · l’adjoint s’en charge dans ${Math.max(0, CENTRAL.delaiAdjoint - (m - a.t))} min`, ton: 'r' });
  for (const a of s.appels.filter((x) => !x.statut && x.eq && x.t <= m)) {
    const e = s.equipes.find((q) => q.id === a.eq), p = prevoir(e, a, m, c);
    if (CENTRAL.pts[p.statut] >= 3) continue;
    if (libres.some((q) => CENTRAL.pts[prevoir(q, a, m, c).statut] > CENTRAL.pts[p.statut])) out.push({ k: 'mieux', a, titre: a.titre, sous: `${e.nom} va faire « ${STATUTS_C[p.statut]} » · une équipe libre ferait mieux`, ton: 'a' });
  }
  // Équipe sur place sur un appel fouillable : fouiller (10 min de plus, chance de saisie). L'adjoint ne fouille jamais.
  for (const a of s.appels.filter((x) => aFouiller(s, x)).slice(0, 2)) { const e = s.equipes.find((q) => q.id === a.eq); out.push({ k: 'fouille', a, titre: `${e.nom} sur place : ${a.titre}`, sous: `${STATUTS_C[a.statut]} · fouiller : ${CENTRAL.fouille} min de plus, ${Math.round(chanceFouille(a.statut) * 100)} % de chance de saisie`, ton: 'v', faire: `data-cxfouille="${a.id}"`, bouton: 'Fouiller' }); }
  for (const n of c.jour.annonces.filter((x) => x.ta <= m && x.t > m)) out.push({ k: 'annonce', n, titre: `${n.titre} à ${horloge(n.t)}`, sous: `${nomQ(c, n.cell)} · ${n.texte} · mets une équipe en poste`, ton: 'b' });
  for (const e of libres.filter((x) => x.n >= CENTRAL.fatigue)) out.push({ k: 'fatigue', e, titre: `${e.nom} est usée`, sous: `${e.n} missions sans pause · une pause de ${CENTRAL.pause} min la remet d’aplomb`, ton: 'a' });
  // Appels flous déjà partis : un coup de fil au requérant dit à quoi s'attendre.
  if (s.rensRestants > 0) for (const a of s.appels.filter((x) => !x.statut && x.flou && !x.rens && x.t <= m).slice(0, 1)) out.push({ k: 'rens', a, titre: `Gravité inconnue : ${a.titre}`, sous: `${nomQ(c, a.cell)} · rappelle le requérant (${s.rensRestants} restant${pl(s.rensRestants)})`, ton: 'b', faire: `data-cxrens="${a.id}"`, bouton: 'Rappeler' });
  // Équipe libre : la poster là où ça chauffe (le quartier le plus tendu, ou celui d'un événement annoncé).
  const tens = c.me.quartiers || {}, ann = c.jour.annonces.find((x) => x.ta <= m && x.t > m);
  const libre = s.equipes.filter((e) => e.etat === 'libre' && e.n < CENTRAL.fatigue).sort((x, y) => (ann && /Bande/.test(ann.titre) ? (y.comp.includes('bande') - x.comp.includes('bande')) : 0))[0];
  if (libre) {
    const q = ann ? ann.cell : c.cells.slice().sort((x, y) => (tens[y] || 0) - (tens[x] || 0))[0];
    if (q != null && libre.ou !== q) out.push({ k: 'poste', titre: `${libre.nom} est libre`, sous: `la poster à ${nomQ(c, q)}${ann && ann.cell === q ? ` avant « ${ann.titre} »` : ', le quartier le plus tendu'} : sur place tout de suite s’il s’y passe quelque chose`, ton: 'b', faire: `data-cxposteq="${libre.id}:${q}"`, bouton: 'Poster' });
  }
  if (c.me.pointChaud) out.push({ k: 'pc', titre: `Point chaud à ${nomQ(c, c.me.pointChaud.cell)}`, sous: '2 agents en patrouille ce soir le désamorcent (fiche du quartier)', ton: 'b', q: c.me.pointChaud.cell });
  return out;
}

/** Appel où l'équipe est sur place et peut encore fouiller. */
function aFouiller(s, a) {
  if (!fouillable(a) || a.fouille || !a.statut || a.statut === 'incident' || !a.eq) return false;
  const e = s.equipes.find((q) => q.id === a.eq);
  return !!e && e.etat === 'surplace' && e.mission === a.id;
}
const objet = (id) => `${SAISIES_C[id].ico} ${esc(SAISIES_C[id].nom)}`;

function marqueurs(c, s) {
  const out = [], parQ = {}, m = c.m;
  const pos = (q) => { const k = parQ[q] = (parQ[q] || 0) + 1; return [[0, 0], [16, -6], [-16, -6], [0, -17], [16, 10], [-16, 10]][(k - 1) % 6]; };
  for (const a of s.appels.filter((x) => x.t <= m && (!x.statut || (x.finA != null && m - x.finA < 20)))) {
    const [dx, dy] = pos(a.cell), sel = S.cxSel === a.id;
    const fond = a.statut ? FOND[TON[a.statut]] : a.eq ? FOND.route : FOND.att;
    const txt = a.statut ? (a.statut === 'maitrise' || a.statut === 'arretee' ? '✓' : '!') : a.eq ? a.eq : gTxt(a);
    out.push({ k: a.cell, dx, dy, attr: `data-cx="${a.id}"`, svg: `<circle r="13" fill="transparent"/>${!a.statut && !a.eq ? '<circle r="11" fill="none" stroke="#FF6E6A" stroke-width="1.2" class="cx-pulse"/>' : ''}<rect x="-7" y="-7" width="14" height="14" rx="3" transform="rotate(45)" fill="${fond}" stroke="${sel ? '#FFB23F' : '#070B19'}" stroke-width="${sel ? 2.4 : 1}"/><text y="3" text-anchor="middle" style="font:800 ${txt.length > 1 ? 6.5 : 8.5}px var(--body,sans-serif);fill:#FFF3E0">${txt}</text>` });
  }
  for (const e of s.equipes.filter((x) => x.etat === 'libre' || x.etat === 'poste' || x.etat === 'pause')) {
    const [dx, dy] = pos(e.ou), [col, ink] = COUL[e.serv];
    out.push({ k: e.ou, dx, dy: dy + 4, attr: `data-cxe="${e.id}"`, svg: `<circle r="8" fill="${col}" stroke="${S.cxEq === e.id ? '#FFB23F' : '#070B19'}" stroke-width="${S.cxEq === e.id ? 2 : 1}" ${e.etat === 'pause' ? 'opacity=".5"' : ''}/><text y="2.6" text-anchor="middle" style="font:800 6.5px var(--body,sans-serif);fill:${ink}">${e.id}</text>${e.etat === 'poste' ? '<circle r="10.5" fill="none" stroke="#FFC970" stroke-dasharray="2 1.6"/>' : ''}` });
  }
  return out;
}

function panneauAppel(c, s, a) {
  const m = c.m, r = a;
  const libres = s.equipes.filter((e) => e.etat === 'libre' || e.etat === 'poste' || (e.etat === 'route' && e.mission !== a.id));
  const opts = libres.map((e) => ({ e, p: prevoir(e, a, m, c) })).sort((x, y) => CENTRAL.pts[y.p.statut] - CENTRAL.pts[x.p.statut] || x.p.arr - y.p.arr);
  const actuelle = a.eq && s.equipes.find((e) => e.id === a.eq);
  const tete = `<div class="cx-appel"><span><b>${esc(a.titre)}</b><span class="small muted">${horloge(a.t)} · ${esc(nomQ(c, a.cell))} · ${a.flou && !a.rens ? 'gravité inconnue (1 ou 3)' : `gravité ${a.gReel}`} · ${esc(tags(a))}</span></span>${a.statut ? `<span class="cx-res ${TON[a.statut]} plein">${STATUTS_C[a.statut]}</span>` : ''}</div>`;
  const fouilleTxt = a.fouilleFaite ? (a.saisie ? `<p class="small" style="margin:0;color:#3DD39A">Fouille : ${objet(a.saisie)} ${SAISIES_C[a.saisie].acc || 'saisi'}${SAISIES_C[a.saisie].piste ? ' · une piste pour ton enquête' : ''}.</p>` : '<p class="small muted" style="margin:0">Fouille : rien trouvé.</p>')
    : a.fouille ? `<p class="small" style="margin:0;color:#9DCBFF">Fouille ${a.statut ? 'en cours' : 'demandée : l’équipe fouillera en arrivant'}.</p>` : '';
  const btnFouille = fouillable(a) && !a.fouille && a.eq && a.statut !== 'incident' && s.equipes.some((e) => e.id === a.eq && e.mission === a.id && (e.etat === 'route' || e.etat === 'surplace'))
    ? `<button type="button" class="cx-eq" data-cxfouille="${a.id}"><span class="cx-av" style="background:#1E6B4E;color:#E9FFF4">⌕</span><span class="cx-lb"><b>Fouiller</b><span>${CENTRAL.fouille} min de plus sur place · ${a.statut ? `${Math.round(chanceFouille(a.statut) * 100)} % de chance de saisie` : 'plus l’intervention est réussie, plus on trouve'}</span></span></button>` : '';
  if (a.statut) return `${tete}<p class="small muted" style="margin:0">${a.eq ? `${esc(s.equipes.find((e) => e.id === a.eq).nom)}` : 'Personne n’est arrivé à temps'}${a.par === 'adjoint' ? ' (envoyée par l’adjoint)' : ''}.</p>${fouilleTxt}${btnFouille ? `<div class="cx-eqs">${btnFouille}</div>` : ''}`;
  const cur = actuelle ? `<p class="small" style="margin:0">${esc(actuelle.nom)} ${a.par === 'adjoint' ? '(adjoint)' : ''} en route · sur place ${horloge(a.arr)} · prévu : <span class="cx-res ${TON[prevoir(actuelle, a, m, c).statut]}">${STATUTS_C[prevoir(actuelle, a, m, c).statut]}</span></p>` : `<p class="small" style="margin:0;color:#FF9A92">Personne n’y va. L’adjoint enverra l’équipe la plus proche dans ${Math.max(0, CENTRAL.delaiAdjoint - (m - a.t))} min.</p>`;
  const boutons = opts.map(({ e, p }) => {
    const [col, ink] = COUL[e.serv], forme = a.tags.some((t) => e.comp.includes(t));
    return `<button type="button" class="cx-eq" data-cxenv="${e.id}"><span class="cx-av" style="background:${col};color:${ink}">${e.id}</span><span class="cx-lb"><b>${esc(e.nom)}</b><span>${forme ? 'formée · ' : ''}${e.n >= CENTRAL.fatigue ? 'usée · ' : ''}${e.etat === 'route' ? 'détournée · ' : ''}sur place ${horloge(p.arr)}</span></span><span class="cx-res ${TON[p.statut]}">${STATUTS_C[p.statut]}</span></button>`;
  }).join('');
  const rens = a.flou && !a.rens ? `<button type="button" class="cx-eq" data-cxrens="${a.id}" ${s.rensRestants <= 0 ? 'disabled' : ''}><span class="cx-av" style="background:#2A3150;color:#FFC970">?</span><span class="cx-lb"><b>Rappeler le requérant</b><span>révèle la gravité · ${s.rensRestants} restant${pl(s.rensRestants)} aujourd’hui</span></span></button>` : '';
  return `${tete}${cur}${fouilleTxt}<div class="cx-eqs">${btnFouille}${rens}${boutons || '<p class="small muted" style="margin:0">Aucune équipe libre pour l’instant.</p>'}</div>`;
}
function panneauEquipe(c, s, e) {
  const fin = e.etat === 'route' || e.etat === 'surplace' || e.etat === 'pause' ? ` jusqu’à ${horloge(e.jusqua)}` : '';
  const libre = e.etat === 'libre' || e.etat === 'poste';
  return `<div class="cx-appel"><span><b>${esc(e.nom)}</b><span class="small muted">${e.serv} · ${esc(e.comp.join(', '))} · ${ETAT[e.etat]}${fin} · ${esc(nomQ(c, e.ou))} · ${e.n} mission${pl(e.n)} depuis la dernière pause</span></span></div>
    <div class="cx-eqs">
      <button type="button" class="cx-eq" data-cxposte="${e.id}" ${libre ? '' : 'disabled'}><span class="cx-av" style="background:#2A3150;color:#FFC970">⌖</span><span class="cx-lb"><b>${S.cxPoste === e.id ? 'Touche un quartier sur la carte' : 'Mettre en poste'}</b><span>elle attend dans un quartier : sur place tout de suite s’il s’y passe quelque chose${e.comp.includes('bande') ? ' ; une bande y est cueillie à son passage' : ''}</span></span></button>
      <button type="button" class="cx-eq" data-cxpause="${e.id}" ${libre && e.n > 0 ? '' : 'disabled'}><span class="cx-av" style="background:#2A3150;color:#C3C9DE">☕</span><span class="cx-lb"><b>Pause</b><span>${CENTRAL.pause} min à l’hôtel de police, puis reposée</span></span></button>
    </div>`;
}

export function centralHtml({ surCarte = '' } = {}) {
  const c = contexte(), m = c.m;
  const s = simuler(c.jour, c.equipes, c.mem.actions, m, c);
  const adj = simuler(c.jour, c.equipes, [], m, c);
  const liste = aFaire(c, s);
  const sel = S.cxSel && s.appels.find((a) => a.id === S.cxSel && a.t <= m);
  const eqSel = S.cxEq && s.equipes.find((e) => e.id === S.cxEq);
  // Quartier montré : celui touché, sinon le point chaud, sinon le plus tendu (sa fiche porte les patrouilles du soir).
  const tens = c.me.quartiers || {};
  const quartier = sel || eqSel ? null : S.quartierSel != null && c.cells.includes(Number(S.quartierSel)) ? String(S.quartierSel)
    : c.me.pointChaud && c.cells.includes(Number(c.me.pointChaud.cell)) ? String(c.me.pointChaud.cell) : String(c.cells.slice().sort((x, y) => (tens[y] || 0) - (tens[x] || 0))[0]);
  const iso = planIso(c.st, c.me, { vue: 'mazone', sel: sel ? sel.cell : eqSel ? eqSel.ou : quartier, extra: marqueurs(c, s) });
  const coach = S.cxPoste ? `Touche le quartier où ${esc(s.equipes.find((e) => e.id === S.cxPoste).nom)} doit attendre.`
    : liste.length ? `${liste.length} chose${pl(liste.length)} à voir. Touche une ligne ou un losange.` : 'Rien d’urgent. Place une équipe en poste dans un quartier tendu, ou prépare tes patrouilles du soir.';
  const lignes = liste.slice(0, 5).map((x) => x.faire ? `<div class="cx-todo ${x.ton} rapide"><span><b>${esc(x.titre)}</b><span>${esc(x.sous)}</span></span><button type="button" class="cx-go" ${x.faire}>${x.bouton}</button></div>`
    : `<button type="button" class="cx-todo ${x.ton}" ${x.a ? `data-cx="${x.a.id}"` : x.e ? `data-cxe="${x.e.id}"` : x.n ? `data-cxq="${x.n.cell}"` : `data-cxq="${x.q}"`}><b>${esc(x.titre)}</b><span>${esc(x.sous)}</span></button>`).join('');
  const bande = s.equipes.map((e) => {
    const [col, ink] = COUL[e.serv], info = e.etat === 'route' ? `→ ${esc(nomQ(c, e.dest))} ${horloge(e.jusqua)}` : e.etat === 'surplace' || e.etat === 'pause' ? `jusqu’à ${horloge(e.jusqua)}` : esc(nomQ(c, e.ou));
    return `<button type="button" class="cx-chip ${e.etat} ${S.cxEq === e.id ? 'sel' : ''}" data-cxe="${e.id}"><span class="cx-av" style="background:${col};color:${ink}">${e.id}</span><span><b>${ETAT[e.etat]}</b><span>${info}</span></span>${e.n >= CENTRAL.fatigue ? '<i title="usée">●</i>' : ''}</button>`;
  }).join('');
  const regle = s.journal.slice().reverse();
  const journal = regle.length ? regle.map((j) => { const a = s.appels.find((x) => x.id === j.id);
    if (j.k === 'saisie') return `<div class="cx-jl"><span class="muted">${horloge(j.m)}</span><span>${objet(j.obj)} ${SAISIES_C[j.obj].acc || 'saisi'} · ${esc(nomQ(c, a.cell))} · ${j.eq}</span><span class="cx-res v plein">+${j.pts}</span></div>`;
    if (j.k === 'fouille') return `<div class="cx-jl"><span class="muted">${horloge(j.m)}</span><span class="muted">Fouille sans résultat · ${esc(nomQ(c, a.cell))} · ${j.eq}</span><span></span></div>`;
    return `<div class="cx-jl"><span class="muted">${horloge(j.m)}</span><span>${esc(a.titre)} · ${esc(nomQ(c, a.cell))}${j.eq ? ` · ${j.eq}` : ''}</span><span class="cx-res ${TON[j.statut]} plein">${STATUTS_C[j.statut]}</span></div>`; }).join('') : '<p class="small muted" style="margin:0">Rien de réglé pour l’instant.</p>';
  const nbReg = regle.filter((j) => !j.k).length;
  const demo = S.backend && S.backend.mode === 'demo';
  const panneau = sel ? panneauAppel(c, s, sel) : eqSel ? panneauEquipe(c, s, eqSel) : '';
  return `${STYLE}
    <div class="cx-tete"><span><b>Central · ${horloge(m)}</b><span class="small muted">${s.appels.filter((a) => a.t <= m).length} appels aujourd’hui · ${s.pts >= 0 ? '+' : ''}${s.pts} points (adjoint seul : ${adj.pts >= 0 ? '+' : ''}${adj.pts})</span></span>${demo ? '<span class="cx-demo"><button type="button" data-cxtemps="10">+10 min</button><button type="button" data-cxtemps="60">+1 h</button></span>' : ''}</div>
    <p class="cx-test">Compté à 20 h : ton carnet, tes saisies (salle des ventes, pistes d’enquête), les trophées et le classement du central. Sans toi, l’adjoint dispatche au bout de ${CENTRAL.delaiAdjoint} minutes, mais il ne fouille jamais.</p>
    <p class="cx-coach">${coach}</p>
    ${lignes ? `<div class="cx-todos">${lignes}</div>` : ''}
    <div class="cv-carte cx-carte">${iso}${surCarte}</div>
    ${panneau ? `<div class="cx-panneau" id="cx-panneau">${panneau}<button type="button" class="cx-fermer" data-cxfermer="1">Fermer</button></div>` : ''}
    <div class="cx-bande">${bande}</div>
    ${quartier ? `${ficheQuartierHtml(c.st, c.me, quartier)}` : ''}
    <details class="cx-det"><summary><b>Quartiers et patrouilles du soir</b><span class="small muted">pour le tour de 20 h</span></summary>${chipsQuartiersHtml(c.st, c.me, quartier)}${siteHtml(siteDe(c.me))}</details>
    <details class="cx-det"><summary><b>Journal du jour</b><span class="small muted">${nbReg} appel${pl(nbReg)} réglé${pl(nbReg)}</span></summary><div class="cx-journal">${journal}</div></details>
    ${carnetHtml(c, s, adj)}
    ${hier(c)}
    <details class="cx-det"><summary><b>Comment ça marche</b></summary><div class="cx-regles">
      <p><b>Les appels tombent toute la journée.</b> Envoie l’équipe la plus adaptée : formée à ce qui se passe et sur place dans le quart d’heure, elle maîtrise (+3). Sinon moyen (+1), débordé (−1) ; un appel qui attend s’aggrave d’un cran toutes les ${CENTRAL.aggravation} min, au-delà de la gravité 3 c’est l’incident (−3). Une bande n’est arrêtée que par le contrôle (+4).</p>
      <p><b>Sans toi, l’adjoint envoie l’équipe la plus proche au bout de ${CENTRAL.delaiAdjoint} min.</b> Tu peux redétourner une équipe en route vers un appel plus grave.</p>
      <p><b>Une équipe s’use</b> : à sa 4e mission sans pause, son résultat baisse d’un cran. ${CENTRAL.repos} min sans mission ou une pause la reposent. <b>En poste</b>, elle attend dans un quartier : sur place tout de suite s’il s’y passe quelque chose.</p>
      <p><b>Fouiller</b> garde l’équipe ${CENTRAL.fouille} minutes de plus sur place, avec une chance de saisie d’autant plus grande que l’intervention est réussie (${Math.round(chanceFouille('maitrise') * 100)} % si maîtrisé, ${Math.round(chanceFouille('arretee') * 100)} % sur une bande arrêtée). Une saisie vaut +1 (+2 si rare). À 20 h, tes saisies remplissent la jauge de confiscation (un lot pour la salle des ventes, la moitié du prix pour toi) ; un téléphone, une carte ou un carnet donne une pièce de plus à ton enquête.</p>
      <p><b>Ce qui est mal réglé revient</b> une heure plus tard, plus grave. Un appel sur trois est flou : rappeler le requérant révèle sa gravité (${CENTRAL.renseignements} fois par jour). Les événements annoncés le sont une heure avant.</p>
    </div></details>`;
}
/** Le carnet du central : ce que la zone a réglé et saisi, la jauge de confiscation, le classement de la saison. */
function carnetHtml(c, s, adj) {
  const cx = c.me.central || { types: {}, saisies: {}, interp: 0, jauge: 0, jours: 0, gainSaison: 0 };
  const parToi = (a) => a.par === 'toi' || a.par === 'poste';
  const ajd = { saisies: s.appels.filter((a) => a.saisie).map((a) => a.saisie), regles: s.appels.filter((a) => (a.statut === 'maitrise' || a.statut === 'arretee') && parToi(a)).map((a) => a.base || a.titre) };
  const nSz = Object.values(cx.saisies || {}).reduce((t, n) => t + n, 0);
  const album = Object.entries(SAISIES_C).map(([id, o]) => { const n = (cx.saisies || {})[id] || 0, auj = ajd.saisies.filter((x) => x === id).length;
    return n || auj ? `<div class="cx-obj${o.rare ? ' rare' : ''}"><span class="cx-ico">${o.ico}</span><b>${esc(o.nom)}</b><span>${n ? `×${n}` : ''}${auj ? `${n ? ' · ' : ''}+${auj} aujourd’hui` : ''}${o.piste ? ' · piste' : ''}</span></div>`
      : `<div class="cx-obj vide"><span class="cx-ico">?</span><b>${o.rare ? 'Saisie rare' : 'À trouver'}</b><span>${o.rare ? 'très rare' : '&nbsp;'}</span></div>`; }).join('');
  const types = CARNET_TYPES.map((t) => { const n = (cx.types || {})[t] || 0, auj = ajd.regles.filter((x) => x === t).length;
    return `<div class="cx-typ ${n || auj ? 'ok' : ''}"><span>${n || auj ? '✓' : '·'}</span><span>${esc(t)}</span><span class="muted">${n ? `×${n}` : ''}${auj ? ` +${auj}` : ''}</span></div>`; }).join('');
  const jauge = Math.min(CENTRAL.confiscation, cx.jauge || 0), jaugeAuj = ajd.saisies.reduce((t, id) => t + SAISIES_C[id].val, 0);
  const st = c.st, zones = Object.entries(st.zones || {}).filter(([, z]) => z.central && z.central.s === st.season && z.central.joursSaison > 0)
    .sort((x, y) => y[1].central.gainSaison - x[1].central.gainSaison);
  const classement = zones.length ? zones.slice(0, 8).map(([u, z], i) => `<div class="cx-cl ${u === c.me.uid ? 'moi' : ''}"><span>${i + 1}</span><span>${zoneName(z)}</span><span class="muted">${z.central.joursSaison} j</span><b>${z.central.gainSaison >= 0 ? '+' : ''}${z.central.gainSaison}</b></div>`).join('')
    : '<p class="small muted" style="margin:0">Personne n’est encore classé : le premier bilan tombe ce soir à 20 h.</p>';
  const gain = s.pts - adj.pts;
  return `<details class="cx-det" open><summary><b>Carnet du central</b><span class="small muted">${nSz} saisie${pl(nSz)} · ${cx.interp || 0} interpellation${pl(cx.interp || 0)} · ${cx.jours || 0} jour${pl(cx.jours || 0)} joué${pl(cx.jours || 0)} · aujourd’hui ${gain >= 0 ? '+' : ''}${gain} sur l’adjoint (compté à 20 h)</span></summary>
    <h4 class="cx-h">Saisies</h4><div class="cx-album">${album}</div>
    <h4 class="cx-h">Confiscation</h4><div class="cx-jauge"><i style="width:${Math.round(100 * jauge / CENTRAL.confiscation)}%"></i>${jaugeAuj ? `<i class="auj" style="width:${Math.round(100 * Math.min(CENTRAL.confiscation - jauge, jaugeAuj) / CENTRAL.confiscation)}%"></i>` : ''}</div>
    <p class="small muted" style="margin:4px 0 0">${jauge}${jaugeAuj ? ` + ${jaugeAuj} aujourd’hui` : ''} / ${CENTRAL.confiscation} : à ${CENTRAL.confiscation}, un lot de biens confisqués passe à la salle des ventes et la moitié du prix revient à ta zone.</p>
    <h4 class="cx-h">Appels réglés toi-même</h4><div class="cx-types">${types}</div>
    <h4 class="cx-h">Classement du central · saison ${st.season}</h4><p class="small muted" style="margin:0 0 4px">Points de mieux que son propre adjoint, cumulés sur la saison.</p><div class="cx-class">${classement}</div>
  </details>`;
}
function hier(c) {
  const prev = c.mem.prev;
  if (!prev || !prev.equipes) return '';
  const jour = genererJournee(c.graine(prev.cle), c.cells);
  const s = simuler(jour, prev.equipes, prev.actions, CENTRAL.jour - 1, c), adj = simuler(jour, prev.equipes, [], CENTRAL.jour - 1, c);
  const inc = s.journal.filter((j) => j.statut === 'incident').length, sz = s.appels.filter((a) => a.saisie);
  return `<details class="cx-det"><summary><b>Hier : ${s.pts >= 0 ? '+' : ''}${s.pts} points</b><span class="small muted">${prev.actions.length} ordre${pl(prev.actions.length)} · ${inc} incident${pl(inc)} · ${sz.length} saisie${pl(sz.length)} · l’adjoint seul aurait fait ${adj.pts >= 0 ? '+' : ''}${adj.pts}</span></summary>${sz.length ? `<p class="small" style="margin:8px 0 0">${sz.map((a) => objet(a.saisie)).join(' · ')}</p>` : ''}</details>`;
}

/** Une action du joueur, horodatée à la minute du central. */
function agir(x) {
  const c = contexte();
  const act = { ...x, t: c.m };
  c.mem.actions = [...(c.mem.actions || []), act];
  sauver(c.mem);
  // Copie horodatée par le serveur : c'est elle qui compte au calcul de 20 h (en démo, le document joueur suffit).
  if (S.backend && S.backend.saveCentralAction) S.backend.saveCentralAction(S.user.uid, c.st.season, c.st.turn, act).catch((e) => console.warn('Action du central non notée :', e.message));
}

let minuterie = null;
/** Branche les touchers du central (après chaque affichage) et le rafraîchissement toutes les 20 s. */
export function monterCentral(rerender) {
  const m = document.querySelector('main.carte-v3 .cx-tete');
  const main = m && m.closest('main');
  if (!main) { clearInterval(minuterie); minuterie = null; return; }
  if (!minuterie) minuterie = setInterval(() => { if (document.querySelector('main.carte-v3 .cx-tete') && !document.querySelector('.feuille, .aide-wrap, .mj-wrap')) rerender(); else if (!document.querySelector('main.carte-v3 .cx-tete')) { clearInterval(minuterie); minuterie = null; } }, 20000);
  if (main.dataset.cxMonte) return;
  main.dataset.cxMonte = '1';
  main.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cxposteq],[data-cxfouille],[data-cx],[data-cxe],[data-cxq],[data-cxenv],[data-cxrens],[data-cxposte],[data-cxpause],[data-cxfermer],[data-cxtemps],[data-action="quartier"]');
    if (!t) return;
    const d = t.dataset;
    // En train de poser une équipe : le quartier touché la reçoit.
    if (S.cxPoste && (d.action === 'quartier' || d.cxq)) { e.preventDefault(); e.stopPropagation(); agir({ k: 'poste', e: S.cxPoste, q: Number(d.c ?? d.cxq) }); S.cxPoste = null; S.cxEq = null; rerender(); return; }
    if (d.action === 'quartier') { S.cxSel = null; S.cxEq = null; return; } // la fiche du quartier (patrouilles du soir)
    e.preventDefault(); e.stopPropagation();
    if (d.cx) { S.cxSel = S.cxSel === d.cx ? null : d.cx; S.cxEq = null; S.cxPoste = null; }
    else if (d.cxe) { S.cxEq = S.cxEq === d.cxe ? null : d.cxe; S.cxSel = null; S.cxPoste = null; }
    else if (d.cxq) { S.quartierSel = d.cxq; S.cxSel = null; S.cxEq = null; }
    else if (d.cxenv) { agir({ k: 'envoi', a: S.cxSel, e: d.cxenv }); }
    else if (d.cxrens) agir({ k: 'rens', a: d.cxrens });
    else if (d.cxfouille) agir({ k: 'fouille', a: d.cxfouille });
    else if (d.cxposteq) { const [eq, q] = d.cxposteq.split(':'); agir({ k: 'poste', e: eq, q: Number(q) }); }
    else if (d.cxposte) S.cxPoste = S.cxPoste === d.cxposte ? null : d.cxposte;
    else if (d.cxpause) { agir({ k: 'pause', e: d.cxpause }); S.cxEq = null; }
    else if (d.cxfermer) { S.cxSel = null; S.cxEq = null; S.cxPoste = null; }
    else if (d.cxtemps) S.cxDecalage = (S.cxDecalage || 0) + Number(d.cxtemps);
    rerender();
    const p = document.getElementById('cx-panneau');
    if (p && (d.cx || d.cxe) && p.getBoundingClientRect().top > innerHeight - 160) p.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, true);
}

/** Pastille du calque : ce qui attend maintenant. */
export function aFaireCentral() {
  try { const c = contexte(); const s = simuler(c.jour, c.equipes, c.mem.actions, c.m, c); return s.appels.filter((a) => !a.statut && !a.eq && a.t <= c.m).length; } catch (e) { return 0; }
}

const STYLE = `<style>
.cx-tete{display:flex;justify-content:space-between;align-items:center;gap:8px}.cx-tete > span:first-child{display:flex;flex-direction:column}.cx-tete b{font-size:17px}
.cx-demo{display:flex;gap:4px}.cx-demo button{appearance:none;border:1px dashed rgba(255,178,63,.5);background:#1C2442;color:#FFB23F;border-radius:10px;padding:8px 10px;font:700 12.5px var(--body,sans-serif);cursor:pointer}
.cx-test{margin:0;font-size:12.5px;color:#C3C9DE;padding:6px 10px;border-radius:10px;border:1px dashed #29345A}
.cx-coach{margin:0;padding:8px 10px;border-radius:10px;background:rgba(255,178,63,.13);border:1px solid rgba(255,178,63,.3);font-size:13.5px}
.cx-todos{display:flex;flex-direction:column;gap:5px}
.cx-todo{appearance:none;text-align:left;display:flex;flex-direction:column;gap:1px;padding:8px 10px;min-height:46px;border-radius:11px;border:1px solid #29345A;border-left:4px solid #FF6E6A;background:#141B33;color:#EDF0FA;font:inherit;cursor:pointer}
.cx-todo.rapide{flex-direction:row;align-items:center;justify-content:space-between;gap:8px;cursor:default}.cx-todo.rapide > span{display:flex;flex-direction:column;min-width:0}.cx-go{appearance:none;flex:none;border:0;border-radius:10px;background:#FFB23F;color:#241400;font:700 13px var(--body,sans-serif);padding:10px 12px;min-height:40px;cursor:pointer}
.cx-todo.a{border-left-color:#FFB23F}.cx-todo.b{border-left-color:#63B0FF}.cx-todo b{font-size:14px}.cx-todo span{font-size:12px;color:#96A0BF}
.cx-carte svg{max-height:44vh}
.cx-pulse{animation:cxp 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes cxp{50%{opacity:.2}}
@media (prefers-reduced-motion: reduce){.cx-pulse{animation:none}}
.cx-panneau{display:flex;flex-direction:column;gap:7px;padding:10px;border-radius:14px;background:#141B33;border:1px solid #FFB23F}
.cx-appel{display:flex;justify-content:space-between;gap:8px}.cx-appel > span{display:flex;flex-direction:column}.cx-appel b{font-size:15px}
.cx-eqs{display:flex;flex-direction:column;gap:5px}
.cx-eq{appearance:none;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:48px;padding:6px 8px;border-radius:11px;border:1px solid #29345A;background:#1C2442;color:#EDF0FA;font:inherit;text-align:left;cursor:pointer}
.cx-eq:disabled{opacity:.45;cursor:default}
.cx-av{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:800 10.5px var(--body,sans-serif);flex:none}
.cx-lb{min-width:0}.cx-lb b{display:block;font-size:13.5px}.cx-lb span{display:block;font-size:11.5px;color:#96A0BF}
.cx-res{font:700 11.5px var(--body,sans-serif);padding:2px 7px;border-radius:999px;border:1.5px dashed currentColor;white-space:nowrap}.cx-res.plein{border-style:solid}.cx-res.v{color:#3DD39A}.cx-res.a{color:#FFB23F}.cx-res.r{color:#FF6E6A}
.cx-fermer{appearance:none;align-self:flex-end;border:0;background:none;color:#9DCBFF;font:600 13px var(--body,sans-serif);padding:6px;cursor:pointer}
.cx-bande{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}
.cx-chip{appearance:none;flex:none;display:flex;align-items:center;gap:6px;min-height:46px;padding:5px 9px 5px 5px;border-radius:12px;border:1px solid #29345A;background:#141B33;color:#EDF0FA;font:inherit;text-align:left;cursor:pointer;position:relative}
.cx-chip.sel{border-color:#FFB23F}.cx-chip > span:last-of-type{display:flex;flex-direction:column}.cx-chip b{font-size:12px}.cx-chip span span{font-size:11px;color:#96A0BF;white-space:nowrap}
.cx-chip.route b{color:#9DCBFF}.cx-chip.surplace b{color:#FFC970}.cx-chip.pause b{color:#96A0BF}.cx-chip i{position:absolute;top:2px;right:5px;color:#FF9A3C;font-style:normal;font-size:10px}
.cx-det{border-radius:14px;background:#141B33;border:1px solid #29345A;padding:10px 12px}.cx-det summary{cursor:pointer;display:flex;flex-direction:column;min-height:36px;justify-content:center}
.cx-journal{display:flex;flex-direction:column;gap:6px;margin-top:8px}.cx-jl{display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:8px;align-items:center;font-size:13px}
.cx-regles p{font-size:13px;color:#C3C9DE;margin:8px 0 0}
.cx-todo.v{border-left-color:#3DD39A}
.cx-h{margin:12px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#96A0BF}
.cx-album{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px}
.cx-obj{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1px;padding:7px 4px;border-radius:11px;background:#1C2442;border:1px solid #29345A;min-width:0}
.cx-obj.rare{border-color:#FFB23F;background:linear-gradient(#2A2238,#1C2442)}.cx-obj.vide{opacity:.45;border-style:dashed}
.cx-obj b{font-size:11.5px;line-height:1.2}.cx-obj span:last-child{font-size:10.5px;color:#96A0BF}.cx-ico{font-size:22px;line-height:1.2}
.cx-jauge{position:relative;display:flex;height:10px;border-radius:99px;background:#1C2442;border:1px solid #29345A;overflow:hidden}.cx-jauge i{display:block;height:100%;background:#3DD39A}.cx-jauge i.auj{background:repeating-linear-gradient(45deg,#3DD39A 0 4px,#1E6B4E 4px 8px)}
.cx-types{display:flex;flex-direction:column;gap:3px}.cx-typ{display:grid;grid-template-columns:16px minmax(0,1fr) auto;gap:6px;font-size:12.5px;color:#96A0BF}.cx-typ.ok{color:#EDF0FA}.cx-typ.ok span:first-child{color:#3DD39A}
.cx-class{display:flex;flex-direction:column;gap:3px}.cx-cl{display:grid;grid-template-columns:18px minmax(0,1fr) auto auto;gap:8px;align-items:center;font-size:13px;padding:4px 6px;border-radius:8px}.cx-cl.moi{background:rgba(255,178,63,.13)}
</style>`;
