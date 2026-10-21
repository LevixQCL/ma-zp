// Messages privés entre zones, et invitations en attente (FIPA, pactes, défis, Conseil).
import { S, esc, myZone, zoneName } from './common.js';
import { aFairePactes } from './pactes.js';
import { appelsRenfort, renfortPrevu, renfortCtrl } from './renfort.js';
import { candidaturesRecues, candidatureCtrl, maCandidature } from './affaires.js';
import { renderRadioV2 } from './radio-v2.js';

// ───────── « Déjà lu » : mémorisé sur l'appareil, par partie ─────────
function cleVu() { return `mazp-vu-${S.backend && S.backend.gameId ? S.backend.gameId() : ''}-${S.user ? S.user.uid : ''}`; }
function lireVu() {
  if (S.vu && S.vu.cle === cleVu()) return S.vu;
  let v = null;
  try { v = JSON.parse(localStorage.getItem(cleVu()) || 'null'); } catch (e) { /* pas de stockage */ }
  S.vu = { cle: cleVu(), radio: (v && v.radio) || 0, ops: (v && (v.ops || v.radio)) || 0, prive: (v && v.prive) || {} };
  // Première visite sur cet appareil : on ne signale pas tout l'historique comme nouveau.
  if (!v) { S.vu.radio = Date.now(); S.vu.ops = Date.now(); }
  return S.vu;
}
function ecrireVu() { try { localStorage.setItem(cleVu(), JSON.stringify({ radio: S.vu.radio, ops: S.vu.ops, prive: S.vu.prive })); } catch (e) { /* pas de stockage */ } }

/**
 * Deux fréquences sur la Radio : « parole » (les joueurs qui se parlent) et « ops » (appels à renfort,
 * zone de non-droit, annonces automatiques, et les réponses envoyées sur cette fréquence).
 */
export function canalRadio(m) {
  if (m.canal === 'ops' || m.renfort || m.renfortRep || m.nd || m.enchere) return 'ops';
  if (m.canal === 'parole') return 'parole';
  return /^(🚨|🚔|🤝|📻)/u.test(m.texte || '') ? 'ops' : 'parole';
}
/** Marque comme lue une fréquence (par défaut celle qu'on regarde). */
export function marquerRadioLue(canal = 'parole') {
  const v = lireVu(), cle = canal === 'ops' ? 'ops' : 'radio';
  const der = Math.max(0, ...(S.radio || []).filter((m) => canalRadio(m) === canal).map((m) => m.at || 0));
  if (der > v[cle]) { v[cle] = der; ecrireVu(); }
}
export function marquerPriveLu(autre) {
  const v = lireVu();
  const der = Math.max(0, ...(S.prives || []).filter((m) => m.de === autre || m.a === autre).map((m) => m.at || 0));
  if (der > (v.prive[autre] || 0)) { v.prive[autre] = der; ecrireVu(); }
}

/** Nombre de messages non lus, envoyés par d'autres. */
export function nonLus() {
  if (!S.user) return { radio: 0, ops: 0, prive: 0, parZone: {} };
  const v = lireVu(), me = S.user.uid;
  const autres = (S.radio || []).filter((m) => m.uid !== me);
  const radio = autres.filter((m) => canalRadio(m) === 'parole' && (m.at || 0) > v.radio).length;
  const ops = autres.filter((m) => canalRadio(m) === 'ops' && (m.at || 0) > v.ops).length;
  const parZone = {};
  for (const m of S.prives || []) {
    if (m.de === me) continue;
    if ((m.at || 0) > (v.prive[m.de] || 0)) parZone[m.de] = (parZone[m.de] || 0) + 1;
  }
  return { radio, ops, prive: Object.values(parZone).reduce((a, b) => a + b, 0), parZone };
}

/** Onglets Radio | Privé (les pactes et le Conseil sont passés dans la Carte). */
export function ongletsRadio(actif, extra = '') {
  const n = nonLus();
  const priveAFaire = n.prive > 0 || invitations().some((i) => !i.fait && i.href !== '#pactes');
  const tab = (k, l, pastille) => `<a role="tab" href="#${k}" aria-selected="${actif === k}" class="segl">${l}${actif !== k && pastille ? '<span class="pastille" aria-label="nouveau"></span>' : ''}</a>`;
  return `<div class="onglets-flottants"><div class="seg3 deux" role="tablist" aria-label="Radio et messages privés">
    ${tab('radio', 'Radio', n.radio > 0)}${tab('prive', 'Privé', priveAFaire)}</div>${extra}</div>`;
}

/** Invitations et demandes qui attendent une réponse de ma part ce tour-ci. */
export function invitations() {
  const st = S.state, z = myZone();
  if (!st || !z) return [];
  const T = st.turn, me = z.uid, out = [], d = S.draft || {};
  const nom = (uid) => (st.zones[uid] ? zoneName(st.zones[uid]) : 'Une zone');
  for (const f of st.fipas || []) {
    if (f.etape === 'invite' && f.partenaire === me && f.tourReponse === T) out.push({ titre: `${nom(f.demandeur)} t’invite à la FIPA « ${esc(f.titre)} »`, texte: `${f.lui} de tes agents demandés · ${f.recompense} k€ en jeu · réponds avant 20:00`, href: '#hp-fipa', action: 'Répondre', fait: !!(d.fipaReponse && d.fipaReponse.id === f.id) });
    else if (f.etape === 'demande' && f.demandeur === me && f.tourDecision === T) out.push({ titre: `Le bourgmestre te confie « ${esc(f.titre)} »`, texte: d.fipa && d.fipa.id === f.id && d.fipa.invite ? `invitation prévue ce soir : ${nom(d.fipa.invite)}` : 'choisis une zone partenaire à inviter', href: '#hp-fipa', action: 'Inviter', fait: !!(d.fipa && d.fipa.id === f.id && d.fipa.invite) });
    else if (f.etape === 'accepte' && f.tourJ === T && (f.demandeur === me || f.partenaire === me)) out.push({ titre: `FIPA « ${esc(f.titre)} » ce soir avec ${nom(f.demandeur === me ? f.partenaire : f.demandeur)}`, texte: 'partager ou revendiquer le mérite ?', href: '#hp-fipa', action: 'Choisir', fait: !!(d.fipaChoix && d.fipaChoix.id === f.id) });
  }
  for (const c of candidaturesRecues()) out.push({ titre: `${nom(c.uid)} postule sur « ${esc(c.affaire.titre)} »`, texte: `${c.agents} agent${c.agents > 1 ? 's' : ''} proposé${c.agents > 1 ? 's' : ''} · réponds avant 20:00`, ctrl: candidatureCtrl(c), fait: c.statut !== 'attente' });
  for (const a of st.affaires) { const c = a.zone !== me && maCandidature(a); if (c && c.statut !== 'attente') out.push({ titre: `Candidature ${c.statut === 'acceptee' ? 'acceptée' : 'refusée'} par ${nom(a.zone)}`, texte: `« ${esc(a.titre)} » · ${c.agents} agent${c.agents > 1 ? 's' : ''}${c.statut === 'acceptee' ? ' · valide tes ordres' : ''}`, href: c.statut === 'acceptee' ? '#ordres' : '#carte-nondroit', action: c.statut === 'acceptee' ? 'Ordres' : 'Voir', fait: true }); }
  for (const a of appelsRenfort()) out.push({ titre: `${nom(a.uid)} appelle du renfort`, texte: `${a.agents} agents demandés pour « ${esc(a.op.titre)} » ce soir${a.op.appel ? ' · appel du district : renfort payé ×1,5' : ''}`, ctrl: renfortCtrl(a), fait: renfortPrevu(a.uid) > 0 });
  for (const x of aFairePactes()) if (x.k !== 'conseil' || !x.fait) out.push({ titre: esc(x.titre), texte: esc(x.texte), href: '#pactes', action: x.k === 'conseil' ? 'Voter' : x.k === 'frag' ? 'Mettre en commun' : 'Répondre', fait: x.fait });
  return out;
}

/** Met à jour la pastille de l'onglet Radio sans redessiner la page (on ne perd pas une saisie en cours). */
export function majPastilleRadio() {
  const a = document.querySelector('nav.tabs a[href="#radio"]');
  if (!a) return;
  const n = nonLus();
  const doit = n.radio + n.prive > 0 || invitations().some((i) => !i.fait && i.href !== '#pactes');
  const dot = a.querySelector('.dot');
  if (doit && !dot) a.insertAdjacentHTML('beforeend', '<span class="dot" aria-label="nouveau"></span>');
  else if (!doit && dot) dot.remove();
}


export function renderPrive() {
  // Saison 2 : le privé est la troisième fréquence de la Radio.
  return renderRadioV2();
}
