import { ButtonComponent, Modal, Setting } from 'obsidian';
import type canvas_export_plugin from '../application/canvas_export_plugin';
import { clamp_image_quality, clamp_image_scale, export_formats, format_labels, type export_format, type export_preferences } from '../models/export';
import { clamp_title_scale } from '../state/settings_store';

export class export_modal extends Modal {
	private readonly plugin: canvas_export_plugin;
	private readonly on_export: (formats: export_format[], preferences: export_preferences, output_folder: string) => void;
	private readonly selected_formats: Set<export_format>;
	private group_title_scale: number;
	private output_folder: string;
	private include_grid: boolean;
	private include_group_labels: boolean;
	private transparent_background: boolean;
	private image_scale: number;
	private image_quality: number;

	constructor(plugin: canvas_export_plugin, on_export: (formats: export_format[], preferences: export_preferences, output_folder: string) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.on_export = on_export;
		this.selected_formats = new Set(plugin.settings.last_formats.length ? plugin.settings.last_formats : plugin.settings.default_formats);
		this.group_title_scale = plugin.settings.group_title_scale;
		this.output_folder = plugin.settings.output_folder;
		this.include_grid = plugin.settings.include_grid;
		this.include_group_labels = plugin.settings.include_group_labels;
		this.transparent_background = plugin.settings.transparent_background;
		this.image_scale = plugin.settings.image_scale;
		this.image_quality = plugin.settings.image_quality;
	}

	onOpen(): void {
		this.contentEl.empty();
		this.contentEl.addClass('canvas_export_modal');
		this.setTitle('Export canvas');
		new Setting(this.contentEl).setName('Formats').setHeading();
		const format_grid = this.contentEl.createDiv({ cls: 'canvas_export_format_grid' });
		for (const format of export_formats) this.create_format_toggle(format_grid, format);
		new Setting(this.contentEl).setName('Appearance').setHeading();
		this.create_scale_input();
		this.create_appearance_toggles();
		this.create_image_inputs();
		this.create_folder_input();
		this.create_export_button();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private create_format_toggle(container: HTMLElement, format: export_format): void {
		const label = container.createEl('label', { cls: 'canvas_export_choice' });
		const input = label.createEl('input', { type: 'checkbox' });
		input.checked = this.selected_formats.has(format);
		input.addEventListener('change', () => input.checked ? this.selected_formats.add(format) : this.selected_formats.delete(format));
		label.appendText(format_labels[format]);
	}

	private create_scale_input(): void {
		new Setting(this.contentEl).setName('Group title size').setDesc('Scale group labels from 50% to 500%.').addText((input) => input.setValue(String(this.group_title_scale)).setPlaceholder('150').onChange((value) => { this.group_title_scale = clamp_title_scale(value); }));
	}

	private create_folder_input(): void {
		new Setting(this.contentEl).setName('Output subfolder').setDesc('Leave empty to write files alongside the canvas.').addText((input) => input.setValue(this.output_folder).setPlaceholder('Exports').onChange((value) => { this.output_folder = value.trim(); }));
	}

	private create_appearance_toggles(): void {
		new Setting(this.contentEl).setName('Include grid').setDesc('Show the canvas dot grid in HTML, SVG, PDF, and raster images.').addToggle((toggle) => toggle.setValue(this.include_grid).onChange((value) => { this.include_grid = value; }));
		new Setting(this.contentEl).setName('Include group labels').setDesc('Show labels above canvas groups.').addToggle((toggle) => toggle.setValue(this.include_group_labels).onChange((value) => { this.include_group_labels = value; }));
		new Setting(this.contentEl).setName('Transparent background').setDesc('Use transparency in SVG, PNG, and webp exports.').addToggle((toggle) => toggle.setValue(this.transparent_background).onChange((value) => { this.transparent_background = value; }));
	}

	private create_image_inputs(): void {
		new Setting(this.contentEl).setName('Image scale').setDesc('PNG, JPEG, and webp scale from 0.5× to 4×.').addText((input) => input.setValue(String(this.image_scale)).setPlaceholder('1').onChange((value) => { this.image_scale = clamp_image_scale(value); }));
		new Setting(this.contentEl).setName('Image quality').setDesc('JPEG and webp compression quality from 1 to 100.').addText((input) => input.setValue(String(this.image_quality)).setPlaceholder('92').onChange((value) => { this.image_quality = clamp_image_quality(value); }));
	}

	private create_export_button(): void {
		const container = this.contentEl.createDiv({ cls: 'canvas_export_actions' });
		new ButtonComponent(container).setButtonText('Export').setCta().onClick(() => {
			const formats = export_formats.filter((format) => this.selected_formats.has(format));
			if (!formats.length) return;
			this.close();
			this.on_export(formats, this.get_preferences(), this.output_folder);
		});
	}

	private get_preferences(): export_preferences {
		return { group_title_scale: this.group_title_scale, include_grid: this.include_grid, include_group_labels: this.include_group_labels, transparent_background: this.transparent_background, image_scale: this.image_scale, image_quality: this.image_quality };
	}
}
