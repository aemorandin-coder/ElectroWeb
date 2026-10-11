# Arma videos/<nombre>.html a partir de videos/<nombre>.src.html + herramientas/base.css + herramientas/icons.js
# y mete los datos de la voz (/*VOZ*/, /*VOZ_PUENTE*/, /*VOZ_MEDIO*/) y los tickets de L2 Control.
# Para una voz nueva no hace falta tocar este archivo: /*VOZ:nombre*/ en la página mete assets/voz/nombre.json.
# Uso (desde chispa/): python3 herramientas/armar.py ficha chispa-entrada ...
import re, sys
from pathlib import Path
RAIZ = Path(__file__).resolve().parent.parent
H, A, V = RAIZ / 'herramientas', RAIZ / 'assets', RAIZ / 'videos'
leer = lambda p: Path(p).read_text(encoding='utf-8')
icons = leer(H / 'icons.js').replace("document.querySelectorAll('i[data-ic]')", "Object.assign(P, window.EXTRA_IC || {});\ndocument.querySelectorAll('i[data-ic]')", 1)
for name in sys.argv[1:] or ['sin-miedo']:
    s = leer(V / f'{name}.src.html')
    if '/*COMANDA*/' in s: s = s.replace('/*COMANDA*/', leer(A / 'ticket-comanda.html').strip()).replace('/*RECIBO*/', leer(A / 'ticket-recibo.html').strip())
    if '/*VOZ_MEDIO*/' in s: s = s.replace('/*VOZ_MEDIO*/', leer(A / 'voz/chispa-medio.json').strip())
    if '/*VOZ_PUENTE*/' in s: s = s.replace('/*VOZ_PUENTE*/', leer(A / 'voz/chispa-puente.json').strip())
    s = re.sub(r'/\*VOZ:([\w-]+)\*/', lambda m: leer(A / f'voz/{m.group(1)}.json').strip(), s)
    if '/*VOZ*/' in s: s = s.replace('/*VOZ*/', leer(A / 'voz/chispa-ficha.json').strip())
    (V / f'{name}.html').write_text(s.replace('/*BASE*/', leer(H / 'base.css')).replace('/*ICONS*/', icons), encoding='utf-8')
    print('videos/' + name + '.html')
