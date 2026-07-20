import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const writeAdminAudit = vi.fn();
vi.mock('./audit', () => ({ writeAdminAudit }));

const { db } = await import('$lib/server/db');
const { organization, team } = await import('$lib/server/db/schema');
const { assignTeamParent } = await import('./team-hierarchy');

const organizationIds: string[] = [];
const teamIds: string[] = [];

afterEach(async () => {
	writeAdminAudit.mockReset();
	for (const teamId of teamIds.splice(0)) await db.delete(team).where(eq(team.id, teamId));
	for (const organizationId of organizationIds.splice(0)) {
		await db.delete(organization).where(eq(organization.id, organizationId));
	}
});

describe('Team hierarchy audit atomicity', () => {
	it('rolls back the parent mutation when its audit write fails', async () => {
		const [owner] = await db
			.insert(organization)
			.values({ name: `Audit Rollback ${randomUUID()}` })
			.returning();
		organizationIds.push(owner.id);
		const [parent, child] = await db
			.insert(team)
			.values([
				{ organizationId: owner.id, name: 'Audit Parent', type: 'department' },
				{ organizationId: owner.id, name: 'Audit Child', type: 'functional' }
			])
			.returning();
		teamIds.push(child.id, parent.id);
		writeAdminAudit.mockRejectedValue(new Error('audit unavailable'));

		await expect(assignTeamParent(child.id, parent.id, 'actor-id')).rejects.toThrow(
			'audit unavailable'
		);
		expect(await db.query.team.findFirst({ where: eq(team.id, child.id) })).toMatchObject({
			parentTeamId: null
		});
	});
});
