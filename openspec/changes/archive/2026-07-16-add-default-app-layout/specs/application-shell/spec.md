## ADDED Requirements

### Requirement: Shared application shell

The application SHALL render every page route inside one shared shell with a semantic header and main-content landmark. The shell SHALL provide consistent page width, spacing, background, and responsive behavior without obscuring or duplicating route content.

#### Scenario: Visitor opens any page

- **WHEN** a visitor opens the default, login, protected, or another application page
- **THEN** the shared header appears above that route's content and the route content appears within the shell's main-content landmark

#### Scenario: Visitor uses a narrow viewport

- **WHEN** a page is rendered at a typical mobile viewport width
- **THEN** the header and page content remain readable and operable without horizontal scrolling

### Requirement: Branded header navigation

The shared header SHALL display an Org Teams logo and title on the left as a home link and SHALL reserve the right side for the current authentication action. Header links and controls SHALL have accessible names and visible keyboard focus states.

#### Scenario: Visitor activates the brand

- **WHEN** a visitor activates the Org Teams logo or title in the header
- **THEN** the application navigates to the default route `/`

#### Scenario: Keyboard user navigates the header

- **WHEN** a keyboard user focuses a header link or control
- **THEN** the focused element has a clearly visible focus indicator and can be activated from the keyboard

### Requirement: Authentication-aware header action

The shared header SHALL derive authentication state from server-resolved session context. It SHALL show a Login link to anonymous visitors and a Logout form control to authenticated visitors, and SHALL NOT display both actions at the same time.

#### Scenario: Anonymous visitor uses Login

- **WHEN** a visitor without a valid session views any page and activates Login in the header
- **THEN** the application navigates to `/login`

#### Scenario: Authenticated visitor views the header

- **WHEN** a visitor with a valid session views any page
- **THEN** the header displays Logout and does not display Login

#### Scenario: Authenticated visitor logs out from the header

- **WHEN** an authenticated visitor submits Logout from the shared header
- **THEN** the server invalidates the session and redirects the visitor to `/login` as an anonymous visitor

#### Scenario: Anonymous visitor views the header

- **WHEN** a visitor without a valid session views any page
- **THEN** the header displays Login and does not display Logout

### Requirement: Default-route welcome content

The default route SHALL replace framework starter content with a concise Org Teams welcome page containing a clear product heading, a brief introductory statement, and a small set of readable feature highlights. The feature highlights SHALL be informational and SHALL NOT imply that unavailable product functions can already be used.

#### Scenario: Visitor opens the default route

- **WHEN** a visitor requests `/`
- **THEN** the application displays the Org Teams welcome heading, introductory copy, and brief feature highlights within the shared shell

#### Scenario: Visitor reads feature highlights

- **WHEN** a visitor reviews the welcome page
- **THEN** the highlights concisely describe the application's people, team, and secure-access focus without presenting nonfunctional controls
