# Efectos de "La ficha de Electro Shop": suaves, debajo de la voz de Chispa. Los tiempos salen de assets/voz/chispa-ficha.json
# (las mismas palabras que usa la línea de tiempo de ficha.src.html), así que si cambia la voz, los efectos se mueven solos.
import math, random, wave, struct, json, re
VOZ = json.load(open('assets/voz/chispa-ficha.json'))
SR = 44100; DUR = math.ceil(VOZ['duracion'] + 1.6)
N = int(SR * DUR); buf = [0.0] * N
random.seed(7)
TAU = 2 * math.pi

OFF = 0.0
def add(t, samples, g=1.0):
    i0 = int((t + OFF) * SR)
    for k, v in enumerate(samples):
        i = i0 + k
        if 0 <= i < N: buf[i] += v * g

def env(n, a=0.003, d=20.0):
    out = []
    na = max(1, int(a * SR))
    for k in range(n):
        x = k / SR
        out.append(min(1.0, k / na) * math.exp(-x * d))
    return out

def sine_glide(f0, f1, dur, d=30.0, a=0.002, harm=0.0):
    n = int(dur * SR); e = env(n, a, d); out = []; ph = 0.0
    for k in range(n):
        f = f0 * (f1 / f0) ** (k / n)
        ph += TAU * f / SR
        out.append(e[k] * (math.sin(ph) + harm * math.sin(2 * ph)))
    return out

def tone(f, dur, d=12.0, a=0.002):
    return sine_glide(f, f, dur, d, a)

def lp_noise(dur, fc0, fc1, shape):
    n = int(dur * SR); y1 = y2 = 0.0; out = []
    for k in range(n):
        x = k / n
        fc = fc0 + (fc1 - fc0) * math.sin(math.pi * x) ** 1.5
        al = 1 - math.exp(-TAU * fc / SR)
        w = random.uniform(-1, 1)
        y1 += al * (w - y1); y2 += al * (y1 - y2)
        out.append(y2 * shape(x))
    return out

def whoosh(t, dur=.42, g=.5, top=2600):
    add(t, lp_noise(dur, 250, top, lambda x: math.sin(math.pi * x ** .8) ** 2), g * 2.2)

def pop(t, g=.35, f0=950, f1=430): add(t, sine_glide(f0, f1, .1, 38), g)
def ding(t, g=.32):
    add(t, sine_glide(1568, 1568, .12, 26, harm=.25), g)
    add(t + .075, sine_glide(2093, 2093, .22, 16, harm=.2), g * .9)
def coin(t, g=.26):
    add(t, tone(1976, .35, 12), g); add(t + .055, tone(2637, .5, 9), g * 1.1)
    add(t + .055, tone(5274, .25, 20), g * .25)
def tap(t, g=.4):
    add(t, lp_noise(.03, 3000, 6000, lambda x: 1 - x), g * 1.5); add(t, tone(1800, .04, 80), g * .5)
def slam(t, g=.5):
    add(t, sine_glide(150, 52, .2, 16), g); add(t, lp_noise(.07, 900, 2500, lambda x: (1 - x) ** 2), g * 1.4)
def success(t, g=.24):
    for i, f in enumerate([1046.5, 1318.5, 1568, 2093]): add(t + i * .065, sine_glide(f, f, .35, 10, harm=.15), g)
def ting(t, f, g=.22):
    for m, d, a in [(1, 3.2, 1), (2.76, 5, .45), (5.4, 8, .2)]: add(t, tone(f * m, 1.0, d), g * a)
def buzz(t, g=.18):
    n = int(.2 * SR); out = []
    for k in range(n):
        x = k / SR; am = .5 + .5 * math.sin(TAU * 28 * x)
        out.append(am * (math.sin(TAU * 165 * x) + .3 * math.sin(TAU * 495 * x)) * min(1, k / 300) * (1 - k / n))
    add(t, out, g)
def riser(t, dur=.7, g=.3):
    add(t, lp_noise(dur, 200, 3500, lambda x: x ** 2 * (1 - x) * 4), g * 2)
    add(t, sine_glide(300, 1200, dur, 1.5), g * .25)

# ---- Tiempos de la voz (igual que W() en la página)
norm = lambda w: re.sub(r'[^a-z0-9áéíóúñü]', '', w.lower())
def W(w, b, n=0): return [p['t0'] for p in VOZ['palabras'] if p['b'] == b and norm(p['w']) == norm(w)][n]
B = {int(k): v for k, v in VOZ['bloques'].items()}
G = .55  # todo va debajo de la voz

# 0. ¿Una tienda?
pop(0.0, .3 * G); whoosh(.25, .4, .4 * G); slam(W('parte', 0), .5 * G)
# 1. La ficha
whoosh(B[1][0] - .45, .4, .4 * G); pop(W('ficha', 1) - .1, .4 * G)
for w, n in [('electro', 0), ('guanare', 0), ('catorce', 0)]:
    t0 = W(w, 1, n) - (0 if w == 'electro' else .1)
    for i in range(6): tap(t0 + i * .07, .12 * G)
for w, n in [('tecnología', 1), ('desarrollo', 0), ('soporte', 0)]: pop(W(w, 1, n), .35 * G, 900, 1300)
# 2. Vendemos
whoosh(B[2][0] - .4, .55, .55 * G, 3200)
for i, w in enumerate(['tecnología', 'gaming', 'gift', 'recargas']): pop(W(w, 2) - .05, .38 * G, 800 + i * 90, 1200 + i * 90)
whoosh(W('energía', 2) - .55, .35, .35 * G); riser(W('energía', 2) - .5, .45, .25 * G); slam(W('energía', 2) - .1, .4 * G)
pop(W('ups', 2) - .05, .35 * G, 900, 1300); pop(W('inversores', 2) - .05, .35 * G, 1000, 1400); slam(W('instalamos', 2), .5 * G)
whoosh(W('pagas', 2) - .45, .35, .35 * G); coin(W('pagas', 2), .3 * G); whoosh(W('enviamos', 2), .35, .35 * G)
# 3. Reparamos
whoosh(B[3][0] - .4, .55, .55 * G, 3200); pop(W('nuestro', 3) - .1, .4 * G); slam(W('ingeniero', 3), .5 * G)
for i, w in enumerate(['consolas', 'pc', 'cámaras', 'redes', 'puntos']): pop(W(w, 3) - .05, .3 * G, 850 + i * 60, 1150 + i * 60)
# 4. Desarrollamos
whoosh(B[4][0] - .4, .55, .55 * G, 3200); slam(W('casi', 4) + .1, .55 * G)
riser(W('desarrollamos', 4) - .6, .6, .3 * G); pop(W('este', 4), .45 * G)
for i, w in enumerate(['restaurante', 'caja', 'inventario', 'permisos']): pop(W(w, 4) - .05, .3 * G, 900 + i * 70, 1300 + i * 70)
# 5. ¿Quién lo usa?
whoosh(B[5][0] - .4, .55, .55 * G, 3200); pop(W('abby', 5) - .1, .45 * G, 600, 1100); success(W('opera', 5), .25 * G)
# 6. Pista Rides
tg = W('muy', 6) - .25
whoosh(tg, .3, .4 * G, 3600); tap(tg + .45, .35 * G); riser(W('pista', 6) - .6, .6, .35 * G)
ting(W('pista', 6) + .1, 1318, .25 * G); pop(W('app', 6), .35 * G)
for i in range(3): pop(W('qué', 6) + i * .12, .25 * G, 600 + i * 150, 1000 + i * 150)
pop(W('pronto', 6, 1), .3 * G); whoosh(W('sabrás', 6) - .1, .3, .35 * G)
# 7. Cierre
whoosh(B[7][0] - .4, .55, .55 * G, 3200)
for i in range(3): pop(W('tienda', 7) - .2 + i * .25, .35 * G, 800 + i * 120, 1200 + i * 120)
slam(W('somos', 7, 1), .45 * G); ting(W('somos', 7, 1) + .05, 1046.5, .2 * G)
whoosh(W('gracias', 7) - .25, .4, .4 * G); pop(W('gracias', 7) + .1, .4 * G)
tap(W('escríbenos', 7) + .55, .5 * G); ding(W('escríbenos', 7) + .65, .3 * G)

pk = max(abs(v) for v in buf) or 1
with wave.open('sonido-ficha.wav', 'w') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v * .5 / pk if pk > .5 else v)) * 32767)) for v in buf))
print('sonido-ficha.wav', DUR, 's, pico', round(pk, 3))
