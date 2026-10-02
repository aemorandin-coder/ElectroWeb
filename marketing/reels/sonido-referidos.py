# Efectos de sonido sintetizados (sin música con derechos): pops, ding de mensaje, monedas, golpes de sticker y barridos.
import math, random, wave, struct
SR = 44100; DUR = 27.0
N = int(SR * DUR); buf = [0.0] * N
random.seed(7)
TAU = 2 * math.pi

def add(t, samples, g=1.0):
    i0 = int(t * SR)
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

# ---- 1. Gancho
pop(0.0, .25)
for t in [.42, .8, 1.14, 1.42]: ding(t, .3); buzz(t, .14)
pop(1.8, .3); slam(2.0, .45)
whoosh(2.7, .62, .6, 3200)
# ---- 2. Giro
riser(2.95, .55, .25); ting(3.4, 1318, .16); pop(3.75, .3, 1100, 600); whoosh(3.85, .9, .25, 1800)
# ---- 3. Paso 1
whoosh(4.85, .5, .45); pop(5.0, .28)
for t in [5.68, 5.9, 6.12]: slam(t, .35)
whoosh(6.45, .25, .2, 2000)
tap(6.85); whoosh(7.08, .4, .3, 1800); success(7.35)
# ---- 4. Paso 2
whoosh(8.83, .45, .35); pop(8.98, .28)
whoosh(9.3, .3, .3, 4000); pop(9.45, .2, 700, 1200)
slam(9.95, .3)
ding(10.55, .28); buzz(10.55, .1); ding(11.05, .28); buzz(11.05, .1)
# ---- 5. Paso 3
whoosh(11.83, .45, .35); pop(11.98, .28)
for t in [12.45, 13.4, 14.3, 15.12]: pop(t, .22, 700, 1000); coin(t + .22)
slam(15.95, .45)
whoosh(16.72, .4, .35)
# ---- 6. Niveles
pop(16.98, .28); ting(17.08, 880, .22); ting(17.75, 1175, .22); ting(18.25, 1568, .26); coin(18.3, .18)
whoosh(18.75, .35, .3)
# ---- 7. Paso 4
whoosh(18.88, .45, .4); pop(19.0, .28); slam(19.12, .45)
tap(19.85); success(20.06); coin(20.1, .16)
whoosh(20.8, .45, .4)
# ---- 8. Cierre
riser(20.75, .45, .2); ting(21.15, 1046.5, .2)
for i in range(6): pop(21.4 + i * .07, .1, 900 + i * 60, 500)
pop(21.95, .28); pop(22.25, .18); pop(22.35, .18)

peak = max(abs(v) for v in buf) or 1.0
g = 0.7 / peak
with wave.open('sonido-referidos.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<hh', s, s) for s in (int(max(-1, min(1, math.tanh(v * g * 1.2) / math.tanh(1.2))) * 32000) for v in buf)))
print('peak', round(peak, 3))
