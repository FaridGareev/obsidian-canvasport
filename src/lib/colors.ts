/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

export interface canvas_color {
	fill: string;
	stroke: string;
	text: string;
}

const palette: Record<string, canvas_color> = {
	'1': { fill: '#ffc9c9', stroke: '#e03131', text: '#7f1d1d' },
	'2': { fill: '#ffe8cc', stroke: '#e8590c', text: '#7c2d12' },
	'3': { fill: '#e5dbff', stroke: '#7950f2', text: '#3b1d78' },
	'4': { fill: '#b2f2bb', stroke: '#2f9e44', text: '#14532d' },
	'5': { fill: '#d0ebff', stroke: '#1c7ed6', text: '#123c69' },
	'6': { fill: '#fcc2d7', stroke: '#c2255c', text: '#701a3b' },
};

const light_default: canvas_color = { fill: '#f0f7ff', stroke: '#3973b8', text: '#1b2736' };
const dark_default: canvas_color = { fill: '#262a32', stroke: '#768ba8', text: '#e8edf5' };

export function resolve_canvas_color(color: string | undefined, theme: 'light' | 'dark' = 'light'): canvas_color {
	if (is_hex_color(color)) return { fill: with_alpha(color, theme === 'dark' ? '33' : '26'), stroke: color, text: theme === 'dark' ? '#f4f7fb' : '#152238' };
	const matched = color ? palette[color] : undefined;
	if (!matched) return theme === 'dark' ? dark_default : light_default;
	if (theme === 'light') return matched;
	return { fill: with_alpha(matched.stroke, '26'), stroke: matched.stroke, text: '#edf2f7' };
}

export function resolve_edge_color(color: string | undefined, theme: 'light' | 'dark' = 'light'): string {
	return is_hex_color(color) ? color : color && palette[color] ? palette[color].stroke : theme === 'dark' ? '#9ba8bb' : '#59677a';
}

export function is_hex_color(value: string | undefined): value is string {
	return typeof value === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/iu.test(value);
}

function with_alpha(color: string, alpha: string): string {
	if (color.length === 4) return `#${color.slice(1).split('').map((part) => `${part}${part}`).join('')}${alpha}`;
	return `${color}${alpha}`;
}
