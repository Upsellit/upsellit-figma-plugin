import { formatCss } from '../utils/string';

const DEVMODE_BASE_SELECTORS: Record<string, boolean> = {
  '*': true,
  html: true,
  body: true,
  '.usi_display': true,
  '.usi_display *': true,
  '.usi_quickide_css': true,
  '#usi_container': true,
  '#usi_display': true,
  '.usi_shadow': true,
  '#usi_content': true,
  '#usi_background': true,
  '#usi_background_img': true,
  '#usi_close': true,
  '#usi_close::before': true,
  'button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus': true,
  '.usi_flattened_semantic': true,
  '.usi_sr_only': true,
};

function normalizeSelector(selector: string): string {
  return String(selector || '').replace(/\s+/g, ' ').trim();
}

function splitCssBlocks(source: string): Array<{ selector: string; body: string }> {
  const input = String(source || '');
  const blocks: Array<{ selector: string; body: string }> = [];
  let cursor = 0;

  while (cursor < input.length) {
    const start = input.indexOf('{', cursor);
    if (start === -1) break;
    const selector = input.slice(cursor, start).trim();
    let depth = 1;
    let end = start + 1;
    while (end < input.length && depth > 0) {
      if (input.charAt(end) === '{') depth += 1;
      if (input.charAt(end) === '}') depth -= 1;
      end += 1;
    }
    const body = input.slice(start + 1, Math.max(start + 1, end - 1)).trim();
    if (selector && body) {
      blocks.push({ selector: selector, body: body });
    }
    cursor = end;
  }

  return blocks;
}

export function extractCampaignCss(source: string): string {
  const blocks = splitCssBlocks(source);
  const kept = blocks.filter(function (block) {
    const selector = normalizeSelector(block.selector);
    if (/^@media\b/i.test(selector)) return true;
    return !DEVMODE_BASE_SELECTORS[selector];
  });

  return formatCss(
    kept
      .map(function (block) {
        return block.selector + ' {\n' + block.body + '\n}';
      })
      .join('\n\n')
  );
}
