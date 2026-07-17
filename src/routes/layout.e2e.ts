import { expect, test } from '@playwright/test';

test('anonymous routes share the branded shell and home navigation', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('banner')).toBeVisible();
	await expect(page.getByRole('main')).toHaveCount(1);
	await expect(page.getByRole('link', { name: 'Org Teams home' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Logout' })).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Welcome to Org Teams' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Identity with purpose' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'A clear foundation' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Protected by default' })).toBeVisible();

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
		await expect(page.getByRole('heading', { name: 'Welcome to Org Teams' })).toBeVisible();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
			)
		).toBe(true);
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
