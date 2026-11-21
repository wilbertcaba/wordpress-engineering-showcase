<?php
/**
 * Breadcrumbs block integration.
 *
 * @package PMP
 */

namespace PMP\Theme\Block;

use PMP\Theme\Module;
use PMP\Plugin\Breadcrumbs\Resolver;

use function PMP\Theme\strip_breadcrumb_shortcodes;

/**
 * Feeds the PMP breadcrumb trail into WordPress core's `core/breadcrumbs` block.
 *
 * Core owns the editor UI and the styling supports. This class owns the trail
 * data, sourced from `PMP\Plugin\Breadcrumbs\Resolver`, and restructures core's
 * flat list so the intermediate levels can collapse on small screens.
 */
class BreadcrumbsBlock extends Module {

	/**
	 * The block being integrated.
	 *
	 * @var string
	 */
	const BLOCK_NAME = 'core/breadcrumbs';

	/**
	 * First WordPress version that ships `core/breadcrumbs`.
	 *
	 * @var string
	 */
	const MIN_WP_VERSION = '7.0';

	/**
	 * The `Resolver::TRAIL_SCHEMA_VERSION` this class was written against.
	 *
	 * @var int
	 */
	const SUPPORTED_TRAIL_SCHEMA = 1;

	/**
	 * Inline SVG paths, 24x24 viewBox, from the `@wordpress/icons` package.
	 *
	 * Inlined so the icons cost no request. Dashicons would need the whole
	 * icon font enqueued on the front end for two glyphs.
	 *
	 * @var array<string, string>
	 */
	const ICON_PATHS = [
		'home' => 'M12 4L4 7.9V20h16V7.9L12 4zm6.5 14.5H14V13h-4v5.5H5.5V8.8L12 5.7l6.5 3.1v9.7z',
		'more' => 'M11 13h2v-2h-2v2zm-6 0h2v-2H5v2zm12-2v2h2v-2h-2z',
	];

	/**
	 * Attributes of the breadcrumbs block currently rendering, or null.
	 *
	 * `block_core_breadcrumbs_items` receives only the items array, and core
	 * has already consumed `showHomeItem` and `showCurrentItem` by then. The
	 * attributes are captured on `pre_render_block` so the rebuilt trail can
	 * honour them.
	 *
	 * @var array|null
	 */
	protected $attributes = null;

	/**
	 * {@inheritDoc}
	 */
	public function can_register() {
		return version_compare( get_bloginfo( 'version' ), self::MIN_WP_VERSION, '>=' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		// The kill switch registers regardless, so a theme deploy without the
		// matching plugin never lights up core's native trail on a live site.
		add_filter( 'pre_render_block', [ $this, 'pre_render' ], 10, 2 );
		add_filter( 'render_block_core/template-part', [ $this, 'render_template_part' ], 10, 2 );

		if ( ! $this->has_resolver() ) {
			return;
		}

		add_filter( 'block_core_breadcrumbs_items', [ $this, 'filter_items' ] );
		add_filter( 'block_core_breadcrumbs_post_type_settings', [ $this, 'post_type_settings' ], 10, 2 );
		add_filter( 'render_block_' . self::BLOCK_NAME, [ $this, 'render_block' ] );
	}

	/**
	 * Whether the plugin resolver is present and speaks the expected shape.
	 *
	 * The theme and plugin version independently, so this is the only real
	 * enforcement of the contract between them.
	 *
	 * @return bool
	 */
	protected function has_resolver() {
		return class_exists( Resolver::class )
			&& defined( Resolver::class . '::TRAIL_SCHEMA_VERSION' )
			&& self::SUPPORTED_TRAIL_SCHEMA === Resolver::TRAIL_SCHEMA_VERSION;
	}

	/**
	 * Short-circuit the block when breadcrumbs are off, else capture its attributes.
	 *
	 * @param  string|null $pre_render   The pre-rendered content, or null.
	 * @param  array       $parsed_block The block being rendered.
	 * @return string|null
	 */
	public function pre_render( $pre_render, $parsed_block ) {
		if ( self::BLOCK_NAME !== ( $parsed_block['blockName'] ?? '' ) ) {
			return $pre_render;
		}

		if ( ! $this->has_resolver() || ! Resolver::is_enabled() ) {
			return '';
		}

		$this->attributes = $parsed_block['attrs'] ?? [];

		return $pre_render;
	}

	/**
	 * Replace core's trail with the PMP trail on singular requests and on the
	 * term pages the resolver builds a trail for (the Practice Area topic and
	 * category hubs).
	 *
	 * Other archives, search, 404 and the front page are left to core. Core
	 * also returns before this filter fires when the block has no post
	 * context, so nothing here runs outside a real singular or term render.
	 *
	 * @param  array $items Core's breadcrumb items.
	 * @return array
	 */
	public function filter_items( $items ) {
		if ( null === $this->attributes || is_front_page() ) {
			return $items;
		}

		$queried = get_queried_object();

		if ( $queried instanceof \WP_Term && $this->is_term_page( $queried ) ) {
			return $this->get_term_items( $queried );
		}

		if ( ! is_singular() ) {
			return $items;
		}

		$post = $queried;

		if ( ! $post instanceof \WP_Post ) {
			return $items;
		}

		$attributes = wp_parse_args(
			$this->attributes,
			[
				'showHomeItem'    => true,
				'showCurrentItem' => true,
			]
		);

		$rebuilt = [];

		if ( $attributes['showHomeItem'] ) {
			$home      = Resolver::get_home_crumb();
			$rebuilt[] = [
				'label' => $home['label'],
				'url'   => $home['url'],
			];
		}

		foreach ( Resolver::get_trail() as $crumb ) {
			$rebuilt[] = [
				'label' => strip_breadcrumb_shortcodes( $crumb['label'] ),
				'url'   => $crumb['url'],
			];
		}

		return array_merge( $rebuilt, $this->get_current_items( $post, $attributes['showCurrentItem'] ) );
	}

	/**
	 * Whether the resolver builds a trail for this term's page.
	 *
	 * Plugin releases before 1.6.0 have no term page trail, so their term
	 * pages keep core's own trail.
	 *
	 * @param  \WP_Term $term The term being viewed.
	 * @return bool
	 */
	protected function is_term_page( $term ) {
		if ( ! is_tax() && ! is_category() && ! is_tag() ) {
			return false;
		}

		if ( ! method_exists( Resolver::class, 'get_term_page_taxonomies' ) ) {
			return false;
		}

		return array_key_exists( $term->taxonomy, Resolver::get_term_page_taxonomies() );
	}

	/**
	 * The PMP trail for a term page: Home, the configured parent page, the
	 * ancestor terms, then the term itself.
	 *
	 * @param  \WP_Term $term The term being viewed.
	 * @return array
	 */
	protected function get_term_items( $term ) {
		$attributes = wp_parse_args(
			$this->attributes,
			[
				'showHomeItem'    => true,
				'showCurrentItem' => true,
			]
		);

		$items = [];

		if ( $attributes['showHomeItem'] ) {
			$home    = Resolver::get_home_crumb();
			$items[] = [
				'label' => $home['label'],
				'url'   => $home['url'],
			];
		}

		foreach ( Resolver::get_trail() as $crumb ) {
			$items[] = [
				'label' => strip_breadcrumb_shortcodes( $crumb['label'] ),
				'url'   => $crumb['url'],
			];
		}

		if ( $attributes['showCurrentItem'] ) {
			$items[] = [ 'label' => single_term_title( '', false ) ];
		}

		return $items;
	}

	/**
	 * Rebuild the current-page item(s) exactly as core does.
	 *
	 * Mirrors `render_block_core_breadcrumbs()`: the title is linked and
	 * followed by a page-number item when the post itself is paginated, and
	 * `showCurrentItem` pops whatever is last.
	 *
	 * @param  \WP_Post $post         The post being viewed.
	 * @param  bool     $show_current Value of the block's `showCurrentItem`.
	 * @return array
	 */
	protected function get_current_items( $post, $show_current ) {
		$page_var = (int) get_query_var( 'cpage' ) > 1 ? 'cpage' : 'page';
		$is_paged = (int) get_query_var( $page_var ) > 1;
		$title    = strip_breadcrumb_shortcodes(
			function_exists( 'block_core_breadcrumbs_get_post_title' )
				? block_core_breadcrumbs_get_post_title( $post )
				: get_the_title( $post )
		);

		$items = [];

		if ( $is_paged ) {
			$items[] = [
				'label'      => $title,
				'url'        => get_permalink( $post ),
				'allow_html' => true,
			];

			if ( function_exists( 'block_core_breadcrumbs_create_page_number_item' ) ) {
				$items[] = block_core_breadcrumbs_create_page_number_item( $page_var );
			}
		} else {
			$items[] = [
				'label'      => $title,
				'allow_html' => true,
			];
		}

		if ( ! $show_current ) {
			array_pop( $items );
		}

		return $items;
	}

	/**
	 * Tell core which taxonomy is canonical for flat PMP post types.
	 *
	 * Belt and braces: `filter_items()` replaces the trail anyway, but this
	 * keeps core's own output sane if that filter is ever bypassed. Without
	 * it, core picks the first registered taxonomy for a Lawyer, which may be
	 * a client name rather than a practice area.
	 *
	 * @param  array  $settings  Settings with optional `taxonomy` and `term`.
	 * @param  string $post_type Post type slug.
	 * @return array
	 */
	public function post_type_settings( $settings, $post_type ) {
		$taxonomy = Resolver::get_canonical_taxonomy( $post_type );

		if ( '' !== $taxonomy && taxonomy_exists( $taxonomy ) ) {
			$settings['taxonomy'] = $taxonomy;
		}

		return $settings;
	}

	/**
	 * Drop the breadcrumbs template part entirely when the block rendered nothing.
	 *
	 * `parts/breadcrumbs.html` wraps the block in a group that carries padding
	 * and, optionally, a background. When breadcrumbs are disabled, or core
	 * returns nothing (front page, no post context), that group would otherwise
	 * render as an empty band and still take the root blockGap slot.
	 *
	 * @param  string $block_content Rendered template part HTML.
	 * @param  array  $block         The parsed template-part block.
	 * @return string
	 */
	public function render_template_part( $block_content, $block ) {
		if ( 'breadcrumbs' !== ( $block['attrs']['slug'] ?? '' ) ) {
			return $block_content;
		}

		if ( false === strpos( $block_content, 'wp-block-breadcrumbs' ) ) {
			return '';
		}

		return $block_content;
	}

	/**
	 * Restructure core's flat list for the collapsible mobile layout.
	 *
	 * Core renders `<nav><ol><li>…</li></ol></nav>`. This regroups it as
	 * Home (with an inline house icon), one item holding a disclosure toggle
	 * and a nested list of every intermediate level, and the last item. Every
	 * level stays in the DOM, so the `BreadcrumbList` schema still matches the
	 * page. CSS decides what shows at each breakpoint and
	 * `assets/js/frontend/components/breadcrumbs.js` drives the toggle.
	 *
	 * Also clears the attributes captured in `pre_render()`.
	 *
	 * @param  string $block_content Rendered block HTML.
	 * @return string
	 */
	public function render_block( $block_content ) {
		$this->attributes = null;

		if ( ! preg_match( '#^(<nav\b[^>]*>)<ol>(.*)</ol></nav>$#s', trim( $block_content ), $nav ) ) {
			return $block_content;
		}

		if ( ! preg_match_all( '#<li>(.*?)</li>#s', $nav[2], $matches ) || count( $matches[1] ) < 2 ) {
			return $block_content;
		}

		$items = $matches[1];
		$home  = $this->is_home_link( $items[0] ) ? array_shift( $items ) : null;
		$last  = array_pop( $items );

		$list = '<ol class="wp-block-breadcrumbs__list">';

		if ( null !== $home ) {
			$list .= $this->render_home_item( $home );
		}

		if ( ! empty( $items ) ) {
			$list .= $this->render_levels_item( $items );
		}

		$list .= '<li class="wp-block-breadcrumbs__item wp-block-breadcrumbs__item--current">' . $last . '</li>';
		$list .= '</ol>';

		return $nav[1] . $list . '</nav>';
	}

	/**
	 * Home item: the link core produced, with an inline house icon and the
	 * label wrapped so CSS can hide it on small screens.
	 *
	 * @param  string $item Inner HTML of core's first `<li>`.
	 * @return string
	 */
	protected function render_home_item( $item ) {
		$link = preg_replace(
			'#^<a\b([^>]*)>(.*)</a>$#s',
			'<a$1 class="wp-block-breadcrumbs__home">' . $this->render_icon( 'home' ) . '<span class="wp-block-breadcrumbs__home-label">$2</span></a>',
			$item,
			1
		);

		return '<li class="wp-block-breadcrumbs__item wp-block-breadcrumbs__item--home">' . $link . '</li>';
	}

	/**
	 * Intermediate levels: a disclosure toggle plus a nested list.
	 *
	 * @param  string[] $items Inner HTML of each intermediate `<li>`.
	 * @return string
	 */
	protected function render_levels_item( $items ) {
		$id    = wp_unique_id( 'wp-block-breadcrumbs-levels-' );
		$count = count( $items );
		$label = sprintf(
			/* translators: %d: number of breadcrumb levels hidden behind the toggle. */
			_n( 'Show %d more level', 'Show %d more levels', $count, 'pmp-theme' ),
			$count
		);

		$html  = '<li class="wp-block-breadcrumbs__item wp-block-breadcrumbs__item--levels">';
		$html .= sprintf(
			'<button type="button" class="wp-block-breadcrumbs__toggle reset-button-style" aria-expanded="false" aria-controls="%1$s" aria-label="%2$s">%3$s</button>',
			esc_attr( $id ),
			esc_attr( $label ),
			$this->render_icon( 'more' )
		);
		$html .= sprintf( '<ol id="%s" class="wp-block-breadcrumbs__levels">', esc_attr( $id ) );

		foreach ( $items as $item ) {
			$html .= '<li class="wp-block-breadcrumbs__item">' . $item . '</li>';
		}

		$html .= '</ol></li>';

		return $html;
	}

	/**
	 * Decorative inline SVG icon.
	 *
	 * @param  string $name Key in `ICON_PATHS`.
	 * @return string
	 */
	protected function render_icon( $name ) {
		return sprintf(
			'<svg class="wp-block-breadcrumbs__icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="%s"></path></svg>',
			esc_attr( self::ICON_PATHS[ $name ] )
		);
	}

	/**
	 * Whether a rendered crumb links to the site's front page.
	 *
	 * Compared without scheme, because `home_url()` follows `is_ssl()` while
	 * stored URLs may not.
	 *
	 * @param  string $item Inner HTML of a `<li>`.
	 * @return bool
	 */
	protected function is_home_link( $item ) {
		if ( ! preg_match( '#^<a\b[^>]*\bhref="([^"]*)"#', $item, $match ) ) {
			return false;
		}

		$candidates = [ home_url( '/' ), site_url() ];

		if ( function_exists( 'pll_home_url' ) ) {
			$candidates[] = pll_home_url();
		}

		$normalize = static function ( $url ) {
			return untrailingslashit( preg_replace( '#^https?://#', '', html_entity_decode( $url ) ) );
		};

		return in_array( $normalize( $match[1] ), array_map( $normalize, $candidates ), true );
	}
}
