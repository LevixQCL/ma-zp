// Onglet Brigade › Matériel (oct. 2026) : le magasin et l'armurerie de la zone.
// Les commandes partent avec les ordres du soir (S.draft.materiel) ; tout se règle au tour de 20:00 (engine/materiel.js).
import { S, esc, myZone, fmtK } from './common.js';
import { MAT, ARTICLES, creerMateriel, giletsValides, certifiesActifs, tasersActifs, trouGilets, facteurGilets, prixMarche, gammeDe, surplus } from '../engine/materiel.js';

const IMG = (k) => `img/materiel/${k}.webp`;
const ico = (k, c = '') => `<img class="mat-ico${c ? ` ${c}` : ''}" src="${IMG(k)}" alt="" loading="lazy">`;

export const ordresMatVides = () => ({ masse: [], commandes: [], lancer: null, adherer: [], certifier: false, ceder: [] });
function om() { if (!S.draft) return ordresMatVides(); return (S.draft.materiel ||= ordresMatVides()); }

/** Dotation de la zone (avant son premier tour avec le magasin : celle qu'elle recevra ce soir). */
export const matDe = (z) => z.materiel || creerMateriel(z, S.state ? S.state.turn : 1);

/** Quelque chose à faire au magasin (pastille de l'onglet) : gilets qui périment sous 2 jours sans commande, masse pleine. */
export function materielAFaire() {
  const z = myZone(); if (!z || !z.materiel || !S.state) return false;
  const m = z.materiel, T = S.state.turn, o = (S.draft && S.draft.materiel) || ordresMatVides();
  const enCmd = (m.commandes || []).filter((c) => c.item.startsWith('gilets')).reduce((s, c) => s + c.lots * MAT.gilets.lot, 0)
    + o.commandes.filter((c) => c.item.startsWith('gilets')).reduce((s, c) => s + c.lots * MAT.gilets.lot, 0)
    + ((S.state.marches || []).filter((x) => !x.clos && x.part[z.uid] && x.item.startsWith('gilets')).reduce((s, x) => s + x.part[z.uid] * MAT.gilets.lot, 0))
    + o.adherer.length * MAT.gilets.lot;
  const valides2 = (m.gilets || []).filter((g) => g.fin > T + 2).reduce((s, g) => s + g.n, 0);
  return valides2 + enCmd < (z.agents || 0) || (m.masse >= MAT.masse.max && !o.masse.length);
}

/** La grille des gilets : un petit gilet par agent, dans l'ordre de péremption. */
function grilleGilets(m, z, T) {
  const n = z.agents || 0, cases = [];
  for (const g of (m.gilets || []).filter((x) => x.fin > T).sort((a, b) => a.fin - b.fin)) {
    for (let i = 0; i < g.n && cases.length < n; i++) cases.push({ k: g.m === 'ajuste' ? 'aj' : g.fin <= T + 2 ? 'per' : 'ok', fin: g.fin });
  }
  while (cases.length < n) cases.push({ k: 'sans' });
  const titre = { ok: 'valide', per: 'périme bientôt', sans: 'sans gilet valide', aj: 'gilet ajusté' };
  return `<div class="mat-gilets" role="img" aria-label="${giletsValides(m, T).total} gilets valides sur ${n} agents">${cases.map((c) => `<span class="mg ${c.k}" title="${titre[c.k]}${c.fin ? `, valable jusqu’au jour ${c.fin}` : ''}"><img src="${IMG(c.k === 'aj' ? 'gilets_ajustes' : 'gilets')}" alt=""></span>`).join('')}</div>`;
}

function boutonCmd(item, voie, label) {
  const o = om(), a = ARTICLES[item], v = MAT.voies[voie];
  const c = o.commandes.find((x) => x.item === item && x.voie === voie);
  const prix = a.prix * v.mult * (c ? c.lots * gammeDe(c.q).prix : 1);
  return `<button type="button" class="btn small${c ? ' on' : ' ghost'}" data-action="mat-cmd" data-k="${item}" data-v="${voie}" aria-pressed="${!!c}">${esc(label)} · ${fmtK(prix)}</button>`;
}
function stepper(item) {
  const c = om().commandes.find((x) => x.item === item);
  if (!c) return '';
  const a = ARTICLES[item];
  return `<div class="mat-step"><button type="button" class="btn small ghost" data-action="mat-lots" data-k="${item}" data-d="-1" aria-label="Un lot de moins">−</button>
    <span><b>${c.lots}</b> lot${c.lots > 1 ? 's' : ''} · ${c.lots * a.lot} ${esc(a.nom.toLowerCase())}</span>
    <button type="button" class="btn small ghost" data-action="mat-lots" data-k="${item}" data-d="1" aria-label="Un lot de plus" ${c.lots >= MAT.lotsMax ? 'disabled' : ''}>+</button></div>
    <div class="mat-gamme" role="group" aria-label="Fournisseur">${Object.entries(MAT.gammes).map(([k, q]) => `<button type="button" class="${(c.q || 'std') === k ? 'on' : ''}" data-action="mat-gamme" data-k="${item}" data-q="${k}" aria-pressed="${(c.q || 'std') === k}"><b>${esc(q.nom)}</b><span>${q.prix === 1 ? 'prix normal' : `${q.prix < 1 ? '−' : '+'}${Math.round(Math.abs(1 - q.prix) * 100)} %`}${item.startsWith('gilets') ? ` · ${q.validite} j` : ''}${q.defaut ? ` · ${Math.round(q.defaut * 100)} % de lots recalés` : ' · jamais recalé'}</span></button>`).join('')}</div>`;
}

export function materielVueHtml() {
  const z = myZone(), st = S.state, T = st.turn, m = matDe(z), o = om(), n = z.agents || 0;
  const g = giletsValides(m, T), bientot = (m.gilets || []).filter((x) => x.fin > T && x.fin <= T + 2).reduce((s, x) => s + x.n, 0);
  const fg = facteurGilets({ ...z, materiel: m }, T), trou = trouGilets({ ...z, materiel: m }, T);
  const enCmd = (m.commandes || []).map((c) => `${c.lots * ARTICLES[c.item].lot} ${ARTICLES[c.item].nom.toLowerCase()} (${c.arrive <= T + 1 ? 'demain soir' : `dans ${c.arrive - T} jours`})`);
  const tenueTxt = m.tenue >= 75 ? 'Tenue neuve : moral +0,8 par jour.' : m.tenue >= 45 ? 'Tenue correcte.' : m.tenue >= 25 ? 'Tenue usée : moral −1 par jour.' : 'Tenue en lambeaux : moral −1,5 par jour.';
  const coul = (v, a, b) => (v >= a ? 'var(--green)' : v >= b ? 'var(--amber)' : 'var(--red)');
  const marches = (st.marches || []).filter((x) => !x.clos && x.ferme >= T);
  const monMarche = marches.find((x) => x.lanceur === z.uid);
  const nomZ = (u) => (u === z.uid ? 'ta zone' : (st.zones[u] && st.zones[u].nom) || 'une zone');

  return `<section class="col" style="gap:10px" aria-label="Magasin et armurerie">
    <div class="mat-banner"><img src="${IMG('banniere')}" alt="Le magasin et l’armurerie">
      <div class="mat-etat"><div><b>${g.total}/${n}</b>gilets valides</div><div><b>${m.masse}</b>pts de masse</div><div><b>${tasersActifs(m, T)}</b>taser${tasersActifs(m, T) > 1 ? 's' : ''} en service</div><div><b>${m.bodycam || 0}</b>bodycams</div></div></div>

    <section class="card mat-bloc${fg < 1 || bientot ? ' alerte' : ''}">
      <div class="mat-tete">${ico('gilets', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Gilets pare-balles</b><span class="tiny muted">${g.total} valides sur ${n} agents${g.ajustes ? `, dont ${g.ajustes} ajustés` : ''}</span></div></div>
      ${grilleGilets(m, z, T)}
      <div class="mat-leg"><span class="ok">valide</span><span class="per">périme sous 2 jours</span><span class="sans">sans gilet</span><span class="aj">ajusté</span></div>
      <p class="small" style="margin:0">${fg < 1 ? `<b style="color:var(--red)">${Math.round(trou * 100)} % d’agents sans gilet valide : ils refusent les interventions à risque (Intervention −${Math.round((1 - fg) * 100)} %).</b>` : bientot ? `<b>${bientot} gilets périment d’ici deux jours.</b> La centrale livre en ${MAT.voies.centrale.delai} jours, la procédure négociée dès demain soir (plus cher).` : 'Tout le monde est couvert. Un gilet valide arrête souvent le coup quand une intervention tourne mal, mais il peut y rester (coup de couteau, impact).'}</p>
      <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('gilets', 'centrale', `Centrale (${MAT.voies.centrale.delai} j)`)}${boutonCmd('gilets', 'negociee', 'Négociée (demain)')}${boutonCmd('gilets_ajustes', 'centrale', 'Ajustés')}</div>
      ${stepper('gilets')}${stepper('gilets_ajustes')}
      <span class="tiny muted">Un lot = ${MAT.gilets.lot} gilets, valables de ${MAT.gammes.eco.validite} à ${MAT.gammes.qualite.validite} jours selon le fournisseur. Ajustés (port discret) : moins de blessures et meilleur moral. La centrale peut annoncer un retard (rupture de stock).</span>
      ${m.inspection ? `<span class="tiny ${m.inspection.ok ? 'muted' : ''}" style="${m.inspection.ok ? '' : 'color:var(--amber)'}">Dernière inspection surprise : jour ${m.inspection.t}, ${m.inspection.ok ? 'rien à signaler' : 'remarques (voir le rapport de ce soir-là)'}.</span>` : '<span class="tiny muted">Une inspection surprise peut passer : gilets périmés en service et masse inutilisée sont sanctionnés.</span>'}
    </section>

    <section class="card mat-bloc">
      <div class="mat-tete">${ico('tenue', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Tenue</b><span class="tiny muted">masse d’habillement : ${m.masse}/${MAT.masse.max} points, +${MAT.masse.parJour} par jour</span></div>${ico('chaussures', 's')}</div>
      <div class="mat-jauge"><span>Polos, t-shirts</span><span class="barre"><i style="width:${m.tenue}%;background:${coul(m.tenue, 75, 45)}"></i></span><b>${m.tenue}</b></div>
      <div class="mat-jauge"><span>Chaussures</span><span class="barre"><i style="width:${m.chaussures}%;background:${coul(m.chaussures, 50, 25)}"></i></span><b>${m.chaussures}</b></div>
      <p class="small" style="margin:0">${tenueTxt}${m.chaussures < 50 ? ' Chaussures usées : plus de blessures.' : ''}</p>
      <span class="tiny muted">Usure${m.usureJour ? ` hier : tenue −${String(m.usureJour.tenue).replace('.', ',')}, chaussures −${String(m.usureJour.chaussures).replace('.', ',')}` : ''}. La tenue s’use plus vite en rythme renforcé, les chaussures avec tes agents sur le terrain (Intervention, Roulage, Proximité). Chaque recrue apporte ${MAT.masseRecrue} point de masse pour sa tenue.</span>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <button type="button" class="btn small${o.masse.includes('tenue') ? ' on' : ' ghost'}" data-action="mat-masse" data-k="tenue" ${m.masse < MAT.tenue.cout && !o.masse.includes('tenue') ? 'disabled' : ''}>Polos neufs · ${MAT.tenue.cout} pts</button>
        <button type="button" class="btn small${o.masse.includes('chaussures') ? ' on' : ' ghost'}" data-action="mat-masse" data-k="chaussures" ${m.masse < MAT.chaussures.cout && !o.masse.includes('chaussures') ? 'disabled' : ''}>Chaussures · ${MAT.chaussures.cout} pts</button>
      </div>
      <span class="tiny muted">Les points non utilisés sont perdus en fin de saison.</span>
    </section>

    <section class="card mat-bloc">
      <b>Armement et équipements</b>
      <div class="mat-item">${ico('taser')}<div><span class="small"><b>Taser</b> : ${m.taser || 0} en armurerie, ${certifiesActifs(m, T)} agents brevetés, ${tasersActifs(m, T)} en service. ${tasersActifs(m, T) ? 'Ouvre « Neutraliser au taser » sur l’appel du jour (arme, fuite, foule).' : (m.taser ? `Il faut ${MAT.taser.cert.agents} agents brevetés par taser en service.` : 'Ouvre une nouvelle approche sur l’appel du jour.')}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('taser', 'centrale', 'Centrale')}<button type="button" class="btn small${o.certifier ? ' on' : ' ghost'}" data-action="mat-cert" ${!m.taser ? 'disabled' : ''}>Breveter ${MAT.taser.cert.agents} agents · ${fmtK(MAT.taser.cert.prix)}</button></div>${stepper('taser')}
        <span class="tiny muted">Brevet taser : ${MAT.taser.cert.agents} agents en formation un jour, valable ${MAT.taser.cert.validite} jours (recyclage ensuite).</span></div></div>
      <div class="mat-item">${ico('bodycam')}<div><span class="small"><b>Bodycams</b> : ${m.bodycam || 0}. ${(m.bodycam || 0) >= MAT.bodycam.lot ? 'Satisfaction en hausse chaque jour, approches « procédure » +5 %.' : `Moins de plaintes, approches « procédure » plus sûres. Entretien : ${fmtK(MAT.bodycam.entretien)} par jour et par lot.`}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('bodycam', 'centrale', `Lot de ${MAT.bodycam.lot}, centrale`)}</div>${stepper('bodycam')}</div></div>
      <div class="mat-item">${ico('gnep')}<div><span class="small"><b>Casques et boucliers</b> : ${m.gnep || 0}. Ouvre « Cordon casqué » face aux foules. Au non-droit : force +8 % et moins de blessés s’il y en a pour tous tes agents engagés ; pour moins de la moitié, plus de blessés.</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('gnep', 'centrale', `Lot de ${MAT.gnep.lot}, centrale`)}</div>${stepper('gnep')}</div></div>
      <span class="tiny muted">Une intervention qui tourne mal peut abîmer le matériel : taser cassé, bodycam arrachée, casque fendu.</span>
    </section>

    <section class="card mat-bloc">
      <div class="mat-tete">${ico('marche', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Marchés du district</b><span class="tiny muted">−${Math.round(MAT.marche.remiseParZone * 100)} % par zone qui adhère, jusqu’à −${Math.round(MAT.marche.remiseMax * 100)} %</span></div></div>
      ${marches.map((x) => { const nz = Object.keys(x.part).length, a = ARTICLES[x.item], moi = !!x.part[z.uid], veut = o.adherer.find((y) => y.id === x.id);
        return `<div class="mat-marche"><div class="col" style="gap:2px;min-width:0"><span class="small"><b>${esc(a.nom)}</b> · lancé par ${esc(nomZ(x.lanceur))}</span><span class="tiny muted">${nz} zone${nz > 1 ? 's' : ''} · −${Math.round((1 - prixMarche(nz)) * 100)} % · clôture ${x.ferme === T ? 'ce soir' : x.ferme - T === 1 ? 'demain soir' : `dans ${x.ferme - T} jours`}${moi ? ` · ta part : ${x.part[z.uid]} lot${x.part[z.uid] > 1 ? 's' : ''}` : ''}</span></div>
          ${moi ? '<span class="tiny muted">inscrit</span>' : `<button type="button" class="btn small${veut ? ' on' : ' ghost'}" data-action="mat-adh" data-id="${esc(x.id)}">${veut ? `Adhérer (${veut.lots} lot${veut.lots > 1 ? 's' : ''})` : 'Adhérer'}</button>`}</div>`; }).join('') || '<p class="tiny muted" style="margin:0">Aucun marché ouvert. Lance le tien : les autres zones pourront y adhérer pendant deux jours et tout le monde paiera moins cher.</p>'}
      <div class="row" style="gap:6px;flex-wrap:wrap">${['gilets', 'taser', 'bodycam', 'gnep'].map((k) => `<button type="button" class="btn small${o.lancer && o.lancer.item === k ? ' on' : ' ghost'}" data-action="mat-lancer" data-k="${k}" ${monMarche ? 'disabled' : ''}>Lancer : ${esc(ARTICLES[k].nom.toLowerCase())}</button>`).join('')}</div>
      ${o.lancer ? `<div class="mat-step"><button type="button" class="btn small ghost" data-action="mat-lancer-lots" data-d="-1" aria-label="Un lot de moins">−</button><span>Ta part : <b>${o.lancer.lots}</b> lot${o.lancer.lots > 1 ? 's' : ''}</span><button type="button" class="btn small ghost" data-action="mat-lancer-lots" data-d="1" aria-label="Un lot de plus">+</button></div>` : ''}
      <span class="tiny muted">Payé à la clôture, livré ${MAT.marche.livraison} jours après. Celui qui lance gagne ${MAT.marche.psLanceur} PS par zone qui adhère.</span>
    </section>

    ${entreZonesHtml(z, T, o)}
    ${enCmd.length ? `<section class="card mat-bloc"><div class="mat-tete">${ico('marche', 's')}<div class="col grow" style="gap:1px"><b>Livraisons attendues</b><span class="small">${esc(enCmd.join(' · '))}</span></div></div></section>` : ''}
    ${m.hs ? `<p class="tiny muted" style="margin:0">${m.hs} objet${m.hs > 1 ? 's' : ''} perdu${m.hs > 1 ? 's' : ''} en intervention depuis le début de la saison.</p>` : ''}
    <p class="tiny muted" style="margin:0">Les commandes partent avec tes ordres du soir et sont payées à 20:00 si le budget le permet.</p>
  </section>`;
}

/** Entre zones : tes surplus, les zones qui manquent de gilets, ce que tu leur cèdes ce soir. */
function entreZonesHtml(z, T, o) {
  const st = S.state, sp = surplus({ ...z, materiel: matDe(z) }, T);
  const manquent = Object.values(st.zones || {}).filter((x) => x.uid !== z.uid && x.materiel && trouGilets(x, T) > 0.2)
    .map((x) => ({ x, t: trouGilets(x, T), besoin: Math.ceil(trouGilets(x, T) * (x.agents || 0)) })).sort((a, b) => b.t - a.t).slice(0, 4);
  const lignes = manquent.map(({ x, t, besoin }) => {
    const c = (o.ceder || []).find((y) => y.cible === x.uid && y.item === 'gilets');
    const n = Math.min(sp.gilets, besoin);
    return `<div class="mat-marche"><div class="col" style="gap:2px;min-width:0"><span class="small"><b>${esc(x.nom || 'Zone')}</b> : ${besoin} agent${besoin > 1 ? 's' : ''} sans gilet</span><span class="tiny muted">${t > MAT.gilets.refus ? 'ses agents refusent les interventions à risque' : 'bientôt en difficulté'}</span></div>
      ${n > 0 ? `<button type="button" class="btn small${c ? ' on' : ' ghost'}" data-action="mat-ceder" data-cible="${esc(x.uid)}" data-n="${n}">${c ? `${c.n} gilets cédés ce soir` : `Céder ${n} gilet${n > 1 ? 's' : ''}`}</button>` : '<span class="tiny muted">pas de surplus</span>'}</div>`;
  }).join('');
  return `<section class="card mat-bloc"><div class="mat-tete">${ico('gilets', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Entre zones</b><span class="tiny muted">ton surplus : ${sp.gilets} gilet${sp.gilets > 1 ? 's' : ''}, ${sp.taser} taser${sp.taser > 1 ? 's' : ''} en réserve</span></div></div>
    ${lignes || '<p class="tiny muted" style="margin:0">Aucune zone ne manque de gilets pour l’instant.</p>'}
    <span class="tiny muted">Céder ton surplus rapporte ${MAT.ceder.psPar === 2 ? '1 PS par 2 objets' : 'des PS'} (${MAT.ceder.psMax} au plus), et +${MAT.ceder.rep} de réputation si ses agents refusaient déjà les interventions.</span></section>`;
}

/** Clics de la vue Matériel. Renvoie true si l'action a été traitée. */
export function actionMateriel(a, el) {
  if (!a.startsWith('mat-') || !S.draft) return false;
  const o = om(), z = myZone(), m = matDe(z);
  if (a === 'mat-masse') { const k = el.dataset.k; o.masse = o.masse.includes(k) ? o.masse.filter((x) => x !== k) : [...o.masse, k]; if (o.masse.reduce((s, x) => s + MAT[x].cout, 0) > m.masse) o.masse = o.masse.filter((x) => x !== k); }
  if (a === 'mat-cmd') {
    const k = el.dataset.k, v = el.dataset.v, i = o.commandes.findIndex((c) => c.item === k && c.voie === v);
    if (i >= 0) o.commandes.splice(i, 1);
    else {
      o.commandes = o.commandes.filter((c) => c.item !== k);
      let lots = 1;
      if (k.startsWith('gilets')) { const T = S.state.turn; const dans = (m.gilets || []).filter((g) => g.fin > T + MAT.voies[v].delai).reduce((s, g) => s + g.n, 0); lots = Math.max(1, Math.min(MAT.lotsMax, Math.ceil(((z.agents || 0) - dans) / MAT.gilets.lot))); }
      o.commandes.push({ item: k, lots, voie: v });
    }
  }
  if (a === 'mat-lots') { const c = o.commandes.find((x) => x.item === el.dataset.k); if (c) c.lots = Math.max(1, Math.min(MAT.lotsMax, c.lots + Number(el.dataset.d))); }
  if (a === 'mat-cert') o.certifier = !o.certifier;
  if (a === 'mat-gamme') { const c = o.commandes.find((x) => x.item === el.dataset.k); if (c) c.q = el.dataset.q; }
  if (a === 'mat-ceder') { o.ceder ||= []; const u = el.dataset.cible, i = o.ceder.findIndex((x) => x.cible === u); if (i >= 0) o.ceder.splice(i, 1); else if (o.ceder.length < 2) o.ceder.push({ cible: u, item: 'gilets', n: Number(el.dataset.n) || 0 }); }
  if (a === 'mat-adh') { const id = el.dataset.id, i = o.adherer.findIndex((x) => x.id === id); if (i >= 0) o.adherer.splice(i, 1); else o.adherer.push({ id, lots: 2 }); }
  if (a === 'mat-lancer') o.lancer = o.lancer && o.lancer.item === el.dataset.k ? null : { item: el.dataset.k, lots: 2 };
  if (a === 'mat-lancer-lots' && o.lancer) o.lancer.lots = Math.max(1, Math.min(MAT.lotsMax, o.lancer.lots + Number(el.dataset.d)));
  S.ordersDirty = true;
  return true;
}
