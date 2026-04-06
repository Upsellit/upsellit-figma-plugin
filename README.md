# Upsellit Modal Plugin

A Figma plugin for building Upsellit modal campaigns from reusable asset components and exporting them into semantic and flattened campaign packages.

## Designer

### Main workflow

1. Click `Create Asset Source Page`.
2. The plugin creates or updates:
   - `Upsellit Asset Source`
   - `Upsellit Templates`
   - `Upsellit Asset Tokens`
3. Style the components on `Upsellit Asset Source`.
4. Build campaign frames with the asset library in the plugin UI.
5. Export the selected work.

`Add` clones components from `Upsellit Asset Source` when that page exists, so designer edits on the source page become the default component styling for future inserts.

### Export behavior

- If a frame is selected, that frame is exported.
- If a group, section, component, or instance is selected, the plugin recursively finds child frames and exports those frames.
- If nothing is selected, the plugin exports all frames it can find on the current page.

### What gets exported

Each campaign folder includes:

- `index.html`
- `semantic.html`
- `flattened_live_text.html`
- `flattened_text_baked.html`
- `css/semantic.css`
- `css/flattened_live_text.css`
- `css/flattened_text_baked.css`
- `js/usi_js.js`
- `js/flattened_text_baked.js`

The export root also includes shared image folders:

- `mockups/`
- `live_text_images/`
- `text_baked_images/`

The frame `index.html` preview includes:

- image gallery
- iframe previews for semantic and flattened variants
- flattened campaign CSS
- flattened `usi_js`

If multiple frames are exported, the root also includes:

- `index.html`
- `mockup_review.html`
- `library_manifest.json`

### Component rules

- Use the provided asset components for any exportable content.
- Build each campaign inside frames.
- Keep reusable styling on `Upsellit Asset Source`.
- Use `Upsellit Templates` as a reference page generated from `library_manifest.json`.

## Developer

### Build commands

```bash
npm run build
npm run lint
```

### Architecture

- `main.ts`
  - Plugin entrypoint
  - UI message handling only
- `ui.html`
  - Plugin interface

- `constants.ts`
  - Shared component catalog
  - Render metadata for each component
- `types.ts`
  - Shared types

- `figma/theme.ts`
  - Variable and theme helpers
- `figma/builders.ts`
  - Asset component builders
- `figma/import-library.ts`
  - Builds `Upsellit Asset Source` and `Upsellit Templates`
- `figma/export.ts`
  - Figma extraction and asset export helpers
- `figma/shared.ts`
  - Shared Figma utilities
- `figma/index.ts`
  - Barrel exports

- `analysis/index.ts`
  - Component-driven AST and schema assembly

- `render/semantic.ts`
  - Semantic campaign output
- `render/flattened.ts`
  - Flattened HTML/CSS/JS output
- `render/preview-pages.ts`
  - Frame and root preview pages
- `render/devmode.ts`
  - Helpers for extracting flattened campaign CSS for preview pages
- `render/index.ts`
  - Barrel exports

- `packaging/index.ts`
  - Final export assembly
  - ZIP/package structure

- `scripts/generate-template-library.mjs`
  - Converts `library_manifest.json` into generated runtime data
- `generated/template-library.ts`
  - Generated file consumed by the plugin
- `library_manifest.json`
  - Source input for template-library generation

### Output model

The plugin is component-driven. It does not depend on generic layer heuristics anymore.

The main export variants are:

- Semantic
  - structured HTML and CSS based on inserted components
- Flattened Live Text
  - semantic-style HTML with major regions positioned to match the design
  - live text and live interactive elements where allowed
- Flattened Text Baked
  - uses the baked background image with only the required live HTML remaining

### Adding a new component

In most cases, adding a new component means editing four places:

1. `types.ts`
   - add the component id and role if needed
2. `constants.ts`
   - add the component definition to `COMMON_COMPONENTS`
   - keep render metadata here
3. `figma/builders.ts`
   - add the builder used by the asset source page and `Add`
4. `render/flattened.ts` or `render/semantic.ts`
   - only if the component needs custom export behavior

Rule of thumb:

- Define what the component is in `constants.ts`
- Define how it is inserted in `figma/builders.ts`
- Define custom export behavior only when the shared render metadata is not enough

### Template library updates

To refresh template-library data:

1. Export the latest template set from the plugin.
2. Replace `library_manifest.json` in the repo root.
3. Run:

```bash
npm run build
```

That regenerates `generated/template-library.ts`.

### Generated files

Do not edit:

- `generated/template-library.ts`

Safe to replace:

- `library_manifest.json`
