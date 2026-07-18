## MODIFIED Requirements

### Requirement: Organization-owned Team definition

The system SHALL allow an administrator to create and edit Teams that are each owned by exactly one existing Organization. A Team SHALL have immutable UUID identity, a required display name of at most 160 characters, an optional purpose of at most 2,000 characters, a controlled team type, an active or inactive lifecycle status, and timestamps. Team names SHALL be display values rather than unique identifiers, Team ownership SHALL change only through a dedicated confirmed transfer to another active Organization, a Team with a parent or any children SHALL NOT be transferred until those relationships are cleared, and the administration experience SHALL provide no hard-delete operation.

#### Scenario: Administrator creates a Team

- **WHEN** an administrator submits valid Team details and selects an active Organization
- **THEN** the system creates one active Team owned by exactly that Organization

#### Scenario: Team lacks a valid owner

- **WHEN** an administrator submits a Team without an Organization or with an unknown Organization identifier
- **THEN** the system rejects the mutation without creating an unowned Team

#### Scenario: Teams share a display name

- **WHEN** distinct Teams in the same or different Organizations have the same display name
- **THEN** the system preserves them as distinct records and displays their Organization context

#### Scenario: Administrator edits Team details

- **WHEN** an administrator changes a Team's name, purpose, type, or lifecycle status
- **THEN** the system validates and persists the editable values while preserving its owning Organization and UUID

#### Scenario: Administrator transfers a Team

- **WHEN** an administrator confirms transfer of a Team with no parent or children to a different active Organization
- **THEN** the system changes only the owning Organization while preserving the Team's UUID, definition, type, lifecycle status, and manager assignment

#### Scenario: Team hierarchy blocks transfer

- **WHEN** an administrator attempts to transfer a Team that has a parent or one or more children
- **THEN** the system rejects the transfer, preserves the current ownership and hierarchy, and identifies the blocking related Teams

#### Scenario: Team transfer has an invalid destination

- **WHEN** an administrator attempts to transfer a Team to its current Organization, an inactive Organization, or an unknown Organization
- **THEN** the system rejects the transfer and preserves the current ownership

#### Scenario: Team transfer lacks confirmation

- **WHEN** a client submits a Team transfer without the required confirmation value
- **THEN** the server rejects the transfer without changing Team ownership

### Requirement: Organization and Team lifecycle integrity

The system SHALL prevent an inactive Organization from owning an active Team. It SHALL reject active Team creation or reactivation under an inactive Organization, SHALL reject Organization deactivation while any owned Team remains active, SHALL require an active parent for an active child Team, and SHALL reject parent Team deactivation while it has any active direct or indirect child Team. These checks SHALL be transactional with Team creation, activation, hierarchy mutation, transfer, Team deactivation, and Organization deactivation.

#### Scenario: Administrator creates a Team under an inactive Organization

- **WHEN** an administrator attempts to create an active Team owned by an inactive Organization
- **THEN** the system rejects the creation and explains that the Organization must be active

#### Scenario: Administrator reactivates a Team under an inactive Organization

- **WHEN** an administrator attempts to change an inactive Team to active while its Organization is inactive
- **THEN** the system rejects the lifecycle change and preserves the inactive Team

#### Scenario: Administrator assigns an inactive parent

- **WHEN** an administrator attempts to assign an inactive Team as the parent of an active Team
- **THEN** the system rejects the relationship and preserves the existing hierarchy

#### Scenario: Active descendants block Team deactivation

- **WHEN** an administrator attempts to deactivate a Team that has any active descendant Team
- **THEN** the system rejects the lifecycle change, preserves the active parent Team, and identifies the blocking descendants

#### Scenario: Administrator deactivates a leaf Team

- **WHEN** an administrator deactivates a Team with no active descendants
- **THEN** the system makes that Team inactive without silently clearing its parent, manager, or inactive child relationships

#### Scenario: Administrator resolves blocking Teams

- **WHEN** an administrator inactivates every active Team owned by an Organization or transfers them to other active Organizations and retries deactivation
- **THEN** the system makes the Organization inactive without changing the remaining inactive Teams

#### Scenario: Concurrent lifecycle mutation would violate integrity

- **WHEN** concurrent Team creation, activation, hierarchy mutation, transfer, Team deactivation, or Organization deactivation would leave an active Team under an inactive Organization or parent Team
- **THEN** the system serializes or rejects the conflicting mutation and preserves a valid final state
