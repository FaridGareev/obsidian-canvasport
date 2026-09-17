# Canvas Export

An Obsidian plugin that exports the active Canvas file to formats suited to sharing, publishing, and diagram tooling.

## Supported formats

- HTML in light and dark themes
- PNG, JPEG, and WebP images
- SVG and PDF
- Excalidraw JSON
- Mermaid and D2 diagrams

The export dialog supports multiple formats at once, output-folder selection, collision handling, grid and group-label options, transparent backgrounds, and raster-image scaling and quality controls.

## Development

Prerequisites: Node.js 20 or later and npm.

```bash
npm install
npm run verify
```

Use `npm run dev` during development to rebuild on changes. `npm run build` creates a ready-to-install plugin package in `build/`. `npm test` runs the exporter test suite, while `npm run typecheck` validates TypeScript without emitting files.

## Installing locally in Obsidian

1. Build the project with `npm run build`.
2. Create a folder named `canvas-export` in `<vault>/.obsidian/plugins/`.
3. Copy the contents of `build/` — `main.js` and `manifest.json` — into that folder.
4. Enable **Canvas Export** in Obsidian’s Community Plugins settings.

## Repository layout

- `src/application` — plugin lifecycle and command registration
- `src/exporters` — format-specific renderers
- `src/lib` and `src/models` — Canvas parsing, formatting, and domain types
- `src/services` — vault I/O and desktop rendering
- `src/ui` — export, overwrite, and settings modals
- `tests` — automated exporter coverage
