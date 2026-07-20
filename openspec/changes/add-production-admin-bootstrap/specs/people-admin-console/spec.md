## MODIFIED Requirements

### Requirement: Administrative audit trail

The system SHALL record each successful administrator-initiated Person, authentication, session, and administrator-access mutation with the acting authentication user, target Person and authentication user when applicable, action type, timestamp, and sanitized non-secret metadata. Initial production administrator bootstrap SHALL instead record a system-attributed bootstrap event because no authenticated administrator exists yet. Administrators SHALL be able to review recent audit entries for a Person.

#### Scenario: Administrator changes a person

- **WHEN** an administrator successfully changes Person or linked authentication state
- **THEN** the system creates an audit record identifying the actor, target, action, and sanitized change summary

#### Scenario: System bootstraps the first administrator

- **WHEN** the deployment bootstrap successfully grants initial administrator access before any administrator session exists
- **THEN** the system creates a sanitized system-attributed audit record identifying the target Person, target authentication user, and bootstrap action without falsely attributing it to an authenticated administrator

#### Scenario: Administrator reviews person history

- **WHEN** an administrator opens the audit history for a Person
- **THEN** the console displays that Person's recent administrative actions and system bootstrap event without credentials, tokens, or sensitive session values
