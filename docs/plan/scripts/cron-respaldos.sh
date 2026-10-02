#!/bin/bash
# C-165 · Llama cada hora a la tienda para que decida si toca el respaldo del día (encendido y hora elegida en
# Configuración → Respaldos). La tienda responde enseguida y el respaldo sigue en segundo plano.
#
# Instalación (en el servidor, como el usuario de la tienda):
#   cp /var/www/electroshopve/docs/plan/scripts/cron-respaldos.sh ~/cron-respaldos.sh && chmod +x ~/cron-respaldos.sh
#   crontab -e   y agregar:   5 * * * * /home/luami/cron-respaldos.sh >> /home/luami/cron-respaldos.log 2>&1
# Probarlo a mano: ~/cron-respaldos.sh   (responde {"respaldo":"no","motivo":"apagado"} si está apagado)
set -u
DIR=/var/www/electroshopve
DOMINIO=https://electroshopve.com
SECRETO=$(grep '^CRON_SECRET=' "$DIR/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$SECRETO" ]; then
  echo "$(date '+%F %T') CRON_SECRET no está en $DIR/.env"
  exit 1
fi
echo -n "$(date '+%F %T') "
curl -fsS -m 60 -X POST -H "Authorization: Bearer $SECRETO" "$DOMINIO/api/cron/respaldos"
echo
