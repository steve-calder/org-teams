import { asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organization, person, team, type Team } from '$lib/server/db/schema';
import { writeAdminAudit } from './audit';

type AdminTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface TeamManagerSummary {
	id: string;
	displayName: string;
	status: 'active' | 'inactive';
}

export interface TeamHierarchyNode {
	id: string;
	name: string;
	type: Team['type'];
	status: Team['status'];
	parentTeamId: string | null;
	manager: TeamManagerSummary | null;
	children: TeamHierarchyNode[];
}

export interface TeamHierarchySummary {
	roots: TeamHierarchyNode[];
	total: number;
	hasIntegrityIssue: boolean;
}

const teamOrder = (left: Pick<Team, 'name' | 'id'>, right: Pick<Team, 'name' | 'id'>) =>
	left.name.localeCompare(right.name) || left.id.localeCompare(right.id);

async function selectOrganizationTeams(
	executor: Pick<typeof db, 'select'>,
	organizationId: string
) {
	return executor
		.select({
			id: team.id,
			organizationId: team.organizationId,
			parentTeamId: team.parentTeamId,
			managerPersonId: team.managerPersonId,
			name: team.name,
			purpose: team.purpose,
			type: team.type,
			status: team.status,
			createdAt: team.createdAt,
			updatedAt: team.updatedAt,
			managerId: person.id,
			managerDisplayName: person.displayName,
			managerStatus: person.status
		})
		.from(team)
		.leftJoin(person, eq(team.managerPersonId, person.id))
		.where(eq(team.organizationId, organizationId))
		.orderBy(asc(team.name), asc(team.id));
}

function toTeamRows(
	rows: Awaited<ReturnType<typeof selectOrganizationTeams>>
): (Team & { manager: TeamManagerSummary | null })[] {
	return rows.map((row) => ({
		id: row.id,
		organizationId: row.organizationId,
		parentTeamId: row.parentTeamId,
		managerPersonId: row.managerPersonId,
		name: row.name,
		purpose: row.purpose,
		type: row.type,
		status: row.status,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		manager: row.managerId
			? {
					id: row.managerId,
					displayName: row.managerDisplayName!,
					status: row.managerStatus!
				}
			: null
	}));
}

export async function listOrganizationTeamHierarchy(
	organizationId: string
): Promise<TeamHierarchySummary> {
	const rows = toTeamRows(await selectOrganizationTeams(db, organizationId));
	const nodes = new Map<string, TeamHierarchyNode>();
	for (const row of rows) {
		nodes.set(row.id, {
			id: row.id,
			name: row.name,
			type: row.type,
			status: row.status,
			parentTeamId: row.parentTeamId,
			manager: row.manager,
			children: []
		});
	}

	const roots: TeamHierarchyNode[] = [];
	let hasIntegrityIssue = false;
	for (const node of nodes.values()) {
		if (!node.parentTeamId) {
			roots.push(node);
			continue;
		}
		const parentNode = nodes.get(node.parentTeamId);
		if (!parentNode) {
			hasIntegrityIssue = true;
			roots.push(node);
			continue;
		}
		parentNode.children.push(node);
	}

	const sortNodes = (items: TeamHierarchyNode[], ancestors = new Set<string>()) => {
		items.sort(teamOrder);
		for (const item of items) {
			if (ancestors.has(item.id)) {
				hasIntegrityIssue = true;
				item.children = [];
				continue;
			}
			sortNodes(item.children, new Set([...ancestors, item.id]));
		}
	};
	sortNodes(roots);

	return { roots, total: rows.length, hasIntegrityIssue };
}

export async function getTeamHierarchyContext(teamId: string) {
	const current = await db.query.team.findFirst({ where: eq(team.id, teamId) });
	if (!current) return undefined;
	const rows = toTeamRows(await selectOrganizationTeams(db, current.organizationId));
	const byId = new Map(rows.map((row) => [row.id, row]));
	const currentRow = byId.get(teamId)!;
	const parent = currentRow.parentTeamId ? (byId.get(currentRow.parentTeamId) ?? null) : null;
	const children = rows.filter((row) => row.parentTeamId === teamId).sort(teamOrder);

	return {
		parent: parent
			? {
					id: parent.id,
					name: parent.name,
					status: parent.status,
					manager: parent.manager
				}
			: null,
		children: children.map((child) => ({
			id: child.id,
			name: child.name,
			status: child.status,
			manager: child.manager
		})),
		manager: currentRow.manager,
		supervisor: currentRow.manager && parent?.manager ? parent.manager : null
	};
}

function collectDescendantIds(rows: Team[], teamId: string): Set<string> {
	const descendants = new Set<string>();
	const pending = [teamId];
	while (pending.length) {
		const parentId = pending.pop()!;
		for (const row of rows) {
			if (row.parentTeamId === parentId && !descendants.has(row.id)) {
				descendants.add(row.id);
				pending.push(row.id);
			}
		}
	}
	return descendants;
}

function collectAncestorIds(rows: Team[], teamId: string | null): Set<string> {
	const ancestors = new Set<string>();
	const byId = new Map(rows.map((row) => [row.id, row]));
	let currentId = teamId;
	while (currentId) {
		if (ancestors.has(currentId)) throw new Error('The Team hierarchy contains a cycle.');
		ancestors.add(currentId);
		currentId = byId.get(currentId)?.parentTeamId ?? null;
	}
	return ancestors;
}

function validateManagerChain(rows: Team[], teamId: string, parentTeamId: string | null) {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const subtreeIds = new Set([teamId, ...collectDescendantIds(rows, teamId)]);
	const ancestorIds = collectAncestorIds(rows, parentTeamId);
	const subtreeManagers = new Set(
		[...subtreeIds].map((id) => byId.get(id)?.managerPersonId).filter(Boolean)
	);
	for (const ancestorId of ancestorIds) {
		const managerPersonId = byId.get(ancestorId)?.managerPersonId;
		if (managerPersonId && subtreeManagers.has(managerPersonId)) {
			throw new Error('The same Person cannot manage Teams in one reporting chain.');
		}
	}
}

export async function listEligibleParentOptions(teamId: string) {
	const current = await db.query.team.findFirst({ where: eq(team.id, teamId) });
	if (!current) return [];
	const rows = toTeamRows(await selectOrganizationTeams(db, current.organizationId));
	const descendants = collectDescendantIds(rows, teamId);
	return rows
		.filter((candidate) => {
			if (candidate.id === teamId || descendants.has(candidate.id)) return false;
			if (current.status === 'active' && candidate.status !== 'active') return false;
			try {
				validateManagerChain(rows, teamId, candidate.id);
				return true;
			} catch {
				return false;
			}
		})
		.map(({ id, name, status }) => ({ id, name, status }));
}

export async function listActiveManagerOptions() {
	return db
		.select({ id: person.id, displayName: person.displayName, status: person.status })
		.from(person)
		.where(eq(person.status, 'active'))
		.orderBy(asc(person.displayName), asc(person.id));
}

export async function lockOrganizationStructure(tx: AdminTransaction, organizationId: string) {
	await tx.execute(sql`select id from ${organization} where id = ${organizationId} for update`);
}

async function loadLockedTeamRows(tx: AdminTransaction, teamId: string) {
	const [initial] = await tx.select().from(team).where(eq(team.id, teamId)).limit(1);
	if (!initial) throw new Error('Team not found.');
	await lockOrganizationStructure(tx, initial.organizationId);
	const [current] = await tx.select().from(team).where(eq(team.id, teamId)).limit(1);
	if (!current || current.organizationId !== initial.organizationId) {
		throw new Error('Team ownership changed; retry the operation.');
	}
	const rows = await tx
		.select()
		.from(team)
		.where(eq(team.organizationId, current.organizationId))
		.orderBy(asc(team.name), asc(team.id));
	return { current, rows };
}

export async function assignTeamParent(
	teamId: string,
	parentTeamId: string | null,
	actorAuthUserId: string
): Promise<Team> {
	return db.transaction(async (tx) => {
		const { current, rows } = await loadLockedTeamRows(tx, teamId);
		if (current.parentTeamId === parentTeamId) return current;
		if (parentTeamId) {
			if (parentTeamId === teamId) throw new Error('A Team cannot be its own parent.');
			const parent = rows.find((row) => row.id === parentTeamId);
			if (!parent) throw new Error('Parent Team must belong to the same Organization.');
			if (current.status === 'active' && parent.status !== 'active') {
				throw new Error('An active Team requires an active parent Team.');
			}
			if (collectDescendantIds(rows, teamId).has(parentTeamId)) {
				throw new Error('This parent assignment would create a Team hierarchy cycle.');
			}
		}
		validateManagerChain(rows, teamId, parentTeamId);

		const [updated] = await tx
			.update(team)
			.set({ parentTeamId })
			.where(eq(team.id, teamId))
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetTeamId: teamId,
			action: 'team.parent_changed',
			metadata: {
				field: 'parentTeamId',
				previousParentTeamId: current.parentTeamId,
				parentTeamId
			}
		});
		return updated;
	});
}

export async function assignTeamManager(
	teamId: string,
	managerPersonId: string | null,
	actorAuthUserId: string
): Promise<Team> {
	return db.transaction(async (tx) => {
		const { current, rows } = await loadLockedTeamRows(tx, teamId);
		if (current.managerPersonId === managerPersonId) return current;
		if (managerPersonId) {
			await tx.execute(sql`select id from ${person} where id = ${managerPersonId} for update`);
			const [manager] = await tx
				.select()
				.from(person)
				.where(eq(person.id, managerPersonId))
				.limit(1);
			if (!manager || manager.status !== 'active') {
				throw new Error('Select an active Person as Team manager.');
			}
			const relatedIds = new Set([
				...collectAncestorIds(rows, current.parentTeamId),
				...collectDescendantIds(rows, teamId)
			]);
			if (rows.some((row) => relatedIds.has(row.id) && row.managerPersonId === managerPersonId)) {
				throw new Error('The same Person cannot manage Teams in one reporting chain.');
			}
		}

		const [updated] = await tx
			.update(team)
			.set({ managerPersonId })
			.where(eq(team.id, teamId))
			.returning();
		await writeAdminAudit(tx, {
			actorAuthUserId,
			targetTeamId: teamId,
			action: 'team.manager_changed',
			metadata: {
				field: 'managerPersonId',
				previousManagerPersonId: current.managerPersonId,
				managerPersonId
			}
		});
		return updated;
	});
}
