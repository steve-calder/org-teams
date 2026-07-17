## Why

Org Teams can administer people but cannot yet define the organizations and teams those people will eventually participate in. Establishing multi-organization records and organization-owned teams now creates the required ownership foundation without prematurely introducing employment, membership, leadership, reporting, or hierarchy relationships.

## What Changes

- Add Organization as a first-class administrative record with a name, optional description, active/inactive lifecycle status, timestamps, validation, and audit history.
- Add Team as a first-class administrative record owned by exactly one Organization, with a name, optional purpose, controlled team type, active/inactive lifecycle status, timestamps, validation, and audit history.
- Add administrator-only organization and team directories with search, pagination, status filtering, and team filtering by owning organization and type.
- Add administrator-only create, detail, edit, and lifecycle controls for Organizations and Teams.
- Prevent active Teams from being created or reactivated under an inactive Organization, and block Organization deactivation until every owned Team is inactive or has been moved elsewhere.
- Add a dedicated, confirmed Team-transfer workflow that changes ownership to another active Organization without changing Team identity or lifecycle status.
- Use lifecycle deactivation rather than hard deletion so foundational records remain available for future historical relationships and auditability.
- Keep administrator authorization global for this change; organization-scoped administration is deferred until organization participation and authorization policies are modeled.
- Explicitly exclude Person employment or organization assignment, team membership, team leadership, team hierarchy, reporting relationships, effective-dated relationships, and employee-facing organization or team directory experiences.

## Capabilities

### New Capabilities

- `organization-team-administration`: Defines the multi-organization catalog, organization-owned team definitions, controlled team types, lifecycle integrity, administrator experiences, and administrative audit behavior.

### Modified Capabilities

None.

## Impact

- Adds Organization and Team domain schemas, indexes, relations, and a committed PostgreSQL migration.
- Extends administrative audit targeting to organization and team mutations while retaining sanitized metadata.
- Adds server-only organization and team administration services and new routes under `/admin/organizations` and `/admin/teams`.
- Extends the existing administrator navigation and route-guarded console while continuing to use the global Better Auth administrator role.
- Adds unit, database, route, and browser coverage for authorization, validation, filtering, ownership and transfer integrity, lifecycle constraints, concurrency, and audit records.
