## MODIFIED Requirements

### Requirement: Product-owned Person identity

The system SHALL store Person separately from Better Auth's user table. Person SHALL have a stable UUID primary key, an optional unique authentication-user link, a required display name, optional legal name, optional unique employee identifier, optional job title, active or inactive lifecycle status, and creation and update timestamps. Team, manager, reporting, organization, demographic, and authorization data SHALL NOT be stored on Person in this change.

#### Scenario: Person is linked to an authentication user

- **WHEN** a Person is associated with a Better Auth user
- **THEN** the Person retains its own UUID and references the authentication user by an explicit unique foreign key

#### Scenario: Person has no authentication user

- **WHEN** a Person represents someone who does not need application login
- **THEN** the Person retains its profile and lifecycle data with a null authentication-user link

#### Scenario: Unspecified HRIS data is considered

- **WHEN** the expanded Person schema is created
- **THEN** it contains no team, manager, reporting, organization, demographic, or authorization fields

### Requirement: Person provisioning for authenticated accounts

The authentication boundary SHALL idempotently ensure that a valid Better Auth user has exactly one linked Person. Normal authentication-user creation SHALL create and link a Person, existing authentication users without a Person SHALL be backfilled when their valid session is resolved, and administrator login attachment SHALL link the new authentication user to the selected existing Person without retaining an additional Person.

#### Scenario: New authentication user is provisioned

- **WHEN** Better Auth successfully creates a user through its normal server authentication API
- **THEN** the system creates and links one Person for that user

#### Scenario: Existing user has no Person

- **WHEN** a valid session is resolved for an authentication user created before the Person migration
- **THEN** the system creates and returns one linked Person before protected page data is loaded

#### Scenario: Administrator adds login to an existing Person

- **WHEN** Better Auth creates a user for an administrator-selected Person that has no login
- **THEN** the system links the new user to that Person and leaves no generated duplicate Person

#### Scenario: Concurrent provisioning occurs

- **WHEN** two requests attempt to provision a Person for the same authentication user concurrently
- **THEN** both requests resolve to the same single linked Person
