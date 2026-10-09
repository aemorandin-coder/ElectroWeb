#!/bin/bash
# C-167 · Una vez al día acredita en Puntos ES las comisiones de promotores cuya orden lleva 7 días entregada.
#
# Instalación (en el servidor, como el usuario de la tienda):
#   cp /var/www/electroshopve/docs/plan/scripts/cron-promotores.sh ~/cron-promotores.sh && chmod +x ~/cron-promotores.sh
#   crontab -e   y agregar:   30 9 * * * /home/luami/cron-promotores.sh >> /home/luami/cron-promotores.log 2>&1
# Probarlo a mano: ~/cron-promotores.sh   (responde {"acreditadas":0,"rechazadas":0,"revisadas":0} si no hay nada listo)
set -u
DIR=/var/www/electroshopve
DOMINIO=https://electroshopve.com
SECRETO=$(grep '^CRON_SECRET=' "$DIR/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$SECRETO" ]; then
  echo "$(date '+%F %T') CRON_SECRET no está en $DIR/.env"
  exit 1
fi
echo -n "$(date '+%F %T') "
curl -fsS -m 120 -X POST -H "Authorization: Bearer $SECRETO" "$DOMINIO/api/cron/promotores"
echo
