/**
 * Breadcrumbs block
 *
 * Small-screen behaviour for core/breadcrumbs as restructured by
 * PMP\Theme\Block\BreadcrumbsBlock::render_block(): a disclosure toggle that
 * reveals the collapsed intermediate levels, and mouse dragging on the
 * horizontally scrolling trail. Touch devices scroll the trail natively.
 */

const DESKTOP_QUERY = '(min-width: 48em)';
const DRAG_THRESHOLD = 3;

export default class Breadcrumbs {
	constructor() {
		this.$blocks = Array.from(document.querySelectorAll('.wp-block-breadcrumbs'));
		this.desktop = window.matchMedia(DESKTOP_QUERY);
	}

	/**
	 * Initialize all breadcrumb blocks on the page
	 */
	init() {
		if (!this.$blocks.length) {
			return;
		}

		this.$blocks.forEach((block) => {
			this.setupToggle(block);
			this.setupDrag(block.querySelector('.wp-block-breadcrumbs__list'));
		});

		// Click outside closes any open dropdown.
		document.addEventListener('click', (event) => this.closeAll(event.target));

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				this.closeAll(null, true);
			}
		});

		// The levels render inline from the medium breakpoint up.
		this.desktop.addEventListener('change', (event) => {
			if (event.matches) {
				this.closeAll();
			}
		});
	}

	/**
	 * Wire the disclosure toggle for one block.
	 *
	 * @param {HTMLElement} block The nav element.
	 */
	setupToggle(block) {
		const toggle = block.querySelector('.wp-block-breadcrumbs__toggle');

		if (!toggle) {
			return;
		}

		toggle.addEventListener('click', () => {
			this.setOpen(block, !block.classList.contains('is-open'));
		});

		// Tabbing out of the block closes it.
		block.addEventListener('focusout', (event) => {
			if (!block.contains(event.relatedTarget)) {
				this.setOpen(block, false);
			}
		});
	}

	/**
	 * Open or close one block's dropdown.
	 *
	 * @param {HTMLElement} block   The nav element.
	 * @param {boolean}     open    Desired state.
	 * @param {boolean}     refocus Move focus back to the toggle when closing.
	 */
	setOpen(block, open, refocus = false) {
		const toggle = block.querySelector('.wp-block-breadcrumbs__toggle');

		block.classList.toggle('is-open', open);

		if (toggle) {
			toggle.setAttribute('aria-expanded', String(open));

			if (!open && refocus && block.contains(block.ownerDocument.activeElement)) {
				toggle.focus();
			}
		}
	}

	/**
	 * Close every open dropdown, except the one containing `target`.
	 *
	 * @param {EventTarget|null} target  Element that triggered the close, if any.
	 * @param {boolean}          refocus Move focus back to the toggle.
	 */
	closeAll(target = null, refocus = false) {
		this.$blocks.forEach((block) => {
			if (!block.classList.contains('is-open')) {
				return;
			}

			if (target && block.contains(target)) {
				return;
			}

			this.setOpen(block, false, refocus);
		});
	}

	/**
	 * Let a mouse drag the trail sideways when it overflows.
	 *
	 * Deliberately no pointer capture: capturing would retarget the pointerup
	 * to the list and the browser would then stop dispatching click to the link
	 * under the cursor, so plain clicks would no longer follow links.
	 *
	 * @param {HTMLElement|null} list The scrolling <ol>.
	 */
	setupDrag(list) {
		if (!list) {
			return;
		}

		let dragging = false;
		let moved = false;
		let startX = 0;
		let startScroll = 0;

		const stop = () => {
			if (!dragging) {
				return;
			}

			dragging = false;
			list.classList.remove('is-dragging');
		};

		list.addEventListener('pointerdown', (event) => {
			if (event.pointerType !== 'mouse' || event.button !== 0) {
				return;
			}

			if (list.scrollWidth <= list.clientWidth) {
				return;
			}

			dragging = true;
			moved = false;
			startX = event.clientX;
			startScroll = list.scrollLeft;
			list.classList.add('is-dragging');
		});

		list.addEventListener('pointermove', (event) => {
			if (!dragging) {
				return;
			}

			const delta = event.clientX - startX;

			if (Math.abs(delta) > DRAG_THRESHOLD) {
				moved = true;
			}

			list.scrollLeft = startScroll - delta;
		});

		['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => {
			list.addEventListener(type, stop);
		});

		// A click that ends a drag must not follow the link under the cursor.
		list.addEventListener(
			'click',
			(event) => {
				if (moved) {
					event.preventDefault();
					moved = false;
				}
			},
			true,
		);
	}
}
