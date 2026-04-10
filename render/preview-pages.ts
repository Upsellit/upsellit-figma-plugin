import { escapeHtml, formatHtml } from '../utils/string';

export function renderPreviewIndex(
  title: string,
  images: Array<{ name: string; href: string }>,
  devMode: {
    bakedImageHref: string;
    cssSource: string;
    jsSource: string;
  }
): string {
  const previews = [
    { name: 'Flattened Live Text', href: 'flattened_live_text.html' },
    { name: 'Flattened Text Baked', href: 'flattened_text_baked.html' },
  ];

  const cssPlaceholder = '__USI_INDEX_DEV_CSS__';
  const jsPlaceholder = '__USI_INDEX_DEV_JS__';

  const galleryHtml = images.length
    ? `
      <section class="usi_preview_gallery">
        <h2>Images</h2>
        <div class="usi_preview_gallery_grid">
          ${images
            .map(
              (image) => `
              <figure class="usi_preview_gallery_item">
                <a href="${image.href}" target="_blank" rel="noreferrer">
                  <img src="${image.href}" alt="${escapeHtml(image.name)}" />
                </a>
                <figcaption>${escapeHtml(image.name)}</figcaption>
              </figure>
            `
            )
            .join('')}
        </div>
      </section>
    `
    : '';

  const shell = formatHtml(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} Preview</title>
  <style>
    :root {
      color-scheme: light dark;
      --usi_bg: #f5f5f5;
      --usi_surface: #ffffff;
      --usi_surface_alt: #f8f8f8;
      --usi_border: #dddddd;
      --usi_text: #111111;
      --usi_muted: #555555;
      --usi_link: #0b57d0;
      --usi_media: #f8f8f8;
      --usi_nav: #eef3fd;
      --usi_nav_active: #dce8ff;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --usi_bg: #111315;
        --usi_surface: #1a1d21;
        --usi_surface_alt: #121417;
        --usi_border: #31353b;
        --usi_text: #f1f3f4;
        --usi_muted: #aab1b9;
        --usi_link: #8ab4f8;
        --usi_media: #0f1113;
        --usi_nav: #1d2633;
        --usi_nav_active: #27364a;
      }
    }

    * {
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
    }

    body {
      margin: 0;
      padding: 24px;
      background: var(--usi_bg);
      color: var(--usi_text);
      font-family: Inter, Helvetica, Arial, sans-serif;
      tab-size: 2;
    }

    img {
      display: block;
      max-width: 100%;
    }

    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }

    textarea {
      width: 100%;
      min-height: 300px;
      padding: 12px;
      border: 1px solid var(--usi_border);
      border-radius: 8px;
      background: var(--usi_surface_alt);
      color: var(--usi_text);
      font-family: monospace;
      white-space: pre-wrap;
      resize: vertical;
    }

    .usi_preview_shell {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .usi_preview_header,
    .usi_preview_gallery,
    .usi_preview_code_card,
    .usi_preview_card {
      background: var(--usi_surface);
      border: 1px solid var(--usi_border);
      border-radius: 16px;
      padding: 20px;
    }

    .usi_preview_header h1,
    .usi_preview_header p,
    .usi_preview_gallery h2,
    .usi_preview_code_card h2,
    .usi_preview_code_card p,
    .usi_preview_card h3 {
      margin-top: 0;
    }

    .usi_preview_grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 20px;
    }

    .usi_preview_card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .usi_preview_card_action a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid var(--usi_border);
      border-radius: 999px;
      background: var(--usi_nav);
      color: var(--usi_link);
      text-decoration: none;
      font-weight: 700;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .usi_preview_card_action a:hover {
      background: var(--usi_nav_active);
      border-color: var(--usi_link);
    }

    .usi_preview_frame {
      height: 720px;
      border: 1px solid var(--usi_border);
      border-radius: 12px;
      background: var(--usi_surface_alt);
      overflow: hidden;
    }

    .usi_preview_gallery_grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .usi_preview_gallery_item {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .usi_preview_gallery_item a {
      display: block;
      border: 1px solid var(--usi_border);
      border-radius: 10px;
      overflow: hidden;
      background: var(--usi_surface);
    }

    .usi_preview_gallery_item img {
      width: 100%;
      height: 120px;
      object-fit: contain;
      background: var(--usi_media);
    }

    .usi_preview_gallery_item figcaption {
      font-size: 12px;
      color: var(--usi_muted);
      word-break: break-word;
    }

    .usi_preview_code_grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    .usi_preview_code_grid article {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .usi_preview_code_grid h3 {
      margin: 0;
    }
  </style>
</head>
<body>
  <main class="usi_preview_shell">
    <h1>${escapeHtml(title)}</h1>

    ${galleryHtml}

    <section class="usi_preview_grid">
      ${previews
        .map(
          (preview) => `
          <article class="usi_preview_card">
            <div class="usi_preview_card_action">
              <a href="${preview.href}" target="_blank" rel="noreferrer">
                ${escapeHtml(preview.name)}
              </a>
            </div>
            <div class="usi_preview_frame">
              <iframe
                loading="lazy"
                src="${preview.href}"
                title="${escapeHtml(preview.name)}"
              ></iframe>
            </div>
          </article>
        `
        )
        .join('')}
    </section>

    <section class="usi_preview_code_card">
      <h2>Flattened Campaign Code</h2>
      <p>CSS and JS generated for the flattened campaign output.</p>

      <div class="usi_preview_code_grid">
        <article>
          <h3>usi_js</h3>
          <textarea>${jsPlaceholder}</textarea>
        </article>

        <article>
          <h3>CSS</h3>
          <textarea>${cssPlaceholder}</textarea>
        </article>
      </div>
    </section>
  </main>
</body>
</html>
`);

  return shell
    .replace(cssPlaceholder, escapeHtml(devMode.cssSource))
    .replace(jsPlaceholder, escapeHtml(devMode.jsSource));
}