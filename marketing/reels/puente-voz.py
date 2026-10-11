# Voz de la entrada de Chispa en "El nuevo del equipo": de la frase de ElevenLabs y su transcripción (Speech to Text) a assets/voz/chispa-puente.json.
# Uso: python3 puente-voz.py audio.mp3 transcripcion.json   (sin argumentos: tiempos de prueba repartidos, para armar la animación antes del audio)
import sys, json, math, array, subprocess, re
SR, FPS = 44100, 30
TEXTO = '¡Epa! ¿Ya sabes qué hacemos en Electro Shop? Vendemos tecnología, reparamos con ingeniero… ¡y hasta creamos software! Pero ven, que te presento al jefe.'
if len(sys.argv) > 2:
    mp3, js = sys.argv[1], sys.argv[2]
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '128k', 'assets/voz/chispa-puente.mp3'], check=True)
    a = array.array('h'); a.frombytes(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'assets/voz/chispa-puente.mp3', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout)
    pal = [{'w': w['text'], 't0': w['start_time'], 't1': w['end_time'], 'b': 0} for s in json.load(open(js))['segments'] for w in s['words'] if w['text'].strip() and not w['text'].startswith('[')]
    paso = SR // FPS
    rms = [round(max(-60.0, 20 * math.log10(math.sqrt(sum(x * x for x in a[i:i + paso]) / max(1, len(a[i:i + paso]))) / 32768 + 1e-9)), 1) for i in range(0, len(a), paso)]
    dur = len(a) / SR
else:
    ws = TEXTO.split(); dur = 6.2; t = .3; pal = []
    for w in ws:
        d = .1 + .05 * len(re.sub(r'[^\wáéíóú]', '', w)); pal.append({'w': w, 't0': round(t, 3), 't1': round(t + d, 3), 'b': 0}); t += d + .04
    dur = max(dur, t + .3)
    rms = [(-18 if any(p['t0'] <= i / FPS < p['t1'] for p in pal) else -60) for i in range(int(dur * FPS))]
json.dump({'duracion': round(dur, 3), 'palabras': pal, 'bloques': {'0': [pal[0]['t0'], pal[-1]['t1']]}, 'rms': rms}, open('assets/voz/chispa-puente.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(round(dur, 2), 's,', len(pal), 'palabras:', ' '.join(f"{p['w']}@{p['t0']:.2f}" for p in pal))
