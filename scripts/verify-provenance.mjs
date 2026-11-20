import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const provenance = JSON.parse(readFileSync('docs/provenance.json', 'utf8'));
for (const file of provenance.files) {
	const actual = createHash('sha256').update(readFileSync(file.destination)).digest('hex');
	if (actual !== file.extractedSha256)
		throw new Error(`Provenance is stale for ${file.destination}`);
}
console.log(`Verified ${provenance.files.length} extracted source file hashes.`);
