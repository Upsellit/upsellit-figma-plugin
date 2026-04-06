# Upsellit Modal Plugin

A Figma plugin for building Upsellit modal campaigns using reusable asset components, and exporting them into multiple production-ready formats.

---

## ✨ Features

- Build campaigns using structured, reusable components
- Export to multiple formats:
  - Semantic HTML/CSS
  - Flattened (live text) HTML/CSS/JS
  - Flattened (text baked) HTML/CSS/JS
  - Template library import data
- Component-driven (no fragile layer guessing)

---

## 🧠 How It Works

Designers compose campaigns using predefined asset components.  
The plugin reads these components (not raw layers) to generate accurate, deterministic exports.

---

## 🎨 Designer Workflow

### 1. Initialize Project
Click **`Create Asset Source Page`**

This creates or updates:
- `Upsellit Asset Source`
- `Upsellit Templates`
- `Upsellit Asset Tokens` (variables)

---

### 2. Style Your Theme
Customize components on **Upsellit Asset Source**:
- Colors
- Typography
- Buttons
- Borders
- Incentive text

---

### 3. Build Campaign
- Use the plugin asset panel to insert components
- Arrange and style inside frames
- Keep each campaign page as a **frame**

---

### 4. Export

Export behavior:
- **Frame selected** → exports that frame
- **Group/section selected** → exports child frames
- **Nothing selected** → exports all frames on page

---

## 📦 Export Output

Each export includes:

- `index.html` (preview)
- `semantic.html`
- `flattened_live_text.html`
- `flattened_text_baked.html`
- `fallback-raw.html`
- `devmode.html`
- CSS + JS files
- Images (mockups + backgrounds)
- `library_manifest.json`

---

## 🧩 Component Rules

- Always use **provided asset components**
- Avoid custom shapes/text for exportable content
- Components carry metadata required for export

---

## ⚙️ Developer Guide

### Responsibilities

- Build/manage Figma components
- Export frames into HTML/CSS/JS + template data

---

### 🛠 Build Commands

```bash
npm run build
npm run lint
```

---

## 📁 Key Files

### Core
- `main.ts` — Plugin entry point (UI messaging only)
- `ui.html` — Plugin interface

### Configuration
- `constants.ts` — Component definitions + metadata
- `types.ts` — Shared types

### Figma Layer
- `figma/index.ts` — Module barrel
- `figma/theme.ts` — Theme + variables
- `figma/builders.ts` — Component builders
- `figma/import-library.ts` — Source/template page creation
- `figma/export.ts` — Node extraction + export logic

### Processing Pipeline
- `analysis/index.ts` — Converts frames → structured AST
- `render/semantic.ts` — Semantic HTML output
- `render/flattened.ts` — Flattened output
- `render/devmode.ts` — Dev preview
- `render/preview-pages.ts` — Preview pages

### Packaging
- `packaging/index.ts` — Final export assembly

### Template System
- `library_manifest.json` — Source data
- `generated/template-library.ts` — Generated output (do not edit)
- `scripts/generate-template-library.mjs` — Build script

---

## 🏗 Architecture Overview

main.ts        → Controller (UI → logic)  
figma/         → Reads/writes Figma data  
analysis/      → Builds structured model  
render/        → Generates output files  
packaging/     → Bundles final export  
scripts/       → Build-time utilities  

---

## 📤 Output Formats

### Semantic
- Clean, structured HTML + CSS

### Flattened (Live Text)
- Background image + positioned live text/components

### Flattened (Text Baked)
- More text baked into image, minimal live elements

### Dev Mode
- Preview with extracted runtime CSS/JS

---

## 🔄 Updating Template Library

1. Export templates from Figma
2. Replace `library_manifest.json`
3. Run:
   ```bash
   npm run build
   ```
4. This regenerates:
   - `generated/template-library.ts`

---

## ➕ Adding a New Component

1. Define component in `types.ts`
2. Add to `COMMON_COMPONENTS` in `constants.ts`
3. Implement builder in `figma/`
4. Update:
   - `analysis/` (if schema changes)
   - `render/` (if custom output needed)
5. Run:
   ```bash
   npm run build && npm run lint
   ```

---

## 📏 Best Practices

- Keep render metadata near component definitions
- Prefer cloning from source page over hardcoded styles
- Avoid special-case rendering unless necessary
- Maintain stable metadata for deterministic exports

---

## ⚠️ Generated Files

Do **not** manually edit:

- `generated/template-library.ts`

Safe to replace:
- `library_manifest.json` (input source)

---

## 🧾 Notes

- Export manifests are compact JSON
- System is designed for consistency and repeatability
- Component-driven approach ensures reliable output
