import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const action = process.argv[2];
const runtime = process.env.SHOWCASE_RUNTIME || 'docker';
if (!['docker', 'php'].includes(runtime))
	throw new Error('SHOWCASE_RUNTIME must be docker or php.');
function run(cmd, args, cwd = root) {
	const result = spawnSync(cmd, args, {
		cwd,
		stdio: 'inherit',
		env: { ...process.env, WP_ENV_HOME: path.join(root, '.showcase/cache') },
	});
	if (result.status !== 0) process.exit(result.status || 1);
}
const before = path.join(root, '.showcase/before');
function prepare() {
	if (!existsSync(path.join(before, '.baseline-ready'))) {
		if (existsSync(before))
			throw new Error('Incomplete baseline export. Remove only .showcase/before and retry.');
		mkdirSync(before, { recursive: true });
		const archive = spawnSync('git', ['archive', 'practice-areas-grid-before'], {
			cwd: root,
			maxBuffer: 32 * 1024 * 1024,
		});
		if (archive.status !== 0)
			throw new Error('Fetch the practice-areas-grid-before tag before preparing the demo.');
		const extract = spawnSync('tar', ['-x', '-C', before], { input: archive.stdout });
		if (extract.status !== 0) throw new Error('Could not export baseline.');
		run('touch', ['.baseline-ready'], before);
	}
	for (const dir of [before, root]) {
		run('npm', ['ci', '--prefix', 'themes/pmp-theme'], dir);
		run('npm', ['run', 'build'], dir);
	}
}
function env(state, cmd, args = []) {
	if (runtime === 'php' && cmd === 'run') {
		const status = spawnSync(
			path.join(root, 'node_modules/.bin/wp-env'),
			['status', '--config', path.join(root, `.wp-env.${state}.json`), '--json'],
			{
				cwd: root,
				encoding: 'utf8',
				env: { ...process.env, WP_ENV_HOME: path.join(root, '.showcase/cache') },
			},
		);
		if (status.status !== 0) throw new Error(status.stderr);
		const site = path.join(JSON.parse(status.stdout).installPath, 'php');
		const wpArgs = args
			.slice(2)
			.map((a) => a.replace('/var/www/html/wp-content/showcase/', root + '/'));
		run('wp', [`--path=${site}`, ...wpArgs]);
		return;
	}
	const config = path.join(root, `.wp-env.${state}.json`);
	run(path.join(root, 'node_modules/.bin/wp-env'), [cmd, '--config', config, ...args]);
}
function start() {
	for (const state of ['before', 'after']) env(state, 'start', ['--runtime', runtime]);
}
function seed() {
	for (const state of ['before', 'after']) {
		env(state, 'run', ['cli', 'wp', 'theme', 'activate', 'pmp-theme']);
		env(state, 'run', [
			'cli',
			'wp',
			'eval-file',
			'/var/www/html/wp-content/showcase/scripts/seed.php',
		]);
	}
}
if (action === 'prepare') prepare();
else if (action === 'start') start();
else if (action === 'seed') seed();
else if (action === 'seed-logo-slider')
	env('after', 'run', [
		'cli',
		'wp',
		'eval-file',
		'/var/www/html/wp-content/showcase/scripts/seed-logo-slider.php',
	]);
else if (action === 'seed-video-modal')
	env('after', 'run', [
		'cli',
		'wp',
		'eval-file',
		'/var/www/html/wp-content/showcase/scripts/seed-video-modal.php',
	]);
else if (action === 'setup') {
	prepare();
	start();
	seed();
} else if (action === 'stop') {
	for (const state of ['before', 'after']) {
		const status = spawnSync(
			path.join(root, 'node_modules/.bin/wp-env'),
			['status', '--config', path.join(root, `.wp-env.${state}.json`), '--json'],
			{
				cwd: root,
				encoding: 'utf8',
				env: { ...process.env, WP_ENV_HOME: path.join(root, '.showcase/cache') },
			},
		);
		if (status.status === 0 && JSON.parse(status.stdout).status !== 'uninitialized')
			env(state, 'stop');
	}
} else if (action === 'check') {
	for (const state of ['before', 'after'])
		env(state, 'run', [
			'cli',
			'wp',
			'eval-file',
			'/var/www/html/wp-content/showcase/tests/integration.php',
		]);
} else
	throw new Error(
		'Use prepare, start, seed, seed-logo-slider, seed-video-modal, setup, stop, or check.',
	);
