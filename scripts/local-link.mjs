import {
	existsSync,
	realpathSync,
	mkdirSync,
	symlinkSync,
	readFileSync,
	copyFileSync,
	constants,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [state, site] = process.argv.slice(2);
if (!['before', 'after'].includes(state) || !site)
	throw new Error(
		'Usage: npm run local:link -- before|after /absolute/path/to/NEW/site/app/public',
	);
const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const source = state === 'before' ? path.join(root, '.showcase/before') : root;
const publicRoot = realpathSync(path.resolve(site));
if (!existsSync(path.join(publicRoot, 'wp-config.php')))
	throw new Error(
		'Target must be a disposable WordPress public directory containing wp-config.php.',
	);
if (!existsSync(path.join(source, 'themes/pmp-theme/dist/js/editor.js')))
	throw new Error('Run npm run demo:prepare first.');
const pairs = [
	['themes/pmp-theme', 'themes/pmp-theme'],
	['mu-plugins/pmp-plugin', 'mu-plugins/pmp-plugin'],
].map(([from, to]) => [path.join(source, from), path.join(publicRoot, 'wp-content', to)]);
// Preflight all collisions before creating or replacing anything.
for (const [from, to] of pairs) {
	if (existsSync(to) && realpathSync(to) !== realpathSync(from))
		throw new Error(`Refusing to replace existing package: ${to}`);
}
const loader = path.join(publicRoot, 'wp-content/mu-plugins/pmp-loader.php');
const original = path.join(source, 'mu-plugins/pmp-loader.php');
if (existsSync(loader) && !readFileSync(loader).equals(readFileSync(original)))
	throw new Error(`Refusing to replace existing loader: ${loader}`);
for (const [from, to] of pairs) {
	mkdirSync(path.dirname(to), { recursive: true });
	if (!existsSync(to)) symlinkSync(from, to, 'dir');
}
if (!existsSync(loader)) copyFileSync(original, loader, constants.COPYFILE_EXCL);
console.log(
	`Linked ${state} packages. In this NEW site's Local Site Shell, activate pmp-theme and run the seed/check commands documented in docs/local.md.`,
);
