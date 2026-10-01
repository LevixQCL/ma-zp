# Construit les pages des mini-jeux (minijeux/*.html) à partir des sources de ce dossier.
# Usage : python3 minijeux/src/build.py crochetage colis depanneuse dossier
import sys, re, pathlib
here = pathlib.Path(__file__).parent
base_css = (here/'base.css').read_text()
base_js = (here/'base.js').read_text()
FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400..700&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&display=swap'
ICON = {k: re.search(k+r":'(<svg.*?</svg>)'", base_js).group(1) for k in ['lock','alert','car','doc','sound','menu','star']}

def build(name):
    src = (here/f'{name}.src.html').read_text()
    meta = dict(re.findall(r'<!--(\w+):(.*?)-->', src))
    css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', src, re.S).group(1)
    js = re.search(r'<script>(.*?)</script>', src, re.S).group(1)
    js = re.sub(r'/\*INCLUDE:(.*?)\*/null', lambda m: (here/m.group(1)).read_text().strip(), js)
    out = f'''<title>{meta['title']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{base_css}
{css}
</style>
<script>document.body.classList.add('svc-{meta['svc']}')</script>
<div class="app" id="app">
  <div class="top">
    <div class="badge" aria-hidden="true">{ICON[meta['icon']]}</div>
    <div class="ttl"><div class="eyebrow">{meta['eyebrow']}</div><h1>{meta['h1']}</h1></div>
    <div class="hud">
      <button class="iconbtn" id="sound" aria-label="Couper le son">{ICON['sound']}</button>
      <button class="iconbtn" id="menuBtn" aria-label="Menu">{ICON['menu']}</button>
      <div class="ring" id="ring"><svg viewBox="0 0 50 50"><circle class="trk" cx="25" cy="25" r="21" fill="none" stroke-width="4"/><circle class="val" id="ringval" cx="25" cy="25" r="21" fill="none" stroke-width="4" stroke-linecap="round"/></svg><div class="timer" id="timer">–</div></div>
    </div>
  </div>
  <div class="gauge" id="gaugeRow">{ICON['star']}<span>Jauge skins</span><div class="gbar"><i id="gfill"></i></div><span><b id="gtext">46</b> / 50</span></div>
  <div class="coach" id="coach" hidden></div>
  <div class="stage" id="stage">
{body}
  </div>
</div>
<div class="toast" id="toast"></div>
<div class="overlay" id="overlay"><div class="card" id="card"></div></div>
<script>
{base_js}
{js}
</script>
'''
    # Version autonome pour le jeu Ma ZP (page complète, servie telle quelle).
    page = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0f17">
<style>*,*::before,*::after{{box-sizing:border-box}}body{{margin:0}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
''' + out.replace('<script>document.body', '</head>\n<body>\n<script>document.body', 1) + '</body>\n</html>\n'
    (here.parent / f'{name}.html').write_text(page)

for n in sys.argv[1:]:
    build(n)
