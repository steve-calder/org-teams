import { expect, test } from '@playwright/test';

test('developer logs in to the authenticated home page and logs out', async ({ page }) => {
	await page.goto('/login');

	await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Logout' })).toHaveCount(0);
	await expect(page.getByText('Development account')).toBeVisible();
	await expect(page.getByText('dev@org-teams.local')).toBeVisible();

	await page.getByLabel('Email').fill('dev@org-teams.local');
	await page.getByLabel('Password').fill('password');
	await page.getByRole('button', { name: 'Login' }).click();

	await expect(page).toHaveURL('/');
	await expect(page.getByRole('banner')).toBeVisible();
	await expect(page.getByRole('main')).toHaveCount(1);
	await expect(page.getByRole('heading', { name: 'Welcome, Developer' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0);

	await page.getByRole('button', { name: 'Logout' }).click();
	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Logout' })).toHaveCount(0);

	const removedProtectedPage = await page.goto('/protected');
	expect(removedProtectedPage?.status()).toBe(404);
});
