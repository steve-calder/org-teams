## 1. Share Authentication Infrastructure

- [x] 1.1 Extract environment-independent database and Better Auth construction that accepts explicit configuration while preserving the SvelteKit singleton, cookie plugin ordering, admin plugin, automatic-sign-in setting, and Person creation hook
- [x] 1.2 Make Person provisioning reusable with a command-scoped database dependency and retain its existing idempotency and one-to-one behavior
- [x] 1.3 Add focused regression tests proving login, development-admin provisioning, session resolution, and production development-account gating remain unchanged after the refactor

## 2. Implement Bootstrap State and Security

- [x] 2.1 Implement bootstrap configuration parsing for required name, normalized email, and password environment values with pre-mutation validation and secret-safe errors
- [x] 2.2 Implement the PostgreSQL advisory-lock boundary and administrator-state evaluation for absent, partial, already initialized, conflicting, and different-administrator states
- [x] 2.3 Create an absent configured identity through Better Auth, verify or repair exactly one linked Person, and perform the isolated first-admin role grant without creating a session or replacing an existing password
- [x] 2.4 Persist one sanitized `authentication.admin-bootstrapped` event with a reserved system actor on first role assignment and suppress duplicate audit mutations on idempotent verification
- [x] 2.5 Verify the persisted user role, Person linkage, and no-session invariant before returning a typed sanitized success or refusal result

## 3. Add the Deployment Command

- [x] 3.1 Add a non-HTTP TypeScript command entry point that creates and closes command-scoped resources, maps sanitized results to clear output and exit codes, and never prints secret values
- [x] 3.2 Declare the TypeScript command runner directly and add the `admin:bootstrap` package script without wiring bootstrap into application startup or request handling
- [x] 3.3 Add documented example placeholders for bootstrap environment names without committing usable credentials

## 4. Verify Bootstrap Behavior

- [x] 4.1 Add database tests for fresh creation, ordinary credential login, administrator authorization, linked Person creation, no bootstrap session, and sanitized audit attribution
- [x] 4.2 Add idempotency and partial-state tests covering repeat execution, Person-link repair, role repair, unchanged existing passwords, and exactly one mutation event
- [x] 4.3 Add refusal and validation tests covering missing or invalid configuration, unmigrated schema diagnostics, conflicting identity data, and a different existing administrator with no database mutation
- [x] 4.4 Add concurrent same-identity and different-identity tests proving one administrator outcome and preservation of unique user and Person invariants
- [x] 4.5 Add output and runtime-isolation tests proving password values never appear and web startup or requests never consume bootstrap configuration

## 5. Document and Validate Deployment

- [x] 5.1 Document the production sequence for application secrets, migrations, command-scoped bootstrap secret injection, bootstrap execution, secret removal, login verification, reruns, refusals, and release-image tooling requirements
- [x] 5.2 Run formatting, lint, Svelte type checks, focused and full unit/database tests, production build, authentication/admin browser tests, and OpenSpec validation
- [x] 5.3 Exercise the documented workflow against a clean migrated database and verify a second identical run is harmless without retaining bootstrap secrets
