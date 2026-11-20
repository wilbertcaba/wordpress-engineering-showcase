<?php
/** Optional fixture regeneration: php scripts/generate-logo-fixtures.php [font.ttf]. Requires GD. */
if ( PHP_SAPI !== 'cli' || ! extension_loaded( 'gd' ) ) { exit( "Run from the CLI with PHP GD available.\n" ); }
$font = $argv[1] ?? null;
if ( $font && ! is_file( $font ) ) { exit( "Font file not found.\n" ); }
$directory = __DIR__ . '/../fixtures/logos';
if ( ! is_dir( $directory ) ) { mkdir( $directory, 0755, true ); }
$logos = [
    'alpha' => [480, 144, [0, 51, 102]],
    'beta' => [270, 144, [0, 113, 120]],
    'gamma' => [360, 144, [104, 63, 150]],
    'delta' => [144, 144, [180, 78, 36]],
    'epsilon' => [600, 144, [43, 89, 64]],
    'zeta' => [300, 144, [47, 64, 99]],
];
foreach ( $logos as $name => [$width, $height, $rgb] ) {
    $image = imagecreatetruecolor( $width, $height );
    imagealphablending( $image, false ); imagesavealpha( $image, true );
    imagefill( $image, 0, 0, imagecolorallocatealpha( $image, 255, 255, 255, 127 ) );
    imagealphablending( $image, true );
    $color = imagecolorallocate( $image, ...$rgb );
    if ( 'delta' === $name ) {
        imagefilledpolygon( $image, [72, 10, 125, 91, 19, 91], $color );
        $text_x = 16; $text_y = 125; $size = 25;
    } else {
        imagefilledellipse( $image, 52, 72, 72, 72, $color );
        $white = imagecolorallocate( $image, 255, 255, 255 );
        imagefilledrectangle( $image, 37, 57, 67, 87, $white );
        $text_x = 103; $text_y = 91; $size = min( 55, ( $width - 115 ) / ( strlen( $name ) * 0.75 ) );
    }
    if ( $font && function_exists( 'imagettftext' ) ) {
        imagettftext( $image, $size, 0, $text_x, $text_y, $color, $font, strtoupper( $name ) );
    } else {
        imagestring( $image, 5, $text_x, $text_y - 20, strtoupper( $name ), $color );
    }
    imagepng( $image, "$directory/$name.png" );
    imagedestroy( $image );
}
echo "Generated six fictional logo fixtures.\n";
