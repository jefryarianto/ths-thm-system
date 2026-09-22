# Members Page Enhancement Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [x] TypeScript compilation passes (`npm run typecheck`)
- [x] ESLint passes (`npm run lint`)
- [x] Unit tests passing (`npm run test`)
- [x] E2E tests passing (`npm run test:e2e:members`)

### Backend API Requirements
Ensure backend supports:

| Endpoint | Method | Params | Notes |
|----------|--------|--------|-------|
| `/members` | GET | `sort`, `order`, `dadarFrom`, `dadarTo` | Add query params |
| `/members/batch-action` | POST | `{ memberIds: [], action: 'approve' }` | Required |
| `/api/export` | GET | `type`, `exportType`, `ids` | Required |

### Database Indexes
Run these if not existing:

```sql
CREATE INDEX IF NOT EXISTS idx_members_status_keanggotaan ON members(status_keanggotaan);
CREATE INDEX IF NOT EXISTS idx_members_status_data ON members(status_data);
CREATE INDEX IF NOT EXISTS idx_members_status_validasi ON members(status_validasi);
CREATE INDEX IF NOT EXISTS idx_members_dadar_year ON members(dadar_year);
```

## Deployment Steps

### 1. Build & Test
```bash
# Navigate to web directory
cd apps/web

# Run all checks
npm run typecheck
npm run lint
npm run build
npm run test:e2e:members
```

### 2. Deploy to Staging
```bash
# Build production
npm run build

# Deploy
npm run deploy -- --target staging
```

### 3. QA Testing
**Checklist:**
- [ ] Mobile view (< 768px) shows cards
- [ ] Desktop view shows table
- [ ] Sorting works
- [ ] Column visibility persists
- [ ] Filter chips clear correctly
- [ ] Quick presets work
- [ ] Multi-format export dropdown appears
- [ ] Saved views menu appears
- [ ] Keyboard navigation works

### 4. Deploy to Production
```bash
npm run deploy -- --target production
```

## Rollback Procedure

If issues occur after deployment:

```bash
# 1. Revert to previous build
npm run deploy -- --target production --rollback

# 2. Clear user cache (optional)
# Clear CDN cache if using CDN

# 3. Localstorage reset (if needed)
localStorage.removeItem('membersTableColumns')
localStorage.removeItem('membersSavedViews')
```

## Monitoring

Watch for these metrics post-deployment:

| Metric | Target | Alert If |
|--------|--------|----------|
| Export API latency | <2s | >5s |
| Batch action latency | <3s | >10s |
| Page load time | <2s | >5s |
| Error rate | <1% | >5% |

## User Communication

**Message to send to users:**

```
📢 New Members Page Features

We've enhanced the Members page with:

✅ Mobile-friendly card view
✅ Column sorting & visibility
✅ Quick filter presets
✅ Bulk actions
✅ Export to CSV/Excel/PDF

Keyboard shortcuts:
- Arrow keys: Navigate
- Enter: Open detail
- / : Focus search

Questions? Contact support@thsthm.id
```

---

## Troubleshooting

### Issue: Export doesn't work
**Solution:** Check `/api/export` endpoint exists in backend

### Issue: Sorting doesn't persist
**Solution:** Backend must support `sort` and `order` query params

### Issue: Column visibility resets
**Solution:** Check localStorage is enabled in browser settings

### Issue: Keyboard navigation not working
**Solution:** Clear browser cache and reload (Ctrl+Shift+R)
