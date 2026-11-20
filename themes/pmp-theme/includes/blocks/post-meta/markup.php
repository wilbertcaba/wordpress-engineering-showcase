<?php
/**
 * Post Meta
 *
 * @package PMP
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Block content.
 * @var \WP_Block $block      Block instance.
 * @var array     $context    Block context.
 */

if ( ! isset( $block->context['postId'] ) || ! isset( $attributes['metaKey'] ) ) {
	return '';
}

$wrapper_class_name  = empty( $attributes['textAlign'] ) ? '' : "has-text-align-{$attributes['textAlign']}";
$wrapper_class_name .= empty( $attributes['metaKey'] ) ? '' : " pmp-post-meta-{$attributes['metaKey']}";
$wrapper_attributes  = get_block_wrapper_attributes( [ 'class' => $wrapper_class_name ] );

$meta_value = get_post_meta( $block->context['postId'], $attributes['metaKey'], true );
$is_link    = $attributes['isLink'] ?? false;
$is_title   = $attributes['isTitle'] ?? false;
$is_image   = $attributes['isImage'] ?? false;
$size_slug  = $attributes['sizeSlug'] ?? 'large';

?>

<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( $is_image && ! empty( $meta_value ) ) : ?>
		<?php
		echo wp_get_attachment_image(
			$meta_value,
			$size_slug,
			false,
			[
				'class' => 'wp-block-post-meta-image',
				'style' => 'width:100%;height:auto;',
			]
		);
		?>
	<?php elseif ( $is_link && $is_title ) : ?>
		<h2 class="wp-block-post-title">
			<a href="<?php echo esc_url( get_the_permalink() ); ?>" target="_self"><?php echo $meta_value ? esc_html( $meta_value ) : esc_html( get_the_title() ); ?></a>
		</h2>
	<?php else : ?>
		<?php echo esc_html( $meta_value ); ?>
	<?php endif; ?>
</div>
