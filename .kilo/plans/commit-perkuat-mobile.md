# Plan: Commit "Perkuat Mobile App" changes

## Files to Stage

### Modified files (10)

- `.env.example`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/package.json`
- `apps/mobile/src/screens/MemberImportScreen.tsx`
- `apps/mobile/src/screens/documents/index.tsx`
- `apps/mobile/src/screens/dues/index.tsx`
- `apps/mobile/src/screens/graduations/index.tsx`
- `apps/mobile/src/screens/members/home.tsx`
- `apps/mobile/src/screens/profile/edit.tsx`
- `pnpm-lock.yaml`

### New files (15 — exclude .kilo/plans/\*.md)

- `apps/mobile/app/assessments.tsx`
- `apps/mobile/app/assessments/[id].tsx`
- `apps/mobile/app/documents/[id].tsx`
- `apps/mobile/app/dues/[id].tsx`
- `apps/mobile/app/graduations/[id].tsx`
- `apps/mobile/app/member-import.tsx`
- `apps/mobile/src/hooks/use-assessments.ts`
- `apps/mobile/src/hooks/use-role.ts`
- `apps/mobile/src/screens/assessments/index.tsx`
- `apps/mobile/src/screens/assessments/detail.tsx`
- `apps/mobile/src/screens/documents/detail.tsx`
- `apps/mobile/src/screens/dues/detail.tsx`
- `apps/mobile/src/screens/graduations/detail.tsx`
- `apps/mobile/src/types/index.ts`

## Files NOT to commit

- `.kilo/plans/perkuat-mobile-app.md`
- `.kilo/plans/project-status-assessment.md`

## Commit Message

```
feat(mobile): perkuat mobile app — assessments, detail screens, role access, import

- Add assessments hook (use-assessments) and screens (list + detail)
- Add detail screens for graduations, dues, documents
- Add role-based access control hook (use-role)
- Add member import screen with navigation
- Add photo upload to profile edit
- Add shared type definitions
- Add menu entries for new features in home screen
- Refactor MemberImportScreen to use shared components
```

## Steps

1. `git add` all files listed above (exclude plan files)
2. `git commit -m "feat(mobile): ..."`
3. Verify commit with `git log --oneline -1`
