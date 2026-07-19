## 1. Dependencies and Data Contract

- [x] 1.1 Add compatible `@xyflow/svelte` and `@dagrejs/dagre` runtime dependencies and commit the updated package lock.
- [x] 1.2 Extract or add a neutral server-only Organization hierarchy read model outside the admin service boundary with stable Team type, manager, ordinary-membership count, participant count, parent, and child summaries without changing persistence or admin mutations.
- [x] 1.3 Add read-model tests for stable forest ordering, multiple roots, empty Organizations, absent managers, and participant counts that include an assigned manager exactly once.

## 2. Chart Projection and Layout

- [x] 2.1 Define serializable chart summary types and pure helpers for flattening the forest, applying inactive visibility, resolving Team details, and producing stable search results.
- [x] 2.2 Implement the synthetic Organization root plus direct parent-child Svelte Flow node and edge projection with fixed node dimensions and no draggable or connectable Team behavior.
- [x] 2.3 Implement deterministic Dagre top-to-bottom and left-to-right positioning, including fit-trigger metadata and namespaced presentation-only Organization identity.
- [x] 2.4 Add unit tests for stable equivalent layouts, multiple roots, both orientations, active-only filtering, selection clearing, search context preservation, and defensive malformed or empty input.

## 3. Read-Only Visualization Components

- [x] 3.1 Build compact custom Organization and Team node components that present accessible names and Team name, friendly type, status, manager, and participant context.
- [x] 3.2 Build a progressively mounted Svelte Flow canvas with selection/focus, pan, zoom, fit-to-view, orientation controls, read-only labeling, responsive dimensions, and optional minimap behavior only where useful.
- [x] 3.3 Build the informational selected-Team details panel with parent, direct children, missing-context states, and participant summary, with no editing control or administration link.
- [x] 3.4 Build the server-renderable nested semantic-list tree projection with equivalent Team summary context and ordinary Team-selection controls rather than administration links.
- [x] 3.5 Add component tests for rendering, node and search selection, detail content, disabled editing affordances, view switching, keyboard focus, and tree fallback behavior.

## 4. Authenticated User Route and Controls

- [x] 4.1 Add the session-guarded `/organization-chart` server load outside the admin route tree, with all Organization options in stable order, validated URL selection, deterministic fallback, selected-only hierarchy loading, and no-Organization and no-Team states.
- [x] 4.2 Add the route page with Organization selector, Team search results, inactive visibility control, Chart and Tree view controls, orientation controls, chart/tree content, and normalized presentation state.
- [x] 4.3 Persist Organization selection in the URL and ensure Organization changes, refreshes, unknown identifiers, filters, and now-hidden Team selections normalize while returning only the selected Organization hierarchy.
- [x] 4.4 Add the Organization chart entry to normal application navigation for every authenticated session, including non-admin users and accounts without linked Person records, and do not change administration navigation.
- [x] 4.5 Add route tests proving non-admin and unlinked authenticated access, anonymous redirect before data reads, selected-only hierarchy data, stable fallback, URL behavior, empty states, and absence of admin dependencies or chart mutation actions.

## 5. Browser, Accessibility, and Release Verification

- [x] 5.1 Add authenticated non-admin browser coverage for Organization switching, chart rendering, multiple roots, Team search/focus/details, orientation changes, inactive filtering, fit controls, Tree view, and absence of administration links or editing controls.
- [x] 5.2 Add narrow-viewport and accessibility coverage for page-level overflow, labeled controls, visible focus, keyboard operation, equivalent tree context, and usable fallback when the canvas is not initialized.
- [x] 5.3 Run formatting, lint, Svelte checks, unit and route tests, browser tests, and the production build; resolve regressions and confirm existing Organization detail hierarchy and all administration behavior remain intact.
- [x] 5.4 Preserve the complete Organization-to-Team ancestor path when chart selection or search focuses a Team, with regression coverage for deep hierarchy focus.

## 6. Focal Team and Progressive Disclosure Revision

- [x] 6.1 Add a neutral authenticated-user default selection read model and route normalization for stable ordinary-membership or managed-Team focal selection, matching Organization and Team URL parameters, and Organization-only fallback, with server and route tests.
- [x] 6.2 Replace full-forest chart projection with pure focal-path and progressive-expansion helpers that reveal only required ancestors plus explicitly expanded Organization or direct-Team levels, preserve direct authoritative edges, clear optional expansion on focal changes, and handle inactive filtering defensively, with unit tests.
- [x] 6.3 Add keyboard-accessible Organization and Team subordinate disclosure controls, synchronize chart and semantic-tree revealed state, fit only revealed nodes, reset optional expansion on Organization or focal-Team changes, and retain read-only details without administration actions, with component tests.
- [x] 6.4 Add browser coverage for deterministic user-Team defaulting, deep focal ancestry without shortcut edges, Organization top-level expansion, one-level subordinate expansion and recursive collapse, search-to-focal behavior, users without Teams, and responsive accessibility; rerun formatting, lint, Svelte checks, tests, and production build.
