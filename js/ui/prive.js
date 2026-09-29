// Messages privés entre zones, et invitations en attente (FIPA, duels, Conseil).
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { ongletsRadio } from './diplomatie.js';

// ───────── « Déjà lu » : mémorisé sur l'appareil, par partie ─────────
function cleVu() { return `mazp-vu-${S.backend && S.backend.gameId ? S.backend.gameId() : ''}-${S.user ? S.user.uid : ''}`; }
function lireVu() {
  if (S.vu && S.vu.cle === cleVu()) return S.vu;
  let v = null;
  try { v = JSON.parse(localStorage.getItem(cleVu()) || 'null'); } catch (e) { /* pas de stockage */ }
  S.vu = { cle: cleVu(), radio: (v && v.radio) || 0, prive: (v && v.prive) || {} };
  // Première visite sur cet appareil : on ne signale pas tout l'historique comme nouveau.
  if (!v) S.vu.radio = Date.now();
  return S.vu;
}
function ecrireVu() { try { localStorage.setItem(cleVu(), JSON.stringify({ radio: S.vu.radio, prive: S.vu.prive })); } catch (e) { /* pas de stockage */ } }

export function marquerRadioLue() {
  const v = lireVu();
  const der = Math.max(0, ...(S.radio || []).map((m) => m.at || 0));
  if (der > v.radio) { v.radio = der; ecrireVu(); }
}
export function marquerPriveLu(autre) {
  const v = lireVu();
  const der = Math.max(0, ...(S.prives || []).filter((m) => m.de === autre || m.a === autre).map((m) => m.at || 0));
  if (der > (v.prive[autre] || 0)) { v.prive[autre] = der; ecrireVu(); }
}

/** Nombre de messages non lus, envoyés par d'autres. */
export function nonLus() {
  if (!S.user) return { radio: 0, prive: 0, parZone: {} };
  const v = lireVu(), me = S.user.uid;
  const radio = (S.radio || []).filter((m) => m.uid !== me && (m.at || 0) > v.radio).length;
  const parZone = {};
  for (const m of S.prives || []) {
    if (m.de === me) continue;
    if ((m.at || 0) > (v.prive[m.de] || 0)) parZone[m.de] = (parZone[m.de] || 0) + 1;
  }
  return { radio, prive: Object.values(parZone).reduce((a, b) => a + b, 0), parZone };
}

/** Invitations et demandes qui attendent une réponse de ma part ce tour-ci. */
export function invitations() {
  const st = S.state, z = myZone();
  if (!st || !z) return [];
  const T = st.turn, me = z.uid, out = [];
  const nom = (uid) => (st.zones[uid] ? zoneName(st.zones[uid]) : 'Une zone');
  for (const f of st.fipas || []) {
    if (f.etape === 'invite' && f.partenaire === me && f.tourReponse === T) out.push({ titre: `${nom(f.demandeur)} t’invite à la FIPA « ${esc(f.titre)} »`, texte: `${f.lui} de tes agents demandés · ${f.recompense} k€ en jeu · réponds avant 20:00`, href: '#hp-fipa', action: 'Répondre' });
    else if (f.etape === 'demande' && f.demandeur === me && f.tourDecision === T) out.push({ titre: `Le bourgmestre te confie « ${esc(f.titre)} »`, texte: 'choisis une zone partenaire à inviter', href: '#hp-fipa', action: 'Inviter' });
    else if (f.etape === 'accepte' && f.tourJ === T && (f.demandeur === me || f.partenaire === me)) out.push({ titre: `FIPA « ${esc(f.titre)} » ce soir avec ${nom(f.demandeur === me ? f.partenaire : f.demandeur)}`, texte: 'partager ou revendiquer le mérite ?', href: '#hp-fipa', action: 'Choisir' });
  }
  for (const d of st.duels || []) {
    if (d.b === me && d.etape === 'propose' && d.tourReponse === T) out.push({ titre: `${nom(d.a)} te défie en duel`, texte: 'sans réponse, c’est un refus', href: '#diplomatie', action: 'Répondre' });
  }
  if (st.conseil && st.conseil.tour === T && !(S.draft && Object.keys(S.draft.votes || {}).length)) out.push({ titre: 'Conseil de police : vote ce soir', texte: 'une voix par zone, résultat à 20:00', href: '#diplomatie', action: 'Voter' });
  return out;
}

/** Met à jour la pastille de l'onglet Radio sans redessiner la page (on ne perd pas une saisie en cours). */
export function majPastilleRadio() {
  const a = document.querySelector('nav.tabs a[href="#radio"]');
  if (!a) return;
  const n = nonLus();
  const doit = n.radio + n.prive > 0 || invitations().length > 0;
  const dot = a.querySelector('.dot');
  if (doit && !dot) a.insertAdjacentHTML('beforeend', '<span class="dot" aria-label="nouveau"></span>');
  else if (!doit && dot) dot.remove();
}

function heure(at) {
  const d = new Date(at), auj = new Date();
  const h = d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === auj.toDateString() ? h : `${d.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric' })} ${h}`;
}

export function renderPrive() {
  const st = S.state, me = myZone();
  const autres = Object.values(st.zones).filter((z) => z.uid !== me.uid);
  const avec = S.priveAvec && st.zones[S.priveAvec] ? st.zones[S.priveAvec] : null;

  if (avec) {
    marquerPriveLu(avec.uid);
    const fil = (S.prives || []).filter((m) => (m.de === me.uid && m.a === avec.uid) || (m.de === avec.uid && m.a === me.uid));
    return `<main class="screen">
      ${ongletsRadio('prive')}
      <div class="row" style="gap:10px">
        <button type="button" class="backlink" data-action="prive-fermer">${icon('back', 20)}<span>Conversations</span></button></div>
      <header class="row" style="gap:10px"><span style="width:12px;height:36px;border-radius:4px;background:${esc(avec.couleur)};flex-shrink:0"></span>
        <div class="col" style="gap:1px"><span class="mono small" style="color:var(--blue-soft)">ZP ${esc(avec.code)}</span><h1 class="big" style="font-size:26px">${esc(avec.nom)}</h1></div></header>
      <p class="sub">Seuls vous deux voyez cette conversation.</p>
      <section class="col" aria-label="Messages" id="prive-list" style="gap:8px">
        ${fil.length ? fil.map((m) => { const moi = m.de === me.uid; return `<div class="bulle ${moi ? 'moi' : ''}">
          <p style="margin:0;font-size:14px;line-height:1.4;overflow-wrap:anywhere">${esc(m.texte)}</p><span class="tiny muted mono">${heure(m.at)}</span></div>`; }).join('')
          : '<p class="small muted">Aucun message. Propose une alliance, une FIPA, un échange d’indices…</p>'}
      </section>
      <form data-form="prive" class="row" style="position:sticky;bottom:96px;background:var(--bg);padding-top:6px">
        <label class="sr" for="prive-msg">Message privé</label>
        <input id="prive-msg" class="text grow" name="texte" maxlength="500" placeholder="Message privé à ${esc(avec.nom)}…" autocomplete="off">
        <button class="btn primary" type="submit" aria-label="Envoyer" style="width:48px;padding:0">${icon('send', 18)}</button>
      </form>
    </main>${tabbar('radio')}`;
  }

  const inv = invitations();
  const n = nonLus();
  const dernier = (uid) => (S.prives || []).filter((m) => m.de === uid || m.a === uid).slice(-1)[0];
  const tri = autres.slice().sort((a, b) => ((dernier(b.uid) || {}).at || 0) - ((dernier(a.uid) || {}).at || 0) || a.code.localeCompare(b.code));
  return `<main class="screen">
    ${ongletsRadio('prive')}
    <header class="col" style="gap:3px"><h1 class="big">Messages privés</h1><p class="sub">Discussions entre deux zones, et les invitations qui attendent ta réponse.</p></header>
    ${inv.length ? `<section class="col" aria-label="Invitations"><h2 class="section">Invitations et demandes</h2>
      ${inv.map((i) => `<a class="list-row" href="${i.href}" style="border-color:var(--amber-line);background:var(--amber-bg)"><span class="bullet" style="background:var(--amber)"></span>
        <span class="col grow" style="gap:1px"><span style="font-weight:600">${i.titre}</span><span class="small" style="color:var(--amber-soft)">${i.texte}</span></span>
        <span class="pill amber">${i.action}</span></a>`).join('')}</section>` : ''}
    <section class="col" aria-label="Conversations"><h2 class="section">Conversations</h2>
      ${tri.length ? tri.map((z) => { const m = dernier(z.uid); const k = n.parZone[z.uid] || 0; return `<button type="button" class="list-row" data-action="prive-ouvrir" data-uid="${esc(z.uid)}" style="width:100%;text-align:left">
        <span style="width:10px;height:32px;border-radius:3px;background:${esc(z.couleur)};flex-shrink:0"></span>
        <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:${k ? 700 : 600}">${zoneName(z)}</span>
          <span class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m ? `${m.de === me.uid ? 'Toi : ' : ''}${esc(m.texte)}` : 'Écrire un premier message'}</span></span>
        ${k ? `<span class="compteur" aria-label="${k} non lu${k > 1 ? 's' : ''}">${k}</span>` : icon('chevron', 16)}</button>`; }).join('')
        : '<p class="small muted">Aucune autre zone dans la partie pour l’instant.</p>'}
    </section>
  </main>${tabbar('radio')}`;
}
