import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
	);
}
for (const file of ['themes', 'mu-plugins', 'scripts', 'tests']
	.flatMap(walk)
	.filter((p) => p.endsWith('.php'))) {
	const result = spawnSync('php', ['-l', file], { encoding: 'utf8' });
	if (result.status !== 0) {
		process.stderr.write(result.stdout + result.stderr);
		process.exit(1);
	}
}
console.log('PHP syntax checks passed.');
