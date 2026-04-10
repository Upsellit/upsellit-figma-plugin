export * from './preview-pages';
import { escapeHtml, formatHtml } from '../utils/string';
export {
  buildUsiJsFile,
  renderFlattenedHtml,
} from './flattened';
export function renderMultiExportIndex(
  entries: Array<{ name: string; href: string; images: Array<{ name: string; href: string }> }>
): string {
  return formatHtml(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Export Index</title>
  <style>
    :root {
      color-scheme: light dark;
      --usi_bg:#f5f5f5;
      --usi_surface:#ffffff;
      --usi_surface_alt:#f8f8f8;
      --usi_border:#dddddd;
      --usi_text:#111111;
      --usi_muted:#555555;
      --usi_link:#0b57d0;
      --usi_media:#f8f8f8;
      --usi_nav:#eef3fd;
      --usi_nav_active:#dce8ff;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --usi_bg:#111315;
        --usi_surface:#1a1d21;
        --usi_surface_alt:#121417;
        --usi_border:#31353b;
        --usi_text:#f1f3f4;
        --usi_muted:#aab1b9;
        --usi_link:#8ab4f8;
        --usi_media:#0f1113;
        --usi_nav:#1d2633;
        --usi_nav_active:#27364a;
      }
    }

    body {
      margin:0;
      padding:24px;
      font-family:Helvetica,Arial,sans-serif;
      background:var(--usi_bg);
      color:var(--usi_text);
    }

    * { box-sizing:border-box; }
    img { max-width: 100%; }
    iframe { width: 100%; height: 600px;}
    code { white-space: pre-wrap; }


    * { box-sizing: border-box; }
    html { font-size: 16px; }
    body {
      margin: 0;
      background: rgba(0, 0, 0, 0.9);
      font-family: Inter, Arial, sans-serif;
      tab-size: 2;
    }

    .usi_export_root {
      max-width:1440px;
      margin:0 auto;
      display:flex;
      flex-direction:column;
      gap:20px;
    }

    .usi_export_header,
    .usi_export_card {
      background:var(--usi_surface);
      border:1px solid var(--usi_border);
      border-radius:16px;
      padding:20px;
    }

    .usi_export_header h1,
    .usi_export_header p,
    .usi_export_card h2 {
      margin:0 0 12px 0;
    }

    .usi_export_grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(420px,1fr));
      gap:20px;
    }

    .usi_export_card a {
      color:var(--usi_link);
      text-decoration:none;
      font-weight:700;
    }

    .usi_export_open {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:40px;
      padding:0 14px;
      border:1px solid var(--usi_border);
      border-radius:999px;
      background:var(--usi_nav);
      transition:background-color .15s ease,border-color .15s ease;
    }

    .usi_export_open:hover {
      background:var(--usi_nav_active);
      border-color:var(--usi_link);
    }

    .usi_export_card_action {
      margin-bottom:12px;
    }

    .usi_export_frame {
      height:720px;
      border:1px solid var(--usi_border);
      border-radius:12px;
      background:var(--usi_surface_alt);
      overflow:auto;
    }

    .usi_export_card iframe {
      width:100%;
      height:700px;
      border:0;
      background:#fff;
      transform-origin:0 0;
      display:block;
    }

    .usi_export_gallery {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
      gap:12px;
      margin-bottom:16px;
    }

    .usi_export_gallery figure {
      margin:0;
      display:flex;
      flex-direction:column;
      gap:6px;
    }

    .usi_export_gallery a {
      display:block;
      border:1px solid var(--usi_border);
      border-radius:10px;
      overflow:hidden;
      background:var(--usi_surface);
    }

    .usi_export_gallery img {
      display:block;
      width:100%;
      height:120px;
      object-fit:contain;
      background:var(--usi_media);
    }

    .usi_export_gallery figcaption {
      font-size:12px;
      color:var(--usi_muted);
      word-break:break-word;
    }
  </style>
</head>
<body>
  <main class="usi_export_root">
    <section class="usi_export_header">
      <h1>Export Index</h1>
      <p><button onclick='Array.from(document.querySelectorAll(".usi_export_open")).forEach(el => { const url = el.href || el.getAttribute("data-href"); if (url) window.open(url, "_blank"); });'>Open All</button></p>
    </section>

    <section class="usi_export_grid">
      ${entries
        .map((entry) => {
          const galleryHtml = entry.images.length
            ? `
              <div class="usi_export_gallery">
                ${entry.images
                  .map(
                    (image) => `
                    <figure>
                      <a href="${image.href}" target="_blank" rel="noreferrer">
                        <img src="${image.href}" alt="${escapeHtml(image.name)}" />
                      </a>
                      <figcaption>${escapeHtml(image.name)}</figcaption>
                    </figure>
                  `
                  )
                  .join('')}
              </div>
            `
            : '';

          return `
            <article class="usi_export_card">
              <div class="usi_export_card_action">
                <a class="usi_export_open" href="${entry.href}">
                  Open ${escapeHtml(entry.name)}
                </a>
              </div>

              <h2>${escapeHtml(entry.name)}</h2>

              ${galleryHtml}

              <div class="usi_export_frame">
                <iframe
                  loading="lazy"
                  src="${entry.href}"
                  title="${escapeHtml(entry.name)}"
                ></iframe>
              </div>
            </article>
          `;
        })
        .join('')}
    </section>
  </main>
</body>
</html>
`);
}

export function renderMockupReviewIndex(entries: Array<{ name: string; href: string }>): string {
  return formatHtml(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mockups</title>
  <style>
    :root {
      color-scheme: light dark;
      --usi_bg:#f5f5f5;
      --usi_surface:#ffffff;
      --usi_border:#dddddd;
      --usi_text:#111111;
      --usi_muted:#555555;
      --usi_media:#f8f8f8;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --usi_bg:#111315;
        --usi_surface:#1a1d21;
        --usi_border:#31353b;
        --usi_text:#f1f3f4;
        --usi_muted:#aab1b9;
        --usi_media:#0f1113;
      }
    }

    body {
      margin:0;
      padding:24px;
      font-family:Helvetica,Arial,sans-serif;
      background:var(--usi_bg);
      color:var(--usi_text);
    }

    * { box-sizing:border-box; }

    .usi_mockup_root {
      max-width:1480px;
      margin:0 auto;
      display:flex;
      flex-direction:column;
      gap:20px;
    }

    .usi_mockup_header,
    .usi_mockup_section {
      background:var(--usi_surface);
      border:1px solid var(--usi_border);
      border-radius:16px;
      padding:20px;
    }

    .usi_mockup_header h1,
    .usi_mockup_header p,
    .usi_mockup_section h2 {
      margin:0 0 12px 0;
    }

    .usi_mockup_gallery {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
      gap:20px;
    }

    .usi_mockup_card {
      margin:0;
      margin-bottom:3em;
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .usi_mockup_card a {
      position:relative;
      display:block;
      border:10px solid var(--usi_muted);
      border-radius:12px;
      overflow:hidden;
      background:var(--usi_surface);
      border-bottom:40px solid var(--usi_muted);
      border-top:40px solid var(--usi_muted);
      height:600px;
    }

    .usi_mockup_card img {
      display:block;
      width:100%;
      object-fit:contain;
      position:absolute;
      bottom:0;
      max-height:100%;
      object-position:right;
    }

    .usi_mockup_card figcaption {
      font-size:14px;
      color:var(--usi_muted);
      word-break:break-word;
    }

    .usi_mockup_card strong {
      display:block;
      color:var(--usi_text);
      margin-bottom:4px;
    }
  </style>
</head>
<body>
  <main class="usi_mockup_root">
    <section class="usi_mockup_header">
      <h1>Mockups</h1>
    </section>

    <section class="usi_mockup_section">
      <div class="usi_mockup_gallery">
        ${entries
          .map(
            (entry) => `
            <figure class="usi_mockup_card">
              <a href="${entry.href}" target="_blank" rel="noreferrer">
                <img src="${entry.href}" alt="${escapeHtml(entry.name)}" />
              </a>
              <figcaption>
                <strong>${escapeHtml(entry.name)}</strong>
              </figcaption>
            </figure>
          `
          )
          .join('')}
      </div>
    </section>
  </main>
</body>
</html>
`);
}