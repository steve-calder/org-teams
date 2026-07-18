## Context

The application currently stores global Person identities, Organization-owned Teams, one optional parent and manager per Team, and manager supervision derived from the Team hierarchy. There is no ordinary Person-to-Team relationship, so Team rosters and membership-derived manager contexts cannot yet be represented. Administration is server-authorized for global administrators, mutations use Drizzle transactions, and Person- and Team-targeted audit events already exist.

This change crosses the database schema, manager mutation logic, admin services, Person and Team detail routes, and audit tests. It deliberately continues to model Person as global: participation in a Team owned by an Organization does not require a separate Employment or Organization-membership record.

## Goals / Non-Goals

**Goals:**

- Persist one ordinary membership per Person and Team with a required Team-specific free-text role.
- Allow the same Person to participate in multiple Teams across Organizations without a primary membership.
- Treat the existing Team manager assignment as implicit membership and present a deduplicated roster.
- Make manager promotion and ordinary membership reconciliation atomic and auditable.
- Support membership administration from both Team- and Person-centered admin experiences.
- Expose membership data as the source for contextual manager derivation.

**Non-Goals:**

- Employment records or a separate Person-to-Organization relationship.
- Primary Team selection, allocation percentages, effective dates, or membership history tables.
- Controlled job-title or role catalogs.
- Direct Person-to-Person reporting records or authorization granted from membership or management.
- Employee self-service or delegated Team-manager administration.

## Decisions

### Store ordinary memberships as a direct Person-to-Team relation

Add a `team_membership` table with UUID `id`, required `person_id`, required `team_id`, required `role`, and timestamps. Foreign keys use restricted deletion, `(person_id, team_id)` is unique, and role length is protected in both input validation and a database check. Indexes support Person- and Team-centered lists.

This direct relationship naturally permits participation across Organizations because Organization ownership is obtained through the Team. Adding an Employment or Organization-participant table now would create semantics the product has intentionally deferred.

### Keep manager assignment canonical and synthesize manager membership

`team.manager_person_id` remains the single source of truth for management. Read models form a roster by combining one synthesized manager entry with ordinary membership rows and never create a membership row merely to represent the manager. The manager entry uses a stable manager label rather than a user-entered ordinary-member role.

An ordinary membership cannot be created for the current manager. When an existing ordinary member becomes manager, the manager transaction deletes that membership, records its removal, and changes the manager atomically. Clearing or replacing a manager does not restore a deleted membership because there is no reliable way to infer the former Team role; an administrator may add an ordinary membership explicitly afterward.

Keeping two persistent records and deduplicating only in the UI was rejected because downstream reporting and APIs could disagree about whether the Person has one or two assignments.

### Centralize membership invariants in a transactional admin service

A dedicated membership service owns list, create, role-update, and remove operations. Mutations lock or otherwise serialize against the target Team, reload Person, Team, manager, and membership state inside the transaction, enforce active-endpoint and manager-exclusion rules, and write audit events before commit. The unique constraint remains the final defense against concurrent duplicate inserts.

Manager assignment uses the same reconciliation helper inside its existing transaction. This avoids a race in which ordinary membership and manager assignment could both pass stale eligibility checks.

### Retain memberships across endpoint lifecycle changes

Creation and role editing require an active Person and active Team. A later Person or Team deactivation retains the membership for continuity and displays lifecycle status, matching the application's non-destructive lifecycle model. A retained membership contributes current contextual reporting only while both endpoints and the Team manager are active.

Automatically deleting memberships on deactivation was rejected because it would silently discard organizational context. Blocking all deactivation was also rejected because existing Team lifecycle behavior intentionally retains structural relationships.

### Extend both admin navigation perspectives

The Team detail page gains a roster and ordinary membership actions. The Person detail navigation gains a Teams section that lists managed Teams and ordinary memberships with Organization context, role, status, and contextual manager. Both views call the same service and provide links to related Person, Team, and Organization records.

Mutating forms use progressive enhancement and server actions consistent with the existing console. Server authorization occurs before loading choices or membership data. Eligible choices exclude inactive endpoints, existing ordinary members, and the current Team manager.

### Reuse multi-target administrative audit events

Membership events set both `targetPersonId` and `targetTeamId`, allowing the same event to appear in both audit histories. Metadata is allowlisted to membership ID and previous/new role values. Manager promotion writes both the ordinary-membership removal event and the existing manager-change event in the same transaction.

## Risks / Trade-offs

- **Manager promotion discards the former ordinary role** → Require an explicit confirmation message that promotion replaces ordinary membership, preserve the prior role in sanitized audit metadata, and never restore it implicitly.
- **Lifecycle retention can look like an active assignment** → Show Person and Team status alongside retained memberships and exclude inactive endpoints from current reporting derivation.
- **Application-only manager exclusion can race with membership creation** → Serialize both operations on the target Team and retain the unique Person-Team constraint for ordinary duplicates.
- **Free-text roles create inconsistent naming** → Trim and length-limit input now while preserving the option to introduce a controlled catalog later.
- **Large rosters could make detail pages expensive** → Query indexed Person- and Team-centered projections and use deterministic ordering; defer pagination until actual roster sizes require it.

## Migration Plan

1. Add the empty membership table, constraints, indexes, relations, and generated migration; no existing data backfill is required because managers remain represented by `team.manager_person_id`.
2. Deploy read and mutation services plus manager reconciliation in the same release as the new table.
3. Add Team roster and Person Teams administration views.
4. Verify schema, service, route, authorization, audit, concurrency, and end-to-end behavior before release.

Rollback removes the new UI and service usage before dropping the membership table. Manager assignments remain intact because they were never migrated into membership rows; any ordinary membership data created after deployment must be exported or explicitly accepted as lost before a destructive schema rollback.

## Open Questions

None for this change. Effective dating, allocation, role catalogs, Employment, and delegated manager authority remain explicit future decisions.
