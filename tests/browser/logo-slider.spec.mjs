import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const after = process.env.AFTER_URL || 'http://localhost:8890';
const before = process.env.BEFORE_URL || 'http://localhost:8888';
const demo = `${after}/logo-slider/`;
function watchErrors(page) {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	return errors;
}
const movement = (slider) =>
	slider.locator('.splide__list').evaluate((el) => getComputedStyle(el).transform);

test('logo slider: renders both modes, preserves proportions and fits mobile', async ({ page }) => {
	const errors = watchErrors(page);
	await page.goto(demo);
	const sliders = page.locator('.wp-block-pmp-logo-slider');
	await expect(sliders).toHaveCount(2);
	await expect(page.locator('.wp-block-pmp-logo-slider.is-initialized')).toHaveCount(2);
	for (const slider of await sliders.all()) {
		await expect(slider.locator('.splide__slide:not(.splide__slide--clone)')).toHaveCount(6);
		expect(
			await slider
				.locator('img')
				.evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
		).toBe(true);
	}
	await expect(sliders.last().locator('img[sizes^="auto"]')).toHaveCount(0);
	const fixed = sliders.first();
	expect(
		await fixed
			.locator('.splide__slide:not(.splide__slide--clone)')
			.first()
			.evaluate((el) => el.getBoundingClientRect().width),
	).toBeCloseTo(180, 0);
	const sizes = await sliders
		.last()
		.locator('.splide__slide:not(.splide__slide--clone) img')
		.evaluateAll((images) =>
			images.map((image) => ({
				width: image.getBoundingClientRect().width,
				height: image.getBoundingClientRect().height,
				ratio: image.naturalWidth / image.naturalHeight,
			})),
		);
	expect(new Set(sizes.map((size) => Math.round(size.width))).size).toBeGreaterThan(3);
	for (const size of sizes) {
		expect(size.height).toBeCloseTo(64, 0);
		expect(size.width / size.height).toBeCloseTo(size.ratio, 1);
	}
	await expect(fixed.locator('.wp-block-pmp-logo-slider-label')).toHaveText('Demo brands');
	mkdirSync('docs/logo-slider/screenshots', { recursive: true });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const [name, width] of [
		['desktop', 1440],
		['mobile', 390],
	]) {
		await page.setViewportSize({ width, height: 1000 });
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
			.toBe(true);
		await page.screenshot({ path: `docs/logo-slider/screenshots/${name}.png`, fullPage: true });
	}
	expect(errors).toEqual([]);
});

test('logo slider: respects motion preferences and pauses on hover or keyboard focus', async ({
	page,
}) => {
	const errors = watchErrors(page);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(demo);
	const slider = page.locator('.wp-block-pmp-logo-slider').first();
	await expect(slider).toHaveClass(/is-initialized/);
	const still = await movement(slider);
	await page.waitForTimeout(300);
	expect(await movement(slider)).toBe(still);
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await expect.poll(() => movement(slider)).not.toBe(still);
	await slider.hover();
	const hover = await movement(slider);
	await page.waitForTimeout(300);
	expect(await movement(slider)).toBe(hover);
	await page.mouse.move(0, 0);
	await expect.poll(() => movement(slider)).not.toBe(hover);
	const link = slider.locator('.splide__slide:not(.splide__slide--clone).is-visible a').first();
	await link.focus();
	const focus = await movement(slider);
	await page.waitForTimeout(300);
	expect(await movement(slider)).toBe(focus);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/#logo-/);
	expect(errors).toEqual([]);
});

test('logo slider: static fallback and after-only availability', async ({ browser, page }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const staticPage = await context.newPage();
	await staticPage.goto(demo);
	await expect(staticPage.locator('.wp-block-pmp-logo-slider')).toHaveCount(2);
	await expect(staticPage.locator('.splide__slide')).toHaveCount(12);
	await expect(staticPage.locator('.wp-block-pmp-logo-slider.is-initialized')).toHaveCount(0);
	await context.close();
	const response = await page.goto(`${before}/logo-slider/`);
	expect(response.status()).toBe(404);
	await expect(page.locator('.wp-block-pmp-logo-slider')).toHaveCount(0);
});

test('logo slider: editor controls, nested blocks and saved settings', async ({ page }) => {
	const errors = watchErrors(page);
	await page.goto(`${after}/wp-login.php`);
	await page.locator('#user_login').fill(process.env.WP_ADMIN_USER || 'admin');
	await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD || 'password');
	await page.locator('#wp-submit').click();
	await page.goto(`${after}/wp-admin/edit.php?post_type=page`);
	await page
		.locator('a.row-title')
		.filter({ hasText: /^Logo Slider$/ })
		.click();
	await page.waitForFunction(() =>
		Boolean(window.wp?.data?.select('core/block-editor')?.getBlocks()?.length),
	);
	await page.evaluate(() =>
		wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false),
	);
	const baseline = await page.evaluate(() => ({
		content: wp.data.select('core/editor').getEditedPostContent(),
		id: wp.data.select('core/editor').getCurrentPostId(),
	}));
	try {
		const state = await page.evaluate(() => {
			const blocks = wp.data.select('core/block-editor').getBlocks();
			const slider = blocks.find((block) => block.name === 'pmp/logo-slider');
			wp.data.dispatch('core/block-editor').selectBlock(slider.clientId);
			return { clientId: slider.clientId, attributes: slider.attributes };
		});
		const invalid = () =>
			page.evaluate(() => {
				const visit = (blocks) =>
					blocks.flatMap((block) => [
						...(block.isValid === false ? [block.name] : []),
						...visit(block.innerBlocks || []),
					]);
				return visit(wp.data.select('core/block-editor').getBlocks());
			});
		expect(await invalid()).toEqual([]);
		if (
			!(await page.getByRole('checkbox', { name: 'Automatic logo width', exact: true }).isVisible())
		) {
			await page.getByRole('button', { name: 'Settings', exact: true }).click();
		}
		const automatic = page.getByRole('checkbox', { name: 'Automatic logo width', exact: true });
		await automatic.check();
		await expect(
			page.getByRole('spinbutton', { name: 'Logo width (px)', exact: true }),
		).toHaveCount(0);
		await page.getByRole('spinbutton', { name: 'Logo height (px)', exact: true }).fill('80');
		await page.getByRole('spinbutton', { name: 'Gap between logos (px)', exact: true }).fill('32');
		await page.getByRole('spinbutton', { name: 'Scroll speed', exact: true }).fill('1.2');
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
				.find((block) => block.name === 'pmp/logo-slider'),
		);
		expect(saved.attributes).toMatchObject({
			autoWidth: true,
			logoWidth: 180,
			logoHeight: 80,
			logoGap: 32,
			scrollSpeed: 1.2,
		});
		expect(saved.innerBlocks.filter((block) => block.name === 'core/image')).toHaveLength(6);
		expect(
			saved.innerBlocks.filter((block) => block.name === 'pmp/logo-slider-label'),
		).toHaveLength(1);
		expect(await invalid()).toEqual([]);
		await page.goto(demo);
		await expect(page.locator('.wp-block-pmp-logo-slider.has-auto-width')).toHaveCount(2);
		expect(
			await page
				.locator('.wp-block-pmp-logo-slider')
				.first()
				.locator('img')
				.first()
				.evaluate((el) => el.getBoundingClientRect().height),
		).toBeCloseTo(80, 0);
	} finally {
		// Restore the demo's original content even if an assertion fails.
		await page.goto(`${after}/wp-admin/post.php?post=${baseline.id}&action=edit`);
		await page.waitForFunction(() => Boolean(window.wp?.apiFetch));
		await page.evaluate(async (saved) => {
			await wp.apiFetch({
				path: `/wp/v2/pages/${saved.id}`,
				method: 'POST',
				data: { content: saved.content },
			});
		}, baseline);
	}
	expect(errors).toEqual([]);
});
