# Efectos de "Más boletos para la PS4" (C-300): suaves, debajo de la voz de Chispa.
# Los tiempos salen de assets/voz/chispa-sorteo-amigos-compras.json (las mismas palabras de sorteo-amigos-compras.src.html).
# Uso (desde chispa/): python3 herramientas/sonido-sorteo-amigos-compras.py -> salida/sonido-sorteo.wav
import os as _os, sys as _sys
if not _os.path.isdir('assets/voz'): _sys.exit('Corre este script desde la carpeta chispa/ (ejemplo: python3 herramientas/sonido-sorteo-amigos-compras.py)')
import math, random, wave, struct, json, re

VOZ = json.load(open('assets/voz/chispa-sorteo-amigos-compras.json'))
FIN = VOZ['palabras'][-1]['t1']
SR = 44100
DUR = math.ceil((FIN + 1.4) * 10) / 10
SALIDA = 'salida/sonido-sorteo.wav'
_os.makedirs('salida', exist_ok=True)
N = int(SR * DUR)
buf = [0.0] * N
random.seed(7)
TAU = 2 * math.pi


def add(t, samples, g=1.0):
    i0 = int(t * SR)
    for k, v in enumerate(samples):
        i = i0 + k
        if 0 <= i < N: buf[i] += v * g


def env(n, a=0.003, d=20.0):
    na = max(1, int(a * SR))
    return [min(1.0, k / na) * math.exp(-(k / SR) * d) for k in range(n)]


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


def riser(t, dur=.7, g=.3):
    add(t, lp_noise(dur, 200, 3500, lambda x: x ** 2 * (1 - x) * 4), g * 2)
    add(t, sine_glide(300, 1200, dur, 1.5), g * .25)


norm = lambda w: re.sub(r'[^a-z0-9áéíóúñü]', '', w.lower())
def D(w, desde=0.0):
    p = next((q for q in VOZ['palabras'] if norm(q['w']) == norm(w) and q['t0'] >= desde - .001), None)
    if not p: raise RuntimeError(f'falta {w}')
    return p['t0']


T = {}
T['ojo'] = D('ojo'); T['sorteo'] = D('sorteo'); T['ti'] = D('ti'); T['tu'] = D('tu', T['ti']); T['activar'] = D('activar', T['tu'])
T['mandale'] = D('mándale'); T['whatsapp'] = D('whatsapp'); T['abre'] = D('abre'); T['activar2'] = D('activar', T['abre'])
T['listo'] = D('listo'); T['cada'] = D('cada', T['listo']); T['pero'] = D('pero'); T['comprar'] = D('comprar')
T['desde'] = D('desde', T['comprar']); T['cinco'] = D('cinco', T['desde']); T['cincuenta'] = D('cincuenta')
T['cien'] = D('cien'); T['semana'] = D('semana'); T['diez'] = D('diez', T['semana']); T['llego'] = D('llegó')
T['aprobamos'] = D('aprobamos'); T['carrito'] = D('carrito'); T['compra'] = D('compra', T['carrito'])
T['todo'] = D('todo', T['carrito']); T['bases'] = D('bases'); T['electro'] = D('electroshopve')
T['veinte'] = D('veinte'); T['puede'] = D('puede')

G = 0.52  # debajo de la voz

# 0. Gancho
pop(T['ojo'], .35 * G, 800, 1200); slam(T['ojo'], .35 * G)
whoosh(T['sorteo'] - .25, .45, .45 * G)

# 1. El error ("Falta activar")
whoosh(T['activar'] - .25, .4, .35 * G)
pop(T['activar'], .28 * G); ding(T['activar'] + .15, .3 * G)

# 2. WhatsApp -> Correo -> "¡Ya cuenta!"
pop(T['mandale'], .3 * G, 750, 1150)
tap(T['whatsapp'], .45 * G)
whoosh(T['abre'] - .1, .35, .4 * G, 2800)
whoosh(T['activar2'] - .3, .35, .3 * G)
tap(T['activar2'] + .2, .45 * G)
success(T['listo'], .26 * G); pop(T['listo'], .3 * G, 900, 1300)

# 3. Regla de amigos (paneo + brillo)
whoosh(T['cada'] - .15, .45, .35 * G)
ting(T['cada'] + .45, 1318, .22 * G)

# 4. Giro a las compras
whoosh(T['pero'] - .2, .4, .45 * G, 2200)
riser(T['pero'] + .1, .6, .24 * G)
slam(T['comprar'], .42 * G); success(T['comprar'] + .04, .26 * G); coin(T['comprar'] + .06, .22 * G)

# 5. La escalera ($5 -> 2, $50 -> 5, $100 -> 10)
whoosh(T['desde'] - .4, .45, .4 * G)
pop(T['cinco'] - .05, .3 * G, 800, 1200); coin(T['cinco'], .24 * G)
pop(T['cincuenta'] - .05, .32 * G, 900, 1350); coin(T['cincuenta'], .26 * G)
pop(T['cien'] - .05, .35 * G, 1000, 1500); coin(T['cien'], .3 * G)

# 6. Producto estrella (+10)
whoosh(T['semana'] + .35, .4, .32 * G)
pop(T['diez'] - .05, .28 * G, 850, 1250); ding(T['diez'] - .05, .3 * G)

# 7. Reseñas y carrito
whoosh(T['llego'] + .35, .4, .32 * G)
pop(T['aprobamos'], .26 * G); ding(T['aprobamos'] - .05, .28 * G)
whoosh(T['carrito'] - .2, .4, .35 * G)
pop(T['carrito'] + .3, .28 * G)
ding(T['compra'] - .08, .26 * G)

# 8. Cierre
whoosh(T['bases'] - .15, .5, .4 * G, 2400)
pop(T['electro'] - .05, .3 * G, 850, 1250)
ting(T['veinte'] - .05, 1046.5, .22 * G); pop(T['veinte'] - .05, .28 * G, 900, 1300)
success(T['puede'], .25 * G)

pk = max(abs(v) for v in buf) or 1.0
scale = (0.5 / pk) if pk > 0.5 else 1.0
with wave.open(SALIDA, 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes(b''.join(struct.pack('<hh', int(max(-1, min(1, v * scale)) * 32767), int(max(-1, min(1, v * scale)) * 32767)) for v in buf))
print(SALIDA, DUR, 's, pico', round(pk, 3))
