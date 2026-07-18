## ADDED Requirements

### Requirement: Server-resolved personal dashboard scope

The system SHALL build the authenticated homepage dashboard only for the Person linked to the current server-resolved session. It SHALL NOT accept a client-supplied Person identifier as dashboard identity and SHALL NOT return personal Organization or Team relationships to an anonymous request.

#### Scenario: Authenticated Person opens their dashboard

- **WHEN** an authenticated request with a linked Person loads `/`
- **THEN** the server resolves dashboard data for that linked Person from trusted request context

#### Scenario: Client attempts to claim another Person

- **WHEN** an authenticated client supplies another Person identifier while loading the homepage
- **THEN** the system ignores it and continues to return only the session-linked Person's dashboard

#### Scenario: Anonymous visitor opens the homepage

- **WHEN** a request without a valid session loads `/`
- **THEN** the server does not query or return any Person's dashboard relationships

### Requirement: Cross-Organization participation summary

The personal dashboard SHALL group the Person's current ordinary Team memberships and current managed Teams by Organization. It SHALL include every Organization represented by those relationships, permit participation across several Organizations, and SHALL NOT designate an Organization or Team as primary.

#### Scenario: Person participates in several Organizations

- **WHEN** a Person has current Team relationships in more than one Organization
- **THEN** the dashboard presents a distinct group for every represented Organization and marks none as primary

#### Scenario: Person has several Teams in one Organization

- **WHEN** a Person has multiple current Team relationships owned by one Organization
- **THEN** the dashboard presents those Teams together in that Organization's group

#### Scenario: Dashboard ordering is stable

- **WHEN** the dashboard contains several Organizations or Teams
- **THEN** it orders Organization groups and their Team entries deterministically by display name and UUID

### Requirement: Personal Team relationship context

The dashboard SHALL present each current Team relationship once with the Team name, Organization name, relationship kind, and either the ordinary membership's Team-specific role or a manager designation. For an ordinary membership, it SHALL show the active contextual manager when one is derived from that Team and SHALL identify when no current manager is available. It SHALL NOT display a direct or primary reporting relationship.

#### Scenario: Person is an ordinary Team member

- **WHEN** the Person has a current ordinary membership in a Team with an active manager
- **THEN** the dashboard shows the membership role and identifies that manager in the context of that Team

#### Scenario: Ordinary membership has no current manager

- **WHEN** a current ordinary membership's Team has no active manager
- **THEN** the dashboard identifies that no manager is currently available for that Team context

#### Scenario: Person manages a Team

- **WHEN** the Person is the current manager of a Team
- **THEN** the dashboard shows that Team once with a manager designation and does not create or imply an ordinary membership role

#### Scenario: Person has different Team contexts

- **WHEN** the Person's Team relationships produce different roles or contextual managers
- **THEN** the dashboard preserves each Team-specific context and marks none as primary

### Requirement: Current relationship lifecycle

The dashboard SHALL represent current organizational placement using only active People, active Organizations, active Teams, active ordinary membership endpoints, and active manager assignments. Retained relationships involving inactive records SHALL remain available to administration but SHALL NOT appear as current dashboard participation.

#### Scenario: Membership endpoint is inactive

- **WHEN** an ordinary membership's Person, Team, or Organization is inactive
- **THEN** the dashboard excludes that membership from current participation

#### Scenario: Managed Team is inactive

- **WHEN** the Person manages an inactive Team or a Team owned by an inactive Organization
- **THEN** the dashboard excludes that managed Team from current participation

#### Scenario: Inactive relationship becomes current again

- **WHEN** a retained relationship's Person, Team, Organization, and applicable manager assignment become active again
- **THEN** the dashboard includes the relationship from the existing source records without creating a dashboard-specific record

### Requirement: Personal dashboard experience

The authenticated homepage SHALL greet the Person by their product-facing display name, summarize their current Organization and Team participation, and provide responsive, accessible Organization and Team groupings. The dashboard SHALL remain read-only, SHALL preserve the shared header's administrator link for administrators, and SHALL provide a clear empty state when the Person has no current Team relationships.

#### Scenario: Person has current Team relationships

- **WHEN** an authenticated Person with one or more current Team relationships opens `/`
- **THEN** the page greets them and presents their Organization groups and Team contexts in a readable dashboard

#### Scenario: Person has no current Team relationships

- **WHEN** an authenticated Person with no current Team relationships opens `/`
- **THEN** the page greets them and explains that no current Team assignments are available without showing anonymous marketing copy or editing controls

#### Scenario: Administrator opens their dashboard

- **WHEN** an authenticated Person with global administrator authorization opens `/`
- **THEN** the page shows their personal dashboard while the shared header continues to provide the separate Admin navigation

#### Scenario: Keyboard or mobile user views the dashboard

- **WHEN** the dashboard is used with keyboard navigation or at a typical mobile viewport width
- **THEN** headings, groupings, and any interactive shell controls remain understandable, focusable where applicable, and free of horizontal scrolling
