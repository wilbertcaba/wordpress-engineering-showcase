/*
 * Table of Contents block: front-end behaviour.
 *
 * Scrollspy for desktop instances highlights the heading whose section crosses
 * the reading line. An IntersectionObserver on a band between the sticky header
 * and the reading line triggers a cheap position sync, which avoids the flicker
 * of pure isIntersecting toggling.
 */

const DESKTOP_QUERY = '(min-width: 782px)';
const READING_LINE_RATIO = 0.3;

/**
 * Height of the sticky header as published by the navigation block.
 *
 * @returns {number} Pixels.
 */
const getStickyHeaderHeight = () => {
	const raw = getComputedStyle(document.body).getPropertyValue('--sticky-header-height');
	const value = parseFloat(raw);

	return Number.isFinite(value) ? value : 0;
};

/**
 * Start the scrollspy for one TOC instance.
 *
 * @param {HTMLElement} toc TOC wrapper.
 * @returns {Function} Teardown.
 */
const startScrollSpy = (toc) => {
	const entries = Array.from(toc.querySelectorAll('.toc-block__link[href^="#"]'))
		.map((link) => {
			let id = link.getAttribute('href').slice(1);

			try {
				id = decodeURIComponent(id);
			} catch (error) {
				// Keep the raw id.
			}

			return {
				link,
				item: link.closest('.toc-block__item'),
				target: document.getElementById(id),
			};
		})
		.filter((entry) => entry.target && entry.item);

	if (!entries.length) {
		return () => {};
	}

	let observer = null;
	let activeIndex = -1;
	let paused = false;
	let pauseTimer = 0;
	let resizeTimer = 0;

	/**
	 * Keep the active link visible inside a scrollable (sticky) TOC without
	 * touching the page scroll position.
	 *
	 * @param {HTMLElement} link Active link.
	 */
	const revealInToc = (link) => {
		if (toc.scrollHeight <= toc.clientHeight) {
			return;
		}

		const linkRect = link.getBoundingClientRect();
		const tocRect = toc.getBoundingClientRect();

		if (linkRect.top < tocRect.top) {
			toc.scrollTop -= tocRect.top - linkRect.top;
		} else if (linkRect.bottom > tocRect.bottom) {
			toc.scrollTop += linkRect.bottom - tocRect.bottom;
		}
	};

	/**
	 * Apply the active state to one entry (or none for -1).
	 *
	 * @param {number} index Entry index.
	 */
	const setActive = (index) => {
		if (index === activeIndex) {
			return;
		}

		activeIndex = index;

		toc.querySelectorAll('.has-active-child').forEach((element) => {
			element.classList.remove('has-active-child');
		});

		entries.forEach((entry, i) => {
			const isActive = i === index;
			entry.item.classList.toggle('is-active', isActive);

			if (isActive) {
				entry.link.setAttribute('aria-current', 'location');
			} else {
				entry.link.removeAttribute('aria-current');
			}
		});

		if (index < 0) {
			return;
		}

		let parent = entries[index].item.parentElement?.closest('.toc-block__item');

		while (parent) {
			parent.classList.add('has-active-child');
			parent = parent.parentElement?.closest('.toc-block__item');
		}

		revealInToc(entries[index].link);
	};

	/**
	 * Y position (viewport px) of the reading line.
	 *
	 * @returns {number} Pixels from the top of the viewport.
	 */
	const getReadingLine = () =>
		getStickyHeaderHeight() + Math.round(window.innerHeight * READING_LINE_RATIO);

	/**
	 * Active heading = the last one whose top sits above the reading line.
	 * At the very bottom of the page the last heading wins so short final
	 * sections can still be highlighted.
	 */
	const sync = () => {
		if (paused) {
			return;
		}

		const doc = document.documentElement;

		if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) {
			setActive(entries.length - 1);
			return;
		}

		const readingLine = getReadingLine() + 1;
		let index = -1;

		entries.forEach((entry, i) => {
			if (entry.target.getBoundingClientRect().top <= readingLine) {
				index = i;
			}
		});

		setActive(index);
	};

	/**
	 * (Re)create the observer. rootMargin cannot reference CSS variables, so
	 * it is rebuilt whenever the viewport or header height may have changed.
	 */
	const observe = () => {
		if (observer) {
			observer.disconnect();
		}

		const header = Math.round(getStickyHeaderHeight());
		const bottom = Math.max(0, window.innerHeight - getReadingLine());

		observer = new IntersectionObserver(sync, {
			rootMargin: `-${header}px 0px -${bottom}px 0px`,
			threshold: 0,
		});

		entries.forEach((entry) => observer.observe(entry.target));
	};

	/**
	 * Resume after a click-initiated scroll settles.
	 */
	const resume = () => {
		clearTimeout(pauseTimer);
		window.removeEventListener('scrollend', resume);
		paused = false;
		sync();
	};

	/**
	 * Highlight the clicked item at once and ignore the headings the smooth
	 * scroll passes on the way.
	 *
	 * @param {MouseEvent} event Click event.
	 */
	const onLinkClick = (event) => {
		const index = entries.findIndex((entry) => entry.link === event.currentTarget);

		if (index < 0) {
			return;
		}

		paused = true;
		setActive(index);
		clearTimeout(pauseTimer);

		if ('onscrollend' in window) {
			window.addEventListener('scrollend', resume, { once: true });
			pauseTimer = window.setTimeout(resume, 1500);
		} else {
			pauseTimer = window.setTimeout(resume, 800);
		}
	};

	/**
	 * Debounced rebuild on resize.
	 */
	const onResize = () => {
		clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(() => {
			observe();
			sync();
		}, 150);
	};

	entries.forEach((entry) => entry.link.addEventListener('click', onLinkClick));
	window.addEventListener('resize', onResize);
	window.addEventListener('load', onResize);
	window.addEventListener('scroll', sync, { passive: true });

	observe();
	sync();

	return () => {
		clearTimeout(pauseTimer);
		clearTimeout(resizeTimer);
		window.removeEventListener('scrollend', resume);
		window.removeEventListener('resize', onResize);
		window.removeEventListener('load', onResize);
		window.removeEventListener('scroll', sync);
		entries.forEach((entry) => entry.link.removeEventListener('click', onLinkClick));

		if (observer) {
			observer.disconnect();
			observer = null;
		}

		paused = false;
		setActive(-1);
	};
};

/**
 * Enable the scrollspy only while the desktop media query matches.
 *
 * @param {HTMLElement} toc TOC wrapper.
 */
const setupScrollSpy = (toc) => {
	if (toc.dataset.scrollspy !== 'true' || !('IntersectionObserver' in window)) {
		return;
	}

	const mediaQuery = window.matchMedia(DESKTOP_QUERY);
	let teardown = null;

	/**
	 * Start or stop depending on the current match.
	 */
	const apply = () => {
		if (mediaQuery.matches && !teardown) {
			teardown = startScrollSpy(toc);
		} else if (!mediaQuery.matches && teardown) {
			teardown();
			teardown = null;
		}
	};

	mediaQuery.addEventListener('change', apply);
	apply();
};

/**
 * A sticky TOC inside something that already sticks (a sidebar made sticky
 * with custom CSS, the Legal Resources page sidebar) would stick inside it and
 * cover what follows. Sticky groups are handled in CSS; this catches the rest,
 * and checks again when the layout changes width.
 *
 * @param {HTMLElement} toc TOC wrapper.
 */
const setupNestedSticky = (toc) => {
	if (!toc.classList.contains('toc-block--sticky')) {
		return;
	}

	const check = () => {
		let node = toc.parentElement;
		let nested = false;

		while (node && node !== document.body) {
			const { position } = window.getComputedStyle(node);

			if (position === 'sticky' || position === 'fixed') {
				nested = true;
				break;
			}

			node = node.parentElement;
		}

		toc.classList.toggle('toc-block--nested', nested);
	};

	let timer = 0;

	check();
	window.addEventListener(
		'resize',
		() => {
			clearTimeout(timer);
			timer = setTimeout(check, 150);
		},
		{ passive: true },
	);
};

/**
 * Bootstrap all TOC instances on the page.
 */
const init = () => {
	const tocs = Array.from(document.querySelectorAll('.toc-block'));

	if (!tocs.length) {
		return;
	}

	tocs.forEach(setupNestedSticky);
	tocs.forEach(setupScrollSpy);
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
