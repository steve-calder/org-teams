## Context

Production intentionally has no public registration and does not provision the predictable development administrator. A clean migrated database therefore contains the Better Auth and Person schema but no identity that can enter the administrator console. The existing development bootstrap already demonstrates the required domain sequence—create through Better Auth, let the authentication hook create a Person, then grant the Better Auth `admin` role—but it is request-triggered, uses fixed credentials, and is correctly disabled outside development.

The production solution crosses deployment tooling, Better Auth, the product-owned Person boundary, administrator authorization, PostgreSQL concurrency, audit handling, and operator documentation. It must be usable before any administrator session exists and must not weaken the normal authenticated administration path.

## Goals / Non-Goals

**Goals:**

- Provide an explicit post-migration command that establishes the first production administrator.
- Preserve Better Auth ownership of credential creation and hashing and the existing one-to-one Person provisioning behavior.
- Make an identical rerun safe and repair a narrowly defined partial bootstrap state.
- Prevent concurrent commands or stale bootstrap configuration from silently adding administrators after initialization.
- Keep the initial password out of source control, process arguments, logs, audit metadata, page data, and sessions.
- Give operators a documented first-deployment sequence with clear success and failure outcomes.

**Non-Goals:**

- Add public registration, an HTTP setup endpoint, or a first-visitor ownership flow.
- Run production bootstrap from a request hook or automatically on every application process start.
- Provide a general-purpose administrator creation, promotion, or break-glass recovery command.
- Reset the configured user's password on a rerun.
- Change normal administrator-console authorization or final-administrator protections.

## Decisions

### Use an explicit release command after migrations

Add an `admin:bootstrap` package command intended for the same release or migration environment that runs `db:migrate`. The command reads deployment configuration, performs one bootstrap attempt, reports a sanitized result, and terminates. The web application never invokes it.

This keeps privileged setup observable and controlled by the deployer, avoids replica startup races, and permits removal of bootstrap credentials immediately afterward. A database migration is rejected because migrations must not contain deployer credentials or duplicate Better Auth's credential logic. An HTTP setup page is rejected because it creates a remotely reachable ownership-claim surface.

### Share an environment-independent authentication core with the command

Extract the Better Auth configuration needed for credential creation, the admin plugin, and Person provisioning into a server-only factory that accepts explicit database and configuration dependencies. The SvelteKit singleton adds its request cookie integration; the bootstrap command creates a command-scoped database client and uses the same core without cookie handling. A direct TypeScript runner is declared for release tooling so the command does not depend accidentally on a transitive executable.

This avoids copying password behavior or writing credential rows directly. A standalone duplicate auth configuration was considered but rejected because authentication hooks and policy could drift. Importing SvelteKit virtual environment modules directly into a generic Node command was rejected because those modules belong to the application runtime.

### Accept secrets only through command-scoped environment input

The command requires `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD`, in addition to the application's database and Better Auth configuration. The package runner loads `.env` when present, while values already injected into the process environment retain precedence. It normalizes the email, validates all values before mutation, and applies the same password policy used by account provisioning. Bootstrap values are not accepted as positional command arguments and the password is never echoed. Deployment documentation directs operators to use an uncommitted `.env` file or inject these values from a secret manager and remove the three bootstrap values after success.

Environment-based secret injection matches common release-job platforms and keeps the password out of shell history and process arguments. An interactive-only prompt was rejected because it prevents noninteractive deployment jobs; committed seed values were rejected as unsafe.

### Serialize bootstrap and use a restrictive state machine

The command acquires a dedicated PostgreSQL advisory lock before evaluating administrator state and retains serialization through the role grant and audit write. It then follows this state model:

| Existing state                                                                       | Result                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| No administrator and configured email absent                                         | Create the Better Auth user and linked Person, then grant `admin` |
| No administrator and configured email exists without `admin`                         | Verify or repair its Person link, then grant `admin`              |
| Configured email already has `admin` and one linked Person                           | Return idempotent success without changing credentials            |
| Any other administrator exists while the configured identity is not already an admin | Refuse without creating or elevating a user                       |
| Conflicting or invalid identity state                                                | Refuse with a sanitized diagnostic                                |

User creation uses Better Auth with automatic sign-in disabled. The initial role grant is the only narrowly scoped direct role write because Better Auth's ordinary role API requires an administrator session that cannot yet exist. This mirrors the isolated development bootstrap exception; all later role changes continue through the authenticated admin API.

If user creation commits but a later step fails, the next identical run may finish Person verification and role assignment while there are still no administrators. The command never replaces the password of an existing account. A permissive “always ensure this email is admin” model was rejected because leaving bootstrap configuration installed could then grant privilege unexpectedly.

### Record bootstrap as a system-attributed administrative event

After the target user and Person exist, successful first-time role assignment records `authentication.admin-bootstrapped` with a reserved system actor identifier, the target Person and authentication user, and sanitized metadata. The event contains no password or secret values. Idempotent verification does not create a duplicate mutation event.

This preserves an audit trail without falsely claiming that an authenticated administrator performed the initial action. Using the newly created user as the actor was rejected because that account had no session and did not initiate the deployment command.

### Create no session and verify persisted invariants

Bootstrap uses the existing `autoSignIn: false` behavior and does not accept or emit HTTP headers or cookies. Before reporting success it verifies that the normalized email identifies one Better Auth user with the `admin` role, exactly one linked Person, and no session created by the command. Output identifies success or a sanitized refusal but never includes the password.

## Risks / Trade-offs

- [A deployment environment retains bootstrap secrets] → Document immediate secret removal and make application startup independent of all bootstrap variables.
- [A crash occurs between Better Auth user creation and role assignment] → Permit repair only for the configured identity while no administrator exists; verify the Person link idempotently.
- [Two release jobs race] → Serialize all cooperating bootstrap commands with a PostgreSQL advisory lock and rely on unique email and Person-link constraints as additional protection.
- [Direct role initialization bypasses the normal Better Auth admin API] → Isolate the write inside the zero-admin bootstrap state, test it explicitly, and keep all post-bootstrap role mutations on the supported API.
- [A preexisting non-admin owns the configured email] → Treat the deployment secret and explicit configured email as operator authorization only while zero admins exist; never change that account's password, and document this repair/promotion behavior.
- [Release tooling is omitted from a minimal runtime image] → Document that migration/bootstrap runs from a release image containing the declared command runner and application source, while the serving image need not contain it.

## Migration Plan

1. Add the environment-independent authentication factory and retain existing SvelteKit, development-account, login, and Person behavior through tests.
2. Add the bootstrap service, command entry point, declared command runner, package script, and focused database/security tests.
3. Document required application secrets, temporary bootstrap secrets, and the sequence `db:migrate` → `admin:bootstrap` → application start.
4. On a fresh deployment, inject the initial administrator values, run migrations, run bootstrap once, remove the bootstrap values, then verify interactive login and administrator access.

Rollback removes the command and shared-factory refactor after restoring the prior application auth wiring. It does not delete an administrator already provisioned; that account remains an ordinary Better Auth administrator and linked Person. No schema rollback is required unless implementation discovers a separately reviewed schema need.

## Open Questions

None. Platform-specific release-job syntax can be documented later without changing the command contract.
