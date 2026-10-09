# Efectos de sonido sintetizados (sin música con derechos): pops, ding de mensaje, monedas, golpes de sticker y barridos.
import math, random, wave, struct
SR = 44100; DUR = 45.0
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





# ---- L2 Control
pop(0.0, .2); slam(1.0, .3); pop(3.0, .25, 700, 1100)
whoosh(4.35, .7, .6, 3200); riser(4.4, .5, .25); ting(4.9, 1318, .2); pop(5.3, .3, 1100, 600)
for i in range(4): pop(5.75 + i * .08, .12, 900 + i * 70, 600)
pop(6.1, .2); whoosh(7.0, .35, .3)
# restaurante
pop(7.2, .28); whoosh(7.25, .45, .35)
for k in range(9): tap(7.9 + k * .32, .16)
slam(8.4, .3); ding(10.2, .26); slam(10.2, .25); whoosh(11.2, .35, .3)
# comanda
pop(11.4, .28); whoosh(11.45, .4, .3)
for k in range(26): add(11.95 + k * .05, lp_noise(.035, 2500, 5000, lambda x: 1 - x), .25)
slam(13.1, .3); whoosh(14.0, .35, .3)
# caja
pop(14.2, .28); whoosh(14.25, .45, .35)
for t in [15.2, 16.0, 16.9, 17.8]: slam(t, .28)
coin(17.0, .16); success(18.2, .18); whoosh(19.0, .35, .3)
# recibo
for k in range(34): add(19.55 + k * .044, lp_noise(.03, 2500, 5000, lambda x: 1 - x), .22)
slam(20.4, .28); whoosh(21.4, .35, .3)
# inventario / roles / reportes
pop(21.6, .28); whoosh(21.65, .45, .35)
for t in [22.6, 23.2, 23.8]: slam(t, .26)
whoosh(24.8, .3, .25); pop(25.0, .28)
for t in [25.9, 26.6, 27.3]: slam(t, .26)
whoosh(28.4, .3, .25); pop(28.6, .28); slam(29.2, .26); whoosh(30.35, .25, .2); slam(30.7, .26)
whoosh(31.8, .35, .3)
# parque / capacitación / Abby
pop(32.0, .28); whoosh(32.05, .45, .35); slam(32.9, .26)
whoosh(34.4, .35, .3); pop(34.6, .28); whoosh(34.65, .45, .35)
whoosh(37.2, .4, .35); ting(37.5, 1046.5, .2); pop(37.6, .3, 1100, 600)
for i in range(6): pop(37.8 + i * .07, .1, 900 + i * 60, 500)
success(38.6, .16); whoosh(39.8, .4, .35)
# cierre
riser(39.7, .45, .2); ting(40.2, 1046.5, .2)
for i in range(5): pop(40.4 + i * .08, .1, 900 + i * 60, 500)
pop(41.1, .16); pop(41.2, .16); pop(41.3, .16); pop(41.5, .22)

peak = max(abs(v) for v in buf) or 1.0
g = 0.7 / peak
with wave.open('sonido-l2control.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<hh', s, s) for s in (int(max(-1, min(1, math.tanh(v * g * 1.2) / math.tanh(1.2))) * 32000) for v in buf)))
print('peak', round(peak, 3))
