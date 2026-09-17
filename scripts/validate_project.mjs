/**
 * CanvasPort publication and fixture validation.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read_json = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const fail = (message) => { throw new Error(message); };

const package_data = read_json('package.json');
const lock_data = read_json('package-lock.json');
const manifest = read_json('manifest.json');
const versions = read_json('versions.json');

const required_manifest_fields = ['id', 'name', 'version', 'minAppVersion', 'description', 'author', 'isDesktopOnly'];
for (const field of required_manifest_fields) {
	if (manifest[field] === undefined || manifest[field] === '') fail(`manifest.json is missing ${field}.`);
}

if (!/^[a-z-]+$/.test(manifest.id) || manifest.id.includes('obsidian') || manifest.id.endsWith('plugin')) fail('manifest.json contains an invalid plugin ID.');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) fail('Plugin version must use x.y.z semantic versioning.');
if (manifest.description.length > 250 || !manifest.description.endsWith('.')) fail('Manifest description must be at most 250 characters and end with a period.');
if (manifest.isDesktopOnly !== true) fail('CanvasPort must be desktop-only because it uses Electron APIs.');

const versions_to_compare = [package_data.version, lock_data.version, lock_data.packages?.['']?.version, manifest.version];
if (new Set(versions_to_compare).size !== 1) fail(`Version mismatch: ${versions_to_compare.join(', ')}`);
if (versions[manifest.version] !== manifest.minAppVersion) fail('versions.json does not map the current version to minAppVersion.');

for (const path of ['README.md', 'LICENSE', 'NOTICE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'RELEASING.md']) {
	if (!existsSync(join(root, path))) fail(`Required publication file is missing: ${path}`);
}

const listing_path = 'docs/community-listing.md';
const listing_source = readFileSync(join(root, listing_path), 'utf8');
const short_description = listing_source.match(/## Short description\r?\n\r?\n([^\r\n]+)/)?.[1];
const long_description = listing_source.match(/## Long description\r?\n\r?\n([\s\S]*?)\r?\n\r?\nCharacter count:/)?.[1].replace(/\r\n/g, '\n');
if (!short_description || short_description.length > 200 || !short_description.endsWith('.')) fail('Community short description must be present, at most 200 characters, and end with a period.');
if (!long_description || long_description.length > 1000) fail('Community long description must be present and at most 1000 characters.');

const community_screenshots = [
	'01-portable-formats.png',
	'02-faithful-export.png',
	'03-embedded-content.png',
	'04-complex-layouts.png',
	'05-local-workflow.png',
];
for (const screenshot of community_screenshots) {
	const path = join(root, 'docs', 'community', screenshot);
	if (!existsSync(path)) fail(`Community screenshot is missing: ${screenshot}`);
	const image = readFileSync(path);
	const png_signature = '89504e470d0a1a0a';
	if (image.subarray(0, 8).toString('hex') !== png_signature) fail(`Community screenshot is not a PNG: ${screenshot}`);
	if (image.readUInt32BE(16) !== 1200 || image.readUInt32BE(20) !== 800) fail(`Community screenshot must be 1200 by 800 pixels: ${screenshot}`);
	if (image.length > 5 * 1024 * 1024) fail(`Community screenshot exceeds 5 MB: ${screenshot}`);
}

for (const path of ['.github/ISSUE_TEMPLATE/bug_report.md', '.github/ISSUE_TEMPLATE/feature_request.md']) {
	if (!/^---\r?\n/.test(readFileSync(join(root, path), 'utf8'))) fail(`${path} must begin with YAML frontmatter.`);
}

const scanner_checks = [
	['src/exporters/svg_exporter.ts', /\bglobalThis\b/u, 'Use window or activeWindow instead of globalThis.'],
	['src/services/electron_render_service.ts', /\brequire\s*\(/u, 'Use a static import instead of require().'],
	['src/styles.css', /:has\s*\(/u, 'Avoid the broad :has() selector.'],
];
for (const [path, pattern, message] of scanner_checks) {
	if (pattern.test(readFileSync(join(root, path), 'utf8'))) fail(`${path}: ${message}`);
}
if (!/getSettingDefinitions\s*\(/u.test(readFileSync(join(root, 'src/ui/settings_tab.ts'), 'utf8'))) fail('The settings tab must expose searchable declarative definitions.');

const release_workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
for (const required of ['attestations: write', 'id-token: write', 'actions/attest-build-provenance@v3']) {
	if (!release_workflow.includes(required)) fail(`Release workflow is missing ${required}.`);
}
for (const unsupported_asset of ['build/LICENSE', 'build/NOTICE']) {
	if (release_workflow.includes(unsupported_asset)) fail(`Release workflow contains unsupported asset ${unsupported_asset}.`);
}

const markdown_files = ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'RELEASING.md', 'docs/community-listing.md', 'tests/dataset/README.md', 'tests/dataset/reference/Expected Results.md', 'tests/dataset/reference/Test Run Template.md'];
for (const markdown_file of markdown_files) {
	const source = readFileSync(join(root, markdown_file), 'utf8');
	for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
		const target = match[1].trim();
		if (/^(https?:|mailto:|#)/.test(target)) continue;
		const local_target = decodeURIComponent(target.split('#')[0]);
		if (!existsSync(resolve(root, dirname(markdown_file), local_target))) fail(`Broken local link in ${markdown_file}: ${target}`);
	}
}

const dataset_root = join(root, 'tests', 'dataset');
const suite_manifest = read_json('tests/dataset/suite-manifest.json');
const canvas_files = readdirSync(dataset_root).filter((name) => extname(name) === '.canvas');
let node_count = 0;
let edge_count = 0;
const missing_assets = new Set();

for (const canvas_file of canvas_files) {
	const canvas = JSON.parse(readFileSync(join(dataset_root, canvas_file), 'utf8'));
	node_count += canvas.nodes.length;
	edge_count += canvas.edges.length;
	for (const node of canvas.nodes) {
		for (const property of ['file', 'background']) {
			if (typeof node[property] === 'string' && !existsSync(join(root, node[property]))) missing_assets.add(node[property]);
		}
	}
}

const summary = suite_manifest.summary;
if (canvas_files.length !== summary.canvases || node_count !== summary.nodes || edge_count !== summary.edges) fail('Dataset summary does not match its Canvas files.');
const expected_missing = [...suite_manifest.intentionalMissingFiles].sort();
const actual_missing = [...missing_assets].sort();
if (JSON.stringify(expected_missing) !== JSON.stringify(actual_missing)) fail(`Unexpected missing dataset assets: ${actual_missing.join(', ')}`);

console.log(`Publication metadata valid: CanvasPort ${manifest.version}.`);
console.log(`Community listing valid: ${short_description.length}-character short description, ${long_description.length}-character long description, ${community_screenshots.length} screenshots.`);
console.log(`Dataset valid: ${canvas_files.length} canvases, ${node_count} nodes, ${edge_count} edges.`);
