## Why

The generated SvelteKit project contains most of the preferred platform building blocks, but it is not yet a green, reproducible, domain-ready foundation for the organizational system described in `SPEC.md`. Establishing the application boundaries, database conventions, authentication boundary, visualization approach, and quality gates now will prevent generator examples and incidental framework choices from becoming the product architecture.

## What Changes

- Repair and normalize the generated scaffold so type checking, linting, unit tests, browser tests, builds, database migrations, and local startup are reproducible.
- Replace generator examples and the sample task model with an authenticated application shell and explicit server-side domain module structure.
- Establish PostgreSQL and Drizzle conventions for organizations, people, employments, teams, memberships, reporting relationships, named hierarchies, effective periods, and audit metadata.
- Keep Better Auth responsible for identity and sessions while keeping employment, organization membership, and authorization policy in the product domain.
- Establish the first authorization boundary, including authenticated-route handling, organization scoping, and denial-by-default policy interfaces.
- Add only the immediately justified platform dependencies: a production Node adapter, schema/form validation, date handling, accessible UI primitives/icons, Svelte Flow, a tree layout engine, and database-backed test support.
- Document deferred tools for CSV import/export, background jobs, enterprise identity, observability, and advanced graph layout so they are introduced with the capabilities that require them.
- Add an initial authenticated shell and read-only hierarchy visualization proof that exercise the architecture without attempting to deliver the complete product in `SPEC.md`.

## Capabilities

### New Capabilities

- `development-platform`: Reproducible local development, database lifecycle, deployment target, dependency policy, automated checks, and continuous integration expectations.
- `identity-access-foundation`: Authentication/session integration, organization scoping, and an explicit application authorization boundary that does not infer authority from team relationships.
- `organization-model-foundation`: Initial relational and temporal organizational model, integrity constraints, audit metadata, migrations, and representative seed data.
- `authenticated-application-shell`: Accessible authenticated navigation and a read-only organizational hierarchy proof using the selected Svelte visualization stack.

### Modified Capabilities

None. No existing OpenSpec capability specifications are present.

## Impact

- Affects the generated SvelteKit routes, server hooks, database schema, authentication configuration, scripts, tests, development containers, and deployment adapter.
- Adds a small set of direct runtime and development dependencies while removing generated demo code and the sample task table.
- Creates the first persistent product schema and migrations; resetting the current local generator database is acceptable because it contains no product data.
- Establishes conventions that subsequent directory, profile, hierarchy administration, reporting, history, bulk import/export, and audit capabilities will build upon.
