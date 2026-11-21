#!/bin/bash
# Drops and recreates the local "itsm" database, so the next start with the demo profile
# loads fresh demo data. Runs psql as the current macOS user, which is the PostgreSQL superuser
# in a Homebrew install. Never touches itsm_test (the test database).
set -euo pipefail

DB_NAME="itsm"
DB_OWNER="itsm_user"
SUPERUSER="$(whoami)"

echo "This will:"
echo "  1. connect to PostgreSQL on localhost as '$SUPERUSER'"
echo "  2. close every open connection to '$DB_NAME' (stop the backend first)"
echo "  3. DROP DATABASE $DB_NAME   <- all incidents, users and notifications in it are deleted"
echo "  4. CREATE DATABASE $DB_NAME OWNER $DB_OWNER"
echo "Then start the backend with the demo profile to fill it:"
echo "  cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=demo"
echo
read -r -p "Type y to continue, anything else to cancel: " answer
if [ "$answer" != "y" ]; then
    echo "Cancelled, nothing was changed."
    exit 0
fi

psql -h localhost -U "$SUPERUSER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
 WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME OWNER $DB_OWNER;
SQL

echo "Done: '$DB_NAME' is empty and owned by $DB_OWNER."
