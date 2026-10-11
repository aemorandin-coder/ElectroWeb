#!/bin/sh
# Montaje de "El nuevo del equipo" v4 (55 s): entrada animada -> clip real 1 -> Cursos animado -> clip real 2 -> cierre de la serie.
# Es la receta exacta del video publicado; para uno nuevo se copia y se cambian los tiempos (ver conocimiento/05-videos-reales-con-flow.md).
#
# Antes de correrlo (desde chispa/):
#   1. clips/e1.mp4 y clips/e2.mp4: las dos escenas de Google Flow (10 s, 24 fps, 1080x1920). No se suben al repositorio.
#   2. python3 herramientas/armar.py chispa-entrada chispa-medio
#      PAGE=videos/chispa-entrada.html node herramientas/render.mjs video salida/entrada_mudo.mp4
#      PAGE=videos/chispa-medio.html node herramientas/render.mjs video salida/medio_mudo.mp4
#   3. node herramientas/capa.mjs videos/andres-chispa-capa.html salida/capa 24
#   4. python3 herramientas/sonido-andres-chispa.py
# Uso: sh herramientas/montaje-andres-chispa.sh   -> salida/andres-chispa.mp4
set -e
cd "$(dirname "$0")/.."
[ -f clips/e1.mp4 ] && [ -f clips/e2.mp4 ] || { echo "Faltan clips/e1.mp4 y clips/e2.mp4 (los clips de Flow)"; exit 1; }
mkdir -p salida

# 1. Voz de Chispa en los clips: se calla la voz que inventó Flow (volume=enable), se rellena ese hueco con el ruido
#    del cuarto (un trozo sin voz en bucle) y se pegan las frases de ElevenLabs (assets/voz/chispa-flow.mp3) con adelay.
#    Los tiempos salen de herramientas/quien-habla.py (dónde habla Chispa) y de la transcripción de chispa-flow.mp3.
ffmpeg -y -v error -i clips/e1.mp4 -i assets/voz/chispa-flow.mp3 -filter_complex "\
[0:a]volume=enable='between(t,4.35,6.40)+between(t,6.60,7.75)':volume=0[base];\
[0:a]atrim=3.6:4.3,asetpts=N/SR/TB,aloop=loop=-1:size=33600,atrim=0:10,volume=enable='not(between(t,4.35,6.40)+between(t,6.60,7.75))':volume=0[tono];\
[1:a]atrim=0.0:1.68,asetpts=N/SR/TB,atempo=0.93,volume=6dB,aresample=48000,aformat=channel_layouts=stereo,adelay=4450|4450[l1];\
[1:a]atrim=3.06:3.84,asetpts=N/SR/TB,atempo=0.88,volume=6dB,aresample=48000,aformat=channel_layouts=stereo,adelay=6700|6700[l2];\
[base][tono][l1][l2]amix=inputs=4:duration=first:normalize=0[a]" -map "[a]" -c:a pcm_s16le salida/e1_audio.wav
ffmpeg -y -v error -i clips/e2.mp4 -i assets/voz/chispa-flow.mp3 -filter_complex "\
[0:a]volume=enable='between(t,5.28,6.95)+between(t,7.12,8.30)':volume=0[base];\
[0:a]atrim=0.2:1.2,asetpts=N/SR/TB,aloop=loop=-1:size=48000,atrim=0:10,volume=enable='not(between(t,5.28,6.95)+between(t,7.12,8.30))':volume=0[tono];\
[1:a]atrim=5.14:6.66,asetpts=N/SR/TB,volume=6dB,aresample=48000,aformat=channel_layouts=stereo,adelay=5380|5380[l3];\
[1:a]atrim=7.34:8.32,asetpts=N/SR/TB,volume=6dB,aresample=48000,aformat=channel_layouts=stereo,adelay=7200|7200[l4];\
[base][tono][l3][l4]amix=inputs=4:duration=first:normalize=0[a]" -map "[a]" -c:a pcm_s16le salida/e2_audio.wav

# 2. Todo junto a 24 fps. La capa de textos (20 s) se parte en 9,963 s: la primera mitad va sobre e1 y la segunda sobre e2.
#    El cierre entra con -ss 0.2 para saltar los cuadros del teléfono que quedaron al principio de cierre.mp4.
ffmpeg -y -v error \
 -i salida/entrada_mudo.mp4 -i assets/voz/chispa-puente.mp3 -i salida/entrada_sfx.wav \
 -i clips/e1.mp4 -i salida/e1_audio.wav \
 -i salida/medio_mudo.mp4 -i assets/voz/chispa-medio.mp3 -i salida/medio_sfx.wav \
 -i clips/e2.mp4 -i salida/e2_audio.wav \
 -framerate 24 -i salida/capa/%04d.png -i salida/capa_sfx.wav -ss 0.2 -i assets/cierre.mp4 -filter_complex "\
[10:v]split[cA][cB];[cA]trim=start=0:end=9.963,setpts=PTS-STARTPTS[c1];[cB]trim=start=9.963,setpts=PTS-STARTPTS[c2];\
[0:v]fps=24,setsar=1[v0];[3:v]setsar=1[v3];[v3][c1]overlay=format=auto[v1];[5:v]fps=24,setsar=1[vm];[8:v]setsar=1[v8];[v8][c2]overlay=format=auto[v2];\
[12:v]fps=24,scale=1080:1920,setsar=1,setpts=PTS-STARTPTS[vc];[v0][v1][vm][v2][vc]concat=n=5:v=1:a=0,format=yuv420p[v];\
[11:a]asplit[sA][sB];[sA]atrim=0:9.963,asetpts=PTS-STARTPTS[s1];[sB]atrim=start=9.963,asetpts=PTS-STARTPTS[s2];\
[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=2dB[vz0];[vz0][2:a]amix=inputs=2:duration=longest:normalize=0,apad,atrim=0:17[a0];\
[4:a][s1]amix=inputs=2:duration=first:normalize=0[a1];\
[6:a]aresample=48000,aformat=channel_layouts=stereo,volume=2dB[vzm];[vzm][7:a]amix=inputs=2:duration=longest:normalize=0,apad,atrim=0:13.3[am];\
[9:a][s2]amix=inputs=2:duration=first:normalize=0[a2];\
[12:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS[ac];[a0][a1][am][a2][ac]concat=n=5:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
-map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -r 24 -c:a aac -b:a 192k -movflags +faststart salida/andres-chispa.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 salida/andres-chispa.mp4
