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
	await standardUserContext.close();
});

test('anonymous visitors are redirected before admin data loads', async ({ page }) => {
	await page.goto('/admin/people');
	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
});
