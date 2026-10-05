// « Dossier clos » : le débrief d'une affaire terminée (publié dans la Gazette à la clôture).
// Ce qui désignait l'auteur, ce qui écartait chaque innocent, qui a trouvé quoi, et la chronologie.
import { S, esc, icon, tabbar, myZone } from './common.js';
import { affaire, texteFait } from '../engine/enquete.js';
import { portraitSuspect } from './portrait.js';

const ICO = { Mobile: '💰', Moyen: '🔑', Occasion: '🕘', Décisive: '🔎', Planque: '📍' };
const TAMPON = {
  arrestation: ['Élucidée', 'vert'],
  aveux: ['Aveux', 'vert'],
  fuite: ['Auteur en fuite', 'ambre'],
  classee: ['Classée sans suite', 'rouge'],
};

/** Débriefs publiés dans les Gazettes chargées, du plus récent au plus ancien. */
export function debriefsRecents() {
  const out = [];
  for (const g of S.gazettes || []) {
    const l = (g && g.enquete && g.enquete.debriefs) || [];
    l.forEach((db, k) => { if (db && db.v) out.push({ id: `${g.season}_${g.turn}_${k}`, g, db }); });
  }
  return out;
}

/** Lien vers un débrief (Gazette, écran Enquête). */
export function lienDebrief(x, { compact = false } = {}) {
  const [txt] = TAMPON[x.db.issue] || ['Close'];
  return `<button type="button" class="db-lien${compact ? ' compact' : ''}" data-action="debrief-ouvrir" data-id="${esc(x.id)}">
    <span class="db-lien-ico" aria-hidden="true">📂</span>
    <span class="db-lien-t"><strong>Dossier clos : « ${esc(x.db.titre)} »</strong><span>${esc(txt)} · qui a trouvé quoi, les fausses pistes, la chronologie</span></span>
    ${icon('chevron', 16)}</button>`;
}

/** Bandeau de l'écran Enquête : le débrief de la dernière affaire close (gazettes des 3 derniers soirs). */
export function banniereDebrief() {
  const recents = new Set((S.gazettes || []).slice(0, 3));
  const x = debriefsRecents().find((d) => recents.has(d.g));
  return x ? lienDebrief(x, { compact: true }) : '';
}

const couleurZone = (z) => (S.state && S.state.zones[z.uid] && S.state.zones[z.uid].couleur) || z.couleur || '#96A0BF';
const nomCourt = (u, db) => { const z = db.zones.find((x) => x.uid === u); return z ? z.nom : '?'; };
function chipZone(u, db, me) {
  const z = db.zones.find((x) => x.uid === u);
  if (!z) return '';
  return `<span class="db-zone${me && u === me.uid ? ' moi' : ''}"><i style="background:${esc(couleurZone(z))}"></i>${esc(z.nom.replace(/^ZP /, ''))}</span>`;
}
function trouveur(k, db, me) {
  if (k.par && k.par.length) return `<span class="db-j">J${k.j}</span>${k.par.map((u) => chipZone(u, db, me)).join('')}`;
  if (k.rebond) return `<span class="db-j">J${k.j}</span><span class="db-tag">rebondissement</span>`;
  if (k.depart) return '<span class="db-tag">au dossier dès le départ</span>';
  return '<span class="db-tag vide">jamais trouvée</span>';
}

function piece(aff, k, db, me, { grand = false } = {}) {
  const txt = aff ? texteFait(aff, k.f) : '';
  const vide = !(k.par && k.par.length) && !k.rebond && !k.depart;
  const corps = `<span class="db-cle-h"><span class="db-cle-ico" aria-hidden="true">${ICO[k.role] || '🧩'}</span><span class="db-cle-r">${esc(k.role)}</span></span>
    <span class="db-cle-t">${esc(k.titre)}</span>
    <span class="db-cle-q">${trouveur(k, db, me)}</span>`;
  if (!txt) return `<div class="db-cle${vide ? ' vide' : ''}${grand ? ' grand' : ''}">${corps}</div>`;
  return `<details class="db-cle${vide ? ' vide' : ''}${grand ? ' grand' : ''}"><summary>${corps}</summary><p class="db-cle-x">${esc(txt)}${k.constatTitre ? `<br><em>À croiser avec « ${esc(k.constatTitre)} ».</em>` : ''}</p></details>`;
}

function suspectDe(aff, i, s) {
  const x = aff && aff.suspects[i];
  return x || { nom: s.nom, f: s.f, role: s.role };
}

function sousTitre(db) {
  const c = db.coupable, e = c.f ? 'e' : '';
  const par = (l) => l.join(' et ');
  if (db.issue === 'classee') return db.meurtre ? `Personne ne l’a confondu${e} en ${db.jours || 7} jours.` : `Personne ne l’a démasqué${e} en ${db.jours || 7} jours. ${c.f ? 'Elle' : 'Il'} se cachait à « ${db.planque ? db.planque.nom : '?'} ».`;
  if (db.issue === 'aveux') return `Aveux au jour ${db.jours}, obtenus par ${par(db.decouvreurs)}.`;
  const dem = `Démasqué${e} au jour ${db.jours} par ${par(db.decouvreurs)}`;
  if (db.issue === 'arrestation') return `${dem}, arrêté${e} à « ${db.planque ? db.planque.nom : '?'} » par ${par(db.arreteurs)}.`;
  return `${dem}. Personne n’est venu à « ${db.planque ? db.planque.nom : '?'} » à temps : ${c.f ? 'elle' : 'il'} a filé.`;
}

function tonEnquete(db, me) {
  const m = me && db.zones.find((z) => z.uid === me.uid);
  if (!m) return `<section class="db-moi"><span class="db-k">Ton enquête</span><p>Ta zone n’a pas travaillé sur cette affaire. La prochaine t’attend dans l’écran Enquête.</p></section>`;
  const auteur = db.cles.map((k, x) => ({ k, x })).filter(({ k }) => !k.planque);
  const eus = auteur.filter(({ x }) => m.cles.includes(x));
  const manquent = auteur.filter(({ x }) => !m.cles.includes(x)).map(({ k }) => k);
  const verdict = m.arrete ? `Tu l’as démasqué${db.coupable.f ? 'e' : ''} et arrêté${db.coupable.f ? 'e' : ''}. Beau travail.`
    : m.juste ? `Tu l’as démasqué${db.coupable.f ? 'e' : ''}.`
      : m.accuse != null ? `Ton accusation visait ${esc(db.pistes.find((p) => p.i === m.accuse)?.nom || '?')} : une fausse piste.`
        : 'Tu n’as accusé personne.';
  return `<section class="db-moi">
    <span class="db-k">Ton enquête</span>
    <div class="db-jauge" role="img" aria-label="${eus.length} pièces sur ${auteur.length}">${auteur.map(({ x }) => `<i class="${m.cles.includes(x) ? 'ok' : ''}"></i>`).join('')}</div>
    <p><strong>${eus.length} pièce${eus.length > 1 ? 's' : ''} sur ${auteur.length}</strong> qui désignaient l’auteur. ${verdict}</p>
    ${manquent.length && !m.juste ? `<p class="db-manque">Il te manquait : ${manquent.map((k) => `« ${esc(k.titre)} »`).join(', ')}.</p>` : ''}
    <div class="db-chiffres"><span><b>${m.propres}</b> trouvées</span><span><b>${m.recues}</b> reçues</span><span><b>${m.donnees}</b> données</span></div>
  </section>`;
}

function zonesHtml(db, me) {
  if (!db.zones.length) return '';
  const max = Math.max(1, ...db.zones.map((z) => z.propres + z.recues));
  return `<section class="db-sec"><h3 class="db-h">Les zones sur l’affaire</h3>
    <div class="db-zones">${db.zones.map((z) => `<div class="db-zr${me && z.uid === me.uid ? ' moi' : ''}">
      <span class="db-zn"><i style="background:${esc(couleurZone(z))}"></i>${esc(z.nom)}</span>
      <span class="db-zb" role="img" aria-label="${z.propres} trouvées, ${z.recues} reçues"><b style="width:${(100 * z.propres) / max}%"></b><s style="width:${(100 * z.recues) / max}%"></s></span>
      <span class="db-zi">${z.arrete ? '<span title="Arrestation">🚔</span>' : ''}${z.juste ? '<span title="A démasqué l’auteur">⭐</span>' : ''}${z.accuse != null && !z.juste ? '<span title="Fausse accusation">✗</span>' : ''}${z.donnees ? `<span class="db-don" title="Pièces données">↗${z.donnees}</span>` : ''}</span>
    </div>`).join('')}</div>
    <p class="db-leg"><span><b class="amb"></b>trouvées</span><span><b class="bleu"></b>reçues</span><span>↗ données</span><span>⭐ démasqué</span><span>✗ fausse piste</span></p>
  </section>`;
}

function chronoHtml(db, me) {
  if (!db.chrono.length) return '';
  const jours = [...new Set(db.chrono.map((c) => c.j || 0))].sort((a, b) => (a || 99) - (b || 99));
  const ico = { cle: '🧩', rebond: '📣', faux: '✗', decouverte: '⭐' };
  const fin = db.issue === 'arrestation' ? `🚔 Arrêté${db.coupable.f ? 'e' : ''} à « ${esc(db.planque ? db.planque.nom : '?')} »`
    : db.issue === 'fuite' ? '💨 En fuite' : db.issue === 'classee' ? '🗄️ Classée sans suite' : '🗣️ Aveux';
  return `<section class="db-sec"><h3 class="db-h">Chronologie</h3><ol class="db-chrono">
    ${jours.map((j) => `<li><span class="db-cj">${j ? `J${j}` : '—'}</span><div>${db.chrono.filter((c) => (c.j || 0) === j).map((c) => `<p class="db-ce ${c.t}"><span aria-hidden="true">${ico[c.t] || '·'}</span> ${esc(c.txt)}${(c.zones || []).length ? ` <span class="db-par">${c.zones.map((n) => esc(n.replace(/^ZP /, ''))).join(', ')}</span>` : ''}</p>`).join('')}</div></li>`).join('')}
    <li class="fin"><span class="db-cj">${db.issue === 'classee' ? `J${db.jours || 7}` : db.issue === 'aveux' ? `J${db.jours}` : 'Nuit'}</span><div><p class="db-ce fin">${fin}</p></div></li>
  </ol></section>`;
}

export function renderDebrief() {
  const tous = debriefsRecents();
  const x = tous.find((d) => d.id === S.debriefId) || tous[0];
  const retour = `<a href="#gazette" class="backlink">${icon('back', 20)}<span>Retour à la Gazette</span></a>`;
  if (!x) return `<main class="screen">${retour}<div class="card"><p class="small muted" style="margin:0">Aucun dossier clos récent. Le débrief d’une affaire paraît dans la Gazette le soir où elle se termine.</p></div></main>${tabbar('enquete')}`;
  const db = x.db, me = myZone();
  let aff = null;
  try { aff = affaire(S.state, db.n); if (aff && aff.titre !== db.titre) aff = null; } catch (e) { aff = null; }
  const [tampon, ton] = TAMPON[db.issue] || ['Close', 'vert'];
  const c = db.coupable, sc = suspectDe(aff, c.i, c);
  const auteur = db.cles.filter((k) => !k.planque), planque = db.cles.filter((k) => k.planque);
  const autres = tous.filter((d) => d.id !== x.id).slice(0, 3);
  return `<main class="screen db-ecran">
    ${retour}
    <article class="db-chemise">
      <div class="db-onglet">Dossier n° ${db.n}</div>
      <div class="db-feuille">
        <header class="db-tete">
          <span class="db-k">Dossier clos · ${db.meurtre ? 'meurtre' : 'vol'}</span>
          <h1>${esc(db.titre)}</h1>
          <span class="db-tampon ${ton}">${esc(tampon)}</span>
          <div class="db-stats">
            <span><b>${db.jours || '–'}</b>jour${(db.jours || 0) > 1 ? 's' : ''}</span>
            <span><b>${db.totaux.zones}</b>zone${db.totaux.zones > 1 ? 's' : ''}</span>
            <span><b>${db.totaux.pieces}</b>pièces trouvées</span>
            <span><b>${db.totaux.partages}</b>partagées</span>
          </div>
        </header>

        <section class="db-auteur">
          <div class="db-photo">${portraitSuspect(sc, c.i, 'db-face')}</div>
          <div class="db-id"><span class="db-k">L’auteur</span><h2>${esc(c.nom)}</h2><span class="db-role">${esc(c.role || '')}</span>
            <p>${esc(sousTitre(db))}</p></div>
        </section>

        <section class="db-sec"><h3 class="db-h">${db.meurtre ? `Les pièces qui ${c.f ? 'la' : 'le'} faisaient craquer` : `Ce qui ${c.f ? 'la' : 'le'} désignait`}</h3>
          <p class="db-aide">${db.meurtre ? 'Il fallait en opposer au moins deux à la confrontation.' : 'Le mobile, le moyen et l’occasion : seul l’auteur réunissait les trois.'} Touche une pièce pour la relire.</p>
          <div class="db-cles">${auteur.map((k) => piece(aff, k, db, me)).join('')}</div>
        </section>
        ${db.mobile ? `<section class="db-sec"><h3 class="db-h">Le vrai mobile</h3><p class="db-mobile">« ${esc(db.mobile.vrai)} »</p><p class="db-aide">${db.mobile.trouve.length ? `Compris par ${esc(db.mobile.trouve.join(', '))}.` : 'Personne ne l’avait deviné.'}</p></section>` : ''}
        ${db.planque ? `<section class="db-sec"><h3 class="db-h">La planque : ${esc(db.planque.nom)}</h3><p class="db-aide">${esc(db.planque.lieu || '')}. Les indices qui y menaient :</p>
          <div class="db-cles quatre">${planque.map((k) => piece(aff, k, db, me)).join('')}</div></section>` : ''}

        ${tonEnquete(db, me)}

        <section class="db-sec"><h3 class="db-h">Les fausses pistes</h3>
          ${db.theatre ? `<p class="db-aide">📣 Le coup de théâtre du jour 3 ${db.theatre.juste ? `visait juste : ${esc(db.theatre.nom)} était bien l’auteur.` : `était un piège : ${esc(db.theatre.nom)} était innocent${aff && aff.suspects[db.theatre.i] && aff.suspects[db.theatre.i].f ? 'e' : ''}.`}</p>` : ''}
          <div class="db-pistes">${db.pistes.map((p) => {
            const s = suspectDe(aff, p.i, p);
            const ecarte = p.pieces.length ? p.pieces : [];
            return `<div class="db-piste${db.theatre && !db.theatre.juste && db.theatre.i === p.i ? ' theatre' : ''}">
              <div class="db-mini">${portraitSuspect(s, p.i, 'db-face')}</div>
              <div class="db-pi">
                <span class="db-pn">${esc(p.nom)} <small>${esc(p.role || '')}</small></span>
                ${ecarte.length ? `<span class="db-pe">Écarté${p.f ? 'e' : ''} par ${ecarte.map((k) => `« ${esc(k.titre)} »`).join(' + ')}</span>
                  <span class="db-cle-q">${ecarte.map((k) => trouveur(k, db, me)).join(' ')}</span>` : ''}
                ${p.accusePar.length ? `<span class="db-faux">✗ accusé${p.f ? 'e' : ''} à tort par ${p.accusePar.map((u) => esc(nomCourt(u, db))).join(', ')}</span>` : ''}
              </div></div>`;
          }).join('')}</div>
        </section>

        ${zonesHtml(db, me)}
        ${chronoHtml(db, me)}
        <p class="db-pied">Le récit complet de l’affaire (et ce que cachaient les innocents) est dans la Gazette n° ${esc(String(x.g.turn))}.</p>
      </div>
    </article>
    ${autres.length ? `<section class="col" style="gap:8px"><span class="kicker">Autres dossiers clos</span>${autres.map((d) => lienDebrief(d, { compact: true })).join('')}</section>` : ''}
  </main>${tabbar('enquete')}`;
}
