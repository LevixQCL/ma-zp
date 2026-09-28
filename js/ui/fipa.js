// Cartes FIPA affichées sur l'écran HP.
import { S, esc, myZone, zoneName } from './common.js';
import { fipaPour, invitationImpossible, fiabilite, PARTAGE, FIPA } from '../engine/fipa.js';

const pct = (x) => `${Math.round(x * 100)} %`;

function matrice(f) {
  const r = f.recompense;
  const k = (a, b) => { const [x] = PARTAGE[`${a}/${b}`]; return `${Math.round(r * x * 10) / 10} k€`; };
  return `<div class="fipa-grid" role="table" aria-label="Ce que tu touches selon les deux choix">
    <span class="h" role="columnheader">Toi \\ l’autre</span><span class="h" role="columnheader">partage</span><span class="h" role="columnheader">revendique</span>
    <span class="h" role="rowheader">Partager</span><span>${k('partager', 'partager')}<br><span class="tiny good">+2 réputation</span></span><span>${k('partager', 'revendiquer')}</span>
    <span class="h" role="rowheader">Revendiquer</span><span>${k('revendiquer', 'partager')}</span><span>${k('revendiquer', 'revendiquer')}<br><span class="tiny bad">bourgmestre fâché</span></span>
  </div>`;
}

export function fipaCards() {
  const st = S.state, z = myZone(), d = S.draft;
  const T = st.turn;
  return fipaPour(st, z.uid).map((f) => {
    const A = st.zones[f.demandeur], B = f.partenaire ? st.zones[f.partenaire] : null;
    const moiDemandeur = f.demandeur === z.uid;
    const head = `<div class="between"><span class="kicker">FIPA · demande du bourgmestre</span><span class="pill amber">${f.recompense} k€ en jeu</span></div>
      <h2 class="card-title" style="margin:0">${esc(f.titre)}</h2><p class="small" style="margin:0;color:var(--amber-soft)">${esc(f.texte)} Besoin : ${f.besoin} agents à deux zones.</p>`;

    // 1. Le demandeur choisit sa zone partenaire.
    if (f.etape === 'demande' && moiDemandeur && f.tourDecision === T) {
      const o = d.fipa && d.fipa.id === f.id ? d.fipa : { id: f.id, invite: '', moi: Math.ceil(f.besoin / 2), lui: Math.floor(f.besoin / 2) };
      const zones = Object.values(st.zones).filter((x) => x.uid !== z.uid).sort((a, b) => a.code.localeCompare(b.code));
      const total = o.moi + o.lui;
      return `<section class="card amber" aria-label="FIPA">${head}
        <label class="field">Zone partenaire
          <select class="text" data-change="fipa-invite" data-id="${f.id}" style="min-height:44px;font-size:14px">
            <option value="">Choisir une zone…</option>
            ${zones.map((x) => { const r = invitationImpossible(st, f, x.uid); return `<option value="${esc(x.uid)}" ${o.invite === x.uid ? 'selected' : ''} ${r ? 'disabled' : ''}>${zoneName(x)} · fiabilité : ${fiabilite(x)}${r ? ` (${r})` : ''}</option>`; }).join('')}
          </select></label>
        <div class="between"><span class="small">Tes agents</span><span class="stepper"><button type="button" data-action="fipa-n" data-k="moi" data-d="-1" data-id="${f.id}" aria-label="Un agent de moins pour toi">−</button><span class="n">${o.moi}</span><button type="button" data-action="fipa-n" data-k="moi" data-d="1" data-id="${f.id}" aria-label="Un agent de plus pour toi">+</button></span></div>
        <div class="between"><span class="small">Agents demandés au partenaire</span><span class="stepper"><button type="button" data-action="fipa-n" data-k="lui" data-d="-1" data-id="${f.id}" aria-label="Un agent de moins pour le partenaire">−</button><span class="n">${o.lui}</span><button type="button" data-action="fipa-n" data-k="lui" data-d="1" data-id="${f.id}" aria-label="Un agent de plus pour le partenaire">+</button></span></div>
        <p class="tiny ${total < f.besoin ? 'bad' : 'muted'}" style="margin:0">${total < f.besoin ? `Il manque ${f.besoin - total} agent${f.besoin - total > 1 ? 's' : ''} pour couvrir le dispositif.` : `Invitation envoyée à 20:00. Le partenaire répond demain ; jour J après-demain. Sans invitation : −4 de satisfaction.`}</p>
      </section>`;
    }
    // 2. Le partenaire accepte ou refuse.
    if (f.etape === 'invite' && f.partenaire === z.uid && f.tourReponse === T) {
      const r = d.fipaReponse && d.fipaReponse.id === f.id ? d.fipaReponse.accepte : null;
      return `<section class="card amber" aria-label="Invitation FIPA">${head}
        <p class="small" style="margin:0"><strong>${zoneName(A)}</strong> t’invite : ${f.moi} agents de son côté, <strong>${f.lui} du tien</strong> demain. Sa fiabilité : ${fiabilite(A)}.</p>
        <div class="choices"><button type="button" class="choice" data-action="fipa-rep" data-id="${f.id}" data-v="1" aria-pressed="${r === true}">Accepter</button>
          <button type="button" class="choice" data-action="fipa-rep" data-id="${f.id}" data-v="0" aria-pressed="${r === false}">Refuser</button></div>
        <p class="tiny muted" style="margin:0">Sans réponse à 20:00, l’invitation est considérée comme refusée.</p>
      </section>`;
    }
    // 3. Jour J : choix secret.
    if (f.etape === 'accepte' && f.tourJ === T) {
      const autre = moiDemandeur ? B : A;
      const mesAgents = moiDemandeur ? f.moi : f.lui;
      const c = d.fipaChoix && d.fipaChoix.id === f.id ? d.fipaChoix.choix : 'partager';
      return `<section class="card amber" aria-label="FIPA jour J">${head}
        <p class="small" style="margin:0">Jour J avec <strong>${zoneName(autre)}</strong> (fiabilité : ${fiabilite(autre)}). ${mesAgents} de tes agents sont mobilisés ce soir, pris d’abord en Proximité.</p>
        <span class="small" style="font-weight:600">Ton choix secret, révélé dans la Gazette :</span>
        <div class="choices"><button type="button" class="choice" data-action="fipa-choix" data-id="${f.id}" data-v="partager" aria-pressed="${c === 'partager'}">Partager<span class="s">moitié chacun</span></button>
          <button type="button" class="choice" data-action="fipa-choix" data-id="${f.id}" data-v="revendiquer" aria-pressed="${c === 'revendiquer'}">Revendiquer<span class="s">tout le mérite</span></button></div>
        ${matrice(f)}
        <p class="tiny muted" style="margin:0"><a href="#guide-fipa">Règles des FIPA</a> · Montants si le dispositif est complet (moitié si incomplet). Ta fiabilité compte les FIPA où tu as partagé et envoyé tous tes agents.</p>
      </section>`;
    }
    // En attente.
    const attente = f.etape === 'demande' ? 'demande à traiter au prochain tour'
      : f.etape === 'invite' ? (moiDemandeur ? `en attente de la réponse de ${zoneName(B)}` : 'invitation reçue : réponse au prochain tour')
        : `jour J ${f.tourJ === T + 1 ? 'demain' : `au tour ${f.tourJ}`} avec ${zoneName(moiDemandeur ? B : A)}`;
    return `<section class="card tight" aria-label="FIPA"><span class="kicker">FIPA · ${esc(f.titre)}</span><span class="small muted">${attente}</span></section>`;
  }).join('');
}

/** Agents qui partiront en FIPA ce soir (pour l'écran des ordres). */
export function agentsFipaCeSoir() {
  const st = S.state, z = myZone();
  return fipaPour(st, z.uid).filter((f) => f.etape === 'accepte' && f.tourJ === st.turn).reduce((s, f) => s + (f.demandeur === z.uid ? f.moi : f.lui), 0);
}

export { FIPA, pct };
