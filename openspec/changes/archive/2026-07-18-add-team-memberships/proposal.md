## Why

People and Teams exist, and Teams can have managers, but administrators cannot yet record the ordinary Team memberships that make the hierarchy useful. Adding explicit memberships with Team-specific roles completes the source data needed to show who belongs to each Team and derive contextual reporting without introducing a separate reporting structure.

## What Changes

- Add administrator controls to assign an active Person to an active Team with a required free-text role representing that Person's job title or function on the Team.
- Allow a Person to belong to any number of Teams, including Teams owned by different Organizations, while preventing duplicate membership for the same Person and Team.
- Treat a Team's manager as an implicit member of that Team, include the manager once in membership views, and prevent a redundant ordinary membership for the manager.
- Reconcile an existing ordinary membership when that Person becomes the Team manager so manager and membership administration cannot produce duplicate Team assignments.
- Show and manage memberships from both Person and Team administration experiences with server-side authorization, validation, lifecycle safeguards, and sanitized audit history.
- Use current memberships only in this initial capability; primary memberships, allocation percentages, effective dating, and controlled role catalogs remain out of scope.

## Capabilities

### New Capabilities

- `team-membership-administration`: Defines Team membership persistence, free-text roles, manager-as-member behavior, cross-Organization participation, administrator workflows, integrity rules, and audit history.

### Modified Capabilities

- `team-hierarchy-administration`: Changes manager assignment from explicitly not inferring Team membership to making the manager an implicit Team member and reconciling any redundant ordinary membership.
- `people-admin-console`: Extends Person lifecycle safeguards and the Person detail experience to account for Team memberships.

## Impact

- Adds a Person-to-Team membership table, constraints, migrations, repository operations, and membership audit event support.
- Extends Team manager mutations so promotion reconciles an ordinary membership atomically.
- Extends administrator Person and Team detail loaders, actions, forms, rosters, and tests.
- Affects contextual reporting inputs by making ordinary membership records available while preserving the Team hierarchy and manager assignment as the only reporting model.
