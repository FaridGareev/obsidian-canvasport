/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { TFile, Vault } from 'obsidian';

export function build_output_path(folder: string, filename: string): string {
	return folder ? `${folder}/${filename}` : filename;
}

export function normalize_output_folder(value: string): string {
	const parts = value.trim().replace(/\\/gu, '/').split('/').filter(Boolean);
	if (parts.some((part) => part === '.' || part === '..')) throw new Error('Output folder cannot contain relative path segments.');
	return parts.join('/');
}

export async function ensure_output_folder(vault: Vault, folder: string): Promise<void> {
	if (!folder || await vault.adapter.exists(folder)) return;
	let current = '';
	for (const segment of folder.split('/')) {
		current = current ? `${current}/${segment}` : segment;
		if (!await vault.adapter.exists(current)) await vault.createFolder(current);
	}
}

export async function find_available_path(vault: Vault, path: string): Promise<string> {
	const { directory, stem, extension } = split_path(path);
	let index = 1;
	let candidate = `${directory}${stem} ${index}${extension}`;
	while (await vault.adapter.exists(candidate)) candidate = `${directory}${stem} ${++index}${extension}`;
	return candidate;
}

export async function write_text_file(vault: Vault, path: string, content: string): Promise<void> {
	const existing = vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) await vault.modify(existing, content);
	else if (await vault.adapter.exists(path)) await vault.adapter.write(path, content);
	else await vault.create(path, content);
}

export async function write_binary_file(vault: Vault, path: string, content: ArrayBuffer): Promise<void> {
	const existing = vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) await vault.modifyBinary(existing, content);
	else if (await vault.adapter.exists(path)) await vault.adapter.writeBinary(path, content);
	else await vault.createBinary(path, content);
}

function split_path(path: string): { directory: string; stem: string; extension: string } {
	const slash = path.lastIndexOf('/');
	const directory = slash >= 0 ? path.slice(0, slash + 1) : '';
	const filename = slash >= 0 ? path.slice(slash + 1) : path;
	const compound = filename.match(/^(.+)(\.excalidraw\.md)$/u);
	if (compound) return { directory, stem: compound[1], extension: compound[2] };
	const dot = filename.lastIndexOf('.');
	return dot > 0 ? { directory, stem: filename.slice(0, dot), extension: filename.slice(dot) } : { directory, stem: filename, extension: '' };
}
