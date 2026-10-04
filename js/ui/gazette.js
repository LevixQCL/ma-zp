import { noteCourte } from './nouveautes.js';
import { partageHtml } from './invitation.js';
// La Gazette du Delta, le classement, l'espace maître du jeu.
import { S, esc, icon, tabbar, myZone, zoneName, gradeInfo, fmt1, classementLive } from './common.js';
import { GRADES, LOTS, ENCHERE, PS, SEASON_LENGTH } from '../engine/constants.js';
import { insigne } from './blasons.js';
import { regrouperHonneur } from '../engine/honneur.js';
import { apercuDirecteur, REGLAGES, DISTRICT } from '../engine/directeur.js';
import { affaire, texteMisePrix, rampeDisponible } from '../engine/enquete.js';
import { formatDateBe, formatHeureBe } from '../engine/time.js';

export function renderGazette() {
  const list = S.gazettes;
  const me = myZone();
  if (!list.length) {
    return `<main class="screen"><a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
      <div class="paper"><div class="mast"><h1>La Gazette du Delta</h1></div><p>Le premier numéro paraîtra ce soir à 20:00. Passe tes ordres d’ici là !</p></div></main>${tabbar('hp')}`;
  }
  const i = Math.min(S.gazetteIndex, list.length - 1);
  const g = list[i];
  const sansFaillite = null;
  const rapport = g.rapports && g.rapports[me.uid];
  return `<main class="screen">
    <div class="between"><a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
      <div class="row" style="gap:4px">
        <button class="iconbtn" data-action="gazette-nav" data-d="1" ${i >= list.length - 1 ? 'disabled' : ''} aria-label="Numéro précédent">${icon('back', 18)}</button>
        <span class="tiny muted mono">n° ${g.turn} · S${g.season}</span>
        <button class="iconbtn" data-action="gazette-nav" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Numéro suivant">${icon('chevron', 18)}</button>
      </div></div>
    <article class="paper journal">
      <header class="mast">
        <div class="meta"><span>Édition du soir · n° ${g.turn}</span><span>Saison ${g.season}</span></div>
        <h1>La Gazette du Delta</h1>
        <div class="devise">Le quotidien du district · ${g.date ? `${formatDateBe(g.date)}, ${formatHeureBe(g.date)}` : `tour ${g.turn}`}</div>
        ${g.toursSansFaillite !== undefined ? `<div class="chantier">District Delta : <strong>${g.toursSansFaillite}</strong> tour${g.toursSansFaillite > 1 ? 's' : ''} sans faillite</div>` : ''}
        ${g.prochainLot && LOTS[g.prochainLot.lot] ? `<div class="devise">Aujourd’hui à la salle des ventes : <strong>${esc(LOTS[g.prochainLot.lot].nom)}</strong>, mise à prix ${g.prochainLot.prixMin} k€${LOTS[g.prochainLot.lot].reserve ? ` (réputation ${ENCHERE.repReserve}+)` : ''}</div>` : ''}</header>
      ${g.finSaison ? `<section class="box sombre"><span class="k" style="color:#FFB23F">Fin de la saison ${g.finSaison.season}</span>
        ${g.finSaison.titres.map((t) => { const z = S.state.zones[t.uid]; return `<p style="color:#F4EFE3">${icon('trophy', 13)} <strong>${esc(t.titre)}</strong> : ${z ? zoneName(z) : ''}</p>`; }).join('')}
        <p style="color:#C9B68F">La saison ${g.finSaison.saisonSuivante} commence : budgets et effectifs repartent de zéro, bâtiments et formations sont conservés avec un niveau de moins.</p></section>` : ''}
      <section class="une"><span class="k">${esc(g.une.kicker)}</span><h2>${esc(g.une.titre)}</h2>${g.une.texte ? `<p class="lettrine${/^[A-Za-zÀ-ÿ]/.test(g.une.texte) ? '' : ' sans'}">${esc(g.une.texte)}</p>` : ''}</section>
      ${g.breves && g.breves.length ? `<div class="rule double"></div>
        <div class="colonnes">${g.breves.slice(0, 6).map((b) => `<section class="breve"><span class="k">${esc(b.kicker)}</span><h3>${esc(b.titre)}</h3>${b.texte ? `<p>${esc(b.texte)}</p>` : ''}</section>`).join('')}</div>` : ''}
      ${(g.tribunal || []).length ? `<section class="tribunal"><span class="k">Au tribunal</span>${g.tribunal.map((p) => `<div class="proces"><h3>${esc(p.suspect)}</h3><p class="peine">${esc(p.peine)}</p>
        <p>Affaire « ${esc(p.titre)} ».${p.temoins.length ? ` Cités à la barre : les enquêteurs de ${esc(p.temoins.join(', '))}.` : ''} Interpellation par ${esc(p.arrestation.join(' et '))}.</p></div>`).join('')}</section>` : ''}
      ${enqueteGazette(g)}
      ${(g.honneur || []).length ? `<div class="rule"></div><section class="col" style="gap:5px"><span class="k">Tableau d’honneur</span>${regrouperHonneur(g.honneur).map((h) => `<p><span class="etoile">★</span> <strong>${esc(h.titre)}</strong>${h.texte ? `. ${esc(h.texte)}` : ''}</p>`).join('')}</section>` : ''}
      ${(g.echos || []).length || (g.betisier || []).length ? `<div class="rule double"></div><div class="colonnes bas">
        ${(g.echos || []).length ? `<section class="echos"><span class="k">Échos du district</span>${g.echos.map((l) => `<p>${esc(l)}</p>`).join('')}</section>` : ''}
        ${(g.betisier || []).length ? `<section class="betisier"><span class="k">Le bêtisier</span>${g.betisier.map((b) => `<p><strong>${esc(b.titre)}</strong>${b.texte ? ` ${esc(b.texte)}` : ''}</p>`).join('')}</section>` : ''}
      </div>` : ''}
      ${rapport && rapport.length ? `<details class="rapport-g"><summary><span class="k">Ton rapport de la nuit</span></summary>${rapport.map((l) => `<p style="font-size:12.5px">• ${esc(l)}</p>`).join('')}</details>` : ''}
      <section class="box" aria-label="Classement"><div class="rank tiny" style="font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px"><span>Classement</span><span>Moyenne · jour</span></div>
        ${g.classement.slice(0, 8).map((c, k) => `<div class="rank" ${c.uid === me.uid ? 'style="font-weight:700"' : ''}><span>${c.classe ? `<strong>${k + 1}.</strong>` : '<span style="color:var(--ink3)">–</span>'} ZP ${esc(c.code)} ${esc(c.nom)} ${S.state.zones[c.uid] ? insigne(S.state.zones[c.uid].ps) : ''}</span><span class="mono">${fmt1(c.moyenne)} <span style="color:var(--ink3)">· ${fmt1(c.ipz)}</span></span></div>`).join('')}
        <p style="font-size:11px;color:var(--ink3)">Classé à partir de 5 tours joués.</p></section>
      <p class="colophon">La rédaction salue ses lecteurs les plus attentifs.</p>
    </article>
  </main>${tabbar('hp')}`;
}

function enqueteGazette(g) {
  const e = g.enquete, f = g.fipa || [];
  if (!e && !f.length) return '';
  const l = [];
  if (e) {
    if (e.decouverte) l.push(`<p><strong>${esc(e.titre)}</strong> : ${esc(e.decouverte.suspect)} démasqué au jour ${e.jour} par ${esc(e.decouverte.zones.join(' et '))} (${e.decouverte.pts} pts). La traque commence.</p>`);
    for (const a of e.arrestations || []) l.push(a.planque ? `<p><strong>Arrestation</strong> : ${esc(a.suspect)}, à ${esc(a.planque)}, par ${esc(a.zones.join(' et '))}.</p>` : `<p><strong>Aveux</strong> : ${esc(a.suspect)}, confronté·e par ${esc(a.zones.join(' et '))}.</p>`);
    for (const a of e.fuites || []) l.push(`<p><strong>Fuite</strong> : ${esc(a.suspect)} se cachait à ${esc(a.planque)}.</p>`);
    if (e.classee && e.solution) l.push(`<p><strong>${esc(e.titre)}</strong> classée sans suite. La solution : ${esc(e.solution.suspect)}${e.solution.planque ? `, planque « ${esc(e.solution.planque)} »` : ''}.</p>`);
    if (!e.decouverte && !e.classee && !e.pause) l.push(`<p><strong>${esc(e.titre)}</strong> : jour ${e.jour}, toujours pas d’auteur identifié.</p>`);
    if (e.rebond) l.push(`<p><strong>${esc(e.rebond.titre)}</strong>. ${esc(e.rebond.texte)}</p>`);
    // Tant que la traque court, la planque ne figure pas dans le fin mot (anciens numéros compris).
    const traqueEnCours = (S.state.traques || []).some((t) => t.n === e.n && !t.fini);
    let fem = false;
    try { const af = affaire(S.state, e.n); fem = !!(af && af.suspects[af.coupable] && af.suspects[af.coupable].f); } catch (x) { /* affaire introuvable : masculin par défaut */ }
    const recit = e.recit && traqueEnCours ? e.recit.replace(/ [^.]*a caché le butin dans la planque « [^»]*» \([^)]*\)\./, ` Où ${fem ? 'elle' : 'il'} se cache reste à trouver : c’est l’enjeu de la traque.`).replace(/ Où il ou elle se cache/, ` Où ${fem ? 'elle' : 'il'} se cache`) : e.recit;
    if (recit) {
      // Anciens récits : les innocents sur une ligne ; nouveaux : un paragraphe par personne.
      const [tete, ...autres] = String(recit).split('\n');
      l.push(`<p><em>Le fin mot de l’affaire : ${esc(tete)}</em></p>${autres.length ? `<p class="k" style="margin-top:4px">Les autres suspects</p>${autres.map((x) => `<p><em>${esc(x)}</em></p>`).join('')}` : ''}`);
    }
    if (e.nouvelle) l.push(`<p>Nouvelle affaire ouverte : <strong>${esc(e.nouvelle)}</strong>. ${esc(texteMisePrix())}</p>`);
  }
  for (const x of f) {
    const txt = !x.mult ? 'dispositif raté' : x.choixA === 'partager' && x.choixB === 'partager' ? 'succès partagé' : x.choixA === x.choixB ? 'chacun revendique le mérite' : `${x.choixA === 'revendiquer' ? x.a : x.b} revendique seul le succès`;
    l.push(`<p><strong>FIPA ${esc(x.titre)}</strong> (${esc(x.a)} et ${esc(x.b)}) : ${esc(txt)}.</p>`);
  }
  return `<div class="rule"></div><section class="col" style="gap:4px"><span class="k">Enquête et FIPA</span>${l.join('')}</section>`;
}

// Esprit vif : taux de réussite aux énigmes du jour, depuis le début de la partie.
const MIN_ENIGMES = 6;
function classementEnigmes(me) {
  const res = S.questStats;
  if (!res) return `<section class="card"><h2 class="card-title">Esprit vif · énigmes du jour</h2><p class="small muted" style="margin:0">${S.questStatsErreur ? 'Classement indisponible pour le moment.' : 'Chargement…'}</p></section>`;
  const par = {};
  const noirs = {};
  for (const r of res) {
    if (!S.state.zones[r.uid] || (r.statut !== 'ok' && r.statut !== 'rate')) continue;
    if (r.slot === 3) { const y = (noirs[r.uid] ||= { ok: 0, n: 0 }); y.n++; if (r.statut === 'ok') y.ok++; continue; }
    const x = (par[r.uid] ||= { ok: 0, n: 0, saison: 0, saisonN: 0 });
    x.n++; if (r.statut === 'ok') x.ok++;
    if (r.season === S.state.season) { x.saisonN++; if (r.statut === 'ok') x.saison++; }
  }
  const lignes = Object.entries(par).map(([uid, x]) => ({ z: S.state.zones[uid], ...x, pct: x.n ? (100 * x.ok) / x.n : 0, classe: x.n >= MIN_ENIGMES }))
    .sort((a, b) => (b.classe - a.classe) || (b.pct - a.pct) || (b.ok - a.ok));
  let rang = 0;
  return `<section class="card"><h2 class="card-title">Esprit vif · énigmes du jour</h2>
    ${lignes.length ? `<table class="rank"><thead><tr><th>#</th><th>Zone</th><th class="num">Réussies</th><th class="num">Réussite</th><th class="num" title="Dossiers noirs résolus">Noirs</th></tr></thead><tbody>
      ${lignes.map((l) => `<tr class="${l.z.uid === me.uid ? 'me' : ''}"><td>${l.classe ? ++rang : '–'}</td><td>${zoneName(l.z)}${S.players && S.players[l.z.uid] && S.players[l.z.uid].pseudo ? `<br><span class="tiny muted">${esc(S.players[l.z.uid].pseudo)}</span>` : ''}</td><td class="num">${l.ok}/${l.n}</td><td class="num"><strong>${Math.round(l.pct)} %</strong>${l.saisonN && l.saisonN !== l.n ? `<br><span class="tiny muted">saison : ${Math.round((100 * l.saison) / l.saisonN)} %</span>` : ''}</td><td class="num">${noirs[l.z.uid] ? `${noirs[l.z.uid].ok}/${noirs[l.z.uid].n}` : '–'}</td></tr>`).join('')}
    </tbody></table>` : '<p class="small muted" style="margin:0">Personne n’a encore répondu à une énigme.</p>'}
    <p class="small muted" style="margin:0">Toutes les énigmes répondues depuis le début de la partie, y compris aujourd’hui. Classé à partir de ${MIN_ENIGMES} réponses ; les énigmes laissées sans réponse ne comptent pas. « Noirs » : dossiers noirs résolus (hors pourcentage). Le plus fort de la saison reçoit le titre « Cerveau du district ».</p></section>`;
}

const ONGLETS_CLASSEMENT = [['ipz', 'IPZ'], ['limier', 'Enquête'], ['enigmes', 'Énigmes'], ['grade', 'Grades'], ['palmares', 'Palmarès']];

export function renderClassement() {
  const me = myZone();
  const { g, n, pct } = gradeInfo(me.ps);
  const onglets = ONGLETS_CLASSEMENT.filter(([k]) => k !== 'palmares' || (S.state.palmares && S.state.palmares.length));
  const tab = onglets.some(([k]) => k === S.classTab) ? S.classTab : 'ipz';
  let corps = '';
  if (tab === 'ipz') {
    const rows = classementLive(S.state);
    corps = `<section class="card"><h2 class="card-title">Performance · IPZ moyen de la saison</h2>
      <p class="small muted" style="margin:0">Moyenne de l’IPZ par tour où tu as validé tes ordres. « – » : moins de 5 tours joués, pas encore classé.</p>
      <table class="rank"><thead><tr><th>#</th><th>Zone</th><th class="num">Tours</th><th class="num">IPZ moy.</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.z.uid === me.uid ? 'me' : ''}"><td>${r.classe ? i + 1 : '–'}</td><td><span class="bullet" style="display:inline-block;background:${esc(r.z.couleur)};margin-right:6px"></span><button type="button" class="linkbtn voir-hp" data-action="voir-hp" data-uid="${esc(r.z.uid)}">${zoneName(r.z)}</button>${S.players && S.players[r.z.uid] && S.players[r.z.uid].pseudo ? `<br><span class="tiny muted">${esc(S.players[r.z.uid].pseudo)}</span>` : ''}</td><td class="num">${r.z.toursJoues}</td><td class="num">${fmt1(r.moyenne)}</td></tr>`).join('')}
      </tbody></table></section>`;
  } else if (tab === 'limier') {
    corps = `<section class="card"><h2 class="card-title">Fin limier · points d’enquête</h2>
      <table class="rank"><thead><tr><th>#</th><th>Zone</th><th class="num">Bilan</th><th class="num">Points</th></tr></thead><tbody>${Object.values(S.state.zones).sort((a, b) => b.stats.limier - a.stats.limier).map((z, i) => `<tr class="${z.uid === me.uid ? 'me' : ''}"><td>${i + 1}</td><td>${zoneName(z)}</td><td class="num">${z.stats.decouvertes} déc. · ${z.stats.arrestations} arr.</td><td class="num">${z.stats.limier}</td></tr>`).join('')}</tbody></table>
      <p class="small muted" style="margin:0">Découverte : 40 à 100 pts selon le jour. Arrestation : 30. Pièce partagée qui a aidé : 25.</p></section>`;
  } else if (tab === 'enigmes') {
    corps = classementEnigmes(me);
  } else if (tab === 'grade') {
    corps = `<section class="card"><div class="between"><h2 class="card-title">Ton grade : ${g.nom}</h2><span class="mono small">${me.ps} PS</span></div>
      <div class="gauge"><div class="bar" role="img" aria-label="Progression ${pct} %"><div style="width:${pct}%;background:var(--amber)"></div></div></div>
      <p class="small muted" style="margin:0">${n ? `Encore ${n.ps - me.ps} PS pour devenir ${n.nom}.` : 'Grade maximum atteint.'} Ordres +10, énigme réussie +5, découverte +15, arrestation +10, FIPA +10, indice partagé +5. Maximum ${PS.plafondJour} PS par jour, plus ${PS.plafondEntraide} PS d’entraide (renfort, indices partagés, FIPA, zone de non-droit…).</p>
      <table class="rank"><tbody>${GRADES.map((gr) => `<tr class="${gr.nom === g.nom ? 'me' : ''}"><td>${gr.nom}</td><td class="num">${gr.ps}</td><td class="small muted">${gr.debloque}</td></tr>`).join('')}</tbody></table>
    </section>`;
  } else {
    corps = `<section class="card"><h2 class="card-title">Palmarès</h2>
      ${S.state.palmares.slice().reverse().map((p) => `<div class="col" style="gap:2px"><span class="small" style="font-weight:700">Saison ${p.season}</span>
        ${p.titres.map((t) => { const z = S.state.zones[t.uid]; return `<span class="small muted">${esc(t.titre)} : ${z ? zoneName(z) : 'zone disparue'}</span>`; }).join('')}</div>`).join('')}</section>`;
  }
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <header class="col" style="gap:3px"><span class="kicker">Saison ${S.state.season} · tour ${S.state.turn} sur 14</span><h1 class="big">Classements</h1></header>
    <div class="segn" role="tablist" aria-label="Classements" style="grid-template-columns:repeat(${onglets.length},minmax(0,1fr))">${onglets.map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-action="class-tab" data-t="${k}">${l}</button>`).join('')}</div>
    ${corps}
  </main>${tabbar('hp')}`;
}

/** « vu il y a 12 min », « vu hier à 21:04 »… */
function vuTexte(t) {
  if (!t) return 'jamais vu depuis la mise à jour';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 6) return 'en ligne';
  if (m < 60) return `vu il y a ${m} min`;
  if (m < 24 * 60) return `vu il y a ${Math.round(m / 60)} h (${formatHeureBe(t)})`;
  return `vu le ${formatDateBe(t)} à ${formatHeureBe(t)}`;
}
const vuClasse = (t) => (!t ? 'muted' : Date.now() - t < 6 * 60000 ? 'ok' : Date.now() - t > 48 * 3600000 ? 'bad' : 'muted');

/** Classement « Roi de l'entraînement » (visible du seul maître du jeu). */
function roiEntrainementHtml(zones) {
  const lignes = zones.map((z) => {
    const p = (S.players || {})[z.uid] || {}, e = p.entrainement || {};
    const enigmes = e.enigmes || 0, reussies = e.reussies || 0, minijeux = e.minijeux || 0;
    return { z, p, enigmes, reussies, minijeux, total: enigmes + minijeux, dernier: e.dernier || 0 };
  }).sort((a, b) => b.total - a.total || b.reussies - a.reussies || b.dernier - a.dernier);
  const actifs = lignes.filter((l) => l.total > 0);
  const ligne = (l, k) => `<div class="between" style="gap:8px">
      <span class="small"><strong style="display:inline-block;min-width:22px">${k === 0 ? '👑' : `${k + 1}.`}</strong>${zoneName(l.z)}${l.p.pseudo ? ` <span class="muted">(${esc(l.p.pseudo)})</span>` : ''}<br>
        <span class="tiny muted">${l.enigmes} énigme${l.enigmes > 1 ? 's' : ''}${l.enigmes ? ` (${l.reussies} réussie${l.reussies > 1 ? 's' : ''})` : ''} · ${l.minijeux} mini-jeu${l.minijeux > 1 ? 'x' : ''}${l.dernier ? ` · dernier le ${formatDateBe(l.dernier)}` : ''}</span></span>
      <span class="pill">${l.total}</span></div>`;
  return `<section class="card"><div class="between"><h2 class="card-title">Roi de l’entraînement</h2><button class="btn small ghost" data-action="admin-vus">Actualiser</button></div>
      <p class="tiny muted" style="margin:0">Énigmes d’entraînement terminées + mini-jeux joués jusqu’au bout en entraînement. Visible par toi seul.</p>
      ${actifs.length ? actifs.map(ligne).join('') : '<p class="small muted" style="margin:0">Personne ne s’est encore entraîné.</p>'}
      ${actifs.length && actifs.length < lignes.length ? `<p class="tiny muted" style="margin:0">Pas encore d’entraînement : ${lignes.filter((l) => !l.total).map((l) => esc(l.p.pseudo || l.z.nom || '')).join(', ')}.</p>` : ''}
    </section>`;
}

/** Le Directeur vu par le maître du jeu : réglages, district, et ce qu'il prépare à chaque zone. */
function directeurAdminHtml(st) {
  const ap = apercuDirecteur(st);
  const choix = (k, liste) => `<div class="row" style="gap:6px;flex-wrap:wrap">${Object.entries(liste).map(([v, x]) => `<button type="button" class="btn small ${ap.reglages[k] === v ? 'primary' : ''}" data-action="dir-reglage" data-k="${k}" data-v="${v}" aria-pressed="${ap.reglages[k] === v}">${esc(x.nom)}</button>`).join('')}</div>`;
  const f = ap.fantome;
  const ev = st.evenement && st.evenement.fantome ? st.evenement : null;
  const actives = Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length;
  return `<section class="card" style="gap:10px"><h2 class="card-title">Le Directeur</h2>
    <p class="small muted" style="margin:0">Le maître du jeu invisible : ciel de chaque zone, feuilletons, dilemmes, événements du district. Tes réglages s’appliquent dès la prochaine nuit, pour tout le monde.</p>
    <span class="small" style="font-weight:600">Intensité (coups durs et mauvaises nouvelles)</span>${choix('intensite', REGLAGES.intensite)}
    <span class="small" style="font-weight:600">Feuilletons et dilemmes</span>${choix('feuilletons', REGLAGES.feuilletons)}
    <span class="small" style="font-weight:600">Événement du district</span>
    <p class="small muted" style="margin:0">${ap.district ? `Prévu : ${esc(ap.district.titre)} au tour ${ap.district.tour}.` : (ap.prochain && ap.prochain <= SEASON_LENGTH ? `Prochain vers le tour ${ap.prochain}.` : 'Plus d’autre événement prévu cette saison.')}${st.dir && st.dir.forcer ? ` Demandé : ${esc(DISTRICT[st.dir.forcer].titre)} (annoncé à la prochaine nuit, le surlendemain).` : ''}</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${Object.entries(DISTRICT).map(([id, e]) => `<button type="button" class="btn small" data-action="dir-forcer" data-id="${id}">${esc(e.titre)}</button>`).join('')}</div>
    ${f ? `<p class="small" style="margin:0"><strong>Ennemi de la saison</strong> : ${esc(f.nom)} · dossier ${f.dossier || 0} pièce${(f.dossier || 0) > 1 ? 's' : ''}${ev ? ` · opération finale au tour ${ev.tour} : environ ${Math.max(3, Math.round(ev.parZone * actives))} agents requis` : ''}${f.fini ? (f.arrete ? ' · arrêté' : ' · en fuite') : ''}</p>` : ''}
    ${ap.coop.length ? `<p class="small" style="margin:0"><strong>Fugitif à la frontière</strong> : ${ap.coop.map((x) => `${esc(x.la)} et ${esc(x.lb)} (tour ${x.tour}${x.e === 'cavale' ? ', dernière chance' : ''})`).join(' · ')}</p>` : ''}
    ${ap.duo ? `<p class="small" style="margin:0"><strong>Défi en duo</strong> : ${esc(zoneName(st.zones[ap.duo.a]))} et ${esc(zoneName(st.zones[ap.duo.b]))} (tour ${ap.duo.tour})</p>` : ''}
    <div class="col" style="gap:6px">${ap.zones.map((x) => `<div class="col" style="gap:2px;padding:8px 10px;border:1px solid var(--line);border-radius:10px">
      <div class="between"><span class="small" style="font-weight:600">${esc(x.label)}</span><span class="pill ciel-pill ciel-p-${x.ciel.id}">${esc(x.ciel.nom)} ${x.jour}/${x.sur}</span></div>
      <span class="tiny muted">${x.absent ? 'absente (épargnée) · ' : ''}forme ${x.forme > 0 ? '+' : ''}${String(x.forme).replace('.', ',')} · énigmes ${x.enigmes > 0 ? '+' : ''}${x.enigmes} · mini-jeux ${x.incidents > 0 ? '+' : ''}${x.incidents}${x.routine >= 2 ? ` · même répartition depuis ${x.routine + 1} j` : ''}</span>
      ${x.feuilleton || x.operation ? `<span class="tiny">${[x.feuilleton, x.operation].filter(Boolean).map(esc).join(' · ')}</span>` : ''}
      ${x.faiblesses.length ? `<span class="tiny" style="color:var(--amber-soft)">Délaissé : ${x.faiblesses.map(esc).join(', ')}</span>` : ''}
    </div>`).join('')}</div>
  </section>`;
}

export function renderAdmin() {
  // (note de mise à jour : voir ui/nouveautes.js)
  const st = S.state;
  const zones = Object.values(st.zones);
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <header class="col" style="gap:3px"><span class="kicker">Espace maître du jeu</span><h1 class="big">Administration</h1>
      <p class="sub">Mode ${S.backend.mode === 'demo' ? 'démo (sur cet appareil)' : 'en ligne (Firebase)'} · saison ${st.season}, tour ${st.turn} · prochaine résolution ${formatDateBe(st.nextDeadline)} à ${formatHeureBe(st.nextDeadline)}</p></header>
    ${S.partie ? `<section class="card amber"><h2 class="card-title">Inviter des collègues</h2>
      <p class="small" style="margin:0;color:var(--amber-soft)">Partie « ${esc(S.partie.nom)} » · code d’invitation <strong class="mono" style="color:var(--text);font-size:16px;letter-spacing:2px">${esc(S.partie.code)}</strong></p>
      <p class="small" style="margin:0">Envoie le lien : ton collègue se connecte et arrive directement dans la partie, sans taper de code.</p>
      ${partageHtml(S.partie)}</section>` : ''}
    ${S.backend.isSuperAdmin && S.backend.isSuperAdmin(S.user) && S.backend.mode !== 'demo' ? `<section class="card"><h2 class="card-title">Toutes les parties</h2>
      <p class="small muted" style="margin:0">Tu es super-administrateur : tu peux ouvrir n’importe quelle partie pour aider son maître du jeu.</p>
      <button class="btn small" data-action="admin-all-parties">Afficher la liste</button>
      ${(S.allParties || []).map((p) => `<div class="between"><span class="small">${esc(p.nom)} · <span class="mono">${esc(p.code)}</span> · ${esc(p.ownerEmail || '')}</span><button class="btn small" data-action="party-open" data-id="${esc(p.id)}">Ouvrir</button></div>`).join('')}</section>` : ''}
    <section class="card"><h2 class="card-title">Note de mise à jour</h2>
      <p class="small muted" style="margin:0">Chaque joueur verra la fenêtre « Nouveautés » à sa prochaine ouverture. Tu peux aussi l’envoyer en message privé à tous les joueurs :</p>
      <p class="small" style="margin:0;padding:10px 12px;border-radius:10px;background:var(--bg);border:1px solid var(--line);line-height:1.45">${esc(noteCourte())}</p>
      <div class="row"><button class="btn small grow" data-action="maj-voir">Voir la note complète</button>
        <button class="btn small primary grow" data-action="maj-envoyer" ${S.majEnvoyee ? 'disabled' : ''}>${S.majEnvoyee ? `Envoyée à ${S.majEnvoyee} joueur${S.majEnvoyee > 1 ? 's' : ''}` : 'Envoyer à tous en privé'}</button></div></section>
    <section class="card"><h2 class="card-title">Enquête</h2>
      ${st.enquetePause ? `<p class="small" style="margin:0">Enquête en pause : l’affaire « ${esc(st.enquetePause.titre)} » a été retirée. La nouvelle affaire s’ouvrira à la prochaine résolution (${esc(formatDateBe(st.nextDeadline))} à 20:00). Les traques continuent.</p>`
        : st.enquete ? `<p class="small muted" style="margin:0">Retire l’affaire en cours (par exemple si elle s’est ouverte en même temps qu’une traque). Les traques continuent, une édition spéciale de la Gazette s’affiche chez tout le monde, et la nouvelle affaire s’ouvre au prochain 20:00.</p>
      <button class="btn block danger" data-action="admin-pause-enquete">Retirer l’affaire n° ${st.enquete.n} jusqu’à demain 20:00</button>` : '<p class="small muted" style="margin:0">Pas d’affaire en cours.</p>'}
      ${rampeDisponible(st) ? `<p class="small muted" style="margin:0">« Le notaire de la Rampe » n’a pas encore été joué dans cette partie. Tu peux l’ouvrir tout de suite : l’affaire en cours est retirée, les traques continuent.</p>
      <button class="btn block primary" data-action="admin-rampe-maintenant">Ouvrir « Le notaire de la Rampe » maintenant</button>` : ''}</section>
    ${directeurAdminHtml(st)}
    <section class="card"><h2 class="card-title">Résolution</h2>
      <p class="small muted" style="margin:0">Force la résolution du tour en cours maintenant (utile pour tester). Les joueurs ne pourront plus modifier leurs ordres de ce tour.</p>
      <button class="btn block" data-action="admin-force">Résoudre le tour maintenant</button></section>
    <section class="card"><div class="between"><h2 class="card-title">Joueurs (${zones.length})</h2><button class="btn small ghost" data-action="admin-vus">Actualiser</button></div>
      ${zones.slice().sort((a, b) => (((S.players || {})[b.uid] || {}).vuLe || 0) - (((S.players || {})[a.uid] || {}).vuLe || 0)).map((z) => { const p = (S.players || {})[z.uid] || {}; return `<div class="between" style="gap:8px"><span class="small">${zoneName(z)}${p.pseudo ? ` <span class="muted">(${esc(p.pseudo)})</span>` : ''}<br><span class="tiny ${vuClasse(p.vuLe)}">${vuTexte(p.vuLe)}</span><span class="tiny muted"> · ${z.toursJoues} tours joués${z.toursSansOrdres ? ` · ${z.toursSansOrdres} sans ordres` : ''}</span></span>
        ${z.uid !== S.user.uid ? `<button class="btn small danger" data-action="admin-remove" data-uid="${esc(z.uid)}">Retirer</button>` : ''}</div>`; }).join('')}
      <p class="tiny muted" style="margin:0">Dernière connexion : mise à jour quand le joueur a le jeu ouvert (au plus toutes les 5 minutes). « Jamais vu » : pas revenu depuis cette mise à jour.</p>
    </section>
    ${roiEntrainementHtml(zones)}
    <section class="card"><h2 class="card-title">Sauvegarde</h2>
      <p class="small muted" style="margin:0">Télécharge une copie de la partie (zones, profils) avant une mise à jour importante. Tu pourras la restaurer si besoin.</p>
      <div class="row"><button class="btn grow" data-action="admin-export">Télécharger</button>
        <label class="btn grow" for="import-file" style="cursor:pointer">Restaurer<input id="import-file" type="file" accept="application/json,.json" class="sr"></label></div></section>
    <section class="card red"><h2 class="card-title">Zone dangereuse</h2>
      <p class="small" style="margin:0;color:var(--text2)">Recommencer la partie efface toutes les zones, la progression et les grades. Chaque joueur retrouve une zone neuve à sa prochaine connexion.</p>
      <button class="btn danger block" data-action="admin-reset">Recommencer la partie</button></section>
  </main>${tabbar('hp')}`;
}
