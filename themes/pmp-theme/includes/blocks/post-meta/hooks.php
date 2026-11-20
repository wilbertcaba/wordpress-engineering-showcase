<?php
/**
 * Add hooks for post meta block
 *
 * @package PMP_Theme
 */

add_action( 'enqueue_block_editor_assets', 'pmp_enqueue_post_meta_editor_assets' );

/**
 * Enqueue editor assets for post meta block
 */
function pmp_enqueue_post_meta_editor_assets() {
	wp_localize_script(
		'pmp-editor',
		'pmpThemeData',
		array(
			'uploadsUrl' => wp_upload_dir()['baseurl'],
		)
	);
}
