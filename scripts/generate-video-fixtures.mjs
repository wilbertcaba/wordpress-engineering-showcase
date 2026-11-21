// Optional regeneration: requires ffmpeg on PATH. No third-party media is used.
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../fixtures/video/', import.meta.url));
mkdirSync(directory, { recursive: true });
const video = spawnSync(
	'ffmpeg',
	[
		'-hide_banner',
		'-loglevel',
		'error',
		'-y',
		'-f',
		'lavfi',
		'-i',
		'testsrc2=size=640x360:rate=24',
		'-t',
		'4',
		'-an',
		'-c:v',
		'libvpx-vp9',
		'-b:v',
		'0',
		'-crf',
		'42',
		'-pix_fmt',
		'yuv420p',
		`${directory}/demo.webm`,
	],
	{ stdio: 'inherit' },
);
if (video.status !== 0)
	throw new Error(
		'Could not generate the local demo video. Install ffmpeg with VP9 encoding support.',
	);
function chunk(type, payload) {
	const name = Buffer.from(type);
	const bytes = Buffer.concat([name, payload]);
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	const length = Buffer.alloc(4);
	length.writeUInt32BE(payload.length);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
	return Buffer.concat([length, bytes, checksum]);
}
const rows = Buffer.alloc(128 * (1 + 128 * 4));
for (let y = 0; y < 128; y++)
	for (let x = 0; x < 128; x++) {
		const offset = y * (1 + 128 * 4) + 1 + x * 4;
		if (x >= 40 && x <= 104 && Math.abs(y - 64) <= (104 - x) * 0.625) {
			rows[offset] = 0;
			rows[offset + 1] = 107;
			rows[offset + 2] = 145;
			rows[offset + 3] = 255;
		}
	}
const header = Buffer.alloc(13);
header.writeUInt32BE(128, 0);
header.writeUInt32BE(128, 4);
header[8] = 8;
header[9] = 6;
writeFileSync(
	`${directory}/play-icon.png`,
	Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(rows)),
		chunk('IEND', Buffer.alloc(0)),
	]),
);
console.log('Generated the four-second silent test video and custom play icon.');
