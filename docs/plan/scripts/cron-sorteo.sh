#!/bin/bash
# C-219 · Una vez al día revisa si toca el recordatorio del sorteo (los últimos 3 días antes del cierre, una sola vez) y,
# si toca, lo manda a quien tiene boletos.
#
# Instalación (en el servidor, como el usuario de la tienda):
#   cp /var/www/electroshopve/docs/plan/scripts/cron-sorteo.sh ~/cron-sorteo.sh && chmod +x ~/cron-sorteo.sh
#   crontab -e   y agregar:   0 10 * * * /home/luami/cron-sorteo.sh >> /home/luami/cron-sorteo.log 2>&1
# Probarlo a mano: ~/cron-sorteo.sh   (responde {"recordatorio":0,"motivo":"…"} mientras no toque)
set -u
DIR=/var/www/electroshopve
DOMINIO=https://electroshopve.com
SECRETO=$(grep '^CRON_SECRET=' "$DIR/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$SECRETO" ]; then
  echo "$(date '+%F %T') CRON_SECRET no está en $DIR/.env"
  exit 1
fi
echo -n "$(date '+%F %T') "
curl -fsS -m 120 -X POST -H "Authorization: Bearer $SECRETO" "$DOMINIO/api/cron/sorteo"
echo
