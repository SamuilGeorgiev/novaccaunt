# FinBG Solo — Rebuild Plan

Date: 2025-08-12
Owner: You (step-by-step learning build)

## Objectives
- Build a clean, minimal SPA for BG accounting features.
- Learn the development flow by delivering in tiny, verifiable steps.
- Keep UI in Bulgarian; code and comments in English.

## Guiding Principles
- Small increments, visible progress.
- Consistent IDs, no inline JS except where explicitly planned.
- Centralized SPA routing and module initialization.
- Supabase integration abstracted behind `js/supabase.js`.

## Milestones
1) Project skeleton (files, folders)
2) Basic SPA shell (nav + routed content)
3) Utilities & styles (Tailwind CDN, icons)
4) Module scaffolds (Sales, Invoices, Reports)
5) Supabase integration (auth + tables, minimal)
6) Sales feature (create modal, table, filters)
7) Invoices feature (list, view, create)
8) Reports feature (cards + charts)
9) Polish (loading states, validation, UX)

## Detailed Task List (Checklist)
- [ ] 0. Init repository structure
  - [ ] Create `index.html`, `js/`, `css/` folders
  - [ ] Add `js/app.js`, `js/utils.js`, `js/supabase.js`, `css/styles.css`
- [ ] 1. Basic SPA shell
  - [ ] Header + sidebar/top-nav
  - [ ] `#app` main container
  - [ ] Simple router (hash-based)
  - [ ] Default route renders "Табло"
- [ ] 2. Utilities & styles
  - [ ] Tailwind via CDN (dev)
  - [ ] Lucide icons via CDN
  - [ ] `utils.js` with `formatCurrency`, `formatDate`, `formatPercentage`
- [ ] 3. Module scaffolds
  - [ ] `SalesManager` (empty methods)
  - [ ] `InvoicesManager` (empty methods)
  - [ ] `ReportsManager` (empty methods)
- [ ] 4. Supabase integration (stub first)
  - [ ] Config placeholders (URL, anon key)
  - [ ] Connection helper and feature guards
- [ ] 5. Sales — Step A
  - [ ] Render Sales page
  - [ ] Create Invoice modal HTML
  - [ ] Open/close modal logic
- [ ] 6. Sales — Step B
  - [ ] Table rendering from mock data
  - [ ] Filters + search
- [ ] 7. Sales — Step C (Supabase)
  - [ ] Load sales from Supabase
  - [ ] Create new sale -> persist
- [ ] 8. Invoices basic
  - [ ] List, view
- [ ] 9. Reports basic
  - [ ] Cards for revenue/expenses/VAT
- [ ] 10. Polish
  - [ ] Loading overlays, error handling, validations

## Definitions of Done
- Builds in browser without console errors.
- Each step has visible UI change or testable behavior.
- IDs in HTML match JS selectors.
- Code lint (basic) passes and naming consistent.

## Conventions
- IDs: `module-element-name` (e.g., `sales-table`, `create-sale-modal`).
- Buttons: `.btn-primary`, `.btn-secondary` (Tailwind utility composition).
- Files: `js/<module>.js`, keep managers as classes.
- Language: BG UI labels; EN code/comments.

## Next Action (Step 0)
- Create minimal project skeleton files.
- Then render an empty shell to verify routing.

