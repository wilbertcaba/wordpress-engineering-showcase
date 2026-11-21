<?php
/** Integration assertions, executed inside each disposable WordPress site. */
if ( ! defined( 'WP_CLI' ) ) { exit; }
function showcase_assert( $condition, $message ) {
    if ( ! $condition ) { WP_CLI::error( $message ); }
    WP_CLI::log( 'PASS ' . $message );
}
$after = file_exists( get_stylesheet_directory() . '/patterns/practice-areas-grid-variation-5.php' );
$areas = get_posts( [ 'post_type' => 'pmp_practice_area', 'meta_key' => '_showcase_key', 'numberposts' => -1 ] );
showcase_assert( 8 === count( $areas ), 'Exactly eight seeded practice areas' );
$fields = get_registered_meta_keys( 'post', 'pmp_practice_area' );
showcase_assert( isset( $fields['card_image'] ) === $after, 'Card image registration matches historical state' );
foreach ( ['pmp/content-display','pmp/content-card-template','pmp/post-meta','pmp/advanced-heading'] as $name ) {
    showcase_assert( WP_Block_Type_Registry::get_instance()->is_registered( $name ), $name . ' registered' );
}
$area = $areas[0];
$original = get_post_meta( $area->ID, 'title_secondary', true );
wp_set_current_user( 0 );
$request = new WP_REST_Request( 'POST', '/wp/v2/pmp_practice_area/' . $area->ID );
$request->set_param( 'meta', [ 'title_secondary' => 'UNAUTHORIZED' ] );
$response = rest_do_request( $request );
showcase_assert( in_array( $response->get_status(), [401,403], true ), 'Anonymous metadata writes rejected' );
showcase_assert( $original === get_post_meta( $area->ID, 'title_secondary', true ), 'Rejected request leaves metadata unchanged' );
if ( $after ) {
    wp_set_current_user( get_users( [ 'role'=>'administrator', 'number'=>1 ] )[0]->ID );
    $image = (int) get_post_meta( $area->ID, 'card_image', true );
    $request = new WP_REST_Request( 'POST', '/wp/v2/pmp_practice_area/' . $area->ID );
    $request->set_param( 'meta', [ 'card_image' => $image, 'title_secondary' => '<b>Checked</b>' ] );
    $response = rest_do_request( $request );
    showcase_assert( 200 === $response->get_status(), 'Authorized metadata saves via REST' );
    showcase_assert( 'Checked' === get_post_meta( $area->ID, 'title_secondary', true ), 'Secondary title sanitized' );
    update_post_meta( $area->ID, 'title_secondary', $original );
    $block = [ 'blockName'=>'pmp/post-meta', 'attrs'=>[ 'metaKey'=>'card_image','isImage'=>true ], 'innerBlocks'=>[], 'innerHTML'=>'', 'innerContent'=>[] ];
    $render = static function () use ( $block, $area ) { return ( new WP_Block( $block, [ 'postId'=>$area->ID,'postType'=>'pmp_practice_area' ] ) )->render(); };
    showcase_assert( str_contains( $render(), 'wp-block-post-meta-image' ), 'Attachment renders as an image' );
    update_post_meta( $area->ID, 'card_image', 0 );
    showcase_assert( ! str_contains( $render(), '<img' ), 'Removed image renders no image' );
    update_post_meta( $area->ID, 'card_image', 2147483647 );
    showcase_assert( ! str_contains( $render(), '<img' ), 'Deleted attachment renders no broken image' );
    update_post_meta( $area->ID, 'card_image', $image );
    showcase_assert( $image === sanitize_meta( 'card_image', -$image, 'post', 'pmp_practice_area' ), 'Attachment IDs normalized with absint' );
}
WP_CLI::success( 'Integration checks complete.' );

$logo_registered = WP_Block_Type_Registry::get_instance()->is_registered( 'pmp/logo-slider' );
showcase_assert( $logo_registered === $after, 'Logo Slider available only in the after theme' );
if ( $logo_registered ) { require __DIR__ . '/logo-slider-integration.php'; }

$video_registered = WP_Block_Type_Registry::get_instance()->is_registered( 'pmp/video-modal' );
showcase_assert( $video_registered === $after, 'Video Modal available only in the after theme' );
if ( $video_registered ) { require __DIR__ . '/video-modal-integration.php'; }
