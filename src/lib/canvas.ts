/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import type { canvas_bounds, canvas_document, canvas_node, canvas_point, canvas_side, canvas_snapshot } from '../models/canvas';
import { canvas_document_schema } from '../models/canvas_schema';

const canvas_padding = 80;

export function parse_canvas_document(source: string): canvas_document {
	let value: unknown;
	try { value = JSON.parse(source); } catch { throw new Error('The active file contains invalid JSON.'); }
	const result = canvas_document_schema.safeParse(value);
	if (!result.success) throw new Error(`The active file is not a valid JSON Canvas document: ${result.error.issues[0]?.message ?? 'unknown schema error'}`);
	const nodes = result.data.nodes.map(copy_canvas_node);
	const edges = result.data.edges.map(copy_canvas_edge);
	return { nodes, edges };
}

export function create_canvas_snapshot(document: canvas_document): canvas_snapshot {
	const nodes = document.nodes.map(copy_canvas_node);
	const edges = document.edges.map(copy_canvas_edge);
	const clean_document = { nodes, edges };
	const nodes_by_id = new Map(nodes.map((node) => [node.id, node]));
	return { canvas: clean_document, nodes_by_id, bounds: calculate_canvas_bounds(nodes) };
}

export function calculate_canvas_bounds(nodes: canvas_node[]): canvas_bounds {
	if (!nodes.length) return { min_x: 0, min_y: 0, max_x: 0, max_y: 0, width: canvas_padding * 2, height: canvas_padding * 2, offset_x: canvas_padding, offset_y: canvas_padding };
	const min_x = Math.min(...nodes.map((node) => node.x));
	const min_y = Math.min(...nodes.map((node) => node.y));
	const max_x = Math.max(...nodes.map((node) => node.x + node.width));
	const max_y = Math.max(...nodes.map((node) => node.y + node.height));
	return {
		min_x,
		min_y,
		max_x,
		max_y,
		width: Math.max(1, max_x - min_x + canvas_padding * 2),
		height: Math.max(1, max_y - min_y + canvas_padding * 2),
		offset_x: canvas_padding - min_x,
		offset_y: canvas_padding - min_y,
	};
}

export function calculate_anchor(node: canvas_node, side: canvas_side | undefined, offset_x = 0, offset_y = 0): canvas_point {
	const x = node.x + offset_x;
	const y = node.y + offset_y;
	if (side === 'top') return { x: x + node.width / 2, y };
	if (side === 'right') return { x: x + node.width, y: y + node.height / 2 };
	if (side === 'bottom') return { x: x + node.width / 2, y: y + node.height };
	if (side === 'left') return { x, y: y + node.height / 2 };
	return { x: x + node.width / 2, y: y + node.height / 2 };
}

export function is_node_inside_group(node: canvas_node, group: canvas_node): boolean {
	return node.x >= group.x && node.y >= group.y && node.x + node.width <= group.x + group.width && node.y + node.height <= group.y + group.height;
}

export function find_parent_group(node: canvas_node, groups: canvas_node[]): canvas_node | undefined {
	return groups.filter((group) => is_node_inside_group(node, group)).sort((left, right) => left.width * left.height - right.width * right.height)[0];
}

function copy_canvas_node(node: canvas_node): canvas_node {
	return { ...node, text: clean_text(node.text), file: clean_text(node.file), subpath: clean_text(node.subpath), url: clean_text(node.url), color: clean_text(node.color), label: clean_text(node.label), background: clean_text(node.background) };
}

function copy_canvas_edge(edge: canvas_document['edges'][number]): canvas_document['edges'][number] {
	return { ...edge, label: clean_text(edge.label), color: clean_text(edge.color) };
}

function clean_text(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}
