<?php
/** Seed fictional hierarchy pages and configure the after-only breadcrumb demo. */
namespace PMP\Showcase\Breadcrumbs;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit; }
if ( ! class_exists( \PMP\Plugin\Breadcrumbs\Resolver::class ) || ! \WP_Block_Type_Registry::get_instance()->is_registered( 'core/breadcrumbs' ) ) { \WP_CLI::error( 'Activate the after theme/plugin on WordPress 7.0 or later first.' ); }
function owned( $key ) {
    $ids = get_posts( [ 'post_type' => 'page', 'post_status' => 'any', 'meta_key' => '_showcase_key', 'meta_value' => $key, 'numberposts' => 2, 'fields' => 'ids' ] );
    if ( count( $ids ) > 1 ) { \WP_CLI::error( 'Duplicate breadcrumb fixture key: ' . $key ); }
    return $ids[0] ?? 0;
}
$specs = [
    ['breadcrumbs-root','breadcrumbs','Breadcrumbs','breadcrumbs',null],
    ['breadcrumbs-firm','demo-firm','Demo Firm','breadcrumbs/demo-firm','breadcrumbs-root'],
    ['breadcrumbs-areas','practice-areas','Practice Areas','breadcrumbs/demo-firm/practice-areas','breadcrumbs-firm'],
    ['breadcrumbs-guide','planning-guide','Planning Guide','breadcrumbs/demo-firm/practice-areas/planning-guide','breadcrumbs-areas'],
];
// Preflight every URL before changing any page.
foreach ( $specs as [ $key, $slug, $title, $path, $parent_key ] ) {
    $collision = get_page_by_path( $path );
    if ( $collision && (int) $collision->ID !== (int) owned( $key ) ) { \WP_CLI::error( 'Demo URL already belongs to another page: ' . $path ); }
}
$ids = [];
$areas = get_posts( [ 'post_type' => 'pmp_practice_area', 'meta_key' => '_showcase_key', 'numberposts' => 1, 'orderby' => 'date', 'order' => 'ASC' ] );
$area_link = $areas ? sprintf( '<p><a href="%s">Open a practice-area detail page</a> to inspect its configured parent trail.</p>', esc_url( get_permalink( $areas[0] ) ) ) : '';
foreach ( $specs as [ $key, $slug, $title, $path, $parent_key ] ) {
    $content = '<!-- wp:paragraph --><p>A fictional breadcrumb hierarchy demonstrating WordPress core rendering extended with PMP trail resolution and a mobile disclosure. These pages contain no client information.</p><!-- /wp:paragraph -->';
    $content .= '<!-- wp:paragraph --><p><a href="/breadcrumbs/demo-firm/practice-areas/planning-guide/">Open the complete nested trail</a>. Resize below 768px, expand the intermediate levels, and use Escape or click outside to close them.</p><!-- /wp:paragraph -->';
    if ( $area_link ) { $content .= '<!-- wp:html -->' . $area_link . '<!-- /wp:html -->'; }
    $result = wp_insert_post( [ 'ID' => owned( $key ), 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $slug, 'post_title' => $title, 'post_parent' => $parent_key ? $ids[$parent_key] : 0, 'post_content' => $content, 'meta_input' => [ '_showcase_key' => $key ] ], true );
    if ( is_wp_error( $result ) ) { \WP_CLI::error( $result->get_error_message() ); }
    $ids[$key] = $result;
}
$options = \PMP\Plugin\Breadcrumbs\Resolver::get_options();
$options['enabled'] = 1;
$options['home_label'] = 'Home';
$options['parent_pmp_practice_area'] = $ids['breadcrumbs-areas'];
update_option( \PMP\Plugin\Breadcrumbs\Resolver::OPTION_NAME, $options );
\WP_CLI::success( 'Seeded four breadcrumb hierarchy pages and enabled breadcrumbs with a practice-area parent. Other feature records and home-page settings were preserved.' );
