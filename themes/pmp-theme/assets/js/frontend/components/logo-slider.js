import Splide from '@splidejs/splide';
import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';

export default function initLogoSliders() {
	document.querySelectorAll('.wp-block-pmp-logo-slider').forEach(async (element) => {
		if (element.classList.contains('is-initialized') || element.dataset.logoSliderInitializing)
			return;
		const slides = element.querySelectorAll('.splide__slide');
		if (!slides.length) return;
		const autoWidth = element.classList.contains('has-auto-width');
		const styles = getComputedStyle(element);
		const gap = styles.getPropertyValue('--logo-slider-gap').trim() || '64px';
		const cloneCount = () => {
			const rowWidth = Array.from(slides).reduce(
				(total, slide) => total + slide.getBoundingClientRect().width + parseFloat(gap),
				0,
			);
			const trackWidth = element.querySelector('.splide__track').clientWidth;
			return rowWidth > 0 ? slides.length * (Math.ceil(trackWidth / rowWidth) + 1) : slides.length;
		};
		if (autoWidth) {
			element.dataset.logoSliderInitializing = 'true';
			await Promise.all(
				Array.from(element.querySelectorAll('img')).map((image) => {
					// Native lazy loading otherwise leaves offscreen slide widths unknown.
					image.loading = 'eager';
					// WordPress's sizes=auto containment can otherwise force a
					// 3000px intrinsic width after lazy loading is disabled.
					const sizes = image.getAttribute('sizes');
					if (sizes && /^auto\s*(?:,|$)/i.test(sizes.trim())) {
						const fallback = sizes.trim().replace(/^auto\s*(?:,\s*|$)/i, '');
						if (fallback) image.setAttribute('sizes', fallback);
						else image.removeAttribute('sizes');
					}
					return image.decode().catch(() => {});
				}),
			);
			delete element.dataset.logoSliderInitializing;
			if (!element.isConnected) return;
		}
		const originalStyle = element.getAttribute('style');
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		const slider = new Splide(element, {
			type: 'loop',
			autoWidth,
			fixedWidth: autoWidth
				? undefined
				: styles.getPropertyValue('--logo-slider-width').trim() || '200px',
			clones: autoWidth ? cloneCount() : undefined,
			gap,
			arrows: false,
			pagination: false,
			autoplay: false,
			drag: 'free',
			snap: false,
			live: false,
			autoScroll: {
				speed: Number(element.dataset.scrollSpeed) || 1,
				autoStart: !motion.matches,
				pauseOnHover: true,
				pauseOnFocus: true,
			},
		}).mount({ AutoScroll });

		// Splide removes the root style on refresh, including WordPress block styles.
		slider.on('refresh', () => {
			if (originalStyle !== null) {
				element.setAttribute('style', originalStyle);
				slider.Components.Layout.resize(true);
			}
		});

		if (autoWidth) {
			slider.on('resized', () => {
				const count = cloneCount();
				if (count > slider.options.clones) slider.options = { clones: count };
			});
		}

		if (motion.matches) slider.Components.AutoScroll.pause();

		// Auto Scroll has its own animation loop; explicitly honor motion preferences.
		motion.addEventListener('change', ({ matches }) => {
			if (matches) slider.Components.AutoScroll.pause();
			else slider.Components.AutoScroll.play();
		});
	});
}
