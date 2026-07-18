## MODIFIED Requirements

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
