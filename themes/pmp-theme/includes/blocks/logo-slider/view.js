// Showcase adapter: initialize only when WordPress renders a Logo Slider block.
import initLogoSliders from '../../../assets/js/frontend/components/logo-slider';

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initLogoSliders, { once: true });
} else {
	initLogoSliders();
}
