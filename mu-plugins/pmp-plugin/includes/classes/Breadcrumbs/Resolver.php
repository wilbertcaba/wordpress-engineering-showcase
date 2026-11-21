<?php
/**
 * Breadcrumb trail resolver.
 *
 * Builds the intermediate crumbs for a singular request from the content
 * hierarchy. The Home crumb and the current-page crumb are left to whatever
 * renders the trail (normally the `core/breadcrumbs` block in the theme).
 *
 * This is deliberately NOT a `Module` subclass: it registers no hooks, so
 * `ModuleInitialization` would instantiate it for nothing. Call it statically.
 *
 * @package PMP
 */

namespace PMP\Plugin\Breadcrumbs;

use PMP\Plugin\Taxonomy\PracticeAreaType;

/**
 * Resolves a breadcrumb trail from the content hierarchy.
 */
class Resolver {

	/**
	 * Shape version of the array returned by `get_trail()`.
	 *
	 * The theme checks this before trusting the output, because the theme and
	 * this plugin version independently and a theme deploy can land first.
	 *
	 * @var int
	 */
	const TRAIL_SCHEMA_VERSION = 1;

	/**
	 * Option that the settings page writes to.
	 *
	 * Read with a bare `get_option()`. `BaseSettingsPage::can_register()` is
	 * gated on `manage_options`, so the settings module is never instantiated
	 * on the front end and `get_module()` would return null there.
	 *
	 * @var string
	 */
	const OPTION_NAME = 'pmp_breadcrumbs_options';

	/**
	 * Memoized trail for the current request, keyed by site and post ID, or
	 * site and `term-{id}` for term pages.
	 *
	 * @var array<int|string, array>
	 */
	protected static $trail_cache = [];

	/**
	 * Memoized shadow term ID to source post ID lookups, scoped to the site.
	 *
	 * `\ShadowTerms\API\get_post_id()` runs a `WP_Query` per call, so walking a
	 * term ancestor chain without this would issue one query per crumb.
	 *
	 * @var array<string, int>
	 */
	protected static $shadow_post_cache = [];

	/**
	 * Whether breadcrumbs are switched on for this site.
	 *
	 * Defaults to false so the feature ships dormant and is enabled per site.
	 *
	 * @return bool
	 */
	public static function is_enabled() {
		return ! empty( self::get_options()['enabled'] );
	}

	/**
	 * Get the saved breadcrumb settings.
	 *
	 * @return array
	 */
	public static function get_options() {
		$options = get_option( self::OPTION_NAME, [] );

		return is_array( $options ) ? $options : [];
	}

	/**
	 * Get the label and URL to use for the Home crumb.
	 *
	 * Core hardcodes `home_url( '/' )`, which is wrong under Polylang when the
	 * visitor is on a translated page.
	 *
	 * @return array{label: string, url: string}
	 */
	public static function get_home_crumb() {
		$options = self::get_options();
		$label   = ! empty( $options['home_label'] ) ? $options['home_label'] : __( 'Home', 'pmp-plugin' );
		$url     = function_exists( 'pll_home_url' ) ? pll_home_url() : home_url( '/' );

		return [
			'label' => $label,
			'url'   => $url,
		];
	}

	/**
	 * Build the intermediate crumbs for the current singular request.
	 *
	 * Returns only what sits between the Home crumb and the current page: the
	 * configured parent page for the post type, then the content hierarchy.
	 * Returns an empty array on anything that is not a singular post, so
	 * archives, search and 404 keep whatever the renderer produced.
	 *
	 * @return array<int, array{label: string, url: string, type: string}>
	 */
	public static function get_trail() {
		$queried = get_queried_object();

		if ( $queried instanceof \WP_Term ) {
			return self::get_term_page_trail( $queried );
		}

		if ( ! $queried instanceof \WP_Post ) {
			return [];
		}

		$post_id   = (int) $queried->ID;
		$cache_key = get_current_blog_id() . ':post-' . $post_id;

		if ( isset( self::$trail_cache[ $cache_key ] ) ) {
			return self::$trail_cache[ $cache_key ];
		}

		$post_type = $queried->post_type;
		$crumbs    = [];

		$crumbs = array_merge( $crumbs, self::get_parent_page_crumbs( $post_type ) );

		$hierarchy = self::get_term_crumbs( $queried );

		// A usable canonical taxonomy takes precedence; otherwise keep the post tree.
		if ( ! $hierarchy && is_post_type_hierarchical( $post_type ) ) {
			$hierarchy = self::get_ancestor_crumbs( $queried );
		}

		$crumbs = array_merge( $crumbs, $hierarchy );

		/**
		 * Filters the intermediate breadcrumb crumbs for a singular request.
		 *
		 * This is the seam for swapping in a different trail strategy. A
		 * URL-mirroring strategy built on Permalink Manager's stored canonical
		 * URI would replace the array here without touching anything else.
		 *
		 * @param array             $crumbs  Crumbs, each with `label`, `url` and `type`.
		 * @param \WP_Post|\WP_Term $queried The post, or the term on a term page.
		 */
		$crumbs = apply_filters( 'pmp_breadcrumbs_trail', $crumbs, $queried );

		self::$trail_cache[ $cache_key ] = $crumbs;

		return $crumbs;
	}

	/**
	 * Taxonomies whose term pages get a trail, mapped to the post type whose
	 * configured parent page leads it.
	 *
	 * Practice Area Types term pages are the topic hubs:
	 * Home > Practice Areas > {Category} > {Topic}, where "Practice Areas" is
	 * the page chosen for Practice Areas under Settings > Breadcrumbs.
	 *
	 * @return array<string, string> Post type keyed by taxonomy.
	 */
	public static function get_term_page_taxonomies() {
		/**
		 * Filters which taxonomies' term pages get a breadcrumb trail, and the
		 * post type whose parent page setting leads the trail.
		 *
		 * @param array<string, string> $taxonomies Post type keyed by taxonomy.
		 */
		return (array) apply_filters(
			'pmp_breadcrumbs_term_page_taxonomies',
			[ 'practice-area-types' => 'pmp_practice_area' ]
		);
	}

	/**
	 * Build the intermediate crumbs for a term page.
	 *
	 * Only taxonomies listed by `get_term_page_taxonomies()` get a trail. The
	 * term itself is left to the renderer as the current crumb; the ancestors
	 * link to their own term pages.
	 *
	 * @param  \WP_Term $term The term being viewed.
	 * @return array<int, array{label: string, url: string, type: string}>
	 */
	protected static function get_term_page_trail( \WP_Term $term ) {
		$taxonomies = self::get_term_page_taxonomies();

		if ( ! isset( $taxonomies[ $term->taxonomy ] ) ) {
			return [];
		}

		$cache_key = get_current_blog_id() . ':term-' . $term->term_id;

		if ( isset( self::$trail_cache[ $cache_key ] ) ) {
			return self::$trail_cache[ $cache_key ];
		}

		$crumbs = self::get_parent_page_crumbs( $taxonomies[ $term->taxonomy ] );

		foreach ( array_reverse( get_ancestors( $term->term_id, $term->taxonomy, 'taxonomy' ) ) as $ancestor_id ) {
			$crumb = self::get_plain_term_crumb( (int) $ancestor_id, $term->taxonomy );

			if ( $crumb ) {
				$crumbs[] = $crumb;
			}
		}

		/** This filter is documented in get_trail(). */
		$crumbs = apply_filters( 'pmp_breadcrumbs_trail', $crumbs, $term );

		self::$trail_cache[ $cache_key ] = $crumbs;

		return $crumbs;
	}

	/**
	 * Get the taxonomy that owns a post type's trail.
	 *
	 * Without this, a Lawyer's trail would depend on taxonomy registration
	 * order, which is a coin flip between a practice area and a client name.
	 *
	 * @param  string $post_type Post type slug.
	 * @return string Taxonomy slug, or an empty string if the post type has none.
	 */
	public static function get_canonical_taxonomy( $post_type ) {
		$map = [
			// Term archives redirect home on sites with hubs off; keep their post tree.
			'pmp_practice_area' => class_exists( PracticeAreaType::class ) && PracticeAreaType::hubs_enabled() ? PracticeAreaType::$name : '',
			'post'              => 'category',
			'pmp_lawyer'        => 'pmp_practice_area_connect',
			'pmp_case_result'   => 'pmp_practice_area_connect',
			'pmp_testimonial'   => 'pmp_practice_area_connect',
		];

		/**
		 * Filters which taxonomy is canonical for a post type's breadcrumb trail.
		 *
		 * An empty string keeps the post hierarchy. A `_connect` taxonomy links
		 * to published source posts, so sites can also opt into shadow terms.
		 *
		 * @param string $taxonomy  Taxonomy slug, or an empty string for none.
		 * @param string $post_type Post type slug.
		 */
		return (string) apply_filters(
			'pmp_breadcrumbs_canonical_taxonomy',
			$map[ $post_type ] ?? '',
			$post_type
		);
	}

	/**
	 * Get the configured parent page crumbs for a post type.
	 *
	 * Every PMP post type is registered with `has_archive => false` (see
	 * `BasePostType::get_default_options()`), so there is no post type archive
	 * to link to and this setting stands in for it. Blog posts fall back to
	 * the Reading Settings posts page.
	 *
	 * The configured page's own ancestors come first, so nesting "Our
	 * Attorneys" under "About Us" yields `About Us / Our Attorneys` and the
	 * trail follows the page tree the way the URL does.
	 *
	 * @param  string $post_type Post type slug.
	 * @return array<int, array{label: string, url: string, type: string}>
	 */
	protected static function get_parent_page_crumbs( $post_type ) {
		$options = self::get_options();
		$page_id = (int) ( $options[ 'parent_' . $post_type ] ?? 0 );

		if ( ! $page_id && 'post' === $post_type ) {
			$page_id = (int) get_option( 'page_for_posts' );
		}

		if ( ! $page_id ) {
			return [];
		}

		$page_id = self::translate_object_id( $page_id, 'page' );
		$page    = get_post( $page_id );

		if ( ! $page || 'publish' !== $page->post_status ) {
			return [];
		}

		$crumbs   = self::get_ancestor_crumbs( $page );
		$crumbs[] = [
			'label' => get_the_title( $page ),
			'url'   => (string) get_permalink( $page ),
			'type'  => 'parent_page',
		];

		return $crumbs;
	}

	/**
	 * Build crumbs from a hierarchical post type's ancestors.
	 *
	 * Used for pages and for `pmp_practice_area`, `pmp_location` and
	 * `pmp_resource`, all registered with `hierarchical => true`.
	 *
	 * @param  \WP_Post $post The post being viewed.
	 * @return array<int, array{label: string, url: string, type: string}>
	 */
	protected static function get_ancestor_crumbs( $post ) {
		$ancestors = get_post_ancestors( $post );

		if ( empty( $ancestors ) ) {
			return [];
		}

		$crumbs = [];

		// `get_post_ancestors()` returns closest first; breadcrumbs read outermost first.
		foreach ( array_reverse( $ancestors ) as $ancestor_id ) {
			$ancestor_id = self::translate_object_id( (int) $ancestor_id, $post->post_type );
			$ancestor    = get_post( $ancestor_id );

			// Skip unpublished ancestors entirely. Emitting an unlinked label
			// would leak a private title into the page and into schema.
			if ( ! $ancestor || 'publish' !== $ancestor->post_status ) {
				continue;
			}

			$crumbs[] = [
				'label' => get_the_title( $ancestor ),
				'url'   => (string) get_permalink( $ancestor ),
				'type'  => 'ancestor',
			];
		}

		return $crumbs;
	}

	/**
	 * Build crumbs from a post type's canonical taxonomy.
	 *
	 * `pmp_lawyer` and `pmp_case_result` have no parent to walk, so the trail
	 * comes from the practice area they are connected to. Shadow terms are
	 * mapped back to their source post, because the Practice Area post is the
	 * page users expect; the shadow taxonomy registers with `rewrite => false`
	 * and its archive is a thin listing. Ordinary terms (blog categories) link
	 * to the term archive.
	 *
	 * @param  \WP_Post $post The post being viewed.
	 * @return array<int, array{label: string, url: string, type: string}>
	 */
	protected static function get_term_crumbs( $post ) {
		$taxonomy = self::get_canonical_taxonomy( $post->post_type );

		if ( '' === $taxonomy || ! taxonomy_exists( $taxonomy ) ) {
			return [];
		}

		// Never link to a shadow archive if its source-post API is unavailable.
		if ( str_ends_with( $taxonomy, '_connect' ) && ! self::is_shadow_taxonomy( $taxonomy ) ) {
			return [];
		}

		$terms = get_the_terms( $post, $taxonomy );

		if ( empty( $terms ) || is_wp_error( $terms ) ) {
			return [];
		}

		// Read stored Yoast primary-term metadata without requiring Yoast to be active.
		$primary_id = (int) get_post_meta( $post->ID, '_yoast_wpseo_primary_' . $taxonomy, true );
		$term       = null;

		foreach ( $terms as $assigned_term ) {
			if ( $primary_id === (int) $assigned_term->term_id ) {
				$term = $assigned_term;
				break;
			}
		}

		$term = $term ?? self::pick_deepest_term( $terms, $taxonomy );

		if ( ! $term ) {
			return [];
		}

		// Outermost first: ancestors reversed, then the term itself.
		$chain     = array_reverse( get_ancestors( $term->term_id, $taxonomy, 'taxonomy' ) );
		$chain[]   = $term->term_id;
		$is_shadow = self::is_shadow_taxonomy( $taxonomy );
		$crumbs    = [];

		foreach ( $chain as $term_id ) {
			// A shadow term for the current post would duplicate the current crumb.
			if ( $is_shadow && self::get_shadow_source_post_id( (int) $term_id ) === (int) $post->ID ) {
				continue;
			}

			$crumb = $is_shadow
				? self::get_shadow_term_crumb( (int) $term_id )
				: self::get_plain_term_crumb( (int) $term_id, $taxonomy );

			if ( $crumb ) {
				$crumbs[] = $crumb;
			}
		}

		return $crumbs;
	}

	/**
	 * Build a crumb for a shadow term by linking to its source post.
	 *
	 * @param  int $term_id Shadow term ID.
	 * @return array{label: string, url: string, type: string}|null
	 */
	protected static function get_shadow_term_crumb( $term_id ) {
		$source_post_id = self::get_shadow_source_post_id( $term_id );

		if ( ! $source_post_id ) {
			return null;
		}

		$source_post = get_post( $source_post_id );

		if ( ! $source_post || 'publish' !== $source_post->post_status ) {
			return null;
		}

		return [
			'label' => get_the_title( $source_post ),
			'url'   => (string) get_permalink( $source_post ),
			'type'  => 'shadow_term',
		];
	}

	/**
	 * Build a crumb for an ordinary term by linking to its archive.
	 *
	 * @param  int    $term_id  Term ID.
	 * @param  string $taxonomy Taxonomy slug.
	 * @return array{label: string, url: string, type: string}|null
	 */
	protected static function get_plain_term_crumb( $term_id, $taxonomy ) {
		$term_id = self::translate_object_id( $term_id, $taxonomy );
		$term    = get_term( $term_id, $taxonomy );

		if ( ! $term || is_wp_error( $term ) ) {
			return null;
		}

		$url = get_term_link( $term );

		if ( is_wp_error( $url ) ) {
			return null;
		}

		return [
			'label' => $term->name,
			'url'   => (string) $url,
			'type'  => 'term',
		];
	}

	/**
	 * Whether a taxonomy is a shadow-terms taxonomy with a resolvable source post.
	 *
	 * @param  string $taxonomy Taxonomy slug.
	 * @return bool
	 */
	protected static function is_shadow_taxonomy( $taxonomy ) {
		return str_ends_with( $taxonomy, '_connect' )
			&& function_exists( '\ShadowTerms\API\get_post_id' );
	}

	/**
	 * Pick the most specific term when a post is in several.
	 *
	 * Deepest wins, so a post in both "Personal Injury" and its child
	 * "Car Accidents" gets the longer, more useful trail. Ties break on the
	 * lowest term ID so the result is stable across requests and safe to cache.
	 *
	 * @param  \WP_Term[] $terms    Terms assigned to the post.
	 * @param  string     $taxonomy Taxonomy slug.
	 * @return \WP_Term|null
	 */
	protected static function pick_deepest_term( $terms, $taxonomy ) {
		$best  = null;
		$depth = -1;

		foreach ( $terms as $term ) {
			$term_depth = count( get_ancestors( $term->term_id, $taxonomy, 'taxonomy' ) );

			if ( $term_depth > $depth || ( $term_depth === $depth && $best && $term->term_id < $best->term_id ) ) {
				$best  = $term;
				$depth = $term_depth;
			}
		}

		return $best;
	}

	/**
	 * Map a shadow term to its source post, memoized for the request.
	 *
	 * @param  int $term_id Shadow term ID.
	 * @return int Post ID, or 0 if there is no source post.
	 */
	protected static function get_shadow_source_post_id( $term_id ) {
		$cache_key = get_current_blog_id() . ':' . $term_id;

		if ( isset( self::$shadow_post_cache[ $cache_key ] ) ) {
			return self::$shadow_post_cache[ $cache_key ];
		}

		$post_id = \ShadowTerms\API\get_post_id( $term_id );

		if ( $post_id ) {
			$post_type = get_post_type( $post_id );
			$post_id   = self::translate_object_id( $post_id, $post_type ? $post_type : 'post' );
		}

		self::$shadow_post_cache[ $cache_key ] = (int) $post_id;

		return (int) $post_id;
	}

	/**
	 * Resolve a post or term ID to its translation in the current language.
	 *
	 * Polylang Pro implements `wpml_object_id`. Without this, ancestors on a
	 * translated page leak through in the source language.
	 *
	 * @param  int    $object_id Post or term ID.
	 * @param  string $type      Post type or taxonomy slug.
	 * @return int
	 */
	protected static function translate_object_id( $object_id, $type ) {
		if ( ! has_filter( 'wpml_object_id' ) ) {
			return $object_id;
		}

		$translated = apply_filters( 'wpml_object_id', $object_id, $type, true );

		return $translated ? (int) $translated : $object_id;
	}
}
