/**
 * CanvasPort — portable exports for Obsidian Canvas.
 * SPDX-License-Identifier: Apache-2.0
 */

import esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const production = process.argv[2] === 'production';

const buildOptions = {
	bundle: true,
	banner: { js: '/*! CanvasPort | SPDX-License-Identifier: Apache-2.0 | See NOTICE */' },
	entryPoints: ['src/application/canvasport_plugin.ts'],
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
		copyFile('LICENSE', 'build/LICENSE'),
		copyFile('NOTICE', 'build/NOTICE'),
		copyFile('manifest.json', 'build/manifest.json'),
		copyFile('src/styles.css', 'build/styles.css'),
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
