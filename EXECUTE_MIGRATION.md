# Quick Start: Execute shadcn/ui Migration

## Overview

This document provides the exact command to execute the comprehensive UI/UX migration to shadcn/ui using Claude Code with multi-agent coordination.

---

## Prerequisites

1. **Backup**: Create a new branch before starting
   ```bash
   git checkout -b shadcn-migration
   git push -u origin shadcn-migration
   ```

2. **Environment**: Ensure you're in the frontend directory
   ```bash
   cd frontend
   ```

3. **Clean State**: Ensure no uncommitted changes
   ```bash
   git status
   ```

---

## Execution Command

Copy and paste this command to Claude Code:

```
Please execute the Flashpoint Web UI/UX migration to shadcn/ui using the comprehensive plan in SHADCN_MIGRATION_PROMPT.md.

Use the agent-organizer to coordinate multiple specialized agents across 9 phases:

Phase 1 (Setup): Use tooling-engineer or typescript-pro
Phase 2 (Foundation): Use frontend-developer or react-specialist
Phase 3 (Layout): Use ui-designer + frontend-developer
Phase 4 (Forms): Use typescript-pro + frontend-developer (can parallel with Phase 5)
Phase 5 (Tables): Use typescript-pro + frontend-developer (can parallel with Phase 4)
Phase 6 (Dialogs): Use frontend-developer (can parallel with Phase 7)
Phase 7 (Complex): Use frontend-developer + ui-designer (can parallel with Phase 6)
Phase 8 (Views/Cleanup): Use frontend-developer + refactoring-specialist
Phase 9 (Testing): Use code-reviewer + frontend-developer

Execute phases sequentially with verification checkpoints after each phase. Parallelize Phases 4-5 and 6-7 where possible to optimize execution time.

Key requirements:
- Complete rewrite approach (replace all components at once)
- Remove custom 30+ color palette system, use shadcn/ui default themes only
- Implement react-hook-form + zod for all forms
- Migrate all tables to TanStack Table DataTable
- Delete custom theme files: lib/theme.ts (425 lines), styles/design-tokens.ts (464 lines)
- Update tailwind.config.js completely for shadcn/ui
- Replace index.css CSS variables with shadcn/ui HSL system

Expected outcome:
- 40+ components migrated to shadcn/ui
- ~1,800 lines of custom code removed
- Type-safe forms with validation
- Modern table implementation
- Consistent design system
- No build errors

Start with Phase 1: Setup & Configuration.
```

---

## Alternative: Phased Execution

If you prefer to execute one phase at a time with manual verification between phases:

### Phase 1: Setup & Configuration
```
Execute Phase 1 of the shadcn/ui migration (Setup & Configuration) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use tooling-engineer or typescript-pro agent to:
1. Install dependencies (shadcn/ui, react-hook-form, zod, TanStack Table)
2. Initialize shadcn/ui CLI
3. Update tailwind.config.js for shadcn/ui
4. Replace CSS variables in index.css with shadcn/ui HSL system
5. Simplify store/theme.ts (remove primaryColor, use class-based dark mode)
6. DELETE lib/theme.ts and styles/design-tokens.ts

Verify npm run dev works after completion.
```

### Phase 2: Foundation Components
```
Execute Phase 2 of the shadcn/ui migration (Foundation Components) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use frontend-developer or react-specialist agent to:
1. Install foundation shadcn components (button, card, badge, input, textarea, label, select, separator, skeleton, toast, sonner)
2. Migrate Button, IconButton, Card, Badge components
3. Replace Toast system with Sonner
4. Rebuild 4 skeleton components
5. Update App.tsx to include Toaster

Verify all foundation components render correctly.
```

### Phase 3: Layout Components
```
Execute Phase 3 of the shadcn/ui migration (Layout Components) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use ui-designer + frontend-developer agents to:
1. Install layout components (dropdown-menu, avatar, sheet, scroll-area)
2. Rebuild Header.tsx with shadcn components
3. Rebuild Sidebar.tsx with ScrollArea and Button
4. Simplify ThemePicker.tsx (remove color palette grid, keep light/dark toggle only)
5. Update AppShell.tsx

Verify header, sidebar, and theme picker work correctly.
```

### Phase 4: Form Components
```
Execute Phase 4 of the shadcn/ui migration (Form Components) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use typescript-pro + frontend-developer agents to:
1. Install form components (form, checkbox, radio-group, switch)
2. Create zod schemas for all forms
3. Rebuild LoginForm with react-hook-form + zod
4. Rebuild RegisterForm with react-hook-form + zod
5. Rebuild UserForm with react-hook-form + zod
6. Rebuild RoleForm with react-hook-form + zod
7. Update CreatePlaylistModal form
8. Update ChangePasswordDialog form

Verify all forms validate and submit correctly.
```

### Phase 5: Table Components
```
Execute Phase 5 of the shadcn/ui migration (Table Components) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use typescript-pro + frontend-developer agents to:
1. Install table component
2. Create base DataTable component (components/ui/data-table.tsx)
3. Migrate UserTable to TanStack Table DataTable
4. Migrate RoleTable to TanStack Table DataTable
5. Migrate ActivityTable to TanStack Table DataTable

Verify sorting, pagination, and row actions work correctly.
```

### Phase 6: Dialog & Modal Components
```
Execute Phase 6 of the shadcn/ui migration (Dialog & Modal Components) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use frontend-developer agent to:
1. Install dialog components (dialog, alert-dialog)
2. Migrate ConfirmDialog to AlertDialog
3. Migrate CreatePlaylistModal to Dialog
4. Migrate AddToPlaylistModal to Dialog
5. Migrate GamePlayerDialog to Dialog
6. Migrate BrowseCommunityPlaylistsModal to Dialog
7. Migrate ChangePasswordDialog to Dialog

Verify all dialogs open/close properly and forms inside dialogs work.
```

### Phase 7: Complex Components
```
Execute Phase 7 of the shadcn/ui migration (Complex Components) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use frontend-developer + ui-designer agents to:
1. Install additional components (popover, command, toggle, toggle-group)
2. Rebuild SearchBar with shadcn Input
3. Rebuild FilterPanel with Popover, Checkbox, Toggle
4. Rebuild GameCard with shadcn Card, Badge, Button
5. Update GameGrid and GameList
6. Rebuild CardSizeControl with ToggleGroup
7. Update NetworkStatusIndicator with shadcn Badge

Verify search, filters, and game browsing work correctly.
```

### Phase 8: Views & Cleanup
```
Execute Phase 8 of the shadcn/ui migration (Views & Cleanup) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use frontend-developer + refactoring-specialist agents to:
1. Update all 15 views to use new shadcn components
2. Update stats/chart components to use shadcn colors
3. Update App.tsx to include Toaster
4. DELETE all old custom component files
5. Perform global search/replace for import paths
6. Clean up unused code

Verify all views render without errors and imports are correct.
```

### Phase 9: Testing & Polish
```
Execute Phase 9 of the shadcn/ui migration (Testing & Polish) as detailed in SHADCN_MIGRATION_PROMPT.md.

Use code-reviewer + frontend-developer agents to:
1. Test all user flows (auth, browse, play, playlists, admin)
2. Test dark/light mode consistency
3. Test responsive behavior (mobile, tablet, desktop)
4. Perform accessibility audit
5. Run build verification (npm run build, typecheck, lint)
6. Fix any issues found

Verify all success criteria are met.
```

---

## Monitoring Progress

After each phase, check:

```bash
# Build status
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Dev server
npm run dev
```

---

## Rollback Plan

If issues arise:

```bash
# Stash current changes
git stash

# Return to main
git checkout master

# Or reset to specific commit
git reset --hard <commit-hash>
```

---

## Expected Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1 | 2-3 hours | 2-3 hours |
| Phase 2 | 4-6 hours | 6-9 hours |
| Phase 3 | 3-4 hours | 9-13 hours |
| Phase 4 | 6-8 hours | 15-21 hours |
| Phase 5 | 4-5 hours | 19-26 hours |
| Phase 6 | 3-4 hours | 22-30 hours |
| Phase 7 | 5-6 hours | 27-36 hours |
| Phase 8 | 6-8 hours | 33-44 hours |
| Phase 9 | 4-6 hours | 37-50 hours |

**Total: 37-50 hours (1-2 weeks for one developer)**

With multi-agent parallelization of Phases 4-5 and 6-7, actual time may be 30-40 hours.

---

## Success Indicators

✅ After Phase 1:
- npm run dev starts without errors
- New CSS variables in index.css
- Simplified theme.ts file

✅ After Phase 2:
- All buttons render with shadcn styling
- Cards display correctly
- Toast notifications work

✅ After Phase 3:
- Header renders with new components
- Sidebar navigation works
- Theme picker toggles light/dark

✅ After Phase 4:
- All forms validate correctly
- Error messages display
- Submissions work

✅ After Phase 5:
- Tables render with sorting
- Pagination works
- Row actions function

✅ After Phase 6:
- All dialogs open/close properly
- Forms in dialogs submit

✅ After Phase 7:
- Search and filters work
- Game cards render beautifully
- Card size toggle functions

✅ After Phase 8:
- All views render without errors
- No import errors
- Clean codebase

✅ After Phase 9:
- All tests pass
- Build succeeds
- No console errors
- Responsive on all devices

---

## Post-Migration

After successful completion:

1. **Merge to main**:
   ```bash
   git checkout master
   git merge shadcn-migration
   git push
   ```

2. **Tag release**:
   ```bash
   git tag -a v2.0.0-shadcn -m "Migrated to shadcn/ui"
   git push --tags
   ```

3. **Update documentation**:
   - Update CLAUDE.md with new component library info
   - Create migration notes for users
   - Document any breaking changes

4. **Monitor**:
   - Check bundle size changes
   - Monitor performance metrics
   - Collect user feedback

---

## Support

For issues during migration:
- Reference: `SHADCN_MIGRATION_PROMPT.md` for detailed instructions
- Reference: `CLAUDE.md` for project structure
- Check shadcn/ui docs: https://ui.shadcn.com

---

**Ready to begin? Copy the execution command above and paste it to Claude Code!**
