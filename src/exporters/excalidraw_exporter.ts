/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { calculate_anchor, create_canvas_snapshot } from '../lib/canvas';
import { resolve_canvas_color, resolve_edge_color } from '../lib/colors';
import { collect_links, select_markdown_subpath, strip_markdown } from '../lib/text';
import type { canvas_asset, canvas_assets, canvas_document, canvas_end, canvas_node } from '../models/canvas';
import type { export_options } from '../models/export';
import { customAlphabet } from 'nanoid';

type excalidraw_element = Record<string, unknown>;
const create_nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 14);

export function render_excalidraw_export(document: canvas_document, options: export_options, assets: canvas_assets = new Map()): Record<string, unknown> {
	const snapshot = create_canvas_snapshot(document);
	const elements: excalidraw_element[] = [];
	const files: Record<string, unknown> = {};
	const element_by_node = new Map<string, excalidraw_element>();
	const now = Date.now();
	const make_id = (kind: string) => `canvas_${kind}_${create_nanoid()}`;
	for (const group of snapshot.canvas.nodes.filter((node) => node.type === 'group')) {
		const color = resolve_canvas_color(group.color, options.visual_theme);
		const group_shape = make_shape(make_id('group'), group.x, group.y, group.width, group.height, color, now, null, true);
		elements.push(group_shape);
		element_by_node.set(group.id, group_shape);
		if (options.include_group_labels && group.label) elements.push(make_text(make_id('label'), group.x + 10, group.y - 24, group.width - 20, 20, group.label, color, now, null, Math.round(12 * clamp_scale(options.group_title_scale))));
	}
	for (const node of snapshot.canvas.nodes.filter((item) => item.type !== 'group')) {
		const color = resolve_canvas_color(node.color, options.visual_theme);
		const asset = node.type === 'file' && node.file ? assets.get(node.file) : undefined;
		if (asset?.kind === 'image') {
			const image_id = make_id('image');
			const file_id = make_id('file');
			const image = make_image(image_id, file_id, node, color, now);
			files[file_id] = make_excalidraw_file(file_id, asset, now);
			elements.push(image);
			element_by_node.set(node.id, image);
			continue;
		}
		const text_id = make_id('text');
		const link = get_primary_link(node);
		const shape = make_shape(make_id('node'), node.x, node.y, node.width, node.height, color, now, link, false, text_id);
		const text = make_text(text_id, node.x + 8, node.y + 6, Math.max(1, node.width - 16), Math.max(1, node.height - 12), make_excalidraw_text(node, assets), color, now, shape.id as string);
		elements.push(shape, text);
		element_by_node.set(node.id, shape);
	}
	for (const edge of snapshot.canvas.edges) {
		const from = snapshot.nodes_by_id.get(edge.fromNode);
		const to = snapshot.nodes_by_id.get(edge.toNode);
		if (!from || !to) continue;
		const start = calculate_anchor(from, edge.fromSide);
		const end = calculate_anchor(to, edge.toSide);
		const arrow_id = make_id('arrow');
		const from_shape = element_by_node.get(from.id);
		const to_shape = element_by_node.get(to.id);
		bind_arrow(from_shape, arrow_id);
		bind_arrow(to_shape, arrow_id);
		elements.push(make_arrow(arrow_id, start.x, start.y, end.x, end.y, resolve_edge_color(edge.color, options.visual_theme), now, from_shape?.id as string | undefined, to_shape?.id as string | undefined, edge.label, edge.fromEnd, edge.toEnd));
	}
	return { type: 'excalidraw', version: 2, source: 'canvas-export', elements, appState: { gridSize: null, viewBackgroundColor: options.visual_theme === 'dark' ? '#1e1e1e' : '#ffffff' }, files };
}

function make_image(id: string, file_id: string, node: canvas_node, color: ReturnType<typeof resolve_canvas_color>, updated: number): excalidraw_element {
	return { id, type: 'image', x: node.x, y: node.y, width: node.width, height: node.height, angle: 0, strokeColor: color.stroke, backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: { type: 3 }, seed: make_seed(id), version: 1, versionNonce: make_seed(`${id}_nonce`), isDeleted: false, boundElements: null, updated, link: null, locked: false, fileId: file_id, status: 'saved', scale: [1, 1], crop: null };
}

function make_excalidraw_file(id: string, asset: canvas_asset, created: number): Record<string, unknown> {
	const mime_type = asset.source.match(/^data:([^;,]+);base64,/u)?.[1] ?? 'image/png';
	return { id, mimeType: mime_type, dataURL: asset.source, created, lastRetrieved: created };
}

function make_shape(id: string, x: number, y: number, width: number, height: number, color: ReturnType<typeof resolve_canvas_color>, updated: number, link: string | null, is_group: boolean, text_id?: string): excalidraw_element {
	return { id, type: 'rectangle', x, y, width, height, angle: 0, strokeColor: color.stroke, backgroundColor: is_group ? 'transparent' : color.fill, fillStyle: 'solid', strokeWidth: 1, strokeStyle: is_group ? 'dashed' : 'solid', roughness: 0, opacity: is_group ? 55 : 100, groupIds: [], frameId: null, roundness: { type: 3 }, seed: make_seed(id), version: 1, versionNonce: make_seed(`${id}_nonce`), isDeleted: false, boundElements: text_id ? [{ id: text_id, type: 'text' }] : null, updated, link, locked: false };
}

function make_text(id: string, x: number, y: number, width: number, height: number, text: string, color: ReturnType<typeof resolve_canvas_color>, updated: number, container_id: string | null, font_size = 12): excalidraw_element {
	return { id, type: 'text', x, y, width, height, angle: 0, strokeColor: color.text, backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: make_seed(id), version: 1, versionNonce: make_seed(`${id}_nonce`), isDeleted: false, boundElements: null, updated, link: null, locked: false, text, fontSize: font_size, fontFamily: 1, textAlign: container_id ? 'center' : 'left', verticalAlign: container_id ? 'middle' : 'top', containerId: container_id, originalText: text, autoResize: !container_id, lineHeight: 1.25 };
}

function make_arrow(id: string, x: number, y: number, end_x: number, end_y: number, color: string, updated: number, from_id: string | undefined, to_id: string | undefined, label: string | undefined, from_end: canvas_end | undefined, to_end: canvas_end | undefined): excalidraw_element {
	const delta_x = end_x - x;
	const delta_y = end_y - y;
	return { id, type: 'arrow', x, y, width: delta_x, height: delta_y, angle: 0, strokeColor: color, backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 85, groupIds: [], frameId: null, roundness: { type: 2 }, seed: make_seed(id), version: 1, versionNonce: make_seed(`${id}_nonce`), isDeleted: false, boundElements: null, updated, link: null, locked: false, points: [[0, 0], [delta_x, delta_y]], lastCommittedPoint: null, startBinding: from_id ? { elementId: from_id, focus: 0, gap: 4, fixedPoint: null } : null, endBinding: to_id ? { elementId: to_id, focus: 0, gap: 4, fixedPoint: null } : null, startArrowhead: from_end === 'arrow' ? 'arrow' : null, endArrowhead: to_end === 'none' ? null : 'arrow', ...(label ? { customData: { label } } : {}) };
}

function make_excalidraw_text(node: canvas_node, assets: canvas_assets): string {
	if (node.type === 'text') return strip_markdown(node.text ?? '', collect_links(node.text ?? '').length > 1) || 'Text';
	const asset = node.type === 'file' && node.file ? assets.get(node.file) : undefined;
	if (asset?.kind === 'markdown') return strip_markdown(select_markdown_subpath(asset.source, node.subpath), true);
	if (asset?.kind === 'text') return asset.source;
	if (node.type === 'file') return `${asset?.kind === 'pdf' ? 'PDF' : 'File'}\n${(node.file ?? '').split('/').pop() || 'Untitled file'}${node.subpath ? ` ${node.subpath}` : ''}`;
	if (node.type === 'link') return `Embedded URL\n${node.url ?? ''}`;
	return node.type || 'Node';
}

function get_primary_link(node: canvas_node): string | null {
	if (node.type === 'link') return node.url ?? null;
	return collect_links(node.text ?? '')[0]?.url ?? null;
}

function bind_arrow(shape: excalidraw_element | undefined, arrow_id: string): void {
	if (!shape) return;
	const bound = shape.boundElements as { id: string; type: string }[] | null;
	if (bound) bound.push({ id: arrow_id, type: 'arrow' });
	else shape.boundElements = [{ id: arrow_id, type: 'arrow' }];
}

function make_seed(value: string): number {
	return [...value].reduce((seed, character) => Math.imul(seed ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function clamp_scale(value: number): number {
	return Math.max(0.5, Math.min(5, value / 100));
}
