/**
 * CanvasPort — portable exports for Obsidian Canvas.
 * Derived from Canvas Export and substantially modified for CanvasPort.
 * @author Farid Gareev (CanvasPort modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, type PDFEmbeddedPage } from 'pdf-lib';
import type { canvas_assets, canvas_bounds, canvas_document } from '../models/canvas';

export async function embed_canvas_pdf_files(base_pdf: ArrayBuffer, document: canvas_document, assets: canvas_assets, bounds: canvas_bounds): Promise<ArrayBuffer> {
	const pdf_nodes = document.nodes.filter((node) => node.type === 'file' && node.file && assets.get(node.file)?.kind === 'pdf');
	if (!pdf_nodes.length) return base_pdf;
	const output = await PDFDocument.load(base_pdf);
	const page = output.getPages()[0];
	if (!page) return base_pdf;
	const scale_x = page.getWidth() / bounds.width;
	const scale_y = page.getHeight() / bounds.height;
	const embedded_by_path = new Map<string, PDFEmbeddedPage>();
	for (const node of pdf_nodes) {
		const path = node.file as string;
		let embedded = embedded_by_path.get(path);
		if (!embedded) {
			const asset = assets.get(path);
			if (asset?.kind !== 'pdf') continue;
			try {
				[embedded] = await output.embedPdf(decode_data_url(asset.source), [0]);
				embedded_by_path.set(path, embedded);
			} catch {
				continue;
			}
		}
		const box_x = (node.x + bounds.offset_x) * scale_x;
		const box_y = page.getHeight() - (node.y + bounds.offset_y + node.height) * scale_y;
		const box_width = node.width * scale_x;
		const box_height = node.height * scale_y;
		const padding = Math.min(6, box_width * 0.035, box_height * 0.035);
		const available_width = Math.max(1, box_width - padding * 2);
		const available_height = Math.max(1, box_height - padding * 2);
		const fit = Math.min(available_width / embedded.width, available_height / embedded.height);
		const width = embedded.width * fit;
		const height = embedded.height * fit;
		page.drawPage(embedded, {
			x: box_x + (box_width - width) / 2,
			y: box_y + (box_height - height) / 2,
			width,
			height,
		});
	}
	return Uint8Array.from(await output.save()).buffer;
}

function decode_data_url(value: string): Uint8Array {
	const encoded = value.match(/^data:application\/pdf;base64,(.+)$/u)?.[1];
	if (!encoded) throw new Error('Invalid embedded PDF data.');
	return Uint8Array.from(Buffer.from(encoded, 'base64'));
}
