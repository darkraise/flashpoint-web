# Comprehensive Prompt: Flashpoint Web UI/UX Revamp with shadcn/ui

## Executive Summary

This document provides comprehensive instructions for migrating the Flashpoint Web frontend to shadcn/ui using multi-agent coordination. The migration involves replacing 40+ custom components with shadcn/ui components, simplifying the theme system from 30+ color palettes to shadcn/ui's default themes, and adopting modern form and table libraries.

---

## Project Context

### Current State
- **Component Library**: 40+ custom-built components across 13 domains
- **Theme System**: Custom CSS variable system with 30+ color palettes (blue, purple, pink, orange, green, teal, etc.)
- **Styling**: Tailwind CSS 3.4.1 + custom design tokens (464 lines)
- **Forms**: Custom form components without validation library
- **Tables**: Custom table implementations (UserTable, RoleTable, ActivityTable)
- **State Management**: Zustand (theme, auth, UI) + React Query (server state)
- **Icons**: Lucide React 0.358.0 (already compatible)
- **Charts**: Recharts 3.6.0 (compatible, minimal changes needed)

### Target State
- **Component Library**: shadcn/ui (Radix UI primitives + Tailwind)
- **Theme System**: shadcn/ui default themes (light/dark mode only, no custom palettes)
- **Forms**: react-hook-form + zod validation
- **Tables**: TanStack Table v8 with shadcn/ui DataTable
- **Styling**: shadcn/ui's HSL-based CSS variable system
- **All other tech**: Maintain existing (React 18.3.1, React Router, Zustand, React Query)

### Migration Approach
- **Complete rewrite** (not incremental)
- **Remove** custom 30+ color palette system
- **Adopt** shadcn/ui default themes exclusively
- **Implement** type-safe forms with validation
- **Migrate** all tables to TanStack Table

---

## Architecture Overview

### Component Categories (40+ components)

**Foundation Components** (10 files)
- `components/common/Button.tsx` → shadcn `Button`
- `components/common/IconButton.tsx` → shadcn `Button` with `size="icon"`
- `components/common/Card.tsx` → shadcn `Card`
- `components/common/Badge.tsx` → shadcn `Badge`
- `components/common/Toast.tsx` → shadcn `Toast` or `Sonner`
- `components/common/ToastContainer.tsx` → Delete
- `components/common/ConfirmDialog.tsx` → shadcn `AlertDialog`
- `components/common/NetworkStatusIndicator.tsx` → Update to use shadcn components
- `components/common/CardSizeControl.tsx` → shadcn `ToggleGroup`
- `components/common/ErrorBoundary.tsx` → Keep (no UI changes)

**Layout Components** (3 files)
- `components/layout/AppShell.tsx` → Update to use new Header/Sidebar
- `components/layout/Header.tsx` → Rebuild with shadcn `Button`, `DropdownMenu`, `Avatar`
- `components/layout/Sidebar.tsx` → Rebuild with shadcn `ScrollArea`, `Button`

**Library/Game Components** (8 files)
- `components/library/GameCard.tsx` → Rebuild with shadcn `Card`, `Badge`
- `components/library/GameGrid.tsx` → Update to use new GameCard
- `components/library/GameList.tsx` → Update to use new GameListItem
- `components/library/GameListItem.tsx` → Rebuild with shadcn components
- `components/library/GameCardSkeleton.tsx` → shadcn `Skeleton`
- `components/library/GameGridSkeleton.tsx` → shadcn `Skeleton`
- `components/library/GameListSkeleton.tsx` → shadcn `Skeleton`
- `components/library/GameListItemSkeleton.tsx` → shadcn `Skeleton`

**Auth Components** (3 files)
- `components/auth/LoginForm.tsx` → Rebuild with `Form` + `react-hook-form` + `zod`
- `components/auth/RegisterForm.tsx` → Rebuild with `Form` + `react-hook-form` + `zod`
- `components/auth/ProtectedRoute.tsx` → Keep (logic only, no UI)
- `components/auth/RoleGuard.tsx` → Keep (logic only, no UI)

**Playlist Components** (4 files)
- `components/playlist/CreatePlaylistModal.tsx` → shadcn `Dialog` + `Form`
- `components/playlist/AddToPlaylistModal.tsx` → shadcn `Dialog` + `Checkbox`
- `components/playlist/BrowseCommunityPlaylistsModal.tsx` → shadcn `Dialog`
- `components/playlist/PlaylistCard.tsx` → Rebuild with shadcn `Card`

**User Management Components** (3 files)
- `components/users/UserTable.tsx` → TanStack Table `DataTable`
- `components/users/UserForm.tsx` → `Form` + `react-hook-form` + `zod`
- `components/users/ChangePasswordDialog.tsx` → shadcn `Dialog` + `Form`

**Role Management Components** (3 files)
- `components/roles/RoleTable.tsx` → TanStack Table `DataTable`
- `components/roles/RoleForm.tsx` → `Form` + `react-hook-form` + `zod`
- `components/roles/PermissionSelector.tsx` → `Checkbox` group

**Stats/Dashboard Components** (4 files)
- `components/stats/PlaytimeChart.tsx` → Keep Recharts, update colors
- `components/stats/TopGamesChart.tsx` → Keep Recharts, update colors
- `components/stats/GamesDistributionChart.tsx` → Keep Recharts, update colors
- `components/stats/UserStatsPanel.tsx` → Update wrapper with shadcn `Card`

**Search/Filter Components** (2 files)
- `components/search/SearchBar.tsx` → shadcn `Input` with icon
- `components/search/FilterPanel.tsx` → shadcn `Popover`, `Checkbox`, `Toggle`

**Activity Components** (1 file)
- `components/activities/ActivityTable.tsx` → TanStack Table `DataTable`

**Dialog Components** (1 file)
- `components/dialogs/GamePlayerDialog.tsx` → shadcn `Dialog`

**Player Components** (2 files)
- `components/player/GamePlayer.tsx` → Keep (domain-specific, minimal UI)
- `components/player/RufflePlayer.tsx` → Keep (Flash emulator, no changes)

**Theme Components** (1 file)
- `components/theme/ThemePicker.tsx` → Simplify to light/dark toggle (remove palette grid)

### Views to Update (15 files)
- `views/BrowseView.tsx`
- `views/GameDetailView.tsx`
- `views/AnimationsView.tsx`
- `views/FavoritesView.tsx`
- `views/PlaylistsView.tsx`
- `views/PlaylistDetailView.tsx`
- `views/LoginView.tsx`
- `views/RegisterView.tsx`
- `views/UnauthorizedView.tsx`
- `views/UsersView.tsx`
- `views/RolesView.tsx`
- `views/ActivitiesView.tsx`
- `views/GamePlayerView.tsx`
- `views/DashboardView.tsx`
- `views/SettingsView.tsx`

### Theme System Files

**To DELETE**:
- `src/lib/theme.ts` (425 lines - entire custom palette system)
- `src/styles/design-tokens.ts` (464 lines - replaced by shadcn utilities)

**To MODIFY**:
- `src/store/theme.ts` (simplify from palette management to light/dark toggle)
- `src/index.css` (replace ~200 lines of CSS variables with shadcn HSL system)
- `tailwind.config.js` (complete rewrite for shadcn/ui)

---

## Multi-Agent Execution Plan

### Phase 1: Setup & Configuration

**Primary Agent**: `typescript-pro` or `tooling-engineer`

**Objectives**:
1. Install shadcn/ui and all required dependencies
2. Configure Tailwind for shadcn/ui
3. Set up HSL-based CSS variable system
4. Simplify theme store

**Tasks**:

```bash
# Task 1.1: Install dependencies
npm install @hookform/resolvers zod react-hook-form
npm install @tanstack/react-table
npm install class-variance-authority tailwind-merge tailwindcss-animate

# Task 1.2: Initialize shadcn/ui
npx shadcn-ui@latest init
# Select: Default style, Slate base color, CSS variables: Yes, TypeScript: Yes, RSC: No

# Task 1.3: Install shadcn/ui utility
npm install -D tailwindcss-animate
```

**File Modifications**:

1. **tailwind.config.js** - Complete rewrite
   - Remove custom color system (primary-50 through primary-900)
   - Remove surface, background, border, text custom colors
   - Add shadcn/ui configuration
   - Set `darkMode: ["class"]`

2. **src/index.css** - Replace CSS variables
   - Remove lines 5-205 (all custom color CSS variables)
   - Replace with shadcn/ui HSL-based variables for `:root` and `.dark`
   - Keep scrollbar utilities

3. **src/store/theme.ts** - Simplify
   - Remove `primaryColor` state
   - Remove dependency on `lib/theme.ts`
   - Keep only `mode: 'light' | 'dark' | 'system'`
   - Use class-based dark mode (`document.documentElement.classList.add('dark')`)

4. **DELETE**:
   - `src/lib/theme.ts` (entire file, 425 lines)
   - `src/styles/design-tokens.ts` (entire file, 464 lines)

**Agent Coordination**:
- Single agent executes sequentially
- Verify `npm run dev` starts successfully after Phase 1
- No build errors expected

---

### Phase 2: Foundation Components

**Primary Agent**: `frontend-developer` or `react-specialist`

**Objectives**:
Install and integrate core shadcn/ui components that replace basic custom components.

**Tasks**:

```bash
# Install foundation components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add sonner
```

**Component Migrations**:

1. **Button.tsx** → Delete, use shadcn `Button`
   - Variant mapping: `primary` → `default`, `secondary` → `secondary`, `ghost` → `ghost`, `danger` → `destructive`

2. **IconButton.tsx** → Delete, use `<Button size="icon">`

3. **Card.tsx** → Delete, use shadcn `Card` with `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`

4. **Badge.tsx** → Delete, use shadcn `Badge`

5. **Toast + ToastContainer** → Delete, use Sonner
   - Add `<Toaster />` to `App.tsx` root
   - Update toast calls: `useDialog().showToast()` → `toast.success()`

6. **Skeleton components** → Rebuild all 4 skeleton components using shadcn `Skeleton`

**Agent Coordination**:
- Single frontend agent executes all migrations
- Test rendering after each component migration
- Verify no import errors

**Verification**:
- All buttons render with shadcn styling
- Cards display correctly
- Toast notifications work
- Skeleton animations show

---

### Phase 3: Layout Components

**Primary Agent**: `ui-designer` or `frontend-developer`

**Objectives**:
Rebuild application layout (AppShell, Header, Sidebar) using shadcn/ui.

**Tasks**:

```bash
# Install layout components
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add scroll-area
```

**Component Migrations**:

1. **Header.tsx** - Rebuild
   - Use `Button` for actions
   - Use `DropdownMenu` for user menu
   - Use `Avatar` for user icon
   - Integrate simplified ThemePicker

2. **Sidebar.tsx** - Rebuild
   - Use `ScrollArea` for navigation
   - Use `Button variant="ghost"` for nav items
   - Use `Separator` between sections
   - Maintain responsive behavior

3. **ThemePicker.tsx** - Simplify drastically (158 lines → ~40 lines)
   - Remove 30+ color palette grid
   - Remove primary color selection
   - Keep only Light/Dark/System toggle using `DropdownMenu`
   - Use Sun/Moon icons with animated transition

4. **AppShell.tsx** - Update
   - Integrate new Header and Sidebar
   - Use standard Tailwind layout utilities
   - Maintain sidebar state from `useUIStore`

**Agent Coordination**:
- UI designer agent focuses on visual consistency
- Frontend developer agent handles integration
- Test navigation flows after completion

**Verification**:
- Header renders correctly
- User dropdown works
- Theme picker toggles light/dark
- Sidebar navigation functions
- Mobile responsiveness maintained

---

### Phase 4: Form Components

**Primary Agents**: `typescript-pro` + `frontend-developer`

**Objectives**:
Migrate all forms to react-hook-form + zod validation with shadcn/ui form components.

**Tasks**:

```bash
# Install form components
npx shadcn-ui@latest add form
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add switch
```

**Component Migrations**:

1. **LoginForm.tsx** - Complete rebuild
   - Create zod schema: `username` (min 1), `password` (min 1)
   - Use `useForm` with `zodResolver`
   - Use `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
   - Replace custom inputs with shadcn `Input`
   - Handle loading state on submit button

2. **RegisterForm.tsx** - Complete rebuild
   - Create zod schema with password confirmation validation
   - Use `.refine()` for password match check
   - Follow same Form pattern as LoginForm

3. **UserForm.tsx** - Complete rebuild
   - Use `Select` for role selection
   - Use `Switch` for isActive toggle
   - Integrate with user creation/update mutations

4. **RoleForm.tsx** - Complete rebuild
   - Use `Checkbox` group for permissions
   - Handle multi-select permission state

5. **CreatePlaylistModal.tsx** - Migrate form portion
   - Use `Dialog` wrapper (see Phase 6)
   - Use `Form` for playlist name/description

6. **ChangePasswordDialog.tsx** - Migrate form portion
   - Use `Dialog` wrapper
   - Use `Form` with password validation

**Agent Coordination**:
- TypeScript pro creates zod schemas
- Frontend developer implements form UI
- Test validation on all forms

**Verification**:
- All forms validate correctly
- Error messages display
- Submission works
- Required fields enforced

---

### Phase 5: Table Components

**Primary Agents**: `typescript-pro` + `frontend-developer`

**Objectives**:
Migrate all data tables to TanStack Table with shadcn/ui DataTable.

**Tasks**:

```bash
# Install table component
npx shadcn-ui@latest add table
```

**Component Creation**:

1. **Create `components/ui/data-table.tsx`** (base DataTable component)
   - Implement with TanStack Table v8
   - Include sorting state
   - Include pagination controls
   - Generic type support: `<TData, TValue>`

**Component Migrations**:

2. **UserTable.tsx** - Migrate to DataTable
   - Define columns with `ColumnDef<UserDetails>[]`
   - Use `Badge` for role and status
   - Use `DropdownMenu` for row actions (Edit, Change Password, Delete)
   - Reduce from ~265 lines to ~80 lines

3. **RoleTable.tsx** - Migrate to DataTable
   - Define columns with `ColumnDef<Role>[]`
   - Include actions column

4. **ActivityTable.tsx** - Migrate to DataTable
   - Define columns with sortable timestamps
   - Format dates with date-fns

**Agent Coordination**:
- TypeScript pro defines column types
- Frontend developer implements DataTable UI
- Test sorting and pagination

**Verification**:
- Tables render correctly
- Sorting works
- Pagination functions
- Row actions work
- Loading states display

---

### Phase 6: Dialog & Modal Components

**Primary Agent**: `frontend-developer`

**Objectives**:
Migrate all modals and dialogs to shadcn/ui Dialog and AlertDialog.

**Tasks**:

```bash
# Install dialog components
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add alert-dialog
```

**Component Migrations**:

1. **ConfirmDialog.tsx** → Use `AlertDialog`
   - Replace with `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`
   - Use `AlertDialogAction` and `AlertDialogCancel`

2. **CreatePlaylistModal.tsx** → Use `Dialog`
   - Wrap form (from Phase 4) in `DialogContent`
   - Use `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`

3. **AddToPlaylistModal.tsx** → Use `Dialog`
   - Show playlist list with `Checkbox` items
   - Handle multi-select state

4. **GamePlayerDialog.tsx** → Use `Dialog`
   - Wrap player component in `DialogContent`
   - Set appropriate size for game player

5. **BrowseCommunityPlaylistsModal.tsx** → Use `Dialog`
   - Display community playlists in `DialogContent`

6. **ChangePasswordDialog.tsx** → Use `Dialog`
   - Wrap form (from Phase 4) in `DialogContent`

**Agent Coordination**:
- Single frontend agent migrates all dialogs
- Test open/close behavior
- Verify focus trap and keyboard navigation

**Verification**:
- All dialogs open/close properly
- Escape key closes dialogs
- Click outside closes dialogs
- Forms inside dialogs submit correctly

---

### Phase 7: Complex Components

**Primary Agents**: `frontend-developer` + `ui-designer`

**Objectives**:
Rebuild complex domain-specific components using shadcn/ui primitives.

**Tasks**:

```bash
# Install additional components
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add command
npx shadcn-ui@latest add toggle
npx shadcn-ui@latest add toggle-group
```

**Component Migrations**:

1. **SearchBar.tsx** - Simplify
   - Use shadcn `Input` with `Search` icon
   - Position icon with absolute positioning

2. **FilterPanel.tsx** - Rebuild
   - Use `Toggle` for web-playable filter
   - Use `Popover` for tag selection dropdown
   - Use `Checkbox` list inside popover
   - Use `Input` for year range

3. **GameCard.tsx** - Rebuild
   - Use shadcn `Card`, `CardHeader`, `CardContent`, `CardFooter`
   - Use `Badge` for platform
   - Use `Button size="sm"` for play button
   - Add hover effects with Tailwind

4. **GameGrid.tsx** - Update
   - Use new GameCard
   - Maintain responsive grid layout

5. **GameList.tsx** + **GameListItem.tsx** - Rebuild
   - Use shadcn components for list items
   - Maintain performance with proper keys

6. **CardSizeControl.tsx** - Rebuild
   - Use `ToggleGroup` with `ToggleGroupItem`
   - Options: Small, Medium, Large

7. **NetworkStatusIndicator.tsx** - Update
   - Use shadcn `Badge` for offline indicator

**Agent Coordination**:
- UI designer ensures visual consistency
- Frontend developer implements functionality
- Test all interaction patterns

**Verification**:
- Search bar functions
- Filter panel opens/closes
- Tag selection works
- Game cards render beautifully
- Card size toggle works

---

### Phase 8: Views & Cleanup

**Primary Agents**: `frontend-developer` + `refactoring-specialist`

**Objectives**:
Update all 15 views to use migrated components and perform comprehensive cleanup.

**View Migrations**:

Update imports and component usage in:
1. `BrowseView.tsx`
2. `GameDetailView.tsx`
3. `AnimationsView.tsx`
4. `FavoritesView.tsx`
5. `PlaylistsView.tsx`
6. `PlaylistDetailView.tsx`
7. `LoginView.tsx`
8. `RegisterView.tsx`
9. `UnauthorizedView.tsx`
10. `UsersView.tsx`
11. `RolesView.tsx`
12. `ActivitiesView.tsx`
13. `GamePlayerView.tsx`
14. `DashboardView.tsx`
15. `SettingsView.tsx`

**Import Pattern Changes**:
```typescript
// OLD:
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

// NEW:
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
```

**Stats/Chart Updates**:
- `PlaytimeChart.tsx`, `TopGamesChart.tsx`, `GamesDistributionChart.tsx`, `UserStatsPanel.tsx`
- Keep Recharts as-is (compatible)
- Update wrapper Cards to use shadcn `Card`
- Update colors: `rgb(var(--color-primary-500))` → `hsl(var(--primary))`

**App.tsx Root Update**:
```typescript
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <>
      <ErrorBoundary>
        <NetworkStatusIndicator />
        <Routes>...</Routes>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}
```

**Cleanup Tasks**:

Delete ALL old custom component files:
- `src/components/common/Button.tsx`
- `src/components/common/IconButton.tsx`
- `src/components/common/Card.tsx`
- `src/components/common/Badge.tsx`
- `src/components/common/Toast.tsx`
- `src/components/common/ToastContainer.tsx`
- `src/components/common/ConfirmDialog.tsx`
- Any other fully replaced components

**Global Search & Replace**:
```bash
# Find all old imports (use grep or IDE search)
grep -r "from '@/components/common/Button'" src/
grep -r "from '@/components/common/Card'" src/
grep -r "from '@/components/common/Badge'" src/
grep -r "from '@/components/common/Toast'" src/

# Replace with new imports (manual or script)
```

**Agent Coordination**:
- Frontend developer updates all views
- Refactoring specialist handles cleanup and import updates
- Code reviewer verifies no broken imports

**Verification**:
- All views render without errors
- No import errors in console
- All user flows work end-to-end
- Responsive behavior intact

---

### Phase 9: Testing & Polish

**Primary Agents**: `code-reviewer` + `frontend-developer`

**Objectives**:
Comprehensive testing, accessibility audit, and final polish.

**Testing Tasks**:

1. **Functional Testing**:
   - User authentication (login, logout, register)
   - Game browsing and filtering
   - Game playback
   - Playlist creation and management
   - User management (admin)
   - Role management (admin)
   - Activity tracking display
   - Statistics charts

2. **Visual Testing**:
   - Dark mode consistency
   - Light mode consistency
   - No style conflicts
   - Consistent spacing and typography
   - Loading states
   - Error states
   - Empty states

3. **Responsive Testing**:
   - Mobile (< 640px)
   - Tablet (640px - 1024px)
   - Desktop (> 1024px)
   - Sidebar collapse behavior
   - Filter panel mobile layout
   - Game grid columns
   - Table responsiveness

4. **Accessibility Audit**:
   - Keyboard navigation works
   - Focus indicators visible
   - ARIA labels present
   - Screen reader compatibility
   - Color contrast meets WCAG AA

5. **Performance Audit**:
   - Bundle size comparison
   - Initial load time
   - Component render performance

6. **Build Verification**:
   ```bash
   npm run build
   npm run typecheck
   npm run lint
   ```

**Agent Coordination**:
- Code reviewer performs audits
- Frontend developer fixes issues
- Multiple test passes until all checks pass

**Final Checklist**:
- [ ] All user flows functional
- [ ] Dark/light mode consistent
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Responsive on all breakpoints
- [ ] Accessibility compliant

---

## Multi-Agent Coordination Strategy

### Agent Assignment Matrix

| Phase | Primary Agent | Supporting Agents | Estimated Time |
|-------|---------------|-------------------|----------------|
| Phase 1: Setup | `tooling-engineer` or `typescript-pro` | None | 2-3 hours |
| Phase 2: Foundation | `frontend-developer` or `react-specialist` | None | 4-6 hours |
| Phase 3: Layout | `ui-designer` | `frontend-developer` | 3-4 hours |
| Phase 4: Forms | `typescript-pro` | `frontend-developer` | 6-8 hours |
| Phase 5: Tables | `typescript-pro` | `frontend-developer` | 4-5 hours |
| Phase 6: Dialogs | `frontend-developer` | None | 3-4 hours |
| Phase 7: Complex | `frontend-developer` | `ui-designer` | 5-6 hours |
| Phase 8: Views/Cleanup | `frontend-developer` | `refactoring-specialist` | 6-8 hours |
| Phase 9: Testing | `code-reviewer` | `frontend-developer` | 4-6 hours |

**Total Estimated Time**: 37-50 hours (1-2 weeks)

### Coordination Patterns

**Sequential Execution**:
- Phases 1-3 must be sequential (setup → foundation → layout)
- Phase 4-7 can be partially parallelized but have dependencies

**Parallel Execution Opportunities**:
- Phase 4 (Forms) + Phase 5 (Tables) - can run in parallel (different agent types)
- Phase 6 (Dialogs) + Phase 7 (Complex) - can run in parallel (different components)

**Agent Handoff Points**:
- After Phase 1: Verify build works before proceeding
- After Phase 3: Verify layout renders before component migration
- After Phase 7: Verify all components work before view updates
- After Phase 8: Final testing phase begins

---

## Critical Success Factors

### 1. Theme System Simplification
- **Action**: Remove all 30+ color palette options
- **Impact**: Users lose color customization but gain consistency
- **Mitigation**: Document change in release notes, offer single accent color option if needed

### 2. Import Path Updates
- **Action**: Update ~100+ import statements across codebase
- **Impact**: High risk of broken imports if not thorough
- **Mitigation**: Use global search/replace, verify with TypeScript compiler

### 3. Form Validation Migration
- **Action**: Replace custom validation with zod schemas
- **Impact**: All forms need new validation logic
- **Mitigation**: Test each form individually, ensure error messages clear

### 4. Table Functionality
- **Action**: Migrate to TanStack Table
- **Impact**: Sorting, filtering, pagination must work correctly
- **Mitigation**: Test with real data, verify performance

### 5. Backward Compatibility
- **Action**: Breaking change to theme system
- **Impact**: User settings may need reset
- **Mitigation**: Clear migration notes, reset localStorage theme settings

---

## Files to DELETE

Complete list of files to remove after migration:

```
frontend/src/lib/theme.ts                           (425 lines)
frontend/src/styles/design-tokens.ts                (464 lines)
frontend/src/components/common/Button.tsx           (~125 lines)
frontend/src/components/common/IconButton.tsx       (~50 lines)
frontend/src/components/common/Card.tsx             (~152 lines)
frontend/src/components/common/Badge.tsx            (~75 lines)
frontend/src/components/common/Toast.tsx            (~100 lines)
frontend/src/components/common/ToastContainer.tsx   (~80 lines)
frontend/src/components/common/ConfirmDialog.tsx    (~90 lines)
```

**Total removed: ~1,561+ lines of custom code**

---

## Expected Outcomes

### Lines of Code Impact
- **Removed**: ~1,800+ lines (custom theme system, components)
- **Added**: ~2,000 lines (shadcn components, maintained by shadcn)
- **Net Application Code**: -1,300 lines (simplification)

### Maintenance Benefits
1. No custom theme system to maintain (30+ palettes removed)
2. Standardized component patterns (shadcn/ui)
3. Type-safe forms (zod validation)
4. Better accessibility (Radix UI primitives)
5. Improved consistency (single design system)

### User Experience
- **Improved**: Consistent design language
- **Improved**: Better accessibility
- **Improved**: Smoother animations and transitions
- **Changed**: Only light/dark themes (no custom colors)
- **Maintained**: All functionality preserved

---

## Risk Mitigation

1. **Git Strategy**:
   - Create `shadcn-migration` branch
   - Commit after each phase
   - Keep main branch stable

2. **Testing Strategy**:
   - Test after each phase
   - Maintain functional app throughout
   - Rollback capability at each phase

3. **Communication**:
   - Document theme system changes
   - Announce breaking changes in advance
   - Provide feedback channel

4. **Fallback Plan**:
   - Keep old components until full migration tested
   - Branch protection on main
   - Staged rollout if possible

---

## Execution Command

To execute this migration with multi-agent coordination:

```
Claude Code, please execute the Flashpoint Web UI/UX revamp to shadcn/ui as outlined in this document.

Use multi-agent coordination with the agent-organizer to orchestrate the 9 phases. Assign appropriate specialized agents (typescript-pro, frontend-developer, ui-designer, react-specialist, tooling-engineer, refactoring-specialist, code-reviewer) to each phase as specified in the Agent Assignment Matrix.

Execute phases sequentially with verification checkpoints. Phases 4-5 and 6-7 can be parallelized where noted. Ensure all agents communicate through the agent-organizer to maintain consistency.

Begin with Phase 1: Setup & Configuration.
```

---

## Post-Migration Tasks

### Documentation Updates
- Update `CLAUDE.md` with new component library information
- Document theme system changes
- Update developer onboarding docs

### User Communication
- Release notes explaining theme changes
- Migration guide for any breaking changes
- Feedback collection mechanism

### Monitoring
- Track bundle size changes
- Monitor performance metrics
- Collect user feedback on new UI

---

## Appendix: Key File Paths

### Configuration Files
- `frontend/package.json` - Dependencies
- `frontend/tailwind.config.js` - Tailwind configuration
- `frontend/components.json` - shadcn/ui configuration
- `frontend/src/index.css` - Global styles and CSS variables

### Theme System
- `frontend/src/store/theme.ts` - Theme state management
- `frontend/src/components/theme/ThemePicker.tsx` - Theme picker component

### Component Directories
- `frontend/src/components/ui/` - shadcn/ui components (new)
- `frontend/src/components/common/` - Custom common components
- `frontend/src/components/layout/` - Layout components
- `frontend/src/components/library/` - Game library components
- `frontend/src/components/auth/` - Authentication components
- `frontend/src/components/playlist/` - Playlist components
- `frontend/src/components/users/` - User management components
- `frontend/src/components/roles/` - Role management components
- `frontend/src/components/stats/` - Statistics components
- `frontend/src/components/search/` - Search and filter components
- `frontend/src/components/activities/` - Activity tracking components
- `frontend/src/components/dialogs/` - Dialog components
- `frontend/src/components/player/` - Game player components

### Views
- `frontend/src/views/` - All 15 view components

### Application Root
- `frontend/src/App.tsx` - Application root component
- `frontend/src/main.tsx` - Application entry point

---

## Success Criteria

The migration is considered successful when:

1. ✅ All 40+ components migrated to shadcn/ui
2. ✅ Custom theme system (30+ palettes) removed
3. ✅ All forms use react-hook-form + zod
4. ✅ All tables use TanStack Table
5. ✅ All views render without errors
6. ✅ Dark/light mode works consistently
7. ✅ Build completes without errors
8. ✅ Type checking passes
9. ✅ Linting passes
10. ✅ All user flows functional
11. ✅ Responsive on all breakpoints
12. ✅ Accessibility standards met
13. ✅ Performance maintained or improved
14. ✅ No console errors
15. ✅ Documentation updated

---

## Contact & Support

For questions or issues during migration:
- Reference: `CLAUDE.md` for project structure
- Flashpoint Launcher source: `D:\Repositories\Community\launcher`
- Flashpoint Game Server: `D:\Repositories\Community\FlashpointGameServer`
- Flashpoint App: `D:\FP_Data\Flashpoint`

---

**END OF COMPREHENSIVE MIGRATION PROMPT**
