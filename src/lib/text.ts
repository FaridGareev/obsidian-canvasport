/**
 * CanvasPort — portable exports for Obsidian Canvas.
 * Derived from Canvas Export and substantially modified for CanvasPort.
 * @author Farid Gareev (CanvasPort modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

export interface text_link {
	label: string;
	url: string;
}

export function strip_frontmatter(value: string): string {
	return value.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/u, '').trim();
}

export function escape_html(value: string): string {
	return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}

export function escape_attribute(value: string): string {
	return escape_html(value).replace(/`/g, '&#96;');
}

export function strip_markdown(value: string, keep_urls = false): string {
	const linked = value.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gu, (_match, label: string, url: string) => keep_urls ? `${label} (${url})` : label);
	return linked.replace(/^#{1,6}\s+/gmu, '').replace(/(?:^|\s)\^[\p{L}\p{N}-]+\s*$/gmu, '').replace(/[`*_~]/gu, '').replace(/^>\s?/gmu, '').replace(/\n{3,}/gu, '\n\n').trim();
}

export function collect_links(value: string): text_link[] {
	const links: text_link[] = [];
	const seen = new Set<string>();
	for (const match of value.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gu)) add_link(links, seen, match[1], match[2]);
	for (const match of value.matchAll(/(?<!["(])(https?:\/\/[^\s)<]+)/gu)) add_link(links, seen, make_url_label(match[1]), match[1]);
	return links;
}

export function select_markdown_subpath(value: string, subpath: string | undefined): string {
	const source = strip_frontmatter(value).replace(/\r\n?/gu, '\n');
	if (!subpath?.startsWith('#')) return source;
	if (subpath.startsWith('#^')) {
		const block_id = subpath.slice(2).trim();
		if (!block_id) return source;
		const line = source.split('\n').find((candidate) => candidate.includes(`^${block_id}`));
		return line?.replace(new RegExp(`\\s*\\^${escape_regular_expression(block_id)}\\s*$`, 'u'), '').trim() || source;
	}
	const requested = normalize_heading(subpath.slice(1));
	const lines = source.split('\n');
	for (let index = 0; index < lines.length; index += 1) {
		const heading = lines[index].match(/^(#{1,6})\s+(.+)$/u);
		if (!heading || normalize_heading(heading[2]) !== requested) continue;
		const depth = heading[1].length;
		let end = index + 1;
		while (end < lines.length) {
			const next = lines[end].match(/^(#{1,6})\s+/u);
			if (next && next[1].length <= depth) break;
			end += 1;
		}
		return lines.slice(index, end).join('\n').trim();
	}
	return source;
}

export function render_markdown(value: string): string {
	const lines = strip_frontmatter(value).replace(/\r\n?/gu, '\n').split('\n');
	const output: string[] = [];
	let list_type = '';
	let code_lines: string[] | undefined;
	const close_list = () => {
		if (list_type) output.push(`</${list_type}>`);
		list_type = '';
	};
	for (const line of lines) {
		const raw_trimmed = line.trim();
		if (raw_trimmed.startsWith('```')) {
			close_list();
			if (code_lines) output.push(`<pre><code>${escape_html(code_lines.join('\n'))}</code></pre>`);
			code_lines = code_lines ? undefined : [];
			continue;
		}
		if (code_lines) { code_lines.push(line); continue; }
		const visible_line = line.replace(/(?:^|\s)\^[\p{L}\p{N}-]+\s*$/u, '');
		const trimmed = visible_line.trim();
		if (raw_trimmed && !trimmed) continue;
		if (!trimmed) { close_list(); output.push('<div class="canvas_spacer"></div>'); continue; }
		const heading = trimmed.match(/^(#{1,6})\s+(.+)$/u);
		if (heading) { close_list(); output.push(`<h${heading[1].length}>${render_inline(heading[2])}</h${heading[1].length}>`); continue; }
		if (/^([-*_])\1{2,}\s*$/u.test(trimmed)) { close_list(); output.push('<hr>'); continue; }
		const quote = trimmed.match(/^>\s?(.*)$/u);
		if (quote) { close_list(); output.push(`<blockquote>${render_inline(quote[1])}</blockquote>`); continue; }
		const unordered = trimmed.match(/^[-*+]\s+(.+)$/u);
		const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/u);
		if (unordered || ordered) {
			const next_type = unordered ? 'ul' : 'ol';
			if (list_type !== next_type) { close_list(); list_type = next_type; output.push(`<${list_type}>`); }
			const item = (unordered ?? ordered)?.[1] ?? '';
			const task = item.match(/^\[([ xX])\]\s+(.+)$/u);
			output.push(task ? `<li class="canvas_task"><span>${task[1].toLowerCase() === 'x' ? '☑' : '☐'}</span>${render_inline(task[2])}</li>` : `<li>${render_inline(item)}</li>`);
			continue;
		}
		close_list();
		output.push(`<p>${render_inline(visible_line)}</p>`);
	}
	close_list();
	if (code_lines) output.push(`<pre><code>${escape_html(code_lines.join('\n'))}</code></pre>`);
	return output.join('');
}

function render_inline(value: string): string {
	const tokens: string[] = [];
	const protect = (html: string) => { const token = `\uE000${tokens.length}\uE001`; tokens.push(html); return token; };
	let rendered = escape_html(value);
	rendered = rendered.replace(/`([^`]+)`/gu, (_match, code: string) => protect(`<code>${code}</code>`));
	rendered = rendered.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gu, (_match, label: string, url: string) => protect(`<a href="${escape_attribute(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`));
	rendered = rendered.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/gu, (_match, prefix: string, url: string) => `${prefix}${protect(`<a href="${escape_attribute(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`)}`);
	rendered = rendered.replace(/(\*\*|__)([^\n]+?)\1/gu, '<strong>$2</strong>').replace(/~~([^\n]+?)~~/gu, '<s>$1</s>').replace(/(?<!\*)\*([^*\n]+)\*/gu, '<em>$1</em>').replace(/(?<!_)_([^_\n]+)_/gu, '<em>$1</em>');
	return rendered.replace(/\uE000(\d+)\uE001/gu, (_match, index: string) => tokens[Number(index)] ?? '');
}

function add_link(links: text_link[], seen: Set<string>, label: string, url: string): void {
	if (seen.has(url)) return;
	seen.add(url);
	links.push({ label, url });
}

function make_url_label(url: string): string {
	try { return decodeURIComponent(url.replace(/\/+$/u, '').split('/').pop() || url).slice(0, 48); } catch { return url.slice(0, 48); }
}

function normalize_heading(value: string): string {
	return value.trim().replace(/\s+#+\s*$/u, '').replace(/\s+/gu, ' ').toLocaleLowerCase();
}

function escape_regular_expression(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
