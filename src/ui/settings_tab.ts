/**
 * CanvasPort — portable exports for Obsidian Canvas.
 * Derived from Canvas Export and substantially modified for CanvasPort.
 * @author Farid Gareev (CanvasPort modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';
import type canvasport_plugin from '../application/canvasport_plugin';
import { clamp_image_quality, clamp_image_scale, is_visual_theme } from '../models/export';
import { clamp_title_scale } from '../state/settings_store';

type setting_key =
	| 'visual_theme'
	| 'group_title_scale'
	| 'include_grid'
	| 'include_group_labels'
	| 'transparent_background'
	| 'image_scale'
	| 'image_quality'
	| 'output_folder';

export class settings_tab extends PluginSettingTab {
	private readonly plugin: canvasport_plugin;

	constructor(app: App, plugin: canvasport_plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<setting_key>[] {
		return [
			{
				name: 'Color theme',
				desc: 'Sets colors for HTML, images, SVG and PDF files.',
				aliases: ['appearance', 'light', 'dark'],
				control: {
					type: 'dropdown',
					key: 'visual_theme',
					options: { system: 'Use Obsidian theme', light: 'Always light', dark: 'Always dark' },
				},
			},
			{
				name: 'Group title size',
				desc: 'Set label size from 50 percent to 500 percent.',
				aliases: ['group label scale'],
				control: { type: 'number', key: 'group_title_scale', min: 50, max: 500, step: 1, placeholder: '150' },
			},
			{
				name: 'Include grid',
				desc: 'Show the canvas dot grid in visual exports.',
				aliases: ['canvas background dots'],
				control: { type: 'toggle', key: 'include_grid' },
			},
			{
				name: 'Include group labels',
				desc: 'Show labels above canvas groups.',
				aliases: ['group titles'],
				control: { type: 'toggle', key: 'include_group_labels' },
			},
			{
				name: 'Transparent background',
				desc: 'Transparent files only. Some image viewers display transparent areas as white.',
				aliases: ['alpha'],
				control: { type: 'toggle', key: 'transparent_background' },
			},
			{
				name: 'Image scale',
				desc: 'Choose a scale from 0.5 to 4. Higher values create larger images.',
				aliases: ['resolution', 'size'],
				control: { type: 'number', key: 'image_scale', min: 0.5, max: 4, step: 0.25, placeholder: '1' },
			},
			{
				name: 'Compression quality',
				desc: 'Choose a value from 1 to 100. Higher values preserve more detail.',
				aliases: ['JPEG', 'WebP'],
				control: { type: 'number', key: 'image_quality', min: 1, max: 100, step: 1, placeholder: '92' },
			},
			{
				name: 'Output subfolder',
				desc: 'Leave empty to export beside the canvas file.',
				aliases: ['destination', 'save location'],
				control: { type: 'text', key: 'output_folder', placeholder: 'Exports' },
			},
		];
	}

	// Compatibility fallback for Obsidian versions earlier than 1.13.0.
	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl).setName('Color theme').setDesc('Sets colors for HTML, images, SVG and PDF files.').addDropdown((dropdown) => dropdown.addOptions({ system: 'Use Obsidian theme', light: 'Always light', dark: 'Always dark' }).setValue(this.plugin.settings.visual_theme).onChange(async (value) => { if (is_visual_theme(value)) { this.plugin.settings.visual_theme = value; await this.plugin.save_settings(); } }));
		new Setting(this.containerEl).setName('Group title size').setDesc('Set label size from 50 percent to 500 percent.').addText((input) => input.setValue(String(this.plugin.settings.group_title_scale)).setPlaceholder('150').onChange(async (value) => { this.plugin.settings.group_title_scale = clamp_title_scale(value); await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Include grid').setDesc('Show the canvas dot grid in visual exports.').addToggle((toggle) => toggle.setValue(this.plugin.settings.include_grid).onChange(async (value) => { this.plugin.settings.include_grid = value; await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Include group labels').setDesc('Show labels above canvas groups.').addToggle((toggle) => toggle.setValue(this.plugin.settings.include_group_labels).onChange(async (value) => { this.plugin.settings.include_group_labels = value; await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Transparent background').setDesc('Transparent files only. Some image viewers display transparent areas as white.').addToggle((toggle) => toggle.setValue(this.plugin.settings.transparent_background).onChange(async (value) => { this.plugin.settings.transparent_background = value; await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Image scale').setDesc('Choose a scale from 0.5 to 4. Higher values create larger images.').addText((input) => input.setValue(String(this.plugin.settings.image_scale)).setPlaceholder('1').onChange(async (value) => { this.plugin.settings.image_scale = clamp_image_scale(value); await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Compression quality').setDesc('Choose a value from 1 to 100. Higher values preserve more detail.').addText((input) => input.setValue(String(this.plugin.settings.image_quality)).setPlaceholder('92').onChange(async (value) => { this.plugin.settings.image_quality = clamp_image_quality(value); await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Output subfolder').setDesc('Leave empty to export beside the canvas file.').addText((input) => input.setValue(this.plugin.settings.output_folder).setPlaceholder('Exports').onChange(async (value) => { this.plugin.settings.output_folder = value.trim(); await this.plugin.save_settings(); }));
	}
}
