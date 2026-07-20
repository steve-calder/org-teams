## 1. Organization and Team Schema

- [x] 1.1 Add Organization and Team Drizzle schemas with UUID identities, lifecycle fields, timestamps, mandatory restrictive Team ownership, relations, controlled Team-type constraints, and directory indexes
- [x] 1.2 Extend the administrative audit schema with indexed Organization and Team targets, typed target integrity checks, and relations without weakening existing Person/authentication audit behavior
- [x] 1.3 Generate and review one committed PostgreSQL migration for the new tables, constraints, indexes, and audit targets with no Person or authentication backfill
- [x] 1.4 Add database/schema tests for defaults, length and Team-type constraints, duplicate display names, mandatory ownership, restrictive deletion, audit target integrity, and migration application

## 2. Organization Administration Services

- [x] 2.1 Implement normalized Organization input validation for required names, optional descriptions, and active/inactive lifecycle status
- [x] 2.2 Implement the bounded Organization directory query with name search, status filtering, stable ordering, pagination totals, and detail lookup
- [x] 2.3 Implement transactional Organization creation, profile editing, and lifecycle changes with row locking, active-Team deactivation blocking, blocking-Team details, no status cascade, and sanitized Organization-targeted audit events
- [x] 2.4 Add service tests for validation, duplicate names, search/filter/pagination, detail lookup, blocked deactivation, successful retry after Team transfer or inactivation, reversible lifecycle changes, and atomic audit behavior

## 3. Team Administration Services

- [x] 3.1 Centralize the controlled Team-type codes, labels, type guard, and normalized Team input validation for names, purpose, type, and lifecycle status
- [x] 3.2 Implement the bounded Team directory query with name search, Organization/type/status filters, stable ordering, Organization context, pagination totals, and detail lookup
- [x] 3.3 Implement transactional Team creation and editing with ordinary-edit ownership protection, owning-Organization existence/status checks, shared row locking for lifecycle safety, and sanitized Team-targeted audit events
- [x] 3.4 Implement a dedicated confirmed Team-transfer service that validates a different active destination, locks the Team plus source and destination Organizations in deterministic order, preserves Team identity and lifecycle status, and audits both Organization IDs
- [x] 3.5 Add service tests for mandatory ownership, ordinary-edit ownership protection, controlled types, duplicate names, combined filters, inactive-Organization conflicts, valid and invalid transfers, confirmation, concurrent lifecycle/transfer changes, and atomic audit behavior

## 4. Administrative Routes and Navigation

- [x] 4.1 Add Organization directory and detail server loads/actions under `/admin/organizations`, with repeated server authorization, normalized filters, validation failures, lifecycle controls, and 404 handling
- [x] 4.2 Add Team directory and detail server loads/actions under `/admin/teams`, with repeated server authorization, untrusted identifier handling, Organization/type options, lifecycle conflicts, confirmed transfer handling, and 404 handling
- [x] 4.3 Extend the administrative navigation so global administrators can move among People, Organizations, and Teams while preserving the existing `/admin` server guard
- [x] 4.4 Add route tests proving anonymous redirects, non-administrator rejection, global-administrator access across Organizations, direct-action authorization, safe failures, and unknown-record handling

## 5. Organization and Team Administration UI

- [x] 5.1 Build the responsive Organization directory with search, status filter, pagination, lifecycle indicators, Organization creation, and links to detail records
- [x] 5.2 Build the Organization detail form with editable definition fields, explicit reversible lifecycle controls, blocking active-Team details and links, validation feedback, and no hard-delete control
- [x] 5.3 Build the responsive Team directory with search, Organization/type/status filters, pagination, owning-Organization context, availability indicators, and Team creation
- [x] 5.4 Build the Team detail form with protected owning-Organization context, editable definition fields, controlled type selection, reversible lifecycle controls, and a separate confirmed transfer control limited to other active Organizations
- [x] 5.5 Add page/component coverage for accessible labels and announcements, filter-state preservation, duplicate-name disambiguation, blocking-Team links, transfer confirmation and validation, lifecycle messaging, and mobile/desktop layout

## 6. End-to-End Verification

- [x] 6.1 Add an administrator Playwright flow that creates two Organizations, creates same-named Teams with controlled types, edits definitions, filters both directories, transfers a Team, and verifies audit-backed ownership and lifecycle behavior
- [x] 6.2 Add browser coverage proving anonymous and non-administrator users cannot see or invoke the new administration experiences and direct requests cannot bypass authorization or Team ownership rules
- [x] 6.3 Add browser coverage for blocked Organization deactivation, linked blocking-Team guidance, resolution through Team transfer or inactivation, successful retry, and rejected active-Team creation or activation under an inactive Organization
- [x] 6.4 Run the committed migration, formatting and lint checks, Svelte type checks, full unit/database/route tests, production build, and relevant Playwright suites; resolve failures without introducing deferred relationship features
