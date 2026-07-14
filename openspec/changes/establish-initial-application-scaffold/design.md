## Context

The repository is a newly generated full-stack SvelteKit application. It already includes Svelte 5, SvelteKit 2, TypeScript, Tailwind CSS 4, PostgreSQL through `postgres.js`, Drizzle ORM and Drizzle Kit, Better Auth, ESLint, Prettier, Vitest browser/server projects, and Playwright. Docker Compose supplies an unpinned PostgreSQL service.

The current scaffold is not implementation-ready. `auth.schema.ts` is an empty placeholder, which makes `npm run check` fail; the database contains only a generated `task` example; demo routes remain; `adapter-auto` does not identify a production runtime; lint includes repository-owned Codex skill files; Playwright installs a browser on every test run; and no application domain, authorization policy, migration, seed, or CI conventions exist.

The product model is more demanding than a typical directory CRUD application. Membership, reporting, leadership, and hierarchy placement are independent relationships; multiple named hierarchies must remain acyclic; relationships have effective periods; sensitive access cannot be inferred from chart position; and administrative mutations must be auditable.

## Goals / Non-Goals

**Goals:**

- Produce a green, reproducible SvelteKit foundation that can be deployed as a Node application.
- Establish clear separation between routes, domain services, persistence, authorization, and presentation.
- Create the minimum product data model needed to exercise organizational relationships and temporal conventions.
- Preserve Better Auth as the identity/session implementation without allowing it to become the organizational authorization model.
- Prove the selected visualization stack with one read-only named hierarchy.
- Define which dependencies are required now and which are deliberately deferred.

**Non-Goals:**

- Deliver the complete employee directory, administrative workflows, bulk onboarding, historical explorer, or reporting views from `SPEC.md`.
- Implement enterprise SSO, SCIM provisioning, scheduled jobs, or production observability.
- Implement unrestricted graph modeling, GraphQL, a graph database, microservices, or event sourcing.
- Finalize the policy defaults for dotted-line managers, team leaders, contractors, or employee-visible history.
- Implement full bitemporal truth; this foundation records effective time plus mutation audit history.

## Decisions

### Use SvelteKit as a full-stack modular monolith

The UI and backend remain in one SvelteKit application. Pages use server load functions for reads, form actions for UI mutations, and `+server.ts` handlers for non-page consumers such as health checks, webhooks, streaming downloads, and future integration APIs. Route handlers remain thin and delegate to modules under `src/lib/server/<domain>`.

This is preferred over adding NestJS because the initial product has one web client, one team, and transactional domain behavior that benefits from one process and one database. Domain modules will avoid importing SvelteKit request types so a worker or separate API can reuse them later.

### Target a conventional Node runtime

Replace `@sveltejs/adapter-auto` with `@sveltejs/adapter-node`, declare the supported Node version, and produce a container-ready build. A conventional Node runtime supports PostgreSQL connections, streaming import/export, and eventual background-worker code without edge-runtime restrictions.

Alternative: retain `adapter-auto`. Rejected because it leaves deployment behavior implicit and can select runtimes that do not match long-lived database connections or future import/export workloads.

### Keep PostgreSQL as the system of record and Drizzle as a thin typed layer

Drizzle defines ordinary tables, relations, and migrations. Explicit SQL migrations are permitted and required when PostgreSQL features such as range/exclusion constraints, recursive checks, partial indexes, or row security are not expressed clearly by Drizzle.

Product identifiers use UUIDs, timestamps use `timestamptz`, and effective intervals use half-open semantics: `valid_from` is inclusive and nullable `valid_to` is exclusive. The first model includes organizations, people, employments, team types, teams, memberships, team leadership assignments, reporting relationships, named hierarchies, hierarchy placements, and audit events. Better Auth tables remain in the same database but outside the product-domain module.

PostgreSQL recursive queries support hierarchy traversal and cycle detection, so a graph database is unnecessary. Full-text/trigram search, closure tables, and materialized hierarchy projections are deferred until measured requirements justify them.

### Model identity, employment, relationships, and authority independently

Better Auth owns credentials, external identities, sessions, and authentication cookies. A nullable, explicit link connects an authenticated user to a product person; employment connects that person to an organization. Neither a Better Auth user nor a team membership automatically grants product permissions.

Server hooks resolve the session and selected organization context. Domain services receive an actor/context object and call a centralized policy interface. Policies deny access when a rule is absent. Initial roles are sufficient to distinguish organization administrators and ordinary authenticated members, but policy vocabulary is capability-oriented so manager- and team-specific rules can be added without scattering role checks through routes.

PostgreSQL row-level security is deferred as a defense-in-depth option. Application policy is the primary control until connection/session scoping and operational implications are designed explicitly.

### Enforce temporal and structural integrity at transaction boundaries

Mutating services validate effective-period overlap, duplicate active membership, active primary-manager uniqueness, hierarchy cycles, and primary-reporting cycles in the same transaction as the write. Database unique, check, partial, or exclusion constraints enforce invariants that can be expressed reliably in PostgreSQL. Tests use a real PostgreSQL instance to cover behavior that an in-memory substitute cannot reproduce.

Every administrative mutation supplies actor, timestamp, correlation identifier, operation, affected entity, and structured before/after or change metadata to an append-only audit record. Audit records are not the source of current state and are not a full event-sourcing implementation.

### Add a small, immediate dependency set

Add now:

- `@sveltejs/adapter-node` for the declared production runtime.
- `zod` and `sveltekit-superforms` for shared input validation and progressively enhanced administrative forms.
- `date-fns` for explicit effective-date parsing, comparison, and presentation.
- `bits-ui` and `lucide-svelte` for accessible unstyled primitives and a consistent icon set.
- `@xyflow/svelte` and `@dagrejs/dagre` for interactive hierarchy rendering and tree layout.
- `testcontainers` or `@testcontainers/postgresql` for database-backed integration tests when Docker is available.

Do not add yet:

- `elkjs` until cross-edges or variable layouts exceed Dagre's capabilities.
- CSV parsing/export packages until bulk onboarding/export behavior is specified.
- `pg-boss` or another queue until scheduled or long-running work exists.
- OpenTelemetry packages until deployment and telemetry backends are chosen.
- An enterprise identity SDK until the first OIDC/SAML provider is selected.
- A client server-state library by default; SvelteKit load/action invalidation covers the initial shell.

### Establish a feature-oriented application structure

Server code is grouped by product concept rather than technical layer alone:

```text
src/lib/server/
  auth/
  authorization/
  organizations/
  people/
  teams/
  reporting/
  hierarchies/
  audit/
  db/
```

Each domain module may contain its schema/repository/service/policy files. Routes compose modules but do not directly perform multi-table writes. Shared browser-safe components and value types remain outside `$lib/server`.

### Use representative seed data as an architectural fixture

A deterministic development seed creates one organization, several people and teams, at least two named hierarchies, overlapping memberships, primary and dotted-line reporting, and historical/effective relationships. It is used for manual development and integration tests, and it demonstrates that the schema represents the matrix cases from `SPEC.md` rather than only a single tree.

## Risks / Trade-offs

- [Svelte ecosystem packages have fewer examples than React equivalents] -> Pin direct dependencies, keep layout data independent of UI components, and prove Svelte Flow in this change.
- [A modular monolith can decay into route-centric code] -> Enforce thin routes, server-only domain modules, policy calls, and service-level tests in review and lint conventions.
- [Drizzle cannot express every PostgreSQL invariant] -> Allow reviewed SQL migrations and test them against real PostgreSQL instead of weakening the model.
- [Temporal constraints can make corrections difficult] -> Use half-open intervals, transactions, explicit correction services, and append-only audit metadata; defer bitemporal behavior until its product semantics are settled.
- [Better Auth's organization concepts could be confused with product organizations] -> Do not enable or reuse an auth organization model for employment/team authorization; maintain an explicit identity link.
- [Database-backed tests are slower and require Docker] -> Keep pure unit tests separate and run integration suites in CI and via an explicit local command.
- [Adding a UI primitive library can create design lock-in] -> Use unstyled accessible primitives behind local application components rather than importing them throughout pages.

## Migration Plan

1. Record the current verification failures and normalize ignored/generated files and scripts.
2. Add the immediate dependencies and switch to the Node adapter.
3. Generate the Better Auth schema, replace the sample task model, and create the initial reviewed migration.
4. Introduce domain modules, actor/organization context, policy interfaces, and transactional integrity helpers.
5. Add deterministic seed data and database-backed integration tests.
6. Replace demo routes with the authenticated shell and hierarchy proof.
7. Add CI gates for formatting, linting, type checks, unit/integration tests, production build, and Playwright smoke tests.

The current database contains generator-only data, so rollback is to revert the change and recreate the local database volume. No production data migration or compatibility bridge is required.

## Open Questions

- Which OIDC/SAML provider will be the first production identity integration?
- Must historical corrections preserve both effective truth and the exact previously recorded belief, requiring bitemporal storage?
- What organization size should the first hierarchy performance budget target?
- Which employee fields are considered private in the first directory release?
- Will deployment use the repository's container image directly or a specific managed Node platform?

