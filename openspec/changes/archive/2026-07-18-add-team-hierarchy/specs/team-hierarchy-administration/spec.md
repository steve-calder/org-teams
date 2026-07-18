## ADDED Requirements

### Requirement: Single Team hierarchy per Organization

The system SHALL represent each Organization's Team structure through an optional direct parent on each Team. A Team without a parent SHALL be a top-level Team, an Organization SHALL allow multiple top-level Teams, and each Team SHALL have at most one direct parent.

#### Scenario: Administrator assigns a parent Team

- **WHEN** a global administrator assigns an eligible Team in the same Organization as a Team's parent
- **THEN** the system persists that one direct parent and presents the Team beneath it in the Organization hierarchy

#### Scenario: Administrator clears a parent Team

- **WHEN** a global administrator clears a Team's current parent
- **THEN** the system makes that Team a top-level Team without changing its descendants

#### Scenario: Organization has multiple roots

- **WHEN** multiple Teams in one Organization have no parent
- **THEN** the hierarchy presents each of them as a top-level Team in stable display-name and UUID order

### Requirement: Team hierarchy integrity

The system SHALL require a parent and child Team to belong to the same Organization, SHALL reject self-parenting and any assignment that creates a direct or indirect cycle, and SHALL validate and mutate the hierarchy atomically against concurrent hierarchy, lifecycle, and transfer changes.

#### Scenario: Administrator selects a Team from another Organization

- **WHEN** an administrator attempts to assign a parent owned by a different Organization
- **THEN** the system rejects the assignment and preserves the existing hierarchy

#### Scenario: Administrator makes a Team its own parent

- **WHEN** an administrator submits the Team itself as its parent
- **THEN** the system rejects the assignment and preserves the existing hierarchy

#### Scenario: Administrator creates an indirect cycle

- **WHEN** an administrator attempts to place a Team beneath one of its descendants
- **THEN** the system rejects the assignment, identifies that it would create a cycle, and preserves the existing hierarchy

#### Scenario: Concurrent mutations would invalidate the hierarchy

- **WHEN** concurrent parent, lifecycle, or transfer mutations would create a cycle or cross-Organization relationship
- **THEN** the system serializes or rejects the conflicting mutation and preserves a valid final hierarchy

### Requirement: Team manager assignment

The system SHALL allow a global administrator to assign at most one active Person as a Team's manager or to leave the Team without a manager. The initial capability SHALL NOT require the manager to be a Team member or validate Organization employment because those relationships do not yet exist.

#### Scenario: Administrator assigns an active manager

- **WHEN** an administrator assigns an active Person to a Team that the Person is eligible to manage
- **THEN** the system persists that Person as the Team's sole manager

#### Scenario: Administrator clears the manager

- **WHEN** an administrator clears a Team's manager
- **THEN** the system leaves the Team without a manager and removes supervision derived from that assignment

#### Scenario: Administrator assigns an inactive Person

- **WHEN** an administrator attempts to assign an inactive or unknown Person as a Team manager
- **THEN** the system rejects the assignment and preserves the current manager

#### Scenario: Manager is not yet an Organization participant

- **WHEN** an administrator assigns an active Person before Employment or Team membership capabilities exist
- **THEN** the system accepts the assignment without inferring Organization membership, Team membership, or access authority

### Requirement: Manager supervision follows the Team hierarchy

The system SHALL derive supervision between Team managers from direct parent-child Team relationships. A subordinate Team's manager SHALL be supervised by the direct parent Team's manager, no derived supervisor SHALL be designated as primary, and the system SHALL NOT persist a separate direct Person reporting relationship.

#### Scenario: Parent and child Teams have managers

- **WHEN** a Team and its direct parent each have a manager
- **THEN** the hierarchy identifies the parent Team's manager as supervisor of the subordinate Team's manager in that Team context

#### Scenario: Top-level Team has a manager

- **WHEN** a top-level Team has a manager
- **THEN** the system derives no supervisor for that manager from the Team hierarchy

#### Scenario: Direct parent has no manager

- **WHEN** a subordinate Team has a manager but its direct parent Team has no manager
- **THEN** the system derives no supervisor through that parent and does not skip to a more distant ancestor

#### Scenario: Same Person would supervise themselves

- **WHEN** a parent or manager change would cause one Person to manage Teams in the same ancestor-descendant chain
- **THEN** the system rejects the change and preserves the existing hierarchy and manager assignments

### Requirement: Hierarchy administration experience

The administration console SHALL authorize every hierarchy load and mutation on the server using the existing global administrator role. The Organization detail experience SHALL present its Team tree or forest, and the Team detail experience SHALL present its parent, children, manager, contextual manager supervision, and eligible parent and manager controls.

#### Scenario: Administrator browses an Organization hierarchy

- **WHEN** a global administrator opens an Organization detail page
- **THEN** the page presents all owned Teams in a navigable hierarchy with top-level Teams, descendants, lifecycle status, and manager context

#### Scenario: Administrator edits hierarchy context

- **WHEN** a global administrator opens a Team detail page
- **THEN** the page provides controls limited to eligible same-Organization parents and active People and links to the current parent, children, and manager

#### Scenario: Unauthorized client submits a hierarchy mutation

- **WHEN** an anonymous visitor or authenticated non-administrator submits a parent or manager change directly
- **THEN** the server rejects the request without reading or changing hierarchy data

### Requirement: Hierarchy administrative audit history

The system SHALL write a sanitized Team-targeted administrative audit event for every successful parent or manager change. The audit event SHALL be committed atomically with the Team mutation, identify previous and new related record IDs, and exclude raw request data and private Person fields.

#### Scenario: Parent assignment succeeds

- **WHEN** an administrator successfully assigns, changes, or clears a Team parent
- **THEN** the system commits a Team-targeted audit event with the previous and new parent Team IDs

#### Scenario: Manager assignment succeeds

- **WHEN** an administrator successfully assigns, changes, or clears a Team manager
- **THEN** the system commits a Team-targeted audit event with the previous and new manager Person IDs

#### Scenario: Hierarchy mutation fails

- **WHEN** a hierarchy or manager mutation fails authorization, validation, or audit writing
- **THEN** the system preserves the prior Team state and writes no success audit event
