#!/usr/bin/env bash
# Runs the migrations and SQL tests on a throwaway database inside a running PostGIS container.
# Usage: CONTAINER=snowstamp-pg bash supabase/tests/run.sh
set -euo pipefail
C="${CONTAINER:-snowstamp-pg}"
DB="snowstamp_test"
cd "$(dirname "$0")/.."
psql_c() { docker exec -i "$C" psql -v ON_ERROR_STOP=1 -q -U postgres "$@"; }
psql_c -d postgres -c "drop database if exists $DB" -c "create database $DB template template0"
psql_c -d $DB < tests/00_supabase_prelude.sql
for f in migrations/*.sql; do echo "== $f"; psql_c -d $DB < "$f"; done
for f in tests/[1-9]*.sql; do echo "== $f"; psql_c -d $DB < "$f"; done
echo "OK"
