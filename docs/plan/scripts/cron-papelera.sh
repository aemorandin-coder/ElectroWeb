#!/bin/bash
# C-169 · Una vez al día borra para siempre lo que lleva más de 30 días en la papelera de productos.
#
# Instalación (en el servidor, como el usuario de la tienda):
#   cp /var/www/electroshopve/docs/plan/scripts/cron-papelera.sh ~/cron-papelera.sh && chmod +x ~/cron-papelera.sh
#   crontab -e   y agregar:   45 9 * * * /home/luami/cron-papelera.sh >> /home/luami/cron-papelera.log 2>&1
# Probarlo a mano: ~/cron-papelera.sh   (responde {"revisados":0,"borrados":0,"archivados":0} si no hay nada vencido)
set -u
DIR=/var/www/electroshopve
DOMINIO=https://electroshopve.com
SECRETO=$(grep '^CRON_SECRET=' "$DIR/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$SECRETO" ]; then
  echo "$(date '+%F %T') CRON_SECRET no está en $DIR/.env"
  exit 1
fi
echo -n "$(date '+%F %T') "
curl -fsS -m 120 -X POST -H "Authorization: Bearer $SECRETO" "$DOMINIO/api/cron/papelera"
echo
