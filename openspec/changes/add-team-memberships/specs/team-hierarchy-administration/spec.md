## MODIFIED Requirements

### Requirement: Team manager assignment

The system SHALL allow a global administrator to assign at most one active Person as a Team's manager or to leave the Team without a manager. A Team's manager SHALL count as an implicit member of that Team without a separate ordinary membership, and manager assignment SHALL NOT infer Organization employment or access authority.

#### Scenario: Administrator assigns an active manager

- **WHEN** an administrator assigns an active Person to a Team that the Person is eligible to manage
- **THEN** the system persists that Person as the Team's sole manager and presents them as an implicit member of the Team

#### Scenario: Administrator clears the manager

- **WHEN** an administrator clears a Team's manager
- **THEN** the system leaves the Team without a manager, removes supervision derived from that assignment, and does not create an ordinary membership for the former manager

#### Scenario: Administrator assigns an inactive Person

- **WHEN** an administrator attempts to assign an inactive or unknown Person as a Team manager
- **THEN** the system rejects the assignment and preserves the current manager

#### Scenario: Manager participates across Organizations

- **WHEN** an administrator assigns an active Person as manager of a Team owned by any Organization
- **THEN** the system accepts the assignment without requiring Organization employment and without granting access authority

#### Scenario: Existing ordinary member becomes manager

- **WHEN** an administrator assigns an active Person who already has an ordinary membership in that Team as its manager
- **THEN** the system atomically removes the redundant ordinary membership, records its removal, and persists the Person as the sole manager
