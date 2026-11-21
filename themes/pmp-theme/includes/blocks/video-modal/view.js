/**
 * Video Modal block frontend logic.
 *
 * Each block renders a round play button plus a hidden <dialog>. The
 * player (YouTube/Vimeo iframe or native <video>) is only created on
 * first open and is removed again on close, which stops playback. The
 * modal closes itself when the video ends.
 */

const MODAL_SELECTOR = '[data-block-name="pmp/video-modal"]';

/**
 * Detect the video provider and build the embed source from a raw URL.
 *
 * The iframe src is always constructed from the parsed video ID, never
 * from the raw URL.
 *
 * @param {string} rawUrl - The URL saved on the block.
 * @returns {object|null} Provider descriptor, or null when unrecognized.
 */
const detectVideo = (rawUrl) => {
	let url;

	try {
		url = new URL(rawUrl);
	} catch (err) {
		return null;
	}

	if (!['https:', 'http:'].includes(url.protocol)) return null;

	const host = url.hostname.replace(/^www\./, '');

	if (
		host === 'youtu.be' ||
		host === 'youtube.com' ||
		host.endsWith('.youtube.com') ||
		host === 'youtube-nocookie.com' ||
		host.endsWith('.youtube-nocookie.com')
	) {
		const pathMatch = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
		const id =
			host === 'youtu.be'
				? url.pathname.split('/')[1]
				: url.searchParams.get('v') || (pathMatch ? pathMatch[1] : '');

		if (!/^[\w-]{6,}$/.test(id)) {
			return null;
		}

		const origin = encodeURIComponent(window.location.origin);

		return {
			type: 'youtube',
			embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=${origin}`,
			origin: 'https://www.youtube.com',
		};
	}

	if (host === 'vimeo.com' || host === 'player.vimeo.com') {
		const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([\da-f]+))?\/?$/i);

		if (!match) {
			return null;
		}

		const privacyHash = match[2] || url.searchParams.get('h') || '';
		if (privacyHash && !/^[\da-f]+$/i.test(privacyHash)) return null;
		const hash = privacyHash ? `&h=${encodeURIComponent(privacyHash)}` : '';

		return {
			type: 'vimeo',
			embedUrl: `https://player.vimeo.com/video/${match[1]}?autoplay=1${hash}`,
			origin: 'https://player.vimeo.com',
		};
	}

	if (/\.(mp4|webm|m4v|mov|ogv)$/i.test(url.pathname)) {
		return { type: 'file', fileUrl: rawUrl };
	}

	return null;
};

/**
 * Build a window `message` handler that closes the modal when the
 * embedded YouTube/Vimeo video ends.
 *
 * YouTube speaks the widget postMessage API (after the `listening`
 * handshake sent on iframe load); Vimeo speaks the player.js postMessage
 * API and needs an `ended` subscription once it reports `ready`.
 *
 * @param {object}      video   - Provider descriptor from detectVideo().
 * @param {HTMLElement} iframe  - The embed iframe.
 * @param {Function}    onEnded - Called when the video finishes.
 * @returns {Function} The message event handler.
 */
const createEndListener = (video, iframe, onEnded) => (event) => {
	if (event.origin !== video.origin || event.source !== iframe.contentWindow) {
		return;
	}

	let { data } = event;

	if (typeof data === 'string') {
		try {
			data = JSON.parse(data);
		} catch (err) {
			return;
		}
	}

	if (!data || typeof data !== 'object') {
		return;
	}

	if (video.type === 'youtube') {
		const ended =
			(data.event === 'onStateChange' && data.info === 0) ||
			(data.event === 'infoDelivery' && data.info && data.info.playerState === 0);

		if (ended) {
			onEnded();
		}

		return;
	}

	// Vimeo.
	if (data.event === 'ready') {
		iframe.contentWindow.postMessage(
			JSON.stringify({ method: 'addEventListener', value: 'ended' }),
			video.origin,
		);
		return;
	}

	if (data.event === 'ended' || data.event === 'finish') {
		onEnded();
	}
};

/**
 * Set up one Video Modal block: wire its play button to the dialog.
 *
 * @param {HTMLElement} blockEl - The block wrapper element.
 */
const setupModal = (blockEl) => {
	const dialog = blockEl.querySelector('[data-block-element="dialog"]');
	const player = blockEl.querySelector('[data-block-element="player"]');
	const trigger = blockEl.querySelector('[data-block-element="trigger"]');
	const video = detectVideo(blockEl.dataset.videoUrl || '');

	if (!dialog || !player || !trigger || !video || typeof dialog.showModal !== 'function') {
		return;
	}

	const closeButton = blockEl.querySelector('[data-block-element="close"]');
	const title = blockEl.dataset.videoTitle || '';
	let messageHandler = null;
	let previousOverflow = '';

	// Every close path (X, Esc, backdrop, end-of-video) fires `close`;
	// pause/unload native media before detaching its element.
	dialog.addEventListener('close', () => {
		player.querySelectorAll('video').forEach((media) => {
			media.pause();
			media.removeAttribute('src');
			media.load();
		});
		player.replaceChildren();

		if (messageHandler) {
			window.removeEventListener('message', messageHandler);
			messageHandler = null;
		}

		document.body.style.overflow = previousOverflow;
	});

	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	});

	if (closeButton) {
		closeButton.addEventListener('click', () => dialog.close());
	}

	trigger.addEventListener('click', () => {
		if (dialog.open) {
			return;
		}

		if (video.type === 'file') {
			const media = document.createElement('video');
			media.src = video.fileUrl;
			media.controls = true;
			media.autoplay = true;
			media.playsInline = true;

			if (title) {
				media.setAttribute('aria-label', title);
			}

			media.addEventListener('ended', () => dialog.close());
			player.appendChild(media);
		} else {
			const iframe = document.createElement('iframe');
			iframe.src = video.embedUrl;
			iframe.title = title;
			iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
			iframe.allowFullscreen = true;
			iframe.setAttribute('frameborder', '0');

			messageHandler = createEndListener(video, iframe, () => dialog.close());
			window.addEventListener('message', messageHandler);

			if (video.type === 'youtube') {
				iframe.addEventListener('load', () => {
					if (!iframe.contentWindow) {
						return;
					}

					iframe.contentWindow.postMessage(
						JSON.stringify({
							event: 'listening',
							id: 'pmp-video-modal',
							channel: 'widget',
						}),
						video.origin,
					);
					iframe.contentWindow.postMessage(
						JSON.stringify({
							event: 'command',
							func: 'addEventListener',
							args: ['onStateChange'],
							id: 'pmp-video-modal',
							channel: 'widget',
						}),
						video.origin,
					);
				});
			}

			player.appendChild(iframe);
		}

		previousOverflow = document.body.style.overflow;
		dialog.showModal();
		document.body.style.overflow = 'hidden';
	});
};

/**
 * Set up all Video Modal blocks.
 */
const setup = () => {
	document.querySelectorAll(MODAL_SELECTOR).forEach(setupModal);
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setup);
} else {
	setup();
}
