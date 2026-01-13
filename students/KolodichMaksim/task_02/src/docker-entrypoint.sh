#!/bin/sh
set -e

# If no DB file exists, initialize quickly
if [ ! -f /app/data.db ]; then
  echo "Initializing database..."
  python init_db.py
fi

exec "$@"
