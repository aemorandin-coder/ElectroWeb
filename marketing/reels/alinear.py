# Alinea el guion con la voz: frases ↔ tramos de habla (entre silencios) y palabras repartidas por sílabas.
import re, json, subprocess, sys
AUDIO = 'assets/voz/chispa-ficha.mp3'
GUION = [
 "¿Electro Shop? Seguro nos conoces por la tienda web... pero eso es solo una parte.",
 "Te presento la ficha completa. Electro Shop Morandin: una empresa de Guanare con catorce años en tecnología. Lo nuestro: tecnología, desarrollo y soporte.",
 "Primero, vendemos. Tecnología, gaming, gift cards y recargas. Pagas con Pago Móvil y te lo enviamos a toda Venezuela.",
 "Segundo, reparamos. Nuestro taller, con ingeniero, le da mantenimiento a consolas, arma PC gamer e instala cámaras, redes y puntos de venta.",
 "Y tercero, lo que casi nadie sabe: desarrollamos software. Este es L2 Control: maneja el restaurante, la caja, el inventario y los permisos de todo tu equipo.",
 "¿Y quién lo usa? Abby Kingdom, en Guanare, ya opera todo su negocio con L2 Control.",
 "Y esto no se detiene. Muy pronto llega Pista Rides: una app para pedir viajes. ¿Qué más trae? Pronto lo sabrás.",
 "Así que ya sabes: no somos solo una tienda. Somos Electro Shop. ¡Gracias por verlo! Escríbenos y hablamos.",
]
out = subprocess.run(['ffmpeg','-hide_banner','-i',AUDIO,'-af','silencedetect=noise=-35dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).group(3)) + 60*int(re.search(r'Duration: (\d+):(\d+)', out).group(2))
# tramos de habla
segs = []; t0 = 0.0
for a, b in zip(st, en): segs.append((t0, a)); t0 = b
segs.append((t0, dur - 0.05))
def sil(w):
    w = w.lower()
    w = {'l2': 'ele dos', 'pc': 'pe ce', 'shop': 'chop', 'gift': 'gif', 'cards': 'cars', 'gaming': 'gueimin', 'app': 'ap', 'rides': 'raids', 'abby': 'abi', 'kingdom': 'kindom', 'software': 'sofwer'}.get(re.sub(r'[^\wáéíóúñü]', '', w), w)
    return max(1, len(re.findall(r'[aeiouáéíóúü]+', w)))
# frases: cortes en . , : ? ! y "..."
frases = []
for bi, b in enumerate(GUION):
    for f in re.split(r'(?<=[.,:?!])\s+', b.replace('...', '…')):
        if f.strip(): frases.append((bi, f.strip()))
peso = [sum(sil(w) for w in f.split()) for _, f in frases]
# alineación monótona: agrupa frases consecutivas en cada tramo minimizando el error de ritmo
import math
n, m = len(frases), len(segs)
rate = sum(peso) / sum(b - a for a, b in segs)
INF = 1e18; D = [[INF]*(m+1) for _ in range(n+1)]; P = [[None]*(m+1) for _ in range(n+1)]; D[0][0] = 0
for i in range(n+1):
    for j in range(m):
        if D[i][j] == INF: continue
        a, b = segs[j]
        for k in range(i, n+1):  # frases i..k-1 al tramo j (al menos una, o ninguna si es ruido corto)
            if k == i and (b - a) > 0.4: continue
            if k > i and len({frases[x][0] for x in range(i, k)}) > 1: break
            w = sum(peso[i:k]); c = (w / rate - (b - a))**2
            if D[i][j] + c < D[k][j+1]: D[k][j+1] = D[i][j] + c; P[k][j+1] = i
            if w / rate > (b - a) * 2.5: break
i, j = n, m; asign = []
while j > 0:
    pi = P[i][j]; asign.append((pi, i, j-1)); i, j = pi, j-1
asign.reverse()
palabras = []; bloques = {}
for pi, k, j in asign:
    a, b = segs[j]
    ws = [(bi, w) for bi, f in frases[pi:k] for w in f.split()]
    if not ws: continue
    tot = sum(sil(w) for _, w in ws); t = a
    for bi, w in ws:
        d = (b - a) * sil(w) / tot; palabras.append({'w': w, 't0': round(t, 3), 't1': round(t + d, 3), 'b': bi}); t += d
        bloques.setdefault(bi, [t - d, t]); bloques[bi][1] = t
for bi in sorted(bloques): print(bi, round(bloques[bi][0], 2), round(bloques[bi][1], 2), GUION[bi][:50])
json.dump({'duracion': dur, 'palabras': palabras, 'bloques': {k: [round(v[0], 3), round(v[1], 3)] for k, v in bloques.items()}}, open('assets/voz/chispa-ficha.json', 'w'), ensure_ascii=False, indent=0)
print(len(palabras), 'palabras', len(segs), 'tramos', len(frases), 'frases')
