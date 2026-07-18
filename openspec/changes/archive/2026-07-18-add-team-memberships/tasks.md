## 1. Membership Data Model

- [x] 1.1 Add the `team_membership` Drizzle table with UUID identity, Person and Team foreign keys, required bounded free-text role, timestamps, a unique Person-Team constraint, and Person- and Team-centered indexes.
- [x] 1.2 Add Person, Team, and membership relations and exports to the shared database schema without changing the canonical Team manager field.
- [x] 1.3 Generate and review the additive database migration and metadata snapshot for the membership table and constraints.
- [x] 1.4 Extend database schema tests to cover role length, foreign-key restrictions, uniqueness, indexes, and relation exports.

## 2. Membership Domain Services

- [x] 2.1 Implement deterministic Team-roster and Person-Team read models that combine ordinary memberships with one synthesized manager entry and include Organization and lifecycle context.
- [x] 2.2 Implement contextual manager derivation for active ordinary memberships without persisting direct reporting relationships or choosing a primary manager.
- [x] 2.3 Implement transactional ordinary membership creation with active endpoint checks, trimmed role validation, duplicate detection, and current-manager exclusion.
- [x] 2.4 Implement transactional role updates and membership removal with stale-record and endpoint validation.
- [x] 2.5 Write sanitized membership create, role-change, and removal audit events targeting both the Person and Team in the same transaction as each mutation.
- [x] 2.6 Update Team manager assignment to serialize against membership mutations, remove and audit a promoted Person's ordinary membership atomically, and avoid restoring membership when management ends.
- [x] 2.7 Add service tests for multiple Teams and Organizations, duplicate and manager exclusion, manager promotion reconciliation, lifecycle retention, contextual managers, authorization-independent validation, audit rollback, and concurrent mutation integrity.

## 3. Team-Centered Administration

- [x] 3.1 Extend the Team detail loader with the deduplicated roster, contextual manager data, and eligible active Person choices.
- [x] 3.2 Add server-authorized Team detail actions for membership creation, role editing, and removal with stable validation errors and redirects.
- [x] 3.3 Build the Team roster UI with a single identified manager, ordinary member roles and lifecycle context, related Person links, and progressively enhanced add, edit, and remove controls.
- [x] 3.4 Add Team route tests for roster rendering, eligibility filtering, successful mutations, manager redundancy errors, invalid roles, missing records, audit failures, and anonymous or non-administrator requests.

## 4. Person-Centered Administration

- [x] 4.1 Add a Teams section to the Person detail navigation and load ordinary memberships, managed Teams, Organization context, lifecycle state, and contextual managers.
- [x] 4.2 Add server-authorized Person Teams actions for assigning an eligible Team, editing a Team-specific role, and removing an ordinary membership.
- [x] 4.3 Build the Person Teams UI to distinguish ordinary membership from management, show no primary designation, link related Teams and Organizations, and provide progressively enhanced membership controls.
- [x] 4.4 Add Person Teams route tests for cross-Organization assignment, multiple memberships, manager-only participation, role changes, removal, lifecycle context, validation failures, and unauthorized requests.

## 5. Integrated Behavior and Documentation

- [x] 5.1 Extend hierarchy manager tests to verify promotion replaces ordinary membership atomically and produces both manager-change and membership-removal audit history.
- [x] 5.2 Extend administrator end-to-end coverage for assigning a Person from a Team, assigning a Team from a Person, editing a role, promoting a member to manager, deduplicated display, and removing membership.
- [x] 5.3 Update `SPEC.md` membership language to record required free-text Team roles, manager-as-implicit-member behavior, and the deferred status of primary membership, allocation, effective dating, and role catalogs.
- [x] 5.4 Run database migrations in the test environment and execute focused schema, service, route, and admin end-to-end suites.
- [x] 5.5 Run formatting, lint, Svelte diagnostics, the complete unit suite, production build, and strict OpenSpec validation; resolve all change-related failures.
