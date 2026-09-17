/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import type canvas_export_plugin from '../application/canvas_export_plugin';
import { clamp_image_quality, clamp_image_scale, export_formats, format_labels, is_visual_theme, type export_format, type export_preferences, type visual_theme } from '../models/export';
import { clamp_title_scale } from '../state/settings_store';

export class export_modal extends Modal {
	private readonly plugin: canvas_export_plugin;
	private readonly on_export: (formats: export_format[], preferences: export_preferences, output_folder: string) => void;
	private readonly selected_formats: Set<export_format>;
	private export_button?: ButtonComponent;
	private format_summary?: HTMLElement;
	private visual_theme: visual_theme;
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
		this.visual_theme = plugin.settings.visual_theme;
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
		this.modalEl.addClass('canvas_export_modal_container');
		this.setTitle('Export canvas');

		const format_section = this.create_section('Export formats', 'Choose one or more outputs. Your last selection is remembered.');
		this.format_summary = format_section.createDiv({ cls: 'canvas_export_selection_summary', attr: { 'aria-live': 'polite' } });
		const format_grid = format_section.createDiv({ cls: 'canvas_export_format_grid' });
		for (const format of export_formats) this.create_format_toggle(format_grid, format);

		const appearance_section = this.create_section('Appearance', 'These settings affect visual exports. HTML and PDF retain their explicit light and dark variants.');
		this.create_theme_selector(appearance_section);
		this.create_scale_input(appearance_section);
		this.create_appearance_toggles(appearance_section);
		this.create_image_inputs(appearance_section);

		const destination_section = this.create_section('Destination', 'Choose where the exported files should be created.');
		this.create_folder_input(destination_section);
		this.create_export_button();
		this.update_format_summary();
	}

	onClose(): void {
		this.contentEl.empty();
		this.modalEl.removeClass('canvas_export_modal_container');
	}

	private create_section(title: string, description: string): HTMLElement {
		const section = this.contentEl.createDiv({ cls: 'canvas_export_section' });
		section.createEl('h3', { text: title });
		section.createEl('p', { cls: 'canvas_export_section_description', text: description });
		return section;
	}

	private create_format_toggle(container: HTMLElement, format: export_format): void {
		const label = container.createEl('label', { cls: 'canvas_export_choice' });
		const input = label.createEl('input', { type: 'checkbox' });
		input.checked = this.selected_formats.has(format);
		label.toggleClass('is-selected', input.checked);
		input.setAttr('aria-label', format_labels[format]);
		input.addEventListener('change', () => {
			if (input.checked) this.selected_formats.add(format);
			else this.selected_formats.delete(format);
			label.toggleClass('is-selected', input.checked);
			this.update_format_summary();
		});
		label.createSpan({ text: format_labels[format] });
	}

	private create_theme_selector(container: HTMLElement): void {
		new Setting(container)
			.setName('Visual export theme')
			.setDesc('Used for PNG, JPEG, WebP, and SVG. “Match Obsidian” follows your current app theme.')
			.addDropdown((dropdown) => dropdown.addOptions({ system: 'Match Obsidian', light: 'Light', dark: 'Dark' }).setValue(this.visual_theme).onChange((value) => { if (is_visual_theme(value)) this.visual_theme = value; }));
	}

	private create_scale_input(container: HTMLElement): void {
		new Setting(container).setName('Group title size').setDesc('Scale group labels from 50% to 500%.').addText((input) => {
			input.inputEl.type = 'number';
			input.inputEl.min = '50';
			input.inputEl.max = '500';
			input.inputEl.step = '1';
			return input.setValue(String(this.group_title_scale)).setPlaceholder('150').onChange((value) => { this.group_title_scale = clamp_title_scale(value); });
		});
	}

	private create_appearance_toggles(container: HTMLElement): void {
		new Setting(container).setName('Include grid').setDesc('Show the canvas dot grid in HTML, SVG, PDF, and raster images.').addToggle((toggle) => toggle.setValue(this.include_grid).onChange((value) => { this.include_grid = value; }));
		new Setting(container).setName('Include group labels').setDesc('Show labels above canvas groups.').addToggle((toggle) => toggle.setValue(this.include_group_labels).onChange((value) => { this.include_group_labels = value; }));
		new Setting(container).setName('Transparent background').setDesc('Use transparency in SVG, PNG, and WebP exports.').addToggle((toggle) => toggle.setValue(this.transparent_background).onChange((value) => { this.transparent_background = value; }));
	}

	private create_image_inputs(container: HTMLElement): void {
		new Setting(container).setName('Image scale').setDesc('PNG, JPEG, and WebP scale from 0.5× to 4×.').addText((input) => {
			input.inputEl.type = 'number';
			input.inputEl.min = '0.5';
			input.inputEl.max = '4';
			input.inputEl.step = '0.25';
			return input.setValue(String(this.image_scale)).setPlaceholder('1').onChange((value) => { this.image_scale = clamp_image_scale(value); });
		});
		new Setting(container).setName('Image quality').setDesc('JPEG and WebP compression quality from 1 to 100.').addText((input) => {
			input.inputEl.type = 'number';
			input.inputEl.min = '1';
			input.inputEl.max = '100';
			input.inputEl.step = '1';
			return input.setValue(String(this.image_quality)).setPlaceholder('92').onChange((value) => { this.image_quality = clamp_image_quality(value); });
		});
	}

	private create_folder_input(container: HTMLElement): void {
		new Setting(container).setName('Output subfolder').setDesc('Leave empty to write files alongside the canvas.').addText((input) => input.setValue(this.output_folder).setPlaceholder('Exports').onChange((value) => { this.output_folder = value.trim(); }));
	}

	private create_export_button(): void {
		const container = this.contentEl.createDiv({ cls: 'canvas_export_actions' });
		this.export_button = new ButtonComponent(container).setButtonText('Export selected formats').setCta().onClick(() => {
			const formats = export_formats.filter((format) => this.selected_formats.has(format));
			if (!formats.length) {
				new Notice('Choose at least one export format.');
				return;
			}
			this.close();
			this.on_export(formats, this.get_preferences(), this.output_folder);
		});
	}

	private update_format_summary(): void {
		const count = this.selected_formats.size;
		if (this.format_summary) this.format_summary.setText(count ? `${count} ${count === 1 ? 'format selected' : 'formats selected'}` : 'Select at least one format to continue');
		this.export_button?.setDisabled(!count);
	}

	private get_preferences(): export_preferences {
		return { visual_theme: this.visual_theme, group_title_scale: this.group_title_scale, include_grid: this.include_grid, include_group_labels: this.include_group_labels, transparent_background: this.transparent_background, image_scale: this.image_scale, image_quality: this.image_quality };
	}
}
