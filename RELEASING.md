<!-- SPDX-License-Identifier: Apache-2.0 -->

# Releasing CanvasPort

CanvasPort releases use plain semantic-version tags without a `v` prefix. The tag, `package.json`, `package-lock.json`, `manifest.json`, and `versions.json` must agree.

## Prepare a release

1. Move completed entries from `Unreleased` in `CHANGELOG.md` into a dated version section.
2. Update the version in `package.json` and run `npm install --package-lock-only`.
3. Set the same version in `manifest.json`.
4. Add the version and minimum supported Obsidian version to `versions.json`.
5. Run `npm run verify` and confirm that `build/` contains `main.js`, `manifest.json`, and `styles.css`.
6. Commit the release preparation.
7. Create and push a tag matching the manifest version, for example `1.0.0`.

The release workflow validates the tag, rebuilds the plugin, and publishes the three installable assets plus `LICENSE` and `NOTICE` to a GitHub release.

## Obsidian Community directory

The community directory requires a unique plugin identity, a valid manifest, a published GitHub release, and compliance with Obsidian's submission policies. Because CanvasPort is derived from an existing community plugin, obtain publicly verifiable approval from the original author before submitting it as a separate listing.
