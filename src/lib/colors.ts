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

const theme_colors = {
	light: { background: '#ffffff', text: '#222222', border: '#c0c0c0' },
	dark: { background: '#1c1c1c', text: '#dadada', border: '#7e7e7e' },
} as const;

export function resolve_canvas_color(color: string | undefined, theme: 'light' | 'dark' = 'light'): canvas_color {
	const matched = resolve_palette_color(color, theme);
	const base = theme_colors[theme];
	if (!matched) return { fill: base.background, stroke: base.border, text: base.text };
	return { fill: blend_hex(matched, base.background, 0.07), stroke: blend_hex(matched, base.background, 0.7), text: base.text };
}

export function resolve_edge_color(color: string | undefined, theme: 'light' | 'dark' = 'light'): string {
	return resolve_palette_color(color, theme) ?? theme_colors[theme].border;
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

function blend_hex(foreground: string, background: string, opacity: number): string {
	const front = parse_hex(foreground);
	const back = parse_hex(background);
	return `#${front.map((channel, index) => Math.round(channel * opacity + back[index] * (1 - opacity)).toString(16).padStart(2, '0')).join('')}`;
}

function parse_hex(color: string): [number, number, number] {
	const normalized = color.length === 4 ? color.slice(1).split('').map((part) => `${part}${part}`).join('') : color.slice(1);
	return [Number.parseInt(normalized.slice(0, 2), 16), Number.parseInt(normalized.slice(2, 4), 16), Number.parseInt(normalized.slice(4, 6), 16)];
}
