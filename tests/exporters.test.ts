/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { strict as assert } from 'node:assert';
import { parse_canvas_document } from '../src/lib/canvas';
import { render_d2_export, render_mermaid_export } from '../src/exporters/diagram_exporter';
import { render_excalidraw_export } from '../src/exporters/excalidraw_exporter';
import { render_html_export } from '../src/exporters/html_exporter';
import { render_svg_export } from '../src/exporters/svg_exporter';
import { calculate_image_size } from '../src/services/electron_render_service';

const source = JSON.stringify({
	nodes: [
		{ id: 'group-a', type: 'group', x: -20, y: -10, width: 460, height: 240, label: 'Overview', color: '6' },
		{ id: 'start', type: 'text', x: 10, y: 20, width: 160, height: 80, text: '# Start\n[Read more](https://example.com)', color: '4' },
		{ id: 'file', type: 'file', x: 230, y: 120, width: 160, height: 70, file: 'assets/image.png' },
	],
	edges: [{ id: 'edge-a', fromNode: 'start', toNode: 'file', fromSide: 'right', toSide: 'left', label: 'next' }],
});

const canvas = parse_canvas_document(source);
const options = { canvas_name: 'Example', visual_theme: 'light' as const, group_title_scale: 150, include_grid: true, include_group_labels: true, transparent_background: false, image_scale: 1, image_quality: 92 };
const html = render_html_export(canvas, 'light', options);
const dark_html = render_html_export(canvas, 'dark', options);
const svg = render_svg_export(canvas, options);
const flat_options = { ...options, include_grid: false, include_group_labels: false, transparent_background: true };
const flat_html = render_html_export(canvas, 'light', flat_options);
const transparent_svg = render_svg_export(canvas, flat_options);
const dark_svg = render_svg_export(canvas, { ...options, visual_theme: 'dark' });
const mermaid = render_mermaid_export(canvas);
const d2 = render_d2_export(canvas);
const excalidraw = render_excalidraw_export(canvas, options);

assert.match(html, /<h1>Start<\/h1>/u);
assert.match(html, /canvas_arrow/u);
assert.match(html, /image\.png/u);
assert.notEqual(html, dark_html);
assert.match(svg, /<svg/u);
assert.match(svg, /canvas_arrow/u);
assert.doesNotMatch(flat_html, /radial-gradient/u);
assert.doesNotMatch(flat_html, /Overview/u);
assert.doesNotMatch(transparent_svg, /fill="#ffffff"/u);
assert.match(dark_svg, /fill="#171b22"/u);
assert.match(dark_svg, /fill="#171b22"/u);
assert.match(mermaid, /flowchart TD/u);
assert.match(mermaid, /subgraph group_a/u);
assert.match(d2, /direction: down/u);
assert.equal(excalidraw.type, 'excalidraw');
const elements = excalidraw.elements as unknown[];
assert.ok(Array.isArray(elements));
assert.ok(elements.length >= 6);
assert.throws(() => parse_canvas_document('{"nodes":[]}'), /valid JSON Canvas/u);
assert.match(render_html_export(parse_canvas_document('{"nodes":[],"edges":[]}'), 'light', options), /width:160px/u);
assert.deepEqual(calculate_image_size(400, 300, 2), { width: 800, height: 600 });
assert.throws(() => calculate_image_size(16000, 16000, 4), /exceeds the export limit/u);
