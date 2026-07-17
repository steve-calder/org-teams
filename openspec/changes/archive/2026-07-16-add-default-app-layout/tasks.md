## 1. Server-Owned Authentication State

- [x] 1.1 Add a root layout server load that exposes only the authenticated boolean needed by the shared header, derived from the existing request locals
- [x] 1.2 Add a POST-only `/logout` server endpoint that signs out through Better Auth and redirects to `/login`
- [x] 1.3 Add focused server tests for anonymous and authenticated root layout data, successful global logout, and rejection of non-POST logout requests

## 2. Shared Application Shell

- [x] 2.1 Create a local Org Teams SVG logo asset with appropriate decorative/accessibility treatment when paired with the visible product title
- [x] 2.2 Replace the root layout's direct child rendering with a skip link, responsive branded header, mutually exclusive Login/Logout actions, and one main-content landmark
- [x] 2.3 Apply shared responsive styling for readable content width, mobile-safe spacing, touch-friendly controls, sufficient contrast, and visible keyboard focus
- [x] 2.4 Adapt the login and protected page markup to the root-owned main landmark and remove the protected page's duplicate logout control without changing their core behavior

## 3. Default Welcome Page

- [x] 3.1 Replace the SvelteKit starter route with an Org Teams page title, concise welcome introduction, and three truthful informational highlights covering people, teams, and secure access
- [x] 3.2 Verify the welcome content and feature highlights reflow without horizontal scrolling at mobile and desktop viewport widths

## 4. Integration and Verification

- [x] 4.1 Extend browser coverage to verify the shared shell on default, login, and protected routes; logo navigation; anonymous Login navigation; authenticated Logout visibility and behavior; and mutually exclusive auth actions
- [x] 4.2 Add accessibility assertions for semantic landmarks, accessible header controls, skip-link behavior, and visible keyboard focus
- [x] 4.3 Run formatting checks, Svelte type checks, focused unit/server tests, the production build, and the authentication/layout Playwright flow; resolve failures without adding dependencies or unrelated features
