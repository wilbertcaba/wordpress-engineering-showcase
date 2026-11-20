import { test, expect } from '@playwright/test';
const url = process.env.AFTER_URL || 'http://localhost:8890';
test.beforeEach(async ({ page }) => {
	page.on('pageerror', (e) => console.log('EDITOR ERROR', e.message));
	page.on('response', async (r) => {
		if (r.status() >= 400 && r.url().startsWith(url))
			console.log('HTTP ERROR', r.status(), r.url());
	});
});
async function login(page) {
	await page.goto(`${url}/wp-login.php`);
	await page.locator('#user_login').fill(process.env.WP_ADMIN_USER || 'admin');
	await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD || 'password');
	await page.locator('#wp-submit').click();
}
async function openEditor(page, type = 'pmp_practice_area') {
	await page.goto(`${url}/wp-admin/edit.php?post_type=${type}`);
	const row =
		type === 'page'
			? page.locator('a.row-title').filter({ hasText: 'After: Variation 5' })
			: page.locator('a.row-title').first();
	await row.click();
	await page.waitForFunction(() =>
		Boolean(window.wp?.data?.select('core/editor')?.getCurrentPostId()),
	);
	await page.evaluate(() =>
		wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false),
	);
	if (type === 'pmp_practice_area')
		await page.waitForFunction(() =>
			Number.isInteger(wp.data.select('core/editor').getEditedPostAttribute('meta')?.card_image),
		);
}
async function save(page) {
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
}
async function cardPanel(page) {
	if (!(await page.getByRole('button', { name: 'Card Image', exact: true }).isVisible()))
		await page.getByRole('button', { name: 'Settings', exact: true }).click();
	const button = page.getByRole('button', { name: 'Card Image', exact: true });
	if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}
test('after: select, replace and remove a card image through the editor', async ({ page }) => {
	await login(page);
	await openEditor(page);
	await cardPanel(page);
	const original = await page.evaluate(
		() => wp.data.select('core/editor').getEditedPostAttribute('meta').card_image,
	);
	if (original) {
		await page.getByRole('button', { name: 'Remove image', exact: true }).click();
		await save(page);
	}
	await page.reload();
	await page.waitForFunction(() =>
		Boolean(window.wp?.data?.select('core/editor')?.getCurrentPostId()),
	);
	await cardPanel(page);
	expect(
		await page.evaluate(
			() => wp.data.select('core/editor').getEditedPostAttribute('meta').card_image,
		),
	).toBe(0);
	for (const buttonName of ['Select image', 'Replace image']) {
		await page.getByRole('button', { name: buttonName, exact: true }).click();
		await page.getByRole('tab', { name: 'Media Library', exact: true }).click();
		const attachment = page.locator('.media-modal .attachments .attachment:not(.selected)').first();
		await expect(attachment).toBeVisible();
		const selectedId = Number(await attachment.getAttribute('data-id'));
		await attachment.click();
		await page.locator('.media-modal').getByRole('button', { name: 'Select', exact: true }).click();
		await save(page);
		expect(
			await page.evaluate(
				() => wp.data.select('core/editor').getEditedPostAttribute('meta').card_image,
			),
		).toBe(selectedId);
	}
	// Restore fixture state through the editor store and normal Save action.
	await page.evaluate(
		(id) =>
			wp.data
				.dispatch('core/editor')
				.editPost({
					meta: { ...wp.data.select('core/editor').getEditedPostAttribute('meta'), card_image: id },
				}),
		original,
	);
	await save(page);
});
test('after: toggles card and featured images without rewriting secondary-title blocks', async ({
	page,
}) => {
	await login(page);
	await openEditor(page, 'page');
	await page.waitForFunction(() => wp.data.select('core/block-editor').getBlocks().length > 0);
	const queryId = await page.evaluate(() => {
		const find = (blocks) => {
			for (const b of blocks) {
				if (b.name === 'core/query') return b;
				const found = find(b.innerBlocks || []);
				if (found) return found;
			}
		};
		const b = find(wp.data.select('core/block-editor').getBlocks());
		wp.data.dispatch('core/block-editor').selectBlock(b.clientId);
		return b.clientId;
	});
	// Drive the same registered attributes as the inspector toggles, then check persisted block composition.
	const images = () =>
		page.evaluate((id) => {
			const q = wp.data.select('core/block-editor').getBlock(id);
			const flat = (blocks) => blocks.flatMap((b) => [b, ...flat(b.innerBlocks || [])]);
			return flat(q.innerBlocks)
				.filter(
					(b) =>
						b.name === 'core/post-featured-image' ||
						(b.name === 'pmp/post-meta' && b.attributes.metaKey === 'card_image'),
				)
				.map((b) => b.name);
		}, queryId);
	await page.evaluate(
		(id) =>
			wp.data
				.dispatch('core/block-editor')
				.updateBlockAttributes(id, { showCardImage: false, showFeaturedImage: true }),
		queryId,
	);
	await expect.poll(images).toEqual(['core/post-featured-image']);
	await page.evaluate(
		(id) =>
			wp.data
				.dispatch('core/block-editor')
				.updateBlockAttributes(id, { showCardImage: false, showFeaturedImage: false }),
		queryId,
	);
	await expect.poll(images).toEqual([]);
	await page.evaluate(
		(id) =>
			wp.data
				.dispatch('core/block-editor')
				.updateBlockAttributes(id, { showCardImage: true, showFeaturedImage: false }),
		queryId,
	);
	await expect.poll(images).toEqual(['pmp/post-meta']);
	await save(page);
	await page.reload();
	await page.waitForFunction(() => wp.data.select('core/block-editor').getBlocks().length > 0);
	const invalid = await page.evaluate(() => {
		const visit = (blocks) =>
			blocks.flatMap((b) => [
				...(b.isValid === false ? [b.name] : []),
				...visit(b.innerBlocks || []),
			]);
		return visit(wp.data.select('core/block-editor').getBlocks());
	});
	expect(invalid).toEqual([]);
	await expect(page.getByRole('button', { name: 'Card Image', exact: true })).toHaveCount(0);
});
