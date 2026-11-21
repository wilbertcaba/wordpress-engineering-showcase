<?php
/** Seed only the after-state Video Modal page and its original demo media. */
namespace PMP\Showcase\VideoModal;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit; }
if ( 'pmp-theme' !== get_stylesheet() || ! \WP_Block_Type_Registry::get_instance()->is_registered( 'pmp/video-modal' ) ) {
    \WP_CLI::error( 'Build and activate the after-state showcase theme before seeding Video Modal.' );
}
function owned( $key, $type ) {
    $ids = get_posts( [ 'post_type' => $type, 'post_status' => 'any', 'meta_key' => '_showcase_key', 'meta_value' => $key, 'fields' => 'ids', 'numberposts' => 2 ] );
    if ( count( $ids ) > 1 ) { \WP_CLI::error( 'Duplicate showcase key: ' . $key ); }
    return $ids[0] ?? 0;
}
$page_id = owned( 'video-modal-page', 'page' );
$collision = get_page_by_path( 'video-modal' );
if ( $collision && (int) $collision->ID !== (int) $page_id ) { \WP_CLI::error( 'The /video-modal/ URL belongs to another page and will not be overwritten.' ); }
function attachment( $name, $file ) {
    $id = owned( $name, 'attachment' );
    if ( $id && file_exists( get_attached_file( $id ) ) ) { return $id; }
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $source = __DIR__ . '/../fixtures/video/' . $file;
    if ( ! file_exists( $source ) ) { \WP_CLI::error( 'Missing demo fixture: ' . $file ); }
    $temporary = wp_tempnam( $source );
    if ( ! $temporary || ! copy( $source, $temporary ) ) { \WP_CLI::error( 'Could not prepare the demo media.' ); }
    $id = media_handle_sideload( [ 'name' => 'video-modal-' . $file, 'tmp_name' => $temporary ], 0 );
    if ( is_wp_error( $id ) ) { \WP_CLI::error( $id->get_error_message() ); }
    update_post_meta( $id, '_showcase_key', $name );
    return $id;
}
$clip_id = attachment( 'video-modal-clip', 'demo.webm' );
$icon_id = attachment( 'video-modal-icon', 'play-icon.png' );
$clip_url = wp_get_attachment_url( $clip_id );
function modal( $attributes ) {
    return serialize_block( [ 'blockName' => 'pmp/video-modal', 'attrs' => $attributes, 'innerBlocks' => [], 'innerHTML' => '', 'innerContent' => [] ] );
}
$content = '<!-- wp:paragraph --><p>A new feature available only in the after environment. Both examples play the same four-second silent video generated for this showcase. No external player is loaded.</p><!-- /wp:paragraph -->';
$content .= '<!-- wp:heading --><h2 class="wp-block-heading">Solid play button</h2><!-- /wp:heading -->';
$content .= '<!-- wp:paragraph --><p>Open the local demo clip. Close it with the X button, Escape, or a click outside the player. Playback also closes the modal automatically when the clip ends.</p><!-- /wp:paragraph -->';
$content .= modal( [ 'videoUrl' => $clip_url, 'videoTitle' => 'Local demo — solid button', 'buttonSize' => 72, 'iconSize' => 45 ] );
$content .= '<!-- wp:heading --><h2 class="wp-block-heading">Outline button with a custom icon</h2><!-- /wp:heading -->';
$content .= '<!-- wp:paragraph --><p>The same behavior with the Outline style, a larger button, and an original custom play icon selected from the Media Library.</p><!-- /wp:paragraph -->';
$content .= modal( [ 'videoUrl' => $clip_url, 'videoTitle' => 'Local demo — custom icon', 'className' => 'is-style-outline', 'buttonSize' => 96, 'iconSize' => 55, 'iconId' => $icon_id, 'iconUrl' => wp_get_attachment_url( $icon_id ), 'style' => [ 'color' => [ 'text' => '#006b91' ], 'border' => [ 'color' => '#006b91', 'width' => '2px' ] ] ] );
$content .= '<!-- wp:heading --><h2 class="wp-block-heading">Try the editor controls</h2><!-- /wp:heading -->';
$content .= '<!-- wp:paragraph --><p>Edit this page and select a Video Modal block in List View. Change its video URL or Media Library selection, accessible title, button size, icon size, custom icon, colors, or Solid/Outline style. YouTube and Vimeo URLs can also be entered; actual provider playback requires internet access and an embeddable video.</p><!-- /wp:paragraph -->';
$content .= sprintf( '<!-- wp:paragraph --><p><a href="%s">Open the local demo video directly</a>.</p><!-- /wp:paragraph -->', esc_url( $clip_url ) );
$result = wp_insert_post( [ 'ID' => $page_id, 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Video Modal', 'post_name' => 'video-modal', 'post_content' => $content, 'meta_input' => [ '_showcase_key' => 'video-modal-page' ] ], true );
if ( is_wp_error( $result ) ) { \WP_CLI::error( $result->get_error_message() ); }
\WP_CLI::success( 'Seeded after-only Video Modal page, local clip and icon. Existing feature pages and home-page settings were preserved.' );
