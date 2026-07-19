## Why

The application does not give authenticated users a spatial way to understand the overall shape, depth, and breadth of an Organization's Team structure. Users need a stable, read-only visualization for exploring those structures without entering the administration console or implying unsupported hierarchy editing.

## What Changes

- Add an authenticated-user organization chart experience outside the administration section that displays one selected Organization at a time as a deterministic, Team-focused node-link hierarchy.
- Default the focal Team to one of the authenticated user's ordinary memberships or managed Teams when available, while retaining safe Organization-only behavior for unlinked users and users without Teams.
- Show the focal Team's complete authoritative ancestor chain to the Organization without automatically rendering unrelated Teams or its whole descendant subtree.
- Allow users to expand or collapse direct subordinate Teams one level at a time, including Organization-level expansion of all top-level Teams.
- Allow authenticated users to select any Organization, switch between top-to-bottom and left-to-right layouts, search or focus Teams, fit and navigate the viewport, and optionally exclude inactive Teams.
- Present Team name, type, lifecycle, manager, and membership summary in chart context, with selection opening an informational detail panel that exposes no administrative action.
- Support multiple top-level Teams through an expandable visual Organization root and preserve stable Team ordering between loads and expansion changes.
- Keep the chart read-only: moving or selecting a visual node does not mutate Team hierarchy data.
- Retain a semantic tree alternative with equivalent Team context for keyboard, screen-reader, mobile, and text-oriented use.
- Add Svelte Flow for canvas interaction and Dagre for deterministic hierarchical layout.

## Capabilities

### New Capabilities

- `organization-chart-visualization`: Authenticated-user access, Organization selection, deterministic interactive Team chart behavior, informational Team details, filtering, responsive behavior, and an accessible tree alternative.

### Modified Capabilities

None.

## Impact

- Adds an authenticated route at `/organization-chart` and authenticated-user navigation outside the administration section, plus Svelte components for chart nodes, controls, details, and the tree alternative.
- Adds or extracts read-only server-side hierarchy queries that supply all Organization options, chart-safe Team summaries, and a deterministic default Team association for the authenticated user without depending on global-administrator authorization.
- Adds runtime dependencies on `@xyflow/svelte` and `@dagrejs/dagre`; no database migration or mutation API is required.
- Requires component, authentication, route, accessibility, responsive, and browser coverage for the new user visualization while leaving existing Organization and Team administration behavior unchanged.
