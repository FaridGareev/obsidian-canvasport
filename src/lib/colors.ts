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

const light_palette: Record<string, string> = {
	'1': '#e93147',
	'2': '#ec7500',
	'3': '#e0ac00',
	'4': '#08b94e',
	'5': '#00bfbc',
	'6': '#7852ee',
};

const dark_palette: Record<string, string> = {
	'1': '#fb464c',
	'2': '#e9973f',
	'3': '#e0de71',
	'4': '#44cf6e',
	'5': '#53dfdd',
	'6': '#a882ff',
};

const light_default: canvas_color = { fill: '#ffffff', stroke: '#b3b3b3', text: '#2e3338' };
const dark_default: canvas_color = { fill: '#242424', stroke: '#5c5c5c', text: '#dcddde' };

export function resolve_canvas_color(color: string | undefined, theme: 'light' | 'dark' = 'light'): canvas_color {
	const matched = resolve_palette_color(color, theme);
	if (!matched) return theme === 'dark' ? dark_default : light_default;
	return { fill: with_alpha(matched, theme === 'dark' ? '22' : '1f'), stroke: matched, text: theme === 'dark' ? '#dcddde' : '#2e3338' };
}

export function resolve_edge_color(color: string | undefined, theme: 'light' | 'dark' = 'light'): string {
	return resolve_palette_color(color, theme) ?? (theme === 'dark' ? '#b3b3b3' : '#5c5c5c');
}

export function is_hex_color(value: string | undefined): value is string {
	return typeof value === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/iu.test(value);
}

function resolve_palette_color(color: string | undefined, theme: 'light' | 'dark'): string | undefined {
	if (is_hex_color(color)) return color;
	return color ? (theme === 'dark' ? dark_palette[color] : light_palette[color]) : undefined;
}

export function with_alpha(color: string, alpha: string): string {
	if (color.length === 4) return `#${color.slice(1).split('').map((part) => `${part}${part}`).join('')}${alpha}`;
	return `${color}${alpha}`;
}
