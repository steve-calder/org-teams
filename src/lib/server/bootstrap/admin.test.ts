import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/private';
import { and, count, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { createAuthCore } from '$lib/server/auth-core';
import { createDatabase, type Database } from '$lib/server/db/factory';
import { account, adminAuditEvent, person, session, user } from '$lib/server/db/schema';
import { createPersonRepository } from '$lib/server/people/repository-core';
import {
	bootstrapProductionAdmin,
	BOOTSTRAP_SYSTEM_ACTOR,
	BootstrapExecutionError,
	countBootstrapAuditEvents,
	type BootstrapAdminDependencies,
	type BootstrapAdminConfig
} from './admin';

let administrativeClient: Sql;
let databaseName: string;
let connection: ReturnType<typeof createDatabase>;
let db: Database;
let auth: BootstrapAdminDependencies['auth'];
let dependencies: BootstrapAdminDependencies;
const trackedEmails = new Set<string>();

beforeAll(async () => {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for bootstrap database tests.');
	databaseName = `org_teams_bootstrap_${randomUUID().replaceAll('-', '')}`;
	administrativeClient = postgres(env.DATABASE_URL, { max: 1 });
	await administrativeClient.unsafe(`create database "${databaseName}"`);
	const testUrl = new URL(env.DATABASE_URL);
	testUrl.pathname = `/${databaseName}`;
	connection = createDatabase(testUrl.toString());
	db = connection.db;
	await migrate(db, { migrationsFolder: 'drizzle' });
	const people = createPersonRepository(db);
	auth = createAuthCore(
		{
			database: db,
			baseURL: 'http://localhost:5173',
			secret: 'bootstrap-test-secret-at-least-32-characters',
			ensurePersonForAuthUser: people.ensurePersonForAuthUser
		},
		[]
	);
	dependencies = {
		database: db,
		auth,
		ensurePersonForAuthUser: people.ensurePersonForAuthUser
	};
});

afterAll(async () => {
	await connection.client.end();
	await administrativeClient.unsafe(`drop database "${databaseName}"`);
	await administrativeClient.end();
});

function config(label: string = randomUUID()): BootstrapAdminConfig {
	const email = `bootstrap-${label}@example.test`;
	trackedEmails.add(email);
	return { name: `Bootstrap ${label}`, email, password: 'bootstrap-password-123' };
}

async function findUser(email: string) {
	return db.query.user.findFirst({ where: eq(user.email, email) });
}

async function createCredentialUser(input: BootstrapAdminConfig) {
	await auth.api.signUpEmail({ body: input });
	const created = await findUser(input.email);
	if (!created) throw new Error('Test user was not created.');
	return created;
}

afterEach(async () => {
	if (trackedEmails.size === 0) return;
	const emails = [...trackedEmails];
	trackedEmails.clear();
	const users = await db.select({ id: user.id }).from(user).where(inArray(user.email, emails));
	const ids = users.map(({ id }) => id);
	if (ids.length === 0) return;
	await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetAuthUserId, ids));
	await db.delete(person).where(inArray(person.authUserId, ids));
	await db.delete(user).where(inArray(user.id, ids));
});

describe('production administrator bootstrap', () => {
	it('creates a login-capable administrator, linked Person, audit event, and no session', async () => {
		const input = config();

		await expect(bootstrapProductionAdmin(dependencies, input)).resolves.toEqual({
			status: 'created',
			email: input.email
		});
		const created = (await findUser(input.email))!;
		expect(created.role).toBe('admin');
		expect(
			await db.query.person.findFirst({ where: eq(person.authUserId, created.id) })
		).toMatchObject({ displayName: input.name });
		expect(await db.query.session.findMany({ where: eq(session.userId, created.id) })).toHaveLength(
			0
		);
		const audit = await db.query.adminAuditEvent.findFirst({
			where: and(
				eq(adminAuditEvent.targetAuthUserId, created.id),
				eq(adminAuditEvent.action, 'authentication.admin-bootstrapped')
			)
		});
		expect(audit).toMatchObject({
			actorAuthUserId: BOOTSTRAP_SYSTEM_ACTOR,
			targetAuthUserId: created.id,
			metadata: { source: 'deployment-command' }
		});
		expect(JSON.stringify(audit)).not.toContain(input.password);

		await expect(
			auth.api.signInEmail({ body: { email: input.email, password: input.password } })
		).resolves.toMatchObject({ user: { id: created.id, role: 'admin' } });
	});

	it('is idempotent without changing the password or duplicating the audit event', async () => {
		const input = config();
		await bootstrapProductionAdmin(dependencies, input);
		const created = (await findUser(input.email))!;
		const [credentialBefore] = await db
			.select({ password: account.password })
			.from(account)
			.where(and(eq(account.userId, created.id), eq(account.providerId, 'credential')));

		await expect(bootstrapProductionAdmin(dependencies, input)).resolves.toEqual({
			status: 'already-initialized',
			email: input.email
		});
		const [credentialAfter] = await db
			.select({ password: account.password })
			.from(account)
			.where(and(eq(account.userId, created.id), eq(account.providerId, 'credential')));
		expect(credentialAfter.password).toBe(credentialBefore.password);
		expect(await countBootstrapAuditEvents(db, created.id)).toBe(1);
	});

	it('repairs a partial user and missing Person without replacing credentials', async () => {
		const input = config();
		const created = await createCredentialUser(input);
		const [credentialBefore] = await db
			.select({ password: account.password })
			.from(account)
			.where(and(eq(account.userId, created.id), eq(account.providerId, 'credential')));
		await db.delete(person).where(eq(person.authUserId, created.id));

		await expect(bootstrapProductionAdmin(dependencies, input)).resolves.toEqual({
			status: 'repaired',
			email: input.email
		});
		const [credentialAfter] = await db
			.select({ password: account.password })
			.from(account)
			.where(and(eq(account.userId, created.id), eq(account.providerId, 'credential')));
		expect(credentialAfter.password).toBe(credentialBefore.password);
		expect((await findUser(input.email))?.role).toBe('admin');
		expect(
			await db.query.person.findFirst({ where: eq(person.authUserId, created.id) })
		).toBeDefined();
	});

	it('refuses a configured identity when another administrator exists', async () => {
		const existingInput = config('existing-' + randomUUID());
		const requestedInput = config('requested-' + randomUUID());
		const existing = await createCredentialUser(existingInput);
		await db.update(user).set({ role: 'admin' }).where(eq(user.id, existing.id));

		await expect(bootstrapProductionAdmin(dependencies, requestedInput)).resolves.toEqual({
			status: 'refused',
			reason: 'administrator-exists',
			email: requestedInput.email
		});
		expect(await findUser(requestedInput.email)).toBeUndefined();
	});

	it('refuses a conflicting identity without a credential account', async () => {
		const input = config();
		const id = randomUUID();
		await db.insert(user).values({ id, name: input.name, email: input.email });
		await dependencies.ensurePersonForAuthUser(id, input.name);

		await expect(bootstrapProductionAdmin(dependencies, input)).resolves.toEqual({
			status: 'refused',
			reason: 'identity-conflict',
			email: input.email
		});
		expect((await findUser(input.email))?.role).toBeNull();
	});

	it('refuses an already privileged identity whose credential invariant is broken', async () => {
		const input = config();
		const created = await createCredentialUser(input);
		await db.update(user).set({ role: 'admin' }).where(eq(user.id, created.id));
		await db.delete(account).where(eq(account.userId, created.id));

		await expect(bootstrapProductionAdmin(dependencies, input)).resolves.toEqual({
			status: 'refused',
			reason: 'identity-conflict',
			email: input.email
		});
	});

	it('maps an unmigrated database failure to a sanitized prerequisite error', async () => {
		const input = config();
		await expect(
			bootstrapProductionAdmin(
				{
					database: {
						transaction: async () => {
							throw { code: '42P01', message: `missing ${input.password}` };
						}
					} as never,
					auth,
					ensurePersonForAuthUser: dependencies.ensurePersonForAuthUser
				},
				input
			)
		).rejects.toEqual(
			new BootstrapExecutionError(
				'Database migrations are required before administrator bootstrap.'
			)
		);
	});

	it('serializes concurrent commands for the same identity', async () => {
		const input = config();
		const results = await Promise.all([
			bootstrapProductionAdmin(dependencies, input),
			bootstrapProductionAdmin(dependencies, input)
		]);

		expect(results.map(({ status }) => status).sort()).toEqual(['already-initialized', 'created']);
		const created = (await findUser(input.email))!;
		const [userCount] = await db
			.select({ value: count() })
			.from(user)
			.where(eq(user.email, input.email));
		const [personCount] = await db
			.select({ value: count() })
			.from(person)
			.where(eq(person.authUserId, created.id));
		expect(userCount.value).toBe(1);
		expect(personCount.value).toBe(1);
	});

	it('allows at most one administrator for concurrent different identities', async () => {
		const first = config('first-' + randomUUID());
		const second = config('second-' + randomUUID());
		const results = await Promise.all([
			bootstrapProductionAdmin(dependencies, first),
			bootstrapProductionAdmin(dependencies, second)
		]);

		expect(results.filter(({ status }) => status === 'created')).toHaveLength(1);
		expect(results.filter(({ status }) => status === 'refused')).toHaveLength(1);
		const stored = await db
			.select()
			.from(user)
			.where(inArray(user.email, [first.email, second.email]));
		expect(stored).toHaveLength(1);
		expect(stored[0]?.role).toBe('admin');
	});
});
