/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { calculate_anchor, create_canvas_snapshot } from '../lib/canvas';
import { resolve_canvas_color, resolve_edge_color, with_alpha } from '../lib/colors';
import { escape_attribute, escape_html, strip_markdown } from '../lib/text';
import type { canvas_assets, canvas_document, canvas_edge, canvas_node, canvas_point } from '../models/canvas';
import type { export_options } from '../models/export';

export function render_svg_export(document: canvas_document, options: export_options, assets: canvas_assets = new Map()): string {
	const snapshot = create_canvas_snapshot(document);
	const { width, height, offset_x, offset_y } = snapshot.bounds;
	const groups = snapshot.canvas.nodes.filter((node) => node.type === 'group').map((node) => render_svg_group(node, offset_x, offset_y, options.include_group_labels, options.group_title_scale, options.visual_theme, assets)).join('');
	const edges = snapshot.canvas.edges.map((edge) => {
		const from = snapshot.nodes_by_id.get(edge.fromNode);
		const to = snapshot.nodes_by_id.get(edge.toNode);
		return from && to ? render_svg_edge(edge, from, to, offset_x, offset_y, options.visual_theme) : '';
	}).join('');
	const nodes = snapshot.canvas.nodes.filter((node) => node.type !== 'group').map((node) => render_svg_node(node, offset_x, offset_y, options.visual_theme, assets)).join('');
	const palette = options.visual_theme === 'dark' ? { background: '#1e1e1e', grid: '#ffffff' } : { background: '#ffffff', grid: '#000000' };
	const background = options.transparent_background ? '' : `<rect width="100%" height="100%" fill="${palette.background}"/>`;
	const grid = options.include_grid ? '<rect width="100%" height="100%" fill="url(#canvas_grid)"/>' : '';
	return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><pattern id="canvas_grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${palette.grid}" opacity=".105"/></pattern><marker id="canvas_arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8z" fill="context-stroke"/></marker></defs>${background}${grid}${groups}<g stroke-linecap="round" stroke-linejoin="round">${edges}</g>${nodes}</svg>`;
}

function render_svg_group(node: canvas_node, offset_x: number, offset_y: number, include_label: boolean, title_scale: number, theme: 'light' | 'dark', assets: canvas_assets): string {
	const stroke = resolve_edge_color(node.color, theme);
	const x = node.x + offset_x;
	const y = node.y + offset_y;
	const font_size = Math.round(12 * clamp_scale(title_scale) * 10) / 10;
	const label_width = node.label ? Math.max(28, node.label.length * font_size * 0.58 + 16) : 0;
	const label = include_label && node.label ? `<g><rect x="${x + 8}" y="${y - font_size * 0.68}" width="${label_width}" height="${font_size * 1.45}" rx="5" fill="${stroke}"/><text x="${x + 16}" y="${y + font_size * 0.36}" fill="#1e1e1e" font-family="Inter,Segoe UI,sans-serif" font-size="${font_size}" font-weight="700">${escape_html(node.label)}</text></g>` : '';
	const image = node.background ? assets.get(node.background) : undefined;
	const background = image ? render_svg_group_background(node, image, x, y) : `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="8" fill="${node.color ? with_alpha(stroke, theme === 'dark' ? '12' : '0d') : 'none'}"/>`;
	return `<g>${background}<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="8" fill="none" stroke="${stroke}"/>${label}</g>`;
}

function render_svg_group_background(node: canvas_node, image: string, x: number, y: number): string {
	if (node.backgroundStyle === 'repeat') {
		const pattern_id = `group_pattern_${node.id.replace(/[^a-z0-9_-]/giu, '_')}`;
		return `<defs><pattern id="${pattern_id}" width="240" height="135" patternUnits="userSpaceOnUse"><image href="${escape_attribute(image)}" width="240" height="135" preserveAspectRatio="xMidYMid slice"/></pattern></defs><rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="8" fill="url(#${pattern_id})"/>`;
	}
	const aspect = node.backgroundStyle === 'ratio' ? 'xMidYMid meet' : 'xMidYMid slice';
	return `<image href="${escape_attribute(image)}" x="${x}" y="${y}" width="${node.width}" height="${node.height}" preserveAspectRatio="${aspect}"/>`;
}

function render_svg_node(node: canvas_node, offset_x: number, offset_y: number, theme: 'light' | 'dark', assets: canvas_assets): string {
	const color = resolve_canvas_color(node.color, theme);
	const x = node.x + offset_x;
	const y = node.y + offset_y;
	const lines = wrap_svg_text(make_svg_text(node), node.width - 20);
	const text = lines.map((line, index) => `<tspan x="${x + 10}" dy="${index ? 16 : 0}">${escape_html(line)}</tspan>`).join('');
	const url = node.type === 'link' && node.url ? ` data-url="${escape_attribute(node.url)}"` : '';
	const image = node.type === 'file' && node.file ? assets.get(node.file) : undefined;
	if (image) return `<g><rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="7" fill="${color.fill}"/><image href="${escape_attribute(image)}" x="${x + 1}" y="${y + 1}" width="${node.width - 2}" height="${node.height - 2}" preserveAspectRatio="xMidYMid meet"/><rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="7" fill="none" stroke="${color.stroke}"/></g>`;
	return `<g${url}><rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="7" fill="${color.fill}" stroke="${color.stroke}"/><text x="${x + 10}" y="${y + 20}" fill="${color.text}" font-family="Inter,Segoe UI,sans-serif" font-size="13">${text}</text></g>`;
}

function render_svg_edge(edge: canvas_edge, from_node: canvas_node, to_node: canvas_node, offset_x: number, offset_y: number, theme: 'light' | 'dark'): string {
	const from = calculate_anchor(from_node, edge.fromSide, offset_x, offset_y);
	const to = calculate_anchor(to_node, edge.toSide, offset_x, offset_y);
	const controls = calculate_svg_controls(from, to, edge.fromSide, edge.toSide);
	const markers = `${edge.fromEnd === 'arrow' ? ' marker-start="url(#canvas_arrow)"' : ''}${edge.toEnd === 'none' ? '' : ' marker-end="url(#canvas_arrow)"'}`;
	const path = `<path d="M ${from.x} ${from.y} C ${controls.first.x} ${controls.first.y}, ${controls.second.x} ${controls.second.y}, ${to.x} ${to.y}" fill="none" stroke="${resolve_edge_color(edge.color, theme)}" stroke-width="2"${markers}/>`;
	return edge.label ? `${path}${render_svg_edge_label(edge.label, from, to, theme)}` : path;
}

function render_svg_edge_label(label: string, from: canvas_point, to: canvas_point, theme: 'light' | 'dark'): string {
	const x = Math.round((from.x + to.x) / 2);
	const y = Math.round((from.y + to.y) / 2);
	const width = Math.max(54, Math.min(260, label.length * 7 + 18));
	const background = theme === 'dark' ? '#1e1e1e' : '#ffffff';
	const text = theme === 'dark' ? '#dcddde' : '#2e3338';
	const border = theme === 'dark' ? '#5c5c5c' : '#b3b3b3';
	return `<g><rect x="${x - width / 2}" y="${y - 13}" width="${width}" height="22" rx="4" fill="${background}" stroke="${border}"/><text x="${x}" y="${y + 2}" fill="${text}" font-family="Inter,Segoe UI,sans-serif" font-size="12" text-anchor="middle" dominant-baseline="middle">${escape_html(label)}</text></g>`;
}

function calculate_svg_controls(from: canvas_point, to: canvas_point, from_side: string | undefined, to_side: string | undefined): { first: canvas_point; second: canvas_point } {
	const delta_x = to.x - from.x;
	const delta_y = to.y - from.y;
	if (from_side === 'bottom' && to_side === 'top') {
		const distance = Math.max(28, Math.min(100, Math.abs(delta_y) / 2));
		return { first: { x: from.x, y: from.y + distance }, second: { x: to.x, y: to.y - distance } };
	}
	if (from_side === 'right' && to_side === 'left') {
		const distance = Math.max(28, Math.min(100, Math.abs(delta_x) / 2));
		return { first: { x: from.x + distance, y: from.y }, second: { x: to.x - distance, y: to.y } };
	}
	return { first: { x: from.x + delta_x * 0.35, y: from.y + delta_y * 0.2 }, second: { x: from.x + delta_x * 0.65, y: from.y + delta_y * 0.8 } };
}

function make_svg_text(node: canvas_node): string {
	if (node.type === 'text') return strip_markdown(node.text ?? '', true);
	if (node.type === 'file') return `📄 ${(node.file ?? '').split('/').pop() || 'Untitled file'}`;
	if (node.type === 'link') return node.url ?? 'Embedded URL';
	return node.type;
}

function wrap_svg_text(value: string, available_width: number): string[] {
	const max_characters = Math.max(8, Math.floor(available_width / 7));
	const words = value.replace(/\s+/gu, ' ').trim().split(' ');
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const candidate = line ? `${line} ${word}` : word;
		if (candidate.length <= max_characters) line = candidate;
		else { if (line) lines.push(line); line = word.slice(0, max_characters); }
	}
	if (line) lines.push(line);
	return lines.slice(0, 8);
}

function clamp_scale(value: number): number {
	return Math.max(0.5, Math.min(5, value / 100));
}
