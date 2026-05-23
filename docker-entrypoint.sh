#!/bin/sh
set -e

echo "Waiting for database..."
until node -e "
const net = require('net');
const s = new net.Socket();
s.connect(5432, process.env.DB_HOST || 'db', () => { s.destroy(); process.exit(0); });
s.on('error', () => { process.exit(1); });
" 2>/dev/null; do
  sleep 1
done
echo "Database is ready."

echo "Applying schema..."
npx prisma db push --accept-data-loss 2>&1

echo "Seeding database..."
npx prisma db seed 2>&1 || echo "Seed skipped or already applied."

echo "Starting app..."
exec node server.js
