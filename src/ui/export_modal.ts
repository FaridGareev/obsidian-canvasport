/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import type canvas_export_plugin from '../application/canvas_export_plugin';
import { clamp_image_quality, clamp_image_scale, format_descriptions, format_labels, is_visual_theme, type export_format, type export_preferences, type visual_theme } from '../models/export';
import { clamp_title_scale } from '../state/settings_store';

const share_formats: export_format[] = ['html', 'png', 'jpeg', 'webp', 'svg', 'pdf'];
const editable_formats: export_format[] = ['excalidraw', 'mermaid', 'd2'];
const export_formats: export_format[] = [...share_formats, ...editable_formats];
const themed_formats: export_format[] = ['html', 'png', 'jpeg', 'webp', 'svg', 'pdf'];
const group_formats: export_format[] = ['html', 'png', 'jpeg', 'webp', 'pdf', 'excalidraw'];
const grid_formats: export_format[] = ['html', 'png', 'jpeg', 'webp', 'svg', 'pdf'];
const transparent_formats: export_format[] = ['png', 'webp', 'svg'];
const raster_formats: export_format[] = ['png', 'jpeg', 'webp'];
const quality_formats: export_format[] = ['jpeg', 'webp'];

export class export_modal extends Modal {
	private readonly plugin: canvas_export_plugin;
	private readonly on_export: (formats: export_format[], preferences: export_preferences, output_folder: string) => void;
	private readonly selected_formats: Set<export_format>;
	private export_button?: ButtonComponent;
	private format_summary?: HTMLElement;
	private appearance_section?: HTMLElement;
	private image_section?: HTMLElement;
	private theme_setting?: HTMLElement;
	private group_scale_setting?: HTMLElement;
	private grid_setting?: HTMLElement;
	private group_labels_setting?: HTMLElement;
	private transparency_setting?: HTMLElement;
	private image_quality_setting?: HTMLElement;
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

		const format_section = this.create_section('Choose file types', 'Select every file type you want to create.');
		this.format_summary = format_section.createDiv({ cls: 'canvas_export_selection_summary', attr: { 'aria-live': 'polite' } });
		this.create_format_group(format_section, 'Ready to share', share_formats);
		this.create_format_group(format_section, 'Continue editing', editable_formats);

		this.appearance_section = this.create_section('Canvas appearance', 'Only settings that apply to your selected file types are shown.');
		this.create_theme_selector(this.appearance_section);
		this.create_group_scale_input(this.appearance_section);
		this.create_appearance_toggles(this.appearance_section);

		this.image_section = this.create_section('Image size and quality', 'Control the resolution and compression of raster images.');
		this.create_image_inputs(this.image_section);

		const destination_section = this.create_section('Save location', 'Choose where the exported files should be created.');
		this.create_folder_input(destination_section);
		this.create_export_button();
		this.update_interface();
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

	private create_format_group(container: HTMLElement, title: string, formats: export_format[]): void {
		const group = container.createEl('fieldset', { cls: 'canvas_export_format_group' });
		group.createEl('legend', { text: title });
		const grid = group.createDiv({ cls: 'canvas_export_format_grid' });
		for (const format of formats) this.create_format_toggle(grid, format);
	}

	private create_format_toggle(container: HTMLElement, format: export_format): void {
		const label = container.createEl('label', { cls: 'canvas_export_choice' });
		const input = label.createEl('input', { type: 'checkbox' });
		input.checked = this.selected_formats.has(format);
		label.toggleClass('is-selected', input.checked);
		input.setAttr('aria-label', `${format_labels[format]}. ${format_descriptions[format]}`);
		input.addEventListener('change', () => {
			if (input.checked) this.selected_formats.add(format);
			else this.selected_formats.delete(format);
			label.toggleClass('is-selected', input.checked);
			this.update_interface();
		});
		const text = label.createDiv({ cls: 'canvas_export_choice_text' });
		text.createSpan({ cls: 'canvas_export_choice_name', text: format_labels[format] });
		text.createSpan({ cls: 'canvas_export_choice_description', text: format_descriptions[format] });
	}

	private create_theme_selector(container: HTMLElement): void {
		this.theme_setting = new Setting(container)
			.setName('Color theme')
			.setDesc('Sets colors for HTML, images, SVG and PDF files.')
			.addDropdown((dropdown) => dropdown.addOptions({ system: 'Use Obsidian theme', light: 'Always light', dark: 'Always dark' }).setValue(this.visual_theme).onChange((value) => { if (is_visual_theme(value)) this.visual_theme = value; })).settingEl;
	}

	private create_group_scale_input(container: HTMLElement): void {
		this.group_scale_setting = new Setting(container).setName('Group title size').setDesc('Set label size from 50 percent to 500 percent.').addText((input) => {
			input.inputEl.type = 'number';
			input.inputEl.min = '50';
			input.inputEl.max = '500';
			input.inputEl.step = '1';
			return input.setValue(String(this.group_title_scale)).setPlaceholder('150').onChange((value) => { this.group_title_scale = clamp_title_scale(value); });
		}).settingEl;
	}

	private create_appearance_toggles(container: HTMLElement): void {
		this.grid_setting = new Setting(container).setName('Canvas grid').setDesc('Show the dotted Canvas background.').addToggle((toggle) => toggle.setValue(this.include_grid).onChange((value) => { this.include_grid = value; })).settingEl;
		this.group_labels_setting = new Setting(container).setName('Group labels').setDesc('Show titles above Canvas groups.').addToggle((toggle) => toggle.setValue(this.include_group_labels).onChange((value) => { this.include_group_labels = value; })).settingEl;
		this.transparency_setting = new Setting(container).setName('Transparent background').setDesc('Remove the solid background from supported images.').addToggle((toggle) => toggle.setValue(this.transparent_background).onChange((value) => { this.transparent_background = value; })).settingEl;
	}

	private create_image_inputs(container: HTMLElement): void {
		new Setting(container).setName('Image scale').setDesc('Choose a scale from 0.5 to 4. Higher values create larger images.').addText((input) => {
			input.inputEl.type = 'number';
			input.inputEl.min = '0.5';
			input.inputEl.max = '4';
			input.inputEl.step = '0.25';
			return input.setValue(String(this.image_scale)).setPlaceholder('1').onChange((value) => { this.image_scale = clamp_image_scale(value); });
		});
		this.image_quality_setting = new Setting(container).setName('Compression quality').setDesc('Choose a value from 1 to 100. Higher values preserve more detail.').addText((input) => {
			input.inputEl.type = 'number';
			input.inputEl.min = '1';
			input.inputEl.max = '100';
			input.inputEl.step = '1';
			return input.setValue(String(this.image_quality)).setPlaceholder('92').onChange((value) => { this.image_quality = clamp_image_quality(value); });
		}).settingEl;
	}

	private create_folder_input(container: HTMLElement): void {
		new Setting(container).setName('Folder inside the Canvas folder').setDesc('Leave empty to save beside the Canvas file.').addText((input) => input.setValue(this.output_folder).setPlaceholder('Exports').onChange((value) => { this.output_folder = value.trim(); }));
	}

	private create_export_button(): void {
		const container = this.contentEl.createDiv({ cls: 'canvas_export_actions' });
		this.export_button = new ButtonComponent(container).setCta().onClick(() => {
			const formats = export_formats.filter((format) => this.selected_formats.has(format));
			if (!formats.length) {
				new Notice('Select at least one file type.');
				return;
			}
			this.close();
			this.on_export(formats, this.get_preferences(), this.output_folder);
		});
	}

	private update_interface(): void {
		const count = this.selected_formats.size;
		if (this.format_summary) this.format_summary.setText(count ? `${count} ${count === 1 ? 'file type selected' : 'file types selected'}` : 'Select at least one file type');
		this.export_button?.setButtonText(count === 1 ? 'Export 1 file' : `Export ${count} files`).setDisabled(!count);

		const has_any = (formats: export_format[]): boolean => formats.some((format) => this.selected_formats.has(format));
		const has_appearance = has_any([...themed_formats, 'excalidraw']);
		if (this.appearance_section) this.appearance_section.hidden = !has_appearance;
		if (this.theme_setting) this.theme_setting.hidden = !has_any(themed_formats);
		if (this.group_scale_setting) this.group_scale_setting.hidden = !has_any(group_formats);
		if (this.grid_setting) this.grid_setting.hidden = !has_any(grid_formats);
		if (this.group_labels_setting) this.group_labels_setting.hidden = !has_any(group_formats);
		if (this.transparency_setting) this.transparency_setting.hidden = !has_any(transparent_formats);
		if (this.image_section) this.image_section.hidden = !has_any(raster_formats);
		if (this.image_quality_setting) this.image_quality_setting.hidden = !has_any(quality_formats);
	}

	private get_preferences(): export_preferences {
		return { visual_theme: this.visual_theme, group_title_scale: this.group_title_scale, include_grid: this.include_grid, include_group_labels: this.include_group_labels, transparent_background: this.transparent_background, image_scale: this.image_scale, image_quality: this.image_quality };
	}
}
