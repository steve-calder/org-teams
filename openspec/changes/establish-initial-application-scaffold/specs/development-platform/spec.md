## ADDED Requirements

### Requirement: Reproducible application verification
The project SHALL provide documented, non-interactive commands for formatting verification, linting, type checking, unit tests, database integration tests, end-to-end tests, and production builds. Repository tooling SHALL exclude generated or externally managed files that are not owned by the application.

#### Scenario: Clean checkout passes verification
- **WHEN** a developer installs the locked dependencies and runs the documented verification commands with required services available
- **THEN** every command completes successfully without modifying tracked files or installing browsers as a test side effect

#### Scenario: Application type error is detected
- **WHEN** application TypeScript or Svelte code contains a type error
- **THEN** the type-check command exits unsuccessfully and identifies the affected application file

### Requirement: Reproducible PostgreSQL development environment
The project SHALL provide a version-pinned local PostgreSQL service, health check, documented environment variables, migration commands, and deterministic seed/reset guidance. Schema evolution SHALL be represented by committed migrations rather than production use of schema push.

#### Scenario: New developer initializes the database
- **WHEN** a developer starts the documented database service and runs migrations and seed commands
- **THEN** the database reaches the expected schema version and contains the representative development organization

#### Scenario: Database is unavailable
- **WHEN** a database-dependent command runs while PostgreSQL is unavailable
- **THEN** the command fails with an actionable connection error rather than silently using an alternate store

### Requirement: Declared production runtime
The application SHALL produce a deployable Node server build using the SvelteKit Node adapter and SHALL document its supported Node version, required environment, health endpoint, and startup command.

#### Scenario: Production build starts
- **WHEN** the built application starts with valid production environment variables and a reachable migrated database
- **THEN** its health endpoint reports readiness and the application serves requests through the Node server

#### Scenario: Required secret is missing
- **WHEN** the production process starts without a required authentication or database setting
- **THEN** startup fails before accepting application traffic and identifies the missing setting without revealing secret values

### Requirement: Continuous integration baseline
The repository SHALL run formatting, linting, type checking, tests, migration verification, and a production build in continuous integration using locked dependency installation.

#### Scenario: Proposed change violates a quality gate
- **WHEN** a change fails any required verification command
- **THEN** continuous integration reports a failed check and prevents the baseline from being considered green

### Requirement: Dependency introduction policy
Direct dependencies SHALL have an identified current requirement, ownership location, and verification path. Tools for future capabilities SHALL remain documented but uninstalled until a change requires them.

#### Scenario: Future-only queue is considered
- **WHEN** no scheduled or long-running application work exists
- **THEN** a background queue dependency is not added to the runtime dependency set

