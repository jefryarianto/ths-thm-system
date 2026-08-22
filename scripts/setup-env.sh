#!/bin/bash
# Script to synchronize environment files from root .env.example

ROOT_ENV_EXAMPLE=".env.example"
API_ENV="apps/api/.env"

echo "Checking environment configuration..."

if [ ! -f "$ROOT_ENV_EXAMPLE" ]; then
  echo "Error: Root $ROOT_ENV_EXAMPLE not found."
  exit 1
fi

# Setup API .env if it doesn't exist
if [ ! -f "$API_ENV" ]; then
  echo "Creating $API_ENV from root $ROOT_ENV_EXAMPLE..."
  cp "$ROOT_ENV_EXAMPLE" "$API_ENV"
  echo "Please update $API_ENV with your local credentials."
else
  echo "$API_ENV already exists. Skipping creation."
fi

echo "Environment setup complete."