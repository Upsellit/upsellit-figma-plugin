import {
  AnalysisResult,
  CommonComponentDefinition,
  ExportRole,
  FlattenedVariant,
  NodeBounds,
  NormalizedNode,
} from '../types';
import { escapeHtml, escapeTemplateString, formatHtml } from '../utils/string';
import { COMPONENT_BY_ID, COMPONENT_BY_ROLE } from '../constants';
import {
  cssDeclarations,
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

function hasInsertedComponent(root: NormalizedNode, componentId: string): boolean {
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

function renderExplicitComponentNode(node: NormalizedNode, hideVisibleText: boolean): string {
  const definition = componentDefinitionForNode(node);
  if (!definition) return '';
  const tag = definition.render.htmlTag;
  const className = definition.render.className;
  const text = componentText(node, definition);
  const kind = definition.render.kind;

  if (kind === 'container') {
    return '<' + tag + ' class="' + className + '"></' + tag + '>';
  }

  if (kind === 'input') {
    const placeholder = hideVisibleText ? '' : escapeHtml(text);
    return '<label class="' + className + '"><span class="usi_field_label">' + escapeHtml(node.name || definition.label) + '</span><input class="usi_field_input" type="' + escapeHtml(definition.render.inputType || 'text') + '" placeholder="' + placeholder + '" /></label>';
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
  if (kind === 'countdown') return '<div class="' + className + '">' + escapeHtml(text || '09:59') + '</div>';
  if (kind === 'progress') return '<div class="' + className + '"><div class="usi_progress_fill"></div></div>';
  if (kind === 'media') {
    if (tag === 'hr') return '<hr class="' + className + '" />';
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
    if (definition && definition.id === 'content_stack') return;
    const shouldRenderNode =
      !!definition &&
      definition.render.region === region;

    if (shouldRenderNode) {
      rendered.push(renderExplicitComponentNode(node, hideVisibleText || false));
      return;
    }
    for (let index = 0; index < node.children.length; index += 1) {
      walk(node.children[index]);
    }
  })(root);

  return rendered.join('');
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

function nodeContains(parent: NormalizedNode, child: NormalizedNode): boolean {
  for (let index = 0; index < parent.children.length; index += 1) {
    const current = parent.children[index];
    if (current === child) return true;
    if (nodeContains(current, child)) return true;
  }
  return false;
}

function topLevelNodes(nodes: NormalizedNode[], root: NormalizedNode): NormalizedNode[] {
  return nodes.filter(function (node) {
    return !nodes.some(function (other) {
      return other !== node && nodeContains(other, node);
    });
  });
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
  const frameScale = 1;
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
  const showEyebrowInVariant = hideVisibleText ? false : !!eyebrowText;
  const showHeadlineInVariant = hideVisibleText ? false : !!headlineText;
  const showSubtextInVariant = hideVisibleText ? false : !!subtextText;
  const eyebrowClass = showEyebrowInVariant ? 'usi_eyebrow' : 'usi_eyebrow usi_sr_only';
  const headlineClass = showHeadlineInVariant ? 'usi_headline' : 'usi_headline usi_sr_only';
  const subtextClass = showSubtextInVariant ? 'usi_subtext' : 'usi_subtext usi_sr_only';
  const showCtaInVariant = !!(ctaNode || analysis.schema.primaryCta);
  const ctaInnerHtml = showCtaInVariant ? escapeHtml(ctaLabel) : '';
  const summaryTitle = resolveSummaryTitle(summaryNode);
  const hasProducts = !!analysis.schema.products.length && !!productCardNodes.length && !!productBounds;
  const hasSummary = !!analysis.schema.summary && !!summaryNode;
  const hasEmailInput = hasInsertedComponent(root, 'email_input');
  const hasPhoneInput = hasInsertedComponent(root, 'phone_input');
  const hasSurvey = hasInsertedComponent(root, 'survey_block');
  const hasCoupon = hasInsertedComponent(root, 'copy_coupon');
  const hasOptin = hasInsertedComponent(root, 'optin_component');
  const hasCountdown = hasInsertedComponent(root, 'countdown_timer');
  const hasProgress = hasInsertedComponent(root, 'progress_bar');
  const hasMediaPanel = hasInsertedComponent(root, 'media_panel');
  const hasSecondaryCta = hasInsertedComponent(root, 'no_thanks_button');
  const hasDisclaimer = hasInsertedComponent(root, 'disclaimer_text');
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
          '<div class="usi_product_image"><img src="' + PRODUCT_PLACEHOLDER_IMAGE + '" alt="' + fallbackTitle + '" /></div>' +
          '<div class="usi_product_body"><h3 class="usi_product_title">' + fallbackTitle + '</h3><p class="usi_product_price">' + fallbackPrice + '</p><button class="usi_product_cta" type="button">' + fallbackButton + '</button></div>' +
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
          '<div class="usi_product_image"><img src="${usi_cookies.get(\'usi_prod_image_' + (index + 1) + '\') || \'' + PRODUCT_PLACEHOLDER_IMAGE + '\'}" alt="${usi_js.escape_quotes(usi_cookies.get(\'usi_prod_name_' + (index + 1) + '\') || \'' + fallbackTitle.replace(/'/g, '&#39;') + '\')}" /></div>' +
          '<div class="usi_product_body"><h3 class="usi_product_title">${usi_js.escape_quotes(usi_cookies.get(\'usi_prod_name_' + (index + 1) + '\') || \'' + fallbackTitle.replace(/'/g, '&#39;') + '\')}</h3><p class="usi_product_price">' + fallbackPrice + '</p><button class="usi_product_cta" type="button">' + fallbackButton + '</button></div>' +
          '</article>'
        );
      }).join('')
    : '';
  const previewSummaryHtml = hasSummary
    ? '<section class="usi_summary" aria-label="Cart summary">' + (summaryTitle ? '<h2 class="usi_summary_title">' + escapeHtml(summaryTitle) + '</h2>' : '') + '<div class="usi_summary_row usi_price"><span class="usi_label">Subtotal:</span><strong class="usi_value">$XX.XX</strong></div><div class="usi_summary_row usi_discount"><span class="usi_label">Discount:</span><strong class="usi_value">- $XX.XX</strong></div><div class="usi_summary_row usi_new_price"><span class="usi_label">Total:</span><strong class="usi_value">$XX.XX</strong></div></section>'
    : '';
  const runtimeSummaryHtml = hasSummary
    ? '<section class="usi_summary" aria-label="Cart summary">' + (summaryTitle ? '<h2 class="usi_summary_title">' + escapeHtml(summaryTitle) + '</h2>' : '') + '<div class="usi_summary_row usi_price"><span class="usi_label">Subtotal:</span><strong class="usi_value">$${usi_js.product.subtotal}</strong></div><div class="usi_summary_row usi_discount"><span class="usi_label">Discount:</span><strong class="usi_value">- $${usi_js.product.discount}</strong></div><div class="usi_summary_row usi_new_price"><span class="usi_label">Total:</span><strong class="usi_value">$${usi_js.product.new_price}</strong></div></section>'
    : '';
  const flattenedExcludedIds = [analysis.eyebrowNodeId, analysis.headlineNodeId, analysis.subtextNodeId, analysis.primaryCtaNodeId, analysis.summaryNodeId].concat(analysis.productCardNodeIds).filter(Boolean) as string[];
  const flattenedExtraMainHtml = renderExtraRegionNodes(root, 'main', flattenedExcludedIds, hideVisibleText);
  const flattenedExtraAsideHtml = renderExtraRegionNodes(root, 'aside', flattenedExcludedIds, hideVisibleText);
  const flattenedExtraUtilityHtml = renderExtraRegionNodes(root, 'utility', flattenedExcludedIds, hideVisibleText);
  // Explicitly render missing components to ensure they appear in flattened HTML
  const progressBarNodes = findNodesByRole(root, 'progress', 0.35);
  const surveyNodes = topLevelNodes(findNodesByRole(root, 'survey', 0.35), root);
  const emailInputNodes = findNodesByRole(root, 'email-input', 0.35);
  const phoneInputNodes = findNodesByRole(root, 'phone-input', 0.35);
  const copyCouponNodes = findNodesByRole(root, 'copy-coupon', 0.35);
  const noThanksNodes = findNodesByRole(root, 'secondary-cta', 0.35);
  const mediaPanelNodes = findNodesByRole(root, 'image', 0.35);
  const disclaimerNodes = findNodesByRole(root, 'disclaimer', 0.35);
  const allExtraComponentNodes = [
    ...progressBarNodes,
    ...surveyNodes,
    ...emailInputNodes,
    ...phoneInputNodes,
    ...copyCouponNodes,
    ...noThanksNodes,
    ...mediaPanelNodes,
    ...disclaimerNodes,
  ];
  const extraComponentsHtml = allExtraComponentNodes.map(node => renderExplicitComponentNode(node, hideVisibleText)).join('');
  // Generate positioning CSS for extra components
  const extraComponentsCss = allExtraComponentNodes.map(function (node) {
    const definition = componentDefinitionForNode(node);
    if (!definition) return '';
    const className = definition.render.className;
    return '.' + className + ' {\n  position: absolute;\n  left: ' + toPercent(node.bounds.x - root.bounds.x, root.bounds.width) + ';\n  top: ' + toPercent(node.bounds.y - root.bounds.y, root.bounds.height) + ';\n  width: ' + toPercent(node.bounds.width, root.bounds.width) + ';\n  ' + flattenedBoxDeclarations(node, frameScale) + '\n}\n';
  }).join('');
  const previewContentHtml = (closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : '') + '<section class="usi_main">' + (eyebrowText ? '<p class="' + eyebrowClass + '">' + escapeHtml(eyebrowText) + '</p>' : '') + (headlineText ? '<h1 class="' + headlineClass + '">' + escapeHtml(headlineText) + '</h1>' : '') + (subtextText ? '<p class="' + subtextClass + '">' + escapeHtml(subtextText) + '</p>' : '') + (showCtaInVariant ? '<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="' + escapeHtml(ctaLabel) + '">' + ctaInnerHtml + '</button>' : '') + flattenedExtraMainHtml + flattenedExtraUtilityHtml + extraComponentsHtml + '</section>' + ((hasProducts || flattenedExtraAsideHtml) ? '<section class="usi_aside">' + (hasProducts ? '<section class="usi_products usi_products_grid">' + previewProductHtml + '</section>' : '') + flattenedExtraAsideHtml + '</section>' : '') + previewSummaryHtml;
  const runtimeContentHtml = (closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : '') + '<section class="usi_main">' + (eyebrowText ? '<p class="' + eyebrowClass + '">' + escapeHtml(eyebrowText) + '</p>' : '') + (headlineText ? '<h1 class="' + headlineClass + '">' + escapeHtml(headlineText) + '</h1>' : '') + (subtextText ? '<p class="' + subtextClass + '">' + escapeHtml(subtextText) + '</p>' : '') + (showCtaInVariant ? '<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="' + escapeHtml(ctaLabel) + '">' + ctaInnerHtml + '</button>' : '') + flattenedExtraMainHtml + flattenedExtraUtilityHtml + extraComponentsHtml + '</section>' + ((hasProducts || flattenedExtraAsideHtml) ? '<section class="usi_aside">' + (hasProducts ? '<section class="usi_products usi_products_grid">' + runtimeProductHtml + '</section>' : '') + flattenedExtraAsideHtml + '</section>' : '') + runtimeSummaryHtml;
  //const formattedPreviewContentHtml = previewContentHtml;
  const formattedRuntimeContentHtml = runtimeContentHtml;
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Legacy flattened export</title><link rel="stylesheet" href="css/' + (hideVisibleText ? 'flattened_text_baked.css' : 'flattened_live_text.css') + '" /></head><body><div id="usi_container"><div id="usi_display" role="alertdialog" aria-label="' + escapeHtml(headlineText || 'Preview') + '" aria-modal="true" class="usi_display usi_show_css usi_shadow" style="width:' + scaledRootWidth + 'px;height:' + scaledRootHeight + 'px;"><div id="usi_content">' + previewContentHtml + '</div><div id="usi_background"><img src="' + escapeHtml(imageFileName) + '" aria-hidden="true" alt="' + escapeHtml(headlineText || 'Preview') + '" id="usi_background_img" style="width:100%;height:100%;" /></div></div></div></body></html>';
  const productCardCss = productCardNodes.map(function (card, index) {
    const imageNode = findNormalizedNodeById(card, findImageNodeId(card));
    const imageRule = imageNode ? '.usi_product' + (index + 1) + ' .usi_product_image {\n  width: 100%;\n  height: ' + toPercent(imageNode.bounds.height, card.bounds.height) + ';\n  margin-left: 0;\n  margin-top: ' + toPercent(imageNode.bounds.y - card.bounds.y, card.bounds.height) + ';\n}\n' : '';
    return '.usi_product' + (index + 1) + ' {\n  width: 100%;\n  max-width: 100%;\n  min-width: 0;\n}\n' + imageRule;
  }).join('');
  const componentCss = [
    (hasEmailInput || hasPhoneInput) ? '.usi_field {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n}\n.usi_field_input {\n  width: 100%;\n  padding: 0.875em 1em;\n  border: 1px solid #d0d0d0;\n  background: #fff;\n  color: #111;\n}\n' : '',
    hasSurvey ? '.usi_survey {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75em;\n}\n.usi_survey_options {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n}\n.usi_survey_option {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n' : '',
    hasCoupon ? '.usi_coupon {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.75em;\n  align-items: center;\n}\n.usi_coupon_code {\n  padding: 0.75em 1em;\n  border: 1px solid #222;\n  background: #fff;\n  font-weight: 700;\n}\n.usi_coupon_button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n' : '',
    hasOptin ? '.usi_optin {\n  display: flex;\n  gap: 0.625em;\n  align-items: center;\n}\n.usi_optin_input {\n  appearance: none;\n  -webkit-appearance: none;\n  width: 1.125em;\n  height: 1.125em;\n  border: 1px solid currentColor;\n  background: #fff;\n  flex: 0 0 auto;\n}\n.usi_optin_label {\n  display: inline-block;\n}\n' : '',
    hasCountdown ? '.usi_countdown {\n  display: inline-flex;\n  padding: 0.625em 0.875em;\n  background: #1f1f1f;\n  color: #fff;\n  font-weight: 700;\n}\n' : '',
    hasProgress ? '.usi_progress {\n  width: 100%;\n  height: 0.75em;\n  background: #ddd;\n  border-radius: 999px;\n  overflow: hidden;\n}\n.usi_progress_fill {\n  width: 55%;\n  height: 100%;\n  background: #222;\n}\n' : '',
    hasMediaPanel ? '.usi_media_panel {\n  width: 100%;\n  min-height: 8em;\n  background: #d9d9d9;\n}\n' : '',
    hasSecondaryCta ? '.usi_secondary_cta {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n' : '',
      hasDisclaimer ? '.usi_disclaimer {\n  margin: 0;\n  font-size: 0.875em;\n  color: #666;\n  line-height: 1.4;\n}\n' : '',
].join('');
  const textRegionCss = [
    headlineText && headlineNode && mainBounds ? '.usi_headline {\n  position: absolute;\n  left: ' + toPercent(headlineNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + toPercent(headlineNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + toPercent(headlineNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(headlineNode, frameScale, { 'white-space': 'pre-wrap' }) + '\n}\n' : '',
    eyebrowText && eyebrowNode && mainBounds ? '.usi_eyebrow {\n  position: absolute;\n  left: ' + toPercent(eyebrowNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + toPercent(eyebrowNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + toPercent(eyebrowNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(eyebrowNode, frameScale, { 'white-space': 'pre-wrap' }) + '\n}\n' : '',
    subtextText && subtextNode && mainBounds ? '.usi_subtext {\n  position: absolute;\n  left: ' + toPercent(subtextNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + toPercent(subtextNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + toPercent(subtextNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(subtextNode, frameScale, { 'white-space': 'pre-wrap' }) + '\n}\n' : '',
  ].join('');
  const css = '* { box-sizing: border-box; }\nhtml { font-size: 16px; }\nbody { margin: 0; background: #efefef; font-family: Inter, Arial, sans-serif; }\n' +
    '.usi_display { left:50%; margin-left:-' + String(scaledRootWidth / 2) + 'px; top:0px; width:' + scaledRootWidth + 'px; height:' + scaledRootHeight + 'px; }\n' +
    '.usi_display * { padding:0; margin:0; color:#000000; font-weight:normal; font-size:12pt; text-decoration:none; line-height:1.2; box-shadow:none; border:none; outline:none; text-align:left; font-family: Helvetica, Arial, sans-serif; float:none; }\n' +
    '.usi_quickide_css { display:none; visibility:hidden; }\n#usi_container {\n  width: 100%;\n}\n#usi_display {\n  position: relative;\n  display: block;\n  left: 50%;\n  margin-left: -' + String(scaledRootWidth / 2) + 'px;\n  top: 0px;\n  width: ' + scaledRootWidth + 'px;\n  height: ' + scaledRootHeight + 'px;\n  font-size: 16px;\n}\n.usi_shadow {\n  box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.33);\n}\n#usi_content {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  z-index: 2000000200;\n}\n#usi_background {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  z-index: 2000000100;\n}\n#usi_background_img {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n' +
    '#usi_close { position:absolute;left:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.x - root.bounds.x, root.bounds.width) : '95%') + ';top:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.y - root.bounds.y, root.bounds.height) : '2%') + ';width:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.width, root.bounds.width) : '3%') + ';height:' + (closeVisualNode ? toPercent(closeVisualNode.bounds.height, root.bounds.height) : '3%') + ';z-index:2000000300;cursor:pointer;padding:0;margin:0;display:block;overflow:hidden;text-indent:-9999px;' + (flattenedBoxDeclarations(closeVisualNode || closeNode, frameScale, { background: 'none', border: 'none' }) || 'background:none;border:none;') + '; }\n' +
    '#usi_close::before { content:"×"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-indent:0; ' + (flattenedTextDeclarations(closeVisualNode || closeNode, frameScale, { background: 'transparent', border: 'none', 'text-align': 'center', 'line-height': '1' }) || 'background:transparent;border:none;text-align:center;line-height:1;') + '; }\n' +
    'button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus { cursor:pointer; }\n' +
    '.usi_main {\n  position: absolute;\n  left: ' + (hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.x - root.bounds.x, root.bounds.width) : '0%') : '0%') + ';\n  top: ' + (hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.y - root.bounds.y, root.bounds.height) : '0%') : '0%') + ';\n  width: ' + (hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.width, root.bounds.width) : '100%') : '100%') + ';\n  height: ' + (!hasProducts && !hasSummary ? '100%' : (mainBounds ? toPercent(mainBounds.height, root.bounds.height) : '100%')) + ';\n}\n' +
    textRegionCss +
    (hasProducts ? '.usi_products {\n  position: absolute;\n  left: ' + (productBounds ? toPercent(productBounds.x - root.bounds.x, root.bounds.width) : '0%') + ';\n  top: ' + (productBounds ? toPercent(productBounds.y - root.bounds.y, root.bounds.height) : '0%') + ';\n  width: ' + (productBounds ? toPercent(productBounds.width, root.bounds.width) : '100%') + ';\n  min-height: ' + (productBounds ? toPercent(productBounds.height, root.bounds.height) : '0%') + ';\n  display: grid;\n  grid-template-columns: repeat(' + ((productBounds && productBounds.width < productBounds.height * 0.9) ? 1 : gridColumns) + ', minmax(0, 1fr));\n  gap: ' + (productBounds && productGap ? toPercent(productGap, productBounds.width) : '2%') + ';\n  align-items: start;\n}\n.usi_product {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0.75em;\n  padding: 0.9em;\n  min-width: 0;\n  ' + (flattenedBoxDeclarations(firstProductCard, frameScale, { width: '100%', 'max-width': '100%', 'min-width': '0' }) || 'width: 100%; max-width: 100%;') + '\n}\n.usi_product_image {\n  position: relative;\n  display: block;\n  width: 100%;\n  overflow: hidden;\n  ' + (flattenedBoxDeclarations(productImageNode, frameScale, { width: '100%' }) || 'width: 100%;') + '\n}\n.usi_product_image img {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n}\n.usi_product_body {\n  display: flex;\n  flex-direction: column;\n  gap: 0.35em;\n  min-width: 0;\n}\n.usi_product_title {\n  margin: 0;\n  white-space: pre-wrap;\n  ' + (flattenedTextDeclarations(productTitleNode, frameScale, { 'white-space': 'pre-wrap', 'background-color': 'transparent', border: 'none' }) || 'font-weight: 700;') + '\n}\n.usi_product_price {\n  margin: 0;\n  ' + (flattenedTextDeclarations(productPriceNode, frameScale) || '') + '\n}\n.usi_product_cta {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  ' + (flattenedBoxDeclarations(productButtonNode, frameScale, { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', color: '#ffffff' }) || 'border: 1px solid currentColor; background: transparent; color:#ffffff;') + '\n}\n' + productCardCss : '') +
    (hasSummary ? '.usi_summary {\n  position: absolute;\n  left: ' + (summaryNode ? toPercent(summaryNode.bounds.x - root.bounds.x, root.bounds.width) : '12%') + ';\n  top: ' + (summaryNode ? toPercent(summaryNode.bounds.y - root.bounds.y, root.bounds.height) : '59%') + ';\n  width: ' + (summaryNode ? toPercent(summaryNode.bounds.width, root.bounds.width) : '76%') + ';\n  padding: 1em;\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n  ' + (flattenedBoxDeclarations(summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + '\n}\n.usi_summary_title {\n  margin: 0 0 0.5em;\n  white-space: pre-wrap;\n  ' + (flattenedTextDeclarations(summaryNode, frameScale, { 'font-size': '1em', 'font-weight': 700, 'white-space': 'pre-wrap' }) || 'font-weight: 700; font-size: 1em;') + '\n}\n.usi_summary_row {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 1em;\n  align-items: start;\n  font-size: 1em;\n}\n.usi_price {\n  ' + (flattenedTextDeclarations(summarySubtotalNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + '\n}\n.usi_discount {\n  ' + (flattenedTextDeclarations(summaryDiscountNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + '\n}\n.usi_new_price {\n  ' + (flattenedTextDeclarations(summaryTotalNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + '\n}\n.usi_label, .usi_value {\n  font-size: 1em;\n}\n.usi_new_price .usi_value, .usi_discount .usi_value, .usi_new_price strong, .usi_discount strong {\n  font-weight: 700;\n}\n' : '') +
    componentCss +
    extraComponentsCss +
    '.usi_submitbutton {\n  position: absolute;\n  left: ' + (ctaNode ? toPercent(ctaNode.bounds.x - root.bounds.x, root.bounds.width) : '12%') + ';\n  top: ' + (ctaNode ? toPercent(ctaNode.bounds.y - root.bounds.y, root.bounds.height) : '77%') + ';\n  width: ' + (ctaNode ? toPercent(ctaNode.bounds.width, root.bounds.width) : '76%') + ';\n  min-height: ' + (ctaNode ? toPercent(ctaNode.bounds.height, root.bounds.height) : '15.5%') + ';\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n' + (flattenedBoxDeclarations(ctaNode, frameScale, { display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'background-color': ctaNode && ctaNode.style.background ? ctaNode.style.background : '#1f1f1f', color: ctaNode && ctaNode.style.color ? ctaNode.style.color : '#ffffff', 'text-align': ctaNode && ctaNode.style.textAlign ? ctaNode.style.textAlign : 'center' })) + '}\n.usi_sr_only {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  padding: 0 !important;\n  margin: -1px !important;\n  overflow: hidden !important;\n  clip: rect(0, 0, 0, 0) !important;\n  white-space: nowrap !important;\n  border: 0 !important;\n}\n';
  const js = buildPriceRuntimeSetup(hasSummary) + 'usi_js.click_cta = () => {\n  try {\n    usi_js.deep_link();\n  } catch (err) {\n    usi_commons.report_error(err);\n  }\n};\n\nusi_js.display_vars.p1_html = `\n' + escapeTemplateString(formatFlattenedHtml(formattedRuntimeContentHtml)) + '\n`;\n';
  return {
    html: html,
    css: css,
    imageFileName: imageFileName,
    js: js,
    contentHtml: previewContentHtml,
    runtimeContentHtml: runtimeContentHtml,
  };
}

function formatFlattenedHtml(html: string): string {
  if (!html) return '';
  return formatHtml(html)
    .split('\n')
    .map(function (line) {
      return line ? '\t' + line : line;
    })
    .join('\n');
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
        'usi_js.display_vars.' +  page.key + '_html = `\n' +
        escapeTemplateString(formatFlattenedHtml(page.variant.runtimeContentHtml || page.variant.contentHtml)) +
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
