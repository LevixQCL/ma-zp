/* Générateur de Filature : un trajet unique de la bijouterie (bord gauche, entrée par la gauche) à la sortie (bord bas),
   les chiffres = nombre de cases traversées par ligne et par colonne, et juste assez de témoins pour une solution unique
   (plus `extra` témoins de confort pour les premiers niveaux). */
const FD = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // haut, droite, bas, gauche (bits 1, 2, 4, 8)
function filChemin(N, lmin, lmax, rnd) {
  for (let essai = 0; essai < 3000; essai++) {
    const r0 = 1 + Math.floor(rnd() * (N - 2)), c1 = 1 + Math.floor(rnd() * (N - 2));
    const arr = [N - 1, c1], vu = new Set([r0 * N]), ch = [[r0, 0]]; let ok = false, pas = 0;
    (function go(r, c) {
      if (ok || pas++ > 3000) return;
      if (r === arr[0] && c === arr[1]) { if (ch.length >= lmin) ok = true; return; }
      if (ch.length >= lmax) return;
      const ds = FD.slice().sort(() => rnd() - 0.5);
      for (const [dr, dc] of ds) { const R = r + dr, C = c + dc, k = R * N + C;
        if (R < 0 || C < 0 || R >= N || C >= N || vu.has(k)) continue;
        if (Math.abs(R - arr[0]) + Math.abs(C - arr[1]) > lmax - ch.length - 1) continue;
        vu.add(k); ch.push([R, C]); go(R, C); if (ok) return; vu.delete(k); ch.pop(); }
    })(r0, 0);
    if (ok) return ch;
  }
  return null;
}
function filPieces(N, ch) {
  const p = new Map();
  ch.forEach(([r, c], i) => { let m = 0;
    const lie = (q) => { const dr = q[0] - r, dc = q[1] - c; m |= dr === -1 ? 1 : dc === 1 ? 2 : dr === 1 ? 4 : 8; };
    if (i === 0) m |= 8; else lie(ch[i - 1]);
    if (i === ch.length - 1) m |= 4; else lie(ch[i + 1]);
    p.set(r * N + c, m); });
  return p;
}
/** Nombre de solutions (on s'arrête à 2), avec un budget de recherche (au-delà : « pas sûr », traité comme non unique). */
function filCompter(N, lig, col, dep, arr, donnes, budget = 400000) {
  const L = lig.slice(), Co = col.slice(), vu = new Uint8Array(N * N); let n = 0, nb = 0, pas = 0;
  const total = lig.reduce((a, b) => a + b, 0), nDon = donnes.size; let vusDon = 0;
  const ar = (arr / N) | 0, ac = arr % N;
  function go(r, c, depuis) {
    if (n > 1 || ++pas > budget) return;
    const k = r * N + c;
    if (vu[k] || L[r] === 0 || Co[c] === 0) return;
    const g = donnes.get(k);
    if (g !== undefined && !(g & depuis)) return;
    vu[k] = 1; L[r]--; Co[c]--; nb++; if (g !== undefined) vusDon++;
    if (k === arr) { if (nb === total && vusDon === nDon && (g === undefined || g === (depuis | 4))) n++; }
    else if (Math.abs(ar - r) + Math.abs(ac - c) <= total - nb) {
      for (let d = 0; d < 4; d++) { const bit = 1 << d; if (bit === depuis) continue; if (g !== undefined && !(g & bit)) continue;
        const R = r + FD[d][0], C = c + FD[d][1]; if (R < 0 || C < 0 || R >= N || C >= N) continue;
        go(R, C, 1 << ((d + 2) % 4)); }
    }
    vu[k] = 0; L[r]++; Co[c]++; nb--; if (g !== undefined) vusDon--;
  }
  go((dep / N) | 0, dep % N, 8);
  return pas > budget ? 2 : n;
}
/** Grille complète : { N, lig, col, dep, arr, donnes: [[k, bits]], sol: [[k, bits]] }. */
function filGrille(N, dens, extra = 0, rnd = Math.random) {
  const L = Math.round(dens * N * N), lmin = Math.max(N + 2, L - 3), lmax = L + 3;
  for (let t = 0; t < 60; t++) {
    const ch = filChemin(N, lmin, lmax, rnd); if (!ch) continue;
    const P = filPieces(N, ch), lig = Array(N).fill(0), col = Array(N).fill(0);
    for (const [r, c] of ch) { lig[r]++; col[c]++; }
    const dep = ch[0][0] * N, arr = ch[ch.length - 1][0] * N + ch[ch.length - 1][1];
    const donnes = new Map([[dep, P.get(dep)], [arr, P.get(arr)]]);
    const cand = ch.slice(1, -1).map(([r, c]) => r * N + c).sort(() => rnd() - 0.5);
    while (filCompter(N, lig, col, dep, arr, donnes) > 1 && cand.length) { const k = cand.pop(); donnes.set(k, P.get(k)); }
    if (filCompter(N, lig, col, dep, arr, donnes) !== 1) continue;
    for (const k of [...donnes.keys()]) { if (k === dep || k === arr) continue; const v = donnes.get(k); donnes.delete(k); if (filCompter(N, lig, col, dep, arr, donnes) !== 1) donnes.set(k, v); }
    for (let i = 0; i < extra && cand.length; i++) { const k = cand.pop(); donnes.set(k, P.get(k)); }
    return { N, lig, col, dep, arr, donnes: [...donnes], sol: [...P] };
  }
  return null;
}
