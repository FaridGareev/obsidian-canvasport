<!--
  Canvas Export
  Copyright (c) 2026 Farid Gareev
  SPDX-License-Identifier: MIT
-->

# Canvas Export for Obsidian

Export your [Obsidian Canvas](https://obsidian.md/canvas) files as shareable web pages, images, documents, and diagram formats. Canvas Export is an open-source Obsidian plugin for turning a canvas into HTML, PNG, JPEG, WebP, SVG, PDF, Excalidraw, Mermaid, or D2 without leaving your vault.

## What Canvas Export does

- Exports one canvas to several formats in a single action.
- Produces light and dark HTML and PDF exports.
- Creates PNG, JPEG, WebP, and SVG visuals for documentation and sharing.
- Converts Canvas structure into Excalidraw, Mermaid, and D2 diagrams.
- Keeps canvas groups, connections, text, file references, and labels in the rendered output where the target format supports them.
- Lets you choose an output folder and safely overwrite, rename, or skip existing exports.
- Offers grid, group-label, transparent-background, image-scale, and image-quality controls.

## Supported Obsidian Canvas export formats

| Format | Best for |
| --- | --- |
| HTML (light / dark) | Publishing or sharing a self-contained visual canvas page |
| PNG, JPEG, WebP | Images for notes, docs, social posts, and presentations |
| SVG | Sharp scalable graphics and documentation |
| PDF (light / dark) | Printable or archival exports |
| Excalidraw | Continuing visual work in Excalidraw |
| Mermaid | Version-controlled text diagrams |
| D2 | Diagram-as-code workflows |

## Install locally in Obsidian

1. Download or clone this repository.
2. In the project folder, install Node.js dependencies and build the plugin:

   ```bash
   npm install
   npm run build
   ```

3. Create `<your-vault>/.obsidian/plugins/canvas-export/`.
4. Copy the two files from `build/` into that folder: `main.js` and `manifest.json`.
5. Open **Settings → Community plugins** in Obsidian, then enable **Canvas Export**.

## Using the plugin

Open a `.canvas` file, then use one of these commands from Obsidian’s Command Palette:

- **Export current canvas…** — choose one or more formats and export options.
- **Export to [format]** — export directly to a chosen format.
- **Re-export with last settings** — repeat the last export selection.

You can also right-click a Canvas file in the file explorer and choose **Export canvas…**.

## Development

Canvas Export requires Node.js 20 or later and npm.

```bash
npm install
npm run verify
```

`npm run verify` runs TypeScript checks, exporter tests, and a production build. Use `npm run dev` to rebuild while developing. `npm run build` always writes a ready-to-copy plugin package to `build/`.

### Project structure

- `src/application` — plugin lifecycle and Obsidian commands
- `src/exporters` — HTML, SVG, diagram, and Excalidraw exporters
- `src/lib` and `src/models` — Canvas parsing, text formatting, and domain types
- `src/services` — vault I/O and Electron rendering
- `src/ui` — settings and export dialogs
- `tests` — automated exporter tests

## Contributing

Issues, feature ideas, documentation fixes, and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License

Canvas Export is released under the [MIT License](LICENSE). You may use, modify, distribute, and include it in commercial or private work, subject to the license notice.
