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

	await page.goto(
		`/admin/teams?search=${encodeURIComponent(teamName)}&type=product&status=active`
	);
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
