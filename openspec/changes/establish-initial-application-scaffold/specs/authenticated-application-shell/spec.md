## ADDED Requirements

### Requirement: Authenticated application layout
The application SHALL provide an authenticated, responsive layout with navigation locations for the directory, people, teams, hierarchies, reporting, and administration. Navigation visibility SHALL not by itself grant access to protected operations.

#### Scenario: Linked member enters the application
- **WHEN** an authenticated and linked organization member opens the application root
- **THEN** the member sees the application identity, selected organization context, primary navigation, and a sign-out control

#### Scenario: Member lacks administration permission
- **WHEN** an ordinary member attempts to open an administration route directly
- **THEN** the server denies the operation even if the client navigation was manipulated

### Requirement: Accessible UI foundation
Shared interactive controls SHALL use accessible primitives or equivalent application components, support keyboard operation, expose meaningful labels, and preserve visible focus. Color SHALL not be the sole means of distinguishing relationship types.

#### Scenario: Keyboard user navigates the shell
- **WHEN** a user navigates the application shell without a pointing device
- **THEN** all shell controls are reachable in a logical order and the focused control is visibly identifiable

#### Scenario: Relationship types are displayed
- **WHEN** primary and dotted-line relationships appear in the same view
- **THEN** text, line style, iconography, or another non-color cue distinguishes their types

### Requirement: Read-only named hierarchy proof
The scaffold SHALL render one selected named hierarchy from persisted organization data using Svelte Flow and automatic tree layout. The view SHALL support fit-to-view, pan, zoom, and navigation from a rendered team to a stable team route.

#### Scenario: Seeded hierarchy is opened
- **WHEN** an authorized member opens the hierarchy proof for a seeded named hierarchy
- **THEN** active teams and parent-child placements are rendered as a coherent tree or forest with no placement imported from another hierarchy

#### Scenario: Hierarchy has several roots
- **WHEN** the selected hierarchy contains more than one root team
- **THEN** every root and its descendants remain visible and independently connected within the same view

### Requirement: Visualization remains presentation-only
The hierarchy visualization SHALL consume a serializable hierarchy projection and SHALL NOT own organizational integrity rules or persist arbitrary node coordinates as hierarchy truth.

#### Scenario: Hierarchy data is invalid
- **WHEN** the server cannot produce a valid authorized hierarchy projection
- **THEN** the page displays an actionable error state rather than attempting to repair or persist the hierarchy in the browser

### Requirement: Scaffold states are explicit
The shell SHALL provide intentional loading, empty, unauthorized, account-not-linked, and error states for the foundational routes.

#### Scenario: Organization has no hierarchy data
- **WHEN** an authorized member opens the hierarchy route for an organization without a configured hierarchy
- **THEN** the application displays an empty state explaining that no hierarchy is available rather than an empty canvas without context

