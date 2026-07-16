## Why

The application needs one complete authentication path before any HRIS capabilities are added. A minimal Person record linked to the authenticated account provides the stable product identity that future HRIS models can extend without treating the authentication provider's user table as the employee domain model.

## What Changes

- Complete the existing Better Auth and Drizzle setup for email/password sign-in and persisted sessions.
- Add a minimal Person model with a stable product identifier and an explicit one-to-one link to a Better Auth user.
- Ensure a Person record is provisioned when an authentication account is provisioned, without adding employment or other HRIS fields.
- Add a `/login` page containing the login form, clear invalid-credential feedback, and development-only default-account guidance.
- In development mode only, idempotently provision a default Better Auth account and make its credentials available on the login page without automatically authenticating a visitor.
- Do not provision the default account or expose its credentials when the application runs outside development mode.
- Add one authenticated-only page that loads the linked Person and supports sign-out.
- Redirect anonymous users away from the protected page and redirect authenticated users away from the login page.
- Add focused tests for login, session protection, Person linkage, and logout.
- Add no registration UI, password recovery, email verification, social login, authorization roles, organizations, teams, profiles, or other product features.

## Capabilities

### New Capabilities

- `email-password-authentication`: Login, authenticated session handling, protected-page access, and logout behavior.
- `authenticated-person`: The minimal product-owned Person record and its lifecycle link to a Better Auth user.

### Modified Capabilities

None. No main OpenSpec capability specifications currently exist.

## Impact

- Affects the existing Better Auth configuration, server hook, development account provisioning, application locals, Drizzle schema, database migration, and SvelteKit routes.
- Uses the libraries already installed in the repository; no additional framework or runtime dependency is required.
- Introduces Better Auth persistence tables and the first product-owned `person` table.
- Does not define the future employee, employment, organization, team, permissions, or broader HRIS schema.
