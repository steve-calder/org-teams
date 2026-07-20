## MODIFIED Requirements

### Requirement: Default development account

When the application runs in development mode, it SHALL idempotently provision a Better Auth account with email `dev@org-teams.local` and password `password`, ensure that account has one linked Person, grant it administrator authorization, and display the credentials on `/login`. Provisioning the account SHALL NOT establish a session for the anonymous request that triggers it. Outside development mode, the application SHALL NOT provision the default account, grant development-account authorization, or return its credentials in login page data.

#### Scenario: First development request provisions the default account

- **WHEN** the application receives its first request in development mode
- **THEN** the default Better Auth account exists with administrator authorization and one linked Person and can authenticate with the specified credentials

#### Scenario: Default account already exists

- **WHEN** development provisioning runs after the default account has already been created
- **THEN** provisioning succeeds with administrator authorization without creating a duplicate authentication user or linked Person

#### Scenario: Anonymous request triggers provisioning

- **WHEN** an anonymous request causes the default development account to be provisioned
- **THEN** the request remains anonymous and receives no session for the default account

#### Scenario: Developer opens the login page

- **WHEN** an anonymous user requests `/login` in development mode
- **THEN** the login page displays `dev@org-teams.local` and `password` as the available development credentials

#### Scenario: Application runs outside development mode

- **WHEN** the application handles a request outside development mode
- **THEN** it neither provisions or grants access to the default account nor returns or displays the default credentials
