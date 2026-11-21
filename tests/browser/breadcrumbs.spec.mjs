import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const after = process.env.AFTER_URL || 'http://localhost:8890';
const before = process.env.BEFORE_URL || 'http://localhost:8888';
const demo = `${after}/breadcrumbs/demo-firm/practice-areas/planning-guide/`;
const nav = '.wp-block-breadcrumbs';
const toggle = '.wp-block-breadcrumbs__toggle';
async function login(page) {
	await page.goto(`${after}/wp-login.php`);
	await page.locator('#user_login').fill('admin');
	await page.locator('#user_pass').fill('password');
	await page.locator('#wp-submit').click();
}
test('breadcrumbs: nested trail, local links, mobile disclosure and screenshots', async ({
	page,
}) => {
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto(demo);
	await expect(page.locator(`${nav} a`)).toHaveText([
		'Home',
		'Breadcrumbs',
		'Demo Firm',
		'Practice Areas',
	]);
	await expect(page.locator(`${nav} [aria-current="page"]`)).toHaveText('Planning Guide');
	await expect(page.locator(toggle)).toBeHidden();
	for (const href of await page
		.locator(`${nav} a`)
		.evaluateAll((links) => links.map((a) => a.href))) {
		expect(new URL(href).origin).toBe(after);
		expect((await page.request.get(href)).status()).toBe(200);
	}
	mkdirSync('docs/breadcrumbs/screenshots', { recursive: true });
	await page.screenshot({ path: 'docs/breadcrumbs/screenshots/desktop.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 900 });
	await expect(page.locator(toggle)).toBeVisible();
	await expect(page.locator('.wp-block-breadcrumbs__levels')).toBeHidden();
	await page.locator(toggle).focus();
	await page.keyboard.press('Enter');
	await expect(page.locator(toggle)).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('.wp-block-breadcrumbs__levels')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: 'docs/breadcrumbs/screenshots/mobile.png', fullPage: true });
	await page.keyboard.press('Tab');
	await page.keyboard.press('Escape');
	await expect(page.locator(toggle)).toHaveAttribute('aria-expanded', 'false');
	await expect(page.locator(toggle)).toBeFocused();
	await page.locator(toggle).click();
	await page.locator('.showcase-header').click({ position: { x: 5, y: 5 } });
	await expect(page.locator(toggle)).toHaveAttribute('aria-expanded', 'false');
	await page.locator(toggle).click();
	await page.setViewportSize({ width: 1440, height: 900 });
	await expect(page.locator(toggle)).toHaveAttribute('aria-expanded', 'false');
	expect(errors).toEqual([]);
});
test('breadcrumbs: practice-area parent trail, front-page suppression and before availability', async ({
	page,
}) => {
	await page.goto(`${after}/breadcrumbs/`);
	await page.getByRole('link', { name: 'Open a practice-area detail page', exact: true }).click();
	await expect(page.locator(`${nav} a`)).toHaveText([
		'Home',
		'Breadcrumbs',
		'Demo Firm',
		'Practice Areas',
	]);
	await expect(page.locator(`${nav} [aria-current="page"]`)).toHaveText('Personal Injury');
	await page.goto(after);
	await expect(page.locator('.site-breadcrumbs')).toHaveCount(0);
	const response = await page.goto(`${before}/breadcrumbs/`);
	expect(response.status()).toBe(404);
	await expect(page.locator(nav)).toHaveCount(0);
});
test('breadcrumbs: settings save, disable and enable without leaving an empty band', async ({
	page,
}) => {
	const unauthorized = await page.request.post(`${after}/wp-admin/options.php`, {
		form: {
			option_page: 'pmp_breadcrumbs_settings',
			action: 'update',
			'pmp_breadcrumbs_options[enabled]': '0',
		},
		maxRedirects: 0,
	});
	expect(unauthorized.status()).toBe(302);
	expect(unauthorized.headers().location).toContain('wp-login.php');
	await login(page);
	await page.goto(`${after}/wp-admin/options-general.php?page=pmp_breadcrumbs_settings`);
	const home = page.locator('#home_label');
	const enabled = page.locator('#enabled');
	const baseline = {
		home: await home.inputValue(),
		enabled: await enabled.isChecked(),
		parent: await page.locator('#parent_pmp_practice_area').inputValue(),
	};
	const save = async () => {
		await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
		await page.waitForURL(/settings-updated=true/);
	};
	try {
		await home.fill('Start');
		await page.locator('#parent_pmp_practice_area').selectOption('');
		await save();
		await page.reload();
		await expect(home).toHaveValue('Start');
		await expect(page.locator('#parent_pmp_practice_area')).toHaveValue('');
		await page.goto(demo);
		await expect(page.locator(`${nav} a`).first()).toHaveText('Start');
		await page.goto(`${after}/breadcrumbs/`);
		await page.getByRole('link', { name: 'Open a practice-area detail page', exact: true }).click();
		await expect(page.locator(`${nav} a`)).toHaveCount(1);
		await page.goto(`${after}/wp-admin/options-general.php?page=pmp_breadcrumbs_settings`);
		await enabled.uncheck();
		await save();
		await page.goto(demo);
		await expect(page.locator(nav)).toHaveCount(0);
		await expect(page.locator('.site-breadcrumbs')).toHaveCount(0);
	} finally {
		await page.goto(`${after}/wp-admin/options-general.php?page=pmp_breadcrumbs_settings`);
		await home.fill(baseline.home);
		await enabled.setChecked(baseline.enabled);
		await page.locator('#parent_pmp_practice_area').selectOption(baseline.parent);
		await save();
	}
});
test('breadcrumbs: core editor controls save and reload valid block attributes', async ({
	page,
}) => {
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await login(page);
	await page.goto(`${after}/wp-admin/edit.php?post_type=page`);
	await page
		.locator('a.row-title')
		.filter({ hasText: /Planning Guide$/ })
		.click();
	await page.waitForFunction(
		() => window.wp?.data?.select('core/block-editor').getBlocks().length > 0,
	);
	await page.evaluate(() =>
		wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false),
	);
	const saved = await page.evaluate(async () => {
		const id = wp.data.select('core/editor').getCurrentPostId();
		const record = await wp.apiFetch({ path: `/wp/v2/pages/${id}?context=edit` });
		const block = wp.blocks.createBlock('core/breadcrumbs', { separator: '›' });
		wp.data.dispatch('core/block-editor').insertBlock(block);
		wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
		return { id, content: record.content.raw };
	});
	try {
		if (
			!(await page.getByRole('checkbox', { name: 'Show home breadcrumb', exact: true }).isVisible())
		)
			await page.getByRole('button', { name: 'Settings', exact: true }).click();
		await page.getByRole('checkbox', { name: 'Show home breadcrumb', exact: true }).uncheck();
		await page.getByRole('button', { name: 'Save', exact: true }).first().click();
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						!wp.data.select('core/editor').isSavingPost() &&
						!wp.data.select('core/editor').isEditedPostDirty(),
				),
			)
			.toBe(true);
		await page.reload();
		await page.waitForFunction(() => wp.data.select('core/block-editor').getBlocks().length > 0);
		const block = await page.evaluate(() =>
			wp.data
				.select('core/block-editor')
				.getBlocks()
				.find((b) => b.name === 'core/breadcrumbs'),
		);
		expect(block.attributes).toMatchObject({ separator: '›', showHomeItem: false });
		expect(block.isValid).not.toBe(false);
		await page.goto(demo);
		const contentNav = page.locator('main .wp-block-breadcrumbs');
		await expect(contentNav).toHaveCount(1);
		await expect(contentNav.locator('.wp-block-breadcrumbs__home')).toHaveCount(0);
		await expect(contentNav.locator('[aria-current="page"]')).toHaveText('Planning Guide');
	} finally {
		await page.goto(`${after}/wp-admin/post.php?post=${saved.id}&action=edit`);
		await page.waitForFunction(() => !!window.wp?.apiFetch);
		await page.evaluate(
			(b) =>
				wp.apiFetch({ path: `/wp/v2/pages/${b.id}`, method: 'POST', data: { content: b.content } }),
			saved,
		);
	}
	expect(errors).toEqual([]);
});
