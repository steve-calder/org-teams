## Why

The application currently exposes isolated route content without a shared product identity or navigation, and the default route still shows the SvelteKit starter page. A consistent application shell and useful welcome page will give every route a recognizable, accessible foundation while making authentication entry and exit easy to find.

## What Changes

- Add a shared, responsive application layout that wraps every page with a conventional header and main-content region.
- Add a header banner with an Org Teams logo/title on the left and an authentication-aware action on the right.
- Show a Login link for anonymous visitors that navigates to `/login`.
- Show a Logout control only for authenticated visitors and end their session through the existing server-side authentication flow.
- Replace the starter default route with a concise Org Teams welcome page and brief feature highlights.
- Apply common web application standards for semantic structure, responsive sizing, readable content width, keyboard focus, and accessible labels.

## Capabilities

### New Capabilities

- `application-shell`: Defines the shared application layout, responsive branded header, authentication-aware login/logout navigation, and default-route welcome content.

### Modified Capabilities

None.

## Impact

- Affects the root SvelteKit layout and layout data/actions, the default route, shared styling, and route-level tests.
- Reuses the existing Better Auth session in `App.Locals` and server-side sign-out API; no authentication provider, database schema, or dependency changes are expected.
- Existing login and protected routes will render inside the shared shell and may need local spacing or duplicate logout UI adjusted to fit the common layout.
