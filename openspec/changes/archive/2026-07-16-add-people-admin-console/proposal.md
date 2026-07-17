## Why

Org Teams has separate authentication and Person identities but no secure way for administrators to manage them together. A person-centered console is needed so administrators can maintain organizational records—including people who never receive a login—while managing linked authentication through the correct Better Auth boundary.

## What Changes

- Add administrator authorization to Better Auth users and expose only the derived admin flag needed by server routes and navigation.
- Grant the default development user administrator access idempotently in development mode.
- Add an Admin link to the shared header that is visible only to authenticated administrators.
- Add a protected `/admin/people` console that lists and searches Person records together with their linked login status.
- Add a unified Person detail experience with separate Person Details, Authentication, and Sessions sections.
- Expand Person with an initial editable profile: display name, optional legal name, optional unique employee identifier, optional job title, and active/inactive lifecycle status.
- Support creating and editing people without logins, adding a login to an existing Person, and retaining the Person when login access is disabled or removed.
- Manage login email/name, password, administrator access, ban status, and sessions through Better Auth's admin APIs rather than direct authentication-table writes.
- Add safety controls for destructive or privilege-changing actions, including server authorization, self-protection, final-admin protection, confirmation, and audit records.

## Capabilities

### New Capabilities

- `people-admin-console`: Defines administrator authorization and navigation, the person-centered admin list/detail experience, Person profile management, linked authentication administration, lifecycle actions, and audit/safety behavior.

### Modified Capabilities

- `authenticated-person`: Expands the Person domain record and explicitly supports Person records with no authentication user, including later login attachment.
- `application-shell`: Adds administrator-only Admin navigation based on server-resolved authorization.
- `email-password-authentication`: Makes the default development user an administrator while preserving environment-gated provisioning and credential exposure.

## Impact

- Adds the Better Auth admin plugin and its generated user/session schema fields, plus Person profile fields and an admin audit table with committed migrations.
- Affects authentication configuration, development-account provisioning, session locals, root layout data/navigation, Person repositories/services, and new `/admin/people` server routes and pages.
- Authentication mutations remain owned by Better Auth; Person and audit mutations remain owned by Org Teams server-side domain services.
- Introduces no team, manager, reporting-line, organization, invitation-email, impersonation, or general HRIS workflow in this change.
