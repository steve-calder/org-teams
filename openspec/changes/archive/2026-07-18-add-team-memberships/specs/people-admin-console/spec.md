## MODIFIED Requirements

### Requirement: Unified Person detail experience

The console SHALL provide one Person-centered detail experience with distinct Person Details, Teams, Authentication, and Sessions sections. The Teams section SHALL show ordinary Team memberships and managed Teams without designating a primary Team, and Authentication and Sessions sections SHALL remain available as an explicit no-login state when the Person has no authentication user.

#### Scenario: Administrator opens a linked person

- **WHEN** an administrator opens a Person linked to an authentication user
- **THEN** the detail experience shows Person fields, Team participation, allowlisted login status, and session-management controls in their respective sections

#### Scenario: Administrator opens a person without login

- **WHEN** an administrator opens an unlinked Person
- **THEN** the Person Details and Teams sections remain available and the Authentication section offers an explicit add-login action

#### Scenario: Administrator opens a Person with several Team relationships

- **WHEN** a Person has ordinary memberships or manager assignments across one or more Organizations
- **THEN** the Teams section shows every relationship with its Team, Organization, relationship kind, Team-specific role or manager label, lifecycle context, and derived manager where applicable, and marks none as primary
