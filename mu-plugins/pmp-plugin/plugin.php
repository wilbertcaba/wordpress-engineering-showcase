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

require_once __DIR__ . '/includes/classes/Breadcrumbs/Resolver.php';
require_once __DIR__ . '/includes/classes/SettingsPage/BaseSettingsPage.php';
require_once __DIR__ . '/includes/classes/SettingsPage/Breadcrumbs.php';
// Register hooks unconditionally; WordPress checks capabilities on settings access/save.
(new \PMP\Plugin\SettingsPage\Breadcrumbs())->register();
