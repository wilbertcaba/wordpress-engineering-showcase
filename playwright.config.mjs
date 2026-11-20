import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: 'tests/browser',
	workers: 1,
	timeout: 90000,
	expect: { timeout: 15000 },
	use: { headless: true },
	reporter: 'list',
});
