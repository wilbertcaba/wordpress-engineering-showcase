<?php
/**
 * TocBlock class.
 *
 * @package PMP
 */

namespace PMP\Theme\Block;

use PMP\Theme\Module;
use WP_HTML_Tag_Processor;

/**
 * Server-side helpers and hooks for the pmp/toc-block block.
 *
 * - Keeps heading ids in the server HTML so table-of-contents links (and
 *   Google jump links) resolve without JavaScript, for heading blocks and
 *   for plain headings in classic content alike.
 * - Shares one slug and dedupe algorithm between the heading id filter and
 *   the block's markup so hrefs always match ids.
 * - Optionally inserts a mobile instance into posts that have none.
 */
class TocBlock extends Module {

	/**
	 * Block name.
	 */
	const BLOCK_NAME = 'pmp/toc-block';

	/**
	 * Wrapper ids used by the block. Headings may never receive these.
	 */
	const RESERVED_IDS = [ 'table-of-contents', 'table-of-contents-mobile' ];

	/**
	 * Allowed title tags.
	 */
	const TITLE_TAGS = [ 'h2', 'h3', 'h4', 'h5', 'h6', 'p' ];

	/**
	 * Allowed placements.
	 */
	const PLACEMENTS = [ 'desktop', 'mobile', 'always' ];

	/**
	 * Matches one heading element in rendered HTML. Headings never nest, so a
	 * lazy match up to the matching close tag is reliable.
	 */
	const HEADING_REGEX = '/<h([1-6])(\s[^>]*)?>(.*?)<\/h\1\s*>/is';

	/**
	 * Blocks whose inner HTML is scanned for raw headings (classic content,
	 * the Classic block, and the Custom HTML block).
	 */
	const RAW_HTML_BLOCKS = [ null, '', 'core/freeform', 'core/html' ];

	/**
	 * Attributes for a mobile instance that maybe_insert_mobile_toc() could not
	 * place in block markup (no heading blocks); inserted into the rendered
	 * output by insert_mobile_toc_html() instead.
	 *
	 * @var array|null
	 */
	protected $pending_html_insert = null;

	/**
	 * Site option holding the shared List Items values.
	 */
	const DEFAULTS_OPTION = 'pmp_toc_item_defaults';

	/**
	 * List Items attributes that may be shared site-wide.
	 */
	const ITEM_STYLE_KEYS = [
		'itemBackground',
		'activeBackground',
		'activeColor',
		'activeBorderColor',
		'itemGap',
		'itemPadding',
		'itemBorder',
		'itemRadius',
	];

	/**
	 * Whether a scroll offset override has been printed for this request.
	 *
	 * @var bool
	 */
	protected static $printed_scroll_offset = false;

	/**
	 * {@inheritDoc}
	 */
	public function can_register() {
		return true;
	}

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		add_filter( 'block_editor_settings_all', [ $this, 'enable_anchor_generation' ] );
		add_filter( 'the_content', [ $this, 'maybe_insert_mobile_toc' ], 7 );
		add_filter( 'the_content', [ $this, 'insert_mobile_toc_html' ], 11 );
		add_filter( 'the_content', [ $this, 'add_heading_ids' ], 12 );
		add_action( 'init', [ $this, 'register_defaults_option' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'expose_defaults_to_editor' ], 100 );
	}

	/**
	 * Register the shared List Items option so the editor can read and save it
	 * through the site settings endpoint.
	 *
	 * @return void
	 */
	public function register_defaults_option() {
		$length = [ 'type' => 'string' ];
		$sides  = [
			'type'                 => 'object',
			'additionalProperties' => $length,
		];

		register_setting(
			'general',
			self::DEFAULTS_OPTION,
			[
				'type'              => 'object',
				'default'           => [],
				'sanitize_callback' => [ $this, 'sanitize_item_defaults' ],
				'show_in_rest'      => [
					'schema' => [
						'type'                 => 'object',
						'properties'           => [
							'itemBackground'    => $length,
							'activeBackground'  => $length,
							'activeColor'       => $length,
							'activeBorderColor' => $length,
							'itemGap'           => $length,
							'itemPadding'       => $sides,
							'itemBorder'        => [
								'type'                 => 'object',
								'additionalProperties' => true,
							],
							'itemRadius'        => [
								'type'                 => [ 'string', 'object' ],
								'additionalProperties' => $length,
							],
						],
						'additionalProperties' => false,
					],
				],
			]
		);
	}

	/**
	 * Keep only known keys and scalar leaves in the shared option.
	 *
	 * @param mixed $value Submitted value.
	 * @return array
	 */
	public function sanitize_item_defaults( $value ) {
		if ( ! is_array( $value ) ) {
			return [];
		}

		$clean = [];

		foreach ( self::ITEM_STYLE_KEYS as $key ) {
			if ( ! isset( $value[ $key ] ) ) {
				continue;
			}

			$item = self::sanitize_leaves( $value[ $key ], 2 );

			if ( '' !== $item && [] !== $item ) {
				$clean[ $key ] = $item;
			}
		}

		return $clean;
	}

	/**
	 * Recursively sanitize string leaves of a small nested array.
	 *
	 * @param mixed $value Value.
	 * @param int   $depth Remaining nesting allowed.
	 * @return array|string
	 */
	protected static function sanitize_leaves( $value, $depth ) {
		if ( is_array( $value ) ) {
			if ( $depth <= 0 ) {
				return [];
			}

			$out = [];

			foreach ( $value as $key => $leaf ) {
				$leaf = self::sanitize_leaves( $leaf, $depth - 1 );

				if ( '' !== $leaf && [] !== $leaf ) {
					$out[ preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $key ) ] = $leaf; // Keys like topLeft must keep their case.
				}
			}

			return $out;
		}

		return is_scalar( $value ) ? sanitize_text_field( (string) $value ) : '';
	}

	/**
	 * Shared List Items values.
	 *
	 * @return array
	 */
	public static function item_defaults() {
		$defaults = get_option( self::DEFAULTS_OPTION, [] );

		return is_array( $defaults ) ? $defaults : [];
	}

	/**
	 * Instance attributes layered over the shared defaults.
	 *
	 * @param array $attributes Block attributes.
	 * @return array
	 */
	public static function with_item_defaults( array $attributes ) {
		foreach ( self::item_defaults() as $key => $value ) {
			if ( in_array( $key, self::ITEM_STYLE_KEYS, true ) && self::is_empty_value( $attributes[ $key ] ?? null ) ) {
				$attributes[ $key ] = $value;
			}
		}

		return $attributes;
	}

	/**
	 * Whether an attribute value counts as unset.
	 *
	 * @param mixed $value Attribute value.
	 * @return bool
	 */
	protected static function is_empty_value( $value ) {
		if ( is_array( $value ) ) {
			foreach ( $value as $leaf ) {
				if ( ! self::is_empty_value( $leaf ) ) {
					return false;
				}
			}

			return true;
		}

		return null === $value || '' === $value;
	}

	/**
	 * Print the shared defaults for editors who cannot read site settings over
	 * REST; admins read the live site entity instead.
	 *
	 * @return void
	 */
	public function expose_defaults_to_editor() {
		wp_add_inline_script(
			generate_block_asset_handle( self::BLOCK_NAME, 'editorScript' ),
			'window.pmpTocItemDefaults = ' . wp_json_encode( self::item_defaults() ) . ';',
			'before'
		);
	}

	/**
	 * Make the core heading block persist an `anchor` attribute for every
	 * heading it edits. Core only does this on its own when its own
	 * table-of-contents block is present.
	 *
	 * @param array $settings Editor settings.
	 * @return array
	 */
	public function enable_anchor_generation( $settings ) {
		// The showcase uses a batched editor pass to avoid duplicate IDs in WP 6.8.
		$settings['generateAnchors'] = false;

		return $settings;
	}

	/**
	 * Give every heading in post content an id so anchor links resolve in the
	 * server HTML. Runs after blocks (9), wpautop (10) and shortcodes (11), so
	 * it covers heading blocks, classic content and shortcode output alike.
	 * Existing ids (manual anchors, or ones serialized by the editor) are kept
	 * and registered so generated ones never collide. Headings are visited in
	 * document order with the same slug and dedupe rules collect_headings()
	 * uses, so hrefs and ids always agree.
	 *
	 * @param string $content Rendered post content.
	 * @return string
	 */
	public function add_heading_ids( $content ) {
		if ( ! is_string( $content ) || false === stripos( $content, '<h' ) ) {
			return $content;
		}

		$used = self::reserved_ids();

		$result = preg_replace_callback(
			self::HEADING_REGEX,
			static function ( $match ) use ( &$used ) {
				$opener = new WP_HTML_Tag_Processor( '<h' . $match[1] . ( $match[2] ?? '' ) . '>' );

				// The block's own title is not part of the article outline.
				if ( ! $opener->next_tag() || $opener->has_class( 'toc-block__title' ) ) {
					return $match[0];
				}

				$existing = (string) $opener->get_attribute( 'id' );

				if ( '' !== $existing ) {
					$used[ $existing ] = true;

					return $match[0];
				}

				$slug = self::slugify( self::html_text( $match[3] ) );

				if ( '' === $slug ) {
					return $match[0];
				}

				$opener->set_attribute( 'id', self::unique_anchor( $slug, $used ) );

				return $opener->get_updated_html() . $match[3] . '</h' . $match[1] . '>';
			},
			$content
		);

		return null === $result ? $content : $result;
	}

	/**
	 * Insert a mobile table of contents before the first heading of a
	 * singular post that has no table of contents of its own.
	 *
	 * Off by default. Enable with the "Table of Contents" checkbox under
	 * Settings > General or the `pmp_theme_toc_auto_insert` filter.
	 *
	 * Block content with heading blocks gets the block comment inserted before
	 * the first one, so do_blocks() renders it. Classic content (no blocks, or
	 * a Classic block) has no block boundary before its headings; for those the
	 * insertion is deferred to insert_mobile_toc_html() on the rendered output.
	 *
	 * @param string $content Post content (raw block markup, before do_blocks()).
	 * @return string
	 */
	public function maybe_insert_mobile_toc( $content ) {
		$this->pending_html_insert = null;

		if ( ! is_singular() || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		/**
		 * Filters whether a mobile table of contents is inserted automatically.
		 *
		 * @param bool $enabled Defaults to the `pmp_toc_auto_insert` option.
		 */
		$enabled = apply_filters( 'pmp_theme_toc_auto_insert', (bool) get_option( 'pmp_toc_auto_insert', false ) );

		if ( ! $enabled || str_contains( $content, '<!-- wp:' . self::BLOCK_NAME ) ) {
			return $content;
		}

		/**
		 * Filters the attributes of the automatically inserted table of contents.
		 *
		 * @param array $attributes Block attributes.
		 */
		$attributes = apply_filters( 'pmp_theme_toc_auto_insert_attrs', [ 'placement' => 'mobile' ] );

		if ( has_blocks( $content ) && preg_match( '/<!-- wp:heading[\s{\/]/', $content, $match, PREG_OFFSET_CAPTURE ) ) {
			$block    = '<!-- wp:' . self::BLOCK_NAME . ' ' . wp_json_encode( $attributes ) . ' /-->' . "\n\n";
			$position = $match[0][1];

			return substr( $content, 0, $position ) . $block . substr( $content, $position );
		}

		if ( preg_match( '/<h[1-6][\s>]/i', $content ) ) {
			$this->pending_html_insert = $attributes;
		}

		return $content;
	}

	/**
	 * Second half of auto-insert for classic content: render the block and
	 * place it before the first heading of the rendered output. Runs after
	 * blocks, wpautop and shortcodes, before add_heading_ids().
	 *
	 * @param string $content Rendered post content.
	 * @return string
	 */
	public function insert_mobile_toc_html( $content ) {
		$attributes                = $this->pending_html_insert;
		$this->pending_html_insert = null;

		if ( null === $attributes || ! is_string( $content ) ) {
			return $content;
		}

		if ( ! preg_match( '/<h[1-6][\s>]/i', $content, $match, PREG_OFFSET_CAPTURE ) ) {
			return $content;
		}

		$toc = render_block(
			[
				'blockName'    => self::BLOCK_NAME,
				'attrs'        => (array) $attributes,
				'innerBlocks'  => [],
				'innerHTML'    => '',
				'innerContent' => [],
			]
		);

		if ( '' === trim( $toc ) ) {
			return $content;
		}

		$position = $match[0][1];

		return substr( $content, 0, $position ) . $toc . "\n" . substr( $content, $position );
	}

	/**
	 * Ids the dedupe map starts with.
	 *
	 * @return array<string, true>
	 */
	public static function reserved_ids() {
		return array_fill_keys( self::RESERVED_IDS, true );
	}

	/**
	 * Heading levels enabled on a block instance.
	 *
	 * @param array $attributes Block attributes.
	 * @return int[]
	 */
	public static function included_levels( array $attributes ) {
		$levels = [];

		for ( $level = 2; $level <= 6; $level++ ) {
			if ( ! empty( $attributes[ "includeH{$level}" ] ) ) {
				$levels[] = $level;
			}
		}

		return $levels;
	}

	/**
	 * Validate the title tag attribute.
	 *
	 * @param mixed $tag Attribute value.
	 * @return string
	 */
	public static function title_tag( $tag ) {
		return in_array( $tag, self::TITLE_TAGS, true ) ? $tag : 'h2';
	}

	/**
	 * Validate the placement attribute.
	 *
	 * @param mixed $placement Attribute value.
	 * @return string
	 */
	public static function placement( $placement ) {
		return in_array( $placement, self::PLACEMENTS, true ) ? $placement : 'always';
	}

	/**
	 * Slug generator identical to the core heading block's anchor generator
	 * and to getSlug() in slug.js.
	 *
	 * @param string $text Plain text.
	 * @return string
	 */
	public static function slugify( $text ) {
		$text = remove_accents( (string) $text );
		$text = preg_replace( '/[^\p{L}\p{N}]+/u', '-', $text );
		$text = mb_strtolower( (string) $text, 'UTF-8' );

		return trim( $text, '-' );
	}

	/**
	 * Plain text of an HTML fragment: tags stripped, entities decoded,
	 * whitespace collapsed.
	 *
	 * @param string $html HTML fragment.
	 * @return string
	 */
	public static function html_text( $html ) {
		$text = html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$text = preg_replace( '/\s+/u', ' ', $text );

		return trim( (string) $text );
	}

	/**
	 * Plain text of a parsed heading block.
	 *
	 * @param array $block Parsed block.
	 * @return string
	 */
	public static function heading_text( array $block ) {
		$html = '';

		if ( ! empty( $block['attrs']['content'] ) ) {
			$html = (string) $block['attrs']['content'];
		} elseif ( ! empty( $block['innerHTML'] ) && preg_match( self::HEADING_REGEX, $block['innerHTML'], $match ) ) {
			$html = $match[3];
		}

		return self::html_text( $html );
	}

	/**
	 * Anchor for a parsed heading block: the serialized `anchor` attribute,
	 * then an id already present in its HTML, then a deduped generated slug.
	 *
	 * @param array $block Parsed block.
	 * @param array $used  Anchors already taken, updated in place.
	 * @return string Empty when no usable anchor exists.
	 */
	public static function resolve_anchor( array $block, array &$used ) {
		$anchor = isset( $block['attrs']['anchor'] ) ? (string) $block['attrs']['anchor'] : '';

		if ( '' === $anchor && ! empty( $block['innerHTML'] ) ) {
			$processor = new WP_HTML_Tag_Processor( $block['innerHTML'] );

			if ( $processor->next_tag() ) {
				$anchor = (string) $processor->get_attribute( 'id' );
			}
		}

		if ( '' !== $anchor ) {
			$used[ $anchor ] = true;

			return $anchor;
		}

		$slug = self::slugify( self::heading_text( $block ) );

		return '' === $slug ? '' : self::unique_anchor( $slug, $used );
	}

	/**
	 * First free variant of a slug (slug, slug-1, slug-2, ...), marked as taken.
	 *
	 * @param string $slug Base slug.
	 * @param array  $used Anchors already taken, updated in place.
	 * @return string
	 */
	public static function unique_anchor( $slug, array &$used ) {
		$candidate = $slug;
		$suffix    = 0;

		while ( isset( $used[ $candidate ] ) ) {
			$suffix++;
			$candidate = "{$slug}-{$suffix}";
		}

		$used[ $candidate ] = true;

		return $candidate;
	}

	/**
	 * Headings found in a raw HTML fragment (classic content, Classic block,
	 * Custom HTML block), in document order.
	 *
	 * @param string $html HTML fragment.
	 * @param array  $used Anchors already taken, updated in place.
	 * @return array<int, array{text: string, level: int, anchor: string}>
	 */
	public static function collect_html_headings( $html, array &$used ) {
		$headings = [];

		if ( ! is_string( $html ) || false === stripos( $html, '<h' ) ) {
			return $headings;
		}

		if ( ! preg_match_all( self::HEADING_REGEX, $html, $matches, PREG_SET_ORDER ) ) {
			return $headings;
		}

		foreach ( $matches as $match ) {
			$text = self::html_text( $match[3] );

			if ( '' === $text ) {
				continue;
			}

			$anchor = '';
			$opener = new WP_HTML_Tag_Processor( '<h' . $match[1] . ( $match[2] ?? '' ) . '>' );

			if ( $opener->next_tag() ) {
				$anchor = (string) $opener->get_attribute( 'id' );
			}

			if ( '' !== $anchor ) {
				$used[ $anchor ] = true;
			} else {
				$slug   = self::slugify( $text );
				$anchor = '' === $slug ? '' : self::unique_anchor( $slug, $used );
			}

			if ( '' === $anchor ) {
				continue;
			}

			$headings[] = [
				'text'   => $text,
				'level'  => (int) $match[1],
				'anchor' => $anchor,
			];
		}

		return $headings;
	}

	/**
	 * All headings in parsed block content, in document order, every level:
	 * heading blocks plus plain headings inside classic content, Classic blocks
	 * and Custom HTML blocks. Callers filter by level afterwards so dedupe
	 * suffixes match the ones add_heading_ids() produces at render time.
	 *
	 * @param array $blocks Parsed blocks.
	 * @param array $used   Anchors already taken, updated in place.
	 * @return array<int, array{text: string, level: int, anchor: string}>
	 */
	public static function collect_headings( array $blocks, array &$used ) {
		$headings = [];

		foreach ( $blocks as $block ) {
			$name = $block['blockName'] ?? null;

			if ( in_array( $name, self::RAW_HTML_BLOCKS, true ) ) {
				// Classic content parses as a single nameless block; the Classic and
				// Custom HTML blocks carry raw markup. Scan them for plain headings.
				$headings = array_merge( $headings, self::collect_html_headings( (string) ( $block['innerHTML'] ?? '' ), $used ) );
				continue;
			}

			if ( 'core/heading' === $name ) {
				$text = self::heading_text( $block );

				if ( '' !== $text ) {
					$anchor = self::resolve_anchor( $block, $used );

					if ( '' !== $anchor ) {
						$headings[] = [
							'text'   => $text,
							'level'  => (int) ( $block['attrs']['level'] ?? 2 ),
							'anchor' => $anchor,
						];
					}
				}
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$headings = array_merge( $headings, self::collect_headings( $block['innerBlocks'], $used ) );
			}
		}

		return $headings;
	}

	/**
	 * Depth of each heading for nesting. Skipped levels nest one step only and
	 * a leading H3 becomes a root. Mirrors buildTree() in utils.js.
	 *
	 * @param array $headings Ordered headings.
	 * @return int[]
	 */
	public static function assign_depths( array $headings ) {
		$depths = [];
		$stack  = [];

		foreach ( $headings as $heading ) {
			while ( ! empty( $stack ) && end( $stack ) >= $heading['level'] ) {
				array_pop( $stack );
			}

			$depths[] = count( $stack );
			$stack[]  = $heading['level'];
		}

		return $depths;
	}

	/**
	 * Nested list markup for the headings.
	 *
	 * @param array $headings Ordered headings.
	 * @return string Escaped HTML.
	 */
	public static function render_list( array $headings ) {
		if ( empty( $headings ) ) {
			return '';
		}

		$depths = self::assign_depths( $headings );
		$html   = '';
		$prev   = -1;

		foreach ( $headings as $index => $heading ) {
			$depth = $depths[ $index ];

			if ( $depth > $prev ) {
				$html .= '<ul class="toc-block__list">';
			} elseif ( $depth === $prev ) {
				$html .= '</li>';
			} else {
				$html .= '</li>' . str_repeat( '</ul></li>', $prev - $depth );
			}

			$html .= sprintf(
				'<li class="toc-block__item toc-block__item--level-%1$d"><a class="toc-block__link" href="#%2$s">%3$s</a>',
				(int) $heading['level'],
				esc_attr( $heading['anchor'] ),
				esc_html( $heading['text'] )
			);

			$prev = $depth;
		}

		return $html . '</li>' . str_repeat( '</ul></li>', $prev ) . '</ul>';
	}

	/**
	 * Accept a spacing preset token or a plain CSS length.
	 *
	 * @param mixed $value Raw value.
	 * @return string CSS value or empty string.
	 */
	public static function length_css_value( $value ) {
		if ( ! is_string( $value ) || '' === $value ) {
			return '';
		}

		if ( preg_match( '/^var:preset\|spacing\|([a-z0-9-]+)$/i', $value, $match ) ) {
			return 'var(--wp--preset--spacing--' . strtolower( $match[1] ) . ')';
		}

		if ( preg_match( '/^-?(\d+|\d*\.\d+)(px|em|rem|%|vh|vw|ch)?$/', $value ) ) {
			return $value;
		}

		return '';
	}

	/**
	 * Item spacing as a CSS value. Reads the `itemGap` attribute, or the
	 * legacy `style.spacing.blockGap` value of instances saved before it.
	 *
	 * @param mixed $raw Attribute value (string, or blockGap sides array).
	 * @return string
	 */
	public static function gap_css_value( $raw ) {
		if ( is_array( $raw ) ) {
			$raw = $raw['top'] ?? null;
		}

		return self::length_css_value( $raw );
	}

	/**
	 * BoxControl value as a CSS shorthand.
	 *
	 * @param mixed $box Sides array.
	 * @return string Shorthand or empty string.
	 */
	public static function box_css_value( $box ) {
		if ( ! is_array( $box ) ) {
			return '';
		}

		$sides = [];
		$has   = false;

		foreach ( [ 'top', 'right', 'bottom', 'left' ] as $side ) {
			$value   = self::length_css_value( $box[ $side ] ?? null );
			$has     = $has || '' !== $value;
			$sides[] = '' === $value ? '0' : $value;
		}

		return $has ? implode( ' ', $sides ) : '';
	}

	/**
	 * BorderRadiusControl value (single length or per-corner array) as a CSS shorthand.
	 *
	 * @param mixed $radius Raw attribute value.
	 * @return string Shorthand or empty string.
	 */
	public static function radius_css_value( $radius ) {
		if ( is_string( $radius ) ) {
			return self::length_css_value( trim( $radius ) );
		}

		if ( ! is_array( $radius ) ) {
			return '';
		}

		$corners = [];
		$has     = false;

		foreach ( [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] as $corner ) {
			$value     = self::length_css_value( $radius[ $corner ] ?? null );
			$has       = $has || '' !== $value;
			$corners[] = '' === $value ? '0' : $value;
		}

		return $has ? implode( ' ', $corners ) : '';
	}

	/**
	 * List item border custom properties from the `itemBorder` control (flat or
	 * per side): one shorthand per side, plus an active variant per side when an
	 * active border color is set. Mirrors borderToProps() in utils.js.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string, string>
	 */
	public static function border_css_properties( array $attributes ) {
		$border = $attributes['itemBorder'] ?? null;

		if ( ! is_array( $border ) || empty( $border ) ) {
			return [];
		}

		$sides  = [ 'top', 'right', 'bottom', 'left' ];
		$split  = ! empty( array_intersect( $sides, array_keys( $border ) ) );
		$active = self::color_css_value( $attributes['activeBorderColor'] ?? '' );
		$props  = [];

		foreach ( $sides as $side ) {
			$value     = $split ? ( $border[ $side ] ?? null ) : $border;
			$shorthand = self::border_side_shorthand( $value );

			if ( '' === $shorthand ) {
				continue;
			}

			$props[ "--toc-item-border-{$side}" ] = $shorthand;

			if ( '' !== $active ) {
				$props[ "--toc-item-border-{$side}-active" ] = self::border_side_shorthand( $value, $active );
			}
		}

		return $props;
	}

	/**
	 * One border side as a validated shorthand.
	 *
	 * @param mixed  $side  `[ 'width' => ..., 'style' => ..., 'color' => ... ]`.
	 * @param string $color Color override, optional.
	 * @return string Shorthand or empty string when the side has no width.
	 */
	public static function border_side_shorthand( $side, $color = '' ) {
		$width = is_array( $side ) ? self::length_css_value( $side['width'] ?? null ) : '';

		if ( '' === $width ) {
			return '';
		}

		$style = $side['style'] ?? '';
		$style = in_array( $style, [ 'solid', 'dashed', 'dotted' ], true ) ? $style : 'solid';

		if ( '' === $color ) {
			$color = self::color_css_value( $side['color'] ?? '' );
		}

		return trim( "{$width} {$style} " . ( '' !== $color ? $color : 'currentColor' ) );
	}

	/**
	 * Sticky top offset, only for sticky desktop instances.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public static function sticky_top_css_value( array $attributes ) {
		if ( empty( $attributes['stickyDesktop'] ) || 'mobile' === self::placement( $attributes['placement'] ?? 'always' ) ) {
			return '';
		}

		return self::length_css_value( is_string( $attributes['stickyTop'] ?? null ) ? trim( $attributes['stickyTop'] ) : '' );
	}

	/**
	 * Accept any color the CSS sanitizer accepts.
	 *
	 * @param mixed $value Raw color.
	 * @return string
	 */
	public static function color_css_value( $value ) {
		if ( ! is_string( $value ) || '' === $value ) {
			return '';
		}

		$value = trim( $value );

		// A color must be one value, never additional declarations.
		if ( preg_match( '/[;{}<>]/', $value ) ) {
			return '';
		}

		// The CSS sanitizer rejects functional notation, so rgb()/rgba() are folded into hex.
		if ( preg_match( '/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+)\s*)?\)$/i', $value, $match ) ) {
			$value = sprintf( '#%02x%02x%02x', min( 255, (int) $match[1] ), min( 255, (int) $match[2] ), min( 255, (int) $match[3] ) );

			if ( isset( $match[4] ) && '' !== $match[4] && (float) $match[4] < 1 ) {
				$value .= sprintf( '%02x', (int) round( (float) $match[4] * 255 ) );
			}
		}

		return '' !== safecss_filter_attr( 'color:' . $value ) ? $value : '';
	}

	/**
	 * Custom properties for the wrapper, mirrored by edit.js.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Declarations ending with a semicolon, or empty string.
	 */
	public static function custom_properties( array $attributes ) {
		$attributes = self::with_item_defaults( $attributes );
		$properties = [
			'--toc-item-gap'     => self::gap_css_value( ! empty( $attributes['itemGap'] ) ? $attributes['itemGap'] : ( $attributes['style']['spacing']['blockGap'] ?? null ) ),
			'--toc-item-padding' => self::box_css_value( $attributes['itemPadding'] ?? null ),
			'--toc-item-radius'  => self::radius_css_value( $attributes['itemRadius'] ?? '' ),
			'--toc-item-bg'      => self::color_css_value( $attributes['itemBackground'] ?? '' ),
			'--toc-active-bg'    => self::color_css_value( $attributes['activeBackground'] ?? '' ),
			'--toc-active-color' => self::color_css_value( $attributes['activeColor'] ?? '' ),
			'--toc-sticky-top'   => self::sticky_top_css_value( $attributes ),
		];

		$properties = array_merge( $properties, self::border_css_properties( $attributes ) );

		$css = '';

		foreach ( $properties as $name => $value ) {
			if ( '' !== $value ) {
				$css .= "{$name}:{$value};";
			}
		}

		return $css;
	}

	/**
	 * Print a scroll-margin-top override for headings and the block itself
	 * when an instance sets a custom scroll offset. The default offset lives
	 * in the theme CSS. Printed once per request; the first instance wins.
	 *
	 * @param mixed $offset `scrollOffset` attribute value.
	 * @return void
	 */
	public static function print_scroll_offset_style( $offset ) {
		$value = self::length_css_value( is_string( $offset ) ? trim( $offset ) : '' );

		if ( '' === $value || self::$printed_scroll_offset ) {
			return;
		}

		self::$printed_scroll_offset = true;

		$css = sprintf( '.wp-block-post-content :is(h1,h2,h3,h4,h5,h6)[id],.entry-content :is(h1,h2,h3,h4,h5,h6)[id],.toc-block{scroll-margin-top:%s}', $value );

		if ( did_action( 'wp_head' ) ) {
			// Block templates render before wp_head; PHP templates do not. Fall back to an inline tag.
			printf( '<style id="pmp-toc-scroll-offset">%s</style>', $css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from a validated CSS length.
			return;
		}

		wp_enqueue_block_support_styles( $css );
	}
}
