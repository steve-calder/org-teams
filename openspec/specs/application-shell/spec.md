# Application Shell Specification

## Purpose

Define the consistent, responsive application frame, branded navigation, authentication controls, and default welcome experience used across Org Teams pages.

## Requirements

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

### Requirement: Administrator navigation

The shared header SHALL use server-resolved administrator authorization to display an Admin link to `/admin/people` only for authenticated administrators. Hiding the link SHALL NOT replace server-side authorization of admin routes.

#### Scenario: Administrator views the header

- **WHEN** an authenticated administrator views an application page
- **THEN** the header displays an Admin link that navigates to `/admin/people`

#### Scenario: Non-administrator views the header

- **WHEN** an anonymous visitor or authenticated non-administrator views an application page
- **THEN** the header does not display the Admin link

### Requirement: Default-route welcome content

The default route SHALL render a distinct experience from server-resolved authentication context. Anonymous visitors SHALL receive a concise, value-focused Org Teams welcome page explaining how the product helps people understand Organizations, Teams, Team-specific roles, and contextual reporting relationships. Authenticated visitors SHALL receive their personal Organization and Team dashboard instead of the anonymous welcome content. Customer-facing welcome copy SHALL NOT present technical implementation choices or unavailable functions as product benefits.

#### Scenario: Anonymous visitor opens the default route

- **WHEN** a visitor without a valid session requests `/`
- **THEN** the application displays a clear product heading, introductory value statement, and brief highlights about understanding Team structure, matrix participation, and reporting context

#### Scenario: Anonymous visitor reads feature highlights

- **WHEN** an anonymous visitor reviews the welcome page
- **THEN** the highlights explain what Org Teams helps people understand and why that understanding is useful without promoting Person/login separation, session implementation, or other technical mechanics

#### Scenario: Authenticated visitor opens the default route

- **WHEN** a visitor with a valid session and linked Person requests `/`
- **THEN** the application displays that Person's personal Organization and Team dashboard and does not display the anonymous marketing experience

#### Scenario: Default route is viewed responsively

- **WHEN** either default-route experience is rendered at a typical mobile viewport width
- **THEN** its content remains readable and operable without horizontal scrolling
