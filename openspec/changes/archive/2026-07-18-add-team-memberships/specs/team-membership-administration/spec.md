## ADDED Requirements

### Requirement: Team membership definition

The system SHALL allow a global administrator to assign a Person to a Team through an ordinary membership with a required free-text role. The role SHALL be trimmed, contain between 1 and 160 characters, represent the Person's title or function on that Team, and SHALL NOT be constrained to a controlled catalog. A membership SHALL have immutable UUID identity and creation and update timestamps.

#### Scenario: Administrator assigns a Person with a Team role

- **WHEN** a global administrator assigns an eligible Person to an eligible Team with a valid free-text role
- **THEN** the system creates one ordinary membership and preserves the submitted role as the Person's Team-specific title or function

#### Scenario: Role is missing or too long

- **WHEN** an administrator submits a blank role or a role longer than 160 characters
- **THEN** the system rejects the assignment and creates no membership

#### Scenario: Administrator updates a Team role

- **WHEN** a global administrator replaces an ordinary member's role with another valid free-text value
- **THEN** the system updates that membership without changing its Person, Team, or immutable identity

### Requirement: Multiple Team participation without duplication

The system SHALL allow a Person to hold ordinary memberships in any number of Teams, including Teams owned by different Organizations. The system SHALL permit at most one ordinary membership for a given Person and Team and SHALL NOT designate any membership as primary.

#### Scenario: Person joins Teams in different Organizations

- **WHEN** an administrator assigns one Person to eligible Teams owned by different Organizations
- **THEN** the system creates each membership without requiring an Organization-level employment or participation record

#### Scenario: Duplicate membership is attempted

- **WHEN** an administrator attempts to assign a Person who already has an ordinary membership in that Team
- **THEN** the system rejects the duplicate and preserves the existing membership and role

#### Scenario: Person has several Team memberships

- **WHEN** a Person belongs to more than one Team
- **THEN** every membership remains independently visible and editable and none is presented as primary

### Requirement: Manager counts as a Team member

The system SHALL treat the Team's assigned manager as an implicit member of that Team without requiring an ordinary membership record. Membership rosters SHALL include the manager exactly once, identify the assignment as the manager role, and SHALL NOT permit a redundant ordinary membership for the current manager.

#### Scenario: Manager has no ordinary membership

- **WHEN** a Team has a manager who has no ordinary membership for that Team
- **THEN** the Team roster and Person Team view include that Person once as the Team manager

#### Scenario: Administrator assigns the manager as an ordinary member

- **WHEN** an administrator attempts to create an ordinary membership for the Team's current manager
- **THEN** the system rejects the redundant assignment and explains that manager assignment already counts as membership

#### Scenario: Ordinary member becomes manager

- **WHEN** an administrator assigns the Team manager role to a Person who has an ordinary membership in that Team
- **THEN** the system atomically removes the ordinary membership, assigns the manager, and presents the Person once as an implicit manager member

#### Scenario: Manager assignment ends

- **WHEN** an administrator clears or replaces a Team's manager
- **THEN** the former manager no longer belongs to that Team unless an administrator subsequently gives them an ordinary membership

### Requirement: Membership eligibility and lifecycle behavior

The system SHALL allow creation or role editing of an ordinary membership only while both its Person and Team are active. Existing memberships SHALL remain stored and visible with endpoint lifecycle status when either the Person or Team becomes inactive, but they SHALL NOT produce a current contextual reporting relationship until both are active again.

#### Scenario: Ineligible membership assignment

- **WHEN** an administrator attempts to assign an inactive or unknown Person or assign a Person to an inactive or unknown Team
- **THEN** the system rejects the assignment and preserves existing memberships

#### Scenario: Membership endpoint becomes inactive

- **WHEN** a Person or Team with an ordinary membership becomes inactive
- **THEN** the system retains and displays the membership with lifecycle context and excludes it from current contextual reporting

#### Scenario: Membership endpoint becomes active again

- **WHEN** both endpoints of a retained membership are active again
- **THEN** the membership again contributes its Team-specific contextual reporting relationship without creating another membership

### Requirement: Membership-derived manager context

The system SHALL derive an active ordinary Team member's contextual manager from that Team's active manager assignment, SHALL identify the Team that produced the relationship, SHALL allow different memberships to produce different managers, and SHALL NOT persist or designate a primary direct Person-to-Person reporting relationship.

#### Scenario: Active Team membership has a manager

- **WHEN** an active Person has an ordinary membership in an active Team with an active manager
- **THEN** the system derives that manager for the Person in the context of that Team

#### Scenario: Membership has no available manager

- **WHEN** an ordinary membership's Team has no manager or its assigned manager is inactive
- **THEN** the system derives no manager from that membership

#### Scenario: Memberships produce several managers

- **WHEN** a Person's active memberships are associated with different Team managers
- **THEN** the system retains each Team-specific manager context and marks none as primary

### Requirement: Membership administration experience

The administration console SHALL authorize every membership load and mutation on the server using the existing global administrator role. The Team detail experience SHALL present a single roster containing the manager and ordinary members, and the Person detail experience SHALL provide a Teams section containing ordinary memberships, managed Teams, Team-specific roles, Organization context, lifecycle status, and contextual managers. Both experiences SHALL support ordinary membership creation, role editing, removal, and navigation to related records.

#### Scenario: Administrator manages a Team roster

- **WHEN** a global administrator opens a Team detail page
- **THEN** the page shows the manager once, lists ordinary members and roles, and provides eligible assignment, role-edit, and removal controls

#### Scenario: Administrator manages a Person's Teams

- **WHEN** a global administrator opens the Teams section for a Person
- **THEN** the page distinguishes managed Teams from ordinary memberships and provides eligible Team assignment, role-edit, removal, and related Organization and Team links

#### Scenario: Unauthorized client submits a membership mutation

- **WHEN** an anonymous visitor or authenticated non-administrator submits a membership action directly
- **THEN** the server rejects the request without reading or changing membership data

### Requirement: Membership administrative audit history

The system SHALL write a sanitized administrative audit event for every successful ordinary membership creation, role change, or removal. Each event SHALL be committed atomically with the mutation, target both the related Person and Team, identify the membership record and changed role values where applicable, and exclude raw request data and private Person fields.

#### Scenario: Membership is created

- **WHEN** an administrator successfully creates an ordinary membership
- **THEN** the system commits an audit event containing the membership ID and role and targeting its Person and Team

#### Scenario: Membership role changes

- **WHEN** an administrator successfully changes an ordinary membership role
- **THEN** the system commits an audit event containing the membership ID and previous and new role values and targeting its Person and Team

#### Scenario: Membership is removed directly or by manager promotion

- **WHEN** an ordinary membership is successfully removed by an administrator or atomically reconciled during manager assignment
- **THEN** the system commits an audit event containing the membership ID and prior role and targeting its Person and Team

#### Scenario: Membership mutation fails

- **WHEN** a membership mutation fails authorization, validation, conflict detection, or audit writing
- **THEN** the system preserves the prior membership state and writes no success audit event
