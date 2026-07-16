## 1. Establish Authentication Persistence

- [x] 1.1 Generate the Better Auth Drizzle schema into `auth.schema.ts` using the existing CLI and review the generated user, account, session, and verification tables
- [x] 1.2 Add the minimal Person table with UUID identity, nullable unique Better Auth user foreign key, and timezone-aware creation/update timestamps
- [x] 1.3 Export the authentication and Person tables from the root Drizzle schema without adding any other product models
- [x] 1.4 Generate and review one committed Drizzle migration for the Better Auth and Person tables, then verify it applies to the existing Compose PostgreSQL service

## 2. Link Authenticated Users to Person

- [x] 2.1 Implement a server-only Person repository that finds a Person by authentication user ID and idempotently creates the link when absent
- [x] 2.2 Handle concurrent Person provisioning through the database uniqueness constraint and return the single persisted Person
- [x] 2.3 Invoke Person provisioning after Better Auth user creation and when resolving a valid session for a preexisting user
- [x] 2.4 Extend `App.Locals` and the SvelteKit server hook with the server-resolved Person while leaving anonymous requests unset
- [x] 2.5 Add focused database tests for initial provisioning, repeat provisioning, duplicate-link rejection, and preexisting-user backfill

## 3. Implement the Login Flow

- [x] 3.1 Add a `/login` server load that renders for anonymous users and redirects valid authenticated sessions to `/protected`
- [x] 3.2 Add the `/login` form action with required email/password validation, Better Auth sign-in, generic invalid-credential handling, and no returned password value
- [x] 3.3 Add the accessible `/login` page containing only the email field, password field, error state, and login control
- [x] 3.4 Idempotently provision `dev@org-teams.local` with password `password` through Better Auth only in development mode, link its Person through the existing hook, and prevent provisioning from creating a visitor session
- [x] 3.5 Return and display the default credentials on `/login` only in development mode and document them in the development setup instructions

## 4. Implement Protected Access and Logout

- [x] 4.1 Add a `/protected` server load that redirects anonymous requests to `/login` and obtains identity only from session locals
- [x] 4.2 Add a minimal `/protected` page that proves the authenticated user and linked Person are available without displaying secrets or becoming a profile/dashboard feature
- [x] 4.3 Add a server-side logout action that invalidates the Better Auth session and redirects to `/login`

## 5. Verify the Authentication Slice

- [x] 5.1 Add server tests for default development account provisioning and idempotency, anonymous-session safety, environment-gated credential exposure, login validation, invalid credentials, authenticated login redirect, protected-route rejection, and session/Person page data
- [x] 5.2 Add a Playwright flow that uses the default development account to log in, reaches `/protected`, logs out, and confirms the protected page is no longer accessible
- [x] 5.3 Run the migration, Svelte type check, focused unit/server tests, production build, and authentication Playwright test; verify production neither provisions nor exposes the default development account, and resolve failures without adding dependencies or unrelated features
