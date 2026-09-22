# Quick Start - Members Page Enhancement

## Setup

```bash
cd apps/web
npm install
npm run dev
```

## Development

### Run Tests
```bash
npm run test          # Unit tests
npm run test:e2e:members  # E2E tests
```

### Check Code
```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
```

## Testing Features

### Mobile View
1. Resize browser to 375x667
2. Should see cards instead of table

### Sorting
1. Hover column headers
2. Click sort arrow
3. Check URL has `?sort=nama&order=asc`

### Column Visibility
1. Click eye icon (top right)
2. Toggle columns
3. Check localStorage in DevTools

### Filters
1. Apply status filter
2. Verify chip appears
3. Click chip to clear

### Keyboard Navigation
1. Click table
2. Use Arrow keys
3. Press Enter to open detail

## Production Checklist

1. Run `npm run build`
2. Run `npm run test:e2e:members`
3. Deploy to staging
4. Manual QA
5. Deploy to production

## Common Issues

| Issue | Solution |
|-------|----------|
| Export doesn't work | Check `/api/export` endpoint |
| Sorting doesn't persist | Backend must support `sort` & `order` params |
| Column visibility resets | Check localStorage enabled |
| Keyboard doesn't work | Clear cache (Ctrl+Shift+R) |
