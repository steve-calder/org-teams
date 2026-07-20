## Context

The default route is currently a static Svelte page shown to everyone. Its highlights emphasize Person/login separation and server-resolved sessions, which are sound implementation choices but do not explain the product's customer value. The shared layout already exposes authentication and administrator state, and each authenticated request already has a trusted linked `locals.person`. Team memberships, Team managers, Organization ownership, lifecycle state, and contextual manager rules are now available in the database.

The change introduces no new organizational data. It turns `/` into an authentication-aware entry point: anonymous visitors learn what Org Teams helps them understand, while authenticated people see their own current place across Organizations and Teams.

## Goals / Non-Goals

**Goals:**

- Replace technical homepage messaging with clear product-purpose and outcome messaging.
- Give an authenticated Person an immediate, read-only summary of all current Team contexts across Organizations.
- Distinguish ordinary membership roles from manager assignments and show contextual managers without a primary relationship.
- Resolve dashboard identity exclusively from trusted server request context.
- Provide useful responsive and accessible states for rich, sparse, and empty dashboards.

**Non-Goals:**

- Organization-wide hierarchy visualization or interactive organization charts.
- Employee-facing Team, Organization, or Person detail routes.
- Editing memberships, managers, People, Teams, or Organizations from the dashboard.
- Historical or future-dated relationships, inactive-assignment history, allocation, or primary Team selection.
- New authorization roles, delegated manager authority, or changes to administrator controls.

## Decisions

### Branch the default route from server-resolved identity

Add a `+page.server.ts` load for `/`. If trusted session, user, and linked Person context are absent, it returns no dashboard data and does not execute a Person relationship query. If they are present, it calls the personal dashboard read model with `locals.person.id`. The page renders one of two mutually exclusive states from that result.

Using query parameters or client-side session inspection to choose a Person was rejected because it would create an avoidable identity and data-leakage boundary. Redirecting authenticated people to a second dashboard URL was also rejected because the product requirement makes the home route itself their starting point.

### Create a non-admin personal dashboard read model

Place the read model outside `$lib/server/admin` because it serves ordinary authenticated people and must not imply administrator authority. It reads the Person's ordinary memberships and managed Teams with their Organizations and managers, filters current relationships, defensively deduplicates Team entries, groups them by Organization, and returns a minimal allowlisted projection.

Reusing the admin membership context directly was rejected because that projection includes assignment choices and mutation-oriented data that ordinary users neither need nor should receive.

### Define current participation from existing lifecycle state

A dashboard Team entry is current only when the Person, Team, and owning Organization are active. Ordinary membership manager context is included only when the manager is active. Managed Teams are included only while the manager assignment points to the Person and the Team and Organization are active. Retained inactive relationships remain an administrative concern and do not appear on the current dashboard.

This keeps the first dashboard understandable and matches the product's current-state focus. Mixing historical and current entries without effective dates was rejected because it would make “where I fit now” ambiguous.

### Use Organization groups as presentation, not new identity

The read model derives Organization participation through Team ownership and creates no Person-to-Organization record. Organization groups are sorted by name and UUID; Team entries are sorted by name and UUID. No group or Team is labeled primary.

This preserves the existing cross-Organization model while providing the grouping people need. It also makes the data contract reusable by a later Organization visualization without prematurely adding Employment.

### Keep the dashboard informative but non-navigational for now

The dashboard shows Organization names, Team names, Team-specific roles or manager labels, and contextual manager names. It does not link ordinary users to `/admin` or invent employee-facing detail routes. Administrator access remains a separate header action.

Cards can become links when employee-facing Organization and Team visualization routes exist. Shipping dead links or administrator-only links in a personal dashboard was rejected.

### Treat public copy as product communication

The anonymous experience will explain three outcomes: understanding Team structure, seeing matrix participation across Teams, and understanding reporting context. Copy will avoid database, authentication-boundary, and session terminology and will not promise visualization controls that are not included in this change.

Page title and description metadata will differ between anonymous welcome and authenticated dashboard states, while the shared shell and account actions remain unchanged.

## Risks / Trade-offs

- **People without Team relationships receive a sparse first impression** → Provide a purposeful named empty state that explains no current assignments are available.
- **Grouping by Organization can look like direct Organization membership** → Label groups as Organizations represented by Team relationships and avoid employment language.
- **Dashboard data could accidentally expose admin-only projections** → Use a dedicated allowlisted read model and route tests that assert anonymous requests do not query it.
- **Current-only filtering hides retained inactive relationships** → State that the dashboard is current placement; preserve inactive context in administration and defer history views.
- **Non-navigational cards may feel limited** → Keep the information complete enough to orient the Person and evolve the cards into visualization links in the next capability.

## Migration Plan

No database migration is required. Deploy the personal read model, server load, and bifurcated page together. Rollback restores the static homepage and removes the unused read model without affecting organizational data.

## Open Questions

None for this change. The routes and permissions for Organization-wide visualization remain decisions for the subsequent visualization proposal.
