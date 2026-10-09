# Cambia un bloque de la voz de Chispa por frases grabadas aparte (un archivo por frase, así cada imagen cae justo en su palabra).
# Parte de la versión anterior (assets/voz/chispa-ficha-v1.mp3 + .json) y escribe assets/voz/chispa-ficha.mp3 + .json.
# Uso: python3 empalmar.py   (los archivos nuevos van en assets/voz/ficha-2a.mp3 ... ficha-2d.mp3)
import re, json, math, array, subprocess

BASE_MP3, BASE_JSON = 'assets/voz/chispa-ficha-v1.mp3', 'assets/voz/chispa-ficha-v1.json'
SALIDA_MP3, SALIDA_JSON = 'assets/voz/chispa-ficha.mp3', 'assets/voz/chispa-ficha.json'
BLOQUE = 2
FRASES = [  # (archivo, texto tal cual se le pidió a ElevenLabs, pausa después)
    ('assets/voz/ficha-2a.mp3', 'Primero: vendemos.', .45),
    ('assets/voz/ficha-2b.mp3', 'Tecnología, gaming, gift cards y recargas.', .6),
    ('assets/voz/ficha-2c.mp3', 'Y algo que hoy hace mucha falta: energía. UPS e inversores, y también te los instalamos.', .6),
    ('assets/voz/ficha-2d.mp3', 'Pagas con Pago Móvil, y te lo enviamos a toda Venezuela.', 0),
]
TEMPO = 0.93          # igual que el resto de la voz
SR, FPS = 44100, 30

def sil(w):  # sílabas, igual que alinear.py (más "UPS", que se lee "u pe ese")
    w = w.lower()
    w = {'l2': 'ele dos', 'pc': 'pe ce', 'shop': 'chop', 'gift': 'gif', 'cards': 'cars', 'gaming': 'gueimin', 'app': 'ap', 'ups': 'u pe ese'}.get(re.sub(r'[^\wáéíóúñü]', '', w), w)
    return max(1, len(re.findall(r'[aeiouáéíóúü]+', w)))

def pcm(path, filtro=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', path] + (['-af', filtro] if filtro else []) + ['-ac', '1', '-ar', str(SR), '-f', 's16le', '-']
    a = array.array('h'); a.frombytes(subprocess.run(cmd, capture_output=True, check=True).stdout); return a

def rms_db(a, i0=0, i1=None):
    i1 = len(a) if i1 is None else i1
    if i1 <= i0: return -60.0
    s = sum(x * x for x in a[i0:i1]) / (i1 - i0)
    return max(-60.0, 20 * math.log10(math.sqrt(s) / 32768 + 1e-9))

def tramos(a, umbral=-35, minimo=.15):
    # tramos de habla dentro del archivo (ventanas de 10 ms por encima del umbral, huecos de al menos `minimo`)
    w = SR // 100; on = [rms_db(a, i, i + w) > umbral for i in range(0, len(a), w)]
    out, ini, hueco = [], None, 0
    for k, v in enumerate(on + [False] * 100):
        if v:
            if ini is None: ini = k
            hueco = 0
        elif ini is not None:
            hueco += 1
            if hueco * .01 >= minimo: out.append((ini * .01, (k - hueco + 1) * .01)); ini = None
    return out

base = json.load(open(BASE_JSON)); voz = pcm(BASE_MP3)
b0, b1 = base['bloques'][str(BLOQUE)]
corte0, corte1 = int((b0 - .03) * SR), int((b1 + .04) * SR)
nivel = rms_db(voz, corte0, corte1)          # el bloque nuevo suena igual de fuerte que el viejo

nuevo, palabras_nuevas, t = array.array('h'), [], b0 - .03
for path, texto, pausa in FRASES:
    a = pcm(path, f'atempo={TEMPO},silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.05')
    habla = tramos(a)
    g = 10 ** ((nivel - rms_db(a, int(habla[0][0] * SR), int(habla[-1][1] * SR))) / 20)
    a = array.array('h', (max(-32767, min(32767, int(x * g))) for x in a))
    # palabras: frases ↔ tramos si coinciden; si no, por sílabas sobre el tiempo con voz
    frases = [f for f in re.split(r'(?<=[.,:?!])\s+', texto) if f]
    grupos = [[f] for f in frases] if len(frases) == len(habla) else [frases]
    spans = habla if len(frases) == len(habla) else [habla]
    for fs, sp in zip(grupos, spans):
        ws = [w for f in fs for w in f.split()]
        partes = sp if isinstance(sp, list) else [sp]
        largo = sum(e - s for s, e in partes); tot = sum(sil(w) for w in ws); acc = 0
        def real(x):  # tiempo con voz -> tiempo del archivo
            for s, e in partes:
                if x <= e - s: return s + x
                x -= e - s
            return partes[-1][1]
        for w in ws:
            d = largo * sil(w) / tot
            palabras_nuevas.append({'w': w, 't0': round(t + real(acc), 3), 't1': round(t + real(acc + d), 3), 'b': BLOQUE}); acc += d
    nuevo.extend(a); t += len(a) / SR
    if pausa: nuevo.extend(array.array('h', [0]) * int(pausa * SR)); t += pausa

delta = len(nuevo) / SR - (corte1 - corte0) / SR
out = voz[:corte0] + nuevo + voz[corte1:]
mover = lambda x: round(x + delta, 3) if x > b1 else x
palabras = [p for p in base['palabras'] if p['b'] < BLOQUE] + palabras_nuevas + \
           [{**p, 't0': mover(p['t0']), 't1': mover(p['t1'])} for p in base['palabras'] if p['b'] > BLOQUE]
bloques = {k: ([v[0], v[1]] if int(k) < BLOQUE else [round(v[0] + delta, 3), round(v[1] + delta, 3)]) for k, v in base['bloques'].items()}
bloques[str(BLOQUE)] = [palabras_nuevas[0]['t0'], palabras_nuevas[-1]['t1']]

subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', SALIDA_MP3], input=out.tobytes(), check=True)
paso = SR // FPS
rms = [round(rms_db(out, i, i + paso), 1) for i in range(0, len(out), paso)]
json.dump({'duracion': round(len(out) / SR, 3), 'palabras': palabras, 'bloques': bloques, 'rms': rms}, open(SALIDA_JSON, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'bloque {BLOQUE}: {bloques[str(BLOQUE)]}  cambio {delta:+.2f} s  total {len(out) / SR:.2f} s')
for p in palabras_nuevas: print(f"  {p['t0']:7.2f} {p['w']}")
