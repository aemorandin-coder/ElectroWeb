#!/bin/sh
# Saca los cuadros de cada clip de video (clips/*.mp4 -> clips/<nombre>/0001.jpg ...) para los videos que usan clips reales (taller, l2control).
# Los clips y sus cuadros NO se suben al repositorio: Andrés los tiene respaldados. Copia los .mp4 en chispa/clips/ y corre esto.
cd "$(dirname "$0")/.."
for f in clips/*.mp4; do
  n=$(basename "$f" .mp4); mkdir -p "clips/$n"; rm -f "clips/$n"/*.jpg
  ffmpeg -v error -y -i "$f" -q:v 3 "clips/$n/%04d.jpg"
  echo "$n $(ls clips/$n | wc -l)"
done
