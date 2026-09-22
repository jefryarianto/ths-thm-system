# Final Verification Script
# Run: npm run verify

npm run build
npm run lint
npm run typecheck

# Test E2E
npm run test:e2e:members

echo "All checks passed!"
