## 1. Authentication and Domain Schema

- [x] 1.1 Enable the Better Auth admin plugin, regenerate the Drizzle auth schema, and review the generated role, ban, and impersonated-session fields without enabling unused admin UI features
- [x] 1.2 Expand Person with display name, legal name, unique employee identifier, job title, and active/inactive status, and add the sanitized `admin_audit_event` schema and indexes
- [x] 1.3 Generate one committed migration that backfills existing Person display names from linked users before enforcing required constraints and applies cleanly to the Compose PostgreSQL service
- [x] 1.4 Add migration/schema tests for Person defaults and uniqueness, nullable authentication links, profile backfill, audit relations, and Better Auth admin fields

## 2. Administrator Identity and Development Bootstrap

- [x] 2.1 Add a server-only authorization helper that derives `isAdmin` from Better Auth's admin role, requires anonymous/authenticated/admin states appropriately, and exposes no additional auth data
- [x] 2.2 Extend request locals and root layout data with the derived administrator flag while preserving the existing authenticated flag and server trust boundary
- [x] 2.3 Make development-account provisioning idempotently grant the admin role without creating a visitor session, and preserve production's prohibition on provisioning or elevating that account
- [x] 2.4 Add focused tests for role derivation, anonymous and non-admin rejection, administrator acceptance, repeated development bootstrap, anonymous-session safety, and production gating

## 3. Person Administration Services

- [x] 3.1 Implement allowlisted Person directory queries with bounded pagination, display-name/employee-ID/login-email search, login/admin/status filters, and integrity-warning detection for auth users without Person
- [x] 3.2 Implement validated Person-only creation and profile editing with display-name synchronization to a linked Better Auth user and unique employee-identifier handling
- [x] 3.3 Implement the admin audit repository with transactional Person audit writes and sanitized allowlisted metadata
- [x] 3.4 Add database/service tests for mixed linked/unlinked directory results, search and filters, person-only creation, profile updates, name synchronization, duplicate employee identifiers, and audit contents without secrets

## 4. Authentication Administration Services

- [x] 4.1 Implement a server-only Better Auth admin service for adding login to an existing Person, including generated-Person relinking, transaction locks, and compensating cleanup on failure
- [x] 4.2 Add wrappers for email/name updates, replacement password, admin role changes, ban/unban, session listing/revocation, and login removal while retaining Person
- [x] 4.3 Centralize confirmation, self-ban/self-demotion/self-removal protection, serialized final-admin protection, and audit recording around privileged mutations
- [x] 4.4 Add focused tests for successful login attachment with no duplicate Person, compensation and retry behavior, login removal retention, ban/session effects, password secrecy, self-protection, concurrent final-admin protection, and auth audit sanitization

## 5. Admin Navigation and Route Guard

- [x] 5.1 Add an Admin header link to `/admin/people` only when root layout data identifies an authenticated administrator, with responsive and keyboard-accessible treatment
- [x] 5.2 Add an `/admin` server layout guard that redirects anonymous visitors to login and rejects authenticated non-administrators before child data loads or actions execute
- [x] 5.3 Add route/layout tests proving navigation visibility is role-aware but every admin server entry point independently enforces authorization

## 6. People Directory and Detail UI

- [x] 6.1 Build `/admin/people` server load/actions and accessible responsive UI for search, pagination, filters, login/status indicators, integrity warnings, and person-only creation
- [x] 6.2 Build the Person-centered detail shell and overview with clear Details, Authentication, Sessions, and recent Activity navigation
- [x] 6.3 Build the Details route and validated form for authoritative Person profile fields and active/inactive lifecycle state
- [x] 6.4 Build the Authentication route for no-login state, add-login, allowlisted user fields, admin flag, password replacement, ban/unban, and confirmed login removal
- [x] 6.5 Build the Sessions route with non-secret device/session metadata and individual/all-session revocation controls
- [x] 6.6 Add server/page tests for validation errors, no returned passwords/tokens, action confirmations, Person persistence after auth changes, and successful audit-history rendering

## 7. End-to-End Verification

- [x] 7.1 Add a development Playwright flow proving the default user sees Admin, creates and edits a person without login, attaches login, and observes the unified details/authentication/sessions experience
- [x] 7.2 Add browser coverage proving anonymous and non-admin users cannot see or access admin functionality and destructive/self/final-admin protections cannot be bypassed by direct requests
- [x] 7.3 Verify the admin console at mobile and desktop widths with semantic landmarks, labeled controls, keyboard focus, error announcements, and no horizontal overflow
- [x] 7.4 Run the migration, formatting/lint checks, Svelte type check, full unit/server/database tests, production build, and admin/authentication Playwright suite; verify production does not create or elevate the development account and resolve failures without unrelated features
