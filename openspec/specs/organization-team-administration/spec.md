# Organization and Team Administration

## Purpose

Define secure global-administrator controls for managing Organization and Team definitions, ownership, lifecycle integrity, directories, transfers, and audit history.

## Requirements

### Requirement: Global administrator authorization boundary

The system SHALL authorize every Organization and Team administration page load and mutation on the server using the existing global administrator role. Navigation visibility SHALL NOT be the access-control boundary, and this capability SHALL NOT infer organization-scoped authority from Organization or Team records.

#### Scenario: Administrator opens organization administration

- **WHEN** an authenticated global administrator requests an Organization or Team administration route
- **THEN** the server permits access to records across all Organizations

#### Scenario: Non-administrator submits a direct mutation

- **WHEN** an authenticated user without global administrator authorization submits an Organization or Team action directly
- **THEN** the server rejects the action without reading or changing administrative data

#### Scenario: Anonymous visitor opens administration

- **WHEN** a visitor without a valid session requests an Organization or Team administration route
- **THEN** the server redirects the visitor to login

### Requirement: Organization definition and lifecycle

The system SHALL allow an administrator to create and edit multiple Organizations with immutable UUID identity, a required display name of at most 160 characters, an optional description of at most 2,000 characters, and an active or inactive lifecycle status. Organization names SHALL be treated as display values rather than unique identifiers, the administration experience SHALL provide no hard-delete operation, and an Organization SHALL NOT be made inactive while it owns an active Team.

#### Scenario: Administrator creates an Organization

- **WHEN** an administrator submits a valid Organization name and optional description
- **THEN** the system creates one active Organization with normalized values and creation and update timestamps

#### Scenario: Administrator submits an invalid Organization

- **WHEN** an administrator submits a blank name or a value beyond its allowed length
- **THEN** the system rejects the mutation and preserves existing Organization data

#### Scenario: Organizations share a display name

- **WHEN** an administrator creates an Organization whose display name matches another Organization
- **THEN** the system preserves both as distinct records identified by their UUIDs

#### Scenario: Administrator deactivates an Organization without active Teams

- **WHEN** an administrator marks an active Organization inactive and it owns no active Teams
- **THEN** the system makes the Organization inactive without deleting it or rewriting any Team status

#### Scenario: Active Teams block Organization deactivation

- **WHEN** an administrator attempts to deactivate an Organization that owns one or more active Teams
- **THEN** the system rejects the lifecycle change, preserves the active Organization, and identifies the blocking Teams

#### Scenario: Administrator reactivates an Organization

- **WHEN** an administrator marks an inactive Organization active
- **THEN** the system reactivates that Organization without changing any Team status

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

### Requirement: Controlled Team types

The system SHALL accept the Team type codes `department`, `functional`, `product`, `delivery`, `project`, `geographic`, `committee`, `community`, and `other`, SHALL present friendly labels for those codes, and SHALL reject unrecognized values on the server regardless of submitted client data.

#### Scenario: Administrator selects a recognized type

- **WHEN** an administrator creates or edits a Team with a recognized type code
- **THEN** the system stores the code and presents its corresponding friendly label

#### Scenario: Client submits an unknown type

- **WHEN** a client submits a Team type outside the controlled set
- **THEN** the server rejects the mutation and preserves the Team's existing type if any

### Requirement: Organization and Team directories

The administration console SHALL provide separate searchable, bounded, paginated Organization and Team directories. The Organization directory SHALL filter by lifecycle status. The Team directory SHALL filter by lifecycle status, owning Organization, and Team type and SHALL identify the owning Organization in every result.

#### Scenario: Administrator searches Organizations

- **WHEN** an administrator searches by Organization display name and filters by status
- **THEN** the directory returns the matching page in stable display-name and UUID order

#### Scenario: Administrator filters Teams

- **WHEN** an administrator combines a name search with Organization, type, or status filters
- **THEN** the directory applies all supplied filters and returns a bounded page of matching Teams with Organization context

#### Scenario: Directory request exceeds the page bound

- **WHEN** a client requests an unsupported page size or invalid page number
- **THEN** the server normalizes the request to configured safe pagination bounds

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

### Requirement: Administrative audit history

The system SHALL write a sanitized administrative audit event for every successful Organization or Team creation, profile edit, and lifecycle change. The event SHALL identify the administrator and the affected Organization or Team, SHALL be committed atomically with the domain mutation, and SHALL exclude secrets and raw request data.

#### Scenario: Organization mutation succeeds

- **WHEN** an administrator successfully creates, edits, deactivates, or reactivates an Organization
- **THEN** the system commits an Organization-targeted audit event containing only allowlisted changed fields and state transitions

#### Scenario: Team mutation succeeds

- **WHEN** an administrator successfully creates, edits, deactivates, reactivates, or transfers a Team
- **THEN** the system commits a Team-targeted audit event containing only allowlisted changed fields, state transitions, and source and destination Organization context when transferred

#### Scenario: Mutation fails validation or authorization

- **WHEN** an Organization or Team mutation is rejected before changing domain state
- **THEN** the system does not write a success audit event for that mutation

#### Scenario: Audit write fails

- **WHEN** the audit event cannot be written during an Organization or Team mutation
- **THEN** the system rolls back the domain mutation and reports failure
