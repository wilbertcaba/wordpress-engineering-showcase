<?php

namespace PMP\Plugin\PostType;

use PMP\Plugin\Module;

abstract class BasePostType extends Module {

	/**
	 * Post type slug.
	 *
	 * @var string
	 */
	public static $name;

	/**
	 * Is this a built-in post type?
	 *
	 * `register_post_type` is not called for built-in post types.
	 *
	 * @var bool
	 */
	protected $built_in = false;

	/**
	 * Should the post type support the block editor.
	 *
	 * @var bool
	 */
	protected $block_editor_support = true;

	/**
	 * Should the post type support single page templates.
	 *
	 * @var bool
	 */
	protected $single_page = true;

	/**
	 * Get the singular post type label.
	 *
	 * @return string
	 */
	abstract protected function get_singular_label();

	/**
	 * Get the plural post type label.
	 *
	 * @return string
	 */
	abstract protected function get_plural_label();

	/**
	 * Registers a post type and all its associated functionality.
	 *
	 * @return void
	 */
	public function register() {

		if ( ! $this->built_in ) {

			$args = $this->get_options();
			if ( isset( $this->single_page ) && false === $this->single_page ) {
				$args['show_in_admin_bar'] = false;
				$args['show_in_nav_menus'] = false;
			}

			$post_type_object = register_post_type( static::$name, $args );

			if ( ! is_wp_error( $post_type_object ) && ! $this->single_page ) {
				add_action( 'template_redirect', [ $this, 'maybe_redirect' ], 5 );
				add_filter( 'post_row_actions', [ $this, 'posts_list_table_row_actions' ], 10, 2 );
				add_filter( 'page_row_actions', [ $this, 'posts_list_table_row_actions' ], 10, 2 );
			}
		}

		/**
		 * Since the block editor is active by default, we only bind the filter if
		 * $block_editor_support is false, and it's in the admin.
		 */
		if ( ! $this->block_editor_support && is_admin() ) {
			add_filter( 'use_block_editor_for_post_type', [ $this, 'disable_block_editor_for_post_type' ], 10, 2 );
		}

		$this->register_taxonomies();
		$this->register_meta_fields();

		add_action( 'rest_api_init', [ $this, 'rest_api' ] );

		if ( $this->built_in ) {
			add_action( 'init', [ $this, 'register_block_template' ] );
		}
	}

	/**
	 * Determine whether a redirect should happen for a post type.
	 *
	 * Gutenberg expects a post type to be public to be available in the block editor context.
	 * There are however some cases where we want to keep the post type public,
	 * for example to use on a query loop block, but we want to disable the single page template.
	 *
	 * @return void
	 */
	public function maybe_redirect() {

		if ( is_single( static::$name ) || is_singular( static::$name ) ) {
			$post_type_object = get_post_type_object( static::$name );

			if ( ! is_wp_error( $post_type_object ) && ! $this->single_page ) {
				wp_safe_redirect( home_url(), 301 );
				exit;
			}
		}
	}

	/**
	 * Filters the array of row action links on the Posts/Pages list table.
	 *
	 * @param  string[] $actions An array of row action links.
	 * @param  \WP_Post $post    The post object.
	 * @return string[]
	 */
	public function posts_list_table_row_actions( $actions, $post ) {

		if ( empty( $actions ) || empty( $post->post_type ) ) {
			return $actions;
		}

		if ( static::$name !== $post->post_type ) {
			return $actions;
		}

		if ( ! $this->single_page ) {
			unset( $actions['view'] );
		}

		return $actions;
	}

	/**
	 * Remove support for block editor.
	 *
	 * @param  bool   $use_block_editor Whether the post type can be edited or not. Default true.
	 * @param  string $post_type        The post type being checked.
	 * @return bool
	 */
	public function disable_block_editor_for_post_type( $use_block_editor, $post_type ) {

		if ( $post_type === static::$name ) {
			return false;
		}

		return $use_block_editor;
	}

	/**
	 * REST API related functionality, like exposing custom fields, etc.
	 *
	 * @return void
	 */
	public function rest_api() {
		$this->rest_register_fields();
	}

	/**
	 * Registers a block template for a built-in post type.
	 *
	 * @return void
	 */
	public function register_block_template() {
		$post_type_object                = get_post_type_object( static::$name );
		$post_type_object->template      = $this->get_block_template();
		$post_type_object->template_lock = $this->get_block_template_lock();
	}

	/**
	 * Get post meta for REST API response.
	 *
	 * @param  array  $post Post data.
	 * @param  string $key  The meta key to retrieve.
	 * @return mixed
	 */
	public function rest_get_post_meta( $post, $key ) {
		return get_post_meta( $post['id'], $key, true );
	}

	/**
	 * Update post meta from REST API request.
	 *
	 * @param  mixed    $value Metadata value.
	 * @param  \WP_Post $post  Post data.
	 * @param  string   $key   Metadata key.
	 * @return bool|int
	 */
	public function rest_update_post_meta( $value, $post, $key ) {
		return update_post_meta( $post->ID, $key, $value );
	}

	/**
	 * Registers the taxonomies declared with the post type.
	 *
	 * @return void
	 */
	protected function register_taxonomies() {

		$taxonomies = $this->get_supported_taxonomies();
		if ( empty( $taxonomies ) ) {
			return;
		}

		$object_type = static::$name;

		foreach ( $taxonomies as $taxonomy ) {
			register_taxonomy_for_object_type(
				$taxonomy,
				$object_type
			);
		}
	}

	/**
	 * Registers the post type meta fields.
	 *
	 * @return void
	 */
	protected function register_meta_fields() {

		$meta_fields = $this->get_meta_fields();
		if ( empty( $meta_fields ) ) {
			return;
		}

		foreach ( $meta_fields as $meta_key => $meta_attrs ) {
			$this->register_meta_field( $meta_key, $meta_attrs );
		}
	}

	/**
	 * Registers a meta field.
	 *
	 * @param  string $meta_key   Meta field key.
	 * @param  array  $meta_attrs Meta field attributes.
	 * @return void
	 */
	protected function register_meta_field( string $meta_key, array $meta_attrs ) {

		$defaults = [
			'show_in_rest' => true,
			'single'       => true,
		];

		$meta_attrs = wp_parse_args( $meta_attrs, $defaults );

		if ( isset( $meta_attrs['schema'] ) ) {
			$meta_attrs['show_in_rest'] = [
				'schema' => $meta_attrs['schema'],
			];
		}

		register_post_meta(
			static::$name,
			$meta_key,
			$meta_attrs
		);
	}

	/**
	 * Registers custom fields for the REST API.
	 *
	 * @return void
	 */
	protected function rest_register_fields() {

		$meta_fields = $this->get_meta_fields();
		if ( empty( $meta_fields ) ) {
			return;
		}

		foreach ( $meta_fields as $meta_key => $meta_attrs ) {
			$this->rest_register_field( $meta_key, $meta_attrs );
		}
	}

	/**
	 * Registers a custom field for the REST API.
	 *
	 * @param  string $meta_key   Meta field key.
	 * @param  array  $meta_attrs Meta field attributes.
	 * @return void
	 */
	protected function rest_register_field( string $meta_key, array $meta_attrs ) {

		$description     = $meta_attrs['description'] ?? '';
		$type            = $meta_attrs['type'] ?? 'string';
		$context         = $meta_attrs['context'] ?? [ 'view', 'edit' ];
		$get_callback    = $meta_attrs['get_callback'] ?? [ $this, 'rest_get_post_meta' ];
		$update_callback = $meta_attrs['update_callback'] ?? [ $this, 'rest_update_post_meta' ];

		register_rest_field(
			static::$name,
			$meta_key,
			[
				'get_callback'    => $get_callback,
				'update_callback' => $update_callback,
				'schema'          => [
					'description' => $description,
					'type'        => $type,
					'context'     => $context,
				],
			]
		);
	}

	/**
	 * Get the default options for registering a post type.
	 *
	 * @return array
	 */
	protected function get_default_options() {
		return [
			'labels'            => $this->get_labels(),
			'public'            => true,
			'has_archive'       => false,
			'show_ui'           => true,
			'show_in_menu'      => true,
			'show_in_rest'      => true,
			'show_in_nav_menus' => false,
			'hierarchical'      => false,
			'menu_icon'         => $this->get_menu_icon(),
			'supports'          => $this->get_editor_supports(),
			'template'          => $this->get_block_template(),
			'template_lock'     => $this->get_block_template_lock(),
		];
	}

	/**
	 * Get the options for registering a post type.
	 *
	 * @return array
	 */
	protected function get_options() {
		return $this->get_default_options();
	}

	/**
	 * Get the default labels for the post type.
	 *
	 * @return array
	 */
	protected function get_default_labels() {

		$plural_label   = $this->get_plural_label();
		$singular_label = $this->get_singular_label();

		$labels = [
			'name'                  => $plural_label, // Already translated via get_plural_label().
			'singular_name'         => $singular_label, // Already translated via get_singular_label().
			/* translators: %s plural label */
			'all_items'             => sprintf( __( 'All %s', 'pmp-plugin' ), $plural_label ),
			/* translators: %s singular label */
			'add_new_item'          => sprintf( __( 'Add New %s', 'pmp-plugin' ), $singular_label ),
			/* translators: %s singular label */
			'add_new'               => sprintf( __( 'Add New %s', 'pmp-plugin' ), $singular_label ),
			/* translators: %s singular label */
			'edit_item'             => sprintf( __( 'Edit %s', 'pmp-plugin' ), $singular_label ),
			/* translators: %s singular label */
			'new_item'              => sprintf( __( 'New %s', 'pmp-plugin' ), $singular_label ),
			/* translators: %s singular label */
			'view_item'             => sprintf( __( 'View %s', 'pmp-plugin' ), $singular_label ),
			/* translators: %s plural label */
			'search_items'          => sprintf( __( 'Search %s', 'pmp-plugin' ), $plural_label ),
			/* translators: %s plural label */
			'not_found'             => sprintf( __( 'No %s found.', 'pmp-plugin' ), strtolower( $plural_label ) ),
			/* translators: %s plural label */
			'not_found_in_trash'    => sprintf( __( 'No %s found in Trash.', 'pmp-plugin' ), strtolower( $plural_label ) ),
			/* translators: %s plural label */
			'parent_item_colon'     => sprintf( __( 'Parent %s:', 'pmp-plugin' ), $plural_label ),
			/* translators: %s singular label */
			'insert_into_item'      => sprintf( __( 'Insert into %s:', 'pmp-plugin' ), $singular_label ),
			/* translators: %s singular label */
			'uploaded_to_this_item' => sprintf( __( 'Uploaded to this %s:', 'pmp-plugin' ), $singular_label ),
			'featured_image'        => __( 'Featured Image', 'pmp-plugin' ),
			'set_featured_image'    => __( 'Set featured image', 'pmp-plugin' ),
			'menu_name'             => $plural_label,
			'name_admin_bar'        => $plural_label,
			/* translators: %s singular label */
			'item_updated'          => sprintf( __( '%s updated:', 'pmp-plugin' ), $singular_label ),
		];

		return $labels;
	}

	/**
	 * Get the labels for the post type.
	 *
	 * @return array
	 */
	protected function get_labels() {
		return $this->get_default_labels();
	}

	/**
	 * Get the URL or reference to the icon to be used for the post type menu.
	 *
	 * @return string
	 */
	protected function get_menu_icon() {
		return 'dashicons-admin-post';
	}

	/**
	 * Get the features supported by the post type.
	 *
	 * @return array
	 */
	protected function get_editor_supports() {
		return [];
	}

	/**
	 * Get the post type block template.
	 *
	 * @link https://developer.wordpress.org/block-editor/developers/block-api/block-templates/
	 *
	 * @return array
	 */
	protected function get_block_template() {
		return [];
	}

	/**
	 * Get the post type block template locking.
	 *
	 * @link https://developer.wordpress.org/block-editor/developers/block-api/block-templates/
	 *
	 * @return boolean|string
	 */
	protected function get_block_template_lock() {
		return false;
	}

	/**
	 * Get the list of taxonomies supported by the post type.
	 *
	 * @return array
	 */
	protected function get_supported_taxonomies() {
		return [];
	}

	/**
	 * Get the list of meta fields for the post type.
	 *
	 * @return array
	 */
	protected function get_meta_fields() {
		return [];
	}
}
