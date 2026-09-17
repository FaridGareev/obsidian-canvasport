/**
 * CanvasPort — portable exports for Obsidian Canvas.
 * Derived from Canvas Export and substantially modified for CanvasPort.
 * @author Farid Gareev (CanvasPort modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculate_anchor, create_canvas_snapshot } from '../lib/canvas';
import { resolve_canvas_color, resolve_edge_color, with_alpha } from '../lib/colors';
import { escape_attribute, escape_html, render_markdown, select_markdown_subpath, strip_frontmatter } from '../lib/text';
import type { canvas_assets, canvas_edge, canvas_node, canvas_point } from '../models/canvas';
import type { canvas_document } from '../models/canvas';
import type { export_options, export_theme } from '../models/export';

export function render_html_export(document: canvas_document, theme: export_theme, options: export_options, assets: canvas_assets = new Map()): string {
	const snapshot = create_canvas_snapshot(document);
	const { width, height, offset_x, offset_y } = snapshot.bounds;
	const colors = create_document_colors(theme);
	const groups = snapshot.canvas.nodes.filter((node) => node.type === 'group');
	const nodes = snapshot.canvas.nodes.filter((node) => node.type !== 'group');
	const group_markup = groups.map((node) => render_group(node, offset_x, offset_y, options.group_title_scale, colors.group_stroke, options.include_group_labels, theme, assets)).join('');
	const node_markup = nodes.map((node) => render_node(node, offset_x, offset_y, theme, assets)).join('');
	const edge_markup = snapshot.canvas.edges.map((edge) => render_edge(edge, snapshot.nodes_by_id, offset_x, offset_y, theme)).join('');
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape_html(options.canvas_name)}</title><style>${render_styles(width, height, theme, colors, options)}</style></head><body><main class="canvas_export">${group_markup}<svg class="canvas_edges" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><marker id="canvas_arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke"/></marker></defs>${edge_markup}</svg>${node_markup}</main></body></html>`;
}

function render_group(node: canvas_node, offset_x: number, offset_y: number, title_scale: number, fallback_color: string, include_label: boolean, theme: export_theme, assets: canvas_assets): string {
	const color = resolve_edge_color(node.color, theme);
	const label = include_label && node.label ? `<span class="canvas_group_label" style="--group_color:${color};--group_scale:${clamp_scale(title_scale)}">${escape_html(node.label)}</span>` : '';
	const background = node.color ? with_alpha(color, theme === 'dark' ? '12' : '0d') : 'transparent';
	const asset = node.background ? assets.get(node.background) : undefined;
	const image = asset?.kind === 'image' ? asset.source : undefined;
	const is_repeat = node.backgroundStyle === 'repeat';
	const image_style = image ? `;background-image:url('${escape_attribute(image)}');background-position:${is_repeat ? 'top left' : 'center center'};background-repeat:${is_repeat ? 'repeat' : 'no-repeat'};background-size:${is_repeat ? 'auto' : 'cover'}` : '';
	return `<section class="canvas_group" style="left:${node.x + offset_x}px;top:${node.y + offset_y}px;width:${node.width}px;height:${node.height}px;border-color:${color || fallback_color};--group_fill:${background}${image_style}">${label}</section>`;
}

function render_node(node: canvas_node, offset_x: number, offset_y: number, theme: export_theme, assets: canvas_assets): string {
	const color = resolve_canvas_color(node.color, theme);
	const asset = node.type === 'file' && node.file ? assets.get(node.file) : undefined;
	const image = asset?.kind === 'image' ? asset.source : undefined;
	return `<article class="canvas_node${image ? ' is_image' : ''}" style="left:${node.x + offset_x}px;top:${node.y + offset_y}px;width:${node.width}px;height:${node.height}px;--node_fill:${color.fill};--node_stroke:${color.stroke};--node_text:${color.text}">${image ? `<img class="canvas_file_image" src="${escape_attribute(image)}" alt="${escape_attribute((node.file ?? '').split('/').pop() ?? '')}">` : render_node_content(node, assets)}</article>`;
}

function render_node_content(node: canvas_node, assets: canvas_assets): string {
	if (node.type === 'text') return render_markdown(node.text ?? '');
	if (node.type === 'file') {
		const asset = node.file ? assets.get(node.file) : undefined;
		if (asset?.kind === 'markdown') return `<div class="canvas_markdown_file">${render_markdown(select_markdown_subpath(asset.source, node.subpath))}</div>`;
		if (asset?.kind === 'text') return `<pre class="canvas_text_file"><code>${escape_html(asset.source)}</code></pre>`;
		const file_name = (node.file ?? '').split('/').pop() || 'Untitled file';
		if (asset?.kind === 'pdf') return `<div class="canvas_file_fallback"><span class="canvas_file_badge">PDF</span><strong>${escape_html(file_name)}</strong><small>The first page is embedded in PDF exports.</small></div>`;
		return `<div class="canvas_file_fallback"><span class="canvas_file_badge">FILE</span><strong>${escape_html(file_name)}</strong>${node.subpath ? `<small>${escape_html(node.subpath)}</small>` : ''}</div>`;
	}
	if (node.type === 'link') {
		const url = node.url ?? '';
		return `<p class="canvas_embed">Embedded URL</p><a href="${escape_attribute(url)}" target="_blank" rel="noopener noreferrer">${escape_html(url)}</a>`;
	}
	return `<p>${escape_html(strip_frontmatter(node.text ?? node.type))}</p>`;
}

function render_edge(edge: canvas_edge, nodes_by_id: Map<string, canvas_node>, offset_x: number, offset_y: number, theme: export_theme): string {
	const from_node = nodes_by_id.get(edge.fromNode);
	const to_node = nodes_by_id.get(edge.toNode);
	if (!from_node || !to_node) return '';
	const from = calculate_anchor(from_node, edge.fromSide, offset_x, offset_y);
	const to = calculate_anchor(to_node, edge.toSide, offset_x, offset_y);
	const controls = calculate_curve_controls(from, to, edge.fromSide, edge.toSide);
	const color = resolve_edge_color(edge.color, theme);
	const markers = `${edge.fromEnd === 'arrow' ? ' marker-start="url(#canvas_arrow)"' : ''}${edge.toEnd === 'none' ? '' : ' marker-end="url(#canvas_arrow)"'}`;
	const path = `<path d="M ${from.x} ${from.y} C ${controls.first.x} ${controls.first.y}, ${controls.second.x} ${controls.second.y}, ${to.x} ${to.y}" stroke="${color}"${markers}/>`;
	return edge.label ? `${path}${render_edge_label(edge.label, from, to)}` : path;
}

function render_edge_label(label: string, from: canvas_point, to: canvas_point): string {
	const x = Math.round((from.x + to.x) / 2);
	const y = Math.round((from.y + to.y) / 2);
	const width = Math.max(54, Math.min(260, label.length * 7 + 18));
	const top = y - 13;
	const height = 22;
	const center_y = top + height / 2;
	return `<g class="canvas_edge_label"><rect x="${x - width / 2}" y="${top}" width="${width}" height="${height}" rx="4"/><text x="${x}" y="${center_y}">${escape_html(label)}</text></g>`;
}

function calculate_curve_controls(from: canvas_point, to: canvas_point, from_side: string | undefined, to_side: string | undefined): { first: canvas_point; second: canvas_point } {
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

function create_document_colors(theme: export_theme): { body: string; grid: string; text: string; group_stroke: string; label_text: string; label_fill: string } {
	return theme === 'dark'
		? { body: '#1c1c1c', grid: '#333333', text: '#dadada', group_stroke: '#7e7e7e', label_text: '#1c1c1c', label_fill: '#7e7e7e' }
		: { body: '#ffffff', grid: '#e4e4e4', text: '#222222', group_stroke: '#c0c0c0', label_text: '#1c1c1c', label_fill: '#c0c0c0' };
}

function render_styles(width: number, height: number, theme: export_theme, colors: ReturnType<typeof create_document_colors>, options: export_options): string {
	const background = options.transparent_background ? 'transparent' : colors.body;
	const grid = options.include_grid ? `background-image:radial-gradient(circle at 1px 1px,${colors.grid} 1px,transparent 1.2px);` : '';
	return `@page{size:${width}px ${height}px;margin:0}*{box-sizing:border-box}html{background:${background};-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font:13px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:${colors.text};background:${background}}.canvas_export{position:relative;width:${width}px;height:${height}px;overflow:hidden;background-color:${background};${grid}background-size:24px 24px}.canvas_group{position:absolute;z-index:1;border:1px solid;border-radius:8px;background-color:var(--group_fill,transparent)}.canvas_group_label{position:absolute;left:8px;top:0;transform:translateY(-55%);padding:2px 8px;border-radius:5px;background:var(--group_color,${colors.label_fill});color:${colors.label_text};font-weight:700;font-size:calc(12px * var(--group_scale,${clamp_scale(options.group_title_scale)}));line-height:1.25;white-space:nowrap}.canvas_edges{position:absolute;inset:0;z-index:2;width:${width}px;height:${height}px;overflow:visible;pointer-events:none}.canvas_edges path{fill:none;stroke-width:2;opacity:.9}.canvas_edges defs path{fill:context-stroke}.canvas_edge_label rect{fill:${theme === 'dark' ? '#1c1c1c' : '#ffffff'};stroke:${colors.group_stroke};stroke-width:1}.canvas_edge_label text{fill:${colors.text};font-size:12px;text-anchor:middle;dominant-baseline:middle}.canvas_node{position:absolute;z-index:3;overflow:hidden;padding:9px 11px;border:1px solid var(--node_stroke);border-radius:7px;background:var(--node_fill);color:var(--node_text);box-shadow:0 .5px 1px .5px rgba(0,0,0,.1)}.canvas_node.is_image{padding:0}.canvas_file_image{display:block;width:100%;height:100%;object-fit:contain}.canvas_text_file{height:100%;margin:0!important;overflow:hidden;white-space:pre-wrap!important}.canvas_text_file code{padding:0;background:transparent;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.canvas_file_fallback{display:flex;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:7px;text-align:center}.canvas_file_fallback strong{max-width:100%;overflow-wrap:anywhere}.canvas_file_fallback small{max-width:90%;opacity:.7}.canvas_file_badge{padding:3px 7px;border:1px solid var(--node_stroke);border-radius:4px;font-size:10px;font-weight:800;letter-spacing:.08em}.canvas_node p{margin:0 0 5px}.canvas_node p:last-child{margin-bottom:0}.canvas_node h1,.canvas_node h2,.canvas_node h3,.canvas_node h4,.canvas_node h5,.canvas_node h6{margin:0 0 5px;line-height:1.2}.canvas_node h1{font-size:1.35em}.canvas_node h2{font-size:1.18em}.canvas_node h3,.canvas_node h4,.canvas_node h5,.canvas_node h6{font-size:1em}.canvas_node ul,.canvas_node ol{margin:3px 0 5px 19px;padding:0}.canvas_node li{margin:2px 0}.canvas_node blockquote{margin:4px 0;padding-left:8px;border-left:3px solid var(--node_stroke);opacity:.84}.canvas_node code{padding:1px 4px;border-radius:3px;background:rgba(0,0,0,.12);font:inherit}.canvas_node pre{margin:5px 0;white-space:pre-wrap;overflow:hidden}.canvas_node a{color:inherit;text-decoration:underline}.canvas_node hr{border:0;border-top:1px solid var(--node_stroke);margin:7px 0}.canvas_task{list-style:none;margin-left:-18px!important}.canvas_task span{display:inline-block;width:18px}.canvas_spacer{height:4px}.canvas_embed{font-weight:600}.canvas_embed small{font-weight:400;opacity:.72}`;
}

function clamp_scale(value: number): number {
	return Math.max(0.5, Math.min(5, value / 100));
}
