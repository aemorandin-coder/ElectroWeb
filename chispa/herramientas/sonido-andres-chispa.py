# Efectos de "El nuevo del equipo" (Andrés + Chispa): suaves, debajo de la voz.
# Arma tres pistas en salida/: entrada_sfx.wav (Chispa se presenta), medio_sfx.wav (la sección de Cursos) y capa_sfx.wav (encima de los dos clips de Flow).
# Los tiempos de la entrada y del medio salen de assets/voz/chispa-puente.json y chispa-medio.json: si cambia la voz, los efectos se mueven solos.
# Uso (desde chispa/): python3 herramientas/sonido-andres-chispa.py
import os as _os, sys as _sys
if not _os.path.isdir('assets/voz'): _sys.exit('Corre este script desde la carpeta chispa/ (ejemplo: python3 herramientas/sonido-andres-chispa.py)')
import json, math, random, wave, struct
SR, TAU = 48000, 2 * math.pi
_os.makedirs('salida', exist_ok=True)


class Pista:
    def __init__(self, dur, semilla):
        self.n = int(SR * dur); self.buf = [0.0] * self.n; random.seed(semilla)

    def add(self, t, s, g):
        i0 = int(t * SR)
        for k, v in enumerate(s):
            if 0 <= i0 + k < self.n: self.buf[i0 + k] += v * g

    def tono(self, f0, f1, dur, d, g, t, harm=0):
        n = int(dur * SR); ph = 0; out = []
        for k in range(n):
            f = f0 * (f1 / f0) ** (k / n); ph += TAU * f / SR
            out.append((math.sin(ph) + harm * math.sin(2 * ph)) * math.exp(-k / SR * d) * min(1, k / 100))
        self.add(t, out, g)

    def pop(self, t, g=.2, f0=950, f1=430): self.tono(f0, f1, .1, 38, g, t)

    def whoosh(self, t, dur=.45, g=.35):
        n = int(dur * SR); y1 = y2 = 0; out = []
        for k in range(n):
            x = k / n; fc = 250 + 2600 * math.sin(math.pi * x) ** 1.5; al = 1 - math.exp(-TAU * fc / SR); w = random.uniform(-1, 1)
            y1 += al * (w - y1); y2 += al * (y1 - y2); out.append(y2 * math.sin(math.pi * x ** .8) ** 2)
        self.add(t, out, g * 2.2)

    def guarda(self, nombre):
        with wave.open(f'salida/{nombre}', 'w') as f:
            f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
            f.writeframes(b''.join(struct.pack('<hh', int(max(-1, min(1, v)) * 32767), int(max(-1, min(1, v)) * 32767)) for v in self.buf))
        print('salida/' + nombre)


def voz(nombre):
    v = json.load(open(f'assets/voz/{nombre}.json'))
    return v, lambda w: [p['t0'] for p in v['palabras'] if p['w'].lower().strip('¡!¿?.,:') == w][0]


# Entrada: Chispa se presenta (chispa-puente)
V, W = voz('chispa-puente'); p = Pista(V['duracion'] + .6, 5)
p.pop(.05, .18, 700, 1100); p.whoosh(W('hacemos') - .3, .4, .25)
for i, w in enumerate(['vendemos', 'reparamos', 'software']): p.pop(W(w) - .05, .22, 800 + i * 100, 1200 + i * 100)
for i, w in enumerate(['windows', 'microsoft', 'planes']): p.pop(W(w) - .05, .13, 1000 + i * 120, 1400 + i * 120)
p.tono(1318, 1318, .6, 5, .12, W('todo')); p.tono(2637, 2637, .4, 9, .05, W('todo'))
p.whoosh(V['palabras'][-1]['t1'] + .15, .45, .4)
p.guarda('entrada_sfx.wav')

# Medio: la sección de Cursos (chispa-medio)
V, W = voz('chispa-medio'); p = Pista(13.5, 9)
p.pop(.08, .18, 700, 1100)
p.tono(1318, 1318, .6, 5, .12, W('cursos')); p.pop(W('cursos'), .2, 800, 1300)
p.whoosh(W('eres') - .35, .4, .3); p.pop(W('eres'), .18)
p.pop(W('tecnología'), .16, 900, 1300); p.pop(W('energía'), .16, 1000, 1400)
p.pop(W('monetizar'), .2, 800, 1200); p.pop(W('podrás'), .2, 850, 1250)
p.pop(W('postúlate'), .24, 700, 1100); p.tono(1568, 1568, .5, 6, .1, W('postúlate') + .05)
p.whoosh(V['palabras'][-1]['t1'] + .15, .45, .4)
p.guarda('medio_sfx.wav')

# Capa: encima de los dos clips de Flow (20 s; el corte entre e1 y e2 cae en 9,963 s)
T2 = 9.963; p = Pista(20, 3)
p.pop(.7, .2); p.pop(4.5, .22, 800, 1200); p.whoosh(T2 - .3, .45, .35); p.pop(T2 + 2.75, .2); p.pop(T2 + 5.4, .22, 900, 1300)
p.guarda('capa_sfx.wav')
