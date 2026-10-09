// La semaine du chef (saison 2) : objectifs, rival, adjoint et retour d'absence, honneurs, carte à partager.
import { S, esc, myZone, zoneName } from './common.js';
import { reglesV2 } from '../engine/regles.js';
import { COMPETENCES, niveauChef, niveauxChef, totalNiveaux, signatureChef, TALENT, VOIES, IDS_COMPETENCES, faitsDArmes } from '../engine/chef.js';
import { OBJECTIFS, texteObjectif, RECOMPENSE, semaineDe, joursSemaine, scoreDuel, DUEL, CADRES, cadreDe, cadreSuivant, RUBANS, IDS_RUBANS, rubansDe } from '../engine/chef-semaine.js';
import { CONSIGNES, IDS_CONSIGNES, savoirFaire, ADJOINT } from '../engine/adjoint.js';
import { portraitChef, COUL_COMP } from './chef.js';
import { gradeFor, CLASSEMENT } from '../engine/constants.js';

const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const actif = (z) => !!(z && z.chef && S.state && reglesV2(S.state));

/** Portrait de l'adjoint (image du jeu de portraits). */
export function portraitAdjoint(a, taille = 40) {
  return `<span class="chef-portrait adj" style="--t:${taille}px;--zc:var(--line)"><img src="img/chefs/${esc(a.portrait)}.webp" alt="" width="${taille}" height="${taille}" loading="lazy"></span>`;
}

// ───── Pendant ton absence / Bon retour ─────
export function absenceHtml(z) {
  if (!actif(z) || !z.adjoint) return '';
  const a = z.adjoint, T = S.state.turn;
  const rc = z.retourChef && z.retourChef.tour === T - 1 ? z.retourChef : null;
  const journal = rc ? rc.journal : (z.toursSansOrdres >= 1 ? a.journal || [] : []);
  if (!journal.length) return '';
  const lignes = journal.slice(-5).map((j) => `<tr><td>J${j.t}</td><td><b>${fmt(j.ipz)}</b></td><td>${esc(j.inc)}</td><td>${j.moral}</td><td>${j.sat}</td></tr>`).join('');
  const tete = rc
    ? `<span class="kicker" style="color:var(--green, #3DD39A)">Bon retour, chef</span><span class="small">${esc(a.prenom)} t’a rendu les clés après ${rc.jours} jours. Pendant ${ADJOINT.retour.duree} jours, ton chef progresse 50 % plus vite, et tout le réseau est prêt à te rendre service.</span>`
    : `<span class="kicker">Pendant ton absence</span><span class="small">${esc(a.prenom)} ${esc(a.nom)} tient la zone depuis ${z.toursSansOrdres} jour${z.toursSansOrdres > 1 ? 's' : ''} (consigne « ${esc(CONSIGNES[a.consigne || 'equilibre'].nom.toLowerCase())} »). ${z.toursSansOrdres >= 2 ? `Envoie tes ordres pour reprendre la main${z.toursSansOrdres >= ADJOINT.retour.jours - 1 ? ' : au retour, le réseau te rendra service et ton chef progressera plus vite' : ''}.` : ''}</span>`;
  return `<section class="card adj-carte" aria-label="Ton adjoint">
    <div class="row" style="gap:10px;align-items:flex-start">${portraitAdjoint(a, 44)}<span class="col grow" style="gap:3px;min-width:0">${tete}</span></div>
    <table class="adj-journal"><thead><tr><th>Jour</th><th>IPZ</th><th>Incidents</th><th>Moral</th><th>Satisf.</th></tr></thead><tbody>${lignes}</tbody></table>
  </section>`;
}

// ───── Ta semaine : objectifs et rival ─────
export function semaineHtml(z) {
  if (!actif(z) || !z.chef.objectifs) return '';
  const st = S.state, o = z.chef.objectifs, T = st.turn, w = semaineDe(T), [, fin] = joursSemaine(w);
  if (o.w !== w) return '';
  const reste = fin - T + 1;
  const obj = o.liste.map((x) => { const O = OBJECTIFS[x.id]; if (!O) return ''; const c = COUL_COMP[O.comp];
    return `<div class="obj${x.fait ? ' fait' : ''}" style="--c:${c}"><span class="obj-ico">${x.fait ? '✅' : O.ico}</span>
      <span class="col grow" style="gap:3px;min-width:0"><span class="small" style="font-weight:600;line-height:1.25">${esc(texteObjectif(x))}</span>
        <span class="chef-barre"><span style="width:${Math.max(4, Math.round(x.prog / x.cible * 100))}%"></span></span></span>
      <span class="col" style="gap:0;align-items:flex-end;flex-shrink:0"><b class="mono">${x.prog}/${x.cible}</b><span class="tiny muted">${COMPETENCES[O.comp].ico} +${RECOMPENSE.xp[x.palier]} XP</span></span></div>`; }).join('');
  const nb = o.liste.filter((x) => x.fait).length, h = z.chef.hebdo;
  // Rival.
  const r = st.rivaux && st.rivaux.w === w && st.rivaux.cle === `${st.season}:${w}` && st.rivaux.paires[z.uid], zr = r && st.zones[r];
  let duel = '';
  if (zr) {
    const moi = scoreDuel(z, w), lui = scoreDuel(zr, w), tot = moi + lui || 1;
    const pr = (S.players && S.players[r]) || {};
    duel = `<button type="button" class="duel" data-action="bureau-ouvrir" data-u="${esc(r)}">
      <span class="tiny muted" style="font-weight:700;text-align:left">⚔️ Duel de la semaine · IPZ cumulé sur tes jours joués · ${reste > 1 ? `${reste} jours restants` : 'dernier soir'}</span>
      <span class="duel-face">${portraitChef(z.uid, 40, { galons: false })}
        <span class="col grow" style="gap:4px;min-width:0"><span class="between small"><b>${fmt(moi)}</b><span class="tiny muted">${moi > lui ? 'tu mènes' : moi < lui ? 'tu es mené' : 'égalité'}</span><b>${fmt(lui)}</b></span>
          <span class="duel-barre"><span style="width:${Math.round(moi / tot * 100)}%;background:${esc(z.couleur || '#5AB0F0')}"></span><span style="width:${Math.round(lui / tot * 100)}%;background:${esc(zr.couleur || '#E1453A')}"></span></span>
          <span class="between tiny"><span>Toi</span><span class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pr.pseudo || zr.nom)}</span></span></span>
        ${portraitChef(r, 40, { galons: false })}</span>
      <span class="tiny muted" style="text-align:left">Victoire : +${DUEL.rep} de réputation, +${DUEL.xp} XP en Commandement.${z.chef.duels ? ` Ton palmarès : ${z.chef.duels.v} victoire${z.chef.duels.v > 1 ? 's' : ''}, ${z.chef.duels.d} défaite${z.chef.duels.d > 1 ? 's' : ''}.` : ''}</span></button>`;
  }
  const dd = z.chef.dernierDuel && z.chef.dernierDuel.w === w - 1 && z.chef.dernierDuel.season === st.season && T <= (w - 1) * 7 + 2 ? z.chef.dernierDuel : null;
  return `<details class="card repli semaine" data-k="semaine" ${S.ouverts && S.ouverts.semaine ? 'open' : ''}>
    <summary><span class="col grow" style="gap:0"><span style="font-weight:700">Ta semaine de chef</span>
      <span class="tiny muted">Objectifs ${nb}/3${nb === 3 ? ' · <b class="ok">semaine parfaite</b>' : ` · ${reste} jour${reste > 1 ? 's' : ''} restant${reste > 1 ? 's' : ''}`}${zr ? ` · duel contre ${esc(zr.nom)}` : ''}</span></span><span class="tiny muted">▾</span></summary>
    <div class="col" style="gap:8px">${obj}
      <span class="tiny muted">Seuls les jours où tu donnes tes ordres comptent. Chaque objectif : expérience et +1 de réputation. Les trois : médaille de la semaine (+${RECOMPENSE.medaille.ps} PS)${h && h.serie > 1 ? `, série en cours : ${h.serie} semaines` : ''}.</span>
      ${dd ? `<p class="small ${dd.res === 'v' ? 'ok' : dd.res === 'd' ? 'warn' : 'muted'}" style="margin:0">Duel de la semaine passée contre ${st.zones[dd.rival] ? esc(st.zones[dd.rival].nom) : '?'} : ${dd.res === 'v' ? 'gagné' : dd.res === 'd' ? 'perdu' : 'égalité'} (${fmt(dd.moi)} à ${fmt(dd.lui)}).</p>` : ''}
      ${duel}</div></details>`;
}

// ───── Fiche : l'adjoint ─────
export function adjointFicheHtml(z, moi) {
  if (!z.adjoint) return '';
  const a = z.adjoint, cons = (moi && S.player && S.player.chef && S.player.chef.consigne) || a.consigne || 'equilibre';
  const L = niveauChef(z.chef, 'commandement');
  return `<section class="card" style="gap:10px"><h2 class="card-title">${a.f ? 'L’adjointe' : 'L’adjoint'}</h2>
    <div class="row" style="gap:12px;align-items:center">${portraitAdjoint(a, 56)}
      <span class="col" style="gap:2px"><span style="font-weight:700">${esc(a.prenom)} ${esc(a.nom)}</span><span class="tiny muted">Tient la zone les jours sans ordres · ${a.jours || 0} jour${(a.jours || 0) > 1 ? 's' : ''} tenu${(a.jours || 0) > 1 ? 's' : ''}</span></span></div>
    ${moi ? `<span class="tiny muted" style="font-weight:700">Ta consigne si tu ne donnes pas d’ordres</span>
    <div class="chef-chips">${IDS_CONSIGNES.map((k) => `<button type="button" class="chef-chip" data-action="adjoint-consigne" data-v="${k}" aria-pressed="${cons === k}">${CONSIGNES[k].ico} ${esc(CONSIGNES[k].nom)}</button>`).join('')}</div>
    <span class="small">${esc(CONSIGNES[cons].texte)}.</span>` : ''}
    <span class="tiny muted" style="font-weight:700">Ce qu’${a.f ? 'elle' : 'il'} sait faire (Commandement de ton chef : ${L})</span>
    <div class="col" style="gap:3px">${savoirFaire(z.chef).map((x) => `<span class="tiny ${x.ok ? '' : 'muted'}">${x.ok ? '✅' : '🔒'} ${esc(x.t)}${x.niv && !x.ok ? ` (Commandement ${x.niv})` : ''}</span>`).join('')}</div>
    <span class="tiny muted">Les jours tenus par ${esc(a.prenom)} comptent au classement avec ${CLASSEMENT.decoteAbsent} points d’IPZ de moins : ça limite la casse, sans valoir un jour joué. ${ADJOINT.tient} jours sans malus d’absence, ensuite la zone s’use.</span>
  </section>`;
}

// ───── Fiche : honneurs ─────
export function honneursHtml(z, moi) {
  const chef = z.chef, cad = cadreDe(chef), suiv = cadreSuivant(chef), n = totalNiveaux(chef);
  const ok = new Set(rubansDe(chef));
  const p = (S.players && S.players[z.uid]) || (moi ? S.player : {}) || {};
  const choisi = p.chef && p.chef.ruban;
  return `<section class="card" style="gap:10px"><h2 class="card-title">Honneurs</h2>
    <div class="row" style="gap:12px;align-items:center">${portraitChef(z.uid, 56)}
      <span class="col grow" style="gap:3px"><span style="font-weight:700">${esc(cad.nom)}</span>
        ${suiv ? `<span class="chef-barre" style="--c:var(--amber)"><span style="width:${Math.round((n - cad.min) / (suiv.min - cad.min) * 100)}%"></span></span><span class="tiny muted">${esc(suiv.nom)} à ${suiv.min} niveaux (tu en as ${n})</span>` : '<span class="tiny muted">Le plus beau cadre du district.</span>'}</span></div>
    <span class="tiny muted" style="font-weight:700">Rubans (${ok.size}/${IDS_RUBANS.length})${moi ? ' · touche un ruban gagné pour l’afficher sur ton portrait' : ''}</span>
    <div class="rubans">${IDS_RUBANS.map((id) => { const R = RUBANS[id], g = ok.has(id);
      return `<button type="button" class="ruban${g ? ' gagne' : ''}${choisi === id && g ? ' choisi' : ''}" ${moi && g ? `data-action="chef-ruban" data-v="${id}"` : 'disabled'} title="${esc(R.texte)}"><span class="ruban-ico">${R.ico}</span><span class="tiny" style="font-weight:700">${esc(R.nom)}</span><span class="tiny muted">${esc(R.texte)}</span></button>`; }).join('')}</div>
  </section>`;
}
export const COUL_CADRE = { bronze: '#CD8A4E', argent: '#C9D3E0', or: '#F2C14E', diamant: '#8FE3FF' };

// ───── Carte du chef à partager (image) ─────
function chargerImage(src) {
  return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
/** Dessine la carte du chef (1080 × 1350) et renvoie un Blob PNG. */
export async function carteChef(uid) {
  const st = S.state, z = st.zones[uid], chef = z.chef;
  const p = (S.players && S.players[uid]) || (S.user && uid === S.user.uid ? S.player : {}) || {};
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), zc = z.couleur || '#5AB0F0';
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0E1524'); g.addColorStop(1, '#1B2436');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = zc; x.globalAlpha = 0.18; x.beginPath(); x.arc(W - 120, 160, 360, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
  const F = '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';
  // Portrait et cadre.
  const cad = cadreDe(chef), cc = COUL_CADRE[cad.id] || zc;
  const img = p.chef && p.chef.portrait ? await chargerImage(`img/chefs/${p.chef.portrait}.webp`) : null;
  x.save(); rr(x, 70, 90, 300, 300, 60); x.lineWidth = 16; x.strokeStyle = cc; x.stroke(); x.clip();
  if (img) x.drawImage(img, 70, 90, 300, 300); else { x.fillStyle = '#22304a'; x.fillRect(70, 90, 300, 300); }
  x.restore();
  const rub = p.chef && p.chef.ruban && RUBANS[p.chef.ruban] && rubansDe(chef).includes(p.chef.ruban) ? RUBANS[p.chef.ruban] : null;
  if (rub) { x.fillStyle = '#0E1524'; x.beginPath(); x.arc(352, 372, 48, 0, Math.PI * 2); x.fill(); x.lineWidth = 6; x.strokeStyle = cc; x.stroke(); x.font = `56px ${F}`; x.textAlign = 'center'; x.fillText(rub.ico, 352, 392); x.textAlign = 'left'; }
  // Identité.
  x.fillStyle = '#9FB0C8'; x.font = `600 30px ${F}`; x.fillText('CHEF DE CORPS · MA ZP', 410, 140);
  x.fillStyle = '#FFFFFF'; x.font = `800 64px ${F}`; x.fillText(String(p.pseudo || z.nom).slice(0, 18), 410, 215);
  x.fillStyle = '#E8ECF5'; x.font = `500 34px ${F}`; x.fillText(`${gradeFor(z.ps || 0).nom}`, 410, 265);
  x.fillStyle = zc; x.fillText(`ZP ${z.code} ${z.nom}`.slice(0, 26), 410, 310);
  x.fillStyle = '#FFD98A'; x.font = `700 32px ${F}`; x.fillText(`${signatureChef(chef) || ''}${chef.brevet ? ` · ${VOIES[chef.brevet].titre}` : ''}`.slice(0, 40), 410, 365);
  // Compétences.
  let y = 470; x.fillStyle = '#9FB0C8'; x.font = `700 28px ${F}`; x.fillText(`COMPÉTENCES · ${totalNiveaux(chef)} NIVEAUX · ${cad.nom.toUpperCase()}`, 70, y); y += 30;
  const nv = niveauxChef(chef);
  for (const k of IDS_COMPETENCES) {
    y += 62; x.fillStyle = '#E8ECF5'; x.font = `600 34px ${F}`; x.fillText(`${COMPETENCES[k].ico} ${COMPETENCES[k].nom}`, 70, y);
    rr(x, 440, y - 26, 480, 24, 12); x.fillStyle = '#2A3550'; x.fill();
    rr(x, 440, y - 26, Math.max(24, 48 * nv[k]), 24, 12); x.fillStyle = COUL_COMP[k]; x.fill();
    x.fillStyle = '#FFFFFF'; x.font = `800 36px ${F}`; x.fillText(String(nv[k]), 950, y);
  }
  // Talents.
  y += 80; x.fillStyle = '#9FB0C8'; x.font = `700 28px ${F}`; x.fillText('TALENTS', 70, y);
  const tal = chef.talents || [];
  let tx = 70;
  for (const t of tal) { const im = await chargerImage(`img/talents/${t}.webp`); if (im) x.drawImage(im, tx, y + 20, 90, 90); x.fillStyle = '#E8ECF5'; x.font = `600 24px ${F}`; x.fillText(TALENT[t].nom.slice(0, 16), tx, y + 140); tx += 245; }
  if (!tal.length) { x.fillStyle = '#6B7A94'; x.font = `500 28px ${F}`; x.fillText('Aucun talent équipé pour l’instant', 70, y + 60); }
  // Palmarès.
  y += 210; x.fillStyle = '#9FB0C8'; x.font = `700 28px ${F}`; x.fillText('PALMARÈS', 70, y);
  const du = chef.duels || { v: 0, d: 0 }, hb = chef.hebdo || { semaines: 0 };
  const tuiles = [[`${du.v}–${du.d}`, 'duels'], [String(hb.semaines || 0), 'sem. parfaites'], [String((chef.medailles || []).length), 'médailles'], [String(rubansDe(chef).length), 'rubans']];
  tuiles.forEach(([v, l], i) => { const bx = 70 + i * 240; rr(x, bx, y + 20, 220, 130, 22); x.fillStyle = '#22304a'; x.fill(); x.fillStyle = '#FFFFFF'; x.font = `800 50px ${F}`; x.fillText(v, bx + 22, y + 88); x.fillStyle = '#9FB0C8'; x.font = `500 24px ${F}`; x.fillText(l, bx + 22, y + 128); });
  const faits = faitsDArmes(z.stats).slice(0, 2);
  y += 200; x.fillStyle = '#C9D3E0'; x.font = `italic 500 28px ${F}`; faits.forEach((f, i) => x.fillText(`Cette saison, ${f}.`.slice(0, 62), 70, y + i * 40));
  x.fillStyle = '#6B7A94'; x.font = `500 24px ${F}`; x.fillText(`Saison ${st.season} · jour ${st.turn} · levixqcl.github.io/ma-zp`, 70, H - 50);
  return new Promise((ok) => c.toBlob((b) => ok(b), 'image/png'));
}
/** Partage la carte (feuille de partage du téléphone) ou la télécharge. */
export async function partagerCarte(uid) {
  const b = await carteChef(uid);
  if (!b) return false;
  const f = new File([b], 'mon-chef-ma-zp.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Mon chef de corps · Ma ZP' }); return true; } } catch (e) { if (e && e.name === 'AbortError') return true; }
  const u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = 'mon-chef-ma-zp.png'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
  return true;
}
export { myZone, zoneName, CADRES };
