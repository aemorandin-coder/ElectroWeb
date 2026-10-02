# Arma sin-miedo.html a partir de sin-miedo.src.html + base.css + icons.js (estilos e íconos compartidos de la serie).
s = open('sin-miedo.src.html').read()
icons = open('icons.js').read().replace("document.querySelectorAll('i[data-ic]')", "Object.assign(P, window.EXTRA_IC || {});\ndocument.querySelectorAll('i[data-ic]')", 1)
open('sin-miedo.html', 'w').write(s.replace('/*BASE*/', open('base.css').read()).replace('/*ICONS*/', icons))
