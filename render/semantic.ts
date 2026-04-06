import {
  CommonComponentDefinition,
  ComponentTemplateId,
  NormalizedNode,
  Product,
  PromoExport,
  Summary,
} from '../types';
import { escapeHtml } from '../utils/string';
import { COMPONENT_BY_ID, COMPONENT_BY_ROLE } from '../constants';
import { cssDeclarations, getProductionScaleForFrame, lineHeightCss, scalePx, textTransformFromCase } from '../utils/css';
import { collectText, findNodesByRole, flattenTree, pickBestNode } from '../analysis/index';

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
  excludedIds: string[]
): string {
  const rendered: string[] = [];

  (function walk(node: NormalizedNode) {
    if (node.ignored || excludedIds.indexOf(node.id) !== -1) return;
    const definition = componentDefinitionForNode(node);
    if (definition && definition.render.region === region) {
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

function combineBounds(nodes: Array<NormalizedNode | undefined>): { x: number; y: number; width: number; height: number } | undefined {
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

function regionRule(selector: string, root: NormalizedNode, bounds?: { x: number; y: number; width: number; height: number }): string {
  if (!bounds) return '';
  return selector + ' { ' + cssDeclarations({
    width: String((bounds.width / root.bounds.width) * 100) + '%',
    'min-height': String((bounds.height / root.bounds.height) * 100) + '%',
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
        left: String(((closeNode.bounds.x - ast.bounds.x) / ast.bounds.width) * 100) + '%',
        top: String(((closeNode.bounds.y - ast.bounds.y) / ast.bounds.height) * 100) + '%',
        width: String((closeNode.bounds.width / ast.bounds.width) * 100) + '%',
        height: String((closeNode.bounds.height / ast.bounds.height) * 100) + '%',
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
    schema.primaryCta ? '.usi_primary_cta {\n\twidth: fit-content;\n\tmargin-top: 8px;\n}\n' : '',
    hasProducts
      ? '.usi_products {\n\tdisplay: grid;\n\tgap: ' + productGap + 'px;\n\talign-items: start;\n}\n.usi_products_grid {\n\tgrid-template-columns: repeat(' + gridColumns + ', minmax(0, 1fr));\n}\n.usi_products_single {\n\tgrid-template-columns: minmax(0, 1fr);\n}\n.usi_products_carousel {\n\tgrid-auto-flow: column;\n\tgrid-auto-columns: minmax(220px, 1fr);\n\toverflow-x: auto;\n\tpadding-bottom: 4px;\n}\n.usi_product_card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 10px;\n\tpadding: 14px;\n\tbackground: #f3f3f3;\n\tborder-radius: 16px;\n\tmin-width: 0;\n}\n.usi_product_image {\n\tdisplay: block;\n\twidth: 100%;\n\taspect-ratio: 1 / 1;\n\tobject-fit: cover;\n\tborder-radius: 12px;\n\tbackground: #dcdcdc;\n}\n.usi_product_image_placeholder {\n\tborder: 1px dashed #dddddd;\n}\n.usi_product_body {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 6px;\n}\n.usi_product_title {\n\tmargin: 0;\n\tfont-size: 1rem;\n}\n.usi_product_meta, .usi_product_price {\n\tmargin: 0;\n}\n.usi_product_price {\n\tfont-weight: 700;\n}\n'
      : '',
    hasSummary
      ? '.usi_summary {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 12px;\n\tpadding: 16px;\n\tborder: 1px solid #dddddd;\n\tborder-radius: 16px;\n\tbackground: rgba(255,255,255,0.8);\n}\n.usi_summary_title {\n\tmargin: 0;\n\tfont-size: 1rem;\n}\n.usi_summary_row {\n\tdisplay: grid;\n\tgrid-template-columns: 1fr auto;\n\tgap: 16px;\n\talign-items: start;\n}\n.usi_summary_row strong {\n\tfont-weight: 700;\n}\n'
      : '',
    hasEmailInput || hasPhoneInput ? '.usi_field {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:8px;\n}\n.usi_field_input {\n\twidth:100%;\n\tpadding:14px 16px;\n\tborder:1px solid #d0d0d0;\n\tbackground:#fff;\n\tcolor:#111;\n}\n' : '',
    hasSurvey ? '.usi_survey {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:12px;\n}\n.usi_survey_options {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:8px;\n}\n' : '',
    hasCoupon ? '.usi_coupon {\n\tdisplay:flex;\n\tgap:12px;\n\talign-items:center;\n\tflex-wrap:wrap;\n}\n.usi_coupon_code {\n\tpadding:12px 16px;\n\tborder:1px solid #222;\n\tbackground:#fff;\n\tfont-weight:700;\n}\n' : '',
    hasOptin ? '.usi_optin {\n\tdisplay:flex;\n\tgap:10px;\n\talign-items:center;\n}\n' : '',
    hasCountdown ? '.usi_countdown {\n\tdisplay:inline-flex;\n\tpadding:10px 14px;\n\tbackground:#1f1f1f;\n\tcolor:#fff;\n\tfont-weight:700;\n}\n' : '',
    hasProgress ? '.usi_progress {\n\twidth:100%;\n\theight:12px;\n\tbackground:#ddd;\n\tborder-radius:999px;\n\toverflow:hidden;\n}\n.usi_progress_fill {\n\twidth:55%;\n\theight:100%;\n\tbackground:#222;\n}\n' : '',
    schema.disclaimer ? '.usi_disclaimer {\n\ttext-align: center;\n}\n' : '',
    findNodesByRole(ast, 'divider', 0).length ? '.usi_divider {\n\tdisplay:block;\n\twidth:100%;\n\theight:4px;\n\tborder:0;\n\tbackground:#1f1f1f;\n\tborder-radius:999px;\n}\n' : '',
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
