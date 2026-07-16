import { expect, test } from '@playwright/test';

test('developer can log in, access the protected page, and log out', async ({ page }) => {
	await page.goto('/login');

	await expect(page.getByText('Development account')).toBeVisible();
	await expect(page.getByText('dev@org-teams.local')).toBeVisible();

	await page.getByLabel('Email').fill('dev@org-teams.local');
	await page.getByLabel('Password').fill('password');
	await page.getByRole('button', { name: 'Login' }).click();

	await expect(page).toHaveURL('/protected');
	await expect(page.getByText('Authenticated')).toBeVisible();
	await expect(page.getByText('dev@org-teams.local')).toBeVisible();

	await page.getByRole('button', { name: 'Logout' }).click();
	await expect(page).toHaveURL('/login');

	await page.goto('/protected');
	await expect(page).toHaveURL('/login');
});
