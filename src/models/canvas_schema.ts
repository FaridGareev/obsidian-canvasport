/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { z } from 'zod';

const coordinate_schema = z.number();
const side_schema = z.enum(['top', 'right', 'bottom', 'left']);
const end_schema = z.enum(['none', 'arrow']);
const background_style_schema = z.enum(['cover', 'ratio', 'repeat']);

export const canvas_node_schema = z.looseObject({
	id: z.string().min(1),
	type: z.string().min(1),
	x: coordinate_schema,
	y: coordinate_schema,
	width: coordinate_schema.nonnegative(),
	height: coordinate_schema.nonnegative(),
	text: z.string().optional(),
	file: z.string().optional(),
	subpath: z.string().optional(),
	url: z.string().optional(),
	color: z.string().optional(),
	label: z.string().optional(),
	background: z.string().optional(),
	backgroundStyle: background_style_schema.optional(),
});

export const canvas_edge_schema = z.looseObject({
	id: z.string().min(1),
	fromNode: z.string().min(1),
	toNode: z.string().min(1),
	fromSide: side_schema.optional(),
	toSide: side_schema.optional(),
	fromEnd: end_schema.optional(),
	toEnd: end_schema.optional(),
	label: z.string().optional(),
	color: z.string().optional(),
});

export const canvas_document_schema = z.looseObject({
	nodes: z.array(canvas_node_schema),
	edges: z.array(canvas_edge_schema),
});
