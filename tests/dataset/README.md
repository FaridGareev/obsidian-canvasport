---
title: CanvasPort Test Suite
tags:
  - obsidian
  - canvas
  - plugin-testing
  - export
---

# CanvasPort Test Suite

This folder is a complete visual and functional test bed for CanvasPort. Start with `00 - Test Suite Dashboard.canvas`, then open the focused canvases for precise comparisons.

Machine-readable coverage metadata is available in `suite-manifest.json`. Expected visual behavior and a reusable test-run template are stored in the `reference` folder.

## Test matrix

| Canvas | Primary coverage |
| --- | --- |
| `00 - Test Suite Dashboard.canvas` | Visual overview and navigation |
| `01 - Typography and Nodes.canvas` | Markdown, cards, sizing, overflow, links |
| `02 - Edges and Colors.canvas` | Preset colors, custom colors, endpoints, labels |
| `03 - Embedded Files.canvas` | PNG, JPEG, WebP, GIF, SVG, PDF, Markdown, code, JSON, CSV |
| `04 - Groups and Backgrounds.canvas` | Cover, ratio, repeat, nested and overlapping groups |
| `05 - Stress and Boundaries.canvas` | Negative coordinates, dense graphs, tiny and large nodes |
| `06 - Minimal Canvas.canvas` | Smallest useful export |
| `07 - Empty Canvas.canvas` | Empty-canvas fallback bounds |

## Recommended export pass

Export every focused canvas to:

- HTML
- PNG at 1x and 2x
- JPEG at quality 60 and 92
- WebP with and without transparency
- SVG
- PDF
- Excalidraw
- Mermaid
- D2

For visual exports, repeat the pass with Always light, Always dark, and Match Obsidian. Also test the grid, group labels, transparency, overwrite, rename, skip, and output-subfolder controls.

## Acceptance checklist

- Node backgrounds fully hide the dot grid.
- Preset and custom colors remain consistent across formats.
- Edge labels are centered and readable.
- Arrowheads match the source Canvas endpoints.
- Group labels remain above their group borders.
- Images preserve aspect ratio and do not stretch.
- The first PDF page appears inside the PDF export.
- Markdown subpaths render only the selected section.
- Missing files degrade to a clear fallback card.
- Transparent PNG and WebP files retain alpha.
- Long text clips predictably without escaping its card.
- Empty Canvas export completes without an exception.
