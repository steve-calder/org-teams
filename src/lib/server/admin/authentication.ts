import { and, count, eq, ne, sql } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { MIN_PASSWORD_LENGTH } from '$lib/server/auth-core';
import { db } from '$lib/server/db';
import { person, user } from '$lib/server/db/schema';
import { hasAdminRole } from './authorization';
import { recordAdminAudit, writeAdminAudit } from './audit';
import { getPersonAdminDetail } from './people';

export interface AdminMutationContext {
	actorAuthUserId: string;
	headers: Headers;
}

const ADMIN_LOCK_ID = 7_104_202_601;
type PersonAdminDetail = NonNullable<Awaited<ReturnType<typeof getPersonAdminDetail>>>;
type LinkedPersonAdminDetail = PersonAdminDetail & {
	auth: NonNullable<PersonAdminDetail['auth']>;
};

function assertNotSelf(actorAuthUserId: string, targetAuthUserId: string, action: string) {
	if (actorAuthUserId === targetAuthUserId) {
		throw new Error(`Administrators cannot ${action} themselves.`);
	}
}

export function requireConfirmation(value: string | null | undefined, expected: string): void {
	if (value !== expected) throw new Error(`Type ${expected} to confirm this action.`);
}

async function getRequiredLinkedPerson(personId: string): Promise<LinkedPersonAdminDetail> {
	const detail = await getPersonAdminDetail(personId);
	if (!detail) throw new Error('Person not found.');
	if (!detail.auth) throw new Error('This Person does not have login access.');
	return detail as LinkedPersonAdminDetail;
}

async function assertAnotherAdministratorExists(targetAuthUserId: string) {
	const [result] = await db
		.select({ value: count() })
		.from(user)
		.where(
			and(
				ne(user.id, targetAuthUserId),
				sql<boolean>`(',' || coalesce(${user.role}, '') || ',') like '%,admin,%'`
			)
		);
	if ((result?.value ?? 0) < 1) throw new Error('The final administrator cannot be removed.');
}

export async function addLoginToPerson(
	personId: string,
	email: string,
	password: string,
	context: AdminMutationContext
) {
	const target = await getPersonAdminDetail(personId);
	if (!target) throw new Error('Person not found.');
	if (target.auth) throw new Error('This Person already has login access.');
	const normalizedEmail = email.trim().toLowerCase();
	if (!normalizedEmail || !normalizedEmail.includes('@'))
		throw new Error('Enter a valid email address.');
	if (password.length < MIN_PASSWORD_LENGTH)
		throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

	let createdAuthUserId: string | undefined;
	let generatedPersonId: string | undefined;
	try {
		const created = await auth.api.createUser({
			body: {
				email: normalizedEmail,
				password,
				name: target.person.displayName,
				role: 'user'
			},
			headers: context.headers
		});
		createdAuthUserId = created.user.id;
		const generated = await db.query.person.findFirst({
			where: eq(person.authUserId, createdAuthUserId)
		});
		if (!generated) throw new Error('Better Auth user provisioning did not create a Person.');
		generatedPersonId = generated.id;

		await db.transaction(async (tx) => {
			const [lockedTarget] = await tx
				.select()
				.from(person)
				.where(eq(person.id, personId))
				.for('update');
			const [lockedGenerated] = await tx
				.select()
				.from(person)
				.where(eq(person.id, generated.id))
				.for('update');
			if (!lockedTarget || lockedTarget.authUserId) {
				throw new Error('The selected Person is no longer available for login attachment.');
			}
			if (!lockedGenerated || lockedGenerated.authUserId !== createdAuthUserId) {
				throw new Error('The generated Person linkage could not be verified.');
			}

			await tx.update(person).set({ authUserId: null }).where(eq(person.id, generated.id));
			await tx.update(person).set({ authUserId: createdAuthUserId }).where(eq(person.id, personId));
			await tx.delete(person).where(eq(person.id, generated.id));
			await writeAdminAudit(tx, {
				actorAuthUserId: context.actorAuthUserId,
				targetPersonId: personId,
				targetAuthUserId: createdAuthUserId,
				action: 'authentication.created',
				metadata: { email: normalizedEmail }
			});
		});

		return getPersonAdminDetail(personId);
	} catch (error) {
		if (createdAuthUserId) {
			try {
				await auth.api.removeUser({
					body: { userId: createdAuthUserId },
					headers: context.headers
				});
				if (generatedPersonId) {
					await db.delete(person).where(eq(person.id, generatedPersonId));
				}
			} catch (cleanupError) {
				console.error('Failed to compensate for login provisioning failure', cleanupError);
			}
		}
		throw error;
	}
}

export async function updateAuthenticationDetails(
	personId: string,
	input: { email: string; name?: string },
	context: AdminMutationContext
) {
	const target = await getRequiredLinkedPerson(personId);
	const email = input.email.trim().toLowerCase();
	if (!email || !email.includes('@')) throw new Error('Enter a valid email address.');
	await auth.api.adminUpdateUser({
		body: {
			userId: target.auth.id,
			data: { email, name: input.name?.trim() || target.person.displayName }
		},
		headers: context.headers
	});
	await recordAdminAudit({
		actorAuthUserId: context.actorAuthUserId,
		targetPersonId: personId,
		targetAuthUserId: target.auth.id,
		action: 'authentication.updated',
		metadata: { email }
	});
}

export async function replaceUserPassword(
	personId: string,
	newPassword: string,
	context: AdminMutationContext
) {
	const target = await getRequiredLinkedPerson(personId);
	if (newPassword.length < MIN_PASSWORD_LENGTH)
		throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
	await auth.api.setUserPassword({
		body: { userId: target.auth.id, newPassword },
		headers: context.headers
	});
	await recordAdminAudit({
		actorAuthUserId: context.actorAuthUserId,
		targetPersonId: personId,
		targetAuthUserId: target.auth.id,
		action: 'authentication.password-replaced',
		metadata: { changed: true, password: newPassword }
	});
}

export async function setAdministratorAccess(
	personId: string,
	isAdmin: boolean,
	confirmation: string | undefined,
	context: AdminMutationContext
) {
	const target = await getRequiredLinkedPerson(personId);
	if (!isAdmin) {
		requireConfirmation(confirmation, 'REMOVE ADMIN');
		assertNotSelf(context.actorAuthUserId, target.auth.id, 'remove administrator access from');
	}

	await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_LOCK_ID})`);
		if (!isAdmin) await assertAnotherAdministratorExists(target.auth.id);
		await auth.api.setRole({
			body: { userId: target.auth.id, role: isAdmin ? 'admin' : 'user' },
			headers: context.headers
		});
		await writeAdminAudit(tx, {
			actorAuthUserId: context.actorAuthUserId,
			targetPersonId: personId,
			targetAuthUserId: target.auth.id,
			action: isAdmin ? 'authentication.admin-granted' : 'authentication.admin-removed',
			metadata: { isAdmin }
		});
	});
}

export async function setLoginBan(
	personId: string,
	banned: boolean,
	reason: string | undefined,
	context: AdminMutationContext
) {
	const target = await getRequiredLinkedPerson(personId);
	if (banned) assertNotSelf(context.actorAuthUserId, target.auth.id, 'ban');
	if (banned) {
		await auth.api.banUser({
			body: { userId: target.auth.id, banReason: reason?.trim() || 'Disabled by administrator' },
			headers: context.headers
		});
	} else {
		await auth.api.unbanUser({ body: { userId: target.auth.id }, headers: context.headers });
	}
	await recordAdminAudit({
		actorAuthUserId: context.actorAuthUserId,
		targetPersonId: personId,
		targetAuthUserId: target.auth.id,
		action: banned ? 'authentication.banned' : 'authentication.unbanned',
		metadata: { banned, reason: reason?.trim() || null }
	});
}

export async function listPersonSessions(personId: string, context: AdminMutationContext) {
	const target = await getRequiredLinkedPerson(personId);
	const result = await auth.api.listUserSessions({
		body: { userId: target.auth.id },
		headers: context.headers
	});
	return result.sessions.map((session) => ({
		id: session.id,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		expiresAt: session.expiresAt,
		ipAddress: session.ipAddress ?? null,
		userAgent: session.userAgent ?? null
	}));
}

export async function revokePersonSession(
	personId: string,
	sessionId: string,
	context: AdminMutationContext
) {
	const target = await getRequiredLinkedPerson(personId);
	const result = await auth.api.listUserSessions({
		body: { userId: target.auth.id },
		headers: context.headers
	});
	const session = result.sessions.find((candidate) => candidate.id === sessionId);
	if (!session) throw new Error('Session not found.');
	await auth.api.revokeUserSession({
		body: { sessionToken: session.token },
		headers: context.headers
	});
	await recordAdminAudit({
		actorAuthUserId: context.actorAuthUserId,
		targetPersonId: personId,
		targetAuthUserId: target.auth.id,
		action: 'session.revoked',
		metadata: { sessionId }
	});
}

export async function revokeAllPersonSessions(personId: string, context: AdminMutationContext) {
	const target = await getRequiredLinkedPerson(personId);
	await auth.api.revokeUserSessions({
		body: { userId: target.auth.id },
		headers: context.headers
	});
	await recordAdminAudit({
		actorAuthUserId: context.actorAuthUserId,
		targetPersonId: personId,
		targetAuthUserId: target.auth.id,
		action: 'session.all-revoked',
		metadata: { all: true }
	});
}

export async function removePersonLogin(
	personId: string,
	confirmation: string | undefined,
	context: AdminMutationContext
) {
	requireConfirmation(confirmation, 'REMOVE LOGIN');
	const target = await getRequiredLinkedPerson(personId);
	assertNotSelf(context.actorAuthUserId, target.auth.id, 'remove login from');

	await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_LOCK_ID})`);
		if (
			target.auth.isAdmin ||
			hasAdminRole(
				(
					await db.query.user.findFirst({
						where: eq(user.id, target.auth.id)
					})
				)?.role
			)
		) {
			await assertAnotherAdministratorExists(target.auth.id);
		}
		await auth.api.removeUser({ body: { userId: target.auth.id }, headers: context.headers });
		await writeAdminAudit(tx, {
			actorAuthUserId: context.actorAuthUserId,
			targetPersonId: personId,
			targetAuthUserId: target.auth.id,
			action: 'authentication.removed',
			metadata: { retainedPerson: true }
		});
	});
}
