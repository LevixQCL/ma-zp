// Écran HP (Hôtel de police) : l'accueil.
import { S, esc, icon, fmt1, fmtK, gauge, tabbar, rangDe, gradeInfo, myZone } from './common.js';
import { agentsDisponibles, blessesActifs, enFormation, vehiculesDisponibles } from '../engine/zone.js';
import { formatCountdown } from '../engine/time.js';
import { QUEST_LABELS } from '../quests/quests.js';
import { COULEURS_ZONE } from '../engine/constants.js';
import { situationHtml } from './ordres.js';
import { operationActive } from '../engine/zone.js';
import { fipaCards } from './fipa.js';
import { blasonSvg, BLASONS, insigne } from './blasons.js';
import { GRADES, gradeFor } from '../engine/constants.js';
import { PERIL, DUEL_INDICATEURS } from '../engine/rivalites.js';
import { genererAffaire, dossierDe, pointsDecouverte, ENQ } from '../engine/enquete.js';
import { aideBtn } from './aide.js';

/** Petite flèche d'évolution depuis la veille. */
function delta(v, avant) {
  if (avant === undefined || avant === null) return '';
  const d = Math.round((v - avant) * 10) / 10;
  if (Math.abs(d) < 0.05) return '';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${fmt1(Math.abs(d))}</span>`;
}

function cleNuit(z) { return `mazp-nuit-${S.backend.gameId ? S.backend.gameId() : ''}-${S.state.season}-${S.state.turn}-${z.uid}`; }

/** Carte « Résultat de la nuit », affichée jusqu'à ce que le joueur la ferme. */
function nuitHtml(z) {
  if (!z.hier || !z.rapport || !z.rapport.length || S.nuitVue === cleNuit(z)) return '';
  try { if (localStorage.getItem(cleNuit(z))) return ''; } catch (e) { /* pas de stockage : on l'affiche */ }
  const lignes = [
    ['IPZ', z.ipz, z.hier.ipz], ['Satisfaction', z.satisfaction, z.hier.satisfaction], ['Moral', z.moral, z.hier.moral],
    ['Budget', z.budget, z.hier.budget, ' k€'], ['Réputation', z.reputation, z.hier.reputation],
  ].filter(([, v, a]) => a !== undefined && Math.abs(v - a) >= 0.05);
  const importants = z.rapport.filter((l) => !/^Pas d’ordres/.test(l)).slice(0, 4);
  return `<section class="card" aria-label="Résultat de la nuit" style="border-color:var(--blue-soft)">
    <div class="between"><span class="kicker" style="color:var(--blue-soft)">Résultat de la nuit · tour ${S.state.turn - 1 || ''}</span>
      <button class="btn small ghost" data-action="nuit-ok">OK</button></div>
    ${lignes.length ? `<div class="row" style="gap:6px;flex-wrap:wrap">${lignes.map(([l, v, a, u]) => `<span class="pill">${l} ${fmt1(v)}${u || ''} ${delta(v, a)}</span>`).join('')}</div>` : ''}
    <div class="col" style="gap:4px">${importants.map((l) => `<p class="small" style="margin:0;color:var(--text2)">• ${esc(l)}</p>`).join('')}</div>
    <div class="row"><button class="btn small grow" data-action="toggle-rapport">Rapport complet</button><a class="btn small grow" href="#gazette">La Gazette</a></div>
  </section>`;
}

/** Le joueur a-t-il déjà ouvert les « Premiers pas » du guide ? */
function premiersPasVus() {
  if (S.premiersPasVus) return true;
  try { return !!localStorage.getItem('mazp-premiers-pas-vus'); } catch (e) { return false; }
}

/** Liste de ce qu'il reste à faire avant 20:00. */
function ceSoirHtml(st, z, { ordresOk, faites, reussies, invit }) {
  const d = S.draft || {};
  const nbDem = (d.demarches || []).length;
  const items = [];
  items.push({ ok: ordresOk, href: '#ordres', t: ordresOk ? 'Ordres validés' : S.ordersDirty ? 'Ordres modifiés : à valider' : 'Passer et valider tes ordres', s: ordresOk ? 'modifiables jusqu’à 20:00' : 'sans ordres validés, ce tour ne compte pas pour le classement' });
  if (st.enquete) items.push({ ok: nbDem >= 1 || (d.accusation !== null && d.accusation !== undefined), href: '#enquete', t: `Enquête : ${nbDem} démarche${nbDem > 1 ? 's' : ''} sur 2`, s: (st.traques || []).length ? 'une traque est en cours !' : 'constatations, vérifications, partage, accusation' });
  items.push({ ok: faites >= 3, href: '#quete', t: `Quêtes : ${faites} sur 3`, s: reussies >= 2 ? 'bonus débloqué' : 'bonus dès 2 bonnes réponses' });
  const fipa = (st.fipas || []).filter((f) => (f.demandeur === z.uid && f.etape === 'demande' && f.tourDecision === st.turn) || (f.partenaire === z.uid && f.etape === 'invite' && f.tourReponse === st.turn) || (f.etape === 'accepte' && f.tourJ === st.turn && (f.demandeur === z.uid || f.partenaire === z.uid)));
  if (fipa.length) items.push({ ok: !!(d.fipa || d.fipaReponse || d.fipaChoix), href: '#hp-fipa', t: 'FIPA : une décision t’attend', s: 'voir la carte FIPA ci-dessous' });
  if (st.conseil && st.conseil.tour === st.turn) items.push({ ok: Object.keys(d.votes || {}).length > 0, href: '#diplomatie', t: 'Conseil de police : voter', s: 'une voix par zone, résultat à 20:00' });
  if (invit) items.push({ ok: !!d.duelReponse, href: '#diplomatie', t: 'Répondre au défi en duel', s: 'sans réponse, c’est un refus' });
  const reste = items.filter((i) => !i.ok).length;
  return `<section class="card" aria-label="Ce soir à 20:00" style="gap:8px">
    <div class="between" style="align-items:flex-end"><div class="col" style="gap:2px"><span class="small muted">Résolution dans</span>
      <span class="mono" id="countdown" style="font-size:28px;letter-spacing:1px">${formatCountdown(st.nextDeadline - Date.now())}</span></div>
      <span class="pill ${reste ? 'amber' : 'green'}">${reste ? `${reste} chose${reste > 1 ? 's' : ''} à faire` : 'Tout est prêt'}</span></div>
    ${reste ? `<div class="col" style="gap:6px">${items.map((i) => `<a class="todo ${i.ok ? 'done' : ''}" href="${i.href}"><span class="box" aria-hidden="true">${i.ok ? icon('check', 14) : ''}</span>
      <span class="col grow" style="gap:0"><span style="font-weight:600">${i.t}</span><span class="tiny muted">${i.s}</span></span>${icon('chevron', 16)}</a>`).join('')}</div>` : ''}
  </section>`;
}

export function renderHP() {
  const st = S.state, z = myZone();
  const T = st.turn;
  const { g, n, pct } = gradeInfo(z.ps);
  const { rang, total } = rangDe(z.uid);
  const dispo = agentsDisponibles(z, T);
  const blesses = blessesActifs(z, T);
  const form = enFormation(z, T);
  const vDispo = vehiculesDisponibles(z, T);
  const ordresOk = !!S.savedOrders && !S.ordersDirty;
  const qr = S.questResults || [];
  const faites = qr.filter((r) => r && (r.statut === 'ok' || r.statut === 'rate')).length;
  const reussies = qr.filter((r) => r && r.statut === 'ok').length;
  const questDone = faites >= 3;

  const alertes = [];
  const bless = z.blesses.filter((b) => b.retour > T);
  for (const b of bless) {
    const tours = b.retour - T;
    const pl = b.n > 1;
    const motif = { 'blessé': pl ? 'blessés' : 'blessé', malade: pl ? 'malades' : 'malade', 'épuisé': pl ? 'épuisés' : 'épuisé', 'enquête interne': 'en enquête interne' }[b.motif] || b.motif;
    alertes.push({ cls: 'red', titre: `${b.n} agent${pl ? 's' : ''} ${motif}`, texte: `de retour dans ${tours} tour${tours > 1 ? 's' : ''}`, href: '#ordres' });
  }
  if (st.evenement) {
    const dans = st.evenement.tour - T;
    const requis = 3 * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length;
    alertes.push({ cls: 'amber', titre: dans === 0 ? `${esc(st.evenement.titre)} : ce soir !` : `${esc(st.evenement.titre)} dans ${dans} tour${dans > 1 ? 's' : ''}`, texte: `environ ${requis} agents requis pour tout le district`, href: dans === 0 ? '#ordres' : '#carte' });
  }
  if (z.paperasse > 14) alertes.push({ cls: 'red', titre: `Paperasse : ${Math.round(z.paperasse)} dossiers en attente`, texte: 'au-delà de 20, gare à l’Inspection', href: '#ordres' });
  if (z.budget < 0) alertes.push({ cls: 'red', titre: 'Budget dans le rouge', texte: 'deux tours de suite et c’est l’Inspection', href: '#ordres' });
  const vieux = z.dossiers.filter((d) => d.age > 6).length;
  if (vieux) alertes.push({ cls: 'amber', titre: `${vieux} dossier${vieux > 1 ? 's' : ''} qui traîne${vieux > 1 ? 'nt' : ''}`, texte: 'renforce la Recherche', href: '#ordres' });
  if (st.affaires.length) alertes.push({ cls: 'blue', titre: `${st.affaires.length} affaire${st.affaires.length > 1 ? 's' : ''} disputée${st.affaires.length > 1 ? 's' : ''} sur la carte`, texte: st.affaires.map((a) => esc(a.titre)).join(' · '), href: '#carte' });

  if (st.conseil && st.conseil.tour === T) alertes.unshift({ cls: 'amber', titre: 'Conseil de police : vote ce soir', texte: st.conseil.motions.map((m) => esc(m.titre)).join(' · '), href: '#diplomatie' });
  const invit = (st.duels || []).find((d) => d.b === z.uid && d.etape === 'propose' && d.tourReponse === T);
  if (invit) alertes.unshift({ cls: 'amber', titre: `${esc(st.zones[invit.a]?.nom || 'Une zone')} te défie en duel`, texte: `${esc(DUEL_INDICATEURS[invit.ind].nom.toLowerCase())} · réponds avant 20:00`, href: '#diplomatie' });
  const perils = Object.values(st.zones).filter((x) => x.peril && x.uid !== z.uid);
  if (perils.length) alertes.push({ cls: 'red', titre: `${perils.map((x) => esc(x.nom)).join(', ')} en péril`, texte: 'un coup de main rapporte +5 de réputation', href: '#diplomatie' });
  const op = operationActive(z, T);
  if (op) alertes.unshift({ cls: 'red', titre: `Opération d\u2019envergure : ${esc(op.titre)}`, texte: `dispositif à régler dans tes ordres${op.duree > 1 ? ` · jour ${T - op.tourDebut + 1} sur ${op.duree}` : ''}`, href: '#ordres' });
  const dotColor = { red: 'var(--red)', amber: 'var(--amber)', blue: 'var(--blue)' };
  const last = S.gazettes[0];

  return `<main class="screen">
    <header class="between" style="align-items:flex-start">
      <div class="col" style="gap:3px"><h1 class="brand">Ma ZP</h1><a class="sub" href="#parties" style="text-decoration:none">Hôtel de police · <span style="color:var(--amber-soft);text-decoration:underline">${esc((S.partie && S.partie.nom) || 'District Delta')}</span></a></div>
      <div class="col" style="gap:6px;align-items:flex-end">
        <span class="pill">Tour ${T} · Saison ${st.season}</span>
        <a href="#classement" class="row" style="gap:6px;text-decoration:none;color:var(--text)">
          <span style="color:var(--amber)">${icon('shield', 14)}</span><span class="small" style="font-weight:600">${g.nom}</span>
          <span role="img" aria-label="${z.ps} points de service${n ? ` sur ${n.ps}` : ''}" style="width:56px;height:5px;background:var(--line);border-radius:3px;display:inline-block"><span style="display:block;width:${pct}%;height:5px;background:var(--amber);border-radius:3px"></span></span>
        </a>
      </div>
    </header>

    <section class="card" aria-label="Ma zone">
      <div class="between">
        <div class="row" style="gap:10px;min-width:0">
          ${S.player && S.player.blason && GRADES.indexOf(gradeFor(z.ps)) >= 4 ? blasonSvg(S.player.blason, z.couleur, 32) : `<span style="width:12px;height:36px;border-radius:4px;background:${esc(z.couleur)};flex-shrink:0"></span>`}
          <div class="col" style="gap:1px;min-width:0">
            <span class="mono small" style="color:var(--blue-soft)">ZP ${esc(z.code)} ${insigne(z.ps)}</span>
            ${S.editingName ? `<form class="row" data-form="rename" style="gap:6px"><label class="sr" for="nom-zone">Nom de la zone</label>
              <input id="nom-zone" class="text" name="nom" maxlength="24" value="${esc(z.nom)}" style="min-height:36px;width:150px;font:700 18px var(--display)">
              <button class="btn primary small" type="submit">OK</button></form>`
              : `<div class="row" style="gap:2px"><h2 style="margin:0;font-family:var(--display);font-size:25px;font-weight:700;line-height:1.05;overflow-wrap:break-word">${esc(z.nom)}</h2>
              <button class="iconbtn" data-action="rename" aria-label="Renommer la zone">${icon('pencil', 16)}</button></div>`}
          </div>
        </div>
        <div class="col" style="gap:2px;align-items:flex-end;flex-shrink:1;text-align:right">
          <span class="row" style="gap:6px;flex-shrink:0;white-space:nowrap"><span class="mono" style="font-size:18px" aria-label="Indice de performance de zone : ${fmt1(z.ipz)}">IPZ ${fmt1(z.ipz)}</span>${delta(z.ipz, z.hier && z.hier.ipz)}${aideBtn('ipz', 'Qu’est-ce que l’IPZ ?')}</span>
          <span class="tiny muted">${z.toursJoues >= 5 ? `${rang}${rang === 1 ? 'er' : 'e'} sur ${total} zone${total > 1 ? 's' : ''}` : `non classé · ${z.toursJoues}/5 tours joués`}</span>
        </div>
      </div>
      <div class="tiles">
        <div class="tile"><span class="l">Agents</span><span class="v">${dispo}<span class="muted" style="font-size:13px"> / ${z.agents}</span></span>
          <span class="s ${blesses ? 'bad' : ''}">${blesses ? `${blesses} absent${blesses > 1 ? 's' : ''}` : form ? `${form} en formation` : z.academie.length ? `${z.academie.reduce((s, a) => s + a.n, 0)} à l’académie` : 'tous disponibles'}</span></div>
        <div class="tile"><span class="l row" style="gap:4px">Budget ${aideBtn('budget')}</span><span class="v ${z.budget < 0 ? 'bad' : ''}">${fmtK(z.budget)}</span><span class="s">dotation 8 k€/tour</span></div>
        <div class="tile"><span class="l">Véhicules</span><span class="v">${vDispo}<span class="muted" style="font-size:13px"> / ${z.vehicules}</span></span><span class="s">état ${Math.round(100 - z.usure)} %</span></div>
      </div>
      <div class="col" style="gap:9px">
        ${gauge('Moral', z.moral, 'var(--amber)', delta(z.moral, z.hier && z.hier.moral) + aideBtn('moral'))}
        ${gauge('Satisfaction citoyenne', z.satisfaction, 'var(--blue)', delta(z.satisfaction, z.hier && z.hier.satisfaction) + aideBtn('satisfaction'))}
        ${gauge('Réputation', z.reputation, 'var(--green)', delta(z.reputation, z.hier && z.hier.reputation) + aideBtn('reputation'))}
      </div>
    </section>

    ${nuitHtml(z)}
    ${ceSoirHtml(st, z, { ordresOk, faites, reussies, invit })}


    ${z.peril ? `<section class="card red" aria-label="Zone en péril"><span class="kicker" style="color:var(--red-soft)">Zone en péril · faillite dans ${z.peril.fin - T + 1} résolution${z.peril.fin - T + 1 > 1 ? 's' : ''}</span>
      <span style="font-weight:700">${esc((z.peril.raisons || []).join(', '))}</span>
      <span class="small">Pour t’en sortir : budget au-dessus de ${PERIL.budget} k€, au moins ${PERIL.agents} agents disponibles, moral au-dessus de ${PERIL.moral}. Rythme allégé, prime, moins de dépenses ; tes collègues peuvent t’aider.</span>
      <a class="small" href="#guide-faillite">Ce qui se passe en cas de faillite</a></section>` : ''}
    ${situationHtml(z)}
    <div id="hp-fipa">${fipaCards()}</div>
    ${enqueteCarte(st, z)}

    <a href="#quete" class="card amber" style="flex-direction:row;align-items:center;gap:12px">
      <span style="width:42px;height:42px;flex-shrink:0;border-radius:12px;background:var(--amber);color:var(--amber-ink);display:flex;align-items:center;justify-content:center">${icon('quete', 22)}</span>
      <span class="col grow" style="gap:2px"><span class="kicker">Quêtes du jour</span>
        <span style="font-size:16px;font-weight:600">${S.quests ? S.quests.map((x) => esc(QUEST_LABELS[x.type])).join(' · ') : '3 énigmes'}</span>
        <span class="small" style="color:var(--amber-soft)">${faites ? `${faites} sur 3 faite${faites > 1 ? 's' : ''} · ${reussies} réussie${reussies > 1 ? 's' : ''}${reussies < 2 && faites < 3 ? ` · encore ${2 - reussies} pour le bonus` : reussies >= 2 ? ' · bonus débloqué' : ''}` : '3 énigmes · bonus dès 2 bonnes réponses'}</span></span>
      ${icon('chevron', 20)}
    </a>

    ${alertes.length ? `<section class="col" aria-label="À traiter"><h2 class="section">À traiter</h2>
      ${alertes.map((a) => `<a class="list-row" href="${a.href}" ${a.cls === 'red' ? 'style="background:var(--red-bg);border-color:var(--red-line)"' : ''}><span class="bullet" style="background:${dotColor[a.cls]}"></span>
        <span class="col" style="gap:1px"><span style="font-weight:600">${a.titre}</span><span class="small muted">${a.texte}</span></span></a>`).join('')}</section>` : ''}

    <section class="col">
      <div class="trio">
        <button type="button" class="btn" data-action="toggle-rapport" aria-expanded="${!!S.showRapport}" ${S.showRapport ? 'style="border-color:var(--amber-line);background:var(--amber-bg)"' : ''}>${icon('news', 18)}<span>Rapport</span></button>
        <a class="btn" href="#gazette">${icon('news', 18)}<span>${last ? `Gazette <span class="mono tiny muted">T${last.turn}</span>` : 'Gazette'}</span></a>
        <a class="btn" href="#classement">${icon('trophy', 18)}<span>Classement</span></a>
      </div>
      ${S.showRapport ? `<div class="card tight"><span class="kicker">Rapport du dernier tour</span>${(z.rapport && z.rapport.length ? z.rapport : ['Pas encore de rapport : le premier tour n’a pas été résolu.']).map((l) => `<p class="small" style="margin:0">• ${esc(l)}</p>`).join('')}</div>` : ''}
      <div class="row">
        <a class="btn ghost small grow" href="#guide">${icon('news', 16)} Guide du joueur</a>
        <a class="btn ghost small grow" href="#profil">${icon('gear', 16)} Profil</a>
        ${S.backend.isMaster(S.user) ? `<a class="btn ghost small grow" href="#admin">Maître du jeu</a>` : ''}
      </div>
      ${S.backend.mode === 'demo' ? '<button class="btn outline block" data-action="demo-next">Démo : passer au tour suivant</button>' : ''}
    </section>
    ${z.toursJoues < 2 && !premiersPasVus() ? '<a class="list-row" href="#guide-debut" style="border-color:var(--amber-line)"><span class="bullet" style="background:var(--amber)"></span><span class="col grow" style="gap:1px"><span style="font-weight:600">Nouveau ? Lis les « Premiers pas »</span><span class="small muted">2 minutes pour comprendre ta journée de chef de zone</span></span></a>' : ''}
  </main>${tabbar('hp', { questBadge: !questDone, radioBadge: S.radio.length > S.radioSeen })}`;
}

function enqueteCarte(st, z) {
  if (!st.enquete) return '';
  const a = genererAffaire(st.seed, st.enquete.n);
  const d = dossierDe(st, z);
  const tr = (st.traques || [])[0];
  const ta = tr ? genererAffaire(st.seed, tr.n) : null;
  return `<a href="#enquete" class="card" style="flex-direction:row;align-items:center;gap:12px;${tr ? 'border-color:var(--red-line)' : ''}">
    <span style="width:42px;height:42px;flex-shrink:0;border-radius:12px;background:var(--surface2);border:1px solid var(--line);color:var(--amber);display:flex;align-items:center;justify-content:center">${icon('enquete', 22)}</span>
    <span class="col grow" style="gap:2px"><span class="kicker">Enquête · jour ${st.enquete.jour} sur ${ENQ.dureeMax}</span>
      <span style="font-size:16px;font-weight:600">${esc(a.titre)}</span>
      <span class="small muted">${d.pieces.length} pièce${d.pieces.length > 1 ? 's' : ''} au dossier · découverte ce soir : ${pointsDecouverte(st.enquete.jour)} pts</span>
      ${tr ? `<span class="small bad">Traque : ${esc(ta.suspects[ta.coupable].nom)} en fuite, ${tr.tours} tour${tr.tours > 1 ? 's' : ''} pour l’arrêter</span>` : ''}</span>
    ${icon('chevron', 20)}
  </a>`;
}

function recompensesGrade(z) {
  const gi = GRADES.indexOf(gradeFor(z.ps));
  const cs = (S.player && S.player.consignes) || {};
  const out = [];
  if (gi >= 2) {
    const opt = (k, t) => `<button type="button" class="choice" data-action="toggle-consigne" data-k="${k}" aria-pressed="${!!cs[k]}" style="text-align:left;align-items:flex-start">${t}</button>`;
    out.push(`<section class="card"><h2 class="card-title">Consignes du pilote automatique</h2>
      <p class="small muted" style="margin:0">Appliquées les jours où tu ne passes pas d’ordres (grade Inspecteur principal).</p>
      <div class="col" style="gap:6px">
        ${opt('alloc', cs.alloc ? `Répartition de secours enregistrée : ${Object.values(cs.alloc).join(' / ')}<span class="s">Touche pour l’effacer</span>` : 'Utiliser ma répartition actuelle comme répartition de secours')}
        ${opt('situation', 'Adapter la répartition à la situation du jour<span class="s">+2 agents là où la situation l’exige</span>')}
        ${opt('temoin', 'Poursuivre l’enquête<span class="s">Une audition de témoin par jour</span>')}
        ${opt('prime', 'Verser une prime si le moral passe sous 45<span class="s">3 k€, si le budget le permet</span>')}
      </div></section>`);
  }
  if (gi >= 4) {
    out.push(`<section class="card"><h2 class="card-title">Blason de la zone</h2><p class="small muted" style="margin:0">Affiché sur l’HP et sur la carte (grade Commissaire divisionnaire).</p>
      <div class="swatches">${Object.entries(BLASONS).map(([k, b]) => `<button type="button" class="swatch" style="background:transparent;width:48px;height:52px" data-action="pick-blason" data-v="${k}" aria-pressed="${S.player && S.player.blason === k}" aria-label="Blason ${b.nom}">${blasonSvg(k, z.couleur, 36, b.nom)}</button>`).join('')}</div></section>`);
  }
  if (gi >= 5) out.push(`<section class="card tight"><span class="kicker">Chef de corps</span><span class="small">${z.motionSaison ? 'Ta motion de la saison est déposée.' : 'Tu peux proposer une motion au Conseil cette saison, depuis l’écran Diplomatie.'}</span></section>`);
  return out.join('');
}

export function renderProfil() {
  const z = myZone();
  const p = S.player || {};
  const { g } = gradeInfo(z.ps);
  const etendue = z.ps >= 200;
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <div class="col" style="gap:3px"><span class="kicker">Profil</span><h1 class="big">ZP ${esc(z.code)} ${esc(z.nom)}</h1><p class="sub">${g.nom} · ${z.ps} points de service</p></div>
    <form class="card" data-form="profil">
      <label class="field">Ton prénom ou pseudo<input class="text" name="pseudo" maxlength="24" required value="${esc(p.pseudo || '')}"></label>
      <label class="field">Nom de la zone<input class="text" name="nom" maxlength="24" required value="${esc(z.nom)}"></label>
      <label class="field">Code de zone (4 chiffres)<input class="text mono" name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required value="${esc(z.code)}"></label>
      <fieldset style="border:none;padding:0;margin:0" class="col"><legend class="small muted" style="font-weight:600;margin-bottom:6px">Couleur</legend>
        <div class="swatches">${COULEURS_ZONE.map((c, i) => `<button type="button" class="swatch" style="background:${c}" data-action="pick-color-profil" data-color="${c}" aria-pressed="${(S.profilColor || z.couleur) === c}" ${i >= 6 && !etendue ? 'disabled title="Grade Inspecteur requis"' : ''} aria-label="Couleur ${c}"></button>`).join('')}</div>
      </fieldset>
      <button class="btn primary block" type="submit">Enregistrer</button>
    </form>
    ${recompensesGrade(z)}
    <section class="card"><h2 class="card-title">Carrière</h2>
      <p class="small" style="margin:0">Faillites : <strong>${z.faillites || 0}</strong>${(z.badges || []).length ? ` · Badges : ${z.badges.map((b) => `<strong>${esc(b)}</strong>`).join(', ')}` : ''}</p></section>
    ${z.titres && z.titres.length ? `<section class="card"><h2 class="card-title">Titres</h2>${z.titres.map((t) => `<p class="small" style="margin:0">${icon('trophy', 14)} ${esc(t)}</p>`).join('')}</section>` : ''}
    <a class="list-row" href="#parties"><span class="col grow" style="gap:1px"><span style="font-weight:600">Changer de partie</span><span class="small muted">${esc((S.partie && S.partie.nom) || '')} · rejoindre ou créer une partie</span></span>${icon('chevron', 18)}</a>
    <section class="card"><h2 class="card-title">Installer le jeu sur ton téléphone</h2>
      <p class="small muted" style="margin:0">Android (Chrome) : menu ⋮ puis « Installer l’application ». iPhone (Safari) : bouton Partager puis « Sur l’écran d’accueil ».</p></section>
    <p class="tiny muted" style="margin:0">Connecté${S.user.email ? ` : ${esc(S.user.email)}` : ''}${p.bot ? '' : ''}</p>
    <button class="btn danger block" data-action="logout">Se déconnecter</button>
  </main>${tabbar('hp')}`;
}
