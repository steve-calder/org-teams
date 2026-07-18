## Why

The default homepage currently explains internal implementation choices instead of why Org Teams is useful, and authenticated people receive the same generic welcome as anonymous visitors. The homepage should communicate the product's value before login and become a personal organizational starting point after login.

## What Changes

- Rewrite the anonymous homepage around the product's purpose: helping people understand how Organizations, Teams, roles, and contextual reporting relationships fit together in a matrix environment.
- Remove homepage messaging that presents technical implementation details, such as Person/login separation or server-resolved sessions, as customer-facing benefits.
- Make `/` authentication-aware: anonymous visitors receive the value-focused welcome experience, while authenticated people receive a personal dashboard.
- Group an authenticated Person's current Team memberships and managed Teams by Organization so participation across several Organizations is understandable without choosing a primary Organization or Team.
- Show each Team relationship once with its ordinary-member role or manager designation, lifecycle-eligible contextual manager, and clear Organization context.
- Provide useful empty states for authenticated people with no current Team relationships and keep administrator navigation available without turning the dashboard into an editing surface.
- Keep the dashboard read-only and limited to the server-resolved Person; Organization-wide visualization and employee-facing Team or Person detail pages remain separate future capabilities.

## Capabilities

### New Capabilities

- `personal-organization-dashboard`: Defines the authenticated Person's read-only, cross-Organization dashboard of current Team memberships, managed Teams, roles, and contextual managers.

### Modified Capabilities

- `application-shell`: Replaces the generic default-route welcome requirement with distinct anonymous value messaging and authenticated dashboard behavior.

## Impact

- Adds a server load and Person-scoped read model for `/` using trusted session and Person context.
- Reworks the default-route Svelte page into anonymous and authenticated states with responsive, accessible cards and empty states.
- Reads existing Organization, Team, membership, manager, and lifecycle data without adding tables or changing administration behavior.
- Extends default-route, layout, accessibility, and end-to-end tests while preserving the shared shell, Login/Logout controls, and administrator link.
