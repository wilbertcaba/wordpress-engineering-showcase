import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const sites = [
	['before', process.env.BEFORE_URL || 'http://localhost:8888'],
	['after', process.env.AFTER_URL || 'http://localhost:8890'],
];
for (const [state, url] of sites) {
	test(`${state}: frontend, editor and responsive screenshots`, async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(url);
		await expect(page.locator('.wp-block-pmp-content-card-template.variation-cover')).toHaveCount(
			8,
		);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(
			state === 'after' ? 'After' : 'Before',
		);
		await expect(
			page.locator('.wp-block-pmp-content-card-template').first().locator('img'),
		).toBeVisible();
		expect(
			await page
				.locator('img')
				.evaluateAll((images) => images.every((i) => i.complete && i.naturalWidth > 0)),
		).toBe(true);
		expect(
			await page
				.locator('.wp-block-pmp-content-card-template img')
				.evaluateAll((images) => new Set(images.map((image) => image.src)).size),
		).toBe(8);
		if (state === 'after') await expect(page.locator('.pmp-post-meta-card_image')).toHaveCount(8);
		else await expect(page.locator('.pmp-post-meta-card_image')).toHaveCount(0);
		let cardFocused = false;
		for (let step = 0; step < 16; step++) {
			await page.keyboard.press('Tab');
			cardFocused = await page.evaluate(() =>
				document.activeElement?.classList.contains('wp-block-pmp-content-card-template__link'),
			);
			if (cardFocused) break;
		}
		expect(cardFocused).toBe(true);
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/practice-area/);
		await page.goto(url);
		mkdirSync('docs/screenshots', { recursive: true });
		for (const [size, width] of [
			['desktop', 1440],
			['mobile', 390],
		]) {
			await page.setViewportSize({ width, height: 1000 });
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
				.toBe(true);
			await page.screenshot({ path: `docs/screenshots/${state}-${size}.png`, fullPage: true });
		}
		await page.locator('.wp-block-pmp-content-card-template__link').first().click({ force: true });
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await page.goto(`${url}/wp-login.php`);
		await page.locator('#user_login').fill(process.env.WP_ADMIN_USER || 'admin');
		await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD || 'password');
		await page.locator('#wp-submit').click();
		await page.goto(`${url}/wp-admin/edit.php?post_type=pmp_practice_area`);
		await page.locator('a.row-title').first().click();
		await page.waitForFunction(() =>
			Boolean(window.wp?.data?.select('core/editor')?.getCurrentPostId()),
		);
		await expect(page.getByText('This block contains unexpected or invalid content.')).toHaveCount(
			0,
		);
		const hasCard = await page.evaluate(() =>
			Object.hasOwn(
				wp.data.select('core/editor').getEditedPostAttribute('meta') || {},
				'card_image',
			),
		);
		expect(hasCard).toBe(state === 'after');
		await page.goto(`${url}/wp-admin/edit.php?post_type=page`);
		await page
			.locator('a.row-title')
			.filter({ hasText: state === 'after' ? 'After: Variation 5' : 'Before: Variation 1 / Cover' })
			.click();
		await page.waitForFunction(() =>
			Boolean(window.wp?.data?.select('core/block-editor')?.getBlocks()?.length),
		);
		const invalid = await page.evaluate(() => {
			const visit = (blocks) =>
				blocks.flatMap((b) => [
					...(b.isValid === false ? [b.name] : []),
					...visit(b.innerBlocks || []),
				]);
			return visit(wp.data.select('core/block-editor').getBlocks());
		});
		expect(invalid).toEqual([]);
		const query = await page.evaluate(() => {
			const find = (blocks) => {
				for (const b of blocks) {
					if (b.name === 'core/query') return b;
					const match = find(b.innerBlocks || []);
					if (match) return match;
				}
				return null;
			};
			return find(wp.data.select('core/block-editor').getBlocks())?.attributes;
		});
		if (state === 'after') {
			await expect
				.poll(async () => {
					const titles = await page
						.locator('.editor-styles-wrapper .heading-text')
						.allTextContents();
					return new Set(titles.filter((title) => title.endsWith('Support'))).size;
				})
				.toBe(8);
		}
		expect(query.variationName).toBe('cover');
		if (state === 'before') expect(query.showCardImage).toBeUndefined();
		expect(errors).toEqual([]);
	});
}
