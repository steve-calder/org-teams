# People Admin Console Specification

## Purpose

Define secure, person-centered administration of people profiles, linked authentication, sessions, privileges, and audit history.

## Requirements

### Requirement: Administrator authorization boundary

The system SHALL persist administrator authorization on the Better Auth user using the authentication provider's supported admin role, SHALL expose a derived administrator flag to trusted server context, and SHALL authorize every admin page load and mutation on the server. Navigation visibility SHALL NOT be the access control.

#### Scenario: Administrator opens the console

- **WHEN** an authenticated user with administrator authorization requests `/admin/people`
- **THEN** the server permits access to the people administration console

#### Scenario: Non-administrator opens the console

- **WHEN** an authenticated user without administrator authorization requests an admin route or submits an admin action
- **THEN** the server rejects the request without reading or changing administrative data

#### Scenario: Anonymous visitor opens the console

- **WHEN** a visitor without a valid session requests an admin route
- **THEN** the server redirects the visitor to `/login`

### Requirement: Person-centered administration directory

The administration console SHALL present a searchable, paginated directory whose primary record is Person and whose rows include only allowlisted linked-user status when authentication exists. The directory SHALL include Person records with and without authentication users and SHALL support filters for login state, active state, and administrator state.

#### Scenario: Directory contains mixed login states

- **WHEN** an administrator views a result set containing linked and unlinked people
- **THEN** each Person appears once and the row clearly identifies whether login is active, disabled, or absent

#### Scenario: Administrator searches the directory

- **WHEN** an administrator searches by display name, employee identifier, or linked login email
- **THEN** the directory returns matching Person records without exposing authentication secrets

#### Scenario: Authentication user lacks a Person

- **WHEN** the system detects an authentication user with no linked Person
- **THEN** the console surfaces an integrity warning rather than treating that user as a normal independent directory entry

### Requirement: Person profile administration

An administrator SHALL be able to create a Person without creating authentication and SHALL be able to edit the Person's display name, optional legal name, optional unique employee identifier, optional job title, and active or inactive lifecycle status. Person display name SHALL be the authoritative product-facing name and SHALL initialize or synchronize the linked authentication user's display name when applicable. A Person SHALL NOT be made inactive while they manage an active Team.

#### Scenario: Administrator creates a person without login

- **WHEN** an administrator submits a valid Person profile without requesting authentication
- **THEN** the system creates one Person with no authentication-user link and displays it in the directory as having no login

#### Scenario: Administrator updates person details

- **WHEN** an administrator submits valid changes to a Person profile
- **THEN** the system persists the Person fields and synchronizes the linked authentication display name if the authoritative display name changed

#### Scenario: Duplicate employee identifier is submitted

- **WHEN** an administrator submits an employee identifier already assigned to another Person
- **THEN** the system rejects the change and preserves both existing Person records

#### Scenario: Active Team management blocks Person deactivation

- **WHEN** an administrator attempts to make a Person inactive while they manage one or more active Teams
- **THEN** the system rejects the lifecycle change, preserves the active Person, and identifies the blocking Teams

#### Scenario: Administrator resolves managed Teams

- **WHEN** an administrator clears or reassigns every active Team managed by a Person and retries deactivation
- **THEN** the system makes the Person inactive without changing historical audit events

### Requirement: Unified Person detail experience

The console SHALL provide one Person-centered detail experience with distinct Person Details, Authentication, and Sessions sections. Authentication and Sessions sections SHALL remain available as an explicit no-login state when the Person has no authentication user.

#### Scenario: Administrator opens a linked person

- **WHEN** an administrator opens a Person linked to an authentication user
- **THEN** the detail experience shows Person fields, allowlisted login status, and session-management controls in their respective sections

#### Scenario: Administrator opens a person without login

- **WHEN** an administrator opens an unlinked Person
- **THEN** the Person Details section remains editable and the Authentication section offers an explicit add-login action

### Requirement: Authentication administration for a Person

The console SHALL manage linked authentication through Better Auth's supported admin APIs. An administrator SHALL be able to add email/password login to an unlinked Person, update login email and display name, set a replacement password, grant or remove administrator authorization, ban or unban login, revoke sessions, and remove login while retaining the Person. The console SHALL NOT read, return, or directly edit password hashes, provider tokens, or full session tokens.

#### Scenario: Administrator adds login to an existing person

- **WHEN** an administrator supplies a unique email and valid initial password for a Person without login
- **THEN** Better Auth creates one user and credential account and the system links that user to the existing Person without leaving an additional Person

#### Scenario: Administrator disables login

- **WHEN** an administrator bans a linked authentication user
- **THEN** Better Auth prevents subsequent login, revokes that user's sessions, and the Person remains available in the console

#### Scenario: Administrator removes login

- **WHEN** an administrator confirms removal of a Person's linked authentication user
- **THEN** Better Auth removes the user, accounts, and sessions while the Person remains with no authentication link

#### Scenario: Administrator replaces a password

- **WHEN** an administrator submits a valid replacement password
- **THEN** Better Auth replaces the credential without returning the stored password value in page data, form state, or logs

### Requirement: Administrative safety controls

The system SHALL require explicit confirmation for login removal and privilege-reducing actions, SHALL prevent an administrator from banning, deleting, or removing their own administrator access, and SHALL prevent removal of the final administrator. These protections SHALL be enforced by the server action regardless of submitted client data.

#### Scenario: Administrator targets their own access

- **WHEN** an administrator attempts to ban themselves, remove their own login, or remove their own administrator authorization
- **THEN** the server rejects the action and preserves their access

#### Scenario: Administrator targets the final administrator

- **WHEN** an action would leave the application with no administrator users
- **THEN** the server rejects the action and preserves at least one administrator

#### Scenario: Destructive action lacks confirmation

- **WHEN** a client submits login removal or administrator removal without the required confirmation value
- **THEN** the server rejects the action without changing Person or authentication data

### Requirement: Administrative audit trail

The system SHALL record each successful Person, authentication, session, and administrator-access mutation with the acting authentication user, target Person and authentication user when applicable, action type, timestamp, and sanitized non-secret metadata. Administrators SHALL be able to review recent audit entries for a Person.

#### Scenario: Administrator changes a person

- **WHEN** an administrator successfully changes Person or linked authentication state
- **THEN** the system creates an audit record identifying the actor, target, action, and sanitized change summary

#### Scenario: Administrator reviews person history

- **WHEN** an administrator opens the audit history for a Person
- **THEN** the console displays that Person's recent administrative actions without credentials, tokens, or sensitive session values
