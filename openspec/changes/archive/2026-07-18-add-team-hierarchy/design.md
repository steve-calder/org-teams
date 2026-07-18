## Context

The application currently persists globally administered People, Organizations, and Organization-owned Teams. A Team has no parent or manager, Organization detail presents a flat Team list, and Team detail supports definition, lifecycle, and confirmed ownership transfer. The existing Team transfer service was deliberately isolated so later hierarchy checks could be added at that boundary.

`SPEC.md` now defines one parent-child Team hierarchy per Organization. Each Team may have one manager, members will eventually report to the managers of their Teams, and the manager of a subordinate Team is supervised by the manager of its direct parent Team. No primary Team or separate editable Person reporting graph is desired.

People are not yet related to Organizations through Employment, and Team membership does not exist. This change can establish Team managers and manager-to-manager supervision, but it cannot truthfully validate that a manager participates in the Team's Organization or derive reporting for ordinary Team members. The new records remain global-administrator-only under the existing authorization boundary.

## Goals / Non-Goals

**Goals:**

- Persist one optional parent and one optional manager on every Team.
- Keep every Organization's hierarchy a cycle-free tree or forest with same-Organization edges.
- Derive direct manager supervision from adjacent parent and child Teams without storing Person reporting edges.
- Prevent hierarchy, lifecycle, transfer, and Person-status mutations from leaving invalid current state.
- Add accessible admin controls and hierarchy navigation using the existing SvelteKit route and service patterns.
- Audit hierarchy and manager mutations atomically with sanitized metadata.

**Non-Goals:**

- Team membership, Employment, manager Organization-scope validation, or member-to-manager reporting.
- Primary Team, primary manager, dotted-line labels, or directly assigned Person reporting relationships.
- Multiple named hierarchies, drag-and-drop tree editing, bulk reorganization, or subtree transfer between Organizations.
- Effective-dated hierarchy and manager assignments, future scheduling, or employee-facing hierarchy views.
- Organization-scoped administrator permissions or granting private-data access from Team management.

## Decisions

### Store current parent and manager directly on Team

Add nullable `parent_team_id` and `manager_person_id` columns to `team`. `parent_team_id` self-references `team.id`; `manager_person_id` references `person.id`. Both use restrictive update and deletion behavior, and both receive indexes. Drizzle relations expose parent, children, and manager associations.

An adjacency-list parent is the smallest model that matches one hierarchy per Organization and one parent per Team. A separate closure or hierarchy-placement table would add synchronization and migration complexity intended for multiple hierarchies or effective dating, neither of which is in scope. Descendant traversal uses bounded PostgreSQL recursive CTEs.

Both fields remain nullable. Existing Teams migrate as top-level unmanaged Teams without backfill, and administrators can build the structure incrementally.

### Treat manager assignment as Team context, not Employment

An active Person may manage a Team even though Employment and Team membership do not yet exist. The UI labels this bootstrap limitation and exposes only active People as choices; the service repeats active-state validation. Assignment does not create Team membership, Organization participation, authorization, or private-data access.

Requiring a manager to be a Team member was considered but rejected because no membership model exists. Adding Employment and membership to this change would substantially broaden its purpose. Their eventual introduction can tighten manager eligibility without replacing `manager_person_id`.

### Derive manager supervision at query time

For a Team with both a manager and a directly parented Team whose manager is present, the parent manager supervises the child manager in that Team context. Top-level managers and managers whose direct parent is unmanaged have no hierarchy-derived supervisor. Queries do not skip an unmanaged parent to find a more distant manager, and no direct Person reporting row is persisted.

The service rejects a hierarchy or manager mutation when the same Person would manage two Teams in a single ancestor-descendant chain. This prevents derived self-supervision. People managing unrelated Teams remain valid and may have distinct contextual supervisors; none is primary.

Persisting derived reporting edges was rejected because they would duplicate the authoritative hierarchy and require synchronization after every parent or manager change.

### Centralize hierarchy validation and mutations in a server-only service

Add a hierarchy administration service that lists an Organization's hierarchy, returns eligible parent and manager options, assigns or clears a parent, and assigns or clears a manager. Parent validation verifies record existence, matching Organization, active-state compatibility, self-parenting, descendants, and ancestor manager conflicts. Manager validation verifies active Person status and ancestor or descendant manager conflicts.

Cycle and manager-chain checks use recursive CTEs against authoritative database state rather than trusting client-supplied option lists. Route actions remain thin adapters and repeat `requireAdmin` before reading form data or invoking services.

### Serialize structural mutations at the Organization boundary

Hierarchy mutations lock the owning Organization row before reading the complete current hierarchy and updating a Team. Team lifecycle and transfer operations adopt the same Organization-locking boundary before hierarchy checks. Cross-Organization transfer locks source and destination Organizations in deterministic UUID order. Person deactivation locks the Person and validates managed active Teams within the transaction; manager assignment locks the selected Person while holding the Organization structural lock.

Services re-read the target records after acquiring locks and reject stale ownership or lifecycle state. Database foreign keys provide referential integrity while transactions provide same-Organization, acyclic, active-state, and manager-chain guarantees that ordinary constraints cannot express.

This extends the existing locking discipline instead of using database triggers, whose recursive validation and application-specific error reporting would be harder to maintain and test.

### Make lifecycle and transfer conflicts explicit

An active Team may only have an active parent. A Team with any active descendant cannot be deactivated; administrators must first reparent or deactivate the descendants. Deactivating an eligible leaf or inactive branch preserves its parent, inactive children, and manager instead of silently rewriting related records. Reactivation revalidates the Organization and direct parent lifecycle.

A Team with any parent or child, regardless of lifecycle state, cannot transfer Organizations. The existing confirmed transfer experience reports the blocking related Teams and requires administrators to clear the relationships explicitly. A root leaf Team may transfer while retaining its manager assignment because People are currently global records.

A Person managing an active Team cannot be made inactive. Team management must first be cleared or reassigned. These blocking rules favor visible administrator intent over cascade behavior.

### Extend existing detail pages instead of adding a hierarchy editor route

Organization detail replaces its flat Team list with an accessible nested tree or forest ordered by Team display name and UUID. Each node links to Team detail and shows status and manager context. A bounded-depth defensive fallback surfaces malformed or unexpectedly deep data without recursively rendering forever.

Team detail adds a hierarchy and management section showing current parent, child Teams, manager, and the manager's direct hierarchy-derived supervisor when present. Separate forms assign or clear parent and manager using eligible server-provided options. Select-based controls are preferred over drag-and-drop because they are accessible, work on mobile, and make validation failures easy to explain.

### Reuse Team-targeted audit events

Successful parent and manager changes write `team.parent_changed` and `team.manager_changed` events in the same transaction. Metadata contains only previous and new UUIDs plus allowlisted field names; Person names and raw request data are excluded. Existing Team audit queries therefore display structural changes without expanding the audit target model.

## Risks / Trade-offs

- **[A manager can belong to a different real-world Organization]** → Clearly treat manager assignment as global-admin bootstrap data and tighten eligibility when Employment is introduced.
- **[Adjacency lists require recursive queries for validation and display]** → Use indexed parent IDs, bounded recursive CTEs, deterministic ordering, and database integration tests for deep and broad trees.
- **[Organization-level serialization reduces concurrent hierarchy write throughput]** → Hierarchy administration is low-volume, while the lock provides straightforward integrity and understandable conflicts.
- **[Inactive Teams may remain in the stored hierarchy]** → Show lifecycle status in admin trees, exclude inactive choices for new active relationships, and preserve explicit relationships rather than silently deleting context.
- **[Manager supervision exists before Team memberships]** → Limit reporting output to manager-to-manager hierarchy context and defer ordinary member reporting until membership data is authoritative.
- **[Strict transfer blocking requires extra administrator steps]** → Identify the exact parent and children that must be cleared and retain the existing confirmation workflow.
- **[Deep hierarchies can stress recursive rendering]** → Use iterative tree assembly, a defensive depth/node bound, and tests for malformed input even though write validation prevents cycles.

## Migration Plan

1. Add nullable `parent_team_id` and `manager_person_id` foreign keys and indexes in one committed Drizzle migration; existing Teams require no backfill.
2. Add schema relations and hierarchy service queries, validation, mutations, audit writes, and database tests before exposing controls.
3. Update Team transfer, Team lifecycle, and Person lifecycle services to enforce the new blocking rules under the shared locking protocol.
4. Add guarded Team actions and the Organization hierarchy and Team relationship UI, followed by route, component, and browser coverage.
5. Verify migration application, formatting, lint, Svelte checks, unit and database tests, production build, and administrator browser flows.

Rollback removes hierarchy controls and service calls first. The nullable columns and indexes can then be removed only after exporting any parent and manager assignments and confirming no later schema depends on them; existing Organization and Team identities remain unchanged.

## Open Questions

None. Employment validation, Team membership, effective history, employee-facing reporting, and broader manager authority are explicit future capabilities.
