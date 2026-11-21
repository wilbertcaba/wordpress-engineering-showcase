import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const after = process.env.AFTER_URL || 'http://localhost:8890';
const before = process.env.BEFORE_URL || 'http://localhost:8888';
const demo = `${after}/video-modal/`;
const solidName = 'Play video: Local demo — solid button';
const outlineName = 'Play video: Local demo — custom icon';
function watchErrors(page) {
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	return errors;
}

test('video modal: lazy local playback, independent instances and responsive screenshots', async ({
	page,
}) => {
	const errors = watchErrors(page);
	const requests = [];
	page.on('request', (r) => {
		if (r.url().includes('video-modal-demo.webm')) requests.push(r.url());
	});
	await page.goto(demo);
	await expect(page.locator('[data-block-name="pmp/video-modal"]')).toHaveCount(2);
	await expect(page.locator('video,iframe')).toHaveCount(0);
	expect(requests).toHaveLength(0);
	mkdirSync('docs/video-modal/screenshots', { recursive: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.screenshot({ path: 'docs/video-modal/screenshots/overview.png', fullPage: true });
	await page.getByRole('button', { name: solidName, exact: true }).click();
	const dialog = page.locator('dialog[open]');
	const video = dialog.locator('video');
	await expect(dialog).toHaveCount(1);
	await expect(video).toBeVisible();
	await expect.poll(() => video.evaluate((v) => v.readyState)).toBeGreaterThanOrEqual(2);
	await expect.poll(() => video.evaluate((v) => v.currentTime)).toBeGreaterThan(0);
	await video.evaluate((v) => {
		v.pause();
		v.currentTime = 1;
	});
	expect(requests.length).toBeGreaterThan(0);
	for (const [name, width] of [
		['desktop', 1440],
		['mobile', 390],
	]) {
		await page.setViewportSize({ width, height: 1000 });
		const bounds = await dialog.boundingBox();
		expect(bounds.x).toBeGreaterThanOrEqual(0);
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true,
		);
		await page.screenshot({ path: `docs/video-modal/screenshots/${name}.png`, fullPage: true });
	}
	const detachedVideo = await video.elementHandle();
	await page.getByRole('button', { name: 'Close video', exact: true }).click();
	await expect(page.locator('dialog[open],video,iframe')).toHaveCount(0);
	expect(await detachedVideo.evaluate((media) => media.paused)).toBe(true);
	expect(await detachedVideo.getAttribute('src')).toBeNull();
	await page.getByRole('button', { name: outlineName, exact: true }).click();
	await expect(page.locator('dialog[open]')).toHaveCount(1);
	await expect(page.locator('dialog[open]')).toHaveAttribute(
		'aria-label',
		'Local demo — custom icon',
	);
	await page.keyboard.press('Escape');
	await expect(page.locator('video')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('video modal: keyboard, Escape, backdrop, playback end and overflow restoration', async ({
	page,
}) => {
	const errors = watchErrors(page);
	await page.goto(demo);
	const trigger = page.getByRole('button', { name: solidName, exact: true });
	await trigger.focus();
	await page.keyboard.press('Enter');
	const dialog = page.locator('dialog[open]');
	await expect(dialog).toBeVisible();
	for (let n = 0; n < 3; n++) {
		await page.keyboard.press('Tab');
		expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
	}
	await page.keyboard.press('Escape');
	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await expect(trigger).toBeFocused();
	await expect(page.locator('video')).toHaveCount(0);
	await page.evaluate(() => (document.body.style.overflow = 'clip'));
	await trigger.click();
	await expect(page.locator('dialog[open]')).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(page.locator('dialog[open],video')).toHaveCount(0);
	expect(await page.evaluate(() => document.body.style.overflow)).toBe('clip');
	await page.evaluate(() => (document.body.style.overflow = ''));
	await trigger.click();
	const video = page.locator('dialog[open] video');
	await expect.poll(() => video.evaluate((v) => v.readyState)).toBeGreaterThanOrEqual(2);
	await video.evaluate((v) => (v.currentTime = v.duration - 0.2));
	await expect(page.locator('dialog[open],video')).toHaveCount(0);
	expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
	expect(errors).toEqual([]);
});

test('video modal: provider contracts reject foreign messages and clean up mocked players', async ({
	page,
}) => {
	const errors = watchErrors(page);
	await page.route(demo, async (route) => {
		const response = await route.fetch();
		let index = 0;
		const urls = [
			'https://www.youtube.com/watch?v=abcDEF123_-',
			'https://player.vimeo.com/video/123456789?h=a1b2c3d4e5',
		];
		const body = (await response.text()).replace(
			/data-video-url="[^"]*"/g,
			() => `data-video-url="${urls[index++]}"`,
		);
		await route.fulfill({ response, body });
	});
	const mock =
		'<!doctype html><html><body>Mock provider player<script>window.messages=[];addEventListener("message",e=>{try{messages.push(typeof e.data==="string"?JSON.parse(e.data):e.data)}catch{}});</script></body></html>';
	await page.route('https://www.youtube.com/embed/**', (r) =>
		r.fulfill({ contentType: 'text/html', body: mock }),
	);
	await page.route('https://player.vimeo.com/video/**', (r) =>
		r.fulfill({ contentType: 'text/html', body: mock }),
	);
	await page.goto(demo);
	await expect(page.locator('iframe')).toHaveCount(0);
	for (const [name, origin, event] of [
		[solidName, 'https://www.youtube.com', 'onStateChange'],
		[outlineName, 'https://player.vimeo.com', 'ended'],
	]) {
		await page.getByRole('button', { name, exact: true }).click();
		const iframe = page.locator('dialog[open] iframe');
		await expect(iframe).toBeVisible();
		const url = new URL(await iframe.getAttribute('src'));
		expect(url.origin).toBe(origin);
		const handle = await iframe.elementHandle();
		const frame = await handle.contentFrame();
		await frame.waitForLoadState('domcontentloaded');
		await page.evaluate((origin) => {
			const iframe = document.querySelector('dialog[open] iframe');
			dispatchEvent(
				new MessageEvent('message', {
					origin: 'https://foreign.example',
					source: iframe.contentWindow,
					data: { event: 'onStateChange', info: 0 },
				}),
			);
			dispatchEvent(
				new MessageEvent('message', { origin, source: window, data: { event: 'ended' } }),
			);
		}, origin);
		await expect(page.locator('dialog[open]')).toHaveCount(1);
		if (event === 'ended') {
			expect(url.searchParams.get('h')).toBe('a1b2c3d4e5');
			await frame.evaluate((target) => parent.postMessage({ event: 'ready' }, target), after);
			await expect
				.poll(() =>
					frame.evaluate(() =>
						window.messages.some((m) => m.method === 'addEventListener' && m.value === 'ended'),
					),
				)
				.toBe(true);
		} else {
			expect(url.searchParams.get('origin')).toBe(after);
			await expect
				.poll(() => frame.evaluate(() => window.messages.some((m) => m.event === 'listening')))
				.toBe(true);
		}
		await frame.evaluate(({ target, event }) => parent.postMessage({ event, info: 0 }, target), {
			target: after,
			event,
		});
		await expect(page.locator('dialog[open],iframe')).toHaveCount(0);
	}
	expect(errors).toEqual([]);
});

test('video modal: editor media, titles, sizing and custom icon persist', async ({ page }) => {
	const errors = watchErrors(page);
	await page.goto(`${after}/wp-login.php`);
	await page.locator('#user_login').fill(process.env.WP_ADMIN_USER || 'admin');
	await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASSWORD || 'password');
	await page.locator('#wp-submit').click();
	await page.goto(`${after}/wp-admin/edit.php?post_type=page`);
	await page
		.locator('a.row-title')
		.filter({ hasText: /^Video Modal$/ })
		.click();
	await page.waitForFunction(() =>
		Boolean(window.wp?.data?.select('core/block-editor')?.getBlocks()?.length),
	);
	await page.evaluate(() =>
		wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false),
	);
	const original = await page.evaluate(() => ({
		id: wp.data.select('core/editor').getCurrentPostId(),
		content: wp.data.select('core/editor').getEditedPostContent(),
	}));
	try {
		const invalid = () =>
			page.evaluate(() => {
				const visit = (blocks) =>
					blocks.flatMap((b) => [
						...(b.isValid === false ? [b.name] : []),
						...visit(b.innerBlocks || []),
					]);
				return visit(wp.data.select('core/block-editor').getBlocks());
			});
		expect(await invalid()).toEqual([]);
		await page.evaluate(() => {
			const b = wp.data
				.select('core/block-editor')
				.getBlocks()
				.find((b) => b.name === 'pmp/video-modal');
			wp.data.dispatch('core/block-editor').selectBlock(b.clientId);
		});
		if (!(await page.getByRole('textbox', { name: 'Video title', exact: true }).isVisible()))
			await page.getByRole('button', { name: 'Settings', exact: true }).click();
		await page.getByRole('textbox', { name: 'Video title', exact: true }).fill('Edited local demo');
		await page.getByRole('button', { name: 'Select from Media Library', exact: true }).click();
		await page.getByRole('tab', { name: 'Media Library', exact: true }).click();
		const media = page.locator('.media-modal .attachment').first();
		await expect(media).toBeVisible();
		await media.click();
		await page.locator('.media-modal').getByRole('button', { name: 'Select', exact: true }).click();
		await page.getByRole('button', { name: 'Button', exact: true }).click();
		await page.getByRole('spinbutton', { name: 'Button size (px)', exact: true }).fill('112');
		await page.getByRole('spinbutton', { name: 'Icon size (% of button)', exact: true }).fill('60');
		await page.getByRole('button', { name: 'Custom icon from Media Library', exact: true }).click();
		await page.getByRole('tab', { name: 'Media Library', exact: true }).click();
		await page
			.getByRole('searchbox', { name: 'Search media', exact: true })
			.fill('video-modal-play-icon');
		const icon = page.getByRole('checkbox', { name: 'video-modal-play-icon', exact: true });
		await expect(icon).toBeVisible();
		await icon.click();
		await page.locator('.media-modal').getByRole('button', { name: 'Select', exact: true }).click();
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
		const saved = await page.evaluate(
			() =>
				wp.data
					.select('core/block-editor')
					.getBlocks()
					.find((b) => b.name === 'pmp/video-modal').attributes,
		);
		expect(saved).toMatchObject({ videoTitle: 'Edited local demo', buttonSize: 112, iconSize: 60 });
		expect(saved.videoUrl).toContain('.webm');
		expect(saved.iconUrl).toContain('video-modal-play-icon');
		expect(await invalid()).toEqual([]);
		await page.goto(demo);
		const root = page.locator('[data-block-name="pmp/video-modal"]').first();
		expect(await root.evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(112);
		await expect(root.locator('img')).toHaveCount(1);
		await page.getByRole('button', { name: 'Play video: Edited local demo', exact: true }).click();
		await expect(
			page.getByRole('dialog', { name: 'Edited local demo', exact: true }),
		).toBeVisible();
		await page.keyboard.press('Escape');
	} finally {
		await page.goto(`${after}/wp-admin/post.php?post=${original.id}&action=edit`);
		await page.waitForFunction(() => Boolean(window.wp?.apiFetch));
		await page.evaluate(
			(saved) =>
				wp.apiFetch({
					path: `/wp/v2/pages/${saved.id}`,
					method: 'POST',
					data: { content: saved.content },
				}),
			original,
		);
	}
	expect(errors).toEqual([]);
});

test('video modal: absent from the before environment', async ({ page }) => {
	const response = await page.goto(`${before}/video-modal/`);
	expect(response.status()).toBe(404);
	await expect(page.locator('[data-block-name="pmp/video-modal"]')).toHaveCount(0);
});
