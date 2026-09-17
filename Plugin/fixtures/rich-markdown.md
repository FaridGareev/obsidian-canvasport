---
title: Rich Markdown Fixture
category: plugin-test
---

# Rich Markdown Fixture

This note exercises the Markdown renderer with common Obsidian content.

## Overview

Use **bold**, *italic*, ~~strikethrough~~, `inline code`, and a [safe external link](https://obsidian.md).

> A blockquote should have a visible accent line and comfortable padding.

### Task list

- [x] Completed export check
- [ ] Pending visual review
- [ ] Compare light and dark themes

### Ordered list

1. Open the Canvas.
2. Select several output formats.
3. Compare every export against Obsidian.

### Code block

```ts
const formats = ['html', 'png', 'svg', 'pdf'];
const ready = formats.every(Boolean);
```

### Table

| Format | Vector | Transparent |
| --- | ---: | ---: |
| SVG | Yes | Yes |
| PDF | Yes | No |
| PNG | No | Yes |

## Selected section

This heading is used by a Canvas file node with a heading subpath.

- Only this section should appear in the selected-section card.
- Content from the next heading must not leak into the export.

### Selected subsection

Nested content belongs to the selected section.

## Final section

This text must not appear when the Canvas node selects `#Selected section`.
