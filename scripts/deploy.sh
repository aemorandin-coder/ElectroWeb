#!/usr/bin/env bash
# Deploy en el servidor sin tumbar la tienda.
#
# Uso, en /var/www/electroshopve:
#   bash scripts/deploy.sh
#   bash scripts/deploy.sh --sin-pull   → compila lo que ya hay (para volver atrás: git reset --hard <commit> antes)
#
# Qué hace:
#   1. git pull (solo avance rápido).
#   2. Si la base no coincide con prisma/schema.prisma, PARA: el cambio de base se revisa y se aplica a mano.
#   3. Compila en la carpeta que NO se está sirviendo (.next-a o .next-b). La tienda sigue respondiendo.
#   4. Reinicia PM2 apuntando a la carpeta nueva y espera a que responda.
#   5. Si no responde, vuelve a la carpeta anterior. Si responde, borra la anterior.
#
# Antes el build borraba .next con la tienda corriendo y PM2 la reiniciaba sin parar
# ("Could not find a production build", 55.910 veces hasta el 26/09/2026).
#
# Todo va dentro de main(): bash lee el guion entero antes de empezar, así el git pull puede cambiarlo sin romperlo.
set -euo pipefail

APP=electroshop
PUERTO=${PUERTO:-3000}

# Valor de NEXT_DIST_DIR en el proceso de PM2 (.next si no tiene)
carpeta_pm2() {
  pm2 jlist | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const app = JSON.parse(s).find((p) => p.name === process.argv[1]);
      if (!app) { console.error("No existe el proceso de PM2 " + process.argv[1]); process.exit(1); }
      process.stdout.write(app.pm2_env.NEXT_DIST_DIR || ".next");
    });' "$APP"
}

responde() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PUERTO/")" = "200" ]
}

main() {
  cd "$(dirname "$0")/.."

  local ACTUAL NUEVA
  ACTUAL=$(carpeta_pm2)
  case "$ACTUAL" in
    .next-a) NUEVA=.next-b ;;
    .next|.next-b) NUEVA=.next-a ;;
    *) echo "PM2 sirve una carpeta inesperada ($ACTUAL). No sigo."; exit 1 ;;
  esac
  echo "Sirviendo: $ACTUAL · Compilando en: $NUEVA"

  echo "--- 1. Código"
  local ANTES DESPUES
  ANTES=$(git rev-parse HEAD)
  if [ "${1:-}" != "--sin-pull" ]; then git pull --ff-only; fi
  DESPUES=$(git rev-parse HEAD)
  git log --oneline "$ANTES..$DESPUES" | head -20

  echo "--- 2. Base de datos (solo lee)"
  local DIFF
  DIFF=$(npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script)
  if grep -qvE '^[[:space:]]*(--.*)?$' <<<"$DIFF"; then
    echo "$DIFF"
    echo
    echo "PARADO: este deploy cambia la base. La tienda sigue igual, con el build anterior."
    echo "Revisa el SQL de arriba (si hay DROP o ALTER ... TYPE, avisa a Claude),"
    echo "aplica con 'npx prisma db push' y vuelve a correr este guion."
    exit 1
  fi

  # Dependencias: se instalan si package-lock.json no es el de la última instalación. Antes se comparaba
  # ANTES..DESPUES, pero si el guion paraba por la base, la segunda corrida ya no veía el pull y no instalaba (C-113)
  local LOCK_HASH
  LOCK_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
  if [ "$(cat node_modules/.deploy-lock-hash 2>/dev/null)" != "$LOCK_HASH" ]; then
    # npm install y no npm ci: ci borra node_modules entero con la tienda corriendo
    echo "--- Instalando dependencias (package-lock.json cambió)"
    npm install --no-audit --no-fund
    echo "$LOCK_HASH" > node_modules/.deploy-lock-hash
  fi
  npx prisma generate

  echo "--- 3. Build en $NUEVA (la tienda sigue respondiendo)"
  rm -rf "$NUEVA"
  # tsconfig.json incluye los tipos de .next, .next-a y .next-b (Next los agrega solo). Los de la carpeta que se está
  # sirviendo nombran las rutas de la versión anterior: si este deploy borra una ruta, el chequeo de tipos del build
  # falla por ellos (pasó el 28/09 con /api/admin/social/generate). next start no usa esos tipos: se pueden borrar.
  local D
  for D in .next .next-a .next-b; do
    if [ "$D" != "$NUEVA" ]; then rm -rf "$D/types" "$D/dev/types"; fi
  done
  # Solo las imágenes ya optimizadas pasan a la carpeta nueva. La caché de Turbopack no: copiada, subía la memoria
  # del build un 40 % y crecía en cada deploy; el 28/09 el servidor mató el build por falta de memoria (6,8 GB)
  if [ -d "$ACTUAL/cache/images" ]; then mkdir -p "$NUEVA/cache" && cp -a "$ACTUAL/cache/images" "$NUEVA/cache/"; fi
  if ! NEXT_DIST_DIR="$NUEVA" npm run build; then
    echo "PARADO: el build falló. La tienda sigue sirviendo $ACTUAL sin cambios."
    exit 1
  fi

  echo "--- 4. Cambio a $NUEVA"
  NEXT_DIST_DIR="$NUEVA" pm2 restart "$APP" --update-env
  if [ "$(carpeta_pm2)" != "$NUEVA" ]; then
    echo "PM2 no tomó NEXT_DIST_DIR=$NUEVA. No borro nada: revisa 'pm2 env 0'."
    exit 1
  fi

  local OK=
  for _ in $(seq 1 30); do
    sleep 2
    if responde; then OK=1; break; fi
  done
  if [ -z "$OK" ]; then
    echo "La tienda no respondió con $NUEVA: vuelvo a $ACTUAL."
    NEXT_DIST_DIR="$ACTUAL" pm2 restart "$APP" --update-env
    pm2 logs "$APP" --lines 30 --nostream
    exit 1
  fi

  # Para que un reinicio del servidor levante la carpeta nueva
  pm2 save >/dev/null
  rm -rf "$ACTUAL"
  echo "--- Listo: sirviendo $NUEVA ($(git log --oneline -1))"
}

main "$@"
exit
