import { App, PluginSettingTab, Setting } from 'obsidian';
import type canvas_export_plugin from '../application/canvas_export_plugin';
import { clamp_image_quality, clamp_image_scale } from '../models/export';
import { clamp_title_scale } from '../state/settings_store';

export class settings_tab extends PluginSettingTab {
	private readonly plugin: canvas_export_plugin;

	constructor(app: App, plugin: canvas_export_plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl).setName('Group title size (%)').setDesc('Font size for group labels. Allowed range: 50–500.').addText((input) => input.setValue(String(this.plugin.settings.group_title_scale)).setPlaceholder('150').onChange(async (value) => { this.plugin.settings.group_title_scale = clamp_title_scale(value); await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Include grid').setDesc('Show the canvas dot grid in visual exports.').addToggle((toggle) => toggle.setValue(this.plugin.settings.include_grid).onChange(async (value) => { this.plugin.settings.include_grid = value; await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Include group labels').setDesc('Show labels above canvas groups.').addToggle((toggle) => toggle.setValue(this.plugin.settings.include_group_labels).onChange(async (value) => { this.plugin.settings.include_group_labels = value; await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Transparent background').setDesc('Use transparency for SVG, PNG, and webp images.').addToggle((toggle) => toggle.setValue(this.plugin.settings.transparent_background).onChange(async (value) => { this.plugin.settings.transparent_background = value; await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Image scale').setDesc('Raster image scale from 0.5× to 4×.').addText((input) => input.setValue(String(this.plugin.settings.image_scale)).setPlaceholder('1').onChange(async (value) => { this.plugin.settings.image_scale = clamp_image_scale(value); await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Image quality').setDesc('JPEG and webp quality from 1 to 100.').addText((input) => input.setValue(String(this.plugin.settings.image_quality)).setPlaceholder('92').onChange(async (value) => { this.plugin.settings.image_quality = clamp_image_quality(value); await this.plugin.save_settings(); }));
		new Setting(this.containerEl).setName('Output subfolder').setDesc('Leave empty to export beside the canvas file.').addText((input) => input.setValue(this.plugin.settings.output_folder).setPlaceholder('Exports').onChange(async (value) => { this.plugin.settings.output_folder = value.trim(); await this.plugin.save_settings(); }));
	}
}
