<?php
/** Focused extraction of Admin/Settings::register_toc_settings(). */
add_action( 'admin_init', static function () {

		register_setting(
			'general',
			'pmp_toc_auto_insert',
			[
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'default'           => false,
			]
		);

		add_settings_field(
			'pmp_toc_auto_insert',
			__( 'Table of Contents', 'pmp-theme' ),
			function () {
				?>
				<label for="pmp_toc_auto_insert">
					<input
						type="checkbox"
						name="pmp_toc_auto_insert"
						id="pmp_toc_auto_insert"
						value="1"
						<?php checked( (bool) get_option( 'pmp_toc_auto_insert', false ) ); ?>
					>
					<?php esc_html_e( 'Insert a mobile Table of Contents before the first heading of posts that have none.', 'pmp-theme' ); ?>
				</label>
				<p class="description"><?php esc_html_e( 'Posts that already contain a Table of Contents block are left unchanged. The inserted block is shown only below 782px.', 'pmp-theme' ); ?></p>
				<?php
			},
			'general'
		);
} );
