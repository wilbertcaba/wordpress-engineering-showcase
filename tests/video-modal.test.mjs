import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({
	URL,
	window: { location: { origin: 'http://localhost:8890' } },
	document: { readyState: 'loading', addEventListener() {} },
});
const source = readFileSync('themes/pmp-theme/includes/blocks/video-modal/view.js', 'utf8');
new vm.Script(`${source}\nglobalThis.testApi={detectVideo,createEndListener};`).runInContext(
	context,
);
const { detectVideo, createEndListener } = context.testApi;
const videoId = 'abcDEF123_-';
test('video modal recognizes YouTube URLs and builds a trusted embed URL', () => {
	for (const url of [
		`https://www.youtube.com/watch?v=${videoId}`,
		`https://youtu.be/${videoId}`,
		`https://m.youtube.com/shorts/${videoId}`,
		`https://www.youtube-nocookie.com/embed/${videoId}`,
	]) {
		const result = detectVideo(url);
		assert.equal(result.type, 'youtube');
		const embed = new URL(result.embedUrl);
		assert.equal(embed.origin, 'https://www.youtube.com');
		assert.equal(embed.pathname, `/embed/${videoId}`);
		assert.equal(embed.searchParams.get('origin'), 'http://localhost:8890');
	}
});
test('video modal rejects lookalike hosts, unsafe schemes and malformed IDs', () => {
	for (const url of [
		`https://notyoutube.com/watch?v=${videoId}`,
		`https://youtube.com.evil.example/watch?v=${videoId}`,
		`ftp://example.com/clip.mp4`,
		'javascript:alert(1)//clip.mp4',
		'not a URL',
		'https://youtube.com/watch?v=bad%26autoplay%3D0',
		'https://vimeo.com/123?h=bad%26hash',
	])
		assert.equal(detectVideo(url), null, url);
});
test('video modal preserves Vimeo privacy hashes and direct-file queries', () => {
	for (const url of [
		'https://vimeo.com/123456789/a1b2c3d4e5',
		'https://player.vimeo.com/video/123456789?h=a1b2c3d4e5',
	]) {
		const result = detectVideo(url);
		assert.equal(result.type, 'vimeo');
		assert.equal(new URL(result.embedUrl).searchParams.get('h'), 'a1b2c3d4e5');
	}
	const url = 'http://localhost:8890/clip.webm?version=2';
	assert.equal(detectVideo(url).fileUrl, url);
});
test('video modal ignores end messages from a different origin or frame', () => {
	let ended = 0;
	const frame = { contentWindow: {} };
	const descriptor = { type: 'youtube', origin: 'https://www.youtube.com' };
	const handle = createEndListener(descriptor, frame, () => ended++);
	handle({
		origin: 'https://evil.example',
		source: frame.contentWindow,
		data: { event: 'onStateChange', info: 0 },
	});
	handle({ origin: descriptor.origin, source: {}, data: { event: 'onStateChange', info: 0 } });
	handle({ origin: descriptor.origin, source: frame.contentWindow, data: 'not JSON' });
	assert.equal(ended, 0);
	handle({
		origin: descriptor.origin,
		source: frame.contentWindow,
		data: JSON.stringify({ event: 'onStateChange', info: 0 }),
	});
	assert.equal(ended, 1);
	handle({
		origin: descriptor.origin,
		source: frame.contentWindow,
		data: { event: 'infoDelivery', info: { playerState: 0 } },
	});
	assert.equal(ended, 2);
});
test('video modal subscribes to Vimeo ended and accepts legacy finish messages', () => {
	let ended = 0;
	const posts = [];
	const frame = { contentWindow: { postMessage: (...args) => posts.push(args) } };
	const descriptor = { type: 'vimeo', origin: 'https://player.vimeo.com' };
	const handle = createEndListener(descriptor, frame, () => ended++);
	handle({ origin: descriptor.origin, source: frame.contentWindow, data: { event: 'ready' } });
	assert.equal(JSON.parse(posts[0][0]).value, 'ended');
	assert.equal(posts[0][1], descriptor.origin);
	for (const event of ['ended', 'finish'])
		handle({ origin: descriptor.origin, source: frame.contentWindow, data: { event } });
	assert.equal(ended, 2);
});
