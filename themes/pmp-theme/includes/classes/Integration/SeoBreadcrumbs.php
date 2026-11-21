<?php
/**
 * SEO plugin breadcrumb alignment.
 *
 * @package PMP
 */

namespace PMP\Theme\Integration;

use PMP\Theme\Module;
use PMP\Plugin\Breadcrumbs\Resolver;

use function PMP\Theme\strip_breadcrumb_shortcodes;

/**
 * Aligns the active SEO plugin's breadcrumb trail with the PMP trail.
 *
 * The theme never emits its own `BreadcrumbList` JSON-LD. Yoast and SmartCrawl
 * each already emit one, derived from the same items array they render, so
 * filtering that array once keeps the visible trail and the schema identical.
 * This follows the merge-don't-duplicate precedent in `Block\DetailsBlock`.
 */
class SeoBreadcrumbs extends Module {

	/**
	 * The `Resolver::TRAIL_SCHEMA_VERSION` this class was written against.
	 *
	 * @var int
	 */
	const SUPPORTED_TRAIL_SCHEMA = 1;

	/**
	 * {@inheritDoc}
	 */
	public function can_register() {
		return class_exists( Resolver::class )
			&& defined( Resolver::class . '::TRAIL_SCHEMA_VERSION' )
			&& self::SUPPORTED_TRAIL_SCHEMA === Resolver::TRAIL_SCHEMA_VERSION;
	}

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		// Priority 20 runs after Permalink Manager's own hook at 9.
		add_filter( 'wpseo_breadcrumb_links', [ $this, 'filter_yoast' ], 20 );
		add_filter( 'smartcrawl_breadcrumbs_get_items', [ $this, 'filter_smartcrawl' ] );
		add_action( 'admin_notices', [ $this, 'smartcrawl_submodule_notice' ] );
	}

	/**
	 * Whether the current request is one whose trail we own.
	 *
	 * @return bool
	 */
	protected function should_filter() {
		if ( ! Resolver::is_enabled() || is_front_page() ) {
			return false;
		}

		$queried = get_queried_object();

		if ( $queried instanceof \WP_Term ) {
			return $this->is_term_page( $queried );
		}

		return is_singular() && $queried instanceof \WP_Post;
	}

	/**
	 * Whether a term page gets the PMP trail (the Practice Area topic hubs).
	 *
	 * @param  \WP_Term $term The queried term.
	 * @return bool
	 */
	protected function is_term_page( \WP_Term $term ) {
		return method_exists( Resolver::class, 'get_term_page_taxonomies' )
			&& array_key_exists( $term->taxonomy, Resolver::get_term_page_taxonomies() );
	}

	/**
	 * Rebuild Yoast's crumbs around the PMP trail.
	 *
	 * Yoast's array is `[home?][blog?][archive?][ancestors...][current][page N?]`
	 * with `text`, `url` and, for posts, `id`. The current-page crumb is found
	 * by `id` and everything from it onward is kept, so Yoast's own pagination
	 * handling survives. Everything before it is replaced.
	 *
	 * @param  array $crumbs Yoast breadcrumb crumbs.
	 * @return array
	 */
	public function filter_yoast( $crumbs ) {
		if ( ! is_array( $crumbs ) || ! $this->should_filter() ) {
			return $crumbs;
		}

		$queried       = get_queried_object();
		$queried_id    = get_queried_object_id();
		$current_index = null;

		// Posts carry `id`; term pages carry `term_id`.
		$id_key = $queried instanceof \WP_Term ? 'term_id' : 'id';

		foreach ( $crumbs as $index => $crumb ) {
			if ( isset( $crumb[ $id_key ] ) && (int) $crumb[ $id_key ] === $queried_id ) {
				$current_index = $index;
				break;
			}
		}

		// Unexpected shape. Leave Yoast's trail alone rather than guess.
		if ( null === $current_index ) {
			return $crumbs;
		}

		$rebuilt = [];

		// Yoast only emits a Home crumb when its `breadcrumbs-home` option is
		// set. Respect that choice, but use our label so it matches the block.
		if ( $current_index > 0 && $this->is_home_url( $crumbs[0]['url'] ?? '' ) ) {
			$home      = Resolver::get_home_crumb();
			$rebuilt[] = [
				'text' => $home['label'],
				'url'  => $home['url'],
			];
		}

		foreach ( Resolver::get_trail() as $crumb ) {
			$rebuilt[] = [
				'text' => strip_breadcrumb_shortcodes( $crumb['label'] ),
				'url'  => $crumb['url'],
			];
		}

		$current = array_map(
			static function ( $crumb ) {
				if ( isset( $crumb['text'] ) ) {
					$crumb['text'] = strip_breadcrumb_shortcodes( $crumb['text'] );
				}

				return $crumb;
			},
			array_slice( $crumbs, $current_index )
		);

		return array_merge( $rebuilt, $current );
	}

	/**
	 * Rebuild SmartCrawl's items around the PMP trail.
	 *
	 * SmartCrawl's array is `[home?][...][current?]` with `title` and `link`.
	 * The Home item is present when its `home_trail` option is on and the
	 * current-page item, when present, is the only one without a link.
	 *
	 * @param  array $items SmartCrawl breadcrumb items.
	 * @return array
	 */
	public function filter_smartcrawl( $items ) {
		if ( ! is_array( $items ) || ! $this->should_filter() ) {
			return $items;
		}

		$rebuilt = [];

		if ( ! empty( $items[0]['link'] ) && $this->is_home_url( $items[0]['link'] ) ) {
			$home      = Resolver::get_home_crumb();
			$rebuilt[] = [
				'title' => $home['label'],
				'link'  => $home['url'],
			];
		}

		foreach ( Resolver::get_trail() as $crumb ) {
			$rebuilt[] = [
				'title' => strip_breadcrumb_shortcodes( $crumb['label'] ),
				'link'  => $crumb['url'],
			];
		}

		$last = end( $items );

		if ( is_array( $last ) && empty( $last['link'] ) && ! empty( $last['title'] ) ) {
			$last['title'] = strip_breadcrumb_shortcodes( $last['title'] );
			$rebuilt[]     = $last;
		}

		return $rebuilt;
	}

	/**
	 * Warn when SmartCrawl is active but its breadcrumbs submodule is off.
	 *
	 * SmartCrawl's `BreadcrumbList` fragment bails on `should_run()`, so with
	 * the submodule off no schema is emitted at all and there is nothing for
	 * `filter_smartcrawl()` to align. Yoast has no equivalent gate.
	 *
	 * @return void
	 */
	public function smartcrawl_submodule_notice() {
		if ( ! function_exists( 'smartcrawl_breadcrumbs' ) || ! Resolver::is_enabled() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$advanced = get_option( 'wds-advanced', [] );

		if ( ! empty( $advanced['breadcrumbs']['active'] ) ) {
			return;
		}
		?>
		<div class="notice notice-warning">
			<p>
				<strong><?php esc_html_e( 'PMP Breadcrumbs:', 'pmp-theme' ); ?></strong>
				<?php esc_html_e( 'SmartCrawl\'s Breadcrumbs module is off, so no BreadcrumbList schema is being output. Enable it under SmartCrawl > Advanced Tools > Breadcrumbs. The visible breadcrumb trail is unaffected.', 'pmp-theme' ); ?>
			</p>
		</div>
		<?php
	}

	/**
	 * Whether a URL points at the site's front page.
	 *
	 * Yoast builds its Home crumb from `home_url()`, SmartCrawl from
	 * `site_url()`, and Polylang rewrites both per language.
	 *
	 * @param  string $url URL to test.
	 * @return bool
	 */
	protected function is_home_url( $url ) {
		if ( '' === $url ) {
			return false;
		}

		$candidates = [ home_url( '/' ), site_url() ];

		if ( function_exists( 'pll_home_url' ) ) {
			$candidates[] = pll_home_url();
		}

		$candidates = array_map( 'untrailingslashit', $candidates );

		return in_array( untrailingslashit( $url ), $candidates, true );
	}
}
