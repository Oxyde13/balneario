#!/usr/bin/env bash
# Levanta um backend local equivalente ao Supabase (Postgres + PostgREST + gateway
# de autenticação) para desenvolver sem criar um projeto na nuvem.
#
#   ./scripts/dev-local/start.sh     # levanta tudo e escreve .env.local
#   ./scripts/dev-local/stop.sh      # desliga
#
# Precisa de Docker. O RLS é o mesmo das migrations: o perfil "equipa" continua
# a não poder escrever nada. O Storage (fotos) não existe aqui — os avatares
# usam as iniciais.
set -euo pipefail

cd "$(dirname "$0")/../.."
DIR=scripts/dev-local
PG=balneario-pg
REST=balneario-rest
NET=balneario

docker network create "$NET" >/dev/null 2>&1 || true
docker rm -f "$PG" "$REST" >/dev/null 2>&1 || true

echo "==> Postgres 17 (porta 54323)"
docker run -d --name "$PG" --network "$NET" -e POSTGRES_PASSWORD=postgres -e TZ=UTC -p 54323:5432 postgres:17-alpine >/dev/null
for _ in $(seq 1 60); do docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$PG" psql -U postgres -q -c "create database app" >/dev/null

echo "==> Migrations + seed"
for f in supabase/tests/supabase_stub.sql supabase/migrations/*.sql supabase/seed.sql; do
  docker exec -i "$PG" psql -U postgres -d app -v ON_ERROR_STOP=1 -q -f - < "$f"
  echo "    $f"
done

if [ ! -f "$DIR/.jwt.secret" ]; then
  head -c 48 /dev/urandom | base64 | tr -d '\n=+/' | head -c 48 > "$DIR/.jwt.secret"
fi
SECRET=$(cat "$DIR/.jwt.secret")

echo "==> PostgREST (porta 54322)"
docker run -d --name "$REST" --network "$NET" -p 54322:3000 \
  -e PGRST_DB_URI="postgres://postgres:postgres@$PG:5432/app" \
  -e PGRST_DB_SCHEMAS="public" \
  -e PGRST_DB_ANON_ROLE="anon" \
  -e PGRST_JWT_SECRET="$SECRET" \
  -e PGRST_DB_USE_LEGACY_GUCS="false" \
  postgrest/postgrest:v12.2.3 >/dev/null
sleep 4

if [ ! -f .env.local ]; then
  echo "==> .env.local"
  cat > .env.local <<ENV
VITE_SUPABASE_URL=/
VITE_SUPABASE_ANON_KEY=local-anon-key
VITE_ADMIN_EMAIL=admin@balneario.app
VITE_TEAM_EMAIL=equipa@balneario.app
VITE_APP_URL=http://localhost:5173
ENV
fi

echo "==> Gateway de autenticação (porta 54321)"
nohup node "$DIR/gateway.mjs" > "$DIR/gateway.log" 2>&1 &
sleep 1

cat <<TXT

Backend local pronto.
  PINs:  administrador 123456 · equipa 654321
  Agora corre:  npm run dev      (http://localhost:5173)
  Registos do gateway: $DIR/gateway.log
TXT
