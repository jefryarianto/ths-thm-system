# Deployment Verification Checklist

## Pre-Deployment

### Code Quality
- [ ] `npm run typecheck` - passes
- [ ] `npm run lint` - passes
- [ ] `npm run build` - no errors

### Testing
- [ ] `npm run test` - unit tests pass
- [ ] `npm run test:e2e:members` - E2E tests pass

### API Verification
- [ ] `GET /members` with `sort` & `order` params
- [ ] `POST /members/batch-action` endpoint exists
- [ ] `GET /api/export` endpoint exists
- [ ] `POST /members/print-batch` endpoint exists

### Database
- [ ] Indexes on: `status_keanggotaan`, `status_data`, `status_validasi`

## Staging Deployment

### Run
```bash
npm run build
npm run test:e2e:members
npm run deploy -- --target staging
```

### Manual QA Test

#### Mobile (< 768px)
- [ ] Card view appears instead of table
- [ ] Avatar + Name + NRA + Status visible
- [ ] Tap card navigates to detail

#### Desktop (> 1024px)
- [ ] All columns visible by default
- [ ] Sort icons appear on hover
- [ ] Column toggle menu works

#### Filters
- [ ] Date range filter shows
- [ ] Quick presets (Aktif, Incomplete, Pending) show
- [ ] Active filter chips appear
- [ ] Individual filter clear works
- [ ] "Reset semua" works

#### Actions
- [ ] Bulk action bar appears when members selected
- [ ] Multi-format export dropdown shows 3 formats
- [ ] Saved views button appears

#### Keyboard
- [ ] Arrow keys navigate rows
- [ ] Enter opens detail
- [ ] Esc clears selection

## Production Deployment

### Run
```bash
npm run deploy -- --target production
```

### Post-Deployment Monitoring
- [ ] Check error logs (0 errors in first hour)
- [ ] Monitor export API latency (<2s target)
- [ ] Monitor page load time (<2s target)

### User Communication
- [ ] Send announcement email
- [ ] Update help documentation

## Rollback Plan

If issues occur:
```bash
npm run deploy -- --target production --rollback
```

Clear user localStorage if needed:
```javascript
localStorage.removeItem('membersTableColumns');
localStorage.removeItem('membersSavedViews');
```

---

## Final Sign-off

| Phase | Status | Sign-off |
|-------|--------|----------|
| Code Review | ⬜ / ⬜ | |
| QA Testing | ⬜ / ⬜ | |
| Security Review | ⬜ / ⬜ | |
| Performance | ⬜ / ⬜ | |

**Deployed by:** ___________________
**Date:** ___________________
