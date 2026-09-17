/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import type { Plugin } from 'obsidian';
import { z } from 'zod';
import { clamp_image_quality, clamp_image_scale, create_default_settings, is_export_format, type export_format, type export_settings } from '../models/export';
import { normalize_output_folder } from '../services/vault_service';

interface stored_settings {
	default_formats?: unknown;
	last_formats?: unknown;
	group_title_scale?: unknown;
	output_folder?: string;
	include_grid?: unknown;
	include_group_labels?: unknown;
	transparent_background?: unknown;
	image_scale?: unknown;
	image_quality?: unknown;
}

export async function load_export_settings(plugin: Plugin): Promise<export_settings> {
	const value = parse_stored_settings(await plugin.loadData());
	const defaults = create_default_settings();
	const formats = (candidate: unknown): export_format[] => Array.isArray(candidate) ? candidate.map((item: unknown) => item === 'pdf' ? 'pdf_light' : item).filter(is_export_format) : [];
	let output_folder = defaults.output_folder;
	try { output_folder = typeof value?.output_folder === 'string' ? normalize_output_folder(value.output_folder) : defaults.output_folder; } catch { output_folder = defaults.output_folder; }
	return {
		default_formats: formats(value.default_formats).length ? formats(value.default_formats) : defaults.default_formats,
		last_formats: formats(value.last_formats),
		group_title_scale: clamp_title_scale(value.group_title_scale),
		include_grid: read_boolean(value.include_grid, defaults.include_grid),
		include_group_labels: read_boolean(value.include_group_labels, defaults.include_group_labels),
		transparent_background: read_boolean(value.transparent_background, defaults.transparent_background),
		image_scale: clamp_image_scale(value.image_scale),
		image_quality: clamp_image_quality(value.image_quality),
		output_folder,
	};
}

export function parse_stored_settings(value: unknown): stored_settings {
	const schema = z.object({ default_formats: z.unknown().optional(), last_formats: z.unknown().optional(), group_title_scale: z.unknown().optional(), output_folder: z.string().optional(), include_grid: z.unknown().optional(), include_group_labels: z.unknown().optional(), transparent_background: z.unknown().optional(), image_scale: z.unknown().optional(), image_quality: z.unknown().optional() }).partial();
	const result = schema.safeParse(value);
	return result.success ? result.data : {};
}

export async function save_export_settings(plugin: Plugin, settings: export_settings): Promise<void> {
	await plugin.saveData(settings);
}

export function clamp_title_scale(value: unknown): number {
	const number_value = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(number_value) ? Math.max(50, Math.min(500, Math.round(number_value))) : 150;
}

function read_boolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}
