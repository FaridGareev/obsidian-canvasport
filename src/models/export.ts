/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

export const export_formats = ['html_light', 'html_dark', 'png', 'jpeg', 'webp', 'svg', 'excalidraw', 'pdf_light', 'pdf_dark', 'mermaid', 'd2'] as const;

export type export_format = typeof export_formats[number];
export type export_theme = 'light' | 'dark';
export type visual_theme = export_theme | 'system';
export type raster_format = Extract<export_format, 'png' | 'jpeg' | 'webp'>;

export interface export_preferences {
	visual_theme: visual_theme;
	group_title_scale: number;
	include_grid: boolean;
	include_group_labels: boolean;
	transparent_background: boolean;
	image_scale: number;
	image_quality: number;
}

export interface export_settings extends export_preferences {
	default_formats: export_format[];
	last_formats: export_format[];
	output_folder: string;
}

export interface export_options extends Omit<export_preferences, 'visual_theme'> {
	canvas_name: string;
	visual_theme: export_theme;
}

export const format_labels: Record<export_format, string> = {
	html_light: 'HTML (light)',
	html_dark: 'HTML (dark)',
	png: 'PNG image',
	jpeg: 'JPEG image',
	webp: 'WebP image',
	svg: 'SVG',
	excalidraw: 'Excalidraw',
	pdf_light: 'PDF (light)',
	pdf_dark: 'PDF (dark)',
	mermaid: 'Mermaid (.mmd)',
	d2: 'D2 (.d2)',
};

export function create_default_settings(): export_settings {
	return {
		default_formats: ['html_light'],
		last_formats: [],
		visual_theme: 'system',
		group_title_scale: 150,
		include_grid: true,
		include_group_labels: true,
		transparent_background: false,
		image_scale: 1,
		image_quality: 92,
		output_folder: '',
	};
}

export function is_export_format(value: unknown): value is export_format {
	return typeof value === 'string' && export_formats.includes(value as export_format);
}

export function is_visual_theme(value: unknown): value is visual_theme {
	return value === 'light' || value === 'dark' || value === 'system';
}

export function is_raster_format(value: export_format): value is raster_format {
	return value === 'png' || value === 'jpeg' || value === 'webp';
}

export function clamp_image_scale(value: unknown): number {
	const scale = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(scale) ? Math.max(0.5, Math.min(4, Math.round(scale * 100) / 100)) : 1;
}

export function clamp_image_quality(value: unknown): number {
	const quality = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(quality) ? Math.max(1, Math.min(100, Math.round(quality))) : 92;
}

export function format_file_name(canvas_name: string, format: export_format, selected_formats: export_format[]): string {
	const has_light_html = selected_formats.includes('html_light');
	const has_light_pdf = selected_formats.includes('pdf_light');
	const has_dark_pdf = selected_formats.includes('pdf_dark');
	const names: Record<export_format, string> = {
		html_light: `${canvas_name}.html`,
		html_dark: `${canvas_name}${has_light_html ? ' (dark)' : ''}.html`,
		png: `${canvas_name}.png`,
		jpeg: `${canvas_name}.jpg`,
		webp: `${canvas_name}.webp`,
		svg: `${canvas_name}.svg`,
		excalidraw: `${canvas_name}.excalidraw`,
		pdf_light: `${canvas_name}${has_dark_pdf ? ' (light)' : ''}.pdf`,
		pdf_dark: `${canvas_name}${has_light_pdf ? ' (dark)' : ''}.pdf`,
		mermaid: `${canvas_name}.mmd`,
		d2: `${canvas_name}.d2`,
	};
	return names[format];
}
