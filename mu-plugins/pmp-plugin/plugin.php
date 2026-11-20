<?php
/**
 * Plugin Name: PMP Practice Areas Showcase
 * Description: Focused derivative of the PMP content model. Original authors: 10up and PMP contributors.
 * Version: 1.0.0
 * Requires PHP: 8.2
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
require_once __DIR__ . '/includes/classes/Module.php';
require_once __DIR__ . '/includes/classes/PostType/BasePostType.php';
require_once __DIR__ . '/includes/classes/PostType/PracticeArea.php';
add_action( 'init', static function () {
    ( new \PMP\Plugin\PostType\PracticeArea() )->register();
    register_taxonomy_for_object_type( 'category', 'pmp_practice_area' );
} );
