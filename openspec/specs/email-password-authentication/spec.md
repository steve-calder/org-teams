# Email and Password Authentication Specification

## Purpose

Define email/password login, development-account provisioning, authenticated landing, session persistence, and logout behavior.

## Requirements

### Requirement: Login page

The application SHALL provide a `/login` page containing an email field, password field, and login submission control. The page SHALL NOT contain registration, password recovery, social login, or unrelated product controls.

#### Scenario: Anonymous user opens login

- **WHEN** an anonymous user requests `/login`
- **THEN** the application displays the email/password login form

#### Scenario: Authenticated user opens login

- **WHEN** a user with a valid session requests `/login`
- **THEN** the application redirects the user to `/`

### Requirement: Default development account

When the application runs in development mode, it SHALL idempotently provision a Better Auth account with email `dev@org-teams.local` and password `password`, ensure that account has one linked Person, grant it administrator authorization, and display the credentials on `/login`. Provisioning the account SHALL NOT establish a session for the anonymous request that triggers it. Outside development mode, the application SHALL NOT provision the default account, grant development-account authorization, or return its credentials in login page data.

#### Scenario: First development request provisions the default account

- **WHEN** the application receives its first request in development mode
- **THEN** the default Better Auth account exists with administrator authorization and one linked Person and can authenticate with the specified credentials

#### Scenario: Default account already exists

- **WHEN** development provisioning runs after the default account has already been created
- **THEN** provisioning succeeds with administrator authorization without creating a duplicate authentication user or linked Person

#### Scenario: Anonymous request triggers provisioning

- **WHEN** an anonymous request causes the default development account to be provisioned
- **THEN** the request remains anonymous and receives no session for the default account

#### Scenario: Developer opens the login page

- **WHEN** an anonymous user requests `/login` in development mode
- **THEN** the login page displays `dev@org-teams.local` and `password` as the available development credentials

#### Scenario: Application runs outside development mode

- **WHEN** the application handles a request outside development mode
- **THEN** it neither provisions or grants access to the default account nor returns or displays the default credentials

### Requirement: Email and password authentication

The login form SHALL authenticate credentials through Better Auth on the server and SHALL establish its session using a secure HTTP-only cookie. The application SHALL NOT expose the submitted password in returned form state, logs, or page data.

#### Scenario: Valid credentials are submitted

- **WHEN** a user submits valid email and password credentials
- **THEN** the application establishes a session and redirects the user to `/`

#### Scenario: Invalid credentials are submitted

- **WHEN** a user submits an invalid email or password
- **THEN** the application remains on `/login`, creates no authenticated session, and displays a generic authentication failure message

#### Scenario: Required credential is missing

- **WHEN** a user submits the login form without an email or password
- **THEN** the application rejects the submission without calling the authentication provider and identifies the missing form input

### Requirement: Session persistence

The server hook SHALL resolve a valid Better Auth session on subsequent requests and place only the authenticated user, session, and linked Person required by server routes into request locals.

#### Scenario: Authenticated user makes a subsequent request

- **WHEN** a request includes a valid session cookie
- **THEN** the root server load recognizes the same authenticated account and linked Person and presents the authenticated home page without requiring another login

#### Scenario: Expired or invalid session is presented

- **WHEN** a request includes an expired or invalid session cookie
- **THEN** the request is treated as anonymous and cannot access authenticated-only routes

### Requirement: Logout

The authenticated application shell SHALL provide a logout control that invalidates the Better Auth session on the server and redirects to `/login`.

#### Scenario: Authenticated user logs out

- **WHEN** an authenticated user submits the logout action
- **THEN** the session is invalidated, the user is redirected to `/login`, and the prior session can no longer access authenticated-only routes
