## ADDED Requirements

### Requirement: Explicit deployment bootstrap command

The system SHALL provide a non-HTTP deployment command that initializes the first administrator only when explicitly invoked after database migrations. The application SHALL NOT invoke production administrator bootstrap from request handling or normal application startup.

#### Scenario: Operator initializes a fresh deployment

- **WHEN** an operator runs the bootstrap command against a migrated database with valid bootstrap configuration and no administrator
- **THEN** the command initializes the configured first administrator and terminates successfully

#### Scenario: Production application starts normally

- **WHEN** the production web application starts or handles a request without the bootstrap command being invoked
- **THEN** it does not create or elevate an administrator regardless of whether bootstrap environment values remain present

#### Scenario: Database schema is not ready

- **WHEN** the operator runs the bootstrap command before required migrations are present
- **THEN** the command fails with a sanitized migration prerequisite diagnostic and does not report initialization success

### Requirement: Secure bootstrap configuration

The bootstrap command SHALL require a display name, normalized valid email, and password through command-scoped environment configuration, SHALL apply the authentication system's password policy before mutation, and SHALL NOT accept the password as a positional command argument. The system MUST NOT expose the bootstrap password in source-controlled values, command output, logs, audit metadata, sessions, or application page data.

#### Scenario: Required bootstrap configuration is invalid

- **WHEN** a required bootstrap value is absent or the email or password violates validation policy
- **THEN** the command fails before creating or changing an authentication user

#### Scenario: Bootstrap reports its result

- **WHEN** bootstrap succeeds, refuses initialization, or encounters an error
- **THEN** its output contains enough sanitized context for the operator to act and contains no submitted password

#### Scenario: Bootstrap values are stored in a local environment file

- **WHEN** the operator invokes the package bootstrap command with bootstrap values in an existing `.env` file
- **THEN** the command loads those values, while any values already supplied in the process environment take precedence

### Requirement: Initial administrator identity

Successful first-time bootstrap SHALL create the credential through Better Auth, grant the Better Auth `admin` role, ensure exactly one linked product-owned Person, and establish no authenticated session. The resulting credentials SHALL authenticate through the ordinary login flow and authorize the administrator console.

#### Scenario: Configured identity does not exist

- **WHEN** bootstrap runs with no existing administrator and no authentication user matching the configured email
- **THEN** it creates one Better Auth credential user, one linked Person using the configured display name, and the administrator role without creating a session

#### Scenario: Bootstrapped administrator logs in

- **WHEN** the initialized administrator later submits the configured credentials through `/login`
- **THEN** the ordinary authentication flow establishes a session and permits administrator navigation and routes

### Requirement: Idempotent verification and partial-state repair

Bootstrap SHALL be idempotent for an already initialized configured administrator and SHALL repair only the configured identity when no administrator exists. Repair SHALL ensure its single Person link and administrator role without creating a duplicate user or Person and without replacing an existing password.

#### Scenario: Configured administrator is already initialized

- **WHEN** bootstrap is rerun for an identity that already has the administrator role and exactly one linked Person
- **THEN** it returns success without duplicating records, changing the password, creating a session, or recording another bootstrap mutation

#### Scenario: Prior attempt stopped before role assignment

- **WHEN** no administrator exists but the configured authentication user remains from a partial bootstrap attempt
- **THEN** bootstrap verifies or repairs the single linked Person and grants that user administrator authorization without replacing its credential

#### Scenario: Configured identity has conflicting data

- **WHEN** the configured identity cannot be reconciled with one authentication user and one linked Person
- **THEN** bootstrap refuses to grant administrator access and reports a sanitized integrity diagnostic

### Requirement: Initialized-installation refusal

Bootstrap SHALL NOT create or promote the configured identity when a different administrator already exists. It SHALL leave all users, roles, credentials, People, and sessions unchanged in that state.

#### Scenario: Another administrator already owns the installation

- **WHEN** bootstrap runs for a non-admin or absent configured identity while any different administrator exists
- **THEN** it refuses initialization without creating a user, changing a role or password, or creating a session

### Requirement: Concurrent bootstrap safety

The system SHALL serialize bootstrap state evaluation and administrator assignment with a database-backed lock and SHALL preserve unique authentication-email and Person-link invariants under concurrent execution.

#### Scenario: Two matching bootstrap commands run concurrently

- **WHEN** two commands attempt to initialize the same fresh database at the same time
- **THEN** both resolve safely to one configured administrator and one linked Person, with no duplicate credential or session

#### Scenario: Concurrent commands use different identities

- **WHEN** concurrent commands target different identities on a database that initially has no administrator
- **THEN** at most one identity becomes administrator and the other command refuses without creating or promoting its identity after initialization

### Requirement: Bootstrap audit and operational guidance

A successful first-time administrator assignment SHALL record one sanitized, system-attributed bootstrap audit event identifying the target Person and authentication user. The project SHALL document migration ordering, bootstrap configuration, invocation, expected outcomes, login verification, and removal of bootstrap secrets after success.

#### Scenario: First administrator assignment succeeds

- **WHEN** bootstrap grants the first administrator role
- **THEN** one system-attributed bootstrap event is persisted without any password or deployment secret metadata

#### Scenario: Operator completes initialization

- **WHEN** the bootstrap command reports successful initialization
- **THEN** deployment guidance directs the operator to remove bootstrap-specific secrets and verify ordinary administrator login
