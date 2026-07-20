## 1. Persistence and Migration

- [x] 1.1 Add nullable `parentTeamId` and `managerPersonId` fields, restrictive foreign keys, indexes, and parent, children, and manager relations to the Team schema
- [x] 1.2 Generate and review the committed Drizzle migration so existing Teams become unmanaged top-level Teams without backfill
- [x] 1.3 Add schema and migration tests for nullable relationships, referential integrity, indexes, and inferred Team types

## 2. Hierarchy Domain Services

- [x] 2.1 Add server-only hierarchy queries that return a deterministically ordered Organization tree or forest and Team parent, children, manager, and direct manager-supervisor context
- [x] 2.2 Add eligible-parent and active-Person manager option queries without inferring Employment, Team membership, or authorization
- [x] 2.3 Implement transactional parent assignment and clearing with Organization ownership, lifecycle, self-parent, descendant-cycle, and ancestor-manager validation
- [x] 2.4 Implement transactional manager assignment and clearing with active-Person and ancestor-descendant self-supervision validation
- [x] 2.5 Write atomic `team.parent_changed` and `team.manager_changed` audit events containing only allowlisted previous and new UUID metadata
- [x] 2.6 Add domain tests for multiple roots, stable ordering, deep descendants, valid moves, clearing parents and managers, cross-Organization rejection, self-parenting, indirect cycles, inactive managers, contextual supervision, unmanaged parents, and audit rollback

## 3. Lifecycle, Transfer, and Concurrency Integrity

- [x] 3.1 Refactor Organization and Team structural mutations to use the shared Organization-locking protocol and deterministic cross-Organization lock order
- [x] 3.2 Block Team transfer while the Team has a parent or children, return the blocking Teams, and preserve the manager when an eligible root leaf Team transfers
- [x] 3.3 Require an active parent for an active Team and block Team deactivation while any active descendant remains, without silently clearing valid stored relationships
- [x] 3.4 Block Person deactivation while they manage an active Team and return the blocking Teams for administrator guidance
- [x] 3.5 Add database service tests for transfer blockers, lifecycle blockers and resolution, reactivation validation, Person deactivation and retry, stale-state rejection, and concurrent parent, manager, lifecycle, and transfer conflicts

## 4. Guarded Administration Routes

- [x] 4.1 Extend Organization detail loading with the complete bounded hierarchy and manager context while retaining global administrator authorization and 404 behavior
- [x] 4.2 Extend Team detail loading with parent, children, manager, derived supervisor, and eligible parent and manager options
- [x] 4.3 Add separately authorized Team actions for assigning or clearing parent and manager values with untrusted identifier handling and accessible validation responses
- [x] 4.4 Extend Team transfer, Team lifecycle, and Person lifecycle actions to return hierarchy-aware blocking details without partial mutations
- [x] 4.5 Add route tests for authorized loads and mutations, anonymous and non-administrator rejection, invalid identifiers, cycle and manager conflicts, blockers, and successful audit-backed updates

## 5. Administration Interface

- [x] 5.1 Replace the Organization detail flat Team list with an accessible, deterministically ordered nested tree or forest showing Team lifecycle and manager context
- [x] 5.2 Add a Team hierarchy section with linked parent and child Teams and clear top-level and no-children states
- [x] 5.3 Add separate select-based parent and manager forms with clear options, assign, change, and clear behavior, success announcements, and validation messages
- [x] 5.4 Display the Team manager's direct hierarchy-derived supervisor when present and explain top-level, unmanaged-parent, and no-manager states without primary or dotted-line terminology
- [x] 5.5 Update transfer, Team lifecycle, and Person lifecycle interfaces to list blocking Teams and link administrators to the records that must be resolved
- [x] 5.6 Add component and page coverage for nested rendering, keyboard and screen-reader semantics, mobile layout, duplicate-name disambiguation, inactive records, empty states, and action feedback

## 6. End-to-End Verification

- [x] 6.1 Add an administrator browser flow that creates a multi-level hierarchy with multiple roots, assigns managers, verifies derived manager supervision, moves a Team, and clears relationships
- [x] 6.2 Add browser coverage for rejected cycles, ancestor-descendant manager reuse, inactive manager selection, blocked Team transfer and deactivation, blocked Person deactivation, and successful resolution flows
- [x] 6.3 Verify the committed migration against a populated database and confirm existing Teams remain top-level and unmanaged
- [x] 6.4 Run formatting, lint, Svelte checks, unit and database tests, production build, and the relevant Playwright suite and resolve all regressions
