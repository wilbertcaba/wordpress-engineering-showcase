<?php
/**
 * Video Modal
 *
 * @package PMP
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Block content.
 * @var \WP_Block $block      Block instance.
 * @var array     $context    Block context.
 */

if ( empty( $attributes['videoUrl'] ) ) {
	return;
}

$video_title = ! empty( $attributes['videoTitle'] ) ? $attributes['videoTitle'] : __( 'Video', 'pmp-theme' );
$icon_url    = ! empty( $attributes['iconUrl'] ) ? $attributes['iconUrl'] : '';

$size_styles = array();

if ( ! empty( $attributes['buttonSize'] ) ) {
	$size_styles[] = '--pmp-video-modal-size:' . absint( $attributes['buttonSize'] ) . 'px';
}

if ( ! empty( $attributes['iconSize'] ) ) {
	$size_styles[] = '--pmp-video-modal-icon-size:' . absint( $attributes['iconSize'] ) . '%';
}

$wrapper_args = array(
	'data-block-name' => $block->name,
	'data-video-url'  => esc_url( $attributes['videoUrl'] ),
	'data-video-title' => $video_title,
);

if ( ! empty( $size_styles ) ) {
	$wrapper_args['style'] = implode( ';', $size_styles ) . ';';
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );
?>

<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<button type="button" class="wp-block-pmp-video-modal__trigger" data-block-element="trigger" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: video title. */ __( 'Play video: %s', 'pmp-theme' ), $video_title ) ); ?>">
		<?php if ( $icon_url ) : ?>
			<img src="<?php echo esc_url( $icon_url ); ?>" alt="" aria-hidden="true" />
		<?php else : ?>
			<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
				<path d="M8 5.14v13.72L19 12 8 5.14Z" />
			</svg>
		<?php endif; ?>
	</button>
	<dialog class="wp-block-pmp-video-modal__dialog" data-block-element="dialog" aria-label="<?php echo esc_attr( $video_title ); ?>">
		<button type="button" class="wp-block-pmp-video-modal__close" data-block-element="close" aria-label="<?php esc_attr_e( 'Close video', 'pmp-theme' ); ?>">
			<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="5" y1="5" x2="19" y2="19" />
				<line x1="19" y1="5" x2="5" y2="19" />
			</svg>
		</button>
		<div class="wp-block-pmp-video-modal__player" data-block-element="player"></div>
	</dialog>
</div>
