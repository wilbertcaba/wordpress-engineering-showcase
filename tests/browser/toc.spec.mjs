import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const after = process.env.AFTER_URL || 'http://localhost:8890';
const before = process.env.BEFORE_URL || 'http://localhost:8888';
const demo = `${after}/table-of-contents/`;
const sidebar = '.toc-block--desktop';
function errorsOn(page) {
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	return errors;
}
async function validTargets(page) {
	return page
		.locator('.toc-block__link')
		.evaluateAll((links) =>
			links.every((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))),
		);
}
test('toc: server anchors, scrollspy, sticky behavior and responsive screenshots', async ({
	page,
}) => {
	const errors = errorsOn(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto(demo);
	await expect(page.locator(`${sidebar} .toc-block__link`)).toHaveCount(8);
	expect(await validTargets(page)).toBe(true);
	await expect(page.locator(sidebar)).toBeVisible();
	await expect(page.locator('.toc-block--mobile')).toBeHidden();
	await expect(page.locator('#repeated-heading')).toHaveCount(1);
	await expect(page.locator('#repeated-heading-1')).toHaveCount(1);
	await expect(page.locator('#questions')).toHaveCount(1);
	await expect(page.locator(`${sidebar} a[aria-current="location"]`)).toHaveCount(1);
	await page
		.locator('#cafe-resources')
		.evaluate((el) => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 100));
	await expect(page.locator(`${sidebar} a[href="#cafe-resources"]`)).toHaveAttribute(
		'aria-current',
		'location',
	);
	const bounds = await page.locator(sidebar).boundingBox();
	expect(bounds.y).toBeGreaterThanOrEqual(20);
	expect(bounds.y).toBeLessThan(40);
	await page.locator(`${sidebar} a[href="#questions"]`).click();
	await expect(page).toHaveURL(/#questions$/);
	await expect(page.locator(`${sidebar} a[href="#questions"]`)).toHaveAttribute(
		'aria-current',
		'location',
	);
	await page.goto(demo);
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
	mkdirSync('docs/table-of-contents/screenshots', { recursive: true });
	await page.screenshot({ path: 'docs/table-of-contents/screenshots/desktop.png' });
	for (const width of [782, 781, 390]) {
		await page.setViewportSize({ width, height: 1000 });
		if (width >= 782) {
			await expect(page.locator(sidebar)).toBeVisible();
			await expect(page.locator('.toc-block--mobile')).toBeHidden();
		} else {
			await expect(page.locator(sidebar)).toBeHidden();
			await expect(page.locator('.toc-block--mobile')).toBeVisible();
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true,
		);
	}
	await page.goto(demo);
	const summary = page.locator('.toc-block--mobile summary');
	await summary.focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('.toc-block--mobile details')).toHaveAttribute('open', '');
	await page.screenshot({ path: 'docs/table-of-contents/screenshots/mobile.png' });
	await expect(page.locator(`${sidebar} [aria-current]`)).toHaveCount(0);
	expect(errors).toEqual([]);
});
test('toc: classic content, static links and nested sticky container', async ({
	browser,
	page,
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const staticPage = await context.newPage();
	await staticPage.goto(`${after}/table-of-contents-classic/`);
	await expect(staticPage.locator('.toc-block__link')).toHaveCount(4);
	expect(await validTargets(staticPage)).toBe(true);
	await expect(staticPage.locator('#saved-classic-anchor')).toHaveCount(1);
	await expect(staticPage.locator('#classic-introduction-1')).toHaveCount(1);
	await context.close();
	await page.goto(demo);
	await page.locator('.showcase-toc-layout').evaluate((el) => (el.style.position = 'sticky'));
	await page.setViewportSize({ width: 1300, height: 900 });
	await expect(page.locator(sidebar)).toHaveClass(/toc-block--nested/);
	await expect(page.locator(sidebar)).toHaveCSS('position', 'static');
	const response = await page.goto(`${before}/table-of-contents/`);
	expect(response.status()).toBe(404);
});
test('toc: editor preview, heading controls and styles persist', async ({ page }) => {
	const errors = errorsOn(page);
	await page.goto(`${after}/wp-login.php`);
	await page.locator('#user_login').fill('admin');
	await page.locator('#user_pass').fill('password');
	await page.locator('#wp-submit').click();
	await page.goto(`${after}/wp-admin/edit.php?post_type=page`);
	await page
		.locator('a.row-title')
		.filter({ hasText: /^Table of Contents$/ })
		.click();
	await page.waitForFunction(
		() => window.wp?.data?.select('core/block-editor').getBlocks().length > 0,
	);
	await page.evaluate(() =>
		wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false),
	);
	const baseline = await page.evaluate(() => ({
		id: wp.data.select('core/editor').getCurrentPostId(),
		content: wp.data.select('core/editor').getEditedPostContent(),
	}));
	try {
		const state = await page.evaluate(() => {
			const b = wp.data
				.select('core/block-editor')
				.getBlocks()
				.find((b) => b.name === 'pmp/toc-block');
			wp.data.dispatch('core/block-editor').selectBlock(b.clientId);
			return b;
		});
		if (!(await page.getByRole('combobox', { name: 'Show on', exact: true }).isVisible()))
			await page.getByRole('button', { name: 'Settings', exact: true }).click();
		await expect(page.getByRole('combobox', { name: 'Show on', exact: true })).toHaveValue(
			'desktop',
		);
		await page.getByRole('checkbox', { name: 'Include H3', exact: true }).uncheck();
		await page.getByRole('checkbox', { name: 'Include H4', exact: true }).uncheck();
		await page.getByRole('checkbox', { name: 'Sticky on desktop', exact: true }).uncheck();
		await page.getByRole('checkbox', { name: 'Collapsible', exact: true }).check();
		// Apply a named style using the same attributes the Styles UI saves.
		await page.evaluate(
			(id) =>
				wp.data.dispatch('core/block-editor').updateBlockAttributes(id, {
					className: 'is-style-highlight',
					itemPadding: { left: '16px', right: '8px' },
					itemGap: '12px',
				}),
			state.clientId,
		);
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
		const saved = await page.evaluate(() =>
			wp.data
				.select('core/block-editor')
				.getBlocks()
				.find((b) => b.name === 'pmp/toc-block'),
		);
		expect(saved.attributes).toMatchObject({
			includeH3: false,
			includeH4: false,
			collapsible: true,
			stickyDesktop: false,
			className: 'is-style-highlight',
			itemGap: '12px',
		});
		expect(
			await page.evaluate(() =>
				wp.data
					.select('core/block-editor')
					.getBlocks()
					.filter((b) => b.isValid === false)
					.map((b) => b.name),
			),
		).toEqual([]);
		await page.goto(demo);
		expect(await validTargets(page)).toBe(true);
		await expect(page.locator('#repeated-heading')).toHaveCount(1);
		await expect(page.locator('#repeated-heading-1')).toHaveCount(1);
		await expect(page.locator(`${sidebar} .toc-block__link`)).toHaveCount(4);
		await expect(page.locator(`${sidebar} details`)).toHaveCount(1);
	} finally {
		await page.goto(`${after}/wp-admin/post.php?post=${baseline.id}&action=edit`);
		await page.waitForFunction(() => !!window.wp?.apiFetch);
		await page.evaluate(
			(saved) =>
				wp.apiFetch({
					path: `/wp/v2/pages/${saved.id}`,
					method: 'POST',
					data: { content: saved.content },
				}),
			baseline,
		);
	}
	expect(errors).toEqual([]);
});

test('toc: administrator applies and clears shared list styles in the editor', async ({ page }) => {
	await page.goto(`${after}/wp-login.php`);
	await page.locator('#user_login').fill('admin');
	await page.locator('#user_pass').fill('password');
	await page.locator('#wp-submit').click();
	await page.goto(`${after}/wp-admin/edit.php?post_type=page`);
	await page
		.locator('a.row-title')
		.filter({ hasText: /^Table of Contents$/ })
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
		const settings = await wp.apiFetch({ path: '/wp/v2/settings' });
		const block = wp.data
			.select('core/block-editor')
			.getBlocks()
			.find((b) => b.name === 'pmp/toc-block');
		wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
		wp.data
			.dispatch('core/block-editor')
			.updateBlockAttributes(block.clientId, { itemGap: '20px' });
		return { id, content: record.content.raw, defaults: settings.pmp_toc_item_defaults };
	});
	try {
		if (!(await page.getByRole('tab', { name: 'Styles', exact: true }).isVisible()))
			await page.getByRole('button', { name: 'Settings', exact: true }).click();
		await page.getByRole('tab', { name: 'Styles', exact: true }).click();
		await page.getByRole('button', { name: 'Site-wide Defaults', exact: true }).click();
		await page
			.getByRole('button', { name: 'Apply to all Table of Contents blocks', exact: true })
			.click();
		await expect
			.poll(() =>
				page.evaluate(
					async () =>
						(
							await wp.apiFetch({ path: '/wp/v2/settings' })
						).pmp_toc_item_defaults.itemGap,
				),
			)
			.toBe('20px');
		expect(
			await page.evaluate(
				() =>
					wp.data
						.select('core/block-editor')
						.getBlocks()
						.find((b) => b.name === 'pmp/toc-block').attributes.itemGap,
			),
		).toBe('');
		await page.getByRole('button', { name: 'Clear shared list item styles', exact: true }).click();
		await expect
			.poll(() =>
				page.evaluate(
					async () =>
						Object.keys((await wp.apiFetch({ path: '/wp/v2/settings' })).pmp_toc_item_defaults)
							.length,
				),
			)
			.toBe(0);
	} finally {
		await page.evaluate(async (baseline) => {
			await wp.apiFetch({
				path: '/wp/v2/settings',
				method: 'POST',
				data: { pmp_toc_item_defaults: baseline.defaults },
			});
			await wp.apiFetch({
				path: `/wp/v2/pages/${baseline.id}`,
				method: 'POST',
				data: { content: baseline.content },
			});
		}, saved);
	}
});
