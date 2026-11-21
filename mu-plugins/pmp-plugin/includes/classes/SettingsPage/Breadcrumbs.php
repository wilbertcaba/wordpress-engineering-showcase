<?php
/**
 * Breadcrumbs settings page.
 *
 * @package PMP
 */

namespace PMP\Plugin\SettingsPage;

use PMP\Plugin\Breadcrumbs\Resolver;

/**
 * Settings > Breadcrumbs.
 *
 * Per-site, like every other settings page here. Nothing is network-wide on
 * purpose: page IDs differ per site and the active SEO plugin differs per
 * network.
 */
class Breadcrumbs extends BaseSettingsPage {

	/**
	 * {@inheritDoc}
	 * // phpcs:ignore Squiz.Commenting.VariableComment.MissingVar
	 */
	protected $option_group = 'pmp_breadcrumbs_settings';

	/**
	 * {@inheritDoc}
	 * // phpcs:ignore Squiz.Commenting.VariableComment.MissingVar
	 */
	protected $option_name = Resolver::OPTION_NAME;

	/**
	 * Constructor.
	 *
	 * Keep this cheap. `ModuleInitialization` instantiates every module on
	 * every admin request, so anything that queries belongs in
	 * `register_settings()`, which only runs on `admin_init`.
	 */
	public function __construct() {

		$this->sections = [
			[
				'id'    => 'general',
				'title' => esc_html__( 'General', 'pmp-plugin' ),
			],
			[
				'id'       => 'parents',
				'title'    => esc_html__( 'Parent pages', 'pmp-plugin' ),
				'callback' => [ $this, 'render_parents_description' ],
			],
		];

		$this->fields = [
			'general' => [
				[
					'id'                => 'enabled',
					'type'              => 'checkbox',
					'title'             => esc_html__( 'Enable breadcrumbs', 'pmp-plugin' ),
					'desc'              => esc_html__( 'Off by default. When off, the breadcrumbs template part renders nothing and the SEO plugin keeps its own trail.', 'pmp-plugin' ),
					'sanitize_callback' => 'absint',
				],
				[
					'id'                => 'home_label',
					'type'              => 'text',
					'title'             => esc_html__( 'Home label', 'pmp-plugin' ),
					'placeholder'       => esc_html__( 'Home', 'pmp-plugin' ),
					'desc'              => esc_html__( 'Text for the first crumb. Used in both the visible trail and the schema.', 'pmp-plugin' ),
					'sanitize_callback' => 'sanitize_text_field',
				],
			],
			// Populated in register_settings(), see get_parent_page_fields().
			'parents' => [],
		];
	}

	/**
	 * {@inheritDoc}
	 */
	public function register_settings() {
		$this->fields['parents'] = $this->get_parent_page_fields();

		parent::register_settings();
	}

	/**
	 * {@inheritDoc}
	 */
	public function add_settings_page() {

		add_options_page(
			esc_html__( 'Breadcrumbs', 'pmp-plugin' ),
			esc_html__( 'Breadcrumbs', 'pmp-plugin' ),
			'manage_options',
			$this->option_group,
			[ $this, 'render_settings_page' ]
		);
	}

	/**
	 * Explain what the parent page selects are for.
	 *
	 * @return void
	 */
	public function render_parents_description() {
		?>
		<p class="description">
			<?php esc_html_e( 'PMP post types have no archive page, so pick the page that should appear before a single entry. For example, choose your "Attorneys" page for Lawyers.', 'pmp-plugin' ); ?>
		</p>
		<?php
	}

	/**
	 * One page select per PMP post type.
	 *
	 * @return array
	 */
	protected function get_parent_page_fields() {
		$items = [ '' => esc_html__( 'None', 'pmp-plugin' ) ];

		$pages = get_pages(
			[
				'post_status' => 'publish',
				'sort_column' => 'post_title',
			]
		);

		foreach ( $pages as $page ) {
			$items[ $page->ID ] = $page->post_title;
		}

		$fields = [];

		foreach ( $this->get_post_types() as $post_type ) {
			$fields[] = [
				'id'                => 'parent_' . $post_type->name,
				'type'              => 'select',
				'title'             => $post_type->labels->singular_name,
				'items'             => $items,
				'sanitize_callback' => 'absint',
			];
		}

		return $fields;
	}

	/**
	 * Public PMP post types, in registration order.
	 *
	 * @return \WP_Post_Type[]
	 */
	protected function get_post_types() {
		$post_types = get_post_types(
			[
				'public'   => true,
				'_builtin' => false,
			],
			'objects'
		);

		return array_filter(
			$post_types,
			static function ( $post_type ) {
				return str_starts_with( $post_type->name, 'pmp_' );
			}
		);
	}
}
