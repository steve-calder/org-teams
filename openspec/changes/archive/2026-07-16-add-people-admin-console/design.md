## Context

Org Teams currently resolves Better Auth `user`, `session`, and product-owned `person` into server request locals. Every authentication user is idempotently linked to one Person, but Person's nullable foreign key already allows a durable Person to exist without login. Person currently has no editable profile fields, Better Auth has no admin plugin or role fields enabled, and the application has no administrative authorization boundary.

The console must feel like one place to manage a human while preserving two ownership boundaries: Org Teams owns Person data, and Better Auth owns users, credential accounts, roles, bans, and sessions. This change also introduces privileged mutations, destructive lifecycle actions, and audit obligations.

## Goals / Non-Goals

**Goals:**

- Make Person the primary administrative resource, including people who never have login access.
- Provide one detail experience that composes Person, Authentication, Sessions, and recent Activity without merging their persistence models.
- Use Better Auth's supported admin role and APIs for authentication authorization and mutation.
- Give the development account administrator access only in development mode.
- Make sensitive and destructive actions server-authorized, auditable, and resistant to accidental administrator lockout.

**Non-Goals:**

- Add team, manager, organization, reporting-line, demographic, or comprehensive HRIS models.
- Add invitations or outbound email; the initial password is communicated outside this application.
- Enable OAuth provider linking, impersonation, self-service administration, bulk import/export, or the hosted Better Auth dashboard.
- Expose credential hashes, provider tokens, session tokens, or generic editing of Better Auth tables.
- Hard-delete Person records; inactive lifecycle status is the initial product-level removal mechanism.

## Decisions

### Better Auth role is the persisted admin flag

Enable Better Auth's admin plugin and generated schema. The plugin's `admin` role is the single persisted authorization source. A shared server helper derives an `isAdmin` boolean for request locals and page data and performs route guards; the header consumes only that boolean. Authentication admin APIs provide a second authorization check for auth mutations.

This satisfies the product concept of an admin flag without introducing a parallel boolean that can disagree with Better Auth's own permission system. The UI may present administrator access as a checkbox, but it maps to the supported role.

Alternative considered: add `user.isAdmin` as an unrelated custom field. That would require custom authorization around every Better Auth admin operation and create two possible sources of truth.

### Development administrator bootstrap is isolated and environment-gated

Development provisioning creates the default account with the admin role when absent and repairs the role idempotently when the development account already exists. The existing no-session invariant remains. Any narrowly required direct schema initialization is isolated inside the development-only bootstrap because no administrator session exists yet; ordinary runtime admin changes always use Better Auth admin APIs. Production neither provisions nor elevates the development identity.

Alternative considered: configure a permanent admin user ID. The development user's generated ID is not stable across databases and an environment-specific ID would be awkward for first-run setup.

### Person owns product-facing profile data

Add `displayName` (required), `legalName` (nullable), `employeeIdentifier` (nullable and unique), `jobTitle` (nullable), and `status` (`active` or `inactive`, default `active`) to Person. Existing linked people are backfilled from `user.name`; authentication provisioning initializes Person display name from the Better Auth user name. Person `displayName` is authoritative after linkage, and Person updates synchronize `user.name` through Better Auth.

Team and manager fields are deferred because storing free-text substitutes would conflict with future relational models.

Alternative considered: keep names only on `user`. That fails for people without login and makes the authentication provider the owner of organizational identity.

### Admin pages are Person-centered and server-rendered

Use an `/admin` server layout guard and these routes:

- `/admin/people` for search, filters, pagination, and person-only creation
- `/admin/people/[personId]` for overview and recent audit activity
- `/admin/people/[personId]/details` for Person profile edits
- `/admin/people/[personId]/authentication` for login and administrator lifecycle
- `/admin/people/[personId]/sessions` for allowlisted session metadata and revocation

The directory repository may join Person to allowlisted user fields for efficient reads: ID, name, email, verified state, role/admin flag, ban state, and timestamps. It never selects credential or token fields. All mutations use SvelteKit server actions; no browser-side admin API client is required.

Alternative considered: separate top-level User and Person consoles. That mirrors tables rather than administrator intent, duplicates navigation, and makes person-only records harder to understand.

### Authentication mutations are orchestrated but remain Better Auth-owned

An admin authentication service wraps Better Auth admin APIs for create user, update email/name, set password, set role, ban/unban, list/revoke sessions, and remove user. The service also applies self-protection, final-admin checks, Person linkage, and audit logging. Route code never updates `user`, `account`, or `session` directly except the isolated development bootstrap described above.

Adding login is always initiated from an existing Person. Better Auth creates the user and credential account; the service then transactionally replaces the automatically generated empty Person link with the selected unlinked Person. The generated Person is locked, verified to contain no independent profile/audit state, unlinked, and deleted in the same transaction that links the selected Person. If linkage fails, the service compensates by removing the newly created Better Auth user and generated Person and reports failure rather than success.

Alternative considered: bypass Better Auth and insert user/account rows in the Person transaction. That risks incorrect password handling and violates provider ownership.

### Login state and Person lifecycle are separate

- Ban/unban controls whether the linked user can authenticate and revokes sessions when banned.
- Remove login deletes the Better Auth user through its API; existing cascade and `ON DELETE SET NULL` behavior retain the Person.
- Active/inactive controls product lifecycle only and does not silently change authentication.
- Administrator access is a privilege on the linked Better Auth user, not a Person attribute.

The UI names these actions explicitly rather than offering an ambiguous Delete User operation.

### Safety checks are centralized

The admin authentication service rejects self-ban, self-removal, and self-demotion. Role removal and login removal acquire a shared PostgreSQL advisory transaction lock, recheck the count of users carrying the admin role, and reject any operation that could remove the final administrator. Confirmation values are validated by server actions, independent of UI dialogs.

Alternative considered: UI-only confirmations and disabled buttons. Client state is not an authorization or integrity boundary.

### Audit records are product-owned and sanitized

Add an `admin_audit_event` table with UUID ID, actor authentication-user ID, nullable target Person ID, nullable target authentication-user ID, action identifier, sanitized JSON metadata, and timezone-aware timestamp. Person mutations and their audit insert share a database transaction. Authentication operations write the audit event immediately after the Better Auth API succeeds and surface audit failures rather than presenting an unaudited action as fully successful.

Metadata contains changed field names and non-secret state transitions, never passwords, credential hashes, provider tokens, session tokens, cookies, or raw request headers.

## Risks / Trade-offs

- **[Better Auth creation and Person relinking are not one database transaction]** → Use a dedicated compensating workflow, lock and verify both Person records, remove the created auth identity on failure, and add recovery/integrity tests.
- **[Role strings can be parsed inconsistently]** → Centralize permission checks and the derived `isAdmin` flag in one server-only helper built around the admin plugin's role semantics.
- **[Display names can drift between Person and user]** → Make Person authoritative, synchronize through the auth API, and surface synchronization failures instead of silently accepting partial success.
- **[Concurrent admin removal could lock out the application]** → Serialize privilege-reducing operations with an advisory lock and recheck the final-admin invariant on the server.
- **[Audit insertion can fail after an auth mutation succeeds]** → Treat the action as an operational error, log it server-side, make retries idempotent where possible, and never claim a successful audited outcome without the event.
- **[The admin directory may become expensive]** → Use indexed Person fields, bounded pagination, explicit search fields, and allowlisted joins rather than loading accounts or sessions per row.

## Migration Plan

1. Enable the Better Auth admin plugin, regenerate its schema, and add the generated role/ban/session fields.
2. Add nullable Person profile columns, backfill display name from linked users, enforce display-name and employee-identifier constraints, and add the audit table and indexes in one reviewed migration.
3. Update provisioning and session typing, then idempotently grant the development account the admin role in development only.
4. Add centralized admin guards, Person/admin repositories and services, and focused transactional/security tests.
5. Add the header Admin link and admin routes progressively: directory, details, authentication, sessions, and activity.
6. Run migration verification, type checks, server/database tests, production build, and admin Playwright flows including production gating.

Rollback removes the admin routes and plugin configuration first. Schema rollback must preserve Person profile and audit data or explicitly export it before dropping new columns/tables; existing authentication fields should not be removed while any deployed code depends on admin roles or bans.

## Open Questions

None. Invitation delivery, team/manager modeling, and Person hard deletion are explicit future changes.
