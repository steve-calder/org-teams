## ADDED Requirements

### Requirement: Authenticated-user organization chart access

The system SHALL provide an organization chart route outside the administration section to every authenticated user, SHALL require a valid authenticated session on every chart load, and SHALL expose no hierarchy mutation or administrative action through the chart experience. Access SHALL NOT require the global-administrator role or a linked Person record.

#### Scenario: Authenticated non-administrator opens the organization chart

- **WHEN** an authenticated user without global-administrator authorization requests the organization chart
- **THEN** the server returns the chart experience and authenticated-user navigation identifies it as available outside the administration section

#### Scenario: Authenticated administrator opens the user tool

- **WHEN** an authenticated global administrator requests the organization chart
- **THEN** the server returns the same user visualization without placing it under the administration route or adding administrative actions

#### Scenario: Anonymous visitor requests the organization chart

- **WHEN** a visitor without a valid authenticated session requests the organization chart directly
- **THEN** the server redirects the visitor to login without returning Organization hierarchy data

#### Scenario: Authenticated user manipulates the visual canvas

- **WHEN** an authenticated user selects, focuses, pans, zooms, or attempts to move a chart node
- **THEN** the system changes only local presentation state and does not mutate Team hierarchy data

#### Scenario: Authenticated user has associated Teams

- **WHEN** an authenticated user with a linked Person opens the chart without a valid Organization or Team selection
- **THEN** the system chooses one Team from that Person's ordinary memberships and managed Teams in stable Organization-name, Organization-UUID, Team-name, and Team-UUID order as both the pivot and inspected Team
- **AND** selects that Team's owning Organization

#### Scenario: Authenticated user has no associated Team

- **WHEN** an authenticated user without a linked Person or without any ordinary or managed Team opens the chart without a valid selection
- **THEN** the system falls back to a deterministic Organization-only chart state without denying access

### Requirement: Single-Organization chart selection

The chart SHALL display at most one selected Organization, one pivot Team, and one inspected Team at a time. The pivot Team SHALL define the required hierarchy path and validated `teamId` URL parameter, while the inspected Team SHALL define only selected styling and informational details. The chart SHALL offer all Organizations to every authenticated user in stable display-name and UUID order. An unknown or mismatched identifier SHALL NOT expose unrelated data and SHALL fall back to a valid deterministic selection or an explicit Organization-only state.

#### Scenario: Authenticated user selects an Organization

- **WHEN** an authenticated user chooses an Organization from the chart selector
- **THEN** the URL and chart update to show only Teams owned by that Organization

#### Scenario: Authenticated user opens a selected Organization URL

- **WHEN** an authenticated user opens a chart URL containing a valid Organization identifier
- **THEN** the matching Organization is selected and its hierarchy is presented

#### Scenario: Authenticated user opens a pivot Team URL

- **WHEN** an authenticated user opens a chart URL containing matching valid Organization and Team identifiers
- **THEN** the matching Organization and Team are selected, that Team becomes both pivot and inspected, and its complete ancestor path is presented

#### Scenario: Pivot Team does not belong to selected Organization

- **WHEN** URL or local presentation state identifies a Team outside the selected Organization
- **THEN** the system discards that pivot Team without returning or connecting unrelated Organization data

#### Scenario: No Organizations exist

- **WHEN** an authenticated user opens the chart and no Organizations exist
- **THEN** the system presents an empty state without attempting to render Team nodes

### Requirement: Deterministic Team hierarchy diagram

The chart SHALL represent the selected Organization as a visual root and currently revealed Teams as node cards connected only by authoritative direct parent-child relationships. It SHALL use a deterministic Dagre hierarchy layout, offer top-to-bottom and left-to-right orientations, and preserve stable Team ordering across equivalent focal and expansion state. It SHALL NOT connect a non-top-level Team directly to the Organization to compensate for hidden ancestors.

#### Scenario: Organization has multiple top-level Teams

- **WHEN** the authenticated user expands an Organization containing multiple Teams without parents
- **THEN** each top-level Team appears beneath the one visual Organization root
- **AND** descendants remain hidden until required by the focal path or explicitly expanded

#### Scenario: Authenticated user changes chart orientation

- **WHEN** the authenticated user switches between top-to-bottom and left-to-right orientation
- **THEN** the system recomputes the same nodes and parent-child edges in the selected orientation and fits the resulting diagram into view

#### Scenario: Equivalent hierarchy is loaded again

- **WHEN** unchanged Organization and Team data is loaded with the same chart settings
- **THEN** the system supplies and lays out nodes and edges in stable display-name and UUID order without arbitrary movement between loads

#### Scenario: Pivot Team has a hidden intermediate ancestor

- **WHEN** a pivot Team has one or more authoritative parent Teams
- **THEN** every intermediate parent is revealed and connected in order between the top-level Team and focal Team
- **AND** no synthetic Organization-to-focal-Team or ancestor-skipping edge is produced

#### Scenario: Selected Organization has no Teams

- **WHEN** the selected Organization owns no Teams
- **THEN** the chart presents the Organization context and an explicit empty-Team state

### Requirement: Read-only Team node context and selection

Each Team node SHALL present its name, friendly type, lifecycle status, manager summary, participant count, subordinate disclosure state, and pivot state, where the participant count includes ordinary memberships and includes the implicit manager once when assigned. Selecting a visible Team SHALL inspect it without changing the pivot Team or revealed graph. A separate explicit pivot control SHALL make a visible Team the pivot. Finding a hidden Team through search SHALL pivot to it so its path can be revealed. Team nodes and details SHALL NOT link to administration routes or expose hierarchy-editing controls.

#### Scenario: Authenticated user selects a Team node

- **WHEN** an authenticated user selects a Team in the chart
- **THEN** the Team is visually identified and described in an informational details panel containing its parent, direct children, and summary context without an administration link or editing control
- **AND** the system preserves the existing pivot Team, nodes, edges, expansion state, orientation, Dagre positions, viewport, and URL

#### Scenario: Authenticated user pivots from a Team node

- **WHEN** the authenticated user activates a non-pivot Team's `Pivot chart to this Team` control
- **THEN** that Team becomes both pivot and inspected, optional Organization and Team expansion is cleared, its complete ancestor path is revealed, the URL is updated, and the resulting graph is fit into view

#### Scenario: Current pivot Team is rendered

- **WHEN** a Team node represents the current pivot Team
- **THEN** the node identifies its pivot state and does not expose a redundant pivot action

#### Scenario: Inspected Team becomes hidden

- **WHEN** collapse or lifecycle filtering removes the inspected Team while the pivot Team remains valid
- **THEN** the inspected-Team selection and details are cleared without changing the pivot Team or its required path

#### Scenario: Team has an assigned manager and ordinary members

- **WHEN** a Team node is rendered for a Team with an assigned manager and ordinary memberships
- **THEN** the node identifies the manager and shows a participant count equal to ordinary memberships plus one implicit manager

#### Scenario: Team lacks optional context

- **WHEN** a Team has no manager, no parent, no children, or no participants
- **THEN** the node and details panel communicate the absent context without inventing relationships

### Requirement: Progressive hierarchy disclosure

The chart SHALL initially reveal only the Organization root and the pivot Team's complete ancestor path when a pivot Team exists. The Organization and Team nodes SHALL provide presentation-only disclosure controls that reveal direct subordinate Teams one level at a time without mutating hierarchy data. Unrelated roots, siblings, and descendants SHALL remain hidden until explicitly revealed.

#### Scenario: Authenticated user expands the Organization

- **WHEN** the authenticated user activates the Organization disclosure control
- **THEN** all top-level Teams are revealed beneath the Organization using direct Organization-to-top-level edges

#### Scenario: Authenticated user collapses the Organization

- **WHEN** the authenticated user collapses the Organization while a pivot Team exists
- **THEN** optional top-level Teams are hidden while the top-level Team required by the pivot path remains visible

#### Scenario: Authenticated user expands a Team

- **WHEN** the authenticated user activates disclosure on a Team with direct children
- **THEN** all of that Team's direct children are revealed with authoritative parent-child edges
- **AND** grandchildren remain hidden until their own parent is explicitly expanded or they are required by the focal path

#### Scenario: Authenticated user collapses a Team

- **WHEN** the authenticated user collapses a Team with revealed descendants
- **THEN** optional descendant branches are hidden recursively
- **AND** any descendant nodes and edges required by the pivot Team's ancestor path remain visible

#### Scenario: Authenticated user changes pivot Team

- **WHEN** the authenticated user explicitly pivots or searches for another Team
- **THEN** optional expansion state is cleared and the new pivot Team's complete ancestor path is revealed

### Requirement: Team search and lifecycle filtering

The chart SHALL let authenticated users search Teams by display name across the selected Organization, choose a matching result as the pivot and inspected Team, and toggle whether inactive Teams are displayed. Search SHALL NOT require every matching or nonmatching Team to be rendered before selection. Hiding inactive Teams SHALL remove their nodes and associated edges from both visual and tree views while retaining the selected Organization context.

#### Scenario: Authenticated user searches for a Team

- **WHEN** the authenticated user enters a Team name query that has matches in the selected Organization
- **THEN** the system presents matching Teams in stable display-name and UUID order
- **AND** choosing a result makes that Team pivot and inspected and reveals its complete ancestor path without automatically revealing siblings or descendants

#### Scenario: Search has no matches

- **WHEN** the Team name query matches no displayed Team
- **THEN** the system reports that no Teams match without replacing the Organization hierarchy with an empty chart

#### Scenario: Authenticated user excludes inactive Teams

- **WHEN** the authenticated user turns off display of inactive Teams
- **THEN** inactive Team nodes and their associated edges are omitted from both views and any now-hidden pivot, inspection selection, or expansion state is normalized

### Requirement: Navigable and accessible chart experience

The visual chart SHALL provide fit-to-view, zoom, pan, and keyboard-operable inspection, pivot, and disclosure controls and remain usable across supported desktop pointer and keyboard input. Inspection and pivot actions SHALL have distinct accessible names. The experience SHALL also provide a semantic nested-list tree view containing equivalent pivot hierarchy, inspection, disclosure behavior, and summary context, and SHALL preserve that tree as a functional alternative when the interactive canvas is unavailable or unsuitable for the viewport.

#### Scenario: Authenticated user navigates a large chart

- **WHEN** the hierarchy extends beyond the available chart viewport
- **THEN** the authenticated user can pan, zoom, and fit the complete displayed hierarchy without changing domain data

#### Scenario: Authenticated user chooses tree view

- **WHEN** the authenticated user activates the Tree view control
- **THEN** the system presents the currently revealed hierarchy as keyboard-navigable nested semantic lists with distinct Team-inspection and pivot actions, accessible disclosure controls, and equivalent type, status, manager, and participant context without administration links

#### Scenario: Authenticated user operates Team actions by keyboard

- **WHEN** keyboard focus reaches a visible Team's inspection, pivot, or subordinate disclosure control
- **THEN** each action has a distinct accessible name and can be activated without triggering either of the other Team actions

#### Scenario: Interactive chart cannot initialize

- **WHEN** client-side chart rendering is unavailable or fails to initialize
- **THEN** the server-rendered controls and semantic tree remain available for browsing the selected Organization

#### Scenario: Authenticated user uses a narrow viewport

- **WHEN** the chart route is displayed at a typical mobile viewport width
- **THEN** Organization selection, search, view selection, and Team context remain readable and operable without page-level horizontal scrolling
