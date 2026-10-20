// Ordres (mode essai) : chaque service est une capsule, façon Fallout Shelter mais sans bâtiment autour.
// Les agents affectés s'y baladent (figurines animées de la démo du commissariat), avec les mêmes repères que les pions :
// gilet manquant, recrue à ½, taser, places à pourvoir, agents « en plus », agents partis en mission.
// Animation : une seule boucle requestAnimationFrame à ~16 images/s, qui ne tourne que si des capsules sont à l'écran
// (et s'arrête onglet caché ou « réduire les animations »). Les positions survivent aux rerendus (clé par agent).

/** Cadres de la planche img/capsules/agents.webp (1024×269) : [x, y, l, h] par personnage et par geste. */
const META = {"intA":{"walk":[[0,0,28,51],[28,0,22,51],[51,0,24,51],[75,0,24,51],[100,0,17,51],[118,0,28,51],[147,0,28,51],[176,0,23,51],[199,0,24,51],[224,0,16,51]],"idle":[[241,0,21,52],[263,0,21,52],[284,0,21,52],[306,0,21,52],[327,0,21,52],[349,0,21,52]],"work":[[370,0,21,52],[392,0,21,52],[413,0,21,52],[435,0,21,52],[456,0,21,52],[478,0,21,52],[499,0,21,52],[521,0,21,52],[542,0,21,52],[564,0,21,52]]},"intB":{"walk":[[585,0,26,50],[612,0,26,50],[639,0,25,50],[664,0,26,50],[691,0,25,50],[717,0,26,50],[744,0,25,50],[770,0,24,50],[795,0,26,50],[822,0,25,50]],"idle":[[848,0,19,52]],"work":[[867,0,19,52],[887,0,20,52],[908,0,20,52],[929,0,19,52],[948,0,20,52],[969,0,20,52],[990,0,19,52],[0,53,20,52],[21,53,20,52],[42,53,19,52]]},"rechW":{"walk":[[62,53,32,65],[95,53,36,64],[132,53,32,64],[165,53,36,65]],"type":[[201,53,35,62],[237,53,35,62],[272,53,35,62],[308,53,35,62],[343,53,32,59],[376,53,32,59],[409,53,32,59],[442,53,32,59]],"idle":[[475,53,32,65]]},"rechM":{"walk":[[508,53,29,69],[538,53,31,69],[570,53,29,69],[600,53,29,69]],"idle":[[630,53,26,71],[657,53,32,71],[689,53,27,71],[717,53,26,71]],"type":[[744,53,31,54],[776,53,31,54],[808,53,32,54],[840,53,32,54]]},"roulM":{"walk":[[873,53,34,65],[908,53,37,65],[946,53,34,65],[980,53,37,65]],"idle":[[0,125,27,53]],"work":[[28,125,27,53],[56,125,27,53],[84,125,27,53],[112,125,27,53],[140,125,28,69],[168,125,28,69],[197,125,27,69],[225,125,28,69]]},"roulG":{"idle":[[253,125,25,72],[279,125,25,72],[305,125,25,72],[331,125,25,72]],"work":[[356,125,25,72],[382,125,25,72],[407,125,25,72],[433,125,25,72],[458,125,25,72]]},"proxM":{"walk":[[484,125,34,65],[519,125,37,65],[557,125,34,65],[591,125,37,65]],"idle":[[629,125,34,69]],"work":[[664,125,34,69],[699,125,36,69],[736,125,39,69],[776,125,29,69]],"coffee":[[806,125,29,63],[836,125,29,63],[866,125,29,63],[896,125,29,63]]},"accF":{"idle":[[925,125,25,71],[951,125,24,71],[976,125,27,71],[0,198,25,71]],"work":[[25,198,28,71],[54,198,36,71],[90,198,36,71],[127,198,36,71]]}};
/** Fond illustré (Gemini) disponible pour ces services ; les autres gardent la capsule dessinée en CSS. */
export const FONDS_CAPSULE = [];
/** Personnages de chaque service (alternés d'un agent à l'autre). */
const PERSO = { intervention: ['intA', 'intB'], proximite: ['proxM'], recherche: ['rechW', 'rechM'], roulage: ['roulM', 'roulG'], admin: ['accF'] };
export const persoDe = (s, i) => { const l = PERSO[s] || PERSO.intervention; return l[i % l.length]; };

const etat = new Map();
let boucle = 0, dernier = 0;
const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const hasard = (k) => { let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }; };

function cadre(el, p, geste, t) {
  const fr = (META[p] && (META[p][geste] || META[p].idle || META[p].work || META[p].walk)) || META.intA.idle;
  const f = fr[Math.floor(t * (geste === 'walk' ? 9 : 4)) % fr.length];
  el.style.width = f[2] + 'px'; el.style.height = f[3] + 'px';
  el.style.backgroundPosition = `-${f[0]}px -${f[1]}px`;
  return f[2];
}

function tic(ts) {
  boucle = 0;
  const els = document.querySelectorAll('.cap-ag');
  if (!els.length || document.hidden) { setTimeout(lancerCapsules, 600); return; }
  if (ts - dernier < 60) { boucle = requestAnimationFrame(tic); return; }
  const dt = Math.min(0.2, (ts - dernier) / 1000 || 0.06); dernier = ts;
  const fige = calme();
  for (const el of els) {
    const k = el.dataset.k, p = el.dataset.p, L = el.parentElement.clientWidth || 300;
    let s = etat.get(k);
    if (!s) {
      const r = hasard(k), marche = !!(META[p] && META[p].walk) && !el.classList.contains('fixe');
      s = { x: (el.dataset.x !== undefined && el.dataset.x !== '' ? Number(el.dataset.x) : r() * 0.8) * (L - 40) + 6, dir: r() < 0.5 ? -1 : 1, v: 14 + r() * 10, t: r() * 5, pause: marche ? r() * 2 : 1e9, marche, r };
      etat.set(k, s);
    }
    s.t += dt;
    let geste = 'idle';
    if (!fige && s.marche) {
      if (s.pause > 0) { s.pause -= dt; geste = META[p].work && s.r() < 0.002 ? 'work' : 'idle'; if (s.pause <= 0) { s.dir = s.r() < 0.5 ? -1 : 1; s.trajet = 1.5 + s.r() * 3; } }
      else { geste = 'walk'; s.x += s.dir * s.v * dt; s.trajet -= dt; if (s.x < 6 || s.x > L - 36) { s.dir *= -1; s.x = Math.max(6, Math.min(L - 36, s.x)); } if (s.trajet <= 0) s.pause = 1 + s.r() * 3; }
    } else if (!fige && META[p] && META[p].work) geste = 'work';
    const l = cadre(el, p, geste, fige ? 0 : s.t);
    el.style.transform = `translateX(${s.x}px) scaleX(${s.dir})`;
    const b = el.querySelector('.ag-b'); if (b) b.style.transform = `scaleX(${s.dir})`;
    el.style.setProperty('--l', l + 'px');
  }
  boucle = requestAnimationFrame(tic);
}
/** À appeler après un rendu qui contient des capsules (sans effet si la boucle tourne déjà). */
export function lancerCapsules() { if (!boucle && typeof requestAnimationFrame === 'function') boucle = requestAnimationFrame(tic); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) lancerCapsules(); });
