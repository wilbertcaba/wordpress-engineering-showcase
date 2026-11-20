<?php
/** Seed the after-only Logo Slider page without changing the Grid demo. */
namespace PMP\Showcase\LogoSlider;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit; }
if ( 'pmp-theme' !== get_stylesheet() || ! \WP_Block_Type_Registry::get_instance()->is_registered( 'pmp/logo-slider' ) ) {
    \WP_CLI::error( 'Build and activate the after-state showcase theme before seeding Logo Slider.' );
}
function owned( $key, $type ) {
    $ids = get_posts( [ 'post_type' => $type, 'post_status' => 'any', 'meta_key' => '_showcase_key', 'meta_value' => $key, 'fields' => 'ids', 'numberposts' => 2 ] );
    if ( count( $ids ) > 1 ) { \WP_CLI::error( 'Duplicate showcase key: ' . $key ); }
    return $ids[0] ?? 0;
}
$page_id = owned( 'logo-slider-page', 'page' );
$collision = get_page_by_path( 'logo-slider' );
if ( $collision && (int) $collision->ID !== (int) $page_id ) {
    \WP_CLI::error( 'The /logo-slider/ URL belongs to another page. Rename that page before seeding; it will not be overwritten.' );
}
function attachment( $name ) {
    $key = 'logo-slider-' . $name;
    $id = owned( $key, 'attachment' );
    if ( $id && file_exists( get_attached_file( $id ) ) ) { return $id; }
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $source = __DIR__ . '/../fixtures/logos/' . $name . '.png';
    if ( ! file_exists( $source ) ) { \WP_CLI::error( 'Missing fictional logo fixture: ' . $name ); }
    $temporary = wp_tempnam( $source );
    if ( ! $temporary || ! copy( $source, $temporary ) ) { \WP_CLI::error( 'Could not prepare the logo fixture.' ); }
    $id = media_handle_sideload( [ 'name' => $key . '.png', 'tmp_name' => $temporary ], 0 );
    if ( is_wp_error( $id ) ) { \WP_CLI::error( $id->get_error_message() ); }
    update_post_meta( $id, '_showcase_key', $key );
    update_post_meta( $id, '_wp_attachment_image_alt', 'Fictional ' . ucfirst( $name ) . ' demo logo' );
    return $id;
}
function slider( $images, $automatic, $label ) {
    $blocks = [];
    if ( $label ) {
        $blocks[] = [
            'blockName' => 'pmp/logo-slider-label',
            'attrs' => [ 'className' => 'showcase-logo-label' ],
            'innerBlocks' => [],
            'innerHTML' => '<div class="wp-block-pmp-logo-slider-label showcase-logo-label"><span>Demo brands</span></div>',
            'innerContent' => [ '<div class="wp-block-pmp-logo-slider-label showcase-logo-label"><span>Demo brands</span></div>' ],
        ];
    }
    foreach ( $images as $name => $id ) {
        $html = sprintf( '<figure class="wp-block-image size-full"><a href="#logo-%s"><img src="%s" alt="%s" class="wp-image-%d"/></a></figure>', esc_attr( $name ), esc_url( wp_get_attachment_url( $id ) ), esc_attr( get_post_meta( $id, '_wp_attachment_image_alt', true ) ), $id );
        $blocks[] = [ 'blockName' => 'core/image', 'attrs' => [ 'id' => $id, 'sizeSlug' => 'full', 'linkDestination' => 'custom' ], 'innerBlocks' => [], 'innerHTML' => $html, 'innerContent' => [ $html ] ];
    }
    // The dynamic parent saves only its inner blocks, matching its original save.js.
    return serialize_block( [
        'blockName' => 'pmp/logo-slider',
        'attrs' => [ 'autoWidth' => $automatic, 'logoWidth' => 180, 'logoHeight' => 64, 'logoGap' => 48, 'scrollSpeed' => 0.6 ],
        'innerBlocks' => $blocks,
        'innerHTML' => '',
        'innerContent' => array_fill( 0, count( $blocks ), null ),
    ] );
}
$images = [];
foreach ( ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'] as $name ) { $images[$name] = attachment( $name ); }
$content = '<!-- wp:paragraph --><p>A new feature available only in the after environment. All logos are fictional demonstration artwork.</p><!-- /wp:paragraph -->';
$content .= '<!-- wp:heading --><h2 class="wp-block-heading">Fixed-width logo slots</h2><!-- /wp:heading -->';
$content .= '<!-- wp:paragraph --><p>Equal-width slots, a shared height, and an optional editable label overlay.</p><!-- /wp:paragraph -->';
$content .= slider( $images, false, true );
$content .= '<!-- wp:heading --><h2 class="wp-block-heading">Automatic logo widths</h2><!-- /wp:heading -->';
$content .= '<!-- wp:paragraph --><p>The same logos keep their natural proportions at a shared height. Hover or focus a logo link to pause scrolling; reduced-motion preferences stop automatic scrolling.</p><!-- /wp:paragraph -->';
$content .= slider( $images, true, false );
$content .= '<!-- wp:heading --><h2 class="wp-block-heading">Fictional brand directory</h2><!-- /wp:heading -->';
foreach ( array_keys( $images ) as $name ) {
    $content .= sprintf( '<!-- wp:paragraph {"anchor":"logo-%s"} --><p id="logo-%s">%s is fictional artwork used to demonstrate image sizing and logo links.</p><!-- /wp:paragraph -->', $name, $name, ucfirst( $name ) );
}
$result = wp_insert_post( [ 'ID' => $page_id, 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Logo Slider', 'post_name' => 'logo-slider', 'post_content' => $content, 'meta_input' => [ '_showcase_key' => 'logo-slider-page' ] ], true );
if ( is_wp_error( $result ) ) { \WP_CLI::error( $result->get_error_message() ); }
\WP_CLI::success( 'Seeded after-only Logo Slider page and six fictional logos. The Grid page and home-page settings were preserved.' );
