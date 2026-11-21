<?php
/** Run with wp eval-file on a disposable showcase site only. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit; }
$theme = get_stylesheet_directory();
$after = file_exists( "$theme/patterns/practice-areas-grid-variation-5.php" );
if ( 'pmp-theme' !== get_stylesheet() || ! post_type_exists( 'pmp_practice_area' ) ) {
    WP_CLI::error( 'Activate the showcase theme and MU-plugin first.' );
}
function showcase_owned( $key, $type ) {
    $ids = get_posts( [ 'post_type' => $type, 'post_status' => 'any', 'meta_key' => '_showcase_key', 'meta_value' => $key, 'fields' => 'ids', 'numberposts' => 2 ] );
    if ( count( $ids ) > 1 ) { WP_CLI::error( 'Duplicate showcase key: ' . $key ); }
    return $ids[0] ?? 0;
}
function showcase_image( $kind, $index ) {
    $key = "$kind-$index";
    $id = showcase_owned( $key, 'attachment' );
    if ( $id && file_exists( get_attached_file( $id ) ) ) { return $id; }
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $source = __DIR__ . "/../fixtures/images/$key.png";
    $temporary = wp_tempnam( $source );
    copy( $source, $temporary );
    $image = media_handle_sideload( [ 'name' => "$key.png", 'tmp_name' => $temporary ], 0 );
    if ( is_wp_error( $image ) ) { WP_CLI::error( $image->get_error_message() ); }
    update_post_meta( $image, '_showcase_key', $key );
    update_post_meta( $image, '_wp_attachment_image_alt', ucfirst( $kind ) . ' demonstration artwork ' . $index );
    return $image;
}
$names = ['Personal Injury', 'Family Law', 'Estate Planning', 'Employment Law', 'Business Law', 'Property Law', 'Consumer Rights', 'Civil Litigation'];
foreach ( $names as $index => $name ) {
    $key = 'practice-area-' . $index;
    $id = wp_insert_post( [ 'ID' => showcase_owned( $key, 'pmp_practice_area' ), 'post_type' => 'pmp_practice_area', 'post_status' => 'publish', 'post_title' => $name, 'post_name' => sanitize_title( $name ), 'post_date' => sprintf( '2025-01-%02d 12:00:00', $index + 1 ), 'post_excerpt' => "Fictional example of our $name services.", 'post_content' => '<!-- wp:paragraph --><p>This fictional practice area exists to demonstrate the WordPress component. It contains no client information.</p><!-- /wp:paragraph -->', 'meta_input' => [ '_showcase_key' => $key, 'title_secondary' => $name . ' Support' ] ], true );
    if ( is_wp_error( $id ) ) { WP_CLI::error( $id->get_error_message() ); }
    set_post_thumbnail( $id, showcase_image( 'featured', $index ) );
    if ( $after ) { update_post_meta( $id, 'card_image', showcase_image( 'card', $index ) ); }
}
$pattern = $after ? 'practice-areas-grid-variation-5' : 'practice-areas-grid-variation-1';
ob_start(); include "$theme/patterns/$pattern.php"; $content = ob_get_clean();
if ( ! $after ) {
    // Equivalent to selecting Cover in the historical control: keep title/image,
    // suppress excerpt/author/date/reading time; query retains its taxonomy setting.
    $content = preg_replace_callback( '/<!-- wp:query (.*?) -->/s', static function ( $match ) {
        $attrs = json_decode( $match[1], true );
        $attrs = array_merge( $attrs, [ 'variationName' => 'cover', 'showPostTitle' => true, 'useSecondaryTitle' => false, 'showFeaturedImage' => true, 'showPostExcerpt' => false, 'showPostAuthor' => false, 'showPostDate' => false, 'showReadingTime' => false, 'showTaxonomy' => true ] );
        return '<!-- wp:query ' . wp_json_encode( $attrs ) . ' -->';
    }, $content );
    $start = strpos( $content, '<!-- wp:pmp/content-card-template' );
    $end = strpos( $content, '<!-- /wp:pmp/content-card-template -->', $start );
    $content = substr_replace( $content, '<!-- wp:pmp/content-card-template --><!-- wp:post-featured-image {"sizeSlug":"large"} /--><!-- wp:post-terms {"term":"category"} /--><!-- wp:post-title {"isLink":true} /--><!-- /wp:pmp/content-card-template -->', $start, $end + strlen( '<!-- /wp:pmp/content-card-template -->' ) - $start );
}
// The original CTA has no destination. Link it to the local demo grid.
$content = str_replace( '<a class="wp-block-button__link', '<a href="#practice-areas" class="wp-block-button__link', $content );
$content = '<!-- wp:html --><div id="practice-areas"></div><!-- /wp:html -->' . $content;
$page = wp_insert_post( [ 'ID' => showcase_owned( 'grid-page', 'page' ), 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $after ? 'After: Variation 5' : 'Before: Variation 1 / Cover', 'post_name' => 'practice-areas', 'post_content' => $content, 'meta_input' => [ '_showcase_key' => 'grid-page' ] ], true );
if ( is_wp_error( $page ) ) { WP_CLI::error( $page->get_error_message() ); }
// Site settings are changed only on an explicitly designated disposable site.
update_option( 'show_on_front', 'page' ); update_option( 'page_on_front', $page );
update_option( 'permalink_structure', '/%postname%/' );
flush_rewrite_rules();
WP_CLI::success( 'Seeded ' . ( $after ? 'after' : 'before' ) . ' demo: 8 practice areas. Re-running is safe for showcase-owned records.' );

// New features are available only in the after environment.
if ( $after ) { require __DIR__ . '/seed-logo-slider.php'; }

if ( $after ) { require __DIR__ . '/seed-video-modal.php'; }
