#!/bin/bash
# scripts/setup.sh
# One-command dev setup

echo "Setting up PharmaVigil..."
echo "1. Installing dependencies..."
pnpm install

echo "2. Applying database migrations..."
pnpm db:migrate

echo "3. Seeding database..."
pnpm db:seed

echo "Setup complete! Run 'pnpm dev' to start the application."
