## Context

The SvelteKit root layout currently imports global styles and renders child content directly. The `/` route is still the starter page, while `/login` and `/protected` each create their own full-height main region. Authentication is already resolved in the server hook and exposed through `event.locals`; logout currently exists only as a protected-page form action.

This change crosses the root layout, authentication presentation, route markup, styling, and tests. It should establish a reusable application shell without changing the existing authentication model or introducing a component library.

## Goals / Non-Goals

**Goals:**

- Give every route a consistent, responsive Org Teams header and content frame.
- Make the header's Login or Logout action accurately reflect server-resolved session state.
- Provide a secure server-side logout target usable from every page.
- Replace starter content at `/` with concise, truthful welcome and feature copy.
- Follow conventional semantic, responsive, and keyboard-accessible web application patterns.

**Non-Goals:**

- Add registration, account recovery, profile, dashboard, team-management, or other product workflows.
- Redesign the login form or protected-page content beyond adapting them to the shared shell.
- Change Better Auth configuration, session storage, Person provisioning, or database models.
- Add a UI framework, icon package, remote font, or other dependency.

## Decisions

### The root layout owns the application landmarks

`src/routes/+layout.svelte` will render a skip link, one full-width header, and one `main` landmark around its children. Existing route pages will replace their nested `main` elements and full-viewport sizing with content sections sized for the shell. This keeps the shared structure present on all routes and avoids duplicate main landmarks.

Alternative considered: repeat a header component in each page. This would make authentication state and responsive behavior easier to drift and would not guarantee coverage for future routes.

### Authentication state is loaded on the server

A root `+layout.server.ts` load will expose only the boolean state needed by the shell, derived from the existing session locals. The layout will not infer authentication from browser state or receive sensitive session values. Because root layout data cascades to child routes, the header can render the correct action on initial server rendering and subsequent navigation.

Alternative considered: query authentication in the browser after rendering. That introduces visible action swapping and duplicates the established server-side trust boundary.

### Global logout uses a dedicated POST endpoint

The header will submit a small POST form to a dedicated `/logout` server endpoint. The endpoint will call the existing Better Auth sign-out API with request headers and redirect to `/login`. A POST-only endpoint preserves logout as a state-changing operation and lets the same control work from any route. The protected page's duplicate logout form can be removed because its route remains inside the shell.

Alternative considered: retain the protected page action and post to it globally. That couples shell behavior to an unrelated page route and makes the action unavailable if that route changes.

### Branding uses a local purpose-built mark

The header will use a small local Org Teams SVG mark paired with the text title, both contained in the home link. It will not reuse the Svelte starter logo. The SVG will be decorative when adjacent to the visible title, while the link receives an unambiguous accessible name.

Alternative considered: use a text-only wordmark. That is accessible and simple, but does not satisfy the requested logo treatment or establish a distinct visual identity.

### Styling stays within the existing Tailwind setup

The shell and welcome page will use the existing Tailwind CSS configuration and a restrained responsive layout: high-contrast neutral surfaces, a readable maximum content width, mobile-safe padding, clear focus rings, and touch-friendly controls. The welcome page will use a compact hero and three informational feature highlights, without inactive buttons or claims that unfinished workflows are available.

Alternative considered: add a design-system dependency. The small surface area does not justify extra runtime or maintenance cost.

## Risks / Trade-offs

- **[Root layout data can become stale after authentication changes during enhanced navigation]** → Use ordinary server redirects after login/logout so the destination request reloads authoritative layout data, and cover both transitions in integration tests.
- **[Existing route height and landmark classes can conflict with the new shell]** → Remove child `min-h-screen` and nested `main` markup, then verify login and protected content at desktop and mobile sizes.
- **[A global logout endpoint expands the set of routes handling authentication]** → Accept POST only, delegate invalidation to Better Auth, return no session data, and test that the old session no longer accesses `/protected`.
- **[Welcome copy could overstate unfinished product behavior]** → Keep feature highlights descriptive and informational, with no controls for unimplemented capabilities.

## Migration Plan

1. Add the root layout server load, shared shell markup, local logo asset, and global logout endpoint.
2. Adapt existing page markup and spacing to the root-owned main landmark.
3. Replace the default page and add focused server/component and browser-flow coverage.
4. Run type checks, unit/server tests, production build, and Playwright tests.

Rollback consists of restoring the prior root layout and route markup and removing the new layout load, logo, and logout endpoint; no persisted data migration is involved.

## Open Questions

None. The implementation can choose final copy and visual details within the behavior and accessibility constraints above.
