figma.showUI(__html__, {
  width: 420,
  height: 620,
  themeColors: true
});
type AnyNode = any;
type Role = 'cta' | 'disclaimer' | 'copy' | 'background' | 'other';
type PageName = 'p1' | 'p2' | 'p3';

function escHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeTemplateLiteralRaw(text: string): string {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`');
}

function sanitizeFilePart(text: string): string {
  return (
    String(text || 'untitled')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

function getYearMonth(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return yy + '-' + mm;
}

function buildExportBaseName(frame: AnyNode): string {
  const fileName = sanitizeFilePart(
    figma.root && figma.root.name ? figma.root.name : 'figma-file'
  );
  const frameName = sanitizeFilePart(
    frame && frame.name ? frame.name : 'artboard'
  );
  return fileName + '_' + frameName + '_' + getYearMonth();
}

function paintToCss(paint: AnyNode): string {
  if (!paint || paint.visible === false) return '';
  if (paint.type !== 'SOLID') return '';

  const alpha = paint.opacity == null ? 1 : paint.opacity;
  const color = paint.color || { r: 0, g: 0, b: 0 };
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);

  if (alpha >= 0.999) return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function percent(n: number, total: number): string {
  if (!total || total === 0) return '0%';
  const v = (n / total) * 100;
  const s = v.toFixed(4).replace(/\.?0+$/, '');
  return s + '%';
}

function absoluteBoxCss(node: AnyNode, frame: AnyNode): string {
  const nb = node && node.absoluteBoundingBox ? node.absoluteBoundingBox : null;
  const fb =
    frame && frame.absoluteBoundingBox ? frame.absoluteBoundingBox : null;

  const rel =
    nb && fb
      ? { x: nb.x - fb.x, y: nb.y - fb.y, width: nb.width, height: nb.height }
      : { x: node.x, y: node.y, width: node.width, height: node.height };

  return [
    'position: absolute;',
    'top: ' + percent(rel.y, frame.height) + ';',
    'left: ' + percent(rel.x, frame.width) + ';',
    'width: ' + percent(rel.width, frame.width) + ';',
    'height: ' + percent(rel.height, frame.height) + ';',
    'box-sizing: border-box;',
  ].join('\n');
}

function textCss(node: AnyNode): string {
  let css = '';

  if (typeof node.fontSize === 'number') {
    css +=
      'font-size: ' +
      (node.fontSize / 16).toFixed(4).replace(/\.?0+$/, '') +
      'em;\n';
  }

  if (node.textAlignHorizontal) {
    css +=
      'text-align: ' + String(node.textAlignHorizontal).toLowerCase() + ';\n';
  }

  if (
    Array.isArray(node.fills) &&
    node.fills !== figma.mixed &&
    node.fills.length
  ) {
    const fill = paintToCss(
      node.fills.find(function (p: AnyNode) {
        return p.visible !== false;
      })
    );
    if (fill) css += 'color: ' + fill + ';\n';
  }

  if (
    node.fontName !== figma.mixed &&
    node.fontName &&
    typeof node.fontName === 'object'
  ) {
    css += 'font-family: inherit;\n';
    if (/bold|semibold|demibold/i.test(String(node.fontName.style || ''))) {
      css += 'font-weight: 700;\n';
    }
  }

  return css;
}

function stringToHtmlForTemplate(text: string): string {
  const html = escHtml(text || '').replace(/\r\n|\n|\r/g, '<br />');
  return escapeTemplateLiteralRaw(html);
}

function inferRole(node: AnyNode): Role {
  const name = String(node && node.name ? node.name : '').toLowerCase();

  if (name.includes('disclaimer')) return 'disclaimer';
  if (name.includes('cta') || name.includes('button')) return 'cta';
  if (name.includes('copy')) return 'copy';

  if (
    name === 'bg' ||
    name.startsWith('bg/') ||
    name.startsWith('bg-') ||
    name.includes('/bg/') ||
    name.includes(' background') ||
    name.includes('background')
  ) {
    return 'background';
  }

  return 'other';
}

function extractText(node: AnyNode): string {
  if (!node) return '';

  if (node.type === 'TEXT') return node.characters || '';

  if ('children' in node && Array.isArray(node.children)) {
    const parts: string[] = [];
    for (const c of node.children) {
      const t = extractText(c);
      if (t) parts.push(t);
    }
    return parts.join(' ').trim();
  }

  return '';
}

function collectTextLayers(root: AnyNode): AnyNode[] {
  const out: AnyNode[] = [];

  (function walk(n: AnyNode) {
    if (!n) return;
    if (n.type === 'TEXT') out.push(n);

    if ('children' in n && Array.isArray(n.children)) {
      for (const c of n.children) walk(c);
    }
  })(root);

  return out;
}

function getVisualPosition(node: AnyNode, frame: AnyNode) {
  const nb = node && node.absoluteBoundingBox ? node.absoluteBoundingBox : null;
  const fb =
    frame && frame.absoluteBoundingBox ? frame.absoluteBoundingBox : null;

  if (nb && fb) {
    return {
      y: nb.y - fb.y,
      x: nb.x - fb.x,
    };
  }

  return {
    y: typeof node.y === 'number' ? node.y : 0,
    x: typeof node.x === 'number' ? node.x : 0,
  };
}

function sortNodesByVisualOrder(nodes: AnyNode[], frame: AnyNode): AnyNode[] {
  return ([] as AnyNode[]).concat(nodes as AnyNode[]).sort(function (
    a: AnyNode,
    b: AnyNode
  ) {
    const pa = getVisualPosition(a, frame);
    const pb = getVisualPosition(b, frame);

    if (Math.abs(pa.y - pb.y) > 1) return pa.y - pb.y;
    if (Math.abs(pa.x - pb.x) > 1) return pa.x - pb.x;

    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function isExportableNode(node: AnyNode): boolean {
  return !!node && typeof node.exportAsync === 'function';
}

function hasImageFill(node: AnyNode): boolean {
  if (!node || !Array.isArray(node.fills) || node.fills === figma.mixed) {
    return false;
  }

  return node.fills.some(function (fill: AnyNode) {
    return fill && fill.visible !== false && fill.type === 'IMAGE';
  });
}

function getNodeArea(node: AnyNode): number {
  const box = node && node.absoluteBoundingBox ? node.absoluteBoundingBox : null;
  if (box) return (box.width || 0) * (box.height || 0);
  return (node.width || 0) * (node.height || 0);
}

function pickBestBackgroundNode(nodes: AnyNode[]): AnyNode | null {
  if (!nodes.length) return null;

  const named = nodes.filter(function (n: AnyNode) {
    return inferRole(n) === 'background' && isExportableNode(n);
  });

  if (named.length) {
    named.sort(function (a: AnyNode, b: AnyNode) {
      return getNodeArea(b) - getNodeArea(a);
    });
    return named[0];
  }

  const imageFillNodes = nodes.filter(function (n: AnyNode) {
    return hasImageFill(n) && isExportableNode(n);
  });

  if (imageFillNodes.length) {
    imageFillNodes.sort(function (a: AnyNode, b: AnyNode) {
      return getNodeArea(b) - getNodeArea(a);
    });
    return imageFillNodes[0];
  }

  return null;
}

function collectRelevant(frame: AnyNode): {
  cta: AnyNode | null;
  disclaimer: AnyNode | null;
  copy: AnyNode | null;
  background: AnyNode | null;
} {
  const found = {
    cta: null,
    disclaimer: null,
    copy: null,
    background: null,
  };

  const allNodes: AnyNode[] = [];

  (function walk(node: AnyNode) {
    if (!node) return;

    allNodes.push(node);

    const role = inferRole(node);
    if (role === 'cta' || role === 'disclaimer' || role === 'copy') {
      if (!found[role]) found[role] = node;
    }

    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  })(frame);

  found.background = pickBestBackgroundNode(allNodes);

  return found;
}

function childNameIs(node: AnyNode, names: string[]): boolean {
  const n = String(node && node.name ? node.name : '')
    .trim()
    .toLowerCase();
  return names.indexOf(n) !== -1;
}

function findNamedChild(root: AnyNode, names: string[]): AnyNode | null {
  if (!root || !('children' in root) || !Array.isArray(root.children)) {
    return null;
  }

  for (const child of root.children) {
    if (childNameIs(child, names)) return child;
  }

  return null;
}

function findPageFrame(root: AnyNode, page: PageName): AnyNode | null {
  return findNamedChild(root, [page]);
}

function findEmailFrame(root: AnyNode): AnyNode | null {
  return findNamedChild(root, [
    'email',
    'lead capture',
    'lead-capture',
    'lead_capture',
  ]);
}

function findPhoneFrame(root: AnyNode): AnyNode | null {
  return findNamedChild(root, [
    'phone',
    'sms',
    'mobile phone',
    'mobile-phone',
    'mobile_phone',
  ]);
}

function indentMultiline(text: string, spaces: number): string {
  const pad = ' '.repeat(Math.max(0, spaces));

  return String(text || '')
    .split('\n')
    .map(function (line) {
      return line ? pad + line : line;
    })
    .join('\n');
}

function formatHtml(html: string): string {
  const raw = String(html || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const tokens = raw
    .replace(/>\s+</g, '>\n<')
    .split('\n')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);

  const voidTags = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);

  let depth = 0;
  const out: string[] = [];

  for (const token of tokens) {
    const isClosing = /^<\//.test(token);
    const tagMatch = token.match(/^<\/?([a-zA-Z0-9_-]+)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
    const isVoid = voidTags.has(tagName) || /\/>$/.test(token);
    const isComment = /^<!--/.test(token);
    const isInlineOpenClose = /^<[^>]+>.*<\/[^>]+>$/.test(token);
    const isOpeningTag = /^<[^/!][^>]*>$/.test(token) && !isVoid && !isInlineOpenClose;

    if (isClosing) depth = Math.max(0, depth - 1);

    out.push('  '.repeat(depth) + token);

    if (!isClosing && !isComment && isOpeningTag) depth += 1;
  }

  return out.join('\n');
}

function formatCss(css: string): string {
  const raw = String(css || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = raw.split('\n');
  const out: string[] = [];
  let depth = 0;

  for (const originalLine of lines) {
    const line = originalLine.trim();

    if (!line) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }

    if (line.startsWith('}')) {
      depth = Math.max(0, depth - 1);
    }

    out.push('  '.repeat(depth) + line);

    if (line.endsWith('{')) {
      depth += 1;
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function formatJsAssignment(source: string): string {
  return String(source).replace(
    /=(\s*)`([\s\S]*?)`;/,
    function (_match, ws, htmlBlock) {
      const prettyHtml = formatHtml(htmlBlock);
      return '=' + ws + '`\n' + indentMultiline(prettyHtml, 2) + '\n`;';
    }
  );
}

const DEFAULT_DISCLAIMER_HTML =
  'We use your information in accordance with our <a href="https://labs.upsellit.com/privacy-policy" target="_blank">privacy policy</a>.';

async function exportPngAsset(node: AnyNode, fileName: string) {
  if (!node) {
    throw new Error('Export target not found.');
  }

  if (!isExportableNode(node)) {
    throw new Error(
      'Layer "' + (node && node.name ? node.name : 'unknown') + '" is not exportable.'
    );
  }

  const bytes = new Uint8Array(
    await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 3 },
    })
  );

  return {
    name: fileName,
    base64: figma.base64Encode(bytes),
    mime: 'image/png',
  };
}

function buildEmailHtml(): string {
  return (
    'usi_js.display_vars.email_html = `\n' +
    '  <div id="usi_email_container">\n' +
    '    <label class="usi_email_label usi_sr_only" for="usi_email">Enter Email</label>\n' +
    '    <input placeholder="Enter Email" value="" type="text" name="usi_email" id="usi_email" onkeydown="if (event.keyCode == 13) { usi_js.submit(); return false; }" />\n' +
    '    <div id="usi_email_good_container"><img id="usi_email_good" src="${usi_js.campaign.images}/images/spacer.gif" style="width:14px; height:14px;" border="0" alt="valid" /></div>\n' +
    '  </div>\n' +
    '`;\n'
  );
}

function buildPhoneHtml(): string {
  return (
    'usi_js.display_vars.phone_html = `\n' +
    '  <div id="usi_phone_container">\n' +
    '    <label class="usi_phone_label usi_sr_only" for="usi_phone">Enter Your Mobile Phone Number</label>\n' +
    '    <input placeholder="Enter Your Mobile Phone Number" type="text" name="usi_phone" id="usi_phone" onkeydown="if (event.keyCode == 13) { usi_js.phone.submit(); return false; }" onkeyup="usi_js.phone.format(this)" />\n' +
    '    <div id="usi_phone_good_container"><img id="usi_phone_good" src="${usi_js.campaign.images}/images/spacer.gif" style="width:14px; height:14px;" border="0" alt="valid" /></div>\n' +
    '  </div>\n' +
    '`;\n'
  );
}

function buildPageMarkup(
  frame: AnyNode,
  options: {
    flattenArtboard: boolean;
    includeBgImage: boolean;
    bgImageName: string;
  }
): { html: string; css: string } {
  const found = collectRelevant(frame);
  const disclaimerRef = found.disclaimer;
  const ctaRef = found.cta;

  const srOnlySuffix = options.flattenArtboard ? ' usi_sr_only' : '';
  const headClass = 'usi_head1' + srOnlySuffix;
  const subheadClass = 'usi_head2' + srOnlySuffix;
  const buttonClass = 'usi_submitbutton' + srOnlySuffix;
  const buttonLabelClass = 'usi_submitbutton_label' + srOnlySuffix;

  let bgImgHtml = '';
  let bgImgCss = '';

  if (options.includeBgImage && found.background) {
    bgImgHtml =
      '\n  <img class="usi_bg_image" src="' +
      options.bgImageName +
      '" alt="" />\n';

    bgImgCss =
      '.usi_bg_image {\n' +
      '  ' +
      absoluteBoxCss(found.background, frame) +
      '\n' +
      '  display: block;\n' +
      '  object-fit: cover;\n' +
      '  pointer-events: none;\n' +
      '  z-index: 0;\n' +
      '}\n';
  }

  let disclaimerHtml = '';
  if (disclaimerRef) {
    disclaimerHtml = escHtml(disclaimerRef.characters || '').replace(
      /\r\n|\n|\r/g,
      '<br />'
    );
  } else {
    disclaimerHtml = DEFAULT_DISCLAIMER_HTML;
  }

  const disclaimerHtmlEsc = escapeTemplateLiteralRaw(disclaimerHtml);

  const allTextNodes = sortNodesByVisualOrder(collectTextLayers(frame), frame);
  const disclaimerId = disclaimerRef ? String(disclaimerRef.id) : '';
  const ctaTextNodes = ctaRef
    ? sortNodesByVisualOrder(collectTextLayers(ctaRef), frame)
    : [];
  const ctaTextIds = new Set<string>(
    ctaTextNodes.map(function (n) {
      return String(n.id);
    })
  );

  const candidateTextNodes = allTextNodes.filter(function (n: AnyNode) {
    return String(n.id) !== disclaimerId && !ctaTextIds.has(String(n.id));
  });

  const headRef = candidateTextNodes.length > 0 ? candidateTextNodes[0] : null;
  const subheadRef =
    candidateTextNodes.length > 1 ? candidateTextNodes[1] : null;

  const headText = headRef ? extractText(headRef) : '';
  const subheadText = subheadRef ? extractText(subheadRef) : '';

  const headId = headRef ? String(headRef.id) : '';
  const subheadId = subheadRef ? String(subheadRef.id) : '';

  const remainingTextNodes = candidateTextNodes.filter(function (n: AnyNode) {
    return String(n.id) !== headId && String(n.id) !== subheadId;
  });

  const ctaText = extractText(ctaRef) || 'Redeem Now';

  const headExtra = headRef
    ? textCss(headRef) + 'white-space: pre-wrap;\n'
    : 'font-size: 3em;\ntext-align: center;\nwhite-space: pre-wrap;\n';

  const subheadExtra = subheadRef
    ? textCss(subheadRef) + 'white-space: pre-wrap;\n'
    : 'font-size: 1.5em;\ntext-align: center;\nwhite-space: pre-wrap;\n';

  const headBoxCss = headRef ? absoluteBoxCss(headRef, frame) + '\n' : '';
  const subheadBoxCss = subheadRef
    ? absoluteBoxCss(subheadRef, frame) + '\n'
    : '';

  const ctaCss = ctaRef
    ? absoluteBoxCss(ctaRef, frame)
    : [
        'position: absolute;',
        'top: 61.5%;',
        'left: 46%;',
        'width: 47.5%;',
        'height: 12.5%;',
        'box-sizing: border-box;',
      ].join('\n');

  const disclaimerCss = disclaimerRef
    ? absoluteBoxCss(disclaimerRef, frame)
    : [
        'position: absolute;',
        'top: 94%;',
        'left: 46%;',
        'width: 47.5%;',
        'height: auto;',
        'box-sizing: border-box;',
      ].join('\n');

  const ctaLabelTextCss = ctaTextNodes.length ? textCss(ctaTextNodes[0]) : '';
  let ctaVisualCss = '';

  if (ctaRef) {
    if (
      typeof ctaRef.cornerRadius === 'number' &&
      !Number.isNaN(ctaRef.cornerRadius)
    ) {
      ctaVisualCss += '\n  border-radius: ' + ctaRef.cornerRadius + 'px;';
    }

    if (
      Array.isArray(ctaRef.fills) &&
      ctaRef.fills !== figma.mixed &&
      ctaRef.fills.length
    ) {
      const fill = paintToCss(
        ctaRef.fills.find(function (p: AnyNode) {
          return p.visible !== false;
        })
      );
      if (fill) ctaVisualCss += '\n  background: ' + fill + ';';
    }

    if (
      Array.isArray(ctaRef.strokes) &&
      ctaRef.strokes !== figma.mixed &&
      ctaRef.strokes.length
    ) {
      const stroke = paintToCss(
        ctaRef.strokes.find(function (p: AnyNode) {
          return p.visible !== false;
        })
      );

      if (stroke) {
        const weight =
          typeof ctaRef.strokeWeight === 'number' ? ctaRef.strokeWeight : 1;
        ctaVisualCss +=
          '\n  border: ' + weight + 'px solid ' + stroke + ';';
      }
    }

    if (typeof ctaRef.opacity === 'number' && ctaRef.opacity < 1) {
      ctaVisualCss += '\n  opacity: ' + ctaRef.opacity + ';';
    }
  }

  let extraHtml = '';
  let extraCss = '';
  let textIndex = 1;

  for (const node of remainingTextNodes) {
    const cls = 'usi_text' + textIndex++;
    const fullCls = cls + srOnlySuffix;

    extraHtml +=
      '\n    <div class="' +
      fullCls +
      '">' +
      stringToHtmlForTemplate(node.characters || extractText(node)) +
      '</div>';

    extraCss +=
      '\n.' +
      cls +
      ' {\n' +
      '  ' +
      absoluteBoxCss(node, frame) +
      '\n' +
      '  ' +
      textCss(node) +
      'white-space: pre-wrap;\n' +
      '  overflow-wrap: anywhere;\n' +
      '  z-index: 1;\n' +
      '}\n';
  }

  const ctaLabelHtml =
    ctaTextNodes.length > 0
      ? ctaTextNodes
          .map(function (n: AnyNode) {
            return (
              '\n    <div class="' +
              buttonLabelClass +
              '">' +
              stringToHtmlForTemplate(n.characters || '') +
              '</div>'
            );
          })
          .join('')
      : '\n    <div class="' +
        buttonLabelClass +
        '">' +
        stringToHtmlForTemplate(ctaText) +
        '</div>';

  const headHtml = headRef
    ? '\n    <div class="' +
      headClass +
      '">' +
      stringToHtmlForTemplate(headText) +
      '</div>'
    : '';

  const subheadHtml = subheadRef
    ? '\n    <div class="' +
      subheadClass +
      '">' +
      stringToHtmlForTemplate(subheadText) +
      '</div>'
    : '';

  const html =
    bgImgHtml +
    '  <div class="usi_copy_container">' +
    headHtml +
    subheadHtml +
    extraHtml +
    '\n' +
    '  </div>\n' +
    '  <button\n' +
    '    class="' +
    buttonClass +
    '"\n' +
    '    onclick="usi_js.click_cta();"\n' +
    '    type="button"\n' +
    '  >' +
    ctaLabelHtml +
    '\n' +
    '  </button>\n' +
    '  <div class="usi_disclaimer">' +
    disclaimerHtmlEsc +
    '</div>\n';

  const css =
    '.usi_copy_container {\n' +
    '  z-index: 1;\n' +
    '}\n' +
    '.usi_head1 {\n' +
    '  ' +
    headBoxCss +
    headExtra +
    '  z-index: 1;\n' +
    '}\n' +
    '.usi_head2 {\n' +
    '  ' +
    subheadBoxCss +
    subheadExtra +
    '  z-index: 1;\n' +
    '}\n' +
    '.usi_disclaimer {\n' +
    '  ' +
    disclaimerCss +
    '\n' +
    '  padding: 0 1em;\n' +
    '  text-align: center;\n' +
    '  color: #666;\n' +
    '  font-size: 0.65em;\n' +
    '  z-index: 2;\n' +
    '}\n' +
    '.usi_disclaimer a {\n' +
    '  text-align: center;\n' +
    '  color: inherit;\n' +
    '  font-size: 1em;\n' +
    '  text-decoration: underline !important;\n' +
    '}\n' +
    '.usi_submitbutton_label {\n' +
    '  white-space: pre-wrap;\n' +
    '}\n' +
    '.usi_submitbutton:hover,\n' +
    '.usi_submitbutton:active,\n' +
    '.usi_submitbutton:focus {\n' +
    '  border: none;\n' +
    '  outline: none;\n' +
    '}\n' +
    '.usi_submitbutton {\n' +
    '  ' +
    ctaCss +
    '\n' +
    '  margin: 0;\n' +
    '  padding: 0;\n' +
    '  display: inline-block;\n' +
    '  outline: none;\n' +
    '  background: #000;\n' +
    '  color: #fff;\n' +
    '  border: none;\n' +
    '  cursor: pointer;\n' +
    '  text-align: center;\n' +
    '  z-index: 2;\n' +
    '}\n' +
    bgImgCss +
    extraCss +
    '\n.usi_submitbutton_label {\n' +
    '  white-space: pre-wrap;\n' +
    ctaLabelTextCss +
    '}\n' +
    '.usi_submitbutton {\n' +
    '  display: flex;\n' +
    '  align-items: center;\n' +
    '  justify-content: center;' +
    ctaVisualCss +
    '\n' +
    '}\n';

  return { html: html, css: css };
}

async function buildUpsellitExport(
  root: AnyNode,
  options: { flattenArtboard: boolean }
) {
  const assets: { name: string; base64: string; mime: string }[] = [];
  const exportBaseName = buildExportBaseName(root);

  const p1Frame = findPageFrame(root, 'p1') || root;
  const p2Frame = findPageFrame(root, 'p2');
  const p3Frame = findPageFrame(root, 'p3');
  const emailFrame = findEmailFrame(root);
  const phoneFrame = findPhoneFrame(root);

  const p1Bg = collectRelevant(p1Frame).background;
  const p1BgAssetName = 'assets/' + exportBaseName + '.png';

  if (options.flattenArtboard) {
    const asset = await exportPngAsset(p1Frame, p1BgAssetName);
    assets.push(asset);
  } else if (p1Bg) {
    const asset = await exportPngAsset(p1Bg, p1BgAssetName);
    assets.push(asset);
  }

  const p1 = buildPageMarkup(p1Frame, {
    flattenArtboard: options.flattenArtboard,
    includeBgImage: !options.flattenArtboard && !!p1Bg,
    bgImageName: p1BgAssetName,
  });

  const p2 = p2Frame
    ? buildPageMarkup(p2Frame, {
        flattenArtboard: options.flattenArtboard,
        includeBgImage: false,
        bgImageName: '',
      })
    : null;

  const p3 = p3Frame
    ? buildPageMarkup(p3Frame, {
        flattenArtboard: options.flattenArtboard,
        includeBgImage: false,
        bgImageName: '',
      })
    : null;

  const jsParts: string[] = [];

  jsParts.push(
    'usi_js.click_cta = () => {\n' +
      '  try {\n' +
      '    usi_js.deep_link();\n' +
      '  } catch (err) {\n' +
      '    usi_commons.report_error(err);\n' +
      '  }\n' +
      '};\n\n'
  );

  if (emailFrame) {
    jsParts.push(formatJsAssignment(buildEmailHtml()) + '\n');
  }

  if (phoneFrame) {
    jsParts.push(formatJsAssignment(buildPhoneHtml()) + '\n');
  }

  jsParts.push(
    'usi_js.display_vars.p1_html = `\n' +
      indentMultiline(formatHtml(p1.html), 2) +
      '\n`;\n\n'
  );

  if (p2) {
    jsParts.push(
      'usi_js.display_vars.p2_html = `\n' +
        indentMultiline(formatHtml(p2.html), 2) +
        '\n`;\n\n'
    );
  }

  if (p3) {
    jsParts.push(
      'usi_js.display_vars.p3_html = `\n' +
        indentMultiline(formatHtml(p3.html), 2) +
        '\n`;\n\n'
    );
  }

  const aspectPadding = root.width
    ? ((root.height / root.width) * 100).toFixed(1)
    : '56.25';
  const hasEmail = !!emailFrame;
  const hasPhone = !!phoneFrame;

  const cssParts: string[] = [];

  cssParts.push(
    '.usi_display * {\n' +
      '  font-size: 1em;\n' +
      '  line-height: 1.2;\n' +
      '  box-sizing: border-box;\n' +
      '  color: inherit;\n' +
      '  font-family: inherit;\n' +
      '}\n' +
      '.usi_display {\n' +
      '  position: relative;\n' +
      '  color: #000;\n' +
      '  font-family: inherit;\n' +
      '  background: transparent;\n' +
      '  overflow: hidden;\n' +
      '}\n'
  );

  cssParts.push(p1.css);
  if (p2) cssParts.push(p2.css);
  if (p3) cssParts.push(p3.css);

  cssParts.push(
    '.usi_sr_only {\n' +
      '  position: absolute !important;\n' +
      '  width: 1px !important;\n' +
      '  height: 1px !important;\n' +
      '  padding: 0 !important;\n' +
      '  margin: -1px !important;\n' +
      '  overflow: hidden !important;\n' +
      '  clip: rect(0, 0, 0, 0) !important;\n' +
      '  white-space: nowrap !important;\n' +
      '  border: 0 !important;\n' +
      '}\n' +
      '#usi_close {\n' +
      '  width: 2em;\n' +
      '  height: 2em;\n' +
      '  text-align: center;\n' +
      '  font-size: 1.5em;\n' +
      '  left: auto;\n' +
      '  right: 0;\n' +
      '  background: none;\n' +
      '  cursor: pointer;\n' +
      '  z-index: 3;\n' +
      '}\n' +
      '#usi_close:after {\n' +
      '  content: "\\00d7";\n' +
      '}\n'
  );

  if (hasEmail) {
    cssParts.push(
      '#usi_email_container {\n' +
        '  position: absolute;\n' +
        '  top: 50%;\n' +
        '  left: 0%;\n' +
        '  width: 40%;\n' +
        '  height: 20%;\n' +
        '  border: 1px solid #d3ced2;\n' +
        '}\n' +
        '#usi_email {\n' +
        '  box-shadow: none;\n' +
        '  padding: 0 0 0 5%;\n' +
        '  width: 100%;\n' +
        '  height: 100%;\n' +
        '  border: none;\n' +
        '  outline: none;\n' +
        '  background-color: transparent;\n' +
        '  color: #666;\n' +
        '  text-align: left;\n' +
        '}\n' +
        '#usi_email_good_container {\n' +
        '  position: absolute;\n' +
        '  top: 0;\n' +
        '  bottom: 0;\n' +
        '  margin: auto;\n' +
        '  right: 2%;\n' +
        '  width: 14px;\n' +
        '  height: 14px;\n' +
        '}\n'
    );
  }

  if (hasPhone) {
    cssParts.push(
      '#usi_phone_container {\n' +
        '  position: absolute;\n' +
        '  top: 50%;\n' +
        '  left: 0%;\n' +
        '  width: 40%;\n' +
        '  height: 20%;\n' +
        '  border: 1px solid #d3ced2;\n' +
        '}\n' +
        '#usi_phone {\n' +
        '  box-shadow: none;\n' +
        '  padding: 0 0 0 5%;\n' +
        '  width: 100%;\n' +
        '  height: 100%;\n' +
        '  border: none;\n' +
        '  outline: none;\n' +
        '  background-color: transparent;\n' +
        '  color: #666;\n' +
        '  text-align: left;\n' +
        '}\n' +
        '#usi_phone_good_container {\n' +
        '  position: absolute;\n' +
        '  top: 0;\n' +
        '  bottom: 0;\n' +
        '  margin: auto;\n' +
        '  right: 2%;\n' +
        '  width: 14px;\n' +
        '  height: 14px;\n' +
        '}\n'
    );
  }

  cssParts.push(
    '@media screen and (max-width: 760px) {\n' +
      '  .usi_display {\n' +
      '    top: 0;\n' +
      '    left: 0;\n' +
      '    margin: 0;\n' +
      '    width: 100% !important;\n' +
      '    height: auto !important;\n' +
      '    padding-top: ' +
      aspectPadding +
      '%;\n' +
      '    font-size: 2vw;\n' +
      '  }\n' +
      '}\n'
  );

  const css = formatCss(cssParts.join('\n'));
  const htmlJs = jsParts.join('');

  return {
    packageFileName: exportBaseName + '.zip',
    convertPngAssetsToWebp: true,
    files: [
      { name: 'display.html.js', text: htmlJs },
      { name: 'display.css', text: css },
      ...assets,
    ],
  };
}

figma.ui.onmessage = async (msg: AnyNode) => {
  if (msg && msg.type === 'export-package') {
    const selection = figma.currentPage.selection;

    if (!selection.length) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Select a top-level frame first.',
      });
      return;
    }

    const root = selection[0] as AnyNode;

    if (!root || !('children' in root)) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Selected node must be a frame/group with children.',
      });
      return;
    }

    try {
      const payload = await buildUpsellitExport(root, {
        flattenArtboard: !!msg.flattenArtboard,
      });

      figma.ui.postMessage({ type: 'package-ready', payload: payload });
    } catch (err: AnyNode) {
      figma.ui.postMessage({
        type: 'error',
        message:
          err && err.message
            ? String(err.message)
            : err
              ? String(err)
              : 'Export failed.',
      });
    }
  }

  if (msg && msg.type === 'cancel') {
    figma.closePlugin();
  }
};