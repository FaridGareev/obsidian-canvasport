---
title: CanvasPort Expected Results
---

# Expected Results

Use this document when comparing Obsidian with exported files.

## Global expectations

- The canvas background and dot grid match the selected light or dark theme.
- Every regular node has an opaque surface; the grid never shows through it.
- Rounded corners, strokes, and colored tints are consistent.
- Content stays inside node bounds.
- Group labels sit above the group border and remain legible.
- Edge labels are centered on a solid label surface.
- Arrowheads follow `fromEnd` and `toEnd` values.

## 00 - Test Suite Dashboard

- Six category cards form two balanced rows.
- The README file node renders Markdown rather than a filename-only card.
- All connector labels remain clear at normal zoom.

## 01 - Typography and Nodes

- Markdown headings have a visible hierarchy.
- Bold, italic, strikethrough, inline code, blockquotes, tasks, and links render correctly.
- The long and tiny nodes clip safely.
- The selected-section node excludes the final section of the source note.
- Nested paths with spaces resolve successfully.

## 02 - Edges and Colors

- Six presets match Obsidian red, orange, yellow, green, cyan, and purple.
- The custom pink color is preserved.
- The two-way edge has arrowheads at both ends.
- The no-arrowheads edge has none.
- Long labels stay centered and do not shift the paths.

## 03 - Embedded Files

- SVG, PNG, JPEG, WebP, GIF, BMP, and AVIF images appear inside their nodes.
- Transparent files retain transparent regions in transparent-capable output formats.
- The PDF export contains the first page of `test-document.pdf` inside the PDF node.
- Markdown, TypeScript, JSON, CSV, and plain text show real content.
- The unsupported and missing files show stable fallback cards.
- The external URL remains readable and clickable in HTML.

## 04 - Groups and Backgrounds

- Cover and ratio backgrounds fill their group without stretching.
- Repeat uses the pattern's natural tile dimensions.
- Raster and transparent WebP group backgrounds render correctly.
- Nodes remain opaque above every background.
- Nested and overlapping groups have deterministic ordering.

## 05 - Stress and Boundaries

- Negative coordinates are normalized into the exported page.
- The outer group and every distant node remain visible.
- Tiny nodes, the tall node, and the wide node preserve their geometry.
- Dense and crossing edges remain connected to the correct anchors.
- The oversized paragraph does not escape its node.

## 06 and 07 - Minimal Cases

- The minimal canvas exports with standard outer padding.
- The empty canvas exports to safe fallback dimensions without throwing an error.
