# Efectos de sonido sintetizados (sin música con derechos): pops, ding de mensaje, monedas, golpes de sticker y barridos.
import math, random, wave, struct
SR = 44100; DUR = 34.0
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




# ---- 1. Gancho: ventilador que sube hasta que se apaga
def fan(t0, dur, g):
    n = int(dur * SR); y1 = y2 = 0.0; out = []
    for k in range(n):
        x = k / n
        fc = 400 + 3200 * x ** 1.4
        al = 1 - math.exp(-TAU * fc / SR)
        w = random.uniform(-1, 1)
        y1 += al * (w - y1); y2 += al * (y1 - y2)
        hum = math.sin(TAU * (90 + 160 * x) * k / SR) * .25
        out.append((y2 * 2.2 + hum) * (0.25 + 0.75 * x) * min(1, k / 2000))
    add(t0, out, g)
fan(0.0, 3.95, .55)
slam(1.3, .3)
for i in range(4): tap(3.55 + i * .1, .25)
add(3.97, sine_glide(220, 60, .35, 9), .35)
add(4.05, sine_glide(95, 38, .7, 4.5), .9); slam(4.07, .7); add(4.05, lp_noise(.35, 600, 3500, lambda x: (1 - x) ** 2), 1.2)
slam(4.55, .4)
whoosh(5.5, .62, .6, 3200)
# ---- 2. Giro
riser(5.75, .55, .25); ting(6.2, 1318, .16); pop(6.65, .3, 1100, 600); whoosh(6.55, .9, .25, 1800)
# ---- 3. Señales
pop(7.75, .28)
for t in [8.15, 8.85, 9.55]: whoosh(t - .05, .25, .25, 3000); slam(t + .2, .3)
whoosh(11.3, .35, .3)
# ---- 4. Taller
whoosh(11.62, .5, .4); pop(11.7, .28)
for t in [12.25, 12.75, 13.25]: slam(t, .32)
whoosh(14.48, .35, .3)
# ---- 5. Proceso
pop(14.78, .28); whoosh(14.8, .45, .35)
for t in [14.95, 16.9, 18.9, 20.9]: pop(t + .08, .22, 800, 1150); whoosh(t - .08, .18, .14, 4500)
whoosh(22.63, .35, .3)
# ---- 6. Vuelve a funcionar
pop(22.92, .28); whoosh(22.9, .45, .35); success(23.15, .2)
slam(23.5, .3); slam(24.85, .3); whoosh(25.98, .35, .3)
# ---- 7. Más servicios
pop(26.25, .28)
for i in range(4): pop(26.5 + i * .2, .2, 700 + i * 80, 1000 + i * 80)
whoosh(29.03, .4, .35)
# ---- 8. Cierre
riser(29.2, .45, .2); ting(29.6, 1046.5, .2)
for i in range(4): pop(29.8 + i * .09, .1, 900 + i * 60, 500)
pop(30.4, .16); pop(30.5, .16); pop(30.6, .16); pop(30.8, .22)

peak = max(abs(v) for v in buf) or 1.0
g = 0.7 / peak
with wave.open('sonido-taller.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<hh', s, s) for s in (int(max(-1, min(1, math.tanh(v * g * 1.2) / math.tanh(1.2))) * 32000) for v in buf)))
print('peak', round(peak, 3))
