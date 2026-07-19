## Context

Org Teams already stores one cycle-free Team forest per Organization through `team.parentTeamId`, with optional managers and ordinary Team memberships. The existing administration-only hierarchy service returns a nested, stably sorted structure for Organization detail, but authenticated users have no equivalent read-only Organization-wide view and cannot inspect hierarchy breadth and depth spatially.

The new view is a normal authenticated-user tool, not an administrative function. It must require a session without requiring the global-administrator role or a linked Person, must not expose mutation capabilities or admin-route links, introduces a client-rendered visualization dependency, and must work with SvelteKit server rendering. The current data model and integrity services remain authoritative and require no migration.

## Goals / Non-Goals

**Goals:**

- Add a dedicated `/organization-chart` route and normal authenticated-user navigation for exploring one Organization's Team forest.
- Render a stable top-to-bottom or left-to-right node-link chart centered on a focal Team and its authoritative ancestor chain.
- Avoid automatically rendering the entire Organization by progressively revealing top-level and subordinate Teams through explicit expansion controls.
- Support Organization selection, Team search and focus, lifecycle filtering, viewport navigation, and Team details while preserving an expanded forest during ordinary Team inspection.
- Preserve a server-rendered semantic tree with equivalent context as an accessible and resilient alternative.
- Reuse the existing hierarchy assembly, authenticated-session, route, and styling patterns while separating read-only user data access from administrator services.

**Non-Goals:**

- Drag-and-drop reorganization, edge creation, inline mutation, or hierarchy persistence from visual positions.
- Rendering People as separate graph nodes or visualizing cross-Team membership edges.
- Combining multiple Organizations into one disconnected canvas.
- Adding dotted-line relationships, alternate hierarchies, graph analysis, exports, or anonymous/public access.
- Adding any route, link, control, authorization dependency, or other behavior to the administration section.
- Replacing the existing hierarchy shown on Organization detail.

## Decisions

### Use Svelte Flow for interaction and Dagre for layout

Add `@xyflow/svelte` for custom Svelte node cards, selection, keyboard interaction, pan, zoom, fit-to-view, controls, and optional minimap behavior. Add `@dagrejs/dagre` to compute deterministic directed hierarchy positions. Nodes are non-draggable and non-connectable, and no Svelte Flow change event is connected to a server mutation.

Dagre receives only currently revealed nodes in stable Team display-name and UUID order, fixed node dimensions, edges from direct parent to child, and a synthetic Organization root connected only to revealed top-level Teams. Orientation selects Dagre `rankdir` `TB` or `LR`. Layout is recomputed when Organization data, focal Team, expansion state, inactive visibility, or orientation changes. No edge may bypass an authoritative Team parent merely because intermediate nodes are collapsed.

The initial chart is Team-focused. When a focal Team exists, the revealed set contains the Organization root and the complete path from the focal Team through every authoritative parent to its top-level Team. Unrelated roots, siblings, and descendants are omitted. The Organization root can reveal all top-level Teams, and each Team can reveal all of its direct children one level at a time. Collapsing a node removes optional revealed branches but preserves nodes required by the focal path. Explicitly pivoting to another focal Team clears optional expansion state and reconstructs the new path; ordinary Team selection does not.

### Separate Team inspection from chart pivoting

Maintain `pivotTeamId` and `selectedTeamId` as distinct client state. `pivotTeamId` determines the required ancestor path, the validated `teamId` URL parameter, and the progressively disclosed graph projection. `selectedTeamId` determines only the selected styling and informational details panel.

Clicking a visible Team card changes `selectedTeamId` without changing `pivotTeamId`, revealed nodes, edges, expansion state, Dagre layout, viewport, or URL. Every visible Team card with a different pivot identity exposes a keyboard-accessible `Pivot chart to this Team` control. Activating that control sets both identities to that Team, clears optional Organization and Team expansion, updates the URL, reconstructs its ancestor path, and fits the resulting graph. The current pivot Team is identified without presenting a redundant pivot action.

If collapse or lifecycle filtering hides the inspected Team, its details selection is cleared while a still-valid pivot remains unchanged. If filtering invalidates the pivot itself, pivot and selection are normalized together. This split was chosen over retaining whole-card pivot behavior because inspection is the frequent exploration action and must not destroy a forest the user deliberately expanded.

D3 Hierarchy was considered for a smaller read-only SVG, but it would require custom viewport, selection, node, and responsive interaction work and naturally assumes one root. Cytoscape.js was rejected as broader graph modeling and analysis machinery than this strict forest needs. ELK remains an option if future compound layout or advanced edge-routing requirements exceed Dagre.

### Add a dedicated authenticated-user route with URL-owned Organization selection

Add `/organization-chart` outside the admin route tree and expose an `Organization chart` link in normal application navigation whenever `data.authenticated` is true. The page server load requires the existing session context but does not call `requireAdmin` or require a linked Person. It validates `organizationId` and `teamId`, lists every Organization in stable name and UUID order, and loads only the selected Organization's hierarchy summary. URL query parameters make Organization and focal-Team selection deep-linkable while every request still enforces authentication before reading hierarchy data.

Without a valid URL selection, the server deterministically chooses one Team associated with the authenticated user's linked Person, considering both ordinary memberships and Teams managed by that Person, ordered by Organization display name and UUID then Team display name and UUID. Its owning Organization becomes selected. If the user is unlinked or has no associated Team, the route falls back to the first valid Organization and an Organization-only chart state. Choosing another Organization clears a focal Team that does not belong to it.

Orientation, view choice, inactive visibility, search text, inspection selection, and expansion state are presentation state. Organization and pivot-Team URL parameters must be normalized against loaded data and never be trusted as authorization or relationship input. Inspection selection is intentionally not encoded in the URL because it does not define the graph projection.

Embedding the chart in Organization administration was rejected because this is a user-facing visualization and must not require admin access. A dedicated user route better supports switching Organizations and gives the canvas adequate width. Loading all Organization hierarchies up front was rejected to avoid unnecessary payload growth; authenticated users may select any Organization, but the server returns one selected hierarchy at a time.

### Extract a shared read-only hierarchy model without changing persistence

Extract hierarchy selection and forest assembly needed by both contexts into a neutral server-only read module, or add an equivalent read-only module outside `$lib/server/admin`. It produces a chart-safe, serializable summary for the selected Organization and resolves deterministic authenticated-user Team associations without granting administrative access. Each Team summary includes identity, name, friendly type code/label input, lifecycle status, parent ID, manager identity/display name, ordinary membership count, and a participant count computed as ordinary memberships plus one when a manager is assigned. Parent and child summaries are derived from the same authoritative result.

The user route performs session authorization before calling the read module. The server continues to assemble and validate the forest defensively, and the browser converts that normalized result into Svelte Flow nodes and edges rather than querying relationships independently. Existing admin mutation services remain untouched. No database migration, write service, audit event, or new API endpoint is needed.

### Make search establish a focal Team without rendering the whole Organization

Search is local to the already authorized selected-Organization payload and matches Team display names case-insensitively. It yields a stable result list; choosing a result explicitly pivots because a hidden result cannot otherwise be inspected, reconstructs and fits its complete Organization-to-Team ancestor chain, clears optional expansions, and opens its details. Nonmatching Teams are not automatically revealed, while every authoritative ancestor remains visible.

Inactive visibility applies before layout to both chart and tree projections. Current lifecycle rules prevent an active descendant from depending on an inactive ancestor, so an active-only projection cannot orphan active Teams. If filtering removes the selected Team, selection is cleared explicitly.

### Treat the visual Organization root as presentation only

The selected Organization is represented by a synthetic, non-Team root node. Its identifier is namespaced separately from Team UUIDs and it cannot be selected as a Team or submitted to server services. It does own a presentation-only disclosure control that reveals or hides all top-level Teams; collapsing it preserves the top-level Team required by the focal path. Team nodes with direct children expose equivalent presentation-only subordinate disclosure controls, and all non-pivot Team nodes expose the separate pivot control. Team nodes and the informational details panel expose no links into `/admin` and no editing affordances. Empty Organizations show an explicit empty state rather than misleading edges.

### Pair the canvas with a semantic tree

Chart and Tree controls switch between two projections of the same server result and pivot/selection/expansion state. The Tree projection uses nested semantic lists, ordinary Team-selection buttons, separate pivot actions, and accessible disclosure controls instead of emulating a complex ARIA tree widget or linking to admin Team detail. It includes Team name, friendly type, status, manager, and participant count, plus the Organization context. It is server renderable and remains available when chart initialization is unavailable.

The Svelte Flow canvas is progressively mounted in the browser because layout and viewport measurement require DOM dimensions. A bounded-height responsive container prevents page-level horizontal scrolling. On narrow screens the controls and details stack, while the canvas retains internal pan/zoom. Automated accessibility checks cover labels, focus, controls, view switching, and the tree alternative; they do not claim that spatial relationships are fully conveyed to screen readers.

### Separate pure projection and layout logic from rendering

Implement pure helpers that flatten the hierarchy, apply lifecycle visibility, resolve focal ancestry, apply Organization and Team expansion state, build synthetic-root nodes and direct parent edges, compute Team details, and map Dagre output to Svelte Flow positions. Keeping these functions outside the component makes stable ordering, focal paths, incremental expansion, collapse preservation, counts, filtering, multiple roots, layout orientation, empty data, and malformed defensive input unit-testable without a browser.

The page component owns normalized pivot, inspection, and disclosure state and delegates node-card and detail presentation to focused Svelte components. Browser tests cover inspection without graph changes, explicit pivoting, search pivoting, URL Organization switching, view fallback, controls, and mobile layout; unit/component tests cover projections and accessible content.

## Risks / Trade-offs

- **[Large Organizations can create a crowded canvas and large DOM]** → Render only the focal path and explicitly expanded levels, retain fit controls, and show a minimap only when the revealed graph is large.
- **[Dagre may change sibling placement after structural changes]** → Supply stable input ordering, fixed dimensions, deterministic options, and tests for equivalent input; accept necessary movement when the hierarchy itself changes.
- **[Canvas interaction can be mistaken for editing]** → Disable node dragging and connection handles, label the view read-only, and expose no editing actions or admin-route links.
- **[Moving hierarchy reads outside admin expands data visibility]** → Require authentication before every read, return only the selected Organization hierarchy, document that all Organizations are intentionally browseable by authenticated users, and test anonymous and non-admin boundaries explicitly.
- **[Svelte Flow depends on browser geometry and may not server-render the canvas]** → Mount the canvas progressively and keep the semantic tree and route controls server rendered.
- **[Rich node cards can reduce layout readability]** → Keep cards to concise summary fields and move parent/child detail into the selection panel.
- **[Two hierarchy projections can drift]** → Generate chart and tree data from the same normalized server response, focal selection, and disclosure state and share projection helpers and test fixtures.
- **[Users may confuse inspection, expansion, and pivot controls]** → Keep whole-card selection limited to details, label pivot actions explicitly, identify the current pivot Team, and provide equivalent keyboard-accessible actions in Tree view.

## Migration Plan

1. Add the Svelte Flow and Dagre runtime dependencies and validate compatibility with the current Svelte 5 and Vite build.
2. Extract or add the neutral read-only hierarchy model and test manager and participant summaries without changing stored data or admin mutation services.
3. Add pure projection/layout helpers, chart components, semantic tree projection, and the guarded route.
4. Add the authenticated-user application navigation entry and verify session boundaries, route, component, accessibility, responsive, and browser behavior for non-admin users.
5. Deploy as an additive authenticated-user feature. Rollback removes the user route and navigation entry, then the unused dependencies; no data rollback is required.

## Open Questions

None. Advanced large-graph rendering, visual editing, People nodes, exports, and anonymous/public access remain future decisions based on observed use.
