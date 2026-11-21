<?php

namespace PMP\Plugin\SettingsPage;

use PMP\Plugin\Module;

abstract class BaseSettingsPage extends Module {

	/**
	 * Settings group name.
	 *
	 * @var string
	 */
	protected $option_group = '';

	/**
	 * Option name.
	 *
	 * @var string
	 */
	protected $option_name = '';

	/**
	 * Setting sections.
	 *
	 * @var array
	 */
	public $sections = [];

	/**
	 * Setting fields.
	 *
	 * @var array
	 */
	public $fields = [];

	/**
	 * {@inheritDoc}
	 */
	public function can_register() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		add_action( 'admin_init', [ $this, 'register_settings' ] );
		add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
	}

	/**
	 * Register settings.
	 *
	 * @return void
	 */
	public function register_settings() {

		register_setting(
			$this->option_group,
			$this->option_name,
			[ $this, 'sanitize_callback' ]
		);

		$this->add_sections();
		$this->add_fields();
	}

	/**
	 * Register settings.
	 *
	 * @return void
	 */
	abstract public function add_settings_page();

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public function render_settings_page() {
		?>
		<h2>
			<?php echo esc_html( get_admin_page_title() ); ?>
		</h2>
		<form action="<?php echo esc_url( admin_url( '/options.php' ) ); ?>" method="post">
			<?php
			settings_fields( $this->option_group );
			do_settings_sections( $this->option_group );
			submit_button();
			?>
		</form>
		<?php
	}

	/**
	 * Add sections to a settings page.
	 *
	 * @return void
	 */
	public function add_sections() {

		foreach ( $this->sections as $section ) {
			$this->add_section( $section );
		}
	}

	/**
	 * Add a section to a settings page.
	 *
	 * @param  array $section Section data.
	 * @return void
	 */
	public function add_section( $section ) {

		add_settings_section(
			$section['id'],
			$section['title'] ?? '',
			$section['callback'] ?? '',
			$this->option_group
		);
	}

	/**
	 * Add fields to a settings page.
	 *
	 * @return void
	 */
	public function add_fields() {

		foreach ( $this->fields as $section => $fields ) {
			foreach ( $fields as $field ) {
				$this->add_field( $section, $field );
			}
		}
	}

	/**
	 * Add a field to a section of a settings page.
	 *
	 * @param  string $section Field section name.
	 * @param  array  $field   Field data.
	 * @return void
	 */
	public function add_field( $section, $field ) {

		if ( ! isset( $field['label_for'] ) ) {
			$field['label_for'] = $field['id'];
		}

		add_settings_field(
			$field['id'],
			$field['title'],
			[ $this, 'callback_' . $field['type'] ],
			$this->option_group,
			$section,
			$field
		);
	}

	/**
	 * Render a text field.
	 *
	 * @param  array $args Arguments used to create the settings field.
	 * @return void
	 */
	public function callback_text( $args = [] ) {

		$args = wp_parse_args(
			$args,
			[
				'type'        => 'text',
				'placeholder' => '',
			]
		);

		$field_id   = $args['id'];
		$field_name = sprintf( '%1$s[%2$s]', $this->option_name, $field_id );

		$field_value = $this->get_value( $field_id );
		if ( ! $field_value ) {
			$field_value = '';
		}
		?>

		<input
			type="text"
			id="<?php echo esc_attr( $field_id ); ?>"
			name="<?php echo esc_attr( $field_name ); ?>"
			value="<?php echo esc_attr( $field_value ); ?>"
			placeholder="<?php echo esc_attr( $args['placeholder'] ); ?>"
			class="regular-text"
		/>

		<?php
		$this->render_field_description( $args );
	}

	/**
	 * Render a textarea field.
	 *
	 * @param  array $args Arguments used to create the settings field.
	 * @return void
	 */
	public function callback_textarea( $args = [] ) {

		$args = wp_parse_args(
			$args,
			[
				'type'        => 'textarea',
				'placeholder' => '',
			]
		);

		$field_id   = $args['id'];
		$field_name = sprintf( '%1$s[%2$s]', $this->option_name, $field_id );

		$field_value = $this->get_value( $field_id );
		if ( ! $field_value ) {
			$field_value = '';
		}
		?>

		<textarea
			id="<?php echo esc_attr( $field_id ); ?>"
			name="<?php echo esc_attr( $field_name ); ?>"
			value="<?php echo esc_attr( $field_value ); ?>"
			rows="10"
			cols="50"
			class="large-text code"
		><?php echo esc_textarea( $field_value ); ?></textarea>

		<?php
		$this->render_field_description( $args );
	}

	/**
	 * Render a checkbox field.
	 *
	 * @param  array $args Arguments used to create the settings field.
	 * @return void
	 */
	public function callback_checkbox( $args = [] ) {

		$args = wp_parse_args(
			$args,
			[
				'type'        => 'checkbox',
				'placeholder' => '',
			]
		);

		$field_id   = $args['id'];
		$field_name = sprintf( '%1$s[%2$s]', $this->option_name, $field_id );

		$field_value = $this->get_value( $field_id );
		if ( ! $field_value ) {
			$field_value = '';
		}
		printf(
			'<input type="checkbox" name="%1$s" value="1" %2$s id="%3$s" />',
			esc_attr( $field_name ?? '' ),
			checked( $args['checked'] ?? 1, $field_value ?? 1, false ),
			esc_attr( $field_id )
		);
		$this->render_field_description( $args );
	}

	/**
	 * Render a select field.
	 *
	 * @param  array $args Arguments used to create the settings field.
	 * @return void
	 */
	public function callback_select( $args = [] ) {

		$args = wp_parse_args(
			$args,
			[
				'type'        => 'text',
				'items'       => [],
				'placeholder' => '',
			]
		);

		$field_id   = $args['id'];
		$field_name = sprintf( '%1$s[%2$s]', $this->option_name, $field_id );

		$field_value = $this->get_value( $field_id );
		if ( ! $field_value ) {
			$field_value = '';
		}

		if ( empty( $args['items'] ) ) {
			return;
		}
		?>

		<select
			name="<?php echo esc_attr( $field_name ); ?>"
			id="<?php echo esc_attr( $field_id ); ?>"
			class="regular-text"
		>
			<?php foreach ( $args['items'] as $value => $text ) : ?>
				<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $value, $field_value ); ?>>
					<?php echo esc_html( $text ); ?>
				</option>
			<?php endforeach; ?>
		</select>

		<?php
		$this->render_field_description( $args );
	}

	/**
	 * Render a image upload field.
	 *
	 * @param  array $args Arguments used to create the settings field.
	 * @return void
	 */
	public function callback_image_upload( $args = [] ) {

		$args = wp_parse_args(
			$args,
			[
				'type'        => 'image_upload',
				'placeholder' => '',
			]
		);

		$field_id   = $args['id'];
		$field_name = sprintf( '%1$s[%2$s]', $this->option_name, $field_id );

		$field_value = $this->get_value( $field_id );
		if ( ! $field_value ) {
			$field_value = '';
		}
		?>

		<input type="hidden" name="<?php echo esc_attr( $field_name ); ?>" id="<?php echo esc_attr( $field_name ); ?>" value="<?php echo esc_attr( $field_value ); ?>" />
			<p>
			<a href="#" class="button pmp_uploader_set_image_button" data-name="<?php echo esc_attr( $field_name ); ?>" style="<?php echo $field_value ? 'display: none;' : ''; ?>">
				<?php esc_html_e( 'Set Image', 'pmp-plugin' ); ?>
			</a>
			<a href="#" class="button pmp_uploader_remove_image_button" data-name="<?php echo esc_attr( $field_name ); ?>" style="<?php echo ! $field_value ? 'display: none;' : ''; ?>">
				<?php esc_html_e( 'Remove Image', 'pmp-plugin' ); ?>
			</a>
		</p>
		<?php
		if ( $field_value ) :
			$image_src = wp_get_attachment_image_src( $field_value, 'full' );
			?>
			<p class="pmp-uploader-media-display">
				<embed src="<?php echo esc_url( $image_src[0] ); ?>" style="width: 500px;">
			</p>
		<?php endif; ?>

		<?php
		$this->render_field_description( $args );
	}

	/**
	 * Render field description.
	 *
	 * @param  array $args Arguments used to create the settings field.
	 * @return void
	 */
	public function render_field_description( $args ) {

		if ( empty( $args['desc'] ) ) {
			return;
		}

		?>
		<p class="description">
			<?php
			echo wp_kses(
				$args['desc'],
				[
					'a' => [
						'href'   => [],
						'target' => [],
					],
				]
			);
			?>
		</p>
		<?php
	}

	/**
	 * Get the field value.
	 *
	 * @param  string $id Field name.
	 * @return string|false
	 */
	public function get_value( $id ) {
		$option = get_option( $this->option_name );
		return isset( $option[ $id ] ) ? $option[ $id ] : false;
	}

	/**
	 * Sanitize each setting field.
	 *
	 * @param  array $fields List of fields.
	 * @return array
	 */
	public function sanitize_callback( $fields ) {
        if ( ! is_array( $fields ) ) { return []; }
        $clean = [];
        foreach ( $fields as $field_name => $field_value ) {
            $sanitize_callback = $this->get_sanitize_callback( $field_name );
            if ( $sanitize_callback && is_scalar( $field_value ) ) {
                $clean[ $field_name ] = call_user_func( $sanitize_callback, $field_value );
            }
        }
        return $clean;
    }

	/**
	 * Get the sanitization callback for a given field.
	 *
	 * @param  string $name The field name.
	 * @return mixed
	 */
	public function get_sanitize_callback( $name ) {

		foreach ( $this->fields as $fields ) {
			foreach ( $fields as $field ) {
				if ( $field['id'] === $name ) {
					return isset( $field['sanitize_callback'] ) && is_callable( $field['sanitize_callback'] ) ? $field['sanitize_callback'] : '';
				}
			}
		}
	}
}
