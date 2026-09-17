import { z } from 'zod';

const coordinate_schema = z.number();
const side_schema = z.enum(['top', 'right', 'bottom', 'left']);

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
});

export const canvas_edge_schema = z.looseObject({
	id: z.string().min(1),
	fromNode: z.string().min(1),
	toNode: z.string().min(1),
	fromSide: side_schema.optional(),
	toSide: side_schema.optional(),
	label: z.string().optional(),
	color: z.string().optional(),
});

export const canvas_document_schema = z.looseObject({
	nodes: z.array(canvas_node_schema),
	edges: z.array(canvas_edge_schema),
});
