## ADDED Requirements

### Requirement: Authenticated session boundary
The system SHALL use Better Auth for credentials, external identities, session persistence, and secure session cookies. Server hooks SHALL resolve session state for protected requests, and protected application routes SHALL not trust client-supplied identity fields.

#### Scenario: Anonymous user requests a protected page
- **WHEN** a request without a valid session accesses an authenticated application route
- **THEN** the system redirects to sign-in or returns an unauthenticated response appropriate to the request type

#### Scenario: Valid session accesses the application
- **WHEN** a request includes a valid session
- **THEN** the server context contains the authenticated identity and no credential or session secret is exposed to browser-visible data

### Requirement: Product identity remains separate from authentication
The system SHALL represent people and employments in product-owned tables and SHALL link an authenticated user to a person explicitly. Authentication records SHALL NOT implicitly create employment, team membership, management authority, or administrative authority.

#### Scenario: Authenticated user has no person link
- **WHEN** a valid authenticated user has not been linked to a product person
- **THEN** the user cannot access organization-scoped product data and receives an actionable account-not-linked state

#### Scenario: Person belongs to several teams
- **WHEN** a linked person has several team memberships
- **THEN** the person's authentication identity remains a single identity and no membership independently changes their session

### Requirement: Explicit organization context
Every organization-scoped server operation SHALL resolve and validate an organization context from server-controlled session or route state. Repositories and services SHALL require organization scope for organization-owned records.

#### Scenario: User requests another organization's record
- **WHEN** an authenticated user supplies an identifier for a record outside their authorized organization context
- **THEN** the system denies access without disclosing the record's private contents

### Requirement: Denial-by-default authorization policy
Domain mutations and sensitive reads SHALL invoke a centralized capability-oriented authorization policy. A team leadership assignment, hierarchy placement, membership, or dotted-line reporting relationship SHALL NOT grant private-data or administrative authority unless an explicit policy grants it.

#### Scenario: Dotted-line manager requests private employment data
- **WHEN** a dotted-line manager lacks an explicit private-employment-data permission
- **THEN** the policy denies the request despite the reporting relationship

#### Scenario: Organization administrator performs a scaffold administration action
- **WHEN** an authenticated actor has the explicit organization-administration capability for the selected organization
- **THEN** the policy allows the action and supplies the actor context for auditing

### Requirement: Development authentication does not define production identity strategy
The scaffold SHALL support local password-based development authentication while keeping production OIDC or SAML provider configuration replaceable and server-only.

#### Scenario: Development environment is initialized
- **WHEN** a developer configures the documented local authentication secrets
- **THEN** the developer can create or use a development account without requiring an enterprise identity provider

