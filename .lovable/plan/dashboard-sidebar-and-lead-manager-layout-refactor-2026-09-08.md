# Dashboard sidebar and lead manager layout refactor

## Goal
Replace the dashboard’s duplicated horizontal navigation with one responsive left sidebar, promote the existing CRM views into a top-level Pipeline section for selling roles/admins, and restyle the lead views as dense operational tables without changing data, routes, auth, mutations, or dashboard prop contracts.

## Implementation

### 1. Consolidate the dashboard shell
- Make `UnifiedDashboard` own the complete dashboard shell so there is only one navigation region and one 52px header.
- Remove the redundant outer dashboard sidebar/header from `DashboardPage`; keep its authentication, profile loading, navigation, and the `UnifiedDashboard userProfile={userProfile}` contract unchanged.
- Keep the existing `Tabs` value state (`activeTab` / `setActiveTab`) and every existing `TabsContent` dashboard mount.
- Preserve every role dashboard invocation exactly as:
  `DashboardComponent userProfile={userProfile} isCommissionSeller={isCommissionSeller}`.
- Render every valid entry in `finalRoles` rather than slicing to five.

### 2. Add the responsive sidebar presentation
- Add a focused dashboard navigation component using the existing `Sheet` and tooltip primitives rather than changing the shared sidebar primitive’s global breakpoint.
- Desktop (`lg+`): persistent 240px fixed-height column with independent scrolling; collapsed state is a 56px icon rail.
- Mobile/tablet (`<lg`): render only a Sheet drawer, opened from the 52px header; selecting an item closes it.
- Persist desktop collapse state in `localStorage`; expose icon tooltips while collapsed.
- Structure the navigation as Workspace, Pipeline (eligible roles/admin only), and Account, followed by a separated bottom-pinned Sign Out action.
- Apply the specified 34px nav rows, 16px/1.5-stroke icons, opacity hierarchy, 2px inset active rail, hover/focus states, and color-only 150ms transitions. No filled active pills and no `transition-all`.

### 3. Promote the CRM views safely
- Use a small pipeline workspace wrapper that owns the existing `useCRM()` and `useSellerCRM()` hook results once and passes those existing return objects to the existing CRM views exactly as they are mounted on the current CRM page.
- Mount:
  - Overview: `CRMOverview crmData={crmData} sellerCRM={sellerCRM}`
  - Leads: `CRMLeadsView` with its existing optional props
  - Opportunities: `CRMOpportunitiesView crmData={crmData}`
  - Accounts: `CRMAccountsView crmData={crmData}`
  - Activity: `CRMActivityView crmData={crmData}`
  - Buy Leads: `BuyLeadsTab` with the same seller ID, credit balance, refresh callback, buy-credit navigation, category, and commission props it currently receives inside the lead manager
- Keep the older `CRMDashboard` unchanged: it is a separate leads/follow-ups/invoices workspace and does not mount the six named views. The named views are currently coordinated by `CRM.tsx`, so the new wrapper will follow that established composition rather than forcing state through the unrelated `CRMDashboard`.
- Show Pipeline only for `seller`, `robot_seller`, `spare_parts_seller`, `service_provider`, `logistics_provider`, `finance_provider`, or the unchanged admin-email check.

### 4. Restyle the existing lead views only
- Convert list presentations in Leads, Opportunities, Accounts, Activity, and Buy Leads from cards/Kanban to dense tables while retaining their current controls, callbacks, dialogs, filters, and detail-opening behavior.
- Use 44px rows, 13px text, sticky headers, subtle horizontal separators, no vertical rules, tabular/right-aligned numeric columns, left-aligned text, and a 3% foreground hover surface.
- Replace per-row filled status badges with a 6px semantic status dot plus plain text.
- Preserve keyboard activation and add/retain visible focus rings for interactive rows and controls.
- Replace content spinners in touched list views with skeleton rows matching the table columns.
- Give each touched list an explanatory one-line empty state and its existing primary action where one already exists. Where the current view has no valid action callback, keep the explanatory empty state without inventing a non-functional action.
- Leave all hooks, fetches, filters, mutations, dialogs, and business rules untouched.

### 5. Header and visual system
- Keep the existing avatar dropdown and every menu item/callback exactly intact, but remove the duplicated company name from the header.
- Add the appropriate mobile drawer or desktop collapse control and a 13px active-section breadcrumb.
- Constrain content to 1400px with 24px spacing and use existing background/card/sidebar tokens to distinguish regions.
- Apply the requested type scale, two font weights, 4px spacing rhythm, subtle semantic borders, 6/8/12 radii, Lucide icon sizing/strokes, dark-mode surface elevation, reduced-motion handling, and maximum 200ms drawer/micro-interaction timing across edited UI.

## Files expected to change
- `src/pages/DashboardPage.tsx`
- `src/components/UnifiedDashboard.tsx`
- New focused dashboard sidebar/pipeline wrapper components under `src/components/dashboard/`
- Presentation markup/classes only in the named CRM view files and `FullScreenLeadManager` / `BuyLeadsTab` where their lists are rendered

## Verification
- Run the project test/build command provided by the repository harness.
- Use the live preview at desktop and mobile/tablet widths to verify all role entries, Pipeline eligibility, header/dropdown, drawer open/close, and no simultaneous desktop/mobile sidebar.
- Toggle collapse, reload, and confirm persistence.
- Inspect the rendered dashboard to confirm each existing role component still receives only `userProfile` and `isCommissionSeller`.
- Search edited files for `slice(0, 5)`, `transition-all`, durations above 400ms, and removed filled active-tab classes.
- Verify active, hover, and keyboard focus states on navigation and interactive table rows.

## Explicitly out of scope
- No database, Supabase, RLS, Edge Function, route, authentication, admin-check, query, mutation, or business-rule changes.
- No prop renames/additions/removals on existing role dashboard components.
- No internal CRM data-flow changes. If an empty-state action cannot be connected through an existing callback, it will not be fabricated.
