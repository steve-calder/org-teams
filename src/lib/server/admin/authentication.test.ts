import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

let simulateMissingGeneratedPerson = false;
const sessionToken = 'sensitive-session-token';

const createUser = vi.fn(
	async ({ body }: { body: { email: string; name: string; role: string } }) => {
		const { db } = await import('$lib/server/db');
		const { person, user } = await import('$lib/server/db/schema');
		const id = randomUUID();
		await db.insert(user).values({
			id,
			name: body.name,
			email: body.email,
			role: body.role,
			banned: false
		});
		if (!simulateMissingGeneratedPerson) {
			await db.insert(person).values({ authUserId: id, displayName: body.name });
		}
		return { user: { id, name: body.name, email: body.email } };
	}
);
const removeUser = vi.fn(async ({ body }: { body: { userId: string } }) => {
	const { db } = await import('$lib/server/db');
	const { user } = await import('$lib/server/db/schema');
	await db.delete(user).where(eq(user.id, body.userId));
	return { success: true };
});
const setRole = vi.fn(async ({ body }: { body: { userId: string; role: string } }) => {
	const { db } = await import('$lib/server/db');
	const { user } = await import('$lib/server/db/schema');
	await db.update(user).set({ role: body.role }).where(eq(user.id, body.userId));
	return { user: { id: body.userId, role: body.role } };
});
const adminUpdateUser = vi.fn();
const setUserPassword = vi.fn();
const banUser = vi.fn();
const unbanUser = vi.fn();
const listUserSessions = vi.fn();
const revokeUserSession = vi.fn();
const revokeUserSessions = vi.fn();

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			createUser,
			removeUser,
			setRole,
			adminUpdateUser,
			setUserPassword,
			banUser,
			unbanUser,
			listUserSessions,
			revokeUserSession,
			revokeUserSessions
		}
	}
}));

const { db } = await import('$lib/server/db');
const { adminAuditEvent, person, user } = await import('$lib/server/db/schema');
const {
	addLoginToPerson,
	listPersonSessions,
	removePersonLogin,
	replaceUserPassword,
	revokePersonSession,
	setAdministratorAccess,
	setLoginBan
} = await import('./authentication');

const personIds: string[] = [];
const userIds: string[] = [];
const context = (actorAuthUserId = 'actor-admin') => ({
	actorAuthUserId,
	headers: new Headers({ cookie: 'session=admin' })
});

beforeEach(() => {
	simulateMissingGeneratedPerson = false;
	for (const mock of [
		createUser,
		removeUser,
		setRole,
		adminUpdateUser,
		setUserPassword,
		banUser,
		unbanUser,
		listUserSessions,
		revokeUserSession,
		revokeUserSessions
	]) {
		mock.mockClear();
	}
	adminUpdateUser.mockResolvedValue({});
	setUserPassword.mockResolvedValue({ status: true });
	banUser.mockResolvedValue({});
	unbanUser.mockResolvedValue({});
	revokeUserSession.mockResolvedValue({ success: true });
	revokeUserSessions.mockResolvedValue({ success: true });
	listUserSessions.mockResolvedValue({ sessions: [] });
});

afterEach(async () => {
	if (personIds.length) {
		await db.delete(adminAuditEvent).where(inArray(adminAuditEvent.targetPersonId, personIds));
		await db.delete(person).where(inArray(person.id, personIds.splice(0)));
	}
	if (userIds.length) await db.delete(user).where(inArray(user.id, userIds.splice(0)));
});

async function createPersonOnly(name = 'Person Only') {
	const [created] = await db.insert(person).values({ displayName: name }).returning();
	personIds.push(created.id);
	return created;
}

async function createLinkedPerson(role = 'user') {
	const authUserId = randomUUID();
	userIds.push(authUserId);
	await db.insert(user).values({
		id: authUserId,
		name: 'Linked Person',
		email: `${authUserId}@example.test`,
		role,
		banned: false
	});
	const [linkedPerson] = await db
		.insert(person)
		.values({ displayName: 'Linked Person', authUserId })
		.returning();
	personIds.push(linkedPerson.id);
	return { authUserId, person: linkedPerson };
}

describe('authentication administration services', () => {
	it('attaches login to an existing Person without retaining a generated duplicate', async () => {
		const target = await createPersonOnly('Login Target');
		const result = await addLoginToPerson(
			target.id,
			'LOGIN@example.test',
			'password123',
			context()
		);
		const linkedPeople = await db
			.select()
			.from(person)
			.where(eq(person.authUserId, result!.auth!.id));
		userIds.push(result!.auth!.id);

		expect(result).toMatchObject({
			person: { id: target.id, displayName: 'Login Target' },
			auth: { email: 'login@example.test' }
		});
		expect(linkedPeople).toHaveLength(1);
		expect(linkedPeople[0].id).toBe(target.id);
		const audit = await db.query.adminAuditEvent.findFirst({
			where: eq(adminAuditEvent.targetPersonId, target.id)
		});
		expect(audit?.action).toBe('authentication.created');
		expect(JSON.stringify(audit)).not.toContain('password123');
	});

	it('compensates when generated Person linkage cannot be verified and permits retry', async () => {
		const target = await createPersonOnly('Retry Target');
		simulateMissingGeneratedPerson = true;
		await expect(
			addLoginToPerson(target.id, 'retry@example.test', 'password123', context())
		).rejects.toThrow('did not create a Person');
		expect(removeUser).toHaveBeenCalledTimes(1);

		simulateMissingGeneratedPerson = false;
		const result = await addLoginToPerson(
			target.id,
			'retry@example.test',
			'password123',
			context()
		);
		userIds.push(result!.auth!.id);
		expect(result!.person.id).toBe(target.id);
	});

	it('never returns session tokens and resolves a session token only for revocation', async () => {
		const target = await createLinkedPerson();
		listUserSessions.mockResolvedValue({
			sessions: [
				{
					id: 'session-id',
					token: sessionToken,
					createdAt: new Date(),
					updatedAt: new Date(),
					expiresAt: new Date(Date.now() + 60_000),
					ipAddress: '127.0.0.1',
					userAgent: 'test'
				}
			]
		});

		const sessions = await listPersonSessions(target.person.id, context());
		expect(JSON.stringify(sessions)).not.toContain(sessionToken);
		await revokePersonSession(target.person.id, 'session-id', context());
		expect(revokeUserSession).toHaveBeenCalledWith(
			expect.objectContaining({ body: { sessionToken } })
		);
		const audit = await db.query.adminAuditEvent.findFirst({
			where: eq(adminAuditEvent.targetPersonId, target.person.id)
		});
		expect(JSON.stringify(audit)).not.toContain(sessionToken);
	});

	it('sanitizes replacement passwords from audits and blocks self-directed access loss', async () => {
		const target = await createLinkedPerson('admin');
		await replaceUserPassword(target.person.id, 'replacement-secret', context());
		const audit = await db.query.adminAuditEvent.findFirst({
			where: eq(adminAuditEvent.targetPersonId, target.person.id)
		});
		expect(audit?.action).toBe('authentication.password-replaced');
		expect(JSON.stringify(audit)).not.toContain('replacement-secret');

		await expect(
			setLoginBan(target.person.id, true, 'test', context(target.authUserId))
		).rejects.toThrow('cannot ban themselves');
		await expect(
			setAdministratorAccess(target.person.id, false, 'REMOVE ADMIN', context(target.authUserId))
		).rejects.toThrow('cannot remove administrator access from themselves');
		expect(banUser).not.toHaveBeenCalled();
	});

	it('delegates ban and unban lifecycle changes to Better Auth', async () => {
		const target = await createLinkedPerson();

		await setLoginBan(target.person.id, true, 'Access paused', context());
		await setLoginBan(target.person.id, false, undefined, context());

		expect(banUser).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { userId: target.authUserId, banReason: 'Access paused' }
			})
		);
		expect(unbanUser).toHaveBeenCalledWith(
			expect.objectContaining({ body: { userId: target.authUserId } })
		);
	});

	it('serializes concurrent demotions so one final administrator remains', async () => {
		const existingAdmins = await db.query.user.findMany({ where: eq(user.role, 'admin') });
		for (const existing of existingAdmins) {
			await db.update(user).set({ role: 'user' }).where(eq(user.id, existing.id));
		}
		const first = await createLinkedPerson('admin');
		const second = await createLinkedPerson('admin');

		try {
			const results = await Promise.allSettled([
				setAdministratorAccess(first.person.id, false, 'REMOVE ADMIN', context()),
				setAdministratorAccess(second.person.id, false, 'REMOVE ADMIN', context())
			]);
			const remainingAdmins = await db.query.user.findMany({
				where: eq(user.role, 'admin')
			});
			const targetIds = new Set<string>([first.authUserId, second.authUserId]);

			expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
			expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
			expect(remainingAdmins.some(({ id }) => targetIds.has(id))).toBe(true);
		} finally {
			for (const existing of existingAdmins) {
				await db.update(user).set({ role: 'admin' }).where(eq(user.id, existing.id));
			}
		}
	});

	it('removes login only with confirmation and retains the Person', async () => {
		const target = await createLinkedPerson();
		await expect(removePersonLogin(target.person.id, '', context())).rejects.toThrow(
			'Type REMOVE LOGIN'
		);

		await removePersonLogin(target.person.id, 'REMOVE LOGIN', context());
		const retained = await db.query.person.findFirst({ where: eq(person.id, target.person.id) });
		expect(retained).toMatchObject({ id: target.person.id, authUserId: null });
	});
});
