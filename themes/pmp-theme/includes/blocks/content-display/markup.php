<?php
/**
 * Content Display Block
 *
 * @package PMP
 *
 * @var array    $attributes         Block attributes.
 * @var string   $content            Block content.
 * @var WP_Block $block              Block instance.
 * @var array    $context            Block context.
 */

$block_partial = __DIR__ . "/variations/{$attributes['variationName']}/markup.php";

// Bail if the block partial doesn't exist.
if ( ! file_exists( $block_partial ) ) {
	return;
}

require $block_partial;
