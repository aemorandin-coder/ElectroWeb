# Arma la voz final de Chispa para "La ficha" y su mapa de tiempos (assets/voz/chispa-ficha.mp3 + .json).
# Los tiempos de cada palabra salen de la transcripción de ElevenLabs (Speech to Text, *.scribe.json), no de cálculos:
# así los subtítulos y cada tarjeta caen justo en la palabra. El bloque "Vendemos" viene de una toma aparte.
# Encima: pausas entre ideas, 93 % de velocidad y volumen normalizado (-14 LUFS).
# Uso: python3 voz.py
import re, json, math, array, subprocess

SR, FPS, TEMPO = 44100, 30, 0.93
ORIGINAL = ('assets/voz/chispa-ficha-original.mp3', 'assets/voz/chispa-ficha-original.scribe.json')
VENDEMOS = ('assets/voz/chispa-ficha-vendemos.mp3', 'assets/voz/chispa-ficha-vendemos.scribe.json')
SALIDA = 'assets/voz/chispa-ficha'

# Primera palabra de cada bloque del guion en la toma original (el bloque 2 se cambia por la toma de Vendemos).
INICIO_BLOQUE = [('Electroshop.', 0), ('Te', 0), ('Primero,', 0), ('Segundo,', 0), ('Y', 0), ('¿Y', 0), ('Y', 1), ('Así', 0)]
PAUSA_BLOQUE = .8
# Pausas extra antes de una palabra: (palabra, cuál aparición, segundos)
PAUSAS_ORIGINAL = [('lo', 1, .45), ('desarrollamos', 0, .35), ('Muy', 0, .45), ('Pista', 0, .3), ('¿Qué', 0, .4), ('Gracias', 0, .45)]
PAUSAS_VENDEMOS = [('energía', 0, .35), ('Pago', 0, .3), ('pagas', 0, .15), ('con', 1, .2)]
# Cómo se escribe en pantalla lo que la transcripción escribe distinto
TEXTO = {'Electroshop.': ['¿Electro', 'Shop?'], 'Electroshop': ['Electro', 'Shop'], 'Morandín,': ['Morandin:'], 'Abbey': ['Abby'],
         'SUM': ['ZOOM'], 'pago': ['Pago'], 'móvil': ['Móvil'], 'Gracias': ['¡Gracias'], 'verlo.': ['verlo!'],
         'pagas': ['Pagas']}

def pcm(path):
    a = array.array('h'); a.frombytes(subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout); return a

def palabras(path):
    return [{'w': w['text'].replace('"', ''), 't0': w['start_time'], 't1': w['end_time']} for s in json.load(open(path))['segments'] for w in s['words'] if w['text'].strip()]

def busca(ws, w, n):
    return [i for i, p in enumerate(ws) if p['w'] == w][n]

def silencio(a, t0, t1):
    # punto más callado entre dos palabras (ventanas de 10 ms): ahí se corta sin chasquidos
    w = SR // 100; mejor, tm = None, (t0 + t1) / 2
    for i in range(int(t0 * SR), max(int(t0 * SR) + 1, int(t1 * SR) - w), w // 2):
        e = sum(x * x for x in a[i:i + w])
        if mejor is None or e < mejor: mejor, tm = e, (i + w / 2) / SR
    return tm

def cortes(a, ws, pausas):
    # [(instante de corte, segundos de silencio a insertar)] en el hueco antes de cada palabra pedida
    out = []
    for w, n, seg in pausas:
        i = busca(ws, w, n); out.append((silencio(a, ws[i - 1]['t1'], ws[i]['t0']), seg))
    return sorted(out)

ao, wo = pcm(ORIGINAL[0]), palabras(ORIGINAL[1])
av, wv = pcm(VENDEMOS[0]), palabras(VENDEMOS[1])
ib = [busca(wo, w, n) for w, n in INICIO_BLOQUE]
for k, i in enumerate(ib):
    for p in wo[i:(ib[k + 1] if k + 1 < len(ib) else len(wo))]: p['b'] = k
for p in wv: p['b'] = 2

# Cortes de bloque en la original y pausas internas
corte_bloque = [silencio(ao, wo[i - 1]['t1'], wo[i]['t0']) for i in ib[1:]]
c2_ini, c2_fin = corte_bloque[1], corte_bloque[2]       # el bloque 2 original sale entero
pausas_o = sorted([(c, PAUSA_BLOQUE) for c in corte_bloque if c not in (c2_ini, c2_fin)] + cortes(ao, wo, PAUSAS_ORIGINAL))
pausas_v = cortes(av, wv, PAUSAS_VENDEMOS)

# Línea de tiempo: [original hasta el bloque 2] + pausa + [Vendemos] + pausa + [original desde el bloque 3]
salida, mapa = array.array('h'), []     # mapa: (fuente, inicio en fuente, inicio en salida, fin en fuente)
def pega(a, fuente, t0, t1, pausas):
    t = t0
    for c, seg in [p for p in pausas if t0 < p[0] < t1] + [(t1, 0)]:
        mapa.append((fuente, t, len(salida) / SR, c)); salida.extend(a[int(t * SR):int(c * SR)])
        salida.extend(array.array('h', [0]) * int(seg * SR)); t = c
v_ini = max(0, wv[0]['t0'] - .12); v_fin = min(len(av) / SR, wv[-1]['t1'] + .15)
pega(ao, 'o', 0, c2_ini, pausas_o); salida.extend(array.array('h', [0]) * int(PAUSA_BLOQUE * SR))
pega(av, 'v', v_ini, v_fin, pausas_v); salida.extend(array.array('h', [0]) * int(PAUSA_BLOQUE * SR))
pega(ao, 'o', c2_fin, len(ao) / SR, pausas_o)

def a_salida(fuente, t):
    for f, s0, o0, s1 in mapa:
        if f == fuente and s0 <= t <= s1: return (o0 + t - s0) / TEMPO
    raise ValueError((fuente, t))

final = []
for fuente, ws in (('o', [p for p in wo if p['b'] < 2]), ('v', wv), ('o', [p for p in wo if p['b'] > 2])):
    for p in ws:
        t0, t1 = a_salida(fuente, p['t0']), a_salida(fuente, p['t1'])
        partes = ['Electro', 'Shop.'] if p['w'] == 'Electroshop.' and p['b'] == 7 else TEXTO.get(p['w'], [p['w']])
        for k, txt in enumerate(partes):  # una palabra que en pantalla son dos (Electro Shop) se reparte el tiempo
            final.append({'w': txt, 't0': round(t0 + (t1 - t0) * k / len(partes), 3), 't1': round(t0 + (t1 - t0) * (k + 1) / len(partes), 3), 'b': p['b']})

subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'atempo={TEMPO},loudnorm=I=-14:TP=-1.5:LRA=11',
                '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '128k', SALIDA + '.mp3'], input=salida.tobytes(), check=True)
a = pcm(SALIDA + '.mp3'); paso = SR // FPS
rms = []
for i in range(0, len(a), paso):
    s = a[i:i + paso]; rms.append(round(max(-60.0, 20 * math.log10(math.sqrt(sum(x * x for x in s) / max(1, len(s))) / 32768 + 1e-9)), 1))
bloques = {}
for p in final: bloques.setdefault(str(p['b']), [p['t0'], p['t1']])[1] = p['t1']
json.dump({'duracion': round(len(a) / SR, 3), 'palabras': final, 'bloques': bloques, 'rms': rms}, open(SALIDA + '.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(a) / SR:.2f} s, {len(final)} palabras')
for k, v in bloques.items(): print(' bloque', k, v, ' '.join(p['w'] for p in final if str(p['b']) == k)[:110])
