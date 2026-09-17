/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @license MIT
 */

import esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const production = process.argv[2] === 'production';

const buildOptions = {
	bundle: true,
	banner: { js: '/*! Canvas Export | SPDX-License-Identifier: MIT */' },
	entryPoints: ['src/application/canvas_export_plugin.ts'],
	external: ['obsidian', 'electron', '@electron/remote'],
	format: 'cjs',
	legalComments: 'none',
	logLevel: 'info',
	minify: production,
	outfile: 'build/main.js',
	platform: 'browser',
	sourcemap: production ? false : 'inline',
	target: 'es2022',
};

async function copy_plugin_assets() {
	await mkdir('build', { recursive: true });
	await Promise.all([
		copyFile('manifest.json', 'build/manifest.json'),
		copyFile('styles.css', 'build/styles.css'),
	]);
}

if (production) {
	await esbuild.build(buildOptions);
	await copy_plugin_assets();
} else {
	await copy_plugin_assets();
	const context = await esbuild.context(buildOptions);
	await context.watch();
}
