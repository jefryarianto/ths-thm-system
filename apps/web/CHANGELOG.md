# Changelog

## [Unreleased] - Enhanced Members Page

### Added

#### Core Features
- Mobile card view for < 768px screens
- Column sorting with asc/desc toggle
- Search clear button (X icon)
- Filter reset button (separate from search)

#### Filter Enhancements
- Quick filter presets (Aktif, Data Incomplete, Pending Validasi)
- Active filter indicator chips
- Filter chip individual clear
- "Reset all" button

#### Column Management
- Column visibility toggle with localStorage persistence
- Reset columns to default
- Date range filter (Dadar dari/sampai)

#### Actions
- Bulk approve action
- Multi-format export (CSV, Excel, PDF)
- Saved views (beta)

#### Accessibility
- Keyboard navigation (Arrow keys, Enter, Home, End, Esc)
- Active row highlighting
- All interactive elements have aria-labels

### Changed

#### UI/UX
- Pagination shows "Showing X-Y of Z"
- Export button shows 3 format options
- Table header is sticky
- Table rows have hover effects

#### Performance
- Debounced search (300ms)
- Optimized filter rendering

### Technical

#### Files Added
- `e2e/members.spec.ts` - E2E tests
- `src/components/ui/MultiFormatExport.tsx`
- `src/components/ui/SavedViews.tsx`
- `src/components/ui/ColumnVisibility.tsx`
- `src/components/ui/DateRangeFilter.tsx`
- `src/components/members/MembersBulkAction.tsx`
- `src/lib/api-contract.ts`
- `src/lib/hooks/use-keyboard-navigation.ts`

#### Files Modified
- `app/(dashboard)/members/page.tsx` - Main page integration
- `src/components/ui/data-table.tsx` - Added keyboard navigation
- `src/components/ui/pagination.tsx` - Added info text
- `src/components/ui/search-bar.tsx` - Added clear button
- `src/lib/hooks/use-filters.ts` - Added sort support

### Breaking Changes

None. All changes are additive.

---

## [1.0.0] - Initial Release

### Added

Initial members page with:
- Data table
- Pagination
- Basic search
- Filter select components
- Member actions menu
- Mutation modal
- Import functionality

---

## Notes

**API Requirements:**
Backend must support these query parameters:
- `sort`, `order` for sorting
- `dadarFrom`, `dadarTo` for date range
- `POST /members/batch-action` for bulk operations
- `GET /api/export` for multi-format export
