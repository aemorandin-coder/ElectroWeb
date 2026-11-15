#!/bin/bash
# C-227 · Una vez al día manda los avisos de venta a los proveedores que no salieron y, el día del plazo, el recordatorio
# de la guía (con su aviso al equipo).
#
# Instalación (en el servidor, como el usuario de la tienda):
#   cp /var/www/electroshopve/docs/plan/scripts/cron-despachos.sh ~/cron-despachos.sh && chmod +x ~/cron-despachos.sh
#   crontab -e   y agregar:   5 10 * * * /home/luami/cron-despachos.sh >> /home/luami/cron-despachos.log 2>&1
# Probarlo a mano: ~/cron-despachos.sh   (responde {"avisos":0,"recordatorios":0} mientras no haya nada pendiente)
set -u
DIR=/var/www/electroshopve
DOMINIO=https://electroshopve.com
SECRETO=$(grep '^CRON_SECRET=' "$DIR/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$SECRETO" ]; then
  echo "$(date '+%F %T') CRON_SECRET no está en $DIR/.env"
  exit 1
fi
echo -n "$(date '+%F %T') "
curl -fsS -m 120 -X POST -H "Authorization: Bearer $SECRETO" "$DOMINIO/api/cron/despachos"
echo
