import { expect, test } from '@playwright/test';

const DEV_EMAIL = 'dev@org-teams.local';
const DEV_PASSWORD = 'password';

async function loginAsDeveloper(page: import('@playwright/test').Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(DEV_EMAIL);
	await page.getByLabel('Password').fill(DEV_PASSWORD);
	await page.getByRole('button', { name: 'Login' }).click();
	await expect(page).toHaveURL('/protected');
}

test('development administrator manages a Person and attaches standard login', async ({
	page,
	browser
}) => {
	const suffix = `${Date.now()}-${test.info().workerIndex}`;
	const displayName = `Admin Test ${suffix}`;
	const loginEmail = `admin-test-${suffix}@example.test`;

	await loginAsDeveloper(page);
	await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
	await page.getByRole('link', { name: 'Admin' }).click();
	await expect(page).toHaveURL('/admin/people');
	await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
	await page.getByLabel('Search').fill(DEV_EMAIL);
	await page.getByRole('button', { name: 'Filter' }).click();
	await page.getByRole('link', { name: 'Developer' }).click();
	await page.getByRole('link', { name: 'Authentication' }).click();
	await page.getByLabel('Reason').fill('Self-protection check');
	await page.getByRole('button', { name: 'Disable login' }).click();
	await expect(page.getByRole('alert')).toContainText('cannot ban themselves');

	await page.goto('/admin/people');

	await page.getByLabel('Display name').fill(displayName);
	await page.getByLabel('Employee identifier').fill(`E2E-${suffix}`);
	await page.getByLabel('Job title').fill('Initial title');
	await page.getByRole('button', { name: 'Create person' }).click();
	await expect(page.getByRole('status')).toContainText('Person created');
	await page.getByRole('link', { name: displayName }).click();

	await expect(page.getByRole('heading', { name: displayName })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Details' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Authentication' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Sessions' })).toBeVisible();

	await page.getByRole('link', { name: 'Details' }).click();
	await page.getByLabel('Job title').fill('Updated title');
	await page.getByRole('button', { name: 'Save details' }).click();
	await expect(page.getByRole('status')).toContainText('updated');

	await page.getByRole('link', { name: 'Authentication' }).click();
	await expect(page.getByRole('heading', { name: 'Add email/password login' })).toBeVisible();
	await page.getByLabel('Email').fill(loginEmail);
	await page.getByLabel('Initial password').fill('password123');
	await page.getByRole('button', { name: 'Add login' }).click();
	await expect(page.getByRole('status')).toContainText('Login access added');
	await expect(page.getByLabel('Login email')).toHaveValue(loginEmail);

	await page.getByRole('link', { name: 'Sessions' }).click();
	await expect(page.getByText('No active sessions.')).toBeVisible();

	await page.getByRole('link', { name: 'Overview' }).click();
	await expect(page.getByText('person.created')).toBeVisible();
	await expect(page.getByText('authentication.created')).toBeVisible();
	await page.setViewportSize({ width: 1280, height: 800 });
	await expect(page.getByRole('main')).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Person administration' })).toBeVisible();
	await page.keyboard.press('Tab');
	await expect(page.locator(':focus')).toBeVisible();

	await page.setViewportSize({ width: 320, height: 800 });
	await expect(page.getByRole('navigation', { name: 'Person administration' })).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)
	).toBe(true);

	await page.setViewportSize({ width: 1280, height: 800 });
	await page.getByRole('button', { name: 'Logout' }).click();
	await expect(page).toHaveURL('/login');

	const standardUserContext = await browser.newContext({
		baseURL: test.info().project.use.baseURL
	});
	const standardUserPage = await standardUserContext.newPage();
	await standardUserPage.goto('/login');
	await standardUserPage.getByLabel('Email').fill(loginEmail);
	await standardUserPage.getByLabel('Password').fill('password123');
	const loginResponsePromise = standardUserPage.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/login' && response.request().method() === 'POST'
	);
	await standardUserPage.getByRole('button', { name: 'Login' }).click();
	expect((await loginResponsePromise).status()).toBe(303);
	await expect(standardUserPage).toHaveURL('/protected');
	await expect(standardUserPage.getByRole('link', { name: 'Admin' })).toHaveCount(0);

	const directAdminResponse = await standardUserPage.goto('/admin/people');
	expect(directAdminResponse?.status()).toBe(403);
	await expect(standardUserPage.getByText('Administrator access is required.')).toBeVisible();
	for (const path of ['/admin/organizations', '/admin/teams']) {
		const response = await standardUserPage.goto(path);
		expect(response?.status()).toBe(403);
	}
	await standardUserContext.close();
});

test('anonymous visitors are redirected before admin data loads', async ({ page }) => {
	for (const path of ['/admin/people', '/admin/organizations', '/admin/teams']) {
		await page.goto(path);
		await expect(page).toHaveURL('/login');
	}
	await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
});

test('administrator defines, transfers, and safely deactivates Organizations and Teams', async ({
	page
}) => {
	const suffix = `${Date.now()}-${test.info().workerIndex}`;
	const sourceName = `Source Organization ${suffix}`;
	const destinationName = `Destination Organization ${suffix}`;
	const teamName = `Matrix Team ${suffix}`;
	async function openOrganization(name: string) {
		await page.goto(`/admin/organizations?search=${encodeURIComponent(name)}`);
		await expect(page.getByLabel('Search')).toHaveValue(name);
		await page.getByRole('link', { name }).click();
	}

	await loginAsDeveloper(page);
	await page.getByRole('link', { name: 'Admin' }).click();
	await page
		.getByRole('navigation', { name: 'Administration' })
		.getByRole('link', { name: 'Organizations' })
		.click();

	for (const name of [sourceName, destinationName]) {
		await page.getByLabel('Organization name').fill(name);
		await page.getByLabel('Description').fill(`Description for ${name}`);
		await page.getByRole('button', { name: 'Create Organization' }).click();
		await expect(page.getByRole('status')).toContainText('Organization created');
	}

	await page
		.getByRole('navigation', { name: 'Administration' })
		.getByRole('link', { name: 'Teams' })
		.click();
	await page.waitForLoadState('networkidle');
	for (const owner of [sourceName, destinationName]) {
		await page.getByLabel('Team name').fill(teamName);
		await page.getByLabel('Owning Organization').selectOption({ label: owner });
		await page.getByLabel('Team type').last().selectOption('product');
		await page.getByLabel('Purpose').fill(`Owned by ${owner}`);
		await page.getByRole('button', { name: 'Create Team' }).click();
		await expect(page.getByRole('status')).toContainText('Team created');
	}

	await page.goto(`/admin/teams?search=${encodeURIComponent(teamName)}&type=product&status=active`);
	await expect(page.getByLabel('Search')).toHaveValue(teamName);
	await expect(page.locator('form[method="GET"] select[name="type"]')).toHaveValue('product');
	await expect(page.locator('form[method="GET"] select[name="status"]')).toHaveValue('active');
	await expect(page.getByRole('link', { name: teamName })).toHaveCount(2);

	await openOrganization(sourceName);
	const blockedResponsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname.startsWith('/admin/organizations/') &&
			response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Deactivate Organization' }).click();
	const blockedResponse = await blockedResponsePromise;
	expect(blockedResponse.request().postData()).toContain('status=inactive');
	expect(blockedResponse.status()).toBe(409);
	await expect(page.getByRole('alert')).toContainText('Deactivate or transfer 1 active Team');
	await page.getByRole('alert').getByRole('link', { name: teamName }).click();
	await page.getByLabel('Purpose').fill(`Updated purpose ${suffix}`);
	await page.getByRole('button', { name: 'Save Team' }).click();
	await expect(page.getByRole('status')).toContainText('Team updated');

	await page.getByLabel('Destination Organization').selectOption({ label: destinationName });
	await page.getByLabel('Type TRANSFER to confirm').fill('TRANSFER');
	await page.getByRole('button', { name: 'Transfer Team' }).click();
	await expect(page.getByRole('status')).toContainText('Team transferred');
	await expect(page.getByRole('link', { name: destinationName })).toBeVisible();
	await expect(page.getByText('team.transferred')).toBeVisible();

	await openOrganization(sourceName);
	await page.getByRole('button', { name: 'Deactivate Organization' }).click();
	await expect(page.getByRole('status')).toContainText('Organization updated');
	await expect(page.getByRole('button', { name: 'Reactivate Organization' })).toBeVisible();

	const sourceId = new URL(page.url()).pathname.split('/').at(-1)!;
	const rejectedCreate = await page.evaluate(
		async ({ organizationId, name }) => {
			const response = await fetch('/admin/teams?/create', {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ organizationId, name, type: 'other', status: 'active' })
			});
			return { status: response.status, body: await response.text() };
		},
		{ organizationId: sourceId, name: `Rejected Team ${suffix}` }
	);
	expect(rejectedCreate.body).toContain('must be active');

	await page.setViewportSize({ width: 320, height: 800 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)
	).toBe(true);
});

test('administrator builds a Team hierarchy and manages hierarchy-derived supervision safely', async ({
	page
}) => {
	test.setTimeout(90_000);
	const suffix = `${Date.now()}-${test.info().workerIndex}`;
	const organizationName = `Hierarchy Organization ${suffix}`;
	const destinationName = `Hierarchy Destination ${suffix}`;
	const rootName = `Engineering ${suffix}`;
	const childName = `Platform ${suffix}`;
	const otherRootName = `Operations ${suffix}`;
	const rootManagerName = `Engineering Manager ${suffix}`;
	const childManagerName = `Platform Manager ${suffix}`;

	async function createPerson(displayName: string) {
		await page.goto('/admin/people');
		const form = page.getByRole('heading', { name: 'Add a person without login' }).locator('..');
		await form.getByLabel('Display name').fill(displayName);
		await form.getByRole('button', { name: 'Create person' }).click();
		await expect(page.getByRole('status')).toContainText('Person created');
		await page.goto(`/admin/people?search=${encodeURIComponent(displayName)}`);
		await page.getByRole('link', { name: displayName }).click();
		await expect(page).toHaveURL(/\/admin\/people\/[^/]+$/);
		return new URL(page.url()).pathname.split('/').at(-1)!;
	}

	async function createOrganization(name: string) {
		await page.goto('/admin/organizations');
		const form = page.getByRole('heading', { name: 'Add an Organization' }).locator('..');
		await form.getByLabel('Organization name').fill(name);
		await form.getByRole('button', { name: 'Create Organization' }).click();
		await expect(page.getByRole('status')).toContainText('Organization created');
	}

	async function createTeam(name: string, owner: string) {
		await page.goto('/admin/teams');
		const form = page.getByRole('heading', { name: 'Add a Team' }).locator('..');
		await form.getByLabel('Team name').fill(name);
		await form.getByLabel('Owning Organization').selectOption({ label: owner });
		await form.getByLabel('Team type').selectOption('functional');
		await form.getByRole('button', { name: 'Create Team' }).click();
		await expect(page.getByRole('status')).toContainText('Team created');
	}

	async function openTeam(name: string) {
		await page.goto(`/admin/teams?search=${encodeURIComponent(name)}`);
		await page.getByRole('link', { name }).click();
		await expect(page).toHaveURL(/\/admin\/teams\/[^/]+$/);
		return new URL(page.url()).pathname.split('/').at(-1)!;
	}

	await loginAsDeveloper(page);
	const rootManagerId = await createPerson(rootManagerName);
	const childManagerId = await createPerson(childManagerName);
	await createOrganization(organizationName);
	await createOrganization(destinationName);
	await createTeam(rootName, organizationName);
	await createTeam(childName, organizationName);
	await createTeam(otherRootName, organizationName);

	const rootId = await openTeam(rootName);
	const rootManagerSelect = page.locator('select[name="managerPersonId"]');
	await rootManagerSelect.selectOption({ label: rootManagerName });
	await expect(rootManagerSelect).toHaveValue(rootManagerId);
	await page.getByRole('button', { name: 'Update manager' }).click();
	await expect(page.getByRole('status')).toContainText('Team manager updated');

	const childId = await openTeam(childName);
	await page.getByLabel('Parent Team').selectOption({ label: `${rootName} · active` });
	await page.getByRole('button', { name: 'Update parent' }).click();
	await expect(page.getByRole('status')).toContainText('Parent Team updated');
	const childManagerSelect = page.locator('select[name="managerPersonId"]');
	await childManagerSelect.selectOption({ label: childManagerName });
	await expect(childManagerSelect).toHaveValue(childManagerId);
	const managerResponsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === `/admin/teams/${childId}` &&
			response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Update manager' }).click();
	const managerResponse = await managerResponsePromise;
	expect(managerResponse.request().postData()).toContain(`managerPersonId=${childManagerId}`);
	await expect(page.getByRole('status')).toContainText('Team manager updated');
	await expect(page.getByText('Supervisor through parent Team:').locator('..')).toContainText(
		rootManagerName
	);

	await page.goto(`/admin/organizations?search=${encodeURIComponent(organizationName)}`);
	await page.getByRole('link', { name: organizationName }).click();
	const hierarchy = page.getByRole('tree', { name: 'Team hierarchy' });
	await expect(hierarchy.getByRole('link', { name: rootName })).toBeVisible();
	await expect(hierarchy.getByRole('link', { name: childName })).toBeVisible();
	await expect(hierarchy.getByRole('link', { name: otherRootName })).toBeVisible();

	const cycleResult = await page.evaluate(
		async ({ teamId, parentTeamId }) => {
			const response = await fetch(`/admin/teams/${teamId}?/parent`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ parentTeamId })
			});
			return { status: response.status, body: await response.text() };
		},
		{ teamId: rootId, parentTeamId: childId }
	);
	expect(cycleResult.body).toContain('cycle');

	const selfSupervisionResult = await page.evaluate(
		async ({ teamId, managerPersonId }) => {
			const response = await fetch(`/admin/teams/${teamId}?/manager`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ managerPersonId })
			});
			return { status: response.status, body: await response.text() };
		},
		{ teamId: childId, managerPersonId: rootManagerId }
	);
	expect(selfSupervisionResult.body).toContain('reporting chain');

	await openTeam(rootName);
	await page.getByRole('button', { name: 'Deactivate Team' }).click();
	await expect(page.getByRole('alert')).toContainText('active descendant');
	await expect(page.getByRole('alert').getByRole('link', { name: childName })).toBeVisible();

	await page.goto(`/admin/people/${rootManagerId}/details`);
	await page.getByLabel('Status').selectOption('inactive');
	await page.getByRole('button', { name: 'Save details' }).click();
	await expect(page.getByRole('alert')).toContainText('managed by this Person');
	await expect(page.getByRole('alert').getByRole('link', { name: rootName })).toBeVisible();

	await openTeam(childName);
	await page.getByLabel('Destination Organization').selectOption({ label: destinationName });
	await page.getByLabel('Type TRANSFER to confirm').fill('TRANSFER');
	await page.getByRole('button', { name: 'Transfer Team' }).click();
	await expect(page.getByRole('alert')).toContainText('parent and child relationships');
	await expect(page.getByRole('alert').getByRole('link', { name: rootName })).toBeVisible();

	await page.getByLabel('Parent Team').selectOption('');
	await page.getByRole('button', { name: 'Update parent' }).click();
	await expect(page.getByRole('status')).toContainText('Parent Team updated');
	await page.getByLabel('Destination Organization').selectOption({ label: destinationName });
	await page.getByLabel('Type TRANSFER to confirm').fill('TRANSFER');
	await page.getByRole('button', { name: 'Transfer Team' }).click();
	await expect(page.getByRole('status')).toContainText('Team transferred');

	await openTeam(rootName);
	await page.locator('select[name="managerPersonId"]').selectOption('');
	await page.getByRole('button', { name: 'Update manager' }).click();
	await page.goto(`/admin/people/${rootManagerId}/details`);
	await page.getByLabel('Status').selectOption('inactive');
	await page.getByRole('button', { name: 'Save details' }).click();
	await expect(page.getByRole('status')).toContainText('Person details updated');

	await page.setViewportSize({ width: 320, height: 800 });
	await openTeam(childName);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)
	).toBe(true);
	expect(childManagerId).toBeTruthy();
});

test('administrator manages Team membership from Team and Person perspectives', async ({
	page
}) => {
	test.setTimeout(90_000);
	const suffix = `${Date.now()}-${test.info().workerIndex}`;
	const organizationName = `Membership Organization ${suffix}`;
	const teamName = `Membership Team ${suffix}`;
	const memberName = `Membership Person ${suffix}`;

	await loginAsDeveloper(page);
	await page.getByRole('link', { name: 'Admin' }).click();
	await page
		.getByRole('navigation', { name: 'Administration' })
		.getByRole('link', { name: 'Organizations' })
		.click();
	const organizationForm = page.getByRole('heading', { name: 'Add an Organization' }).locator('..');
	await organizationForm.getByLabel('Organization name').fill(organizationName);
	await organizationForm.getByRole('button', { name: 'Create Organization' }).click();
	await expect(page.getByRole('status')).toContainText('Organization created');

	await page.goto('/admin/teams');
	const teamForm = page.getByRole('heading', { name: 'Add a Team' }).locator('..');
	await teamForm.getByLabel('Team name').fill(teamName);
	await teamForm.getByLabel('Owning Organization').selectOption({ label: organizationName });
	await teamForm.getByLabel('Team type').selectOption('functional');
	await teamForm.getByRole('button', { name: 'Create Team' }).click();
	await expect(page.getByRole('status')).toContainText('Team created');

	await page.goto('/admin/people');
	const personForm = page
		.getByRole('heading', { name: 'Add a person without login' })
		.locator('..');
	await personForm.getByLabel('Display name').fill(memberName);
	await personForm.getByRole('button', { name: 'Create person' }).click();
	await expect(page.getByRole('status')).toContainText('Person created');

	await page.goto(`/admin/teams?search=${encodeURIComponent(teamName)}`);
	const teamLink = page.getByRole('link', { name: teamName, exact: true });
	const teamId = (await teamLink.getAttribute('href'))!.split('/').at(-1)!;
	expect(teamId).toMatch(/^[0-9a-f-]{36}$/);
	await teamLink.click();
	await expect(page).toHaveURL(new RegExp(`/admin/teams/${teamId}$`));
	const createMembershipForm = page.locator('form[action*="membershipCreate"]');
	await createMembershipForm.getByLabel('Person').selectOption({ label: memberName });
	await createMembershipForm.getByLabel('Role on Team').fill('Platform engineer');
	await createMembershipForm.getByRole('button', { name: 'Assign member' }).click();
	await expect(page.getByRole('status')).toContainText('Team member assigned');
	const roster = page
		.getByRole('heading', { name: 'Team roster' })
		.locator('xpath=ancestor::section[1]');
	const memberRow = roster.getByRole('listitem').filter({ hasText: memberName });
	await expect(memberRow.getByRole('link', { name: memberName })).toHaveCount(1);
	await expect(memberRow.getByLabel('Role on Team')).toHaveValue('Platform engineer');

	const memberLink = memberRow.getByRole('link', { name: memberName, exact: true });
	const personId = (await memberLink.getAttribute('href'))!.split('/').at(-1)!;
	expect(personId).toMatch(/^[0-9a-f-]{36}$/);
	await memberLink.click();
	await expect(page).toHaveURL(new RegExp(`/admin/people/${personId}$`));
	await page
		.getByRole('navigation', { name: 'Person administration' })
		.getByRole('link', { name: 'Teams', exact: true })
		.click();
	const ordinaryMemberships = page
		.getByRole('heading', { name: 'Ordinary memberships' })
		.locator('xpath=ancestor::section[1]');
	const personMembershipRow = ordinaryMemberships
		.getByRole('listitem')
		.filter({ hasText: teamName });
	await expect(personMembershipRow.getByRole('link', { name: teamName })).toBeVisible();
	await personMembershipRow.getByLabel('Role on Team').fill('Principal engineer');
	await personMembershipRow.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Team role updated');

	await page.goto(`/admin/teams/${teamId}`);
	await page.locator('select[name="managerPersonId"]').selectOption({ label: memberName });
	await page.getByRole('button', { name: 'Update manager' }).click();
	await expect(page.getByRole('status')).toContainText('Team manager updated');
	const promotedRow = roster.getByRole('listitem').filter({ hasText: memberName });
	await expect(promotedRow.getByRole('link', { name: memberName })).toHaveCount(1);
	await expect(promotedRow.getByText('Team manager')).toBeVisible();

	await page.goto(`/admin/people/${personId}/teams`);
	await expect(page.getByText('No ordinary Team memberships.')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Managed Teams' }).locator('..')).toContainText(
		teamName
	);

	await page.goto(`/admin/teams/${teamId}`);
	await page.locator('select[name="managerPersonId"]').selectOption('');
	await page.getByRole('button', { name: 'Update manager' }).click();
	await page.goto(`/admin/people/${personId}/teams`);
	const personAssignmentForm = page
		.getByRole('heading', { name: 'Assign to a Team' })
		.locator('xpath=ancestor::section[1]')
		.locator('form');
	await personAssignmentForm
		.getByLabel('Team', { exact: true })
		.selectOption({ label: `${organizationName} · ${teamName}` });
	await personAssignmentForm.getByLabel('Role on Team').fill('Advisor');
	await personAssignmentForm.getByRole('button', { name: 'Assign Team' }).click();
	await expect(page.getByRole('status')).toContainText('Team assigned');
	await page.getByRole('button', { name: 'Remove' }).click();
	await expect(page.getByRole('status')).toContainText('Team membership removed');
	await expect(page.getByText('No ordinary Team memberships.')).toBeVisible();
});
