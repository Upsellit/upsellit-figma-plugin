import {
  AnalysisResult,
  ClientComponentCatalogEntry,
  CommonComponentDefinition,
  ComponentTemplateId,
  ExportRole,
  FlattenedVariant,
  NodeBounds,
  NormalizedNode,
  Product,
  PromoExport,
  Summary,
} from '../types';
import { escapeHtml, escapeTemplateString, formatCss, formatHtml } from '../utils/string';
import { COMPONENT_BY_ID, COMPONENT_BY_ROLE } from '../constants';
import {
  cssDeclarations,
  getProductionScaleForFrame,
  lineHeightCss,
  pxToEm,
  scalePx,
  textTransformFromCase,
  toPercent,
} from '../utils/css';
import {
  collectText,
  findImageNodeId,
  findNodesByRole,
  findNormalizedNodeById,
  flattenTree,
  pickBestNode,
} from '../analysis/index';

const PRODUCT_PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/EEE/31343C';
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

function renderProductCard(product: Product): string {
  const imageHtml = product.imageAsset
    ? '<img class="usi_product_image" src="' +
      escapeHtml(product.imageAsset) +
      '" alt="' +
      escapeHtml(product.imageAlt || product.title || 'Product image') +
      '" />'
    : '<div class="usi_product_image usi_product_image_placeholder" aria-hidden="true"></div>';
  const subtitleHtml = product.subtitle ? '<p class="usi_product_meta">' + escapeHtml(product.subtitle) + '</p>' : '';
  const priceHtml = product.price ? '<p class="usi_product_price">' + escapeHtml(product.price) + '</p>' : '';
  const ctaHtml = product.cta ? '<button class="usi_product_cta" type="button">' + escapeHtml(product.cta) + '</button>' : '';

  return (
    '<article class="usi_product_card">' +
    imageHtml +
    '<section class="usi_product_body">' +
    '<h3 class="usi_product_title">' +
    escapeHtml(product.title || 'Product') +
    '</h3>' +
    subtitleHtml +
    priceHtml +
    ctaHtml +
    '</section>' +
    '</article>'
  );
}

function hasInsertedComponent(root: NormalizedNode, componentId: ComponentTemplateId): boolean {
  return flattenTree(root).some(function (node) {
    return !node.ignored && node.componentOverride === componentId;
  });
}

function buildPriceRuntimeSetup(includeSummary: boolean): string {
  if (!includeSummary) return '';
  return (
    'try {\n' +
    '  const subtotal_raw = usi_cookies.get("usi_subtotal");\n' +
    '  const subtotal_num = Number(subtotal_raw);\n' +
    '  const discount = (subtotal_num * 0.15).toFixed(2);\n' +
    '  const new_price = (subtotal_num - Number(discount)).toFixed(2);\n' +
    '  if (isNaN(subtotal_num) || isNaN(Number(discount)) || isNaN(Number(new_price))) {\n' +
    '    throw new Error("Invalid price values");\n' +
    '  }\n' +
    '  usi_js.product = { subtotal: subtotal_raw, discount: discount, new_price: new_price };\n' +
    '} catch (err) {\n' +
    '  usi_commons.report_error(err);\n' +
    '  usi_js.launch.enabled = false;\n' +
    '  usi_js.launch.suppress = true;\n' +
    '}\n\n'
  );
}

function renderSummary(summary?: Summary): string {
  if (!summary || !summary.rows.length) return '';
  const rowsHtml = summary.rows
    .map(function (row) {
      return (
        '<div class="usi_summary_row"><span>' +
        escapeHtml(row.label) +
        '</span><strong>' +
        escapeHtml(row.value || '') +
        '</strong></div>'
      );
    })
    .join('');
  return '<section class="usi_summary" aria-label="Cart summary">' + rowsHtml + '</section>';
}

function componentDefinitionForNode(node: NormalizedNode): CommonComponentDefinition | undefined {
  if (node.componentOverride && COMPONENT_BY_ID[node.componentOverride]) {
    return COMPONENT_BY_ID[node.componentOverride];
  }
  return COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || 'other'];
}

function componentText(node: NormalizedNode, definition?: CommonComponentDefinition): string {
  const text = collectText(node) || node.text || node.name || '';
  if (text) return text;
  return definition && definition.render.fallbackText ? definition.render.fallbackText : '';
}

function shouldRenderInFlattened(
  definition: CommonComponentDefinition | undefined,
  hideVisibleText: boolean
): boolean {
  if (!definition) return false;
  return hideVisibleText ? definition.render.flattened.textBaked : definition.render.flattened.liveText;
}

function shouldRenderAsFlattenedHtml(
  definition: CommonComponentDefinition | undefined,
  hideVisibleText: boolean
): boolean {
  if (!definition) return false;
  if (!hideVisibleText) return definition.role !== 'disclaimer';
  return definition.render.kind !== 'optin' && definition.role !== 'disclaimer';
}

// Most new components should only need a new render.kind case here.
function renderExplicitComponentNode(node: NormalizedNode): string {
  const definition = componentDefinitionForNode(node);
  if (!definition) return '';
  const tag = definition.render.htmlTag;
  const className = definition.render.className;
  const text = componentText(node, definition);
  const kind = definition.render.kind;

  if (kind === 'input') {
    return '<label class="' + className + '"><span class="usi_field_label">' + escapeHtml(node.name || definition.label) + '</span><input class="usi_field_input" type="' + escapeHtml(definition.render.inputType || 'text') + '" placeholder="' + escapeHtml(text) + '" /></label>';
  }

  if (kind === 'survey') {
    const children = node.children.filter(function (child) { return !child.ignored && child.visible; });
    const prompt = children[0] ? componentText(children[0]) : text;
    const options = (children.length > 1 ? children.slice(1) : [])
      .map(function (child) {
        return '<button class="usi_survey_option" type="button">' + escapeHtml(componentText(child)) + '</button>';
      })
      .join('') || '<button class="usi_survey_option" type="button">Option 1</button><button class="usi_survey_option" type="button">Option 2</button>';
    return '<section class="' + className + '"><p class="usi_survey_prompt">' + escapeHtml(prompt) + '</p><div class="usi_survey_options">' + options + '</div></section>';
  }

  if (kind === 'coupon') {
    const childrenText = node.children.map(function (child) { return componentText(child); }).filter(Boolean);
    const code = childrenText[0] || text || definition.render.fallbackText || 'SAVE15';
    const label = childrenText[1] || definition.render.buttonText || 'Copy Code';
    return '<section class="' + className + '"><div class="usi_coupon_code">' + escapeHtml(code) + '</div><button class="usi_coupon_button" type="button">' + escapeHtml(label) + '</button></section>';
  }

  if (kind === 'optin') {
    return '<label class="' + className + '"><input class="usi_optin_input" type="checkbox" /><span class="usi_optin_label">' + escapeHtml(text) + '</span></label>';
  }

  if (kind === 'countdown') {
    return '<div class="' + className + '">' + escapeHtml(text || '09:59') + '</div>';
  }

  if (kind === 'progress') {
    return '<div class="' + className + '"><div class="usi_progress_fill"></div></div>';
  }

  if (kind === 'media') {
    if (tag === 'hr') {
      return '<hr class="' + className + '" />';
    }
    return '<div class="' + className + '" aria-hidden="true"></div>';
  }

  if (kind === 'button' || tag === 'button') {
    return '<button class="' + className + '" type="button">' + escapeHtml(text || definition.render.buttonText || definition.label) + '</button>';
  }

  return '<' + tag + ' class="' + className + '">' + escapeHtml(text) + '</' + tag + '>';
}

function renderExtraRegionNodes(
  root: NormalizedNode,
  region: CommonComponentDefinition['render']['region'],
  excludedIds: string[],
  hideVisibleText?: boolean
): string {
  const rendered: string[] = [];

  (function walk(node: NormalizedNode) {
    if (node.ignored || excludedIds.indexOf(node.id) !== -1) return;
    const definition = componentDefinitionForNode(node);
    const shouldRenderNode =
      !!definition &&
      definition.render.region === region &&
      (hideVisibleText == null || shouldRenderAsFlattenedHtml(definition, hideVisibleText));

    if (shouldRenderNode) {
      rendered.push(renderExplicitComponentNode(node));
      return;
    }

    for (let index = 0; index < node.children.length; index += 1) {
      walk(node.children[index]);
    }
  })(root);

  return rendered.join('');
}

function renderExtraRegionCss(
  root: NormalizedNode,
  region: CommonComponentDefinition['render']['region'],
  excludedIds: string[]
): string {
  const nodes: NormalizedNode[] = [];

  (function walk(node: NormalizedNode) {
    if (node.ignored || excludedIds.indexOf(node.id) !== -1) return;
    const definition = componentDefinitionForNode(node);
    if (definition && definition.render.region === region) {
      nodes.push(node);
      return;
    }
    for (let index = 0; index < node.children.length; index += 1) {
      walk(node.children[index]);
    }
  })(root);

  return nodes
    .map(function (node, index) {
      const definition = componentDefinitionForNode(node);
      if (!definition) return '';
      return semanticNodeRule('.' + definition.render.className.split(' ')[0] + ':nth-of-type(' + (index + 1) + ')', node, {});
    })
    .join('');
}

function inlineStyleAttr(style: Record<string, string | number | undefined>): string {
  const css = cssDeclarations(style);
  return css ? ' style="' + escapeHtml(css) + '"' : '';
}

function combineBounds(nodes: Array<NormalizedNode | undefined>): NodeBounds | undefined {
  const filtered = nodes.filter(Boolean) as NormalizedNode[];
  if (!filtered.length) return undefined;
  let left = filtered[0].bounds.x;
  let top = filtered[0].bounds.y;
  let right = filtered[0].bounds.x + filtered[0].bounds.width;
  let bottom = filtered[0].bounds.y + filtered[0].bounds.height;
  for (let index = 1; index < filtered.length; index += 1) {
    left = Math.min(left, filtered[index].bounds.x);
    top = Math.min(top, filtered[index].bounds.y);
    right = Math.max(right, filtered[index].bounds.x + filtered[index].bounds.width);
    bottom = Math.max(bottom, filtered[index].bounds.y + filtered[index].bounds.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function flattenedTextDeclarations(
  node: NormalizedNode | undefined,
  frameScale: number,
  extra?: Record<string, string | number | undefined>
): string {
  if (!node) return '';
  return cssDeclarations(Object.assign({
    color: node.style.color,
    opacity: node.style.opacity,
    'font-family': node.style.fontFamily ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif' : undefined,
    'font-style': node.style.fontStyle,
    'font-size': node.style.fontSize ? pxToEm(node.style.fontSize, 16, frameScale) : undefined,
    'font-weight': node.style.fontWeight,
    'line-height': node.style.lineHeight ? pxToEm(node.style.lineHeight, 16, frameScale) : undefined,
    'letter-spacing': node.style.letterSpacing ? pxToEm(node.style.letterSpacing, 16, frameScale) : undefined,
    'text-align': node.style.textAlign,
    'text-transform': textTransformFromCase(node.style.textCase),
  }, extra || {}));
}

function flattenedBoxDeclarations(
  node: NormalizedNode | undefined,
  frameScale: number,
  extra?: Record<string, string | number | undefined>
): string {
  if (!node) return cssDeclarations(extra || {});
  return cssDeclarations(Object.assign({
    'background-color': node.style.background,
    color: node.style.color,
    border: node.style.borderColor ? String(node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor : undefined,
    'border-radius': node.style.borderRadius != null ? String(node.style.borderRadius) + 'px' : undefined,
    opacity: node.style.opacity,
    'font-family': node.style.fontFamily ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif' : undefined,
    'font-style': node.style.fontStyle,
    'font-size': node.style.fontSize ? pxToEm(node.style.fontSize, 16, frameScale) : undefined,
    'font-weight': node.style.fontWeight,
    'line-height': node.style.lineHeight ? pxToEm(node.style.lineHeight, 16, frameScale) : undefined,
    'letter-spacing': node.style.letterSpacing ? pxToEm(node.style.letterSpacing, 16, frameScale) : undefined,
    'text-align': node.style.textAlign,
    'text-transform': textTransformFromCase(node.style.textCase),
  }, extra || {}));
}

function findDescendantRoleNode(root: NormalizedNode | undefined, role: ExportRole): NormalizedNode | undefined {
  if (!root) return undefined;
  return pickBestNode(findNodesByRole(root, role, 0.1));
}

function resolveSummaryTitle(summaryNode: NormalizedNode | undefined): string | undefined {
  if (!summaryNode) return undefined;
  for (let index = 0; index < summaryNode.children.length; index += 1) {
    const child = summaryNode.children[index];
    const text = String(child.text || collectText(child) || '').trim();
    if (!text) continue;
    if (!/(subtotal|discount|total|\$)/i.test(text)) return text;
  }
  const ownText = String(summaryNode.text || '').trim();
  if (ownText && !/(subtotal|discount|total|\$)/i.test(ownText)) return ownText;
  return undefined;
}

function regionRule(selector: string, root: NormalizedNode, bounds?: NodeBounds): string {
  if (!bounds) return '';
  return selector + ' { ' + cssDeclarations({
    width: toPercent(bounds.width, root.bounds.width),
    'min-height': toPercent(bounds.height, root.bounds.height),
  }) + ' }\n';
}

function buttonStyleDeclarations(node: NormalizedNode): Record<string, string | number | undefined> {
  return {
    'background-color': node.style.background || 'transparent',
    color: node.style.color || '#111111',
    border: node.style.borderColor
      ? (node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor
      : '1px solid rgba(0, 0, 0, 0.25)',
    'border-radius': node.style.borderRadius != null ? node.style.borderRadius + 'px' : undefined,
    opacity: node.style.opacity,
    'font-size': node.style.fontSize ? node.style.fontSize + 'px' : undefined,
    'font-weight': node.style.fontWeight,
    'line-height': lineHeightCss(node),
    'letter-spacing': node.style.letterSpacing ? node.style.letterSpacing + 'px' : undefined,
    'text-align': node.style.textAlign,
    'text-transform': textTransformFromCase(node.style.textCase),
  };
}

function semanticBoxInlineStyle(node?: NormalizedNode): string {
  if (!node) return '';
  return inlineStyleAttr({
    'background-color': node.style.background,
    color: node.style.color,
    border: node.style.borderColor ? (node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor : undefined,
    'border-radius': node.style.borderRadius != null ? node.style.borderRadius + 'px' : undefined,
    opacity: node.style.opacity,
  });
}

function semanticNodeRule(
  selector: string,
  node: NormalizedNode | undefined,
  extra: Record<string, string | number | undefined>
): string {
  if (!node) return '';
  const declarations = cssDeclarations(Object.assign({
    'background-color': node.style.background,
    color: node.style.color,
    border: node.style.borderColor ? String(node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor : undefined,
    'border-radius': node.style.borderRadius != null ? String(node.style.borderRadius) + 'px' : undefined,
    opacity: node.style.opacity,
    'font-family': node.style.fontFamily ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif' : undefined,
    'font-style': node.style.fontStyle,
    'font-size': node.style.fontSize ? String(node.style.fontSize) + 'px' : undefined,
    'font-weight': node.style.fontWeight,
    'line-height': node.style.lineHeight ? String(node.style.lineHeight) + 'px' : undefined,
    'letter-spacing': node.style.letterSpacing ? String(node.style.letterSpacing) + 'px' : undefined,
    'text-align': node.style.textAlign,
    'text-transform': textTransformFromCase(node.style.textCase),
  }, extra));
  return declarations ? selector + ' { ' + declarations + ' }\n' : '';
}

export function renderSemanticHtml(schema: PromoExport, ast: NormalizedNode): { html: string; css: string } {
  const frameScale = getProductionScaleForFrame(ast.bounds);
  const displayWidth = scalePx(ast.bounds.width, frameScale) || ast.bounds.width;
  const displayHeight = scalePx(ast.bounds.height, frameScale) || ast.bounds.height;
  const headlineNode = pickBestNode(findNodesByRole(ast, 'headline', 0.35));
  const subtextNode = pickBestNode(findNodesByRole(ast, 'subtext', 0.3));
  const eyebrowNode = pickBestNode(findNodesByRole(ast, 'eyebrow', 0.3));
  const ctaNode = pickBestNode(findNodesByRole(ast, 'cta', 0.35));
  const disclaimerNode = pickBestNode(findNodesByRole(ast, 'disclaimer', 0.3));
  const productListNode = pickBestNode(findNodesByRole(ast, 'product-list', 0.35));
  const productCardNodes = findNodesByRole(ast, 'product-card', 0.35);
  const summaryNode = pickBestNode(findNodesByRole(ast, 'summary', 0.35));
  const closeNode = pickBestNode(findNodesByRole(ast, 'close-button', 0.35));
  const mainBounds = combineBounds([eyebrowNode, headlineNode, subtextNode, ctaNode]);
  const productsBounds = productListNode ? productListNode.bounds : combineBounds(productCardNodes);
  const rightBounds = combineBounds([productListNode, summaryNode]);
  const hasSideRail = !!mainBounds && !!rightBounds && rightBounds.x > mainBounds.x + (mainBounds.width * 0.65);
  const topHero = !!mainBounds && !!productsBounds && productsBounds.y > mainBounds.y + (mainBounds.height * 0.65);
  const gridColumns = productsBounds && productCardNodes.length > 1
    ? Math.max(1, Math.min(productCardNodes.length, Math.round(productsBounds.width / Math.max(productCardNodes[0].bounds.width, 1))))
    : Math.max(1, Math.min(schema.products.length || 1, 3));
  const productGap = productCardNodes.length > 1
    ? Math.max(8, Math.round((productsBounds ? productsBounds.width : ast.bounds.width) * 0.03))
    : 12;
  const closeStyle = closeNode
    ? inlineStyleAttr({
        left: toPercent(closeNode.bounds.x - ast.bounds.x, ast.bounds.width),
        top: toPercent(closeNode.bounds.y - ast.bounds.y, ast.bounds.height),
        width: toPercent(closeNode.bounds.width, ast.bounds.width),
        height: toPercent(closeNode.bounds.height, ast.bounds.height),
      })
    : '';
  const productWrapperClass =
    schema.pattern === 'carousel'
      ? 'usi_products usi_products_carousel'
      : schema.products.length <= 1
        ? 'usi_products usi_products_single'
        : 'usi_products usi_products_grid';
  const layoutClass = hasSideRail ? 'usi_layout_split' : topHero ? 'usi_layout_stacked' : 'usi_layout_flow';
  const closeHtml = schema.closeButton ? '<button id="usi_close" class="usi_close_button" type="button" aria-label="Close"' + closeStyle + '>×</button>' : '';
  const eyebrowHtml = schema.eyebrow ? '<p class="usi_eyebrow">' + escapeHtml(schema.eyebrow) + '</p>' : '';
  const headlineHtml = schema.headline ? '<h1 class="usi_headline">' + escapeHtml(schema.headline) + '</h1>' : '';
  const subtextHtml = schema.subtext ? '<p class="usi_subtext">' + escapeHtml(schema.subtext) + '</p>' : '';
  const primaryCtaHtml = schema.primaryCta
    ? '<button id="usi_primary_cta" class="usi_primary_cta" type="button">' + escapeHtml(schema.primaryCta.label) + '</button>'
    : '';
  const disclaimerHtml = schema.disclaimer ? '<p class="usi_disclaimer">' + escapeHtml(schema.disclaimer) + '</p>' : '';
  const summaryHtml = renderSummary(schema.summary);
  const productsHtml = schema.products.length
    ? '<section class="' + productWrapperClass + '" aria-label="Products">' + schema.products.map(renderProductCard).join('') + '</section>'
    : '';
  const hasProducts = !!schema.products.length && !!productCardNodes.length;
  const hasSummary = !!schema.summary && !!summaryNode;
  const hasEmailInput = hasInsertedComponent(ast, 'email_input');
  const hasPhoneInput = hasInsertedComponent(ast, 'phone_input');
  const hasSurvey = hasInsertedComponent(ast, 'survey_block');
  const hasCoupon = hasInsertedComponent(ast, 'copy_coupon');
  const hasOptin = hasInsertedComponent(ast, 'optin_component');
  const hasCountdown = hasInsertedComponent(ast, 'countdown_timer');
  const hasProgress = hasInsertedComponent(ast, 'progress_bar');
  const hasSecondaryCta = hasInsertedComponent(ast, 'no_thanks_button');
  const excludedIds = [
    headlineNode ? headlineNode.id : '',
    subtextNode ? subtextNode.id : '',
    eyebrowNode ? eyebrowNode.id : '',
    ctaNode ? ctaNode.id : '',
    disclaimerNode ? disclaimerNode.id : '',
    summaryNode ? summaryNode.id : '',
    closeNode ? closeNode.id : '',
  ].concat(productCardNodes.map(function (node) { return node.id; })).filter(Boolean);
  const extraMainHtml = renderExtraRegionNodes(ast, 'main', excludedIds);
  const extraAsideHtml = renderExtraRegionNodes(ast, 'aside', excludedIds);
  const extraUtilityHtml = renderExtraRegionNodes(ast, 'utility', excludedIds);
  const extraCss =
    renderExtraRegionCss(ast, 'main', excludedIds) +
    renderExtraRegionCss(ast, 'aside', excludedIds) +
    renderExtraRegionCss(ast, 'utility', excludedIds);
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Semantic promo export</title><link rel="stylesheet" href="css/styles.css" /></head><body><div id="usi_container"><div id="usi_display" role="alertdialog" aria-label="' +
    escapeHtml(schema.headline || 'Modal') +
    '" aria-modal="true" class="usi_display usi_shadow usi_layout_' +
    schema.layout +
    ' usi_pattern_' +
    schema.pattern +
    '">' +
    closeHtml +
    '<div id="usi_content"><article class="usi_modal ' + layoutClass + '"' + semanticBoxInlineStyle(ast) + '><section class="usi_modal_inner"><section class="usi_main">' +
    eyebrowHtml +
    headlineHtml +
    subtextHtml +
    primaryCtaHtml +
    extraMainHtml +
    extraUtilityHtml +
    '</section>' +
    '<aside class="usi_aside">' + productsHtml + summaryHtml + extraAsideHtml + '</aside>' +
    '</section>' +
    disclaimerHtml +
    '</article></div></div></div></body></html>';
  const componentCss =
    semanticNodeRule('.usi_modal', ast, {}) +
    semanticNodeRule('.usi_eyebrow', eyebrowNode, { margin: 0 }) +
    semanticNodeRule('.usi_headline', headlineNode, { margin: 0 }) +
    semanticNodeRule('.usi_subtext', subtextNode, { margin: 0 }) +
    semanticNodeRule('.usi_aside', productListNode || summaryNode || ast, {}) +
    semanticNodeRule('.usi_summary', summaryNode, {}) +
    semanticNodeRule('.usi_primary_cta', ctaNode || ast, Object.assign({
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      cursor: 'pointer',
      border: (ctaNode || ast).style.borderColor ? String((ctaNode || ast).style.borderWidth || 1) + 'px solid ' + (ctaNode || ast).style.borderColor : undefined,
    }, buttonStyleDeclarations(ctaNode || ast))) +
    semanticNodeRule('.usi_disclaimer', disclaimerNode, { margin: '1rem 0 0' }) +
    extraCss +
    regionRule('.usi_main', ast, mainBounds) +
    regionRule('.usi_aside', ast, rightBounds || productsBounds) +
    productCardNodes.map(function (node, index) {
      return semanticNodeRule('.usi_product_card:nth-child(' + (index + 1) + ')', node, {});
    }).join('');
  const semanticComponentCss = [
    (schema.primaryCta || hasProducts || hasSecondaryCta || hasCoupon || hasSurvey)
      ? '.usi_primary_cta, .usi_product_cta, .usi_secondary_cta, .usi_coupon_button, .usi_survey_option {\n\tappearance: none;\n\tpadding: 14px 20px;\n\tborder-radius: 0;\n}\n'
      : '',
    schema.primaryCta
      ? '.usi_primary_cta {\n\twidth: fit-content;\n\tmargin-top: 8px;\n}\n'
      : '',
    hasProducts
      ? '.usi_products {\n\tdisplay: grid;\n\tgap: ' + productGap + 'px;\n\talign-items: start;\n}\n.usi_products_grid {\n\tgrid-template-columns: repeat(' + gridColumns + ', minmax(0, 1fr));\n}\n.usi_products_single {\n\tgrid-template-columns: minmax(0, 1fr);\n}\n.usi_products_carousel {\n\tgrid-auto-flow: column;\n\tgrid-auto-columns: minmax(220px, 1fr);\n\toverflow-x: auto;\n\tpadding-bottom: 4px;\n}\n.usi_product_card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 10px;\n\tpadding: 14px;\n\tbackground: #f3f3f3;\n\tborder-radius: 16px;\n\tmin-width: 0;\n}\n.usi_product_image {\n\tdisplay: block;\n\twidth: 100%;\n\taspect-ratio: 1 / 1;\n\tobject-fit: cover;\n\tborder-radius: 12px;\n\tbackground: #dcdcdc;\n}\n.usi_product_image_placeholder {\n\tborder: 1px dashed #dddddd;\n}\n.usi_product_body {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 6px;\n}\n.usi_product_title {\n\tmargin: 0;\n\tfont-size: 1rem;\n}\n.usi_product_meta, .usi_product_price {\n\tmargin: 0;\n}\n.usi_product_price {\n\tfont-weight: 700;\n}\n'
      : '',
    hasSummary
      ? '.usi_summary {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 12px;\n\tpadding: 16px;\n\tborder: 1px solid #dddddd;\n\tborder-radius: 16px;\n\tbackground: rgba(255,255,255,0.8);\n}\n.usi_summary_title {\n\tmargin: 0;\n\tfont-size: 1rem;\n}\n.usi_summary_row {\n\tdisplay: grid;\n\tgrid-template-columns: 1fr auto;\n\tgap: 16px;\n\talign-items: start;\n}\n.usi_summary_row strong {\n\tfont-weight: 700;\n}\n'
      : '',
    hasEmailInput || hasPhoneInput
      ? '.usi_field {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:8px;\n}\n.usi_field_input {\n\twidth:100%;\n\tpadding:14px 16px;\n\tborder:1px solid #d0d0d0;\n\tbackground:#fff;\n\tcolor:#111;\n}\n'
      : '',
    hasSurvey
      ? '.usi_survey {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:12px;\n}\n.usi_survey_options {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:8px;\n}\n'
      : '',
    hasCoupon
      ? '.usi_coupon {\n\tdisplay:flex;\n\tgap:12px;\n\talign-items:center;\n\tflex-wrap:wrap;\n}\n.usi_coupon_code {\n\tpadding:12px 16px;\n\tborder:1px solid #222;\n\tbackground:#fff;\n\tfont-weight:700;\n}\n'
      : '',
    hasOptin
      ? '.usi_optin {\n\tdisplay:flex;\n\tgap:10px;\n\talign-items:center;\n}\n'
      : '',
    hasCountdown
      ? '.usi_countdown {\n\tdisplay:inline-flex;\n\tpadding:10px 14px;\n\tbackground:#1f1f1f;\n\tcolor:#fff;\n\tfont-weight:700;\n}\n'
      : '',
    hasProgress
      ? '.usi_progress {\n\twidth:100%;\n\theight:12px;\n\tbackground:#ddd;\n\tborder-radius:999px;\n\toverflow:hidden;\n}\n.usi_progress_fill {\n\twidth:55%;\n\theight:100%;\n\tbackground:#222;\n}\n'
      : '',
    schema.disclaimer
      ? '.usi_disclaimer {\n\ttext-align: center;\n}\n'
      : '',
    findNodesByRole(ast, 'divider', 0).length
      ? '.usi_divider {\n\tdisplay:block;\n\twidth:100%;\n\theight:4px;\n\tborder:0;\n\tbackground:#1f1f1f;\n\tborder-radius:999px;\n}\n'
      : '',
    '@media (max-width: 720px) {\n\t.usi_display {\n\t\twidth: min(100vw, ' + displayWidth + 'px);\n\t\tleft: 0;\n\t\tmargin-left: 0;\n\t}\n' +
      (hasSideRail ? '\t.usi_layout_split .usi_modal_inner {\n\t\tgrid-template-columns: 1fr;\n\t}\n' : '') +
      (hasProducts ? '\t.usi_products_grid {\n\t\tgrid-template-columns: repeat(auto-fit, minmax(140px, 1fr));\n\t}\n' : '') +
      '}\n',
  ].join('');
  const css =
    '* { box-sizing: border-box; } body { margin: 0; background: #ececec; color: #111111; font-family: Helvetica, Arial, sans-serif; } #usi_container { width: 100%; } .usi_display { left:50%; margin-left:-' + String(displayWidth / 2) + 'px; top:0px; width:' + displayWidth + 'px; height:' + displayHeight + 'px; position: relative; display: block; font-size: 16px; } .usi_display * { padding:0; margin:0; color:inherit; text-decoration:none; line-height:1.2; box-shadow:none; outline:none; text-align:left; font-family: Helvetica, Arial, sans-serif; float:none; } .usi_shadow { box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.33); } #usi_close { position:absolute; z-index:2000000300; cursor:pointer; border:none; background:none; display:flex; align-items:center; justify-content:center; font-size:1.5rem; line-height:1; } #usi_content { position:absolute; left:0px; top:0px; width:100%; height:100%; z-index:2000000200; } .usi_modal { width: 100%; min-height: 100%; padding: clamp(16px, 3vw, 32px); position: relative; } .usi_modal_sidebar { max-width: 360px; margin-left: auto; } .usi_modal_bottom_bar { min-height: auto; } .usi_modal_inner { display: flex; flex-direction: column; gap: clamp(16px, 2.2vw, 28px); min-height: 100%; } .usi_layout_split .usi_modal_inner { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(20px, 3vw, 40px); align-items: start; } .usi_layout_stacked .usi_modal_inner { display: flex; flex-direction: column; } .usi_main { display: flex; flex-direction: column; gap: 12px; justify-content: flex-start; align-self: start; } .usi_aside { display: flex; flex-direction: column; gap: clamp(16px, 2vw, 24px); align-self: start; } .usi_layout_stacked .usi_main { align-items: center; text-align: center; } .usi_layout_stacked .usi_primary_cta { align-self: flex-start; } .usi_sr_only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; } ' + semanticComponentCss + componentCss;
  return { html: html, css: css };
}

function rawNodeTag(node: NormalizedNode): string {
  if (node.detectedRole === 'headline') return 'h1';
  if (node.detectedRole === 'eyebrow') return 'p';
  if (node.detectedRole === 'subtext' || node.detectedRole === 'disclaimer') return 'p';
  if (node.detectedRole === 'cta') return 'button';
  if (node.type === 'TEXT') return 'p';
  if (node.children.length) return 'section';
  return 'div';
}

function rawNodeClasses(node: NormalizedNode): string {
  const classes = ['usi_raw_node', 'usi_raw_node_' + String(node.type).toLowerCase()];
  if (node.detectedRole && node.detectedRole !== 'other') classes.push('usi_raw_node_' + node.detectedRole.replace(/-/g, '_'));
  if (node.layout.mode !== 'NONE') classes.push('usi_raw_node_autolayout');
  return classes.join(' ');
}

function rawNodeStyle(node: NormalizedNode): string {
  return cssDeclarations({
    display: node.layout.mode === 'NONE' ? (node.children.length ? 'block' : undefined) : 'flex',
    'flex-direction': node.layout.mode === 'HORIZONTAL' ? 'row' : node.layout.mode === 'VERTICAL' ? 'column' : undefined,
    gap: node.layout.gap ? node.layout.gap + 'px' : undefined,
    padding:
      node.layout.padding.top || node.layout.padding.right || node.layout.padding.bottom || node.layout.padding.left
        ? node.layout.padding.top + 'px ' + node.layout.padding.right + 'px ' + node.layout.padding.bottom + 'px ' + node.layout.padding.left + 'px'
        : undefined,
    'background-color': node.style.background,
    color: node.style.color,
    'border-color': node.style.borderColor,
    'border-style': node.style.borderColor ? 'solid' : undefined,
    'border-width': node.style.borderWidth ? node.style.borderWidth + 'px' : undefined,
    'border-radius': node.style.borderRadius ? node.style.borderRadius + 'px' : undefined,
    opacity: node.style.opacity,
    'font-size': node.style.fontSize ? node.style.fontSize + 'px' : undefined,
    'font-weight': node.style.fontWeight,
    'line-height': node.style.lineHeight ? node.style.lineHeight + 'px' : undefined,
    'text-align': node.style.textAlign,
    'min-height': node.bounds.height ? Math.min(node.bounds.height, 240) + 'px' : undefined,
  });
}

function renderRawTree(node: NormalizedNode): string {
  if (node.ignored || !node.visible) return '';
  const tag = rawNodeTag(node);
  const className = rawNodeClasses(node);
  const style = rawNodeStyle(node);

  if (node.type === 'TEXT' || (!node.children.length && node.text)) {
    return '<' + tag + ' class="' + className + '"' + (style ? ' style="' + escapeHtml(style) + '"' : '') + '>' + escapeHtml(node.text || collectText(node)) + '</' + tag + '>';
  }
  if ((node.detectedRole === 'image' || node.roleOverride === 'image') && !node.children.length) {
    return '<div class="' + className + '"' + (style ? ' style="' + escapeHtml(style) + '"' : '') + ' aria-hidden="true"></div>';
  }
  return '<' + tag + ' class="' + className + '"' + (style ? ' style="' + escapeHtml(style) + '"' : '') + '>' + node.children.map(renderRawTree).join('') + '</' + tag + '>';
}

export function renderRawFallback(ast: NormalizedNode): { html: string; css: string } {
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Raw structured fallback</title><link rel="stylesheet" href="css/fallback.css" /></head><body><main class="usi_raw_root">' + renderRawTree(ast) + '</main></body></html>';
  const css = '* { box-sizing: border-box; }body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f4f4f4; color: #222; }.usi_raw_root { max-width: 1080px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }.usi_raw_node { width: 100%; }.usi_raw_node_cta { width: fit-content; border: 0; background: #222; color: #fff; border-radius: 999px; padding: 12px 18px; cursor: pointer; }.usi_raw_node_headline { margin: 0; }.usi_raw_node_disclaimer { font-size: 12px; color: #666; }.usi_raw_node_image { background: #ddd; min-height: 140px; border-radius: 12px; }';
  return { html: html, css: css };
}

export function renderPreviewIndex(
  title: string,
  images: Array<{ name: string; href: string }>
): string {
  const previews = [
    { name: 'Semantic', href: 'semantic.html' },
    { name: 'Flattened Live Text', href: 'flattened_live_text.html' },
    { name: 'Flattened Text Baked', href: 'flattened_text_baked.html' },
    { name: 'Raw Fallback', href: 'fallback-raw.html' },
    { name: 'Dev Mode', href: 'devmode.html' },
  ];
  const galleryHtml = images.length
    ? '<section class="usi_preview_gallery"><h2>Images</h2><div class="usi_preview_gallery_grid">' +
      images
        .map(function (image) {
          return '<figure class="usi_preview_gallery_item"><a href="' + image.href + '" target="_blank" rel="noreferrer"><img src="' + image.href + '" alt="' + escapeHtml(image.name) + '" /></a><figcaption>' + escapeHtml(image.name) + '</figcaption></figure>';
        })
        .join('') +
      '</div></section>'
    : '';

  return formatHtml(
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' +
      escapeHtml(title) +
      ' Preview</title><style>' +
      ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_surface_alt:#f8f8f8;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_link:#0b57d0;--usi_media:#f8f8f8;--usi_nav:#eef3fd;--usi_nav_active:#dce8ff;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_surface_alt:#121417;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_link:#8ab4f8;--usi_media:#0f1113;--usi_nav:#1d2633;--usi_nav_active:#27364a;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}.usi_preview_shell{display:flex;flex-direction:column;gap:24px;max-width:1400px;margin:0 auto;}.usi_preview_header,.usi_preview_links,.usi_preview_panel,.usi_preview_gallery{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px;}.usi_preview_header h1,.usi_preview_panel h2,.usi_preview_gallery h2{margin:0;}.usi_preview_header p{margin:0;color:var(--usi_muted);}.usi_preview_link_list{display:flex;gap:10px;flex-wrap:wrap;}.usi_preview_link_list a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border:1px solid var(--usi_border);border-radius:999px;background:var(--usi_nav);color:var(--usi_link);text-decoration:none;font-weight:700;transition:background-color .15s ease,border-color .15s ease;}.usi_preview_link_list a:hover{background:var(--usi_nav_active);border-color:var(--usi_link);}.usi_preview_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;}.usi_preview_frame{height:720px;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_surface_alt);overflow:auto;}.usi_preview_panel iframe{width:200%;height:1440px;border:0;background:#fff;transform:scale(.5);transform-origin:0 0;display:block;}.usi_preview_gallery_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;}.usi_preview_gallery_item{margin:0;display:flex;flex-direction:column;gap:8px;}.usi_preview_gallery_item a{display:block;border:1px solid var(--usi_border);border-radius:12px;overflow:hidden;background:var(--usi_surface);}.usi_preview_gallery_item img{display:block;width:100%;height:220px;object-fit:contain;background:var(--usi_media);}.usi_preview_gallery_item figcaption{font-size:13px;color:var(--usi_muted);word-break:break-word;}</style></head><body><main class="usi_preview_shell"><section class="usi_preview_header"><h1>' +
      escapeHtml(title) +
      '</h1><p>Open the exported variants or inspect the generated code in dev mode.</p></section><section class="usi_preview_links"><div class="usi_preview_link_list">' +
      previews
        .map(function (preview) {
          return '<a href="' + preview.href + '">' + escapeHtml(preview.name) + '</a>';
        })
        .join('') +
      '</div></section>' +
      galleryHtml +
      '<section class="usi_preview_grid">' +
      previews
        .filter(function (preview) { return preview.href !== 'devmode.html'; })
        .map(function (preview) {
          return '<article class="usi_preview_panel"><h2>' + escapeHtml(preview.name) + '</h2><div class="usi_preview_frame"><iframe loading="lazy" src="' + preview.href + '" title="' + escapeHtml(preview.name) + '"></iframe></div></article>';
        })
        .join('') +
      '</section></main></body></html>'
  );
}

export function renderMultiExportIndex(
  entries: Array<{ name: string; href: string; images: Array<{ name: string; href: string }> }>,
  clientComponentsHref?: string
): string {
  const extraNav = clientComponentsHref
    ? '<p><a class="usi_export_open" href="' + clientComponentsHref + '">Open client components</a></p>'
    : '';
  return formatHtml(
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Export Index</title><style>' +
      ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_surface_alt:#f8f8f8;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_link:#0b57d0;--usi_media:#f8f8f8;--usi_nav:#eef3fd;--usi_nav_active:#dce8ff;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_surface_alt:#121417;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_link:#8ab4f8;--usi_media:#0f1113;--usi_nav:#1d2633;--usi_nav_active:#27364a;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}.usi_export_root{max-width:1440px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}.usi_export_header,.usi_export_card{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;}.usi_export_header h1,.usi_export_header p,.usi_export_card h2{margin:0 0 12px 0;}.usi_export_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;}.usi_export_card a{color:var(--usi_link);text-decoration:none;font-weight:700;}.usi_export_open{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border:1px solid var(--usi_border);border-radius:999px;background:var(--usi_nav);transition:background-color .15s ease,border-color .15s ease;}.usi_export_open:hover{background:var(--usi_nav_active);border-color:var(--usi_link);} .usi_export_frame{height:720px;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_surface_alt);overflow:auto;}.usi_export_card iframe{width:200%;height:1440px;border:0;background:#fff;transform:scale(.5);transform-origin:0 0;display:block;}.usi_export_gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;}.usi_export_gallery figure{margin:0;display:flex;flex-direction:column;gap:6px;}.usi_export_gallery a{display:block;border:1px solid var(--usi_border);border-radius:10px;overflow:hidden;background:var(--usi_surface);}.usi_export_gallery img{display:block;width:100%;height:120px;object-fit:contain;background:var(--usi_media);}.usi_export_gallery figcaption{font-size:12px;color:var(--usi_muted);word-break:break-word;}</style></head><body><main class="usi_export_root"><section class="usi_export_header"><h1>Export Index</h1><p>Preview each exported frame below.</p></section><section class="usi_export_grid">' +
      ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_surface_alt:#f8f8f8;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_link:#0b57d0;--usi_media:#f8f8f8;--usi_nav:#eef3fd;--usi_nav_active:#dce8ff;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_surface_alt:#121417;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_link:#8ab4f8;--usi_media:#0f1113;--usi_nav:#1d2633;--usi_nav_active:#27364a;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}.usi_export_root{max-width:1440px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}.usi_export_header,.usi_export_card{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;}.usi_export_header h1,.usi_export_header p,.usi_export_card h2{margin:0 0 12px 0;}.usi_export_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;}.usi_export_actions{display:flex;gap:12px;flex-wrap:wrap;}.usi_export_card a{color:var(--usi_link);text-decoration:none;font-weight:700;}.usi_export_open{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border:1px solid var(--usi_border);border-radius:999px;background:var(--usi_nav);transition:background-color .15s ease,border-color .15s ease;}.usi_export_open:hover{background:var(--usi_nav_active);border-color:var(--usi_link);} .usi_export_frame{height:720px;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_surface_alt);overflow:auto;}.usi_export_card iframe{width:200%;height:1440px;border:0;background:#fff;transform:scale(.5);transform-origin:0 0;display:block;}.usi_export_gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;}.usi_export_gallery figure{margin:0;display:flex;flex-direction:column;gap:6px;}.usi_export_gallery a{display:block;border:1px solid var(--usi_border);border-radius:10px;overflow:hidden;background:var(--usi_surface);}.usi_export_gallery img{display:block;width:100%;height:120px;object-fit:contain;background:var(--usi_media);}.usi_export_gallery figcaption{font-size:12px;color:var(--usi_muted);word-break:break-word;}</style></head><body><main class="usi_export_root"><section class="usi_export_header"><h1>Export Index</h1><p>Preview each exported frame below.</p><div class="usi_export_actions">' +
      extraNav +
      '</div></section><section class="usi_export_grid">' +
      entries
        .map(function (entry) {
          const galleryHtml = entry.images.length
            ? '<div class="usi_export_gallery">' +
              entry.images
                .map(function (image) {
                  return '<figure><a href="' + image.href + '" target="_blank" rel="noreferrer"><img src="' + image.href + '" alt="' + escapeHtml(image.name) + '" /></a><figcaption>' + escapeHtml(image.name) + '</figcaption></figure>';
                })
                .join('') +
              '</div>'
            : '';
          return '<article class="usi_export_card"><h2>' + escapeHtml(entry.name) + '</h2><p><a class="usi_export_open" href="' + entry.href + '">Open preview</a></p>' + galleryHtml + '<div class="usi_export_frame"><iframe loading="lazy" src="' + entry.href + '" title="' + escapeHtml(entry.name) + '"></iframe></div></article>';
        })
        .join('') +
      '</section></main></body></html>'
  );
}

function formatLayoutSummary(entry: ClientComponentCatalogEntry): string {
  const instance = entry.defaultInstance;
  return [
    'Bounds: ' +
      Math.round(instance.bounds.width) +
      ' x ' +
      Math.round(instance.bounds.height) +
      ' at (' +
      Math.round(instance.bounds.x) +
      ', ' +
      Math.round(instance.bounds.y) +
      ')',
    'Layout: ' +
      instance.layout.mode +
      ', gap ' +
      Math.round(instance.layout.gap) +
      ', padding ' +
      [
        instance.layout.padding.top,
        instance.layout.padding.right,
        instance.layout.padding.bottom,
        instance.layout.padding.left,
      ]
        .map(function (value) { return Math.round(value); })
        .join('/'),
  ].join(' | ');
}

function renderStyleToken(label: string, value?: string | number): string {
  if (value == null || value === '') return '';
  return '<li><strong>' + escapeHtml(label) + ':</strong> ' + escapeHtml(String(value)) + '</li>';
}

export function renderClientComponentsPage(
  components: ClientComponentCatalogEntry[],
  title: string
): string {
  const grouped = components.reduce(function (
    map: Record<string, ClientComponentCatalogEntry[]>,
    entry
  ) {
    if (!map[entry.category]) map[entry.category] = [];
    map[entry.category].push(entry);
    return map;
  }, {});
  const categories = ['shell', 'layout', 'content', 'action', 'product', 'summary', 'form', 'utility'];
  const body = categories
    .filter(function (category) {
      return !!grouped[category] && grouped[category].length > 0;
    })
    .map(function (category) {
      return (
        '<section class="usi_client_components_section">' +
        '<h2>' + escapeHtml(category.charAt(0).toUpperCase() + category.slice(1)) + '</h2>' +
        '<div class="usi_client_components_grid">' +
        grouped[category]
          .map(function (entry) {
            const style = entry.defaultInstance.style;
            const styleList = [
              renderStyleToken('Background', style.background),
              renderStyleToken('Color', style.color),
              renderStyleToken('Border color', style.borderColor),
              renderStyleToken('Border width', style.borderWidth),
              renderStyleToken('Radius', style.borderRadius),
              renderStyleToken('Font family', style.fontFamily),
              renderStyleToken('Font style', style.fontStyle),
              renderStyleToken('Font size', style.fontSize),
              renderStyleToken('Font weight', style.fontWeight),
              renderStyleToken('Line height', style.lineHeight),
              renderStyleToken('Letter spacing', style.letterSpacing),
              renderStyleToken('Text align', style.textAlign),
            ]
              .filter(Boolean)
              .join('');
            const sampleText = entry.defaultInstance.text
              ? '<p class="usi_client_component_sample"><strong>Default text:</strong> ' + escapeHtml(entry.defaultInstance.text) + '</p>'
              : '';
            return (
              '<article class="usi_client_component_card">' +
              '<header class="usi_client_component_header">' +
              '<div><h3>' + escapeHtml(entry.label) + '</h3><p class="usi_client_component_meta">' + escapeHtml(entry.id) + ' · ' + escapeHtml(entry.role) + '</p></div>' +
              '<span class="usi_client_component_badge">' + entry.templateCount + ' templates</span>' +
              '</header>' +
              '<p class="usi_client_component_description">' + escapeHtml(entry.description) + '</p>' +
              sampleText +
              '<p class="usi_client_component_meta"><strong>HTML:</strong> ' + escapeHtml(entry.render.htmlTag) + ' · .' + escapeHtml(entry.render.className) + '</p>' +
              '<p class="usi_client_component_meta"><strong>Flattened:</strong> live_text=' + escapeHtml(String(entry.render.flattened.liveText)) + ', text_baked=' + escapeHtml(String(entry.render.flattened.textBaked)) + '</p>' +
              '<p class="usi_client_component_meta"><strong>Default source:</strong> ' + escapeHtml(entry.defaultInstance.sourceFrameName) + '</p>' +
              '<p class="usi_client_component_meta">' + escapeHtml(formatLayoutSummary(entry)) + '</p>' +
              '<ul class="usi_client_component_styles">' + styleList + '</ul>' +
              '<details><summary>Templates using this component</summary><ul class="usi_client_component_templates">' +
              entry.templates
                .map(function (templateName) {
                  return '<li>' + escapeHtml(templateName) + '</li>';
                })
                .join('') +
              '</ul></details>' +
              '</article>'
            );
          })
          .join('') +
        '</div></section>'
      );
    })
    .join('');

  return formatHtml(
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' +
      escapeHtml(title) +
      '</title><style>' +
      ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_chip:#eef3fd;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_chip:#1d2633;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}.usi_client_components_root{max-width:1440px;margin:0 auto;display:flex;flex-direction:column;gap:24px;}.usi_client_components_header,.usi_client_components_section{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;}.usi_client_components_header h1,.usi_client_components_header p,.usi_client_components_section h2,.usi_client_component_header h3{margin:0;}.usi_client_components_header p{margin-top:8px;color:var(--usi_muted);}.usi_client_components_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-top:16px;}.usi_client_component_card{border:1px solid var(--usi_border);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;}.usi_client_component_header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}.usi_client_component_meta,.usi_client_component_description,.usi_client_component_sample{margin:0;color:var(--usi_muted);line-height:1.4;}.usi_client_component_styles,.usi_client_component_templates{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;}.usi_client_component_badge{display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;background:var(--usi_chip);font-size:12px;font-weight:700;}.usi_client_component_styles li strong{color:var(--usi_text);}details summary{cursor:pointer;font-weight:700;}</style></head><body><main class="usi_client_components_root"><section class="usi_client_components_header"><h1>' +
      escapeHtml(title) +
      '</h1><p>Reusable component defaults collected from the exported client templates. These are the actual inserted component instances, not the hardcoded asset builder defaults.</p></section>' +
      body +
      '</main></body></html>'
  );
}

export function renderDevModePage(
  title: string,
  bakedImageHref: string,
  cssSource: string,
  jsSource: string
): string {
  const cssPlaceholder = '__USI_DEV_CSS__';
  const jsPlaceholder = '__USI_DEV_JS__';
  const shell = formatHtml(
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' +
      escapeHtml(title) +
      ' Dev Mode</title><style>' +
      ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_surface_alt:#f8f8f8;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_media:#f8f8f8;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_surface_alt:#121417;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_media:#0f1113;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}.usi_dev_root{max-width:1600px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}.usi_dev_header,.usi_dev_card{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;}.usi_dev_header h1,.usi_dev_card h2{margin:0 0 12px 0;}.usi_dev_header p{margin:0;color:var(--usi_muted);}.usi_dev_grid{display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:20px;align-items:start;}.usi_dev_preview{display:flex;flex-direction:column;gap:12px;}.usi_dev_preview img{display:block;width:100%;height:auto;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_media);}.usi_dev_code{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}.usi_dev_code pre{margin:0;padding:16px;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_surface_alt);overflow:auto;white-space:pre;tab-size:2;}@media (max-width:1200px){.usi_dev_code{grid-template-columns:1fr;}}@media (max-width:960px){.usi_dev_grid{grid-template-columns:1fr;}}</style></head><body><main class="usi_dev_root"><section class="usi_dev_header"><h1>' +
      escapeHtml(title) +
      '</h1><p>Generated runtime assets for development review. Background preview uses the flattened text baked image.</p></section><section class="usi_dev_grid"><article class="usi_dev_card usi_dev_preview"><h2>Background</h2><img src="' +
      escapeHtml(bakedImageHref) +
      '" alt="' +
      escapeHtml(title + ' baked background') +
      '" /></article><section class="usi_dev_code"><article class="usi_dev_card"><h2>Flattened Campaign CSS</h2><pre><code>' +
      cssPlaceholder +
      '</code></pre></article><article class="usi_dev_card"><h2>usi_js.js</h2><pre><code>' +
      jsPlaceholder +
      '</code></pre></article></section></section></main></body></html>'
  );
  return shell
    .replace(cssPlaceholder, escapeHtml(cssSource))
    .replace(jsPlaceholder, escapeHtml(jsSource));
}

export function renderMockupReviewIndex(entries: Array<{ name: string; href: string }>): string {
  return formatHtml(
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Mockup Review</title><style>' +
      ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_media:#f8f8f8;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_media:#0f1113;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}.usi_mockup_root{max-width:1480px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}.usi_mockup_header,.usi_mockup_section{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;}.usi_mockup_header h1,.usi_mockup_header p,.usi_mockup_section h2{margin:0 0 12px 0;}.usi_mockup_gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;}.usi_mockup_card{margin:0;display:flex;flex-direction:column;gap:10px;}.usi_mockup_card a{display:block;border:1px solid var(--usi_border);border-radius:12px;overflow:hidden;background:var(--usi_surface);}.usi_mockup_card img{display:block;width:100%;height:360px;object-fit:contain;background:var(--usi_media);}.usi_mockup_card figcaption{font-size:14px;color:var(--usi_muted);word-break:break-word;}.usi_mockup_card strong{display:block;color:var(--usi_text);margin-bottom:4px;}</style></head><body><main class="usi_mockup_root"><section class="usi_mockup_header"><h1>Mockup Review</h1><p>Review all exported mockup images for client feedback.</p></section><section class="usi_mockup_section"><h2>Frames</h2><div class="usi_mockup_gallery">' +
      entries
        .map(function (entry) {
          return '<figure class="usi_mockup_card"><a href="' + entry.href + '" target="_blank" rel="noreferrer"><img src="' + entry.href + '" alt="' + escapeHtml(entry.name) + '" /></a><figcaption><strong>' + escapeHtml(entry.name) + '</strong>' + escapeHtml(entry.href) + '</figcaption></figure>';
        })
        .join('') +
      '</div></section></main></body></html>'
  );
}

function buildSyntheticBounds(nodes: NormalizedNode[]): NodeBounds | undefined {
  if (!nodes.length) return undefined;
  const left = Math.min.apply(null, nodes.map(function (node) { return node.bounds.x; }));
  const top = Math.min.apply(null, nodes.map(function (node) { return node.bounds.y; }));
  const right = Math.max.apply(null, nodes.map(function (node) { return node.bounds.x + node.bounds.width; }));
  const bottom = Math.max.apply(null, nodes.map(function (node) { return node.bounds.y + node.bounds.height; }));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function renderFlattenedHtml(
  root: NormalizedNode,
  analysis: AnalysisResult,
  imageFileName: string,
  hideVisibleText: boolean
): FlattenedVariant {
  const frameScale = getProductionScaleForFrame(root.bounds);
  const scaledRootWidth = scalePx(root.bounds.width, frameScale) || root.bounds.width;
  const scaledRootHeight = scalePx(root.bounds.height, frameScale) || root.bounds.height;
  const headlineNode = findNormalizedNodeById(root, analysis.headlineNodeId);
  const subtextNode = findNormalizedNodeById(root, analysis.subtextNodeId);
  const eyebrowNode = findNormalizedNodeById(root, analysis.eyebrowNodeId);
  const ctaNode = findNormalizedNodeById(root, analysis.primaryCtaNodeId);
  const productContainerNode = findNormalizedNodeById(root, analysis.productContainerNodeId);
  const productCardNodes = analysis.productCardNodeIds.map(function (id) {
    return findNormalizedNodeById(root, id);
  }).filter(Boolean) as NormalizedNode[];
  const summaryNode = findNormalizedNodeById(root, analysis.summaryNodeId);
  const closeCandidates = findNodesByRole(root, 'close-button', 0.35);
  const closeNode = closeCandidates
    .slice()
    .sort(function (a, b) {
      if (Math.abs(a.bounds.x - b.bounds.x) > 2) return b.bounds.x - a.bounds.x;
      if (Math.abs(a.bounds.y - b.bounds.y) > 2) return a.bounds.y - b.bounds.y;
      return (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height);
    })[0];
  const closeVisualNode = closeNode
    ? flattenTree(closeNode)
      .filter(function (node) {
        return !!collectText(node).trim() || node.type === 'VECTOR' || node.type === 'ELLIPSE';
      })
      .sort(function (a, b) {
        if (Math.abs(a.bounds.x - b.bounds.x) > 2) return b.bounds.x - a.bounds.x;
        if (Math.abs(a.bounds.y - b.bounds.y) > 2) return a.bounds.y - b.bounds.y;
        return (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height);
      })[0] || closeNode
    : undefined;
  const firstProductCard = productCardNodes[0];
  const productImageNode = findDescendantRoleNode(firstProductCard, 'image') || findDescendantRoleNode(firstProductCard, 'product-image');
  const productTitleNode = findDescendantRoleNode(firstProductCard, 'product-title');
  const productPriceNode = findDescendantRoleNode(firstProductCard, 'product-price');
  const productButtonNode = findDescendantRoleNode(firstProductCard, 'product-cta') || findDescendantRoleNode(firstProductCard, 'cta');
  const summarySubtotalNode = findDescendantRoleNode(summaryNode, 'summary-subtotal');
  const summaryDiscountNode = findDescendantRoleNode(summaryNode, 'summary-discount');
  const summaryTotalNode = findDescendantRoleNode(summaryNode, 'summary-total');
  const productBounds = productContainerNode ? productContainerNode.bounds : buildSyntheticBounds(productCardNodes);
  const mainBounds = combineBounds([eyebrowNode, headlineNode, subtextNode, ctaNode]);
  const headlineText = analysis.schema.headline || (headlineNode ? collectText(headlineNode) : '');
  const eyebrowText = (() => {
    const value = analysis.schema.eyebrow || (eyebrowNode ? collectText(eyebrowNode) : '');
    if (!value) return '';
    if (/\$|subtotal|discount|total/i.test(value)) return '';
    return value;
  })();
  const subtextText = analysis.schema.subtext || (subtextNode ? collectText(subtextNode) : '');
  const ctaLabel = analysis.schema.primaryCta && analysis.schema.primaryCta.label ? analysis.schema.primaryCta.label : ctaNode ? collectText(ctaNode) : 'Redeem Now';
  const eyebrowDefinition = eyebrowNode ? componentDefinitionForNode(eyebrowNode) : COMPONENT_BY_ROLE.eyebrow;
  const headlineDefinition = headlineNode ? componentDefinitionForNode(headlineNode) : COMPONENT_BY_ROLE.headline;
  const subtextDefinition = subtextNode ? componentDefinitionForNode(subtextNode) : COMPONENT_BY_ROLE.subtext;
  const showEyebrowInVariant = hideVisibleText ? false : shouldRenderAsFlattenedHtml(eyebrowDefinition, hideVisibleText);
  const showHeadlineInVariant = hideVisibleText ? false : shouldRenderAsFlattenedHtml(headlineDefinition, hideVisibleText);
  const showSubtextInVariant = hideVisibleText ? false : shouldRenderAsFlattenedHtml(subtextDefinition, hideVisibleText);
  const eyebrowClass = showEyebrowInVariant ? 'usi_eyebrow' : 'usi_eyebrow usi_sr_only';
  const headlineClass = showHeadlineInVariant ? 'usi_headline' : 'usi_headline usi_sr_only';
  const subtextClass = showSubtextInVariant ? 'usi_subtext' : 'usi_subtext usi_sr_only';
  const ctaDefinition = ctaNode ? componentDefinitionForNode(ctaNode) : COMPONENT_BY_ROLE.cta;
  const showCtaInVariant = !!(ctaNode || analysis.schema.primaryCta) && shouldRenderInFlattened(ctaDefinition, hideVisibleText);
  const ctaInnerHtml = showCtaInVariant ? escapeHtml(ctaLabel) : '';
  const summaryTitle = resolveSummaryTitle(summaryNode);
  const hasProducts = !!analysis.schema.products.length && !!productCardNodes.length && !!productBounds;
  const hasSummary = !!analysis.schema.summary && !!summaryNode;
  const hasEmailInput = hasInsertedComponent(root, 'email_input');
  const hasPhoneInput = hasInsertedComponent(root, 'phone_input');
  const hasSurvey = hasInsertedComponent(root, 'survey_block');
  const hasCoupon = hasInsertedComponent(root, 'copy_coupon');
  const hasOptin = hasInsertedComponent(root, 'optin_component') && !hideVisibleText;
  const hasCountdown = hasInsertedComponent(root, 'countdown_timer');
  const hasProgress = hasInsertedComponent(root, 'progress_bar');
  const hasMediaPanel = hasInsertedComponent(root, 'media_panel');
  const hasSecondaryCta = hasInsertedComponent(root, 'no_thanks_button');
  const productGap = productCardNodes.length > 1 && productBounds
    ? productCardNodes.slice(1).reduce(function (sum, card, index) {
        const previous = productCardNodes[index];
        return sum + Math.max(0, card.bounds.x - (previous.bounds.x + previous.bounds.width));
      }, 0) / (productCardNodes.length - 1)
    : 0;
  const gridColumns = Math.max(1, Math.min(productCardNodes.length || analysis.schema.products.length || 1, 3));

  const previewProductHtml = analysis.schema.products.length
    ? analysis.schema.products.map(function (product, index) {
        const fallbackTitle = escapeHtml(product.title || 'Product Name');
        const fallbackPrice = escapeHtml(product.price || '$XX.XX');
        const fallbackButton = escapeHtml(product.cta || 'View item');
        return (
          '<article class="usi_product_card usi_product usi_product' + (index + 1) + '">' +
          '<div class="usi_product_image">' +
          '<img src="' + PRODUCT_PLACEHOLDER_IMAGE + '" alt="' + fallbackTitle + '" />' +
          '</div>' +
          '<div class="usi_product_body">' +
          '<h3 class="usi_product_title">' + fallbackTitle + '</h3>' +
          '<p class="usi_product_price">' + fallbackPrice + '</p>' +
          '<button class="usi_product_cta" type="button">' + fallbackButton + '</button>' +
          '</div>' +
          '</article>'
        );
      }).join('')
    : '';

  const runtimeProductHtml = analysis.schema.products.length
    ? analysis.schema.products.map(function (product, index) {
        const fallbackTitle = escapeHtml(product.title || 'Product Name');
        const fallbackPrice = escapeHtml(product.price || '$XX.XX');
        const fallbackButton = escapeHtml(product.cta || 'View item');
        return (
          '<article class="usi_product_card usi_product usi_product' + (index + 1) + '">' +
          '<div class="usi_product_image">' +
          '<img src="${usi_cookies.get(\'usi_prod_image_' + (index + 1) + '\') || \'' + PRODUCT_PLACEHOLDER_IMAGE + '\'}" alt="${usi_js.escape_quotes(usi_cookies.get(\'usi_prod_name_' + (index + 1) + '\') || \'' + fallbackTitle.replace(/'/g, '&#39;') + '\')}" />' +
          '</div>' +
          '<div class="usi_product_body">' +
          '<h3 class="usi_product_title">${usi_js.escape_quotes(usi_cookies.get(\'usi_prod_name_' + (index + 1) + '\') || \'' + fallbackTitle.replace(/'/g, '&#39;') + '\')}</h3>' +
          '<p class="usi_product_price">' + fallbackPrice + '</p>' +
          '<button class="usi_product_cta" type="button">' + fallbackButton + '</button>' +
          '</div>' +
          '</article>'
        );
      }).join('')
    : '';

  const previewSummaryHtml = hasSummary
    ? (
    '<section class="usi_summary" aria-label="Cart summary">' +
    (summaryTitle ? '<h2 class="usi_summary_title">' + escapeHtml(summaryTitle) + '</h2>' : '') +
    '<div class="usi_summary_row usi_price"><span class="usi_label">Subtotal:</span><strong class="usi_value">$XX.XX</strong></div>' +
    '<div class="usi_summary_row usi_discount"><span class="usi_label">Discount:</span><strong class="usi_value">- $XX.XX</strong></div>' +
    '<div class="usi_summary_row usi_new_price"><span class="usi_label">Total:</span><strong class="usi_value">$XX.XX</strong></div>' +
    '</section>')
    : '';

  const runtimeSummaryHtml = hasSummary
    ? (
    '<section class="usi_summary" aria-label="Cart summary">' +
    (summaryTitle ? '<h2 class="usi_summary_title">' + escapeHtml(summaryTitle) + '</h2>' : '') +
    '<div class="usi_summary_row usi_price"><span class="usi_label">Subtotal:</span><strong class="usi_value">$${usi_js.product.subtotal}</strong></div>' +
    '<div class="usi_summary_row usi_discount"><span class="usi_label">Discount:</span><strong class="usi_value">- $${usi_js.product.discount}</strong></div>' +
    '<div class="usi_summary_row usi_new_price"><span class="usi_label">Total:</span><strong class="usi_value">$${usi_js.product.new_price}</strong></div>' +
    '</section>')
    : '';

  const flattenedExcludedIds = [
    analysis.eyebrowNodeId,
    analysis.headlineNodeId,
    analysis.subtextNodeId,
    analysis.primaryCtaNodeId,
    analysis.summaryNodeId,
  ]
    .concat(analysis.productCardNodeIds)
    .filter(Boolean) as string[];
  const flattenedExtraMainHtml = renderExtraRegionNodes(root, 'main', flattenedExcludedIds, hideVisibleText);
  const flattenedExtraAsideHtml = renderExtraRegionNodes(root, 'aside', flattenedExcludedIds, hideVisibleText);
  const flattenedExtraUtilityHtml = renderExtraRegionNodes(root, 'utility', flattenedExcludedIds, hideVisibleText);

  const previewContentHtml =
    (closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : '') +
    '<article class="usi_flattened_semantic">' +
    '<section class="usi_main">' +
    (eyebrowText ? '<p class="' + eyebrowClass + '">' + escapeHtml(eyebrowText) + '</p>' : '') +
    (headlineText ? '<h1 class="' + headlineClass + '">' + escapeHtml(headlineText) + '</h1>' : '') +
    (subtextText ? '<p class="' + subtextClass + '">' + escapeHtml(subtextText) + '</p>' : '') +
    (showCtaInVariant ? '<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="' + escapeHtml(ctaLabel) + '">' + ctaInnerHtml + '</button>' : '') +
    flattenedExtraMainHtml +
    flattenedExtraUtilityHtml +
    '</section>' +
    ((hasProducts || flattenedExtraAsideHtml) ? '<section class="usi_aside">' + (hasProducts ? '<section class="usi_products usi_products_grid">' + previewProductHtml + '</section>' : '') + flattenedExtraAsideHtml + '</section>' : '') +
    previewSummaryHtml +
    '</article>';

  const runtimeContentHtml =
    (closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : '') +
    '<article class="usi_flattened_semantic">' +
    '<section class="usi_main">' +
    (eyebrowText ? '<p class="' + eyebrowClass + '">' + escapeHtml(eyebrowText) + '</p>' : '') +
    (headlineText ? '<h1 class="' + headlineClass + '">' + escapeHtml(headlineText) + '</h1>' : '') +
    (subtextText ? '<p class="' + subtextClass + '">' + escapeHtml(subtextText) + '</p>' : '') +
    (showCtaInVariant ? '<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="' + escapeHtml(ctaLabel) + '">' + ctaInnerHtml + '</button>' : '') +
    flattenedExtraMainHtml +
    flattenedExtraUtilityHtml +
    '</section>' +
    ((hasProducts || flattenedExtraAsideHtml) ? '<section class="usi_aside">' + (hasProducts ? '<section class="usi_products usi_products_grid">' + runtimeProductHtml + '</section>' : '') + flattenedExtraAsideHtml + '</section>' : '') +
    runtimeSummaryHtml +
    '</article>';
  const formattedPreviewContentHtml = formatHtml(previewContentHtml).trim();
  const formattedRuntimeContentHtml = formatHtml(runtimeContentHtml).trim();

  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Legacy flattened export</title><link rel="stylesheet" href="css/' +
    (hideVisibleText ? 'flattened_text_baked.css' : 'flattened_live_text.css') +
    '" /></head><body><div id="usi_container"><div id="usi_display" role="alertdialog" aria-label="' +
    escapeHtml(headlineText || 'Preview') +
    '" aria-modal="true" class="usi_display usi_show_css usi_shadow" style="width:' +
    scaledRootWidth +
    'px;height:' +
    scaledRootHeight +
    'px;"><div id="usi_content">' +
    previewContentHtml +
    '</div><div id="usi_background"><img src="' +
    escapeHtml(imageFileName) +
    '" aria-hidden="true" alt="' +
    escapeHtml(headlineText || 'Preview') +
    '" id="usi_background_img" style="width:100%;height:100%;" /></div></div></div></body></html>';

  const productCardCss = productCardNodes.map(function (card, index) {
    const imageNode = findNormalizedNodeById(card, findImageNodeId(card));
    const imageRule = imageNode
      ? '.usi_product' + (index + 1) + ' .usi_product_image {\n  width: 100%;\n  height: ' + toPercent(imageNode.bounds.height, card.bounds.height) + ';\n  margin-left: 0;\n  margin-top: ' + toPercent(imageNode.bounds.y - card.bounds.y, card.bounds.height) + ';\n}\n'
      : '';
    return '.usi_product' + (index + 1) + ' {\n  width: 100%;\n  max-width: 100%;\n  min-width: 0;\n}\n' + imageRule;
  }).join('');

  const componentCss = [
    hasEmailInput || hasPhoneInput
      ? '.usi_field {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n}\n.usi_field_input {\n  width: 100%;\n  padding: 0.875em 1em;\n  border: 1px solid #d0d0d0;\n  background: #fff;\n  color: #111;\n}\n'
      : '',
    hasSurvey
      ? '.usi_survey {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75em;\n}\n.usi_survey_options {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n}\n.usi_survey_option {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n'
      : '',
    hasCoupon
      ? '.usi_coupon {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.75em;\n  align-items: center;\n}\n.usi_coupon_code {\n  padding: 0.75em 1em;\n  border: 1px solid #222;\n  background: #fff;\n  font-weight: 700;\n}\n.usi_coupon_button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n'
      : '',
    hasOptin
      ? '.usi_optin {\n  display: flex;\n  gap: 0.625em;\n  align-items: center;\n}\n.usi_optin_input {\n  appearance: none;\n  -webkit-appearance: none;\n  width: 1.125em;\n  height: 1.125em;\n  border: 1px solid currentColor;\n  background: #fff;\n  flex: 0 0 auto;\n}\n.usi_optin_label {\n  display: inline-block;\n}\n'
      : '',
    hasCountdown
      ? '.usi_countdown {\n  display: inline-flex;\n  padding: 0.625em 0.875em;\n  background: #1f1f1f;\n  color: #fff;\n  font-weight: 700;\n}\n'
      : '',
    hasProgress
      ? '.usi_progress {\n  width: 100%;\n  height: 0.75em;\n  background: #ddd;\n  border-radius: 999px;\n  overflow: hidden;\n}\n.usi_progress_fill {\n  width: 55%;\n  height: 100%;\n  background: #222;\n}\n'
      : '',
    hasMediaPanel
      ? '.usi_media_panel {\n  width: 100%;\n  min-height: 8em;\n  background: #d9d9d9;\n}\n'
      : '',
    hasSecondaryCta
      ? '.usi_secondary_cta {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n'
      : '',
  ].join('');
  const textRegionCss = [
    headlineText && headlineNode && mainBounds
      ? '.usi_headline {\n  position: absolute;\n  left: ' + toPercent(headlineNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + toPercent(headlineNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + toPercent(headlineNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(headlineNode, frameScale, { 'white-space': 'pre-wrap' }) + ';\n}\n'
      : '',
    eyebrowText && eyebrowNode && mainBounds
      ? '.usi_eyebrow {\n  position: absolute;\n  left: ' + toPercent(eyebrowNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + toPercent(eyebrowNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + toPercent(eyebrowNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(eyebrowNode, frameScale, { 'white-space': 'pre-wrap' }) + ';\n}\n'
      : '',
    subtextText && subtextNode && mainBounds
      ? '.usi_subtext {\n  position: absolute;\n  left: ' + toPercent(subtextNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + toPercent(subtextNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + toPercent(subtextNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(subtextNode, frameScale, { 'white-space': 'pre-wrap' }) + ';\n}\n'
      : '',
  ].join('');

  const css =
    '* { box-sizing: border-box; }\nhtml { font-size: 16px; }\nbody { margin: 0; background: #efefef; font-family: Inter, Arial, sans-serif; }\n' +
    '.usi_display { left:50%; margin-left:-' + String(scaledRootWidth / 2) + 'px; top:0px; width:' + scaledRootWidth + 'px; height:' + scaledRootHeight + 'px; }\n' +
    '.usi_display * { padding:0; margin:0; color:#000000; font-weight:normal; font-size:12pt; text-decoration:none; line-height:1.2; box-shadow:none; border:none; outline:none; text-align:left; font-family: Helvetica, Arial, sans-serif; float:none; }\n' +
    '.usi_quickide_css { display:none; visibility:hidden; }\n' +
    '#usi_container {\n  width: 100%;\n}\n' +
    '#usi_display {\n  position: relative;\n  display: block;\n  left: 50%;\n  margin-left: -' + String(scaledRootWidth / 2) + 'px;\n  top: 0px;\n  width: ' + scaledRootWidth + 'px;\n  height: ' + scaledRootHeight + 'px;\n  font-size: 16px;\n}\n' +
    '.usi_shadow {\n  box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.33);\n}\n' +
    '#usi_content {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  z-index: 2000000200;\n}\n' +
    '#usi_background {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  z-index: 2000000100;\n}\n' +
    '#usi_background_img {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n' +
    '#usi_close { position:absolute;left:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.x - root.bounds.x, root.bounds.width) : '95%') + ';top:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.y - root.bounds.y, root.bounds.height) : '2%') + ';width:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.width, root.bounds.width) : '3%') + ';height:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.height, root.bounds.height) : '3%') + ';z-index:2000000300;cursor:pointer;padding:0;margin:0;display:block;overflow:hidden;text-indent:-9999px;' + (flattenedBoxDeclarations(closeVisualNode || closeNode, frameScale, { background: 'none', border: 'none' }) || 'background:none;border:none;') + '; }\n' +
    '#usi_close::before { content:"×"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-indent:0; ' + (flattenedTextDeclarations(closeVisualNode || closeNode, frameScale, { background: 'transparent', border: 'none', 'text-align': 'center', 'line-height': '1' }) || 'background:transparent;border:none;text-align:center;line-height:1;') + '; }\n' +
    'button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus { cursor:pointer; }\n' +
    '.usi_flattened_semantic { position: relative; width: 100%; height: 100%; }\n' +
    '.usi_main {\n  position: absolute;\n  left: ' + (hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.x - root.bounds.x, root.bounds.width) : '0%') : '0%') + ';\n  top: ' + (hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.y - root.bounds.y, root.bounds.height) : '0%') : '0%') + ';\n  width: ' + (hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.width, root.bounds.width) : '100%') : '100%') + ';\n  height: ' + (!hasProducts && !hasSummary ? '100%' : (mainBounds ? toPercent(mainBounds.height, root.bounds.height) : '100%')) + ';\n}\n' +
    textRegionCss +
    (hasProducts
      ? '.usi_products {\n  position: absolute;\n  left: ' + (productBounds ? toPercent(productBounds.x - root.bounds.x, root.bounds.width) : '0%') + ';\n  top: ' + (productBounds ? toPercent(productBounds.y - root.bounds.y, root.bounds.height) : '0%') + ';\n  width: ' + (productBounds ? toPercent(productBounds.width, root.bounds.width) : '100%') + ';\n  min-height: ' + (productBounds ? toPercent(productBounds.height, root.bounds.height) : '0%') + ';\n  display: grid;\n  grid-template-columns: repeat(' + ((productBounds && productBounds.width < productBounds.height * 0.9) ? 1 : gridColumns) + ', minmax(0, 1fr));\n  gap: ' + (productBounds && productGap ? toPercent(productGap, productBounds.width) : '2%') + ';\n  align-items: start;\n}\n' +
        '.usi_product {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0.75em;\n  padding: 0.9em;\n  min-width: 0;\n  ' + (flattenedBoxDeclarations(firstProductCard, frameScale, { width: '100%', 'max-width': '100%', 'min-width': '0' }) || 'width: 100%; max-width: 100%;') + ';\n}\n' +
        '.usi_product_image {\n  position: relative;\n  display: block;\n  width: 100%;\n  overflow: hidden;\n  ' + (flattenedBoxDeclarations(productImageNode, frameScale, { width: '100%' }) || 'width: 100%;') + ';\n}\n.usi_product_image img {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n}\n' +
        '.usi_product_body {\n  display: flex;\n  flex-direction: column;\n  gap: 0.35em;\n  min-width: 0;\n}\n.usi_product_title {\n  margin: 0;\n  white-space: pre-wrap;\n  ' + (flattenedTextDeclarations(productTitleNode, frameScale, { 'white-space': 'pre-wrap', 'background-color': 'transparent', border: 'none' }) || 'font-weight: 700;') + ';\n}\n.usi_product_price {\n  margin: 0;\n  ' + (flattenedTextDeclarations(productPriceNode, frameScale) || '') + ';\n}\n.usi_product_cta {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  ' + (flattenedBoxDeclarations(productButtonNode, frameScale, { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', color: '#ffffff' }) || 'border: 1px solid currentColor; background: transparent; color:#ffffff;') + ';\n}\n' +
        productCardCss
      : '') +
    (hasSummary
      ? '.usi_summary {\n  position: absolute;\n  left: ' + (summaryNode ? toPercent(summaryNode.bounds.x - root.bounds.x, root.bounds.width) : '12%') + ';\n  top: ' + (summaryNode ? toPercent(summaryNode.bounds.y - root.bounds.y, root.bounds.height) : '59%') + ';\n  width: ' + (summaryNode ? toPercent(summaryNode.bounds.width, root.bounds.width) : '76%') + ';\n  padding: 1em;\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n  ' + (flattenedBoxDeclarations(summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n' +
        '.usi_summary_title {\n  margin: 0 0 0.5em;\n  white-space: pre-wrap;\n  ' + (flattenedTextDeclarations(summaryNode, frameScale, { 'font-size': '1em', 'font-weight': 700, 'white-space': 'pre-wrap' }) || 'font-weight: 700; font-size: 1em;') + ';\n}\n.usi_summary_row {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 1em;\n  align-items: start;\n  font-size: 1em;\n}\n.usi_price {\n  ' + (flattenedTextDeclarations(summarySubtotalNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n.usi_discount {\n  ' + (flattenedTextDeclarations(summaryDiscountNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n.usi_new_price {\n  ' + (flattenedTextDeclarations(summaryTotalNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n.usi_label, .usi_value {\n  font-size: 1em;\n}\n.usi_new_price .usi_value, .usi_discount .usi_value, .usi_new_price strong, .usi_discount strong {\n  font-weight: 700;\n}\n'
      : '') +
    componentCss +
    '.usi_submitbutton {\n  position: absolute;\n  left: ' + (ctaNode ? toPercent(ctaNode.bounds.x - root.bounds.x, root.bounds.width) : '12%') + ';\n  top: ' + (ctaNode ? toPercent(ctaNode.bounds.y - root.bounds.y, root.bounds.height) : '77%') + ';\n  width: ' + (ctaNode ? toPercent(ctaNode.bounds.width, root.bounds.width) : '76%') + ';\n  min-height: ' + (ctaNode ? toPercent(ctaNode.bounds.height, root.bounds.height) : '15.5%') + ';\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n' +
    (flattenedBoxDeclarations(ctaNode, frameScale, {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'background-color': ctaNode && ctaNode.style.background ? ctaNode.style.background : '#1f1f1f',
      color: ctaNode && ctaNode.style.color ? ctaNode.style.color : '#ffffff',
      'text-align': ctaNode && ctaNode.style.textAlign ? ctaNode.style.textAlign : 'center',
    })) +
    '}\n' +
    '.usi_sr_only {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  padding: 0 !important;\n  margin: -1px !important;\n  overflow: hidden !important;\n  clip: rect(0, 0, 0, 0) !important;\n  white-space: nowrap !important;\n  border: 0 !important;\n}\n';

  const js =
    buildPriceRuntimeSetup(hasSummary) +
    'usi_js.click_cta = () => {\n  try {\n    usi_js.deep_link();\n  } catch (err) {\n    usi_commons.report_error(err);\n  }\n};\n\nusi_js.display_vars.p1_html = `\n' +
    escapeTemplateString(formattedRuntimeContentHtml) +
    '\n`;\n';

  return {
    html: formatHtml(html),
    css: formatCss(css),
    imageFileName: imageFileName,
    js: js,
    contentHtml: formattedPreviewContentHtml,
    runtimeContentHtml: formattedRuntimeContentHtml,
  };
}

export function buildUsiJsFile(
  pages: Array<{ key: string; variant: FlattenedVariant; analysis: AnalysisResult }>
): string {
  const needsPriceRuntime = pages.some(function (page) {
    return !!page.analysis.schema.summary;
  });
  const assignments = pages
    .map(function (page) {
      return (
        'usi_js.display_vars.' +
        page.key +
        '_html = `\n' +
        escapeTemplateString(page.variant.runtimeContentHtml || page.variant.contentHtml) +
        '\n`;\n'
      );
    })
    .join('\n');

  return (
    buildPriceRuntimeSetup(needsPriceRuntime) +
    'usi_js.click_cta = () => {\n' +
    '  try {\n' +
    '    usi_js.deep_link();\n' +
    '  } catch (err) {\n' +
    '    usi_commons.report_error(err);\n' +
    '  }\n' +
    '};\n\n' +
    assignments
  );
}
