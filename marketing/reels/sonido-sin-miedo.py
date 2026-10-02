# Efectos de sonido sintetizados (sin música con derechos): pops, ding de mensaje, monedas, golpes de sticker y barridos.
import math, random, wave, struct
SR = 44100; DUR = 30.6
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



# ---- 1. Gancho largo
pop(0.0, .2)
for t in [.45, .95]: ding(t, .26); buzz(t, .12)
whoosh(1.45, .3, .25, 4000); pop(1.55, .2, 700, 1200)
pop(2.1, .1, 600, 500)
for i in range(6): tap(2.45 + i * .09, .06)
pop(3.0, .1, 500, 300)
for t in [3.4, 3.8, 4.35]: whoosh(t - .05, .2, .15, 4000); pop(t + .05, .16, 700, 1100)
add(4.7, sine_glide(420, 300, .25, 8), .25); add(4.82, sine_glide(330, 220, .3, 8), .25)
# el golpe
add(4.95, sine_glide(95, 38, .7, 4.5), .9); slam(4.97, .7); add(4.95, lp_noise(.35, 600, 3500, lambda x: (1 - x) ** 2), 1.2)
slam(5.45, .4)
OFF = 3.6
whoosh(3.0, .62, .6, 3200)
# ---- 2. Giro
riser(3.25, .55, .25); ting(3.7, 1318, .16); pop(4.1, .3, 1100, 600); whoosh(4.1, .9, .25, 1800)
# ---- 3. Empresa real
whoosh(5.2, .5, .45); pop(5.32, .28)
whoosh(5.95, 1.1, .22, 1500)
ting(7.1, 1568, .14)
for t in [7.45, 7.68, 7.91]: slam(t, .33)
# ---- 4. Pago Móvil
whoosh(8.88, .45, .35); pop(9.0, .28)
for i in range(6): tap(9.74 + i * .09, .18)
tap(10.65)
for i in range(4): pop(10.8 + i * .2, .06, 500, 480)
success(11.6); coin(11.65, .16)
slam(11.95, .35); slam(12.2, .3)
# ---- 5. Pedido
whoosh(12.93, .45, .35); pop(13.05, .28)
for i in range(3): pop(13.5 + i * .38, .22, 800 + i * 150, 1100 + i * 150)
whoosh(14.45, .3, .2, 2500)
slam(14.85, .35); slam(15.1, .3)
# ---- 6. Garantía
whoosh(16.53, .45, .35); pop(16.65, .28)
ting(17.15, 1175, .16); slam(17.35, .3)
whoosh(18.08, .45, .3); tap(18.9); pop(19.12, .25, 700, 1000); ding(19.15, .18)
# ---- 7. WhatsApp
whoosh(19.78, .45, .35); pop(19.9, .28)
whoosh(20.35, .25, .25, 4000); pop(20.45, .18, 700, 1200)
ding(21.4, .3); buzz(21.4, .12); slam(21.75, .3)
whoosh(22.42, .45, .4)
# ---- 8. Cierre
riser(22.4, .45, .2); ting(22.8, 1046.5, .2)
for i in range(4): pop(23.0 + i * .09, .1, 900 + i * 60, 500)
pop(23.6, .16); pop(23.7, .16); pop(23.8, .16); pop(24.0, .22)

peak = max(abs(v) for v in buf) or 1.0
g = 0.7 / peak
with wave.open('sonido-sin-miedo.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<hh', s, s) for s in (int(max(-1, min(1, math.tanh(v * g * 1.2) / math.tanh(1.2))) * 32000) for v in buf)))
print('peak', round(peak, 3))
