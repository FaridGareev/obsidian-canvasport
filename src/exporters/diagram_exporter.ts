/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { create_canvas_snapshot, find_parent_group } from '../lib/canvas';
import { resolve_canvas_color } from '../lib/colors';
import { strip_markdown } from '../lib/text';
import type { canvas_document, canvas_node } from '../models/canvas';

export function render_mermaid_export(document: canvas_document): string {
	const snapshot = create_canvas_snapshot(document);
	const groups = snapshot.canvas.nodes.filter((node) => node.type === 'group');
	const nodes = snapshot.canvas.nodes.filter((node) => node.type !== 'group');
	const identifiers = create_identifiers([...groups, ...nodes]);
	const lines = ['flowchart TD'];
	const styles: string[] = [];
	const grouped_ids = new Set<string>();
	for (const group of groups) {
		const children = nodes.filter((node) => find_parent_group(node, groups)?.id === group.id);
		if (children.length === 0) continue;
		const group_id = identifiers.get(group.id) as string;
		lines.push(`  subgraph ${group_id}["${escape_mermaid(group.label || 'Group')}"]`);
		for (const node of children) {
			const node_id = identifiers.get(node.id) as string;
			lines.push(`    ${node_id}["${escape_mermaid(make_node_label(node))}"]`);
			styles.push(make_mermaid_style(node_id, node));
			grouped_ids.add(node.id);
		}
		lines.push('  end');
		styles.push(make_mermaid_style(group_id, group, true));
	}
	for (const node of nodes.filter((item) => !grouped_ids.has(item.id))) {
		const node_id = identifiers.get(node.id) as string;
		lines.push(`  ${node_id}["${escape_mermaid(make_node_label(node))}"]`);
		styles.push(make_mermaid_style(node_id, node));
	}
	for (const edge of snapshot.canvas.edges) {
		const from_id = identifiers.get(edge.fromNode);
		const to_id = identifiers.get(edge.toNode);
		if (!from_id || !to_id) continue;
		lines.push(edge.label ? `  ${from_id} -->|"${escape_mermaid(edge.label)}"| ${to_id}` : `  ${from_id} --> ${to_id}`);
	}
	return [...lines, ...styles.filter(Boolean), ''].join('\n');
}

export function render_d2_export(document: canvas_document): string {
	const snapshot = create_canvas_snapshot(document);
	const groups = snapshot.canvas.nodes.filter((node) => node.type === 'group');
	const nodes = snapshot.canvas.nodes.filter((node) => node.type !== 'group');
	const identifiers = create_identifiers([...groups, ...nodes]);
	const parents = new Map(nodes.map((node) => [node.id, find_parent_group(node, groups)]));
	const lines = ['direction: down', ''];
	for (const group of groups) {
		const children = nodes.filter((node) => parents.get(node.id)?.id === group.id);
		if (children.length === 0) continue;
		const group_id = identifiers.get(group.id) as string;
		lines.push(`${group_id}: "${escape_d2(group.label || 'Group')}" {`);
		lines.push(...make_d2_style('', group, '  '));
		for (const node of children) {
			const node_id = identifiers.get(node.id) as string;
			lines.push(`  ${node_id}: "${escape_d2(make_node_label(node))}"`);
			lines.push(...make_d2_style(node_id, node, '  '));
			if (node.type === 'link' && node.url) lines.push(`  ${node_id}.link: "${escape_d2(node.url)}"`);
		}
		lines.push('}', '');
	}
	for (const node of nodes.filter((item) => !parents.get(item.id))) {
		const node_id = identifiers.get(node.id) as string;
		lines.push(`${node_id}: "${escape_d2(make_node_label(node))}"`);
		lines.push(...make_d2_style(node_id, node));
		if (node.type === 'link' && node.url) lines.push(`${node_id}.link: "${escape_d2(node.url)}"`);
	}
	lines.push('');
	for (const edge of snapshot.canvas.edges) {
		const from_id = get_d2_path(edge.fromNode, identifiers, parents);
		const to_id = get_d2_path(edge.toNode, identifiers, parents);
		if (!from_id || !to_id) continue;
		lines.push(edge.label ? `${from_id} -> ${to_id}: "${escape_d2(edge.label)}"` : `${from_id} -> ${to_id}`);
	}
	return `${lines.join('\n')}\n`;
}

function create_identifiers(nodes: canvas_node[]): Map<string, string> {
	const identifiers = new Map<string, string>();
	const used = new Set<string>();
	for (const node of nodes) {
		const stem = node.id.replace(/[^a-zA-Z0-9_]/gu, '_').replace(/^\d/u, '_$&') || 'node';
		let identifier = stem;
		let suffix = 2;
		while (used.has(identifier)) identifier = `${stem}_${suffix++}`;
		used.add(identifier);
		identifiers.set(node.id, identifier);
	}
	return identifiers;
}

function make_node_label(node: canvas_node): string {
	if (node.type === 'text') return strip_markdown(node.text ?? '', true) || 'Text';
	if (node.type === 'file') return `File: ${(node.file ?? '').split('/').pop() || 'Untitled file'}${node.subpath ? ` ${node.subpath}` : ''}`;
	if (node.type === 'link') return `URL: ${node.url ?? ''}`;
	return node.type || 'Node';
}

function make_mermaid_style(identifier: string, node: canvas_node, is_group = false): string {
	const color = resolve_canvas_color(node.color);
	const fill = is_group ? `${color.stroke}22` : color.fill;
	return `  style ${identifier} fill:${fill},stroke:${color.stroke},color:${color.text}`;
}

function make_d2_style(identifier: string, node: canvas_node, indentation = ''): string[] {
	const color = resolve_canvas_color(node.color);
	const target = identifier ? `${identifier}.style` : 'style';
	const prefix = `${indentation}${target}`;
	return [`${prefix}: {`, `${indentation}  fill: "${color.fill}"`, `${indentation}  stroke: "${color.stroke}"`, `${indentation}}`];
}

function get_d2_path(node_id: string, identifiers: Map<string, string>, parents: Map<string, canvas_node | undefined>): string | undefined {
	const identifier = identifiers.get(node_id);
	if (!identifier) return undefined;
	const parent = parents.get(node_id);
	return parent ? `${identifiers.get(parent.id)}.${identifier}` : identifier;
}

function escape_mermaid(value: string): string {
	return value.replace(/"/gu, '#quot;').replace(/\r?\n/gu, '<br/>');
}

function escape_d2(value: string): string {
	return value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"').replace(/\r?\n/gu, '\\n');
}
