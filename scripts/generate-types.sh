#!/bin/bash
# Script to generate API types for the frontend

echo "Generating API types..."

# Navigate to the API directory
cd apps/api || exit

# Run the generation script
# Assuming 'swagger.json' is generated in apps/api/swagger.json
# If not, you might need to run the swagger export script first
# npm run swagger:export

npm run generate:client

echo "Types generated successfully!"