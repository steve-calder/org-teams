import { and, count, eq, sql } from 'drizzle-orm';
import type { createAuthCore } from '$lib/server/auth-core';
import { MIN_PASSWORD_LENGTH } from '$lib/server/auth-core';
import type { Database } from '$lib/server/db/factory';
import { account, adminAuditEvent, person, session, user } from '$lib/server/db/schema';
import { hasAdminRole } from '$lib/server/admin/authorization';
import { writeAdminAudit } from '$lib/server/admin/audit-core';

export const BOOTSTRAP_SYSTEM_ACTOR = 'system:production-admin-bootstrap';
const BOOTSTRAP_LOCK_ID = 7_104_202_602;

export interface BootstrapAdminConfig {
	name: string;
	email: string;
	password: string;
}

export type BootstrapAdminResult =
	| { status: 'created' | 'repaired' | 'already-initialized'; email: string }
	| {
			status: 'refused';
			reason: 'administrator-exists' | 'identity-conflict';
			email: string;
	  };

export class BootstrapConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BootstrapConfigurationError';
	}
}

export class BootstrapExecutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BootstrapExecutionError';
	}
}

export function parseBootstrapAdminConfig(
	environment: Record<string, string | undefined>
): BootstrapAdminConfig {
	const name = environment.BOOTSTRAP_ADMIN_NAME?.trim() ?? '';
	const email = environment.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
	const password = environment.BOOTSTRAP_ADMIN_PASSWORD ?? '';

	if (!name) throw new BootstrapConfigurationError('BOOTSTRAP_ADMIN_NAME is required.');
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new BootstrapConfigurationError('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
	}
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new BootstrapConfigurationError(
			`BOOTSTRAP_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`
		);
	}

	return { name, email, password };
}

type BootstrapAuth = ReturnType<typeof createAuthCore<[]>>;

export interface BootstrapAdminDependencies {
	database: Database;
	auth: BootstrapAuth;
	ensurePersonForAuthUser: (authUserId: string, displayName: string) => Promise<{ id: string }>;
}

function isMissingSchemaError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const code = 'code' in error ? String(error.code) : '';
	const cause = 'cause' in error ? error.cause : undefined;
	return code === '42P01' || code === '42703' || isMissingSchemaError(cause);
}

async function valueCount(query: Promise<Array<{ value: number }>>): Promise<number> {
	return (await query)[0]?.value ?? 0;
}

export async function bootstrapProductionAdmin(
	dependencies: BootstrapAdminDependencies,
	config: BootstrapAdminConfig
): Promise<BootstrapAdminResult> {
	const { database, auth, ensurePersonForAuthUser } = dependencies;

	try {
		return await database.transaction(async (tx) => {
			await tx.execute(sql`select pg_advisory_xact_lock(${BOOTSTRAP_LOCK_ID})`);

			let configuredUser = await tx.query.user.findFirst({
				where: eq(user.email, config.email)
			});
			const administrators = await tx
				.select({ id: user.id })
				.from(user)
				.where(sql<boolean>`(',' || coalesce(${user.role}, '') || ',') like '%,admin,%'`);

			if (configuredUser && hasAdminRole(configuredUser.role)) {
				const linkedPerson = await tx.query.person.findFirst({
					where: eq(person.authUserId, configuredUser.id)
				});
				const credentialCount = await valueCount(
					tx
						.select({ value: count() })
						.from(account)
						.where(and(eq(account.userId, configuredUser.id), eq(account.providerId, 'credential')))
				);
				if (!linkedPerson || configuredUser.banned || credentialCount !== 1) {
					return { status: 'refused', reason: 'identity-conflict', email: config.email };
				}
				return { status: 'already-initialized', email: config.email };
			}

			if (administrators.length > 0) {
				return { status: 'refused', reason: 'administrator-exists', email: config.email };
			}

			let created = false;
			let sessionsBefore = 0;
			if (configuredUser) {
				if (configuredUser.banned) {
					return { status: 'refused', reason: 'identity-conflict', email: config.email };
				}
				const credentialCount = await valueCount(
					tx
						.select({ value: count() })
						.from(account)
						.where(and(eq(account.userId, configuredUser.id), eq(account.providerId, 'credential')))
				);
				if (credentialCount !== 1) {
					return { status: 'refused', reason: 'identity-conflict', email: config.email };
				}
				sessionsBefore = await valueCount(
					tx.select({ value: count() }).from(session).where(eq(session.userId, configuredUser.id))
				);
			} else {
				await auth.api.signUpEmail({
					body: { name: config.name, email: config.email, password: config.password }
				});
				created = true;
				configuredUser = await tx.query.user.findFirst({
					where: eq(user.email, config.email)
				});
				if (!configuredUser) throw new BootstrapExecutionError('Bootstrap user creation failed.');
			}

			let linkedPerson = await tx.query.person.findFirst({
				where: eq(person.authUserId, configuredUser.id)
			});
			if (!linkedPerson) {
				await ensurePersonForAuthUser(configuredUser.id, config.name);
				linkedPerson = await tx.query.person.findFirst({
					where: eq(person.authUserId, configuredUser.id)
				});
			}
			if (!linkedPerson) throw new BootstrapExecutionError('Bootstrap Person verification failed.');

			await tx.update(user).set({ role: 'admin' }).where(eq(user.id, configuredUser.id));
			await writeAdminAudit(tx, {
				actorAuthUserId: BOOTSTRAP_SYSTEM_ACTOR,
				targetPersonId: linkedPerson.id,
				targetAuthUserId: configuredUser.id,
				action: 'authentication.admin-bootstrapped',
				metadata: { source: 'deployment-command' }
			});

			const verifiedUser = await tx.query.user.findFirst({ where: eq(user.id, configuredUser.id) });
			const verifiedPersonCount = await valueCount(
				tx.select({ value: count() }).from(person).where(eq(person.authUserId, configuredUser.id))
			);
			const sessionsAfter = await valueCount(
				tx.select({ value: count() }).from(session).where(eq(session.userId, configuredUser.id))
			);
			if (
				!verifiedUser ||
				!hasAdminRole(verifiedUser.role) ||
				verifiedPersonCount !== 1 ||
				sessionsAfter !== sessionsBefore
			) {
				throw new BootstrapExecutionError('Bootstrap invariant verification failed.');
			}

			return { status: created ? 'created' : 'repaired', email: config.email };
		});
	} catch (error) {
		if (error instanceof BootstrapExecutionError) throw error;
		if (isMissingSchemaError(error)) {
			throw new BootstrapExecutionError(
				'Database migrations are required before administrator bootstrap.'
			);
		}
		throw new BootstrapExecutionError(
			'Administrator bootstrap failed without changing credentials.'
		);
	}
}

export async function countBootstrapAuditEvents(
	database: Database,
	targetAuthUserId: string
): Promise<number> {
	return valueCount(
		database
			.select({ value: count() })
			.from(adminAuditEvent)
			.where(
				and(
					eq(adminAuditEvent.targetAuthUserId, targetAuthUserId),
					eq(adminAuditEvent.action, 'authentication.admin-bootstrapped')
				)
			)
	);
}
