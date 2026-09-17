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

for (const path of ['.github/ISSUE_TEMPLATE/bug_report.md', '.github/ISSUE_TEMPLATE/feature_request.md']) {
	if (!/^---\r?\n/.test(readFileSync(join(root, path), 'utf8'))) fail(`${path} must begin with YAML frontmatter.`);
}

const markdown_files = ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'RELEASING.md', 'tests/dataset/README.md', 'tests/dataset/reference/Expected Results.md', 'tests/dataset/reference/Test Run Template.md'];
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
console.log(`Dataset valid: ${canvas_files.length} canvases, ${node_count} nodes, ${edge_count} edges.`);
