import Breadcrumbs from './frontend/components/breadcrumbs';
const init = () => new Breadcrumbs().init();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
