import esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const production = process.argv[2] === 'production';

const buildOptions = {
	bundle: true,
	entryPoints: ['src/application/canvas_export_plugin.ts'],
	external: ['obsidian', 'electron', '@electron/remote'],
	format: 'cjs',
	logLevel: 'info',
	minify: production,
	outfile: 'build/main.js',
	platform: 'browser',
	sourcemap: production ? false : 'inline',
	target: 'es2022',
};

async function copy_plugin_manifest() {
	await mkdir('build', { recursive: true });
	await copyFile('manifest.json', 'build/manifest.json');
}

if (production) {
	await esbuild.build(buildOptions);
	await copy_plugin_manifest();
} else {
	await copy_plugin_manifest();
	const context = await esbuild.context(buildOptions);
	await context.watch();
}
