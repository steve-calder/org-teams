## Why

A fresh production database contains no authentication users, while production disables the development account and exposes no registration flow. Operators therefore need a secure, explicit way to provision the first administrator before anyone can configure people, Organizations, or Teams.

## What Changes

- Add a deployment-time command that provisions the initial production administrator after database migrations have completed.
- Create the credential through Better Auth, ensure its product-owned Person linkage, grant the supported administrator role, and create no browser session.
- Make bootstrap execution safely repeatable for the configured identity and recoverable after a partially completed attempt.
- Refuse bootstrap when another administrator already establishes that the installation has been initialized.
- Accept bootstrap identity and credentials through deployment-time secret input without exposing the password in source, command output, logs, audit metadata, or application page data.
- Document the first-deployment sequence and removal of the bootstrap secret after successful initialization.

## Capabilities

### New Capabilities

- `production-admin-bootstrap`: Defines secure, deployment-time creation, idempotent verification and repair, concurrency control, and operational handling for the first production administrator.

### Modified Capabilities

- `people-admin-console`: Distinguishes system-attributed initial-administrator bootstrap auditing from ordinary administrator-attributed mutations while preserving sanitized audit history.

## Impact

- Adds a server-only bootstrap entry point and package script alongside the existing database migration commands.
- Reuses Better Auth user creation, the existing Person provisioning boundary, PostgreSQL, and the persisted Better Auth administrator role.
- Adds deployment configuration validation, operational documentation, and focused database/security tests.
- Does not add public registration, a first-visitor setup page, automatic production request/startup provisioning, or a general administrator-recovery command.
