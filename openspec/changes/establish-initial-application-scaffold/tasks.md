## 1. Normalize the Generated Scaffold

- [ ] 1.1 Remove generator demo routes, Vitest examples, and the sample `task` model while preserving a minimal temporary landing route
- [ ] 1.2 Correct Prettier and ESLint ownership/ignore configuration so application linting excludes generated and repository-managed skill files
- [ ] 1.3 Split Playwright browser installation from the end-to-end test command and add non-interactive verification scripts for CI
- [ ] 1.4 Add the supported Node version, package engine declaration, and locked-install guidance
- [ ] 1.5 Run and record the clean baseline for formatting, linting, Svelte type checking, unit tests, and production build

## 2. Complete Runtime and Dependency Setup

- [ ] 2.1 Replace `@sveltejs/adapter-auto` with `@sveltejs/adapter-node` and verify the built Node server startup command
- [ ] 2.2 Add `zod`, `sveltekit-superforms`, and `date-fns` with a server-only validated environment module and one form-validation test
- [ ] 2.3 Add `bits-ui` and `lucide-svelte` behind local application UI components rather than page-level direct usage
- [ ] 2.4 Add `@xyflow/svelte` and `@dagrejs/dagre` and create a browser-safe hierarchy projection/layout module
- [ ] 2.5 Add `@testcontainers/postgresql` as an explicit integration-test dependency and a reusable PostgreSQL test lifecycle helper
- [ ] 2.6 Pin the Docker Compose PostgreSQL major version, add a health check, and make local database startup deterministic
- [ ] 2.7 Add a container-ready production build definition and a database-aware health/readiness endpoint

## 3. Establish Authentication and Request Context

- [ ] 3.1 Generate and commit the Better Auth database schema, create its migration, and make the existing type check pass
- [ ] 3.2 Refactor authentication into a server module that validates required secrets and preserves local password authentication
- [ ] 3.3 Extend server hooks and `App.Locals` with authenticated actor, linked person, and validated organization context
- [ ] 3.4 Add protected-route helpers that return appropriate page redirects and endpoint authentication failures
- [ ] 3.5 Add an explicit authenticated-user-to-person link without deriving employment or authority from Better Auth records

## 4. Create the Organizational Persistence Model

- [ ] 4.1 Define shared UUID, `timestamptz`, audit-column, and half-open effective-period conventions for product schemas
- [ ] 4.2 Add organization, person, employment, team type, and team tables with organization-scoped keys and lifecycle fields
- [ ] 4.3 Add distinct temporal tables for team membership and team leadership assignments
- [ ] 4.4 Add typed temporal reporting relationships for primary and dotted-line management
- [ ] 4.5 Add named hierarchy and temporal hierarchy-placement tables that permit different parents across hierarchies
- [ ] 4.6 Add the append-only audit-event table with actor, correlation, entity, operation, timestamp, and structured change metadata
- [ ] 4.7 Generate and review the initial product migration, adding explicit PostgreSQL SQL where Drizzle cannot express required constraints clearly

## 5. Implement Domain and Authorization Boundaries

- [ ] 5.1 Create feature-oriented server modules for authorization, organizations, people, teams, reporting, hierarchies, and audit
- [ ] 5.2 Define a capability-oriented denial-by-default policy interface and initial organization-member and organization-administrator policies
- [ ] 5.3 Require actor and organization context in organization-scoped repositories and domain services
- [ ] 5.4 Implement transactional membership mutation logic with overlap validation and same-transaction audit recording
- [ ] 5.5 Implement typed reporting mutation logic with primary-manager overlap and primary-reporting cycle validation
- [ ] 5.6 Implement named hierarchy placement mutation logic with one-parent-per-hierarchy and recursive cycle validation
- [ ] 5.7 Add database constraints for effective interval validity, duplicate/overlapping relationships, and append-only audit protection

## 6. Add Seed Data and Database Verification

- [ ] 6.1 Create an idempotent deterministic seed command with development identities and explicit user-to-person linkage
- [ ] 6.2 Seed overlapping memberships, leadership distinct from reporting, primary and dotted-line managers, two differently arranged named hierarchies, and historical records
- [ ] 6.3 Add current and point-in-time repository queries that consistently apply inclusive-start/exclusive-end semantics
- [ ] 6.4 Add PostgreSQL integration tests for duplicate membership, primary-manager uniqueness, reporting cycles, hierarchy cycles, cross-hierarchy independence, and atomic audit writes
- [ ] 6.5 Verify clean database creation using committed migrations and seed data without using `drizzle-kit push`

## 7. Build the Authenticated Application Shell

- [ ] 7.1 Create responsive authenticated layouts with organization context, primary navigation, account state, and sign-out behavior
- [ ] 7.2 Add explicit loading, empty, unauthorized, account-not-linked, and error components and wire them to foundational routes
- [ ] 7.3 Add stable placeholder routes for directory, people, teams, reporting, and administration with server-enforced access boundaries
- [ ] 7.4 Create a server-side read-only named-hierarchy projection that contains only authorized active teams and placements
- [ ] 7.5 Render the persisted hierarchy projection with Svelte Flow and Dagre, including forest roots, fit-to-view, pan, zoom, and stable team links
- [ ] 7.6 Add keyboard, focus, labeling, and non-color relationship cues to the shell and hierarchy proof

## 8. Complete Quality Gates and Documentation

- [ ] 8.1 Add unit tests for temporal helpers, validated environment handling, authorization defaults, and hierarchy projection/layout conversion
- [ ] 8.2 Add Svelte browser tests for shell states, keyboard navigation, and hierarchy rendering
- [ ] 8.3 Replace generated Playwright demos with authenticated shell and seeded hierarchy smoke tests
- [ ] 8.4 Add continuous integration for locked installation, formatting, linting, type checking, unit/browser tests, PostgreSQL migrations/integration tests, production build, and Playwright smoke tests
- [ ] 8.5 Rewrite the README with architecture boundaries, required environment, database lifecycle, auth schema generation, migration/seed workflow, test commands, production startup, and dependency deferral decisions
- [ ] 8.6 Run the complete documented verification suite from a clean database and production build, resolving all failures before marking the scaffold ready
