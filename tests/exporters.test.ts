/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { strict as assert } from 'node:assert';
import { create_canvas_snapshot, parse_canvas_document } from '../src/lib/canvas';
import { resolve_canvas_color, resolve_edge_color } from '../src/lib/colors';
import { render_markdown } from '../src/lib/text';
import { render_d2_export, render_mermaid_export } from '../src/exporters/diagram_exporter';
import { render_excalidraw_export } from '../src/exporters/excalidraw_exporter';
import { render_html_export } from '../src/exporters/html_exporter';
import { render_svg_export } from '../src/exporters/svg_exporter';
import { export_formats, format_file_name, format_labels, normalize_export_formats } from '../src/models/export';
import { calculate_image_size } from '../src/services/electron_render_service';
import { embed_canvas_pdf_files } from '../src/services/pdf_composition_service';
import { PDFDocument } from 'pdf-lib';

const source = JSON.stringify({
	nodes: [
		{ id: 'group-a', type: 'group', x: -20, y: -10, width: 460, height: 240, label: 'Overview', color: '6', background: 'assets/background.svg', backgroundStyle: 'ratio' },
		{ id: 'start', type: 'text', x: 10, y: 20, width: 160, height: 80, text: '# Start\n[Read more](https://example.com)', color: '4' },
		{ id: 'file', type: 'file', x: 230, y: 120, width: 160, height: 70, file: 'assets/image.png' },
	],
	edges: [{ id: 'edge-a', fromNode: 'start', toNode: 'file', fromSide: 'right', toSide: 'left', fromEnd: 'arrow', toEnd: 'none', label: 'next' }],
});

const canvas = parse_canvas_document(source);
const options = { canvas_name: 'Example', visual_theme: 'light' as const, group_title_scale: 150, include_grid: true, include_group_labels: true, transparent_background: false, image_scale: 1, image_quality: 92 };
const html = render_html_export(canvas, 'light', options);
const dark_html = render_html_export(canvas, 'dark', options);
const svg = render_svg_export(canvas, options);
const image_assets = new Map([
	['assets/image.png', { kind: 'image' as const, source: 'data:image/png;base64,iVBORw0KGgo=' }],
	['assets/background.svg', { kind: 'image' as const, source: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCI+PC9zdmc+' }],
	['assets/note.md', { kind: 'markdown' as const, source: '# Intro\n\nOutside\n\n## Embedded section\n\n**Inside section**\n\n## Next\n\nOutside again' }],
	['assets/data.json', { kind: 'text' as const, source: '{\n  "enabled": true\n}' }],
]);
const markdown_canvas = parse_canvas_document(JSON.stringify({ nodes: [{ id: 'note', type: 'file', x: 0, y: 0, width: 220, height: 120, file: 'assets/note.md', subpath: '#Embedded section' }], edges: [] }));
const markdown_html = render_html_export(markdown_canvas, 'dark', options, image_assets);
const markdown_svg = render_svg_export(markdown_canvas, { ...options, visual_theme: 'dark' }, image_assets);
const html_with_asset = render_html_export(canvas, 'light', options, image_assets);
const svg_with_asset = render_svg_export(canvas, options, image_assets);
const flat_options = { ...options, include_grid: false, include_group_labels: false, transparent_background: true };
const flat_html = render_html_export(canvas, 'light', flat_options);
const transparent_svg = render_svg_export(canvas, flat_options);
const dark_svg = render_svg_export(canvas, { ...options, visual_theme: 'dark' });
const mermaid = render_mermaid_export(canvas);
const d2 = render_d2_export(canvas);
const excalidraw = render_excalidraw_export(canvas, options);
const excalidraw_with_assets = render_excalidraw_export(canvas, options, image_assets);

assert.match(html, /<h1>Start<\/h1>/u);
assert.match(html, /canvas_arrow/u);
assert.match(html, /image\.png/u);
assert.notEqual(html, dark_html);
assert.match(svg, /<svg/u);
assert.match(svg, /canvas_arrow/u);
assert.match(html_with_asset, /class="canvas_file_image"/u);
assert.match(html_with_asset, /background-size:cover/u);
assert.doesNotMatch(html_with_asset, /background-size:contain/u);
assert.match(svg_with_asset, /<image href="data:image\/png;base64,/u);
assert.match(svg_with_asset, /clip-path="url\(#group_clip_group-a\)"/u);
assert.match(markdown_html, /<h2>Embedded section<\/h2>.*<strong>Inside section<\/strong>/u);
assert.doesNotMatch(markdown_html, /Outside again/u);
assert.match(markdown_svg, /Embedded section Inside.*section/u);
assert.match(svg, />next<\/text>/u);
assert.match(svg, /<rect x="273" y="185" width="54" height="22"[^>]*\/><text x="300" y="196"/u);
assert.match(svg, /marker-start="url\(#canvas_arrow\)"/u);
assert.doesNotMatch(svg, /marker-end="url\(#canvas_arrow\)"/u);
assert.doesNotMatch(flat_html, /radial-gradient/u);
assert.doesNotMatch(flat_html, /Overview/u);
assert.doesNotMatch(transparent_svg, /<rect width="100%" height="100%" fill="#ffffff"\/>/u);
assert.match(dark_svg, /fill="#1c1c1c"/u);
assert.deepEqual(export_formats, ['html', 'png', 'jpeg', 'webp', 'svg', 'pdf', 'excalidraw', 'mermaid', 'd2']);
assert.equal(format_file_name('Example', 'html'), 'Example.html');
assert.equal(format_file_name('Example', 'pdf'), 'Example.pdf');
for (const label of Object.values(format_labels)) assert.doesNotMatch(label, /[()]/u);
assert.deepEqual(normalize_export_formats(['html_light']), ['html']);
assert.deepEqual(normalize_export_formats(['pdf_dark', 'pdf_light']), ['pdf']);
assert.equal(resolve_edge_color('3', 'dark'), '#e0de71');
assert.equal(resolve_edge_color('6', 'dark'), '#a882ff');
assert.equal(resolve_canvas_color('3', 'dark').fill, '#2a2a22');
assert.equal(resolve_canvas_color(undefined, 'dark').fill, '#1c1c1c');
const inline_markdown = render_markdown('`inline code` and [link](https://example.com) and *emphasis*\n\nHidden block ^block-id');
assert.match(inline_markdown, /<code>inline code<\/code>.*<a href="https:\/\/example\.com".*>link<\/a>.*<em>emphasis<\/em>/u);
assert.doesNotMatch(inline_markdown, /canvas_token|@@/u);
assert.doesNotMatch(inline_markdown, /\^block-id/u);
assert.match(mermaid, /flowchart TD/u);
assert.match(mermaid, /subgraph group_a/u);
assert.match(d2, /direction: down/u);
assert.equal(excalidraw.type, 'excalidraw');
const elements = excalidraw.elements as unknown[];
assert.ok(Array.isArray(elements));
assert.ok(elements.length >= 6);
assert.equal(Object.keys(excalidraw_with_assets.files as Record<string, unknown>).length, 1);
assert.ok((excalidraw_with_assets.elements as Record<string, unknown>[]).some((element) => element.type === 'image'));
assert.throws(() => parse_canvas_document('{"nodes":[]}'), /valid JSON Canvas/u);
assert.match(render_html_export(parse_canvas_document('{"nodes":[],"edges":[]}'), 'light', options), /width:160px/u);
assert.deepEqual(calculate_image_size(400, 300, 2), { width: 800, height: 600 });
assert.throws(() => calculate_image_size(16000, 16000, 4), /exceeds the export limit/u);

const source_pdf = await PDFDocument.create();
const source_page = source_pdf.addPage([240, 320]);
source_page.drawText('Embedded PDF page', { x: 36, y: 260, size: 20 });
const source_pdf_bytes = await source_pdf.save();
const pdf_assets = new Map([['assets/document.pdf', { kind: 'pdf' as const, source: `data:application/pdf;base64,${Buffer.from(source_pdf_bytes).toString('base64')}` }]]);
const pdf_canvas = parse_canvas_document(JSON.stringify({ nodes: [{ id: 'pdf', type: 'file', x: 0, y: 0, width: 240, height: 320, file: 'assets/document.pdf' }], edges: [] }));
const base_pdf = await PDFDocument.create();
base_pdf.addPage([280, 360]);
const base_pdf_bytes = await base_pdf.save();
const composed_pdf = await embed_canvas_pdf_files(Uint8Array.from(base_pdf_bytes).buffer, pdf_canvas, pdf_assets, create_canvas_snapshot(pdf_canvas).bounds);
const loaded_pdf = await PDFDocument.load(composed_pdf);
assert.equal(loaded_pdf.getPageCount(), 1);
assert.ok(composed_pdf.byteLength > base_pdf_bytes.byteLength);
