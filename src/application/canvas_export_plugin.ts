/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { Menu, Notice, Plugin, TFile } from 'obsidian';
import { parse_canvas_document, create_canvas_snapshot } from '../lib/canvas';
import { render_d2_export, render_mermaid_export } from '../exporters/diagram_exporter';
import { render_excalidraw_export } from '../exporters/excalidraw_exporter';
import { render_html_export } from '../exporters/html_exporter';
import { render_svg_export } from '../exporters/svg_exporter';
import { format_file_name, format_labels, export_formats, is_raster_format, type export_format, type export_options, type export_preferences, type export_settings, type export_theme, type visual_theme } from '../models/export';
import { create_pdf_document, create_raster_image } from '../services/electron_render_service';
import { embed_canvas_pdf_files } from '../services/pdf_composition_service';
import { build_output_path, ensure_output_folder, find_available_path, normalize_output_folder, write_binary_file, write_text_file } from '../services/vault_service';
import { load_export_settings, save_export_settings } from '../state/settings_store';
import { export_modal } from '../ui/export_modal';
import { overwrite_modal, type overwrite_choice } from '../ui/overwrite_modal';
import { settings_tab } from '../ui/settings_tab';
import type { canvas_asset, canvas_assets, canvas_document } from '../models/canvas';

export default class canvas_export_plugin extends Plugin {
	declare settings: export_settings;

	async onload(): Promise<void> {
		this.settings = await load_export_settings(this);
		this.addSettingTab(new settings_tab(this.app, this));
		this.register_export_commands();
		this.register_file_menu();
	}

	async save_settings(): Promise<void> {
		await save_export_settings(this, this.settings);
	}

	private register_export_commands(): void {
		for (const format of export_formats) this.addCommand({ id: `export_canvas_${format}`, name: `Export to ${format_labels[format]}`, checkCallback: (checking) => this.run_for_active_canvas(checking, [format]) });
		this.addCommand({ id: 'export_canvas', name: 'Export current canvas…', checkCallback: (checking) => this.run_modal_for_active_canvas(checking) });
		this.addCommand({ id: 'reexport_canvas', name: 'Re-export with last settings', checkCallback: (checking) => this.run_for_active_canvas(checking, this.settings.last_formats) });
	}

	private register_file_menu(): void {
		this.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file) => {
			if (!(file instanceof TFile) || file.extension !== 'canvas') return;
			menu.addItem((item) => item.setTitle('Export canvas…').setIcon('download').onClick(() => this.open_export_modal(file)));
		}));
	}

	private run_for_active_canvas(checking: boolean, formats: export_format[]): boolean {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== 'canvas' || !formats.length) return false;
		if (!checking) void this.export_canvas(file, formats, this.get_preferences(), this.settings.output_folder);
		return true;
	}

	private run_modal_for_active_canvas(checking: boolean): boolean {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== 'canvas') return false;
		if (!checking) this.open_export_modal(file);
		return true;
	}

	private open_export_modal(file: TFile): void {
		new export_modal(this, (formats, preferences, output_folder) => void this.export_canvas(file, formats, preferences, output_folder)).open();
	}

	private async export_canvas(file: TFile, requested_formats: export_format[], preferences: export_preferences, output_folder: string): Promise<void> {
		try {
			const formats = [...new Set(requested_formats)].filter((format) => export_formats.includes(format));
			if (!formats.length) return;
			const document = parse_canvas_document(await this.app.vault.read(file));
			const assets = await this.load_canvas_assets(document);
			const folder = this.resolve_output_folder(file, output_folder);
			await ensure_output_folder(this.app.vault, folder);
			const output_names: string[] = [];
			const failures: string[] = [];
			for (const format of formats) {
				try {
					const written_path = await this.export_format(document, file.basename, folder, format, preferences, assets);
					if (written_path) output_names.push(written_path.split('/').pop() || written_path);
				} catch (error) {
					failures.push(`${format_labels[format]}: ${get_error_message(error)}`);
				}
			}
			Object.assign(this.settings, preferences, { last_formats: formats, output_folder });
			await this.save_settings();
			this.show_export_result(output_names, failures);
		} catch (error) {
			new Notice(`Canvas export failed: ${get_error_message(error)}`, 8000);
		}
	}

	private async export_format(document: ReturnType<typeof parse_canvas_document>, canvas_name: string, folder: string, format: export_format, preferences: export_preferences, assets: canvas_assets): Promise<string | undefined> {
		let path = build_output_path(folder, format_file_name(canvas_name, format));
		if (await this.app.vault.adapter.exists(path)) {
			const choice = await this.ask_overwrite(path, await find_available_path(this.app.vault, path));
			if (choice === 'skip') return undefined;
			if (choice === 'rename') path = await find_available_path(this.app.vault, path);
		}
		const options: export_options = { canvas_name, ...preferences, visual_theme: this.resolve_visual_theme(preferences.visual_theme) };
		if (format === 'html') await write_text_file(this.app.vault, path, render_html_export(document, options.visual_theme, { ...options, transparent_background: false }, assets));
		else if (format === 'svg') await write_text_file(this.app.vault, path, render_svg_export(document, options, assets));
		else if (format === 'excalidraw') await write_text_file(this.app.vault, path, JSON.stringify(render_excalidraw_export(document, options, assets), null, 2));
		else if (format === 'mermaid') await write_text_file(this.app.vault, path, render_mermaid_export(document));
		else if (format === 'd2') await write_text_file(this.app.vault, path, render_d2_export(document));
		else if (is_raster_format(format)) {
			const snapshot = create_canvas_snapshot(document);
			const image_options = format === 'jpeg' ? { ...options, transparent_background: false } : options;
			const html = render_html_export(document, options.visual_theme, image_options, assets);
			await write_binary_file(this.app.vault, path, await create_raster_image(html, snapshot.bounds.width, snapshot.bounds.height, format, options.image_scale, options.image_quality));
		}
		else if (format === 'pdf') {
			const snapshot = create_canvas_snapshot(document);
			const html = render_html_export(document, options.visual_theme, { ...options, transparent_background: false }, assets);
			const base_pdf = await create_pdf_document(html, snapshot.bounds.width, snapshot.bounds.height);
			await write_binary_file(this.app.vault, path, await embed_canvas_pdf_files(base_pdf, document, assets, snapshot.bounds));
		}
		return path;
	}

	private async load_canvas_assets(document: canvas_document): Promise<Map<string, canvas_asset>> {
		const paths = new Set(document.nodes.flatMap((node) => [node.type === 'file' ? node.file : undefined, node.type === 'group' ? node.background : undefined]).filter((path): path is string => Boolean(path)));
		const assets = new Map<string, canvas_asset>();
		for (const path of paths) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) continue;
			try {
				const extension = file.extension.toLowerCase();
				if (extension === 'md') assets.set(path, { kind: 'markdown', source: await this.app.vault.read(file) });
				else if (extension === 'pdf') {
					const bytes = await this.app.vault.readBinary(file);
					assets.set(path, { kind: 'pdf', source: `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}` });
				}
				else if (is_text_file(extension)) assets.set(path, { kind: 'text', source: await this.app.vault.read(file) });
				else {
					const mime = get_image_mime_type(extension);
					if (!mime) continue;
					const bytes = await this.app.vault.readBinary(file);
					assets.set(path, { kind: 'image', source: `data:${mime};base64,${Buffer.from(bytes).toString('base64')}` });
				}
			} catch {
				// The regular file card remains available when an optional image cannot be read.
			}
		}
		return assets;
	}

	private get_preferences(): export_preferences {
		return { visual_theme: this.settings.visual_theme, group_title_scale: this.settings.group_title_scale, include_grid: this.settings.include_grid, include_group_labels: this.settings.include_group_labels, transparent_background: this.settings.transparent_background, image_scale: this.settings.image_scale, image_quality: this.settings.image_quality };
	}

	private resolve_visual_theme(theme: visual_theme): export_theme {
		if (theme !== 'system') return theme;
		return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
	}

	private resolve_output_folder(file: TFile, requested_folder: string): string {
		const subfolder = normalize_output_folder(requested_folder);
		const file_folder = file.parent?.path || '';
		return subfolder ? build_output_path(file_folder, subfolder) : file_folder;
	}

	private ask_overwrite(path: string, available_path: string): Promise<overwrite_choice> {
		return new Promise((resolve) => new overwrite_modal(this, path, available_path, resolve).open());
	}

	private show_export_result(output_names: string[], failures: string[]): void {
		if (output_names.length) new Notice(`Canvas export complete: ${output_names.join(', ')}`);
		if (failures.length) new Notice(`Canvas export warnings:\n${failures.join('\n')}`, 9000);
		if (!output_names.length && !failures.length) new Notice('No files were exported.');
	}
}

function get_error_message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function get_image_mime_type(extension: string): string | undefined {
	return ({ avif: 'image/avif', bmp: 'image/bmp', gif: 'image/gif', jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp' } as Record<string, string>)[extension.toLowerCase()];
}

function is_text_file(extension: string): boolean {
	return new Set(['c', 'cpp', 'cs', 'css', 'csv', 'go', 'h', 'html', 'java', 'js', 'json', 'jsx', 'kt', 'log', 'mjs', 'py', 'rb', 'rs', 'scss', 'sh', 'sql', 'ts', 'tsx', 'txt', 'xml', 'yaml', 'yml']).has(extension);
}
