import { expect, test } from '@playwright/test';

const DEV_EMAIL = 'dev@org-teams.local';
const DEV_PASSWORD = 'password';

async function loginAsDeveloper(page: import('@playwright/test').Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(DEV_EMAIL);
	await page.getByLabel('Password').fill(DEV_PASSWORD);
	await page.getByRole('button', { name: 'Login' }).click();
	await expect(page).toHaveURL('/');
}

test('anonymous routes share the branded shell and home navigation', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('banner')).toBeVisible();
	await expect(page.getByRole('main')).toHaveCount(1);
	await expect(page.getByRole('link', { name: 'Org Teams home' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Logout' })).toHaveCount(0);
	await expect(
		page.getByRole('heading', {
			name: 'Understand your organization, even when work crosses Teams.'
		})
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Teams in context' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Every role has a place' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Managers with context' })).toBeVisible();
	await expect(
		page.getByRole('link', { name: 'See your place in the organization' })
	).toBeVisible();
	await expect(page.getByText('Identity with purpose')).toHaveCount(0);
	await expect(page.getByText('server-resolved', { exact: false })).toHaveCount(0);
	await expect(page.getByText('Your role')).toHaveCount(0);

	await page.getByRole('link', { name: 'Login' }).click();
	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('banner')).toBeVisible();
	await expect(page.getByRole('main')).toHaveCount(1);

	await page.getByRole('link', { name: 'Org Teams home' }).click();
	await expect(page).toHaveURL('/');
});

test('the welcome page reflows without horizontal overflow', async ({ page }) => {
	for (const viewport of [
		{ width: 320, height: 800 },
		{ width: 1280, height: 900 }
	]) {
		await page.setViewportSize(viewport);
		await page.goto('/');

		await expect(page.getByRole('banner')).toBeVisible();
		await expect(
			page.getByRole('heading', {
				name: 'Understand your organization, even when work crosses Teams.'
			})
		).toBeVisible();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
			)
		).toBe(true);
	}
});

test('authenticated home shows the Person across Organizations and Team contexts', async ({
	page
}) => {
	test.setTimeout(90_000);
	const suffix = `${Date.now()}-${test.info().workerIndex}`;
	const firstOrganization = `Dashboard Alpha ${suffix}`;
	const secondOrganization = `Dashboard Zeta ${suffix}`;
	const managedTeam = `Managed Dashboard Team ${suffix}`;
	const memberTeam = `Member Dashboard Team ${suffix}`;

	async function createOrganization(name: string) {
		await page.goto('/admin/organizations');
		const form = page.getByRole('heading', { name: 'Add an Organization' }).locator('..');
		await form.getByLabel('Organization name').fill(name);
		await form.getByRole('button', { name: 'Create Organization' }).click();
		await expect(page.getByRole('status')).toContainText('Organization created');
	}

	async function createTeam(name: string, organizationName: string) {
		await page.goto('/admin/teams');
		const form = page.getByRole('heading', { name: 'Add a Team' }).locator('..');
		await form.getByLabel('Team name').fill(name);
		await form.getByLabel('Owning Organization').selectOption({ label: organizationName });
		await form.getByLabel('Team type').selectOption('functional');
		await form.getByRole('button', { name: 'Create Team' }).click();
		await expect(page.getByRole('status')).toContainText('Team created');
	}

	async function openTeam(name: string) {
		await page.goto(`/admin/teams?search=${encodeURIComponent(name)}`);
		await page.getByRole('link', { name, exact: true }).click();
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
	}

	await loginAsDeveloper(page);
	await createOrganization(firstOrganization);
	await createOrganization(secondOrganization);
	await createTeam(managedTeam, firstOrganization);
	await createTeam(memberTeam, secondOrganization);

	await openTeam(managedTeam);
	await page.locator('select[name="managerPersonId"]').selectOption({ label: 'Developer' });
	await page.getByRole('button', { name: 'Update manager' }).click();
	await expect(page.getByRole('status')).toContainText('Team manager updated');

	await openTeam(memberTeam);
	const membershipForm = page.locator('form[action*="membershipCreate"]');
	await membershipForm.getByLabel('Person').selectOption({ label: 'Developer' });
	await membershipForm.getByLabel('Role on Team').fill('Cross-organization advisor');
	await membershipForm.getByRole('button', { name: 'Assign member' }).click();
	await expect(page.getByRole('status')).toContainText('Team member assigned');

	try {
		await page.getByRole('link', { name: 'Org Teams home' }).click();
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('heading', { name: 'Welcome, Developer' })).toBeVisible();
		await expect(page.getByRole('heading', { name: firstOrganization })).toBeVisible();
		await expect(page.getByRole('heading', { name: secondOrganization })).toBeVisible();
		await expect(page.getByRole('heading', { name: managedTeam })).toBeVisible();
		await expect(page.getByRole('heading', { name: memberTeam })).toBeVisible();
		await expect(page.getByText('Cross-organization advisor')).toBeVisible();
		await expect(page.getByText('You manage this Team')).toBeVisible();
		await expect(page.getByText('No manager currently assigned')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0);
		await expect(
			page.getByRole('heading', {
				name: 'Understand your organization, even when work crosses Teams.'
			})
		).toHaveCount(0);
		await expect(page.getByRole('button', { name: /assign|save|remove/i })).toHaveCount(0);

		await page.setViewportSize({ width: 320, height: 800 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
			)
		).toBe(true);
		await page.keyboard.press('Tab');
		await expect(page.locator(':focus')).toBeVisible();
	} finally {
		// Leave the shared development account detached so provisioning tests remain isolated.
		await openTeam(memberTeam);
		const developerMembership = page
			.locator('li')
			.filter({ has: page.getByRole('link', { name: 'Developer', exact: true }) });
		await developerMembership.getByRole('button', { name: 'Remove' }).click();
		await expect(page.getByRole('status')).toContainText('Team member removed');

		await openTeam(managedTeam);
		await page.locator('select[name="managerPersonId"]').selectOption('');
		await page.getByRole('button', { name: 'Update manager' }).click();
		await expect(page.getByRole('status')).toContainText('Team manager updated');
	}
});

test('the shell exposes semantic landmarks, a working skip link, and visible keyboard focus', async ({
	page
}) => {
	await page.goto('/');

	await expect(page.getByRole('banner')).toHaveCount(1);
	await expect(page.getByRole('main')).toHaveCount(1);

	const skipLink = page.getByRole('link', { name: 'Skip to main content' });
	await page.keyboard.press('Tab');
	await expect(skipLink).toBeFocused();
	const skipLinkBox = await skipLink.boundingBox();
	expect(skipLinkBox).not.toBeNull();
	expect(skipLinkBox!.y).toBeGreaterThanOrEqual(0);

	await page.keyboard.press('Enter');
	await expect(page.getByRole('main')).toBeFocused();

	await page.goto('/');
	await page.keyboard.press('Tab');
	await page.keyboard.press('Tab');
	const brandLink = page.getByRole('link', { name: 'Org Teams home' });
	await expect(brandLink).toBeFocused();
	expect(await brandLink.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe(
		'none'
	);
});

test('logout rejects non-POST requests', async ({ request }) => {
	const response = await request.get('/logout');

	expect(response.status()).toBe(405);
});
