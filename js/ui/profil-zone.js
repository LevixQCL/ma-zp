// Profil de zone (onglet Chef) : la forme de la zone que le chef a construite, service par service.
// Ne compte que ce que le joueur a décidé et qui dure : formation, matériel, annexes, voitures anonymisées, lots, doctrine.
// Le moral, le rythme et le chef du jour sont laissés de côté : la forme ne bouge que quand le joueur investit.
// Les multiplicateurs sont ceux de capacite() (engine/zone.js) : aucun calcul de règle n'est dupliqué ici.
import { esc } from './common.js';
import { multNiveau, multEquip, INFRAS, DOCTRINES, aAnnexe, multDoctrine, LOTS, forceDoctrine, bonusEquip, risqueBlessure, seuilChasse, ROULAGE } from '../engine/constants.js';
import { bonusLots } from '../engine/zone.js';
import { bonusAnonymes } from '../engine/flotte.js';

export const SERVICES_PROFIL = [
  { k: 'intervention', nom: 'Intervention', court: 'Interv.', c: '#FF6E6A' },
  { k: 'proximite', nom: 'Proximité', court: 'Proxi.', c: '#3DD39A' },
  { k: 'recherche', nom: 'Recherche', court: 'Rech.', c: '#B892FF' },
  { k: 'roulage', nom: 'Roulage', court: 'Roulage', c: '#63B0FF' },
  { k: 'admin', nom: 'Accueil', court: 'Accueil', c: '#FFB23F' },
];
const TITRES = {
  intervention: ['🚨', 'Zone de choc', 'Tes patrouilles arrivent vite et reviennent entières.'],
  proximite: ['🏘️', 'Police de quartier', 'Les habitants connaissent tes agents par leur prénom.'],
  recherche: ['🔎', 'Maison judiciaire', 'Le parquet t’appelle en premier.'],
  roulage: ['🚓', 'Brigade des routes', 'La commune adore tes recettes.'],
  admin: ['🗂️', 'Zone carrée', 'Pas un dossier ne traîne.'],
};
/** Écart minimal entre le premier et le deuxième service pour mériter un titre. */
export const SEUIL_TITRE = 1.15;

/** Ce qui pousse un service : [libellé, multiplicateur, vide?]. */
export function contributions(z, s, T = 0) {
  const L = [];
  const nv = (z.niveaux && z.niveaux[s]) || 1, eq = (z.equip && z.equip[s]) || 1;
  L.push([`Formation niv. ${nv}`, multNiveau(nv), nv <= 1]);
  L.push([`Matériel niv. ${eq}`, multEquip(eq), eq <= 1]);
  const inf = z.infra || {};
  if (s === 'intervention' && inf.tir) L.push([INFRAS.tir.nom, INFRAS.tir.bonus]);
  if (s === 'proximite' && inf.antenne) L.push([INFRAS.antenne.nom, 1.3]);
  if (s === 'roulage' && inf.anpr) L.push([INFRAS.anpr.nom, 1.2]);
  if (s === 'recherche' && inf.audition) L.push([INFRAS.audition.nom, 1.2]);
  if (s === 'recherche') { const a = bonusAnonymes(z, T); if (a > 0) L.push(['Voitures anonymisées', 1 + a]); }
  if (s === 'admin' && inf.logiciel) L.push([INFRAS.logiciel.nom, 1.5]);
  if (s === 'admin' && aAnnexe(z, 'sapv')) L.push([INFRAS.sapv.nom, INFRAS.sapv.admin]);
  const lots = bonusLots(z, s);
  if (lots !== 1) {
    const noms = [...new Set((z.lots || []).filter((l) => LOTS[l.id] && LOTS[l.id].bonus && LOTS[l.id].bonus[s]).map((l) => LOTS[l.id].nom))];
    L.push([noms.join(', ') || 'Lots des enchères', lots]);
  }
  // Roulage : sa vraie force, c'est ce que rapportent les amendes (même calcul que le tour de 20:00).
  if (s === 'roulage') {
    const am = bonusEquip(z, 'roulage', 'amendes'), dr = forceDoctrine(z, 'amendes');
    if (am > 0) L.push(['Amendes : matériel', 1 + am]);
    if (dr > 0) L.push([`Amendes : doctrine routière${z.maitrise ? ` ${'★'.repeat(z.maitrise + 1)}` : ''}`, 1 + dr]);
  }
  const d = multDoctrine(z, s);
  if (d !== 1 && z.doctrine && DOCTRINES[z.doctrine]) L.push([`Doctrine ${DOCTRINES[z.doctrine].nom.toLowerCase()}${z.maitrise ? ` ${'★'.repeat(z.maitrise + 1)}` : ''}`, d]);
  return L;
}

const pc0 = (v) => `${Math.round(v * 100)} %`;
/** Effets propres à chaque service, hors capacité (affichés à part, ils n'entrent pas dans la forme). */
export function effetsService(z, s) {
  const E = [];
  if (s === 'intervention') {
    const b = risqueBlessure(z); if (b < 0.999) E.push(`blessures −${pc0(1 - b)}`);
    const f = forceDoctrine(z, 'flagrant'); if (f > 0) E.push(`flagrants délits +${pc0(f)}`);
    if (aAnnexe(z, 'cachots')) E.push(`points d’interpellation +${pc0(INFRAS.cachots.points)}`);
  } else if (s === 'roulage') {
    if (z.infra && z.infra.anpr) E.push(`radars +${INFRAS.anpr.fixe} 000 € par soir`);
    const sc = seuilChasse(z); if (Math.abs(sc - ROULAGE.chasse) > 0.001) E.push(`« chasse aux PV » au-delà de ${pc0(sc)} des effectifs`);
  } else if (s === 'recherche') {
    const e = bonusEquip(z, 'recherche', 'enquete') + forceDoctrine(z, 'enquete'); if (e > 0) E.push(`pièces d’enquête +${pc0(e)}`);
  } else if (s === 'proximite') {
    const sat = bonusEquip(z, 'proximite', 'satisfaction'); if (sat > 0) E.push(`satisfaction +${String(Math.round(sat * 10) / 10).replace('.', ',')} par jour`);
    const der = (z.doctrine === 'quartier' ? DOCTRINES.quartier.derive : 1) * (aAnnexe(z, 'sapv') ? INFRAS.sapv.derive : 1);
    if (der < 0.999) E.push(`la satisfaction retombe ${pc0(1 - der)} moins vite`);
  } else if (s === 'admin') {
    const p = bonusEquip(z, 'admin', 'protection'); if (p > 0) E.push(`tracas internes évités +${pc0(p)}`);
  }
  return E;
}

/** Profil complet : valeur par service (produit des contributions), meilleur service, titre. */
export function profilZone(z, T = 0) {
  const svc = SERVICES_PROFIL.map((s) => { const contrib = contributions(z, s.k, T); return { ...s, contrib, v: contrib.reduce((a, b) => a * b[1], 1) }; });
  const tri = [...svc].sort((a, b) => b.v - a.v);
  const top = tri[0], second = tri[1];
  const spe = top.v / second.v >= SEUIL_TITRE;
  const t = spe ? TITRES[top.k] : ['⚖️', 'Zone polyvalente', 'Rien ne te prend en défaut, rien ne te distingue encore.'];
  return { svc, top, ecart: top.v / second.v, spe, ico: t[0], titre: t[1], phrase: t[2] };
}

const f2 = (v) => v.toFixed(2).replace('.', ',');
const pc = (v) => `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`;

/** Pentagone en SVG. `mini` : la vignette de la ligne repliée. */
export function radarProfil(p, mini = false) {
  const vals = p.svc.map((s) => s.v);
  const W = mini ? 34 : 300, H = mini ? 34 : 236, cx = W / 2, cy = mini ? H / 2 + 1 : H / 2 + 8, R = mini ? 15 : 78;
  const mx = Math.max(2.5, Math.ceil(Math.max(...vals) * 2) / 2);
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = (v) => v.map((x, i) => pt(i, R * Math.min(1, x / mx)).map((n) => n.toFixed(1)).join(',')).join(' ');
  const cadre = `<polygon points="${p.svc.map((_, i) => pt(i, R).map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${mini ? 'var(--surface2)' : 'none'}" stroke="var(--line)"/>`;
  const forme = `<polygon points="${poly(vals)}" fill="rgba(255,178,63,.16)" stroke="var(--amber)" stroke-width="${mini ? 1.6 : 2}" stroke-linejoin="round"/>`;
  if (mini) return `<svg class="pz-mini" viewBox="0 0 34 34" aria-hidden="true">${cadre}${forme}</svg>`;
  let g = cadre + `<polygon points="${poly([1, 1, 1, 1, 1])}" fill="none" stroke="var(--faint)" stroke-dasharray="3 4"/>`;
  p.svc.forEach((_, i) => { const [x, y] = pt(i, R); g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`; });
  g += forme;
  p.svc.forEach((s, i) => {
    const [px, py] = pt(i, R * Math.min(1, s.v / mx));
    const [lx, ly] = pt(i, R + 22);
    g += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${s.c}"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text2)">${s.nom}</text><text x="${lx.toFixed(1)}" y="${(ly + 14).toFixed(1)}" text-anchor="middle" font-size="11.5" fill="${s.c}">×${f2(s.v)}</text>`;
  });
  return `<svg class="pz-radar" viewBox="-14 -4 ${W + 28} ${H + 18}" role="img" aria-label="Profil de ta zone, service par service">${g}</svg>`;
}

/** Titre déjà vu par le joueur (sur cet appareil) : sert à signaler un nouveau titre une seule fois. */
const CLE = (uid) => `mazp-profil-titre-${uid}`;
function titreVu(uid) { try { return localStorage.getItem(CLE(uid)); } catch (e) { return null; } }
export function marquerTitreVu(uid, titre) { try { localStorage.setItem(CLE(uid), titre); } catch (e) { /* stockage indisponible : rien à retenir */ } }

/** La ligne « Ma zone » de la carte du chef, repliée par défaut ; ouverte, le pentagone et ce qui pousse chaque service. */
export function profilLigneHtml(z, T, ouvert) {
  const p = profilZone(z, T);
  const vu = titreVu(z.uid);
  const nouveau = vu != null && vu !== p.titre;
  if (vu == null) marquerTitreVu(z.uid, p.titre); // premier affichage : rien de « nouveau » à signaler
  const second = [...p.svc].sort((a, b) => b.v - a.v)[1];
  const corps = ouvert ? `<div class="pz-corps">
      ${radarProfil(p)}
      <span class="pz-phrase">${esc(p.phrase)}${p.spe ? ` ${esc(p.top.nom)} ×${f2(p.top.v)}, ${Math.round((p.ecart - 1) * 100)} % devant ${esc(second.nom)}.` : ` Il faut ${Math.round((SEUIL_TITRE - 1) * 100)} % d’avance sur ton deuxième service pour un titre.`}</span>
      <div class="pz-svcs">${p.svc.map((s) => `<div class="pz-svc"><div class="pz-l1"><span><span class="pz-dot" style="background:${s.c}"></span>${esc(s.nom)}</span><b style="color:${p.spe && s.k === p.top.k ? 'var(--amber-hi)' : 'var(--text)'}">×${f2(s.v)}</b></div>
        <div class="pz-chips">${s.contrib.map(([l, v, vide]) => `<span class="pz-c ${vide ? 'vide' : v > 1.001 ? 'up' : v < 0.999 ? 'dn' : ''}">${esc(l)}${vide ? '' : ` ${pc(v)}`}</span>`).join('')}</div>
        ${effetsService(z, s.k).length ? `<span class="pz-eff">En plus : ${effetsService(z, s.k).map(esc).join(' · ')}</span>` : ''}</div>`).join('')}</div>
      <span class="pz-note">Pointillés : une zone de départ. Formation, matériel, annexes, véhicules, lots et doctrine comptent (pour le Roulage, aussi ce que rapportent les amendes) ; le moral et le chef du jour, non.</span>
    </div>` : '';
  return `<div class="pz" data-open="${ouvert}">
    <button type="button" class="pz-l" data-action="profil-zone" aria-expanded="${ouvert}">${radarProfil(p, true)}
      <span class="pz-t"><span class="k">Ma zone${nouveau ? ' <span class="co-neuf">nouveau titre</span>' : ''}</span><b>${p.ico} ${esc(p.titre)}</b></span>
      <span class="pz-x">${esc(p.top.court)} ×${f2(p.top.v)}</span><span class="pz-chev" aria-hidden="true">›</span></button>
    ${corps}
  </div>`;
}
