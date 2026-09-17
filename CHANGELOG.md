<!-- Copyright (c) 2026 Farid Gareev. SPDX-License-Identifier: MIT -->

# Changelog

All notable changes to Canvas Export are documented here.

## Unreleased

### Added

- Obsidian-compatible light and dark Canvas color palettes, including custom hexadecimal colors.
- SVG edge labels and support for arrowheads at either end of an edge.
- Embedded raster and SVG images in HTML, image, PDF, and SVG exports, including Canvas group backgrounds.
- Shared color theme setting with Use Obsidian theme, Always light, and Always dark options for all visual exports.
- Responsive export dialog with clear format cards, selection feedback, accessible focus states, and improved mobile layout.
- Plugin stylesheet included in the ready-to-install `build/` package.
- Simplified HTML and PDF choices so one shared theme controls every visual export.
- Context-aware settings that only appear when they apply to the selected file types.

### Fixed

- Transparent PNG and WebP capture now preserves the alpha channel instead of inheriting a white Electron window background.
- Canvas preset colors now map to the same red, orange, yellow, green, cyan, and purple values as Obsidian.

## [0.1.0] - 2026-09-17

### Added

- Export support for HTML, PNG, JPEG, WebP, SVG, PDF, Excalidraw, Mermaid, and D2.
- Export settings for groups, grid visibility, transparency, image scale, image quality, output paths, and filename conflicts.
- Automated TypeScript checks, exporter tests, and GitHub Actions verification.
