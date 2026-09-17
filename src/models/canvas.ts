/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

export type canvas_side = 'top' | 'right' | 'bottom' | 'left';

export interface canvas_node {
	id: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	text?: string;
	file?: string;
	subpath?: string;
	url?: string;
	color?: string;
	label?: string;
}

export interface canvas_edge {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide?: canvas_side;
	toSide?: canvas_side;
	label?: string;
	color?: string;
}

export interface canvas_document {
	nodes: canvas_node[];
	edges: canvas_edge[];
}

export interface canvas_point {
	x: number;
	y: number;
}

export interface canvas_bounds {
	min_x: number;
	min_y: number;
	max_x: number;
	max_y: number;
	width: number;
	height: number;
	offset_x: number;
	offset_y: number;
}

export interface canvas_snapshot {
	canvas: canvas_document;
	nodes_by_id: Map<string, canvas_node>;
	bounds: canvas_bounds;
}
