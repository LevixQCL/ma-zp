// La relève, côté joueur : suspect reçu (prendre, décliner, transmettre), appui à envoyer, saisie à partager.
import { S, esc, myZone } from './common.js';
import { RELEVE, releveRecue, relevesLancees, saisieAChoisir, ciblesTransmission } from '../engine/releve.js';
import { carteQuartiers } from '../engine/quartiers.js';
import { agentsDisponibles } from '../engine/zone.js';

const nomZ = (u) => { const z = S.state.zones[u]; return z ? `ZP ${esc(z.code)} ${esc(z.nom)}` : 'une zone voisine'; };
const Maj = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** Lignes de la liste « avant ce soir ». */
export function releveTodos() {
  const st = S.state, z = myZone(), d = S.draft || {}, out = [];
  if (!st || !z) return out;
  const r = releveRecue(st, z.uid);
  if (r) out.push({ ok: !!(d.releve && d.releve.id === r.id), href: '#hp-releve', t: `Relève : ${esc(r.suspect)} file vers chez toi`, s: d.releve && d.releve.id === r.id ? { prendre: `tu le prends avec ${d.releve.agents} agents`, refuser: 'pas l’effectif : décliné', transmettre: 'transmis à une voisine' }[d.releve.choix] : 'le prendre, décliner ou transmettre' });
  const sz = saisieAChoisir(st, z.uid);
  if (sz) out.push({ ok: !!(d.saisie && d.saisie.id === sz.id), href: '#hp-releve', t: 'Saisie à partager : choisis ta part', s: d.saisie && d.saisie.id === sz.id ? (d.saisie.part === 'voiture' ? 'la voiture' : 'l’argent') : 'l’argent ou la voiture (sans réponse : l’argent)' });
  return out;
}

/** Cartes de l'HP. */
export function releveHtml() {
  const st = S.state, z = myZone(), d = S.draft;
  if (!st || !z || !d) return '';
  const c = carteQuartiers(st), cartes = [];
  const r = releveRecue(st, z.uid);
  if (r) {
    const ch = d.releve && d.releve.id === r.id ? d.releve : null;
    const n = ch && ch.choix === 'prendre' ? ch.agents : RELEVE.requis;
    const dispo = agentsDisponibles(z, st.turn);
    const trans = ciblesTransmission(st, r);
    const g = RELEVE.gain.releve;
    cartes.push(`<section class="card releve" aria-label="Relève">
      <span class="kicker">Relève · ${esc(c.nomDe(Number(r.cell)))}</span>
      <p style="margin:0;font-weight:700">${esc(Maj(r.suspect))} a filé vers chez toi.</p>
      <p class="small" style="margin:0;color:var(--text2)">${r.par ? `${nomZ(r.par)} te transmet le suspect laissé par ${nomZ(r.origine)}` : `${esc(r.cause || 'Une opération voisine')} chez ${nomZ(r.origine)}`}. À toi de voir si tu as l’effectif.</p>
      <div class="rel-choix">
        <button type="button" class="dil-btn" data-action="releve" data-c="prendre" data-id="${esc(r.id)}" aria-pressed="${ch && ch.choix === 'prendre'}"><span class="t">Je le prends</span><span class="s">${RELEVE.min} à ${RELEVE.max} agents d’Intervention · ${RELEVE.requis} (appui compris) pour une capture sûre</span></button>
        <button type="button" class="dil-btn" data-action="releve" data-c="refuser" data-id="${esc(r.id)}" aria-pressed="${ch && ch.choix === 'refuser'}"><span class="t">Pas l’effectif</span><span class="s">je ne m’en occupe pas · aucune conséquence</span></button>
        ${trans.map((u) => `<button type="button" class="dil-btn" data-action="releve" data-c="transmettre" data-vers="${esc(u)}" data-id="${esc(r.id)}" aria-pressed="${!!(ch && ch.choix === 'transmettre' && ch.vers === u)}"><span class="t">Transmettre à ${nomZ(u)}</span><span class="s">elle décidera demain · une part du mérite pour toi</span></button>`).join('')}
      </div>
      ${ch && ch.choix === 'prendre' ? `<div class="between"><span class="small">Agents sur la relève</span><span class="stepper"><button type="button" data-action="releve-n" data-d="-1" ${n <= RELEVE.min ? 'disabled' : ''} aria-label="Un agent de moins">−</button><span class="n">${n}</span><button type="button" data-action="releve-n" data-d="1" ${n >= Math.min(RELEVE.max, dispo) ? 'disabled' : ''} aria-label="Un agent de plus">+</button></span></div>
        <p class="tiny muted" style="margin:0">Pris dans ton Intervention ce soir. Capture : +${g.points} pts, +${g.reputation} de réputation, +${g.satisfaction} de satisfaction, et parfois les félicitations du juge ou une saisie à partager. ${n < RELEVE.requis ? `À ${n}, il faut l’appui de ${nomZ(r.origine)} pour être sûr (sinon une chance sur deux à ${RELEVE.requis - 1}).` : ''}</p>` : ''}
      <p class="tiny muted" style="margin:0">${ch ? (S.ordersDirty ? 'Valide tes ordres pour l’envoyer.' : 'Choix enregistré avec tes ordres.') : 'Sans réponse à 20:00, le suspect s’évapore (sans conséquence).'}</p>
      ${ch && S.ordersDirty ? '<button type="button" class="btn primary small" data-action="save-orders">Valider mes ordres</button>' : ''}
    </section>`);
  }
  for (const x of relevesLancees(st, z.uid)) {
    const a = (d.releveAppui || []).find((y) => y.id === x.id);
    const n = a ? a.agents : 0;
    cartes.push(`<section class="card releve" aria-label="Appui à la relève">
      <span class="kicker">Ta relève · ${nomZ(x.vers)}</span>
      <p style="margin:0;font-weight:600">${esc(Maj(x.suspect))} a filé chez ${nomZ(x.vers)}. Elle décide ce soir si elle le prend.</p>
      <div class="between"><span class="small">Agents d’appui (si elle le prend)</span><span class="stepper"><button type="button" data-action="releve-appui" data-id="${esc(x.id)}" data-d="-1" ${n <= 0 ? 'disabled' : ''} aria-label="Un agent d’appui de moins">−</button><span class="n">${n}</span><button type="button" data-action="releve-appui" data-id="${esc(x.id)}" data-d="1" ${n >= RELEVE.appuiMax ? 'disabled' : ''} aria-label="Un agent d’appui de plus">+</button></span></div>
      <p class="tiny muted" style="margin:0">Chaque agent d’appui rapproche la capture et te rapporte +${RELEVE.gain.appui.points} pts de plus. Écris-lui sur la radio pour vous coordonner.</p>
    </section>`);
  }
  const sz = saisieAChoisir(st, z.uid);
  if (sz) {
    const p = d.saisie && d.saisie.id === sz.id ? d.saisie.part : null;
    cartes.push(`<section class="card releve" aria-label="Saisie à partager">
      <span class="kicker">Saisie à partager · avec ${nomZ(sz.origine)}</span>
      <p style="margin:0;font-weight:600">Chez ${esc(sz.suspect)} : de l’argent liquide et une voiture. Tu choisis en premier, ${nomZ(sz.origine)} reçoit l’autre part.</p>
      <div class="rel-choix">
        <button type="button" class="dil-btn" data-action="saisie" data-id="${esc(sz.id)}" data-v="argent" aria-pressed="${p === 'argent'}"><span class="t">L’argent</span><span class="s">+${RELEVE.saisie.argent} k€ ce soir</span></button>
        <button type="button" class="dil-btn" data-action="saisie" data-id="${esc(sz.id)}" data-v="voiture" aria-pressed="${p === 'voiture'}"><span class="t">La voiture</span><span class="s">une voiture anonymisée d’occasion pour ton parc (garage plein : revendue ${RELEVE.saisie.argentSiGaragePlein} k€)</span></button>
      </div>
      ${p && S.ordersDirty ? '<button type="button" class="btn primary small" data-action="save-orders">Valider mes ordres</button>' : ''}
    </section>`);
  }
  return cartes.length ? `<div id="hp-releve" class="col" style="gap:10px">${cartes.join('')}</div>` : '';
}

/** Actions des boutons (renvoie true si l'action est traitée). */
export function actionReleve(act, el) {
  const d = S.draft;
  if (!d) return false;
  if (act === 'releve') {
    const c = el.dataset.c, id = el.dataset.id, vers = el.dataset.vers || '';
    const deja = d.releve && d.releve.id === id && d.releve.choix === c && (c !== 'transmettre' || d.releve.vers === vers);
    d.releve = deja ? null : { id, choix: c, agents: c === 'prendre' ? RELEVE.requis : 0, vers };
  } else if (act === 'releve-n') {
    if (!d.releve) return true;
    const z = myZone();
    d.releve.agents = Math.max(RELEVE.min, Math.min(RELEVE.max, agentsDisponibles(z, S.state.turn), (d.releve.agents || RELEVE.requis) + Number(el.dataset.d)));
  } else if (act === 'releve-appui') {
    const id = el.dataset.id;
    const l = (d.releveAppui || []).filter((x) => x.id !== id);
    const n = Math.max(0, Math.min(RELEVE.appuiMax, (((d.releveAppui || []).find((x) => x.id === id) || {}).agents || 0) + Number(el.dataset.d)));
    d.releveAppui = n ? [...l, { id, agents: n }] : l;
  } else if (act === 'saisie') {
    const id = el.dataset.id, v = el.dataset.v;
    d.saisie = d.saisie && d.saisie.id === id && d.saisie.part === v ? null : { id, part: v };
  } else return false;
  S.ordersDirty = true;
  return true;
}
