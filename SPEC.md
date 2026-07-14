# Organizational Teams and Matrix Management

## Product Vision

Build a people and organization system that accurately represents how modern organizations work. The application will give organizations a shared, trustworthy view of their people, teams, reporting relationships, and overlapping organizational structures.

The product is inspired by modern people-management platforms such as Lattice, but its initial focus is narrower: organizational modeling, employee directory information, and understandable visualization of matrix organizations.

The application must support people who belong to multiple teams, report through more than one management relationship, and appear in multiple named organizational hierarchies. It must not assume that an organization can be reduced to a single reporting tree.

## Product Goal

Enable every person in an organization to answer these questions clearly:

- Who is this person and what is their role?
- Which teams do they belong to?
- Who manages or supports their work?
- How is a team related to the rest of the organization?
- How does the organization look through different structural perspectives?
- What did these relationships look like at a relevant point in time?

For administrators, the product should provide a dependable way to maintain this information without forcing a matrix organization into an artificial single hierarchy.

## Product Theme

**One organization, multiple valid views.**

An organization is not one tree. Functional departments, product groups, geographic divisions, delivery teams, projects, committees, and communities may all describe real and useful structures at the same time.

The application will preserve these structures independently while making their relationships understandable. It will distinguish organizational visibility from authority over sensitive employee information.

## Guiding Principles

### Model reality without losing clarity

The system should support overlapping relationships while still providing understandable default views. Flexibility must not make the organization impossible to navigate or administer.

### Separate concepts that have different meanings

Team membership, team hierarchy, team leadership, and manager relationships are related but distinct. One must not silently imply another.

For example:

- Belonging to a team does not necessarily determine a person's manager.
- Leading a project team does not necessarily grant access to private employment information.
- A team appearing below another team in one hierarchy does not require the same relationship in another hierarchy.

### Treat time as part of organizational truth

Teams, memberships, and reporting relationships change. The product should preserve meaningful history and allow the organization to understand past and current structures. Future scheduling is a desirable extension of the same principle.

### Make permissions explicit

Being able to discover a person or see a relationship on an organizational chart is different from being allowed to access sensitive HR information or perform management actions.

### Prefer understandable constraints

The product should provide flexible matrix modeling with clear rules, validation, and terminology. It should avoid unrestricted structures whose meaning cannot be explained to employees or administrators.

### Grow from a strong organizational foundation

Future people-management capabilities should build on the organizational model rather than redefining it independently.

## Conceptual Organization Model

The application centers on four independent dimensions:

```text
                         Organization
                              |
          +-------------------+-------------------+
          |                   |                   |
        People              Teams             Hierarchies
          |                   |                   |
          +-------- memberships -----------------+
          |
          +-------- reporting relationships
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

A person may belong to any number of teams. A membership may communicate the person's role in that team, whether the membership is primary, an optional allocation of effort, and the period during which the membership applies.

Membership allocation is descriptive unless an organization explicitly chooses to enforce allocation rules. Not every valid team membership represents a division of working time.

### Reporting relationships

Reporting relationships connect people directly and do not depend on team placement.

The initial model recognizes:

- A primary or solid-line manager, representing the person's principal management relationship
- Dotted-line managers, representing additional matrix-management relationships

An active employee should normally have no more than one primary manager, while they may have multiple dotted-line managers. Valid exceptions, such as the head of the organization or an unassigned employee, must remain representable.

Dotted-line management does not automatically confer the same authority or data access as primary management.

### Named hierarchies

The organization may define multiple named hierarchies. Each hierarchy provides one coherent structural perspective, such as:

- Functional structure
- Product structure
- Geographic structure
- Legal-entity structure

A team may participate in multiple hierarchies and may have a different parent in each one.

```text
Functional hierarchy                 Product hierarchy

Company                              Product
`-- Engineering                      `-- Commerce
    `-- Platform                         `-- Checkout
        `-- Checkout
```

Within a single hierarchy, a team has at most one direct parent. This keeps each named perspective understandable as a tree or forest while still allowing the organization as a whole to express matrix structures.

A hierarchy must not contain cycles. Moving or removing a team in one hierarchy must not silently change its placement in another.

## Primary Product Experiences

### Organizational directory

Employees can discover people and teams, understand roles and memberships, and navigate the organization from either a person or team perspective.

### Person profile

A profile provides a coherent summary of a person's employment, team memberships, leadership responsibilities, and relevant reporting relationships, subject to permissions.

### Team profile

A team profile explains the team's purpose, members, leaders, hierarchy placements, and relationships to other teams.

### Hierarchy explorer

Users can select a named hierarchy and explore that structural view without confusing it with other valid views. The application should also make it easy to move between a team, its members, and the other hierarchies in which it appears.

### Reporting view

Users can understand primary and dotted-line reporting relationships independently from team hierarchies. Visual treatment should make the type of each relationship apparent.

### Organization administration

Authorized administrators can maintain people, teams, memberships, reporting relationships, and named hierarchies with validation and a clear record of organizational changes.

## Initial Product Scope

The first meaningful product should establish the organizational system of record and include:

- Organization and employee directory information
- Person and team profiles
- Typed teams
- Multiple simultaneous team memberships
- Primary and dotted-line reporting relationships
- Multiple named team hierarchies
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

Team leadership, hierarchy placement, and dotted-line reporting must not automatically grant unrestricted access to a person's private information. Organizations should be able to establish understandable policies without configuring permissions relationship by relationship.

## Organizational Integrity

The system should help organizations maintain a coherent model by making problems visible. Important integrity expectations include:

- No cycles within a named hierarchy
- No person reporting directly or indirectly to themselves through primary reporting relationships
- No more than one active primary manager for a person under normal policy
- No duplicate active membership for the same person and team
- Clear handling of inactive people and teams
- Historical relationships remain attributable and understandable
- Changes in one hierarchy do not create unintended changes in another

The application should warn about unusual but potentially valid situations rather than rejecting every nontraditional organization structure.

## Success Criteria

The product is successful when:

- Employees can find the right person or team and understand how they fit into the organization.
- A person can belong to several teams without their profile becoming ambiguous.
- Matrix reporting relationships are visible without being confused with team membership.
- Administrators can represent functional, product, geographic, or other structures simultaneously.
- Each hierarchy remains navigable and internally coherent.
- Organizational changes do not erase the history needed to understand past responsibilities.
- Access to sensitive information follows explicit policy rather than incidental chart placement.
- The organizational model can support future people-management products without major conceptual replacement.

## Open Product Decisions

The following questions should be resolved as the product is refined:

- Which team types are built in, and which can organizations define themselves?
- Is every organization required to designate a default hierarchy?
- Can a team appear more than once within the same hierarchy, or only once?
- Which historical views are available to ordinary employees versus administrators?
- How much authority does a dotted-line manager receive by default?
- Are membership allocations purely descriptive, optionally validated, or always enforced?
- How should contractors, external collaborators, and people between assignments appear?
- Which organizational changes may be scheduled in advance?
- What information is public within the organization by default?
- When does a team leader have membership-management authority?

## Future Direction

Once the organizational foundation is trusted, the product may expand into selected people-management workflows. Any expansion should preserve the central theme: one organization can have multiple valid structures, and every workflow should use the same explicit definitions of people, teams, hierarchies, memberships, reporting relationships, and authority.
