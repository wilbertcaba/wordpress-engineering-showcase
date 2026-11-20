<?php

namespace PMP\Plugin\PostType;

class PracticeArea extends BasePostType {

	/**
	 * {@inheritDoc}
	 * // phpcs:ignore Squiz.Commenting.VariableComment.MissingVar
	 */
	public static $name = 'pmp_practice_area';

	/**
	 * {@inheritDoc}
	 */
	protected function get_singular_label() {
		return __( 'Practice Area', 'pmp-plugin' );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_plural_label() {
		return __( 'Practice Areas', 'pmp-plugin' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function can_register() {
		return true;
	}

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		parent::register();
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_options() {
		return array_merge(
			$this->get_default_options(),
			[
				'rewrite'      => [
					'with_front' => false,
					'slug'       => 'practice-area',
				],
				'hierarchical' => true,
				'show_in_nav_menus' => true,
			]
		);
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_menu_icon() {
		return 'dashicons-book-alt';
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_editor_supports() {
		return [
			'title',
			'editor',
			'revisions',
			'excerpt',
			'thumbnail',
			'page-attributes',
			'custom-fields',
		];
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_meta_fields() {
		return [
			'title_secondary' => [
				'type' => 'string',
			],
		];
	}

	/**
	 * {@inheritDoc}
	 */
	protected function get_supported_taxonomies() {
		return [];
	}
}
