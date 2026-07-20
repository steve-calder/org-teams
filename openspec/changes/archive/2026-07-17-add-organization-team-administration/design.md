## Context

The application currently has a global Better Auth administrator role, a first-class Person record, a guarded `/admin` area, server-side Person administration services, and sanitized administrative audit events. It does not have Organization or Team persistence. Person is intentionally not scoped to an Organization yet, even though the product vision anticipates a future Employment relationship between them.

This change must establish a multi-organization catalog and make Organization ownership intrinsic to Team identity without implying any Person employment, team membership, leadership, reporting, or hierarchy relationships. The records will initially be visible only to global administrators; tenant-aware sessions and organization-scoped authorization require participation models that do not yet exist.

## Goals / Non-Goals

**Goals:**

- Persist multiple independently managed Organizations.
- Persist Teams that always belong to exactly one Organization.
- Provide guarded, searchable, paginated administrative directories and detail forms for both record types.
- Use controlled team-type codes while allowing the set to evolve in later changes.
- Preserve inactive definitions and audit every administrative mutation.
- Establish lifecycle behavior that blocks Organization deactivation until active Teams are moved or inactivated, without silently rewriting child Team records.
- Follow the existing server authorization, service, transaction, route, UI, and test conventions.

**Non-Goals:**

- Assigning a Person to an Organization or introducing Employment.
- Team membership, leadership, reporting relationships, hierarchy placement, or effective periods.
- Organization-scoped administrators, tenant-aware sessions, or per-organization authorization policies.
- Employee-facing Organization or Team directories and profiles.
- Custom team-type administration, hard deletion, slugs, domains, branding, or external identifiers.

## Decisions

### Organization is a first-class multi-record domain entity

Add an `organization` table with UUID identity, required display name, nullable description, active/inactive status, and timezone-aware creation and update timestamps. UUID identity, rather than name, defines uniqueness; organizations with the same display name are allowed because names are not reliable tenant identifiers.

This is preferred over a singleton application-settings record because the product is intended to model multiple organizations and a singleton would make later ownership and authorization migration harder. It is also preferred over adding tenant context throughout the application now because People and administrator participation have not been modeled yet.

### Team ownership is mandatory and changes only through an explicit transfer

Add a `team` table with UUID identity, non-null `organization_id`, required display name, nullable purpose, required type code, active/inactive status, and timestamps. The foreign key uses restrictive deletion behavior, and the product exposes no hard-delete operation. Team names are not unique, including within one Organization, because distinct teams may legitimately share a display name in a matrix organization.

The owning Organization is selected when a Team is created and is not editable in the normal Team profile form. A separate confirmed transfer action moves a Team to another active Organization while preserving its UUID, definition, type, and lifecycle status. The transfer records source and destination Organization IDs in the audit event. This explicit action makes the ownership change visible and leaves a stable seam for future membership, hierarchy, authorization, and history validation.

Mandatory ownership and transfer are included now because Organization containment is the tenancy boundary, not one of the deferred organizational graph relationships. A dedicated transfer is preferred over an ordinary Organization dropdown because changing ownership has broader meaning than editing descriptive fields and must not occur accidentally.

### Team types use controlled, evolvable machine codes

The initial codes are `department`, `functional`, `product`, `delivery`, `project`, `geographic`, `committee`, `community`, and `other`. Services expose friendly labels and reject unrecognized codes. Persistence uses constrained text rather than a PostgreSQL enum so later additions or migrations do not require enum-specific deployment handling. Custom administrator-defined types remain out of scope.

This is preferred over free-form values, which would immediately fragment filtering and meaning, and over a team-type table, which would introduce a third administrative domain before its lifecycle and rename semantics are understood.

### Lifecycle integrity prevents inactive Organizations from owning active Teams

Organization and Team each store their own `active` or `inactive` lifecycle status. Inactivation is reversible and no hard-delete controls are provided. An Organization cannot be deactivated while it owns any active Team. Administrators must first inactivate each active Team or transfer it to another active Organization. Organization deactivation never cascades status updates to Teams.

Creating an active Team, reactivating an inactive Team, or transferring any Team requires an active destination Organization. The Organization deactivation service locks the Organization row and checks for active Teams in the same transaction. Team creation and activation lock the owning Organization; Team transfer locks the Team plus source and destination Organizations in deterministic UUID order. This shared locking protocol prevents concurrent creation, activation, transfer, or Organization deactivation from violating the lifecycle invariant.

Blocking is preferred over cascading because deactivation must be an explicit decision for each active Team, and an unnoticed cascade could make operational Teams unavailable. The Organization detail experience reports the blocking active Teams with links to move or inactivate them. Once none remain, the administrator can retry Organization deactivation.

### Global authorization remains the temporary administrative boundary

All new loads and actions use the existing server-side `requireAdmin` boundary under the guarded `/admin` layout. The global administrator role can manage every Organization and Team. UI navigation visibility remains presentational and is not treated as authorization.

Organization-scoped administration is deliberately deferred. Implementing it honestly requires a model connecting a user or Person to an Organization and defining scoped roles; inferring scope from Team ownership or accepting an organization identifier from the client would create an unsafe authorization boundary.

### Domain services own validation, queries, transactions, and audit writes

Add server-only administration services for Organization and Team listing, lookup, validation, creation, editing, lifecycle changes, and Team transfer. Direct route actions remain thin adapters from form data to these services. Names are trimmed, required, and limited to 160 characters; optional description and purpose values are trimmed, normalized to null, and limited to 2,000 characters. Pagination is bounded and stable, and directory queries use explicit allowlists and indexes.

Organization and Team mutations write their administrative audit event in the same database transaction as the domain mutation. Extend `admin_audit_event` with nullable Organization and Team targets and indexes while retaining Person and authentication targets. Audit metadata contains only changed field names and non-secret lifecycle/type transitions. Target columns remain explicit foreign keys rather than using an unverified polymorphic target ID.

### Administrative routes mirror the established People console

Use `/admin/organizations` and `/admin/organizations/[organizationId]` for the Organization directory and detail experience. Use `/admin/teams` and `/admin/teams/[teamId]` for the Team directory and detail experience. The Team detail route exposes the separately confirmed transfer action. Team list state supports organization, type, and status filters; both directories support bounded pagination and name search. Admin navigation exposes People, Organizations, and Teams without changing the shared employee-facing application shell contract.

Server loads resolve records by immutable UUID and return 404 for unknown IDs. Every action repeats administrator authorization, treats client-supplied identifiers as untrusted, and returns validation or lifecycle conflicts without partial writes.

## Risks / Trade-offs

- **[People temporarily remain outside the Organization model]** → Keep new experiences administrator-only and state the missing Employment capability explicitly; do not infer assignment from authentication, Team ownership, or global admin access.
- **[Global administrators can access every Organization]** → Treat this as a documented bootstrap boundary and introduce scoped authorization only with an explicit organization-participation model.
- **[Duplicate names can confuse administrators]** → Display immutable context such as owning Organization and team type in results, use UUID routes, and permit future duplicate-name warnings without making names identifiers.
- **[An Organization can be difficult to deactivate when it owns many active Teams]** → Return the blocking Team count and records, link administrators to each Team, and support explicit transfer or inactivation before retrying.
- **[Team transfer can later affect relationships that do not exist yet]** → Use a dedicated service and confirmed action now so future membership, hierarchy, and authorization checks can be added at one boundary.
- **[Concurrent Organization and Team lifecycle or transfer changes can race]** → Use a shared, deterministic row-locking protocol and cover creation, activation, transfer, and deactivation conflicts with database tests.
- **[Controlled text can drift from application validation]** → Add a database check constraint and keep the codes centralized in one server/domain module with schema tests.
- **[Audit target expansion permits malformed multi-target events]** → Provide typed target-specific audit helpers and add a database check ensuring an event does not target more than one domain record at once, while allowing authentication context alongside a Person target as the existing workflow requires.

## Migration Plan

1. Add Organization and Team schemas, relations, indexes, lifecycle constraints, team-type constraint, and explicit audit target columns/checks in one committed migration.
2. Apply the migration without backfill because no Organization or Team data exists and existing Person/authentication records intentionally remain unassigned.
3. Add domain services and database tests before exposing routes, then add guarded routes, navigation, forms, and browser coverage.
4. Verify migration application, schema constraints, format/lint, Svelte checks, unit/database tests, production build, and administrator browser flows.

Rollback removes the routes and services first. Schema rollback may drop Organization and Team tables only while no later relationship tables reference them and after exporting any created definitions and audit records; otherwise the data and target columns must be retained.

## Open Questions

None. Custom team types, organization-scoped authorization, Person employment, and relationship effective periods are explicit future changes.
