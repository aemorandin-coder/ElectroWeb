#!/bin/sh
# Saca los cuadros de cada clip (assets/clips/*.mp4 -> clips/<nombre>/0001.jpg ...). Los cuadros no se suben al repositorio.
cd "$(dirname "$0")"
for f in assets/clips/*.mp4; do
  n=$(basename "$f" .mp4); mkdir -p "clips/$n"; rm -f "clips/$n"/*.jpg
  ffmpeg -v error -y -i "$f" -q:v 3 "clips/$n/%04d.jpg"
  echo "$n $(ls clips/$n | wc -l)"
done
