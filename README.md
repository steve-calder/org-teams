# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.3 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" drizzle="database:postgresql+postgresql:postgres.js+docker:yes" better-auth="demo:password" --install npm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

In development mode, the app provisions a default account when it receives its first request:

```text
Email: dev@org-teams.local
Password: password
```

These credentials are also shown on the development login page. The account is not provisioned and
the credentials are not exposed by production builds.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Initial production administrator

A fresh production database has no login accounts, public registration, or default credentials. Provision the first administrator explicitly from a trusted release environment after migrations and before opening the application for use.

Configure the normal application secrets:

- `DATABASE_URL`: the target PostgreSQL database
- `ORIGIN`: the externally visible application origin
- `BETTER_AUTH_SECRET`: a production secret with at least 32 high-entropy characters

For the one bootstrap invocation, inject these additional values from your deployment secret manager:

- `BOOTSTRAP_ADMIN_NAME`: the administrator's username/display name
- `BOOTSTRAP_ADMIN_EMAIL`: the administrator's login email
- `BOOTSTRAP_ADMIN_PASSWORD`: the initial password; it must contain at least 8 characters, but a longer generated password is recommended

The command automatically reads these values from the project's `.env` file when it exists. Values already supplied by the deployment environment take precedence over `.env`. Do not pass the password as a command argument, and never commit a populated `.env` file. With the values available from either source, run:

```sh
npm run db:migrate
npm run admin:bootstrap
```

The bootstrap command creates the credential through Better Auth, creates its linked Person, grants administrator access, and creates no login session. After it succeeds:

1. Remove `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` from the deployment environment or secret attachment.
2. Start or deploy the web application normally.
3. Log in through `/login` with the new account and verify the Admin navigation is available.
4. Replace the password from the person's Authentication administration screen if your credential-handling policy requires rotation.

Running the command again for the same initialized administrator is harmless and does not reset the password. It exits with a refusal if a different administrator already exists or if the configured identity is inconsistent. Exit code `0` indicates creation, repair, or already-initialized success; `1` indicates invalid configuration or execution failure; `2` indicates a safe refusal.

The migration/bootstrap release environment must contain application source and development tooling because `db:migrate` uses Drizzle Kit and `admin:bootstrap` uses the declared TypeScript runner. A minimized serving image can omit those tools because the web application never invokes bootstrap during startup or request handling.
