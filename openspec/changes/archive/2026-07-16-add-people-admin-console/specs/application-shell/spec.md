## ADDED Requirements

### Requirement: Administrator navigation

The shared header SHALL use server-resolved administrator authorization to display an Admin link to `/admin/people` only for authenticated administrators. Hiding the link SHALL NOT replace server-side authorization of admin routes.

#### Scenario: Administrator views the header

- **WHEN** an authenticated administrator views an application page
- **THEN** the header displays an Admin link that navigates to `/admin/people`

#### Scenario: Non-administrator views the header

- **WHEN** an anonymous visitor or authenticated non-administrator views an application page
- **THEN** the header does not display the Admin link
