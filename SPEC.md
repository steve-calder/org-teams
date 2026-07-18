# Organizational Teams and Matrix Management

## Product Vision

Build a people and organization system that accurately represents how modern organizations work. The application will give organizations a shared, trustworthy view of their people, teams, reporting relationships, and team structure.

The product is inspired by modern people-management platforms such as Lattice, but its initial focus is narrower: organizational modeling, employee directory information, and understandable visualization of matrix organizations.

The application must support people who belong to multiple teams and may therefore work with more than one manager. Within each organization, teams form one understandable hierarchy. Reporting relationships are derived from team memberships, each team's manager, and the parent-child team structure rather than maintained as a separate person-to-person reporting structure.

## Product Goal

Enable every person in an organization to answer these questions clearly:

- Who is this person and what is their role?
- Which teams do they belong to?
- Who manages or supports their work?
- How is a team related to the rest of the organization?
- Where does this team sit within the organization?
- What did these relationships look like at a relevant point in time?

For administrators, the product should provide a dependable way to maintain this information through a clear team hierarchy, team memberships, and Team manager assignments without also maintaining a separate reporting structure for People.

## Product Theme

**Clear team structure, flexible people relationships.**

Each organization has one team hierarchy. A team may report to another team, and top-level teams may exist without a parent. This produces an understandable tree or forest without requiring administrators to maintain multiple competing structural views.

People may belong to several teams and work with the manager of each Team. No Team membership or manager is designated as primary in the initial model. The application will distinguish these derived reporting relationships from authority over sensitive employee information.

## Guiding Principles

### Model reality without losing clarity

The system should support overlapping relationships while still providing understandable default views. Flexibility must not make the organization impossible to navigate or administer.

### Derive reporting from team structure

Team membership, Team manager assignments, and the team hierarchy are the source of reporting relationships. The system should derive who reports to whom from those maintained relationships instead of requiring administrators to keep a second reporting graph synchronized.

For example:

- A Team member reports to that Team's manager in the context of that membership.
- A subordinate Team's manager reports to the parent Team's manager.
- A person who belongs to multiple Teams may have multiple contextual managers; none is treated as primary.
- Managing a Team does not necessarily grant access to private employment information.

### Treat time as part of organizational truth

Teams, memberships, and Team manager assignments change. The product should preserve meaningful history and allow the organization to understand past and current reporting relationships derived from that structure. Future scheduling is a desirable extension of the same principle.

### Make permissions explicit

Being able to discover a person or see a relationship on an organizational chart is different from being allowed to access sensitive HR information or perform management actions.

### Prefer understandable constraints

The product should provide flexible matrix modeling with clear rules, validation, and terminology. It should avoid unrestricted structures whose meaning cannot be explained to employees or administrators.

### Grow from a strong organizational foundation

Future people-management capabilities should build on the organizational model rather than redefining it independently.

## Conceptual Organization Model

The application centers on distinct organizational concepts and relationships:

```text
                         Organization
                              |
                   parent-child hierarchy
                              |
                            Teams
                         /         \
              memberships       manager
                       \         /
                         People
                            |
                 derived reporting view
```

### People and employment

A person represents a human identity. Their employment represents their relationship with a particular organization, including their organizational role and status. Keeping these ideas conceptually distinct leaves room for contractors, rehires, and future multi-organization scenarios.

### Teams

A team is a named group of people organized around a durable or temporary purpose. Teams may represent concepts such as:

- Departments
- Functional teams
- Product or delivery teams
- Projects
- Geographic groups
- Committees
- Communities of practice

Team types communicate purpose and may carry different expectations, but all teams participate in a consistent directory experience.

### Team memberships

A person may belong to any number of teams. A membership may communicate the person's role in that team, an optional allocation of effort, and the period during which the membership applies. The initial model does not designate a primary Team membership.

Membership allocation is descriptive unless an organization explicitly chooses to enforce allocation rules. Not every valid team membership represents a division of working time.

### Team managers and derived reporting

Each Team may have one manager. Reporting relationships are calculated from Team memberships, Team manager assignments, and the Team's position in the organization hierarchy; administrators do not maintain direct reporting links between People.

The initial model applies these rules:

- A Team member reports to that Team's manager in the context of the membership.
- A Team manager does not report to themselves as a member of the Team they manage.
- The manager of a subordinate Team reports to the manager of its direct parent Team.
- A top-level Team manager has no supervisor derived from the Team hierarchy.
- If a Team has no manager, its members have no reporting relationship from that Team and its subordinate Team managers have no supervisor through that direct parent.
- A person who belongs to or manages multiple Teams may have multiple contextual reporting relationships, with none designated as primary.

Derived reporting relationships communicate organizational supervision but do not automatically confer access to private employment information or management actions. Those permissions remain explicit.

### Team hierarchy

Each organization has one hierarchy of teams. A team may have one direct parent team within the same organization. A team without a parent is a top-level team, and an organization may have more than one top-level team.

```text
Organization
|-- Engineering
|   |-- Platform
|   `-- Applications
|-- Operations
`-- Advisory Committee
```

The hierarchy must not contain cycles. A Team cannot be its own parent, directly or indirectly, and a parent and child must belong to the same Organization. Because the hierarchy drives management supervision, the same Person cannot manage both a Team and one of its ancestor or descendant Teams. Team hierarchy and manager assignments do not by themselves grant permission to access sensitive information.

## Primary Product Experiences

### Organizational directory

Employees can discover people and teams, understand roles and memberships, and navigate the organization from either a person or team perspective.

### Person profile

A profile provides a coherent summary of a person's employment, Team memberships, Teams they manage, and reporting relationships derived from those Teams, subject to permissions.

### Team profile

A Team profile explains the Team's purpose, manager, members, parent Team, and child Teams.

### Team hierarchy explorer

Users can explore an organization's team hierarchy and move easily between a team, its parent, its child teams, and its members.

### Reporting view

Users can understand each person's contextual managers and reports as derived from Team memberships, Team managers, and the hierarchy. The view should identify the Team context that produced each relationship.

### Organization administration

Authorized administrators can maintain People, Teams, parent-child Team relationships, Team managers, and memberships. Reporting views update from those sources without a separate reporting-relationship administration workflow.

## Initial Product Scope

The first meaningful product should establish the organizational system of record and include:

- Organization and employee directory information
- Person and team profiles
- Typed teams
- Multiple simultaneous team memberships
- At most one manager per Team and reporting relationships derived from Team context
- One parent-child team hierarchy per organization
- Person-centered and team-centered organizational views
- Effective periods and meaningful history for organizational relationships
- Clear administrative, manager, and employee access boundaries
- Bulk onboarding and export of organizational information
- Auditability of administrative changes

## Product Boundaries

The initial product is not intended to be a complete HR platform. The following areas are outside the initial scope:

- Payroll, tax, and benefits administration
- Applicant tracking and recruiting
- Compensation planning
- Performance review cycles
- Goals and OKRs
- Engagement surveys
- Learning management
- Workforce and vacancy planning
- Time tracking and scheduling
- General-purpose project management

These capabilities may be explored later, but they should consume the shared people and organization model rather than introduce competing definitions of teams or reporting relationships.

## Permissions and Trust

Organizational structure is broadly useful, while employment data may be highly sensitive. The product must distinguish at least these concerns:

- Discovering that a person or team exists
- Viewing public organizational details
- Viewing a reporting or membership relationship
- Viewing private employment information
- Managing a team or its membership
- Acting as a person's manager
- Administering the organization

Team management and hierarchy placement must not automatically grant unrestricted access to a Person's private information. Organizations should be able to establish understandable policies without configuring permissions relationship by relationship.

## Organizational Integrity

The system should help organizations maintain a coherent model by making problems visible. Important integrity expectations include:

- No cycles within an organization's team hierarchy
- A parent and child Team always belong to the same Organization
- A Team has no more than one direct parent
- No Person manages both a Team and one of that Team's ancestors or descendants
- No derived reporting relationship makes a Person their own supervisor
- No Team has more than one active manager
- No duplicate active membership for the same person and team
- Clear handling of inactive people and teams
- Historical relationships remain attributable and understandable
- Team transfer and lifecycle changes do not leave invalid parent-child relationships

The application should warn about unusual but potentially valid situations rather than rejecting every nontraditional organization structure.

## Success Criteria

The product is successful when:

- Employees can find the right person or team and understand how they fit into the organization.
- A person can belong to several teams without their profile becoming ambiguous.
- Every derived reporting relationship identifies the Team context that produced it.
- Administrators can arrange an organization's teams into an understandable tree or forest.
- Each organization's team hierarchy remains navigable and internally coherent.
- Organizational changes do not erase the history needed to understand past responsibilities.
- Access to sensitive information follows explicit policy rather than incidental chart placement.
- The organizational model can support future people-management products without major conceptual replacement.

## Open Product Decisions

The following questions should be resolved as the product is refined:

- Which team types are built in, and which can organizations define themselves?
- Should transferring a Team to another Organization be blocked until its parent and child relationships are removed?
- How should deactivating a Team affect its current parent and child relationships?
- Which historical views are available to ordinary employees versus administrators?
- How much authority does a Team manager receive by default?
- Are membership allocations purely descriptive, optionally validated, or always enforced?
- How should contractors, external collaborators, and people between assignments appear?
- Which organizational changes may be scheduled in advance?
- What information is public within the organization by default?
- When does a Team manager have membership-management authority?

## Future Direction

Once the organizational foundation is trusted, the product may expand into selected people-management workflows. Multiple structural views or directly assigned reporting relationships could be reconsidered later if real customer needs justify the additional complexity. Any expansion should continue to use explicit definitions of People, Teams, the Team hierarchy, memberships, Team managers, derived reporting relationships, and authority.
