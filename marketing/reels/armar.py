# Arma <reel>.html a partir de <reel>.src.html + base.css + icons.js (estilos e íconos compartidos de la serie).
# Uso: python3 armar.py sin-miedo taller
import sys
icons = open('icons.js').read().replace("document.querySelectorAll('i[data-ic]')", "Object.assign(P, window.EXTRA_IC || {});\ndocument.querySelectorAll('i[data-ic]')", 1)
for name in sys.argv[1:] or ['sin-miedo']:
    s = open(name + '.src.html').read()
    if '/*COMANDA*/' in s: s = s.replace('/*COMANDA*/', open('assets/ticket-comanda.html').read().strip()).replace('/*RECIBO*/', open('assets/ticket-recibo.html').read().strip())
    if '/*VOZ*/' in s: s = s.replace('/*VOZ*/', open('assets/voz/chispa-ficha.json').read().strip())
    open(name + '.html', 'w').write(s.replace('/*BASE*/', open('base.css').read()).replace('/*ICONS*/', icons))
