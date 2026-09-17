/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @license MIT
 */

import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const temporary_folder = await mkdtemp(join(tmpdir(), 'canvas-export-tests-'));
const output_file = join(temporary_folder, 'exporters.test.mjs');

try {
	await build({ entryPoints: ['tests/exporters.test.ts'], bundle: true, format: 'esm', platform: 'node', outfile: output_file, logLevel: 'silent' });
	await import(pathToFileURL(output_file).href);
	console.log('Exporter tests passed.');
} finally {
	await rm(temporary_folder, { recursive: true, force: true });
}
