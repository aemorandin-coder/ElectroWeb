# Voz de la entrada de Chispa en "El nuevo del equipo": de la frase de ElevenLabs y su transcripción (Speech to Text) a assets/voz/chispa-puente.json.
# Uso (desde chispa/): python3 herramientas/puente-voz.py audio.mp3 transcripcion.json   (sin argumentos: tiempos de prueba repartidos, para armar la animación antes del audio)
import os as _os, sys as _sys
if not _os.path.isdir('assets/voz'): _sys.exit('Corre este script desde la carpeta chispa/ (ejemplo: python3 herramientas/puente-voz.py)')
import sys, json, math, array, subprocess, re, os
NOMBRE = os.environ.get('NOMBRE', 'chispa-puente')  # NOMBRE=chispa-medio para la escena del medio
SR, FPS = 44100, 30
TEXTO = os.environ.get('TEXTO') or '¡Epa! ¿Ya sabes qué hacemos en Electro Shop? Vendemos tecnología, reparamos con ingeniero… y en software: licencias de Windows original, Microsoft 365 y planes de IA. ¡Todo lo encuentras con nosotros! Pero ven, que te presento al jefe.'
if len(sys.argv) > 2:
    mp3, js = sys.argv[1], sys.argv[2]
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '128k', f'assets/voz/{NOMBRE}.mp3'], check=True)
    a = array.array('h'); a.frombytes(subprocess.run(['ffmpeg', '-v', 'error', '-i', f'assets/voz/{NOMBRE}.mp3', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout)
    pal = [{'w': w['text'], 't0': w['start_time'], 't1': w['end_time'], 'b': 0} for s in json.load(open(js))['segments'] for w in s['words'] if w['text'].strip() and not w['text'].startswith('[')]
    # pausas de más de 0,6 s quedan en 0,45 s (se recorta el medio del silencio y se corren las palabras)
    sal, corr, prev = array.array('h'), 0.0, 0.0
    cortes = []
    for i in range(1, len(pal)):
        g0, g1 = pal[i - 1]['t1'], pal[i]['t0']
        if g1 - g0 > .6: cortes.append((g0 + .2, g1 - .25))
    for c0, c1 in cortes:
        sal.extend(a[int(prev * SR):int(c0 * SR)]); prev = c1
    sal.extend(a[int(prev * SR):])
    def mover(t): return t - sum(min(c1, t) - c0 for c0, c1 in cortes if t > c0)
    for q in pal: q['t0'], q['t1'] = round(mover(q['t0']), 3), round(mover(q['t1']), 3)
    a = sal
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', f'assets/voz/{NOMBRE}.mp3'], input=a.tobytes(), check=True)
    # cómo se escribe en pantalla
    VER = {'Electroshop?': ['Electro', 'Shop?'], 'Todo': ['¡Todo'], 'nosotros.': ['nosotros!'], 'y,': ['y'], 'software,': ['software:']}
    nuevo = []
    for q in pal:
        partes = VER.get(q['w'], [q['w']])
        for k, txt in enumerate(partes):
            d = (q['t1'] - q['t0']) / len(partes); nuevo.append({**q, 'w': txt, 't0': round(q['t0'] + d * k, 3), 't1': round(q['t0'] + d * (k + 1), 3)})
    pal = nuevo
    # la transcripción a veces mete la pausa dentro de una palabra corta ("¿Eres" de casi 1 s): se corre su inicio
    for q in pal:
        letras = len(re.sub(r'[^\wáéíóúñ]', '', q['w'])); largo = .15 + .085 * letras
        if q['t1'] - q['t0'] > largo + .35: q['t0'] = round(q['t1'] - largo, 3)
    paso = SR // FPS
    rms = [round(max(-60.0, 20 * math.log10(math.sqrt(sum(x * x for x in a[i:i + paso]) / max(1, len(a[i:i + paso]))) / 32768 + 1e-9)), 1) for i in range(0, len(a), paso)]
    dur = len(a) / SR
else:
    ws = TEXTO.split(); dur = 6.2; t = .3; pal = []
    for w in ws:
        d = .1 + .05 * len(re.sub(r'[^\wáéíóú]', '', w)); pal.append({'w': w, 't0': round(t, 3), 't1': round(t + d, 3), 'b': 0}); t += d + .04
    dur = max(dur, t + .3)
    rms = [(-18 if any(p['t0'] <= i / FPS < p['t1'] for p in pal) else -60) for i in range(int(dur * FPS))]
json.dump({'duracion': round(dur, 3), 'palabras': pal, 'bloques': {'0': [pal[0]['t0'], pal[-1]['t1']]}, 'rms': rms}, open(f'assets/voz/{NOMBRE}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(round(dur, 2), 's,', len(pal), 'palabras:', ' '.join(f"{p['w']}@{p['t0']:.2f}" for p in pal))
