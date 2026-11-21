<?php
/** Integration checks for the core-block extension, resolver, settings and SEO adapters. */
use PMP\Plugin\Breadcrumbs\Resolver;
use PMP\Theme\Integration\SeoBreadcrumbs;
$pages = get_posts( [ 'post_type' => 'page', 'meta_key' => '_showcase_key', 'meta_value' => 'breadcrumbs-', 'meta_compare' => 'LIKE', 'numberposts' => -1 ] );
showcase_assert( 4 === count( $pages ), 'Exactly four owned breadcrumb pages' );
$guide = get_posts( [ 'post_type' => 'page', 'meta_key' => '_showcase_key', 'meta_value' => 'breadcrumbs-guide', 'numberposts' => 1 ] )[0];
$old_query = $GLOBALS['wp_query']; $old_main = $GLOBALS['wp_the_query']; $old_post = $GLOBALS['post'] ?? null;
$old_options = Resolver::get_options();
$cache = new ReflectionProperty( Resolver::class, 'trail_cache' ); $cache->setAccessible( true );
$query = static function ( $id ) use ( $cache ) {
    $cache->setValue( null, [] );
    $q = new WP_Query( [ 'page_id' => $id ] );
    $GLOBALS['wp_query'] = $GLOBALS['wp_the_query'] = $q; $q->the_post();
};
try {
    $query( $guide->ID );
    showcase_assert( ['Breadcrumbs','Demo Firm','Practice Areas'] === array_column( Resolver::get_trail(), 'label' ), 'Resolver follows published page ancestors in order' );
    $html = do_blocks( '<!-- wp:breadcrumbs /-->' );
    showcase_assert( str_contains( $html, 'aria-current="page"' ) && str_contains( $html, 'Planning Guide' ), 'Core retains current-page semantics' );
    showcase_assert( 1 === substr_count( $html, 'wp-block-breadcrumbs__toggle ' ) || str_contains( $html, 'class="wp-block-breadcrumbs__toggle ' ), 'Intermediate levels receive a disclosure' );
    foreach ( Resolver::get_trail() as $crumb ) { showcase_assert( str_contains( $html, esc_url( $crumb['url'] ) ), 'Rendered link matches resolver: ' . $crumb['label'] ); }
    $hidden = do_blocks( '<!-- wp:breadcrumbs {"showHomeItem":false,"showCurrentItem":false} /-->' );
    showcase_assert( ! str_contains( $hidden, 'wp-block-breadcrumbs__home' ) && ! str_contains( $hidden, 'Planning Guide' ), 'Core home/current controls honored' );
    $seo = new SeoBreadcrumbs();
    $yoast = $seo->filter_yoast( [ ['text'=>'Old Home','url'=>home_url('/')], ['text'=>'Planning Guide','id'=>$guide->ID,'url'=>get_permalink($guide)], ['text'=>'Page 2'] ] );
    showcase_assert( ['Home','Breadcrumbs','Demo Firm','Practice Areas','Planning Guide','Page 2'] === array_column( $yoast, 'text' ), 'Yoast adapter aligns ancestors and preserves pagination' );
    $smart = $seo->filter_smartcrawl( [ ['title'=>'Home','link'=>home_url('/')], ['title'=>'Planning Guide'] ] );
    showcase_assert( ['Home','Breadcrumbs','Demo Firm','Practice Areas','Planning Guide'] === array_column( $smart, 'title' ), 'SmartCrawl adapter aligns the same trail' );
    update_option( Resolver::OPTION_NAME, array_merge( $old_options, ['enabled'=>0] ) );
    showcase_assert( '' === do_blocks( '<!-- wp:breadcrumbs /-->' ), 'Disabled feature renders no block' );
    showcase_assert( '' === do_blocks( '<!-- wp:template-part {"slug":"breadcrumbs"} /-->' ), 'Disabled feature leaves no empty template band' );
    update_option( Resolver::OPTION_NAME, $old_options );
    // Settings sanitization is exercised directly; browser tests cover authenticated options.php saves.
    $settings = new \PMP\Plugin\SettingsPage\Breadcrumbs(); $settings->register_settings();
    $clean = $settings->sanitize_callback( ['enabled'=>'1','home_label'=>'<b>Start</b>','parent_pmp_practice_area'=>'-12','unknown'=>'discard','nested'=>['bad']] );
    showcase_assert( ['enabled'=>1,'home_label'=>'Start','parent_pmp_practice_area'=>12] === $clean, 'Known breadcrumb settings sanitized; unknown/non-scalar fields omitted' );
    showcase_assert( [] === $settings->sanitize_callback( 'invalid' ), 'Invalid settings payload rejected' );
    $ran = false; add_shortcode( 'showcase_secret', static function () use ( &$ran ) { $ran = true; return 'Secret'; } );
    showcase_assert( 'Thank You' === \PMP\Theme\strip_breadcrumb_shortcodes( 'Thank You, [showcase_secret]' ) && ! $ran, 'Breadcrumb labels strip registered shortcodes without executing them' );
    remove_shortcode( 'showcase_secret' );
    // Test an unpublished ancestor using a temporary cached post object, without changing the database.
    $firm = get_post( $guide->post_parent ); $draft = clone $firm; $draft->post_status = 'draft';
    wp_cache_set( $firm->ID, $draft, 'posts' ); $cache->setValue( null, [] );
    showcase_assert( ! in_array( $firm->post_title, array_column( Resolver::get_trail(), 'label' ), true ), 'Unpublished ancestor omitted from trail' );
    clean_post_cache( $firm->ID );
} finally {
    update_option( Resolver::OPTION_NAME, $old_options );
    if ( isset( $firm ) ) { clean_post_cache( $firm->ID ); }
    $cache->setValue( null, [] );
    $GLOBALS['wp_query'] = $old_query; $GLOBALS['wp_the_query'] = $old_main; $GLOBALS['post'] = $old_post;
}
