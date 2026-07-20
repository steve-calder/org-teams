## 1. Personal Dashboard Read Model

- [x] 1.1 Add a non-admin personal dashboard module with allowlisted Organization, Team relationship, role, and contextual manager projections.
- [x] 1.2 Query ordinary memberships and managed Teams for one trusted Person, filtering inactive People, Organizations, Teams, and unavailable manager context according to the current-state rules.
- [x] 1.3 Combine and defensively deduplicate manager and ordinary Team relationships, group them by Organization, and sort Organizations and Teams by display name and UUID without a primary designation.
- [x] 1.4 Add database-backed read-model tests for ordinary membership, manager-only participation, multiple Teams and Organizations, contextual managers, deterministic ordering, lifecycle filtering, deduplication, and an unassigned Person.

## 2. Authentication-Aware Home Loading

- [x] 2.1 Add the default-route server load that returns no dashboard for anonymous requests and loads only the `locals.person` dashboard for authenticated requests.
- [x] 2.2 Ensure the homepage load ignores client-supplied Person identifiers and exposes no admin mutation choices or private Person and authentication fields.
- [x] 2.3 Add server-load tests for anonymous, authenticated, administrator, missing-Person, and attempted Person-identifier override cases.

## 3. Anonymous Product Homepage

- [x] 3.1 Rewrite the anonymous hero and highlights around understanding Team structure, matrix participation, and contextual reporting instead of Person/login and session implementation details.
- [x] 3.2 Provide an honest Login call to action and anonymous title and description metadata without implying unavailable visualization controls.
- [x] 3.3 Add page or browser assertions that anonymous visitors receive only the value-focused welcome state and no personal relationship data.

## 4. Authenticated Personal Dashboard

- [x] 4.1 Build an authenticated homepage greeting and summary that groups current Team relationships by Organization and labels none as primary.
- [x] 4.2 Present each ordinary membership with its Team-specific role and contextual manager state and each managed Team once with a manager designation.
- [x] 4.3 Add clear empty and lifecycle-filtered states, authenticated title and description metadata, and preserve the separate administrator header action.
- [x] 4.4 Verify semantic headings, keyboard behavior, responsive layouts, and no horizontal overflow for anonymous, multi-Organization, and empty dashboard states.
- [x] 4.5 Add integrated browser coverage proving anonymous and authenticated homepage states differ and that the dashboard displays multiple Organization and Team contexts without editing controls.

## 5. Documentation and Verification

- [x] 5.1 Update `SPEC.md` to describe the value-focused public homepage and authenticated personal Organization and Team dashboard as the entry point to later visualization.
- [x] 5.2 Run focused read-model, route, and homepage browser tests and resolve change-related failures.
- [x] 5.3 Run formatting, lint, Svelte diagnostics, the complete unit suite, production build, and strict OpenSpec validation; resolve all change-related failures.
