import { expect, test } from '@playwright/test';

const DEV_EMAIL = 'dev@org-teams.local';
const DEV_PASSWORD = 'password';

async function login(page: import('@playwright/test').Page, email: string, password: string) {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
	const emailInput = page.getByLabel('Email');
	const passwordInput = page.getByLabel('Password');
	await emailInput.fill(email);
	await passwordInput.fill(password);
	await expect(emailInput).toHaveValue(email);
	await expect(passwordInput).toHaveValue(password);
	const loginResponsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/login' && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Login' }).click();
	await loginResponsePromise;
	await expect(page).toHaveURL('/protected');
}

test('authenticated non-admin explores a read-only Organization chart', async ({ page }) => {
	test.setTimeout(120_000);
	page.setDefaultTimeout(10_000);
	const suffix = `${Date.now()}-${test.info().workerIndex}`;
	const organizationName = `Chart Organization ${suffix}`;
	const firstRootName = `Chart Engineering ${suffix}`;
	const secondRootName = `Chart Operations ${suffix}`;
	const seniorName = `Chart Platform ${suffix}`;
	const focalName = `Chart Runtime ${suffix}`;
	const siblingName = `Chart Observability ${suffix}`;
	const subordinateName = `Chart API ${suffix}`;
	const deepSubordinateName = `Chart Gateway ${suffix}`;
	const inactiveName = `Chart Legacy ${suffix}`;
	const personName = `Chart Viewer ${suffix}`;
	const viewerEmail = `chart-viewer-${suffix}@example.test`;
	const viewerPassword = 'password123';

	async function createTeam(name: string) {
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

	async function setParent(teamName: string, parentName: string) {
		await openTeam(teamName);
		await page.getByLabel('Parent Team').selectOption({ label: `${parentName} · active` });
		await page.getByRole('button', { name: 'Update parent' }).click();
		await expect(page.getByRole('status')).toContainText('Parent Team updated');
	}

	await login(page, DEV_EMAIL, DEV_PASSWORD);
	await page.goto('/admin/organizations');
	const organizationForm = page.getByRole('heading', { name: 'Add an Organization' }).locator('..');
	await organizationForm.getByLabel('Organization name').fill(organizationName);
	await organizationForm.getByRole('button', { name: 'Create Organization' }).click();
	await expect(page.getByRole('status')).toContainText('Organization created');

	for (const teamName of [
		firstRootName,
		secondRootName,
		seniorName,
		focalName,
		siblingName,
		subordinateName,
		deepSubordinateName,
		inactiveName
	]) {
		await createTeam(teamName);
	}
	await setParent(seniorName, firstRootName);
	await setParent(focalName, seniorName);
	await setParent(siblingName, seniorName);
	await setParent(subordinateName, focalName);
	await setParent(deepSubordinateName, subordinateName);

	await openTeam(inactiveName);
	await page.getByRole('button', { name: 'Deactivate Team' }).click();
	await expect(page.getByRole('status')).toContainText('Team updated');

	await page.goto('/admin/people');
	const personForm = page
		.getByRole('heading', { name: 'Add a person without login' })
		.locator('..');
	await personForm.getByLabel('Display name').fill(personName);
	await personForm.getByRole('button', { name: 'Create person' }).click();
	await expect(page.getByRole('status')).toContainText('Person created');
	await page.goto(`/admin/people?search=${encodeURIComponent(personName)}`);
	await page.getByRole('link', { name: personName, exact: true }).click();
	await page.getByRole('link', { name: 'Authentication' }).click();
	await page.getByLabel('Email').fill(viewerEmail);
	await page.getByLabel('Initial password').fill(viewerPassword);
	await page.getByRole('button', { name: 'Add login' }).click();
	await expect(page.getByRole('status')).toContainText('Login access added');

	await page.getByRole('button', { name: 'Logout' }).click();
	await login(page, viewerEmail, viewerPassword);
	await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
	await page.getByRole('link', { name: 'Organization chart' }).click();
	await expect(page).toHaveURL('/organization-chart');
	await page.getByLabel('Organization', { exact: true }).selectOption({ label: organizationName });
	await expect(page).toHaveURL(/\/organization-chart\?organizationId=/);
	await expect(page.getByRole('heading', { name: 'Organization chart' })).toBeVisible();
	await expect(page.getByText('This is a read-only view.', { exact: false })).toBeVisible();
	await expect(page.getByLabel(`Organization ${organizationName}`)).toBeVisible();
	await expect(page.getByLabel(`${firstRootName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Show 3 top-level Teams for/ })).toBeVisible();

	await page.getByRole('button', { name: 'Logout' }).click();
	await login(page, DEV_EMAIL, DEV_PASSWORD);
	await openTeam(focalName);
	const createMembershipForm = page.locator('form[action*="membershipCreate"]');
	await createMembershipForm.getByLabel('Person').selectOption({ label: personName });
	await createMembershipForm.getByLabel('Role on Team').fill('Viewer');
	await createMembershipForm.getByRole('button', { name: 'Assign member' }).click();
	await expect(page.getByRole('status')).toContainText('Team member assigned');
	await page.getByRole('button', { name: 'Logout' }).click();
	await login(page, viewerEmail, viewerPassword);
	await page.getByRole('link', { name: 'Organization chart' }).click();

	const organizationId = await page
		.getByLabel('Organization', { exact: true })
		.locator('option', { hasText: organizationName })
		.getAttribute('value');
	expect(organizationId).toBeTruthy();
	await expect(page.getByLabel('Organization', { exact: true })).toHaveValue(organizationId!);

	await expect(page.getByLabel(`${firstRootName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${seniorName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${focalName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${secondRootName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.getByLabel(`${siblingName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.getByLabel(`${subordinateName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.locator('.svelte-flow__edge')).toHaveCount(3);
	await expect(page.getByRole('button', { name: /fit view/i })).toBeVisible();
	const details = page.getByRole('complementary');
	await expect(details.getByText(focalName, { exact: true })).toBeVisible();
	await expect(details.getByText('Parent Team').locator('..')).toContainText(seniorName);

	await page.getByRole('button', { name: /Show 3 top-level Teams for/ }).click();
	await expect(page.getByLabel(`${secondRootName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${inactiveName}, Functional Team, inactive`)).toBeVisible();
	await page.getByRole('button', { name: /Hide 3 top-level Teams for/ }).click();
	await expect(page.getByLabel(`${secondRootName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.getByLabel(`${firstRootName}, Functional Team, active`)).toBeVisible();

	await page.getByRole('button', { name: `Show subordinate Teams for ${seniorName}` }).click();
	await expect(page.getByLabel(`${siblingName}, Functional Team, active`)).toBeVisible();
	await page.getByRole('button', { name: `Show subordinate Teams for ${focalName}` }).click();
	await expect(page.getByLabel(`${subordinateName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${deepSubordinateName}, Functional Team, active`)).toHaveCount(0);
	await page
		.getByRole('button', { name: `Show subordinate Teams for ${subordinateName}` })
		.click();
	await expect(page.getByLabel(`${deepSubordinateName}, Functional Team, active`)).toBeVisible();
	await page.getByRole('button', { name: `Hide subordinate Teams for ${focalName}` }).click();
	await expect(page.getByLabel(`${subordinateName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.getByLabel(`${deepSubordinateName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.getByLabel(`${siblingName}, Functional Team, active`)).toBeVisible();

	await page.getByLabel('Find a Team').fill(secondRootName);
	await page.getByRole('button', { name: secondRootName, exact: true }).click();
	await expect(page).toHaveURL(/teamId=/);
	await expect(page.getByLabel(`${secondRootName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${firstRootName}, Functional Team, active`)).toHaveCount(0);
	await expect(page.locator('.svelte-flow__edge')).toHaveCount(1);

	await page.getByLabel('Find a Team').fill(focalName);
	await page.getByRole('button', { name: focalName, exact: true }).click();
	await expect(page.getByLabel(`${firstRootName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${seniorName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${focalName}, Functional Team, active`)).toBeVisible();
	await expect(page.getByLabel(`${siblingName}, Functional Team, active`)).toHaveCount(0);

	await page.getByRole('button', { name: 'Left to right' }).click();
	await expect(page.getByRole('button', { name: 'Left to right' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await page.getByRole('button', { name: /Show 3 top-level Teams for/ }).click();
	await expect(page.getByLabel(`${inactiveName}, Functional Team, inactive`)).toBeVisible();
	await page.getByRole('checkbox', { name: 'Show inactive Teams' }).uncheck();
	await expect(page.getByLabel(`${inactiveName}, Functional Team, inactive`)).toHaveCount(0);

	await page.getByRole('button', { name: 'Tree' }).click();
	const treeSection = page.getByRole('heading', { name: 'Team hierarchy tree' }).locator('..');
	await expect(treeSection).toBeVisible();
	await expect(
		treeSection.getByRole('button', { name: new RegExp(`^${firstRootName} active`) })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /edit|delete|move|save/i })).toHaveCount(0);

	await page.setViewportSize({ width: 320, height: 800 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)
	).toBe(true);
	await page.keyboard.press('Tab');
	await expect(page.locator(':focus')).toBeVisible();
});

test('anonymous visitor is redirected before viewing an Organization chart', async ({ page }) => {
	await page.goto('/organization-chart?organizationId=unknown');
	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('link', { name: 'Organization chart' })).toHaveCount(0);
});
