## Why

Organizations can define Teams but cannot yet express how those Teams relate or who manages them. Adding one parent-child Team hierarchy per Organization and a manager for each Team establishes a clear administrative structure from which reporting relationships can later be derived without maintaining a separate person-to-person reporting graph.

## What Changes

- Allow each Team to have at most one parent Team in the same Organization, with no parent representing a top-level Team.
- Prevent self-parenting and direct or indirect cycles so every Organization remains an understandable tree or forest.
- Allow each Team to designate at most one active Person as its manager.
- Derive manager-to-manager supervision from the hierarchy: a subordinate Team's manager is supervised by its direct parent Team's manager, with no primary-manager designation.
- Prevent the same Person from managing Teams in the same ancestor-descendant chain, which would create derived self-supervision.
- Add global-administrator controls to assign or clear a Team's parent and manager and to browse the hierarchy from Organization and Team detail pages.
- Block Team transfers that still have a parent or children, block parent Team deactivation while it has active children, and prevent an active Team manager from being made inactive.
- Audit successful parent and manager changes atomically using the existing Team-targeted administrative audit history.
- Defer Team membership administration and member-to-manager reporting views; People are not yet scoped to Organizations and Team memberships do not yet exist.

## Capabilities

### New Capabilities

- `team-hierarchy-administration`: Defines the single Team hierarchy per Organization, Team manager assignments, derived manager supervision, integrity validation, administrator controls, hierarchy presentation, and audit behavior.

### Modified Capabilities

- `organization-team-administration`: Extends Team lifecycle and transfer requirements so existing parent-child relationships cannot become invalid.
- `people-admin-console`: Prevents deactivation of a Person while they manage an active Team.

## Impact

- Extends the Team persistence model with nullable self-referencing parent and Person manager foreign keys, indexes, relations, and a committed PostgreSQL migration.
- Adds hierarchy queries, transactional validation, cycle detection, manager validation, and concurrency-safe mutations to server-only administration services.
- Updates existing Team transfer, Team lifecycle, and Person lifecycle services with hierarchy-aware integrity checks.
- Extends `/admin/organizations/[organizationId]` with a hierarchy view and `/admin/teams/[teamId]` with parent and manager controls and related-Team context.
- Adds schema, service, route, component, and browser coverage for hierarchy navigation, cycle rejection, manager supervision, authorization, lifecycle and transfer conflicts, and audit atomicity.
- Introduces no new runtime dependency and no employee-facing or organization-scoped authorization boundary.
