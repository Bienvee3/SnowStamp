#!/usr/bin/env bash
# Integration tests against real PostGIS and PostgREST containers (needs Docker running).
# Starts the containers if missing, applies the migrations, restarts PostgREST and runs the tests.
set -euo pipefail
cd "$(dirname "$0")/.."

PG="snowstamp-pg"
REST="snowstamp-pgrst"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running." >&2
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$PG"; then
  docker run -d --name "$PG" -e POSTGRES_PASSWORD=pw -p 54329:5432 postgis/postgis:16-3.4 >/dev/null
fi
docker start "$PG" >/dev/null
until docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 2

docker rm -f "$REST" >/dev/null 2>&1 || true
CONTAINER="$PG" bash supabase/tests/run.sh

docker run -d --name "$REST" --add-host=host.docker.internal:host-gateway -p 54330:3000 \
  -e PGRST_DB_URI="postgres://postgres:pw@host.docker.internal:54329/snowstamp_test" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="test-secret-test-secret-test-secret-123456" \
  postgrest/postgrest:v12.2.3 >/dev/null
sleep 3

npm run test -w @snowstamp/infrastructure
