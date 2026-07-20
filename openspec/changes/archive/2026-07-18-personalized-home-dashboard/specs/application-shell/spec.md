## MODIFIED Requirements

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
