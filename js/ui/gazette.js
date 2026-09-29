// La Gazette du Delta, le classement, l'espace maître du jeu.
import { S, esc, icon, tabbar, myZone, zoneName, gradeInfo, fmt1, classementLive } from './common.js';
import { GRADES } from '../engine/constants.js';
import { insigne } from './blasons.js';
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
    <article class="paper">
      <header class="mast"><h1>La Gazette du Delta</h1>
        <div class="meta"><span>Tour ${g.turn} · ${g.date ? `${formatDateBe(g.date)} · ${formatHeureBe(g.date)}` : ''}</span><span>Saison ${g.season}</span></div>
        ${g.toursSansFaillite !== undefined ? `<div class="chantier">District Delta : <strong>${g.toursSansFaillite}</strong> tour${g.toursSansFaillite > 1 ? 's' : ''} sans faillite</div>` : ''}</header>
      ${g.finSaison ? `<section class="box" style="background:#1D1A15;color:#F4EFE3"><span class="k" style="color:#F2B544">Fin de la saison ${g.finSaison.season}</span>
        ${g.finSaison.titres.map((t) => { const z = S.state.zones[t.uid]; return `<p style="color:#F4EFE3">${icon('trophy', 13)} <strong>${esc(t.titre)}</strong> : ${z ? zoneName(z) : ''}</p>`; }).join('')}
        <p style="color:#C9B68F">Toutes les zones repartent de zéro pour la saison ${g.finSaison.saisonSuivante}. Grades et titres sont conservés.</p></section>` : ''}
      <section class="col" style="gap:4px"><span class="k">${esc(g.une.kicker)}</span><h2>${esc(g.une.titre)}</h2>${g.une.texte ? `<p>${esc(g.une.texte)}</p>` : ''}</section>
      ${g.breves && g.breves.length ? `<div class="rule"></div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${g.breves.slice(0, 4).map((b) => `<section class="col" style="gap:3px"><span class="k">${esc(b.kicker)}</span><h3>${esc(b.titre)}</h3>${b.texte ? `<p style="font-size:12px">${esc(b.texte)}</p>` : ''}</section>`).join('')}</div>` : ''}
      ${enqueteGazette(g)}
      ${rapport && rapport.length ? `<div class="rule"></div><section class="col" style="gap:4px"><span class="k">Ton rapport</span>${rapport.map((l) => `<p style="font-size:12.5px">• ${esc(l)}</p>`).join('')}</section>` : ''}
      <section class="box" aria-label="Classement"><div class="rank tiny" style="font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px"><span>Classement</span><span>Moyenne · jour</span></div>
        ${g.classement.slice(0, 8).map((c, k) => `<div class="rank" ${c.uid === me.uid ? 'style="font-weight:700"' : ''}><span>${c.classe ? `<strong>${k + 1}.</strong>` : '<span style="color:var(--ink3)">–</span>'} ZP ${esc(c.code)} ${esc(c.nom)} ${S.state.zones[c.uid] ? insigne(S.state.zones[c.uid].ps) : ''}</span><span class="mono">${fmt1(c.moyenne)} <span style="color:var(--ink3)">· ${fmt1(c.ipz)}</span></span></div>`).join('')}
        <p style="font-size:11px;color:var(--ink3)">Classé à partir de 5 tours joués.</p></section>
    </article>
  </main>${tabbar('hp')}`;
}

function enqueteGazette(g) {
  const e = g.enquete, f = g.fipa || [];
  if (!e && !f.length) return '';
  const l = [];
  if (e) {
    if (e.decouverte) l.push(`<p><strong>${esc(e.titre)}</strong> : ${esc(e.decouverte.suspect)} démasqué au jour ${e.jour} par ${esc(e.decouverte.zones.join(' et '))} (${e.decouverte.pts} pts). La traque commence.</p>`);
    for (const a of e.arrestations || []) l.push(`<p><strong>Arrestation</strong> : ${esc(a.suspect)}, à ${esc(a.planque)}, par ${esc(a.zones.join(' et '))}.</p>`);
    for (const a of e.fuites || []) l.push(`<p><strong>Fuite</strong> : ${esc(a.suspect)} se cachait à ${esc(a.planque)}.</p>`);
    if (e.classee && e.solution) l.push(`<p><strong>${esc(e.titre)}</strong> classée sans suite. La solution : ${esc(e.solution.suspect)}, planque « ${esc(e.solution.planque)} ».</p>`);
    if (!e.decouverte && !e.classee) l.push(`<p><strong>${esc(e.titre)}</strong> : jour ${e.jour}, toujours pas d’auteur identifié.</p>`);
    if (e.rebond) l.push(`<p><strong>${esc(e.rebond.titre)}</strong>. ${esc(e.rebond.texte)}</p>`);
    if (e.recit) l.push(`<p><em>Le fin mot de l’affaire : ${esc(e.recit)}</em></p>`);
    if (e.nouvelle) l.push(`<p>Nouvelle affaire ouverte : <strong>${esc(e.nouvelle)}</strong>.</p>`);
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
  for (const r of res) {
    if (!S.state.zones[r.uid] || (r.statut !== 'ok' && r.statut !== 'rate')) continue;
    const x = (par[r.uid] ||= { ok: 0, n: 0, saison: 0, saisonN: 0 });
    x.n++; if (r.statut === 'ok') x.ok++;
    if (r.season === S.state.season) { x.saisonN++; if (r.statut === 'ok') x.saison++; }
  }
  const lignes = Object.entries(par).map(([uid, x]) => ({ z: S.state.zones[uid], ...x, pct: x.n ? (100 * x.ok) / x.n : 0, classe: x.n >= MIN_ENIGMES }))
    .sort((a, b) => (b.classe - a.classe) || (b.pct - a.pct) || (b.ok - a.ok));
  let rang = 0;
  return `<section class="card"><h2 class="card-title">Esprit vif · énigmes du jour</h2>
    ${lignes.length ? `<table class="rank"><thead><tr><th>#</th><th>Zone</th><th class="num">Réussies</th><th class="num">Réussite</th></tr></thead><tbody>
      ${lignes.map((l) => `<tr class="${l.z.uid === me.uid ? 'me' : ''}"><td>${l.classe ? ++rang : '–'}</td><td>${zoneName(l.z)}${S.players && S.players[l.z.uid] && S.players[l.z.uid].pseudo ? `<br><span class="tiny muted">${esc(S.players[l.z.uid].pseudo)}</span>` : ''}</td><td class="num">${l.ok}/${l.n}</td><td class="num"><strong>${Math.round(l.pct)} %</strong>${l.saisonN && l.saisonN !== l.n ? `<br><span class="tiny muted">saison : ${Math.round((100 * l.saison) / l.saisonN)} %</span>` : ''}</td></tr>`).join('')}
    </tbody></table>` : '<p class="small muted" style="margin:0">Personne n’a encore répondu à une énigme.</p>'}
    <p class="small muted" style="margin:0">Toutes les énigmes répondues depuis le début de la partie, y compris aujourd’hui. Classé à partir de ${MIN_ENIGMES} réponses ; les énigmes laissées sans réponse ne comptent pas.</p></section>`;
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
      ${rows.map((r, i) => `<tr class="${r.z.uid === me.uid ? 'me' : ''}"><td>${r.classe ? i + 1 : '–'}</td><td><span class="bullet" style="display:inline-block;background:${esc(r.z.couleur)};margin-right:6px"></span>${zoneName(r.z)}${S.players && S.players[r.z.uid] && S.players[r.z.uid].pseudo ? `<br><span class="tiny muted">${esc(S.players[r.z.uid].pseudo)}</span>` : ''}</td><td class="num">${r.z.toursJoues}</td><td class="num">${fmt1(r.moyenne)}</td></tr>`).join('')}
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
      <p class="small muted" style="margin:0">${n ? `Encore ${n.ps - me.ps} PS pour devenir ${n.nom}.` : 'Grade maximum atteint.'} Ordres +10, énigme réussie +5, découverte +15, arrestation +10, FIPA +10, indice partagé +5. Maximum 40 PS par jour.</p>
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

export function renderAdmin() {
  const st = S.state;
  const zones = Object.values(st.zones);
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <header class="col" style="gap:3px"><span class="kicker">Espace maître du jeu</span><h1 class="big">Administration</h1>
      <p class="sub">Mode ${S.backend.mode === 'demo' ? 'démo (sur cet appareil)' : 'en ligne (Firebase)'} · saison ${st.season}, tour ${st.turn} · prochaine résolution ${formatDateBe(st.nextDeadline)} à ${formatHeureBe(st.nextDeadline)}</p></header>
    ${S.partie ? `<section class="card amber"><h2 class="card-title">Inviter des collègues</h2>
      <p class="small" style="margin:0;color:var(--amber-soft)">Partie « ${esc(S.partie.nom)} » · code d’invitation <strong class="mono" style="color:var(--text);font-size:16px;letter-spacing:2px">${esc(S.partie.code)}</strong></p>
      <p class="small" style="margin:0">Message à copier : « Rejoins ma partie de Ma ZP : ouvre ${esc(location.origin + location.pathname)}, connecte-toi, puis Mes parties → Rejoindre, avec le code ${esc(S.partie.code)}. »</p></section>` : ''}
    ${S.backend.isSuperAdmin && S.backend.isSuperAdmin(S.user) && S.backend.mode !== 'demo' ? `<section class="card"><h2 class="card-title">Toutes les parties</h2>
      <p class="small muted" style="margin:0">Tu es super-administrateur : tu peux ouvrir n’importe quelle partie pour aider son maître du jeu.</p>
      <button class="btn small" data-action="admin-all-parties">Afficher la liste</button>
      ${(S.allParties || []).map((p) => `<div class="between"><span class="small">${esc(p.nom)} · <span class="mono">${esc(p.code)}</span> · ${esc(p.ownerEmail || '')}</span><button class="btn small" data-action="party-open" data-id="${esc(p.id)}">Ouvrir</button></div>`).join('')}</section>` : ''}
    <section class="card"><h2 class="card-title">Résolution</h2>
      <p class="small muted" style="margin:0">Force la résolution du tour en cours maintenant (utile pour tester). Les joueurs ne pourront plus modifier leurs ordres de ce tour.</p>
      <button class="btn block" data-action="admin-force">Résoudre le tour maintenant</button></section>
    <section class="card"><h2 class="card-title">Joueurs (${zones.length})</h2>
      ${zones.map((z) => `<div class="between"><span class="small">${zoneName(z)} <span class="tiny muted">· ${z.toursJoues} tours joués${z.toursSansOrdres ? ` · ${z.toursSansOrdres} sans ordres` : ''}</span></span>
        ${z.uid !== S.user.uid ? `<button class="btn small danger" data-action="admin-remove" data-uid="${esc(z.uid)}">Retirer</button>` : ''}</div>`).join('')}
    </section>
    <section class="card"><h2 class="card-title">Sauvegarde</h2>
      <p class="small muted" style="margin:0">Télécharge une copie de la partie (zones, profils) avant une mise à jour importante. Tu pourras la restaurer si besoin.</p>
      <div class="row"><button class="btn grow" data-action="admin-export">Télécharger</button>
        <label class="btn grow" for="import-file" style="cursor:pointer">Restaurer<input id="import-file" type="file" accept="application/json,.json" class="sr"></label></div></section>
    <section class="card red"><h2 class="card-title">Zone dangereuse</h2>
      <p class="small" style="margin:0;color:var(--text2)">Recommencer la partie efface toutes les zones, la progression et les grades. Chaque joueur retrouve une zone neuve à sa prochaine connexion.</p>
      <button class="btn danger block" data-action="admin-reset">Recommencer la partie</button></section>
  </main>${tabbar('hp')}`;
}
