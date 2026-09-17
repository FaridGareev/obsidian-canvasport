/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { calculate_anchor, create_canvas_snapshot } from '../lib/canvas';
import { resolve_canvas_color, resolve_edge_color } from '../lib/colors';
import { escape_attribute, escape_html, strip_markdown } from '../lib/text';
import type { canvas_document, canvas_node, canvas_point, canvas_side } from '../models/canvas';
import type { export_options } from '../models/export';

export function render_svg_export(document: canvas_document, options: export_options): string {
	const snapshot = create_canvas_snapshot(document);
	const { width, height, offset_x, offset_y } = snapshot.bounds;
	const groups = snapshot.canvas.nodes.filter((node) => node.type === 'group').map((node) => render_svg_group(node, offset_x, offset_y, options.include_group_labels)).join('');
	const edges = snapshot.canvas.edges.map((edge) => {
		const from = snapshot.nodes_by_id.get(edge.fromNode);
		const to = snapshot.nodes_by_id.get(edge.toNode);
		return from && to ? render_svg_edge(from, to, edge.fromSide, edge.toSide, edge.color, offset_x, offset_y) : '';
	}).join('');
	const nodes = snapshot.canvas.nodes.filter((node) => node.type !== 'group').map((node) => render_svg_node(node, offset_x, offset_y)).join('');
	const background = options.transparent_background ? '' : '<rect width="100%" height="100%" fill="#ffffff"/>';
	const grid = options.include_grid ? '<rect width="100%" height="100%" fill="url(#canvas_grid)"/>' : '';
	return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><pattern id="canvas_grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#aab5c4" opacity=".45"/></pattern><marker id="canvas_arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="context-stroke"/></marker></defs>${background}${grid}${groups}<g fill="none" stroke-linecap="round" stroke-linejoin="round">${edges}</g>${nodes}</svg>`;
}

function render_svg_group(node: canvas_node, offset_x: number, offset_y: number, include_label: boolean): string {
	const stroke = resolve_edge_color(node.color);
	const label = include_label && node.label ? `<text x="${node.x + offset_x + 9}" y="${node.y + offset_y - 8}" fill="${stroke}" font-size="14" font-weight="700">${escape_html(node.label)}</text>` : '';
	return `<g><rect x="${node.x + offset_x}" y="${node.y + offset_y}" width="${node.width}" height="${node.height}" rx="8" fill="${stroke}12" stroke="${stroke}"/>${label}</g>`;
}

function render_svg_node(node: canvas_node, offset_x: number, offset_y: number): string {
	const color = resolve_canvas_color(node.color);
	const x = node.x + offset_x;
	const y = node.y + offset_y;
	const lines = wrap_svg_text(make_svg_text(node), node.width - 20);
	const text = lines.map((line, index) => `<tspan x="${x + 10}" dy="${index ? 16 : 0}">${escape_html(line)}</tspan>`).join('');
	const url = node.type === 'link' && node.url ? ` data-url="${escape_attribute(node.url)}"` : '';
	return `<g${url}><rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="7" fill="${color.fill}" stroke="${color.stroke}"/><text x="${x + 10}" y="${y + 20}" fill="${color.text}" font-family="Inter,Segoe UI,sans-serif" font-size="13">${text}</text></g>`;
}

function render_svg_edge(from_node: canvas_node, to_node: canvas_node, from_side: canvas_side | undefined, to_side: canvas_side | undefined, color: string | undefined, offset_x: number, offset_y: number): string {
	const from = calculate_anchor(from_node, from_side, offset_x, offset_y);
	const to = calculate_anchor(to_node, to_side, offset_x, offset_y);
	const controls = calculate_svg_controls(from, to);
	return `<path d="M ${from.x} ${from.y} C ${controls.first.x} ${controls.first.y}, ${controls.second.x} ${controls.second.y}, ${to.x} ${to.y}" stroke="${resolve_edge_color(color)}" stroke-width="2" marker-end="url(#canvas_arrow)"/>`;
}

function calculate_svg_controls(from: canvas_point, to: canvas_point): { first: canvas_point; second: canvas_point } {
	return { first: { x: from.x + (to.x - from.x) * 0.32, y: from.y }, second: { x: from.x + (to.x - from.x) * 0.68, y: to.y } };
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
