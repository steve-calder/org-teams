## ADDED Requirements

### Requirement: Independent organizational concepts
The persistence model SHALL represent organizations, people, employments, teams, team types, team memberships, team leadership assignments, reporting relationships, named hierarchies, and hierarchy placements as distinct concepts. No one concept SHALL be derived solely from another.

#### Scenario: Team leader has a different manager
- **WHEN** a person leads a team but reports to a manager outside that team
- **THEN** the leadership assignment and reporting relationship are stored and returned independently

#### Scenario: Team appears in multiple hierarchies
- **WHEN** a team has one parent in a functional hierarchy and a different parent in a product hierarchy
- **THEN** both placements coexist without one placement modifying the other

### Requirement: Effective-period relationships
Employment, membership, leadership, reporting, and hierarchy placement records SHALL support inclusive start and exclusive optional end timestamps. Current and point-in-time queries SHALL apply the same effective-period semantics.

#### Scenario: Historical membership is queried
- **WHEN** a membership ended before the current time and a query requests a time within its effective interval
- **THEN** the membership is returned for that time but not as a current membership

#### Scenario: Adjacent relationship periods are recorded
- **WHEN** one relationship ends at the exact timestamp that its replacement begins
- **THEN** the periods do not overlap and point-in-time queries return at most the relationship effective at that timestamp

### Requirement: Membership integrity
The system SHALL reject overlapping active membership periods for the same person, employment, and team while allowing the person to belong to multiple different teams.

#### Scenario: Duplicate active membership is attempted
- **WHEN** an administrator creates a membership whose effective period overlaps an existing membership for the same employment and team
- **THEN** the transaction is rejected without changing either membership

#### Scenario: Membership in another team is created
- **WHEN** an employment already belongs to one team and a non-duplicate membership is added to a different team
- **THEN** both memberships are retained

### Requirement: Reporting integrity
The system SHALL distinguish primary and dotted-line reporting relationships, SHALL prevent overlapping primary-manager periods for the same employment, and SHALL reject direct or indirect cycles in primary reporting.

#### Scenario: Second active primary manager is attempted
- **WHEN** a primary-manager relationship overlaps an existing primary-manager relationship for the same report
- **THEN** the transaction is rejected

#### Scenario: Dotted-line relationship is added
- **WHEN** an employment already has a primary manager and a distinct dotted-line manager is added
- **THEN** both typed relationships are retained without changing the primary relationship

#### Scenario: Primary reporting cycle is attempted
- **WHEN** a proposed primary relationship would make a person their own direct or indirect manager
- **THEN** the transaction is rejected atomically

### Requirement: Named hierarchy integrity
Within one named hierarchy, a team SHALL have at most one active direct parent and the active placements SHALL form a tree or forest without cycles. Placements in other named hierarchies SHALL be evaluated independently.

#### Scenario: Hierarchy cycle is attempted
- **WHEN** moving a team under one of its descendants would create a cycle in the selected hierarchy
- **THEN** the transaction is rejected and all existing placements remain unchanged

#### Scenario: Same team receives another hierarchy parent
- **WHEN** a team already placed in one hierarchy is assigned a parent in a different hierarchy
- **THEN** the new placement is accepted if the second hierarchy remains valid

### Requirement: Auditable administrative mutations
Every product-domain administrative mutation SHALL record an append-only audit event containing the organization, actor, operation, affected entity, occurrence time, correlation identifier, and sufficient structured change metadata to understand the mutation.

#### Scenario: Membership is changed
- **WHEN** an authorized administrator creates, ends, or corrects a membership
- **THEN** the state change and its audit event commit in the same transaction

#### Scenario: Mutation fails validation
- **WHEN** a proposed organizational mutation is rejected
- **THEN** no successful-change audit event is recorded for that mutation

### Requirement: Representative matrix seed
The development seed SHALL include overlapping team memberships, primary and dotted-line reporting, team leadership distinct from management, at least two named hierarchies with different placements, and at least one historical relationship.

#### Scenario: Seed is loaded
- **WHEN** a developer initializes a clean database with the deterministic seed
- **THEN** the resulting data can exercise every foundational relationship type and point-in-time query convention

